// ============================================================================
// RACHA v109 — RACHA CONTROL › O PAINEL DO DONO. Tudo o que é só do Dono (o resto do Dono — selos, itens, distribuição,
// correio, eventos, contas — continua nas rotas de antes, agora só com permissões do Dono):
//   · a CARTEIRA do jogador e DAR/TIRAR moedas e gemas (com motivo; o histórico da carteira guarda quem, quanto e por quê);
//   · a EQUIPE (a staff): o cargo, o 2FA ligado ou não, o último login no painel e o que cada um fez; RESETAR O 2FA de alguém
//     (o próprio, com a senha) e ENCERRAR as sessões do painel de alguém;
//   · os REGISTROS de tudo o que a staff faz, com filtro (quem, o quê, em quem, o período, só a staff, sem as consultas), e o
//     RESUMO da staff (quantas ações de cada tipo cada um fez no período, e as tentativas negadas).
// Só o cargo Dono; cada ação vai para a auditoria.
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, lt, ne, notInArray, like, type SQL } from "drizzle-orm";
import { createRouter } from "../../middleware";
import { getDb } from "../../queries/connection";
import { usuarios, sessoes, cargos, totp, auditoria } from "@db/schema";
import { adminAutenticado, exigePermissao, cargoDo, type CtxAdmin } from "../guard";
import { verificarSenha, novoUuid } from "../security";
import { formatarIdPublico, PERMISSOES_PADRAO, CARGO_PESO, type Cargo } from "@contracts/racha";
import { carteiraDo, movimentar } from "../economia";
import { notifica } from "../v88/comum";
import { acharJogador, jogadorOuErro, registra, nega, nomeCargo } from "./comum109";

const termoZ = z.string().trim().min(1).max(40);
const motivoZ = z.string().trim().min(3, "Escreva o motivo (3 letras ou mais).").max(300);
const pubDe = (u: { idPublico: number | bigint }) => formatarIdPublico(Number(u.idPublico));

// só o cargo Dono (a staff que chamar daqui fica na auditoria como negada)
async function exigeDono(ctx: unknown, acao: string): Promise<CtxAdmin> {
  const c = ctx as CtxAdmin;
  if (c.papel.cargo !== "dono") await nega(c, acao, null, "Isso é só do painel do Dono.");
  return c;
}

// as ações da staff que não são "fazer" (olhar a ficha): o filtro "sem as consultas" do registro
const CONSULTAS = ["ver_ficha"];
// os rótulos das ações no painel do Dono (o que não estiver aqui aparece com o nome da ação)
export const ROTULO_ACAO: Record<string, string> = {
  login_painel: "Entrou no painel", "2fa_ok": "Confirmou o 2FA", "2fa_errado": "Errou o código do 2FA", ver_ficha: "Olhou a ficha",
  silenciar: "Silenciou o chat", banir: "Baniu por um tempo", banir_para_sempre: "Baniu para sempre", advertir: "Advertiu",
  expulsar: "Tirou da sala", trocar_nome: "Trocou o nome", anotar: "Escreveu uma nota", tirar_punicao: "Tirou uma punição",
  resolver_denuncia: "Resolveu uma denúncia", denuncia_estado: "Mudou uma denúncia", punir_advertencia: "Advertiu",
  punir_suspensao: "Suspendeu", punir_banimento: "Baniu para sempre", revogar_punicao: "Tirou uma punição", ajustar_patente: "Mexeu na patente",
  conceder_item: "Deu um item", revogar_item: "Tirou um item", conceder_selo: "Deu um selo", remover_selo: "Tirou um selo",
  carteira: "Mexeu na carteira", definir_cargo: "Deu um cargo", remover_cargo: "Tirou o cargo", definir_permissoes: "Ajustou as permissões",
  resetar_2fa: "Resetou o 2FA", encerrar_sessoes: "Encerrou as sessões do painel", atualizar_denuncia: "Mudou uma denúncia",
  sem_permissao: "Tentou sem permissão", ver_carteira: "Tentou ver a carteira", ver_equipe: "Tentou ver a equipe", ver_registros: "Tentou ver os registros",
};

export const donoRouter = createRouter({
  // ==========================================================================
  // A CARTEIRA: dar e tirar moedas e gemas
  // ==========================================================================
  carteira: adminAutenticado.input(z.object({ termo: termoZ })).query(async ({ ctx, input }) => {
    const c = await exigeDono(ctx, "ver_carteira");
    exigePermissao(c, "dar_moedas");
    const u = await jogadorOuErro(input.termo);
    const w = await carteiraDo(u.id);
    return { moedas: w.moedas, gemas: w.gemas };
  }),

  ajustarCarteira: adminAutenticado
    .input(z.object({
      termo: termoZ,
      moedas: z.number().int().min(-10_000_000).max(10_000_000).default(0),
      gemas: z.number().int().min(-1_000_000).max(1_000_000).default(0),
      motivo: motivoZ,
      avisar: z.boolean().default(true),
      confirmacao: z.literal(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const c = await exigeDono(ctx, "carteira");
      exigePermissao(c, "dar_moedas");
      if (!input.moedas && !input.gemas) throw new TRPCError({ code: "BAD_REQUEST", message: "Escolha quantas moedas ou gemas." });
      const u = await jogadorOuErro(input.termo);
      const antes = await carteiraDo(u.id);
      const r = await movimentar({
        usuarioId: u.id, moedasDelta: input.moedas, gemasDelta: input.gemas, tipo: "ajuste_admin",
        motivo: `RACHA CONTROL (${c.usuario.username}): ${input.motivo}`, refTipo: "painel", operacaoId: `painel-${novoUuid()}`, adminId: c.usuario.id,
      });
      if (!r.ok) {
        await registra(c, "carteira", u.id, { moedas: input.moedas, gemas: input.gemas, motivo: input.motivo, erro: r.erro }, "erro");
        throw new TRPCError({ code: "BAD_REQUEST", message: r.erro.includes("insuficiente") || r.erro.includes("negativ") ? "O jogador não tem tudo isso para tirar." : r.erro });
      }
      if (input.avisar && (input.moedas > 0 || input.gemas > 0)) {
        const partes = [input.moedas > 0 ? `${input.moedas} moedas` : "", input.gemas > 0 ? `${input.gemas} gemas` : ""].filter(Boolean).join(" e ");
        await notifica(u.id, { categoria: "recompensas", titulo: "Presente da equipe do RACHA", corpo: `Você ganhou ${partes}. ${input.motivo}`, refTipo: "carteira" });
      }
      await registra(c, "carteira", u.id, { moedas: input.moedas, gemas: input.gemas, motivo: input.motivo, antes: { moedas: antes.moedas, gemas: antes.gemas }, depois: { moedas: r.moedas, gemas: r.gemas } });
      return { ok: true, jogador: u.nomeExibicao, moedas: r.moedas, gemas: r.gemas };
    }),

  // ==========================================================================
  // A EQUIPE (a staff)
  // ==========================================================================
  equipe: adminAutenticado.query(async ({ ctx }) => {
    const c = await exigeDono(ctx, "ver_equipe");
    exigePermissao(c, "gerenciar_equipe");
    const db = getDb();
    const lista = await db.query.cargos.findMany();
    const ids = lista.map((m) => m.usuarioId);
    if (!ids.length) return [];
    const desde = new Date(Date.now() - 7 * 864e5);
    const [gente, chaves, logins, acoes] = await Promise.all([
      db.query.usuarios.findMany({ where: inArray(usuarios.id, ids) }),
      db.query.totp.findMany({ where: inArray(totp.usuarioId, ids) }),
      db.query.sessoes.findMany({ where: and(inArray(sessoes.usuarioId, ids), eq(sessoes.painelAdmin, true)), orderBy: [desc(sessoes.criadaEm)], limit: 500 }),
      db.query.auditoria.findMany({ where: and(inArray(auditoria.operadorId, ids), gte(auditoria.criadoEm, desde)), limit: 5000 }),
    ]);
    const agora = Date.now();
    return lista
      .map((m) => {
        const u = gente.find((g) => g.id === m.usuarioId);
        const t = chaves.find((k) => k.usuarioId === m.usuarioId);
        const meus = logins.filter((s) => s.usuarioId === m.usuarioId);
        const feitas = acoes.filter((a) => a.operadorId === m.usuarioId);
        return {
          usuarioId: m.usuarioId,
          cargo: m.cargo,
          nomeCargo: nomeCargo(m.cargo),
          permissoes: Array.isArray(m.permissoes) ? (m.permissoes as string[]).filter((p) => PERMISSOES_PADRAO[m.cargo].includes(p as never)) : [...PERMISSOES_PADRAO[m.cargo]],
          ajustado: Array.isArray(m.permissoes),
          jogador: u ? { nome: u.nomeExibicao, username: u.username, idPublico: pubDe(u), avatarEmoji: u.avatarEmoji } : null,
          doisFatores: t ? (t.ativo ? "ligado" : "esperando") : "sem",
          ultimoLogin: meus[0]?.criadaEm ?? null,
          sessoesAbertas: meus.filter((s) => !s.revogadaEm && s.expiraEm.getTime() > agora && s.totpVerificado).length,
          acoes7d: feitas.filter((a) => a.resultado === "ok" && !CONSULTAS.includes(a.acao) && !["login_painel", "2fa_ok"].includes(a.acao)).length,
          negadas7d: feitas.filter((a) => a.resultado === "negado").length,
          desde: m.criadoEm,
        };
      })
      .sort((a, b) => CARGO_PESO[b.cargo as Cargo] - CARGO_PESO[a.cargo as Cargo]);
  }),

  // o 2FA de alguém da equipe volta para o começo: no próximo login no painel aparece um QR code novo (as sessões do painel
  // dessa pessoa caem). O do próprio Dono, só com a senha dele.
  resetar2fa: adminAutenticado
    .input(z.object({ termo: termoZ, senha: z.string().max(100).optional(), confirmacao: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const c = await exigeDono(ctx, "resetar_2fa");
      exigePermissao(c, "gerenciar_equipe");
      const db = getDb();
      const u = await jogadorOuErro(input.termo);
      const papel = await cargoDo(u.id);
      if (!papel) throw new TRPCError({ code: "BAD_REQUEST", message: "Essa conta não é da equipe." });
      if (u.id === c.usuario.id) {
        if (!input.senha || !verificarSenha(input.senha, c.usuario.senhaHash)) await nega(c, "resetar_2fa", u.id, "Para resetar o seu próprio 2FA, confirme a sua senha.");
      } else if (papel.cargo === "dono") {
        await nega(c, "resetar_2fa", u.id, "O 2FA de outro Dono, só ele mesmo reseta.");
      }
      await db.delete(totp).where(eq(totp.usuarioId, u.id));
      await db.update(sessoes).set({ revogadaEm: new Date() }).where(and(eq(sessoes.usuarioId, u.id), eq(sessoes.painelAdmin, true)));
      await registra(c, "resetar_2fa", u.id, { cargo: papel.cargo });
      return { ok: true, jogador: u.nomeExibicao };
    }),

  // as sessões do painel de alguém da equipe caem agora (ele precisa entrar de novo, com o 2FA)
  encerrarSessoes: adminAutenticado
    .input(z.object({ termo: termoZ, confirmacao: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const c = await exigeDono(ctx, "encerrar_sessoes");
      exigePermissao(c, "gerenciar_equipe");
      const u = await jogadorOuErro(input.termo);
      if (u.id === c.usuario.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Para sair do painel, use SAIR DO PAINEL." });
      const papel = await cargoDo(u.id);
      if (papel?.cargo === "dono") await nega(c, "encerrar_sessoes", u.id, "A sessão de outro Dono, só ele mesmo encerra.");
      await getDb().update(sessoes).set({ revogadaEm: new Date() }).where(and(eq(sessoes.usuarioId, u.id), eq(sessoes.painelAdmin, true)));
      await registra(c, "encerrar_sessoes", u.id, {});
      return { ok: true, jogador: u.nomeExibicao };
    }),

  // ==========================================================================
  // OS REGISTROS (tudo o que a equipe faz) e o RESUMO DA STAFF
  // ==========================================================================
  registros: adminAutenticado
    .input(z.object({
      operador: z.string().trim().max(40).optional(),   // quem fez (ID ou usuário)
      alvo: z.string().trim().max(40).optional(),       // em quem (ID ou usuário)
      acao: z.string().trim().max(60).optional(),       // a ação (ou o começo dela: "banir" pega as duas)
      resultado: z.enum(["todos", "ok", "negado", "erro"]).default("todos"),
      soStaff: z.boolean().default(true),               // sem as ações do próprio Dono
      semConsultas: z.boolean().default(true),          // sem "olhou a ficha"
      dias: z.number().int().min(1).max(365).default(30),
      antesDe: z.number().int().optional(),             // (a próxima página: os registros com id menor)
      limite: z.number().int().min(1).max(200).default(80),
    }))
    .query(async ({ ctx, input }) => {
      const c = await exigeDono(ctx, "ver_registros");
      exigePermissao(c, "ver_todos_registros");
      const db = getDb();
      const conds: SQL[] = [gte(auditoria.criadoEm, new Date(Date.now() - input.dias * 864e5))];
      if (input.operador) {
        const o = await acharJogador(input.operador);
        if (!o) return { itens: [], fim: true };
        conds.push(eq(auditoria.operadorId, o.id));
      }
      if (input.alvo) {
        const a = await acharJogador(input.alvo);
        if (!a) return { itens: [], fim: true };
        conds.push(eq(auditoria.alvoId, a.id));
      }
      if (input.acao) conds.push(like(auditoria.acao, `${input.acao.replace(/[\\%_]/g, (x) => "\\" + x)}%`));
      if (input.resultado !== "todos") conds.push(eq(auditoria.resultado, input.resultado));
      if (input.soStaff) {
        const donos = (await db.query.cargos.findMany({ where: eq(cargos.cargo, "dono") })).map((d) => d.usuarioId);
        if (donos.length) conds.push(notInArray(auditoria.operadorId, donos));
      }
      if (input.semConsultas) conds.push(notInArray(auditoria.acao, CONSULTAS));
      if (input.antesDe) conds.push(lt(auditoria.id, input.antesDe));
      const lista = await db.query.auditoria.findMany({ where: and(...conds), orderBy: [desc(auditoria.id)], limit: input.limite + 1 });
      const fim = lista.length <= input.limite;
      const itens = lista.slice(0, input.limite);
      const ids = [...new Set(itens.flatMap((a) => [a.operadorId, ...(a.alvoId ? [a.alvoId] : [])]))];
      const gente = ids.length ? await db.query.usuarios.findMany({ where: inArray(usuarios.id, ids) }) : [];
      const de = (id: number | null) => (id ? gente.find((g) => g.id === id) : undefined);
      return {
        fim,
        itens: itens.map((a) => {
          const op = de(a.operadorId), alvo = de(a.alvoId);
          return {
            id: a.id, acao: a.acao, rotulo: ROTULO_ACAO[a.acao] ?? a.acao, resultado: a.resultado, detalhes: a.detalhes, ip: a.ip, quando: a.criadoEm,
            operador: op ? { nome: op.nomeExibicao, idPublico: pubDe(op), cargo: a.cargoOperador, nomeCargo: nomeCargo(a.cargoOperador) } : { nome: `#${a.operadorId}`, idPublico: null, cargo: a.cargoOperador, nomeCargo: nomeCargo(a.cargoOperador) },
            alvo: alvo ? { nome: alvo.nomeExibicao, idPublico: pubDe(alvo) } : null,
          };
        }),
      };
    }),

  resumoStaff: adminAutenticado
    .input(z.object({ dias: z.number().int().min(1).max(90).default(7) }))
    .query(async ({ ctx, input }) => {
      const c = await exigeDono(ctx, "ver_registros");
      exigePermissao(c, "ver_todos_registros");
      const db = getDb();
      const equipe = (await db.query.cargos.findMany({ where: ne(cargos.cargo, "dono") }));
      const ids = equipe.map((m) => m.usuarioId);
      if (!ids.length) return { dias: input.dias, pessoas: [] };
      const [gente, acoes] = await Promise.all([
        db.query.usuarios.findMany({ where: inArray(usuarios.id, ids) }),
        db.query.auditoria.findMany({ where: and(inArray(auditoria.operadorId, ids), gte(auditoria.criadoEm, new Date(Date.now() - input.dias * 864e5))), orderBy: [desc(auditoria.id)], limit: 20000 }),
      ]);
      const pessoas = equipe.map((m) => {
        const u = gente.find((g) => g.id === m.usuarioId);
        const minhas = acoes.filter((a) => a.operadorId === m.usuarioId);
        const conta = (f: (a: (typeof acoes)[number]) => boolean) => minhas.filter(f).length;
        const ok = (...nomes: string[]) => conta((a) => a.resultado === "ok" && nomes.includes(a.acao));
        return {
          usuarioId: m.usuarioId,
          nome: u?.nomeExibicao ?? `#${m.usuarioId}`,
          idPublico: u ? pubDe(u) : null,
          cargo: m.cargo,
          nomeCargo: nomeCargo(m.cargo),
          silenciou: ok("silenciar"),
          baniu: ok("banir", "banir_para_sempre", "punir_suspensao", "punir_banimento"),
          advertiu: ok("advertir", "punir_advertencia"),
          tirouDaSala: ok("expulsar"),
          trocouNome: ok("trocar_nome"),
          tirouPunicao: ok("tirar_punicao", "revogar_punicao"),
          denuncias: ok("resolver_denuncia", "denuncia_estado", "atualizar_denuncia"),
          notas: ok("anotar"),
          fichas: ok("ver_ficha"),
          negadas: conta((a) => a.resultado === "negado"),
          ultimaAcao: minhas.find((a) => !["login_painel", "2fa_ok", "ver_ficha"].includes(a.acao))?.criadoEm ?? null,
          ultimoLogin: minhas.find((a) => a.acao === "2fa_ok")?.criadoEm ?? null,
        };
      });
      return { dias: input.dias, pessoas };
    }),
});
