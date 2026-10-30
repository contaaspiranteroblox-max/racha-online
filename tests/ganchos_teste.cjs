'use strict';
/* RACHA · v88 — ganchos SÓ DE TESTE para o servidor da turma (nunca entram na produção: só o tests/servidor_visitantes.cjs e a
   plataforma de teste os ligam). Desde a v83 a partida das salas roda no SERVIDOR: o jogo no navegador não consegue mais
   "forçar" um placar, e um teste de navegador não tem como fazer 3 gols de verdade em poucos segundos. Com estes ganchos o
   teste pede um gol ao MOTOR de verdade (server/partida/sala.js): o toque fica marcado para o autor e o próprio motor faz o
   resto — o placar, a autoria, o gol de ouro, a meta de 3, a saída de bola, o apito final, o resultado conferido e o selo.
     {type:'__teste_poe', u, dx?, dy?}                  (v92) a bola parada e a tampinha de quem pediu encostada nela
     {type:'__teste_gol', time:0|1, autor?:'<id>', assist?:'<id>'}   o gol do time (o autor: quem pediu, se for desse time;
                                                     senão o primeiro jogador do time · v90: assist = o companheiro que
                                                     tocou antes, meio segundo antes do gol)
   Uso: require('./ganchos_teste.cjs').liga(TurmaOuInstancia) */
function trata(turma, c, m) {
  if (m.type === '__teste_poe') return poe(turma, c, m);
  if (m.type !== '__teste_gol') return false;
  const r = turma.salaDe(c), p = r && r.partida;
  if (!p || p.encerrado) return true;
  if (p.T && p.lugares) return golRachao(p, c, m);    // v98: a sala do Rachão (o gol pelo motor do Rachão)
  const time = m.time === 1 ? 1 : 0;
  const quem = typeof m.autor === 'string' ? m.autor : c.id;
  const q = p.jog.find(x => x.time === time && x.netId === quem) || p.jog.find(x => x.time === time);
  if (!q) return true;
  if (p.estado === 'saida') p.estado = 'jogo';
  p.toques.length = 0;
  const pa = typeof m.assist === 'string' ? p.jog.find(x => x.time === time && x.netId === m.assist && x !== q) : null;   // v90: o passe de um companheiro antes do gol
  if (pa) p.toques.push({ p: pa, tick: p.tick - 30, t0: p.tick - 40 });
  p.toques.push({ p: q, tick: p.tick, t0: p.tick });
  p.gol(time === 0 ? 1 : -1);
  return true;
}
// v98 · a sala do Rachão: o toque de quem pediu na bola e o scoreGoal do próprio motor do Rachão (o placar, a faixa do GOL!,
// os gols para vencer, o gol de ouro e o apito final são os dele)
function golRachao(p, c, m) {
  const T = p.T; if (T.phase === 'end' || T.phase === 'goal') return true;
  const time = m.time === 1 ? 1 : 0;
  const quem = typeof m.autor === 'string' ? m.autor : c.id;
  const q = T.players.find(x => x.team === time && x.netId === quem) || T.players.find(x => x.team === time);
  if (!q) return true;
  const b = T.ball; b.prevTouch = null; b.lastTouch = q; b.kickedBy = null;
  if (typeof m.assist === 'string') { const a = T.players.find(x => x.team === time && x.netId === m.assist && x !== q); if (a) b.prevTouch = a; }
  if (T.phase === 'kickoff') T.phase = 'play';
  T.scoreGoal(time, b);
  return true;
}
// v92 · {type:'__teste_poe', u:<distância entre os centros em u>, dx?:<u do centro>, dy?:<u>, vert?:true}: a bola parada (no
// meio do campo + dx, dy) e a tampinha de quem pediu parada encostada nela pela esquerda (vert: por baixo, o chute vai para a
// lateral de cima, longe dos gols), a u de distância (o teste do DB online)
function poe(turma, c, m) {
  const r = turma.salaDe(c), p = r && r.partida;
  if (!p || p.encerrado) return true;
  const q = p.jog.find(x => x.netId === c.id); if (!q) return true;
  const U = v => v * 19, G = p.G, bx = G.CX + U(+m.dx || 0), by = G.CY + U(+m.dy || 0);
  p.estado = 'jogo';
  Object.assign(p.B, { x: bx, y: by, vx: 0, vy: 0, w: 0 });
  if (p.cr) Object.assign(p.B, { z: 0, vz: 0, sp: 0, teto: 0, fogo: 0 });   // v99: a bola no chão (os chutes do Rachão)
  if (m.vert) Object.assign(q, { x: bx, y: by + U(+m.u || 3.02), vx: 0, vy: 0 });
  else Object.assign(q, { x: bx - U(+m.u || 3.02), y: by, vx: 0, vy: 0 });
  for (const o of p.jog) if (o !== q && Math.hypot(o.x - bx, o.y - by) < U(12)) { o.x = bx + U(14); o.y = by + U(10); o.vx = o.vy = 0; }
  return true;
}
function liga(alvo) {
  const proto = typeof alvo === 'function' ? alvo.prototype : alvo;
  const antes = proto.recebe;
  proto.recebe = function (c, txt) {
    try {
      if (typeof txt === 'string' && txt.length < 2000 && txt.indexOf('"__teste_') >= 0) {
        const m = JSON.parse(txt);
        if (m && typeof m.type === 'string' && m.type.startsWith('__teste_') && c.id && trata(this, c, m)) return;
      }
    } catch (_) {}
    return antes.call(this, c, txt);
  };
  return alvo;
}
module.exports = { liga, trata, poe };
