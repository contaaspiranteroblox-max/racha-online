/* PROTÓTIPO COLYSEUS · TESTE 4 — A TRAPAÇA (o aparelho só manda o controle; o resto é do servidor)
   1) as mensagens forjadas (o quadro, o fim, o placar, o selo, o gol, o aviso, bytes): nada muda, ninguém recebe nada, e
      cada uma fica anotada como suspeita (sem banimento automático, a regra da turma);
   2) os comandos absurdos (1e9, NaN, texto, botão 99, contadores negativos, lixo): o motor limpa — a tampinha não corre
      mais que a de quem joga limpo e não sai do mapa;
   3) mais comandos por segundo (120/s, o "speed hack"): não anda mais rápido (um comando por passo) e fica anotado (v108);
   4) repetir comandos velhos (o seq de antes): ignorados;
   5) a enxurrada (mais de 300 mensagens num segundo): o Colyseus derruba (4002) e a vaga NÃO fica guardada; a mensagem
      maior que 4 KB derruba a conexão (1009) — a partida dos outros segue;
   6) a origem: o matchmaking, a sala e a volta pela conta recusam um site de fora (403);
   7) o resultado: o selo que o aparelho fabrica (outro segredo) ou mexe (o placar de um selo de verdade) a plataforma
      recusa (app/api/lib/selo.ts · confereSelo); quem sai no meio para não perder não segura o resultado — o servidor manda
      o resultado assinado direto para a plataforma, com a conta de quem saiu.
   (as linhas "❌ … Max payload size exceeded" e "reconnection token invalid" que aparecem são o Colyseus contando o que recusou)
   node prototipos/colyseus/testes/t4_trapaca.mjs */
import http from 'node:http';
import { Placar, plataforma } from './comum.mjs';
import { sobe } from '../servidor/index.mjs';
import { Aparelho, ate, espera } from '../cliente/aparelho.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { assina, confere } = require('../../../server/banco.js');

const P = new Placar('protótipo Colyseus · 4 · a trapaça');
const SEGREDO = 'segredo-do-teste-' + Date.now();
const PL = await plataforma(SEGREDO);
const log = [];
let s = await sobe({ segredo: SEGREDO, sala: { log: t => log.push(t), r80: { seg: 600, prorrog: 60 } } });
let url = 'ws://127.0.0.1:' + s.porta;
const bil = (id, nome) => PL.bilheteDaConta(id, nome);
const recusa = async (p) => { try { await p; return null; } catch (e) { return e && (e.code || e.message || String(e)); } };
const parado = () => ({ x: 0, y: 0 });
const salaDe = ap => [...s.salas].find(x => x.roomId === ap.sala.roomId);
const vel = (Q, i) => Math.hypot(Q.players[i][2], Q.players[i][3]);

// ---------------------------------------------------------------- 1) as mensagens forjadas
const A = new Aparelho(url, { nome: 'Ana', bilhete: bil(5001, 'Ana') }), M = new Aparelho(url, { nome: 'Malu', bilhete: bil(5002, 'Malu') });
await A.entra('joinOrCreate', 'racha', { modo: 'casual', n: 1 });
await M.entra('joinOrCreate', 'racha', { modo: 'casual', n: 1 });
await ate(() => A.comecou && M.comecou, 4000);
const sala = salaDe(A), iA = A.info.lugar, iM = M.info.lugar;
A.joga(parado); M.joga(parado);
await espera(300);
{
  const forjadas = [
    ['q', { tick: 1, score: [9, 0], players: [] }], ['fim', { placar: [9, 0], vencedor: iM }], ['placar', { a: 0, b: 9 }],
    ['selo', assina('chute', { s: 'X', j: '5002', p: [9, 0] })], ['gol', { placar: [0, 9] }], ['aviso', 'hack'], ['i', { lugar: 0 }],
  ];
  for (const [tipo, m] of forjadas) M.manda(tipo, m);
  M.sala.sendBytes('q', new Uint8Array([1, 9, 9, 9]));
  await espera(500);
  const anot = sala.suspeitos.filter(x => x.id === 'c5002' && x.tipo === 'mensagem').map(x => x.det);
  P.confere(sala.state.placarA === 0 && sala.state.placarB === 0 && sala.partida.placar.join() === '0,0' && !sala.encerrado && A.fim === null && A.selo === null && !A.avisos.includes('hack') && A.gols.length === 0 && A.info.lugar === iA,
    'as mensagens forjadas (quadro, fim, placar, selo, gol, aviso, a sua posição, bytes) não mudam nada e ninguém recebe nada', { placar: sala.partida.placar, fim: A.fim, avisos: A.avisos });
  P.confere(['q', 'fim', 'placar', 'selo', 'gol', 'aviso', 'i'].every(t => anot.includes(t)) && anot.length >= 8 && M.saidas.length === 0, 'cada uma fica anotada como suspeita (' + anot.length + ' linhas, quem mandou e o quê) — sem banir sozinho, como na turma', anot);
}
// ---------------------------------------------------------------- 2) os comandos absurdos e 3) os 120 por segundo
{
  const G = { MW: 0, MH: 0 };
  { const N = require('../../../server/partida/nucleo.js'); Object.assign(G, N.novoCampo(1)); }
  // os dois sobem a tela juntos: a Ana com o analógico no máximo (1), a Malu com 1e9 e lixo no meio
  let vA = 0, vM = 0, fora = 0, naoFinito = 0;
  A.aoQuadro = Q => {
    vA = Math.max(vA, vel(Q, iA)); vM = Math.max(vM, vel(Q, iM));
    for (const p of Q.players) { if (!p.slice(0, 4).every(Number.isFinite)) naoFinito++; else if (p[0] < 0 || p[0] > G.MW || p[1] < 0 || p[1] > G.MH) fora++; }
  };
  A.joga(() => ({ x: 0, y: -1 }));
  M.para();
  let seq = M.seq;
  const lixo = [{ seq: 'abc', x: 'NaN', y: {}, button: 99, k: 50, kc: -5, pc: 1.5 }, {}, [], null, 'texto', 12345, { seq: -7, x: Infinity, y: -Infinity }, { seq: 2 ** 40, x: 1e308 }];
  const t0 = Date.now();
  await new Promise(ok => {
    const h = setInterval(() => {
      M.manda('c', { seq: ++seq, x: 0, y: -1e9, button: 3, kc: 0 });
      if (seq % 10 === 0) for (const l of lixo) M.manda('c', l);
      if (Date.now() - t0 > 1500) { clearInterval(h); ok(); }
    }, 1000 / 60);
  });
  P.confere(vM <= vA * 1.02 + 0.05 && vA > 1 && naoFinito === 0 && fora === 0 && !sala.encerrado, 'os comandos absurdos (1e9, NaN, texto, botão 99, contadores negativos, lixo): a tampinha não corre mais que a de quem joga limpo (' + vM.toFixed(1) + ' × ' + vA.toFixed(1) + ') e ninguém sai do mapa', { vA, vM, naoFinito, fora });
  // os 120 por segundo, descendo: a Malu manda 2 comandos a cada passo
  vA = 0; vM = 0;
  A.joga(() => ({ x: 0, y: 1 }));
  const t1 = Date.now();
  await new Promise(ok => {
    const h = setInterval(() => {
      M.manda('c', { seq: ++seq, x: 0, y: 1 }); M.manda('c', { seq: ++seq, x: 0, y: 1 });
      if (Date.now() - t1 > 4500) { clearInterval(h); ok(); }
    }, 1000 / 60);
  });
  const ritmo = sala.suspeitos.filter(x => x.id === 'c5002' && x.tipo === 'ritmo');
  P.confere(vM <= vA * 1.02 + 0.05 && ritmo.length >= 1 && M.saidas.length === 0, 'mandar 120 comandos por segundo não anda mais rápido (' + vM.toFixed(1) + ' × ' + vA.toFixed(1) + ': um comando por passo) e fica anotado pelo balde da v108 (' + (ritmo[0] ? ritmo[0].det : '—') + ')', { vA, vM, ritmo: ritmo.length });
  M.seq = seq;
}
// ---------------------------------------------------------------- 4) os comandos velhos
{
  A.joga(parado);
  M.joga(parado);
  await espera(800);
  let vMax = 0;
  A.aoQuadro = Q => { vMax = Math.max(vMax, vel(Q, iM)); };
  const base = M.seq;
  for (let k = 0; k < 60; k++) M.manda('c', { seq: base - 200 + k, x: 1, y: 1, button: 3, kc: 99 });
  await espera(600);
  P.confere(vMax < 0.5 && M.saidas.length === 0, 'repetir comandos velhos (o seq de antes, com outra direção e um CHUTE) não mexe a tampinha', { vMax });
  A.aoQuadro = null;
}
// ---------------------------------------------------------------- 5) a enxurrada e a mensagem grande
{
  const F = new Aparelho(url, { nome: 'Fausto', bilhete: bil(5003, 'Fausto') }), H = new Aparelho(url, { nome: 'Hugo', bilhete: bil(5004, 'Hugo') });
  await F.entra('joinOrCreate', 'racha', { modo: 'casual', n: 1 });
  await H.entra('joinOrCreate', 'racha', { modo: 'casual', n: 1 });
  await ate(() => F.comecou && H.comecou, 4000);
  H.joga(parado); F.joga(parado);
  await espera(300);
  F.para();
  const salaF = salaDe(F), token = F.sala.reconnectionToken;
  for (let k = 0; k < 400; k++) F.manda('c', { seq: F.seq + 1 + k, x: 0, y: 0 });
  await ate(() => F.saidas.length > 0, 3000);
  const rF = salaF.porConta.get('c5003');
  await espera(200);
  const volta = await recusa(new Aparelho(url, { nome: 'F2' }).volta(token));
  P.confere(F.saidas.includes(4002) && !rF.conectado && !rF.esperando && !!volta && H.saidas.length === 0 && !salaF.encerrado, 'a enxurrada (400 mensagens de uma vez): o Colyseus derruba (4002), a vaga NÃO fica guardada (o token não volta) e a partida do outro segue', { saidas: F.saidas, esperando: !!rF.esperando, volta });
  const G2 = new Aparelho(url, { nome: 'Gil' });
  await G2.entra('joinOrCreate', 'racha', { modo: 'casual', n: 2 });
  G2.manda('c', { seq: 1, x: 'x'.repeat(5000) });
  await ate(() => G2.saidas.length > 0, 3000);
  P.confere(G2.saidas.includes(1009), 'a mensagem maior que 4 KB derruba a conexão (1009) — o comando do jogo tem ~60 bytes', G2.saidas);
  await H.sai();
}
// ---------------------------------------------------------------- 6) a origem
{
  const pede = (o) => new Promise(ok => {
    const r = http.request({ host: '127.0.0.1', port: s.porta, method: o.method || 'POST', path: o.path, headers: o.headers || {} }, res => { res.resume(); ok({ st: res.statusCode, h: res.headers }); });
    r.on('error', e => ok({ st: 'erro ' + e.code })); r.end(o.corpo || '');
  });
  const ruim = 'https://site-malvado.example', boa = 'http://localhost:3000';
  const corpo = JSON.stringify({ modo: 'casual', n: 4, nome: 'X' });
  const mmRuim = await pede({ path: '/matchmake/joinOrCreate/racha', headers: { origin: ruim, 'content-type': 'application/json', 'content-length': Buffer.byteLength(corpo) }, corpo });
  const mmBoa = await pede({ path: '/matchmake/joinOrCreate/racha', headers: { origin: boa, 'content-type': 'application/json', 'content-length': Buffer.byteLength(corpo) }, corpo });
  const voltaRuim = await pede({ path: '/racha/volta', headers: { origin: ruim, authorization: 'Bearer ' + bil(5001, 'Ana') } });
  const wsRuim = await pede({ method: 'GET', path: '/' + 'abc' + '/' + sala.roomId + '?sessionId=x', headers: { origin: ruim, connection: 'Upgrade', upgrade: 'websocket', 'sec-websocket-version': '13', 'sec-websocket-key': Buffer.from('0123456789abcdef').toString('base64') } });
  P.confere(mmRuim.st === 403 && voltaRuim.st === 403 && mmBoa.st === 200 && mmBoa.h['access-control-allow-origin'] === boa, 'o matchmaking e a volta pela conta recusam um site de fora (403); o próprio site entra (e o CORS só devolve a origem dele)', { mmRuim: mmRuim.st, mmBoa: mmBoa.st, cors: mmBoa.h['access-control-allow-origin'], voltaRuim: voltaRuim.st });
  P.confere(wsRuim.st === 403, 'a conexão da sala vinda de um site de fora também é recusada (403)', wsRuim.st);
}
await A.sai(); await M.sai();
await s.fecha();

// ---------------------------------------------------------------- 7) o resultado (uma ranqueada curta: 3 s + 1 s de gol de ouro)
{
  const resultados = [];
  s = await sobe({ segredo: SEGREDO, sala: { esperaBotsMs: 0, fimMs: 500, r80: { seg: 3, prorrog: 1 }, plataforma: (txt, r) => resultados.push({ txt, r }) } });
  url = 'ws://127.0.0.1:' + s.porta;
  const R1 = new Aparelho(url, { nome: 'Rafa', bilhete: bil(6001, 'Rafa') }), R2 = new Aparelho(url, { nome: 'Sofia', bilhete: bil(6002, 'Sofia') });
  await Promise.all([R1.fila(1), R2.fila(1)]);                // (a ranqueada é pela fila)
  await ate(() => R1.comecou && R2.comecou, 4000);
  R1.joga(parado); R2.joga(parado);
  await espera(1200);
  R2.some();                                                 // (a Sofia fecha o jogo no meio para não perder)
  const acabou = await ate(() => R1.selo && resultados.length === 1, 15000);
  const meu = PL.confereSelo(R1.selo);
  P.confere(acabou && meu && meu.j === '006001' && meu.k === 1 && meu.h === 1 && meu.o === 1, 'o fim é do servidor: o selo de verdade passa no confereSelo da plataforma (ranqueada, apurado pelo motor, contra gente)', meu);
  const fabricado = assina('outro-segredo', { ...meu, p: [5, 0] });
  const [corpo, sig] = R1.selo.split('.');
  const mexido = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(corpo, 'base64url').toString()), p: [5, 0] })).toString('base64url') + '.' + sig;
  P.confere(PL.confereSelo(fabricado) === null && PL.confereSelo(mexido) === null && PL.confereSelo(R1.selo.slice(0, -2) + 'xx') === null, 'o selo fabricado no aparelho (outro segredo), o placar mexido num selo de verdade e a assinatura trocada: a plataforma recusa os três', null);
  const res = resultados[0], doc = res && confere(SEGREDO, res.txt), sofia = doc && doc.jogadores.find(j => j.id === '006002');
  P.confere(doc && doc.tipo === 'resultado' && doc.pid && sofia && sofia.conta === true && doc.placar.length === 2 && R2.selo === null, 'quem saiu no meio não segura o resultado: o servidor manda o resultado assinado direto para a plataforma, com a conta da Sofia (que não recebeu selo nenhum)', doc && { placar: doc.placar, vencedor: doc.vencedor, jogadores: doc.jogadores });
  await R1.sai();
  await espera(200);
  await s.fecha();
}
process.exit(P.fim());
