/* ======================================================================================================================
   RACHA v104 · O PAINEL DOS JOGADORES NA PARTIDA (o botão das pessoas, do lado do placar) E O ÁRBITRO ARRASTANDO
   O pedido (04/11/2026): "quero o nome dos jogadores assim quando clicar ali; se eu segurar um jogador posso afastar ele pra
   reserva e o reserva para algum time — o árbitro da partida consegue fazer isso".
     · a vaga sem gente (as salas online não têm bots desde a v103) aparece como VAGA LIVRE — antes o painel achava que era um
       bot e mostrava um "Jogador · SEM CLUBE" com uma tampinha qualquer;
     · quem caiu: "CAIU · A VAGA ESPERA (x s)" (não tem mais bot segurando o lugar nas salas sem bots);
     · o ÁRBITRO segura o nome de alguém (meio segundo, o nome "levanta") e arrasta:
         – para o BANCO: vai para o banco (a vaga dele fica livre);
         – para uma VAGA LIVRE: entra ali;
         – para o nome de outro jogador: os dois trocam (quem vem do banco entra e o outro vai para o banco);
         – para a cor de um time: a primeira vaga livre dele.
       Vale na hora, com a partida rolando — são as mesmas ações do servidor da ficha do árbitro e do TIMES E JOGADORES da
       pausa (mover e reserva). Quem não é o árbitro só vê o painel.
   ====================================================================================================================== */
const V104D = {t:null, ini:null, arr:null, fantasma:null, alvo:null, arb:null};
const v104Arb = () => { try { const r = NET49.room; return !!(NET49.playing && r && !r.ranked && typeof v103Arb === 'function' && v103Arb(r)); } catch (_) { return false; } };

/* ---------------------------------------------------------------- 1) os dados: quem é quem (o id e o lugar) e a vaga livre */
if (typeof v95PainelDados === 'function'){
  const v95PainelDadosAntes104 = v95PainelDados;
  v95PainelDados = function(){
    const out = v95PainelDadosAntes104.apply(this, arguments);
    try {
      if (NET49.playing && NET49.room){
        const r = NET49.room, n = r.n | 0, Pn = V93P.painel && V93P.painel.round === r.round ? V93P.painel : null;
        for (let t = 0; t < 2; t++) (out.times[t] || []).forEach((o, k) => {
          const i = t*n + k, J = Pn && Pn.j ? Pn.j[i] : null, id = J ? J.id : r.roster[i];
          o.slot = i; o.id = id || null;
          const vazia = J ? J.st === 'vazio' : !id && !r.bots;
          if (vazia) Object.assign(o, {st:'vazio', nome:'VAGA LIVRE', bot:false, skin:'', emoji:'', avatar:'', e:null, clube:null, flag:'', id:null});
        });
        const fora = (Pn && Pn.fora) || (r.members || []).filter(x => x.slot < 0);
        (out.fora || []).forEach((o, k) => { const x = fora[k]; if (x && x.id) o.id = x.id; });
      }
    } catch (e) { console.error('v104 painel (dados)', e); }
    return out;
  };
}
if (typeof v95Linha === 'function'){
  const v95LinhaAntes104 = v95Linha;
  v95Linha = function(o){
    const li = v95LinhaAntes104.apply(this, arguments);
    try {
      if (o.id) li.dataset.id = o.id;
      if (Number.isInteger(o.slot)) li.dataset.slot = String(o.slot);
      if (o.st === 'vazio'){
        li.className = 'v93-pj-l v95-pj-l v104-vaga'; li.textContent = '';
        li.appendChild(nodo('span', 'v104-vaga-tx', 'VAGA LIVRE'));
        li.setAttribute('aria-label', 'Vaga livre');
      } else if (o.st === 'caiu' && NET49.room && !NET49.room.bots){
        const sm = li.querySelector('.v95-pj-cl'); if (sm) sm.textContent = 'CAIU · A VAGA ESPERA' + (o.ate ? ' (' + o.ate + ' s)' : '');
      }
    } catch (e) { console.error('v104 painel (linha)', e); }
    return li;
  };
}

/* ---------------------------------------------------------------- 2) o painel: as cores dos times, o banco sempre à mão e a dica */
if (typeof v93PainelPinta === 'function'){
  const v93PainelPintaAntes104 = v93PainelPinta;
  v93PainelPinta = function(){
    if (V104D.arr) return;                                    // (arrastando: o painel não se refaz embaixo do dedo)
    const arb = v104Arb();
    if (arb !== V104D.arb){ V104D.arb = arb; try { V95H.assin = ''; } catch (_) {} }   // (virou ou deixou de ser o árbitro: refaz)
    const out = v93PainelPintaAntes104.apply(this, arguments);
    try { v104PainelArruma(arb); } catch (e) { console.error('v104 painel', e); }
    return out;
  };
}
function v104PainelArruma(arb){
  const p = V93P.el && V93P.el.p; if (!p || p.hidden) return;
  p.classList.toggle('v104-arb', arb);
  p.querySelectorAll('.v95-pj-t').forEach((c, t) => { c.dataset.time = String(t); });
  if (!arb) return;
  if (!p.querySelector('.v95-pj-fora')){                     // (o banco vazio também recebe: é para onde se arrasta)
    const f = nodo('div', 'v93-pj-fora v95-pj-fora v104-banco-vazio');
    f.append(nodo('h4', null, 'BANCO E QUEM ASSISTE'), nodo('p', 'v104-banco-tx', 'Solte aqui para mandar para o banco'));
    const leg = p.querySelector('.v95-pj-leg'); if (leg) p.insertBefore(f, leg); else p.appendChild(f);
  }
  if (!p.querySelector('.v104-dica')){
    const d = nodo('p', 'v104-dica', 'ÁRBITRO: segure um jogador e arraste para o banco, para uma vaga ou para outro jogador (troca)');
    const cab = p.querySelector('.v95-pj-cab'); if (cab) cab.insertAdjacentElement('afterend', d); else p.insertBefore(d, p.firstChild);
  }
}

/* ---------------------------------------------------------------- 3) segurar e arrastar (só o árbitro) */
function v104Fim(){
  clearTimeout(V104D.t); V104D.t = null;
  if (V104D.ini && V104D.ini.li) V104D.ini.li.classList.remove('v104-segurando');
  if (V104D.arr && V104D.arr.li) V104D.arr.li.classList.remove('v104-origem');
  if (V104D.alvo) V104D.alvo.classList.remove('v104-alvo');
  if (V104D.fantasma) V104D.fantasma.remove();
  const p = V93P.el && V93P.el.p; if (p) p.classList.remove('v104-arrastando');
  const tinha = !!V104D.arr;
  V104D.ini = V104D.arr = V104D.fantasma = V104D.alvo = null;
  if (tinha){ try { V95H.assin = ''; v93PainelPinta(); } catch (_) {} }
}
function v104Pega(){
  const I = V104D.ini, p = V93P.el && V93P.el.p; if (!I || !p || p.hidden || !v104Arb()) return v104Fim();
  const li = I.li, r = li.getBoundingClientRect(), col = li.closest('.v95-pj-t');
  const cx = nodo('div', 'v93-pj v95-pj v104-fantasma');
  const cor = col ? getComputedStyle(col).getPropertyValue('--c') : '';
  cx.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;margin:0;padding:3px;z-index:99999;pointer-events:none;border-radius:11px;'
    + 'background:' + (cor ? cor.trim() : 'rgba(40,46,66,.96)') + ';';
  const ul = nodo('ul'); ul.appendChild(li.cloneNode(true)); cx.appendChild(ul);
  document.body.appendChild(cx);
  li.classList.remove('v104-segurando'); li.classList.add('v104-origem');
  p.classList.add('v104-arrastando');
  V104D.fantasma = cx;
  V104D.arr = {id:I.id, de:li.dataset.slot != null ? +li.dataset.slot : -1, li, dx:I.x - r.left, dy:I.y - r.top};
  try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) {}
  try { som.clique(); } catch (_) {}
}
function v104AlvoEm(x, y){
  const p = V93P.el && V93P.el.p; if (!p) return null;
  const el = document.elementFromPoint(x, y); if (!el || !p.contains(el)) return null;
  const li = el.closest('li[data-slot]'); if (li) return {el:li, tipo:'vaga', slot:+li.dataset.slot};
  const f = el.closest('.v95-pj-fora'); if (f) return {el:f, tipo:'banco'};
  const c = el.closest('.v95-pj-t[data-time]'); if (c) return {el:c, tipo:'time', time:+c.dataset.time};
  return null;
}
function v104Solta(x, y){
  const A = V104D.arr, alvo = v104AlvoEm(x, y), r = NET49.room;
  if (!A || !alvo || !r || !v104Arb()) return;
  const n = r.n | 0, deTime = A.de >= 0 ? Math.floor(A.de/n) : -1;
  if (alvo.tipo === 'vaga'){ if (alvo.slot !== A.de) v93AdmManda('mover', {id:A.id, slot:alvo.slot}); }
  else if (alvo.tipo === 'time'){ if (alvo.time !== deTime) v93AdmManda('mover', {id:A.id, time:alvo.time}); }
  else if (alvo.tipo === 'banco'){ if (A.de >= 0) v93AdmManda('reserva', {id:A.id}); }
}
document.addEventListener('pointerdown', e => {
  if (V104D.arr || (e.button != null && e.button > 0)) return;
  const p = V93P.el && V93P.el.p; if (!p || p.hidden || !p.contains(e.target) || !v104Arb()) return;
  const li = e.target.closest('li[data-id]'); if (!li) return;
  v104Fim();
  V104D.ini = {x:e.clientX, y:e.clientY, id:li.dataset.id, li, pid:e.pointerId};
  li.classList.add('v104-segurando');
  V104D.t = setTimeout(v104Pega, 450);
}, true);
document.addEventListener('pointermove', e => {
  const I = V104D.ini; if (!I || e.pointerId !== I.pid) return;
  if (!V104D.arr){ if (Math.hypot(e.clientX - I.x, e.clientY - I.y) > 12) v104Fim(); return; }   // (mexeu antes de levantar: não era para arrastar)
  e.preventDefault();
  const A = V104D.arr, cx = V104D.fantasma;
  if (cx){ cx.style.left = (e.clientX - A.dx) + 'px'; cx.style.top = (e.clientY - A.dy) + 'px'; }
  const alvo = v104AlvoEm(e.clientX, e.clientY), el = alvo ? alvo.el : null;
  if (el !== V104D.alvo){ if (V104D.alvo) V104D.alvo.classList.remove('v104-alvo'); V104D.alvo = el; if (el && el !== A.li) el.classList.add('v104-alvo'); }
}, {capture:true, passive:false});
document.addEventListener('pointerup', e => {
  const I = V104D.ini; if (!I || e.pointerId !== I.pid) return;
  if (V104D.arr){ e.preventDefault(); e.stopPropagation(); try { v104Solta(e.clientX, e.clientY); } catch (er) { console.error('v104 soltar', er); } }
  v104Fim();
}, true);
document.addEventListener('pointercancel', e => { const I = V104D.ini; if (I && e.pointerId === I.pid) v104Fim(); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && V104D.arr){ e.stopPropagation(); v104Fim(); } }, true);
document.addEventListener('contextmenu', e => { if (V104D.ini) e.preventDefault(); }, true);   // (o segurar do celular não abre o menu)
window.RachaPainel104 = {arb:v104Arb, solta:v104Solta, estado:() => ({ini:!!V104D.ini, arr:!!V104D.arr})};
