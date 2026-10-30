'use strict';
/* RACHA v94 · O MOTOR PRÓPRIO — o contrato da API e as metas da especificação (docs/v94/ESPECIFICACAO_MOTOR.md, seções
   13, 14 e 16), sem navegador. Rodar: node tests/v94_motor_test.js   (RACHA_MOTOR=/caminho/motor.js para outro arquivo) */
const path = require('path');
const MOTOR = process.env.RACHA_MOTOR || path.join(__dirname, '..', 'server', 'partida', 'motor.js');
const M = require(MOTOR);
const { cenarios } = require('./v94/cenarios.js');
const AN = require('./v94/adaptador_novo.js');

let ok = 0, falhou = 0;
function confira(cond, txt, extra) {
  if (cond) { ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU ' + txt + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 500) : '')); }
}
const entre = (v, a, b) => typeof v === 'number' && v >= a && v <= b;
const d = 0.8;

console.log('\n1) a API (seção 14)');
for (const f of ['perfil', 'resolve', 'campo', 'mundo', 'saida', 'comando', 'passo', 'poeJogador', 'poeBola', 'obstaculos',
  'copia', 'empacota', 'desempacota', 'reiniciaComandos', 'bolaDistancia', 'bolaVelocidadePara', 'bolaTempo', 'bolaPrevisao', 'alcance'])
  confira(typeof M[f] === 'function', 'M.' + f + ' existe');
confira(M.VERSAO === '94.0' && Math.abs(M.DT - 1 / 60) < 1e-12, 'VERSAO 94.0 e DT = 1/60', [M.VERSAO, M.DT]);
confira(M.PADRAO && M.LIMITES && Object.keys(M.PADRAO).every(k => Array.isArray(M.LIMITES[k])), 'cada parâmetro do PADRAO tem a faixa no LIMITES');
{
  const p = M.perfil({ vMax: 99, aAcel: -5, janelaToque: 3.7, inventado: 1 });
  confira(p.vMax === M.LIMITES.vMax[1] && p.aAcel === M.LIMITES.aAcel[0] && p.janelaToque === 4 && !('inventado' in p) && Object.keys(p).length === Object.keys(M.PADRAO).length,
    'perfil(): corta nas faixas, arredonda os passos e ignora chave desconhecida', p);
}
const R = M.resolve(M.PADRAO);
confira(JSON.stringify(JSON.parse(JSON.stringify(R))) === JSON.stringify(R), 'resolve() é JSON puro');
confira(Math.abs(R.rJ - 0.4) < 1e-12 && Math.abs(R.rB - 0.2) < 1e-12, 'os raios: tampinha 0,40 m e bola 0,20 m', [R.rJ, R.rB]);

console.log('\n2) o campo (seção 2)');
const esperado = { 1: [13.45, 9.22], 2: [18.57, 13.36], 3: [22.16, 16.79], 4: [24.90, 19.92] };
for (const n of [1, 2, 3, 4]) {
  const G = M.campo(n, R);
  confira(Math.abs(G.L / d - esperado[n][0]) < 0.02 && Math.abs(G.W / d - esperado[n][1]) < 0.02, n + ' VS ' + n + ': ' + (G.L / d).toFixed(2) + ' × ' + (G.W / d).toFixed(2) + ' d (a regra)', [G.L / d, G.W / d]);
  const B = 0.4 * d + 0.30 * G.W, Rc = 0.8 * d + 0.12 * G.W;
  confira(Math.abs(G.boca - B) < 1e-9 && Math.abs(G.circulo - Rc) < 1e-9 && Math.abs(G.fundo - 1.55 * d) < 1e-9 && G.traves.length === 4 && G.redes.length === 6 && G.paredesBola.length === 6,
    '   a boca, o círculo, a profundidade, 4 traves, 6 redes e 6 paredes da bola', { boca: G.boca, circ: G.circulo, traves: G.traves.length, redes: G.redes.length, paredes: G.paredesBola.length });
  confira(Math.abs(G.area.x1 - (G.L / 2 + 2.4 * d)) < 1e-9 && Math.abs(G.area.y1 - (G.W / 2 + 1.35 * d)) < 1e-9 && G.marcas && G.marcas.areaGrande && G.marcas.areaPequena && G.marcas.penalti, '   a área da tampinha e as marcas para o desenho', G.area);
}

console.log('\n3) o mundo, a saída e a barreira (seções 10 e 14)');
{
  const W = M.mundo({ n: 2, jogo: 'futebol', jogadores: [{ time: 0 }, { time: 0 }, { time: 1 }, { time: 1 }], R });
  confira(JSON.stringify(JSON.parse(JSON.stringify(W))) === JSON.stringify(W), 'o mundo é JSON puro');
  M.saida(W, 0);
  confira(W.estado === 'saida' && W.bola.x === 0 && W.bola.y === 0 && W.jog.every((q, i) => (q.time === 0 ? q.x < 0 : q.x > 0)), 'saida(): a bola no centro, cada time no seu campo', W.jog.map(q => [q.x.toFixed(2), q.y.toFixed(2)]));
  const G = W.G;
  confira(Math.hypot(W.jog[2].x, W.jog[2].y) >= G.circulo + R.rJ - 1e-9, '   quem não dá a saída fica fora do círculo', Math.hypot(W.jog[2].x, W.jog[2].y));
  // o time 1 tenta entrar no círculo e passar do meio: a barreira segura
  M.comando(W, 2, { mx: -1, my: 0, passe: 0, chute: 0, curva: 0, np: 0, nc: 0 });
  for (let k = 0; k < 120; k++) M.passo(W);
  confira(W.estado === 'saida' && W.jog[2].x >= 0 && Math.hypot(W.jog[2].x, W.jog[2].y) >= G.circulo + R.rJ - 1e-6, '   a barreira: o time 1 não passa do meio nem entra no círculo', [W.jog[2].x, Math.hypot(W.jog[2].x, W.jog[2].y)]);
  // o batedor toca na bola: a saída acaba
  M.comando(W, 0, { mx: 1, my: 0, passe: 0, chute: 0, curva: 0, np: 0, nc: 0 });
  let ev = []; for (let k = 0; k < 60 && W.estado === 'saida'; k++) ev = ev.concat(M.passo(W));
  confira(W.estado === 'jogo' && ev.some(e => e.t === 'saida') && ev.some(e => e.t === 'toque' && e.j === 0), '   o batedor encostou: estado jogo, eventos saida e toque', ev.slice(0, 6));
}

console.log('\n4) o gol (seção 11)');
{
  const W = M.mundo({ n: 1, jogo: 'futebol', jogadores: [{ time: 0 }, { time: 1 }], R });
  M.poeJogador(W, 0, 0, -3, 0, 0); M.poeJogador(W, 1, 0, 3, 0, 0);
  const G = W.G;
  M.poeBola(W, G.L / 2 - 1, 0, 6, 0);
  let gol = []; for (let k = 0; k < 60; k++) gol = gol.concat(M.passo(W).filter(e => e.t === 'gol'));
  confira(gol.length === 1 && gol[0].lado === 1, 'a bola entra no gol da direita: um evento gol (lado 1)', gol);
  const W2 = M.mundo({ n: 1, jogo: 'futebol', jogadores: [{ time: 0 }, { time: 1 }], R });
  M.poeJogador(W2, 0, 0, -3, 0, 0); M.poeJogador(W2, 1, 0, 3, 0, 0);
  M.poeBola(W2, G.L / 2 - 1, G.boca / 2 + 0.6, 6, 0);
  let gol2 = [], parede = 0; for (let k = 0; k < 60; k++) for (const e of M.passo(W2)) { if (e.t === 'gol') gol2.push(e); if (e.t === 'parede') parede++; }
  confira(gol2.length === 0 && parede >= 1 && W2.bola.x < G.L / 2, 'fora da boca: bate na linha de fundo e não é gol', { gol2, parede, x: W2.bola.x });
}

console.log('\n5) determinismo, cópia e empacotamento (seção 13)');
{
  const novo = () => { const W = M.mundo({ n: 3, jogo: 'futebol', jogadores: [0, 0, 0, 1, 1, 1].map(t => ({ time: t })), R }); M.saida(W, 1); return W; };
  const A = novo(), B = novo();
  const cmd = (k, j) => ({ mx: Math.sin(k * 0.07 + j), my: Math.cos(k * 0.05 - j), passe: (k + j) % 23 < 2 ? 1 : 0, chute: (k * 3 + j) % 31 < 2 ? 1 : 0, curva: 0, np: Math.floor((k + j) / 23), nc: Math.floor((k * 3 + j) / 31) });
  let pacote = null, Cp = null;
  for (let k = 0; k < 900; k++) {
    for (let j = 0; j < 6; j++) { M.comando(A, j, cmd(k, j)); M.comando(B, j, cmd(k, j)); }
    M.passo(A); M.passo(B);
    if (k === 400) { pacote = M.empacota(A); Cp = M.copia(A); }
  }
  confira(JSON.stringify(A) === JSON.stringify(B), 'dois mundos, os mesmos comandos (900 passos, 3 VS 3): o mesmo estado, bit a bit');
  // desempacota no passo 400 e refaz: tem de dar o mesmo que A
  const D2 = novo(); M.desempacota(D2, pacote);
  const D3 = M.copia(Cp);
  for (let k = 401; k < 900; k++) for (const W of [D2, D3]) { for (let j = 0; j < 6; j++) M.comando(W, j, cmd(k, j)); M.passo(W); }
  confira(JSON.stringify(D2.jog.map(q => [q.x, q.y, q.vx, q.vy])) === JSON.stringify(A.jog.map(q => [q.x, q.y, q.vx, q.vy])) && D2.bola.x === A.bola.x && D2.bola.vy === A.bola.vy,
    'desempacota() no passo 400 e refaz: igual ao mundo que não parou');
  confira(JSON.stringify(D3) === JSON.stringify(A), 'copia() no passo 400 e refaz: igual ao mundo que não parou');
  const src = require('fs').readFileSync(MOTOR, 'utf8');
  const corpo = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  confira(!/Math\.random|Date\.now|performance\.now/.test(corpo), 'nada de Math.random nem relógio no motor');
}

console.log('\n6) cinemática, obstáculos, curva e as ajudas dos bots (seções 3, 8 e 14)');
{
  const W = M.mundo({ n: 2, jogo: 'futebol', jogadores: [{ time: 0, cinematico: true }, { time: 1 }], R });
  M.poeJogador(W, 0, -2, 0, 2, 0); M.poeJogador(W, 1, 3, 0, 0, 0); M.poeBola(W, -1.3, 0, 0, 0);
  for (let k = 0; k < 30; k++) M.passo(W);
  confira(Math.abs(W.jog[0].x - (-2 + 2 * 30 / 60)) < 1e-9 && Math.abs(W.jog[0].vx - 2) < 1e-12 && W.bola.vx > 1.9, 'a tampinha cinemática anda pela velocidade dela e empurra a bola', [W.jog[0].x, W.bola.vx]);
  const O = M.mundo({ n: 2, jogo: 'futebol', jogadores: [{ time: 0 }, { time: 1 }], R });
  M.poeJogador(O, 0, -5, 3, 0, 0); M.poeJogador(O, 1, 5, 3, 0, 0);
  M.obstaculos(O, [{ tipo: 'segmento', x0: 1, y0: -2, x1: 1, y1: 2, e: 0.1, quique: 0.5, afeta: 'ambos' }]);
  M.poeBola(O, 0, 0, 5, 0);
  for (let k = 0; k < 30; k++) M.passo(O);
  confira(O.bola.vx < 0 && O.bola.x < 1, 'o obstáculo do treino devolve a bola', [O.bola.x, O.bola.vx]);
  const C = M.mundo({ n: 2, jogo: 'curva', jogadores: [{ time: 0 }, { time: 1 }], R });
  M.poeJogador(C, 0, -4, 0, 0, 0); M.poeJogador(C, 1, 6, 4, 0, 0); M.poeBola(C, -4 + R.rJ + R.rB + 0.01, 0, 0, 0);
  for (let k = 0; k < 40; k++) { M.comando(C, 0, { mx: 0, my: 0, passe: 0, chute: 0, curva: 1, np: 0, nc: 0 }); M.passo(C); }
  M.comando(C, 0, { mx: 0, my: -1, passe: 0, chute: 0, curva: 0, np: 0, nc: 0 });   // (solta a CURVA com o analógico para cima)
  let evc = []; for (let k = 0; k < 4; k++) evc = evc.concat(M.passo(C));
  const ch = evc.find(e => e.t === 'chute');
  for (let k = 0; k < 30; k++) M.passo(C);
  confira(ch && ch.b === 'curva' && Math.abs(C.bola.vy) > 0.3, 'CURVA: segurar carrega, soltar chuta e a bola entorta', { ch, vy: C.bola.vy });
  const v0 = 6, dist = M.bolaDistancia(R, v0);
  const W2 = M.mundo({ n: 4, jogo: 'futebol', jogadores: [{ time: 0 }, { time: 1 }], R });
  M.poeJogador(W2, 0, -10, 7, 0, 0); M.poeJogador(W2, 1, 10, 7, 0, 0); M.poeBola(W2, -dist / 2, 0, v0, 0);
  for (let k = 0; k < 60 * 12 && (W2.bola.vx !== 0 || W2.bola.vy !== 0); k++) M.passo(W2);
  confira(Math.abs(W2.bola.x - dist / 2) < 0.05, 'bolaDistancia() bate com a bola rolando no motor (' + dist.toFixed(2) + ' m)', [W2.bola.x + dist / 2, dist]);
  const v1 = M.bolaVelocidadePara(R, 5, 1);
  const p = M.bolaPrevisao(R, 0, 0, v1, 0, Math.round(M.bolaTempo(R, v1, 5) / M.DT));
  confira(Math.abs(p.x - 5) < 0.06 && Math.abs(p.vx - 1) < 0.06, 'bolaVelocidadePara / bolaTempo / bolaPrevisao são coerentes', [v1, p]);
  confira(Math.abs(M.alcance(R) - (R.rJ + R.rB + 0.11)) < 1e-9, 'alcance() = rJ + rB + folgaChute');
}

console.log('\n6b) fatorVel, o evento obstaculo e reiniciaComandos (seções 4, 12 e 14)');
{
  const para = (W, j, mx) => M.comando(W, j, { mx, my: 0, passe: 0, chute: 0, curva: 0, np: 0, nc: 0 });
  const F = M.mundo({ n: 2, jogo: 'futebol', jogadores: [{ time: 0, fatorVel: 0.8 }, { time: 1 }], R });
  M.poeJogador(F, 0, -5, -3, 0, 0); M.poeJogador(F, 1, -5, 3, 0, 0); M.poeBola(F, 6, 0, 0, 0);
  for (let k = 0; k < 60; k++) { para(F, 0, 1); para(F, 1, 1); M.passo(F); }
  confira(Math.abs(F.jog[0].vx - 0.8 * R.vMax) < 1e-9 && Math.abs(F.jog[1].vx - R.vMax) < 1e-9, 'fatorVel 0,8: a corrida dele é 0,8 × vMax (a do outro, vMax)', [F.jog[0].vx, F.jog[1].vx]);
  const F2 = M.mundo({ n: 2, jogo: 'futebol', jogadores: [{ time: 0 }, { time: 1 }], R });
  M.desempacota(F2, M.empacota(F));
  confira(M.copia(F).jog[0].fatorVel === 0.8 && F2.jog[0].fatorVel === 0.8, 'o fatorVel fica no mundo, na cópia e no empacotamento');
  const O = M.mundo({ n: 2, jogo: 'futebol', jogadores: [{ time: 0 }, { time: 1 }], R });
  M.poeJogador(O, 0, -5, 3, 0, 0); M.poeJogador(O, 1, 5, 3, 0, 0);
  M.obstaculos(O, [{ tipo: 'circulo', x: 3, y: 3, r: 0.3, quique: 0.5, afeta: 'ambos' }, { tipo: 'segmento', x0: 1, y0: -2, x1: 1, y1: 2, e: 0.1, quique: 0.5, afeta: 'ambos' }]);
  M.poeBola(O, 0, 0, 5, 0);
  let eo = []; for (let k = 0; k < 30; k++) eo = eo.concat(M.passo(O).filter(e => e.t === 'obstaculo'));
  confira(eo.length === 1 && eo[0].i === 1 && eo[0].v > 2, 'a bola bate no obstáculo 1: um evento {t: obstaculo, i: 1, v}', eo);
  const K = M.mundo({ n: 1, jogo: 'futebol', jogadores: [{ time: 0 }, { time: 1 }], R });
  M.poeJogador(K, 0, -1, 0, 0, 0); M.poeJogador(K, 1, 4, 3, 0, 0); M.poeBola(K, -1 + R.rJ + R.rB + 0.05, 0, 0, 0);
  M.comando(K, 0, { mx: 0, my: 0, passe: 0, chute: 0, curva: 0, np: 0, nc: 0 }); M.passo(K);
  M.reiniciaComandos(K, 0);
  M.comando(K, 0, { mx: 0, my: 0, passe: 0, chute: 0, curva: 0, np: 5, nc: 9 });
  let ek = M.passo(K);
  confira(!ek.some(e => e.t === 'chute') && K.bola.vx === 0, 'depois de reiniciaComandos o primeiro comando é a base (os contadores 5 e 9 não viram toques)', ek);
  M.comando(K, 0, { mx: 0, my: 0, passe: 0, chute: 0, curva: 0, np: 5, nc: 10 });
  ek = M.passo(K);
  confira(ek.some(e => e.t === 'chute' && e.j === 0 && e.b === 'chute'), '   e o toque seguinte vale (um CHUTE)', ek);
}

console.log('\n7) as metas (seção 16), pelos cenários de medida');
const X = cenarios(AN);
const a = X.arrancada, fr = X.frenagem, iv = X.inversao;
confira(entre(a.vmax_d_s, 3.6, 3.8) && entre(a.t90_s, 0.04, 0.07) && a.t99_s <= 0.08, 'arrancada: vmax 3,6–3,8 d/s; t90 0,04–0,07 s; t99 ≤ 0,08 s', a);
confira(entre(fr.t_parar_s, 0.03, 0.08) && fr.dist_parar_d <= 0.12, 'frenagem: 0,03–0,08 s; ≤ 0,12 d', fr);
confira(iv.t_zero_s <= 0.05 && iv.t90_s <= 0.10, 'inversão: zero ≤ 0,05 s; 90% ≤ 0,10 s', iv);
confira(X.virada90.t_direcao10_s <= 0.10, 'virada de 90°: ≤ 0,10 s', X.virada90);
confira(Math.abs(X.analogico.diagonal_sobre_reta - 1) <= 0.01 && Math.abs(X.analogico.meia_0_5 - 1) <= 0.01 && X.analogico.quase_nada_0_02 === 0, 'analógico: diagonal = reta; meia = toda; 0,02 parado', X.analogico);
confira(entre(X.passe_parado.v0_d_s, 5.8, 6.2) && entre(X.passe_parado.fator_por_s, 0.5, 0.6) && X.passe_parado.t_parar_s < 8, 'passe parado: 5,8–6,2 d/s; fator 0,50–0,60/s; para', X.passe_parado);
confira(entre(X.chute_parado.v0_d_s, 9.3, 9.7) && entre(X.chute_parado.fator_por_s, 0.5, 0.6), 'chute parado: 9,3–9,7 d/s; fator 0,50–0,60/s', X.chute_parado);
confira(entre(X.chute_correndo.v_d_s, 10.5, 11.5), 'chute correndo: 10,5–11,5 d/s', X.chute_correndo);
confira(entre(X.chute_bola_vindo_3.v_d_s, 9.2, 9.8) && entre(X.chute_bola_indo_3.v_d_s, 10.1, 10.7), 'a bola vindo ≈ o chute parado; indo ≈ chute + 0,9 d/s', [X.chute_bola_vindo_3, X.chute_bola_indo_3]);
confira(entre(X.alcance.folga_alem_do_contato_d, 0.13, 0.15), 'alcance: a folga 0,13–0,15 d', X.alcance);
confira(Math.abs(X.direcao_chute.bola_a_30_graus - 30) < 0.5 && Math.abs(X.direcao_chute.bola_a_60_graus - 60) < 0.5, 'a direção: a linha dos centros', X.direcao_chute);
const r90 = X.rebote_parede_90_8, r45 = X.rebote_parede_45_8, r3 = X.rebote_parede_90_3;
confira(r90 && entre(r90.e_normal, 0.55, 0.65) && r45 && entre(r45.e_normal, 0.55, 0.65) && entre(r45.retem_tangente, 0.85, 0.95) && r3 && r3.e_normal > 0.4, 'rebote na linha: e 0,55–0,65; tangente 0,85–0,95; a 3 d/s quica', [r90, r45, r3]);
confira(X.rebote_trave_8 && entre(X.rebote_trave_8.e_normal, 0.5, 0.6), 'trave: e 0,50–0,60', X.rebote_trave_8);
const cd = X.conducao;
confira(cd.toques_em_1_5s >= 2 && cd.vao_mediano_d <= 0.1 && cd.vao_max_d <= 0.3 && entre(cd.bola_sobre_jog, 0.9, 1.3), 'condução: toques curtos (≥ 2 em 1,5 s), vão ≤ 0,1 d (máx ≤ 0,3), bola ÷ tampinha 0,9–1,3', cd);
confira(X.disputa.bola_deslocou_d < 0.1, 'disputa de frente: a bola quase não sai do lugar', X.disputa);
const cp = X.combo_parada;
confira(cp.k0.chutes === 'chute@0' && cp.k1.chutes === 'passe@0 chute@1' && entre(cp.k1.v_d_s, 12.5, 13.01) && cp.k2.chutes === 'passe@0' && cp.k3.chutes === 'passe@0' && cp.k5.chutes === 'passe@0',
  'combinação com a bola parada: só no passo seguinte (~13 d/s)', cp);
confira(X.combo_vindo_3.k1.chutes === 'passe@0 chute@1', 'combinação com a bola vindo: no passo seguinte', X.combo_vindo_3);
confira(X.segurando_chega.chutes === 1, 'segurando o CHUTE: um chute quando a bola entra no alcance', X.segurando_chega);
const ta = X.toque_antecipado;
confira(ta.antes_0ms && ta.antes_33ms && ta.antes_67ms && ta.antes_100ms && !ta.antes_150ms && !ta.antes_200ms, 'toque antecipado: até 100 ms vale; 150 e 200 ms não', ta);
confira(entre(X.intervalo_chutes.menor_intervalo_s, 0.099, 0.101) && X.intervalo_chutes.chutes_em_1s <= 10, 'intervalo entre chutes: 0,10 s', X.intervalo_chutes);
{
  const W = M.mundo({ n: 4, jogo: 'futebol', jogadores: [0, 0, 0, 0, 1, 1, 1, 1].map(t => ({ time: t })), R }); M.saida(W, 0); W.estado = 'jogo';
  for (let j = 0; j < 8; j++) M.comando(W, j, { mx: j % 2 ? 1 : -1, my: (j % 3) - 1, passe: 0, chute: 1, curva: 0, np: 0, nc: 1 });
  const t0 = process.hrtime.bigint(); for (let k = 0; k < 1000; k++) M.passo(W); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  confira(ms < 100, 'desempenho: 4 VS 4, 1000 passos em ' + ms.toFixed(1) + ' ms (< 100)', ms);
}

console.log('\n' + ok + ' ok, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
