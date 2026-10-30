'use strict';
/* RACHA v94 · o adaptador do motor ATUAL (o núcleo da v92, server/partida/nucleo.js — o das salas e da previsão) para os
   cenários de medida (tests/v94/cenarios.js). Tudo o que sai daqui está em d (o diâmetro da tampinha) e em segundos,
   com a origem no centro do campo: assim o motor atual e o novo são medidos com a mesma régua. */
const path = require('path');
const N = require(path.join(__dirname, '..', '..', 'server', 'partida', 'nucleo.js'));

function criar(opc) {
  const o = Object.assign({ tamanho: 2, jogadores: 2, perfil: null, jogo: 'futebol' }, opc || {});
  const C = N.resolve(o.perfil || N.PERFIL_V92);
  const G = N.novoCampo(o.tamanho);
  const D = 2 * C.R_JOG;                                     // px por d
  const M = { G, B: N.novaBola(C, G.CX, G.CY), jog: [], estado: 'jogo', saidaTime: 0, jogo: o.jogo, tick: 0 };
  const bt = [], cont = [];
  for (let i = 0; i < o.jogadores; i++) {
    M.jog.push({ x: G.CX - (i + 1) * 30 * D, y: G.CY + 30 * D, vx: 0, vy: 0, r: C.R_JOG, m: C.MASSA_JOG, time: i % 2, mx: 0, my: 0 });
    bt.push(N.novoBotao()); cont.push({ kc: 0, pc: 0, seq: 0, ent: { mx: 0, my: 0, passe: false, chute: false } });
  }
  let eventos = [];
  const chuta = (q, f) => { const ok = N.chute(M, C, q, f); if (ok) eventos.push({ tipo: 'chute', i: M.jog.indexOf(q), forca: f === C.FORCA_POWER ? 'chute' : 'passe' }); return ok; };
  const px = v => v * D, d = v => v / D;
  const A = {
    nome: 'atual (v93: o núcleo da v92)', dt: N.DT, D,
    campo() {
      return { linhaX: d(G.LX1 - G.CX), linhaY: d(G.LY1 - G.CY), areaX: d(G.GR - G.CX), areaY: d(G.GB - G.CY),
        golY: d(G.GOL_Y1 - G.CY), golFundo: d(G.GOL_PROF), trave: d(G.POST_R), rBola: d(C.R_BOLA), rJog: d(C.R_JOG),
        alcance: d(C.ALCANCE_CHUTE), traves: G.POSTS.map(p => [d(p[0] - G.CX), d(p[1] - G.CY)]) };
    },
    jog(i) { const q = M.jog[i]; return { x: d(q.x - G.CX), y: d(q.y - G.CY), vx: d(q.vx), vy: d(q.vy) }; },
    poeJog(i, x, y, vx, vy) { const q = M.jog[i]; q.x = G.CX + px(x); q.y = G.CY + px(y); q.vx = px(vx || 0); q.vy = px(vy || 0); },
    bola() { const B = M.B; return { x: d(B.x - G.CX), y: d(B.y - G.CY), vx: d(B.vx), vy: d(B.vy) }; },
    poeBola(x, y, vx, vy) { const B = M.B; B.x = G.CX + px(x); B.y = G.CY + px(y); B.vx = px(vx || 0); B.vy = px(vy || 0); B.w = 0; },
    entrada(i, e) {                                           // e = {mx, my, passe (segurando), chute (segurando)}; o toque novo conta sozinho
      const k = cont[i], a = k.ent;
      if (e.passe && !a.passe) k.kc++;
      if (e.chute && !a.chute) k.pc++;
      k.ent = Object.assign({ mx: 0, my: 0, passe: false, chute: false }, e);
    },
    passo() {
      eventos = [];
      M.tick++;
      for (let i = 0; i < M.jog.length; i++) {
        const q = M.jog[i], b = bt[i], k = cont[i], e = k.ent;
        k.seq++;
        const c = { seq: k.seq, x: e.mx, y: e.my, button: e.chute ? 3 : e.passe ? 2 : 1, kc: k.kc, pc: k.pc };
        N.botaoComando(b, c, C);
        q.mx = c.x; q.my = c.y;
        N.botaoTick(M, C, q, b, chuta);
      }
      const B = M.B, v0 = [B.vx, B.vy];
      N.passo(M, C, { gol: lado => { eventos.push({ tipo: 'gol', lado }); return 'para'; } });
      if (M.trave) { eventos.push({ tipo: 'trave' }); M.trave = 0; }
      return eventos;
    },
  };
  return A;
}
module.exports = { criar, nome: 'atual' };
