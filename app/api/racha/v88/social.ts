// ============================================================================
// RACHA v88 — social: o resumo do que chegou (pedidos, mensagens, cartas, convites de clube), a busca de jogadores com a
// relação de cada um, o perfil de outro jogador, os jogadores das partidas recentes, a lista de amigos com o cartão e a
// privacidade (status online, convites, perfil, pedidos) e a bio. As ações (pedir, aceitar, remover, bloquear,
// denunciar) continuam no amigosRouter.
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, or, desc, like, inArray } from "drizzle-orm";
import { createRouter } from "../../middleware";
import { getDb } from "../../queries/connection";
import { usuarios, amizades, pedidosAmizade, bloqueios, mensagens, correio, clubeConvites, clubePedidos, clubeMembros, clubes, partidas, estatisticas } from "@db/schema";
import { autenticado, exigeLimite } from "../guard";
import { contaDe, cartaoDe, cartoesDe, pub6, empurraRelacoes, usuarioPorPub, relacoesDe, type Cartao } from "./comum";
import { materializaCorreio } from "./correio";
import { textoLimpo } from "@contracts/v88";

type Relacao = "eu" | "amigo" | "pedido_enviado" | "pedido_recebido" | "bloqueado" | "bloqueou_voce" | "nada";
async function relacaoCom(eu: number, outro: number): Promise<{ relacao: Relacao; pedidoId: number | null }> {
  if (eu === outro) return { relacao: "eu", pedidoId: null };
  const db = getDb();
  const bl = await db.query.bloqueios.findMany({ where: or(and(eq(bloqueios.usuarioId, eu), eq(bloqueios.bloqueadoId, outro)), and(eq(bloqueios.usuarioId, outro), eq(bloqueios.bloqueadoId, eu))) });
  if (bl.some((b) => b.usuarioId === eu)) return { relacao: "bloqueado", pedidoId: null };
  if (bl.length) return { relacao: "bloqueou_voce", pedidoId: null };
  if (await db.query.amizades.findFirst({ where: and(eq(amizades.usuarioId, eu), eq(amizades.amigoId, outro)) })) return { relacao: "amigo", pedidoId: null };
  const env = await db.query.pedidosAmizade.findFirst({ where: and(eq(pedidosAmizade.deId, eu), eq(pedidosAmizade.paraId, outro), eq(pedidosAmizade.estado, "pendente")) });
  if (env) return { relacao: "pedido_enviado", pedidoId: env.id };
  const rec = await db.query.pedidosAmizade.findFirst({ where: and(eq(pedidosAmizade.deId, outro), eq(pedidosAmizade.paraId, eu), eq(pedidosAmizade.estado, "pendente")) });
  if (rec) return { relacao: "pedido_recebido", pedidoId: rec.id };
  return { relacao: "nada", pedidoId: null };
}
const semCuringa = (s: string) => s.replace(/[\\%_]/g, (m) => "\\" + m);

export const socialRouter = createRouter({
  // o que chegou (o lobby mostra os pontinhos): pedidos de amizade, mensagens não lidas por categoria, cartas sem coletar e convites
  resumo: autenticado.query(async ({ ctx }) => {
    const u = contaDe(ctx);
    const db = getDb();
    await materializaCorreio(u);
    const pedidos = (await db.query.pedidosAmizade.findMany({ where: and(eq(pedidosAmizade.paraId, u.id), eq(pedidosAmizade.estado, "pendente")), columns: { id: true } })).length;
    const msgs = await db.query.mensagens.findMany({ where: and(eq(mensagens.usuarioId, u.id), eq(mensagens.lida, false)), columns: { categoria: true, expiraEm: true } });
    const porCategoria: Record<string, number> = { sistema: 0, amigos: 0, clube: 0, convites: 0, recompensas: 0 };
    const agora = Date.now();
    for (const m of msgs) if (!m.expiraEm || m.expiraEm.getTime() > agora) porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + 1;
    const cartas = (await db.query.correio.findMany({ where: eq(correio.usuarioId, u.id), columns: { coletadoEm: true, lidoEm: true, anexos: true, expiraEm: true } }))
      .filter((c) => (!c.expiraEm || c.expiraEm.getTime() > agora) && ((c.anexos?.length && !c.coletadoEm) || (!c.anexos?.length && !c.lidoEm))).length;
    const convitesClube = (await db.query.clubeConvites.findMany({ where: and(eq(clubeConvites.paraId, u.id), eq(clubeConvites.estado, "pendente")), columns: { id: true } })).length;
    const membro = await db.query.clubeMembros.findFirst({ where: eq(clubeMembros.usuarioId, u.id) });
    const pedidosClube = membro && membro.papel !== "membro"
      ? (await db.query.clubePedidos.findMany({ where: and(eq(clubePedidos.clubeId, membro.clubeId), eq(clubePedidos.estado, "pendente")), columns: { id: true } })).length : 0;
    const totalMsg = Object.values(porCategoria).reduce((a, b) => a + b, 0);
    return { pedidos, mensagens: porCategoria, mensagensTotal: totalMsg, correio: cartas, convitesClube, pedidosClube };
  }),

  // buscar jogadores pelo ID (exato) ou pelo nome (começo do nome de usuário ou do nome que aparece)
  buscar: autenticado.input(z.object({ termo: z.string().trim().min(1).max(40) })).query(async ({ ctx, input }) => {
    const u = contaDe(ctx);
    await exigeLimite(`busca88:${u.id}`, 30, 60 * 1000, "Muitas buscas seguidas. Espere um pouco.");
    const db = getDb();
    const t = input.termo.replace(/^#/, "");
    let achados: (typeof usuarios.$inferSelect)[] = [];
    if (/^0*\d{1,9}$/.test(t)) {
      const x = await usuarioPorPub(t);
      if (x) achados = [x];
    }
    if (!achados.length && t.length >= 2) {
      const p = semCuringa(t.toLowerCase()) + "%";
      achados = (await db.query.usuarios.findMany({ where: or(like(usuarios.username, p), like(usuarios.nomeExibicao, p)), limit: 15 })).filter((x) => !x.excluidoEm);
    }
    const cartoes = await cartoesDe(achados.map((x) => x.id));
    const out: (Cartao & { relacao: Relacao; pedidoId: number | null })[] = [];
    for (const x of achados) {
      const c = cartoes.get(x.id);
      if (!c) continue;
      const r = await relacaoCom(u.id, x.id);
      if (r.relacao === "bloqueou_voce") continue;                    // (quem bloqueou você não aparece na sua busca)
      out.push({ ...c, ...r });
    }
    return out.slice(0, 10);
  }),

  // o perfil de outro jogador (o cartão, os números, a patente, o clube, a bio, a relação)
  perfil: autenticado.input(z.object({ idPublico: z.string().regex(/^\d{1,9}$/) })).query(async ({ ctx, input }) => {
    const eu = contaDe(ctx);
    const db = getDb();
    const x = await usuarioPorPub(input.idPublico);
    if (!x) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
    const rel = await relacaoCom(eu.id, x.id);
    if (rel.relacao === "bloqueou_voce") throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
    const membro = await db.query.clubeMembros.findFirst({ where: eq(clubeMembros.usuarioId, x.id) });
    const clube = membro ? await db.query.clubes.findFirst({ where: eq(clubes.id, membro.clubeId) }) : undefined;
    const cartao = await cartaoDe(x, db, { clube: clube ? clube.nome : null });
    const fechado = !x.perfilPublico && rel.relacao !== "amigo" && rel.relacao !== "eu";
    if (fechado) return { ...cartao, ...rel, privado: true, numeros: null, clubeId: null };
    const est = await db.query.estatisticas.findFirst({ where: eq(estatisticas.usuarioId, x.id) });
    const encerradas = await db.query.partidas.findMany({ where: and(eq(partidas.usuarioId, x.id), eq(partidas.estado, "encerrada")), columns: { mvp: true, duracaoSeg: true, resultado: true } });
    const validas = encerradas.filter((p) => p.resultado);
    return {
      ...cartao, ...rel, privado: false, clubeId: clube ? clube.id : null,
      numeros: {
        partidas: est?.partidas ?? 0, vitorias: est?.vitorias ?? 0, derrotas: est?.derrotas ?? 0, empates: est?.empates ?? 0,
        gols: est?.gols ?? 0, assistencias: est?.assistencias ?? 0, melhorSequencia: est?.melhorSequencia ?? 0,
        mvp: validas.filter((p) => p.mvp).length, tempoSeg: validas.reduce((a, p) => a + (p.duracaoSeg || 0), 0),
      },
    };
  }),

  // os amigos com o cartão (o status online vem do servidor das salas, na hora)
  amigos: autenticado.query(async ({ ctx }) => {
    const u = contaDe(ctx);
    const db = getDb();
    const minhas = await db.query.amizades.findMany({ where: eq(amizades.usuarioId, u.id), orderBy: [desc(amizades.criadaEm)] });
    const cartoes = await cartoesDe(minhas.map((a) => a.amigoId));
    return minhas.map((a) => (cartoes.get(a.amigoId) ? { ...cartoes.get(a.amigoId)!, desde: a.criadaEm } : null)).filter(Boolean);
  }),

  // quem jogou com você nas últimas partidas online (para adicionar pelo resultado da partida)
  recentes: autenticado.query(async ({ ctx }) => {
    const u = contaDe(ctx);
    const db = getDb();
    const ult = await db.query.partidas.findMany({ where: and(eq(partidas.usuarioId, u.id), eq(partidas.online, true), eq(partidas.estado, "encerrada")), orderBy: [desc(partidas.encerradaEm)], limit: 20 });
    const vistos: { pub: string; quando: Date | null }[] = [];
    for (const p of ult) for (const j of p.jogadores || []) if (j !== pub6(u.idPublico) && !vistos.some((v) => v.pub === j)) vistos.push({ pub: j, quando: p.encerradaEm });
    const us = vistos.length ? await db.query.usuarios.findMany({ where: inArray(usuarios.idPublico, vistos.map((v) => Number(v.pub))) }) : [];
    const cartoes = await cartoesDe(us.map((x) => x.id));
    const out = [];
    for (const v of vistos.slice(0, 30)) {
      const x = us.find((q) => pub6(q.idPublico) === v.pub);
      const c = x && cartoes.get(x.id);
      if (!x || !c) continue;
      const r = await relacaoCom(u.id, x.id);
      if (r.relacao === "bloqueou_voce") continue;
      out.push({ ...c, ...r, quando: v.quando });
    }
    return out;
  }),

  // as relações da conta (o jogo usa para mostrar o status dos amigos e quem está bloqueado)
  relacoes: autenticado.query(async ({ ctx }) => {
    const r = await relacoesDe(contaDe(ctx).id);
    return r || { amigos: [], bloqueios: [], mostraOnline: true, aceitaConvites: true, clube: null, cos: {} };
  }),

  privacidade: autenticado.query(async ({ ctx }) => {
    const u = contaDe(ctx);
    return { mostraOnline: u.mostraOnline !== false, aceitaConvites: u.aceitaConvites !== false, perfilPublico: !!u.perfilPublico, aceitaPedidos: !!u.aceitaPedidos, bio: u.bio ?? "" };
  }),
  definirPrivacidade: autenticado
    .input(z.object({ mostraOnline: z.boolean().optional(), aceitaConvites: z.boolean().optional(), perfilPublico: z.boolean().optional(), aceitaPedidos: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const u = contaDe(ctx);
      const set: Partial<typeof usuarios.$inferInsert> = {};
      for (const k of ["mostraOnline", "aceitaConvites", "perfilPublico", "aceitaPedidos"] as const) if (typeof input[k] === "boolean") set[k] = input[k];
      if (Object.keys(set).length) await getDb().update(usuarios).set(set).where(eq(usuarios.id, u.id));
      await empurraRelacoes(u.id);
      const x = await getDb().query.usuarios.findFirst({ where: eq(usuarios.id, u.id) });
      return { mostraOnline: x!.mostraOnline !== false, aceitaConvites: x!.aceitaConvites !== false, perfilPublico: !!x!.perfilPublico, aceitaPedidos: !!x!.aceitaPedidos };
    }),
  definirBio: autenticado.input(z.object({ bio: z.string().max(80) })).mutation(async ({ ctx, input }) => {
    const u = contaDe(ctx);
    await exigeLimite(`bio:${u.id}`, 10, 60 * 60 * 1000, "Muitas trocas seguidas.");
    const bio = input.bio.replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim();
    const t = textoLimpo(bio);
    if (!t.ok) throw new TRPCError({ code: "BAD_REQUEST", message: "A bio não pode ter " + t.motivo + "." });
    await getDb().update(usuarios).set({ bio: bio || null }).where(eq(usuarios.id, u.id));
    return { bio };
  }),
});
