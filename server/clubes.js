'use strict';
/* RACHA · servidor da turma — OS CLUBES (as mesmas regras e as mesmas respostas da plataforma, api/racha/clubeRouter.ts,
   para a tela do jogo ser uma só): um clube por jogador, até 30 membros, nome único, o dono edita, convida, tira e passa
   o clube; todo membro convida; quem sai por último fecha o clube; o dono que sai passa o clube para quem tem mais troféus.
   TROFÉUS = vitórias em partidas de sala que este servidor conferiu (resultado mandado pelo anfitrião, da rodada certa,
   com placar e tempo possíveis para o modo). Os do clube = a soma dos membros; o ranking é por troféus.
   TIPO: 'publico' entra quem tem os pontos mínimos · 'convite' só com convite (o convite passa por cima dos pontos mínimos).
   PAÍS: aparece na lista e no clube; a busca acha pelo nome do clube ou pela sigla do país (BR, PT…). */
const {limpa, chaveNome} = require('./banco');

const MAX_MEMBROS = 30;
const TROFEUS_OK = [0, 5, 10, 25, 50, 100, 200, 300, 500, 1000];
const ESCUDO_RE = /^E\.[A-Za-z0-9_-]{4,44}$/;
const TAMPA_RE = /^T\.[A-Za-z0-9_-]{4,44}$/;
const ESCUDO_PADRAO = 'E.AAgjz35Cxo4u34esSH___g';

class Erro extends Error {}
const falha = msg => { throw new Erro(msg); };

class Clubes {
  constructor(banco, opcoes){
    this.b = banco;
    this.mudou = (opcoes && opcoes.mudou) || (() => {});   // (id de quem mudou de clube) → a sala e o chat atualizam o escudo
    this.limites = new Map();                               // 'acao:id' → [instantes] (na memória)
  }
  get d(){ return this.b.d; }
  limite(chave, max, janelaMs, msg){
    const agora = Date.now(), l = (this.limites.get(chave) || []).filter(t => agora - t < janelaMs);
    if (l.length >= max) falha(msg);
    l.push(agora); this.limites.set(chave, l);
    if (this.limites.size > 5000) for (const [k, v] of this.limites) if (!v.some(t => agora - t < 864e5)) this.limites.delete(k);
  }
  trofeus(id){ const g = this.d.gente[id]; return g && g.st ? g.st.vit | 0 : 0; }
  placar(){                                                 // os troféus de cada clube e o ranking (empate = mesma posição)
    const por = new Map();
    for (const c of Object.values(this.d.clubes)) por.set(c.id, c.membros.reduce((s, m) => s + this.trofeus(m.id), 0));
    const ordem = [...por.values()].sort((a, b) => b - a);
    return {por, rank: id => 1 + ordem.filter(t => t > (por.get(id) || 0)).length};
  }
  resumo(c, p){
    p = p || this.placar();
    const dono = this.d.gente[c.dono];
    return {id:c.id, nome:c.nome, descricao:c.descricao, pais:c.pais, tipo:c.tipo, trofeuMinimo:c.trofeuMinimo, escudo:c.escudo,
      membros:c.membros.length, trofeus:p.por.get(c.id) || 0, ranking:p.rank(c.id), donoNome:dono ? dono.nome : ''};
  }
  clubeDe(id){ const g = this.d.gente[id]; return g && g.clube ? this.d.clubes[g.clube] || null : null; }
  pede(c){ const x = this.d.clubes[String(c)]; if (!x) falha('Clube não encontrado.'); return x; }
  entra(id, c, papel){
    if (c.membros.length >= MAX_MEMBROS) falha('Clube cheio (' + MAX_MEMBROS + ').');
    if (this.clubeDe(id)) falha('Você já está num clube: saia dele antes.');
    c.membros.push({id, papel:papel || 'membro', desde:Date.now()});
    this.d.gente[id].clube = c.id;
    this.d.convites = this.d.convites.filter(v => !(v.para === id && v.clube === c.id));
    this.b.marca(); this.mudou(id);
  }
  tira(id, c){                                              // quem sai: o dono passa para quem tem mais troféus; o último fecha
    const era = c.membros.find(m => m.id === id);
    c.membros = c.membros.filter(m => m.id !== id);
    const g = this.d.gente[id]; if (g && g.clube === c.id) g.clube = null;
    this.mudou(id);
    if (!c.membros.length){
      delete this.d.clubes[c.id];
      this.d.convites = this.d.convites.filter(v => v.clube !== c.id);
      this.b.marca();
      return {fechou:true};
    }
    if (era && era.papel === 'dono' && !c.membros.some(m => m.papel === 'dono')){
      const novo = c.membros.slice().sort((a, b) => this.trofeus(b.id) - this.trofeus(a.id) || a.desde - b.desde)[0];
      novo.papel = 'dono'; c.dono = novo.id;
    }
    this.b.marca();
    return {fechou:false};
  }
  achaJogador(termo){                                       // pelo ID na turma (000123) ou pelo nome (o visto por último)
    const t = String(termo || '').trim();
    if (/^0*\d{1,9}$/.test(t)){ const n = Number(t), todos = Object.values(this.d.gente); const g = todos.find(x => x.id[0] === 'c' && Number(x.pub) === n) || todos.find(x => Number(x.pub) === n); if (g) return g; }   // v82: a conta primeiro (IDs antigos de quem jogava sem conta podiam bater)
    const k = t.toLowerCase();
    return Object.values(this.d.gente).filter(x => String(x.nome || '').toLowerCase() === k).sort((a, b) => (b.visto || 0) - (a.visto || 0))[0] || null;
  }
  formulario(f, novo){
    const o = {};
    if (novo){
      o.nome = limpa(f && f.nome, 24);
      if (o.nome.length < 3 || chaveNome(o.nome).length < 2) falha('O nome precisa de 3 letras ou mais.');
    }
    if (!f || typeof f !== 'object') return o;
    if (f.descricao !== undefined) o.descricao = limpa(f.descricao, 60) || 'Chega mais e joga com a gente!';
    if (f.pais !== undefined){ if (!/^[A-Z]{2}$/.test(f.pais)) falha('País inválido.'); o.pais = f.pais; }
    if (f.tipo !== undefined){ if (f.tipo !== 'publico' && f.tipo !== 'convite') falha('Tipo inválido.'); o.tipo = f.tipo; }
    if (f.trofeuMinimo !== undefined){ if (!TROFEUS_OK.includes(f.trofeuMinimo)) falha('Pontos mínimos inválidos.'); o.trofeuMinimo = f.trofeuMinimo; }
    if (f.escudo !== undefined){ if (!ESCUDO_RE.test(f.escudo)) falha('Escudo inválido.'); o.escudo = f.escudo; }
    return o;
  }

  /* as operações (a tela do jogo chama pelo club_req); devolvem o mesmo formato da plataforma */
  op(eu, nome, a){
    a = a || {};
    const id = eu.id;
    switch (nome){
      case 'listar': {
        const b = limpa(a.busca, 24).toLowerCase(), bp = b.toUpperCase();
        const p = this.placar();
        return Object.values(this.d.clubes)
          .filter(c => !b || c.nome.toLowerCase().includes(b) || (bp.length === 2 && c.pais === bp))
          .sort((x, y) => (p.por.get(y.id) || 0) - (p.por.get(x.id) || 0) || x.criado - y.criado)
          .slice(0, 60).map(c => this.resumo(c, p));
      }
      case 'meu': { const c = this.clubeDe(id); return c ? this.resumo(c) : null; }
      case 'ver': {
        const c = this.pede(a.id), p = this.placar();
        const lista = c.membros.map(m => {
          const g = this.d.gente[m.id] || {};
          return {id:m.id, idTurma:g.pub ? String(g.pub).padStart(6, '0') : '', nome:g.nome || 'Jogador', pais:g.flag || null, papel:m.papel,
            trofeus:this.trofeus(m.id), tampa:TAMPA_RE.test(g.skin || '') ? g.skin : null, eu:m.id === id, desde:m.desde};
        }).sort((x, y) => (x.papel === 'dono' ? -1 : y.papel === 'dono' ? 1 : y.trofeus - x.trofeus || x.desde - y.desde));
        const me = lista.find(m => m.eu), dono = lista.find(m => m.papel === 'dono'), meu = this.clubeDe(id);
        return Object.assign(this.resumo(c, p), {donoNome:dono ? dono.nome : '', lista, souMembro:!!me, souDono:!!me && me.papel === 'dono',
          eu:{trofeus:this.trofeus(id), clubeId:meu ? meu.id : null}});
      }
      case 'criar': {
        this.limite('criar:' + id, 5, 864e5, 'Muitos clubes criados hoje. Tente amanhã.');
        const f = this.formulario(a, true), chave = chaveNome(f.nome);
        if (this.clubeDe(id)) falha('Saia do seu clube antes de criar outro.');
        if (Object.values(this.d.clubes).some(c => c.chave === chave)) falha('Já existe um clube com esse nome.');
        const c = {id:'k' + (++this.d.seq.clube), nome:f.nome, chave, descricao:f.descricao || 'Chega mais e joga com a gente!', pais:f.pais || 'BR', tipo:f.tipo || 'publico',
          trofeuMinimo:f.trofeuMinimo || 0, escudo:f.escudo || ESCUDO_PADRAO, dono:id, membros:[], criado:Date.now()};
        this.d.clubes[c.id] = c;
        this.entra(id, c, 'dono');
        return {id:c.id};
      }
      case 'editar': {
        const c = this.pede(a.id);
        if (c.dono !== id) falha('Só o dono do clube pode fazer isso.');
        const f = this.formulario(a.f || a, false);
        delete f.nome;                                        // (o nome não muda: é a chave do clube)
        Object.assign(c, f); this.b.marca();
        for (const m of c.membros) this.mudou(m.id);
        return {ok:true};
      }
      case 'entrar': {
        this.limite('entrar:' + id, 20, 36e5, 'Muitas tentativas. Tente mais tarde.');
        const c = this.pede(a.id);
        const convite = this.d.convites.find(v => v.clube === c.id && v.para === id);
        if (!convite){
          if (c.tipo === 'convite') falha('Esse clube é só com convite.');
          const t = this.trofeus(id);
          if (t < c.trofeuMinimo) falha('Precisa de ' + c.trofeuMinimo + ' troféus (você tem ' + t + ').');
        }
        this.entra(id, c);
        return {ok:true};
      }
      case 'sair': {
        const c = this.clubeDe(id);
        if (!c) return {ok:true, fechou:false};
        return Object.assign({ok:true}, this.tira(id, c));
      }
      case 'convidar': {
        this.limite('convite:' + id, 30, 36e5, 'Muitos convites seguidos. Tente mais tarde.');
        const c = this.clubeDe(id); if (!c) falha('Entre num clube para convidar.');
        const alvo = this.achaJogador(a.termo); if (!alvo) falha('Jogador não encontrado. Use o ID na turma (6 números) ou o nome exato.');
        if (alvo.id === id) falha('Você já está no clube.');
        if (alvo.clube === c.id) falha('Esse jogador já está no clube.');
        if (c.membros.length >= MAX_MEMBROS) falha('Clube cheio (' + MAX_MEMBROS + ').');
        this.d.convites = this.d.convites.filter(v => !(v.clube === c.id && v.para === alvo.id));
        const dele = this.d.convites.filter(v => v.para === alvo.id);
        if (dele.length >= 20) this.d.convites = this.d.convites.filter(v => v !== dele[0]);
        this.d.convites.push({id:'v' + (++this.d.seq.convite), clube:c.id, para:alvo.id, de:id, criado:Date.now()});
        this.b.marca();
        return {ok:true, nome:alvo.nome};
      }
      case 'convites': {
        const p = this.placar();
        return this.d.convites.filter(v => v.para === id && this.d.clubes[v.clube]).sort((x, y) => y.criado - x.criado).slice(0, 20)
          .map(v => ({id:v.id, clube:this.resumo(this.d.clubes[v.clube], p), de:{nome:(this.d.gente[v.de] || {}).nome || 'um membro'}}));
      }
      case 'responder': {
        const v = this.d.convites.find(x => x.id === String(a.id) && x.para === id);
        if (!v) falha('Convite não encontrado.');
        if (!a.aceitar){ this.d.convites = this.d.convites.filter(x => x !== v); this.b.marca(); return {ok:true}; }
        const c = this.d.clubes[v.clube]; if (!c) falha('Esse clube não existe mais.');
        this.entra(id, c);
        return {ok:true, id:c.id};
      }
      case 'expulsar':
      case 'passarDono': {
        const c = this.clubeDe(id);
        if (!c || c.dono !== id) falha('Só o dono do clube pode fazer isso.');
        const alvo = c.membros.find(m => m.id === String(a.id));
        if (!alvo || alvo.id === id) falha(alvo ? 'Jogador inválido.' : 'Esse jogador não está no clube.');
        if (nome === 'expulsar'){ this.tira(alvo.id, c); return {ok:true}; }
        alvo.papel = 'dono'; c.membros.find(m => m.id === id).papel = 'membro'; c.dono = alvo.id; this.b.marca();
        return {ok:true};
      }
      default: falha('Operação desconhecida.');
    }
  }
  /* o clube como aparece no cartão da sala e no chat (nome, escudo e uma sigla curta) */
  cartao(id){
    const c = this.clubeDe(id); if (!c) return null;
    const sig = c.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 4) || c.nome.slice(0, 3).toUpperCase();
    return {id:c.id, name:c.nome, tag:sig, escudo:c.escudo, color:'#3f7fe0', badge:'escudo', fonte:'turma'};
  }
}

module.exports = {Clubes, Erro, MAX_MEMBROS, ESCUDO_RE, TAMPA_RE};
