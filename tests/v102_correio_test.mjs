// RACHA · v102 — O CORREIO E AS MENSAGENS COM O BANCO DA PRODUÇÃO.
// O drizzle-orm da produção (0.45) embrulha todo erro do MySQL no "Failed query" (a chave repetida vai em .cause); o banco
// de teste agora embrulha igual. Antes da v102 o correio quebrava depois da primeira carta para todo mundo: cada abertura
// (o correio, as mensagens e o resumo do lobby) tentava gravar a mesma carta e o erro de chave repetida não era reconhecido.
// Aqui: a carta para todo mundo chega uma vez e o correio continua abrindo; COLETAR paga uma vez; APAGAR não traz a carta de
// volta (nem o prêmio); o aviso sem prêmio chega uma vez na central; o login do dia apagado não volta no mesmo dia.
//   node tests/v102_correio_test.mjs
import { fork } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, falhou = 0;
function confere(cond, txt, extra) {
  if (cond) { ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra).slice(0, 400) : '')); }
}
const banco = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'racha102-')), 'plataforma.sqlite');
function sobe() {
  return new Promise((res, rej) => {
    const p = fork(path.join(RAIZ, 'tests', 'plataforma', 'servidor.mjs'), ['--porta', '0', '--teste', '--banco', banco, '--segredo', 'segredo-v102'], { silent: true, env: { ...process.env, RACHA_PRESENTE_TESTE: '1', RACHA_CADASTRO: 'aberto', RACHA_OWNER_PASSWORD: 'Dono-Teste-102' } });   // (com o presente de teste ligado: mais uma carta que se repetia)
    let log = '';
    p.stdout.on('data', (d) => { log += d; }); p.stderr.on('data', (d) => { log += d; });
    p.on('message', (m) => { if (m && m.pronto) res({ p, porta: m.porta, log: () => log }); });
    setTimeout(() => rej(new Error('a plataforma de teste não subiu: ' + log)), 30000);
  });
}
let BASE = '';
async function api(proc, input, token, query) {
  const corpo = JSON.stringify({ 0: { json: input === undefined ? null : input } });
  const url = BASE + '/api/trpc/' + proc + '?batch=1' + (query ? '&input=' + encodeURIComponent(corpo) : '');
  const r = await fetch(url, { method: query ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: query ? undefined : corpo });
  const l = JSON.parse(await r.text());
  if (l[0].error) { const e = new Error(l[0].error.json.message); e.code = l[0].error.json.data.code; throw e; }
  return l[0].result.data.json;
}
const q = (p, i, t) => api(p, i, t, true), m = (p, i, t) => api(p, i, t, false);
async function erro(p) { try { await p; return null; } catch (e) { return e; } }
async function sqlT(sql, params) {
  const r = await fetch(BASE + '/__teste/sql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql, params }) });
  return (await r.json()).linhas;
}
async function conta(nome) {
  const r = await m('auth.registrar', { username: nome, nomeExibicao: nome, senha: 'senha1234', confirmacaoSenha: 'senha1234', email: nome + '@x.com', aceiteTermos: true });
  return { token: r.token, pub: r.conta.idPublico, nome };
}

async function principal() {
  const S = await sobe();
  BASE = 'http://127.0.0.1:' + S.porta;
  try {
    const A = await conta('rafa_correio');
    const agora = Date.now();
    console.log('1) uma carta para todo mundo com 250 moedas (como o RACHA CONTROL manda)');
    await sqlT('INSERT INTO "correio_global" ("tipo", "titulo", "corpo", "anexos", "inicio", "fim", "ativo", "criado_por", "criado_em") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['presente', 'Presente da quebrada', 'Valeu por jogar!', JSON.stringify([{ tipo: 'moedas', qtd: 250 }]), agora - 60000, agora + 7 * 864e5, 1, 1, agora - 60000]);
    let falhas = [], copias = [];
    for (let i = 0; i < 4; i++) {
      for (const [proc, inp] of [['correio.listar'], ['mensagens.listar'], ['social.resumo']]) {
        const r = await erro(q(proc, inp, A.token));
        if (r) falhas.push(proc + ': ' + r.message.slice(0, 120));
      }
      const l = await q('correio.listar', undefined, A.token);
      copias.push(l.filter((c) => c.titulo === 'Presente da quebrada').length);
    }
    confere(!falhas.length, 'o correio, as mensagens e o resumo do lobby abrem de novo e de novo (antes: quebravam depois da 1ª)', falhas);
    confere(copias.every((n) => n === 1), 'a carta chega uma vez só', copias);
    let resumo = await q('social.resumo', undefined, A.token);
    confere(resumo.correio >= 1, 'o lobby mostra a carta no correio (o pontinho)', resumo);

    console.log('\n2) COLETAR paga uma vez; APAGAR não traz a carta (nem o prêmio) de volta');
    const carta = (await q('correio.listar', undefined, A.token)).find((c) => c.titulo === 'Presente da quebrada');
    const antes = await q('loja.carteira', undefined, A.token);
    const col = await m('correio.coletar', { id: carta.id }, A.token);
    const dep1 = await q('loja.carteira', undefined, A.token);
    confere(col.moedas === 250 && dep1.moedas === antes.moedas + 250, 'COLETAR entrega as 250 moedas', [antes.moedas, dep1.moedas, col]);
    const col2 = await erro(m('correio.coletar', { id: carta.id }, A.token));
    confere(col2 && col2.code === 'CONFLICT', 'COLETAR de novo: já coletada', col2 && col2.message);
    const ap = await m('correio.apagar', { id: carta.id }, A.token);
    let l = await q('correio.listar', undefined, A.token);
    for (let i = 0; i < 3; i++) { await q('social.resumo', undefined, A.token); await q('mensagens.listar', undefined, A.token); l = await q('correio.listar', undefined, A.token); }
    confere(ap.ok && !l.some((c) => c.titulo === 'Presente da quebrada'), 'apagada, a carta não volta (o correio abriu de novo várias vezes)', l.map((c) => c.titulo));
    const todas = await m('correio.coletarTodas', undefined, A.token);
    const dep2 = await q('loja.carteira', undefined, A.token);
    const ganhoLogin = todas.moedas || 0;
    confere(dep2.moedas === dep1.moedas + ganhoLogin, 'e o prêmio dela não é pago de novo (COLETAR TUDO não acha nada dela)', [dep1.moedas, dep2.moedas, todas]);
    const linhas = await sqlT('SELECT COUNT(*) AS n FROM "correio" WHERE "usuario_id" = (SELECT "id" FROM "usuarios" WHERE "username" = ?) AND "chave" LIKE ?', ['rafa_correio', 'global:%']);
    confere(Number(linhas[0].n) === 1, 'no banco continua uma linha só da carta (marcada como apagada)', linhas);

    console.log('\n3) o aviso para todo mundo sem prêmio: chega uma vez na central (SISTEMA)');
    await sqlT('INSERT INTO "correio_global" ("tipo", "titulo", "corpo", "anexos", "inicio", "fim", "ativo", "criado_por", "criado_em") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['manutencao', 'Manutenção hoje às 3h', 'Dez minutos fora do ar.', '[]', agora - 1000, agora + 864e5, 1, 1, agora - 1000]);
    for (let i = 0; i < 3; i++) await q('social.resumo', undefined, A.token);
    const ms = await q('mensagens.listar', { categoria: 'sistema' }, A.token);
    confere(ms.filter((x) => x.titulo === 'Manutenção hoje às 3h').length === 1, 'o aviso aparece uma vez em SISTEMA', ms.map((x) => x.titulo));

    console.log('\n4) o login do dia: coletado e apagado, não volta no mesmo dia');
    l = await q('correio.listar', undefined, A.token);
    const login = l.find((c) => c.tipo === 'login');
    if (login) {
      if (!login.coletado) await m('correio.coletar', { id: login.id }, A.token).catch(() => {});
      await m('correio.apagar', { id: login.id }, A.token);
      for (let i = 0; i < 2; i++) await q('social.resumo', undefined, A.token);
      l = await q('correio.listar', undefined, A.token);
      confere(!l.some((c) => c.tipo === 'login' && !c.coletado), 'a recompensa de login apagada não volta para coletar de novo', l.map((c) => [c.tipo, c.titulo, c.coletado]));
    } else confere(true, '(sem evento de login ativo nesta plataforma de teste)');
  } finally {
    S.p.kill('SIGTERM');
  }
  console.log('\nv102 · o correio com o banco da produção: ' + ok + ' ok, ' + falhou + ' falharam');
  process.exit(falhou ? 1 : 0);
}
principal().catch((e) => { console.log('  FALHOU (erro) ' + (e && e.stack || e)); console.log('\nv102 · o correio: ' + ok + ' ok, ' + (falhou + 1) + ' falharam'); process.exit(1); });
