// ============================================================================
// RACHA v88 — a CENTRAL DE EVENTOS: os eventos moram no banco (tabela eventos) e o RACHA CONTROL cria e muda (admin88);
// se não houver nenhum, o servidor cria os padrão (contracts/v88.ts: eventosPadrao — o login diário, o desafio, a copa,
// a temporada e um presente de boas-vindas). Cada evento mostra o nome, o desenho, a duração, as regras e as recompensas;
// o progresso é o que o servidor contou (as cartas de login coletadas, as missões especiais, o presente pego).
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, lte, gt, asc } from "drizzle-orm";
import { createRouter } from "../../middleware";
import { getDb } from "../../queries/connection";
import { eventos, correio, missoesProgresso } from "@db/schema";
import { autenticado, exigeLimite } from "../guard";
import { contaDe, type Conn } from "./comum";
import { poeCarta } from "./correio";
import { eventosPadrao, missoesDoEvento, validaAnexos } from "@contracts/v88";

export async function garanteEventos(db: Conn = getDb()): Promise<void> {
  const um = await db.query.eventos.findFirst({ columns: { id: true } });
  if (um) return;
  for (const e of eventosPadrao()) {
    try { await db.insert(eventos).values({ ...e, ativo: true }); } catch (_) { /* (outra chamada criou ao mesmo tempo) */ }
  }
}

// o que o jogo pode ver da config (sem nada interno)
function configPublica(tipo: string, c: Record<string, unknown>) {
  const o: Record<string, unknown> = {};
  if (tipo === "login" && Array.isArray(c.dias)) o.dias = c.dias;
  if (Array.isArray(c.presente)) o.presente = c.presente;
  if (typeof c.acao === "string") o.acao = c.acao;
  if (c.ofertas && typeof c.ofertas === "object") o.ofertas = c.ofertas;
  return o;
}

export const eventosRouter = createRouter({
  listar: autenticado.query(async ({ ctx }) => {
    const u = contaDe(ctx);
    const db = getDb();
    await garanteEventos();
    const agora = new Date();
    const l = await db.query.eventos.findMany({ where: and(eq(eventos.ativo, true), lte(eventos.inicio, agora), gt(eventos.fim, agora)), orderBy: [asc(eventos.ordem), asc(eventos.id)], limit: 30 });
    const out = [];
    for (const ev of l) {
      const base = { id: ev.id, slug: ev.slug, tipo: ev.tipo, nome: ev.nome, descricao: ev.descricao, regras: ev.regras, imagem: ev.imagem, inicio: ev.inicio, fim: ev.fim, config: configPublica(ev.tipo, ev.config) };
      let progresso: Record<string, unknown> = {};
      if (ev.tipo === "login") {
        const cartas = (await db.query.correio.findMany({ where: and(eq(correio.usuarioId, u.id), eq(correio.tipo, "login")), columns: { chave: true, coletadoEm: true } }))
          .filter((c) => c.chave.startsWith("login:" + ev.slug + ":"));
        progresso = { dias: cartas.length, coletados: cartas.filter((c) => c.coletadoEm).length };
      }
      const ms = missoesDoEvento({ slug: ev.slug, config: ev.config });
      if (ms.length) {
        const rows = await db.query.missoesProgresso.findMany({ where: and(eq(missoesProgresso.usuarioId, u.id), eq(missoesProgresso.periodo, "E:" + ev.slug)) });
        progresso.missoes = ms.map((m) => { const r = rows.find((x) => x.missao === m.id); return { id: m.id, nome: m.nome, meta: m.meta, progresso: r ? r.progresso : 0, premio: m.premio, coletada: !!r?.coletadaEm }; });
      }
      if (Array.isArray((ev.config as { presente?: unknown }).presente)) {
        progresso.presentePego = !!(await db.query.correio.findFirst({ where: and(eq(correio.usuarioId, u.id), eq(correio.chave, "evento:" + ev.slug + ":presente")) }));
      }
      out.push({ ...base, progresso });
    }
    return out;
  }),

  // o presente de um evento temporário: vai para o correio (uma vez por conta, durante o evento)
  pegarPresente: autenticado.input(z.object({ slug: z.string().max(40) })).mutation(async ({ ctx, input }) => {
    const u = contaDe(ctx);
    await exigeLimite(`coleta:${u.id}`, 60, 60 * 1000, "Calma: muitas coletas seguidas.");
    const agora = new Date();
    const ev = await getDb().query.eventos.findFirst({ where: and(eq(eventos.slug, input.slug), eq(eventos.ativo, true), lte(eventos.inicio, agora), gt(eventos.fim, agora)) });
    if (!ev) throw new TRPCError({ code: "NOT_FOUND", message: "Esse evento não está valendo agora." });
    const v = validaAnexos((ev.config as { presente?: unknown }).presente);
    if (!v.ok || !v.anexos.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Esse evento não tem presente." });
    const novo = await poeCarta(u.id, { tipo: "evento", titulo: "Presente: " + ev.nome, corpo: ev.descricao, anexos: v.anexos, chave: "evento:" + ev.slug + ":presente", expiraEm: ev.fim, avisar: false });
    return { ok: true, jaPegou: !novo };
  }),
});
