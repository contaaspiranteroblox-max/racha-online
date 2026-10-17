/* ======================================================================================================================
   RACHA rua v79 · AS PATENTES DA RANQUEADA (o pedido: "crie essas patentes rankeada também", com a imagem das 8 patentes)
   Qual implementação valia: os elos da v35 (RQ_ELOS + rqElo/rqEloDaOrdem/rqInsignia no jogo-base: Bronze, Prata, Ouro,
   Platina e Diamante com I, II e III; Mestre e Lenda de uma divisão só; os pontos em CONTA.rq e a conta do resultado no
   rqPontua) e a dificuldade da liga pela patente (ECO_LIGA_DIF, tools/v70/economia.js). A v79 troca a tabela e o desenho,
   sem mexer na conta dos pontos (vitória +22, +3 por gol de diferença…; derrota −14…; no Bronze, a metade; abandono −25):
   · 8 PATENTES, cada uma com 3 divisões — III (a de entrada), II e I (a de cima) —, nas faixas da imagem:
     BRONZE 0–399 · PRATA 400–799 · OURO 800–1.299 · PLATINA 1.300–1.899 · DIAMANTE 1.900–2.599 · ÉLITE 2.600–3.399 ·
     MESTRE 3.400–4.299 · LENDÁRIO 4.300+. As divisões dividem a faixa em 3 (arredondado de 10 em 10); no Lendário, de 300.
   · A INSÍGNIA (desenho próprio, em SVG): o escudo na cor da patente com a bola no meio; as asas crescem de III para I;
     coroa na Élite (II e I), no Mestre e no Lendário. Os pontos que você já tinha continuam os mesmos (só a tabela mudou).
   · A TELA DAS PATENTES ("PATENTES RANQUEADAS"): as 8 colunas com as 3 insígnias e as faixas, a sua marcada.
   ====================================================================================================================== */
const PATENTES = [
  {id:'bronze',   nome:'Bronze',   min:0,    cor:['#ffd8b5', '#c87a4a', '#5a2a0e'], bola:'#e6a47a', txt:'#ff9c5b'},
  {id:'prata',    nome:'Prata',    min:400,  cor:['#ffffff', '#c3ccd8', '#4b5666'], bola:'#eef1f5', txt:'#d7dde6'},
  {id:'ouro',     nome:'Ouro',     min:800,  cor:['#fff4b0', '#ffc928', '#8a5600'], bola:'#ffd65a', txt:'#ffc928'},
  {id:'platina',  nome:'Platina',  min:1300, cor:['#dcfffa', '#2fd3c4', '#0b625d'], bola:'#83f1e6', txt:'#38e2d2'},
  {id:'diamante', nome:'Diamante', min:1900, cor:['#e0eaff', '#3f7fff', '#16289a'], bola:'#86abff', txt:'#5c95ff'},
  {id:'elite',    nome:'Élite',    min:2600, cor:['#f3e1ff', '#a64dff', '#45107f'], bola:'#c693ff', txt:'#b974ff'},
  {id:'mestre',   nome:'Mestre',   min:3400, cor:['#ffd6d1', '#ff3b3b', '#730b0b'], bola:'#ff8079', txt:'#ff5050'},
  {id:'lendario', nome:'Lendário', min:4300, cor:['#fff6c2', '#ffcb2e', '#6d4300'], bola:'#ffd23f', txt:'#ffd23f', escudo:'#1b1609'}
];
const PAT_DIV = ['III', 'II', 'I'];
PATENTES.forEach((p, i) => {                              // os cortes das 3 divisões (de 10 em 10; o Lendário, de 300 em 300)
  const prox = PATENTES[i + 1], faixa = prox ? prox.min - p.min : 900;
  p.cortes = [p.min, p.min + Math.round(faixa/30)*10, p.min + Math.round(faixa*2/30)*10];
  p.max = prox ? prox.min - 1 : null;
});
const PAT_ORDENS = PATENTES.length*3;                     // 1 = Bronze III … 24 = Lendário I

/* ---- a conta: os pontos viram patente e divisão ---- */
rqElo = function(pts){
  pts = Math.max(0, Math.floor(pts) || 0);
  let i = 0; while (i + 1 < PATENTES.length && pts >= PATENTES[i + 1].min) i++;
  const p = PATENTES[i]; let k = 0; while (k < 2 && pts >= p.cortes[k + 1]) k++;
  const min = p.cortes[k], prox = k < 2 ? p.cortes[k + 1] : PATENTES[i + 1] ? PATENTES[i + 1].min : null;
  return {elo:p, i, k, div:k + 1, divNome:PAT_DIV[k], ordem:i*3 + k + 1, nome:(p.nome + ' ' + PAT_DIV[k]).toUpperCase(), patente:p.nome.toUpperCase(),
    min, prox, pct:prox ? (pts - min)/(prox - min) : 1};
};
rqEloDaOrdem = function(o){                                // (a apresentação dos times: a patente de cada um)
  o = Math.max(1, Math.min(PAT_ORDENS, Math.round(o) || 1));
  const p = PATENTES[Math.floor((o - 1)/3)];
  return rqElo(p.cortes[(o - 1) % 3]);
};
// a dificuldade dos bots da ranqueada pela patente (a chance de pegar o Difícil quando ninguém online aparece)
try { Object.assign(ECO_LIGA_DIF, {bronze:.25, prata:.4, ouro:.55, platina:.7, diamante:.8, elite:.88, mestre:.93, lendario:.97}); } catch (_) {}

/* ---- a insígnia (SVG, desenho próprio): o escudo, a bola, as asas (III → I) e a coroa ---- */
let patSeq = 0;
function patBola(cx, cy, r, cor, k){                      // a bola: a cor da patente com os gomos (um tom escuro dela)
  const escuro = corMix(cor, '#000000', .62);
  const pent = (x, y, rr, rot) => { let d = ''; for (let i = 0; i < 5; i++){ const a = rot + i*TAU/5; d += (i ? 'L' : 'M') + (x + Math.cos(a)*rr).toFixed(1) + ' ' + (y + Math.sin(a)*rr).toFixed(1); } return d + 'Z'; };
  let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#pb' + k + ')" stroke="#0d0b10" stroke-width="2.6"/>';
  s += '<path d="' + pent(cx, cy, r*.33, -Math.PI/2) + '" fill="' + escuro + '"/>';
  let raios = '', gomos = '';
  for (let i = 0; i < 5; i++){
    const a = -Math.PI/2 + i*TAU/5, x0 = cx + Math.cos(a)*r*.33, y0 = cy + Math.sin(a)*r*.33, x1 = cx + Math.cos(a)*r*.72, y1 = cy + Math.sin(a)*r*.72;
    raios += 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'L' + x1.toFixed(1) + ' ' + y1.toFixed(1);
    gomos += '<path d="' + pent(cx + Math.cos(a)*r*.98, cy + Math.sin(a)*r*.98, r*.26, a + Math.PI/5) + '" fill="' + escuro + '"/>';
  }
  s += '<g clip-path="url(#pc' + k + ')">' + gomos + '</g><path d="' + raios + '" stroke="' + escuro + '" stroke-width="1.8"/>';
  s += '<path d="M' + (cx - r*.56).toFixed(1) + ' ' + (cy - r*.4).toFixed(1) + 'a' + (r*.72).toFixed(1) + ' ' + (r*.72).toFixed(1) + ' 0 0 1 ' + (r*.44).toFixed(1) + ' -' + (r*.32).toFixed(1) + '" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2.4" stroke-linecap="round"/>';
  return s;
}
function patAsas(p, d, k){                                // as asas atrás do escudo: na III, uma pena curta de cada lado; na II, 2; na I, 3 (maiores)
  const L0 = [19, 28, 36][d], pena = [];
  for (let j = 0; j <= d; j++){
    const y0 = 33 + j*14, L = L0 - j*7, h = 13 - j*1.5, tx = 33 - L, ty = y0 - L*.38;
    pena.push('M33 ' + y0 + 'L' + tx.toFixed(1) + ' ' + ty.toFixed(1) + 'L' + (33 - L*.55).toFixed(1) + ' ' + (y0 + h*.55).toFixed(1) + 'L33 ' + (y0 + h).toFixed(1) + 'Z');
  }
  const caminho = pena.join('');
  return '<g fill="url(#pa' + k + ')" stroke="#0d0b10" stroke-width="2.4" stroke-linejoin="round"><path d="' + caminho + '"/><path d="' + caminho + '" transform="matrix(-1 0 0 1 120 0)"/></g>';
}
function patCoroa(p, d, k, grande){
  const y = grande ? 3 : 7, h = grande ? 21 : 16, w = grande ? 46 : 38, x0 = 60 - w/2;
  const d1 = 'M' + x0 + ' ' + (y + h) + 'L' + (x0 - 2) + ' ' + (y + 5) + 'L' + (x0 + w*.25) + ' ' + (y + h*.55) + 'L60 ' + y + 'L' + (x0 + w*.75) + ' ' + (y + h*.55) + 'L' + (x0 + w + 2) + ' ' + (y + 5) + 'L' + (x0 + w) + ' ' + (y + h) + 'Z';
  return '<path d="' + d1 + '" fill="url(#pa' + k + ')" stroke="#0d0b10" stroke-width="2.6" stroke-linejoin="round"/>'
    + '<circle cx="60" cy="' + (y + 1.5) + '" r="3" fill="' + p.cor[0] + '" stroke="#0d0b10" stroke-width="1.6"/>';
}
rqInsignia = function(e){
  const p = e.elo || PATENTES[0], d = Math.max(0, Math.min(2, e.k == null ? (e.div || 1) - 1 : e.k)), k = ++patSeq, c = p.cor;
  const coroa = p.id === 'lendario' || p.id === 'mestre' || (p.id === 'elite' && d >= 1);
  let s = '<svg viewBox="0 0 120 120" aria-hidden="true" class="pat-ins pat-' + p.id + '"><defs>'
    + '<linearGradient id="pg' + k + '" x1="0" y1="0" x2=".45" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset=".45" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></linearGradient>'
    + '<linearGradient id="pa' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset=".6" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></linearGradient>'
    + '<radialGradient id="pi' + k + '" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="' + corMix(c[2], '#000000', .25) + '"/><stop offset="1" stop-color="' + corMix(c[2], '#000000', .72) + '"/></radialGradient>'
    + '<radialGradient id="pb' + k + '" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="' + p.bola + '"/><stop offset="1" stop-color="' + corMix(p.bola, '#000000', .45) + '"/></radialGradient>'
    + '<radialGradient id="pl' + k + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="' + c[1] + '" stop-opacity=".5"/><stop offset="1" stop-color="' + c[1] + '" stop-opacity="0"/></radialGradient>'
    + '<clipPath id="pc' + k + '"><circle cx="60" cy="59" r="19"/></clipPath></defs>';
  if (d === 2 || PATENTES.indexOf(p) >= 5) s += '<circle cx="60" cy="60" r="56" fill="url(#pl' + k + ')"/>';   // (o brilho atrás: a divisão I e as 3 de cima)
  s += patAsas(p, d, k);
  // o escudo: a borda escura, o metal da patente e o miolo escuro
  s += '<path d="M60 13L95 25.5V58C95 82 80 97 60 108C40 97 25 82 25 58V25.5Z" fill="#0d0b10"/>';
  s += '<path d="M60 17.5L90.5 28.5V58C90.5 79 77.5 92.5 60 102.6C42.5 92.5 29.5 79 29.5 58V28.5Z" fill="url(#pg' + k + ')"/>';
  s += '<path d="M60 26L82.5 34.2V58C82.5 74.5 72.5 85.5 60 93.4C47.5 85.5 37.5 74.5 37.5 58V34.2Z" fill="' + (p.escudo || 'url(#pi' + k + ')') + '" stroke="#0d0b10" stroke-width="2"/>';
  s += '<path d="M60 20.5L87.6 30.4V44" fill="none" stroke="#ffffff" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round"/>';
  if (d >= 1) s += '<path d="M60 9l4.5 6.5L60 22l-4.5-6.5z" fill="url(#pa' + k + ')" stroke="#0d0b10" stroke-width="2" stroke-linejoin="round"/>';   // (a ponta de cima: II e I)
  s += patBola(60, 59, 19, p.bola, k);
  s += '<path d="M60 96l4.6 5.4L60 106.8l-4.6-5.4z" fill="' + c[0] + '" stroke="#0d0b10" stroke-width="1.8" stroke-linejoin="round"/>';   // a gema embaixo
  if (coroa) s += patCoroa(p, d, k, p.id === 'lendario');
  return s + '</svg>';
};

/* ---- a tela das PATENTES RANQUEADAS (do lobby, do JOGAR e do perfil) ---- */
const V79P = {el:null};
function v79PatentesAbre(){
  if (!V79P.el){
    const raiz = nodo('div', 'lb-folha v79-pat-folha'); raiz.id = 'v79-pat'; raiz.hidden = true;
    raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-label', 'Patentes ranqueadas');
    const cx = nodo('div', 'folha v79-pat');
    const fecha = novoBotao('rq-fecha v79-pat-fecha', 'Fechar'); fecha.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg>';
    fecha.addEventListener('click', () => { som.clique(); v79PatentesFecha(); });
    const cab = nodo('header', 'v79-pat-cab');
    cab.append(nodo('h2', null, 'PATENTES RANQUEADAS'), nodo('p', 'v79-pat-sub'));
    const grade = nodo('div', 'v79-pat-grade'); grade.setAttribute('role', 'list');
    cx.append(fecha, cab, grade, nodo('p', 'v79-pat-nota'));
    raiz.appendChild(cx);
    raiz.addEventListener('click', ev => { if (ev.target === raiz){ som.clique(); v79PatentesFecha(); } });
    raiz.addEventListener('keydown', ev => { if (ev.key === 'Escape'){ ev.stopPropagation(); v79PatentesFecha(); } });
    ((RQP.raiz && RQP.raiz.parentNode) || LB.camada || LB.raiz || document.body).appendChild(raiz);   // (na camada das janelas, com a escala delas)
    V79P.el = raiz;
  }
  v79PatentesPinta();
  V79P.el.hidden = false;
  try { V79P.el.querySelector('.v79-pat-fecha').focus({preventScroll:true}); } catch (_) {}
}
function v79PatentesFecha(){ if (V79P.el) V79P.el.hidden = true; }
function v79PatentesPinta(){
  const el = V79P.el; if (!el) return;
  const e = rqElo(CONTA.rq.pts), grade = el.querySelector('.v79-pat-grade');
  el.querySelector('.v79-pat-sub').textContent = 'Você: ' + e.nome + ' · ' + fmtNum(CONTA.rq.pts | 0) + ' pontos' + (e.prox != null ? ' · faltam ' + fmtNum(e.prox - (CONTA.rq.pts | 0)) + ' para ' + rqElo(e.prox).nome : ' · o topo');
  grade.textContent = '';
  PATENTES.forEach((p, i) => {
    const col = nodo('div', 'v79-pat-col' + (i === e.i ? ' minha' : '')); col.setAttribute('role', 'listitem');
    col.style.setProperty('--pc', p.txt); col.style.setProperty('--pb', p.cor[1]);
    const faixa = fmtNum(p.min) + (p.max != null ? ' - ' + fmtNum(p.max) : '+');
    col.append(nodo('b', 'v79-pat-nome', p.nome.toUpperCase()), nodo('span', 'v79-pat-faixa', faixa), nodo('small', null, 'PONTOS'));
    for (let k = 0; k < 3; k++){
      const div = nodo('div', 'v79-pat-div' + (i === e.i && k === e.k ? ' eu' : ''));
      const ins = nodo('i', 'v79-pat-ins'); ins.innerHTML = rqInsignia({elo:p, k, i});
      div.append(ins, nodo('em', null, PAT_DIV[k]));
      div.title = p.nome + ' ' + PAT_DIV[k] + ' · a partir de ' + fmtNum(p.cortes[k]) + ' pontos';
      div.setAttribute('aria-label', p.nome + ' ' + PAT_DIV[k] + ', a partir de ' + fmtNum(p.cortes[k]) + ' pontos' + (i === e.i && k === e.k ? ' (você está aqui)' : ''));
      col.appendChild(div);
    }
    grade.appendChild(col);
  });
  el.querySelector('.v79-pat-nota').textContent = typeof v79Regras === 'function' ? v79Regras() : '';
}
window.RachaPatentes79 = {patentes:PATENTES, elo:pts => rqElo(pts), ordens:PAT_ORDENS};
