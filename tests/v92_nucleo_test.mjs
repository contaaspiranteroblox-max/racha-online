// RACHA v92 · o núcleo compartilhado da física das salas (server/partida/nucleo.js) e o motor novo das salas.
// Confere, sem navegador:
//   1. FIDELIDADE: com o PERFIL_V91, o motor novo (server/partida/sala.js em cima do núcleo) dá EXATAMENTE os mesmos quadros
//      que o motor da v91 (cópia guardada em tests/v92/ref_v91/) — tique a tique, em partidas inteiras de bots e com humanos
//      de mentira mandando comandos (andar, tocar, segurar, a CURVA), 1v1 a 4v4, futebol e com curva;
//   2. o que o PERFIL_V92 muda de propósito: o toque armado (um toque um pouco antes da bola chegar vira chute), o contador de
//      toques (um toque num comando descartado não se perde), a rede e a trave segurando a tampinha no servidor;
//   3. o perfil de fora é limpo (só os campos conhecidos, cortados nos limites);
//   4. o relógio do motor: 60 passos por segundo de verdade (o setInterval da v91 dava mais).
// Uso: node tests/v92_nucleo_test.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Nova = require('../server/partida/sala.js');
const Velha = require('./v92/ref_v91/sala.js');
const N = require('../server/partida/nucleo.js');

let ok = 0; const falhas = [];
const confere = (c, o, d) => { if (c) { ok++; console.log('  OK      ' + o); } else { falhas.push(o); console.log('  FALHOU  ' + o + (d !== undefined ? '  ·  ' + JSON.stringify(d).slice(0, 300) : '')); } return c; };
const t0 = Date.now();

// ---------------------------------------------------------------- o sorteio igual nos dois motores (os bots usam Math.random)
function semente(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const randomOriginal = Math.random;

// uma partida nos dois motores, com o mesmo roteiro de comandos; devolve a primeira diferença (ou null) e um resumo
function gemeas(cfg, roteiro, ticks) {
  const rel = { t: 1000 };
  const mk = (Mod, extra) => {
    const quadros = [];
    const p = new Mod.PartidaSala(Object.assign({
      n: cfg.n, jogo: cfg.jogo, map: 0, tempo: cfg.tempo || 0, regra: cfg.regra || '', jogadores: cfg.jogadores,
      agora: () => rel.t, decorrido: () => (rel.t - 1000), onSnapshot: d => quadros.push(d),
    }, extra));
    return { p, quadros };
  };
  Math.random = semente(cfg.seed || 7);
  const A = mk(Velha, {});
  Math.random = semente(cfg.seed || 7);
  const B = mk(Nova, { fisica: N.PERFIL_V91, fisicaBase: N.PERFIL_V91 });
  // os dois motores sorteiam igual a partir daqui (o mesmo gerador para os dois: cada um com o seu, com a mesma semente)
  const rA = semente((cfg.seed || 7) * 31 + 1), rB = semente((cfg.seed || 7) * 31 + 1);
  let dif = null, gols = 0;
  for (let i = 0; i < ticks && !dif; i++) {
    rel.t += 1000 / 60;
    const cmds = roteiro(i, A.p);                       // [{id, m}] — os comandos que "chegam" antes deste passo
    for (const c of cmds || []) { A.p.entrada(c.id, Object.assign({}, c.m)); B.p.entrada(c.id, Object.assign({}, c.m)); }
    Math.random = rA; A.p.passo();
    Math.random = rB; B.p.passo();
    const qa = A.p.quadro(), qb = B.p.quadro();
    qb.players = qb.players.map(v => v.slice(0, 7));     // (o campo 7 é novo na v92: o estado dos botões)
    qb.ball = qb.ball.slice(0, 5);                       // (na COM CURVA a v92 manda também o efeito da bola)
    delete qb.ent; delete qb.cred;                       // (v102: as direções e o crédito de cada um, para a previsão do aparelho)
    const sa = JSON.stringify(qa), sb = JSON.stringify(qb);
    if (sa !== sb) dif = { tick: i, velho: sa.slice(0, 400), novo: sb.slice(0, 400) };
    gols = qa.score[0] + qa.score[1];
    if (A.p.encerrado || B.p.encerrado) { if (A.p.encerrado !== B.p.encerrado) dif = { tick: i, fim: [A.p.encerrado, B.p.encerrado] }; break; }
  }
  Math.random = randomOriginal;
  return { dif, gols, tick: A.p.tick, placar: A.p.placar.slice(), qA: A.quadros.length, qB: B.quadros.length };
}

// um humano de mentira: corre para a bola (pelo quadro do motor velho), toca o PASSE/CHUTE em padrões, segura, e a CURVA
function humano(id, slot, estilo) {
  let seq = 0;
  return (i, p) => {
    const q = p.jog[slot], B = p.B;
    if (estilo === 'some' && i % 400 > 330) return [];          // fica sem mandar nada (o motor para a tampinha após 350 ms)
    if (estilo === 'rajada' && i % 9 === 4) return [];           // a internet oscilando: um comando não chega neste passo…
    const n = estilo === 'rajada' && i % 9 === 5 ? 2 : 1;        // …e chegam dois no seguinte
    const out = [];
    for (let k = 0; k < n; k++) {
      let dx = B.x - q.x, dy = B.y - q.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      if (i % 120 < 20) { dx = Math.cos(i / 7); dy = Math.sin(i / 11); }      // umas voltas à toa
      let button = 1;
      if (estilo === 'toca' && i % 23 < 2) button = 2;
      if (estilo === 'toca' && i % 47 === 30) button = 3;
      if (estilo === 'segura' && i % 90 > 40) button = i % 180 > 90 ? 3 : 2;
      const kbit = estilo === 'curva' && i % 100 > 60 ? 1 : 0;
      if (estilo === 'curva' && i % 37 === 3) button = 2;
      out.push({ id, m: { seq: ++seq, x: dx, y: dy, button, k: kbit } });
    }
    return out;
  };
}
const junta = (...fs) => (i, p) => fs.flatMap(f => f(i, p) || []);

console.log('\n1) fidelidade: o motor novo com o PERFIL_V91 dá os mesmos quadros do motor da v91');
const bots = n => Array.from({ length: 2 * n }, () => ({ netId: null, nome: 'Bot', bot: 'dificil' }));
for (const n of [1, 2, 3, 4]) {
  const r = gemeas({ n, jogo: 'futebol', jogadores: bots(n), seed: 11 + n }, () => [], 60 * 150);
  confere(!r.dif, `${n}v${n} só de bots, ${Math.round(r.tick / 60)} s de jogo (${r.gols} gols, placar ${r.placar.join('×')}): quadros idênticos`, r.dif);
}
{
  const r = gemeas({ n: 2, jogo: 'curva', jogadores: bots(2), seed: 5 }, () => [], 60 * 120);
  confere(!r.dif, `2v2 COM CURVA só de bots, ${Math.round(r.tick / 60)} s (${r.gols} gols): quadros idênticos`, r.dif);
}
{
  const jog = [{ netId: 'h1', nome: 'Ana' }, { netId: null, nome: 'Bot', bot: 'facil' }];
  const r = gemeas({ n: 1, jogo: 'futebol', jogadores: jog, seed: 3 }, humano('h1', 0, 'toca'), 60 * 120);
  confere(!r.dif, `1v1 humano (toques no PASSE e no CHUTE) × bot, ${Math.round(r.tick / 60)} s (${r.gols} gols): quadros idênticos`, r.dif);
}
{
  const jog = [{ netId: 'h1', nome: 'Ana' }, { netId: 'h2', nome: 'Beto' }, { netId: 'h3', nome: 'Caio' }, { netId: null, nome: 'Bot', bot: 'dificil' }];
  const r = gemeas({ n: 2, jogo: 'futebol', jogadores: jog, seed: 9 }, junta(humano('h1', 0, 'segura'), humano('h2', 1, 'rajada'), humano('h3', 2, 'some')), 60 * 120);
  confere(!r.dif, `2v2 com 3 humanos (segura, internet oscilando, some e volta), ${Math.round(r.tick / 60)} s (${r.gols} gols): quadros idênticos`, r.dif);
}
{
  const jog = [{ netId: 'h1', nome: 'Ana' }, { netId: 'h2', nome: 'Beto' }];
  const r = gemeas({ n: 1, jogo: 'curva', jogadores: jog, seed: 21 }, junta(humano('h1', 0, 'curva'), humano('h2', 1, 'toca')), 60 * 120);
  confere(!r.dif, `1v1 COM CURVA com 2 humanos (a CURVA segurada e solta), ${Math.round(r.tick / 60)} s (${r.gols} gols): quadros idênticos`, r.dif);
}
{
  const r = gemeas({ n: 2, jogo: 'futebol', regra: 'v80', jogadores: bots(2), seed: 33 }, () => [], 60 * 200);
  confere(!r.dif, `2v2 na regra v80 (3:00 e o gol de ouro), ${Math.round(r.tick / 60)} s: quadros idênticos`, r.dif);
}

console.log('\n2) o que o PERFIL_V92 muda de propósito');
// uma sala com um humano parado de frente para a bola que vem rolando: o toque sai alguns passos antes de a bola chegar
function toqueAntes(perfil, adiantado) {
  const rel = { t: 1000 };
  const p = new Nova.PartidaSala({ n: 1, jogo: 'futebol', jogadores: [{ netId: 'h', nome: 'Ana' }, { netId: 'x', nome: 'Beto' }], agora: () => rel.t, fisica: perfil, fisicaBase: perfil });
  p.estado = 'jogo';
  const q = p.jog[0], o = p.jog[1], G = p.G, C = p.C;
  q.x = G.CX; q.y = G.CY; o.x = G.CX + 600; o.y = G.CY + 200;
  const v = 300;                                         // px/s: a bola vem da direita, devagar
  // quantos passos até a bola entrar no alcance (contando o freio da bola)
  let bx = G.CX + 220, vx = -v, n = 0;
  while (bx - G.CX > C.ALCANCE_CHUTE && n < 500) { vx *= C.FATOR_BOLA; bx += vx / 60; n++; }
  p.B.x = G.CX + 220; p.B.y = G.CY; p.B.vx = -v; p.B.vy = 0;
  let seq = 0, chutou = -1;
  const ct0 = q.chuteT;
  for (let i = 0; i < n + 30; i++) {
    rel.t += 1000 / 60;
    const tocando = i === n - adiantado;                 // um toque só (um comando com o botão; o seguinte já é solto)
    p.entrada('h', { seq: ++seq, x: 0, y: 0, button: tocando ? 2 : 1, k: 0, kc: tocando ? 1 : (i > n - adiantado ? 1 : 0) });
    p.entrada('x', { seq, x: 0, y: 0, button: 1, k: 0 });
    p.passo();
    if (q.chuteT !== ct0 && chutou < 0) chutou = i;
  }
  return { chutou, n };
}
{
  const a91 = toqueAntes(N.PERFIL_V91, 3), a92 = toqueAntes(N.PERFIL_V92, 3), z91 = toqueAntes(N.PERFIL_V91, 0), z92 = toqueAntes(N.PERFIL_V92, 0);
  confere(z91.chutou >= 0 && z92.chutou >= 0, 'o toque no passo exato em que a bola entra no alcance vale nos dois perfis', { z91, z92 });
  confere(a91.chutou < 0, 'v91: o toque 3 passos (50 ms) antes de a bola chegar se perde (o problema dos chutes que não registram)', a91);
  confere(a92.chutou >= 0, 'v92: o mesmo toque fica armado e vira chute quando a bola entra no alcance', a92);
  const b92 = toqueAntes(N.PERFIL_V92, 8);
  confere(b92.chutou < 0, 'v92: o toque armado vale só 6 passos (100 ms): 8 passos antes não chuta (não vira um chute "fantasma" atrasado)', b92);
}
{
  // o contador de toques: o comando com o botão é descartado (alcança de uma vez depois de um tranco) — o toque continua valendo
  const mkp = perfil => {
    const rel = { t: 1000 };
    const p = new Nova.PartidaSala({ n: 1, jogo: 'futebol', jogadores: [{ netId: 'h', nome: 'Ana' }, { netId: 'x', nome: 'Beto' }], agora: () => rel.t, fisica: perfil, fisicaBase: perfil });
    p.estado = 'jogo'; return { p, rel };
  };
  const roda = (perfil, comContador) => {
    const { p, rel } = mkp(perfil), q = p.jog[0], G = p.G;
    q.x = G.CX; q.y = G.CY; p.jog[1].x = G.CX + 500;
    p.B.x = G.CX + p.C.ALCANCE_CHUTE - 4; p.B.y = G.CY; p.B.vx = p.B.vy = 0;
    let seq = 0; const ct0 = q.chuteT;
    p.entrada('h', { seq: ++seq, x: 0, y: 0, button: 1, k: 0, kc: comContador ? 0 : undefined }); p.passo(); rel.t += 16.7;
    // 12 comandos chegam de uma vez (o tranco): o toque está no 2º e o motor descarta os mais velhos para alcançar
    for (let k = 0; k < 12; k++) { const toque = k === 1; p.entrada('h', { seq: ++seq, x: 0, y: 0, button: toque ? 2 : 1, k: 0, kc: comContador ? (k >= 1 ? 1 : 0) : undefined }); }
    p.entrada('x', { seq: 1, x: 0, y: 0, button: 1, k: 0 });
    for (let i = 0; i < 12; i++) { rel.t += 16.7; p.entrada('x', { seq: 2 + i, x: 0, y: 0, button: 1, k: 0 }); p.passo(); }
    return q.chuteT !== ct0;
  };
  confere(roda(N.PERFIL_V92, true), 'v92: o toque que estava num comando descartado (o motor alcançando depois de um tranco) vira chute pelo contador', null);
}
{
  // a tampinha andando para dentro do gol pela lateral da rede: no perfil v92 a rede segura (como no jogo); no v91 o servidor deixava passar
  const atravessa = perfil => {
    const rel = { t: 1000 };
    const p = new Nova.PartidaSala({ n: 1, jogo: 'futebol', jogadores: [{ netId: 'h', nome: 'Ana' }, { netId: 'x', nome: 'Beto' }], agora: () => rel.t, fisica: perfil, fisicaBase: perfil });
    p.estado = 'jogo';
    const q = p.jog[0], G = p.G;
    p.jog[1].x = G.CX + 300; p.jog[1].y = G.CY;          // (o outro não manda nada: fica parado longe)
    q.x = G.LX0 - G.GOL_PROF / 2; q.y = G.GOL_Y0 - q.r - 30;   // ao lado da rede (por fora do gol), indo para baixo, atravessando a lateral
    let seq = 0;
    for (let i = 0; i < 40; i++) { rel.t += 16.7; p.entrada('h', { seq: ++seq, x: 0, y: 1, button: 1, k: 0 }); p.passo(); }
    return q.y > G.GOL_Y0 + q.r;                         // passou da lateral da rede para dentro do gol?
  };
  confere(atravessa(N.PERFIL_V91), 'v91: no servidor a tampinha atravessava a lateral da rede (no jogo ela batia: era um tranco na tela)', null);
  confere(!atravessa(N.PERFIL_V92), 'v92: a rede segura a tampinha também no servidor, como no jogo', null);
}

console.log('\n3) o perfil de fora é limpo');
{
  const l = N.perfilLimpo({ velJog: 999, rBola: -5, direcoes: 20, bufferToque: 6.6, xss: '<script>', jogRede: 0.2, fatorBola: 'abc' });
  confere(l.velJog === N.LIMITES.velJog[1] && l.rBola === N.LIMITES.rBola[0], 'valores fora dos limites são cortados (velocidade 999 → ' + l.velJog + ' u/s; bola −5 → ' + l.rBola + ' u)', l);
  confere(l.direcoes === 32 && l.bufferToque === 7 && l.jogRede === 0 && l.fatorBola === N.PERFIL_V92.fatorBola, 'direções viram 8/16/32/64/livre, o toque armado vira inteiro, o que não é número volta ao padrão', l);
  confere(!('xss' in l) && Object.keys(l).length === Object.keys(N.PERFIL_V92).length, 'só os campos conhecidos entram', Object.keys(l));
  const C = N.resolve(N.PERFIL_V92), F = require('../server/partida/fisica.js');   // (v103: a fisica.js segue o padrão do jogo — o CHUTE 360)
  const iguais = ['R_JOG', 'RAIO_CHUTE', 'MASSA_JOG', 'VEL_JOG', 'FORCA_KICK', 'FORCA_POWER', 'R_BOLA', 'MASSA_BOLA', 'LIMITE_VEL_BOLA', 'FATOR_BOLA', 'AMORT_ANGULAR', 'ATRITO_BOLA', 'ATRITO_JOG_BOLA', 'ATRITO_TRAVE_BOLA', 'QUIQUE_BOLA', 'Q_PAREDE', 'Q_TRAVE', 'Q_REDE', 'ALCANCE_CHUTE'].filter(k => C[k] !== F[k]);
  confere(!iguais.length, 'o PERFIL_V92 (o padrão) resolve exatamente nas constantes da fisica.js (as do jogo)', iguais);
  const d = Object.keys(N.PERFIL_V92).filter(k => N.PERFIL_V92[k] !== N.PERFIL_V91[k]);
  confere(JSON.stringify(d.sort()) === JSON.stringify(['atritoJogJog', 'bufferToque', 'direcoes', 'forcaChute', 'jogRede', 'viraNaHora']) && N.PERFIL_V92.forcaChute === 360 && N.PERFIL_V92.forcaPasse === N.PERFIL_V91.forcaPasse
    && N.PERFIL_V92.atritoJogJog === 0.2 && N.PERFIL_V91.atritoJogJog === 0 && N.PERFIL_V92.viraNaHora === 1 && N.PERFIL_V91.viraNaHora === 0 && N.PERFIL_V92.direcoes === 64 && N.PERFIL_V91.direcoes === 32,
    'o PERFIL_V92 só difere do v91 no toque armado, na rede, no CHUTE da v103 (360, era 340) e na v105: o jogo de corpo (o atrito tampinha × tampinha 0,5), a virada na hora e as 64 direções (o PASSE e o resto da física são os mesmos)', d);
}

console.log('\n4) o relógio do motor das salas');
async function mede(modo, ms) {
  const caminho = require.resolve('../server/partida/sala.js');
  delete require.cache[caminho];
  const antes = process.env.RACHA_MOTOR; if (modo) process.env.RACHA_MOTOR = modo; else delete process.env.RACHA_MOTOR;
  const S = require('../server/partida/sala.js');
  if (antes === undefined) delete process.env.RACHA_MOTOR; else process.env.RACHA_MOTOR = antes;
  const p = new S.PartidaSala({ n: 1, jogo: 'futebol', jogadores: bots(1) });
  p.ligar();
  const t = Date.now(); const k0 = p.tick;
  const ref = setInterval(() => {}, 1000);                 // (os timers do motor não seguram o processo: este segura)
  await new Promise(r => setTimeout(r, ms));
  clearInterval(ref);
  const tps = (p.tick - k0) * 1000 / (Date.now() - t);
  p.desligar();
  return tps;
}
{
  const novo = await mede('', 3000), velho = await mede('v91', 3000);
  confere(Math.abs(novo - 60) < 0.8, `o motor novo (acumulador) dá ${novo.toFixed(2)} passos por segundo (60 de verdade)`, novo);
  console.log(`  (medida) o motor da v91 (setInterval de 1000/60 ms) deu ${velho.toFixed(2)} passos por segundo nesta máquina`);
}

console.log(`\nv92 · o núcleo compartilhado e o motor das salas: ${ok}/${ok + falhas.length} verificações ok em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
for (const f of falhas) console.log('  - falhou: ' + f);
process.exit(falhas.length ? 1 : 0);
