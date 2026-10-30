'use strict';
/* =====================================================================================================================
   RACHA v98 · AS SALAS ONLINE DO RACHÃO, no servidor das salas (server/partida/rachao.js).

   O pedido (29/10/2026): "Deixe separado o racha e o rachão, os caras podem escolher criar modo racha ou rachão, porém dá
   pra criar sala de rachão também on-line". A sala do Rachão é uma sala do servidor como as da Oficina: ninguém é
   anfitrião, todos mandam os comandos e recebem os quadros, quem cai vira bot na hora e volta para o mesmo lugar. A
   partida é a do Rachão de verdade: o motor (server/partida/rachao_motor.js) é gerado da página do Rachão, sem mudar uma
   letra — a física, os 17 campos, os bots, o modo Caos com os poderes e os estádios criados na Oficina de estádios.
     · estadioDaSala: o campo da sala — um dos 17 ({campo: id}) ou um estádio de quem cria ({estadio: documento}), que
       passa pela MESMA limpeza da Oficina de estádios (os limites de cada número, as peças, o tamanho);
     · opcoesDaSala: o modo (Partida ou Caos), o tempo, os gols, a corrida, o nível dos bots e os chutes extras;
     · PartidaRachao: a partida da sala (os lugares, a fila de comandos de cada um com o palpite de até 4 passos e os
       contadores dos toques, os bots, o quadro de 30 por segundo com os eventos, a prorrogação com limite e o fim).
   A física do RACHA (as salas comuns, a ranqueada e as salas com mapa) não passa por aqui.
   ===================================================================================================================== */
const crypto = require('crypto');
const { criaMotorRachao } = require('./rachao_motor');
const { MOTOR } = require('./sala');

const SILENCIO_MS = 350, MAX_CMD_S = 120, FILA_MAX = 120, SNAP_A_CADA = 2;
const FIM_TICKS = 78;                     // (1,3 s depois do apito final sai o resultado — o tempo da tela do fim do Rachão)
const PRORROG_MAX_S = 180;                // a prorrogação (gol de ouro) vai até 3 min: depois, empate
const DURACAO_MAX_S = 45 * 60;            // nenhuma partida passa de 45 min de bola rolando
const PASSOS_MAX = 60 * 60 * 60;          // nem de 1 hora no relógio do servidor (a saída, os gols e o fim também contam)
const SAIDA_LIVRE = 8 * 60;               // a saída: ninguém tocou na bola em 8 s, ela fica livre (como nas salas de sempre: quem
                                          // tem a saída e está parado — a aba escondida, a moldura fechada — não trava a partida)
const MAX_POR_TIME = 7;                   // (os times do Rachão: de 1x1 a 7x7)
const LIM_DOC = 24000;                    // o estádio, em texto, cabe no código de compartilhar do Rachão (24 mil letras)
const MODOS = ['match', 'chaos'], TEMPOS = [60, 120, 180, 300, 600, 0], GOLS = [1, 3, 5, 7, 10, 0], CORRIDAS = ['folego', 'normal', 'sempre'];
const NIVEIS = ['facil', 'medio', 'dificil', 'craque'];
const TIMES = ['Vermelho', 'Azul'];

let RM = null;
const motor = () => RM || (RM = criaMotorRachao());
// (os nomes: o que vem da sala já é limpo; aqui só corta e tira o que não é letra de ver)
const CTRL = new RegExp('[' + [[0, 31], [127, 159], [0x200b, 0x200f], [0x2028, 0x202e], [0x2066, 0x2069], [0xfeff, 0xfeff]].map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']', 'g');
const limpaNome = s => (typeof s === 'string' ? s.replace(CTRL, ' ').replace(/\s+/g, ' ').trim().slice(0, 16) : '') || 'Jogador';
const sha16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

/* ---------------------------------------------------------------- o campo e as opções da sala */
// o = {campo: id} | {estadio: documento} → {mapa, doc, info} | {erro}. filtro(t) → true se o texto não pode aparecer.
function estadioDaSala(o, filtro) {
  const M = motor();
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { erro: 'Escolha o campo da sala.' };
  if (typeof o.campo === 'string' && o.campo) {
    const base = M.EST.ORIGINAIS.find(m => m.id === o.campo);
    if (!base) return { erro: 'Esse campo não existe no Rachão.' };
    return { mapa: base, doc: null, info: { campo: base.id, nome: base.name, desc: base.desc, sizes: base.sizes.slice(), def: base.def, hash: 'c_' + base.id, piso: base.surface || 'grass', estadio: false } };
  }
  if (o.estadio && typeof o.estadio === 'object' && !Array.isArray(o.estadio)) {
    let tam = 0;
    try { tam = JSON.stringify(o.estadio).length; } catch (_) { return { erro: 'O estádio veio com problema.' }; }
    if (tam > LIM_DOC) return { erro: 'O estádio é grande demais para a sala (tire algumas peças).' };
    let d = null;
    try { d = M.EST.limpa(o.estadio); } catch (_) { d = null; }
    if (!d) return { erro: 'O estádio veio com problema.' };
    // v100 (segurança): sem < e > nos textos do estádio (como os nomes das salas, dos jogadores e dos mapas da Oficina)
    if (typeof d.nome === 'string') d.nome = d.nome.replace(/[<>]/g, '').trim() || 'Estádio';
    if (typeof d.desc === 'string') d.desc = d.desc.replace(/[<>]/g, '').trim();
    if (typeof filtro === 'function') { if (filtro(d.nome)) d.nome = 'Estádio'; if (d.desc && filtro(d.desc)) d.desc = ''; }
    d.id = '';
    const hash = sha16(JSON.stringify(d));
    d.id = 'u_' + hash;                                  // (o mesmo id nos dois lados: o desenho do campo sai igual em todo aparelho)
    const mapa = M.EST.compila(d);
    return { mapa, doc: d, info: { campo: '', nome: d.nome, desc: mapa.desc, sizes: mapa.sizes.slice(), def: mapa.def, hash, piso: d.piso, estadio: true } };
  }
  return { erro: 'Escolha o campo da sala.' };
}
function opcoesDaSala(o) {
  o = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  const modo = MODOS.indexOf(o.modo) >= 0 ? o.modo : 'match';
  let tempo = TEMPOS.indexOf(o.tempo) >= 0 ? o.tempo : 180;
  const gols = GOLS.indexOf(o.gols) >= 0 ? o.gols : (modo === 'chaos' ? 0 : 5);
  if (!tempo && !gols) tempo = 180;                      // (sem tempo e sem gols a partida não acaba: o Rachão também não deixa)
  const ch = o.chutes && typeof o.chutes === 'object' ? o.chutes : {};
  return { modo, tempo, gols, corrida: CORRIDAS.indexOf(o.corrida) >= 0 ? o.corrida : 'folego', nivel: NIVEIS.indexOf(o.nivel) >= 0 ? o.nivel : 'medio',
    chutes: { lob: ch.lob !== false, curve: ch.curve !== false, superKick: ch.superKick !== false } };
}
// o que a sala mostra das opções (a lista de salas e a tela da sala)
function resumo(info, opc, n) {
  const M = { match: 'Partida', chaos: 'Caos' }[opc.modo];
  const t = opc.tempo ? (opc.tempo % 60 ? opc.tempo + ' s' : opc.tempo / 60 + ' min') : '';
  const g = opc.gols ? 'até ' + opc.gols + (opc.gols === 1 ? ' gol' : ' gols') : '';
  return [M, n + 'x' + n, [t, g].filter(Boolean).join(' ou ')].filter(Boolean).join(' · ');
}

/* ---------------------------------------------------------------- a partida da sala */
const CONTADORES = ['kn', 'st', 'lb', 'cl', 'cr', 'pw'];
const novoBot = () => ({ t: 0, plan: null, stuck: 0, powerHold: 0, kickPlan: 0 });
function zeraEntrada(inp) {
  inp.mx = inp.my = 0; inp.kick = inp.sprint = inp.superKick = false;
  inp.lob = inp.curveL = inp.curveR = inp.power = inp.kickNew = false;
}

class PartidaRachao {
  /* o = {mapa (o campo montado), opc (opcoesDaSala), porTime, jogadores: [{netId, nome} | {bot:true} | {vazio:true}] (2 × porTime, na
          ordem dos lugares da sala: 0..n-1 o Vermelho), agora(), log, suspeito(id, tipo, det), onSnapshot(d), onGol(g), onAviso(t),
          onFim(res), quadros (30 ou 60 por segundo), sorteio (os testes: o Math.random com semente)} */
  constructor(o) {
    const M = o.motor || motor();
    this.M = M; this.Q = M.Quadro;
    this.agora = o.agora || (() => Date.now());
    this.log = o.log || (() => {});
    this.suspeito = o.suspeito || (() => {});
    this.onSnapshot = o.onSnapshot || (() => {});
    this.onGol = o.onGol || (() => {});
    this.onAviso = o.onAviso || (() => {});
    this.onFim = o.onFim || (() => {});
    this.snapCada = o.quadros === 60 ? 1 : SNAP_A_CADA;
    this.n = Math.max(1, Math.min(MAX_POR_TIME, o.porTime | 0 || 2));
    const opc = this.opc = o.opc || opcoesDaSala({});
    const js = Array.isArray(o.jogadores) ? o.jogadores.slice(0, 2 * this.n) : [];
    const humano = s => js[s] && typeof js[s].netId === 'string' && !!js[s].netId;
    const lugares = [];
    for (let s = 0; s < js.length; s++) if (js[s] && !js[s].vazio) lugares.push(s);
    // (a montagem é a do quadro.js: a mesma que cada aparelho faz para desenhar e prever)
    const T = this.T = this.Q.cria(M.TopMatch, o.mapa, opc, this.n, lugares, s => humano(s) ? 'h' + s : null);
    this.evs = [];
    // (no servidor não tem partícula: os confetes e as faíscas viram eventos com o lugar, e cada aparelho desenha)
    T.fxBurst = (x, y, cor, n) => this.evs.push(this.Q.faisca(x, y, cor, n));
    T.fxConfetti = (x, y, team) => this.evs.push(this.Q.confete(x, y, team));
    T.updateFx = () => {};
    this.porLugar = new Map();
    for (const p of T.players) {
      const s = p.lugar, h = humano(s);
      p.netId = h ? js[s].netId : null; p.nome = p.label = h ? limpaNome(js[s].nome) : ''; p.reserva = null;
      if (h) this.prepara(p);
      this.porLugar.set(s, p);
    }
    this.lugares = T.players.map(p => p.lugar);           // (o índice do jogador na partida → o lugar da sala)
    T.inputProvider = (ctrl, p) => this.controle(p);
    this.on = true; this.encerrado = false; this.pausado = false; this.ligado = false; this.comecou = false;
    this.fimEm = -1; this.passos = 0; this.saidaT = 0;
    this.conta = new Map();                               // os gols e os passes de cada um: a pessoa pelo id (de qualquer lugar,
                                                          // mesmo trocando de lugar ou caindo) e o bot pelo lugar
  }
  get estado() { return this.T.phase === 'end' ? 'fim' : 'jogo'; }
  get fimPendente() { return this.T.phase === 'end'; }
  get placar() { return this.T.score; }
  get tick() { return this.T.tick; }
  humano(netId) { return netId ? this.T.players.find(p => p.netId === netId) || null : null; }
  temLugar(slot) { return this.porLugar.has(slot); }
  gente() { return this.T.players.filter(p => p.netId).length; }
  // os números de cada um para o painel de jogadores (gols e assistências; o resto o motor do Rachão não conta)
  get est() {
    const o = {}, poe = (k, i, time, nome, bot, c) => { o[k] = { k, i, time, nome, bot, g: c.g, a: c.a, d: 0, r: 0, c: 0, p: 0, cg: 0 }; };
    for (const c of this.conta.values()) if (c.netId) poe(c.netId, c.lugar, c.time, c.nome, false, c);   // (quem caiu ou saiu do lugar continua com os dele)
    for (const p of this.T.players) poe(p.netId || ('b' + p.lugar), p.lugar, p.team, p.netId ? p.nome : 'Bot', !p.netId, this.numeros(p));
    return o;
  }
  chave(p) { return p.netId ? 'h:' + p.netId : 'b:' + p.lugar; }
  numeros(p) { return this.conta.get(this.chave(p)) || { g: 0, a: 0 }; }
  soma(p, k) {
    const id = this.chave(p);
    let c = this.conta.get(id);
    if (!c) { if (this.conta.size >= 64) return; this.conta.set(id, c = { g: 0, a: 0, netId: p.netId || null, nome: '', lugar: p.lugar, time: p.team }); }
    c[k]++; c.lugar = p.lugar; c.time = p.team; if (p.netId) c.nome = p.nome;
  }

  /* ---- os lugares: quem sai vira bot na hora; quem volta reassume ---- */
  prepara(p) {
    p.fila = { fila: [], chegou: this.agora(), min: 99, n: 0, ult: null, feito: 0, visto: 0, cont: {}, contOk: false };
    p.toq = {}; p.ritmo = []; p.ack = 0;
    zeraEntrada(p.input);
  }
  poeHumano(p, netId, nome) {
    p.netId = String(netId); p.nome = p.label = limpaNome(nome); p.human = 'h' + p.lugar; p.bot = null; p.reserva = null;
    this.prepara(p); p.fila.chegou = 0;                 // (até o primeiro comando chegar, parada)
  }
  viraBot(p, guarda) {
    p.reserva = guarda ? p.netId : null; p.netId = null; p.nome = ''; p.label = ''; p.human = null; p.bot = novoBot(); p.fila = null; p.ritmo = []; p.ack = 0;
    zeraEntrada(p.input);
  }
  entra(netId, nome, slot) {
    const id = String(netId);
    const ja = this.humano(id);
    if (ja) { ja.nome = ja.label = limpaNome(nome || ja.nome); this.prepara(ja); ja.fila.chegou = 0; return ja.lugar; }
    let p = this.T.players.find(x => x.reserva === id) || null;
    if (!p && Number.isInteger(slot)) { const q = this.porLugar.get(slot); if (q && !q.netId) p = q; }
    if (!p) return -1;
    for (const q of this.T.players) if (q.reserva === id) q.reserva = null;
    this.poeHumano(p, id, nome);
    return p.lugar;
  }
  sai(netId) { const p = this.humano(netId); if (p) this.viraBot(p, true); }
  // o admin no meio da partida (a turma confere quem pode): pôr alguém num lugar, tirar (o bot segura) e trocar dois lugares
  admPoe(netId, nome, slot) {
    const alvo = this.porLugar.get(slot); if (!alvo) return false;
    const id = String(netId);
    for (const q of this.T.players) { if (q !== alvo && q.netId === id) this.viraBot(q, false); if (q.reserva === id) q.reserva = null; }
    if (alvo.netId && alvo.netId !== id) this.viraBot(alvo, false);
    if (alvo.netId !== id) this.poeHumano(alvo, id, nome);
    return true;
  }
  admTira(netId) { const p = this.humano(String(netId)); if (p) this.viraBot(p, false); return !!p; }
  admTroca(i, j) {
    const a = this.porLugar.get(i), b = this.porLugar.get(j); if (!a || !b || a === b) return false;
    const A = { netId: a.netId, nome: a.nome }, B = { netId: b.netId, nome: b.nome };
    const poe = (p, x) => { if (x.netId) this.poeHumano(p, x.netId, x.nome); else this.viraBot(p, false); };
    poe(a, B); poe(b, A);
    return true;
  }
  encerraJa() { if (this.encerrado) return; this.pausado = false; if (this.T.phase !== 'end') this.T.finish(); }   // (o apito final agora: o placar de agora fica)
  soltaFilas() { for (const p of this.T.players) if (p.fila) { p.fila.fila.length = 0; p.fila.ult = null; } }   // (a contagem acabou: o que chegou antes não vale)
  fimReplay() {}

  /* ---- a fila de comandos (a mesma ideia da sala com mapa: seq, o palpite de até 4 passos, o descarte sem perder o toque) ---- */
  entrada(netId, m) {
    const p = this.humano(netId);
    if (!p || !p.fila || this.encerrado) return;
    const ag = this.agora();
    p.ritmo.push(ag); while (p.ritmo.length && ag - p.ritmo[0] > 1000) p.ritmo.shift();
    if (p.ritmo.length > MAX_CMD_S) { this.suspeito(netId, 'ritmo', p.ritmo.length + ' cmd/s'); return; }
    const c = this.Q.comando(m); if (!c) return;
    const f = p.fila;
    if (c.seq <= f.visto) { if (c.seq > f.visto - 600) return; f.fila.length = 0; f.ult = null; f.feito = 0; f.contOk = false; }   // (a contagem do aparelho recomeçou)
    f.visto = c.seq;
    f.fila.push(c); f.chegou = ag;
    if (f.fila.length > FILA_MAX) f.fila.splice(0, f.fila.length - FILA_MAX);
  }
  descarta(f) {                                         // pula o mais velho sem perder o botão (o próximo segura junto) — os contadores só sobem
    const v = f.fila.shift(), p = f.fila[0]; if (!v) return;
    if (p) p.f |= v.f;
    f.feito = Math.max(f.feito, v.seq);
  }
  toques(p, c) {                                        // o contador que subiu é um toque (uma vez só, mesmo que o comando dele tenha se perdido)
    const f = p.fila, k = f.cont;
    if (!f.contOk) { for (const x of CONTADORES) k[x] = c[x]; f.contOk = true; return; }
    for (const x of CONTADORES) if (c[x] > k[x]) { p.toq[x] = true; k[x] = c[x]; }
  }
  controle(p) {                                         // (uma vez por passo para cada pessoa: o inputProvider do motor do Rachão)
    const f = p.fila, inp = p.input;
    if (!f || this.agora() - f.chegou > SILENCIO_MS) { if (f) { f.fila.length = 0; f.ult = null; } zeraEntrada(inp); return; }
    if (f.fila.length > 8) while (f.fila.length > 3) this.descarta(f);
    while (f.fila.length && f.fila[0].seq <= f.feito) { const c = f.fila.shift(); f.ult = c; this.toques(p, c); }   // (chegou depois do palpite: os toques valem)
    f.min = Math.min(f.min, f.fila.length);
    if (++f.n >= 30) { if (f.min >= 2) for (let i = 1; i < f.min; i++) this.descarta(f); f.min = 99; f.n = 0; }
    const c = f.fila[0];
    let dir = null;
    if (!c) { if (f.ult && f.feito - f.ult.seq < 4) { f.feito++; dir = f.ult; } }   // (nada chegou: o palpite é o último comando, até 4 passos)
    else if (f.feito && c.seq > f.feito + 1) { f.feito++; dir = c; }                  // (uma seq se perdeu: anda com o próximo, sem gastar ele)
    else { f.fila.shift(); f.ult = c; f.feito = c.seq; dir = c; this.toques(p, c); }
    if (dir) { inp.mx = dir.x; inp.my = dir.y; inp.kick = !!(dir.f & 1); inp.sprint = !!(dir.f & 2); inp.superKick = !!(dir.f & 4); }
    else { inp.mx = inp.my = 0; inp.kick = inp.sprint = inp.superKick = false; }
    const t = p.toq;
    if (t.kn) { inp.kickNew = true; inp.kick = true; }
    if (t.st) inp.superKick = true;
    if (t.lb) inp.lob = true;
    if (t.cl) inp.curveL = true;
    if (t.cr) inp.curveR = true;
    if (t.pw) inp.power = true;
    p.toq = {};
    p.ack = f.feito;
  }

  /* ---- o passo, o quadro e o fim ---- */
  passo() {
    if (!this.on || this.pausado || this.encerrado) return;
    const T = this.T;
    if (!this.comecou) { this.comecou = true; this.evs.push(['wh', 0, 0]); }   // (o apito da saída, depois da contagem)
    if (T.phase === 'kickoff') { if (++this.saidaT > SAIDA_LIVRE) { T.startPlay(); this.saidaT = 0; } } else this.saidaT = 0;
    T.update();
    for (const e of T.events) {
      const a = this.Q.evento(T, e); if (a) this.evs.push(a);
      if (e.t === 'goal' && !e.minor) this.gol(e);
    }
    T.events.length = 0;
    if (this.evs.length > 96) this.evs.splice(0, this.evs.length - 96);
    if (T.phase !== 'end') {
      if (T.overtime && T.timeLimit && T.time >= T.timeLimit + PRORROG_MAX_S) { T.finish(); this.onAviso('A prorrogação acabou sem gol: empate.'); }
      else if (T.time >= DURACAO_MAX_S || this.passos >= PASSOS_MAX) T.finish();
    }
    if (T.phase === 'end') {
      if (this.fimEm < 0) this.fimEm = T.tick;
      else if (T.tick - this.fimEm >= FIM_TICKS) { this.passos++; this.onSnapshot(this.quadro()); return this.encerra(); }
    }
    if (++this.passos % this.snapCada === 0 || T.phase === 'end') this.onSnapshot(this.quadro());
  }
  gol(e) {
    const s = e.scorer, a = e.assist;
    if (s && !e.own) this.soma(s, 'g');                   // (a mesma conta do motor — o gol de quem fez, o passe de quem deu —, só que da pessoa)
    if (a) this.soma(a, 'a');
    this.onGol({ time: e.team, author: s && s.netId && !e.own ? s.netId : null, assist: a && a.netId && !e.own ? a.netId : null, contra: !!e.own, pts: 1 });
  }
  quadro() {
    const acks = this.T.players.map(p => p.netId && p.fila ? p.ack | 0 : 0);
    const d = this.Q.quadro(this.T, acks, this.evs);
    this.evs = [];
    return d;
  }
  resultado() {                                         // quem está em cada lugar no fim, com os números DELE (a pessoa: os dela, de qualquer
    const T = this.T, gols = {}, assist = {}, vistos = new Set();   // lugar; o bot: os do bot naquele lugar), e quem marcou e não está mais num lugar
    const jog = T.players.map(p => { const c = this.numeros(p); if (p.netId) vistos.add(p.netId); return { i: p.lugar, time: p.team, nome: p.netId ? p.nome : 'Bot', netId: p.netId || null, gols: c.g, assist: c.a, bot: !p.netId }; });
    for (const c of this.conta.values()) {
      if (c.netId && !vistos.has(c.netId)) jog.push({ i: -1, time: c.time, nome: c.nome || 'Jogador', netId: c.netId, gols: c.g, assist: c.a, bot: false });
      else if (!c.netId && (this.porLugar.get(c.lugar) || {}).netId) jog.push({ i: c.lugar, time: c.time, nome: 'Bot', netId: null, gols: c.g, assist: c.a, bot: true });   // (o bot que segurou o lugar de quem caiu e voltou)
      if (c.netId) { if (c.g) gols[c.netId] = c.g; if (c.a) assist[c.netId] = c.a; }
    }
    return { placar: T.score.slice(), vencedor: T.winner === 0 || T.winner === 1 ? T.winner : -1, jog, gols, assist, tempo: Math.round(T.time) };
  }
  encerra() {
    if (this.encerrado) return;
    this.encerrado = true; this.on = false;
    this.onFim(this.resultado());
  }
  aborta() { this.on = false; this.encerrado = true; }
  ligar() { if (!this.ligado) { this.ligado = true; MOTOR.add(this); } }
  desligar() { if (this.ligado) { this.ligado = false; MOTOR.del(this); } }
  rodar(ticks) { for (let i = 0; i < ticks && !this.encerrado; i++) this.passo(); }
}

module.exports = { PartidaRachao, estadioDaSala, opcoesDaSala, resumo, motor, TIMES, MAX_POR_TIME, LIM_DOC, MODOS, TEMPOS, GOLS, CORRIDAS, NIVEIS, SNAP_A_CADA, FIM_TICKS, PRORROG_MAX_S, SAIDA_LIVRE, PASSOS_MAX };
