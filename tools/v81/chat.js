/* ==================================================================================================================
   RACHA rua v81 · O CHAT (entra no fim do script, depois da v80)
   O pedido (os itens 14 a 19 do pacote): um chat fixo embaixo, com cara própria do RACHA (sem copiar o visual de outro
   jogo); no menu, a barra compacta com a última mensagem, que abre ao tocar e minimiza de novo, disponível enquanto a
   pessoa anda pelos menus; na partida, menor e meio transparente, sem cobrir os controles, o placar nem a bola, abrindo para
   conversar sem pausar a partida; as duas categorias — 🇧🇷 BRASIL (o chat público de quem está na região, independente da
   sala) e ⚽ SALA (só quem está na sala, na espera e na partida, trocando quando muda de sala) —, o nome antes da mensagem,
   o selo V, o perfil pelo nome, o histórico recente; o "digitando" com três pontinhos em cima da tampinha, sincronizado; e a
   moderação: silenciar, denunciar, os filtros (spam, ofensa, link, dados pessoais), o limite de envio e a opção de ocultar.
   O que já existia e continua por baixo: o Chat do Brasil (v56/v57: a conexão, o histórico, o filtro do servidor, a denúncia
   e o silenciar), o chat da sala (v62: o servidor entrega só para quem está nela) e a barra da v63 (o lugar em cada tela, o
   "digitando" pela rede, as abas). Aqui entram o visual novo, os lugares a mais (as telas do menu), o perfil pelo nome, os
   três pontinhos, os filtros no aparelho (antes de mandar), a denúncia na sala e o OCULTAR.
   ================================================================================================================== */
const C81 = {tag:null, tagIc:null, seta:null, online:null, erro:null, ficha:null, fichaDe:null, digOn:false, digT:0, ultimaChave:'', preso:true, ultSala:0, ultTxtSala:'', ritmo:[], lobbyChave:'', lobbyT:0};
const C81_CHIP = ['perfil', 'comunidade', 'amigos', 'clube', 'copa', 'replays'];   // as telas do menu em que o chat fica como um chip no canto (as outras têm o rodapé ocupado)
const C81_SVG = {
  brasil:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="4.5" width="21" height="15" rx="3" fill="#2ea043"/><path d="M12 6.6L19.6 12 12 17.4 4.4 12z" fill="#ffd23f"/><circle cx="12" cy="12" r="3.1" fill="#1f4fb8"/><path d="M9.4 11.4c1.7-.7 3.5-.6 5.2.2" fill="none" stroke="#fff" stroke-width=".9"/></svg>',
  sala:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#f4f4f6" stroke="#15171a" stroke-width="1.6"/><path d="M12 7.2l3.4 2.5-1.3 4H9.9l-1.3-4z" fill="#15171a"/><path d="M12 7.2V3.6M15.4 9.7l3.3-1.4M14.1 13.7l2.2 3M9.9 13.7l-2.2 3M8.6 9.7L5.3 8.3" stroke="#15171a" stroke-width="1.4" stroke-linecap="round"/></svg>',
  cima:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14.5l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  baixo:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  envia:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.2L20 4l-4.2 16.5-4.6-6.3z" fill="currentColor"/><path d="M11.2 14.2L20 4" stroke="#15171a" stroke-width="1.4"/></svg>',
  olho:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.3-6 9-6 9 6 9 6-3.3 6-9 6-9-6-9-6z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/><path d="M4 20L20 4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  mudo:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M15.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  bandeira:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4m0 1h11l-2.5 3.5L17 12H6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  perfil:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="4" fill="currentColor"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6z" fill="currentColor"/></svg>',
  tudo:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
};
try { const o = JSON.parse(localStorage.getItem(CHAVE_CONTA) || 'null'); if (o && o.chatOculto === true) CONTA.chatOculto = true; } catch (_) {}
const c81Oculto = () => CONTA.chatOculto === true;
const c81Calmo = () => typeof v70Calmo === 'function' && v70Calmo();
const c81Mudo = id => !!id && BRASIL.silenciados.has(id);
const c81Nome = (m, sala) => String((sala ? m.name : m.nome) || 'Jogador');
const c81Texto = (m, sala) => m.escondida ? 'Mensagem escondida pela moderação.' : String((sala ? m.text : m.texto) || '');
const c81Id = (m, sala) => sala ? m.id : m.from;
const c81Eu = (m, sala) => sala ? m.id === NET49.id : m.from === BRASIL.id;
function c81Selo(m, sala){ return sala ? (m.id === NET49.id ? v79SeloEu() : v79SeloDoMembro(m.id)) : (m.selo || ''); }
function c81Lista(aba){                                   // as mensagens de uma conversa (sem as de quem está silenciado)
  if (aba === 'sala') return (SL.chat || []).filter(m => m && (m.sys || !c81Mudo(m.id))).slice(-40);
  return (BRASIL.msgs || []).filter(m => m && !c81Mudo(m.from)).slice(-40);
}
function c81Ultima(){                                     // a mensagem mais recente entre as conversas que você tem agora
  const L = [];
  if (NET49.room){ const s = c81Lista('sala'); if (s.length) L.push({aba:'sala', m:s[s.length - 1]}); }
  if (cbBrasilPode()){ const b = c81Lista('brasil'); if (b.length) L.push({aba:'brasil', m:b[b.length - 1]}); }
  if (!L.length) return null;
  L.sort((a, b) => (b.m.t || 0) - (a.m.t || 0));
  return L[0];
}
function c81Aviso(t){                                     // o aviso: dentro do painel (se está aberto) e na tela
  if (C81.erro){ C81.erro.textContent = t; C81.erro.hidden = !t; clearTimeout(C81.erroT); if (t) C81.erroT = setTimeout(() => { C81.erro.hidden = true; }, 3200); }
  if (!CB.aberto){ if (lobby.aberto) aviso(t); else x49Toast(t); }
}

/* ---------------------------------------------------------------- 1) onde a barra aparece (o menu, as telas, a sala e a partida) */
cbContexto = function(){
  if (c81Oculto()) return '';
  if (lobby.aberto){
    if (ONB.aberto) return '';
    if (lobby.tela === 'sala') return NET49.room ? 'sala' : '';
    if (!lobby.tela) return cbBrasilPode() || NET49.room ? 'lobby' : '';
    if (C81_CHIP.indexOf(lobby.tela) >= 0 && (cbBrasilPode() || NET49.room)) return 'chip';
    return '';
  }
  if (NET49.playing && RQ.on && !fimAberto() && !X49UI.open && !PAUSA.aberta && !editing && !RP.ativo) return 'jogo';
  return '';
};
cbLugar = function(){
  if (!CB.el) return;
  const onde = cbContexto(), tela = onde === 'chip' ? lobby.tela : '';
  if (onde !== CB.onde || (onde === 'chip' && CB.el.dataset.tela !== tela)){
    CB.onde = onde; CB.el.dataset.tela = tela;
    if (!onde) CB.el.hidden = true;
    else {
      let pai = null, antes = null;
      if (onde === 'lobby'){ pai = LB.palco; antes = LB.palco.querySelector('.lb-nav'); CB.brT = 0; }
      else if (onde === 'sala') pai = SL.el;
      else if (onde === 'chip') pai = TELAS[tela] && TELAS[tela].el;
      else pai = $('wrap');
      if (pai && (CB.el.parentNode !== pai || (antes && CB.el.nextSibling !== antes))){ if (antes) pai.insertBefore(CB.el, antes); else pai.appendChild(CB.el); }
      CB.el.className = 'c81 c81-' + onde + (CB.aberto ? ' aberto' : ''); CB.el.hidden = false;
      const st = CB.el.style; st.transform = st.bottom = st.left = st.width = st.height = ''; C81.lobbyChave = '';
      if (onde === 'jogo') cbEscalaJogo();
    }
    cbPinta();
  }
  if (onde === 'lobby') c81LobbyAjusta();
  if (CB.aberto && !onde && !lobby.aberto && !NET49.playing) cbFecha();   // (começou uma partida offline com o chat aberto)
  const agora = performance.now();
  if (agora - CB.limpa > 400){ CB.limpa = agora; cbDigLimpa(); }
  if (onde && cbBrasilPode() && !BRASIL.ws && agora > CB.brT){ CB.brT = agora + 12000; brasilConecta(); }   // o Chat do Brasil fica ligado onde a barra está (independe da sala)
};

cbEscalaJogo = function(){                               // na partida: do tamanho do jogo na tela (e do Tamanho da interface), colada embaixo do campo
  if (!CB.el || CB.onde !== 'jogo') return;
  const r = cv.getBoundingClientRect(), w = $('wrap').getBoundingClientRect(), s = r.height/H*(HUDX.k || 1);
  CB.el.style.transform = 'translateX(-50%) scale(' + s.toFixed(4) + ')';
  CB.el.style.bottom = Math.max(0, w.bottom - r.bottom) + 'px';
};

function c81LobbyAjusta(forca){                           // no menu: a barra vira um bloco no vão da fileira de baixo, entre o DESAFIOS e o MODO (da altura deles)
  if (!CB.el || CB.onde !== 'lobby') return;
  const agora = performance.now(), R = LB.raiz.classList;
  const chave = innerWidth + 'x' + innerHeight + '|' + (PALCO.s || 1).toFixed(4) + '|' + (R.contains('retrato') ? 'r' : '') + (R.contains('v70-cabe') ? 'c' : '');
  if (!forca && chave === C81.lobbyChave && agora < C81.lobbyT) return;
  C81.lobbyChave = chave; C81.lobbyT = agora + 1000;
  const st = CB.el.style, pai = CB.el.offsetParent || LB.palco, d = LB.missoes, m = LB.modo;
  const solta = () => { st.left = st.width = st.height = st.bottom = st.transform = ''; CB.el.classList.remove('c81-vao'); };
  if (R.contains('retrato') || !pai || !d || !m || d.hidden || m.hidden) return solta();
  const s = PALCO.s || 1, pr = pai.getBoundingClientRect(), a = d.getBoundingClientRect(), b = m.getBoundingClientRect();
  if (!a.width || !b.width || !pr.width) return solta();
  const esq = (a.right - pr.left)/s + 12, dir = (b.left - pr.left)/s - 12, topo = Math.min(a.top, b.top), base = Math.max(a.bottom, b.bottom);
  if (dir - esq < 240 || base - topo < 40) return solta();   // (sem vão de verdade: fica onde o CSS põe)
  st.left = esq.toFixed(1) + 'px'; st.width = (dir - esq).toFixed(1) + 'px'; st.transform = 'none';
  st.height = ((base - topo)/s).toFixed(1) + 'px'; st.bottom = ((pr.bottom - base)/s).toFixed(1) + 'px';
  CB.el.classList.add('c81-vao');
}

/* ---------------------------------------------------------------- 2) a barra (o que aparece minimizado) */
cbPinta = function(){
  if (!CB.el || !CB.onde) return;
  const u = c81Ultima(), aba = u ? u.aba : (NET49.room ? 'sala' : 'brasil'), sala = aba === 'sala';
  C81.tagIc.innerHTML = C81_SVG[sala ? 'sala' : 'brasil']; C81.tag.lastChild.textContent = sala ? 'SALA' : 'BRASIL';
  CB.msg.textContent = '';
  if (u && u.m){
    const m = u.m;
    if (m.sys) CB.msg.appendChild(nodo('i', null, c81Texto(m, sala)));
    else { const b = nodo('b', null, c81Nome(m, sala) + ':'); try { v79SeloMarca(b, c81Selo(m, sala)); } catch (_) {} CB.msg.append(b, ' ' + c81Texto(m, sala)); }
  } else if (sala) CB.msg.appendChild(nodo('i', null, NET49.playing ? 'Você está na partida' : 'Você chegou na sala'));
  else CB.msg.appendChild(nodo('i', null, BRASIL.estado === 'on' ? 'Chat do Brasil: mande um salve!' : BRASIL.estado === 'ligando' ? 'Conectando ao Chat do Brasil…' : 'Chat do Brasil fora do ar'));
  const n = (BRASIL.naoLidas | 0) + (NET49.room ? SL.naoLidas | 0 : 0);
  CB.n.hidden = !(n > 0); CB.n.textContent = n > 9 ? '9+' : String(n);
  C81.seta.innerHTML = C81_SVG[CB.aberto ? 'baixo' : 'cima'];
  CB.el.dataset.aba = aba;
  const chave = u && u.m ? aba + '|' + (u.m.t || '') + '|' + c81Texto(u.m, sala) : '';
  if (chave !== C81.ultimaChave){ C81.ultimaChave = chave; if (!c81Calmo()){ CB.msg.classList.remove('troca'); void CB.msg.offsetWidth; CB.msg.classList.add('troca'); } }
};

/* ---------------------------------------------------------------- 3) o painel (expandido) */
function c81Aba(id, txt, ic, n){
  const b = novoBotao('c81-aba' + (CB.aba === id ? ' on' : '')); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', CB.aba === id ? 'true' : 'false');
  const i = nodo('i'); i.innerHTML = C81_SVG[ic]; b.append(i, nodo('span', null, txt));
  if (n > 0 && CB.aba !== id) b.appendChild(nodo('b', null, n > 9 ? '9+' : String(n)));
  b.addEventListener('click', () => { if (CB.aba === id) return; som.clique(); CB.aba = id; cbLido(); cbPintaPainel(); cbPinta(); try { CB.inp.focus({preventScroll:true}); } catch (_) {} });
  return b;
}
function c81Linha(m, sala){
  const eu = c81Eu(m, sala), d = nodo('div', 'c81-lin' + (m.sys ? ' sys' : '') + (eu ? ' eu' : '') + (m.escondida ? ' oculta' : ''));
  if (m.sys){ d.appendChild(nodo('span', 'c81-tx', c81Texto(m, sala))); return d; }
  const nm = novoBotao('c81-nome', 'Ver ' + c81Nome(m, sala)), b = nodo('b', null, c81Nome(m, sala));
  try { v79SeloMarca(b, c81Selo(m, sala)); } catch (_) {}
  nm.appendChild(b); if (!sala && m.clube) nm.appendChild(nodo('small', null, '[' + m.clube + ']'));
  nm.addEventListener('click', () => { som.clique(); c81FichaAbre(m, sala); });
  d.append(nm, nodo('span', 'c81-tx', c81Texto(m, sala)));
  if (m.t) d.appendChild(nodo('small', 'c81-h', brasilTempo(m.t)));
  return d;
}
cbPintaPainel = function(){
  if (!CB.aberto) return;
  const temSala = !!NET49.room, temBr = cbBrasilPode();
  if (CB.aba === 'sala' && !temSala) CB.aba = 'brasil';
  if (CB.aba === 'brasil' && !temBr && temSala) CB.aba = 'sala';
  CB.abas.textContent = '';
  if (temBr) CB.abas.appendChild(c81Aba('brasil', 'BRASIL', 'brasil', BRASIL.naoLidas));
  if (temSala) CB.abas.appendChild(c81Aba('sala', NET49.playing ? 'PARTIDA' : 'SALA', 'sala', SL.naoLidas));
  const sala = CB.aba === 'sala';
  C81.online.textContent = sala ? (NET49.room ? NET49.room.members.filter(x => !x.bot).length + ' na sala' : '') : BRASIL.estado === 'on' ? BRASIL.online + ' online' : BRASIL.estado === 'ligando' ? 'conectando…' : !brasilLigado() ? 'desligado' : 'fora do ar';
  CB.inp.placeholder = 'Digite sua mensagem…';
  CB.inp.disabled = sala ? !NET49.room : BRASIL.estado !== 'on';
  CB.rap.textContent = ''; CB.rap.hidden = !sala;
  if (sala) for (const f of SL_FRASES){ const b = novoBotao('c81-chip'); b.textContent = f; b.addEventListener('click', () => { som.clique(); if (cbDiz(f) && CB.onde === 'jogo') cbFecha(); }); CB.rap.appendChild(b); }
  const lista = CB.lista, preso = C81.preso;
  lista.textContent = '';
  if (!sala && BRASIL.estado !== 'on') lista.appendChild(nodo('div', 'c81-lin sys', !brasilLigado() ? 'O Chat do Brasil está desligado nos Ajustes.' : BRASIL.estado === 'ligando' ? 'Conectando ao Chat do Brasil…' : window.RACHA_SEM_REDE ? 'Esta demonstração não tem o servidor: o Chat do Brasil fica desligado.' : 'Chat do Brasil fora do ar agora. Tentando de novo…'));
  const L = c81Lista(CB.aba);
  for (const m of L) lista.appendChild(c81Linha(m, sala));
  if (!L.length && (sala || BRASIL.estado === 'on')) lista.appendChild(nodo('div', 'c81-lin sys', sala ? 'Ninguém falou nada ainda. Mande um "bora!".' : 'Ainda ninguém falou nada. Diga um "boa!" para a galera.'));
  if (preso) lista.scrollTop = lista.scrollHeight;
  C81.tudo.hidden = !(CB.aba === 'brasil' && lobby.aberto);
};
cbLido = function(){
  if (CB.aba === 'brasil'){ BRASIL.naoLidas = 0; brasilBadge(); if (!BRASIL.ws && cbBrasilPode()) brasilConecta(); }
  else SL.naoLidas = 0;
};
cbAbre = function(aba, soFrases){
  if (!CB.pn || c81Oculto()) return;
  CB.aba = aba || (CB.onde === 'lobby' || CB.onde === 'chip' || !NET49.room ? 'brasil' : 'sala');
  if (!aba){ const u = c81Ultima(); if (u) CB.aba = u.aba; }
  CB.aberto = true; C81.preso = true; CB.pn.hidden = false; CB.pn.classList.toggle('jogo', !lobby.aberto);
  if (!lobby.aberto) limparEntrada();                     // na partida: o seu jogador para enquanto você escreve (a partida continua)
  cbLido(); cbPintaPainel(); cbPinta(); c81Teclado(); if (CB.el) CB.el.classList.add('aberto');
  if (!soFrases) setTimeout(() => { if (CB.aberto) try { CB.inp.focus({preventScroll:true}); } catch (_) {} }, 40);
};
cbFecha = function(){
  if (!CB.aberto) return;
  CB.aberto = false; CB.pn.hidden = true; c81FichaFecha();
  try { CB.inp.blur(); } catch (_) {}
  cbDigitando(false); cbPinta(); if (CB.el) CB.el.classList.remove('aberto');
  if (!lobby.aberto){ limparEntrada(); last = performance.now(); try { cv.focus({preventScroll:true}); } catch (_) {} }
};
function c81Teclado(){                                    // o teclado do celular: o painel sobe junto (VisualViewport)
  const vv = window.visualViewport; if (!vv || !CB.pn) return;
  const kb = CB.aberto ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
  CB.pn.style.setProperty('--c81-kb', kb + 'px');
}

/* ---------------------------------------------------------------- 4) mandar: os filtros no aparelho (antes de ir) e o limite */
const C81_PESSOAL = [/(?:\(?\d{2}\)?[\s.-]?)?9?\s?\d{4}[\s.-]?\d{4}\b/, /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}\b/, /\S+@\S+\.\S+/];   // telefone, CPF, e-mail
const C81_LINK = /https?:|www\.|\.com\b|\.net\b|\.gg\b|\.br\b|discord\.|t\.me\/|bit\.ly|wa\.me|\.io\b|\.app\b|\.xyz\b|\.link\b|\.org\b|@[a-z0-9_.]{3,}/i;
function c81Motivo(t){                                    // por que a mensagem não vai (o servidor confere de novo; aqui é para avisar na hora)
  if (C81_PESSOAL.some(r => r.test(t))) return 'Para a sua segurança, o chat não envia telefone, e-mail nem CPF.';
  if (C81_LINK.test(t)) return 'O chat não envia links nem @ de rede social.';
  if (BR_FILTRO[0].test(t)) return 'O filtro do chat bloqueou essa mensagem.';
  return '';
}
cbDiz = function(t){
  t = String(t || '').replace(/\s+/g, ' ').trim().slice(0, 120); if (!t) return false;
  const motivo = c81Motivo(t); if (motivo){ c81Aviso(motivo); return false; }
  const agora = performance.now();
  if (CB.aba === 'sala'){
    if (!NET49.room) return false;
    C81.ritmo = C81.ritmo.filter(x => agora - x < 10000);
    if (C81.ritmo.length >= 4){ c81Aviso('Calma: muitas mensagens seguidas.'); return false; }
    if (t.toLowerCase() === C81.ultTxtSala && agora - C81.ultSala < 30000){ c81Aviso('Essa mensagem é igual à anterior.'); return false; }
    C81.ritmo.push(agora); C81.ultSala = agora; C81.ultTxtSala = t.toLowerCase();
    net49Send({type:'say', text:t}); cbDigitando(false); return true;
  }
  if (!brasilLigado()){ c81Aviso('O Chat do Brasil está desligado nos Ajustes.'); return false; }
  if (BRASIL.estado !== 'on'){ c81Aviso('Chat fora do ar agora. Tentando de novo…'); brasilConecta(); return false; }
  if (agora - BRASIL.ultimaMsg < 2900){ c81Aviso('Calma: 1 mensagem a cada 3 segundos.'); return false; }
  BRASIL.ultimaMsg = agora; brasilSend({type:'brasil_say', text:t});
  return true;
};

/* ---------------------------------------------------------------- 5) "digitando": só enquanto escreve (não só com o chat aberto) e some em 4,5 s */
cbDigitando = function(on){
  clearInterval(CB.keepT); CB.keepT = 0;
  if (!NET49.id || !NET49.room){ C81.digOn = false; return; }
  if (!on){ if (C81.digOn){ net49Send({type:'typing', on:false}); cbDig(NET49.id, false); } C81.digOn = false; }
};
function c81Digitou(){                                    // (a cada letra) avisa a sala de 2 em 2 s enquanto tem texto; sem texto, para
  if (!NET49.id || !NET49.room || CB.aba !== 'sala') return;
  const agora = performance.now(), tem = !!CB.inp.value.trim();
  if (!tem){ cbDigitando(false); return; }
  if (!C81.digOn || agora - C81.digT > 2000){ C81.digT = agora; C81.digOn = true; net49Send({type:'typing', on:true}); cbDig(NET49.id, true); }
}
cbDig = function(id, on){ if (!id) return; if (on) CB.dig.set(id, performance.now() + 4500); else CB.dig.delete(id); slDigCartoes(); };
cbBalaoDesenha = function(g, x, y, r){                    // na partida: o balão escuro pequeno com os três pontinhos, em cima da tampinha
  const t = performance.now()/1000, calmo = c81Calmo(), w = r*2.3, h = r*1.12, y1 = y - r*1.6, y0 = y1 - h, x0 = x - w/2, cor = 'rgba(10,8,18,.74)';
  g.save(); g.lineJoin = 'round';
  rr(g, x0, y0, w, h, h/2); g.fillStyle = cor; g.fill(); g.lineWidth = Math.max(1, r*.06); g.strokeStyle = 'rgba(255,255,255,.24)'; g.stroke();
  g.beginPath(); g.moveTo(x - r*.22, y1 - 1); g.lineTo(x, y1 + r*.28); g.lineTo(x + r*.22, y1 - 1); g.closePath(); g.fillStyle = cor; g.fill();   // o rabinho
  for (let i = 0; i < 3; i++){
    const f = ((t*1.5 - i*.2) % 1 + 1) % 1, s = calmo ? 1 : Math.sin(f*Math.PI);
    g.fillStyle = 'rgba(255,255,255,' + (calmo ? 1 : .42 + .58*s).toFixed(2) + ')';
    g.beginPath(); g.arc(x + (i - 1)*r*.5, y0 + h/2 - (calmo ? 0 : s*r*.13), r*.13, 0, TAU); g.fill();
  }
  g.restore();
};

/* ---------------------------------------------------------------- 6) a ficha de quem escreveu (pelo nome): perfil, silenciar, denunciar */
function c81Conta(id){ const m = /^c(\d{1,9})$/.exec(String(id || '')); return m ? String(Number(m[1])).padStart(6, '0') : ''; }
function c81FichaAbre(m, sala){
  const F = C81.ficha; if (!F) return;
  const id = c81Id(m, sala), nome = c81Nome(m, sala), eu = c81Eu(m, sala), mudo = c81Mudo(id);
  const memb = sala && NET49.room ? NET49.room.members.find(x => x && x.id === id) : null;
  const skin = sala ? (memb ? memb.skin : '') : m.skin, avatar = sala ? (memb ? memb.avatar : null) : m.avatar, clube = sala ? (memb && memb.club ? memb.club.name : '') : (m.clube || '');
  const selo = c81Selo(m, sala), conta = c81Conta(id);
  C81.fichaDe = {m, sala};
  F.textContent = '';
  const cab = nodo('div', 'c81-f-cab'), tp = nodo('span', 'c81-f-tampa');
  try { const c = brasilTampa({skin, avatar}); const cv2 = nodo('canvas'); cv2.width = cv2.height = 80; cv2.getContext('2d').drawImage(c, 0, 0); cv2.setAttribute('aria-hidden', 'true'); tp.appendChild(cv2); } catch (_) {}
  const tx = nodo('div', 'c81-f-tx'), b = nodo('b', null, nome); try { v79SeloMarca(b, selo); } catch (_) {}
  tx.appendChild(b);
  const det = []; if (clube) det.push('Clube ' + clube); if (conta) det.push('ID ' + conta); if (!sala) det.push('Chat do Brasil'); else det.push(NET49.playing ? 'Na partida' : 'Na sala');
  tx.appendChild(nodo('small', null, det.join(' · ')));
  cab.append(tp, tx);
  const x = novoBotao('c81-f-x', 'Fechar'); x.textContent = '✕'; x.addEventListener('click', () => { som.clique(); c81FichaFecha(); });
  cab.appendChild(x);
  const acoes = nodo('div', 'c81-f-acoes');
  const bt = (txt, ic, cls, fn) => { const k = novoBotao('c81-f-bt ' + (cls || '')); const i = nodo('i'); i.innerHTML = C81_SVG[ic]; k.append(i, nodo('span', null, txt)); k.addEventListener('click', fn); acoes.appendChild(k); return k; };
  let p = null; try { p = window.parent !== window && typeof window.parent.RACHA_ABRIR === 'function' ? window.parent : null; } catch (_) { p = null; }
  if (conta && p) bt('VER PERFIL', 'perfil', 'amarelo', () => { som.clique(); try { p.RACHA_ABRIR('/jogador/' + conta); } catch (_) {} c81FichaFecha(); if (!lobby.aberto) cbFecha(); });
  else if (eu) bt('MEU PERFIL', 'perfil', 'amarelo', () => { som.clique(); c81FichaFecha(); if (lobby.aberto){ cbFecha(); abreTela('perfil'); } });
  if (!eu) bt(mudo ? 'DEIXAR FALAR' : 'SILENCIAR', 'mudo', '', () => {
    som.clique();
    if (mudo) BRASIL.silenciados.delete(id); else BRASIL.silenciados.add(id);
    brasilSalvarMudo(); c81FichaFecha(); cbPintaPainel(); cbPinta();
    try { if (BRASIL.aberto) brasilRenderLista(true); } catch (_) {}
    c81Aviso(mudo ? nome + ' voltou a aparecer para você.' : nome + ' silenciado: as mensagens dele não aparecem mais para você.');
  });
  if (!eu && !m.escondida){
    const mid = sala ? m.mid : m.id, ja = mid && BRASIL.denunciados.has(mid);
    const k = bt(ja ? 'DENUNCIADA' : 'DENUNCIAR', 'bandeira', 'vermelho', () => {
      if (!mid || BRASIL.denunciados.has(mid)) return;
      som.clique(); BRASIL.denunciados.add(mid);
      if (sala) net49Send({type:'report', mid}); else brasilSend({type:'brasil_report', id:mid});
      c81FichaFecha(); c81Aviso('Denúncia enviada. Com mais denúncias a mensagem some e quem escreveu fica um tempo sem falar.');
    });
    if (ja || !mid) k.disabled = true;
  }
  F.append(cab, nodo('p', 'c81-f-nota', m.sys ? '' : '“' + c81Texto(m, sala).slice(0, 80) + (c81Texto(m, sala).length > 80 ? '…' : '') + '”'), acoes);
  F.hidden = false;
  try { x.focus({preventScroll:true}); } catch (_) {}
}
function c81FichaFecha(){ if (C81.ficha){ C81.ficha.hidden = true; C81.ficha.textContent = ''; } C81.fichaDe = null; }

/* ---------------------------------------------------------------- 7) ocultar o chat (a chave nos Ajustes e o botão do painel) */
function c81Oculta(on){
  CONTA.chatOculto = !!on; contaSalvar();
  const b = document.getElementById('aj-chat-tela'); if (b) b.setAttribute('aria-pressed', String(!on));
  if (on){ cbFecha(); if (CB.el){ CB.el.hidden = true; CB.onde = ''; } }
}
try {
  const lin = ajxChave('aj-chat-tela', 'Chat na tela', 'A barra do chat embaixo: no menu, nas telas, na sala e na partida. Desligada, o Chat do Brasil continua no ícone de cima');
  const b = lin.querySelector('button'); b.setAttribute('aria-pressed', String(!c81Oculto()));
  b.addEventListener('click', () => { som.clique(); c81Oculta(!c81Oculto()); if (!c81Oculto()) aviso('O chat voltou para a tela.'); });
  const ref = document.getElementById('aj-chat'), l0 = ref && ref.closest('.aj-lin');
  if (l0 && l0.parentNode) l0.parentNode.insertBefore(lin, l0.nextSibling);
} catch (_) {}

/* ---------------------------------------------------------------- 8) a sala: a mensagem escondida por denúncia e o silenciado */
const net49MessageAntes81 = net49Message;
net49Message = function(m){
  if (m && m.type === 'say_hide'){
    const alvo = (SL.chat || []).find(x => x && x.mid === m.mid);
    if (alvo){ alvo.escondida = true; cbPinta(); if (CB.aberto) cbPintaPainel(); }
    return;
  }
  if (m && m.type === 'error' && (m.codigo === 'silenciado' || m.codigo === 'repetida' || m.codigo === 'filtro')){ c81Aviso(m.message); return; }   // (na partida o painel já fechou no ENVIAR: vira o aviso da tela e fica no painel por uns segundos)
  return net49MessageAntes81.apply(this, arguments);
};
const brasilMsgAntes81 = brasilMsg;
brasilMsg = function(m){
  if (m && m.type === 'brasil_error'){
    const motivos = {ritmo:'Calma: 1 mensagem a cada 3 segundos.', repetida:'Essa mensagem é igual à anterior.', filtro:'O filtro do chat bloqueou essa mensagem.', silenciado:'Você está silenciado por denúncias. Daqui a pouco você volta.', longa:'Mensagem comprida demais (máx. 120).'};
    c81Aviso(motivos[m.reason] || 'Não foi. Tente de novo.'); return;
  }
  return brasilMsgAntes81.apply(this, arguments);
};

/* ---------------------------------------------------------------- 9) monta a barra e o painel novos (nos mesmos nós da v63: #cb e #cp) */
(function(){
  if (!CB.el || !CB.pn) return;
  // a barra: [tag BRASIL/SALA] [NOME: mensagem] [n] [^]
  CB.el.textContent = ''; CB.el.className = 'c81'; CB.el.hidden = true;
  const ab = novoBotao('c81-abrir', 'Abrir o chat');
  C81.tag = nodo('span', 'c81-tag'); C81.tagIc = nodo('i'); C81.tagIc.innerHTML = C81_SVG.brasil; C81.tag.append(C81.tagIc, nodo('span', null, 'BRASIL'));
  CB.msg = nodo('span', 'c81-msg'); CB.n = nodo('b', 'c81-n'); CB.n.hidden = true; C81.seta = nodo('i', 'c81-seta'); C81.seta.innerHTML = C81_SVG.cima;
  ab.append(C81.tag, CB.msg, CB.n, C81.seta); CB.el.appendChild(ab); CB.txb = ab; CB.balao = ab; CB.mega = null;
  ab.addEventListener('click', () => { som.clique(); if (CB.aberto) cbFecha(); else cbAbre(); });
  // o painel: as abas, quem está online, OCULTAR, minimizar; as mensagens; as frases rápidas; o campo e ENVIAR; a ficha
  CB.pn.textContent = ''; CB.pn.className = 'c81-pn'; CB.pn.hidden = true;
  const caixa = nodo('div', 'c81-caixa'), cab = nodo('div', 'c81-cab');
  CB.abas = nodo('div', 'c81-abas'); CB.abas.setAttribute('role', 'tablist'); CB.abas.setAttribute('aria-label', 'Conversas');
  C81.online = nodo('span', 'c81-online');
  C81.tudo = novoBotao('c81-ic', 'Abrir o Chat do Brasil completo'); C81.tudo.innerHTML = C81_SVG.tudo; C81.tudo.hidden = true;
  C81.tudo.addEventListener('click', () => { som.clique(); cbFecha(); if (lobby.aberto) abreTela('chat'); });
  const oculta = novoBotao('c81-ic', 'Ocultar o chat'); oculta.innerHTML = C81_SVG.olho;
  oculta.addEventListener('click', () => { som.clique(); c81Oculta(true); (lobby.aberto ? aviso : x49Toast)('Chat oculto. Para voltar: Ajustes › Conta › Chat na tela.'); });
  const min = novoBotao('c81-ic c81-min', 'Minimizar o chat'); min.innerHTML = C81_SVG.baixo; min.addEventListener('click', () => { som.clique(); cbFecha(); });
  cab.append(CB.abas, C81.online, C81.tudo, oculta, min);
  CB.lista = nodo('div', 'c81-lista'); CB.lista.setAttribute('aria-live', 'polite');
  CB.lista.addEventListener('scroll', () => { C81.preso = CB.lista.scrollTop + CB.lista.clientHeight >= CB.lista.scrollHeight - 28; });
  CB.rap = nodo('div', 'c81-rap'); CB.rap.hidden = true;
  const form = nodo('form', 'c81-form'); form.autocomplete = 'off';
  CB.inp = nodo('input', 'c81-in'); CB.inp.type = 'text'; CB.inp.maxLength = 120; CB.inp.autocomplete = 'off'; CB.inp.spellcheck = false;
  CB.inp.setAttribute('enterkeyhint', 'send'); CB.inp.setAttribute('aria-label', 'Mensagem para a galera'); CB.inp.placeholder = 'Digite sua mensagem…';
  const ok = nodo('button', 'c81-ok'); ok.type = 'submit'; ok.setAttribute('aria-label', 'Enviar'); const oki = nodo('i'); oki.innerHTML = C81_SVG.envia; ok.append(oki, nodo('span', null, 'ENVIAR'));
  form.append(CB.inp, ok);
  C81.erro = nodo('div', 'c81-erro'); C81.erro.hidden = true; C81.erro.setAttribute('role', 'status');
  C81.ficha = nodo('div', 'c81-ficha'); C81.ficha.hidden = true; C81.ficha.setAttribute('role', 'dialog'); C81.ficha.setAttribute('aria-label', 'Jogador');
  caixa.append(cab, CB.lista, CB.rap, C81.erro, form, C81.ficha); CB.pn.appendChild(caixa);
  CB.rodape = null;
  CB.pn.addEventListener('click', e => { if (e.target === CB.pn) cbFecha(); });
  form.addEventListener('submit', e => { e.preventDefault(); const t = CB.inp.value.trim(); if (!t) return; if (cbDiz(t)){ CB.inp.value = ''; C81.preso = true; if (CB.onde === 'jogo') cbFecha(); else try { CB.inp.focus({preventScroll:true}); } catch (_) {} } });
  CB.inp.addEventListener('input', c81Digitou);
  if (window.visualViewport){ window.visualViewport.addEventListener('resize', c81Teclado); window.visualViewport.addEventListener('scroll', c81Teclado); }
})();

window.RachaChat81 = {lobbyAjusta:c81LobbyAjusta, 
  contexto:() => cbContexto(), onde:() => CB.onde, aberto:() => CB.aberto, aba:() => CB.aba, ultima:() => c81Ultima(), lista:a => c81Lista(a), motivo:t => c81Motivo(t),
  digitando:id => cbDigita(id), oculto:() => c81Oculto(), oculta:on => c81Oculta(on), ficha:() => C81.fichaDe, abreFicha:(m, sala) => c81FichaAbre(m, sala), chip:C81_CHIP.slice()
};
