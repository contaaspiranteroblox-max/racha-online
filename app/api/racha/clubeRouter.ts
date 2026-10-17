// ============================================================================
// RACHA 2.0 — v69: Router de CLUBES (o jogo chama pela ponte: window.parent.RACHA_JOGO.clubes)
// Um clube por jogador, até 30 membros. Troféus = vitórias (estatisticas.vitorias); os do clube = a soma.
// Tipo: "publico" (entra quem tiver os troféus) · "convite" (só com convite). O dono edita, convida,
// tira membros e passa a dona; todo membro pode convidar. Quem sai por último fecha o clube.
// O escudo é o desenho feito no jogo (código E.…), conferido pelo formato.
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, or, desc, like, inArray, sql } from "drizzle-orm";
import { createRouter } from "../middleware";
import { getDb } from "../queries/connection";
import { usuarios, estatisticas, clubes, clubeMembros, clubeConvites, bloqueios } from "@db/schema";
import { autenticado, exigeLimite, type CtxAutenticado } from "./guard";
import { formatarIdPublico } from "@contracts/racha";

const MAX_MEMBROS = 30;
const TROFEUS_OK = [0, 5, 10, 25, 50, 100, 200, 300, 500, 1000];
const ESCUDO_RE = /^E\.[A-Za-z0-9_-]{4,44}$/;
const TAMPA_RE = /^T\.[A-Za-z0-9_-]{4,44}$/;
const ESCUDO_PADRAO = "E.AAgjz35Cxo4u34esSH___g";

const limpa = (s: string, n: number) =>
  Array.from(s.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim()).slice(0, n).join("");
const chaveNome = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24);
const semCuringa = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);
const ehDuplicado = (e: unknown) => /duplicate|ER_DUP_ENTRY|1062/i.test(String((e as { message?: string })?.message ?? e));

const campos = {
  descricao: z.string().max(80).transform((s) => limpa(s, 60) || "Junte-se a nós!"),
  pais: z.string().regex(/^[A-Z]{2}$/),
  tipo: z.enum(["publico", "convite"]),
  trofeuMinimo: z.number().int().refine((n) => TROFEUS_OK.includes(n), "Troféu mínimo inválido."),
  escudo: z.string().regex(ESCUDO_RE, "Escudo inválido."),
};

type Clube = typeof clubes.$inferSelect;
type Placar = Map<number, { membros: number; trofeus: number }>;

// os troféus e os membros de cada clube (uma conta só) e o ranking (empate = mesma posição)
async function placar(): Promise<{ por: Placar; rank: (id: number) => number }> {
  const db = getDb();
  const rows = await db
    .select({
      clubeId: clubeMembros.clubeId,
      membros: sql<number>`count(*)`,
      trofeus: sql<number>`coalesce(sum(${estatisticas.vitorias}), 0)`,
    })
    .from(clubeMembros)
    .leftJoin(estatisticas, eq(estatisticas.usuarioId, clubeMembros.usuarioId))
    .groupBy(clubeMembros.clubeId);
  const por: Placar = new Map(rows.map((r) => [Number(r.clubeId), { membros: Number(r.membros), trofeus: Number(r.trofeus) }]));
  const ordem = [...por.values()].map((v) => v.trofeus).sort((a, b) => b - a);
  const rank = (id: number) => {
    const t = por.get(id)?.trofeus ?? 0;
    let lo = 0, hi = ordem.length;                       // quantos têm mais troféus (busca binária na lista decrescente)
    while (lo < hi) { const m = (lo + hi) >> 1; if (ordem[m] > t) lo = m + 1; else hi = m; }
    return lo + 1;
  };
  return { por, rank };
}

function resumo(c: Clube, p: { por: Placar; rank: (id: number) => number }, donoNome?: string) {
  const s = p.por.get(c.id) ?? { membros: 0, trofeus: 0 };
  return {
    id: String(c.id),
    nome: c.nome,
    descricao: c.descricao,
    pais: c.pais,
    tipo: c.tipo,
    trofeuMinimo: c.trofeuMinimo,
    escudo: c.escudo,
    membros: s.membros,
    trofeus: s.trofeus,
    ranking: p.rank(c.id),
    donoNome: donoNome ?? "",
  };
}

const idClube = z.union([z.string().regex(/^\d{1,12}$/), z.number().int().positive()]).transform((v) => Number(v));

async function meuVinculo(usuarioId: number) {
  return getDb().query.clubeMembros.findFirst({ where: eq(clubeMembros.usuarioId, usuarioId) });
}
async function vitoriasDe(usuarioId: number) {
  const e = await getDb().query.estatisticas.findFirst({ where: eq(estatisticas.usuarioId, usuarioId) });
  return e?.vitorias ?? 0;
}
async function acharJogador(termo: string) {
  const db = getDb();
  const t = termo.trim();
  const num = /^0*\d{1,9}$/.test(t) ? Number(t) : null;
  if (num !== null && num > 0) {
    const u = await db.query.usuarios.findFirst({ where: eq(usuarios.idPublico, num) });
    if (u) return u;
  }
  return db.query.usuarios.findFirst({ where: eq(usuarios.username, t.toLowerCase()) });
}
async function usuarioPorIdPublico(idPub: string) {
  if (!/^\d{1,9}$/.test(idPub)) return null;
  return getDb().query.usuarios.findFirst({ where: eq(usuarios.idPublico, Number(idPub)) });
}
async function exigeDono(usuarioId: number) {
  const v = await meuVinculo(usuarioId);
  if (!v || v.papel !== "dono") throw new TRPCError({ code: "FORBIDDEN", message: "Só o dono do clube pode fazer isso." });
  return v;
}
async function membrosDe(clubeId: number) {
  return getDb().query.clubeMembros.findMany({ where: eq(clubeMembros.clubeId, clubeId) });
}
// quem sai: se era o dono, o membro com mais troféus vira o dono; o último a sair fecha o clube
async function tirar(usuarioId: number, clubeId: number) {
  const db = getDb();
  const antes = await db.query.clubeMembros.findFirst({ where: eq(clubeMembros.usuarioId, usuarioId) });
  await db.delete(clubeMembros).where(and(eq(clubeMembros.usuarioId, usuarioId), eq(clubeMembros.clubeId, clubeId)));
  const resto = await membrosDe(clubeId);
  if (!resto.length) {
    await db.delete(clubeConvites).where(eq(clubeConvites.clubeId, clubeId));
    await db.delete(clubes).where(eq(clubes.id, clubeId));
    return { fechou: true };
  }
  if (antes?.papel === "dono" && !resto.some((m) => m.papel === "dono")) {
    const ids = resto.map((m) => m.usuarioId);
    const est = await db.query.estatisticas.findMany({ where: inArray(estatisticas.usuarioId, ids) });
    const v = new Map<number, number>(est.map((e) => [e.usuarioId, e.vitorias] as [number, number]));
    const novo = [...resto].sort((a, b) => (v.get(b.usuarioId) ?? 0) - (v.get(a.usuarioId) ?? 0) || a.entrouEm.getTime() - b.entrouEm.getTime())[0];
    await db.update(clubeMembros).set({ papel: "dono" }).where(eq(clubeMembros.usuarioId, novo.usuarioId));
    await db.update(clubes).set({ donoId: novo.usuarioId }).where(eq(clubes.id, clubeId));
  }
  return { fechou: false };
}
async function entrarNo(usuarioId: number, c: Clube) {
  const db = getDb();
  if ((await membrosDe(c.id)).length >= MAX_MEMBROS) throw new TRPCError({ code: "CONFLICT", message: `Clube cheio (${MAX_MEMBROS}).` });
  try {
    await db.insert(clubeMembros).values({ usuarioId, clubeId: c.id, papel: "membro" });
  } catch (e) {
    if (ehDuplicado(e)) throw new TRPCError({ code: "CONFLICT", message: "Você já está num clube: saia dele antes." });
    throw e;
  }
  await db.update(clubeConvites).set({ estado: "aceito" }).where(and(eq(clubeConvites.clubeId, c.id), eq(clubeConvites.paraId, usuarioId), eq(clubeConvites.estado, "pendente")));
}

export const clubeRouter = createRouter({
  // ---------- a lista (busca pelo nome), dos que têm mais troféus para os que têm menos ----------
  listar: autenticado
    .input(z.object({ busca: z.string().max(40).optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const b = limpa(input?.busca ?? "", 24);
      const lista = await db.select().from(clubes).where(b ? like(clubes.nome, `%${semCuringa(b)}%`) : undefined).limit(300);
      const p = await placar();
      return lista
        .sort((x, y) => (p.por.get(y.id)?.trofeus ?? 0) - (p.por.get(x.id)?.trofeus ?? 0) || x.id - y.id)
        .slice(0, 60)
        .map((c) => resumo(c, p));
    }),

  // ---------- o meu clube (ou nada) ----------
  meu: autenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    const v = await meuVinculo(c.usuario.id);
    if (!v) return null;
    const cl = await getDb().query.clubes.findFirst({ where: eq(clubes.id, v.clubeId) });
    if (!cl) return null;
    return resumo(cl, await placar());
  }),

  // ---------- a página do clube, com os membros ----------
  ver: autenticado.input(z.object({ id: idClube })).query(async ({ ctx, input }) => {
    const c = ctx as unknown as CtxAutenticado;
    const db = getDb();
    const cl = await db.query.clubes.findFirst({ where: eq(clubes.id, input.id) });
    if (!cl) throw new TRPCError({ code: "NOT_FOUND", message: "Clube não encontrado." });
    const rows = await db
      .select({ u: usuarios, papel: clubeMembros.papel, entrouEm: clubeMembros.entrouEm, vitorias: estatisticas.vitorias })
      .from(clubeMembros)
      .innerJoin(usuarios, eq(usuarios.id, clubeMembros.usuarioId))
      .leftJoin(estatisticas, eq(estatisticas.usuarioId, clubeMembros.usuarioId))
      .where(eq(clubeMembros.clubeId, cl.id));
    const lista = rows
      .map((r) => ({
        id: formatarIdPublico(Number(r.u.idPublico)),
        nome: r.u.nomeExibicao,
        pais: null as string | null,
        papel: r.papel,
        trofeus: r.vitorias ?? 0,
        tampa: r.u.tampa && TAMPA_RE.test(r.u.tampa) ? r.u.tampa : null,
        eu: r.u.id === c.usuario.id,
        desde: r.entrouEm.getTime(),
      }))
      .sort((a, b) => (a.papel === "dono" ? -1 : b.papel === "dono" ? 1 : b.trofeus - a.trofeus || a.desde - b.desde));
    const eu = lista.find((m) => m.eu);
    const dono = lista.find((m) => m.papel === "dono");
    const meu = await meuVinculo(c.usuario.id);
    return {
      ...resumo(cl, await placar(), dono?.nome),
      lista,
      souMembro: !!eu,
      souDono: eu?.papel === "dono",
      eu: { trofeus: await vitoriasDe(c.usuario.id), clubeId: meu ? String(meu.clubeId) : null },
    };
  }),

  // ---------- criar (quem não está em clube; o nome é único) ----------
  criar: autenticado
    .input(
      z.object({
        nome: z.string().max(40),
        descricao: campos.descricao,
        pais: campos.pais,
        tipo: campos.tipo,
        trofeuMinimo: campos.trofeuMinimo,
        escudo: campos.escudo.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      await exigeLimite(`clube-criar:${c.usuario.id}`, 5, 24 * 60 * 60 * 1000, "Muitos clubes criados hoje. Tente amanhã.");
      const db = getDb();
      const nome = limpa(input.nome, 24), chave = chaveNome(nome);
      if (nome.length < 3 || chave.length < 2) throw new TRPCError({ code: "BAD_REQUEST", message: "O nome precisa de 3 letras ou mais." });
      if (await meuVinculo(c.usuario.id)) throw new TRPCError({ code: "CONFLICT", message: "Saia do seu clube antes de criar outro." });
      if (await db.query.clubes.findFirst({ where: eq(clubes.nomeChave, chave) })) throw new TRPCError({ code: "CONFLICT", message: "Já existe um clube com esse nome." });
      try {
        await db.insert(clubes).values({
          nome, nomeChave: chave, descricao: input.descricao, pais: input.pais, tipo: input.tipo,
          trofeuMinimo: input.trofeuMinimo, escudo: input.escudo ?? ESCUDO_PADRAO, donoId: c.usuario.id,
        });
      } catch (e) {
        if (ehDuplicado(e)) throw new TRPCError({ code: "CONFLICT", message: "Já existe um clube com esse nome." });
        throw e;
      }
      const novo = await db.query.clubes.findFirst({ where: eq(clubes.nomeChave, chave) });
      if (!novo) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não deu para criar o clube." });
      try {
        await db.insert(clubeMembros).values({ usuarioId: c.usuario.id, clubeId: novo.id, papel: "dono" });
      } catch (e) {                                        // (entrou em outro clube no mesmo instante: desfaz)
        await db.delete(clubes).where(eq(clubes.id, novo.id));
        if (ehDuplicado(e)) throw new TRPCError({ code: "CONFLICT", message: "Saia do seu clube antes de criar outro." });
        throw e;
      }
      return { id: String(novo.id) };
    }),

  // ---------- editar (o dono): descrição, país, tipo, troféu mínimo e escudo ----------
  editar: autenticado
    .input(
      z.object({
        id: idClube,
        descricao: campos.descricao.optional(),
        pais: campos.pais.optional(),
        tipo: campos.tipo.optional(),
        trofeuMinimo: campos.trofeuMinimo.optional(),
        escudo: campos.escudo.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      const v = await exigeDono(c.usuario.id);
      if (v.clubeId !== input.id) throw new TRPCError({ code: "FORBIDDEN", message: "Só o dono do clube pode fazer isso." });
      const { id, ...mud } = input;
      const set = Object.fromEntries(Object.entries(mud).filter(([, x]) => x !== undefined));
      if (Object.keys(set).length) await getDb().update(clubes).set(set).where(eq(clubes.id, id));
      return { ok: true };
    }),

  // ---------- entrar (público com troféus suficientes, ou com convite) ----------
  entrar: autenticado.input(z.object({ id: idClube })).mutation(async ({ ctx, input }) => {
    const c = ctx as unknown as CtxAutenticado;
    await exigeLimite(`clube-entrar:${c.usuario.id}`, 20, 60 * 60 * 1000, "Muitas tentativas. Tente mais tarde.");
    const db = getDb();
    const cl = await db.query.clubes.findFirst({ where: eq(clubes.id, input.id) });
    if (!cl) throw new TRPCError({ code: "NOT_FOUND", message: "Clube não encontrado." });
    const convite = await db.query.clubeConvites.findFirst({
      where: and(eq(clubeConvites.clubeId, cl.id), eq(clubeConvites.paraId, c.usuario.id), eq(clubeConvites.estado, "pendente")),
    });
    if (!convite) {
      if (cl.tipo === "convite") throw new TRPCError({ code: "FORBIDDEN", message: "Esse clube é só com convite." });
      const v = await vitoriasDe(c.usuario.id);
      if (v < cl.trofeuMinimo) throw new TRPCError({ code: "FORBIDDEN", message: `Precisa de ${cl.trofeuMinimo} troféus (você tem ${v}).` });
    }
    await entrarNo(c.usuario.id, cl);
    return { ok: true };
  }),

  // ---------- sair ----------
  sair: autenticado.mutation(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    const v = await meuVinculo(c.usuario.id);
    if (!v) return { ok: true, fechou: false };
    const r = await tirar(c.usuario.id, v.clubeId);
    return { ok: true, ...r };
  }),

  // ---------- convidar (qualquer membro) pelo ID público ou pelo usuário ----------
  convidar: autenticado.input(z.object({ termo: z.string().trim().min(1).max(40) })).mutation(async ({ ctx, input }) => {
    const c = ctx as unknown as CtxAutenticado;
    await exigeLimite(`clube-convite:${c.usuario.id}`, 30, 60 * 60 * 1000, "Muitos convites seguidos. Tente mais tarde.");
    const db = getDb();
    const v = await meuVinculo(c.usuario.id);
    if (!v) throw new TRPCError({ code: "FORBIDDEN", message: "Entre num clube para convidar." });
    const alvo = await acharJogador(input.termo);
    if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
    if (alvo.id === c.usuario.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Você já está no clube." });
    const bl = await db.query.bloqueios.findFirst({
      where: or(and(eq(bloqueios.usuarioId, alvo.id), eq(bloqueios.bloqueadoId, c.usuario.id)), and(eq(bloqueios.usuarioId, c.usuario.id), eq(bloqueios.bloqueadoId, alvo.id))),
    });
    if (bl) throw new TRPCError({ code: "FORBIDDEN", message: "Não foi possível convidar esse jogador." });
    const dele = await meuVinculo(alvo.id);
    if (dele?.clubeId === v.clubeId) throw new TRPCError({ code: "CONFLICT", message: "Esse jogador já está no clube." });
    if ((await membrosDe(v.clubeId)).length >= MAX_MEMBROS) throw new TRPCError({ code: "CONFLICT", message: `Clube cheio (${MAX_MEMBROS}).` });
    await db
      .insert(clubeConvites)
      .values({ clubeId: v.clubeId, paraId: alvo.id, deId: c.usuario.id, estado: "pendente" })
      .onDuplicateKeyUpdate({ set: { estado: "pendente", deId: c.usuario.id, criadoEm: new Date() } });
    return { ok: true, nome: alvo.nomeExibicao };
  }),

  // ---------- os meus convites (pendentes) ----------
  convites: autenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    const db = getDb();
    const lista = await db.query.clubeConvites.findMany({
      where: and(eq(clubeConvites.paraId, c.usuario.id), eq(clubeConvites.estado, "pendente")),
      orderBy: [desc(clubeConvites.criadoEm)],
      limit: 20,
    });
    if (!lista.length) return [];
    const p = await placar();
    const out: { id: string; clube: ReturnType<typeof resumo>; de: { nome: string } }[] = [];
    for (const cv of lista) {
      const cl = await db.query.clubes.findFirst({ where: eq(clubes.id, cv.clubeId) });
      if (!cl) continue;
      const de = await db.query.usuarios.findFirst({ where: eq(usuarios.id, cv.deId) });
      out.push({ id: String(cv.id), clube: resumo(cl, p), de: { nome: de?.nomeExibicao ?? "um membro" } });
    }
    return out;
  }),

  // ---------- aceitar ou recusar ----------
  responder: autenticado
    .input(z.object({ id: z.union([z.string().regex(/^\d{1,12}$/), z.number().int().positive()]).transform(Number), aceitar: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      const db = getDb();
      const cv = await db.query.clubeConvites.findFirst({
        where: and(eq(clubeConvites.id, input.id), eq(clubeConvites.paraId, c.usuario.id), eq(clubeConvites.estado, "pendente")),
      });
      if (!cv) throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado." });
      if (!input.aceitar) {
        await db.update(clubeConvites).set({ estado: "recusado" }).where(eq(clubeConvites.id, cv.id));
        return { ok: true };
      }
      const cl = await db.query.clubes.findFirst({ where: eq(clubes.id, cv.clubeId) });
      if (!cl) throw new TRPCError({ code: "NOT_FOUND", message: "Esse clube não existe mais." });
      await entrarNo(c.usuario.id, cl);
      return { ok: true, id: String(cl.id) };
    }),

  // ---------- o dono: tirar alguém ou passar a dona ----------
  expulsar: autenticado.input(z.object({ id: z.string().max(12) })).mutation(async ({ ctx, input }) => {
    const c = ctx as unknown as CtxAutenticado;
    const v = await exigeDono(c.usuario.id);
    const alvo = await usuarioPorIdPublico(input.id);
    if (!alvo || alvo.id === c.usuario.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Jogador inválido." });
    const dele = await meuVinculo(alvo.id);
    if (!dele || dele.clubeId !== v.clubeId) throw new TRPCError({ code: "NOT_FOUND", message: "Esse jogador não está no clube." });
    await tirar(alvo.id, v.clubeId);
    return { ok: true };
  }),

  passarDono: autenticado.input(z.object({ id: z.string().max(12) })).mutation(async ({ ctx, input }) => {
    const c = ctx as unknown as CtxAutenticado;
    const v = await exigeDono(c.usuario.id);
    const alvo = await usuarioPorIdPublico(input.id);
    if (!alvo || alvo.id === c.usuario.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Jogador inválido." });
    const dele = await meuVinculo(alvo.id);
    if (!dele || dele.clubeId !== v.clubeId) throw new TRPCError({ code: "NOT_FOUND", message: "Esse jogador não está no clube." });
    const db = getDb();
    await db.update(clubeMembros).set({ papel: "dono" }).where(eq(clubeMembros.usuarioId, alvo.id));
    await db.update(clubeMembros).set({ papel: "membro" }).where(eq(clubeMembros.usuarioId, c.usuario.id));
    await db.update(clubes).set({ donoId: alvo.id }).where(eq(clubes.id, v.clubeId));
    return { ok: true };
  }),

  // ---------- a tampinha personalizada da conta (os membros veem; outro aparelho usa a mesma) ----------
  salvarTampa: autenticado.input(z.object({ codigo: z.string().regex(TAMPA_RE) })).mutation(async ({ ctx, input }) => {
    const c = ctx as unknown as CtxAutenticado;
    await exigeLimite(`tampa:${c.usuario.id}`, 60, 60 * 60 * 1000, "Muitas trocas seguidas. Tente mais tarde.");
    await getDb().update(usuarios).set({ tampa: input.codigo }).where(eq(usuarios.id, c.usuario.id));
    return { ok: true };
  }),
});
