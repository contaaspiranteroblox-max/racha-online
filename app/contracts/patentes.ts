// ============================================================================
// RACHA v82 — AS PATENTES DA RANQUEADA NA CONTA (as mesmas regras do jogo)
// O jogo (tools/v79/patentes.js + o rqPontua do jogo-base + o empate da v80) e a plataforma usam esta conta; aqui ela
// é a que vale para a conta: o servidor calcula os pontos de cada partida ranqueada a partir do placar e do estado
// guardado no banco (o jogo mostra a mesma conta na hora e depois acerta pelo que o servidor devolveu).
// Sem imports: o mesmo arquivo roda no servidor (esbuild), no site (vite) e nos testes (node, sem compilar).
//   · 8 patentes × 3 divisões (III → II → I): BRONZE 0 · PRATA 400 · OURO 800 · PLATINA 1.300 · DIAMANTE 1.900 ·
//     ÉLITE 2.600 · MESTRE 3.400 · LENDÁRIO 4.300 (as divisões dividem a faixa em 3, de 10 em 10; no Lendário, de 300).
//   · vitória +22, +3 por gol de diferença (até 3), +6 contra os bots mais fortes, +4 a partir de 3 vitórias seguidas;
//     derrota −14 e −2 por gol de diferença (no Bronze, a metade); empate 0 (a sequência zera); desistência −25.
//     Uma derrota (ou a desistência) não tira ninguém da patente: no máximo, da divisão.
//   · A conta também tem um teto do que se ganha CONTRA OS BOTS por dia (o servidor não confere partida contra bots:
//     ela roda no aparelho); a ranqueada online, conferida e assinada pelo servidor das salas, não tem teto.
// ============================================================================

export type Patente = { id: string; nome: string; min: number; cor: string };

// (cor: a do meio do escudo no jogo — o site usa no selo da patente)
export const PATENTES: readonly Patente[] = [
  { id: "bronze", nome: "Bronze", min: 0, cor: "#c87a4a" },
  { id: "prata", nome: "Prata", min: 400, cor: "#c3ccd8" },
  { id: "ouro", nome: "Ouro", min: 800, cor: "#ffc928" },
  { id: "platina", nome: "Platina", min: 1300, cor: "#2fd3c4" },
  { id: "diamante", nome: "Diamante", min: 1900, cor: "#3f7fff" },
  { id: "elite", nome: "Élite", min: 2600, cor: "#a64dff" },
  { id: "mestre", nome: "Mestre", min: 3400, cor: "#ff3b3b" },
  { id: "lendario", nome: "Lendário", min: 4300, cor: "#ffcb2e" },
];

export const DIVISOES = ["III", "II", "I"] as const;

export const PONTOS_RQ = { vitoria: 22, porGol: 3, dificil: 6, sequencia: 4, derrota: 14, porGolD: 2, abandono: 25 } as const;

// Os limites da conta (mude aqui): o que se ganha contra os bots por dia (UTC) e o teto da patente trazida do aparelho
export const RQ_LIMITES = { botsPorDia: 250, importarAte: 799 } as const;

// os cortes das 3 divisões de cada patente (o mesmo arredondamento do jogo)
function cortes(i: number): [number, number, number] {
  const p = PATENTES[i];
  const prox = PATENTES[i + 1];
  const faixa = prox ? prox.min - p.min : 900;
  return [p.min, p.min + Math.round(faixa / 30) * 10, p.min + Math.round((faixa * 2) / 30) * 10];
}

export type InfoPatente = {
  id: string;
  nome: string; // "Ouro"
  divisao: (typeof DIVISOES)[number]; // "II"
  titulo: string; // "OURO II"
  ordem: number; // 1 = Bronze III … 24 = Lendário I
  min: number; // o começo da divisão
  minPatente: number; // o começo da patente (a proteção da derrota)
  prox: number | null; // o começo da próxima divisão (null no topo)
  pct: number;
};

export function patenteDe(pontos: number): InfoPatente {
  const pts = Math.max(0, Math.floor(Number(pontos)) || 0);
  let i = 0;
  while (i + 1 < PATENTES.length && pts >= PATENTES[i + 1].min) i++;
  const c = cortes(i);
  let k = 0;
  while (k < 2 && pts >= c[k + 1]) k++;
  const p = PATENTES[i];
  const min = c[k];
  const prox = k < 2 ? c[k + 1] : PATENTES[i + 1] ? PATENTES[i + 1].min : null;
  return {
    id: p.id,
    nome: p.nome,
    divisao: DIVISOES[k],
    titulo: (p.nome + " " + DIVISOES[k]).toUpperCase(),
    ordem: i * 3 + k + 1,
    min,
    minPatente: p.min,
    prox,
    pct: prox ? (pts - min) / (prox - min) : 1,
  };
}

export type EstadoRanqueada = { pts: number; melhor: number; jogos: number; vit: number; der: number; emp: number; seq: number; desist: number };

export const ESTADO_RQ_INICIAL: EstadoRanqueada = { pts: 0, melhor: 0, jogos: 0, vit: 0, der: 0, emp: 0, seq: 0, desist: 0 };

export type PartidaRanqueada = {
  placarNosso: number;
  placarDeles: number;
  abandono: boolean; // saiu no meio (desistência)
  contraBots: boolean; // contra os bots (no aparelho) × online (conferida pelo servidor das salas)
  nivelBots?: string | null; // "dificil" dá o bônus contra os bots mais fortes
};

export type ResultadoRanqueada = {
  estado: EstadoRanqueada;
  antes: number;
  depois: number;
  delta: number;
  motivo: "vitoria" | "derrota" | "empate" | "desistencia";
  subiu: boolean;
  caiu: boolean;
  limitado: boolean; // o teto do dia contra os bots cortou pontos
  ganhoBots: number; // quanto já foi ganho contra os bots hoje (depois desta partida)
};

const inteiro = (v: unknown) => Math.max(0, Math.floor(Number(v)) || 0);

export function normalizaEstado(e: Partial<EstadoRanqueada> | null | undefined): EstadoRanqueada {
  const o = e ?? {};
  return {
    pts: inteiro(o.pts),
    melhor: Math.max(inteiro(o.melhor), inteiro(o.pts)),
    jogos: inteiro(o.jogos),
    vit: inteiro(o.vit),
    der: inteiro(o.der),
    emp: inteiro(o.emp),
    seq: inteiro(o.seq),
    desist: inteiro(o.desist),
  };
}

// A conta de uma partida ranqueada (a mesma do rqPontua do jogo). ganhoBotsHoje: o que já foi ganho contra os bots
// hoje; o servidor passa o que tem guardado (o jogo, sem conta, passa Infinity de teto: sem limite no aparelho).
export function pontuaRanqueada(
  estado: Partial<EstadoRanqueada> | null | undefined,
  p: PartidaRanqueada,
  ganhoBotsHoje = 0,
  tetoBotsDia: number = RQ_LIMITES.botsPorDia,
): ResultadoRanqueada {
  const e = normalizaEstado(estado);
  const antes = e.pts;
  const eA = patenteDe(antes);
  const nosso = inteiro(p.placarNosso);
  const deles = inteiro(p.placarDeles);
  const dif = Math.min(3, Math.abs(nosso - deles));
  const Q = PONTOS_RQ;
  let ganho = inteiro(ganhoBotsHoje);
  let d: number;
  let motivo: ResultadoRanqueada["motivo"];
  let limitado = false;
  if (p.abandono) {
    d = -Q.abandono;
    e.seq = 0;
    e.desist++;
    motivo = "desistencia";
  } else if (nosso === deles) {
    // v80: o empate não mexe nos pontos e zera a sequência
    e.seq = 0;
    e.jogos++;
    e.emp++;
    return { estado: e, antes, depois: antes, delta: 0, motivo: "empate", subiu: false, caiu: false, limitado: false, ganhoBots: ganho };
  } else if (nosso > deles) {
    e.seq = e.seq + 1;
    d = Q.vitoria + dif * Q.porGol + (p.contraBots && p.nivelBots === "dificil" ? Q.dificil : 0) + (e.seq >= 3 ? Q.sequencia : 0);
    e.vit++;
    motivo = "vitoria";
    if (p.contraBots) {
      const resta = Math.max(0, tetoBotsDia - ganho);
      if (d > resta) {
        d = resta;
        limitado = true;
      }
      ganho += d;
    }
  } else {
    e.seq = 0;
    d = -(Q.derrota + dif * Q.porGolD);
    if (eA.id === "bronze") d = Math.round(d / 2);
    e.der++;
    motivo = "derrota";
  }
  let depois = Math.max(0, antes + d);
  if (d < 0) depois = Math.max(depois, eA.minPatente); // a proteção: a derrota não tira da patente
  e.pts = depois;
  e.melhor = Math.max(e.melhor, depois);
  e.jogos++;
  const eD = patenteDe(depois);
  return { estado: e, antes, depois, delta: depois - antes, motivo, subiu: eD.ordem > eA.ordem, caiu: eD.ordem < eA.ordem, limitado, ganhoBots: ganho };
}

// A patente feita no aparelho antes da conta (contra os bots, sem conferência): entra uma vez, até o teto.
export function patenteImportada(estado: Partial<EstadoRanqueada> | null | undefined, ptsAparelho: number): EstadoRanqueada | null {
  const e = normalizaEstado(estado);
  if (e.jogos > 0 || e.pts > 0) return null; // a conta já jogou a ranqueada: nada a importar
  const pts = Math.min(RQ_LIMITES.importarAte, inteiro(ptsAparelho));
  if (!pts) return null;
  e.pts = pts;
  e.melhor = Math.max(e.melhor, pts);
  return e;
}
