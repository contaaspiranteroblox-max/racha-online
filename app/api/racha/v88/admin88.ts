// ============================================================================
// RACHA v88 — RACHA CONTROL (a equipe): os EVENTOS (criar, mudar, ligar/desligar), o CORREIO (carta para uma conta ou para
// todo mundo, com moedas, gemas, itens do catálogo e XP do passe — o servidor confere cada anexo) e os AVISOS do sistema.
// Mesmo login do painel (sessão do RACHA CONTROL + 2FA), as permissões do cargo (gerenciar_eventos, enviar_itens,
// distribuir_global) e a auditoria de cada ação, como o resto do adminRouter.
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { createRouter } from "../../middleware";
import { getDb } from "../../queries/connection";
import { eventos, correioGlobal } from "@db/schema";
import { adminAutenticado, exigePermissao, auditar, ipDaRequisicao, type CtxAdmin } from "../guard";
import { poeCarta } from "./correio";
import { notifica, usuarioPorPub } from "./comum";
import { garanteEventos } from "./eventos";
import { validaAnexos } from "@contracts/v88";

const TIPOS_CARTA = ["evento", "temporada", "presente", "manutencao", "compensacao", "sistema"] as const;
const TIPOS_EVENTO = ["ativo", "login", "desafio", "torneio", "temporada", "temporario"] as const;
const IMAGENS = ["favela", "quadra", "copa", "passe", "loja", "cristo", "estadio", "grafite", "noite"] as const;

export const admin88Router = createRouter({
  eventosListar: adminAutenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAdmin;
    exigePermissao(c, "gerenciar_eventos");
    await garanteEventos();
    return getDb().query.eventos.findMany({ orderBy: [desc(eventos.ativo), eventos.ordem], limit: 200 });
  }),

  eventoSalvar: adminAutenticado
    .input(z.object({
      id: z.number().int().optional(),
      slug: z.string().regex(/^[a-z0-9-]{3,40}$/, "slug: letras minúsculas, números e hífen (3 a 40)"),
      tipo: z.enum(TIPOS_EVENTO), nome: z.string().trim().min(3).max(60), descricao: z.string().max(300).default(""), regras: z.string().max(1000).default(""),
      imagem: z.enum(IMAGENS).default("favela"), inicio: z.string().datetime(), fim: z.string().datetime(),
      config: z.record(z.string(), z.unknown()).default({}), ativo: z.boolean().default(true), ordem: z.number().int().min(0).max(999).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "gerenciar_eventos");
      const inicio = new Date(input.inicio), fim = new Date(input.fim);
      if (fim.getTime() <= inicio.getTime()) throw new TRPCError({ code: "BAD_REQUEST", message: "O fim precisa ser depois do começo." });
      const cfg = input.config as Record<string, unknown>;
      if (cfg.presente !== undefined) { const v = validaAnexos(cfg.presente); if (!v.ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Presente: " + v.erro }); cfg.presente = v.anexos; }
      if (cfg.dias !== undefined && !Array.isArray(cfg.dias)) throw new TRPCError({ code: "BAD_REQUEST", message: "dias precisa ser uma lista." });
      const db = getDb();
      const dados = { slug: input.slug, tipo: input.tipo, nome: input.nome, descricao: input.descricao, regras: input.regras, imagem: input.imagem, inicio, fim, config: cfg, ativo: input.ativo, ordem: input.ordem, atualizadoEm: new Date() };
      let id = input.id;
      if (id) await db.update(eventos).set(dados).where(eq(eventos.id, id));
      else { const [r] = await db.insert(eventos).values({ ...dados, criadoPor: c.usuario.id }); id = Number(r.insertId); }
      await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao: input.id ? "evento_editar" : "evento_criar", detalhes: { id, slug: input.slug, tipo: input.tipo }, resultado: "ok", ip: ipDaRequisicao(c.req) });
      return { ok: true, id };
    }),

  eventoAtivo: adminAutenticado.input(z.object({ id: z.number().int(), ativo: z.boolean() })).mutation(async ({ ctx, input }) => {
    const c = ctx as unknown as CtxAdmin;
    exigePermissao(c, "gerenciar_eventos");
    await getDb().update(eventos).set({ ativo: input.ativo, atualizadoEm: new Date() }).where(eq(eventos.id, input.id));
    await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "evento_" + (input.ativo ? "ligar" : "desligar"), detalhes: { id: input.id }, resultado: "ok", ip: ipDaRequisicao(c.req) });
    return { ok: true };
  }),

  // a carta (para uma conta pelo ID público, ou para TODOS — cada conta recebe a cópia dela quando abre o jogo na janela)
  correioEnviar: adminAutenticado
    .input(z.object({
      para: z.string().regex(/^(todos|\d{1,9})$/), tipo: z.enum(TIPOS_CARTA), titulo: z.string().trim().min(3).max(80), corpo: z.string().max(600).default(""),
      anexos: z.array(z.object({ tipo: z.enum(["moedas", "gemas", "item", "xp_passe"]), qtd: z.number().int().min(1), codigo: z.string().max(40).optional() })).max(12).default([]),
      dias: z.number().int().min(1).max(90).default(14), contasAte: z.string().datetime().optional(),
      confirmacao: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "enviar_itens");
      const v = validaAnexos(input.anexos);
      if (!v.ok) throw new TRPCError({ code: "BAD_REQUEST", message: v.erro });
      const fim = new Date(Date.now() + input.dias * 864e5);
      if (input.para === "todos") {
        exigePermissao(c, "distribuir_global");
        if (input.confirmacao !== "DISTRIBUIR") throw new TRPCError({ code: "BAD_REQUEST", message: 'Para todos, escreva DISTRIBUIR na confirmação.' });
        const [r] = await getDb().insert(correioGlobal).values({ tipo: input.tipo, titulo: input.titulo, corpo: input.corpo, anexos: v.anexos, inicio: new Date(), fim, contasAte: input.contasAte ? new Date(input.contasAte) : null, criadoPor: c.usuario.id });
        await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "correio_global", detalhes: { id: Number(r.insertId), titulo: input.titulo, anexos: v.anexos }, resultado: "ok", ip: ipDaRequisicao(c.req) });
        return { ok: true, global: true, id: Number(r.insertId) };
      }
      const alvo = await usuarioPorPub(input.para);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada." });
      const chave = "admin:" + Date.now().toString(36) + ":" + Math.random().toString(36).slice(2, 8);
      await poeCarta(alvo.id, { tipo: input.tipo, titulo: input.titulo, corpo: input.corpo, anexos: v.anexos, chave, expiraEm: fim, origemAdminId: c.usuario.id });
      if (!v.anexos.length) await notifica(alvo.id, { categoria: "sistema", titulo: input.titulo, corpo: input.corpo, refTipo: "correio", chave: "aviso:" + chave });
      await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "correio_enviar", alvoId: alvo.id, detalhes: { titulo: input.titulo, anexos: v.anexos }, resultado: "ok", ip: ipDaRequisicao(c.req) });
      return { ok: true, global: false };
    }),

  correioGlobalListar: adminAutenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAdmin;
    exigePermissao(c, "enviar_itens");
    return getDb().query.correioGlobal.findMany({ orderBy: [desc(correioGlobal.criadoEm)], limit: 100 });
  }),
  correioGlobalAtivo: adminAutenticado.input(z.object({ id: z.number().int(), ativo: z.boolean() })).mutation(async ({ ctx, input }) => {
    const c = ctx as unknown as CtxAdmin;
    exigePermissao(c, "distribuir_global");
    await getDb().update(correioGlobal).set({ ativo: input.ativo }).where(eq(correioGlobal.id, input.id));
    await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "correio_global_" + (input.ativo ? "ligar" : "desligar"), detalhes: { id: input.id }, resultado: "ok", ip: ipDaRequisicao(c.req) });
    return { ok: true };
  }),

  // o aviso do sistema (aparece em MENSAGENS › SISTEMA): para uma conta, ou para todos (vira uma carta para todos sem anexo)
  aviso: adminAutenticado
    .input(z.object({ para: z.string().regex(/^(todos|\d{1,9})$/), titulo: z.string().trim().min(3).max(80), corpo: z.string().max(600).default(""), dias: z.number().int().min(1).max(30).default(7) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAdmin;
      exigePermissao(c, "gerenciar_eventos");
      const fim = new Date(Date.now() + input.dias * 864e5);
      if (input.para === "todos") {
        const [r] = await getDb().insert(correioGlobal).values({ tipo: "manutencao", titulo: input.titulo, corpo: input.corpo, anexos: [], inicio: new Date(), fim, criadoPor: c.usuario.id });
        await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "aviso_todos", detalhes: { id: Number(r.insertId), titulo: input.titulo }, resultado: "ok", ip: ipDaRequisicao(c.req) });
        return { ok: true, global: true };
      }
      const alvo = await usuarioPorPub(input.para);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada." });
      await notifica(alvo.id, { categoria: "sistema", titulo: input.titulo, corpo: input.corpo, refTipo: "aviso", expiraEm: fim });
      await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "aviso", alvoId: alvo.id, detalhes: { titulo: input.titulo }, resultado: "ok", ip: ipDaRequisicao(c.req) });
      return { ok: true, global: false };
    }),
});
