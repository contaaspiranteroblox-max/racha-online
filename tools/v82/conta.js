/* ==================================================================================================================
   RACHA rua v82 · AS CONTAS (entra no fim do script, depois da v81; o começo — cada conta com o seu progresso no aparelho
   e a cópia da conta antes do jogo ler — está em tools/v82/inicio.js, que o build põe antes do script do jogo)
   O que a conta passa a ter (com a plataforma RACHA 2.0; sem ela, o jogo é o de sempre, de quem joga sem conta):
   · A PATENTE DA RANQUEADA NA CONTA: o servidor da plataforma faz a conta dos pontos de cada ranqueada (as mesmas regras
     do jogo: app/contracts/patentes.ts) e guarda; o jogo mostra a conta na hora (rqPontua, como sempre) e acerta pelo que
     o servidor devolveu (a tela do fim e a cópia daqui). Online, só vale com o selo do servidor das salas; contra os bots,
     com um teto de pontos por dia; desistir tira 25. O ranking das patentes de todos: RANKING › PATENTES.
   · UMA CURVA SÓ DE NÍVEL: logado, o nível e o XP que aparecem (lobby, perfil, metas) são os da conta (nivelInfo); cada
     nível novo da conta dá as mesmas moedas e gemas de antes (PREMIO.nivel). O XP do aparelho (missões, prêmios) não
     aparece com a conta: quem dá XP da conta é o servidor (partidas e gols de treino).
   · O PROGRESSO NA CONTA: a cópia das chaves de progresso vai para a conta (salva sozinha, alguns segundos depois de cada
     mudança, no fim da partida e ao fechar) e volta em outro aparelho; se os dois mudaram, o jogo pergunta qual fica. Na
     primeira vez de uma conta, o progresso de quem jogava sem conta neste aparelho pode ir para ela (a patente, até Prata I).
   · ENTRAR e CRIAR CONTA de dentro do jogo: Ajustes › Conta, o "NESTE APARELHO" do perfil e o RANKING › PATENTES (abrem a
     página da plataforma; fora dela, o jogo explica onde fica a conta).
   Qual implementação valia (o mapa das redefinições): o nível vinha do nivelInfo do jogo-base (a curva do aparelho, 1–999)
   usado pelo lobby (v77LbSync), pelo perfil (v78PfNivel, o pxMeta da v70) e pelo ganha(); a patente, do CONTA.rq com o
   rqPontua (jogo-base + o empate da v80) e o rqElo da v79; o fim da partida, do rqMostraFim (v70…v80) com o rqPintaPontos e
   o premioNos; os eventos para a plataforma, do v70EvInicio/v70EvFim (tools/v70/online.js) e do racha-bridge.js; a conta,
   do tpePlataforma().conta() (editor_rua.js; pxConta, v70ContaLogada); o RANKING era só a liga da semana contra bots.
   ================================================================================================================== */
const R82 = window.RACHA82 || {chaves:[], dono:'', meta:null};
const C82 = {conta:null, pendente:0, esperaRq:false, evRq:false, evTam:0, ultimoRes:null, fim:null, estado:'', erro:'', enviando:false, bloqueio:false, envT:0, mudouEm:0,
  ultimoHash:'', pops:[], popAberto:false, recarrega:false, aparelho:'', rk:{aba:'', dados:null, t:0, erro:'', carregando:false}, cardEl:null};
const C82_ROTA = {entrar:'/entrar', criar:'/entrar?aba=criar'};

/* ---------------------------------------------------------------- 1) a conta (da plataforma v82; o resto é o de sempre) */
function c82Pl(){ try { const p = window.parent && window.parent !== window ? window.parent.RACHA_JOGO : null; return p && (p.versao | 0) >= 82 ? p : null; } catch (_) { return null; } }
function c82ContaAgora(){ const pl = c82Pl(); try { const c = pl && pl.conta(); return c && c.idPublico && Number.isFinite(c.xp) ? c : null; } catch (_) { return null; } }
function c82Logado(){ return !!C82.conta; }
function c82SemXpLocal(){ return !!C82.conta; }          // (o XP do aparelho some dos prêmios: quem dá XP com a conta é o servidor)
function c82TemSite(){ try { return window.parent && window.parent !== window && typeof window.parent.RACHA_ABRIR === 'function'; } catch (_) { return false; } }
try { C82.aparelho = localStorage.getItem('racha-aparelho') || ''; if (!/^[a-z0-9]{12}$/.test(C82.aparelho)){ C82.aparelho = Array.from({length:12}, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(Math.random()*31)]).join(''); localStorage.setItem('racha-aparelho', C82.aparelho); } } catch (_) {}

// o que o CONTA guarda a mais (o contaCarregar do jogo-base só lê os campos dele): os empates da ranqueada (v80: sumiam ao
// recarregar) e o último nível da conta que já deu prêmio
function c82LeExtras(){
  try {
    const o = JSON.parse(localStorage.getItem(CHAVE_CONTA) || 'null');
    if (o && o.rq && Number.isInteger(o.rq.emp) && o.rq.emp >= 0) CONTA.rq.emp = o.rq.emp;
    if (o && Number.isInteger(o.nivelConta) && o.nivelConta >= 1) CONTA.nivelConta = o.nivelConta;
  } catch (_) {}
}
c82LeExtras();
const contaCarregarAntes82 = contaCarregar;
contaCarregar = function(){ const r = contaCarregarAntes82.apply(this, arguments); c82LeExtras(); return r; };

/* ---------------------------------------------------------------- 2) uma curva só: o nível e o XP da conta */
const nivelInfoAntes82 = nivelInfo;
nivelInfo = function(xp){
  const c = C82.conta;
  if (c && c.nivelInfo && xp === CONTA.xp) return {n:c.nivelInfo.n | 0 || 1, atual:Math.max(0, c.nivelInfo.atual | 0), prox:Math.max(1, c.nivelInfo.prox | 0), conta:true};
  return nivelInfoAntes82.apply(this, arguments);
};
function c82PremiaNiveis(c){                               // cada nível novo da conta: as moedas e gemas de sempre (uma vez)
  if (!c || !Number.isInteger(c.nivel) || c.nivel < 1) return;
  if (!Number.isInteger(CONTA.nivelConta)){ CONTA.nivelConta = c.nivel; contaSalvar(); return; }   // (a primeira vez: sem prêmio dos níveis de antes)
  if (c.nivel <= CONTA.nivelConta) return;
  for (let n = CONTA.nivelConta + 1; n <= c.nivel; n++){
    const q = {n, m:PREMIO.nivel.m, g:PREMIO.nivel.g + (n % 5 ? 0 : PREMIO.nivel5.g)};
    CONTA.moedas = Math.min(1e9, CONTA.moedas + q.m); CONTA.gemas = Math.min(1e9, CONTA.gemas + q.g); CONTA.niveis.push(q);
  }
  if (CONTA.niveis.length > 5) CONTA.niveis.splice(0, CONTA.niveis.length - 5);
  CONTA.nivelConta = c.nivel; contaSalvar();
  if (lobby.aberto && !RQ.on) setTimeout(() => { try { filaPops(); } catch (_) {} }, 300);
}

/* ---------------------------------------------------------------- 3) a patente: a da conta manda */
function c82SincRq(rq){                                    // a patente da conta entra na cópia daqui (o tamanho e o campo escolhidos ficam)
  if (!rq || typeof rq !== 'object') return false;
  const C = CONTA.rq, n = {pts:Math.max(0, rq.pts | 0), melhor:Math.max(0, rq.melhor | 0), jogos:Math.max(0, rq.jogos | 0), vit:Math.max(0, rq.vit | 0), seq:Math.max(0, rq.seq | 0), emp:Math.max(0, rq.emp | 0)};
  if (C.pts === n.pts && C.melhor === n.melhor && C.jogos === n.jogos && C.vit === n.vit && C.seq === n.seq && (C.emp | 0) === n.emp) return false;
  Object.assign(C, n); contaSalvar(); return true;
}
function c82Repinta(){
  try { if (lobby.aberto && !lobby.tela) lbRender(); } catch (_) {}
  try { if (lobby.aberto && lobby.tela === 'perfil') renderPerfil(); } catch (_) {}
  try { if (lobby.aberto && lobby.tela === 'ranking') renderRanking(); } catch (_) {}
  try { if (AJX.raiz && !AJX.raiz.hidden) ajxSync(); } catch (_) {}
}
function c82AplicaConta(c){                                // a conta chegou ou mudou (o nível, o XP, a patente)
  // (a conta de outro dono não entra: este jogo abriu com o progresso de quem jogava antes — sem conta ou outra conta — e
  // a plataforma abre o jogo de novo para quem entrou; misturar aqui punha a patente da conta no progresso de outro)
  if (c && c.idPublico && 'c' + String(Number(c.idPublico)) !== R82.dono) return;
  const antes = C82.conta;
  C82.conta = c && Number.isFinite(c.xp) ? c : null;
  if (!C82.conta){ if (antes) c82Repinta(); return; }
  if (C82.conta.rq && !(C82.pendente && Date.now() - C82.pendente < 15000)) c82SincRq(C82.conta.rq);   // (com uma ranqueada esperando a resposta: espera)
  c82PremiaNiveis(C82.conta);
  c82Repinta();
}
// a tela do fim: o que o servidor fez com a partida (a patente da conta e o XP da conta)
function c82FimAberto(){ try { return typeof fimAberto === 'function' ? fimAberto() : !fimEl('fim').hidden; } catch (_) { return false; } }
function c82NotaFim(txt){
  const box = fimEl('fim-rq'); if (!box) return;
  let n = box.querySelector('.c82-nota'); if (!n){ n = nodo('p', 'c82-nota'); box.appendChild(n); }
  n.textContent = txt; n.hidden = !txt;
}
function c82AcertaFim(R, rq){                             // os pontos que valeram na conta no lugar da prévia daqui; devolve a nota
  const pr = {antes:rq.antes | 0, depois:rq.depois | 0, delta:rq.delta | 0, eloAntes:rqElo(rq.antes | 0), eloDepois:rqElo(rq.depois | 0), subiu:!!rq.subiu, caiu:!!rq.caiu, conta:true};
  const local = R.pr;
  if (!local || local.delta !== pr.delta || local.depois !== pr.depois){ R.pr = pr; rqPintaPontos(pr); }
  return rq.limitado ? 'Na conta: os pontos de hoje contra os bots acabaram (a vitória conta, os pontos não). Online não tem limite.'
    : (!local || local.delta !== pr.delta) ? 'Na conta: ' + (pr.delta > 0 ? '+' : pr.delta < 0 ? '−' : '±') + Math.abs(pr.delta) + ' pontos (' + pr.eloDepois.nome + ').' : '';
}
// a resposta da plataforma pode chegar antes da tela do fim abrir (ela abre uns segundos depois do apito): fica guardada com
// a partida (C82.fim.R) e entra quando a tela dessa partida abrir — e de novo, igual, se ela for pintada outra vez
function c82PintaFim(){
  const F = C82.fim; if (!F || !F.ev || !F.R || F.R !== RQ.resultado || !c82FimAberto()) return;
  const r = F.ev.resultado;
  if (F.nota === undefined){
    if (!r) F.nota = F.espera ? 'A conta não registrou esta partida' + (F.ev.erro ? ' (' + String(F.ev.erro).slice(0, 90) + ')' : '') + ': a patente fica a da conta.' : '';
    else if (r.rq && r.rq.estado) F.nota = c82AcertaFim(F.R, r.rq);
    else F.nota = F.espera && !r.duplicada ? (r.motivo ? String(r.motivo) + ' ' : '') + 'A patente da conta não mudou.' : '';
  } else if (F.R.pr && F.R.pr.conta) rqPintaPontos(F.R.pr);
  c82NotaFim(F.nota);
  c82XpFim(r);
}
function c82XpFim(r){
  const el = fimEl('fim-premio'); if (!el || !c82FimAberto() || !r) return;
  for (const x of el.querySelectorAll('.c82-xp')) x.remove();
  if (r.xpConcedido > 0){ const s = nodo('span', 'px c82-xp', '+' + r.xpConcedido + ' XP DA CONTA'); el.appendChild(s); }
  if (r.subiuNivel && r.nivel) el.appendChild(nodo('span', 'pn c82-xp', 'NÍVEL ' + r.nivel + '!'));
}
function c82Resultado(ev){
  const r = ev && ev.resultado;
  C82.pendente = 0; C82.esperaRq = false; C82.ultimoRes = ev || null;
  if (C82.fim && !C82.fim.ev) C82.fim.ev = ev || {resultado:null};
  if (!r){ const c = c82ContaAgora(); if (c && c.rq) c82SincRq(c.rq); }
  else if (r.rq && r.rq.estado) c82SincRq(r.rq.estado);
  c82PintaFim();
  if (r) c82NuvemLogo(1500);
  c82Repinta();
}
const rqMostraFimAntes82 = rqMostraFim;
rqMostraFim = function(){ const v = rqMostraFimAntes82.apply(this, arguments); try { c82PintaFim(); } catch (e) { window.RUA_CONTA82_ERRO = String(e && e.stack); } return v; };
// a ranqueada de antes ficou aberta (o jogo fechou ou a rede caiu no meio) e passou da validade: a plataforma contou como
// desistência quando esta partida começou (jogoRouter.iniciarPartida) — a patente daqui acompanha e o jogo avisa
function c82Desistencia(ev){
  const r = ev && ev.rq, n = Math.max(1, (ev && ev.n) | 0), d = r ? Math.abs(r.delta | 0) : 0;
  if (r && r.estado && !(C82.pendente && Date.now() - C82.pendente < 15000)) c82SincRq(r.estado);
  const t = (n > 1 ? n + ' RANQUEADAS FICARAM ABERTAS' : 'A RANQUEADA DE ANTES FICOU ABERTA') + ': DESISTÊNCIA' + (n === 1 && d ? ' (−' + d + ')' : '');
  C82.ultimaDesistencia = t;
  try { if (rqEmJogo()) rqAvisa(t, '#ff9b8f'); else aviso(t); } catch (_) {}
  c82Repinta();
}
// os eventos para a plataforma: a ranqueada (contra os bots ou online) e o tamanho do time vão junto
const v70EvInicioAntes82 = v70EvInicio;
v70EvInicio = function(d, chave){
  let novo = false;
  try {
    d = Object.assign({}, d);
    d.ranqueada = NET49.playing && NET49.room ? !!NET49.room.ranked : !!(RQ.on && X49.matchMode === 'ranked');
    novo = !V70ON.ev || V70ON.ev.chave !== chave;
  } catch (_) {}
  const r = v70EvInicioAntes82.call(this, d, chave);      // (se a anterior ficou aberta, ela fecha antes, com o que era dela)
  if (novo){ C82.evRq = !!d.ranqueada; C82.evTam = d.tamanho | 0; }
  return r;
};
const v70EvFimAntes82 = v70EvFim;
v70EvFim = function(d){
  try {
    if (V70ON.ev){
      d = Object.assign({}, d, {ranqueada:!!C82.evRq, tamanho:C82.evTam | 0});
      if (C82.evRq && C82.conta){ C82.pendente = Date.now(); C82.esperaRq = true; }
      C82.fim = C82.conta ? {R:RQ.resultado || null, ev:null, espera:!!(C82.evRq && C82.conta)} : null;   // (a resposta desta partida)
    }
  } catch (_) {}
  return v70EvFimAntes82.call(this, d);
};
// o fim: com a conta, os prêmios mostram as moedas e as gemas (o XP da conta chega depois, do servidor)
const premioNosAntes82 = premioNos;
premioNos = function(elm, pr){
  if (c82SemXpLocal() && pr && pr.p && pr.p.xp) pr = Object.assign({}, pr, {p:Object.assign({}, pr.p, {xp:0})});
  return premioNosAntes82.call(this, elm, pr);
};

/* ---------------------------------------------------------------- 4) o progresso na conta (a cópia) */
function c82Resumo(chaves){                                // o que tem numa cópia (para escolher entre duas)
  const j = k => { try { return JSON.parse(chaves && chaves[k] || 'null'); } catch (_) { return null; } };
  const c = j('streetball-conta-v1') || {}, p = j('racha-treino-perfil-v1') || {}, t = j('racha-tampa-v1') || {}, x = j('streetball-v49') || {};
  const st = p.st || {}, rq = c.rq || {};
  return {moedas:c.moedas | 0, gemas:c.gemas | 0, partidas:st.partidas | 0, pecas:Array.isArray(t.itens) ? t.itens.length : 0, desenhos:Array.isArray(t.salvas) ? t.salvas.length : 0,
    pts:rq.pts | 0, nome:typeof p.nome === 'string' ? p.nome : '', ultima:Array.isArray(x.history) && x.history.length ? +x.history[x.history.length - 1].at || 0 : 0};
}
function c82ResumoNos(titulo, r, quando){
  const d = nodo('div', 'c82-lado'); d.appendChild(nodo('b', null, titulo));
  const ul = nodo('ul');
  for (const t of [fmtNum(r.moedas) + ' moedas · ' + fmtNum(r.gemas) + ' gemas', fmtNum(r.partidas) + (r.partidas === 1 ? ' partida' : ' partidas'),
    r.pecas + (r.pecas === 1 ? ' peça' : ' peças') + ' da tampinha' + (r.desenhos ? ' · ' + r.desenhos + (r.desenhos === 1 ? ' desenho' : ' desenhos') : ''),
    'ranqueada: ' + rqElo(r.pts).nome + ' (' + fmtNum(r.pts) + ')']) ul.appendChild(nodo('li', null, t));
  d.appendChild(ul);
  if (quando) d.appendChild(nodo('small', null, quando));
  return d;
}
function c82Ha(ms){ const s = Math.max(0, Math.round((Date.now() - ms)/1000)); return s < 60 ? 'agora' : s < 3600 ? 'há ' + Math.round(s/60) + ' min' : s < 86400 ? 'há ' + Math.round(s/3600) + ' h' : 'há ' + Math.round(s/86400) + (Math.round(s/86400) === 1 ? ' dia' : ' dias'); }
function c82Pop(monta){                                    // as janelas da conta: no menu, sem outra janela aberta e fora da primeira vez
  C82.pops.push(monta); c82PopTenta();
}
function c82PopTenta(){
  if (C82.popAberto || !C82.pops.length) return;
  const livre = lobby.aberto && LB.pop.hidden && !(typeof ONB !== 'undefined' && (ONB.aberto || ONB.aquece)) && !(AJX.raiz && !AJX.raiz.hidden);
  if (!livre){ setTimeout(c82PopTenta, 900); return; }
  const monta = C82.pops.shift(); C82.popAberto = true;
  abrePop(c => { c.classList.add('c82-pop'); monta(c); });
  const fecha = () => { if (!LB.pop.hidden) return setTimeout(fecha, 400); C82.popAberto = false; setTimeout(c82PopTenta, 200); };
  setTimeout(fecha, 400);
}
// (a fila do jogo — as novidades de uma conta nova, os níveis — espera a pergunta da conta: ela vem primeiro)
const filaPopsAntes82 = filaPops;
filaPops = function(){
  if (C82.pops.length && !C82.popAberto){ c82PopTenta(); if (C82.popAberto){ filaPop.push(() => filaPops()); return; } }
  return filaPopsAntes82.apply(this, arguments);
};
function c82Ocupado(c, txt){                               // a escolha foi feita: os botões param (o jogo abre de novo em seguida)
  for (const b of c.querySelectorAll('.pop-acoes button')) b.disabled = true;
  const p = c.querySelector('.pop-txt'); if (p && txt) p.textContent = txt;
}
function c82Recarrega(msg){                                // o progresso das chaves mudou por baixo: o jogo abre de novo com ele
  if (RQ.on || NET49.playing){ C82.recarrega = msg || true; return; }   // (no meio da partida: quando voltar ao menu)
  C82.bloqueio = true;                                     // (as chaves de agora não valem mais: ao fechar, nada vai para a conta)
  try { if (msg) sessionStorage.setItem('racha-82-aviso', msg); } catch (_) {}
  try { location.reload(); } catch (_) {}
}
function c82Conflito(n){                                   // os dois mudaram: a conta (outro aparelho) × este aparelho
  if (C82.conflitoAberto) return;
  if (n && n.dados && n.dados.chaves && R82.migraChaves) R82.migraChaves(n.dados.chaves);   // v85: a cópia antiga, com os nomes antigos das chaves
  C82.conflitoAberto = true; C82.bloqueio = true;
  c82Pop(c => {
    c.append(nodo('span', 'pop-tag', 'CONTA DO RACHA'), nodo('h2', null, 'QUAL PROGRESSO FICA?'),
      nodo('p', 'pop-txt', 'A sua conta tem progresso salvo em outro aparelho, e este aparelho tem progresso que ainda não foi para a conta. Escolha qual fica (o outro some). A patente da ranqueada e o nível da conta não mudam: eles ficam na conta.'));
    const dois = nodo('div', 'c82-dois');
    dois.append(c82ResumoNos('O DA CONTA', c82Resumo(n.dados && n.dados.chaves), 'salvo ' + c82Ha(+n.salvoEm || Date.now())), c82ResumoNos('O DESTE APARELHO', c82Resumo(R82.copia())));
    c.appendChild(dois);
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('O DA CONTA', 'verde', () => {
      som.clique(); c82Ocupado(c, 'Carregando o progresso da conta…');
      R82.prepara(n.dados.chaves, {versao:n.versao | 0, salvoEm:+n.salvoEm || Date.now(), primeira:true}, {hashDaCopia:true});
      C82.conflitoAberto = false; c82Recarrega('Progresso da conta carregado.');
    }), botaoPop('O DESTE APARELHO', '', () => {
      som.clique(); fechaPop();
      R82.meta.versao = n.versao | 0; R82.meta.hash = ''; R82.meta.primeira = true; R82.salvaMeta();
      C82.conflitoAberto = false; C82.bloqueio = false; c82Envia(true);
    }));
    c.appendChild(a);
  });
}
// (a primeira vez do jogo espera a pergunta da conta nova: se o progresso vier do aparelho, ela nem precisa aparecer)
const onbPrecisaAntes82 = onbPrecisa;
onbPrecisa = function(){ if (R82.primeira && !C82.primeiraRespondida) return false; return onbPrecisaAntes82.apply(this, arguments); };
function c82Primeira(conv){                                // a conta é nova e o aparelho tem progresso de quem jogava sem conta
  C82.bloqueio = true;                                     // (até a resposta, nada vai para a conta: o que for depende dela)
  c82Pop(c => {
    const r = c82Resumo(conv), teto = 799;
    c.append(nodo('span', 'pop-tag', 'CONTA NOVA'), nodo('h2', null, 'LEVAR O PROGRESSO PARA A CONTA?'),
      nodo('p', 'pop-txt', 'Este aparelho tem o progresso de quem jogava sem conta. Ele pode ir para a sua conta (sai daqui e passa a valer em qualquer aparelho em que você entrar).'));
    const um = nodo('div', 'c82-dois um'); um.appendChild(c82ResumoNos('NESTE APARELHO (SEM CONTA)', r)); c.appendChild(um);
    if (r.pts > teto) c.appendChild(nodo('p', 'pop-txt c82-obs', 'A patente entra até ' + rqElo(teto).nome + ' (' + teto + ' pontos): a ranqueada contra os bots feita sem conta não tem conferência. Daí para cima, é jogando com a conta.'));
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('LEVAR PARA A CONTA', 'verde', () => {
      som.clique(); c82Ocupado(c, 'Levando o progresso para a sua conta…'); C82.primeiraRespondida = true;
      // (entra antes do jogo abrir de novo; o hash vazio: vai para a conta. A patente vai antes — a conta já chega com ela —
      // e, se a rede falhar agora, vai de novo quando o jogo abrir)
      const pl = c82Pl(), vai = imp => { R82.prepara(conv, {versao:R82.meta.versao | 0, hash:'', primeira:true, importar:imp | 0}, {limpaConvidado:true}); c82Recarrega('O progresso deste aparelho foi para a sua conta.'); };
      if (pl && pl.patente && r.pts > 0) Promise.resolve().then(() => pl.patente.importar(r.pts)).then(() => vai(0), () => vai(r.pts));
      else vai(0);
    }), botaoPop('COMEÇAR DO ZERO', '', () => {
      som.clique(); C82.primeiraRespondida = true;
      let onb = false; try { onb = onbPrecisaAntes82(); } catch (_) {}
      if (onb) onbAbre();                                   // (a primeira vez do jogo, agora com a conta; a fila do jogo vem depois dela)
      fechaPop();
      C82.bloqueio = false; R82.meta.primeira = true; R82.salvaMeta(); c82Envia(true);
      if (!onb) aviso('A conta começa do zero. O progresso sem conta continua neste aparelho (sem conta).');
    }));
    c.appendChild(a);
  });
}
function c82Envia(forca){                                  // manda a cópia (se mudou desde a última que foi)
  const pl = c82Pl(); if (!pl || !pl.progresso || !R82.dono || !C82.conta || C82.enviando || C82.bloqueio || !R82.meta || R82.nuvem === undefined) return;
  const ch = R82.copia(), h = R82.hash(ch);
  if (!forca && R82.meta.versao && h === R82.meta.hash){ C82.estado = 'salvo'; return; }
  C82.enviando = true; C82.estado = 'salvando'; C82.envT = Date.now(); c82PintaConta();
  Promise.resolve().then(() => pl.progresso.salvar(R82.meta.versao | 0, {v:1, chaves:ch}, C82.aparelho)).then(r => {
    C82.enviando = false;
    if (r && r.ok){ R82.meta.versao = r.versao | 0; R82.meta.hash = h; R82.meta.salvoEm = Date.now(); R82.meta.primeira = true; R82.salvaMeta(); C82.estado = 'salvo'; C82.erro = ''; }
    else if (r && r.conflito){ C82.estado = 'conflito'; c82Conflito(r); }
    else { C82.estado = 'erro'; C82.erro = 'resposta inesperada'; }
    c82PintaConta();
  }).catch(e => { C82.enviando = false; C82.estado = 'erro'; C82.erro = String(e && e.message || e).slice(0, 120); c82PintaConta(); });
}
function c82NuvemLogo(ms){ clearTimeout(C82.logoT); C82.logoT = setTimeout(() => c82Envia(false), ms || 1500); }
function c82Tardia(n){                                     // a cópia da conta chegou depois de o jogo abrir
  if (RQ.on || NET49.playing || !lobby.aberto){ C82.tardia = {n}; return; }   // (no meio da partida: decide no menu, com o que a partida mudou)
  C82.tardia = null;
  const o = R82.decide(n === undefined ? null : n, true);
  if (o === 'aplicar') c82Recarrega('Progresso da conta carregado.');
  else if (o === 'conflito') c82Conflito(R82.conflito);
  else if (o === 'primeira') c82Primeira(R82.primeira);
  else c82NuvemLogo(2500);
}
function c82BuscaNuvem(){                                  // (a plataforma não tinha a cópia quando o jogo abriu: pede; se falhar, tenta de novo)
  const pl = c82Pl(); if (!pl || !pl.progresso || C82.buscando) return;
  C82.buscando = true; C82.buscaT = Date.now();
  Promise.resolve().then(() => pl.progresso.carregar()).then(n => { C82.buscando = false; c82Tardia(n); }, () => { C82.buscando = false; });
}
function c82Vigia(){                                       // de tempos em tempos: a conta (se a plataforma não avisou) e a cópia (se mudou)
  const c = c82ContaAgora();
  if (JSON.stringify(c) !== JSON.stringify(C82.conta)) c82AplicaConta(c);
  if (!C82.conta || !R82.dono || !R82.meta) return;
  if (C82.tardia && !RQ.on && !NET49.playing && lobby.aberto) c82Tardia(C82.tardia.n);
  if (R82.nuvem === undefined && !C82.tardia){ if (Date.now() - (C82.buscaT || 0) > 15000) c82BuscaNuvem(); return; }   // (sem saber a cópia da conta, nada vai para ela)
  const h = R82.hash(R82.copia());
  if (h !== C82.ultimoHash){ C82.ultimoHash = h; C82.mudouEm = Date.now(); }
  if (h !== R82.meta.hash && Date.now() - C82.mudouEm > 5000 && Date.now() - C82.envT > 15000 && !RQ.on) c82Envia(false);
  if (C82.recarrega && !RQ.on && !NET49.playing && lobby.aberto){ const m = C82.recarrega; C82.recarrega = false; c82Recarrega(typeof m === 'string' ? m : 'Progresso da conta carregado.'); }
}
setInterval(c82Vigia, 4000);
window.addEventListener('pagehide', () => { try { if (C82.conta && R82.meta && R82.hash(R82.copia()) !== R82.meta.hash) c82Envia(false); } catch (_) {} });
document.addEventListener('visibilitychange', () => { if (document.hidden) try { c82Envia(false); } catch (_) {} });

/* ---------------------------------------------------------------- 5) entrar e criar conta pelo jogo */
function c82Abre(qual){
  const rota = C82_ROTA[qual] || C82_ROTA.entrar;
  try { const p = window.parent; if (p && p !== window && typeof p.RACHA_ABRIR === 'function' && p.RACHA_ABRIR(rota)) return true; } catch (_) {}
  abrePop(c => {
    c.append(nodo('span', 'pop-tag', 'CONTA DO RACHA'), nodo('h2', null, 'A CONTA FICA NO SITE'),
      nodo('p', 'pop-txt', 'Para entrar ou criar a sua conta, abra o RACHA pelo site (a plataforma). Aqui, sem o site, o progresso fica só neste aparelho — e não se perde: na primeira vez que você entrar na conta neste aparelho, o jogo pergunta se leva o progresso para ela.'));
    const a = nodo('div', 'pop-acoes'); a.appendChild(botaoPop('OK', 'verde', () => { som.clique(); fechaPop(); })); c.appendChild(a);
  });
  return false;
}
function c82PopEntrar(){                                    // (o "NESTE APARELHO" do perfil)
  abrePop(c => {
    c.append(nodo('span', 'pop-tag', 'SEM CONTA'), nodo('h2', null, 'ENTRE NA SUA CONTA'),
      nodo('p', 'pop-txt', 'Sem conta, o progresso fica só neste aparelho. Com a conta do RACHA: a patente no ranking de todos, o progresso salvo na conta e o mesmo jogo em qualquer aparelho.'));
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('ENTRAR', 'verde', () => { som.clique(); fechaPop(); c82Abre('entrar'); }), botaoPop('CRIAR CONTA', '', () => { som.clique(); fechaPop(); c82Abre('criar'); }));
    c.appendChild(a);
  });
}
// Ajustes › Conta: o cartão da conta (em cima)
function c82PintaConta(){
  const sec = AJX.secs && AJX.secs.conta; if (!sec) return;
  let el = C82.cardEl;
  if (!el || !el.isConnected){ el = C82.cardEl = nodo('div', 'c82-card ajx-grupo'); sec.insertBefore(el, sec.firstChild); }
  el.textContent = '';
  const c = C82.conta;
  if (c){
    const e = rqElo(CONTA.rq.pts), top = nodo('div', 'c82-card-top'), ins = nodo('span', 'c82-ins'); ins.innerHTML = rqInsignia(e);
    const tx = nodo('div', 'c82-card-tx'), nm = nodo('b', null, c.nome || perfil.nome);
    tx.append(nodo('small', null, 'CONTA DO RACHA · ID ' + c.idPublico), nm, nodo('span', null, 'Nível ' + (c.nivelInfo ? c.nivelInfo.n : c.nivel) + ' · ' + e.nome + ' (' + fmtNum(CONTA.rq.pts) + ' pontos)'));
    top.append(ins, tx); el.appendChild(top);
    const est = nodo('p', 'c82-est'), m = R82.meta || {};
    est.textContent = C82.estado === 'salvando' ? 'Salvando o progresso na conta…'
      : C82.estado === 'erro' ? 'O progresso não foi para a conta agora (' + (C82.erro || 'sem conexão') + '). Tenta de novo sozinho.'
      : C82.estado === 'conflito' ? 'A conta tem progresso de outro aparelho: escolha qual fica.'
      : m.salvoEm ? 'Progresso salvo na conta ' + c82Ha(m.salvoEm) + '.' : 'O progresso vai para a conta sozinho, alguns segundos depois de cada mudança.';
    const b = novoBotao('lb-btn c82-salvar'); b.textContent = 'SALVAR AGORA'; b.disabled = C82.enviando || C82.bloqueio;
    b.addEventListener('click', () => { som.clique(); c82Envia(true); });
    const lin = nodo('div', 'c82-lin'); lin.append(est, b); el.appendChild(lin);
  } else {
    el.appendChild(nodo('h3', 'ajx-h', 'SEM CONTA'));
    el.appendChild(nodo('p', 'ajx-nota', 'O progresso fica só neste aparelho. Com a conta do RACHA: a patente no ranking de todos, o progresso salvo na conta e o mesmo jogo em qualquer aparelho.'));
    const a = nodo('div', 'c82-acoes'), en = novoBotao('lb-btn verde c82-entrar'), cr = novoBotao('lb-btn c82-criar');
    en.textContent = 'ENTRAR'; cr.textContent = 'CRIAR CONTA';
    en.addEventListener('click', () => { som.clique(); c82Abre('entrar'); }); cr.addEventListener('click', () => { som.clique(); c82Abre('criar'); });
    a.append(en, cr); el.appendChild(a);
  }
}
const ajxSyncAntes82 = ajxSync;
ajxSync = function(){ const r = ajxSyncAntes82.apply(this, arguments); try { c82PintaConta(); } catch (_) {} return r; };
// o perfil: sem conta, o "NESTE APARELHO" abre o ENTRAR / CRIAR CONTA
const renderPerfilAntes82 = renderPerfil;
renderPerfil = function(){
  const r = renderPerfilAntes82.apply(this, arguments);
  try {
    for (const sel of document.querySelectorAll('#tela-perfil .pf-ident')){
      const conta = sel.classList.contains('conta');
      if (!sel.dataset.c82){ sel.dataset.c82 = '1'; sel.addEventListener('click', () => { if (!sel.classList.contains('conta')){ som.clique(); c82PopEntrar(); } });
        sel.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !sel.classList.contains('conta')){ e.preventDefault(); som.clique(); c82PopEntrar(); } }); }
      if (conta){ sel.removeAttribute('role'); sel.removeAttribute('tabindex'); sel.classList.remove('c82-entrar'); }
      else { sel.setAttribute('role', 'button'); sel.tabIndex = 0; sel.classList.add('c82-entrar'); sel.title = 'Sem conta: o perfil fica só neste aparelho. Toque para entrar ou criar a sua conta.'; }
    }
  } catch (_) {}
  return r;
};
// zerar: com a conta, o que muda (a patente e o nível da conta ficam)
const pxZerarPopAntes82 = pxZerarPop;
pxZerarPop = function(){
  const r = pxZerarPopAntes82.apply(this, arguments);
  try {
    if (C82.conta){
      const c = LB.popCaixa;
      for (const li of c.querySelectorAll('.v70-zerar-a li')) if (/Nível e XP/.test(li.textContent)) li.remove();
      const notas = c.querySelectorAll('.v70-zerar-nota');
      if (notas[0]) notas[0].textContent = 'Você está na sua conta do RACHA: isto zera também o progresso do jogo salvo na conta (moedas, gemas, peças, estatísticas). A patente da ranqueada, o nível da conta, as conquistas e o clube da conta não mudam.';
    }
  } catch (_) {}
  return r;
};
const pxZerarAntes82 = pxZerar;
pxZerar = function(){
  const r = pxZerarAntes82.apply(this, arguments);
  try { if (C82.conta){ if (C82.conta.rq) c82SincRq(C82.conta.rq); CONTA.nivelConta = C82.conta.nivel; contaSalvar(); c82NuvemLogo(800); } } catch (_) {}
  return r;
};

/* ---------------------------------------------------------------- 6) o RANKING › PATENTES (o de todos, da conta) */
function c82RkMonta(){
  const tela = TELAS.ranking && TELAS.ranking.el, corpo = tela && tela.querySelector('.rk-corpo'); if (!corpo) return null;
  let seg = corpo.querySelector('.c82-rk-abas');
  if (!seg){
    seg = nodo('div', 'tl-seg c82-rk-abas'); seg.setAttribute('role', 'tablist'); seg.setAttribute('aria-label', 'Qual ranking');
    for (const [id, txt] of [['patentes', 'PATENTES'], ['liga', 'LIGA DA SEMANA']]){
      const b = novoBotao(''); b.dataset.aba = id; b.textContent = txt; b.setAttribute('role', 'tab');
      b.addEventListener('click', () => { if (C82.rk.aba === id) return; som.clique(); C82.rk.aba = id; renderRanking(); });
      seg.appendChild(b);
    }
    corpo.insertBefore(seg, corpo.firstChild);
    const box = nodo('div', 'c82-rk'); box.hidden = true; corpo.insertBefore(box, seg.nextSibling);
  }
  return {corpo, seg, box:corpo.querySelector('.c82-rk')};
}
function c82RkBusca(){
  const pl = c82Pl(); if (!pl || !pl.patente || C82.rk.carregando) return;
  C82.rk.carregando = true; C82.rk.erro = '';
  Promise.resolve().then(() => pl.patente.ranking(50)).then(d => { C82.rk.dados = d || null; C82.rk.t = Date.now(); })
    .catch(e => { C82.rk.erro = String(e && e.message || e).slice(0, 100); })
    .then(() => { C82.rk.carregando = false; if (lobby.tela === 'ranking') renderRanking(); });
}
function c82RkLinha(j, eu){
  const li = nodo('li', 'c82-rk-lin' + (eu ? ' voce' : ''));
  const pos = nodo('span', 'lb-pos' + (j.posicao <= 3 ? ' p' + j.posicao : ''), String(j.posicao));
  const ins = nodo('span', 'c82-ins'); ins.innerHTML = rqInsignia(rqElo(j.pts | 0));
  const nm = nodo('span', 'nm'), t = nodo('span', 'nm-t', eu ? String(j.nomeExibicao || '').toUpperCase() : String(j.nomeExibicao || 'Jogador'));
  try { const s = (j.selos || [])[0]; if (s) v79SeloMarca(t, s); } catch (_) {}
  nm.append(t, nodo('small', null, rqElo(j.pts | 0).nome + (eu ? ' · você' : '')));
  const pts = nodo('span', 'lb-gols c82-pts'); pts.append(nodo('b', null, fmtNum(j.pts | 0)), nodo('i', null, 'pts'));
  li.append(pos, ins, nm, pts);
  return li;
}
function c82RkPinta(M){
  const box = M.box; box.textContent = '';
  const pl = c82Pl(), d = C82.rk.dados;
  if (!pl){
    box.append(nodo('p', 'c82-rk-txt', 'O ranking das patentes de todo mundo fica na conta do RACHA, no site. Aqui, sem o site, a sua patente é a deste aparelho: ' + rqElo(CONTA.rq.pts).nome + ' (' + fmtNum(CONTA.rq.pts) + ' pontos).'));
    const b = novoBotao('lb-btn verde c82-rk-btn'); b.textContent = 'ENTRAR NA CONTA'; b.addEventListener('click', () => { som.clique(); c82Abre('entrar'); }); box.appendChild(b);
    return;
  }
  if (!d){ box.appendChild(nodo('p', 'c82-rk-txt', C82.rk.erro ? 'O ranking não abriu agora (' + C82.rk.erro + ').' : 'Carregando o ranking das patentes…')); return; }
  const lista = Array.isArray(d.lista) ? d.lista : [], meu = C82.conta ? String(C82.conta.idPublico) : '';
  // (no celular deitado a lista é a grade de 3 colunas × 10 da liga: até 30 linhas, a sua entra na última se estiver abaixo)
  let cel = false; try { cel = document.getElementById('lb').classList.contains('v70-cabe'); } catch (_) {}
  const max = cel ? 30 : 50, ol = nodo('ol', 'rk-lista c82-rk-lista');
  const minha = meu ? lista.find(j => j.idPublico === meu) || (C82.conta && d.eu && d.eu.posicao ? {posicao:d.eu.posicao, idPublico:meu, nomeExibicao:C82.conta.nome, pts:d.eu.pts, selos:C82.conta.selos} : null) : null;
  let mostra = lista.slice(0, max);
  const fora = !!minha && !mostra.some(j => j.idPublico === meu);
  if (fora && mostra.length >= max) mostra = mostra.slice(0, max - 1);
  if (!lista.length) box.appendChild(nodo('p', 'c82-rk-txt', 'Ninguém jogou a ranqueada com a conta ainda. Jogue uma e apareça aqui!'));
  for (const j of mostra) ol.appendChild(c82RkLinha(j, !!meu && j.idPublico === meu));
  if (fora) ol.appendChild(c82RkLinha(minha, true));
  box.appendChild(ol);
  if (C82.conta && d.eu){
    if (!d.eu.posicao) box.appendChild(nodo('p', 'c82-rk-txt', 'Você ainda não está no ranking: jogue a ranqueada com a conta (e deixe o perfil público no site).'));
  } else if (!C82.conta){
    const p = nodo('p', 'c82-rk-txt', 'Você está sem conta: a sua patente (' + rqElo(CONTA.rq.pts).nome + ') fica só neste aparelho. ');
    const b = novoBotao('lb-btn verde c82-rk-btn'); b.textContent = 'ENTRAR NA CONTA'; b.addEventListener('click', () => { som.clique(); c82Abre('entrar'); });
    box.append(p, b);
  }
  box.appendChild(nodo('p', 'tl-nota c82-rk-nota', 'As contas com perfil público, pela patente da ranqueada. A online é conferida pelo servidor das salas; contra os bots, os pontos ganhos por dia têm teto.'));
}
const renderRankingAntes82 = renderRanking;
renderRanking = function(){
  const r = renderRankingAntes82.apply(this, arguments);
  try {
    const M = c82RkMonta(); if (!M) return r;
    if (!C82.rk.aba) C82.rk.aba = C82.conta ? 'patentes' : 'liga';
    const pat = C82.rk.aba === 'patentes';
    for (const b of M.seg.querySelectorAll('button')){ const on = b.dataset.aba === C82.rk.aba; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }
    for (const el of M.corpo.children){ if (el === M.seg || el === M.box) continue; if (pat){ if (!el.hasAttribute('data-c82-escondido')){ el.dataset.c82Escondido = el.hidden ? '2' : '1'; el.hidden = true; } } else if (el.hasAttribute('data-c82-escondido')){ el.hidden = el.dataset.c82Escondido === '2'; el.removeAttribute('data-c82-escondido'); } }
    M.box.hidden = !pat;
    try { if (LB.rkT) LB.rkT.hidden = pat; } catch (_) {}   // ("termina em …" é da liga da semana)
    if (pat){ if (c82Pl() && (!C82.rk.dados || Date.now() - C82.rk.t > 30000)) c82RkBusca(); c82RkPinta(M); }
  } catch (e) { window.RUA_RK82_ERRO = String(e && e.stack); }
  return r;
};

/* ---------------------------------------------------------------- 8) começa: a conta, a cópia e as perguntas */
(function(){
  const pl = c82Pl();
  if (!pl){ C82.conta = null; return; }
  try { if (typeof pl.ouvir === 'function') C82.desliga = pl.ouvir(ev => { try { if (!ev) return; if (ev.tipo === 'conta') c82AplicaConta(ev.conta); else if (ev.tipo === 'resultado') c82Resultado(ev); else if (ev.tipo === 'desistencia') c82Desistencia(ev); } catch (e) { window.RUA_CONTA82_ERRO = String(e && e.stack); } }); } catch (_) {}
  window.addEventListener('pagehide', () => { try { if (C82.desliga) C82.desliga(); } catch (_) {} });
  c82AplicaConta(c82ContaAgora());
  try { const m = sessionStorage.getItem('racha-82-aviso'); if (m){ sessionStorage.removeItem('racha-82-aviso'); setTimeout(() => aviso(m), 900); } } catch (_) {}
  if (!R82.dono || !C82.conta) return;
  C82.ultimoHash = R82.hash(R82.copia());
  if (R82.conflito) c82Conflito(R82.conflito);
  else if (R82.primeira) c82Primeira(R82.primeira);
  else if (R82.nuvem === undefined && pl.progresso) c82BuscaNuvem();   // a cópia da conta não tinha chegado antes do jogo abrir: busca agora
  else c82NuvemLogo(2500);                                    // (a primeira cópia de uma conta nova, ou o que mudou aqui)
  // a patente do aparelho que não entrou na conta (a rede falhou na hora do LEVAR): tenta de novo
  try {
    const imp = R82.meta && R82.meta.importar | 0;
    if (imp > 0 && pl.patente && C82.conta && C82.conta.rq && !C82.conta.rq.importado)
      Promise.resolve().then(() => pl.patente.importar(imp)).then(() => { delete R82.meta.importar; R82.salvaMeta(); }, () => {});
    else if (imp > 0 && C82.conta && C82.conta.rq && C82.conta.rq.importado){ delete R82.meta.importar; R82.salvaMeta(); }
  } catch (_) {}
})();

window.RachaContas82 = {conta:() => C82.conta, logado:c82Logado, estado:() => C82.estado, envia:c82Envia, sincRq:c82SincRq, aplicaConta:c82AplicaConta,
  resultado:c82Resultado, desistencia:c82Desistencia, resumo:c82Resumo, abre:c82Abre, rk:C82.rk, C82};
