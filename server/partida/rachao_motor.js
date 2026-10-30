'use strict';
/* =====================================================================================================================
   RACHA v98 · O MOTOR DO RACHÃO NO SERVIDOR DAS SALAS (server/partida/rachao_motor.js) — ARQUIVO GERADO: NÃO EDITE.
   Gerado por tools/v98/rachao_servidor.py (o build roda) a partir da página do Rachão, sem mudar uma letra:
     · app/public/game/rachao/rachao.html: o script do jogo até a partida vista de cima (a física, os 17 campos, os bots
       e a partida — TopMatch);
     · app/public/game/rachao/ponte.js (a física misturada) e app/public/game/rachao/quadro.js (a língua do online);
     · app/public/game/rachao/estadios.js, as partes 0 a 3 (o estádio como documento: a limpeza e a montagem).
   As salas online do Rachão jogam com ESTE código — o mesmo da página (tests/v98_rachao_servidor_test.mjs confere).
   sha256 (16): jogo b5be492e9009212d · ponte e4efce0d299381cd · quadro 5588d48c6c195b7f · estádio eb850f8b43036953
   ===================================================================================================================== */
function criaMotorRachao(opcoes) {
  opcoes = opcoes || {};
  const Math = Object.create(globalThis.Math);           // (o sorteio do motor: o do servidor; os testes passam um com semente)
  if (typeof opcoes.sorteio === 'function') Math.random = opcoes.sorteio;
  const nada = () => {};
  const window = {}, navigator = {}, location = { search: '', origin: 'null', hash: '' };   // (a página fora do navegador: nada de tela)
  window.parent = window;
  const document = { getElementById: () => null, createElement: () => ({ getContext: () => null }), addEventListener: nada, querySelector: () => null, querySelectorAll: () => [] };
  const localStorage = { getItem: () => null, setItem: nada, removeItem: nada };
  const module = undefined, exports = undefined, define = undefined;   // (a ponte e o quadro são UMD: aqui ficam só no window de mentira)
  /* ======================================================================= app/public/game/rachao/rachao.html (o jogo) */
/* ---- 00-util.js ---- */
'use strict';
/* ===== Utilidades ===== */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const sign = v => (v < 0 ? -1 : 1);
function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}
function angNorm(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function norm(x, y) {
  const d = Math.hypot(x, y);
  return d > 1e-9 ? { x: x / d, y: y / d, d } : { x: 0, y: 0, d: 0 };
}
function rot(x, y, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: x * c - y * s, y: x * s + y * c };
}
/* distância ao quadrado de um ponto a um segmento + ponto mais próximo */
function closestOnSeg(px, py, x1, y1, x2, y2) {
  const ex = x2 - x1, ey = y2 - y1;
  const l2 = ex * ex + ey * ey;
  let t = l2 > 0 ? ((px - x1) * ex + (py - y1) * ey) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { x: x1 + ex * t, y: y1 + ey * t, t };
}
function segDist(px, py, x1, y1, x2, y2) {
  const c = closestOnSeg(px, py, x1, y1, x2, y2);
  return Math.hypot(px - c.x, py - c.y);
}
function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi) inside = !inside;
  }
  return inside;
}
/* armazenamento seguro (pode falhar em janelas privadas / pré-visualizações) */
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem('rachao.' + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem('rachao.' + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ }
  }
};
const fmtTime = s => {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60), r = s % 60;
  return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
};

/* ---- 01-audio.js ---- */
'use strict';
/* ===== Sons sintetizados (nenhum arquivo externo) ===== */
const Sound = {
  ctx: null, master: null, noiseBuf: null, on: true, lastT: {},
  init() {
    if (this.ctx || typeof window === 'undefined') return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  ok(key, gap) {
    if (!this.on || !this.ctx) return false;
    const t = this.ctx.currentTime;
    if (key && this.lastT[key] && t - this.lastT[key] < (gap || 0.04)) return false;
    if (key) this.lastT[key] = t;
    return true;
  },
  noise(t0, dur, freq, q, gain, type) {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
    return { src, f, g };
  },
  tone(t0, dur, f0, f1, gain, type) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
    return o;
  },
  kick(power) {
    if (!this.ok('kick', 0.03)) return;
    const t = this.ctx.currentTime, k = clamp((power || 6) / 10, 0.3, 1.6);
    this.tone(t, 0.12, 140 * k + 60, 50, 0.5 * k, 'sine');
    this.noise(t, 0.06, 1800, 1.2, 0.25 * k);
  },
  touch() { if (!this.ok('touch', 0.08)) return; const t = this.ctx.currentTime; this.tone(t, 0.06, 180, 90, 0.12); },
  bounce() { if (!this.ok('bounce', 0.06)) return; const t = this.ctx.currentTime; this.tone(t, 0.08, 120, 70, 0.18); },
  wall() { if (!this.ok('wall', 0.07)) return; const t = this.ctx.currentTime; this.noise(t, 0.07, 500, 1.5, 0.15); this.tone(t, 0.06, 90, 60, 0.12); },
  post() {
    if (!this.ok('post', 0.1)) return;
    const t = this.ctx.currentTime;
    this.tone(t, 0.5, 1240, 1180, 0.16, 'triangle');
    this.tone(t, 0.35, 1870, 1800, 0.08, 'sine');
    this.tone(t, 0.08, 200, 90, 0.2);
  },
  net() { if (!this.ok('net', 0.15)) return; const t = this.ctx.currentTime; this.noise(t, 0.3, 900, 0.7, 0.18, 'lowpass'); },
  whistle(long) {
    if (!this.ok('whistle', 0.3)) return;
    const t = this.ctx.currentTime, c = this.ctx;
    const blast = (t0, dur) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 2900;
      const lfo = c.createOscillator(); lfo.frequency.value = 38;
      const lg = c.createGain(); lg.gain.value = 90;
      lfo.connect(lg); lg.connect(o.frequency);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.13, t0 + 0.02);
      g.gain.setValueAtTime(0.13, t0 + dur - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); lfo.start(t0); o.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
    };
    if (long) { blast(t, 0.25); blast(t + 0.32, 0.25); blast(t + 0.64, 0.7); } else blast(t, 0.32);
  },
  goal() {
    if (!this.ok('goal', 0.5)) return;
    const t = this.ctx.currentTime, c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.6;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.35);
    g.gain.setValueAtTime(0.35, t + 1.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1300, t + 1.0);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 2.7);
    this.tone(t, 0.25, 520, 0, 0.12, 'square');
    this.tone(t + 0.18, 0.4, 780, 0, 0.12, 'square');
  },
  save() { if (!this.ok('save', 0.3)) return; const t = this.ctx.currentTime; this.noise(t, 0.6, 600, 0.5, 0.12, 'lowpass'); this.tone(t, 0.15, 330, 0, 0.08, 'triangle'); },
  miss() { if (!this.ok('miss', 0.3)) return; const t = this.ctx.currentTime; this.tone(t, 0.4, 300, 140, 0.12, 'triangle'); },
  power() { if (!this.ok('power', 0.1)) return; const t = this.ctx.currentTime; const n = this.noise(t, 0.45, 400, 3, 0.25); n.f.frequency.exponentialRampToValueAtTime(3000, t + 0.4); this.tone(t, 0.3, 300, 900, 0.08, 'sawtooth'); },
  got() { if (!this.ok('got', 0.2)) return; const t = this.ctx.currentTime; this.tone(t, 0.1, 880, 0, 0.1, 'triangle'); this.tone(t + 0.09, 0.14, 1320, 0, 0.1, 'triangle'); },
  bumper() { if (!this.ok('bumper', 0.05)) return; const t = this.ctx.currentTime; this.tone(t, 0.15, 600, 1500, 0.14, 'square'); },
  pop() { if (!this.ok('pop', 0.05)) return; const t = this.ctx.currentTime; this.tone(t, 0.09, 900, 300, 0.12); },
  click() { if (!this.ok('click', 0.03)) return; const t = this.ctx.currentTime; this.tone(t, 0.05, 700, 500, 0.08, 'triangle'); },
  arm() { if (!this.ok('arm', 0.05)) return; const t = this.ctx.currentTime; this.tone(t, 0.06, 1000, 1400, 0.06, 'triangle'); },
  jump() { if (!this.ok('jump', 0.08)) return; const t = this.ctx.currentTime; this.tone(t, 0.14, 300, 650, 0.08, 'sine'); },
  putt(p) { if (!this.ok('putt', 0.05)) return; const t = this.ctx.currentTime; this.tone(t, 0.05, 1200, 900, 0.12 + p * 0.1, 'triangle'); this.noise(t, 0.04, 3000, 2, 0.08); },
  cup() { if (!this.ok('cup', 0.3)) return; const t = this.ctx.currentTime; this.tone(t, 0.12, 500, 200, 0.18); this.tone(t + 0.12, 0.1, 400, 160, 0.14); this.tone(t + 0.22, 0.08, 330, 140, 0.1); },
  splash() { if (!this.ok('splash', 0.2)) return; const t = this.ctx.currentTime; this.noise(t, 0.5, 1200, 0.8, 0.25); },
  win() { if (!this.ok('win', 1)) return; const t = this.ctx.currentTime; [523, 659, 784, 1046].forEach((f, i) => this.tone(t + i * 0.12, 0.3, f, 0, 0.1, 'triangle')); },
  lose() { if (!this.ok('lose', 1)) return; const t = this.ctx.currentTime; [392, 330, 262].forEach((f, i) => this.tone(t + i * 0.16, 0.35, f, 0, 0.1, 'triangle')); }
};

/* ---- 02-physics.js ---- */
'use strict';
/* ===== Física 2D de discos e segmentos ===== */
const PHYS = {
  SUBSTEPS: 3,
  PLAYER_H: 17,   // bola acima desta altura passa por cima dos jogadores
  HEAD_REACH: 30, // altura máxima em que ainda dá para chutar/cabecear
  CROSSBAR: 30    // altura do travessão
};
const M_BALL = 1, M_PLAYER = 2, M_ALL = 3;

class Disc {
  constructor(o) {
    this.x = o.x || 0; this.y = o.y || 0;
    this.px = this.x; this.py = this.y;
    this.vx = o.vx || 0; this.vy = o.vy || 0;
    this.r = o.r; this.baseR = o.r;
    this.im = o.im === undefined ? 1 : o.im;
    this.baseIm = this.im;
    this.damp = o.damp === undefined ? 0.99 : o.damp;
    this.bounce = o.bounce === undefined ? 0.5 : o.bounce;
    this.kind = o.kind || 'ball'; // 'ball' | 'player' | 'static'
    this.mask = o.mask || M_ALL;
    this.z = 0; this.vz = 0; this.pz = 0;
    this.spin = 0; this.rot = 0;
    this.boost = o.boost || 0;
    this.h = o.h || 0;   // altura de obstáculos estáticos (0 = infinita)
    this.flash = 0;
    this.ghost = false;
    this.owner = null;
    this.lastTouch = null; this.prevTouch = null;
    this.extra = false;
    this.life = 0;
    this.style = o.style || null;
  }
}

function mkSeg(x1, y1, x2, y2, o) {
  o = o || {};
  return {
    x1, y1, x2, y2,
    bounce: o.bounce === undefined ? 0.8 : o.bounce,
    mask: o.mask || M_ALL,
    minZ: o.minZ === undefined ? -1e9 : o.minZ,
    maxZ: o.maxZ === undefined ? 1e9 : o.maxZ,
    boost: o.boost || 0,
    kind: o.kind || 'wall',
    vis: o.vis === undefined ? true : o.vis,
    flash: 0,
    velAt: o.velAt || null,
    tag: o.tag || null,
    th: o.th || 0,
    style: o.style || null
  };
}

class World {
  constructor() {
    this.discs = [];
    this.statics = [];
    this.segs = [];
    this.touches = [];
    this.hits = [];
  }
  maskOf(d) { return d.kind === 'ball' ? M_BALL : M_PLAYER; }
  /* deferContacts (Clássico): durante o movimento só valem paredes e traves (para a bola rápida não atravessar);
     os contatos entre discos ficam para contactsClassic(), depois do amortecimento, como no modo Clássico */
  step(deferContacts) {
    const S = PHYS.SUBSTEPS, ds = this.discs, st = this.statics, sg = this.segs;
    this.touches.length = 0;
    this.hits.length = 0;
    for (let s = 0; s < S; s++) {
      for (let i = 0; i < ds.length; i++) { const d = ds[i]; d.x += d.vx / S; d.y += d.vy / S; }
      for (let i = 0; i < ds.length; i++) {
        const a = ds[i];
        if (!deferContacts) for (let j = i + 1; j < ds.length; j++) this.collideDD(a, ds[j]);
        for (let k = 0; k < st.length; k++) this.collideDS(a, st[k]);
        for (let k = 0; k < sg.length; k++) this.collideSeg(a, sg[k]);
      }
    }
  }
  /* passada única de contatos, na ordem do modo Clássico: a bola primeiro (traves, depois jogadores, depois paredes),
     depois as traves contra os jogadores, e por fim cada jogador contra os seguintes e contra as paredes */
  contactsClassic() {
    const ds = this.discs, st = this.statics, sg = this.segs;
    const order = this.order || (this.order = []);
    order.length = 0;
    for (const d of ds) if (d.kind === 'ball') order.push(d);
    const nb = order.length;
    for (const d of ds) if (d.kind !== 'ball') order.push(d);
    for (let i = 0; i < nb; i++) {
      const a = order[i];
      for (let k = 0; k < st.length; k++) this.collideDS(a, st[k]);
      for (let j = i + 1; j < order.length; j++) this.collideDD(a, order[j]);
      for (let k = 0; k < sg.length; k++) this.collideSeg(a, sg[k]);
    }
    for (let k = 0; k < st.length; k++) for (let i = nb; i < order.length; i++) this.collideDS(order[i], st[k]);
    for (let i = nb; i < order.length; i++) {
      const a = order[i];
      for (let j = i + 1; j < order.length; j++) this.collideDD(a, order[j]);
      for (let k = 0; k < sg.length; k++) this.collideSeg(a, sg[k]);
    }
  }
  collideDD(a, b) {
    if (a.ghost || b.ghost) return;
    let ball = null, pl = null;
    if (a.kind === 'ball' && b.kind === 'player') { ball = a; pl = b; }
    else if (b.kind === 'ball' && a.kind === 'player') { ball = b; pl = a; }
    if (ball && ball.z > PHYS.PLAYER_H) return;
    const dx = b.x - a.x, dy = b.y - a.y, R = a.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return;
    let ia = a.im, ib = b.im, e = a.bounce * b.bounce;
    if (ball && this.bolaPe) {   // (Oficina de estádios: a bola do RACHA — o peso no contato e o quique no pé)
      if (this.bolaPe.peso > 0) { if (ball === a) ia = 0.5 / this.bolaPe.peso; else ib = 0.5 / this.bolaPe.peso; }
      if (this.bolaPe.e != null) e = this.bolaPe.e;
    }
    const tot = ia + ib;
    if (tot <= 0) return;
    let d = Math.sqrt(d2), nx, ny;
    if (d < 1e-6) { nx = 1; ny = 0; d = 0; } else { nx = dx / d; ny = dy / d; }
    const pen = R - d;
    a.x -= nx * pen * ia / tot; a.y -= ny * pen * ia / tot;
    b.x += nx * pen * ib / tot; b.y += ny * pen * ib / tot;
    const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rv < 0) {
      const j = -(1 + e) * rv / tot;
      a.vx -= nx * j * ia; a.vy -= ny * j * ia;
      b.vx += nx * j * ib; b.vy += ny * j * ib;
      if (ball) {
        this.touches.push({ ball, pl, imp: -rv });
        if (ball.z > 1) ball.vz *= 0.4; // amortece no peito
      } else if (a.kind === 'ball' && b.kind === 'ball') {
        this.hits.push({ kind: 'ballball', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, imp: -rv });
      }
    } else if (ball) {
      this.touches.push({ ball, pl, imp: 0 });
    }
  }
  collideDS(d, s) {
    if (d.ghost) return;
    if (!(s.mask & this.maskOf(d))) return;
    if (d.kind === 'ball' && s.h && d.z > s.h) return;
    const dx = d.x - s.x, dy = d.y - s.y, R = d.r + s.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return;
    let dist = Math.sqrt(d2), nx, ny;
    if (dist < 1e-6) { nx = 1; ny = 0; dist = 0; } else { nx = dx / dist; ny = dy / dist; }
    d.x += nx * (R - dist); d.y += ny * (R - dist);
    const vn = d.vx * nx + d.vy * ny;
    if (vn < 0) {
      const e = d.bounce * s.bounce;
      d.vx -= nx * vn * (1 + e); d.vy -= ny * vn * (1 + e);
      if (d.kind === 'ball') this.hits.push({ kind: s.style || 'post', x: s.x, y: s.y, imp: -vn, obj: s });
    }
    if (s.boost) {
      const vn2 = d.vx * nx + d.vy * ny;
      if (vn2 < s.boost) { d.vx += nx * (s.boost - vn2); d.vy += ny * (s.boost - vn2); }
      s.flash = 12;
    }
  }
  collideSeg(d, s) {
    if (d.ghost) return;
    if (!(s.mask & this.maskOf(d))) return;
    if (d.kind === 'ball' && (d.z < s.minZ || d.z >= s.maxZ)) return;
    const ex = s.x2 - s.x1, ey = s.y2 - s.y1;
    const l2 = ex * ex + ey * ey;
    let t = l2 > 0 ? ((d.x - s.x1) * ex + (d.y - s.y1) * ey) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = s.x1 + ex * t, cy = s.y1 + ey * t;
    const dx = d.x - cx, dy = d.y - cy;
    const d2 = dx * dx + dy * dy;
    const R = d.r + (s.th || 0);
    if (d2 >= R * R) return;
    let dist = Math.sqrt(d2), nx, ny;
    if (dist < 1e-6) {
      const l = Math.sqrt(l2) || 1; nx = -ey / l; ny = ex / l; dist = 0;
    } else { nx = dx / dist; ny = dy / dist; }
    d.x += nx * (R - dist); d.y += ny * (R - dist);
    let svx = 0, svy = 0;
    if (s.velAt) { const v = s.velAt(cx, cy); svx = v.x; svy = v.y; }
    const rvx = d.vx - svx, rvy = d.vy - svy;
    const vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      const e = d.bounce * s.bounce;
      d.vx = svx + rvx - nx * vn * (1 + e);
      d.vy = svy + rvy - ny * vn * (1 + e);
      if (d.kind === 'ball') this.hits.push({ kind: s.kind, x: cx, y: cy, imp: -vn, obj: s });
    }
    if (s.boost) {
      const vn2 = d.vx * nx + d.vy * ny;
      if (vn2 < s.boost) { d.vx += nx * (s.boost - vn2); d.vy += ny * (s.boost - vn2); }
      s.flash = 12;
    }
  }
}

/* ---- 03-maps.js ---- */
'use strict';
/* ===== Estádios (todos originais) ===== */
function basePhys(o) {
  // bola e jogador do modo Clássico (discos com restituição pelo produto, chute armado de força fixa);
  // aceleração e corrida são as do Rachão
  const base = {
    ballDamp: 0.99,     // atrito da bola no chão (por tick)
    airDamp: 0.996,     // atrito da bola no ar (cavadinha)
    playerDamp: 0.96,
    accel: 0.11,
    sprint: 1.34,
    ballBounce: 0.5,
    playerBounce: 0.5,
    wallBounce: 1,
    netBounce: 1,       // laterais da rede
    netBackBounce: 0.1, // fundo da rede
    gravity: 0.24,
    landBounce: 0.5,
    ballR: 10,
    ballIm: 1,
    playerR: 15,
    postR: 8,
    postBounce: 0.5,
    borderBounce: 0,
    kickForce: 5,       // força do chute × massa inversa da bola
    kickReach: 4,       // alcance: raio do jogador + raio da bola + 4
    kickGap: 2,         // ticks mínimos entre dois chutes
    kickAccel: 0.7      // com o chute armado o jogador acelera menos
  };
  // o que cada estádio muda (areia, gelo, lua...) continua valendo
  return Object.assign(base, o || {});
}
function sym4(list) {
  const out = [];
  for (const o of list) {
    const seen = new Set();
    for (const sx of [1, -1]) for (const sy of [1, -1]) {
      const k = (o.x * sx) + ',' + (o.y * sy);
      if (seen.has(k)) continue; seen.add(k);
      out.push(Object.assign({}, o, { x: o.x * sx, y: o.y * sy }));
    }
  }
  return out;
}
function symX(list) {
  const out = [];
  for (const o of list) {
    out.push(o);
    if (o.x !== 0) out.push(Object.assign({}, o, { x: -o.x }));
  }
  return out;
}

const MAPS = [
  {
    id: 'classico', name: 'Clássico', desc: 'Grama aparada e tamanho de sempre. Bom para 1x1 até 3x3.',
    W: 430, H: 205, goal: 66, depth: 44, corner: 30, margin: 46, circle: 72,
    surface: 'grass', sizes: [1, 4], def: 2
  },
  {
    id: 'estadio', name: 'Estadão', desc: 'Campo grande com arquibancada. Feito para times cheios.',
    W: 620, H: 290, goal: 82, depth: 50, corner: 34, margin: 54, circle: 96,
    surface: 'stadium', sizes: [3, 7], def: 4
  },
  {
    id: 'golaberto', name: 'Gol Aberto', desc: 'Traves bem afastadas: chove gol.',
    W: 520, H: 245, goal: 120, depth: 48, corner: 34, margin: 50, circle: 84,
    surface: 'check', sizes: [2, 5], def: 3
  },
  {
    id: 'quadra', name: 'Quadra', desc: 'Piso de madeira, quadra curta e jogo rápido de pé em pé.',
    W: 330, H: 168, goal: 50, depth: 36, corner: 0, margin: 34, circle: 54,
    surface: 'wood', sizes: [1, 3], def: 2,
    phys: { accel: 0.125, playerDamp: 0.955, ballDamp: 0.985, ballBounce: 0.4, wallBounce: 0.45, landBounce: 0.35 }
  },
  {
    id: 'rua', name: 'Rua', desc: 'Asfalto, gol de chinelo e poste no caminho.',
    W: 400, H: 182, goal: 44, depth: 26, corner: 0, margin: 30, circle: 60,
    surface: 'asphalt', sizes: [1, 3], def: 2, postStyle: 'chinelo', netStyle: 'garage',
    phys: { ballBounce: 0.62, wallBounce: 0.72, ballDamp: 0.988 },
    statics: sym4([{ x: 190, y: 156, r: 10, style: 'poste' }])
  },
  {
    id: 'terrao', name: 'Terrão', desc: 'Várzea de terra batida com poças de lama que seguram tudo.',
    W: 460, H: 220, goal: 70, depth: 44, corner: 14, margin: 48, circle: 74,
    surface: 'dirt', sizes: [2, 5], def: 3,
    phys: { ballDamp: 0.986, wallBounce: 0.5 },
    zones: sym4([{ x: 238, y: 96, r: 46, kind: 'mud', ballDamp: 0.955, accelMul: 0.6, playerDamp: 0.95 }])
  },
  {
    id: 'praia', name: 'Praia', desc: 'Areia fofa: a bola morre rápido, vale levantar.',
    W: 400, H: 190, goal: 64, depth: 40, corner: 22, margin: 42, circle: 64,
    surface: 'sand', sizes: [1, 4], def: 2, postStyle: 'bambu',
    phys: { ballDamp: 0.976, airDamp: 0.995, accel: 0.096, playerDamp: 0.955, ballBounce: 0.4, landBounce: 0.3, wallBounce: 0.5 }
  },
  {
    id: 'rinque', name: 'Rinque', desc: 'Gelo liso, cantos redondos e espaço atrás dos gols.',
    shape: 'rink', W: 500, H: 232, corner: 112, goal: 54, depth: 34, goalInset: 82, margin: 0, circle: 64,
    surface: 'ice', sizes: [1, 5], def: 2,
    phys: { accel: 0.072, playerDamp: 0.983, ballDamp: 0.996, ballBounce: 0.7, wallBounce: 0.78, landBounce: 0.4, sprint: 1.25 }
  },
  {
    id: 'noturno', name: 'Noturno', desc: 'Jogo à noite sob refletores. Fique de olho na sombra.',
    W: 470, H: 220, goal: 70, depth: 46, corner: 30, margin: 48, circle: 76,
    surface: 'night', sizes: [1, 4], def: 2
  },
  {
    id: 'chuva', name: 'Temporal', desc: 'Grama encharcada: a bola desliza e as poças freiam.',
    W: 480, H: 225, goal: 70, depth: 46, corner: 30, margin: 48, circle: 76,
    surface: 'rain', sizes: [1, 5], def: 3,
    phys: { ballDamp: 0.994, playerDamp: 0.965 },
    zones: sym4([{ x: 160, y: 122, r: 38, kind: 'puddle', ballDamp: 0.93, accelMul: 0.85 }])
      .concat(symX([{ x: 330, y: 0, r: 30, kind: 'puddle', ballDamp: 0.93, accelMul: 0.85 }]))
  },
  {
    id: 'lua', name: 'Lua', desc: 'Gravidade baixa: as coberturas flutuam e tudo quica mais.',
    W: 450, H: 215, goal: 70, depth: 46, corner: 30, margin: 48, circle: 74,
    surface: 'moon', sizes: [1, 4], def: 2,
    phys: { gravity: 0.085, ballBounce: 0.72, landBounce: 0.72, ballDamp: 0.993, airDamp: 0.999, accel: 0.085, playerDamp: 0.972 }
  },
  {
    id: 'fliper', name: 'Fliperama', desc: 'Pára-choques que devolvem a bola com tudo.',
    W: 440, H: 210, goal: 64, depth: 44, corner: 70, cornerStyle: 'chamfer', cornerBoost: 6.5, margin: 44, circle: 70,
    surface: 'neon', sizes: [1, 4], def: 2,
    statics: sym4([{ x: 165, y: 78, r: 20, boost: 8.5, style: 'bumper' }])
      .concat([{ x: 0, y: 140, r: 16, boost: 8, style: 'bumper' }, { x: 0, y: -140, r: 16, boost: 8, style: 'bumper' }])
  },
  {
    id: 'octogono', name: 'Octógono', desc: 'Cantos cortados: a bola volta em ângulos estranhos.',
    W: 420, H: 222, goal: 72, depth: 46, corner: 112, cornerStyle: 'chamfer', margin: 44, circle: 70,
    surface: 'court', sizes: [1, 4], def: 2
  },
  {
    id: 'coliseu', name: 'Coliseu', desc: 'Arena oval de saibro cercada de pedra.',
    shape: 'oval', W: 430, H: 268, goal: 74, depth: 46, margin: 44, circle: 74,
    surface: 'clay', sizes: [1, 4], def: 2
  },
  {
    id: 'labirinto', name: 'Jardim', desc: 'Cercas vivas e vasos no meio do caminho.',
    W: 450, H: 220, goal: 68, depth: 44, corner: 26, margin: 46, circle: 70,
    surface: 'garden', sizes: [1, 4], def: 2,
    walls: sym4([{ x: 135, y: 102, len: 64, th: 14, style: 'hedge' }]),
    statics: symX([{ x: 300, y: 0, r: 20, style: 'vaso' }])
  },
  {
    id: 'vendaval', name: 'Vendaval', desc: 'O vento muda de lado a cada poucos segundos.',
    W: 460, H: 215, goal: 70, depth: 46, corner: 30, margin: 48, circle: 74,
    surface: 'dry', sizes: [1, 4], def: 2, wind: true
  },
  {
    id: 'buraquinho', name: 'Buraquinho', desc: 'Gol pequenininho num muro. Precisão pura; vai até 3.',
    W: 380, H: 180, goal: 26, depth: 30, corner: 0, margin: 32, circle: 60,
    surface: 'wall', sizes: [1, 3], def: 1, netStyle: 'hole', scoreDefault: 3
  }
];
const MAP_BY_ID = {};
for (const m of MAPS) MAP_BY_ID[m.id] = m;

/* ===== Montagem da geometria ===== */
function arcInto(out, cx, cy, r, a0, a1, n) {
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
}
function cornerInto(out, m, sx, sy, a0, a1) {
  const W = m.W, H = m.H, c = m.corner || 0;
  if (c <= 0) { out.push([sx * W, sy * H]); return; }
  if (m.cornerStyle === 'chamfer') {
    // ordem depende do sentido do percurso (a0 -> a1)
    const p1 = [sx * W, sy * (H - c)], p2 = [sx * (W - c), sy * H];
    const fromX = Math.abs(Math.cos(a0)) > 0.5;
    if (fromX) { out.push(p1, p2); } else { out.push(p2, p1); }
    return;
  }
  arcInto(out, sx * (W - c), sy * (H - c), c, a0, a1, 8);
}
function roundedRectPts(W, H, c, n) {
  const pts = [];
  if (c <= 0) return [[W, -H], [W, H], [-W, H], [-W, -H]];
  arcInto(pts, W - c, H - c, c, 0, Math.PI / 2, n);
  arcInto(pts, -W + c, H - c, c, Math.PI / 2, Math.PI, n);
  arcInto(pts, -W + c, -H + c, c, Math.PI, Math.PI * 1.5, n);
  arcInto(pts, W - c, -H + c, c, Math.PI * 1.5, Math.PI * 2, n);
  return pts;
}

/* gl/gr = meia-largura dos gols esquerdo/direito (permite o poder "Golzão") */
function buildStadium(m, gl, gr) {
  const P = basePhys(m.phys);
  gl = gl || m.goal; gr = gr || m.goal;
  const out = { segs: [], statics: [], goals: [], chains: [], playerChain: null, zones: [], walls: [] };
  const W = m.W, H = m.H;
  const ballMask = m.shape === 'rink' ? M_ALL : M_BALL;
  let gxL, gxR;
  if (m.shape === 'oval') {
    const tr = Math.asin(clamp(gr / H, 0, 0.95)), tl = Math.asin(clamp(gl / H, 0, 0.95));
    gxR = W * Math.cos(tr); gxL = -W * Math.cos(tl);
    const bottom = [], top = [];
    const n = 40;
    for (let i = 0; i <= n; i++) { const a = tr + (Math.PI - tl - tr) * i / n; bottom.push([W * Math.cos(a), H * Math.sin(a)]); }
    for (let i = 0; i <= n; i++) { const a = Math.PI + tl + (Math.PI - tl - tr) * i / n; top.push([W * Math.cos(a), H * Math.sin(a)]); }
    bottom[0] = [gxR, gr]; bottom[n] = [gxL, gl];
    top[0] = [gxL, -gl]; top[n] = [gxR, -gr];
    out.chains.push(bottom, top);
  } else if (m.shape === 'rink') {
    const pts = roundedRectPts(W, H, m.corner, 12);
    pts.push(pts[0]);
    out.chains.push(pts);
    gxR = W - m.goalInset; gxL = -(W - m.goalInset);
  } else {
    gxR = W; gxL = -W;
    const bottom = [[W, gr]];
    cornerInto(bottom, m, 1, 1, 0, Math.PI / 2);
    cornerInto(bottom, m, -1, 1, Math.PI / 2, Math.PI);
    bottom.push([-W, gl]);
    const top = [[-W, -gl]];
    cornerInto(top, m, -1, -1, Math.PI, Math.PI * 1.5);
    cornerInto(top, m, 1, -1, Math.PI * 1.5, Math.PI * 2);
    top.push([W, -gr]);
    out.chains.push(bottom, top);
  }
  for (const ch of out.chains) {
    for (let i = 0; i < ch.length - 1; i++) {
      const a = ch[i], b = ch[i + 1];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.01) continue;
      // cantos chanfrados do fliperama devolvem a bola
      let boost = 0;
      if (m.cornerBoost && Math.abs(a[0] - b[0]) > 1 && Math.abs(a[1] - b[1]) > 1) boost = m.cornerBoost;
      out.segs.push(mkSeg(a[0], a[1], b[0], b[1], { bounce: P.wallBounce, mask: ballMask, kind: boost ? 'kicker' : 'wall', boost }));
    }
  }
  // limite dos jogadores (fora das linhas)
  if (m.shape !== 'rink') {
    const mx = Math.max(m.margin, m.depth + 14), my = m.margin;
    const pc = m.cornerStyle === 'chamfer' ? 40 : Math.min((m.corner || 0) + m.margin, 90);
    const ox = (m.shape === 'oval' ? Math.max(gxR, -gxL) : W) + mx;
    const pts = roundedRectPts(ox, H + my, pc, 6);
    pts.push(pts[0]);
    out.playerChain = pts;
    for (let i = 0; i < pts.length - 1; i++) {
      out.segs.push(mkSeg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], { bounce: P.borderBounce, mask: M_ALL, kind: 'border', vis: false }));
    }
  }
  // gols
  const addGoal = (gx, dir, half) => {
    const D = m.depth;
    for (const sy of [-1, 1]) {
      const post = new Disc({ x: gx, y: sy * half, r: P.postR, im: 0, bounce: P.postBounce, kind: 'static', h: PHYS.CROSSBAR + 4 });
      post.style = m.postStyle || 'trave';
      out.statics.push(post);
    }
    const k = Math.min(10, D * 0.3);
    const pts = [[gx, -half], [gx + dir * (D - k), -half], [gx + dir * D, -half + k], [gx + dir * D, half - k], [gx + dir * (D - k), half], [gx, half]];
    for (let i = 0; i < pts.length - 1; i++) {
      const side = i === 0 || i === pts.length - 2;
      out.segs.push(mkSeg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], { bounce: side ? P.netBounce : P.netBackBounce, mask: M_ALL, kind: 'net', vis: false }));
    }
    // travessão: bola alta bate e volta
    out.segs.push(mkSeg(gx, -half, gx, half, { bounce: 0.5, mask: M_BALL, minZ: PHYS.CROSSBAR, kind: 'bar', vis: false }));
    out.goals.push({ side: dir < 0 ? 0 : 1, x: gx, dir, half, depth: D, net: pts });
  };
  addGoal(gxL, -1, gl);
  addGoal(gxR, 1, gr);
  // obstáculos
  for (const s of (m.statics || [])) {
    const d = new Disc({ x: s.x, y: s.y, r: s.r, im: 0, bounce: s.boost ? 1 : 0.8, kind: 'static', boost: s.boost || 0 });
    d.style = s.style || 'poste';
    out.statics.push(d);
  }
  for (const w of (m.walls || [])) {
    const wa = (w.a || 0) * Math.PI / 180, wc = Math.cos(wa) * w.len / 2, ws = Math.sin(wa) * w.len / 2;   // (Oficina de estádios: a cerca pode ficar inclinada)
    const sg = mkSeg(w.x - wc, w.y - ws, w.x + wc, w.y + ws, { bounce: 0.6, mask: M_ALL, kind: 'hedge', th: w.th, style: w.style });
    out.segs.push(sg);
    out.walls.push(sg);
  }
  out.zones = (m.zones || []).map(z => Object.assign({}, z));
  out.gx = [gxL, gxR];
  // extensão total para câmera/render
  const ex = Math.max(W, gxR + m.depth) + (m.shape === 'rink' ? 0 : Math.max(m.margin, m.depth + 14));
  const ey = H + (m.shape === 'rink' ? 0 : m.margin);
  out.ext = { x: ex, y: ey };
  out.phys = P;
  return out;
}

/* ---- 04-field.js ---- */
'use strict';
/* ===== Desenho estático dos estádios (gramado, linhas, gols) ===== */
const INK = '#1d1b16';

const SURFACES = {
  grass:   { a: '#3d9248', b: '#368541', apron: '#2f7639', out: '#24502d', line: '#f3f6ec', stripe: 'v' },
  stadium: { a: '#3b9046', b: '#33823e', apron: '#2d7137', out: '#4b4f57', line: '#f3f6ec', stripe: 'h', crowd: true },
  check:   { a: '#40954b', b: '#378743', apron: '#2f7639', out: '#24502d', line: '#f3f6ec', stripe: 'c' },
  wood:    { a: '#d8a066', b: '#cf965c', apron: '#b98450', out: '#3b3f46', line: '#ffffff', stripe: 'wood', paint: '#2f5fc4', paint2: '#e7c07c' },
  asphalt: { a: '#4d5056', b: '#4a4d53', apron: '#9aa0a6', out: '#2b2d31', line: '#f2c230', line2: '#f4f4f4', stripe: 'asphalt' },
  dirt:    { a: '#a9733f', b: '#a06b3a', apron: '#8b5d33', out: '#66783c', line: '#f6efe0', stripe: 'dirt', wobble: true },
  sand:    { a: '#e9d08f', b: '#e3c886', apron: '#dcc07c', out: '#e3c886', line: '#2a6fdb', stripe: 'sand', sea: true },
  ice:     { a: '#eaf4fb', b: '#e3eef7', apron: '#eaf4fb', out: '#28313d', line: '#d23b3b', line2: '#2f6fd6', stripe: 'ice' },
  night:   { a: '#2a6a36', b: '#255f31', apron: '#1f5129', out: '#0f1a14', line: '#e8efe6', stripe: 'v' },
  rain:    { a: '#2f7a3f', b: '#2a6f39', apron: '#245f31', out: '#1d3a28', line: '#e9f0ea', stripe: 'v' },
  moon:    { a: '#8d9097', b: '#868990', apron: '#777a81', out: '#07080d', line: '#f2f2f2', stripe: 'moon', stars: true },
  neon:    { a: '#1c1533', b: '#1a1330', apron: '#130e25', out: '#0b0816', line: '#2ef2ff', line2: '#ff4fbf', stripe: 'grid' },
  court:   { a: '#2f7d6d', b: '#2c7667', apron: '#3b4a57', out: '#26313a', line: '#f6f6f2', stripe: 'court', paint: '#2a6aa8' },
  clay:    { a: '#c98a4b', b: '#c28245', apron: '#a9713e', out: '#8c8273', line: '#fff5e6', stripe: 'clay', stone: true },
  garden:  { a: '#4b9d50', b: '#45944a', apron: '#3d8443', out: '#2c5a30', line: '#f3f6ec', stripe: 'h' },
  dry:     { a: '#a3b04f', b: '#99a749', apron: '#8b973f', out: '#6c7434', line: '#fbf8ea', stripe: 'v' },
  wall:    { a: '#9ea5ac', b: '#98a0a7', apron: '#7d848b', out: '#3c3f44', line: '#f2c230', stripe: 'concrete', bricks: true }
};

function seededRand(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  s = s || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function tracePoly(ctx, pts, close) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

/* contorno fechado da área da bola (une as duas correntes passando pelos gols) */
function fieldOutline(st, m) {
  if (m.shape === 'rink') return st.chains[0];
  const [bottom, top] = st.chains;
  return bottom.concat(top);
}

function drawField(ctx, st, m, px, opts) {
  opts = opts || {};
  const S = SURFACES[m.surface] || SURFACES.grass;
  const R = seededRand(m.id);
  const ex = st.ext.x + 260, ey = st.ext.y + 260;
  const W = m.W, H = m.H;
  // entorno
  ctx.fillStyle = S.out;
  ctx.fillRect(-ex, -ey, ex * 2, ey * 2);
  drawSurround(ctx, st, m, S, R, ex, ey, px);
  // área dos jogadores (fora das linhas)
  if (st.playerChain) {
    ctx.fillStyle = S.apron;
    tracePoly(ctx, st.playerChain, true);
    ctx.fill();
    if (m.surface === 'asphalt') {
      ctx.save(); tracePoly(ctx, st.playerChain, true); ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 1.2;
      for (let x = -ex; x < ex; x += 28) { ctx.beginPath(); ctx.moveTo(x, -ey); ctx.lineTo(x, ey); ctx.stroke(); }
      for (let y = -ey; y < ey; y += 28) { ctx.beginPath(); ctx.moveTo(-ex, y); ctx.lineTo(ex, y); ctx.stroke(); }
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 3;
    tracePoly(ctx, st.playerChain, true);
    ctx.stroke();
  }
  // gols (rede) por baixo do gramado nas bordas
  if (m.shape !== 'rink') for (const g of st.goals) drawGoalNet(ctx, g, m, S, st);
  // gramado
  const outline = fieldOutline(st, m);
  ctx.save();
  tracePoly(ctx, outline, true);
  ctx.clip();
  ctx.fillStyle = S.a;
  ctx.fillRect(-ex, -ey, ex * 2, ey * 2);
  drawSurfacePattern(ctx, m, S, R, W, H, px);
  for (const z of st.zones) drawZone(ctx, z, R);
  drawLines(ctx, st, m, S, R, px);
  if (m.shape === 'rink') for (const g of st.goals) drawGoalNet(ctx, g, m, S, st);
  ctx.restore();
  // borda do campo
  if (m.shape === 'rink') {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 12;
    tracePoly(ctx, outline, true); ctx.stroke();
    ctx.strokeStyle = '#f7f3e3'; ctx.lineWidth = 7;
    tracePoly(ctx, outline, true); ctx.stroke();
    ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 2;
    tracePoly(ctx, outline, true); ctx.stroke();
  } else {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = S.line; ctx.lineWidth = 3.2;
    for (const ch of st.chains) { tracePoly(ctx, ch, false); ctx.stroke(); }
  }
  // cercas vivas
  for (const w of st.walls) drawHedge(ctx, w);
  // noite: refletores já "pintados" no gramado (bem mais leve que luz em tempo real)
  if (m.surface === 'night') {
    ctx.save();
    ctx.fillStyle = 'rgba(2,6,18,0.52)';
    ctx.fillRect(-ex, -ey, ex * 2, ey * 2);
    ctx.globalCompositeOperation = 'screen';
    const pools = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sy]) => [sx * W * 0.6, sy * H * 0.52, W * 0.66, 0.34]);
    pools.push([0, 0, W * 0.5, 0.22]);
    for (const [x, y, r, a] of pools) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,248,220,' + a + ')');
      g.addColorStop(0.55, 'rgba(255,248,220,' + (a * 0.45).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,248,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // torres dos refletores
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const x = sx * (W + 40), y = sy * (H + 40);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 40);
      g.addColorStop(0, 'rgba(255,250,225,1)'); g.addColorStop(1, 'rgba(255,250,225,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 40, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  if (m.surface === 'rain') {
    ctx.fillStyle = 'rgba(40,60,90,0.12)';
    ctx.fillRect(-ex, -ey, ex * 2, ey * 2);
  }
}

function drawSurround(ctx, st, m, S, R, ex, ey, px) {
  const pc = st.playerChain;
  const bx = st.ext.x, by = st.ext.y;
  if (S.crowd) {
    // arquibancada com torcida em volta
    ctx.fillStyle = '#5a5f68';
    ctx.fillRect(-ex, -ey, ex * 2, ey * 2);
    ctx.fillStyle = '#4b4f57';
    for (let r = 0; r < 9; r++) {
      const off = 18 + r * 22;
      ctx.fillRect(-bx - off, -by - off, (bx + off) * 2, 3);
      ctx.fillRect(-bx - off, by + off - 3, (bx + off) * 2, 3);
    }
    const cols = ['#e23d28', '#2563c9', '#f7c531', '#ffffff', '#1d1b16', '#e23d28', '#2563c9'];
    for (let i = 0; i < 1400; i++) {
      const side = R();
      let x, y;
      if (side < 0.5) { x = (R() * 2 - 1) * (bx + 200); y = (R() < 0.5 ? -1 : 1) * (by + 14 + R() * 200); }
      else { y = (R() * 2 - 1) * (by + 200); x = (R() < 0.5 ? -1 : 1) * (bx + 14 + R() * 200); }
      // metade da torcida veste a cor do time do lado
      const c = R() < 0.55 ? (x < 0 ? '#e23d28' : '#2563c9') : cols[Math.floor(R() * cols.length)];
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(x, y, 3.2 + R() * 1.2, 0, TAU); ctx.fill();
    }
  } else if (S.sea) {
    ctx.fillStyle = '#e3c886';
    ctx.fillRect(-ex, -ey, ex * 2, ey * 2);
    const sy = by + 26;
    ctx.fillStyle = '#2f9fd0';
    ctx.fillRect(-ex, sy, ex * 2, ey);
    ctx.fillStyle = '#1f86b8';
    ctx.fillRect(-ex, sy + 60, ex * 2, ey);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let x = -ex; x <= ex; x += 20) {
        const y = sy + 6 + k * 22 + Math.sin(x / 40 + k) * 4;
        if (x === -ex) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // guarda-sóis
    for (const x of [-bx - 60, bx + 60]) for (const y of [-by + 40, 0, by - 40]) {
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y, 24, 0, TAU); ctx.fill();
      for (let a = 0; a < 8; a++) {
        ctx.fillStyle = a % 2 ? '#ffffff' : '#e23d28';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 21, a * TAU / 8, (a + 1) * TAU / 8); ctx.closePath(); ctx.fill();
      }
    }
  } else if (S.stars) {
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + R() * 0.7).toFixed(2) + ')';
      const x = (R() * 2 - 1) * ex, y = (R() * 2 - 1) * ey;
      ctx.fillRect(x, y, 1.6 + R() * 1.6, 1.6 + R() * 1.6);
    }
    // a Terra no canto
    const tx = -bx - 120, ty = -by - 100;
    ctx.fillStyle = '#2f7de0'; ctx.beginPath(); ctx.arc(tx, ty, 60, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4caf50';
    ctx.beginPath(); ctx.ellipse(tx - 15, ty - 10, 24, 15, 0.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(tx + 22, ty + 22, 16, 10, -0.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(160,210,255,0.6)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(tx, ty, 63, 0, TAU); ctx.stroke();
  } else if (S.stone) {
    ctx.fillStyle = '#8c8273'; ctx.fillRect(-ex, -ey, ex * 2, ey * 2);
    ctx.strokeStyle = 'rgba(40,30,20,0.35)'; ctx.lineWidth = 2;
    for (let y = -ey; y < ey; y += 34) {
      ctx.beginPath(); ctx.moveTo(-ex, y); ctx.lineTo(ex, y); ctx.stroke();
      const o = (Math.round(y / 34) % 2) * 34;
      for (let x = -ex + o; x < ex; x += 68) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 34); ctx.stroke(); }
    }
  } else if (m.surface === 'neon') {
    ctx.strokeStyle = 'rgba(255,79,191,0.12)'; ctx.lineWidth = 2;
    for (let x = -ex; x < ex; x += 40) { ctx.beginPath(); ctx.moveTo(x, -ey); ctx.lineTo(x, ey); ctx.stroke(); }
    for (let y = -ey; y < ey; y += 40) { ctx.beginPath(); ctx.moveTo(-ex, y); ctx.lineTo(ex, y); ctx.stroke(); }
  } else if (m.surface === 'asphalt') {
    // calçada e prédios
    ctx.fillStyle = '#3a3c41'; ctx.fillRect(-ex, -ey, ex * 2, ey * 2);
    const housec = ['#d9774b', '#f2c230', '#5aa0d8', '#e9e4d4', '#8fc46a', '#e57aa0'];
    for (const sy of [-1, 1]) {
      let x = -ex;
      while (x < ex) {
        const w = 70 + R() * 70;
        ctx.fillStyle = housec[Math.floor(R() * housec.length)];
        const y0 = sy < 0 ? -ey : by + 8;
        const y1 = sy < 0 ? -by - 8 : ey;
        ctx.fillRect(x, y0, w - 6, y1 - y0);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(x, sy < 0 ? y1 - 10 : y0, w - 6, 10);
        x += w;
      }
    }
  } else if (m.surface === 'dirt') {
    ctx.fillStyle = '#66783c'; ctx.fillRect(-ex, -ey, ex * 2, ey * 2);
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = R() < 0.5 ? '#5b6c34' : '#738744';
      ctx.fillRect((R() * 2 - 1) * ex, (R() * 2 - 1) * ey, 6, 3);
    }
  } else if (m.surface === 'ice' || m.surface === 'court' || m.surface === 'wood' || m.surface === 'wall') {
    ctx.fillStyle = S.out; ctx.fillRect(-ex, -ey, ex * 2, ey * 2);
    // assentos ao redor
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let k = 1; k < 8; k++) {
      const o = k * 26;
      ctx.fillRect(-bx - o, -by - o, (bx + o) * 2, 8);
      ctx.fillRect(-bx - o, by + o - 8, (bx + o) * 2, 8);
    }
  } else {
    // grama alta em volta
    for (let i = 0; i < 380; i++) {
      ctx.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect((R() * 2 - 1) * ex, (R() * 2 - 1) * ey, 10, 3);
    }
  }
  if (S.bricks) {
    // muro de tijolos atrás de cada gol
    for (const g of st.goals) {
      const x0 = g.x + g.dir * 4, x1 = g.x + g.dir * (g.depth + 40);
      const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
      ctx.fillStyle = '#b5523b';
      ctx.fillRect(lo, -by - 40, hi - lo, (by + 40) * 2);
      ctx.strokeStyle = 'rgba(255,240,220,0.45)'; ctx.lineWidth = 1.5;
      for (let y = -by - 40; y < by + 40; y += 12) {
        ctx.beginPath(); ctx.moveTo(lo, y); ctx.lineTo(hi, y); ctx.stroke();
        const o = (Math.round(y / 12) % 2) * 12;
        for (let x = lo + o; x < hi; x += 24) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 12); ctx.stroke(); }
      }
    }
  }
}

function drawSurfacePattern(ctx, m, S, R, W, H, px) {
  const ex = W + 80, ey = H + 80;
  switch (S.stripe) {
    case 'v': {
      const n = 14, w = (W * 2) / n;
      ctx.fillStyle = S.b;
      for (let i = 0; i < n; i += 2) ctx.fillRect(-W + i * w, -ey, w, ey * 2);
      break;
    }
    case 'h': {
      const n = 10, h = (H * 2) / n;
      ctx.fillStyle = S.b;
      for (let i = 0; i < n; i += 2) ctx.fillRect(-ex, -H + i * h, ex * 2, h);
      break;
    }
    case 'c': {
      const n = 12, w = (W * 2) / n, h = (H * 2) / 6;
      ctx.fillStyle = S.b;
      for (let i = 0; i < n; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) ctx.fillRect(-W + i * w, -H + j * h, w, h);
      break;
    }
    case 'wood': {
      ctx.strokeStyle = 'rgba(120,70,30,0.35)'; ctx.lineWidth = 1.2;
      for (let y = -ey; y < ey; y += 14) {
        ctx.beginPath(); ctx.moveTo(-ex, y); ctx.lineTo(ex, y); ctx.stroke();
        let x = -ex + R() * 80;
        while (x < ex) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 14); ctx.stroke(); x += 70 + R() * 90; }
      }
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect((R() * 2 - 1) * ex, Math.floor((R() * 2 - 1) * ey / 14) * 14 + 3, 40 + R() * 60, 2);
      }
      break;
    }
    case 'asphalt': {
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.12)';
        ctx.fillRect((R() * 2 - 1) * ex, (R() * 2 - 1) * ey, 2, 2);
      }
      // remendos
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse((R() * 2 - 1) * W * 0.8, (R() * 2 - 1) * H * 0.8, 20 + R() * 30, 12 + R() * 18, R() * 3, 0, TAU); ctx.fill(); }
      break;
    }
    case 'dirt': {
      for (let i = 0; i < 2200; i++) {
        ctx.fillStyle = R() < 0.5 ? 'rgba(255,230,190,0.10)' : 'rgba(60,30,10,0.14)';
        ctx.fillRect((R() * 2 - 1) * ex, (R() * 2 - 1) * ey, 3, 3);
      }
      // tufos de grama nos cantos e pedrinhas
      for (let i = 0; i < 90; i++) {
        let x = (R() * 2 - 1) * W, y = (R() * 2 - 1) * H;
        if (Math.abs(x) < W * 0.7 && Math.abs(y) < H * 0.7) continue;
        ctx.fillStyle = '#6b8f3a';
        for (let k = 0; k < 4; k++) ctx.fillRect(x + (R() - 0.5) * 10, y + (R() - 0.5) * 8, 3, 6);
      }
      // área gasta no meio
      ctx.fillStyle = 'rgba(70,40,15,0.12)';
      ctx.beginPath(); ctx.ellipse(0, 0, W * 0.5, H * 0.45, 0, 0, TAU); ctx.fill();
      break;
    }
    case 'sand': {
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = R() < 0.6 ? 'rgba(160,120,50,0.13)' : 'rgba(255,255,255,0.18)';
        ctx.fillRect((R() * 2 - 1) * ex, (R() * 2 - 1) * ey, 2, 2);
      }
      ctx.strokeStyle = 'rgba(160,120,50,0.18)'; ctx.lineWidth = 2;
      for (let i = 0; i < 26; i++) {
        const cx = (R() * 2 - 1) * W, cy = (R() * 2 - 1) * H, r = 10 + R() * 30;
        ctx.beginPath(); ctx.arc(cx, cy, r, R() * 3, R() * 3 + 1.5); ctx.stroke();
      }
      break;
    }
    case 'ice': {
      ctx.strokeStyle = 'rgba(120,160,190,0.22)'; ctx.lineWidth = 1;
      for (let i = 0; i < 160; i++) {
        const x = (R() * 2 - 1) * W, y = (R() * 2 - 1) * H, a = R() * TAU, l = 20 + R() * 70;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y + Math.sin(a + 0.4) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
      }
      break;
    }
    case 'moon': {
      for (let i = 0; i < 1800; i++) {
        ctx.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.10)';
        ctx.fillRect((R() * 2 - 1) * ex, (R() * 2 - 1) * ey, 2, 2);
      }
      for (let i = 0; i < 22; i++) {
        const x = (R() * 2 - 1) * W, y = (R() * 2 - 1) * H, r = 8 + R() * 26;
        if (Math.hypot(x, y) < m.circle + r) continue;
        ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x, y, r, 3.4, 5.6); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.arc(x, y, r, 0.3, 2.5); ctx.stroke();
      }
      break;
    }
    case 'grid': {
      ctx.strokeStyle = 'rgba(46,242,255,0.07)'; ctx.lineWidth = 1.5;
      for (let x = -ex; x < ex; x += 30) { ctx.beginPath(); ctx.moveTo(x, -ey); ctx.lineTo(x, ey); ctx.stroke(); }
      for (let y = -ey; y < ey; y += 30) { ctx.beginPath(); ctx.moveTo(-ex, y); ctx.lineTo(ex, y); ctx.stroke(); }
      break;
    }
    case 'court': {
      ctx.fillStyle = S.paint;
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(0, 0, m.circle, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 1200; i++) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect((R() * 2 - 1) * ex, (R() * 2 - 1) * ey, 2, 2);
      }
      break;
    }
    case 'clay': {
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = R() < 0.5 ? 'rgba(255,220,180,0.10)' : 'rgba(90,40,10,0.12)';
        ctx.fillRect((R() * 2 - 1) * ex, (R() * 2 - 1) * ey, 2.5, 2.5);
      }
      ctx.strokeStyle = 'rgba(120,60,20,0.15)'; ctx.lineWidth = 3;
      for (let y = -ey; y < ey; y += 26) { ctx.beginPath(); ctx.moveTo(-ex, y + R() * 4); ctx.lineTo(ex, y + R() * 4); ctx.stroke(); }
      break;
    }
    case 'concrete': {
      for (let i = 0; i < 1600; i++) {
        ctx.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        ctx.fillRect((R() * 2 - 1) * ex, (R() * 2 - 1) * ey, 2, 2);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 8; i++) {
        let x = (R() * 2 - 1) * W, y = (R() * 2 - 1) * H;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (R() - 0.5) * 40; y += (R() - 0.5) * 40; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 2;
      for (let x = -W; x < W; x += 95) { ctx.beginPath(); ctx.moveTo(x, -H); ctx.lineTo(x, H); ctx.stroke(); }
      break;
    }
  }
  if (m.surface === 'rain') {
    // brilho molhado
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = 'rgba(200,230,255,0.06)';
      ctx.beginPath(); ctx.ellipse((R() * 2 - 1) * W, (R() * 2 - 1) * H, 20 + R() * 40, 6 + R() * 10, 0, 0, TAU); ctx.fill();
    }
  }
}

function drawZone(ctx, z, R) {
  if (z.kind === 'mud') {
    ctx.fillStyle = '#6d4424';
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const a = i / 18 * TAU, rr = z.r * (0.86 + R() * 0.2);
      const x = z.x + Math.cos(a) * rr, y = z.y + Math.sin(a) * rr * 0.85;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(40,20,5,0.35)';
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(z.x + (R() - 0.5) * z.r, z.y + (R() - 0.5) * z.r * 0.7, 5 + R() * 6, 3 + R() * 3, R() * 3, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.ellipse(z.x - z.r * 0.2, z.y - z.r * 0.25, z.r * 0.35, z.r * 0.12, -0.3, 0, TAU); ctx.fill();
  } else if (z.kind === 'puddle') {
    ctx.fillStyle = 'rgba(120,150,175,0.75)';
    ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.8, 0.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(230,245,255,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(z.x - z.r * 0.15, z.y - z.r * 0.15, z.r * 0.55, z.r * 0.3, 0.3, 3.4, 5.2); ctx.stroke();
  }
}

function drawLines(ctx, st, m, S, R, px) {
  const W = Math.abs(st.gx[1]), H = m.H;
  const lw = 3;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  const wob = S.wobble ? 2.2 : 0;
  const line = (x1, y1, x2, y2) => {
    ctx.beginPath(); ctx.moveTo(x1, y1);
    if (wob) {
      const n = Math.max(2, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 40));
      for (let i = 1; i <= n; i++) { const t = i / n; ctx.lineTo(lerp(x1, x2, t) + (i < n ? (R() - 0.5) * wob : 0), lerp(y1, y2, t) + (i < n ? (R() - 0.5) * wob : 0)); }
    } else ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  if (m.surface === 'ice') {
    const gx = Math.abs(st.gx[1]);
    ctx.strokeStyle = S.line; ctx.lineWidth = 7; line(0, -H, 0, H);
    ctx.strokeStyle = S.line2; ctx.lineWidth = 7; line(-m.W * 0.3, -H, -m.W * 0.3, H); line(m.W * 0.3, -H, m.W * 0.3, H);
    ctx.strokeStyle = S.line; ctx.lineWidth = 3; line(-gx, -H, -gx, H); line(gx, -H, gx, H);
    ctx.strokeStyle = S.line2; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, m.circle, 0, TAU); ctx.stroke();
    ctx.fillStyle = S.line2; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = S.line; ctx.lineWidth = 2.5;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const cx = sx * m.W * 0.58, cy = sy * H * 0.48;
      ctx.beginPath(); ctx.arc(cx, cy, 44, 0, TAU); ctx.stroke();
      ctx.fillStyle = S.line; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU); ctx.fill();
    }
    for (const g of st.goals) {
      ctx.fillStyle = 'rgba(80,150,230,0.35)';
      ctx.beginPath(); ctx.arc(g.x, 0, g.half + 18, g.dir < 0 ? -Math.PI / 2 : Math.PI / 2, g.dir < 0 ? Math.PI / 2 : Math.PI * 1.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = S.line; ctx.lineWidth = 2.5; ctx.stroke();
    }
    return;
  }
  const lc = S.line;
  ctx.strokeStyle = lc;
  if (m.surface === 'neon') { ctx.shadowColor = lc; ctx.shadowBlur = 10; }
  // linha do meio
  line(0, -H - 20, 0, H + 20);
  // círculo central
  if (m.surface === 'neon') ctx.strokeStyle = S.line2;
  if (m.surface === 'wood') {
    ctx.fillStyle = S.paint; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(0, 0, m.circle, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.beginPath(); ctx.arc(0, 0, m.circle, 0, TAU); ctx.stroke();
  ctx.strokeStyle = lc;
  ctx.fillStyle = lc;
  ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
  for (const g of st.goals) {
    const dir = g.dir, gx = g.x, half = m.goal;
    const into = -dir;
    if (m.surface === 'wood') {
      // área em "D" da quadra
      const Rr = Math.min(96, W * 0.3);
      ctx.fillStyle = S.paint2;
      ctx.beginPath();
      ctx.moveTo(gx, -half - Rr);
      ctx.arc(gx, -half, Rr, dir < 0 ? -Math.PI / 2 : -Math.PI / 2, dir < 0 ? 0 : -Math.PI, dir > 0);
      ctx.lineTo(gx + into * Rr, half);
      ctx.arc(gx, half, Rr, dir < 0 ? 0 : Math.PI, Math.PI / 2, dir > 0);
      ctx.closePath();
      ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.beginPath(); ctx.arc(gx + into * Rr * 1.0, 0, 3.5, 0, TAU); ctx.fill();
      continue;
    }
    const pbx = Math.min(150, W * 0.3), pby = Math.min(half + 76, H - 14);
    const gbx = Math.min(46, pbx * 0.4), gby = Math.min(half + 22, H - 20);
    ctx.beginPath();
    ctx.moveTo(gx, -pby); ctx.lineTo(gx + into * pbx, -pby); ctx.lineTo(gx + into * pbx, pby); ctx.lineTo(gx, pby);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx, -gby); ctx.lineTo(gx + into * gbx, -gby); ctx.lineTo(gx + into * gbx, gby); ctx.lineTo(gx, gby);
    ctx.stroke();
    const spx = gx + into * pbx * 0.72;
    ctx.beginPath(); ctx.arc(spx, 0, 3.5, 0, TAU); ctx.fill();
    // meia-lua
    const rr = pbx * 0.42;
    const cosA = clamp((pbx * 0.28) / rr, -1, 1);
    const a = Math.acos(cosA);
    ctx.beginPath();
    if (into > 0) ctx.arc(spx, 0, rr, -a, a);
    else ctx.arc(spx, 0, rr, Math.PI - a, Math.PI + a);
    ctx.stroke();
    // linha do gol na rua (faixa pintada)
    if (m.surface === 'asphalt') {
      ctx.save(); ctx.strokeStyle = S.line2; ctx.setLineDash([10, 10]); line(gx + into * pbx, -H, gx + into * pbx, H); ctx.restore();
    }
  }
  ctx.shadowBlur = 0;
}

function drawGoalNet(ctx, g, m, S, st) {
  const pts = g.net;
  const style = m.netStyle || 'net';
  ctx.save();
  tracePoly(ctx, pts, true);
  if (style === 'garage') {
    ctx.fillStyle = '#8e959c'; ctx.fill();
    ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    for (let y = -g.half; y < g.half; y += 7) { ctx.beginPath(); ctx.moveTo(g.x - 80, y); ctx.lineTo(g.x + 80, y); ctx.stroke(); }
  } else if (style === 'hole') {
    ctx.fillStyle = '#1b1712'; ctx.fill();
  } else {
    ctx.fillStyle = m.surface === 'neon' ? 'rgba(46,242,255,0.10)' : 'rgba(255,255,255,0.16)';
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = m.surface === 'neon' ? 'rgba(46,242,255,0.5)' : 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.1;
    for (let k = -200; k < 200; k += 9) {
      ctx.beginPath(); ctx.moveTo(g.x + k, -g.half - 10); ctx.lineTo(g.x + k + 60, g.half + 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(g.x + k, -g.half - 10); ctx.lineTo(g.x + k - 60, g.half + 50); ctx.stroke();
    }
  }
  ctx.restore();
  ctx.strokeStyle = style === 'hole' ? '#5c4635' : (m.surface === 'neon' ? '#2ef2ff' : '#f6f6f0');
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  tracePoly(ctx, pts, false);
  ctx.stroke();
}

function drawHedge(ctx, w) {
  const th = w.th;
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = th * 2 + 4;
  ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
  ctx.strokeStyle = '#2e6b2f'; ctx.lineWidth = th * 2;
  ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
  ctx.fillStyle = '#3f8a3d';
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = lerp(w.x1, w.x2, t), y = lerp(w.y1, w.y2, t);
    ctx.beginPath(); ctx.arc(x + (i % 2 ? 2 : -2), y - 3, th * 0.6, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#f2f2f2';
  for (let i = 0; i < 4; i++) { const t = (i + 0.5) / 4; ctx.beginPath(); ctx.arc(lerp(w.x1, w.x2, t), lerp(w.y1, w.y2, t) + (i % 2 ? 4 : -5), 1.8, 0, TAU); ctx.fill(); }
}

/* miniatura de um mapa (cardápio) */
function renderMapThumb(canvas, m) {
  const st = buildStadium(m);
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const ex = st.ext.x + 10, ey = st.ext.y + 10;
  const sc = Math.min(w / (ex * 2), h / (ey * 2));
  ctx.save();
  ctx.fillStyle = (SURFACES[m.surface] || SURFACES.grass).out;
  ctx.fillRect(0, 0, w, h);
  ctx.translate(w / 2, h / 2);
  ctx.scale(sc, sc);
  drawField(ctx, st, m, 1 / sc);
  drawStatics(ctx, st.statics, m, 0);
  ctx.restore();
}

function drawStatics(ctx, statics, m, tick) {
  for (const s of statics) {
    const st = s.style;
    if (st === 'trave' || st === 'chinelo' || st === 'bambu') {
      if (st === 'chinelo') {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(0.5);
        ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(0, 0, s.r + 4, s.r + 1, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2f9e44'; ctx.beginPath(); ctx.ellipse(0, 0, s.r + 2, s.r - 1, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#f7c531'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(4, -4); ctx.moveTo(-2, 0); ctx.lineTo(4, 4); ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 1.5, 0, TAU); ctx.fill();
        ctx.fillStyle = st === 'bambu' ? '#d8b25a' : (m.surface === 'neon' ? '#2ef2ff' : '#ffffff');
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r - 0.5, 0, TAU); ctx.fill();
      }
    } else if (st === 'bumper') {
      const f = s.flash || 0;
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 3, 0, TAU); ctx.fill();
      ctx.fillStyle = f > 0 ? '#fff6a8' : '#ff4fbf';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
      ctx.fillStyle = f > 0 ? '#ffffff' : '#2ef2ff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.55, 0, TAU); ctx.fill();
      if (f > 0) {
        ctx.strokeStyle = 'rgba(255,246,168,' + (f / 12).toFixed(2) + ')'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 6 + (12 - f), 0, TAU); ctx.stroke();
      }
    } else if (st === 'vaso') {
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c4683c'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r - 4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3f8a3d';
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.beginPath(); ctx.ellipse(s.x + Math.cos(a) * 7, s.y + Math.sin(a) * 7, 7, 4, a, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#f7c531'; ctx.beginPath(); ctx.arc(s.x, s.y, 3.5, 0, TAU); ctx.fill();
    } else {
      // poste
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(s.x + 5, s.y + 6, s.r + 2, s.r, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c9ced4'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f7c531'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.45, 0, TAU); ctx.fill();
    }
  }
}

/* ---- 05-ai.js ---- */
'use strict';
/* ===== Inteligência dos bots ===== */

function aiVmax(m) {
  const P = m.P;
  if (P.andar === 'direto') return P.moveMax > 0 ? P.moveMax : P.accel / (1 - P.playerDamp);   // (Oficina de estádios)
  return P.accel * P.playerDamp / (1 - P.playerDamp);
}

/* tempo (em ticks) para alcançar a bola principal seguindo a trajetória prevista */
function aiIntercept(m, p, maxT) {
  maxT = maxT || 90;
  const d = p.disc, path = m.ballPath;
  const vmax = m.vmax, acc = m.P.andar === 'direto' ? vmax * (m.P.moveAccel > 0 ? Math.min(1, m.P.moveAccel) : 1) : m.P.accel;
  const reach = d.r + m.P.ballR + 2;
  if (!path.length) return { t: 999, x: 0, y: 0, z: 0 };
  for (let t = 0; t <= maxT; t += 2) {
    const bp = path[t];
    if (bp.z > PHYS.HEAD_REACH - 4) continue;
    const dx = bp.x - d.x, dy = bp.y - d.y;
    const full = Math.hypot(dx, dy);
    const dist = full - reach;
    if (dist <= 0) return { t, x: bp.x, y: bp.y, z: bp.z };
    const vt = (dx * d.vx + dy * d.vy) / (full || 1);
    const need = dist / vmax + Math.max(0, (vmax - vt) / acc) * 0.45;
    if (need <= t) return { t, x: bp.x, y: bp.y, z: bp.z };
  }
  const bp = path[maxT];
  return { t: maxT + Math.hypot(bp.x - d.x, bp.y - d.y) / vmax, x: bp.x, y: bp.y, z: bp.z };
}

function aiAssignRoles(m) {
  m.vmax = aiVmax(m) * (m.runMode === 'sempre' ? m.P.sprint : 1);
  const best = [1e9, 1e9];
  for (const p of m.players) {
    p.icpt = aiIntercept(m, p);
    let t = p.icpt.t;
    if (p.fx.frozen > 0) t += p.fx.frozen;
    p.icptT = t;
    if (t < best[p.team]) best[p.team] = t;
  }
  m.poss = Math.abs(best[0] - best[1]) < 5 ? -1 : (best[0] < best[1] ? 0 : 1);
  m.bestT = best;
  for (let team = 0; team < 2; team++) {
    const list = m.players.filter(p => p.team === team);
    const n = list.length;
    const g = m.stadium.goals[team];
    let keeper = null;
    if (n >= 3) {
      const bots = list.filter(p => p.bot && !p.keeperOnly);
      let cur = bots.find(p => p.role === 'keeper');
      let bestK = null, bd = 1e9;
      for (const p of bots) {
        const dd = Math.hypot(p.disc.x - g.x, p.disc.y);
        if (dd < bd) { bd = dd; bestK = p; }
      }
      if (cur && bestK && cur !== bestK) {
        const dc = Math.hypot(cur.disc.x - g.x, cur.disc.y);
        if (dc - bd < 90) bestK = cur;
      }
      keeper = bestK;
    }
    let chaser = null, ct = 1e9;
    for (const p of list) {
      if (p === keeper || p.keeperOnly) continue;
      let t = p.icptT - (p.role === 'chaser' ? 6 : 0);
      if (t < ct) { ct = t; chaser = p; }
    }
    let k = 0;
    const others = list.filter(p => p !== keeper && p !== chaser && !p.keeperOnly)
      .sort((a, b) => a.disc.y - b.disc.y);
    for (const p of list) p.role = 'support';
    if (keeper) keeper.role = 'keeper';
    if (chaser) chaser.role = 'chaser';
    for (const p of others) {
      p.role = (n === 2) ? 'back' : 'support';
      p.supIdx = k++;
    }
    for (const p of list) if (p.keeperOnly) p.role = 'keeper';
  }
}

function aiSteer(m, p, tx, ty, speedMul, sprint, arriveR) {
  const d = p.disc, inp = p.input;
  const sp = (sprint && (m.runMode || 'folego') === 'folego') ? m.P.sprint : 1;
  const vmax = m.vmax * sp;
  const dx = tx - d.x, dy = ty - d.y;
  const dist = Math.hypot(dx, dy);
  arriveR = arriveR || 24;
  const want = dist > 0.5 ? Math.min(1, dist / arriveR) : 0;
  if (m.P.andar === 'direto') {   // (Oficina de estádios: no andar do RACHA o comando é a velocidade que se quer)
    const s = want * speedMul;
    inp.mx = dist > 0.5 ? dx / dist * s : 0; inp.my = dist > 0.5 ? dy / dist * s : 0;
    inp.sprint = !!sprint && dist > 50;
    return;
  }
  const dvx = (dist > 0 ? dx / dist : 0) * want * vmax - d.vx;
  const dvy = (dist > 0 ? dy / dist : 0) * want * vmax - d.vy;
  const mag = Math.hypot(dvx, dvy);
  if (mag < 0.03) { inp.mx = 0; inp.my = 0; }
  else {
    const s = Math.min(1, mag / (m.P.accel * 1.2)) * speedMul;
    inp.mx = dvx / mag * s; inp.my = dvy / mag * s;
  }
  inp.sprint = !!sprint && dist > 50;
}

function aiPredict(m, b, t) {
  t = Math.max(0, Math.min(90, Math.round(t)));
  if (b === m.ball && m.ballPath[t]) return m.ballPath[t];
  const P = m.P, dmp = P.ballDamp;
  const f = (1 - Math.pow(dmp, t)) / (1 - dmp);
  return { x: b.x + b.vx * f, y: b.y + b.vy * f, z: 0 };
}

/* normal para dentro da tabela (só no rinque, onde a tabela também segura os jogadores) */
function aiWallNormal(m, x, y) {
  if (m.map.shape !== 'rink') return null;
  const W = m.map.W, H = m.map.H, c = m.map.corner;
  const ax = Math.abs(x), ay = Math.abs(y);
  if (ax <= W - c) return { nx: 0, ny: -sign(y), dist: H - ay };
  if (ay <= H - c) return { nx: -sign(x), ny: 0, dist: W - ax };
  const cx = sign(x) * (W - c), cy = sign(y) * (H - c);
  const n = norm(cx - x, cy - y);
  return { nx: n.x, ny: n.y, dist: c - Math.hypot(x - cx, y - cy) };
}

function aiNearestBall(m, p) {
  let best = m.ball, bd = 1e9;
  for (const b of m.balls) {
    if (b.scored) continue;
    const dd = Math.hypot(b.x - p.disc.x, b.y - p.disc.y) * (b.extra ? 1.15 : 1);
    if (dd < bd) { bd = dd; best = b; }
  }
  return best;
}

function aiOppKeeper(m, team) {
  const g = m.stadium.goals[1 - team];
  let best = null, bd = 1e9;
  for (const q of m.players) {
    if (q.team === team) continue;
    const dd = Math.hypot(q.disc.x - g.x, q.disc.y);
    if (dd < bd) { bd = dd; best = q; }
  }
  return best && bd < 180 ? best : null;
}

function aiLaneClear(m, team, ax, ay, bx, by, pad) {
  for (const q of m.players) {
    if (q.team === team) continue;
    if (segDist(q.disc.x, q.disc.y, ax, ay, bx, by) < pad) return false;
  }
  return true;
}

/* o bot decide de tempos em tempos se vai de super chute (e mantém a ideia enquanto está carregando) */
function aiWantsSuper(m, p) {
  const bot = p.bot;
  if (!bot || !m.allowSuper) return false;
  if (p.superHeld) return true;
  if (bot.supRollT === undefined || m.tick - bot.supRollT > 90) { bot.supRollT = m.tick; bot.supRoll = Math.random() < m.diff.super; }
  return bot.supRoll;
}

/* decide para onde mandar a bola; quem já está carregando o super chute aproveita a carga no próximo chute */
function aiPlanBall(m, p, b) {
  const plan = aiPlanBallRaw(m, p, b);
  if (p.superHeld && plan.kick && !plan.superC && !plan.lob) plan.superC = clamp(Math.max(p.superCharge, 0.3), 0.3, 0.8);
  return plan;
}
function aiPlanBallRaw(m, p, b) {
  const D = m.diff, t = p.team, atk = t === 0 ? 1 : -1;
  const oppG = m.stadium.goals[1 - t], ownG = m.stadium.goals[t];
  const half = m.goalHalf[1 - t];
  const W = Math.abs(m.stadium.gx[1]), H = m.map.H;
  const I = (b === m.ball && p.icpt) ? p.icpt : { x: b.x, y: b.y };
  const plan = { ball: b, T: { x: oppG.x, y: 0 }, kick: false, lob: false, curve: 0, sprint: Math.random() < D.sprint, kind: 'drible' };
  const toGoal = Math.hypot(oppG.x - I.x, I.y);
  const inFront = (I.x - oppG.x) * oppG.dir < -8;
  const advanced = I.x * atk > W * 0.12 || toGoal < W * 0.75;
  // ângulo muito fechado perto da linha de fundo: melhor cruzar/rolar
  const tight = Math.abs(I.y) > half + 40 && Math.abs(I.x - oppG.x) < 70;
  let nearOpp = 1e9;
  for (const o of m.players) if (o.team !== t) nearOpp = Math.min(nearOpp, Math.hypot(o.disc.x - I.x, o.disc.y - I.y));
  // chute de força fixa: um pouco mais de perto; de primeira, com a bola já indo para o gol, vale de mais longe
  let shootR = D.shoot * 0.9;
  const vToGoal = (b.vx * (oppG.x - b.x) + b.vy * (0 - b.y)) / (toGoal || 1);
  if (vToGoal > 1) shootR += vToGoal * 30;
  if (toGoal < shootR && inFront && advanced && !tight) {
    const kp = aiOppKeeper(m, t);
    let aimY;
    if (kp && Math.abs(kp.disc.x - oppG.x) < 110) {
      const s = kp.disc.y > 0 ? -1 : 1;
      aimY = s * half * rand(0.5, 0.8);
    } else aimY = rand(-0.5, 0.5) * half;
    let T = { x: oppG.x + oppG.dir * 14, y: aimY };
    let ang = Math.atan2(T.y - I.y, T.x - I.x) + gauss() * D.aim;
    const L = Math.hypot(T.x - I.x, T.y - I.y);
    plan.kind = 'chute';
    plan.kick = true;
    // de longe, às vezes carrega o super chute (mais forte quanto mais longe)
    // a carga depende do tempo que sobra antes de o adversário chegar (sem tempo, só uma carga rápida)
    const adv = (m.bestT ? m.bestT[1 - t] : 99) - (p.icptT || 0);
    if ((toGoal > 170 || p.superHeld) && aiWantsSuper(m, p)) {
      plan.superC = clamp(Math.min((toGoal - 110) / 240, p.superHeld ? 1 : 0.35 + Math.max(0, adv) / SUPER.TICKS), 0.3, 1);
    }
    if (m.allowLob !== false && kp && Math.abs(kp.disc.x - oppG.x) > 70 && toGoal > 150 && Math.random() < D.lob * 4) {
      plan.lob = true;   // cavadinha por cima do goleiro adiantado
      plan.superC = 0;
    } else if (m.allowCurve !== false && Math.random() < D.curve) {
      // curva: mira para fora e deixa a bola entortar de volta
      plan.curve = Math.random() < 0.5 ? -1 : 1;
      ang -= plan.curve * (KICK_CURVE * (1 + 0.6 * (plan.superC || 0)) / (1 - 0.97)) * 0.42 * (plan.superC ? 0.7 : 1);
    }
    plan.T = { x: I.x + Math.cos(ang) * L, y: I.y + Math.sin(ang) * L };
    return plan;
  }
  // passe (com marcação em cima, procura mais o companheiro)
  if (Math.random() < (nearOpp < 110 ? Math.min(0.9, D.pass * 2.2) : D.pass)) {
    let bestQ = null, bs = -1e9;
    for (const q of m.players) {
      if (q.team !== t || q === p || q.role === 'keeper' || q.fx.frozen > 0) continue;
      const qx = q.disc.x + q.disc.vx * 12, qy = q.disc.y + q.disc.vy * 12;
      const dd = Math.hypot(qx - I.x, qy - I.y);
      if (dd < 80 || dd > 480) continue;
      const progress = (qx - I.x) * atk;
      if (progress < 20) continue;
      if (!aiLaneClear(m, t, I.x, I.y, qx, qy, 26)) continue;
      let openness = 1e9;
      for (const o of m.players) if (o.team !== t) openness = Math.min(openness, Math.hypot(o.disc.x - qx, o.disc.y - qy));
      const sc = progress + Math.min(openness, 160) * 0.8 + (q.human ? 40 : 0);
      if (sc > bs) { bs = sc; bestQ = { q, x: qx + atk * 18, y: qy }; }
    }
    if (bestQ && bs > 120) {
      plan.kind = 'passe';
      plan.kick = true;
      const dd = Math.hypot(bestQ.x - I.x, bestQ.y - I.y);
      const ang = Math.atan2(bestQ.y - I.y, bestQ.x - I.x) + gauss() * D.aim * 0.6;
      plan.T = { x: I.x + Math.cos(ang) * dd, y: I.y + Math.sin(ang) * dd };
      return plan;
    }
  }
  // afastar quando pressionado perto do próprio gol
  const fromOwn = Math.abs(I.x - ownG.x);
  if (fromOwn < 220 && nearOpp < 95) {
    plan.kind = 'afastar';
    plan.kick = true;
    plan.T = { x: I.x + atk * 320, y: (I.y >= 0 ? 1 : -1) * H * 0.7 };
    return plan;
  }
  // conduzir em direção ao gol, desviando de quem estiver na frente
  let tx = I.x + atk * 130, ty = I.y * 0.65;
  for (const o of m.players) {
    if (o.team === t) continue;
    const ox = o.disc.x - I.x, oy = o.disc.y - I.y;
    if (ox * atk > 0 && ox * atk < 110 && Math.abs(oy) < 60) {
      ty += (oy > 0 ? -1 : 1) * 70;
    }
  }
  ty = clamp(ty, -H + 30, H - 30);
  plan.T = { x: tx, y: ty };
  // com alguém encostado, toca para a frente em vez de ficar só empurrando
  if (nearOpp < 85) { plan.kind = 'toque'; plan.kick = true; }
  return plan;
}

/* velocidade da bola logo depois de um chute agora (do centro do jogador para o centro da bola) */
function aiKickVel(m, p, b, force) {
  const d = p.disc;
  const n = norm(b.x - d.x, b.y - d.y);
  let nx = n.x, ny = n.y;
  if (n.d === 0) { nx = p.team === 0 ? 1 : -1; ny = 0; }
  const f = (force || m.P.kickForce) * b.im;
  return { vx: b.vx + nx * f, vy: b.vy + ny * f };
}

/* a bola com essa velocidade chega no gol do time "team"? */
function aiOwnGoalRisk(m, team, x, y, vx, vy) {
  const g = m.stadium.goals[team];
  if ((g.x - x) * vx <= 0) return false;
  const yg = y + vy * (g.x - x) / vx;
  if (Math.abs(yg) > m.goalHalf[team] + 20) return false;
  const reach = Math.hypot(vx, vy) / (1 - m.P.ballDamp);
  return Math.hypot(g.x - x, yg - y) < reach;
}

function aiKickSafe(m, p, b, force) {
  if (m.mode === 'penalty') return true;
  const v = aiKickVel(m, p, b, force);
  return !aiOwnGoalRisk(m, p.team, b.x, b.y, v.vx, v.vy);
}

function aiExecuteBall(m, p, plan) {
  const d = p.disc, b = plan.ball, D = m.diff, inp = p.input;
  const pr = d.r, br = b.r;
  const W = Math.abs(m.stadium.gx[1]), H = m.map.H;
  const dist0 = Math.hypot(b.x - d.x, b.y - d.y);
  const tEst = clamp(dist0 / (m.vmax * 0.9), 0, 45) * D.predict;
  const I = aiPredict(m, b, tEst);
  // bola alta: espera no ponto de queda
  if (I.z > PHYS.PLAYER_H && b.z > PHYS.HEAD_REACH) {
    let land = null;
    if (b === m.ball) for (let t = 0; t < 90; t++) { const q = m.ballPath[t]; if (q.z <= PHYS.PLAYER_H) { land = q; break; } }
    land = land || I;
    aiSteer(m, p, land.x - (plan.T.x - land.x) * 0.0, land.y, D.speed, plan.sprint, 18);
    if (p.kickHeld && Math.hypot(b.x - d.x, b.y - d.y) > 60) { inp.kick = false; inp.cancel = true; }
    return;
  }
  let Dk = norm(plan.T.x - I.x, plan.T.y - I.y);
  // bola colada na tabela do rinque: só dá para tirar tabelando
  const wn = aiWallNormal(m, I.x, I.y);
  if (wn && wn.dist < br + 8) {
    const dn = Dk.x * wn.nx + Dk.y * wn.ny;
    if (dn > -0.35) {
      let gx = Dk.x - dn * wn.nx, gy = Dk.y - dn * wn.ny;
      let gl = Math.hypot(gx, gy);
      if (gl < 0.2) {
        gx = -wn.ny; gy = wn.nx;
        const oppX = m.stadium.goals[1 - p.team].x;
        if ((oppX - I.x) * gx < 0) { gx = -gx; gy = -gy; }
        gl = 1;
      }
      Dk = norm(gx / gl * 0.9 - wn.nx * 0.45, gy / gl * 0.9 - wn.ny * 0.45);
    }
  }
  // o chute sai do centro do jogador para o centro da bola e soma com a velocidade que ela já tem:
  // o bot se posiciona atrás da bola na direção do toque que faz ela sair para o alvo
  const superC = m.allowSuper && plan.superC ? plan.superC : 0;
  // só começa a carregar quando a bola vai ser dele (não vale carregar disputando)
  const canStart = (m.bestT ? m.bestT[1 - p.team] : 99) - (p.icptT || 0) > -4;
  if (plan.kick) {
    const f = (superC ? lerp(SUPER.MIN, SUPER.MAX, Math.pow(superC, 0.9)) : m.P.kickForce) * b.im * (plan.lob ? KICK_LOB.power : 1);
    const dv = Dk.x * b.vx + Dk.y * b.vy, v2 = b.vx * b.vx + b.vy * b.vy;
    const disc = dv * dv - v2 + f * f;
    if (disc > 0) { const s = dv + Math.sqrt(disc); const r = norm(Dk.x * s - b.vx, Dk.y * s - b.vy); if (r.d > 0) Dk = r; }
  }
  const toB = norm(b.x - d.x, b.y - d.y);
  const align = toB.x * Dk.x + toB.y * Dk.y;
  const gap = toB.d - pr - br;
  let tx, ty, pace = 1;
  const limX = (m.map.shape === 'rink' ? W + 60 : W + Math.max(m.map.margin, m.map.depth) - pr);
  const limY = H + (m.map.shape === 'rink' ? -pr : m.map.margin - pr);
  inp.aimX = 0; inp.aimY = 0;
  // tolerância de alinhamento (o lado da bola em que o jogador encosta decide a direção)
  const tol = plan.kind === 'penalti' ? 0.07 : plan.kind === 'chute' ? 0.27 : plan.kind === 'passe' ? 0.32 : 0.6;
  const approach = plan.kick ? Math.cos(Math.min(0.5, tol * 1.6 + 0.05)) : 0.8;
  if (gap < 30 && align > approach && b.z < PHYS.PLAYER_H) {
    tx = b.x + Dk.x * 40; ty = b.y + Dk.y * 40;
    // puxa para a linha do chute antes de encostar, para o contato sair alinhado
    const lat = (d.x - b.x) * -Dk.y + (d.y - b.y) * Dk.x;
    tx -= -Dk.y * lat * 1.2; ty -= Dk.x * lat * 1.2;
    if (plan.kick) {
      // só aperta com a bola no alcance (ou entrando nele) e o contato alinhado; o chute sai na hora
      const relx = b.vx - d.vx, rely = b.vy - d.vy;
      const closing = Math.max(0, -(relx * toB.x + rely * toB.y));
      const cool = p.lastKickT !== undefined && m.tick - p.lastKickT < 12;
      const reach = m.kickReach || KICK.REACH;
      const ok = !cool && align > Math.cos(tol) && gap < reach - 0.3 + closing;
      if (superC) {
        // super chute: segura até carregar o que quer e solta com a bola no pé e o contato alinhado
        inp.kick = false;
        let press = 1e9;
        for (const o of m.players) if (o.team !== p.team) press = Math.min(press, Math.hypot(o.disc.x - b.x, o.disc.y - b.y));
        const ready = p.superCharge >= superC * 0.95 || (p.superCharge > 0.25 && press < 45);
        if (!p.superHeld) inp.superKick = !cool && canStart && !(p.superBuf > 0);
        else inp.superKick = !(ready && ok && aiKickSafe(m, p, b, lerp(SUPER.MIN, SUPER.MAX, Math.pow(p.superCharge, 0.9))));
        if (p.superHeld && !ready && gap < 16) pace = 0.45;   // chega devagar enquanto carrega
        if (plan.kind === 'penalti' && !ready) {
          // no pênalti, encostar já conta como cobrança: espera atrás da bola até a carga ficar pronta
          tx = b.x - Dk.x * (pr + br + 8); ty = b.y - Dk.y * (pr + br + 8); pace = 0.5;
        }
      } else inp.kick = ok && aiKickSafe(m, p, b);
      // pênalti: bola parada, então chega devagar e acerta o lado antes de encostar
      if (plan.kind === 'penalti' && gap < 12 && align < Math.cos(tol)) pace = Math.min(pace, 0.25);
    } else if (p.kickHeld) { inp.kick = false; inp.cancel = true; }
  } else {
    // contorna a bola numa órbita até ficar atrás dela
    const R = pr + br + 14;
    const ax = I.x - Dk.x * (pr + br + 3), ay = I.y - Dk.y * (pr + br + 3);
    const angP = Math.atan2(d.y - I.y, d.x - I.x);
    const angT = Math.atan2(-Dk.y, -Dk.x);
    let da = angNorm(angT - angP);
    const bot = p.bot;
    if (Math.abs(da) > 2.6 && bot) { if (!bot.odir) bot.odir = da >= 0 ? 1 : -1; da = bot.odir * Math.abs(da); }
    else if (bot) bot.odir = 0;
    const distI = Math.hypot(d.x - I.x, d.y - I.y);
    if (Math.abs(da) < 0.6) { tx = ax; ty = ay; }
    else if (distI > R * 2.6) {
      if (Math.abs(da) > 1.2) {
        const a = angP + clamp(da, -1.2, 1.2);
        tx = I.x + Math.cos(a) * R * 1.4; ty = I.y + Math.sin(a) * R * 1.4;
      } else { tx = ax; ty = ay; }
    } else {
      const a = angP + clamp(da, -0.85, 0.85);
      tx = I.x + Math.cos(a) * R; ty = I.y + Math.sin(a) * R;
    }
    tx = clamp(tx, -limX, limX); ty = clamp(ty, -limY, limY);
    if (p.kickHeld && gap > 26) { inp.kick = false; inp.cancel = true; }
    // vai carregando o super chute no caminho
    if (superC && gap < 70 && (p.superHeld || (canStart && !(p.superBuf > 0)))) inp.superKick = true;
  }
  if (p.superHeld && gap > 90) inp.superCancel = true;
  // carga cheia há tempo demais sem conseguir chutar: desiste e segue com o chute normal
  if (p.bot) {
    if (p.superHeld && p.superCharge >= 1) { p.bot.supFull = (p.bot.supFull || 0) + 1; if (p.bot.supFull > 60) { inp.superCancel = true; plan.superC = 0; p.bot.supFull = 0; } }
    else p.bot.supFull = 0;
  }
  aiSteer(m, p, tx, ty, D.speed * pace, plan.sprint && dist0 > 120 && pace === 1, 10);
  if (gap < 20) { inp.aimX = Dk.x; inp.aimY = Dk.y; }
  if (plan.lob && gap < 40 && !p.lobArm) inp.lob = true;
  if (plan.curve && gap < 40 && p.curveArm !== plan.curve) { if (plan.curve < 0) inp.curveL = true; else inp.curveR = true; }
  if (!plan.lob && p.lobArm && gap < 30) inp.lob = true;
}

function aiChase(m, p) {
  const bot = p.bot, d = p.disc, D = m.diff;
  const b = aiNearestBall(m, p);
  if (!b) return;
  bot.t--;
  if (bot.t <= 0 || !bot.plan || bot.plan.ball !== b) {
    bot.t = D.react + randi(0, 3);
    bot.plan = aiPlanBall(m, p, b);
  }
  // preso contra a parede junto da bola
  const sp = Math.hypot(b.vx, b.vy);
  const gap = Math.hypot(b.x - d.x, b.y - d.y) - d.r - b.r;
  if (sp < 0.4 && gap < 8) bot.stuck++; else bot.stuck = Math.max(0, bot.stuck - 2);
  if (bot.stuck > 70) {
    const tb = norm(b.x - d.x, b.y - d.y);
    // chute de lado, ao longo da parede, para o lado do ataque; se repetir, dá um passo atrás
    let tx = -tb.y, ty = tb.x;
    if (tx * (p.team === 0 ? 1 : -1) < 0) { tx = -tx; ty = -ty; }
    bot.plan = { ball: b, T: { x: b.x + tx * 120, y: b.y + ty * 120 }, kick: true, lob: false, curve: 0, sprint: false, kind: 'soltar' };
    bot.backoff = (bot.lastStuck !== undefined && m.tick - bot.lastStuck < 300) ? 36 : 0;
    bot.lastStuck = m.tick;
    bot.t = 30;
    bot.stuck = 0;
  }
  if (bot.backoff > 0) {
    bot.backoff--;
    const tb = norm(b.x - d.x, b.y - d.y);
    aiSteer(m, p, d.x - tb.x * 60, d.y - tb.y * 60, D.speed, false, 10);
    p.input.kick = false; if (p.kickHeld) p.input.cancel = true;
    if (p.superHeld) p.input.superCancel = true;
    return;
  }
  aiExecuteBall(m, p, bot.plan);
}

function aiKeeper(m, p) {
  const d = p.disc, t = p.team, g = m.stadium.goals[t], out = -g.dir, D = m.diff, inp = p.input, bot = p.bot;
  const b = m.ball;
  const half = m.goalHalf[t];
  const path = m.ballPath;
  bot.kt = (bot.kt || 0) - 1;
  const gxp = g.x + out * (d.r + 3);
  if (bot.kt <= 0 || !bot.ktx) {
    bot.kt = Math.max(1, Math.round(D.keeperReact * 0.6));
    let cross = null;
    for (let i = 1; i <= 70; i++) {
      const q = path[i];
      if (!q) break;
      if ((q.x - g.x) * g.dir >= -(d.r + 2)) { if (Math.abs(q.y) < half + 26 && q.z < PHYS.CROSSBAR + 6) cross = { t: i, y: q.y }; break; }
    }
    const sp = Math.hypot(b.vx, b.vy);
    if (cross && cross.t < 60 && sp > 1.2 && b.vx * g.dir > 0) {
      bot.ktx = gxp; bot.kty = clamp(cross.y + gauss() * D.aim * 20, -half + 3, half - 3); bot.urgent = true;
    } else {
      const vx = b.x - g.x, vy = b.y;
      const L = Math.hypot(vx, vy) || 1;
      const kd = clamp(L * 0.26, d.r + 4, 72);
      let tx = g.x + vx / L * kd, ty = vy / L * kd;
      ty = clamp(ty, -(half + 8), half + 8);
      if ((tx - g.x) * out < d.r + 2) tx = gxp;
      bot.ktx = tx; bot.kty = ty; bot.urgent = false;
    }
  }
  // sair do gol para afastar quando ganha a disputa
  const dB = Math.hypot(b.x - g.x, b.y);
  const oppBest = m.bestT ? m.bestT[1 - t] : 1e9;
  const myT = p.icptT || 999;
  if (!p.keeperOnly || m.mode === 'train_shoot') {
    if (dB < 175 && b.z < PHYS.PLAYER_H && myT < oppBest - 4 && p.icpt && Math.abs(p.icpt.x - g.x) < 190) {
      if (!bot.plan || bot.plan.kind !== 'afastar' || bot.t-- <= 0) {
        bot.t = 20;
        bot.plan = { ball: b, T: { x: g.x + out * 330, y: (b.y >= 0 ? 1 : -1) * m.map.H * 0.8 }, kick: true, lob: false, curve: 0, sprint: true, kind: 'afastar' };
      }
      aiExecuteBall(m, p, bot.plan);
      return;
    }
  }
  if (bot.plan && bot.plan.kind === 'afastar') bot.plan = null;
  aiSteer(m, p, bot.ktx, bot.kty, bot.urgent ? 1 : Math.max(0.85, D.speed), bot.urgent, 14);
  // chutão se a bola chegar perto
  const gap = Math.hypot(b.x - d.x, b.y - d.y) - d.r - b.r;
  const kcool = p.lastKickT !== undefined && m.tick - p.lastKickT < 14;
  const kaim = norm(out, (b.y >= 0 ? 0.6 : -0.6));
  if (gap < (m.kickReach || KICK.REACH) + 2 && b.z < PHYS.HEAD_REACH && !kcool && aiKickSafe(m, p, b)) {
    inp.kick = !p.kickHeld || !!p.armed;
    inp.mx = kaim.x; inp.my = kaim.y;
  } else if (p.kickHeld) { inp.kick = false; inp.cancel = true; }
}

function aiSupport(m, p) {
  const t = p.team, atk = t === 0 ? 1 : -1, b = m.ball, H = m.map.H, D = m.diff;
  const W = Math.abs(m.stadium.gx[1]);
  const ownG = m.stadium.goals[t];
  const lanes = [-0.5, 0.5, 0, -0.78, 0.78, -0.25, 0.25];
  const k = p.supIdx || 0;
  let sx, sy;
  if (p.role === 'back') {
    const dB = Math.hypot(b.x - ownG.x, b.y);
    if (dB < 260 || m.poss === 1 - t) {
      // vira goleiro quando a bola se aproxima
      aiKeeper(m, p);
      return;
    }
    sx = ownG.x + (b.x - ownG.x) * 0.38; sy = b.y * 0.4;
  } else if (m.poss === t) {
    sx = b.x + atk * (120 + 50 * (k % 2)); sy = lanes[k % lanes.length] * H;
  } else {
    sx = ownG.x + (b.x - ownG.x) * 0.5; sy = b.y * 0.5 + lanes[k % lanes.length] * H * 0.35;
    // marcar o adversário mais perigoso que não está com a bola
    let mark = null, md = 1e9;
    for (const o of m.players) {
      if (o.team === t || o.role === 'keeper') continue;
      if (Math.hypot(o.disc.x - b.x, o.disc.y - b.y) < 60) continue;
      const dd = Math.hypot(o.disc.x - ownG.x, o.disc.y);
      const taken = m.players.some(q => q !== p && q.team === t && q.markTarget === o);
      if (!taken && dd < md) { md = dd; mark = o; }
    }
    p.markTarget = mark;
    if (mark && k > 0) {
      const v = norm(ownG.x - mark.disc.x, -mark.disc.y);
      sx = mark.disc.x + v.x * 42; sy = mark.disc.y + v.y * 42;
    }
  }
  sx = clamp(sx, -W + 30, W - 30); sy = clamp(sy, -H + 20, H - 20);
  // afastamento dos companheiros
  for (const q of m.players) {
    if (q === p || q.team !== t) continue;
    const dx = sx - q.disc.x, dy = sy - q.disc.y, dd = Math.hypot(dx, dy);
    if (dd < 75 && dd > 0.1) { sx += dx / dd * (75 - dd) * 0.6; sy += dy / dd * (75 - dd) * 0.6; }
  }
  aiSteer(m, p, sx, sy, D.speed * 0.92, false, 50);
  // toque oportunista se a bola passar perto
  const d = p.disc;
  const gap = Math.hypot(b.x - d.x, b.y - d.y) - d.r - b.r;
  const inp = p.input;
  const scool = (p.lastKickT !== undefined && m.tick - p.lastKickT < 14) || (b.x - d.x) * atk < 0;
  const oppG = m.stadium.goals[1 - t];
  const saim = norm(oppG.x - b.x, -b.y * 0.5);
  if (gap < (m.kickReach || KICK.REACH) + 1 && b.z < PHYS.HEAD_REACH && !scool && aiKickSafe(m, p, b)) {
    inp.mx = saim.x; inp.my = saim.y;
    inp.kick = !p.kickHeld || !!p.armed;
  } else if (p.kickHeld) { inp.kick = false; inp.cancel = true; }
}

function aiPower(m, p) {
  if (!p.power) return;
  const bot = p.bot, id = p.power, d = p.disc, b = m.ball, t = p.team, atk = t === 0 ? 1 : -1;
  if (!b) return;
  bot.powerHold = (bot.powerHold || 0) + 1;
  const oppG = m.stadium.goals[1 - t], ownG = m.stadium.goals[t];
  const dBall = Math.hypot(b.x - d.x, b.y - d.y);
  const ballAtk = b.x * atk > 0;
  let use = false;
  switch (id) {
    case 'turbo': use = p.role === 'chaser' && dBall > 120; break;
    case 'canhao': use = p.role === 'chaser' && dBall < 80 && Math.hypot(b.x - oppG.x, b.y) < 450; break;
    case 'gigante': use = (p.role === 'keeper' || p.role === 'back') && Math.hypot(b.x - ownG.x, b.y) < 320; break;
    case 'nanico': use = m.poss === 1 - t || dBall < 100; break;
    case 'muralha': use = Math.hypot(b.x - ownG.x, b.y) < 280 && b.vx * ownG.dir > 0.4; break;
    case 'ventania': use = ballAtk && Math.abs(b.x - oppG.x) < 360; break;
    case 'multibola': use = dBall < 130; break;
    case 'golzao': use = ballAtk && Math.abs(b.x - oppG.x) < 320; break;
    case 'sabao': use = m.poss === 1 - t; break;
    case 'congelou': use = dBall < 220 && m.players.some(q => q.team !== t && Math.hypot(q.disc.x - d.x, q.disc.y - d.y) < 200); break;
  }
  if (bot.powerHold > 60 * 8) use = true;
  if (use && Math.random() < 0.08) { p.input.power = true; bot.powerHold = 0; }
}

function aiPenalty(m, p) {
  const pen = m.pen, inp = p.input, D = m.diff, d = p.disc, bot = p.bot;
  const b = m.ball;
  const g = m.stadium.goals[1];
  const half = m.goalHalf[1];
  inp.sprint = false;
  inp.superKick = !!p.superHeld;
  if (pen.state !== 'aim' || pen.done) {
    inp.kick = false; if (p.kickHeld) inp.cancel = true;
    if (p.superHeld) inp.superCancel = true;
    inp.mx = 0; inp.my = 0;
    return;
  }
  if (p === m.penShooter()) {
    if (pen.kicked) { inp.kick = false; if (p.superHeld) inp.superCancel = true; aiSteer(m, p, d.x - 20, d.y, 0.4, false, 30); return; }
    if (bot.penDelay > 0) { bot.penDelay--; inp.mx = 0; inp.my = 0; return; }
    if (!bot.plan) {
      const panenka = m.allowLob !== false && (Math.random() < 0.05);
      let s = Math.random() < 0.5 ? -1 : 1;
      // batedor esperto: bate no canto oposto ao do goleiro adiantado
      const kp = m.penKeeper();
      if (kp && Math.abs(kp.disc.y) > 8 && Math.random() < 0.3 + D.save) s = kp.disc.y > 0 ? -1 : 1;
      let aimY = panenka ? rand(-0.15, 0.15) * half : s * half * rand(0.55, 0.9);
      const T = { x: g.x + 14, y: aimY };
      const ang = Math.atan2(T.y - b.y, T.x - b.x) + gauss() * D.aim * 0.45;
      const L = Math.hypot(T.x - b.x, T.y - b.y);
      bot.plan = {
        ball: b, T: { x: b.x + Math.cos(ang) * L, y: b.y + Math.sin(ang) * L },
        kick: true, lob: panenka, curve: 0, sprint: false, kind: 'penalti',
        superC: !panenka && m.allowSuper && Math.random() < D.super ? rand(0.5, 1) : 0
      };
      if (!panenka && m.allowCurve !== false && Math.random() < D.curve) {
        bot.plan.curve = s;
        const a2 = ang - s * (KICK_CURVE / (1 - 0.97)) * 0.32;
        bot.plan.T = { x: b.x + Math.cos(a2) * L, y: b.y + Math.sin(a2) * L };
      }
    }
    aiExecuteBall(m, p, bot.plan);
    return;
  }
  // goleiro
  const homeX = g.x - d.r - 3;
  if (!pen.kicked) {
    aiSteer(m, p, homeX, Math.sin(m.tick / 28) * 12, 0.5, false, 20);
    inp.kick = false;
    return;
  }
  const age = m.tick - pen.kickT;
  if (age < D.keeperReact + 2) { inp.mx = 0; inp.my = 0; return; }
  if (!pen.dived) {
    pen.dived = true;
    let cross = null;
    for (let i = 0; i <= 80; i++) { const q = m.ballPath[i]; if (q && q.x >= g.x - 4) { cross = q; break; } }
    const cy = cross ? cross.y : b.y;
    const correct = Math.random() < D.save;
    let ty = correct ? cy + gauss() * 7 : -sign(cy || rand(-1, 1)) * rand(8, half * 0.7);
    bot.diveY = clamp(ty, -half - 4, half + 4);
    const dy = bot.diveY - d.y;
    d.vy += sign(dy) * Math.min(5.6, Math.abs(dy) * 0.11 + 1.8);
    p.kickFlash = 8;
  }
  aiSteer(m, p, homeX, bot.diveY, 1, false, 6);
  const gap = Math.hypot(b.x - d.x, b.y - d.y) - d.r - b.r;
  if (gap < (m.kickReach || KICK.REACH) && b.z < PHYS.HEAD_REACH) { inp.kick = !p.kickHeld; inp.mx = -1; inp.my = sign(b.y) * 0.5; }
}

function aiThink(m, p) {
  const inp = p.input;
  inp.aimX = 0; inp.aimY = 0;
  if (m.mode === 'penalty') { aiPenalty(m, p); return; }
  if (p.keeperOnly) { aiKeeper(m, p); return; }
  if (m.phase === 'goal' || m.phase === 'end') {
    aiSteer(m, p, p.home.x * 0.6, p.home.y * 0.6, 0.35, false, 60);
    inp.kick = false; if (p.kickHeld) inp.cancel = true;
    inp.superKick = false; if (p.superHeld) inp.superCancel = true;
    return;
  }
  if (m.phase === 'kickoff' && (p.team !== m.kickoffTeam || p.role !== 'chaser')) {
    aiSteer(m, p, p.home.x, p.home.y, 0.8, false, 30);
    inp.kick = false; if (p.kickHeld) inp.cancel = true;
    inp.superKick = false; if (p.superHeld) inp.superCancel = true;
    return;
  }
  if (m.mode === 'chaos') aiPower(m, p);
  // super chute: por padrão continua segurando; quem não está num plano de super chute desiste da carga
  const usesPlan = p.role === 'chaser' || (p.role === 'keeper' && p.bot.plan && p.bot.plan.kind === 'afastar');
  inp.superKick = !!p.superHeld;
  if (p.superHeld && !(usesPlan && p.bot.plan && p.bot.plan.superC)) {
    // conduzindo por um instante: segura mais um pouco antes de desistir da carga
    p.bot.noSup = (p.bot.noSup || 0) + 1;
    if (p.bot.noSup > 30 || !usesPlan) inp.superCancel = true;
  } else p.bot.noSup = 0;
  // cavadinha ou curva armada que o plano atual não pede: desarma antes do próximo toque
  const plan = p.role === 'chaser' && p.bot.plan;
  if (p.lobArm && !(plan && plan.lob)) inp.lob = true;
  if (p.curveArm && !(plan && plan.curve)) { if (p.curveArm < 0) inp.curveL = true; else inp.curveR = true; }
  if (p.role === 'keeper') aiKeeper(m, p);
  else if (p.role === 'chaser') aiChase(m, p);
  else aiSupport(m, p);
}

/* ---- 06-topgame.js ---- */
'use strict';
/* ===== Partida vista de cima: regras, chute, poderes, modos ===== */
const KICK = { REACH: 4 };
const KICK_LOB = { power: 0.7, vz: 4.2 };   // cavadinha: parte da força para a frente e a bola sobe
const KICK_CURVE = 0.012;                   // efeito da curva (giro por tick, que vai diminuindo)
// super chute: segurar o botão carrega (0,75 s até o máximo); ao soltar, a força vai de MIN (toquinho) a MAX
const SUPER = { TICKS: 45, MIN: 3, MAX: 11, BUF: 8 };

const DIFF = {
  facil:   { id: 'facil',   name: 'Fácil',   react: 16, aim: 0.30, speed: 0.74, shoot: 250, curve: 0.0,  lob: 0.03, pass: 0.15, keeperReact: 15, predict: 0.45, sprint: 0.25, kickCharge: 0.8,  save: 0.14, super: 0.12 },
  medio:   { id: 'medio',   name: 'Médio',   react: 9,  aim: 0.17, speed: 0.87, shoot: 330, curve: 0.12, lob: 0.06, pass: 0.32, keeperReact: 10, predict: 0.75, sprint: 0.55, kickCharge: 0.92, save: 0.24, super: 0.3 },
  dificil: { id: 'dificil', name: 'Difícil', react: 5,  aim: 0.09, speed: 0.97, shoot: 400, curve: 0.25, lob: 0.1,  pass: 0.45, keeperReact: 6,  predict: 1,    sprint: 0.85, kickCharge: 1,    save: 0.32, super: 0.45 },
  craque:  { id: 'craque',  name: 'Craque',  react: 2,  aim: 0.045, speed: 1.0, shoot: 460, curve: 0.35, lob: 0.12, pass: 0.55, keeperReact: 3,  predict: 1,    sprint: 1,    kickCharge: 1,    save: 0.4, super: 0.55 }
};

const FORMATIONS = {
  1: [[-0.32, 0]],
  2: [[-0.28, 0], [-0.72, 0]],
  3: [[-0.25, 0], [-0.55, -0.45], [-0.55, 0.45]],
  4: [[-0.22, 0], [-0.5, -0.5], [-0.5, 0.5], [-0.84, 0]],
  5: [[-0.2, 0], [-0.42, -0.55], [-0.42, 0.55], [-0.68, -0.2], [-0.88, 0.1]],
  6: [[-0.18, -0.2], [-0.2, 0.3], [-0.45, -0.62], [-0.45, 0.62], [-0.68, 0], [-0.9, 0]],
  7: [[-0.17, 0], [-0.33, -0.55], [-0.33, 0.55], [-0.57, -0.3], [-0.57, 0.3], [-0.76, 0], [-0.91, 0]]
};

const POWERS = [
  { id: 'turbo',     name: 'Turbo',     icon: '💨', desc: 'Você corre muito mais por 3 s.' },
  { id: 'canhao',    name: 'Canhão',    icon: '💥', desc: 'Seu próximo chute sai quase o dobro mais forte.' },
  { id: 'gigante',   name: 'Gigante',   icon: '🗿', desc: 'Você cresce e fica pesado por 5 s.' },
  { id: 'nanico',    name: 'Nanico',    icon: '🐜', desc: 'Os adversários encolhem por 5 s.' },
  { id: 'muralha',   name: 'Muralha',   icon: '🧱', desc: 'Um muro protege o seu gol por 4 s.' },
  { id: 'ventania',  name: 'Ventania',  icon: '🌬️', desc: 'Vento empurra as bolas para o gol rival por 4 s.' },
  { id: 'multibola', name: 'Multibola', icon: '⚽', desc: 'Duas bolas extras entram em jogo. Todas valem gol.' },
  { id: 'golzao',    name: 'Golzão',    icon: '🥅', desc: 'O gol adversário fica bem mais largo por 6 s.' },
  { id: 'sabao',     name: 'Sabão',     icon: '🧼', desc: 'Os adversários escorregam por 4 s.' },
  { id: 'congelou',  name: 'Congelou',  icon: '🧊', desc: 'Adversários perto de você ficam parados 1,6 s.' }
];
const POWER_BY_ID = {};
for (const p of POWERS) POWER_BY_ID[p.id] = p;
const POWER_EVERY = 600;

const TEAM_NAMES = ['Vermelho', 'Azul'];

class TopMatch {
  constructor(cfg) {
    this.cfg = cfg;
    this.mode = cfg.mode || 'match'; // match | chaos | free | train_shoot | train_keep | penalty
    this.map = cfg.map || MAP_BY_ID.classico;
    this.diff = DIFF[cfg.diff || 'medio'];
    // corrida: 'folego' (com barra), 'normal' (ninguém corre), 'sempre' (corre sem cansar)
    this.runMode = cfg.run || 'folego';
    // física do modo Clássico (bola e jogador); o jeito de andar é o do Rachão
    this.classic = true;
    // chutes extras, cada um pode ser desligado nas opções: cavadinha, curva e super chute
    // (cfg.shots é o formato antigo: 'todos', 'semAlto' ou 'reto')
    this.allowLob = cfg.lob !== undefined ? !!cfg.lob : !(cfg.shots === 'semAlto' || cfg.shots === 'reto');
    this.allowCurve = cfg.curve !== undefined ? !!cfg.curve : cfg.shots !== 'reto';
    this.allowSuper = cfg.superKick !== undefined ? !!cfg.superKick : true;
    const ch = this.map.chutes;   // (Oficina de estádios: o estádio sem cavadinha, sem curva ou sem super chute)
    if (ch) { if (ch.lob === false) this.allowLob = false; if (ch.curve === false) this.allowCurve = false; if (ch.superKick === false) this.allowSuper = false; }
    this.world = new World();
    this.goalHalf = [this.map.goal, this.map.goal];
    this.golzao = [0, 0];
    this.dynSegs = [];
    this.buildGeometry();
    this.P = this.stadium.phys;
    if (this.P.ballFootBounce != null || this.P.ballWeight > 0) this.world.bolaPe = { e: this.P.ballFootBounce, peso: this.P.ballWeight };   // (Oficina de estádios)
    this.kickReach = this.P.kickReach;
    this.players = [];
    this.balls = [];
    this.score = [0, 0];
    this.time = 0;
    this.timeLimit = cfg.time || 0;
    this.scoreLimit = cfg.goals || 0;
    this.phase = 'kickoff';
    this.phaseT = 0;
    this.kickoffTeam = 0;
    this.overtime = false;
    this.endPending = false;
    this.winner = -1;
    this.events = [];
    this.fx = [];
    this.banner = null;
    this.tick = 0;
    this.wind = { x: 0, y: 0, t: 0 };
    this.windFx = null;
    this.muralha = [null, null];
    this.inputProvider = null;
    this.roles = {};
    this.poss = -1;
    this.ballPath = [];
    this.nextId = 1;
    this.stats = { kicks: 0, touches: 0 };
    // Oficina de estádios: o estádio pode escolher quais poderes aparecem e de quanto em quanto tempo (sem nada: os 10, a cada 10 s)
    this.powerList = Array.isArray(this.map.powers) && this.map.powers.length ? POWERS.filter(p => this.map.powers.indexOf(p.id) >= 0) : POWERS;
    if (!this.powerList.length) this.powerList = POWERS;
    this.powerEvery = this.map.powerEvery > 0 ? this.map.powerEvery : POWER_EVERY;
    this.setup();
  }

  /* ---------- montagem ---------- */
  buildGeometry() {
    this.stadium = buildStadium(this.map, this.goalHalf[0], this.goalHalf[1]);
    this.applyGeometry();
  }
  applyGeometry() {
    this.world.segs = this.stadium.segs.concat(this.dynSegs);
    this.world.statics = this.stadium.statics.slice();
  }
  addPlayer(team, o) {
    o = o || {};
    const P = this.P;
    const d = new Disc({ x: 0, y: 0, r: P.playerR, im: 0.5, damp: P.playerDamp, bounce: P.playerBounce, kind: 'player' });
    const p = {
      id: this.nextId++, team, num: o.num || 0, name: o.name || '', human: o.human || null,
      bot: o.human ? null : { t: 0, plan: null, stuck: 0, powerHold: 0, kickPlan: 0 },
      disc: d,
      input: { mx: 0, my: 0, aimX: 0, aimY: 0, kick: false, sprint: false, lob: false, curveL: false, curveR: false, power: false, cancel: false, superKick: false, superCancel: false },
      kickHeld: false, armed: false, curveArm: 0, lobArm: false,
      superHeld: false, superCharge: 0, superBuf: 0, superPow: 0,
      stamina: 1, exhausted: false, sprinting: false,
      power: null, powerTimer: this.powerEvery - randi(0, Math.min(120, this.powerEvery >> 1)),
      fx: { turbo: 0, canhao: 0, gigante: 0, nanico: 0, sabao: 0, frozen: 0 },
      kickFlash: 0, dashCool: 0, diveMode: false, keeperOnly: false,
      home: { x: 0, y: 0 }, goals: 0, assists: 0, aimX: 0, aimY: 0, label: o.label || ''
    };
    d.owner = p;
    this.players.push(p);
    this.world.discs.push(d);
    return p;
  }
  removePlayer(p) {
    const i = this.players.indexOf(p);
    if (i >= 0) this.players.splice(i, 1);
    const j = this.world.discs.indexOf(p.disc);
    if (j >= 0) this.world.discs.splice(j, 1);
  }
  addBall(x, y, extra) {
    const P = this.P;
    const b = new Disc({ x, y, r: P.ballR, im: P.ballIm, damp: P.ballDamp, bounce: P.ballBounce, kind: 'ball' });
    b.extra = !!extra;
    b.life = extra ? 600 : 0;
    this.balls.push(b);
    this.world.discs.push(b);
    return b;
  }
  removeBall(b) {
    const i = this.balls.indexOf(b);
    if (i >= 0) this.balls.splice(i, 1);
    const j = this.world.discs.indexOf(b);
    if (j >= 0) this.world.discs.splice(j, 1);
  }
  get ball() { return this.balls[0]; }

  setup() {
    const cfg = this.cfg;
    const m = this.mode;
    if (m === 'match' || m === 'chaos') {
      const sizes = cfg.teams || [2, 2];
      const humans = cfg.humans || [{ team: 0, ctrl: 'p1' }];
      for (let t = 0; t < 2; t++) {
        const hs = humans.filter(h => h.team === t);
        for (let i = 0; i < sizes[t]; i++) {
          const h = hs[i];
          this.addPlayer(t, { human: h ? h.ctrl : null, num: i + 1, label: h ? h.label : '' });
        }
      }
      this.addBall(0, 0);
      this.kickoffTeam = Math.random() < 0.5 ? 0 : 1;
      this.resetPositions();
      this.phase = 'kickoff';
      this.say('Bola no centro', this.kickoffTeam === 0 ? 'Saída do Vermelho' : 'Saída do Azul', 90);
      this.events.push({ t: 'whistle' });
    } else if (m === 'free') {
      const p = this.addPlayer(0, { human: 'p1', num: 1 });
      p.disc.x = -80;
      this.addBall(0, 0);
      this.phase = 'play';
    } else if (m === 'train_shoot') {
      const p = this.addPlayer(0, { human: 'p1', num: 9 });
      p.disc.x = this.stadium.gx[1] * 0.35; p.disc.y = 0;
      if (cfg.keeper) {
        const k = this.addPlayer(1, { num: 1 });
        k.keeperOnly = true;
        k.disc.x = this.stadium.gx[1] - 24;
      }
      this.addBall(0, 0);
      this.train = { n: 0, total: 10, ok: 0, state: 'wait', t: 50, launchT: 0, kind: null, from: null, keeperTouch: 0, results: [] };
      this.phase = 'play';
    } else if (m === 'train_keep') {
      const p = this.addPlayer(0, { human: 'p1', num: 1 });
      p.disc.x = this.stadium.gx[0] + 24; p.disc.y = 0;
      this.addBall(0, 0);
      this.train = { n: 0, total: 10, ok: 0, state: 'wait', t: 60, launchT: 0, kind: null, from: null, results: [] };
      this.phase = 'play';
    } else if (m === 'penalty') {
      this.goalHalf = [84, 84];
      this.buildGeometry();
      this.pen = { turn: 0, res: [[], []], state: 'setup', t: 0, kicked: false, kickT: 0, plan: null, sudden: false, done: false, keeperTouch: false, awayT: 0, slowT: 0 };
      this.penHuman = this.addPlayer(0, { human: 'p1', num: 10 });
      this.penBot = this.addPlayer(1, { num: 1 });
      this.addBall(0, 0);
      this.phase = 'play';
      this.penSetup();
    }
  }

  say(text, sub, dur, color) {
    this.banner = { text, sub: sub || '', t: dur || 90, max: dur || 90, color: color || null };
  }

  resetPositions() {
    const W = Math.abs(this.stadium.gx[0]);
    const H = this.map.H;
    for (const b of this.balls.slice()) { if (b.extra) this.removeBall(b); }
    const b = this.ball;
    b.x = b.px = 0; b.y = b.py = 0; b.vx = b.vy = 0; b.z = b.vz = 0; b.spin = 0; b.lastTouch = b.prevTouch = null;
    for (let t = 0; t < 2; t++) {
      const team = this.players.filter(p => p.team === t);
      const n = team.length;
      const form = FORMATIONS[Math.min(7, Math.max(1, n))] || FORMATIONS[7];
      // humanos na frente (camisa 1 da formação)
      const order = team.slice().sort((a, b) => (b.human ? 1 : 0) - (a.human ? 1 : 0));
      order.forEach((p, i) => {
        const f = form[i % form.length];
        const s = t === 0 ? 1 : -1;
        let x = f[0] * W * s, y = f[1] * H;
        if (i >= form.length) y += (i - form.length + 1) * 30;
        if (t === this.kickoffTeam && i === 0) { x = -s * (p.disc.r + this.P.ballR + 7); y = 0; }
        else if (i === 0) { x = -s * (this.map.circle + p.disc.r + 6); }
        p.home.x = x; p.home.y = y;
        const d = p.disc;
        d.x = d.px = x; d.y = d.py = y; d.vx = d.vy = 0;
        p.kickHeld = false; p.armed = false; p.curveArm = 0; p.lobArm = false; p.stamina = 1; p.exhausted = false;
        p.superHeld = false; p.superCharge = 0; p.superBuf = 0;
        p.fx.frozen = 0;
        if (p.bot) { p.bot.t = 0; p.bot.plan = null; p.bot.stuck = 0; }
      });
    }
    this.phase = 'kickoff';
  }

  /* ---------- laço principal ---------- */
  update() {
    this.tick++;
    if (this.banner) { this.banner.t--; if (this.banner.t <= 0) this.banner = null; }
    if (this.phase === 'paused') return;
    for (const d of this.world.discs) { d.px = d.x; d.py = d.y; d.pz = d.z; }
    this.computeBallPath();
    if (this.tick % 6 === 1 || !this.rolesReady) { aiAssignRoles(this); this.rolesReady = true; }
    for (const p of this.players) {
      if (p.human) {
        if (this.inputProvider) this.inputProvider(p.human, p);
      } else if (p.bot) {
        aiThink(this, p);
      }
    }
    if (this.mode === 'chaos') this.updatePowers();
    for (const p of this.players) this.controlPlayer(p);
    this.applyEnvironment();
    // ordem do modo Clássico: anda, amortece e só então resolve os contatos, numa passada só
    this.world.step(true);
    for (const b of this.balls) this.integrateBall(b);
    for (const p of this.players) this.dampPlayer(p);
    this.world.contactsClassic();
    this.processTouches();
    this.processHits();
    if (this.phase === 'kickoff') this.kickoffBarrier();
    this.rules();
    this.updateFx();
  }

  computeBallPath() {
    const b = this.ball;
    if (!b) return;
    const path = this.ballPath;
    const P = this.P;
    const W = Math.abs(this.stadium.gx[1]), H = this.map.H, r = b.r;
    let x = b.x, y = b.y, vx = b.vx, vy = b.vy, z = b.z, vz = b.vz;
    const g = this.goalHalf;
    const wb = clamp(P.ballBounce * P.wallBounce, 0.1, 1);
    for (let t = 0; t <= 90; t++) {
      path[t] = path[t] || { x: 0, y: 0, z: 0 };
      path[t].x = x; path[t].y = y; path[t].z = z;
      if (z > 0 || vz > 0) { vz -= P.gravity; z += vz; if (z <= 0) { z = 0; vz = vz < -1 ? -vz * P.landBounce : 0; vx *= 0.88; vy *= 0.88; } }
      const dmp = z > 0 ? P.airDamp : P.ballDamp;
      vx *= dmp; vy *= dmp;
      if (P.ballMax > 0) { const sv = Math.hypot(vx, vy); if (sv > P.ballMax) { vx *= P.ballMax / sv; vy *= P.ballMax / sv; } }
      x += vx; y += vy;
      if (y > H - r) { y = 2 * (H - r) - y; vy = -vy * wb; }
      if (y < -H + r) { y = 2 * (-H + r) - y; vy = -vy * wb; }
      if (this.map.shape !== 'rink') {
        if (x > W - r && Math.abs(y) > g[1] - 2) { x = 2 * (W - r) - x; vx = -vx * wb; }
        if (x < -W + r && Math.abs(y) > g[0] - 2) { x = 2 * (-W + r) - x; vx = -vx * wb; }
      } else {
        const R = Math.abs(this.stadium.gx[1]) + 70;
        if (x > R) { x = 2 * R - x; vx = -vx * wb; }
        if (x < -R) { x = -2 * R - x; vx = -vx * wb; }
      }
    }
  }

  /* ---------- controle do jogador ---------- */
  controlPlayer(p) {
    const P = this.P, d = p.disc, inp = p.input;
    // efeitos com tempo
    for (const k in p.fx) if (p.fx[k] > 0) p.fx[k]--;
    if (p.kickFlash > 0) p.kickFlash--;
    if (p.dashCool > 0) p.dashCool--;
    // tamanho (gigante / nanico)
    let rMul = 1, imMul = 1;
    if (p.fx.gigante > 0) { rMul *= 1.6; imMul *= 0.4; }
    if (p.fx.nanico > 0) { rMul *= 0.62; imMul *= 2; }
    const targetR = P.playerR * rMul;
    d.r += (targetR - d.r) * 0.2;
    d.im = 0.5 * imMul;
    if (p.fx.frozen > 0) {
      d.vx *= 0.5; d.vy *= 0.5;
      p.kickHeld = false; p.armed = false; p.superHeld = false; p.superCharge = 0; p.superBuf = 0;
      inp.lob = inp.curveL = inp.curveR = inp.power = false;
      return;
    }
    // armar cobertura/curva (toque liga, outro toque desliga)
    if (inp.lob) { inp.lob = false; if (this.allowLob) { p.lobArm = !p.lobArm; this.events.push({ t: 'arm', p }); } }
    if (inp.curveL) { inp.curveL = false; if (this.allowCurve) { p.curveArm = p.curveArm === -1 ? 0 : -1; this.events.push({ t: 'arm', p }); } }
    if (inp.curveR) { inp.curveR = false; if (this.allowCurve) { p.curveArm = p.curveArm === 1 ? 0 : 1; this.events.push({ t: 'arm', p }); } }
    if (!this.allowLob) p.lobArm = false;
    if (!this.allowCurve) p.curveArm = 0;
    if (inp.power) { inp.power = false; if (this.mode === 'chaos') this.usePower(p); }
    // movimento
    let mx = inp.mx || 0, my = inp.my || 0;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    const moving = mag > 0.2;
    let sprint = !!inp.sprint && moving && !p.exhausted;
    if (p.fx.turbo > 0) { sprint = moving; p.stamina = Math.min(1, p.stamina + 0.01); }
    if (this.runMode !== 'folego') {
      // sem barra de fôlego: velocidade fixa (normal ou de corrida)
      sprint = this.runMode === 'sempre' ? moving : (p.fx.turbo > 0 && moving);
      p.stamina = 1; p.exhausted = false;
    } else if (sprint && p.fx.turbo <= 0) {
      p.stamina -= 1 / 140;
      if (p.stamina <= 0) { p.stamina = 0; p.exhausted = true; sprint = false; }
    } else {
      p.stamina = Math.min(1, p.stamina + (moving ? 1 / 300 : 1 / 170));
      if (p.exhausted && p.stamina > 0.3) p.exhausted = false;
    }
    p.sprinting = sprint;
    // para onde o jogador aponta (usado no mergulho do goleiro)
    const im = Math.hypot(mx, my);
    if (inp.aimX || inp.aimY) { p.aimX = inp.aimX; p.aimY = inp.aimY; }
    else if (im > 0.3) {
      p.aimX = mx; p.aimY = my;
      p.lastAimX = mx / im; p.lastAimY = my / im; p.lastAimT = this.tick;
    } else { p.aimX = mx; p.aimY = my; }
    // chute do modo Clássico: apertar arma (de novo a cada aperto) e o chute sai sozinho quando a bola está no alcance;
    // soltar desarma. É resolvido antes da aceleração, como no original. No pênalti, o goleiro mergulha.
    const gapOk = () => this.tick - (p.lastKickT === undefined ? -99 : p.lastKickT) >= P.kickGap;
    // super chute (botão à parte): segure para carregar e solte para chutar; quanto mais tempo segurando, mais forte.
    // Se a bola ainda não estiver no pé ao soltar, o chute espera alguns ticks por ela.
    if (inp.superCancel) { inp.superCancel = false; inp.superKick = false; p.superHeld = false; p.superCharge = 0; p.superBuf = 0; }
    if (this.allowSuper && !p.diveMode) {
      if (inp.superKick) {
        if (!p.superHeld) { p.superHeld = true; p.superCharge = 0; }
        else p.superCharge = Math.min(1, p.superCharge + 1 / SUPER.TICKS);
      } else if (p.superHeld) {
        p.superHeld = false; p.superPow = p.superCharge; p.superCharge = 0; p.superBuf = SUPER.BUF;
      }
    } else { p.superHeld = false; p.superCharge = 0; p.superBuf = 0; }
    // chute solto esperando a bola chegar (vale mesmo que já tenha começado a carregar outro)
    if (p.superBuf > 0) {
      const b = gapOk() ? this.ballInReach(p) : null;
      if (b) { this.doKick(p, b, p.superPow); p.superBuf = 0; p.armed = false; p.lastKickT = this.tick; }
      else p.superBuf--;
    }
    if (inp.cancel) { inp.cancel = false; inp.kick = false; }
    if (p.diveMode) {
      if (inp.kick && !p.kickHeld) this.dive(p);
      p.kickHeld = !!inp.kick; p.armed = false;
    } else {
      if (inp.kick) { if (!p.kickHeld || inp.kickNew) { p.kickHeld = true; p.armed = true; } }
      else { p.kickHeld = false; p.armed = false; }
      // carregando o super chute, o chute normal fica esperando
      if (p.armed && !p.superHeld && gapOk()) {
        const b = this.ballInReach(p);
        if (b) { this.doKick(p, b); p.armed = false; p.lastKickT = this.tick; }
      }
    }
    inp.kickNew = false;
    if (P.andar === 'direto' && !(p.fx.sabao > 0) && !(p.dashCool > 10)) {   // (Oficina de estádios: o andar do RACHA)
      let vmax = P.moveMax > 0 ? P.moveMax : P.accel / (1 - P.playerDamp);
      if (sprint) vmax *= P.sprint;
      if (p.armed || p.superHeld) vmax *= P.kickAccel;
      if (p.fx.turbo > 0) vmax *= 1.5;
      vmax *= this.zoneAccel(d);
      const amp = Math.min(1, Math.hypot(mx, my));
      if (amp > 0.02) {
        const ac = (P.moveAccel > 0 ? Math.min(1, P.moveAccel) : 1) * vmax;
        d.vx += mx * ac; d.vy += my * ac;
        const v = Math.hypot(d.vx, d.vy), lim = vmax * amp;
        if (v > lim) { d.vx *= lim / v; d.vy *= lim / v; }
      } else { const fr = P.moveBrake > 0 ? Math.min(1, P.moveBrake) : 1; d.vx *= 1 - fr; d.vy *= 1 - fr; }
      return;
    }
    let acc = P.andar === 'direto' ? (P.moveMax > 0 ? P.moveMax : P.accel / (1 - P.playerDamp)) * (1 - P.playerDamp) : P.accel;
    if (sprint) acc *= P.sprint;
    if (p.armed || p.superHeld) acc *= P.kickAccel;
    if (p.fx.turbo > 0) acc *= 1.5;
    if (p.fx.sabao > 0) acc *= 0.55;
    acc *= this.zoneAccel(d);
    d.vx += mx * acc; d.vy += my * acc;
  }

  dive(p) {
    if (p.dashCool > 0) return;
    const d = p.disc;
    let dx = p.aimX, dy = p.aimY;
    if (Math.hypot(dx, dy) < 0.2) { const b = this.ball; dx = b.x - d.x; dy = b.y - d.y; }
    const n = norm(dx, dy);
    d.vx += n.x * 5.2; d.vy += n.y * 5.2;
    p.dashCool = 45;
    p.kickFlash = 8;
    this.events.push({ t: 'dive', p });
  }

  ballInReach(p) {
    let best = null, bd = 1e9;
    for (const b of this.balls) {
      if (b.z > PHYS.HEAD_REACH) continue;
      const dd = Math.hypot(b.x - p.disc.x, b.y - p.disc.y) - p.disc.r - b.r;
      if (dd < this.kickReach && dd < bd) { bd = dd; best = b; }
    }
    return best;
  }

  /* direção do chute: do centro do jogador para o centro da bola, como no modo Clássico */
  kickDir(p, b) {
    const d = p.disc;
    const n = norm(b.x - d.x, b.y - d.y);
    if (n.d > 0) return { x: n.x, y: n.y };
    // centros juntos: vale a última direção em que o jogador andou
    if (p.lastAimX !== undefined) return { x: p.lastAimX, y: p.lastAimY };
    return { x: p.team === 0 ? 1 : -1, y: 0 };
  }

  /* pow: carga do super chute (0 a 1); sem pow é o chute normal do Clássico */
  doKick(p, b, pow) {
    const dir = this.kickDir(p, b);
    const nx = dir.x, ny = dir.y;
    const sup = pow !== undefined;
    const c = sup ? Math.pow(clamp(pow, 0, 1), 0.9) : 0;
    let canhao = false;
    const header = b.z > 3;
    const lob = p.lobArm && this.allowLob;
    const curve = p.curveArm && this.allowCurve ? p.curveArm : 0;
    // força × massa inversa da bola, somada à velocidade que a bola já tinha (modo Clássico):
    // fixa no chute normal; no super chute vai de SUPER.MIN a SUPER.MAX conforme o tempo segurando
    let power = (sup ? lerp(SUPER.MIN, SUPER.MAX, c) : this.P.kickForce) * b.im;
    if (p.fx.canhao > 0) { power *= 1.75; p.fx.canhao = 0; canhao = true; }
    if (header) power *= 0.8;
    if (lob) power *= KICK_LOB.power;
    b.vx += nx * power; b.vy += ny * power;
    // cavadinha: a bola sobe por cima de quem estiver na frente e cai mais adiante (mais alto e longe se carregada)
    if (lob) b.vz = KICK_LOB.vz * (1 + 0.45 * c) * Math.sqrt(this.P.gravity / 0.24);
    else if (header) b.vz = Math.max(0, b.vz * 0.2) + 0.6;
    // curva: a bola sai na linha do chute e vai entortando para o lado escolhido
    b.spin = curve * KICK_CURVE * (1 + 0.6 * c);
    if (sup && c > 0.6 && !canhao) b.fire = Math.max(b.fire || 0, Math.round(15 + 30 * c));
    p.curveArm = 0; p.lobArm = false;
    if (b.lastTouch !== p) b.prevTouch = b.lastTouch;
    b.lastTouch = p;
    b.kickedBy = p; b.kickT = this.tick;
    if (this.mode === 'penalty' && this.pen) {
      if (!this.pen.kicked && p === this.penShooter()) this.penKicked();
      else if (this.pen.kicked && p === this.penKeeper()) this.pen.keeperTouch = true;
    }
    if (this.mode === 'train_shoot' && p.keeperOnly && this.train) this.train.keeperTouch = Math.max(this.train.keeperTouch, 1);
    p.kickFlash = 8;
    this.stats.kicks++;
    this.events.push({ t: 'kick', p, power, x: b.x, y: b.y, header, lob, canhao, superKick: sup });
    if (canhao) b.fire = 50;
    if (this.phase === 'kickoff') this.startPlay();
    this.onKick && this.onKick(p, b);
  }

  startPlay() {
    if (this.phase === 'kickoff') { this.phase = 'play'; }
  }

  zoneAccel(d) {
    let m = 1;
    for (const z of this.stadium.zones) {
      if (z.accelMul && (d.x - z.x) ** 2 + (d.y - z.y) ** 2 < z.r * z.r) m *= z.accelMul;
    }
    return m;
  }

  applyEnvironment() {
    // vento do mapa Vendaval
    if (this.map.wind) {
      const w = this.wind;
      if (w.t <= 0) {
        const dirs = this.map.windDirs || [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];   // (Oficina de estádios)
        let pickd;
        do { pickd = pick(dirs); } while (dirs.length > 1 && pickd[0] === w.dx && pickd[1] === w.dy);
        w.dx = pickd[0]; w.dy = pickd[1];
        w.t = this.map.windEvery || 420;
        this.events.push({ t: 'wind' });
      }
      w.t--;
      const k = 0.03 * (this.map.windForce || 1);
      w.x += (w.dx * k - w.x) * 0.02; w.y += (w.dy * k - w.y) * 0.02;
      for (const b of this.balls) {
        const mul = b.z > 0 ? 2.4 : 1;
        b.vx += w.x * mul; b.vy += w.y * mul;
      }
    }
    if (this.windFx) {
      const f = this.windFx;
      f.t--;
      for (const b of this.balls) { const mul = b.z > 0 ? 1.7 : 1; b.vx += f.dir * 0.05 * mul; }
      if (f.t <= 0) this.windFx = null;
    }
  }

  processTouches() {
    for (const t of this.world.touches) {
      const p = t.pl.owner, b = t.ball;
      if (!p) continue;
      if (b.lastTouch !== p) { b.prevTouch = b.lastTouch; b.lastTouch = p; }
      if (t.imp > 1.5) this.events.push({ t: 'touch', imp: t.imp });
      if (this.phase === 'kickoff' && b === this.ball) this.startPlay();
      if (this.mode === 'train_shoot' && p.keeperOnly) this.train.keeperTouch = Math.max(this.train.keeperTouch, 1);
      if (this.mode === 'penalty' && this.pen && !this.pen.kicked && p === this.penShooter()) this.penKicked();
      if (this.mode === 'penalty' && this.pen && this.pen.kicked && p === this.penKeeper()) this.pen.keeperTouch = true;
    }
  }

  processHits() {
    for (const h of this.world.hits) {
      if (h.imp < 0.8) continue;
      if (h.kind === 'post' || h.kind === 'trave' || h.kind === 'chinelo' || h.kind === 'bambu') this.events.push({ t: 'post', imp: h.imp, x: h.x, y: h.y });
      else if (h.kind === 'net') this.events.push({ t: 'net', imp: h.imp });
      else if (h.kind === 'bumper' || h.kind === 'kicker') { this.events.push({ t: 'bumper', imp: h.imp, x: h.x, y: h.y }); }
      else if (h.kind === 'bar') this.events.push({ t: 'post', imp: h.imp, x: h.x, y: h.y, bar: true });
      else if (h.imp > 2) this.events.push({ t: 'wall', imp: h.imp });
    }
  }

  integrateBall(b) {
    const P = this.P;
    let dmp;
    if (b.z > 0 || b.vz > 0) {
      b.vz -= P.gravity;
      b.z += b.vz;
      if (b.z <= 0) {
        b.z = 0;
        if (b.vz < -1.0) {
          if (b.vz < -2) this.events.push({ t: 'bounce', imp: -b.vz });
          b.vz = -b.vz * P.landBounce;
          b.vx *= 0.88; b.vy *= 0.88;
        } else b.vz = 0;
      }
      dmp = P.airDamp;
    } else {
      dmp = P.ballDamp;
      for (const z of this.stadium.zones) {
        if (z.ballDamp && (b.x - z.x) ** 2 + (b.y - z.y) ** 2 < z.r * z.r) dmp = Math.min(dmp, z.ballDamp);
      }
    }
    const sp = Math.hypot(b.vx, b.vy);
    if (b.spin) {
      const a = b.spin * Math.min(1, sp / 2);
      const c = Math.cos(a), s = Math.sin(a);
      const vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c;
      b.vx = vx; b.vy = vy;
      b.spin *= 0.97;
      if (Math.abs(b.spin) < 0.0004) b.spin = 0;
    }
    b.vx *= dmp; b.vy *= dmp;
    if (P.ballMax > 0) { const sv = Math.hypot(b.vx, b.vy); if (sv > P.ballMax) { b.vx *= P.ballMax / sv; b.vy *= P.ballMax / sv; } }   // (Oficina de estádios: o teto da bola)
    if (Math.abs(b.vx) < 0.004 && Math.abs(b.vy) < 0.004) { b.vx = 0; b.vy = 0; }
    b.rot += sp / b.r;
    if (b.fire > 0) b.fire--;
    if (b.extra) {
      b.life--;
      if (b.life <= 0) { this.fxBurst(b.x, b.y, '#ffffff', 14); this.removeBall(b); this.events.push({ t: 'pop' }); }
    }
  }

  dampPlayer(p) {
    const d = p.disc;
    if (this.P.andar === 'direto' && !(p.fx.sabao > 0) && !(p.dashCool > 10)) {   // (Oficina de estádios: o andar do RACHA freia no comando; só a lama freia aqui)
      let dz = 1;
      for (const z of this.stadium.zones) if (z.playerDamp && (d.x - z.x) ** 2 + (d.y - z.y) ** 2 < z.r * z.r) dz = Math.min(dz, z.playerDamp);
      if (dz < 1) { d.vx *= dz; d.vy *= dz; }
      return;
    }
    let dmp = this.P.playerDamp;
    for (const z of this.stadium.zones) {
      if (z.playerDamp && (d.x - z.x) ** 2 + (d.y - z.y) ** 2 < z.r * z.r) dmp = Math.min(dmp, z.playerDamp);
    }
    if (p.fx.sabao > 0) dmp = 0.988;
    d.vx *= dmp; d.vy *= dmp;
  }

  kickoffBarrier() {
    const R = this.map.circle;
    for (const p of this.players) {
      const d = p.disc, side = p.team === 0 ? -1 : 1, pr = d.r;
      const dist = Math.hypot(d.x, d.y);
      const inCircle = dist < R - pr * 0.2;
      if (d.x * side < pr) {
        const ok = p.team === this.kickoffTeam && inCircle;
        if (!ok) {
          d.x = side * pr;
          if (d.vx * side < 0) d.vx = 0;
        }
      }
      if (p.team !== this.kickoffTeam) {
        const dd = Math.hypot(d.x, d.y);
        const lim = R + pr;
        if (dd < lim) {
          let nx = d.x / (dd || 1), ny = d.y / (dd || 1);
          if (dd < 1e-3) { nx = side; ny = 0; }
          d.x = nx * lim; d.y = ny * lim;
          const vn = d.vx * nx + d.vy * ny;
          if (vn < 0) { d.vx -= nx * vn; d.vy -= ny * vn; }
        }
      }
    }
    const b = this.ball;
    if (b && (Math.abs(b.vx) > 0.02 || Math.abs(b.vy) > 0.02)) this.startPlay();
  }

  /* ---------- regras ---------- */
  rules() {
    const m = this.mode;
    // bolas que escaparam do estádio (segurança)
    const ex = this.stadium.ext;
    for (const b of this.balls.slice()) {
      if (!isFinite(b.x) || !isFinite(b.y) || Math.abs(b.x) > ex.x + 30 || Math.abs(b.y) > ex.y + 30) {
        if (b.extra) { this.removeBall(b); continue; }
        b.x = 0; b.y = 0; b.vx = b.vy = 0; b.z = b.vz = 0; b.spin = 0;
      }
    }
    for (const p of this.players) {
      const d = p.disc;
      if (!isFinite(d.x) || !isFinite(d.y) || Math.abs(d.x) > ex.x + 40 || Math.abs(d.y) > ex.y + 40) { d.x = p.home.x; d.y = p.home.y; d.vx = d.vy = 0; }
    }
    if (m === 'match' || m === 'chaos') this.rulesMatch();
    else if (m === 'free') this.rulesFree();
    else if (m === 'train_shoot' || m === 'train_keep') this.rulesTrain();
    else if (m === 'penalty') this.rulesPenalty();
    // muralha e golzão
    for (let t = 0; t < 2; t++) {
      const mw = this.muralha[t];
      if (mw) { mw.t--; if (mw.t <= 0) { this.dynSegs.splice(this.dynSegs.indexOf(mw.seg), 1); this.muralha[t] = null; this.applyGeometry(); } }
      if (this.golzao[t] > 0) {
        this.golzao[t]--;
        if (this.golzao[t] <= 0) {
          const g = this.stadium.goals[t];
          const near = this.balls.some(b => Math.abs(b.x - g.x) < 140);
          if (near) this.golzao[t] = 20;
          else { this.goalHalf[t] = this.map.goal; this.buildGeometry(); }
        }
      }
    }
  }

  goalCheck(b) {
    for (const g of this.stadium.goals) {
      const ins = (b.x - g.x) * g.dir;
      if (ins > b.r * 0.8 && ins < g.depth + 4 && Math.abs(b.y) < this.goalHalf[g.side]) return g.side;
    }
    return -1;
  }

  rulesMatch() {
    if (this.phase === 'play') {
      this.time += 1 / 60;
      for (const b of this.balls.slice()) {
        const side = this.goalCheck(b);
        if (side < 0) continue;
        const team = 1 - side;
        this.scoreGoal(team, b);
        if (!b.extra) break;
      }
      if (this.phase === 'play' && this.timeLimit && this.time >= this.timeLimit && !this.overtime) {
        if (this.score[0] !== this.score[1]) this.finish();
        else {
          this.overtime = true;
          this.say('Prorrogação', 'Gol de ouro: quem marcar vence', 150);
          this.events.push({ t: 'whistle', long: true });
        }
      }
    } else if (this.phase === 'goal') {
      this.phaseT--;
      if (this.phaseT <= 0) {
        if (this.endPending) this.finish();
        else { this.resetPositions(); this.events.push({ t: 'whistle' }); }
      }
    } else if (this.phase === 'end') {
      this.phaseT++;
    }
  }

  scoreGoal(team, b) {
    this.score[team]++;
    let scorer = b.lastTouch;
    let own = !!scorer && scorer.team !== team;
    let assist = null;
    if (own && b.kickedBy && b.kickedBy.team === team && b.kickedBy !== scorer && this.tick - b.kickT < 150) {
      // chute que só resvalou num adversário: o gol é de quem chutou
      scorer = b.kickedBy; own = false;
    } else if (!own && b.prevTouch && b.prevTouch.team === team && b.prevTouch !== scorer) assist = b.prevTouch;
    if (scorer && !own) scorer.goals++;
    if (assist) assist.assists++;
    this.events.push({ t: 'goal', team, scorer, own, assist, extra: b.extra });
    this.fxConfetti(b.x, b.y, team);
    const tname = TEAM_NAMES[team];
    let sub = own ? 'Gol contra!' : (scorer ? (scorer.human ? (scorer.label || 'Você') + ' marcou' : 'Camisa ' + scorer.num + ' do ' + tname) : '');
    if (assist && !own) sub += ' · passe do ' + (assist.human ? (assist.label || 'você') : 'camisa ' + assist.num);
    const limitHit = this.scoreLimit && this.score[team] >= this.scoreLimit;
    if (b.extra) {
      this.removeBall(b);
      this.say('Gol!', sub, 70, team);
      if (limitHit || this.overtime) { this.endPending = true; this.phase = 'goal'; this.phaseT = 150; }
      return;
    }
    this.say('Gol!', sub, 150, team);
    this.phase = 'goal';
    this.phaseT = 150;
    this.kickoffTeam = 1 - team;
    if (limitHit || this.overtime) this.endPending = true;
  }

  finish() {
    this.phase = 'end';
    this.phaseT = 0;
    this.winner = this.score[0] > this.score[1] ? 0 : this.score[1] > this.score[0] ? 1 : -1;
    this.events.push({ t: 'whistle', long: true, end: true });
    this.events.push({ t: 'end', winner: this.winner });
  }

  rulesFree() {
    for (const b of this.balls) {
      const side = this.goalCheck(b);
      if (side >= 0 && !b.scored) {
        b.scored = true;
        this.score[1 - side]++;
        this.events.push({ t: 'goal', team: 1 - side, scorer: b.lastTouch, minor: true });
        this.fxConfetti(b.x, b.y, 1 - side);
        this.say('Gol!', 'A bola volta para o meio', 80, 1 - side);
        this.freeReset = 80;
      }
    }
    if (this.freeReset > 0) {
      this.freeReset--;
      if (this.freeReset === 0) { const b = this.ball; b.scored = false; b.x = b.y = 0; b.vx = b.vy = 0; b.z = b.vz = 0; b.spin = 0; }
    }
  }

  respawnBall() {
    const b = this.ball;
    if (!b) return;
    b.scored = false; b.x = 0; b.y = 0; b.vx = b.vy = 0; b.z = b.vz = 0; b.spin = 0;
    if (this.mode === 'free') {
      const p = this.players[0];
      if (p) { b.x = p.disc.x + (p.team === 0 ? 40 : -40); b.y = p.disc.y; }
    }
  }

  /* ---------- treino ---------- */
  trainLaunch() {
    const tr = this.train, b = this.ball, P = this.P;
    const W = Math.abs(this.stadium.gx[1]), H = this.map.H;
    const g = this.goalHalf[1];
    let from, to, speed, lob = false, spin = 0, kind;
    if (this.mode === 'train_shoot') {
      let kinds = ['rasteiro', 'cruzamento', 'alta', 'curva'];
      if (!this.allowLob) kinds = this.allowCurve ? ['rasteiro', 'cruzado', 'enfiada', 'curva'] : ['rasteiro', 'cruzado', 'enfiada'];
      kind = kinds[tr.n % kinds.length];
      const sy = Math.random() < 0.5 ? -1 : 1;
      if (kind === 'rasteiro') { from = { x: W * rand(0.05, 0.3), y: sy * (H - 22) }; to = { x: W * 0.55, y: rand(-50, 50) }; speed = rand(5.2, 6.4); }
      else if (kind === 'cruzado') { from = { x: W - 46, y: sy * (H - 28) }; to = { x: W * rand(0.62, 0.7), y: -sy * rand(10, 60) }; speed = rand(5.6, 6.4); }
      else if (kind === 'enfiada') { from = { x: rand(-60, 60), y: rand(-H * 0.5, H * 0.5) }; to = { x: W * rand(0.52, 0.6), y: rand(-50, 50) }; speed = rand(6, 6.8); }
      else if (kind === 'cruzamento') { from = { x: W - 46, y: sy * (H - 28) }; to = { x: W * rand(0.62, 0.72), y: -sy * rand(0, 60) }; speed = 5.6; lob = true; }
      else if (kind === 'alta') { from = { x: rand(-60, 60), y: rand(-H * 0.6, H * 0.6) }; to = { x: W * rand(0.5, 0.62), y: rand(-50, 50) }; speed = 5.4; lob = true; }
      else { from = { x: W * 0.22, y: sy * (H - 34) }; to = { x: W * 0.6, y: sy * 30 }; speed = 6.2; spin = -sy * 0.014; }
    } else {
      let kinds = ['forte', 'colocado', 'cobertura', 'forte', 'quique'];
      if (!this.allowLob) kinds = ['forte', 'colocado', 'rasteiro', 'forte', 'colocado'];
      kind = kinds[tr.n % kinds.length];
      const gx = this.stadium.gx[0];
      from = { x: gx + rand(170, 330), y: rand(-H * 0.65, H * 0.65) };
      const gy = this.goalHalf[0];
      to = { x: gx - 4, y: rand(-gy * 0.85, gy * 0.85) };
      if (kind === 'forte') speed = rand(9, 10.4);
      else if (kind === 'colocado') { speed = rand(7.2, 8.2); if (this.allowCurve) { spin = (Math.random() < 0.5 ? -1 : 1) * 0.012; to.y *= 0.4; } }
      else if (kind === 'rasteiro') speed = rand(7.6, 8.6);
      else if (kind === 'cobertura') { speed = 5.2; lob = true; }
      else { speed = 7.5; lob = true; }
    }
    // no Clássico o chute é mais fraco e sem efeito: os lançamentos vêm no ritmo dele
    if (!lob) speed *= this.mode === 'train_shoot' ? 0.6 : 0.68;
    const dx = to.x - from.x, dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    b.x = b.px = from.x; b.y = b.py = from.y; b.z = 0; b.vz = 0;
    let ang = Math.atan2(dy, dx);
    if (spin) ang -= spin * 14;
    b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed;
    b.spin = spin;
    if (lob) {
      // tempo de voo aproximado -> vz para cair perto do alvo
      const tFlight = dist / (speed * 0.93);
      b.vz = Math.min(9, P.gravity * tFlight / 2);
      if (kind === 'quique') b.vz = 2.2;
    }
    b.lastTouch = null; b.prevTouch = null; b.scored = false;
    tr.kind = kind; tr.from = from; tr.launchT = this.tick; tr.state = 'live'; tr.keeperTouch = 0; tr.slow = 0; tr.touched = false;
    this.events.push({ t: 'launch' });
    this.fxBurst(from.x, from.y, '#ffd34d', 10);
  }

  rulesTrain() {
    const tr = this.train;
    if (!tr) return;
    const b = this.ball;
    if (tr.state === 'wait') {
      tr.t--;
      // bola parada no lançador enquanto espera
      if (tr.t === 40) { this.nextFrom = true; }
      if (tr.t <= 0) {
        if (tr.n >= tr.total) { tr.state = 'done'; this.phase = 'end'; this.events.push({ t: 'end', train: true }); return; }
        this.trainLaunch();
      } else {
        b.vx *= 0.8; b.vy *= 0.8;
      }
      return;
    }
    if (tr.state !== 'live') return;
    const age = this.tick - tr.launchT;
    const side = this.goalCheck(b);
    const shoot = this.mode === 'train_shoot';
    if (b.lastTouch && b.lastTouch.human) tr.touched = true;
    if (side >= 0) {
      let ok;
      if (shoot) ok = side === 1 && tr.touched;
      else ok = false;
      if (shoot && ok) { tr.ok++; this.say('Gol!', 'Treino: ' + tr.ok + ' de ' + (tr.n + 1), 60, 0); this.fxConfetti(b.x, b.y, 0); this.events.push({ t: 'goal', team: 0, minor: true }); }
      else if (!shoot) { this.say('Entrou', 'Defesas: ' + tr.ok + ' de ' + (tr.n + 1), 60, 1); this.events.push({ t: 'net', imp: 3 }); }
      else this.say('Contra o próprio gol', '', 60);
      tr.results.push(shoot ? ok : false);
      this.trainNext();
      return;
    }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp < 0.25 && b.z <= 0) tr.slow++; else tr.slow = 0;
    let dead = false, saved = false;
    if (shoot) {
      if (tr.keeperTouch) { tr.keeperTouch++; if (tr.keeperTouch > 40) dead = true; }
      if (tr.slow > 50) dead = true;
      if (age > 60 * 7) dead = true;
      if (tr.touched && b.lastTouch && b.lastTouch.human && age > 60 && sp < 1.2 && b.x < 0) dead = true;
    } else {
      // defesa: bola parou, voltou, ou acabou o tempo
      const gx = this.stadium.gx[0];
      if (tr.slow > 30) { dead = true; saved = true; }
      if (age > 60 * 3.5) { dead = true; saved = true; }
      if (b.vx > 0.8 && b.x > gx + 60 && age > 20) { dead = true; saved = true; }
    }
    if (dead) {
      if (shoot) { this.say('Não foi', 'Treino: ' + tr.ok + ' de ' + (tr.n + 1), 50); tr.results.push(false); }
      else { tr.ok++; this.say('Defendeu!', 'Defesas: ' + tr.ok + ' de ' + (tr.n + 1), 60, 0); this.events.push({ t: 'save' }); tr.results.push(true); }
      this.trainNext();
    }
  }
  trainNext() {
    const tr = this.train;
    tr.n++;
    tr.state = 'wait';
    tr.t = 70;
  }

  /* ---------- pênaltis ---------- */
  penShooter() { return this.pen.turn % 2 === 0 ? this.penHuman : this.penBot; }
  penKeeper() { return this.pen.turn % 2 === 0 ? this.penBot : this.penHuman; }
  penSetup() {
    const pen = this.pen, W = Math.abs(this.stadium.gx[1]);
    const b = this.ball;
    const spot = W - 118;
    b.x = b.px = spot; b.y = b.py = 0; b.vx = b.vy = 0; b.z = b.vz = 0; b.spin = 0; b.lastTouch = b.prevTouch = null; b.scored = false;
    const sh = this.penShooter(), kp = this.penKeeper();
    sh.disc.x = sh.disc.px = spot - 62; sh.disc.y = sh.disc.py = sh.human ? 0 : rand(-24, 24); sh.disc.vx = sh.disc.vy = 0;
    kp.disc.x = kp.disc.px = W - this.P.playerR - 2; kp.disc.y = kp.disc.py = 0; kp.disc.vx = kp.disc.vy = 0;
    for (const p of [sh, kp]) { p.kickHeld = false; p.armed = false; p.superHeld = false; p.superCharge = 0; p.superBuf = 0; p.curveArm = 0; p.lobArm = false; p.stamina = 1; p.dashCool = 0; }
    this.penHuman.diveMode = (kp === this.penHuman);
    pen.state = 'aim'; pen.t = 0; pen.kicked = false; pen.kickT = 0; pen.keeperTouch = false; pen.awayT = 0; pen.slowT = 0;
    pen.plan = null; pen.dived = false;
    if (sh.bot) { sh.bot.plan = null; sh.bot.penDelay = randi(50, 110); }
    if (kp.bot) { kp.bot.plan = null; kp.bot.react = 0; }
    const n = Math.floor(pen.turn / 2) + 1;
    const who = sh.human ? 'Você bate' : 'Você defende';
    this.say(who, pen.sudden ? 'Morte súbita' : 'Cobrança ' + n + ' de 5', 70);
    this.events.push({ t: 'whistle' });
  }
  penKicked() {
    const pen = this.pen;
    if (pen.kicked) return;
    pen.kicked = true; pen.kickT = this.tick;
    this.penHuman.diveMode = (this.penKeeper() === this.penHuman);
  }
  rulesPenalty() {
    const pen = this.pen;
    if (!pen || pen.done) return;
    const W = Math.abs(this.stadium.gx[1]);
    const kp = this.penKeeper(), sh = this.penShooter();
    const b = this.ball;
    if (pen.state === 'aim') {
      pen.t++;
      // goleiro preso na linha antes da cobrança
      if (!pen.kicked) {
        const kd = kp.disc;
        const minX = W - kd.r - 20, maxX = W - kd.r - 1;
        if (kd.x < minX) { kd.x = minX; if (kd.vx < 0) kd.vx = 0; }
        if (kd.x > maxX) { kd.x = maxX; if (kd.vx > 0) kd.vx = 0; }
        const gy = this.goalHalf[1] + 4;
        if (kd.y < -gy) { kd.y = -gy; if (kd.vy < 0) kd.vy = 0; }
        if (kd.y > gy) { kd.y = gy; if (kd.vy > 0) kd.vy = 0; }
        if (Math.hypot(b.vx, b.vy) > 0.3) this.penKicked();
        // a bola só sai com o batedor
        if (!pen.kicked) { b.x = W - 118; b.y = 0; }
        // tempo esgotado sem cobrança: perde a vez
        if (pen.t > 60 * 15) this.penResult(false, 'Demorou demais');
        return;
      }
      const age = this.tick - pen.kickT;
      const side = this.goalCheck(b);
      if (side === 1) { this.penResult(true); return; }
      const sp = Math.hypot(b.vx, b.vy);
      if (sp < 0.3 && b.z <= 0) pen.slowT++; else pen.slowT = 0;
      if (b.vx < -0.3) pen.awayT++; else pen.awayT = 0;
      if (b.x > W - b.r - 2 && Math.abs(b.y) > this.goalHalf[1] + 1) { this.penResult(false, pen.keeperTouch ? 'Defendeu' : 'Pra fora'); return; }
      if (pen.keeperTouch && pen.awayT > 12) { this.penResult(false, 'Defendeu'); return; }
      if (pen.slowT > 24 || pen.awayT > 30 || age > 60 * 3) { this.penResult(false, pen.keeperTouch ? 'Defendeu' : 'Errou'); return; }
    } else if (pen.state === 'result') {
      pen.t--;
      if (pen.t <= 0) {
        pen.turn++;
        if (this.penOver()) return;
        this.penSetup();
      }
    }
  }
  penResult(goal, why) {
    const pen = this.pen;
    const team = this.penShooter().team;
    pen.res[team].push(goal);
    pen.state = 'result'; pen.t = 85;
    if (goal) {
      this.fxConfetti(this.ball.x, this.ball.y, team);
      this.say('Gol!', team === 0 ? 'Você converteu' : 'O bot converteu', 80, team);
      this.events.push({ t: 'goal', team, minor: true });
    } else {
      const humanKeeper = this.penKeeper() === this.penHuman;
      const txt = why === 'Defendeu' ? (humanKeeper ? 'Você defendeu!' : 'Defendeu!') : (why || 'Errou');
      this.say(txt, '', 80, why === 'Defendeu' && humanKeeper ? 0 : null);
      this.events.push({ t: why === 'Defendeu' ? 'save' : 'miss' });
    }
    this.score = [pen.res[0].filter(Boolean).length, pen.res[1].filter(Boolean).length];
  }
  penOver() {
    const pen = this.pen;
    const a = pen.res[0], b = pen.res[1];
    const ga = a.filter(Boolean).length, gb = b.filter(Boolean).length;
    let over = false;
    if (!pen.sudden) {
      const ra = 5 - a.length, rb = 5 - b.length;
      if (ga + ra < gb || gb + rb < ga) over = true;
      else if (a.length === 5 && b.length === 5) {
        if (ga !== gb) over = true;
        else { pen.sudden = true; }
      }
    } else if (a.length === b.length && ga !== gb) over = true;
    if (over) {
      pen.done = true;
      this.score = [ga, gb];
      this.winner = ga > gb ? 0 : 1;
      this.phase = 'end';
      this.events.push({ t: 'whistle', long: true, end: true });
      this.events.push({ t: 'end', winner: this.winner, penalty: true });
      return true;
    }
    return false;
  }

  /* ---------- poderes (modo Caos) ---------- */
  updatePowers() {
    if (this.phase !== 'play' && this.phase !== 'kickoff') return;
    for (const p of this.players) {
      if (p.power) continue;
      p.powerTimer--;
      if (p.powerTimer <= 0) {
        let id;
        do { id = pick(this.powerList).id; } while (this.powerList.length > 1 && id === p.lastPower && Math.random() < 0.8);
        p.power = id;
        p.lastPower = id;
        if (p.human) this.events.push({ t: 'gotPower', p, id });
      }
    }
  }
  usePower(p) {
    if (!p.power || this.phase === 'goal' || this.phase === 'end') return;
    const id = p.power;
    p.power = null;
    p.powerTimer = this.powerEvery;
    const opp = this.players.filter(q => q.team !== p.team);
    const d = p.disc;
    switch (id) {
      case 'turbo': p.fx.turbo = 180; break;
      case 'canhao': p.fx.canhao = 300; break;
      case 'gigante': p.fx.gigante = 300; break;
      case 'nanico': for (const q of opp) q.fx.nanico = 300; break;
      case 'sabao': for (const q of opp) q.fx.sabao = 240; break;
      case 'congelou':
        for (const q of opp) if (Math.hypot(q.disc.x - d.x, q.disc.y - d.y) < 260) { q.fx.frozen = 96; this.fxBurst(q.disc.x, q.disc.y, '#bfe9ff', 12); }
        break;
      case 'muralha': {
        const t = p.team;
        const g = this.stadium.goals[t];
        if (this.muralha[t]) { this.dynSegs.splice(this.dynSegs.indexOf(this.muralha[t].seg), 1); }
        const x = g.x - g.dir * 30;
        const h = this.goalHalf[t] + 14;
        const seg = mkSeg(x, -h, x, h, { bounce: 0.7, mask: M_BALL, kind: 'muralha', th: 5 });
        this.dynSegs.push(seg);
        this.muralha[t] = { seg, t: 240 };
        this.applyGeometry();
        break;
      }
      case 'ventania': this.windFx = { dir: p.team === 0 ? 1 : -1, t: 240, team: p.team }; break;
      case 'multibola': {
        const atk = p.team === 0 ? 1 : -1;
        for (const s of [-1, 1]) {
          if (this.balls.length >= 5) break;
          const nb = this.addBall(d.x + atk * 30, d.y + s * 26, true);
          nb.vx = atk * 4 + rand(-0.5, 0.5); nb.vy = s * 2.2;
          nb.lastTouch = p;
        }
        break;
      }
      case 'golzao': {
        const t = 1 - p.team;
        this.goalHalf[t] = Math.round(Math.min(this.map.goal * 1.6, this.map.golzaoMax || Infinity));   // (Oficina de estádios: o Golzão cabe no estádio)
        this.golzao[t] = 360;
        this.buildGeometry();
        break;
      }
    }
    this.events.push({ t: 'power', p, id });
    this.fxBurst(d.x, d.y, p.team === 0 ? '#ff7a66' : '#7aa8ff', 16);
  }

  /* ---------- efeitos visuais ---------- */
  fxBurst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(0.6, 3);
      this.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: randi(18, 36), max: 36, color, size: rand(2, 4), kind: 'dot' });
    }
  }
  fxConfetti(x, y, team) {
    const cols = team === 0 ? ['#e23d28', '#ffd34d', '#ffffff'] : ['#2563c9', '#ffd34d', '#ffffff'];
    for (let i = 0; i < 46; i++) {
      const a = rand(0, TAU), s = rand(1, 5.5);
      this.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: randi(40, 90), max: 90, color: pick(cols), size: rand(3, 6), kind: 'conf', rot: rand(0, TAU), vr: rand(-0.3, 0.3) });
    }
  }
  updateFx() {
    const fx = this.fx;
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.x += f.vx; f.y += f.vy; f.vx *= 0.94; f.vy *= 0.94;
      if (f.rot !== undefined) f.rot += f.vr;
      f.life--;
      if (f.life <= 0) fx.splice(i, 1);
    }
    if (fx.length > 400) fx.splice(0, fx.length - 400);
  }
}


  /* ======================================================================= app/public/game/rachao/ponte.js */
/* =====================================================================================================================
   RACHA × RACHÃO · A PONTE DA FÍSICA (app/public/game/rachao/ponte.js · RACHA v97, depois do teste)
   O pedido: "dá pra mesclar, por exemplo, física da bola do Rachão no RACHA, ao contrário também". Os dois jogos são de
   discos vistos de cima, a 60 passos por segundo, mas cada um com as suas medidas (o RACHA em u, 1 u = 19 px; o Rachão em
   px) e o seu jeito de fazer a conta. A ponte fala uma língua só, a do COMPORTAMENTO, medido pelo raio do jogador (R) e
   pelo passo: de que tamanho é a bola perto do jogador, quanto ela pesa no contato, quanto quica no pé e na parede, até
   onde vai um chute, quanto o jogador anda por passo e em quantos passos arranca e para...
   Misturar a BOLA, o JOGADOR ou o CHUTE do outro jogo é: ler o comportamento de sempre do outro e escrever os números
   deste jogo que dão esse comportamento — uma parte de cada vez, sem mudar o comportamento das outras duas (a bola mais
   pesada não deixa o chute mais fraco: a força acompanha). O que um jogo não tem fica de fora (o RACHA não tem a bola no
   alto nem a corrida; o Rachão não tem o PASSE nem o giro da bola no contato).
   O mesmo arquivo roda nas duas páginas: o Rachão carrega ./ponte.js antes da oficina de estádios e o build do RACHA cola
   este arquivo antes da Oficina (window.RachaPonte). Só faz contas: não toca o motor de nenhum dos dois.
   ===================================================================================================================== */
(function (raiz, fabrica) {
  'use strict';
  const P = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = P;
  if (raiz) raiz.RachaPonte = P;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';
  const TPS = 60;
  const PARTES = Object.freeze(['bola', 'jogador', 'chute']);

  /* ---------- o RACHA de sempre: o perfil oficial (PERFIL_V92 do núcleo) e os extras do mapa no Clássico ---------- */
  const RACHA = Object.freeze({ rJog: 2.0, raioChute: 2.5, massaJog: 1.25, velJog: 14.1, forcaPasse: 212.5, forcaChute: 340, rBola: 1.0, massaBola: 10,
    limiteBola: 46.75, fatorBola: 0.99, atritoBola: 0.5, atritoJog: 0.3, quiqueBola: 0, quiqueParede: 0.65, quiqueTrave: 0.6, quiqueRede: 0.15,
    quiqueJogJog: 0.3, quiqueJogParede: 0.65 });
  const RACHA_EXTRA = Object.freeze({ acelJog: 1, freioJog: 1, recuo: 0, giroCurva: 1, massaChute: 1 });
  // os limites do RACHA (os do núcleo e os extras do mapa — o teste confere que são os mesmos de server/partida)
  const LIM_RACHA = Object.freeze({ rBola: [0.5, 1.8], massaBola: [2, 30], massaJog: [0.3, 6], fatorBola: [0.97, 0.998], limiteBola: [20, 90],
    quiqueBola: [0, 0.9], quiqueParede: [0, 1], quiqueTrave: [0, 1], quiqueRede: [0, 0.8], atritoBola: [0, 1], atritoJog: [0, 1], velJog: [7, 24],
    quiqueJogJog: [0, 1], quiqueJogParede: [0, 1], forcaChute: [120, 700], forcaPasse: [80, 500], raioChute: [1.4, 4.2],
    acelJog: [0.02, 1], freioJog: [0.03, 1], recuo: [0, 1], massaChute: [0.5, 2] });
  const FOLGA_CHUTE = 0.5;                              // (o núcleo: o anel do chute passa do corpo pelo menos 0,5 u)
  const PASSE = RACHA.forcaPasse / RACHA.forcaChute;    // (o Rachão não tem PASSE: no RACHA ele fica na proporção de sempre)

  /* ---------- o Rachão de sempre: basePhys (a bola e o jogador do Clássico, o andar do Rachão) ---------- */
  const RACHAO = Object.freeze({ ballDamp: 0.99, ballBounce: 0.5, playerBounce: 0.5, wallBounce: 1, postBounce: 0.5, netBackBounce: 0.1, borderBounce: 0,
    ballR: 10, ballIm: 1, playerR: 15, accel: 0.11, playerDamp: 0.96, sprint: 1.34, kickForce: 5, kickReach: 4, kickAccel: 0.7,
    // os ganchos da oficina de estádios (ausentes = o Rachão de sempre)
    ballMax: 0, ballFootBounce: null, ballWeight: null, andar: 'embalo', moveMax: 0, moveAccel: 1, moveBrake: 1 });
  const IM_JOGADOR = 0.5;                               // (a massa inversa do jogador no Rachão: a bola de massa inversa 1 pesa meio jogador)

  const corta = (v, L) => L ? Math.max(L[0], Math.min(L[1], v)) : v;
  const r4 = v => Math.round(v * 1e4) / 1e4;
  // no embalo do Rachão (soma a arrancada e amortece d a cada passo) o jogador anda a ÷ (1 − d) por passo e perde, até chegar
  // na máxima, d ÷ (1 − d) passos de caminho; na arrancada em linha reta do RACHA (soma a × máxima por passo) a mesma perda
  // sai com a = (1 − d) ÷ (1 + d). Soltou: os dois freiam multiplicando por d.
  const acelDoEmbalo = d => (1 - d) / (1 + d);

  /* ---------- o comportamento (R = o raio do jogador; velocidades em R por passo) ---------- */
  function doRacha(perfil, extra) {
    const p = Object.assign({}, RACHA, perfil || {}), x = Object.assign({}, RACHA_EXTRA, extra || {}), R = p.rJog, uP = TPS * R, pe = p.quiqueBola;
    return {
      bola: { raio: p.rBola / R, peso: p.massaBola / p.massaJog, freio: p.fatorBola, teto: p.limiteBola >= LIM_RACHA.limiteBola[1] - 1e-9 ? Infinity : p.limiteBola / uP,
        pe, parede: Math.max(pe, p.quiqueParede), trave: Math.max(pe, p.quiqueTrave), rede: Math.max(pe, p.quiqueRede), giro: p.atritoBola },
      jogador: { vel: p.velJog / uP, acel: x.acelJog, freio: x.freioJog, corrida: 1, choque: p.quiqueJogJog, muro: p.quiqueJogParede, atrito: p.atritoJog },
      chute: { forca: p.forcaChute * x.massaChute / p.massaBola / uP, passe: p.forcaPasse * x.massaChute / p.massaBola / uP,
        alcance: (Math.max(p.raioChute, R + FOLGA_CHUTE) - R) / R, devagar: 1, recuo: x.recuo }
    };
  }
  function cheioRachao(phys) {                          // (o que o estádio não diz é o do Rachão de sempre)
    const f = Object.assign({}, RACHAO);
    for (const k in phys || {}) if (phys[k] !== undefined) f[k] = phys[k];
    return f;
  }
  function doRachao(phys) {
    const f = cheioRachao(phys), R = f.playerR, bb = f.ballBounce, d = f.playerDamp;
    const pe = f.ballFootBounce != null ? f.ballFootBounce : bb * f.playerBounce;
    const direto = f.andar === 'direto';
    return {
      bola: { raio: f.ballR / R, peso: f.ballWeight != null ? f.ballWeight : IM_JOGADOR / f.ballIm, freio: f.ballDamp, teto: f.ballMax > 0 ? f.ballMax / R : Infinity,
        pe, parede: bb * f.wallBounce, trave: bb * f.postBounce, rede: bb * f.netBackBounce, giro: 0 },
      jogador: direto
        ? { vel: (f.moveMax > 0 ? f.moveMax : f.accel / (1 - d)) / R, acel: f.moveAccel, freio: f.moveBrake, corrida: f.sprint, choque: f.playerBounce * f.playerBounce, muro: f.playerBounce * f.borderBounce, atrito: 0 }
        : { vel: f.accel / (1 - d) / R, acel: acelDoEmbalo(d), freio: 1 - d, corrida: f.sprint, choque: f.playerBounce * f.playerBounce, muro: f.playerBounce * f.borderBounce, atrito: 0 },
      chute: { forca: f.kickForce * f.ballIm / R, passe: f.kickForce * f.ballIm / R * PASSE, alcance: f.kickReach / R, devagar: f.kickAccel, recuo: 0 }
    };
  }
  const ALVOS = { racha: doRacha(RACHA, RACHA_EXTRA), rachao: doRachao({}) };
  const alvo = jogo => ALVOS[jogo];

  /* ---------- escrever no RACHA (perfil e extras resolvidos, inteiros) ---------- */
  // as massas e as forças: a bola pesa `peso` tampinhas no contato e o CHUTE e o PASSE saem com a velocidade pedida, tudo
  // nos limites. Entre as contas que dão certo, a mais perto da de sempre (a bola 10, o multiplicador do chute 1).
  function massas(p, x, peso, ch) {
    const L = LIM_RACHA, uP = TPS * p.rJog, vc = ch.forca * uP, vp = ch.passe * uP;
    const kMin = Math.max(L.forcaChute[0] / vc, L.forcaPasse[0] / vp), kMax = Math.min(L.forcaChute[1] / vc, L.forcaPasse[1] / vp);
    const mbMin = Math.max(L.massaBola[0], peso * L.massaJog[0]), mbMax = Math.min(L.massaBola[1], peso * L.massaJog[1]);
    let melhor = null;
    const prova = mb => {
      if (!(mb >= mbMin - 1e-9 && mb <= mbMax + 1e-9)) return;
      const lo = Math.max(kMin, mb / L.massaChute[1]), hi = Math.min(kMax, mb / L.massaChute[0]);   // (k = massa da bola ÷ multiplicador)
      if (lo > hi + 1e-9) return;
      const k = corta(mb, [lo, hi]), custo = Math.abs(mb - RACHA.massaBola) + 5 * Math.abs(mb / k - 1);
      if (!melhor || custo < melhor.custo - 1e-9) melhor = { mb, k, custo };
    };
    prova(corta(RACHA.massaBola, [mbMin, mbMax]));
    for (let mb = Math.ceil(mbMin * 4) / 4; mb <= mbMax + 1e-9; mb += 0.25) prova(mb);
    if (!melhor) {                                      // (nada cabe: o mais perto dentro dos limites)
      const mb = corta(RACHA.massaBola, [mbMin, Math.max(mbMin, mbMax)]);
      melhor = { mb, k: corta(mb, [Math.min(kMin, kMax), Math.max(kMin, kMax)]) };
    }
    p.massaBola = r4(corta(melhor.mb, L.massaBola)); p.massaJog = r4(corta(melhor.mb / peso, L.massaJog));
    x.massaChute = r4(corta(melhor.mb / melhor.k, L.massaChute));
    p.forcaChute = r4(corta(vc * p.massaBola / x.massaChute, L.forcaChute)); p.forcaPasse = r4(corta(vp * p.massaBola / x.massaChute, L.forcaPasse));
  }
  function noRacha(perfil, extra, parte, a) {
    const p = Object.assign({}, RACHA, perfil || {}), x = Object.assign({}, RACHA_EXTRA, extra || {}), R = p.rJog, uP = TPS * R, L = LIM_RACHA;
    const antes = doRacha(p, x), poe = (o, k, v) => { o[k] = r4(corta(v, L[k])); };
    if (parte === 'bola') {
      poe(p, 'rBola', a.raio * R); poe(p, 'fatorBola', a.freio); poe(p, 'limiteBola', a.teto === Infinity ? L.limiteBola[1] : a.teto * uP);
      poe(p, 'quiqueBola', a.pe); poe(p, 'quiqueParede', a.parede); poe(p, 'quiqueTrave', a.trave); poe(p, 'quiqueRede', a.rede); poe(p, 'atritoBola', a.giro);
      massas(p, x, a.peso, antes.chute);
    } else if (parte === 'jogador') {
      poe(p, 'velJog', a.vel * uP); poe(x, 'acelJog', a.acel); poe(x, 'freioJog', a.freio);
      poe(p, 'quiqueJogJog', a.choque); poe(p, 'quiqueJogParede', a.muro); poe(p, 'atritoJog', a.atrito);
    } else if (parte === 'chute') {
      poe(p, 'raioChute', R * (1 + a.alcance)); poe(x, 'recuo', a.recuo);
      massas(p, x, antes.bola.peso, a);
    }
    return { perfil: p, extra: x };
  }

  /* ---------- escrever no Rachão (a física do estádio; arred(k, v) põe no passo e nos limites do editor) ---------- */
  // O que é de quem no Rachão: a BOLA é o tamanho, o freio, o teto, os quiques e o peso NO CONTATO (ballWeight); o CHUTE é a
  // velocidade que a bola ganha (kickForce × ballIm — a leveza da bola também muda o super chute e a cavadinha, por isso ela é
  // do chute), o alcance e o andar mais devagar com o chute armado. Cada parte guarda o comportamento das outras: o chute que
  // muda a leveza põe o peso no contato à parte; o jogador que muda o empurrão põe o quique no pé à parte.
  function noRachao(phys, parte, a, arred) {
    const ar = arred || ((k, v) => v), f = cheioRachao(phys), R = f.playerR, antes = doRachao(f);
    const poe = (k, v) => { f[k] = v == null ? null : ar(k, v); };
    const igual = (k, x, y) => Math.abs(ar(k, x) - ar(k, y)) < 1e-9;      // (no passo do controle: o que o editor grava)
    const pePreso = pe => { poe('ballFootBounce', igual('ballFootBounce', pe, f.ballBounce * f.playerBounce) ? null : pe); };
    const pesoPreso = peso => { poe('ballWeight', igual('ballWeight', peso, IM_JOGADOR / f.ballIm) ? null : peso); };
    if (parte === 'bola') {
      poe('ballR', a.raio * R); poe('ballDamp', a.freio); poe('ballMax', a.teto === Infinity ? 0 : a.teto * R);
      // o quique é o produto (bola × parede, bola × trave...): a bola fica com o maior e as paredes acompanham
      poe('ballBounce', corta(Math.max(a.parede, a.trave), [0.1, 1]));
      poe('wallBounce', a.parede / f.ballBounce); poe('postBounce', corta(a.trave / f.ballBounce, [0.1, 1])); poe('netBackBounce', corta(a.rede / f.ballBounce, [0, 1]));
      pePreso(a.pe); pesoPreso(a.peso);
    } else if (parte === 'jogador') {
      const peAntes = antes.bola.pe, d = 1 - a.freio;
      const embalo = d >= 0.9 && d < 1 && Math.abs(a.acel - acelDoEmbalo(d)) < 0.002;
      if (embalo) { f.andar = 'embalo'; poe('playerDamp', d); poe('accel', a.vel * R * (1 - f.playerDamp)); f.moveMax = 0; f.moveAccel = 1; f.moveBrake = 1; }
      else { f.andar = 'direto'; poe('moveMax', a.vel * R); poe('moveAccel', a.acel); poe('moveBrake', a.freio); }
      poe('sprint', corta(a.corrida, [1, 2])); poe('playerBounce', Math.sqrt(a.choque));
      pePreso(peAntes);                                   // (a bola continua quicando no pé como antes)
    } else if (parte === 'chute') {
      const pesoAntes = antes.bola.peso;
      poe('ballIm', 1); poe('kickForce', a.forca * R / f.ballIm); poe('kickReach', a.alcance * R); poe('kickAccel', a.devagar);
      pesoPreso(pesoAntes);                               // (a bola continua pesando o mesmo no contato)
    }
    return f;
  }

  /* ---------- qual é cada parte agora: a do RACHA, a do Rachão ou ajustada ('') ---------- */
  const perto = (a, b) => a === b || (a == null && b == null) || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 1e-3 + 4e-3 * Math.max(Math.abs(a), Math.abs(b)));
  const iguais = (o1, o2, chaves) => chaves.every(k => perto(o1[k], o2[k]));
  const CHAVES_RACHA = Object.keys(LIM_RACHA);
  function qualRacha(perfil, extra, parte) {
    const ag = Object.assign({}, RACHA, perfil || {}, RACHA_EXTRA, extra || {});
    for (const j of ['racha', 'rachao']) {
      const n = noRacha(perfil, extra, parte, ALVOS[j][parte]);
      if (iguais(Object.assign({}, n.perfil, n.extra), ag, CHAVES_RACHA)) return j;
    }
    return '';
  }
  const CHAVES_RACHAO = Object.keys(RACHAO);
  function qualRachao(phys, parte, arred) {             // (a física já gravada pelo editor: comparada como está)
    const f = cheioRachao(phys);
    for (const j of ['rachao', 'racha']) if (iguais(noRachao(f, parte, ALVOS[j][parte], arred), f, CHAVES_RACHAO)) return j;
    return '';
  }

  /* ---------- as frases (o editor de cada jogo explica o que a mistura faz) ---------- */
  const TEXTOS = {
    rachao: {
      bola: { rachao: 'A bola do Rachão: leve, quica no pé e na parede, sem velocidade máxima.',
        racha: 'A bola do RACHA: metade do tamanho do jogador, pesada no contato (gruda no pé), quica 65% na parede e tem velocidade máxima (até o super chute para nela).' },
      jogador: { rachao: 'O jogador do Rachão: embala aos poucos, desliza ao soltar e corre com o fôlego.',
        racha: 'O jogador do RACHA: arranca e para na hora, sem corrida e um pouco mais devagar.' },
      chute: { rachao: 'O chute do Rachão: a força fixa do Clássico; com o chute armado, o jogador anda mais devagar.',
        racha: 'O chute do RACHA: um pouco mais fraco, e o jogador não perde velocidade com o chute armado.' } },
    racha: {
      bola: { racha: 'A bola de sempre do RACHA.',
        rachao: 'A bola do Rachão: maior, mais leve que a tampinha (quica no pé), quica a metade na parede e não tem velocidade máxima.' },
      jogador: { racha: 'A tampinha de sempre do RACHA: arranca e para na hora.',
        rachao: 'A tampinha do Rachão: mais rápida, mas embala aos poucos e desliza ao soltar.' },
      chute: { racha: 'O chute e o passe de sempre do RACHA.',
        rachao: 'O chute do Rachão: um pouco mais forte (o passe acompanha).' } }
  };
  const texto = (editor, parte, jogo) => jogo ? TEXTOS[editor][parte][jogo] : 'Ajustada nos números.';

  return Object.freeze({ VERSAO: 'v97.1', TPS, PARTES, RACHA, RACHA_EXTRA, LIM_RACHA, RACHAO, IM_JOGADOR, acelDoEmbalo,
    doRacha, doRachao, alvo, noRacha, noRachao, qualRacha, qualRachao, texto });
});

  /* ======================================================================= app/public/game/rachao/quadro.js */
/* =====================================================================================================================
   RACHÃO · O QUADRO DA PARTIDA ONLINE (app/public/game/rachao/quadro.js · RACHA v98)
   O pedido: "da pra criar sala de rachão também on-line". Nas salas online do Rachão quem joga a partida é o SERVIDOR
   das salas, com o motor do Rachão (o mesmo código da página: server/partida/rachao_motor.js é gerado dela). Este arquivo
   é a língua que os dois falam, e é o MESMO nas duas pontas (a página carrega ./quadro.js; o servidor recebe uma cópia
   colada no motor gerado):
     · o COMANDO de quem joga (aparelho → servidor): a direção, os botões segurados e os contadores dos toques (cavadinha,
       curvas, poder, chute e super chute rápidos) — um toque nunca se perde, mesmo se um comando se perder no caminho;
     · o QUADRO (servidor → aparelhos, 30 por segundo): o estado inteiro da partida que importa para desenhar e para a
       previsão do aparelho (as tampinhas, as bolas, a fase, o relógio, o placar, o vento, a muralha, o golzão, a faixa
       do GOL!) e os eventos desde o quadro anterior (os sons, os confetes, os poderes);
     · o APLICA: o aparelho põe o quadro dentro de uma partida do próprio motor (para desenhar com o desenho do Rachão e
       prever a sua tampinha e a bola com a mesma física do servidor).
   Só números e textos curtos: nada de código, nada de HTML (os nomes vêm da sala; os textos da faixa saem do motor).
   ===================================================================================================================== */
(function (raiz, fabrica) {
  'use strict';
  const Q = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = Q;
  if (raiz) raiz.RachaoQuadro = Q;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';
  const VERSAO = 1;
  const FASES = ['kickoff', 'play', 'goal', 'end'];
  const EFEITOS = ['turbo', 'canhao', 'gigante', 'nanico', 'sabao', 'frozen'];
  const PODERES = ['turbo', 'canhao', 'gigante', 'nanico', 'muralha', 'ventania', 'multibola', 'golzao', 'sabao', 'congelou'];   // (a ordem do POWERS do motor)
  const MAX_BOLAS = 8, MAX_EVENTOS = 48, MAX_TEXTO = 60;
  const n2 = v => Math.round(v * 100) / 100, n3 = v => Math.round(v * 1000) / 1000, n4 = v => Math.round(v * 10000) / 10000;
  const fin = (v, d) => typeof v === 'number' && Number.isFinite(v) ? v : d;
  const lim = (v, a, b, d) => { v = fin(v, d); return v < a ? a : v > b ? b : v; };   // (só número de verdade: texto ou objeto vira o padrão)
  const lista = v => Array.isArray(v) ? v : null;
  const cont = v => Number.isInteger(v) && v >= 0 && v < 2e9 ? v : 0;
  const txt = v => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, ' ').slice(0, MAX_TEXTO) : '';

  /* ---------------------------------------------------------------- o comando (aparelho → servidor)
     {seq, x, y, f, kn, lb, cl, cr, pw, st}: x, y = a direção NO CAMPO (−1 a 1; o aparelho já desvirou a tela em pé);
     f = os botões segurados (1 chutar, 2 correr, 4 super chute); os contadores só sobem: kn = toque rápido no chutar,
     st = toque rápido no super, lb = cavadinha, cl/cr = curva para a esquerda/direita, pw = usar o poder. */
  const CONTADORES = ['kn', 'st', 'lb', 'cl', 'cr', 'pw'];
  function comando(m) {
    if (!m || typeof m !== 'object') return null;
    const seq = m.seq;
    if (!Number.isInteger(seq) || seq < 0 || seq >= 2e9) return null;
    const c = { seq, x: n3(lim(m.x, -1, 1, 0)), y: n3(lim(m.y, -1, 1, 0)), f: Number.isInteger(m.f) ? m.f & 7 : 0 };
    const h = Math.hypot(c.x, c.y); if (h > 1) { c.x = n3(c.x / h); c.y = n3(c.y / h); }
    for (const k of CONTADORES) c[k] = cont(m[k]);
    return c;
  }

  /* ---------------------------------------------------------------- o quadro (servidor → aparelhos) */
  const bits = p => (p.armed ? 1 : 0) | (p.kickHeld ? 2 : 0) | (p.superHeld ? 4 : 0) | (p.sprinting ? 8 : 0) | (p.exhausted ? 16 : 0)
    | (p.lobArm ? 32 : 0) | (p.diveMode ? 64 : 0) | (p.human ? 0 : 128) | (p.input.kick ? 256 : 0) | (p.input.sprint ? 512 : 0) | (p.input.superKick ? 1024 : 0);
  function jogador(T, p) {
    const d = p.disc, inp = p.input;
    const a = [n2(d.x), n2(d.y), n3(d.vx), n3(d.vy), n2(d.r), bits(p), n3(p.stamina), n3(p.superCharge), p.superBuf | 0, n3(p.superPow || 0), p.kickFlash | 0, p.dashCool | 0,
      p.lastKickT === undefined ? 99 : Math.min(99, T.tick - p.lastKickT), n3(fin(inp.mx, 0)), n3(fin(inp.my, 0)), p.curveArm | 0, n2(fin(p.aimX, 0)), n2(fin(p.aimY, 0)),
      p.power ? PODERES.indexOf(p.power) : -1, p.powerTimer | 0, p.goals | 0, p.assists | 0];
    if (T.mode === 'chaos') a.push(EFEITOS.map(k => p.fx[k] | 0));
    return a;
  }
  const bola = b => [n2(b.x), n2(b.y), n3(b.vx), n3(b.vy), n2(b.z), n3(b.vz), n4(b.spin || 0), b.fire | 0, b.extra ? Math.max(1, b.life | 0) : 0];
  // o estado da partida agora (acks: o último comando de cada um que o servidor já usou; ev: os eventos desde o anterior)
  function quadro(T, acks, ev) {
    const d = { v: VERSAO, t: T.tick, f: Math.max(0, FASES.indexOf(T.phase)), p: T.phaseT | 0, tm: n3(T.time), s: [T.score[0] | 0, T.score[1] | 0],
      o: T.overtime ? 1 : 0, e: T.endPending ? 1 : 0, w: T.winner | 0, k: T.kickoffTeam | 0, g: [n2(T.goalHalf[0]), n2(T.goalHalf[1])], z: [T.golzao[0] | 0, T.golzao[1] | 0],
      m: [T.muralha[0] ? T.muralha[0].t | 0 : 0, T.muralha[1] ? T.muralha[1].t | 0 : 0],
      j: T.players.map(p => jogador(T, p)), b: T.balls.slice(0, MAX_BOLAS).map(bola), a: acks || [] };
    if (T.map.wind) { const w = T.wind; d.vt = [n4(w.x), n4(w.y), fin(w.dx, 0), fin(w.dy, 0), w.t | 0]; }
    if (T.windFx) d.vf = [T.windFx.dir, T.windFx.t | 0, T.windFx.team | 0];
    if (T.banner) { const B = T.banner; d.bn = [txt(B.text), txt(B.sub), B.t | 0, B.max | 0, B.color === 0 || B.color === 1 ? B.color : -1]; }
    if (ev && ev.length) d.ev = ev.slice(-MAX_EVENTOS);
    return d;
  }
  // um evento do motor → o que vai na rede (null = não vai: os do treino, dos pênaltis…)
  function evento(T, e) {
    const i = q => q ? T.players.indexOf(q) : -1;
    switch (e.t) {
      case 'kick': return ['k', i(e.p), n2(e.power), n2(e.x), n2(e.y), (e.header ? 1 : 0) | (e.lob ? 2 : 0) | (e.canhao ? 4 : 0) | (e.superKick ? 8 : 0)];
      case 'touch': return ['t', n2(e.imp)];
      case 'post': return ['po', n2(e.imp), n2(e.x), n2(e.y), e.bar ? 1 : 0];
      case 'net': return ['n', n2(e.imp)];
      case 'wall': return ['wa', n2(e.imp)];
      case 'bounce': return ['bo', n2(e.imp)];
      case 'bumper': return ['bu', n2(e.imp), n2(e.x), n2(e.y)];
      case 'whistle': return ['wh', e.long ? 1 : 0, e.end ? 1 : 0];
      case 'goal': return ['g', e.team | 0, i(e.scorer), e.own ? 1 : 0, i(e.assist), e.extra ? 1 : 0, e.minor ? 1 : 0];
      case 'power': return ['pw', i(e.p), PODERES.indexOf(e.id)];
      case 'gotPower': return ['gp', i(e.p), PODERES.indexOf(e.id)];
      case 'arm': return ['ar', i(e.p)];
      case 'dive': return ['dv', i(e.p)];
      case 'wind': return ['wi'];
      case 'pop': return ['pp'];
      case 'end': return ['en', e.winner | 0];
    }
    return null;
  }
  // os efeitos que o motor desenha (os confetes do gol, as faíscas do poder): no servidor viram eventos com o lugar
  const confete = (x, y, team) => ['fc', n2(x), n2(y), team === 1 ? 1 : 0];
  const faisca = (x, y, cor, n) => ['fb', n2(x), n2(y), /^#[0-9a-f]{6}$/i.test(cor) ? cor : '#ffffff', Math.max(1, Math.min(24, n | 0))];

  /* ---------------------------------------------------------------- o aplica (no aparelho) */
  // a muralha do poder (a mesma conta do usePower do motor): um segmento na frente do gol
  function poeMuralha(T, t, ticks, mkSeg, M_BALL) {
    tiraMuralha(T, t);
    const g = T.stadium.goals[t]; if (!g) return;
    const x = g.x - g.dir * 30, h = T.goalHalf[t] + 14;
    const seg = mkSeg(x, -h, x, h, { bounce: 0.7, mask: M_BALL, kind: 'muralha', th: 5 });
    T.dynSegs.push(seg); T.muralha[t] = { seg, t: ticks }; T.applyGeometry();
  }
  function tiraMuralha(T, t) {
    const mw = T.muralha[t]; if (!mw) return;
    const k = T.dynSegs.indexOf(mw.seg); if (k >= 0) T.dynSegs.splice(k, 1);
    T.muralha[t] = null; T.applyGeometry();
  }
  // põe o quadro d na partida T do aparelho (a mesma montagem do servidor: os mesmos jogadores, na mesma ordem)
  // o = {mkSeg, M_BALL} (do motor da página)
  function aplica(T, d, o) {                             // (o quadro fora do formato não entra: nada pela metade)
    if (!d || d.v !== VERSAO || !Array.isArray(d.j) || !Array.isArray(d.b) || !Array.isArray(d.s) || !Array.isArray(d.g) || !Array.isArray(d.z) || !Array.isArray(d.m)) return false;
    T.tick = d.t | 0; T.phase = FASES[d.f] || 'play'; T.phaseT = d.p | 0; T.time = fin(d.tm, 0);
    T.score[0] = d.s[0] | 0; T.score[1] = d.s[1] | 0; T.overtime = !!d.o; T.endPending = !!d.e; T.winner = d.w | 0; T.kickoffTeam = d.k === 1 ? 1 : 0;
    // o gol (o Golzão muda o tamanho: o estádio é refeito, como no motor) e a muralha
    const g0 = lim(d.g[0], 4, 400, T.map.goal), g1 = lim(d.g[1], 4, 400, T.map.goal);
    if (Math.abs(g0 - T.goalHalf[0]) > 1e-6 || Math.abs(g1 - T.goalHalf[1]) > 1e-6) {
      const mu = [T.muralha[0] && T.muralha[0].t, T.muralha[1] && T.muralha[1].t];
      tiraMuralha(T, 0); tiraMuralha(T, 1);
      T.goalHalf[0] = g0; T.goalHalf[1] = g1; T.buildGeometry();
      for (let t = 0; t < 2; t++) if (mu[t]) poeMuralha(T, t, mu[t], o.mkSeg, o.M_BALL);
    }
    T.golzao[0] = d.z[0] | 0; T.golzao[1] = d.z[1] | 0;
    for (let t = 0; t < 2; t++) {
      const m = d.m[t] | 0;
      if (m > 0 && !T.muralha[t]) poeMuralha(T, t, m, o.mkSeg, o.M_BALL);
      else if (m <= 0 && T.muralha[t]) tiraMuralha(T, t);
      else if (m > 0) T.muralha[t].t = m;
    }
    const vt = lista(d.vt), vf = lista(d.vf);
    if (vt && T.map.wind) { const w = T.wind; w.x = fin(vt[0], 0); w.y = fin(vt[1], 0); w.dx = fin(vt[2], 0); w.dy = fin(vt[3], 0); w.t = vt[4] | 0; }
    T.windFx = vf ? { dir: vf[0] < 0 ? -1 : 1, t: vf[1] | 0, team: vf[2] === 1 ? 1 : 0 } : null;
    if (lista(d.bn)) {                                  // (a faixa: a mesma enquanto o texto não muda; o tempo dela vem do servidor)
      const B = T.banner, cor = d.bn[4] === 0 || d.bn[4] === 1 ? d.bn[4] : null;
      if (B && B.text === txt(d.bn[0]) && B.sub === txt(d.bn[1]) && B.color === cor && B.max === (d.bn[3] | 0)) B.t = d.bn[2] | 0;
      else T.banner = { text: txt(d.bn[0]), sub: txt(d.bn[1]), t: d.bn[2] | 0, max: d.bn[3] | 0, color: cor };
    } else T.banner = null;
    const n = Math.min(T.players.length, d.j.length);
    for (let i = 0; i < n; i++) {
      const p = T.players[i], a = d.j[i]; if (!Array.isArray(a)) continue;
      const dc = p.disc, f = a[5] | 0, inp = p.input;
      dc.x = fin(a[0], dc.x); dc.y = fin(a[1], dc.y); dc.vx = fin(a[2], 0); dc.vy = fin(a[3], 0); dc.r = lim(a[4], 2, 80, dc.r);
      p.armed = !!(f & 1); p.kickHeld = !!(f & 2); p.superHeld = !!(f & 4); p.sprinting = !!(f & 8); p.exhausted = !!(f & 16); p.lobArm = !!(f & 32); p.diveMode = !!(f & 64);
      p.rcBot = !!(f & 128);
      p.stamina = lim(a[6], 0, 1, 1); p.superCharge = lim(a[7], 0, 1, 0); p.superBuf = a[8] | 0; p.superPow = lim(a[9], 0, 1, 0); p.kickFlash = a[10] | 0; p.dashCool = a[11] | 0;
      const idade = a[12] | 0; p.lastKickT = idade >= 99 ? undefined : T.tick - idade;
      inp.mx = lim(a[13], -1, 1, 0); inp.my = lim(a[14], -1, 1, 0); inp.kick = !!(f & 256); inp.sprint = !!(f & 512); inp.superKick = !!(f & 1024);
      inp.lob = inp.curveL = inp.curveR = inp.power = inp.cancel = inp.superCancel = inp.kickNew = false;
      p.curveArm = a[15] < 0 ? -1 : a[15] > 0 ? 1 : 0; p.aimX = fin(a[16], 0); p.aimY = fin(a[17], 0);
      p.power = Number.isInteger(a[18]) && a[18] >= 0 && a[18] < PODERES.length ? PODERES[a[18]] : null; p.powerTimer = a[19] | 0; p.goals = a[20] | 0; p.assists = a[21] | 0;
      if (Array.isArray(a[22])) EFEITOS.forEach((k, j) => { p.fx[k] = a[22][j] | 0; });
      else for (const k of EFEITOS) p.fx[k] = 0;
    }
    // as bolas (o Multibola põe e tira as extras)
    const nb = Math.max(1, Math.min(MAX_BOLAS, d.b.length));
    while (T.balls.length < nb) T.addBall(0, 0, true);
    while (T.balls.length > nb) T.removeBall(T.balls[T.balls.length - 1]);
    for (let i = 0; i < nb; i++) {
      const b = T.balls[i], a = d.b[i]; if (!Array.isArray(a)) continue;
      b.x = fin(a[0], 0); b.y = fin(a[1], 0); b.vx = fin(a[2], 0); b.vy = fin(a[3], 0); b.z = Math.max(0, fin(a[4], 0)); b.vz = fin(a[5], 0); b.spin = fin(a[6], 0); b.fire = a[7] | 0;
      b.extra = i > 0 && a[8] > 0; b.life = b.extra ? a[8] | 0 : 0;
    }
    return true;
  }
  // um evento da rede → o evento no formato do motor (com o jogador do aparelho), para os sons e os avisos
  function deEvento(T, a) {
    if (!Array.isArray(a) || typeof a[0] !== 'string') return null;
    const P = i => Number.isInteger(i) && i >= 0 ? T.players[i] || null : null;
    const pod = i => Number.isInteger(i) && i >= 0 && i < PODERES.length;
    switch (a[0]) {
      case 'k': return { t: 'kick', p: P(a[1]), power: fin(a[2], 5), x: fin(a[3], 0), y: fin(a[4], 0), header: !!(a[5] & 1), lob: !!(a[5] & 2), canhao: !!(a[5] & 4), superKick: !!(a[5] & 8) };
      case 't': return { t: 'touch', imp: fin(a[1], 0) };
      case 'po': return { t: 'post', imp: fin(a[1], 0), x: fin(a[2], 0), y: fin(a[3], 0), bar: !!a[4] };
      case 'n': return { t: 'net', imp: fin(a[1], 0) };
      case 'wa': return { t: 'wall', imp: fin(a[1], 0) };
      case 'bo': return { t: 'bounce', imp: fin(a[1], 0) };
      case 'bu': return { t: 'bumper', imp: fin(a[1], 0), x: fin(a[2], 0), y: fin(a[3], 0) };
      case 'wh': return { t: 'whistle', long: !!a[1], end: !!a[2] };
      case 'g': return { t: 'goal', team: a[1] === 1 ? 1 : 0, scorer: P(a[2]), own: !!a[3], assist: P(a[4]), extra: !!a[5], minor: !!a[6] };
      case 'pw': return pod(a[2]) && P(a[1]) ? { t: 'power', p: P(a[1]), id: PODERES[a[2]] } : null;
      case 'gp': return pod(a[2]) && P(a[1]) ? { t: 'gotPower', p: P(a[1]), id: PODERES[a[2]] } : null;
      case 'ar': return P(a[1]) ? { t: 'arm', p: P(a[1]) } : null;
      case 'dv': return P(a[1]) ? { t: 'dive', p: P(a[1]) } : null;
      case 'wi': return { t: 'wind' };
      case 'pp': return { t: 'pop' };
      case 'en': return { t: 'end', winner: a[1] | 0 };
      case 'fc': return { t: 'fx', confete: true, x: fin(a[1], 0), y: fin(a[2], 0), team: a[3] === 1 ? 1 : 0 };
      case 'fb': return { t: 'fx', x: fin(a[1], 0), y: fin(a[2], 0), cor: /^#[0-9a-f]{6}$/i.test(a[3]) ? a[3] : '#ffffff', n: Math.max(1, Math.min(24, a[4] | 0)) };
    }
    return null;
  }

  /* ---------------------------------------------------------------- a montagem e o passo previsto (as duas pontas) */
  // a partida da sala, montada IGUAL no servidor e em cada aparelho: o modo e as opções da sala, os jogadores na ordem dos
  // lugares (lugar s → time s ÷ n, camisa s mod n + 1). humano(s) → o controle do lugar (null = bot).
  function cria(TopMatch, mapa, opc, n, lugares, humano) {
    const T = new TopMatch({ mode: opc.modo === 'chaos' ? 'chaos' : 'match', map: mapa, teams: [0, 0], humans: [], diff: opc.nivel, time: opc.tempo, goals: opc.gols, run: opc.corrida,
      lob: opc.chutes.lob !== false, curve: opc.chutes.curve !== false, superKick: opc.chutes.superKick !== false });
    for (const s of lugares) {
      const h = humano ? humano(s) : null;
      const p = T.addPlayer(Math.floor(s / n) ? 1 : 0, { human: h || null, num: s % n + 1 });
      p.lugar = s;
    }
    T.resetPositions();
    T.events.length = 0;
    return T;
  }
  // um passo do motor no aparelho (a previsão): a física de sempre, sem a lógica da partida (os gols, o relógio do fim, os
  // poderes, os bots) — essa é do servidor e chega no quadro. eu = o jogador do aparelho (ou null) e c = o comando dele
  // neste passo ({x, y, f} e os toques que subiram: {kn, st, lb, cl, cr}); os outros andam com o último comando do quadro.
  function preve(T, eu, c) {
    T.tick++;
    if (T.banner) { T.banner.t--; if (T.banner.t <= 0) T.banner = null; }
    for (const d of T.world.discs) { d.px = d.x; d.py = d.y; d.pz = d.z; }
    if (eu && c) {
      const inp = eu.input;
      inp.mx = c.x; inp.my = c.y; inp.kick = !!(c.f & 1); inp.sprint = !!(c.f & 2); inp.superKick = !!(c.f & 4);
      if (c.kn) { inp.kickNew = true; inp.kick = true; }
      if (c.st) inp.superKick = true;
      if (c.lb) inp.lob = true;
      if (c.cl) inp.curveL = true;
      if (c.cr) inp.curveR = true;
      inp.power = false;                                   // (o poder é do servidor: ele mexe nos outros e no campo)
    }
    for (const p of T.players) T.controlPlayer(p);
    if (T.map.wind && T.wind.t <= 0) T.wind.t = 1;         // (a troca do vento é sorteada no servidor: aqui ele só sopra)
    T.applyEnvironment();
    T.world.step(true);
    for (const b of T.balls) T.integrateBall(b);          // (como no motor: a bola extra que estoura sai no meio da volta)
    for (const p of T.players) T.dampPlayer(p);
    T.world.contactsClassic();
    T.processTouches();
    if (T.phase === 'kickoff') T.kickoffBarrier();
    if (T.phase === 'play') T.time += 1 / 60;
  }

  return Object.freeze({ VERSAO, FASES, EFEITOS, PODERES, CONTADORES, MAX_BOLAS, MAX_EVENTOS, comando, quadro, evento, confete, faisca, aplica, deEvento, poeMuralha, tiraMuralha, cria, preve });
});

  /* ======================================================================= app/public/game/rachao/estadios.js (0 a 3) */
  const EST = (function () {
'use strict';

const VERSAO = 1, CHAVE = 'rachao.estadios', MAX_ESTADIOS = 40, LIM_CODIGO = 24000, PREFIXO = 'RACHAO1.';
const ORIGINAIS = MAPS.slice();                                   // (os 17 campos do Rachão, antes dos estádios de quem joga)
const ORIG_POR_ID = {}; for (const m of ORIGINAIS) ORIG_POR_ID[m.id] = m;
const PARAMS = new URLSearchParams(location.search);
const NA_OFICINA = PARAMS.get('na') === 'oficina' && window.parent !== window;   // aberto pela Oficina do RACHA (numa moldura)
const VOLTA_RACHA = PARAMS.get('volta') === 'racha';             // aberto pela Oficina do RACHA numa aba (sem a moldura)
const ALVO = location.origin && location.origin !== 'null' ? location.origin : '*';
const PHYS_PADRAO = basePhys();

const LIM = {
  nome: 28, desc: 90, W: [240, 800], H: [130, 380], canto: [0, 240], impulso: [0, 12], circulo: [24, 150], margem: [20, 90],
  gol: [16, 170], fundo: [18, 80], recuo: [40, 300], forca: [2, 14], len: [20, 420], th: [4, 22], a: [-90, 90],
  r: { poste: [5, 40], bumper: [8, 40], vaso: [8, 36], lama: [14, 140], poca: [14, 140] },
  bola: [0.85, 0.999], andar: [0.2, 1], freio: [0.9, 1], ventoForca: [0.25, 3], ventoTroca: [2, 20], poder: [3, 30],
  pecas: 48, copias: 160
};
const TIPOS = ['poste', 'bumper', 'vaso', 'cerca', 'lama', 'poca'];
const N_TIPO = { poste: 'Poste', bumper: 'Para-choque', vaso: 'Vaso', cerca: 'Cerca viva', lama: 'Lama', poca: 'Poça' };
const PECA_PADRAO = { poste: { r: 10 }, bumper: { r: 20, forca: 8.5 }, vaso: { r: 20 }, cerca: { len: 64, th: 14, a: 0 },
  lama: { r: 46, bola: 0.955, andar: 0.6, freio: 0.95 }, poca: { r: 38, bola: 0.93, andar: 0.85, freio: 1 } };
const SIMS = ['n', 'x', 'y', 'xy', 'c'];
const N_SIM = { n: 'Só uma', x: 'Dos dois lados', y: 'Em cima e embaixo', xy: 'Nos 4 cantos', c: 'Do outro lado, girada' };
const PISOS = [['grass', 'Grama'], ['stadium', 'Estádio'], ['check', 'Xadrez'], ['wood', 'Madeira'], ['asphalt', 'Asfalto'], ['dirt', 'Terra'],
  ['sand', 'Areia'], ['ice', 'Gelo'], ['night', 'Noite'], ['rain', 'Chuva'], ['moon', 'Lua'], ['neon', 'Neon'], ['court', 'Quadra'],
  ['clay', 'Saibro'], ['garden', 'Jardim'], ['dry', 'Seca'], ['wall', 'Muro']];
const N_PISO = {}; for (const [k, n] of PISOS) N_PISO[k] = n;
const DICA_PISO = { stadium: 'torcida em volta', asphalt: 'casas em volta', sand: 'mar e guarda-sóis', ice: 'linhas de hóquei', night: 'escuro, com refletores',
  rain: 'chove durante o jogo', moon: 'estrelas e a Terra', neon: 'linhas que brilham', clay: 'muro de pedra', wall: 'tijolos atrás dos gols', wood: 'área em D',
  court: 'quadra pintada', dirt: 'linhas tortas', check: 'grama em xadrez', garden: 'grama listrada', dry: 'grama seca' };
// a física: [grupo, chave, rótulo, mínimo, máximo, passo, dica, extra] — extra.so: só nesse jeito de andar; extra.auto: sem
// valor, o motor calcula (o quique no pé pelo quique da bola, o peso no contato pela leveza); extra.zero: 0 desliga
const FIS = [
  ['Bola', 'ballDamp', 'Rolar no chão', 0.95, 0.999, 0.001, 'Mais alto: a bola rola mais longe antes de parar.'],
  ['Bola', 'airDamp', 'Voar no alto', 0.98, 0.9995, 0.0005, 'Mais alto: a cavadinha vai mais longe.'],
  ['Bola', 'ballBounce', 'Quique nos jogadores e nas traves', 0.1, 1, 0.01, ''],
  ['Bola', 'wallBounce', 'Quique nas paredes', 0, 1.5, 0.01, 'Acima de 1, a parede devolve mais forte; junto com o quique da bola, no máximo a bola volta na velocidade em que bateu.'],
  ['Bola', 'landBounce', 'Quique no chão', 0, 0.9, 0.01, 'Quando a bola cai depois da cavadinha.'],
  ['Bola', 'ballR', 'Tamanho da bola', 6, 18, 0.5, ''],                // (menor que 6, a bola rápida atravessa a parede: 3 subpassos por passo)
  ['Bola', 'ballIm', 'Leveza da bola', 0.5, 1.6, 0.05, 'Mais alto: mais leve, o chute manda mais longe.'],
  ['Bola', 'ballMax', 'Velocidade máxima da bola', 0, 15, 0.01, 'A bola não passa disto (o chute do passo passa só no passo do chute). Zero: sem limite, como no Rachão.', { zero: true }],
  ['Bola', 'ballFootBounce', 'Quique no pé', 0, 0.9, 0.01, 'Quanto a bola volta quando bate no jogador. Zero: gruda no pé, como no RACHA.', { auto: true }],
  ['Bola', 'ballWeight', 'Peso no contato', 0.25, 12, 0.05, 'Quantos jogadores a bola pesa quando eles se batem (o chute não muda). A do RACHA pesa 8.', { auto: true }],
  ['Jogador', 'accel', 'Arrancada', 0.05, 0.2, 0.005, '', { so: 'embalo' }],
  ['Jogador', 'playerDamp', 'Deslizar', 0.92, 0.99, 0.001, 'Mais alto: o jogador escorrega mais, como no gelo.', { so: 'embalo' }],
  ['Jogador', 'moveMax', 'Velocidade máxima', 0.6, 5, 0.01, 'O tanto que ele anda por passo. O do RACHA: 1,76 no tamanho de sempre.', { so: 'direto' }],
  ['Jogador', 'moveAccel', 'Arrancada', 0.02, 1, 0.01, '100%: chega na máxima no primeiro passo, como a tampinha.', { so: 'direto' }],
  ['Jogador', 'moveBrake', 'Freio ao soltar', 0.03, 1, 0.01, '100%: para na hora quando solta, como a tampinha.', { so: 'direto' }],
  ['Jogador', 'sprint', 'Corrida', 1, 1.8, 0.01, 'Quanto a corrida acelera a mais.'],
  ['Jogador', 'playerR', 'Tamanho do jogador', 10, 24, 0.5, ''],
  ['Jogador', 'playerBounce', 'Empurrão entre jogadores', 0.1, 1, 0.01, ''],
  ['Chute', 'kickForce', 'Força do chute', 3, 9, 0.05, ''],
  ['Chute', 'kickReach', 'Alcance do chute', 1, 10, 0.25, 'A distância em que o chute armado pega a bola.'],
  ['Chute', 'kickAccel', 'Velocidade com o chute armado', 0.3, 1, 0.01, ''],
  ['Mundo', 'gravity', 'Gravidade', 0.05, 0.5, 0.005, 'Mais baixa: a bola flutua, como na Lua.'],
  ['Mundo', 'postR', 'Grossura da trave', 4, 14, 0.5, ''],
  ['Mundo', 'postBounce', 'Quique na trave', 0.1, 1, 0.01, ''],
  ['Mundo', 'netBackBounce', 'Quique no fundo da rede', 0, 1, 0.01, '']
].map(([g, k, rot, a, b, p, dica, x]) => Object.assign({ g, k, rot, a, b, p, dica }, x || {}));
const FIS_POR_K = {}; for (const f of FIS) FIS_POR_K[f.k] = f;
// a ponte da física com o RACHA (ponte.js, carregada antes): misturar a bola, o jogador ou o chute do RACHA no estádio
const PONTE = window.RachaPonte && window.RachaPonte.noRachao ? window.RachaPonte : null;
const arredFis = (k, v) => { const f = FIS_POR_K[k]; return f && typeof v === 'number' ? arredonda(clampN(v, f.a, f.b), f.p) : v; };
// o padrão de cada número (o do Rachão de sempre; os ganchos novos: sem teto, automático, o andar com embalo)
const PADRAO_NOVO = { ballMax: 0, ballFootBounce: null, ballWeight: null, netBackBounce: 0.1, moveMax: 0, moveAccel: 1, moveBrake: 1, andar: 'embalo' };
const padraoFis = k => Object.prototype.hasOwnProperty.call(PADRAO_NOVO, k) ? PADRAO_NOVO[k] : PHYS_PADRAO[k];
const fisDe = m => ((ORIG_POR_ID[m] || {}).phys) || {};
const PRESETS = [['classico', 'Clássico', {}], ['quadra', 'Quadra', fisDe('quadra')], ['asfalto', 'Asfalto', fisDe('rua')], ['terra', 'Terra', fisDe('terrao')],
  ['areia', 'Areia', fisDe('praia')], ['gelo', 'Gelo', fisDe('rinque')], ['molhado', 'Molhado', fisDe('chuva')], ['lua', 'Lua', fisDe('lua')],
  ['quica', 'Quica tudo', { ballBounce: 0.85, wallBounce: 1.17, landBounce: 0.75, postBounce: 0.9 }],
  ['praia', 'Bola de praia', { ballR: 14, ballIm: 1.45, ballDamp: 0.984, airDamp: 0.992, gravity: 0.13 }],
  ['chumbo', 'Bola pesada', { ballIm: 0.6, ballDamp: 0.978, ballBounce: 0.3, landBounce: 0.25, kickForce: 6.5 }]];
const VENTOS = { livre: { nome: 'Para todo lado', dirs: null }, gol: { nome: 'De gol a gol', dirs: [[1, 0], [-1, 0]] },
  lado: { nome: 'De lado', dirs: [[0, 1], [0, -1]] }, diagonal: { nome: 'Na diagonal', dirs: [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]] } };
const IDS_PODER = POWERS.map(p => p.id);
const paredeMax = qb => Math.min(1.5, Math.floor(100 / Math.max(qb, 0.01)) / 100);   // (o maior quique da parede com esse quique da bola)

const clampN = (v, a, b) => v < a ? a : v > b ? b : v;
const casas = p => (String(p).split('.')[1] || '').length;
const arredonda = (v, p) => Number(v.toFixed(casas(p)));
const objeto = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const de = (v, lista, d) => lista.indexOf(v) >= 0 ? v : d;
const inteiro = (v, f, d) => { const x = Number(v); return Number.isFinite(x) ? Math.round(clampN(x, f[0], f[1])) : d; };
const decimal = (v, f, p, d) => { const x = Number(v); return Number.isFinite(x) ? arredonda(clampN(x, f[0], f[1]), p) : d; };
const texto = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim() : '';
const novoId = () => 'u_' + Date.now().toString(36) + Math.floor(Math.random() * 2176782336).toString(36).padStart(6, '0');
function listaPt(partes) { return partes.length < 2 ? partes.join('') : partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1]; }

/* ---------------------------------------------------------------- 1) o estádio como documento */
function docNovo() {
  return {
    v: VERSAO, id: '', nome: 'Meu estádio', desc: '', base: '',
    campo: { formato: 'ret', W: 430, H: 205, cantos: 'redondo', canto: 30, impulso: 0, circulo: 72, margem: 46 },
    gol: { largura: 66, fundo: 44, recuo: 82, trave: 'trave', rede: 'net' },
    piso: 'grass', fisica: {}, pecas: [],
    vento: { on: false, forca: 1, troca: 7, dir: 'livre' },
    poderes: { lista: IDS_PODER.slice(), cada: 10, sempre: false },
    partida: { min: 1, max: 4, padrao: 2, gols: 0, chutes: { cavadinha: true, curva: true, super: true } }
  };
}
function limpaPeca(p, C) {
  p = objeto(p);
  const t = de(p.t, TIPOS, null); if (!t) return null;
  const P = PECA_PADRAO[t];
  const q = { t, x: inteiro(p.x, [-C.W, C.W], 0), y: inteiro(p.y, [-C.H, C.H], 0), sim: de(p.sim, SIMS, 'n') };
  if (t === 'cerca') { q.len = inteiro(p.len, LIM.len, P.len); q.th = inteiro(p.th, LIM.th, P.th); q.a = inteiro(p.a, LIM.a, P.a); }
  else q.r = inteiro(p.r, LIM.r[t], P.r);
  if (t === 'bumper') q.forca = decimal(p.forca, LIM.forca, 0.5, P.forca);
  if (t === 'lama' || t === 'poca') { q.bola = decimal(p.bola, LIM.bola, 0.001, P.bola); q.andar = decimal(p.andar, LIM.andar, 0.05, P.andar); q.freio = decimal(p.freio, LIM.freio, 0.005, P.freio); }
  return q;
}
// tudo o que entra (do aparelho ou de um código) passa por aqui: só os campos conhecidos, cada um no seu limite
function limpa(cru) {
  if (!cru || typeof cru !== 'object' || Array.isArray(cru)) return null;
  const d = docNovo(), c = objeto(cru.campo), g = objeto(cru.gol), fi = objeto(cru.fisica), v = objeto(cru.vento), pw = objeto(cru.poderes), pt = objeto(cru.partida);
  d.id = typeof cru.id === 'string' && /^u_[a-z0-9]{6,24}$/.test(cru.id) ? cru.id : '';
  d.nome = texto(cru.nome, LIM.nome) || 'Meu estádio';
  d.desc = texto(cru.desc, LIM.desc);
  d.base = typeof cru.base === 'string' && Object.prototype.hasOwnProperty.call(ORIG_POR_ID, cru.base) ? cru.base : '';
  const C = d.campo;
  C.formato = de(c.formato, ['ret', 'oval', 'rinque'], 'ret');
  C.W = inteiro(c.W, LIM.W, 430); C.H = inteiro(c.H, LIM.H, 205);
  C.cantos = de(c.cantos, ['reto', 'redondo', 'chanfro'], 'redondo');
  C.canto = inteiro(c.canto, LIM.canto, 30); C.impulso = decimal(c.impulso, LIM.impulso, 0.5, 0);
  C.circulo = inteiro(c.circulo, LIM.circulo, 72); C.margem = inteiro(c.margem, LIM.margem, 46);
  const G = d.gol;
  G.largura = inteiro(g.largura, LIM.gol, 66); G.fundo = inteiro(g.fundo, LIM.fundo, 44); G.recuo = inteiro(g.recuo, LIM.recuo, 82);
  G.trave = de(g.trave, ['trave', 'chinelo', 'bambu'], 'trave'); G.rede = de(g.rede, ['net', 'garage', 'hole'], 'net');
  d.piso = de(cru.piso, PISOS.map(p => p[0]), 'grass');
  for (const f of FIS) { const x = Number(fi[f.k]); if (fi[f.k] != null && Number.isFinite(x)) d.fisica[f.k] = arredonda(clampN(x, f.a, f.b), f.p); }
  if (fi.andar === 'direto') d.fisica.andar = 'direto';   // (o andar do RACHA; sem nada, o embalo do Rachão)
  else for (const k of ['moveMax', 'moveAccel', 'moveBrake']) delete d.fisica[k];
  const qb = d.fisica.ballBounce != null ? d.fisica.ballBounce : PHYS_PADRAO.ballBounce;   // (a bola não ganha velocidade batendo na parede:
  if (qb * (d.fisica.wallBounce != null ? d.fisica.wallBounce : PHYS_PADRAO.wallBounce) > 1) d.fisica.wallBounce = paredeMax(qb);   //  o quique dela × o da parede ≤ 1)
  if (Array.isArray(cru.pecas)) for (const p of cru.pecas.slice(0, LIM.pecas * 2)) {
    if (d.pecas.length >= LIM.pecas) break;
    const q = limpaPeca(p, C); if (q) d.pecas.push(q);
  }
  while (d.pecas.length && totalCopias(d) > LIM.copias) d.pecas.pop();
  d.vento = { on: v.on === true, forca: decimal(v.forca, LIM.ventoForca, 0.05, 1), troca: inteiro(v.troca, LIM.ventoTroca, 7), dir: de(v.dir, Object.keys(VENTOS), 'livre') };
  let lista = Array.isArray(pw.lista) ? IDS_PODER.filter(id => pw.lista.indexOf(id) >= 0) : IDS_PODER.slice();
  if (!lista.length) lista = IDS_PODER.slice();
  d.poderes = { lista, cada: inteiro(pw.cada, LIM.poder, 10), sempre: pw.sempre === true };
  const P = d.partida;
  P.min = inteiro(pt.min, [1, 7], 1); P.max = inteiro(pt.max, [1, 7], 4); if (P.max < P.min) P.max = P.min;
  P.padrao = clampN(inteiro(pt.padrao, [1, 7], 2), P.min, P.max);
  P.gols = [0, 1, 3, 5, 7, 10].indexOf(Number(pt.gols)) >= 0 ? Number(pt.gols) : 0;
  const ch = objeto(pt.chutes);                           // (os chutes extras que o estádio deixa: sem nada, os três)
  P.chutes = { cavadinha: ch.cavadinha !== false, curva: ch.curva !== false, super: ch.super !== false };
  return d;
}
// as cópias de uma peça pelo espelho (as que caem no mesmo lugar contam uma vez só)
function copias(p) {
  const L = [{ x: p.x, y: p.y, sx: 1, sy: 1 }];
  const poe = (sx, sy) => {
    const x = p.x * sx, y = p.y * sy, a = p.t === 'cerca' ? ((p.a || 0) * sx * sy) : 0;
    const igual = L.some(c => Math.abs(c.x - x) < 0.5 && Math.abs(c.y - y) < 0.5 && (p.t !== 'cerca' || angIgual((p.a || 0) * c.sx * c.sy, a)));
    if (!igual) L.push({ x, y, sx, sy });
  };
  if (p.sim === 'y' || p.sim === 'xy') poe(1, -1);          // (a ordem do sym4 dos campos do Rachão: x+y+, x+y−, x−y+, x−y−)
  if (p.sim === 'x' || p.sim === 'xy') poe(-1, 1);
  if (p.sim === 'xy' || p.sim === 'c') poe(-1, -1);
  return L;
}
function angIgual(a, b) { const d = ((a - b) % 180 + 180) % 180; return d < 0.5 || d > 179.5; }
function totalCopias(d) { let n = 0; for (const p of d.pecas) n += copias(p).length; return n; }
// os limites que dependem de outras medidas (o canto não pode engolir o gol, o gol cabe no campo...)
function limites(d) {
  const C = d.campo, G = d.gol, W = C.W, H = C.H, L = {};
  const pr = d.fisica.playerR != null ? d.fisica.playerR : PHYS_PADRAO.playerR;
  if (C.formato === 'oval') { L.golMax = Math.floor(H * 0.85); L.cantoMax = 0; L.golGeo = Math.floor(H * 0.9); }
  else if (C.formato === 'rinque') {
    L.cantoMax = Math.max(30, Math.min(W, H) - 12);
    L.recuoMin = Math.min(LIM.recuo[1], G.fundo + 24); L.recuoMax = Math.max(L.recuoMin, Math.min(LIM.recuo[1], Math.floor(W * 0.5)));
    const c = clampN(C.canto, 30, L.cantoMax), gx = W - clampN(G.recuo, L.recuoMin, L.recuoMax);
    const meia = x => x <= W - c ? H : (H - c) + Math.sqrt(Math.max(0, c * c - (x - (W - c)) ** 2));   // (a meia-altura do rinque em x: a tabela curva)
    L.golGeo = Math.floor(Math.min(meia(gx + G.fundo) - 12, meia(gx) - 14));                     // (as traves e o fundo da rede dentro da tabela)
    L.golMax = Math.min(Math.floor(H * 0.55), L.golGeo);
  } else {
    L.golMax = Math.min(LIM.gol[1], H - 12);
    L.cantoMax = Math.max(0, Math.min(Math.floor(Math.min(W, H) * 0.7), H - Math.min(G.largura, L.golMax) - 8));
  }
  L.golMax = Math.max(LIM.gol[0], Math.min(LIM.gol[1], L.golMax));
  const gol = Math.min(G.largura, L.golMax);
  L.gx = C.formato === 'oval' ? W * Math.cos(Math.asin(clampN(gol / H, 0, 0.95))) : C.formato === 'rinque' ? W - clampN(G.recuo, L.recuoMin, L.recuoMax) : W;
  // o círculo do meio não passa da linha do gol (na saída, o time de fora espera do lado de fora dele)
  L.circMax = Math.max(LIM.circulo[0], Math.min(LIM.circulo[1], Math.floor(Math.min(W * 0.45, H * 0.8, L.gx - 2 * pr - 10))));
  return L;
}
function conta(d) {
  const n = { obst: 0, cercas: 0, zonas: 0 };
  for (const p of d.pecas) { const k = copias(p).length; if (p.t === 'lama' || p.t === 'poca') n.zonas += k; else if (p.t === 'cerca') n.cercas += k; else n.obst += k; }
  return n;
}
function descAuto(d) {
  const n = conta(d), partes = [];
  partes.push((d.campo.formato === 'oval' ? 'Campo oval' : d.campo.formato === 'rinque' ? 'Rinque' : 'Campo') + ' de ' + N_PISO[d.piso].toLowerCase());
  if (n.obst) partes.push(n.obst + (n.obst === 1 ? ' obstáculo' : ' obstáculos'));
  if (n.cercas) partes.push(n.cercas + (n.cercas === 1 ? ' cerca viva' : ' cercas vivas'));
  if (n.zonas) partes.push(n.zonas + (n.zonas === 1 ? ' poça ou lama' : ' poças e lamas'));
  if (d.vento.on) partes.push('vento');
  if (d.poderes.sempre) partes.push('poderes em toda partida');
  const ch = d.partida.chutes, sem = [!ch.cavadinha && 'cavadinha', !ch.curva && 'curva', !ch.super && 'super chute'].filter(Boolean);
  if (sem.length === 3) partes.push('só o Chutar'); else if (sem.length) partes.push('sem ' + listaPt(sem));
  const doRacha = PONTE ? PONTE.PARTES.filter(x => PONTE.qualRachao(d.fisica, x, arredFis) === 'racha') : [];
  if (doRacha.length) partes.push('com ' + listaPt(doRacha.map(x => ({ bola: 'a bola', jogador: 'o jogador', chute: 'o chute' })[x])) + ' do RACHA');
  return listaPt(partes) + '.';
}
// o documento → um campo no formato do jogo (o mesmo dos 17 campos: MAPS)
function compila(d) {
  const C = d.campo, G = d.gol, P = d.partida, L = limites(d);
  const m = { id: d.id || 'u_rascunho', name: d.nome, desc: d.desc || descAuto(d), custom: true,
    W: C.W, H: C.H, goal: Math.min(G.largura, L.golMax), depth: G.fundo, circle: Math.min(C.circulo, L.circMax), margin: C.margem,
    surface: d.piso, sizes: [P.min, P.max], def: P.padrao, phys: Object.assign({}, d.fisica), statics: [], walls: [], zones: [] };
  if (C.formato === 'oval') m.shape = 'oval';
  else if (C.formato === 'rinque') { m.shape = 'rink'; m.corner = clampN(C.canto, 30, L.cantoMax); m.goalInset = clampN(G.recuo, L.recuoMin, L.recuoMax); m.margin = 0; }
  else {
    m.corner = C.cantos === 'reto' ? 0 : Math.min(C.canto, L.cantoMax);
    if (C.cantos === 'chanfro' && m.corner > 0) { m.cornerStyle = 'chamfer'; if (C.impulso > 0) m.cornerBoost = C.impulso; }
  }
  // o poder Golzão (o gol × 1,6) também cabe no estádio (o gancho do motor lê o golzaoMax; os 17 campos não têm e ficam iguais)
  m.golzaoMax = Math.max(m.goal, C.formato === 'ret' ? C.H - (m.corner > 0 ? m.corner + 8 : 12) : L.golGeo);
  if (G.trave !== 'trave') m.postStyle = G.trave;
  if (G.rede !== 'net') m.netStyle = G.rede;
  for (const p of d.pecas) for (const c of copias(p)) {
    if (p.t === 'cerca') m.walls.push({ x: c.x, y: c.y, len: p.len, th: p.th, a: (p.a || 0) * c.sx * c.sy, style: 'hedge' });
    else if (p.t === 'lama' || p.t === 'poca') {
      const z = { x: c.x, y: c.y, r: p.r, kind: p.t === 'lama' ? 'mud' : 'puddle', ballDamp: p.bola, accelMul: p.andar };
      if (p.freio < 0.999) z.playerDamp = p.freio;
      m.zones.push(z);
    } else if (p.t === 'bumper') m.statics.push({ x: c.x, y: c.y, r: p.r, boost: p.forca, style: 'bumper' });
    else m.statics.push({ x: c.x, y: c.y, r: p.r, style: p.t });
  }
  if (d.vento.on) { m.wind = true; m.windForce = d.vento.forca; m.windEvery = Math.round(d.vento.troca * 60); const dirs = VENTOS[d.vento.dir].dirs; if (dirs) m.windDirs = dirs.map(x => x.slice()); }
  if (d.poderes.lista.length < IDS_PODER.length) m.powers = d.poderes.lista.slice();
  m.powerEvery = Math.round(d.poderes.cada * 60);
  if (d.poderes.sempre) m.powersAlways = true;
  if (P.gols) m.scoreDefault = P.gols;
  const ch = P.chutes;
  if (!ch.cavadinha || !ch.curva || !ch.super) m.chutes = { lob: ch.cavadinha, curve: ch.curva, superKick: ch.super };
  return m;
}
// um dos 17 campos → documento (as cópias espelhadas viram uma peça com espelho, como foram feitas)
function docDeMapa(m) {
  const d = docNovo(), C = d.campo, G = d.gol;
  d.nome = texto(m.name + ' 2', LIM.nome); d.desc = texto(m.desc, LIM.desc); d.base = ORIG_POR_ID[m.id] ? m.id : '';
  C.formato = m.shape === 'oval' ? 'oval' : m.shape === 'rink' ? 'rinque' : 'ret';
  C.W = m.W; C.H = m.H; C.canto = m.corner || 0; C.circulo = m.circle; C.margem = m.margin || 46;
  C.cantos = !m.corner ? 'reto' : m.cornerStyle === 'chamfer' ? 'chanfro' : 'redondo';
  if (C.formato === 'rinque') { C.cantos = 'redondo'; C.margem = 46; }
  C.impulso = m.cornerBoost || 0;
  G.largura = m.goal; G.fundo = m.depth; G.recuo = m.goalInset || 82; G.trave = m.postStyle || 'trave'; G.rede = m.netStyle || 'net';
  d.piso = m.surface || 'grass';
  d.fisica = Object.assign({}, m.phys || {});
  const itens = [];
  for (const s of m.statics || []) itens.push(s.style === 'bumper' ? { t: 'bumper', x: s.x, y: s.y, r: s.r, forca: s.boost || 8.5 } : { t: s.style === 'vaso' ? 'vaso' : 'poste', x: s.x, y: s.y, r: s.r });
  for (const w of m.walls || []) itens.push({ t: 'cerca', x: w.x, y: w.y, len: w.len, th: w.th, a: w.a || 0 });
  for (const z of m.zones || []) itens.push({ t: z.kind === 'mud' ? 'lama' : 'poca', x: z.x, y: z.y, r: z.r, bola: z.ballDamp || 0.95, andar: z.accelMul || 1, freio: z.playerDamp || 1 });
  const usado = itens.map(() => false);
  const igual = (o, q) => o.t === q.t && (o.r || 0) === (q.r || 0) && (o.len || 0) === (q.len || 0) && (o.th || 0) === (q.th || 0) && (o.forca || 0) === (q.forca || 0)
    && (o.bola || 0) === (q.bola || 0) && (o.andar || 0) === (q.andar || 0) && (o.freio || 0) === (q.freio || 0);
  itens.forEach((q, i) => {                                // o espelho mais simples que refaz as cópias que existem (o que cobre mais vence)
    if (usado[i]) return;
    usado[i] = true;
    let sim = 'n', js = [];
    for (const s of ['x', 'y', 'c', 'xy']) {
      const outras = copias(Object.assign({}, q, { sim: s })).slice(1), achou = [];
      for (const c of outras) {
        const a = (q.a || 0) * c.sx * c.sy;
        const j = itens.findIndex((o, k) => !usado[k] && achou.indexOf(k) < 0 && igual(o, q) && Math.abs(o.x - c.x) < 0.5 && Math.abs(o.y - c.y) < 0.5 && (q.t !== 'cerca' || angIgual(o.a || 0, a)));
        if (j < 0) break;
        achou.push(j);
      }
      if (achou.length === outras.length && achou.length > js.length) { sim = s; js = achou; }
    }
    for (const j of js) usado[j] = true;
    d.pecas.push(Object.assign({}, q, { sim }));
  });
  d.vento.on = !!m.wind;
  d.partida.min = (m.sizes || [1, 4])[0]; d.partida.max = (m.sizes || [1, 4])[1]; d.partida.padrao = m.def || 2; d.partida.gols = m.scoreDefault || 0;
  return limpa(d);
}

/* ---------------------------------------------------------------- 2) a guarda no aparelho e o registro nos campos */
let REGS = [];
const APAGADOS = new Set();                               // (apagados nesta aba: o juntar com outra aba não traz de volta)
const miniOk = t => typeof t === 'string' && t.length <= 60000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(t) ? t : '';
function carrega() {
  let lista = [];
  try { const o = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (o && Array.isArray(o.lista)) lista = o.lista; } catch (_) {}
  const vistos = new Set(); REGS = [];
  for (const r of lista.slice(0, MAX_ESTADIOS)) {
    if (!r || typeof r !== 'object') continue;
    const doc = limpa(r.doc); if (!doc || !doc.id || vistos.has(doc.id)) continue;
    vistos.add(doc.id);
    REGS.push({ id: doc.id, criado: Number(r.criado) || 0, editado: Number(r.editado) || 0, thumb: miniOk(r.thumb), doc });
  }
}
function junta() {                                      // (outra aba guardou: o mais novo de cada estádio vale e os que só ela tem entram)
  let lista = [];
  try { const o = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (o && Array.isArray(o.lista)) lista = o.lista; } catch (_) {}
  for (const r of lista.slice(0, MAX_ESTADIOS * 2)) {
    if (!r || typeof r !== 'object' || typeof r.id !== 'string' || APAGADOS.has(r.id)) continue;
    const ed = Number(r.editado) || 0, aqui = REGS.find(x => x.id === r.id);
    if (aqui && (ed <= aqui.editado || aqui === ED.reg)) continue;
    if (!aqui && REGS.length >= MAX_ESTADIOS) continue;
    const doc = limpa(r.doc); if (!doc || doc.id !== r.id) continue;
    if (aqui) { aqui.doc = doc; aqui.editado = ed; aqui.thumb = miniOk(r.thumb); }
    else REGS.push({ id: r.id, criado: Number(r.criado) || 0, editado: ed, thumb: miniOk(r.thumb), doc });
  }
}
function grava() {
  junta();
  const dados = l => JSON.stringify({ v: VERSAO, lista: l.map(r => ({ id: r.id, criado: r.criado, editado: r.editado, thumb: r.thumb, doc: r.doc })) });
  try { localStorage.setItem(CHAVE, dados(REGS)); avisaPai('mudou'); return true; }
  catch (_) {
    try { localStorage.setItem(CHAVE, dados(REGS.map(r => Object.assign({}, r, { thumb: '' })))); avisaPai('mudou'); return true; }   // (sem espaço: sem as miniaturas)
    catch (e) { aviso('O aparelho está sem espaço para guardar os estádios.', true); return false; }
  }
}
function miniatura(m) {
  try { const c = document.createElement('canvas'); c.width = 288; c.height = 162; renderMapThumb(c, m); return miniOk(c.toDataURL('image/jpeg', 0.72)); } catch (_) { return ''; }
}
function registra() {                                    // os estádios entram na frente dos 17 campos (e no MAP_BY_ID)
  for (let i = MAPS.length - 1; i >= 0; i--) if (MAPS[i].custom) { if (MAP_BY_ID[MAPS[i].id] === MAPS[i]) delete MAP_BY_ID[MAPS[i].id]; MAPS.splice(i, 1); }
  const novos = REGS.slice().sort((a, b) => b.editado - a.editado).map(r => compila(r.doc));
  MAPS.unshift(...novos);
  for (const m of novos) MAP_BY_ID[m.id] = m;
}
function cria(doc) {
  if (REGS.length >= MAX_ESTADIOS) { aviso('Você já tem ' + MAX_ESTADIOS + ' estádios: apague um para criar outro.', true); return null; }
  const d = limpa(doc); if (!d) return null;
  d.id = novoId();
  const agora = Date.now(), reg = { id: d.id, criado: agora, editado: agora, thumb: '', doc: d };
  reg.thumb = miniatura(compila(d));
  REGS.unshift(reg);
  if (!grava()) { REGS.shift(); return null; }
  registra();
  return reg;
}
function salvaReg(reg, doc) {
  reg.doc = limpa(doc); reg.doc.id = reg.id; reg.editado = Date.now();
  reg.thumb = miniatura(compila(reg.doc));
  const ok = grava(); registra(); return ok;
}
function apaga(reg) {
  const i = REGS.indexOf(reg); if (i < 0) return;
  REGS.splice(i, 1); APAGADOS.add(reg.id); grava(); registra();
  for (const k in App.sel) if (App.sel[k] && App.sel[k].map === reg.id) App.sel[k].map = 'classico';
}
function nomeCopia(nome) {
  const m = /^(.*?)\s(\d{1,3})$/.exec(nome);
  const base = m ? m[1] : nome; let n = m ? Number(m[2]) + 1 : 2;
  const nomes = new Set(REGS.map(r => r.doc.nome));
  let s; do { s = texto(base, LIM.nome - String(n).length - 1) + ' ' + n; n++; } while (nomes.has(s) && n < 999);
  return s;
}
function duplica(reg) { const d = JSON.parse(JSON.stringify(reg.doc)); d.nome = nomeCopia(d.nome); return cria(d); }

/* ---------------------------------------------------------------- 3) o código para compartilhar */
function codifica(d) {
  const o = limpa(d); delete o.id;
  const by = new TextEncoder().encode(JSON.stringify(o)); let bin = '';
  for (let i = 0; i < by.length; i++) bin += String.fromCharCode(by[i]);
  return PREFIXO + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodifica(s) {
  if (typeof s !== 'string') return null;
  s = s.replace(/\s+/g, '');
  if (!s || s.length > LIM_CODIGO) return null;
  const m = /^RACHAO1\.([A-Za-z0-9_-]+)$/.exec(s); if (!m) return null;
  try {
    let b = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
    const bin = atob(b), by = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) by[i] = bin.charCodeAt(i);
    const d = limpa(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(by)));
    if (d) d.id = '';
    return d;
  } catch (_) { return null; }
}


  return Object.freeze({ VERSAO, LIM, LIM_CODIGO, PREFIXO, FIS, ORIGINAIS, limpa, compila, codifica, decodifica, docNovo, descAuto, limites, copias });
  })();
  return Object.freeze({ TopMatch, MAPS, MAP_BY_ID, basePhys, buildStadium, POWERS, POWER_BY_ID, POWER_EVERY, DIFF, FORMATIONS, PHYS, SUPER, KICK_LOB, KICK_CURVE, TEAM_NAMES, Disc, World, mkSeg, M_BALL, M_PLAYER, M_ALL, fmtTime, Ponte: window.RachaPonte, Quadro: window.RachaoQuadro, EST, Math });
}
module.exports = { criaMotorRachao, SHA: Object.freeze({ jogo: 'b5be492e9009212d', ponte: 'e4efce0d299381cd', quadro: '5588d48c6c195b7f', estadio: 'eb850f8b43036953' }) };
