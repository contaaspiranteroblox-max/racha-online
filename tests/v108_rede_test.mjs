// RACHA v108 · O ONLINE SEM CÂMERA LENTA (sem navegador): o núcleo do cliente (tools/v108/lento.js) e o simulador da rede
// (tests/v102/sim.mjs: o motor das salas de verdade + uma cópia fiel do aparelho, ligados por um 4G de mentira; o cliente 'v108'
// é o de hoje com o deslize com prazo, o pulo pelo somado e o replay uma vez por quadro da tela).
//   1. o núcleo: o deslize de sempre não muda; o grande (ou o que demora) acaba em ~0,12 s; o pulo pelo somado;
//   2. a câmera lenta: um apagão de 1 s e um de 2 s no rádio da Ana — antes (o cliente da v105 e o servidor da v107) a tampinha
//      dela desenhada fica longe da prevista por mais de 0,8 s (a mola de 110 px/s: a câmera lenta); agora some em menos de 0,5 s,
//      a bola e os outros também (o resto pequeno dos outros com a guarda de sempre: na tela, no máximo 1,5 × a corrida);
//   3. o jogo normal (o 4G e o 4G ruim, sem apagão) igual: os trancos, os deslizes, os pulos, o erro contra o servidor e a bola
//      dentro das tampinhas dentro do ruído, e o prazo quase nunca liga.
// A partida inteira com o jogo de verdade no navegador é o tests/v108_lento_test.py; o servidor (o ritmo dos comandos, o relógio
// do motor e o toque logo depois do apagão) é o tests/v108_servidor_test.mjs.   node tests/v108_rede_test.mjs
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { simula, media } from './v102/sim.mjs';
const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const K = require(path.join(RAIZ, 'tools/v108/lento.js'));
const L = require(path.join(RAIZ, 'tools/v96/liso.js'));
const N = require(path.join(RAIZ, 'server/partida/nucleo.js'));
const U = N.U, t0 = Date.now();
let ok = 0, falhas = 0;
function confere(c, txt, info) { if (c) { ok++; console.log('  OK      ' + txt); } else { falhas++; console.log('  FALHOU  ' + txt + (info !== undefined ? '  ·  ' + JSON.stringify(info) : '')); } }

console.log('1) o núcleo (tools/v108/lento.js)');
{
  const C = N.resolve(N.PERFIL_V92), p = L.PADRAO, tetoJ = L.tetoJ(C, p);
  // a mola de um deslize parado (a tampinha desenhada atrás da prevista), quadro a quadro a 60 Hz: quanto tempo até sumir (< 1 u)
  const some = (px, tipo, v108) => {
    const d = L.novo(); d.x = px; let t = 0;
    while (Math.hypot(d.x, d.y) > U(1) && t < 10) {
      const dt = 1 / 60; let vmax = tetoJ, ganho = 0, livre = 0;
      if (v108) { const r = K.mola(tipo, d, dt, vmax, ganho, livre, U); vmax = r.vmax; ganho = r.ganho; livre = r.livre; }
      L.anda(d, dt, 0.09, vmax, ganho, livre); t += dt;
    }
    return +t.toFixed(2);
  };
  const p250 = [some(250, 'P', false), some(250, 'P', true)], j500 = [some(500, 'J', false), some(500, 'J', true)];
  confere(p250[0] > 2 && p250[1] < 0.5, 'o deslize de 250 px da sua tampinha (o depois de um apagão): na v96 some em ' + p250[0] + ' s (a mola de ' + Math.round(tetoJ) + ' px/s: a câmera lenta); agora em ' + p250[1] + ' s', p250);
  confere(j500[0] > 4 && j500[1] < 0.6, 'o de 500 px de outro jogador: ' + j500[0] + ' s → ' + j500[1] + ' s', j500);
  const s20 = [some(20, 'P', false), some(20, 'P', true)], j60 = [some(60, 'J', false), some(60, 'J', true)];
  confere(s20[0] === s20[1] && j60[0] === j60[1], 'o deslize de sempre (20 px da sua, 60 px de outro) é o mesmo da v96: ' + s20[0] + ' s e ' + j60[0] + ' s', [s20, j60]);
  // o que demora: 2 u da sua tampinha por mais de 0,3 s liga o prazo; abaixo de 1,5 u, nunca
  const d = L.novo(); d.x = U(2); let liga = null;
  for (let i = 0; i < 60; i++) { const r = K.mola('P', d, 1 / 60, tetoJ, 0, 0, U); if (r.acel && liga === null) liga = i / 60; d.x = U(2); }
  const e = L.novo(); e.x = U(1.4); let nunca = true;
  for (let i = 0; i < 120; i++) { if (K.mola('P', e, 1 / 60, tetoJ, 0, 0, U).acel) nunca = false; e.x = U(1.4); }
  confere(liga !== null && liga > 0.28 && liga < 0.36 && nunca, 'o deslize de 2 u que não some (a previsão errando sem parar) liga o prazo depois de ' + (liga && liga.toFixed(2)) + ' s; o de 1,4 u nunca', { liga, nunca });
  const g = L.novo(); g.x = U(5); K.mola('P', g, 1 / 60, tetoJ, 0, 0, U);
  const gj = L.novo(); gj.x = U(5); for (let i = 0; i < 60; i++) { K.mola('J', gj, 1 / 60, tetoJ, 0, 0, U); gj.x = U(5); }   // (o que demora: 5 u por 1 s)
  const gg = L.novo(); gg.x = U(20); K.mola('J', gg, 1 / 60, tetoJ, 0, 0, U);                                            // (o grande demais: 20 u)
  const gb = L.novo(); gb.x = U(20); K.mola('B', gb, 1 / 60, tetoJ, 0, 0, U);
  confere(K.guarda(g, 400) > 400 + U(5) / K.T2 - 1 && K.guarda(L.novo(), 400) === 400 && gj.acel108 === true && K.guarda(gj, 400) === 400 && K.guarda(gg, 400) > 400 + U(20) / K.T2 - 1 && gb.acel108 === true && K.guarda(gb, 1100) === 1100,
    'a guarda (o máximo que o desenho anda por quadro) acompanha o deslize acelerado da sua tampinha; a das outras tampinhas só passa da de sempre (1,5 × a corrida: a regra da v96) com o deslize grande demais (a volta de um apagão); a da bola fica a dela');
  const a = L.novo(); a.x = U(10);
  confere(K.cabe(L.novo(), [U(10), 0], U(14)) && !K.cabe(a, [U(10), 0], U(14)) && !K.cabe(L.novo(), [U(15), 0], U(14)) && K.cabe(a, [-U(5), 0], U(14)),
    'o pulo pelo somado: a correção de 10 u entra no deslize vazio, mas não no que já tem 10 u (20 u somados passam do limite de 14 u: pula); a de 15 u pula como antes');
}

console.log('\n2) a câmera lenta depois de um apagão (o simulador: um apagão de 1 s e um de 2 s no rádio da Ana, 4 sementes × 30 s)');
const APAGOES = [[8000, 9000], [20000, 22000]];
// o trecho seguido mais longo (ms) com o deslize acima de lim px (com a bola rolando) — a coisa desenhada longe da prevista
function longe(reg, k, lim) { let maior = 0, ini = null, max = 0; for (const f of reg) { if (f.est !== 'jogo' || f.t < 1500) { ini = null; continue; } const v = f[k]; if (v > max) max = v; if (v > lim) { if (ini == null) ini = f.t; maior = Math.max(maior, f.t - ini); } else ini = null; } return { ms: Math.round(maior), px: Math.round(max) }; }
const ANTES = { cliente: 'v105', ritmo: 'v107', alcanca: 5 }, DEPOIS = { cliente: 'v108' };
for (const rede of ['4g', '4g_ruim']) {
  const r = {};
  for (const [nome, o] of [['antes', ANTES], ['depois', DEPOIS]]) {
    r[nome] = { P: [], J: [], B: [] };
    for (const seed of [1, 2, 3, 4]) {
      const res = simula(Object.assign({ rede, dur: 30000, seed, apagoes: APAGOES }, o));
      r[nome].P.push(longe(res.A.reg, 'offP', U(2))); r[nome].J.push(longe(res.A.reg, 'offJ', U(4))); r[nome].B.push(longe(res.A.reg, 'offB', U(4)));
    }
  }
  const pior = (lado, k) => Math.max(...r[lado][k].map(x => x.ms)), maxPx = (lado, k) => Math.max(...r[lado][k].map(x => x.px));
  console.log('  ' + rede + ' antes: a sua ' + pior('antes', 'P') + ' ms (' + maxPx('antes', 'P') + ' px), os outros ' + pior('antes', 'J') + ' ms, a bola ' + pior('antes', 'B') + ' ms · depois: ' + pior('depois', 'P') + ', ' + pior('depois', 'J') + ', ' + pior('depois', 'B') + ' ms');
  confere(pior('antes', 'P') > 800, rede + ' · antes (o cliente da v105, o servidor da v107): a sua tampinha desenhada fica a mais de 2 u da prevista por ' + pior('antes', 'P') + ' ms seguidos depois do apagão — a câmera lenta', r.antes.P);
  confere(pior('depois', 'P') <= 500, rede + ' · agora: no máximo ' + pior('depois', 'P') + ' ms (o deslize grande acaba em ~0,12 s)', r.depois.P);
  // (os outros: a guarda de sempre — na tela, nunca mais que 1,5 × a corrida — segura o alcançar lá na frente; ~1 s no pior caso)
  confere(pior('depois', 'J') <= 1400 && pior('depois', 'J') <= 0.7 * pior('antes', 'J') && pior('depois', 'B') <= 800,
    rede + ' · os outros (mais de 4 u) ' + pior('antes', 'J') + ' → ' + pior('depois', 'J') + ' ms e a bola ' + pior('antes', 'B') + ' → ' + pior('depois', 'B') + ' ms', { J: [r.antes.J, r.depois.J], B: [r.antes.B, r.depois.B] });
}

console.log('\n3) o jogo normal igual (o simulador sem apagão: 6 sementes × 40 s em cada rede)');
const SEM = [1, 2, 3, 4, 5, 6];
// (quantas vezes o prazo liga no jogo normal: a mesma mola que o simulador usa)
let acel = { P: 0, J: 0, B: 0 }, chamadas = 0;
const mola0 = K.mola;
K.mola = function (tipo) { chamadas++; const r = mola0.apply(this, arguments); if (r.acel) acel[tipo]++; return r; };
for (const rede of ['4g', '4g_ruim']) {
  const a = media({ rede, dur: 40000, cliente: 'v105' }, SEM);
  acel = { P: 0, J: 0, B: 0 }; chamadas = 0;
  const b = media({ rede, dur: 40000, cliente: 'v108' }, SEM);
  const pct = k => +(100 * acel[k] / Math.max(1, chamadas / 3)).toFixed(2);
  console.log('  ' + rede + ' · a sua: d2 ' + a.eu.d2_rms_px + ' → ' + b.eu.d2_rms_px + ', deslize p95 ' + a.eu.deslize_p95_px + ' → ' + b.eu.deslize_p95_px + ' · o outro: erro ' + a.outro.erro_med_px + ' → ' + b.outro.erro_med_px + ' px, pulos ' + a.outro.pulos_min + ' → ' + b.outro.pulos_min
    + '/min · a bola: erro ' + a.bola.erro_med_px + ' → ' + b.bola.erro_med_px + ' px, pulos ' + a.bola.pulos_min + ' → ' + b.bola.pulos_min + '/min, dentro ' + a.sobre.bola_dentro_pct + ' → ' + b.sobre.bola_dentro_pct + '% · o prazo ligado: a sua ' + pct('P') + '%, os outros ' + pct('J') + '%, a bola ' + pct('B') + '% dos quadros');
  confere(b.eu.d2_rms_px <= a.eu.d2_rms_px * 1.3 + 0.3 && b.eu.deslize_p95_px <= a.eu.deslize_p95_px * 1.3 + 2 && b.eu.rapidos_min <= a.eu.rapidos_min + 1,
    rede + ': a sua tampinha igual (o tranco, o deslize que fica na tela, os quadros rápidos demais)', [a.eu, b.eu]);
  confere(b.outro.erro_med_px <= a.outro.erro_med_px * 1.2 + 2 && b.outro.d2_rms_px <= a.outro.d2_rms_px * 1.3 + 0.3 && b.outro.pulos_min <= a.outro.pulos_min * 1.5 + 3,
    rede + ': o outro igual (o erro contra o servidor, o tranco, os pulos)', [a.outro, b.outro]);
  confere(b.bola.erro_med_px <= a.bola.erro_med_px * 1.3 + 2 && b.bola.d2_rms_px <= a.bola.d2_rms_px * 1.3 + 0.2 && b.bola.pulos_min <= a.bola.pulos_min * 1.5 + 4 && b.sobre.bola_dentro_pct < 1.5,
    rede + ': a bola igual (o erro, o tranco, os pulos; desenhada dentro de uma tampinha em menos de 1,5% dos quadros)', [a.bola, b.bola, a.sobre, b.sobre]);
  confere(pct('P') < 1 && pct('J') < 3 && pct('B') < 3, rede + ': o prazo quase nunca liga no jogo normal (a sua ' + pct('P') + '%, os outros ' + pct('J') + '%, a bola ' + pct('B') + '% dos quadros)', acel);
}
K.mola = mola0;

console.log('\n4) as partes da v108 no jogo: nenhuma função com o nome de outra e as trocas no desenho da v96');
{
  const fs = require('fs');
  const jogo = fs.readFileSync(path.join(RAIZ, 'app/public/game/racha.html'), 'utf8');
  const nomes = [...fs.readFileSync(path.join(RAIZ, 'tools/v108/lento.js'), 'utf8').matchAll(/^(?:async )?function ([A-Za-z0-9_$]+)\(/gm)].map(m => m[1]);
  const dup = nomes.filter(n => (jogo.match(new RegExp('^(?:async )?function ' + n.replace(/\$/g, '\\$') + '\\(', 'gm')) || []).length !== 1);
  confere(nomes.length >= 3 && !dup.length, 'as ' + nomes.length + ' funções do tools/v108/lento.js aparecem uma vez só no jogo', dup);
  const trocas = ["v108Anda('P', V96R.P", "v108Anda('B', V96R.B", "v108Anda('J', v96Deslize(i)", 'const g = v108Guarda(q, ant, d, vmax, dt)', 'v108Cabe(V96R.P, dP', 'v108Cabe(V96R.B, dB', 'v108Cabe(v96Deslize(i), d'];
  confere(trocas.every(t => jogo.split(t).length === 2) && !/V96L\.anda\(V96R\.P/.test(jogo), 'o desenho liso da v96 chama as molas com prazo, a guarda e o pulo pelo somado (cada troca uma vez)', trocas.filter(t => jogo.split(t).length !== 2));
  confere(jogo.includes("MODS['./ritmo108'] = ") && jogo.indexOf("MODS['./ritmo108'] = ") < jogo.indexOf("MODS['./sala'] = "), 'a sala neste aparelho leva o balde do ritmo dos comandos (o server/partida/sala.js usa)');
}
console.log('\nv108 · o online sem câmera lenta (sem navegador): ' + ok + ' ok, ' + falhas + ' falharam em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(falhas ? 1 : 0);
