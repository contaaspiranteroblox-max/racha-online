'use strict';
/* =====================================================================================================================
   RACHA v94 · O MOTOR PRÓPRIO NAS SALAS — a ligação do motor (server/partida/motor.js) com a sala (sala.js: a fila de
   comandos, os bots, a máquina de estados, a autoria, as estatísticas, o quadro).
   Numa sala com o motor próprio (p.v94):
     · a física, a máquina dos botões, a barreira da saída e o gol são do motor — o MESMO arquivo e os MESMOS números que o
       aparelho usa na previsão (o servidor manda o perfil resolvido na sala);
     · os objetos de sempre da sala (p.jog, p.B, p.G em px) continuam existindo para o resto do código: depois de cada passo
       as posições saem do motor para eles; se alguém mexer neles por fora, isso entra no motor como teleporte;
     · o comando de cada humano é o da fila de sempre (seq, palpite, descarte, silêncio): a direção do comando da vez e os
       botões e contadores de toque (kc = PASSE, pc = CHUTE) do último comando consumido; o bot "toca" o botão (o contador
       sobe) quando quer chutar — a mesma regra de todo mundo, sem privilégio;
     · fora do jogo (comemoração, fim) ninguém joga: o motor esquece as intenções e os contadores viram a base (um toque
       durante a comemoração não vira chute na saída);
     · o quadro leva o estado do motor (m94), para a previsão do aparelho voltar ao estado do servidor e refazer só os
       comandos que ainda não chegaram lá.
   Unidades: o motor em metros; a sala em px do jogo (PX px por metro, o mesmo do aparelho).
   ===================================================================================================================== */
const path = require('path');
const M = require(path.join(__dirname, 'motor.js'));

const PX = 95;                                        // px do jogo por metro (o aparelho usa o mesmo: tools/v94/base.js)
const PX_POR_U = 19;                                  // (a unidade antiga do jogo: as "forças" de compatibilidade dos bots)
const MARGEM_X = 206, MARGEM_Y = 59;                  // a margem do cenário da Arena e do Estádio (px), a mesma do aparelho
const m = v => v / PX, px = v => v * PX;

/* o campo da sala em px (os mesmos nomes do campo antigo: os bots e as regras leem igual) */
function campoPx(G) {
  const pw = (G.area.x1 - G.area.x0) * PX, ph = (G.area.y1 - G.area.y0) * PX;
  const MW = Math.round(pw + 2 * MARGEM_X), MH = Math.round(ph + 2 * MARGEM_Y), CX = MW / 2, CY = MH / 2;
  const X = x => CX + x * PX, Y = y => CY + y * PX;
  return {
    n: G.n, MW, MH, CX, CY,
    GL: X(G.area.x0), GR: X(G.area.x1), GT: Y(G.area.y0), GB: Y(G.area.y1),
    LX0: X(G.linhas.x0), LX1: X(G.linhas.x1), LY0: Y(G.linhas.y0), LY1: Y(G.linhas.y1),
    GOL_PROF: G.fundo * PX, GOL_Y0: CY - G.boca / 2 * PX, GOL_Y1: CY + G.boca / 2 * PX,
    POST_R: G.traves[0].r * PX,
    POSTS: G.traves.map(t => [X(t.x), Y(t.y)]),
    NET_SEGS: G.redes.map(s => [X(s.x0), Y(s.y0), X(s.x1), Y(s.y1)]),
    WALL_SEGS: G.paredesBola.map(s => [X(s.x0), Y(s.y0), X(s.x1), Y(s.y1)]),
    circ: G.circulo * PX,
  };
}
/* os números que o resto da sala e os bots leem (px, px/s; as "forças" antigas: Δv em u/s com massa 1) */
function compat(R) {
  const alc = M.alcance(R) * PX;
  return {
    v94: true, R_JOG: R.rJ * PX, R_BOLA: R.rB * PX, MASSA_JOG: 1, MASSA_BOLA: 1, ALCANCE_CHUTE: alc, RAIO_CHUTE: alc - R.rB * PX,
    VEL_JOG: R.vMax * PX, FORCA_KICK: R.vPasse * PX / PX_POR_U, FORCA_POWER: R.vChute * PX / PX_POR_U,
    LIMITE_VEL_BOLA: R.vMaxBola * PX, A_PARA: R.aPara * PX, DB_MODO: 0,
  };
}

/* ---------------------------------------------------------------- ligar a sala no motor próprio */
function liga(p, o) {
  p.v94 = true;
  p.R94 = M.resolve(o.fisica94 || M.PADRAO);
  p.C = compat(p.R94);
  p.W94 = M.mundo({ n: p.n, jogo: p.jogo, jogadores: p.jog.map(q => ({ time: q.time })), R: p.R94 });
  p.G = campoPx(p.W94.G);
  p.B = { x: p.G.CX, y: p.G.CY, vx: 0, vy: 0, w: 0, r: p.C.R_BOLA, m: 1, I: 1, cv: 0, cvT: 0 };
  for (const q of p.jog) { q.r = p.C.R_JOG; q.m = 1; q.cont94 = novoCont(); }
  p.sombra94 = p.jog.map(() => null); p.bolaS94 = null;
}
const novoCont = () => ({ np: 0, nc: 0, bh: 0, cv: 0, ordem: null });
function reiniciaJogador(p, q) {                      // outra conexão (ou um bot) assumiu a tampinha: os contadores recomeçam
  if (!p.v94) return;
  M.reiniciaComandos(p.W94, q.i);
  q.cont94 = novoCont();
}

/* ---------------------------------------------------------------- o comando de quem joga */
const botoes = c => Number.isInteger(c.bh) ? c.bh & 3 : (c.button === 2 ? 1 : c.button === 3 ? 2 : 0);
// um comando consumido (na vez dele ou atrasado): os contadores, os botões apertados e o relógio do toque dele
function conta(p, q, c) {
  const k = q.cont94, bh = botoes(c);
  let np = k.np, nc = k.nc;
  if (Number.isInteger(c.kc)) np = c.kc; else if ((bh & 1) && !(k.bh & 1)) np++;      // (sem contador: solto → apertado)
  if (Number.isInteger(c.pc)) nc = c.pc; else if ((bh & 2) && !(k.bh & 2)) nc++;
  if (np < k.np || nc < k.nc) M.reiniciaComandos(p.W94, q.i);   // o aparelho recomeçou a contar: o próximo comando é a base
  k.np = np; k.nc = nc; k.bh = bh; k.cv = (c.k | 0) & 1;
  k.ordem = Number.isFinite(c.dt) ? c.dt / 10 : null;                                  // (décimos de ms → ms)
}
// o comando do passo: a direção do comando da vez (ou do palpite) e os botões do último consumido
function comandoHumano(p, q, dir, vale) {
  const k = q.cont94, W = p.W94;
  if (!vale) {                                         // fora do jogo: ninguém joga; os contadores de agora viram a base
    M.reiniciaComandos(W, q.i);
    M.comando(W, q.i, { mx: 0, my: 0, passe: 0, chute: 0, curva: 0, np: k.np, nc: k.nc });
    return;
  }
  const cmd = { mx: dir ? dir.x : 0, my: dir ? dir.y : 0, passe: k.bh & 1, chute: (k.bh >> 1) & 1, curva: k.cv, np: k.np, nc: k.nc };
  if (k.ordem != null) cmd.ordem = k.ordem;
  M.comando(W, q.i, cmd);
}
function semComando(p, q) {                           // sem notícia dele (o silêncio): parado e com os botões soltos
  const k = q.cont94; k.bh = 0; k.cv = 0;
  M.comando(p.W94, q.i, { mx: 0, my: 0, passe: 0, chute: 0, curva: 0, np: k.np, nc: k.nc });
}
function comandoBot(p, q) {                           // o bot: a direção que ele escolheu e o toque que ele pediu (chuta)
  const k = q.cont94, vale = p.estado === 'saida' || p.estado === 'jogo';
  if (!vale) { q.pede94 = null; comandoHumano(p, q, null, false); return; }
  if (q.pede94 === 'chute') k.nc++; else if (q.pede94 === 'passe') k.np++;
  q.pede94 = null;
  M.comando(p.W94, q.i, { mx: mil(q.mx), my: mil(q.my), passe: 0, chute: 0, curva: 0, np: k.np, nc: k.nc });
}
const mil = v => Math.round((+v || 0) * 1000) / 1000;   // (a direção com 3 casas: o aparelho manda assim; o quadro fica menor)
function chuta(p, q, forca) {                         // (o p.chuta para os bots: vira um toque no botão; quem decide é o motor)
  q.pede94 = forca >= (p.C.FORCA_KICK + p.C.FORCA_POWER) / 2 ? 'chute' : 'passe';
  return Math.hypot(p.B.x - q.x, p.B.y - q.y) <= p.C.ALCANCE_CHUTE;
}

/* ---------------------------------------------------------------- o passo */
function empurra(p) {                                 // o que a sala mexeu por fora entra no motor (teleporte)
  const W = p.W94, G = p.G;
  for (const q of p.jog) {
    const s = p.sombra94[q.i];
    if (!s || s.x !== q.x || s.y !== q.y || s.vx !== q.vx || s.vy !== q.vy) M.poeJogador(W, q.i, m(q.x - G.CX), m(q.y - G.CY), m(q.vx), m(q.vy));
  }
  const B = p.B, s = p.bolaS94;
  if (!s || s.x !== B.x || s.y !== B.y || s.vx !== B.vx || s.vy !== B.vy) M.poeBola(W, m(B.x - G.CX), m(B.y - G.CY), m(B.vx), m(B.vy));
  if (p.estado !== 'saida' && W.estado === 'saida') W.estado = 'jogo';   // (os 8 s da saída: a bola ficou livre)
}
function puxa(p) {                                    // o motor → os objetos da sala
  const W = p.W94, G = p.G;
  for (const q of p.jog) {
    const w = W.jog[q.i];
    q.x = G.CX + px(w.x); q.y = G.CY + px(w.y); q.vx = px(w.vx); q.vy = px(w.vy);
    p.sombra94[q.i] = { x: q.x, y: q.y, vx: q.vx, vy: q.vy };
  }
  const b = W.bola, B = p.B;
  B.x = G.CX + px(b.x); B.y = G.CY + px(b.y); B.vx = px(b.vx); B.vy = px(b.vy); B.w = 0;
  const resta = b.curvaK ? (b.curvaFim - W.tick) * M.DT : 0;       // (o efeito da CURVA: o que sobra, em s, e a força, em 1/s)
  B.cvT = resta > 0 ? resta : 0; B.cv = resta > 0 ? b.curvaK : 0;
  p.bolaS94 = { x: B.x, y: B.y, vx: B.vx, vy: B.vy };
}
function passo(p) {
  empurra(p);
  const ev = M.passo(p.W94);
  puxa(p);
  for (const e of ev) {
    const q = e.j != null ? p.jog[e.j] : null;
    if (e.t === 'toque') { if (q) p.toque(q); }
    else if (e.t === 'chute') {
      if (!q) continue;
      q.chuteT = p.tick; q.fxT = Math.round(p.t * 1000) / 1000; q.ultimoChuteMs = p.agora();
      p.toque(q); p.marcaChute(q, e.b === 'passe' ? p.C.FORCA_KICK : p.C.FORCA_POWER);
    }
    else if (e.t === 'gol') { p.gol(e.lado); if (p.estado === 'fim') break; }
  }
}
/* a saída pela regra do motor (a formação e a bola no meio); cada um guarda o lugar dele (os bots voltam para lá) */
function saida(p, t) {
  M.saida(p.W94, t);
  puxa(p);
  for (const q of p.jog) q.lugar94 = { x: q.x, y: q.y };
}

/* ---------------------------------------------------------------- "a bola ia no gol?" (a autoria e as estatísticas)
   o motor numa cópia, só com a bola (as tampinhas paradas num canto, fora do alcance), até o gol ou a bola parar */
function noAlvo(p, time) {
  const W = M.copia(p.W94), G = W.G;
  for (let j = 0; j < W.jog.length; j++) {
    M.poeJogador(W, j, G.area.x0 + 0.5 + j * 0.9, G.area.y1 - 0.45, 0, 0);
    M.reiniciaComandos(W, j); M.comando(W, j, { mx: 0, my: 0, passe: 0, chute: 0, curva: 0 });
  }
  W.estado = 'jogo';
  for (let k = 0; k < 150; k++) {
    for (const e of M.passo(W)) if (e.t === 'gol') return (e.lado > 0 ? 0 : 1) === time;
    if (W.bola.vx === 0 && W.bola.vy === 0) return false;
  }
  return false;
}

/* ---------------------------------------------------------------- o quadro: o estado do motor
   O m94 vai como texto, sem perder nada: os números do empacotamento separados por vírgula; o "nunca" do motor
   (−1000000000, os registros de passo vazios) vai vazio; um número quebrado que em decimal passaria de 12 letras vai com os
   seus 8 bytes de verdade (o double), em base 64: '~' + 11 letras. O aparelho desfaz com a mesma regra (tools/v94/rede.js:
   v94DesfazM94) e chega no mesmo estado, bit a bit — a metade do tamanho do vetor em JSON. */
const NUNCA = -1000000000;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64I = (() => { const t = new Int16Array(128).fill(-1); for (let i = 0; i < 64; i++) t[B64.charCodeAt(i)] = i; return t; })();
const DV = new DataView(new ArrayBuffer(8));
function f64(v) {                                    // 8 bytes → 11 letras (6 bits cada; a última leva 4)
  DV.setFloat64(0, v); let s = '~', acc = 0, nb = 0;
  for (let i = 0; i < 8; i++) { acc = (acc << 8) | DV.getUint8(i); nb += 8; while (nb >= 6) { nb -= 6; s += B64[(acc >> nb) & 63]; } acc &= (1 << nb) - 1; }
  if (nb) s += B64[(acc << (6 - nb)) & 63];
  return s;
}
function f64d(t) {
  let acc = 0, nb = 0, k = 0;
  for (let i = 1; i < t.length; i++) { acc = (acc << 6) | B64I[t.charCodeAt(i)]; nb += 6; if (nb >= 8) { nb -= 8; DV.setUint8(k++, (acc >> nb) & 255); acc &= (1 << nb) - 1; } }
  return DV.getFloat64(0);
}
function codificaM94(arr) {
  let s = '';
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]; let t = v === NUNCA ? '' : String(v);
    if (t.length > 12 || Object.is(v, -0)) t = f64(v);   // (o −0 também vai com os bytes: nada se perde)
    s += (i ? ',' : '') + t;
  }
  return s;
}
function desfazM94(txt) { const a = String(txt).split(','); for (let i = 0; i < a.length; i++) { const t = a[i]; a[i] = t === '' ? NUNCA : t[0] === '~' ? f64d(t) : Number(t); } return a; }
function quadroExtra(p, Q) { Q.m94 = codificaM94(M.empacota(p.W94)); return Q; }

module.exports = { M, PX, codificaM94, desfazM94, liga, reiniciaJogador, conta, comandoHumano, semComando, comandoBot, chuta, passo, saida, noAlvo, quadroExtra, campoPx, compat };
