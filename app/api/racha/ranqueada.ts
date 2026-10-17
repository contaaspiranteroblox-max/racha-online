// ============================================================================
// RACHA v82 — A patente da ranqueada na conta (somente no servidor)
// As regras são as de contracts/patentes.ts (as mesmas do jogo). Cada mudança roda numa transação: a linha da conta
// fica presa (SELECT … FOR UPDATE) enquanto a conta é feita, e cada partida muda a patente uma vez só (o evento é
// guardado com a referência — o matchId — e uma segunda chamada devolve o que já foi feito).
// O que conta:
//   · contra os bots: o placar que o jogo mandou (o servidor confere o tempo e o ritmo, não cada lance), com o teto do
//     dia (RQ_LIMITES.botsPorDia) no que se ganha;
//   · online: só com o selo do servidor das salas que diz "ranqueada" e o tamanho do time (jogoRouter confere);
//   · desistência: −25 (contra os bots e online);
//   · a patente do aparelho: uma vez por conta, até RQ_LIMITES.importarAte.
// ============================================================================
import { and, desc, asc, eq, gt, ne, sql } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { ranqueada, ranqueadaEventos, usuarios } from "@db/schema";
import {
  pontuaRanqueada,
  patenteDe,
  patenteImportada,
  normalizaEstado,
  type EstadoRanqueada,
  type PartidaRanqueada,
} from "@contracts/patentes";

const hojeUTC = () => new Date().toISOString().slice(0, 10);

export type InfoPatentePublica = { id: string; nome: string; divisao: string; titulo: string; ordem: number; min: number; prox: number | null; pct: number };

export function infoPatente(pts: number): InfoPatentePublica {
  const p = patenteDe(pts);
  return { id: p.id, nome: p.nome, divisao: p.divisao, titulo: p.titulo, ordem: p.ordem, min: p.min, prox: p.prox, pct: p.pct };
}

export type RespostaRanqueada = {
  antes: number;
  depois: number;
  delta: number;
  motivo: string;
  subiu: boolean;
  caiu: boolean;
  limitado: boolean;
  duplicada: boolean;
  patente: InfoPatentePublica;
  estado: EstadoRanqueada;
};

export type EstadoGuardado = EstadoRanqueada & { importado: boolean };

export async function estadoRanqueada(usuarioId: number): Promise<EstadoGuardado> {
  const row = await getDb().query.ranqueada.findFirst({ where: eq(ranqueada.usuarioId, usuarioId) });
  return { ...normalizaEstado(row ?? null), importado: !!row?.importado };
}

// A partida ranqueada que terminou (ou a desistência). referencia: o matchId (uma vez por partida).
export async function aplicaRanqueada(
  usuarioId: number,
  referencia: string,
  partida: PartidaRanqueada,
  extra: { online: boolean; tamanho: number | null },
): Promise<RespostaRanqueada> {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.insert(ranqueada).values({ usuarioId }).onDuplicateKeyUpdate({ set: { usuarioId } });
    const [row] = await tx.select().from(ranqueada).where(eq(ranqueada.usuarioId, usuarioId)).for("update");
    const ja = await tx
      .select()
      .from(ranqueadaEventos)
      .where(and(eq(ranqueadaEventos.usuarioId, usuarioId), eq(ranqueadaEventos.referencia, referencia)))
      .limit(1);
    if (ja.length) {
      const e = ja[0];
      const est = normalizaEstado(row);
      return {
        antes: e.antes,
        depois: e.depois,
        delta: e.delta,
        motivo: e.motivo,
        subiu: patenteDe(e.depois).ordem > patenteDe(e.antes).ordem,
        caiu: patenteDe(e.depois).ordem < patenteDe(e.antes).ordem,
        limitado: e.limitado,
        duplicada: true,
        patente: infoPatente(est.pts),
        estado: est,
      };
    }
    const hoje = hojeUTC();
    const ganhoHoje = row.botsDia === hoje ? row.botsGanho : 0;
    const r = pontuaRanqueada(row, partida, ganhoHoje);
    await tx
      .update(ranqueada)
      .set({ ...r.estado, botsDia: hoje, botsGanho: r.ganhoBots, atualizadoEm: new Date() })
      .where(eq(ranqueada.usuarioId, usuarioId));
    await tx.insert(ranqueadaEventos).values({
      usuarioId,
      referencia,
      motivo: r.motivo,
      antes: r.antes,
      delta: r.delta,
      depois: r.depois,
      online: extra.online,
      tamanho: extra.tamanho,
      limitado: r.limitado,
    });
    return {
      antes: r.antes,
      depois: r.depois,
      delta: r.delta,
      motivo: r.motivo,
      subiu: r.subiu,
      caiu: r.caiu,
      limitado: r.limitado,
      duplicada: false,
      patente: infoPatente(r.depois),
      estado: r.estado,
    };
  });
}

// A patente feita no aparelho antes da conta: uma vez por conta (mesmo que não traga nada, a vez passa).
export async function importaPatente(usuarioId: number, ptsAparelho: number): Promise<{ importou: number; estado: EstadoGuardado }> {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.insert(ranqueada).values({ usuarioId }).onDuplicateKeyUpdate({ set: { usuarioId } });
    const [row] = await tx.select().from(ranqueada).where(eq(ranqueada.usuarioId, usuarioId)).for("update");
    if (row.importado) return { importou: 0, estado: { ...normalizaEstado(row), importado: true } };
    const novo = patenteImportada(row, ptsAparelho);
    if (!novo) {
      await tx.update(ranqueada).set({ importado: true }).where(eq(ranqueada.usuarioId, usuarioId));
      return { importou: 0, estado: { ...normalizaEstado(row), importado: true } };
    }
    await tx.update(ranqueada).set({ pts: novo.pts, melhor: novo.melhor, importado: true, atualizadoEm: new Date() }).where(eq(ranqueada.usuarioId, usuarioId));
    await tx.insert(ranqueadaEventos).values({ usuarioId, referencia: "importacao", motivo: "importacao", antes: row.pts, delta: novo.pts - row.pts, depois: novo.pts });
    return { importou: novo.pts, estado: { ...novo, importado: true } };
  });
}

// O ajuste do RACHA CONTROL (corrigir quem trapaceou, devolver pontos perdidos por erro): fica no histórico da conta.
export async function ajustaPatente(usuarioId: number, pts: number, operadorId: number): Promise<EstadoGuardado> {
  const db = getDb();
  const alvo = Math.max(0, Math.min(99999, Math.floor(pts)));
  return db.transaction(async (tx) => {
    await tx.insert(ranqueada).values({ usuarioId }).onDuplicateKeyUpdate({ set: { usuarioId } });
    const [row] = await tx.select().from(ranqueada).where(eq(ranqueada.usuarioId, usuarioId)).for("update");
    const melhor = alvo >= row.pts ? Math.max(row.melhor, alvo) : alvo; // (baixar a patente apaga o "melhor" de antes)
    await tx.update(ranqueada).set({ pts: alvo, melhor, seq: 0, atualizadoEm: new Date() }).where(eq(ranqueada.usuarioId, usuarioId));
    await tx.insert(ranqueadaEventos).values({
      usuarioId,
      referencia: `ajuste:${operadorId}:${Date.now()}`.slice(0, 64),
      motivo: "ajuste",
      antes: row.pts,
      delta: alvo - row.pts,
      depois: alvo,
    });
    return { ...normalizaEstado({ ...row, pts: alvo, melhor, seq: 0 }), importado: row.importado };
  });
}

// O ranking das patentes: as contas ativas com perfil público que já jogaram a ranqueada (ou trouxeram a patente)
const noRanking = () => and(eq(usuarios.perfilPublico, true), ne(usuarios.estado, "banido"), gt(ranqueada.pts, 0));

export async function rankingPatentes(limite: number) {
  return getDb()
    .select({
      usuarioId: usuarios.id,
      idPublico: usuarios.idPublico,
      nomeExibicao: usuarios.nomeExibicao,
      avatarEmoji: usuarios.avatarEmoji,
      molduraEquipada: usuarios.molduraEquipada,
      tampa: usuarios.tampa,
      pts: ranqueada.pts,
      melhor: ranqueada.melhor,
      jogos: ranqueada.jogos,
      vit: ranqueada.vit,
    })
    .from(ranqueada)
    .innerJoin(usuarios, eq(usuarios.id, ranqueada.usuarioId))
    .where(noRanking())
    .orderBy(desc(ranqueada.pts), desc(ranqueada.melhor), asc(ranqueada.atualizadoEm))
    .limit(Math.max(1, Math.min(200, Math.floor(limite))));
}

// A posição de quem tem estes pontos (1 = o primeiro); null se a conta não entra no ranking
export async function posicaoNoRanking(pts: number): Promise<number> {
  const [r] = await getDb()
    .select({ n: sql<number>`count(*)` })
    .from(ranqueada)
    .innerJoin(usuarios, eq(usuarios.id, ranqueada.usuarioId))
    .where(and(noRanking(), gt(ranqueada.pts, pts)));
  return Number(r?.n ?? 0) + 1;
}
