/* ======================================================================================================================
   RACHA v107 · ARRASTAR OS JOGADORES NA SALA E NA PARTIDA (o árbitro arrasta; a faixa conta para a sala quem foi movido)
   O pedido (05/11/2026): "No vídeo aparece o botão pausar, cartões e o dos players; nos players dá para arrastar o player para
   o time ou reserva. Quero essa função no meio da partida e na sala quando cria, pois é mais prático arrastando." (o vídeo era
   de outro jogo — as três colunas, o arrastar e a faixa de quem foi movido —: de lá vem só o jeito; os desenhos e os textos
   são do RACHA).
     1) a SALA online (a do servidor, antes e durante a partida): o árbitro aperta o cartão de alguém e arrasta. O arrasto só
        começa depois de 8 px — tocar sem mexer continua abrindo a ficha da v103 (o mesmo slClique → v103Ficha), e o segurar
        parado e a rolagem das colunas continuam como eram. A cópia do cartão vai com o dedo, com a etiqueta do que acontece ao
        soltar, e o lugar embaixo acende:
          – o OUTRO TIME (a primeira vaga livre dele; o time cheio acende vermelho: solte em cima de alguém para trocar);
          – uma VAGA LIVRE (entra ali);
          – o cartão de OUTRA PESSOA (os dois trocam; quem assiste entra no lugar e quem estava vai para o banco);
          – QUEM ASSISTE (o banco).
        Ao soltar vão as mesmas ações do servidor da ficha (adm mover e reserva, pelo v103Manda): o servidor confere tudo, como
        sempre. Quem não é o árbitro não arrasta. Na coluna que rola, o dedo na vertical rola a coluna e de lado arrasta;
     2) a PARTIDA (o painel dos jogadores da v104): o arrasto começa com o movimento (os mesmos 8 px), sem esperar o meio
        segundo — o segurar continua valendo, o banco continua à mão e tocar continua chegando como toque (o click); a cópia
        do nome sai com a tampinha (o cloneNode deixava o canvas em branco), é feita do nome que está na tela (o painel se refaz
        quando o ping muda) e nem ela nem os filhos recebem toques (senão ela esconderia o lugar embaixo do dedo);
     3) a FAIXA: cada mudança do árbitro (o servidor já manda para a sala a linha "fulano foi para o Time B" no chat) vira uma
        faixa curta em cima, para todo mundo da sala, na tela da sala e na partida: "fulano foi para o TIME B" / "... foi para o
        BANCO" (com a troca embaixo, quando teve), com os nomes dos times do jogo (TIME80).
   Depois de um arrasto, o click que o navegador manda no fim não abre nada (nem a ficha nem o que tocar no painel abrir).
   A sala NESTE APARELHO (você e os bots) continua como era: tocar no cartão (ela não tem as ações do servidor).
   ====================================================================================================================== */
const PN107 = {ini:null, arr:null, fantasma:null, alvo:null, fimT:-1e9, faixa:null, faixaT:0, faixaMs:2600};   // (faixaMs: quanto a faixa fica)
const PN107_LIMIAR = 8;                                                   // (px na tela: até aqui é toque; depois, arrasto)
const PN107_DICA = 'ÁRBITRO: arraste um jogador para o banco, para uma vaga ou para outro jogador (troca)';
const PN107_LEGENDA = ' · arraste ou toque num jogador: outro time, vaga, banco ou troca — vale também com a partida rolando';   // (cabe como a de antes)
const pn107Calmo = () => { try { return !!CONTA.menosAnim; } catch (_) { return false; } };
const pn107Nome = m => String(m && m.name || 'Jogador').toUpperCase();
function pn107CopiaTelas(de, para){                                       // (o cloneNode não copia o desenho dos canvas: a tampinha sairia em branco)
  const a = de.querySelectorAll('canvas'), b = para.querySelectorAll('canvas');
  for (let i = 0; i < a.length && i < b.length; i++){ try { b[i].getContext('2d').drawImage(a[i], 0, 0); } catch (_) {} }
}
// a cópia nunca recebe toques, nem os filhos dela: um filho com pointer-events:auto (o .pf107-toca do perfil da v107 nas linhas
// do painel, copiado junto) fica por cima do lugar embaixo do dedo e o soltar não acha nada (o elementFromPoint pega a cópia)
function pn107SemToque(g){ if (g) for (const x of [g, ...g.querySelectorAll('*')]) x.style.setProperty('pointer-events', 'none', 'important'); }
window.addEventListener('pointerdown', () => { PN107.fimT = -1e9; }, true);   // (um toque novo: o click dele vale)
window.addEventListener('click', e => {                                   // o click do fim de um arrasto não é um toque
  if (performance.now() - PN107.fimT > 500) return;
  const t = e.target, meio = document.getElementById('sl-meio'), p = typeof V93P !== 'undefined' && V93P.el ? V93P.el.p : null;
  if ((meio && meio.contains(t)) || (p && p.contains(t))){ e.stopPropagation(); e.preventDefault(); }
}, true);

/* ---------------------------------------------------------------- 1) a sala: o árbitro arrasta os cartões */
const pn107SalaArb = () => { try { const r = NET49.room; return !!(r && lobby.aberto && lobby.tela === 'sala' && SL.el && !SL.el.hidden && v103Arb(r)); } catch (_) { return false; } };
const pn107Membro = id => { const r = NET49.room; return (r && (r.members || []).find(x => x.id === id)) || null; };
function pn107AlvoSala(x, y){                                             // o que está embaixo do dedo (a cópia não recebe toques)
  const meio = document.getElementById('sl-meio'), el = document.elementFromPoint(x, y);
  if (!meio || !el || !meio.contains(el)) return null;
  const c = el.closest('.sl-card[data-id]'); if (c) return {el:c, tipo:'card', id:c.dataset.id};
  const v = el.closest('.sl-vaga[data-slot]'); if (v) return {el:v, tipo:'vaga', slot:+v.dataset.slot};
  const col = el.closest('.sl-col[data-time]'); if (!col) return null;
  const t = +col.dataset.time;
  return t === 0 || t === 1 ? {el:col, tipo:'time', time:t} : t < 0 ? {el:col, tipo:'banco'} : null;
}
function pn107Acao(D, A, r){                                              // soltar o D aqui: {ok, acao, o, txt} · ok false: o aviso · null: nada muda
  const n = r.n | 0;
  if (A.tipo === 'card'){
    const T = pn107Membro(A.id); if (!T || T.id === D.id) return null;
    if (T.slot >= 0) return T.slot === D.slot ? null : {ok:true, acao:'mover', o:{id:D.id, slot:T.slot}, txt:'TROCAR COM ' + pn107Nome(T)};
    if (D.slot < 0) return null;                                          // (os dois assistindo: nada muda)
    return {ok:true, acao:'mover', o:{id:T.id, slot:D.slot}, txt:'TROCAR COM ' + pn107Nome(T)};   // (quem assiste entra no lugar; o D vai para o banco)
  }
  if (A.tipo === 'vaga'){
    if (!Number.isInteger(A.slot) || A.slot < 0 || A.slot >= r.roster.length || r.roster[A.slot] || A.slot === D.slot) return null;
    return {ok:true, acao:'mover', o:{id:D.id, slot:A.slot}, txt:'PARA O ' + v103NomeT(Math.floor(A.slot/n))};
  }
  if (A.tipo === 'time'){
    if (A.time === v103TimeDe(D, r)) return null;
    if (!v103TemVaga(r, A.time)) return {ok:false, txt:'O ' + v103NomeT(A.time) + ' ESTÁ CHEIO', aviso:'O ' + v103NomeT(A.time) + ' está cheio: solte em cima de alguém para trocar.'};
    return {ok:true, acao:'mover', o:{id:D.id, time:A.time}, txt:'PARA O ' + v103NomeT(A.time)};
  }
  if (A.tipo === 'banco') return D.slot < 0 ? null : {ok:true, acao:'reserva', o:{id:D.id}, txt:'PARA O BANCO'};
  return null;
}
function pn107Pega(){                                                     // passou dos 8 px: o cartão levanta (a cópia vai com o dedo)
  const I = PN107.ini, m = I && pn107Membro(I.id);
  if (I && I.card && !I.card.isConnected)                                 // (a sala se refez entre o aperto e o movimento: o mesmo cartão, novo)
    I.card = [...document.querySelectorAll('#sl-meio .sl-card[data-id]')].find(c => c.dataset.id === I.id) || null;
  const card = I && I.card;
  if (!card || !m || !pn107SalaArb()){ pn107Fim(); return false; }
  const q = card.getBoundingClientRect(), w = card.offsetWidth || q.width, h = card.offsetHeight || q.height, s = q.width/Math.max(1, w);   // (a sala é escalada: a cópia também)
  const g = card.cloneNode(true);
  g.classList.remove('novo', 'pn107-alvo', 'pn107-nao', 'pn107-origem'); g.classList.add('pn107-fantasma');
  for (const a of ['role', 'tabindex', 'aria-label']) g.removeAttribute(a);
  g.setAttribute('aria-hidden', 'true'); for (const x of g.querySelectorAll('[id]')) x.removeAttribute('id');
  pn107CopiaTelas(card, g);
  const tag = nodo('span', 'pn107-acao'); g.appendChild(tag);
  g.style.cssText = 'position:fixed;left:0;top:0;margin:0;width:' + w + 'px;height:' + h + 'px;z-index:60;transform-origin:0 0;';
  pn107SemToque(g);
  (LB.raiz || document.body).appendChild(g);
  card.classList.add('pn107-origem'); SL.el.classList.add('pn107-arrastando');
  PN107.fantasma = g;
  PN107.arr = {id:m.id, card, tag, s, dx:I.x - q.left, dy:I.y - q.top, x0:q.left, y0:q.top};
  try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) {}
  try { som.clique(); } catch (_) {}
  return true;
}
function pn107Move(x, y){
  const A = PN107.arr, g = PN107.fantasma, r = NET49.room; if (!A || !g) return;
  g.style.transform = 'translate(' + Math.round(x - A.dx) + 'px,' + Math.round(y - A.dy) + 'px) scale(' + A.s + ') rotate(-1.5deg)';
  const D = pn107Membro(A.id), alvo = D && r ? pn107AlvoSala(x, y) : null, ac = alvo ? pn107Acao(D, alvo, r) : null, el = ac ? alvo.el : null;
  const antes = PN107.alvo;
  if (!antes || antes.el !== el || antes.ok !== !!(ac && ac.ok)){
    if (antes && antes.el) antes.el.classList.remove('pn107-alvo', 'pn107-nao');
    if (el) el.classList.add(ac.ok ? 'pn107-alvo' : 'pn107-nao');
  }
  PN107.alvo = el ? {el, ok:!!ac.ok} : null;
  A.tag.textContent = ac ? ac.txt : ''; A.tag.classList.toggle('pn107-acao-nao', !!(ac && !ac.ok));
}
function pn107Solta(x, y){                                                // soltou: a ação do servidor (a mesma da ficha) · true = mandou
  const A = PN107.arr, r = NET49.room; if (!A || !r || !pn107SalaArb()) return false;
  const D = pn107Membro(A.id), alvo = D ? pn107AlvoSala(x, y) : null, ac = alvo ? pn107Acao(D, alvo, r) : null;
  if (!ac) return false;
  if (!ac.ok){ x49Toast(ac.aviso || ac.txt); try { som.erro(); } catch (_) {} return false; }
  try { som.clique(); } catch (_) {}
  v103Manda(ac.acao, ac.o);
  return true;
}
function pn107Fim(volta){                                                 // acabou (soltou, cancelou ou a sala sumiu): a cópia sai e a sala se refaz
  const A = PN107.arr, g = PN107.fantasma;
  if (PN107.alvo && PN107.alvo.el) PN107.alvo.el.classList.remove('pn107-alvo', 'pn107-nao');
  if (A && A.card) A.card.classList.remove('pn107-origem');
  if (SL.el) SL.el.classList.remove('pn107-arrastando');
  PN107.ini = PN107.arr = PN107.fantasma = PN107.alvo = null;
  if (g){
    if (pn107Calmo()) g.remove();
    else {                                                                // (cancelou: a cópia volta para o lugar; mandou: some onde soltou)
      g.style.transition = 'transform .16s ease-out, opacity .16s ease-out';
      if (volta && A) g.style.transform = 'translate(' + Math.round(A.x0) + 'px,' + Math.round(A.y0) + 'px) scale(' + A.s + ')';
      g.style.opacity = '0';
      setTimeout(() => g.remove(), 190);
    }
  }
  if (A){ PN107.fimT = performance.now(); try { slRender(); } catch (_) {} }
}
document.addEventListener('pointerdown', e => {
  if (PN107.arr || (e.button != null && e.button > 0) || e.isPrimary === false) return;
  const card = e.target && e.target.closest ? e.target.closest('#sl-meio .sl-card[data-id]') : null;
  if (!card || !pn107SalaArb()) return;                                   // (quem não é o árbitro: o toque de sempre)
  pn107Fim();
  PN107.ini = {x:e.clientX, y:e.clientY, id:card.dataset.id, card, pid:e.pointerId, tipo:e.pointerType, rola:!!card.closest('.sl-caixa.pn107-rola')};
}, true);
document.addEventListener('pointermove', e => {
  const I = PN107.ini; if (!I || e.pointerId !== I.pid) return;
  if (I.tipo === 'mouse' && !(e.buttons & 1)) return pn107Fim(true);      // (soltou o botão fora da janela: não vale)
  if (!PN107.arr){
    const dx = e.clientX - I.x, dy = e.clientY - I.y;
    if (Math.hypot(dx, dy) <= PN107_LIMIAR) return;                       // (ainda é toque)
    if (I.rola && I.tipo !== 'mouse' && Math.abs(dy) > Math.abs(dx)) return;   // (na coluna que rola, o dedo na vertical é a rolagem dela)
    if (!pn107Pega()) return;
  } else if (!pn107SalaArb()) return pn107Fim(true);                      // (a sala fechou ou deixou de ser o árbitro no meio)
  e.preventDefault();
  pn107Move(e.clientX, e.clientY);
}, {capture:true, passive:false});
document.addEventListener('pointerup', e => {
  const I = PN107.ini; if (!I || e.pointerId !== I.pid) return;
  if (!PN107.arr) return pn107Fim();                                      // (não mexeu: é toque — o click abre a ficha)
  e.preventDefault(); e.stopPropagation();
  let ok = false; try { ok = pn107Solta(e.clientX, e.clientY); } catch (er) { console.error('v107 soltar', er); }
  pn107Fim(!ok);
}, true);
document.addEventListener('pointercancel', e => { const I = PN107.ini; if (I && e.pointerId === I.pid) pn107Fim(true); }, true);   // (a coluna rolou: era rolagem)
document.addEventListener('keydown', e => { if (e.key === 'Escape' && PN107.arr){ e.stopPropagation(); pn107Fim(true); } }, true);
document.addEventListener('contextmenu', e => { if (PN107.arr) e.preventDefault(); }, true);
addEventListener('blur', () => { if (PN107.ini) pn107Fim(true); });
function pn107SalaArruma(){                                               // cada vez que a sala se refaz: quem arrasta, as colunas que rolam e a legenda
  const el = SL.el; if (!el || el.hidden) return;
  const arb = pn107SalaArb();
  el.classList.toggle('pn107-arb', arb);
  if (!arb) return;
  for (const cx of el.querySelectorAll('.sl-caixa')) cx.classList.toggle('pn107-rola', cx.scrollHeight > cx.clientHeight + 2);
  const d = el.querySelector('.sl-legenda .sl-leg-dica');
  if (d && /^ · toque num jogador/.test(d.textContent || '')) d.textContent = PN107_LEGENDA;
}
if (typeof slRender === 'function'){
  const slRenderAntes107 = slRender;
  slRender = function(){
    if (PN107.arr) return;                                                // (arrastando: a sala não se refaz embaixo do dedo; refaz ao soltar)
    const out = slRenderAntes107.apply(this, arguments);
    try { pn107SalaArruma(); } catch (e) { console.error('v107 sala', e); }
    return out;
  };
}

/* ---------------------------------------------------------------- 2) a partida: o painel da v104 arrasta já com o movimento */
// (antes: segurar meio segundo e só então arrastar; mexer antes cancelava). O pointermove aqui (na janela) vem antes do da v104
// (no documento): passou dos 8 px, o nome levanta na hora e o da v104 segue com a cópia, os alvos e o soltar de sempre.
window.addEventListener('pointermove', e => {
  if (typeof V104D === 'undefined') return;
  const I = V104D.ini; if (!I || V104D.arr || e.pointerId !== I.pid) return;
  if (e.pointerType === 'mouse' && !(e.buttons & 1)) return;
  if (Math.hypot(e.clientX - I.x, e.clientY - I.y) <= PN107_LIMIAR) return;
  clearTimeout(V104D.t); V104D.t = null;
  try { v104Pega(); } catch (er) { console.error('v107 painel', er); }
}, {capture:true, passive:true});
if (typeof v104Pega === 'function'){
  const v104PegaAntes107 = v104Pega;
  v104Pega = function(){                                                  // (e a cópia do nome com a tampinha desenhada)
    try {                                                                 // (o painel se refaz quando o ping muda: o nome apertado pode ser um li novo)
      const I = V104D.ini, p = V93P.el && V93P.el.p;
      if (I && I.li && !I.li.isConnected && p){ const li = [...p.querySelectorAll('li[data-id]')].find(x => x.dataset.id === I.id); if (li) I.li = li; }
    } catch (_) {}
    const out = v104PegaAntes107.apply(this, arguments);
    try { if (V104D.arr && V104D.arr.li && V104D.fantasma){ pn107CopiaTelas(V104D.arr.li, V104D.fantasma); pn107SemToque(V104D.fantasma); V104D.fantasma.setAttribute('aria-hidden', 'true'); } } catch (_) {}
    return out;
  };
}
if (typeof v104Fim === 'function'){
  const v104FimAntes107 = v104Fim;
  v104Fim = function(){ if (V104D.arr) PN107.fimT = performance.now(); return v104FimAntes107.apply(this, arguments); };   // (o click do fim do arrasto não vale)
}
if (typeof v93PainelPinta === 'function'){
  const v93PainelPintaAntes107 = v93PainelPinta;
  v93PainelPinta = function(){
    const out = v93PainelPintaAntes107.apply(this, arguments);
    try { const d = V93P.el && V93P.el.p && V93P.el.p.querySelector('.v104-dica'); if (d && d.textContent !== PN107_DICA) d.textContent = PN107_DICA; } catch (_) {}
    return out;
  };
}

/* ---------------------------------------------------------------- 3) a faixa: quem foi movido (para todo mundo da sala) */
const PN107_SRV_TIMES = ['Time A', 'Time B'];                             // (como o servidor escreve: server/turma.js, adm › feito)
function pn107LeLinha(txt, r){                                            // "fulano foi para o Time B (trocou com beltrano)" → {nome, dest, sub}
  const s = String(txt || ''), k = s.indexOf(' foi para o '); if (k <= 0) return null;
  let nome = '';                                                          // (o nome mais comprido da sala que começa a linha; senão, o que vem antes)
  for (const m of (r.members || [])){ const nm = String(m.name || ''); if (nm && nm.length > nome.length && s.startsWith(nm + ' foi para o ')) nome = nm; }
  if (!nome) nome = s.slice(0, k);
  const resto = s.slice(nome.length + ' foi para o '.length);
  let dest = -2, cauda = '';
  if (/^banco\b/.test(resto)){ dest = -1; cauda = resto.slice(5); }
  else for (let t = 0; t < 2; t++) if (resto.startsWith(PN107_SRV_TIMES[t])){ dest = t; cauda = resto.slice(PN107_SRV_TIMES[t].length); }
  if (dest < -1 || (cauda && !/^ \(.*\)$|^ no lugar de /.test(cauda))) return null;
  const sub = cauda.replace(/^ \((.*)\)$/, '$1').trim()
    .replace(/\bTime ([AB])\b/g, (_, l) => v103NomeT(l === 'B' ? 1 : 0)).replace(/\bbanco\b/g, 'BANCO');
  return {nome, dest, sub};
}
function pn107FaixaTopo(){                                                // na partida: logo embaixo do placar (que cresce com o HUD); na sala: o do CSS
  try {
    if (RQ.on && !lobby.aberto){
      const c = cv.getBoundingClientRect(), k = c.width/W, hk = HUDX.k || 1;
      return Math.round(c.top + (PLACAR80.y + PLACAR80.h)*hk*k + 10) + 'px';
    }
  } catch (_) {}
  return '';
}
function pn107Faixa(L){
  let f = PN107.faixa;
  if (!f){
    f = PN107.faixa = nodo('div', 'pn107-faixa'); f.id = 'pn107-faixa'; f.hidden = true;
    f.setAttribute('role', 'status'); f.setAttribute('aria-live', 'polite');
    document.body.appendChild(f);
  }
  f.textContent = '';
  const destino = L.dest < 0 ? 'BANCO' : v103NomeT(L.dest), cor = L.dest < 0 ? '#e8ecff' : (TIME80[L.dest] && TIME80[L.dest].claro) || '#ffd23f';
  const l1 = nodo('b', 'pn107-f1'), dst = nodo('span', 'pn107-fdest', destino); dst.style.setProperty('--c', cor);
  l1.append(nodo('span', 'pn107-fnm', L.nome), document.createTextNode(' foi para o '), dst);
  f.append(l1, nodo('small', 'pn107-f2', L.sub || ''));
  f.style.top = pn107FaixaTopo();
  f.classList.toggle('pn107-calmo', pn107Calmo()); f.classList.remove('pn107-sai', 'pn107-entra'); f.hidden = false;
  void f.offsetWidth; f.classList.add('pn107-entra');
  clearTimeout(PN107.faixaT);
  PN107.faixaT = setTimeout(() => { f.classList.remove('pn107-entra'); f.classList.add('pn107-sai'); PN107.faixaT = setTimeout(() => { f.hidden = true; f.classList.remove('pn107-sai'); }, 260); }, PN107.faixaMs);
}
if (typeof net49Message === 'function'){
  const net49MessageAntes107 = net49Message;
  net49Message = function(m){
    const out = net49MessageAntes107.apply(this, arguments);
    try {                                                                 // (a linha do árbitro, ao vivo: o histórico de quem entra não vira faixa)
      const r = NET49.room;
      if (m && m.type === 'say' && m.sys && !m.who && r && v103SalaSrv(r)){ const L = pn107LeLinha(m.text, r); if (L) pn107Faixa(L); }
    } catch (e) { console.error('v107 faixa', e); }
    return out;
  };
}
window.RachaPainel107 = {
  limiar:PN107_LIMIAR, le:pn107LeLinha, faixa:pn107Faixa, acao:pn107Acao, salaArb:pn107SalaArb,
  estado:() => ({ini:!!PN107.ini, arr:!!PN107.arr, alvo:PN107.alvo ? PN107.alvo.el.className : '', acao:PN107.arr ? PN107.arr.tag.textContent : '',
    faixa:PN107.faixa && !PN107.faixa.hidden ? PN107.faixa.textContent : ''})
};
