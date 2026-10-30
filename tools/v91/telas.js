/* ======================================================================================================================
   RACHA v91 · AS TELAS INTERNAS NO MESMO PADRÃO DA TELA INICIAL: a mesma faixa azul em cima (o VOLTAR, o título com o ícone
   novo, as moedas e as gemas com o + verde, os quadrados do chat, dos amigos e dos ajustes), o fundo da quadra desfocado
   atrás e os mesmos painéis azul-marinho com contorno grosso (o estilo mora no v91.css). Só a cara: cada tela continua
   fazendo o que fazia (os mesmos botões, as mesmas regras, os mesmos dados).
   ====================================================================================================================== */
// o ícone novo de cada tela (no título da faixa)
const V91_TIT = {perfil:'coroa', cofre:'cofre', skins:'cofre', loja:'loja', caixas:'cofre', ranking:'ranking', replays:'play', amigos:'salas', comunidade:'amigos',
  clube:'clube', copa:'eventos', chat:'chat', treino:'treino', v88passe:'coroa', v88eventos:'eventos', v88amigos:'amigos', v88missoes:'missoes', v88caixa:'carta',
  v88chat:'chat', v88estat:'ranking'};

function v91Cab(id){
  const T = TELAS[id]; if (!T || !T.el) return;
  const el = T.el, cab = el.querySelector(':scope > .tl-cab') || el.querySelector(':scope > .br-painel > .tl-cab'); if (!cab) return;
  el.classList.add('v91-tl');
  if (!cab.classList.contains('v91-cab')){
    cab.classList.add('v91-cab');
    const v = cab.querySelector('.tl-voltar');
    if (v && !v.querySelector('.v91-volta')){ for (const s of v.querySelectorAll('svg')) s.remove(); v.appendChild(v91IcEl('volta', 'v91-volta')); }
  }
  // o ícone do título (a v88 e a v77 repintam o título às vezes: confere a cada abertura)
  const tit = cab.querySelector('.v77-tit');
  const nome = V91_TIT[id] || (el.classList.contains('cf90-tela') ? 'cofre' : el.classList.contains('rk90-tela') ? 'ranking' : null);
  if (tit && nome){
    let ic = tit.querySelector(':scope > .v91-tit-ic');
    for (const x of tit.querySelectorAll(':scope > i:not(.v91-tit-ic), :scope > img, :scope > svg')) x.remove();
    if (!ic || ic.dataset.ic !== nome){ if (ic) ic.remove(); ic = v91IcEl(nome, 'v91-tit-ic'); ic.dataset.ic = nome; tit.appendChild(ic); }
  }
  // a faixa igual em todas as telas: as que nasceram sem as moedas e as gemas ou sem os 3 quadrados (o RANKING da v90 e as
  // telas da v88: passe, eventos, missões, correio…) ganham os mesmos da v77 (as moedas abrem a loja; o chat, os amigos e os ajustes)
  // (só no cabeçalho pronto — o da v77 ou o da v88: os da v77 são montados depois, no montaAbas, e trazem os deles)
  const pronto = cab.classList.contains('v77-cab');
  if (pronto && !cab.querySelector('.tl-carteira') && typeof CARTEIRA77 === 'string'){
    const tc = nodo('div', 'tl-carteira'); tc.innerHTML = CARTEIRA77; cab.appendChild(tc);
    try { lbCarteira(); } catch (_) {}
  }
  if (pronto && !cab.querySelector('.v77-cab-ic')){
    const ics = nodo('div', 'v77-cab-ic v91-cab-ic');
    const bt = (cls, rot, fn) => { const b = novoBotao('v77-cab-bt ' + cls, rot); b.addEventListener('click', () => { som.clique(); fn(); }); return b; };
    ics.append(bt('v77-cab-chat', 'Chat do Brasil', () => { if (lobby.tela !== 'chat') abreTela('chat'); }),
      bt('v77-cab-amg', 'Amigos', () => { if (lobby.tela !== 'comunidade'){ if (typeof v77AbreAmigos === 'function') v77AbreAmigos(); else abreTela('comunidade'); } }),
      bt('v77-cab-aj', 'Ajustes', () => { try { LB.ajustes.click(); } catch (_) {} }));
    cab.appendChild(ics);
  }
  // as moedas e as gemas
  for (const g of cab.querySelectorAll('.tl-carteira .lb-grana')){
    const i = g.querySelector(':scope > i'); if (!i || i.classList.contains('v91-grana-ic')) continue;
    const gema = /gema/.test(i.className);
    i.classList.add('v91-grana-ic'); i.innerHTML = v91Ic(gema ? 'gema' : 'moeda');
    g.classList.add('v91-grana', gema ? 'gema' : 'moeda');
    if (!g.querySelector('.v91-mais')) g.appendChild(v91IcEl('mais', 'v91-mais'));
  }
  // os quadrados (chat, amigos, ajustes)
  for (const [sel, nome2] of [['.v77-cab-chat', 'chat'], ['.v77-cab-amg', 'galera'], ['.v77-cab-aj', 'ajustes']]){
    const b = cab.querySelector(sel); if (!b || b.querySelector('.v91-tp-ic')) continue;
    for (const x of b.querySelectorAll(':scope > svg, :scope > i')) x.remove();
    b.appendChild(v91IcEl(nome2, 'v91-tp-ic'));
  }
}
function v91TodasCabs(){ for (const id in TELAS) try { v91Cab(id); } catch (e) { console.error('v91 cab', id, e); } try { v91Sala(); } catch (_) {} }
// a SALA aberta (a tela da sala, com os times): o VOLTAR amarelo e a engrenagem com os desenhos novos (o resto é o v91.css)
function v91Sala(){
  const v = document.getElementById('sl-voltar'); if (v && !v.querySelector('.v91-volta')) v.appendChild(v91IcEl('volta', 'v91-volta'));
  const e = document.getElementById('sl-eng'); if (e && !e.querySelector('.v91-tp-ic')) e.appendChild(v91IcEl('ajustes', 'v91-tp-ic'));
}
const abreTelaAntes91 = abreTela;
abreTela = function(id){
  const r = abreTelaAntes91.apply(this, arguments);
  try { if (V91.on && lobby.tela) v91Cab(lobby.tela); } catch (e) { console.error('v91 tela', e); }
  try { if (lobby.tela === 'sala') v91Sala(); } catch (_) {}
  try { if (lobby.tela === 'perfil' && typeof v91PfBanner === 'function') setTimeout(() => { try { v91PfBanner(); } catch (_) {} }, 40); } catch (_) {}
  return r;
};
// o fundo das telas (a quadra desfocada) numa variável do #lb
(function(){
  try {
    if (V91.F && V91.F.telas && LB && LB.raiz) LB.raiz.style.setProperty('--v91-fundo-telas', 'url("' + V91.F.telas + '")');
    // as moedas e as gemas do jogo inteiro (os ícones pequenos dos preços): o desenho novo, como imagem
    const def = document.querySelector('#v91-sprite defs');
    const solto = nome => { const s = document.getElementById('v91i-' + nome); if (!s || !def) return null;
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="' + s.getAttribute('viewBox') + '">' + def.outerHTML + s.innerHTML + '</svg>';
      return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")'; };
    const m = solto('moeda'), g = solto('gema');
    if (m) LB.raiz.style.setProperty('--v91-moeda', m);
    if (g) LB.raiz.style.setProperty('--v91-gema', g);
  } catch (e) { console.error('v91 fundo telas', e); }
})();
try { v91TodasCabs(); } catch (e) { console.error('v91', e); }
