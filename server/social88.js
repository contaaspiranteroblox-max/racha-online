'use strict';
/* =====================================================================================================================
   RACHA · v88 — o lado SOCIAL do servidor da turma, ao vivo (as contas, os amigos e os bloqueios moram na plataforma):
     · STATUS DOS AMIGOS: online, na sala, procurando partida, em partida (com a sala pública para assistir) — só entre
       amigos dos dois lados, e nunca de quem desligou "mostrar status online" (essa conta aparece offline);
     · CONVITES em tempo real: chamar um amigo para a sua sala ou para o seu time (ele aceita e entra na hora);
     · CHAT DOS AMIGOS (mensagem direta), CHAT DO CLUBE e CHAT DA EQUIPE (só o seu time, na sala), com o mesmo filtro, o mesmo
       limite e a mesma trava contra a mensagem repetida dos outros chats, e um histórico curto (7 dias, as últimas 40/60);
     · BLOQUEIO no servidor: quem você bloqueou (ou bloqueou você) não aparece no seu chat, não convida e não manda mensagem;
     · DENÚNCIA de mensagem com motivo: vai para a plataforma (a tabela do RACHA CONTROL) quando ela está montada aqui; sem
       ela, fica anotada na memória e no registro (log) do servidor;
     · o AVISO na hora da plataforma (pedido de amizade, convite de clube, carta nova) e as RELAÇÕES que mudaram;
     · o selo do resultado com quem jogou junto (g) e o melhor da partida (v), e o placar das salas em jogo na lista (assistir).
   De onde vêm as relações: montado na plataforma, a própria sessão traz (e a plataforma avisa quando mudam); separado dela,
   elas vêm assinadas no bilhete da conta (a, b, o, c, k, q) e o jogo manda um bilhete novo depois de mudar um amigo
   ({type:'relacoes', conta}). Nada aqui mexe na partida: as salas, a física, a fila e os resultados continuam como antes.
   ===================================================================================================================== */
const {limpa, confere} = require('./banco');

const PUB_RE = /^\d{6,9}$/;
const HIST_DM = 40, HIST_CLUBE = 60, DIAS_HIST = 7;
const CONVITE_MS = 60000;
const MOTIVOS = ['trapaca', 'toxico', 'ofensa', 'spam', 'nome', 'bug', 'outro'];
const pub6 = id => String(Number(id)).padStart(6, '0');
const pubDoId = id => (typeof id === 'string' && /^c\d{1,9}$/.test(id) ? pub6(id.slice(1)) : null);   // 'c123' → '000123' (as contas)

// (preenchidos pela turma.js: o tamanho máximo da sala e o filtro dos chats — os mesmos dela)
let MAX_GENTE_SALA = 12, FILTRADO = () => false;
function configura(o){ if (o.maxGente) MAX_GENTE_SALA = o.maxGente; if (typeof o.filtrado === 'function') FILTRADO = o.filtrado; }

function relVazia(){ return {amigos:new Set(), bloq:new Set(), mostra:true, convites:true, clube:null, cos:{}}; }
function relDe(o){                                        // {amigos, bloqueios, mostraOnline, aceitaConvites, clube, cos} ou o bilhete (a, b, o, c, k, q)
  const r = relVazia();
  if (!o || typeof o !== 'object') return r;
  const lista = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && PUB_RE.test(x)).slice(0, 300) : []);
  for (const p of lista(o.amigos || o.a)) r.amigos.add(pub6(p));
  for (const p of lista(o.bloqueios || o.b)) r.bloq.add(pub6(p));
  r.mostra = o.mostraOnline !== undefined ? !!o.mostraOnline : o.o !== 0;
  r.convites = o.aceitaConvites !== undefined ? !!o.aceitaConvites : o.c !== 0;
  const k = o.clube !== undefined ? o.clube : o.k;
  r.clube = typeof k === 'string' && /^[pk]\w{1,20}$/.test(k) ? k : null;
  const q = o.cos || o.q;
  if (q && typeof q === 'object') for (const [t, v] of Object.entries(q)) if (/^[a-z]{3,12}$/.test(t) && typeof v === 'string' && /^[a-z0-9_]{2,40}$/.test(v)) r.cos[t] = v;
  return r;
}
const relDoBilhete = o => (o ? {a:o.a, b:o.b, o:o.o, c:o.c, k:o.k, q:o.q} : null);

function aplica(Turma){
  const P = Turma.prototype;

  P.v88Inicia = function(o){
    this.relacoesDe = typeof o.relacoesDe === 'function' ? o.relacoesDe : null;
    this.denunciaCb = typeof o.denuncia === 'function' ? o.denuncia : null;
    this.v88 = {convites:new Map(), seqConvite:0, marcados:new Set(), marcaT:null, seqDm:0, seqClube:0, denMem:[], podaT:0};
    const d = this.b.d;
    if (!d.dms || typeof d.dms !== 'object') d.dms = {};
    if (!d.clubeChat || typeof d.clubeChat !== 'object') d.clubeChat = {};
  };
  const pubDe = c => (c && c.conta ? c.conta.idPublico : c && c.brasilConta ? pubDoId(c.brasilConta) : null);
  P.v88Conexao = function(pub){ return this.porId.get('c' + Number(pub)) || null; };
  P.v88Cos = function(c){ return c && c.rel ? c.rel.cos : {}; };
  // são amigos dos dois lados? (montado na plataforma as listas vêm do mesmo banco; pelo bilhete, cada lado mostra a sua)
  P.v88Amigos = function(a, b){
    const pa = pubDe(a), pb = pubDe(b);
    return !!(pa && pb && a.rel && b.rel && a.rel.amigos.has(pb) && b.rel.amigos.has(pa));
  };
  P.v88Bloqueado = function(a, b){                        // um bloqueou o outro (qualquer um dos lados)?
    const pa = pubDe(a), pb = pubDe(b);
    if (!pa || !pb || pa === pb) return false;
    return !!((a.rel && a.rel.bloq.has(pb)) || (b.rel && b.rel.bloq.has(pa)));
  };
  P.v88BloqueadoPub = function(dest, pub){                // o destino e a conta pub (que talvez nem esteja online) se bloquearam?
    if (!dest || !pub) return false;
    const dp = pubDe(dest);
    if (!dp || dp === pub) return false;
    if (dest.rel && dest.rel.bloq.has(pub)) return true;
    const rem = this.v88Conexao(pub);
    return !!(rem && rem.rel && rem.rel.bloq.has(dp));
  };

  /* ---------------------------------------------------------------- entrou (o hello) e as relações */
  P.v88Entrou = function(c, conta){
    if (!c.conta) return;
    if (conta && conta.rel){ c.rel = relDe(conta.rel); return this.v88Relacoes(c, null); }
    c.rel = relVazia();
    if (this.relacoesDe){                                // montado na plataforma sem as relações na sessão: pergunta ao banco
      const pub = c.conta.idPublico;
      Promise.resolve().then(() => this.relacoesDe(pub)).then(r => {
        if (r && this.porId.get(c.id) === c){ c.rel = relDe(r); this.v88Relacoes(c, null); }
      }).catch(e => this.log('relações de ' + pub + ': ' + (e && e.message || e)));
      return;
    }
    this.v88Relacoes(c, null);
  };
  P.v88Lista = function(c){                               // a lista dos amigos online (com o status de cada um) para c
    if (!c.conta || !c.rel) return;
    const lista = [];
    for (const p of c.rel.amigos){
      const f = this.v88Conexao(p);
      if (f && f !== c && this.v88Amigos(c, f) && f.rel.mostra && !this.v88Bloqueado(c, f)) lista.push(Object.assign({p}, this.v88StatusDe(f)));
    }
    this.manda(c, {type:'amigos_status', lista, mostra:c.rel.mostra, convites:c.rel.convites});
  };
  // as relações de c mudaram (ou acabaram de chegar): a lista para ele, o status dele para os amigos, o cartão da sala
  P.v88Relacoes = function(c, antes){
    if (!c.conta || !c.rel) return;
    this.v88Lista(c);
    c.v88st = null;
    this.v88Avisa(c, true);
    if (antes){                                          // quem deixou de ser amigo (ou foi bloqueado) passa a ver offline
      for (const p of antes){
        if (c.rel.amigos.has(p) && !c.rel.bloq.has(p)) continue;
        const f = this.v88Conexao(p); if (f) this.manda(f, {type:'amigo_status', p:c.conta.idPublico, st:'offline'});
      }
    }
    const r = this.salaDe(c), eu = r && r.members.find(x => x.id === c.id);
    if (eu && JSON.stringify(eu.cos || {}) !== JSON.stringify(c.rel.cos || {})){ eu.cos = c.rel.cos; this.salaMuda(r); }
  };
  P.atualizaRelacoes = function(pub, r){                  // (a plataforma montada aqui: amizade, bloqueio, privacidade ou cosmético mudou)
    const id = 'c' + Number(pub), novo = relDe(r);
    for (const x of this.clientes) if (x.brasil && x.brasilConta === id) x.rel = novo;   // (a conexão do Chat do Brasil também)
    const c = this.porId.get(id); if (!c || !c.conta) return;
    const antes = c.rel ? [...c.rel.amigos] : [];
    c.rel = novo;
    this.v88Relacoes(c, antes);
  };
  P.relacoes = function(c, m){                            // (separado da plataforma: o jogo manda o bilhete novo depois de mudar um amigo)
    if (!c.conta) return;
    if (!this.balde(c, 'relacoes', .2, 5)) return this.manda(c, {type:'relacoes_ok', ok:false});
    const o = confere(this.segredo, m.conta);
    if (!o || pub6(o.p) !== c.conta.idPublico || this.v881BilheteVelho(o)) return this.manda(c, {type:'relacoes_ok', ok:false});   // v88.1: + o bilhete de antes do zerar
    const antes = c.rel ? [...c.rel.amigos] : [];
    c.rel = relDe(relDoBilhete(o));
    for (const x of this.clientes) if (x.brasil && x.brasilConta === c.id) x.rel = c.rel;
    this.v88Relacoes(c, antes);
    this.manda(c, {type:'relacoes_ok', ok:true});
  };
  P.avisaConta = function(pub, msg){                      // o aviso na hora (a plataforma montada aqui)
    const c = this.v88Conexao(pub);
    if (!c || !msg || typeof msg !== 'object') return false;
    return this.manda(c, Object.assign({}, msg, {type:'conta_aviso'}));
  };
  P.amigos_status = function(c){ if (c.conta && c.rel && this.balde(c, 'amigos88', .5, 4)) this.v88Lista(c); };

  /* ---------------------------------------------------------------- v88.1: o Dono ZEROU AS CONTAS (RACHA CONTROL › Contas)
     Os números das contas apagadas voltam a ser usados pelas contas novas (000002, 000003…): nada da conta velha pode passar
     para a nova. As conexões delas caem (a sessão foi apagada: para voltar, só entrando com uma conta que existe) e saem daqui
     os troféus da turma, os duelos, os convites, o histórico dos chats (amigos, clube, Brasil, salas), os lugares guardados
     nas salas e nas partidas, a fila e o silêncio do chat. O bilhete assinado ANTES do zerar não vale mais (o número dele
     pode ser de outra pessoa agora). `manter`: os números que continuam (o Dono). */
  P.v88ZeraContas = function(manter, em){
    const fica = new Set((Array.isArray(manter) ? manter : []).filter(p => /^\d{1,9}$/.test(String(p))).map(p => 'c' + Number(p)));
    const sai = id => typeof id === 'string' && /^c\d{1,9}$/.test(id) && !fica.has(id);
    const saiPub = p => PUB_RE.test(String(p)) && sai('c' + Number(p));
    const d = this.b.d;
    let caiu = 0;
    d.zeradoEm = Math.max(d.zeradoEm || 0, Number(em) || Date.now());
    // 1) as conexões das contas apagadas: saem da sala e da partida (sem guardar o lugar), dos amigos e caem
    for (const c of [...this.clientes]){
      const conta = c.id || (c.contaSessao ? 'c' + Number(c.contaSessao.idPublico) : null);
      if (!sai(conta) && !sai(c.brasilConta)) continue;
      try { if (c.sala) this.sai(c, 'saiu'); } catch (_) {}
      try { this.auto.sair(c, false); } catch (_) {}
      try { if (c.id && this.filaEsp.get(c.id) && this.filaEsp.get(c.id).c === c) this.filaEsp.delete(c.id); } catch (_) {}
      this.erro(c, 'Esta conta não existe mais no RACHA. Entre com a sua conta nova.', 'conta_apagada');
      try { this.fechou(c); } catch (_) {}
      try { c.ws.close(4003, 'conta apagada'); } catch (_) {}
      caiu++;
    }
    // 2) o que fica guardado (o arquivo da turma)
    for (const id of Object.keys(d.gente)) if (sai(id)) delete d.gente[id];
    for (const [h, id] of Object.entries(d.tokens)) if (sai(id)) delete d.tokens[h];
    for (const [k, du] of Object.entries(d.duelos)) if (sai(du && du.a) || sai(du && du.b)) delete d.duelos[k];
    d.convites = d.convites.filter(v => !sai(v.para) && !sai(v.de));
    for (const cl of Object.values(d.clubes)){
      cl.membros = (cl.membros || []).filter(m => !sai(m.id));
      if (!cl.membros.length){ delete d.clubes[cl.id]; d.convites = d.convites.filter(v => v.clube !== cl.id); continue; }
      if (sai(cl.dono)){ cl.dono = cl.membros[0].id; cl.membros[0].papel = 'dono'; }
    }
    for (const g of Object.values(d.gente)) if (g.clube && !d.clubes[g.clube]) g.clube = null;
    for (const k of Object.keys(d.dms)) if (k.split('|').some(saiPub)) delete d.dms[k];
    for (const [k, h] of Object.entries(d.clubeChat)){
      const resto = (Array.isArray(h) ? h : []).filter(x => !(x && saiPub(x.de)) && !(x && sai(x.de)));
      if (resto.length) d.clubeChat[k] = resto; else delete d.clubeChat[k];
    }
    // 3) o que vive na memória: as salas (reservas, banidos, o histórico), o Chat do Brasil, as partidas, os convites, a fila
    for (const r of this.salas.values()){
      for (const id of [...r.reservas.keys()]) if (sai(id)) r.reservas.delete(id);
      for (const id of [...r.removidos.keys()]) if (sai(id)) r.removidos.delete(id);
      r.hist = (r.hist || []).filter(x => !(x && sai(x.id)));
    }
    this.chat.msgs = this.chat.msgs.filter(x => !(x && sai(x.from)));
    for (const id of [...this.chat.silencio.keys()]) if (sai(id)) this.chat.silencio.delete(id);
    for (const id of [...this.auto.porJogador.keys()]) if (sai(id)) { try { this.auto.sair({id}, false); } catch (_) {} this.auto.porJogador.delete(id); }
    for (const id of [...this.filaEsp.keys()]) if (sai(id)) this.filaEsp.delete(id);
    for (const [id, cv] of this.v88.convites) if (sai(cv.de) || saiPub(cv.para)) this.v88.convites.delete(id);
    if (this.clubes && this.clubes.limites) for (const k of [...this.clubes.limites.keys()]) if (sai(String(k).split(':').pop())) this.clubes.limites.delete(k);
    // 4) quem fica (o Dono) deixa de ter amigos e bloqueios apagados na lista
    for (const c of this.clientes) if (c.rel){
      for (const p of [...c.rel.amigos]) if (saiPub(p)) c.rel.amigos.delete(p);
      for (const p of [...c.rel.bloq]) if (saiPub(p)) c.rel.bloq.delete(p);
      if (c.conta && this.porId.get(c.id) === c){ try { this.v88Lista(c); } catch (_) {} }
    }
    this.b.marca(); this.b.salvaJa();
    this.listaMudou();
    this.log('as contas foram zeradas: ' + caiu + ' conexão(ões) fechada(s); ficaram ' + fica.size + ' conta(s)');
    return {caiu};
  };
  // o bilhete foi assinado antes do ZERAR CONTAS? (o "t" é quando a plataforma assinou; os antigos vencem 30 min depois)
  P.v881BilheteVelho = function(o){
    const z = this.b && this.b.d && this.b.d.zeradoEm || 0;
    if (!z || !o) return false;
    const emitido = typeof o.t === 'number' ? o.t : typeof o.e === 'number' ? o.e - 30*60e3 : 0;
    return emitido <= z;
  };
  const bilheteAntes881 = P.bilhete;
  P.bilhete = function(txt){
    const b = bilheteAntes881.call(this, txt);
    if (!b || !(this.b && this.b.d && this.b.d.zeradoEm)) return b;
    return this.v881BilheteVelho(confere(this.segredo, txt)) ? null : b;
  };

  /* ---------------------------------------------------------------- o status (online, sala, buscando, partida) */
  P.v88StatusDe = function(c){
    const r = this.salaDe(c);
    if (r){
      const publica = r.pub && !r.ranked, gente = r.members.filter(x => !x.bot).length;
      const sala = {code:publica ? r.code : null, nome:r.ranked ? 'Ranqueada' : r.name, n:r.n, jogo:r.jogo, map:r.map, ranked:!!r.ranked, pub:!!r.pub,
        gente, max:MAX_GENTE_SALA, assistir:!!(publica && r.state === 'playing' && gente < MAX_GENTE_SALA)};
      return {st:r.state === 'playing' ? 'partida' : 'sala', sala};
    }
    if (this.filaEsp.has(c.id)) return {st:'buscando'};
    return {st:'online'};
  };
  const chaveStatus = s => s.st + (s.sala ? '|' + s.sala.code + '|' + s.sala.nome + '|' + s.sala.ranked + '|' + s.sala.assistir + '|' + s.sala.n + '|' + s.sala.jogo : '');
  P.v88Avisa = function(c, forca){                        // o status de c mudou? avisa os amigos (dos dois lados) que estão online
    if (!c || !c.conta || !c.rel) return;
    const s = c.rel.mostra ? this.v88StatusDe(c) : {st:'offline'};
    const k = chaveStatus(s);
    if (!forca && c.v88st === k) return;
    c.v88st = k;
    for (const p of c.rel.amigos){
      const f = this.v88Conexao(p);
      if (f && f !== c && this.v88Amigos(c, f)) this.manda(f, Object.assign({type:'amigo_status', p:c.conta.idPublico}, this.v88Bloqueado(c, f) ? {st:'offline'} : s));
    }
  };
  P.v88Marca = function(c){                               // junta as mudanças (a sala muda várias vezes seguidas): avisa daqui a pouco
    if (!c || !c.conta) return;
    this.v88.marcados.add(c);
    if (this.v88.marcaT) return;
    this.v88.marcaT = setTimeout(() => {
      this.v88.marcaT = null;
      const l = [...this.v88.marcados]; this.v88.marcados.clear();
      for (const x of l) if (this.porId.get(x.id) === x) this.v88Avisa(x, false);
    }, 250);
    if (this.v88.marcaT.unref) this.v88.marcaT.unref();
  };
  P.v88MarcaSala = function(r){ for (const m of r.members){ const c = !m.bot && this.porId.get(m.id); if (c) this.v88Marca(c); } };
  P.v88Saiu = function(c){                                // fechou a conexão: os amigos veem offline e os convites dele acabam
    if (!c || !c.conta || !c.rel || c.substituido) return;
    for (const p of c.rel.amigos){
      const f = this.v88Conexao(p);
      if (f && f !== c && this.v88Amigos(c, f)) this.manda(f, {type:'amigo_status', p:c.conta.idPublico, st:'offline'});
    }
    for (const [id, cv] of this.v88.convites) if (cv.de === c.id || cv.para === c.conta.idPublico) this.v88.convites.delete(id);
  };

  /* ---------------------------------------------------------------- os convites (para a sala ou para o time) */
  P.convite = function(c, m){
    const para = typeof m.para === 'string' && PUB_RE.test(m.para) ? pub6(m.para) : null;
    const erro = motivo => this.manda(c, {type:'convite_erro', para:para || '', motivo});
    if (!c.conta || !c.rel) return erro('Entre na sua conta para convidar amigos.');
    if (!this.balde(c, 'convite', .2, 5)) return erro('Calma: espere um pouco para convidar de novo.');
    const f = para && this.v88Conexao(para);
    if (!f || !f.conta || !f.rel || !f.rel.mostra) return erro('Esse amigo não está online agora.');   // (quem esconde o status aparece offline também aqui)
    if (!this.v88Amigos(c, f) || this.v88Bloqueado(c, f)) return erro('Só dá para convidar amigos.');
    if (!f.rel.convites) return erro('Esse amigo não está recebendo convites agora.');
    const r = this.salaDe(c);
    if (!r) return erro('Crie ou entre numa sala para convidar.');
    if (r.ranked) return erro('A ranqueada não recebe convidados.');
    if (r.members.length >= MAX_GENTE_SALA) return erro('A sala está cheia.');
    if (this.salaDe(f) === r) return erro('Esse amigo já está na sua sala.');
    const tipo = m.tipo === 'equipe' ? 'equipe' : 'sala';
    const eu = r.members.find(x => x.id === c.id);
    const time = eu && eu.slot >= 0 ? Math.floor(eu.slot / r.n) : -1;
    if (tipo === 'equipe' && time < 0) return erro('Entre num time para chamar alguém para ele.');
    for (const [id, cv] of this.v88.convites) if (cv.de === c.id && cv.para === para) this.v88.convites.delete(id);   // (o convite novo vale no lugar do velho)
    const id = 'cv' + (++this.v88.seqConvite);
    this.v88.convites.set(id, {id, de:c.id, para, code:r.code, tipo, time, ate:Date.now() + CONVITE_MS});
    if (this.v88.convites.size > 2000) this.v88.convites.delete(this.v88.convites.keys().next().value);
    this.manda(f, {type:'convite_recebido', id, tipo, time, de:{p:c.conta.idPublico, nome:c.nome, selo:c.selo || ''},
      sala:{code:r.code, nome:r.name, n:r.n, jogo:r.jogo, map:r.map, gente:r.members.filter(x => !x.bot).length, max:MAX_GENTE_SALA, state:r.state, pub:!!r.pub}, expira:CONVITE_MS});
    this.manda(c, {type:'convite_enviado', id, para, tipo, nome:f.nome});
  };
  P.convite_resposta = function(c, m){
    const cv = typeof m.id === 'string' && this.v88.convites.get(m.id);
    if (!cv || !c.conta || cv.para !== c.conta.idPublico) return this.manda(c, {type:'convite_erro', motivo:'Esse convite não vale mais.'});
    this.v88.convites.delete(cv.id);
    const de = this.porId.get(cv.de), r = this.salas.get(cv.code);
    if (cv.ate < Date.now() || !r) return this.manda(c, {type:'convite_erro', motivo:'Esse convite venceu (ou a sala fechou).'});
    if (de) this.manda(de, {type:'convite_resultado', id:cv.id, aceita:!!m.aceita, p:c.conta.idPublico, nome:c.nome});
    if (!m.aceita) return;
    if (this.filaEsp.has(c.id)) this.filaSai(c);
    let slot;
    if (cv.tipo === 'equipe' && cv.time >= 0 && r.state !== 'playing' && !r.tournament){ const s = this.livre(r, cv.time); if (s >= 0) slot = s; }
    this.join(c, slot !== undefined ? {code:r.code, slot} : {code:r.code, rapido:r.state !== 'playing', spectate:r.state === 'playing'});
    this.v88Marca(c);
  };

  /* ---------------------------------------------------------------- o texto dos chats novos (o mesmo cuidado dos outros) */
  P.v88Texto = function(c, t, chave){                     // tamanho, ritmo, repetida e filtro (palavrão, link, @, telefone, e-mail, CPF)
    t = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
    if (!t) return {erro:'vazia'};
    if (Array.from(t).length > 160) return {erro:'longa'};
    if (!this.balde(c, 'fala88', 1, 4)) return {erro:'ritmo'};
    const agora = Date.now();
    c.v88ult = c.v88ult || {};
    const u = c.v88ult[chave];
    if (u && u.t === t.toLowerCase() && agora - u.em < 30000) return {erro:'repetida'};
    if (FILTRADO(t)) return {erro:'filtro'};
    c.v88ult[chave] = {t:t.toLowerCase(), em:agora};
    return {texto:limpa(t, 160)};
  };

  /* ---------------------------------------------------------------- o chat dos amigos (mensagem direta) */
  const parDm = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  P.dm = function(c, m){
    const para = typeof m.para === 'string' && PUB_RE.test(m.para) ? pub6(m.para) : null;
    const erro = reason => this.manda(c, {type:'dm_erro', reason, para:para || ''});
    if (!c.conta || !c.rel) return erro('conta');
    if (!para || para === c.conta.idPublico || !c.rel.amigos.has(para) || c.rel.bloq.has(para)) return erro('amigo');
    const f = this.v88Conexao(para);
    if (f && (!this.v88Amigos(c, f) || this.v88Bloqueado(c, f))) return erro('amigo');
    const t = this.v88Texto(c, m.texto, 'dm:' + para);
    if (t.erro) return erro(t.erro);
    const k = parDm(c.conta.idPublico, para), d = this.b.d.dms, agora = Date.now();
    const msg = {mid:'d' + agora.toString(36) + (++this.v88.seqDm), de:c.conta.idPublico, nome:c.nome, para, texto:t.texto, t:agora};
    const h = d[k] || (d[k] = []); h.push(msg);
    const corte = agora - DIAS_HIST*864e5;
    while (h.length > HIST_DM || (h.length && h[0].t < corte)) h.shift();
    this.b.marca();
    this.manda(c, Object.assign({type:'dm'}, msg));
    if (f) this.manda(f, Object.assign({type:'dm'}, msg));
  };
  P.dm_hist = function(c, m){
    if (!c.conta || !c.rel || !this.balde(c, 'hist88', 2, 10)) return;
    const com = typeof m.com === 'string' && PUB_RE.test(m.com) ? pub6(m.com) : null;
    if (!com || !c.rel.amigos.has(com) || c.rel.bloq.has(com)) return this.manda(c, {type:'dm_hist', com, lista:[]});
    const corte = Date.now() - DIAS_HIST*864e5;
    const lista = (this.b.d.dms[parDm(c.conta.idPublico, com)] || []).filter(x => x.t >= corte && !x.escondida).slice(-30);
    this.manda(c, {type:'dm_hist', com, lista});
  };

  /* ---------------------------------------------------------------- o chat do clube (com conta: o clube da plataforma; sem: o da turma) */
  P.v88Clube = function(c){
    if (c.rel && c.rel.clube) return c.rel.clube;
    const k = c.id && this.clubes && this.clubes.clubeDe ? this.clubes.clubeDe(c.id) : null;
    return k ? String(k.id) : null;
  };
  P.clube_say = function(c, m){
    const erro = reason => this.manda(c, {type:'clube_erro', reason});
    const k = this.v88Clube(c); if (!k) return erro('sem_clube');
    const t = this.v88Texto(c, m.texto, 'clube'); if (t.erro) return erro(t.erro);
    const agora = Date.now();
    const msg = {mid:'k' + agora.toString(36) + (++this.v88.seqClube), de:c.conta ? c.conta.idPublico : c.id, nome:c.nome, selo:c.selo || '', texto:t.texto, t:agora};
    const d = this.b.d.clubeChat, h = d[k] || (d[k] = []); h.push(msg);
    const corte = agora - DIAS_HIST*864e5;
    while (h.length > HIST_CLUBE || (h.length && h[0].t < corte)) h.shift();
    this.b.marca();
    const txt = JSON.stringify(Object.assign({type:'clube_msg', clube:k}, msg));
    for (const x of this.porId.values()) if (this.v88Clube(x) === k && (x === c || !this.v88Bloqueado(c, x))) this.mandaTxt(x, txt);
  };
  P.clube_hist = function(c){
    if (!this.balde(c, 'hist88', 2, 10)) return;
    const k = this.v88Clube(c);
    const corte = Date.now() - DIAS_HIST*864e5;
    const lista = k ? (this.b.d.clubeChat[k] || []).filter(x => x.t >= corte && !x.escondida && !(PUB_RE.test(x.de) && this.v88BloqueadoPub(c, x.de))).slice(-30) : [];
    this.manda(c, {type:'clube_hist', clube:k, lista});
  };

  /* ---------------------------------------------------------------- o chat da sala: a equipe, o bloqueio e o histórico sem o que foi escondido */
  P.v88TimeDe = function(r, id){ const x = r.members.find(y => y.id === id); return x && x.slot >= 0 ? Math.floor(x.slot / r.n) : -1; };
  P.v88DizSala = function(r, msg, de){                    // a fala de um jogador: guarda e entrega (a equipe só ao time; sem quem bloqueou)
    r.hist.push(msg); if (r.hist.length > 40) r.hist.shift();
    const txt = JSON.stringify(msg), equipe = typeof msg.equipe === 'number' ? msg.equipe : -1;
    for (const x of r.members){
      if (x.bot) continue;
      if (equipe >= 0 && !(x.slot >= 0 && Math.floor(x.slot / r.n) === equipe)) continue;
      const cl = this.porId.get(x.id); if (!cl || cl.sala !== r.code) continue;
      if (cl !== de && this.v88Bloqueado(cl, de)) continue;
      this.mandaTxt(cl, txt);
    }
  };
  P.v88HistSala = function(c, r){                         // o histórico da sala para quem entra: sem o texto escondido, sem bloqueados, sem a equipe dos outros
    const meu = this.v88TimeDe(r, c.id), out = [];
    for (const x of r.hist.slice(-40)){
      if (!x) continue;
      if (typeof x.equipe === 'number' && x.equipe !== meu) continue;
      const pub = pubDoId(x.id);
      if (pub && !x.sys && this.v88BloqueadoPub(c, pub)) continue;
      out.push(x.escondida ? Object.assign({}, x, {text:''}) : x);
    }
    return out.slice(-30);
  };
  P.v88HistBrasil = function(c){                          // o histórico do Chat do Brasil: o mesmo cuidado
    return this.chat.msgs.slice(-50).filter(x => !(pubDoId(x.from) && this.v88BloqueadoBrasil(c, pubDoId(x.from)))).map(x => (x.escondida ? Object.assign({}, x, {texto:''}) : x));
  };
  P.v88BloqueadoBrasil = function(dest, pub){             // no Chat do Brasil as conexões são outras (não estão em porId)
    const dp = pubDe(dest);
    if (!dp || !pub || dp === pub) return false;
    if (dest.rel && dest.rel.bloq.has(pub)) return true;
    for (const x of this.clientes) if (x.brasil && x.brasilConta === 'c' + Number(pub) && x.rel && x.rel.bloq.has(dp)) return true;
    const rem = this.v88Conexao(pub);
    return !!(rem && rem.rel && rem.rel.bloq.has(dp));
  };
  P.v88BrasilEntrou = function(c, conta, segue){          // as relações da conexão do Chat do Brasil (para o bloqueio) e segue
    c.rel = conta && conta.rel ? relDe(conta.rel) : null;
    if (conta && !c.rel){
      const sala = this.v88Conexao(conta.idPublico);       // (a conexão das salas da mesma conta já sabe)
      if (sala && sala.rel) c.rel = sala.rel;
    }
    if (conta && !c.rel && this.relacoesDe){
      let feito = false;
      const fim = () => { if (!feito){ feito = true; segue(); } };
      const t = setTimeout(fim, 1500); if (t.unref) t.unref();   // (a plataforma demorou: segue sem as relações)
      Promise.resolve().then(() => this.relacoesDe(conta.idPublico)).then(r => { if (r) c.rel = relDe(r); }).catch(() => {}).then(() => { clearTimeout(t); fim(); });
      return;
    }
    segue();
  };

  /* ---------------------------------------------------------------- a denúncia com motivo (a janela de denúncia do jogo) */
  P.motivo88 = function(m){ return MOTIVOS.includes(m && m.motivo) ? m.motivo : 'ofensa'; };
  P.chat_denuncia = function(c, m){                       // os chats novos (clube, amigos) e o Chat do Brasil pela conexão das salas
    const canal = ['sala', 'equipe', 'brasil', 'clube', 'dm'].includes(m.canal) ? m.canal : null;
    if (!canal || typeof m.mid !== 'string' || m.mid.length > 40) return;
    if (canal === 'sala' || canal === 'equipe') return this.report(c, {mid:m.mid, motivo:m.motivo});
    if (!this.balde(c, 'denuncia88', .2, 4)) return this.manda(c, {type:'denuncia_ok', mid:m.mid, ok:false, motivo:'ritmo'});
    let msg = null, autor = null;
    if (canal === 'brasil'){ msg = this.chat.msgs.find(x => x.id === m.mid); autor = msg && pubDoId(msg.from); }
    else if (canal === 'clube'){ const k = this.v88Clube(c); msg = k && (this.b.d.clubeChat[k] || []).find(x => x.mid === m.mid); autor = msg && (PUB_RE.test(msg.de) ? msg.de : null); }
    else if (canal === 'dm' && c.conta){
      for (const [k, h] of Object.entries(this.b.d.dms)){
        if (k.split('|').indexOf(c.conta.idPublico) < 0) continue;
        const x = h.find(y => y.mid === m.mid); if (x){ msg = x; break; }
      }
      autor = msg && msg.de;
    }
    if (!msg) return this.manda(c, {type:'denuncia_ok', mid:m.mid, ok:false});
    if (autor && c.conta && autor === c.conta.idPublico) return this.manda(c, {type:'denuncia_ok', mid:m.mid, ok:false});
    this.v88Denuncia(c, {autor, motivo:this.motivo88(m), texto:msg.texto || msg.text || '', canal, mid:m.mid});
    this.manda(c, {type:'denuncia_ok', mid:m.mid, ok:true});
  };
  P.v88Denuncia = function(c, d){                         // vai para a plataforma (RACHA CONTROL) — sem ela, fica anotada aqui
    const quem = c.conta ? c.conta.idPublico : c.brasilConta ? pubDoId(c.brasilConta) : null;
    const reg = {autor:quem || '', alvo:d.autor || '', motivo:d.motivo || 'ofensa', texto:String(d.texto || '').slice(0, 300), canal:d.canal, mid:d.mid || '', sala:d.sala || '', t:Date.now()};
    this.log('denúncia (' + reg.canal + ') de ' + (reg.autor || 'visitante') + ' contra ' + (reg.alvo || 'visitante') + ': ' + reg.motivo);
    if (this.denunciaCb && reg.autor && reg.alvo){
      Promise.resolve().then(() => this.denunciaCb(reg)).catch(e => this.log('denúncia para a plataforma: ' + (e && e.message || e)));
      return;
    }
    this.v88.denMem.push(reg); if (this.v88.denMem.length > 500) this.v88.denMem.shift();
  };

  /* ---------------------------------------------------------------- o selo: quem jogou junto (g) e o melhor da partida (v) */
  P.v88Jogadores = function(r){ return r.roster.map(pubDoId).filter(Boolean).slice(0, 8); };
  P.v88Mvp = function(r, winner){                         // mais gols; empate: mais assistências; empate: do time que venceu; senão, ninguém
    let melhor = null, chave = null, empate = false;
    for (let i = 0; i < r.roster.length; i++){
      const id = r.roster[i]; if (!id) continue;
      const g = (r.gols && r.gols[id]) | 0, a = (r.assist && r.assist[id]) | 0, t = Math.floor(i / r.n);
      if (!g && !a) continue;
      const k = [g, a, t === winner ? 1 : 0];
      const cmp = chave ? (k[0] - chave[0] || k[1] - chave[1] || k[2] - chave[2]) : 1;
      if (cmp > 0){ melhor = id; chave = k; empate = false; } else if (cmp === 0) empate = true;
    }
    return empate ? null : melhor;
  };

  /* ---------------------------------------------------------------- a faxina (o histórico velho dos chats novos) */
  P.v88Poda = function(){
    const agora = Date.now();
    if (agora - this.v88.podaT < 10*60e3) return;
    this.v88.podaT = agora;
    const corte = agora - DIAS_HIST*864e5;
    let mudou = false;
    for (const d of [this.b.d.dms, this.b.d.clubeChat]) for (const [k, h] of Object.entries(d)){
      const fica = Array.isArray(h) ? h.filter(x => x && x.t >= corte) : [];
      if (fica.length !== (h || []).length){ mudou = true; if (fica.length) d[k] = fica; else delete d[k]; }
    }
    for (const [id, cv] of this.v88.convites) if (cv.ate < agora) this.v88.convites.delete(id);
    if (mudou) this.b.marca();
  };
}

module.exports = {aplica, configura, relDe, relDoBilhete, MOTIVOS};
