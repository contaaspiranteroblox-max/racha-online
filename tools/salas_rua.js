/* =====================================================================
   RACHA rua · v68 — AS SALAS (entra no fim do script principal, depois do partida_rua.js)
   1) A sala NESTE APARELHO: um "servidor" aqui dentro que fala a mesma língua do servidor da turma (create, seat,
      config, start, finish, kick, say…). A tela da sala e a partida são as mesmas das salas online. Enquanto ela
      está aberta o jogo fica fora do servidor (e volta a conectar quando você sai dela).
   2) O ÁRBITRO: quem cria a sala é o árbitro principal. Ele monta os times (os jogadores não escolhem), pausa e
      encerra a partida, bane, passa o apito principal e dá o apito para outros. Quem recebe o apito monta os times,
      pausa e encerra, mas não bane. Se o dono sai, quem tem o apito vira o principal (e aí pode banir); sem ninguém
      com apito, o apito principal vai para alguém sorteado.
      O combinado anda pelo chat da sala em mensagens escondidas (nunca aparecem no chat) e quem executa é sempre o
      árbitro principal, com as mensagens que o servidor já conhece (seat, kick, promote, pause, finish).
      Partida encerrada pelo árbitro não vale prêmio.
   3) As telas: SALAS PERSONALIZADAS (a lista), CRIAR SALA e a sala em cima da favela. Na partida da sala, Time
      Vermelho × Equipe Azul de verdade. O chat da sala é o mesmo de sempre.
   Nada aqui mexe na física: a pausa do árbitro só deixa de chamar o passo da física (como a pausa de sempre).
   ===================================================================== */

/* as funções que os botões da sala receberam direto (addEventListener com a função): trocadas mais embaixo */
const slSairAntes68 = slSair, slAjustesAntes68 = slAjustes, slConvidarAntes68 = slConvidar, slIniciarAntes68 = slIniciar, slCliqueAntes68 = slClique;

/* ---------------------------------------------------------------- 1) a sala neste aparelho */
const SLOC = {on:false, room:null, eu:'voce-aqui'};
const SLOC_TIPOS = new Set(['create', 'join', 'leave', 'list', 'seat', 'config', 'start', 'ready', 'rematch', 'say', 'typing', 'kick', 'promote',
  'pause', 'finish', 'snapshot', 'input', 'social', 'profile', 'ping', 'hello', 'rtc', 'clubCreate', 'clubJoin', 'clubLeave', 'cupCreate', 'cupEnd', 'cupNext']);
const SLOC_MAX = 12;                                    // gente na sala (você e os bots chamados)
function slocEnvia(m){ setTimeout(() => { try { net49Message(m); } catch (e) { console.error('Sala neste aparelho:', e); } }, 0); }
const slocCopia = () => JSON.parse(JSON.stringify(SLOC.room));
function slocSala(){ if (SLOC.room) slocEnvia({type:'room', room:slocCopia()}); }
const slocMembro = id => SLOC.room && SLOC.room.members.find(m => m.id === id);
function slocSys(text){ slocEnvia({type:'say', sys:true, text, t:Date.now()}); }
function slocLivre(r, t){ for (let k = 0; k < r.n; k++){ const i = t*r.n + k; if (!r.roster[i]) return i; } return -1; }
function slocSenta(m, slot){
  const r = SLOC.room;
  if (m.slot >= 0 && r.roster[m.slot] === m.id) r.roster[m.slot] = null;
  m.slot = slot; m.ready = !!m.bot; if (slot >= 0) r.roster[slot] = m.id;
}
function slocNovoN(n){                                  // mudou o tamanho dos times: quem cabe continua no lugar, o resto vai assistir
  const r = SLOC.room, vn = r.n; r.n = n; r.roster = new Array(2*n).fill(null);
  for (const m of r.members){
    if (m.slot < 0) continue;
    const t = Math.floor(m.slot/vn), k = m.slot % vn;
    if (k < n){ m.slot = t*n + k; r.roster[m.slot] = m.id; } else m.slot = -1;
  }
}
function slocDesliga(){                                 // sai do servidor da turma (sem o aviso de "conexão caiu" nem a volta automática)
  SL.quer = null; clearTimeout(SL.tentT); SL.tent = 0; SL.rapido = 0;
  const ws = NET49.ws;
  if (ws){ ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null; try { ws.close(); } catch (_) {} }
  NET49.ws = null; NET49.id = null; NET49.room = null;
}
function slocCria(o){
  slocDesliga();
  const eu = SLOC.eu, n = [1, 2, 3, 4].includes(o.n) ? o.n : 2;
  SLOC.on = true; NET49.id = eu;
  SLOC.room = {code:'AQUI', local:true, name:String(o.name || '').trim().slice(0, 24) || 'Racha de ' + perfil.nome, host:eu,
    n, map:CAMPOS[o.map] ? o.map : 0, jogo:SL_MODO[o.jogo] ? o.jogo : 'futebol', tempo:SL_TEMPOS.includes(o.tempo) ? o.tempo : 0,
    bots:true, pub:false, state:'waiting', round:0, roster:new Array(2*n).fill(null),
    members:[{id:eu, name:perfil.nome, flag:slPais(), skin:perfil.skin, avatar:perfil.avatar, club:null, slot:-1, ready:false, rematch:false}]};
  slocEnvia({type:'sayHistory', list:[]});
  slocSala();
  slocEnvia({type:'say', sys:true, who:eu, text:perfil.nome + ' chegou na sala', t:Date.now()});
}
function slocChamaBot(){                                // na sala neste aparelho, CONVIDAR vira CHAMAR BOT (ele chega assistindo)
  const r = SLOC.room; if (!r) return;
  if (r.state === 'playing') return x49Toast('Espere a partida acabar para chamar mais gente.');
  if (r.members.length >= SLOC_MAX) return x49Toast('A sala está cheia (' + SLOC_MAX + ').');
  const usados = new Set(r.members.map(m => String(m.name).toLowerCase()));
  const livres = RQ_NOMES.filter(x => !usados.has(x.toLowerCase()));
  const nome = livres.length ? livres[Math.floor(Math.random()*livres.length)] : 'Bot ' + r.members.length;
  r.members.push({id:'bot-' + Date.now().toString(36) + Math.floor(Math.random()*1e4), bot:true, name:nome, flag:'BR', skin:tpDoBot(nome), avatar:null, club:null, slot:-1, ready:true, rematch:false});
  slocSala(); slocSys(nome + ' (bot) chegou na sala');
}
function slocFecha(){ if (!SLOC.on) return; SLOC.on = false; SLOC.room = null; if (NET49.id === SLOC.eu) NET49.id = null; }
function slocRecebe(m){
  const r = SLOC.room; if (!r) return;
  const eu = slocMembro(SLOC.eu), host = r.host === SLOC.eu;
  switch (m.type){
    case 'ping': return slocEnvia({type:'pong', time:m.time});
    case 'list': return slocEnvia({type:'rooms', list:[], online:0});
    case 'say': {
      const t = String(m.text || '').slice(0, 120); if (!t.trim()) return;
      return slocEnvia({type:'say', id:SLOC.eu, name:perfil.nome, text:t, t:Date.now()});
    }
    case 'seat': {
      if (r.state === 'playing') return slocEnvia({type:'error', message:'A partida está rolando. Espere acabar para mexer nos times.'});
      const alvo = m.id ? slocMembro(m.id) : eu; if (!alvo) return;
      if (alvo !== eu && !host) return;
      let slot = alvo.slot;
      if (Number.isInteger(m.slot)) slot = m.slot < 0 ? -1 : m.slot < 2*r.n && !r.roster[m.slot] ? m.slot : alvo.slot;
      else if (m.team === 0 || m.team === 1){
        if (alvo.slot >= 0 && Math.floor(alvo.slot/r.n) === m.team) return;
        slot = slocLivre(r, m.team);
        if (slot < 0) return slocEnvia({type:'error', message:(m.team ? 'A Equipe Azul' : 'O Time Vermelho') + ' está cheio.'});
      }
      slocSenta(alvo, slot); return slocSala();
    }
    case 'config': {
      if (!host || r.state === 'playing') return;
      if ([1, 2, 3, 4].includes(m.n) && m.n !== r.n) slocNovoN(m.n);
      if (Number.isInteger(m.map) && CAMPOS[m.map]) r.map = m.map;
      if (typeof m.jogo === 'string' && SL_MODO[m.jogo]) r.jogo = m.jogo;
      if (SL_TEMPOS.includes(m.tempo)) r.tempo = m.tempo;
      if (typeof m.bots === 'boolean') r.bots = m.bots;
      if (typeof m.name === 'string' && m.name.trim()) r.name = m.name.trim().slice(0, 24);
      return slocSala();
    }
    case 'ready': if (eu) eu.ready = !!m.on; return slocSala();
    case 'rematch':                                     // o dono pedindo revanche aqui: começa de novo
    case 'start': {
      if (!host || r.state === 'playing') return;
      const motivo = slMotivo(r); if (motivo) return slocEnvia({type:'error', message:motivo});
      r.state = 'playing'; r.round++;
      for (const x of r.members){ x.ready = !!x.bot; x.rematch = false; }
      slocEnvia({type:'start', room:slocCopia()}); return slocSala();
    }
    case 'finish': {
      if (r.state !== 'playing' || m.round !== r.round) return;
      const s = Array.isArray(m.score) ? m.score.slice(0, 2).map(v => Math.max(0, v | 0)) : [0, 0];
      r.state = 'ended';
      slocEnvia({type:'result', round:r.round, score:s, winner:s[0] > s[1] ? 0 : s[1] > s[0] ? 1 : -1});
      return slocSala();
    }
    case 'kick': {
      if (!host || !m.id || m.id === SLOC.eu) return;
      const x = slocMembro(m.id); if (!x) return;
      if (x.slot >= 0) r.roster[x.slot] = null;
      r.members = r.members.filter(y => y !== x);
      slocSys(x.name + ' foi embora da sala'); return slocSala();
    }
    case 'promote': return slocEnvia({type:'error', message:'Na sala neste aparelho você é sempre o árbitro.'});
    case 'leave': slocFecha(); return slocEnvia({type:'left'});
    default: return;                                    // input, snapshot, typing, pause, social, profile, rtc…: aqui não tem mais ninguém
  }
}

/* ---------------------------------------------------------------- 2) o árbitro */
const ARB = {code:null, assist:[], ban:[], pausado:false, pausaVista:false, encerrada:-1, principal:null, estados:new Map(), chutou:new Map(), estT:0};
const ARB_TAG = '⁣ARB:';                          // o começo das mensagens escondidas (o servidor repassa como chat da sala)
const ARB_RE = /^⁣?ARB:([a-z])(?:\|([0-9a-z|,-]*))?$/;
function arbH(id){                                      // um apelido curto e fixo de cada um (a mensagem cabe nos 120 caracteres do chat)
  let h = 2166136261; const s = String(id || '');
  for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36).slice(0, 6);
}
const arbLista = t => String(t || '').split(',').filter(x => /^[0-9a-z]{1,7}$/.test(x));
const arbAtivo = r => !!r && !r.oficial && !r.tournament;          // (sala oficial e copa têm as regras delas)
const arbPrincipalId = r => r ? (r.admin || r.host) : null;
const arbEhPrincipal = (id, r) => !!r && !!id && id === arbPrincipalId(r);
const arbEhAux = (id, r) => !!r && !!id && ARB.code === r.code && ARB.assist.includes(arbH(id));
const arbEh = (id, r) => arbAtivo(r) && (arbEhPrincipal(id, r) || arbEhAux(id, r));
function arbEu(r){ r = r || NET49.room; return arbEh(NET49.id, r); }
function arbEuPrincipal(r){ r = r || NET49.room; return arbAtivo(r) && arbEhPrincipal(NET49.id, r); }
function arbMsg(s){ const r = NET49.room; if (r && !r.local) net49Send({type:'say', text:ARB_TAG + s}); }
function arbEstado(ja){ clearTimeout(ARB.estT); ARB.estT = setTimeout(arbEstadoJa, ja ? 0 : 600); }
function arbEstadoJa(){                                 // o principal conta para a sala quem tem o apito e quem está banido
  const r = NET49.room; if (!r || r.local || !arbEuPrincipal(r)) return;
  const s = 's|' + ARB.assist.slice(0, 5).join(',') + '|' + ARB.ban.slice(-6).join(',');
  if (s === 's||' && ARB.ult === s) return;            // (nada para contar: não ocupa o chat)
  ARB.ult = s; arbMsg(s);
}
function arbPinta(){ if (lobby.aberto && lobby.tela === 'sala') slRender(); if (X49UI.open) salaJogoRender(); }
function arbZera(){
  clearTimeout(ARB.estT);
  Object.assign(ARB, {code:null, assist:[], ban:[], pausado:false, pausaVista:false, principal:null, ult:''});
  ARB.estados.clear(); ARB.chutou.clear(); arbFaixa();
}
function arbAplica(est, r){
  const prH = arbH(arbPrincipalId(r));
  ARB.assist = est.a.filter(h => h !== prH).slice(0, 5);
  ARB.ban = Array.from(new Set(ARB.ban.concat(est.b))).slice(-30);
  arbPinta();
}
function arbRecebe(m, aoVivo){
  const o = ARB_RE.exec(String(m.text || '')); if (!o || !m.id) return;
  const k = o[1], p = (o[2] || '').split('|'), de = m.id, r = NET49.room;
  if (k === 's'){                                       // o estado: vale o do árbitro principal
    const est = {a:arbLista(p[0]), b:arbLista(p[1])}, v = ARB.estados.get(de);
    if (v) est.b = Array.from(new Set(v.b.concat(est.b))).slice(-30);
    ARB.estados.set(de, est);
    if (r && de === arbPrincipalId(r) && de !== NET49.id) arbAplica(est, r);   // (o próprio eco do principal não volta o que ele já mudou)
    return;
  }
  if (!aoVivo || !r || !arbAtivo(r)) return;
  const pr = arbPrincipalId(r);
  if (k === 'e'){ if (de === pr) ARB.encerrada = parseInt(p[0], 10); return; }   // encerrada pelo árbitro: não vale prêmio
  if (k === 'p'){
    if (de !== pr) return;
    const on = p[0] === '1'; ARB.pausaVista = on;
    if (de !== NET49.id && NET49.playing){ x49Toast(on ? 'O árbitro pausou a partida.' : 'O árbitro voltou o jogo. Valendo!'); som.apito('curto'); }
    arbFaixa(); return;
  }
  if (k === 'q' && de !== NET49.id && arbEuPrincipal(r) && ARB.assist.includes(arbH(de))){   // pedido de quem tem o apito: o principal executa
    const quem = r.members.find(x => x.id === de), nm = quem ? quem.name : 'O árbitro';
    if (p[0] === 'seat'){ const alvo = r.members.find(x => arbH(x.id) === p[1]); if (alvo) arbMover(alvo.id, p[2] === '0' ? 0 : p[2] === '1' ? 1 : -1, nm); }
    else if (p[0] === 'pausa') arbPausa(p[1] === '1', nm);
    else if (p[0] === 'fim') arbEncerra(nm);
  }
}
function arbSala(antes, r){                             // cada atualização da sala
  if (!r) return;
  const pr = arbPrincipalId(r);
  if (ARB.code !== r.code){                             // entrou agora: vale o último combinado do principal
    clearTimeout(ARB.estT);
    Object.assign(ARB, {code:r.code, assist:[], ban:[], principal:pr, pausado:false, pausaVista:false, ult:''});
    const est = ARB.estados.get(pr); if (est) arbAplica(est, r);
  }
  if (!arbAtivo(r)) return;
  const hs = new Set(r.members.map(m => arbH(m.id))), antesA = ARB.assist.join();
  ARB.assist = ARB.assist.filter(h => hs.has(h) && h !== arbH(pr));   // quem foi embora da sala perde o apito
  if (pr !== ARB.principal){
    const velho = ARB.principal; ARB.principal = pr;
    const est = ARB.estados.get(pr); if (est && pr !== NET49.id) arbAplica(est, r);
    if (pr === NET49.id && !r.local){
      if (velho && !r.members.some(m => m.id === velho)) arbSucede(r);   // o dono caiu e o servidor passou a sala para você
      else { arbEstado(true); x49Toast('Agora você é o árbitro principal: pode banir também.'); }
    } else if (velho === NET49.id && pr){ const m = r.members.find(x => x.id === pr); x49Toast('O apito principal passou para ' + (m ? m.name : 'outra pessoa') + '.'); }
  }
  if (!r.local && arbEuPrincipal(r)){
    arbChutaBanidos();                                  // banido não volta
    const novos = !!antes && antes.code === r.code && r.members.some(m => !antes.members.some(x => x.id === m.id));
    if (novos || ARB.assist.join() !== antesA) arbEstado();   // quem chegou fica sabendo quem apita
  }
}
function arbChutaBanidos(){                            // o principal tira de novo quem foi banido e voltou (pelo código ou pela lista)
  const r = NET49.room; if (!r || r.local || !arbEuPrincipal(r)) return;
  const agora = Date.now(); let depois = false;
  for (const m of r.members){
    if (m.id === NET49.id || !ARB.ban.includes(arbH(m.id))) continue;
    if (agora - (ARB.chutou.get(m.id) || 0) >= 900){ ARB.chutou.set(m.id, agora); net49Send({type:'kick', id:m.id}); }
    else depois = true;
  }
  if (depois){ clearTimeout(ARB.banT); ARB.banT = setTimeout(arbChutaBanidos, 950); }
}
function arbSucessor(r){                                // o principal vai sair: fica quem tem o apito; sem ninguém, um sorteado
  const outros = r.members.filter(m => m.id !== NET49.id && !m.bot);
  const aux = outros.filter(m => ARB.assist.includes(arbH(m.id)));
  if (aux.length) return aux[0];
  return outros.length ? outros[Math.floor(Math.random()*outros.length)] : null;
}
function arbSucede(r){                                  // o servidor te deu a sala porque o principal caiu
  const meu = arbH(NET49.id);
  if (ARB.assist.includes(meu) || r.state === 'playing'){
    ARB.assist = ARB.assist.filter(h => h !== meu); arbEstado(true);
    return x49Toast('O dono saiu: agora você é o árbitro principal.');
  }
  const outros = r.members.filter(m => m.id !== NET49.id && !m.bot), aux = outros.filter(m => ARB.assist.includes(arbH(m.id)));
  if (aux.length){ net49Send({type:'promote', id:aux[0].id}); return; }
  const todos = r.members.filter(m => !m.bot), s = todos[Math.floor(Math.random()*todos.length)];
  if (s && s.id !== NET49.id){ net49Send({type:'promote', id:s.id}); return; }
  arbEstado(true); x49Toast('O dono saiu e o sorteio deu você: agora você é o árbitro principal.');
}
function arbMover(id, t, pedido){                       // t: 0 = Time Vermelho · 1 = Equipe Azul · -1 = assistindo
  const r = NET49.room; if (!r || !arbAtivo(r)) return;
  if (r.state === 'playing'){ if (!pedido) x49Toast('A partida está rolando. Espere acabar para mexer nos times.'); return; }
  if (arbEuPrincipal(r)){
    const m = {type:'seat'}; if (id !== NET49.id) m.id = id;
    if (t === 0 || t === 1) m.team = t; else m.slot = -1;
    net49Send(m); return;
  }
  if (arbEu(r)){ arbMsg('q|seat|' + arbH(id) + '|' + (t === 0 || t === 1 ? t : '-1')); x49Toast('Pedido mandado: quem executa é o árbitro principal.'); }
}
function arbDaApito(id, on){
  const r = NET49.room; if (!r || r.local || !arbEuPrincipal(r) || id === NET49.id) return;
  const m = r.members.find(x => x.id === id); if (!m) return;
  const h = arbH(id); ARB.code = r.code;
  if (on && !ARB.assist.includes(h) && ARB.assist.length >= 5) return x49Toast('Já tem 5 com o apito. Tire o apito de alguém antes.');
  ARB.assist = on ? Array.from(new Set(ARB.assist.concat(h))) : ARB.assist.filter(x => x !== h);
  arbEstado(true); arbPinta();
  x49Toast(on ? m.name + ' agora tem o apito: monta os times, pausa e encerra (só não bane).' : m.name + ' não tem mais o apito.');
}
function arbBane(id){
  const r = NET49.room; if (!r || !arbEuPrincipal(r) || id === NET49.id) return;
  const m = r.members.find(x => x.id === id);
  if (!r.local){ const h = arbH(id); ARB.ban = Array.from(new Set(ARB.ban.concat(h))).slice(-30); ARB.assist = ARB.assist.filter(x => x !== h); arbEstado(true); }
  net49Send({type:'kick', id});
  if (m && !m.bot) x49Toast(m.name + ' foi banido da sala.');
}
function arbPausa(on, quem){
  const r = NET49.room; if (!r || !arbAtivo(r) || !NET49.playing || !RQ.on || RQ.estado === 'fim') return;
  if (arbEuPrincipal(r)){
    if (!NET49.host) return x49Toast('Esta partida está rodando no servidor: daqui não dá para pausar.');
    if (ARB.pausado === !!on) return;
    ARB.pausado = ARB.pausaVista = !!on;
    if (!r.local){ net49Send({type:'pause', paused:!!on}); arbMsg('p|' + (on ? 1 : 0)); }
    acc = 0; last = performance.now(); limparEntrada(); arbFaixa(); som.apito('curto');
    if (quem) x49Toast(quem + (on ? ' pediu a pausa: partida pausada.' : ' pediu para voltar: valendo!'));
    return;
  }
  if (arbEu(r)){ arbMsg('q|pausa|' + (on ? 1 : 0)); x49Toast(on ? 'Pedido de pausa mandado ao árbitro principal.' : 'Pedido para voltar mandado ao árbitro principal.'); }
}
function arbEncerra(quem){
  const r = NET49.room; if (!r || !arbAtivo(r) || !NET49.playing || !RQ.on || RQ.estado === 'fim') return;
  if (arbEuPrincipal(r)){
    if (!NET49.host) return x49Toast('Esta partida está rodando no servidor: daqui não dá para encerrar.');
    ARB.encerrada = r.round; arbMsg('e|' + r.round);
    if (ARB.pausado){ ARB.pausado = ARB.pausaVista = false; if (!r.local){ net49Send({type:'pause', paused:false}); arbMsg('p|0'); } }
    acc = 0; last = performance.now();
    rqFim(); if (RQ.resultado){ RQ.resultado.contado = true; RQ.resultado.encerrada = true; }   // não vale prêmio (nem para quem roda a partida)
    rqAvisa('ENCERRADA PELO ÁRBITRO', '#ffd23f'); arbFaixa();
    if (quem) x49Toast(quem + ' encerrou a partida.');
    return;
  }
  if (arbEu(r)){ arbMsg('q|fim'); x49Toast('Pedido para encerrar mandado ao árbitro principal.'); }
}
function ARB_PARADO(){ try { return ARB.pausado && NET49.playing && NET49.host; } catch (_) { return false; } }   // (o quadro: a física não anda)
// a faixa "PARTIDA PAUSADA" por cima do jogo (para todo mundo da sala)
const ARB_FAIXA = nodo('div'); ARB_FAIXA.id = 'arb-faixa'; ARB_FAIXA.hidden = true; ARB_FAIXA.setAttribute('role', 'status');
ARB_FAIXA.innerHTML = '<b>PARTIDA PAUSADA</b><small></small>';
($('wrap') || document.body).appendChild(ARB_FAIXA);
function arbFaixa(){
  const on = NET49.playing && RQ.on && RQ.estado !== 'fim' && (ARB.pausado || (NET49.paused && !NET49.host)) && !PAUSA.aberta && !X49UI.open && !lobby.aberto;
  if (ARB_FAIXA.hidden === !on && !on) return;
  ARB_FAIXA.hidden = !on;
  if (on) ARB_FAIXA.querySelector('small').textContent = ARB.pausado ? 'pelo árbitro · abra o menu para voltar o jogo' : ARB.pausaVista ? 'pelo árbitro · aguarde ele voltar o jogo' : 'aguardando quem roda a partida';
}
setInterval(arbFaixa, 300);

/* ---- as mensagens: as do árbitro saem do chat; a sala, o resultado e a partida passam por aqui ---- */
const net49MessageAntes68 = net49Message;
net49Message = function(m){
  if (!m) return;
  if (m.type === 'say' && typeof m.text === 'string' && ARB_RE.test(m.text)){ arbRecebe(m, true); return; }
  if (m.type === 'sayHistory' && Array.isArray(m.list)){
    const lista = [];
    for (const x of m.list){ if (x && typeof x.text === 'string' && ARB_RE.test(x.text)) arbRecebe(x, false); else lista.push(x); }
    m = Object.assign({}, m, {list:lista});
  }
  const antes = NET49.room;
  net49MessageAntes68(m);
  if (m.type === 'room'){
    const r = NET49.room;
    arbSala(antes, r);
    if (SX.criei && r && r.host === NET49.id){        // a sala que você acabou de criar começa como no print: você nos espectadores
      SX.criei = false; const eu = r.members.find(x => x.id === NET49.id);
      if (eu && eu.slot >= 0 && r.state !== 'playing') net49Send({type:'seat', slot:-1});
    }
  } else if (m.type === 'left'){ arbZera(); SX.criei = false; }
  else if (m.type === 'start'){ ARB.pausado = ARB.pausaVista = false; arbFaixa(); }
};
const net49SendAntes68 = net49Send;
net49Send = function(m){
  if (!m) return;
  if (m.type === 'pause' && ARB.pausado && !m.paused) m = Object.assign({}, m, {paused:true});   // a pausa do árbitro vale mais que a volta do app
  if (SLOC.on && SLOC_TIPOS.has(m.type)) return slocRecebe(m);
  if (m.type === 'join' && !m.spectate && !Number.isInteger(m.slot)) m = Object.assign({}, m, {spectate:true});   // quem entra assiste: o árbitro monta os times
  if (m.type === 'leave'){                              // o principal saindo: o apito fica com quem tem o apito (ou com um sorteado)
    const r = NET49.room;
    if (r && !r.local && arbEuPrincipal(r) && r.state !== 'playing'){ const s = arbSucessor(r); if (s) net49SendAntes68({type:'promote', id:s.id}); }
  }
  return net49SendAntes68(m);
};
const net49ConnectAntes68 = net49Connect;
net49Connect = function(endpoint){ if (SLOC.on) return; return net49ConnectAntes68(endpoint); };   // (na sala neste aparelho o jogo fica fora do servidor)
const net49ResultAntes68 = net49Result;
net49Result = function(m){
  ARB.pausado = ARB.pausaVista = false; arbFaixa();
  const r = NET49.room;
  if (!m || ARB.encerrada !== m.round || !r || !arbAtivo(r)){
    net49ResultAntes68(m);
    if (r && r.local && NET49.localSlot >= 0 && fimAberto()){ fimEl('fim-info').textContent = fimEl('fim-info').textContent.replace('Sala AQUI', 'Sala neste aparelho'); fimEl('fim-denovo').textContent = 'JOGAR DE NOVO'; }
    return;
  }
  if (NET49.lastResult === m.round) return;            // encerrada pelo árbitro: o placar fica, o prêmio não
  NET49.lastResult = m.round; RQ.estado = 'fim'; RQ.fimT = RQ_FIM_TICKS;
  const placar = Array.isArray(m.score) ? m.score.slice(0, 2) : RQ.placar.slice();
  if (NET49.localSlot < 0){ x49Toast('Partida encerrada pelo árbitro: ' + placar.join(' × ')); x49Open('online'); return; }
  RQ.resultado = {placar, venceu:false, golsH:NET49.host ? RQ.golsH : NET49.onlineGols, assistH:NET49.host ? RQ.assistH : NET49.onlineAssist,
    n:RQ.n, mapa:RQ.mapa, nivel:'dificil', contado:true, encerrada:true};
  rqMostraFim();
  const f = fimEl('fim'); if (f) f.classList.remove('perdeu');
  fimEl('fim-titulo').textContent = 'ENCERRADA';
  fimEl('fim-info').textContent = 'Encerrada pelo árbitro · não vale prêmio · ' + (r.local ? 'sala neste aparelho' : 'sala ' + r.code);
  fimEl('fim-denovo').textContent = r.local ? 'JOGAR DE NOVO' : 'PEDIR REVANCHE';
};

/* ---- a partida da sala: os bots chamados com o nome deles; Time Vermelho × Equipe Azul de verdade ---- */
const net49BeginAntes68 = net49Begin;
net49Begin = function(room){
  if (!room || !room.local) return net49BeginAntes68(room);
  const bots = {}, rr = Object.assign({}, room, {roster:room.roster.map(id => { const m = room.members.find(x => x.id === id); if (m && m.bot){ bots[id] = m.name; return null; } return id; })});
  net49BeginAntes68(rr);                                // (vaga de bot = o bot do jogo, com o nome de quem foi chamado)
  room.roster.forEach((id, i) => { const q = RQ.jog[i]; if (bots[id] && q && (q !== P || NET49.localSlot < 0)) q.nome = bots[id]; });
  NET49.room = room;
};
const SALA_COR = [Object.assign({}, SEM_SKIN, {id:'sala-vermelho', nome:'Time Vermelho', cor:'#e2412f'}), Object.assign({}, SEM_SKIN, {id:'sala-azul', nome:'Equipe Azul', cor:'#2f6fe0'})];
const skinDoTimeAntes68 = skinDoTime;
skinDoTime = function(t){ return NET49.playing ? SALA_COR[t ? 1 : 0] : skinDoTimeAntes68(t); };
net49Skin = function(q){ return SALA_COR[q && q.time ? 1 : 0]; };
const x49GameUIAntes68 = x49GameUI;
x49GameUI = function(){
  x49GameUIAntes68();
  const r = NET49.room; if (!NET49.playing || !r || !X49UI.netText) return;
  if (ARB.pausado || (NET49.paused && ARB.pausaVista)) X49UI.netText.textContent = 'PAUSADA PELO ÁRBITRO';
  else if (r.local) X49UI.netText.textContent = (NET49.localSlot < 0 ? 'ASSISTINDO' : 'SALA NESTE APARELHO') + ' · ÁRBITRO';
  else if (NET49.host && arbEuPrincipal(r)) X49UI.netText.textContent = 'SALA ' + r.code + ' · árbitro';
  else if (arbEu(r)) X49UI.netText.textContent += ' · apito';
};
const salaJogoRenderAntes68 = salaJogoRender;
salaJogoRender = function(){                            // a sala por cima da partida (botão SALA): o apito e a sala neste aparelho
  salaJogoRenderAntes68();
  const r = NET49.room, c = SJ.caixa; if (!r || !c || !c.firstChild) return;
  if (r.local){
    const tag = c.querySelector('.sj-tag'); if (tag) tag.textContent = 'SALA NESTE APARELHO';
    const cod = c.querySelector('.sj-cod'); if (cod){ cod.textContent = r.name || 'Sala'; cod.classList.add('sj-nome'); }
    for (const b of c.querySelectorAll('.sj-acoes button')) if (/CÓDIGO/.test(b.textContent)) b.hidden = true;
    const inf = c.querySelector('.sj-info'); if (inf) inf.textContent = (NET49.localSlot < 0 ? 'Você está assistindo' : 'Você e os bots') + ' · ' + CAMPOS[r.map].nome;
  }
  if (!arbEu(r) || !RQ.on || RQ.estado === 'fim') return;
  const box = nodo('div', 'sj-arb'), p = arbEuPrincipal(r);
  box.appendChild(nodo('span', 'sj-arb-tit', p ? 'VOCÊ É O ÁRBITRO' : 'VOCÊ TEM O APITO'));
  const pausa = novoBotao('sj-amarelo'), fim = novoBotao('sj-verm'), pausado = ARB.pausado || ARB.pausaVista;
  pausa.textContent = pausado ? 'VOLTAR O JOGO' : 'PAUSAR PARA TODOS';
  pausa.addEventListener('click', () => { som.clique(); salaJogoFecha(); arbPausa(!pausado); });
  fim.textContent = 'ENCERRAR PARTIDA'; let conf = 0;
  fim.addEventListener('click', () => {
    const t = performance.now();
    if (!conf || t - conf > 3200){ conf = t; fim.textContent = 'TOQUE DE NOVO (SEM PRÊMIO)'; som.erro(); return; }
    som.clique(); salaJogoFecha(); arbEncerra();
  });
  box.append(pausa, fim);
  const ac = c.querySelector('.sj-acoes'); if (ac) ac.insertAdjacentElement('beforebegin', box); else c.appendChild(box);
};
function slocAviso(boxId, stId, oque){                  // CLUBE e COPA com a sala neste aparelho aberta
  const box = $(boxId); if (!box) return false;
  box.textContent = ''; const st = $(stId); if (st){ st.textContent = ''; st.className = 'tl-info on-st ok'; st.append(nodo('i'), 'SALA NESTE APARELHO'); }
  const v = nodo('div', 'sx sx-aviso'), tx = nodo('div', 'sx-na');
  tx.append(nodo('b', null, oque + ' PRECISA DO SERVIDOR'), nodo('span', null, 'Você está numa sala neste aparelho (você e os bots). Saia dela para conectar no servidor da turma.'));
  tx.append(sxBt('sx-bt amarelo', 'VOLTAR PARA A SALA', () => abreTela('sala')), sxBt('sx-bt verm', 'SAIR DA SALA', () => net49Send({type:'leave'})));
  v.appendChild(tx); box.appendChild(v); return true;
}
const clubesRenderAntes68 = clubesRender, eventosRenderAntes68 = eventosRender;
clubesRender = function(){ if (SLOC.on && slocAviso('cl-corpo', 'cl-st', 'O CLUBE')) return; return clubesRenderAntes68(); };
eventosRender = function(){ if (SLOC.on && slocAviso('ev-corpo', 'ev-st', 'A COPA')) return; return eventosRenderAntes68(); };

// abrir GALERA tenta conectar sozinho: se não tem servidor, a tela já mostra SEM SERVIDOR (sem o aviso de erro por cima)
const galeraConectaAntes68 = galeraConecta;
galeraConecta = function(){ SX.autoT = performance.now(); return galeraConectaAntes68(); };
const x49ToastAntes68 = x49Toast;
x49Toast = function(t){ if (/^Não conectou\./.test(String(t)) && performance.now() - SX.autoT < 5000) return; return x49ToastAntes68(t); };

/* ---------------------------------------------------------------- 3) as telas */
const SX = {criando:false, criei:false, pediu:0, autoT:-1e9, busca:'', semCheias:false, soEspera:false,
  form:{nome:'', onde:'aqui', pub:true, n:2, map:0, jogo:'futebol', tempo:0, bots:true}};
try { const p = SL.pref; Object.assign(SX.form, {n:p.n, map:p.map, jogo:p.jogo, tempo:p.tempo, bots:true, pub:!SL.privada}); } catch (_) {}
const SX_LUPA = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.8"/><path d="M15.5 15.5l5 5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
const SX_SETA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SX_MAIS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/></svg>';
const SX_GIRA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M18.8 3.2v4.6h-4.6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SX_APITO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 9.5h10l6.6-3.4 1.7 3.5-4.3 2.2A6.4 6.4 0 1 1 2.5 9.5z" fill="currentColor"/><circle cx="9.1" cy="14.9" r="2.3" fill="#171a1c"/></svg>';
const sxOnline = () => !SLOC.on && !!NET49.id && !!NET49.ws && NET49.ws.readyState === 1;
function sxBt(cls, html, fn, rot){ const b = novoBotao(cls, rot); b.innerHTML = html; b.addEventListener('click', () => { som.clique(); fn(b); }); return b; }
const sxSit = s => s.cup ? 'COPA' : s.state === 'playing' ? 'ROLANDO' : 'PELADA ABERTA';
function sxStatus(){
  const on = sxOnline(), liga = !on && !SLOC.on && !!NET49.ws;
  const txt = SLOC.on ? 'NESTE APARELHO' : on ? 'ONLINE' + (SL.online > 1 ? ' · ' + SL.online + ' NA ÁREA' : '') : liga ? 'CONECTANDO…' : 'SEM SERVIDOR';
  return sxBt('sx-st' + (on || SLOC.on ? ' ok' : liga ? ' liga' : ''), '<i></i><span>' + txt + '</span>', () => { if (on) net49Send({type:'list'}); else sxConectar(); },
    on ? 'Atualizar a lista de salas' : 'Conectar no servidor da turma');
}
function sxConectar(){                                  // o endereço do servidor da turma (o mesmo quadro de antes, num pop)
  abrePop(c => {
    c.classList.add('sl-pop', 'sx-pop');
    c.appendChild(nodo('span', 'pop-tag', 'SERVIDOR DA TURMA'));
    if (SLOC.on){
      c.append(nodo('h2', null, 'VOCÊ ESTÁ NUMA SALA AQUI'), nodo('p', 'pop-txt', 'Enquanto a sala neste aparelho está aberta, o jogo fica fora do servidor. Saia dela para conectar.'));
    } else {
      const card = onConexao(); card.classList.add('sx-conexao');
      const bt = card.querySelector('.lb-btn'); if (bt) bt.addEventListener('click', () => setTimeout(() => { if (!LB.pop.hidden && c.contains(bt)) fechaPop(); }, 120));
      c.appendChild(card);
      c.appendChild(nodo('p', 'pop-txt sx-como', 'Como funciona: quem cria a sala é o árbitro. A galera entra pelo link ou pelo código e fica assistindo; o árbitro monta o Time Vermelho e a Equipe Azul e começa. Quem roda a partida é o celular do dono: deixe o jogo aberto.'));
    }
    const a = nodo('div', 'pop-acoes'); a.appendChild(botaoPop('FECHAR', '', () => { som.clique(); fechaPop(); })); c.appendChild(a);
  });
}
function sxCodigo(){                                    // entrar com o código (assistindo, até o árbitro te pôr num time)
  if (!sxOnline()) return sxConectar();
  abrePop(c => {
    c.classList.add('sl-pop', 'sx-pop');
    const i = onIn('codigo', 'ABC123', 6, 'codigo');
    const vai = () => { const cod = (ONF.codigo || '').trim().toUpperCase(); if (!cod) return x49Toast('Digite o código da sala.'); fechaPop(); net49Send({type:'join', code:cod, spectate:true}); };
    i.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); vai(); } });
    c.append(nodo('span', 'pop-tag', 'ENTRAR COM CÓDIGO'), nodo('h2', null, 'CÓDIGO DA SALA'), i, nodo('p', 'pop-txt', 'Você entra assistindo. Quem escolhe os times é o árbitro.'));
    const a = nodo('div', 'pop-acoes'); a.append(botaoPop('CANCELAR', '', () => { som.clique(); fechaPop(); }), botaoPop('ENTRAR', 'verde', () => { som.clique(); vai(); }));
    c.appendChild(a);
    setTimeout(() => { try { i.focus({preventScroll:true}); } catch (_) {} }, 60);
  });
}
function sxLinha(s){
  const d = sxBt('sx-sala' + (s.state === 'playing' ? ' jogando' : ''), '', () => {
    if (s.state === 'playing' && !s.cup) x49Toast('A partida está rolando: você entra assistindo.');
    net49Send({type:'join', code:s.code, spectate:true});
  }, 'Entrar na sala ' + (s.name || s.code));
  const nm = nodo('b', 'sx-nm'); nm.appendChild(nodo('span', null, s.name || 'Sala'));
  if (s.oficial) nm.appendChild(nodo('i', 'sx-ofi', 'OFICIAL'));
  const reg = nodo('span', 'sx-reg'); reg.innerHTML = slBandeira(s.flag) || '—';
  d.append(nm, nodo('span', 'sx-c', slModo(s.jogo)), nodo('span', 'sx-c', slCampo(s.map)), reg,
    nodo('span', 'sx-n', (s.players | 0) + '/' + (s.max | 0)), nodo('span', 'sx-sit' + (s.state === 'playing' ? ' on' : s.cup ? ' copa' : ''), sxSit(s)));
  return d;
}
function sxNovaSala(){ if (NET49.room) return x49Toast('Saia da sala em que você está para criar outra.'); SX.criando = true; amigosRender(); }
function sxLista(){
  const box = nodo('div', 'sx'), on = sxOnline();
  const cab = nodo('header', 'sx-cab'), tit = nodo('h3', 'sx-tit');
  tit.append('SALAS', nodo('span', 'sx-tag', 'PERSONALIZADAS'));
  cab.append(tit, sxStatus());
  box.appendChild(cab);
  const corpo = nodo('div', 'sx-corpo2'); box.appendChild(corpo);
  const r = NET49.room;
  if (r){                                                // já está numa sala
    const v = nodo('div', 'sx-na');
    v.append(nodo('b', null, 'VOCÊ ESTÁ NUMA SALA'), nodo('span', null, (r.name || 'Sala') + (r.local ? ' · neste aparelho' : ' · código ' + r.code) + ' · ' + r.members.length + (r.members.length === 1 ? ' pessoa' : ' pessoas')));
    v.append(sxBt('sx-bt amarelo', 'VOLTAR PARA A SALA', () => abreTela('sala')), sxBt('sx-bt verm', 'SAIR DA SALA', () => { SL.quer = null; net49Send({type:'leave'}); }));
    corpo.appendChild(v);
  }
  const busca = nodo('div', 'sx-busca'), lab = nodo('label', 'sx-in'), inp = nodo('input');
  lab.innerHTML = SX_LUPA; inp.type = 'search'; inp.placeholder = 'Procurar sala'; inp.value = SX.busca; inp.maxLength = 24; inp.dataset.k = 'sx-busca';
  inp.setAttribute('aria-label', 'Procurar sala'); inp.autocomplete = 'off'; inp.spellcheck = false; inp.enterKeyHint = 'search';
  inp.addEventListener('input', () => { SX.busca = inp.value; sxPintaLista(box); });
  lab.appendChild(inp);
  const fil = (txt, k) => sxBt('sx-fil' + (SX[k] ? ' on' : ''), '<i></i><span>' + txt + '</span>', b => { SX[k] = !SX[k]; b.classList.toggle('on', SX[k]); b.setAttribute('aria-pressed', String(SX[k])); sxPintaLista(box); });
  const f1 = fil('SEM CHEIAS', 'semCheias'), f2 = fil('SÓ ESPERANDO', 'soEspera');
  f1.setAttribute('aria-pressed', String(SX.semCheias)); f2.setAttribute('aria-pressed', String(SX.soEspera));
  busca.append(lab, f1, f2, sxBt('sx-fil sx-cod', '<span>CÓDIGO</span>', sxCodigo, 'Entrar com o código da sala'));
  if (on) busca.appendChild(sxBt('sx-fil sx-gira', SX_GIRA, () => net49Send({type:'list'}), 'Atualizar a lista'));
  corpo.appendChild(busca);
  const cria = nodo('div', 'sx-cria');
  cria.appendChild(sxBt('sx-criar', SX_MAIS + '<span>CRIAR SALA</span>', sxNovaSala));
  if (on) cria.appendChild(sxBt('sx-bt amarelo sx-agora', 'JOGAR AGORA', slJogarAgora, 'Jogar agora: entrar na sala aberta que vai começar'));
  const nota = nodo('p', 'sx-nota');
  if (on) nota.append('Online: chame a galera pelo link. Quem entra fica assistindo e ', nodo('b', null, 'o árbitro monta os times'), '.');
  else nota.append('Sem servidor, as salas ficam ', nodo('b', null, 'neste aparelho'), ' e você completa os times com bots.');
  cria.appendChild(nota);
  corpo.appendChild(cria);
  const tab = nodo('div', 'sx-tab'), cols = nodo('div', 'sx-cols');
  for (const t of ['SALA', 'MODO', 'CAMPO', 'REGIÃO', 'JOGADORES', 'STATUS']) cols.appendChild(nodo('span', null, t));
  tab.append(cols, nodo('div', 'sx-lista'));
  corpo.appendChild(tab);
  sxPintaLista(box);
  const du = NET49.social && NET49.social.duels;        // os duelos 1v1 com os amigos (quando tem)
  if (on && du && du.length){
    const dc = nodo('div', 'sx-duelos'); dc.appendChild(nodo('b', null, 'SEUS DUELOS 1v1'));
    for (const d of du) dc.appendChild(nodo('span', null, d.players.map(p => p && p.name || 'Jogador').join(' × ') + ' · vitórias ' + d.wins.join('–') + ' · ' + d.played + ' jogos'));
    corpo.appendChild(dc);
  }
  return box;
}
function sxPintaLista(box){
  const lista = box.querySelector('.sx-lista'); if (!lista) return;
  lista.textContent = '';
  const on = sxOnline(), q = SX.busca.trim().toLowerCase(), todas = on ? SL.lista || [] : [];
  const L = todas.filter(s => (!q || String(s.name || '').toLowerCase().includes(q) || String(s.code || '').toLowerCase().includes(q))
    && (!SX.semCheias || (s.players | 0) < (s.max | 0)) && (!SX.soEspera || s.state !== 'playing'));
  if (L.length){ for (const s of L) lista.appendChild(sxLinha(s)); return; }
  const v = nodo('div', 'sx-vazio'), ic = nodo('i'); ic.innerHTML = SVG_AMIGOS;
  const carregando = on && !SL.lista, filtrou = todas.length > 0;
  v.append(ic, nodo('b', null, carregando ? 'Carregando as salas…' : filtrou ? 'Nenhuma sala com esse filtro' : 'Nenhuma sala ainda'),
    nodo('p', null, filtrou ? 'Tire um filtro ou procure outro nome.' : 'Crie a sua sala: escolha o modo, o campo e o tempo, e chame os amigos (ou complete com bots).'));
  if (!filtrou && !carregando){
    const lin = nodo('div', 'sx-vazio-bts');
    lin.appendChild(sxBt('sx-criar', SX_MAIS + '<span>CRIAR SALA</span>', sxNovaSala));
    if (!on && !SLOC.on) lin.appendChild(sxBt('sx-bt cinza', 'CONECTAR NO SERVIDOR', sxConectar));
    v.appendChild(lin);
  }
  lista.appendChild(v);
}
function sxSeletor(rot, vals, atual, txt, fn, trava){   // ‹ valor › (as setas trocam; tocar no meio também)
  const w = nodo('div', 'sx-campo-sel'), d = nodo('div', 'sx-sel' + (trava ? ' travado' : ''));
  const i = Math.max(0, vals.indexOf(atual));
  const vai = k => { if (trava) return; fn(vals[(i + k + vals.length) % vals.length]); };
  const meio = sxBt('sx-val', '', () => vai(1), rot + ': ' + txt(atual) + ' (tocar troca)'); meio.textContent = txt(atual);
  if (trava) meio.disabled = true;
  d.append(sxBt('sx-seta', SX_SETA, () => vai(-1), 'Anterior: ' + rot), meio, sxBt('sx-seta dir', SX_SETA, () => vai(1), 'Próximo: ' + rot));
  w.append(nodo('span', 'sx-rot', rot), d);
  return w;
}
function sxForm(){
  const F = SX.form, on = sxOnline();
  if (!on && F.onde === 'online') F.onde = 'aqui';
  const aqui = F.onde === 'aqui';
  const box = nodo('div', 'sx sx-criarform');
  const cab = nodo('header', 'sx-cab'), tit = nodo('h3', 'sx-tit');
  tit.append('CRIAR SALA', nodo('span', 'sx-tag', 'PERSONALIZADA'));
  cab.append(sxBt('sx-volta', SX_SETA, () => { SX.criando = false; amigosRender(); }, 'Voltar para a lista de salas'), tit);
  box.appendChild(cab);
  const corpo = nodo('div', 'sx-form');
  const nome = nodo('input', 'sx-campo'); nome.type = 'text'; nome.maxLength = 24; nome.value = F.nome; nome.placeholder = 'Ex.: Racha do ' + perfil.nome;
  nome.dataset.k = 'sx-nome'; nome.autocomplete = 'off'; nome.spellcheck = false; nome.setAttribute('aria-label', 'Nome da sala');
  nome.addEventListener('input', () => { F.nome = nome.value; });
  nome.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); nome.blur(); } });
  corpo.append(nodo('span', 'sx-rot', 'NOME DA SALA'), nome, nodo('span', 'sx-rot', 'ONDE'));
  const onde = nodo('div', 'sx-onde');
  const op = (k, tt, sub, off) => { const b = sxBt('sx-op' + (F.onde === k ? ' on' : '') + (off ? ' off' : ''), '<b>' + tt + '</b><small>' + sub + '</small>', () => { if (off) return sxConectar(); F.onde = k; amigosRender(); }); b.setAttribute('aria-pressed', String(F.onde === k)); return b; };
  onde.append(op('online', 'ONLINE', on ? 'com a galera, pelo servidor' : 'precisa do servidor', !on), op('aqui', 'NESTE APARELHO', 'você e os bots'));
  corpo.appendChild(onde);
  const rq = nodo('span', 'sx-rot' + (aqui ? ' apagado' : '')); rq.append('QUEM ENTRA ', nodo('small', null, '(só nas salas online)'));
  const quem = nodo('div', 'sx-onde sx-quem' + (aqui ? ' travado' : ''));
  const q2 = (v, tt, sub) => { const b = sxBt('sx-op' + (!aqui && F.pub === v ? ' on' : ''), '<b>' + tt + '</b><small>' + sub + '</small>', () => { if (aqui) return; F.pub = v; amigosRender(); }); b.disabled = aqui; return b; };
  quem.append(q2(true, 'ABERTA', 'aparece na lista'), q2(false, 'FECHADA', 'só entra com o código'));
  corpo.append(rq, quem);
  const g = nodo('div', 'sx-grade2');
  const modos = MD_SALA.map(m => m.id).filter(id => SL_MODO[id]);
  g.append(
    sxSeletor('MODO', modos, F.jogo, v => slModo(v), v => { F.jogo = v; amigosRender(); }),
    sxSeletor('CAMPO', CAMPOS.map((_, i) => i), F.map, v => slCampo(v), v => { F.map = v; amigosRender(); }),
    sxSeletor('TIMES', [1, 2, 3, 4], F.n, v => v + 'v' + v, v => { F.n = v; amigosRender(); }),
    sxSeletor('TEMPO', SL_TEMPOS, F.tempo, v => slTempo(v, F.jogo), v => { F.tempo = v; amigosRender(); }),
    sxSeletor('BOTS', [true, false], aqui ? true : F.bots, v => v ? 'Completam os times' : 'Sem bots', v => { F.bots = v; amigosRender(); }, aqui));
  corpo.appendChild(g);
  const nota = nodo('p', 'sx-nota');
  if (aqui) nota.append(nodo('b', null, 'Você é o árbitro. '), 'Chame bots em CHAMAR BOT e monte os times tocando nos cartões. ' + (NET49.ws ? 'Enquanto a sala estiver aberta, o jogo fica fora do servidor.' : ''));
  else nota.append(nodo('b', null, 'Você é o árbitro principal. '), 'Quem entra fica assistindo até você pôr num time. Deixe o jogo aberto: é o seu celular que roda a partida.');
  corpo.appendChild(nota);
  box.appendChild(corpo);
  const pe = nodo('footer', 'sx-pe');
  pe.append(sxBt('sx-bt cinza sx-cancela', 'CANCELAR', () => { SX.criando = false; amigosRender(); }), sxBt('sx-criar', SX_MAIS + '<span>CRIAR SALA</span>', sxCriar));
  box.appendChild(pe);
  return box;
}
function sxCriar(){
  const F = SX.form, nome = (F.nome || '').trim().slice(0, 24) || 'Racha de ' + perfil.nome;
  if (NET49.room) return x49Toast('Saia da sala em que você está para criar outra.');
  SL.pref = {n:F.n, map:F.map, jogo:F.jogo, tempo:F.tempo, bots:F.onde === 'aqui' ? SL.pref.bots : !!F.bots};
  if (F.onde === 'online') SL.privada = !F.pub;
  slPrefSalva();
  if (F.onde === 'online'){
    if (!sxOnline()) return sxConectar();
    SX.criando = false; SX.criei = true;
    net49Send({type:'create', n:F.n, map:F.map, jogo:F.jogo, tempo:F.tempo, bots:!!F.bots, pub:!!F.pub, name:nome});
    return;
  }
  SX.criando = false;
  slocCria({n:F.n, map:F.map, jogo:F.jogo, tempo:F.tempo, name:nome});
}
amigosRender = function(){                              // GALERA › SALAS: a lista ou o CRIAR SALA
  const box = $('am-corpo'); if (!box) return;
  const rolou = box.querySelector('.sx-form, .sx-corpo2'), rol = rolou ? [rolou.className, rolou.scrollTop] : null;   // (a lista nova do servidor não tira você de onde estava)
  const foco = onFoco(box); box.textContent = ''; onStatus($('am-st'));
  const tela = $('tela-amigos'); if (tela) tela.classList.add('sx-tela');
  if (sxOnline() && !SL.lista && !NET49.room && Date.now() - SX.pediu > 4000){ SX.pediu = Date.now(); net49Send({type:'list'}); }   // (acabou de conectar: pede a lista)
  box.classList.add('sx-corpo');
  box.appendChild(SX.criando && !NET49.room ? sxForm() : sxLista());
  if (rol){ const r2 = box.querySelector('.sx-form, .sx-corpo2'); if (r2 && r2.className === rol[0]) r2.scrollTop = rol[1]; }
  onRefoca(box, foco);
};

/* ---- a sala: a favela no fundo, o apito nos cartões e só o árbitro mexe nos times ---- */
const SALA_FUNDO = {cv:null, k:''};
function salaFundo(){
  const fd = SL.el && SL.el.querySelector('.sl-fundo'); if (!fd || !window.RUA_FAVELA) return;
  if (!SALA_FUNDO.cv){ SALA_FUNDO.cv = document.createElement('canvas'); SALA_FUNDO.cv.className = 'sl-favela'; SALA_FUNDO.cv.setAttribute('aria-hidden', 'true'); fd.appendChild(SALA_FUNDO.cv); }
  const w = fd.clientWidth, h = fd.clientHeight; if (w < 10 || h < 10) return;
  const k = Math.min(2.5, (PALCO.s || 1)*dprL()), key = w + 'x' + h + '@' + k.toFixed(3);
  if (SALA_FUNDO.k === key) return;
  SALA_FUNDO.k = key;
  const c = SALA_FUNDO.cv; c.width = Math.round(w*k); c.height = Math.round(h*k);
  const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0);
  fd.classList.toggle('favela', !!window.RUA_FAVELA(g, w, h));
}
const slRenderAntes68 = slRender;
slRender = function(){
  slRenderAntes68();
  const r = NET49.room, el = SL.el; if (!el || el.hidden || !r) return;
  salaFundo();
  el.classList.toggle('sl-local', !!r.local);
  if (!arbAtivo(r)){ const l0 = el.querySelector('.sl-legenda'); if (l0) l0.hidden = true; return; }
  el.classList.toggle('sl-arbitro', arbEu(r));
  const pr = arbPrincipalId(r);
  for (const card of el.querySelectorAll('.sl-card')){   // o apito nos cartões de quem é árbitro
    const id = card.dataset.id, m = r.members.find(x => x.id === id);
    if (id === pr){ card.classList.add('arb-p'); const s = nodo('span', 'sl-arb p'); s.innerHTML = SX_APITO + '<b>ÁRBITRO</b>'; card.appendChild(s); }
    else if (arbEhAux(id, r)){ card.classList.add('arb-a'); const s = nodo('span', 'sl-arb'); s.innerHTML = SX_APITO + '<b>APITO</b>'; card.appendChild(s); }
    if (m && m.bot){ card.classList.add('bot'); const sm = card.querySelector('.sl-tx small'); if (sm) sm.textContent = 'Bot da sala'; }
  }
  if (r.local){ $('sl-serv').textContent = 'Neste aparelho'; $('sl-sub').textContent = 'Neste aparelho · ' + [slModo(r.jogo), slCampo(r.map), slTempo(r.tempo, r.jogo)].join(' · '); }
  const conv = $('sl-convidar');
  if (conv){ const t = conv.lastChild; if (t && t.nodeType === 3) t.textContent = r.local ? 'Chamar bot' : 'Convidar'; conv.setAttribute('aria-label', r.local ? 'Chamar um bot para a sala' : 'Convidar'); }
  const ini = $('sl-iniciar'), eu = r.members.find(m => m.id === NET49.id);
  if (ini && !slDono(r) && (!eu || eu.slot < 0) && r.state !== 'playing'){
    if (arbEu(r)){ ini.innerHTML = 'Monte os<br>times'; ini.className = 'sl-botao sl-iniciar sl-ol'; }
    else { ini.innerHTML = 'Aguarde o<br>árbitro'; ini.className = 'sl-botao sl-iniciar sl-ol espera'; }
  }
  let leg = el.querySelector('.sl-legenda');
  if (!leg){ leg = nodo('p', 'sl-legenda'); const meio = $('sl-meio'); if (meio) meio.insertAdjacentElement('afterend', leg); }
  leg.hidden = false; leg.textContent = '';
  const nomeDe = id => (r.members.find(x => x.id === id) || {}).name || '—';
  const aux = ARB.code === r.code ? r.members.filter(m => ARB.assist.includes(arbH(m.id)) && m.id !== pr).map(m => m.name) : [];
  const ic = nodo('i'); ic.innerHTML = SX_APITO;
  leg.append(ic, nodo('b', null, 'ÁRBITRO: '), nodePara(nomeDe(pr) + (aux.length ? ' · com o apito: ' + aux.join(', ') : '')),
    nodo('span', 'sl-leg-dica', arbEuPrincipal(r) ? ' · toque num cartão para mexer nos times, dar o apito ou banir' : arbEu(r) ? ' · toque num cartão para mexer nos times' : ' · só o árbitro escolhe os times'));
};
function nodePara(t){ return document.createTextNode(t); }
slClique = function(e){                                 // tocar num cartão, num time ou numa vaga
  const r = NET49.room; if (!r) return;
  if (!arbAtivo(r)) return slCliqueAntes68(e);          // (sala oficial e copa: como antes)
  const card = e.target.closest('.sl-card');
  if (card){
    const m = r.members.find(x => x.id === card.dataset.id); if (!m) return;
    if (arbEu(r)){ som.clique(); arbMenu(m); return; }
    return x49Toast(m.id === NET49.id ? 'Só o árbitro escolhe os times. Peça para ele te colocar.' : arbEhPrincipal(m.id, r) ? m.name + ' é o árbitro da sala.' : arbEhAux(m.id, r) ? m.name + ' tem o apito.' : 'Só o árbitro mexe nos times.');
  }
  const col = e.target.closest('.sl-col'); if (!col) return;
  if (!arbEu(r)) return x49Toast('Só o árbitro escolhe os times. Peça para ele te colocar.');
  if (r.state === 'playing') return x49Toast('A partida está rolando. Espere acabar para mexer nos times.');
  som.clique(); arbEscolhe(+col.dataset.time);
};
function arbEscolhe(t){                                 // o árbitro tocou num time: quem vai para lá?
  const r = NET49.room; if (!r) return;
  const cand = r.members.filter(m => t < 0 ? m.slot >= 0 : m.slot < 0 || Math.floor(m.slot/r.n) !== t);
  const nomeT = t < 0 ? 'OS ESPECTADORES' : t ? 'A EQUIPE AZUL' : 'O TIME VERMELHO';
  const cheio = t >= 0 && !r.roster.slice(t*r.n, t*r.n + r.n).some(x => !x);
  abrePop(c => {
    c.classList.add('sl-pop', 'arb-pop');
    c.append(nodo('span', 'pop-tag', 'ÁRBITRO'), nodo('h2', null, 'QUEM VAI PARA ' + nomeT + '?'));
    const a = nodo('div', 'pop-acoes sl-menu');
    if (cheio) c.appendChild(nodo('p', 'pop-txt', (t ? 'A Equipe Azul' : 'O Time Vermelho') + ' está cheio: tire alguém de lá antes (toque no cartão).'));
    else if (!cand.length) c.appendChild(nodo('p', 'pop-txt', r.local ? 'Ninguém para mandar para lá. Chame um bot em CHAMAR BOT.' : 'Ninguém para mandar para lá agora. Chame a galera em CONVIDAR.'));
    else for (const m of cand) a.appendChild(botaoPop(m.name + (m.id === NET49.id ? ' (você)' : m.bot ? ' (bot)' : ''), t < 0 ? '' : t ? 'azul' : 'vermelho', () => { som.clique(); fechaPop(); arbMover(m.id, t); }));
    a.appendChild(botaoPop('CANCELAR', '', () => { som.clique(); fechaPop(); }));
    c.appendChild(a);
  });
}
function arbMenu(m){                                    // o árbitro tocou no cartão de alguém (ou no seu)
  const r = NET49.room; if (!r) return;
  const pode = r.state !== 'playing', time = m.slot < 0 ? -1 : Math.floor(m.slot/r.n), p = arbEuPrincipal(r), euMesmo = m.id === NET49.id;
  const temVaga = t => r.roster.slice(t*r.n, t*r.n + r.n).some(x => !x);
  abrePop(c => {
    c.classList.add('sl-pop', 'arb-pop');
    const tag = time < 0 ? 'ASSISTINDO' : time ? 'EQUIPE AZUL' : 'TIME VERMELHO';
    c.append(nodo('span', 'pop-tag', tag + (arbEhPrincipal(m.id, r) ? ' · ÁRBITRO' : arbEhAux(m.id, r) ? ' · APITO' : '') + (m.bot ? ' · BOT' : '')),
      nodo('h2', null, String(m.name || 'Jogador').toUpperCase() + (euMesmo ? ' (VOCÊ)' : '')));
    const a = nodo('div', 'pop-acoes sl-menu'), vai = (txt, cls, fn) => a.appendChild(botaoPop(txt, cls, () => { som.clique(); fechaPop(); fn(); }));
    if (pode && time !== 0 && temVaga(0)) vai('TIME VERMELHO', 'vermelho', () => arbMover(m.id, 0));
    if (pode && time !== 1 && temVaga(1)) vai('EQUIPE AZUL', 'azul', () => arbMover(m.id, 1));
    if (pode && time >= 0) vai('ASSISTIR', '', () => arbMover(m.id, -1));
    if (!pode) c.appendChild(nodo('p', 'pop-txt', 'Com a partida rolando, os times ficam como estão.'));
    if (p && !euMesmo && !r.local && !m.bot){
      if (arbEhAux(m.id, r)) vai('TIRAR O APITO', '', () => arbDaApito(m.id, false));
      else vai('DAR O APITO', 'amarelo', () => arbDaApito(m.id, true));
      if (pode) vai('PASSAR O APITO PRINCIPAL', 'amarelo', () => net49Send({type:'promote', id:m.id}));
    }
    if (p && !euMesmo) vai(m.bot ? 'TIRAR O BOT DA SALA' : 'BANIR DA SALA', 'vermelho', () => arbBane(m.id));
    if (!p && !euMesmo && !m.bot) c.appendChild(nodo('p', 'pop-txt', 'Com o apito você monta os times, pausa e encerra a partida. Banir é só com o árbitro principal.'));
    a.appendChild(botaoPop('CANCELAR', '', () => { som.clique(); fechaPop(); }));
    c.appendChild(a);
  });
}
slIniciar = function(){
  const r = NET49.room; if (!r) return;
  const eu = r.members.find(m => m.id === NET49.id);
  if (arbAtivo(r) && !slDono(r) && (!eu || eu.slot < 0) && r.state !== 'playing'){
    som.clique();
    return x49Toast(arbEu(r) ? 'Toque num cartão ou num time para montar os times. Quem começa a partida é o árbitro principal.' : 'Aguarde o árbitro te colocar num time.');
  }
  return slIniciarAntes68();
};
slConvidar = function(){ const r = NET49.room; if (r && r.local){ som.clique(); return slocChamaBot(); } return slConvidarAntes68(); };
slAjustes = function(){                                 // a engrenagem da sala neste aparelho: o nome e os ajustes do jogo
  const r = NET49.room; if (!r || !r.local) return slAjustesAntes68();
  som.clique();
  abrePop(c => {
    c.classList.add('sl-pop');
    c.append(nodo('span', 'pop-tag', 'AJUSTES DA SALA'), nodo('h2', null, 'NESTE APARELHO'));
    const nome = nodo('input', 'on-in'); nome.type = 'text'; nome.maxLength = 24; nome.value = r.name || ''; nome.placeholder = 'Nome da sala'; nome.setAttribute('aria-label', 'Nome da sala');
    c.append(nodo('p', 'pop-txt', 'Nome da sala'), nome);
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('SALVAR', 'verde', () => { som.clique(); net49Send({type:'config', name:nome.value}); fechaPop(); }),
      botaoPop('AJUSTES DO JOGO', 'azul', () => { som.clique(); fechaPop(); syncAjustes(); LB.aj.hidden = false; }),
      botaoPop('FECHAR', '', () => { som.clique(); fechaPop(); }));
    c.appendChild(a);
  });
};
slSair = function(){
  const r = NET49.room; if (!r || !arbAtivo(r)) return slSairAntes68();
  som.clique();
  const p = arbEuPrincipal(r), outros = r.members.filter(m => m.id !== NET49.id && !m.bot);
  const aux = outros.filter(m => ARB.assist.includes(arbH(m.id)));
  const txt = r.local ? 'A sala neste aparelho fecha e os bots vão embora.'
    : p && outros.length ? (aux.length ? 'Você é o árbitro: o apito principal passa para ' + aux[0].name + ', que já tem o apito.' : 'Você é o árbitro: o apito principal vai para alguém sorteado da sala.')
    : outros.length ? 'Dá para voltar depois com o código ' + r.code + '.' : 'Você é o único aqui: a sala fecha.';
  abrePop(c => {
    c.classList.add('sl-pop');
    c.append(nodo('span', 'pop-tag', r.local ? 'NESTE APARELHO' : 'SALA ' + r.code), nodo('h2', null, 'SAIR DA SALA?'), nodo('p', 'pop-txt', txt));
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('FICAR', '', () => { som.clique(); fechaPop(); }), botaoPop('SAIR', 'vermelho', () => { som.clique(); SL.quer = null; net49Send({type:'leave'}); fechaPop(); }));
    c.appendChild(a);
  });
};
for (const [id, antes, agora] of [['sl-voltar', slSairAntes68, () => slSair()], ['sl-eng', slAjustesAntes68, () => slAjustes()],
  ['sl-convidar', slConvidarAntes68, () => slConvidar()], ['sl-iniciar', slIniciarAntes68, () => slIniciar()], ['sl-meio', slCliqueAntes68, e => slClique(e)]]){
  const el = $(id); if (el){ el.removeEventListener('click', antes); el.addEventListener('click', agora); }
}
const abreTelaAntes68 = abreTela;
abreTela = function(id, volta){
  if (id === 'amigos' && lobby.tela !== 'amigos') SX.criando = false;
  const v = abreTelaAntes68(id, volta);
  if (id === 'sala') setTimeout(() => { SALA_FUNDO.k = ''; if (lobby.aberto && lobby.tela === 'sala') slRender(); }, 40);
  return v;
};
window.addEventListener('resize', () => { if (lobby.aberto && lobby.tela === 'sala') setTimeout(salaFundo, 160); });

const x49ModeNameAntes68 = x49ModeName;
x49ModeName = function(){ return NET49.playing && NET49.room && NET49.room.local ? 'SALA NESTE APARELHO' : x49ModeNameAntes68(); };
const pausaRotuloAntes68 = pausaRotulo;
pausaRotulo = function(){ const t = pausaRotuloAntes68(); return NET49.playing && NET49.room && NET49.room.local ? t.replace(' · SALA AQUI', '') : t; };

/* ---- na partida: o menu da pausa ganha os botões do árbitro ---- */
const PA_ARB = nodo('div', 'pa-arb'), PA_ARB_T = nodo('p', 'pa-arb-tit'), PA_ARB_P = novoBotao('pa-bt pa-arb-pausa'), PA_ARB_F = novoBotao('pa-bt pa-arb-fim');
PA_ARB.id = 'pa-arb'; PA_ARB.hidden = true; PA_ARB_P.id = 'pa-arb-pausa'; PA_ARB_F.id = 'pa-arb-fim';
PA_ARB.append(PA_ARB_T, PA_ARB_P, PA_ARB_F);
{ const ac = PAUSA.el && PAUSA.el.querySelector('.pa-acoes'); if (ac) ac.insertAdjacentElement('afterend', PA_ARB); }
const pausaAbreAntes68 = pausaAbre;
pausaAbre = function(){
  pausaAbreAntes68();
  if (!PAUSA.aberta) return;
  const r = NET49.room, mostra = NET49.playing && !!r && arbEu(r) && RQ.on && RQ.estado !== 'fim';
  PA_ARB.hidden = !mostra; PAUSA.confirmaFim = 0;
  if (!mostra) return;
  const p = arbEuPrincipal(r);
  PA_ARB_T.innerHTML = SX_APITO + (p ? 'VOCÊ É O ÁRBITRO' : 'VOCÊ TEM O APITO');
  PA_ARB_P.textContent = ARB.pausado || ARB.pausaVista ? 'VOLTAR O JOGO' : 'PAUSAR PARA TODOS';
  PA_ARB_F.textContent = 'ENCERRAR PARTIDA'; PA_ARB_F.classList.remove('confirma');
  $('pa-nota').textContent = p ? 'A pausa do árbitro vale para todo mundo. Partida encerrada pelo árbitro não vale prêmio.' : 'Com o apito, o pedido vai para o árbitro principal, que executa. Partida encerrada não vale prêmio.';
};
PA_ARB_P.addEventListener('click', () => { som.clique(); const on = !(ARB.pausado || ARB.pausaVista); pausaFecha(); arbPausa(on); });
PA_ARB_F.addEventListener('click', () => {
  const agora = performance.now();
  if (!PAUSA.confirmaFim || agora - PAUSA.confirmaFim > 3200){ PAUSA.confirmaFim = agora; PA_ARB_F.textContent = 'TOQUE DE NOVO: SEM PRÊMIO'; PA_ARB_F.classList.add('confirma'); som.erro(); return; }
  som.clique(); pausaFecha(); arbEncerra();
});
