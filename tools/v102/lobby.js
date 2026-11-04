/* ======================================================================================================================
   RACHA v102 · O LOBBY COM MENOS COISA NA TELA
   O pedido (03/11/2026): "cria um lobby com menos informações tá muito confuso". Eram 26 coisas para tocar na tela inicial;
   agora são 13, e a tampinha e o JOGAR ficam sozinhos no centro das atenções:
   · em cima: o PERFIL (esquerda); as MOEDAS, as GEMAS, o CORREIO e o MENU (direita) — a patente, o chat, os ajustes e o sinal
     foram para o MENU;
   · no meio: a TAMPINHA e UMA vaga do grupo (o +, com GRUPO embaixo; com o grupo formado, as vagas mostram quem está nele);
   · embaixo, na esquerda: a barra com SALAS, TREINO, OFICINA e COFRE; na direita: o MODO (o tamanho do time, a ranqueada e o
     campo, com as setas de trocar) em cima do JOGAR;
   · o MENU (o botão das três barras): a PATENTE (a insígnia, o nome e os pontos; tocar abre as patentes) e LOJA, CLUBE, AMIGOS,
     RANKING, EVENTOS, PASSE RACHA, MISSÕES, CHAT, AJUSTES e CONEXÃO.
     Os números e os pontos vermelhos (os pedidos de amizade, o prêmio das missões, o chat…) aparecem no item e no botão.
   Cada botão novo toca o botão de sempre (escondido): abre exatamente o que já abria. Em pé (a janela estreita) continua o
   lobby de antes. Só arrumação: partida, física, rede, conta, moedas e gemas não mudam.
   ====================================================================================================================== */
const V102L = {on:false, doca:null, menu:null, gaveta:null, fundo:null, pat:null, aberta:false, itens:[], timer:0, fechaT:0};
const V102_MENU_SVG = '<svg class="v91-ic" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g fill="#f6f3ea" stroke="#0d0a24" stroke-width="7" stroke-linejoin="round">'
  + '<rect x="14" y="17" width="72" height="17" rx="8.5"/><rect x="14" y="41.5" width="72" height="17" rx="8.5"/><rect x="14" y="66" width="72" height="17" rx="8.5"/></g></svg>';
const V102_FECHA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>';
const v102Tile = q => () => document.querySelector('#rx .rx-bt.v71-tile' + q);
// [o ícone, o nome, o botão de sempre]
const V102_DOCA = [
  ['salas', 'SALAS', v102Tile('[data-rx="salas"]')],
  ['treino', 'TREINO', v102Tile('[data-rx="treino"]')],
  ['oficina', 'OFICINA', () => document.getElementById('ofi-lobby')],
  ['cofre', 'COFRE', () => document.querySelector('#rx .rx-bt.v71-tile[data-rx="cofre"], #rx .rx-bt.v71-tile[data-rx="skins"]')]
];
const V102_MENU = [
  ['loja', 'LOJA', v102Tile('[data-loja]')],
  ['clube', 'CLUBE', v102Tile('[data-rx="clube"]')],
  ['amigos', 'AMIGOS', v102Tile('[data-rx="amigos"]')],
  ['ranking', 'RANKING', v102Tile('[data-rx="ranking"]')],
  ['eventos', 'EVENTOS', v102Tile('.v77-eventos')],
  ['bilhete', 'PASSE RACHA', () => document.querySelector('#lb .v88-passe')],
  ['missoes', 'MISSÕES', () => LB.missoes || document.getElementById('lb-missoes')],
  ['chat', 'CHAT', () => LB.chat || document.getElementById('lb-chat')],
  ['ajustes', 'AJUSTES', () => LB.ajustes || document.getElementById('lb-ajustes')],
  ['wifi', 'CONEXÃO', () => (typeof V101 !== 'undefined' && V101.sinal) || null]
];

/* ---------------------------------------------------------------- 1) montar (uma vez, depois da v101) */
function v102Bt(cls, ic, nome, alvo, menu){
  const b = novoBotao(cls, nome.charAt(0) + nome.slice(1).toLowerCase());
  b.appendChild(typeof v101Tem === 'function' && v101Tem(ic) ? v91IcEl(ic, cls + '-ic') : nodo('i', 'v91-ico ' + cls + '-ic'));
  b.appendChild(nodo('b', cls + '-tx', nome));
  b.addEventListener('click', e => {
    e.stopPropagation();
    const o = alvo(); if (!o) return;
    v102Fecha(true);
    if (menu) v102FocoNoMenu();                            // (o foco volta para o MENU quando a janela ou a tela fechar)
    o.click();                                             // (o botão de sempre: o mesmo som, a mesma tela)
  });
  b._alvo = alvo; b._menu = !!menu;
  V102L.itens.push(b);
  return b;
}
function v102Monta(){
  if (V102L.on || typeof V101 === 'undefined' || !V101.on || !LB.raiz || !LB.palco) return;
  const topo = LB.palco.querySelector('.lb-topo'), dir = topo && topo.querySelector('.tp-dir');
  if (!dir) return;
  V102L.on = true;
  LB.raiz.classList.add('v102'); document.documentElement.classList.add('v102');
  // a barra de baixo (esquerda)
  const doca = nodo('nav', 'v102-doca'); doca.setAttribute('aria-label', 'Atalhos');
  for (const [ic, nome, alvo] of V102_DOCA) doca.appendChild(v102Bt('v102-doca-bt', ic, nome, alvo, false));
  LB.palco.appendChild(doca); V102L.doca = doca;
  // o MENU (em cima, depois do correio)
  const m = novoBotao('tp-ic v91-quad v102-menu-bt', 'Menu');
  const ic = nodo('i', 'v91-ico v91-tp-ic'); ic.innerHTML = V102_MENU_SVG; m.appendChild(ic);
  m.setAttribute('aria-haspopup', 'dialog'); m.setAttribute('aria-expanded', 'false');
  m.addEventListener('click', e => { e.stopPropagation(); som.clique(); V102L.aberta ? v102Fecha() : v102Abre(e.detail === 0); });   // (pelo teclado: o foco entra na gaveta)
  dir.appendChild(m); V102L.menu = m;
  // a gaveta do MENU (da direita) e o escuro atrás
  const fundo = nodo('div', 'v102-fundo'); fundo.hidden = true;
  fundo.addEventListener('click', e => { e.stopPropagation(); v102Fecha(); });
  const gav = nodo('div', 'v102-gaveta'); gav.hidden = true;
  gav.setAttribute('role', 'dialog'); gav.setAttribute('aria-modal', 'true'); gav.setAttribute('aria-label', 'Menu');
  gav.addEventListener('click', e => e.stopPropagation());
  const cab = nodo('div', 'v102-gav-cab'); cab.appendChild(nodo('b', 'v102-gav-tit', 'MENU'));
  const x = novoBotao('v102-gav-x', 'Fechar o menu'); x.innerHTML = V102_FECHA_SVG;
  x.addEventListener('click', e => { e.stopPropagation(); som.clique(); v102Fecha(); });
  cab.appendChild(x); gav.appendChild(cab);
  const grade = nodo('div', 'v102-gav-grade');
  grade.appendChild(v102PatMonta());
  for (const [ic2, nome, alvo] of V102_MENU) grade.appendChild(v102Bt('v102-item', ic2, nome, alvo, true));
  gav.appendChild(grade);
  LB.palco.append(fundo, gav); V102L.fundo = fundo; V102L.gaveta = gav;
  v102Marcas();
}

// a PATENTE no alto da gaveta (saiu da barra de cima): a insígnia, o nome e os pontos; tocar abre as patentes (o botão de sempre)
function v102PatMonta(){
  const alvo = () => (typeof V91 !== 'undefined' && V91.pat) || null;
  const b = novoBotao('v102-pat', 'Patente da ranqueada: ver as patentes');
  b.innerHTML = '<i class="v102-pat-ins" aria-hidden="true"></i><span class="v102-pat-tx"><small>PATENTE</small><b>—</b></span>'
    + '<span class="v102-pat-pts">' + (typeof V101_TROFEU === 'string' ? V101_TROFEU : '') + '<b>0</b></span>';
  b.addEventListener('click', e => {
    e.stopPropagation(); v102Fecha(true); v102FocoNoMenu();
    const o = alvo(); if (o) o.click(); else if (typeof v79PatentesAbre === 'function'){ som.clique(); v79PatentesAbre(); }
  });
  b._alvo = alvo; b._menu = true;
  V102L.itens.push(b); V102L.pat = b;
  return b;
}
function v102Pat(){
  const b = V102L.pat; if (!b || typeof rqElo !== 'function' || typeof CONTA === 'undefined') return;
  let pts = 0; try { pts = CONTA.rq.pts | 0; } catch (_) {}
  const e = rqElo(pts), k = e.ordem + '|' + pts;
  if (b.dataset.k === k) return;
  b.dataset.k = k;
  try { b.querySelector('.v102-pat-ins').innerHTML = typeof rqInsignia === 'function' ? rqInsignia(e) : ''; } catch (_) {}
  b.querySelector('.v102-pat-tx b').textContent = e.nome;
  b.querySelector('.v102-pat-pts b').textContent = typeof fmtNum === 'function' ? fmtNum(pts) : String(pts);
  b._nome = 'Patente ' + e.nome + ', ' + pts + ' pontos: ver as patentes';
  b.setAttribute('aria-label', b._nome);
}

/* ---------------------------------------------------------------- 2) abrir e fechar o MENU */
function v102Abre(teclado){
  if (V102L.aberta || !V102L.gaveta) return;
  clearTimeout(V102L.fechaT);
  V102L.aberta = true; v102Marcas();
  V102L.fundo.hidden = false; V102L.gaveta.hidden = false;
  void V102L.gaveta.offsetWidth;                           // (a gaveta entra deslizando)
  V102L.fundo.classList.add('on'); V102L.gaveta.classList.add('on');
  V102L.menu.setAttribute('aria-expanded', 'true');
  if (teclado) try { const p = V102L.gaveta.querySelector('.v102-pat:not([hidden]), .v102-item:not([hidden])'); if (p) p.focus({preventScroll:true}); } catch (_) {}
}
function v102Fecha(rapido){
  if (!V102L.aberta) return;
  V102L.aberta = false;
  V102L.fundo.classList.remove('on'); V102L.gaveta.classList.remove('on');
  V102L.menu.setAttribute('aria-expanded', 'false');
  const some = () => { if (!V102L.aberta){ V102L.fundo.hidden = true; V102L.gaveta.hidden = true; } };
  clearTimeout(V102L.fechaT);
  const dentro = V102L.gaveta.contains(document.activeElement);
  if (rapido) some(); else { V102L.fechaT = setTimeout(some, 200); if (dentro) try { V102L.menu.focus({preventScroll:true}); } catch (_) {} }
}
// o botão de sempre está escondido: quem abriu a janela ou a tela (e recebe o foco de volta quando ela fecha) é o MENU
function v102FocoNoMenu(){ try { if (V102L.menu && V102L.menu.offsetParent !== null) V102L.menu.focus({preventScroll:true}); } catch (_) {} }
window.addEventListener('keydown', e => {                  // o Esc (e o B do controle) fecha o MENU antes de tudo
  if (!V102L.aberta || e.key !== 'Escape') return;
  e.preventDefault(); e.stopImmediatePropagation(); v102Fecha();
}, true);

/* ---------------------------------------------------------------- 3) os números e os pontos (os mesmos dos botões de sempre) */
function v102Marca(o){                                    // (o número da v88 — .v88-selo — ou o do chat de sempre — .tp-badge)
  const s = o.querySelector(':scope > .v88-selo') || o.querySelector(':scope > .tp-badge:not([hidden])'), t = s ? s.textContent.trim() : '';
  const n = s ? (/\+$/.test(t) ? (parseInt(t, 10) || 9) + 1 : (parseInt(t, 10) || 0)) : 0;
  const p = o.classList.contains('rx-ponto') || o.classList.contains('v101-ponto') || (o.id === 'lb-missoes' && o.classList.contains('pronta'));
  return {n, p};
}
function v102Pinta(b, m){
  const k = m && m.n ? 'n' + m.n : m && m.p ? 'p' : '';
  if (b.dataset.v102k === k) return;
  b.dataset.v102k = k;
  let s = b.querySelector(':scope > .v102-selo');
  if (!k){ if (s) s.remove(); }
  else {
    if (!s){ s = nodo('i', 'v102-selo'); s.setAttribute('aria-hidden', 'true'); b.appendChild(s); }
    s.textContent = m.n ? (m.n > 99 ? '99+' : String(m.n)) : '';
    s.classList.toggle('ponto', !m.n);
  }
  const nome = b._nome || (b._nome = b.getAttribute('aria-label') || '');
  b.setAttribute('aria-label', nome + (m && m.n ? ' (' + (m.n > 99 ? '99+' : m.n) + ' novidade' + (m.n > 1 ? 's' : '') + ')' : m && m.p ? ' (tem novidade)' : ''));
}
function v102Marcas(){
  if (!V102L.on) return;
  let soma = 0, ponto = false;
  for (const b of V102L.itens){
    const o = b._alvo();
    const fora = !o || o.hidden || o.classList.contains('v71-fora') || o.style.display === 'none';
    if (b.hidden !== fora) b.hidden = fora;
    const m = fora ? null : v102Marca(o);
    v102Pinta(b, m);
    if (m && b._menu){ soma += Math.min(m.n, 99); ponto = ponto || m.p; }
  }
  if (V102L.menu) v102Pinta(V102L.menu, {n:soma, p:ponto});
}

/* ---------------------------------------------------------------- 4) o MODO: a ranqueada junto do tamanho do time e do campo */
function v102Modo(){                                       // (uma linha própria: a do campo da v101 continua dela)
  if (!LB.modo) return;
  let s = LB.modo.querySelector('.v102-sub');
  if (!s){ const tx = LB.modo.querySelector('.v71-modo-tx'); if (!tx) return; s = nodo('small', 'v102-sub'); tx.appendChild(s); }
  let campo = 'ESTÁDIO'; try { campo = CAMPOS[MAPA_RQ].nome.toUpperCase(); } catch (_) {}
  const t = 'RANQUEADA · ' + campo;
  if (s.textContent !== t) s.textContent = t;
}

/* ---------------------------------------------------------------- 5) os ganchos (depois dos da v101) */
function v102Arruma(){
  if (!V102L.on) return;
  v102Modo(); v102Pat(); v102Marcas();
  if (V102L.aberta && (!lobby.aberto || lobby.tela)) v102Fecha(true);   // (abriu uma tela por outro caminho: o MENU sai da frente)
}
// a altura do MODO: nunca menos de 44 px de verdade (o dedo) — no celular deitado mais baixo (800 × 336: o palco a 0,38) cresce
if (window.RUA_LOBBY && typeof RUA_LOBBY.layout === 'function'){
  const layoutAntes102 = RUA_LOBBY.layout;
  RUA_LOBBY.layout = function(P, palco){
    const r = layoutAntes102.apply(this, arguments);
    try { if (palco) palco.style.setProperty('--v102-modo-h', Math.ceil(44.5/(PALCO.s || 1)) + 'px'); } catch (_) {}
    return r;
  };
}
const lbRenderAntes102 = lbRender;
lbRender = function(){ const r = lbRenderAntes102.apply(this, arguments); try { v102Monta(); v102Arruma(); } catch (e) { console.error('v102', e); } return r; };
const lbLayoutAntes102 = lbLayout;
lbLayout = function(){ const r = lbLayoutAntes102.apply(this, arguments); try { v102Arruma(); } catch (e) { console.error('v102', e); } return r; };
const lbPontosAntes102 = lbPontos;
lbPontos = function(){ const r = lbPontosAntes102.apply(this, arguments); try { v102Marcas(); } catch (_) {} return r; };
// os números chegam do servidor sem o lobby se redesenhar (o resumo social, o chat): uma olhada por segundo, só com o lobby aberto
V102L.timer = setInterval(() => { try { if (V102L.on && lobby.aberto && !document.hidden) v102Arruma(); } catch (_) {} }, 1000);
try { v102Monta(); v102Arruma(); } catch (e) { console.error('v102', e); }
window.RachaLobby102 = {estado:() => ({on:V102L.on, aberta:V102L.aberta, doca:V102L.doca ? V102L.doca.children.length : 0, menu:V102L.itens.filter(b => b._menu && !b.hidden && b !== V102L.pat).map(b => b.textContent),
  patente:V102L.pat && !V102L.pat.hidden ? V102L.pat.querySelector('.v102-pat-tx b').textContent : null}), abre:v102Abre, fecha:v102Fecha};
