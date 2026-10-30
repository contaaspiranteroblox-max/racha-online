'use strict';
/* RACHA v94 · o adaptador do MOTOR NOVO (server/partida/motor.js) para os cenários de medida (tests/v94/cenarios.js):
   a mesma régua do adaptador do motor atual — d (o diâmetro da tampinha), s, a origem no centro do campo.
   O motor pode vir de outro lugar (o ambiente de quem implementa): RACHA_MOTOR=/caminho/motor.js */
const path = require('path');
const M = require(process.env.RACHA_MOTOR || path.join(__dirname, '..', '..', 'server', 'partida', 'motor.js'));

function criar(opc) {
  const o = Object.assign({ tamanho: 2, jogadores: 2, perfil: null, jogo: 'futebol' }, opc || {});
  const R = M.resolve(o.perfil || M.PADRAO);
  const jog = []; for (let i = 0; i < o.jogadores; i++) jog.push({ time: i % 2 });
  const W = M.mundo({ n: o.tamanho, jogo: o.jogo, jogadores: jog, R });
  const G = W.G, D = 2 * R.rJ;                               // metros por d
  for (let i = 0; i < o.jogadores; i++)                      // (os que o cenário não usa ficam num canto, longe de tudo)
    M.poeJogador(W, i, G.area.x0 + R.rJ + 0.05 + i * 2.2 * R.rJ, G.area.y1 - R.rJ - 0.05, 0, 0);
  const cont = []; for (let i = 0; i < o.jogadores; i++) cont.push({ np: 0, nc: 0, ent: { passe: false, chute: false } });
  const m = v => v * D, d = v => v / D;
  return {
    nome: 'novo (v94: o motor próprio)', dt: M.DT, D,
    campo() {
      return { linhaX: d(G.L / 2), linhaY: d(G.W / 2), areaX: d(G.area.x1), areaY: d(G.area.y1), golY: d(G.boca / 2),
        golFundo: d(G.fundo), trave: d(G.traves[0].r), rBola: d(R.rB), rJog: d(R.rJ), alcance: d(M.alcance(R)),
        traves: G.traves.map(t => [d(t.x), d(t.y)]) };
    },
    jog(i) { const q = W.jog[i]; return { x: d(q.x), y: d(q.y), vx: d(q.vx), vy: d(q.vy) }; },
    poeJog(i, x, y, vx, vy) { M.poeJogador(W, i, m(x), m(y), m(vx || 0), m(vy || 0)); },
    bola() { const b = W.bola; return { x: d(b.x), y: d(b.y), vx: d(b.vx), vy: d(b.vy) }; },
    poeBola(x, y, vx, vy) { M.poeBola(W, m(x), m(y), m(vx || 0), m(vy || 0)); },
    entrada(i, e) {
      const k = cont[i], a = k.ent;
      if (e.passe && !a.passe) k.np++;
      if (e.chute && !a.chute) k.nc++;
      k.ent = { passe: !!e.passe, chute: !!e.chute };
      M.comando(W, i, { mx: e.mx || 0, my: e.my || 0, passe: e.passe ? 1 : 0, chute: e.chute ? 1 : 0, curva: 0, np: k.np, nc: k.nc });
    },
    passo() {
      const out = [];
      for (const e of M.passo(W)) {
        if (e.t === 'chute') out.push({ tipo: 'chute', i: e.j, forca: e.b === 'passe' ? 'passe' : 'chute', comb: !!e.comb });
        else if (e.t === 'gol') out.push({ tipo: 'gol', lado: e.lado });
        else if (e.t === 'trave') out.push({ tipo: 'trave' });
        else if (e.t === 'anulado') out.push({ tipo: 'anulado', i: e.j, motivo: e.motivo });
      }
      return out;
    },
    mundo: W, motor: M,
  };
}
module.exports = { criar, nome: 'novo' };
