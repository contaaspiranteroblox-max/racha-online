// RACHA v83 · a partida autoritativa: a física, o relógio, o antitrampa, a reconexão e o selo — sem navegador.
// Roda com Node 18+:  node tests/v83_partida_test.mjs
// (a partida roda na mão com rodar(ticks) e um relógio falso: o teste inteiro leva segundos, não minutos)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const F = require('../server/partida/fisica.js');
const { PartidaAutoritativa, MAX_CMD_S } = require('../server/partida/partida.js');
const { GerenteAuto } = require('../server/partida/gerente.js');
const { assina, confere } = require('../server/banco.js');

let ok = 0, falhou = 0;
function confere_(cond, txt, extra) {
  if (cond) { ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra) : '')); }
}
const SEGREDO = 'segredo-de-teste-v83';
const relogioFalso = () => { let t = 1_000_000; return { agora: () => t, anda: ms => { t += ms; } }; };
const jogador = (id, conta) => ({ id, nome: 'J' + id, conta: conta ? { idPublico: String(conta).padStart(6, '0'), nome: 'J' + id, selo: '' } : null, c: { id, ws: null } });

console.log('1) a física: o campo, a bola e as paredes');
{
  const sim = F.novaSimulacao(2);
  confere_(sim.campo.nome === '2v2' && sim.jog.length === 4, 'o 2v2 tem 4 tampinhas e o campo do jogo');
  // chuta a bola com toda a força por 10 s: ela nunca sai das linhas nem passa do teto
  const j = sim.jog[0];
  j.x = sim.bola.x - F.U(3); j.y = sim.bola.y;
  F.chute(sim, 0, F.FORCA_POWER);
  let tetoOk = true, dentroOk = true;
  for (let i = 0; i < 600; i++) {
    F.passo(sim);
    const v = Math.hypot(sim.bola.vx, sim.bola.vy);
    if (v > F.LIMITE_VEL_BOLA + 1) tetoOk = false;
    const G = sim.campo;
    if (sim.bola.x < G.LX0 - G.GOL_PROF - sim.bola.r - 2 || sim.bola.x > G.LX1 + G.GOL_PROF + sim.bola.r + 2) dentroOk = false;
    if (sim.bola.y < G.LY0 - sim.bola.r - 2 || sim.bola.y > G.LY1 + sim.bola.r + 2) dentroOk = false;
  }
  confere_(tetoOk, 'a bola nunca passa do teto (F.LIMITE_VEL_BOLA: 46,75 u/s desde a v87.1)');
  confere_(dentroOk, 'a bola nunca atravessa as paredes (só entra no gol pela boca)');
  // chute fora do alcance não vale
  const sim2 = F.novaSimulacao(2);
  sim2.jog[0].x = sim2.bola.x - F.U(20); sim2.jog[0].y = sim2.bola.y;
  confere_(F.chute(sim2, 0, F.FORCA_POWER) === false && sim2.bola.vx === 0, 'o chute de longe não vale (a bola nem se mexe)');
  // determinismo: os mesmos comandos, o mesmo resultado
  const a = F.novaSimulacao(2), b = F.novaSimulacao(2);
  for (let i = 0; i < 300; i++) { F.entrada(a, 0, 1, 0.5); F.entrada(b, 0, 1, 0.5); F.passo(a); F.passo(b); }
  confere_(a.bola.x === b.bola.x && a.jog[0].x === b.jog[0].x, 'passo fixo: os mesmos comandos dão o mesmo resultado');
  // a tampinha nunca anda mais rápido que o máximo, mande o que mandar
  F.entrada(a, 0, 99, 99);
  F.passo(a);
  confere_(Math.hypot(a.jog[0].vx, a.jog[0].vy) <= F.VEL_JOG + 1e-9, 'a velocidade da tampinha é do servidor (direção 99 vira 1)');
}

console.log('\n2) o gol e o relógio (as regras da v80 no servidor)');
{
  const R = relogioFalso();
  const fim = [];
  const p = new PartidaAutoritativa({ tamanho: 1, ranked: true, agora: R.agora, regra: { seg: 20, prorrog: 10 }, aoFim: r => fim.push(r) });
  p.entra(jogador('a', 123)); p.entra(jogador('b', 456));
  p.comeca();
  // gol do time 0 (o jogador 'a', lugar 0): empurra a bola para a direita e chuta
  const sim = p.sim;
  sim.jog[0].x = sim.bola.x - F.U(2); sim.jog[0].y = sim.bola.y;
  sim.jog[1].y = sim.campo.LY0 + 60;                      // (o adversário fora do caminho: o teste é do gol, não da marcação)
  p.comando('a', { seq: 1, x: 0, y: 0, k: 2 });
  confere_(sim.bola.vx > 0, 'o chute do servidor saiu (a bola vai para a direita)');
  p.rodar(90);
  confere_(p.placar[0] === 1 && p.estado === 'comemoracao', 'o gol valeu e o relógio parou na comemoração', p.status());
  const relogioNoGol = p.relogioSeg;
  p.rodar(120);   // os 2 s da comemoração
  confere_(p.estado === 'rolando' && p.relogioAgora() <= relogioNoGol, 'voltou da comemoração com o relógio onde parou');
  p.rodar(60 * 30);   // o resto do tempo
  confere_(fim.length === 1 && fim[0].placar[0] === 1 && fim[0].winner === 0 && fim[0].motivo === 'tempo', '1 × 0 acaba no tempo com o vencedor certo', fim[0] && fim[0].motivo);
  confere_(fim[0].linha.length === 1 && fim[0].linha[0].placar[0] === 1, 'a linha do tempo guardou o gol');
}
{
  // a meta: 3 gols acabam na hora, mesmo com tempo sobrando
  const R = relogioFalso(); const fim = [];
  const p = new PartidaAutoritativa({ tamanho: 1, ranked: true, agora: R.agora, regra: { seg: 180, prorrog: 120 }, aoFim: r => fim.push(r) });
  p.entra(jogador('a')); p.entra(jogador('b')); p.comeca();
  for (let g = 0; g < 3; g++) {
    const sim = p.sim;
    sim.jog[0].x = sim.bola.x - F.U(2); sim.jog[0].y = sim.bola.y;
    sim.jog[1].y = sim.campo.LY0 + 60;
    R.anda(100);                                          // (o relógio falso anda: o mínimo entre chutes passa)
    p.comando('a', { seq: g + 1, x: 0, y: 0, k: 2 });
    p.rodar(90); p.rodar(120);
  }
  confere_(fim.length === 1 && fim[0].motivo === 'meta' && fim[0].placar[0] === 3, '3 gols: fim na hora pela meta', fim[0] && fim[0].motivo);
}
{
  // 1 × 1 no fim do tempo: empate, SEM prorrogação · 0 × 0: prorrogação e gol de ouro
  const R = relogioFalso(); const fim = [];
  const p = new PartidaAutoritativa({ tamanho: 1, ranked: true, agora: R.agora, regra: { seg: 10, prorrog: 5 }, aoFim: r => fim.push(r) });
  p.entra(jogador('a')); p.entra(jogador('b')); p.comeca();
  p.rodar(60 * 10 + 5);
  confere_(p.prorrogacao === true && fim.length === 0, 'o 0 × 0 vai para a prorrogação');
  p.rodar(60 * 5 + 5);
  confere_(fim.length === 1 && fim[0].winner === -1 && fim[0].motivo === 'empate', 'sem gol até −0:05: empate', fim[0] && fim[0].motivo);
  const R2 = relogioFalso(); const fim2 = [];
  const p2 = new PartidaAutoritativa({ tamanho: 1, ranked: true, agora: R2.agora, regra: { seg: 10, prorrog: 5 }, aoFim: r => fim2.push(r) });
  p2.entra(jogador('a')); p2.entra(jogador('b')); p2.comeca();
  p2.rodar(60 * 10 + 5);                                  // prorrogação
  const sim2 = p2.sim;
  sim2.jog[1].x = sim2.bola.x + F.U(2); sim2.jog[1].y = sim2.bola.y;   // o jogador 1 chuta para a esquerda (gol do time 1)
  sim2.jog[0].y = sim2.campo.LY0 + 60;                                // (o adversário fora do caminho)
  p2.comando('b', { seq: 1, x: 0, y: 0, k: 2 });
  p2.rodar(90);
  confere_(fim2.length === 1 && fim2[0].motivo === 'gol_de_ouro' && fim2[0].winner === 1, 'o gol de ouro decide na hora', fim2[0] && fim2[0].motivo);
}

console.log('\n3) o antitrampa (o item 6 do plano)');
{
  const R = relogioFalso(); const suspeitos = [];
  const p = new PartidaAutoritativa({ tamanho: 1, ranked: true, agora: R.agora, regra: { seg: 180, prorrog: 120 }, suspeito: r => suspeitos.push(r) });
  p.entra(jogador('a')); p.entra(jogador('b')); p.comeca();
  // comandos fora de ordem / repetidos
  confere_(p.comando('a', { seq: 5, x: 1, y: 0 }) === true, 'o primeiro comando vale');
  confere_(p.comando('a', { seq: 5, x: 1, y: 0 }) === false, 'o comando repetido é descartado');
  confere_(p.comando('a', { seq: 3, x: 1, y: 0 }) === false, 'o comando atrasado é descartado');
  // a rajada anormal
  for (let i = 0; i < MAX_CMD_S + 40; i++) { p.comando('a', { seq: 6 + i, x: 1, y: 0 }); R.anda(2); }
  confere_(suspeitos.some(s => s.tipo === 'taxa_comandos_anormal'), 'a rajada de comandos vira registro suspeito');
  // o chute impossível
  p.sim.jog[0].x = p.sim.bola.x - F.U(30); p.sim.jog[0].y = p.sim.bola.y;
  R.anda(2000);
  p.comando('a', { seq: 900, x: 0, y: 0, k: 2 });
  confere_(suspeitos.some(s => s.tipo === 'chute_fora_do_alcance'), 'o chute fora do alcance é recusado e registrado');
  // o macro de chutes
  p.sim.jog[0].x = p.sim.bola.x - F.U(2); p.sim.jog[0].y = p.sim.bola.y;
  R.anda(1000);
  p.comando('a', { seq: 901, x: 0, y: 0, k: 2 });
  p.comando('a', { seq: 902, x: 0, y: 0, k: 2 });   // no mesmo instante
  confere_(suspeitos.some(s => s.tipo === 'chute_rapido_demais'), 'o macro de chutes é recusado e registrado');
  // a direção adulterada
  p.comando('a', { seq: 903, x: 7, y: 0 });
  confere_(suspeitos.some(s => s.tipo === 'direcao_acima_de_1'), 'a direção acima de 1 é cortada e registrada');
  confere_(suspeitos.every(s => s.partida === p.codigo && s.id === 'a'), 'todo registro leva partida, jogador e hora (para investigar)');
  p.termina('teste');
}

console.log('\n4) a reconexão, a desistência e o isolamento');
{
  const R = relogioFalso(); const fim = [];
  const p = new PartidaAutoritativa({ tamanho: 1, ranked: true, agora: R.agora, regra: { seg: 60, prorrog: 10 }, aoFim: r => fim.push(r) });
  p.entra(jogador('a', 123)); p.entra(jogador('b', 456)); p.comeca();
  p.sai('b', 'conexão');
  confere_(p.gente() === 2 && p.presentes() === 1, 'quem cai no meio fica com o lugar guardado');
  const lugar = p.entra(jogador('b', 456));
  confere_(lugar === 1 && p.presentes() === 2, 'a reconexão devolve o mesmo lugar');
  p.sai('b', 'conexão'); R.anda(46000); p.vigiaQuedas();
  confere_(p.slots[1].desistiu === true, 'sumir por 45 s na ranqueada = desistência');
  p.sai('a', 'conexão'); R.anda(46000); p.vigiaQuedas();
  confere_(fim.length === 1 && fim[0].motivo === 'todos_cairam', 'todo mundo fora: a partida encerra e será limpa', fim[0] && fim[0].motivo);
}
{
  // duas partidas não se enxergam
  const a = new PartidaAutoritativa({ tamanho: 1, agora: Date.now, regra: { seg: 60 } });
  const b = new PartidaAutoritativa({ tamanho: 1, agora: Date.now, regra: { seg: 60 } });
  a.entra(jogador('x')); b.entra(jogador('x'));
  a.comando('x', { seq: 1, x: 1, y: 0 }); a.comeca(); a.rodar(30);
  confere_(b.sim.jog[0].x !== a.sim.jog[0].x || b.sim.jog[0].vx === 0, 'o comando de uma partida não toca na outra');
}

console.log('\n5) o gerente: as salas, o selo e a limpeza');
{
  const R = relogioFalso(); const recebidas = new Map();
  const wsFalso = id => ({ readyState: 1, bufferedAmount: 0, send: t => { const l = recebidas.get(id) || []; l.push(JSON.parse(t)); recebidas.set(id, l); return true; } });
  const cli = (id, conta) => ({ id, nome: 'J' + id, ws: wsFalso(id), conta: { idPublico: String(conta).padStart(6, '0'), nome: 'J' + id, selo: '' } });
  const g = new GerenteAuto({ segredo: SEGREDO, agora: R.agora, regra: { seg: 15, prorrog: 5 }, assina, log: () => {} });
  const a = cli('a', 123), b = cli('b', 456);
  g.recebe(a, { type: 'auto_entrar', n: 1, ranked: true });
  g.recebe(b, { type: 'auto_entrar', n: 1, ranked: true });
  const bemA = (recebidas.get('a') || []).find(m => m.type === 'auto_bemvindo');
  confere_(!!bemA && bemA.n === 1 && bemA.time === 0 && !!bemA.campo.MW, 'o bem-vindo traz lugar, time e a geometria do campo');
  const comeca = (recebidas.get('b') || []).some(m => m.type === 'auto_comeca');
  confere_(comeca, 'lotou: a partida começa sozinha');
  const sala = [...g.salas.values()][0].p;
  // joga: o 'a' chuta, o relógio anda no tempo real simulado
  sala.sim.jog[0].x = sala.sim.bola.x - F.U(2); sala.sim.jog[0].y = sala.sim.bola.y;
  sala.sim.jog[1].y = sala.sim.campo.LY0 + 60;                        // (o adversário fora do caminho)
  g.recebe(a, { type: 'auto_cmd', seq: 1, x: 0, y: 0, k: 2 });
  for (let i = 0; i < 60 * 25; i++) { sala.passo(); R.anda(1000 / 60); }
  const fimA = (recebidas.get('a') || []).find(m => m.type === 'auto_fim');
  confere_(!!fimA && fimA.ranked === true && typeof fimA.seuTime === 'number', 'o fim chega com o resultado DO SERVIDOR', fimA && fimA.motivo);
  confere_(typeof (fimA && fimA.selo) === 'string', 'a conta recebe o selo da ranqueada');
  const selo = fimA && confere(SEGREDO, fimA.selo);
  confere_(!!selo && selo.k === 1 && selo.n === 1 && selo.j === '000123' && Array.isArray(selo.p), 'o selo tem k:1, o tamanho e a conta certa (a plataforma aceita igual)', selo);
  const fimB = (recebidas.get('b') || []).find(m => m.type === 'auto_fim');
  const seloB = fimB && confere(SEGREDO, fimB.selo);
  confere_(!!seloB && seloB.j === '000456', 'cada conta recebe o SEU selo (nada de selo emprestado)');
  // a limpeza: a sala terminada some sozinha
  R.anda(31000); g.limpa();
  confere_(g.salas.size === 0, 'a partida encerrada é desfeita (a memória volta)');
  // a sala vazia também some
  const c = cli('c', 789);
  g.recebe(c, { type: 'auto_entrar', n: 2, ranked: true });
  confere_(g.salas.size === 1, 'a sala nova abre');
  g.recebe(c, { type: 'auto_sair' });
  R.anda(11000); g.limpa();
  confere_(g.salas.size === 0, 'a sala vazia é desfeita em 10 s');
  // sem bilhete não entra
  const d = { id: 'd', nome: 'D', ws: wsFalso('d'), conta: null };
  g.recebe(d, { type: 'auto_entrar', n: 1 });
  confere_((recebidas.get('d') || []).some(m => m.type === 'auto_erro'), 'sem a conta (o bilhete), a partida autoritativa não abre');
}

console.log('\npartida autoritativa (v83): ' + ok + ' ok, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
