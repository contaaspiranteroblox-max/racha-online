/* =====================================================================================================================
   RACHA v100 · A REVISÃO DE SEGURANÇA — o lado do jogo (as trocas de texto estão em tools/v100/v100.py)
   1) O SERVIDOR DO JOGO: o mesmo endereço do jogo (aberto pelo site ou pelo servidor das salas), o do config.js
      (RACHA_CONFIG.servidor) e os de RACHA_CONFIG.servidoresConfiaveis (outros servidores com o mesmo segredo da plataforma).
      O bilhete da conta (assinado pela plataforma: abre as salas como a conta) só vai para eles — em QUALQUER mensagem (o
      hello, a troca de amigos/bloqueios/cosméticos, o Chat do Brasil): para qualquer outro servidor, o jogo tira a conta da
      mensagem (lá ele entra como visitante, se aquele servidor aceitar).
   2) O BILHETE EM DIA: o bilhete vale 15 minutos. Antes de se apresentar ao servidor (o hello, o Chat do Brasil), o jogo pede um
      novo se o dele passou de 10 — o celular que voltou do segundo plano (os relógios param lá) volta com a conta, não como
      visitante (e não perde o lugar na sala).
   3) O CONVITE COM OUTRO SERVIDOR (?servidor= no link): o jogo pergunta antes de trocar (dizendo que a conta não vai junto)
      e só guarda a troca se a pessoa quiser; FICAR AQUI esquece o convite. O código da sala fica só na janela (a conexão
      daqui não entra numa sala com aquele código).
   ===================================================================================================================== */
const V100 = {erro:null, esperouBilhete:0};
function v100Host(u){ try { const n = normalizaServidor(u); return n ? new URL(n).host.toLowerCase() : ''; } catch (_) { return ''; } }
function v100Oficiais(){                                 // os servidores do jogo (o host de cada um)
  const l = [];
  try {
    if (/^https?:$/.test(location.protocol) && location.host) l.push(location.host.toLowerCase());
    if (SERVIDOR_DO_JOGO) l.push(v100Host(SERVIDOR_DO_JOGO));
    if (typeof BRASIL_FIXO === 'string' && BRASIL_FIXO) l.push(v100Host(BRASIL_FIXO));
    const c = window.RACHA_CONFIG || {};
    if (Array.isArray(c.servidoresConfiaveis)) for (const s of c.servidoresConfiaveis.slice(0, 10)) l.push(v100Host(String(s)));
  } catch (_) {}
  return l.filter(Boolean);
}
function v100Oficial(url){ const h = v100Host(url); return !!h && v100Oficiais().indexOf(h) >= 0; }
function v100Logado(){ try { return typeof v88Logado === 'function' ? !!v88Logado() : (typeof v70ContaLogada === 'function' && !!v70ContaLogada()); } catch (_) { return false; } }
function v100BilheteFresco(maxMs){ return V70ON.bilhete && Date.now() - V70ON.bilheteT < (maxMs || 12*60e3) ? V70ON.bilhete : null; }
// a mensagem que apresenta a conta (o hello, a entrada no Chat do Brasil): com o bilhete em dia — se o de agora passou de 10
// minutos, pede outro antes (até 4 s; sem resposta, vai sem a conta, como antes) · envia(o): manda a mensagem pronta
function v100ComBilhete(ws, msg, envia){
  const pronta = () => { const o = Object.assign({}, msg), b = v100BilheteFresco(); if (b) o.conta = b; else delete o.conta; return o; };
  if (v100BilheteFresco(10*60e3) || !v100Logado() || typeof v70PedeBilhete !== 'function') return envia(pronta());
  let foi = false;
  const vai = () => { if (foi) return; foi = true; if (!ws || ws.readyState !== 1) return; envia(pronta()); };
  V100.esperouBilhete++;
  Promise.resolve().then(() => v70PedeBilhete()).then(vai, vai);
  setTimeout(vai, 4000);
}

/* ---------------------------------------------------------------- 1) e 2) o bilhete da conta só para o servidor do jogo */
const v70HelloExtraAntes100 = v70HelloExtra;
v70HelloExtra = function(){
  const o = v70HelloExtraAntes100.apply(this, arguments) || {};
  try {
    const url = NET49.ws && NET49.ws.url;
    if (o.conta && !(url && v100Oficial(url))) delete o.conta;
  } catch (e) { delete o.conta; V100.erro = String(e && e.message || e); }
  return o;
};
const net49SendAntes100 = net49Send;                     // (todas as mensagens das salas passam por aqui)
net49Send = function(m){
  if (!m || typeof m !== 'object' || (!m.conta && m.type !== 'hello')) return net49SendAntes100.apply(this, arguments);   // (o comando da partida, 60 por segundo: direto)
  let msg = m;
  try {
    if (msg && typeof msg === 'object'){
      const ws = NET49.ws, oficial = !!(ws && ws.url && v100Oficial(ws.url));
      if (msg.conta && !oficial){ msg = Object.assign({}, msg); delete msg.conta; }
      if (msg.type === 'hello' && oficial){ const self = this; return v100ComBilhete(ws, msg, o => net49SendAntes100.call(self, o)); }
    }
  } catch (e) { V100.erro = String(e && e.message || e); if (msg && msg.conta){ msg = Object.assign({}, msg); delete msg.conta; } }
  return net49SendAntes100.call(this, msg);
};
const brasilSendAntes100 = brasilSend;                   // (o Chat do Brasil: a outra conexão)
brasilSend = function(m){
  if (!m || typeof m !== 'object' || (!m.conta && m.type !== 'brasil_join')) return brasilSendAntes100.apply(this, arguments);
  let msg = m;
  try {
    if (msg && typeof msg === 'object'){
      const ws = BRASIL.ws, oficial = !!(ws && ws.url && v100Oficial(ws.url));
      if (msg.conta && !oficial){ msg = Object.assign({}, msg); delete msg.conta; }
      // (a entrada no chat leva a conta: com o servidor das salas em outro endereço, sem a sessão do site, o chat sabe quem é —
      //  o clube, os bloqueios — pelo bilhete, não pelo token do aparelho)
      if (msg.type === 'brasil_join' && oficial){ const self = this; return v100ComBilhete(ws, msg, o => brasilSendAntes100.call(self, o)); }
    }
  } catch (e) { V100.erro = String(e && e.message || e); if (msg && msg.conta){ msg = Object.assign({}, msg); delete msg.conta; } }
  return brasilSendAntes100.call(this, msg);
};

/* ---------------------------------------------------------------- 3) o convite com outro servidor: pergunta antes */
function v100ConviteServidor(){                          // true = pode seguir com o convite agora · false = esperando a resposta
  const u = SL.servidorConvite; if (!u) return true;
  SL.servidorConvite = null;
  const host = v100Host(u);
  if (!host || host === v100Host(servidorEndereco())) return true;   // (o servidor de agora: nada a trocar)
  const oficial = v100Oficial(u), codigo = SL.convite || '';
  SL.convite = '';                                       // (o código fica só aqui: a conexão daqui não entra numa sala com ele)
  abrePop(c => {
    c.append(nodo('span', 'pop-tag', 'CONVITE'), nodo('h2', null, 'OUTRO SERVIDOR'),
      nodo('p', 'pop-txt', oficial
        ? 'Este convite é de uma sala em outro servidor do RACHA (' + host + '). Trocar para ele?'
        : 'Este convite é de uma sala no servidor ' + host + ', que não é o servidor do RACHA. A sua conta não vai junto: lá você entra sem ela. Só troque se conhece quem mandou o link.'));
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('FICAR AQUI', '', () => { som.clique(); fechaPop(); }),
      botaoPop('TROCAR DE SERVIDOR', 'amarelo', () => {
        som.clique();
        try { localStorage.setItem('streetball-server', normalizaServidor(u)); } catch (_) {}
        // (abre de novo: a primeira conexão já vai para o servidor novo, e o convite entra na sala de lá; o resto do endereço fica)
        const q = new URLSearchParams(location.search); q.delete('servidor'); if (codigo) q.set('sala', codigo);
        location.replace(location.pathname + (q.toString() ? '?' + q : '') + location.hash);
      }));
    c.appendChild(a);
  });
  return false;
}
const slEntrarConviteAntes100 = slEntrarConvite;
slEntrarConvite = function(){
  try {
    if (SL.servidorConvite && !(typeof ONB !== 'undefined' && (ONB.aberto || ONB.aquece)) && LB.pop.hidden){
      if (!v100ConviteServidor()) return;
    } else if (SL.servidorConvite) return;              // (a primeira vez ou outra janela na frente: o onbFim chama de novo)
  } catch (e) { V100.erro = String(e && e.message || e); return; }
  return slEntrarConviteAntes100.apply(this, arguments);
};
const filaPopsAntes100 = filaPops;                       // (a janela da frente fechou: o convite que esperava aparece)
filaPops = function(){
  const r = filaPopsAntes100.apply(this, arguments);
  try { if (SL.servidorConvite && LB.pop.hidden && !(typeof ONB !== 'undefined' && (ONB.aberto || ONB.aquece))) slEntrarConvite(); } catch (_) {}
  return r;
};

window.RachaSeguranca100 = {oficiais:v100Oficiais, oficial:v100Oficial, estado:() => ({convite:SL.servidorConvite || null, erro:V100.erro, esperouBilhete:V100.esperouBilhete})};
