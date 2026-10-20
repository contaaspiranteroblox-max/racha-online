// ============================================================================
// RACHA v90 — AS REGRAS DO RANKING (sem banco: a plataforma usa, os testes também)
//
// As 4 categorias da temporada: GOLS, ASSISTÊNCIAS, PONTOS RANQUEADOS e CRAQUE DO JOGO.
//
// O QUE CONTA (gols, assistências e Craque do Jogo): SÓ a partida online que o SERVIDOR DAS SALAS simulou (a sala
// hospedada e a ranqueada online). O selo assinado dessa partida traz h:1, o número da partida (pid) e, para cada conta,
// os gols e as assistências que o MOTOR contou (server/partida/sala.js) — o aparelho não informa nada disso. Partida
// contra os bots, treino e sala antiga (com anfitrião) não entram nessas três categorias.
//
// O CRITÉRIO DA ASSISTÊNCIA (o mesmo do servidor desde a v83, server/partida/sala.js · lance):
//   1. o gol só existe se o servidor viu a bola inteira cruzar a linha do gol;
//   2. o AUTOR é o último a tocar na bola; se esse toque é de quem sofreu o gol, é GOL CONTRA (não conta gol nem
//      assistência para ninguém) — a não ser um desvio rápido (até 6 passos) num chute do outro time que já ia no gol;
//   3. a ASSISTÊNCIA é o toque imediatamente anterior ao do autor, se for de um COMPANHEIRO e tiver sido até 10 s
//      (600 passos de 60/s) antes do gol; toques seguidos do mesmo jogador contam como um só, então o autor nunca dá
//      assistência para si mesmo;
//   4. se um ADVERSÁRIO tocou na bola entre o passe e o gol, o toque anterior ao autor é dele: sem assistência.
//
// SEM DUPLICAR: cada (partida, conta) entra uma vez só (a chave da tabela ranking_partidas); reenviar o mesmo selo, ou
// outro selo da mesma partida, não soma de novo.
//
// PONTOS RANQUEADOS: os pontos da patente (a tabela ranqueada, com as regras da v82). No fim da temporada, o
// RECOMEÇO PARCIAL: todo mundo fica com a metade dos pontos (arredondada para baixo), uma vez por temporada.
//
// O DESEMPATE (sempre o mesmo resultado): o maior valor → quem chegou primeiro nesse valor → o menor número da conta.
// Sem imports.
// ============================================================================

export const CATEGORIAS = ["gols", "assistencias", "pontos", "craque"] as const;
export type Categoria = (typeof CATEGORIAS)[number];
export const NOME_CATEGORIA: Record<Categoria, string> = {
  gols: "GOLS",
  assistencias: "ASSISTÊNCIAS",
  pontos: "PONTOS RANQUEADOS",
  craque: "CRAQUE DO JOGO",
};
export const TOP = 20;

// o que a conta ganha de uma partida, lido do selo já conferido pela assinatura (null = a partida não entra no ranking)
export type LanceRanking = { pid: string; gols: number; assistencias: number; craque: boolean };
export function lanceDoSelo(selo: unknown): LanceRanking | null {
  if (!selo || typeof selo !== "object") return null;
  const s = selo as Record<string, unknown>;
  if (s.h !== 1) return null; // não foi o servidor que simulou
  if (typeof s.pid !== "string" || !/^p[a-z0-9]{3,12}$/.test(s.pid)) return null;
  const n = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 99 ? v : -1);
  const gols = n(s.gl), assistencias = n(s.as);
  if (gols < 0 || assistencias < 0) return null;
  const placar = Array.isArray(s.p) ? Number(s.p[0]) : NaN;
  if (!Number.isFinite(placar) || gols > placar || assistencias > placar) return null; // ninguém faz mais que o próprio time
  return { pid: s.pid, gols, assistencias, craque: Number(s.v) === 1 };
}

// a ordem do ranking (a mesma no banco e aqui): valor ↓, quem chegou antes ↑, conta ↑
export type LinhaOrdem = { usuarioId: number; valor: number; em: number };
export function comparaRanking(a: LinhaOrdem, b: LinhaOrdem): number {
  return b.valor - a.valor || a.em - b.em || a.usuarioId - b.usuarioId;
}
export function ordenaRanking<T extends LinhaOrdem>(l: T[]): T[] {
  return l.slice().sort(comparaRanking);
}

// o recomeço parcial da ranqueada no fim da temporada
export const recomecoParcial = (pts: number) => Math.max(0, Math.floor(Math.max(0, pts) / 2));

// as temporadas: estados e datas
export type EstadoTemporada = "ativa" | "fechando" | "fechada";
export function temporadaVigente(t: { inicio: number; fim: number }, agora: number): boolean {
  return agora >= t.inicio && agora < t.fim;
}
export function podeFechar(t: { fim: number; estado: EstadoTemporada }, agora: number): string {
  if (t.estado === "fechada") return "Essa temporada já foi fechada.";
  if (agora < t.fim) return "A temporada ainda não acabou.";
  return "";
}

// ---------------------------------------------------------------- as recompensas do TOP 3 (só cosméticas)
// Cada categoria tem as suas: a tampinha exclusiva (1º, 2º e 3º diferentes), o banner e o título. Os ids existem no
// catálogo (app/contracts/catalogo88.json, raridade "exclusivo", fora da loja). Nada aqui muda velocidade, chute ou
// colisão: todos os jogadores continuam com o mesmo tamanho, a mesma física e o mesmo chute.
export type PremioTop = { tampinha: string; banner: string; titulo: string };
export const PREMIOS_TOP: Record<Categoria, [PremioTop, PremioTop, PremioTop]> = {
  gols: [
    { tampinha: "tp_rk_gols_1", banner: "banner_rk_gols_1", titulo: "Artilheiro da Temporada" },
    { tampinha: "tp_rk_gols_2", banner: "banner_rk_gols_2", titulo: "Vice-artilheiro da Temporada" },
    { tampinha: "tp_rk_gols_3", banner: "banner_rk_gols_3", titulo: "3º Artilheiro da Temporada" },
  ],
  assistencias: [
    { tampinha: "tp_rk_assist_1", banner: "banner_rk_assist_1", titulo: "Garçom da Temporada" },
    { tampinha: "tp_rk_assist_2", banner: "banner_rk_assist_2", titulo: "Vice-garçom da Temporada" },
    { tampinha: "tp_rk_assist_3", banner: "banner_rk_assist_3", titulo: "3º Garçom da Temporada" },
  ],
  pontos: [
    { tampinha: "tp_rk_pontos_1", banner: "banner_rk_pontos_1", titulo: "Rei da Ranqueada" },
    { tampinha: "tp_rk_pontos_2", banner: "banner_rk_pontos_2", titulo: "Vice-rei da Ranqueada" },
    { tampinha: "tp_rk_pontos_3", banner: "banner_rk_pontos_3", titulo: "3º da Ranqueada" },
  ],
  craque: [
    { tampinha: "tp_rk_craque_1", banner: "banner_rk_craque_1", titulo: "Craque da Temporada" },
    { tampinha: "tp_rk_craque_2", banner: "banner_rk_craque_2", titulo: "Vice-craque da Temporada" },
    { tampinha: "tp_rk_craque_3", banner: "banner_rk_craque_3", titulo: "3º Craque da Temporada" },
  ],
};
export const premioDe = (cat: Categoria, posicao: number): PremioTop | null => (posicao >= 1 && posicao <= 3 ? PREMIOS_TOP[cat][posicao - 1] : null);
// o título com a temporada (o que aparece no perfil)
export const tituloComTemporada = (p: PremioTop, temporadaNome: string) => p.titulo + " · " + temporadaNome;
