/* ======================================================================================================================
   RACHA v95 · AS PATENTES MAIS BONITAS (o mesmo rqInsignia(e), o mesmo SVG em todo lugar: a faixa de cima, o JOGAR, a busca,
   o fim da ranqueada, o perfil, o ranking e a tela das PATENTES). As mesmas 8 patentes e 3 divisões (a conta dos pontos não
   muda); cada patente ganha a SUA forma — não só a cor:
   · BRONZE: o escudo redondo de cobre, com a tampinha no meio · PRATA: o escudo com o recorte em cima e a estrela ·
   · OURO: o escudo de ponta com o sol por dentro · PLATINA: o hexágono de cristal com o brilho de quatro pontas ·
   · DIAMANTE: a pedra lapidada (as faces claras e escuras) · ÉLITE: o brasão roxo de seis pontas, com a coroa no meio ·
   · MESTRE: o brasão vermelho de oito pontas, com a chama · LENDÁRIO: o brasão de ouro com o céu roxo, os louros e a
     coroa grande em cima.
   A DIVISÃO aparece na fita de baixo (III, II, I) e no que vem em volta: II ganha as asas pequenas; I, as asas grandes e o
   brilho atrás. Da Élite para cima, a coroa em cima (no Lendário, a coroa grande).
   ====================================================================================================================== */
function v95PatPoli(n, r, cx, cy, rot, r2){                    // o polígono (e a estrela, com r2) em volta de cx, cy
  let d = '';
  const m = r2 ? n*2 : n;
  for (let i = 0; i < m; i++){ const a = (rot || 0) + i*Math.PI*2/m, rr = r2 && i % 2 ? r2 : r; d += (i ? 'L' : 'M') + (cx + Math.cos(a)*rr).toFixed(2) + ' ' + (cy + Math.sin(a)*rr).toFixed(2); }
  return d + 'Z';
}
const V95_PAT_FORMA = {                                         // a forma de cada patente (viewBox 0 0 120 120; o centro do desenho em 60, 60)
  bronze:'M60 14C80 14 94 22 94 40V58C94 82 79 98 60 108C41 98 26 82 26 58V40C26 22 40 14 60 14Z',
  prata:'M60 10L70 18H94V58C94 84 79 99 60 110C41 99 26 84 26 58V18H50Z',
  ouro:'M60 6L76 18L98 21V57C98 85 80 101 60 113C40 101 22 85 22 57V21L44 18Z',
  platina:v95PatPoli(6, 50, 60, 60, -Math.PI/2),
  diamante:'M60 6L101 46L60 114L19 46Z',
  elite:v95PatPoli(6, 54, 60, 60, -Math.PI/2, 37),
  mestre:v95PatPoli(8, 55, 60, 60, -Math.PI/2, 39),
  lendario:v95PatPoli(10, 55, 60, 61, -Math.PI/2, 42)
};
function v95PatCoroa(x, y, w, h, fill, joia, cls){              // a coroa (cls: ins-coroa em cima · ins-coroa-grande no Lendário · ins-coroa-meio no meio)
  const x0 = x - w/2, p = (fx, fy) => (x0 + w*fx).toFixed(1) + ' ' + (y + h*fy).toFixed(1);
  return '<g class="' + cls + '"><path d="M' + p(.06, 1) + 'L' + p(0, .2) + 'L' + p(.27, .52) + 'L' + p(.5, 0) + 'L' + p(.73, .52) + 'L' + p(1, .2) + 'L' + p(.94, 1) + 'Z" fill="' + fill + '" stroke="#0c0a1a" stroke-width="3" stroke-linejoin="round"/>'
    + '<path d="M' + p(.1, .82) + 'L' + p(.9, .82) + '" stroke="#0c0a1a" stroke-width="2.2"/>'
    + '<circle cx="' + (x0 + w*.5).toFixed(1) + '" cy="' + (y + h*.63).toFixed(1) + '" r="' + (w*.08).toFixed(1) + '" fill="' + (joia || '#ff4a3d') + '" stroke="#0c0a1a" stroke-width="1.6"/>'
    + ['0|.2', '.5|-.02', '1|.2'].map(s => { const [fx, fy] = s.split('|').map(Number); return '<circle cx="' + (x0 + w*fx).toFixed(1) + '" cy="' + (y + h*fy).toFixed(1) + '" r="' + (w*.065).toFixed(1) + '" fill="' + fill + '" stroke="#0c0a1a" stroke-width="1.6"/>'; }).join('')
    + '</g>';
}
function v95PatAsas(d, fill, grande){                          // as asas atrás (II: pequenas; I: grandes, com mais penas)
  const n = d === 2 ? 4 : 3, base = grande ? 1.12 : 1, s = [];
  for (let j = 0; j < n; j++){
    const L = (d === 2 ? 47 : 31)*base - j*6.5, y0 = 38 + j*12, h = 13 - j;
    s.push('M30 ' + y0 + 'C' + (30 - L*.45) + ' ' + (y0 - 8) + ' ' + (30 - L) + ' ' + (y0 - 4 - j*1.5) + ' ' + (30 - L) + ' ' + (y0 - 2 - j*2) + 'C' + (30 - L*.8) + ' ' + (y0 + h*.7) + ' ' + (30 - L*.35) + ' ' + (y0 + h) + ' 34 ' + (y0 + h + 2) + 'Z');
  }
  const c = s.join('');
  return '<g class="ins-asas" fill="' + fill + '" stroke="#0c0a1a" stroke-width="3" stroke-linejoin="round"><path d="' + c + '"/><path d="' + c + '" transform="matrix(-1 0 0 1 120 0)"/></g>';
}
function v95PatMiolo(id, cx, cy, claro, meio, escuro, G){       // o desenho do meio (muda de patente para patente)
  const est = (R, ri, n) => v95PatPoli(n || 5, R, cx, cy, -Math.PI/2, ri);
  if (id === 'bronze' || id === 'prata'){                       // a tampinha (a marca do RACHA), na prata com a estrela
    let d = ''; const r = 15, n = 14;
    for (let i = 0; i <= n*2; i++){ const a = -Math.PI/2 + i*Math.PI/n, rr = i % 2 ? r*.84 : r; d += (i ? 'L' : 'M') + (cx + Math.cos(a)*rr).toFixed(1) + ' ' + (cy + Math.sin(a)*rr).toFixed(1); }
    return '<path d="' + d + 'Z" fill="' + meio + '" stroke="#0c0a1a" stroke-width="2.4" stroke-linejoin="round"/><circle cx="' + cx + '" cy="' + cy + '" r="10" fill="' + claro + '" stroke="#0c0a1a" stroke-width="2"/>'
      + (id === 'prata' ? '<path d="' + est(6.4, 2.7) + '" fill="' + escuro + '"/>' : '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="' + escuro + '"/>')
      + '<path d="M' + (cx - 8) + ' ' + (cy - 3) + 'a9 9 0 0 1 5-5" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2" stroke-linecap="round"/>';
  }
  if (id === 'ouro'){                                           // o sol: a estrela com os raios
    let r = ''; for (let i = 0; i < 12; i++){ const a = i*Math.PI/6; r += 'M' + (cx + Math.cos(a)*14).toFixed(1) + ' ' + (cy + Math.sin(a)*14).toFixed(1) + 'L' + (cx + Math.cos(a)*21).toFixed(1) + ' ' + (cy + Math.sin(a)*21).toFixed(1); }
    return '<path d="' + r + '" stroke="' + claro + '" stroke-width="3" stroke-linecap="round" opacity=".85"/><path d="' + est(14, 6) + '" fill="' + G('a') + '" stroke="#0c0a1a" stroke-width="2.6" stroke-linejoin="round"/>';
  }
  if (id === 'platina') return '<path d="M' + cx + ' ' + (cy - 20) + 'Q' + (cx + 3) + ' ' + (cy - 3) + ' ' + (cx + 20) + ' ' + cy + 'Q' + (cx + 3) + ' ' + (cy + 3) + ' ' + cx + ' ' + (cy + 20) + 'Q' + (cx - 3) + ' ' + (cy + 3) + ' ' + (cx - 20) + ' ' + cy + 'Q' + (cx - 3) + ' ' + (cy - 3) + ' ' + cx + ' ' + (cy - 20) + 'Z" fill="' + G('a') + '" stroke="#0c0a1a" stroke-width="2.4" stroke-linejoin="round"/>'
    + '<circle cx="' + (cx + 11) + '" cy="' + (cy - 12) + '" r="2.4" fill="#fff"/>';
  if (id === 'diamante') return '<path d="M' + (cx - 17) + ' ' + (cy - 5) + 'L' + (cx - 8) + ' ' + (cy - 15) + 'H' + (cx + 8) + 'L' + (cx + 17) + ' ' + (cy - 5) + 'L' + cx + ' ' + (cy + 17) + 'Z" fill="' + G('a') + '" stroke="#0c0a1a" stroke-width="2.4" stroke-linejoin="round"/>'
    + '<path d="M' + (cx - 17) + ' ' + (cy - 5) + 'H' + (cx + 17) + 'M' + (cx - 8) + ' ' + (cy - 15) + 'L' + (cx - 4) + ' ' + (cy - 5) + 'L' + cx + ' ' + (cy + 17) + 'L' + (cx + 4) + ' ' + (cy - 5) + 'L' + (cx + 8) + ' ' + (cy - 15) + '" fill="none" stroke="#0c0a1a" stroke-width="1.6" stroke-opacity=".7" stroke-linejoin="round"/>';
  if (id === 'elite') return v95PatCoroa(cx, cy - 11, 30, 22, G('a'), claro, 'ins-coroa-meio');
  if (id === 'mestre') return '<path d="M' + cx + ' ' + (cy - 21) + 'C' + (cx + 4) + ' ' + (cy - 10) + ' ' + (cx + 16) + ' ' + (cy - 7) + ' ' + (cx + 14) + ' ' + (cy + 6) + 'C' + (cx + 13) + ' ' + (cy + 15) + ' ' + (cx + 6) + ' ' + (cy + 19) + ' ' + cx + ' ' + (cy + 19) + 'C' + (cx - 6) + ' ' + (cy + 19) + ' ' + (cx - 14) + ' ' + (cy + 15) + ' ' + (cx - 14) + ' ' + (cy + 5) + 'C' + (cx - 14) + ' ' + (cy - 4) + ' ' + (cx - 7) + ' ' + (cy - 6) + ' ' + (cx - 6) + ' ' + (cy - 12) + 'C' + (cx - 2) + ' ' + (cy - 8) + ' ' + (cx - 1) + ' ' + (cy - 14) + ' ' + cx + ' ' + (cy - 21) + 'Z" fill="' + G('a') + '" stroke="#0c0a1a" stroke-width="2.4" stroke-linejoin="round"/>'
    + '<path d="M' + cx + ' ' + (cy - 2) + 'C' + (cx + 5) + ' ' + (cy + 3) + ' ' + (cx + 6) + ' ' + (cy + 14) + ' ' + cx + ' ' + (cy + 14) + 'C' + (cx - 6) + ' ' + (cy + 14) + ' ' + (cx - 5) + ' ' + (cy + 5) + ' ' + cx + ' ' + (cy - 2) + 'Z" fill="#fff3c4"/>';
  return '<path d="' + est(15, 6.4) + '" fill="' + G('f') + '" stroke="#0c0a1a" stroke-width="2.6" stroke-linejoin="round"/><circle cx="' + cx + '" cy="' + cy + '" r="3" fill="#fff"/>';   // o Lendário: a estrela de ouro
}
function v95PatLouros(fill){                                    // os louros do Lendário (dos lados, embaixo)
  let s = '';
  for (let j = 0; j < 5; j++){
    const a = Math.PI*.6 + j*.2, x = 60 + Math.cos(a)*54, y = 58 + Math.sin(a)*46, rot = (a*180/Math.PI + 90).toFixed(0);
    s += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="3.6" ry="8" transform="rotate(' + rot + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')" fill="' + fill + '" stroke="#0c0a1a" stroke-width="2"/>';
  }
  return '<g class="ins-louros">' + s + '<g transform="matrix(-1 0 0 1 120 0)">' + s + '</g></g>';
}
rqInsignia = function(e){
  const p = e.elo || PATENTES[0], d = Math.max(0, Math.min(2, e.k == null ? (e.div || 1) - 1 : e.k)), k = ++patSeq, c = p.cor, i = Math.max(0, PATENTES.indexOf(p));
  const id = p.id, lend = id === 'lendario', alta = i >= 5, forma = V95_PAT_FORMA[id] || V95_PAT_FORMA.bronze;
  const G = n => 'url(#v95p' + n + k + ')';
  const escuro = corMix(c[2], '#000000', .38), fundo = p.escudo || corMix(c[2], '#000000', .5);
  const mid = 'translate(60 60) scale(.78) translate(-60 -60)';
  let s = '<svg viewBox="0 0 120 120" aria-hidden="true" class="pat-ins v91-pat-svg v95-pat pat-' + id + ' div-' + PAT_DIV[d] + '"><defs>'
    + '<linearGradient id="v95pa' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset=".42" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></linearGradient>'
    + '<linearGradient id="v95pb' + k + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset=".35" stop-color="' + c[1] + '"/><stop offset=".62" stop-color="' + corMix(c[1], '#000000', .22) + '"/><stop offset=".78" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></linearGradient>'
    + '<radialGradient id="v95pc' + k + '" cx=".42" cy=".34" r=".75"><stop offset="0" stop-color="' + corMix(fundo, c[1], .38) + '"/><stop offset=".6" stop-color="' + fundo + '"/><stop offset="1" stop-color="' + corMix(fundo, '#000000', .45) + '"/></radialGradient>'
    + '<radialGradient id="v95pd' + k + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="' + c[1] + '" stop-opacity=".75"/><stop offset=".55" stop-color="' + c[1] + '" stop-opacity=".25"/><stop offset="1" stop-color="' + c[1] + '" stop-opacity="0"/></radialGradient>'
    + (lend ? '<linearGradient id="v95pf' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbd6"/><stop offset=".35" stop-color="#ffe066"/><stop offset=".7" stop-color="#f2a400"/><stop offset="1" stop-color="#9a5a00"/></linearGradient>'
      + '<radialGradient id="v95pg' + k + '" cx=".5" cy=".4" r=".65"><stop offset="0" stop-color="#6a3cc8"/><stop offset=".6" stop-color="#2a0f5c"/><stop offset="1" stop-color="#12052a"/></radialGradient>' : '')
    + '<clipPath id="v95pk' + k + '"><path d="' + forma + '" transform="' + mid + '"/></clipPath>'
    + '</defs>';
  // atrás: o brilho (I e as altas), os raios do Lendário e as asas (II pequenas, I grandes)
  if (d === 2 || alta) s += '<circle cx="60" cy="60" r="' + (alta ? 59 : 54) + '" fill="' + G('d') + '"/>';
  if (lend){ let r = ''; for (let j = 0; j < 16; j++){ const a = j*Math.PI/8 + .1; r += 'M60 60L' + (60 + Math.cos(a - .07)*60).toFixed(1) + ' ' + (60 + Math.sin(a - .07)*60).toFixed(1) + 'L' + (60 + Math.cos(a + .07)*60).toFixed(1) + ' ' + (60 + Math.sin(a + .07)*60).toFixed(1) + 'Z'; } s += '<path d="' + r + '" fill="#ffe27a" opacity=".28"/>'; }
  if (d >= 1) s += v95PatAsas(d, G('a'), alta);
  // a forma: o contorno grosso, o metal (a moldura) e o miolo escuro com o brilho
  s += '<path d="' + forma + '" fill="#0c0a1a" stroke="#0c0a1a" stroke-width="7" stroke-linejoin="round"/>';
  s += '<path d="' + forma + '" fill="' + (lend ? G('f') : G('b')) + '"/>';
  s += '<path d="' + forma + '" fill="' + (lend ? G('g') : G('c')) + '" stroke="#0c0a1a" stroke-width="3.4" stroke-linejoin="round" transform="' + mid + '"/>';
  if (id === 'diamante') s += '<g clip-path="url(#v95pk' + k + ')"><path d="M19 46L60 6L60 114Z" fill="#fff" opacity=".08"/><path d="M60 6L101 46H19Z" fill="#fff" opacity=".1"/><path d="M19 46L60 114L101 46Z" fill="#000" opacity=".14"/></g>';
  if (lend){ let st = ''; for (const [x, y, r] of [[44, 42, 1.4], [78, 46, 1.1], [70, 80, 1.3], [46, 76, 1], [60, 34, 1.2]]) st += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff" opacity=".85"/>'; s += st; }
  s += '<path d="' + forma + '" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2.4" transform="translate(60 60) scale(.9) translate(-60 -60)" clip-path="url(#v95pk' + k + ')"/>';
  s += '<path d="M30 30Q48 12 72 16" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>';
  // o meio
  s += v95PatMiolo(id, 60, id === 'elite' ? 60 : 58, c[0], c[1], escuro, G);
  // a fita da divisão (III, II, I)
  const fw = 34 + d*0, fy = id === 'diamante' ? 88 : 92;
  s += '<g class="ins-fita"><path d="M' + (60 - fw/2 - 7) + ' ' + (fy + 2) + 'L' + (60 - fw/2) + ' ' + (fy - 1) + 'V' + (fy + 13) + 'L' + (60 - fw/2 - 7) + ' ' + (fy + 16) + 'L' + (60 - fw/2 - 3) + ' ' + (fy + 9) + 'Z" fill="' + corMix(c[2], '#000000', .25) + '" stroke="#0c0a1a" stroke-width="2.4" stroke-linejoin="round"/>'
    + '<path d="M' + (60 + fw/2 + 7) + ' ' + (fy + 2) + 'L' + (60 + fw/2) + ' ' + (fy - 1) + 'V' + (fy + 13) + 'L' + (60 + fw/2 + 7) + ' ' + (fy + 16) + 'L' + (60 + fw/2 + 3) + ' ' + (fy + 9) + 'Z" fill="' + corMix(c[2], '#000000', .25) + '" stroke="#0c0a1a" stroke-width="2.4" stroke-linejoin="round"/>'
    + '<rect x="' + (60 - fw/2) + '" y="' + (fy - 3) + '" width="' + fw + '" height="17" rx="3" fill="' + (lend ? G('f') : G('a')) + '" stroke="#0c0a1a" stroke-width="2.6"/>'
    + '<text x="60" y="' + (fy + 10.4) + '" text-anchor="middle" font-family="Lilita One, Anton, Impact, sans-serif" font-size="14" fill="#fff" stroke="#0c0a1a" stroke-width="3.2" paint-order="stroke" letter-spacing="1">' + PAT_DIV[d] + '</text></g>';
  if (lend) s += v95PatLouros(G('f'));
  // em cima: a coroa (da Élite para cima; a grande no Lendário) ou, no I das outras, a pedrinha
  if (lend) s += v95PatCoroa(60, -2, 54, 24, G('f'), '#ff4a3d', 'ins-coroa ins-coroa-grande');
  else if (alta) s += v95PatCoroa(60, 0, 42, 18, G('a'), c[0], 'ins-coroa');
  else if (d === 2) s += '<path d="M60 0l7 9-7 9-7-9z" fill="' + G('a') + '" stroke="#0c0a1a" stroke-width="2.6" stroke-linejoin="round"/>';
  return s + '</svg>';
};
try { if (typeof v91Arruma === 'function' && V91.pat) V91.pat.dataset.k = ''; } catch (_) {}
try { LB_ELO.k = ''; } catch (_) {}
