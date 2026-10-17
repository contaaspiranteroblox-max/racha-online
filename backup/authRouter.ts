// ============================================================================
// RACHA 2.0 — Router de contas: registro, login, sessões, recuperação
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, isNull, gt, desc, sql } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { usuarios, sessoes, contadores, estatisticas, itensUsuario, cargos, selos } from "@db/schema";
import {
  hashSenha,
  verificarSenha,
  novoToken,
  sha256,
  novoUuid,
  novoCodigoRecuperacao,
} from "./security";
import {
  autenticado,
  sessaoDaRequisicao,
  ipDaRequisicao,
  exigeLimite,
  SESSAO_DIAS,
  type CtxAutenticado,
} from "./guard";
import { formatarIdPublico, tituloPorNivel } from "@contracts/racha";

const usernameSchema = z
  .string()
  .min(3, "Usuário precisa de 3+ caracteres")
  .max(24)
  .regex(/^[a-z0-9_.]+$/, "Use letras minúsculas, números, _ ou .")
  .transform((s) => s.toLowerCase());

const senhaSchema = z.string().min(8, "Senha precisa de 8+ caracteres").max(100);

async function criarSessao(usuarioId: number, req: Request, painelAdmin = false) {
  const db = getDb();
  const token = novoToken();
  const duracao = painelAdmin ? 8 * 60 * 60 * 1000 : SESSAO_DIAS * 24 * 60 * 60 * 1000;
  await db.insert(sessoes).values({
    usuarioId,
    tokenHash: sha256(token),
    painelAdmin,
    ip: ipDaRequisicao(req),
    agente: (req.headers.get("user-agent") || "").slice(0, 200),
    expiraEm: new Date(Date.now() + duracao),
  });
  return token;
}

function cookieSessao(token: string, maxAgeSeg: number): string {
  return `racha_sessao=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeg}`;
}

// Perfil público de um usuário (nunca expõe dados privados)
export function paraPublico(u: typeof usuarios.$inferSelect, selosLista: string[] = []) {
  return {
    idPublico: formatarIdPublico(Number(u.idPublico)),
    nomeExibicao: u.nomeExibicao,
    username: u.username,
    nivel: u.nivel,
    tituloCarreira: tituloPorNivel(u.nivel),
    tituloEquipado: u.tituloEquipado,
    avatarEmoji: u.avatarEmoji,
    corDestaque: u.corDestaque,
    skinEquipada: u.skinEquipada,
    bannerEquipado: u.bannerEquipado,
    molduraEquipada: u.molduraEquipada,
    selos: selosLista,
    criadoEm: u.criadoEm,
  };
}

export const authRouter = createRouter({
  // ---------- Registro ----------
  registrar: publicQuery
    .input(
      z.object({
        username: usernameSchema,
        nomeExibicao: z.string().trim().min(2).max(32),
        senha: senhaSchema,
        email: z.string().email().max(120).optional().or(z.literal("").transform(() => undefined)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const ip = ipDaRequisicao(ctx.req);
      await exigeLimite(`registro:${ip}`, 5, 60 * 60 * 1000, "Muitos registros. Tente mais tarde.");

      const existe = await db.query.usuarios.findFirst({ where: eq(usuarios.username, input.username) });
      if (existe) throw new TRPCError({ code: "CONFLICT", message: "Esse usuário já está em uso." });
      if (input.email) {
        const em = await db.query.usuarios.findFirst({ where: eq(usuarios.email, input.email) });
        if (em) throw new TRPCError({ code: "CONFLICT", message: "Esse email já está em uso." });
      }

      // ID público: gerado SÓ pelo servidor, atômico (LAST_INSERT_ID), nunca reutilizado
      await db
        .insert(contadores)
        .values({ nome: "id_publico", valor: 1 })
        .onDuplicateKeyUpdate({ set: { nome: "id_publico" } });
      await db.execute(sql`UPDATE contadores SET valor = LAST_INSERT_ID(valor + 1) WHERE nome = 'id_publico'`);
      const [contRows] = await db.execute(sql`SELECT LAST_INSERT_ID() AS v`);
      const idPublico = Number((contRows as unknown as { v: number | string }[])[0]?.v ?? 1);

      const codigoRecuperacao = novoCodigoRecuperacao();
      let novoId = 0;
      try {
        const [res] = await db.insert(usuarios).values({
          uuid: novoUuid(),
          idPublico,
          username: input.username,
          nomeExibicao: input.nomeExibicao,
          senhaHash: hashSenha(input.senha),
          email: input.email ?? null,
          codigoRecuperacaoHash: hashSenha(codigoRecuperacao),
          tituloEquipado: "Novato da Rua",
        });
        novoId = Number(res.insertId);
      } catch (e: unknown) {
        if (String(e).includes("username")) throw new TRPCError({ code: "CONFLICT", message: "Esse usuário já está em uso." });
        throw e;
      }

      await db.insert(estatisticas).values({ usuarioId: novoId, modos: {} });
      await db.insert(itensUsuario).values([
        { usuarioId: novoId, codigoItem: "skin_padrao", origem: "inicial" },
        { usuarioId: novoId, codigoItem: "banner_laje_noturna", origem: "inicial" },
      ]);

      const token = await criarSessao(novoId, ctx.req);
      await db.update(usuarios).set({ ultimoLoginEm: new Date() }).where(eq(usuarios.id, novoId));
      ctx.resHeaders.append("set-cookie", cookieSessao(token, SESSAO_DIAS * 24 * 3600));

      const u = await db.query.usuarios.findFirst({ where: eq(usuarios.id, novoId) });
      return {
        token,
        conta: paraPublico(u!),
        // Código de recuperação: mostrado UMA vez, guardado só como hash
        codigoRecuperacao,
      };
    }),

  // ---------- Login ----------
  entrar: publicQuery
    .input(z.object({ username: z.string().trim().min(1).max(24), senha: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const ip = ipDaRequisicao(ctx.req);
      const username = input.username.toLowerCase();
      await exigeLimite(`login:${ip}`, 15, 15 * 60 * 1000, "Muitas tentativas. Aguarde 15 minutos.");
      await exigeLimite(`login:${ip}:${username}`, 5, 15 * 60 * 1000, "Muitas tentativas nessa conta. Aguarde.");

      const u = await db.query.usuarios.findFirst({ where: eq(usuarios.username, username) });
      if (!u || !verificarSenha(input.senha, u.senhaHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha incorretos." });
      }
      if (u.estado === "banido") throw new TRPCError({ code: "FORBIDDEN", message: "Conta banida do RACHA." });
      if (u.estado === "suspenso" && u.suspensoAte && u.suspensoAte.getTime() > Date.now()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Conta suspensa até ${u.suspensoAte.toLocaleString("pt-BR")}.`,
        });
      }

      const token = await criarSessao(u.id, ctx.req);
      await db.update(usuarios).set({ ultimoLoginEm: new Date() }).where(eq(usuarios.id, u.id));
      ctx.resHeaders.append("set-cookie", cookieSessao(token, SESSAO_DIAS * 24 * 3600));
      return { token, conta: paraPublico(u) };
    }),

  // ---------- Sessão atual ----------
  eu: publicQuery.query(async ({ ctx }) => {
    const s = await sessaoDaRequisicao(ctx.req);
    if (!s) return { logado: false as const };
    const db = getDb();
    const papel = await db.query.cargos.findFirst({ where: eq(cargos.usuarioId, s.usuario.id) });
    const meusSelos = await db.query.selos.findMany({ where: eq(selos.usuarioId, s.usuario.id) });
    return {
      logado: true as const,
      conta: {
        ...paraPublico(s.usuario, meusSelos.map((x) => x.selo)),
        xp: s.usuario.xp,
        email: s.usuario.email,
        perfilPublico: s.usuario.perfilPublico,
        aceitaPedidos: s.usuario.aceitaPedidos,
        cargo: papel?.cargo ?? null,
      },
    };
  }),

  // ---------- Sair (revoga a sessão) ----------
  sair: autenticado.mutation(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    await getDb().update(sessoes).set({ revogadaEm: new Date() }).where(eq(sessoes.id, c.sessao.id));
    ctx.resHeaders.append("set-cookie", cookieSessao("", 0));
    return { ok: true };
  }),

  // ---------- Minhas sessões + revogação ----------
  minhasSessoes: autenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    const lista = await getDb().query.sessoes.findMany({
      where: and(eq(sessoes.usuarioId, c.usuario.id), isNull(sessoes.revogadaEm), gt(sessoes.expiraEm, new Date())),
      orderBy: [desc(sessoes.criadaEm)],
    });
    return lista.map((s) => ({
      id: s.id,
      atual: s.id === c.sessao.id,
      painelAdmin: s.painelAdmin,
      ip: s.ip,
      agente: s.agente,
      criadaEm: s.criadaEm,
    }));
  }),

  revogarSessao: autenticado
    .input(z.object({ sessaoId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      const db = getDb();
      const s = await db.query.sessoes.findFirst({ where: and(eq(sessoes.id, input.sessaoId), eq(sessoes.usuarioId, c.usuario.id)) });
      if (!s) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada." });
      await db.update(sessoes).set({ revogadaEm: new Date() }).where(eq(sessoes.id, s.id));
      return { ok: true };
    }),

  // ---------- Trocar senha (revoga as outras sessões) ----------
  trocarSenha: autenticado
    .input(z.object({ senhaAtual: z.string().min(1), novaSenha: senhaSchema }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      const db = getDb();
      if (!verificarSenha(input.senhaAtual, c.usuario.senhaHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta." });
      }
      await db.update(usuarios).set({ senhaHash: hashSenha(input.novaSenha) }).where(eq(usuarios.id, c.usuario.id));
      await db
        .update(sessoes)
        .set({ revogadaEm: new Date() })
        .where(and(eq(sessoes.usuarioId, c.usuario.id), isNull(sessoes.revogadaEm)));
      return { ok: true, aviso: "Senha trocada. Entre de novo na sua conta." };
    }),

  // ---------- Recuperação de conta (código mostrado no registro) ----------
  recuperar: publicQuery
    .input(
      z.object({
        username: z.string().trim().min(1).max(24),
        codigo: z.string().trim().min(8).max(30),
        novaSenha: senhaSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const ip = ipDaRequisicao(ctx.req);
      await exigeLimite(`recuperar:${ip}`, 5, 60 * 60 * 1000, "Muitas tentativas de recuperação.");

      const u = await db.query.usuarios.findFirst({ where: eq(usuarios.username, input.username.toLowerCase()) });
      if (!u || !u.codigoRecuperacaoHash || !verificarSenha(input.codigo.toUpperCase(), u.codigoRecuperacaoHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou código de recuperação inválidos." });
      }
      const novoCodigo = novoCodigoRecuperacao();
      await db
        .update(usuarios)
        .set({ senhaHash: hashSenha(input.novaSenha), codigoRecuperacaoHash: hashSenha(novoCodigo) })
        .where(eq(usuarios.id, u.id));
      await db.update(sessoes).set({ revogadaEm: new Date() }).where(eq(sessoes.usuarioId, u.id));
      return { ok: true, novoCodigoRecuperacao: novoCodigo };
    }),
});
