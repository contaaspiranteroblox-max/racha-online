import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const segredo = 'segredo-descartavel-da-suite';
const filho = fork(path.join(raiz, 'tests/plataforma/servidor.mjs'),
  ['--porta', '0', '--teste', '--sem-compilar', '--segredo', segredo],
  { silent: true, env: { ...process.env, RACHA_CADASTRO: 'aberto', RACHA_OWNER_PASSWORD: 'Dono-Temporario-Suite' } });
let log = '';
filho.stdout.on('data', d => { log += d; });
filho.stderr.on('data', d => { log += d; });
const pronto = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Plataforma não iniciou: ' + log)), 20000);
  filho.on('message', m => { if (m.pronto) { clearTimeout(timer); resolve(m); } });
  filho.once('exit', code => { clearTimeout(timer); reject(new Error('Plataforma saiu: ' + code + ' ' + log)); });
});
const base = `http://127.0.0.1:${pronto.porta}`;
let token = '';
async function api(nome, input, query = false) {
  const corpo = JSON.stringify({ 0: { json: input ?? null } });
  const url = base + '/api/trpc/' + nome + '?batch=1' + (query ? '&input=' + encodeURIComponent(corpo) : '');
  const res = await fetch(url, { method: query ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: query ? undefined : corpo });
  const item = (await res.json())[0];
  if (item.error) { const e = new Error(item.error.json.message); e.code = item.error.json.data.code; throw e; }
  return item.result.data.json;
}

try {
  const conta = await api('auth.registrar', { username: 'segurancaa', nomeExibicao: 'Jogador A', senha: 'segredo1234', confirmacaoSenha: 'segredo1234', aceiteTermos: true });
  token = conta.token;
  const antes = await api('loja.carteira', null, true);
  await assert.rejects(api('jogo.treinoConcluido', { exercicio: 'fantasia', estrelas: 3, recorde: true, nonce: 'abcdefgh' }), e => e.code === 'BAD_REQUEST');
  const valido = await api('jogo.treinoConcluido', { exercicio: 'final', estrelas: 3, recorde: true, nonce: 'abcdefgh1' });
  const gol = await api('jogo.golTreino', { quantidade: 3, origem: 'livre' });
  const depois = await api('loja.carteira', null, true);
  assert.equal(valido.gemas, 0); assert.equal(valido.moedas, 0);
  assert.equal(gol.xpConcedido, 0); assert.equal(gol.moedasGanhas, 0);
  assert.equal(depois.moedas, antes.moedas); assert.equal(depois.gemas, antes.gemas);

  const id = randomUUID();
  const ini = await api('jogo.iniciarPartida', { matchId: id, modo: 'futebol', online: false, ranqueada: true, nivelBots: 'lenda' });
  const bots = await api('jogo.encerrarPartida', { matchId: id, matchToken: ini.matchToken, placarNosso: 3, placarDeles: 0, gols: 3, assistencias: 0, duracaoSeg: 180 });
  assert.equal(bots.rq, null, 'resultado local não sobe a patente oficial');
  assert.equal(bots.xpConcedido, 0); assert.equal(bots.moedasGanhas, 0);
  const resumoLocal = await api('estat.resumo', { temporada: 'tudo', modo: 'tudo' }, true);
  assert.equal(resumoLocal.partidas, 0, 'resultado local não conta em estatísticas oficiais');
  assert.equal((await api('jogo.minhasPartidas', null, true)).length, 0, 'resultado local não aparece no histórico oficial');
  const patente = await api('perfil.minhaPatente', null, true);
  assert.equal(patente.pts, 0);
  const importacao = await api('perfil.importarPatente', { pts: 799 });
  assert.equal(importacao.importou, 0, 'patente local não entra pela rota legada');

  const outra = await api('auth.registrar', { username: 'segurancab', nomeExibicao: 'Jogador B', senha: 'segredo1234', confirmacaoSenha: 'segredo1234', aceiteTermos: true });
  token = outra.token;
  await api('progresso.salvar', { versaoBase: 0, dados: { v: 1, chaves: { 'streetball-conta-v1': JSON.stringify({ moedas: 50000, gemas: 5000, pecas: [] }) } } });
  const carteira = await api('loja.carteira', null, true);
  assert.equal(carteira.moedas, 500); assert.equal(carteira.gemas, 25);

  const { assina } = await import(path.join(raiz, 'tests/saida/plataforma.mjs'));
  const idOnline = randomUUID();
  const i2 = await api('jogo.iniciarPartida', { matchId: idOnline, modo: 'futebol', online: true });
  const agora = Date.now();
  const selo = assina(segredo, { s: 'teste', r: 1, j: outra.conta.idPublico, l: 0, p: [3, 0], m: 'futebol', d: 180, t: agora, e: agora + 60000, h: 1, pid: 'resultado-suite', gl: 0, as: 0, v: 0 });
  const fim = await api('jogo.encerrarPartida', { matchId: idOnline, matchToken: i2.matchToken, placarNosso: 3, placarDeles: 0, gols: 3, assistencias: 40, duracaoSeg: 180, online: true, selo });
  const hist = await api('jogo.minhasPartidas', null, true);
  assert.equal(fim.ok, true); assert.equal(hist[0].gols, 0); assert.equal(hist[0].assistencias, 0);
  console.log('Segurança: treino, save, patente e estatísticas assinadas — 7 fluxos verificados');
} finally {
  filho.kill('SIGTERM');
}
