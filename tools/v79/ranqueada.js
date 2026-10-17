/* ======================================================================================================================
   RACHA rua v79 · SÓ RANQUEADA, NO ESTÁDIO, COM BUSCA ONLINE E OS BOTS DE RESERVA
   O pedido: "a ranqueada pode ser jogada multiplayer; tire o casual, deixe só ranqueada, só no campo; e procura partidas
   online — caso não achar, aí vai contra os bots" (o campo = o Estádio, escolhido na conversa), e do anexo: o mapa Campo
   como o principal e padrão, e sem "Liga Bots" nem "Bot Fácil/Difícil" escrito na partida.
   Qual implementação valia: o JOGAR do lobby chamava jogoRapido() (a CASUAL, jogo-base); o MODO abria a folha do JOGAR na
   CASUAL e a LIGA na RANQUEADA (abreJogar/renderRanqueada, com as abas e os embrulhos da v70, v70.2, v71 e v77); o "BORA
   JOGAR" do fim do tutorial começava uma casual; a "liga contra bots" da v70 (economia.js) dava o nível dos bots pela
   patente; o online é o das salas (net49*, salas_rua.js, v70/online.js) com o servidor da turma (server/turma.js), que
   agora tem a fila da ranqueada (fila, fila_sai, fila_nada; v79).
   O que fica:
   · JOGAR = RANQUEADA: o botão grande procura partida no tamanho escolhido (1v1 a 4v4, no MODO). A folha do JOGAR mostra a
     sua patente, o tamanho do time e o campo (o Estádio, fixo); a CASUAL saiu (a partida livre, com qualquer modo e mapa,
     continua nas SALAS: a sala neste aparelho, com bots, ou a online).
   · A BUSCA: com o servidor da turma, entra na fila e espera até 20 s (com a contagem e o CANCELAR); quem aparece joga junto
     (o servidor monta os times pelos pontos e os bots completam). Sem servidor, sem ninguém ou desistindo de esperar
     (JOGAR CONTRA BOTS AGORA), a partida é contra bots — os pontos valem do mesmo jeito. O JOGAR DE NOVO procura de novo.
   · A PARTIDA ONLINE RANQUEADA: no Estádio, até 3 gols, sem árbitro e sem revanche; o resultado só conta se o servidor
     conferiu (senão: NÃO VALEU, sem pontos). Sair no meio conta como desistência (−25). Os pontos ficam na conta deste
     aparelho (CONTA.rq), como antes: guardar a patente na conta do site é da etapa das contas.
   · NADA DE NÍVEL DOS BOTS NA PARTIDA: a faixa do começo, a apresentação, a pausa, a pílula de baixo e o fim dizem
     RANQUEADA (o desafio dos bots ainda cresce com a patente, sem aparecer).
   · O ESTÁDIO é o mapa padrão (o treino de quem nunca escolheu um campo, as salas de quem nunca criou uma, a ranqueada) e
     as missões do dia que pediam outro mapa ou outro modo viram as que dá para fazer jogando a ranqueada.
   ====================================================================================================================== */
const MAPA_RQ = 4;                                           // o Estádio (CAMPOS[4], o gramado)
const V79R = {busca:null, el:null, intT:0, denovo:0, abandono:null, motivo:''};

/* ---- o Estádio como o mapa padrão; a ranqueada como o único JOGAR ---- */
try { if (typeof V702 !== 'undefined' && Array.isArray(V702.mapas)) V702.mapas.sort((a, b) => (b === MAPA_RQ) - (a === MAPA_RQ)); } catch (_) {}   // v702Mapa(um que saiu) → o Estádio
(function(){
  let salvo = null; try { salvo = localStorage.getItem(CHAVE_CAMPO); } catch (_) {}
  if (!salvo && CAMPO && CAMPO.id !== CAMPOS[MAPA_RQ].id && !RQ.on){        // quem nunca escolheu um campo no treino: o Estádio
    try { aplicaModo(modo, MAPA_RQ); resetAll(); trMonta(); buildStatic(); posVisual(0); updateCamera(0, true); } catch (_) {}
  }
  CONTA.rq.mapa = MAPA_RQ; CONTA.rq.mapaId = CAMPOS[MAPA_RQ].id;
  X49.mode = 'ranked'; X49.map = MAPA_RQ; X49.jogo = 'futebol'; if ([1, 2, 3, 4].indexOf(CONTA.rq.n) >= 0) X49.n = CONTA.rq.n;
  let pref = null; try { pref = JSON.parse(localStorage.getItem('racha-sala-pref') || 'null'); } catch (_) {}
  if (!pref || !Number.isInteger(pref.map)){                  // as salas de quem nunca criou uma: no Estádio
    try { SL.pref.map = MAPA_RQ; SX.form.map = MAPA_RQ; } catch (_) {}
  }
})();

/* ---- os nomes: RANQUEADA (sem "liga contra bots" e sem o nível dos bots) ---- */
const x49ModeNameAntes79 = x49ModeName;
x49ModeName = function(){
  if (NET49.playing && NET49.room && NET49.room.ranked) return V79R.curto ? 'RANQUEADA' : 'RANQUEADA ONLINE';   // (do lado do placar cabe só RANQUEADA)
  if (!NET49.playing && X49.matchMode === 'ranked') return 'RANQUEADA';
  return x49ModeNameAntes79.apply(this, arguments);
};
rqNivelTexto = function(){ return ''; };
rqNivelCurto = function(){ return 'RANQUEADA'; };
rqNivelDesc = function(){ return ''; };
function v79Regras(){
  return 'Vitória: +22 pontos, +3 por gol de diferença (até 3), +4 com 3 vitórias seguidas e +6 contra os bots mais fortes. '
    + 'Derrota: −14 e −2 por gol de diferença (no Bronze, a metade). Sair no meio: −25. Uma derrota pode tirar você da divisão, mas não da patente.';
}
function v79RegrasCurta(){ return 'Primeiro a 3 gols vence · vitória de +25 a +41 pontos · derrota de −16 a −20 (no Bronze, a metade) · sair no meio: −25.'; }
ligaNota = function(){ return v79RegrasCurta(); };
rapidoTexto = function(){ const n = [1, 2, 3, 4].indexOf(CONTA.rq.n) >= 0 ? CONTA.rq.n : 2; return 'RANQUEADA · ' + n + 'v' + n + '\n' + CAMPOS[MAPA_RQ].nome.toUpperCase(); };
const rqComecaAntes79 = rqComeca;
rqComeca = function(n, mapa){                                // a faixa do começo: RANQUEADA (sem FÁCIL nem DIFÍCIL)
  const r = rqComecaAntes79.apply(this, arguments);
  if (!NET49.playing){
    const md = RQ.jogo && RQ.jogo !== 'futebol' ? mdAtual().nome + ' · ' : '';
    rqAvisa(X49.matchMode === 'ranked' ? (V79R.motivo === 'ninguem' ? 'NINGUÉM ONLINE AGORA · RANQUEADA CONTRA BOTS' : 'RANQUEADA CONTRA BOTS') : md + 'CONTRA BOTS', '#ffd23f');
  }
  V79R.motivo = '';
  return r;
};
const rqIntroAntes79 = rqIntro;
rqIntro = function(dt){                                       // a apresentação dos times: embaixo, a meta (sem o nível dos bots)
  const r = rqIntroAntes79.apply(this, arguments);
  try { if (VS.nivel && /^(FÁCIL|DIFÍCIL)\b/.test(VS.nivel.textContent)) VS.nivel.textContent = VS.nivel.textContent.replace(/^(FÁCIL|DIFÍCIL)/, X49.matchMode === 'ranked' ? 'RANQUEADA' : 'CONTRA BOTS'); } catch (_) {}
  return r;
};
tuBotsNaApresentacao = function(){                            // (v70) os bots na apresentação: BOT e o estilo, sem o nível
  if (NET49.playing || !VS.v) return;
  for (const [ul, t] of [[VS.v, 0], [VS.a, 1]]){
    const bots = RQ.jog.filter(o => o.time === t);
    Array.from(ul.children).forEach((li, i) => {
      const q = bots[i]; if (!q || q.humano) return;
      const s = li.querySelector('small'), ins = li.querySelector('.vs-ins');
      if (s) s.textContent = 'BOT' + (q.hm && q.hm.estilo ? ' · ' + q.hm.estilo.nome.toUpperCase() : '');
      if (ins){ ins.textContent = 'BOT'; ins.classList.add('vs-bot'); }
    });
  }
};
b78NaApresentacao = function(){                               // (v78) o jeito de cada bot, sem o nível
  if (NET49.playing || !VS.v || !B78.times[0]) return;
  for (const [ul, t] of [[VS.v, 0], [VS.a, 1]]){
    const mem = RQ.jog.filter(o => o.time === t);
    Array.from(ul.children).forEach((li, i) => {
      const q = mem[i]; if (!q || q.humano || !q.b78) return;
      const s = li.querySelector('small');
      if (s){ s.textContent = 'BOT · ' + q.b78.J.nome.toUpperCase() + (q === B78.times[t].gk ? ' (GOLEIRO)' : ''); s.title = q.b78.J.frase; }
      li.title = q.nome + ' · ' + q.b78.J.nome + ': ' + q.b78.J.frase;
    });
  }
};
rqInfoPilula = function(){                                    // embaixo, no lugar dos seletores do treino (na partida online, o lugar é do chat)
  if (NET49.playing) return;
  const s = x49ModeName() + (RQ.jogo && RQ.jogo !== 'futebol' ? ' · ' + mdAtual().nome : '') + ' · ' + RQ.n + 'v' + RQ.n + ' · ' + CAMPOS[RQ.mapa].nome.toUpperCase() + ' · CONTRA BOTS';
  const g = ctx, w = medeTxt(s, '24px ' + FONT) + 48, x0 = W/2 - w/2;
  g.save(); g.translate(x0, 818);
  pintaHud(g, sprHud('info|' + s, escHud(1), 4, 4, w + 4, 48, h => { h.translate(-x0, -818); rr(h, x0, 818, w, 44, 22); h.fillStyle = 'rgba(8,10,28,.72)'; h.fill(); h.lineWidth = 2; h.strokeStyle = 'rgba(255,255,255,.18)'; h.stroke(); txt(h, s, W/2, 841, 24, '#fff', 'rgba(5,10,25,.9)', 4); }));
  g.restore();
};
const rqPlacar70Antes79 = rqPlacar70;
rqPlacar70 = function(){ V79R.curto = true; try { return rqPlacar70Antes79.apply(this, arguments); } finally { V79R.curto = false; } };
const pausaRotuloAntes79 = pausaRotulo;
pausaRotulo = function(){
  const t = String(pausaRotuloAntes79.apply(this, arguments));
  if (NET49.playing && NET49.room && NET49.room.ranked) return t.replace(/ · SALA [A-Z0-9-]+$/, '');
  return t.replace(/ · BOTS (FÁCIL|DIFÍCIL)$/, ' · CONTRA BOTS');
};
const rqMostraFimAntes79 = rqMostraFim;
rqMostraFim = function(){
  const r = rqMostraFimAntes79.apply(this, arguments);
  try { if (RQ.resultado && !NET49.playing){ const f = fimEl('fim-info'); if (f) f.textContent = f.textContent.replace(/ · bots (fácil|difícil)$/i, ' · contra bots'); } } catch (_) {}
  return r;
};
const x49GameUIAntes79 = x49GameUI;
x49GameUI = function(){                                       // a barrinha da partida online: RANQUEADA ONLINE (sem código de sala nem árbitro) e o MENU
  const r = x49GameUIAntes79.apply(this, arguments);
  try {
    const sala = NET49.room, bt = X49UI.onlinebar && X49UI.onlinebar.querySelector('button');
    if (NET49.playing && sala && sala.ranked && X49UI.netText){
      const t = NET49.paused ? 'RANQUEADA ONLINE · esperando quem roda a partida' : 'RANQUEADA ONLINE' + (NET49.host ? ' · você roda a partida' : ' · ' + Math.round(NET49.ping) + ' ms');
      if (X49UI.netText.textContent !== t) X49UI.netText.textContent = t;
      if (bt && bt.textContent !== 'MENU') bt.textContent = 'MENU';
    } else if (bt && bt.textContent === 'MENU') bt.textContent = 'SALA';
  } catch (_) {}
  return r;
};
const arbEuAntes79 = arbEu, arbEuPrincipalAntes79 = arbEuPrincipal;   // na ranqueada não tem árbitro (ninguém pausa para todos nem encerra)
arbEu = function(r){ const x = r || NET49.room; return x && x.ranked ? false : arbEuAntes79.apply(this, arguments); };
arbEuPrincipal = function(r){ const x = r || NET49.room; return x && x.ranked ? false : arbEuPrincipalAntes79.apply(this, arguments); };

/* ---- a folha do JOGAR: só a ranqueada (a patente, o tamanho do time e o campo) ---- */
const abreJogarAntes79 = abreJogar;
abreJogar = function(){ return abreJogarAntes79.call(this, 'ranked'); };
const renderRanqueadaAntes79 = renderRanqueada;
renderRanqueada = function(){
  JG.aba = 'ranked'; RQP.mapa = MAPA_RQ; RQP.jogo = 'futebol';
  if (RQP.raiz && !RQP.raiz.hidden && [1, 2, 3, 4].indexOf(RQP.n) >= 0 && RQP.n !== CONTA.rq.n){   // trocou o tamanho do time na folha: vale na hora (o lobby mostra)
    CONTA.rq.n = RQP.n; X49.n = RQP.n; contaSalvar(); x49Save(); try { lbRender(); } catch (_) {}
  }
  const r = renderRanqueadaAntes79.apply(this, arguments);
  try { v79Folha(); } catch (e) { window.RUA_RQ79_ERRO = String(e && e.stack); }
  return r;
};
function v79Folha(){
  const R = RQP, raiz = R.raiz; if (!raiz) return;
  const cx = raiz.querySelector('.rq-caixa'); if (cx) cx.classList.add('v79-so-rq');
  if (R.abas) R.abas.hidden = true;
  if (R.cabCas) R.cabCas.hidden = true;
  if (R.cabRq) R.cabRq.hidden = false;
  const tit = R.cabRq && R.cabRq.querySelector('.rq-tit');
  if (tit){ if (tit.firstChild && tit.firstChild.nodeType === 3) tit.firstChild.textContent = 'RANQUEADA'; const em = tit.querySelector('em'); if (em) em.textContent = 'ONLINE + BOTS'; }
  if (R.cabRq && !R.cabRq.querySelector('.v79-ver-pat')){
    const b = novoBotao('v79-ver-pat', 'Ver as patentes'); b.textContent = 'VER PATENTES';
    b.addEventListener('click', () => { som.clique(); v79PatentesAbre(); });
    R.cabRq.appendChild(b);
  }
  for (const b of R.mapas.children){ const on = +b.dataset.m === MAPA_RQ; b.hidden = !on; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
  const linhas = raiz.querySelector('.rq-linhas');
  if (linhas){
    for (const h of linhas.querySelectorAll('h3.rq-sub')){
      const t = h.textContent.trim();
      if (t === 'MAPA') h.textContent = 'CAMPO';
      if (t === 'BOTS'){ h.hidden = true; const nx = h.nextElementSibling; if (nx && !nx.classList.contains('v79-como')) nx.hidden = true; }
    }
    let como = linhas.querySelector('.v79-como');
    if (!como){ como = nodo('p', 'v79-como'); linhas.appendChild(como); }
    como.textContent = '';
    como.append(nodo('b', null, 'COMO É: '), 'procuramos jogadores online do seu tamanho de time (até 20 s). Quem aparecer joga com você e os bots completam o que faltar; ninguém aparecendo, a partida é contra bots. Os pontos valem igual.');
  }
  const bots = typeof ECO !== 'undefined' && ECO.bots; if (bots && bots.box) bots.box.hidden = true;
  if (R.nota) R.nota.textContent = v79RegrasCurta();
  if (R.buscar) R.buscar.textContent = 'JOGAR RANQUEADA';
}
jogarFolha = function(){ if (!lobby.aberto) return; v79Jogar(RQP.n); };
jogarRanqueada = function(){ v79Jogar(RQP.n || CONTA.rq.n); };
jogoRapido = function(){ v79Jogar(CONTA.rq.n); };             // (o JOGAR do lobby e o "BORA JOGAR")

/* ---- o lobby: o MODO diz RANQUEADA · ESTÁDIO; a sua patente (em cima) abre as PATENTES ---- */
function v79LbSync(){
  try {
    const n = [1, 2, 3, 4].indexOf(CONTA.rq.n) >= 0 ? CONTA.rq.n : 2; X49.n = n;
    const nm = LB.modo && LB.modo.querySelector('.v77-modo-nm'), b = LB.modo && LB.modo.querySelector('.v71-modo-tx b');
    const sub = 'RANQUEADA · ' + CAMPOS[MAPA_RQ].nome.toUpperCase();
    if (nm && nm.textContent !== sub) nm.textContent = sub;
    if (b && b.textContent !== n + ' VS ' + n) b.textContent = n + ' VS ' + n;
    if (LB.modo) LB.modo.setAttribute('aria-label', 'Trocar o tamanho do time da ranqueada (agora: ' + n + ' contra ' + n + ', no ' + CAMPOS[MAPA_RQ].nome + ')');
    if (LB.jogar) LB.jogar.setAttribute('aria-label', 'Jogar a ranqueada: ' + n + ' contra ' + n + ', no ' + CAMPOS[MAPA_RQ].nome);
    if (LB.rapidoSub){ const t = rapidoTexto(); if (LB.rapidoSub.textContent !== t) LB.rapidoSub.textContent = t; }
    const liga = document.querySelector('#lb .v71-liga') || document.querySelector('#lb [data-rx="ranqueada"]'), e = rqElo(CONTA.rq.pts);
    if (liga){
      const t = liga.querySelector(':scope > b'); if (t && t.textContent !== 'RANQUEADA') t.textContent = 'RANQUEADA';
      liga.setAttribute('aria-label', 'Sua patente: ' + e.nome + ' (' + fmtNum(CONTA.rq.pts | 0) + ' pontos) · ver as patentes');
    }
  } catch (_) {}
}
const v77LbSyncAntes79 = v77LbSync;
v77LbSync = function(){ const r = v77LbSyncAntes79.apply(this, arguments); v79LbSync(); return r; };
document.addEventListener('click', e => {                     // a sua patente (em cima, do lado do seu cartão) abre as PATENTES
  const b = e.target.closest && e.target.closest('#lb [data-rx="ranqueada"]'); if (!b) return;
  e.preventDefault(); e.stopPropagation(); som.clique(); v79PatentesAbre();
}, true);
try {                                                        // os textos que falavam da "liga contra bots"
  const emb = document.querySelector('#tela-perfil .e-rq small'); if (emb) emb.textContent = 'RANQUEADA';
  const l = EST_CTX.find(x => x[0] === 'liga'); if (l) l[1] = 'RANQUEADA';
  PX_CTX_NOME.liga = 'ranqueada';
  MI.liga.txt = () => 'Conclua 1 partida ranqueada';
} catch (_) {}

/* ---- as missões do dia: as que pediam outro mapa ou outro modo viram as da ranqueada ---- */
const ecoMissoesAntes79 = ecoMissoes;
ecoMissoes = function(){
  const M = ecoMissoesAntes79.apply(this, arguments);
  let mudou = false;
  for (const x of M.l){
    if (x.ok) continue;
    if (x.id === 'mapa' && x.arg !== MAPA_RQ){ x.arg = MAPA_RQ; x.p = 0; mudou = true; }
    else if (x.id === 'modo'){ x.id = 'treino'; x.alvo = MI.treino.alvo[0]; x.arg = null; x.p = 0; mudou = true; }
  }
  if (mudou) try { contaSalvar(); } catch (_) {}
  return M;
};
const ecoPartidaFimAntes79 = ecoPartidaFim;
ecoPartidaFim = function(R, ctx, info){                       // a ranqueada online também conta na missão da ranqueada
  const r = ecoPartidaFimAntes79.apply(this, arguments);
  try { if (!info.abandono && ctx === 'online' && NET49.room && NET49.room.ranked) ecoMissao('liga', 1); } catch (_) {}
  return r;
};

/* ---- a BUSCA ---- */
function v79OnlinePode(){ try { return !window.RACHA_SEM_REDE && !(typeof SLOC !== 'undefined' && SLOC.on) && !!servidorEndereco(); } catch (_) { return false; } }
function v79Jogar(n){
  if (!lobby.aberto || V79R.busca) return;
  if (NET49.playing) return x49Toast('Saia da partida antes.');
  if (NET49.room){ x49Toast('Você está numa sala: saia dela para jogar a ranqueada.'); abreTela('sala'); return; }
  n = [1, 2, 3, 4].indexOf(+n) >= 0 ? +n : [1, 2, 3, 4].indexOf(CONTA.rq.n) >= 0 ? CONTA.rq.n : 2;
  CONTA.rq.n = n; CONTA.rq.mapa = MAPA_RQ; CONTA.rq.mapaId = CAMPOS[MAPA_RQ].id; contaSalvar();
  X49.mode = 'ranked'; X49.n = n; X49.map = MAPA_RQ; X49.jogo = 'futebol'; x49Save();
  try { confirmaNome(); confirmaBio(); } catch (_) {}
  fechaRanqueada(); v79PatentesFecha(); if (!LB.pop.hidden){ LB.pop.hidden = true; filaPop.length = 0; }
  if (lobby.tela){ TELAS[lobby.tela].el.hidden = true; lobby.tela = null; lbMarcaTela(); }
  v79BuscaAbre(n);
}
function v79BuscaMonta(){
  if (V79R.el) return V79R.el;
  const raiz = nodo('div', 'lb-folha v79-busca-folha'); raiz.id = 'v79-busca'; raiz.hidden = true;
  raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-label', 'Procurando partida ranqueada');
  const cx = nodo('div', 'folha v79-busca');
  const ins = nodo('i', 'v79-busca-ins'), tag = nodo('p', 'v79-busca-tag'), tit = nodo('h2', 'v79-busca-tit', 'PROCURANDO PARTIDA');
  const gira = nodo('span', 'v79-busca-gira'); gira.setAttribute('aria-hidden', 'true');
  const tempo = nodo('b', 'v79-busca-tempo', '0:00'), st = nodo('p', 'v79-busca-st'); st.setAttribute('aria-live', 'polite');
  const bts = nodo('div', 'v79-busca-bts');
  const cancela = novoBotao('lb-btn v79-busca-cancela', 'Cancelar a busca'); cancela.textContent = 'CANCELAR';
  const bots = novoBotao('lb-btn verde v79-busca-bots', 'Jogar contra bots agora'); bots.textContent = 'JOGAR CONTRA BOTS AGORA';
  cancela.addEventListener('click', () => { som.clique(); v79BuscaCancela(); });
  bots.addEventListener('click', () => { som.clique(); v79Bots('escolheu'); });
  bts.append(cancela, bots);
  cx.append(ins, tag, tit, gira, tempo, st, bts);
  raiz.appendChild(cx);
  raiz.addEventListener('keydown', ev => { if (ev.key === 'Escape'){ ev.stopPropagation(); v79BuscaCancela(); } });
  ((RQP.raiz && RQP.raiz.parentNode) || LB.camada || LB.raiz || document.body).appendChild(raiz);   // (na camada das janelas, com a escala delas)
  V79R.el = raiz;
  return raiz;
}
function v79BuscaAbre(n){
  const el = v79BuscaMonta(), online = v79OnlinePode(), agora = performance.now(), e = rqElo(CONTA.rq.pts);
  V79R.busca = {n, t0:agora, online, fase:online ? 'conectando' : 'sem', ate:agora + (online ? 25000 : 1600), espera:20000, gente:0};
  el.querySelector('.v79-busca-ins').innerHTML = rqInsignia(e);
  el.querySelector('.v79-busca-tag').textContent = 'RANQUEADA · ' + n + ' VS ' + n + ' · ' + CAMPOS[MAPA_RQ].nome.toUpperCase() + ' · ' + e.nome;
  el.hidden = false;
  clearInterval(V79R.intT); V79R.intT = setInterval(v79BuscaTique, 250);
  if (online){
    if (NET49.id && NET49.ws && NET49.ws.readyState === 1) v79Fila();
    else if (!NET49.ws){ net49Connect(); if (NET49.ws){ clearTimeout(X49.toastTimer); X49UI.toast.textContent = ''; } }   // (a busca já diz "Conectando…")
    if (!NET49.ws) return v79Bots('sem_servidor');            // (não deu nem para começar a conectar)
  }
  v79BuscaPinta();
  try { el.querySelector('.v79-busca-cancela').focus({preventScroll:true}); } catch (_) {}
}
function v79Fila(){
  const B = V79R.busca; if (!B || B.fase === 'achou' || B.fase === 'bots') return;
  B.fase = 'fila'; net49Send({type:'fila', n:B.n, pts:CONTA.rq.pts | 0}); v79BuscaPinta();
}
function v79BuscaTique(){
  const B = V79R.busca; if (!B){ clearInterval(V79R.intT); V79R.intT = 0; return; }
  if (!lobby.aberto){ v79BuscaCancela(); return; }             // (o lobby fechou por outro caminho — o tutorial, um convite —: a busca para)
  const agora = performance.now(), caiu = !NET49.ws || NET49.ws.readyState > 1;
  if ((B.fase === 'conectando' || B.fase === 'fila') && caiu){ v79Bots(B.fase === 'fila' ? 'caiu' : 'sem_servidor'); return; }
  if ((B.fase === 'sem' || B.fase === 'conectando' || B.fase === 'fila') && agora > B.ate){ v79Bots(B.fase === 'fila' ? 'ninguem' : 'sem_servidor'); return; }
  v79BuscaPinta();
}
function v79BuscaPinta(){
  const B = V79R.busca, el = V79R.el; if (!B || !el) return;
  const s = Math.floor((performance.now() - B.t0)/1000);
  el.querySelector('.v79-busca-tempo').textContent = Math.floor(s/60) + ':' + String(s % 60).padStart(2, '0');
  const st = el.querySelector('.v79-busca-st'), resta = Math.max(0, Math.ceil((B.t0 + B.espera - performance.now())/1000));
  const tx = B.fase === 'sem' ? (window.RACHA_SEM_REDE ? 'Esta versão não tem o servidor das partidas online: a partida é contra bots.' : 'Sem servidor online aqui: a partida é contra bots.')
    : B.fase === 'conectando' ? 'Conectando ao servidor…'
    : B.fase === 'fila' ? 'Procurando jogadores do seu tamanho de time' + (B.gente > 1 ? ' (' + B.gente + ' pessoas no servidor)' : '') + '. Se ninguém aparecer em ' + resta + ' s, você joga contra bots.'
    : B.fase === 'achou' ? 'Racha encontrado!' : 'Partida contra bots.';
  if (st.textContent !== tx) st.textContent = tx;
  el.classList.toggle('achou', B.fase === 'achou');
  const t = B.fase === 'achou' ? 'RACHA ENCONTRADO' : B.fase === 'sem' || B.fase === 'bots' ? 'CONTRA BOTS' : 'PROCURANDO PARTIDA';
  const h = el.querySelector('.v79-busca-tit'); if (h.textContent !== t) h.textContent = t;
}
function v79BuscaFecha(){
  clearInterval(V79R.intT); V79R.intT = 0;
  V79R.busca = null; if (V79R.el) V79R.el.hidden = true;
}
function v79BuscaCancela(){
  const B = V79R.busca; if (!B) return;
  if (B.fase === 'fila') net49Send({type:'fila_sai'});
  v79BuscaFecha();
  try { LB.jogar.focus({preventScroll:true}); } catch (_) {}
}
function v79Bots(motivo){                                     // ninguém (ou sem servidor, ou você escolheu): a ranqueada contra os bots
  const B = V79R.busca; if (!B) return;
  if (B.fase === 'fila') net49Send({type:'fila_sai'});
  const n = B.n;
  v79BuscaFecha();
  V79R.motivo = motivo === 'ninguem' ? 'ninguem' : '';
  X49.mode = 'ranked'; x49Save();
  x49Start(n, MAPA_RQ);
}

/* ---- o servidor: a fila, a partida encontrada, o fim, quem sai ---- */
const net49MessageAntes79 = net49Message;
net49Message = function(m){
  if (!m) return;
  const B = V79R.busca, salaAntes = NET49.room;
  if (m.type === 'fila'){ if (B && m.on){ B.espera = (m.espera | 0) || 20000; B.ate = B.t0 + B.espera + 4000; B.gente = m.online | 0; v79BuscaPinta(); } return; }
  if (m.type === 'fila_nada'){ if (B) v79Bots('ninguem'); return; }
  if (m.type === 'error' && m.codigo === 'fila_sala'){ if (B) v79BuscaFecha(); x49Toast(m.message); return; }
  if (m.type === 'start' && m.room && m.room.ranked && B){ B.fase = 'achou'; v79BuscaPinta(); v79BuscaFecha(); }
  if (m.type === 'interrupted' && salaAntes && salaAntes.ranked){                       // quem rodava a partida saiu ou caiu
    const r = net49MessageAntes79.apply(this, arguments);
    net49Send({type:'leave'});
    setTimeout(() => {
      abrePop(c => {
        c.append(nodo('span', 'pop-tag', 'RANQUEADA ONLINE'), nodo('h2', null, 'A PARTIDA PAROU'),
          nodo('p', 'pop-txt', 'Quem rodava a partida saiu ou caiu. Ninguém ganhou nem perdeu pontos.'));
        const a = nodo('div', 'pop-acoes'); a.append(botaoPop('JOGAR DE NOVO', 'verde', () => { som.clique(); fechaPop(); v79Jogar(CONTA.rq.n); }), botaoPop('OK', '', () => { som.clique(); fechaPop(); })); c.appendChild(a);
      });
    }, 120);
    return r;
  }
  const r = net49MessageAntes79.apply(this, arguments);
  if (m.type === 'hello' && V79R.busca){ clearTimeout(X49.toastTimer); X49UI.toast.textContent = ''; if (V79R.busca.fase === 'conectando') setTimeout(v79Fila, 0); }   // (sem o "Conectado. Crie ou entre em uma sala.")
  if (m.type === 'left' && salaAntes && salaAntes.ranked){
    if (lobby.aberto && lobby.tela){ TELAS[lobby.tela].el.hidden = true; lobby.tela = null; lbMarcaTela(); }
    const n = V79R.denovo; V79R.denovo = 0;
    if (n) setTimeout(() => v79Jogar(n), 60);
  }
  return r;
};
const slEntrouAntes79 = slEntrou;
slEntrou = function(){                                         // a sala da ranqueada não abre a tela da sala (a partida já vem)
  if (NET49.room && NET49.room.ranked){ SL.naoLidas = 0; SL.vistos = new Set(NET49.room.members.map(m => m.id)); return; }
  return slEntrouAntes79.apply(this, arguments);
};
const net49BeginAntes79 = net49Begin;
net49Begin = function(room){
  const ranked = !!(room && room.ranked);
  if (ranked) v79BuscaFecha();
  const r = net49BeginAntes79.apply(this, arguments);
  if (ranked && NET49.playing){
    X49.matchMode = 'ranked'; V79R.abandono = null;
    const gente = room.roster.filter(Boolean).length, bots = 2*room.n - gente;
    rqAvisa('RANQUEADA ONLINE' + (bots ? ' · ' + gente + (gente === 1 ? ' PESSOA E ' : ' PESSOAS E ') + bots + (bots === 1 ? ' BOT' : ' BOTS') : ''), '#ffd23f');
  }
  return r;
};
const net49ResultAntes79 = net49Result;
net49Result = function(m){
  const room = NET49.room, ranked = !!(room && room.ranked), antes = RQ.resultado;
  const v = net49ResultAntes79.apply(this, arguments);
  try {
    if (ranked && NET49.localSlot >= 0 && RQ.resultado && RQ.resultado !== antes){
      const R = RQ.resultado, vale = !!m && m.valida !== false && !R.invalida && !R.encerrada;
      if (vale && !R.pr){ R.nivel = 'online'; R.pr = rqPontua(R); }
      rqPintaPontos(vale ? R.pr : null);
      const gente = room.roster.filter(Boolean).length, bots = 2*room.n - gente, info = fimEl('fim-info');
      if (info) info.textContent = vale
        ? 'RANQUEADA ONLINE · ' + room.n + 'v' + room.n + ' · ' + CAMPOS[room.map].nome + (bots ? ' · ' + gente + (gente === 1 ? ' pessoa e ' : ' pessoas e ') + bots + (bots === 1 ? ' bot' : ' bots') : ' · só gente')
        : 'RANQUEADA ONLINE · o servidor não validou o resultado (' + String(m && m.motivo || 'resultado impossível') + ') · sem pontos';
      fimEl('fim-denovo').textContent = 'JOGAR DE NOVO';
      if (R.pr && R.pr.subiu) som.nivel();
    }
  } catch (e) { window.RUA_RQ79_ERRO = String(e && e.stack); }
  return v;
};
const net49SendAntes79 = net49Send;
net49Send = function(m){                                         // saiu no meio da ranqueada online: desistência (−25), uma vez
  try {
    const r = NET49.room;
    if (m && m.type === 'leave' && r && r.ranked && NET49.playing && RQ.on && RQ.estado !== 'fim' && NET49.localSlot >= 0 && !V79R.abandono){
      V79R.abandono = rqPontua({abandono:true, placar:RQ.placar.slice(), venceu:false, n:RQ.n});
      const d = V79R.abandono.delta;
      setTimeout(() => aviso('Você desistiu da ranqueada: ' + (d < 0 ? '−' + Math.abs(d) : '0') + ' pontos'), 400);
    }
  } catch (_) {}
  return net49SendAntes79.apply(this, arguments);
};
const salaJogoRenderAntes79 = salaJogoRender;
salaJogoRender = function(){                                     // a sala por cima da partida, na ranqueada: sem código; SAIR = DESISTIR
  const v = salaJogoRenderAntes79.apply(this, arguments);
  try {
    const r = NET49.room, c = SJ.caixa; if (!r || !r.ranked || !c || !c.firstChild) return v;
    const tag = c.querySelector('.sj-tag'); if (tag) tag.textContent = 'RANQUEADA ONLINE';
    const cod = c.querySelector('.sj-cod'); if (cod){ cod.textContent = rqElo(CONTA.rq.pts).nome; cod.classList.add('sj-nome'); }
    for (const b of c.querySelectorAll('.sj-acoes button')){
      if (/CÓDIGO/.test(b.textContent)) b.hidden = true;
      if (/SAIR DA SALA/.test(b.textContent) && RQ.on && RQ.estado !== 'fim' && NET49.localSlot >= 0) b.textContent = 'DESISTIR (−25 PONTOS)';
    }
  } catch (_) {}
  return v;
};
document.addEventListener('click', e => {                         // o fim da ranqueada (online: JOGAR DE NOVO procura outra; LOBBY sai da sala)
  const de = e.target.closest && e.target.closest('#fim-denovo'), lo = e.target.closest && e.target.closest('#fim-lobby');
  if (!de && !lo) return;
  const r = NET49.room;
  if (r && r.ranked && NET49.playing){
    e.preventDefault(); e.stopPropagation(); som.clique();
    if (de) V79R.denovo = r.n || CONTA.rq.n;
    net49Send({type:'leave'});
    return;
  }
  if (de && RQ.on && !NET49.playing && X49.matchMode === 'ranked' && RQ.estado === 'fim' && v79OnlinePode()){   // contra os bots, com servidor: procura gente de novo
    e.preventDefault(); e.stopPropagation(); som.clique();
    const n = RQ.n; abrirLobby(); v79Jogar(n);
  }
}, true);
document.addEventListener('click', e => {                         // o fim do tutorial: a primeira partida é a ranqueada (com a busca)
  const b = e.target.closest && e.target.closest('#trf-prox'); if (!b || TR.id !== 'tut') return;
  e.preventDefault(); e.stopPropagation(); som.clique(); trUiFecha();
  TU.onb = false; tuSai(); X49.mode = 'ranked'; x49Save();
  abrirLobby(); v79Jogar(CONTA.rq.n);
}, true);
try {                                                             // as camadas da v70 (o foco, o Tab, o fundo inerte e o Esc): as PATENTES e a BUSCA por cima do JOGAR
  const i = V70C_LISTA.findIndex(d => d.q === '#lb-rq');
  if (i >= 0) V70C_LISTA.splice(i, 0, {q:'#v79-pat', fecha:() => { som.clique(); v79PatentesFecha(); }, modal:true}, {q:'#v79-busca', fecha:() => { som.clique(); v79BuscaCancela(); }, modal:true});
} catch (_) {}
window.RachaRanqueada79 = {jogar:n => v79Jogar(n), busca:() => V79R.busca ? Object.assign({}, V79R.busca) : null, mapa:MAPA_RQ, regras:v79Regras};
