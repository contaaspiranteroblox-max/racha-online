/* ======================================================================================================================
   RACHA v91 · AS PATENTES NO ESTILO DA IMAGEM (a insígnia "MESTRE 1" da faixa de cima): o escudo lapidado (as faces claras e
   escuras de uma pedra), o contorno grosso, o brilho em cima e a TAMPINHA no meio — a marca do RACHA em todas as patentes.
   As mesmas 8 patentes e as mesmas 3 divisões da v79 (a conta dos pontos não muda; só o desenho):
   · a cor é a de cada patente (Bronze, Prata, Ouro, Platina, Diamante, Élite, Mestre e Lendário: PATENTES[i].cor);
   · a divisão aparece no escudo: III = 1 ponto embaixo, II = 2 pontos e as asas pequenas, I = 3 pontos, as asas grandes e a
     pedra em cima;
   · da Élite para cima, a coroa em cima do escudo (no Lendário, a coroa grande e o escudo escuro com o dourado);
   · na Élite, no Mestre e no Lendário, a coroa também no meio, no lugar da tampinha.
   O rqInsignia(e) continua devolvendo o SVG (a faixa de cima, o perfil, o ranking, a tela das patentes e o fim da ranqueada
   usam o mesmo desenho). A TELA DAS PATENTES ganha o painel azul-marinho (v91.css).
   ====================================================================================================================== */
function v91PatTampinha(cx, cy, r, claro, meio, escuro, centro){   // a tampinha (a saia dentada) no meio do escudo; no miolo, a estrela
  let d = '';                                                     // (Bronze, Prata, Ouro), o brilho de 4 pontas (Platina) ou a pedra (Diamante)
  const n = 14;
  for (let i = 0; i <= n*2; i++){ const a = -Math.PI/2 + i*Math.PI/n, rr = i % 2 ? r*.84 : r; d += (i ? 'L' : 'M') + (cx + Math.cos(a)*rr).toFixed(1) + ' ' + (cy + Math.sin(a)*rr).toFixed(1); }
  const est = (R, ri) => { let q = ''; for (let i = 0; i < 10; i++){ const a = -Math.PI/2 + i*Math.PI/5, rr = i % 2 ? ri : R; q += (i ? 'L' : 'M') + (cx + Math.cos(a)*rr).toFixed(1) + ' ' + (cy + Math.sin(a)*rr).toFixed(1); } return q + 'Z'; };
  return '<path d="' + d + 'Z" fill="' + meio + '" stroke="#0c0a1a" stroke-width="2.8" stroke-linejoin="round"/>'
    + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r*.66).toFixed(1) + '" fill="' + claro + '" stroke="#0c0a1a" stroke-width="2.2"/>'
    + v91PatMiolo(cx, cy, r, claro, escuro, centro, est)
    + '<path d="M' + (cx - r*.56).toFixed(1) + ' ' + (cy - r*.22).toFixed(1) + 'a' + (r*.62).toFixed(1) + ' ' + (r*.62).toFixed(1) + ' 0 0 1 ' + (r*.36).toFixed(1) + '-' + (r*.36).toFixed(1) + '" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2.2" stroke-linecap="round"/>';
}
function v91PatMiolo(cx, cy, r, claro, escuro, centro, est){   // o desenho do miolo (a forma muda de patente para patente, não só a cor)
  const p = (fx, fy) => (cx + r*fx).toFixed(1) + ' ' + (cy + r*fy).toFixed(1);
  if (centro === 'gema') return '<path d="M' + p(-.46, -.1) + 'L' + p(-.22, -.38) + 'L' + p(.22, -.38) + 'L' + p(.46, -.1) + 'L' + p(0, .44) + 'Z" fill="' + escuro + '"/>'
    + '<path d="M' + p(-.46, -.1) + 'L' + p(.46, -.1) + 'M' + p(-.22, -.38) + 'L' + p(-.11, -.1) + 'L' + p(0, .44) + 'L' + p(.11, -.1) + 'L' + p(.22, -.38) + '" fill="none" stroke="' + claro + '" stroke-width="1.5" stroke-linejoin="round" stroke-opacity=".9"/>';
  if (centro === 'brilho') return '<path d="M' + p(0, -.5) + 'Q' + p(.08, -.08) + ' ' + p(.5, 0) + 'Q' + p(.08, .08) + ' ' + p(0, .5) + 'Q' + p(-.08, .08) + ' ' + p(-.5, 0) + 'Q' + p(-.08, -.08) + ' ' + p(0, -.5) + 'Z" fill="' + escuro + '"/>';
  return '<path d="' + est(r*.44, r*.19) + '" fill="' + escuro + '"/>';
}
function v91PatCoroa(x, y, w, h, gr, joia, cls){         // a coroa (em cima do escudo ou no meio; cls marca qual é, para quem lê o desenho)
  const x0 = x - w/2, p = (fx, fy) => (x0 + w*fx).toFixed(1) + ' ' + (y + h*fy).toFixed(1);
  return '<g class="' + (cls || 'ins-coroa') + '">' + v91PatCoroaD(x0, y, w, h, gr, joia, p) + '</g>';
}
function v91PatCoroaD(x0, y, w, h, gr, joia, p){
  return '<path d="M' + p(.08, 1) + 'L' + p(0, .22) + 'L' + p(.28, .55) + 'L' + p(.5, 0) + 'L' + p(.72, .55) + 'L' + p(1, .22) + 'L' + p(.92, 1) + 'Z" fill="' + gr + '" stroke="#0c0a1a" stroke-width="3" stroke-linejoin="round"/>'
    + '<path d="M' + p(.1, .86) + 'L' + p(.9, .86) + '" stroke="#0c0a1a" stroke-width="2.4"/>'
    + '<circle cx="' + (x0 + w*.5).toFixed(1) + '" cy="' + (y + h*.66).toFixed(1) + '" r="' + (w*.075).toFixed(1) + '" fill="' + (joia || '#ff4a3d') + '" stroke="#0c0a1a" stroke-width="1.6"/>'
    + '<circle cx="' + (x0).toFixed(1) + '" cy="' + (y + h*.2).toFixed(1) + '" r="' + (w*.06).toFixed(1) + '" fill="' + gr + '" stroke="#0c0a1a" stroke-width="1.6"/>'
    + '<circle cx="' + (x0 + w*.5).toFixed(1) + '" cy="' + (y - h*.03).toFixed(1) + '" r="' + (w*.07).toFixed(1) + '" fill="' + gr + '" stroke="#0c0a1a" stroke-width="1.6"/>'
    + '<circle cx="' + (x0 + w).toFixed(1) + '" cy="' + (y + h*.2).toFixed(1) + '" r="' + (w*.06).toFixed(1) + '" fill="' + gr + '" stroke="#0c0a1a" stroke-width="1.6"/>';
}
function v91PatAsas(d, gr){                              // as asas atrás do escudo (II: pequenas · I: grandes)
  const L = d === 2 ? [34, 28, 20] : [22, 16], s = [];
  L.forEach((l, j) => {
    const y0 = 34 + j*15, h = 14 - j*1.5;
    s.push('M30 ' + y0 + 'L' + (30 - l) + ' ' + (y0 - l*.45 + j*3) + 'L' + (30 - l*.62) + ' ' + (y0 + h*.62) + 'L32 ' + (y0 + h) + 'Z');
  });
  const c = s.join('');
  return '<g fill="' + gr + '" stroke="#0c0a1a" stroke-width="3" stroke-linejoin="round"><path d="' + c + '"/><path d="' + c + '" transform="matrix(-1 0 0 1 120 0)"/></g>';
}
rqInsignia = function(e){
  const p = e.elo || PATENTES[0], d = Math.max(0, Math.min(2, e.k == null ? (e.div || 1) - 1 : e.k)), k = ++patSeq, c = p.cor, i = Math.max(0, PATENTES.indexOf(p));
  const lend = p.id === 'lendario', alta = i >= 5, coroaCima = alta, coroaMeio = alta;
  const G = n => 'url(#v91p' + n + k + ')';
  const escuro = corMix(c[2], '#000000', .35), fundo = p.escudo || corMix(c[2], '#000000', .55);
  let s = '<svg viewBox="0 0 120 120" aria-hidden="true" class="pat-ins v91-pat-svg pat-' + p.id + '"><defs>'
    + '<linearGradient id="v91pa' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset=".45" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></linearGradient>'
    + '<linearGradient id="v91pb' + k + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset=".55" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + corMix(c[1], '#000000', .25) + '"/></linearGradient>'
    + '<linearGradient id="v91pc' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + corMix(c[1], '#000000', .2) + '"/><stop offset="1" stop-color="' + escuro + '"/></linearGradient>'
    + '<radialGradient id="v91pd' + k + '" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="' + corMix(fundo, '#ffffff', .12) + '"/><stop offset="1" stop-color="' + fundo + '"/></radialGradient>'
    + '<radialGradient id="v91pe' + k + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="' + c[1] + '" stop-opacity=".55"/><stop offset="1" stop-color="' + c[1] + '" stop-opacity="0"/></radialGradient>'
    + (lend ? '<linearGradient id="v91pf' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6b8"/><stop offset=".4" stop-color="#ffd84a"/><stop offset="1" stop-color="#c06a00"/></linearGradient>' : '')
    + '</defs>';
  if (d === 2 || alta) s += '<circle cx="60" cy="58" r="57" fill="' + G('e') + '"/>';
  if (d >= 1) s += v91PatAsas(d, G('a'));
  // o escudo lapidado: o contorno, a borda de metal (face clara à esquerda, escura à direita) e o miolo escuro
  s += '<path d="M60 9L97 21.5V58C97 84 81 100.5 60 112C39 100.5 23 84 23 58V21.5Z" fill="#0c0a1a"/>';
  s += '<path d="M60 14L92.5 25V58C92.5 81 78.5 95.5 60 106C41.5 95.5 27.5 81 27.5 58V25Z" fill="' + G('a') + '"/>';
  s += '<path d="M60 14L92.5 25V58C92.5 81 78.5 95.5 60 106Z" fill="' + G('c') + '" opacity=".55"/>';
  s += '<path d="M60 14L27.5 25L35 31L60 22.5L85 31L92.5 25Z" fill="#fff" fill-opacity=".38"/>';
  s += '<path d="M60 24L84 32.5V58C84 75.5 74 87.5 60 95.5C46 87.5 36 75.5 36 58V32.5Z" fill="' + G('d') + '" stroke="#0c0a1a" stroke-width="2.6"/>';
  s += '<path d="M60 24V95.5" stroke="#000" stroke-opacity=".18" stroke-width="2"/>';
  s += '<path d="M31 27.5L58.5 18" stroke="#fff" stroke-opacity=".6" stroke-width="2.6" stroke-linecap="round"/>';
  if (lend) s += '<path d="M60 24L84 32.5V58C84 75.5 74 87.5 60 95.5C46 87.5 36 75.5 36 58V32.5Z" fill="none" stroke="' + G('f') + '" stroke-width="2.6"/>';
  // o meio: a tampinha (até o Diamante) ou a coroa (da Élite para cima)
  if (coroaMeio) s += v91PatCoroa(60, 46, 34, 24, lend ? G('f') : G('b'), lend ? '#ff4a3d' : c[0], 'ins-coroa-meio');
  else s += v91PatTampinha(60, 55, 21, c[0], c[1], escuro, p.id === 'diamante' ? 'gema' : p.id === 'platina' ? 'brilho' : 'estrela');
  // a divisão: os pontos embaixo (III = 1, II = 2, I = 3)
  const pts = d + 1, w0 = 60 - (pts - 1)*5.5;
  for (let j = 0; j < pts; j++) s += '<path d="M' + (w0 + j*11).toFixed(1) + ' 79.5l3.6 3.6-3.6 3.6-3.6-3.6z" fill="' + c[0] + '" stroke="#0c0a1a" stroke-width="1.8" stroke-linejoin="round"/>';
  // em cima: a pedra (I) e a coroa (da Élite para cima)
  if (coroaCima) s += v91PatCoroa(60, lend ? -1 : 1, lend ? 52 : 44, lend ? 22 : 18, lend ? G('f') : G('a'), lend ? '#ff4a3d' : c[0], lend ? 'ins-coroa ins-coroa-grande' : 'ins-coroa');
  else if (d === 2) s += '<path d="M60 3l6.5 8.5L60 20l-6.5-8.5z" fill="' + G('a') + '" stroke="#0c0a1a" stroke-width="2.6" stroke-linejoin="round"/>';
  return s + '</svg>';
};
// a tela das PATENTES: o painel e as colunas com a cara nova (v91.css) · a insígnia da faixa de cima é refeita
try { if (typeof v91Arruma === 'function' && V91.pat) V91.pat.dataset.k = ''; } catch (_) {}
