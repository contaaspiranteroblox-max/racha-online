// ============================================================================
// RACHA 2.0 — Router de amigos: pedidos, aceite, bloqueio, denúncia
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, or, desc } from "drizzle-orm";
import { createRouter } from "../middleware";
import { getDb } from "../queries/connection";
import { usuarios, amizades, pedidosAmizade, bloqueios, denuncias, selos } from "@db/schema";
import { autenticado, exigeLimite, type CtxAutenticado } from "./guard";
import { paraPublico } from "./authRouter";

async function acharPorIdOuNome(termo: string) {
  const db = getDb();
  const limpo = termo.trim();
  const num = /^0*\d{1,9}$/.test(limpo) ? Number(limpo) : null;
  if (num !== null && num > 0) {
    const porId = await db.query.usuarios.findFirst({ where: eq(usuarios.idPublico, num) });
    if (porId) return porId;
  }
  return db.query.usuarios.findFirst({ where: eq(usuarios.username, limpo.toLowerCase()) });
}

async function estaBloqueado(a: number, b: number): Promise<boolean> {
  const bl = await getDb().query.bloqueios.findFirst({
    where: or(and(eq(bloqueios.usuarioId, a), eq(bloqueios.bloqueadoId, b)), and(eq(bloqueios.usuarioId, b), eq(bloqueios.bloqueadoId, a))),
  });
  return !!bl;
}

async function saoAmigos(a: number, b: number): Promise<boolean> {
  const am = await getDb().query.amizades.findFirst({
    where: and(eq(amizades.usuarioId, a), eq(amizades.amigoId, b)),
  });
  return !!am;
}

async function selosDe(usuarioId: number): Promise<string[]> {
  const lista = await getDb().query.selos.findMany({ where: eq(selos.usuarioId, usuarioId) });
  return lista.map((s) => s.selo);
}

export const amigosRouter = createRouter({
  // ---------- Lista de amigos ----------
  listar: autenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    const db = getDb();
    const minhas = await db.query.amizades.findMany({ where: eq(amizades.usuarioId, c.usuario.id) });
    const amigos = await Promise.all(
      minhas.map(async (a) => {
        const u = await db.query.usuarios.findFirst({ where: eq(usuarios.id, a.amigoId) });
        if (!u) return null;
        return { ...paraPublico(u, await selosDe(u.id)), amizadeDesde: a.criadaEm };
      }),
    );
    return amigos.filter(Boolean);
  }),

  // ---------- Pedidos (recebidos e enviados) ----------
  pedidos: autenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    const db = getDb();
    const [recebidos, enviados] = await Promise.all([
      db.query.pedidosAmizade.findMany({ where: and(eq(pedidosAmizade.paraId, c.usuario.id), eq(pedidosAmizade.estado, "pendente")), orderBy: [desc(pedidosAmizade.criadoEm)] }),
      db.query.pedidosAmizade.findMany({ where: and(eq(pedidosAmizade.deId, c.usuario.id), eq(pedidosAmizade.estado, "pendente")) }),
    ]);
    const montar = async (lista: typeof recebidos, chave: "deId" | "paraId") =>
      Promise.all(
        lista.map(async (p) => {
          const u = await db.query.usuarios.findFirst({ where: eq(usuarios.id, p[chave]) });
          return u ? { pedidoId: p.id, criadoEm: p.criadoEm, jogador: paraPublico(u, await selosDe(u.id)) } : null;
        }),
      );
    return {
      recebidos: (await montar(recebidos, "deId")).filter(Boolean),
      enviados: (await montar(enviados, "paraId")).filter(Boolean),
    };
  }),

  // ---------- Enviar pedido de amizade ----------
  enviarPedido: autenticado
    .input(z.object({ termo: z.string().trim().min(1).max(40) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      await exigeLimite(`amizade:${c.usuario.id}`, 20, 60 * 60 * 1000, "Muitos pedidos de amizade. Tente mais tarde.");
      const db = getDb();

      const alvo = await acharPorIdOuNome(input.termo);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      if (alvo.id === c.usuario.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Você já é seu próprio craque." });
      if (!alvo.aceitaPedidos) throw new TRPCError({ code: "FORBIDDEN", message: "Esse jogador não aceita pedidos de amizade." });
      if (await estaBloqueado(c.usuario.id, alvo.id)) throw new TRPCError({ code: "FORBIDDEN", message: "Não foi possível enviar o pedido." });
      if (await saoAmigos(c.usuario.id, alvo.id)) throw new TRPCError({ code: "CONFLICT", message: "Vocês já são amigos." });

      const jaExiste = await db.query.pedidosAmizade.findFirst({
        where: and(eq(pedidosAmizade.deId, c.usuario.id), eq(pedidosAmizade.paraId, alvo.id), eq(pedidosAmizade.estado, "pendente")),
      });
      if (jaExiste) throw new TRPCError({ code: "CONFLICT", message: "Pedido já enviado." });

      // Se o outro já me pediu, aceita automaticamente (vira amizade)
      const inverso = await db.query.pedidosAmizade.findFirst({
        where: and(eq(pedidosAmizade.deId, alvo.id), eq(pedidosAmizade.paraId, c.usuario.id), eq(pedidosAmizade.estado, "pendente")),
      });
      if (inverso) {
        await db.update(pedidosAmizade).set({ estado: "aceito", respondidoEm: new Date() }).where(eq(pedidosAmizade.id, inverso.id));
        await db.insert(amizades).values([
          { usuarioId: c.usuario.id, amigoId: alvo.id },
          { usuarioId: alvo.id, amigoId: c.usuario.id },
        ]);
        return { ok: true, viraram: true };
      }

      await db.insert(pedidosAmizade).values({ deId: c.usuario.id, paraId: alvo.id });
      return { ok: true, viraram: false };
    }),

  // ---------- Aceitar / recusar ----------
  responderPedido: autenticado
    .input(z.object({ pedidoId: z.number().int(), aceitar: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      const db = getDb();
      const p = await db.query.pedidosAmizade.findFirst({
        where: and(eq(pedidosAmizade.id, input.pedidoId), eq(pedidosAmizade.paraId, c.usuario.id), eq(pedidosAmizade.estado, "pendente")),
      });
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
      await db
        .update(pedidosAmizade)
        .set({ estado: input.aceitar ? "aceito" : "recusado", respondidoEm: new Date() })
        .where(eq(pedidosAmizade.id, p.id));
      if (input.aceitar) {
        await db.insert(amizades).values([
          { usuarioId: c.usuario.id, amigoId: p.deId },
          { usuarioId: p.deId, amigoId: c.usuario.id },
        ]).onDuplicateKeyUpdate({ set: { usuarioId: c.usuario.id } });
      }
      return { ok: true };
    }),

  // ---------- Remover amigo ----------
  remover: autenticado
    .input(z.object({ termo: z.string().trim().min(1).max(40) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      const db = getDb();
      const alvo = await acharPorIdOuNome(input.termo);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      await db.delete(amizades).where(or(and(eq(amizades.usuarioId, c.usuario.id), eq(amizades.amigoId, alvo.id)), and(eq(amizades.usuarioId, alvo.id), eq(amizades.amigoId, c.usuario.id))));
      return { ok: true };
    }),

  // ---------- Bloquear / desbloquear ----------
  bloquear: autenticado
    .input(z.object({ termo: z.string().trim().min(1).max(40) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      const db = getDb();
      const alvo = await acharPorIdOuNome(input.termo);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      if (alvo.id === c.usuario.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode se bloquear." });
      // Bloquear remove amizade e pedidos pendentes
      await db.delete(amizades).where(or(and(eq(amizades.usuarioId, c.usuario.id), eq(amizades.amigoId, alvo.id)), and(eq(amizades.usuarioId, alvo.id), eq(amizades.amigoId, c.usuario.id))));
      await db.update(pedidosAmizade).set({ estado: "recusado", respondidoEm: new Date() }).where(and(eq(pedidosAmizade.deId, alvo.id), eq(pedidosAmizade.paraId, c.usuario.id), eq(pedidosAmizade.estado, "pendente")));
      await db.insert(bloqueios).values({ usuarioId: c.usuario.id, bloqueadoId: alvo.id }).onDuplicateKeyUpdate({ set: { usuarioId: c.usuario.id } });
      return { ok: true };
    }),

  desbloquear: autenticado
    .input(z.object({ termo: z.string().trim().min(1).max(40) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      const db = getDb();
      const alvo = await acharPorIdOuNome(input.termo);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      await db.delete(bloqueios).where(and(eq(bloqueios.usuarioId, c.usuario.id), eq(bloqueios.bloqueadoId, alvo.id)));
      return { ok: true };
    }),

  bloqueados: autenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    const db = getDb();
    const lista = await db.query.bloqueios.findMany({ where: eq(bloqueios.usuarioId, c.usuario.id) });
    const montado = await Promise.all(
      lista.map(async (b) => {
        const u = await db.query.usuarios.findFirst({ where: eq(usuarios.id, b.bloqueadoId) });
        return u ? { ...paraPublico(u, []), bloqueadoEm: b.criadoEm } : null;
      }),
    );
    return montado.filter(Boolean);
  }),

  // ---------- Denunciar perfil ----------
  denunciar: autenticado
    .input(
      z.object({
        termo: z.string().trim().min(1).max(40),
        motivo: z.enum(["nome_ofensivo", "trapaça", "assedio", "conteudo_improprio", "outro"]),
        detalhes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      await exigeLimite(`denuncia:${c.usuario.id}`, 10, 60 * 60 * 1000, "Muitas denúncias seguidas.");
      const db = getDb();
      const alvo = await acharPorIdOuNome(input.termo);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      if (alvo.id === c.usuario.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode se denunciar." });
      await db.insert(denuncias).values({
        autorId: c.usuario.id,
        alvoId: alvo.id,
        motivo: input.motivo,
        detalhes: input.detalhes ?? null,
      });
      return { ok: true, aviso: "Denúncia registrada. A equipe do RACHA vai analisar." };
    }),
});
