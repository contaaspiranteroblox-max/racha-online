// ============================================================================
// RACHA v88 — o PASSE RACHA: uma temporada (contracts/catalogo88.json: temporada), 30 níveis, a trilha GRÁTIS e a PREMIUM
// (desbloqueada com gemas da carteira). O XP vem das partidas válidas e das missões (o servidor conta); o progresso e o que
// foi coletado ficam na conta (passe_temporada). Coletar confere o nível, a trilha e que ainda não foi coletado.
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { createRouter } from "../../middleware";
import { getDb } from "../../queries/connection";
import { passeTemporada } from "@db/schema";
import { autenticado, exigeLimite } from "../guard";
import { contaDe, estadoPasse, entregaAnexos } from "./comum";
import { movimentar } from "../economia";
import { CATALOGO, nivelPasse, recompensaPasse, temporadaAtiva, type Anexo, type RecompensaPasse } from "@contracts/v88";

const anexoDe = (r: RecompensaPasse): Anexo[] => (r.tipo === "item" ? [{ tipo: "item", qtd: 1, codigo: r.codigo }] : [{ tipo: r.tipo, qtd: r.qtd || 0 }]);

async function coletaNivel(usuarioId: number, n: number, trilha: "g" | "p") {
  const T = CATALOGO.temporada;
  const rec = recompensaPasse(n, trilha);
  if (!rec) throw new TRPCError({ code: "NOT_FOUND", message: "Esse nível não existe." });
  return getDb().transaction(async (tx) => {
    await estadoPasse(usuarioId, tx);
    const [p] = await tx.select().from(passeTemporada).where(and(eq(passeTemporada.usuarioId, usuarioId), eq(passeTemporada.temporada, T.id))).for("update");
    if (nivelPasse(p.xp).nivel < n) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Você ainda não chegou nesse nível do passe." });
    if (trilha === "p" && !p.premium) throw new TRPCError({ code: "FORBIDDEN", message: "Essa recompensa é da trilha PREMIUM." });
    const col = { g: [...(p.coletadas?.g || [])], p: [...(p.coletadas?.p || [])] };
    if (col[trilha].includes(n)) throw new TRPCError({ code: "CONFLICT", message: "Essa recompensa já foi coletada." });
    col[trilha].push(n);
    await tx.update(passeTemporada).set({ coletadas: col, atualizadoEm: new Date() }).where(and(eq(passeTemporada.usuarioId, usuarioId), eq(passeTemporada.temporada, T.id)));
    const e = await entregaAnexos(tx, usuarioId, anexoDe(rec), `passe:${T.id}:${usuarioId}:${trilha}:${n}`, `Passe ${T.id} · nível ${n} (${trilha === "p" ? "premium" : "grátis"})`, "passe");
    return { nivel: n, trilha, ...e };
  });
}

export const passeRouter = createRouter({
  estado: autenticado.query(async ({ ctx }) => {
    const u = contaDe(ctx);
    const T = CATALOGO.temporada;
    const p = await estadoPasse(u.id);
    return {
      temporada: { id: T.id, nome: T.nome, inicio: T.inicio, fim: T.fim, niveis: T.niveis, xpPorNivel: T.xpPorNivel, premiumGemas: T.premiumGemas, ativa: temporadaAtiva() },
      xp: p.xp, ...nivelPasse(p.xp), premium: p.premium, coletadas: p.coletadas || { g: [], p: [] }, trilha: T.trilha,
    };
  }),
  coletar: autenticado.input(z.object({ nivel: z.number().int().min(1).max(100), trilha: z.enum(["g", "p"]) })).mutation(async ({ ctx, input }) => {
    const u = contaDe(ctx);
    await exigeLimite(`coleta:${u.id}`, 60, 60 * 1000, "Calma: muitas coletas seguidas.");
    return coletaNivel(u.id, input.nivel, input.trilha);
  }),
  coletarTudo: autenticado.mutation(async ({ ctx }) => {
    const u = contaDe(ctx);
    await exigeLimite(`coleta-todas:${u.id}`, 10, 60 * 1000, "Calma: muitas coletas seguidas.");
    const p = await estadoPasse(u.id);
    const nv = nivelPasse(p.xp).nivel;
    const tot = { recompensas: 0, moedas: 0, gemas: 0, itens: [] as string[], carteira: null as null | { moedas: number; gemas: number } };
    for (let n = 1; n <= nv; n++) for (const t of (p.premium ? ["g", "p"] : ["g"]) as ("g" | "p")[]) {
      if ((p.coletadas?.[t] || []).includes(n)) continue;
      try {
        const r = await coletaNivel(u.id, n, t);
        tot.recompensas++; tot.moedas += r.moedas; tot.gemas += r.gemas; tot.itens.push(...r.itens);
        if (r.carteira) tot.carteira = r.carteira;
      } catch (_) { /* (coletado em outro aparelho): segue */ }
    }
    return tot;
  }),
  comprarPremium: autenticado.mutation(async ({ ctx }) => {
    const u = contaDe(ctx);
    const T = CATALOGO.temporada;
    if (!temporadaAtiva()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A temporada não está valendo agora." });
    const p = await estadoPasse(u.id);
    if (p.premium) throw new TRPCError({ code: "CONFLICT", message: "O passe premium desta temporada já é seu." });
    return getDb().transaction(async (tx) => {
      const m = await movimentar({ usuarioId: u.id, gemasDelta: -T.premiumGemas, tipo: "compra", motivo: "Passe RACHA premium · " + T.id, refTipo: "passe", refId: T.id, operacaoId: `passe-premium:${T.id}:${u.id}` }, tx);
      if (!m.ok) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Gemas insuficientes (precisa de " + T.premiumGemas + ")." });
      await tx.update(passeTemporada).set({ premium: true, premiumEm: new Date() }).where(and(eq(passeTemporada.usuarioId, u.id), eq(passeTemporada.temporada, T.id)));
      return { ok: true, carteira: { moedas: m.moedas, gemas: m.gemas } };
    });
  }),
});
