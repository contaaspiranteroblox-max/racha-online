'use strict';
/* =====================================================================================================================
   RACHA · O SERVIDOR DA TURMA — as salas online, o Chat do Brasil, os clubes, a copa dos amigos e os duelos 1v1.
   Sem dependências (Node 18 ou mais novo). Fala o protocolo que o jogo já fala (ver server/LEIAME.md).

   QUEM RODA A PARTIDA é o aparelho do dono da sala (o anfitrião): ele simula a física e manda os quadros (snapshot);
   os outros mandam os comandos (input) e o servidor entrega cada coisa para quem precisa. O servidor NÃO simula a bola:
   ele organiza a sala (times, regras, árbitro, pausa, revanche, quem entra e quem sai), repassa, e CONFERE O RESULTADO
   antes de guardar qualquer coisa: só vale o fim mandado pelo anfitrião, da rodada certa, com o mesmo placar dos quadros,
   com um placar possível para o modo e um tempo de jogo possível (partida encerrada pelo árbitro não vale). Só o que
   passou na conferência vira troféu (vitória), conta para o clube, para os duelos e para a copa.
   Com o segredo da plataforma (RACHA_SEGREDO_SALAS) ele também reconhece quem entrou com a conta do RACHA (o bilhete
   assinado pela plataforma) e assina o resultado de cada um (o selo), que a plataforma confere antes de dar XP.
   v79 · A RANQUEADA ONLINE: quem toca em JOGAR entra na fila do tamanho escolhido (fila {n, pts}); o servidor junta quem
   está esperando (pelos pontos mais perto) numa sala ranqueada (no Estádio, até 3 gols, sem árbitro nem revanche) e
   começa na hora. Depois de 8 s, 2 ou mais pessoas no mesmo tamanho jogam juntas e os bots completam; com ninguém em
   20 s, vai fila_nada e o jogo joga contra os bots. E o SELO da conta (verificado, parceiro, equipe, criador), que só
   vem assinado pela plataforma (o bilhete ou a sessão do site), vai no cartão da sala, na lista e no Chat do Brasil.
   v80 · A PARTIDA NORMAL (a ranqueada online, regra 'v80'): o RELÓGIO É DO SERVIDOR. 3:00 de jogo (sem as pausas);
   quem tiver mais gols no fim vence; 3 gols acabam na hora; 1 × 1 e 2 × 2 terminam empatados; só o 0 × 0 vai para a
   prorrogação (até −2:00: o primeiro gol vence, o GOL DE OURO; sem gol, empate). O servidor manda o relógio a cada
   segundo (relogio), anota cada gol na linha do tempo (o relógio dele e o que o anfitrião mandou), confere o resultado
   por ela (gol depois do fim, depois do tempo ou com o relógio do anfitrião longe do dele não vale) e encerra sozinho a
   partida que passou do fim sem o anfitrião mandar o resultado. Os times agora são o Time A (laranja) e o Time B (roxo).
   v81 · O CHAT: cada mensagem da sala tem um número (mid); `report {mid}` denuncia (2 pessoas diferentes: a mensagem some para
   todos, `say_hide`, e quem escreveu fica 5 min sem falar naquela sala); a mensagem repetida em menos de 30 s não vai; o filtro
   (o mesmo do Chat do Brasil) barra palavrão, link, @ e também telefone, e-mail e número de CPF (dados pessoais).
   v82 · AS CONTAS: o selo do resultado leva também se a partida era da RANQUEADA (k) e o tamanho do time (n) — a plataforma
   só mexe na patente da conta com o selo de uma ranqueada; os IDs de quem joga sem conta passam a ter 7 dígitos (9.000.001…),
   longe dos IDs das contas (6 dígitos), e a busca por ID acha a conta primeiro.
   v83 · SALAS 100% HOSPEDADAS NO SERVIDOR: NINGUÉM mais é anfitrião. Toda partida de sala (pública, privada, copa e
   ranqueada) é simulada aqui, no motor PartidaSala (partida/sala.js — o porte fiel da física do jogo): os aparelhos
   mandam só os comandos (input) e recebem os quadros (snapshot) no formato de sempre. O criador da sala vira um jogador
   comum durante a partida: ele só administra a sala (configurar, expulsar, começar) e essa função pode ser transferida —
   a simulação NUNCA sai do servidor. Se ele (ou qualquer um) cair no meio da partida, um bot assume a tampinha dele e a
   partida segue; ele volta para o mesmo lugar em até 90 s. Snapshot ou finish mandados por aparelho em sala hospedada
   não valem nada (viram registro de suspeito para investigação — sem banimento automático). Nas salas hospedadas a
   publicação mostra host:'srv' e o criador em admin: o jogo já entende isso como "a partida na nuvem" (v1.3 do cliente).
   ===================================================================================================================== */
const {Banco, sha, novoToken, novoId, limpa, inteiro, assina, confere} = require('./banco');
const {Clubes, Erro} = require('./clubes');
const {GerenteAuto} = require('./partida/gerente');   // v83: as partidas autoritativas (a física no servidor)
const {PartidaSala} = require('./partida/sala');      // v83: as salas 100% hospedadas (a física das salas no servidor)

const MODOS = ['futebol', 'curva', 'ginga', 'volei', 'americano', 'basquete'];   // (todos os que o jogo sabe conferir)
const MODOS_SALA = ['futebol', 'curva'];             // v70.2: as salas só abrem FUTEBOL e COM CURVA (os outros modos ficaram guardados no jogo)
const META = {futebol:3, curva:3, ginga:5, volei:3, americano:3, basquete:12};     // até quanto vai (sem tempo)
const MAX_PTS = {futebol:1, curva:1, ginga:2, volei:1, americano:1, basquete:3};    // o máximo de um lance (cesta de 3, gol de ginga)
const TEMPOS = [0, 2, 3, 5];
const N_MAPAS = 5;                                     // v70.2: 0 Arena · 1 Favela · 2 Escadão · 3 Viaduto · 4 Estádio (o gramado)
const MAPAS_SALA = [4, 0];                             // v70.2: as salas só abrem a ARENA e o ESTÁDIO · v79: o ESTÁDIO primeiro (o mapa padrão)
const MAPA_RANQUEADA = 4;                              // v79: a ranqueada é no Estádio
const FILA_MAX_MS = 20000, FILA_MISTA_MS = 8000;       // v79: a procura dura até 20 s; depois de 8 s, quem espera junto joga com bots completando
const REGRA80 = {seg:180, prorrog:120, meta:3};       // v80: a partida normal (3:00, a prorrogação de 2:00 só no 0 × 0, até 3 gols)
const TOL80 = {fim:2, atraso:3, adiante:1.5, sozinho:10, linha:64};   // v80 (s): o fim pode chegar 2 s antes da hora · o gol chega até 3 s depois
                                                       // do relógio do anfitrião (a rede) e o anfitrião não fica 1,5 s à frente do servidor ·
                                                       // 10 s depois da hora do fim, o servidor encerra · no máximo 64 mudanças de placar
const SELOS = ['equipe', 'criador', 'verificado', 'parceiro'];   // v79: o selo que aparece na frente do nome (o primeiro que a conta tiver)
const seloDe = l => Array.isArray(l) ? SELOS.find(s => l.includes(s)) || '' : '';
const MAX_GENTE = 12, MAX_SALAS = 300;
const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ARB_RE = /^⁣?ARB:([a-z])(?:\|([0-9a-z|,-]*))?$/;                         // as mensagens escondidas do árbitro (v68)
const SKIN_RE = /^[A-Za-z0-9._-]{1,48}$/, ESCUDO_RE = /^E\.[A-Za-z0-9_-]{4,44}$/;
const FILTRO = [
  /p[o0]+rr+a|p\*+a|put[4@a]|c[4a]r[4a]lh|buc[3e]t|f[0o]d[4a]|cuz[4aã]o|v[14i]a?d[o0]|p[3e]n[1i]s|m[3e]rd[4a]|arromb|vagabund|desgra[cç]|otari|retard|macac[oa]|preti[nh]/i,   // palavrão e ofensa (e as variações)
  /https?:|www\.|\.com\b|\.net\b|\.gg\b|\.br\b|discord\.|t\.me\/|bit\.ly|wa\.me|\.io\b|\.app\b|\.xyz\b|\.link\b|\.org\b/i,   // link (v81: mais alguns)
  /@[a-z0-9_.]{3,}/i,                                                                                                    // @ de rede social
  /(?:\(?\d{2}\)?[\s.-]?)?9?\s?\d{4}[\s.-]?\d{4}\b/,                                                                      // v81: telefone (dados pessoais)
  /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}\b/,                                                                           // v81: número tipo CPF
  /\S+@\S+\.\S+/                                                                                                         // v81: e-mail
];
const filtrado = t => FILTRO.some(r => r.test(t));
const limpaNome = s => limpa(s, 16) || 'Jogador';
const skinOk = s => typeof s === 'string' && SKIN_RE.test(s) ? s : '';
const flagOk = s => typeof s === 'string' && /^[A-Z]{2}$/.test(s) ? s : '';
function avatarOk(a){
  if (!a || typeof a !== 'object') return null;
  return {t:limpa(a.t, 3), e:typeof a.e === 'string' && /^[a-z0-9_-]{0,24}$/i.test(a.e) ? a.e : '', cor:typeof a.cor === 'string' && /^#[0-9a-f]{6}$/i.test(a.cor) ? a.cor : '#ffffff'};
}
function clubeAnunciado(o){                             // o clube que o jogo conta (o da conta do RACHA): só nome e escudo, para o cartão
  if (!o || typeof o !== 'object') return null;
  const name = limpa(o.nome, 24); if (!name) return null;
  return {name, tag:name.slice(0, 3).toUpperCase(), escudo:ESCUDO_RE.test(o.escudo || '') ? o.escudo : null, color:'#3f7fe0', badge:'escudo', fonte:'conta'};
}
const embaralha = l => { for (let i = l.length - 1; i > 0; i--){ const j = Math.floor(Math.random()*(i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };

class Turma {
  /* opcoes: arquivo (o JSON; sem ele só memória) · nome (aparece na sala) · segredo (o da plataforma, para o bilhete e o
     selo) · p2p (false = sem a conexão direta; tudo pelo servidor) · ice (os servidores STUN/TURN para a conexão direta) · log */
  constructor(o){
    o = o || {};
    this.nome = limpa(o.nome, 40) || 'Servidor da turma';
    this.segredo = o.segredo || '';
    this.p2p = o.p2p !== false;
    this.exigeConta = o.exigeConta !== false;            // v84: sem conta da plataforma não entra nas salas (login obrigatório)
    this.agora = typeof o.agora === 'function' ? o.agora : Date.now;   // (os testes adiantam o relógio da partida)
    const r8 = o.regra80 || {};                          // v80: o tempo da partida normal (3:00 e 2:00; os testes e as demonstrações podem encurtar)
    this.r80 = {seg:r8.seg > 0 ? Math.min(3600, +r8.seg) : REGRA80.seg, prorrog:r8.prorrog > 0 ? Math.min(3600, +r8.prorrog) : REGRA80.prorrog, meta:REGRA80.meta};
    this.ice = Array.isArray(o.ice) && o.ice.length ? o.ice : null;
    this.log = typeof o.log === 'function' ? o.log : (t => console.log(new Date().toISOString().slice(0, 19).replace('T', ' ') + ' ' + t));
    this.b = new Banco(o.arquivo, t => this.log(t));
    this.clubes = new Clubes(this.b, {mudou:id => this.clubeMudou(id)});
    this.clientes = new Set();
    this.porId = new Map();                              // id → a conexão das salas (a mais nova)
    this.salas = new Map();
    this.chat = {msgs:[], seq:0, denuncias:new Map(), silencio:new Map(), onT:0};
    this.filaEsp = new Map();                            // v79: id → {c, n, pts, t0} (quem procura a ranqueada)
    this.filaT = null;
    this.listaT = null;
    this.relogio = setInterval(() => this.batimento(), 15000);
    if (this.relogio.unref) this.relogio.unref();
    // v83: as partidas autoritativas (a física roda AQUI, não no anfitrião). Mesma conta (o bilhete), mesmo selo,
    // salas separadas das de sempre: uma não interfere na outra. O jogo da v82 não manda auto_*, então nada muda para ele.
    this.auto = new GerenteAuto({segredo:this.segredo, agora:() => this.agora(), log:t => this.log(t),
      regra:{seg:this.r80.seg, prorrog:this.r80.prorrog}, assina});
    this.cronoT = setInterval(() => this.relogios(), 1000);   // v80: o relógio das partidas normais (1 vez por segundo)
    if (this.cronoT.unref) this.cronoT.unref();
  }

  /* ------------------------------------------------------------------ as conexões */
  conecta(ws, req){
    const ip = (req && (String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress))) || '';
    const r = req && req.racha;                          // (montado na plataforma: a conta da sessão do site, conferida antes do aperto de mão)
    const contaSessao = r && /^\d{1,9}$/.test(String(r.idPublico)) ? {idPublico:String(Number(r.idPublico)).padStart(6, '0'), nome:limpa(r.nome, 20) || 'Jogador', selo:seloDe(r.selos)} : null;
    const c = {ws, id:null, brasil:false, brasilId:null, nome:'Jogador', skin:'', flag:'BR', avatar:null, conta:null, contaSessao, selo:'', sala:null, p2p:false,
      ip, baldes:{}, substituido:false, ultBrasil:0, ultTextoBrasil:'', clubeAnunciado:null};
    ws.vivo = true;
    this.clientes.add(c);
    ws.on('message', txt => { ws.vivo = true; try { this.recebe(c, txt); } catch (e) { this.log('erro tratando mensagem: ' + (e && e.stack || e)); } });
    ws.on('close', () => this.fechou(c));
    return c;
  }
  manda(c, obj){ return this.mandaTxt(c, JSON.stringify(obj)); }
  mandaTxt(c, txt){
    const ws = c && c.ws;
    if (!ws || ws.readyState !== 1) return false;
    if (ws.bufferedAmount > 2e6) return false;           // (conexão entupida: o quadro velho não serve mais)
    return ws.send(txt);
  }
  erro(c, message, codigo){ this.manda(c, codigo ? {type:'error', message, codigo} : {type:'error', message}); }
  balde(c, k, porSeg, max){                              // limite de ritmo (balde de fichas) por conexão
    const agora = Date.now(); let b = c.baldes[k];
    if (!b) b = c.baldes[k] = {t:agora, n:max};
    b.n = Math.min(max, b.n + (agora - b.t)/1000*porSeg); b.t = agora;
    if (b.n < 1) return false;
    b.n -= 1; return true;
  }
  recebe(c, txt){
    if (typeof txt !== 'string' || txt.length > 65536) return;
    let m; try { m = JSON.parse(txt); } catch (_) { return; }
    if (!m || typeof m !== 'object' || typeof m.type !== 'string') return;
    const t = m.type;
    if (t === 'input') return this.input(c, m);
    if (t === 'snapshot') return this.snapshot(c, m);
    if (t.startsWith('auto_')) return this.auto.recebe(c, m);   // v83: os comandos da partida autoritativa (ritmo próprio)
    if (!this.balde(c, 'geral', 30, 90)) return;
    if (t.startsWith('brasil_')) return this.brasilRecebe(c, m);
    if (t === 'ping') return this.manda(c, {type:'pong', time:m.time});
    if (t === 'hello') return this.hello(c, m);
    if (!c.id) return;
    const f = Turma.ACOES[t]; if (f) this[f](c, m);
  }
  fechou(c){
    if (!this.clientes.delete(c)) return;
    this.auto.sair(c, true);                           // v83: caiu da partida autoritativa (o lugar fica para a reconexão)
    if (c.id && this.filaEsp.get(c.id) && this.filaEsp.get(c.id).c === c) this.filaEsp.delete(c.id);   // v79: caiu procurando: sai da fila
    if (c.brasil) this.brasilOnline();
    if (!c.id) return;
    if (this.porId.get(c.id) === c) this.porId.delete(c.id);
    if (c.substituido) return;                           // (a conexão nova do mesmo jogador ficou com a sala)
    if (c.sala) this.sai(c, 'caiu');
    this.listaMudou();
  }
  batimento(){                                           // a cada 15 s: quem não respondeu cai; sala vazia some
    for (const c of this.clientes){
      if (!c.ws.vivo){ try { c.ws.terminate(); } catch (_) {} continue; }
      c.ws.vivo = false; try { c.ws.ping(); } catch (_) {}
    }
    const agora = Date.now();
    for (const r of this.salas.values()){
      for (const [id, v] of r.reservas) if (v.ate < agora) r.reservas.delete(id);
      for (const [id, t] of r.removidos) if (t < agora) r.removidos.delete(id);
      if (!r.members.some(x => !x.bot) && r.vaziaAte < agora) this.fechaSala(r);
    }
    for (const [id, t] of this.chat.silencio) if (t < agora) this.chat.silencio.delete(id);
  }
  status(){ return {ok:true, nome:this.nome, salas:this.salas.size, online:this.porId.size, chat:[...this.clientes].filter(c => c.brasil).length, clubes:Object.keys(this.b.d.clubes).length, auto:this.auto.resumo()}; }   // v83: + as partidas autoritativas no /saude
  fecha(){ this.auto.fecha(); clearInterval(this.relogio); clearInterval(this.cronoT); clearTimeout(this.listaT); clearTimeout(this.filaT); for (const c of this.clientes) try { c.ws.close(1001, 'servidor desligando'); } catch (_) {} this.b.salvaJa(); }

  /* ------------------------------------------------------------------ quem é quem */
  bilhete(txt){                                          // o bilhete da conta do RACHA (assinado pela plataforma)
    const o = confere(this.segredo, txt);
    if (!o || !/^\d{1,9}$/.test(String(o.p)) || typeof o.n !== 'string') return null;
    return {idPublico:String(Number(o.p)).padStart(6, '0'), nome:limpa(o.n, 20) || 'Jogador', selo:seloDe(o.s)};   // v79: o selo vem assinado (s: a lista da conta)
  }
  gente(id){
    let g = this.b.d.gente[id];
    if (!g){
      if (this.b.d.seq.pub < 9000000) this.b.d.seq.pub = 9000000;                     // v82: os IDs de quem joga sem conta têm 7 dígitos (9.000.001…): não batem com os das contas (6 dígitos)
      g = this.b.d.gente[id] = {id, pub:0, nome:'Jogador', skin:'', flag:'BR', criado:Date.now(), visto:0, conta:null, clube:null, st:{jogos:0, vit:0, der:0, emp:0, gols:0}};
      g.pub = id[0] === 'c' ? Number(id.slice(1)) : ++this.b.d.seq.pub;
    }
    return g;
  }
  hello(c, m){
    if (c.id) return;
    const conta = c.contaSessao || this.bilhete(m.conta);
    // v84: login obrigatório — sem conta válida (sessão da plataforma ou bilhete assinado) a conexão é recusada.
    if (this.exigeConta && !conta){
      this.erro(c, 'Para jogar online você precisa entrar na sua conta do RACHA.', 'sem_conta');
      try { c.ws.close(4001, 'login obrigatorio'); } catch (_) {}
      return;
    }
    let tok = typeof m.token === 'string' && m.token.length >= 16 && m.token.length <= 80 ? m.token : null;
    let id = conta ? 'c' + Number(conta.idPublico) : tok ? this.b.d.tokens[sha(tok)] || null : null;
    if (!id) id = novoId('u', 9);
    if (!tok || this.b.d.tokens[sha(tok)] !== id){ tok = novoToken(); this.b.d.tokens[sha(tok)] = id; }
    const g = this.gente(id);
    g.nome = conta ? conta.nome : limpaNome(m.name); g.skin = skinOk(m.skin) || g.skin; g.flag = flagOk(m.flag) || g.flag || 'BR';
    g.visto = Date.now(); if (conta) g.conta = conta.idPublico;
    this.b.marca();
    Object.assign(c, {id, conta, selo:conta ? conta.selo || '' : '', nome:g.nome, skin:g.skin, flag:g.flag, avatar:avatarOk(m.avatar), clubeAnunciado:clubeAnunciado(m.clube)});
    const velho = this.porId.get(id);
    if (velho && velho !== c){                           // o mesmo jogador abriu de novo (voltou a internet, ou outra aba): a nova fica
      velho.substituido = true;
      if (velho.sala) c.sala = velho.sala;
      this.erro(velho, 'O jogo foi aberto em outra aba ou aparelho com este perfil: esta aqui parou de receber.', 'outra_aba');
      try { velho.ws.close(4000, 'outra aba'); } catch (_) {}
    }
    this.porId.set(id, c);
    const msg = {type:'hello', id, token:tok, server:{name:this.nome}, p2p:this.p2p, pub:String(g.pub).padStart(6, '0'), conta:!!conta, selo:c.selo || ''};   // v79: + o seu selo (o V na frente do nome; vem da conta, nunca do jogo)
    if (this.ice) msg.ice = this.ice;
    this.manda(c, msg);
    this.manda(c, this.listaMsg());
    if (c.sala){                                         // ficou com a sala da conexão antiga: a tela dela volta
      const r = this.salas.get(c.sala), eu = r && r.members.find(x => x.id === id);
      if (!eu){ c.sala = null; return; }
      Object.assign(eu, {name:c.nome, selo:c.selo || '', skin:c.skin, flag:c.flag, avatar:c.avatar, club:this.cartaoClube(c)});
      this.manda(c, {type:'sayHistory', list:r.hist.slice(-30)});
      if (r.state === 'playing' && r.host === id && !r.servidor) this.interrompe(r, 'Quem rodava a partida reconectou: a partida parou sem resultado.');
      if (r.state === 'playing' && r.partida && r.roster.includes(id)) r.partida.entra(id, c.nome);   // v83: reassume a tampinha (o bot sai)
      this.salaMuda(r);
      if (r.state === 'playing') this.manda(c, {type:'start', room:this.publica(r), resume:this.retomada(r)});
    }
  }

  /* ------------------------------------------------------------------ as salas */
  codigo(){ let s; do { s = ''; for (let i = 0; i < 6; i++) s += ALFA[Math.floor(Math.random()*ALFA.length)]; } while (this.salas.has(s)); return s; }
  salaDe(c){ return c.sala ? this.salas.get(c.sala) || null : null; }
  cartaoClube(c){ return this.clubes.cartao(c.id) || c.clubeAnunciado || null; }
  membro(c){ return {id:c.id, name:c.nome, selo:c.selo || '', flag:c.flag || 'BR', skin:c.skin, avatar:c.avatar, club:this.cartaoClube(c), slot:-1, ready:false, rematch:false}; }
  publica(r){
    const srv = !!r.servidor;                        // v83: sala hospedada: ninguém é anfitrião; o criador é o admin
    return {code:r.code, name:r.name, host:srv ? 'srv' : r.host, admin:srv && !r.ranked ? r.host : null, servidor:srv, n:r.n, map:r.map, jogo:r.jogo, tempo:r.tempo, bots:r.bots, pub:r.pub, state:r.state, ranked:!!r.ranked,
      round:r.round, roster:r.roster, members:r.members, tournament:r.tournament ? {name:r.tournament.name, rounds:r.tournament.rounds, matches:r.tournament.matches, champion:r.tournament.champion} : null,
      oficial:false, regra:r.regra || '', relogio:r.regra === 'v80' && r.state === 'playing' ? this.relogioDe(r) : null};   // v80: a regra e o relógio do servidor
  }
  decorrido(r){                                          // v80: o tempo de jogo da rodada no relógio do servidor (ms, sem as pausas)
    if (!r.inicio) return 0;
    const agora = this.agora();
    return Math.max(0, agora - r.inicio - r.pausadoMs - (r.pausa ? agora - r.pausa : 0));
  }
  relogioDe(r){ return {ms:Math.round(this.decorrido(r)), pausado:!!r.pausa, seg:this.r80.seg, prorrog:this.r80.prorrog}; }
  relogios(){                                            // v80: a cada segundo, o relógio das partidas normais (e o fim que o anfitrião não mandou)
    for (const r of this.salas.values()){
      if (r.state !== 'playing' || r.regra !== 'v80') continue;
      this.todos(r, Object.assign({type:'relogio', round:r.round}, this.relogioDe(r)));
      if (r.servidor) continue;                          // v83: na sala hospedada o próprio motor encerra a partida no tempo
      if (r.pausa) continue;
      const el = this.decorrido(r)/1000, f = this.fim80(r);
      if (f.erro){ if (el >= this.r80.seg + this.r80.prorrog + TOL80.sozinho) this.encerra(r, r.ultimo ? r.ultimo.score.slice() : [0, 0], true); }
      else if (el >= f.at + TOL80.sozinho) this.encerra(r, f.s.slice(), true);
    }
  }
  fim80(r){                                              // v80: como a partida tem de acabar, pela linha do tempo dos gols → {s, at, ouro, aberto} ou {erro}
    let s = [0, 0], fim = null;
    const R8 = this.r80, lim = R8.seg + .5, limOT = R8.seg + R8.prorrog + .5;   // (meio segundo: o gol do último quadro antes da hora)
    if ((r.linha || []).length > TOL80.linha) return {erro:'o placar mudou vezes demais'};
    for (const g of r.linha || []){
      const real = g.ms/1000;
      if (real - g.el > TOL80.atraso || g.el - real > TOL80.adiante) return {erro:'o relógio do anfitrião não bate com o do servidor'};
      if (fim) return {erro:'gol depois do fim da partida'};
      if (g.s[0] < s[0] || g.s[1] < s[1]) return {erro:'o placar voltou para trás'};
      if (g.el >= lim){                                  // depois dos 3:00 só vale o GOL DE OURO (do 0 × 0, na prorrogação)
        if (s[0] || s[1]) return {erro:'gol depois do tempo'};
        if (g.el >= limOT) return {erro:'gol depois da prorrogação'};
        s = g.s.slice(); fim = {s, at:g.el, ouro:true}; continue;
      }
      s = g.s.slice();
      if (Math.max(s[0], s[1]) >= R8.meta) fim = {s, at:g.el};
    }
    return fim || {s, at:s[0] || s[1] ? R8.seg : R8.seg + R8.prorrog, aberto:true};
  }
  retomada(r){ const u = r.ultimo; return {score:u ? u.score.slice() : [0, 0], tick:u ? u.tick : 0, elapsed:u ? u.elapsed : 0}; }
  todos(r, obj, exceto){
    const txt = JSON.stringify(obj);
    for (const x of r.members){
      if (x.bot || (exceto && x.id === exceto.id)) continue;
      const cl = this.porId.get(x.id); if (cl && cl.sala === r.code) this.mandaTxt(cl, txt);
    }
  }
  salaMuda(r){ this.todos(r, {type:'room', room:this.publica(r)}); this.listaMudou(); }
  diz(r, msg){ r.hist.push(msg); if (r.hist.length > 40) r.hist.shift(); this.todos(r, msg); }
  livre(r, t){ for (let k = 0; k < r.n; k++){ const i = t*r.n + k; if (!r.roster[i]) return i; } return -1; }
  senta(r, m, slot){
    if (m.slot >= 0 && r.roster[m.slot] === m.id) r.roster[m.slot] = null;
    m.slot = slot; m.ready = false; if (slot >= 0) r.roster[slot] = m.id;
  }
  novoN(r, n){                                           // mudou o tamanho dos times: quem cabe fica no lugar, o resto assiste
    const vn = r.n; r.n = n; r.roster = new Array(2*n).fill(null);
    for (const m of r.members){
      if (m.slot < 0) continue;
      const t = Math.floor(m.slot/vn), k = m.slot % vn;
      if (k < n){ m.slot = t*n + k; r.roster[m.slot] = m.id; } else m.slot = -1;
    }
  }
  listaMsg(){
    const list = [];
    for (const r of this.salas.values()){
      if (!r.pub || !r.members.some(x => !x.bot)) continue;
      const dono = r.members.find(x => x.id === r.host);
      if (r.ranked) continue;                            // v79: a ranqueada não aparece na lista
      list.push({code:r.code, name:r.name, flag:dono ? dono.flag : 'BR', selo:dono ? dono.selo || '' : '', n:r.n, jogo:r.jogo, map:r.map, tempo:r.tempo, bots:r.bots, state:r.state,
        cup:!!r.tournament, oficial:false, players:r.roster.filter(Boolean).length, max:2*r.n, people:r.members.length});
      if (list.length >= 100) break;
    }
    return {type:'rooms', list, online:this.porId.size};
  }
  listaMudou(){                                          // quem está na lista de salas (fora de sala) vê a lista nova (no máximo 2 por segundo)
    if (this.listaT) return;
    this.listaT = setTimeout(() => {
      this.listaT = null;
      const txt = JSON.stringify(this.listaMsg());
      for (const c of this.porId.values()) if (!c.sala) this.mandaTxt(c, txt);
    }, 500);
  }
  interrompe(r, message){
    if (r.pausa){ r.pausadoMs += this.agora() - r.pausa; r.pausa = null; }
    r.state = 'waiting'; r.interrompida = r.round;
    this.todos(r, {type:'interrupted', message});
  }
  fechaSala(r){ this.salas.delete(r.code); this.log('sala ' + r.code + ' fechou'); this.listaMudou(); }
  sai(c, motivo){                                        // saiu, caiu ou foi removido
    const r = this.salaDe(c); c.sala = null;
    if (!r) return;
    const eu = r.members.find(x => x.id === c.id); if (!eu) return;
    if (eu.slot >= 0 && r.roster[eu.slot] === eu.id) r.roster[eu.slot] = null;
    r.members = r.members.filter(x => x !== eu);
    if (motivo === 'caiu' && eu.slot >= 0) r.reservas.set(eu.id, {slot:eu.slot, ate:Date.now() + 90000});   // volta para o mesmo lugar (90 s)
    if (r.partida) r.partida.sai(eu.id);               // v83: um bot assume a tampinha NA HORA — a partida não para por ninguém
    const gente = r.members.filter(x => !x.bot);
    if (!gente.length){
      this.abortaPartida(r);                           // v83: sem ninguém para jogar, a partida acaba sem resultado
      if (r.state === 'playing') r.state = 'waiting';
      if (motivo === 'caiu'){ r.vaziaAte = Date.now() + 90000; this.listaMudou(); return; }   // (quem caiu pode voltar)
      this.fechaSala(r); return;
    }
    if (r.host === eu.id){                               // o dono saiu: a sala passa para quem está há mais tempo (o árbitro decide o resto)
      r.host = gente[0].id;
      if (r.state === 'playing' && !r.servidor) this.interrompe(r, motivo === 'caiu' ? 'Quem rodava a partida caiu: a partida parou sem resultado.' : 'Quem rodava a partida saiu: a partida parou sem resultado.');
      // v83: na sala hospedada só a função de admin muda de mão — a partida segue normalmente (a REGRA FUNDAMENTAL)
      if (r.servidor && r.pausa){                        // quem pausou foi embora: a partida dos outros não fica congelada
        r.pausadoMs += this.agora() - r.pausa; r.pausa = null;
        if (r.partida) r.partida.pausado = false;
        this.todos(r, {type:'pause', paused:false});
      }
    }
    this.diz(r, {type:'say', sys:true, who:eu.id, text:eu.name + (motivo === 'kick' ? ' foi removido da sala' : motivo === 'caiu' ? ' caiu (pode voltar)' : ' foi embora da sala'), t:Date.now()});
    this.salaMuda(r);
  }
  clubeMudou(id){                                        // entrou, saiu ou o clube mudou: o escudo no cartão da sala acompanha
    const c = this.porId.get(id); if (!c || !c.sala) return;
    const r = this.salaDe(c), eu = r && r.members.find(x => x.id === id);
    if (eu){ eu.club = this.cartaoClube(c); this.salaMuda(r); }
  }

  /* ------------------------------------------------------------------ o que o jogo manda (a sala) */
  list(c){ this.manda(c, this.listaMsg()); }
  create(c, m){
    if (!this.balde(c, 'criaSala', .2, 3)) return this.erro(c, 'Calma: espere um pouco para criar outra sala.');
    if (this.salas.size >= MAX_SALAS) return this.erro(c, 'O servidor está cheio de salas agora. Tente daqui a pouco.');
    if (c.sala) this.sai(c, 'saiu');
    const n = inteiro(m.n, 1, 4, 2);
    const r = {code:this.codigo(), name:limpa(m.name, 24) || 'Racha de ' + c.nome, host:c.id, n, map:MAPAS_SALA.includes(m.map) ? m.map : MAPAS_SALA[0],
      jogo:MODOS_SALA.includes(m.jogo) ? m.jogo : 'futebol', tempo:TEMPOS.includes(m.tempo) ? m.tempo : 0, bots:!!m.bots, pub:m.pub !== false, servidor:true,
      state:'waiting', round:0, roster:new Array(2*n).fill(null), members:[], tournament:null, hist:[], reservas:new Map(), removidos:new Map(),
      inicio:0, pausa:null, pausadoMs:0, ultimo:null, gols:{}, encerrada:-1, interrompida:-1, vaziaAte:0, criada:Date.now()};
    this.salas.set(r.code, r); c.sala = r.code;
    const eu = this.membro(c); r.members.push(eu); this.senta(r, eu, 0);   // quem cria começa no Time A (o jogo põe o árbitro assistindo) · v80: Time A (laranja) × Time B (roxo)
    this.manda(c, {type:'sayHistory', list:[]});
    this.salaMuda(r);
    this.diz(r, {type:'say', sys:true, who:c.id, text:eu.name + ' chegou na sala', t:Date.now()});
    this.log('sala ' + r.code + ' criada por ' + c.nome + (r.pub ? ' (aberta)' : ' (fechada)'));
  }
  join(c, m){
    const code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6), r = this.salas.get(code);
    if (!r) return this.erro(c, 'Sala não encontrada. Confira o código (ela fecha quando todo mundo sai).');
    const rem = r.removidos.get(c.id);
    if (rem && rem > Date.now()) return this.erro(c, 'Você foi removido desta sala. Espere um pouco para voltar.');
    if (r.ranked && !r.members.some(x => x.id === c.id) && !r.reservas.has(c.id)) return this.erro(c, 'Essa é uma partida ranqueada: entre pela busca do JOGAR.');
    if (c.sala && c.sala !== code) this.sai(c, 'saiu');
    let eu = r.members.find(x => x.id === c.id);
    const novo = !eu;
    if (novo){
      if (r.members.length >= MAX_GENTE) return this.erro(c, 'A sala está cheia (' + MAX_GENTE + ' pessoas).');
      eu = this.membro(c); r.members.push(eu);
    } else Object.assign(eu, {name:c.nome, selo:c.selo || '', skin:c.skin, flag:c.flag, avatar:c.avatar, club:this.cartaoClube(c)});
    c.sala = code;
    const res = r.reservas.get(c.id); r.reservas.delete(c.id); r.vaziaAte = 0;
    if (r.state === 'playing'){
      if (res && Number.isInteger(m.slot) && m.slot === res.slot && !r.roster[m.slot]) this.senta(r, eu, m.slot);   // voltou para o lugar dele no meio da partida
      if (!novo && r.partida && r.roster.includes(c.id)) r.partida.entra(c.id, c.nome);   // v83: reassume a tampinha (o bot sai)
      if (novo && r.partida && res && r.roster.includes(c.id)) r.partida.entra(c.id, c.nome);
    }
    if (novo && r.state === 'playing'){
      // (lugar recuperado acima; espectador novo no meio da partida só assiste)
    } else if (novo && !r.tournament){
      if (m.rapido){                                     // JOGAR AGORA: um lugar no time com menos gente (o árbitro ainda pode mudar)
        const a = r.roster.slice(0, r.n).filter(Boolean).length, b = r.roster.slice(r.n).filter(Boolean).length;
        const t = a <= b ? 0 : 1, s = this.livre(r, t) >= 0 ? this.livre(r, t) : this.livre(r, 1 - t);
        if (s >= 0) this.senta(r, eu, s);
      } else if (Number.isInteger(m.slot) && m.slot >= 0 && m.slot < 2*r.n && !r.roster[m.slot] && !m.spectate) this.senta(r, eu, m.slot);
    }
    if (!r.members.some(x => x.id === r.host)) r.host = c.id;   // (sala que ficou vazia esperando: quem volta é o dono)
    this.manda(c, {type:'sayHistory', list:r.hist.slice(-30)});
    if (r.state === 'playing' && r.host === c.id && !r.servidor) this.interrompe(r, 'Quem rodava a partida reconectou: a partida parou sem resultado.');
    this.salaMuda(r);
    if (novo) this.diz(r, {type:'say', sys:true, who:c.id, text:eu.name + ' chegou na sala', t:Date.now()});
    if (r.state === 'playing') this.manda(c, {type:'start', room:this.publica(r), resume:this.retomada(r)});
  }
  leave(c){ if (c.sala) this.sai(c, 'saiu'); this.manda(c, {type:'left'}); }
  seat(c, m){
    const r = this.salaDe(c); if (!r) return;
    const eu = r.members.find(x => x.id === c.id); if (!eu) return;
    if (r.ranked) return this.erro(c, 'Na ranqueada os times são do sorteio.');
    if (r.state === 'playing') return this.erro(c, 'A partida está rolando. Espere acabar para mexer nos times.');
    if (r.tournament) return this.erro(c, 'Na copa os lugares são do chaveamento.');
    let alvo = eu;
    if (m.id && m.id !== c.id){
      if (r.host !== c.id) return this.erro(c, 'Só o árbitro da sala mexe nos outros.');
      alvo = r.members.find(x => x.id === m.id); if (!alvo) return;
    }
    let slot = alvo.slot;
    if (Number.isInteger(m.slot)) slot = m.slot < 0 ? -1 : m.slot < 2*r.n && !r.roster[m.slot] ? m.slot : alvo.slot;
    else if (m.team === 0 || m.team === 1){
      if (alvo.slot >= 0 && Math.floor(alvo.slot/r.n) === m.team) return;
      slot = this.livre(r, m.team);
      if (slot < 0) return this.erro(c, (m.team ? 'O Time B' : 'O Time A') + ' está cheio.');
    } else return;
    if (slot === alvo.slot) return;
    this.senta(r, alvo, slot); this.salaMuda(r);
  }
  config(c, m){
    const r = this.salaDe(c); if (!r || r.host !== c.id || r.state === 'playing' || r.ranked) return;
    if (!r.tournament && [1, 2, 3, 4].includes(m.n) && m.n !== r.n) this.novoN(r, m.n);
    if (MAPAS_SALA.includes(m.map)) r.map = m.map;        // v70.2: só a Arena e o Estádio
    if (MODOS_SALA.includes(m.jogo)) r.jogo = m.jogo;       // v70.2: só futebol e com curva
    if (TEMPOS.includes(m.tempo)) r.tempo = m.tempo;
    if (typeof m.bots === 'boolean' && !r.tournament) r.bots = m.bots;
    if (typeof m.pub === 'boolean') r.pub = m.pub;
    if (typeof m.name === 'string' && limpa(m.name, 24)) r.name = limpa(m.name, 24);
    this.salaMuda(r);
  }
  ready(c, m){ const r = this.salaDe(c), eu = r && r.members.find(x => x.id === c.id); if (!eu) return; eu.ready = !!m.on; this.salaMuda(r); }
  rematch(c, m){
    const r = this.salaDe(c), eu = r && r.members.find(x => x.id === c.id); if (!eu) return;
    if (r.ranked) return this.erro(c, 'Na ranqueada não tem revanche: toque em JOGAR DE NOVO para procurar outra partida.');
    if (r.host === c.id){ if (r.state !== 'playing' && !r.tournament) this.start(c); return; }   // o dono pedindo revanche: começa de novo
    eu.rematch = m.on !== false; this.salaMuda(r);
  }
  motivo(r){                                             // o mesmo que o jogo confere antes de começar (slMotivo)
    if (r.tournament) return r.roster[0] && r.roster[1] ? '' : 'Os dois do duelo precisam estar na sala (toque em PRÓXIMO DUELO).';
    const gente = r.roster.filter(Boolean).length;
    if (!gente) return 'Ninguém está nos times. Toque no Time A ou no Time B para entrar.';
    const falta = r.roster.length - gente;
    if (!r.bots && falta) return 'Falta' + (falta > 1 ? 'm ' + falta + ' jogadores' : ' 1 jogador') + '. Chame a galera em CONVIDAR ou ligue os BOTS.';
    return '';
  }
  start(c){
    const r = this.salaDe(c); if (!r || r.host !== c.id || r.state === 'playing' || r.ranked) return;
    if (r.tournament && r.tournament.champion) return this.erro(c, 'A copa acabou: toque em ENCERRAR COPA.');
    const motivo = this.motivo(r); if (motivo) return this.erro(c, motivo);
    Object.assign(r, {state:'playing', inicio:this.agora(), pausa:null, pausadoMs:0, ultimo:null, gols:{}, linha:[]});
    r.round++; r.reservas.clear();
    for (const x of r.members){ x.ready = false; x.rematch = false; }
    if (r.servidor) this.ligaPartida(r);             // v83: a partida nasce no servidor, não no aparelho de ninguém
    this.todos(r, {type:'start', room:this.publica(r)});
    this.salaMuda(r);
  }
  ligaPartida(r){                                      // v83: o motor autoritativo da sala (todos os lugares, com bots nas vagas)
    if (r.partida) return;
    const jogadores = [];
    for (let i = 0; i < 2*r.n; i++){
      const id = r.roster[i], x = id && r.members.find(m => m.id === id);
      if (x) jogadores.push({netId:x.id, nome:x.name});
      else jogadores.push({netId:null, nome:'Bot', bot:'dificil'});   // (o motivo() garante sala cheia quando bots desligados)
    }
    const p = new PartidaSala({
      n:r.n, jogo:r.jogo, map:r.map, tempo:r.tempo, regra:r.regra, ranked:r.ranked, r80:this.r80, jogadores,
      agora:() => this.agora(), decorrido:() => this.decorrido(r),
      log:t => this.log(t),
      suspeito:(id, tipo, det) => this.log('suspeito na sala ' + r.code + ': ' + id + ' ' + tipo + (det ? ' (' + det + ')' : '')),   // registro para investigação, sem banimento automático
      onSnapshot:data => {
        r.ultimo = {score:data.score.slice(), elapsed:data.elapsed, tick:data.tick, state:data.state};
        this.todos(r, {type:'snapshot', round:r.round, data});
      },
      onGol:g => {
        if (g.author) r.gols[g.author] = (r.gols[g.author] | 0) + 1;
        if (r.regra === 'v80') (r.linha || (r.linha = [])).push({s:g.placar.slice(), el:Math.max(0, g.el), ms:this.decorrido(r)});   // a linha do tempo (auditoria)
      },
      onAviso:txt => this.diz(r, {type:'say', sys:true, who:'', text:txt, t:Date.now()}),
      onFim:res => this.encerraServidor(r, res),
    });
    r.partida = p;
    p.ligar();
    this.log('sala ' + r.code + ': partida hospedada começou (' + r.n + 'v' + r.n + ', ' + r.jogo + (r.regra === 'v80' ? ', v80' : r.tempo ? ', ' + r.tempo + ' min' : ', até ' + 3) + ')');
  }
  encerraServidor(r, res){                             // v83: o motor terminou a partida (ele é a autoridade do placar)
    if (r.partida){ r.partida.desligar(); r.partida = null; }
    if (r.state !== 'playing') return;
    this.encerra(r, res.placar.slice(), true);
  }
  abortaPartida(r){                                    // v83: a sala esvaziou (ou fechou) no meio da partida: para o motor sem resultado
    if (r.partida){ r.partida.aborta(); r.partida.desligar(); r.partida = null; }
  }
  snapshot(c, m){                                        // o quadro do anfitrião: repassa (menos para quem recebe direto) e anota o placar
    const r = this.salaDe(c); if (!r || r.state !== 'playing') return;
    if (r.servidor){                                     // v83: sala hospedada não aceita quadro de aparelho nenhum (registro p/ investigação)
      this.log('suspeito na sala ' + r.code + ': ' + c.id + ' mandou snapshot com a partida no servidor');
      return;
    }
    if (r.host !== c.id || m.round !== r.round) return;
    if (!this.balde(c, 'quadro', 75, 120)) return;
    const d = m.data; if (!d || typeof d !== 'object' || !Array.isArray(d.score)) return;
    const s = [inteiro(d.score[0], 0, 999, 0), inteiro(d.score[1], 0, 999, 0)], u = r.ultimo;
    if (u && (s[0] !== u.score[0] || s[1] !== u.score[1]) && d.goal && typeof d.goal.author === 'string' && r.roster.includes(d.goal.author)) r.gols[d.goal.author] = (r.gols[d.goal.author] | 0) + 1;
    if (r.regra === 'v80' && (u ? s[0] !== u.score[0] || s[1] !== u.score[1] : s[0] || s[1])){   // v80: o gol na linha do tempo (a hora do anfitrião e a do servidor)
      const el = d.goal && typeof d.goal.el === 'number' && isFinite(d.goal.el) ? d.goal.el : Number(d.elapsed) || 0;
      (r.linha || (r.linha = [])).push({s:s.slice(), el:Math.max(0, el), ms:this.decorrido(r)});
    }
    r.ultimo = {score:s, elapsed:Math.max(0, Number(d.elapsed) || 0), tick:Math.max(0, d.tick | 0), state:String(d.state || '').slice(0, 8)};
    const txt = JSON.stringify({type:'snapshot', round:r.round, data:d});
    for (const x of r.members){
      if (x.bot || x.id === c.id) continue;
      const cl = this.porId.get(x.id); if (cl && cl.sala === r.code && !cl.p2p) this.mandaTxt(cl, txt);
    }
  }
  input(c, m){                                           // o comando de quem joga: na sala hospedada vai para o motor; senão, para o anfitrião
    const r = this.salaDe(c); if (!r || r.state !== 'playing' || r.roster.indexOf(c.id) < 0) return;
    if (!this.balde(c, 'comando', 130, 200)) return;
    if (r.servidor){                                     // v83: todos mandam para o servidor — inclusive quem criou a sala
      if (!r.partida) return;
      r.partida.entrada(c.id, {seq:inteiro(m.seq, 0, 2e9, 0), x:+m.x || 0, y:+m.y || 0, button:[1, 2, 3].includes(m.button) ? m.button : 1, k:inteiro(m.k, 0, 7, 0)});
      return;
    }
    if (r.host === c.id) return;
    const h = this.porId.get(r.host); if (!h || h.sala !== r.code) return;
    const num = v => Math.max(-1, Math.min(1, Number(v) || 0));
    this.manda(h, {type:'input', id:c.id, seq:inteiro(m.seq, 0, 2e9, 0), x:num(m.x), y:num(m.y), button:[1, 2, 3].includes(m.button) ? m.button : 1, k:inteiro(m.k, 0, 7, 0)});
  }
  pause(c, m){
    const r = this.salaDe(c); if (!r || r.host !== c.id || r.state !== 'playing') return;
    if (r.ranked) return;                                // v83: a ranqueada não tem árbitro nem pausa (ninguém segura a partida dos outros)
    const on = !!m.paused;
    if (on && !r.pausa) r.pausa = this.agora();
    else if (!on && r.pausa){ r.pausadoMs += this.agora() - r.pausa; r.pausa = null; }
    if (r.partida) r.partida.pausado = on;             // v83: o relógio e a física do servidor param juntos
    this.todos(r, {type:'pause', paused:on}, c);
    if (r.regra === 'v80') this.todos(r, Object.assign({type:'relogio', round:r.round}, this.relogioDe(r)));   // v80: o relógio para (e volta) na hora
  }
  confere(r, score, peloServidor){                       // o resultado é possível? '' = vale · senão, o motivo (peloServidor: o fim que o servidor deu, v80)
    const md = r.jogo, meta = META[md] || 3, maxp = MAX_PTS[md] || 1;
    const dur = (this.agora() - r.inicio - r.pausadoMs)/1000, [a, b] = score, w = Math.max(a, b), l = Math.min(a, b), u = r.ultimo;
    if (r.encerrada === r.round) return 'encerrada pelo árbitro';
    if (!u) return 'o servidor não recebeu os quadros da partida';
    if (!peloServidor && (u.score[0] !== a || u.score[1] !== b)) return 'placar diferente do que a partida mostrou';
    if (dur < 10) return 'partida curta demais';
    if (u.elapsed > dur + 5) return 'tempo de jogo maior que o tempo de verdade';
    if (r.regra === 'v80'){                              // v80: a linha do tempo dos gols no relógio do servidor decide como acaba
      if (w > this.r80.meta + maxp - 1 || l >= this.r80.meta) return 'placar impossível para o modo';
      const f = this.fim80(r);
      if (f.erro) return f.erro;
      if (f.s[0] !== a || f.s[1] !== b) return 'placar diferente do que o relógio do servidor permite';
      if (dur + TOL80.fim < f.at) return 'acabou antes do tempo';
    } else if (r.tempo){
      if (a === b) return 'terminou empatada';
      if (u.elapsed + 3 < r.tempo*60) return 'acabou antes do tempo';
    } else if (w < meta || w > meta + maxp - 1 || l >= meta) return 'placar impossível para o modo';
    if (w > (Math.floor(dur/4) + 2)*maxp) return 'placar rápido demais para o tempo';
    return '';
  }
  finish(c, m){
    const r = this.salaDe(c); if (!r || r.state !== 'playing') return;
    if (r.servidor){                                     // v83: quem encerra a partida hospedada é o motor, nunca um aparelho
      this.log('suspeito na sala ' + r.code + ': ' + c.id + ' mandou finish com a partida no servidor');
      return;
    }
    if (r.host !== c.id || m.round !== r.round || !Array.isArray(m.score)) return;
    const score = [inteiro(m.score[0], 0, 999, -1), inteiro(m.score[1], 0, 999, -1)]; if (score[0] < 0 || score[1] < 0) return;
    this.encerra(r, score, false);
  }
  encerra(r, score, peloServidor){                       // o fim da rodada: confere, guarda o que vale e manda o resultado (v80: também o fim que o servidor deu)
    if (r.pausa){ r.pausadoMs += this.agora() - r.pausa; r.pausa = null; }
    const motivo = this.confere(r, score, peloServidor), valida = !motivo, winner = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : -1;
    const dur = Math.round((this.agora() - r.inicio - r.pausadoMs)/1000);
    r.state = 'ended';
    if (valida) this.registra(r, winner);
    if (r.tournament) this.copaResultado(r, score, winner);
    this.log('sala ' + r.code + ' rodada ' + r.round + ': ' + score.join('×') + (peloServidor ? ' (o servidor encerrou no tempo)' : '') + (valida ? ' (valeu)' : ' (não valeu: ' + motivo + ')'));
    for (const x of r.members){
      if (x.bot) continue;
      const cl = this.porId.get(x.id); if (!cl || cl.sala !== r.code) continue;
      const msg = {type:'result', round:r.round, score, winner, valida};
      if (motivo) msg.motivo = motivo;
      if (peloServidor) msg.servidor = true;              // v80: o anfitrião não mandou o fim; o servidor encerrou pelo relógio dele
      if (r.ranked) msg.ranked = true;                    // v79: os pontos da ranqueada (cada jogo aplica os seus, com o resultado conferido)
      const i = r.roster.indexOf(x.id);
      if (valida && this.segredo && cl.conta && i >= 0){   // o selo: a plataforma confere antes de dar XP da partida online
        const t = Math.floor(i/r.n), agora = Date.now();
        msg.selo = assina(this.segredo, {s:r.code, r:r.round, j:cl.conta.idPublico, l:t, p:[score[t], score[1 - t]], m:r.jogo, d:dur, k:r.ranked ? 1 : 0, n:r.n, t:agora, e:agora + 40*60e3});   // v82: k = ranqueada, n = o tamanho do time (a conta só conta a patente com o selo da ranqueada)
      }
      this.manda(cl, msg);
    }
    this.salaMuda(r);
  }
  registra(r, winner){                                   // o que vale fica guardado: partidas, vitórias (troféus), gols e os duelos 1v1
    const quem = [];
    r.roster.forEach((id, i) => { if (id && this.b.d.gente[id]) quem.push({id, t:Math.floor(i/r.n)}); });
    for (const x of quem){
      const g = this.b.d.gente[x.id]; g.st = g.st || {jogos:0, vit:0, der:0, emp:0, gols:0};
      g.st.jogos++; if (winner < 0) g.st.emp++; else if (winner === x.t) g.st.vit++; else g.st.der++;
      g.st.gols += r.gols[x.id] | 0;
    }
    if (r.n === 1 && quem.length === 2){
      const ids = quem.map(x => x.id).sort(), k = ids.join('|');
      const du = this.b.d.duelos[k] || (this.b.d.duelos[k] = {a:ids[0], b:ids[1], va:0, vb:0, jogos:0, ultimo:0});
      du.jogos++; du.ultimo = Date.now();
      if (winner >= 0){ const v = quem.find(x => x.t === winner).id; if (v === du.a) du.va++; else du.vb++; }
    }
    this.b.marca();
  }
  kick(c, m){
    const r = this.salaDe(c); if (!r || r.host !== c.id || !m.id || m.id === c.id || r.ranked) return;
    const alvo = r.members.find(x => x.id === m.id); if (!alvo) return;
    r.removidos.set(alvo.id, Date.now() + 30000);
    const cl = this.porId.get(alvo.id);
    if (cl && cl.sala === r.code){ this.sai(cl, 'kick'); this.manda(cl, {type:'left'}); this.erro(cl, 'Você foi removido da sala.'); }
    else { if (alvo.slot >= 0) r.roster[alvo.slot] = null; r.members = r.members.filter(x => x !== alvo); this.salaMuda(r); }
  }
  promote(c, m){
    const r = this.salaDe(c); if (!r || r.host !== c.id || !m.id || m.id === c.id || r.ranked) return;
    if (r.state === 'playing' && !r.servidor) return this.erro(c, 'Com a partida rolando, quem roda o jogo continua o mesmo. Passe o dono depois.');
    // v83: na sala hospedada o admin pode ser passado a qualquer momento (a simulação é do servidor, não dele)
    const alvo = r.members.find(x => x.id === m.id && !x.bot); if (!alvo) return;
    r.host = alvo.id;
    this.diz(r, {type:'say', sys:true, text:alvo.name + (r.servidor ? ' agora é o admin da sala' : ' agora é o dono da sala'), t:Date.now()});
    this.salaMuda(r);
  }
  say(c, m){
    const r = this.salaDe(c); if (!r) return;
    const t = String(m.text == null ? '' : m.text).slice(0, 120); if (!t.trim()) return;
    const arb = ARB_RE.test(t);
    if (arb){
      if (!this.balde(c, 'arb', 3, 12)) return;
      const o = /^⁣?ARB:e\|(\d+)/.exec(t);
      if (o && c.id === r.host && Number(o[1]) === r.round) r.encerrada = r.round;   // encerrada pelo árbitro: o resultado não vale
    } else {
      if (!this.balde(c, 'fala', 1, 4)) return this.erro(c, 'Calma: uma mensagem por segundo.');
      const agora = Date.now();
      if ((r.silencio && r.silencio.get(c.id) || 0) > agora) return this.erro(c, 'Você está silenciado nesta sala por denúncias. Daqui a pouco você volta.', 'silenciado');   // v81
      if (c.ultTextoSala === t.toLowerCase() && agora - (c.ultSala || 0) < 30000) return this.erro(c, 'Essa mensagem é igual à anterior.', 'repetida');   // v81: spam
      if (filtrado(t)) return this.erro(c, 'O filtro do chat bloqueou essa mensagem.', 'filtro');
      c.ultTextoSala = t.toLowerCase(); c.ultSala = agora;
    }
    const eu = r.members.find(x => x.id === c.id);
    const msg = {type:'say', id:c.id, name:eu ? eu.name : c.nome, text:arb ? t : limpa(t, 120), t:Date.now()};
    if (!arb) msg.mid = r.code + '-' + (r.chatSeq = (r.chatSeq | 0) + 1);   // v81: o número da mensagem (para denunciar)
    this.diz(r, msg);
  }
  report(c, m){                                          // v81: a denúncia de uma mensagem da sala: 2 pessoas diferentes escondem a mensagem e calam o autor por 5 min
    const r = this.salaDe(c); if (!r || typeof m.mid !== 'string' || !this.balde(c, 'denuncia', .5, 6)) return;
    const msg = r.hist.find(x => x && x.mid === m.mid); if (!msg || msg.id === c.id || msg.escondida) return;
    const den = r.denuncias || (r.denuncias = new Map()), s = den.get(m.mid) || new Set();
    s.add(c.conta ? 'c' + c.conta.idPublico : c.id); den.set(m.mid, s);    // (por conta ou por navegador — não por IP: no celular, milhares dividem o mesmo IP da operadora)
    this.log('sala ' + r.code + ': denúncia da mensagem ' + m.mid + ' (' + s.size + ')');
    if (s.size < 2) return;
    msg.escondida = true; (r.silencio || (r.silencio = new Map())).set(msg.id, Date.now() + 5*60e3);
    this.todos(r, {type:'say_hide', mid:m.mid});
  }
  typing(c, m){ const r = this.salaDe(c); if (!r || !this.balde(c, 'dig', 2, 5)) return; this.todos(r, {type:'typing', id:c.id, on:!!m.on}, c); }
  profile(c, m){                                         // trocou o nome, a tampinha ou o clube: o cartão da sala acompanha
    if (!this.balde(c, 'perfil', .5, 4)) return;
    const g = this.b.d.gente[c.id]; if (!g) return;
    if (!c.conta && typeof m.name === 'string') g.nome = c.nome = limpaNome(m.name);
    if (skinOk(m.skin)) g.skin = c.skin = m.skin;
    if (flagOk(m.flag)) g.flag = c.flag = m.flag;
    if (m.avatar !== undefined) c.avatar = avatarOk(m.avatar);
    if (m.clube !== undefined) c.clubeAnunciado = clubeAnunciado(m.clube);
    this.b.marca();
    const r = this.salaDe(c), eu = r && r.members.find(x => x.id === c.id);
    if (eu){ Object.assign(eu, {name:c.nome, selo:c.selo || '', skin:c.skin, flag:c.flag, avatar:c.avatar, club:this.cartaoClube(c)}); this.salaMuda(r); }
  }
  social(c){
    const p = this.clubes.placar(), d = this.b.d, g = d.gente[c.id] || {st:{}}, meu = this.clubes.clubeDe(c.id), ct = this.clubes.cartao(c.id);
    const nome = id => (d.gente[id] || {}).nome || 'Jogador';
    const club = meu ? {id:meu.id, name:meu.nome, tag:ct.tag, color:ct.color, badge:'escudo', escudo:meu.escudo, points:p.por.get(meu.id) || 0, wins:p.por.get(meu.id) || 0,
      played:meu.membros.reduce((s, m) => s + ((d.gente[m.id] || {}).st || {}).jogos | 0, 0), members:meu.membros.map(m => ({id:m.id, name:nome(m.id)})), owner:meu.dono, invite:''} : null;
    const ranking = Object.values(d.clubes).map(k => ({name:k.nome, tag:(this.clubes.cartao(k.dono) || {}).tag || '', points:p.por.get(k.id) || 0, wins:p.por.get(k.id) || 0}))
      .sort((a, b) => b.points - a.points).slice(0, 20);
    const duels = Object.values(d.duelos).filter(x => x.a === c.id || x.b === c.id).sort((x, y) => y.ultimo - x.ultimo).slice(0, 8)
      .map(x => ({players:[{id:x.a, name:nome(x.a)}, {id:x.b, name:nome(x.b)}], wins:[x.va, x.vb], played:x.jogos}));
    this.manda(c, {type:'social', club, ranking, champions:d.campeoes.slice(-20).reverse(), duels, eu:{pub:String(g.pub || '').padStart(6, '0'), trofeus:g.st.vit | 0, jogos:g.st.jogos | 0}});
  }
  rtc(c, m){                                             // o aperto de mão da conexão direta: só repassa (dentro da mesma sala)
    const r = this.salaDe(c); if (!r || typeof m.to !== 'string' || !m.d || typeof m.d !== 'object' || !this.balde(c, 'rtc', 20, 80)) return;
    const txt = JSON.stringify(m.d); if (txt.length > 16000) return;
    const alvo = this.porId.get(m.to); if (!alvo || alvo.sala !== r.code) return;
    this.mandaTxt(alvo, '{"type":"rtc","from":' + JSON.stringify(c.id) + ',"d":' + txt + '}');
  }
  p2p(c, m){ c.p2p = !!m.on; }
  clubAntigo(c){ this.erro(c, 'Os clubes agora ficam em CLUBE (a mesma tela para todos): crie ou entre por lá.'); }
  club_req(c, m){                                        // os clubes (a mesma tela do jogo da conta do RACHA)
    const rid = typeof m.rid === 'number' || typeof m.rid === 'string' ? m.rid : 0;
    if (!this.balde(c, 'clube', 4, 16)) return this.manda(c, {type:'club_res', rid, ok:false, erro:'Calma: muitos pedidos seguidos.'});
    try {
      const data = this.clubes.op(this.gente(c.id), String(m.op || ''), m.args && typeof m.args === 'object' ? m.args : {});
      this.manda(c, {type:'club_res', rid, ok:true, data});
    } catch (e) {
      if (!(e instanceof Erro)) this.log('erro no clube: ' + (e && e.stack || e));
      this.manda(c, {type:'club_res', rid, ok:false, erro:e instanceof Erro ? e.message : 'Não deu certo. Tente de novo.'});
    }
  }

  /* ------------------------------------------------------------------ v79: a fila da ranqueada */
  fila(c, m){
    if (!this.balde(c, 'fila', .5, 4)) return this.erro(c, 'Calma: espere um pouco para procurar de novo.');
    if (this.salaDe(c)) return this.erro(c, 'Saia da sala em que você está para jogar a ranqueada.', 'fila_sala');
    const n = inteiro(m.n, 1, 4, 2), pts = inteiro(m.pts, 0, 99999, 0);
    this.filaEsp.set(c.id, {c, n, pts, t0:this.agora()});
    this.manda(c, {type:'fila', on:true, n, espera:FILA_MAX_MS, mista:FILA_MISTA_MS, online:this.porId.size});
    this.filaTenta();
  }
  filaSai(c){ if (this.filaEsp.delete(c.id)) this.manda(c, {type:'fila', on:false}); }
  filaTenta(){                                           // junta quem está esperando: o tamanho cheio na hora; depois de 8 s, 2 ou mais com bots; 20 s sem ninguém, fila_nada
    clearTimeout(this.filaT); this.filaT = null;
    const agora = this.agora();
    for (const [id, e] of this.filaEsp) if (!e.c.ws || e.c.ws.readyState !== 1 || e.c.sala || this.porId.get(id) !== e.c) this.filaEsp.delete(id);
    for (let n = 1; n <= 4; n++){
      let L = [...this.filaEsp.values()].filter(e => e.n === n).sort((a, b) => a.t0 - b.t0);
      while (L.length >= 2*n){ const g = this.filaGrupo(L, 2*n); this.filaSala(g, n); L = L.filter(e => g.indexOf(e) < 0); }
      if (n >= 2 && L.length >= 2 && agora - L[0].t0 >= FILA_MISTA_MS){ const g = this.filaGrupo(L, Math.min(L.length, 2*n)); this.filaSala(g, n); L = L.filter(e => g.indexOf(e) < 0); }
      for (const e of L) if (agora - e.t0 >= FILA_MAX_MS){ this.filaEsp.delete(e.c.id); this.manda(e.c, {type:'fila_nada', n}); }
    }
    if (this.filaEsp.size){ this.filaT = setTimeout(() => this.filaTenta(), 1000); if (this.filaT.unref) this.filaT.unref(); }
  }
  filaGrupo(L, k){                                       // quem espera há mais tempo e os de pontos mais perto dele
    const a = L[0], resto = L.slice(1).sort((x, y) => Math.abs(x.pts - a.pts) - Math.abs(y.pts - a.pts) || x.t0 - y.t0);
    return [a].concat(resto.slice(0, k - 1));
  }
  filaSala(g, n){                                        // a sala ranqueada: os times pelos pontos (um pra cá, dois pra lá…), os bots nas vagas, e começa
    for (const e of g) this.filaEsp.delete(e.c.id);
    const r = {code:this.codigo(), name:'Ranqueada', host:g[0].c.id, n, map:MAPA_RANQUEADA, jogo:'futebol', tempo:Math.max(1, Math.round(this.r80.seg/60)), regra:'v80', bots:true, pub:false, ranked:true, servidor:true,
      state:'waiting', round:0, roster:new Array(2*n).fill(null), members:[], tournament:null, hist:[], reservas:new Map(), removidos:new Map(),
      inicio:0, pausa:null, pausadoMs:0, ultimo:null, gols:{}, linha:[], encerrada:-1, interrompida:-1, vaziaAte:0, criada:Date.now()};   // v80: 3:00 no relógio do servidor
    this.salas.set(r.code, r);
    const ord = g.slice().sort((a, b) => b.pts - a.pts), poe = [0, 0];
    ord.forEach((e, i) => {
      let t = [0, 1, 1, 0][i % 4]; if (poe[t] >= n) t = 1 - t;
      const m = this.membro(e.c); r.members.push(m); this.senta(r, m, t*n + poe[t]++);
      e.c.sala = r.code;
    });
    Object.assign(r, {state:'playing', inicio:this.agora(), round:1});
    this.ligaPartida(r);                               // v83: a ranqueada também é 100% hospedada (nenhuma partida usa a física do aparelho)
    for (const e of g) this.manda(e.c, {type:'sayHistory', list:[]});
    this.todos(r, {type:'room', room:this.publica(r)});
    this.todos(r, {type:'start', room:this.publica(r)});
    this.log('ranqueada ' + r.code + ' (' + n + 'v' + n + '): ' + g.length + ' de ' + 2*n + (g.length < 2*n ? ', bots completam' : ''));
    return r;
  }

  /* ------------------------------------------------------------------ a copa dos amigos (1v1, 4 ou 8 pessoas) */
  cupCreate(c, m){
    const r = this.salaDe(c); if (!r) return;
    if (r.host !== c.id) return this.erro(c, 'Quem criou a sala sorteia a copa.');
    if (r.state === 'playing') return this.erro(c, 'Espere a partida acabar para sortear a copa.');
    if (r.tournament) return this.erro(c, 'Já tem uma copa nesta sala.');
    const gente = r.members.filter(x => !x.bot);
    if (gente.length !== 4 && gente.length !== 8) return this.erro(c, 'A copa precisa de 4 ou 8 pessoas na sala (agora tem ' + gente.length + ').');
    const ids = embaralha(gente.map(x => x.id)), matches = [];
    for (let i = 0; i < ids.length; i += 2) matches.push({a:ids[i], b:ids[i + 1]});
    r.tournament = {name:limpa(m.name, 28) || 'Copa dos amigos', rounds:[], matches, champion:null, n:r.n, bots:r.bots};
    r.n = 1; r.bots = false; r.state = 'waiting';
    this.copaSenta(r);
    this.diz(r, {type:'say', sys:true, text:'Copa sorteada: ' + matches.map(j => this.nomeNaSala(r, j.a) + ' × ' + this.nomeNaSala(r, j.b)).join(' · '), t:Date.now()});
    this.salaMuda(r);
  }
  nomeNaSala(r, id){ const x = r.members.find(y => y.id === id); return x ? x.name : (this.b.d.gente[id] || {}).nome || 'Jogador'; }
  copaSenta(r){                                          // o próximo duelo sem vencedor da rodada: os dois nos times, o resto assiste
    r.roster = [null, null]; for (const x of r.members) x.slot = -1;
    const j = r.tournament.matches.find(x => !x.winner); if (!j) return null;
    const a = r.members.find(x => x.id === j.a), b = r.members.find(x => x.id === j.b);
    if (a) this.senta(r, a, 0); if (b) this.senta(r, b, 1);
    return j;
  }
  copaResultado(r, score, winner){
    const j = r.tournament.matches.find(x => !x.winner);
    if (!j || winner < 0 || r.roster[0] !== j.a || r.roster[1] !== j.b) return;   // (empate ou lugares trocados: o duelo se joga de novo)
    j.score = score.slice(); j.winner = winner === 0 ? j.a : j.b;
  }
  cupNext(c){
    const r = this.salaDe(c); if (!r || r.host !== c.id || !r.tournament || r.state === 'playing') return;
    const t = r.tournament; if (t.champion) return;
    const esta = id => r.members.some(x => x.id === id);
    for (let volta = 0; volta < 8; volta++){
      let j = t.matches.find(x => !x.winner);
      while (j && (!esta(j.a) || !esta(j.b))){            // quem foi embora da sala perde por W.O.
        j.winner = esta(j.a) ? j.a : esta(j.b) ? j.b : j.a; j.wo = true;
        this.diz(r, {type:'say', sys:true, text:this.nomeNaSala(r, j.winner) + ' passou por W.O.', t:Date.now()});
        j = t.matches.find(x => !x.winner);
      }
      if (j){ this.copaSenta(r); r.state = 'waiting'; return this.salaMuda(r); }
      const venc = t.matches.map(x => x.winner);
      t.rounds.push(t.matches);
      if (venc.length === 1){                            // CAMPEÃO
        t.champion = venc[0]; t.matches = [];
        r.roster = [null, null]; for (const x of r.members) x.slot = -1;
        r.state = 'ended';
        this.b.d.campeoes.push({name:t.name, champion:{name:this.nomeNaSala(r, t.champion)}, date:Date.now()});
        if (this.b.d.campeoes.length > 100) this.b.d.campeoes.shift();
        this.b.marca();
        this.diz(r, {type:'say', sys:true, text:'CAMPEÃO DA ' + t.name.toUpperCase() + ': ' + this.nomeNaSala(r, t.champion) + '!', t:Date.now()});
        return this.salaMuda(r);
      }
      t.matches = [];
      for (let i = 0; i < venc.length; i += 2) t.matches.push({a:venc[i], b:venc[i + 1]});
    }
  }
  cupEnd(c){
    const r = this.salaDe(c); if (!r || r.host !== c.id || !r.tournament || r.state === 'playing') return;
    const t = r.tournament; r.tournament = null;
    r.n = t.n || 1; r.bots = !!t.bots; r.roster = new Array(2*r.n).fill(null); for (const x of r.members) x.slot = -1;
    r.state = 'waiting';
    this.salaMuda(r);
  }

  /* ------------------------------------------------------------------ o Chat do Brasil (o mesmo endereço, outra conexão) */
  brasilRecebe(c, m){
    if (m.type === 'brasil_join'){
      const conta = c.contaSessao || this.bilhete(m.conta);
      let id = conta ? 'c' + Number(conta.idPublico) : null;
      if (!id && typeof m.token === 'string' && m.token.length <= 80) id = this.b.d.tokens[sha(m.token)] || null;
      c.brasil = true; c.brasilId = id || c.brasilId || novoId('b', 9); c.brasilConta = id;
      c.nome = conta ? conta.nome : limpaNome(m.name); c.skin = skinOk(m.skin); c.avatar = avatarOk(m.avatar); c.selo = conta ? conta.selo || '' : '';
      this.manda(c, {type:'brasil_hello', id:c.brasilId});
      this.manda(c, {type:'brasil_history', messages:this.chat.msgs.slice(-50)});
      return this.brasilOnline();
    }
    if (!c.brasil) return;
    if (m.type === 'brasil_say'){
      const t = String(m.text == null ? '' : m.text).replace(/\s+/g, ' ').trim(); if (!t) return;
      const agora = Date.now(), erro = reason => this.manda(c, {type:'brasil_error', reason});
      if (Array.from(t).length > 120) return erro('longa');
      if ((this.chat.silencio.get(c.brasilId) || 0) > agora) return erro('silenciado');
      if (agora - c.ultBrasil < 2800) return erro('ritmo');
      if (t.toLowerCase() === c.ultTextoBrasil) return erro('repetida');
      if (filtrado(t)) return erro('filtro');
      c.ultBrasil = agora; c.ultTextoBrasil = t.toLowerCase();
      const ct = c.brasilConta ? this.clubes.cartao(c.brasilConta) : null;
      const msg = {id:'m' + (++this.chat.seq), from:c.brasilId, nome:c.nome, selo:c.selo || '', clube:ct ? ct.name : '', skin:c.skin, avatar:c.avatar, texto:limpa(t, 120), t:agora};
      this.chat.msgs.push(msg); if (this.chat.msgs.length > 50) this.chat.msgs.shift();
      const txt = JSON.stringify({type:'brasil_message', message:msg});
      for (const x of this.clientes) if (x.brasil) this.mandaTxt(x, txt);
      return;
    }
    if (m.type === 'brasil_report'){                     // 3 denúncias de pessoas diferentes: some e o autor fica 10 min sem falar
      const msg = this.chat.msgs.find(x => x.id === m.id);
      if (!msg || msg.from === c.brasilId || msg.escondida) return;
      const s = this.chat.denuncias.get(msg.id) || new Set(); s.add(c.brasilConta || c.brasilId); this.chat.denuncias.set(msg.id, s);   // v81: por conta ou por navegador (não por IP: na operadora, milhares dividem o mesmo)
      if (s.size < 3) return;
      msg.escondida = true; this.chat.silencio.set(msg.from, Date.now() + 10*60e3);
      const txt = JSON.stringify({type:'brasil_hide', id:msg.id});
      for (const x of this.clientes) if (x.brasil) this.mandaTxt(x, txt);
    }
  }
  brasilOnline(){                                        // quantos estão no chat (no máximo uma vez por segundo)
    if (this.chat.onT) return;
    this.chat.onT = setTimeout(() => {
      this.chat.onT = 0;
      const lista = [...this.clientes].filter(x => x.brasil), txt = JSON.stringify({type:'brasil_online', count:lista.length});
      for (const x of lista) this.mandaTxt(x, txt);
    }, 300);
  }
}
Turma.ACOES = {list:'list', create:'create', join:'join', leave:'leave', seat:'seat', config:'config', ready:'ready', rematch:'rematch', start:'start',
  pause:'pause', finish:'finish', kick:'kick', promote:'promote', say:'say', typing:'typing', profile:'profile', social:'social', rtc:'rtc', p2p:'p2p', report:'report',
  club_req:'club_req', clubCreate:'clubAntigo', clubJoin:'clubAntigo', clubLeave:'clubAntigo', cupCreate:'cupCreate', cupNext:'cupNext', cupEnd:'cupEnd',
  fila:'fila', fila_sai:'filaSai'};

/* a página que abriu o jogo pode falar com o servidor? Mesmo endereço do servidor e o próprio computador (localhost) sempre;
   outras só se estiverem na lista (RACHA_ORIGENS / --origens). Sem cabeçalho Origin (programa, não navegador): pode. */
function origemPermitida(origem, host, lista){
  if (!origem) return true;
  if (Array.isArray(lista) && (lista.includes(origem) || lista.includes('*'))) return true;
  let u; try { u = new URL(origem); } catch (_) { return false; }   // ('null': arquivo aberto direto ou iframe isolado; só pela lista)
  if (host && u.host === String(host).toLowerCase()) return true;
  return ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
}

module.exports = {Turma, origemPermitida, MODOS, MODOS_SALA, MAPAS_SALA, N_MAPAS, META, MAX_PTS, MAPA_RANQUEADA, FILA_MAX_MS, FILA_MISTA_MS, SELOS, seloDe, REGRA80, TOL80};
