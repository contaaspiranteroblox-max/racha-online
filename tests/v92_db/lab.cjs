'use strict';
/* RACHA v92 · O LABORATÓRIO DO DB (PASSE + CHUTE). Simula, com a física das salas (server/partida/nucleo.js: a mesma do
   servidor, da previsão do aparelho e — com os números da v91 — do treino offline), um jogador fazendo PASSE e CHUTE na bola
   em cenários diferentes, com o intervalo entre os dedos (Δ, ms) e a fase do primeiro toque dentro do passo de 16,67 ms
   variando. Mede se o DB sai (o PASSE e depois o CHUTE batem na bola), com quantos passos entre os dois e a velocidade.
   As máquinas ("mec"):
     {maq:'off', perfil, buffer}  o treino offline da v91 (amostraBotoes: o CHUTE tem prioridade, 20 ms entre trocas de
                                  botão) + o toque armado da v92 (tools/v92/base.js, V92T) — o DB atual no treino;
     {maq:'nuc', perfil}          a máquina do núcleo sozinha: a previsão do online na v92 (e, com dbModo 1, o treino);
     {maq:'srv', perfil, relogio} o servidor da sala ANTES desta etapa: o núcleo + o mínimo de 33 ms entre dois chutes do
                                  mesmo jogador no relógio de parede (relogio: os instantes medidos de cada passo do motor;
                                  sem relogio, passos exatos de 16,67 ms);
     {maq:'srv92'} / {maq:'prev92'} o servidor e a previsão de agora: o mínimo de 2 passos entre chutes (os dois iguais).
                                  Com dbModo 1 quem conta o mínimo é a máquina do núcleo (em passos do comando).
   O perfil com dbModo 1 liga o DB por estados (ver server/partida/nucleo.js).
   O toque: cada um tem t (ms) e dur (ms); o relógio do toque do aparelho é quantizado pela varredura da tela (o.varredura,
   ms: 8,33 = 120 Hz; 0 = exato) — os dois dedos na mesma varredura chegam com o mesmo instante.
   Uso: node tests/v92_db/lab.cjs [--json saida.json] · módulo: require('./lab.cjs') */
const N0 = require('../../server/partida/nucleo.js');   // (o.nucleo troca o núcleo: o teste de regressão usa a cópia de antes)
const N = N0;
const STEP = 1000 / 60;
const u = N.U;
const FORCA_MINIMA_MS = 33;                          // (server/partida/sala.js)

/* ---------------------------------------------------------------- as máquinas de botão */
function maquina(mec, C, o) {
  const N = (o && o.nucleo) || N0;
  if (mec.maq === 'off') {                           // a v91 offline (amostraBotoes) + o toque armado da v92 (V92T)
    const B0 = { estado: 1, t: 0, ultimo: -1e9, livre: true }, T = { arma: 0, tipo: 0 }, n = mec.buffer | 0;
    return {
      ev: [],
      comando(cmd) { this.cmd = cmd; },
      tick(M, q, chuta) {
        const c = this.cmd, B = M.B, perto = () => Math.hypot(B.x - q.x, B.y - q.y) <= C.ALCANCE_CHUTE;
        B0.t += 1 / 60;
        const alvo = c.button;
        const aceito = alvo !== 1 && (B0.t - B0.ultimo > C.COOLDOWN_BOTAO || B0.estado === alvo);
        const antes = B0.estado; B0.estado = aceito ? alvo : 1;
        const novo = B0.estado !== 1 && antes !== B0.estado;
        if (aceito) B0.ultimo = B0.t;
        const livre0 = B0.livre;
        if (B0.estado === 1) B0.livre = true;
        else if (B0.livre && perto()) { if (chuta(q, B0.estado === 3 ? C.FORCA_POWER : C.FORCA_KICK)) B0.livre = false; }
        if (novo && B0.estado !== 1 && n > 0) { T.arma = n + 1; T.tipo = B0.estado; }
        if (livre0 && !B0.livre && B0.estado !== 1) { T.arma = 0; return; }
        if (T.arma > 0) {
          T.arma--;
          if (T.arma > 0 && perto() && chuta(q, T.tipo === 3 ? C.FORCA_POWER : C.FORCA_KICK)) { T.arma = 0; if (B0.estado !== 1) B0.livre = false; }
        }
      },
    };
  }
  const b = N.novoBotao(); b.ev = [];
  const m = { b, ev: b.ev, comando(cmd) { N.botaoComando(b, cmd, C); }, tick(M, q, chuta) { N.botaoTick(M, C, q, b, chuta); } };
  if ((mec.maq === 'srv92' || mec.maq === 'prev92') && C.DB_MODO !== 1) {   // o servidor e a previsão de agora: o mínimo de 2 PASSOS
    let ultimo = -99;
    m.tick = function (M, q, chuta) {
      N.botaoTick(M, C, q, b, (qq, fo) => { if (M.tick - ultimo < 2) { m.recusas = (m.recusas | 0) + 1; return false; } const ok = chuta(qq, fo); if (ok) ultimo = M.tick; return ok; });
    };
  }
  if (mec.maq === 'srv' && C.DB_MODO !== 1) {        // o servidor ANTES: o mínimo de 33 ms entre chutes no relógio de parede
    const rel = mec.relogio, j0 = rel ? (((o && o.fase) | 0) * 97 + ((o && o.sorte) | 0) * 13) % (rel.length - 200) : 0;
    const agora = i => rel ? rel[j0 + i] - rel[j0] : Math.floor(i * STEP);   // (o Date.now() de cada passo do motor medido)
    let ultimo = -1e9;
    m.tick = function (M, q, chuta) {
      const ag = agora(M.tick);
      N.botaoTick(M, C, q, b, (qq, f) => { if (ag - ultimo < FORCA_MINIMA_MS) { m.recusas = (m.recusas | 0) + 1; return false; } const ok = chuta(qq, f); if (ok) ultimo = ag; return ok; });
    };
  }
  return m;
}

/* ---------------------------------------------------------------- os cenários */
// cada cenário monta o mundo, diz o analógico de cada passo e o instante (ms) em que o PASSE é apertado (t0)
let NM = N0;                                         // (o núcleo da jogada em curso)
function mundo(C) {
  const N = NM;
  const G = N.novoCampo(1);
  return { G, B: N.novaBola(C, G.CX, G.CY), jog: [{ i: 0, x: 0, y: 0, vx: 0, vy: 0, r: C.R_JOG, m: C.MASSA_JOG, mx: 0, my: 0, time: 0 }], estado: 'jogo', saidaTime: 0, jogo: 'futebol', tick: 0 };
}
const contato = C => C.R_JOG + C.R_BOLA;
const CENARIOS = {
  // a bola parada encostada na tampinha parada; o PASSE e o CHUTE de pé
  parado(C) {
    const M = mundo(C), q = M.jog[0], G = M.G;
    q.x = G.CX - contato(C) - u(0.02); q.y = G.CY;
    return { M, analogico: () => [0, 0], t0: 12 * STEP };
  },
  // a bola parada; a tampinha vem correndo, encosta, empurra a bola 3 passos (~50 ms) e aí PASSE → CHUTE
  parado_correndo(C, o) {
    const M = mundo(C), q = M.jog[0], G = M.G, d0 = u(3);
    q.x = G.CX - contato(C) - d0; q.y = G.CY;
    const chega = d0 / C.VEL_JOG * 1000;
    return { M, analogico: () => [1, 0], t0: chega + ((o && o.empurra) != null ? o.empurra : 3) * STEP };
  },
  // conduzindo: a bola colada na frente, as duas a ~11 u/s (0,7 s empurrando desde parada)
  colado(C) {
    const M = mundo(C), q = M.jog[0], G = M.G;
    q.x = G.CX - u(26); q.y = G.CY; M.B.x = q.x + contato(C); M.B.y = G.CY;
    return { M, analogico: () => [1, 0], t0: 42 * STEP };
  },
  // normal: a bola rolando (6 u/s) e a tampinha chegando por trás, correndo; PASSE ao encostar
  normal(C) {
    const M = mundo(C), q = M.jog[0], G = M.G;
    M.B.x = G.CX - u(14); M.B.y = G.CY; M.B.vx = u(6);
    q.x = M.B.x - contato(C) - u(4); q.y = G.CY;
    const chega = u(4) / (C.VEL_JOG - u(6)) * 1000;
    return { M, analogico: () => [1, 0], t0: chega + 2 * STEP };
  },
  // girando em volta da bola parada, encostado (tangente com um pouco para dentro); o PASSE sai na direção do centro
  girando(C) {
    const M = mundo(C), q = M.jog[0], G = M.G;
    q.x = G.CX - contato(C); q.y = G.CY;
    const analogico = () => {
      const dx = M.B.x - q.x, dy = M.B.y - q.y, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d;
      const k = d > contato(C) + u(0.05) ? 0.6 : 0.25, mx = -ny + nx * k, my = nx + ny * k, l = Math.hypot(mx, my);
      return [mx / l, my / l];
    };
    return { M, analogico, t0: 24 * STEP };
  },
  // de lado: correndo com a bola encostada do lado (as duas juntas); o DB sai para o lado
  lateral(C) {
    const M = mundo(C), q = M.jog[0], G = M.G;
    q.x = G.CX - u(20); q.y = G.CY - u(8); M.B.x = q.x; M.B.y = q.y + contato(C);
    q.vx = C.VEL_JOG; M.B.vx = C.VEL_JOG;
    return { M, analogico: () => [1, 0], t0: 14 * STEP };
  },
  // contra a parede: a bola encostada na lateral de cima e a tampinha embaixo empurrando para a parede
  parede(C) {
    const M = mundo(C), q = M.jog[0], G = M.G;
    M.B.x = G.CX + u(6); M.B.y = G.LY0 + C.R_BOLA; q.x = M.B.x; q.y = M.B.y + contato(C) + u(0.02);
    return { M, analogico: () => [0, -1], t0: 12 * STEP };
  },
  // na parede, chegando na diagonal: a bola encostada na lateral de cima, a tampinha vem de baixo-esquerda a 45° e empurra
  parede_diagonal(C) {
    const M = mundo(C), q = M.jog[0], G = M.G, a = Math.PI / 4;
    M.B.x = G.CX + u(6); M.B.y = G.LY0 + C.R_BOLA;
    q.x = M.B.x - Math.cos(a) * (contato(C) + u(3)); q.y = M.B.y + Math.sin(a) * (contato(C) + u(3));
    const chega = u(3) / C.VEL_JOG * 1000;
    return { M, analogico: () => [Math.cos(a), -Math.sin(a)], t0: chega + 3 * STEP };
  },
};
const NOMES = Object.keys(CENARIOS);

/* ---------------------------------------------------------------- uma jogada */
// toques: [{tipo:'p'|'c', t (ms), dur (ms)}] · mec · o: {passos, empurra, varredura, fase} → os impulsos na bola, se deu DB,
// a velocidade, o que a máquina decidiu (ev) e os comandos mandados
function relogioToque(t, o) {                        // o instante que o aparelho dá ao toque (a varredura da tela de toque)
  const S = o.varredura || 0; if (!S) return t;
  const ph = ((o.fase | 0) * 0.618034 % 1) * S;      // (a fase da varredura muda de jogada para jogada)
  return Math.ceil((t - ph) / S - 1e-9) * S + ph;
}
function jogada(cen, mec, toques, o) {
  o = o || {};
  const N = o.nucleo || N0; NM = N;
  const C = N.resolve(mec.perfil);
  const { M, analogico } = CENARIOS[cen](C, o), q = M.jog[0];
  const maq = maquina(mec, C, o), imp = [];
  const chuta = (qq, f) => { const ok = N.chute(M, C, qq, f); if (ok) imp.push({ passo: M.tick, f: f === C.FORCA_POWER ? 'c' : 'p' }); return ok; };
  const vel = [], cmds = [];
  const tq = toques.map(x => Object.assign({}, x, { r: relogioToque(x.t, o) }));   // r: o instante do relógio do toque
  let ultP = null, ultC = null;
  for (let i = 1; i <= (o.passos || 70); i++) {
    const ti = i * STEP;                             // o comando do passo i leva o que aconteceu até ti
    let kc = 0, pc = 0, segP = false, segC = false, latP = false, latC = false;
    for (const x of tq) {
      if (x.r <= ti) { if (x.tipo === 'p') kc++; else pc++; }
      const seg = x.r <= ti && ti < x.t + x.dur, lat = x.r > ti - STEP && x.r <= ti;
      if (x.tipo === 'p') { segP = segP || seg; latP = latP || lat; if (lat) ultP = x.r; }
      else { segC = segC || seg; latC = latC || lat; if (lat) ultC = x.r; }
    }
    const button = segC || latC ? 3 : segP || latP ? 2 : 1;
    const bh = (segP || latP ? 1 : 0) | (segC || latC ? 2 : 0);
    let dt;                                          // o CHUTE menos o PASSE (décimos de ms), quando os dois estão perto
    if ((latP || latC) && ultP != null && ultC != null && Math.abs(ultC - ultP) <= 100) dt = Math.round((ultC - ultP) * 10);
    const [mx, my] = analogico(i);
    M.tick = i;
    const cmd = { seq: i, x: mx, y: my, button, kc, pc, bh };
    if (dt != null) cmd.dt = dt;
    cmds.push(cmd);
    maq.comando(cmd);
    q.mx = mx; q.my = my;
    maq.tick(M, q, chuta);
    N.passo(M, C, null);
    vel.push(Math.hypot(M.B.vx, M.B.vy) / u(1));
  }
  const p = imp.findIndex(x => x.f === 'p'), c = imp.findIndex(x => x.f === 'c');
  const db = p >= 0 && c > p;
  return { imp, db, gap: db ? imp[c].passo - imp[p].passo : null, vmax: Math.max(...vel), so: !db && imp.length ? imp.map(x => x.f).join('') : null,
    ev: maq.ev || [], recusas: maq.recusas | 0, cmds };
}

/* ---------------------------------------------------------------- a varredura: Δ × fase */
const DELTAS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 50, 60, 70, 85, 100];
function varre(cen, mec, o) {
  o = o || {};
  const fases = o.fases || 12, dur = o.dur || 60, durP = o.durP || dur;
  const t0 = CENARIOS[cen](N.resolve(mec.perfil), o).t0;
  return (o.deltas || DELTAS).map(d => {
    let ok = 0; const vs = [], gaps = {};
    for (let f = 0; f < fases; f++) {
      const tP = t0 + (f + 0.5) * STEP / fases;
      const r = jogada(cen, mec, [{ tipo: 'p', t: tP, dur: durP }, { tipo: 'c', t: tP + d, dur }], Object.assign({}, o, { fase: f }));
      if (r.db) { ok++; vs.push(r.vmax); gaps[r.gap] = (gaps[r.gap] | 0) + 1; }
    }
    return { d, taxa: ok / fases, v: vs.length ? +(vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1) : null, gaps };
  });
}
// a chance de DB de quem aperta os dois dedos com intervalo normal (média m, desvio s, ms) — o "quão difícil"
function chance(linhas, m, s) {
  let soma = 0, peso = 0;
  for (let d = 0; d <= 120; d += 0.5) {
    const w = Math.exp(-0.5 * ((d - m) / s) ** 2);
    let a = linhas[0], b = linhas[linhas.length - 1];
    for (let i = 0; i < linhas.length - 1; i++) if (linhas[i].d <= d && d <= linhas[i + 1].d) { a = linhas[i]; b = linhas[i + 1]; break; }
    const t = b.d === a.d ? a.taxa : a.taxa + (b.taxa - a.taxa) * (d - a.d) / (b.d - a.d);
    soma += w * t; peso += w;
  }
  return soma / peso;
}
// o melhor que um jogador consegue: a média que dá a maior chance, para um desvio s (a precisão do dedo)
function melhor(linhas, s) {
  let mx = 0, em = 0;
  for (let m = 0; m <= 80; m += 1) { const c = chance(linhas, m, s); if (c > mx) { mx = c; em = m; } }
  return { chance: mx, media: em };
}

const PERFIS = {
  v91: N.PERFIL_V91,
  v92: N.PERFIL_V92,
  exp: Object.assign({}, N.PERFIL_V92, { dbModo: 1 }),
};
const MECS = {
  'v91 treino': { maq: 'off', perfil: N.PERFIL_V91, buffer: 0 },
  'v92 treino': { maq: 'off', perfil: N.PERFIL_V92, buffer: 6 },
  'v92 servidor': { maq: 'srv', perfil: N.PERFIL_V92 },
  'v92 previsão': { maq: 'nuc', perfil: N.PERFIL_V92 },
  'v92 corrigido': { maq: 'srv92', perfil: N.PERFIL_V92 },
  'estados': { maq: 'nuc', perfil: PERFIS.exp },
};

module.exports = { N, STEP, CENARIOS, NOMES, jogada, varre, chance, melhor, DELTAS, maquina, MECS, PERFIS, relogioToque };

if (require.main === module) {
  const out = {};
  for (const cen of NOMES) {
    out[cen] = {};
    for (const nome in MECS) out[cen][nome] = varre(cen, MECS[nome]);
    console.log('\n' + cen + '  (Δ ms → % de DB · ' + Object.keys(MECS).join(' | ') + ')');
    const ls = Object.values(out[cen]);
    console.log(ls[0].map((l, i) => String(l.d).padStart(4) + ': ' + ls.map(x => String(Math.round(x[i].taxa * 100)).padStart(3) + '%').join(' | ')).join('\n'));
    console.log('  chance (dedos 15±8 ms / 30±12 / 60±20): ' + ls.map(x => [chance(x, 15, 8), chance(x, 30, 12), chance(x, 60, 20)].map(v => Math.round(v * 100) + '%').join('/')).join(' | '));
    console.log('  o melhor possível (dedo ±5 ms / ±10 ms): ' + ls.map(x => { const a = melhor(x, 5), b = melhor(x, 10); return Math.round(a.chance * 100) + '%@' + a.media + '/' + Math.round(b.chance * 100) + '%@' + b.media; }).join(' | '));
  }
  const j = process.argv.indexOf('--json'); if (j > 0) require('fs').writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 1));
}
