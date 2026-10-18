// ============================================================================
// RACHA v88 — o que as rotas novas dividem: o cartão público de um jogador, as relações da conta (amigos, bloqueios,
// privacidade — o servidor das salas usa para o status online, os convites, o chat dos amigos e o bloqueio), os avisos
// da central de mensagens (com o aviso na hora pelo servidor das salas, quando ele está montado aqui) e a entrega de
// prêmios (moedas, gemas, itens, XP do passe) dentro de uma transação.
// ============================================================================
import { eq, and, or, inArray, desc } from "drizzle-orm";
import { getDb } from "../../queries/connection";
import { usuarios, amizades, bloqueios, mensagens, clubeMembros, selos, ranqueada, passeTemporada } from "@db/schema";
import { avisaConta, relacoesMudaram, type RelacoesConta } from "../../lib/salas";
import { formatarIdPublico, tituloPorNivel } from "@contracts/racha";
import { patenteDe } from "@contracts/patentes";
import { CATALOGO, itemCat, nivelPasse, type Anexo } from "@contracts/v88";
import { movimentar, entregarItens } from "../economia";
import type { CtxAutenticado, UsuarioSessao } from "../guard";

type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type Conn = Db | Tx;

export const pub6 = (n: number | string) => formatarIdPublico(Number(n));
export const contaDe = (ctx: unknown) => (ctx as CtxAutenticado).usuario;
export const MAX_AMIGOS = 100;

// ---------------------------------------------------------------- o cartão público (o que os outros podem ver)
export type Cartao = {
  idPublico: string; nome: string; nivel: number; titulo: string; tampa: string | null; selos: string[];
  avatar: string; banner: string; patente: string | null; clube: string | null; bio: string | null;
};
export function equipadosDe(u: { equipados?: Record<string, string> | null }): Record<string, string> {
  const e = (u.equipados && typeof u.equipados === "object" ? u.equipados : {}) as Record<string, string>;
  const out: Record<string, string> = {};
  for (const tipo of CATALOGO.tiposEquipaveis) {
    const c = e[tipo];
    const it = c ? itemCat(c) : undefined;
    out[tipo] = it && it.tipo === tipo ? c : CATALOGO.padroes[tipo];
  }
  return out;
}
export async function cartaoDe(u: UsuarioSessao, db: Conn = getDb(), extra?: { selos?: string[]; pts?: number | null; clube?: string | null }): Promise<Cartao> {
  const meusSelos = extra?.selos ?? (await db.query.selos.findMany({ where: eq(selos.usuarioId, u.id) })).map((s) => s.selo);
  let pts = extra?.pts;
  if (pts === undefined) pts = (await db.query.ranqueada.findFirst({ where: eq(ranqueada.usuarioId, u.id) }))?.pts ?? null;
  const eq88 = equipadosDe(u);
  return {
    idPublico: pub6(u.idPublico), nome: u.nomeExibicao, nivel: u.nivel, titulo: u.tituloEquipado || tituloPorNivel(u.nivel), tampa: u.tampa ?? null,
    selos: meusSelos, avatar: eq88.avatar, banner: eq88.banner, patente: pts === null ? null : patenteDe(pts).titulo,
    clube: extra?.clube ?? null, bio: u.bio ?? null,
  };
}
export async function cartoesDe(ids: number[], db: Conn = getDb()): Promise<Map<number, Cartao>> {
  const out = new Map<number, Cartao>();
  const unicos = [...new Set(ids.filter((x) => Number.isFinite(x)))];
  if (!unicos.length) return out;
  const us = await db.query.usuarios.findMany({ where: inArray(usuarios.id, unicos) });
  const ss = await db.query.selos.findMany({ where: inArray(selos.usuarioId, unicos) });
  const rs = await db.query.ranqueada.findMany({ where: inArray(ranqueada.usuarioId, unicos) });
  for (const u of us) {
    if (u.excluidoEm) continue;
    out.set(u.id, await cartaoDe(u, db, { selos: ss.filter((s) => s.usuarioId === u.id).map((s) => s.selo), pts: rs.find((r) => r.usuarioId === u.id)?.pts ?? null }));
  }
  return out;
}

// ---------------------------------------------------------------- as relações (para o servidor das salas)
export async function relacoesDe(usuarioId: number, db: Conn = getDb()): Promise<RelacoesConta | null> {
  const u = await db.query.usuarios.findFirst({ where: eq(usuarios.id, usuarioId) });
  if (!u || u.excluidoEm) return null;
  const am = await db.query.amizades.findMany({ where: eq(amizades.usuarioId, usuarioId) });
  const bl = await db.query.bloqueios.findMany({ where: or(eq(bloqueios.usuarioId, usuarioId), eq(bloqueios.bloqueadoId, usuarioId)) });
  const outros = [...new Set([...am.map((a) => a.amigoId), ...bl.map((b) => (b.usuarioId === usuarioId ? b.bloqueadoId : b.usuarioId))])];
  const us = outros.length ? await db.query.usuarios.findMany({ where: inArray(usuarios.id, outros) }) : [];
  const pubDe = new Map(us.map((x) => [x.id, pub6(x.idPublico)]));
  const membro = await db.query.clubeMembros.findFirst({ where: eq(clubeMembros.usuarioId, usuarioId) });
  return {
    amigos: am.map((a) => pubDe.get(a.amigoId)).filter((x): x is string => !!x).slice(0, MAX_AMIGOS),
    bloqueios: [...new Set(bl.map((b) => pubDe.get(b.usuarioId === usuarioId ? b.bloqueadoId : b.usuarioId)).filter((x): x is string => !!x))].slice(0, 300),
    mostraOnline: u.mostraOnline !== false,
    aceitaConvites: u.aceitaConvites !== false,
    clube: membro ? "p" + membro.clubeId : null,
    cos: equipadosDe(u),
  };
}
export async function relacoesPorPub(pub: string): Promise<RelacoesConta | null> {
  const n = Number(pub);
  if (!Number.isFinite(n) || n < 1) return null;
  const u = await getDb().query.usuarios.findFirst({ where: eq(usuarios.idPublico, n) });
  return u ? relacoesDe(u.id) : null;
}
// a amizade, o bloqueio ou a privacidade mudou: o servidor das salas (montado aqui) já passa a valer na hora
export async function empurraRelacoes(...usuarioIds: number[]): Promise<void> {
  for (const id of [...new Set(usuarioIds)]) {
    try {
      const u = await getDb().query.usuarios.findFirst({ where: eq(usuarios.id, id) });
      if (u) relacoesMudaram(pub6(u.idPublico), await relacoesDe(id));
    } catch (_) { /* o aviso é melhor-esforço: o jogo também pede um bilhete novo */ }
  }
}

// ---------------------------------------------------------------- a central de mensagens
export type Notificacao = {
  categoria: "sistema" | "amigos" | "clube" | "convites" | "recompensas";
  titulo: string; corpo?: string; deId?: number | null; refTipo?: string; refId?: string | number; chave?: string; expiraEm?: Date | null;
};
export async function notifica(usuarioId: number, n: Notificacao, db: Conn = getDb()): Promise<boolean> {
  try {
    await db.insert(mensagens).values({
      usuarioId, categoria: n.categoria, titulo: n.titulo.slice(0, 80), corpo: (n.corpo || "").slice(0, 600), deId: n.deId ?? null,
      refTipo: n.refTipo ?? null, refId: n.refId === undefined ? null : String(n.refId).slice(0, 60), chave: n.chave ? n.chave.slice(0, 80) : null, expiraEm: n.expiraEm ?? null,
    });
  } catch (e) {
    if (/duplicate|ER_DUP_ENTRY|1062/i.test(String((e as Error)?.message ?? e))) return false;   // (a mesma mensagem já estava lá)
    throw e;
  }
  try {
    const u = await db.query.usuarios.findFirst({ where: eq(usuarios.id, usuarioId) });
    if (u) avisaConta(u.idPublico, { type: "conta_aviso", categoria: n.categoria, titulo: n.titulo.slice(0, 80), ref: n.refTipo || "" });
  } catch (_) { /* o aviso na hora é melhor-esforço */ }
  return true;
}
export async function avisaSo(usuarioId: number, msg: Record<string, unknown>) {   // (sem gravar mensagem: só o empurrão na hora)
  try {
    const u = await getDb().query.usuarios.findFirst({ where: eq(usuarios.id, usuarioId) });
    if (u) avisaConta(u.idPublico, msg);
  } catch (_) { /* melhor-esforço */ }
}

// ---------------------------------------------------------------- o passe (o XP entra aqui; as trilhas no passeRouter)
export async function estadoPasse(usuarioId: number, db: Conn = getDb()) {
  const T = CATALOGO.temporada;
  let p = await db.query.passeTemporada.findFirst({ where: and(eq(passeTemporada.usuarioId, usuarioId), eq(passeTemporada.temporada, T.id)) });
  if (!p) {
    await db.insert(passeTemporada).values({ usuarioId, temporada: T.id, xp: 0, coletadas: { g: [], p: [] } }).onDuplicateKeyUpdate({ set: { usuarioId } });
    p = await db.query.passeTemporada.findFirst({ where: and(eq(passeTemporada.usuarioId, usuarioId), eq(passeTemporada.temporada, T.id)) });
  }
  return p!;
}
export async function daXpPasse(usuarioId: number, xp: number, db: Conn = getDb()): Promise<{ xp: number; nivel: number; subiu: boolean }> {
  const q = Math.max(0, Math.min(50000, Math.floor(xp)));
  const p = await estadoPasse(usuarioId, db);
  const T = CATALOGO.temporada;
  const agora = Date.now();
  if (!q || agora < Date.parse(T.inicio) || agora >= Date.parse(T.fim)) return { xp: p.xp, nivel: nivelPasse(p.xp).nivel, subiu: false };
  const teto = T.xpPorNivel * T.niveis;
  const novo = Math.min(teto, p.xp + q);
  await db.update(passeTemporada).set({ xp: novo, atualizadoEm: new Date() }).where(and(eq(passeTemporada.usuarioId, usuarioId), eq(passeTemporada.temporada, T.id)));
  return { xp: novo, nivel: nivelPasse(novo).nivel, subiu: nivelPasse(novo).nivel > nivelPasse(p.xp).nivel };
}

// ---------------------------------------------------------------- a entrega de prêmios (o correio, as missões, o passe, os eventos)
export type Entregue = { moedas: number; gemas: number; xpPasse: number; itens: string[]; jaTinha: string[]; carteira: { moedas: number; gemas: number } | null };
export async function entregaAnexos(tx: Tx, usuarioId: number, anexos: Anexo[], operacao: string, motivo: string, origem: string): Promise<Entregue> {
  let moedas = 0, gemas = 0, xpPasse = 0;
  const itens: string[] = [];
  for (const a of anexos) {
    if (a.tipo === "moedas") moedas += a.qtd;
    else if (a.tipo === "gemas") gemas += a.qtd;
    else if (a.tipo === "xp_passe") xpPasse += a.qtd;
    else if (a.tipo === "item" && a.codigo) {
      const it = itemCat(a.codigo);
      if (it && it.tipo === "caixa") {                         // a caixa (conteúdo fixo, mostrado antes): vira o que tem dentro
        for (const c of it.conteudo || []) { if (c.tipo === "moedas") moedas += c.qtd; else if (c.tipo === "gemas") gemas += c.qtd; }
      } else itens.push(a.codigo);
    }
  }
  let carteira: Entregue["carteira"] = null;
  if (moedas || gemas) {
    const r = await movimentar({ usuarioId, moedasDelta: moedas, gemasDelta: gemas, tipo: origem, motivo, refTipo: origem, refId: operacao.slice(0, 60), operacaoId: operacao.slice(0, 80) }, tx);
    if (!r.ok) throw new Error(r.erro);
    carteira = { moedas: r.moedas, gemas: r.gemas };
  }
  const novos = itens.length ? await entregarItens(usuarioId, itens, origem, motivo, tx) : [];
  if (xpPasse) await daXpPasse(usuarioId, xpPasse, tx);
  return { moedas, gemas, xpPasse, itens: novos, jaTinha: itens.filter((c) => !novos.includes(c)), carteira };
}

// os amigos (ids internos) de uma conta
export async function idsAmigos(usuarioId: number, db: Conn = getDb()): Promise<number[]> {
  return (await db.query.amizades.findMany({ where: eq(amizades.usuarioId, usuarioId) })).map((a) => a.amigoId);
}
export async function usuarioPorPub(pub: string | number, db: Conn = getDb()) {
  const n = Number(pub);
  if (!Number.isFinite(n) || n < 1) return undefined;
  const u = await db.query.usuarios.findFirst({ where: eq(usuarios.idPublico, n) });
  return u && !u.excluidoEm ? u : undefined;
}

// ---------------------------------------------------------------- a denúncia de uma mensagem do chat (o servidor das salas manda)
// vai para a mesma tabela do RACHA CONTROL, com o canal e o texto (a mesma conta, o mesmo alvo e o mesmo motivo: uma vez por dia)
export async function denunciaDoChat(d: { autor: string; alvo: string; motivo: string; texto: string; canal: string; mid?: string; sala?: string }): Promise<void> {
  const { denuncias } = await import("@db/schema");
  const { MOTIVOS_DENUNCIA, chaveDenuncia, MOTIVO_TEXTO, DENUNCIA } = await import("@contracts/v88");
  const { gt, count } = await import("drizzle-orm");
  const autor = await usuarioPorPub(d.autor), alvo = await usuarioPorPub(d.alvo);
  if (!autor || !alvo || autor.id === alvo.id) return;
  const motivo = (MOTIVOS_DENUNCIA as readonly string[]).includes(d.motivo) ? (d.motivo as (typeof MOTIVOS_DENUNCIA)[number]) : "ofensa";
  // as mesmas travas da denúncia pelo perfil: conta nova espera, o limite do dia, e quem teve denúncias arquivadas demais
  const db = getDb();
  const dono = await db.query.usuarios.findFirst({ where: eq(usuarios.id, autor.id), columns: { criadoEm: true } });
  if (!dono || Date.now() - dono.criadoEm.getTime() < DENUNCIA.minutosContaNova * 60 * 1000) return;
  const [hoje] = await db.select({ n: count() }).from(denuncias).where(and(eq(denuncias.autorId, autor.id), gt(denuncias.criadaEm, new Date(Date.now() - 864e5))));
  if (Number(hoje?.n || 0) >= DENUNCIA.porDia) return;
  const [arq] = await db.select({ n: count() }).from(denuncias).where(and(eq(denuncias.autorId, autor.id), eq(denuncias.estado, "arquivada"), gt(denuncias.criadaEm, new Date(Date.now() - 30 * 864e5))));
  if (Number(arq?.n || 0) >= DENUNCIA.arquivadasParaAbuso) return;
  try {
    await getDb().insert(denuncias).values({
      autorId: autor.id, alvoId: alvo.id, motivo, detalhes: ("Mensagem: " + d.texto).slice(0, 500),
      contexto: { origem: "chat", canal: d.canal, mid: d.mid || null, sala: d.sala || null, motivoTexto: MOTIVO_TEXTO[motivo] },
      chave: chaveDenuncia(autor.id, alvo.id, motivo + ":chat"),
    });
  } catch (e) {
    if (!/duplicate|ER_DUP_ENTRY|1062/i.test(String((e as Error)?.message ?? e))) throw e;
  }
}
