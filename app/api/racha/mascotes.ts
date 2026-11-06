// ============================================================================
// RACHA v106 — AS MASCOTES: as 6 tampinhas à venda na LOJA › TAMPINHAS › MASCOTES (os itens tp_m_* do catálogo) trazem
// duas peças que viajam dentro do código da tampinha (T.… — e do escudo do clube, E.…), pelo lugar nas listas do jogo: a
// CARA de cada mascote (os ícones 87 a 92, na ordem abaixo) e a borda MEDALHÃO (a borda 28, que vem com qualquer
// mascote). As mesmas contas do server/mascotes106.js (o tests/v106_mascotes_servidor_test.mjs confere com o jogo).
// - as relações da conta levam as mascotes compradas (relacoesDe: mascotes; no bilhete assinado, m): o servidor das salas
//   tira as peças de quem não comprou (como a tampinha dos fundadores);
// - quem não tem a mascote não guarda um código com as peças dela: a tampinha da conta e o escudo do clube (clubeRouter) —
//   nem pelo código montado na mão (o jogo já não deixa montar).
// ============================================================================
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { itensUsuario } from "@db/schema";

export const MASCOTES = [
  { item: "tp_m_arara", icone: 87 },
  { item: "tp_m_oncapreta", icone: 88 },
  { item: "tp_m_mico", icone: 89 },
  { item: "tp_m_guara", icone: 90 },
  { item: "tp_m_tucano", icone: 91 },
  { item: "tp_m_jacare", icone: 92 },
] as const;
export const BORDA_MEDALHAO = 28;
export const ITENS_MASCOTE: string[] = MASCOTES.map((m) => m.item);
export const AVISO_MASCOTE = "Essa peça vem com uma mascote da LOJA (TAMPINHAS › MASCOTES): compre a mascote para usar.";
export const ehItemMascote = (codigo: string) => ITENS_MASCOTE.includes(codigo);

type Conn = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Conn["transaction"]>[0]>[0];
// v110: a leitura aceita também a transação (o relacoesDe do v88/comum.ts chama com ela; o "tsc -b" do CI recusava)
type Leitura = Conn | Tx;
const TP_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// as peças de mascote que o código usa: o item da cara (ou null) e se usa a Medalhão — null: nenhuma
export function pecasDeMascote(codigo: string | null | undefined): { item: string | null; medalhao: boolean } | null {
  const s = String(codigo ?? "");
  if (s.length < 6 || !(s[0] === "T" || s[0] === "E") || s[1] !== ".") return null;
  let v = 0;
  for (const ch of s.slice(2, 6)) { const k = TP_B64.indexOf(ch); if (k < 0) return null; v = v * 64 + k; }   // (24 bits)
  const bit = (de: number, n: number) => (v >> (24 - de - n)) & ((1 << n) - 1);
  if (bit(0, 2) !== 0) return null;
  const icone = bit(13, 7), m = MASCOTES.find((x) => x.icone === icone);
  const medalhao = s[0] === "T" && bit(2, 5) === BORDA_MEDALHAO;   // (no escudo, a borda é outra lista)
  return m || medalhao ? { item: m ? m.item : null, medalhao } : null;
}
// as mascotes da conta (os itens tp_m_* do inventário)
export async function mascotesDaConta(usuarioId: number, db: Leitura = getDb()): Promise<string[]> {
  const its = await db.query.itensUsuario.findMany({
    where: and(eq(itensUsuario.usuarioId, usuarioId), inArray(itensUsuario.codigoItem, ITENS_MASCOTE)), columns: { codigoItem: true },
  });
  return [...new Set(its.map((i) => i.codigoItem))];
}
// pode guardar este código? (sem peça de mascote, sempre; a cara pede a mascote dela; a Medalhão, qualquer mascote)
export async function podeUsarMascote(usuarioId: number, codigo: string | null | undefined): Promise<boolean> {
  const p = pecasDeMascote(codigo);
  if (!p) return true;
  const tem = await mascotesDaConta(usuarioId);
  if (!tem.length) return false;
  return !p.item || tem.includes(p.item);
}
