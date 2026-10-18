// ============================================================================
// RACHA v88 — as ESTATÍSTICAS da conta, com os números de verdade: tudo sai das partidas que o servidor contou (tabela
// partidas, encerradas com resultado). Filtro por temporada (as datas da temporada) e por modo (futebol/com curva,
// ranqueada, online, contra os bots). Nada é estimado: sem partida, os números são zero.
// ============================================================================
import { z } from "zod";
import { eq, and, desc, gte, lt, isNotNull } from "drizzle-orm";
import { createRouter } from "../../middleware";
import { getDb } from "../../queries/connection";
import { partidas } from "@db/schema";
import { autenticado } from "../guard";
import { contaDe } from "./comum";
import { CATALOGO } from "@contracts/v88";

const MODOS = ["tudo", "futebol", "curva", "ranqueada", "online", "bots"] as const;
type Linha = typeof partidas.$inferSelect;

function filtra(l: Linha[], modo: (typeof MODOS)[number]): Linha[] {
  if (modo === "futebol" || modo === "curva") return l.filter((p) => p.modo === modo);
  if (modo === "ranqueada") return l.filter((p) => p.ranqueada);
  if (modo === "online") return l.filter((p) => p.online);
  if (modo === "bots") return l.filter((p) => !p.online);
  return l;
}
export function resume(l: Linha[]) {
  const ord = l.slice().sort((a, b) => (a.encerradaEm?.getTime() || 0) - (b.encerradaEm?.getTime() || 0));
  let seq = 0, melhor = 0;
  for (const p of ord) { if (p.resultado === "vitoria") { seq++; melhor = Math.max(melhor, seq); } else seq = 0; }
  const n = l.length, v = l.filter((p) => p.resultado === "vitoria").length, e = l.filter((p) => p.resultado === "empate").length;
  return {
    partidas: n, vitorias: v, derrotas: l.filter((p) => p.resultado === "derrota").length, empates: e,
    gols: l.reduce((a, p) => a + (p.gols || 0), 0), assistencias: l.reduce((a, p) => a + (p.assistencias || 0), 0),
    taxaVitoria: n ? Math.round((v / n) * 100) : 0,
    aproveitamento: n ? Math.round(((v * 3 + e) / (n * 3)) * 100) : 0,   // (pontos ganhos: 3 a vitória, 1 o empate)
    melhorSequencia: melhor, mvp: l.filter((p) => p.mvp).length, tempoSeg: l.reduce((a, p) => a + (p.duracaoSeg || 0), 0),
  };
}

export const estatRouter = createRouter({
  temporadas: autenticado.query(() => [{ id: "tudo", nome: "TODAS" }, { id: CATALOGO.temporada.id, nome: CATALOGO.temporada.nome, inicio: CATALOGO.temporada.inicio, fim: CATALOGO.temporada.fim }]),
  resumo: autenticado
    .input(z.object({ temporada: z.string().max(16).default("tudo"), modo: z.enum(MODOS).default("tudo") }).optional())
    .query(async ({ ctx, input }) => {
      const u = contaDe(ctx);
      const t = input?.temporada || "tudo", modo = input?.modo || "tudo";
      const T = CATALOGO.temporada;
      const faixa = t === T.id ? and(gte(partidas.encerradaEm, new Date(Date.parse(T.inicio))), lt(partidas.encerradaEm, new Date(Date.parse(T.fim)))) : undefined;
      const l = await getDb().query.partidas.findMany({
        where: and(eq(partidas.usuarioId, u.id), eq(partidas.estado, "encerrada"), isNotNull(partidas.resultado), faixa),
        orderBy: [desc(partidas.encerradaEm)], limit: 5000,
      });
      const f = filtra(l, modo);
      return {
        temporada: t, modo, ...resume(f),
        historico: f.slice(0, 15).map((p) => ({
          id: p.id, quando: p.encerradaEm, modo: p.modo, ranqueada: p.ranqueada, online: p.online, tamanho: p.tamanho, resultado: p.resultado,
          placar: [p.placarNosso ?? 0, p.placarDeles ?? 0], gols: p.gols ?? 0, assistencias: p.assistencias ?? 0, mvp: p.mvp, duracaoSeg: p.duracaoSeg ?? 0, rqDelta: p.rqDelta,
        })),
      };
    }),
});
