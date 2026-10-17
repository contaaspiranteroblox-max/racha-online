// ============================================================================
// RACHA 2.0 — RACHA CONTROL: painel admin seguro
// Login próprio + 2FA TOTP + RBAC + auditoria em toda ação crítica.
// Selos são RECONHECIMENTO; cargos são PODER — coisas separadas.
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, or, like, sql } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  usuarios,
  sessoes,
  cargos,
  totp,
  selos,
  itensUsuario,
  denuncias,
  punicoes,
  auditoria,
  distribuicoes,
  distribuicaoItens,
  recompensasUsuario,
  estatisticas,
} from "@db/schema";
import {
  adminAutenticado,
  exigePermissao,
  exigeAlvoPermitido,
  auditar,
  ipDaRequisicao,
  exigeLimite,
  cargoDo,
  sessaoDaRequisicao,
  type CtxAdmin,
} from "./guard";
import { verificarSenha, novoToken, sha256, gerarSegredoTotp, verificarTotp, urlTotp } from "./security";
import { ajustaPatente, estadoRanqueada, infoPatente } from "./ranqueada"; // v82: a patente na conta
import {
  PERMISSOES_PADRAO,
  CARGO_PESO,
  SUSPENSAO_MAX_HORAS,
  itemPorCodigo,
  formatarIdPublico,
  tituloPorNivel,
  CATALOGO_ITENS,
  type Permissao,
} from "@contracts/racha";

const SESSAO_ADMIN_MS = 8 * 60 * 60 * 1000;

async function acharJogador(termo: string) {
  const db = getDb();
  const limpo = termo.trim();
  const num = /^0*\d{1,9}$/.test(limpo) ? Number(limpo) : null;
  if (num !== null && num > 0) {
    const porId = await db.query.usuarios.findFirst({ where: eq(usuarios.idPublico, num) });
    if (porId) return porId;
  }
  return db.query.usuarios.findFirst({ where: eq(usuarios.username, limpo.toLowerCase()) });
}

async function montarJogadorAdmin(u: typeof usuarios.$inferSelect) {
  const db = getDb();
  const [papel, listaSelos, st, punicoesAtivas, totalItens, historico, rq] = await Promise.all([
    cargoDo(u.id),
    db.query.selos.findMany({ where: eq(selos.usuarioId, u.id) }),
    db.query.estatisticas.findFirst({ where: eq(estatisticas.usuarioId, u.id) }),
    db.query.punicoes.findMany({ where: and(eq(punicoes.usuarioId, u.id), eq(punicoes.ativa, true)) }),
    db.query.itensUsuario.findMany({ where: eq(itensUsuario.usuarioId, u.id) }),
    db.query.auditoria.findMany({ where: eq(auditoria.alvoId, u.id), orderBy: [desc(auditoria.criadoEm)], limit: 20 }),
    estadoRanqueada(u.id), // v82
  ]);
  return {
    idPublico: formatarIdPublico(Number(u.idPublico)),
    nomeExibicao: u.nomeExibicao,
    username: u.username,
    avatarEmoji: u.avatarEmoji,
    nivel: u.nivel,
    xp: u.xp,
    titulo: tituloPorNivel(u.nivel),
    estado: u.estado,
    suspensoAte: u.suspensoAte,
    criadoEm: u.criadoEm,
    ultimoLoginEm: u.ultimoLoginEm,
    cargo: papel?.cargo ?? null,
    selos: listaSelos.map((s) => s.selo),
    stats: st ? { partidas: st.partidas, vitorias: st.vitorias, gols: st.gols, assistencias: st.assistencias } : null,
    patente: { pts: rq.pts, melhor: rq.melhor, jogos: rq.jogos, titulo: infoPatente(rq.pts).titulo }, // v82
    totalItens: totalItens.length,
    punicoesAtivas: punicoesAtivas.map((p) => ({ id: p.id, tipo: p.tipo, motivo: p.motivo, expiraEm: p.expiraEm })),
    historicoAdministrativo: historico.map((h) => ({
      acao: h.acao, operador: h.operadorId, cargo: h.cargoOperador, resultado: h.resultado, quando: h.criadoEm,
    })),
  };
}

// Entrega de item com dedup + registro de recompensa (usada por todas as vias)
async function entregarComRegistro(usuarioId: number, codigoItem: string, origemDetalhe: string) {
  const db = getDb();
  const jaTem = await db.query.itensUsuario.findFirst({
    where: and(eq(itensUsuario.usuarioId, usuarioId), eq(itensUsuario.codigoItem, codigoItem)),
  });
  if (jaTem) return "ja_possuia" as const;
  await db.insert(itensUsuario).values({ usuarioId, codigoItem, origem: "admin", origemDetalhe });
  await db.insert(recompensasUsuario).values({ usuarioId, codigoItem, origem: origemDetalhe });
  return "entregue" as const;
}

export const adminRouter = createRouter({
  // ==========================================================================
  // LOGIN DO PAINEL — separado do jogo, com 2FA obrigatório
  // ==========================================================================
  loginPainel: publicQuery
    .input(z.object({ username: z.string().trim().min(1).max(24), senha: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const ip = ipDaRequisicao(ctx.req);
      await exigeLimite(`painel:${ip}`, 10, 15 * 60 * 1000, "Muitas tentativas no painel. Aguarde.");

      const u = await db.query.usuarios.findFirst({ where: eq(usuarios.username, input.username.toLowerCase()) });
      if (!u || !verificarSenha(input.senha, u.senhaHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas." });
      }
      const papel = await cargoDo(u.id);
      if (!papel) {
        await auditar({ operadorId: u.id, cargo: "nenhum", acao: "login_painel", resultado: "negado", ip });
        throw new TRPCError({ code: "FORBIDDEN", message: "Essa conta não faz parte da equipe do RACHA." });
      }

      // Cria sessão de PAINEL (curta) — ainda sem 2FA
      const token = novoToken();
      await db.insert(sessoes).values({
        usuarioId: u.id,
        tokenHash: sha256(token),
        painelAdmin: true,
        totpVerificado: false,
        ip,
        agente: (ctx.req.headers.get("user-agent") || "").slice(0, 200),
        expiraEm: new Date(Date.now() + SESSAO_ADMIN_MS),
      });

      // 2FA: se ainda não configurado, gera o segredo agora (mostrado uma vez)
      let t = await db.query.totp.findFirst({ where: eq(totp.usuarioId, u.id) });
      if (!t) {
        const segredo = gerarSegredoTotp();
        await db.insert(totp).values({ usuarioId: u.id, segredo, ativo: false });
        t = await db.query.totp.findFirst({ where: eq(totp.usuarioId, u.id) });
      }
      await auditar({ operadorId: u.id, cargo: papel.cargo, acao: "login_painel", resultado: "ok", ip });
      return {
        token,
        cargo: papel.cargo,
        precisa2fa: true as const,
        configurar2fa: !t!.ativo,
        url2fa: !t!.ativo ? urlTotp(t!.segredo, u.username) : null,
      };
    }),

  // Confirma o código do app autenticador e libera a sessão do painel
  verificar2fa: publicQuery
    .input(z.object({ token: z.string().min(20).max(100), codigo: z.string().trim().min(6).max(8) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const ip = ipDaRequisicao(ctx.req);
      const s = await db.query.sessoes.findFirst({
        where: and(
          eq(sessoes.tokenHash, sha256(input.token)),
          eq(sessoes.painelAdmin, true),
          or(sql`${sessoes.revogadaEm} IS NULL`),
        ),
      });
      if (!s || s.revogadaEm || s.expiraEm.getTime() < Date.now()) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Sessão do painel inválida ou expirada." });
      }
      await exigeLimite(`totp:${s.usuarioId}`, 8, 10 * 60 * 1000, "Muitos códigos errados. Faça login de novo.");
      const t = await db.query.totp.findFirst({ where: eq(totp.usuarioId, s.usuarioId) });
      if (!t || !verificarTotp(t.segredo, input.codigo)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Código 2FA incorreto." });
      }
      await db.update(totp).set({ ativo: true }).where(eq(totp.usuarioId, s.usuarioId));
      await db.update(sessoes).set({ totpVerificado: true }).where(eq(sessoes.id, s.id));
      const papel = await cargoDo(s.usuarioId);
      await auditar({ operadorId: s.usuarioId, cargo: papel?.cargo ?? "?", acao: "2fa_ok", resultado: "ok", ip });
      ctx.resHeaders.append(
        "set-cookie",
        `racha_admin=${encodeURIComponent(input.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSAO_ADMIN_MS / 1000}`,
      );
      return { ok: true, cargo: papel?.cargo };
    }),

  // Estado do painel (quem sou eu, o que posso)
  estadoPainel: publicQuery.query(async ({ ctx }) => {
    const s = await sessaoDaRequisicao(ctx.req);
    if (!s || !s.sessao.painelAdmin) return { logado: false as const };
    const papel = await cargoDo(s.usuario.id);
    if (!papel) return { logado: false as const };
    return {
      logado: true as const,
      totpVerificado: s.sessao.totpVerificado,
      usuario: { nome: s.usuario.nomeExibicao, username: s.usuario.username, avatarEmoji: s.usuario.avatarEmoji },
      cargo: papel.cargo,
      permissoes: papel.permissoes,
    };
  }),

  sairPainel: publicQuery.mutation(async ({ ctx }) => {
    const s = await sessaoDaRequisicao(ctx.req);
    if (s) {
      await getDb().update(sessoes).set({ revogadaEm: new Date() }).where(eq(sessoes.id, s.sessao.id));
    }
    ctx.resHeaders.append("set-cookie", "racha_admin=; Path=/; HttpOnly; Max-Age=0");
    return { ok: true };
  }),

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================
  dashboard: adminAutenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAdmin;
    exigePermissao(c, "consultar_jogadores");
    const db = getDb();
    const [jogadores] = await db.execute(sql`SELECT COUNT(*) AS n FROM usuarios`);
    const [denAbertas] = await db.execute(sql`SELECT COUNT(*) AS n FROM denuncias WHERE estado = 'aberta'`);
    const [selosTotais] = await db.execute(sql`SELECT COUNT(*) AS n FROM selos`);
    const [hoje] = await db.execute(sql`SELECT COUNT(*) AS n FROM usuarios WHERE criado_em >= UTC_DATE()`);
    const n = (r: unknown) => Number((r as unknown as { n: number }[])[0]?.n ?? 0);
    return {
      jogadores: n(jogadores),
      denunciasAbertas: n(denAbertas),
      selosConcedidos: n(selosTotais),
      novosHoje: n(hoje),
    };
  }),

  // ==========================================================================
  // 11. GERENCIAR JOGADOR — busca por ID público ou nome
  // ==========================================================================
  buscarJogador: adminAutenticado
    .input(z.object({ termo: z.string().trim().min(1).max(40) }))
    .query(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "consultar_jogadores");
      const db = getDb();
      const termo = input.termo.trim();
      const num = /^0*\d{1,9}$/.test(termo) ? Number(termo) : null;

      const achados: (typeof usuarios.$inferSelect)[] = [];
      if (num !== null && num > 0) {
        const porId = await db.query.usuarios.findFirst({ where: eq(usuarios.idPublico, num) });
        if (porId) achados.push(porId);
      }
      if (achados.length === 0) {
        const lista = await db.query.usuarios.findMany({
          where: or(like(usuarios.username, `${termo.toLowerCase()}%`), like(usuarios.nomeExibicao, `${termo}%`)),
          limit: 10,
        });
        achados.push(...lista);
      }
      // Busca administrativa NÃO expõe email, senha, sessões nem dados de auth
      return Promise.all(achados.map((u) => montarJogadorAdmin(u)));
    }),

  inventarioDoJogador: adminAutenticado
    .input(z.object({ termo: z.string().trim().min(1).max(40) }))
    .query(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "consultar_jogadores");
      const alvo = await acharJogador(input.termo);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      const itens = await getDb().query.itensUsuario.findMany({
        where: eq(itensUsuario.usuarioId, alvo.id),
        orderBy: [desc(itensUsuario.obtidoEm)],
      });
      return itens.map((i) => {
        const cat = itemPorCodigo(i.codigoItem);
        return {
          codigo: i.codigoItem,
          nome: cat?.nome ?? i.codigoItem,
          categoria: cat?.categoria ?? "emblema",
          origem: i.origem,
          origemDetalhe: i.origemDetalhe,
          obtidoEm: i.obtidoEm,
        };
      });
    }),

  // ---------- Conceder item (individual) — com confirmação no frontend ----------
  concederItem: adminAutenticado
    .input(
      z.object({
        termo: z.string().trim().min(1).max(40),
        codigoItem: z.string().max(40),
        confirmacao: z.literal(true), // o painel só chama após a tela de confirmação
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "enviar_itens");
      const item = itemPorCodigo(input.codigoItem);
      if (!item) throw new TRPCError({ code: "BAD_REQUEST", message: "Item inexistente no catálogo." }); // nunca distribuir item que não existe
      const alvo = await acharJogador(input.termo);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      await exigeAlvoPermitido(c, alvo.id, "conceder_item");

      const resultado = await entregarComRegistro(alvo.id, item.codigo, `Entregue pela equipe (${c.usuario.username})`);
      await auditar({
        operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "conceder_item", alvoId: alvo.id,
        detalhes: { item: item.codigo, resultado }, resultado: "ok", ip: ipDaRequisicao(c.req),
      });
      return { ok: true, resultado, jogador: alvo.nomeExibicao, item: item.nome };
    }),

  // ---------- Revogar item ----------
  revogarItem: adminAutenticado
    .input(z.object({ termo: z.string().trim().min(1).max(40), codigoItem: z.string().max(40), confirmacao: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "enviar_itens");
      const alvo = await acharJogador(input.termo);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      await exigeAlvoPermitido(c, alvo.id, "revogar_item");
      const db = getDb();
      await db.delete(itensUsuario).where(and(eq(itensUsuario.usuarioId, alvo.id), eq(itensUsuario.codigoItem, input.codigoItem)));
      await auditar({
        operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "revogar_item", alvoId: alvo.id,
        detalhes: { item: input.codigoItem }, resultado: "ok", ip: ipDaRequisicao(c.req),
      });
      return { ok: true };
    }),

  // ==========================================================================
  // 9. SELOS — conceder/remover (só quem tem 'gerenciar_selos' = Dono)
  // ==========================================================================
  gerenciarSelo: adminAutenticado
    .input(
      z.object({
        termo: z.string().trim().min(1).max(40),
        selo: z.enum(["verificado", "criador", "parceiro", "equipe"]),
        acao: z.enum(["conceder", "remover"]),
        confirmacao: z.literal(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "gerenciar_selos"); // por padrão, SÓ O DONO
      const alvo = await acharJogador(input.termo);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      if (input.selo === "criador") {
        throw new TRPCError({ code: "FORBIDDEN", message: "O selo de Criador é exclusivo da conta do Dono." });
      }
      const db = getDb();
      if (input.acao === "conceder") {
        await db.insert(selos).values({ usuarioId: alvo.id, selo: input.selo, concedidoPor: c.usuario.id })
          .onDuplicateKeyUpdate({ set: { concedidoPor: c.usuario.id } });
      } else {
        await db.delete(selos).where(and(eq(selos.usuarioId, alvo.id), eq(selos.selo, input.selo)));
      }
      await auditar({
        operadorId: c.usuario.id, cargo: c.papel.cargo, acao: `${input.acao}_selo`, alvoId: alvo.id,
        detalhes: { selo: input.selo }, resultado: "ok", ip: ipDaRequisicao(c.req),
      });
      return { ok: true };
    }),

  // ==========================================================================
  // DENÚNCIAS
  // ==========================================================================
  listarDenuncias: adminAutenticado
    .input(z.object({ estado: z.enum(["aberta", "em_analise", "resolvida", "arquivada", "todas"]).default("aberta") }))
    .query(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      const podeTodas = c.papel.permissoes.includes("analisar_denuncias");
      const soAtribuidas = !podeTodas && c.papel.permissoes.includes("ver_denuncias_atribuidas");
      if (!podeTodas && !soAtribuidas) exigePermissao(c, "analisar_denuncias");
      const db = getDb();
      const condicoes = [];
      if (input.estado !== "todas") condicoes.push(eq(denuncias.estado, input.estado));
      if (soAtribuidas) condicoes.push(eq(denuncias.atribuidaA, c.usuario.id));
      const lista = await db.query.denuncias.findMany({
        where: condicoes.length ? and(...condicoes) : undefined,
        orderBy: [desc(denuncias.criadaEm)],
        limit: 100,
      });
      return Promise.all(
        lista.map(async (d) => {
          const [autor, alvo] = await Promise.all([
            db.query.usuarios.findFirst({ where: eq(usuarios.id, d.autorId) }),
            db.query.usuarios.findFirst({ where: eq(usuarios.id, d.alvoId) }),
          ]);
          return {
            id: d.id, motivo: d.motivo, detalhes: d.detalhes, estado: d.estado, criadaEm: d.criadaEm,
            autor: autor ? { nome: autor.nomeExibicao, idPublico: formatarIdPublico(Number(autor.idPublico)) } : null,
            alvo: alvo ? { nome: alvo.nomeExibicao, idPublico: formatarIdPublico(Number(alvo.idPublico)) } : null,
          };
        }),
      );
    }),

  atualizarDenuncia: adminAutenticado
    .input(
      z.object({
        id: z.number().int(),
        estado: z.enum(["em_analise", "resolvida", "arquivada"]),
        atribuirAMim: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "analisar_denuncias");
      const db = getDb();
      const d = await db.query.denuncias.findFirst({ where: eq(denuncias.id, input.id) });
      if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Denúncia não encontrada." });
      await db
        .update(denuncias)
        .set({
          estado: input.estado,
          atribuidaA: input.atribuirAMim ? c.usuario.id : d.atribuidaA,
          resolvidaEm: input.estado === "resolvida" ? new Date() : d.resolvidaEm,
        })
        .where(eq(denuncias.id, d.id));
      await auditar({
        operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "atualizar_denuncia", alvoId: d.alvoId,
        detalhes: { denuncia: d.id, estado: input.estado }, resultado: "ok", ip: ipDaRequisicao(c.req),
      });
      return { ok: true };
    }),

  // ==========================================================================
  // PUNIÇÕES — advertir / suspender (com teto por cargo) / banir (admin+)
  // ==========================================================================
  punir: adminAutenticado
    .input(
      z.object({
        termo: z.string().trim().min(1).max(40),
        tipo: z.enum(["advertencia", "suspensao", "banimento"]),
        motivo: z.string().trim().min(3).max(300),
        horas: z.number().int().min(1).max(24 * 365).optional(), // suspensão
        confirmacao: z.literal(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      const db = getDb();
      const alvo = await acharJogador(input.termo);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      if (alvo.id === c.usuario.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode se punir." });
      await exigeAlvoPermitido(c, alvo.id, "punir");

      if (input.tipo === "advertencia") {
        exigePermissao(c, "advertir");
      } else if (input.tipo === "suspensao") {
        exigePermissao(c, "suspender");
        const maxHoras = SUSPENSAO_MAX_HORAS[c.papel.cargo];
        if (!input.horas) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe a duração da suspensão." });
        if (input.horas > maxHoras) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Seu cargo suspende no máximo ${maxHoras}h.` });
        }
      } else {
        exigePermissao(c, "aplicar_punicoes"); // banimento: só administrador ou Dono
        if (c.papel.cargo === "moderador" || c.papel.cargo === "ajudante") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Seu cargo não pode banir." });
        }
      }

      const expira = input.tipo === "suspensao" ? new Date(Date.now() + input.horas! * 3600 * 1000) : null;
      await db.insert(punicoes).values({
        usuarioId: alvo.id, tipo: input.tipo, motivo: input.motivo, aplicadaPor: c.usuario.id, expiraEm: expira,
      });
      if (input.tipo === "suspensao") {
        await db.update(usuarios).set({ estado: "suspenso", suspensoAte: expira }).where(eq(usuarios.id, alvo.id));
      } else if (input.tipo === "banimento") {
        await db.update(usuarios).set({ estado: "banido", suspensoAte: null }).where(eq(usuarios.id, alvo.id));
        // Revoga todas as sessões do banido
        await db.update(sessoes).set({ revogadaEm: new Date() }).where(eq(sessoes.usuarioId, alvo.id));
      }
      await auditar({
        operadorId: c.usuario.id, cargo: c.papel.cargo, acao: `punir_${input.tipo}`, alvoId: alvo.id,
        detalhes: { motivo: input.motivo, horas: input.horas ?? null }, resultado: "ok", ip: ipDaRequisicao(c.req),
      });
      return { ok: true, jogador: alvo.nomeExibicao };
    }),

  // v82: a patente da ranqueada de um jogador (zerar quem trapaceou, devolver pontos perdidos por erro) — fica na auditoria
  // e no histórico da patente da conta (ranqueada_eventos: "ajuste")
  ajustarPatente: adminAutenticado
    .input(
      z.object({
        termo: z.string().trim().min(1).max(40),
        pts: z.number().int().min(0).max(99999),
        motivo: z.string().trim().min(3).max(300),
        confirmacao: z.literal(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "aplicar_punicoes");
      const alvo = await acharJogador(input.termo);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      await exigeAlvoPermitido(c, alvo.id, "ajustar_patente");
      const antes = await estadoRanqueada(alvo.id);
      const depois = await ajustaPatente(alvo.id, input.pts, c.usuario.id);
      await auditar({
        operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "ajustar_patente", alvoId: alvo.id,
        detalhes: { motivo: input.motivo, antes: antes.pts, depois: depois.pts }, resultado: "ok", ip: ipDaRequisicao(c.req),
      });
      return { ok: true, jogador: alvo.nomeExibicao, antes: antes.pts, depois: depois.pts, patente: infoPatente(depois.pts).titulo };
    }),

  revogarPunicao: adminAutenticado
    .input(z.object({ punicaoId: z.number().int(), confirmacao: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "aplicar_punicoes");
      const db = getDb();
      const p = await db.query.punicoes.findFirst({ where: and(eq(punicoes.id, input.punicaoId), eq(punicoes.ativa, true)) });
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Punição não encontrada." });
      await exigeAlvoPermitido(c, p.usuarioId, "revogar_punicao");
      await db.update(punicoes).set({ ativa: false }).where(eq(punicoes.id, p.id));
      if (p.tipo !== "advertencia") {
        await db.update(usuarios).set({ estado: "ativo", suspensoAte: null }).where(eq(usuarios.id, p.usuarioId));
      }
      await auditar({
        operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "revogar_punicao", alvoId: p.usuarioId,
        detalhes: { punicao: p.id }, resultado: "ok", ip: ipDaRequisicao(c.req),
      });
      return { ok: true };
    }),

  // ==========================================================================
  // 12. DISTRIBUIÇÃO DE RECOMPENSAS — individual / grupo / global
  // Idempotente (chave única), sem duplicação, com registro de resultados.
  // ==========================================================================
  distribuir: adminAutenticado
    .input(
      z.object({
        tipo: z.enum(["individual", "grupo", "global"]),
        codigoItem: z.string().max(40),
        destinatarios: z.array(z.string().trim().min(1).max(40)).max(500).optional(), // IDs/nomes p/ individual e grupo
        chaveIdempotencia: z.string().trim().min(8).max(64), // gerada no formulário — reenvio não duplica
        confirmacao: z.literal(true),
        confirmacaoGlobal: z.string().optional(), // "DISTRIBUIR" p/ global
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      const db = getDb();

      const item = itemPorCodigo(input.codigoItem);
      if (!item) throw new TRPCError({ code: "BAD_REQUEST", message: "Item inexistente no catálogo." });

      if (input.tipo === "global") {
        exigePermissao(c, "distribuir_global"); // permissão ESPECÍFICA (Dono por padrão)
        if (input.confirmacaoGlobal !== "DISTRIBUIR") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Confirmação adicional de distribuição global necessária." });
        }
      } else {
        exigePermissao(c, "enviar_itens");
      }

      // Idempotência: mesma chave = mesma distribuição já processada
      const jaExiste = await db.query.distribuicoes.findFirst({ where: eq(distribuicoes.chave, input.chaveIdempotencia) });
      if (jaExiste) {
        return { ok: true as const, idempotent: true as const, distribuicaoId: jaExiste.id, entregues: jaExiste.entregues, jaPossuiam: jaExiste.jaPossuiam, falhas: jaExiste.falhas, total: jaExiste.total };
      }

      // Resolve destinatários
      let alvos: { id: number; nome: string }[] = [];
      if (input.tipo === "global") {
        const todos = await db.query.usuarios.findMany({ where: eq(usuarios.estado, "ativo"), columns: { id: true, nomeExibicao: true } });
        alvos = todos.map((u) => ({ id: u.id, nome: u.nomeExibicao }));
      } else {
        if (!input.destinatarios || input.destinatarios.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione ao menos um jogador." });
        }
        for (const termo of input.destinatarios) {
          const u = await acharJogador(termo);
          if (!u) throw new TRPCError({ code: "NOT_FOUND", message: `Jogador "${termo}" não encontrado.` });
          alvos.push({ id: u.id, nome: u.nomeExibicao });
        }
        alvos = [...new Map(alvos.map((a) => [a.id, a])).values()]; // sem duplicados
      }

      let entregues = 0, jaPossuiam = 0, falhas = 0;
      const [dist] = await db.insert(distribuicoes).values({
        chave: input.chaveIdempotencia,
        tipo: input.tipo,
        codigoItem: item.codigo,
        criadaPor: c.usuario.id,
        estado: "concluida",
        total: alvos.length,
        detalhe: `${item.nome} por ${c.usuario.username}`,
      });
      const distId = Number(dist.insertId);

      for (const a of alvos) {
        try {
          // Dedup por (distribuição, usuário) — falha/reenvio nunca entrega duas vezes
          await db.insert(distribuicaoItens).values({ distribuicaoId: distId, usuarioId: a.id, estado: "entregue" });
          const r = await entregarComRegistro(a.id, item.codigo, `Distribuição ${input.tipo} #${distId}`);
          if (r === "entregue") entregues++;
          else {
            jaPossuiam++;
            await db.update(distribuicaoItens).set({ estado: "ja_possuia" }).where(
              and(eq(distribuicaoItens.distribuicaoId, distId), eq(distribuicaoItens.usuarioId, a.id)),
            );
          }
        } catch (e: unknown) {
          if (String(e).includes("uq_distrib_item") || String(e).includes("Duplicate")) {
            jaPossuiam++; // já processado nessa distribuição
          } else {
            falhas++;
            try {
              await db.insert(distribuicaoItens).values({ distribuicaoId: distId, usuarioId: a.id, estado: "falhou" });
            } catch { /* já registrado */ }
          }
        }
      }

      await db.update(distribuicoes).set({ entregues, jaPossuiam, falhas }).where(eq(distribuicoes.id, distId));
      await auditar({
        operadorId: c.usuario.id, cargo: c.papel.cargo, acao: `distribuir_${input.tipo}`, detalhes: {
          item: item.codigo, total: alvos.length, entregues, jaPossuiam, falhas, distribuicao: distId,
        }, resultado: falhas === 0 ? "ok" : "erro", ip: ipDaRequisicao(c.req),
      });
      return { ok: true as const, idempotent: false as const, distribuicaoId: distId, total: alvos.length, entregues, jaPossuiam, falhas };
    }),

  // Pré-visualização dos destinatários (grupo) antes de confirmar
  preVisualizarGrupo: adminAutenticado
    .input(z.object({ destinatarios: z.array(z.string().trim().min(1).max(40)).max(500) }))
    .query(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "enviar_itens");
      const resolvido: { termo: string; encontrado: boolean; nome?: string; idPublico?: string }[] = [];
      for (const termo of input.destinatarios) {
        const u = await acharJogador(termo);
        resolvido.push({
          termo,
          encontrado: !!u,
          nome: u?.nomeExibicao,
          idPublico: u ? formatarIdPublico(Number(u.idPublico)) : undefined,
        });
      }
      return resolvido;
    }),

  // ==========================================================================
  // EQUIPE — cargos e permissões (com hierarquia e proteção do Dono)
  // ==========================================================================
  listarEquipe: adminAutenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAdmin;
    exigePermissao(c, "gerenciar_equipe");
    const db = getDb();
    const lista = await db.query.cargos.findMany();
    return Promise.all(
      lista.map(async (m) => {
        const u = await db.query.usuarios.findFirst({ where: eq(usuarios.id, m.usuarioId) });
        return {
          usuarioId: m.usuarioId,
          cargo: m.cargo,
          permissoesCustom: m.permissoes,
          criadoEm: m.criadoEm,
          jogador: u ? { nome: u.nomeExibicao, username: u.username, idPublico: formatarIdPublico(Number(u.idPublico)), avatarEmoji: u.avatarEmoji } : null,
        };
      }),
    );
  }),

  definirCargo: adminAutenticado
    .input(
      z.object({
        termo: z.string().trim().min(1).max(40),
        cargo: z.enum(["dono", "administrador", "moderador", "ajudante"]),
        confirmacao: z.literal(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      const db = getDb();
      const alvo = await acharJogador(input.termo);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      if (alvo.id === c.usuario.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você não pode alterar o próprio cargo." }); // anti-autoelevação
      }

      const papelAlvo = await cargoDo(alvo.id);
      // Só o Dono mexe em administradores e no cargo de dono; administrador gerencia moderadores/ajudantes
      if (c.papel.cargo === "dono") {
        exigePermissao(c, "gerenciar_equipe");
      } else if (c.papel.cargo === "administrador") {
        exigePermissao(c, "gerenciar_equipe");
        if (input.cargo === "dono" || input.cargo === "administrador") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Administrador não cria cargos de administrador ou Dono." });
        }
        if (papelAlvo && CARGO_PESO[papelAlvo.cargo] >= CARGO_PESO.administrador) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não pode alterar esse membro." });
        }
      } else {
        throw new TRPCError({ code: "FORBIDDEN", message: "Seu cargo não gerencia a equipe." });
      }
      if (papelAlvo?.cargo === "dono") {
        throw new TRPCError({ code: "FORBIDDEN", message: "A conta do Dono é protegida." });
      }
      if (input.cargo === "dono" && c.papel.cargo !== "dono") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Só o Dono nomeia outro Dono." });
      }

      await db
        .insert(cargos)
        .values({ usuarioId: alvo.id, cargo: input.cargo, concedidoPor: c.usuario.id })
        .onDuplicateKeyUpdate({ set: { cargo: input.cargo, concedidoPor: c.usuario.id } });
      // Nova função = novo 2FA obrigatório no próximo login do painel
      await db.delete(totp).where(eq(totp.usuarioId, alvo.id));
      await auditar({
        operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "definir_cargo", alvoId: alvo.id,
        detalhes: { cargo: input.cargo, antes: papelAlvo?.cargo ?? null }, resultado: "ok", ip: ipDaRequisicao(c.req),
      });
      return { ok: true, jogador: alvo.nomeExibicao };
    }),

  removerCargo: adminAutenticado
    .input(z.object({ termo: z.string().trim().min(1).max(40), confirmacao: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "gerenciar_equipe");
      const db = getDb();
      const alvo = await acharJogador(input.termo);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      if (alvo.id === c.usuario.id) throw new TRPCError({ code: "FORBIDDEN", message: "Você não pode remover o próprio cargo." });
      const papelAlvo = await cargoDo(alvo.id);
      if (!papelAlvo) throw new TRPCError({ code: "NOT_FOUND", message: "Esse jogador não tem cargo." });
      if (papelAlvo.cargo === "dono") throw new TRPCError({ code: "FORBIDDEN", message: "A conta do Dono é protegida." });
      if (c.papel.cargo !== "dono" && CARGO_PESO[papelAlvo.cargo] >= CARGO_PESO[c.papel.cargo]) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você não pode remover um cargo igual ou maior." });
      }
      await db.delete(cargos).where(eq(cargos.usuarioId, alvo.id));
      await db.delete(totp).where(eq(totp.usuarioId, alvo.id));
      // Derruba sessões de painel do ex-membro
      await db.update(sessoes).set({ revogadaEm: new Date() }).where(and(eq(sessoes.usuarioId, alvo.id), eq(sessoes.painelAdmin, true)));
      await auditar({
        operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "remover_cargo", alvoId: alvo.id,
        detalhes: { cargo: papelAlvo.cargo }, resultado: "ok", ip: ipDaRequisicao(c.req),
      });
      return { ok: true };
    }),

  // Ajuste fino de permissões (só Dono; nunca além do teto do cargo)
  definirPermissoes: adminAutenticado
    .input(
      z.object({
        termo: z.string().trim().min(1).max(40),
        permissoes: z.array(z.string().max(40)).max(30),
        confirmacao: z.literal(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "definir_permissoes"); // só Dono
      const db = getDb();
      const alvo = await acharJogador(input.termo);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      if (alvo.id === c.usuario.id) throw new TRPCError({ code: "FORBIDDEN", message: "Você não pode alterar as próprias permissões." });
      const papelAlvo = await cargoDo(alvo.id);
      if (!papelAlvo) throw new TRPCError({ code: "NOT_FOUND", message: "Esse jogador não tem cargo." });
      if (papelAlvo.cargo === "dono") throw new TRPCError({ code: "FORBIDDEN", message: "A conta do Dono é protegida." });

      const teto = PERMISSOES_PADRAO[papelAlvo.cargo];
      const pedidas = input.permissoes as Permissao[];
      const validas = pedidas.filter((p) => teto.includes(p));
      await db.update(cargos).set({ permissoes: validas }).where(eq(cargos.usuarioId, alvo.id));
      await auditar({
        operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "definir_permissoes", alvoId: alvo.id,
        detalhes: { permissoes: validas }, resultado: "ok", ip: ipDaRequisicao(c.req),
      });
      return { ok: true, aplicadas: validas };
    }),

  // ==========================================================================
  // AUDITORIA / REGISTROS
  // ==========================================================================
  registros: adminAutenticado
    .input(z.object({ limite: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "consultar_registros");
      const db = getDb();
      const lista = await db.query.auditoria.findMany({ orderBy: [desc(auditoria.criadoEm)], limit: input.limite });
      return Promise.all(
        lista.map(async (a) => {
          const [op, alvo] = await Promise.all([
            db.query.usuarios.findFirst({ where: eq(usuarios.id, a.operadorId) }),
            a.alvoId ? db.query.usuarios.findFirst({ where: eq(usuarios.id, a.alvoId) }) : null,
          ]);
          return {
            id: a.id,
            acao: a.acao,
            resultado: a.resultado,
            detalhes: a.detalhes,
            ip: a.ip,
            quando: a.criadoEm,
            operador: op ? { nome: op.nomeExibicao, cargo: a.cargoOperador } : { nome: `#${a.operadorId}`, cargo: a.cargoOperador },
            alvo: alvo ? { nome: alvo.nomeExibicao, idPublico: formatarIdPublico(Number(alvo.idPublico)) } : null,
          };
        }),
      );
    }),

  historicoDistribuicoes: adminAutenticado
    .input(z.object({ limite: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "consultar_registros");
      const db = getDb();
      const lista = await db.query.distribuicoes.findMany({ orderBy: [desc(distribuicoes.criadaEm)], limit: input.limite });
      return lista.map((d) => ({
        id: d.id, tipo: d.tipo, item: itemPorCodigo(d.codigoItem)?.nome ?? d.codigoItem,
        estado: d.estado, total: d.total, entregues: d.entregues, jaPossuiam: d.jaPossuiam, falhas: d.falhas,
        detalhe: d.detalhe, criadaEm: d.criadaEm,
      }));
    }),

  catalogoItens: adminAutenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAdmin;
    exigePermissao(c, "enviar_itens");
    return CATALOGO_ITENS;
  }),
});
