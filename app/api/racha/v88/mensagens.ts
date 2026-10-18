// ============================================================================
// RACHA v88 — a CENTRAL DE MENSAGENS: os avisos ligados à conta (Sistema, Amigos, Clube, Convites, Recompensas), com as
// não lidas. Quem escreve aqui é o servidor (notifica(): pedido e amizade, convite e pedido de clube, carta nova, aviso do
// RACHA CONTROL); o jogo lê, marca como lida e apaga.
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, or, isNull, gt } from "drizzle-orm";
import { createRouter } from "../../middleware";
import { getDb } from "../../queries/connection";
import { mensagens, usuarios } from "@db/schema";
import { autenticado } from "../guard";
import { contaDe, pub6 } from "./comum";
import { materializaCorreio } from "./correio";

const CATEGORIAS = ["sistema", "amigos", "clube", "convites", "recompensas"] as const;

export const mensagensRouter = createRouter({
  listar: autenticado.input(z.object({ categoria: z.enum(CATEGORIAS).optional() }).optional()).query(async ({ ctx, input }) => {
    const u = contaDe(ctx);
    const db = getDb();
    await materializaCorreio(u);                              // (os avisos para todo mundo chegam também por aqui)
    const agora = new Date();
    const filtro = and(eq(mensagens.usuarioId, u.id), or(isNull(mensagens.expiraEm), gt(mensagens.expiraEm, agora)), input?.categoria ? eq(mensagens.categoria, input.categoria) : undefined);
    const l = await db.query.mensagens.findMany({ where: filtro, orderBy: [desc(mensagens.criadaEm), desc(mensagens.id)], limit: 100 });
    const de = [...new Set(l.map((m) => m.deId).filter((x): x is number => !!x))];
    const nomes = new Map<number, { nome: string; idPublico: string }>();
    for (const id of de) {
      const x = await db.query.usuarios.findFirst({ where: eq(usuarios.id, id), columns: { nomeExibicao: true, idPublico: true, excluidoEm: true } });
      if (x && !x.excluidoEm) nomes.set(id, { nome: x.nomeExibicao, idPublico: pub6(x.idPublico) });
    }
    return l.map((m) => ({
      id: m.id, categoria: m.categoria, titulo: m.titulo, corpo: m.corpo, lida: m.lida, criadaEm: m.criadaEm,
      refTipo: m.refTipo, refId: m.refId, de: m.deId ? nomes.get(m.deId) || null : null,
    }));
  }),
  marcarLida: autenticado
    .input(z.object({ id: z.number().int().optional(), categoria: z.enum(CATEGORIAS).optional(), todas: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const u = contaDe(ctx);
      if (!input.id && !input.categoria && !input.todas) throw new TRPCError({ code: "BAD_REQUEST", message: "Diga qual mensagem." });
      const [r] = await getDb().update(mensagens).set({ lida: true }).where(and(
        eq(mensagens.usuarioId, u.id), eq(mensagens.lida, false),
        input.id ? eq(mensagens.id, input.id) : undefined,
        input.categoria ? eq(mensagens.categoria, input.categoria) : undefined,
      ));
      return { ok: true, marcadas: Number((r as { affectedRows?: number }).affectedRows || 0) };
    }),
  apagar: autenticado.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    const u = contaDe(ctx);
    const [r] = await getDb().delete(mensagens).where(and(eq(mensagens.id, input.id), eq(mensagens.usuarioId, u.id)));
    if (!Number((r as { affectedRows?: number }).affectedRows)) throw new TRPCError({ code: "NOT_FOUND", message: "Mensagem não encontrada." });
    return { ok: true };
  }),
});
