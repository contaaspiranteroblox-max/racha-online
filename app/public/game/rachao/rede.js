/* =====================================================================================================================
   RACHÃO · O ONLINE (app/public/game/rachao/rede.js · RACHA v98)
   O pedido: "Deixe separado o racha e o rachão, os caras podem escolher criar modo racha ou rachão, porém dá pra criar
   sala de rachão também on-line". Dentro da Oficina do RACHA (a página aberta numa moldura, ?na=oficina), o Rachão ganha:
     · a tela SALA ONLINE — a mesma preparação dos modos do Rachão: o campo (um dos 17 ou um estádio seu, com a miniatura),
       o tamanho dos times, Partida ou Caos, o nível dos bots, o tempo, os gols, a corrida, os chutes extras, os bots
       completando (ou só gente) e a sala aberta ou fechada; e o ENTRAR COM O CÓDIGO. Os AJUSTES do admin usam a mesma tela;
     · a PARTIDA ONLINE — quem joga a partida é o servidor das salas, com o motor do Rachão (o mesmo código desta página),
       e ele manda o quadro 30 vezes por segundo (quadro.js). Este aparelho manda o comando de cada passo e PREVÊ a própria
       tampinha e a bola com o mesmo motor: a cada quadro, refaz os comandos que o servidor ainda não usou e suaviza a
       diferença. O desenho, os sons, os botões, o placar e a faixa do GOL! são os de sempre do Rachão;
     · o fim com o resultado do servidor (quem fez os gols) e o VOLTAR PARA A SALA.
   A conexão é a do RACHA: a Oficina passa as mensagens (postMessage, só com a moldura do mesmo endereço). Esta página não
   abre conexão nenhuma — a trava dela continua sem conexão para fora. Fora da Oficina, o online não aparece.
   ===================================================================================================================== */
(function () {
'use strict';
if (typeof App === 'undefined' || typeof TopMatch === 'undefined' || typeof MODES === 'undefined' || typeof DEFAULT_SEL === 'undefined') return;
const Q = window.RachaoQuadro, EST = window.RachaoEstadios;
if (!Q || !EST || !EST.ui) return;
const UI = EST.ui, h = UI.h;
const NA_OFICINA = new URLSearchParams(location.search).get('na') === 'oficina' && window.parent !== window;
const ALVO = location.origin && location.origin !== 'null' ? location.origin : '*';
const pai = o => { if (!NA_OFICINA) return false; try { window.parent.postMessage(Object.assign({ rachao: 'rede' }, o), ALVO); return true; } catch (_) { return false; } };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const n3 = v => Math.round(v * 1000) / 1000;
const nomeOk = s => typeof s === 'string' ? s.replace(/[^\p{L}\p{N} ._'-]/gu, '').trim().slice(0, 16) : '';
const RD = { cena: null, ajustes: null, enviando: 0 };
const N_TIME = ['Vermelho', 'Azul'];

/* ---------------------------------------------------------------- 1) a tela SALA ONLINE (a preparação do Rachão) */
DEFAULT_SEL.online = { map: 'classico', size: 2, modo: 'match', diff: 'medio', time: 180, goals: 5, run: 'folego', lob: true, curve: true, superKick: true, bots: true, pub: true };
MODES.online = { title: 'Sala online', desc: 'Crie uma sala do Rachão e chame a galera pelo código. O servidor joga a partida e cada um joga do seu aparelho.',
  cta: 'Criar sala online', opts: ['onCodigo', 'map', 'size', 'onModo', 'diff', 'time', 'goals', 'run', 'shots', 'onBots', 'onPub'] };
const ICONE_ONLINE = '<svg class="ico" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="19" fill="#5b8ee8" stroke="#1d1b16" stroke-width="3.2"/>'
  + '<path d="M5.5 24h37M24 5c-6 6-6 32 0 38M24 5c6 6 6 32 0 38M9 14h30M9 34h30" fill="none" stroke="#1d1b16" stroke-width="2.2"/>'
  + '<circle cx="12" cy="36" r="7" fill="#e23d28" stroke="#1d1b16" stroke-width="2.6"/><circle cx="36" cy="36" r="7" fill="#f7c531" stroke="#1d1b16" stroke-width="2.6"/></svg>';
function montaPlaca() {                                   // a placa ONLINE na tela inicial (só dentro da Oficina)
  const casa = document.getElementById('home'); if (!casa || !NA_OFICINA || casa.querySelector('.rd-placa')) return;
  const pl = h('button.placa.big.azul.rd-placa', { type: 'button', dados: { rd: 'online' } }, UI.svgFixo(ICONE_ONLINE),
    h('span.t', { texto: 'Jogar online' }), h('span.d', { texto: 'Crie uma sala do Rachão ou entre com o código da galera' }));
  pl.addEventListener('click', () => { UI.clique(); abreOnline(); });
  const ofi = casa.querySelector('.rc-placa'), grande = casa.querySelector('.placa.big[data-mode="match"]');
  if (ofi) ofi.after(pl); else if (grande) grande.after(pl);
}
function abreOnline(sel) {                                 // a tela SALA ONLINE (criar); sel: as opções de começo (o campo escolhido)
  RD.ajustes = null;
  if (sel) Object.assign(App.sel.online, sel);
  App.openSetup('online');
}
// o estádio da sala nos AJUSTES: se é um dos seus (o mesmo estádio, peça por peça), o cartão dele; senão — o admin herdou a
// sala, ou mudou o estádio depois de criar — ele aparece só nesta tela, como «Da sala», sem entrar nos seus estádios
const DA_SALA = { id: 'rd-da-sala', doc: null };
const semId = d => { let x = null; try { x = d && EST.limpa(d); } catch (_) { x = null; } if (!x) return ''; x.id = ''; return JSON.stringify(x); };
function tiraDaSala() {
  const i = MAPS.findIndex(m => m.id === DA_SALA.id); if (i >= 0) MAPS.splice(i, 1);
  if (MAP_BY_ID[DA_SALA.id]) delete MAP_BY_ID[DA_SALA.id];
  for (const k in App.sel) if (App.sel[k] && App.sel[k].map === DA_SALA.id) App.sel[k].map = 'classico';
  DA_SALA.doc = null;
}
function poeDaSala(doc) {
  tiraDaSala();
  let d = null, m = null;
  try { d = EST.limpa(doc); m = d && EST.compila(d); } catch (_) { m = null; }
  if (!m) return '';
  m.id = DA_SALA.id; m.custom = true; m.daSala = true;
  MAPS.unshift(m); MAP_BY_ID[m.id] = m; DA_SALA.doc = d;
  return m.id;
}
// os AJUSTES do admin: a mesma tela, com o que a sala tem agora (o campo, as opções, os times, os bots, aberta ou fechada)
function abreAjustes(s) {
  if (!s || typeof s !== 'object') return;
  const o = App.sel.online, opc = s.opc || {};
  let mapa = s.campo && MAP_BY_ID[s.campo] ? s.campo : '';
  RD.ajustes = { code: String(s.code || '') };            // (antes do poeDaSala: o abrir da tela não tira o estádio da sala)
  if (!mapa && s.estadio && typeof s.estadio === 'object') {
    const alvo = semId(s.estadio);
    const meu = alvo && EST.lista().find(r => MAP_BY_ID[r.id] && semId(EST.doc(r.id)) === alvo);
    mapa = meu ? meu.id : poeDaSala(s.estadio);
  }
  Object.assign(o, { map: mapa || o.map, size: s.n | 0 || o.size, modo: opc.modo === 'chaos' ? 'chaos' : 'match', diff: opc.nivel || o.diff, time: opc.tempo != null ? opc.tempo : o.time,
    goals: opc.gols != null ? opc.gols : o.goals, run: opc.corrida || o.run, bots: s.bots !== false, pub: s.pub !== false });
  if (opc.chutes) { o.lob = opc.chutes.lob !== false; o.curve = opc.chutes.curve !== false; o.superKick = opc.chutes.superKick !== false; }
  App.openSetup('online');
}
const openSetupAntes = App.openSetup;
App.openSetup = function (mode) {
  if (mode !== 'online' || !RD.ajustes) tiraDaSala();     // (o «Da sala» é só dos AJUSTES)
  const r = openSetupAntes.apply(this, arguments);
  if (mode === 'online') {
    document.getElementById('setupTitle').textContent = RD.ajustes ? 'Ajustes da sala' : MODES.online.title;
    document.getElementById('setupDesc').textContent = RD.ajustes ? 'O que mudar aqui vale a partir da próxima partida da sala. Só o admin muda.' : MODES.online.desc;
    document.querySelector('#btnStart .t').textContent = RD.ajustes ? 'Salvar ajustes' : MODES.online.cta;
  }
  return r;
};
const buildOptAntes = App.buildOpt;
App.buildOpt = function (o, sel, mode) {
  if (mode !== 'online') return buildOptAntes.apply(this, arguments);
  const re = () => { this.saveSel(); this.renderSetup(); };
  switch (o) {
    case 'onCodigo': return RD.ajustes ? null : caixaCodigo();
    case 'onModo':
      return this.seg('Modo', [['match', 'Partida'], ['chaos', 'Caos, com poderes']], sel.modo === 'chaos' ? 'chaos' : 'match', v => { sel.modo = v; re(); },
        { note: sel.modo === 'chaos' ? 'Todo mundo ganha um poder de tempos em tempos (no botão do raio ou na tecla E).' : 'A partida de sempre, sem poderes.' });
    case 'onBots':
      return this.seg('Vagas vazias', [[true, 'Bots completam'], [false, 'Só gente']], sel.bots !== false, v => { sel.bots = v; re(); },
        { note: sel.bots !== false ? 'A vaga sem ninguém vira bot. Quem cair no meio da partida também vira bot até voltar.' : 'Os times jogam só com quem estiver na sala (cada time precisa de pelo menos uma pessoa).' });
    case 'onPub':
      return this.seg('A sala', [[true, 'Aberta'], [false, 'Fechada']], sel.pub !== false, v => { sel.pub = v; re(); },
        { note: sel.pub !== false ? 'Aparece na lista de salas do RACHA: qualquer um pode entrar.' : 'Só entra quem tiver o código da sala.' });
    case 'diff': { const el = buildOptAntes.apply(this, arguments), t = el && el.querySelector('h3'); if (t) t.textContent = 'Nível dos bots'; return el; }
    case 'map': {
      const el = buildOptAntes.apply(this, arguments), c = el && el.querySelector('.mapCard[data-map="' + DA_SALA.id + '"]');
      if (c) { c.classList.add('rd-da-sala'); const sl = c.querySelector('.rc-selo'); if (sl) sl.textContent = 'Da sala'; }
      return el;
    }
  }
  return buildOptAntes.apply(this, arguments);
};
function caixaCodigo() {                                   // ENTRAR COM O CÓDIGO (6 letras e números)
  const inp = h('input.rd-codigo', { type: 'text', maxLength: 6, placeholder: 'Código da sala', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Código da sala', enterKeyHint: 'go' });
  const vai = () => {
    const code = String(inp.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (code.length < 4) { UI.aviso('Confira o código da sala (6 letras e números).', true); inp.focus(); return; }
    if (!pai({ t: 'entrar', code })) UI.aviso('O online só funciona dentro do RACHA.', true);
  };
  inp.addEventListener('input', () => { const v = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (v !== inp.value) inp.value = v; });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); vai(); } });
  return h('div.opt.rd-entrar', h('h3', { texto: 'Tem o código de uma sala?' }), h('div.rd-entrar-l', inp, UI.bt('Entrar', vai, 'verde')));
}
// o pedido para a Oficina: o campo (um dos 17 pelo id; o estádio de quem cria vai inteiro) e as opções
function pedidoDaSel(sel) {
  const daSala = sel.map === DA_SALA.id && DA_SALA.doc;    // (o «Da sala» vale mesmo que outra aba tenha refeito a lista dos campos no meio)
  const m = daSala ? null : MAP_BY_ID[sel.map] || MAP_BY_ID.classico;
  const rachao = { modo: sel.modo === 'chaos' ? 'chaos' : 'match', tempo: sel.time, gols: sel.goals, corrida: sel.run || 'folego', nivel: sel.diff || 'medio',
    chutes: { lob: sel.lob !== false, curve: sel.curve !== false, superKick: sel.superKick !== false } };
  if (daSala) rachao.estadio = JSON.parse(JSON.stringify(DA_SALA.doc));
  else if (m.custom) { const d = EST.doc(m.id); if (!d) return null; rachao.estadio = d; } else rachao.campo = m.id;
  return { rachao, n: Math.max(1, Math.min(7, sel.size | 0 || 2)), bots: sel.bots !== false, pub: sel.pub !== false };
}
const startGameAntes = App.startGame;
App.startGame = function () {
  if (this.mode !== 'online') return startGameAntes.apply(this, arguments);
  const p = pedidoDaSel(this.sel.online);                 // (CRIAR SALA ONLINE e SALVAR AJUSTES: quem cria a sala é a Oficina, pela conexão do RACHA)
  if (!p) return UI.aviso('Não deu para ler esse estádio. Escolha outro campo.', true);
  if (Date.now() - RD.enviando < 2500) return;
  RD.enviando = Date.now();
  const ok = pai({ t: RD.ajustes ? 'ajustes' : 'criar', pedido: p });   // (o pedido vai inteiro numa chave só: a mensagem já usa a chave rachao)
  UI.aviso(!ok ? 'O online só funciona dentro do RACHA.' : RD.ajustes ? 'Salvando os ajustes…' : 'Abrindo a sala…', !ok);
};

/* ---------------------------------------------------------------- 2) a PARTIDA ONLINE */
const SEM_QUADRO_MS = 600;                                 // (sem quadro por mais que isso: a previsão para e o placar avisa)
class CenaOnline {
  /* d = {code, round, n, lugares (o lugar da sala de cada jogador), opc, eu (o meu lugar, -1 = assistindo), nomes {lugar: nome},
         ult (o último comando que este aparelho mandou nesta partida: a contagem continua dele)} */
  constructor(d, mapa, app) {
    this.app = app; this.code = d.code; this.round = d.round; this.n = d.n;
    const m = this.m = Q.cria(TopMatch, mapa, d.opc, d.n, d.lugares, s => s === d.eu ? 'p1' : null);
    this.eu = m.players.find(p => p.lugar === d.eu) || null;
    this.nomes(d.nomes);
    const cena = this;                                     // (no refazer da previsão nada de partícula: elas já saíram)
    m.fxBurst = function () { if (!cena.refazendo && this.fx.length < 600) return TopMatch.prototype.fxBurst.apply(this, arguments); };   // (com a aba escondida as partículas não andam: o teto segura)
    m.fxConfetti = function () { if (!cena.refazendo && this.fx.length < 600) return TopMatch.prototype.fxConfetti.apply(this, arguments); };
    this.r = app.topR;
    this.touchKind = 'top'; this.dual = false; this.hasPower = m.mode === 'chaos'; this.runMode = m.runMode; this.hasExtra = false;
    this.allowLob = m.allowLob; this.allowCurve = m.allowCurve; this.allowSuper = m.allowSuper;
    // (a contagem dos comandos continua a do aparelho nesta partida: voltar para ela não recomeça do zero — o servidor jogaria
    // fora os comandos "velhos" e os toques até os contadores passarem dos de antes)
    const u = d.ult && typeof d.ult === 'object' ? d.ult : {}, ct = v => Number.isInteger(v) && v >= 0 && v < 2e9 ? v : 0;
    this.seq = ct(u.seq); this.cont = { kn: ct(u.kn), st: ct(u.st), lb: ct(u.lb), cl: ct(u.cl), cr: ct(u.cr), pw: ct(u.pw) }; this.superAntes = false;
    this.pend = []; this.evs = []; this.off = new Map();
    this.temQuadro = false; this.ultQuadro = 0; this.contaAte = 0; this.fimRes = null; this.meuChute = -1e9;
  }
  monta() { this.r.forceLandscape = false; this.r.resize(); this.r.setMatch(this.m); }
  nomes(nomes) {
    for (const p of this.m.players) {
      const nm = nomes && nomeOk(nomes[p.lugar]);
      p.nomeRede = p === this.eu ? '' : nm || '';
      p.label = p === this.eu ? '' : nm || '';
    }
  }
  // o comando deste passo (o mesmo que vai para o servidor): a direção no campo, os botões e os toques
  comando() {
    const s = this.app.input.read('p1');
    let mx = s.mx, my = s.my; if (s.flip) { mx = -mx; my = -my; }
    const w = this.r.dirToWorld(mx, my), k = this.cont, t = {};
    const sup = !!s.superKick;
    if (s.kickNew) { k.kn++; t.kn = true; }
    if (sup && !this.superAntes) { k.st++; t.st = true; }
    this.superAntes = sup;
    if (s.lob) { k.lb++; t.lb = true; }
    if (s.curveL) { k.cl++; t.cl = true; }
    if (s.curveR) { k.cr++; t.cr = true; }
    if (s.power) { k.pw++; t.pw = true; }
    return { seq: ++this.seq, x: n3(w.x), y: n3(w.y), f: (s.kick ? 1 : 0) | (s.sprint ? 2 : 0) | (sup ? 4 : 0), kn: k.kn, st: k.st, lb: k.lb, cl: k.cl, cr: k.cr, pw: k.pw, t };
  }
  update() {                                               // (60 por segundo, no laço do Rachão)
    if (!this.temQuadro || this.fimRes) return;
    if (performance.now() < this.contaAte) return;        // (3, 2, 1: o servidor segura a partida)
    if (performance.now() - this.ultQuadro > SEM_QUADRO_MS) return;   // (a internet travou: nada de inventar o jogo)
    const m = this.m;
    let c = null;
    if (this.eu) {
      c = this.comando();
      pai({ t: 'cmd', c: { seq: c.seq, x: c.x, y: c.y, f: c.f, kn: c.kn, st: c.st, lb: c.lb, cl: c.cl, cr: c.cr, pw: c.pw } });
      this.pend.push(c); if (this.pend.length > 120) this.pend.shift();
    }
    Q.preve(m, this.eu, c ? Object.assign({ x: c.x, y: c.y, f: c.f }, c.t) : null);
    for (const e of m.events) {                            // (o seu chute, o seu toque nos botões: o som sai na hora, sem esperar o servidor)
      if (!this.eu || e.p !== this.eu) continue;
      if (e.t === 'kick') { this.meuChute = performance.now(); this.evs.push(e); }
      else if (e.t === 'arm' || e.t === 'dive') this.evs.push(e);
    }
    m.events.length = 0;
    m.updateFx();
    for (const [dc, o] of this.off) {                      // (a correção some aos poucos: a sua tampinha mais rápido)
      const k = this.eu && dc === this.eu.disc ? 0.7 : 0.82;
      o[0] *= k; o[1] *= k; if (Math.abs(o[0]) < 0.02 && Math.abs(o[1]) < 0.02) this.off.delete(dc);
    }
  }
  quadro(d) {                                              // o quadro do servidor: põe, refaz o que ele ainda não usou e suaviza
    const m = this.m;
    const antes = new Map(); for (const dc of m.world.discs) antes.set(dc, [dc.x, dc.y]);
    if (!Q.aplica(m, d, { mkSeg, M_BALL })) return;
    const i = this.eu ? m.players.indexOf(this.eu) : -1;
    if (i >= 0) { const ack = Array.isArray(d.a) ? d.a[i] | 0 : 0; this.pend = this.pend.filter(c => c.seq > ack); }
    this.refazendo = true;
    try { for (const c of this.pend) Q.preve(m, this.eu, Object.assign({ x: c.x, y: c.y, f: c.f }, c.t)); }
    finally { m.events.length = 0; this.refazendo = false; }
    const primeiro = !this.temQuadro;
    for (const [dc, [x, y]] of antes) {
      if (m.world.discs.indexOf(dc) < 0) { this.off.delete(dc); continue; }
      const o = this.off.get(dc) || [0, 0], nx = o[0] + x - dc.x, ny = o[1] + y - dc.y;
      if (primeiro || Math.hypot(nx, ny) > 60) this.off.delete(dc); else this.off.set(dc, [nx, ny]);   // (salto grande — a saída depois do gol —: vai direto)
    }
    if (primeiro || !this.pend.length) for (const dc of m.world.discs) { dc.px = dc.x; dc.py = dc.y; dc.pz = dc.z; }
    for (const a of Array.isArray(d.ev) ? d.ev.slice(-Q.MAX_EVENTOS) : []) this.evento(a);
    if (this.evs.length > 160) this.evs.splice(0, this.evs.length - 160);   // (a aba escondida não desenha: os sons e avisos velhos saem)
    this.temQuadro = true; this.ultQuadro = performance.now();
  }
  evento(a) {                                              // um evento do servidor: o som, o aviso, as partículas
    const e = Q.deEvento(this.m, a); if (!e) return;
    const m = this.m, eu = this.eu;
    if (e.t === 'fx') { if (e.confete) m.fxConfetti(e.x, e.y, e.team); else m.fxBurst(e.x, e.y, e.cor, e.n); return; }
    if ((e.t === 'arm' || e.t === 'dive') && eu && e.p === eu) return;               // (já tocou aqui)
    if (e.t === 'kick' && eu && e.p === eu && performance.now() - this.meuChute < 700) return;
    if (e.t === 'gotPower') { if (eu && e.p === eu) this.evs.push(e); return; }      // (cada um vê o próprio poder)
    if (e.t === 'power') {
      const pw = POWER_BY_ID[e.id]; if (!pw) return;
      const quem = e.p === eu ? 'Você' : e.p.label || (N_TIME[e.p.team] + ' ' + e.p.num);
      this.evs.push({ t: 'toast', text: quem + ' usou ' + pw.icon + ' ' + pw.name }); this.evs.push({ t: 'power', p: { human: null, label: '', team: e.p.team, num: e.p.num }, id: e.id, mudo: true });
      return;
    }
    this.evs.push(e);
  }
  render(a, dt) {
    const sh = [];
    for (const [dc, o] of this.off) { dc.x += o[0]; dc.y += o[1]; dc.px += o[0]; dc.py += o[1]; sh.push([dc, o]); }
    try { this.r.render(this.temQuadro ? a : 1, dt); }
    finally { for (const [dc, o] of sh) { dc.x -= o[0]; dc.y -= o[1]; dc.px -= o[0]; dc.py -= o[1]; } }
  }
  contagem(ms) { this.contaAte = performance.now() + Math.max(0, Math.min(10000, ms | 0)); this.pend = []; }
  fim(res) { this.fimRes = res && typeof res === 'object' ? res : { score: this.m.score.slice(), winner: -1 }; }
  resize() { this.r.resize(); }
  setZoom(z) { this.r.userZoom = z; }
  drainEvents() { const e = this.evs; this.evs = []; return e.filter(x => !x.mudo); }
  bannerInfo() {
    const falta = this.contaAte - performance.now();
    if (falta > 0) return { text: String(Math.ceil(falta / 1000)), sub: this.eu ? 'Prepare-se' : 'A partida já vai começar', t: 30, max: 30, color: null };
    if (falta > -600 && this.contaAte) return { text: 'Já!', sub: '', t: 30, max: 30, color: this.eu ? this.eu.team : null };
    return this.m.banner;
  }
  over() { return !!this.fimRes; }
  human() { return this.eu; }
  touchState() {
    const p = this.eu; if (!p) return {};
    const st = { charge: p.armed ? 1 : 0, lob: p.lobArm, curve: p.curveArm, lob2: false, curve2: 0, sup: p.superHeld ? p.superCharge : 0, sup2: 0 };
    if (this.hasPower) { st.power = p.power; st.powerFrac = p.power ? 1 : 1 - p.powerTimer / (this.m.powerEvery || POWER_EVERY); }
    return st;
  }
  hud() {
    const m = this.m;
    let mid;
    if (m.overtime) mid = 'Gol de ouro';
    else if (m.timeLimit) mid = fmtTime(Math.max(0, Math.ceil(m.timeLimit - m.time)));
    else mid = fmtTime(m.time);
    let sub = '';
    if (!this.temQuadro) sub = 'Entrando na partida…';
    else if (!this.fimRes && performance.now() - this.ultQuadro > SEM_QUADRO_MS * 2) sub = 'Reconectando…';
    else if (!this.eu) sub = 'Assistindo';                 // (quem assiste: sem botões na tela)
    else if (m.phase === 'kickoff' && m.tick < 200 && m.scoreLimit) sub = 'Até ' + m.scoreLimit + (m.scoreLimit === 1 ? ' gol' : ' gols') + (m.timeLimit ? ' ou fim do tempo' : '');
    return { left: m.score[0], right: m.score[1], mid, sub };
  }
  result() {                                               // a tela do fim (o texto vai como HTML: os nomes passam pelo esc)
    const r = this.fimRes || {}, sc = (Array.isArray(r.score) ? r.score : this.m.score).slice(0, 2).map(v => v | 0), w = r.winner === 0 || r.winner === 1 ? r.winner : -1;
    const meu = this.eu ? this.eu.team : -1;
    const title = meu < 0 ? (w < 0 ? 'Empate' : N_TIME[w] + ' venceu') : w < 0 ? 'Empate' : w === meu ? 'Vitória!' : 'Derrota';
    const jog = Array.isArray(r.jog) ? r.jog.filter(j => j && typeof j === 'object') : [];
    const art = jog.filter(j => (j.gols | 0) > 0).sort((a, b) => (b.gols | 0) - (a.gols | 0)).slice(0, 4)
      .map(j => esc(j.bot ? N_TIME[j.time === 1 ? 1 : 0] + ' ' + (Math.max(0, j.i | 0) % this.n + 1) : nomeOk(j.nome) || 'Jogador') + ' ' + (j.gols | 0));
    const eu = this.eu && jog.find(j => j.i === this.eu.lugar && !j.bot);
    let text = '';
    if (r.motivo) text = 'O admin encerrou a partida (não vale para a sala).';
    else if (eu) { const g = eu.gols | 0, a = eu.assist | 0; text = (g ? 'Você fez ' + g + (g === 1 ? ' gol' : ' gols') : 'Você não marcou desta vez') + (a ? ' e deu ' + a + (a === 1 ? ' passe' : ' passes') + ' para gol' : '') + '.'; }
    if (art.length) text += (text ? '<br>' : '') + 'Gols: ' + art.join(' · ');
    return { title, score: sc, text, win: meu < 0 || w < 0 ? null : w === meu, stats: false };
  }
  destroy() { this.fimRes = this.fimRes || { score: this.m.score.slice(), winner: -1, saiu: true }; }
}
App.startOnline = function (cena) {                       // (o startGame do Rachão, com a cena online pronta)
  if (this.scene && this.scene.destroy) this.scene.destroy();
  try { UI.fechaFolhas(); } catch (_) {}
  this.closeOverlays(); this.closeModals();
  this.mode = 'online';
  this.showScreen('game');
  this.input.reset();
  this.endShown = false; this.hudCache = {}; this.paused = false;
  this.topR.quality = this.autoLow ? 'leve' : this.settings.quality;
  this.perfN = 0; this.perfT = 0;
  this.topR.userZoom = this.settings.zoom;
  this.scene = cena; cena.monta();
  this.input.layout = 'single';
  this.layoutTouch(); this.onResize();
  this.acc = 0; this.last = performance.now();
  $('#banner').classList.remove('show'); this.bannerKey = '';
  clearTimeout(this.toastTimer); $('#toast').classList.remove('show');
  marcaBotoes(true);
};
const online = () => App.scene instanceof CenaOnline;
const layoutAntes = App.layoutTouch;                      // (quem assiste não tem os botões de jogar na tela)
App.layoutTouch = function () { const r = layoutAntes.apply(this, arguments); if (online() && !this.scene.eu) { try { this.touch.show(false); } catch (_) {} } return r; };
// os botões da pausa e do fim na partida online: sem recomeçar nem jogar de novo (quem começa é o admin, na sala)
const TEXTOS = {};
function marcaBotoes(on) {
  const pega = (id, t) => { const b = document.getElementById(id); if (!b) return null; const s = b.querySelector('.t') || b; if (!(id in TEXTOS)) TEXTOS[id] = s.textContent; s.textContent = on ? t : TEXTOS[id]; return b; };
  for (const id of ['btnRestart', 'btnChange']) { const b = document.getElementById(id); if (b) b.hidden = !!on; }
  pega('btnQuit', 'Sair da sala'); pega('btnMenu', 'Sair da sala'); pega('btnAgain', 'Voltar para a sala');   // (no fim: VOLTAR PARA A SALA é o botão grande)
  const tp = document.querySelector('#pause .sheet h2'); if (tp) { if (!('tpausa' in TEXTOS)) TEXTOS.tpausa = tp.textContent; tp.textContent = on ? 'A partida continua' : TEXTOS.tpausa; }
}
document.addEventListener('click', e => {                 // (antes dos botões do Rachão: o sair e o voltar da partida online vão para a Oficina)
  if (!online()) return;
  const b = e.target && e.target.closest && e.target.closest('#btnQuit, #btnMenu, #btnAgain');
  if (!b) return;
  e.stopPropagation(); e.preventDefault();
  if (b.id === 'btnAgain') { UI.clique(); fechaPartida(); pai({ t: 'sala' }); return; }
  UI.confirma('Sair da sala?', 'A partida continua sem você: um bot assume a sua tampinha.', 'Sair', () => { fechaPartida(); pai({ t: 'sair' }); });
}, true);
function fechaPartida() {                                  // (a cena online sai; a página volta para a tela inicial)
  if (!online()) return;
  try { App.scene.destroy(); } catch (_) {}
  App.scene = null; App.closeOverlays();
  try { App.touch.show(false); } catch (_) {}
  marcaBotoes(false);
  App.showScreen('home');
}
const quitAntes = App.quit;
App.quit = function () { if (online()) { fechaPartida(); return; } return quitAntes.apply(this, arguments); };
const startGameAntes2 = App.startGame;                     // (outra partida do Rachão começou: os botões voltam a ser os de sempre)
App.startGame = function () { if (this.mode !== 'online') marcaBotoes(false); return startGameAntes2.apply(this, arguments); };
const showEndAntes = App.showEnd;
App.showEnd = function (sc) {
  const r = showEndAntes.apply(this, arguments);
  if (sc instanceof CenaOnline) { const t = document.getElementById('endText'); if (t && sc.fimRes && sc.fimRes.saiu) t.textContent = ''; }
  return r;
};

/* ---------------------------------------------------------------- 3) a conversa com a Oficina (a conexão é a do RACHA) */
function comeca(d) {
  // d = {code, round, n, lugares, opc, campo | estadio, eu, nomes}
  if (!d || typeof d.code !== 'string' || !Array.isArray(d.lugares) || !d.opc) return;
  let mapa = null;
  if (typeof d.campo === 'string' && d.campo) mapa = EST.original(d.campo);
  else if (d.estadio && typeof d.estadio === 'object') { const doc = EST.limpa(d.estadio); if (doc) mapa = EST.compila(doc); }
  if (!mapa) { pai({ t: 'erro', msg: 'O campo da sala não abriu neste aparelho.' }); return; }
  const n = Math.max(1, Math.min(7, d.n | 0 || 1));
  const lugares = d.lugares.filter(s => Number.isInteger(s) && s >= 0 && s < 2 * n);
  const opc = { modo: d.opc.modo === 'chaos' ? 'chaos' : 'match', tempo: +d.opc.tempo || 0, gols: +d.opc.gols || 0, corrida: ['folego', 'normal', 'sempre'].indexOf(d.opc.corrida) >= 0 ? d.opc.corrida : 'folego',
    nivel: 'medio', chutes: Object.assign({ lob: true, curve: true, superKick: true }, d.opc.chutes || {}) };
  try { UI.fechaFolhas(); } catch (_) {}
  RD.cena = new CenaOnline({ code: d.code, round: d.round | 0, n, lugares, opc, eu: Number.isInteger(d.eu) ? d.eu : -1, nomes: d.nomes || {}, ult: d.ult }, mapa, App);
  App.startOnline(RD.cena);
  pai({ t: 'comecou', code: d.code, round: d.round | 0 });
}
window.addEventListener('message', e => {
  if (!NA_OFICINA || e.source !== window.parent) return;
  if (ALVO !== '*' && e.origin !== location.origin) return;
  const d = e.data; if (!d || typeof d !== 'object' || d.oficina !== 'rede' || typeof d.t !== 'string') return;
  const c = RD.cena && App.scene === RD.cena && (d.code == null || d.code === RD.cena.code) ? RD.cena : null;
  switch (d.t) {
    case 'online': return abreOnline(d.sel && typeof d.sel === 'object' ? { map: MAP_BY_ID[d.sel.map] ? d.sel.map : App.sel.online.map } : null);
    case 'ajustes': return abreAjustes(d.sala);
    case 'comeca': return comeca(d);
    case 'q': if (c && d.round === c.round && d.d) c.quadro(d.d); return;
    case 'contagem': if (c && d.round === c.round) c.contagem(d.ms); return;
    case 'fim': if (c && (d.round == null || d.round === c.round)) c.fim(d.res); return;
    case 'nomes': if (c) c.nomes(d.nomes); return;
    case 'chat': if (App.scene && typeof d.texto === 'string') App.toast((d.nome ? nomeOk(d.nome) + ': ' : '') + String(d.texto).slice(0, 90)); return;
    case 'erro': RD.enviando = 0; UI.aviso(String(d.msg || 'Não deu certo.').slice(0, 140), true); return;
    case 'ok': RD.enviando = 0; return;
    case 'fecha': if (online()) fechaPartida(); return;   // (a sala acabou ou a pessoa saiu dela: a partida some daqui)
  }
});
if (document.getElementById('app')) { if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', montaPlaca); else montaPlaca(); }
window.RachaoRede = Object.freeze({ versao: 'v98', abreOnline, abreAjustes, cena: () => RD.cena, online, pedidoDaSel, CenaOnline });
})();
