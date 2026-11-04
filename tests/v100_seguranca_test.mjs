// RACHA v100 · A REVISÃO DE SEGURANÇA — o que o servidor e a plataforma garantem agora (sem navegador; o lado do jogo está
// em tests/v100_seguranca_test.py). Roda a plataforma de teste (o código de verdade de app/api, com SQLite) e o servidor
// das salas montado nela, e confere cada correção da v100 (o CHANGELOG.md, v100):
//   1) o selo do resultado: a mesma assinatura escrita de outro jeito não passa; o mesmo selo não vale duas vezes; a patente
//      anda uma vez por partida; a ranqueada online contra os bots (sem o:1) não mexe na patente;
//   2) o login: o limite por IP pelo endereço que o NOSSO proxy viu (não pelo começo do X-Forwarded-For, que o cliente
//      escreve); as tentativas erradas de cada conta, de qualquer endereço; o painel também;
//   3) o cookie da sessão com Secure por https; a sessão que renova não passa de 90 dias desde o login;
//   4) as salas: o token do aparelho de quem saiu da conta não abre a conta; a conta banida cai na hora e o bilhete de antes
//      não volta; o limite de conexões por endereço; o comando antigo (auto_*) com ritmo;
//   5) o servidor das salas sozinho (server/servidor.js): os cabeçalhos de proteção e o /health sem a pasta do disco;
//   6) o empacotamento: o .gitignore e o pacote recusam segredo, banco, chave e ZIP; o lançamento sem o presente de teste.
// Rodar: node tests/v100_seguranca_test.mjs
import { fork, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let ok = 0, falhou = 0;
const t0 = Date.now();
function confere(cond, txt, extra) {
  if (cond) { ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra).slice(0, 600) : '')); }
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const SEGREDO = 'segredo-da-suite-v100-' + crypto.randomBytes(4).toString('hex');
const SENHA_DONO = 'Dono-Teste-v100xQ';

function sobe(env) {
  return new Promise((res, rej) => {
    const e = { ...process.env, RACHA_CADASTRO: 'aberto', RACHA_OWNER_PASSWORD: SENHA_DONO, ...env };
    const p = fork(path.join(RAIZ, 'tests', 'plataforma', 'servidor.mjs'), ['--porta', '0', '--teste', '--sem-compilar', '--segredo', SEGREDO], { silent: true, env: e });
    let log = '';
    p.stdout.on('data', (d) => { log += d; }); p.stderr.on('data', (d) => { log += d; });
    p.on('message', (m) => { if (m && m.pronto) res({ p, porta: m.porta, log: () => log }); });
    p.once('exit', (c) => rej(new Error('a plataforma saiu: ' + c + ' ' + log)));
    setTimeout(() => rej(new Error('a plataforma de teste não subiu: ' + log)), 30000);
  });
}
async function desce(S) { if (!S) return; S.p.kill('SIGTERM'); await new Promise((r) => { S.p.once('exit', r); setTimeout(r, 3000); }); }
let BASE = '';
async function bruto(proc, input, { token, query, cab } = {}) {
  const corpo = JSON.stringify({ 0: { json: input === undefined ? null : input } });
  const url = BASE + '/api/trpc/' + proc + '?batch=1' + (query ? '&input=' + encodeURIComponent(corpo) : '');
  const r = await fetch(url, { method: query ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}), ...(cab || {}) }, body: query ? undefined : corpo });
  const l = JSON.parse(await r.text());
  return { r, um: l[0] };
}
async function api(proc, input, o = {}) {
  const { um } = await bruto(proc, input, o);
  if (um.error) { const e = new Error(um.error.json.message); e.code = um.error.json.data.code; throw e; }
  return um.result.data.json;
}
const q = (proc, input, token, cab) => api(proc, input, { token, query: true, cab });
const m = (proc, input, token, cab) => api(proc, input, { token, cab });
async function erro(p) { try { await p; return null; } catch (e) { return e; } }
async function sqlT(sql, params) {
  const r = await fetch(BASE + '/__teste/sql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql, params }) });
  const j = await r.json();
  if (!j.ok) throw new Error('sql: ' + j.erro + ' · ' + sql);
  return j.linhas;
}
function totp(segredoB32, t = Date.now()) {               // (o mesmo TOTP do app/api/racha/security.ts: RFC 6238, 30 s, 6 dígitos)
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = ''; for (const ch of segredoB32.replace(/=+$/, '').toUpperCase()) bits += B32.indexOf(ch).toString(2).padStart(5, '0');
  const chave = Buffer.alloc(Math.floor(bits.length / 8)); for (let i = 0; i < chave.length; i++) chave[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  const cont = Buffer.alloc(8); cont.writeBigUInt64BE(BigInt(Math.floor(t / 30000)));
  const h = crypto.createHmac('sha1', chave).update(cont).digest(); const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1000000)).padStart(6, '0');
}
async function painel(username, senha) {
  const lp = await m('admin.loginPainel', { username, senha });
  const u = (await sqlT('SELECT id FROM usuarios WHERE username = ?', [username]))[0];
  const seg = (await sqlT('SELECT segredo FROM totp WHERE usuario_id = ?', [u.id]))[0].segredo;
  await m('admin.verificar2fa', { token: lp.token, codigo: totp(seg) });
  return lp.token;
}
let nConta = 0;
async function conta(nome) {
  const n = ++nConta, u = (nome || 'jog') + n + crypto.randomBytes(2).toString('hex'), ip = '10.100.0.' + n;
  const r = await m('auth.registrar', { username: u, nomeExibicao: 'Jogador ' + n, senha: 'senha12345', confirmacaoSenha: 'senha12345', aceiteTermos: true }, null, { 'x-forwarded-for': ip });   // (um endereço por conta: o limite de cadastros é por IP)
  return { token: r.token, pub: r.conta.idPublico, username: u, ip };
}
function socket(o = {}) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(BASE.replace('http', 'ws') + '/', { headers: { Origin: BASE, ...(o.cookie ? { Cookie: 'racha_sessao=' + encodeURIComponent(o.cookie) } : {}) } });
    const k = {
      ws, caixa: [], fechou: null, manda: (x) => ws.send(JSON.stringify(x)),
      espera: async (tipo, cond, ms) => { const ini = Date.now(); for (;;) { const x = k.caixa.find((y) => y.type === tipo && (!cond || cond(y))); if (x) return x; if (Date.now() - ini > (ms || 4000)) return null; await espera(25); } },
      fecha: () => { try { ws.close(); } catch (_) {} },
      fechada: async (ms) => { const ini = Date.now(); while (k.fechou === null && Date.now() - ini < (ms || 3000)) await espera(25); return k.fechou; },   // (o servidor fecha o TCP até 200 ms depois do aviso)
    };
    ws.onmessage = (e) => { try { k.caixa.push(JSON.parse(e.data)); } catch (_) {} };
    ws.onopen = () => res(k); ws.onerror = () => rej(new Error('não conectou'));
    ws.onclose = (e) => { k.fechou = e.code; };
  });
}
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function variante(selo) {                                 // a mesma assinatura (os mesmos bytes) escrita de outro jeito
  const i = selo.indexOf('.'), corpo = selo.slice(0, i), sig = selo.slice(i + 1), ult = sig[sig.length - 1], idx = B64.indexOf(ult);
  for (let k = 1; k < 4; k++) { const c = B64[(idx & ~3) | ((idx + k) & 3)]; if (c !== ult) return corpo + '.' + sig.slice(0, -1) + c; }
  return selo + '=';
}

const P = await import(pathToFileURL(path.join(RAIZ, 'tests', 'saida', 'plataforma.mjs')).href);
let S = null;

/* ------------------------------------------------------------------------------ 0) o endereço de quem conecta */
console.log('0) o endereço de quem conecta (server/ip.js): o que o NOSSO proxy viu, nunca o que o cliente escreve');
{
  const I = require(path.join(RAIZ, 'server', 'ip.js'));
  const casos = [
    [['127.0.0.1', '9.9.9.9, 1.2.3.4'], '1.2.3.4', 'atrás do Caddy/nginx: o último da lista (o começo, o cliente escreve)'],
    [['203.0.113.7', '9.9.9.9'], '203.0.113.7', 'sem proxy na frente: o socket (a lista é ignorada)'],
    [['10.21.157.68', '1.2.3.4, 99.61.165.29, 104.22.17.40'], '99.61.165.29', 'no Render (Cloudflare na frente): o cliente, não a Cloudflare'],
    [['127.0.0.1', '172.70.1.2', null, '187.10.20.30'], '187.10.20.30', 'o proxy trocou a lista pela Cloudflare: o CF-Connecting-IP'],
    [['::1', '2804:14c:65a1:1234:aaaa:bbbb:cccc:dddd'], '2804:14c:65a1:1234::/64', 'IPv6: o bloco /64 (ninguém troca de endereço dentro do próprio bloco)'],
    [['127.0.0.1', '10.90.0.5'], '10.90.0.5', 'quem joga na mesma rede do servidor: o endereço da rede'],
  ];
  const ruins = casos.filter(([a, esp]) => I.ipDe(...a) !== esp).map(([a, esp]) => [a, I.ipDe(...a), esp]);
  process.env.RACHA_PROXIES = 'nenhum'; const nenhum = I.ipDe('127.0.0.1', '1.2.3.4'); delete process.env.RACHA_PROXIES;
  confere(!ruins.length && nenhum === '127.0.0.1', 'os ' + casos.length + ' casos (Caddy, direto, Render/Cloudflare, CF-Connecting-IP, IPv6 /64, rede local) e o RACHA_PROXIES=nenhum', ruins);
}

try {
  S = await sobe({ RACHA_TESTE_LATENCIA: '1' });     // (as consultas esperam a vez, como na rede do MySQL: os pedidos juntos se intercalam)
  BASE = 'http://127.0.0.1:' + S.porta;
  const dono = await painel('dono', SENHA_DONO);         // (o RACHA CONTROL antes do teste que trava a senha do painel)

  /* ------------------------------------------------------------------------------ 1) o selo do resultado */
  console.log('1) o selo do resultado: uma vez só, na escrita certa, e a patente só contra gente');
  {
    const ag = Date.now();
    const s0 = P.assina(SEGREDO, { s: 'ABC', r: 1, j: '000777', l: 0, p: [3, 0], m: 'futebol', d: 180, t: ag, e: ag + 60e3 });
    const outras = [variante(s0), s0 + '=', s0 + ' ', s0.replace(/.$/, (c) => c)];
    confere(!!P.confere(SEGREDO, s0) && outras.slice(0, 3).every((x) => P.confere(SEGREDO, x) === null), 'a assinatura só vale na escrita canônica (a mesma com outra letra no fim, "=" ou espaço: recusada)', outras.slice(0, 3).map((x) => !!P.confere(SEGREDO, x)));
    const banco = require(path.join(RAIZ, 'server', 'banco.js'));
    confere(!!banco.confere(SEGREDO, s0) && banco.confere(SEGREDO, variante(s0)) === null, 'e o servidor das salas confere igual (server/banco.js)');
  }
  const A = await conta('rq');
  const patente = async () => (await q('perfil.minhaPatente', null, A.token)).pts;
  async function partida(selo, ranqueada = true) {
    const id = crypto.randomUUID();
    const ini = await m('jogo.iniciarPartida', { matchId: id, modo: 'futebol', online: true, ranqueada, tamanho: 1 }, A.token);
    return m('jogo.encerrarPartida', { matchId: id, matchToken: ini.matchToken, placarNosso: 3, placarDeles: 0, gols: 3, assistencias: 0, duracaoSeg: 180, online: true, ranqueada, valida: true, selo }, A.token);
  }
  const seloRq = (o = {}) => { const ag = Date.now(); return P.assina(SEGREDO, Object.assign({ s: 'RQ' + crypto.randomBytes(3).toString('hex'), r: 1, j: A.pub, l: 0, p: [3, 0], m: 'futebol', d: 180, t: ag, e: ag + 40 * 60e3, k: 1, n: 1, h: 1, pid: 'p' + crypto.randomBytes(4).toString('hex'), gl: 3, as: 0, v: 1, o: 1 }, o)); };
  const p0 = await patente();
  const selo = seloRq();
  const r1 = await partida(selo);
  const p1 = await patente();
  confere(r1.rq && r1.rq.delta > 0 && p1 === p0 + r1.rq.delta, 'a vitória ranqueada (com gente do outro lado: o:1) sobe a patente uma vez (' + p0 + ' → ' + p1 + ')', r1.rq);
  const r2 = await partida(variante(selo)), r3 = await partida(selo + '='), r4 = await partida(selo);
  const p2 = await patente();
  confere(p2 === p1 && !(r2.rq && r2.rq.delta) && !(r3.rq && r3.rq.delta) && !(r4.rq && r4.rq.delta), 'o MESMO selo de novo — igual ou com a assinatura reescrita — não sobe mais nada (era o replay que inflava a patente)', [r2.motivo, r3.motivo, r4.motivo, p2]);
  confere(/já foi usado/.test(r4.motivo || '') && (r4.xpConcedido | 0) === 0, 'o selo repetido: "Esse resultado online já foi usado." e sem XP', r4.motivo);
  // v103: a ranqueada contra os bots que o SERVIDOR simulou (h:1, k:1, sem o:1) vale para a patente como contra os bots (com o
  // teto do dia) — antes valia como online comum, sem patente; o mesmo selo de novo continua sem valer nada
  const seloBots = seloRq({ o: undefined });
  const bots = await partida(seloBots);
  const p3 = await patente();
  confere(bots.ok && bots.rq && bots.rq.delta > 0 && p3 === p2 + bots.rq.delta, 'a ranqueada online contra os bots que a fila pôs do outro lado (sem o:1): vale para a patente como contra os bots (v103; ' + p2 + ' → ' + p3 + ')', { rq: bots.rq, xp: bots.xpConcedido });
  const bots2 = await partida(seloBots);
  confere((await patente()) === p3 && !(bots2.rq && bots2.rq.delta), 'e o mesmo selo dos bots de novo não sobe mais nada', bots2.motivo);

  {
    const seloPar = seloRq(), abertas = [];
    for (let i = 0; i < 8; i++) { const id = crypto.randomUUID(); const ini = await m('jogo.iniciarPartida', { matchId: id, modo: 'futebol', online: true, ranqueada: true, tamanho: 1 }, A.token); abertas.push([id, ini.matchToken]); }
    const m0 = (await q('loja.carteira', null, A.token)).moedas, pa = await patente();
    const rs = await Promise.all(abertas.map(([id, tk]) => m('jogo.encerrarPartida', { matchId: id, matchToken: tk, placarNosso: 3, placarDeles: 0, gols: 3, assistencias: 0, duracaoSeg: 180, online: true, valida: true, selo: seloPar }, A.token)));
    const usados = rs.filter((r) => /já foi usado/.test(r.motivo || '')).length, valeu = rs.find((r) => !/já foi usado/.test(r.motivo || ''));
    const m1 = (await q('loja.carteira', null, A.token)).moedas, pb = await patente();
    confere(usados === 7 && valeu && valeu.rq && pb - pa === valeu.rq.delta && m1 - m0 === (valeu.moedasGanhas | 0), 'o mesmo selo mandado 8 vezes AO MESMO TEMPO (8 partidas abertas): só um vale — a patente, as moedas e o XP uma vez (a trava é atômica)', { usados, rq: valeu && valeu.rq, moedas: [m0, m1] });
  }

  /* ------------------------------------------------------------------------------ 1b) a progressão que o aparelho manda */
  console.log('\n1b) a progressão: o que o aparelho manda não vira XP, patente, moedas nem vitórias da conta');
  {
    const oficial = async () => {
      const u = (await sqlT('SELECT id, xp, nivel FROM usuarios WHERE username = ?', [A.username]))[0];
      const rq = (await sqlT('SELECT pts, jogos, vit FROM ranqueada WHERE usuario_id = ?', [u.id]))[0] || null;
      const est = (await sqlT('SELECT vitorias, partidas FROM estatisticas WHERE usuario_id = ?', [u.id]))[0] || null;
      const cart = await q('loja.carteira', null, A.token);
      return { xp: u.xp, nivel: u.nivel, rq, est, moedas: cart.moedas, gemas: cart.gemas };
    };
    const antes = await oficial();
    const forjado = { 'streetball-conta-v1': JSON.stringify({ moedas: 999999, gemas: 99999, xp: 9999999, nivelConta: 80, rq: { pts: 5000, melhor: 5000, jogos: 300, vit: 300 } }),
      'racha-treino-perfil-v1': JSON.stringify({ nome: 'Forjado', st: { partidas: 500, vitorias: 499, gols: 2000 } }) };
    const sv = await m('progresso.salvar', { versaoBase: 0, dados: { v: 1, chaves: forjado } }, A.token);
    const imp = await m('perfil.importarPatente', { pts: 5000 }, A.token);
    const depois = await oficial();
    confere(sv.ok && imp.importou === 0 && JSON.stringify(depois) === JSON.stringify(antes), 'a cópia do aparelho com XP, patente, vitórias e moedas inventados fica só como cópia: a conta não muda (e a rota antiga de importar a patente dá 0)', { antes, depois, imp: imp.importou });
    const B = await conta('outro');
    const alheio = await partida(seloRq({ j: B.pub }));
    confere((alheio.xpConcedido | 0) === 0 && alheio.rq == null && /outra conta/.test(alheio.motivo || ''), 'o selo de outra conta não vale para esta ("Esse selo é de outra conta.")', alheio.motivo);
    const semMotor = await partida(seloRq({ h: undefined, gl: undefined, as: undefined, pid: undefined, o: undefined }), false);
    confere((semMotor.xpConcedido | 0) === 0 && semMotor.rq == null && JSON.stringify(await oficial()) === JSON.stringify(antes), 'o selo sem a partida no servidor (h:1 — a sala antiga com anfitrião) não dá resultado oficial', semMotor.motivo);
  }

  /* ------------------------------------------------------------------------------ 2) o login */
  console.log('\n2) o login: o limite por IP pelo endereço que o proxy viu e as tentativas erradas de cada conta');
  const L = await conta('login');
  let limitado = -1;
  for (let i = 0; i < 18 && limitado < 0; i++) {
    const e = await erro(m('auth.entrar', { identificador: 'ninguem' + i + 'x', senha: 'errada123' }, null, { 'x-forwarded-for': '198.51.100.' + i + ', 203.0.113.50' }));
    if (e && e.code === 'TOO_MANY_REQUESTS') limitado = i;
  }
  confere(limitado === 15, 'trocar o começo do X-Forwarded-For a cada tentativa não fura o limite por IP: vale o endereço que o proxy acrescentou (15 tentativas, a 16ª espera)', limitado);
  let travou = -1, msg = '';
  for (let i = 0; i < 12 && travou < 0; i++) {
    const e = await erro(m('auth.entrar', { identificador: L.username, senha: 'errada' + i }, null, { 'x-forwarded-for': '203.0.113.' + (100 + i) }));
    if (e && e.code === 'TOO_MANY_REQUESTS') { travou = i; msg = e.message; }
  }
  confere(travou === 10 && /tentativas erradas nessa conta/.test(msg), 'a conta: 10 senhas erradas de qualquer endereço e ela espera 15 minutos (a 11ª tentativa nem confere a senha)', [travou, msg]);
  const certa = await erro(m('auth.entrar', { identificador: L.username, senha: 'senha12345' }, null, { 'x-forwarded-for': '203.0.113.200' }));
  confere(certa && certa.code === 'TOO_MANY_REQUESTS', 'nem com a senha certa, até passar a espera (quem tenta adivinhar não descobre que acertou)', certa && certa.message);
  const deCasa = await erro(m('auth.entrar', { identificador: L.username, senha: 'senha12345' }, null, { 'x-forwarded-for': L.ip }));
  confere(deCasa === null, 'mas do endereço de onde ela já entrou (o do cadastro), a senha certa entra: quem tenta adivinhar não tranca o dono fora', deCasa && deCasa.message);
  const R = await conta('rajada');
  const rajada = await Promise.all(Array.from({ length: 20 }, (_, i) => erro(m('auth.entrar', { identificador: R.username, senha: 'errada-r' + i }, null, { 'x-forwarded-for': '198.18.0.' + (i + 1) }))));
  const conferidas = rajada.filter((e) => e && e.code === 'UNAUTHORIZED').length, barradas = rajada.filter((e) => e && e.code === 'TOO_MANY_REQUESTS').length;
  confere(conferidas === 10 && barradas === 10, '20 senhas erradas AO MESMO TEMPO, de 20 endereços: só 10 chegam a ser conferidas (a contagem é atômica)', { conferidas, barradas });
  const outra = await conta('outra');
  const ok2 = await m('auth.entrar', { identificador: outra.username, senha: 'senha12345' }, null, { 'x-forwarded-for': '203.0.113.201' });
  confere(!!(ok2 && ok2.token), 'outra conta entra normalmente');
  let travouP = -1;
  for (let i = 0; i < 7 && travouP < 0; i++) {
    const e = await erro(m('admin.loginPainel', { username: 'dono', senha: 'errada-' + i }, null, { 'x-forwarded-for': '192.0.2.' + (10 + i) }));
    if (e && e.code === 'TOO_MANY_REQUESTS') travouP = i;
  }
  confere(travouP === 5, 'o RACHA CONTROL: 5 senhas erradas da mesma conta, de endereços diferentes, e ela espera', travouP);
  const fora = await erro(m('admin.loginPainel', { username: 'dono', senha: SENHA_DONO }, null, { 'x-forwarded-for': '192.0.2.99' }));
  const dono2 = await erro(painel('dono', SENHA_DONO));
  confere(fora && fora.code === 'TOO_MANY_REQUESTS' && dono2 === null, 'travado: de um endereço novo nem a senha certa entra; do endereço de sempre, o Dono entra (com o 2FA)', [fora && fora.message, dono2 && dono2.message]);

  /* ------------------------------------------------------------------------------ 3) o cookie e a sessão */
  console.log('\n3) o cookie da sessão (Secure por https) e a sessão que não renova para sempre');
  const C = await conta('cookie');
  const vhttps = await bruto('auth.entrar', { identificador: C.username, senha: 'senha12345' }, { cab: { 'x-forwarded-proto': 'https' } });
  const vhttp = await bruto('auth.entrar', { identificador: C.username, senha: 'senha12345' });
  const ck = (x) => (typeof x.r.headers.getSetCookie === 'function' ? x.r.headers.getSetCookie() : []).join(' | ');
  confere(/racha_sessao=[^;]+;.*HttpOnly.*SameSite=Lax.*Secure/.test(ck(vhttps)) && !/Secure/.test(ck(vhttp)), 'o cookie da conta sai com Secure quando o pedido chegou por https (o proxy diz) — e sem, por http (a rede local continua entrando)', [ck(vhttps), ck(vhttp)]);
  const tok = vhttp.um.result.data.json.token;
  const sess = (await sqlT('SELECT id, criada_em, expira_em FROM sessoes WHERE usuario_id = (SELECT id FROM usuarios WHERE username = ?) ORDER BY id DESC LIMIT 1', [C.username]))[0];
  const DIA = 24 * 3600e3, agora = Date.now();
  await sqlT('UPDATE sessoes SET criada_em = ?, expira_em = ? WHERE id = ?', [agora - 80 * DIA, agora + 2 * DIA, sess.id]);
  const e80 = await q('auth.eu', null, tok);
  const s80 = (await sqlT('SELECT criada_em, expira_em FROM sessoes WHERE id = ?', [sess.id]))[0];
  confere(e80.logado === true && s80.expira_em <= s80.criada_em + 90 * DIA + 1000 && s80.expira_em > agora + 2 * DIA, 'com 80 dias, a sessão ainda vale e renova — só até completar 90 dias do login', { exp: (s80.expira_em - s80.criada_em) / DIA });
  await sqlT('UPDATE sessoes SET criada_em = ?, expira_em = ? WHERE id = ?', [agora - 91 * DIA, agora + 10 * DIA, sess.id]);
  const e91 = await q('auth.eu', null, tok);
  confere(e91.logado === false, 'com 91 dias, a sessão venceu (o jogo pede para entrar de novo), mesmo com o prazo do banco adiante', e91);

  /* ------------------------------------------------------------------------------ 4) as salas */
  console.log('\n4) as salas: o token de quem saiu da conta, a conta banida, o comando antigo');
  const V = await conta('vit');
  const w1 = await socket({ cookie: V.token });
  w1.manda({ type: 'hello', name: 'Vitima', v93: 1, cr: 1 });
  const h1 = await w1.espera('hello');
  w1.fecha(); await espera(150);
  confere(h1 && /^c\d+$/.test(h1.id), 'a conta entra nas salas com o lugar dela (o id da conta) e recebe o token do aparelho', h1 && h1.id);
  const w2 = await socket();
  w2.manda({ type: 'hello', name: 'Outro', token: h1.token, v93: 1, cr: 1 });
  const h2 = await w2.espera('hello');
  w2.fecha(); await espera(100);
  confere(h2 && h2.id !== h1.id && !/^c/.test(h2.id) && h2.token !== h1.token, 'quem abre sem a conta com aquele token (o mesmo aparelho, depois de sair) entra como visitante novo — não como a conta', h2 && { id: h2.id });
  const wb = await socket();
  wb.manda({ type: 'brasil_join', name: 'Outro', token: h1.token });
  const hb = await wb.espera('brasil_hello');
  wb.fecha();
  confere(hb && hb.id && !/^c/.test(hb.id), 'e no Chat do Brasil também: aquele token sem a conta não fala como a conta', hb && hb.id);
  const bil = (await m('jogo.bilheteSala', {}, V.token)).bilhete;
  const w3 = await socket();
  w3.manda({ type: 'hello', name: 'Vitima', conta: bil, v93: 1, cr: 1 });
  const h3 = await w3.espera('hello');
  confere(h3 && h3.id === h1.id, 'com o bilhete da conta, o lugar da conta de novo', h3 && h3.id);
  await m('admin.punir', { termo: V.username, tipo: 'banimento', motivo: 'teste da v100', confirmacao: true }, dono);
  const err = await w3.espera('error', (x) => x.codigo === 'conta_suspensa', 3000);
  await w3.fechada();
  confere(err && w3.fechou === 4003, 'banida no RACHA CONTROL: a conexão dela nas salas cai na hora (código 4003)', { err: err && err.message, fechou: w3.fechou });
  const w4 = await socket();
  w4.manda({ type: 'hello', name: 'Vitima', conta: bil, v93: 1, cr: 1 });
  const e4 = await w4.espera('error', (x) => x.codigo === 'conta_suspensa', 3000);
  await w4.fechada();
  confere(e4 && !w4.caixa.some((x) => x.type === 'hello'), 'e o bilhete de antes (ainda no prazo) não abre outra conexão', e4 && e4.message);
  w4.fecha();
  const w6 = await socket();
  w6.manda({ type: 'brasil_join', name: 'Vitima', conta: bil });
  const e6b = await w6.espera('error', (x) => x.codigo === 'conta_suspensa', 3000);
  await w6.fechada();
  confere(e6b && !w6.caixa.some((x) => x.type === 'brasil_hello'), 'nem entra no Chat do Brasil com o bilhete de antes', e6b && e6b.message);
  const pun = (await sqlT('SELECT id FROM punicoes WHERE usuario_id = (SELECT id FROM usuarios WHERE username = ?) AND ativa = 1 ORDER BY id DESC LIMIT 1', [V.username]))[0];
  await m('admin.revogarPunicao', { punicaoId: pun.id, confirmacao: true }, dono);
  const V2 = await m('auth.entrar', { identificador: V.username, senha: 'senha12345' });
  const bil2 = (await m('jogo.bilheteSala', {}, V2.token)).bilhete;
  const w7 = await socket();
  w7.manda({ type: 'hello', name: 'Vitima', conta: bil2, v93: 1, cr: 1 });
  const h7 = await w7.espera('hello');
  w7.fecha();
  confere(h7 && h7.id === h1.id, 'o RACHA CONTROL tirou o banimento: com o bilhete novo, a conta volta para as salas na hora (sem reiniciar o servidor)', h7 && h7.id);
  const w5 = await socket();
  w5.manda({ type: 'hello', name: 'Spam', v93: 1 });
  await w5.espera('hello');
  for (let i = 0; i < 400; i++) w5.manda({ type: 'auto_status' });
  await espera(600);
  const st = w5.caixa.filter((x) => x.type === 'auto_status').length;
  confere(st > 0 && st < 150, 'o comando da partida antiga (auto_status) com ritmo: 400 de uma vez, só ' + st + ' respondidos', st);
  w5.fecha();
} catch (e) {
  confere(false, 'a parte da plataforma rodou até o fim', String(e && e.stack || e));
} finally {
  await desce(S);
}

/* ------------------------------------------------------------------------------ 4b) o limite de conexões por endereço */
console.log('\n4b) o limite de conexões abertas por endereço (o servidor das salas)');
try {
  S = await sobe({ RACHA_CONEXOES_IP: '5', RACHA_PRAZO_HELLO_MS: '2500', RACHA_COOKIE_SEGURO: '1' });
  BASE = 'http://127.0.0.1:' + S.porta;
  const ws = [];
  for (let i = 0; i < 6; i++) { const k = await socket(); if (i < 5) k.manda({ type: 'hello', name: 'Gente' + i, v93: 1 }); ws.push(k); }
  const recusada = ws[5];
  await recusada.fechada(); await espera(150);
  const e6 = recusada.caixa.find((x) => x.type === 'error' && x.codigo === 'conexoes');
  confere(ws.slice(0, 5).every((k) => k.fechou === null) && e6 && recusada.fechou === 1013, 'RACHA_CONEXOES_IP=5: as 5 primeiras ficam, a 6ª do mesmo endereço é recusada (1013, com o aviso)', { fechou: ws.map((k) => k.fechou) });
  ws[0].fecha(); await ws[0].fechada(); await espera(150);
  const nova = await socket(); await espera(300);
  confere(nova.fechou === null, 'uma fechou: cabe outra de novo');
  for (const k of ws.concat([nova])) k.fecha();
  await espera(300);
  const muda = await socket(), fala = await socket();
  fala.manda({ type: 'hello', name: 'Fala', v93: 1 });
  await muda.fechada(5000);
  confere(muda.fechou === 4008 && fala.fechou === null, 'a conexão que não se apresenta (sem hello) cai no prazo (RACHA_PRAZO_HELLO_MS) e não fica ocupando lugar; a que se apresentou fica', [muda.fechou, fala.fechou]);
  fala.fecha();
  const Z = await conta('seguro');
  const vz = await bruto('auth.entrar', { identificador: Z.username, senha: 'senha12345' });
  const ckz = (typeof vz.r.headers.getSetCookie === 'function' ? vz.r.headers.getSetCookie() : []).join(' | ');
  confere(/racha_sessao=[^;]+;.*Secure/.test(ckz), 'RACHA_COOKIE_SEGURO=1: o cookie sai com Secure mesmo sem o proxy dizer https', ckz);
} catch (e) {
  confere(false, 'o limite de conexões rodou até o fim', String(e && e.stack || e));
} finally {
  await desce(S);
}

/* ------------------------------------------------------------------------------ 5) o servidor das salas sozinho */
console.log('\n5) o servidor das salas sozinho (server/servidor.js): os cabeçalhos e o /health');
{
  const porta = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'racha100-'));   // (com a pasta de verdade: era ela que o /health mostrava)
  const srv = spawn('node', [path.join(RAIZ, 'server', 'servidor.js'), '--porta', String(porta), '--host', '127.0.0.1', '--dados', path.join(tmp, 'turma.json'), '--mapas', path.join(tmp, 'mapas'), '--visitantes'], { stdio: 'ignore' });
  try {
    let r = null;
    for (let i = 0; i < 60 && !r; i++) { try { r = await fetch('http://127.0.0.1:' + porta + '/game/config.js'); } catch (_) { await espera(100); } }
    const h = r.headers;
    confere(h.get('x-content-type-options') === 'nosniff' && h.get('referrer-policy') === 'same-origin' && /frame-ancestors 'self'/.test(h.get('content-security-policy') || '') && /object-src 'none'/.test(h.get('content-security-policy') || '') && /camera=\(\)/.test(h.get('permissions-policy') || '') && !h.get('strict-transport-security'),
      'os arquivos do jogo saem com nosniff, Referrer-Policy, CSP (frame-ancestors, object-src, base-uri) e Permissions-Policy; sem HSTS por http', Object.fromEntries(h));
    const rs = await fetch('http://127.0.0.1:' + porta + '/health', { headers: { 'x-forwarded-proto': 'https' } });
    const saude = await rs.json();
    confere(rs.headers.get('strict-transport-security') && saude.ok === true && !JSON.stringify(saude).includes('pasta') && !JSON.stringify(saude).includes(tmp) && saude.mapas && saude.mapas.salvos === true, 'por https (o proxy diz): o HSTS; e o /health não mostra mais a pasta do disco (só se os mapas ficam salvos)', saude);
  } finally { srv.kill(); await espera(200); fs.rmSync(tmp, { recursive: true, force: true }); }
}

/* ------------------------------------------------------------------------------ 6) o empacotamento */
console.log('\n6) o empacotamento: segredo, banco, chave e ZIP não saem; o lançamento sem o presente de teste');
{
  const gi = fs.readFileSync(path.join(RAIZ, '.gitignore'), 'utf8');
  confere(['.env', '*.db', '*.sqlite', '*.zip', '*.pem', '*.key', '*.jks', '*.keystore'].every((p) => gi.split('\n').includes(p)) && gi.includes('!.env.example'), 'o .gitignore da raiz ignora .env, bancos, ZIPs, chaves e as chaves do Android');
  const pc = fs.readFileSync(path.join(RAIZ, 'tools', 'v92', 'pacote.py'), 'utf8');
  confere(/PROIBIDOS = \[/.test(pc) && /assert not proibidos/.test(pc) && /--lancamento/.test(pc) && /o ZIP do lançamento tem o presente de teste/.test(pc), 'o pacote recusa esses arquivos (na lista e na conferência do ZIP pronto) e tem o --lancamento sem o presente');
}

console.log('\nv100 · a revisão de segurança: ' + ok + '/' + (ok + falhou) + ' ok em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(falhou ? 1 : 0);
