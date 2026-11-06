// RACHA v108 · O SERVIDOR DAS SALAS: o ritmo dos comandos num balde de fichas (server/partida/ritmo108.js — a rajada de um
// apagão passa; até a v107 a janela de 1 s com 120 recusava o segundo seguinte: a tampinha ficava parada no servidor e o
// toque no PASSE/CHUTE desse segundo se perdia — o chute que "parece que vai, mas não vai" depois da volta da internet), o
// excesso que continua recusado (nas salas do RACHA, do mapa e do Rachão) e o motor que alcança 12 passos depois de um
// engasgo do processo (eram 5: a partida inteira em câmera lenta no servidor com a CPU dividida).
// Rodar: node tests/v108_servidor_test.mjs
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R108 = require(path.join(RAIZ, 'server/partida/ritmo108.js'));
const { PartidaSala, MOTOR_ALCANCA } = require(path.join(RAIZ, 'server/partida/sala.js'));
let ok = 0, falhou = 0;
const confere = (c, txt, extra) => { if (c) { ok++; console.log('  ok   ' + txt); } else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra).slice(0, 400) : '')); } };
const t0 = Date.now();

// a partida de teste: a Ana e o Beto, o relógio na mão (como o tests/v96_rede_test.mjs)
function partida(o = {}) {
  let t = 0; const ag = () => t; ag.anda = ms => { t += ms; };
  const sus = [];
  const p = new PartidaSala(Object.assign({ n: 1, jogo: 'futebol', map: 4, tempo: 0, regra: null, jogadores: [{ netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Beto' }], agora: ag,
    suspeito: (id, tipo, det) => sus.push([id, tipo, det]), onSnapshot: () => {}, onGol: () => {}, onAviso: () => {}, onFim: () => {} }, o));
  p.estado = 'jogo';
  for (const q of p.jog) if (q.fila) q.fila.chegou = 0;
  return { p, ag, sus };
}

console.log('1) o balde do ritmo dos comandos (server/partida/ritmo108.js)');
{
  const b = R108.novo();
  let passou = 0; for (let i = 0; i < 200; i++) if (R108.passa(b, 5000)) passou++;
  confere(passou === R108.RAJADA && R108.RAJADA >= 130, 'a rajada de um apagão passa inteira: ' + passou + ' de uma vez (o aparelho manda 60 por segundo e para depois de 2 s sem quadro: ~120)', [passou, R108.RAJADA]);
  let depois = 0; for (let i = 0; i < 200; i++) if (R108.passa(b, 6000)) depois++;
  confere(depois === R108.POR_S && b.recusados === 50 + 200 - depois, 'o recusado não gasta ficha: 1 s depois passam ' + depois + ' (' + R108.POR_S + ' por segundo; na janela da v107 o recusado contava e o segundo seguinte ficava fechado)', [depois, b.recusados]);
  const c = R108.novo(); let rec = 0;
  for (let i = 0; i < 3600; i++) if (!R108.passa(c, i * 1000 / 60)) rec++;
  const d = R108.novo(); let recD = 0;   // (o 4G: os comandos chegando em bolos de 10 a cada 166 ms)
  for (let i = 0; i < 3600; i++) if (!R108.passa(d, Math.floor(i / 10) * 10 * 1000 / 60)) recD++;
  confere(rec === 0 && recD === 0, 'o jogo (60 por segundo, um minuto) nunca é recusado, nem chegando em bolos', [rec, recD]);
  const e = R108.novo(); let pe = 0;
  for (let i = 0; i < 1200; i++) if (R108.passa(e, i * 1000 / 120)) pe++;
  const teto = R108.RAJADA + R108.POR_S * 10;
  confere(pe >= teto - 2 && pe <= teto + 1, 'quem manda 120 por segundo sem parar: passam ' + pe + ' em 10 s (a rajada + ' + R108.POR_S + ' por segundo)', [pe, teto]);
  const f = R108.novo(); let avisos = 0;
  for (let i = 0; i < 1000; i++) { const ag = i * 1000 / 200; if (!R108.passa(f, ag) && R108.avisa(f, ag)) avisos++; }
  confere(avisos >= 3 && avisos <= 4, 'a linha do suspeito: no máximo uma por segundo (' + avisos + ' em 5 s de 200 por segundo; na v107, uma por comando recusado)', avisos);
  const g = R108.novo(); for (let i = 0; i < 150; i++) R108.passa(g, 1000);
  const volta = [R108.passa(g, 500), R108.passa(g, 500)];
  confere(!volta[0] && !volta[1], 'o relógio voltando não dá fichas', volta);
  const lixo = [[], null, undefined, { n: NaN }, 'x', 42].map(v => R108.garante(v));
  confere(lixo.every(v => v && v.n === R108.RAJADA && v.recusados === 0) && R108.garante(b) === b, 'o balde estragado (o [] do ritmo da v107, null, NaN) vira um balde cheio; o bom fica', lixo.map(v => v && v.n));
}

console.log('\n2) a sala depois de um apagão de 2 s: os comandos do apagão chegam juntos (v107: a janela · v108: o balde)');
function apagao(passos, o) {
  const { p, ag, sus } = partida(o);
  const A = p.jog[0]; A.x = 300; A.y = 300;
  let seq = 0;
  const cmd = () => ({ seq: ++seq, x: 1, y: 0, button: 1, kc: 0, pc: 0 });
  const beto = () => p.entrada('B', { seq: p.tick + 1, x: 0, y: 0, button: 1, kc: 0, pc: 0 });
  const umPasso = () => { ag.anda(1000 / 60); p.passo(); };
  for (let i = 0; i < 60; i++) { p.entrada('A', cmd()); beto(); umPasso(); }        // 1 s correndo para a direita
  const preso = [];
  for (let i = 0; i < passos; i++) { preso.push(cmd()); beto(); umPasso(); }         // o apagão: os comandos no caminho
  for (const c of preso) p.entrada('A', c);                                          // a internet volta: tudo junto
  const x0 = A.x; let parado = 0;
  for (let i = 0; i < 60; i++) { const xa = A.x; p.entrada('A', cmd()); beto(); umPasso(); if (A.x - xa < 1) parado++; }   // e o segundo seguinte, ainda correndo
  return { parado, andou: A.x - x0, ritmo: sus.filter(s => s[1] === 'ritmo').length, sus };
}
{
  const v107 = apagao(120, { ritmo: 'v107' }), v108 = apagao(120, {});
  console.log('  v107: parada ' + v107.parado + ' de 60 passos, andou ' + Math.round(v107.andou) + ' px, ' + v107.ritmo + ' linhas de suspeito · v108: parada ' + v108.parado + ', andou ' + Math.round(v108.andou) + ' px, ' + v108.ritmo + ' linhas');
  confere(v107.parado >= 30 && v107.ritmo >= 30, 'até a v107: no segundo depois da volta da internet, a tampinha da Ana ficou ' + v107.parado + ' de 60 passos parada no servidor, correndo no aparelho (' + v107.ritmo + ' comandos recusados como "ritmo")', [v107.parado, v107.ritmo]);
  confere(v108.parado === 0 && v108.ritmo === 0 && v108.andou > v107.andou + 150, 'agora: nenhum passo parado e nenhum recusado — anda ' + Math.round(v108.andou) + ' px no segundo seguinte (eram ' + Math.round(v107.andou) + ')', [v108.parado, v108.ritmo, v108.andou]);
  const curto = apagao(30, {}), curto107 = apagao(30, { ritmo: 'v107' });
  confere(curto.parado === 0 && curto107.parado === 0 && Math.abs(curto.andou - curto107.andou) < 1e-6, 'o soluço de meio segundo: igual à v107 (nada parado)', [curto.andou, curto107.andou]);
}

console.log('\n3) o excesso continua recusado (o balde é o mesmo nas salas do RACHA, do mapa e do Rachão)');
{
  const { p, ag, sus } = partida({});
  let seq = 0;
  for (let i = 0; i < 180; i++) {                     // 3 s mandando 200 por segundo (10 a cada 50 ms)
    if (i % 3 === 0) for (let k = 0; k < 10; k++) p.entrada('A', { seq: ++seq, x: 1, y: 0, button: 1 });
    ag.anda(1000 / 60); p.passo();
  }
  const rec = p.jog[0].ritmo.recusados, linhas = sus.filter(s => s[1] === 'ritmo');
  const esperado = 600 - Math.floor(R108.RAJADA + R108.POR_S * 177 / 60);   // (do primeiro bolo, no 0, ao último, no passo 177)
  confere(Math.abs(rec - esperado) <= 2, 'na sala: 200 por segundo por 3 s — ' + rec + ' recusados (passam a rajada + ' + R108.POR_S + ' por segundo: ' + (600 - esperado) + ' de 600)', [rec, esperado]);
  confere(linhas.length >= 2 && linhas.length <= 3 && /mais de 75 cmd\/s/.test(linhas[0][2]), 'e o suspeito anotado ' + linhas.length + ' vezes (uma por segundo): "' + (linhas[0] || [])[2] + '"', linhas);
  for (const arq of ['sala.js', 'sala_mapa.js', 'rachao.js']) {
    const src = fs.readFileSync(path.join(RAIZ, 'server/partida', arq), 'utf8');
    const usa = /require\('\.\/ritmo108'\)/.test(src) && /R108\.passa\(/.test(src) && /R108\.avisa\(/.test(src) && !/MAX_CMD_S/.test(src);
    confere(usa, arq + ': o balde (R108.passa e R108.avisa) no lugar da janela de 1 s (MAX_CMD_S)');
  }
}

console.log('\n4) o motor das salas alcança 12 passos depois de um engasgo (eram 5)');
{
  confere(MOTOR_ALCANCA === 12, 'o padrão: 12 passos (200 ms)', MOTOR_ALCANCA);
  // um processo à parte com o MOTOR de verdade e o processo travando 150 ms a cada 200 ms (como o servidor com a CPU
  // dividida: a coleta de lixo, a cota de CPU de cada 100 ms) — com 12 e com RACHA_MOTOR_ALCANCA=5 (o de antes)
  const roda = (env) => {
    const cod = "const { PartidaSala, MOTOR, MOTOR_ALCANCA } = require(" + JSON.stringify(path.join(RAIZ, 'server/partida/sala.js')) + ");" +
      "const p = new PartidaSala({ n: 1, jogo: 'futebol', map: 0, tempo: 5, jogadores: [{ netId: 'a', nome: 'A' }, { netId: 'b', nome: 'B' }], quadros: 60, onSnapshot: () => {} });" +
      "p.ligar(); setTimeout(() => { setInterval(() => { const t = Date.now(); while (Date.now() - t < 150); }, 200); const t0 = Date.now(), k0 = p.tick;" +
      "setTimeout(() => { console.log(JSON.stringify({ alc: MOTOR_ALCANCA, tps: (p.tick - k0) * 1000 / (Date.now() - t0) })); process.exit(0); }, 3000); }, 300);";
    const r = spawnSync(process.execPath, ['-e', cod], { env: Object.assign({}, process.env, env), encoding: 'utf8', timeout: 20000 });
    try { return JSON.parse(r.stdout.trim().split('\n').pop()); } catch (_) { return { alc: -1, tps: 0, erro: (r.stderr || '').slice(0, 300) }; }
  };
  let novo = roda({ RACHA_MOTOR_ALCANCA: '' }), velho = roda({ RACHA_MOTOR_ALCANCA: '5' });
  if (!(novo.tps >= 54 && velho.tps <= 48)) { novo = roda({ RACHA_MOTOR_ALCANCA: '' }); velho = roda({ RACHA_MOTOR_ALCANCA: '5' }); }   // (a medida do relógio: mais uma vez, se a máquina estava ocupada)
  console.log('  travando 150 ms a cada 200 ms: ' + novo.tps.toFixed(1) + ' passos/s com ' + novo.alc + ' · ' + velho.tps.toFixed(1) + ' com ' + velho.alc);
  confere(velho.alc === 5 && velho.tps <= 48, 'com 5 (o de antes), o processo travando joga passos fora: ' + velho.tps.toFixed(1) + ' passos por segundo — o jogo inteiro a ' + Math.round(velho.tps / 0.6) + '% para todo mundo', velho);
  confere(novo.alc === 12 && novo.tps >= 54, 'com 12, o relógio do jogo fica no de verdade: ' + novo.tps.toFixed(1) + ' passos por segundo', novo);
}

console.log('\n5) o chute logo depois do apagão (o "parece que vai, mas não vai" depois da volta da internet)');
// a Ana parada em (700, 400); 1 s na hora, 2 s de apagão (os comandos no caminho) e a volta. A bola passa rolando rente a ela
// logo depois da volta (no alcance de 7 passos seguidos) e o toque dela vai no comando do meio desses passos — a tela dela
// mostra o chute na hora. Até a v107 o servidor recusava os comandos do segundo seguinte à volta (o toque junto): o toque só
// entrava no servidor quase 1 s depois, com a bola longe
function chuteDepois(o, toqueEm) {
  const { p, ag, sus } = partida(o);
  const A = p.jog[0], Bt = p.jog[1];
  A.x = 700; A.y = 400; Bt.x = 1500; Bt.y = 900;
  let seq = 0, kc = 0;
  const cmd = (toque) => { if (toque) kc++; return { seq: ++seq, x: 0, y: 0, button: 1, kc, pc: 0 }; };
  const umPasso = () => { ag.anda(1000 / 60); p.passo(); };
  const beto = () => p.entrada('B', { seq: p.tick + 1, x: 0, y: 0, button: 1, kc: 0, pc: 0 });
  for (let i = 0; i < 60; i++) { p.entrada('A', cmd(false)); beto(); umPasso(); }
  const preso = [];
  for (let i = 0; i < 120; i++) { preso.push(cmd(false)); beto(); umPasso(); }
  for (const c of preso) p.entrada('A', c);                                          // a internet volta: tudo junto
  p.B.x = A.x + 90; p.B.y = A.y - 62; p.B.vx = -480; p.B.vy = 0; p.B.w = 0;          // (a bola passando)
  const reg = [];
  for (let i = 0; i < 90; i++) {
    const ch0 = A.chuteT;
    p.entrada('A', cmd(i === toqueEm)); beto(); umPasso();
    reg.push({ i, d: Math.hypot(p.B.x - A.x, p.B.y - A.y), chutou: A.chuteT !== ch0 });
  }
  return { chutes: reg.filter(r => r.chutou).map(r => r.i), dentro: reg.filter(r => r.d <= ALC).map(r => r.i + 1), ritmo: sus.filter(s => s[1] === 'ritmo').length };
}
const ALC = new PartidaSala({ n: 1, jogadores: [] }).C.ALCANCE_CHUTE;
{
  const seco = chuteDepois({}, -1);
  const meio = seco.dentro[Math.floor(seco.dentro.length / 2)];
  confere(seco.dentro.length >= 5 && seco.chutes.length === 0, 'a cena: sem toque, a bola fica no alcance da Ana nos passos ' + seco.dentro[0] + ' a ' + seco.dentro[seco.dentro.length - 1] + ' depois da volta e ninguém chuta', seco.dentro);
  const v107 = chuteDepois({ ritmo: 'v107' }, meio), v108 = chuteDepois({}, meio);
  confere(v107.chutes.every(i => i > seco.dentro[seco.dentro.length - 1]) && v107.ritmo >= 30, 'até a v107: o toque no passo ' + meio + ' (a bola no alcance; a tela mostrou o chute) foi recusado junto com o segundo seguinte — o servidor ' + (v107.chutes.length ? 'só chutou no passo ' + v107.chutes[0] + ', com a bola em outro lugar' : 'não chutou'), v107);
  confere(v108.chutes.length === 1 && v108.chutes[0] >= meio && v108.chutes[0] <= meio + 2 && v108.ritmo === 0,
    'agora: o chute sai com a bola ainda no alcance (no passo ' + v108.chutes[0] + '; o toque no ' + meio + ' — a fila da volta ainda tem um comando na frente), como na tela', v108);
}

console.log('\nv108 · o servidor das salas sem câmera lenta: ' + ok + ' ok, ' + falhou + ' falharam em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(falhou ? 1 : 0);
