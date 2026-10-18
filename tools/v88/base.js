/* ======================================================================================================================
   RACHA v88 · A BASE DAS TELAS NOVAS (entra no fim do script, depois do site.js da v87; o catálogo CAT88 vem antes, colado
   pelo tools/v88/v88.py a partir de app/contracts/catalogo88.json — o MESMO arquivo que a plataforma usa para conferir).
   O que mora aqui (as outras partes da v88 usam):
   · V88 e a conversa com a plataforma (v88Api: o tRPC do RACHA84, com o token ou o cookie da sessão);
   · A CARTEIRA E O INVENTÁRIO DA CONTA: logado, as moedas, as gemas e os itens são os do SERVIDOR (loja.estado). O jogo
     só mostra: ganhar e gastar passam pela plataforma (as partidas, o treino, as missões, o passe, o correio, a loja, a
     troca de gemas e as peças da tampinha). Sem conta (SÓ TREINAR OFFLINE), a economia do aparelho continua a de sempre;
   · O SOCIAL AO VIVO pelo servidor das salas (a conexão abre sozinha no lobby, sem aviso na tela): o status dos amigos,
     os convites, o chat dos amigos e do clube, o aviso na hora da plataforma (pedido, carta, convite de clube);
   · O KIT DAS TELAS: a moldura (VOLTAR, título com o ícone, carteira), a coluna de categorias, as abas, as listas, o
     vazio, o carregando, o erro e o "entre na conta", os selos de não lido, as janelas de confirmação e os ícones.
   Nada aqui mexe na física, na partida ou na regra do jogo.
   ====================================================================================================================== */
const V88 = {carteiraOk:false, carteira:null, inv:new Set(), equip:{}, estado:null, resumo:null, amigos:[], amigosT:0, status:new Map(), statusEu:null,
  convites:[], dms:new Map(), dmNaoLidas:new Map(), dmAberto:'', clube:{msgs:[], chave:null, naoLidas:0}, ouvintes:{}, telas:{}, sincT:0, resumoT:0,
  silencioso:false, conectaT:0, tentativas:0, pecasLocais:null, eu:'', notas:[], notaT:0, pedindoBilhete:false, relT:0, ultimoPub:''};

/* ---------------------------------------------------------------- 1) a plataforma */
function v88R84(){ return window.RACHA84 || null; }
function v88TemPlataforma(){ const R = v88R84(); try { return !!(R && R.base()); } catch (_) { return false; } }
function v88Logado(){ return !!(typeof C82 !== 'undefined' && C82.conta && v88TemPlataforma()); }
function v88Carteira(){ return v88Logado() && V88.carteiraOk; }      // a economia da conta (o servidor) está valendo agora
function v88Api(proc, input, query){
  const R = v88R84();
  if (!R || !v88TemPlataforma()) return Promise.reject(new Error('Sem a plataforma: entre na sua conta para usar isso.'));
  return R.api(proc, input, !!query).catch(e => {
    if (e && e.status === 401){ e.message = 'A sua sessão terminou: entre de novo na conta.'; }
    throw e;
  });
}
const v88Q = (proc, input) => v88Api(proc, input, true);
const v88M = (proc, input) => v88Api(proc, input, false);
function v88Nonce(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
function v88Pub(x){ return String(x == null ? '' : x).replace(/\D/g, '').padStart(6, '0').slice(-9); }

/* ---------------------------------------------------------------- 2) os avisos internos (um ouve, outro avisa) */
function v88On(ev, fn){ (V88.ouvintes[ev] || (V88.ouvintes[ev] = [])).push(fn); }
function v88Emite(ev, d){ for (const fn of (V88.ouvintes[ev] || []).slice()){ try { fn(d); } catch (e) { console.error('v88 ' + ev + ':', e); } } }

/* ---------------------------------------------------------------- 3) a carteira, o inventário e os equipados da conta */
function v88PoeCarteira(c){
  if (!c || !Number.isFinite(+c.moedas) || !Number.isFinite(+c.gemas)) return;
  V88.carteira = {moedas:Math.max(0, +c.moedas | 0), gemas:Math.max(0, +c.gemas | 0)};
  if (!v88Logado()) return;
  V88.carteiraOk = true;
  CONTA.moedas = V88.carteira.moedas; CONTA.gemas = V88.carteira.gemas;
  try { contaSalvar(); } catch (_) {}
  v88Emite('carteira', V88.carteira);
}
function v88PoeInventario(lista){
  if (!Array.isArray(lista)) return;
  V88.inv = new Set(lista.map(x => typeof x === 'string' ? x : x && x.codigo).filter(x => typeof x === 'string'));
  // as peças da tampinha da conta valem no editor (logado, o servidor manda; sem conta, as do aparelho voltam)
  try {
    if (!V88.pecasLocais) V88.pecasLocais = new Set(TP.itens);
    const pecas = new Set(); for (const c of V88.inv) if (/^peca:[bfpi]:[a-z0-9-]{2}$/.test(c)) pecas.add(c.slice(5));
    TP.itens = pecas;
  } catch (_) {}
  // as tampinhas exclusivas da conta (o passe, os eventos): equipar sem pagar, no INVENTÁRIO do editor
  try { v88TampinhasDaConta(); } catch (_) {}
  v88Emite('inventario', V88.inv);
}
function v88PoeEquipados(e){
  if (!e || typeof e !== 'object') return;
  const P = (typeof CAT88 !== 'undefined' && CAT88.padroes) || {};
  V88.equip = Object.assign({}, P, e);
  try { localStorage.setItem('racha88-equip', JSON.stringify(V88.equip)); } catch (_) {}
  v88Emite('equipados', V88.equip);
}
try { const e = JSON.parse(localStorage.getItem('racha88-equip') || 'null'); if (e && typeof e === 'object') V88.equip = e; } catch (_) {}
function v88Equipado(tipo){ const P = (typeof CAT88 !== 'undefined' && CAT88.padroes) || {}; return (v88Logado() && V88.equip[tipo]) || P[tipo] || ''; }
function v88Tem(codigo){ const it = v88Item(codigo); return !!(it && it.gratis) || V88.inv.has(codigo); }
function v88Item(codigo){ if (typeof CAT88 === 'undefined') return null; return CAT88.itens.find(x => x.id === codigo) || null; }
function v88Pacote(id){ return typeof CAT88 === 'undefined' ? null : CAT88.pacotes.find(x => x.id === id) || null; }
function v88TampinhasDaConta(){                          // as tampinhas do catálogo (tp_*) que a conta tem entram no TP_CONTA (o editor já sabe mostrar)
  if (typeof CAT88 === 'undefined' || typeof TP_CONTA === 'undefined') return;
  for (const it of CAT88.itens){
    if (it.tipo !== 'tampinha' || !it.visual || !it.visual.d) continue;
    if (!TP_CONTA[it.id]){ try { TP_CONTA[it.id] = {nome:it.nome, d:tpNorm(tpD(it.visual.d))}; } catch (_) { continue; } }
    if (V88.inv.has(it.id)){
      if (TP.conta.indexOf(it.id) < 0) TP.conta.push(it.id);
      TP.livres.add(tpCodigo(TP_CONTA[it.id].d));
    }
  }
}
// o estado da loja (a carteira, o inventário, os equipados, os destaques e as ofertas): na entrada e depois de cada mudança
function v88Estado(forca){
  if (!v88Logado()) return Promise.resolve(null);
  if (!forca && V88.estado && Date.now() - V88.sincT < 20000) return Promise.resolve(V88.estado);
  V88.sincT = Date.now();
  return v88Q('loja.estado').then(e => {
    if (!e) return null;
    V88.estado = e;
    v88PoeCarteira(e.carteira); v88PoeInventario(e.inventario); v88PoeEquipados(e.equipados);
    return e;
  }).catch(err => { V88.sincT = 0; throw err; });
}
// os contadores (pedidos, mensagens por categoria, correio, convites e pedidos de clube)
function v88Resumo(){
  if (!v88Logado()) return Promise.resolve(null);
  V88.resumoT = Date.now();
  return v88Q('social.resumo').then(r => { V88.resumo = r || null; v88Emite('resumo', V88.resumo); return r; }).catch(() => null);
}
function v88CarregaAmigos(forca){
  if (!v88Logado()) return Promise.resolve([]);
  if (!forca && V88.amigosT && Date.now() - V88.amigosT < 30000) return Promise.resolve(V88.amigos);
  V88.amigosT = Date.now();
  return v88Q('social.amigos').then(l => { V88.amigos = Array.isArray(l) ? l : []; v88Emite('amigos', V88.amigos); return V88.amigos; }).catch(() => { V88.amigosT = 0; return V88.amigos; });
}
function v88Sincroniza(){
  if (!v88Logado()) return;
  const pub = v88Pub(C82.conta.idPublico);
  if (V88.eu && V88.eu !== pub) v88Esquece();                    // (outra conta entrou neste aparelho)
  V88.eu = pub;
  v88Estado(true).catch(() => {});
  v88Resumo(); v88CarregaAmigos(true);
  v88Conecta();
}
function v88Esquece(){                                     // saiu da conta: nada da conta fica na tela
  V88.carteiraOk = false; V88.carteira = null; V88.estado = null; V88.resumo = null; V88.amigos = []; V88.amigosT = 0;
  V88.inv = new Set(); V88.status.clear(); V88.convites = []; V88.dms.clear(); V88.dmNaoLidas.clear(); V88.clube = {msgs:[], chave:null, naoLidas:0}; V88.eu = '';
  try { if (V88.pecasLocais){ TP.itens = new Set(V88.pecasLocais); V88.pecasLocais = null; } } catch (_) {}
  try { contaCarregar(); } catch (_) {}                         // (a carteira do aparelho volta)
  v88Emite('resumo', null); v88Emite('amigos', []); v88Emite('carteira', null);
}
// a conta chegou ou saiu (o c82AplicaConta é quem fica sabendo)
const c82AplicaContaAntes88 = c82AplicaConta;
c82AplicaConta = function(c){
  const antes = !!C82.conta;
  const r = c82AplicaContaAntes88.apply(this, arguments);
  try { if (C82.conta && v88TemPlataforma()) v88Sincroniza(); else if (antes && !C82.conta) v88Esquece(); } catch (e) { console.error(e); }
  return r;
};
setInterval(() => { if (v88Logado() && Date.now() - V88.resumoT > 60000) v88Resumo(); }, 15000);
setTimeout(() => { try { if (C82.conta && v88TemPlataforma() && !V88.eu) v88Sincroniza(); } catch (_) {} }, 1500);

/* ---------------------------------------------------------------- 4) a economia da conta: o aparelho não soma nem gasta sozinho */
const ganhaAntes88 = ganha;
ganha = function(p){
  if (!v88Carteira()) return ganhaAntes88.apply(this, arguments);
  const m = CONTA.moedas, g = CONTA.gemas, nv = CONTA.niveis.length;
  ganhaAntes88.call(this, Object.assign({}, p || {}, {m:0, g:0}));   // (o XP do aparelho continua contando para o que ele usa; as moedas, não)
  CONTA.moedas = m; CONTA.gemas = g; if (CONTA.niveis.length > nv) CONTA.niveis.length = nv;
  try { contaSalvar(); } catch (_) {}
  return [];                                                     // (os prêmios de nível da conta vêm do servidor)
};
const c82PremiaNiveisAntes88 = c82PremiaNiveis;
c82PremiaNiveis = function(c){
  if (!v88Carteira()) return c82PremiaNiveisAntes88.apply(this, arguments);
  if (c && Number.isInteger(c.nivel)){ CONTA.nivelConta = Math.max(CONTA.nivelConta | 0, c.nivel); try { contaSalvar(); } catch (_) {} }   // (as moedas e gemas de cada nível o servidor já pôs na carteira)
};
const semanaChecarAntes88 = semanaChecar;
semanaChecar = function(){
  const r = semanaChecarAntes88.apply(this, arguments);
  if (r && v88Carteira()) CONTA.semPend = null;                 // (o prêmio da liga da conta chega pelo CORREIO, conferido no servidor)
  return r;
};
// a troca de gemas por moedas: logado, é a plataforma que troca (sem o DESFAZER: a troca vale na hora, na conta)
const ecoTrocaPedeAntes88 = ecoTrocaPede;
ecoTrocaPede = function(g, m){
  if (!v88Carteira()) return ecoTrocaPedeAntes88.apply(this, arguments);
  const t = typeof CAT88 !== 'undefined' && CAT88.trocas.find(x => x.gemas === g && x.moedas === m);
  if (!t) return ecoTrocaPedeAntes88.apply(this, arguments);
  v88Troca(t);
};
function v88Troca(t){
  if (CONTA.gemas < t.gemas){ som.erro(); return v88Aviso('Faltam gemas para essa troca.'); }
  som.clique();
  v88Confirma('LOJA', 'TROCAR GEMAS POR MOEDAS?', 'Você dá ' + t.gemas + ' gemas e recebe ' + fmtNum(t.moedas) + ' moedas, na sua conta. Depois: ' + fmtNum(CONTA.gemas - t.gemas) + ' gemas · ' + fmtNum(CONTA.moedas + t.moedas) + ' moedas.', 'TROCAR', () => {
    v88M('loja.trocar', {id:t.id, nonce:v88Nonce()}).then(r => {
      if (r && r.carteira) v88PoeCarteira(r.carteira);
      som.moeda(); v88Aviso('Troca feita: +' + fmtNum(t.moedas) + ' moedas');
      try { renderLoja(); } catch (_) {}
    }).catch(e => { som.erro(); v88Aviso(e.message || 'A troca não deu certo.'); });
  });
}
// as peças da tampinha: logado, a compra é na conta (o editor equipa depois que o servidor confirma)
const tpCompraAntes88 = tpCompra;
tpCompra = function(D){
  if (!v88Carteira()) return tpCompraAntes88.apply(this, arguments);
  const L = tpFaltam(D), c = tpCusto(D);
  if (!L.length) return true;
  if (!tpPode(c)){ som.erro(); return false; }
  const pecas = L.map(x => tpChave(x.tipo, x.id)), cod = V88.tpeCod || tpCodigo(D);
  v88Aviso('Comprando na sua conta…');
  v88M('loja.comprarPecas', {pecas, total:{moedas:c.m, gemas:c.g}}).then(r => {
    if (r && r.carteira) v88PoeCarteira(r.carteira);
    for (const k of pecas) TP.itens.add(k);
    for (const k of pecas) V88.inv.add('peca:' + k);
    som.compra(); v88Aviso('Peças compradas na sua conta!');
    try { if (lobby.tela === 'skins' && typeof tpeAplica === 'function') tpeAplica(cod); } catch (e) { console.error(e); }
    v88Estado(true).catch(() => {});
  }).catch(e => { som.erro(); v88Aviso(e.message || 'A compra não deu certo: nada foi cobrado.'); });
  return false;                                                 // (a janela fecha; a tampinha equipa quando o servidor confirmar)
};
const tpeConcluirAntes88 = tpeConcluir;
tpeConcluir = function(){ try { V88.tpeCod = tpCodigo(ED.D); } catch (_) {} return tpeConcluirAntes88.apply(this, arguments); };
// o bilhete da conta para as salas leva os amigos e os bloqueios (pode passar de 600 letras: o servidor aceita até 8.000)
v70PedeBilhete = function(){
  const pl = v70Plataforma(); if (!pl || typeof pl.bilheteSala !== 'function' || !v70ContaLogada()) return Promise.resolve(null);
  return Promise.resolve().then(() => pl.bilheteSala()).then(b => {
    if (typeof b === 'string' && b.length > 20 && b.length < 8000){ V70ON.bilhete = b; V70ON.bilheteT = Date.now(); return b; }
    return null;
  }).catch(() => null);
};
setInterval(() => { try { if (v88Logado()) v70PedeBilhete(); } catch (_) {} }, 9*60e3);   // (o setInterval da v70 guardou a função velha, com o teto de 600)

/* ---------------------------------------------------------------- 5) o social ao vivo (o servidor das salas) */
function v88PodeConectar(){
  try { return v88Logado() && !window.RACHA_SEM_REDE && !(typeof SLOC !== 'undefined' && SLOC.on) && !!servidorEndereco() && !V70ON.outraAba; } catch (_) { return false; }
}
function v88Conecta(){                                     // abre a conexão das salas sem barulho (o status online e os convites precisam dela)
  clearTimeout(V88.conectaT);
  if (!v88PodeConectar()) return;
  if (NET49.ws && NET49.ws.readyState <= 1){ if (NET49.id) v88PedeAmigos(); return; }
  const antes = X49UI.toast ? X49UI.toast.textContent : '';
  V88.silencioso = true;
  const comeca = () => {
    try { net49Connect(); } catch (_) {}
    if (X49UI.toast && X49UI.toast.textContent !== antes){ clearTimeout(X49.toastTimer); X49UI.toast.textContent = antes; }
    const ws = NET49.ws; if (!ws) return;
    const erroAntes = ws.onerror;
    ws.onerror = function(){ if (!V88.silencioso && erroAntes) erroAntes.apply(this, arguments); };
  };
  if (!V70ON.bilhete || Date.now() - V70ON.bilheteT > 20*60e3) v70PedeBilhete().then(comeca); else comeca();
}
function v88Reconecta(){                                   // caiu: tenta de novo com calma (5 s, 10 s, 20 s… até 2 min)
  clearTimeout(V88.conectaT);
  if (!v88PodeConectar()) return;
  const ms = Math.min(120000, 5000*Math.pow(2, Math.min(5, V88.tentativas++)));
  V88.conectaT = setTimeout(() => { if (!NET49.ws) v88Conecta(); }, ms);
}
function v88PedeAmigos(){ if (NET49.id) net49Send({type:'amigos_status'}); }
function v88RelacoesMudaram(){                             // mudou um amigo ou um bloqueio: o servidor das salas fica sabendo (bilhete novo)
  clearTimeout(V88.relT);
  V88.relT = setTimeout(() => {
    v88CarregaAmigos(true);
    v70PedeBilhete().then(b => { if (b && NET49.id) net49Send({type:'relacoes', conta:b}); });
  }, 400);
}
const net49MessageAntes88 = net49Message;
net49Message = function(m){
  if (!m || typeof m.type !== 'string') return net49MessageAntes88.apply(this, arguments);
  switch (m.type){
    case 'amigos_status': V88.status.clear(); for (const x of m.lista || []) V88.status.set(v88Pub(x.p), x); V88.statusEu = {mostra:m.mostra !== false, convites:m.convites !== false}; v88Emite('status'); return;
    case 'amigo_status': { const p = v88Pub(m.p); if (m.st === 'offline') V88.status.delete(p); else V88.status.set(p, m); v88Emite('status', p); return; }
    case 'convite_recebido': v88ConviteChegou(m); return;
    case 'convite_enviado': v88Aviso('Convite enviado para ' + (m.nome || 'o amigo') + '.'); v88Emite('convite_enviado', m); return;
    case 'convite_erro': som.erro(); v88Aviso(m.motivo || 'O convite não foi.'); v88Emite('convite_erro', m); return;
    case 'convite_resultado': v88Aviso((m.nome || 'O amigo') + (m.aceita ? ' aceitou o convite!' : ' recusou o convite.')); return;
    case 'dm': v88DmChegou(m); return;
    case 'dm_hist': { const p = v88Pub(m.com); V88.dms.set(p, (m.lista || []).slice()); v88Emite('dm', p); return; }
    case 'dm_erro': som.erro(); v88Aviso(V88_ERROS_CHAT[m.reason] || 'A mensagem não foi.'); return;
    case 'clube_msg': v88ClubeChegou(m); return;
    case 'clube_hist': V88.clube.chave = m.clube || null; V88.clube.msgs = (m.lista || []).slice(); v88Emite('clube'); return;
    case 'clube_erro': som.erro(); v88Aviso(m.reason === 'sem_clube' ? 'Entre num clube para usar o chat do clube.' : V88_ERROS_CHAT[m.reason] || 'A mensagem não foi.'); return;
    case 'conta_aviso': v88AvisoDaConta(m); return;
    case 'relacoes_ok': return;
    case 'denuncia_ok': case 'brasil_report_ok': if (m.ok !== false) v88Aviso('Denúncia enviada. A equipe do RACHA vai analisar.'); v88Emite('denuncia', m); return;
  }
  const r = net49MessageAntes88.apply(this, arguments);
  if (m.type === 'hello'){
    V88.tentativas = 0;
    if (V88.silencioso && X49UI.toast && /Conectado/.test(X49UI.toast.textContent || '')){ clearTimeout(X49.toastTimer); X49UI.toast.textContent = ''; }
    V88.silencioso = false;
  }
  if (m.type === 'rooms') v88Emite('salas', m);
  return r;
};
// a conexão caiu (o onclose do jogo zera o NET49.ws): o lobby tenta de novo sozinho
setInterval(() => {
  try {
    if (!v88PodeConectar()){ if (V88.status.size){ V88.status.clear(); v88Emite('status'); } return; }
    if (!NET49.ws && !V88.conectaT) v88Reconecta();
    if (NET49.ws && NET49.ws.readyState === 1 && NET49.id && !V88.statusEu) v88PedeAmigos();
    if (NET49.ws && V88.conectaT && NET49.ws.readyState === 1){ clearTimeout(V88.conectaT); V88.conectaT = 0; }
  } catch (_) {}
}, 3000);
const V88_ERROS_CHAT = {vazia:'Escreva alguma coisa.', longa:'Mensagem longa demais (até 160 letras).', ritmo:'Calma: uma mensagem por segundo.', repetida:'Essa mensagem é igual à anterior.',
  filtro:'O filtro do chat bloqueou essa mensagem (palavrão, link, telefone, e-mail ou documento).', amigo:'Só dá para mandar mensagem para amigos.', conta:'Entre na sua conta para usar o chat.',
  silenciado:'Você está silenciado por denúncias. Daqui a pouco você volta.'};
function v88AvisoDaConta(m){                               // o aviso na hora da plataforma: o contador sobe e um balão aparece
  v88Resumo();
  if (m.categoria === 'amigos' || m.categoria === 'convites') v88CarregaAmigos(true);
  if (m.categoria === 'recompensas') v88Estado(true).catch(() => {});
  if (v88NotifLigada(m.categoria)) v88Nota(m.titulo || 'Mensagem nova', m.categoria);
  v88Emite('aviso', m);
}

/* ---------------------------------------------------------------- 6) as notificações (o balão de cima) */
function v88NotifLigada(cat){ try { const o = JSON.parse(localStorage.getItem('racha88-notif') || '{}'); return o[cat] !== false && o.tudo !== false; } catch (_) { return true; } }
function v88Nota(txt, cat){
  let el = document.getElementById('v88-nota');
  if (!el){ el = nodo('div', 'v88-balao'); el.id = 'v88-nota'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); (document.getElementById('wrap') || document.body).appendChild(el); }
  el.textContent = '';
  const i = nodo('i', 'v88-balao-ic'); i.innerHTML = v88Ic(cat === 'amigos' ? 'amigos' : cat === 'convites' ? 'convite' : cat === 'recompensas' ? 'presente' : cat === 'clube' ? 'clube' : 'sino');
  el.append(i, nodo('span', null, String(txt).slice(0, 120)));
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  clearTimeout(V88.notaT); V88.notaT = setTimeout(() => el.classList.remove('on'), 4200);
}
function v88Aviso(t){ try { aviso(t); } catch (_) {} try { LB.aviso.classList.add('v88-longo'); clearTimeout(V88.avisoT); V88.avisoT = setTimeout(() => LB.aviso.classList.remove('v88-longo'), 2600); } catch (_) {} }

/* ---------------------------------------------------------------- 7) os convites que chegam (sala e time) */
function v88ConviteChegou(m){
  const ate = Date.now() + (m.expira || 60000);
  V88.convites = V88.convites.filter(x => x.id !== m.id && x.ate > Date.now() && x.de.p !== m.de.p);
  V88.convites.push(Object.assign({}, m, {ate}));
  v88Emite('convites');
  if (!v88NotifLigada('convites')) return;
  if (NET49.playing){ v88Nota(m.de.nome + ' chamou você para ' + (m.tipo === 'equipe' ? 'o time dele' : 'a sala ' + (m.sala && m.sala.nome || '')) + ' (abra AMIGOS depois da partida).', 'convites'); return; }
  som.clique();
  const vai = () => v88ConviteResponde(m.id, true), nao = () => v88ConviteResponde(m.id, false);
  const mostra = () => abrePop(c => {
    c.classList.add('v88-pop', 'v88-convite-pop');
    c.append(nodo('span', 'pop-tag', m.tipo === 'equipe' ? 'CONVITE PARA O TIME' : 'CONVITE PARA A SALA'), nodo('h2', null, (m.de.nome || 'Um amigo') + ' chamou você!'));
    const s = m.sala || {};
    c.appendChild(nodo('p', 'pop-txt', (s.nome || 'Sala') + ' · ' + (s.n || 2) + 'v' + (s.n || 2) + ' · ' + (s.gente || 1) + '/' + (s.max || 12) + ' pessoas' + (s.state === 'playing' ? ' · partida rolando (você entra assistindo)' : '')));
    const tempo = nodo('p', 'pop-txt v88-convite-t'); c.appendChild(tempo);
    const tique = () => { const f = Math.max(0, Math.ceil((ate - Date.now())/1000)); tempo.textContent = f ? 'Vale por mais ' + f + ' s.' : 'O convite venceu.'; if (!f) clearInterval(it); };
    const it = setInterval(() => { if (!c.isConnected){ clearInterval(it); return; } tique(); }, 500); tique();
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('RECUSAR', '', () => { som.clique(); fechaPop(); nao(); }), botaoPop('ENTRAR', 'verde', () => { som.clique(); fechaPop(); vai(); }));
    c.appendChild(a);
  });
  if (!LB.pop.hidden || !lobby.aberto) filaPop.push(mostra); else mostra();
}
function v88ConviteResponde(id, aceita){
  const cv = V88.convites.find(x => x.id === id);
  V88.convites = V88.convites.filter(x => x.id !== id);
  v88Emite('convites');
  if (!cv) return;
  if (cv.ate < Date.now()) return v88Aviso('Esse convite já venceu.');
  if (aceita){
    if (NET49.playing) return v88Aviso('Termine a partida antes de entrar em outra sala.');
    try { if (typeof V79R !== 'undefined' && V79R.busca) v79BuscaCancela(); } catch (_) {}
    try { if (lobby.tela) fechaTela(); } catch (_) {}
  }
  net49Send({type:'convite_resposta', id, aceita:!!aceita});
  if (aceita) setTimeout(() => { try { if (NET49.room && lobby.aberto) abreTela('sala'); } catch (_) {} }, 350);
}
function v88Convida(pub, tipo){
  if (!NET49.id) return v88Aviso('Sem conexão com as salas agora. Tente de novo daqui a pouco.');
  if (!NET49.room) return v88Aviso('Crie ou entre numa sala para chamar os amigos (SALAS › CRIAR SALA).');
  net49Send({type:'convite', para:v88Pub(pub), tipo:tipo === 'equipe' ? 'equipe' : 'sala'});
}

/* ---------------------------------------------------------------- 8) o chat dos amigos e do clube (o que chega) */
function v88DmChegou(m){
  const eu = V88.eu, outro = m.de === eu ? v88Pub(m.para) : v88Pub(m.de);
  const l = V88.dms.get(outro) || []; if (!l.some(x => x.mid === m.mid)) l.push({mid:m.mid, de:m.de, nome:m.nome, para:m.para, texto:m.texto, t:m.t});
  if (l.length > 60) l.splice(0, l.length - 60);
  V88.dms.set(outro, l);
  if (m.de !== eu && V88.dmAberto !== outro){
    V88.dmNaoLidas.set(outro, (V88.dmNaoLidas.get(outro) || 0) + 1);
    if (v88Silenciado(m.de)) return v88Emite('dm', outro);
    if (v88NotifLigada('amigos') && !NET49.playing) v88Nota((m.nome || 'Amigo') + ': ' + m.texto, 'amigos');
  }
  v88Emite('dm', outro);
}
function v88ClubeChegou(m){
  V88.clube.chave = m.clube || V88.clube.chave;
  if (!V88.clube.msgs.some(x => x.mid === m.mid)) V88.clube.msgs.push(m);
  if (V88.clube.msgs.length > 80) V88.clube.msgs.splice(0, V88.clube.msgs.length - 80);
  if (m.de !== V88.eu && V88.dmAberto !== '#clube') V88.clube.naoLidas++;
  v88Emite('clube', m);
}
// silenciar (só para você, neste aparelho e na conta do aparelho): as mensagens de quem você silenciou não aparecem
function v88Silenciados(){ try { const l = JSON.parse(localStorage.getItem('racha88-mudos') || '[]'); return Array.isArray(l) ? l.filter(x => typeof x === 'string').slice(0, 300) : []; } catch (_) { return []; } }
function v88Silenciado(quem){ return quem ? v88Silenciados().indexOf(String(quem)) >= 0 : false; }
function v88Silencia(quem, on){
  const l = v88Silenciados().filter(x => x !== String(quem)); if (on) l.push(String(quem));
  try { localStorage.setItem('racha88-mudos', JSON.stringify(l.slice(-300))); } catch (_) {}
  v88Emite('mudos');
}

/* ---------------------------------------------------------------- 9) o kit das telas */
function v88Bt(cls, txt, fn, rotulo){ const b = novoBotao(cls, rotulo || null); if (txt != null) b.textContent = txt; if (fn) b.addEventListener('click', e => { som.clique(); fn(e); }); return b; }
function v88IcEl(nome, cls){ const i = nodo('i', 'v88-ic' + (cls ? ' ' + cls : '')); i.innerHTML = v88Ic(nome); return i; }
function v88Selo(el, n){                                   // o número vermelho de não lido num botão
  if (!el) return;
  let s = el.querySelector(':scope > .v88-selo');
  if (!n){ if (s) s.remove(); return; }
  if (!s){ s = nodo('b', 'v88-selo'); s.setAttribute('aria-hidden', 'true'); el.appendChild(s); }
  const t = n > 99 ? '99+' : String(n); if (s.textContent !== t) s.textContent = t;
}
function v88Vazio(pai, ic, tit, txt, bt){
  const d = nodo('div', 'v88-vazio'); d.appendChild(v88IcEl(ic || 'vazio')); d.appendChild(nodo('b', null, tit));
  if (txt) d.appendChild(nodo('p', null, txt));
  if (bt) d.appendChild(bt);
  pai.appendChild(d); return d;
}
function v88Carregando(pai, txt){ const d = nodo('div', 'v88-carregando'); d.append(nodo('span', 'v88-gira'), nodo('b', null, txt || 'Carregando…')); pai.appendChild(d); return d; }
function v88Erro(pai, msg, tenta){
  const d = nodo('div', 'v88-erro'); d.appendChild(v88IcEl('alerta')); d.appendChild(nodo('b', null, 'Não deu para carregar'));
  d.appendChild(nodo('p', null, msg || 'Confira a internet e tente de novo.'));
  if (tenta) d.appendChild(v88Bt('lb-btn amarelo', 'TENTAR DE NOVO', tenta));
  pai.appendChild(d); return d;
}
function v88PrecisaConta(pai, oque){                       // sem conta (SÓ TREINAR OFFLINE ou sem a plataforma): o que fazer
  const d = nodo('div', 'v88-vazio v88-conta');
  d.appendChild(v88IcEl('cadeado'));
  d.appendChild(nodo('b', null, 'Entre na sua conta do RACHA'));
  d.appendChild(nodo('p', null, (oque || 'Isso') + ': tudo fica guardado na sua conta, no servidor do RACHA — assim vale em qualquer aparelho e ninguém mexe nos seus dados.'));
  if (v88TemPlataforma() && typeof v84AbreLogin === 'function' && window.RACHA84 && !window.RACHA84.embutido) d.appendChild(v88Bt('lb-btn amarelo', 'ENTRAR NA CONTA', () => { try { fechaTela(); } catch (_) {} v84AbreLogin('entrar'); }));
  else d.appendChild(nodo('p', 'v88-nota', v88TemPlataforma() ? 'Use o botão ENTRAR do site.' : 'Abra o jogo pelo endereço do RACHA (o site) para entrar na conta.'));
  pai.appendChild(d); return d;
}
function v88Confirma(tag, tit, txt, ok, fn, cls){
  abrePop(c => {
    c.classList.add('v88-pop');
    c.append(nodo('span', 'pop-tag', tag), nodo('h2', null, tit));
    if (txt) c.appendChild(nodo('p', 'pop-txt', txt));
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('CANCELAR', '', () => { som.clique(); fechaPop(); }), botaoPop(ok, cls || 'verde', () => { som.clique(); fechaPop(); fn(); }));
    c.appendChild(a);
  });
}
function v88Raridade(r){ const R = (typeof CAT88 !== 'undefined' && CAT88.raridades) || {}; return R[r] || {nome:r || 'Comum', cor:'#9aa4ad'}; }
function v88Preco(m, g){                                   // o preço com o ícone (moedas ou gemas)
  const s = nodo('span', 'v88-preco');
  if (g){ s.append(nodo('i', 'ic-gema'), nodo('b', null, fmtNum(g))); }
  else if (m){ s.append(nodo('i', 'ic-moeda'), nodo('b', null, fmtNum(m))); }
  else s.appendChild(nodo('b', null, 'GRÁTIS'));
  return s;
}
function v88Quando(t){                                     // 'agora' · 'há 5 min' · 'há 3 h' · 'ontem' · '12/10'
  const d = new Date(t); if (!isFinite(d)) return '';
  const s = (Date.now() - d.getTime())/1000;
  if (s < 60) return 'agora'; if (s < 3600) return 'há ' + Math.floor(s/60) + ' min'; if (s < 86400) return 'há ' + Math.floor(s/3600) + ' h';
  if (s < 172800) return 'ontem';
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
}
function v88Falta(ate){ const ms = new Date(ate).getTime() - Date.now(); return ms > 0 ? tempoFalta(ms) : 'acabou'; }
function v88Dur(seg){ seg = Math.max(0, seg | 0); const h = Math.floor(seg/3600), m = Math.floor(seg%3600/60); return h ? h + 'h ' + String(m).padStart(2, '0') + 'min' : m + ' min'; }
// as abas de cima (o mesmo jeito das abas do jogo, com o número de não lido)
function v88Abas(pai, itens, ativo, fn){
  const nav = nodo('nav', 'v88-abas'); nav.setAttribute('role', 'tablist');
  for (const it of itens){
    const b = novoBotao('v88-aba' + (it.id === ativo ? ' on' : ''), it.rot); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(it.id === ativo));
    b.dataset.aba = it.id; b.textContent = it.rot; if (it.n) v88Selo(b, it.n);
    b.addEventListener('click', () => { if (it.id === ativo) return; som.clique(); fn(it.id); });
    nav.appendChild(b);
  }
  pai.appendChild(nav); return nav;
}
// a coluna da esquerda (as categorias, com ícone)
function v88Coluna(pai, itens, ativo, fn){
  const nav = nodo('nav', 'v88-coluna'); nav.setAttribute('role', 'tablist');
  for (const it of itens){
    const b = novoBotao('v88-cat' + (it.id === ativo ? ' on' : ''), it.rot); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(it.id === ativo));
    b.dataset.cat = it.id; b.append(v88IcEl(it.ic || it.id), nodo('span', null, it.rot)); if (it.n) v88Selo(b, it.n);
    b.addEventListener('click', () => { if (it.id === ativo) return; som.clique(); fn(it.id); });
    nav.appendChild(b);
  }
  pai.appendChild(nav); return nav;
}
// uma tela nova, igual às do jogo (VOLTAR, o título com o ícone, a carteira), registrada em TELAS (o Esc e o VOLTAR já funcionam)
function v88Tela(id, o){
  if (V88.telas[id]) return V88.telas[id];
  const el = nodo('section', 'lb-tela v88-tela v77-tl'); el.id = 'tela-' + id; el.hidden = true; el.setAttribute('aria-label', o.titulo);
  const cab = nodo('header', 'tl-cab v88-cab v77-cab');                  // (o mesmo cabeçalho das telas da v77: o título grande com o desenho)
  const volta = novoBotao('tl-voltar', 'Voltar'); volta.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  volta.addEventListener('click', fechaTela);
  const h = nodo('div', 'v77-tit v88-tit'); h.append(nodo('h2', null, o.titulo), v88IcEl(o.ic || id, 'v88-tit-ic'));
  cab.append(volta, h);
  if (o.carteira !== false){ const tc = nodo('div', 'tl-carteira'); tc.innerHTML = '<button type="button" class="lb-grana" data-loja="1" aria-label="Moedas"><i class="ic-moeda"></i><b class="n-moedas">0</b></button><button type="button" class="lb-grana" data-loja="1" aria-label="Gemas"><i class="ic-gema"></i><b class="n-gemas">0</b></button>'; cab.appendChild(tc); }
  const corpo = nodo('div', 'tl-corpo v88-corpo');
  el.append(cab, corpo);
  (LB.camada || document.body).appendChild(el);
  const T = {el, corpo, cab, o, render:() => { try { o.render(T); } catch (e) { console.error('v88 tela ' + id, e); corpo.textContent = ''; v88Erro(corpo, String(e && e.message || e)); } }, abre:o.abre ? () => o.abre(T) : null, fecha:o.fecha ? () => o.fecha(T) : null};
  TELAS[id] = {el, render:T.render, abre:T.abre || undefined, fecha:T.fecha || undefined};
  V88.telas[id] = T;
  try { lbCarteira(); } catch (_) {}
  return T;
}
function v88Aberta(id){ return !!(lobby.aberto && lobby.tela === id); }
function v88Repinta(id){ if (v88Aberta(id) && V88.telas[id]) V88.telas[id].render(); }
// a linha de uma lista (o avatar, o nome, o texto, os botões)
function v88Linha(o){
  const li = nodo('li', 'v88-linha' + (o.cls ? ' ' + o.cls : ''));
  if (o.av) li.appendChild(o.av);
  const t = nodo('div', 'v88-linha-tx');
  const nome = nodo('b', null, o.nome || ''); if (o.selo) nome.appendChild(o.selo);
  t.appendChild(nome);
  if (o.sub) { const s = nodo('small', 'v88-linha-sub' + (o.subCls ? ' ' + o.subCls : '')); if (typeof o.sub === 'string') s.textContent = o.sub; else s.appendChild(o.sub); t.appendChild(s); }
  li.appendChild(t);
  if (o.acoes && o.acoes.length){ const a = nodo('div', 'v88-linha-ac'); for (const b of o.acoes) if (b) a.appendChild(b); li.appendChild(a); }
  if (o.clique){ li.classList.add('clicavel'); t.addEventListener('click', () => { som.clique(); o.clique(); }); if (o.av) o.av.addEventListener('click', () => { som.clique(); o.clique(); }); }
  return li;
}
function v88BtIc(ic, rotulo, fn, cls){ const b = novoBotao('v88-btic' + (cls ? ' ' + cls : ''), rotulo); b.appendChild(v88IcEl(ic)); b.title = rotulo; b.addEventListener('click', e => { e.stopPropagation(); som.clique(); fn(e); }); return b; }

/* ---------------------------------------------------------------- 10) os ícones (a mesma família dos botões do lobby: contorno grosso, cor chapada) */
const V88_K = '#0b0c0e';
const V88_IC = (() => {
  const k = V88_K, sv = c => '<svg viewBox="0 0 64 64" aria-hidden="true">' + c + '</svg>';
  const env = (f, extra) => sv('<rect x="6" y="14" width="52" height="36" rx="6" fill="' + f + '" stroke="' + k + '" stroke-width="4"/><path d="M8 17l24 19 24-19" fill="none" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>' + (extra || ''));
  const pessoa = (x, y, s, f) => '<circle cx="' + x + '" cy="' + (y - 9*s) + '" r="' + 8*s + '" fill="' + f + '" stroke="' + k + '" stroke-width="3.6"/><path d="M' + (x - 14*s) + ' ' + (y + 15*s) + 'c0-10 6-15 ' + 14*s + '-15s' + 14*s + ' 5 ' + 14*s + ' 15z" fill="' + f + '" stroke="' + k + '" stroke-width="3.6" stroke-linejoin="round"/>';
  return {
    amigos:sv(pessoa(23, 30, 1, '#f6f3ea') + '<circle cx="46" cy="22" r="11" fill="#2fbf5b" stroke="' + k + '" stroke-width="3.6"/><path d="M46 16v12M40 22h12" stroke="#fff" stroke-width="4.2" stroke-linecap="round"/>'),
    amigo_add:sv(pessoa(26, 30, 1, '#f6f3ea') + '<circle cx="47" cy="40" r="11" fill="#2fbf5b" stroke="' + k + '" stroke-width="3.6"/><path d="M47 34v12M41 40h12" stroke="#fff" stroke-width="4.2" stroke-linecap="round"/>'),
    mensagens:sv('<path d="M9 10h46a5 5 0 0 1 5 5v24a5 5 0 0 1-5 5H30L18 55V44H9a5 5 0 0 1-5-5V15a5 5 0 0 1 5-5z" fill="#ffd23f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M15 22h34M15 31h22" stroke="' + k + '" stroke-width="4" stroke-linecap="round"/>'),
    correio:env('#f6f3ea', '<circle cx="50" cy="16" r="8" fill="#ff5a4f" stroke="' + k + '" stroke-width="3"/>'),
    envelope:env('#f6f3ea'),
    sinal:sv('<rect x="8" y="40" width="9" height="16" rx="2" fill="#2fbf5b" stroke="' + k + '" stroke-width="3.5"/><rect x="22" y="30" width="9" height="26" rx="2" fill="#2fbf5b" stroke="' + k + '" stroke-width="3.5"/><rect x="36" y="19" width="9" height="37" rx="2" fill="#2fbf5b" stroke="' + k + '" stroke-width="3.5"/><rect x="50" y="8" width="9" height="48" rx="2" fill="#2fbf5b" stroke="' + k + '" stroke-width="3.5"/>'),
    passe:sv('<path d="M6 20l8-10h36l8 10v8a6 6 0 0 0 0 12v8l-8 10H14L6 48v-8a6 6 0 0 0 0-12z" fill="#ffd23f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M20 40l3-14 7 7 2-10 2 10 7-7 3 14z" fill="' + k + '"/>'),
    missoes:sv('<rect x="12" y="8" width="40" height="50" rx="6" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><rect x="22" y="4" width="20" height="10" rx="3" fill="#ffd23f" stroke="' + k + '" stroke-width="3.5"/><path d="M19 28l5 5 9-10M19 44l5 5 9-10" fill="none" stroke="#2fbf5b" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M38 31h8M38 47h8" stroke="' + k + '" stroke-width="4" stroke-linecap="round"/>'),
    eventos:sv('<rect x="8" y="12" width="48" height="44" rx="6" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><path d="M8 18a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v8H8z" fill="#ff5a4f" stroke="' + k + '" stroke-width="4"/><path d="M20 6v12M44 6v12" stroke="' + k + '" stroke-width="4.5" stroke-linecap="round"/><path d="M32 30l3.4 7 7.6 1.1-5.5 5.4 1.3 7.6L32 47.5l-6.8 3.6 1.3-7.6-5.5-5.4 7.6-1.1z" fill="#ffd23f" stroke="' + k + '" stroke-width="3" stroke-linejoin="round"/>'),
    loja:sv('<path d="M12 25h40v27a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" fill="#ffd23f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M10 12h44l4 12H6z" fill="#ff5a4f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M26 56V42h12v14" fill="#8a5a2b" stroke="' + k + '" stroke-width="4"/>'),
    destaques:sv('<path d="M32 5l7.6 15.4 17 2.5-12.3 12 2.9 16.9L32 43.8 16.8 51.8l2.9-16.9-12.3-12 17-2.5z" fill="#ffd23f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>'),
    tampinhas:sv('<path d="M32 6l4 3.6 5.2-1.4 2.2 4.9 5.3.6.2 5.4 4.6 2.7-1.7 5.1 3.1 4.4-3.9 3.7.9 5.3-4.9 2.2-.8 5.3-5.4.2-2.7 4.6-5.1-1.7L32 58l-3.6-4-5.2 1.4-2.2-4.9-5.3-.6-.2-5.4-4.6-2.7 1.7-5.1L5.5 32l3.9-3.7-.9-5.3 4.9-2.2.8-5.3 5.4-.2 2.7-4.6 5.1 1.7z" fill="#c9ced6" stroke="' + k + '" stroke-width="3.4" stroke-linejoin="round"/><circle cx="32" cy="32" r="15" fill="#ff5a4f" stroke="' + k + '" stroke-width="3.4"/><path d="M32 17a15 15 0 0 1 0 30z" fill="#f6f3ea"/><circle cx="32" cy="32" r="15" fill="none" stroke="' + k + '" stroke-width="3.4"/>'),
    bolas:sv('<circle cx="32" cy="32" r="25" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><path d="M32 21.5l9.6 7-3.7 11.3H26.1l-3.7-11.3z" fill="#17191c"/><path d="M32 21.5V10M41.6 28.5l10.4-3.4M37.9 39.8l6.3 8.6M26.1 39.8l-6.3 8.6M22.4 28.5L12 25.1" stroke="#17191c" stroke-width="3.6" stroke-linecap="round"/>'),
    efeitos:sv('<path d="M30 6l6 16 16 2-12 10 4 18-14-10-14 10 4-18L8 24l16-2z" fill="#7fd6ff" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><circle cx="52" cy="50" r="5" fill="#ffd23f" stroke="' + k + '" stroke-width="3"/><circle cx="12" cy="52" r="4" fill="#ff4fa3" stroke="' + k + '" stroke-width="3"/>'),
    comemoracoes:sv('<path d="M10 56l12-34 20 20z" fill="#ffd23f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M36 8c4 4 2 8 6 10M48 16c3 2 6 1 8 4M44 28c4-1 8 2 12 0" fill="none" stroke="#ff4fa3" stroke-width="4" stroke-linecap="round"/><circle cx="30" cy="12" r="3.5" fill="#3bc9db" stroke="' + k + '" stroke-width="2.5"/><circle cx="54" cy="36" r="3.5" fill="#69db7c" stroke="' + k + '" stroke-width="2.5"/>'),
    gols:sv('<path d="M6 54V14h52v40" fill="none" stroke="' + k + '" stroke-width="5" stroke-linejoin="round"/><path d="M6 14h52v40H6z" fill="#f6f3ea" opacity=".35"/><path d="M14 22h36M14 30h36M14 38h36M14 46h36M18 14v40M28 14v40M38 14v40M48 14v40" stroke="rgba(11,12,14,.35)" stroke-width="2"/><circle cx="40" cy="40" r="9" fill="#f6f3ea" stroke="' + k + '" stroke-width="3.5"/><path d="M40 35.5l4 3-1.5 4.6h-5l-1.5-4.6z" fill="' + k + '"/>'),
    banners:sv('<rect x="5" y="14" width="54" height="36" rx="5" fill="#3a1c4a" stroke="' + k + '" stroke-width="4"/><path d="M5 40l14-12 10 8 12-14 18 18v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z" fill="#ff7a2a" stroke="' + k + '" stroke-width="3.4" stroke-linejoin="round"/><circle cx="46" cy="24" r="5" fill="#ffd23f"/>'),
    avatares:sv('<circle cx="32" cy="32" r="26" fill="#3f8cff" stroke="' + k + '" stroke-width="4"/><circle cx="32" cy="26" r="9" fill="#f6f3ea" stroke="' + k + '" stroke-width="3.5"/><path d="M15 50c3-9 9-12 17-12s14 3 17 12" fill="#f6f3ea" stroke="' + k + '" stroke-width="3.5" stroke-linejoin="round"/>'),
    pacotes:sv('<path d="M8 22l24-12 24 12v24L32 58 8 46z" fill="#c98a0b" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M8 22l24 12 24-12M32 34v24" fill="none" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M20 16l24 12v8" fill="none" stroke="#ffd23f" stroke-width="5"/>'),
    ofertas:sv('<path d="M30 6h24v24L30 56 8 34z" fill="#ff5a4f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><circle cx="44" cy="17" r="4.5" fill="#f6f3ea" stroke="' + k + '" stroke-width="3"/><path d="M22 34l12-12M24 26h.1M33 35h.1" stroke="#f6f3ea" stroke-width="5" stroke-linecap="round"/>'),
    trocas:sv('<circle cx="22" cy="24" r="14" fill="#ff5a8a" stroke="' + k + '" stroke-width="4"/><circle cx="42" cy="40" r="14" fill="#ffd23f" stroke="' + k + '" stroke-width="4"/><path d="M38 10l8 4-4 8M26 54l-8-4 4-8" fill="none" stroke="' + k + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'),
    mundo:sv('<circle cx="32" cy="32" r="25" fill="#3f8cff" stroke="' + k + '" stroke-width="4"/><path d="M18 18c6 2 8 8 4 12s2 10 8 8 8 6 4 12M44 12c-2 6 2 10 8 10M50 40c-6-2-10 2-8 8" fill="none" stroke="#2fbf5b" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="32" r="25" fill="none" stroke="' + k + '" stroke-width="4"/>'),
    sala:sv('<rect x="6" y="12" width="52" height="40" rx="6" fill="#2fbf5b" stroke="' + k + '" stroke-width="4"/><path d="M32 12v40M6 26h8v12H6M58 26h-8v12h8" fill="none" stroke="#f6f3ea" stroke-width="3.5"/><circle cx="32" cy="32" r="7" fill="none" stroke="#f6f3ea" stroke-width="3.5"/>'),
    equipe:sv(pessoa(20, 32, .85, '#ff8a2a') + pessoa(44, 32, .85, '#ff8a2a') + pessoa(32, 30, 1, '#ffd23f')),
    clube:sv('<path d="M32 6l22 8v15c0 13-9 22-22 28C19 51 10 42 10 29V14z" fill="#3f8cff" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M32 18.5l3.9 7.9 8.7 1.3-6.3 6.1 1.5 8.7L32 38.4l-7.8 4.1 1.5-8.7-6.3-6.1 8.7-1.3z" fill="#f6f3ea" stroke="' + k + '" stroke-width="3" stroke-linejoin="round"/>'),
    estat:sv('<rect x="8" y="34" width="10" height="22" rx="2" fill="#2fbf5b" stroke="' + k + '" stroke-width="3.6"/><rect x="27" y="20" width="10" height="36" rx="2" fill="#ffd23f" stroke="' + k + '" stroke-width="3.6"/><rect x="46" y="8" width="10" height="48" rx="2" fill="#3f8cff" stroke="' + k + '" stroke-width="3.6"/>'),
    olho:sv('<path d="M4 32c8-12 18-18 28-18s20 6 28 18c-8 12-18 18-28 18S12 44 4 32z" fill="#f6f3ea" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><circle cx="32" cy="32" r="10" fill="#3f8cff" stroke="' + k + '" stroke-width="3.5"/><circle cx="32" cy="32" r="4" fill="' + k + '"/>'),
    bandeira:sv('<path d="M14 6v54" stroke="' + k + '" stroke-width="5" stroke-linecap="round"/><path d="M16 8h34l-8 11 8 11H16z" fill="#ff5a4f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>'),
    bloquear:sv('<circle cx="32" cy="32" r="24" fill="#ff5a4f" stroke="' + k + '" stroke-width="4"/><path d="M15 15l34 34" stroke="#f6f3ea" stroke-width="7" stroke-linecap="round"/><circle cx="32" cy="32" r="24" fill="none" stroke="' + k + '" stroke-width="4"/>'),
    mudo:sv('<path d="M8 25h10l13-11v36L18 39H8z" fill="#f6f3ea" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M40 24l16 16M56 24L40 40" stroke="#ff5a4f" stroke-width="5" stroke-linecap="round"/>'),
    mais:sv('<circle cx="32" cy="32" r="24" fill="#2fbf5b" stroke="' + k + '" stroke-width="4"/><path d="M32 20v24M20 32h24" stroke="#fff" stroke-width="6" stroke-linecap="round"/>'),
    ok:sv('<circle cx="32" cy="32" r="24" fill="#2fbf5b" stroke="' + k + '" stroke-width="4"/><path d="M20 33l8 8 16-17" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'),
    x:sv('<circle cx="32" cy="32" r="24" fill="#ff5a4f" stroke="' + k + '" stroke-width="4"/><path d="M23 23l18 18M41 23L23 41" stroke="#fff" stroke-width="6" stroke-linecap="round"/>'),
    lixo:sv('<path d="M14 18h36l-4 38H18z" fill="#c9ced6" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M10 18h44M24 18v-8h16v8M27 28v18M37 28v18" fill="none" stroke="' + k + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'),
    lapis:sv('<path d="M42 8l14 14-28 28-17 3 3-17z" fill="#ffd23f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M36 14l14 14" stroke="' + k + '" stroke-width="4"/>'),
    cadeado:sv('<rect x="12" y="28" width="40" height="30" rx="6" fill="#ffd23f" stroke="' + k + '" stroke-width="4"/><path d="M20 28v-7a12 12 0 0 1 24 0v7" fill="none" stroke="' + k + '" stroke-width="5"/><circle cx="32" cy="42" r="4" fill="' + k + '"/>'),
    presente:sv('<rect x="8" y="26" width="48" height="30" rx="4" fill="#ff5a4f" stroke="' + k + '" stroke-width="4"/><rect x="5" y="18" width="54" height="11" rx="3" fill="#ffd23f" stroke="' + k + '" stroke-width="4"/><path d="M32 18v38" stroke="' + k + '" stroke-width="4"/><path d="M32 18c-8-12-20-8-14 0zM32 18c8-12 20-8 14 0z" fill="#ffd23f" stroke="' + k + '" stroke-width="3.5" stroke-linejoin="round"/>'),
    sistema:sv('<circle cx="32" cy="32" r="25" fill="#3f8cff" stroke="' + k + '" stroke-width="4"/><path d="M32 28v18" stroke="#fff" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="19" r="4" fill="#fff"/>'),
    convite:sv('<rect x="6" y="14" width="52" height="36" rx="6" fill="#2fbf5b" stroke="' + k + '" stroke-width="4"/><path d="M8 17l24 19 24-19" fill="none" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><circle cx="48" cy="44" r="10" fill="#ffd23f" stroke="' + k + '" stroke-width="3.5"/><path d="M48 39v10M43 44h10" stroke="' + k + '" stroke-width="3.5" stroke-linecap="round"/>'),
    recompensas:sv('<circle cx="32" cy="32" r="24" fill="#ffd23f" stroke="' + k + '" stroke-width="4"/><circle cx="32" cy="32" r="16" fill="none" stroke="#c98a0b" stroke-width="3.5"/><path d="M27 24h10v16h-10z" fill="#c98a0b"/>'),
    sino:sv('<path d="M32 8a16 16 0 0 1 16 16v12l6 8H10l6-8V24A16 16 0 0 1 32 8z" fill="#ffd23f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M26 50a6 6 0 0 0 12 0" fill="none" stroke="' + k + '" stroke-width="4"/>'),
    alerta:sv('<path d="M32 6l27 50H5z" fill="#ffd23f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M32 24v16" stroke="' + k + '" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="48" r="3.5" fill="' + k + '"/>'),
    vazio:sv('<circle cx="32" cy="32" r="24" fill="#2b3037" stroke="' + k + '" stroke-width="4"/><path d="M22 40c6-6 14-6 20 0" fill="none" stroke="#a9b0ba" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="27" r="3.5" fill="#a9b0ba"/><circle cx="40" cy="27" r="3.5" fill="#a9b0ba"/>'),
    relogio:sv('<circle cx="32" cy="32" r="25" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><path d="M32 16v17l10 7" fill="none" stroke="' + k + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'),
    trofeu:sv('<path d="M18 7h28v15c0 9-6 16-14 16S18 31 18 22z" fill="#ffd23f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M18 12H9v5c0 6 4 10 10 10M46 12h9v5c0 6-4 10-10 10" fill="none" stroke="' + k + '" stroke-width="4"/><path d="M28 38h8v8h-8z" fill="#f2a813" stroke="' + k + '" stroke-width="4"/><rect x="17" y="46" width="30" height="10" rx="3" fill="#8a5a2b" stroke="' + k + '" stroke-width="4"/>'),
    chat:sv('<path d="M11 11h42a5 5 0 0 1 5 5v23a5 5 0 0 1-5 5H29L17 55V44h-6a5 5 0 0 1-5-5V16a5 5 0 0 1 5-5z" fill="#f6f3ea" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><circle cx="21" cy="27.5" r="3.6" fill="' + k + '"/><circle cx="32" cy="27.5" r="3.6" fill="' + k + '"/><circle cx="43" cy="27.5" r="3.6" fill="' + k + '"/>'),
    enviar:sv('<path d="M6 30L58 8 44 56 32 38z" fill="#ffd23f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M32 38L58 8" stroke="' + k + '" stroke-width="4"/>'),
    perfil:sv(pessoa(32, 32, 1.3, '#f6f3ea')),
    treino:sv('<path d="M27 7h10l12 41H15z" fill="#ff8a2a" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M23.5 19h17l2.4 8H21.1zM20 31h24l2.4 8H17.6z" fill="#f6f3ea"/><rect x="8" y="47" width="48" height="9" rx="3" fill="#ff8a2a" stroke="' + k + '" stroke-width="4"/>'),
    controle:sv('<path d="M14 18h36c8 0 12 8 12 18s-2 18-8 18c-5 0-8-6-12-10H22c-4 4-7 10-12 10-6 0-8-8-8-18s4-18 12-18z" fill="#c9ced6" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M18 28v12M12 34h12" stroke="' + k + '" stroke-width="4.5" stroke-linecap="round"/><circle cx="44" cy="30" r="4" fill="#2fbf5b" stroke="' + k + '" stroke-width="2.5"/><circle cx="51" cy="37" r="4" fill="#ff5a4f" stroke="' + k + '" stroke-width="2.5"/>'),
    privacidade:sv('<path d="M32 6l22 8v15c0 13-9 22-22 28C19 51 10 42 10 29V14z" fill="#2fbf5b" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><rect x="22" y="28" width="20" height="16" rx="3" fill="#f6f3ea" stroke="' + k + '" stroke-width="3.5"/><path d="M26 28v-4a6 6 0 0 1 12 0v4" fill="none" stroke="' + k + '" stroke-width="3.5"/>'),
    idioma:sv('<circle cx="32" cy="32" r="25" fill="#3f8cff" stroke="' + k + '" stroke-width="4"/><path d="M7 32h50M32 7c-9 8-9 42 0 50M32 7c9 8 9 42 0 50" fill="none" stroke="#f6f3ea" stroke-width="3.5"/><circle cx="32" cy="32" r="25" fill="none" stroke="' + k + '" stroke-width="4"/>'),
    conta:sv('<circle cx="32" cy="22" r="11" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><path d="M11 57c0-13 9-21 21-21s21 8 21 21z" fill="#2fbf5b" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>'),
    camera:sv('<rect x="5" y="18" width="40" height="30" rx="6" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><path d="M45 27l14-8v28l-14-8z" fill="#ffd23f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><circle cx="18" cy="28" r="4" fill="#e8452c"/>'),
    sair:sv('<path d="M14 8h22v48H14z" fill="#8a5a2b" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M40 32h18M50 23l9 9-9 9" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'),
    coletar:sv('<circle cx="32" cy="32" r="24" fill="#2fbf5b" stroke="' + k + '" stroke-width="4"/><path d="M32 18v24M22 32l10 10 10-10" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'),
    coroa:sv('<path d="M8 50l4-30 12 12 8-18 8 18 12-12 4 30z" fill="#ffd23f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><rect x="8" y="48" width="48" height="8" rx="2" fill="#c98a0b" stroke="' + k + '" stroke-width="4"/>'),
    lupa:sv('<circle cx="27" cy="27" r="17" fill="#f6f3ea" stroke="' + k + '" stroke-width="5"/><path d="M40 40l16 16" stroke="' + k + '" stroke-width="7" stroke-linecap="round"/>'),
    historico:sv('<circle cx="34" cy="32" r="22" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><path d="M34 18v15l9 6" fill="none" stroke="' + k + '" stroke-width="4.5" stroke-linecap="round"/><path d="M4 22l8 8 8-8" fill="none" stroke="' + k + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'),
    torneio:sv('<path d="M6 10h12v12H6zM6 42h12v12H6zM46 26h12v12H46z" fill="#ffd23f" stroke="' + k + '" stroke-width="3.6"/><path d="M18 16h10v32H18M28 32h18" fill="none" stroke="' + k + '" stroke-width="4"/>'),
    login:sv('<rect x="8" y="12" width="48" height="44" rx="6" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><path d="M8 18a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v8H8z" fill="#2fbf5b" stroke="' + k + '" stroke-width="4"/><path d="M22 40l7 7 13-14" fill="none" stroke="#2fbf5b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'),
    desafio:sv('<circle cx="32" cy="32" r="25" fill="#ff5a4f" stroke="' + k + '" stroke-width="4"/><circle cx="32" cy="32" r="16" fill="#f6f3ea" stroke="' + k + '" stroke-width="3.5"/><circle cx="32" cy="32" r="7" fill="#ff5a4f" stroke="' + k + '" stroke-width="3.5"/>'),
    temporada:sv('<path d="M32 5l7.6 15.4 17 2.5-12.3 12 2.9 16.9L32 43.8 16.8 51.8l2.9-16.9-12.3-12 17-2.5z" fill="#a259f0" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><circle cx="32" cy="30" r="7" fill="#ffd23f" stroke="' + k + '" stroke-width="3"/>'),
    noticia:sv('<rect x="6" y="10" width="52" height="44" rx="5" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><rect x="13" y="18" width="18" height="14" fill="#3f8cff" stroke="' + k + '" stroke-width="3"/><path d="M36 20h15M36 28h15M13 40h38M13 47h28" stroke="' + k + '" stroke-width="3.5" stroke-linecap="round"/>'),
    graficos:sv('<rect x="5" y="10" width="54" height="36" rx="5" fill="#13203f" stroke="' + k + '" stroke-width="4"/><path d="M10 40l12-14 9 9 10-14 13 19z" fill="#2fbf5b" stroke="' + k + '" stroke-width="3" stroke-linejoin="round"/><path d="M24 54h16M32 46v8" stroke="' + k + '" stroke-width="4" stroke-linecap="round"/>'),
    audio:sv('<path d="M10 25h10l13-11v36L20 39H10z" fill="#f6f3ea" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M41 23c4 5 4 13 0 18M47 17c7 8 7 22 0 30" fill="none" stroke="#ffd23f" stroke-width="4.5" stroke-linecap="round"/>'),
    vibra:sv('<rect x="20" y="8" width="24" height="48" rx="5" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><path d="M10 22v20M54 22v20M4 28v8M60 28v8" stroke="#ffd23f" stroke-width="4" stroke-linecap="round"/>')
  };
})();
function v88Ic(nome){ return V88_IC[nome] || V88_IC.vazio; }

/* ---------------------------------------------------------------- 11) o avatar e o banner de um jogador (cosméticos da conta; sem eles, a tampinha) */
function v88AvatarEl(cartao, tam){
  const c = document.createElement('canvas'), px = Math.round((tam || 64)*Math.min(2, window.devicePixelRatio || 1));
  c.width = c.height = px; c.className = 'v88-av'; c.setAttribute('aria-hidden', 'true');
  try {
    const g = c.getContext('2d'), av = cartao && cartao.avatar, it = av && av !== 'av_tampinha' ? v88Item(av) : null;
    if (it && typeof v88DesenhaAvatar === 'function') v88DesenhaAvatar(g, px, it);
    else {
      const D = cartao && cartao.tampa && typeof tpLe === 'function' ? tpLe(cartao.tampa) : null;
      if (D && typeof tpMiniatura === 'function'){ const m = tpMiniatura(D, px); g.drawImage(m, 0, 0, px, px); }
      else if (typeof v88DesenhaAvatar === 'function') v88DesenhaAvatar(g, px, v88Item('av_bola'));
    }
  } catch (_) {}
  return c;
}
