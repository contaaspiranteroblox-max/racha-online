/* ======================================================================================================================
   RACHA v88 · O CHAT POR CANAIS (o painel da v81 — a barra embaixo que abre e minimiza — ganha as conversas que faltavam):
   · MUNDO (o Chat do Brasil de sempre) e SALA (a da sala/partida, como antes);
   · EQUIPE: só o seu time ouve (na sala e na partida; quem assiste não tem equipe);
   · CLUBE: o chat do seu clube (o da conta), com o histórico curto;
   · AMIGOS: a mensagem direta para um amigo (chega mesmo se ele estiver offline: fica guardada por 7 dias).
   Em tempo real pelo servidor das salas; o mesmo filtro (palavrão, link, @, telefone, e-mail, CPF), o mesmo limite de envio e a
   trava contra a repetida; o BLOQUEIO vale no servidor (quem bloqueou não recebe nem aparece) e o SILENCIAR vale só para
   você. A ficha de quem escreveu ganha VER PERFIL, ADICIONAR, BLOQUEAR e a DENÚNCIA COM MOTIVO (vai para o RACHA CONTROL).
   Nada de informação privada no chat: só o nome que a pessoa escolheu e o ID público.
   ====================================================================================================================== */
const V88CH = {abas:['equipe', 'clube', 'amigos'], pediuClube:0, pediuDm:new Map()};
const V88_CH_ROT = {equipe:'EQUIPE', clube:'CLUBE', amigos:'AMIGOS'};
const V88_CH_IC = {equipe:'equipe', clube:'clube', amigos:'amigos'};
function v88MeuTime(){ const r = NET49.room; if (!r || !NET49.id) return -1; const eu = r.members.find(x => x.id === NET49.id); return eu && eu.slot >= 0 ? Math.floor(eu.slot/r.n) : -1; }
function v88TemCanal(id){
  if (id === 'equipe') return !!NET49.room && v88MeuTime() >= 0;
  if (id === 'clube' || id === 'amigos') return v88Logado();
  return false;
}
function v88CanalNaoLidas(id){
  if (id === 'clube') return V88.clube.naoLidas | 0;
  if (id === 'amigos'){ let n = 0; for (const v of V88.dmNaoLidas.values()) n += v; return n; }
  if (id === 'equipe') return (SL.chat || []).filter(m => m && m.canal === 'equipe' && m.id !== NET49.id && (m.t || 0) > (V88CH.equipeLido || 0)).length;
  return 0;
}

/* ---- as mensagens da sala separadas da equipe (as duas chegam pelo mesmo 'say') ---- */
const c81ListaAntes88 = c81Lista;
c81Lista = function(aba){
  if (aba === 'equipe') return (SL.chat || []).filter(m => m && m.canal === 'equipe' && !c81Mudo(m.id) && !v88Silenciado(c81Conta(m.id) || m.id)).slice(-40);
  const l = c81ListaAntes88.apply(this, arguments);
  return aba === 'sala' ? l.filter(m => !(m && m.canal === 'equipe') && !(m && !m.sys && v88Silenciado(c81Conta(m.id) || m.id))) : l.filter(m => !(m && v88Silenciado(c81Conta(m.from) || m.from)));
};
const c81LinhaAntes88 = c81Linha;
c81Linha = function(m, sala){
  const d = c81LinhaAntes88.apply(this, arguments);
  if (m && m.canal === 'equipe'){ d.classList.add('v88-eq'); const t = nodo('span', 'v88-eq-tag', 'EQUIPE'); d.insertBefore(t, d.firstChild); }
  return d;
};

/* ---- as abas novas no painel ---- */
function v88AbaChat(id){
  const b = novoBotao('c81-aba v88-ch-aba' + (CB.aba === id ? ' on' : '')); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(CB.aba === id));
  b.append(v88IcEl(V88_CH_IC[id]), nodo('span', null, V88_CH_ROT[id]));
  const n = v88CanalNaoLidas(id); if (n > 0 && CB.aba !== id) b.appendChild(nodo('b', null, n > 9 ? '9+' : String(n)));
  b.addEventListener('click', () => { if (CB.aba === id) return; som.clique(); CB.aba = id; cbLido(); cbPintaPainel(); cbPinta(); try { CB.inp.focus({preventScroll:true}); } catch (_) {} });
  return b;
}
const cbPintaPainelAntes88 = cbPintaPainel;
cbPintaPainel = function(){
  if (!CB.aberto) return cbPintaPainelAntes88.apply(this, arguments);
  if (V88CH.abas.indexOf(CB.aba) >= 0 && !v88TemCanal(CB.aba)) CB.aba = NET49.room ? 'sala' : 'brasil';
  const meu = V88CH.abas.indexOf(CB.aba) >= 0, aba = CB.aba;
  if (meu) CB.aba = 'brasil';                                  // (o pintar de antes não conhece as abas novas: pinta o Brasil e a gente troca)
  const r = cbPintaPainelAntes88.apply(this, arguments);
  CB.aba = aba;
  for (const id of V88CH.abas) if (v88TemCanal(id)) CB.abas.appendChild(v88AbaChat(id));
  if (meu){ for (const b of CB.abas.querySelectorAll('.c81-aba:not(.v88-ch-aba)')){ b.classList.remove('on'); b.setAttribute('aria-selected', 'false'); } v88PintaCanal(aba); }
  return r;
};
function v88LinhaCh(m, opts){                              // uma linha do clube ou dos amigos (o mesmo jeito da linha da v81)
  const eu = m.de === V88.eu, d = nodo('div', 'c81-lin' + (eu ? ' eu' : '') + (m.escondida ? ' oculta' : ''));
  const nm = novoBotao('c81-nome', 'Ver ' + (m.nome || 'Jogador')), b = nodo('b', null, m.nome || 'Jogador'); try { v79SeloMarca(b, m.selo || ''); } catch (_) {}
  nm.appendChild(b);
  nm.addEventListener('click', () => { som.clique(); if (!eu) v88FichaCh(m, opts.canal); });
  d.append(nm, nodo('span', 'c81-tx', m.escondida ? 'Mensagem escondida pela moderação.' : String(m.texto || '')));
  if (m.t) d.appendChild(nodo('small', 'c81-h', brasilTempo(m.t)));
  return d;
}
function v88PintaCanal(aba){
  const lista = CB.lista, preso = C81.preso;
  lista.textContent = ''; CB.rap.textContent = ''; CB.rap.hidden = true;
  const ligado = NET49.id && NET49.ws && NET49.ws.readyState === 1;
  CB.inp.placeholder = 'Digite sua mensagem…';
  if (!ligado){ v88Conecta(); lista.appendChild(nodo('div', 'c81-lin sys', 'Conectando ao servidor das salas…')); CB.inp.disabled = true; C81.online.textContent = 'conectando…'; return; }
  if (aba === 'equipe'){
    const t = v88MeuTime();
    C81.online.textContent = 'só o seu time (' + (t ? 'TIME B' : 'TIME A') + ')';
    CB.inp.disabled = t < 0; CB.inp.placeholder = 'Mensagem só para o seu time…';
    const L = c81Lista('equipe');
    for (const m of L) lista.appendChild(c81Linha(m, true));
    if (!L.length) lista.appendChild(nodo('div', 'c81-lin sys', 'Combine a jogada: só quem está no seu time vê.'));
    V88CH.equipeLido = Date.now();
  } else if (aba === 'clube'){
    if (Date.now() - V88CH.pediuClube > 20000){ V88CH.pediuClube = Date.now(); net49Send({type:'clube_hist'}); }
    C81.online.textContent = 'o seu clube';
    const L = V88.clube.msgs.filter(m => !v88Silenciado(m.de));
    CB.inp.disabled = !V88.clube.chave && V88CH.pediuClube && Date.now() - V88CH.pediuClube > 1500;
    if (!V88.clube.chave && Date.now() - V88CH.pediuClube > 1500){
      lista.appendChild(nodo('div', 'c81-lin sys', 'Você ainda não está num clube. Entre ou crie um em CLUBE para usar o chat do clube.'));
    } else {
      for (const m of L) lista.appendChild(v88LinhaCh(m, {canal:'clube'}));
      if (!L.length) lista.appendChild(nodo('div', 'c81-lin sys', 'Ninguém falou no clube ainda. Puxe o assunto!'));
    }
    V88.clube.naoLidas = 0; V88.dmAberto = '#clube';
  } else if (aba === 'amigos'){
    const amg = v88AmigosOrdenados();
    C81.online.textContent = amg.filter(c => v88StatusDe(c.idPublico)).length + ' online';
    if (!amg.length){ lista.appendChild(nodo('div', 'c81-lin sys', 'Você ainda não tem amigos na conta. Adicione em AMIGOS.')); CB.inp.disabled = true; return; }
    if (!V88.dmAlvo || !amg.some(c => v88Pub(c.idPublico) === V88.dmAlvo)) V88.dmAlvo = v88Pub(amg[0].idPublico);
    CB.rap.hidden = false;                                    // os amigos em fileira (com o número de não lidas)
    for (const c of amg){
      const pub = v88Pub(c.idPublico), s = v88StatusDe(pub), b = novoBotao('c81-chip v88-ch-amg' + (pub === V88.dmAlvo ? ' on' : '') + (s ? ' online' : ''));
      b.append(nodo('i', 'v88-ch-pt'), nodo('span', null, c.nome));
      const n = V88.dmNaoLidas.get(pub); if (n) b.appendChild(nodo('b', null, n > 9 ? '9+' : String(n)));
      b.addEventListener('click', () => { som.clique(); V88.dmAlvo = pub; cbPintaPainel(); try { CB.inp.focus({preventScroll:true}); } catch (_) {} });
      CB.rap.appendChild(b);
    }
    const alvo = V88.dmAlvo, nomeAlvo = (amg.find(c => v88Pub(c.idPublico) === alvo) || {}).nome || 'amigo';
    if (!V88.dms.has(alvo) || Date.now() - (V88CH.pediuDm.get(alvo) || 0) > 60000){ V88CH.pediuDm.set(alvo, Date.now()); net49Send({type:'dm_hist', com:alvo}); }
    V88.dmAberto = alvo; V88.dmNaoLidas.delete(alvo);
    CB.inp.disabled = false; CB.inp.placeholder = 'Mensagem para ' + nomeAlvo + '…';
    const L = (V88.dms.get(alvo) || []).filter(m => !v88Silenciado(m.de));
    for (const m of L) lista.appendChild(v88LinhaCh(m, {canal:'dm'}));
    if (!L.length) lista.appendChild(nodo('div', 'c81-lin sys', 'Comece a conversa com ' + nomeAlvo + '. As mensagens ficam guardadas por 7 dias.'));
  }
  if (preso) lista.scrollTop = lista.scrollHeight;
  C81.tudo.hidden = true;
}
const cbLidoAntes88 = cbLido;
cbLido = function(){
  if (CB.aba === 'clube'){ V88.clube.naoLidas = 0; return; }
  if (CB.aba === 'amigos'){ if (V88.dmAlvo) V88.dmNaoLidas.delete(V88.dmAlvo); return; }
  if (CB.aba === 'equipe'){ V88CH.equipeLido = Date.now(); return; }
  return cbLidoAntes88.apply(this, arguments);
};
const cbDizAntes88 = cbDiz;
cbDiz = function(t){
  if (V88CH.abas.indexOf(CB.aba) < 0) return cbDizAntes88.apply(this, arguments);
  t = String(t || '').replace(/\s+/g, ' ').trim().slice(0, 120); if (!t) return false;
  const motivo = c81Motivo(t); if (motivo){ c81Aviso(motivo); return false; }
  if (!NET49.id){ c81Aviso('Sem conexão com o servidor das salas agora.'); v88Conecta(); return false; }
  if (CB.aba === 'equipe'){ if (v88MeuTime() < 0){ c81Aviso('Entre num time para falar com a sua equipe.'); return false; } net49Send({type:'say', text:t, canal:'equipe'}); return true; }
  if (CB.aba === 'clube'){ net49Send({type:'clube_say', texto:t}); return true; }
  if (CB.aba === 'amigos'){ if (!V88.dmAlvo) return false; net49Send({type:'dm', para:V88.dmAlvo, texto:t}); return true; }
  return false;
};
const cbContextoAntes88 = cbContexto;
cbContexto = function(){
  const r = cbContextoAntes88.apply(this, arguments);
  if (r || c81Oculto() || !lobby.aberto || !v88Logado()) return r;
  if (!lobby.tela && !ONB.aberto) return 'lobby';                     // logado: a barra fica no lobby (os amigos e o clube) mesmo sem o Chat do Brasil
  return r;
};
// o que chega repinta o painel (se estiver aberto naquela aba) e a barra
for (const ev of ['dm', 'clube', 'status', 'amigos']) v88On(ev, () => { try { if (CB.aberto && V88CH.abas.indexOf(CB.aba) >= 0) cbPintaPainel(); cbPinta(); } catch (_) {} });
// a barra minimizada conta as não lidas novas
const cbPintaAntes88 = cbPinta;
cbPinta = function(){
  const r = cbPintaAntes88.apply(this, arguments);
  try {
    if (CB.el && CB.n && v88Logado()){
      const base = (BRASIL.naoLidas | 0) + (NET49.room ? SL.naoLidas | 0 : 0), extra = v88CanalNaoLidas('clube') + v88CanalNaoLidas('amigos'), n = base + extra;
      CB.n.hidden = !(n > 0); CB.n.textContent = n > 9 ? '9+' : String(n);
    }
  } catch (_) {}
  return r;
};

/* ---- a ficha de quem escreveu: perfil, adicionar, bloquear e a denúncia com motivo ---- */
const c81FichaAbreAntes88 = c81FichaAbre;
c81FichaAbre = function(m, sala){
  if (C81.ficha) C81.ficha.classList.remove('v88-f-den');
  const r = c81FichaAbreAntes88.apply(this, arguments);
  try {
    const F = C81.ficha, ac = F && F.querySelector('.c81-f-acoes'); if (!ac) return r;
    const id = c81Id(m, sala), conta = c81Conta(id), eu = c81Eu(m, sala), nome = c81Nome(m, sala);
    const mk = (txt, ic, cls, fn) => { const k = novoBotao('c81-f-bt ' + (cls || '')); k.append(v88IcEl(ic), nodo('span', null, txt)); k.addEventListener('click', fn); ac.appendChild(k); return k; };
    if (conta && !eu && v88Logado()){
      // o VER PERFIL: o perfil do jogador no jogo (o da v87 abria a página do site por cima; um botão só, nunca dois)
      const verPerfil = () => { som.clique(); c81FichaFecha(); if (!lobby.aberto) cbFecha(); v88AbrePerfil(conta); };
      const velho = Array.from(ac.querySelectorAll('.c81-f-bt')).find(b => /VER PERFIL/.test(b.textContent) && !b.classList.contains('v88-f-perfil'));
      if (velho){ const k = velho.cloneNode(true); k.classList.add('v88-f-perfil'); k.addEventListener('click', verPerfil); velho.replaceWith(k); }
      else if (!ac.querySelector('.v88-f-perfil')){ const k = mk('VER PERFIL', 'perfil', 'amarelo v88-f-perfil', verPerfil); ac.insertBefore(k, ac.firstChild); }
      if (!V88.amigos.some(c => v88Pub(c.idPublico) === conta)) mk('ADICIONAR', 'amigo_add', 'verde', () => { som.clique(); c81FichaFecha(); v88PedeAmizade(conta); });
      mk('BLOQUEAR', 'bloquear', 'vermelho', () => { som.clique(); c81FichaFecha(); if (!lobby.aberto) cbFecha(); v88Bloqueia(conta, nome); });
    }
    // a denúncia de antes ia sem motivo: agora pede o motivo ali mesmo, na ficha (vale na partida, com o lobby fechado)
    const den = Array.from(ac.querySelectorAll('.c81-f-bt.vermelho')).find(b => /DENUNCI/.test(b.textContent));
    if (den && !den.disabled){
      const novo = den.cloneNode(true); den.replaceWith(novo);
      novo.addEventListener('click', () => {
        som.clique(); const mid = sala ? m.mid : m.id; if (!mid || BRASIL.denunciados.has(mid)) return;
        v88DenunciaFicha({canal:sala ? (m.canal === 'equipe' ? 'equipe' : 'sala') : 'brasil', mid, texto:c81Texto(m, sala), nome});
      });
    }
  } catch (e) { console.error(e); }
  return r;
};
function v88FichaCh(m, canal){                             // a ficha das mensagens do clube e dos amigos (a mesma caixa da v81)
  const F = C81.ficha; if (!F) return;
  const pub = /^\d{6,9}$/.test(String(m.de)) ? v88Pub(m.de) : '', nome = m.nome || 'Jogador', mudo = v88Silenciado(m.de);
  F.textContent = ''; F.classList.remove('v88-f-den');
  const cab = nodo('div', 'c81-f-cab'), tx = nodo('div', 'c81-f-tx'); tx.append(nodo('b', null, nome), nodo('small', null, (pub ? 'ID ' + pub + ' · ' : '') + (canal === 'clube' ? 'Chat do clube' : 'Chat dos amigos')));
  const x = novoBotao('c81-f-x', 'Fechar'); x.textContent = '✕'; x.addEventListener('click', () => { som.clique(); c81FichaFecha(); });
  cab.append(tx, x);
  const ac = nodo('div', 'c81-f-acoes');
  const mk = (txt, ic, cls, fn) => { const k = novoBotao('c81-f-bt ' + (cls || '')); k.append(v88IcEl(ic), nodo('span', null, txt)); k.addEventListener('click', () => { som.clique(); c81FichaFecha(); fn(); }); ac.appendChild(k); return k; };
  if (pub) mk('VER PERFIL', 'perfil', 'amarelo', () => { if (!lobby.aberto) cbFecha(); v88AbrePerfil(pub); });
  mk(mudo ? 'DEIXAR FALAR' : 'SILENCIAR', 'mudo', '', () => { v88Silencia(m.de, !mudo); c81Aviso(mudo ? nome + ' voltou a aparecer para você.' : nome + ' silenciado (só para você).'); cbPintaPainel(); });
  if (pub) mk('BLOQUEAR', 'bloquear', 'vermelho', () => { if (!lobby.aberto) cbFecha(); v88Bloqueia(pub, nome); });
  if (m.mid){ const k = novoBotao('c81-f-bt vermelho'); k.append(v88IcEl('bandeira'), nodo('span', null, 'DENUNCIAR')); k.addEventListener('click', () => { som.clique(); v88DenunciaFicha({canal, mid:m.mid, texto:m.texto, nome}); }); ac.appendChild(k); }
  F.append(cab, nodo('p', 'c81-f-nota', '“' + String(m.texto || '').slice(0, 80) + '”'), ac);
  F.hidden = false;
}
/* ---- a denúncia de uma mensagem: o motivo na própria ficha (o de mensagem já vem marcado: OFENSA) e o ENVIAR ---- */
const V88_MOTIVO_CURTO = {trapaca:'TRAPAÇA', toxico:'TÓXICO', ofensa:'OFENSA', spam:'SPAM', nome:'NOME', bug:'ABUSO DE BUG', outro:'OUTRO'};
function v88DenunciaManda(o, motivo){                      // (o servidor das salas confere a mensagem, conta as denúncias e manda para a plataforma)
  if (o.canal === 'brasil') brasilSend({type:'brasil_report', id:o.mid, motivo});
  else if (o.canal === 'sala' || o.canal === 'equipe') net49Send({type:'report', mid:o.mid, motivo});
  else net49Send({type:'chat_denuncia', canal:o.canal, mid:o.mid, motivo});
  try { BRASIL.denunciados.add(o.mid); if (o.canal === 'brasil' && BRASIL.aberto) brasilRenderLista(true); } catch (_) {}
}
function v88DenunciaFicha(o){
  const F = C81.ficha; if (!F) return v88AbreDenuncia(o);
  let motivo = 'ofensa';
  F.textContent = ''; F.classList.add('v88-f-den');
  const cab = nodo('div', 'c81-f-cab'), tx = nodo('div', 'c81-f-tx');
  tx.append(nodo('b', null, 'DENUNCIAR MENSAGEM'), nodo('small', null, (o.nome ? o.nome + ' · ' : '') + 'escolha o motivo'));
  const x = novoBotao('c81-f-x', 'Fechar'); x.textContent = '✕'; x.addEventListener('click', () => { som.clique(); c81FichaFecha(); });
  cab.append(tx, x);
  const g = nodo('div', 'v88-f-motivos'); g.setAttribute('role', 'radiogroup'); g.setAttribute('aria-label', 'Motivo da denúncia');
  const marca = () => { for (const b of g.children){ const on = b.dataset.m === motivo; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); } };
  for (const [id, rot] of V88_MOTIVOS){ const b = novoBotao('v88-f-m', rot); b.dataset.m = id; b.setAttribute('role', 'radio'); b.textContent = V88_MOTIVO_CURTO[id] || rot.toUpperCase(); b.addEventListener('click', () => { som.clique(); motivo = id; marca(); }); g.appendChild(b); }
  const ac = nodo('div', 'c81-f-acoes');
  const volta = novoBotao('c81-f-bt v88-f-volta'); volta.appendChild(nodo('span', null, 'CANCELAR')); volta.addEventListener('click', () => { som.clique(); c81FichaFecha(); });
  const envia = novoBotao('c81-f-bt vermelho v88-f-envia'); envia.append(v88IcEl('bandeira'), nodo('span', null, 'ENVIAR'));
  envia.addEventListener('click', () => {
    som.clique(); v88DenunciaManda(o, motivo); c81FichaFecha();
    c81Aviso('Denúncia enviada (' + (V88_MOTIVO_CURTO[motivo] || motivo).toLowerCase() + '). Com mais denúncias a mensagem some e quem escreveu fica um tempo sem falar.');
  });
  ac.append(volta, envia);
  F.append(cab);
  if (o.texto) F.appendChild(nodo('p', 'c81-f-nota', '“' + String(o.texto).slice(0, 80) + (String(o.texto).length > 80 ? '…' : '') + '”'));
  F.append(g, ac); F.hidden = false;
  marca();
  try { envia.focus({preventScroll:true}); } catch (_) {}
}
// a tela grande do Chat do Brasil (o ícone de cima): a bandeira de denunciar também pede o motivo
document.addEventListener('click', e => {
  const b = e.target instanceof Element && e.target.closest('#br-lista .br-den'); if (!b || b.disabled) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const msgs = Array.from(document.querySelectorAll('#br-lista .br-msg')), i = msgs.indexOf(b.closest('.br-msg'));
  const L = (BRASIL.msgs || []).filter(m => !BRASIL.silenciados.has(m.from)), m = L[i];
  if (!m) return;
  som.clique();                                             // (marca como denunciada só depois do ENVIAR: ver o v88DenunciaManda)
  v88AbreDenuncia({canal:'brasil', mid:m.id, texto:m.texto, nome:m.nome});
}, true);
// o "mensagem para o amigo" de qualquer lugar abre o painel do chat na aba AMIGOS
const abreTelaAntes88ch = abreTela;
abreTela = function(id, volta){
  if (id !== 'v88chat') return abreTelaAntes88ch.apply(this, arguments);
  if (c81Oculto()){ v88Aviso('O chat está oculto: ligue em Ajustes › Conta › Chat na tela.'); return; }
  try { if (lobby.tela) fechaTela(); } catch (_) {}
  try { cbLugar(); } catch (_) {}
  const aba = V88.chatAba && V88CH.abas.indexOf(V88.chatAba) >= 0 ? V88.chatAba : 'amigos'; V88.chatAba = '';   // (o CHAT DO CLUBE abre na aba CLUBE)
  setTimeout(() => { try { cbAbre(aba); } catch (e) { console.error(e); } }, 30);
};
