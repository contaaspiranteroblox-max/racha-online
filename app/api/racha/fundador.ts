// ============================================================================
// RACHA v96 — A TAMPINHA DOS FUNDADORES: as 30 primeiras contas que entram no jogo ganham a tampinha ultra rara (o item
// tp_fundador do catálogo e as duas peças dela: a cara Fundador e a borda Aura dos Fundadores), numerada — "Fundador nº 7
// de 30". Não está à venda (a loja não tem preço para ela: contracts/v88.ts) e não volta: o contador "fundadores" só sobe
// até 30, no mesmo UPDATE que reserva o número (dois entrando no mesmo instante nunca pegam o mesmo número nem passam de
// 30), e o item entra no inventário na mesma transação (uma conta nunca ganha duas).
// Quando: na entrada no jogo (o jogo pede loja.estado logo que a conta entra). O servidor das salas sabe quem é fundador
// pelo bilhete assinado (q.fundador, em relacoesDe) e tira as peças de quem não é (server/fundador96.js).
// O ZERAR CONTAS do Dono (contas.ts: zerarContas) devolve as vagas: as contas de teste de antes do lançamento não ficam com
// a tampinha dos jogadores de verdade (refazFundadores, no fim).
// ============================================================================
import { sql, eq, and, inArray } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { contadores, itensUsuario } from "@db/schema";

export const FUNDADORES = 30;
export const ITEM_FUNDADOR = "tp_fundador";
export const PECAS_FUNDADOR = ["peca:i:zw", "peca:b:vw"];
const CONTADOR = "fundadores";
const PECAS_TODAS = [ITEM_FUNDADOR, ...PECAS_FUNDADOR];
// (as 30 vagas acabaram: por 1 min ninguém mais pergunta ao banco — o ZERAR CONTAS pode abrir as vagas de novo, até numa
// outra cópia da plataforma)
let esgotadoAte = 0;

type Conn = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Conn["transaction"]>[0]>[0];
const linhas = <T>(r: unknown): T[] => (Array.isArray(r) ? (Array.isArray(r[0]) ? (r[0] as T[]) : (r as T[])) : []);

// As peças viajam dentro do código da tampinha (T.… — e do escudo do clube, E.…), pelo lugar nas listas do jogo: a cara
// Fundador é o ícone 86 e a Aura dos Fundadores a borda 26 (as mesmas contas do server/fundador96.js; o
// tests/v96_skins_test.py confere com o jogo). Quem não é fundador não guarda um código com elas (a tampinha da conta e o
// escudo do clube: clubeRouter) — nem pelo código montado na mão.
const TP_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const LUGAR = { borda: 26, icone: 86 } as const;
export function temPecaFundador(codigo: string | null | undefined): boolean {
  const s = String(codigo ?? "");
  if (s.length < 6 || !(s[0] === "T" || s[0] === "E") || s[1] !== ".") return false;
  let v = 0;
  for (const ch of s.slice(2, 6)) { const k = TP_B64.indexOf(ch); if (k < 0) return false; v = v * 64 + k; }   // (24 bits)
  const bit = (de: number, n: number) => (v >> (24 - de - n)) & ((1 << n) - 1);
  if (bit(0, 2) !== 0) return false;
  return bit(13, 7) === LUGAR.icone || (s[0] === "T" && bit(2, 5) === LUGAR.borda);   // (no escudo, a borda é outra lista)
}
export const AVISO_FUNDADOR = "A tampinha dos FUNDADORES é só das 30 primeiras contas que entraram no jogo (não está à venda).";
// pode guardar este código? (sem peça dos fundadores, sempre; com, só quem é fundador)
export async function podeUsarCodigo(usuarioId: number, codigo: string | null | undefined): Promise<boolean> {
  return !temPecaFundador(codigo) || (await ehFundador(usuarioId));
}

// o número do fundador (1 a 30) desta conta, ou null
export async function numeroFundador(usuarioId: number, db: Conn = getDb()): Promise<number | null> {
  const it = await db.query.itensUsuario.findFirst({ where: and(eq(itensUsuario.usuarioId, usuarioId), eq(itensUsuario.codigoItem, ITEM_FUNDADOR)) });
  if (!it) return null;
  const m = /(\d+)/.exec(String(it.origemDetalhe || ""));
  return m ? Number(m[1]) : 0;
}
export async function ehFundador(usuarioId: number, db: Conn = getDb()): Promise<boolean> {
  return (await numeroFundador(usuarioId, db)) !== null;
}

// entra no jogo: se ainda há vaga, esta conta vira fundadora (devolve o número e se foi agora); senão, null
export async function garanteFundador(usuarioId: number): Promise<{ numero: number; vagas: number; novo: boolean } | null> {
  const db = getDb();
  const ja = await numeroFundador(usuarioId, db);
  if (ja !== null) return { numero: ja, vagas: FUNDADORES, novo: false };
  if (Date.now() < esgotadoAte) return null;
  try {
    const r = await db.transaction(async (tx) => {
      await tx.insert(contadores).values({ nome: CONTADOR, valor: 0 }).onDuplicateKeyUpdate({ set: { nome: CONTADOR } });
      const up = await tx.execute(sql`UPDATE contadores SET valor = LAST_INSERT_ID(valor + 1) WHERE nome = ${CONTADOR} AND valor < ${FUNDADORES}`);
      const afetadas = Number((Array.isArray(up) ? (up[0] as { affectedRows?: number }) : (up as { affectedRows?: number }))?.affectedRows ?? 0);
      if (!afetadas) return null;                       // as 30 vagas acabaram
      const v = linhas<{ v: number | string }>(await tx.execute(sql`SELECT LAST_INSERT_ID() AS v`));
      const numero = Number(v[0]?.v ?? 0);
      if (!(numero >= 1 && numero <= FUNDADORES)) throw new Error("fundador sem número");
      const detalhe = `Fundador nº ${numero} de ${FUNDADORES}`;
      // (a chave única conta+item: se a mesma conta entrou duas vezes no mesmo instante, a segunda volta atrás inteira)
      for (const codigoItem of PECAS_TODAS) await tx.insert(itensUsuario).values({ usuarioId, codigoItem, origem: "evento", origemDetalhe: detalhe });
      return { numero, vagas: FUNDADORES, novo: true };
    });
    if (!r) esgotadoAte = Date.now() + 60_000;
    return r;
  } catch (e) {
    if (/duplicate|ER_DUP_ENTRY|1062/i.test(String((e as Error)?.message ?? e))) {
      const n = await numeroFundador(usuarioId, db);
      return n !== null ? { numero: n, vagas: FUNDADORES, novo: false } : null;
    }
    throw e;
  }
}

// ZERAR CONTAS (na transação do zerarContas, depois de apagar as outras contas e os itens delas): as vagas voltam. Se o Dono
// era fundador, ele fica com o nº 1 (os números nunca repetem: o próximo é o 2) e o contador fica em 1; senão, em 0.
export async function refazFundadores(donoId: number, tx: Tx): Promise<number> {
  const doDono = and(eq(itensUsuario.usuarioId, donoId), inArray(itensUsuario.codigoItem, PECAS_TODAS));
  const tem = (await tx.query.itensUsuario.findMany({ where: doDono })).some((i) => i.codigoItem === ITEM_FUNDADOR);
  if (tem) await tx.update(itensUsuario).set({ origemDetalhe: `Fundador nº 1 de ${FUNDADORES}` }).where(doDono);
  const valor = tem ? 1 : 0;
  await tx.insert(contadores).values({ nome: CONTADOR, valor }).onDuplicateKeyUpdate({ set: { valor } });
  esgotadoAte = 0;
  return valor;
}
