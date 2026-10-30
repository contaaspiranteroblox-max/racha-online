/* ==================================================================================================================
   RACHA v93 · a atualização completa por fases — o começo (o que as outras partes da v93 usam)
   O editor de HUD da v92 (tools/v92/hud.js) é preservado; aqui só entra o que as fases pedem.
   ================================================================================================================== */
const V93 = {versao:'v93'};
window.RACHA_V93 = V93;

/* ---- um aviso curto perto de um controle (o ARMADO, a carga da CURVA): no lado em que não fica em cima de outro controle,
   da pausa ou da beira da tela. Antes ele ia sempre em cima do botão — e em cima do CHUTE fica o PASSE. */
function v93RotuloLugar(s, ex, ey, r, tam){
  const g = ctx; g.save(); g.font = tam + 'px ' + FONT; const w = g.measureText(s).width + tam*1.2, h = tam*1.72; g.restore();
  const cands = [[ex - r - w/2 - 16, ey, 0], [ex, ey - r - h/2 - 14, 40], [ex + r + w/2 + 16, ey, 60], [ex, ey + r + h/2 + 14, 80],
                 [ex - r - w/2 - 16, ey - r*.9, 120], [ex - r - w/2 - 16, ey + r*.9, 120]];
  const obst = [];
  for (const k of HE_ORDEM){ if (!controleVisivel(k)) continue; const e = el(k); obst.push({x:e.x, y:e.y, r:e.r + 10}); }
  const P = BTN_PAUSA; obst.push({x:P.x + P.w/2, y:P.y + P.h/2, r:Math.max(P.w, P.h)*.7});
  let melhor = null;
  for (const [x0, y0, pref] of cands){
    const x = Math.max(w/2 + 10, Math.min(W - w/2 - 10, x0)), y = Math.max(h/2 + 10, Math.min(H - h/2 - 10, y0));
    const R = {x:x - w/2, y:y - h/2, w, h};
    let c = pref + Math.hypot(x - x0, y - y0)*3;              // (empurrado para dentro da tela: pior)
    for (const o of obst){ const sb = heSobra(R, o); if (sb) c += 2000 + sb*30; }
    if (!melhor || c < melhor.c) melhor = {x, y, w, h, c};
  }
  return melhor;
}
function v93Rotulo(g, s, ex, ey, r, tam, cor, fundo){
  const L = v93RotuloLugar(s, ex, ey, r, tam);
  g.save(); rr(g, L.x - L.w/2, L.y - L.h/2, L.w, L.h, L.h/2); g.fillStyle = fundo || 'rgba(8,10,28,.84)'; g.fill(); g.restore();
  txt(g, s, L.x, L.y, tam, cor, 'rgba(5,10,25,.95)', 4);
  return L;
}
