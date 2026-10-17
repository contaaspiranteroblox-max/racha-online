// RACHA v83 · O MOTOR DAS SALAS HOSPEDADAS — testes unitários da PartidaSala (server/partida/sala.js).
// A física é o porte fiel do jogo; aqui cada regra é conferida de forma determinística (relógio falso,
// posições plantadas). Roda:  node tests/v83_sala_test.mjs
import { PartidaSala } from '../server/partida/sala.js';
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const F = req('../server/partida/fisica.js');

let ok = 0, falhou = 0;
const confere = (cond, txt, extra) => {
  if (cond) { ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra) : '')); }
};
const relogioFalso = () => { let t = 0; const fn = () => t; fn.anda = ms => { t += ms; }; return fn; };
function novaPartida(o = {}) {
  const ag = relogioFalso();
  const out = { snaps: [], gols: [], avisos: [], fim: null };
  const p = new PartidaSala(Object.assign({
    n: 2, jogo: 'futebol', map: 4, tempo: 0, regra: null,
    jogadores: [
      { netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Bia' },
      { netId: 'C', nome: 'Caio' }, { netId: 'D', nome: 'Duda' },
    ],
    agora: ag, onSnapshot: d => out.snaps.push(d), onGol: g => out.gols.push(g),
    onAviso: t => out.avisos.push(t), onFim: r => { out.fim = r; },
  }, o));
  // os humanos precisam da fila de comandos (o entra() faz isso; aqui, na mão)
  for (const q of p.jog) if (q.netId && !q.fila) {
    q.fila = { fila: [], chegou: 1, min: 99, n: 0, ult: null, feito: 0, visto: 0 };
    q.netButton = { estado: 1, livre: true, t: 0, ultimo: -1e9 };
    q.cv70 = { carga: 0, segura: false, arma: 0, armaC: 0 };
  }
  return { p, out, ag };
}
const manda = (p, id, seq, x, y, button = 1, k = 0) => p.entrada(id, { seq, x, y, button, k });
const solta = (p, id) => { const q = p.jog.find(x => x.netId === id); if (q) q.fila.chegou = 0; };   // finge 350 ms de silêncio

console.log('1) a saída: formação, barreira e o relógio');
{
  const { p } = novaPartida();
  confere(p.estado === 'saida', 'começa na saída');
  const G = p.G, batedor = p.jog.find(q => q.time === p.saidaTime && q.k === 0);
  confere(Math.hypot(batedor.x - G.CX, batedor.y - G.CY) < G.circ, 'o batedor fica ao lado da bola, dentro do círculo');
  const espera = p.jog.find(q => q.time !== p.saidaTime && q.k === 0);
  // quem espera tenta invadir o meio/círculo por 3 s (pelo comando, como no jogo): a barreira segura
  const dir = p.saidaTime === 0 ? -1 : 1;              // quem espera está do lado de lá: invadir é andar PARA o meio
  for (let s = 1; s <= 180; s++) manda(p, espera.netId, s, dir, 0);
  p.rodar(180);
  const invadiu = espera.time === 1 ? espera.x < G.CX : espera.x > G.CX;   // passou do meio para o lado de lá
  confere(!invadiu, 'a barreira do meio-campo segura quem espera');
  confere(Math.hypot(espera.x - G.CX, espera.y - G.CY) >= G.circ + espera.r - 1e-6, 'e fora do círculo da saída');
  confere(p.t === 0, 'o relógio não anda na saída');
}
{
  const { p } = novaPartida();
  p.rodar(481);
  confere(p.estado === 'jogo', '8 s sem saída: a bola fica livre (o timeout do jogo)');
}

console.log('2) a fila de comandos (o net49Control do jogo): seq, palpite, salto e silêncio');
{
  const { p, ag } = novaPartida();
  p.estado = 'jogo';
  const q = p.jog.find(x => x.netId === 'A');
  for (let s = 1; s <= 10; s++) manda(p, 'A', s, 1, 0);
  p.rodar(5);
  confere(q.ack49 >= 5, 'o ack acompanha os comandos consumidos', q.ack49);
  confere(q.mx === 1 && q.my === 0, 'a direção do comando vale no passo');
  manda(p, 'A', 3, 0, 1);                                  // repetido: descartado
  p.rodar(1);
  confere(q.ack49 >= 6 && !(q.mx === 0 && q.my === 1), 'comando repetido não volta no tempo');
  manda(p, 'A', 20, 0, 1);                                 // um buraco de seq: anda como a próxima e segue
  p.rodar(1);
  confere(q.ack49 >= 7, 'seq com buraco conta o passo (não trava)', q.ack49);
  ag.anda(400); p.rodar(2);                                // 400 ms sem comando novo
  confere(q.mx === 0 && q.my === 0, 'silêncio de 350 ms: a tampinha para (a regra do jogo)');
}
{
  const { p } = novaPartida();
  p.estado = 'jogo';
  const q = p.jog.find(x => x.netId === 'B');
  for (let s = 1; s <= 4; s++) manda(p, 'B', s, 0, 1);
  p.rodar(4);
  const x0 = q.x, y0 = q.y;
  p.rodar(3);                                              // fila vazia: o palpite segue o último por até 4 passos
  confere(q.y > y0, 'o palpite segue o último comando quando o pacote atrasa');
  p.rodar(2);
  const y1 = q.y;
  p.rodar(10);
  confere(q.y === y1, 'mas para depois dos 4 passos de palpite (não sai andando sozinho)');
}

console.log('3) o chute: alcance, força e ritmo');
{
  const { p } = novaPartida();
  p.estado = 'jogo';
  const q = p.jog.find(x => x.netId === 'A');
  q.x = p.B.x - F.ALCANCE_CHUTE - 30; q.y = p.B.y;
  confere(p.chuta(q, F.FORCA_POWER) === false, 'fora do alcance o chute não vale');
  q.x = p.B.x - F.ALCANCE_CHUTE + 2;
  const vx0 = p.B.vx;
  confere(p.chuta(q, F.FORCA_POWER) === true && p.B.vx > vx0, 'no alcance o chute vale e empurra a bola');
  confere(p.chuta(q, F.FORCA_KICK) === false, 'chute rápido demais do mesmo jogador é recusado (o ritmo mínimo)');
  const toque = p.toques[p.toques.length - 1];
  confere(toque && toque.p === q && toque.chute === p.tick, 'o chute marca o toque (a regra da autoria)');
}

console.log('4) a autoria: autor, assistência, gol contra e desvio');
function golForcado(p, autores, adversarios = [], lado = 1) {
  // planta os toques na ordem e manda a bola para dentro de um gol (lado 1 = gol da direita = ponto do time 0)
  const G = p.G;
  p.toques.length = 0; p.chuteDe = null;
  for (const q of autores) { p.toques.push({ p: q, t0: p.tick - 3, tick: p.tick, chute: p.tick }); }
  if (autores.length) p.chuteDe = { x: p.B.x, y: p.B.y, time: autores[autores.length - 1].time, p: autores[autores.length - 1], tick: p.tick, alvo: true };
  for (const q of adversarios) p.toques.push({ p: q, t0: p.tick - 2, tick: p.tick, chute: -1 });
  p.B.x = lado > 0 ? G.LX1 - 5 : G.LX0 + 5; p.B.y = G.CY; p.B.vx = lado > 0 ? 3000 : -3000; p.B.vy = 0;
}
{
  const { p, out } = novaPartida();
  p.estado = 'jogo';
  const A = p.jog.find(x => x.netId === 'A'), B = p.jog.find(x => x.netId === 'B');
  golForcado(p, [B, A]);                                    // passe da Bia, gol da Ana
  p.rodar(2);
  confere(p.placar[0] === 1 && p.estado === 'gol', 'o gol entra e vira comemoração');
  confere(out.gols[0] && out.gols[0].author === 'A' && out.gols[0].assist === 'B' && !out.gols[0].contra, 'autor + assistência no pacote do gol', out.gols[0]);
}
{
  const { p, out } = novaPartida();
  p.estado = 'jogo';
  const C = p.jog.find(x => x.netId === 'C');
  p.toques.length = 0; p.chuteDe = null;
  p.toques.push({ p: C, t0: p.tick - 30, tick: p.tick, chute: -1 });   // dominou e mandou para dentro: CONTRA
  p.B.x = p.G.LX1 - 5; p.B.y = p.G.CY; p.B.vx = 3000; p.B.vy = 0;
  p.rodar(2);
  confere(out.gols[0] && out.gols[0].contra === true && out.gols[0].contraBy === 'C', 'quem dominou e mandou contra: gol contra dele', out.gols[0]);
}
{
  const { p, out } = novaPartida();
  p.estado = 'jogo';
  const A = p.jog.find(x => x.netId === 'A'), D = p.jog.find(x => x.netId === 'D');
  golForcado(p, [A], [D]);                                  // chute da Ana no alvo, toque curto da Duda: DESVIO
  p.rodar(2);
  confere(out.gols[0] && out.gols[0].author === 'A' && !out.gols[0].contra && out.gols[0].desvioName === 'Duda', 'o desvio em chute no alvo não é gol contra', out.gols[0]);
}

console.log('5) a máquina de estados: comemoração, saída do outro, fim pela meta');
{
  const { p, out } = novaPartida({ jogadores: [ { netId: 'A', nome: 'Ana' }, { netId: null, nome: 'Bot', bot: 'facil' } ], n: 1 });
  p.estado = 'jogo';
  golForcado(p, [p.jog[0]]);
  p.rodar(2);
  confere(p.estado === 'gol' && p.golT > 0, 'gol: comemoração contando');
  p.rodar(119);
  confere(p.estado === 'saida' && p.saidaTime === 1, 'depois da comemoração o outro time sai com a bola');
  p.estado = 'jogo';
  golForcado(p, [p.jog[0]]); p.rodar(2);
  p.rodar(119); p.estado = 'jogo';
  golForcado(p, [p.jog[0]]); p.rodar(2);
  confere(p.placar[0] === 3 && p.fimPendente, 'o terceiro gol marca o fim pendente (a meta)');
  p.rodar(120);
  confere(p.estado === 'fim', 'a comemoração do gol da meta vai para o fim');
  p.rodar(80);
  confere(p.encerrado && out.fim && out.fim.vencedor === 0 && out.fim.placar[0] === 3, 'o resultado sai pelo motor (3 × 0, time 0)', out.fim);
}

console.log('6) a sala por tempo: fim no tempo e o GOL DE OURO no empate');
{
  const { p, out } = novaPartida({ tempo: 2, n: 1, jogadores: [ { netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Bia' } ] });
  p.estado = 'jogo'; p.placar = [1, 0]; p.t = 119;
  p.rodar(61);
  confere(p.estado === 'fim', 'com vantagem, o tempo acabou: fim');
  p.rodar(80);
  confere(out.fim && out.fim.vencedor === 0, 'vence quem estava na frente');
}
{
  const { p, out } = novaPartida({ tempo: 2, n: 1, jogadores: [ { netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Bia' } ] });
  p.estado = 'jogo'; p.placar = [1, 1]; p.t = 119;
  p.rodar(61);
  confere(p.prorrog === true && p.estado === 'jogo', 'empatado no fim do tempo: gol de ouro');
  confere(out.avisos.some(t => /GOL DE OURO/.test(t)), 'o aviso de gol de ouro foi para a sala');
  golForcado(p, [p.jog[1]], [], -1);                       // a Bia (time 1) marca no gol da esquerda
  p.rodar(2);
  confere(p.fimPendente, 'o gol de ouro marca o fim');
  p.rodar(200);
  confere(out.fim && out.fim.vencedor === 1 && out.fim.prorrog === true, 'quem marcou primeiro leva (na prorrogação)', out.fim);
}

console.log('7) a v80 (a ranqueada): relógio do servidor, empates e a prorrogação só do 0 × 0');
function v80(placar, segDecorrido) {
  const dec = relogioFalso();
  const { p, out } = novaPartida({ regra: 'v80', ranked: true, r80: { seg: 180, prorrog: 120 }, decorrido: dec, n: 1,
    jogadores: [ { netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Bia' } ] });
  p.estado = 'jogo'; p.placar = placar.slice();
  dec.anda(segDecorrido * 1000);
  return { p, out, dec };
}
{
  const { p, out } = v80([1, 1], 181);
  p.rodar(3);
  confere(p.estado === 'fim', '1 × 1 no 00:00: acaba empatado');
  p.rodar(80);
  confere(out.fim && out.fim.vencedor === -1, 'o empate é o resultado');
}
{
  const { p, out, dec } = v80([0, 0], 181);
  p.rodar(3);
  confere(p.prorrog === true && p.estado === 'jogo', '0 × 0 no 00:00: prorrogação (gol de ouro)');
  dec.anda(121 * 1000);
  p.rodar(3);
  confere(p.estado === 'fim', 'sem gol até o fim da prorrogação: empate');
  p.rodar(80);
  confere(out.fim && out.fim.vencedor === -1, '0 × 0 depois da prorrogação vale empate');
}
{
  const { p, out } = v80([0, 0], 181);
  p.rodar(3);
  golForcado(p, [p.jog[0]]);
  p.rodar(2);
  confere(p.placar[0] === 1 && p.fimPendente, 'o gol de ouro da v80 vale e termina');
  p.rodar(200);
  confere(out.fim && out.fim.vencedor === 0, 'quem fez o gol de ouro venceu');
}
{
  const { p } = v80([1, 0], 181);
  p.rodar(3);   // (aqui a partida já teria acabado: o pos() encerra no primeiro passo)
  confere(p.estado === 'fim' && p.placar[0] === 1, '1 × 0 no 00:00: acabou com o placar que estava');
  const antes = p.placar.slice();
  p.estado = 'jogo'; golForcado(p, [p.jog[0]]); p.rodar(2);   // tentativa de gol depois da hora
  confere(p.placar[0] === antes[0], 'gol depois do tempo da v80 NÃO vale', p.placar);
}

console.log('8) o quadro (o formato clássico que o convidado já renderiza)');
{
  const { p, out } = novaPartida();
  p.rodar(4);
  const s = out.snaps[out.snaps.length - 1];
  confere(out.snaps.length === 2, 'um quadro a cada 2 passos (30 por segundo, o ritmo da v82)', out.snaps.length);
  confere(s && typeof s.tick === 'number' && typeof s.elapsed === 'number' && s.state === 'saida' && typeof s.kickoff === 'number', 'tick, elapsed, state e kickoff');
  confere(Array.isArray(s.score) && s.score.length === 2, 'o placar');
  confere(Array.isArray(s.ball) && s.ball.length === 5, 'a bola [x, y, vx, vy, w]');
  confere(Array.isArray(s.players) && s.players.length === 4 && s.players.every(pl => pl.length === 7), 'os jogadores [x, y, vx, vy, ack, chuteT, fxT]');
  confere(s.goal === null, 'sem gol ainda: goal nulo');
  p.estado = 'jogo';
  golForcado(p, [p.jog[0]]);
  p.rodar(2);
  const s2 = out.snaps[out.snaps.length - 1];
  confere(s2.goal && s2.goal.name === 'Ana' && s2.score[0] === 1, 'o gol vai no quadro (o convidado lê quando o placar muda)', s2.goal);
}

console.log('9) quem cai vira bot e quem volta reassume (a REGRA FUNDAMENTAL)');
{
  const { p, out } = novaPartida();
  p.estado = 'jogo';
  for (let s = 1; s <= 5; s++) manda(p, 'A', s, 1, 0);
  p.rodar(3);
  p.sai('A');
  const q = p.jog[0];
  confere(q.bot && !q.netId && q.reserva === 'A', 'a tampinha vira bot com a reserva da volta');
  p.rodar(120);
  confere(p.estado === 'jogo' || p.estado === 'gol' || p.estado === 'saida', 'a partida segue normalmente sem ele');
  const slot = p.entra('A', 'Ana');
  confere(slot === 0 && p.jog[0].netId === 'A' && !p.jog[0].bot, 'ele volta para o MESMO lugar (o bot sai)');
  confere(p.jog[0].fila && p.jog[0].ack49 === 0, 'a fila de comandos recomeça limpa');
  for (let s = 1; s <= 5; s++) manda(p, 'A', s, 0, 1);
  p.rodar(3);
  confere(p.jog[0].ack49 >= 3, 'e os comandos dele voltam a valer');
}

console.log('10) a pausa congela a simulação inteira');
{
  const { p } = novaPartida();
  p.estado = 'jogo';
  p.rodar(30);
  const t0 = p.tick, bx = p.B.x, bt = p.t;
  p.pausado = true; p.rodar(120);
  confere(p.tick === t0 && p.B.x === bx && p.t === bt, 'pausado: nem o tick, nem a bola, nem o relógio andam');
  p.pausado = false; p.rodar(30);
  confere(p.tick === t0 + 30, 'ao voltar, continua de onde parou');
}

console.log('11) COM CURVA: carregar, soltar e a bola entorta');
{
  const { p } = novaPartida({ jogo: 'curva', n: 1, jogadores: [ { netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Bia' } ] });
  p.estado = 'jogo';
  const q = p.jog[0];
  q.x = p.B.x - (F.ALCANCE_CHUTE - 4); q.y = p.B.y;   // colado na bola, à esquerda
  for (let s = 1; s <= 80; s++) { manda(p, 'A', s, 0, 0, 1, 1); p.passo(); }   // segura CURVA ~1,3 s (parado)
  manda(p, 'A', 81, 0, 0, 1, 0);                       // soltou: o chute de curva sai
  p.passo();
  confere(p.B.cvT > 0, 'a bola saiu com efeito (cvT valendo)', p.B.cvT);
  confere(p.B.vx > 0, 'e para a frente (a força do CHUTE)');
  const w0 = p.B.w;
  p.rodar(20);
  confere(p.B.w !== 0 || w0 !== 0, 'o giro alto marca a bola rolando de lado');
}

console.log('12) os bots do servidor completam e jogam a partida inteira');
{
  const { p, out } = novaPartida({ n: 2, jogadores: [
    { netId: 'A', nome: 'Ana' }, { netId: null, nome: 'Bot1', bot: 'facil' },
    { netId: null, nome: 'Bot2', bot: 'dificil' }, { netId: null, nome: 'Bot3', bot: 'dificil' } ] });
  p.rodar(60 * 60 * 4);
  const total = p.placar[0] + p.placar[1];
  confere(total >= 1, 'os bots fizeram gol em 4 minutos de simulação', p.placar);
  confere(out.snaps.length > 1000, 'os quadros saíram o tempo todo');
  console.log('     (placar da simulação: ' + p.placar.join(' × ') + ')');
}

console.log('\nmotor das salas (v83): ' + ok + ' ok, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
