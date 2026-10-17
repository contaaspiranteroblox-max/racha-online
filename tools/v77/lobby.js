/* ======================================================================================================================
   RACHA rua v77 · O LOBBY DA IMAGEM ENVIADA (o pedido: "o lobby quero assim, o fundo igual esse da imagem também … só não
   deixe essas tampinhas ali embaixo do lobby: tem que entrar nas skins para trocar de roupa").
   Qual implementação valia: o lobby da v71 (tools/v71/lobby.js + v71.css: os botões quadrados dos lados, o topo, os DESAFIOS,
   o MODO e o JOGAR), o fundo da v75 (tools/v75/lobby.js embrulhando o window.RUA_CENA) e a tampinha desenhada pelo
   pintaBrilho (jogo-base) no canvas LB.brilho, com a bola do lado. A v77 embrulha de novo, sem apagar nada:
   · o FUNDO é a imagem enviada limpa (tools/v77/fundo_lobby.webp: sem os botões, o letreiro e a tampinha; o LaMa completou o
     que estava embaixo deles), cobrindo a tela, com o meio da quadra embaixo da tampinha. Sem a imagem, fica o da v75;
   · o LETREIRO é o da imagem (RACHA com a coroa e a faixa FUTEBOL DE RUA), em cima da tampinha (o "RACHA" escrito fica de
     reserva, se a imagem não abrir);
   · os botões dos lados com os ÍCONES da imagem; à direita entra o EVENTOS (a Copa dos Amigos); em cima, moedas e gemas com o +,
     o chat, os AMIGOS e os ajustes; você com o XP em números e a liga com a barra do elo;
   · a TAMPINHA no meio, reta, do tamanho da imagem, com a sombra no chão (sem a bola e sem o anel colorido);
   · embaixo, os DESAFIOS com o prêmio na pilha de moedas, o MODO escuro (o tamanho grande: 2 VS 2; embaixo, o modo e o mapa) e o
     JOGAR. Não tem fileira de tampinhas: trocar de tampinha é na TAMPINHA (o botão), como antes.
   São os mesmos botões (os mesmos ids e cliques); o visual mora no v77.css. Nada aqui mexe em partida, física, rede ou conta.
   ====================================================================================================================== */
const V77L = {on:false, esc:.82, anc:[917, 548]};          // esc: a tampinha do tamanho da imagem · anc: onde ela fica na imagem (px)

/* ---- o fundo: a imagem limpa cobrindo a tela, a tampinha da imagem embaixo da tampinha do jogo ---- */
function l77Encaixe(w, h, cx, cy){
  const F = V77P.fundo, iw = F.w, ih = F.h, s = Math.max(w/iw, h/ih);
  let x = cx - V77L.anc[0]*s, y = cy - V77L.anc[1]*s;
  x = Math.min(0, Math.max(w - iw*s, x)); y = Math.min(0, Math.max(h - ih*s, y));
  return {x, y, s, W:iw*s, H:ih*s};
}
function l77Veu(g, w, h){                                   // só um pouco de escuro em cima e embaixo (a imagem é viva; os botões são escuros)
  g.save();
  const gb = g.createLinearGradient(0, h, 0, h - 230); gb.addColorStop(0, 'rgba(6,8,12,.42)'); gb.addColorStop(1, 'rgba(6,8,12,0)'); g.fillStyle = gb; g.fillRect(0, h - 230, w, 230);
  const gt = g.createLinearGradient(0, 0, 0, 140); gt.addColorStop(0, 'rgba(6,8,12,.3)'); gt.addColorStop(1, 'rgba(6,8,12,0)'); g.fillStyle = gt; g.fillRect(0, 0, w, 140);
  g.restore();
}
function l77Cena(g, w, h, cx, cy){
  const E = l77Encaixe(w, h, cx, cy);
  g.save();
  try { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; } catch (_) {}
  g.drawImage(V77.img.fundo, E.x, E.y, E.W, E.H);
  g.restore();
  l77Veu(g, w, h);
  return true;
}
(function(){
  const cenaAntes77 = typeof window.RUA_CENA === 'function' ? window.RUA_CENA : null;
  window.RUA_CENA = function(g, w, h, chao, cx, esq, dir, zonas, X){
    if (V77L.on && V77P.fundo && V77.ok.fundo && !window.RUA_FUNDO77_DESLIGA){
      try { return l77Cena(g, w, h, cx, chao - 92); } catch (e) { window.RUA_LOBBY77_ERRO = String(e && e.stack); }
    }
    return cenaAntes77 ? cenaAntes77.apply(this, arguments) : false;   // (sem a imagem: o fundo da v75)
  };
  v77Quando('fundo', () => { try { LB.fundo.dataset.k = ''; pintaFundoLobby(); } catch (_) {} });
})();

/* ---- a tampinha no lugar da imagem: um pouco mais para baixo (o letreiro cabe em cima dela) ---- */
if (window.RUA_LOBBY && typeof RUA_LOBBY.layout === 'function'){
  const layoutAntes77 = RUA_LOBBY.layout;
  RUA_LOBBY.layout = function(P, palco){
    const r = layoutAntes77.apply(this, arguments);
    if (V77L.on){ P.cy = Math.round(P.h*.642); palco.style.setProperty('--rx-cy', P.cy + 'px'); }
    return r;
  };
}

/* ---- a tampinha reta no meio da quadra, com a sombra no chão (sem a bola do lado e sem o anel colorido) ---- */
const pintaBrilhoAntes77 = pintaBrilho;
pintaBrilho = function(t){
  if (!V77L.on) return pintaBrilhoAntes77.apply(this, arguments);
  const c = LB.brilho, g = c.getContext('2d'), k = c.width/EMB.w;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
  g.setTransform(k, 0, 0, k, 0, 0);
  const sk = skinAtual(), R = EMB.R*V77L.esc, x = EMB.w/2, y0 = EMB.oy, bob = Math.sin(t*1.7)*3, y = y0 + bob;
  const p = som.pulso(), bat = p >= 0 ? p : 0;
  let gr = g.createRadialGradient(x, y0 + R*.9, 6, x, y0 + R*.9, R*2.2);         // a luz do fim de tarde no chão, de leve
  gr.addColorStop(0, 'rgba(255,196,110,' + (.16 + .06*bat).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,196,110,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y0 + R*.9, R*2.2, R*.55, 0, 0, TAU); g.fill();
  g.save(); g.translate(x + R*.06, y0 + R*.97); g.scale(1 - bob*.006, .2);        // a sombra (escura, embaixo da tampinha)
  gr = g.createRadialGradient(0, 0, 6, 0, 0, R*1.18); gr.addColorStop(0, 'rgba(4,4,8,.72)'); gr.addColorStop(.6, 'rgba(4,4,8,.42)'); gr.addColorStop(1, 'rgba(4,4,8,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R*1.18, 0, TAU); g.fill(); g.restore();
  EMB.pop = Math.max(0, EMB.pop - .06);
  const z = 1 + Math.sin(EMB.pop*Math.PI)*.07;
  g.save(); g.translate(x, y); g.scale(z, z);
  botaoPronto(g, 0, 0, R, sk, perfil.avatar, {t, bx:null, by:null, id:0, humor:''}, k*z);
  g.restore();
};

/* ---- os botões: os ícones da imagem, o EVENTOS, o topo, os DESAFIOS e o MODO ---- */
const V77_SVG = {
  troca:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5h13.5l-3.6-3.6M20 15.5H6.5l3.6 3.6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
(function v77Lobby(){
  const rx = document.getElementById('rx'), topo = LB.palco && LB.palco.querySelector('.lb-topo');
  if (!rx || !topo || !LB.jogar || !LB.modo || !V71L.pronto || !V77IC) return;   // (sem o lobby da v71 ou sem os ícones: fica o de antes)
  V77L.on = true;
  LB.raiz.classList.add('v77');
  const q = s => rx.querySelector(s);
  const poeIcone = (b, nome, w, h) => { if (!b) return; const i = b.querySelector(':scope > i'); if (!i) return; i.textContent = ''; i.appendChild(v77Ic(nome, w, h)); i.classList.add('v77-ic-box'); };
  // os botões dos lados: o desenho da imagem no lugar do da v71
  for (const [sel, nome] of [['.rx-bt[data-loja]', 'loja'], ['[data-rx="skins"]', 'tampinha'], ['[data-rx="clube"]', 'clube'], ['[data-rx="treino"]', 'treino'],
                             ['.v71-dir [data-rx="salas"]', 'salas'], ['[data-rx="amigos"]', 'amigos'], ['[data-rx="ranking"]', 'ranking']]) poeIcone(q(sel), nome, 92, 76);
  // EVENTOS: a Copa dos Amigos (o torneio 1v1 da turma), no fim da coluna da direita
  const dir = rx.querySelector('.v71-dir');
  if (dir && !dir.querySelector('.v77-eventos')){
    const ev = novoBotao('rx-bt rx-duas v71-tile v77-eventos', 'Eventos');
    ev.append(nodo('i'), nodo('b', null, 'EVENTOS'));
    poeIcone(ev, 'eventos', 92, 76);
    ev.addEventListener('click', () => { abreTela('copa'); });
    dir.appendChild(ev);
  }
  // o topo: o seu XP em números e a barra do elo na LIGA
  const euTx = LB.eu && LB.eu.querySelector('.tp-eu-tx');
  if (euTx && !euTx.querySelector('.v77-xp')){ const s = nodo('span', 'v77-xp'); s.id = 'v77-xp'; euTx.appendChild(s); }
  const liga = topo.querySelector('.v71-liga');
  if (liga && !liga.querySelector('.v77-liga-barra')){ const b = nodo('span', 'v77-liga-barra'); b.setAttribute('aria-hidden', 'true'); b.appendChild(nodo('i')); liga.appendChild(b); }
  // à direita: o chat, os AMIGOS (novo) e os ajustes (com a engrenagem da imagem)
  if (LB.chat && LB.ajustes && !topo.querySelector('.v77-amg')){
    const amg = novoBotao('tp-ic v77-amg', 'Amigos'); amg.appendChild(v77Ic('amigos_topo', 56, 46));
    amg.addEventListener('click', () => { som.clique(); v77AbreAmigos(); });
    LB.ajustes.insertAdjacentElement('beforebegin', amg);
    const sv = LB.ajustes.querySelector('svg'); if (sv) sv.replaceWith(v77Ic('ajustes_topo', 54, 54));
  }
  // o letreiro da imagem em cima da tampinha (o "RACHA" escrito fica de reserva)
  const marca = rx.querySelector('.rx-marca');
  if (marca && V77P.letreiro && !marca.querySelector('.v77-letreiro')){
    const im = nodo('img', 'v77-letreiro'); im.alt = 'RACHA · Futebol de Rua'; im.src = V77P.letreiro.src; im.width = V77P.letreiro.w; im.height = V77P.letreiro.h;
    im.decoding = 'async'; im.draggable = false;
    marca.insertBefore(im, marca.firstChild);
    v77Quando('letreiro', () => marca.classList.add('v77-com-letreiro'));
  }
  // DESAFIOS: a estrela da imagem e o prêmio na pilha de moedas
  if (LB.missoes){
    const sv = LB.missoes.querySelector(':scope > svg'); if (sv) sv.replaceWith(v77Ic('desafios', 74, 74, 'v77-mi-ic'));
    const pr = LB.missoes.querySelector('.mi-premio'), mo = pr && pr.querySelector('i'); if (mo) mo.replaceWith(v77Ic('pilha', 66, 54, 'v77-pilha'));
  }
  // o MODO: o campo da imagem; o tamanho grande (2 VS 2) e embaixo, com as setinhas de trocar, o modo e o mapa
  const ic = LB.modo.querySelector('.v71-modo-ic'); if (ic){ ic.textContent = ''; ic.appendChild(v77Ic('campo', 62, 70)); ic.dataset.j = 'v77'; }
  const sm = LB.modo.querySelector('.v71-modo-tx small');
  if (sm && !LB.modo.querySelector('.v77-modo-sub')){ const s = nodo('span', 'v77-modo-sub'); s.innerHTML = V77_SVG.troca; s.appendChild(nodo('span', 'v77-modo-nm')); sm.insertAdjacentElement('afterend', s); }
  v77LbSync();
})();
function v77AbreAmigos(){                                    // AMIGOS: a lista da conta (na plataforma) ou a tela AMIGOS do jogo
  try { const p = window.parent; if (p && p !== window && typeof p.RACHA_ABRIR === 'function' && p.RACHA_ABRIR('/amigos')) return; } catch (_) {}
  abreTela('comunidade');
}
function v77LbSync(){                                       // depois de cada lbRender (e do v71LbSync): os números e o MODO
  if (!V77L.on) return;
  try {
    const nv = nivelInfo(CONTA.xp), xp = document.getElementById('v77-xp');
    if (xp){ const t = fmtNum(nv.atual) + ' / ' + fmtNum(nv.prox); if (xp.textContent !== t) xp.textContent = t; }
    const e = rqElo(CONTA.rq.pts), bar = document.querySelector('#lb .v77-liga-barra i');
    if (bar) bar.style.width = (100*Math.max(0, Math.min(1, e.pct || 0))).toFixed(1) + '%';
    const id = mdValida(X49.jogo), md = MD_MAP.get(id) || {nome:'Futebol'}, n = X49.n || 2, campo = CAMPOS[X49.map] || CAMPOS[0];
    const b = LB.modo.querySelector('.v71-modo-tx b'), nm = LB.modo.querySelector('.v77-modo-nm');
    const tam = n + ' VS ' + n, sub = md.nome.toUpperCase() + ' · ' + campo.nome.toUpperCase();
    if (b && b.textContent !== tam) b.textContent = tam;
    if (nm && nm.textContent !== sub) nm.textContent = sub;
    const ic = LB.modo.querySelector('.v71-modo-ic'); if (ic && ic.dataset.j !== 'v77'){ ic.textContent = ''; ic.appendChild(v77Ic('campo', 62, 70)); ic.dataset.j = 'v77'; }
  } catch (_) {}
}
const lbRenderAntes77 = lbRender;
lbRender = function(){ const r = lbRenderAntes77.apply(this, arguments); v77LbSync(); return r; };
const renderRanqueadaAntes77 = renderRanqueada;
renderRanqueada = function(){ const r = renderRanqueadaAntes77.apply(this, arguments); v77LbSync(); return r; };
try { EMB.leveFeito = false; lbLayout(); lbRender(); } catch (_) {}   // (o lobby já foi montado antes daqui: arruma de novo, já com a v77)
