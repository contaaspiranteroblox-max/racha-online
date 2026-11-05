'use strict';
/* =====================================================================================================================
   RACHA v107 · O CONVITE PELO CHAT no servidor das salas (o jogo: tools/v107/perfil.js — tocar no nome de alguém no chat
   abre a janelinha com PERFIL, CONVIDAR e DENUNCIAR). O pedido: convidar para a SUA sala quem escreveu no chat, mesmo quem
   ainda não é seu amigo — com regras contra o spam.
   cliente → servidor: convite {mid, canal?} — o número de uma mensagem RECENTE do chat que você viu: do Chat do Brasil
   (m123), do chat da sua sala ou da sua equipe (CODIGO-12) ou do chat do seu clube (k…). Sem o canal, ele sai do jeito do
   número. O servidor acha quem escreveu (só conta: o visitante não convida nem é convidado) e a conexão das salas dessa
   pessoa e aplica as regras de sempre dos convites, mais as do chat:
     · quem convida entrou com a conta, está numa sala (não a ranqueada, não cheia) e não está silenciado por denúncias (no
       Chat do Brasil ou na sala);
     · a mensagem é de até 15 min, não foi escondida pela moderação, não é do sistema e você podia ver (a da equipe, só o seu
       time; a do clube, só do seu clube; a da sala, só da sala em que você está);
     · nenhum dos dois bloqueou o outro; quem recebe está online nas salas, aparece online (mostrar status), recebe convites
       (Ajustes › Privacidade) e não está na sua sala;
     · os limites (por conta: reconectar não zera), para quem não é seu amigo dos dois lados: 1 a cada 10 s e 6 a cada 10 min
       de quem convida; a mesma pessoa, 1 a cada 2 min; quem recebe, no máximo 8 convites pelo chat a cada 10 min (somando
       todo mundo). E o balde de sempre de todos os convites (5 seguidos, depois 1 a cada 5 s).
   Depois é o caminho de sempre (social88.js): convite_recebido {…, via:'chat'} para quem recebe (ENTRAR ou RECUSAR, vale
   60 s), convite_enviado {id, para, tipo, nome, mid, via:'chat'} para quem chamou, convite_resposta e convite_resultado. Os
   amigos continuam também pelo ID (convite {para, tipo}).
   O ERRO é um texto só para tudo que depende de quem recebe ou da mensagem (offline, escondido, sem convites, o bloqueio de
   qualquer lado, sem conta, a mensagem velha, escondida ou que não existe, quem já recebeu convites demais): "Não deu para
   convidar essa pessoa agora." — o convite não conta nada que o chat já não mostra (e o erro não leva o ID de ninguém).
   Os textos que mudam são os de quem convida (sem conta, sem sala, a ranqueada, a sala cheia, silenciado, os limites) e o
   "já está na sua sala" (quem está na sala aparece na tela da sala).
   O jogo de antes (sem a v107) não manda o mid; o servidor de antes recebe o mid sem o para e responde "não está online".
   Nada aqui mexe na partida, na física, no chat (o que chega e quem vê) nem nas relações.
   ===================================================================================================================== */
const LIMITES = Object.freeze({
  mensagemMs:15*60e3,                                   // a mensagem vale para convidar por 15 min
  intervalo:10e3, janela:10*60e3, max:6,                // quem convida (quem não é amigo): 1 a cada 10 s e 6 a cada 10 min
  par:2*60e3,                                           // a mesma pessoa: 1 a cada 2 min
  alvoJanela:10*60e3, alvoMax:8                         // quem recebe: até 8 convites pelo chat a cada 10 min (de todo mundo)
});
const CONVITE_MS = 60000;                               // (o mesmo do social88.js: o convite vale 60 s)
const GENERICO = 'Não deu para convidar essa pessoa agora.';
const TEXTOS = Object.freeze({
  conta:'Entre na sua conta para convidar.', balde:'Calma: espere um pouco para convidar de novo.',
  semSala:'Crie ou entre numa sala para convidar.', ranqueada:'A ranqueada não recebe convidados.', cheia:'A sala está cheia.',
  silenciado:'Você está silenciado por denúncias: daqui a pouco você volta a convidar pelo chat.',
  naSala:'Essa pessoa já está na sua sala.', intervalo:'Calma: espere uns segundos para convidar de novo.',
  muitos:'Você já mandou muitos convites pelo chat. Espere uns minutos.', par:'Você já convidou essa pessoa agora há pouco.',
  generico:GENERICO
});
const CANAIS = ['brasil', 'sala', 'equipe', 'clube'];
const MID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const PUB_RE = /^\d{6,9}$/;
const MAX_CHAVES = 5000;                                // (o tamanho máximo de cada lista de limites na memória)
const pub6 = id => String(Number(id)).padStart(6, '0');
const pubDoId = id => (typeof id === 'string' && /^c\d{1,9}$/.test(id) ? pub6(id.slice(1)) : null);   // 'c123' → '000123' (as contas)

// o canal da mensagem: o que veio (se for um dos quatro) ou pelo jeito do número
function canalDe(mid, canal){
  if (typeof mid !== 'string' || !MID_RE.test(mid)) return null;
  if (CANAIS.includes(canal)) return canal;
  if (/^m\d{1,12}$/.test(mid)) return 'brasil';
  if (/^[A-Z0-9]{6}-\d{1,9}$/.test(mid)) return 'sala';
  if (/^k[0-9a-z]{2,30}$/.test(mid)) return 'clube';
  return null;
}
// as horas que ainda contam (as mais velhas que a janela saem)
function poda(lista, agora, janela){ while (lista.length && agora - lista[0] >= janela) lista.shift(); return lista; }

function aplica(Turma, o){
  o = o || {};
  const MAX = o.maxGente > 0 ? o.maxGente : 12, MAX_MAPA = o.maxGenteMapa > 0 ? o.maxGenteMapa : 20;
  const P = Turma.prototype;
  const conviteAntes = P.convite;
  P.convite = function(c, m){                            // com o mid: pelo chat; sem: o de sempre (os amigos, pelo ID)
    if (m && typeof m.mid === 'string') return this.convite107(c, m);
    return conviteAntes.apply(this, arguments);
  };
  P.c107 = function(){ return this.c107d || (this.c107d = {de:new Map(), par:new Map(), alvo:new Map(), podaT:0}); };
  P.c107Agora = function(){ return typeof this.agora === 'function' ? this.agora() : Date.now(); };
  P.c107Poda = function(agora){                          // a faxina dos limites (no máximo 1 vez por minuto) e o teto de cada lista
    const D = this.c107();
    if (agora - D.podaT < 60e3 && D.de.size + D.par.size + D.alvo.size < 3*MAX_CHAVES) return;
    D.podaT = agora;
    for (const [k, l] of D.de) if (!poda(l, agora, LIMITES.janela).length) D.de.delete(k);
    for (const [k, l] of D.alvo) if (!poda(l, agora, LIMITES.alvoJanela).length) D.alvo.delete(k);
    for (const [k, t] of D.par) if (agora - t >= LIMITES.par) D.par.delete(k);
    for (const M of [D.de, D.par, D.alvo]) while (M.size > MAX_CHAVES) M.delete(M.keys().next().value);
  };
  // quem escreveu a mensagem (o ID público da conta) — só o que quem convida podia ver; senão, null
  P.c107Autor = function(c, r, mid, canal){
    const agora = Date.now(), recente = x => x && typeof x.t === 'number' && agora - x.t <= LIMITES.mensagemMs && x.t <= agora + 60e3;
    if (canal === 'brasil'){
      const x = this.chat.msgs.find(y => y && y.id === mid);
      return x && !x.escondida && recente(x) ? pubDoId(x.from) : null;
    }
    if (canal === 'sala' || canal === 'equipe'){
      const x = r && (r.hist || []).find(y => y && y.mid === mid);
      if (!x || x.sys || x.escondida || !recente(x)) return null;
      if (typeof x.equipe === 'number' && this.v88TimeDe(r, c.id) !== x.equipe) return null;   // (a da equipe dos outros você nem viu)
      return pubDoId(x.id);
    }
    if (canal === 'clube'){
      const k = typeof this.v88Clube === 'function' ? this.v88Clube(c) : null;
      const h = k && this.b.d.clubeChat && this.b.d.clubeChat[k];
      const x = Array.isArray(h) ? h.find(y => y && y.mid === mid) : null;
      return x && !x.escondida && recente(x) && typeof x.de === 'string' && PUB_RE.test(x.de) ? pub6(x.de) : null;
    }
    return null;
  };
  P.convite107 = function(c, m){
    const mid = typeof m.mid === 'string' && MID_RE.test(m.mid) ? m.mid : '';
    const erro = motivo => this.manda(c, {type:'convite_erro', para:'', mid, via:'chat', motivo});
    if (!c.conta || !c.rel) return erro(TEXTOS.conta);
    if (!this.balde(c, 'convite', .2, 5)) return erro(TEXTOS.balde);   // (o mesmo balde do convite pelo ID)
    const canal = canalDe(mid, m.canal);
    if (!canal) return erro(GENERICO);
    const r = this.salaDe(c);
    if (!r) return erro(TEXTOS.semSala);
    if (r.ranked) return erro(TEXTOS.ranqueada);
    if (r.members.length >= (r.custom || r.rachao ? MAX_MAPA : MAX)) return erro(TEXTOS.cheia);
    const ja = Date.now();
    if ((this.chat.silencio.get(c.id) || 0) > ja || (r.silencio && r.silencio.get(c.id) || 0) > ja) return erro(TEXTOS.silenciado);
    const pub = this.c107Autor(c, r, mid, canal);
    if (!pub || pub === c.conta.idPublico) return erro(GENERICO);
    // os limites de quem convida vêm ANTES de olhar quem recebe: o "calma" nunca depende de a pessoa estar online (nada de
    // descobrir quem está por aí sem ela receber o convite). Amigo é quem está na sua lista (a assinada); amigo de um lado só
    // é conferido de novo embaixo, com a conexão dela
    const agora = this.c107Agora(), D = this.c107(); this.c107Poda(agora);
    const eu = c.conta.idPublico, kp = eu + '>' + pub;
    const limite = () => {
      const meus = poda(D.de.get(eu) || [], agora, LIMITES.janela);
      if (meus.length && agora - meus[meus.length - 1] < LIMITES.intervalo) return TEXTOS.intervalo;
      if (meus.length >= LIMITES.max) return TEXTOS.muitos;
      const tp = D.par.get(kp);
      if (tp != null && agora - tp < LIMITES.par) return TEXTOS.par;
      return '';
    };
    const amigoMeu = c.rel.amigos.has(pub);
    if (!amigoMeu){ const l = limite(); if (l) return erro(l); }
    const f = this.v88Conexao(pub);
    if (!f || f === c || !f.conta || !f.rel || f.substituido) return erro(GENERICO);
    if (this.salaDe(f) === r) return erro(TEXTOS.naSala);
    if (this.v88Bloqueado(c, f) || !f.rel.mostra || !f.rel.convites) return erro(GENERICO);
    const amigos = this.v88Amigos(c, f);
    if (!amigos){                                       // quem não é amigo (dos dois lados): os limites do chat
      if (amigoMeu){ const l = limite(); if (l) return erro(l); }
      const dele = poda(D.alvo.get(pub) || [], agora, LIMITES.alvoJanela);
      if (dele.length >= LIMITES.alvoMax) return erro(GENERICO);   // (quem recebe já teve convites demais: o mesmo texto de sempre)
      const meus = poda(D.de.get(eu) || [], agora, LIMITES.janela);
      meus.push(agora); D.de.delete(eu); D.de.set(eu, meus);
      D.par.delete(kp); D.par.set(kp, agora);
      dele.push(agora); D.alvo.delete(pub); D.alvo.set(pub, dele);
    }
    // o caminho de sempre (o mesmo do convite pelo ID, no social88.js): o convite novo vale no lugar do velho
    for (const [id, cv] of this.v88.convites) if (cv.de === c.id && cv.para === pub) this.v88.convites.delete(id);
    const id = 'cv' + (++this.v88.seqConvite);
    this.v88.convites.set(id, {id, de:c.id, para:pub, code:r.code, tipo:'sala', time:-1, ate:Date.now() + CONVITE_MS, via:'chat'});
    if (this.v88.convites.size > 2000) this.v88.convites.delete(this.v88.convites.keys().next().value);
    this.manda(f, {type:'convite_recebido', id, tipo:'sala', time:-1, via:'chat', amigo:amigos, de:{p:c.conta.idPublico, nome:c.nome, selo:c.selo || ''},
      sala:{code:r.code, nome:r.name, n:r.n, jogo:r.jogo, map:r.map, gente:r.members.filter(x => !x.bot).length, max:r.custom || r.rachao ? MAX_MAPA : MAX, state:r.state, pub:!!r.pub}, expira:CONVITE_MS});
    this.manda(c, {type:'convite_enviado', id, para:pub, tipo:'sala', nome:f.nome, mid, via:'chat'});
  };
  // o Dono zerou as contas (os números voltam a ser usados): os limites das contas velhas não passam para as novas
  if (typeof P.v88ZeraContas === 'function'){
    const zeraAntes = P.v88ZeraContas;
    P.v88ZeraContas = function(){ const out = zeraAntes.apply(this, arguments); this.c107d = null; return out; };
  }
}

module.exports = {aplica, LIMITES, TEXTOS, GENERICO, CONVITE_MS, canalDe, poda};
