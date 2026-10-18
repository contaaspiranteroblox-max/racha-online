// ============================================================================
// RACHA v84/v88 — Economia 100% no servidor
// ----------------------------------------------------------------------------
// O cliente NUNCA define saldo. Toda movimentação passa por movimentar():
//   1) trava a linha da carteira (SELECT ... FOR UPDATE) dentro de transação
//   2) dedup por operacaoId (recompensa repetida não é paga duas vezes)
//   3) UPDATE atômico com guarda de saldo não-negativo (e teto anti-overflow)
//   4) registra a transação (auditoria completa: antes → depois, motivo, ref)
// Saldos vivem em `carteiras`; o histórico imutável em `transacoes`.
// v88: o módulo passou a ser usado (a loja, o correio, as missões, o passe, as partidas e o treino da v88): o import do
// banco foi corrigido (era "../db", que não existe), movimentar() aceita a transação de quem chama (a compra paga e entrega
// o item na MESMA transação), entregarItens() grava itens no inventário e garanteCarteira() cria a carteira — na primeira
// vez de uma conta antiga, com o saldo e as peças da cópia do progresso dela (uma vez, com teto: ver MIGRACAO_TETO).
// ============================================================================
import { sql, eq, and } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { carteiras, transacoes, itensUsuario, progressoJogo } from "@db/schema";
import { CARTEIRA_INICIAL } from "@contracts/loja";
import { existeCodigo, codigoPeca, PECAS } from "@contracts/v88";

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Conn = Db | Tx;

export interface Carteira {
  usuarioId: number;
  moedas: number;
  gemas: number;
}

export interface Movimento {
  usuarioId: number;
  moedasDelta?: number;
  gemasDelta?: number;
  tipo: string;                       // ex.: recompensa, compra, troca, ajuste_admin, migracao, correio, missao, passe
  motivo: string;
  refTipo?: string;                   // ex.: partida, treino, loja, troca
  refId?: string;                     // ex.: matchId
  operacaoId: string;                 // id único da operação (dedup)
  adminId?: number;                   // quem executou, quando ajuste administrativo
}

export type ResultadoMovimento =
  | { ok: true; moedas: number; gemas: number; duplicada: boolean }
  | { ok: false; erro: string };

const TETO = 1000000000; // teto anti-overflow (int unsigned)
// v88: a migração da conta antiga (o saldo que estava no aparelho, copiado na conta pela v82) entra uma vez, com teto: é o
// valor que o próprio aparelho dizia ter (o servidor não tinha como conferir), então passa só até o presente de teste da v87.2
export const MIGRACAO_TETO = { moedas: 50000, gemas: 5000, pecas: 200 } as const;

const linhas = <T>(r: unknown): T[] => ((r as unknown as [unknown])[0] as T[]) || [];

// a carteira com criação preguiçosa (v88: na primeira vez, a migração da cópia do progresso)
export async function garanteCarteira(usuarioId: number, db: Conn = getDb()): Promise<Carteira> {
  const ja = linhas<{ moedas: number; gemas: number }>(await db.execute(sql`SELECT moedas, gemas FROM carteiras WHERE usuario_id = ${usuarioId} LIMIT 1`));
  if (ja.length) return { usuarioId, moedas: Number(ja[0].moedas), gemas: Number(ja[0].gemas) };
  // a cópia do progresso (v82): a chave da conta do jogo (streetball-conta-v1) tem as moedas, as gemas e as peças
  let moedas: number = CARTEIRA_INICIAL.moedas, gemas: number = CARTEIRA_INICIAL.gemas, pecas: string[] = [], migrou = false;
  try {
    const p = await db.query.progressoJogo.findFirst({ where: eq(progressoJogo.usuarioId, usuarioId) });
    const bruto = p?.dados?.chaves?.["streetball-conta-v1"];
    if (bruto) {
      const c = JSON.parse(bruto) as { moedas?: unknown; gemas?: unknown; pecas?: unknown };
      if (Number.isFinite(Number(c.moedas))) moedas = Math.max(0, Math.min(MIGRACAO_TETO.moedas, Math.floor(Number(c.moedas))));
      if (Number.isFinite(Number(c.gemas))) gemas = Math.max(0, Math.min(MIGRACAO_TETO.gemas, Math.floor(Number(c.gemas))));
      if (Array.isArray(c.pecas)) pecas = c.pecas.filter((k): k is string => typeof k === "string").slice(0, MIGRACAO_TETO.pecas);
      migrou = true;
    }
  } catch (_) { /* cópia ilegível: começa com o saldo inicial */ }
  try {
    await db.insert(carteiras).values({ usuarioId, moedas, gemas, migradoEm: migrou ? new Date() : null });
  } catch (e) {
    if (!/duplicate|ER_DUP_ENTRY|1062/i.test(String((e as Error)?.message ?? e))) throw e;
    return garanteCarteira(usuarioId, db);                // (outra chamada criou ao mesmo tempo)
  }
  await db.insert(transacoes).values({
    operacaoId: `carteira:${usuarioId}`, usuarioId, moedasDelta: moedas, gemasDelta: gemas, moedasDepois: moedas, gemasDepois: gemas,
    tipo: migrou ? "migracao" : "inicial", motivo: migrou ? "Saldo da cópia do progresso (v82) levado para a carteira da conta, com teto" : "Saldo inicial da conta",
  }).onDuplicateKeyUpdate({ set: { usuarioId } });
  if (pecas.length) {
    const validas = new Set(PECAS.filter((p) => p.raridade !== "gratis").map((p) => p.k));
    const codigos = [...new Set(pecas.filter((k) => validas.has(k)).map((k) => codigoPeca(k)))];
    if (codigos.length) await entregarItens(usuarioId, codigos, "migracao", "Peças da cópia do progresso", db);
  }
  return { usuarioId, moedas, gemas };
}

// Carteira com criação preguiçosa (o nome de antes, para quem já chamava)
export async function carteiraDo(usuarioId: number): Promise<Carteira> {
  return garanteCarteira(usuarioId);
}

// os itens no inventário da conta (o que já tinha fica como está: a mesma peça não entra duas vezes)
export async function entregarItens(usuarioId: number, codigos: string[], origem: string, detalhe: string, db: Conn = getDb()): Promise<string[]> {
  const novos: string[] = [];
  for (const codigo of codigos) {
    if (!existeCodigo(codigo)) continue;
    const ja = await db.query.itensUsuario.findFirst({ where: and(eq(itensUsuario.usuarioId, usuarioId), eq(itensUsuario.codigoItem, codigo)) });
    if (ja) continue;
    try {
      await db.insert(itensUsuario).values({ usuarioId, codigoItem: codigo, origem: origem.slice(0, 20), origemDetalhe: detalhe.slice(0, 80) });
      novos.push(codigo);
    } catch (e) {
      if (!/duplicate|ER_DUP_ENTRY|1062/i.test(String((e as Error)?.message ?? e))) throw e;
    }
  }
  return novos;
}

async function movimentarEm(tx: Conn, m: Movimento, dM: number, dG: number): Promise<ResultadoMovimento> {
  await garanteCarteira(m.usuarioId, tx);
  // 1) trava a carteira do jogador até o fim da transação
  await tx.execute(sql`SELECT usuario_id FROM carteiras WHERE usuario_id = ${m.usuarioId} FOR UPDATE`);
  // 2) dedup: mesma operação já aplicada? devolve o resultado dela
  const jaL = linhas<{ m: number; g: number }>(await tx.execute(sql`SELECT moedas_depois AS m, gemas_depois AS g FROM transacoes WHERE operacao_id = ${m.operacaoId} LIMIT 1`));
  if (jaL.length) return { ok: true as const, moedas: Number(jaL[0].m), gemas: Number(jaL[0].g), duplicada: true };
  // 3) UPDATE atômico: saldo nunca negativo, nunca acima do teto
  const upd = await tx.execute(
    sql`UPDATE carteiras
        SET moedas = moedas + ${dM}, gemas = gemas + ${dG}, atualizado_em = NOW()
        WHERE usuario_id = ${m.usuarioId}
          AND moedas + ${dM} >= 0 AND gemas + ${dG} >= 0
          AND moedas + ${dM} <= ${TETO} AND gemas + ${dG} <= ${TETO}`,
  );
  const affected = Number((upd as unknown as [{ affectedRows?: number }])[0]?.affectedRows || 0);
  if (!affected) return { ok: false as const, erro: "Saldo insuficiente." };
  // 4) saldo depois + registro imutável da transação
  const dL = linhas<{ m: number; g: number }>(await tx.execute(sql`SELECT moedas AS m, gemas AS g FROM carteiras WHERE usuario_id = ${m.usuarioId} LIMIT 1`));
  const mDepois = Number(dL[0].m), gDepois = Number(dL[0].g);
  await tx.insert(transacoes).values({
    operacaoId: m.operacaoId, usuarioId: m.usuarioId, moedasDelta: dM, gemasDelta: dG, moedasDepois: mDepois, gemasDepois: gDepois,
    tipo: m.tipo.slice(0, 24), motivo: m.motivo.slice(0, 200), refTipo: m.refTipo?.slice(0, 24), refId: m.refId?.slice(0, 60), adminId: m.adminId,
  });
  return { ok: true as const, moedas: mDepois, gemas: gDepois, duplicada: false };
}

// v88: tx = a transação de quem chama (a compra, a coleta…); sem ela, abre uma só para o movimento
export async function movimentar(m: Movimento, tx?: Tx): Promise<ResultadoMovimento> {
  const dM = Math.trunc(m.moedasDelta || 0);
  const dG = Math.trunc(m.gemasDelta || 0);
  if (!dM && !dG) return { ok: false, erro: "Movimento vazio." };
  if (!m.motivo || !m.motivo.trim()) return { ok: false, erro: "Toda movimentação exige motivo registrado." };
  if (tx) return movimentarEm(tx, m, dM, dG);
  return getDb().transaction(async (t) => movimentarEm(t, m, dM, dG));
}

// Resumo para o painel RACHA CONTROL (economia): números reais do banco.
export async function resumoEconomia(): Promise<{
  moedasTotal: number;
  gemasTotal: number;
  carteiras: number;
  transacoesHoje: number;
}> {
  const db = getDb();
  const l = linhas<{ moedas: number; gemas: number; n: number }>(await db.execute(sql`SELECT COALESCE(SUM(moedas),0) AS moedas, COALESCE(SUM(gemas),0) AS gemas, COUNT(*) AS n FROM carteiras`));
  const hl = linhas<{ n: number }>(await db.execute(sql`SELECT COUNT(*) AS n FROM transacoes WHERE criada_em >= CURDATE()`));
  return {
    moedasTotal: Number(l[0]?.moedas || 0),
    gemasTotal: Number(l[0]?.gemas || 0),
    carteiras: Number(l[0]?.n || 0),
    transacoesHoje: Number(hl[0]?.n || 0),
  };
}
