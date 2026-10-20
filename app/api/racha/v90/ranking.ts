// ============================================================================
// RACHA v90 — O RANKING DA TEMPORADA (as regras em contracts/v90.ts)
//
//   · registraPartidaRanking: chamada pelo jogo.encerrarPartida depois que a partida online valeu (o selo do servidor das
//     salas já conferido pela assinatura). Só a partida que o SERVIDOR simulou entra (h:1 no selo); os gols, as
//     assistências e o Craque do Jogo são os que o motor contou. Cada (partida, conta) entra uma vez só.
//   · ranking.top: o TOP 20 de uma categoria (gols, assistências, pontos ranqueados, Craque do Jogo) da temporada, com a
//     tampinha de cada um e a posição de quem está logado (mesmo fora do TOP 20). Temporada fechada: a classificação final
//     congelada. Cache curto no servidor (o celular não fica consultando o banco à toa).
//   · ranking.temporadas / ranking.historico: as temporadas (as anteriores também) e as melhores colocações de uma conta.
//   · RACHA CONTROL: abrir uma temporada, fechar (congela a classificação, o recomeço parcial da ranqueada — uma vez) e,
//     DEPOIS de conferir o fechamento, entregar as recompensas do TOP 3 (uma vez: a chave da tabela impede repetir).
// Nada aqui muda a física, a partida, as moedas, as gemas ou os itens que a conta já tem.
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, isNull, ne, or, sql, lt } from "drizzle-orm";
import { createRouter, publicQuery } from "../../middleware";
import { getDb } from "../../queries/connection";
import { usuarios, ranqueada, ranqueadaEventos, temporadasRanking, rankingSazonal, rankingPartidas, rankingFinal, recompensasRanking } from "@db/schema";
import { sessaoDaRequisicao, adminAutenticado, exigePermissao, auditar, ipDaRequisicao, type CtxAdmin } from "../guard";
import { formatarIdPublico } from "@contracts/racha";
import { CATALOGO } from "@contracts/v88";
import { CATEGORIAS, TOP, lanceDoSelo, podeFechar, premioDe, recomecoParcial, tituloComTemporada, type Categoria, type EstadoTemporada } from "@contracts/v90";
import { infoPatente } from "../ranqueada";
import { entregarItens } from "../economia";
import { usuarioPorPub } from "../v88/comum";

type Db = ReturnType<typeof getDb>;
const ehDup = (e: unknown) => /duplicate|ER_DUP_ENTRY|1062/i.test(String((e as Error)?.message ?? e));
const ms = (d: Date | number | null | undefined) => (d == null ? 0 : typeof d === "number" ? d : d.getTime());

// ---------------------------------------------------------------- as temporadas
export type Temporada = { id: string; nome: string; inicio: number; fim: number; estado: EstadoTemporada; fechadaEm: number | null; recompensasEm: number | null };
const paraTemporada = (t: typeof temporadasRanking.$inferSelect): Temporada => ({
  id: t.id, nome: t.nome, inicio: ms(t.inicio), fim: ms(t.fim), estado: t.estado as EstadoTemporada,
  fechadaEm: t.fechadaEm ? ms(t.fechadaEm) : null, recompensasEm: t.recompensasEm ? ms(t.recompensasEm) : null,
});

// a T1 nasce das datas do catálogo (a mesma do Passe RACHA), na primeira vez que alguém precisa dela
let garantida = false;
export async function garanteTemporadas(db: Db = getDb()) {
  if (garantida) return;
  const t = CATALOGO.temporada;
  const nome = String(t.nome || t.id).replace(/^TEMPORADA\s+\d+\s*·\s*/i, "").slice(0, 60);
  try {
    await db.insert(temporadasRanking).values({ id: t.id, nome, inicio: new Date(t.inicio), fim: new Date(t.fim) }).onDuplicateKeyUpdate({ set: { id: t.id } });
  } catch (e) { if (!ehDup(e)) throw e; }
  garantida = true;
}
export async function listaTemporadas(): Promise<Temporada[]> {
  await garanteTemporadas();
  const l = await getDb().select().from(temporadasRanking).orderBy(desc(temporadasRanking.inicio));
  return l.map(paraTemporada);
}
// a temporada em que uma partida que acabou agora entra (null = nenhuma aberta: a partida não conta para o ranking)
export async function temporadaDoMomento(agora = Date.now()): Promise<Temporada | null> {
  const l = await listaTemporadas();
  return l.find((t) => t.estado === "ativa" && agora >= t.inicio && agora < t.fim) ?? null;
}
// a que a tela mostra quando não diz qual: a vigente; senão, a última que existiu
async function temporadaPadrao(): Promise<Temporada | null> {
  const l = await listaTemporadas();
  const agora = Date.now();
  return l.find((t) => t.estado === "ativa" && agora >= t.inicio && agora < t.fim) ?? l.find((t) => t.inicio <= agora) ?? l[0] ?? null;
}

// ---------------------------------------------------------------- o fim de uma partida que valeu
export type RegistroRanking = { temporada: string; gols: number; assistencias: number; craque: boolean; duplicada: boolean } | null;
export async function registraPartidaRanking(usuarioId: number, selo: unknown, matchId: string): Promise<RegistroRanking> {
  const lance = lanceDoSelo(selo);
  if (!lance) return null; // não foi o servidor que simulou (ou o selo não diz): não entra no ranking
  const t = await temporadaDoMomento();
  if (!t) return null;
  const db = getDb();
  return db.transaction(async (tx) => {
    try {
      await tx.insert(rankingPartidas).values({ pid: lance.pid, usuarioId, temporada: t.id, gols: lance.gols, assistencias: lance.assistencias, craque: lance.craque, matchId });
    } catch (e) {
      if (ehDup(e)) return { temporada: t.id, gols: 0, assistencias: 0, craque: false, duplicada: true }; // essa partida já contou para essa conta
      throw e;
    }
    await tx.insert(rankingSazonal).values({ temporada: t.id, usuarioId }).onDuplicateKeyUpdate({ set: { usuarioId } });
    const [row] = await tx.select().from(rankingSazonal).where(and(eq(rankingSazonal.temporada, t.id), eq(rankingSazonal.usuarioId, usuarioId))).for("update");
    const agora = new Date();
    await tx
      .update(rankingSazonal)
      .set({
        gols: row.gols + lance.gols,
        assistencias: row.assistencias + lance.assistencias,
        craques: row.craques + (lance.craque ? 1 : 0),
        partidas: row.partidas + 1,
        // quando chegou no valor de agora (o desempate: quem chegou antes fica na frente)
        golsEm: lance.gols > 0 ? agora : row.golsEm,
        assistenciasEm: lance.assistencias > 0 ? agora : row.assistenciasEm,
        craquesEm: lance.craque ? agora : row.craquesEm,
        atualizadoEm: agora,
      })
      .where(and(eq(rankingSazonal.temporada, t.id), eq(rankingSazonal.usuarioId, usuarioId)));
    invalidaCache(t.id);
    return { temporada: t.id, gols: lance.gols, assistencias: lance.assistencias, craque: lance.craque, duplicada: false };
  });
}

// ---------------------------------------------------------------- a classificação ao vivo
// quem aparece: conta ativa (não banida, não excluída) e com o perfil público
const visivel = () => and(eq(usuarios.perfilPublico, true), ne(usuarios.estado, "banido"), isNull(usuarios.excluidoEm));
const colunaSaz = (cat: Exclude<Categoria, "pontos">) =>
  cat === "gols" ? { v: rankingSazonal.gols, em: rankingSazonal.golsEm } : cat === "assistencias" ? { v: rankingSazonal.assistencias, em: rankingSazonal.assistenciasEm } : { v: rankingSazonal.craques, em: rankingSazonal.craquesEm };

type Bruta = { usuarioId: number; idPublico: number; nome: string; nivel: number; tampa: string | null; valor: number; em: number; pts: number };

async function ordemViva(cat: Categoria, temporada: string, limite: number | null): Promise<Bruta[]> {
  const db = getDb();
  if (cat === "pontos") {
    const q = db
      .select({ usuarioId: usuarios.id, idPublico: usuarios.idPublico, nome: usuarios.nomeExibicao, nivel: usuarios.nivel, tampa: usuarios.tampa, valor: ranqueada.pts, em: ranqueada.atualizadoEm, pts: ranqueada.pts })
      .from(ranqueada)
      .innerJoin(usuarios, eq(usuarios.id, ranqueada.usuarioId))
      .where(and(visivel(), gt(ranqueada.pts, 0)))
      .orderBy(desc(ranqueada.pts), asc(ranqueada.atualizadoEm), asc(usuarios.id));
    const l = limite ? await q.limit(limite) : await q;
    return l.map((x) => ({ ...x, idPublico: Number(x.idPublico), valor: Number(x.valor), pts: Number(x.pts), em: ms(x.em) }));
  }
  const c = colunaSaz(cat);
  const q = db
    .select({ usuarioId: usuarios.id, idPublico: usuarios.idPublico, nome: usuarios.nomeExibicao, nivel: usuarios.nivel, tampa: usuarios.tampa, valor: c.v, em: c.em, pts: ranqueada.pts })
    .from(rankingSazonal)
    .innerJoin(usuarios, eq(usuarios.id, rankingSazonal.usuarioId))
    .leftJoin(ranqueada, eq(ranqueada.usuarioId, rankingSazonal.usuarioId))
    .where(and(eq(rankingSazonal.temporada, temporada), visivel(), gt(c.v, 0)))
    .orderBy(desc(c.v), asc(c.em), asc(usuarios.id));
  const l = limite ? await q.limit(limite) : await q;
  return l.map((x) => ({ ...x, idPublico: Number(x.idPublico), valor: Number(x.valor), pts: Number(x.pts ?? 0), em: ms(x.em) }));
}

// a posição de uma conta ao vivo (1 = primeiro), sem trazer a lista: quantos estão na frente pela mesma ordem
async function posicaoViva(cat: Categoria, temporada: string, usuarioId: number): Promise<{ posicao: number | null; valor: number }> {
  const db = getDb();
  const u = await db.query.usuarios.findFirst({ where: eq(usuarios.id, usuarioId) });
  const entra = !!u && u.perfilPublico && u.estado !== "banido" && !u.excluidoEm;
  if (cat === "pontos") {
    const r = await db.query.ranqueada.findFirst({ where: eq(ranqueada.usuarioId, usuarioId) });
    const valor = r?.pts ?? 0;
    if (!r || !entra || valor <= 0) return { posicao: null, valor };
    const em = r.atualizadoEm;
    const [n] = await db
      .select({ n: sql<number>`count(*)` })
      .from(ranqueada)
      .innerJoin(usuarios, eq(usuarios.id, ranqueada.usuarioId))
      .where(and(visivel(), gt(ranqueada.pts, 0), or(gt(ranqueada.pts, valor), and(eq(ranqueada.pts, valor), lt(ranqueada.atualizadoEm, em)), and(eq(ranqueada.pts, valor), eq(ranqueada.atualizadoEm, em), lt(usuarios.id, usuarioId)))));
    return { posicao: Number(n?.n ?? 0) + 1, valor };
  }
  const c = colunaSaz(cat);
  const r = await db.query.rankingSazonal.findFirst({ where: and(eq(rankingSazonal.temporada, temporada), eq(rankingSazonal.usuarioId, usuarioId)) });
  const valor = r ? Number(cat === "gols" ? r.gols : cat === "assistencias" ? r.assistencias : r.craques) : 0;
  if (!r || !entra || valor <= 0) return { posicao: null, valor };
  const em = cat === "gols" ? r.golsEm : cat === "assistencias" ? r.assistenciasEm : r.craquesEm;
  const [n] = await db
    .select({ n: sql<number>`count(*)` })
    .from(rankingSazonal)
    .innerJoin(usuarios, eq(usuarios.id, rankingSazonal.usuarioId))
    .where(and(eq(rankingSazonal.temporada, temporada), visivel(), gt(c.v, 0), or(gt(c.v, valor), and(eq(c.v, valor), lt(c.em, em)), and(eq(c.v, valor), eq(c.em, em), lt(usuarios.id, usuarioId)))));
  return { posicao: Number(n?.n ?? 0) + 1, valor };
}

// ---------------------------------------------------------------- o que a tela recebe
export type LinhaRanking = { posicao: number; idPublico: string; nome: string; nivel: number; tampa: string | null; valor: number; patente: ReturnType<typeof infoPatente> };
const paraLinha = (x: Bruta, i: number): LinhaRanking => ({
  posicao: i + 1, idPublico: formatarIdPublico(x.idPublico), nome: x.nome, nivel: x.nivel, tampa: x.tampa ?? null, valor: x.valor, patente: infoPatente(x.pts),
});

// o cache do TOP 20 (o mesmo para todo mundo): 30 s, e limpo quando uma partida da temporada conta
const CACHE_MS = 30_000;
const cache = new Map<string, { em: number; lista: LinhaRanking[] }>();
function invalidaCache(temporada?: string) {
  if (!temporada) return cache.clear();
  for (const k of [...cache.keys()]) if (k.startsWith(temporada + "|") || k.endsWith("|pontos")) cache.delete(k);
}
export const _limpaCacheRanking = () => cache.clear(); // (os testes)

async function topVivo(cat: Categoria, temporada: string): Promise<LinhaRanking[]> {
  const k = temporada + "|" + cat, c = cache.get(k);
  if (c && Date.now() - c.em < CACHE_MS) return c.lista;
  const lista = (await ordemViva(cat, temporada, TOP)).map(paraLinha);
  cache.set(k, { em: Date.now(), lista });
  return lista;
}

async function topFinal(cat: Categoria, temporada: string, usuarioId: number | null) {
  const db = getDb();
  const l = await db
    .select({ posicao: rankingFinal.posicao, valor: rankingFinal.valor, nome: rankingFinal.nome, tampa: rankingFinal.tampa, idPublico: usuarios.idPublico, nivel: usuarios.nivel, pts: ranqueada.pts })
    .from(rankingFinal)
    .innerJoin(usuarios, eq(usuarios.id, rankingFinal.usuarioId))
    .leftJoin(ranqueada, eq(ranqueada.usuarioId, rankingFinal.usuarioId))
    .where(and(eq(rankingFinal.temporada, temporada), eq(rankingFinal.categoria, cat), sql`${rankingFinal.posicao} <= ${TOP}`))
    .orderBy(asc(rankingFinal.posicao));
  const lista: LinhaRanking[] = l.map((x) => ({ posicao: x.posicao, idPublico: formatarIdPublico(Number(x.idPublico)), nome: x.nome, nivel: x.nivel, tampa: x.tampa ?? null, valor: x.valor, patente: infoPatente(Number(x.pts ?? 0)) }));
  let eu: { posicao: number | null; valor: number } | null = null;
  if (usuarioId) {
    const r = await db.query.rankingFinal.findFirst({ where: and(eq(rankingFinal.temporada, temporada), eq(rankingFinal.categoria, cat), eq(rankingFinal.usuarioId, usuarioId)) });
    eu = r ? { posicao: r.posicao, valor: r.valor } : { posicao: null, valor: 0 };
  }
  return { lista, eu };
}

// ---------------------------------------------------------------- o fechamento (RACHA CONTROL)
// Congela a classificação de cada categoria (todas as posições) e faz o recomeço parcial da ranqueada. Pode rodar de novo
// sem estragar nada: o que já foi congelado fica (a chave da tabela) e o recomeço de cada conta acontece uma vez (o evento
// "temporada:<id>" na ranqueada_eventos, que já não deixa repetir a mesma referência).
export async function fechaTemporada(id: string, agora = Date.now()): Promise<{ congeladas: Record<Categoria, number>; recomecos: number }> {
  const db = getDb();
  await garanteTemporadas(db);
  const t0 = await db.query.temporadasRanking.findFirst({ where: eq(temporadasRanking.id, id) });
  if (!t0) throw new TRPCError({ code: "NOT_FOUND", message: "Temporada não encontrada." });
  const t = paraTemporada(t0);
  const motivo = podeFechar(t, agora);
  if (motivo) throw new TRPCError({ code: "BAD_REQUEST", message: motivo });
  await db.update(temporadasRanking).set({ estado: "fechando" }).where(eq(temporadasRanking.id, id));
  const congeladas = {} as Record<Categoria, number>;
  for (const cat of CATEGORIAS) {
    const ja = await db.select({ n: sql<number>`count(*)` }).from(rankingFinal).where(and(eq(rankingFinal.temporada, id), eq(rankingFinal.categoria, cat)));
    if (Number(ja[0]?.n ?? 0) > 0) { congeladas[cat] = Number(ja[0].n); continue; } // (essa já foi congelada numa rodada anterior)
    const ordem = await ordemViva(cat, id, null);
    for (let i = 0; i < ordem.length; i++) {
      const x = ordem[i];
      try {
        await db.insert(rankingFinal).values({ temporada: id, categoria: cat, usuarioId: x.usuarioId, posicao: i + 1, valor: x.valor, nome: x.nome.slice(0, 40), tampa: x.tampa });
      } catch (e) { if (!ehDup(e)) throw e; }
    }
    congeladas[cat] = ordem.length;
  }
  // o recomeço parcial da ranqueada (depois de congelar os pontos): a metade, uma vez por conta e por temporada
  let recomecos = 0;
  const contas = await db.select({ usuarioId: ranqueada.usuarioId }).from(ranqueada).where(gt(ranqueada.pts, 0));
  for (const { usuarioId } of contas) {
    const feito = await db.transaction(async (tx) => {
      const [row] = await tx.select().from(ranqueada).where(eq(ranqueada.usuarioId, usuarioId)).for("update");
      if (!row || row.pts <= 0) return false;
      const depois = recomecoParcial(row.pts);
      try {
        await tx.insert(ranqueadaEventos).values({ usuarioId, referencia: ("temporada:" + id).slice(0, 64), motivo: "temporada", antes: row.pts, delta: depois - row.pts, depois });
      } catch (e) { if (ehDup(e)) return false; throw e; }
      await tx.update(ranqueada).set({ pts: depois, seq: 0, atualizadoEm: new Date() }).where(eq(ranqueada.usuarioId, usuarioId));
      return true;
    });
    if (feito) recomecos++;
  }
  await db.update(temporadasRanking).set({ estado: "fechada", fechadaEm: new Date(agora) }).where(eq(temporadasRanking.id, id));
  invalidaCache();
  return { congeladas, recomecos };
}

// As recompensas do TOP 3 de cada categoria: só depois do fechamento, e uma vez (a chave da tabela).
export async function entregaRecompensas(id: string): Promise<{ entregues: number; ja: number }> {
  const db = getDb();
  const t0 = await db.query.temporadasRanking.findFirst({ where: eq(temporadasRanking.id, id) });
  if (!t0) throw new TRPCError({ code: "NOT_FOUND", message: "Temporada não encontrada." });
  if (t0.estado !== "fechada") throw new TRPCError({ code: "BAD_REQUEST", message: "Feche a temporada antes de entregar as recompensas." });
  let entregues = 0, ja = 0;
  for (const cat of CATEGORIAS) {
    const top3 = await db.select().from(rankingFinal).where(and(eq(rankingFinal.temporada, id), eq(rankingFinal.categoria, cat), sql`${rankingFinal.posicao} <= 3`)).orderBy(asc(rankingFinal.posicao));
    for (const x of top3) {
      const p = premioDe(cat, x.posicao); if (!p) continue;
      const itens = [p.tampinha, p.banner];
      const feito = await db.transaction(async (tx) => {
        try {
          await tx.insert(recompensasRanking).values({ temporada: id, categoria: cat, usuarioId: x.usuarioId, posicao: x.posicao, itens, titulo: tituloComTemporada(p, t0.nome).slice(0, 80) });
        } catch (e) { if (ehDup(e)) return false; throw e; }
        await entregarItens(x.usuarioId, itens, "ranking", ("ranking:" + id + ":" + cat + ":" + x.posicao).slice(0, 80), tx);
        return true;
      });
      if (feito) entregues++; else ja++;
    }
  }
  await db.update(temporadasRanking).set({ recompensasEm: new Date() }).where(and(eq(temporadasRanking.id, id), isNull(temporadasRanking.recompensasEm)));
  return { entregues, ja };
}

// ---------------------------------------------------------------- o histórico de uma conta (o perfil)
export async function historicoDe(usuarioId: number) {
  const db = getDb();
  const colocacoes = await db
    .select({ temporada: rankingFinal.temporada, categoria: rankingFinal.categoria, posicao: rankingFinal.posicao, valor: rankingFinal.valor, nomeTemp: temporadasRanking.nome })
    .from(rankingFinal)
    .innerJoin(temporadasRanking, eq(temporadasRanking.id, rankingFinal.temporada))
    .where(and(eq(rankingFinal.usuarioId, usuarioId), sql`${rankingFinal.posicao} <= ${TOP}`))
    .orderBy(asc(rankingFinal.posicao), desc(temporadasRanking.inicio))
    .limit(12);
  const premios = await db.select().from(recompensasRanking).where(eq(recompensasRanking.usuarioId, usuarioId)).orderBy(asc(recompensasRanking.posicao));
  const totais = await db
    .select({ gols: sql<number>`coalesce(sum(${rankingSazonal.gols}), 0)`, assistencias: sql<number>`coalesce(sum(${rankingSazonal.assistencias}), 0)`, craques: sql<number>`coalesce(sum(${rankingSazonal.craques}), 0)`, partidas: sql<number>`coalesce(sum(${rankingSazonal.partidas}), 0)` })
    .from(rankingSazonal)
    .where(eq(rankingSazonal.usuarioId, usuarioId));
  const t = totais[0] ?? { gols: 0, assistencias: 0, craques: 0, partidas: 0 };
  return {
    colocacoes: colocacoes.map((c) => ({ temporada: c.temporada, temporadaNome: c.nomeTemp, categoria: c.categoria as Categoria, posicao: c.posicao, valor: c.valor })),
    melhor: colocacoes.length ? Math.min(...colocacoes.map((c) => c.posicao)) : null,
    premios: premios.map((p) => ({ temporada: p.temporada, categoria: p.categoria as Categoria, posicao: p.posicao, itens: p.itens, titulo: p.titulo })),
    // os números validados pelo servidor (todas as temporadas): os de sempre continuam no estat.resumo
    validados: { gols: Number(t.gols), assistencias: Number(t.assistencias), craques: Number(t.craques), partidas: Number(t.partidas) },
  };
}

// ---------------------------------------------------------------- as rotas
const categoriaZ = z.enum(CATEGORIAS as unknown as [Categoria, ...Categoria[]]);

export const rankingRouter = createRouter({
  // as temporadas (a vigente primeiro); a tela mostra as anteriores no TEMPORADAS ANTERIORES
  temporadas: publicQuery.query(async () => {
    const l = await listaTemporadas(), agora = Date.now();
    return { lista: l, vigente: l.find((t) => t.estado === "ativa" && agora >= t.inicio && agora < t.fim)?.id ?? null, agora };
  }),

  // o TOP 20 de uma categoria e a minha posição (logado)
  top: publicQuery
    .input(z.object({ categoria: categoriaZ, temporada: z.string().regex(/^[A-Za-z0-9_-]{1,16}$/).optional() }))
    .query(async ({ ctx, input }) => {
      const t = input.temporada ? (await listaTemporadas()).find((x) => x.id === input.temporada) ?? null : await temporadaPadrao();
      if (!t) return { temporada: null, categoria: input.categoria, lista: [] as LinhaRanking[], eu: null, congelado: false };
      const s = await sessaoDaRequisicao((ctx as unknown as { req: Request }).req);
      const meuId = s ? s.usuario.id : null;
      if (t.estado === "fechada") {
        const f = await topFinal(input.categoria, t.id, meuId);
        return { temporada: t, categoria: input.categoria, lista: f.lista, eu: f.eu && s ? { ...f.eu, idPublico: formatarIdPublico(Number(s.usuario.idPublico)), nome: s.usuario.nomeExibicao } : null, congelado: true };
      }
      const lista = await topVivo(input.categoria, t.id);
      const eu = meuId && s ? { ...(await posicaoViva(input.categoria, t.id, meuId)), idPublico: formatarIdPublico(Number(s.usuario.idPublico)), nome: s.usuario.nomeExibicao } : null;
      return { temporada: t, categoria: input.categoria, lista, eu, congelado: false };
    }),

  // as melhores colocações e os prêmios de uma conta (o perfil público)
  historico: publicQuery.input(z.object({ idPublico: z.string().regex(/^\d{1,9}$/) })).query(async ({ input }) => {
    const u = await usuarioPorPub(input.idPublico);
    if (!u || u.estado === "banido" || u.excluidoEm) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
    return historicoDe(u.id);
  }),

  // ---- RACHA CONTROL
  abrirTemporada: adminAutenticado
    .input(z.object({ id: z.string().regex(/^T\d{1,3}$/), nome: z.string().trim().min(3).max(60), inicio: z.string().datetime(), fim: z.string().datetime() }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "gerenciar_eventos");
      const inicio = new Date(input.inicio), fim = new Date(input.fim);
      if (fim.getTime() <= inicio.getTime()) throw new TRPCError({ code: "BAD_REQUEST", message: "O fim precisa ser depois do começo." });
      const l = await listaTemporadas();
      if (l.some((t) => t.id === input.id)) throw new TRPCError({ code: "BAD_REQUEST", message: "Já existe essa temporada." });
      if (l.some((t) => t.estado !== "fechada" && inicio.getTime() < t.fim && fim.getTime() > t.inicio)) throw new TRPCError({ code: "BAD_REQUEST", message: "As datas cruzam com outra temporada que não foi fechada." });
      await getDb().insert(temporadasRanking).values({ id: input.id, nome: input.nome, inicio, fim });
      await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "temporada_abrir", detalhes: { ...input }, resultado: "ok", ip: ipDaRequisicao(c.req) });
      return { ok: true };
    }),
  fecharTemporada: adminAutenticado.input(z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,16}$/) })).mutation(async ({ ctx, input }) => {
    const c = ctx as unknown as CtxAdmin;
    exigePermissao(c, "gerenciar_eventos");
    const r = await fechaTemporada(input.id);
    await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "temporada_fechar", detalhes: { id: input.id, ...r }, resultado: "ok", ip: ipDaRequisicao(c.req) });
    return { ok: true, ...r };
  }),
  entregarRecompensas: adminAutenticado.input(z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,16}$/) })).mutation(async ({ ctx, input }) => {
    const c = ctx as unknown as CtxAdmin;
    exigePermissao(c, "gerenciar_eventos");
    exigePermissao(c, "distribuir_global");
    const r = await entregaRecompensas(input.id);
    await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "temporada_recompensas", detalhes: { id: input.id, ...r }, resultado: "ok", ip: ipDaRequisicao(c.req) });
    return { ok: true, ...r };
  }),
});

