// RACHA v112 · o colchão da fila de comandos (server/partida/colchao112.js + server/partida/sala.js), sem navegador.
//   node tests/v112_colchao_test.mjs
// Confere: o colchão mede a oscilação de cada um (sobe na hora, desce um passo por vez); DESLIGADO por padrão (a fila de
// sempre, quadro a quadro igual à de antes); ligado (RACHA_COLCHAO=1 ou o.colchao), os palpites caem, o comando atrasado
// anda no passo seguinte (nada se perde a mais) e o atraso a mais fica no tamanho do colchão (1 a 2 passos).
import { createRequire } from 'node:module';
import { simula, mede } from './v112/sim.mjs';
const require = createRequire(import.meta.url);
const C = require('../server/partida/colchao112.js');
const { PartidaSala } = require('../server/partida/sala.js');

let ok = 0, falhas = 0;
const t0 = Date.now();
function confere(nome, cond, info) {
  if (cond) { ok++; console.log('  ok  ', nome); }
  else { falhas++; console.log('  FALHOU', nome, info === undefined ? '' : ' · ' + JSON.stringify(info)); }
}

// ---------------------------------------------------------------- 1) a medida
{
  const k = C.novo();
  confere('o colchão começa em 1 passo (16 ms) e sem medida', k.alvo === 1 && k.n === 0 && C.mede(k) === 1);
  for (let s = 1; s <= 120; s++) C.chegou(k, s, s * C.PASSO_MS + 30);              // o ritmo certinho (30 ms de ida, sem oscilar)
  confere('internet firme: o colchão fica no mínimo (1 passo)', C.mede(k) === C.ALVO_MIN, k.alvo);
  let r = 7; const sorte = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let s = 121; s <= 240; s++) C.chegou(k, s, s * C.PASSO_MS + 30 + 45 * sorte());   // ±45 ms (o 4G ruim)
  confere('internet oscilando: o colchão sobe na hora até o máximo (2 passos = 33 ms)', C.mede(k) === C.ALVO_MAX, k.alvo);
  for (let s = 241; s <= 360; s++) C.chegou(k, s, s * C.PASSO_MS + 30);
  const a = C.mede(k), b = C.mede(k);
  confere('firmou de novo: o colchão desce um passo por vez (a cada meio segundo)', a === C.ALVO_MAX - 1 && b === C.ALVO_MIN, [a, b]);
  C.zera(k);
  confere('zera (partida nova): sem medida, de volta ao começo', k.n === 0 && k.alvo === C.ALVO_INICIAL);
  C.chegou(k, 0, 10); C.chegou(k, -3, 10); C.chegou(k, 5, NaN);
  confere('chegadas sem número ou sem hora não contam', k.n === 0);
  const o = C.novo({ min: 0, max: 4, pct: 0.5, inicial: 3, folga: 1 });
  confere('as medidas podem comparar outros colchões (min, max, pct, inicial, folga)', o.min === 0 && o.max === 4 && o.pct === 0.5 && o.alvo === 3 && o.folga === 1);
}

// ---------------------------------------------------------------- 2) desligado por padrão
{
  const base = { n: 1, jogo: 'futebol', map: 'rua', tempo: 60, regra: '', ranked: false, jogadores: [{ netId: 'a', nome: 'A' }, { netId: 'b', nome: 'B' }],
    agora: () => 0, log: () => {}, suspeito: () => {}, onSnapshot: () => {}, onGol: () => {}, onAviso: () => {}, onFim: () => {} };
  const antes = process.env.RACHA_COLCHAO;
  delete process.env.RACHA_COLCHAO;
  const p0 = new PartidaSala(Object.assign({}, base));
  process.env.RACHA_COLCHAO = '1';
  const p1 = new PartidaSala(Object.assign({}, base));
  process.env.RACHA_COLCHAO = '0';
  const p2 = new PartidaSala(Object.assign({}, base, { colchao: true }));
  if (antes === undefined) delete process.env.RACHA_COLCHAO; else process.env.RACHA_COLCHAO = antes;
  confere('sem nada: a fila de sempre (o colchão desligado)', p0.colchao === false);
  confere('RACHA_COLCHAO=1 liga; o.colchao: true liga (mesmo com RACHA_COLCHAO=0)', p1.colchao === true && p2.colchao === true);
  for (const p of [p0, p1, p2]) { try { p.encerra && p.encerra(); } catch (_) {} try { p.para && p.para(); } catch (_) {} }
}

// ---------------------------------------------------------------- 3) a mesma partida com e sem (o simulador do online)
const json = res => JSON.stringify(res.verdade.map(v => [v.t, v.est, v.b, v.j, v.fila]));
{
  const a = simula({ rede: '4g', dur: 12000, n: 1, cliente: 'v108', seed: 5 });                 // (o simulador liga o colchão se não disser nada)
  const b = simula({ rede: '4g', dur: 12000, n: 1, cliente: 'v108', seed: 5, colchao: false });
  const c = simula({ rede: '4g', dur: 12000, n: 1, cliente: 'v108', seed: 5, colchao: false });
  confere('desligado: a partida repetida dá a mesma verdade, quadro a quadro (a fila de sempre)', json(b) === json(c));
  confere('ligado: a verdade muda (o colchão está mesmo em jogo no simulador)', json(a) !== json(b));
}
const casos = [['wifi', 1], ['4g', 1], ['4g_ruim', 2], ['4g', 4]];
for (const [rede, n] of casos) {
  const soma = { off: { palp: 0, cmd: 0, corr: 0, seg: 0 }, on: { palp: 0, cmd: 0, corr: 0, seg: 0 } };
  const sementes = [1, 2, 3];
  for (const seed of sementes) for (const [k, colchao] of [['off', false], ['on', true]]) {
    const m = mede(simula({ rede, dur: 20000, n, cliente: 'v108', seed, colchao }));
    soma[k].palp += m.fila.palpites_pct / sementes.length; soma[k].seg += m.fila.seguradas_pct / sementes.length;
    soma[k].cmd += m.comando.p50_ms / sementes.length; soma[k].corr += m.eu.correcao_p95_px / sementes.length;
  }
  const r = x => Math.round(x * 10) / 10, info = { palpites: [r(soma.off.palp), r(soma.on.palp)], comando_ms: [r(soma.off.cmd), r(soma.on.cmd)], correcao95: [r(soma.off.corr), r(soma.on.corr)] };
  confere(`${n}v${n} ${rede}: os palpites do servidor caem a menos da metade com o colchão`, soma.on.palp < 0.5 * soma.off.palp && soma.off.palp > 5, info);
  confere(`${n}v${n} ${rede}: o comando atrasado é segurado (anda no passo seguinte)`, soma.on.seg > 0 && soma.off.seg === 0, [soma.off.seg, soma.on.seg]);
  confere(`${n}v${n} ${rede}: o atraso a mais fica no tamanho do colchão (entre 5 e 40 ms)`, soma.on.cmd - soma.off.cmd > 5 && soma.on.cmd - soma.off.cmd < 40, info);
  confere(`${n}v${n} ${rede}: a correção da sua tampinha não dispara (95% até o dobro de antes, ou 3 px)`, soma.on.corr <= Math.max(2 * soma.off.corr, 3), info);
}
console.log(`v112 · o colchão da fila (sem navegador): ${ok} ok, ${falhas} falharam em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(falhas ? 1 : 0);
