// ============================================================================
// RACHA v84 — Economia 100% no servidor
// ----------------------------------------------------------------------------
// O cliente NUNCA define saldo. Toda movimentação passa por movimentar():
//   1) trava a linha da carteira (SELECT ... FOR UPDATE) dentro de transação
//   2) dedup por operacaoId (recompensa repetida não é paga duas vezes)
//   3) UPDATE atômico com guarda de saldo não-negativo (e teto anti-overflow)
//   4) registra a transação (auditoria completa: antes → depois, motivo, ref)
// Saldos vivem em `carteiras`; o histórico imutável em `transacoes`.
// ============================================================================
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { carteiras, transacoes } from "../../db/schema";
import { CARTEIRA_INICIAL } from "../../contracts/loja";

export interface Carteira {
  usuarioId: number;
  moedas: number;
  gemas: number;
}

export interface Movimento {
  usuarioId: number;
  moedasDelta?: number;
  gemasDelta?: number;
  tipo: string;                       // ex.: recompensa, compra, troca, ajuste_admin, migracao
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

// Carteira com criação preguiçosa: conta nova começa com o saldo inicial oficial.
export async function carteiraDo(usuarioId: number): Promise<Carteira> {
  const db = getDb();
  await db
    .insert(carteiras)
    .values({ usuarioId, moedas: CARTEIRA_INICIAL.moedas, gemas: CARTEIRA_INICIAL.gemas })
    .onDuplicateKeyUpdate({ set: { usuarioId } });
  const linhas = await db.execute<{ usuario_id: number; moedas: number; gemas: number }>(
    sql`SELECT usuario_id, moedas, gemas FROM carteiras WHERE usuario_id = ${usuarioId} LIMIT 1`
  );
  const l = (linhas as unknown as [unknown])[0] as { usuario_id: number; moedas: number; gemas: number }[];
  const c = l[0];
  return { usuarioId, moedas: Number(c.moedas), gemas: Number(c.gemas) };
}

export async function movimentar(m: Movimento): Promise<ResultadoMovimento> {
  const dM = Math.trunc(m.moedasDelta || 0);
  const dG = Math.trunc(m.gemasDelta || 0);
  if (!dM && !dG) return { ok: false, erro: "Movimento vazio." };
  if (!m.motivo || !m.motivo.trim()) return { ok: false, erro: "Toda movimentação exige motivo registrado." };

  const db = getDb();
  return db.transaction(async (tx) => {
    // 1) trava a carteira do jogador até o fim da transação
    await tx.execute(
      sql`SELECT usuario_id FROM carteiras WHERE usuario_id = ${m.usuarioId} FOR UPDATE`
    );
    // garante existência (conta antiga migrando sob demanda)
    await tx
      .insert(carteiras)
      .values({ usuarioId: m.usuarioId, moedas: CARTEIRA_INICIAL.moedas, gemas: CARTEIRA_INICIAL.gemas })
      .onDuplicateKeyUpdate({ set: { usuarioId: m.usuarioId } });

    // 2) dedup: mesma operação já aplicada? devolve o resultado dela
    const ja = await tx.execute<{ m: number; g: number }>(
      sql`SELECT moedas_depois AS m, gemas_depois AS g FROM transacoes WHERE operacao_id = ${m.operacaoId} LIMIT 1`
    );
    const jaL = (ja as unknown as [unknown])[0] as { m: number; g: number }[];
    if (jaL.length) {
      return { ok: true as const, moedas: Number(jaL[0].m), gemas: Number(jaL[0].g), duplicada: true };
    }

    // 3) UPDATE atômico: saldo nunca negativo, nunca acima do teto
    const upd = await tx.execute(
      sql`UPDATE carteiras
          SET moedas = moedas + ${dM}, gemas = gemas + ${dG}, atualizado_em = NOW()
          WHERE usuario_id = ${m.usuarioId}
            AND moedas + ${dM} >= 0 AND gemas + ${dG} >= 0
            AND moedas + ${dM} <= ${TETO} AND gemas + ${dG} <= ${TETO}`
    );
    const affected = Number((upd as unknown as [{ affectedRows?: number }])[0]?.affectedRows || 0);
    if (!affected) return { ok: false as const, erro: "Saldo insuficiente." };

    // 4) saldo depois + registro imutável da transação
    const depois = await tx.execute<{ m: number; g: number }>(
      sql`SELECT moedas AS m, gemas AS g FROM carteiras WHERE usuario_id = ${m.usuarioId} LIMIT 1`
    );
    const dL = (depois as unknown as [unknown])[0] as { m: number; g: number }[];
    const mDepois = Number(dL[0].m);
    const gDepois = Number(dL[0].g);

    await tx.insert(transacoes).values({
      operacaoId: m.operacaoId,
      usuarioId: m.usuarioId,
      moedasDelta: dM,
      gemasDelta: dG,
      moedasDepois: mDepois,
      gemasDepois: gDepois,
      tipo: m.tipo.slice(0, 24),
      motivo: m.motivo.slice(0, 200),
      refTipo: m.refTipo?.slice(0, 24),
      refId: m.refId?.slice(0, 60),
      adminId: m.adminId,
    });

    return { ok: true as const, moedas: mDepois, gemas: gDepois, duplicada: false };
  });
}

// Resumo para o painel RACHA CONTROL (economia): números reais do banco.
export async function resumoEconomia(): Promise<{
  moedasTotal: number;
  gemasTotal: number;
  carteiras: number;
  transacoesHoje: number;
}> {
  const db = getDb();
  const r = await db.execute<{ moedas: number; gemas: number; n: number }>(
    sql`SELECT COALESCE(SUM(moedas),0) AS moedas, COALESCE(SUM(gemas),0) AS gemas, COUNT(*) AS n FROM carteiras`
  );
  const l = (r as unknown as [unknown])[0] as { moedas: number; gemas: number; n: number }[];
  const hoje = await db.execute<{ n: number }>(
    sql`SELECT COUNT(*) AS n FROM transacoes WHERE criada_em >= CURDATE()`
  );
  const hl = (hoje as unknown as [unknown])[0] as { n: number }[];
  return {
    moedasTotal: Number(l[0]?.moedas || 0),
    gemasTotal: Number(l[0]?.gemas || 0),
    carteiras: Number(l[0]?.n || 0),
    transacoesHoje: Number(hl[0]?.n || 0),
  };
}
