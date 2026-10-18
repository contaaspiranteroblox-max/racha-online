// ============================================================================
// RACHA 2.0 — Router de amigos: pedidos, aceite, bloqueio, denúncia
// v88: o jogo passou a usar estas rotas (a tela AMIGOS dentro do jogo): cancelar o pedido enviado, o aviso na central de
// mensagens (e na hora, pelo servidor das salas), o limite de amigos, pedir de novo depois de recusado (antes dava erro de
// chave repetida), o bloqueio cancelando também o SEU pedido, as relações novas valendo na hora no servidor das salas e a
// denúncia com os motivos novos e a proteção contra denúncia repetida/abusiva (contracts/v88.ts: DENUNCIA).
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, or, desc, gt, sql } from "drizzle-orm";
import { createRouter } from "../middleware";
import { getDb } from "../queries/connection";
import { usuarios, amizades, pedidosAmizade, bloqueios, denuncias, selos, mensagens } from "@db/schema";
import { autenticado, exigeLimite, type CtxAutenticado } from "./guard";
import { paraPublico } from "./authRouter";
import { MAX_AMIGOS, notifica, empurraRelacoes, pub6 } from "./v88/comum";
import { MOTIVOS_DENUNCIA, MOTIVO_ANTIGO, MOTIVO_TEXTO, DENUNCIA, chaveDenuncia, type MotivoDenuncia } from "@contracts/v88";

async function acharPorIdOuNome(termo: string) {
  const db = getDb();
  const limpo = termo.trim();
  const num = /^0*\d{1,9}$/.test(limpo) ? Number(limpo) : null;
  if (num !== null && num > 0) {
    const porId = await db.query.usuarios.findFirst({ where: eq(usuarios.idPublico, num) });
    if (porId && !porId.excluidoEm) return porId;
  }
  const u = await db.query.usuarios.findFirst({ where: eq(usuarios.username, limpo.toLowerCase()) });
  return u && !u.excluidoEm ? u : undefined;
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

async function quantosAmigos(id: number): Promise<number> {
  return (await getDb().query.amizades.findMany({ where: eq(amizades.usuarioId, id), columns: { id: true } })).length;
}

async function selosDe(usuarioId: number): Promise<string[]> {
  const lista = await getDb().query.selos.findMany({ where: eq(selos.usuarioId, usuarioId) });
  return lista.map((s) => s.selo);
}

// v88: a amizade nova (dos dois lados) e os avisos
async function viraramAmigos(a: { id: number; nomeExibicao: string }, b: { id: number; nomeExibicao: string }) {
  const db = getDb();
  await db.insert(amizades).values([
    { usuarioId: a.id, amigoId: b.id },
    { usuarioId: b.id, amigoId: a.id },
  ]).onDuplicateKeyUpdate({ set: { usuarioId: sql`${amizades.usuarioId}` } });
  // as mensagens do pedido viram lidas (o pedido acabou)
  await db.update(mensagens).set({ lida: true }).where(and(eq(mensagens.refTipo, "pedido_amizade"), or(and(eq(mensagens.usuarioId, a.id), eq(mensagens.deId, b.id)), and(eq(mensagens.usuarioId, b.id), eq(mensagens.deId, a.id)))));
  await notifica(b.id, { categoria: "amigos", titulo: a.nomeExibicao + " agora é seu amigo", corpo: "Vocês são amigos no RACHA: dá para ver quando ele está online, convidar para a sala e conversar no chat dos amigos.", deId: a.id, refTipo: "amizade", refId: a.id });
  await notifica(a.id, { categoria: "amigos", titulo: b.nomeExibicao + " agora é seu amigo", corpo: "Vocês são amigos no RACHA: dá para ver quando ele está online, convidar para a sala e conversar no chat dos amigos.", deId: b.id, refTipo: "amizade", refId: b.id });
  await empurraRelacoes(a.id, b.id);
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
        if (!u || u.excluidoEm) return null;
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
          return u && !u.excluidoEm ? { pedidoId: p.id, criadoEm: p.criadoEm, jogador: paraPublico(u, await selosDe(u.id)) } : null;
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
      if ((await quantosAmigos(c.usuario.id)) >= MAX_AMIGOS) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Sua lista de amigos está cheia (${MAX_AMIGOS}).` });
      if ((await quantosAmigos(alvo.id)) >= MAX_AMIGOS) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A lista de amigos desse jogador está cheia." });

      const jaExiste = await db.query.pedidosAmizade.findFirst({
        where: and(eq(pedidosAmizade.deId, c.usuario.id), eq(pedidosAmizade.paraId, alvo.id)),
      });
      if (jaExiste && jaExiste.estado === "pendente") throw new TRPCError({ code: "CONFLICT", message: "Pedido já enviado." });

      // Se o outro já me pediu, aceita automaticamente (vira amizade)
      const inverso = await db.query.pedidosAmizade.findFirst({
        where: and(eq(pedidosAmizade.deId, alvo.id), eq(pedidosAmizade.paraId, c.usuario.id), eq(pedidosAmizade.estado, "pendente")),
      });
      if (inverso) {
        await db.update(pedidosAmizade).set({ estado: "aceito", respondidoEm: new Date() }).where(eq(pedidosAmizade.id, inverso.id));
        await viraramAmigos(c.usuario, alvo);
        return { ok: true, viraram: true };
      }

      // v88: o pedido de antes (recusado ou aceito e desfeito) volta a valer, em vez de tentar gravar outro (a chave é única)
      let pedidoId: number;
      if (jaExiste) {
        await db.update(pedidosAmizade).set({ estado: "pendente", criadoEm: new Date(), respondidoEm: null }).where(eq(pedidosAmizade.id, jaExiste.id));
        pedidoId = jaExiste.id;
      } else {
        const [r] = await db.insert(pedidosAmizade).values({ deId: c.usuario.id, paraId: alvo.id });
        pedidoId = Number(r.insertId);
      }
      await notifica(alvo.id, {
        categoria: "amigos", titulo: "Pedido de amizade de " + c.usuario.nomeExibicao,
        corpo: c.usuario.nomeExibicao + " (ID " + pub6(c.usuario.idPublico) + ") quer ser seu amigo. Aceite ou recuse em AMIGOS › SOLICITAÇÕES.",
        deId: c.usuario.id, refTipo: "pedido_amizade", refId: pedidoId, chave: "pedido:" + pedidoId + ":" + Date.now(),
      });
      return { ok: true, viraram: false, pedidoId };
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
      if (input.aceitar) {
        if ((await quantosAmigos(c.usuario.id)) >= MAX_AMIGOS) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Sua lista de amigos está cheia (${MAX_AMIGOS}).` });
        if ((await quantosAmigos(p.deId)) >= MAX_AMIGOS) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A lista de amigos desse jogador está cheia." });
      }
      await db
        .update(pedidosAmizade)
        .set({ estado: input.aceitar ? "aceito" : "recusado", respondidoEm: new Date() })
        .where(eq(pedidosAmizade.id, p.id));
      await db.update(mensagens).set({ lida: true }).where(and(eq(mensagens.usuarioId, c.usuario.id), eq(mensagens.refTipo, "pedido_amizade"), eq(mensagens.refId, String(p.id))));
      if (input.aceitar) {
        const de = await db.query.usuarios.findFirst({ where: eq(usuarios.id, p.deId) });
        if (de) await viraramAmigos(c.usuario, de);
      }
      return { ok: true };
    }),

  // ---------- v88: Cancelar o pedido que você enviou ----------
  cancelarPedido: autenticado
    .input(z.object({ pedidoId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      const db = getDb();
      const p = await db.query.pedidosAmizade.findFirst({
        where: and(eq(pedidosAmizade.id, input.pedidoId), eq(pedidosAmizade.deId, c.usuario.id), eq(pedidosAmizade.estado, "pendente")),
      });
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado (já foi respondido ou cancelado)." });
      await db.delete(pedidosAmizade).where(eq(pedidosAmizade.id, p.id));
      await db.update(mensagens).set({ lida: true }).where(and(eq(mensagens.usuarioId, p.paraId), eq(mensagens.refTipo, "pedido_amizade"), eq(mensagens.refId, String(p.id))));
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
      await empurraRelacoes(c.usuario.id, alvo.id);
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
      // Bloquear remove amizade e pedidos pendentes (v88: dos dois lados — o seu pedido para ele também)
      await db.delete(amizades).where(or(and(eq(amizades.usuarioId, c.usuario.id), eq(amizades.amigoId, alvo.id)), and(eq(amizades.usuarioId, alvo.id), eq(amizades.amigoId, c.usuario.id))));
      await db.update(pedidosAmizade).set({ estado: "recusado", respondidoEm: new Date() }).where(and(eq(pedidosAmizade.deId, alvo.id), eq(pedidosAmizade.paraId, c.usuario.id), eq(pedidosAmizade.estado, "pendente")));
      await db.delete(pedidosAmizade).where(and(eq(pedidosAmizade.deId, c.usuario.id), eq(pedidosAmizade.paraId, alvo.id), eq(pedidosAmizade.estado, "pendente")));
      await db.insert(bloqueios).values({ usuarioId: c.usuario.id, bloqueadoId: alvo.id }).onDuplicateKeyUpdate({ set: { usuarioId: c.usuario.id } });
      await empurraRelacoes(c.usuario.id, alvo.id);
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
      await empurraRelacoes(c.usuario.id, alvo.id);
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

  // ---------- Denunciar perfil (v88: os motivos novos, de onde veio e a proteção contra repetida e abusiva) ----------
  denunciar: autenticado
    .input(
      z.object({
        termo: z.string().trim().min(1).max(40),
        motivo: z.enum([...MOTIVOS_DENUNCIA, "nome_ofensivo", "trapaça", "assedio", "conteudo_improprio"] as [string, ...string[]]),
        detalhes: z.string().max(500).optional(),
        origem: z.enum(["perfil", "partida", "chat", "sala", "clube"]).default("perfil"),
        contexto: z.record(z.string(), z.union([z.string().max(300), z.number()])).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      await exigeLimite(`denuncia:${c.usuario.id}`, DENUNCIA.porHora, 60 * 60 * 1000, "Muitas denúncias seguidas.");
      await exigeLimite(`denuncia-dia:${c.usuario.id}`, DENUNCIA.porDia, 24 * 60 * 60 * 1000, "Você chegou ao limite de denúncias de hoje.");
      const db = getDb();
      if (Date.now() - c.usuario.criadoEm.getTime() < DENUNCIA.minutosContaNova * 60 * 1000) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Contas novas precisam esperar alguns minutos para denunciar." });
      }
      // quem fez denúncias sem fundamento demais (arquivadas pela equipe) fica um tempo sem denunciar
      const arquivadas = await db.query.denuncias.findMany({
        where: and(eq(denuncias.autorId, c.usuario.id), eq(denuncias.estado, "arquivada"), gt(denuncias.criadaEm, new Date(Date.now() - 30 * 864e5))),
        columns: { id: true, resolvidaEm: true },
      });
      const ultimaArq = arquivadas.reduce((m, d) => Math.max(m, d.resolvidaEm ? d.resolvidaEm.getTime() : 0), 0);
      if (arquivadas.length >= DENUNCIA.arquivadasParaAbuso && Date.now() - ultimaArq < 7 * 864e5) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Suas últimas denúncias foram arquivadas pela equipe. Você poderá denunciar de novo em alguns dias." });
      }
      const alvo = await acharPorIdOuNome(input.termo);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      if (alvo.id === c.usuario.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode se denunciar." });
      const motivo: MotivoDenuncia = (MOTIVOS_DENUNCIA as readonly string[]).includes(input.motivo) ? (input.motivo as MotivoDenuncia) : MOTIVO_ANTIGO[input.motivo] || "outro";
      const chave = chaveDenuncia(c.usuario.id, alvo.id, motivo);
      try {
        await db.insert(denuncias).values({
          autorId: c.usuario.id,
          alvoId: alvo.id,
          motivo,
          detalhes: input.detalhes ?? null,
          contexto: { origem: input.origem, motivoTexto: MOTIVO_TEXTO[motivo], ...(input.contexto || {}) },
          chave,
        });
      } catch (e) {
        if (/duplicate|ER_DUP_ENTRY|1062/i.test(String((e as Error)?.message ?? e))) {
          return { ok: true, repetida: true, aviso: "Você já denunciou esse jogador por esse motivo hoje. A equipe já está com a sua denúncia." };
        }
        throw e;
      }
      return { ok: true, repetida: false, aviso: "Denúncia registrada. A equipe do RACHA vai analisar." };
    }),
});
