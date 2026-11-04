'use strict';
/* RACHA v94 · o motor das salas na turma (server/turma.js): o padrão, a troca pelo admin na versão de testes, o perfil
   resolvido que vai para os aparelhos e a rodada no motor de antes quando alguém em campo está com o jogo antigo.
   Roda: node tests/v94_turma_test.js   (na memória: as conexões são falsas e o motor das salas não liga o relógio) */
const path = require('path');
const EventEmitter = require('events');
const RAIZ = path.resolve(__dirname, '..');
if (process.env.RACHA_CONTAGEM_MS == null) process.env.RACHA_CONTAGEM_MS = '0';
if (process.env.RACHA_REPLAY == null) process.env.RACHA_REPLAY = '0';
const { Turma } = require(path.join(RAIZ, 'server', 'turma'));
const M = require(path.join(RAIZ, 'server', 'partida', 'motor'));

let ok = 0, falhou = 0;
function confira(cond, txt, extra) {
  if (cond) { ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU ' + txt + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 300) : '')); }
}
class WsFalso extends EventEmitter {
  constructor() { super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; }
  send(t) { if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
  close() { if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate() { this.close(); }
  ping() {}
}
let relogio = 1.7e12;
function entra(t, nome, extra) {
  const ws = new WsFalso();
  const c = t.conecta(ws, { headers: {}, socket: { remoteAddress: '10.1.0.' + Math.floor(Math.random() * 250) } });
  const k = { ws, c, manda: m => ws.emit('message', JSON.stringify(m)),
    ult: tipo => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === tipo) return ws.caixa[i]; return null; },
    todas: tipo => ws.caixa.filter(x => x.type === tipo) };
  k.manda(Object.assign({ type: 'hello', name: nome, skin: 'T.AAAA' + nome.toLowerCase().padEnd(4, 'x'), flag: 'BR' }, extra || {}));
  k.id = k.ult('hello').id;
  return k;
}
const nova = o => new Turma(Object.assign({ log: () => {}, agora: () => relogio, p2p: false, exigeConta: false }, o || {}));
function para(t) { for (const r of t.salas.values()) if (r.partida) { r.partida.desligar(); } }

console.log('1) o padrão: o motor de antes (a versão oficial não muda sozinha)');
{
  const t = nova();
  const A = entra(t, 'Ana', { v93: 1, v94: 1 });
  A.manda({ type: 'create', n: 1, map: 4, jogo: 'futebol', tempo: 0, bots: true, pub: false });
  const r = t.salaDe(A.c);
  entra(t, 'Beto', { v93: 1, v94: 1 }).manda({ type: 'join', code: r.code, slot: 1 });   // (v103: sem bots, o outro time precisa de alguém)
  confira(t.motorPadrao === 'v93' && t.motorDe(r) === 'v93', 'sem RACHA_MOTOR_JOGO: o motor de antes', [t.motorPadrao]);
  A.manda({ type: 'start' });
  const st = A.ult('start');
  confira(st && st.room.motor === 'v93' && st.room.motorRodada === 'v93' && st.room.fisica94 === null, 'o começo avisa o motor da rodada (v93, sem o perfil novo)', st && st.room.motor);
  confira(r.partida && r.partida.motor === 'v93' && !r.partida.v94, 'a partida roda no motor de antes');
  para(t);
}

console.log('2) o servidor com o motor próprio (motor: v94): a rodada nele e o perfil resolvido no começo');
{
  const t = nova({ motor: 'v94' });
  const A = entra(t, 'Ana', { v93: 1, v94: 1 }), B = entra(t, 'Beto', { v93: 1, v94: 1 });
  A.manda({ type: 'create', n: 1, map: 4, jogo: 'futebol', tempo: 0, bots: false, pub: false });
  const r = t.salaDe(A.c);
  B.manda({ type: 'join', code: r.code });
  confira(r.members.length === 2, 'Beto entrou na sala', r.members.length);
  B.manda({ type: 'seat', slot: 1 });
  A.manda({ type: 'start' });
  const st = A.ult('start');
  confira(st && st.room.motor === 'v94' && st.room.motorRodada === 'v94', 'a rodada vai no motor próprio', st && [st.room.motor, st.room.motorRodada]);
  const R = st && st.room.fisica94, R0 = M.resolve(M.PADRAO);
  confira(R && JSON.stringify(R) === JSON.stringify(R0), 'o começo leva o perfil RESOLVIDO (o mesmo objeto que o servidor usa)');
  confira(r.partida && r.partida.v94 && r.partida.motor === 'v94', 'a partida roda no motor próprio');
  r.partida.rodar(4);
  const q = A.todas('snapshot').pop() || B.todas('snapshot').pop();
  confira(q && typeof q.data.m94 === 'string' && q.data.m94.split(',').length > 13, 'os quadros levam o estado do motor (m94)');
  para(t);
}

console.log('3) alguém em campo com o jogo antigo (sem v94 no hello): a rodada inteira vai no motor de antes, e a sala avisa');
{
  const t = nova({ motor: 'v94' });
  const A = entra(t, 'Ana', { v93: 1, v94: 1 }), V = entra(t, 'Velho', { v93: 1 });
  A.manda({ type: 'create', n: 1, map: 4, jogo: 'futebol', tempo: 0, bots: false, pub: false });
  const r = t.salaDe(A.c);
  V.manda({ type: 'join', code: r.code }); V.manda({ type: 'seat', slot: 1 });
  A.manda({ type: 'start' });
  const st = A.ult('start');
  confira(st && st.room.motor === 'v94' && st.room.motorRodada === 'v93', 'a sala é do motor próprio, a rodada vai no de antes', st && [st.room.motor, st.room.motorRodada]);
  const aviso = A.todas('say').find(s => s.sys && /motor de antes/.test(s.text || ''));
  confira(!!aviso && /Velho/.test(aviso.text), 'a sala diz quem está com a versão antiga', aviso && aviso.text);
  confira(r.partida && !r.partida.v94, 'a partida roda no motor de antes para todos');
  para(t);
}

console.log('4) a versão de testes: o admin troca o motor e manda o perfil do motor novo (cortado nas faixas)');
{
  const t = nova({ motor: 'v94', experimental: true });
  const A = entra(t, 'Ana', { v93: 1, v94: 1 });
  A.manda({ type: 'create', n: 1, map: 4, jogo: 'futebol', tempo: 0, bots: true, pub: false });
  const r = t.salaDe(A.c);
  entra(t, 'Beto', { v93: 1, v94: 1 }).manda({ type: 'join', code: r.code, slot: 1 });   // (v103: sem bots, o outro time precisa de alguém)
  A.manda({ type: 'config', motor: 'v93' });
  confira(t.motorDe(r) === 'v93', 'o admin pôs o motor de antes');
  A.manda({ type: 'config', motor: 'v94', fisica94: { vMax: 3.2, vChute: 99 } });
  confira(t.motorDe(r) === 'v94' && r.fisica94 && r.fisica94.vMax === 3.2 && r.fisica94.vChute === M.LIMITES.vChute[1], 'o perfil novo vale, com o exagero cortado no limite', r.fisica94 && [r.fisica94.vMax, r.fisica94.vChute]);
  A.manda({ type: 'start' });
  const st = A.ult('start');
  confira(st && st.room.fisica94 && st.room.fisica94.vMax === 3.2, 'o começo leva o perfil do admin, resolvido', st && st.room.fisica94 && st.room.fisica94.vMax);
  confira(r.partida && r.partida.R94 && r.partida.R94.vMax === 3.2, 'a partida usa o perfil do admin');
  para(t);
  const t2 = nova({ motor: 'v94' });                                // (fora da versão de testes, o admin não mexe no motor)
  const B = entra(t2, 'Bia', { v93: 1, v94: 1 });
  B.manda({ type: 'create', n: 1, map: 4, jogo: 'futebol', tempo: 0, bots: true, pub: false });
  const r2 = t2.salaDe(B.c);
  B.manda({ type: 'config', motor: 'v93', fisica94: { vMax: 3.2 } });
  confira(t2.motorDe(r2) === 'v94' && !r2.fisica94, 'na versão oficial o config não troca o motor nem o perfil');
}

console.log('\n' + ok + ' verificações ok, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
