/* ======================================================================================================================
   RACHA v96 · O ONLINE LISO — o núcleo das correções (tools/v96/liso.js: o MESMO arquivo no jogo — o build cola — e nos
   testes do Node — tests/v96/rede_sim.mjs).

   O que o online fazia quando a previsão errava (alguém mudou de direção, chutou a bola, um apagão do 4G): a diferença
   sumia em 90 ms (um deslize exponencial que começa na velocidade máxima — 50 px viram 550 px/s: parece um pulo) e, acima de
   um limite (5 u para os outros, 8 u para a bola, 12 u para você), a tampinha ou a bola pulava direto. No Brasil jogando no
   servidor da Virgínia (~160 ms de ida e volta) isso dava dezenas de pulos por minuto (tests/v96/rede_sim.mjs mede).
   Agora cada correção vira um DESLIZE com mola crítica (a velocidade começa em zero, sem tranco) e com TETO de velocidade
   (nunca mais rápido que uma fração da corrida da tampinha, ou da velocidade da bola): a coisa desenhada chega no lugar certo
   andando, sem pular. Pulo direto só no recomeço (a saída depois do gol, o fim) e em erros enormes.
   Mais duas proteções no desenho:
     · a GUARDA: nada desenhado anda mais que o possível num quadro (a tampinha 1,35 × a corrida, a bola 1,2 × o teto dela);
       o que sobrar (um empurrão da barreira da saída, um passo de recuperação do servidor) vira deslize;
     · a BATIDA: do lugar no mundo da previsão (que a física já resolveu) até o lugar desenhado, em passinhos que batem nas
       traves, na rede e nas paredes — o deslize nunca põe a tampinha dentro da trave ou do outro lado da rede.
   ====================================================================================================================== */
(function (raiz, fabrica) {
  const m = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = m;
  if (raiz) raiz.RachaLiso = m;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';
  const PADRAO = Object.freeze({
    tauJ: 0.09,      // s: a mola das correções das tampinhas (a sua e as dos outros)
    vJ: 0.3,         // o teto do deslize das tampinhas: vJ × a corrida + vJmais (px/s)
    vJmais: 30,
    tauB: 0.08,      // s: a mola da bola
    vB: 0.5,         // o teto do deslize da bola: o maior entre vB × a corrida e vBbola × a velocidade da bola, + vBmais (px/s)
    vBbola: 0.6,
    vBmais: 40,
    gB: 1.2,         // o teto da bola sobe gB px/s por px de erro acima de livreB (u): o erro grande some mais rápido
    livreB: 3,
    pertoB: 7,       // u: a bola perto da sua tampinha (a que você vai tocar) corrige até (1 + pertoK) × mais rápido
    pertoK: 2,
    teleP: 14,       // u: correção maior que isto pula direto (a sua, a da bola e a dos outros)
    teleB: 40,
    teleJ: 30,
    guardaJ: 1.35,   // a guarda: a tampinha desenhada anda no máximo guardaJ × a corrida + guardaJmais (px/s) por quadro
    guardaJmais: 40,
    guardaB: 1.2,    // a bola: guardaB × o teto da bola + guardaBmais
    guardaBmais: 80,
  });
  function novo() { return { x: 0, y: 0, vx: 0, vy: 0 }; }
  function zera(d) { d.x = 0; d.y = 0; d.vx = 0; d.vy = 0; }
  function soma(d, dx, dy) { if (Number.isFinite(dx) && Number.isFinite(dy)) { d.x += dx; d.y += dy; } }
  // o deslize anda dt s: a mola crítica (tau) puxa para zero; a velocidade nunca passa de vmax (+ ganho por px de erro acima de livre)
  function anda(d, dt, tau, vmax, ganho, livre) {
    if (!(dt > 0) || !(tau > 0)) return;
    if (ganho) vmax += ganho * Math.max(0, Math.hypot(d.x, d.y) - (livre || 0));
    const w = 1 / tau, n = Math.max(1, Math.min(40, Math.ceil(dt / 0.004))), h = dt / n;
    for (let i = 0; i < n; i++) {
      const ax = -2 * w * d.vx - w * w * d.x, ay = -2 * w * d.vy - w * w * d.y;
      d.vx += ax * h; d.vy += ay * h;
      const v = Math.hypot(d.vx, d.vy);
      if (vmax > 0 && v > vmax) { d.vx *= vmax / v; d.vy *= vmax / v; }
      d.x += d.vx * h; d.y += d.vy * h;
    }
    if (Math.hypot(d.x, d.y) < 0.05 && Math.hypot(d.vx, d.vy) < 1) zera(d);
    if (!Number.isFinite(d.x + d.y + d.vx + d.vy)) zera(d);
  }
  // a guarda: de ant até pos andando no máximo vmax × dt; o que passar vira deslize (d) — devolve o lugar desenhado
  function guarda(pos, ant, d, vmax, dt) {
    if (!ant || !(dt > 0)) return pos;
    const dx = pos[0] - ant[0], dy = pos[1] - ant[1], n = Math.hypot(dx, dy), lim = vmax * dt;
    if (!(n > lim)) return pos;
    const ex = dx - dx * lim / n, ey = dy - dy * lim / n;
    if (d) { d.x -= ex; d.y -= ey; }
    return [pos[0] - ex, pos[1] - ey];
  }
  // a batida: de (x0, y0) — o lugar no mundo, já resolvido pela física — até (x1, y1), em passinhos, batendo nas traves, na rede
  // e nas paredes do campo G (o do núcleo: N = RachaNucleo). bola: também as linhas (as paredes da bola).
  function varre(N, G, x0, y0, x1, y1, r, bola) {
    const dx = x1 - x0, dy = y1 - y0, dd = Math.hypot(dx, dy);
    if (!(dd > 0.01) || !G) return [x1, y1];
    const o = { x: x0, y: y0, vx: 0, vy: 0, r, w: 0 }, n = Math.max(1, Math.min(60, Math.ceil(dd / (r * 0.35)))), lq = 1e9;
    for (let i = 0; i < n; i++) {
      o.x += dx / n; o.y += dy / n;
      if (bola) for (const s of G.WALL_SEGS) N.hitSeg(o, s[0], s[1], s[2], s[3], 0, 0, lq);
      N.hitBox(o, G.GL, G.GT, G.GR, G.GB, 0, 0, lq);
      for (const s of G.NET_SEGS) N.hitSeg(o, s[0], s[1], s[2], s[3], 0, 0, lq);
      for (const p of G.POSTS) N.hitPoint(o, p[0], p[1], G.POST_R, 0, 0, lq);
    }
    return [o.x, o.y];
  }
  // os tetos (px/s) a partir das constantes do núcleo (C) e dos parâmetros (p)
  function tetoJ(C, p) { return p.vJ * C.VEL_JOG + p.vJmais; }
  function tetoB(C, p, vBola, distEu, U) {
    let v = Math.max(p.vB * C.VEL_JOG, p.vBbola * vBola) + p.vBmais;
    if (p.pertoB > 0 && distEu != null) { const R = U(p.pertoB); if (distEu < R) v *= 1 + p.pertoK * (1 - distEu / R); }
    return v;
  }
  function guardaJ(C, p) { return p.guardaJ * C.VEL_JOG + p.guardaJmais; }
  function guardaB(C, p) { return p.guardaB * C.LIMITE_VEL_BOLA + p.guardaBmais; }
  return { VERSAO: 'v96', PADRAO, novo, zera, soma, anda, guarda, varre, tetoJ, tetoB, guardaJ, guardaB };
});
