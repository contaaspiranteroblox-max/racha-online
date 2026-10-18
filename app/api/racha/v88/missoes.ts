// ============================================================================
// RACHA v88 — as MISSÕES (diárias, semanais, da temporada e as especiais dos eventos). O progresso só anda pelo que o
// servidor conferiu: a partida válida (jogo.encerrarPartida, com o selo da sala na online), os gols do treino que contam
// (jogo.golTreino) — nunca por um número que o aparelho manda. COLETAR confere a missão do período certo, a meta e que
// ainda não foi coletada (uma vez: a marca e o prêmio na mesma transação).
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, isNull, lte, gt } from "drizzle-orm";
import { createRouter } from "../../middleware";
import { getDb } from "../../queries/connection";
import { missoesProgresso, eventos } from "@db/schema";
import { autenticado, exigeLimite } from "../guard";
import { contaDe, entregaAnexos, type Conn } from "./comum";
import {
  missoesDoDia, missoesDaSemana, missoesDaTemporada, missoesDoEvento, quantoConta, anexosDoPremio, periodoDia, periodoSemana, periodoTemporada,
  temporadaAtiva, segundaUtc, CATALOGO, type EventoPartida, type Missao,
} from "@contracts/v88";

type Grupo = { grupo: "diarias" | "semanais" | "temporada" | "especiais"; periodo: string; fim: Date; missoes: Missao[]; evento?: { slug: string; nome: string } };

export async function gruposAtivos(agora: Date = new Date(), db: Conn = getDb()): Promise<Grupo[]> {
  const amanha = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() + 1));
  const proxSeg = new Date(Date.parse(segundaUtc(agora) + "T00:00:00Z") + 7 * 864e5);
  const g: Grupo[] = [
    { grupo: "diarias", periodo: periodoDia(agora), fim: amanha, missoes: missoesDoDia(agora) },
    { grupo: "semanais", periodo: periodoSemana(agora), fim: proxSeg, missoes: missoesDaSemana(agora) },
  ];
  if (temporadaAtiva(agora)) g.push({ grupo: "temporada", periodo: periodoTemporada(), fim: new Date(Date.parse(CATALOGO.temporada.fim)), missoes: missoesDaTemporada() });
  const evs = await db.query.eventos.findMany({ where: and(eq(eventos.ativo, true), lte(eventos.inicio, agora), gt(eventos.fim, agora)), limit: 20 });
  for (const ev of evs) {
    const l = missoesDoEvento({ slug: ev.slug, config: ev.config });
    if (l.length) g.push({ grupo: "especiais", periodo: "E:" + ev.slug, fim: ev.fim, missoes: l, evento: { slug: ev.slug, nome: ev.nome } });
  }
  return g;
}

// o que uma partida (ou um gol de treino) conferida conta nas missões ativas; devolve as que completaram agora
export async function contaMissoes(usuarioId: number, ev: EventoPartida, agora: Date = new Date(), db: Conn = getDb()): Promise<{ id: string; nome: string }[]> {
  const feitas: { id: string; nome: string }[] = [];
  for (const g of await gruposAtivos(agora, db)) {
    for (const m of g.missoes) {
      const q = quantoConta(m, ev);
      if (!q) continue;
      const row = await db.query.missoesProgresso.findFirst({ where: and(eq(missoesProgresso.usuarioId, usuarioId), eq(missoesProgresso.missao, m.id), eq(missoesProgresso.periodo, g.periodo)) });
      if (!row) {
        try {
          await db.insert(missoesProgresso).values({ usuarioId, missao: m.id, periodo: g.periodo, progresso: Math.min(m.meta, q), meta: m.meta });
          if (q >= m.meta) feitas.push({ id: m.id, nome: m.nome });
        } catch (e) {
          if (!/duplicate|ER_DUP_ENTRY|1062/i.test(String((e as Error)?.message ?? e))) throw e;
        }
        continue;
      }
      if (row.progresso >= row.meta) continue;
      const novo = Math.min(row.meta, row.progresso + q);
      await db.update(missoesProgresso).set({ progresso: novo, atualizadoEm: new Date() }).where(eq(missoesProgresso.id, row.id));
      if (novo >= row.meta) feitas.push({ id: m.id, nome: m.nome });
    }
  }
  return feitas;
}

export const missoesRouter = createRouter({
  listar: autenticado.query(async ({ ctx }) => {
    const u = contaDe(ctx);
    const db = getDb();
    const out = [];
    for (const g of await gruposAtivos()) {
      const rows = await db.query.missoesProgresso.findMany({ where: and(eq(missoesProgresso.usuarioId, u.id), eq(missoesProgresso.periodo, g.periodo)) });
      out.push({
        grupo: g.grupo, periodo: g.periodo, fim: g.fim, evento: g.evento || null,
        missoes: g.missoes.map((m) => {
          const r = rows.find((x) => x.missao === m.id);
          return { id: m.id, nome: m.nome, tipo: m.tipo, meta: m.meta, progresso: r ? Math.min(r.progresso, m.meta) : 0, premio: m.premio, coletada: !!r?.coletadaEm, pronta: !!r && r.progresso >= m.meta && !r.coletadaEm };
        }),
      });
    }
    return out;
  }),

  coletar: autenticado.input(z.object({ missao: z.string().max(40), periodo: z.string().max(24) })).mutation(async ({ ctx, input }) => {
    const u = contaDe(ctx);
    await exigeLimite(`coleta:${u.id}`, 60, 60 * 1000, "Calma: muitas coletas seguidas.");
    const g = (await gruposAtivos()).find((x) => x.periodo === input.periodo);
    const m = g?.missoes.find((x) => x.id === input.missao);
    if (!g || !m) throw new TRPCError({ code: "NOT_FOUND", message: "Essa missão não está valendo agora." });
    return getDb().transaction(async (tx) => {
      const [r] = await tx.select().from(missoesProgresso).where(and(eq(missoesProgresso.usuarioId, u.id), eq(missoesProgresso.missao, m.id), eq(missoesProgresso.periodo, g.periodo))).for("update");
      if (!r || r.progresso < r.meta) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A missão ainda não foi cumprida." });
      if (r.coletadaEm) throw new TRPCError({ code: "CONFLICT", message: "Esse prêmio já foi coletado." });
      const [up] = await tx.update(missoesProgresso).set({ coletadaEm: new Date() }).where(and(eq(missoesProgresso.id, r.id), isNull(missoesProgresso.coletadaEm)));
      if (!Number((up as { affectedRows?: number }).affectedRows)) throw new TRPCError({ code: "CONFLICT", message: "Esse prêmio já foi coletado." });
      const e = await entregaAnexos(tx, u.id, anexosDoPremio(m.premio), `missao:${u.id}:${m.id}:${g.periodo}`, "Missão: " + m.nome, "missao");
      return { ok: true, missao: m.id, ...e };
    });
  }),
});
