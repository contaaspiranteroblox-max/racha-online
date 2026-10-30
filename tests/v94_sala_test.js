'use strict';
/* RACHA v94 · O MOTOR PRÓPRIO NAS SALAS — a sala (server/partida/sala.js + sala94.js) com o motor (server/partida/motor.js)
   e a previsão do aparelho (tools/v94/rede.js: o código de verdade, lido do arquivo) fazendo a MESMA conta.
   Roda: node tests/v94_sala_test.js */
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const { PartidaSala } = require(path.join(RAIZ, 'server/partida/sala.js'));
const M = require(path.join(RAIZ, 'server/partida/motor.js'));
const S94 = require(path.join(RAIZ, 'server/partida/sala94.js'));

let ok = 0, falhou = 0;
const confere = (cond, txt, extra) => {
  if (cond) { ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra) : '')); }
};
const relogio = () => { let t = 0; const f = () => t; f.anda = ms => { t += ms; }; return f; };
function sala(o = {}) {
  const ag = relogio(), out = { snaps: [], gols: [], fim: null, chutes: [] };
  const p = new PartidaSala(Object.assign({
    n: 1, jogo: 'futebol', map: 4, tempo: 0, regra: null, motor: 'v94',
    jogadores: [{ netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Bia' }],
    agora: ag, onSnapshot: d => out.snaps.push(d), onGol: g => out.gols.push(g), onFim: r => { out.fim = r; },
  }, o));
  const mc = p.marcaChute.bind(p);
  p.marcaChute = (q, f) => { out.chutes.push({ i: q.i, tick: p.tick, f }); return mc(q, f); };
  // (o relógio anda com o passo: o servidor limita os comandos por segundo pelo relógio)
  const ps = p.passo.bind(p); p.passo = () => { ag.anda(1000 / 60); return ps(); };
  return { p, out, ag };
}
const R0 = M.resolve(M.PADRAO), PX = S94.PX;
const mPara = (p, q) => ({ x: (q.x - p.G.CX) / PX, y: (q.y - p.G.CY) / PX });

/* a função de verdade do aparelho: o comando da rede → o comando do motor (tools/v94/rede.js) */
const REDE = fs.readFileSync(path.join(RAIZ, 'tools/v94/rede.js'), 'utf8');
const corpo = REDE.match(/function v94CmdMotor\(c\)\{([\s\S]*?)\n\}/);
const v94CmdMotor = corpo ? new Function('c', corpo[1]) : null;

console.log('1) a sala com o motor próprio: o campo, os tamanhos e o quadro');
{
  const { p, out } = sala({ n: 2, jogadores: [{ netId: 'A', nome: 'A' }, null, null, null] });
  confere(p.v94 === true && p.motor === 'v94', 'a sala liga o motor próprio (motor: v94)');
  const G = p.W94.G, L = G.linhas.x1 - G.linhas.x0, W = G.linhas.y1 - G.linhas.y0;
  confere(Math.abs(L / 0.8 - 18.57) < 0.02 && Math.abs(W / 0.8 - 13.36) < 0.02, 'o campo do 2 VS 2 tem as medidas da regra do motor (18,57 × 13,36 d)', [L / 0.8, W / 0.8]);
  confere(Math.abs(p.G.LX1 - p.G.LX0 - L * PX) < 1e-6 && p.G.CX === p.G.MW / 2, 'o campo em px da sala é o do motor (95 px por metro)');
  confere(p.jog.every(q => Math.abs(q.r - R0.rJ * PX) < 1e-9) && Math.abs(p.B.r - R0.rB * PX) < 1e-9, 'as tampinhas e a bola com os raios do motor');
  confere(p.estado === 'saida' && p.W94.estado === 'saida', 'começa na saída (a sala e o motor)');
  p.rodar(2);
  const s = out.snaps[out.snaps.length - 1];
  confere(s && typeof s.m94 === 'string' && s.m94.length > 10, 'o quadro leva o estado do motor (m94, em texto)', s && s.m94 && s.m94.length);
  const W2 = M.copia(p.W94); M.desempacota(W2, S94.desfazM94(s.m94));
  confere(JSON.stringify(M.empacota(W2)) === JSON.stringify(M.empacota(p.W94)) && S94.codificaM94(M.empacota(W2)) === s.m94, 'o m94 em texto volta exatamente ao mesmo estado (sem perder nenhuma casa)');
  confere(s.players.length === 4 && s.players.every(v => v.length >= 8), 'os jogadores no formato clássico (o resto do jogo lê igual)');
}

console.log('1b) o m94 em texto: ida e volta sem perder nada (o aparelho decodifica com o código de tools/v94/rede.js)');
{
  const vs = [0, -0, 1, -1, 0.1, 1 / 3, -7.221722809422318, 5e-324, 1.7976931348623157e308, -1000000000, 2.5];
  let sem = 7; for (let i = 0; i < 20000; i++) { sem = (sem * 1103515245 + 12345) % 2147483648; vs.push((sem / 2147483648 - 0.5) * Math.pow(10, (i % 12) - 6)); }
  const t = S94.codificaM94(vs), a = S94.desfazM94(t);
  const ini = REDE.indexOf('const V94_B64I'), fim = REDE.indexOf('function v94SnapPrev');
  const desfazAparelho = new Function(REDE.slice(ini, fim) + '; return v94DesfazM94;')(), c = desfazAparelho(t);
  confere(vs.every((v, i) => Object.is(v, a[i])) && vs.every((v, i) => Object.is(v, c[i])), 'os ' + vs.length + ' números voltam iguais no servidor e no aparelho (até o −0)');
  const json = JSON.stringify(vs).length;
  confere(t.length < json, 'e o texto é menor que o vetor em JSON (' + t.length + ' × ' + json + ' letras)');
}

console.log('2) só bots (2 VS 2, 60 s de jogo): chutam pela máquina de comandos, fazem gol, tudo dentro do campo');
{
  const { p, out } = sala({ n: 2, jogadores: [null, null, null, null] });
  let fora = 0, erro = null, maxV = 0;
  const G = p.W94.G;
  try {
    for (let t = 0; t < 3600 && !p.encerrado; t++) {
      p.passo();
      const b = p.W94.bola;
      maxV = Math.max(maxV, Math.sqrt(b.vx * b.vx + b.vy * b.vy));
      if (b.x < G.area.x0 - 1e-6 || b.x > G.area.x1 + 1e-6 || b.y < G.linhas.y0 - 1e-6 || b.y > G.linhas.y1 + 1e-6) fora++;
      for (const q of p.W94.jog) if (q.x < G.area.x0 - 1e-6 || q.x > G.area.x1 + 1e-6 || q.y < G.area.y0 - 1e-6 || q.y > G.area.y1 + 1e-6) fora++;
    }
  } catch (e) { erro = e.stack; }
  confere(!erro, 'sem erro em 3600 passos', erro);
  confere(out.chutes.length >= 10, 'os bots chutam (pelo toque no botão: o motor decide)', out.chutes.length);
  confere(out.gols.length >= 1, 'sai gol', out.gols.length);
  confere(fora === 0, 'a bola entre as linhas e as tampinhas na área delas o tempo todo', fora);
  confere(maxV <= R0.vMaxBola + 1e-9, 'a bola nunca passa do teto (vMaxBola)', maxV);
}

console.log('3) quem joga: o toque no CHUTE perto da bola sai na hora, com a velocidade do motor');
{
  const { p, out } = sala();
  p.rodar(1);
  const A = p.jog[0], B0 = p.B;
  const dx = (R0.rJ + R0.rB + 0.05) * PX;                         // atrás da bola, encostando no alcance
  A.x = B0.x - dx; A.y = B0.y; A.vx = A.vy = 0;
  p.entrada('A', { seq: 1, x: 0, y: 0, button: 1, k: 0, kc: 0, pc: 0, bh: 0 });
  p.passo();
  confere(Math.abs(p.W94.bola.vx) < 1e-9, 'sem toque: a bola parada');
  p.entrada('A', { seq: 2, x: 0, y: 0, button: 3, k: 0, kc: 0, pc: 1, bh: 2 });
  p.passo();
  const v = Math.hypot(p.W94.bola.vx, p.W94.bola.vy), v1 = R0.vChute * R0.fRol - R0.freioPasso;   // (o chute vem antes do freio do passo)
  confere(out.chutes.length === 1 && out.chutes[0].i === 0, 'o CHUTE saiu no passo do comando', out.chutes);
  confere(Math.abs(v - v1) < 1e-9, 'a bola sai com vChute (e já com o freio desse passo)', [v, v1]);
  confere(p.estado === 'jogo', 'o chute deu a saída (o estado vai para jogo)', p.estado);
  // segurar depois do chute não chuta de novo
  for (let s = 3; s < 30; s++) { p.entrada('A', { seq: s, x: 1, y: 0, button: 3, k: 0, kc: 0, pc: 1, bh: 2 }); p.passo(); }
  confere(out.chutes.length === 1, 'segurar o CHUTE depois do chute não chuta de novo', out.chutes.length);
}

console.log('4) a fila: o toque que veio num comando descartado ou atrasado não se perde');
{
  const { p, out } = sala();
  p.rodar(1);
  const A = p.jog[0];
  A.x = p.B.x - (R0.rJ + R0.rB + 0.05) * PX; A.y = p.B.y; A.vx = A.vy = 0;
  p.entrada('A', { seq: 1, x: 0, y: 0, button: 1, k: 0, kc: 0, pc: 0, bh: 0 });
  p.passo();
  // três comandos chegam juntos; o toque está no do meio (e o último já vem solto): o contador leva o toque
  p.entrada('A', { seq: 2, x: 0, y: 0, button: 1, k: 0, kc: 0, pc: 0, bh: 0 });
  p.entrada('A', { seq: 3, x: 0, y: 0, button: 2, k: 0, kc: 1, pc: 0, bh: 1 });
  p.entrada('A', { seq: 4, x: 0, y: 0, button: 1, k: 0, kc: 1, pc: 0, bh: 0 });
  for (let i = 0; i < 4; i++) p.passo();
  confere(out.chutes.length === 1, 'o PASSE do comando do meio saiu', out.chutes.length);
  const v = Math.hypot(p.W94.bola.vx, p.W94.bola.vy);
  confere(v > 0.5 * R0.vPasse && v < 1.1 * R0.vPasse, 'com a velocidade do PASSE (menos o freio de uns passos)', v);
}

console.log('5) a comemoração: um toque durante o gol não vira chute na saída');
{
  const { p, out } = sala();
  p.rodar(1);
  // gol armado: a bola indo para o gol da esquerda (o time 1 marca; depois a saída é do time 0, a da Ana)
  const G = p.W94.G;
  p.B.x = p.G.CX + (G.linhas.x0 + 0.3) * PX; p.B.y = p.G.CY; p.B.vx = -6 * PX; p.B.vy = 0;
  let s = 1, k = 0;
  for (let i = 0; i < 20 && !out.gols.length; i++) { p.entrada('A', { seq: s++, x: 0, y: 0, button: 1, k: 0, kc: 0, pc: 0, bh: 0 }); p.passo(); }
  confere(out.gols.length === 1 && p.estado === 'gol', 'o gol entrou (estado gol)', [out.gols.length, p.estado]);
  // durante a comemoração: tocou o CHUTE 3 vezes
  for (let i = 0; i < 150 && p.estado !== 'saida'; i++) { if (i % 20 === 5) k++; p.entrada('A', { seq: s++, x: 0, y: 0, button: k % 2 ? 3 : 1, k: 0, kc: 0, pc: k, bh: 0 }); p.passo(); }
  confere(p.estado === 'saida' && p.saidaTime === 0, 'a saída depois da comemoração (do time 0)', [p.estado, p.saidaTime]);
  const nChutes = out.chutes.length, A = p.jog[0];
  A.x = p.B.x - (R0.rJ + R0.rB + 0.05) * PX; A.y = p.B.y; A.vx = A.vy = 0;   // encostada na bola, no alcance
  for (let i = 0; i < 30; i++) { p.entrada('A', { seq: s++, x: 0, y: 0, button: 1, k: 0, kc: 0, pc: k, bh: 0 }); p.passo(); }
  confere(k >= 3 && out.chutes.length === nChutes && Math.hypot(p.W94.bola.vx, p.W94.bola.vy) === 0, 'no alcance da bola, os toques da comemoração não viram chute', [k, out.chutes.length - nChutes]);
  p.entrada('A', { seq: s++, x: 0, y: 0, button: 3, k: 0, kc: 0, pc: k + 1, bh: 2 }); p.passo();
  confere(out.chutes.length === nChutes + 1, 'um toque novo depois da comemoração vale', out.chutes.length - nChutes);
}

console.log('6) a previsão do aparelho (o código de tools/v94/rede.js) chega EXATAMENTE no estado do servidor');
{
  confere(!!v94CmdMotor, 'achei o v94CmdMotor no rede.js');
  const { p, out } = sala();
  p.meta = 99;                                                    // (a partida não acaba no meio da cena)
  const L = 4, L2 = 3;                                            // a ida (comando → servidor) e a volta (quadro → aparelho), em passos
  let semente = 7; const rnd = () => (semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648;
  const cmds = [], estados = [], saidas = new Set();
  const sOrig = p.saida.bind(p); p.saida = t => { saidas.add(p.tick); saidas.add(p.tick + 1); return sOrig(t); };
  // o aparelho: um comando por passo (vai para a bola, troca de direção às vezes, toca o PASSE/CHUTE perto dela)
  let kc = 0, pc = 0, mx = 1, my = 0;
  const cliente = { W: M.copia(p.W94), pend: [], est: 'saida', base: false };
  let comparados = 0, iguais = 0, primeiro = null;
  const quadros = [];                                             // [chega no passo, quadro]
  for (let c = 1; c <= 1500; c++) {
    // o servidor no passo c (recebe o que o aparelho mandou L passos atrás)
    if (c - L >= 1) p.entrada('A', cmds[c - L - 1]);
    p.passo();
    estados[p.tick] = { a: p.W94.jog[0].x + ',' + p.W94.jog[0].y + ',' + p.W94.jog[0].vx + ',' + p.W94.jog[0].vy, b: p.W94.bola.x + ',' + p.W94.bola.y + ',' + p.W94.bola.vx + ',' + p.W94.bola.vy, ack: p.jog[0].ack49 };
    while (out.snaps.length) { const s = out.snaps.shift(); quadros.push([c + L2, JSON.parse(JSON.stringify(s))]); }
    // o aparelho no passo c: o quadro que chegou agora → volta para ele e refaz os pendentes; depois o comando novo
    while (quadros.length && quadros[0][0] <= c) {
      const s = quadros.shift()[1], ack = s.players[0][4] | 0;
      while (cliente.pend.length && cliente.pend[0].seq <= ack) cliente.pend.shift();
      M.desempacota(cliente.W, S94.desfazM94(s.m94)); cliente.est = s.state; cliente.base = true;
      for (const q of cliente.pend) passoCliente(q);
    }
    const eu = cliente.W.jog[0], b = cliente.W.bola;
    if (rnd() < 0.05) { const a = rnd() * 2 * Math.PI; mx = Math.cos(a); my = Math.sin(a); }
    else { const dx = b.x - eu.x, dy = b.y - eu.y, d = Math.sqrt(dx * dx + dy * dy) || 1; if (rnd() < 0.7) { mx = dx / d; my = dy / d; } }
    let bh = 0;
    const perto = Math.hypot(b.x - eu.x, b.y - eu.y) < M.alcance(R0) + 0.3;
    if (perto && rnd() < 0.08) { if (rnd() < 0.5) { kc++; bh |= 1; } else { pc++; bh |= 2; } }
    const cmd = { seq: c, x: mx, y: my, button: bh & 2 ? 3 : bh & 1 ? 2 : 1, k: 0, kc, pc, bh };
    cmds.push(cmd); cliente.pend.push(cmd);
    if (cliente.base) passoCliente(cmd);
    // o servidor vai usar o comando c no passo c + L: compara a previsão de agora com o que ele vai ter lá
    cliente.agora = cliente.agora || [];
    cliente.agora[c] = { a: eu.x + ',' + eu.y + ',' + eu.vx + ',' + eu.vy, b: b.x + ',' + b.y + ',' + b.vx + ',' + b.vy, pulo: false };
  }
  function passoCliente(c) {
    const W = cliente.W;
    if (cliente.est === 'saida' || cliente.est === 'jogo') M.comando(W, 0, v94CmdMotor(c));
    else { M.reiniciaComandos(W, 0); M.comando(W, 0, { mx: 0, my: 0, passe: 0, chute: 0, curva: 0, np: c.kc | 0, nc: c.pc | 0 }); }
    for (const e of M.passo(W)) { if (e.t === 'gol') cliente.est = 'gol'; else if (e.t === 'saida' && cliente.est === 'saida') cliente.est = 'jogo'; }
  }
  // a previsão do comando c (feita no passo c do aparelho) × o servidor depois de usar o comando c (o passo em que ack = c)
  const porAck = {};
  for (let t = 1; t < estados.length; t++) if (estados[t]) porAck[estados[t].ack] = t;
  for (let c = 40; c <= 1500 - L - 2; c++) {
    const t = porAck[c], pr = cliente.agora[c]; if (!t || !pr) continue;
    let mexeu = false; for (let k = t - (L + L2 + 2); k <= t; k++) if (saidas.has(k)) mexeu = true;   // (a saída depois do gol é regra da sala: o aparelho não prevê)
    if (mexeu) continue;
    comparados++;
    if (pr.a === estados[t].a && pr.b === estados[t].b) iguais++;
    else if (!primeiro) primeiro = { c, t, previsao: pr, servidor: estados[t] };
  }
  console.log('     (' + comparados + ' passos comparados, ' + out.chutes.length + ' chutes, ' + out.gols.length + ' gols, ida ' + L + ' e volta ' + L2 + ' passos)');
  confere(out.gols.length >= 1 || out.chutes.length >= 5, 'a cena tem chutes (e, com sorte, gol)', [out.chutes.length, out.gols.length]);
  confere(comparados > 1000, 'comparou a previsão com o servidor em mais de 1000 passos', comparados);
  confere(iguais === comparados, 'a previsão é IGUAL ao servidor (bit a bit) em todos os passos comparados', primeiro);
}

console.log('7) quem assume a tampinha recomeça os contadores (o motor esquece a máquina de comandos dele)');
{
  const { p, out } = sala();
  p.rodar(1);
  const A = p.jog[0];
  p.entrada('A', { seq: 1, x: 0, y: 0, button: 1, k: 0, kc: 5, pc: 9, bh: 0 }); p.passo();
  p.sai('A');                                                     // caiu: vira bot
  confere(A.bot && A.cont94.np === 0 && A.cont94.nc === 0, 'virou bot com os contadores do zero');
  p.entra('A', 'Ana');                                            // voltou (os contadores do aparelho continuam em 5 e 9)
  A.x = p.B.x - (R0.rJ + R0.rB + 0.05) * PX; A.y = p.B.y; A.vx = A.vy = 0;
  const n0 = out.chutes.length;
  p.entrada('A', { seq: 1, x: 0, y: 0, button: 1, k: 0, kc: 5, pc: 9, bh: 0 }); p.passo();
  confere(out.chutes.length === n0, 'na volta, o primeiro comando é a base (os 5 e 9 de antes não viram toques)', out.chutes.length - n0);
  p.entrada('A', { seq: 2, x: 0, y: 0, button: 3, k: 0, kc: 5, pc: 10, bh: 2 }); p.passo();
  confere(out.chutes.length === n0 + 1, 'o toque novo vale', out.chutes.length - n0);
}

console.log('8) a sala sem o motor próprio continua a de antes');
{
  const { p } = sala({ motor: undefined });
  confere(!p.v94 && p.motor === 'v93' && !p.W94, 'sem motor: v93 (o núcleo da v92)');
  p.rodar(3);
  confere(!('m94' in p.quadro()), 'o quadro de antes (sem m94)');
}

console.log('\n' + ok + ' verificações ok, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
