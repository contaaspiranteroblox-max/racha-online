// RACHA · v90 — O RANKING DA TEMPORADA com a plataforma de verdade (tests/plataforma: as rotas de app/api em cima de um
// SQLite) e o servidor das salas montado no mesmo endereço. Confere:
//   1) uma partida 2v2 de verdade no SERVIDOR (dois jogadores no mesmo time + bots): o motor marca os gols e as
//      assistências (o passe de um companheiro antes do gol) e o selo assinado leva h:1, o número da partida e os
//      números de cada conta; o fim da partida soma no ranking da temporada (gols, assistências, Craque do Jogo);
//   2) o que NÃO entra: selo sem h:1 (sala antiga/anfitrião), selo adulterado, o aparelho dizendo outros números,
//      a mesma partida duas vezes (outro matchId com o mesmo número de partida) e partida contra os bots;
//   3) o TOP 20 com a tampinha, a patente e o desempate determinístico; a minha posição fora do TOP 20; o perfil
//      privado fora da lista; a categoria PONTOS RANQUEADOS com os pontos da patente;
//   4) o fechamento da temporada (RACHA CONTROL com 2FA): a classificação congela, o recomeço parcial da ranqueada (a
//      metade, uma vez só, mesmo fechando de novo), a temporada fechada mostra a classificação final, as recompensas do
//      TOP 3 só depois do fechamento e uma vez só, e o histórico no perfil.
//   node tests/v90_ranking_test.mjs     (~40 s: a partida espera o tempo mínimo de verdade)
import { fork } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { assina } = require(path.join(RAIZ, 'server', 'banco.js'));
const SEGREDO = 'segredo-do-teste-v90';
let ok = 0, falhou = 0;
function confere(cond, txt, extra) {
  if (cond) { ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra).slice(0, 500) : '')); }
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const banco = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'racha90-')), 'plataforma.sqlite');

function sobe() {
  return new Promise((res, rej) => {
    const p = fork(path.join(RAIZ, 'tests', 'plataforma', 'servidor.mjs'), ['--porta', '0', '--teste', '--banco', banco, '--segredo', SEGREDO], { silent: true, env: { ...process.env, RACHA_CADASTRO: 'aberto', RACHA_OWNER_PASSWORD: 'Dono-Teste-88v' } });
    let log = '';
    p.stdout.on('data', (d) => { log += d; }); p.stderr.on('data', (d) => { log += d; });
    p.on('message', (m) => { if (m && m.pronto) res({ p, porta: m.porta, log: () => log }); });
    setTimeout(() => rej(new Error('a plataforma de teste não subiu: ' + log)), 60000);
  });
}
let BASE = '';
async function api(proc, input, token, query, ip) {
  const corpo = JSON.stringify({ 0: { json: input === undefined ? null : input } });
  const url = BASE + '/api/trpc/' + proc + '?batch=1' + (query ? '&input=' + encodeURIComponent(corpo) : '');
  const r = await fetch(url, { method: query ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}), ...(ip ? { 'x-forwarded-for': ip } : {}) }, body: query ? undefined : corpo });
  const l = JSON.parse(await r.text());
  const um = l[0];
  if (um.error) { const e = new Error(um.error.json.message); e.code = um.error.json.data.code; throw e; }
  return um.result.data.json;
}
const q = (proc, input, token) => api(proc, input, token, true);
const m = (proc, input, token) => api(proc, input, token, false);
async function erro(p) { try { await p; return null; } catch (e) { return e; } }
async function sqlT(sql, params) {
  const r = await fetch(BASE + '/__teste/sql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql, params }) });
  return (await r.json()).linhas;
}
function totp(segredoB32, t = Date.now()) {
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = ''; for (const ch of segredoB32.replace(/=+$/, '').toUpperCase()) bits += B32.indexOf(ch).toString(2).padStart(5, '0');
  const chave = Buffer.alloc(Math.floor(bits.length / 8)); for (let i = 0; i < chave.length; i++) chave[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  const cont = Buffer.alloc(8); cont.writeBigUInt64BE(BigInt(Math.floor(t / 30000)));
  const h = crypto.createHmac('sha1', chave).update(cont).digest(); const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1000000)).padStart(6, '0');
}
let nConta = 0;
async function conta(nome) {
  const r = await api('auth.registrar', { username: nome, nomeExibicao: nome, senha: 'senha1234', confirmacaoSenha: 'senha1234', email: nome + '@x.com', aceiteTermos: true }, null, false, '10.90.0.' + (++nConta));   // (um endereço por conta: o limite de cadastros é por IP)
  return { token: r.token, pub: r.conta.idPublico, nome, id: 'c' + Number(r.conta.idPublico) };
}
function socket(token) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(BASE.replace('http', 'ws') + '/', { headers: { Origin: BASE, ...(token ? { Cookie: 'racha_sessao=' + encodeURIComponent(token) } : {}) } });
    const k = {
      ws, caixa: [], manda: (x) => ws.send(JSON.stringify(x)),
      espera: async (tipo, cond, ms) => { const t0 = Date.now(); for (;;) { const x = k.caixa.find((y) => y.type === tipo && (!cond || cond(y))); if (x) return x; if (Date.now() - t0 > (ms || 4000)) return null; await espera(30); } },
    };
    ws.onmessage = (e) => k.caixa.push(JSON.parse(e.data)); ws.onopen = () => res(k); ws.onerror = () => rej(new Error('não conectou'));
  });
}
async function entra(c) { const k = await socket(c.token); k.manda({ type: 'hello', name: c.nome, skin: 'T.AAAA1111' }); k.hello = await k.espera('hello'); return k; }
const lerSelo = (s) => JSON.parse(Buffer.from(String(s).split('.')[0], 'base64url').toString());

// uma partida online "feita à mão": o selo assinado com o mesmo segredo do servidor das salas
let nSala = 0;
function seloDe(c, o) {
  const agora = Date.now();
  const base = { s: 'TST' + (++nSala), r: 1, j: c.pub, l: 0, p: o.p || [3, 1], m: 'futebol', d: 90, k: 0, n: 1, g: [], v: o.v ? 1 : 0, t: agora, e: agora + 40 * 60e3 };
  if (o.h !== false) Object.assign(base, { h: 1, pid: o.pid || 'p' + crypto.randomBytes(5).toString('hex').slice(0, 9), gl: o.gl | 0, as: o.as | 0 });
  return assina(SEGREDO, base);
}
async function partidaOnline(c, selo, aparelho) {
  const id = crypto.randomUUID();
  const ini = await m('jogo.iniciarPartida', { matchId: id, modo: 'futebol', mapa: 'estadio', ranqueada: false, online: true, tamanho: 1 }, c.token);
  const s = lerSelo(selo);
  return m('jogo.encerrarPartida', { matchId: id, matchToken: ini.matchToken, placarNosso: s.p[0], placarDeles: s.p[1], gols: aparelho ? aparelho.gols : Math.min(s.gl | 0, s.p[0]), assistencias: aparelho ? aparelho.assistencias : 0, duracaoSeg: 90, online: true, valida: true, selo }, c.token);
}

async function principal() {
  const S = await sobe();
  BASE = 'http://127.0.0.1:' + S.porta;
  try {
    console.log('1) uma partida 2v2 de verdade no servidor: o passe do companheiro vira assistência e vai no selo');
    const A = await conta('rafinha10'), B = await conta('lelezinho');
    const WA = await entra(A), WB = await entra(B);
    WA.manda({ type: 'create', n: 2, map: 4, jogo: 'futebol', tempo: 0, bots: true, pub: false, name: 'Racha v90' });
    const sala = (await WA.espera('room')).room;
    WB.manda({ type: 'join', code: sala.code, slot: 1 });
    const rr = await WA.espera('room', (x) => x.room.roster[1] === B.id);
    confere(rr && rr.room.roster[0] === A.id && rr.room.roster[1] === B.id, 'o Rafa e a Lele no mesmo time (bots no outro)', rr && rr.room.roster);
    const ini = {};
    for (const x of [A, B]) {
      const id = crypto.randomUUID();
      const r = await m('jogo.iniciarPartida', { matchId: id, modo: 'futebol', mapa: 'estadio', ranqueada: false, online: true, tamanho: 2 }, x.token);
      ini[x.pub] = { id, token: r.matchToken };
    }
    WA.manda({ type: 'start' });
    confere(await WB.espera('start'), 'começou (a partida roda no servidor)');
    console.log('  (esperando o tempo mínimo de partida de verdade no servidor)');
    await espera(11000);
    const gols = [[A.id, B.id], [A.id, B.id], [B.id, A.id]];   // [autor, quem passou]
    // cada gol só sai com o motor em jogo: depois de um gol ele fica 2 s comemorando (em ticks, que numa máquina lenta duram
    // mais que 2 s de relógio) e ignora outro pedido. Então o teste pede de novo até o placar do servidor mostrar o gol.
    for (const [i, [autor, assist]] of gols.entries()) {
      let ok = null;
      for (const t0 = Date.now(); !ok && Date.now() - t0 < 20000;) {
        WA.manda({ type: '__teste_gol', time: 0, autor, assist });
        ok = await WA.espera('snapshot', (x) => x.data && x.data.score && x.data.score[0] >= i + 1, 700);
      }
      if (!ok) throw new Error('o servidor não marcou o gol ' + (i + 1));
    }
    const rA = await WA.espera('result', null, 8000), rB = await WB.espera('result', null, 3000);
    const sA = rA && rA.selo ? lerSelo(rA.selo) : null, sB = rB && rB.selo ? lerSelo(rB.selo) : null;
    confere(rA && rA.valida && sA && sA.h === 1 && /^p[a-z0-9]+$/.test(sA.pid) && sB && sB.pid === sA.pid, 'o resultado valeu e os dois selos dizem "o servidor simulou" (h:1) com o mesmo número de partida', sA);
    confere(sA && sA.gl === 2 && sA.as === 1 && sB && sB.gl === 1 && sB.as === 2, 'o motor contou: Rafa 2 gols e 1 assistência, Lele 1 gol e 2 assistências', [sA && [sA.gl, sA.as], sB && [sB.gl, sB.as]]);
    confere(sA && sA.v === 1 && sB && sB.v === 0, 'o Craque do Jogo (as regras de sempre: mais gols) é o Rafa', [sA && sA.v, sB && sB.v]);
    const fimA = await m('jogo.encerrarPartida', { matchId: ini[A.pub].id, matchToken: ini[A.pub].token, placarNosso: sA.p[0], placarDeles: sA.p[1], gols: sA.p[0], assistencias: 9, duracaoSeg: 60, online: true, valida: true, selo: rA.selo }, A.token);
    const fimB = await m('jogo.encerrarPartida', { matchId: ini[B.pub].id, matchToken: ini[B.pub].token, placarNosso: sB.p[0], placarDeles: sB.p[1], gols: 0, assistencias: 0, duracaoSeg: 60, online: true, valida: true, selo: rB.selo }, B.token);
    confere(fimA.ranking && fimA.ranking.gols === 2 && fimA.ranking.assistencias === 1 && fimA.ranking.craque === true, 'o ranking do Rafa somou o que o SERVIDOR contou (não os 3 gols e 9 assistências que o aparelho disse)', fimA.ranking);
    confere(fimB.ranking && fimB.ranking.gols === 1 && fimB.ranking.assistencias === 2 && fimB.ranking.craque === false, 'e o da Lele também', fimB.ranking);
    for (const w of [WA, WB]) w.ws.close();

    console.log('\n2) o que não entra no ranking');
    const C = await conta('caiozin99');
    const semH = await partidaOnline(C, seloDe(C, { h: false, p: [3, 0] }));
    confere(semH.ok && semH.ranking === null, 'selo sem h:1 (sala com anfitrião, a partida no aparelho): vale a partida, mas não o ranking', semH.ranking);
    const adult = seloDe(C, { gl: 1, p: [3, 0] }), [corpo, ass] = adult.split('.');
    const corpoFalso = Buffer.from(JSON.stringify({ ...lerSelo(adult), gl: 3, as: 3 })).toString('base64url');
    const adulterado = await partidaOnline(C, corpoFalso + '.' + ass, { gols: 3, assistencias: 3 });
    confere(adulterado.ok && adulterado.xpConcedido === 0 && !adulterado.ranking, 'selo adulterado (mais gols): a assinatura não bate e nada conta', adulterado);
    const pidRep = 'p' + crypto.randomBytes(5).toString('hex').slice(0, 9);
    const um = await partidaOnline(C, seloDe(C, { pid: pidRep, gl: 2, as: 1, p: [3, 1] }));
    const dois = await partidaOnline(C, seloDe(C, { pid: pidRep, gl: 2, as: 1, p: [3, 1] }));
    confere(um.ranking && um.ranking.gols === 2 && !um.ranking.duplicada && dois.ranking && dois.ranking.duplicada === true, 'a mesma partida (o mesmo número) mandada de novo por outro caminho não soma de novo', [um.ranking, dois.ranking]);
    const maisQuePlacar = await partidaOnline(C, seloDe(C, { gl: 5, as: 0, p: [3, 1] }), { gols: 3, assistencias: 0 });
    confere(maisQuePlacar.ranking === null, 'número impossível (mais gols que o placar do time) não entra', maisQuePlacar.ranking);
    const idB = crypto.randomUUID();
    const iniB = await m('jogo.iniciarPartida', { matchId: idB, modo: 'futebol', mapa: 'estadio', ranqueada: false, online: false }, C.token);
    const bots = await m('jogo.encerrarPartida', { matchId: idB, matchToken: iniB.matchToken, placarNosso: 3, placarDeles: 0, gols: 3, assistencias: 0, duracaoSeg: 90, online: false, valida: true }, C.token);
    confere(bots.ok && bots.ranking === null, 'partida contra os bots (no aparelho) não entra no ranking', bots.ranking);
    const rkC = await sqlT('SELECT gols, assistencias, partidas FROM ranking_sazonal WHERE usuario_id = (SELECT id FROM usuarios WHERE username = ?)', ['caiozin99']);
    confere(rkC.length === 1 && Number(rkC[0].gols) === 2 && Number(rkC[0].assistencias) === 1 && Number(rkC[0].partidas) === 1, 'no banco, o Caio tem só a partida que valeu: 2 gols, 1 assistência, 1 partida', rkC);

    console.log('\n3) o TOP 20, o desempate, a minha posição e o perfil privado');
    const gente = [];
    for (let i = 0; i < 21; i++) gente.push(await conta('jogador' + String(i).padStart(2, '0')));
    // cada um com (21 - i) assistências; os dois últimos com o mesmo número (o desempate: quem chegou antes)
    for (let i = 0; i < gente.length; i++) await partidaOnline(gente[i], seloDe(gente[i], { gl: 1, as: i < 20 ? 21 - i : 2, p: [21, 1] }));
    await sqlT("UPDATE usuarios SET tampa = 'T.AAAA1111' WHERE username = 'jogador00'");
    const t1 = await q('ranking.top', { categoria: 'assistencias' }, A.token);
    confere(t1.temporada && t1.temporada.id === 'T1' && t1.lista.length === 20, 'o ranking de assistências da T1 traz o TOP 20', [t1.temporada && t1.temporada.id, t1.lista.length]);
    confere(t1.lista[0].nome === 'jogador00' && t1.lista[0].valor === 21 && t1.lista[0].posicao === 1 && t1.lista[0].tampa === 'T.AAAA1111' && t1.lista[0].patente && t1.lista[0].patente.nome, 'o 1º: o nome, o número, a tampinha de verdade e a patente', t1.lista[0]);
    const iLele = t1.lista.findIndex((x) => x.nome === 'lelezinho'), iJ19 = t1.lista.findIndex((x) => x.nome === 'jogador19'), iJ20 = t1.lista.findIndex((x) => x.nome === 'jogador20');
    confere(iLele === 19 && iJ19 < 0 && iJ20 < 0, 'empate em 2 assistências: a Lele (chegou antes) fica com o 20º lugar; o jogador19 e o jogador20 (chegaram depois) ficam fora do TOP 20', [iLele, iJ19, iJ20]);
    const ordenado = t1.lista.every((x, i) => i === 0 || t1.lista[i - 1].valor >= x.valor);
    confere(ordenado, 'a lista está em ordem (o maior primeiro)');
    const euA = await q('ranking.top', { categoria: 'assistencias' }, A.token);
    confere(euA.eu && euA.eu.posicao === 23 && euA.eu.valor === 1, 'o Rafa (1 assistência) vê a posição dele fora do TOP 20: #23', euA.eu);
    const anon = await q('ranking.top', { categoria: 'gols' });
    confere(anon.lista.length > 0 && anon.eu === null, 'sem login, a lista aparece e a posição não', anon.eu);
    await sqlT("UPDATE usuarios SET perfil_publico = 0 WHERE username = 'jogador00'");
    await espera(31000);   // (o cache do TOP 20 dura 30 s)
    const priv = await q('ranking.top', { categoria: 'assistencias' }, gente[0].token);
    confere(!priv.lista.some((x) => x.nome === 'jogador00') && priv.eu && priv.eu.posicao === null, 'perfil privado: some da lista e não tem posição pública', priv.eu);
    await sqlT("UPDATE usuarios SET perfil_publico = 1 WHERE username = 'jogador00'");
    for (const [nome, pts] of [['caiozin99', 900], ['rafinha10', 351]]) {   // (os pontos da patente como se tivessem vindo das partidas)
      const r = await sqlT("INSERT INTO ranqueada (usuario_id, pts, melhor, jogos, vit, der, emp, seq, desist, importado, bots_dia, bots_ganho, atualizado_em) SELECT id, ?, ?, 10, 6, 4, 0, 0, 0, 0, '', 0, ? FROM usuarios WHERE username = ?", [pts, pts, Date.now() - pts, nome]);
      if (!r) console.log('    (o INSERT da ranqueada falhou)');
    }
    const pts = await q('ranking.top', { categoria: 'pontos' }, A.token);
    confere(pts.lista[0] && pts.lista[0].nome === 'caiozin99' && pts.lista[0].valor === 900 && pts.lista[0].patente.nome && pts.eu.posicao === 2 && pts.eu.valor === 351, 'PONTOS RANQUEADOS: os pontos da patente, em ordem, e a minha posição', [pts.lista[0], pts.eu]);
    const craq = await q('ranking.top', { categoria: 'craque' }, A.token);
    confere(craq.lista.length === 1 && craq.lista[0].nome === 'rafinha10' && craq.lista[0].valor === 1, 'CRAQUE DO JOGO: só o Rafa recebeu (na partida de verdade)', craq.lista);

    console.log('\n4) o fechamento da temporada (RACHA CONTROL)');
    const semPainel = await erro(m('ranking.fecharTemporada', { id: 'T1' }, A.token));
    confere(semPainel, 'uma conta comum não fecha a temporada');
    const lp = await m('admin.loginPainel', { username: 'dono', senha: 'Dono-Teste-88v' });
    const seg = (await sqlT('SELECT segredo FROM totp LIMIT 1'))[0].segredo;
    await m('admin.verificar2fa', { token: lp.token, codigo: totp(seg) });
    const cedo = await erro(m('ranking.fecharTemporada', { id: 'T1' }, lp.token));
    confere(cedo && /ainda não acabou/.test(cedo.message), 'antes do fim da temporada não fecha', cedo && cedo.message);
    const antesRecomp = await erro(m('ranking.entregarRecompensas', { id: 'T1' }, lp.token));
    confere(antesRecomp && /Feche a temporada/.test(antesRecomp.message), 'as recompensas não saem antes do fechamento', antesRecomp && antesRecomp.message);
    await sqlT('UPDATE temporadas_ranking SET fim = ? WHERE id = ?', [Date.now() - 1000, 'T1']);
    const f1 = await m('ranking.fecharTemporada', { id: 'T1' }, lp.token);
    confere(f1.ok && f1.congeladas.assistencias === 24 && f1.congeladas.pontos === 2 && f1.recomecos === 2, 'fechou: a classificação congelada (24 com assistência, 2 na ranqueada) e o recomeço parcial de 2 contas', f1);
    const rq = await sqlT("SELECT u.username, r.pts FROM ranqueada r JOIN usuarios u ON u.id = r.usuario_id ORDER BY r.pts DESC");
    confere(Number(rq[0].pts) === 450 && Number(rq[1].pts) === 175, 'a ranqueada recomeçou com a metade (900 → 450, 351 → 175)', rq);
    const f2 = await erro(m('ranking.fecharTemporada', { id: 'T1' }, lp.token));
    const rq2 = await sqlT("SELECT pts FROM ranqueada ORDER BY pts DESC");
    confere(f2 && Number(rq2[0].pts) === 450, 'fechar de novo não faz nada (a metade não é tirada duas vezes)', [f2 && f2.message, rq2]);
    const nova = await partidaOnline(C, seloDe(C, { gl: 3, as: 3, p: [3, 0] }));
    confere(nova.ranking === null, 'sem temporada aberta, a partida vale mas não entra em ranking nenhum', nova.ranking);
    const fin = await q('ranking.top', { categoria: 'assistencias', temporada: 'T1' }, A.token);
    confere(fin.congelado && fin.lista.length === 20 && fin.lista[0].nome === 'jogador00' && fin.eu.posicao === 23, 'a T1 fechada mostra a classificação final (o TOP 20 e a minha posição final)', [fin.congelado, fin.eu]);
    const r1 = await m('ranking.entregarRecompensas', { id: 'T1' }, lp.token);
    const r2 = await m('ranking.entregarRecompensas', { id: 'T1' }, lp.token);
    confere(r1.entregues === 3 + 3 + 2 + 1 && r2.entregues === 0 && r2.ja === r1.entregues, 'as recompensas do TOP 3 saem uma vez só (de novo: nada entregue)', [r1, r2]);
    const itens = await sqlT("SELECT codigo_item FROM itens_usuario WHERE usuario_id = (SELECT id FROM usuarios WHERE username = 'jogador00') AND origem = 'ranking'");
    confere(itens.some((x) => x.codigo_item === 'tp_rk_assist_1') && itens.some((x) => x.codigo_item === 'banner_rk_assist_1'), 'o 1º de assistências ganhou a tampinha e o banner exclusivos da categoria', itens);
    const hist = await q('ranking.historico', { idPublico: gente[0].pub });
    confere(hist.colocacoes.some((x) => x.categoria === 'assistencias' && x.posicao === 1 && x.temporada === 'T1') && hist.melhor === 1 && hist.premios.some((p) => /Garçom da Temporada/.test(p.titulo)), 'o perfil mostra: TOP 1 de assistências da T1, a melhor colocação e o título', hist);
    const abre = await m('ranking.abrirTemporada', { id: 'T2', nome: 'VERÃO NA LAJE', inicio: new Date(Date.now() - 1000).toISOString(), fim: new Date(Date.now() + 90 * 864e5).toISOString() }, lp.token);
    const nT2 = await partidaOnline(C, seloDe(C, { gl: 1, as: 0, p: [3, 0] }));
    const tT2 = await q('ranking.top', { categoria: 'gols' }, C.token);
    confere(abre.ok && nT2.ranking && nT2.ranking.temporada === 'T2' && tT2.temporada.id === 'T2' && tT2.eu.valor === 1, 'a T2 abriu: o ranking começa do zero (o Caio com 1 gol) e a T1 continua guardada', [nT2.ranking, tT2.eu]);
    const estat = await sqlT("SELECT gols FROM estatisticas WHERE usuario_id = (SELECT id FROM usuarios WHERE username = 'caiozin99')");
    confere(estat.length && Number(estat[0].gols) > 0, 'as estatísticas de sempre da conta continuam (não zeraram)', estat);
  } finally { S.p.kill('SIGTERM'); }
}

(async () => {
  try { await principal(); }
  catch (e) { falhou++; console.log('  FALHOU (erro) ' + (e && e.stack || e)); }
  console.log('\nv90 · o ranking da temporada: ' + ok + ' ok, ' + falhou + ' falharam');
  process.exit(falhou ? 1 : 0);
})();
