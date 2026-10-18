'use strict';
/* RACHA · v88 — ganchos SÓ DE TESTE para o servidor da turma (nunca entram na produção: só o tests/servidor_visitantes.cjs e a
   plataforma de teste os ligam). Desde a v83 a partida das salas roda no SERVIDOR: o jogo no navegador não consegue mais
   "forçar" um placar, e um teste de navegador não tem como fazer 3 gols de verdade em poucos segundos. Com estes ganchos o
   teste pede um gol ao MOTOR de verdade (server/partida/sala.js): o toque fica marcado para o autor e o próprio motor faz o
   resto — o placar, a autoria, o gol de ouro, a meta de 3, a saída de bola, o apito final, o resultado conferido e o selo.
     {type:'__teste_gol', time:0|1, autor?:'<id>'}   o gol do time (o autor: quem pediu, se for desse time; senão o primeiro
                                                     jogador do time)
   Uso: require('./ganchos_teste.cjs').liga(TurmaOuInstancia) */
function trata(turma, c, m) {
  if (m.type !== '__teste_gol') return false;
  const r = turma.salaDe(c), p = r && r.partida;
  if (!p || p.encerrado) return true;
  const time = m.time === 1 ? 1 : 0;
  const quem = typeof m.autor === 'string' ? m.autor : c.id;
  const q = p.jog.find(x => x.time === time && x.netId === quem) || p.jog.find(x => x.time === time);
  if (!q) return true;
  if (p.estado === 'saida') p.estado = 'jogo';
  p.toques.length = 0;
  p.toques.push({ p: q, tick: p.tick, t0: p.tick });
  p.gol(time === 0 ? 1 : -1);
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
module.exports = { liga, trata };
