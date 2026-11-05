/* ======================================================================================================================
   RACHA v105 · O CONTATO DESENHADO NO ONLINE (tools/v105/rede.js — o MESMO arquivo no jogo, o build cola, e no simulador do
   Node, tests/v102/sim.mjs). Duas partes, como o tools/v102/liso.js:
     1) o núcleo (window.RachaContato105 no jogo; module.exports no Node): as contas, sem nada do jogo;
     2) os ganchos no jogo (só quando este arquivo está colado no script do jogo, depois da v96).
   O pedido (04/11/2026): "tirar todo lag possível das partidas online, deixar muito fluido, sem player atravessando bola
   quando o ping está ruim".
   Por que atravessava: no mundo da previsão (a física do núcleo) a bola e as tampinhas nunca ficam uma dentro da outra — a
   batida resolve. Mas o que vai para a tela é o lugar do mundo MAIS o deslize de cada correção (a mola da v96: quando o
   quadro do servidor chega e a previsão tinha errado — o outro mudou de direção, tocou na bola —, a diferença some andando
   em ~90 ms, cada coisa com a sua mola e o seu teto). Com o ping ruim as correções são maiores e mais seguidas: a bola
   desenhada deslizava para o lugar certo por DENTRO da tampinha desenhada (ou a tampinha por dentro da bola), e duas
   tampinhas desenhadas se sobrepunham.
   Agora, no fim de cada quadro do desenho (depois da mola, da guarda e da batida nas traves da v96), o CONTATO DESENHADO: a
   bola desenhada sai de dentro de qualquer tampinha desenhada (a sua por último: o seu toque manda), pela linha dos
   centros, sem entrar nas traves, na rede nem nas linhas (a batida da v96 de onde ela estava até onde foi). O empurrão entra
   no deslize da bola (a mola continua dali: sem o vaivém de voltar para dentro e ser empurrada de novo) e tem teto por quadro
   (1100 px/s: a sobreposição grande sai em dois ou três quadros, sem a bola pular). A bola alta dos
   chutes do Rachão (por cima das tampinhas) e as vagas vazias ficam de fora.
   Medido no simulador (tests/v102/sim.mjs, 4G de mentira, 8 sementes × 40 s): a bola desenhada dentro de uma tampinha
   (mais de 3 px) caiu de 5,7% para 0,5% dos quadros no 4G e de 7,6% para 0,8% no 4G ruim, e a mais funda de 30–35 px (a
   bola quase toda dentro) para ~12 px; o resto (os trancos, os pulos, o erro contra o servidor) fica igual dentro do
   ruído. (Separar também as tampinhas umas das outras foi medido e saiu: o outro jogador dava arrancos.)
   A física, a previsão, as molas e a guarda continuam com os números de sempre. RACHA_CONFIG.contato105 = false desliga.
   ====================================================================================================================== */
(function (raiz, fabrica) {
  const m = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = m;
  if (raiz) raiz.RachaContato105 = m;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';
  const FOLGA = 1.5;                                  // px: a sobreposição que fica (a física deixa até ~0,2 px; isto não mexe no contato de verdade)
  // J: [[x, y] | null] (os desenhados de cada vaga; null = vaga vazia), B: [x, y] | null (null = a bola alta: fica de fora),
  // eu: o índice da sua tampinha (-1 = assistindo), rJ, rB: os raios (px), w (opcional): o tamanho do deslize de cada um
  // {J: [px], B: px} — quem está mais fora do lugar (a correção maior) é quem sai mais (sem w: a bola sai toda e dois outros
  // saem metade cada). A sua tampinha nunca sai. Muda J e B no lugar; devolve quanto mexeu (px).
  const EPS = 2;
  function separa(J, B, eu, rJ, rB, folga, w, soBola, capJ, capB) {
    const f = folga == null ? FOLGA : folga, wJ = w && w.J, wB = w && Number.isFinite(w.B) ? w.B : null;
    const pj = i => (wJ && Number.isFinite(wJ[i]) ? wJ[i] : 0) + EPS;
    let mexeu = 0;
    const mj = 2 * rJ - f, mb = rJ + rB - f;
    for (let it = 0; it < 2; it++) {
      if (!soBola) for (let i = 0; i < J.length; i++) {   // as tampinhas umas das outras
        const a = J[i]; if (!a) continue;
        for (let k = i + 1; k < J.length; k++) {
          const b = J[k]; if (!b) continue;
          let dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
          if (d >= mj) continue;
          if (d < 1e-6) { dx = 1; dy = 0; d = 1; }
          const nx = dx / d, ny = dy / d, pen = Math.min(mj - Math.min(d, mj), capJ > 0 ? capJ : 1e9);   // (capJ: no máximo isto por quadro — sem arrancos)
          const fa = i === eu ? 0 : k === eu ? 1 : pj(i) / (pj(i) + pj(k)), fb = 1 - fa;
          a[0] -= nx * pen * fa; a[1] -= ny * pen * fa;
          b[0] += nx * pen * fb; b[1] += ny * pen * fb;
          mexeu += pen;
        }
      }
      if (!B) continue;
      for (let i = 0; i < J.length; i++) {                 // a bola de todas (a sua por último: o seu toque manda)
        const k = i < J.length - 1 ? (i >= eu && eu >= 0 ? i + 1 : i) : (eu >= 0 ? eu : i);
        const q = J[k]; if (!q) continue;
        let dx = B[0] - q[0], dy = B[1] - q[1], d = Math.hypot(dx, dy);
        if (d >= mb) continue;
        if (d < 1e-6) { dx = 0; dy = -1; d = 1; }
        const nx = dx / d, ny = dy / d, pen = Math.min(mb - Math.min(d, mb), capB > 0 ? capB : 1e9);   // (capB: a bola sai no máximo isto por quadro — sem pulo; o resto no quadro seguinte)
        const sb = k === eu || wB == null ? 1 : (wB + EPS) / (wB + EPS + pj(k)), sj = 1 - sb;
        B[0] += nx * pen * sb; B[1] += ny * pen * sb;
        q[0] -= nx * pen * sj; q[1] -= ny * pen * sj;
        mexeu += pen;
      }
    }
    return mexeu;
  }
  // o empurrão do contato entra no deslize (a mola da v96: {x, y, vx, vy}) — no quadro seguinte o desenho já sai do lugar
  // empurrado (sem voltar para dentro e ser empurrado de novo: o vaivém), e a parte da velocidade da mola que entrava na
  // outra coisa sai
  function empurra(d, ex, ey) {
    if (!d) return;
    const n = Math.hypot(ex, ey); if (!(n > 0.01)) return;
    d.x += ex; d.y += ey;
    const nx = ex / n, ny = ey / n, vn = d.vx * nx + d.vy * ny;
    if (vn < 0) { d.vx -= vn * nx; d.vy -= vn * ny; }
  }
  return { VERSAO: 'v105', FOLGA, separa, empurra };
});

/* ---------------------------------------------------------------- 2) os ganchos no jogo (o desenho liso da v96, por fora) */
if (typeof window !== 'undefined' && typeof v96Desenha === 'function' && typeof V92N === 'object' && window.RachaContato105) (function () {
  const K = window.RachaContato105;
  const LIGADO = !(window.RACHA_CONFIG && window.RACHA_CONFIG.contato105 === false);
  const E = { quadros: 0, mexidos: 0, maxPx: 0, erro: null, t: 0 };
  const CAP_PX_S = 1100;                               // px/s: o empurrão da bola por quadro tem teto (perto da guarda da v96 para a bola) — sem pulo
  const desenhaAntes = v96Desenha;
  v96Desenha = function () {
    const r = desenhaAntes.apply(this, arguments);
    if (!LIGADO || E.erro || (window.RACHA_CONFIG && window.RACHA_CONFIG.contato105 === false)) return r;   // (dá para desligar com o jogo aberto, para comparar)
    try {
      if (!v92RedeAtiva() || !V92N.M || !V92N.C) return r;
      const M = V92N.M, C = V92N.C, G = M.G, eu = V92N.slot;
      const J = [];
      for (let i = 0; i < M.jog.length; i++) {
        const q = M.jog[i], o = i === eu ? P : RQ.jog[i];
        J.push(!q || q.fora || !o || o.fora ? null : [o.x, o.y]);
      }
      if (M.cr && V92_NUC.crAlta && V92_NUC.crAlta(M, C)) return r;   // (a bola alta dos chutes do Rachão passa por cima)
      const B0 = [B.x, B.y], Bd = [B.x, B.y];
      const agora = performance.now(), dt = E.t ? Math.max(1 / 240, Math.min(0.05, (agora - E.t) / 1000)) : 1 / 60; E.t = agora;
      const px = K.separa(J, Bd, eu, C.R_JOG, C.R_BOLA, null, null, true, 0, Math.max(6, CAP_PX_S * dt));   // (só a bola: as tampinhas ficam onde a v96 pôs)
      E.quadros++;
      if (px > 0.01) {
        const b = window.RachaLiso && G ? window.RachaLiso.varre(V92_NUC, G, B0[0], B0[1], Bd[0], Bd[1], C.R_BOLA, true) : Bd;   // (sem entrar nas traves, na rede e nas linhas)
        const ex = b[0] - B0[0], ey = b[1] - B0[1], n = Math.hypot(ex, ey);
        if (n > 0.01) {
          E.mexidos++; if (n > E.maxPx) E.maxPx = n;
          B.x = b[0]; B.y = b[1];
          if (V92.cfg.bolaPrev === 'eu' && typeof V96R === 'object' && V96R) {   // (o empurrão entra no deslize da bola: no quadro seguinte ela já sai daqui)
            K.empurra(V96R.B, ex, ey);
            if (V96R.ant) V96R.ant.B = [B.x, B.y];
          }
        }
      }
    } catch (e) { E.erro = String(e && e.stack || e); try { console.error('v105 · o contato desenhado parou (fica o de antes):', e); } catch (_) {} }
    return r;
  };
  window.RachaContato105Jogo = { ativo: () => LIGADO, estado: () => Object.assign({}, E) };
})();
