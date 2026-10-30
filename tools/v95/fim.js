/* ======================================================================================================================
   RACHA v95 · O FIM DA PARTIDA NO ESTILO DA IMAGEM ("VITÓRIA DO AZUL"): a tela inteira dividida nas cores dos dois times
   (o de cima e o de baixo, com o xadrez de fundo e a faixa escura no meio), cada jogador na fileira do seu time — a tampinha
   grande (com o emoji), o clube em cima da placa, a placa com o nome na cor do time e os números (gols e assistências; a coroa
   no craque) —, o título grande atravessando a faixa ("VITÓRIA DO LARANJA", "EMPATE") e, do lado, o PLACAR PENDURADO (o
   vidro preso por dois cabos): o placar com o relógio, os gols da partida (quem fez, a assistência e o minuto), os seus números,
   o craque, o prêmio, a patente e os botões de sempre.
   Os mesmos elementos de antes (#fim, #fim-titulo, #fim-v, #fim-a, #fim-stats, #fim-info, #fim-premio, #fim-rq e os botões)
   continuam: só mudam de lugar e de cara. Vale contra os bots (o casual e a ranqueada) e no online (as salas e a ranqueada).
   ====================================================================================================================== */
const EMF = {gols:[], estat:null, craque:null, palco:null, relogio:null, golsEl:null, montado:false};
const V95_CORES = [[0, 'VERMELHO'], [22, 'LARANJA'], [45, 'AMARELO'], [70, 'LIMA'], [150, 'VERDE'], [185, 'CIANO'], [215, 'AZUL'], [255, 'ROXO'], [290, 'ROXO'], [320, 'ROSA'], [345, 'VERMELHO']];
function v95CorNome(hex){                                      // o nome da cor (para o "VITÓRIA DO …"): pelo matiz; claro/escuro sem cor = branco/preto
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!m) return '';
  const n = parseInt(m[1], 16), r = (n >> 16)/255, g = ((n >> 8) & 255)/255, b = (n & 255)/255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn)/2, d = mx - mn;
  if (d < .12) return l > .6 ? 'BRANCO' : l < .3 ? 'PRETO' : 'CINZA';
  let h = mx === r ? ((g - b)/d) % 6 : mx === g ? (b - r)/d + 2 : (r - g)/d + 4; h = (h*60 + 360) % 360;
  let nome = 'VERMELHO', melhor = 999;
  for (const [hh, nn] of V95_CORES){ const dd = Math.min(Math.abs(h - hh), 360 - Math.abs(h - hh)); if (dd < melhor){ melhor = dd; nome = nn; } }
  if (nome === 'LARANJA' && l < .32) return 'MARROM';
  return nome;
}
function v95NomeTime(t){
  try { const a = v95CorNome(rqCor(0).base), b = v95CorNome(rqCor(1).base); if (a && b && a !== b) return t ? b : a; } catch (_) {}
  return t ? 'TIME B' : 'TIME A';
}
const v95Seg = s => { s = Math.max(0, Math.round(s || 0)); return String(Math.floor(s/60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

/* ---------------------------------------------------------------- os gols da partida (quem fez, a assistência, o minuto) */
const v93GolInfoAntes95 = v93GolInfo;
v93GolInfo = function(autor, assist, time){
  const r = v93GolInfoAntes95.apply(this, arguments);
  try {
    const ult = EMF.gols[EMF.gols.length - 1], s = Math.max(0, +RQ.t || 0);
    if (!(ult && Math.abs(ult.s - s) < .3 && ult.time === (time | 0))) EMF.gols.push({time:time | 0, autor:r.autor ? String(r.autor.nome || '') : '', assist:r.assist ? String(r.assist.nome || '') : '', s, placar:RQ.placar ? RQ.placar.slice() : null});
    if (EMF.gols.length > 40) EMF.gols.shift();
  } catch (_) {}
  return r;
};
function v95GolsZera(){ EMF.gols.length = 0; EMF.estat = null; EMF.craque = null; }
const rqCriaAntes95f = rqCria;
rqCria = function(){ v95GolsZera(); return rqCriaAntes95f.apply(this, arguments); };
const net49BeginAntes95 = net49Begin;
net49Begin = function(){ v95GolsZera(); return net49BeginAntes95.apply(this, arguments); };

/* ---------------------------------------------------------------- quem jogou (os dois times) */
function v95FimDados(){
  const online = !!(NET49.playing && NET49.room), ms = online && Array.isArray(NET49.room.members) ? NET49.room.members : [];
  const R = RQ.resultado || {}, placar = Array.isArray(R.placar) ? R.placar : (RQ.placar || [0, 0]);
  const venc = placar[0] > placar[1] ? 0 : placar[1] > placar[0] ? 1 : -1;
  let craque = null;
  try { craque = online ? EMF.craque : V93P.craque; } catch (_) {}
  const times = [0, 1].map(t => ({t, cor:rqCor(t), nome:v95NomeTime(t), gols:placar[t] | 0, jog:[]}));
  (RQ.jog || []).forEach((q, i) => {
    if (!q || (q.time !== 0 && q.time !== 1)) return;
    const eu = q === P && !(online && NET49.localSlot < 0);
    const m = online && q.netId ? ms.find(x => x.id === q.netId) || null : null;
    let skin = '';
    try { skin = eu ? (skinAtual().id || perfil.skin) : m ? m.skin : (online ? q.netSkin : '') || ((skinDoBot(q) || {}).id || ''); } catch (_) {}
    try { if (typeof tpNoTime === 'function' && tpEhCodigo(skin)) skin = tpNoTime(skin, q.time); } catch (_) {}   // (a inicial na cor do time, como na partida)
    let e = null;
    if (online){ const L = Array.isArray(EMF.estat) ? EMF.estat : []; e = L.find(x => q.netId && x.k === q.netId) || L.find(x => x.bot && x.nome === q.nome && (x.time | 0) === q.time) || null; }
    else { try { e = V93P.estat.get(q === P ? 'eu' : 'b' + i) || null; } catch (_) {} }
    const nome = eu ? perfil.nome : m ? m.name : q.nome || 'Bot';
    let ehCraque = false;
    if (craque){ if (online) ehCraque = craque.k ? craque.k === q.netId : !!craque.bot && craque.nome === nome; else ehCraque = craque.k === (q === P ? 'eu' : 'b' + i); }
    let clube = '';
    try { clube = eu ? ((V70ON.clubeConta && V70ON.clubeConta.nome) || (m && m.club && m.club.name) || '') : m && m.club ? m.club.name || '' : ''; } catch (_) {}
    times[q.time].jog.push({nome:String(nome || 'Jogador'), skin, emoji:emjDe(q), clube:String(clube || ''), eu, bot:!eu && !m, g:e ? e.g | 0 : eu ? (R.golsH | 0) : 0, a:e ? e.a | 0 : eu ? (R.assistH | 0) : 0, craque:ehCraque});
  });
  let rel = '';                                                // o relógio do fim, como o do placar da partida (o que faltava; na prorrogação, o que passou)
  try {
    const L = RQ.v80, s = typeof v80Relogio === 'function' ? +v80Relogio() || 0 : +RQ.t || 0, lim = RQ.tempoLim || 0;
    rel = L && L.seg ? (RQ.prorrog ? '+' + v95Seg(s - L.seg) : v95Seg(Math.max(0, L.seg - s))) : lim > 0 ? v95Seg(Math.max(0, lim - s)) : v95Seg(s);
  } catch (_) { rel = '00:00'; }
  return {online, placar, venc, times, gols:EMF.gols.slice(), relogio:rel};
}

/* ---------------------------------------------------------------- a tela */
function v95FimMonta(){
  const f = fimEl('fim'); if (!f) return null;
  if (EMF.montado) return f;
  EMF.montado = true;
  f.classList.add('v95-fim');
  const fundo = nodo('div', 'v95-fim-fundo'); fundo.setAttribute('aria-hidden', 'true');
  fundo.append(nodo('i', 'v95-fim-meio'), nodo('i', 'v95-fim-meio2'));
  const palco = nodo('div', 'v95-fim-palco');
  const caixa = f.querySelector('.fim-caixa');
  f.insertBefore(fundo, f.firstChild); f.insertBefore(palco, caixa);
  // o placar pendurado: os cabos, o relógio entre os dois números e a lista dos gols
  if (caixa){
    caixa.classList.add('v95-vidro');
    const cabos = nodo('span', 'v95-cabos'); cabos.setAttribute('aria-hidden', 'true'); caixa.insertBefore(cabos, caixa.firstChild);
    const pl = caixa.querySelector('.fim-placar');
    if (pl){ const x = pl.querySelector('span'); EMF.relogio = nodo('span', 'v95-relogio ct', '00:00'); if (x) x.after(EMF.relogio); else pl.appendChild(EMF.relogio); }
    EMF.golsEl = nodo('ol', 'v95-fim-gols'); EMF.golsEl.setAttribute('aria-label', 'Os gols da partida');
    // o meio do vidro rola sozinho (os gols, o craque, o prêmio, a patente); o título, o placar e os botões ficam no lugar
    try { if (typeof v93CraqueEl === 'function') v93CraqueEl(); } catch (_) {}      // (o cartão do craque nasce agora, no lugar dele)
    const meio = nodo('div', 'v95-meio'), acoes = caixa.querySelector('.fim-acoes');
    meio.appendChild(EMF.golsEl);
    for (const id of ['fim-stats', 'v93-craque', 'fim-info', 'fim-premio', 'fim-rq']){ const el = document.getElementById(id); if (el && caixa.contains(el)) meio.appendChild(el); }
    if (acoes) caixa.insertBefore(meio, acoes); else caixa.appendChild(meio);
  }
  EMF.palco = palco;
  return f;
}
function v95Card(j, t, i, cor){
  const li = nodo('li', 'v95-fj' + (j.eu ? ' eu' : '') + (j.bot ? ' bot' : '') + (j.craque ? ' craque' : ''));
  li.style.setProperty('--i', String(i)); li.style.setProperty('--tc', cor.base); li.style.setProperty('--tc2', cor.escuro); li.style.setProperty('--tc3', cor.claro);
  const tampa = nodo('span', 'v95-fj-tampa');
  let cv = null;
  try { cv = emjMiniatura(j.skin, j.emoji, 104); } catch (_) {}
  if (!cv || !cv.width){ cv = document.createElement('canvas'); cv.width = cv.height = 104; }
  cv.className = 'v95-fj-cv'; cv.setAttribute('aria-hidden', 'true');
  tampa.appendChild(cv);
  if (j.craque){ const c = nodo('b', 'v95-fj-coroa'); c.innerHTML = '<svg viewBox="0 0 64 44" aria-hidden="true"><path d="M5 40L2 9l16 13L32 2l14 20L62 9l-3 31z" fill="#ffd23f" stroke="#3a2400" stroke-width="4" stroke-linejoin="round"/><circle cx="32" cy="29" r="5" fill="#ff4a3d" stroke="#3a2400" stroke-width="3"/></svg>'; tampa.appendChild(c); }
  if (j.eu) tampa.appendChild(nodo('em', 'v95-fj-voce', 'VOCÊ'));
  li.appendChild(tampa);
  li.appendChild(nodo('small', 'v95-fj-clube', j.clube || (j.bot ? 'BOT' : ' ')));
  const placa = nodo('b', 'v95-fj-placa'); placa.appendChild(nodo('span', null, j.nome)); li.appendChild(placa);
  const n = nodo('span', 'v95-fj-num');
  if (j.g) n.appendChild(nodo('em', 'g', '⚽ ' + j.g)); if (j.a) n.appendChild(nodo('em', 'a', '👟 ' + j.a));
  if (!j.g && !j.a) n.appendChild(nodo('em', 'z', '—'));
  li.appendChild(n);
  li.setAttribute('aria-label', j.nome + (j.eu ? ' (você)' : '') + (j.clube ? ', ' + j.clube : '') + ': ' + j.g + (j.g === 1 ? ' gol' : ' gols') + ', ' + j.a + (j.a === 1 ? ' assistência' : ' assistências') + (j.craque ? ', craque da partida' : ''));
  return li;
}
function v95FimPinta(){
  const f = v95FimMonta(); if (!f || !EMF.palco) return;
  const D = v95FimDados();
  const c0 = D.times[0].cor, c1 = D.times[1].cor;
  f.style.setProperty('--c0', c0.base); f.style.setProperty('--c0e', c0.escuro); f.style.setProperty('--c0c', c0.claro);
  f.style.setProperty('--c1', c1.base); f.style.setProperty('--c1e', c1.escuro); f.style.setProperty('--c1c', c1.claro);
  f.classList.toggle('v95-v0', D.venc === 0); f.classList.toggle('v95-v1', D.venc === 1); f.classList.toggle('v95-emp', D.venc < 0);
  const P0 = EMF.palco; P0.textContent = '';
  const fila = t => {
    const T = D.times[t], s = nodo('section', 'v95-fim-time t' + t + (D.venc === t ? ' venceu' : D.venc < 0 ? '' : ' perdeu'));
    s.setAttribute('aria-label', T.nome + ': ' + T.gols + (T.gols === 1 ? ' gol' : ' gols'));
    const ul = nodo('ul', 'v95-fim-jogs'); ul.style.setProperty('--n', String(Math.max(1, T.jog.length)));
    T.jog.forEach((j, i) => ul.appendChild(v95Card(j, t, i + t*4, T.cor)));
    s.appendChild(ul);
    return s;
  };
  const tit = nodo('div', 'v95-fim-tit');
  const txt = D.venc < 0 ? 'EMPATE' : 'VITÓRIA DO ' + D.times[D.venc].nome;
  const h = nodo('h3', 'v95-fim-grande', txt); h.setAttribute('data-txt', txt);
  if (D.venc >= 0) h.style.setProperty('--tc', D.times[D.venc].cor.base), h.style.setProperty('--tc3', D.times[D.venc].cor.claro);
  tit.appendChild(h);
  P0.append(fila(0), tit, fila(1));
  // o placar pendurado: o relógio e os gols
  if (EMF.relogio) EMF.relogio.textContent = D.relogio;
  const G = EMF.golsEl;
  if (G){
    G.textContent = '';
    for (const x of D.gols.slice(-8)){
      const cor = D.times[x.time] ? D.times[x.time].cor : c0;
      const li = nodo('li', 'v95-gol t' + x.time); li.style.setProperty('--tc', cor.base); li.style.setProperty('--tc2', cor.escuro);
      const l1 = nodo('span', 'v95-gol-l1'); l1.append(nodo('i', 'v95-gol-bola', '⚽'), nodo('b', null, x.autor || 'Gol contra'), nodo('time', null, v95Seg(x.s)));
      li.appendChild(l1);
      if (x.assist){ const l2 = nodo('span', 'v95-gol-l2'); l2.append(nodo('i', null, '👟'), nodo('span', null, x.assist)); li.appendChild(l2); }
      G.appendChild(li);
    }
    G.hidden = !D.gols.length;
  }
  f.classList.add('v95-anima'); void f.offsetWidth;
}
// o fim contra os bots (e o online: o net49Result chama o rqMostraFim)
const rqMostraFimAntes95 = rqMostraFim;
rqMostraFim = function(){
  const r = rqMostraFimAntes95.apply(this, arguments);
  try { if (fimAberto()) v95FimPinta(); } catch (e) { console.error('v95 fim', e); }
  return r;
};
const net49ResultAntes95 = net49Result;
net49Result = function(m){
  try { if (m && Array.isArray(m.estat)) EMF.estat = m.estat; if (m) EMF.craque = m.craque || null; } catch (_) {}
  const r = net49ResultAntes95.apply(this, arguments);
  try { if (fimAberto()) v95FimPinta(); } catch (e) { console.error('v95 fim', e); }
  return r;
};
const fechaFimAntes95 = fechaFim;
fechaFim = function(){ const r = fechaFimAntes95.apply(this, arguments); try { const f = fimEl('fim'); if (f) f.classList.remove('v95-anima'); } catch (_) {} return r; };
window.RachaFim95 = {dados:v95FimDados, pinta:v95FimPinta, gols:() => EMF.gols.slice(), corNome:v95CorNome};
