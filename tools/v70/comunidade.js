/* =====================================================================
   RACHA rua · v70 — Etapa 5: A COMUNIDADE (entra depois do online.js)
   O botão COMUNIDADE do lobby abre um lugar com esse nome (antes abria direto a COPA): a primeira aba, INÍCIO, junta os
   caminhos de SALAS, AMIGOS, CHAT DO BRASIL e COPA (e o CLUBE), cada um com o estado de agora e o que fazer quando
   está vazio. As abas de sempre continuam do lado (SALAS · CLUBE · COPA · CHAT DO BRASIL), agora sob COMUNIDADE.
   AMIGOS: com a conta do RACHA, a lista de amigos de verdade (na plataforma); sem a conta, os seus duelos 1v1 da turma
   e o caminho para chamar a galera (o link da sala). Nada aqui inventa gente, sala ou mensagem: só mostra o que existe.
   ===================================================================== */
const CM = {el:null, corpo:null, st:null, foco:''};
(function cmMonta(){
  const ref = $('tela-clubes'); if (!ref) return;
  const s = document.createElement('section');
  s.className = 'lb-tela cm-tela'; s.id = 'tela-comunidade'; s.hidden = true; s.setAttribute('aria-label', 'Comunidade');
  s.innerHTML = '<header class="tl-cab"><button type="button" class="tl-voltar" aria-label="Voltar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><h2>COMUNIDADE</h2><span class="tl-info on-st" id="cm-st"></span></header>'
    + '<div class="tl-corpo cm-corpo" id="cm-corpo"></div>';
  ref.parentElement.insertBefore(s, ref);
  s.querySelector('.tl-voltar').addEventListener('click', fechaTela);
  CM.el = s; CM.corpo = s.querySelector('#cm-corpo'); CM.st = s.querySelector('#cm-st');
  TELAS.comunidade = {el:s, render:() => cmRender(), abre:() => galeraConecta()};
  GRUPOS.galera = {titulo:'COMUNIDADE', abas:[['comunidade', 'INÍCIO'], ['amigos', 'SALAS'], ['clube', 'CLUBE'], ['copa', 'COPA'], ['chat', 'CHAT DO BRASIL']]};
  GRUPO_DE.comunidade = 'galera';
})();
const CM_SVG = {
  salas:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.5" cy="8" r="3.6" fill="currentColor"/><path d="M1.8 20c0-4.4 3-6.9 6.7-6.9s6.7 2.5 6.7 6.9z" fill="currentColor"/><circle cx="16.6" cy="9" r="3" fill="currentColor"/><path d="M15.8 13.4c3.6-.3 6.4 1.9 6.4 6.6h-5.3" fill="currentColor"/></svg>',
  amigos:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.3-9.2C1.4 8.4 3.4 4.8 7 4.8c2 0 3.5 1.1 5 2.9 1.5-1.8 3-2.9 5-2.9 3.6 0 5.6 3.6 4.3 7-1.8 4.6-9.3 9.2-9.3 9.2z" fill="currentColor"/></svg>',
  chat:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4.4h18v11.6H9.4L5 19.8v-3.8H3z" fill="currentColor"/><path d="M7 9.2h10M7 12.4h6" stroke="#1b2236" stroke-width="2.2" stroke-linecap="round"/></svg>',
  copa:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10v5a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H3.5v1.5A3.5 3.5 0 0 0 7 10M17 5h3.5v1.5A3.5 3.5 0 0 1 17 10" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10.8" y="13" width="2.4" height="4" fill="currentColor"/><rect x="7.5" y="17" width="9" height="3.2" rx="1" fill="currentColor"/></svg>',
  clube:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l8 3v6.2c0 4.8-3.4 8.4-8 9.8-4.6-1.4-8-5-8-9.8V5.5z" fill="currentColor"/></svg>'
};
function cmOnde(){                                         // onde a comunidade está agora (o mesmo texto em todo lugar)
  if (SLOC.on) return {k:'aqui', txt:'SALA NESTE APARELHO', sub:'Você está numa sala neste aparelho (você e os bots). Saia dela para conectar no servidor.'};
  if (window.RACHA_SEM_REDE) return {k:'demo', txt:'DEMONSTRAÇÃO · SEM SERVIDOR', sub:'Nesta demonstração não tem o servidor da turma: salas online, Chat do Brasil e clubes da turma ficam desligados.'};
  if (sxOnline()) return {k:'on', txt:'ONLINE' + (SL.online > 1 ? ' · ' + SL.online + ' NA ÁREA' : ''), sub:'Conectado em ' + (SL.server && SL.server.name || 'servidor da turma') + '.'};
  if (V70ON.outraAba) return {k:'off', txt:'ABERTO EM OUTRA ABA', sub:'O seu perfil está conectado em outra aba ou aparelho.'};
  if (NET49.ws) return {k:'liga', txt:'CONECTANDO…', sub:'Conectando no servidor da turma…'};
  if (servidorEndereco()) return {k:'off', txt:'SEM CONEXÃO', sub:'O servidor da turma não respondeu. As salas neste aparelho (com bots) funcionam sem ele.'};
  return {k:'off', txt:'SEM SERVIDOR', sub:'Para jogar online, abra o jogo pelo endereço do servidor da turma (ou ponha o endereço em Ajustes › Avançado).'};
}
function cmCard(cls, ic, titulo, linhas, acoes){
  const c = nodo('section', 'cm-card ' + cls), cab = nodo('header', 'cm-cab'), i = nodo('i', 'cm-ic');
  i.innerHTML = ic; cab.append(i, nodo('h3', null, titulo)); c.appendChild(cab);
  for (const l of linhas) if (l) c.appendChild(typeof l === 'string' ? nodo('p', 'cm-tx', l) : l);
  const a = nodo('div', 'cm-acoes'); for (const b of acoes) if (b) a.appendChild(b); c.appendChild(a);
  return c;
}
const cmBt = (cls, txt, fn, rot) => sxBt('sx-bt ' + cls, '<span>' + txt + '</span>', fn, rot);
function cmRender(){
  const raiz = CM.corpo; if (!raiz) return;
  const velho = raiz.querySelector('.sx-corpo2'), rol = velho ? velho.scrollTop : 0, foco = onFoco(raiz);
  raiz.textContent = ''; raiz.classList.add('sx-corpo'); CM.el.classList.add('sx-tela');
  const onde = cmOnde();
  if (CM.st){ CM.st.textContent = ''; CM.st.className = 'tl-info on-st' + (onde.k === 'on' || onde.k === 'aqui' ? ' ok' : ''); CM.st.append(nodo('i'), onde.txt); }
  const p = nodo('div', 'sx cm'), cab = nodo('header', 'sx-cab'), tit = nodo('h3', 'sx-tit');
  tit.append('COMUNIDADE', nodo('span', 'sx-tag', 'INÍCIO'));
  const st = nodo('span', 'sx-st' + (onde.k === 'on' || onde.k === 'aqui' ? ' ok' : onde.k === 'liga' ? ' liga' : '')); st.append(nodo('i'), nodo('span', null, onde.txt));
  cab.append(tit, st); p.appendChild(cab);
  const box = nodo('div', 'sx-corpo2'); p.appendChild(box); raiz.appendChild(p);
  const g = nodo('div', 'cm-grade'), r = NET49.room;
  // a sala em que você está (o contexto vem primeiro)
  if (r){
    const s = nodo('div', 'cm-sala'), tx = nodo('div', 'cm-sala-tx');
    tx.append(nodo('b', null, 'VOCÊ ESTÁ NA ' + (r.local ? 'SALA NESTE APARELHO' : r.pub ? 'SALA PÚBLICA ' + r.code : 'SALA PRIVADA ' + r.code)),
      nodo('small', null, (r.name || 'Sala') + ' · ' + r.members.length + (r.members.length === 1 ? ' pessoa' : ' pessoas') + (r.state === 'playing' ? ' · partida rolando' : '')));
    s.append(tx, cmBt('amarelo', NET49.playing && RQ.on && RQ.estado !== 'fim' ? 'VOLTAR AO JOGO' : 'VOLTAR PARA A SALA', () => { if (NET49.playing && RQ.on && RQ.estado !== 'fim') abrirJogoOnline(); else abreTela('sala'); }));
    box.appendChild(s);
  }
  box.appendChild(nodo('p', 'cm-onde cm-' + onde.k, onde.sub));
  // SALAS
  const abertas = sxOnline() ? (SL.lista || []).filter(x => x.state !== 'playing' && !x.cup && (x.players | 0) < (x.max | 0)) : [];
  const salaTx = SLOC.on ? 'Você está na sala neste aparelho.' : sxOnline() ? (SL.lista == null ? 'Carregando as salas…' : abertas.length ? abertas.length + (abertas.length === 1 ? ' sala pública esperando gente agora.' : ' salas públicas esperando gente agora.') : 'Nenhuma sala pública esperando agora: crie a sua ou toque em JOGAR AGORA (ela aparece na lista).')
    : 'Sem servidor, a sala fica neste aparelho: você e os bots, com as mesmas regras.';
  g.appendChild(cmCard('cm-salas', CM_SVG.salas, 'SALAS', [salaTx, 'Pública (na lista), privada (só com o código) ou neste aparelho.'],
    [cmBt(sxOnline() && !r ? 'azul' : 'amarelo', 'ABRIR SALAS', () => abreTela('amigos')), sxOnline() && !r ? cmBt('amarelo', 'JOGAR AGORA', () => { abreTela('amigos'); slJogarAgora(); }, 'Jogar agora: entrar com lugar num time') : null]));
  // AMIGOS
  const pl = v70ContaLogada(), du = NET49.social && NET49.social.duels || [];
  const amg = [];
  if (pl) amg.push('Os seus amigos ficam na sua conta do RACHA: busque jogadores pelo ID, aceite pedidos e veja quem está jogando.');
  else amg.push('A lista de amigos fica na conta do RACHA (o jogo aberto pelo site, com login). Aqui, chame a galera pelo link ou pelo código da sala.');
  if (sxOnline()){
    if (du.length){ const ul = nodo('ul', 'cm-duelos'); for (const d of du.slice(0, 4)) ul.appendChild(nodo('li', null, d.players.map(p => p && p.name || 'Jogador').join(' × ') + ' · ' + d.wins.join('–') + ' em ' + d.played + (d.played === 1 ? ' jogo' : ' jogos'))); amg.push(nodo('b', 'cm-sub', 'SEUS DUELOS 1v1 NA TURMA'), ul); }
    else amg.push(nodo('small', 'cm-vazio', 'Ainda sem duelos 1v1 na turma: jogue um 1v1 numa sala online e o placar com cada amigo aparece aqui.'));
    if (V70ON.pub) amg.push(nodo('small', 'cm-id', 'Seu ID na turma: ' + V70ON.pub + ' (para te convidarem para um clube)'));
  }
  g.appendChild(cmCard('cm-amigos', CM_SVG.amigos, 'AMIGOS', amg,
    [pl ? cmBt('amarelo', 'ABRIR AMIGOS', () => { const p = window.parent; try { if (p && p !== window && typeof p.RACHA_ABRIR === 'function') p.RACHA_ABRIR('/amigos'); } catch (_) {} }) : null,
     r && !r.local ? cmBt(pl ? 'azul' : 'amarelo', 'CONVIDAR PARA A SALA', () => { abreTela('sala'); setTimeout(() => slConvidar(), 80); }) : !r ? cmBt(pl ? 'azul' : 'amarelo', 'CRIAR SALA E CHAMAR', () => { abreTela('amigos'); sxNovaSala(); }) : null]));
  // CHAT
  const chatTx = !brasilLigado() ? 'O Chat do Brasil está desligado nos Ajustes.' : window.RACHA_SEM_REDE ? 'Desligado nesta demonstração (não tem servidor).' : BRASIL.estado === 'on' ? (BRASIL.online ? BRASIL.online + ' online agora.' : 'Ligado.') + (BRASIL.naoLidas ? ' ' + BRASIL.naoLidas + ' mensagem(ns) nova(s).' : '') : servidorEndereco() ? 'Liga quando você abrir (usa o mesmo servidor das salas).' : 'Precisa do servidor do jogo (o mesmo das salas).';
  g.appendChild(cmCard('cm-chat', CM_SVG.chat, 'CHAT DO BRASIL', [chatTx, 'Com filtro e denúncia: 1 mensagem a cada 3 segundos.'], [cmBt('amarelo', 'ABRIR O CHAT', () => abreTela('chat'))]));
  // COPA
  const cup = r && r.tournament, gente = r ? r.members.filter(m => !m.bot).length : 0;
  const copaTx = cup ? (cup.champion ? 'A copa ' + cup.name + ' acabou: veja o campeão.' : 'A ' + cup.name + ' está rolando nesta sala.')
    : r && !r.local ? gente + (gente === 1 ? ' pessoa' : ' pessoas') + ' na sala ' + r.code + ': a copa precisa de 4 ou 8 (quem criou a sala sorteia).'
    : r && r.local ? 'A copa é com gente: precisa de uma sala online.' : 'Torneio 1v1 com 4 ou 8 pessoas numa sala online: crie a sala, chame a galera e sorteie a chave.';
  g.appendChild(cmCard('cm-copa', CM_SVG.copa, 'COPA DOS AMIGOS', [copaTx], [cmBt('amarelo', 'ABRIR COPA', () => abreTela('copa'))]));
  box.appendChild(g);
  // o clube (um só): onde ele mora e o seu
  const api = clbApi(), cl = nodo('div', 'cm-clube'), ic = nodo('i', 'cm-ic'); ic.innerHTML = CM_SVG.clube;
  const ctx = nodo('div', 'cm-clube-tx');
  ctx.append(nodo('b', null, CLB.meu ? 'SEU CLUBE: ' + CLB.meu.nome : 'CLUBE'), nodo('small', null, CLB_ONDE[api.tipo] + ' · ' + (api.tipo === 'local' ? 'clube pessoal, grátis, sem ranking' : 'criar é grátis; troféus = vitórias conferidas')));
  cl.append(ic, ctx, cmBt('amarelo', CLB.meu ? 'VER CLUBE' : 'CLUBES', () => abreTela('clube')));
  box.appendChild(cl);
  box.scrollTop = rol; onRefoca(raiz, foco);
}
// o que muda a comunidade (conexão, lista de salas, a sala, o chat) repinta o INÍCIO aberto
const x49RenderAntes70m = x49Render;
x49Render = function(){ x49RenderAntes70m(); if (lobby.aberto && lobby.tela === 'comunidade') cmRender(); };
const brasilEstadoAntes70m = brasilEstado;
brasilEstado = function(e){ brasilEstadoAntes70m(e); if (lobby.aberto && lobby.tela === 'comunidade') cmRender(); };
const net49MessageAntes70m = net49Message;
net49Message = function(m){ const r = net49MessageAntes70m(m); if (m && (m.type === 'rooms' || m.type === 'social' || m.type === 'hello') && lobby.aberto && lobby.tela === 'comunidade') cmRender(); return r; };
// o pontinho de novidade da COMUNIDADE: sala aberta ou mensagem nova no chat
const lbPontosAntes70m = lbPontos;
lbPontos = function(){
  lbPontosAntes70m();
  const b = document.querySelector('#lb [data-rx="comunidade"]');
  if (b) b.classList.toggle('rx-ponto', !!NET49.room || (typeof BRASIL !== 'undefined' && BRASIL.naoLidas > 0));
};
// o cartão da sala mostra o escudo do clube de verdade (o desenho do clube, da turma ou da conta)
const slCartaoAntes70m = slCartao;
slCartao = function(m, r){
  const d = slCartaoAntes70m(m, r);
  try {
    if (m && m.club && typeof m.club.escudo === 'string' && /^E\./.test(m.club.escudo)){
      const esc = d.querySelector('.sl-esc'); if (esc){ esc.textContent = ''; esc.appendChild(clbEscudo(m.club.escudo, 64)); esc.title = m.club.name; }
    }
  } catch (_) {}
  return d;
};
