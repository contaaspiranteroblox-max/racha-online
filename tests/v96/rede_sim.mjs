// RACHA v96 · O SIMULADOR DA REDE (sem navegador): o motor das salas de verdade (server/partida/sala.js, com a fila de
// comandos) + a previsão do online do aparelho (uma cópia fiel do tools/v92/rede.js: o mundo de previsão, o rollback e o
// replay) com as correções de antes (as da v92/v95) ou as novas (as do tools/v96/rede.js, com o núcleo tools/v96/liso.js —
// o MESMO arquivo do jogo), ligados por uma internet de mentira: o atraso, a oscilação do 4G na ordem do TCP, os apagões do
// rádio do celular e os engasgos do servidor (o plano grátis do Render divide o processador).
// Mede o que a tela de quem joga (Ana) desenha: os pulos da própria tampinha, da bola e do outro (Beto), o desenho dentro das
// traves e da rede, e o quanto o desenho mente (a distância até o que o servidor decidiu para aquele momento).
// Uso: node tests/v96/rede_sim.mjs [rede] [segundos]   (rede: wifi, 4g, 4g_ruim, br, br_ruim)
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const N = require(path.join(RAIZ, 'server/partida/nucleo.js'));
const { PartidaSala } = require(path.join(RAIZ, 'server/partida/sala.js'));
const L = require(path.join(RAIZ, 'tools/v96/liso.js'));
const STEP = 1 / 60, STEP_MS = 1000 / 60, U = N.U;

/* ---------------- o acaso com semente e a fila de eventos ---------------- */
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const gauss = r => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
class Fila {
  constructor() { this.h = []; this.n = 0; }
  poe(t, fn) { const h = this.h; h.push({ t, k: this.n++, fn }); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (menor(h[p], h[i])) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } }
  tira() { const h = this.h; if (!h.length) return null; const top = h[0], ult = h.pop(); if (h.length) { h[0] = ult; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && menor(h[l], h[m])) m = l; if (r < h.length && menor(h[r], h[m])) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return top; }
}
const menor = (a, b) => a.t < b.t || (a.t === b.t && a.k < b.k);

/* ---------------- a internet de mentira ---------------- */
// lat = ms em cada sentido; osc = a oscilação (a cauda para mais, como no celular); apagões do rádio (os dois sentidos):
// em média um a cada apagaCada ms, de apagaMin a apagaMax ms (nada passa; o que ficou chega depois, em ordem); engasgos do
// servidor: o motor parado engasgoMin..engasgoMax ms a cada ~engasgoCada ms (depois alcança no máximo 5 passos, como o MOTOR)
export const REDES = {
  wifi: { lat: 18, osc: 6, apagaCada: 0 },
  '4g': { lat: 45, osc: 22, apagaCada: 9000, apagaMin: 150, apagaMax: 380 },
  '4g_ruim': { lat: 70, osc: 40, apagaCada: 4500, apagaMin: 200, apagaMax: 520 },
  br: { lat: 82, osc: 24, apagaCada: 9000, apagaMin: 150, apagaMax: 380, engasgoCada: 2500, engasgoMin: 30, engasgoMax: 110 },
  br_ruim: { lat: 98, osc: 42, apagaCada: 5000, apagaMin: 200, apagaMax: 520, engasgoCada: 1800, engasgoMin: 40, engasgoMax: 160 },
};
class Radio {
  constructor(p, r, dur) { this.jan = []; if (p.apagaCada > 0) { let t = 1500 + r() * p.apagaCada; while (t < dur) { const d = p.apagaMin + r() * (p.apagaMax - p.apagaMin); this.jan.push([t, t + d]); t += d + p.apagaCada * (0.3 + 1.4 * r()); } } }
  segura(t) { for (const j of this.jan) if (t >= j[0] && t < j[1]) return j[1]; return t; }
}
class Link {
  constructor(sim, p, radio, r) { this.sim = sim; this.p = p; this.radio = radio; this.r = r; this.ult = 0; }
  envia(t, msg, entrega) {
    const p = this.p, r = this.r;
    let q = t + p.lat + p.osc * (0.55 * -Math.log(1 - r()) + 0.15 * gauss(r));
    q = Math.max(q, t + 2);
    q = this.radio.segura(q); q = Math.max(q, this.radio.segura(t) + p.lat * 0.5);
    if (q < this.ult) q = this.ult;
    this.ult = q;
    this.sim.fila.poe(q, () => entrega(msg));
  }
}

/* ---------------- o aparelho: a previsão da v92 (tools/v92/rede.js) com as correções da v95 ou da v96 ---------------- */
class Aparelho {
  constructor(sim, netId, slot, modo) {
    this.sim = sim; this.netId = netId; this.slot = slot; this.modo = modo;   // modo: 'v95' (as correções de antes) | 'v96'
    this.seq = 0; this.pend = []; this.kc = 0; this.pc = 0; this.ackKc = 0; this.ackPc = 0; this.ackBh = 0; this.ultChute = -99;
    this.lastTick = -1; this.acc = 0; this.ultInp = { mx: 0, my: 0 }; this.tDraw = 0; this.tFrame = null; this.snapAt = 0; this.reg = []; this.toque = null;
    this.ofP = [0, 0]; this.ofB = [0, 0]; this.ofJ = [];                     // (v95)
    this.dP = L.novo(); this.dB = L.novo(); this.dJ = []; this.ant = null; this.saltoP = this.saltoB = true; this.saltoJ = []; this.ultEst = null;   // (v96)
  }
  inicia(perfil, n) {
    const C = this.C = N.resolve(perfil), G = N.novoCampo(n);
    const M = this.M = { G, B: N.novaBola(C, G.CX, G.CY), jog: [], estado: 'saida', saidaTime: 0, jogo: 'futebol', trave: 0, tick: 0 };
    for (let i = 0; i < n * 2; i++) M.jog.push({ i, x: G.CX, y: G.CY, vx: 0, vy: 0, r: C.R_JOG, m: C.MASSA_JOG, mx: 0, my: 0, time: Math.floor(i / n) });
    this.bt = N.novoBotao(); this.ofJ = M.jog.map(() => [0, 0]); this.dJ = M.jog.map(() => L.novo());
    const ap = this;
    this.cb = { toques() { const M = ap.M; if (M.estado !== 'saida') return; const B = M.B, lim = ap.C.R_BOLA + 2; for (const q of M.jog) if (q.time === M.saidaTime && Math.hypot(q.x - B.x, q.y - B.y) <= q.r + lim) { M.estado = 'jogo'; return; } } };
    this.chutaCb = (q, f) => { const tk = this.M.tick + 1; if (this.C.DB_MODO !== 1 && tk - this.ultChute < 2) return false; const ok = N.chute(this.M, this.C, q, f); if (ok) this.ultChute = tk; return ok; };
  }
  prevPasso(cmd) {                                     // v92PrevPasso
    const M = this.M, C = this.C, eu = M.jog[this.slot], vale = M.estado === 'saida' || M.estado === 'jogo';
    if (vale) { N.botaoComando(this.bt, cmd, C); eu.mx = cmd.x; eu.my = cmd.y; N.botaoTick(M, C, eu, this.bt, this.chutaCb); } else { eu.mx = eu.my = 0; }
    N.passo(M, C, this.cb); M.tick++;
  }
  comando(d, t) {                                      // v92Comando
    const lp = d.tapK, lc = d.tapP; if (lp) this.kc++; if (lc) this.pc++;
    const hp = d.holdK, hc = d.holdP, button = hc || lc ? 3 : hp || lp ? 2 : 1;
    const cmd = { type: 'input', seq: ++this.seq, x: d.mx, y: d.my, button, k: 0, kc: this.kc, pc: this.pc, bh: (hp || lp ? 1 : 0) | (hc || lc ? 2 : 0) };
    this.sim.manda(this, t, cmd);
    this.pend.push(cmd); if (this.pend.length > 120) this.pend.shift();
    this.prevPasso(cmd); d.tapK = d.tapP = false;
  }
  base(s) {                                            // v92Base
    const M = this.M, C = this.C, b = s.ball;
    M.tick = s.tick; M.estado = s.state; M.saidaTime = s.kickoff === 1 ? 1 : 0;
    Object.assign(M.B, { x: b[0], y: b[1], vx: b[2], vy: b[3], w: b[4] || 0, cv: b[5] || 0, cvT: b[6] || 0, cvUx: null, cvUy: null });
    for (let i = 0; i < M.jog.length; i++) {
      const v = s.players[i], q = M.jog[i]; if (!v) continue;
      q.x = v[0]; q.y = v[1]; q.vx = v[2]; q.vy = v[3];
      if (i !== this.slot) { const sp = Math.hypot(v[2], v[3]); if (sp > C.VEL_JOG * 0.3) { q.mx = v[2] / sp; q.my = v[3] / sp; } else q.mx = q.my = 0; }
    }
    const pl = s.players[this.slot], bt = pl ? pl[7] : null, m = this.bt;
    if (typeof bt === 'number') { m.estado = (bt & 3) || 1; m.livre = !!(bt & 4); m.armaTipo = (bt >> 3) & 3; m.arma = (bt >> 5) & 31; }
    m.kc = this.ackKc; m.pc = this.ackPc;
    if (pl && Number.isFinite(pl[5])) this.ultChute = pl[5];
  }
  snapshot(s, t) {                                     // net49Snapshot (v92) → v92SnapPrev (v92 ou v96)
    if (!(s.tick > this.lastTick)) return;
    this.lastTick = s.tick; this.snapAt = t;
    const M = this.M, eu = M.jog[this.slot], estAntes = M.estado;
    const antesP = [eu.x, eu.y], antesB = [M.B.x, M.B.y], antesJ = M.jog.map(q => [q.x, q.y]);
    const ack = s.players[this.slot] ? s.players[this.slot][4] | 0 : 0;
    while (this.pend.length && this.pend[0].seq <= ack) { const c = this.pend.shift(); this.ackKc = c.kc | 0; this.ackPc = c.pc | 0; this.ackBh = c.bh | 0; }
    this.base(s);
    for (const c of this.pend) this.prevPasso(c);
    if (this.modo === 'v95') {                         // (as correções da v92, de antes)
      const reinicio = s.state !== estAntes && (s.state === 'saida' || s.state === 'fim');
      const tele = U(5), teleP = reinicio ? 0 : U(12);
      const dP = [antesP[0] - eu.x, antesP[1] - eu.y], dB = [antesB[0] - M.B.x, antesB[1] - M.B.y];
      if (Math.hypot(dP[0], dP[1]) < teleP) { this.ofP[0] += dP[0]; this.ofP[1] += dP[1]; } else this.ofP = [0, 0];
      if (Math.hypot(dB[0], dB[1]) < tele * 1.6) { this.ofB[0] += dB[0]; this.ofB[1] += dB[1]; } else this.ofB = [0, 0];
      M.jog.forEach((q, i) => { const d = [antesJ[i][0] - q.x, antesJ[i][1] - q.y]; if (Math.hypot(d[0], d[1]) < tele) { this.ofJ[i][0] += d[0]; this.ofJ[i][1] += d[1]; } else this.ofJ[i] = [0, 0]; });
      return;
    }
    // (v96: o tools/v96/rede.js)
    const p = L.PADRAO, ant = this.ultEst; this.ultEst = s.state;
    const reinicio = ant == null || (s.state !== ant && (s.state === 'saida' || s.state === 'fim'));
    const dP = [antesP[0] - eu.x, antesP[1] - eu.y], dB = [antesB[0] - M.B.x, antesB[1] - M.B.y];
    if (reinicio) { L.zera(this.dP); L.zera(this.dB); this.dJ.forEach(L.zera); this.saltoP = this.saltoB = true; this.saltoJ = M.jog.map(() => true); return; }
    if (Math.hypot(dP[0], dP[1]) < U(p.teleP)) L.soma(this.dP, dP[0], dP[1]); else { L.zera(this.dP); this.saltoP = true; }
    if (Math.hypot(dB[0], dB[1]) < U(p.teleB)) L.soma(this.dB, dB[0], dB[1]); else { L.zera(this.dB); this.saltoB = true; }
    M.jog.forEach((q, i) => { if (i === this.slot) return; const d = [antesJ[i][0] - q.x, antesJ[i][1] - q.y]; if (Math.hypot(d[0], d[1]) < U(p.teleJ)) L.soma(this.dJ[i], d[0], d[1]); else { L.zera(this.dJ[i]); this.saltoJ[i] = true; } });
  }
  bolaAgora(t) {                                       // v92BolaPrevAgora
    const b = this.M.B, C = this.C, G = this.M.G, lq = C.LIMIAR_QUIQUE, o = { x: b.x, y: b.y, vx: b.vx, vy: b.vy, w: 0, r: b.r, m: b.m, I: b.I };
    if (!(t > 0) || Math.abs(o.vx) + Math.abs(o.vy) < 1) return o;
    o.x += o.vx * t; o.y += o.vy * t;
    for (const s of G.WALL_SEGS) N.hitSeg(o, s[0], s[1], s[2], s[3], C.Q_PAREDE, 0, lq);
    N.hitBox(o, G.GL, G.GT, G.GR, G.GB, C.Q_PAREDE, 0, lq);
    for (const p of G.POSTS) N.hitPoint(o, p[0], p[1], G.POST_R, C.Q_TRAVE, 0, lq);
    for (const s of G.NET_SEGS) N.hitSeg(o, s[0], s[1], s[2], s[3], C.Q_REDE, 0, lq);
    return o;
  }
  mostra(agora) {                                      // v92Mostra ('eu') + (v96) o desenho liso
    const M = this.M, C = this.C, G = M.G, eu = M.jog[this.slot];
    const dt = this.tDraw ? Math.min(0.1, (agora - this.tDraw) / 1000) : 0; this.tDraw = agora;
    if (this.modo === 'v95') { const k = Math.exp(-dt * 1000 / 90); this.ofP[0] *= k; this.ofP[1] *= k; this.ofB[0] *= k; this.ofB[1] *= k; for (const o of this.ofJ) { o[0] *= k; o[1] *= k; } }
    const t = Math.max(0, Math.min(STEP, this.acc));
    const d = N.direcao(this.ultInp.mx, this.ultInp.my, C.DIRECOES), vale = M.estado === 'saida' || M.estado === 'jogo';
    let vx = 0, vy = 0;
    if (vale && (d.mx || d.my)) { vx = eu.vx + d.mx * C.VEL_JOG; vy = eu.vy + d.my * C.VEL_JOG; const v = Math.hypot(vx, vy); if (v > C.VEL_JOG) { vx *= C.VEL_JOG / v; vy *= C.VEL_JOG / v; } }
    const o5 = this.modo === 'v95';
    let P = [Math.max(G.GL + eu.r, Math.min(G.GR - eu.r, eu.x + vx * t)) + (o5 ? this.ofP[0] : 0), Math.max(G.GT + eu.r, Math.min(G.GB - eu.r, eu.y + vy * t)) + (o5 ? this.ofP[1] : 0)];
    const bp = this.bolaAgora(t);
    let B = [bp.x + (o5 ? this.ofB[0] : 0), bp.y + (o5 ? this.ofB[1] : 0)];
    let J = M.jog.map((q, i) => i === this.slot ? P : [q.x + q.vx * t + (o5 ? this.ofJ[i][0] : 0), q.y + q.vy * t + (o5 ? this.ofJ[i][1] : 0)]);
    if (o5) return { P, B, J };
    // v96 (tools/v96/rede.js: v96Desenha)
    const p = L.PADRAO, tau = 0.09;
    L.anda(this.dP, dt, tau, L.tetoJ(C, p));
    L.anda(this.dB, dt, tau * 0.9, L.tetoB(C, p, Math.hypot(M.B.vx, M.B.vy), Math.hypot(M.B.x - eu.x, M.B.y - eu.y), U), p.gB, U(p.livreB));
    M.jog.forEach((q, i) => { if (i !== this.slot) L.anda(this.dJ[i], dt, tau, L.tetoJ(C, p)); });
    const A = this.ant || {}, vJ = L.guardaJ(C, p), vB = L.guardaB(C, p);
    const poe = (pos, ant, dd, vmax, salto, x0, y0, r, bola) => { let q = [pos[0] + dd.x, pos[1] + dd.y]; if (!salto && ant) q = L.guarda(q, ant, dd, vmax, dt); return L.varre(N, G, x0, y0, q[0], q[1], r, bola); };
    P = poe(P, A.P, this.dP, vJ, this.saltoP, eu.x, eu.y, eu.r, false);
    B = poe(B, A.B, this.dB, vB, this.saltoB, M.B.x, M.B.y, M.B.r, true);
    J = M.jog.map((q, i) => i === this.slot ? P : poe(J[i], A.J && A.J[i], this.dJ[i], vJ, !!this.saltoJ[i], q.x, q.y, q.r, false));
    this.ant = { P, B, J }; this.saltoP = this.saltoB = false; this.saltoJ = [];
    return { P, B, J };
  }
  quadro(t, inp) {                                     // v92RemoteFrame + net49Draw
    let dt = this.tFrame == null ? STEP_MS : t - this.tFrame; this.tFrame = t;
    const n = Math.round(dt / STEP_MS); if (n >= 1 && Math.abs(dt - n * STEP_MS) < 6) dt = n * STEP_MS;   // (dtSnap)
    this.ultInp = { mx: inp.mx, my: inp.my };
    if (t - this.snapAt <= 2000 || this.lastTick < 0) { this.acc += dt / 1000; while (this.acc + 1e-9 >= STEP) { this.comando(inp, t); this.acc = Math.max(0, this.acc - STEP); } }
    const D = this.mostra(t);
    this.reg.push({ t, seq: this.seq, tick: this.M.tick, est: this.M.estado, P: D.P.slice(), B: D.B.slice(), J: D.J.map(a => a.slice()) });
  }
}

/* ---------------- os roteiros (o dedo de cada um: decide pelo que o próprio aparelho vê) ---------------- */
function toqueAgora(ap, inp) { if (!ap.toque) return; if (ap.toque.resta === 3) { if (ap.toque.tipo === 'P') inp.tapP = true; else inp.tapK = true; } if (ap.toque.tipo === 'P') inp.holdP = true; else inp.holdK = true; if (--ap.toque.resta <= 0) ap.toque = null; }
function roteiroA(r) {                                 // Ana (a medida): zigue-zague, as traves, a rede por trás, conduz e chuta, parada
  let missao = null, fim = 0, dir = [1, 0], troca = 0, toqueT = 0, posteI = 0, fase = 0;
  return (ap, t) => {
    const M = ap.M, eu = M.jog[ap.slot], B = M.B, G = M.G, inp = { mx: 0, my: 0 };
    if (!missao || t > fim) { const ms = ['zigue', 'trave', 'bola', 'trave', 'bola', 'parado', 'rede']; missao = ms[Math.floor(r() * ms.length)]; fim = t + (missao === 'parado' ? 1200 : 3500 + r() * 2500); fase = 0; posteI = Math.floor(r() * 4); troca = 0; }
    const vai = (x, y) => { const dx = x - eu.x, dy = y - eu.y, d = Math.hypot(dx, dy); if (d > U(0.6)) { inp.mx = dx / d; inp.my = dy / d; } };
    if (missao === 'zigue') {
      if (t > troca) { const a = r() * Math.PI * 2; dir = [Math.cos(a), Math.sin(a)]; troca = t + 220 + r() * 450; }
      const mx = (eu.x < G.GL + U(6) && dir[0] < 0) || (eu.x > G.GR - U(6) && dir[0] > 0) ? -dir[0] : dir[0];
      const my = (eu.y < G.GT + U(6) && dir[1] < 0) || (eu.y > G.GB - U(6) && dir[1] > 0) ? -dir[1] : dir[1];
      dir = [mx, my]; inp.mx = mx; inp.my = my;
    } else if (missao === 'trave') {                   // vai na trave pelo lado do campo, empurra nela girando e corre rente à linha
      const p = G.POSTS[posteI], s = p[0] < G.CX ? 1 : -1, sy = p[1] < G.CY ? -1 : 1;
      if (fase === 0) { const ax = p[0] + s * U(5), ay = p[1] + sy * U(3); vai(ax, ay); if (Math.hypot(ax - eu.x, ay - eu.y) < U(1)) { fase = 1; troca = t + 1300; } }
      else if (fase === 1) { const a = Math.atan2(p[1] - eu.y, p[0] - eu.x) + Math.sin(t / 180) * 0.6; inp.mx = Math.cos(a); inp.my = Math.sin(a); if (t > troca) { fase = 2; troca = t + 1500; } }
      else { inp.mx = -s; inp.my = sy * 0.35; if (t > troca) fase = 0; }
    } else if (missao === 'rede') {                    // por trás do gol, rente à rede, para lá e para cá
      const lado = posteI % 2 ? 1 : -1, x = lado < 0 ? G.LX0 - G.GOL_PROF - U(2.3) : G.LX1 + G.GOL_PROF + U(2.3);
      if (fase === 0) { vai(x, G.GOL_Y0 - U(3)); if (Math.hypot(x - eu.x, G.GOL_Y0 - U(3) - eu.y) < U(1.2)) fase = 1; }
      else { inp.mx = -lado * 0.5; inp.my = Math.sin(t / 400) > 0 ? 1 : -1; const l = Math.hypot(inp.mx, inp.my); inp.mx /= l; inp.my /= l; }
    } else if (missao === 'bola') {                    // conduz para o gol da direita e chuta
      const gx = G.LX1, gy = G.CY, ux = gx - B.x, uy = gy - B.y, ul = Math.hypot(ux, uy) || 1, off = ap.C.R_JOG + ap.C.R_BOLA + U(0.4);
      const ax = B.x - ux / ul * off, ay = B.y - uy / ul * off;
      if (Math.hypot(ax - eu.x, ay - eu.y) > U(1.2)) vai(ax, ay); else { inp.mx = ux / ul; inp.my = uy / ul; }
      if (Math.hypot(B.x - eu.x, B.y - eu.y) < ap.C.ALCANCE_CHUTE + U(0.5) && t > toqueT && (Math.hypot(gx - B.x, gy - B.y) < U(28) || r() < 0.01)) { ap.toque = { tipo: r() < 0.6 ? 'P' : 'K', resta: 3 }; toqueT = t + 900; }
    }
    toqueAgora(ap, inp);
    return inp;
  };
}
function roteiroB(r) {                                 // Beto: vai na bola e chuta para o gol da esquerda, com dribles e paradas
  let troca = 0, finta = 0, toqueT = 0, parado = 0;
  return (ap, t) => {
    const M = ap.M, eu = M.jog[ap.slot], B = M.B, G = M.G, inp = { mx: 0, my: 0 };
    if (t < parado) return inp;
    if (t > troca) { finta = (r() - 0.5) * 1.2; troca = t + 300 + r() * 700; if (r() < 0.08) parado = t + 400 + r() * 500; }
    const gx = G.LX0, gy = G.CY, ux = gx - B.x, uy = gy - B.y, ul = Math.hypot(ux, uy) || 1, off = ap.C.R_JOG + ap.C.R_BOLA + U(0.3);
    let dx = B.x - ux / ul * off - eu.x, dy = B.y - uy / ul * off - eu.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const c = Math.cos(finta), s = Math.sin(finta); inp.mx = dx * c - dy * s; inp.my = dx * s + dy * c;
    if (Math.hypot(B.x - eu.x, B.y - eu.y) < ap.C.ALCANCE_CHUTE + U(0.4) && t > toqueT && r() < 0.25) { ap.toque = { tipo: r() < 0.5 ? 'P' : 'K', resta: 3 }; toqueT = t + 700 + r() * 900; }
    toqueAgora(ap, inp);
    return inp;
  };
}

/* ---------------- a simulação ---------------- */
// o = {rede, seed, dur, cliente: 'v95'|'v96', fila: 'v95'|'v96', quadros}
export function simula(o = {}) {
  const dur = o.dur || 60000, seed = o.seed || 7, rede = typeof o.rede === 'string' ? REDES[o.rede] : (o.rede || REDES.br);
  const sim = { fila: new Fila(), agora: 0 };
  const modo = o.cliente || 'v96';
  const apar = [new Aparelho(sim, 'A', 0, modo), new Aparelho(sim, 'B', 1, modo)];
  const radios = apar.map((_, i) => new Radio(rede, rng(seed * 31 + i), dur));
  const sobe = apar.map((_, i) => new Link(sim, rede, radios[i], rng(seed * 97 + i)));
  const desce = apar.map((_, i) => new Link(sim, rede, radios[i], rng(seed * 131 + i)));
  const verdade = [];
  const P = new PartidaSala({
    n: 1, jogo: 'futebol', map: 4, tempo: 0, regra: null, quadros: o.quadros || 30, fila: o.fila || 'v96',
    jogadores: [{ netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Beto' }], agora: () => sim.agora,
    onSnapshot: d => { const txt = JSON.stringify(d); apar.forEach((ap, i) => desce[i].envia(sim.agora, txt, m => ap.snapshot(JSON.parse(m), sim.agora))); },
    onGol: () => {}, onAviso: () => {}, onFim: () => {},
  });
  for (const q of P.jog) q.fila.chegou = 0;
  P.meta = 999;                                        // (a medida não acaba no 3º gol)
  apar.forEach(ap => ap.inicia(P.perfil, 1));
  sim.manda = (ap, t, cmd) => sobe[apar.indexOf(ap)].envia(t, cmd, c => P.entrada(ap.netId, c));
  const rot = [roteiroA(rng(seed * 7 + 1)), roteiroB(rng(seed * 7 + 2))];
  const eng = [];                                      // os engasgos do servidor
  if (rede.engasgoCada) { const re = rng(seed * 211); let t = 800 + re() * rede.engasgoCada; while (t < dur) { const d = rede.engasgoMin + re() * (rede.engasgoMax - rede.engasgoMin); eng.push([t, t + d]); t += d + rede.engasgoCada * (0.4 + 1.2 * re()); } }
  let feitos = 0;
  const um = () => { P.passo(); const a = P.jog[0], b = P.jog[1]; verdade.push({ tick: P.tick, A: [a.x, a.y], Bj: [b.x, b.y], bola: [P.B.x, P.B.y], ackA: a.fila ? a.fila.feito : 0 }); };
  const laco = () => {                                 // (o MOTOR: o passo n no instante n/60 s; depois de um engasgo, no máximo 5 de uma vez)
    const alvo = Math.floor(sim.agora / STEP_MS + 1e-9);
    if (alvo - feitos > 5) feitos = alvo - 5;
    while (feitos < alvo) { feitos++; um(); }
    let prox = (feitos + 1) * STEP_MS; for (const e of eng) if (prox >= e[0] && prox < e[1]) prox = e[1];
    if (prox < dur) sim.fila.poe(prox, laco);
  };
  sim.fila.poe(STEP_MS, laco);
  apar.forEach((ap, i) => {                            // as telas a 60 Hz (o relógio oscila; 1,5% dos quadros se perdem)
    const rr = rng(seed * 53 + i), iv = 1000 / 60; let tq = 3 + rr() * iv;
    const quadro = () => { ap.quadro(sim.agora, rot[i](ap, sim.agora)); tq += iv * (rr() < 0.015 ? 2 : 1) + gauss(rr) * 0.35; if (tq < dur) sim.fila.poe(Math.max(sim.agora + 1, tq), quadro); };
    sim.fila.poe(tq, quadro);
  });
  for (;;) { const e = sim.fila.tira(); if (!e || e.t > dur + 2000) break; sim.agora = e.t; e.fn(); }
  return { A: apar[0], B: apar[1], verdade, P };
}

/* ---------------- as medidas (a tela da Ana) ---------------- */
export function mede(res) {
  const ap = res.A, V = res.verdade, C = ap.C, G = ap.M.G, R = ap.reg;
  const porAck = []; for (const v of V) if (v.ackA > 0) for (let s = Math.max(1, porAck.length); s <= v.ackA; s++) if (porAck[s] === undefined) porAck[s] = v;
  const vJ = C.VEL_JOG, vB = C.LIMITE_VEL_BOLA, rJ = C.R_JOG, rB = C.R_BOLA;
  const novo = () => ({ tele: 0, rapido: 0, excesso: 0, erro: [], dmax: 0, fura: 0, furaMax: 0 });
  const m = { quadros: 0, P: novo(), B: novo(), J: novo(), perto: [] };
  const seg = (x, y, s) => { const abx = s[2] - s[0], aby = s[3] - s[1], t = Math.max(0, Math.min(1, ((x - s[0]) * abx + (y - s[1]) * aby) / (abx * abx + aby * aby))); return Math.hypot(x - s[0] - abx * t, y - s[1] - aby * t); };
  const dentro = (p, r, linhas) => { let pior = 0; for (const q of G.POSTS) pior = Math.max(pior, r + G.POST_R - Math.hypot(p[0] - q[0], p[1] - q[1])); for (const s of G.NET_SEGS) pior = Math.max(pior, r - seg(p[0], p[1], s)); if (linhas) for (const s of G.WALL_SEGS) pior = Math.max(pior, r - seg(p[0], p[1], s)); return pior; };
  const conta = (o, pa, pb, vmax, tele, dt) => { const d = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]), lim = vmax * dt; if (d > o.dmax) o.dmax = d; if (d > tele * dt / STEP) o.tele++; if (d > lim * 1.5 + 0.5) o.rapido++; o.excesso += Math.max(0, d - lim * 1.15 - 0.3); };
  for (let i = 1; i < R.length; i++) {
    const a = R[i - 1], b = R[i], dt = (b.t - a.t) / 1000;
    if (!(dt > 0) || dt > 0.08 || b.t < 800) continue;
    if (a.est !== b.est || b.est === 'gol' || b.est === 'fim' || a.est === 'gol') continue;   // (a saída depois do gol: todo mundo vai para o lugar)
    m.quadros++;
    conta(m.P, a.P, b.P, vJ, U(1.2), dt); conta(m.B, a.B, b.B, vB, U(1.3), dt); conta(m.J, a.J[1], b.J[1], vJ, U(1.2), dt);
    const f = [dentro(b.P, rJ), dentro(b.B, rB, true), dentro(b.J[1], rJ)];
    if (f[0] > 4) m.P.fura++; if (f[1] > 3) m.B.fura++; if (f[2] > 4) m.J.fura++;
    m.P.furaMax = Math.max(m.P.furaMax, f[0]); m.B.furaMax = Math.max(m.B.furaMax, f[1]); m.J.furaMax = Math.max(m.J.furaMax, f[2]);
    const v = porAck[b.seq];
    if (v) {
      m.P.erro.push(Math.hypot(b.P[0] - v.A[0], b.P[1] - v.A[1])); m.B.erro.push(Math.hypot(b.B[0] - v.bola[0], b.B[1] - v.bola[1])); m.J.erro.push(Math.hypot(b.J[1][0] - v.Bj[0], b.J[1][1] - v.Bj[1]));
      if (Math.hypot(v.bola[0] - v.A[0], v.bola[1] - v.A[1]) < U(5)) m.perto.push(Math.hypot(b.B[0] - v.bola[0], b.B[1] - v.bola[1]));
    }
  }
  const min = Math.max(1e-9, m.quadros / 3600);
  const fecha = o => { const e = o.erro.slice().sort((x, y) => x - y); return { pulos_min: +(o.tele / min).toFixed(1), rapidos_min: +(o.rapido / min).toFixed(1), excesso_px_min: Math.round(o.excesso / min), pulo_max_px: Math.round(o.dmax), erro_med_px: e.length ? +(e.reduce((s, x) => s + x, 0) / e.length).toFixed(1) : null, erro_p95_px: e.length ? Math.round(e[Math.floor(e.length * 0.95)]) : null, dentro_min: +(o.fura / min).toFixed(1), dentro_max_px: Math.round(o.furaMax) }; };
  return { quadros: m.quadros, eu: fecha(m.P), bola: Object.assign(fecha(m.B), { perto_med_px: m.perto.length ? +(m.perto.reduce((s, x) => s + x, 0) / m.perto.length).toFixed(1) : null }), outro: fecha(m.J) };
}
// a média de várias sementes
export function media(o, seeds) {
  const acc = { eu: {}, bola: {}, outro: {} };
  for (const seed of seeds) { const m = mede(simula(Object.assign({}, o, { seed }))); for (const k of ['eu', 'bola', 'outro']) for (const [c, v] of Object.entries(m[k])) acc[k][c] = (acc[k][c] || 0) + (v || 0) / seeds.length; }
  for (const k of ['eu', 'bola', 'outro']) for (const c in acc[k]) acc[k][c] = Math.round(acc[k][c] * 10) / 10;
  return acc;
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const rede = process.argv[2] || 'br', dur = (+(process.argv[3] || 60)) * 1000;
  console.log('RACHA · o simulador da rede: ' + rede + ' (' + JSON.stringify(REDES[rede]) + ') · ' + dur / 1000 + ' s × 4 sementes\n');
  const linha = (nome, a) => { console.log(nome); for (const k of ['eu', 'bola', 'outro']) console.log('  ' + k.padEnd(6) + JSON.stringify(a[k])); };
  linha('antes (a fila e as correções da v95):', media({ rede, dur, cliente: 'v95', fila: 'v95' }, [1, 2, 3, 4]));
  linha('agora (v96):', media({ rede, dur, cliente: 'v96', fila: 'v96' }, [1, 2, 3, 4]));
}
