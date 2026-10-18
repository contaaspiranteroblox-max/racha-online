/* ======================================================================================================================
   RACHA v88 · O LOBBY (o mesmo da v77: o fundo da favela com o Cristo, a tampinha equipada no meio, o perfil, as moedas,
   as gemas, a patente, o chat, o JOGAR e todos os botões de antes, nos mesmos lugares). Entram SÓ os que faltavam:
   · em cima, à direita: a CAIXA DE ENTRADA (o botão CORREIO que já existia escondido como "em breve": a central de mensagens
     e o correio, com o número de não lidas e de prêmios para coletar);
   · em cima, depois da patente: o PASSE RACHA (o botão que já existia escondido como "em breve"), com o nível;
   · à direita, do lado da coluna de botões: a LISTA DOS AMIGOS (avatar, nome, status de verdade e o botão de cada um:
     chamar para a sala, assistir a partida ou mandar mensagem), o VER TODOS e o SINAL (a conexão com o servidor das
     salas: toque para ver e reconectar);
   · os números de não lido nos botões que já existiam (AMIGOS: pedidos e convites; CLUBE: convites e pedidos; EVENTOS e
     DESAFIOS: prêmios para pegar).
   Os botões de antes continuam abrindo as telas deles; logado, AMIGOS, DESAFIOS e EVENTOS abrem as telas novas (da conta).
   ====================================================================================================================== */
const V88L = {on:false, painel:null, lista:null, cab:null, caixa:null, sinal:null, passe:null, pingT:0, pintaT:0};

function v88LobbyMonta(){
  const rx = document.getElementById('rx'), topo = LB.palco && LB.palco.querySelector('.lb-topo');
  if (!rx || !topo || !LB.ajustes || V88L.on) return;
  V88L.on = true;
  LB.raiz.classList.add('v88');
  // a caixa de entrada (mensagens + correio), do lado dos ajustes: o botão CORREIO de sempre (#lb-correio, que estava escondido
  // com o "em breve"), sem o clique de antes (a cópia não leva os ouvintes) e com o desenho novo
  let caixa = LB.correio;
  if (caixa){ const novo = caixa.cloneNode(false); caixa.replaceWith(novo); caixa = LB.correio = novo; caixa.hidden = false; caixa.classList.add('v88-caixa'); caixa.setAttribute('aria-label', 'Mensagens e correio'); }
  else caixa = novoBotao('tp-ic v88-caixa', 'Mensagens e correio');
  caixa.appendChild(v88IcEl('correio', 'v88-tp-ic'));
  caixa.addEventListener('click', () => { som.clique(); abreTela('v88caixa'); });
  LB.ajustes.insertAdjacentElement('beforebegin', caixa); V88L.caixa = caixa;
  const sinal = novoBotao('v88-sinal', 'Conexão'); sinal.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="26" width="6" height="10" rx="1.5"/><rect x="13" y="20" width="6" height="16" rx="1.5"/><rect x="22" y="13" width="6" height="23" rx="1.5"/><rect x="31" y="6" width="6" height="30" rx="1.5"/></svg>';
  sinal.addEventListener('click', () => { som.clique(); v88SinalPop(); });
  V88L.sinal = sinal;                                              // (fica no cabeçalho dos amigos, à direita: o topo não aperta)
  // o PASSE (o botão de sempre, que estava escondido): vai para o topo, depois da patente
  const pa = document.querySelector('#rx [data-rx="passe"]'), liga = topo.querySelector('.v71-liga');
  if (pa){
    pa.classList.remove('v71-fora', 'v70-mudo'); pa.removeAttribute('aria-hidden'); pa.tabIndex = 0;
    pa.classList.add('v88-passe', 'tp-ic');                          // (um quadrado como os outros do topo: o desenho do passe e o nível embaixo)
    pa.innerHTML = '';
    const ic = v88IcEl('passe', 'v88-passe-ic'), sm = nodo('small', 'v88-passe-nv', 'PASSE');
    const barra = nodo('span', 'v88-passe-barra'); barra.appendChild(nodo('i'));
    pa.append(ic, sm, barra);
    pa.setAttribute('aria-label', 'Passe RACHA');
    if (liga) liga.insertAdjacentElement('afterend', pa); else topo.insertBefore(pa, topo.firstChild);
    V88L.passe = pa;
  }
  // a lista dos amigos, à direita (do lado da coluna SALAS · AMIGOS · RANKING · EVENTOS)
  const p = nodo('aside', 'v88-amg'); p.setAttribute('aria-label', 'Amigos');
  const cab = nodo('div', 'v88-amg-cab');
  const tit = novoBotao('v88-amg-tit', 'Abrir os amigos'); tit.append(nodo('b', null, 'AMIGOS'), nodo('small', 'v88-amg-n'));
  tit.addEventListener('click', () => { som.clique(); v88AbreAmigos(); });
  const add = v88BtIc('amigo_add', 'Adicionar amigo', () => v88AbreAmigos('buscar'), 'v88-amg-add');
  cab.append(tit, sinal, add);
  const ul = nodo('ul', 'v88-amg-l');
  const todos = v88Bt('v88-amg-todos', 'VER TODOS', () => v88AbreAmigos(), 'Ver todos os amigos');
  p.append(cab, ul, todos);
  rx.appendChild(p);
  V88L.painel = p; V88L.lista = ul; V88L.cab = cab;
  v88LobbyPinta();
}

/* ---- os botões de antes que, logado, abrem as telas da conta (o clique é pego antes do lobby.js) ----
   A regra: sem conta, cada botão faz o que sempre fez neste aparelho (AMIGOS → a tela AMIGOS/COMUNIDADE, EVENTOS → a Copa
   dos Amigos, DESAFIOS → as missões do dia do aparelho); com a conta, abre a tela da conta (amigos, eventos e missões do
   servidor). O PASSE (o botão de sempre, que estava escondido) abre o Passe RACHA nos dois casos. */
function v88AbreAmigos(aba){ if (aba) V88.amgAba = aba; abreTela('v88amigos'); }
document.addEventListener('click', e => {
  const t = e.target; if (!(t instanceof Element) || !lobby.aberto) return;
  const b = t.closest('#lb [data-rx="amigos"], #lb .v77-amg, #lb [data-rx="passe"], #lb #lb-missoes, #lb .v77-eventos');
  if (!b) return;
  if (b.matches('[data-rx="passe"]')){ e.preventDefault(); e.stopImmediatePropagation(); som.clique(); abreTela('v88passe'); return; }
  if (!v88Logado()) return;                                      // (sem conta: o de sempre)
  e.preventDefault(); e.stopImmediatePropagation(); som.clique();
  if (b.matches('.v77-eventos')) abreTela('v88eventos');
  else if (b.matches('#lb-missoes')) abreTela('v88missoes');
  else v88AbreAmigos();                                          // AMIGOS (o botão da coluna e o ícone de cima)
}, true);
const v77AbreAmigosAntes88 = v77AbreAmigos;                      // o ícone AMIGOS do cabeçalho das telas: o mesmo caminho
v77AbreAmigos = function(){ if (v88Logado()){ if (lobby.tela !== 'v88amigos') v88AbreAmigos(); return; } return v77AbreAmigosAntes88.apply(this, arguments); };
const cmRenderAntes88 = cmRender;                                // a COMUNIDADE: o ABRIR AMIGOS (só aparece com a conta) leva aos amigos do jogo
cmRender = function(){
  const r = cmRenderAntes88.apply(this, arguments);
  try {
    if (v88Logado() && CM.corpo){
      const bt = Array.from(CM.corpo.querySelectorAll('.cm-amigos .cm-acoes button')).find(b => /ABRIR AMIGOS/.test(b.textContent));
      if (bt && !bt.dataset.v88){ const novo = bt.cloneNode(true); novo.dataset.v88 = '1'; novo.addEventListener('click', () => { som.clique(); v88AbreAmigos(); }); bt.replaceWith(novo); }
    }
  } catch (_) {}
  return r;
};

/* ---- pintar: a lista dos amigos, os números e o passe ---- */
const V88_ST = {partida:{t:'em partida', o:0, cls:'partida'}, sala:{t:'na sala', o:1, cls:'sala'}, buscando:{t:'procurando partida', o:2, cls:'buscando'}, online:{t:'online', o:3, cls:'online'}};
function v88StatusDe(pub){ return V88.status.get(v88Pub(pub)) || null; }
function v88StatusTxt(s){ if (!s) return 'offline'; const d = V88_ST[s.st]; if (!d) return 'online'; return d.t + (s.st === 'sala' && s.sala && s.sala.nome ? ' · ' + s.sala.nome : ''); }
function v88AmigosOrdenados(){
  return V88.amigos.slice().sort((a, b) => {
    const sa = v88StatusDe(a.idPublico), sb = v88StatusDe(b.idPublico);
    const oa = sa ? (V88_ST[sa.st] || V88_ST.online).o : 9, ob = sb ? (V88_ST[sb.st] || V88_ST.online).o : 9;
    return oa - ob || String(a.nome).localeCompare(String(b.nome), 'pt-BR');
  });
}
function v88AcaoAmigo(c, s, compacto){                     // o botão de cada amigo: assistir, chamar ou mensagem
  const pub = v88Pub(c.idPublico);
  if (s && s.st === 'partida' && s.sala && s.sala.assistir && s.sala.code) return v88BtIc('olho', 'Assistir a partida de ' + c.nome, () => v88Assistir(s.sala.code), 'v88-ac-olho');
  if (s && s.st !== 'partida') return v88BtIc('mais', 'Chamar ' + c.nome + ' para jogar', () => v88ConvidaComSala(pub, c.nome), 'v88-ac-mais');
  return v88BtIc('chat', 'Mandar mensagem para ' + c.nome, () => { V88.dmAlvo = pub; abreTela('v88chat'); }, 'v88-ac-chat');
}
function v88LobbyPinta(){
  if (!V88L.on) return;
  const ul = V88L.lista; ul.textContent = '';
  const n = V88L.painel.querySelector('.v88-amg-n');
  if (!v88Logado()){
    n.textContent = '';
    const li = nodo('li', 'v88-amg-vazio');
    li.append(v88IcEl('cadeado'), nodo('span', null, v88TemPlataforma() ? 'Entre na conta para ver os seus amigos online.' : 'Os amigos ficam na conta do RACHA (abra pelo site).'));
    if (v88TemPlataforma() && typeof v84AbreLogin === 'function' && window.RACHA84 && !window.RACHA84.embutido){ const b = v88Bt('lb-btn amarelo v88-amg-entrar', 'ENTRAR', () => v84AbreLogin('entrar')); li.appendChild(b); }
    ul.appendChild(li);
  } else {
    const l = v88AmigosOrdenados(), on = l.filter(c => v88StatusDe(c.idPublico)).length;
    n.textContent = '(' + on + '/' + l.length + ')';
    if (!l.length){
      const li = nodo('li', 'v88-amg-vazio'); li.append(v88IcEl('amigo_add'), nodo('span', null, 'Nenhum amigo ainda. Toque no + para procurar pelo nome ou pelo ID.')); ul.appendChild(li);
    }
    for (const c of l.slice(0, 5)){
      const s = v88StatusDe(c.idPublico), li = nodo('li', 'v88-amg-i' + (s ? ' on ' + (V88_ST[s.st] || V88_ST.online).cls : ' off'));
      const av = v88AvatarEl(c, 56); av.classList.add('v88-amg-av');
      const tx = novoBotao('v88-amg-tx', 'Ver o perfil de ' + c.nome); tx.append(nodo('b', null, c.nome), nodo('small', null, v88StatusTxt(s)));
      tx.addEventListener('click', () => { som.clique(); v88AbrePerfil(c.idPublico); });
      li.append(av, tx, v88AcaoAmigo(c, s, true));
      const nd = V88.dmNaoLidas.get(v88Pub(c.idPublico)); if (nd) v88Selo(li, nd);
      ul.appendChild(li);
    }
  }
  v88Numeros();
}
function v88Numeros(){                                     // os números de não lido nos botões do lobby
  const R = V88.resumo, logado = v88Logado();
  const convites = V88.convites.filter(x => x.ate > Date.now()).length;
  v88Selo(document.querySelector('#lb .v77-amg'), logado ? (R ? R.pedidos : 0) + convites : 0);
  v88Selo(document.querySelector('#lb [data-rx="amigos"]'), logado ? (R ? R.pedidos : 0) + convites : 0);
  v88Selo(V88L.caixa, logado && R ? (R.mensagensTotal || 0) + (R.correio || 0) : 0);
  v88Selo(document.querySelector('#lb [data-rx="clube"]'), logado && R ? (R.convitesClube || 0) + (R.pedidosClube || 0) : 0);
  v88Selo(V88L.cab && V88L.cab.querySelector('.v88-amg-tit'), logado && R ? R.pedidos : 0);
  const pr = V88.prontas || {};
  v88Selo(document.querySelector('#lb .v77-eventos'), logado ? pr.eventos || 0 : 0);
  v88Selo(V88L.passe, logado ? pr.passe || 0 : 0);
  if (logado && LB.missoes && V88.missoesLobby){                   // DESAFIOS com as missões da conta
    const M = V88.missoesLobby, tx = LB.missoes.querySelector('.mi-tx');
    LB.missoes.classList.toggle('pronta', M.prontas > 0);
    if (tx) tx.textContent = M.prontas ? (M.prontas === 1 ? 'Pegar prêmio!' : 'Pegar ' + M.prontas + ' prêmios!') : 'Missões do dia';
    if (LB.miN) LB.miN.textContent = M.feitas + '/' + M.total;
    if (LB.miBarra) LB.miBarra.style.width = (100*M.feitas/Math.max(1, M.total)) + '%';
    const pm = LB.missoes.querySelector('.mi-premio b'); if (pm) pm.textContent = fmtNum(M.premio || 0);
  }
  v88PassePinta();
}
function v88PassePinta(){
  const pa = V88L.passe; if (!pa) return;
  const P = V88.passeLobby, nv = pa.querySelector('.v88-passe-nv'), bar = pa.querySelector('.v88-passe-barra i');
  if (v88Logado() && P){ nv.textContent = 'NV ' + P.nivel; bar.style.width = (100*(P.max ? 1 : P.atual/Math.max(1, P.prox))).toFixed(1) + '%'; pa.classList.toggle('premium', !!P.premium); pa.setAttribute('aria-label', 'Passe RACHA: nível ' + P.nivel + (P.premium ? ' (premium)' : '')); }
  else { nv.textContent = 'PASSE'; bar.style.width = '0%'; pa.setAttribute('aria-label', 'Passe RACHA'); }
}
// os resumos que o lobby mostra (as missões de hoje e o passe), sem pesar: a cada 2 min ou depois de uma partida
function v88LobbyDados(){
  if (!v88Logado()) return;
  Promise.all([v88Q('missoes.listar').catch(() => null), v88Q('passe.estado').catch(() => null), v88Q('eventos.listar').catch(() => null)]).then(([ms, ps, ev]) => {
    V88.prontas = V88.prontas || {};
    if (Array.isArray(ms)) v88MissoesResumo(ms);
    if (ps && Number.isFinite(ps.xp)){ V88.passeLobby = {nivel:ps.nivel, atual:ps.atual, prox:ps.prox, max:ps.max, premium:ps.premium}; V88.prontas.passe = v88PasseProntas(ps); }
    if (Array.isArray(ev)) V88.prontas.eventos = ev.filter(v88EventoPronto).length;
    v88Numeros();
  });
}
setInterval(() => { if (lobby.aberto && !lobby.tela && v88Logado()) v88LobbyDados(); }, 120000);
function v88MissoesResumo(ms){                             // (o DESAFIOS do lobby: as diárias feitas e os prêmios para pegar de todas)
  const d = ms.find(g => g.grupo === 'diarias') || {missoes:[]}, todas = ms.reduce((a, g) => a.concat(g.missoes || []), []);
  V88.missoesLobby = {feitas:d.missoes.filter(x => x.progresso >= x.meta).length, total:d.missoes.length || 1, prontas:todas.filter(x => x.pronta).length,
    premio:d.missoes.filter(x => !x.coletada).reduce((s, x) => s + ((x.premio && x.premio.moedas) || 0), 0)};
}
function v88PasseProntas(ps){                              // os níveis já alcançados e ainda não coletados (grátis e, com o premium, premium)
  let n = 0; const c = ps.coletadas || {g:[], p:[]};
  for (let i = 1; i <= (ps.nivel | 0); i++){ if ((c.g || []).indexOf(i) < 0) n++; if (ps.premium && (c.p || []).indexOf(i) < 0) n++; }
  return n;
}
function v88EventoPronto(ev){                              // um evento com algo para pegar (o presente, uma carta de login ou um desafio cumprido)
  const p = ev.progresso || {};
  if (ev.config && Array.isArray(ev.config.presente) && ev.config.presente.length && !p.presentePego) return true;
  if ((p.missoes || []).some(m => m.progresso >= m.meta && !m.coletada)) return true;
  return false;
}

/* ---- assistir e chamar ---- */
function v88Assistir(code){
  if (!NET49.id) return v88Aviso('Sem conexão com as salas agora.');
  if (NET49.playing) return v88Aviso('Saia da partida antes.');
  if (NET49.room && NET49.room.code !== code){ net49Send({type:'leave'}); }
  try { if (lobby.tela) fechaTela(); } catch (_) {}
  V88.assistindo = code;
  net49Send({type:'join', code, spectate:true});
  v88Aviso('Entrando para assistir…');
}
function v88ConvidaComSala(pub, nome){                     // chamar: se você não está numa sala, ela é criada (fechada, com bots) e o convite vai
  if (!v88Logado()) return v88Aviso('Entre na sua conta para chamar os amigos.');
  if (!NET49.id){ v88Conecta(); return v88Aviso('Conectando às salas… tente de novo em instantes.'); }
  if (NET49.room){ v88Convida(pub, 'sala'); return; }
  v88Confirma('CHAMAR PARA JOGAR', 'CRIAR UMA SALA E CHAMAR ' + String(nome || 'O AMIGO').toUpperCase() + '?', 'Uma sala fechada (só entra quem você chamar), com bots completando os times. Você pode mudar tudo depois, na sala.', 'CRIAR E CHAMAR', () => {
    const pref = (typeof SL !== 'undefined' && SL.pref) || {};
    V88.chamarDepois = {pub, ate:Date.now() + 8000};
    net49Send({type:'create', n:[1, 2, 3, 4].indexOf(pref.n) >= 0 ? pref.n : 2, map:Number.isInteger(pref.map) ? pref.map : 4, jogo:'futebol', tempo:0, bots:true, pub:false, name:'Racha de ' + (perfil.nome || 'Jogador')});
  });
}
v88On('salas', () => {});
const net49MessageAntes88L = net49Message;
net49Message = function(m){
  const r = net49MessageAntes88L.apply(this, arguments);
  try {
    if (m && m.type === 'room' && V88.chamarDepois && V88.chamarDepois.ate > Date.now() && NET49.room){ const c = V88.chamarDepois; V88.chamarDepois = null; v88Convida(c.pub, 'sala'); setTimeout(() => { try { if (lobby.aberto) abreTela('sala'); } catch (_) {} }, 200); }
    if (m && m.type === 'start' && V88.assistindo){ V88.assistindo = null; }
    if (m && m.type === 'pong') v88SinalPinta();
  } catch (e) { console.error(e); }
  return r;
};

/* ---- o sinal (a conexão das salas) ---- */
function v88SinalEstado(){
  if (window.RACHA_SEM_REDE) return {cor:'cinza', txt:'Sem salas online nesta versão (demonstração).', barras:0};
  if (!v88Logado()) return {cor:'cinza', txt:'Sem conta: você está jogando offline. Entre na conta para jogar online.', barras:0};
  if (!NET49.ws || NET49.ws.readyState > 1) return {cor:'vermelho', txt:'Desconectado do servidor das salas. O jogo tenta de novo sozinho.', barras:1};
  if (NET49.ws.readyState === 0 || !NET49.id) return {cor:'amarelo', txt:'Conectando ao servidor das salas…', barras:2};
  const p = Math.round(NET49.ping || 0);
  if (!p) return {cor:'verde', txt:'Conectado ao servidor das salas.', barras:4};
  return p < 120 ? {cor:'verde', txt:'Conectado · ' + p + ' ms (ótimo).', barras:4} : p < 250 ? {cor:'amarelo', txt:'Conectado · ' + p + ' ms (dá para jogar).', barras:3} : {cor:'vermelho', txt:'Conectado · ' + p + ' ms (conexão lenta).', barras:2};
}
function v88SinalPinta(){
  const s = V88L.sinal; if (!s) return;
  const e = v88SinalEstado();
  s.dataset.cor = e.cor; s.dataset.barras = e.barras;
  s.setAttribute('aria-label', 'Conexão: ' + e.txt);
}
function v88SinalPop(){
  const e = v88SinalEstado();
  abrePop(c => {
    c.classList.add('v88-pop');
    c.append(nodo('span', 'pop-tag', 'CONEXÃO'), nodo('h2', null, e.cor === 'verde' ? 'TUDO CERTO' : e.cor === 'amarelo' ? 'QUASE LÁ' : e.cor === 'cinza' ? 'OFFLINE' : 'SEM CONEXÃO'));
    c.appendChild(nodo('p', 'pop-txt', e.txt));
    if (v88Logado()) c.appendChild(nodo('p', 'pop-txt', 'Conta: ' + (C82.conta.nome || perfil.nome) + ' · ID ' + v88Pub(C82.conta.idPublico)));
    const a = nodo('div', 'pop-acoes');
    if (v88Logado() && e.cor !== 'verde') a.appendChild(botaoPop('RECONECTAR', 'verde', () => { som.clique(); fechaPop(); V70ON.outraAba = false; V88.tentativas = 0; v88Conecta(); }));
    a.appendChild(botaoPop('OK', '', () => { som.clique(); fechaPop(); }));
    c.appendChild(a);
  });
}
setInterval(() => {                                        // o ping do lobby (a cada 5 s, só com o lobby aberto) e a cor do sinal
  try { if (lobby.aberto && NET49.id && NET49.ws && NET49.ws.readyState === 1 && !NET49.playing) net49Send({type:'ping', time:performance.now()}); } catch (_) {}
  v88SinalPinta();
}, 5000);

/* ---- quem chama o pintar ---- */
function v88LobbyAgenda(){ clearTimeout(V88L.pintaT); V88L.pintaT = setTimeout(() => { try { v88LobbyPinta(); } catch (e) { console.error(e); } }, 60); }
for (const ev of ['status', 'amigos', 'resumo', 'convites', 'dm', 'carteira']) v88On(ev, v88LobbyAgenda);
const lbRenderAntes88 = lbRender;
lbRender = function(){ const r = lbRenderAntes88.apply(this, arguments); try { v88Numeros(); v88SinalPinta(); } catch (_) {} return r; };
const missoesWidgetAntes88 = missoesWidget;
missoesWidget = function(){ const r = missoesWidgetAntes88.apply(this, arguments); try { if (v88Logado() && V88.missoesLobby) v88Numeros(); } catch (_) {} return r; };
const abrirLobbyAntes88 = abrirLobby;
abrirLobby = function(){ const r = abrirLobbyAntes88.apply(this, arguments); try { if (v88Logado()){ v88Resumo(); v88LobbyDados(); v88Estado(true).catch(() => {}); v88Conecta(); } } catch (_) {} return r; };
v88On('carteira', () => { try { lbCarteira(); } catch (_) {} });

/* ---- a lista dos amigos não cobre o Cristo: onde a estátua cai na tela depende do encaixe do fundo (v75); se encostar,
   a lista desce até abaixo dela (e, se sobrar pouco, sai — o AMIGOS da coluna e o de cima continuam) ---- */
const V88_CRISTO = [1195, 8, 1305, 110];                   // px da imagem do fundo (tools/v75/lobby_fundo.webp): a estátua, com folga
function v88AmgEncaixa(){
  const p = V88L.painel; if (!p) return;
  p.style.top = ''; p.style.maxHeight = ''; p.classList.remove('v88-amg-fora');
  try {
    if (!lobby.aberto || typeof LOBBY75 === 'undefined' || !LOBBY75 || !L75.ok || L75.erro || getComputedStyle(p).display === 'none') return;
    const s = PALCO.s, sa = PALCO.sa || {l:0, t:0}, w = PALCO.vw/s, h = PALCO.vh/s;
    const E = l75Encaixe(w, h, PALCO.cy + 92 + sa.t/s, PALCO.cx + sa.l/s, {ret:!!PALCO.ret}), f = LB.fundo.getBoundingClientRect();
    const c = [f.left + (E.x + V88_CRISTO[0]*E.s)*s, f.top + (E.y + V88_CRISTO[1]*E.s)*s, f.left + (E.x + V88_CRISTO[2]*E.s)*s, f.top + (E.y + V88_CRISTO[3]*E.s)*s];
    const r = p.getBoundingClientRect();
    if (r.right <= c[0] || r.left >= c[2] || r.bottom <= c[1] || r.top >= c[3]) return;   // (não encosta: fica onde está)
    const k = (r.height/p.offsetHeight) || 1, cs = getComputedStyle(p);
    const desce = (c[3] - r.top)/k + 12, topo = parseFloat(cs.top) || 0, max = (parseFloat(cs.maxHeight) || 526) - desce;
    if (max < 200){ p.classList.add('v88-amg-fora'); return; }
    p.style.top = (topo + desce).toFixed(1) + 'px'; p.style.maxHeight = max.toFixed(1) + 'px';
  } catch (_) {}
}
const lbLayoutAntes88 = lbLayout;
lbLayout = function(){ const r = lbLayoutAntes88.apply(this, arguments); v88AmgEncaixa(); return r; };
const pintaFundoLobbyAntes88 = pintaFundoLobby;                 // (a imagem do fundo abre depois: encaixa de novo)
pintaFundoLobby = function(){ const r = pintaFundoLobbyAntes88.apply(this, arguments); v88AmgEncaixa(); return r; };
try { v88LobbyMonta(); v88AmgEncaixa(); } catch (e) { console.error('v88 lobby', e); }
setTimeout(() => { try { if (v88Logado()) v88LobbyDados(); } catch (_) {} }, 2500);
