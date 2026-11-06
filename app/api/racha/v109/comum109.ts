// ============================================================================
// RACHA v109 — o que os dois painéis (o do Dono e o da staff) usam junto: achar o jogador, o silêncio do chat que está
// valendo, as punições da ficha e os textos de tempo.
// ============================================================================
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { getDb } from "../../queries/connection";
import { usuarios, punicoes } from "@db/schema";
import { NOME_CARGO, type Cargo } from "@contracts/racha";
import { auditar, ipDaRequisicao, type CtxAdmin } from "../guard";

export type Usuario = typeof usuarios.$inferSelect;

// o jogador pelo ID público (000123 ou 123) ou pelo usuário — como no resto do RACHA CONTROL
export async function acharJogador(termo: string): Promise<Usuario | undefined> {
  const db = getDb();
  const limpo = termo.trim();
  const num = /^0*\d{1,9}$/.test(limpo) ? Number(limpo) : null;
  if (num !== null && num > 0) {
    const porId = await db.query.usuarios.findFirst({ where: eq(usuarios.idPublico, num) });
    if (porId) return porId;
  }
  return db.query.usuarios.findFirst({ where: eq(usuarios.username, limpo.toLowerCase()) });
}
export async function jogadorOuErro(termo: string): Promise<Usuario> {
  const u = await acharJogador(termo);
  if (!u) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
  return u;
}

// o silêncio do chat que está valendo agora (o mais longo, se tiver mais de um)
export type SilencioAtivo = { id: number; ate: number; motivo: string };
export async function silencioAtivo(usuarioId: number): Promise<SilencioAtivo | null> {
  const l = await getDb().query.punicoes.findMany({
    where: and(eq(punicoes.usuarioId, usuarioId), eq(punicoes.tipo, "silencio"), eq(punicoes.ativa, true), gt(punicoes.expiraEm, new Date())),
    orderBy: [desc(punicoes.expiraEm)],
    limit: 1,
  });
  const p = l[0];
  return p && p.expiraEm ? { id: p.id, ate: p.expiraEm.getTime(), motivo: p.motivo } : null;
}

// "9 min", "3 horas", "5 dias" (o que falta, para cima)
export function duracaoTexto(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.ceil(min / 60);
  if (h < 48) return h === 1 ? "1 hora" : `${h} horas`;
  return `${Math.ceil(h / 24)} dias`;
}
// a data e a hora de Brasília (o painel e as mensagens do jogo)
export function dataHora(t: number | Date): string {
  try {
    return new Date(t).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return new Date(t).toISOString().slice(0, 16).replace("T", " ");
  }
}
export const nomeCargo = (c: string | null | undefined) => (c && c in NOME_CARGO ? NOME_CARGO[c as Cargo] : c || "—");

// a auditoria de uma ação do painel (o Dono vê tudo o que a staff faz)
export async function registra(c: CtxAdmin, acao: string, alvoId: number | null, detalhes: Record<string, unknown> = {}, resultado: "ok" | "negado" | "erro" = "ok") {
  await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao, alvoId, detalhes, resultado, ip: ipDaRequisicao(c.req) });
}
// a ação negada (sem permissão, acima do teto do cargo): fica na auditoria — o Dono vê quem tentou o quê — e o erro sai
export async function nega(c: CtxAdmin, acao: string, alvoId: number | null, mensagem: string, detalhes: Record<string, unknown> = {}): Promise<never> {
  await registra(c, acao, alvoId, { ...detalhes, motivo: mensagem }, "negado");
  throw new TRPCError({ code: "FORBIDDEN", message: mensagem });
}
