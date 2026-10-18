// ============================================================================
// RACHA v88 — o CORREIO: cartas com moedas, gemas, itens e XP do passe. COLETAR é conferido aqui: a carta é da conta, não
// venceu, ainda não foi coletada (a marca e o prêmio entram na mesma transação; o livro da carteira tem a operação
// "correio:<id>", que não paga duas vezes). Chegam no correio: a recompensa de login do dia (o evento de login ativo), as
// cartas para todo mundo do RACHA CONTROL (manutenção, compensação, presente — cada conta recebe a sua cópia quando abre o
// jogo), os prêmios de evento e de temporada e, quando o servidor liga (RACHA_PRESENTE_TESTE), o presente de teste.
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, isNull, lte, or, gt } from "drizzle-orm";
import { createRouter } from "../../middleware";
import { getDb } from "../../queries/connection";
import { correio, correioGlobal, eventos, usuarios, type AnexoCorreio } from "@db/schema";
import { autenticado, exigeLimite, type UsuarioSessao } from "../guard";
import { contaDe, entregaAnexos, notifica, type Conn } from "./comum";
import { diaUtc, validaAnexos, type Anexo } from "@contracts/v88";
import { garanteEventos } from "./eventos";

const DIA = 864e5;
type TipoCarta = (typeof correio.$inferInsert)["tipo"];

// pôr uma carta no correio de uma conta (a chave impede a repetida)
export async function poeCarta(usuarioId: number, c: { tipo: TipoCarta; titulo: string; corpo?: string; anexos: Anexo[]; chave: string; expiraEm?: Date | null; origemAdminId?: number | null; avisar?: boolean }, db: Conn = getDb()): Promise<boolean> {
  try {
    await db.insert(correio).values({
      usuarioId, tipo: c.tipo, titulo: c.titulo.slice(0, 80), corpo: (c.corpo || "").slice(0, 600), anexos: c.anexos as AnexoCorreio[],
      chave: c.chave.slice(0, 80), expiraEm: c.expiraEm ?? new Date(Date.now() + 30 * DIA), origemAdminId: c.origemAdminId ?? null,
    });
  } catch (e) {
    if (/duplicate|ER_DUP_ENTRY|1062/i.test(String((e as Error)?.message ?? e))) return false;
    throw e;
  }
  if (c.avisar !== false && c.anexos.length) {
    await notifica(usuarioId, { categoria: "recompensas", titulo: "Carta nova: " + c.titulo.slice(0, 60), corpo: "Abra o CORREIO e toque em COLETAR.", refTipo: "correio", chave: "carta:" + c.chave.slice(0, 70) }, db);
  }
  return true;
}

// o login do dia (o prêmio do evento de login ativo), as cartas para todo mundo e o presente de teste: uma vez cada
export async function materializaCorreio(u: UsuarioSessao): Promise<void> {
  const db = getDb();
  const agora = new Date();
  // 1) as cartas para todo mundo que estão valendo
  const globais = await db.query.correioGlobal.findMany({
    where: and(eq(correioGlobal.ativo, true), lte(correioGlobal.inicio, agora), or(isNull(correioGlobal.fim), gt(correioGlobal.fim, agora))),
    limit: 50,
  });
  for (const g of globais) {
    if (g.contasAte && u.criadoEm.getTime() > g.contasAte.getTime()) continue;
    const nova = await poeCarta(u.id, { tipo: g.tipo, titulo: g.titulo, corpo: g.corpo, anexos: g.anexos as Anexo[], chave: "global:" + g.id, expiraEm: g.fim ?? new Date(Date.now() + 30 * DIA), origemAdminId: g.criadoPor, avisar: false }, db);
    // o aviso para todo mundo (manutenção, sistema) também aparece na central de mensagens, em SISTEMA
    if (nova) await notifica(u.id, { categoria: (g.anexos || []).length ? "recompensas" : "sistema", titulo: g.titulo, corpo: g.corpo, refTipo: "correio", chave: "global:" + g.id, expiraEm: g.fim }, db);
  }
  // 2) a recompensa de login do dia (o evento de login que está ativo: o próximo prêmio da lista dele)
  await garanteEventos(db);
  const logins = await db.query.eventos.findMany({ where: and(eq(eventos.tipo, "login"), eq(eventos.ativo, true), lte(eventos.inicio, agora), gt(eventos.fim, agora)), limit: 3 });
  for (const ev of logins) {
    const dias = Array.isArray((ev.config as { dias?: unknown }).dias) ? ((ev.config as { dias: Record<string, unknown>[] }).dias) : [];
    if (!dias.length) continue;
    const chaveHoje = "login:" + ev.slug + ":" + diaUtc(agora);
    const ja = await db.query.correio.findFirst({ where: and(eq(correio.usuarioId, u.id), eq(correio.chave, chaveHoje)) });
    if (ja) continue;
    const anteriores = (await db.query.correio.findMany({ where: and(eq(correio.usuarioId, u.id), eq(correio.tipo, "login")), columns: { chave: true } }))
      .filter((c) => c.chave.startsWith("login:" + ev.slug + ":")).length;
    const n = anteriores % dias.length;
    const d = dias[n] || {};
    const anexos: Anexo[] = [];
    if (Number(d.moedas) > 0) anexos.push({ tipo: "moedas", qtd: Math.floor(Number(d.moedas)) });
    if (Number(d.gemas) > 0) anexos.push({ tipo: "gemas", qtd: Math.floor(Number(d.gemas)) });
    if (typeof d.item === "string") anexos.push({ tipo: "item", qtd: 1, codigo: d.item });
    const v = validaAnexos(anexos);
    if (!v.ok || !v.anexos.length) continue;
    await poeCarta(u.id, { tipo: "login", titulo: "Recompensa de login · dia " + (n + 1), corpo: "Valeu por voltar à quebrada! O prêmio do " + (n + 1) + "º dia do " + ev.nome + " chegou.", anexos: v.anexos, chave: chaveHoje, expiraEm: new Date(Date.now() + 7 * DIA), avisar: false }, db);
  }
  // 3) o presente de teste (moedas e gemas para testar a loja) — só quando o servidor liga: RACHA_PRESENTE_TESTE=1 (ou "moedas,gemas")
  const pt = process.env.RACHA_PRESENTE_TESTE;
  if (pt && pt !== "0") {
    const [m, g] = pt.includes(",") ? pt.split(",").map((x) => Math.floor(Number(x) || 0)) : [50000, 5000];
    const anexos: Anexo[] = [];
    if (m > 0) anexos.push({ tipo: "moedas", qtd: Math.min(1000000, m) });
    if (g > 0) anexos.push({ tipo: "gemas", qtd: Math.min(50000, g) });
    if (anexos.length) await poeCarta(u.id, { tipo: "presente", titulo: "Presente de teste", corpo: "Moedas e gemas para experimentar a loja à vontade. (Presente de teste: no lançamento ele não existe.)", anexos, chave: "presente-teste-v88", avisar: false }, db);
  }
}

const formata = (c: typeof correio.$inferSelect) => ({
  id: c.id, tipo: c.tipo, titulo: c.titulo, corpo: c.corpo, anexos: c.anexos || [], criadoEm: c.criadoEm, expiraEm: c.expiraEm,
  lido: !!c.lidoEm, coletado: !!c.coletadoEm, coletadoEm: c.coletadoEm,
});

async function coletaUma(usuarioId: number, id: number) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [c] = await tx.select().from(correio).where(and(eq(correio.id, id), eq(correio.usuarioId, usuarioId))).for("update");
    if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "Carta não encontrada." });
    if (c.coletadoEm) throw new TRPCError({ code: "CONFLICT", message: "Essa carta já foi coletada." });
    if (c.expiraEm && c.expiraEm.getTime() < Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "Essa carta venceu." });
    const anexos = (c.anexos || []) as Anexo[];
    if (!anexos.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Essa carta não tem nada para coletar." });
    const [up] = await tx.update(correio).set({ coletadoEm: new Date(), lidoEm: c.lidoEm ?? new Date() }).where(and(eq(correio.id, c.id), isNull(correio.coletadoEm)));
    if (!Number((up as { affectedRows?: number }).affectedRows)) throw new TRPCError({ code: "CONFLICT", message: "Essa carta já foi coletada." });
    const r = await entregaAnexos(tx, usuarioId, anexos, "correio:" + c.id, "Correio: " + c.titulo, "correio");
    return { id: c.id, ...r };
  });
}

export const correioRouter = createRouter({
  listar: autenticado.query(async ({ ctx }) => {
    const u = contaDe(ctx);
    await materializaCorreio(u);
    const l = await getDb().query.correio.findMany({ where: eq(correio.usuarioId, u.id), orderBy: [desc(correio.criadoEm), desc(correio.id)], limit: 100 });
    const agora = Date.now();
    return l.filter((c) => !c.expiraEm || c.expiraEm.getTime() > agora || c.coletadoEm).map(formata);
  }),
  marcarLido: autenticado.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    const u = contaDe(ctx);
    await getDb().update(correio).set({ lidoEm: new Date() }).where(and(eq(correio.id, input.id), eq(correio.usuarioId, u.id), isNull(correio.lidoEm)));
    return { ok: true };
  }),
  coletar: autenticado.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    const u = contaDe(ctx);
    await exigeLimite(`coleta:${u.id}`, 60, 60 * 1000, "Calma: muitas coletas seguidas.");
    return coletaUma(u.id, input.id);
  }),
  coletarTodas: autenticado.mutation(async ({ ctx }) => {
    const u = contaDe(ctx);
    await exigeLimite(`coleta-todas:${u.id}`, 10, 60 * 1000, "Calma: muitas coletas seguidas.");
    const agora = Date.now();
    const l = (await getDb().query.correio.findMany({ where: and(eq(correio.usuarioId, u.id), isNull(correio.coletadoEm)), limit: 100 }))
      .filter((c) => (c.anexos || []).length && (!c.expiraEm || c.expiraEm.getTime() > agora));
    const tot = { cartas: 0, moedas: 0, gemas: 0, xpPasse: 0, itens: [] as string[], carteira: null as null | { moedas: number; gemas: number } };
    for (const c of l) {
      try {
        const r = await coletaUma(u.id, c.id);
        tot.cartas++; tot.moedas += r.moedas; tot.gemas += r.gemas; tot.xpPasse += r.xpPasse; tot.itens.push(...r.itens);
        if (r.carteira) tot.carteira = r.carteira;
      } catch (_) { /* (coletada em outro aparelho no meio): segue */ }
    }
    return tot;
  }),
  apagar: autenticado.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    const u = contaDe(ctx);
    const db = getDb();
    const c = await db.query.correio.findFirst({ where: and(eq(correio.id, input.id), eq(correio.usuarioId, u.id)) });
    if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "Carta não encontrada." });
    if ((c.anexos || []).length && !c.coletadoEm && (!c.expiraEm || c.expiraEm.getTime() > Date.now())) throw new TRPCError({ code: "BAD_REQUEST", message: "Colete o prêmio antes de apagar a carta." });
    await db.delete(correio).where(eq(correio.id, c.id));
    return { ok: true };
  }),
});
