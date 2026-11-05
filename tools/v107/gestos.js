/* ======================================================================================================================
   RACHA v107 · OS GESTOS DO EMOJI E DAS FALAS (segurar, arrastar para o lado e soltar)
   O pedido (05/11/2026): "Neste vídeo mostrei como funcionam os emojis e msg rápidas no MamoBall: não precisa clicar, é só
   arrastar para o lado que você quer e vai aparecer as msg e emojis." O vídeo era de outro jogo: de lá vem só o JEITO (o
   toque que segura e arrasta); os desenhos, os nomes, as cores e as frases são os do RACHA.
     1) NA PARTIDA (o treino, contra os bots e o online), nos dois botões do lado do placar — o do emoji (v106) e o das falas
        (v93; o das falas só existe nas partidas, como antes) —: segurar e arrastar sem tirar o dedo. Assim que o dedo anda
        (ou fica parado um instante), aparece no MEIO DA TELA a cruz dos 5 daquele botão (cima, esquerda, meio, direita e
        baixo: os 5 emojis da cruz da v106 ou as 5 frases da cruz nova) e, em volta do botão, o aro do analógico pequeno (o
        botão vai um pouco junto com o dedo, dentro do aro com as 4 setinhas), com o X de cancelar do lado de fora. Para onde o
        dedo vai (a partir de onde tocou) acende uma opção (o brilho laranja e a setinha daquele lado); parado perto do começo,
        a do meio. SOLTAR manda a acesa (o balão de sempre em cima da tampinha); soltar em cima do X — ou o sistema tirar o
        dedo — não manda nada.
     2) O TOQUE RÁPIDO é o de sempre: tocar e soltar logo, sem arrastar, abre a cruz da v106 ou o menu das 8 frases da v93 (e
        tocar numa opção manda). O teclado (E e 1 a 5; T e 1 a 8) e o controle também continuam.
     3) Cada gesto tem o seu dedo (o pointerId do toque no botão, preso nele): o analógico, o PASSE e o CHUTE continuam com os
        outros dedos — dá para correr com um dedão e mandar o emoji com o outro. O aro, o X e a cruz não pegam toque nenhum
        (pointer-events: none): um dedo que pousar em cima deles cai no jogo, como sempre.
     4) O ritmo de sempre (o do aparelho e o do servidor: quem manda é o emo106Manda e o v93FalaManda), o Reduzir animações
        (sem as transições), os emojis dos outros (decididos do lado de quem recebe, como antes) e os rótulos para o leitor de
        tela. Nada cobre os controles, a pausa nem o placar (o aro, o X e a cruz procuram o lugar livre; a cruz encolhe se
        precisar).
     5) A CRUZ DAS FRASES: as 5 do gesto (das 8 frases da v93: Golaço! em cima, Boa! à esquerda, Passa! no meio, Que defesa!
        à direita e Foi mal! embaixo, no começo), guardada em racha-falas-v107 (que vai na cópia do progresso da conta:
        tools/v82/inicio.js e app/contracts/progresso.ts). As 8 continuam no toque rápido.
     6) O COFRE › EMOJI ganha a troca EMOJIS | FRASES em cima da grade: em FRASES, a cruz das 5 frases (tocar num lugar acende;
        tocar numa frase da grade põe no lugar aceso; o PADRÃO volta as de fábrica), no mesmo estilo da cruz dos emojis.
   A API para os testes: window.RachaGestos107. Nada aqui mexe na física, na bola, nos comandos nem no bloco PHYS: só os dois
   botões (o toque), a tela por cima e uma chave a mais no armazenamento.
   ====================================================================================================================== */

/* ---------------------------------------------------------------- 1) a cruz das frases (5 das 8 da v93) */
const GES107_LUGARES = ['cima', 'esquerda', 'meio', 'direita', 'baixo'];
const GES107_NOMES = ['CIMA', 'ESQUERDA', 'MEIO', 'DIREITA', 'BAIXO'];
const GES107_FRASES_PADRAO = [0, 3, 2, 1, 4];                  // Golaço! · Boa! · Passa! · Que defesa! · Foi mal! (os índices da V93F_FRASES)
const GES107_CHAVE = 'racha-falas-v107';                       // (vai na cópia do progresso da conta — tools/v82/inicio.js)
const GES107_TOQUE_MS = 220;                                   // (soltar antes disso, sem arrastar, é o toque de sempre)
const GES107_FOLGA = 9;                                        // (px: o dedo que anda mais que isso já é o gesto)
const GES107 = {frases:GES107_FRASES_PADRAO.slice(), ouvintes:new Set(), g:null, el:{}, engole:null, enviados:[], cancelados:0, toques:0,
  gestos:0, ultimo:null, geo:null, cofre:'emojis', cofreSlot:2, erros:0, vigia:0};
function ges107Erro(onde, e){ if (GES107.erros++ < 4) console.error('v107 gestos (' + onde + ')', e); }
function ges107Frases93(){ return typeof V93F_FRASES !== 'undefined' && Array.isArray(V93F_FRASES) ? V93F_FRASES : []; }
function ges107Norma(s){                                       // 5 frases diferentes da lista (o que faltar vem do padrão)
  const n = ges107Frases93().length || 8, L = [], usados = new Set();
  for (let i = 0; i < 5; i++){ const v = Array.isArray(s) ? s[i] : null; if (Number.isInteger(v) && v >= 0 && v < n && !usados.has(v)){ L[i] = v; usados.add(v); } else L[i] = null; }
  const sobra = GES107_FRASES_PADRAO.concat(Array.from({length:n}, (_, i) => i));
  for (let i = 0; i < 5; i++) if (L[i] == null){ L[i] = !usados.has(GES107_FRASES_PADRAO[i]) ? GES107_FRASES_PADRAO[i] : sobra.find(v => !usados.has(v)); usados.add(L[i]); }
  return L;
}
function ges107Le(){ try { const o = JSON.parse(localStorage.getItem(GES107_CHAVE) || 'null'); GES107.frases = ges107Norma(o && o.s); } catch (_) { GES107.frases = GES107_FRASES_PADRAO.slice(); } }
function ges107Grava(){ try { localStorage.setItem(GES107_CHAVE, JSON.stringify({v:1, s:GES107.frases})); } catch (_) {} }
function ges107Avisa(){ const s = GES107.frases.slice(); for (const f of [...GES107.ouvintes]) try { f(s.slice()); } catch (e) { ges107Erro('mudou', e); } }
const ges107Num = v => typeof v === 'number' ? v : typeof v === 'string' && /^\s*\d+\s*$/.test(v) ? Number(v) : NaN;   // (só número: o null não vira 0)
function ges107PoeFrase(lugar, i){                             // troca o lugar (0 a 4); a frase que já estava em outro lugar troca com ele
  lugar = ges107Num(lugar); i = ges107Num(i);
  if (!(Number.isInteger(lugar) && lugar >= 0 && lugar < 5) || !(Number.isInteger(i) && i >= 0 && i < ges107Frases93().length)) return null;
  const s = GES107.frases.slice();
  if (s[lugar] === i) return s;
  const j = s.indexOf(i);
  if (j >= 0) s[j] = s[lugar];
  s[lugar] = i;
  GES107.frases = s;
  ges107Grava(); ges107Avisa();
  try { if (typeof v105Empurra === 'function') v105Empurra(); } catch (_) {}   // (a cópia vai para a conta logo, como a dos emojis)
  return s.slice();
}
function ges107PadraoFrases(){
  if (GES107.frases.join() === GES107_FRASES_PADRAO.join()) return GES107.frases.slice();
  GES107.frases = GES107_FRASES_PADRAO.slice(); ges107Grava(); ges107Avisa();
  try { if (typeof v105Empurra === 'function') v105Empurra(); } catch (_) {}
  return GES107.frases.slice();
}
function ges107Mudou(fn){ if (typeof fn !== 'function') return () => {}; GES107.ouvintes.add(fn); return () => { GES107.ouvintes.delete(fn); }; }
ges107Le();
addEventListener('storage', e => {                             // (outra aba do jogo trocou as frases: esta acompanha)
  try { if (e.key === GES107_CHAVE){ const antes = GES107.frases.join(); ges107Le(); if (GES107.frases.join() !== antes) ges107Avisa(); } } catch (_) {}
});

/* ---------------------------------------------------------------- 2) os dois botões: o que cada um mostra e manda */
const GES107_TIPOS = {
  emoji:{
    bt:() => EMO106.el && EMO106.el.bt, pode:() => emo106Pode(), espera:() => emo106Espera(performance.now()),
    itens:() => EMO106.slots.slice(), nome:id => (window.RachaEmotes106 ? RachaEmotes106.nome(id) : String(id)),
    manda:i => emo106Manda(EMO106.slots[i]), rotulo:'Emojis da partida: arraste até um e solte para mandar'},
  falas:{
    bt:() => V93F.el && V93F.el.bt, pode:() => v93FalaPode(), espera:() => Math.max(0, V93F.ult + V93F_INTERVALO - performance.now()),
    itens:() => GES107.frases.slice(), nome:i => ges107Frases93()[i] || '',
    manda:i => v93FalaManda(GES107.frases[i]), rotulo:'Falas rápidas: arraste até uma e solte para mandar'}
};
const GES107_DICA = 'Toque para abrir. Ou segure e arraste para o lado da opção e solte para mandar; solte no X para cancelar.';

/* ---------------------------------------------------------------- 3) as peças por cima: o aro, o botão que anda, o X e a cruz */
const GES107_SVG_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/></svg>';
const GES107_SVG_CHEV = '<svg viewBox="0 0 24 14" aria-hidden="true"><path d="M3.5 11.5L12 3.5l8.5 8" fill="none" stroke="currentColor" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function ges107Monta(){
  if (GES107.el.cruz) return;
  const wrap = document.getElementById('wrap') || document.body;
  const aro = nodo('div', 'ges107-aro'); aro.hidden = true; aro.setAttribute('aria-hidden', 'true');
  for (const d of ['cima', 'esquerda', 'direita', 'baixo']) aro.appendChild(nodo('i', 'ges107-aro-seta ' + d));
  const pino = nodo('div', 'ges107-pino'); pino.hidden = true; pino.setAttribute('aria-hidden', 'true');
  const x = nodo('div', 'ges107-x'); x.hidden = true; x.setAttribute('role', 'img'); x.setAttribute('aria-label', 'Cancelar: soltar aqui não manda nada'); x.innerHTML = GES107_SVG_X;
  const cruz = nodo('div', 'ges107-cruz'); cruz.hidden = true; cruz.setAttribute('role', 'group');
  const fundo = nodo('i', 'ges107-fundo'); fundo.setAttribute('aria-hidden', 'true'); cruz.appendChild(fundo);
  const chev = ['cima', 'esquerda', 'direita', 'baixo'].map(d => { const c = nodo('i', 'ges107-chev ' + d); c.setAttribute('aria-hidden', 'true'); c.innerHTML = GES107_SVG_CHEV; cruz.appendChild(c); return c; });
  const ops = GES107_LUGARES.map((lugar, i) => { const o = nodo('div', 'ges107-op ' + lugar); o.setAttribute('role', 'img'); o.dataset.i = String(i); cruz.appendChild(o); return o; });
  const vivo = nodo('span', 'ges107-vivo'); vivo.setAttribute('role', 'status'); vivo.setAttribute('aria-live', 'polite');
  const dica = nodo('span', 'ges107-vivo', GES107_DICA); dica.id = 'ges107-dica'; dica.hidden = true;
  wrap.append(aro, pino, x, cruz, vivo, dica);
  GES107.el = {aro, pino, x, cruz, fundo, chev, ops, vivo, dica};
}
function ges107Fala(t){ try { const v = GES107.el.vivo; if (v){ v.textContent = ''; setTimeout(() => { try { v.textContent = t; } catch (_) {} }, 30); } } catch (_) {} }
// a cruz daquele botão: os 5 emojis (desenhados como na cruz da v106) ou as 5 frases (as pílulas brancas das falas)
function ges107PintaCruz(tipo, med){
  const E = GES107.el, T = GES107_TIPOS[tipo], itens = T.itens();
  E.cruz.classList.toggle('emoji', tipo === 'emoji'); E.cruz.classList.toggle('falas', tipo === 'falas');
  E.cruz.setAttribute('aria-label', T.rotulo);
  E.cruz.style.setProperty('--ges107-s', med.s + 'px'); E.cruz.style.setProperty('--ges107-f', med.f + 'px'); E.cruz.style.setProperty('--ges107-h', med.h + 'px');
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  E.ops.forEach((o, i) => {
    const v = itens[i], nome = T.nome(v);
    o.setAttribute('aria-label', nome + ' (' + GES107_LUGARES[i] + ')');
    if (tipo === 'emoji'){
      let c = o.querySelector('canvas');
      if (!c || o.querySelector('b')){ o.textContent = ''; c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true'); o.appendChild(c); }
      const px = Math.max(16, Math.round(med.s*.92*dpr));
      if (c.width !== px || c.dataset.e !== v){
        c.width = c.height = px; c.dataset.e = v;
        const g = c.getContext('2d');
        if (g){ g.clearRect(0, 0, px, px); const r = px/2/1.08; try { emo106Desenha(g, v, px/2 + r*.06, px/2 - r*.04, r, {alcance:1.12}); } catch (e) { ges107Erro('emoji', e); } }
      }
      o.dataset.v = v;
    } else {
      if (o.querySelector('canvas') || !o.querySelector('b')){ o.textContent = ''; o.appendChild(nodo('b')); }
      o.querySelector('b').textContent = nome; o.dataset.v = String(v);
    }
  });
}

/* ---------------------------------------------------------------- 4) o lugar de cada peça (sem cobrir os controles, a pausa nem o placar) */
function ges107Tela(){                                         // a parte da tela que se vê (sem as áreas do entalhe e da barra de gestos)
  let sa = {t:0, r:0, b:0, l:0};
  try { const s = getComputedStyle(document.documentElement), n = v => parseFloat(v) || 0; sa = {t:n(s.paddingTop), r:n(s.paddingRight), b:n(s.paddingBottom), l:n(s.paddingLeft)}; } catch (_) {}
  const T = {l:sa.l, t:sa.t, r:innerWidth - sa.r, b:innerHeight - sa.b};
  try { const c = cv.getBoundingClientRect(); T.c = [(Math.max(c.left, T.l) + Math.min(c.right, T.r))/2, (Math.max(c.top, T.t) + Math.min(c.bottom, T.b))/2, Math.min(c.bottom, T.b) - Math.max(c.top, T.t)]; }
  catch (_) { T.c = [(T.l + T.r)/2, (T.t + T.b)/2, T.b - T.t]; }
  return T;
}
function ges107Obst(bt){                                       // o que as peças não cobrem (em px da página): {c:[x, y, r]} ou {r:[l, t, r, b]}
  const o = [];
  try {
    const c = cv.getBoundingClientRect(), k = c.width/W, hk = HUDX.k || 1;
    for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id); o.push({c:[c.left + e.x*k, c.top + e.y*k, e.r*k + 6], nome:id, peso:1000}); }
    try { const b = BTN_PAUSA; o.push({r:[c.left + b.x*k - 4, c.top + b.y*k - 4, c.left + (b.x + b.w)*k + 4, c.top + (b.y + b.h)*k + 4], nome:'pausa', peso:1000}); } catch (_) {}
    try { const pw = v80PlacarW()*hk; o.push({r:[c.left + (W/2 - pw/2)*k - 3, c.top - 2, c.left + (W/2 + pw/2)*k + 3, c.top + (PLACAR80.y + PLACAR80.h)*hk*k + 4], nome:'placar', peso:1000}); } catch (_) {}
  } catch (_) {}
  const outros = [['jogadores', V93P.el && V93P.el.bt], ['falas', V93F.el && V93F.el.bt], ['emoji', EMO106.el && EMO106.el.bt], ['barra', X49UI.onlinebar]];
  for (const q of document.querySelectorAll('.c81')) outros.push(['chat', q]);
  for (const [nome, x] of outros){
    try {
      if (!x || x === bt || x.hidden || x.closest('[hidden]')) continue;
      const r = x.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || getComputedStyle(x).display === 'none' || getComputedStyle(x).visibility === 'hidden') continue;
      o.push({r:[r.left - 3, r.top - 3, r.right + 3, r.bottom + 3], nome, peso:nome === 'barra' || nome === 'chat' ? 1000 : 200});
    } catch (_) {}
  }
  return o;
}
function ges107Prende(v, a, b){ return Math.max(a, Math.min(b, v)); }
function ges107CustoCirc(cx, cy, r, obst, T){
  let c = 0;
  if (cx - r < T.l - .5 || cy - r < T.t - .5 || cx + r > T.r + .5 || cy + r > T.b + .5) c += 500;
  for (const o of obst){
    if (o.c){ if (Math.hypot(cx - o.c[0], cy - o.c[1]) < r + o.c[2]) c += o.peso; }
    else { const nx = ges107Prende(cx, o.r[0], o.r[2]), ny = ges107Prende(cy, o.r[1], o.r[3]); if (Math.hypot(nx - cx, ny - cy) < r) c += o.peso; }
  }
  return c;
}
function ges107CustoRet(R, obst, T){                           // R = [l, t, r, b]
  let c = 0;
  if (R[0] < T.l - .5 || R[1] < T.t - .5 || R[2] > T.r + .5 || R[3] > T.b + .5) c += 500;
  for (const o of obst){
    if (o.c){ const nx = ges107Prende(o.c[0], R[0], R[2]), ny = ges107Prende(o.c[1], R[1], R[3]); if (Math.hypot(nx - o.c[0], ny - o.c[1]) < o.c[2]) c += o.peso; }
    else if (R[0] < o.r[2] && R[2] > o.r[0] && R[1] < o.r[3] && R[3] > o.r[1]) c += o.peso;
  }
  return c;
}
// o aro em volta do botão (o maior que cabe; sem lugar em volta — o botão na beirada de cima —, ele desce um pouco e o botão vai junto)
function ges107LugarAro(r, obst, T){
  const br = r.w/2, cx0 = r.l + br, cy0 = r.t + r.h/2;
  let m = null;
  for (const k of [1.62, 1.5, 1.4, 1.3]){
    const R = Math.max(br + 6, br*k);
    for (const [ox, oy] of [[0, 0], [0, 3], [0, 6], [0, 9], [0, 12], [0, 15], [0, 19], [-5, 0], [5, 0], [-5, 6], [5, 6], [-8, 9], [8, 9]]){
      const cx = cx0 + ox, cy = cy0 + oy, custo = ges107CustoCirc(cx, cy, R + 2, obst, T) + (1.62 - k)*12 + Math.hypot(ox, oy)*.9;
      if (!m || custo < m.custo) m = {cx, cy, R, br, ox, oy, custo};
    }
  }
  return m;
}
// o X de cancelar: do lado de fora (longe do meio da tela), um pouco para baixo — fora das 4 direções retas, para o arrasto de
// sempre não cair nele sem querer
function ges107LugarX(aro, obst, T){
  const xr = Math.max(16, Math.round(aro.br*.8)), fora = aro.cx < (T.l + T.r)/2 ? -1 : 1, d = aro.R + xr + 6;
  let m = null;
  [38, 22, 55, 0, 70, 90, 125, 145, -25].forEach((a, ordem) => {
    for (const lado of [fora, -fora]){
      const rad = a*Math.PI/180, cx = aro.cx + lado*Math.cos(rad)*d, cy = aro.cy + Math.sin(rad)*d;
      const custo = ges107CustoCirc(cx, cy, xr + 2, obst, T) + ordem*2 + (lado === fora ? 0 : 40);
      if (!m || custo < m.custo) m = {cx, cy, r:xr, custo};
    }
  });
  return m;
}
// as medidas da cruz (o tamanho de cada opção cresce com a tela; no celular deitado, os 5 cabem no meio sem chegar nos controles)
function ges107Medidas(T){
  const h = T.c[2];
  const s = Math.round(ges107Prende(h*.155, 48, 112)), f = Math.round(ges107Prende(h*.046, 14, 28));
  return {s, gap:Math.round(s*.42), f, h:Math.round(f*2.3), gapH:Math.round(f*1.75), gapV:Math.round(f*1.1)};
}
function ges107Posicoes(tipo, med){                            // o meio de cada opção e de cada setinha (em px, a partir do meio da cruz)
  const E = GES107.el, P = [], C = [];
  if (tipo === 'emoji'){
    const d = med.s + med.gap;
    P.push([0, -d], [-d, 0], [0, 0], [d, 0], [0, d]);
    const m = med.s/2 + med.gap/2;
    C.push([0, -m], [-m, 0], [m, 0], [0, m]);
    return {P, C, tam:P.map(() => [med.s, med.s])};
  }
  const w = E.ops.map(o => Math.max(med.h*1.4, o.offsetWidth || med.h*3)), dv = med.h + med.gapV;
  const de = w[2]/2 + med.gapH + w[1]/2, dd = w[2]/2 + med.gapH + w[3]/2;
  P.push([0, -dv], [-de, 0], [0, 0], [dd, 0], [0, dv]);
  C.push([0, -(med.h + med.gapV)/2], [-(w[2] + med.gapH)/2, 0], [(w[2] + med.gapH)/2, 0], [0, (med.h + med.gapV)/2]);
  return {P, C, tam:w.map(x => [x, med.h])};
}
function ges107LugarCruz(tipo, med, obst, T){
  const L = ges107Posicoes(tipo, med), [cx0, cy0] = T.c;
  let m = null;
  [[0, 1], [-12, 1], [12, 1], [-24, 1], [24, 1], [0, .9], [-14, .9], [14, .9], [0, .8], [-16, .8], [16, .8], [0, .72], [-18, .72], [0, .64]].forEach(([dy, esc], ordem) => {
    const cx = cx0, cy = cy0 + dy, rets = L.P.map(([x, y], i) => { const [w, h] = L.tam[i]; return [cx + (x - w/2)*esc, cy + (y - h/2)*esc, cx + (x + w/2)*esc, cy + (y + h/2)*esc]; });
    let custo = ordem*3;
    for (const R of rets) custo += ges107CustoRet([R[0] - 4, R[1] - 4, R[2] + 4, R[3] + 4], obst, T);
    if (!m || custo < m.custo) m = {cx, cy, esc, custo, rets, L};
  });
  return m;
}
function ges107Lugar(){                                        // (no começo do gesto: o aro, o X e a cruz no lugar livre)
  const g = GES107.g, E = GES107.el; if (!g || !E.cruz) return;
  const T = ges107Tela(), obst = ges107Obst(g.bt), wr = (E.cruz.offsetParent || document.getElementById('wrap') || document.body).getBoundingClientRect();
  const aro = ges107LugarAro(g.r, obst, T);
  const obstX = obst.concat([{c:[aro.cx, aro.cy, aro.R + 4], nome:'aro', peso:1000}]);
  const x = ges107LugarX(aro, obstX, T);
  const med = ges107Medidas(T);
  ges107PintaCruz(g.tipo, med);
  E.cruz.style.transform = 'none'; E.cruz.style.left = '0px'; E.cruz.style.top = '0px';
  const obstC = obstX.concat([{c:[x.cx, x.cy, x.r + 4], nome:'x', peso:1000}]);
  const cz = ges107LugarCruz(g.tipo, med, obstC, T);
  // o aro (com as setinhas no meio da faixa entre o botão e a borda)
  const A = E.aro;
  A.style.width = A.style.height = Math.round(2*aro.R) + 'px';
  A.style.left = Math.round(aro.cx - aro.R - wr.left) + 'px'; A.style.top = Math.round(aro.cy - aro.R - wr.top) + 'px';
  A.style.setProperty('--ges107-ra', ((aro.br + aro.R)/2).toFixed(1) + 'px');
  A.style.setProperty('--ges107-sa', Math.max(4, Math.min(7, (aro.R - aro.br)*.62)).toFixed(1) + 'px');
  // o botão que anda (a cópia do desenho do botão, no lugar dele; o de verdade fica parado e transparente)
  const Pn = E.pino;
  Pn.style.width = Pn.style.height = Math.round(g.r.w) + 'px';
  Pn.style.left = Math.round(aro.cx - g.r.w/2 - wr.left) + 'px'; Pn.style.top = Math.round(aro.cy - g.r.h/2 - wr.top) + 'px';
  Pn.style.transform = 'translate(0px, 0px)';
  const svg = g.bt.querySelector('svg'); Pn.textContent = ''; if (svg) Pn.appendChild(svg.cloneNode(true));
  Pn.classList.toggle('falas', g.tipo === 'falas');
  E.x.style.width = E.x.style.height = Math.round(2*x.r) + 'px';
  E.x.style.left = Math.round(x.cx - x.r - wr.left) + 'px'; E.x.style.top = Math.round(x.cy - x.r - wr.top) + 'px';
  // a cruz: o meio dela no meio da tela (ou um pouco acima/abaixo e menor, se precisar), as opções em volta
  const C = E.cruz;
  C.style.left = Math.round(cz.cx - wr.left) + 'px'; C.style.top = Math.round(cz.cy - wr.top) + 'px';
  C.style.transform = cz.esc === 1 ? 'none' : 'scale(' + cz.esc + ')';
  E.ops.forEach((o, i) => { o.style.left = cz.L.P[i][0] + 'px'; o.style.top = cz.L.P[i][1] + 'px'; });
  E.chev.forEach((c, i) => { c.style.left = cz.L.C[i][0] + 'px'; c.style.top = cz.L.C[i][1] + 'px'; c.style.width = Math.round(med.s*.3 + 6) + 'px'; });
  const raio = Math.max(...cz.rets.map(R => Math.max(Math.abs(R[0] - cz.cx), Math.abs(R[2] - cz.cx), Math.abs(R[1] - cz.cy), Math.abs(R[3] - cz.cy))))/cz.esc;
  E.fundo.style.width = E.fundo.style.height = Math.round(2*raio + 24) + 'px';
  E.fundo.style.left = E.fundo.style.top = Math.round(-raio - 12) + 'px';
  // a folga do meio: o dedo que anda menos que isso fica no meio
  const morto = Math.max(12, Math.min(22, g.r.w*.36));          // (o botão encosta na beirada de cima: para cima, o dedo anda pouco)
  GES107.geo = {aro:{cx:aro.cx, cy:aro.cy, R:aro.R, br:aro.br, ox:aro.ox, oy:aro.oy, curso:Math.max(3, aro.R - aro.br - 2), custo:aro.custo},
    x:{cx:x.cx, cy:x.cy, r:x.r, custo:x.custo}, cruz:{cx:cz.cx, cy:cz.cy, esc:cz.esc, custo:cz.custo, rets:cz.rets}, morto, tela:T};
}

/* ---------------------------------------------------------------- 5) o gesto: segurar, arrastar e soltar */
const GES107_MAX_MS = 20000;                                   // (um gesto esquecido — o dedo que sumiu sem aviso — acaba sozinho)
function ges107Comeca(tipo, e){
  const T = GES107_TIPOS[tipo], bt = T.bt();
  if (GES107.g && performance.now() - GES107.g.t0 > GES107_MAX_MS) ges107Fim('cancela');
  if (!bt || bt.hidden || GES107.g || (e.button != null && e.button > 0)) return;
  let pode = false; try { pode = !!T.pode(); } catch (_) {}
  if (!pode) return;
  GES107.engole = null;
  const r = bt.getBoundingClientRect();
  // (ts0: a hora do toque no relógio dos eventos — o celular ocupado pode atrasar a fila, mas não a hora de cada evento)
  const g = GES107.g = {tipo, id:e.pointerId, x0:e.clientX, y0:e.clientY, x:e.clientX, y:e.clientY, t0:performance.now(), ts0:e.timeStamp || performance.now(),
    fase:'armado', sel:'meio', max:0, bt, r:{l:r.left, t:r.top, w:r.width, h:r.height}, ptr:e.pointerType || ''};
  try { bt.setPointerCapture(e.pointerId); } catch (_) {}
  if (e.pointerType === 'mouse') e.preventDefault();            // (o arrasto do mouse não seleciona nada)
  g.timer = setTimeout(() => { try { if (GES107.g === g && g.fase === 'armado') ges107Abre(true); } catch (er) { ges107Erro('abre', er); } }, GES107_TOQUE_MS);
  clearInterval(GES107.vigia); GES107.vigia = setInterval(ges107Vigia, 120);
}
function ges107Abre(porTempo){
  const g = GES107.g; if (!g) return;
  clearTimeout(g.timer);
  g.fase = 'aberto'; g.porTempo = !!porTempo; GES107.gestos++;
  // (uma janela por vez: a cruz do toque, o menu das falas e o painel dos jogadores somem enquanto o dedo segura — e voltam se
  //  no fim era só um toque rápido; mandou ou cancelou, a cruz e o menu fecham de vez)
  document.documentElement.classList.add('ges107-aberto');
  ges107Monta();
  const E = GES107.el;
  for (const k of ['aro', 'pino', 'x', 'cruz']) E[k].hidden = false;
  E.cruz.classList.remove('cancela', 'espera');
  ges107Lugar();
  g.bt.classList.add('ges107-segura');
  ges107Atualiza();
}
function ges107Escolhe(g){                                      // a opção acesa: o X, o meio (perto do começo) ou o lado que mais andou
  const G = GES107.geo, dx = g.x - g.x0, dy = g.y - g.y0, d = Math.hypot(dx, dy);
  if (G && G.x && Math.hypot(g.x - G.x.cx, g.y - G.x.cy) <= G.x.r + 6) return 'cancela';
  const morto = G ? G.morto : 18, antes = g.sel;
  if (d < (antes === 'meio' || antes === 'cancela' ? morto : morto*.7)) return 'meio';
  const ax = Math.abs(dx), ay = Math.abs(dy);
  let hor = ax >= ay;                                           // (na diagonal, o lado de antes fica até o outro passar um pouco)
  if ((antes === 'esquerda' || antes === 'direita') && ay < ax*1.25) hor = true;
  else if ((antes === 'cima' || antes === 'baixo') && ax < ay*1.25) hor = false;
  return hor ? (dx < 0 ? 'esquerda' : 'direita') : (dy < 0 ? 'cima' : 'baixo');
}
function ges107Atualiza(){
  const g = GES107.g, E = GES107.el, G = GES107.geo; if (!g || g.fase !== 'aberto' || !G) return;
  g.sel = ges107Escolhe(g);
  const i = GES107_LUGARES.indexOf(g.sel);
  E.ops.forEach((o, j) => { const on = j === i; if (o.classList.contains('on') !== on) o.classList.toggle('on', on); if (on) o.setAttribute('aria-current', 'true'); else o.removeAttribute('aria-current'); });
  const lado = {cima:0, esquerda:1, direita:2, baixo:3}[g.sel];
  E.chev.forEach((c, j) => { const on = j === lado; if (c.classList.contains('on') !== on) c.classList.toggle('on', on); });
  for (const s of E.aro.children){ const on = s.classList.contains(g.sel); if (s.classList.contains('on') !== on) s.classList.toggle('on', on); }
  E.x.classList.toggle('on', g.sel === 'cancela'); E.cruz.classList.toggle('cancela', g.sel === 'cancela');
  let esp = 0; try { esp = GES107_TIPOS[g.tipo].espera(); } catch (_) {}
  E.cruz.classList.toggle('espera', esp > 0);
  // o botão vai junto com o dedo, um pouco (dentro do aro)
  const dx = g.x - g.x0, dy = g.y - g.y0, d = Math.hypot(dx, dy), t = Math.min(d, G.aro.curso), k = d > 0 ? t/d : 0;
  E.pino.style.transform = 'translate(' + (dx*k).toFixed(1) + 'px, ' + (dy*k).toFixed(1) + 'px)';
  E.pino.classList.toggle('cancela', g.sel === 'cancela');
}
function ges107Move(e){
  const g = GES107.g; if (!g || e.pointerId !== g.id) return;
  g.x = e.clientX; g.y = e.clientY;
  const d = Math.hypot(g.x - g.x0, g.y - g.y0); if (d > g.max) g.max = d;
  if (g.fase === 'armado'){ if (g.max <= GES107_FOLGA) return; ges107Abre(false); }
  else { if (g.max > GES107_FOLGA) g.porTempo = false; ges107Atualiza(); }
  if (e.cancelable) e.preventDefault();
}
function ges107Solta(e){
  const g = GES107.g; if (!g || e.pointerId !== g.id) return;
  if (e.clientX || e.clientY){ g.x = e.clientX; g.y = e.clientY; }
  // o toque rápido (soltou logo, sem arrastar): o clique de sempre abre a cruz / o menu. Vale a hora dos eventos: o gesto que
  // abriu pelo relógio só porque a fila atrasou (o celular ocupado) volta a ser o toque
  const dur = (e.timeStamp || performance.now()) - g.ts0;
  if (g.fase === 'armado' || (g.porTempo && g.max <= GES107_FOLGA && dur < GES107_TOQUE_MS)){
    if (g.fase !== 'armado') GES107.gestos--;
    GES107.toques++; ges107Fim('toque'); return;
  }
  ges107Atualiza();
  GES107.engole = {bt:g.bt, ate:performance.now() + 650};
  const sel = g.sel, tipo = g.tipo;
  if (sel === 'cancela'){ ges107Fim('cancela'); return; }
  ges107Fim();
  ges107Manda(tipo, GES107_LUGARES.indexOf(sel));
}
function ges107Perde(e){                                        // (o sistema tirou o dedo — ou o toque foi parar em outro lugar —: não manda nada)
  const g = GES107.g; if (!g || e.pointerId !== g.id) return;
  if (g.fase !== 'armado') GES107.engole = {bt:g.bt, ate:performance.now() + 650};
  ges107Fim('cancela');
}
function ges107Fim(motivo){
  const g = GES107.g; if (!g) return;
  clearTimeout(g.timer); clearInterval(GES107.vigia); GES107.vigia = 0;
  GES107.g = null;
  if (motivo === 'cancela' && g.fase !== 'armado'){ GES107.cancelados++; GES107.ultimo = {tipo:g.tipo, cancelou:true, t:Math.round(performance.now())}; ges107Fala('Cancelado: nada foi mandado'); }
  try { if (g.bt.hasPointerCapture && g.bt.hasPointerCapture(g.id)) g.bt.releasePointerCapture(g.id); } catch (_) {}
  g.bt.classList.remove('ges107-segura');
  document.documentElement.classList.remove('ges107-aberto');
  if (g.fase !== 'armado' && motivo !== 'toque'){                 // (o gesto foi usado: a cruz do toque e o menu das falas fecham de vez)
    try { if (EMO106.cruz) emo106Cruz(false); } catch (_) {}
    try { if (V93F.menu) v93FalaMenu(false); } catch (_) {}
  }
  const E = GES107.el;
  if (E.cruz){
    for (const k of ['aro', 'pino', 'x', 'cruz']) E[k].hidden = true;
    E.x.classList.remove('on'); E.pino.classList.remove('cancela');
  }
}
function ges107Manda(tipo, i){
  const T = GES107_TIPOS[tipo]; let ok = false, valor = null, nome = '';
  try { valor = T.itens()[i]; nome = T.nome(valor); ok = !!T.manda(i); } catch (e) { ges107Erro('manda', e); }
  const r = {tipo, lugar:GES107_LUGARES[i], i, valor, nome, ok, t:Math.round(performance.now())};
  GES107.enviados.push(r); if (GES107.enviados.length > 20) GES107.enviados.shift();
  GES107.ultimo = r;
  ges107Fala(ok ? nome + ' mandado' : 'Espere um pouco para mandar de novo');
  return ok;
}
function ges107Vigia(){                                         // (a partida parou, o botão sumiu, o replay do gol: o gesto acaba sem mandar)
  const g = GES107.g; if (!g){ clearInterval(GES107.vigia); GES107.vigia = 0; return; }
  let pode = false; try { pode = !!GES107_TIPOS[g.tipo].pode() && !g.bt.hidden && performance.now() - g.t0 < GES107_MAX_MS; } catch (_) {}
  if (!pode){ if (g.fase !== 'armado') GES107.engole = {bt:g.bt, ate:performance.now() + 650}; ges107Fim('cancela'); return; }
  if (g.fase === 'aberto'){ let esp = 0; try { esp = GES107_TIPOS[g.tipo].espera(); } catch (_) {} GES107.el.cruz.classList.toggle('espera', esp > 0); }
}
// o clique que vem depois do gesto (o mouse, ou o toque que andou pouco) não abre a cruz do toque de novo
addEventListener('click', e => {
  try {
    const q = GES107.engole, g = GES107.g, t = e.target;
    const nosBotoes = b => b && t && (b === t || b.contains(t));
    if (g && g.fase === 'aberto' && (nosBotoes(GES107_TIPOS.emoji.bt()) || nosBotoes(GES107_TIPOS.falas.bt()))){ e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (!q) return;
    if (performance.now() > q.ate){ GES107.engole = null; return; }
    if (nosBotoes(q.bt)){ GES107.engole = null; e.preventDefault(); e.stopImmediatePropagation(); }
  } catch (_) {}
}, true);
function ges107Liga(tipo){                                      // o toque nos dois botões (os de sempre: a v106 e a v93 continuam com o clique)
  const bt = GES107_TIPOS[tipo].bt(); if (!bt || bt.dataset.ges107) return;
  bt.dataset.ges107 = tipo;
  bt.setAttribute('aria-describedby', 'ges107-dica');
  const pega = (nome, fn) => bt.addEventListener(nome, e => { try { fn(e); } catch (er) { ges107Erro(nome, er); } });
  pega('pointerdown', e => ges107Comeca(tipo, e));
  pega('pointermove', ges107Move);
  pega('pointerup', ges107Solta);
  pega('pointercancel', ges107Perde);
  pega('lostpointercapture', ges107Perde);
  bt.addEventListener('contextmenu', e => e.preventDefault());   // (segurar no Android não abre o menu do navegador)
}
ges107Monta();
ges107Liga('emoji'); ges107Liga('falas');
addEventListener('resize', () => { try { if (GES107.g){ if (GES107.g.fase !== 'armado') GES107.engole = {bt:GES107.g.bt, ate:performance.now() + 650}; ges107Fim('cancela'); } } catch (_) {} });
addEventListener('blur', () => { try { if (GES107.g) ges107Fim('cancela'); } catch (_) {} });

/* ---------------------------------------------------------------- 6) o COFRE › EMOJI: a troca EMOJIS | FRASES e a cruz das frases */
const GES107_COFRE = [['emojis', 'EMOJIS', 'Emojis: os 5 da cruz do botão do emoji'], ['frases', 'FRASES', 'Frases: as 5 da cruz do botão das falas']];
function ges107CofreRepinta(){ try { if (v88Aberta('cofre') && V106.aba === 'emoji') v106Repinta(); } catch (_) {} }
function ges107CofreTroca(){
  const nav = nodo('nav', 'cf106-sub ges107-cf-troca'); nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', 'Os emojis ou as frases da partida');
  for (const [id, rot, aria] of GES107_COFRE){
    const on = id === GES107.cofre, b = novoBotao('cf106-sub-bt' + (on ? ' on' : ''), aria);
    b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(on)); b.dataset.k = 'emo-modo:' + id; b.textContent = rot;
    b.addEventListener('click', () => { if (id === GES107.cofre) return; try { som.clique(); } catch (_) {} GES107.cofre = id; v106Repinta(); });
    nav.appendChild(b);
  }
  return nav;
}
function ges107CofreBalao(s){                                   // a frase no balão branco das falas (a faixinha laranja e a pontinha)
  const b = nodo('span', 'ges107-cf-balao'); b.setAttribute('aria-hidden', 'true'); b.appendChild(nodo('b', null, s)); return b;
}
function ges107CofreCruz(){
  const F = ges107Frases93(), box = nodo('div', 'cf106-cruz ges107-cf-cruz'); box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Os 5 lugares da cruz das falas');
  for (const d of ['cima', 'esq', 'dir', 'baixo']){ const s = nodo('i', 'cf106-seta ' + d); s.innerHTML = V106_SVG.seta; box.appendChild(s); }
  V106_LUGARES.forEach((nome, i) => {
    const on = i === GES107.cofreSlot, s = F[GES107.frases[i]] || '';
    const b = novoBotao('cf106-lugar l' + i + (on ? ' on' : '') + ' cheio', 'Lugar ' + nome.toLowerCase() + ': ' + s + (on ? ' (aceso)' : ''));
    b.dataset.k = 'lugar-frase:' + i; b.setAttribute('aria-pressed', String(on));
    b.appendChild(nodo('span', 'ges107-cf-tx', s));
    b.addEventListener('click', () => { try { som.clique(); } catch (_) {} GES107.cofreSlot = i; v106Repinta(); });
    box.appendChild(b);
  });
  return box;
}
function ges107CofreFrases(lado, rola, dir){
  const F = ges107Frases93(), S = GES107.frases, i0 = ges107Prende(GES107.cofreSlot | 0, 0, 4);
  v106Pedestal(lado, {topo:{rot:'PADRÃO', aria:'Voltar as 5 frases da cruz para o padrão', k:'topo:padrao-frases', fn:ges107CofrePadrao},
    peca:ges107CofreCruz(), semPedestal:true, cls:'cruz ges107-cf-lado', nome:V106_LUGARES[i0] + ' · ' + (F[S[i0]] || ''), sub:'O LUGAR ACESO'});
  v106Dica(dir, 'Toque num lugar da cruz e depois na frase: ela vai para o lugar aceso (' + V106_LUGARES[i0].toLowerCase() + ')');
  const g = v106GradeEl('ges107-cf-grade');
  F.forEach((s, i) => {
    const lugar = S.indexOf(i);
    g.appendChild(v106Card({k:'frase:' + i, nome:lugar >= 0 ? V106_LUGARES[lugar] : '', st:lugar >= 0 ? 'equipado' : 'seu', mini:ges107CofreBalao(s),
      aria:'Pôr "' + s + '" no lugar ' + V106_LUGARES[i0].toLowerCase() + (lugar >= 0 ? ' (já está no lugar ' + V106_LUGARES[lugar].toLowerCase() + ')' : ''), fn:() => ges107CofrePoe(i)}));
  });
  rola.appendChild(g);
  rola.appendChild(nodo('p', 'cf106-nota ges107-cf-nota', 'Na partida, segure o botão das falas e arraste para o lado da frase (estas 5). Um toque rápido no botão abre as 8.'));
}
function ges107CofrePoe(i){
  const lugar = ges107Prende(GES107.cofreSlot | 0, 0, 4), s = ges107Frases93()[i];
  if (!ges107PoeFrase(lugar, i)){ try { som.erro(); } catch (_) {} return; }
  try { som.compra(); } catch (_) {}
  aviso('"' + s + '" no lugar ' + V106_LUGARES[lugar].toLowerCase() + '!');
  v106Repinta();
}
function ges107CofrePadrao(){ ges107PadraoFrases(); aviso('As 5 frases da cruz voltaram para o padrão.'); v106Repinta(); }
if (typeof v106Emoji === 'function'){                           // (a aba EMOJI de sempre, com a troca em cima; em FRASES, a cruz das falas)
  const v106EmojiAntes107 = v106Emoji;
  v106Emoji = function(lado, rola, dir){
    try { dir.appendChild(ges107CofreTroca()); } catch (e) { ges107Erro('cofre', e); }
    if (GES107.cofre === 'frases') return ges107CofreFrases(lado, rola, dir);
    return v106EmojiAntes107.apply(this, arguments);
  };
  ges107Mudou(() => { if (GES107.cofre === 'frases') ges107CofreRepinta(); });
}

/* ---------------------------------------------------------------- 7) a API (para os testes e quem mais quiser ler) */
window.RachaGestos107 = {
  lugares:() => GES107_LUGARES.slice(),
  todas:() => ges107Frases93().slice(),                                    // as 8 frases da v93 (o toque rápido mostra todas)
  frases:() => GES107.frases.slice(),                                       // a cruz das falas: os índices [cima, esquerda, meio, direita, baixo]
  textos:() => GES107.frases.map(i => ges107Frases93()[i]),
  padrao:() => GES107_FRASES_PADRAO.slice(),
  poeFrase:(lugar, i) => ges107PoeFrase(lugar, i),                          // troca e grava (devolve os 5; null se não deu)
  padraoFrases:() => ges107PadraoFrases(),
  mudouFrases:fn => ges107Mudou(fn),
  cofre:m => { if (m === 'emojis' || m === 'frases'){ GES107.cofre = m; ges107CofreRepinta(); } return GES107.cofre; },
  cofreSlot:() => GES107.cofreSlot,
  cancela:() => { if (GES107.g) ges107Fim('cancela'); return true; },
  estado:() => {
    const g = GES107.g, G = GES107.geo;
    return {ativo:!!g, tipo:g ? g.tipo : null, fase:g ? g.fase : null, sel:g ? g.sel : null, ptr:g ? g.id : null,
      inicio:g ? [g.x0, g.y0] : null, dedo:g ? [g.x, g.y] : null, enviados:GES107.enviados.map(x => Object.assign({}, x)), ultimo:GES107.ultimo ? Object.assign({}, GES107.ultimo) : null,
      cancelados:GES107.cancelados, toques:GES107.toques, gestos:GES107.gestos, frases:GES107.frases.slice(), textos:GES107.frases.map(i => ges107Frases93()[i]),
      geo:G ? JSON.parse(JSON.stringify(G)) : null};
  }
};
