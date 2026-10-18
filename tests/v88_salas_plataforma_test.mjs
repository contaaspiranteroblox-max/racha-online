// RACHA · v88 — o SOCIAL AO VIVO com a plataforma de verdade: a plataforma de teste (tests/plataforma: as rotas de app/api em
// cima de um SQLite) com o servidor das salas montado no mesmo endereço, três contas e WebSockets de verdade (a sessão do
// site no cookie). Confere: as relações vindo do banco já no aperto de mão, o aviso na hora (pedido de amizade), a amizade
// aceita e o bloqueio refletindo nos WebSockets na hora, o convite para a sala, o chat dos amigos, a denúncia de uma
// mensagem da sala indo para a tabela do RACHA CONTROL, assistir uma partida pela lista, e o resultado online com quem
// jogou junto e o melhor da partida — a missão "jogar com um amigo" e o melhor da partida na conta.
//   node tests/v88_salas_plataforma_test.mjs     (~40 s: a partida espera o tempo mínimo de verdade)
import { fork } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, falhou = 0;
function confere(cond, txt, extra) {
  if (cond) { ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra).slice(0, 400) : '')); }
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const banco = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'racha88s-')), 'plataforma.sqlite');

function sobe() {
  return new Promise((res, rej) => {
    const p = fork(path.join(RAIZ, 'tests', 'plataforma', 'servidor.mjs'), ['--porta', '0', '--teste', '--banco', banco, '--sem-compilar'], { silent: true, env: { ...process.env, RACHA_CADASTRO: 'aberto' } });   // v88.1: o cadastro aberto (as contas pelo jogo)
    let log = '';
    p.stdout.on('data', (d) => { log += d; }); p.stderr.on('data', (d) => { log += d; });
    p.on('message', (m) => { if (m && m.pronto) res({ p, porta: m.porta, log: () => log }); });
    setTimeout(() => rej(new Error('a plataforma de teste não subiu: ' + log)), 30000);
  });
}
let BASE = '', ORIGEM = '';
async function api(proc, input, token, query) {
  const corpo = JSON.stringify({ 0: { json: input === undefined ? null : input } });
  const url = BASE + '/api/trpc/' + proc + '?batch=1' + (query ? '&input=' + encodeURIComponent(corpo) : '');
  const r = await fetch(url, { method: query ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: query ? undefined : corpo });
  const l = JSON.parse(await r.text());
  const um = l[0];
  if (um.error) { const e = new Error(um.error.json.message); e.code = um.error.json.data.code; throw e; }
  return um.result.data.json;
}
const q = (proc, input, token) => api(proc, input, token, true);
const m = (proc, input, token) => api(proc, input, token, false);
async function sqlT(sql, params) {
  const r = await fetch(BASE + '/__teste/sql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql, params }) });
  return (await r.json()).linhas;
}
async function conta(nome) {
  const r = await m('auth.registrar', { username: nome, nomeExibicao: nome, senha: 'senha1234', confirmacaoSenha: 'senha1234', email: nome + '@x.com', aceiteTermos: true });
  return { token: r.token, pub: r.conta.idPublico, nome, id: 'c' + Number(r.conta.idPublico) };
}
function socket(token) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(BASE.replace('http', 'ws') + '/', { headers: { Origin: ORIGEM, ...(token ? { Cookie: 'racha_sessao=' + encodeURIComponent(token) } : {}) } });
    const k = {
      ws, caixa: [], manda: (x) => ws.send(JSON.stringify(x)),
      espera: async (tipo, cond, ms) => { const t0 = Date.now(); for (;;) { const x = k.caixa.find((y) => y.type === tipo && (!cond || cond(y))); if (x) return x; if (Date.now() - t0 > (ms || 4000)) return null; await espera(25); } },
      ult: (tipo, cond) => { for (let i = k.caixa.length - 1; i >= 0; i--) if (k.caixa[i].type === tipo && (!cond || cond(k.caixa[i]))) return k.caixa[i]; return null; },
    };
    ws.onmessage = (e) => k.caixa.push(JSON.parse(e.data)); ws.onopen = () => res(k); ws.onerror = () => rej(new Error('não conectou'));
  });
}
async function entra(c) { const k = await socket(c.token); k.manda({ type: 'hello', name: c.nome, skin: 'T.AAAA1111' }); k.hello = await k.espera('hello'); return k; }

async function principal() {
  const S = await sobe();
  BASE = 'http://127.0.0.1:' + S.porta; ORIGEM = BASE;
  try {
    console.log('1) três contas, duas delas amigas (pela API), e os WebSockets com a sessão do site');
    const A = await conta('rafinha10'), B = await conta('bruninha7'), C = await conta('caiozin99');
    await m('amigos.enviarPedido', { termo: B.pub }, A.token);
    const pB = await q('amigos.pedidos', undefined, B.token);
    await m('amigos.responderPedido', { pedidoId: pB.recebidos[0].pedidoId, aceitar: true }, B.token);
    const WA = await entra(A), WB = await entra(B), WC = await entra(C);
    confere(WA.hello && WA.hello.conta && WB.hello && WB.hello.conta && WC.hello && WC.hello.conta, 'as três contas entram nas salas pela sessão do site (sem bilhete)');
    const lb = await WB.espera('amigos_status', (x) => x.lista.some((y) => y.p === A.pub));
    confere(lb && lb.lista.find((y) => y.p === A.pub).st === 'online', 'as relações vêm do banco já na entrada: a Bruna vê o Rafa online', lb);
    confere(await WA.espera('amigo_status', (x) => x.p === B.pub && x.st === 'online'), 'e o Rafa recebe na hora que a Bruna entrou');
    confere(!WC.caixa.some((x) => x.type === 'amigo_status'), 'o Caio (que não é amigo de ninguém) não recebe status de ninguém');

    console.log('\n2) o aviso na hora e a amizade/bloqueio refletindo nos WebSockets');
    await m('amigos.enviarPedido', { termo: A.pub }, C.token);
    const av = await WA.espera('conta_aviso', (x) => x.categoria === 'amigos');
    confere(av && /pedido/i.test(av.titulo || ''), 'o Caio pediu amizade: o aviso chega na hora pelo WebSocket do Rafa (conta_aviso)', av);
    const pA = await q('amigos.pedidos', undefined, A.token);
    await m('amigos.responderPedido', { pedidoId: pA.recebidos[0].pedidoId, aceitar: true }, A.token);
    const viu = await Promise.race([
      WC.espera('amigo_status', (x) => x.p === A.pub && x.st === 'online'),
      WC.espera('amigos_status', (x) => x.lista.some((y) => y.p === A.pub && y.st === 'online')),
    ]);
    confere(!!viu && (await WA.espera('amigo_status', (x) => x.p === C.pub && x.st === 'online')), 'o Rafa aceitou: os dois passam a se ver online na hora (sem reconectar)', viu);
    await m('amigos.bloquear', { termo: C.pub }, A.token);
    confere(await WC.espera('amigo_status', (x) => x.p === A.pub && x.st === 'offline'), 'o Rafa bloqueou o Caio: para o Caio, o Rafa fica offline na hora');
    WC.manda({ type: 'dm', para: A.pub, texto: 'por que me bloqueou?' });
    const ed = await WC.espera('dm_erro');
    confere(ed && ed.reason === 'amigo', 'e o Caio não consegue mandar mensagem para o Rafa', ed);

    console.log('\n3) o convite para a sala, o chat dos amigos e o chat da sala');
    WA.manda({ type: 'create', n: 1, map: 4, jogo: 'futebol', tempo: 0, bots: false, pub: true, name: 'Racha do Rafa' });
    const sala = (await WA.espera('room')).room;
    WA.manda({ type: 'convite', para: B.pub, tipo: 'sala' });
    const cv = await WB.espera('convite_recebido');
    confere(cv && cv.de.p === A.pub && cv.sala.code === sala.code, 'a Bruna recebe o convite do Rafa na hora', cv);
    WB.manda({ type: 'convite_resposta', id: cv.id, aceita: true });
    const rr = await WA.espera('room', (x) => x.room.members.some((y) => y.id === B.id));
    confere(rr && rr.room.roster.includes(B.id), 'ela aceitou e já entrou no time que faltava', rr && rr.room.roster);
    WA.manda({ type: 'dm', para: B.pub, texto: 'vai ser 1 contra 1, prepara' });
    const dmB = await WB.espera('dm');
    confere(dmB && dmB.texto === 'vai ser 1 contra 1, prepara' && dmB.de === A.pub, 'o chat dos amigos: a mensagem do Rafa chega à Bruna', dmB);
    WB.manda({ type: 'say', text: 'vou te amassar hoje' });
    const say = await WA.espera('say', (x) => x.text === 'vou te amassar hoje');
    confere(!!say && !!say.mid, 'o chat da sala chega (com o número para denunciar)', say);

    console.log('\n4) a denúncia de uma mensagem do chat vai para o banco (a fila do RACHA CONTROL)');
    await sqlT("UPDATE usuarios SET criado_em = criado_em - 3600000 WHERE username IN ('rafinha10','bruninha7','caiozin99')");
    WA.manda({ type: 'report', mid: say.mid, motivo: 'toxico' });
    await WA.espera('denuncia_ok', (x) => x.mid === say.mid);
    let den = [];
    for (let i = 0; i < 40 && !den.length; i++) { await espera(50); den = await sqlT("SELECT motivo, contexto, autor_id, alvo_id FROM denuncias"); }
    const d0 = den[0], ctx = d0 && (typeof d0.contexto === 'string' ? JSON.parse(d0.contexto) : d0.contexto);
    confere(d0 && d0.motivo === 'toxico' && ctx && ctx.origem === 'chat' && ctx.canal === 'sala' && ctx.sala === sala.code && ctx.mid === say.mid, 'a denúncia está na tabela denuncias, com o motivo, a origem (chat da sala), a sala e a mensagem', d0);
    WA.manda({ type: 'report', mid: say.mid, motivo: 'toxico' });
    await espera(400);
    confere((await sqlT('SELECT COUNT(*) AS n FROM denuncias'))[0].n === 1, 'a mesma denúncia não entra duas vezes');

    console.log('\n5) a partida online (no servidor), alguém assistindo pela lista, e o resultado com quem jogou junto');
    const ini = {};
    for (const x of [A, B]) {
      const id = crypto.randomUUID();
      const r = await m('jogo.iniciarPartida', { matchId: id, modo: 'futebol', mapa: 'estadio', ranqueada: false, online: true, tamanho: 1 }, x.token);
      ini[x.pub] = { id, token: r.matchToken };
    }
    WA.manda({ type: 'start' });
    confere(await WB.espera('start'), 'começou (a partida roda no servidor)');
    await espera(700);
    const lista = await WC.espera('rooms', (x) => x.list.some((y) => y.code === sala.code && y.state === 'playing'));
    const item = lista && lista.list.find((y) => y.code === sala.code);
    confere(item && item.assistir === true && Array.isArray(item.placar), 'quem está de fora vê a sala em jogo na lista, com o placar e "assistir"', item);
    WC.manda({ type: 'join', code: sala.code, spectate: true });
    const stC = await WC.espera('start');
    const snC = await WC.espera('snapshot', null, 3000);
    confere(stC && snC && Array.isArray(snC.data.players), 'o Caio entra para ASSISTIR: recebe a partida e os quadros do servidor', [!!stC, snC && snC.data.score]);
    console.log('  (esperando o tempo mínimo de partida de verdade no servidor)');
    await espera(7000);
    for (let g = 0; g < 3; g++) { WA.manda({ type: '__teste_gol', time: 0 }); await espera(2300); }
    const rA = await WA.espera('result', null, 8000), rB = await WB.espera('result', null, 3000);
    confere(rA && rA.valida && rA.mvp === true && rA.melhor && rA.melhor.id === A.id && rB && rB.valida && !rB.mvp, 'o servidor encerrou 3 × 0: o resultado vale e o Rafa é o melhor da partida', [rA, rB && rB.melhor]);
    const fimA = await m('jogo.encerrarPartida', { matchId: ini[A.pub].id, matchToken: ini[A.pub].token, placarNosso: 3, placarDeles: 0, gols: 3, assistencias: 0, duracaoSeg: 60, online: true, valida: true, selo: rA.selo }, A.token);
    confere(fimA.ok && !fimA.duplicada && fimA.mvp === true && fimA.comAmigo === true, 'a conta do Rafa: a partida online vale, com o melhor da partida e "jogou com um amigo" (do selo, não do aparelho)', fimA);
    confere(Array.isArray(fimA.missoesCompletas) && fimA.missoesCompletas.some((x) => x.id === 'd_amigo1'), 'e a missão "jogar com um amigo" completou', fimA.missoesCompletas);
    const fimB = await m('jogo.encerrarPartida', { matchId: ini[B.pub].id, matchToken: ini[B.pub].token, placarNosso: 0, placarDeles: 3, gols: 0, assistencias: 0, duracaoSeg: 60, online: true, valida: true, selo: rB.selo }, B.token);
    confere(fimB.ok && fimB.mvp === false && fimB.comAmigo === true, 'a conta da Bruna: derrota, sem o melhor da partida, mas com o amigo', fimB);
    const jg = await sqlT("SELECT jogadores, mvp FROM partidas WHERE id = ?", [ini[A.pub].id]);
    const jog = jg[0] && (typeof jg[0].jogadores === 'string' ? JSON.parse(jg[0].jogadores) : jg[0].jogadores);
    confere(Array.isArray(jog) && jog.includes(B.pub) && Number(jg[0].mvp) === 1, 'no banco: a partida guarda quem jogou junto e o melhor da partida', jg[0]);
    const est = await q('estat.resumo', { temporada: 'tudo', modo: 'online' }, A.token);
    confere(est && est.partidas >= 1 && est.mvp >= 1, 'as estatísticas da conta (filtro online) mostram a partida e o melhor da partida', est);
    for (const w of [WA, WB, WC]) w.ws.close();
  } finally { S.p.kill('SIGTERM'); }
}

(async () => {
  try { await principal(); }
  catch (e) { falhou++; console.log('  FALHOU (erro) ' + (e && e.stack || e)); }
  console.log('\nv88 · o social ao vivo com a plataforma: ' + ok + ' ok, ' + falhou + ' falharam');
  process.exit(falhou ? 1 : 0);
})();
