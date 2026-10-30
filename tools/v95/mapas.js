/* =====================================================================================================================
   RACHA v95 · AS CORES DOS DOIS CAMPOS (depois do terceiro teste). O pedido, com duas imagens: "quero as cores desse mapa
   [o gramado listrado visto de cima, no fim da tarde] do lado de dentro do campo apenas, mantenha o mesmo mapa; e no do
   futsal, troque por esse [a quadra da favela pintada de verde, com as áreas amarelas e o círculo azul, gasta]".
   · O ESTÁDIO (o mapa de grama, o da ranqueada): dentro das linhas, as cores medidas na imagem — o corte em 11 faixas (as
     das pontas escuras, a do meio clara, em cima da linha do meio), o verde escuro #244a22 e o claro #386c33 — e as linhas
     brancas. Os fachos dos refletores ficam fracos dentro das linhas (na imagem o gramado inteiro tem a mesma luz); fora
     delas o mapa é o mesmo (a grama de fora, o alambrado, o calçamento, os carros, os postes, a galera e as casas).
   · A ARENA (a quadra da favela, a de futsal): a quadra da imagem — o verde #237d52, as ÁREAS DE FUTSAL amarelas (o "D":
     da linha de fundo, os dois quartos de círculo com o meio reto) com a meia-lua amarela por fora, o círculo do meio azul
     com o anel amarelo, as linhas brancas (sem a grande área quadrada e sem a pequena área do futebol), a tinta descascada
     (o cimento aparecendo em ~6% da quadra, com as lascas em volta) e as rachaduras. O resto do mapa é o mesmo (o muro
     grafitado, as escadas, o piso de placas, o alambrado, as casas e a galera).
   Só desenho, feito aqui (nenhuma imagem: as duas quadras são desenhadas em código): as medidas, os gols, as marcas de cada
   tamanho (1v1 a 4v4), a física e a câmera não mudam.
   ===================================================================================================================== */

/* ---------------------------------------------------------------- 1) o ESTÁDIO: o gramado listrado da imagem, dentro das linhas */
Object.assign(CN, {faixas:11, claro:'#386c33', dentro:'#244a22', cal:'#f7f7f2'});
const CN95_LUZ_DENTRO = .15;                                // (os fachos dos refletores dentro das linhas: 15% dos de fora)
cnFaixas = function(g){                                     // as 11 faixas do corte, só entre as linhas (as das pontas escuras, a do meio clara)
  const w = LX1 - LX0, h = LY1 - LY0, n = CN.faixas, sw = w/n, meio = n >> 1;
  g.save(); g.beginPath(); g.rect(LX0, LY0, w, h); g.clip();
  g.fillStyle = CN.dentro; g.fillRect(LX0, LY0, w, h);
  g.fillStyle = CN.claro;
  for (let i = 0; i < n; i++) if (!((i - meio) & 1)) g.fillRect(LX0 + i*sw, LY0, sw + .5, h);
  g.restore();
};
const cnLuzAntes95 = cnLuz;
cnLuz = function(g){                                        // os fachos dos refletores: os de sempre por fora das linhas, fracos dentro delas
  const a = arguments;
  g.save();
  try {
    g.beginPath(); g.rect(GL - U(40), GT - U(40), GR - GL + U(80), GB - GT + U(80)); g.rect(LX0, LY0, LX1 - LX0, LY1 - LY0); g.clip('evenodd');
    cnLuzAntes95.apply(this, a);
  } finally { g.restore(); }
  g.save();
  try { g.beginPath(); g.rect(LX0, LY0, LX1 - LX0, LY1 - LY0); g.clip(); g.globalAlpha = CN95_LUZ_DENTRO; cnLuzAntes95.apply(this, a); } finally { g.restore(); }
};

/* ---------------------------------------------------------------- 2) a ARENA: a quadra de futsal da imagem */
Object.assign(QD, {verde:'#237d52', amarelo:'#e6a41c', azul:'#19618a', cal:'#f5f3ec', cimento:'#87855b', racha:'rgba(10,46,32,.6)'});
function qd95Forma(){                                       // o "D" da área de futsal e a meia-lua, nas marcas de cada tamanho
  const M = MARCAS, R = M.areaW*.9, hh = M.areaH/2, rl = M.luaR*.9;   // (o D da imagem: a fundura é 90% da meia altura; a marca do pênalti fica dentro)
  return {R, hh, seg:Math.max(0, hh - R), rl, lc:Math.max(0, R - .42*rl)};   // (o meio reto do D; a meia-lua com o centro dentro do D: sobra 58% do raio por fora)
}
function qd95D(g, xg, s, R, seg){                           // o caminho do D, da linha de fundo para dentro (aberto na linha de fundo)
  if (s < 0){ g.moveTo(xg, CY - seg - R); g.arc(xg, CY - seg, R, -Math.PI/2, 0, false); g.lineTo(xg + R, CY + seg); g.arc(xg, CY + seg, R, 0, Math.PI/2, false); }
  else { g.moveTo(xg, CY - seg - R); g.arc(xg, CY - seg, R, -Math.PI/2, -Math.PI, true); g.lineTo(xg - R, CY + seg); g.arc(xg, CY + seg, R, Math.PI, Math.PI/2, true); }
}
function qd95DentroD(x, y, xg, s, F){                       // (o ponto está dentro do D da área?)
  const dx = (x - xg)*(s < 0 ? 1 : -1); if (dx < 0) return false;
  const dy = Math.abs(y - CY);
  return dy <= F.seg ? dx <= F.R : Math.hypot(dx, dy - F.seg) <= F.R;
}
function qd95Lua(xg, s, F){                                 // a meia-lua: o centro e quanto do arco fica por fora do D (para a linha)
  const base = s < 0 ? 0 : Math.PI, xc = xg + (s < 0 ? 1 : -1)*F.lc;
  const fora = t => !qd95DentroD(xc + Math.cos(base + t)*F.rl, CY + Math.sin(base + t)*F.rl, xg, s, F);
  if (!fora(0)) return null;
  let a = 0, b = Math.PI;                                    // (bisseção: a fica por fora, b por dentro)
  for (let i = 0; i < 30; i++){ const m = (a + b)/2; if (fora(m)) a = m; else b = m; }
  return {xc, base, ab:a};
}
qdAreas = function(g){                                      // o amarelo das áreas de futsal (o D e a meia-lua por fora) e o círculo do meio (o anel amarelo e o azul)
  const {x0, x1} = LINHAS, F = qd95Forma(), c = MARCAS.circulo;
  g.fillStyle = QD.amarelo;
  for (const s of [-1, 1]){
    const xg = s < 0 ? x0 : x1;
    g.beginPath(); qd95D(g, xg, s, F.R, F.seg); g.closePath(); g.fill();
    g.beginPath(); g.arc(xg + (s < 0 ? 1 : -1)*F.lc, CY, F.rl, 0, TAU); g.fill();
  }
  g.beginPath(); g.arc(CX, CY, c, 0, TAU); g.fill();
  g.fillStyle = QD.azul; g.beginPath(); g.arc(CX, CY, c*.84, 0, TAU); g.fill();
};
function qd95Mancha(g, r, cx, cy, R, a){                    // um pedaço de tinta que saiu (torto e arredondado, um pouco achatado)
  const k = 9 + Math.floor(r()*6), a0 = r()*TAU, ex = .7 + r()*.6, P = [];
  for (let j = 0; j < k; j++){ const t = a0 + j/k*TAU, rr = R*(.45 + r()*.7); P.push([cx + Math.cos(t)*rr*ex, cy + Math.sin(t)*rr/ex]); }
  g.beginPath(); g.moveTo((P[k - 1][0] + P[0][0])/2, (P[k - 1][1] + P[0][1])/2);
  for (let j = 0; j < k; j++){ const p = P[j], q = P[(j + 1) % k]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0])/2, (p[1] + q[1])/2); }   // (a borda redonda, sem quinas)
  g.closePath(); g.globalAlpha = a; g.fill();
}
function qd95Gasto(g, r, x0, y0, w, h){                     // a tinta descascada: o cimento aparecendo e as lascas soltas em volta (~6% da quadra, como na imagem)
  const u2 = U(1)*U(1), n = Math.round(w*h/u2*.0068) + 6, F = qd95Forma();
  const quentes = [[CX, CY, MARCAS.circulo], [x0 + F.R, CY, U(6)], [x0 + w - F.R, CY, U(6)], [CX, y0 + U(3), U(9)], [CX, y0 + h - U(3), U(9)]];   // (onde mais se pisa: o meio, a frente das áreas e a linha do meio)
  g.save();
  for (let i = 0; i < n; i++){
    let cx, cy;
    if (r() < .45){ const q = quentes[Math.floor(r()*quentes.length)], a = r()*TAU, d = q[2]*Math.sqrt(r())*1.15; cx = q[0] + Math.cos(a)*d; cy = q[1] + Math.sin(a)*d; }
    else { cx = x0 + r()*w; cy = y0 + r()*h; }
    cx = Math.max(x0 + U(.6), Math.min(x0 + w - U(.6), cx)); cy = Math.max(y0 + U(.6), Math.min(y0 + h - U(.6), cy));
    const R = U(.4 + r()*r()*2.4);
    g.fillStyle = ['#87855b', '#918f66', '#7d7b54'][Math.floor(r()*3)];
    qd95Mancha(g, r, cx, cy, R, .84);
    for (let j = 0, k = 3 + Math.floor(r()*6); j < k; j++){ const a = r()*TAU, d = R*(1.05 + r()*1.6); qd95Mancha(g, r, cx + Math.cos(a)*d, cy + Math.sin(a)*d, R*(.1 + r()*.22), .78); }   // as lascas
  }
  g.restore();
}
function qd95Rachaduras(g, r, x0, y0, w, h){                // as rachaduras do cimento (o risco fino que anda torto e se divide)
  const n = Math.round(w*h/(U(1)*U(1))*.0022) + 4;
  g.save(); g.strokeStyle = QD.racha; g.lineCap = 'round'; g.lineJoin = 'round';
  const risca = (x, y, a, passos, larg, nivel) => {
    g.lineWidth = larg; g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < passos; i++){
      a += (r() - .5)*.9; const p = U(.9 + r()*1.6); x += Math.cos(a)*p; y += Math.sin(a)*p;
      if (x < x0 || x > x0 + w || y < y0 || y > y0 + h) break;
      g.lineTo(x, y);
      if (nivel < 2 && r() < .18){ g.stroke(); risca(x, y, a + (r() < .5 ? 1 : -1)*(.6 + r()*.7), 2 + Math.floor(r()*4), larg*.7, nivel + 1); g.lineWidth = larg; g.beginPath(); g.moveTo(x, y); }
    }
    g.stroke();
  };
  for (let i = 0; i < n; i++) risca(x0 + r()*w, y0 + r()*h, r()*TAU, 6 + Math.floor(r()*16), U(.05 + r()*.04), 0);
  g.restore();
}
function qd95Linhas(g, liso){                               // as linhas brancas da quadra de futsal: a de fora, o meio, o círculo, os Ds, as meias-luas, as marcas e os cantos
  const {x0, y0, x1, y1} = LINHAS, M = MARCAS, c = M.circulo, e = U(LINHA_E), m = e/2, F = qd95Forma();
  const cal = liso ? QD.cal : arTinta(g, QD.cal, 53);
  g.save(); g.lineWidth = e; g.lineCap = 'butt'; g.lineJoin = 'round'; g.strokeStyle = cal; g.fillStyle = cal;
  if (!liso) g.globalAlpha = .94;
  g.strokeRect(x0 + m, y0 + m, x1 - x0 - e, y1 - y0 - e);                          // a linha de fora
  g.fillRect(CX - m, y0 + e, e, y1 - y0 - 2*e);                                    // o meio da quadra (atravessa o círculo)
  g.beginPath(); g.arc(CX, CY, c - m, 0, TAU); g.stroke();                         // o círculo (por fora do anel amarelo)
  g.beginPath(); g.arc(CX, CY, U(.42), 0, TAU); g.fill();                          // a marca do meio
  for (const s of [-1, 1]){
    const xg = s < 0 ? x0 : x1;
    g.beginPath(); qd95D(g, xg, s, F.R - m, F.seg); g.stroke();                    // o D da área de futsal
    const L = qd95Lua(xg, s, F);                                                   // a meia-lua: só o arco de fora do D
    if (L){ g.beginPath(); g.arc(L.xc, CY, F.rl - m, L.base - L.ab, L.base + L.ab); g.stroke(); }
    g.beginPath(); g.arc(xg - s*M.penalti, CY, U(.42), 0, TAU); g.fill();         // a marca do pênalti
    for (const sy of [-1, 1]){                                                     // o arco do escanteio
      const yc = sy < 0 ? y0 : y1, a0 = s < 0 ? (sy < 0 ? 0 : -Math.PI/2) : (sy < 0 ? Math.PI/2 : Math.PI);
      g.beginPath(); g.arc(xg, yc, U(1.6), a0, a0 + Math.PI/2); g.stroke();
    }
  }
  g.restore();
}
qdQuadra = function(g, r, leve){                            // a quadra: o verde, as áreas, o gasto, o grão da tinta, as rachaduras e as linhas
  const {x0, y0, x1, y1} = LINHAS, w = x1 - x0, h = y1 - y0;
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  g.fillStyle = QD.verde; g.fillRect(x0, y0, w, h);
  qdAreas(g);
  if (!leve){
    qd95Gasto(g, r, x0, y0, w, h);
    const pt = qdPadrao(g, 'tx_det', U(13.5));              // o grão da tinta (128 = sem mudança)
    if (pt){ g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = .7; g.fillStyle = pt; g.fillRect(x0, y0, w, h); g.restore(); }
    for (let i = 0; i < 26; i++){                           // a tinta não é igual: manchas mais claras e mais escuras
      const x = x0 + r()*w, y = y0 + r()*h, rx = U(2 + r()*6), ry = rx*(.4 + r()*.4);
      g.fillStyle = r() < .5 ? 'rgba(225,245,215,.045)' : 'rgba(16,22,10,.05)';
      g.beginPath(); g.ellipse(x, y, rx, ry, r()*Math.PI, 0, TAU); g.fill();
    }
    qd95Rachaduras(g, r, x0, y0, w, h);
  }
  g.restore();
  qd95Linhas(g, leve);
};
quadra77Plano = function(g){                                // Ultra leve: as cores lisas, as áreas, as linhas e a sombra dos gols
  g.fillStyle = QD.fora; g.fillRect(0, 0, MW, MH);
  g.fillStyle = '#b08f62'; g.fillRect(GL - U(2), 0, U(2), MH); g.fillRect(GR, 0, U(2), MH);
  g.fillStyle = QD.muro; g.fillRect(GL, 0, GR - GL, GT);
  g.fillStyle = QD.rua; g.fillRect(GL, GB, GR - GL, MH - GB);
  g.fillStyle = QD.piso; g.fillRect(GL, GT, GR - GL, GB - GT);
  const {x0, y0, x1, y1} = LINHAS;
  g.fillStyle = QD.verde; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); qdAreas(g); g.restore();
  qd95Linhas(g, true);
  if (!mdSemGol()) for (const s of [-1, 1]) estGolChao(g, s);
  return true;
};
MAPA_DESC.estadio = 'A quadra de futsal da favela vista de cima: o verde com as áreas amarelas e o círculo azul, a tinta gasta, o muro grafitado, as escadas e as casas em volta';
try { for (const k of [...PREV_MORRO.keys()]) PREV_MORRO.delete(k); } catch (_) {}   // (as prévias dos mapas no JOGAR: refeitas com as cores novas)
window.RachaMapas95 = {forma:qd95Forma, dentroD:qd95DentroD, lua:qd95Lua, CN, QD};
