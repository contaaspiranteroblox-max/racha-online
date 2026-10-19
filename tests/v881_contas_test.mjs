// RACHA · v88.1 — AS CONTAS PELO DONO, na plataforma de verdade (a plataforma de teste: as rotas de app/api em cima de um
// SQLite, com o servidor das salas montado no mesmo endereço). Confere, com o banco de verdade e WebSockets de verdade:
//   · o cadastro fechado por padrão (o jogo e o site não criam conta) e a senha do manual (Racha@Dono1) recusada;
//   · a senha do Dono vindo de RACHA_OWNER_PASSWORD no boot (as sessões antigas caem, o 2FA é zerado);
//   · RACHA CONTROL › Contas: criar conta (senha gerada ou escolhida, os erros com mensagem limpa), só o Dono (o administrador
//     e a sessão de jogo recusados), a senha nova (as sessões da conta caem), abrir e fechar o cadastro;
//   · o ZERAR CONTAS: senha e palavra conferidas, só o 000001, as contas e tudo o que era delas saem de todas as tabelas, o
//     Dono fica (com o clube dele, só com ele), os números voltam a contar do 000002, o servidor das salas derruba e esquece
//     as contas apagadas e recusa o bilhete assinado antes — e a conta nova com o número de volta não herda nada;
//   · reiniciando com o mesmo banco e outra senha na variável: a senha nova vale, a velha não, e o zerar continua valendo.
//   node tests/v881_contas_test.mjs
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
  else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra).slice(0, 500) : '')); }
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const banco = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'racha881-')), 'plataforma.sqlite');
const SENHA_DONO = 'Dono-Teste-881xQ', SENHA_DONO2 = 'Outra-Senha-881zK';

function sobe(env) {
  return new Promise((res, rej) => {
    const e = { ...process.env, ...env };
    for (const k of ['RACHA_CADASTRO', 'RACHA_OWNER_PASSWORD', 'RACHA_OWNER_USERNAME', 'RACHA_PRESENTE_TESTE']) if (!(k in env)) delete e[k];
    const p = fork(path.join(RAIZ, 'tests', 'plataforma', 'servidor.mjs'), ['--porta', '0', '--teste', '--banco', banco, '--sem-compilar'], { silent: true, env: e });
    let log = '';
    p.stdout.on('data', (d) => { log += d; }); p.stderr.on('data', (d) => { log += d; });
    p.on('message', (m) => { if (m && m.pronto) res({ p, porta: m.porta, log: () => log }); });
    setTimeout(() => rej(new Error('a plataforma de teste não subiu: ' + log)), 30000);
  });
}
async function desce(S) { S.p.kill('SIGTERM'); await new Promise((r) => S.p.once('exit', r)); }
let BASE = '';
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
async function painel(username, senha) {                  // o login do RACHA CONTROL com o 2FA (o segredo lido do banco)
  const lp = await m('admin.loginPainel', { username, senha });
  const u = (await sqlT('SELECT id FROM usuarios WHERE username = ?', [username]))[0];
  const seg = (await sqlT('SELECT segredo FROM totp WHERE usuario_id = ?', [u.id]))[0].segredo;
  await m('admin.verificar2fa', { token: lp.token, codigo: totp(seg) });
  return { token: lp.token, configurou: lp.configurar2fa };
}
const entra = (identificador, senha) => m('auth.entrar', { identificador, senha });
function socket(token, origem) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(BASE.replace('http', 'ws') + '/', { headers: { Origin: origem, ...(token ? { Cookie: 'racha_sessao=' + encodeURIComponent(token) } : {}) } });
    const k = {
      ws, caixa: [], fechou: null, manda: (x) => ws.send(JSON.stringify(x)),
      espera: async (tipo, cond, ms) => { const t0 = Date.now(); for (;;) { const x = k.caixa.find((y) => y.type === tipo && (!cond || cond(y))); if (x) return x; if (Date.now() - t0 > (ms || 4000)) return null; await espera(25); } },
    };
    ws.onmessage = (e) => k.caixa.push(JSON.parse(e.data)); ws.onopen = () => res(k); ws.onerror = () => rej(new Error('não conectou'));
    ws.onclose = (e) => { k.fechou = e.code; };
  });
}
// as colunas que apontam para uma conta (o número interno): depois do zerar, nenhuma linha pode apontar para uma conta apagada
const COL_CONTA = /^(usuario_id|amigo_id|bloqueado_id|de_id|para_id|autor_id|alvo_id|alvo_usuario_id|pedido_por_id|dono_id)$/;
const FICA = new Set(['auditoria.alvo_id']);               // (a auditoria guarda o histórico: os números internos não voltam)

async function principal() {
  // ======================================================================= 1º boot: sem a variável (a senha do manual)
  let S = await sobe({});
  BASE = 'http://127.0.0.1:' + S.porta;
  let antigoBilhete = null, donoTok = null, lp = null;
  try {
    console.log('1) o cadastro fechado por padrão');
    const cad = await q('auth.cadastro');
    confere(cad && cad.aberto === false, 'auth.cadastro: fechado (sem nada no banco e sem RACHA_CADASTRO)', cad);
    const reg = await erro(m('auth.registrar', { username: 'curioso1', nomeExibicao: 'Curioso', senha: 'senha1234', confirmacaoSenha: 'senha1234', email: 'c@x.com', aceiteTermos: true }));
    confere(reg && reg.code === 'FORBIDDEN' && /cadastro está fechado/.test(reg.message), 'o CRIAR CONTA de fora é recusado com a explicação', reg && reg.message);
    confere((await sqlT('SELECT COUNT(*) AS n FROM usuarios'))[0].n === 1, 'e nenhuma conta foi criada (só o Dono)');

    console.log('\n2) a senha do manual (pública no repositório) não abre nada');
    const pm = await erro(m('admin.loginPainel', { username: 'dono', senha: 'Racha@Dono1' }));
    confere(pm && pm.code === 'FORBIDDEN' && /RACHA_OWNER_PASSWORD/.test(pm.message), 'o RACHA CONTROL recusa a senha do manual (e diz o que fazer)', pm && pm.message);
    const em = await erro(entra('dono', 'Racha@Dono1'));
    confere(em && em.code === 'FORBIDDEN', 'e o login do jogo também (a conta do Dono)', em && em.message);
    confere((await sqlT('SELECT COUNT(*) AS n FROM totp'))[0].n === 0, 'o 2FA não chegou a ser gerado (ninguém chega antes do Dono na chave)');
    const aud = await sqlT("SELECT resultado, detalhes FROM auditoria WHERE acao = 'login_painel' ORDER BY id DESC LIMIT 1");
    confere(aud.length && aud[0].resultado === 'negado' && /manual/.test(aud[0].detalhes), 'a tentativa fica na auditoria', aud);
  } finally { await desce(S); }

  // ======================================================================= 2º boot: RACHA_OWNER_PASSWORD definida
  S = await sobe({ RACHA_OWNER_PASSWORD: SENHA_DONO });
  BASE = 'http://127.0.0.1:' + S.porta;
  const ORIGEM = BASE;
  try {
    console.log('\n3) o boot aplica a senha da variável na conta do Dono');
    const e1 = await entra('dono', SENHA_DONO);
    donoTok = e1.token;
    confere(e1.conta.idPublico === '000001' && e1.conta.zeradoEm === null, 'o Dono entra com a senha da variável (000001; nunca zerado)', e1.conta);
    const e0 = await erro(entra('dono', 'Racha@Dono1'));
    confere(e0 && (e0.code === 'UNAUTHORIZED' || e0.code === 'FORBIDDEN'), 'a senha do manual não serve mais');
    lp = await painel('dono', SENHA_DONO);
    confere(lp.configurou === true, 'o painel pede para configurar o 2FA (é a primeira vez com a senha nova)');
    const tc = await erro(m('auth.trocarSenha', { senhaAtual: SENHA_DONO, novaSenha: 'qualquer-coisa-9' }, donoTok));
    confere(tc && tc.code === 'FORBIDDEN' && /RACHA_OWNER_PASSWORD/.test(tc.message), 'com a variável definida, a senha do Dono não muda pelo site (o aviso diz onde trocar)', tc && tc.message);

    console.log('\n4) RACHA CONTROL › Contas: criar as contas (só o Dono)');
    let est = await q('donoContas.estado', undefined, lp.token);
    confere(est.cadastro.aberto === false && est.cadastro.fonte === 'padrao' && est.total === 1 && est.proximo === '000002' && est.podeZerar === true && est.zeradoEm === null,
      'o resumo: cadastro fechado (padrão), 1 conta, a próxima é a 000002', est);
    const k1 = await m('donoContas.criar', { username: 'Kauazin7', nomeExibicao: 'Kauã', aceiteTermos: true }, lp.token);
    confere(k1.idPublico === '000002' && k1.username === 'kauazin7' && k1.senhaGerada && /^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/.test(k1.senha) && /^RACHA-/.test(k1.codigoRecuperacao),
      'conta criada: 000002, o usuário em minúsculas, a senha gerada (fácil de ditar) e o código de recuperação', k1);
    const k2 = await m('donoContas.criar', { username: 'lucasznx', nomeExibicao: 'Lucas ZN', email: 'Lucas@X.com', senha: 'bola-na-rede-9', aceiteTermos: true }, lp.token);
    confere(k2.idPublico === '000003' && !k2.senhaGerada && k2.senha === 'bola-na-rede-9' && k2.email === 'lucas@x.com', 'a segunda (000003) com a senha escolhida e o e-mail', k2);
    const K1 = await entra('kauazin7', k1.senha), K2 = await entra('lucas@x.com', 'bola-na-rede-9');
    confere(K1.conta.idPublico === '000002' && K2.conta.idPublico === '000003', 'as duas entram no jogo com o usuário (ou o e-mail) e a senha que o Dono mandou');
    const eu1 = await q('auth.eu', undefined, K1.token);
    confere(eu1.logado && eu1.conta.cargo === null && eu1.conta.zeradoEm === null && eu1.conta.depoisDoZerar === false, 'auth.eu: a conta comum, sem cargo (e nunca houve zerar)', eu1.conta && { cargo: eu1.conta.cargo, z: eu1.conta.zeradoEm, d: eu1.conta.depoisDoZerar });
    const dup = await erro(m('donoContas.criar', { username: 'kauazin7', nomeExibicao: 'Outro', aceiteTermos: true }, lp.token));
    const dupEm = await erro(m('donoContas.criar', { username: 'outro77', nomeExibicao: 'Outro', email: 'lucas@x.com', aceiteTermos: true }, lp.token));
    const ruim = await erro(m('donoContas.criar', { username: 'Kauã Silva', nomeExibicao: 'Kauã', aceiteTermos: true }, lp.token));
    const curta = await erro(m('donoContas.criar', { username: 'tuca', nomeExibicao: 'Tuca', senha: '123', aceiteTermos: true }, lp.token));
    const manual = await erro(m('donoContas.criar', { username: 'tuca', nomeExibicao: 'Tuca', senha: 'Racha@Dono1', aceiteTermos: true }, lp.token));
    const termos = await erro(m('donoContas.criar', { username: 'tuca', nomeExibicao: 'Tuca' }, lp.token));
    confere(dup && dup.code === 'CONFLICT' && dupEm && dupEm.code === 'CONFLICT', 'usuário ou e-mail repetido: recusado', [dup && dup.message, dupEm && dupEm.message]);
    confere(ruim && ruim.code === 'BAD_REQUEST' && /letras minúsculas/.test(ruim.message) && curta && /8 caracteres/.test(curta.message) && manual && /pública/.test(manual.message) && termos && /termos/.test(termos.message),
      'os erros chegam com a mensagem limpa (usuário com espaço/acento, senha curta, a senha do manual, sem o aceite dos termos)', [ruim && ruim.message, curta && curta.message, manual && manual.message, termos && termos.message]);
    confere((await sqlT('SELECT COUNT(*) AS n FROM usuarios'))[0].n === 3, 'nenhuma conta a mais foi criada pelos pedidos recusados');
    const jog = await erro(m('donoContas.criar', { username: 'hacker1', nomeExibicao: 'Hacker', aceiteTermos: true }, K1.token));
    confere(jog && (jog.code === 'FORBIDDEN' || jog.code === 'UNAUTHORIZED'), 'a sessão de jogo não cria conta', jog && jog.message);
    // um administrador (cargo da equipe, mas não o Dono) também não
    const k1id = (await sqlT("SELECT id FROM usuarios WHERE username = 'kauazin7'"))[0].id;
    await sqlT("INSERT INTO cargos (usuario_id, cargo, concedido_por, permissoes, criado_em) VALUES (?, 'administrador', 1, NULL, ?)", [k1id, Date.now()]);
    const adm = await painel('kauazin7', k1.senha);
    const admCria = await erro(m('donoContas.criar', { username: 'hacker1', nomeExibicao: 'Hacker', aceiteTermos: true }, adm.token));
    const admZera = await erro(m('donoContas.zerar', { senha: k1.senha, confirmacao: 'ZERAR' }, adm.token));
    const admVe = await erro(q('donoContas.listar', { busca: '' }, adm.token));
    confere(admCria && admCria.code === 'FORBIDDEN' && /Dono/.test(admCria.message) && admZera && admZera.code === 'FORBIDDEN' && admVe && admVe.code === 'FORBIDDEN',
      'o administrador da equipe não cria, não lista e não zera contas', [admCria && admCria.message, admZera && admZera.message]);
    const negado = await sqlT("SELECT COUNT(*) AS n FROM auditoria WHERE acao = 'conta_criar' AND resultado = 'negado'");
    confere(negado[0].n >= 1, 'a tentativa do administrador fica na auditoria');
    await sqlT('DELETE FROM cargos WHERE usuario_id = ?', [k1id]);
    await sqlT('UPDATE sessoes SET revogada_em = ? WHERE token_hash = ?', [Date.now(), crypto.createHash('sha256').update(adm.token).digest('hex')]);
    const lista = await q('donoContas.listar', { busca: '' }, lp.token);
    const busca = await q('donoContas.listar', { busca: 'kaua' }, lp.token), buscaId = await q('donoContas.listar', { busca: '3' }, lp.token);
    confere(lista.length === 3 && lista[0].dono && lista[0].idPublico === '000001' && busca.length === 1 && busca[0].username === 'kauazin7' && buscaId.some((x) => x.idPublico === '000003'),
      'a lista das contas (o Dono marcado) e a busca por nome e por ID', [lista.map((x) => x.idPublico), busca.length, buscaId.map((x) => x.idPublico)]);

    console.log('\n5) a senha nova de uma conta');
    const ns = await m('donoContas.novaSenha', { conta: '000003' }, lp.token);
    const velhoK2 = await q('auth.eu', undefined, K2.token);
    const k2n = await entra('lucasznx', ns.senha), k2v = await erro(entra('lucasznx', 'bola-na-rede-9'));
    confere(ns.idPublico === '000003' && !velhoK2.logado && k2n.token && k2v && k2v.code === 'UNAUTHORIZED', 'a senha nova vale, a velha não e a sessão de antes caiu', [ns.idPublico, velhoK2.logado]);
    K2.token = k2n.token;
    const recVelho = await erro(m('auth.recuperar', { username: 'lucasznx', codigo: k2.codigoRecuperacao, novaSenha: 'tentativa-123' }));
    confere(/^RACHA-/.test(ns.codigoRecuperacao || '') && ns.codigoRecuperacao !== k2.codigoRecuperacao && recVelho && recVelho.code === 'UNAUTHORIZED',
      'e o código de recuperação também é trocado (o antigo, se alguém mais tiver, não troca a senha de novo)', [ns.codigoRecuperacao, recVelho && recVelho.message]);
    const nsDono = await erro(m('donoContas.novaSenha', { conta: '000001' }, lp.token));
    confere(nsDono && nsDono.code === 'FORBIDDEN', 'a senha do Dono não muda por aqui (vem da variável)', nsDono && nsDono.message);

    console.log('\n6) abrir e fechar o cadastro público');
    const ab = await m('donoContas.cadastro', { aberto: true }, lp.token);
    const cad2 = await q('auth.cadastro');
    const pub = await m('auth.registrar', { username: 'santiagox', nomeExibicao: 'Santiago', senha: 'senha1234', confirmacaoSenha: 'senha1234', email: 's@x.com', aceiteTermos: true });
    confere(ab.cadastro.aberto && ab.cadastro.fonte === 'painel' && cad2.aberto && pub.conta.idPublico === '000004', 'aberto pelo painel: o CRIAR CONTA do jogo volta a funcionar (000004)', [ab.cadastro, pub.conta.idPublico]);
    const K3 = { token: pub.token };
    await m('donoContas.cadastro', { aberto: false }, lp.token);
    const reg2 = await erro(m('auth.registrar', { username: 'outro99', nomeExibicao: 'Outro', senha: 'senha1234', confirmacaoSenha: 'senha1234', email: 'o@x.com', aceiteTermos: true }));
    confere(reg2 && reg2.code === 'FORBIDDEN' && !(await q('auth.cadastro')).aberto, 'fechado de novo: recusado outra vez', reg2 && reg2.message);

    console.log('\n7) a vida das contas antes do zerar (amigos, clube, mensagens, carta, denúncia, partida, as salas)');
    await sqlT('UPDATE usuarios SET criado_em = criado_em - 3600000');
    await m('amigos.enviarPedido', { termo: '000003' }, K1.token);
    const ped = await q('amigos.pedidos', undefined, K2.token);
    await m('amigos.responderPedido', { pedidoId: ped.recebidos[0].pedidoId, aceitar: true }, K2.token);
    await m('amigos.enviarPedido', { termo: '000001' }, K1.token);                       // (fica pendente para o Dono)
    await m('amigos.bloquear', { termo: '000002' }, K3.token);
    await m('amigos.denunciar', { termo: '000002', motivo: 'toxico', detalhes: 'xingou' }, K3.token);
    const clK = await m('clubes.criar', { nome: 'Racha FC', descricao: 'Rua!', pais: 'BR', tipo: 'publico', trofeuMinimo: 0 }, K1.token);
    await m('clubes.entrar', { id: clK.id }, K2.token);
    const clD = await m('clubes.criar', { nome: 'Laje do Dono', descricao: 'A casa', pais: 'BR', tipo: 'publico', trofeuMinimo: 0 }, donoTok);
    await m('clubes.entrar', { id: clD.id }, K3.token);
    await m('admin88.correioEnviar', { para: '000002', tipo: 'presente', titulo: 'Bem-vindo', corpo: 'Toma.', anexos: [{ tipo: 'moedas', qtd: 100 }] }, lp.token);
    const bv = (await q('correio.listar', undefined, K1.token)).find((c) => c.titulo === 'Bem-vindo');
    const wIni = await q('loja.carteira', undefined, K1.token);
    await m('correio.coletar', { id: bv.id }, K1.token);
    const wVelha = await q('loja.carteira', undefined, K1.token);
    confere(wVelha.moedas === wIni.moedas + 100, 'o 000002 coletou a carta (+100 moedas na carteira da conta)', [wIni, wVelha]);
    const mid = crypto.randomUUID();
    const ini = await m('jogo.iniciarPartida', { matchId: mid, modo: 'futebol', mapa: 'estadio', nivelBots: 'medio', ranqueada: false, online: false, tamanho: 1 }, donoTok);
    await m('jogo.encerrarPartida', { matchId: mid, matchToken: ini.matchToken, placarNosso: 3, placarDeles: 1, gols: 3, assistencias: 0, duracaoSeg: 150 }, donoTok);
    await sqlT("UPDATE partidas SET jogadores = ? WHERE usuario_id = (SELECT id FROM usuarios WHERE id_publico = 1)", [JSON.stringify(['000002', '000003'])]);
    const bil = await m('jogo.bilheteSala', {}, K2.token);
    antigoBilhete = bil.bilhete;
    const W1 = await socket(K1.token, ORIGEM), W2 = await socket(K2.token, ORIGEM);
    W1.manda({ type: 'hello', name: 'kauazin7' }); W2.manda({ type: 'hello', name: 'lucasznx' });
    confere((await W1.espera('hello')) && (await W2.espera('hello')), 'as duas contas entram nas salas (WebSocket com a sessão)');
    await W2.espera('amigos_status');
    W1.manda({ type: 'dm', para: '000003', texto: 'bora jogar hoje' });
    confere(await W2.espera('dm', (x) => x.texto === 'bora jogar hoje'), 'a mensagem direta entre os dois chega (e fica no histórico da turma)');
    W1.manda({ type: 'club_req', rid: 7, op: 'criar', args: { nome: 'Turma do Kaua', descricao: 'Rua', pais: 'BR', tipo: 'publico', trofeuMinimo: 0 } });
    const tc1 = await W1.espera('club_res', (x) => x.rid === 7);
    confere(tc1 && tc1.ok, 'e um clube da turma (no servidor das salas) do 000002', tc1);
    const idsVelhos = (await sqlT('SELECT id FROM usuarios WHERE id_publico > 1')).map((x) => x.id);
    const antes = {
      amizades: (await sqlT('SELECT COUNT(*) AS n FROM amizades'))[0].n, mensagens: (await sqlT('SELECT COUNT(*) AS n FROM mensagens'))[0].n,
      clubes: (await sqlT('SELECT COUNT(*) AS n FROM clubes'))[0].n, correio: (await sqlT('SELECT COUNT(*) AS n FROM correio'))[0].n,
      denuncias: (await sqlT('SELECT COUNT(*) AS n FROM denuncias'))[0].n,
    };
    confere(idsVelhos.length === 3 && antes.amizades > 0 && antes.mensagens > 0 && antes.clubes === 2 && antes.correio > 0 && antes.denuncias === 1, 'antes do zerar: 3 contas além do Dono, com amizades, mensagens, 2 clubes, cartas e uma denúncia', antes);

    console.log('\n8) ZERAR CONTAS: a senha, a palavra e só o 000001');
    const zs = await erro(m('donoContas.zerar', { senha: 'errada', confirmacao: 'ZERAR' }, lp.token));
    const zp = await erro(m('donoContas.zerar', { senha: SENHA_DONO, confirmacao: 'zerar' }, lp.token));
    confere(zs && zs.code === 'UNAUTHORIZED' && zp && zp.code === 'BAD_REQUEST' && /ZERAR/.test(zp.message), 'senha errada e a palavra errada: recusados (nada apagado)', [zs && zs.message, zp && zp.message]);
    confere((await sqlT('SELECT COUNT(*) AS n FROM usuarios'))[0].n === 4, 'as 4 contas continuam lá');
    // um segundo Dono (o cargo dado pelo painel, mas não a conta 000001): não cria, não lista, não troca senha e não zera
    await sqlT("INSERT INTO cargos (usuario_id, cargo, concedido_por, permissoes, criado_em) VALUES (?, 'dono', 1, NULL, ?)", [k1id, Date.now()]);
    const outroDono = await painel('kauazin7', k1.senha);
    const zo = await erro(m('donoContas.zerar', { senha: k1.senha, confirmacao: 'ZERAR' }, outroDono.token));
    const co2 = await erro(m('donoContas.criar', { username: 'convidado8', nomeExibicao: 'Convidado', aceiteTermos: true }, outroDono.token));
    const cl2 = await erro(q('donoContas.listar', { busca: '' }, outroDono.token));
    const cs2 = await erro(m('donoContas.novaSenha', { conta: '000003' }, outroDono.token));
    confere([zo, co2, cl2, cs2].every((x) => x && x.code === 'FORBIDDEN' && /000001/.test(x.message)), 'outro com o cargo de Dono: as contas são só da conta 000001 (criar, listar, senha nova e zerar recusados)', [zo, co2, cl2, cs2].map((x) => x && x.message));
    // a marca de uso único do resultado online (limites: selo:…) não pode sumir no zerar
    await sqlT("INSERT INTO limites (chave, contagem, janela_inicio) VALUES ('selo:teste881', 1, ?)", [Date.now()]);
    const z = await m('donoContas.zerar', { senha: SENHA_DONO, confirmacao: 'ZERAR' }, lp.token);
    confere(z.ok && z.apagadas === 3 && z.proximo === '000002' && z.eu === '000001', 'zerado: 3 contas apagadas, o Dono é o 000001 e a próxima conta é a 000002', z);
    confere((await sqlT("SELECT COUNT(*) AS n FROM limites WHERE chave = 'selo:teste881'"))[0].n === 1, 'a marca de uso único dos resultados online ficou (o mesmo resultado não vale duas vezes)');

    console.log('\n9) depois do zerar: nada das contas apagadas sobrou');
    const fim1 = await W1.espera('error', (x) => x.codigo === 'conta_apagada', 3000);
    for (let i = 0; i < 40 && (W1.fechou === null || W2.fechou === null); i++) await espera(50);
    confere(fim1 && W1.fechou === 4003 && W2.fechou === 4003, 'as salas: as conexões das contas apagadas recebem o aviso e caem (4003)', [fim1, W1.fechou, W2.fechou]);
    const eus = await Promise.all([K1, K2, K3].map((k) => q('auth.eu', undefined, k.token)));
    confere(eus.every((x) => !x.logado), 'as sessões das contas apagadas não valem mais');
    const contUsu = await sqlT('SELECT id_publico, username FROM usuarios');
    confere(contUsu.length === 1 && contUsu[0].id_publico === 1 && contUsu[0].username === 'dono', 'sobrou só a conta do Dono (000001)', contUsu);
    const tabelas = (await sqlT("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")).map((x) => x.name);
    const sobras = [];
    for (const t of tabelas) {
      const cols = (await sqlT(`PRAGMA table_info("${t}")`)).map((c) => c.name).filter((c) => COL_CONTA.test(c) && !FICA.has(t + '.' + c));
      for (const c of cols) {
        const n = (await sqlT(`SELECT COUNT(*) AS n FROM "${t}" WHERE "${c}" IN (${idsVelhos.map(() => '?').join(',')})`, idsVelhos))[0].n;
        if (n) sobras.push(t + '.' + c + ': ' + n);
      }
    }
    confere(tabelas.length >= 40 && sobras.length === 0, 'nenhuma das ' + tabelas.length + ' tabelas aponta para uma conta apagada (amizades, pedidos, bloqueios, denúncias, clubes, cartas, mensagens, carteira, partidas…)', sobras);
    const cl = await sqlT('SELECT id, nome FROM clubes'), mem = await sqlT('SELECT usuario_id, papel FROM clube_membros');
    confere(cl.length === 1 && cl[0].nome === 'Laje do Dono' && mem.length === 1 && mem[0].papel === 'dono', 'o clube do Dono ficou (só com ele); o clube da conta apagada saiu', [cl, mem]);
    const pj = await sqlT('SELECT jogadores FROM partidas');
    confere(pj.length === 1 && pj[0].jogadores === null, 'a partida do Dono ficou, sem a lista de quem jogou junto (os números voltam a ser usados)', pj);
    const cont = await sqlT("SELECT nome, valor FROM contadores WHERE nome IN ('id_publico', 'contas_zeradas_em')");
    const ze = cont.find((x) => x.nome === 'contas_zeradas_em');
    confere(cont.find((x) => x.nome === 'id_publico').valor === 1 && ze && ze.valor > Date.now() - 60000, 'o contador voltou para 1 e a hora do zerar ficou guardada', cont);
    const audZ = await sqlT("SELECT resultado, detalhes FROM auditoria WHERE acao = 'contas_zerar' ORDER BY id DESC LIMIT 1");
    confere(audZ.length && audZ[0].resultado === 'ok' && /"apagadas":3/.test(audZ[0].detalhes), 'o zerar fica na auditoria (com quantas e quais)', audZ);
    est = await q('donoContas.estado', undefined, lp.token);
    confere(est.total === 1 && est.proximo === '000002' && typeof est.zeradoEm === 'number', 'o painel do Dono continua aberto: 1 conta, a próxima é a 000002', est);
    const euDono = await q('auth.eu', undefined, donoTok);
    confere(euDono.logado && euDono.conta.idPublico === '000001' && euDono.conta.zeradoEm === ze.valor && euDono.conta.depoisDoZerar === false,
      'o Dono continua logado no jogo (a conta mostra quando as contas foram zeradas; a dele não nasceu depois)', euDono.conta && [euDono.conta.zeradoEm, euDono.conta.depoisDoZerar]);
    // o bilhete assinado antes do zerar (o 000003) não vale mais nas salas
    const W3 = await socket(null, ORIGEM);
    W3.manda({ type: 'hello', name: 'lucasznx', conta: antigoBilhete });
    const h3 = await W3.espera('hello', null, 3000);
    confere(h3 && h3.conta === false && h3.id !== 'c3' && !/^0*3$/.test(h3.pub), 'o bilhete de antes do zerar não vale nas salas: entra só como visitante, nunca como a 000003 (o número pode ser de outra pessoa agora)', h3 || W3.caixa.slice(0, 3));
    try { W3.ws.close(); } catch (_) {}

    console.log('\n10) as contas novas com os números de volta não herdam nada');
    const n1 = await m('donoContas.criar', { username: 'kauazin7', nomeExibicao: 'Kauã Novo', aceiteTermos: true }, lp.token);
    const n1b = await m('donoContas.criar', { username: 'lucasznx', nomeExibicao: 'Lucas Novo', aceiteTermos: true }, lp.token);
    const N1 = await entra('kauazin7', n1.senha), N1b = await entra('lucasznx', n1b.senha);
    confere(n1.idPublico === '000002' && n1b.idPublico === '000003' && N1.conta.idPublico === '000002' && N1.conta.zeradoEm === ze.valor && N1.conta.depoisDoZerar === true,
      'as primeiras contas depois do zerar são a 000002 e a 000003 (o mesmo usuário pode voltar; o servidor diz que nasceram depois do zerar)', [n1.idPublico, n1b.idPublico, N1.conta.zeradoEm, N1.conta.depoisDoZerar]);
    const [am, pe, me, co, cm, cart] = await Promise.all([
      q('amigos.listar', undefined, N1.token), q('amigos.pedidos', undefined, N1.token), q('mensagens.listar', undefined, N1.token).catch(() => []),
      q('correio.listar', undefined, N1.token), q('clubes.meu', undefined, N1.token), q('loja.estado', undefined, N1.token),
    ]);
    confere(am.length === 0 && pe.recebidos.length === 0 && pe.enviados.length === 0 && !cm && !co.some((c) => c.titulo === 'Bem-vindo'),
      'sem amigos, sem pedidos, sem clube e sem a carta da conta velha', { am: am.length, pe, cm, co: co.map((c) => c.titulo) });
    confere(!(Array.isArray(me) ? me : me.lista || []).some((x) => /kauazin7|Lucas|amizade/i.test(JSON.stringify(x)) && x.categoria === 'amigos'), 'sem as mensagens da conta velha', me);
    const wN2 = await q('loja.carteira', undefined, N1b.token);
    confere(cart && cart.carteira && cart.carteira.moedas === wN2.moedas && cart.carteira.gemas === wN2.gemas && cart.carteira.moedas === wVelha.moedas - 100,
      'a carteira começa como a de qualquer conta nova (as 100 moedas da conta velha não passaram)', [cart && cart.carteira, wN2, wVelha]);
    // os dois novos ficam amigos (como os velhos eram): o histórico das mensagens diretas entre 000002 e 000003 tem de vir vazio
    await m('amigos.enviarPedido', { termo: '000003' }, N1.token);
    const pn = await q('amigos.pedidos', undefined, N1b.token);
    await m('amigos.responderPedido', { pedidoId: pn.recebidos[0].pedidoId, aceitar: true }, N1b.token);
    const WN = await socket(N1.token, ORIGEM);
    WN.manda({ type: 'hello', name: 'kauazin7' });
    const hn = await WN.espera('hello');
    await WN.espera('amigos_status');
    WN.manda({ type: 'dm_hist', com: '000003' });
    const dh = await WN.espera('dm_hist');
    WN.manda({ type: 'club_req', rid: 9, op: 'meu' });
    const tm = await WN.espera('club_res', (x) => x.rid === 9);
    WN.manda({ type: 'social' });
    const so = await WN.espera('social');
    confere(hn && hn.pub === '000002' && dh && dh.com === '000003' && dh.lista.length === 0, 'nas salas: o 000002 novo, amigo do 000003 novo, não vê as mensagens diretas dos velhos', [hn && hn.pub, dh]);
    confere(tm && tm.ok && tm.data === null && so && so.eu.trofeus === 0 && !so.club, 'e não herda o clube da turma nem os troféus da conta velha', [tm, so && so.eu, so && so.club]);
    WN.manda({ type: 'club_req', rid: 10, op: 'listar', args: {} });
    const tl = await WN.espera('club_res', (x) => x.rid === 10);
    confere(tl && tl.ok && !tl.data.some((c) => c.nome === 'Turma do Kaua'), 'o clube da turma da conta apagada sumiu (era o único membro)', tl && tl.data);
    try { WN.ws.close(); } catch (_) {}

    console.log('\n11) o contador atrás de um número em uso: o servidor pula');
    await sqlT("UPDATE contadores SET valor = 1 WHERE nome = 'id_publico'");
    const n2 = await m('donoContas.criar', { username: 'pulado1', nomeExibicao: 'Pulado', aceiteTermos: true }, lp.token);
    confere(n2.idPublico === '000004', 'com o contador em 1 e a 000002 e a 000003 em uso, a próxima é a 000004 (nunca dois com o mesmo número)', n2.idPublico);
  } finally { await desce(S); }

  // ======================================================================= 3º boot: outra senha na variável, o mesmo banco
  S = await sobe({ RACHA_OWNER_PASSWORD: SENHA_DONO2 });
  BASE = 'http://127.0.0.1:' + S.porta;
  try {
    console.log('\n12) reiniciando com outra senha na variável');
    const nova = await entra('dono', SENHA_DONO2), velha = await erro(entra('dono', SENHA_DONO));
    confere(nova.token && velha && velha.code === 'UNAUTHORIZED', 'a senha nova da variável vale; a anterior não', velha && velha.message);
    const euVelho = await q('auth.eu', undefined, donoTok);
    confere(!euVelho.logado, 'as sessões antigas do Dono caíram (a senha mudou)');
    const lp2 = await m('admin.loginPainel', { username: 'dono', senha: SENHA_DONO2 });
    confere(lp2.configurar2fa === true && lp2.url2fa, 'e o 2FA do painel foi zerado: configura de novo com a senha nova', lp2.configurar2fa);
    const us = await sqlT('SELECT id_publico FROM usuarios ORDER BY id_publico');
    confere(us.map((x) => x.id_publico).join(',') === '1,2,3,4', 'as contas continuam (000001 a 000004)', us);
    const W4 = await socket(null, BASE);
    W4.manda({ type: 'hello', name: 'lucasznx', conta: antigoBilhete });
    const h4 = await W4.espera('hello', null, 3000);
    confere(h4 && h4.conta === false && h4.id !== 'c3', 'depois de reiniciar, o bilhete de antes do zerar continua sem valer (só visitante)', h4 || W4.caixa.slice(0, 3));
    try { W4.ws.close(); } catch (_) {}
    const reg3 = await erro(m('auth.registrar', { username: 'outro99', nomeExibicao: 'Outro', senha: 'senha1234', confirmacaoSenha: 'senha1234', email: 'o@x.com', aceiteTermos: true }));
    confere(reg3 && reg3.code === 'FORBIDDEN', 'o cadastro continua fechado depois de reiniciar (vale o que o Dono escolheu)');
  } finally { await desce(S); }

  console.log('\nv88.1 · as contas pelo Dono (plataforma de teste): ' + ok + ' ok, ' + falhou + ' falharam');
  process.exit(falhou ? 1 : 0);
}
principal().catch((e) => { console.error(e); process.exit(1); });
