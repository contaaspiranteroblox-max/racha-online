'use strict';
/* =====================================================================================================================
   RACHA v83 · A FÍSICA NO SERVIDOR — a simulação autoritativa da partida (sem dependências, Node 18+).

   O porte para o servidor da física do jogo (app/public/game/racha.html, blocos AJUSTES e PHYS do backup/racha.html —
   v86: a mecânica clássica, a da v84, com o chute mais forte; de onde vêm os números: PROVENIENCIA.md): o servidor
   calcula a mesma partida que o aparelho calculava — mesmo tamanho de campo, mesmos raios, mesma bola — para que o
   cliente possa só mandar os comandos e desenhar o que o servidor manda (predição + interpolação).

   O que aqui é AUTORIDADE (o cliente não decide nada disso):
     · posição da bola e das tampinhas (o cliente manda a DIREÇÃO; a velocidade é calculada aqui);
     · o chute: só vale se a bola estiver no alcance (3,5 u entre os centros) e dentro do ritmo mínimo;
     · os gols (a bola inteira do lado de dentro da linha, na boca do gol);
     · o relógio da partida (ver partida.js: 3:00, até 3 gols, prorrogação só no 0 × 0, gol de ouro).

   Passo fixo: 60 atualizações por segundo (o mesmo TIME_STEP do jogo), independente do FPS de cada aparelho.
   Unidades: as do jogo — px virtuais, 1 u = 19 px. Tempo em segundos; posições em px; velocidades em px/s.
   ===================================================================================================================== */

// ---------- As constantes (as mesmas do jogo) ----------
const PX_POR_U = 19;
const U = v => v * PX_POR_U;
const TICKS_POR_S = 60;
const DT = 1 / TICKS_POR_S;

const R_JOG = U(2.0);             // raio do corpo da tampinha
const RAIO_CHUTE = U(2.5);        // o anel de chute
const MASSA_JOG = 1.25;
const VEL_JOG = U(14.1);          // velocidade máxima da tampinha (14,1 u/s)
const FORCA_KICK = 275, FORCA_POWER = 440;   // PASSE / CHUTE (v86: 10% mais fortes; eram 250 / 400) — os mesmos do jogo

const R_BOLA = U(1.0);
const MASSA_BOLA = 10;
const LIMITE_VEL_BOLA = U(60);    // 60 u/s (v86: era 55)
const FATOR_BOLA = 0.99;          // a bola guarda 99% da velocidade a cada tick
const AMORT_ANGULAR = 0.5;        // o giro da bola diminui sozinho
const ATRITO_BOLA = 0.5;
const ATRITO_JOG_BOLA = Math.sqrt(0.3 * ATRITO_BOLA);
const ATRITO_TRAVE_BOLA = Math.sqrt(0.1 * ATRITO_BOLA);
const QUIQUE_BOLA = 0;
const QUIQUE_TRAVE = 0.6, QUIQUE_REDE = 0.15, QUIQUE_PAREDE_BOLA = 0.65;
const Q_PAREDE = Math.max(QUIQUE_BOLA, QUIQUE_PAREDE_BOLA);
const Q_TRAVE = Math.max(QUIQUE_BOLA, QUIQUE_TRAVE);
const Q_REDE = Math.max(QUIQUE_BOLA, QUIQUE_REDE);
const LIMIAR_QUIQUE = U(1);       // batida mais lenta que isso não quica
const ALCANCE_CHUTE = RAIO_CHUTE + R_BOLA;   // 3,5 u entre os centros
const ZONA_MORTA = 0.00001;

// Os tamanhos de campo (u), os mesmos do jogo — o índice é o tamanho do time menos 1 (1v1 … 4v4)
const MODOS = [
  { nome: '1v1', jog: [71, 50],   bola: [56, 40],  gol: [6.6, 12.8], trave: 0.5, rede: 0.4 },
  { nome: '2v2', jog: [86, 60],   bola: [71, 50],  gol: [6.6, 16],   trave: 0.5, rede: 0.4 },
  { nome: '3v3', jog: [101, 80],  bola: [86, 70],  gol: [7, 20.5],   trave: 0.5, rede: 0.4 },
  { nome: '4v4', jog: [124, 100], bola: [108, 90], gol: [7, 24.5],   trave: 0.5, rede: 0.4 },
];
const MARGEM_X = 206, MARGEM_Y = 59;   // px do canto do mundo até a grama (Arena/Estádio — o mapa da ranqueada)

// O analógico do jogo: 32 direções de 11,25°; a amplitude não muda a velocidade
function direcaoOriginal(mx, my) {
  if (!Number.isFinite(mx) || !Number.isFinite(my) || Math.hypot(mx, my) <= ZONA_MORTA) return { mx: 0, my: 0 };
  const setor = (Math.PI * 2) / 32, ang = Math.round(Math.atan2(my, mx) / setor) * setor;
  return { mx: Math.cos(ang), my: Math.sin(ang) };
}

// ---------- Colisões (as mesmas regras do jogo) ----------
// Batida numa superfície parada. (nx,ny) = a normal da superfície para o corpo; e = quique; mu = atrito.
function reflect(o, nx, ny, e, mu) {
  const vn = o.vx * nx + o.vy * ny;
  if (vn >= 0) return;
  const eff = (-vn < LIMIAR_QUIQUE) ? 0 : e;
  const jn = -(1 + eff) * vn;
  o.vx += nx * jn; o.vy += ny * jn;
  if (mu > 0) {
    const tx = -ny, ty = nx, R = o.r, w = o.w || 0;
    const vt = o.vx * tx + o.vy * ty - w * R;
    const k = 1 + (o.I ? (o.m * R * R) / o.I : 0);
    let jt = -vt / k;
    const lim = mu * jn;
    if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
    o.vx += tx * jt; o.vy += ty * jt;
    if (o.I) o.w = w - (R * jt * o.m) / o.I;
  }
}
function hitSeg(o, ax, ay, bx, by, e, mu) {
  const abx = bx - ax, aby = by - ay;
  const t = Math.max(0, Math.min(1, ((o.x - ax) * abx + (o.y - ay) * aby) / (abx * abx + aby * aby)));
  let px = ax + abx * t, py = ay + aby * t;
  let dx = o.x - px, dy = o.y - py;
  const rs = o.r, d2 = dx * dx + dy * dy;
  if (d2 >= rs * rs) return false;
  let d = Math.sqrt(d2);
  if (d < 1e-9) { const v = Math.hypot(o.vx, o.vy); dx = v > 1e-9 ? -o.vx / v : 1; dy = v > 1e-9 ? -o.vy / v : 0; d = 1; }
  const nx = dx / d, ny = dy / d;
  o.x = px + nx * rs; o.y = py + ny * rs;
  reflect(o, nx, ny, e, mu);
  return true;
}
function hitBox(o, x0, y0, x1, y1, e, mu) {
  if (o.x < x0 + o.r) { o.x = x0 + o.r; reflect(o, 1, 0, e, mu); }
  else if (o.x > x1 - o.r) { o.x = x1 - o.r; reflect(o, -1, 0, e, mu); }
  if (o.y < y0 + o.r) { o.y = y0 + o.r; reflect(o, 0, 1, e, mu); }
  else if (o.y > y1 - o.r) { o.y = y1 - o.r; reflect(o, 0, -1, e, mu); }
}
function hitPoint(o, px, py, pr, e, mu) {
  let dx = o.x - px, dy = o.y - py;
  const rs = o.r + pr, d2 = dx * dx + dy * dy;
  if (d2 >= rs * rs) return false;
  let d = Math.sqrt(d2);
  if (d < 1e-9) { const v = Math.hypot(o.vx, o.vy); dx = v > 1e-9 ? -o.vx / v : 1; dy = v > 1e-9 ? -o.vy / v : 0; d = 1; }
  const nx = dx / d, ny = dy / d;
  o.x = px + nx * rs; o.y = py + ny * rs;
  reflect(o, nx, ny, e, mu);
  return true;
}
// Círculo × círculo com massas (tampinha × bola e tampinha × tampinha): quique e atrito; o atrito gira a bola
function hitBodies(a, b, e, mu) {
  let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
  const rs = a.r + b.r;
  if (d >= rs) return;
  if (d < 1e-6) {
    dx = a.vx - b.vx; dy = a.vy - b.vy; d = Math.hypot(dx, dy);
    if (d < 1e-6) { dx = 1; dy = 0; d = 1; }
    dx /= d; dy /= d; d = 1e-6; dx *= d; dy *= d;
  }
  const nx = dx / d, ny = dy / d;
  const ia = 1 / a.m, ib = 1 / b.m, is = ia + ib;
  const pen = Math.max(0, rs - d - 0.2) * 0.9;
  a.x -= nx * pen * ia / is; a.y -= ny * pen * ia / is;
  b.x += nx * pen * ib / is; b.y += ny * pen * ib / is;
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn < 0) {
    const j = -(1 + e) * vn / is;
    a.vx -= j * ia * nx; a.vy -= j * ia * ny;
    b.vx += j * ib * nx; b.vy += j * ib * ny;
    if (mu > 0) {
      const tx = -ny, ty = nx, R = b.r, w = b.w || 0;
      const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty - w * R;
      let jt = -vt / (is + (b.I ? (R * R) / b.I : 0));
      const lim = mu * j;
      if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
      a.vx -= jt * ia * tx; a.vy -= jt * ia * ty;
      b.vx += jt * ib * tx; b.vy += jt * ib * ty;
      if (b.I) b.w = w - (R * jt) / b.I;
    }
  }
}

/* ---------- O campo (a Arena/o Estádio: gol com rede, a tampinha entra no gol pela boca) ----------
   Geometria idêntica à do jogo: o mundo é a grama + a margem do cenário; as paredes da bola são as linhas
   brancas com a boca dos gols aberta; as traves são pontos; a rede segura a bola dentro do gol. */
function novoCampo(tamanho) {
  const m = MODOS[Math.min(3, Math.max(0, (tamanho | 0) - 1))];
  const pw = U(m.jog[0]), ph = U(m.jog[1]), bw = U(m.bola[0]), bh = U(m.bola[1]);
  const MW = Math.round(pw + 2 * MARGEM_X), MH = Math.round(ph + 2 * MARGEM_Y);
  const CX = MW / 2, CY = MH / 2;
  const G = {
    nome: m.nome, MW, MH, CX, CY,
    GL: CX - pw / 2, GR: CX + pw / 2, GT: CY - ph / 2, GB: CY + ph / 2,        // até onde a tampinha vai
    LX0: CX - bw / 2, LX1: CX + bw / 2, LY0: CY - bh / 2, LY1: CY + bh / 2,    // as linhas (as paredes da bola)
  };
  G.GOL_PROF = U(m.gol[0]);
  G.GOL_Y0 = CY - U(m.gol[1]) / 2; G.GOL_Y1 = CY + U(m.gol[1]) / 2;
  G.POST_R = U(m.trave) / 2;
  G.REDE_E = U(m.rede);
  G.POSTS = [[G.LX0, G.GOL_Y0], [G.LX0, G.GOL_Y1], [G.LX1, G.GOL_Y0], [G.LX1, G.GOL_Y1]];
  const PL = { x0: G.LX0 - G.GOL_PROF, x1: G.LX0 }, PR = { x0: G.LX1, x1: G.LX1 + G.GOL_PROF };
  G.NET_SEGS = [
    [PL.x0, G.GOL_Y0, PL.x1, G.GOL_Y0], [PL.x0, G.GOL_Y1, PL.x1, G.GOL_Y1], [PL.x0, G.GOL_Y0, PL.x0, G.GOL_Y1],
    [PR.x0, G.GOL_Y0, PR.x1, G.GOL_Y0], [PR.x0, G.GOL_Y1, PR.x1, G.GOL_Y1], [PR.x1, G.GOL_Y0, PR.x1, G.GOL_Y1],
  ];
  G.WALL_SEGS = [
    [G.LX0, G.LY0, G.LX1, G.LY0], [G.LX0, G.LY1, G.LX1, G.LY1],
    [G.LX0, G.LY0, G.LX0, G.GOL_Y0], [G.LX0, G.GOL_Y1, G.LX0, G.LY1],
    [G.LX1, G.LY0, G.LX1, G.GOL_Y0], [G.LX1, G.GOL_Y1, G.LX1, G.LY1],
  ];
  return G;
}

// A saída de bola: cada time no seu lado, espelhado (o time 0 ataca para a direita), bola no centro
function posicoesSaida(G, n) {
  const base = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) base.push([G.CX - U(11.6), G.CY]);                                   // o batedor, como no jogo
    else base.push([G.CX - U(11.6 + 8 * i), G.CY + (i % 2 ? 1 : -1) * U(6 + 5 * i)]); // os companheiros escadonados
  }
  const todos = [];
  for (let t = 0; t < 2; t++) for (let i = 0; i < n; i++) {
    const [x, y] = base[i];
    todos.push({ x: t === 0 ? x : 2 * G.CX - x, y, time: t });
  }
  return todos;
}

/* ---------- A partida (o estado puro da simulação) ----------
   estado = {campo, tick, bola, jog:[{x,y,vx,vy,r,m,time}], eventos:[…]} — sem relógio nem placar (isso é da partida.js) */
function novaSimulacao(tamanho) {
  const n = Math.min(4, Math.max(1, tamanho | 0));
  const G = novoCampo(n);
  const bola = { x: G.CX, y: G.CY, vx: 0, vy: 0, w: 0, r: R_BOLA, m: MASSA_BOLA, I: 0.5 * MASSA_BOLA * R_BOLA * R_BOLA };
  const jog = posicoesSaida(G, n).map(p => ({ x: p.x, y: p.y, vx: 0, vy: 0, r: R_JOG, m: MASSA_JOG, time: p.time, mx: 0, my: 0 }));
  return { campo: G, n, tick: 0, bola, jog, eventos: [] };
}

function reiniciaSaida(sim) {
  const G = sim.campo;
  sim.bola.x = G.CX; sim.bola.y = G.CY; sim.bola.vx = sim.bola.vy = 0; sim.bola.w = 0;
  const pos = posicoesSaida(G, sim.n);
  for (let i = 0; i < sim.jog.length; i++) {
    sim.jog[i].x = pos[i].x; sim.jog[i].y = pos[i].y; sim.jog[i].vx = sim.jog[i].vy = 0; sim.jog[i].mx = sim.jog[i].my = 0;
  }
}

// A DIREÇÃO que o jogador mandou (o servidor calcula a velocidade: o aparelho nunca manda velocidade nem posição)
function entrada(sim, i, mx, my) {
  const j = sim.jog[i]; if (!j) return;
  const d = direcaoOriginal(Math.max(-1, Math.min(1, +mx || 0)), Math.max(-1, Math.min(1, +my || 0)));
  j.mx = d.mx; j.my = d.my;
}

// O chute, com a validação do servidor: a bola precisa estar no alcance (a força e a direção nascem aqui)
function chute(sim, i, forca) {
  const j = sim.jog[i]; if (!j) return false;
  const B = sim.bola;
  let dx = B.x - j.x, dy = B.y - j.y, d = Math.hypot(dx, dy);
  if (d === 0) { dx = 1; dy = 0; d = 1; }
  if (d > ALCANCE_CHUTE + 1) return false;          // (+1 px de folga da rede: o alcance exato é conferido no passo)
  B.w = 0;
  const dv = U(forca / B.m);
  B.vx += (dx / d) * dv; B.vy += (dy / d) * dv;
  sim.eventos.push({ ev: 'chute', j: i, forca, tick: sim.tick });
  return true;
}

// Um passo fixo (1/60 s): entradas já aplicadas; devolve os gols do passo [{lado}] (lado 0 = gol na esquerda)
function passo(sim) {
  const G = sim.campo, B = sim.bola;
  sim.tick++;
  // 1) as tampinhas: a velocidade é a direção × a máxima (entrada neutra zera), depois a posição
  for (const j of sim.jog) {
    j.vx = j.mx * VEL_JOG; j.vy = j.my * VEL_JOG;
    j.x += j.vx * DT; j.y += j.vy * DT;
  }
  // 2) a bola: desacelera, respeita o teto e anda; o giro diminui sozinho
  B.vx *= FATOR_BOLA; B.vy *= FATOR_BOLA;
  const v = Math.hypot(B.vx, B.vy);
  if (v > LIMITE_VEL_BOLA) { B.vx = (B.vx / v) * LIMITE_VEL_BOLA; B.vy = (B.vy / v) * LIMITE_VEL_BOLA; }
  B.w *= 1 - AMORT_ANGULAR * DT;
  B.x += B.vx * DT; B.y += B.vy * DT;
  // 3) as colisões (a mesma ordem do jogo)
  for (const j of sim.jog) hitBodies(j, B, QUIQUE_BOLA, ATRITO_JOG_BOLA);
  for (let a = 0; a < sim.jog.length; a++) for (let b = a + 1; b < sim.jog.length; b++) hitBodies(sim.jog[a], sim.jog[b], 0.3, 0);
  for (const j of sim.jog) {
    hitBox(j, G.GL, G.GT, G.GR, G.GB, 0.65, 0);                       // os muros da área do jogador
    for (const s of G.NET_SEGS) hitSeg(j, s[0], s[1], s[2], s[3], 0.6, 0);   // a rede segura quem entra no gol
    for (const q of G.POSTS) hitPoint(j, q[0], q[1], G.POST_R, 0.3, 0);      // e as traves
  }
  for (const s of G.WALL_SEGS) hitSeg(B, s[0], s[1], s[2], s[3], Q_PAREDE, ATRITO_BOLA);   // as linhas (com a boca aberta)
  hitBox(B, G.GL, G.GT, G.GR, G.GB, Q_PAREDE, ATRITO_BOLA);                                // a rede de segurança
  for (const q of G.POSTS) {
    if (hitPoint(B, q[0], q[1], G.POST_R, Q_TRAVE, ATRITO_TRAVE_BOLA)) sim.eventos.push({ ev: 'trave', tick: sim.tick });
  }
  for (const s of G.NET_SEGS) hitSeg(B, s[0], s[1], s[2], s[3], Q_REDE, ATRITO_BOLA);
  // 4) o gol: a bola INTEIRA do lado de dentro da linha (o centro 1 raio além), na altura da boca
  const gols = [];
  if (B.y > G.GOL_Y0 && B.y < G.GOL_Y1) {
    if (B.x < G.LX0 - B.r) { gols.push({ lado: 0 }); sim.eventos.push({ ev: 'gol', lado: 0, tick: sim.tick }); }
    else if (B.x > G.LX1 + B.r) { gols.push({ lado: 1 }); sim.eventos.push({ ev: 'gol', lado: 1, tick: sim.tick }); }
  }
  return gols;
}

// O quadro compacto para os aparelhos (arrays, não objetos: menos bytes no ar)
function quadro(sim) {
  const B = sim.bola, r = v => Math.round(v * 10) / 10;
  return {
    t: sim.tick,
    b: [r(B.x), r(B.y), r(B.vx), r(B.vy), Math.round(B.w * 100) / 100],
    p: sim.jog.map(j => [Math.round(j.x), Math.round(j.y)]),
  };
}

module.exports = {
  PX_POR_U, U, TICKS_POR_S, DT, R_JOG, RAIO_CHUTE, MASSA_JOG, VEL_JOG, FORCA_KICK, FORCA_POWER,
  R_BOLA, MASSA_BOLA, LIMITE_VEL_BOLA, FATOR_BOLA, AMORT_ANGULAR, ALCANCE_CHUTE, MODOS,
  QUIQUE_BOLA, Q_PAREDE, Q_TRAVE, Q_REDE, ATRITO_BOLA, ATRITO_JOG_BOLA, ATRITO_TRAVE_BOLA,
  reflect, hitSeg, hitBox, hitPoint, hitBodies, novoCampo,
  novaSimulacao, reiniciaSaida, entrada, chute, passo, quadro, direcaoOriginal,
};
