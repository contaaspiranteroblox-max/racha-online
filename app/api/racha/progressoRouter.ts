// ============================================================================
// RACHA v82 — O progresso do jogo na conta (o "save na nuvem")
// O jogo manda a cópia das chaves de progresso do aparelho (contracts/progresso.ts: só as de progresso, com teto de
// tamanho) e recebe de volta em outro aparelho. Cada cópia tem um número de versão: quem salva diz de qual versão
// partiu; se outro aparelho salvou antes, volta { conflito } com a cópia nova (o jogo pergunta qual fica). O UPDATE só
// passa se a versão ainda for a mesma (WHERE versao = base): dois aparelhos salvando juntos não se sobrescrevem.
// HONESTIDADE: moedas, gemas e peças são cosméticos e a conta deles roda no aparelho; o servidor confere o formato e o
// tamanho, não cada compra. A patente da ranqueada e o nível/XP da conta NÃO vêm desta cópia (ranqueada.ts, progressao.ts).
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { createRouter } from "../middleware";
import { getDb } from "../queries/connection";
import { progressoJogo } from "@db/schema";
import { autenticado, exigeLimite, type CtxAutenticado } from "./guard";
import { validaProgresso, type DadosProgresso } from "@contracts/progresso";

type CopiaNuvem = { versao: number; dados: DadosProgresso; bytes: number; aparelho: string | null; salvoEm: number };

async function copiaDe(usuarioId: number): Promise<CopiaNuvem | null> {
  const row = await getDb().query.progressoJogo.findFirst({ where: eq(progressoJogo.usuarioId, usuarioId) });
  return row
    ? { versao: row.versao, dados: row.dados as DadosProgresso, bytes: row.bytes, aparelho: row.aparelho ?? null, salvoEm: row.atualizadoEm.getTime() }
    : null;
}

export const progressoRouter = createRouter({
  // A cópia guardada na conta (null: a conta ainda não tem)
  carregar: autenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    return copiaDe(c.usuario.id);
  }),

  // Salva uma cópia nova (versaoBase: a versão de onde o aparelho partiu; 0 = a conta ainda não tinha)
  salvar: autenticado
    .input(
      z.object({
        versaoBase: z.number().int().min(0),
        dados: z.unknown(),
        aparelho: z.string().trim().max(40).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      await exigeLimite(`progresso:${c.usuario.id}`, 60, 10 * 60 * 1000, "Muitas cópias seguidas do progresso. Daqui a pouco salva de novo.");
      const v = validaProgresso(input.dados);
      if (!v.ok) throw new TRPCError({ code: "BAD_REQUEST", message: v.erro });
      const db = getDb();
      const atual = await copiaDe(c.usuario.id);
      const conflito = (x: CopiaNuvem) => ({ ok: false as const, conflito: true as const, ...x });
      if (!atual) {
        try {
          await db.insert(progressoJogo).values({ usuarioId: c.usuario.id, versao: 1, dados: v.dados, bytes: v.bytes, aparelho: input.aparelho ?? null });
          return { ok: true as const, versao: 1 };
        } catch {
          const outra = await copiaDe(c.usuario.id); // (outro aparelho salvou a primeira cópia no mesmo instante)
          if (outra) return conflito(outra);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não deu para salvar o progresso agora." });
        }
      }
      if (atual.versao !== input.versaoBase) return conflito(atual);
      const [res] = await db
        .update(progressoJogo)
        .set({ versao: atual.versao + 1, dados: v.dados, bytes: v.bytes, aparelho: input.aparelho ?? null, atualizadoEm: new Date() })
        .where(and(eq(progressoJogo.usuarioId, c.usuario.id), eq(progressoJogo.versao, input.versaoBase)));
      const afetadas = Number((res as unknown as { affectedRows?: number })?.affectedRows ?? 1);
      if (!afetadas) {
        const outra = await copiaDe(c.usuario.id);
        if (outra) return conflito(outra);
      }
      return { ok: true as const, versao: atual.versao + 1 };
    }),
});
