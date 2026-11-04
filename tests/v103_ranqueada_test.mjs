// RACHA v103 · a ranqueada contra os bots NO SERVIDOR vale pontos (com o teto do dia), na plataforma de verdade (app/api
// compilada em cima do SQLite: tests/plataforma/servidor.mjs) e no servidor das salas (server/turma.js, na memória):
//   1. a fila: sozinho, o JOGAR CONTRA BOTS AGORA (fila_bots) monta a ranqueada no servidor, com os bots completando; e quem
//      espera 20 s sem ninguém também vai para a ranqueada com os bots no servidor (não recebe mais o fila_nada);
//   2. a plataforma: o resultado online ranqueado contra os bots (o selo k:1, h:1, sem o:1) sobe a patente como contra os bots
//      (+ pontos), e o teto do dia corta depois de 250; contra gente (o:1) continua sem teto; a partida no aparelho continua
//      sem valer na conta (v100); o ranking da temporada (gols) continua só com gente (o:1).
//   node tests/v103_ranqueada_test.mjs
import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let ok = 0, falhou = 0;
const confere = (c, oque, det) => { if (c) { ok++; console.log('  OK      ' + oque); } else { falhou++; console.log('  FALHOU  ' + oque + (det !== undefined ? '  ·  ' + JSON.stringify(det).slice(0, 400) : '')); } };

/* ---------------------------------------------------------------- 1) a fila no servidor das salas (na memória) */
console.log('\n1) a fila: a ranqueada contra os bots no servidor');
{
  const { Turma } = require(path.join(raiz, 'server', 'turma.js'));
  const EventEmitter = require('events');
  class WsFalso extends EventEmitter {
    constructor() { super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; }
    send(t) { if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
    close() { if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
    terminate() { this.close(); } ping() {}
  }
  let relogio = 1.8e12;
  const t = new Turma({ log: () => {}, agora: () => relogio, p2p: false, exigeConta: false });
  const cliente = (nome) => {
    const ws = new WsFalso();
    const k = { ws, c: t.conecta(ws, { headers: {}, socket: { remoteAddress: '10.0.0.' + Math.floor(Math.random() * 250) } }) };
    k.manda = (m) => ws.emit('message', JSON.stringify(m));
    k.ult = (tipo) => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === tipo) return ws.caixa[i]; return null; };
    k.manda({ type: 'hello', name: nome, v93: 1 });
    return k;
  };
  const A = cliente('Ana');
  A.manda({ type: 'fila', n: 2, pts: 100 });
  confere(A.ult('fila') && A.ult('fila').on === true, 'a Ana entra na fila do 2v2');
  A.manda({ type: 'fila_bots' });
  const st = A.ult('start'), r = t.salaDe(A.c);
  confere(st && st.room.ranked && r && r.ranked && r.bots && r.partida, 'JOGAR CONTRA BOTS AGORA (fila_bots): a ranqueada começa no servidor', st && st.room);
  confere(r && r.partida && r.partida.jog.filter(q => q.bot).length === 3 && r.partida.jog.filter(q => q.netId).length === 1, 'os bots completam o 2v2 (a Ana + 3 bots), no motor das salas', r && r.partida && r.partida.jog.map(q => q.netId || q.bot));
  if (r && r.partida) r.partida.desligar();
  const B = cliente('Beto');
  B.manda({ type: 'fila', n: 1, pts: 50 });
  relogio += 21000; t.filaTenta();
  const stB = B.ult('start'), rB = t.salaDe(B.c);
  confere(!B.ult('fila_nada') && stB && stB.room.ranked && rB && rB.partida && rB.partida.jog.some(q => q.bot), 'ninguém em 20 s: o Beto vai para a ranqueada com os bots no servidor (sem o fila_nada)', [!!B.ult('fila_nada'), stB && stB.room.ranked]);
  if (rB && rB.partida) rB.partida.desligar();
  const C = cliente('Caio');
  C.manda({ type: 'fila_bots' });
  confere(C.ult('fila') && C.ult('fila').on === false && !C.ult('start'), 'fila_bots fora da fila não faz nada (só fecha a busca)');
  try { t.fecha(); } catch (_) {}
}

/* ---------------------------------------------------------------- 2) a plataforma de verdade */
console.log('\n2) a plataforma: os pontos da ranqueada contra os bots no servidor');
const segredo = 'segredo-descartavel-v103';
const filho = fork(path.join(raiz, 'tests/plataforma/servidor.mjs'), ['--porta', '0', '--teste', '--segredo', segredo],
  { silent: true, env: { ...process.env, RACHA_CADASTRO: 'aberto', RACHA_OWNER_PASSWORD: 'Dono-Temporario-v103' } });
let log = '';
filho.stdout.on('data', d => { log += d; }); filho.stderr.on('data', d => { log += d; });
const pronto = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Plataforma não iniciou: ' + log)), 60000);
  filho.on('message', m => { if (m.pronto) { clearTimeout(timer); resolve(m); } });
  filho.once('exit', code => { clearTimeout(timer); reject(new Error('Plataforma saiu: ' + code + ' ' + log)); });
});
const base = `http://127.0.0.1:${pronto.porta}`;
let token = '';
async function api(nome, input, query = false) {
  const corpo = JSON.stringify({ 0: input === undefined || input === null ? { json: null, meta: { values: ['undefined'], v: 1 } } : { json: input } });   // (v104: sem entrada, o undefined do superjson — como o jogo manda)
  const url = base + '/api/trpc/' + nome + '?batch=1' + (query ? '&input=' + encodeURIComponent(corpo) : '');
  const res = await fetch(url, { method: query ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: query ? undefined : corpo });
  const item = (await res.json())[0];
  if (item.error) { const e = new Error(item.error.json.message); e.code = item.error.json.data.code; throw e; }
  return item.result.data.json;
}
try {
  const { assina } = await import(path.join(raiz, 'tests/saida/plataforma.mjs'));
  const conta = await api('auth.registrar', { username: 'rankeadoa', nomeExibicao: 'Ranqueado A', senha: 'segredo1234', confirmacaoSenha: 'segredo1234', aceiteTermos: true });
  token = conta.token;
  const pub = conta.conta.idPublico;
  let seq = 0;
  const partidaOnline = async (placar, extra) => {
    const id = randomUUID(), agora = Date.now();
    const ini = await api('jogo.iniciarPartida', { matchId: id, modo: 'futebol', online: true, ranqueada: true, tamanho: 1 });
    const selo = assina(segredo, Object.assign({ s: 'SALA' + (++seq), r: seq, j: pub, l: 0, p: placar, m: 'futebol', d: 180, t: agora, e: agora + 60000, h: 1, k: 1, n: 1, pid: 'pv103' + seq, gl: placar[0], as: 0, v: 0 }, extra || {}));
    return api('jogo.encerrarPartida', { matchId: id, matchToken: ini.matchToken, placarNosso: placar[0], placarDeles: placar[1], gols: placar[0], assistencias: 0, duracaoSeg: 180, online: true, selo });
  };
  const p0 = await api('perfil.minhaPatente', null, true);
  const r1 = await partidaOnline([3, 0], {});                       // (o:0 — contra os bots que o servidor pôs)
  const p1 = await api('perfil.minhaPatente', null, true);
  confere(r1.ok && r1.rq && r1.rq.delta > 0 && p1.pts === p0.pts + r1.rq.delta, 'a ranqueada online contra os bots (selo k:1 sem o:1) sobe a patente: +' + (r1.rq && r1.rq.delta), [p0.pts, p1.pts, r1.rq]);
  confere(r1.xpConcedido > 0, 'e rende XP (a partida foi do servidor)', r1.xpConcedido);
  let ultimo = r1, limitou = false, total = r1.rq ? r1.rq.delta : 0;
  for (let i = 0; i < 12 && !limitou; i++) { ultimo = await partidaOnline([3, 0], {}); if (ultimo.rq) { total += ultimo.rq.delta; limitou = ultimo.rq.limitado; } }
  confere(limitou && total <= 250, 'o teto do dia contra os bots: depois de 250 pontos ganhos hoje, para de subir (' + total + ')', { total, ultimo: ultimo.rq });
  const rg = await partidaOnline([3, 1], { o: 1 });                 // (contra gente: sem o teto dos bots)
  confere(rg.rq && rg.rq.delta > 0 && !rg.rq.limitado, 'contra gente (o:1) a patente continua subindo, sem o teto dos bots', rg.rq);
  const idL = randomUUID();
  const iniL = await api('jogo.iniciarPartida', { matchId: idL, modo: 'futebol', online: false, ranqueada: true, nivelBots: 'lenda' });
  const loc = await api('jogo.encerrarPartida', { matchId: idL, matchToken: iniL.matchToken, placarNosso: 3, placarDeles: 0, gols: 3, assistencias: 0, duracaoSeg: 180 });
  confere(loc.rq === null && loc.xpConcedido === 0, 'a partida no aparelho continua sem valer na conta (v100)', loc);
  const rk = await api('ranking.top', { categoria: 'pontos' }, true);
  confere(rk.lista.some(x => x.idPublico === pub), 'o RANKING de PONTOS RANQUEADOS mostra a conta', rk.lista.map(x => [x.idPublico, x.valor]));
  const rkg = await api('ranking.top', { categoria: 'gols' }, true);
  const linhaG = rkg.lista.find(x => x.idPublico === pub);
  confere(linhaG && linhaG.valor === 3, 'o ranking de GOLS conta só a partida contra gente (os 3 gols do 3 × 1), não as contra os bots', linhaG);
} catch (e) {
  confere(false, 'o teste da plataforma rodou até o fim', String(e && e.stack || e));
} finally {
  filho.kill('SIGTERM');
}
console.log('\nv103 · a ranqueada contra os bots no servidor: ' + ok + '/' + (ok + falhou) + ' verificações ok');
process.exit(falhou ? 1 : 0);
