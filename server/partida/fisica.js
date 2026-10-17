'use strict';
/* =====================================================================================================================
   RACHA · A FÍSICA NO SERVIDOR — a simulação autoritativa da partida (sem dependências, Node 18+).

   v85 (auditoria de 17/10/2026): a física é a FR-85 do RACHA. Os números e as fórmulas moram no núcleo
   server/partida/nucleo_fisica.js — o MESMO arquivo que o build cola no jogo (window.RACHA_FISICA) —, então o servidor e o
   aparelho calculam a mesma física com o mesmo código. Especificação, metas e medidas: tools/v85/FISICA_RACHA.md.
   (Até a v84 este arquivo repetia as constantes do jogo, que vinham de outro jogo; a auditoria trocou tudo pela FR-85.)

   O que aqui é AUTORIDADE (o cliente não decide nada disso):
     · posição da bola e das tampinhas (o cliente manda a DIREÇÃO; a velocidade é calculada aqui);
     · o chute: só vale se a bola estiver no alcance e dentro do ritmo mínimo;
     · os gols (a bola inteira do lado de dentro da linha, na boca do gol);
     · o relógio da partida (ver partida.js: 3:00, até 3 gols, prorrogação só no 0 × 0, gol de ouro).

   Passo fixo: 60 atualizações por segundo, independente do FPS de cada aparelho.
   Unidades: as do jogo — px virtuais, 1 u = 19 px. Tempo em segundos; posições em px; velocidades em px/s.
   ===================================================================================================================== */
const N = require('./nucleo_fisica');

// ---------- Os nomes que o resto do servidor usa (os valores são os do núcleo) ----------
const PX_POR_U = N.PX_POR_U;
const U = N.U;
const TICKS_POR_S = N.TICKS_POR_S;
const DT = N.DT;
const R_JOG = N.TAMPINHA.raio;
const MASSA_JOG = N.TAMPINHA.massa;
const VEL_JOG = N.TAMPINHA.vmax;                    // a corrida (com a arrancada e o freio do núcleo)
const FORCA_KICK = N.CHUTE.passe, FORCA_POWER = N.CHUTE.forte;   // a velocidade de saída da bola: PASSE / CHUTE
const R_BOLA = N.BOLA.raio;
const MASSA_BOLA = N.BOLA.massa;
const LIMITE_VEL_BOLA = N.BOLA.teto;
const FATOR_BOLA = N.fatorPiso(N.MEIA_VIDA.quadra); // a quadra (Arena e Estádio, os mapas das salas)
const ALCANCE_CHUTE = N.ALCANCE;                    // distância máxima entre os centros para o chute pegar
const PAR = N.PAR;

// Os tamanhos de quadra (u), os mesmos do jogo — o índice é o tamanho do time menos 1 (1v1 … 4v4)
const MODOS = [1, 2, 3, 4].map(n => {
  const q = N.quadra(n);
  return { nome: q.nome, jog: q.jog, bola: q.bola, gol: q.gol, trave: q.trave, rede: q.rede, saida: q.saida, marcas: q.marcas };
});
const MARGEM_X = 206, MARGEM_Y = 59;   // px do canto do mundo até a quadra (Arena/Estádio — o mapa da ranqueada)
// A formação da saída (fração de meia quadra em x e de meia largura em y), por tamanho de time — a mesma do jogo (RQ_FORMA)
const FORMACAO = { 1: [[0.22, 0]], 2: [[0.2, 0], [0.58, 0]], 3: [[0.2, -0.42], [0.2, 0.42], [0.62, 0]], 4: [[0.2, -0.43], [0.2, 0.43], [0.62, -0.43], [0.62, 0.43]] };

// O analógico: 256 direções; a amplitude não muda a velocidade
function direcaoAnalogico(mx, my) { const d = N.direcao(mx, my); return { mx: d.mx, my: d.my }; }

// ---------- As batidas (as do núcleo; os nomes de sempre para o resto do servidor) ----------
const reflect = N.bate, hitSeg = N.bateSegmento, hitBox = N.bateCaixa, hitPoint = N.batePonto, hitBodies = N.batemCorpos;

/* ---------- A quadra (a Arena/o Estádio: gol com rede, a tampinha entra no gol pela boca) ----------
   Geometria idêntica à do jogo: o mundo é a área da tampinha + a margem do cenário; as paredes da bola são as linhas com
   a boca dos gols aberta; as traves são pontos; a rede segura a bola dentro do gol. */
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
  G.circ = U(m.marcas.saida);                                                 // o círculo da barreira da saída
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
  const f = FORMACAO[n] || FORMACAO[1], meiaL = (G.LX1 - G.LX0) / 2, meiaA = (G.LY1 - G.LY0) / 2, todos = [];
  for (let t = 0; t < 2; t++) for (let i = 0; i < n; i++) {
    const s = t === 0 ? -1 : 1, p = f[Math.min(i, f.length - 1)];
    todos.push({ x: G.CX + s * p[0] * meiaL, y: G.CY + p[1] * meiaA, time: t });
  }
  return todos;
}

/* ---------- A partida (o estado puro da simulação) ----------
   estado = {campo, tick, bola, jog:[{x,y,vx,vy,r,m,time}], eventos:[…]} — sem relógio nem placar (isso é da partida.js) */
function novaSimulacao(tamanho) {
  const n = Math.min(4, Math.max(1, tamanho | 0));
  const G = novoCampo(n);
  const bola = { x: G.CX, y: G.CY, vx: 0, vy: 0, w: 0, r: R_BOLA, m: MASSA_BOLA };
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
  const d = direcaoAnalogico(Math.max(-1, Math.min(1, +mx || 0)), Math.max(-1, Math.min(1, +my || 0)));
  j.mx = d.mx; j.my = d.my;
}

// O chute, com a validação do servidor: a bola precisa estar no alcance (a velocidade e a direção nascem aqui)
function chute(sim, i, forca) {
  const j = sim.jog[i]; if (!j) return false;
  if (!N.chuta(j, sim.bola, forca, ALCANCE_CHUTE + 1)) return false;   // (+1 px de folga da rede)
  sim.bola.w = 0;
  sim.eventos.push({ ev: 'chute', j: i, forca, tick: sim.tick });
  return true;
}

// O gol: a bola INTEIRA do lado de dentro da linha (o centro 1 raio além), cruzando na altura da boca — devolve o lado ou 0
function golCruzou(G, r, x0, y0, x1, y1) {
  const xa = G.LX0 - r, xb = G.LX1 + r;
  if (x0 >= xa && x1 < xa) { const yc = y0 + (y1 - y0) * (x0 - xa) / (x0 - x1); if (yc > G.GOL_Y0 && yc < G.GOL_Y1) return -1; }
  if (x0 <= xb && x1 > xb) { const yc = y0 + (y1 - y0) * (xb - x0) / (x1 - x0); if (yc > G.GOL_Y0 && yc < G.GOL_Y1) return 1; }
  return 0;
}

// Um passo fixo (1/60 s): entradas já aplicadas; devolve os gols do passo [{lado}] (lado 0 = gol na esquerda)
function passo(sim) {
  const G = sim.campo, B = sim.bola;
  sim.tick++;
  // 1) as tampinhas: a velocidade vai até a do analógico com a arrancada e o freio do núcleo
  for (const j of sim.jog) N.anda(j, j.mx, j.my, VEL_JOG, DT);
  // 2) a bola: o piso, o teto e a parada; o giro (só do desenho) perde metade a cada 0,6 s
  N.amortece(B, FATOR_BOLA, 1);
  B.w *= Math.pow(0.5, DT / 0.6);
  // 3) os subpassos: posições, batidas (duas vezes) e o gol a cada subpasso
  let rel = 0;
  for (const j of sim.jog) { const r = Math.hypot(B.vx - j.vx, B.vy - j.vy); if (r > rel) rel = r; }
  const passos = N.subpassos(Math.max(Math.hypot(B.vx, B.vy), rel), DT), sub = DT / passos;
  const gols = [];
  for (let s = 0; s < passos && !gols.length; s++) {
    const bx0 = B.x, by0 = B.y;
    for (const j of sim.jog) { j.x += j.vx * sub; j.y += j.vy * sub; }
    B.x += B.vx * sub; B.y += B.vy * sub;
    for (let k = 0; k < 2; k++) {
      for (const j of sim.jog) hitBodies(j, B, PAR.bolaTampinha.e, PAR.bolaTampinha.mu);
      for (let a = 0; a < sim.jog.length; a++) for (let b = a + 1; b < sim.jog.length; b++) hitBodies(sim.jog[a], sim.jog[b], PAR.tampinhaTampinha.e, PAR.tampinhaTampinha.mu);
      for (const j of sim.jog) {
        hitBox(j, G.GL, G.GT, G.GR, G.GB, PAR.tampinhaParede.e, 0);                       // até onde a tampinha anda
        for (const sg of G.NET_SEGS) hitSeg(j, sg[0], sg[1], sg[2], sg[3], PAR.tampinhaParede.e, 0);   // a rede segura quem entra no gol
        for (const q of G.POSTS) hitPoint(j, q[0], q[1], G.POST_R, PAR.tampinhaParede.e, 0);         // e as traves
      }
      for (const sg of G.WALL_SEGS) hitSeg(B, sg[0], sg[1], sg[2], sg[3], PAR.bolaLinha.e, PAR.bolaLinha.mu);   // as linhas (com a boca aberta)
      hitBox(B, G.GL, G.GT, G.GR, G.GB, PAR.bolaLinha.e, PAR.bolaLinha.mu);                                     // a rede de segurança
      for (const q of G.POSTS) {
        if (hitPoint(B, q[0], q[1], G.POST_R, PAR.bolaTrave.e, PAR.bolaTrave.mu) && k === 0) sim.eventos.push({ ev: 'trave', tick: sim.tick });
      }
      for (const sg of G.NET_SEGS) hitSeg(B, sg[0], sg[1], sg[2], sg[3], PAR.bolaRede.e, PAR.bolaRede.mu);
    }
    const lado = golCruzou(G, B.r, bx0, by0, B.x, B.y);
    if (lado) { const l = lado < 0 ? 0 : 1; gols.push({ lado: l }); sim.eventos.push({ ev: 'gol', lado: l, tick: sim.tick }); }
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
  N, PX_POR_U, U, TICKS_POR_S, DT, R_JOG, MASSA_JOG, VEL_JOG, FORCA_KICK, FORCA_POWER,
  R_BOLA, MASSA_BOLA, LIMITE_VEL_BOLA, FATOR_BOLA, ALCANCE_CHUTE, MODOS, FORMACAO, PAR,
  reflect, hitSeg, hitBox, hitPoint, hitBodies, novoCampo, golCruzou,
  novaSimulacao, reiniciaSaida, entrada, chute, passo, quadro, direcaoAnalogico,
};
