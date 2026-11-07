/* =====================================================================================================================
   PROTÓTIPO COLYSEUS · O GRAVADOR DA PARTIDA (para provar que a física é a mesma)
   A sala do Colyseus roda o MESMO motor do RACHA (server/partida/sala.js · PartidaSala). Para provar que embrulhar o motor
   na sala do Colyseus não muda nada da física, a sala pode gravar a partida: cada comando que chegou (com o passo em que
   chegou) e cada leitura do relógio do motor (agora()). Depois, reproduz() roda um PartidaSala novo, fora do Colyseus e
   sem rede, com os mesmos comandos nos mesmos passos e o mesmo relógio — e os quadros têm de sair IGUAIS, um por um.
   (O núcleo da física é determinístico; os bots usam Math.random, então a prova é feita com humanos.)
   ===================================================================================================================== */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PartidaSala } = require('../../../server/partida/sala.js');

export function novoGravador() {
  return { relogio: [], decorrido: [], comandos: [], opcoes: null, passos: 0 };
}

// embrulha as opções do PartidaSala para gravar os dois relógios (cada agora() e cada decorrido(), o relógio oficial da
// ranqueada) — os comandos são gravados por gravaComando, na hora em que a sala os entrega ao motor
export function gravando(g, opcoes) {
  const agora = opcoes.agora || (() => Date.now());
  g.opcoes = JSON.parse(JSON.stringify({ ...opcoes, agora: undefined, decorrido: undefined, log: undefined, suspeito: undefined, onSnapshot: undefined, onGol: undefined, onAviso: undefined, onFim: undefined, onReplay: undefined }));
  g.temDecorrido = typeof opcoes.decorrido === 'function';
  const o = { ...opcoes, agora: () => { const t = agora(); g.relogio.push(t); return t; } };
  if (g.temDecorrido) { const dc = opcoes.decorrido; o.decorrido = () => { const t = dc(); g.decorrido.push(t); return t; }; }
  return o;
}
export function gravaComando(g, partida, netId, cmd) { g.comandos.push({ tick: partida.tick, netId, cmd: JSON.parse(JSON.stringify(cmd)) }); }

// roda a mesma partida de novo, sem rede: os mesmos comandos nos mesmos passos, o mesmo relógio. Devolve os quadros.
export function reproduz(g, passos) {
  const quadros = [];
  let i = 0, j = 0, fim = null;
  const agora = () => { if (i >= g.relogio.length) throw new Error('o relógio gravado acabou (a reprodução pediu mais horas que a partida)'); return g.relogio[i++]; };
  const decorrido = () => { if (j >= g.decorrido.length) throw new Error('o relógio oficial gravado acabou'); return g.decorrido[j++]; };
  const p = new PartidaSala({ ...g.opcoes, agora, ...(g.temDecorrido ? { decorrido } : {}), onSnapshot: q => quadros.push(JSON.stringify(q)), onFim: r => { fim = r; } });
  let c = 0;
  for (let t = 0; t < passos; t++) {
    while (c < g.comandos.length && g.comandos[c].tick === p.tick) { p.entrada(g.comandos[c].netId, g.comandos[c].cmd); c++; }
    p.passo();
  }
  return { quadros, partida: p, fim, relogioUsado: i };
}
