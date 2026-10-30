/* ======================================================================================================================
   RACHA v95 · O CHAT MAIS FÁCIL DE MEXER (o Chat do Brasil — a tela GALERA — e o painel do chat das salas, da equipe, do
   clube e dos amigos):
   · o botão 😀 ao lado do campo: os emojis (um toque põe no texto, onde está o cursor) e as FRASES PRONTAS (um toque escreve;
     o ENVIAR manda) — sem precisar digitar tudo no celular;
   · o contador (0/120) e o ENVIAR que só acende com texto;
   · na tela GALERA: as abas MUNDO · AMIGOS · CLUBE · SALA (as outras conversas abrem no painel, na aba certa), as mensagens
     suas do lado direito, e quem está lendo as de cima não é puxado para baixo — aparece "↓ MENSAGENS NOVAS".
   O filtro, o limite de envio e a moderação são os de sempre (o servidor decide).
   ====================================================================================================================== */
const V95C = {emojis:['😀', '😂', '🤣', '😎', '🥶', '🔥', '⚽', '🥅', '🧤', '👟', '🏆', '👑', '💯', '👏', '🙌', '💪', '🤝', '👋', '😡', '😭', '😱', '🤡', '😈', '👀', '✅', '❌', '⭐', '⚡', '🎯', '🍀', '🇧🇷', '🎉'],
  frases:['Bora jogar!', 'Alguém pra 2v2?', 'Vamo de ranqueada?', 'Boa!', 'GG!', 'Que golaço!', 'Valeu, galera!', 'Tô on!', 'Revanche?', 'Toca a bola!']};
function v95ChatInsere(inp, s){                                 // põe no lugar do cursor (respeita o máximo do campo)
  if (!inp || inp.disabled) return;
  const max = inp.maxLength > 0 ? inp.maxLength : 120, v = inp.value || '';
  const a = inp.selectionStart != null ? inp.selectionStart : v.length, b = inp.selectionEnd != null ? inp.selectionEnd : v.length;
  const novo = (v.slice(0, a) + s + v.slice(b)).slice(0, max);
  inp.value = novo;
  const p = Math.min(novo.length, a + s.length);
  try { inp.setSelectionRange(p, p); } catch (_) {}
  inp.dispatchEvent(new Event('input', {bubbles:true}));
}
function v95ChatBandeja(form, inp, ok, cls){                    // o 😀, a bandeja (emojis + frases), o contador e o ENVIAR aceso
  if (!form || !inp || form.querySelector('.v95-emo-bt')) return null;
  const bt = novoBotao('v95-emo-bt', 'Emojis e frases prontas'); bt.innerHTML = '<span aria-hidden="true">😀</span>';
  const bd = nodo('div', 'v95-emo ' + (cls || '')); bd.hidden = true; bd.setAttribute('role', 'dialog'); bd.setAttribute('aria-label', 'Emojis e frases prontas');
  const ge = nodo('div', 'v95-emo-g');
  for (const e of V95C.emojis){ const b = novoBotao('v95-emo-e', e); b.textContent = e; b.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); try { som.clique(); } catch (_) {} v95ChatInsere(inp, e); try { inp.focus({preventScroll:true}); } catch (_) {} }); ge.appendChild(b); }
  const gf = nodo('div', 'v95-emo-f');
  for (const f of V95C.frases){ const b = novoBotao('v95-emo-fr'); b.textContent = f; b.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); try { som.clique(); } catch (_) {} inp.value = f.slice(0, inp.maxLength > 0 ? inp.maxLength : 120); inp.dispatchEvent(new Event('input', {bubbles:true})); bd.hidden = true; bt.classList.remove('on'); try { inp.focus({preventScroll:true}); } catch (_) {} }); gf.appendChild(b); }
  bd.append(nodo('small', 'v95-emo-tit', 'EMOJIS'), ge, nodo('small', 'v95-emo-tit', 'FRASES PRONTAS'), gf);
  bt.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); try { som.clique(); } catch (_) {} bd.hidden = !bd.hidden; bt.classList.toggle('on', !bd.hidden); });
  const n = nodo('small', 'v95-chat-n', '0/' + (inp.maxLength > 0 ? inp.maxLength : 120)); n.setAttribute('aria-hidden', 'true');
  const pinta = () => { const L = (inp.value || '').length, M = inp.maxLength > 0 ? inp.maxLength : 120; n.textContent = L + '/' + M; n.classList.toggle('cheio', L >= M - 10); if (ok) ok.classList.toggle('v95-apagado', !(inp.value || '').trim()); };
  inp.addEventListener('input', pinta); form.addEventListener('submit', () => setTimeout(pinta, 0));
  document.addEventListener('pointerdown', ev => { if (!bd.hidden && !bd.contains(ev.target) && ev.target !== bt && !bt.contains(ev.target)){ bd.hidden = true; bt.classList.remove('on'); } }, true);
  form.classList.add('v95-chat-form');
  form.insertBefore(bt, inp); form.appendChild(n); form.appendChild(bd);
  pinta();
  return bd;
}

/* ---------------------------------------------------------------- a tela GALERA (o Chat do Brasil) */
(function(){
  const form = document.getElementById('br-form'), inp = document.getElementById('br-in'), ok = document.getElementById('br-ok');
  v95ChatBandeja(form, inp, ok, 'br');
  try { if (inp) inp.placeholder = 'Escreva para a galera… (😀 = emojis e frases)'; } catch (_) {}
  // as abas das conversas, embaixo do aviso: MUNDO (aqui) · AMIGOS · CLUBE · SALA (abrem no painel)
  const corpo = document.querySelector('#tela-chat .br-corpo'); if (!corpo || corpo.querySelector('.v95-ch-abas')) return;
  const abas = nodo('div', 'v95-ch-abas'); abas.setAttribute('role', 'tablist'); abas.setAttribute('aria-label', 'Conversas');
  const fixo = corpo.querySelector('.br-fixo'); if (fixo) fixo.after(abas); else corpo.insertBefore(abas, corpo.firstChild);
  V95C.abas = abas;
  const lista = document.getElementById('br-lista');
  if (lista){
    const pill = novoBotao('v95-novas', 'Ir para as mensagens novas'); pill.textContent = '↓ MENSAGENS NOVAS'; pill.hidden = true;
    pill.addEventListener('click', () => { try { som.clique(); } catch (_) {} lista.scrollTop = lista.scrollHeight; pill.hidden = true; });
    lista.addEventListener('scroll', () => { if (lista.scrollTop + lista.clientHeight >= lista.scrollHeight - 40) pill.hidden = true; });
    lista.after(pill); V95C.pill = pill;
  }
})();
function v95ChatAbas(){
  const A = V95C.abas; if (!A) return;
  A.textContent = '';
  const tem = id => { try { return id === 'sala' ? !!NET49.room : typeof v88TemCanal === 'function' && v88TemCanal(id); } catch (_) { return false; } };
  const nao = id => { try { return id === 'sala' ? SL.naoLidas | 0 : typeof v88CanalNaoLidas === 'function' ? v88CanalNaoLidas(id) : 0; } catch (_) { return 0; } };
  const L = [['brasil', 'MUNDO', 'mundo'], ['amigos', 'AMIGOS', 'amigos'], ['clube', 'CLUBE', 'clube'], ['sala', NET49.playing ? 'PARTIDA' : 'SALA', 'sala']];
  for (const [id, rot, ic] of L){
    if (id !== 'brasil' && !tem(id)) continue;
    const b = novoBotao('v95-ch-aba' + (id === 'brasil' ? ' on' : ''), rot); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(id === 'brasil'));
    try { b.appendChild(v88IcEl(ic)); } catch (_) {}
    b.appendChild(nodo('span', null, rot));
    const n = id === 'brasil' ? 0 : nao(id); if (n > 0) b.appendChild(nodo('b', null, n > 9 ? '9+' : String(n)));
    if (id !== 'brasil') b.addEventListener('click', () => { try { som.clique(); } catch (_) {} try { cbAbre(); CB.aba = id; cbPintaPainel(); if (typeof cbPinta === 'function') cbPinta(); } catch (_) {} });
    A.appendChild(b);
  }
  if (A.childNodes.length < 2){ const d = nodo('small', 'v95-ch-dica', 'Entre na conta para falar com os amigos e o clube.'); try { if (v88Logado()) d.textContent = ''; } catch (_) {} if (d.textContent) A.appendChild(d); }
}
const brasilRenderAntes95 = brasilRender;
brasilRender = function(){ const r = brasilRenderAntes95.apply(this, arguments); try { v95ChatAbas(); } catch (_) {} return r; };
const brasilRenderListaAntes95 = brasilRenderLista;
brasilRenderLista = function(tudo){                             // quem está lendo as de cima fica onde está (a pílula avisa as novas)
  const lista = document.getElementById('br-lista');
  const antes = lista ? lista.scrollTop : 0, perto = !lista || lista.scrollTop + lista.clientHeight >= lista.scrollHeight - 40;
  const n0 = lista ? lista.querySelectorAll('.br-msg').length : 0;
  const r = brasilRenderListaAntes95.apply(this, arguments);
  try {
    if (lista && !tudo && !perto){ lista.scrollTop = antes; if (lista.querySelectorAll('.br-msg').length > n0 && V95C.pill) V95C.pill.hidden = false; }
    else if (V95C.pill) V95C.pill.hidden = true;
  } catch (_) {}
  return r;
};

/* ---------------------------------------------------------------- o painel (salas, partida, equipe, clube, amigos e Brasil) */
(function(){
  try {
    if (!CB.pn) return;
    const form = CB.pn.querySelector('.c81-form'), ok = CB.pn.querySelector('.c81-ok');
    v95ChatBandeja(form, CB.inp, ok, 'pn');
  } catch (_) {}
})();
window.RachaChat95 = {insere:v95ChatInsere, emojis:V95C.emojis.slice(), frases:V95C.frases.slice(), abas:v95ChatAbas};
