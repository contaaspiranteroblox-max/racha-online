// RACHA v102 · O SIMULADOR DO ONLINE LISO (sem navegador): o motor das salas de verdade (server/partida/sala.js) + uma cópia
// fiel do aparelho (a previsão da v92 com o desenho liso da v96 — tools/v92/rede.js e tools/v96/rede.js — e, com o cliente
// 'v102', o núcleo de tools/v102/liso.js, o MESMO arquivo do jogo: as direções dos outros e o crédito no replay), ligados pela
// mesma internet de mentira do tests/v92_proxy.cjs: o atraso em cada sentido, a oscilação na ordem do TCP, os picos do rádio
// de cada aparelho (os dois sentidos juntos) e as rajadas. Mede o que a tela da Ana desenha com as mesmas contas do
// tests/v102_rede_medidas.py (o tranco d2, os pulos, os rápidos, as paradas, o erro contra a verdade e as correções).
// Uso: node tests/v102/sim.mjs [rede] [segundos] [sementes]       (rede: direto, 4g, 4g_ruim)
//      VARIANTES='cliente=v96;cliente=v102' (o padrão; cliente=v105: o de hoje, com o contato desenhado e 60 quadros) · contato=0..5
//      (v105: 4 = o do jogo, só a bola; 1/3/5 = com as tampinhas também, medidos e deixados de fora) · as partes do v102: entradas=servidor, credito=1 · guarda=140 (ms: o
//      buraco entre dois comandos que tira o crédito por 2 s) · engasgo=0.004 (a chance, por quadro, do aparelho travar
//      engMin..engMax ms: 60..300) · fila=v95 · quadros=60
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const N = require(path.join(RAIZ, 'server/partida/nucleo.js'));
const { PartidaSala } = require(path.join(RAIZ, 'server/partida/sala.js'));
const L = require(path.join(RAIZ, 'tools/v96/liso.js'));
let L2 = null; try { L2 = require(path.join(RAIZ, 'tools/v102/liso.js')); } catch (_) {}
let K105 = null; try { K105 = require(path.join(RAIZ, 'tools/v105/rede.js')); } catch (_) {}   // (v105: o contato desenhado)
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

/* ---------------- a internet de mentira: a mesma do tests/v92_proxy.cjs (as condições do v102_rede_medidas.py) ---------------- */
export const REDES = {
  direto: { atraso: 0.3, oscila: 0.3, pico: 0, picoCada: 0, rajada: 0, rajadaMs: 0 },
  '4g': { atraso: 50, oscila: 30, pico: 150, picoCada: 4000, rajada: 0.03, rajadaMs: 40 },
  '4g_ruim': { atraso: 80, oscila: 30, pico: 150, picoCada: 2000, rajada: 0.08, rajadaMs: 50 },
};
class Radio {                                         // os picos de um aparelho (os dois sentidos juntos): [início, fim]
  constructor(p, r, dur) { this.jan = []; if (p.pico > 0 && p.picoCada > 0) { let t = -Math.log(1 - r()) * p.picoCada; while (t < dur + 3000) { this.jan.push([t, t + p.pico]); t += -Math.log(1 - r()) * p.picoCada; } } }
  ate(t) { let a = 0; for (const j of this.jan) { if (j[0] > t) break; if (t < j[1]) a = Math.max(a, j[1]); } return a; }
}
class Link {
  constructor(sim, p, radio, r) { this.sim = sim; this.p = p; this.radio = radio; this.r = r; this.ult = 0; }
  envia(t, msg, entrega) {
    const p = this.p, r = this.r;
    let q = t + p.atraso + (p.oscila ? (r() * 2 - 1) * p.oscila : 0);
    if (p.rajada > 0 && r() < p.rajada) q += 10 + r() * Math.max(0, p.rajadaMs - 10);
    const a = this.radio.ate(t); if (a && q < a + p.atraso) q = a + p.atraso;
    if (q < this.ult) q = this.ult;
    this.ult = q;
    this.sim.fila.poe(q, () => entrega(msg));
  }
}

/* ---------------- o aparelho: a previsão da v92 (tools/v92/rede.js) + o desenho da v96 (+ o replay da v102) ---------------- */
// o.entradas: 'vel' (os outros seguem a direção da velocidade do quadro: o de sempre) | 'servidor' (o que ele quer e as da fila
// dele: Q.ent) · o.credito: o crédito (Q.cred) no replay — os dois juntos são o cliente 'v102' (tools/v102/liso.js)
class Aparelho {
  constructor(sim, netId, slot, o) {
    this.sim = sim; this.netId = netId; this.slot = slot; this.o = o;
    this.seq = 0; this.pend = []; this.kc = 0; this.pc = 0; this.ackKc = 0; this.ackPc = 0; this.ackBh = 0; this.ultChute = -99;
    this.lastTick = -1; this.acc = 0; this.ultInp = { mx: 0, my: 0 }; this.tDraw = 0; this.tFrame = null; this.snapAt = 0; this.reg = []; this.snaps = []; this.toque = null;
    this.dP = L.novo(); this.dB = L.novo(); this.dJ = []; this.ant = null; this.saltoP = this.saltoB = true; this.saltoJ = []; this.ultEst = null;
    this.fut = null; this.base = 0; this.ultCmdT = null; this.semCreditoAte = 0; this.travadas = 0;
  }
  inicia(perfil, n) {
    const C = this.C = N.resolve(perfil), G = N.novoCampo(n);
    const M = this.M = { G, B: N.novaBola(C, G.CX, G.CY), jog: [], estado: 'saida', saidaTime: 0, jogo: 'futebol', trave: 0, tick: 0 };
    for (let i = 0; i < n * 2; i++) M.jog.push({ i, x: G.CX, y: G.CY, vx: 0, vy: 0, r: C.R_JOG, m: C.MASSA_JOG, mx: 0, my: 0, time: Math.floor(i / n) });
    this.bt = N.novoBotao(); this.dJ = M.jog.map(() => L.novo());
    const ap = this;
    this.cb = { toques() { const M = ap.M; if (M.estado !== 'saida') return; const B = M.B, lim = ap.C.R_BOLA + 2; for (const q of M.jog) if (q.time === M.saidaTime && Math.hypot(q.x - B.x, q.y - B.y) <= q.r + lim) { M.estado = 'jogo'; return; } } };
    this.chutaCb = (q, f) => { const tk = this.M.tick + 1; if (this.C.DB_MODO !== 1 && tk - this.ultChute < 2) return false; const ok = N.chute(this.M, this.C, q, f); if (ok) this.ultChute = tk; return ok; };
  }
  entradaOutros() {                                   // (v102) a entrada de cada um dos outros neste passo da previsão
    const F = this.fut; if (!F) return;
    const k = this.M.tick - this.base + 1;             // (k = 1: o primeiro passo depois do quadro)
    for (let i = 0; i < this.M.jog.length; i++) {
      if (i === this.slot) continue;
      const q = this.M.jog[i], c = L2.noPasso(F, i, k, this.o.reto === false ? null : q, this.C.VEL_JOG); if (!c) continue;
      q.mx = c[0]; q.my = c[1];
    }
  }
  prevPasso(cmd) {                                     // v92PrevPasso
    const M = this.M, C = this.C, eu = M.jog[this.slot], vale = M.estado === 'saida' || M.estado === 'jogo';
    if (vale) { N.botaoComando(this.bt, cmd, C); eu.mx = cmd.x; eu.my = cmd.y; N.botaoTick(M, C, eu, this.bt, this.chutaCb); } else { eu.mx = eu.my = 0; }
    this.entradaOutros();
    N.passo(M, C, this.cb); M.tick++;
  }
  prevSolo(cmd) {                                      // (v102, tools/v102/liso.js) um comando que o servidor vai pagar na recuperação: só a tampinha anda
    const M = this.M, C = this.C, eu = M.jog[this.slot];
    N.botaoComando(this.bt, cmd, C);
    N.passoSolo(M, C, eu, cmd);
  }
  comando(d, t) {                                      // v92Comando
    const lp = d.tapK, lc = d.tapP; if (lp) this.kc++; if (lc) this.pc++;
    const hp = d.holdK, hc = d.holdP, button = hc || lc ? 3 : hp || lp ? 2 : 1;
    const cmd = { type: 'input', seq: ++this.seq, x: d.mx, y: d.my, button, k: 0, kc: this.kc, pc: this.pc, bh: (hp || lp ? 1 : 0) | (hc || lc ? 2 : 0) };
    // (v102, como no tools/v102/liso.js) depois de um buraco nosso de mais de `guarda` ms entre dois comandos (e no primeiro
    // comando da partida), o crédito fica de fora por 2 s
    if (this.o.credito && (this.ultCmdT == null || t - this.ultCmdT > (this.o.guarda || 140))) { this.semCreditoAte = t + 2000; if (this.ultCmdT != null) this.travadas++; }
    this.ultCmdT = t;
    this.sim.manda(this, t, cmd);
    this.pend.push(cmd); if (this.pend.length > 120) this.pend.shift();
    this.prevPasso(cmd); d.tapK = d.tapP = false;
  }
  baseQuadro(s) {                                      // v92Base
    const M = this.M, C = this.C, b = s.ball;
    M.tick = s.tick; M.estado = s.state; M.saidaTime = s.kickoff === 1 ? 1 : 0;
    Object.assign(M.B, { x: b[0], y: b[1], vx: b[2], vy: b[3], w: b[4] || 0, cv: b[5] || 0, cvT: b[6] || 0, cvUx: null, cvUy: null });
    for (let i = 0; i < M.jog.length; i++) {
      const v = s.players[i], q = M.jog[i]; if (!v) continue;
      q.x = v[0]; q.y = v[1]; q.vx = v[2]; q.vy = v[3];
      if (i !== this.slot) { const sp = Math.hypot(v[2], v[3]); if (sp > C.VEL_JOG * 0.3) { q.mx = v[2] / sp; q.my = v[3] / sp; } else q.mx = q.my = 0; }
    }
    this.fut = null; this.base = s.tick;
    if (this.o.entradas === 'servidor' && Array.isArray(s.ent) && L2) this.fut = L2.entradas(s.ent, this.slot);
    const pl = s.players[this.slot], bt = pl ? pl[7] : null, m = this.bt;
    if (typeof bt === 'number') { m.estado = (bt & 3) || 1; m.livre = !!(bt & 4); m.armaTipo = (bt >> 3) & 3; m.arma = (bt >> 5) & 31; }
    m.kc = this.ackKc; m.pc = this.ackPc;
    if (pl && Number.isFinite(pl[5])) this.ultChute = pl[5];
  }
  snapshot(s, t) {                                     // net49Snapshot (v92) → v92SnapPrev (v96)
    if (!(s.tick > this.lastTick)) return;
    this.lastTick = s.tick; this.snapAt = t;
    const M = this.M, eu = M.jog[this.slot];
    const antesP = [eu.x, eu.y], antesB = [M.B.x, M.B.y], antesJ = M.jog.map(q => [q.x, q.y]), tick0 = M.tick;
    const ack = s.players[this.slot] ? s.players[this.slot][4] | 0 : 0;
    while (this.pend.length && this.pend[0].seq <= ack) { const c = this.pend.shift(); this.ackKc = c.kc | 0; this.ackPc = c.pc | 0; this.ackBh = c.bh | 0; }
    this.baseQuadro(s);
    // (v102) o seu crédito: os comandos que a recuperação do servidor vai pagar andam só a sua tampinha (o mundo não anda)
    //       espalhados entre os refeitos (L2.ehSolo), como no tools/v102/liso.js
    const solo = this.o.credito && L2 && !(t < this.semCreditoAte) ? L2.solo(s.cred, this.slot, this.pend.length) : 0, n = this.pend.length;
    this.pend.forEach((c, i) => { if (L2 && L2.ehSolo(i, solo, n) && (M.estado === 'saida' || M.estado === 'jogo')) this.prevSolo(c); else this.prevPasso(c); });
    const p = L.PADRAO, ant = this.ultEst; this.ultEst = s.state;
    const reinicio = ant == null || (s.state !== ant && (s.state === 'saida' || s.state === 'fim'));
    const dP = [antesP[0] - eu.x, antesP[1] - eu.y], dB = [antesB[0] - M.B.x, antesB[1] - M.B.y];
    const outro = 1 - this.slot, dJo = [antesJ[outro][0] - M.jog[outro].x, antesJ[outro][1] - M.jog[outro].y];
    this.snaps.push({ t, tick: s.tick, est: s.state, cP: Math.hypot(dP[0], dP[1]), cB: Math.hypot(dB[0], dB[1]), cJ: Math.hypot(dJo[0], dJo[1]), salto: M.tick - tick0, pend: this.pend.length, cred: Array.isArray(s.cred) ? s.cred[this.slot] | 0 : 0, solo });
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
    const t = Math.max(0, Math.min(STEP, this.acc));
    const d = N.direcao(this.ultInp.mx, this.ultInp.my, C.DIRECOES), vale = M.estado === 'saida' || M.estado === 'jogo';
    let vx = 0, vy = 0;
    if (vale && (d.mx || d.my) && C.VIRA_NA_HORA) { vx = d.mx * C.VEL_JOG; vy = d.my * C.VEL_JOG; }   // (v105: a virada na hora, como o jogo)
    else if (vale && (d.mx || d.my)) { vx = eu.vx + d.mx * C.VEL_JOG; vy = eu.vy + d.my * C.VEL_JOG; const v = Math.hypot(vx, vy); if (v > C.VEL_JOG) { vx *= C.VEL_JOG / v; vy *= C.VEL_JOG / v; } }
    let P = [Math.max(G.GL + eu.r, Math.min(G.GR - eu.r, eu.x + vx * t)), Math.max(G.GT + eu.r, Math.min(G.GB - eu.r, eu.y + vy * t))];
    const bp = this.bolaAgora(t);
    let B = [bp.x, bp.y];
    let J = M.jog.map((q, i) => i === this.slot ? P : [q.x + q.vx * t, q.y + q.vy * t]);
    const p = L.PADRAO, tau = 0.09;
    L.anda(this.dP, dt, tau, L.tetoJ(C, p));
    L.anda(this.dB, dt, tau * 0.9, L.tetoB(C, p, Math.hypot(M.B.vx, M.B.vy), Math.hypot(M.B.x - eu.x, M.B.y - eu.y), U), p.gB, U(p.livreB));
    M.jog.forEach((q, i) => { if (i !== this.slot) L.anda(this.dJ[i], dt, tau, L.tetoJ(C, p)); });
    const A = this.ant || {}, vJ = L.guardaJ(C, p), vB = L.guardaB(C, p);
    const poe = (pos, ant, dd, vmax, salto, x0, y0, r, bola) => { let q = [pos[0] + dd.x, pos[1] + dd.y]; if (!salto && ant) q = L.guarda(q, ant, dd, vmax, dt); return L.varre(N, G, x0, y0, q[0], q[1], r, bola); };
    P = poe(P, A.P, this.dP, vJ, this.saltoP, eu.x, eu.y, eu.r, false);
    B = poe(B, A.B, this.dB, vB, this.saltoB, M.B.x, M.B.y, M.B.r, true);
    J = M.jog.map((q, i) => i === this.slot ? P : poe(J[i], A.J && A.J[i], this.dJ[i], vJ, !!this.saltoJ[i], q.x, q.y, q.r, false));
    // (v105, tools/v105/rede.js) o contato desenhado: as tampinhas dos outros fora da sua e umas das outras, a bola fora de todas;
    // o empurrão entra no deslize de cada um (contato=1, o do jogo: quem está mais fora do lugar sai mais; contato=3: a bola sai
    // toda; contato=2: só neste quadro, sem mexer nos deslizes)
    if (this.o.contato && K105) {
      const J0 = J.map(a => a.slice()), B0 = B.slice();
      J = J.map((a, i) => i === this.slot ? P : a.slice()); B = B.slice();
      const w = this.o.contato >= 3 ? null : { B: Math.hypot(this.dB.x, this.dB.y), J: this.dJ.map(d => d ? Math.hypot(d.x, d.y) : 0) };
      const capB = this.o.contato === 4 ? Math.max(6, 1100 * Math.max(1 / 240, Math.min(0.05, dt || 1 / 60))) : 0;   // (o do jogo: o teto por quadro da bola)
      if (K105.separa(J, B, this.slot, C.R_JOG, C.R_BOLA, null, w, this.o.contato === 4, this.o.contato === 5 ? (+process.env.CAPJ || 2.5) : 0, capB) > 0.01) {
        B = L.varre(N, G, B0[0], B0[1], B[0], B[1], C.R_BOLA, true);
        if (this.o.contato !== 2) {
          K105.empurra(this.dB, B[0] - B0[0], B[1] - B0[1]);
          J.forEach((a, i) => { if (i !== this.slot) K105.empurra(this.dJ[i], a[0] - J0[i][0], a[1] - J0[i][1]); });
        }
      }
    }
    this.ant = { P: P.slice(), B: B.slice(), J: J.map(a => a.slice()) }; this.saltoP = this.saltoB = false; this.saltoJ = [];
    return { P, B, J, offP: Math.hypot(this.dP.x, this.dP.y) };
  }
  quadro(t, inp) {                                     // v92RemoteFrame + net49Draw
    let dt = this.tFrame == null ? STEP_MS : t - this.tFrame; this.tFrame = t;
    const n = Math.round(dt / STEP_MS); if (n >= 1 && Math.abs(dt - n * STEP_MS) < 6) dt = n * STEP_MS;   // (dtSnap)
    dt = Math.min(dt, 8 * STEP_MS);                  // (DT_MAX_ARC: um quadro alcança no máximo 8 passos; o resto do buraco se perde)
    this.ultInp = { mx: inp.mx, my: inp.my };
    if (t - this.snapAt <= 2000 || this.lastTick < 0) { this.acc += dt / 1000; while (this.acc + 1e-9 >= STEP) { this.comando(inp, t); this.acc = Math.max(0, this.acc - STEP); } }
    const D = this.mostra(t);
    this.reg.push({ t, est: this.M.estado, P: D.P.slice(), B: D.B.slice(), J: D.J.map(a => a.slice()), offP: D.offP || 0 });
  }
}

/* ---------------- os roteiros (o dedo de cada um: decide pelo que o próprio aparelho desenha) ---------------- */
function toqueAgora(ap, inp) { if (!ap.toque) return; if (ap.toque.resta === 3) { if (ap.toque.tipo === 'P') inp.tapP = true; else inp.tapK = true; } if (ap.toque.tipo === 'P') inp.holdP = true; else inp.holdK = true; if (--ap.toque.resta <= 0) ap.toque = null; }
function roteiroA(r) {                                 // a Ana (a medida): zigue-zague, vai na bola e conduz para o gol, persegue, para
  let missao = null, fim = 0, dir = [1, 0], troca = 0, toqueT = 0;
  return (ap, t, D) => {
    const G = ap.M.G, C = ap.C, eu = { x: D.P[0], y: D.P[1] }, B = { x: D.B[0], y: D.B[1] }, inp = { mx: 0, my: 0 }, alvoX = ap.slot === 0 ? G.LX1 : G.LX0;
    if (!missao || t > fim) { const ms = ['zigue', 'bola', 'zigue', 'bola', 'persegue', 'parado']; missao = ms[Math.floor(r() * ms.length)]; fim = t + (missao === 'parado' ? 900 + r() * 500 : 3000 + r() * 3000); troca = 0; }
    const vai = (dx, dy) => { const l = Math.hypot(dx, dy); if (l > 1e-6) { inp.mx = dx / l; inp.my = dy / l; } };
    if (missao === 'zigue') {
      if (t > troca) { const g = r() * Math.PI * 2; dir = [Math.cos(g), Math.sin(g)]; troca = t + 220 + r() * 450; }
      let [mx, my] = dir;
      if ((eu.x < G.GL + U(6) && mx < 0) || (eu.x > G.GR - U(6) && mx > 0)) mx = -mx;
      if ((eu.y < G.GT + U(6) && my < 0) || (eu.y > G.GB - U(6) && my > 0)) my = -my;
      dir = [mx, my]; vai(mx, my);
    } else if (missao === 'persegue') vai(B.x - eu.x, B.y - eu.y);
    else if (missao === 'bola') {
      const ux = alvoX - B.x, uy = G.CY - B.y, ul = Math.hypot(ux, uy) || 1, off = C.R_JOG + C.R_BOLA + U(0.4);
      const ax = B.x - ux / ul * off, ay = B.y - uy / ul * off, d = Math.hypot(ax - eu.x, ay - eu.y);
      if (Math.hypot(B.x - eu.x, B.y - eu.y) < C.ALCANCE_CHUTE + U(0.5) && t > toqueT && (Math.hypot(alvoX - B.x, G.CY - B.y) < U(28) || r() < 0.01)) { ap.toque = { tipo: r() < 0.6 ? 'P' : 'K', resta: 3 }; toqueT = t + 900; }
      if (d > U(1.2)) vai(ax - eu.x, ay - eu.y); else vai(ux, uy);
    }
    const q = N.direcao(inp.mx, inp.my, ap.C.DIRECOES); inp.mx = q.mx; inp.my = q.my;
    toqueAgora(ap, inp);
    return inp;
  };
}
function roteiroB(r) {                                 // o Beto: vai na bola e leva para o gol dele, com fintas, toques e paradas
  let troca = 0, finta = 0, toqueT = 0, parado = 0;
  return (ap, t, D) => {
    const G = ap.M.G, C = ap.C, eu = { x: D.P[0], y: D.P[1] }, B = { x: D.B[0], y: D.B[1] }, inp = { mx: 0, my: 0 }, alvoX = ap.slot === 0 ? G.LX1 : G.LX0;
    if (t < parado) return inp;
    if (t > troca) { finta = (r() - 0.5) * 1.2; troca = t + 300 + r() * 700; if (r() < 0.08) parado = t + 400 + r() * 500; }
    const ux = alvoX - B.x, uy = G.CY - B.y, ul = Math.hypot(ux, uy) || 1, off = C.R_JOG + C.R_BOLA + U(0.3);
    let dx = B.x - ux / ul * off - eu.x, dy = B.y - uy / ul * off - eu.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const c = Math.cos(finta), s = Math.sin(finta); inp.mx = dx * c - dy * s; inp.my = dx * s + dy * c;
    if (Math.hypot(B.x - eu.x, B.y - eu.y) < C.ALCANCE_CHUTE + U(0.4) && t > toqueT && r() < 0.25) { ap.toque = { tipo: r() < 0.5 ? 'P' : 'K', resta: 3 }; toqueT = t + 700 + r() * 900; }
    const q = N.direcao(inp.mx, inp.my, ap.C.DIRECOES); inp.mx = q.mx; inp.my = q.my;
    toqueAgora(ap, inp);
    return inp;
  };
}

/* ---------------- a simulação ---------------- */
// o = {rede, seed, dur, cliente: 'v96'|'v102' (ou as partes: entradas 'vel'|'servidor', credito), fila (a do servidor: 'v96' |
//      'v95'), quadros, ocupado: ms do quadro com o aparelho ocupado (as mensagens esperam), guarda (ms), engasgo, engMin,
//      engMax (o aparelho travando: veja o quadro() abaixo)}
export function simula(o = {}) {
  const dur = o.dur || 60000, seed = o.seed || 7, rede = typeof o.rede === 'string' ? REDES[o.rede] : (o.rede || REDES['4g']);
  const sim = { fila: new Fila(), agora: 0 };
  const v105 = o.cliente === 'v105', v102 = o.cliente === 'v102' || v105;   // (v105: o cliente de hoje — o da v102 + o contato desenhado, com as salas a 60 quadros)
  const opc = { entradas: o.entradas || (v102 ? "servidor" : "vel"), credito: o.credito != null ? !!o.credito : v102, guarda: o.guarda, reto: o.reto, contato: o.contato != null ? o.contato | 0 : (v105 ? 4 : 0) };
  const apar = [new Aparelho(sim, 'A', 0, opc), new Aparelho(sim, 'B', 1, opc)];
  const radios = apar.map((_, i) => new Radio(rede, rng(seed * 31 + i), dur));
  const sobe = apar.map((_, i) => new Link(sim, rede, radios[i], rng(seed * 97 + i)));
  const desce = apar.map((_, i) => new Link(sim, rede, radios[i], rng(seed * 131 + i)));
  const ocup = apar.map(() => 0);                       // (o aparelho ocupado no quadro: a mensagem espera)
  const verdade = [];
  const P = new PartidaSala({
    // (o servidor da v102 — Q.ent, Q.cred e a sobra do crédito que acaba — só com o cliente que usa; o cliente 'v96' joga
    //  com o servidor de antes, como o "antes" das medidas com RACHA_ENTRADAS=0; o.servidor102 escolhe)
    entradas: o.servidor102 != null ? !!o.servidor102 : (opc.entradas === 'servidor' || opc.credito),
    n: 1, jogo: 'futebol', map: 4, tempo: 5, regra: null, quadros: o.quadros || (v105 ? 60 : 30), fila: o.fila || undefined, fisica: o.fisica || undefined,   // (v105: o.fisica compara perfis — o jogo de corpo)
    jogadores: [{ netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Beto' }], agora: () => sim.agora,
    onSnapshot: d => { const txt = JSON.stringify(d); apar.forEach((ap, i) => desce[i].envia(sim.agora, txt, m => { const tt = Math.max(sim.agora, ocup[i]); if (tt > sim.agora) sim.fila.poe(tt, () => ap.snapshot(JSON.parse(m), sim.agora)); else ap.snapshot(JSON.parse(m), sim.agora); })); },
    onGol: () => {}, onAviso: () => {}, onFim: () => {},
  });
  for (const q of P.jog) q.fila.chegou = 0;
  apar.forEach(ap => ap.inicia(P.perfil, 1));
  sim.manda = (ap, t, cmd) => sobe[apar.indexOf(ap)].envia(t, cmd, c => P.entrada(ap.netId, c));
  const rot = [roteiroA(rng(seed * 7 + 1)), roteiroB(rng(seed * 7 + 2))];
  let feitos = 0;
  const um = () => { P.passo(); verdade.push({ tick: P.tick, t: sim.agora, est: P.estado, j: P.jog.map(q => [q.x, q.y]), b: [P.B.x, P.B.y], fila: P.jog.map(q => q.fila ? [q.fila.feito, q.fila.fila.length, q.fila.ult ? q.fila.ult.seq : -1] : null) }); };
  // o.servJit (ms): o setTimeout do motor acordando atrasado (o servidor dividindo a CPU: em média servJit ms, sorteado) — ele
  // alcança os passos que faltam de uma vez, como o MOTOR do server/partida/sala.js
  const rs = rng(seed * 89 + 5);
  const laco = () => { const alvo = Math.floor(sim.agora / STEP_MS + 1e-9); if (alvo - feitos > 5) feitos = alvo - 5; while (feitos < alvo) { feitos++; um(); } const prox = (feitos + 1) * STEP_MS; if (prox < dur) sim.fila.poe(prox + (o.servJit ? -Math.log(1 - rs()) * o.servJit : 0), laco); };
  sim.fila.poe(STEP_MS, laco);
  apar.forEach((ap, i) => {                            // as telas a 60 Hz (o relógio oscila; 1,5% dos quadros se perdem)
    const rr = rng(seed * 53 + i), re = rng(seed * 71 + i), iv = 1000 / 60; let tq = 3 + rr() * iv;
    // o.engasgo: a chance, em cada quadro, do aparelho travar (o celular ocupado: coleta de lixo, outro app, o calor) por
    // o.engMin..o.engMax ms — nada de comando nem de quadro nesse tempo; depois o quadro alcança no máximo 8 passos
    const quadro = () => {
      const ant = ap.reg.length ? ap.reg[ap.reg.length - 1] : { P: [ap.M.jog[ap.slot].x, ap.M.jog[ap.slot].y], B: [ap.M.B.x, ap.M.B.y] };
      ap.quadro(sim.agora, rot[i](ap, sim.agora, ant));
      let ocupa = o.ocupado == null ? 4 + rr() * 6 : o.ocupado * rr();
      tq += iv * (rr() < 0.015 ? 2 : 1) + gauss(rr) * 0.35;
      if (o.engasgo && re() < o.engasgo) { const g = (o.engMin || 60) + re() * ((o.engMax || 300) - (o.engMin || 60)); ocupa = Math.max(ocupa, g); tq += Math.floor(g / iv) * iv; }
      ocup[i] = sim.agora + ocupa;
      if (tq < dur) sim.fila.poe(Math.max(sim.agora + 1, tq), quadro);
    };
    sim.fila.poe(tq, quadro);
  });
  for (;;) { const e = sim.fila.tira(); if (!e || e.t > dur + 2000) break; sim.agora = e.t; e.fn(); }
  return { A: apar[0], B: apar[1], verdade, P };
}

/* ---------------- as medidas (as mesmas do tests/v102_rede_medidas.py) ---------------- */
const VJ = U(14.1), VB = U(46.75), Q = STEP_MS;
const rms = xs => xs.length ? Math.sqrt(xs.reduce((s, x) => s + x * x, 0) / xs.length) : null;
const pct = (xs, q) => { if (!xs.length) return null; const s = xs.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1) + 0.5))]; };
const r2 = (v, n = 2) => v == null ? null : +v.toFixed(n);
function medMovel(xs, meia) { const out = []; for (let i = 0; i < xs.length; i++) { const w = xs.slice(Math.max(0, i - meia), i + meia + 1).sort((a, b) => a - b); out.push(w.length % 2 ? w[w.length >> 1] : (w[w.length / 2 - 1] + w[w.length / 2]) / 2); } return out; }
function trechos(R) {
  const seg = []; let cur = [], ini = null;
  for (const f of R) {
    if (f.est === 'jogo') { if (ini == null) ini = f.t; if (f.t - ini >= 500) cur.push(f); }
    else { if (cur.length > 10) seg.push(cur); cur = []; ini = null; }
  }
  if (cur.length > 10) seg.push(cur);
  return seg;
}
function medeObjeto(segs, pos, vmax) {
  const d2 = []; let saltos = 0, rapidos = 0, paradas = 0, nMov = 0, nTot = 0;
  for (const s of segs) {
    const ps = s.map(pos), ts = s.map(f => f.t);
    const dt = [], norm = [];
    for (let i = 1; i < ps.length; i++) { dt.push(ts[i] - ts[i - 1]); const p = Math.hypot(ps[i][0] - ps[i - 1][0], ps[i][1] - ps[i - 1][1]); norm.push(dt[i - 1] > 1 ? p * Q / dt[i - 1] : p); }
    const med = medMovel(norm, 15);
    for (let i = 0; i < norm.length; i++) {
      nTot++;
      if (!(dt[i] > 8 && dt[i] < 40) || !(med[i] > 0.67)) continue;
      nMov++;
      if (norm[i] > 2.5 * med[i] && norm[i] > 2) saltos++;
      if (norm[i] * 60 > 1.5 * vmax) rapidos++;
      if (norm[i] < 0.15 * med[i] && med[i] > 1.5) paradas++;
      if (i + 1 < norm.length && dt[i] > 12 && dt[i] < 22 && dt[i + 1] > 12 && dt[i + 1] < 22) {
        const v1 = [(ps[i + 1][0] - ps[i][0]) / dt[i], (ps[i + 1][1] - ps[i][1]) / dt[i]], v2 = [(ps[i + 2][0] - ps[i + 1][0]) / dt[i + 1], (ps[i + 2][1] - ps[i + 1][1]) / dt[i + 1]];
        d2.push(Math.hypot(v2[0] - v1[0], v2[1] - v1[1]) * Q);
      }
    }
  }
  const min = Math.max(1e-9, nTot * Q / 60000);
  return { d2_rms_px: r2(rms(d2)), d2_p99_px: r2(pct(d2, 0.99)), pulos_min: r2(saltos / min, 1), rapidos_min: r2(rapidos / min, 1), paradas_min: r2(paradas / min, 1) };
}
function verdadePos(V, t, quem) {                      // (a verdade num instante: entre dois passos)
  let lo = 0, hi = V.length - 1; if (!(hi > 0) || t <= V[0].t || t >= V[hi].t) return null;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (V[m].t < t) lo = m; else hi = m; }
  const a = V[lo], b = V[hi]; if (a.est !== 'jogo' || b.est !== 'jogo') return null;
  const u = (t - a.t) / Math.max(1e-6, b.t - a.t), pa = quem === 'b' ? a.b : a.j[quem], pb = quem === 'b' ? b.b : b.j[quem];
  return [pa[0] + (pb[0] - pa[0]) * u, pa[1] + (pb[1] - pa[1]) * u];
}
function contraVerdade(segs, V, pos, quem) {
  const am = []; for (const s of segs) for (let i = 0; i < s.length; i += 3) am.push(s[i]);
  const erro = L => { const es = []; for (const f of am) { const q = verdadePos(V, f.t - L, quem); if (q) { const p = pos(f); es.push(Math.hypot(p[0] - q[0], p[1] - q[1])); } } return es; };
  let melhor = null;
  for (let L = -250; L <= 400; L += 10) { const es = erro(L); if (es.length > 50) { const m = es.reduce((s, x) => s + x, 0) / es.length; if (!melhor || m < melhor[1]) melhor = [L, m, es]; } }
  if (!melhor) return {};
  return { atraso_ms: melhor[0], erro_med_px: r2(melhor[1], 1), erro_p95_px: r2(pct(melhor[2], 0.95), 1) };
}
export function mede(res) {
  const ap = res.A, V = res.verdade, segs = trechos(ap.reg.filter(f => f.t > 1500));
  const out = { quadros: segs.reduce((s, x) => s + x.length, 0) };
  const ref = {};
  for (const [nome, pos, vmax, quem] of [['eu', f => f.P, VJ, 0], ['outro', f => f.J[1], VJ, 1], ['bola', f => f.B, VB, 'b']]) {
    out[nome] = Object.assign(medeObjeto(segs, pos, vmax), contraVerdade(segs, V, pos, quem));
    const L = out[nome].atraso_ms || 0;
    const sv = segs.map(s => s.map(f => ({ t: f.t, p: verdadePos(V, f.t - L, quem) })).filter(f => f.p));
    ref[nome] = medeObjeto(sv.filter(s => s.length > 10), f => f.p, vmax);
  }
  const sj = ap.snaps.filter(s => s.est === 'jogo' && s.t > 1500);
  const cP = sj.map(s => s.cP), cJ = sj.map(s => s.cJ), cB = sj.map(s => s.cB), off = segs.flatMap(s => s.map(f => f.offP));
  Object.assign(out.eu, { correcao_p95_px: r2(pct(cP, 0.95)), correcao_max_px: r2(Math.max(0, ...cP)), correcoes_1px_pct: r2(100 * cP.filter(c => c > 1).length / Math.max(1, cP.length), 1), deslize_p95_px: r2(pct(off, 0.95)), deslize_max_px: r2(Math.max(0, ...off)) });
  Object.assign(out.outro, { correcao_med_px: r2(cJ.reduce((s, x) => s + x, 0) / Math.max(1, cJ.length)), correcao_p95_px: r2(pct(cJ, 0.95)) });
  Object.assign(out.bola, { correcao_med_px: r2(cB.reduce((s, x) => s + x, 0) / Math.max(1, cB.length)), correcao_p95_px: r2(pct(cB, 0.95)) });
  out.verdade = ref;
  // (v105) a sobreposição na tela da Ana: a bola desenhada dentro de uma tampinha desenhada, e duas tampinhas uma dentro da outra
  { const C = ap.C, rJ = C.R_JOG, rB = C.R_BOLA, fr = segs.flat(); let nb = 0, nj = 0; const ob = [], oj = [];
    for (const f of fr) {
      let mb = 0; for (const q of f.J) mb = Math.max(mb, rJ + rB - Math.hypot(f.B[0] - q[0], f.B[1] - q[1]));
      let mj = 0; for (let i = 0; i < f.J.length; i++) for (let k = i + 1; k < f.J.length; k++) mj = Math.max(mj, 2 * rJ - Math.hypot(f.J[i][0] - f.J[k][0], f.J[i][1] - f.J[k][1]));
      if (mb > 3) nb++; if (mj > 3) nj++; ob.push(Math.max(0, mb)); oj.push(Math.max(0, mj));
    }
    out.sobre = { bola_dentro_pct: r2(100 * nb / Math.max(1, fr.length), 2), bola_p99_px: r2(pct(ob, 0.99), 1), bola_max_px: r2(Math.max(0, ...ob), 1), jog_dentro_pct: r2(100 * nj / Math.max(1, fr.length), 2), jog_max_px: r2(Math.max(0, ...oj), 1) }; }
  const fj = V.filter(v => v.est === 'jogo').map(v => v.fila[0]);
  let palp = 0; for (let i = 1; i < fj.length; i++) if (fj[i][0] > fj[i][2] && fj[i][0] !== fj[i - 1][0]) palp++;
  out.fila = { tamanho_med: r2(fj.reduce((s, x) => s + x[1], 0) / Math.max(1, fj.length)), vazia_pct: r2(100 * fj.filter(x => x[1] === 0).length / Math.max(1, fj.length), 1), palpites_pct: r2(100 * palp / Math.max(1, fj.length), 1) };
  const min = (V.length ? V[V.length - 1].t - V[0].t : 1) / 60000;
  out.fila.recuperados_min = r2((res.P.jog[0].fila.recuperados | 0) / min, 1);
  out.saltos_tempo_pct = r2(100 * sj.filter(s => s.salto !== 0).length / Math.max(1, sj.length), 1);
  out.pend_med = r2(sj.reduce((s, x) => s + x.pend, 0) / Math.max(1, sj.length), 1);
  out.cred_pct = r2(100 * sj.filter(s => s.cred > 0).length / Math.max(1, sj.length), 1);   // (os quadros com o seu crédito no servidor)
  out.solo_med = r2(sj.reduce((s, x) => s + (x.solo | 0), 0) / Math.max(1, sj.length), 2);   // (os passos só da tampinha por replay)
  return out;
}
export function media(o, seeds) {                     // a média de várias sementes (só os números)
  const acc = {};
  const soma = (dst, src) => { for (const [k, v] of Object.entries(src)) { if (v && typeof v === 'object') soma(dst[k] || (dst[k] = {}), v); else if (typeof v === 'number') dst[k] = (dst[k] || 0) + v / seeds.length; } };
  for (const seed of seeds) soma(acc, mede(simula(Object.assign({}, o, { seed }))));
  const arred = x => { for (const k in x) { if (typeof x[k] === 'object') arred(x[k]); else x[k] = Math.round(x[k] * 100) / 100; } };
  arred(acc);
  return acc;
}
export function linha(rot, m) {
  const g = (o, k) => (m[o] && m[o][k] != null ? m[o][k] : '-');
  return rot.padEnd(26) + ' | eu d2 ' + g('eu', 'd2_rms_px') + ' cor95 ' + g('eu', 'correcao_p95_px') + ' desl95 ' + g('eu', 'deslize_p95_px') + ' max ' + g('eu', 'deslize_max_px')
    + ' | outro d2 ' + g('outro', 'd2_rms_px') + ' pul ' + g('outro', 'pulos_min') + ' rap ' + g('outro', 'rapidos_min') + ' par ' + g('outro', 'paradas_min') + ' L ' + g('outro', 'atraso_ms') + ' err ' + g('outro', 'erro_med_px') + '/' + g('outro', 'erro_p95_px')
    + ' | bola d2 ' + g('bola', 'd2_rms_px') + ' pul ' + g('bola', 'pulos_min') + ' rap ' + g('bola', 'rapidos_min') + ' L ' + g('bola', 'atraso_ms') + ' err ' + g('bola', 'erro_med_px') + '/' + g('bola', 'erro_p95_px');
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const rede = process.argv[2] || '4g', dur = (+(process.argv[3] || 60)) * 1000, sem = (process.argv[4] || '1,2,3').split(',').map(Number);
  const variantes = (process.env.VARIANTES || 'cliente=v96;cliente=v102').split(';');
  for (const v of variantes) {
    const o = { rede, dur }; for (const kv of v.split(',')) { const [k, x] = kv.split('='); if (x !== undefined) o[k] = isNaN(+x) ? x : +x; else o.cliente = k; }
    const m = media(o, sem);
    console.log(linha(rede + ' ' + v, m));
    console.log('   verdade', JSON.stringify(m.verdade), ' fila', JSON.stringify(m.fila), ' saltos_tempo%', m.saltos_tempo_pct, ' pend', m.pend_med, ' cred%', m.cred_pct, ' solo', m.solo_med);
  }
}
