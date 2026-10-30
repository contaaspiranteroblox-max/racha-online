'use strict';
/* RACHA v92 · o DB no SERVIDOR DE VERDADE (server/partida/sala.js): a mesma jogada do laboratório (lab.cjs), com os mesmos
   comandos, rodando no motor da sala — a fila de comandos, o controle(), o chute com o mínimo de 33 ms no relógio de
   parede e o quadro. Serve para conferir se a previsão do aparelho e o servidor chegam ao mesmo resultado (o.prev: 'nuc' =
   a previsão da v92 antes desta etapa, o núcleo sozinho; 'prev92' = a de agora, com o mínimo de 2 passos entre chutes).
   o.relogio: os instantes (ms) de cada passo do motor (o Date.now() medido: tests/v92_db/relogio_motor_*.json); sem ele,
   passos exatos. o.atrasos: [n por comando] quantos passos cada comando chega atrasado (a rede); o.ack: devolve os quadros. */
const S = require('../../server/partida/sala.js');
const L = require('./lab.cjs');
const N = L.N;

function servidor(cen, perfil, toques, o) {
  o = o || {};
  const lab = L.jogada(cen, { maq: o.prev || 'nuc', perfil }, toques, o);   // (a jogada do lab: os comandos e a previsão; o.prev 'prev92' = a de agora)
  const C0 = N.resolve(perfil), cenario = L.CENARIOS[cen](C0, o), M0 = cenario.M;
  const rel = o.relogio, j0 = rel ? (((o.fase | 0) * 97 + (o.sorte | 0) * 13) % (rel.length - 200)) : 0;
  const relo = { t: 0 };
  const susp = [];
  const p = new S.PartidaSala({ n: 1, jogo: 'futebol', jogadores: [{ netId: 'a', nome: 'Ana' }, { netId: 'b', nome: 'Beto' }],
    fisica: perfil, fisicaBase: perfil, agora: () => relo.t, suspeito: (id, tipo) => susp.push(tipo) });
  p.estado = 'jogo';
  const q = p.jog[0], o2 = p.jog[1];
  Object.assign(q, { x: M0.jog[0].x, y: M0.jog[0].y, vx: M0.jog[0].vx, vy: M0.jog[0].vy });
  Object.assign(p.B, { x: M0.B.x, y: M0.B.y, vx: M0.B.vx, vy: M0.B.vy, w: 0 });
  o2.x = p.G.CX + 500; o2.y = p.G.GB - 60; o2.vx = o2.vy = 0;
  const vel = [], imp = [], quadros = [];
  let tick = 0;
  const chuta0 = p.chuta.bind(p);                        // (cada chute que o servidor aceitou, com o passo e a força)
  p.chuta = (qq, forca) => { const ok = chuta0(qq, forca); if (ok && qq === q) imp.push({ passo: tick, f: forca >= p.C.FORCA_POWER ? 'c' : 'p' }); return ok; };
  const fila = [];                                       // (os comandos a caminho: [chega no passo, cmd])
  lab.cmds.forEach((c, i) => fila.push([i + 1 + ((o.atrasos && o.atrasos[i]) | 0), c]));
  const fim = lab.cmds.length + Math.max(0, ...(o.atrasos || [0]).slice(0, lab.cmds.length));
  for (let i = 1; i <= fim; i++) {
    relo.t = rel ? rel[j0 + i] - rel[j0] + 1000 : Math.floor(i * 1000 / 60) + 1000;
    for (const [t, c] of fila) if (t === i) p.entrada('a', Object.assign({ type: 'input', k: 0 }, c));
    p.entrada('b', { seq: i, x: 0, y: 0, button: 1, k: 0 });
    tick = i;
    p.passo();
    vel.push(Math.hypot(p.B.vx, p.B.vy) / N.U(1));
    if (o.quadros) quadros.push(p.quadro());
  }
  return { lab, vmax: Math.max(...vel), vfim: vel[vel.length - 1], imp, susp, quadros, sala: p,
    bola: [p.B.x, p.B.y, p.B.vx, p.B.vy], prevBola: null };
}
module.exports = { servidor };
