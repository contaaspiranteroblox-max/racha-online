'use strict';
/* =====================================================================================================================
   RACHA v92 · OFICINA — A PARTIDA NUM MAPA PERSONALIZADO, no servidor das salas (a sala com mapa da Oficina).

   O mesmo jeito das salas hospedadas (partida/sala.js): ninguém é anfitrião, todos mandam os comandos (input) e recebem
   os quadros; quem cai vira bot na hora e volta para o mesmo lugar; o motor é o relógio de 60 Hz das salas (MOTOR).
   A fila de comandos é a MESMA da PartidaSala (seq, o palpite de até 4 passos, o salto de seq perdida, o descarte dos
   atrasados sem perder o toque, o silêncio de 350 ms) e os botões PASSE/CHUTE/CURVA são os do núcleo (o toque armado e
   os contadores kc/pc). A física, os gols, as zonas, os objetos e a lógica são os do mapa (partida/mapa.js): até 4 times.
   A física OFICIAL das salas comuns e da ranqueada não passa por aqui (este arquivo só roda nas salas com mapa).
   ===================================================================================================================== */
const N = require('./nucleo');
const RachaMapa = require('./mapa');
const { MOTOR } = require('./sala');

const SILENCIO_MS = 350, FILA_MAX = 120, SNAP_A_CADA = 2;
const R108 = require('./ritmo108');                   // v108: o ritmo dos comandos num balde de fichas (a rajada de um apagão passa)
const EVENTOS_REDE = new Set(['chute', 'gol', 'semgol', 'portal', 'mensagem', 'efeito', 'botao', 'eliminado', 'volta', 'aviso', 'fim', 'saida', 'lateral', 'fora', 'reinicio', 'some', 'cronometro']);

class PartidaMapa {
  /* o = {mapa (já limpo), porTime, jogadores:[{netId, nome} | {bot:'dificil'} | {vazio:true}] na ordem das vagas, seed, saida0,
          bots (false: a vaga que o admin esvazia fica vazia, sem bot), agora(), log, suspeito(id, tipo, det), onSnapshot(data),
          onGol(info), onAviso(txt), onFim(res), quadros} */
  constructor(o) {
    this.agora = o.agora || (() => Date.now());
    this.log = o.log || (() => {});
    this.suspeito = o.suspeito || (() => {});
    this.onSnapshot = o.onSnapshot || (() => {});
    this.onGol = o.onGol || (() => {});
    this.onAviso = o.onAviso || (() => {});
    this.onFim = o.onFim || (() => {});
    this.snapCada = o.quadros === 60 ? 1 : SNAP_A_CADA;
    this.bots = o.bots !== false;
    this.estNet = new Map();                          // (os gols e as assistências de cada pessoa nas vagas por onde ela já passou)
    this.evs = [];
    this.P = RachaMapa.novaPartida(o.mapa, {
      jogadores: o.jogadores, porTime: o.porTime, seed: o.seed, saida0: o.saida0,
      onGol: g => this.onGol(g), onAviso: t => this.onAviso(t), onFim: r => this.onFim(this.porPessoa(r)),
      onEvento: e => { if (EVENTOS_REDE.has(e.t)) { this.evs.push(e); if (this.evs.length > 32) this.evs.shift(); } },
    });
    this.P.suspeito = (id, tipo, det) => this.suspeito(id, tipo, det);
    this.C = this.P.C; this.G = this.P.G; this.n = this.P.n; this.E = this.P.E;
    this.chutaCb = (q, forca) => this.P.chuta(q, forca);
    this.entradaCb = q => this.controle(q);
    for (const q of this.P.jog) { q.base = { g: 0, a: 0 }; if (q.netId) this.prepara(q); }
    this.ligado = false;
  }
  get jog() { return this.P.jog; }
  get estado() { return this.P.estado; }
  get placar() { return this.P.placar; }
  get tick() { return this.P.tick; }
  get encerrado() { return this.P.encerrado; }
  get pausado() { return this.P.pausado; }
  set pausado(v) { this.P.pausado = !!v; }
  get fimPendente() { return !!this.P.fimPendente; }
  // v93: os números de cada um para o painel de jogadores (humanos pelo id; bots pelo lugar: 'b' + i), como a PartidaSala.
  // São da PESSOA, não da vaga: quem troca de vaga (o admin no meio da partida) leva os gols e as assistências dele, e a vaga
  // começa do zero para quem chega (o bot que segura o lugar de quem caiu conta os dele). O motor dos mapas conta gols e
  // assistências (defesas, desarmes e chutes ficam em 0).
  get est() {
    const o = {};
    for (const q of this.P.jog) if (!q.vazio) { const k = q.netId || ('b' + q.i), n = this.numeros(q); o[k] = { k, i: q.i, time: q.time, nome: q.nome, bot: !q.netId, g: n.g, a: n.a, d: 0, r: 0, c: 0, p: 0, cg: 0 }; }
    return o;
  }
  fecha(q) {                                          // quem está na vaga sai dela: o que fez ali vai para a conta da pessoa
    const b = q.base || { g: 0, a: 0 }, g = (q.golsFeitos | 0) - b.g, a = (q.assist | 0) - b.a;
    if (q.netId && (g || a)) { const s = this.estNet.get(q.netId) || { g: 0, a: 0 }; s.g += g; s.a += a; this.estNet.set(q.netId, s); }
    q.base = { g: q.golsFeitos | 0, a: q.assist | 0 };
  }
  numeros(q) {
    const b = q.base || { g: 0, a: 0 }, s = q.netId ? this.estNet.get(q.netId) : null;
    return { g: (q.golsFeitos | 0) - b.g + (s ? s.g : 0), a: (q.assist | 0) - b.a + (s ? s.a : 0) };
  }
  porPessoa(res) {                                    // o resultado com os números de quem está em cada vaga no fim (o craque, a tela do fim)
    if (!res || !Array.isArray(res.jog)) return res;
    res.jog = res.jog.map(j => { const q = this.P.jog[j.i]; if (!q) return j; const n = this.numeros(q); return Object.assign({}, j, { gols: n.g, assist: n.a }); });
    const gols = {}, assist = {};
    for (const q of this.P.jog) if (q.netId) { const n = this.numeros(q); if (n.g) gols[q.netId] = n.g; if (n.a) assist[q.netId] = n.a; }
    res.gols = gols; res.assist = assist;
    return res;
  }
  noCampo(q, vazia) {                                 // a vaga estava VAZIA (sem ninguém nem bot): no meio do jogo a tampinha entra já, no ponto de nascimento dela
    if (!vazia || !q.fora || this.P.estado === 'fim' || this.P.encerrado) return;   // (quem foi eliminado — a zona de eliminação — volta só na próxima saída)
    const s = RachaMapa.spawnDe(this.P, q);
    q.fora = false; q.x = s[0]; q.y = s[1]; q.vx = q.vy = 0; q.mx = q.my = 0;
  }
  prepara(q) {                                        // o humano: a fila de comandos e a máquina dos botões do núcleo
    q.fila = { fila: [], chegou: this.agora(), min: 99, n: 0, ult: null, feito: 0, visto: 0 };
    q.netButton = N.novoBotao(); q.ritmo = R108.novo(); q.ack49 = 0;
  }

  /* ---- lugares: quem sai vira bot na hora; quem volta reassume a tampinha ---- */
  entra(netId, nome, slot) {
    // (já está jogando — a conexão nova chegou antes de a velha cair, ou outra aba: continua na mesma tampinha, sem tomar outra vaga)
    const ja = this.P.jog.find(x => x.netId === netId);
    if (ja) { RachaMapa.humanoAssume(this.P, ja, netId, nome || ja.nome); this.prepara(ja); ja.chegou0 = this.agora(); ja.fila.chegou = 0; return ja.i; }
    let q = this.P.jog.find(x => x.reserva === netId);
    if (!q && Number.isInteger(slot) && this.P.jog[slot] && !this.P.jog[slot].netId) q = this.P.jog[slot];
    if (!q) q = this.P.jog.find(x => x.bot && !x.reserva && !x.netId);
    if (!q) return -1;
    const vazia = !!q.vazio;
    this.fecha(q);
    RachaMapa.humanoAssume(this.P, q, netId, nome); q.reserva = null;
    this.noCampo(q, vazia);
    this.prepara(q); q.chegou0 = this.agora(); q.fila.chegou = 0;
    return q.i;
  }
  sai(netId) {
    const q = this.P.jog.find(x => x.netId === netId); if (!q) return;
    this.fecha(q);
    q.reserva = q.netId;
    if (this.bots) RachaMapa.botAssume(this.P, q);
    else { q.netId = null; q.bot = null; q.ai = null; q.vazio = true; q.fora = true; q.nome = ''; q.mx = q.my = 0; q.vx = q.vy = 0; q.netButton = null; }   // v103: sem bots, quem cai deixa a vaga vazia (volta nela se reconectar)
    q.fila = null; q.ritmo = R108.novo();
  }
  gente() { return this.P.jog.filter(q => q.netId).length; }

  /* ---- v93: o admin da sala no meio da partida (a turma confere quem pode e diz para onde), a contagem e o replay ---- */
  liberaHumano(q) {                                   // a pessoa sai da vaga: com bots, um bot assume; sem bots, a vaga fica vazia (fora do campo)
    if (!q.netId) return;
    this.fecha(q);
    if (this.bots) { RachaMapa.botAssume(this.P, q); q.nome = 'Bot'; }
    else { q.netId = null; q.bot = null; q.ai = null; q.vazio = true; q.fora = true; q.nome = ''; q.mx = q.my = 0; q.vx = q.vy = 0; q.netButton = null; }
    q.fila = null; q.ritmo = R108.novo(); q.reserva = null;
  }
  poeHumano(q, netId, nome) {
    const vazia = !!q.vazio;
    this.fecha(q);
    RachaMapa.humanoAssume(this.P, q, netId, nome); q.reserva = null;
    this.noCampo(q, vazia);
    this.prepara(q); q.chegou0 = this.agora(); q.fila.chegou = 0;
  }
  admPoe(netId, nome, i) {                            // netId vai para o lugar i: o lugar antigo dele vira bot; quem estava em i sai
    const alvo = this.P.jog[i]; if (!alvo) return false;
    const id = String(netId);
    for (const q of this.P.jog) { if (q !== alvo && q.netId === id) this.liberaHumano(q); if (q.reserva === id) q.reserva = null; }
    if (alvo.netId && alvo.netId !== id) this.liberaHumano(alvo);
    if (alvo.netId !== id) this.poeHumano(alvo, id, nome);
    return true;
  }
  admTira(netId) { const q = this.P.jog.find(x => x.netId === String(netId)); if (q) this.liberaHumano(q); return !!q; }
  admTroca(i, j) {                                    // dois lugares trocam quem joga neles (cada um começa a fila e os botões do zero)
    const a = this.P.jog[i], b = this.P.jog[j]; if (!a || !b || a === b) return false;
    const A = { netId: a.netId, nome: a.nome }, Bq = { netId: b.netId, nome: b.nome };
    const poe = (q, o) => { if (o.netId) this.poeHumano(q, o.netId, o.nome); else this.liberaHumano(q); };
    poe(a, Bq); poe(b, A);
    return true;
  }
  encerraJa() { if (this.P.encerrado) return; this.P.pausado = false; if (this.P.estado !== 'fim') this.P.fim(); }   // o apito final agora (o placar de agora fica)
  soltaFilas() { for (const q of this.P.jog) if (q.fila) { q.fila.fila.length = 0; q.fila.ult = null; if (q.netButton) { q.netButton.livre = true; q.netButton.arma = 0; } } }   // a contagem acabou (o que chegou antes não vale)
  fimReplay() {}                                      // (o replay do gol do servidor não passa nas salas com mapa: a saída é a do mapa)

  /* ---- a fila de comandos (a mesma da PartidaSala) ---- */
  entrada(netId, m) {
    const q = this.P.jog.find(x => x.netId === netId);
    if (!q || !q.fila || this.P.encerrado) return;
    const ag = this.agora();
    q.ritmo = R108.garante(q.ritmo);                 // v108: o balde de fichas (server/partida/ritmo108.js)
    if (!R108.passa(q.ritmo, ag)) { if (R108.avisa(q.ritmo, ag)) this.suspeito(netId, 'ritmo', R108.texto(q.ritmo)); return; }
    const f = q.fila, seq = m.seq | 0;
    if (seq <= f.visto) { if (seq > f.visto - 600) return; f.fila.length = 0; f.ult = null; f.feito = 0; }
    f.visto = seq;
    const c = { seq, x: Math.max(-1, Math.min(1, +m.x || 0)), y: Math.max(-1, Math.min(1, +m.y || 0)), button: [1, 2, 3].includes(m.button) ? m.button : 1, k: (m.k | 0) & 1 };
    if (Number.isInteger(m.kc) && m.kc >= 0) c.kc = m.kc;
    if (Number.isInteger(m.pc) && m.pc >= 0) c.pc = m.pc;
    f.fila.push(c); f.chegou = ag;
    if (f.fila.length > FILA_MAX) f.fila.splice(0, f.fila.length - FILA_MAX);
  }
  nsDescarta(f) {                                     // pula o mais velho sem perder o botão nem os contadores que estavam nele
    const v = f.fila.shift(), p = f.fila[0]; if (!v) return;
    if (p && v.button > p.button) p.button = v.button;
    if (p && v.kc != null && !(p.kc >= v.kc)) p.kc = v.kc;
    if (p && v.pc != null && !(p.pc >= v.pc)) p.pc = v.pc;
    f.feito = Math.max(f.feito, v.seq);
  }
  controle(q) {                                        // (uma vez por passo para cada humano: o controle() da PartidaSala)
    const f = q.fila, b = q.netButton, P = this.P;
    if (!f || !b || this.agora() - f.chegou > SILENCIO_MS) {
      if (f) { f.fila.length = 0; f.ult = null; }
      q.mx = q.my = 0; if (b) { b.livre = true; b.arma = 0; } return;
    }
    const vale = P.estado === 'saida' || P.estado === 'jogo';
    if (f.fila.length > 8) while (f.fila.length > 3) this.nsDescarta(f);
    while (f.fila.length && f.fila[0].seq <= f.feito) { const c = f.fila.shift(); f.ult = c; if (vale) N.botaoComando(b, c, this.C); }
    f.min = Math.min(f.min, f.fila.length);
    if (++f.n >= 30) { if (f.min >= 2) for (let i = 1; i < f.min; i++) this.nsDescarta(f); f.min = 99; f.n = 0; }
    const c = f.fila[0];
    let dir = null;
    if (!c) { if (vale && f.ult && f.feito - f.ult.seq < 4) { f.feito++; dir = f.ult; } }
    else if (f.feito && c.seq > f.feito + 1) { f.feito++; dir = c; }
    else { f.fila.shift(); f.ult = c; f.feito = c.seq; dir = c; if (vale) N.botaoComando(b, c, this.C); }
    if (dir && vale) { q.mx = dir.x; q.my = dir.y; q.ack49 = f.feito; }
    else { q.mx = q.my = 0; if (dir) q.ack49 = f.feito; }
    if (vale) N.botaoTick(P, this.C, q, b, this.chutaCb);
    N.curvaTick(P, this.C, q, b, dir ? dir.k | 0 : 0, vale, this.chutaCb);
  }

  /* ---- o passo, o quadro e o motor ---- */
  passo() {
    const P = this.P;
    if (!P.on || P.pausado || P.encerrado) return;
    P.passo(this.entradaCb);
    if (P.tick % this.snapCada === 0 || P.estado === 'fim' || P.encerrado) this.onSnapshot(this.quadro());
  }
  quadro() { const q = this.P.quadro(); if (this.evs.length) { q.ev = this.evs; this.evs = []; } return q; }
  aborta() { this.P.on = false; this.P.encerrado = true; }
  ligar() { if (!this.ligado) { this.ligado = true; MOTOR.add(this); } }
  desligar() { if (this.ligado) { this.ligado = false; MOTOR.del(this); } }
  rodar(ticks) { for (let i = 0; i < ticks && !this.P.encerrado; i++) this.passo(); }
}

module.exports = { PartidaMapa, SNAP_A_CADA };
