/* ==================================================================================================================
   RACHA rua v70.1 · celular: o jogo é na horizontal e tudo cabe na tela
   1) Em pé (aparelho de toque): a tela GIRE O CELULAR cobre tudo. A partida contra os bots (e o treino) pausa e a pausa
      continua aberta quando o celular deita de novo; na partida online o jogo segue (o anfitrião roda a partida de todos),
      mas o toque solta na hora. Num computador com a janela em pé nada muda (o lobby em pé continua valendo).
   2) Deitado com a tela baixa (#lb.v70-cabe, o lbLayout liga quando o palco fica abaixo de UIX.cabe): o lobby e as telas
      na escala do palco, como na v69, sem os pisos. O que ainda passar da altura encolhe junto (CSS zoom nos filhos de
      quem rolaria, até V70CB.min) em vez de rolar. Com o Tamanho da interface acima de 100% nada encolhe: a pessoa pediu
      letra maior, então a tela rola. Listas longas de verdade (o chat, as 30 últimas partidas além da conta) continuam
      rolando quando nem no mínimo cabem.
   3) O perfil deitado no celular ganha sub-abas: CARTÃO · ESTATÍSTICAS · RECORDES · PARTIDAS (uma parte por vez, ao lado
      da tampinha). Em tela grande o perfil fica como estava (tudo numa coluna que rola).
   4) Os Ajustes no celular deitado (.v70-compacto): o título, as abas, o PRONTO e o ✕ numa linha e as opções em duas
      colunas; no aparelho só de toque o grupo do teclado físico sai (fica uma nota) e o resto também encolhe para caber.
   ================================================================================================================== */

/* ---------------------------------------------------------------- 1) GIRE O CELULAR */
const V70G = {el:null, st:null, mq:null, aberto:false, pausou:false};
function v70GireMonta(){
  const el = nodo('div'); el.id = 'v70-gire'; el.hidden = true; el.tabIndex = -1;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'v70-gire-t'); el.setAttribute('aria-describedby', 'v70-gire-d');
  el.innerHTML = '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
    '<path class="v70-gire-seta" d="M84 14 A46 46 0 0 1 108 50" fill="none" stroke="#5cc8ff" stroke-width="6" stroke-linecap="round"/>' +
    '<path class="v70-gire-seta" d="M98 46 L108 56 L114 42" fill="none" stroke="#5cc8ff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<g class="v70-gire-cel"><rect x="38" y="16" width="44" height="88" rx="10" fill="#26292b" stroke="#f3efe4" stroke-width="5"/>' +
    '<rect x="44" y="26" width="32" height="64" rx="3" fill="#2fa84f"/><path d="M44 58 H76" stroke="#ffffff" stroke-width="2" opacity=".85"/>' +
    '<circle cx="60" cy="58" r="7" fill="none" stroke="#ffffff" stroke-width="2" opacity=".85"/><circle cx="66" cy="44" r="4" fill="#ffd23f"/>' +
    '<path d="M54 97 H66" stroke="#f3efe4" stroke-width="3.5" stroke-linecap="round"/></g></svg>' +
    '<b id="v70-gire-t">GIRE O CELULAR</b><span id="v70-gire-d">O RACHA é jogado com o celular deitado.</span><small class="v70-gire-st" aria-live="polite"></small>';
  document.body.appendChild(el);
  V70G.el = el; V70G.st = el.querySelector('.v70-gire-st');
  // (sem gesto nenhum aqui: tocar na tela em pé não faz nada no jogo por baixo)
  for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'contextmenu']) el.addEventListener(ev, e => { e.stopPropagation(); if (e.cancelable && ev !== 'touchstart') e.preventDefault(); });
}
function v70GireDeveAbrir(){ return !!(V70G.mq && V70G.mq.matches); }
function v70GireSync(){
  const quer = v70GireDeveAbrir();
  if (quer === V70G.aberto) return;
  V70G.aberto = quer;
  if (quer){
    try { limparEntrada(); } catch (_) {}               // ninguém fica correndo sozinho com o dedo que saiu do analógico
    const tablet = Math.min(screen.width || 0, screen.height || 0) >= 600, oque = tablet ? 'a tela' : 'o celular';   // (no tablet: a tela)
    let txt = '';
    try {
      if (!lobby.aberto && !NET49.playing && pausaPode() && !PAUSA.aberta){ pausaAbre(); V70G.pausou = PAUSA.aberta; }
      if (!lobby.aberto && (PAUSA.aberta || V70G.pausou) && !NET49.playing) txt = 'A partida está pausada: deite ' + oque + ' e toque em CONTINUAR.';
      else if (!lobby.aberto && NET49.playing) txt = 'A partida online continua rolando.';
    } catch (_) {}
    V70G.st.textContent = txt;
    document.getElementById('v70-gire-t').textContent = 'GIRE ' + oque.toUpperCase();
    document.getElementById('v70-gire-d').textContent = 'O RACHA é jogado com ' + oque + (tablet ? ' deitada.' : ' deitado.');
    V70G.el.hidden = false;
  } else {
    V70G.el.hidden = true; V70G.pausou = false;
    try { if (lobby.aberto) lbLayout(); } catch (_) {}
  }
}
v70GireMonta();
try { V70G.mq = matchMedia('(orientation: portrait) and (pointer: coarse)'); } catch (_) {}
if (V70G.mq){ const f = () => v70GireSync(); if (V70G.mq.addEventListener) V70G.mq.addEventListener('change', f); else if (V70G.mq.addListener) V70G.mq.addListener(f); }
window.addEventListener('resize', () => v70GireSync());
window.addEventListener('orientationchange', () => setTimeout(v70GireSync, 60));
V70C_LISTA.unshift({q:'#v70-gire', fecha:null, modal:true});   // por cima de tudo: prende o foco e deixa o resto inerte (o Esc não fecha)
setTimeout(v70GireSync, 0);                            // (depois de o jogo abrir o lobby: abrir em pé não pausa nada)

/* ---------------------------------------------------------------- 2) tudo cabe: o zoom de quem rolaria */
const V70CB = {min:.62, raf:0, tudo:true, sujo:new Set(), obs:null, rodando:false};
// quem rola (as telas, as janelas, a folha do JOGAR, o editor da tampinha, os formulários) e quem continua rolando de propósito
const V70CB_ALVOS = '.tl-corpo, .sx-form, .rq-caixa, .tpe-ctl, .pop-caixa, .clb-rolar, .clb-form-corpo, .clb-pag, .sx-corpo2, .sl-corpo, .ajx-corpo, #hp, .tu-intro-cx';
const V70CB_FORA = '.br-corpo, #br-lista, .sk-cat, #sk-grade, #sk-cats, .sl-caixa';
const V70CB_FIXOS = '.pf-lado, .v70-pf-sub';           // (o perfil: a tampinha e as sub-abas ficam do tamanho delas; só a parte encolhe)
const v70Baixa = () => innerHeight <= 520 && innerWidth > innerHeight;   // a tela do celular deitado (para o que fica fora do palco)
function v70CabeLiga(C){                                // este pode encolher agora?
  if ((PALCO.mul || 1) > 1) return false;              // (letra maior pedida nos Ajustes: rola em vez de encolher)
  if (C.closest('#pop-ajustes')) return AJX.raiz.classList.contains('v70-compacto');
  if (C.id === 'hp' || C.classList.contains('tu-intro-cx')) return v70Baixa();   // o editor dos controles e o COMO JOGA (tamanho real, na partida)
  return lobby.aberto && LB.raiz.classList.contains('v70-cabe') && LB.camada.contains(C);
}
function v70Encaixa(C){                                 // o maior zoom (até 1) em que o conteúdo cabe sem rolar
  const filhos = Array.from(C.children).filter(e => e.style.zoom || (e.getClientRects().length && !e.matches(V70CB_FIXOS)));
  const st = C.scrollTop, poe = z => { const v = z >= .999 ? '' : z.toFixed(3); for (const e of filhos) if (e.style.zoom !== v) e.style.zoom = v; };
  const cabe = () => C.scrollHeight <= C.clientHeight + 1, volta = () => { if (st && C.scrollTop !== st) C.scrollTop = st; };
  const z0 = C.dataset.v70z ? +C.dataset.v70z : 1;
  if (z0 < 1 && filhos.length){                       // já encolhido: o mesmo zoom ainda é o certo? (duas medidas em vez da busca toda)
    poe(z0);
    if (cabe()){ poe(Math.min(1, z0 + .015)); if (!cabe()){ poe(z0); volta(); return z0; } }
  }
  let z = 1;
  poe(1);
  if (filhos.length && !cabe()){
    poe(V70CB.min);
    if (cabe()){
      let lo = V70CB.min, hi = 1;
      for (let i = 0; i < 7; i++){ const m = (lo + hi)/2; poe(m); if (cabe()) lo = m; else hi = m; }
      z = lo;
    }                                                  // (nem no mínimo: é lista longa de verdade e rola no tamanho normal)
    poe(z);
  }
  if (z < .999) C.dataset.v70z = z.toFixed(3); else if (C.dataset.v70z) delete C.dataset.v70z;
  volta();
  return z;
}
function v70CabeSolta(C){ for (const e of C.children) if (e.style.zoom) e.style.zoom = ''; delete C.dataset.v70z; }
function v70CabeAgenda(tudo){
  if (tudo) V70CB.tudo = true;
  if (!V70CB.raf) V70CB.raf = requestAnimationFrame(v70CabeRoda);
}
function v70CabeRoda(){
  V70CB.raf = 0;
  if (V70CB.rodando) return; V70CB.rodando = true;
  try {
    v70PfAplica();                                     // (as sub-abas do perfil antes de medir)
    const lista = V70CB.tudo ? Array.from(document.querySelectorAll(V70CB_ALVOS)) : Array.from(V70CB.sujo).filter(C => C.isConnected);
    V70CB.tudo = false; V70CB.sujo.clear();
    for (const C of document.querySelectorAll('[data-v70z]')) if (!C.isConnected || !v70CabeLiga(C) || !C.getClientRects().length) v70CabeSolta(C);
    lista.sort((a, b) => a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);   // (de fora para dentro)
    for (const C of lista){
      if (C.matches(V70CB_FORA) || !C.getClientRects().length) continue;
      if (!v70CabeLiga(C)){ if (C.dataset.v70z) v70CabeSolta(C); continue; }
      if (!/(auto|scroll)/.test(getComputedStyle(C).overflowY)) continue;
      v70Encaixa(C);
    }
  } catch (_) {}
  finally { V70CB.rodando = false; if (V70CB.obs) V70CB.obs.takeRecords(); }   // (o que este passo mudou não chama outro)
}
function v70CabeMarca(recs){
  for (const r of recs){
    if (r.type === 'attributes' && r.attributeName === 'class' && (r.target === LB.raiz || r.target === AJX.raiz)){ V70CB.tudo = true; continue; }
    const t = r.target.nodeType === 1 ? r.target : r.target.parentElement; if (!t) continue;
    if (!LB.camada.contains(t) && !AJX.raiz.contains(t) && !(V70CB.hp && V70CB.hp.contains(t))) continue;   // (o palco do lobby não rola: as moedas contando não chamam nada)
    let c = t.closest(V70CB_ALVOS);
    if (!c){ V70CB.tudo = true; continue; }            // uma tela, janela ou folha abriu/fechou: todos
    while (c){ V70CB.sujo.add(c); c = c.parentElement && c.parentElement.closest(V70CB_ALVOS); }   // (e quem está em volta dele)
  }
  if (V70CB.tudo || V70CB.sujo.size) v70CabeAgenda();
}
V70CB.obs = new MutationObserver(v70CabeMarca);
V70CB.obs.observe(LB.camada, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['hidden', 'class']});
V70CB.obs.observe(LB.raiz, {attributes:true, attributeFilter:['class']});
V70CB.obs.observe(AJX.raiz, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['hidden', 'class']});
V70CB.hp = document.getElementById('hp');
if (V70CB.hp) V70CB.obs.observe(V70CB.hp, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['hidden', 'class']});
const tuIntroAbreAntes701 = tuIntroAbre;
tuIntroAbre = function(){ const v = tuIntroAbreAntes701.apply(this, arguments); v70CabeAgenda(true); return v; };
const lbLayoutAntes701 = lbLayout;
lbLayout = function(){ const v = lbLayoutAntes701.apply(this, arguments); v70CabeAgenda(true); return v; };
try { if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => v70CabeAgenda(true)); } catch (_) {}

/* ---------------------------------------------------------------- 3) o perfil em partes (só no celular deitado) */
const V70PF = {parte:'cartao', nav:null};
const V70PF_PARTES = [['cartao', 'CARTÃO'], ['est', 'ESTATÍSTICAS'], ['rec', 'RECORDES'], ['hist', 'PARTIDAS']];
function v70PfAplica(){
  const corpo = document.querySelector('#tela-perfil .pf-corpo'); if (!corpo) return;
  let nav = V70PF.nav;
  if (!nav || nav.parentElement !== corpo){
    nav = V70PF.nav = nodo('div', 'v70-pf-sub'); nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', 'Partes do perfil');
    for (const [id, nome] of V70PF_PARTES){ const b = novoBotao(''); b.id = 'v70-pf-' + id; b.dataset.parte = id; b.textContent = nome; b.setAttribute('role', 'tab'); nav.appendChild(b); }
    nav.addEventListener('click', e => { const b = e.target.closest('[data-parte]'); if (!b || b.dataset.parte === V70PF.parte) return; som.clique(); V70PF.parte = b.dataset.parte; v70PfAplica(); v70CabeAgenda(true); });
    nav.addEventListener('keydown', e => {             // as setas andam entre as partes (Home/End vão às pontas)
      const ids = V70PF_PARTES.map(p => p[0]), i = ids.indexOf(V70PF.parte);
      const j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : null;
      if (j == null) return; e.preventDefault();
      V70PF.parte = ids[(j + ids.length) % ids.length]; som.clique(); v70PfAplica(); v70CabeAgenda(true);
      try { nav.querySelector('[data-parte="' + V70PF.parte + '"]').focus({preventScroll:true}); } catch (_) {}
    });
    corpo.insertBefore(nav, corpo.firstChild);
  }
  const em = LB.raiz.classList.contains('v70-cabe');
  corpo.classList.toggle('v70-pf-partes', em);
  for (const [id] of V70PF_PARTES) corpo.classList.toggle('ver-' + id, em && V70PF.parte === id);
  for (const b of nav.children){
    const on = b.dataset.parte === V70PF.parte;
    if (b.getAttribute('aria-selected') !== String(on)) b.setAttribute('aria-selected', String(on));
    const ti = on ? 0 : -1; if (b.tabIndex !== ti) b.tabIndex = ti;
  }
}

/* ---------------------------------------------------------------- 4) os Ajustes compactos (celular deitado) */
(function(){
  const sec = AJX.secs && AJX.secs.controles; if (!sec) return;
  const tecl = TECLA.lista && TECLA.lista.closest('.ajx-grupo'); if (tecl) tecl.classList.add('v70-teclado');
  const ajuda = sec.querySelector('.ajx-ajuda'), ga = ajuda && ajuda.closest('.ajx-grupo'); if (ga) ga.classList.add('v70-ajuda-grupo');
  const nota = nodo('p', 'ajx-nota v70-teclado-nota', 'Teclado físico: as teclas aparecem aqui quando o jogo abre num computador.');
  if (tecl) tecl.after(nota); else sec.appendChild(nota);
})();
function v70AjCompacto(){
  const R = AJX.raiz; if (!R) return;
  let fino = true; try { fino = matchMedia('(any-pointer: fine)').matches; } catch (_) {}
  R.classList.toggle('v70-compacto', innerHeight <= 520 && innerWidth > innerHeight);
  R.classList.toggle('v70-toque', !fino);              // (sem mouse nem touchpad: o teclado físico não aparece)
}
window.addEventListener('resize', () => { v70AjCompacto(); v70CabeAgenda(true); });
const ajxAbaAntes701 = ajxAba;
ajxAba = function(){ v70AjCompacto(); const v = ajxAbaAntes701.apply(this, arguments); v70CabeAgenda(true); return v; };
v70AjCompacto();
v70CabeAgenda(true);
