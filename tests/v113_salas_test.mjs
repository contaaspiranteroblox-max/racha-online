// RACHA v113 · as salas personalizadas com 10 minutos e a saída do Time Vermelho no começo (sem navegador).
//   node tests/v113_salas_test.mjs
// Confere: na sala personalizada a partida começa sempre com a saída do Time Vermelho (o time 0, o da esquerda), não importa a
// hora; depois do gol sai quem levou o gol; a ranqueada continua sorteando; o servidor aceita os 10 minutos na criação e nas
// regras da sala (e o 10 vira 10:00 de jogo no motor); o jogo tem os 10 minutos na lista.
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { PartidaSala } = require(path.join(RAIZ, 'server/partida/sala.js'));
const { Turma } = require(path.join(RAIZ, 'server/turma.js'));

let ok = 0, falhas = 0;
function confere(nome, cond, info) {
  if (cond) { ok++; console.log('  ok  ', nome); }
  else { falhas++; console.log('  FALHOU', nome, info === undefined ? '' : ' · ' + JSON.stringify(info)); }
}

// ---------------------------------------------------------------- 1) o motor da sala
function sala(o) {
  return new PartidaSala(Object.assign({ n: 2, jogo: 'futebol', map: 0, tempo: 0, regra: '', ranked: false,
    jogadores: [{ netId: 'a', nome: 'A' }, { netId: 'b', nome: 'B' }, { netId: 'c', nome: 'C' }, { netId: 'd', nome: 'D' }],
    log: () => {}, suspeito: () => {}, onSnapshot: () => {}, onGol: () => {}, onAviso: () => {}, onFim: () => {} }, o));
}
const ate = (p, cond) => { for (let i = 0; i < 2000 && !cond(); i++) p.pos(); return cond(); };
for (const motor of ['v93', 'v94']) {
  const saidas = [];
  for (const hora of [1.7e12, 1.7e12 + 1, 1.7e12 + 2, 1.7e12 + 3]) {
    const p = sala({ agora: () => hora, motor });
    const q = p.quadro();
    saidas.push(p.saidaTime, q.kickoff);
  }
  confere(`sala personalizada (motor ${motor}): começa sempre com a saída do Time Vermelho, a qualquer hora`, saidas.every(x => x === 0), saidas);
}
{
  const p = sala({ agora: () => 1.7e12 + 1 });
  const bate = p.jog.find(q => q.time === 0 && q.k === 0), G = p.G;
  confere('quem bate a saída é do Time Vermelho, do lado esquerdo, colado na bola', bate && bate.x < G.CX && Math.abs(bate.y - G.CY) < 1 && Math.hypot(bate.x - p.B.x, bate.y - p.B.y) <= bate.r + p.B.r + 12, bate && { x: bate.x, cx: G.CX, d: Math.hypot(bate.x - p.B.x, bate.y - p.B.y) });
  p.estado = 'jogo';
  p.gol(1);                                         // (o gol da direita: ponto do Time Vermelho)
  confere('o Vermelho fez o gol: a saída é da Equipe Azul (quem levou)', ate(p, () => p.estado === 'saida') && p.saidaTime === 1 && p.quadro().kickoff === 1, { estado: p.estado, saida: p.saidaTime });
  p.estado = 'jogo';
  p.gol(-1);                                        // (o gol da esquerda: ponto da Equipe Azul)
  confere('a Azul fez o gol: a saída volta para o Vermelho (quem levou)', ate(p, () => p.estado === 'saida') && p.saidaTime === 0, { estado: p.estado, saida: p.saidaTime });
  p.estado = 'jogo';
  p.gol(-1);
  confere('a Azul faz de novo: a saída continua com quem levou (o Vermelho)', ate(p, () => p.estado === 'saida') && p.saidaTime === 0, { estado: p.estado, saida: p.saidaTime });
}
{
  const s = [1.7e12, 1.7e12 + 1].map(h => sala({ agora: () => h, ranked: true }).saidaTime);
  confere('a ranqueada continua sorteando a primeira saída (pela hora)', s[0] === 0 && s[1] === 1, s);
}
{
  const p = sala({ agora: () => 1.7e12, tempo: 10 });
  confere('a sala de 10 minutos: 10:00 de jogo no relógio do motor', p.tempoLim === 600, p.tempoLim);
}

// ---------------------------------------------------------------- 2) o servidor das salas (a turma)
class WsFalso extends EventEmitter {
  constructor() { super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; }
  send(t) { if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
  close() { if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate() { this.close(); }
  ping() {}
}
const t = new Turma({ log: () => {}, agora: () => 1.7e12, p2p: false, exigeConta: false });
function entra(nome) {
  const ws = new WsFalso();
  const c = t.conecta(ws, { headers: {}, socket: { remoteAddress: '10.0.0.' + (1 + Math.floor(Math.random() * 250)) } });
  const k = { ws, c, manda: m => ws.emit('message', JSON.stringify(m)) };
  k.manda({ type: 'hello', name: nome, skin: 'T.AAAA' + nome.toLowerCase().padEnd(4, 'x'), flag: 'BR' });
  return k;
}
{
  const A = entra('Ana');
  A.manda({ type: 'create', n: 1, map: 0, jogo: 'futebol', tempo: 10, bots: false, pub: true, name: 'Racha de 10' });
  const r = t.salaDe(A.c);
  confere('o servidor cria a sala personalizada de 10 minutos', r && r.tempo === 10, r && r.tempo);
  A.manda({ type: 'config', tempo: 3 });
  confere('nas regras da sala: dá para trocar para 3…', r.tempo === 3, r.tempo);
  A.manda({ type: 'config', tempo: 10 });
  confere('…e voltar para 10 minutos', r.tempo === 10, r.tempo);
  A.manda({ type: 'config', tempo: 7 });
  confere('um tempo que não existe (7) não muda a regra', r.tempo === 10, r.tempo);
  const B = entra('Bia');
  B.manda({ type: 'create', n: 1, map: 0, jogo: 'futebol', tempo: 15, bots: false, pub: true, name: 'Racha de 15' });
  const r2 = t.salaDe(B.c);
  confere('criar com um tempo que não existe (15): a sala fica sem tempo (1º a 3)', r2 && r2.tempo === 0, r2 && r2.tempo);
}
try { t.fecha && t.fecha(); } catch (_) {}

// ---------------------------------------------------------------- 3) o jogo (a página do build)
{
  const html = fs.readFileSync(path.join(RAIZ, 'app/public/game/racha.html'), 'utf8');
  confere('o jogo tem os 10 minutos na lista do TEMPO (a criação e as regras da sala)', /const SL_TEMPOS = \[0, 2, 3, 5, 10\]/.test(html));
  confere('a sala neste aparelho leva o motor novo (a saída do Vermelho)', html.includes("this.saidaTime = this.ranked ? this.agora() % 2 : 0"));
}
console.log(`v113 · as salas personalizadas com 10 minutos e a saída do Vermelho: ${ok} ok, ${falhas} falharam`);
process.exit(falhas ? 1 : 0);
