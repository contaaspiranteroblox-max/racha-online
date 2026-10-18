// ============================================================================
// RACHA v88 — o que uma partida VÁLIDA (já conferida pelo jogoRouter: token, prazo, plausibilidade e, na online, o selo
// da sala) e o treino rendem na conta: as moedas (as mesmas regras do jogo, com o teto do dia), as missões, o XP do passe e
// o melhor da partida. Nada aqui confia no aparelho além do que o jogoRouter já validou; na online, quem jogou junto e o
// melhor da partida vêm do selo assinado pelo servidor das salas.
// ============================================================================
import { sql } from "drizzle-orm";
import { getDb } from "../../queries/connection";
import { movimentar, garanteCarteira } from "../economia";
import { contaMissoes } from "./missoes";
import { daXpPasse, idsAmigos, usuarioPorPub, pub6 } from "./comum";
import { moedasDaPartida, xpPasseDaPartida, mvpPlausivel, premioExercicio, premioNivel, PREMIO, CATALOGO, temporadaAtiva, EVENTO_VAZIO } from "@contracts/v88";

const linhas = <T>(r: unknown): T[] => ((r as unknown as [unknown])[0] as T[]) || [];
async function moedasHoje(usuarioId: number, tipos: string[]): Promise<number> {
  let t = 0;
  for (const tipo of tipos) {
    const l = linhas<{ s: number }>(await getDb().execute(sql`SELECT COALESCE(SUM(moedas_delta), 0) AS s FROM transacoes WHERE usuario_id = ${usuarioId} AND tipo = ${tipo} AND criada_em >= UTC_DATE()`));
    t += Number(l[0]?.s || 0);
  }
  return t;
}

export type Selo88 = { g?: unknown; v?: unknown } | null;
export type Resultado88 = {
  carteira: { moedas: number; gemas: number } | null; moedas: number; tetoMoedas: boolean;
  missoes: { id: string; nome: string }[]; passe: { xp: number; nivel: number; subiu: boolean } | null;
  mvp: boolean; jogadores: string[] | null; amigoNaPartida: boolean; temporada: string | null;
};

export async function recompensaPartida(usuarioId: number, idPublico: number, matchId: string, o: {
  resultado: "vitoria" | "derrota" | "empate"; gols: number; assistencias: number; placarNosso: number; ranqueada: boolean; online: boolean; mvp?: boolean; selo: Selo88;
}): Promise<Resultado88> {
  // quem jogou junto (o selo da sala online) e se havia amigo; o melhor da partida (na online, o do servidor das salas)
  const eu = pub6(idPublico);
  const jogadores = o.online && o.selo && Array.isArray(o.selo.g) ? (o.selo.g as unknown[]).filter((x): x is string => typeof x === "string" && /^\d{6,9}$/.test(x) && x !== eu).slice(0, 8) : null;
  let amigo = false;
  if (jogadores && jogadores.length) {
    const meus = new Set(await idsAmigos(usuarioId));
    for (const pj of jogadores) { const x = await usuarioPorPub(pj); if (x && meus.has(x.id)) { amigo = true; break; } }
  }
  const mvp = o.online ? !!(o.selo && Number(o.selo.v) === 1) : mvpPlausivel({ mvp: !!o.mvp, gols: o.gols, assistencias: o.assistencias, resultado: o.resultado, placarNosso: o.placarNosso });
  // as moedas (o teto do dia das partidas)
  const cheio = moedasDaPartida({ resultado: o.resultado, gols: o.gols });
  const ja = await moedasHoje(usuarioId, ["partida"]);
  const moedas = Math.max(0, Math.min(cheio, PREMIO.moedasDiaPartidas - ja));
  let carteira: Resultado88["carteira"] = null;
  if (moedas > 0) {
    const r = await movimentar({ usuarioId, moedasDelta: moedas, tipo: "partida", motivo: "Partida " + (o.resultado === "vitoria" ? "vencida" : o.resultado === "empate" ? "empatada" : "jogada") + (o.gols ? " · " + o.gols + " gol(s)" : ""), refTipo: "partida", refId: matchId, operacaoId: "partida:" + matchId });
    if (r.ok) carteira = { moedas: r.moedas, gemas: r.gemas };
  }
  if (!carteira) { const c = await garanteCarteira(usuarioId); carteira = { moedas: c.moedas, gemas: c.gemas }; }
  // as missões e o passe
  const missoes = await contaMissoes(usuarioId, { ...EVENTO_VAZIO, partida: 1, vitoria: o.resultado === "vitoria" ? 1 : 0, gols: o.gols, assistencias: o.assistencias, ranqueada: o.ranqueada ? 1 : 0, amigo: amigo ? 1 : 0 });
  const passe = temporadaAtiva() ? await daXpPasse(usuarioId, xpPasseDaPartida(o.resultado)) : null;
  return { carteira, moedas, tetoMoedas: moedas < cheio, missoes, passe, mvp, jogadores, amigoNaPartida: amigo, temporada: temporadaAtiva() ? CATALOGO.temporada.id : null };
}

// o gol do treino que conta (o mesmo teto do XP do treino): as moedas do treino livre, a missão e o XP do passe
export async function recompensaGolTreino(usuarioId: number, validos: number, origem: "livre" | "treino", ref: string) {
  let carteira: { moedas: number; gemas: number } | null = null, moedas = 0;
  if (validos > 0 && origem === "livre") {
    const hoje = linhas<{ n: number }>(await getDb().execute(sql`SELECT COUNT(*) AS n FROM transacoes WHERE usuario_id = ${usuarioId} AND tipo = 'treino_gol' AND criada_em >= UTC_DATE()`));
    const pagos = Number(hoje[0]?.n || 0);
    const total = await moedasHoje(usuarioId, ["treino", "treino_gol"]);
    if (pagos < PREMIO.golLivreDia && total < PREMIO.moedasDiaTreino) {
      moedas = Math.min(PREMIO.golLivre * validos, PREMIO.moedasDiaTreino - total);
      const r = await movimentar({ usuarioId, moedasDelta: moedas, tipo: "treino_gol", motivo: "Gol no treino livre", refTipo: "treino", refId: ref, operacaoId: "treino-gol:" + usuarioId + ":" + ref });
      if (r.ok) carteira = { moedas: r.moedas, gemas: r.gemas };
    }
  }
  const missoes = validos > 0 ? await contaMissoes(usuarioId, { ...EVENTO_VAZIO, treino_gols: validos }) : [];
  const passe = validos > 0 && temporadaAtiva() ? await daXpPasse(usuarioId, validos * CATALOGO.temporada.xp.golTreino) : null;
  if (!carteira) { const c = await garanteCarteira(usuarioId); carteira = { moedas: c.moedas, gemas: c.gemas }; }
  return { moedas, carteira, missoes, passe };
}

// o fim de um exercício do treino (as estrelas): cheio nas 3 primeiras do dia em cada exercício, depois reduzido, com o teto do dia
export async function recompensaExercicio(usuarioId: number, exercicio: string, estrelas: number, recorde: boolean, nonce: string) {
  const hoje = linhas<{ n: number }>(await getDb().execute(sql`SELECT COUNT(*) AS n FROM transacoes WHERE usuario_id = ${usuarioId} AND tipo = 'treino' AND ref_id = ${exercicio} AND criada_em >= UTC_DATE()`));
  const vez = Number(hoje[0]?.n || 0) + 1;
  const tres = linhas<{ n: number }>(await getDb().execute(sql`SELECT COUNT(*) AS n FROM transacoes WHERE usuario_id = ${usuarioId} AND ref_tipo = 'treino3' AND ref_id = ${exercicio}`));
  const p = premioExercicio(estrelas, vez, recorde, Number(tres[0]?.n || 0) === 0);
  const total = await moedasHoje(usuarioId, ["treino", "treino_gol"]);
  const moedas = Math.max(0, Math.min(p.moedas, PREMIO.moedasDiaTreino - total));
  let carteira: { moedas: number; gemas: number } | null = null;
  if (moedas > 0 || p.gemas > 0) {
    const r = await movimentar({ usuarioId, moedasDelta: moedas, gemasDelta: p.gemas, tipo: "treino", motivo: "Treino: " + exercicio + " (" + estrelas + " estrela" + (estrelas === 1 ? "" : "s") + ")", refTipo: p.gemas ? "treino3" : "treino", refId: exercicio, operacaoId: "treino:" + usuarioId + ":" + nonce });
    if (r.ok) carteira = { moedas: r.moedas, gemas: r.gemas };
  }
  if (!carteira) { const c = await garanteCarteira(usuarioId); carteira = { moedas: c.moedas, gemas: c.gemas }; }
  return { moedas, gemas: p.gemas, cheio: p.cheio, carteira, nota: p.cheio ? "" : "Prêmio reduzido: este exercício já pagou cheio " + PREMIO.exercicioCheio + " vezes hoje." };
}

// os prêmios de cada nível novo da conta (os mesmos do jogo): 100 moedas e 5 gemas, e mais 25 gemas a cada 5 níveis
export async function premiosDeNivel(usuarioId: number, antes: number, depois: number) {
  let carteira: { moedas: number; gemas: number } | null = null;
  const niveis: { n: number; moedas: number; gemas: number }[] = [];
  for (let n = antes + 1; n <= depois; n++) {
    const p = premioNivel(n);
    const r = await movimentar({ usuarioId, moedasDelta: p.moedas, gemasDelta: p.gemas, tipo: "nivel", motivo: "Nível " + n + " da conta", refTipo: "nivel", refId: String(n), operacaoId: "nivel:" + usuarioId + ":" + n });
    if (r.ok) { carteira = { moedas: r.moedas, gemas: r.gemas }; if (!r.duplicada) niveis.push({ n, ...p }); }
  }
  return { carteira, niveis };
}
