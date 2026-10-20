/* ======================================================================================================================
   RACHA v90 · A TELA INICIAL NOVA (a mesma arrumação de sempre — os botões nos lados —, com a cara nova). Só a interface:
   cada botão abre a mesma tela que já abria; nada aqui mexe em partida, física, conta, moedas ou gemas.
   · o CENÁRIO novo (a quadra do bairro no fim de tarde: as casas, o alambrado, o muro com pouco grafite, os postes), em
     desenho vetorial (V90_CENARIO_SVG, colado pelo tools/v90/v90.py a partir de tools/v90/cenario.svg);
   · em cima: o PERFIL compacto (a tampinha, o nome, o nível, o XP e a PATENTE — tocar abre o perfil), o letreiro RACHA no
     meio e, à direita, as moedas, as gemas (com o +), o correio, o chat e os ajustes;
   · à esquerda: LOJA, COFRE, CLUBE e TREINO; à direita: SALAS, AMIGOS (convites e chamar para jogar), RANKING e EVENTOS;
   · no meio: a TAMPINHA equipada, grande. Tocar abre o COFRE; SEGURAR abre a RODA com as 3 favoritas — arraste até uma e
     solte para equipar (as favoritas são marcadas no COFRE, e vão para a conta junto com as tampinhas salvas);
   · embaixo: o PASSE RACHA, as MISSÕES DIÁRIAS, o MODO da partida e o JOGAR (amarelo, grande, embaixo à direita).
   O COFRE: as tampinhas (e o CRIAR TAMPINHA), os avatares, os banners, os efeitos, as bolas, as comemorações, os gols e os
   emotes — o que é seu, com o EQUIPAR (a conta confere, como na loja).
   ====================================================================================================================== */
const V90I = {feito:false, roda:null, segura:0, engole:false, cofreCat:'tampinhas'};
const V90_FAV_MAX = 3;

/* ---------------------------------------------------------------- 1) arrumar o lobby (idempotente: roda a cada lbRender) */
function v90Arruma(){
  const R = LB.raiz; if (!R) return;
  if (!R.classList.contains('v90')) R.classList.add('v90');
  // o cenário (uma vez)
  if (!R.querySelector('.v90-cenario') && typeof V90_CENARIO_SVG === 'string'){
    const cen = nodo('div', 'v90-cenario'); cen.setAttribute('aria-hidden', 'true'); cen.innerHTML = V90_CENARIO_SVG;
    R.insertBefore(cen, R.firstChild);
  }
  const palco = LB.palco;
  // o letreiro no meio, em cima
  if (palco && !palco.querySelector('.v90-logo')){
    const lg = nodo('div', 'v90-logo'); lg.setAttribute('aria-hidden', 'true');
    lg.innerHTML = '<b>R<i>A</i>CHA</b><small>FUTEBOL DE RUA</small>';
    palco.appendChild(lg);
  }
  // a patente no perfil compacto (o texto da ranqueada que o jogo já mostra; o cartão da ranqueada some do topo)
  const eu = LB.eu, tx = eu && eu.querySelector('.tp-eu-tx');
  if (tx){
    let ch = tx.querySelector('.v90-pat');
    if (!ch){ ch = nodo('span', 'v90-pat'); ch.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.4 8.6-8 10.4C7.4 19.6 4 16 4 11V5z" fill="currentColor"/></svg><span></span>'; tx.appendChild(ch); }
    const liga = document.querySelector('#lb .lb-topo .v71-liga small');
    const t = liga ? liga.textContent.trim() : '';
    const sp = ch.querySelector('span'); if (sp.textContent !== t) sp.textContent = t;
    ch.hidden = !t;
  }
  // o PASSE vai para baixo (o mesmo botão: o v88 continua mostrando o nível e a barra)
  const pa = document.querySelector('#lb .v88-passe');
  if (pa && palco && pa.parentNode !== palco){
    palco.appendChild(pa); pa.classList.add('v90-passe');
    if (!pa.querySelector('.v90-passe-tit')) pa.insertBefore(nodo('b', 'v90-passe-tit', 'PASSE RACHA'), pa.querySelector('.v88-passe-nv'));
  }
  // os botões dos lados: o TAMPINHA vira COFRE; cada um com a legenda de baixo
  const tp = document.querySelector('#rx .v71-esq [data-rx="skins"]');
  if (tp){
    tp.setAttribute('data-rx', 'cofre'); tp.setAttribute('aria-label', 'Cofre: as suas tampinhas e itens');
    const b = tp.querySelector('b'); if (b) b.textContent = 'COFRE';
    const ic = tp.querySelector('i'); if (ic){ ic.className = 'v77-ic-box v90-ic'; ic.innerHTML = V90_IC_COFRE; }
    tp.addEventListener('click', e => { e.stopPropagation(); som.clique(); v90AbreCofre('tampinhas'); });
  }
  for (const [sel, txt] of V90_LEGENDAS){
    const el = document.querySelector('#rx ' + sel); if (!el) continue;
    let s = el.querySelector('.v90-sub'); if (!s){ s = nodo('small', 'v90-sub'); const b = el.querySelector('b'); if (b) b.insertAdjacentElement('afterend', s); else el.appendChild(s); }
    const t = typeof txt === 'function' ? txt() : txt; if (s.textContent !== t) s.textContent = t;
  }
  // a tampinha do meio: tocar = COFRE · segurar = a roda das favoritas
  const em = LB.emblema;
  if (em && !em.dataset.v90){
    em.dataset.v90 = '1'; em.setAttribute('aria-label', 'Sua tampinha: toque para abrir o cofre, segure para trocar pelas favoritas');
    em.addEventListener('pointerdown', v90SeguraComeca);
    em.addEventListener('contextmenu', e => e.preventDefault());
  }
  let dica = palco && palco.querySelector('.v90-dica');
  if (palco && !dica){
    dica = nodo('p', 'v90-dica'); dica.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg><span>SEGURE PARA TROCAR · TOQUE PARA O COFRE</span>';
    palco.appendChild(dica);
  }
  if (dica && em){ dica.style.setProperty('--v90-dx', (em.offsetLeft + em.offsetWidth/2) + 'px'); dica.style.setProperty('--v90-dy', (em.offsetTop + em.offsetHeight*.9) + 'px'); }
}
const V90_IC_COFRE = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="10" width="48" height="44" rx="6" fill="#6f7782"/><rect x="12" y="14" width="40" height="36" rx="4" fill="#8d96a1"/><circle cx="32" cy="32" r="11" fill="#3a3f46"/><circle cx="32" cy="32" r="7" fill="#c9a24a"/><path d="M32 21v6M32 37v6M21 32h6M37 32h6" stroke="#c9a24a" stroke-width="3"/><rect x="14" y="54" width="8" height="5" fill="#3a3f46"/><rect x="42" y="54" width="8" height="5" fill="#3a3f46"/></svg>';
const V90_LEGENDAS = [
  ['.rx-bt[data-loja]', 'ITENS E OFERTAS'],
  ['[data-rx="cofre"]', 'SKINS E ITENS'],
  ['[data-rx="clube"]', 'SEU CLUBE'],
  ['[data-rx="treino"]', 'TREINOS E BOTS'],
  ['.v71-dir [data-rx="salas"]', 'JOGAR ONLINE'],
  ['[data-rx="amigos"]', () => { const n = (typeof V88 !== 'undefined' && V88.convites) ? V88.convites.length : 0; return n ? n + (n > 1 ? ' CONVITES' : ' CONVITE') : 'CONVIDAR'; }],
  ['[data-rx="ranking"]', () => { const d = V90RK.dados['vigente|' + V90RK.cat], p = d && d.r && d.r.eu && d.r.eu.posicao; return p ? 'VOCÊ: #' + fmtNum(p) : 'TOP 20'; }],
  ['.v77-eventos', 'DA TEMPORADA'],
];
// a cada arrumação do lobby (e logo que ele abre) · a tampinha um pouco mais para cima (a fileira de baixo ficou mais alta)
const lbRenderAntes90 = lbRender;
lbRender = function(){ const r = lbRenderAntes90.apply(this, arguments); try { v90Arruma(); } catch (e) { console.error('v90', e); } return r; };
const lbLayoutAntes90 = lbLayout;
lbLayout = function(){ const r = lbLayoutAntes90.apply(this, arguments); try { v90Arruma(); } catch (e) { console.error('v90', e); } return r; };
if (window.RUA_LOBBY && typeof RUA_LOBBY.layout === 'function'){
  const layoutAntes90 = RUA_LOBBY.layout;
  RUA_LOBBY.layout = function(P, palco){
    const r = layoutAntes90.apply(this, arguments);
    if (!LB.raiz.classList.contains('retrato')){ P.cy = Math.round(118 + (P.h - 118 - 150)*.64); palco.style.setProperty('--rx-cy', P.cy + 'px'); }
    return r;
  };
}
// o toque na tampinha do meio abre o COFRE (antes de o clique de sempre chegar nela)
document.addEventListener('click', e => {
  if (!e.target.closest || !e.target.closest('#lb-emblema')) return;
  e.stopPropagation(); e.preventDefault();
  if (V90I.engole){ V90I.engole = false; return; }       // (era o fim do SEGURAR: a roda cuida)
  som.clique(); v90AbreCofre('tampinhas');
}, true);

/* ---------------------------------------------------------------- 2) a roda das favoritas */
function v90Favoritas(){ return (TP.salvas || []).filter(s => s.f && tpLe(s.c)).slice(0, V90_FAV_MAX); }
function v90SeguraComeca(e){
  if (e.button != null && e.button > 0) return;
  const em = e.currentTarget;
  V90I.engole = false;                                    // (um SEGURAR cancelado pelo sistema não engole o próximo toque)
  clearTimeout(V90I.segura);
  V90I.segura = setTimeout(() => { V90I.engole = true; v90RodaAbre(em, e.pointerId); }, 380);
  const cancela = () => { clearTimeout(V90I.segura); em.removeEventListener('pointerup', cancela); em.removeEventListener('pointercancel', cancela); em.removeEventListener('pointerleave', cancela); };
  em.addEventListener('pointerup', cancela); em.addEventListener('pointercancel', cancela); em.addEventListener('pointerleave', cancela);
}
function v90RodaAbre(em, pid){
  v90RodaFecha();
  const palco = LB.palco, favs = v90Favoritas();
  const cx = em.offsetLeft + em.offsetWidth/2, cy = em.offsetTop + em.offsetHeight/2;
  const roda = nodo('div', 'v90-roda'); roda.style.left = cx + 'px'; roda.style.top = cy + 'px';
  roda.setAttribute('role', 'dialog'); roda.setAttribute('aria-label', 'Trocar pela favorita');
  roda.appendChild(nodo('div', 'v90-roda-anel'));
  roda.appendChild(nodo('p', 'v90-roda-dica', favs.length ? 'ARRASTE ATÉ UMA FAVORITA E SOLTE' : 'MARQUE ATÉ 3 FAVORITAS NO COFRE'));
  const trilho = nodo('i', 'v90-roda-trilho'); roda.appendChild(trilho);
  const ANG = [-90, 150, 30], RAIO = 230, slots = [];
  for (let i = 0; i < V90_FAV_MAX; i++){
    const f = favs[i], a = ANG[i]*Math.PI/180, x = Math.cos(a)*RAIO, y = Math.sin(a)*RAIO;
    const b = novoBotao('v90-fav' + (f ? '' : ' vazia') + (i === 0 ? ' cima' : ''), f ? f.n : 'Escolher favorita');
    b.style.left = x + 'px'; b.style.top = y + 'px';
    if (f){ b.appendChild(tpMiniatura(tpLe(f.c), 124)); b.appendChild(nodo('span', null, String(f.n || 'Tampinha').toUpperCase())); if (f.c === tpMinha()) b.classList.add('atual'); }
    else { b.innerHTML = '<b>+</b>'; b.appendChild(nodo('span', null, 'FAVORITA')); }
    b.addEventListener('click', ev => { ev.stopPropagation(); v90RodaEscolhe(f); });
    roda.appendChild(b); slots.push({b, f, ang:ANG[i]});
  }
  roda.addEventListener('click', ev => { if (ev.target === roda) v90RodaFecha(); });
  const fundo = nodo('div', 'v90-roda-fundo'); fundo.addEventListener('pointerdown', () => v90RodaFecha());
  palco.append(fundo, roda); LB.raiz.classList.add('v90-roda-on');
  V90I.roda = {roda, fundo, slots, cx, cy, alvo:null, trilho};
  try { em.setPointerCapture(pid); } catch (_) {}
  const move = ev => v90RodaMove(ev), solta = () => {
    em.removeEventListener('pointermove', move); em.removeEventListener('pointerup', solta); em.removeEventListener('pointercancel', solta);
    const R = V90I.roda; if (!R) return;
    if (R.alvo) v90RodaEscolhe(R.alvo.f);                 // soltou em cima de uma: equipa
    else R.livre = true;                                   // soltou no meio: a roda fica aberta para tocar
  };
  em.addEventListener('pointermove', move); em.addEventListener('pointerup', solta); em.addEventListener('pointercancel', solta);
  try { som.clique(); } catch (_) {}
  try { if (navigator.vibrate) navigator.vibrate(12); } catch (_) {}
}
function v90RodaMove(ev){
  const R = V90I.roda; if (!R) return;
  const r = LB.palco.getBoundingClientRect(), s = PALCO.s || 1;
  const x = (ev.clientX - r.left)/s - R.cx, y = (ev.clientY - r.top)/s - R.cy, d = Math.hypot(x, y);
  let alvo = null;
  if (d > 70){
    const ang = Math.atan2(y, x)*180/Math.PI;
    let melhor = 999; for (const sl of R.slots){ if (!sl.f) continue; const dif = Math.abs(((ang - sl.ang + 540) % 360) - 180); if (dif < melhor && dif < 50){ melhor = dif; alvo = sl; } }
  }
  if (alvo !== R.alvo){ for (const sl of R.slots) sl.b.classList.toggle('alvo', sl === alvo); R.alvo = alvo; }
  R.trilho.style.width = Math.min(d, 230) + 'px'; R.trilho.style.transform = 'rotate(' + Math.atan2(y, x) + 'rad)'; R.trilho.style.opacity = d > 30 ? '1' : '0';
}
function v90RodaEscolhe(f){
  if (!f){ v90RodaFecha(); v90AbreCofre('tampinhas'); return; }
  v90RodaFecha();
  if (f.c === tpMinha()) return;
  if (tpEquipa(f.c)){ try { som.compra(); } catch (_) {} aviso(String(f.n || 'Tampinha') + ' equipada!'); }
}
function v90RodaFecha(){
  const R = V90I.roda; if (!R) return;
  R.roda.remove(); R.fundo.remove(); V90I.roda = null; LB.raiz.classList.remove('v90-roda-on');
}

/* ---------------------------------------------------------------- 3) o COFRE */
const V90_COFRE_CATS = [
  ['tampinhas', 'TAMPINHAS', 'tampinhas', null],
  ['avatares', 'AVATARES', 'avatares', 'avatar'],
  ['banners', 'BANNERS', 'banners', 'banner'],
  ['efeitos', 'EFEITOS', 'efeitos', 'efeito'],
  ['bolas', 'BOLAS', 'bolas', 'bola'],
  ['comemoracoes', 'COMEMORAÇÕES', 'comemoracoes', 'comemoracao'],
  ['gols', 'GOLS', 'gols', 'gol'],
  ['emotes', 'EMOTES', 'chat', null],
];
const V90CF = v88Tela('cofre', {titulo:'COFRE', ic:'tampinhas',
  abre:() => { if (v88Logado()) v88Estado(false).catch(() => {}); },
  render:T => v90CofreRender(T),
});
V90CF.el.classList.add('cf90-tela');
function v90AbreCofre(cat){ if (cat) V90I.cofreCat = cat; abreTela('cofre'); }
v88On('inventario', () => v88Repinta('cofre'));
v88On('equipados', () => v88Repinta('cofre'));

function v90CofreRender(T){
  const corpo = T.corpo; corpo.textContent = '';
  const w = nodo('div', 'cf90'), col = nodo('nav', 'cf90-col'), painel = nodo('section', 'cf90-painel');
  v88Coluna(col, V90_COFRE_CATS.map(([id, rot, ic]) => ({id, rot, ic})), V90I.cofreCat, c => { V90I.cofreCat = c; v88Repinta('cofre'); });
  w.append(col, painel); corpo.appendChild(w);
  const cat = V90_COFRE_CATS.find(c => c[0] === V90I.cofreCat) || V90_COFRE_CATS[0];
  const cab = nodo('div', 'cf90-cab'); cab.appendChild(nodo('h3', 'tl-sub', cat[1]));
  painel.appendChild(cab);
  if (cat[0] === 'tampinhas') return v90CofreTampinhas(painel, cab);
  if (cat[0] === 'emotes') return v88Vazio(painel, 'chat', 'Os emotes estão chegando', 'Os emotes (as reações rápidas na partida) entram numa próxima atualização. Quando chegarem, os seus ficam guardados aqui.');
  if (!v88Logado()) return v88PrecisaConta(painel, 'Os seus ' + cat[1].toLowerCase());
  const tipo = cat[3], C = typeof CAT88 !== 'undefined' ? CAT88 : {itens:[]};
  const meus = C.itens.filter(i => i.tipo === tipo && (i.gratis || V88.inv.has(i.id))).map(i => i.id);
  cab.appendChild(nodo('small', 'v88-nota', 'O que é seu na conta (vale em qualquer aparelho). Toque para equipar.'));
  if (!meus.length) return v88Vazio(painel, cat[2], 'Nada aqui ainda', 'Compre na LOJA ou ganhe no passe, nas missões, nos eventos e no ranking.', v88Bt('lb-btn amarelo', 'IR PARA A LOJA', () => { fechaTela(); abreTela('loja'); }));
  v88LojaGrade(painel, meus);
}
function v90CofreTampinhas(painel, cab){
  const criar = v88Bt('lb-btn amarelo cf90-criar', 'CRIAR TAMPINHA', () => { som.clique(); abreTela('skins', 'cofre'); });
  cab.appendChild(criar);
  const favs = v90Favoritas().length;
  painel.appendChild(nodo('p', 'v88-nota cf90-nota', 'Toque numa tampinha para equipar. A ★ marca as favoritas da RODA (até ' + V90_FAV_MAX + '): segure a tampinha no lobby para trocar rápido. Favoritas: ' + favs + '/' + V90_FAV_MAX + '.'));
  const lista = [];
  const minha = tpMinha();
  if (!(TP.salvas || []).some(s => s.c === minha)) lista.push({c:minha, n:'A equipada agora', nova:true});
  for (const s of TP.salvas || []) lista.push({c:s.c, n:s.n, f:s.f, salva:s});
  // as exclusivas da conta (o passe, os eventos, o ranking)
  if (typeof TP_CONTA !== 'undefined' && v88Logado()) for (const id in TP_CONTA){
    if (!V88.inv.has(id)) continue;
    let cod = ''; try { cod = tpCodigo(TP_CONTA[id].d); } catch (_) { continue; }
    if (lista.some(x => x.c === cod)) continue;
    lista.push({c:cod, n:TP_CONTA[id].nome, exclusiva:true});
  }
  const g = nodo('div', 'cf90-grade');
  for (const x of lista){
    const D = tpLe(x.c); if (!D) continue;
    const card = nodo('div', 'cf90-tp' + (x.c === minha ? ' on' : '') + (x.exclusiva ? ' exclusiva' : ''));
    const eq = novoBotao('cf90-tp-eq', 'Equipar ' + (x.n || 'tampinha'));
    eq.appendChild(tpMiniatura(D, 116));
    eq.addEventListener('click', () => { if (x.c === minha) return; if (tpEquipa(x.c)){ som.compra(); aviso('Tampinha equipada!'); v88Repinta('cofre'); } });
    const fav = novoBotao('cf90-fav' + (x.f ? ' on' : ''), x.f ? 'Tirar das favoritas' : 'Marcar como favorita'); fav.textContent = '★';
    fav.addEventListener('click', () => v90AlternaFavorita(x));
    card.append(eq, nodo('b', null, x.n || 'Tampinha'), nodo('small', null, x.c === minha ? 'EQUIPADA' : x.exclusiva ? 'EXCLUSIVA · EQUIPAR' : 'EQUIPAR'), fav);
    g.appendChild(card);
  }
  painel.appendChild(g);
}
function v90AlternaFavorita(x){
  const S = TP.salvas || (TP.salvas = []);
  let s = x.salva || S.find(y => y.c === x.c);
  const ligando = !(s && s.f);
  if (ligando && v90Favoritas().length >= V90_FAV_MAX){ som.erro && som.erro(); return aviso('Só ' + V90_FAV_MAX + ' favoritas: tire uma antes.'); }
  if (!s){
    if (S.length >= 24) return aviso('Você já tem 24 tampinhas salvas: apague uma no editor.');
    s = {c:x.c, n:String(x.n || 'Minha tampinha').slice(0, 20), f:false}; S.push(s);   // (a equipada ou a exclusiva entram nas salvas: é o que vai para a conta)
  }
  s.f = ligando; tpSalva(); som.clique(); v88Repinta('cofre');
}
