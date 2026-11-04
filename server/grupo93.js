'use strict';
/* =====================================================================================================================
   RACHA · v93 Fase 4 — O GRUPO (jogar junto com os amigos), no servidor da turma.
     · CRIAR GRUPO (grupo_cria): quem tem conta cria um grupo e é o LÍDER (a coroa). Até 4 pessoas (o maior time, 4 VS 4).
     · CONVIDAR (grupo_convida {para}): só amigos dos dois lados, online, sem bloqueio e recebendo convites — as mesmas
       regras dos convites da sala (server/social88.js). O convite vale 60 s; quem recebe aceita ou recusa (grupo_resposta).
     · O STATUS de cada um, de verdade: DISPONÍVEL (no lobby), OCUPADO (numa sala), PROCURANDO (a busca do grupo), EM PARTIDA
       e OFFLINE (caiu: o lugar no grupo espera 60 s; o líder que cai passa a coroa em 20 s; quem volta continua no grupo).
     · SAIR (grupo_sai), EXPULSAR (grupo_expulsa {id}, só o líder), PASSAR A LIDERANÇA (grupo_lider {id}, só o líder), o MODO
       que o líder escolheu (grupo_modo {n}) e os pontos da ranqueada de cada um (grupo_pts {pts}: só para juntar a fila).
     · A BUSCA é do líder: o JOGAR dele (a fila de sempre, fila {n, pts}) leva o grupo inteiro para a fila da ranqueada —
       todos disponíveis, o grupo cabe num time (até n pessoas) e fica no MESMO time; o resto é a fila de sempre (os pontos
       mais perto; depois de 8 s os bots completam). Qualquer um cancela (fila_sai) e a busca para para todos; quem cai
       procurando cancela também. Quem do grupo ainda está na tela do fim da ranqueada que acabou sai dela junto.
     · Depois da partida o grupo continua (ele vive aqui, fora das salas).
     · v95: no lobby, quem não é o líder toca em PRONTO (grupo_pronto {on}) e o JOGAR do líder só procura com todos prontos.
       No fim da ranqueada, o JOGAR DE NOVO do grupo (grupo_denovo {sim}) é uma votação de 10 s: todos tocaram, a busca do
       grupo começa sozinha (o tamanho da partida que acabou); alguém não tocou a tempo (ou foi para o lobby, caiu, saiu do
       grupo), todos voltam para o lobby (grupo_denovo_fim {motivo}) — lá, PRONTO e o líder joga.
   Nada aqui mexe na partida: a física, o placar, o resultado e o ranking são os de sempre (o servidor só junta a fila).
   ===================================================================================================================== */
const {limpa, inteiro} = require('./banco');

const GRUPO_MAX = 4, CONVITE_MS = 60000;
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : d; };
const FORA_MS = num(process.env.RACHA_GRUPO_FORA_MS, 60000);          // quem caiu continua no grupo por 60 s
const LIDER_FORA_MS = num(process.env.RACHA_GRUPO_LIDER_MS, 20000);   // o líder que caiu passa a coroa em 20 s
const DENOVO_MS = num(process.env.RACHA_GRUPO_DENOVO_MS, 10000);      // v95: o JOGAR DE NOVO do grupo: todos em 10 s
const nomesE = l => l.length < 2 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1];
const PUB_RE = /^\d{6,9}$/;
const pub6 = id => String(Number(id)).padStart(6, '0');
let CFG = {filaMax:20000, filaMista:8000};
function configura(o){ Object.assign(CFG, o || {}); }

/* ---- dá para dividir as unidades em dois times de até n (cada grupo inteiro num time só)? */
function cabe(tams, n){
  const tot = tams.reduce((s, t) => s + t, 0); if (tot > 2*n) return false;
  let pode = new Set([0]);
  for (const t of tams){ const novo = new Set(pode); for (const s of pode) if (s + t <= n) novo.add(s + t); pode = novo; }
  for (const s of pode) if (tot - s <= n) return true;
  return false;
}
/* ---- quem joga junto: quem espera há mais tempo e as unidades de pontos mais perto dele (a regra de sempre, com os grupos
   como uma unidade só). exato: fecha os 2n lugares; senão, o maior conjunto que cabe (os bots completam) */
function escolhe(U, k, n, exato){
  if (!U.length) return null;
  const a = U[0]; if (a.es.length > n) return null;
  const resto = U.slice(1).sort((x, y) => Math.abs(x.pts - a.pts) - Math.abs(y.pts - a.pts) || x.t0 - y.t0);
  let melhor = null, melhorSoma = 0, passos = 0;
  const tams = [a.es.length], sel = [a];
  (function busca(i, soma){
    if (++passos > 4000) return;
    if (soma === k){ melhor = sel.slice(); melhorSoma = soma; return; }
    if (!exato && soma > melhorSoma){ melhor = sel.slice(); melhorSoma = soma; }
    for (let j = i; j < resto.length; j++){
      const u = resto[j], t = u.es.length;
      if (soma + t > k) continue;
      tams.push(t); sel.push(u);
      if (cabe(tams, n)) busca(j + 1, soma + t);
      tams.pop(); sel.pop();
      if (melhorSoma === k) return;
    }
  })(0, a.es.length);
  if (exato) return melhorSoma === k ? melhor : null;
  return melhor;
}
/* ---- os times de uma partida com grupo: cada grupo inteiro num time; o mesmo número de pessoas dos dois lados quando dá;
   depois, os pontos somados mais perto (até 8 unidades: 256 jeitos, conferidos todos) */
function times(g, n){
  const m = g.length; let melhor = null, nota = Infinity;
  for (let mask = 0; mask < (1 << m); mask++){
    const gente = [0, 0], pts = [0, 0];
    for (let i = 0; i < m; i++){ const t = (mask >> i) & 1, u = g[i]; gente[t] += u.es.length; pts[t] += u.pts*u.es.length; }
    if (gente[0] > n || gente[1] > n) continue;
    const nt = Math.abs(gente[0] - gente[1])*1e6 + Math.abs(pts[0] - pts[1]) + (gente[0] < gente[1] ? .5 : 0);
    if (nt < nota){ nota = nt; melhor = mask; }
  }
  if (melhor === null) return null;
  const T = new Map();
  for (let i = 0; i < m; i++) for (const e of g[i].es) T.set(e, (melhor >> i) & 1);
  return T;
}

function aplica(Turma){
  const P = Turma.prototype;
  P.g93S = function(){ return this.grupos93 || (this.grupos93 = {grupos:new Map(), porId:new Map(), convites:new Map(), seq:0, seqC:0, sujos:new Set(), sujoT:null}); };
  P.g93De = function(id){ return id ? this.g93S().porId.get(id) || null : null; };
  P.g93Erro = function(c, motivo, para){ this.manda(c, {type:'grupo_erro', motivo, para:para || ''}); };
  P.g93Nome = function(G, id){ const m = G && G.membros.find(x => x.id === id); return m ? m.nome : 'Jogador'; };

  /* ---------------------------------------------------------------- o estado (para cada um do grupo) */
  P.g93St = function(m){
    const c = this.porId.get(m.id);
    if (!c || m.fora || !c.ws || c.ws.readyState !== 1) return 'offline';
    const r = this.salaDe(c);
    if (r) return r.state === 'playing' ? 'partida' : 'ocupado';
    const e = this.filaEsp.get(m.id);
    if (e) return e.grp ? 'buscando' : 'ocupado';
    return 'disponivel';
  };
  P.g93Publica = function(G){
    const S = this.g93S(), agora = Date.now();
    const membros = G.membros.map(m => {
      const c = this.porId.get(m.id), vivo = c && !m.fora;
      if (vivo){ m.nome = c.nome; m.selo = c.selo || ''; m.skin = c.skin || ''; m.avatar = c.avatar || null; m.cos = this.v88Cos(c) || {}; m.flag = c.flag || 'BR'; }
      return {id:m.id, p:m.pub, nome:m.nome, selo:m.selo || '', skin:m.skin || '', avatar:m.avatar || null, cos:m.cos || {}, flag:m.flag || 'BR', st:this.g93St(m), lider:m.id === G.lider,
        pronto:!!m.pronto};                               // v95: o PRONTO do lobby
    });
    const convites = [...S.convites.values()].filter(cv => cv.gid === G.id && cv.ate > agora).map(cv => ({p:cv.para, nome:cv.nome, resta:cv.ate - agora}));
    const D = G.denovo, denovo = D ? {votos:G.membros.filter(m => D.votos.has(m.id)).map(m => m.id), resta:Math.max(0, D.ate - agora), n:D.n} : null;   // v95: a votação do JOGAR DE NOVO
    return {id:G.id, lider:G.lider, modo:G.modo, max:GRUPO_MAX, busca:G.busca ? {n:G.busca.n} : null, membros, convites, denovo};
  };
  P.g93Manda = function(G){
    if (!G || !this.g93S().grupos.has(G.id)) return;
    const txt = JSON.stringify({type:'grupo', g:this.g93Publica(G)});
    for (const m of G.membros){ const c = this.porId.get(m.id); if (c && !m.fora) this.mandaTxt(c, txt); }
  };
  P.g93Marca = function(G){                               // junta as mudanças (o status muda várias vezes seguidas)
    const S = this.g93S(); if (!G) return;
    S.sujos.add(G);
    if (S.sujoT) return;
    S.sujoT = setTimeout(() => { S.sujoT = null; const l = [...S.sujos]; S.sujos.clear(); for (const x of l) this.g93Manda(x); }, 150);
    if (S.sujoT.unref) S.sujoT.unref();
  };
  P.g93Avisa = function(G, txt, exceto){ for (const m of G.membros){ if (m.id === exceto || m.fora) continue; const c = this.porId.get(m.id); if (c) this.manda(c, {type:'grupo_aviso', txt}); } };

  /* ---------------------------------------------------------------- criar, entrar, sair */
  P.g93Novo = function(c, m){
    const S = this.g93S();
    const G = {id:'g' + (++S.seq).toString(36) + Date.now().toString(36).slice(-5), lider:c.id, membros:[], busca:null, modo:inteiro(m && m.n, 1, 4, 2), criado:Date.now(), foraT:null};
    S.grupos.set(G.id, G);
    this.g93Poe(G, c, m && m.pts);
    this.log('grupo ' + G.id + ' criado por ' + c.nome);
    return G;
  };
  P.g93Poe = function(G, c, pts){
    G.membros.push({id:c.id, pub:c.conta.idPublico, nome:c.nome, selo:c.selo || '', skin:c.skin || '', avatar:c.avatar || null, cos:this.v88Cos(c) || {}, flag:c.flag || 'BR', pts:inteiro(pts, 0, 99999, 0), fora:0, desde:Date.now()});
    this.g93S().porId.set(c.id, G);
  };
  P.g93Fecha = function(G){
    const S = this.g93S();
    if (G.denovo){ clearTimeout(G.denovo.t); G.denovo = null; }   // v95
    if (G.busca) this.g93BuscaCancela(G, '');
    S.grupos.delete(G.id); clearTimeout(G.foraT);
    for (const [k, cv] of S.convites) if (cv.gid === G.id) S.convites.delete(k);
    for (const m of G.membros) if (S.porId.get(m.id) === G) S.porId.delete(m.id);
    this.log('grupo ' + G.id + ' acabou');
  };
  P.g93Tira = function(G, id, motivo){                    // motivo: 'saiu' · 'expulso' · 'caiu' · 'outro' (entrou em outro grupo)
    const S = this.g93S(), i = G.membros.findIndex(x => x.id === id); if (i < 0) return;
    const m = G.membros[i];
    if (G.denovo) this.g93DenovoFim(G, m.nome + (motivo === 'caiu' ? ' caiu' : ' saiu do grupo') + ': todo mundo no lobby.');   // v95
    if (G.busca) this.g93BuscaCancela(G, m.nome + (motivo === 'caiu' ? ' caiu' : ' saiu do grupo') + ': a busca parou.');
    G.membros.splice(i, 1); if (S.porId.get(id) === G) S.porId.delete(id);
    for (const [k, cv] of S.convites) if (cv.gid === G.id && cv.de === id) S.convites.delete(k);   // (os convites que ele mandou saem junto)
    const c = this.porId.get(id); if (c) this.manda(c, {type:'grupo', g:null, motivo});
    if (!G.membros.length) return this.g93Fecha(G);
    this.g93Avisa(G, m.nome + (motivo === 'expulso' ? ' foi removido do grupo.' : motivo === 'caiu' ? ' saiu do grupo (caiu).' : ' saiu do grupo.'));
    if (G.lider === id){
      const novo = G.membros.find(x => !x.fora) || G.membros[0];
      G.lider = novo.id; this.g93Avisa(G, novo.nome + ' agora é o líder do grupo.');
    }
    this.g93Manda(G);
  };
  P.grupo_cria = function(c, m){
    if (!c.conta) return this.g93Erro(c, 'Entre na sua conta para criar um grupo.');
    if (!this.balde(c, 'grupo93', 2, 8)) return this.g93Erro(c, 'Calma: uma coisa de cada vez.');
    const G = this.g93De(c.id) || this.g93Novo(c, m || {});
    this.g93Manda(G);
  };
  P.grupo_estado = function(c){                           // (o jogo voltou para o lobby: o estado de novo)
    if (!this.balde(c, 'grupo93', 2, 8)) return;
    const G = this.g93De(c.id);
    if (G) this.g93Manda(G); else this.manda(c, {type:'grupo', g:null});
  };
  P.grupo_convida = function(c, m){
    const para = m && typeof m.para === 'string' && PUB_RE.test(m.para) ? pub6(m.para) : null;
    const erro = t => this.g93Erro(c, t, para || '');
    if (!c.conta || !c.rel) return erro('Entre na sua conta para chamar amigos.');
    if (!this.balde(c, 'grupo93c', .5, 6)) return erro('Calma: espere um pouco para chamar de novo.');
    const f = para && this.v88Conexao(para);
    if (!f || f === c || !f.conta || !f.rel || !f.rel.mostra) return erro('Esse amigo não está online agora.');
    if (!this.v88Amigos(c, f) || this.v88Bloqueado(c, f)) return erro('Só dá para chamar amigos.');
    if (!f.rel.convites) return erro('Esse amigo não está recebendo convites agora.');
    const G0 = this.g93De(c.id);
    if (G0 && G0.membros.some(x => x.id !== c.id && this.v88BloqueadoPub(f, x.pub))) return erro('Não dá para chamar essa pessoa para este grupo.');
    const G = G0 || this.g93Novo(c, m);
    if (G.membros.some(x => x.id === f.id)) return erro('Esse amigo já está no seu grupo.');
    const S = this.g93S(), agora = Date.now();
    for (const [k, cv] of S.convites) if (cv.ate < agora) S.convites.delete(k);
    const pend = [...S.convites.values()].filter(cv => cv.gid === G.id && cv.para !== para).length;
    if (G.membros.length + pend >= GRUPO_MAX) return erro('O grupo está cheio (até ' + GRUPO_MAX + ' pessoas, contando os convites).');
    for (const [k, cv] of S.convites) if (cv.gid === G.id && cv.para === para) S.convites.delete(k);   // (o convite novo vale no lugar do velho)
    const id = 'gc' + (++S.seqC);
    S.convites.set(id, {id, gid:G.id, de:c.id, para, nome:f.nome, ate:agora + CONVITE_MS});
    if (S.convites.size > 3000) S.convites.delete(S.convites.keys().next().value);
    this.manda(f, {type:'grupo_convite', id, de:{p:c.conta.idPublico, nome:c.nome, selo:c.selo || ''}, lider:this.g93Nome(G, G.lider), gente:G.membros.length, max:GRUPO_MAX, expira:CONVITE_MS});
    this.manda(c, {type:'grupo_aviso', txt:'Convite enviado para ' + f.nome + '.'});
    this.g93Manda(G);
  };
  P.grupo_resposta = function(c, m){
    const S = this.g93S(), cv = m && typeof m.id === 'string' ? S.convites.get(m.id) : null;
    if (!cv || !c.conta || cv.para !== c.conta.idPublico) return this.g93Erro(c, 'Esse convite não vale mais.');
    S.convites.delete(cv.id);
    const G = S.grupos.get(cv.gid), de = this.porId.get(cv.de);
    if (cv.ate < Date.now() || !G) return this.g93Erro(c, 'Esse convite venceu (ou o grupo acabou).');
    if (!m.aceita){ if (de) this.manda(de, {type:'grupo_aviso', txt:c.nome + ' recusou o convite.'}); this.g93Manda(G); return; }
    if (G.membros.some(x => x.id === c.id)) return this.g93Manda(G);
    if (!G.membros.some(x => x.id === cv.de)) return this.g93Erro(c, 'Esse convite não vale mais: quem chamou saiu do grupo.');
    if ((de && (!this.v88Amigos(c, de) || this.v88Bloqueado(c, de))) || G.membros.some(x => this.v88BloqueadoPub(c, x.pub))) return this.g93Erro(c, 'Esse convite não vale mais.');
    if (G.membros.length >= GRUPO_MAX) return this.g93Erro(c, 'O grupo já está cheio.');
    if (G.busca) return this.g93Erro(c, 'O grupo está procurando partida agora: peça outro convite daqui a pouco.');
    const r = this.salaDe(c);
    if (r && r.state === 'playing') return this.g93Erro(c, 'Termine a partida antes de entrar no grupo.');
    if (this.filaEsp.has(c.id)) this.filaSai(c);       // (procurando sozinho: a busca dele para)
    const velho = this.g93De(c.id); if (velho && velho !== G) this.g93Tira(velho, c.id, 'outro');
    this.g93Poe(G, c, m.pts);
    for (const x of G.membros){                                // (quem procurava sozinho antes do grupo: a busca para; quem procura é o líder, com o grupo)
      if (x.id === c.id) continue;
      const e = this.filaEsp.get(x.id), xc = this.porId.get(x.id);
      if (e && !e.grp && xc){ this.filaSai(xc); this.manda(xc, {type:'grupo_aviso', txt:'A busca parou: agora vocês são um grupo (o líder procura com todos).'}); }
    }
    if (r && !r.ranked && r.state !== 'playing') this.leave(c);   // (estava numa sala esperando: sai dela agora que o servidor aceitou)
    this.g93Avisa(G, c.nome + ' entrou no grupo.', c.id);
    this.log('grupo ' + G.id + ': ' + c.nome + ' entrou (' + G.membros.length + ')');
    this.g93Manda(G);
  };
  P.grupo_sai = function(c){
    const G = this.g93De(c.id);
    if (!G){ this.manda(c, {type:'grupo', g:null}); return; }
    this.g93Tira(G, c.id, 'saiu');
  };
  P.grupo_expulsa = function(c, m){
    const G = this.g93De(c.id); if (!G) return;
    if (G.lider !== c.id) return this.g93Erro(c, 'Só o líder do grupo remove alguém.');
    const id = m && typeof m.id === 'string' ? m.id : '';
    if (!id || id === c.id || !G.membros.some(x => x.id === id)) return;
    this.log('grupo ' + G.id + ': ' + c.nome + ' removeu ' + this.g93Nome(G, id));
    this.g93Tira(G, id, 'expulso');
  };
  P.grupo_lider = function(c, m){
    const G = this.g93De(c.id); if (!G) return;
    if (G.lider !== c.id) return this.g93Erro(c, 'Só o líder passa a liderança.');
    const alvo = m && typeof m.id === 'string' ? G.membros.find(x => x.id === m.id) : null;
    if (!alvo || alvo.id === c.id) return;
    if (alvo.fora) return this.g93Erro(c, alvo.nome + ' está offline agora.');
    G.lider = alvo.id; alvo.pronto = false; const velho = G.membros.find(x => x.id === c.id); if (velho) velho.pronto = false;   // (v95: quem deixou de ser o líder marca o PRONTO de novo)
    this.g93Avisa(G, alvo.nome + ' agora é o líder do grupo.');
    this.g93Manda(G);
  };
  P.grupo_modo = function(c, m){
    const G = this.g93De(c.id); if (!G || G.lider !== c.id || G.busca) return;
    const n = inteiro(m && m.n, 1, 4, G.modo); if (n === G.modo) return;
    G.modo = n; this.g93Marca(G);
  };
  P.grupo_pts = function(c, m){
    const G = this.g93De(c.id); if (!G) return;
    const eu = G.membros.find(x => x.id === c.id); if (eu) eu.pts = inteiro(m && m.pts, 0, 99999, eu.pts);
  };

  /* ---------------------------------------------------------------- caiu e voltou */
  P.g93Caiu = function(c){
    if (!c || !c.id || c.substituido) return;
    const S = this.g93S();
    if (c.conta) for (const [k, cv] of S.convites) if (cv.para === c.conta.idPublico || cv.de === c.id) S.convites.delete(k);
    const G = this.g93De(c.id); if (!G) return;
    const m = G.membros.find(x => x.id === c.id); if (!m) return;
    m.fora = Date.now(); m.pronto = false;
    if (G.denovo) this.g93DenovoFim(G, m.nome + ' caiu: todo mundo no lobby.');   // v95
    if (G.busca) this.g93BuscaCancela(G, m.nome + ' caiu: a busca parou.');
    this.g93Agenda(G);
    this.g93Manda(G);
  };
  P.g93Voltou = function(c){
    const G = this.g93De(c.id); if (!G) return;
    const m = G.membros.find(x => x.id === c.id); if (!m) return;
    if (m.fora){ m.fora = 0; this.g93Avisa(G, c.nome + ' voltou.', c.id); }
    const e = this.filaEsp.get(c.id);
    if (G.busca && (!e || e.c !== c)) this.g93BuscaCancela(G, c.nome + ' reconectou: a busca parou (o líder procura de novo).');
    this.g93Agenda(G);
    this.g93Manda(G);
  };
  P.g93Agenda = function(G){                              // quem está fora há tempo demais sai; o líder fora passa a coroa
    clearTimeout(G.foraT); G.foraT = null;
    if (!this.g93S().grupos.has(G.id)) return;
    const agora = Date.now(); let prox = Infinity;
    for (const m of G.membros.slice()){
      if (!m.fora) continue;
      if (agora - m.fora >= FORA_MS){ this.g93Tira(G, m.id, 'caiu'); continue; }
      prox = Math.min(prox, m.fora + FORA_MS);
      if (G.lider === m.id){
        const novo = G.membros.find(x => !x.fora);
        if (agora - m.fora >= LIDER_FORA_MS && novo){ G.lider = novo.id; this.g93Avisa(G, m.nome + ' caiu: ' + novo.nome + ' agora é o líder do grupo.'); this.g93Manda(G); }
        else if (novo) prox = Math.min(prox, m.fora + LIDER_FORA_MS);
      }
    }
    if (!this.g93S().grupos.has(G.id) || prox === Infinity) return;
    G.foraT = setTimeout(() => this.g93Agenda(G), Math.max(30, prox - agora + 15));
    if (G.foraT.unref) G.foraT.unref();
  };
  const fechouAntes = P.fechou;                          // a conexão que procurava com o grupo fechou (trocada por outra aba ou pela volta da internet)
  P.fechou = function(c){
    let G = null;
    try { const e = c && c.id ? this.filaEsp.get(c.id) : null; if (e && e.c === c && e.grp) G = this.g93S().grupos.get(e.grp) || null; } catch (_) {}
    const r = fechouAntes.apply(this, arguments);
    try { if (G && G.busca) this.g93BuscaCancela(G, (c.nome || 'Alguém') + ' saiu da busca: ela parou.'); } catch (e) { this.log('grupo (fechou): ' + (e && e.stack || e)); }
    return r;
  };
  const zeraAntes = P.v88ZeraContas;                     // o Dono zerou as contas: as apagadas saem dos grupos na hora (o número volta para contas novas)
  if (zeraAntes) P.v88ZeraContas = function(manter){
    const fica = new Set((Array.isArray(manter) ? manter : []).filter(p => /^\d{1,9}$/.test(String(p))).map(p => 'c' + Number(p)));
    const r = zeraAntes.apply(this, arguments);
    try {
      const S = this.g93S();
      for (const G of [...S.grupos.values()]) for (const x of G.membros.slice()) if (!fica.has(x.id) && S.grupos.has(G.id)) this.g93Tira(G, x.id, 'saiu');
      for (const [k, cv] of S.convites) if (!fica.has(cv.de) || !fica.has('c' + Number(cv.para))) S.convites.delete(k);
    } catch (e) { this.log('grupo (zerar): ' + (e && e.stack || e)); }
    return r;
  };
  const v88SaiuAntes = P.v88Saiu;
  P.v88Saiu = function(c){ const r = v88SaiuAntes.apply(this, arguments); try { this.g93Caiu(c); } catch (e) { this.log('grupo (caiu): ' + (e && e.stack || e)); } return r; };
  const v88EntrouAntes = P.v88Entrou;
  P.v88Entrou = function(c){ const r = v88EntrouAntes.apply(this, arguments); try { this.g93Voltou(c); } catch (e) { this.log('grupo (voltou): ' + (e && e.stack || e)); } return r; };
  const v88MarcaAntes = P.v88Marca;                       // o status mudou (sala, fila, partida): o grupo vê
  P.v88Marca = function(c){ const r = v88MarcaAntes.apply(this, arguments); try { const G = c && this.g93De(c.id); if (G) this.g93Marca(G); } catch (_) {} return r; };
  const profileAntes = P.profile;                         // trocou o nome ou a tampinha: o grupo vê
  P.profile = function(c){ const r = profileAntes.apply(this, arguments); try { const G = this.g93De(c.id); if (G) this.g93Marca(G); } catch (_) {} return r; };

  /* ---------------------------------------------------------------- a busca do grupo (a fila da ranqueada) */
  const filaAntes = P.fila;
  P.fila = function(c, m){
    const G = this.g93De(c.id);
    if (!G || G.membros.length < 2) return filaAntes.apply(this, arguments);
    if (G.lider !== c.id) return this.erro(c, 'Quem procura a partida é o líder do grupo (' + this.g93Nome(G, G.lider) + '). Toque em PRONTO e espere ele.', 'fila_grupo');
    if (!this.balde(c, 'fila', .5, 4)) return this.erro(c, 'Calma: espere um pouco para procurar de novo.', 'fila_grupo');
    if (this.salaDe(c)) return this.erro(c, 'Saia da sala em que você está para jogar a ranqueada.', 'fila_sala');
    return this.g93Procura(c, G, m, false);
  };
  // a busca do grupo (o JOGAR do líder no lobby, com todos PRONTOS; ou a votação do JOGAR DE NOVO, que já é o "pronto" de todos)
  P.g93Procura = function(c, G, m, doDenovo){
    const n = inteiro(m && m.n, 1, 4, 2), k = G.membros.length;
    if (k > n) return this.erro(c, 'O grupo tem ' + k + ' pessoas: escolha ' + k + ' VS ' + k + (k < 4 ? ' ou maior' : '') + '.', 'fila_grupo');
    if (!doDenovo){                                       // v95: no lobby, todos (menos o líder) tocaram em PRONTO
      const falta = G.membros.filter(x => x.id !== G.lider && !x.pronto && !x.fora).map(x => x.nome);
      if (falta.length) return this.erro(c, nomesE(falta) + (falta.length > 1 ? ' ainda não estão prontos' : ' ainda não está pronto') + ' (o PRONTO fica no JOGAR de cada um).', 'fila_grupo');
    }
    const eu = G.membros.find(x => x.id === c.id); if (eu) eu.pts = inteiro(m && m.pts, 0, 99999, eu.pts);
    const cons = [];
    for (const x of G.membros){
      const f = this.porId.get(x.id);
      if (!f || x.fora || !f.ws || f.ws.readyState !== 1) return this.erro(c, x.nome + ' está offline: espere ele voltar (ou tire do grupo).', 'fila_grupo');
      const r = this.salaDe(f);
      if (r && r.state === 'playing') return this.erro(c, x.nome + ' ainda está numa partida.', 'fila_grupo');
      if (r && !r.ranked) return this.erro(c, x.nome + ' está numa sala: espere ele sair.', 'fila_grupo');
      cons.push([x, f, r]);
    }
    for (const [, f, r] of cons) if (r){ this.sai(f, 'saiu'); this.manda(f, {type:'left'}); }   // (a tela do fim da ranqueada que acabou: sai junto)
    const t0 = this.agora();
    for (const [x, f] of cons){
      const e = this.filaEsp.get(x.id); if (e && !e.grp) this.filaEsp.delete(x.id);
      this.filaEsp.set(x.id, {c:f, n, pts:x.pts, t0, grp:G.id});
    }
    G.busca = {n, t0}; G.modo = n;
    for (const [x, f] of cons){ this.manda(f, {type:'fila', on:true, n, espera:CFG.filaMax, mista:CFG.filaMista, online:this.porId.size, grupo:G.id, lider:G.lider === x.id, denovo:!!doDenovo}); this.v88Marca(f); }
    this.log('grupo ' + G.id + ' procurando ' + n + 'v' + n + ' (' + k + ' pessoas)' + (doDenovo ? ' · jogar de novo' : ''));
    this.g93Manda(G);
    this.filaTenta();
    return true;
  };

  /* ---------------------------------------------------------------- v95: o PRONTO (no lobby) e o JOGAR DE NOVO do grupo (no fim da ranqueada) */
  P.grupo_pronto = function(c, m){
    const G = this.g93De(c.id); if (!G) return;
    if (!this.balde(c, 'grupo93p', 4, 12)) return;
    const eu = G.membros.find(x => x.id === c.id); if (!eu) return;
    const on = !!(m && m.on);
    if (!!eu.pronto === on) return this.g93Manda(G);
    eu.pronto = on;
    this.g93Manda(G);                                     // (na hora: o JOGAR do líder conta os prontos)
  };
  P.grupo_denovo = function(c, m){
    const G = this.g93De(c.id);
    if (!G || G.membros.length < 2) return this.manda(c, {type:'grupo_denovo_fim', motivo:'', sozinho:true});   // (sem grupo: o JOGAR DE NOVO de sempre)
    if (!this.balde(c, 'grupo93d', 2, 8)) return;
    const r = this.salaDe(c), sim = !(m && m.sim === false);
    if (!sim){                                            // foi para o LOBBY: a votação não fecha — todos para o lobby
      if (G.denovo) return this.g93DenovoFim(G, c.nome + ' voltou para o lobby.');
      if (r && r.ranked && r.state !== 'playing'){ this.sai(c, 'saiu'); this.manda(c, {type:'left'}); }
      return;
    }
    if (!r || !r.ranked || r.state === 'playing') return this.manda(c, {type:'grupo_denovo_fim', motivo:'Essa partida já acabou.'});
    if (G.denovo && G.denovo.sala !== r.code){ clearTimeout(G.denovo.t); G.denovo = null; }   // (uma votação velha, de outra sala: some)
    if (!G.denovo){
      // quem já não está na tela do fim (voltou para o lobby, caiu, foi para outra sala): a votação não fecha
      const longe = G.membros.find(x => { const f = this.porId.get(x.id); return x.fora || !f || this.salaDe(f) !== r; });
      if (longe){
        const fl = this.porId.get(longe.id), onde = longe.fora || !fl ? ' está offline' : this.salaDe(fl) ? ' está em outra sala' : ' já está no lobby';
        G.denovo = {sala:r.code, n:r.n, votos:new Set([c.id]), ate:Date.now(), t:null};
        return this.g93DenovoFim(G, longe.nome + onde + ': todo mundo no lobby (lá, PRONTO e o líder joga).');
      }
      G.denovo = {sala:r.code, n:r.n, votos:new Set(), ate:Date.now() + DENOVO_MS, t:null};
      G.denovo.t = setTimeout(() => this.g93DenovoTempo(G), DENOVO_MS + 20); if (G.denovo.t.unref) G.denovo.t.unref();
      this.log('grupo ' + G.id + ': jogar de novo? (' + c.nome + ')');
    }
    G.denovo.votos.add(c.id);
    if (G.membros.every(x => G.denovo.votos.has(x.id))) return this.g93DenovoVai(G);
    this.g93Manda(G);
  };
  P.g93DenovoTempo = function(G){
    const D = G.denovo; if (!D || !this.g93S().grupos.has(G.id)) return;
    if (Date.now() < D.ate){ D.t = setTimeout(() => this.g93DenovoTempo(G), D.ate - Date.now() + 20); if (D.t.unref) D.t.unref(); return; }
    const falta = G.membros.filter(x => !D.votos.has(x.id)).map(x => x.nome);
    this.g93DenovoFim(G, (falta.length ? nomesE(falta) + (falta.length > 1 ? ' não confirmaram' : ' não confirmou') : 'O grupo não confirmou') + ' a tempo: todo mundo no lobby (lá, PRONTO e o líder joga).');
  };
  P.g93DenovoVai = function(G){                           // todos tocaram em JOGAR DE NOVO: a busca do grupo começa (o tamanho da que acabou)
    const D = G.denovo; clearTimeout(D.t); G.denovo = null;
    const lc = this.porId.get(G.lider), lider = G.membros.find(x => x.id === G.lider);
    if (!lc || !lider || lider.fora) return this.g93DenovoFim(G, 'O líder não está online: todo mundo no lobby.');
    let ok = false;
    try { ok = !!this.g93Procura(lc, G, {n:D.n, pts:lider.pts}, true); } catch (e) { this.log('grupo (jogar de novo): ' + (e && e.stack || e)); }
    if (!ok) return this.g93DenovoFim(G, 'A busca do grupo não começou: todo mundo no lobby.');
  };
  P.g93DenovoFim = function(G, motivo){                    // a votação não fechou: quem está na tela do fim volta para o lobby
    const D = G.denovo; if (D){ clearTimeout(D.t); G.denovo = null; }
    for (const x of G.membros){
      x.pronto = false;
      const f = this.porId.get(x.id); if (!f || x.fora) continue;
      const r = this.salaDe(f);
      if (r && r.ranked && r.state !== 'playing'){ this.sai(f, 'saiu'); this.manda(f, {type:'left'}); }
      this.manda(f, {type:'grupo_denovo_fim', motivo:motivo || ''});
    }
    if (D) this.log('grupo ' + G.id + ': jogar de novo não fechou' + (motivo ? ' (' + motivo + ')' : ''));
    if (this.g93S().grupos.has(G.id)) this.g93Manda(G);
  };
  P.g93BuscaCancela = function(G, motivo){
    if (!G) return;
    const avisados = new Set();
    for (const [id, e] of this.filaEsp) if (e.grp === G.id){ this.filaEsp.delete(id); this.manda(e.c, {type:'fila', on:false, grupo:G.id, motivo:motivo || ''}); this.v88Marca(e.c); avisados.add(e.c); }
    for (const x of G.membros){ const c = this.porId.get(x.id); if (c && !avisados.has(c)){ this.manda(c, {type:'fila', on:false, grupo:G.id, motivo:motivo || ''}); this.v88Marca(c); } }   // (quem reconectou: a conexão nova)
    G.busca = null;
    this.g93Marca(G);
  };
  const filaSaiAntes = P.filaSai;
  P.filaSai = function(c){
    const e = this.filaEsp.get(c.id);
    if (e && e.grp){ const G = this.g93S().grupos.get(e.grp); if (G){ const eu = G.membros.find(x => x.id === c.id); if (eu && G.lider !== c.id) eu.pronto = false; return this.g93BuscaCancela(G, c.nome + ' cancelou a busca.'); } }   // (v95: quem cancela deixa de estar PRONTO)
    return filaSaiAntes.apply(this, arguments);
  };
  P.g93Unidades = function(n){
    const por = new Map(), U = [];
    for (const e of this.filaEsp.values()){
      if (e.n !== n) continue;
      if (e.grp){ let u = por.get(e.grp); if (!u){ u = {grp:e.grp, es:[], t0:e.t0, pts:0}; por.set(e.grp, u); U.push(u); } u.es.push(e); u.t0 = Math.min(u.t0, e.t0); }
      else U.push({grp:null, es:[e], t0:e.t0, pts:e.pts});
    }
    for (const u of U) if (u.grp) u.pts = Math.round(u.es.reduce((s, e) => s + e.pts, 0)/u.es.length);
    return U.sort((a, b) => a.t0 - b.t0);
  };
  P.g93Joga = function(g, n){
    const temGrupo = g.some(u => u.grp), es = [].concat(...g.map(u => u.es));
    const T = temGrupo ? times(g, n) : null;
    if (temGrupo && !T) return false;
    this.filaSala(es, n, T || undefined);
    for (const u of g) if (u.grp){ const G = this.g93S().grupos.get(u.grp); if (G){ G.busca = null; for (const x of G.membros) x.pronto = false; this.g93Marca(G); } }   // (v95: depois da partida, PRONTO de novo)
    return true;
  };
  const filaTentaAntes = P.filaTenta;
  P.filaTenta = function(){
    let tem = false; for (const e of this.filaEsp.values()) if (e.grp){ tem = true; break; }
    if (!tem) return filaTentaAntes.apply(this, arguments);   // (sem grupo na fila: a regra de sempre, sem mudar nada)
    clearTimeout(this.filaT); this.filaT = null;
    const agora = this.agora();
    for (const [id, e] of [...this.filaEsp]) if (!e.c.ws || e.c.ws.readyState !== 1 || e.c.sala || this.porId.get(id) !== e.c){
      this.filaEsp.delete(id);
      if (e.grp){ const G = this.g93S().grupos.get(e.grp); if (G && G.busca) this.g93BuscaCancela(G, (e.c.nome || 'Alguém') + ' saiu da busca.'); }
    }
    for (let n = 1; n <= 4; n++){
      let U = this.g93Unidades(n), g;
      while ((g = escolhe(U, 2*n, n, true))){ if (!this.g93Joga(g, n)) break; U = U.filter(u => g.indexOf(u) < 0); }
      if (n >= 2 && U.length && agora - U[0].t0 >= CFG.filaMista){
        g = escolhe(U, 2*n, n, false);
        if (g && g.reduce((s, u) => s + u.es.length, 0) >= 2 && this.g93Joga(g, n)) U = U.filter(u => g.indexOf(u) < 0);
      }
      // v103: ninguém apareceu — a ranqueada contra os bots roda no servidor (vale pontos, com o teto do dia contra os bots);
      // o grupo também (juntos no mesmo time, os bots completam)
      for (const u of U) if (agora - u.t0 >= CFG.filaMax) this.g93Joga([u], n);
    }
    if (this.filaEsp.size){ this.filaT = setTimeout(() => this.filaTenta(), 1000); if (this.filaT.unref) this.filaT.unref(); }
  };
}

module.exports = {aplica, configura, cabe, escolhe, times, GRUPO_MAX};
