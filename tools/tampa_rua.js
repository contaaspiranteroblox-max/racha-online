/* =====================================================================
   RACHA rua · v69 — AS TAMPINHAS PERSONALIZADAS (o motor) — entra depois do salas_rua.js
   Toda tampinha sai de um "desenho" (D):
     borda (a saia com os dentes) · padrão (o tampo pintado) · ícone (o que vai em cima) · as cores, a posição, o tamanho e o ângulo
   O desenho vira um código curto (T.…, até 40 letras) que vai no perfil.skin: ele anda com você (lobby, perfil, partida,
   replay, salas online e o chat). O escudo do clube usa o mesmo motor com outra forma por fora (E.…).
   O time de cada um continua no halo (a cor do time em volta da tampinha), como era na coleção antiga.
   Nada aqui mexe na física: só desenho e o que fica salvo neste aparelho.
   IMPORTANTE: as listas (bordas, formas, padrões, ícones) só crescem no fim — a posição de cada item está dentro dos códigos.
   ===================================================================== */

const TP_TAU = Math.PI*2;
const TP_HEX = /^#[0-9a-f]{6}$/i;
const tpHex = (c, pad) => TP_HEX.test(c || '') ? String(c).toLowerCase() : pad;
const tpMix = (a, b, k) => corMix(tpHex(a, '#888888'), tpHex(b, '#888888'), k);
const tpLim = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v || 0)));

/* ---------------------------------------------------------------- os preços (moedas ou gemas deste aparelho) */
const TP_PRECO = {gratis:{m:0, g:0, nome:'Grátis'}, comum:{m:300, g:0, nome:'Comum'}, raro:{m:800, g:0, nome:'Raro'},
  epico:{m:0, g:40, nome:'Épico'}, lendario:{m:0, g:100, nome:'Lendário'}};

/* ---------------------------------------------------------------- caminhos (sem riscos soltos entre as partes) */
const tpArc = (p, x, y, r) => { p.moveTo(x + r, y); p.arc(x, y, r, 0, TP_TAU); };
const tpEli = (p, x, y, rx, ry, rot) => { rot = rot || 0; p.moveTo(x + Math.cos(rot)*rx, y + Math.sin(rot)*rx); p.ellipse(x, y, rx, ry, rot, 0, TP_TAU); };
const tpPoli = (p, pts) => { pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); };
function tpP(fn){ const p = new Path2D(); fn(p); return p; }
function tpSvg(d){                                      // um caminho SVG em -100..100 (só M L C Q A Z maiúsculos) para -1..1
  const t = d.match(/[MLCQAZ]|-?\d*\.?\d+/g) || []; let out = '', cmd = '', k = 0;
  for (const s of t){
    if (/^[MLCQAZ]$/.test(s)){ cmd = s; k = 0; out += s + ' '; continue; }
    const pos = k % 7; k++;
    out += (cmd === 'A' && pos >= 2 && pos <= 4 ? s : String(parseFloat(s)*.01)) + ' ';
  }
  return new Path2D(out);
}
function tpEstrelaPath(p, x, y, r, n, k, a0){
  for (let i = 0; i < n*2; i++){ const a = (a0 == null ? -Math.PI/2 : a0) + i*Math.PI/n, q = i % 2 ? r*k : r; i ? p.lineTo(x + Math.cos(a)*q, y + Math.sin(a)*q) : p.moveTo(x + Math.cos(a)*q, y + Math.sin(a)*q); }
  p.closePath();
}
const tpRect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const tpCirc = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TP_TAU); g.fill(); };
function tpTxt(g, t, x, y, px, modo, cor, lw){          // texto num desenho em escala pequena (fonte de 1 px quebra em alguns aparelhos): desenha 100× maior e encolhe
  g.save(); g.scale(.01, .01); g.font = '400 ' + (px*100).toFixed(1) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  if (modo === 'traco'){ g.lineWidth = lw*100; g.strokeStyle = cor; g.strokeText(t, x*100, y*100); } else { g.fillStyle = cor; g.fillText(t, x*100, y*100); }
  g.restore();
}

/* ---------------------------------------------------------------- 1) as bordas (a saia da tampinha) */
// n = os dentes · forma = o perfil do dente · pinta = como o metal é pintado · cores = quantas cores da borda ele usa
const TP_BORDAS = [
  {id:'cl', nome:'Clássica', pr:'gratis', n:21, forma:'onda', pinta:'metal', cores:1, nome2:true},
  {id:'dt', nome:'Dentada', pr:'gratis', n:21, forma:'onda', pinta:'metal', cores:1},
  {id:'ls', nome:'Lisa', pr:'gratis', n:0, forma:'lisa', pinta:'metal', cores:1},
  {id:'df', nome:'Dentada fina', pr:'comum', n:34, forma:'onda', pinta:'metal', cores:1},
  {id:'dl', nome:'Dentada larga', pr:'comum', n:13, forma:'onda', pinta:'metal', cores:1},
  {id:'od', nome:'Ondulada', pr:'comum', n:14, forma:'concha', pinta:'metal', cores:1},
  {id:'bc', nome:'Bicolor', pr:'comum', n:21, forma:'onda', pinta:'alterna', cores:2},
  {id:'lt', nome:'Listrada', pr:'raro', n:24, forma:'onda', pinta:'blocos', cores:2},
  {id:'pt', nome:'Pontilhada', pr:'raro', n:21, forma:'onda', pinta:'pontos', cores:2},
  {id:'cr', nome:'Coroa', pr:'raro', n:12, forma:'ponta', pinta:'metal', cores:1},
  {id:'en', nome:'Engrenagem', pr:'raro', n:12, forma:'quadrada', pinta:'metal', cores:1},
  {id:'tr', nome:'Trançada', pr:'raro', n:0, forma:'lisa', pinta:'corda', cores:2},
  {id:'re', nome:'Rebites', pr:'raro', n:0, forma:'lisa', pinta:'rebite', cores:2},
  {id:'pr', nome:'Cromada', pr:'epico', n:21, forma:'onda', pinta:'prata', cores:0},
  {id:'ou', nome:'Ouro', pr:'epico', n:21, forma:'onda', pinta:'ouro', cores:0},
  {id:'ne', nome:'Neon', pr:'epico', n:21, forma:'onda', pinta:'neon', cores:1},
  {id:'fo', nome:'Fogo', pr:'lendario', n:16, forma:'chama', pinta:'fogo', cores:2},
  {id:'ai', nome:'Arco-íris', pr:'lendario', n:24, forma:'onda', pinta:'arco', cores:0},
  {id:'ge', nome:'Gelo', pr:'lendario', n:18, forma:'ponta', pinta:'gelo', cores:0}
];
/* as formas do escudo do clube (no lugar da saia) */
const TP_FORMAS = [
  {id:'es', nome:'Escudo', pr:'gratis'}, {id:'ci', nome:'Círculo', pr:'gratis'}, {id:'ep', nome:'Escudo pontudo', pr:'gratis'},
  {id:'er', nome:'Escudo redondo', pr:'comum'}, {id:'em', nome:'Escudo moderno', pr:'comum'}, {id:'hx', nome:'Hexágono', pr:'comum'},
  {id:'oc', nome:'Octógono', pr:'raro'}, {id:'lo', nome:'Losango', pr:'raro'}, {id:'qd', nome:'Quadrado', pr:'raro'},
  {id:'br', nome:'Brasão', pr:'raro'}, {id:'fl', nome:'Flâmula', pr:'epico'}, {id:'et', nome:'Estrela', pr:'epico'},
  {id:'go', nome:'Gota', pr:'epico'}, {id:'ca', nome:'Castelo', pr:'lendario'}, {id:'as', nome:'Asas', pr:'lendario'}
];
function tpFormaPath(id){                               // a forma do escudo em -1..1
  const p = new Path2D(), reg = (n, r0, a0) => tpPoli(p, Array.from({length:n}, (_, i) => { const a = a0 + i/n*TP_TAU; return [Math.cos(a)*r0, Math.sin(a)*r0]; }));
  switch (id){
    case 'es': p.moveTo(-.82, -.9); p.lineTo(.82, -.9); p.lineTo(.82, .05); p.bezierCurveTo(.82, .55, .4, .82, 0, 1); p.bezierCurveTo(-.4, .82, -.82, .55, -.82, .05); p.closePath(); break;
    case 'ep': p.moveTo(-.86, -.92); p.quadraticCurveTo(0, -.78, .86, -.92); p.lineTo(.8, .1); p.quadraticCurveTo(.66, .62, 0, 1); p.quadraticCurveTo(-.66, .62, -.8, .1); p.closePath(); break;
    case 'er': p.moveTo(-.84, -.8); p.quadraticCurveTo(0, -1.02, .84, -.8); p.lineTo(.84, .1); p.arc(0, .1, .84, 0, Math.PI); p.closePath(); break;
    case 'em': p.moveTo(-.9, -.86); p.lineTo(.9, -.86); p.quadraticCurveTo(.96, .3, 0, 1); p.quadraticCurveTo(-.96, .3, -.9, -.86); p.closePath(); break;
    case 'hx': reg(6, 1, -Math.PI/2); break;
    case 'oc': reg(8, 1, Math.PI/8); break;
    case 'lo': tpPoli(p, [[0, -1], [.86, 0], [0, 1], [-.86, 0]]); break;
    case 'qd': { const k = .86, c = .26; p.moveTo(-k + c, -k); p.lineTo(k - c, -k); p.quadraticCurveTo(k, -k, k, -k + c); p.lineTo(k, k - c); p.quadraticCurveTo(k, k, k - c, k); p.lineTo(-k + c, k); p.quadraticCurveTo(-k, k, -k, k - c); p.lineTo(-k, -k + c); p.quadraticCurveTo(-k, -k, -k + c, -k); p.closePath(); break; }
    case 'br': p.moveTo(-.86, -.9); p.lineTo(-.5, -.9); p.lineTo(-.4, -.76); p.lineTo(-.18, -.9); p.lineTo(.18, -.9); p.lineTo(.4, -.76); p.lineTo(.5, -.9); p.lineTo(.86, -.9); p.lineTo(.86, 0); p.bezierCurveTo(.86, .5, .45, .8, 0, 1); p.bezierCurveTo(-.45, .8, -.86, .5, -.86, 0); p.closePath(); break;
    case 'fl': tpPoli(p, [[-.78, -.95], [.78, -.95], [.78, .55], [0, 1], [-.78, .55]]); break;
    case 'et': tpPoli(p, Array.from({length:10}, (_, i) => { const a = -Math.PI/2 + i*Math.PI/5, k = i % 2 ? .58 : 1.02; return [Math.cos(a)*k, Math.sin(a)*k + .06]; })); break;
    case 'go': p.moveTo(0, 1); p.bezierCurveTo(-.95, .45, -.9, -.5, 0, -1); p.bezierCurveTo(.9, -.5, .95, .45, 0, 1); p.closePath(); break;
    case 'ca': tpPoli(p, [[-.9, -.6], [-.9, -.95], [-.58, -.95], [-.58, -.78], [-.18, -.78], [-.18, -.95], [.18, -.95], [.18, -.78], [.58, -.78], [.58, -.95], [.9, -.95], [.9, .2], [.55, .78], [0, 1], [-.55, .78], [-.9, .2]]); break;
    case 'as': p.moveTo(0, -.7); p.bezierCurveTo(.3, -.98, .8, -1, 1.02, -.7); p.bezierCurveTo(.95, -.4, .8, -.3, .66, -.2); p.lineTo(.66, .2); p.quadraticCurveTo(.6, .7, 0, 1); p.quadraticCurveTo(-.6, .7, -.66, .2); p.lineTo(-.66, -.2); p.bezierCurveTo(-.8, -.3, -.95, -.4, -1.02, -.7); p.bezierCurveTo(-.8, -1, -.3, -.98, 0, -.7); p.closePath(); break;
    default: tpArc(p, 0, 0, 1); p.closePath();
  }
  return p;
}
const TP_FORMA_CACHE = new Map();
const tpForma = id => { let p = TP_FORMA_CACHE.get(id); if (!p){ p = tpFormaPath(id); TP_FORMA_CACHE.set(id, p); } return p; };

/* ---------------------------------------------------------------- 2) os padrões (o tampo pintado)
   f(g, R, a, b, rnd, base): desenha no espaço do padrão (o tampo tem raio 1); R = até onde precisa cobrir; a, b = as cores 2 e 3; base = a cor 1 */
const TP_ARCO = ['#e8322e', '#f28a1c', '#f7d21e', '#3cb44b', '#2f74d8', '#7a3fc4'];
const tpMod = (v, n) => ((v % n) + n) % n;
const TP_PADROES = [
  {id:'li', nome:'Liso', pr:'gratis', cores:0, f:() => {}},
  {id:'me', nome:'Metade', pr:'gratis', cores:1, f:(g, R, a) => tpRect(g, 0, -R, R, 2*R, a)},
  {id:'ls', nome:'Listras', pr:'gratis', cores:1, f:(g, R, a) => { for (let x = -Math.ceil(R/.8)*.8 - .2; x < R; x += .8) tpRect(g, x, -R, .4, 2*R, a); }},
  {id:'fx', nome:'Faixa', pr:'gratis', cores:1, f:(g, R, a) => tpRect(g, -.32, -R, .64, 2*R, a)},
  {id:'bo', nome:'Bolinhas', pr:'gratis', cores:1, f:(g, R, a) => { const s = .5, n = Math.ceil(R/s) + 1; for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) tpCirc(g, i*s + (j & 1 ? s/2 : 0), j*s*.87, .13, a); }},
  {id:'tc', nome:'Tricolor', pr:'comum', cores:2, f:(g, R, a, b) => { tpRect(g, -R, -R, R - .34, 2*R, a); tpRect(g, .34, -R, R, 2*R, b); }},
  {id:'lf', nome:'Listras finas', pr:'comum', cores:1, f:(g, R, a) => { for (let x = -Math.ceil(R/.36)*.36; x < R; x += .36) tpRect(g, x, -R, .12, 2*R, a); }},
  {id:'f2', nome:'Faixa dupla', pr:'comum', cores:2, f:(g, R, a, b) => { tpRect(g, -.62, -R, .34, 2*R, a); tpRect(g, .28, -R, .34, 2*R, a); tpRect(g, -.12, -R, .24, 2*R, b); }},
  {id:'cz', nome:'Cruz', pr:'comum', cores:1, f:(g, R, a) => { tpRect(g, -.24, -R, .48, 2*R, a); tpRect(g, -R, -.24, 2*R, .48, a); }},
  {id:'xs', nome:'Xis', pr:'comum', cores:1, f:(g, R, a) => { g.save(); g.rotate(Math.PI/4); tpRect(g, -.2, -R*1.5, .4, 3*R, a); tpRect(g, -R*1.5, -.2, 3*R, .4, a); g.restore(); }},
  {id:'qd', nome:'Quartos', pr:'comum', cores:1, f:(g, R, a) => { tpRect(g, 0, -R, R, R, a); tpRect(g, -R, 0, R, R, a); }},
  {id:'xd', nome:'Xadrez', pr:'comum', cores:1, f:(g, R, a) => { const s = .5, n = Math.ceil(R/s) + 1; for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) if ((i + j) & 1) tpRect(g, i*s, j*s, s, s, a); }},
  {id:'xf', nome:'Xadrez fino', pr:'raro', cores:1, f:(g, R, a) => { const s = .25, n = Math.ceil(R/s) + 1; for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) if ((i + j) & 1) tpRect(g, i*s, j*s, s, s, a); }},
  {id:'lo', nome:'Losangos', pr:'raro', cores:2, f:(g, R, a, b) => { const w = .5, h = .7, n = Math.ceil(R/w) + 2; for (let i = -n; i < n; i++) for (let j = -n; j < n; j++){ g.fillStyle = (i + j) & 1 ? a : b; g.beginPath(); const x = i*w, y = j*h + (i & 1 ? h/2 : 0); g.moveTo(x, y - h/2); g.lineTo(x + w/2, y); g.lineTo(x, y + h/2); g.lineTo(x - w/2, y); g.closePath(); g.fill(); } }},
  {id:'bg', nome:'Bolonas', pr:'comum', cores:2, f:(g, R, a, b) => { tpCirc(g, -.42, -.36, .34, a); tpCirc(g, .44, -.12, .26, b); tpCirc(g, -.1, .5, .3, b); tpCirc(g, .5, .62, .16, a); tpCirc(g, -.68, .3, .14, a); }},
  {id:'an', nome:'Anéis', pr:'comum', cores:1, f:(g, R, a) => { g.strokeStyle = a; g.lineWidth = .14; for (let r = .2; r < R*1.45; r += .3){ g.beginPath(); g.arc(0, 0, r, 0, TP_TAU); g.stroke(); } }},
  {id:'av', nome:'Alvo', pr:'raro', cores:2, f:(g, R, a, b) => { for (let k = 0, r = Math.ceil(R*1.45/.22)*.22; r > 0; r -= .22, k++) tpCirc(g, 0, 0, r, k & 1 ? a : b); }},
  {id:'ra', nome:'Raios', pr:'comum', cores:1, f:(g, R, a) => { g.fillStyle = a; for (let i = 0; i < 12; i += 2){ const a0 = i/12*TP_TAU, a1 = (i + 1)/12*TP_TAU; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R*1.5, a0, a1); g.closePath(); g.fill(); } }},
  {id:'rf', nome:'Raios finos', pr:'raro', cores:2, f:(g, R, a, b) => { for (let i = 0; i < 24; i++){ if (i % 4 === 3) continue; g.fillStyle = i & 1 ? a : b; const a0 = i/24*TP_TAU, a1 = (i + 1)/24*TP_TAU; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R*1.5, a0, a1); g.closePath(); g.fill(); } }},
  {id:'sp', nome:'Espiral', pr:'raro', cores:1, f:(g, R, a) => { g.strokeStyle = a; g.lineWidth = .16; g.lineCap = 'round'; g.beginPath(); for (let t = 0; t < 60; t += .05){ const r = t*.045; if (r > R*1.45) break; const x = Math.cos(t)*r, y = Math.sin(t)*r; t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }},
  {id:'cv', nome:'Chevron', pr:'comum', cores:1, f:(g, R, a) => { g.fillStyle = a; g.beginPath(); g.moveTo(-R, -.7); g.lineTo(0, .05); g.lineTo(R, -.7); g.lineTo(R, -.2); g.lineTo(0, .55); g.lineTo(-R, -.2); g.closePath(); g.fill(); }},
  {id:'cs', nome:'Chevrons', pr:'raro', cores:2, f:(g, R, a, b) => { const n = Math.ceil(R/.55) + 1; for (let k = -n; k <= n; k++){ const y = k*.55; g.fillStyle = k & 1 ? a : b; g.beginPath(); g.moveTo(-R, y - .3); g.lineTo(0, y + .05); g.lineTo(R, y - .3); g.lineTo(R, y - .08); g.lineTo(0, y + .27); g.lineTo(-R, y - .08); g.closePath(); g.fill(); } }},
  {id:'zz', nome:'Zigue-zague', pr:'raro', cores:1, f:(g, R, a) => { g.strokeStyle = a; g.lineWidth = .16; g.lineJoin = 'miter'; for (let y = -Math.ceil(R/.5)*.5; y < R + .5; y += .5){ g.beginPath(); for (let x = -R - .25, k = 0; x < R + .5; x += .25, k++) k ? g.lineTo(x, y + (k & 1 ? .16 : -.16)) : g.moveTo(x, y); g.stroke(); } }},
  {id:'on', nome:'Ondas', pr:'comum', cores:1, f:(g, R, a) => { g.strokeStyle = a; g.lineWidth = .15; g.lineCap = 'round'; for (let y = -Math.ceil(R/.42)*.42; y < R + .42; y += .42){ g.beginPath(); for (let x = -R, k = 0; x <= R + .05; x += .05, k++){ const yy = y + Math.sin(x*5)*.1; k ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); } }},
  {id:'tr', nome:'Triângulos', pr:'raro', cores:2, f:(g, R, a, b) => { const s = .5, h = s*.87, n = Math.ceil(R/s) + 2; for (let j = -n; j < n; j++) for (let i = -2*n; i < 2*n; i++){ const k = tpMod(i + 2*j, 3); if (k === 2) continue; const x = i*s/2, y = j*h; g.fillStyle = k ? b : a; g.beginPath(); if ((i + j) & 1){ g.moveTo(x, y); g.lineTo(x + s/2, y + h); g.lineTo(x - s/2, y + h); } else { g.moveTo(x - s/2, y); g.lineTo(x + s/2, y); g.lineTo(x, y + h); } g.closePath(); g.fill(); } }},
  {id:'hx', nome:'Colmeia', pr:'raro', cores:1, f:(g, R, a) => { const s = .26, w = s*Math.sqrt(3), n = Math.ceil(R/s) + 2; g.strokeStyle = a; g.lineWidth = .07; g.beginPath(); for (let j = -n; j < n; j++) for (let i = -n; i < n; i++){ const x = i*w + (j & 1 ? w/2 : 0), y = j*s*1.5; for (let k = 0; k < 6; k++){ const t = Math.PI/6 + k*Math.PI/3; k ? g.lineTo(x + Math.cos(t)*s, y + Math.sin(t)*s) : g.moveTo(x + Math.cos(t)*s, y + Math.sin(t)*s); } g.closePath(); } g.stroke(); }},
  {id:'bf', nome:'Bola', pr:'comum', cores:1, f:(g, R, a) => { const pent = (x, y, r, a0) => { g.beginPath(); for (let k = 0; k < 5; k++){ const t = a0 + k*TP_TAU/5; k ? g.lineTo(x + Math.cos(t)*r, y + Math.sin(t)*r) : g.moveTo(x + Math.cos(t)*r, y + Math.sin(t)*r); } g.closePath(); g.fill(); };
    g.fillStyle = a; pent(0, 0, .3, -Math.PI/2); for (let k = 0; k < 5; k++){ const t = -Math.PI/2 + Math.PI/5 + k*TP_TAU/5; pent(Math.cos(t)*.82, Math.sin(t)*.82, .26, t + Math.PI); }
    g.strokeStyle = a; g.lineWidth = .05; for (let k = 0; k < 5; k++){ const t = -Math.PI/2 + k*TP_TAU/5, t2 = t + Math.PI/5; g.beginPath(); g.moveTo(Math.cos(t)*.3, Math.sin(t)*.3); g.lineTo(Math.cos(t)*.58, Math.sin(t)*.58); g.lineTo(Math.cos(t2)*.56, Math.sin(t2)*.56); g.stroke(); } }},
  {id:'eg', nome:'Estrelão', pr:'comum', cores:1, f:(g, R, a) => { const p = new Path2D(); tpEstrelaPath(p, 0, .04, .95, 5, .42); g.fillStyle = a; g.fill(p); }},
  {id:'dr', nome:'Degradê', pr:'comum', cores:1, f:(g, R, a, b, rnd, base) => { const gr = g.createLinearGradient(0, -1, 0, 1); gr.addColorStop(0, base); gr.addColorStop(1, a); g.fillStyle = gr; g.fillRect(-R, -R, 2*R, 2*R); }},
  {id:'dc', nome:'Degradê redondo', pr:'raro', cores:1, f:(g, R, a, b, rnd, base) => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, a); gr.addColorStop(1, base); g.fillStyle = gr; g.fillRect(-R, -R, 2*R, 2*R); }},
  {id:'ca', nome:'Camuflado', pr:'raro', cores:2, f:(g, R, a, b, rnd) => { for (let i = 0; i < 30; i++){ const x = (rnd()*2 - 1)*Math.min(R, 1.3), y = (rnd()*2 - 1)*Math.min(R, 1.3), r = .16 + rnd()*.24; g.fillStyle = i & 1 ? a : b; g.beginPath(); for (let k = 0; k < 9; k++){ const t = k/9*TP_TAU, q = r*(.7 + rnd()*.5); k ? g.lineTo(x + Math.cos(t)*q, y + Math.sin(t)*q*.8) : g.moveTo(x + Math.cos(t)*q, y + Math.sin(t)*q*.8); } g.closePath(); g.fill(); } }},
  {id:'px', nome:'Pixel', pr:'raro', cores:2, f:(g, R, a, b, rnd) => { const s = .22, n = Math.ceil(R/s) + 1; for (let i = -n; i < n; i++) for (let j = -n; j < n; j++){ const v = rnd(); if (v < .32) tpRect(g, i*s, j*s, s + .01, s + .01, a); else if (v < .5) tpRect(g, i*s, j*s, s + .01, s + .01, b); } }},
  {id:'rp', nome:'Respingos', pr:'raro', cores:2, f:(g, R, a, b, rnd) => { for (let i = 0; i < 9; i++){ const x = (rnd()*1.6 - .8), y = (rnd()*1.6 - .8), r = .1 + rnd()*.2, c = i % 3 ? a : b; tpCirc(g, x, y, r, c); for (let k = 0; k < 7; k++){ const t = rnd()*TP_TAU, d = r*(1.1 + rnd()*.9); tpCirc(g, x + Math.cos(t)*d, y + Math.sin(t)*d, r*(.12 + rnd()*.22), c); } } }},
  {id:'ec', nome:'Escorrido', pr:'raro', cores:1, f:(g, R, a, b, rnd) => { g.fillStyle = a; g.fillRect(-R, -R, 2*R, R - .45); for (let x = -R; x < R; x += .14 + rnd()*.12){ const w = .07 + rnd()*.08, h = .1 + rnd()*.85; g.fillRect(x, -.46, w, h); tpCirc(g, x + w/2, -.46 + h, w*.62, a); } }},
  {id:'tj', nome:'Tijolos', pr:'comum', cores:1, f:(g, R, a) => { const w = .5, h = .25, n = Math.ceil(R/h) + 1; g.strokeStyle = a; g.lineWidth = .06; g.beginPath(); for (let j = -n; j < n; j++){ const y = j*h; g.moveTo(-R, y); g.lineTo(R, y); for (let x = -Math.ceil(R/w)*w + (j & 1 ? w/2 : 0); x < R; x += w){ g.moveTo(x, y); g.lineTo(x, y + h); } } g.stroke(); }},
  {id:'gr', nome:'Grade', pr:'comum', cores:1, f:(g, R, a) => { g.strokeStyle = a; g.lineWidth = .07; g.beginPath(); for (let v = -Math.ceil(R/.34)*.34; v < R; v += .34){ g.moveTo(v, -R); g.lineTo(v, R); g.moveTo(-R, v); g.lineTo(R, v); } g.stroke(); }},
  {id:'pt', nome:'Pontilhado', pr:'comum', cores:1, f:(g, R, a) => { const s = .2, n = Math.ceil(R/s) + 1; g.fillStyle = a; g.beginPath(); for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++){ g.moveTo(i*s + .045, j*s); g.arc(i*s, j*s, .045, 0, TP_TAU); } g.fill(); }},
  {id:'ai', nome:'Arco-íris', pr:'epico', cores:0, f:(g, R) => { const h = .3, n = Math.ceil(R/h) + 1; for (let j = -n; j < n; j++) tpRect(g, -R, j*h, 2*R, h + .01, TP_ARCO[tpMod(j, 6)]); }},
  {id:'ma', nome:'Mármore', pr:'epico', cores:2, f:(g, R, a, b, rnd) => { g.lineCap = 'round'; for (let k = 0; k < 8; k++){ g.strokeStyle = k & 1 ? a : b; g.lineWidth = .04 + rnd()*.09; g.beginPath(); let x = -R, y = (rnd()*2 - 1)*.9; g.moveTo(x, y); while (x < R){ x += .25; y += (rnd() - .5)*.35; g.quadraticCurveTo(x - .12, y + (rnd() - .5)*.3, x, y); } g.stroke(); } }},
  {id:'fg', nome:'Labaredas', pr:'epico', cores:2, f:(g, R, a, b) => { const lab = (c, alt, fase) => { g.fillStyle = c; g.beginPath(); g.moveTo(-R, R); for (let x = -R; x <= R + .01; x += .2){ const k = Math.round((x + R)/.2) + fase; const yy = 1 - alt*(k % 2 ? .7 : 1.15); g.quadraticCurveTo(x - .12, (yy + 1)/2 + .1, x, yy); g.quadraticCurveTo(x + .08, (yy + 1)/2, x + .2, 1 - alt*.35); } g.lineTo(R, R); g.closePath(); g.fill(); }; lab(a, 1.25, 0); lab(b, .78, 1); }},
  {id:'rl', nome:'Raio', pr:'raro', cores:1, f:(g, R, a) => { g.fillStyle = a; g.beginPath(); g.moveTo(.18, -R); g.lineTo(.42, -R); g.lineTo(.12, -.08); g.lineTo(.42, -.08); g.lineTo(-.24, R); g.lineTo(-.02, .12); g.lineTo(-.34, .12); g.closePath(); g.fill(); }},
  {id:'ml', nome:'Eclipse', pr:'raro', cores:1, f:(g, R, a) => { g.fillStyle = a; g.beginPath(); g.arc(0, 0, R*1.5, 0, TP_TAU); g.moveTo(.38 + .86, -.18); g.arc(.38, -.18, .86, 0, TP_TAU, true); g.fill('evenodd'); }},
  {id:'es', nome:'Escamas', pr:'epico', cores:1, f:(g, R, a) => { const s = .32, n = Math.ceil(R/s) + 2; g.strokeStyle = a; g.lineWidth = .06; for (let j = -2*n; j < 2*n; j++) for (let i = -n; i < n; i++){ const x = i*s + (j & 1 ? s/2 : 0), y = j*s*.55; g.beginPath(); g.arc(x, y, s/2, 0, Math.PI); g.stroke(); } }},
  {id:'ta', nome:'Xadrez escocês', pr:'epico', cores:2, f:(g, R, a, b) => { g.globalAlpha = .55; for (let v = -Math.ceil(R/.6)*.6; v < R; v += .6){ tpRect(g, v, -R, .22, 2*R, a); tpRect(g, -R, v, 2*R, .22, a); } g.globalAlpha = .8; for (let v = -Math.ceil(R/.6)*.6 + .36; v < R; v += .6){ tpRect(g, v, -R, .05, 2*R, b); tpRect(g, -R, v, 2*R, .05, b); } g.globalAlpha = 1; }},
  {id:'gx', nome:'Galáxia', pr:'lendario', cores:2, f:(g, R, a, b, rnd) => { const gr = g.createRadialGradient(-.2, -.2, 0, 0, 0, 1.2); gr.addColorStop(0, b); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(-R, -R, 2*R, 2*R); for (let i = 0; i < 60; i++){ const x = (rnd()*2 - 1)*Math.min(R, 1.4), y = (rnd()*2 - 1)*Math.min(R, 1.4); tpCirc(g, x, y, .01 + rnd()*.03, a); } const p = new Path2D(); tpEstrelaPath(p, .4, -.35, .13, 4, .3); g.fillStyle = a; g.fill(p); }},
  {id:'ze', nome:'Zebra', pr:'epico', cores:1, f:(g, R, a, b, rnd) => { g.fillStyle = a; for (let x = -R; x < R; x += .3){ g.beginPath(); g.moveTo(x, -R); for (let y = -R; y <= R + .01; y += .2) g.lineTo(x + Math.sin(y*3 + x*2)*.12 + (rnd() - .5)*.04, y); for (let y = R; y >= -R - .01; y -= .2) g.lineTo(x + .1 + Math.sin(y*3 + x*2)*.12 + (rnd() - .5)*.05, y); g.closePath(); g.fill(); } }},
  {id:'oc', nome:'Onça', pr:'lendario', cores:2, f:(g, R, a, b, rnd) => { for (let i = 0; i < 24; i++){ const x = (rnd()*2 - 1)*Math.min(R, 1.3), y = (rnd()*2 - 1)*Math.min(R, 1.3), r = .1 + rnd()*.1; tpCirc(g, x, y, r*.8, b); g.strokeStyle = a; g.lineWidth = r*.45; g.lineCap = 'round'; g.beginPath(); const a0 = rnd()*TP_TAU; g.arc(x, y, r, a0, a0 + 3.6 + rnd()); g.stroke(); } }},
  {id:'pi', nome:'Pipas', pr:'raro', cores:2, f:(g, R, a, b) => { const n = Math.ceil(R/.6) + 1; for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++){ const x = i*.6 + (j & 1 ? .3 : 0), y = j*.62; g.fillStyle = (i + j) & 1 ? a : b; g.beginPath(); g.moveTo(x, y - .2); g.lineTo(x + .14, y); g.lineTo(x, y + .22); g.lineTo(x - .14, y); g.closePath(); g.fill(); } }}
];

/* ---------------------------------------------------------------- 3) os ícones (todos desenhados aqui, em -1..1; nenhuma marca)
   p() = o caminho (preenchido na cor 1) · detalhe(g, b) = o que vai por cima na cor 2 (recortado no caminho; solto: sem recorte)
   desenha(g, a, b) + contorno() = os de várias partes · linha = os de traço · furo = caminho com buracos (evenodd) */
const TP_ICONES = [
  {id:'--', nome:'Nenhum', pr:'gratis', cores:0},
  {id:'tx', nome:'Texto', pr:'gratis', cores:1, texto:true},
  {id:'es', nome:'Estrela', pr:'gratis', cores:1, p:() => tpP(p => tpEstrelaPath(p, 0, .06, 1, 5, .42))},
  {id:'bo', nome:'Bola', pr:'gratis', cores:2, contorno:() => tpP(p => tpArc(p, 0, 0, .96)), desenha:(g, a, b) => {
    tpCirc(g, 0, 0, .96, a); g.fillStyle = b;
    const pent = (x, y, r, a0) => { g.beginPath(); for (let k = 0; k < 5; k++){ const t = a0 + k*TP_TAU/5; k ? g.lineTo(x + Math.cos(t)*r, y + Math.sin(t)*r) : g.moveTo(x + Math.cos(t)*r, y + Math.sin(t)*r); } g.closePath(); g.fill(); };
    g.save(); g.beginPath(); g.arc(0, 0, .96, 0, TP_TAU); g.clip(); pent(0, 0, .3, -Math.PI/2);
    for (let k = 0; k < 5; k++){ const t = -Math.PI/2 + Math.PI/5 + k*TP_TAU/5; pent(Math.cos(t)*.86, Math.sin(t)*.86, .27, t + Math.PI); }
    g.strokeStyle = b; g.lineWidth = .06; for (let k = 0; k < 5; k++){ const t = -Math.PI/2 + k*TP_TAU/5; g.beginPath(); g.moveTo(Math.cos(t)*.3, Math.sin(t)*.3); g.lineTo(Math.cos(t)*.62, Math.sin(t)*.62); g.stroke(); }
    g.restore(); }},
  {id:'ra', nome:'Raio', pr:'gratis', cores:1, p:() => tpP(p => tpPoli(p, [[.3, -1], [-.55, .12], [-.02, .12], [-.3, 1], [.55, -.15], [.02, -.15]]))},
  {id:'ca', nome:'Coração', pr:'gratis', cores:1, p:() => tpP(p => { p.moveTo(0, .95); p.bezierCurveTo(-1.35, .05, -.85, -.95, 0, -.38); p.bezierCurveTo(.85, -.95, 1.35, .05, 0, .95); p.closePath(); })},
  {id:'sx', nome:'Seta', pr:'gratis', cores:1, p:() => tpP(p => tpPoli(p, [[-.9, -.25], [.15, -.25], [.15, -.7], [.95, 0], [.15, .7], [.15, .25], [-.9, .25]]))},
  {id:'tf', nome:'Troféu', pr:'gratis', cores:1, furo:true, p:() => tpSvg('M-52 -88 L 52 -88 L 52 -66 L 88 -66 L 88 -40 C 88 -12 70 6 44 10 C 36 26 22 36 10 40 L 10 62 L 40 62 L 40 92 L -40 92 L -40 62 L -10 62 L -10 40 C -22 36 -36 26 -44 10 C -70 6 -88 -12 -88 -40 L -88 -66 L -52 -66 Z M -70 -48 L -70 -40 C -70 -24 -60 -14 -48 -10 C -50 -20 -52 -32 -52 -48 Z M 70 -48 L 52 -48 C 52 -32 50 -20 48 -10 C 60 -14 70 -24 70 -40 Z')},
  {id:'ap', nome:'Apito', pr:'gratis', cores:1, furo:true, p:() => tpSvg('M-90 -20 L 15 -20 L 80 -55 L 95 -25 L 52 -2 C 60 10 64 22 64 35 C 64 72 34 95 -2 95 C -40 95 -70 66 -70 30 C -70 12 -62 -2 -50 -10 L -90 -10 Z M 22 35 A 24 24 0 1 0 -26 35 A 24 24 0 1 0 22 35 Z')},
  {id:'pi', nome:'Pipa', pr:'gratis', cores:2, p:() => tpP(p => tpPoli(p, [[0, -.98], [.62, -.22], [0, .5], [-.62, -.22]])), solto:true,
    detalhe:(g, b) => { g.strokeStyle = b; g.lineWidth = .06; g.beginPath(); g.moveTo(0, -.98); g.lineTo(0, .5); g.moveTo(-.62, -.22); g.lineTo(.62, -.22); g.stroke(); g.lineWidth = .05; g.beginPath(); g.moveTo(0, .5); g.bezierCurveTo(.2, .65, -.2, .78, .05, .98); g.stroke(); g.fillStyle = b; for (const [x, y] of [[.08, .62], [-.08, .76], [.06, .9]]){ g.beginPath(); g.moveTo(x - .08, y); g.lineTo(x + .08, y - .05); g.lineTo(x + .08, y + .05); g.closePath(); g.fill(); } }},
  {id:'cs', nome:'Casa', pr:'gratis', cores:2, p:() => tpP(p => tpPoli(p, [[0, -.92], [.92, -.08], [.66, -.08], [.66, .9], [-.66, .9], [-.66, -.08], [-.92, -.08]])), detalhe:(g, b) => { g.fillStyle = b; g.fillRect(-.2, .3, .4, .6); g.fillRect(.28, -.05, .22, .22); g.fillRect(-.5, -.05, .22, .22); }},
  {id:'sm', nome:'Sorriso', pr:'gratis', cores:2, contorno:() => tpP(p => tpArc(p, 0, 0, .95)), desenha:(g, a, b) => { tpCirc(g, 0, 0, .95, a); g.fillStyle = b; g.beginPath(); g.ellipse(-.32, -.25, .11, .18, 0, 0, TP_TAU); g.fill(); g.beginPath(); g.ellipse(.32, -.25, .11, .18, 0, 0, TP_TAU); g.fill(); g.strokeStyle = b; g.lineWidth = .12; g.lineCap = 'round'; g.beginPath(); g.arc(0, .05, .55, .35, Math.PI - .35); g.stroke(); }},
  {id:'co', nome:'Coroa', pr:'comum', cores:2, p:() => tpP(p => tpPoli(p, [[-1, .62], [-1, -.5], [-.5, .06], [0, -.82], [.5, .06], [1, -.5], [1, .62]])),
    detalhe:(g, b) => { tpCirc(g, 0, .3, .13, b); tpCirc(g, -.55, .36, .1, b); tpCirc(g, .55, .36, .1, b); }},
  {id:'di', nome:'Diamante', pr:'comum', cores:2, p:() => tpP(p => tpPoli(p, [[-.55, -.62], [.55, -.62], [.95, -.18], [0, .95], [-.95, -.18]])),
    detalhe:(g, b) => { g.strokeStyle = b; g.lineWidth = .07; g.beginPath(); g.moveTo(-.95, -.18); g.lineTo(.95, -.18); g.moveTo(-.3, -.62); g.lineTo(-.48, -.18); g.lineTo(0, .95); g.lineTo(.48, -.18); g.lineTo(.3, -.62); g.stroke(); }},
  {id:'so', nome:'Sol', pr:'comum', cores:1, p:() => tpP(p => { tpArc(p, 0, 0, .48); for (let i = 0; i < 10; i++){ const a = i*TP_TAU/10; tpPoli(p, [[Math.cos(a - .15)*.62, Math.sin(a - .15)*.62], [Math.cos(a), Math.sin(a)], [Math.cos(a + .15)*.62, Math.sin(a + .15)*.62]]); } })},
  {id:'lu', nome:'Lua', pr:'comum', cores:1, p:() => tpP(p => { p.arc(0, 0, .95, -1.05, 1.05, true); p.arc(.52, 0, .82, 1.6, 4.68, false); p.closePath(); })},
  {id:'fl', nome:'Chama', pr:'comum', cores:2, p:() => tpSvg('M0 -100 C 20 -60 70 -40 70 10 C 70 60 40 95 0 95 C -40 95 -70 60 -70 15 C -70 -20 -45 -35 -35 -70 C -20 -45 -10 -40 0 -100 Z'),
    detalhe:(g, b) => { g.fillStyle = b; g.fill(tpSvg('M0 -20 C 15 5 40 20 38 50 C 36 75 18 88 0 88 C -18 88 -36 75 -36 52 C -36 30 -18 18 0 -20 Z')); }},
  {id:'go', nome:'Gota', pr:'comum', cores:1, p:() => tpSvg('M0 -100 C 30 -50 70 -10 70 35 C 70 75 38 98 0 98 C -38 98 -70 75 -70 35 C -70 -10 -30 -50 0 -100 Z')},
  {id:'fo', nome:'Folha', pr:'comum', cores:2, p:() => tpSvg('M-75 80 C -90 -10 -30 -85 85 -90 C 90 15 30 90 -75 80 Z'), detalhe:(g, b) => { g.strokeStyle = b; g.lineWidth = .07; g.beginPath(); g.moveTo(-.75, .8); g.quadraticCurveTo(0, .1, .8, -.82); g.stroke(); }},
  {id:'fr', nome:'Flor', pr:'raro', cores:2, p:() => tpP(p => { for (let k = 0; k < 5; k++){ const a = -Math.PI/2 + k*TP_TAU/5; tpArc(p, Math.cos(a)*.56, Math.sin(a)*.56, .42); } }), detalhe:(g, b) => tpCirc(g, 0, 0, .3, b)},
  {id:'nt', nome:'Nota', pr:'comum', cores:1, p:() => tpSvg('M-10 -90 L 75 -100 L 75 40 C 75 62 55 75 35 75 C 15 75 5 62 5 50 C 5 32 22 22 40 22 C 46 22 52 24 55 26 L 55 -62 L 10 -56 L 10 60 C 10 82 -10 95 -30 95 C -50 95 -60 82 -60 70 C -60 52 -43 42 -25 42 C -19 42 -13 44 -10 46 Z')},
  {id:'cv', nome:'Caveira', pr:'raro', cores:2, p:() => tpSvg('M0 -95 C 55 -95 85 -55 85 -10 C 85 20 70 40 52 50 L 52 80 C 52 90 44 96 34 96 L -34 96 C -44 96 -52 90 -52 80 L -52 50 C -70 40 -85 20 -85 -10 C -85 -55 -55 -95 0 -95 Z'),
    detalhe:(g, b) => { g.fillStyle = b; g.beginPath(); g.ellipse(-.34, -.06, .22, .26, 0, 0, TP_TAU); g.fill(); g.beginPath(); g.ellipse(.34, -.06, .22, .26, 0, 0, TP_TAU); g.fill(); g.beginPath(); g.moveTo(0, .22); g.lineTo(.1, .4); g.lineTo(-.1, .4); g.closePath(); g.fill(); g.fillRect(-.3, .66, .1, .3); g.fillRect(-.05, .66, .1, .3); g.fillRect(.2, .66, .1, .3); }},
  {id:'al', nome:'Alvo', pr:'comum', cores:2, contorno:() => tpP(p => tpArc(p, 0, 0, .95)), desenha:(g, a, b) => { for (let k = 0; k < 4; k++) tpCirc(g, 0, 0, .95 - k*.24, k & 1 ? b : a); }},
  {id:'an', nome:'Âncora', pr:'raro', cores:1, furo:true, p:() => tpSvg('M-8 -62 A 20 20 0 1 1 8 -62 L 8 -42 L 38 -42 L 38 -26 L 8 -26 L 8 70 C 35 66 55 50 62 25 L 48 25 L 75 -5 L 92 30 L 78 30 C 70 65 40 92 0 92 C -40 92 -70 65 -78 30 L -92 30 L -75 -5 L -48 25 L -62 25 C -55 50 -35 66 -8 70 L -8 -26 L -38 -26 L -38 -42 L -8 -42 Z M 9 -80 A 9 9 0 1 0 -9 -80 A 9 9 0 1 0 9 -80 Z')},
  {id:'as', nome:'Asa', pr:'raro', cores:1, p:() => tpSvg('M-90 30 C -60 -40 0 -85 92 -90 C 70 -70 60 -55 52 -40 C 75 -42 85 -40 95 -35 C 70 -20 55 -10 45 0 C 65 0 78 4 88 10 C 60 25 30 38 -5 45 C 20 48 35 55 45 62 C 0 75 -50 70 -90 30 Z')},
  {id:'ol', nome:'Olho', pr:'raro', cores:2, p:() => tpSvg('M-100 0 C -60 -60 60 -60 100 0 C 60 60 -60 60 -100 0 Z'), detalhe:(g, b) => { tpCirc(g, 0, 0, .38, b); tpCirc(g, .12, -.12, .1, '#ffffff'); }},
  {id:'in', nome:'Infinito', pr:'comum', cores:1, linha:.2, p:() => tpP(p => { p.moveTo(0, 0); p.bezierCurveTo(.3, -.55, .95, -.55, .95, 0); p.bezierCurveTo(.95, .55, .3, .55, 0, 0); p.bezierCurveTo(-.3, -.55, -.95, -.55, -.95, 0); p.bezierCurveTo(-.95, .55, -.3, .55, 0, 0); })},
  {id:'ck', nome:'Certo', pr:'comum', cores:1, p:() => tpP(p => tpPoli(p, [[-.95, .05], [-.6, -.3], [-.25, .05], [.6, -.8], [.95, -.45], [-.25, .75]]))},
  {id:'hs', nome:'Hashtag', pr:'comum', cores:1, p:() => tpP(p => { const b = (x0, y0, x1, y1) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), nx = -dy/l*.12, ny = dx/l*.12; tpPoli(p, [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]); }; b(-.25, -.95, -.45, .95); b(.4, -.95, .2, .95); b(-.9, -.3, .9, -.3); b(-.95, .32, .85, .32); })},
  {id:'pz', nome:'Paz', pr:'raro', cores:1, linha:.16, p:() => tpP(p => { tpArc(p, 0, 0, .82); p.moveTo(0, -.82); p.lineTo(0, .82); p.moveTo(0, 0); p.lineTo(-.58, .58); p.moveTo(0, 0); p.lineTo(.58, .58); })},
  {id:'yy', nome:'Equilíbrio', pr:'raro', cores:2, contorno:() => tpP(p => tpArc(p, 0, 0, .95)), desenha:(g, a, b) => { tpCirc(g, 0, 0, .95, b); g.fillStyle = a; g.beginPath(); g.arc(0, 0, .95, -Math.PI/2, Math.PI/2); g.arc(0, .475, .475, Math.PI/2, -Math.PI/2, true); g.arc(0, -.475, .475, Math.PI/2, -Math.PI/2); g.closePath(); g.fill(); tpCirc(g, 0, -.475, .14, b); tpCirc(g, 0, .475, .14, a); }},
  {id:'ns', nome:'Espadas', pr:'comum', cores:1, p:() => tpSvg('M0 -98 C 30 -55 95 -30 95 15 C 95 50 60 65 30 50 C 22 46 14 40 8 34 C 12 60 22 80 40 95 L -40 95 C -22 80 -12 60 -8 34 C -14 40 -22 46 -30 50 C -60 65 -95 50 -95 15 C -95 -30 -30 -55 0 -98 Z')},
  {id:'tv', nome:'Trevo', pr:'raro', cores:1, p:() => tpP(p => { for (let k = 0; k < 4; k++){ const a = k*Math.PI/2 + Math.PI/4; tpArc(p, Math.cos(a)*.42, Math.sin(a)*.42 - .08, .4); } p.rect(-.06, .3, .12, .65); })},
  {id:'cf', nome:'Floco', pr:'raro', cores:1, linha:.13, p:() => tpP(p => { for (let k = 0; k < 6; k++){ const a = k*Math.PI/3, c = Math.cos(a), s = Math.sin(a); p.moveTo(0, 0); p.lineTo(c*.95, s*.95); for (const d of [.45, .7]){ const x = c*d, y = s*d; p.moveTo(x, y); p.lineTo(x + Math.cos(a + .7)*.22, y + Math.sin(a + .7)*.22); p.moveTo(x, y); p.lineTo(x + Math.cos(a - .7)*.22, y + Math.sin(a - .7)*.22); } } })},
  {id:'md', nome:'Medalha', pr:'comum', cores:2, p:() => tpP(p => { tpArc(p, 0, .28, .62); tpPoli(p, [[-.55, -1], [-.22, -1], [.08, -.3], [-.25, -.25]]); tpPoli(p, [[.55, -1], [.22, -1], [-.08, -.3], [.25, -.25]]); }),
    detalhe:(g, b) => { const p = new Path2D(); tpEstrelaPath(p, 0, .3, .34, 5, .45); g.fillStyle = b; g.fill(p); }},
  {id:'cu', nome:'Chuteira', pr:'comum', cores:2, p:() => tpSvg('M-95 10 C -95 -15 -80 -30 -60 -32 L -25 -36 L 0 -70 L 40 -70 L 45 -30 C 65 -22 85 -10 95 10 C 98 20 95 30 85 32 L -85 32 C -92 30 -95 22 -95 10 Z'), solto:true,
    detalhe:(g, b) => { g.fillStyle = b; for (const x of [-.7, -.4, -.1, .25, .55]) g.fillRect(x, .32, .12, .16); g.strokeStyle = b; g.lineWidth = .06; g.beginPath(); g.moveTo(-.1, -.5); g.lineTo(.3, -.5); g.moveTo(-.18, -.35); g.lineTo(.3, -.35); g.stroke(); }},
  {id:'lv', nome:'Luva', pr:'raro', cores:2, p:() => tpSvg('M-55 95 L -55 10 L -85 -25 C -95 -38 -80 -52 -66 -42 L -45 -22 L -45 -78 C -45 -95 -22 -95 -22 -78 L -22 -40 L -22 -90 C -22 -105 2 -105 2 -90 L 2 -40 L 2 -84 C 2 -99 26 -99 26 -84 L 26 -38 L 26 -72 C 26 -86 50 -86 50 -72 L 50 20 C 50 45 40 60 30 70 L 30 95 Z'),
    detalhe:(g, b) => { g.fillStyle = b; g.fillRect(-.55, .62, .85, .33); }},
  {id:'cm', nome:'Camisa', pr:'comum', cores:2, p:() => tpSvg('M-35 -88 C -25 -70 25 -70 35 -88 L 95 -55 L 75 -10 L 52 -22 L 52 92 L -52 92 L -52 -22 L -75 -10 L -95 -55 Z'),
    detalhe:(g, b) => { g.fillStyle = b; g.fillRect(-.52, -.05, 1.04, .2); }},
  {id:'gl', nome:'Gol', pr:'comum', cores:2, desenha:(g, a, b) => { g.strokeStyle = b; g.lineWidth = .04; g.beginPath(); for (let x = -.78; x <= .8; x += .2){ g.moveTo(x, -.58); g.lineTo(x, .62); } for (let y = -.5; y <= .62; y += .2){ g.moveTo(-.85, y); g.lineTo(.85, y); } g.stroke();
    g.strokeStyle = a; g.lineWidth = .16; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-.92, .72); g.lineTo(-.92, -.66); g.lineTo(.92, -.66); g.lineTo(.92, .72); g.stroke(); }},
  {id:'bd', nome:'Bandeirinha', pr:'comum', cores:2, p:() => tpP(p => { p.rect(-.62, -.95, .12, 1.9); tpPoli(p, [[-.5, -.95], [.85, -.6], [-.5, -.22]]); }), detalhe:(g, b) => { g.fillStyle = b; g.beginPath(); g.moveTo(-.5, -.6); g.lineTo(.4, -.6); g.lineTo(-.5, -.4); g.closePath(); g.fill(); }},
  {id:'bn', nome:'Boné', pr:'comum', cores:2, p:() => tpSvg('M-80 20 C -80 -45 -40 -70 5 -70 C 50 -70 80 -45 80 10 L 80 20 Z M 60 20 L 100 20 C 100 34 90 40 75 40 L 30 40 Z'), detalhe:(g, b) => { tpCirc(g, .05, -.7, .08, b); g.strokeStyle = b; g.lineWidth = .05; g.beginPath(); g.moveTo(.05, -.68); g.quadraticCurveTo(-.15, -.2, -.3, .2); g.stroke(); }},
  {id:'sy', nome:'Spray', pr:'raro', cores:2, p:() => tpSvg('M-35 -40 L 35 -40 L 35 95 L -35 95 Z M -18 -62 L 18 -62 L 18 -40 L -18 -40 Z M -8 -80 L 12 -80 L 12 -62 L -8 -62 Z'), solto:true,
    detalhe:(g, b) => { g.fillStyle = b; g.fillRect(-.35, .05, .7, .35); for (const [x, y, r] of [[.38, -.8, .05], [.52, -.72, .04], [.46, -.9, .035], [.6, -.86, .03], [.62, -.62, .03]]) tpCirc(g, x, y, r, b); }},
  {id:'cn', nome:'Cone', pr:'comum', cores:2, p:() => tpP(p => { tpPoli(p, [[-.22, -.9], [.22, -.9], [.6, .66], [-.6, .66]]); p.rect(-.85, .66, 1.7, .26); }), detalhe:(g, b) => { g.fillStyle = b; g.beginPath(); g.moveTo(-.33, -.4); g.lineTo(.33, -.4); g.lineTo(.42, -.06); g.lineTo(-.42, -.06); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-.48, .2); g.lineTo(.48, .2); g.lineTo(.56, .5); g.lineTo(-.56, .5); g.closePath(); g.fill(); }},
  {id:'pd', nome:'Prédios', pr:'raro', cores:2, p:() => tpP(p => { p.rect(-.95, -.3, .5, 1.25); p.rect(-.42, -.85, .55, 1.8); p.rect(.18, -.5, .45, 1.45); p.rect(.66, .05, .3, .9); }), detalhe:(g, b) => { g.fillStyle = b; for (let y = -.7; y < .8; y += .25){ g.fillRect(-.33, y, .12, .12); g.fillRect(-.12, y, .12, .12); } for (let y = -.35; y < .8; y += .25) g.fillRect(.32, y, .14, .12); for (let y = -.15; y < .8; y += .25) g.fillRect(-.8, y, .18, .1); }},
  {id:'lp', nome:'Lâmpada', pr:'comum', cores:2, p:() => tpSvg('M0 -95 C 42 -95 72 -65 72 -25 C 72 5 52 25 40 42 L 40 62 L -40 62 L -40 42 C -52 25 -72 5 -72 -25 C -72 -65 -42 -95 0 -95 Z M -32 70 L 32 70 L 32 82 L -32 82 Z M -22 88 L 22 88 L 14 98 L -14 98 Z'), detalhe:(g, b) => { g.strokeStyle = b; g.lineWidth = .06; g.beginPath(); g.moveTo(-.2, .4); g.lineTo(-.12, -.1); g.lineTo(0, .1); g.lineTo(.12, -.1); g.lineTo(.2, .4); g.stroke(); }},
  {id:'pt', nome:'Pata', pr:'comum', cores:1, p:() => tpP(p => { tpEli(p, 0, .38, .5, .42); for (const [x, y, a] of [[-.66, -.12, -.4], [-.26, -.6, -.12], [.26, -.6, .12], [.66, -.12, .4]]) tpEli(p, x, y, .19, .25, a); })},
  {id:'px', nome:'Peixe', pr:'comum', cores:2, p:() => tpSvg('M-62 0 C -40 -45 20 -58 60 -25 L 95 -55 L 85 0 L 95 55 L 60 25 C 20 58 -40 45 -62 0 Z'), detalhe:(g, b) => { tpCirc(g, -.32, -.08, .09, b); g.strokeStyle = b; g.lineWidth = .05; g.beginPath(); g.arc(-.05, 0, .32, -1, 1); g.stroke(); }},
  {id:'pa', nome:'Pássaro', pr:'comum', cores:1, p:() => tpSvg('M-98 -10 C -70 -40 -35 -40 -8 -8 C 0 -2 0 -2 8 -8 C 35 -40 70 -40 98 -10 C 72 -22 45 -15 22 10 C 12 20 6 30 0 45 C -6 30 -12 20 -22 10 C -45 -15 -72 -22 -98 -10 Z')},
  {id:'bb', nome:'Borboleta', pr:'raro', cores:2, p:() => tpP(p => { tpEli(p, -.45, -.35, .45, .5, -.5); tpEli(p, .45, -.35, .45, .5, .5); tpEli(p, -.35, .42, .32, .38, .5); tpEli(p, .35, .42, .32, .38, -.5); }),
    detalhe:(g, b) => { g.fillStyle = b; g.beginPath(); g.ellipse(0, .05, .1, .62, 0, 0, TP_TAU); g.fill(); tpCirc(g, -.45, -.4, .14, b); tpCirc(g, .45, -.4, .14, b); }},
  {id:'ts', nome:'Tubarão', pr:'raro', cores:2, p:() => tpSvg('M-60 40 C -40 -10 0 -70 55 -95 C 40 -50 38 -5 50 40 Z'), solto:true,
    detalhe:(g, b) => { g.strokeStyle = b; g.lineWidth = .1; g.lineCap = 'round'; for (const [y0, x0, f] of [[.55, -.95, 0], [.8, -.85, 1.5]]){ g.beginPath(); for (let x = x0, k = 0; x <= -x0 + .001; x += .05, k++){ const y = y0 + Math.sin(x*7 + f)*.07; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } }},
  {id:'cb', nome:'Cobra', pr:'raro', cores:2, linha:.24, p:() => tpP(p => { p.moveTo(-.8, .8); p.bezierCurveTo(-.2, .95, .55, .6, .2, .2); p.bezierCurveTo(-.15, -.15, -.6, -.3, -.2, -.62); p.bezierCurveTo(.05, -.8, .4, -.78, .62, -.62); }), detalhe:(g, b) => { tpCirc(g, .64, -.62, .17, b); }},
  {id:'gt', nome:'Gato', pr:'raro', cores:2, p:() => tpSvg('M-80 -95 L -45 -55 C -15 -65 15 -65 45 -55 L 80 -95 L 85 -10 C 90 50 50 90 0 90 C -50 90 -90 50 -85 -10 Z'),
    detalhe:(g, b) => { g.fillStyle = b; g.beginPath(); g.ellipse(-.33, .02, .1, .16, 0, 0, TP_TAU); g.fill(); g.beginPath(); g.ellipse(.33, .02, .1, .16, 0, 0, TP_TAU); g.fill(); g.beginPath(); g.moveTo(-.08, .3); g.lineTo(.08, .3); g.lineTo(0, .4); g.closePath(); g.fill(); g.strokeStyle = b; g.lineWidth = .035; for (const s of [-1, 1]){ g.beginPath(); g.moveTo(s*.2, .42); g.lineTo(s*.75, .3); g.moveTo(s*.2, .48); g.lineTo(s*.75, .52); g.stroke(); } }},
  {id:'fg', nome:'Foguete', pr:'raro', cores:2, p:() => tpSvg('M0 -100 C 35 -70 42 -25 38 25 L 62 50 L 62 80 L 30 62 L -30 62 L -62 80 L -62 50 L -38 25 C -42 -25 -35 -70 0 -100 Z'), solto:true,
    detalhe:(g, b) => { tpCirc(g, 0, -.3, .18, b); g.fillStyle = b; g.beginPath(); g.moveTo(-.2, .66); g.lineTo(.2, .66); g.lineTo(0, 1); g.closePath(); g.fill(); }},
  {id:'pl', nome:'Planeta', pr:'raro', cores:2, contorno:() => tpP(p => tpArc(p, 0, 0, .58)), desenha:(g, a, b) => {
    g.strokeStyle = b; g.lineWidth = .12; g.beginPath(); g.ellipse(0, 0, .98, .3, -.4, Math.PI, TP_TAU); g.stroke();
    tpCirc(g, 0, 0, .58, a);
    g.strokeStyle = b; g.beginPath(); g.ellipse(0, 0, .98, .3, -.4, 0, Math.PI); g.stroke(); }},
  {id:'et', nome:'Alien', pr:'raro', cores:2, p:() => tpSvg('M0 -95 C 55 -95 85 -55 85 -15 C 85 35 35 90 0 95 C -35 90 -85 35 -85 -15 C -85 -55 -55 -95 0 -95 Z'),
    detalhe:(g, b) => { g.fillStyle = b; g.beginPath(); g.ellipse(-.38, -.05, .3, .17, .55, 0, TP_TAU); g.fill(); g.beginPath(); g.ellipse(.38, -.05, .3, .17, -.55, 0, TP_TAU); g.fill(); g.fillRect(-.12, .55, .24, .05); }},
  {id:'rb', nome:'Robô', pr:'raro', cores:2, p:() => tpP(p => { p.rect(-.72, -.55, 1.44, 1.3); p.rect(-.08, -.85, .16, .3); tpArc(p, 0, -.9, .12); p.rect(-.9, -.15, .18, .5); p.rect(.72, -.15, .18, .5); }),
    detalhe:(g, b) => { g.fillStyle = b; g.fillRect(-.48, -.25, .3, .3); g.fillRect(.18, -.25, .3, .3); g.fillRect(-.4, .35, .8, .14); }},
  {id:'fn', nome:'Fantasma', pr:'raro', cores:2, p:() => tpSvg('M-75 95 L -75 -15 C -75 -65 -40 -95 0 -95 C 40 -95 75 -65 75 -15 L 75 95 L 50 72 L 25 95 L 0 72 L -25 95 L -50 72 Z'),
    detalhe:(g, b) => { g.fillStyle = b; g.beginPath(); g.ellipse(-.27, -.2, .12, .18, 0, 0, TP_TAU); g.fill(); g.beginPath(); g.ellipse(.27, -.2, .12, .18, 0, 0, TP_TAU); g.fill(); g.beginPath(); g.ellipse(0, .2, .14, .12, 0, 0, TP_TAU); g.fill(); }},
  {id:'oc', nome:'Óculos escuros', pr:'comum', cores:2, contorno:() => tpP(p => tpArc(p, 0, 0, .95)), desenha:(g, a, b) => { tpCirc(g, 0, 0, .95, a); g.fillStyle = b; g.beginPath(); g.moveTo(-.85, -.3); g.lineTo(.85, -.3); g.lineTo(.8, -.12); g.quadraticCurveTo(.62, .22, .3, .08); g.lineTo(.12, -.12); g.lineTo(-.12, -.12); g.lineTo(-.3, .08); g.quadraticCurveTo(-.62, .22, -.8, -.12); g.closePath(); g.fill(); g.strokeStyle = b; g.lineWidth = .1; g.lineCap = 'round'; g.beginPath(); g.moveTo(-.25, .52); g.quadraticCurveTo(.1, .66, .38, .45); g.stroke(); }},
  {id:'dd', nome:'Dado', pr:'comum', cores:2, p:() => tpP(p => { const k = .82, c = .22; p.moveTo(-k + c, -k); p.lineTo(k - c, -k); p.quadraticCurveTo(k, -k, k, -k + c); p.lineTo(k, k - c); p.quadraticCurveTo(k, k, k - c, k); p.lineTo(-k + c, k); p.quadraticCurveTo(-k, k, -k, k - c); p.lineTo(-k, -k + c); p.quadraticCurveTo(-k, -k, -k + c, -k); p.closePath(); }),
    detalhe:(g, b) => { for (const [x, y] of [[-.42, -.42], [.42, -.42], [0, 0], [-.42, .42], [.42, .42]]) tpCirc(g, x, y, .14, b); }},
  {id:'bm', nome:'Bomba', pr:'raro', cores:2, p:() => tpP(p => { tpArc(p, -.08, .15, .72); p.rect(.25, -.68, .3, .32); }), solto:true, detalhe:(g, b) => { g.strokeStyle = b; g.lineWidth = .07; g.beginPath(); g.moveTo(.4, -.68); g.quadraticCurveTo(.5, -.95, .78, -.9); g.stroke(); const p = new Path2D(); tpEstrelaPath(p, .82, -.9, .16, 5, .4); g.fillStyle = b; g.fill(p); }},
  {id:'b8', nome:'Bola 8', pr:'raro', cores:2, contorno:() => tpP(p => tpArc(p, 0, 0, .95)), desenha:(g, a, b) => { tpCirc(g, 0, 0, .95, a); tpCirc(g, .08, -.08, .42, b); tpTxt(g, '8', .08, -.02, .62, 'fill', a); }},
  {id:'mt', nome:'Montanha', pr:'comum', cores:2, p:() => tpP(p => tpPoli(p, [[-1, .8], [-.35, -.55], [-.08, -.1], [.25, -.75], [1, .8]])), detalhe:(g, b) => { g.fillStyle = b; g.beginPath(); g.moveTo(.25, -.75); g.lineTo(.44, -.35); g.lineTo(.3, -.42); g.lineTo(.2, -.3); g.lineTo(.1, -.42); g.closePath(); g.fill(); }},
  {id:'oa', nome:'Onda', pr:'comum', cores:2, p:() => tpSvg('M-100 95 L -100 20 C -80 -50 -10 -95 50 -80 C 85 -70 98 -40 85 -15 C 70 -40 40 -40 25 -15 C 10 15 40 45 80 30 C 60 70 20 95 -10 95 Z'), detalhe:(g, b) => { g.strokeStyle = b; g.lineWidth = .06; g.beginPath(); g.moveTo(-.7, .7); g.quadraticCurveTo(-.4, -.3, .3, -.62); g.stroke(); }},
  {id:'nv', nome:'Nuvem', pr:'comum', cores:1, p:() => tpP(p => { tpArc(p, -.45, .15, .38); tpArc(p, 0, -.15, .45); tpArc(p, .48, .18, .4); p.rect(-.45, .15, .95, .38); })},
  {id:'re', nome:'Raio duplo', pr:'epico', cores:2, p:() => tpP(p => tpPoli(p, [[-.1, -1], [-.62, .05], [-.32, .05], [-.52, .98], [.08, -.15], [-.22, -.15]])), solto:true,
    detalhe:(g, b) => { g.fillStyle = b; g.beginPath(); g.moveTo(.42, -.7); g.lineTo(.08, .1); g.lineTo(.3, .1); g.lineTo(.18, .8); g.lineTo(.62, -.05); g.lineTo(.4, -.05); g.closePath(); g.fill(); }},
  {id:'cz', nome:'Louros', pr:'epico', cores:1, p:() => tpP(p => { for (const s of [-1, 1]) for (let k = 0; k < 6; k++){ const t = Math.PI*(.62 + k*.11), x = Math.cos(t)*.78*s, y = Math.sin(t)*.78 - .05; tpEli(p, x, y, .1, .2, s*(t - Math.PI/2 + .6)); } })},
  {id:'g2', nome:'Estrela de 6', pr:'comum', cores:1, p:() => tpP(p => tpEstrelaPath(p, 0, 0, 1, 6, .56, -Math.PI/2))},
  {id:'b4', nome:'Brilho', pr:'comum', cores:1, p:() => tpP(p => { p.moveTo(0, -1); p.quadraticCurveTo(.12, -.12, 1, 0); p.quadraticCurveTo(.12, .12, 0, 1); p.quadraticCurveTo(-.12, .12, -1, 0); p.quadraticCurveTo(-.12, -.12, 0, -1); p.closePath(); })},
  {id:'ex', nome:'Xis', pr:'comum', cores:1, p:() => tpP(p => { const b = a => { const c = Math.cos(a), s = Math.sin(a), w = .2; tpPoli(p, [[-c*.95 - s*w, -s*.95 + c*w], [c*.95 - s*w, s*.95 + c*w], [c*.95 + s*w, s*.95 - c*w], [-c*.95 + s*w, -s*.95 - c*w]]); }; b(Math.PI/4); b(-Math.PI/4); })},
  {id:'mo', nome:'Moeda', pr:'epico', cores:2, contorno:() => tpP(p => tpArc(p, 0, 0, .95)), desenha:(g, a, b) => { tpCirc(g, 0, 0, .95, a); g.strokeStyle = b; g.lineWidth = .08; g.beginPath(); g.arc(0, 0, .74, 0, TP_TAU); g.stroke(); tpTxt(g, 'R', 0, .06, 1.02, 'fill', b); }},
  {id:'dg', nome:'Dragão', pr:'lendario', cores:2, p:() => tpSvg('M-95 60 C -70 20 -40 10 -15 20 C -30 -10 -25 -45 5 -70 L 20 -100 L 30 -70 C 55 -72 80 -55 95 -30 C 70 -35 55 -25 50 -10 C 75 -5 90 15 95 40 C 70 25 50 25 35 35 C 30 65 10 85 -20 95 C -10 70 -15 55 -30 45 C -50 45 -75 52 -95 60 Z'),
    detalhe:(g, b) => { tpCirc(g, .22, -.48, .07, b); g.fillStyle = b; g.beginPath(); g.moveTo(-.3, .45); g.lineTo(-.05, .2); g.lineTo(-.02, .45); g.closePath(); g.fill(); }},
  {id:'fx', nome:'Fênix', pr:'lendario', cores:2, p:() => tpSvg('M0 -95 C 10 -70 25 -60 40 -55 C 30 -45 25 -35 25 -25 C 50 -45 75 -50 100 -45 C 75 -25 60 -5 45 15 C 60 15 75 20 85 30 C 60 35 40 40 25 50 C 20 70 10 85 0 98 C -10 85 -20 70 -25 50 C -40 40 -60 35 -85 30 C -75 20 -60 15 -45 15 C -60 -5 -75 -25 -100 -45 C -75 -50 -50 -45 -25 -25 C -25 -35 -30 -45 -40 -55 C -25 -60 -10 -70 0 -95 Z'),
    detalhe:(g, b) => { g.fillStyle = b; g.beginPath(); g.moveTo(0, -.6); g.quadraticCurveTo(.14, -.1, 0, .6); g.quadraticCurveTo(-.14, -.1, 0, -.6); g.fill(); }}
];
const TP_ESTILOS = [['Contorno', 'Borda escura em volta'], ['Relevo', 'Estampado na tampa'], ['Sombra', 'Com sombra embaixo'], ['Adesivo', 'Borda branca de figurinha']];

/* ---------------------------------------------------------------- 4) o desenho (D) e o código curto (T.… / E.…, até 40 letras)
   D = {k:'T' tampinha | 'E' escudo, b: borda (ou forma), bc:[2 cores], p: padrão, pc:[3 cores], pp:[x, y, tamanho, ângulo],
        i: ícone, ic:[2 cores], ip:[x, y, tamanho, ângulo], ie: estilo do ícone (0..3), t: o texto (até 3 letras)}
   x, y, tamanho: 0..100 (50 = no meio / normal) · ângulo: 0..100 = uma volta. No código vão só as cores que o desenho usa
   (7 bits por canal) e a posição só quando sai do normal. */
const TP_PADRAO_D = () => ({k:'T', b:'cl', bc:['#f5c542', '#5b636c'], p:'li', pc:['#f5c542', '#ffffff', '#1d1d1d'], pp:[50, 50, 50, 0], i:'es', ic:['#f8cd5b', '#1d1d1d'], ip:[50, 50, 40, 0], ie:1, t:''});
const TP_ESCUDO_D = () => ({k:'E', b:'es', bc:['#f3efe4', '#171a1c'], p:'me', pc:['#2f6fe0', '#f5c542', '#ffffff'], pp:[50, 50, 50, 0], i:'es', ic:['#ffffff', '#171a1c'], ip:[50, 50, 50, 0], ie:0, t:''});
const TP_MAPA = {b:new Map(TP_BORDAS.map(x => [x.id, x])), f:new Map(TP_FORMAS.map(x => [x.id, x])), p:new Map(TP_PADROES.map(x => [x.id, x])), i:new Map(TP_ICONES.map(x => [x.id, x]))};
const TP_B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const TP_LETRAS = Array.from(' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ÁÉÍÓÚÂÊÔÃÕÇ!?#★♥+-&@$%*=.');
const TP_LETRA_I = new Map(TP_LETRAS.map((c, i) => [c, i]));
const tpTexto = t => Array.from(String(t || '').toUpperCase()).filter(c => c !== ' ' && TP_LETRA_I.has(c)).slice(0, 3).join('');
const tpNormal = a => a[0] === 50 && a[1] === 50 && a[2] === 50 && a[3] === 0;
function tpCoresUsadas(D){                              // as cores que aparecem no desenho, na ordem do código: [campo, índice]
  const L = [], B = D.k === 'E' ? null : TP_MAPA.b.get(D.b), P = TP_MAPA.p.get(D.p), I = TP_MAPA.i.get(D.i);
  const nb = D.k === 'E' ? 2 : (B ? B.cores : 1);
  for (let i = 0; i < nb; i++) L.push(['bc', i]);
  L.push(['pc', 0]); for (let i = 0; i < (P ? P.cores : 0); i++) L.push(['pc', i + 1]);
  const ni = I ? (I.texto ? 1 : I.cores) : 0; for (let i = 0; i < ni; i++) L.push(['ic', i]);
  return L;
}
function tpCodigo(D){                                   // o desenho em texto
  const bits = [], put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push(Math.floor(v/Math.pow(2, i)) & 1); };
  const lista = D.k === 'E' ? TP_FORMAS : TP_BORDAS, I = TP_MAPA.i.get(D.i);
  put(0, 2);                                            // versão do código
  put(Math.max(0, lista.findIndex(x => x.id === D.b)), 5);
  put(Math.max(0, TP_PADROES.findIndex(x => x.id === D.p)), 6);
  put(Math.max(0, TP_ICONES.findIndex(x => x.id === D.i)), 7);
  put(tpLim(D.ie, 0, 3), 2);
  for (const [k, i] of tpCoresUsadas(D)){ const n = parseInt(tpHex(D[k][i], '#000000').slice(1), 16); put(((n >> 17) & 127)*16384 + ((n >> 9) & 127)*128 + ((n >> 1) & 127), 21); }
  const pos = a => { const a2 = a.map(v => tpLim(v, 0, 100)); if (tpNormal(a2)) put(0, 1); else { put(1, 1); for (const v of a2) put(v, 7); } };
  if (D.p !== 'li') pos(D.pp);
  if (D.i !== '--') pos(D.ip);
  if (I && I.texto){ const t = Array.from(tpTexto(D.t)); put(t.length, 2); for (const ch of t) put(TP_LETRA_I.get(ch) || 0, 6); }
  while (bits.length % 6) bits.push(0);
  let s = D.k === 'E' ? 'E.' : 'T.';
  for (let i = 0; i < bits.length; i += 6){ let v = 0; for (let j = 0; j < 6; j++) v = v*2 + bits[i + j]; s += TP_B64[v]; }
  return s;
}
const TP_RE = /^[TE]\.[A-Za-z0-9_-]{4,44}$/;
const tpEhCodigo = s => typeof s === 'string' && TP_RE.test(s);
const TP_LIDOS = new Map();
function tpLe(s){                                       // o código de volta para o desenho (inválido = null)
  if (!tpEhCodigo(s)) return null;
  if (TP_LIDOS.has(s)){ const D = TP_LIDOS.get(s); return D ? tpCopia(D) : null; }
  let D = null;
  try {
    const bits = []; for (const ch of s.slice(2)){ const v = TP_B64.indexOf(ch); for (let j = 5; j >= 0; j--) bits.push((v >> j) & 1); }
    let at = 0; const get = n => { if (at + n > bits.length) throw 0; let v = 0; for (let i = 0; i < n; i++) v = v*2 + bits[at++]; return v; };
    if (get(2) !== 0) throw 0;
    const k = s[0], lista = k === 'E' ? TP_FORMAS : TP_BORDAS, b = lista[get(5)], p = TP_PADROES[get(6)], i = TP_ICONES[get(7)];
    if (!b || !p || !i) throw 0;
    D = k === 'E' ? TP_ESCUDO_D() : TP_PADRAO_D();
    Object.assign(D, {k, b:b.id, p:p.id, i:i.id, ie:get(2)});
    for (const [c, j] of tpCoresUsadas(D)){ const v = get(21), ch = x => ((x << 1) | (x >> 6)).toString(16).padStart(2, '0'); D[c][j] = '#' + ch(v >> 14 & 127) + ch(v >> 7 & 127) + ch(v & 127); }
    const pos = () => get(1) ? [get(7), get(7), get(7), get(7)].map(v => Math.min(100, v)) : [50, 50, 50, 0];
    D.pp = p.id !== 'li' ? pos() : [50, 50, 50, 0];
    D.ip = i.id !== '--' ? pos() : [50, 50, 50, 0];
    D.t = '';
    if (i.texto){ const n = get(2); let t = ''; for (let j = 0; j < n; j++) t += TP_LETRAS[get(6)] || ''; D.t = tpTexto(t); }
  } catch (_) { D = null; }
  if (TP_LIDOS.size > 400) TP_LIDOS.clear();
  TP_LIDOS.set(s, D ? tpCopia(D) : null);
  return D;
}
function tpCopia(D){ return {k:D.k, b:D.b, bc:D.bc.slice(), p:D.p, pc:D.pc.slice(), pp:D.pp.slice(), i:D.i, ic:D.ic.slice(), ip:D.ip.slice(), ie:D.ie | 0, t:D.t || ''}; }
const tpNorm = D => tpLe(tpCodigo(D)) || tpCopia(D);    // o desenho como ele fica depois de salvo (as cores em 7 bits)

/* ---------------------------------------------------------------- 5) o desenho na tela */
function tpTransf(g, cx, cy, unid, anda, prm, base){    // posição (50 = meio), tamanho (50 = normal) e ângulo (0..100 = uma volta)
  const ox = (prm[0] - 50)/50*anda, oy = (prm[1] - 50)/50*anda, f = Math.pow(2, (prm[2] - 50)/base);
  g.translate(cx + ox, cy + oy); g.rotate(prm[3]/100*TP_TAU); g.scale(unid*f, unid*f);
  return (anda + Math.hypot(ox, oy))/(unid*f) + .06;    // até onde o padrão precisa cobrir, em unidades dele
}
function tpPintaTampo(g, cx, cy, rt, D, semente){        // o fundo + o padrão + o ícone (quem chama já recortou a área)
  g.fillStyle = D.pc[0]; g.fillRect(cx - rt*1.1, cy - rt*1.1, rt*2.2, rt*2.2);
  const P = TP_MAPA.p.get(D.p);
  if (P && P.id !== 'li'){
    g.save(); const R = tpTransf(g, cx, cy, rt, rt, D.pp, 25);
    try { P.f(g, R, D.pc[1], D.pc[2], rndFixo(semente || 7), D.pc[0]); } catch (e) { console.error('padrão', P.id, e); }
    g.restore();
  }
  tpPintaIcone(g, cx, cy, rt, D);
}
const TP_ICO_CACHE = new Map();
function tpIcoPath(I){ let p = TP_ICO_CACHE.get(I.id); if (p === undefined){ p = I.p ? I.p() : I.contorno ? I.contorno() : null; TP_ICO_CACHE.set(I.id, p); } return p; }
function tpPintaIcone(g, cx, cy, rt, D){
  const I = TP_MAPA.i.get(D.i); if (!I || I.id === '--') return;
  g.save(); tpTransf(g, cx, cy, rt*.64, rt*.8, D.ip, 40);
  const a = D.ic[0], b = D.ic[1], est = D.ie | 0, esc = 'rgba(14,8,26,.92)';
  const t = I.texto ? (tpTexto(D.t) || 'R') : '', nt = Array.from(t).length, tsz = nt <= 1 ? 1.5 : nt === 2 ? 1.1 : .8;
  const p = I.texto ? null : tpIcoPath(I), regra = I.furo ? 'evenodd' : 'nonzero';
  // a silhueta: preenche (fill) ou contorna (traço de largura w), deslocada de (dx, dy)
  const sil = (modo, cor, w, dx, dy) => {
    if (!I.texto && !p) return;
    g.save(); if (dx || dy) g.translate(dx, dy);
    if (I.texto) tpTxt(g, t, 0, .06, tsz, modo === 'fill' ? 'fill' : 'traco', cor, w);
    else if (I.linha){ g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = cor; g.lineWidth = I.linha + (modo === 'fill' ? 0 : w); g.stroke(p); }
    else if (modo === 'fill'){ g.fillStyle = cor; g.fill(p, regra); }
    else { g.lineJoin = 'round'; g.strokeStyle = cor; g.lineWidth = w; g.stroke(p); }
    g.restore();
  };
  if (est === 1){ sil('fill', 'rgba(0,0,0,.3)', 0, .05, .08); sil('fill', 'rgba(255,255,255,.55)', 0, -.05, -.05); }
  else if (est === 2){ sil('fill', 'rgba(0,0,0,.45)', 0, .08, .12); sil('traco', esc, .08); }
  else if (est === 3){ sil('traco', 'rgba(0,0,0,.32)', .3, .03, .07); sil('traco', '#ffffff', .28); }
  else sil('traco', esc, .13);
  if (I.texto) tpTxt(g, t, 0, .06, tsz, 'fill', a);
  else if (I.linha){ sil('fill', a, 0); if (I.detalhe) I.detalhe(g, b); }
  else if (I.desenha) I.desenha(g, a, b);
  else {
    g.fillStyle = a; g.fill(p, regra);
    if (I.detalhe){ g.save(); if (!I.solto) g.clip(p, regra); I.detalhe(g, b); g.restore(); }
  }
  g.restore();
}
function tpLuz(g, cx, cy, rt){                          // o esmalte: claro em cima à esquerda, escuro embaixo à direita, e o brilho
  const gr = g.createLinearGradient(cx - rt*.7, cy - rt*.8, cx + rt*.7, cy + rt*.8);
  gr.addColorStop(0, 'rgba(255,255,255,.24)'); gr.addColorStop(.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.26)');
  g.fillStyle = gr; g.fillRect(cx - rt, cy - rt, rt*2, rt*2);
  const bx = cx - rt*.38, by = cy - rt*.46, bri = g.createRadialGradient(bx, by, 0, bx, by, rt*.9);
  bri.addColorStop(0, 'rgba(255,255,255,.42)'); bri.addColorStop(.35, 'rgba(255,255,255,.12)'); bri.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = bri; g.fillRect(cx - rt, cy - rt, rt*2, rt*2);
}
function tpSaiaPath(g, x, y, r, B){                     // o contorno da saia com o dente de cada borda
  const n = B.n; g.beginPath();
  if (B.forma === 'lisa' || !n){ g.arc(x, y, r*.97, 0, TP_TAU); g.closePath(); return; }
  const passos = Math.max(96, n*10), rv = r*(B.forma === 'onda' || B.forma === 'concha' ? .9 : .85);
  for (let i = 0; i <= passos; i++){
    const a = i/passos*TP_TAU - Math.PI/2, ph = i/passos*n % 1;
    let u;
    if (B.forma === 'ponta') u = 1 - Math.abs(ph*2 - 1);
    else if (B.forma === 'quadrada') u = ph < .5 ? 1 : 0;
    else if (B.forma === 'concha') u = Math.sin(ph*Math.PI);
    else if (B.forma === 'chama') u = Math.pow(1 - Math.abs(ph*2 - 1), 2.2);
    else u = Math.pow(.5 + .5*Math.cos(n*(a + Math.PI/2)), .55);
    const R = rv + (r - rv)*u;
    i ? g.lineTo(x + Math.cos(a)*R, y + Math.sin(a)*R) : g.moveTo(x + Math.cos(a)*R, y + Math.sin(a)*R);
  }
  g.closePath();
}
function tpSaia(g, x, y, r, D){                          // a saia pintada (metal dobrado, dois tons, blocos, ouro, prata, neon, arco-íris, fogo, gelo)
  const B = TP_MAPA.b.get(D.b) || TP_BORDAS[0], c1 = D.bc[0], c2 = D.bc[1], L = -Math.PI*.75;
  const fixa = B.pinta === 'ouro' ? '#d9a51c' : B.pinta === 'prata' ? '#c2c9d1' : B.pinta === 'gelo' ? '#9fdcff' : B.pinta === 'neon' ? '#1a1430' : c1;
  const metal = B.pinta === 'prata' || B.pinta === 'ouro' || B.pinta === 'gelo';
  tpSaiaPath(g, x, y, r, B); g.fillStyle = tpMix(fixa, '#000000', .42); g.fill();
  g.save(); tpSaiaPath(g, x, y, r, B); g.clip();
  const n = B.n || 36, ri = r*.6, ro = r*1.1, h = Math.PI/n;
  for (let i = 0; i < n; i++){
    const a0 = i/n*TP_TAU - Math.PI/2;
    let cor = fixa;
    if (B.pinta === 'alterna' || B.pinta === 'fogo') cor = i & 1 ? c2 : c1;
    else if (B.pinta === 'blocos') cor = (i >> 1) & 1 ? c2 : c1;
    else if (B.pinta === 'arco') cor = TP_ARCO[i % TP_ARCO.length];
    for (let lado = 0; lado < 2; lado++){
      const aa = a0 + (lado ? 0 : -h), ab = aa + h, luz = Math.cos(aa + h/2 - L), k = lado ? .5 + .5*luz : .5*luz;
      g.fillStyle = k > .5 ? tpMix(cor, '#ffffff', (k - .5)*(metal ? 1.2 : .85)) : tpMix(cor, '#000000', (.5 - k)*.75);
      g.beginPath(); g.moveTo(x + Math.cos(aa)*ri, y + Math.sin(aa)*ri); g.lineTo(x + Math.cos(aa)*ro, y + Math.sin(aa)*ro);
      g.lineTo(x + Math.cos(ab)*ro, y + Math.sin(ab)*ro); g.lineTo(x + Math.cos(ab)*ri, y + Math.sin(ab)*ri); g.closePath(); g.fill();
    }
  }
  if (B.pinta === 'pontos') for (let i = 0; i < n; i++){ const a = (i + .5)/n*TP_TAU - Math.PI/2; tpCirc(g, x + Math.cos(a)*r*.86, y + Math.sin(a)*r*.86, r*.045, c2); }
  if (B.pinta === 'corda'){ g.lineWidth = r*.07; g.lineCap = 'round'; for (let i = 0; i < 40; i++){ const a = i/40*TP_TAU; g.strokeStyle = i & 1 ? c2 : c1; g.beginPath(); g.moveTo(x + Math.cos(a)*r*.79, y + Math.sin(a)*r*.79); g.lineTo(x + Math.cos(a + .2)*r*.95, y + Math.sin(a + .2)*r*.95); g.stroke(); } }
  if (B.pinta === 'rebite') for (let i = 0; i < 12; i++){ const a = i/12*TP_TAU, px = x + Math.cos(a)*r*.865, py = y + Math.sin(a)*r*.865; tpCirc(g, px, py, r*.065, tpMix(c2, '#000000', .45)); tpCirc(g, px - r*.012, py - r*.012, r*.05, c2); tpCirc(g, px - r*.025, py - r*.025, r*.018, 'rgba(255,255,255,.7)'); }
  if (B.pinta === 'gelo'){ g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = r*.02; for (let i = 0; i < n; i++){ const a = i/n*TP_TAU - Math.PI/2; g.beginPath(); g.moveTo(x + Math.cos(a)*r*.8, y + Math.sin(a)*r*.8); g.lineTo(x + Math.cos(a)*r*.97, y + Math.sin(a)*r*.97); g.stroke(); } }
  g.restore();
  tpSaiaPath(g, x, y, r, B); g.lineJoin = 'round'; g.lineWidth = Math.max(1.2, r*.05);
  if (B.pinta === 'neon'){ g.save(); g.shadowColor = c1; g.shadowBlur = r*.3; g.strokeStyle = c1; g.lineWidth = Math.max(1.5, r*.07); g.stroke(); g.restore(); g.strokeStyle = tpMix(c1, '#ffffff', .5); g.lineWidth = Math.max(1, r*.025); }
  else g.strokeStyle = 'rgba(14,8,26,.92)';
  g.stroke();
}
function tpTampa(g, x, y, r, D, semente){               // a tampinha inteira (r = a ponta dos dentes, como a de sempre)
  tpSaia(g, x, y, r, D);
  const rt = r*.74, B = TP_MAPA.b.get(D.b) || TP_BORDAS[0];
  tpCirc(g, x, y, rt + r*.035, tpMix(D.pc[0], '#000000', .62));
  g.save(); g.beginPath(); g.arc(x, y, rt, 0, TP_TAU); g.clip();
  tpPintaTampo(g, x, y, rt, D, semente); tpLuz(g, x, y, rt);
  g.restore();
  const ra = rt*.86; g.lineWidth = Math.max(1, r*.04); g.lineCap = 'butt';
  g.strokeStyle = 'rgba(255,255,255,.38)'; g.beginPath(); g.arc(x, y, ra, Math.PI*.75, Math.PI*1.75); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.26)'; g.beginPath(); g.arc(x, y, ra, -Math.PI*.25, Math.PI*.75); g.stroke();
  if (B.nome2 && r >= 46){                              // a Clássica grande (lobby, perfil): o nome em volta, como numa tampa de verdade
    const letras = Array.from('★ RACHA ★ FUTEBOL DE RUA '), passo = TP_TAU/letras.length, rr0 = (rt + ra)/2 + r*.004;
    g.save(); g.translate(x, y); g.font = (r*.1).toFixed(1) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,.62)';
    letras.forEach((ch, i) => { g.save(); g.rotate(i*passo); g.translate(0, -rr0); g.fillText(ch, 0, 0); g.restore(); });
    g.restore();
  }
}
function tpEscudo(g, x, y, r, D, semente){              // o escudo do clube: a forma por fora (cor 1), o desenho por dentro e o filete (cor 2)
  const F = tpForma(D.b), k = .8;
  g.save(); g.translate(x, y); g.scale(r, r);
  g.save(); g.translate(.03, .06); g.fillStyle = 'rgba(0,0,0,.3)'; g.fill(F); g.restore();
  g.fillStyle = D.bc[0]; g.fill(F);
  const gr = g.createLinearGradient(-.8, -.9, .8, .9); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)');
  g.fillStyle = gr; g.fill(F);
  g.lineJoin = 'round'; g.lineWidth = .07; g.strokeStyle = 'rgba(14,8,26,.92)'; g.stroke(F);
  g.save(); g.scale(k, k); g.clip(F); g.scale(1/k, 1/k);
  tpPintaTampo(g, 0, 0, .86, D, semente); tpLuz(g, 0, 0, .86);
  g.restore();
  g.save(); g.scale(k, k); g.lineWidth = .06; g.strokeStyle = D.bc[1]; g.stroke(F); g.restore();
  g.restore();
}
function tpDesenha(g, x, y, r, D, semente){ if (D.k === 'E') tpEscudo(g, x, y, r, D, semente); else tpTampa(g, x, y, r, D, semente); }
function tpSemente(cod){ let h = 7; for (let i = 0; i < cod.length; i++) h = (h*31 + cod.charCodeAt(i)) % 2147483646; return h + 1; }
const TP_SPR = new Map();
function tpSprite(D, cod, rpx){                         // a imagem pronta (uma por desenho e tamanho)
  const key = cod + '|' + rpx; let c = TP_SPR.get(key);
  if (c) return c;
  if (TP_SPR.size > 240) TP_SPR.clear();
  const lado = Math.ceil(2*(rpx*1.16 + 3)); c = document.createElement('canvas'); c.width = c.height = lado;
  tpDesenha(c.getContext('2d'), lado/2, lado/2, rpx, D, tpSemente(cod));
  TP_SPR.set(key, c); return c;
}
const tpEscalaDe = g => { try { const t = g.getTransform(); return Math.max(.1, Math.hypot(t.a, t.b)); } catch (_) { return dprL(); } };
function tpPoe(g, x, y, r, D, cod, esc){                // põe a imagem pronta no lugar (esc = pixels da tela por unidade do desenho)
  const rpx = tamPronto(r*esc), c = tpSprite(D, cod, rpx), m = c.width/2*r/rpx;
  g.drawImage(c, x - m, y - m, 2*m, 2*m);
}
function tpMiniatura(D, px){                             // um canvas pronto com o desenho (as listas do editor, do inventário e dos clubes)
  const cod = tpCodigo(D), c = document.createElement('canvas'), k = Math.min(2, dprL());
  c.width = c.height = Math.round(px*k); c.setAttribute('aria-hidden', 'true');
  const g = c.getContext('2d'); g.scale(k, k); tpDesenha(g, px/2, px/2, px*(D.k === 'E' ? .42 : .46), D, tpSemente(cod));
  return c;
}
if (document.fonts && document.fonts.load) document.fonts.load('30px "Lilita One"').then(() => { TP_SPR.clear(); }).catch(() => {});   // o texto da tampinha refeito com a fonte certa

/* ---------------------------------------------------------------- 6) os pré-projetados (muitas variações prontas) */
const tpD = o => Object.assign(TP_PADRAO_D(), {b:'dt', i:'--', ie:0, ip:[50, 50, 50, 0], bc:['#c7ccd2', '#5b636c']}, o);
const TP_PRE = [
  ['classica', 'Clássica', TP_PADRAO_D()],
  ['brasa', 'Brasa', {p:'fg', pc:['#2b0d06', '#ff6a1a', '#ffd23f'], bc:['#7a2a12', '#000000'], i:'fl', ic:['#ffd23f', '#ff3d1a']}],
  ['mar', 'Mar', {p:'on', pc:['#0f5fb8', '#5fc4ff', '#ffffff'], b:'od', bc:['#9ad0ff', '#000000'], i:'ts', ic:['#e8f6ff', '#ffffff'], ip:[50, 40, 50, 0]}],
  ['laje', 'Laje', {p:'tj', pc:['#c4592c', '#f0d2b0', '#000000'], b:'dl', bc:['#8d8f93', '#000000'], i:'cs', ic:['#f5c542', '#3a1f10']}],
  ['pipa', 'Pipa no céu', {p:'dr', pc:['#62b6ec', '#ffe2ae', '#000000'], i:'pi', ic:['#e2412f', '#ffffff'], ip:[50, 46, 56, 92]}],
  ['noite', 'Noite na quebrada', {p:'gx', pc:['#0c1030', '#fff6c8', '#3a2a8a'], b:'ls', bc:['#3c3f6b', '#000000'], i:'lu', ic:['#ffe9a0', '#000000'], ip:[56, 44, 46, 0], ie:2}],
  ['ouro', 'Ouro', {p:'ra', pc:['#e0a41c', '#ffd85e', '#000000'], b:'ou', i:'co', ic:['#fff3bf', '#e2412f'], ie:1}],
  ['neon', 'Neon', {p:'gr', pc:['#14082a', '#ff2bd6', '#000000'], b:'ne', bc:['#14d4f0', '#000000'], i:'ra', ic:['#14d4f0', '#000000']}],
  ['camuflada', 'Camuflada', {p:'ca', pc:['#55663a', '#2f3b1f', '#8a8a5c'], b:'re', bc:['#3a3f2a', '#b9b08a'], i:'es', ic:['#e7e0c0', '#000000'], ip:[50, 50, 38, 0], ie:1}],
  ['xadrez', 'Xadrez de rua', {p:'xd', pc:['#f3efe4', '#171a1c', '#000000'], b:'bc', bc:['#171a1c', '#f3efe4']}],
  ['canarinho', 'Canarinho', {p:'f2', pc:['#f5d21e', '#1f9a4a', '#2f5bd6'], bc:['#1f9a4a', '#000000'], i:'es', ic:['#2f5bd6', '#ffffff'], ip:[50, 50, 36, 0], ie:3}],
  ['gelo', 'Gelo', {p:'dc', pc:['#bfe9ff', '#ffffff', '#000000'], b:'ge', i:'cf', ic:['#2f8fd8', '#000000']}],
  ['arco', 'Arco-íris', {p:'ai', b:'ai', i:'ca', ic:['#ffffff', '#000000'], ip:[50, 50, 40, 0], ie:3}],
  ['camisa10', 'Camisa 10', {p:'fx', pc:['#ffffff', '#e2412f', '#000000'], bc:['#e2412f', '#000000'], i:'tx', ic:['#171a1c', '#000000'], t:'10', ie:3}],
  ['mira', 'Na mira', {p:'av', pc:['#ffffff', '#e2412f', '#ffffff'], b:'lt', bc:['#e2412f', '#f3efe4']}],
  ['hipnose', 'Hipnose', {p:'sp', pc:['#7a3fc4', '#f5c542', '#000000'], b:'pt', bc:['#3d1f6a', '#f5c542'], i:'ol', ic:['#ffffff', '#3d1f6a'], ip:[50, 50, 34, 0]}],
  ['onca', 'Onça-pintada', {p:'oc', pc:['#e8a23a', '#2b1a0a', '#b86a18'], bc:['#5a3a16', '#000000'], i:'pt', ic:['#2b1a0a', '#000000'], ip:[50, 50, 34, 0], ie:1}],
  ['zebra', 'Zebra', {p:'ze', pc:['#f3efe4', '#171a1c', '#000000'], b:'ls', bc:['#5b636c', '#000000']}],
  ['8bits', '8 bits', {p:'px', pc:['#3cb44b', '#1d6a2a', '#a6e36b'], b:'en', bc:['#55606a', '#000000'], i:'ca', ic:['#e2412f', '#000000'], ip:[50, 50, 38, 0]}],
  ['marmore', 'Mármore', {p:'ma', pc:['#ecebe6', '#9a9a9a', '#d1c7a8'], b:'pr'}],
  ['spray', 'Spray', {p:'rp', pc:['#171a1c', '#f5c542', '#ff2bd6'], b:'tr', bc:['#f5c542', '#171a1c'], i:'sy', ic:['#ff2bd6', '#171a1c'], ip:[58, 54, 34, 10], ie:3}],
  ['escorrido', 'Escorrido', {p:'ec', pc:['#f3efe4', '#7a3fc4', '#000000'], bc:['#7a3fc4', '#000000'], i:'tx', ic:['#7a3fc4', '#000000'], t:'R', ip:[50, 60, 50, 0], ie:3}],
  ['colmeia', 'Colmeia', {p:'hx', pc:['#f5c542', '#8a5a00', '#000000'], b:'dl', bc:['#8a5a00', '#000000']}],
  ['bola', 'Bola de rua', {p:'bf', pc:['#ffffff', '#171a1c', '#000000'], bc:['#c7ccd2', '#000000']}],
  ['estrela', 'Estrelona', {p:'eg', pc:['#2f5bd6', '#f5c542', '#000000'], b:'cr', bc:['#f5c542', '#000000']}],
  ['raio', 'Relâmpago', {p:'rl', pc:['#171a1c', '#f5d21e', '#000000'], bc:['#f5d21e', '#000000'], pp:[50, 50, 50, 8]}],
  ['eclipse', 'Eclipse', {p:'ml', pc:['#0c1030', '#ffd85e', '#000000'], b:'ls', bc:['#2a2f55', '#000000']}],
  ['escoces', 'Xadrez escocês', {p:'ta', pc:['#b8212a', '#1d3d2b', '#f5c542'], b:'tr', bc:['#3a1a10', '#d6b98a']}],
  ['sol', 'Sol nascente', {p:'rf', pc:['#ffd23f', '#e2412f', '#ff8a1c'], bc:['#e2412f', '#000000'], i:'so', ic:['#fff3bf', '#000000'], ip:[50, 50, 30, 0], ie:1}],
  ['arlequim', 'Arlequim', {p:'lo', pc:['#ffffff', '#e2412f', '#171a1c'], b:'bc', bc:['#e2412f', '#171a1c'], pp:[50, 50, 44, 0]}],
  ['pipas', 'Céu de pipas', {p:'pi', pc:['#62b6ec', '#e2412f', '#f5d21e'], b:'od', bc:['#2f74d8', '#000000']}],
  ['assombrada', 'Assombrada', {p:'dc', pc:['#1b1530', '#5a4a9a', '#000000'], b:'cr', bc:['#5a4a9a', '#000000'], i:'fn', ic:['#f3efe4', '#1b1530'], ie:2}],
  ['foguete', 'Decolagem', {p:'pt', pc:['#0c1a3a', '#9fb7ff', '#000000'], b:'ls', bc:['#c2c9d1', '#000000'], i:'fg', ic:['#e2412f', '#ffd23f'], ip:[50, 50, 50, 12], ie:2}],
  ['dragao', 'Dragão', {p:'es', pc:['#0d4a2b', '#2fd17a', '#000000'], b:'fo', bc:['#ff6a1a', '#ffd23f'], i:'dg', ic:['#ffd23f', '#e2412f']}],
  ['fenix', 'Fênix', {p:'fg', pc:['#3a0d0d', '#ff6a1a', '#ffd23f'], b:'ou', i:'fx', ic:['#ffd23f', '#ff3d1a'], ie:2}],
  ['pirata', 'Pirata', {p:'cs', pc:['#171a1c', '#3a3f45', '#5b636c'], b:'re', bc:['#2a2e33', '#c7ccd2'], i:'cv', ic:['#f3efe4', '#171a1c']}],
  ['sortuda', 'Sortuda', {p:'qd', pc:['#1f9a4a', '#157a38', '#000000'], bc:['#e0a41c', '#000000'], i:'tv', ic:['#e9ffe0', '#000000'], ie:1}],
  ['robo', 'Robô', {p:'gr', pc:['#55606a', '#8a96a2', '#000000'], b:'en', bc:['#8a96a2', '#000000'], i:'rb', ic:['#c2c9d1', '#14d4f0']}],
  ['abducao', 'Abdução', {p:'dc', pc:['#0c2a14', '#3cff6a', '#000000'], b:'ne', bc:['#3cff6a', '#000000'], i:'et', ic:['#3cff6a', '#0c2a14']}],
  ['cafe', 'Café com leite', {p:'me', pc:['#6b3f22', '#f3e3c8', '#000000'], bc:['#c7a27a', '#000000'], pp:[50, 50, 50, 12]}],
  ['melancia', 'Melancia', {p:'an', pc:['#e2412f', '#1f9a4a', '#000000'], b:'ls', bc:['#1f9a4a', '#000000'], pp:[50, 50, 80, 0]}],
  ['predios', 'Prédios', {p:'dr', pc:['#ff8a1c', '#3a2a8a', '#000000'], bc:['#3a2a8a', '#000000'], i:'pd', ic:['#171a1c', '#f5d21e'], ip:[50, 58, 54, 0], ie:2}],
  ['paredao', 'Paredão', {p:'cz', pc:['#2f5bd6', '#ffffff', '#000000'], bc:['#ffffff', '#000000'], i:'lv', ic:['#f5c542', '#171a1c'], ip:[50, 50, 44, 0], ie:3}],
  ['chuteira', 'Chuteira de ouro', {p:'rf', pc:['#171a1c', '#3a3f45', '#e0a41c'], b:'ou', i:'cu', ic:['#ffd23f', '#171a1c'], ie:2}]
].map(([id, nome, o]) => ({id, nome, d:tpNorm(id === 'classica' ? o : tpD(o))}));
const TP_PRE_ESCUDO = [
  ['classico', 'Clássico', {}],
  ['estrelado', 'Estrelado', {b:'ci', bc:['#f5c542', '#171a1c'], p:'ls', pc:['#171a1c', '#f3efe4', '#000000'], i:'es', ic:['#f5c542', '#000000']}],
  ['realeza', 'Realeza', {b:'br', bc:['#e0a41c', '#3a1f00'], p:'dc', pc:['#3d1f6a', '#7a3fc4', '#000000'], i:'co', ic:['#ffd23f', '#e2412f'], ie:2}],
  ['quebrada', 'Da quebrada', {b:'em', bc:['#f3efe4', '#171a1c'], p:'tj', pc:['#c4592c', '#f0d2b0', '#000000'], i:'cs', ic:['#f5c542', '#3a1f10']}],
  ['eletrico', 'Elétrico', {b:'ep', bc:['#171a1c', '#f5d21e'], p:'f2', pc:['#2f5bd6', '#f5d21e', '#171a1c'], i:'ra', ic:['#f5d21e', '#000000']}],
  ['inferno', 'Inferno', {b:'et', bc:['#ff6a1a', '#3a0d0d'], p:'fg', pc:['#3a0d0d', '#ff6a1a', '#ffd23f'], i:'cv', ic:['#f3efe4', '#3a0d0d'], ip:[50, 50, 40, 0]}],
  ['litoral', 'Litoral', {b:'go', bc:['#9ad0ff', '#0b3d7a'], p:'on', pc:['#0f5fb8', '#5fc4ff', '#000000'], i:'oa', ic:['#e8f6ff', '#0b3d7a']}],
  ['dragoes', 'Dragões', {b:'as', bc:['#2fd17a', '#0d4a2b'], p:'es', pc:['#0d4a2b', '#2fd17a', '#000000'], i:'dg', ic:['#ffd23f', '#e2412f']}],
  ['fortaleza', 'Fortaleza', {b:'ca', bc:['#8d8f93', '#2a2e33'], p:'xd', pc:['#2a2e33', '#55606a', '#000000'], i:'an', ic:['#f3efe4', '#000000']}],
  ['futebolarte', 'Futebol-arte', {b:'hx', bc:['#1f9a4a', '#f5d21e'], p:'bf', pc:['#ffffff', '#171a1c', '#000000'], i:'--'}],
  ['sigla', 'Com a sigla', {b:'er', bc:['#e2412f', '#ffffff'], p:'tc', pc:['#ffffff', '#e2412f', '#e2412f'], i:'tx', ic:['#171a1c', '#000000'], t:'FC', ie:3}],
  ['pipa', 'Pipa avoada', {b:'lo', bc:['#62b6ec', '#0b3d7a'], p:'dr', pc:['#62b6ec', '#ffe2ae', '#000000'], i:'pi', ic:['#e2412f', '#ffffff']}]
].map(([id, nome, o]) => ({id, nome, d:tpNorm(Object.assign(TP_ESCUDO_D(), o))}));
/* as skins da sua conta do RACHA (o inventário da plataforma) viram tampinhas: equipar não custa nada para quem tem */
const TP_CONTA = {
  skin_padrao:{nome:'Tampinha da Rua', d:{p:'me', pc:['#2f5bd6', '#7f9cff', '#000000'], bc:['#c7ccd2', '#000000'], i:'bo', ic:['#ffffff', '#171a1c'], ip:[50, 50, 40, 0], ie:2}},
  skin_artilheiro:{nome:'Artilheiro', d:{p:'av', pc:['#e03131', '#ff922b', '#e03131'], b:'cr', bc:['#ff922b', '#000000'], i:'al', ic:['#ffffff', '#e03131'], ip:[50, 50, 34, 0], ie:2}},
  skin_lenda_suprema:{nome:'Lenda Suprema', d:{p:'rf', pc:['#f59a0c', '#ffd23f', '#fff3bf'], b:'ou', i:'co', ic:['#fff3bf', '#e03131'], ie:1}},
  skin_aniversario:{nome:'Aniversário do RACHA', d:{p:'bg', pc:['#b197fc', '#ffd23f', '#ff7ad9'], b:'pt', bc:['#7048e8', '#ffd23f'], i:'b4', ic:['#ffd23f', '#000000'], ip:[50, 50, 40, 0], ie:3}},
  skin_parceiro:{nome:'Parceiro RACHA', d:{p:'dc', pc:['#0b7285', '#3bc9db', '#000000'], b:'bc', bc:['#3bc9db', '#0b7285'], i:'ca', ic:['#ffffff', '#000000'], ip:[50, 50, 40, 0], ie:2}},
  skin_fundador:{nome:'Fundador', d:{p:'tj', pc:['#7048e8', '#ffd23f', '#000000'], b:'ou', i:'pd', ic:['#ffd23f', '#7048e8'], ip:[50, 54, 46, 0], ie:2}}
};
for (const k in TP_CONTA) TP_CONTA[k].d = tpNorm(tpD(TP_CONTA[k].d));

/* ---------------------------------------------------------------- 7) o que fica salvo neste aparelho */
const TP_CHAVE = 'racha-tampa-v1';
const TP = {itens:new Set(), salvas:[], equipada:'', livres:new Set(), conta:[]};   // livres: os códigos das skins da sua conta (equipar sem pagar)
try {
  const o = JSON.parse(localStorage.getItem(TP_CHAVE) || 'null');
  if (o && typeof o === 'object'){
    if (Array.isArray(o.itens)) TP.itens = new Set(o.itens.filter(x => typeof x === 'string' && /^[bfpi]:[a-z0-9-]{2}$/.test(x)));
    if (Array.isArray(o.salvas)) TP.salvas = o.salvas.filter(s => s && tpEhCodigo(s.c) && s.c[0] === 'T' && tpLe(s.c)).slice(0, 24).map(s => ({c:s.c, n:Array.from(semLixo(String(s.n || ''))).slice(0, 20).join('').trim() || 'Minha tampinha', f:s.f === true}));   // v70: f = favorita
    if (tpEhCodigo(o.equipada) && o.equipada[0] === 'T' && tpLe(o.equipada)) TP.equipada = o.equipada;
  }
} catch (_) {}
// v70: as peças compradas moram também na conta, junto com o saldo (uma gravação só na compra: não sobra compra pela metade)
for (const k of (Array.isArray(CONTA.pecas) ? CONTA.pecas : [])) if (/^[bfpi]:[a-z0-9-]{2}$/.test(k)) TP.itens.add(k);
if (!Array.isArray(CONTA.pecas) || CONTA.pecas.length !== TP.itens.size){ CONTA.pecas = [...TP.itens]; contaSalvar(); }
function tpSalva(){ try { localStorage.setItem(TP_CHAVE, JSON.stringify({itens:[...TP.itens], salvas:TP.salvas, equipada:TP.equipada})); } catch (_) {} }
const tpChave = (tipo, id) => tipo + ':' + id;           // b:dt · f:es · p:xd · i:co
const tpMapaDe = tipo => tipo === 'b' ? TP_MAPA.b : tipo === 'f' ? TP_MAPA.f : tipo === 'p' ? TP_MAPA.p : TP_MAPA.i;
function tpTem(tipo, id){ const it = tpMapaDe(tipo).get(id); return !it || it.pr === 'gratis' || TP.itens.has(tpChave(tipo, id)); }
function tpFaltam(D){                                   // os itens do desenho que ainda não são seus, com o preço de cada
  if (TP.livres.has(tpCodigo(D))) return [];
  const L = [], add = (tipo, id) => { const it = tpMapaDe(tipo).get(id); if (it && !tpTem(tipo, id)) L.push({tipo, id, it, pr:TP_PRECO[it.pr]}); };
  add(D.k === 'E' ? 'f' : 'b', D.b); add('p', D.p); add('i', D.i);
  return L;
}
function tpCusto(D){ const c = {m:0, g:0}; for (const x of tpFaltam(D)){ c.m += x.pr.m; c.g += x.pr.g; } return c; }
const tpPode = c => CONTA.moedas >= c.m && CONTA.gemas >= c.g;
function tpCompra(D){                                   // paga o que falta (as moedas e gemas deste aparelho) e guarda os itens
  const L = tpFaltam(D), c = tpCusto(D);
  if (!tpPode(c)) return false;
  const antes = {m:CONTA.moedas, g:CONTA.gemas, itens:new Set(TP.itens), pecas:CONTA.pecas};
  for (const x of L) TP.itens.add(tpChave(x.tipo, x.id));
  CONTA.moedas -= c.m; CONTA.gemas -= c.g; CONTA.pecas = [...TP.itens];
  contaSalvar();                                        // v70: o saldo e as peças na mesma gravação (a conta)
  let gravou = false; try { gravou = localStorage.getItem(CHAVE_CONTA) === JSON.stringify(CONTA); } catch (_) {}
  if (!gravou){                                         // não gravou: a compra não acontece (nada de moeda paga sem peça, nem peça sem pagar)
    CONTA.moedas = antes.m; CONTA.gemas = antes.g; TP.itens = antes.itens; CONTA.pecas = antes.pecas;
    try { som.erro(); aviso('Não deu para salvar a compra neste navegador: nada foi cobrado'); } catch (_) {}
    return false;
  }
  tpSalva(); if (c.m || c.g){ som.compra(); try { lbCarteira(); } catch (_) {} }
  try { if (typeof tpSincConta === 'function') tpSincConta(); } catch (_) {}
  return true;
}
const tpLivre = cod => TP.livres.has(cod);               // v70: as skins da conta (e a tampinha restaurada da conta) não se paga de novo

/* ---------------------------------------------------------------- 8) as tampinhas no jogo */
const TP_SKINS = new Map();
function tpSkin(cod){                                   // o "skin" de um desenho (a cor continua a do time: o halo, o placar e a torcida não mudam)
  let s = TP_SKINS.get(cod);
  if (!s){ const D = tpLe(cod); if (!D || D.k !== 'T') return null; s = Object.assign({}, SEM_SKIN, {id:cod, nome:'Tampinha', desenho:D}); if (TP_SKINS.size > 300) TP_SKINS.clear(); TP_SKINS.set(cod, s); }
  return s;
}
const TP_BOT_CORES = [['#e2412f', '#ffffff'], ['#2f5bd6', '#f5c542'], ['#1f9a4a', '#f3efe4'], ['#171a1c', '#f5c542'], ['#f5c542', '#171a1c'], ['#7a3fc4', '#ffd23f'],
  ['#ff8a1c', '#171a1c'], ['#14a8c8', '#ffffff'], ['#f3efe4', '#2f5bd6'], ['#c4592c', '#f0d2b0'], ['#0c1030', '#ff2bd6'], ['#55663a', '#e7e0c0'], ['#ff5c8a', '#ffffff'], ['#3a3f45', '#14d4f0']];
const TP_BOT = new Map();
function tpDoBot(semente){                              // a tampinha de cada bot: sempre a mesma para o mesmo nome (um pré-projetado ou uma mistura)
  const k = String(semente); let c = TP_BOT.get(k); if (c) return c;
  const r = rndDe('tampa|' + k), esc = a => a[Math.floor(r()*a.length) % a.length];
  if (r() < .35) c = tpCodigo(esc(TP_PRE).d);
  else {
    const cores = esc(TP_BOT_CORES), D = TP_PADRAO_D();
    D.b = r() < .5 ? 'dt' : esc(TP_BORDAS).id; D.bc = [esc(['#c7ccd2', '#8d8f93', '#5b636c', cores[0], cores[1]]), cores[0]];
    D.p = esc(TP_PADROES).id; D.pc = [cores[0], cores[1], esc(TP_BOT_CORES)[0]]; D.pp = [50, 50, 40 + Math.floor(r()*30), Math.floor(r()*4)*12];
    D.i = '--'; D.ie = Math.floor(r()*4); D.ip = [50, 50, 50, 0];
    if (r() < .55){ D.i = esc(TP_ICONES.filter(x => x.id !== '--' && !x.texto)).id; D.ic = [r() < .5 ? cores[1] : '#ffffff', cores[0]]; D.ip = [50, 50, 30 + Math.floor(r()*30), 0]; }
    c = tpCodigo(D);
  }
  if (TP_BOT.size > 200) TP_BOT.clear();
  TP_BOT.set(k, c); return c;
}
const tpMinha = () => TP.equipada || tpCodigo(TP_PADRAO_D());
function tpEquipa(cod){                                 // equipa: o lobby, o perfil e quem está na sala ficam sabendo
  if (!tpEhCodigo(cod) || cod[0] !== 'T' || !tpLe(cod)) return false;
  TP.equipada = cod; tpSalva();
  perfil.skin = cod; perfilSalvar();
  EMB.pop = 1; EMB.leveFeito = false; PFP.feito = false;
  lbRender();
  if (NET49.id && !SLOC.on) net49Send({type:'profile', name:perfil.nome, skin:cod, avatar:perfil.avatar});
  return true;
}
perfil.skin = tpMinha();                               // (o perfil salvo só guarda as skins antigas: a sua tampinha volta daqui)
const skinPorIdAntes69 = skinPorId;
skinPorId = function(id){ return (tpEhCodigo(id) && tpSkin(id)) || skinPorIdAntes69(id); };
equipaBotao = function(id){ return tpEquipa(tpEhCodigo(id) ? id : tpMinha()); };   // quem ainda chama pelo botão antigo (a primeira vez) fica com a sua tampinha
skinDoBot = function(q){                               // os bots e os companheiros do treino com tampinhas variadas (o time está no halo)
  if (!q) return tpSkin(tpDoBot('bot'));
  return tpSkin(tpEhCodigo(q.netSkin) ? q.netSkin : tpDoBot(q.nome || q.txt || q.funcao || ('bot' + (q.id | 0))));
};
net49Skin = function(q){                               // na partida online: cada um com a sua; o bot da vaga com a dele
  if (q === P) return skinAtual();
  return tpSkin(tpEhCodigo(q && q.netSkin) ? q.netSkin : tpDoBot(q && (q.nome || q.netId) || 'bot'));
};
const drawBotaoAntes69 = drawBotao;
drawBotao = function(g, x, y, r, sk, avatar, sombra, est){
  if (sk && sk.desenho){ if (sombra) sombraBotao(g, x, y, r); tpPoe(g, x, y, r, sk.desenho, sk.id, tpEscalaDe(g)); return; }
  return drawBotaoAntes69(g, x, y, r, sk, avatar, sombra, est);
};
const botaoProntoAntes69 = botaoPronto;
botaoPronto = function(g, x, y, r, sk, avatar, est, esc){
  if (sk && sk.desenho){ tpPoe(g, x, y, r, sk.desenho, sk.id, esc); return; }
  return botaoProntoAntes69(g, x, y, r, sk, avatar, est, esc);
};
const rpSkinDeAntes69 = rpSkinDe;
rpSkinDe = function(q, eu){                            // o replay guarda a tampinha de cada um na hora do gol
  if (eu || q === P) return skinAtual().id;
  const s = skinDoBot(q); return s && s.desenho ? s.id : rpSkinDeAntes69(q, eu);
};
const rpSkinEntAntes69 = rpSkinEnt;
rpSkinEnt = function(R, i){                            // e devolve: o código salvo; nos replays antigos, uma tampinha fixa por jogador
  const e = R.ents[i]; if (!e) return rpSkinEntAntes69(R, i);
  if (tpEhCodigo(e.sk)){ const s = tpSkin(e.sk); if (s) return s; }
  if (e.humano) return skinAtual();
  return tpSkin(tpDoBot(String(R.id) + '|' + i)) || rpSkinEntAntes69(R, i);
};
const brasilCorNomeAntes69 = brasilCorNome;
brasilCorNome = function(m){                           // no chat, o nome na cor principal da tampinha (escurecida até dar para ler)
  const D = tpEhCodigo(m && m.skin) ? tpLe(m.skin) : null; if (!D) return brasilCorNomeAntes69(m);
  const lum = h => { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)/255).map(x => x <= .03928 ? x/12.92 : Math.pow((x + .055)/1.055, 2.4)); return .2126*v[0] + .7152*v[1] + .0722*v[2]; };
  let c = tpHex(D.pc[0], '#2f6fe6');
  for (let i = 0; i < 14 && (lum('#f2efe6') + .05)/(lum(c) + .05) < 4.5; i++) c = '#' + [1, 3, 5].map(k => Math.round(parseInt(c.slice(k, k + 2), 16)*.82).toString(16).padStart(2, '0')).join('');
  return c;
};
// (v70: zerar o progresso — o que apaga e o que fica, com as escolhas — está em tools/v70/perfil.js)
const rpDecodificaAntes69 = rpDecodifica;
rpDecodifica = function(e){                             // o replay salvo no aparelho volta com a tampinha de cada um (a leitura antiga só aceitava as skins da coleção)
  const R = rpDecodificaAntes69(e); if (!R || !e || !Array.isArray(e.ents)) return R;
  R.ents.forEach((x, i) => { const s = e.ents[i] && e.ents[i].sk; if (x && !x.sk && tpEhCodigo(s) && s[0] === 'T') x.sk = s; });
  return R;
};
