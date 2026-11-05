// RACHA v106 · AS MASCOTES no servidor das salas e na plataforma: só quem comprou aparece com as peças delas (a cara de cada
// mascote e a borda Medalhão) — no cartão da sala, na partida, na lista, no Chat do Brasil, na tampinha da conta e no escudo
// do clube —, nem pelo código montado na mão. Os códigos abaixo foram tirados do jogo (RachaConteudo106.mascotes() e
// tpCodigo no tests/build/racha_teste.html); o tests/v106_conteudo_test.py confere os lugares das peças com o jogo.
// Rodar: node tests/v106_mascotes_servidor_test.mjs   (a plataforma de teste: node tests/plataforma/compila.cjs antes, se mudou app/api)
import { fork } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import EventEmitter from 'node:events';
const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.RACHA_CONTAGEM_MS = process.env.RACHA_CONTAGEM_MS || '0';
process.env.RACHA_REPLAY = process.env.RACHA_REPLAY || '0';
const { Turma } = require(path.join(RAIZ, 'server', 'turma'));
const { assina } = require(path.join(RAIZ, 'server', 'banco'));
const F96 = require(path.join(RAIZ, 'server', 'fundador96'));
const M106 = require(path.join(RAIZ, 'server', 'mascotes106'));
const S88 = require(path.join(RAIZ, 'server', 'social88'));
let ok = 0, falhou = 0;
const confere = (c, txt, extra) => { if (c) { ok++; console.log('  ok   ' + txt); } else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra).slice(0, 400) : '')); } };
const t0 = Date.now();

const COD = {                                              // (do jogo)
  arara: 'T.OAVwqr2f9J8KFEA', onca: 'T.OAWCjPtY_50KFEA', mico: 'T.OAWTZFE__FMKFEA', guara: 'T.OAWi4jG_8TUKFEA', tucano: 'T.OAWwqWN_5o8KFEA', jacare: 'T.OAXA6-K-tZ8KFEA',
  oncaSemBorda: 'T.OAWCjPtY_50KFEM',                       // a Onça-Preta com o TAMANHO DA BORDA "sem borda" (o fim do código)
  oncaBotao: 'T.NgWD378hQog',                              // a cara da Onça-Preta com a borda BOTÃO (sem a Medalhão)
  soMedalhao: 'T.OAAkqr2f9J_1iQ_My2yZKAA',                 // a tampinha inicial com a borda Medalhão (sem cara de mascote)
  escudoArara: 'E.AAVwqr2f9J8KFEA',                        // um escudo de clube com a cara da Arara
  comum: 'T.AAAAaaaa', fund: 'T.NAVj_qX_-lAKFEA',
};
const ITENS = ['tp_m_arara', 'tp_m_oncapreta', 'tp_m_mico', 'tp_m_guara', 'tp_m_tucano', 'tp_m_jacare'];

console.log('1) as peças das mascotes pelo lugar nas listas (as caras 87 a 92 e a Medalhão 28)');
{
  const lug = ['arara', 'onca', 'mico', 'guara', 'tucano', 'jacare'].map(k => F96.pecasDoCodigo(COD[k]));
  confere(lug.every((p, i) => p && p.icone === 87 + i && p.borda === M106.BORDA_MEDALHAO), 'as 6 mascotes: a cara no lugar 87 a 92 e a borda Medalhão (28)', lug);
  confere(M106.MASCOTES.map(m => m.item).join() === ITENS.join() && M106.MASCOTES.every((m, i) => m.icone === 87 + i), 'a lista do servidor: os 6 itens na ordem das caras', M106.MASCOTES);
  confere(['arara', 'onca', 'oncaSemBorda', 'oncaBotao', 'soMedalhao', 'escudoArara'].every(k => M106.usaPeca(F96.pecasDoCodigo(COD[k]))) && !M106.usaPeca(F96.pecasDoCodigo(COD.comum)) && !M106.usaPeca(F96.pecasDoCodigo(COD.fund)) && !M106.usaPeca(null),
    'usam peça de mascote: as 6, sem borda, só a cara, só a Medalhão e o escudo com a cara; a comum, a dos fundadores e o lixo não');
  const rel = (...m) => ({ rel: { cos: {}, masc: new Set(m) } });
  confere(F96.skinValida(rel('tp_m_oncapreta'), COD.onca) === COD.onca && F96.skinValida(rel(), COD.onca) === '' && F96.skinValida({}, COD.onca) === '',
    'a Onça-Preta: vale com a mascote dela; sem nenhuma (e para o visitante, sem relações), a tampinha padrão');
  confere(F96.skinValida(rel('tp_m_mico'), COD.onca) === '' && F96.skinValida(rel('tp_m_mico'), COD.oncaBotao) === '', 'a cara de uma mascote não vale com outra mascote (nem com outra borda)');
  confere(F96.skinValida(rel('tp_m_mico'), COD.soMedalhao) === COD.soMedalhao && F96.skinValida(rel(), COD.soMedalhao) === '', 'a borda Medalhão vale com qualquer mascote (e sem nenhuma, não)');
  confere(F96.skinValida(rel('tp_m_oncapreta'), COD.oncaSemBorda) === COD.oncaSemBorda, 'com o tamanho da borda no fim do código, a mesma regra');
  confere(F96.skinValida(rel(), COD.comum) === COD.comum && F96.skinValida({ rel: { cos: { fundador: 'tp_fundador' }, masc: new Set() } }, COD.fund) === COD.fund && F96.skinValida(rel('tp_m_oncapreta'), COD.fund) === '',
    'as outras tampinhas passam como sempre; a dos fundadores continua só dos fundadores');
  const r1 = S88.relDe({ amigos: [], bloqueios: [], mostraOnline: true, aceitaConvites: true, clube: null, cos: {}, mascotes: ['tp_m_oncapreta', 'tp_m_oncapreta', 'bola_fogo', 'tp_m_<x>', 42] });
  const r2 = S88.relDe(S88.relDoBilhete({ a: [], b: [], q: {}, m: ['tp_m_mico'] })), r3 = S88.relDe(S88.relDoBilhete({ a: [], b: [], q: {} }));
  confere([...r1.masc].join() === 'tp_m_oncapreta' && [...r2.masc].join() === 'tp_m_mico' && r3.masc.size === 0, 'as relações: as mascotes da plataforma (mascotes) e do bilhete (m), só os itens tp_m_* e sem repetir', [[...r1.masc], [...r2.masc], [...r3.masc]]);
  confere(!('masc' in r1.cos) && JSON.stringify(r1.cos) === '{}', 'as mascotes ficam fora dos cosméticos que vão para os outros (cos)');
}

console.log('\n2) o servidor das salas: o cartão da sala com a tampinha que vale');
class WsFalso extends EventEmitter {
  constructor() { super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; }
  send(t) { if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
  close() { if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate() { this.close(); } ping() {}
}
{
  const SEG = 'segredo-v106-mascotes';
  const t = new Turma({ log: () => {}, agora: () => 1.7e12, p2p: false, segredo: SEG, exigeConta: false });
  const cliente = () => { const ws = new WsFalso(); const c = t.conecta(ws, { headers: {}, socket: { remoteAddress: '10.9.1.' + (Math.random() * 250 | 0) } }); return { ws, c, manda: m => ws.emit('message', JSON.stringify(m)), ult: tipo => [...ws.caixa].reverse().find(x => x.type === tipo) }; };
  const bil = (p, n, m) => assina(SEG, Object.assign({ p, n, e: Date.now() + 600000, q: {} }, m ? { m } : {}));
  const A = cliente(); A.manda({ type: 'hello', name: 'Ana', skin: COD.onca, flag: 'BR', conta: bil('111', 'Ana', ['tp_m_oncapreta']) });
  const B = cliente(); B.manda({ type: 'hello', name: 'Beto', skin: COD.onca, flag: 'BR', conta: bil('222', 'Beto') });
  const C = cliente(); C.manda({ type: 'hello', name: 'Caio', skin: COD.soMedalhao, flag: 'BR', conta: bil('333', 'Caio', ['tp_m_jacare']) });
  const V = cliente(); V.manda({ type: 'hello', name: 'Visita', skin: COD.onca, flag: 'BR' });
  confere(A.c.skin === COD.onca && C.c.skin === COD.soMedalhao, 'quem comprou (o bilhete assinado diz: m) entra com a mascote; a Medalhão com outra mascote também vale', [A.c.skin, C.c.skin]);
  confere(B.c.skin === '' && V.c.skin === '', 'a conta sem a mascote e o visitante que mandaram o código dela ficam com a padrão', [B.c.skin, V.c.skin]);
  A.manda({ type: 'create', name: 'Sala das mascotes', pub: false, n: 1 });
  const sala = A.ult('room'); const code = sala && sala.room && sala.room.code;
  B.manda({ type: 'join', code });
  const mem = (B.ult('room') || { room: {} }).room.members || [];
  confere((mem.find(x => x.name === 'Ana') || {}).skin === COD.onca && (mem.find(x => x.name === 'Beto') || {}).skin === '', 'no cartão da sala: a Ana com a Onça-Preta, o Beto com a padrão', mem.map(x => [x.name, x.skin]));
  confere(mem.every(x => !x.cos || !('masc' in x.cos) && !('mascotes' in x.cos)), 'o cartão da sala não mostra as mascotes de ninguém', mem.map(x => x.cos));
  B.manda({ type: 'profile', skin: COD.mico });
  const mB2 = ((A.ult('room') || { room: {} }).room.members || []).find(x => x.name === 'Beto');
  confere(mB2 && mB2.skin === '', 'trocar para outra mascote no meio da sala também não vale', mB2 && mB2.skin);
  // comprou agora: o bilhete novo (separado da plataforma) e o aviso da plataforma montada aqui (atualizaRelacoes)
  B.manda({ type: 'relacoes', conta: bil('222', 'Beto', ['tp_m_mico']) });
  const mB3 = ((A.ult('room') || { room: {} }).room.members || []).find(x => x.name === 'Beto');
  confere(B.c.skin === COD.mico && mB3 && mB3.skin === COD.mico, 'comprou (o bilhete novo com o Mico-Leão): a tampinha pedida passa a valer na hora, no cartão da sala também', [B.c.skin, mB3 && mB3.skin]);
  t.atualizaRelacoes('333', { amigos: [], bloqueios: [], mostraOnline: true, aceitaConvites: true, clube: null, cos: {}, mascotes: [] });
  confere(C.c.skin === '', 'a plataforma montada aqui diz que a conta não tem mais mascote: a Medalhão sai', C.c.skin);
  t.atualizaRelacoes('333', { amigos: [], bloqueios: [], mostraOnline: true, aceitaConvites: true, clube: null, cos: {}, mascotes: ['tp_m_tucano'] });
  confere(C.c.skin === COD.soMedalhao, 'e voltou a ter (a plataforma avisou depois da compra): a Medalhão volta', C.c.skin);
}

console.log('\n3) a plataforma de teste: as mascotes da conta nas relações, no bilhete, na tampinha da conta e no escudo');
const banco = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'racha106m-')), 'plataforma.sqlite');
function sobe() {
  return new Promise((res, rej) => {
    const p = fork(path.join(RAIZ, 'tests', 'plataforma', 'servidor.mjs'), ['--porta', '0', '--teste', '--banco', banco, '--sem-compilar', '--segredo', 'segredo-suite-v106m'], { silent: true, env: { ...process.env, RACHA_CADASTRO: 'aberto', RACHA_OWNER_PASSWORD: 'Dono-Teste-106m' } });
    let log = ''; p.stdout.on('data', d => { log += d; }); p.stderr.on('data', d => { log += d; });
    p.on('message', m => { if (m && m.pronto) res({ p, porta: m.porta, log: () => log }); });
    setTimeout(() => rej(new Error('a plataforma de teste não subiu: ' + log)), 30000);
  });
}
let BASE = '';
async function api(proc, input, token, query) {
  const corpo = JSON.stringify({ 0: input === undefined || input === null ? { json: null, meta: { values: ['undefined'], v: 1 } } : { json: input } });
  const url = BASE + '/api/trpc/' + proc + '?batch=1' + (query ? '&input=' + encodeURIComponent(corpo) : '');
  const r = await fetch(url, { method: query ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: query ? undefined : corpo });
  const um = JSON.parse(await r.text())[0];
  if (um.error) { const e = new Error(um.error.json.message); e.code = um.error.json.data.code; throw e; }
  return um.result.data.json;
}
const q = (p, i, t) => api(p, i, t, true), m = (p, i, t) => api(p, i, t, false);
const sqlT = async (s, params) => (await (await fetch(BASE + '/__teste/sql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql: s, params }) })).json()).linhas;
async function novaConta(nome) {
  await sqlT('DELETE FROM limites');
  const r = await m('auth.registrar', { username: nome, nomeExibicao: nome, senha: 'senha1234', confirmacaoSenha: 'senha1234', email: nome + '@x.com', aceiteTermos: true });
  await q('loja.estado', undefined, r.token);
  const u = (await sqlT('SELECT id FROM usuarios WHERE username = ?', [nome]))[0];
  await sqlT('UPDATE carteiras SET moedas = ?, gemas = ? WHERE usuario_id = ?', [20000, 1000, u.id]);
  return { token: r.token, nome, id: u.id };
}
async function compra(codigo, token) {                     // (o preço de agora: a mascote pode estar nas ofertas da semana)
  const preco = { moedas: 0, gemas: { tp_m_oncapreta: 150, tp_m_arara: 150, tp_m_mico: 150 }[codigo] || 80 };
  try { return await m('loja.comprar', { codigo, preco }, token); }
  catch (e) {
    const g = /agora é (\d+) gemas/.exec(e.message || ''); if (!g) throw e;
    return m('loja.comprar', { codigo, preco: { moedas: 0, gemas: Number(g[1]) } }, token);
  }
}
const corpoBilhete = b => JSON.parse(Buffer.from(String(b.bilhete).split('.')[0], 'base64url').toString('utf8'));
async function principal() {
  const S = await sobe(); BASE = 'http://127.0.0.1:' + S.porta;
  try {
    const dono = await novaConta('masc106a'), fora = await novaConta('masc106b');
    const r0 = await q('social.relacoes', undefined, dono.token);
    confere(Array.isArray(r0.mascotes) && r0.mascotes.length === 0, 'antes de comprar: as relações com a lista das mascotes vazia', r0.mascotes);
    const c1 = await compra('tp_m_oncapreta', dono.token);
    confere(c1 && c1.ok, 'a conta compra a Onça-Preta na loja', c1 && (c1.nome || c1));
    const r1 = await q('social.relacoes', undefined, dono.token), rF = await q('social.relacoes', undefined, fora.token);
    confere(r1.mascotes.join() === 'tp_m_oncapreta' && rF.mascotes.length === 0, 'as relações da conta (o que o servidor das salas usa): a Onça-Preta na de quem comprou, nada na outra', [r1.mascotes, rF.mascotes]);
    confere(!('mascotes' in (r1.cos || {})) && !('masc' in (r1.cos || {})), 'e fora dos cosméticos equipados (cos)', r1.cos);
    const b = corpoBilhete(await m('jogo.bilheteSala', undefined, dono.token)), bF = corpoBilhete(await m('jogo.bilheteSala', undefined, fora.token));
    confere(Array.isArray(b.m) && b.m.join() === 'tp_m_oncapreta' && !bF.m, 'o bilhete assinado das salas leva m (as mascotes compradas; sem nenhuma, nada)', [b.m, bF.m]);
    const t1 = await m('clubes.salvarTampa', { codigo: COD.onca }, dono.token).catch(e => e);
    const t2 = await m('clubes.salvarTampa', { codigo: COD.onca }, fora.token).catch(e => e);
    const t3 = await m('clubes.salvarTampa', { codigo: COD.soMedalhao }, fora.token).catch(e => e);
    const t4 = await m('clubes.salvarTampa', { codigo: COD.mico }, dono.token).catch(e => e);
    const t5 = await m('clubes.salvarTampa', { codigo: COD.soMedalhao }, dono.token).catch(e => e);
    const tampaF = (await sqlT('SELECT tampa FROM usuarios WHERE id = ?', [fora.id]))[0].tampa, tampaD = (await sqlT('SELECT tampa FROM usuarios WHERE id = ?', [dono.id]))[0].tampa;
    confere(!(t1 instanceof Error) && t2 instanceof Error && t2.code === 'FORBIDDEN' && t3 instanceof Error && t3.code === 'FORBIDDEN' && t4 instanceof Error && !(t5 instanceof Error) && tampaF !== COD.onca && tampaD === COD.soMedalhao,
      'a tampinha da conta: a mascote e a Medalhão só de quem tem (a outra conta é recusada, a cara de outra mascote também)', [t1 && t1.message, t2 && t2.message, t3 && t3.message, t4 && t4.message, t5 && t5.message, tampaF, tampaD]);
    confere(t2 instanceof Error && /MASCOTES/.test(t2.message), 'o aviso diz onde comprar (LOJA › TAMPINHAS › MASCOTES)', t2 && t2.message);
    const e1 = await m('clubes.criar', { nome: 'Laje da Arara', descricao: 'x', pais: 'BR', tipo: 'publico', trofeuMinimo: 0, escudo: COD.escudoArara }, fora.token).catch(e => e);
    const e2 = await m('clubes.criar', { nome: 'Laje Comum 106', descricao: 'x', pais: 'BR', tipo: 'publico', trofeuMinimo: 0, escudo: 'E.AAgjz35Cxo4u34esSH___g' }, fora.token).catch(e => e);
    confere(e1 instanceof Error && e1.code === 'FORBIDDEN' && !(e2 instanceof Error), 'o escudo do clube com a cara de uma mascote: recusado para quem não tem (o escudo comum vale)', [e1 && e1.message, e2 && e2.message]);
    const c2 = await compra('tp_m_arara', dono.token);
    const e3 = await m('clubes.criar', { nome: 'Laje da Arara', descricao: 'x', pais: 'BR', tipo: 'publico', trofeuMinimo: 0, escudo: COD.escudoArara }, dono.token).catch(e => e);
    confere(c2 && c2.ok && !(e3 instanceof Error), 'quem tem a Arara cria o clube com o escudo dela', [c2 && c2.ok, e3 && e3.message]);
    const r2 = await q('social.relacoes', undefined, dono.token);
    confere(r2.mascotes.slice().sort().join() === 'tp_m_arara,tp_m_oncapreta', 'as relações com as duas mascotes compradas', r2.mascotes);
  } finally { S.p.kill(); }
}
await principal().catch(e => { falhou++; console.log('  FALHOU  a plataforma: ' + (e && e.stack || e)); });
console.log('\nv106 · as mascotes no servidor das salas e na plataforma: ' + ok + ' ok, ' + falhou + ' falharam em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(falhou ? 1 : 0);
