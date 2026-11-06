// RACHA · v109 — OS DOIS PAINÉIS DO RACHA CONTROL (o do Dono e o da staff) e o 2FA consertado, na plataforma de verdade (a
// plataforma de teste: as rotas de app/api em cima de um SQLite, com o servidor das salas montado no mesmo endereço e
// WebSockets de verdade). Confere:
//   · o 2FA: a chave nova é base32 de verdade (32 letras = 20 bytes), a de 20 letras que nunca foi confirmada é trocada no
//     login, a que já funcionava continua valendo; o código errado, o código de outro horário (o aviso do relógio adiantado ou
//     atrasado), o mesmo código duas vezes (recusado) e o limite que só conta os códigos errados;
//   · quem cai em qual painel (o Dono no do Dono; Administrador, Moderador e Ajudante no da staff);
//   · a staff NÃO dá selo (verificado), item, presente, moeda nem gema, não mexe em eventos, equipe nem registros dos outros e
//     não dá pontos de patente — e cada tentativa fica na auditoria para o Dono;
//   · o silêncio do chat (5 min a 30 dias) com o teto de cada cargo e a hierarquia; vale na hora no servidor das salas (o Chat
//     do Brasil, a sala) com o aviso de quanto falta e o motivo, chega no aviso ao vivo, vai no bilhete e sai quando tiram;
//   · banir por um tempo e para sempre (os tetos), advertir (o aviso na central), tirar da sala (e não volta por 10 min),
//     trocar o nome impróprio, as notas da equipe, tirar punição (quem pode o quê), os punidos, a ficha;
//   · o Dono: a carteira (dar e tirar moedas e gemas), o verificado, os registros com filtro e página, o resumo da staff, a
//     equipe, resetar o 2FA (o próprio só com a senha), encerrar as sessões do painel e o ajuste de permissões (só tira).
//   node tests/v109_painel_servidor_test.mjs
import { fork } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, falhou = 0;
const T0 = Date.now();
function confere(cond, txt, extra) {
  if (cond) { ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra).slice(0, 600) : '')); }
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const banco = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'racha109-')), 'plataforma.sqlite');
const SENHA_DONO = 'Dono-Teste-109xQ';

function sobe(env) {
  return new Promise((res, rej) => {
    const e = { ...process.env, ...env };
    for (const k of ['RACHA_CADASTRO', 'RACHA_PRESENTE_TESTE']) if (!(k in env)) delete e[k];
    const p = fork(path.join(RAIZ, 'tests', 'plataforma', 'servidor.mjs'), ['--porta', '0', '--teste', '--banco', banco], { silent: true, env: e });
    let log = '';
    p.stdout.on('data', (d) => { log += d; }); p.stderr.on('data', (d) => { log += d; });
    p.on('message', (m) => { if (m && m.pronto) res({ p, porta: m.porta, log: () => log }); });
    setTimeout(() => rej(new Error('a plataforma de teste não subiu: ' + log)), 60000);
  });
}
let BASE = '';
async function api(proc, input, token, query) {
  const corpo = JSON.stringify({ 0: input === undefined || input === null ? { json: null, meta: { values: ['undefined'], v: 1 } } : { json: input } });
  const url = BASE + '/api/trpc/' + proc + '?batch=1' + (query ? '&input=' + encodeURIComponent(corpo) : '');
  const r = await fetch(url, { method: query ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: query ? undefined : corpo });
  const l = JSON.parse(await r.text());
  const um = l[0];
  if (um.error) { const e = new Error(um.error.json.message); e.code = um.error.json.data && um.error.json.data.code; throw e; }
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

// ---- o TOTP (RFC 6238) com um decodificador base32 ESTRITO: a chave precisa fechar em bytes, sem sobra (como os apps rígidos)
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32estrito(s) {
  if (!/^[A-Z2-7]+$/.test(s)) throw new Error('letra fora do base32');
  let bits = ''; for (const ch of s) bits += B32.indexOf(ch).toString(2).padStart(5, '0');
  const sobra = bits.length % 8;
  if (sobra && /1/.test(bits.slice(bits.length - sobra))) throw new Error('a chave não fecha em bytes (sobram ' + sobra + ' bits)');
  if (![0, 2, 4, 5, 7].includes(s.length % 8)) throw new Error('tamanho inválido');
  const out = Buffer.alloc(Math.floor(bits.length / 8)); for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return out;
}
function b32solto(s) { let bits = ''; for (const ch of s.toUpperCase()) { const i = B32.indexOf(ch); if (i >= 0) bits += i.toString(2).padStart(5, '0'); } const out = Buffer.alloc(Math.floor(bits.length / 8)); for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2); return out; }
function totpCom(chave, passo) {
  const cont = Buffer.alloc(8); cont.writeBigUInt64BE(BigInt(passo));
  const h = crypto.createHmac('sha1', chave).update(cont).digest(); const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1000000)).padStart(6, '0');
}
const passoAgora = () => Math.floor(Date.now() / 30000);
const USADOS = new Set();
async function codigoLivre(seg, solto = false) {         // (o servidor não aceita o mesmo código duas vezes: um passo livre por login)
  for (;;) {
    const p = passoAgora();
    for (const d of [0, 1, -1]) { const k = seg + ':' + (p + d); if (!USADOS.has(k)) { USADOS.add(k); return totpCom(solto ? b32solto(seg) : b32estrito(seg), p + d); } }
    await espera(30000 - (Date.now() % 30000) + 60);
  }
}
const segredoDaUrl = (u) => new URL(u).searchParams.get('secret');
async function segredoDoBanco(username) {
  const u = (await sqlT('SELECT id FROM usuarios WHERE username = ?', [username]))[0];
  return (await sqlT('SELECT segredo FROM totp WHERE usuario_id = ?', [u.id]))[0].segredo;
}
async function painel(username, senha) {                 // o login do RACHA CONTROL com o 2FA (a chave lida do banco)
  const lp = await m('admin.loginPainel', { username, senha });
  const seg = await segredoDoBanco(username);
  await m('admin.verificar2fa', { token: lp.token, codigo: await codigoLivre(seg) });
  return lp.token;
}
function socket(token) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(BASE.replace('http', 'ws') + '/', { headers: { Origin: BASE, ...(token ? { Cookie: 'racha_sessao=' + encodeURIComponent(token) } : {}) } });
    const k = {
      ws, caixa: [], fechou: null, manda: (x) => ws.send(JSON.stringify(x)),
      espera: async (tipo, cond, ms) => { const t0 = Date.now(); for (;;) { const x = k.caixa.find((y) => y.type === tipo && (!cond || cond(y))); if (x) return x; if (Date.now() - t0 > (ms || 4000)) return null; await espera(25); } },
      limpa: () => { k.caixa.length = 0; },
    };
    ws.onmessage = (e) => k.caixa.push(JSON.parse(e.data)); ws.onopen = () => res(k); ws.onerror = () => rej(new Error('não conectou'));
    ws.onclose = (e) => { k.fechou = e.code; };
  });
}
function lerBilhete(b) {                                 // (o bilhete assinado: a parte de dados é JSON em base64url)
  for (const parte of String(b).split('.')) { try { const o = JSON.parse(Buffer.from(parte, 'base64url').toString('utf8')); if (o && o.p) return o; } catch (_) {} }
  return null;
}

let S;
try {
  S = await sobe({ RACHA_OWNER_USERNAME: 'dono', RACHA_OWNER_PASSWORD: SENHA_DONO });
  BASE = 'http://127.0.0.1:' + S.porta;
  console.log('v109 · os dois painéis e o 2FA (plataforma de teste em ' + BASE + ')');

  // ======================================================================= 1) o 2FA do Dono
  const lp1 = await m('admin.loginPainel', { username: 'dono', senha: SENHA_DONO });
  const seg = segredoDaUrl(lp1.url2fa);
  let chaveOk = null; try { chaveOk = b32estrito(seg); } catch (e) { chaveOk = e.message; }
  confere(lp1.configurar2fa === true && /^[A-Z2-7]{32}$/.test(seg) && Buffer.isBuffer(chaveOk) && chaveOk.length === 20 && (await segredoDoBanco('dono')) === seg,
    'o 2FA novo: a chave tem 32 letras do base32 e fecha em 20 bytes (um decodificador rígido aceita); é a mesma do banco', [seg, String(chaveOk)]);
  confere(/^otpauth:\/\/totp\/RACHA%3Adono\?secret=[A-Z2-7]{32}&issuer=RACHA&algorithm=SHA1&digits=6&period=30$/.test(lp1.url2fa) && Math.abs(lp1.agora - Date.now()) < 5000,
    'o endereço do QR code (otpauth://) com o rótulo curto e a hora do servidor junto', lp1.url2fa);
  const e1 = await erro(m('admin.verificar2fa', { token: lp1.token, codigo: '000000' === totpCom(chaveOk, passoAgora()) ? '111111' : '000000' }));
  confere(e1 && /incorreto/.test(e1.message) && /QR code/.test(e1.message), 'o código errado: "Código 2FA incorreto" com a dica de ler o QR code', e1 && e1.message);
  const eAd = await erro(m('admin.verificar2fa', { token: lp1.token, codigo: totpCom(chaveOk, passoAgora() + 6) }));
  const eAt = await erro(m('admin.verificar2fa', { token: lp1.token, codigo: totpCom(chaveOk, passoAgora() - 10) }));
  confere(eAd && /adiantado/.test(eAd.message) && /3 min/.test(eAd.message) && eAt && /atrasado/.test(eAt.message) && /5 min/.test(eAt.message),
    'o código de outro horário: o aviso do relógio do celular adiantado (3 min) e atrasado (5 min) — não "código errado"', [eAd && eAd.message, eAt && eAt.message]);
  const cod1 = totpCom(chaveOk, passoAgora()); USADOS.add(seg + ':' + passoAgora());
  const v1 = await m('admin.verificar2fa', { token: lp1.token, codigo: cod1 });
  const est1 = await q('admin.estadoPainel', undefined, lp1.token);
  confere(v1.ok && est1.logado && est1.totpVerificado && est1.painel === 'dono', 'o código certo entra, e o Dono cai no PAINEL DO DONO', est1);
  const lp1b = await m('admin.loginPainel', { username: 'dono', senha: SENHA_DONO });
  const eRep = await erro(m('admin.verificar2fa', { token: lp1b.token, codigo: cod1 }));
  confere(lp1b.configurar2fa === false && lp1b.url2fa === null && eRep && /já foi usado/.test(eRep.message), 'o mesmo código não vale duas vezes (e o 2FA já configurado não mostra a chave de novo)', eRep && eRep.message);
  const donoTok = lp1.token;
  const tent = await sqlT("SELECT COUNT(*) AS n FROM auditoria WHERE acao = '2fa_errado'");
  confere(tent[0].n >= 3, 'os códigos errados ficam na auditoria (2fa_errado)', tent[0].n);

  // ======================================================================= 2) as contas: a staff e os jogadores
  const cria = async (username, nome) => m('donoContas.criar', { username, nomeExibicao: nome, senha: 'Senha-' + username + '-9x', aceiteTermos: true }, donoTok);
  const entra = async (username) => (await m('auth.entrar', { identificador: username, senha: 'Senha-' + username + '-9x' })).token;
  const contas = {};
  for (const [u, n] of [['adm109', 'Admin Zé'], ['mod109', 'Mod Bia'], ['ajd109', 'Ajuda Léo'], ['p1x109', 'Craque1'], ['p2x109', 'Craque2'], ['p3x109', 'Craque3'], ['p4x109', 'Craque4'], ['p5x109', 'Craque5'], ['leg109', 'Legado'], ['lga109', 'LegadoAtivo']]) {
    const c = await cria(u, n); contas[u] = { pub: c.idPublico, nome: n };
  }
  for (const [u, cargo] of [['adm109', 'administrador'], ['mod109', 'moderador'], ['ajd109', 'ajudante'], ['leg109', 'moderador'], ['lga109', 'moderador']]) {
    await m('admin.definirCargo', { termo: u, cargo, confirmacao: true }, donoTok);
  }
  // a chave de antes (20 letras sorteadas, sobrando bits) nunca confirmada é trocada no login; a confirmada continua valendo
  const idLeg = (await sqlT("SELECT id FROM usuarios WHERE username = 'leg109'"))[0].id, idLga = (await sqlT("SELECT id FROM usuarios WHERE username = 'lga109'"))[0].id;
  const velha = 'ABCDEFGHIJKLMNOPQRS7', velhaAtiva = 'ZYXWVUTSRQPONMLKJIH7';
  await sqlT('INSERT INTO totp (usuario_id, segredo, ativo, criado_em) VALUES (?, ?, 0, ?)', [idLeg, velha, Date.now()]);
  await sqlT('INSERT INTO totp (usuario_id, segredo, ativo, criado_em) VALUES (?, ?, 1, ?)', [idLga, velhaAtiva, Date.now()]);
  const lpLeg = await m('admin.loginPainel', { username: 'leg109', senha: 'Senha-leg109-9x' });
  const segLeg = await segredoDoBanco('leg109');
  confere(lpLeg.configurar2fa && segLeg !== velha && /^[A-Z2-7]{32}$/.test(segLeg) && segredoDaUrl(lpLeg.url2fa) === segLeg, 'a chave de 20 letras que nunca foi confirmada vira uma de 32 no login (o QR code novo)', [segLeg]);
  const lpLga = await m('admin.loginPainel', { username: 'lga109', senha: 'Senha-lga109-9x' });
  const vLga = await erro(m('admin.verificar2fa', { token: lpLga.token, codigo: await codigoLivre(velhaAtiva, true) }));
  confere(lpLga.configurar2fa === false && vLga === null && (await segredoDoBanco('lga109')) === velhaAtiva, 'a chave de antes que já funcionava continua valendo (quem já usa o 2FA não precisa configurar de novo)', vLga && vLga.message);

  // o limite: só os códigos errados contam (7 errados, 1 certo, e mais 1 errado ainda diz "incorreto")
  const lpA = await m('admin.loginPainel', { username: 'ajd109', senha: 'Senha-ajd109-9x' });
  const segA = segredoDaUrl(lpA.url2fa);
  const certoA = totpCom(b32estrito(segA), passoAgora());
  const errado = (c) => (c === '123456' ? '654321' : '123456');
  for (let i = 0; i < 7; i++) await erro(m('admin.verificar2fa', { token: lpA.token, codigo: errado(certoA) }));
  USADOS.add(segA + ':' + passoAgora());
  const vA = await erro(m('admin.verificar2fa', { token: lpA.token, codigo: certoA }));
  const lpA2 = await m('admin.loginPainel', { username: 'ajd109', senha: 'Senha-ajd109-9x' });
  const eA2 = await erro(m('admin.verificar2fa', { token: lpA2.token, codigo: errado(certoA) }));
  confere(vA === null && eA2 && /incorreto/.test(eA2.message), 'o limite do 2FA só conta os códigos errados (o certo não gasta tentativa: depois de 7 errados e 1 certo, o 9º ainda é conferido)', [vA && vA.message, eA2 && eA2.message]);
  const ajdTok = lpA.token;
  const admTok = await painel('adm109', 'Senha-adm109-9x'), modTok = await painel('mod109', 'Senha-mod109-9x');
  const est = await Promise.all([admTok, modTok, ajdTok].map((t) => q('admin.estadoPainel', undefined, t)));
  confere(est.every((e) => e.logado && e.painel === 'staff') && est.map((e) => e.cargo).join() === 'administrador,moderador,ajudante', 'Administrador, Moderador e Ajudante caem no PAINEL DA STAFF', est.map((e) => [e.cargo, e.painel]));
  const opc = await Promise.all([admTok, modTok, ajdTok, donoTok].map((t) => q('staff109.opcoes', undefined, t)));
  confere(opc[0].silencio.length === 7 && opc[1].silencio.map((o) => o.rotulo).join() === '5 min,10 min,1 hora,1 dia,5 dias,10 dias' && opc[2].silencio.map((o) => o.rotulo).join() === '5 min,10 min,1 hora'
    && opc[0].banir.some((o) => o.horas === 0) && !opc[1].banir.some((o) => o.horas === 0) && opc[1].banir.map((o) => o.rotulo).join() === '1 dia,3 dias,7 dias' && opc[2].banir.length === 0 && opc[3].silencio.length === 7,
    'os tempos de cada cargo: silêncio até 30 dias (Administrador), 10 dias (Moderador), 1 hora (Ajudante); banir para sempre só o Administrador; o Ajudante não bane', opc.map((o) => [o.cargo, o.silencio.length, o.banir.map((b) => b.horas)]));

  // ======================================================================= 3) a staff NÃO dá selo, presente, item, moeda...
  const p1 = contas.p1x109.pub, p2 = contas.p2x109.pub, p3 = contas.p3x109.pub, p4 = contas.p4x109.pub, p5 = contas.p5x109.pub;
  const ITEM = (await q('admin.catalogoItens', undefined, donoTok))[0].codigo;
  const negadas = [];
  for (const [nome, f] of [
    ['dar o verificado', (t) => m('admin.gerenciarSelo', { termo: p1, selo: 'verificado', acao: 'conceder', confirmacao: true }, t)],
    ['dar um item', (t) => m('admin.concederItem', { termo: p1, codigoItem: ITEM, confirmacao: true }, t)],
    ['distribuir um presente', (t) => m('admin.distribuir', { tipo: 'individual', codigoItem: ITEM, destinatarios: [p1], chaveIdempotencia: 'teste-109-' + crypto.randomUUID().slice(0, 8), confirmacao: true }, t)],
    ['mandar carta com moedas', (t) => m('admin88.correioEnviar', { para: p1, tipo: 'presente', titulo: 'Presente', corpo: 'oi', anexos: [{ tipo: 'moedas', qtd: 100 }] }, t)],
    ['dar moedas', (t) => m('dono109.ajustarCarteira', { termo: p1, moedas: 100, motivo: 'teste', confirmacao: true }, t)],
    ['ver a carteira', (t) => q('dono109.carteira', { termo: p1 }, t)],
    ['ver os registros de todos', (t) => q('dono109.registros', {}, t)],
    ['ver o resumo da staff', (t) => q('dono109.resumoStaff', {}, t)],
    ['ver a equipe', (t) => q('dono109.equipe', undefined, t)],
    ['criar evento', (t) => q('admin88.eventosListar', undefined, t)],
    ['dar cargo', (t) => m('admin.definirCargo', { termo: p2, cargo: 'ajudante', confirmacao: true }, t)],
    ['resetar o 2FA de alguém', (t) => m('dono109.resetar2fa', { termo: 'ajd109', confirmacao: true }, t)],
    ['ver o histórico dos presentes', (t) => q('admin.historicoDistribuicoes', { limite: 5 }, t)],
  ]) {
    const r = await Promise.all([admTok, modTok, ajdTok].map((t) => erro(f(t))));
    if (!r.every((x) => x && (x.code === 'FORBIDDEN' || /permissão|só do painel do Dono|Dono/.test(x.message)))) negadas.push([nome, r.map((x) => (x ? x.code + ':' + x.message : 'PASSOU'))]);
  }
  confere(negadas.length === 0, 'a staff (os 3 cargos) não dá verificado, item, presente, carta com moedas nem moeda, não vê carteira, registros de todos, equipe, eventos, e não dá cargo nem reseta 2FA', negadas);
  const ptsP1 = (await q('staff109.ficha', { termo: p1 }, admTok)).patente.pts;
  const eP = await erro(m('admin.ajustarPatente', { termo: p1, pts: ptsP1 + 500, motivo: 'teste presente', confirmacao: true }, admTok));
  confere(eP && /só tira pontos/.test(eP.message), 'o Administrador não DÁ pontos de patente (presente): só zera quem trapaceou', eP && eP.message);
  const selosP1 = await sqlT('SELECT COUNT(*) AS n FROM selos s JOIN usuarios u ON u.id = s.usuario_id WHERE u.id_publico = ?', [Number(p1)]);
  confere(selosP1[0].n === 0, 'e o verificado não chegou no jogador', selosP1);
  await espera(150);
  const negLog = await sqlT("SELECT COUNT(*) AS n FROM auditoria WHERE resultado = 'negado' AND cargo_operador IN ('administrador','moderador','ajudante')");
  confere(negLog[0].n >= 30, 'cada tentativa negada da staff fica na auditoria (' + negLog[0].n + ' linhas)', negLog[0].n);

  // ======================================================================= 4) o silêncio do chat: os tetos e a hierarquia
  const sil = (termo, minutos, motivo, t) => m('staff109.silenciar', { termo, minutos, motivo, confirmacao: true }, t);
  const s1 = await erro(sil(p1, 60, 'Xingou no chat do Brasil', ajdTok));
  const s2 = await erro(sil(p1, 24 * 60, 'teste teto', ajdTok));
  const s3 = await erro(sil(p2, 10 * 24 * 60, 'Spam na sala', modTok));
  const s4 = await erro(sil(p2, 30 * 24 * 60, 'teste teto', modTok));
  const s5 = await erro(sil(p3, 30 * 24 * 60, 'Ofensa grave', admTok));
  const s6 = await erro(sil(p3, 7, 'tempo fora da lista', admTok));
  confere(s1 === null && s2 && /no máximo 1 hora/.test(s2.message) && s3 === null && s4 && /no máximo 10 dias/.test(s4.message) && s5 === null && s6 && /tempos do painel/.test(s6.message),
    'silenciar: o Ajudante até 1 hora, o Moderador até 10 dias, o Administrador até 30 dias; tempo fora da lista recusado', [s1, s2, s3, s4, s5, s6].map((x) => x && x.message));
  const h1 = await erro(sil('adm109', 5, 'teste hierarquia', modTok)), h2 = await erro(sil('dono', 5, 'teste hierarquia', admTok)), h3 = await erro(sil('ajd109', 5, 'eu mesmo', ajdTok));
  confere(h1 && h1.code === 'FORBIDDEN' && h2 && /Dono é protegida/.test(h2.message) && h3 && /própria conta/.test(h3.message), 'a hierarquia: o Moderador não cala o Administrador, ninguém cala o Dono, ninguém se cala', [h1, h2, h3].map((x) => x && x.message));
  const f1 = await q('staff109.ficha', { termo: p1 }, modTok);
  const avisoP1 = await sqlT("SELECT titulo, corpo FROM mensagens m JOIN usuarios u ON u.id = m.usuario_id WHERE u.id_publico = ? AND m.titulo = 'Você foi silenciado no chat'", [Number(p1)]);
  confere(f1.silencio && Math.abs(f1.silencio.ate - (Date.now() + 3600e3)) < 60e3 && f1.punicoes[0].tipo === 'silencio' && f1.punicoes[0].valendo && f1.punicoes[0].por === 'Ajuda Léo'
    && avisoP1.length === 1 && /1 hora/.test(avisoP1[0].corpo) && /Xingou no chat do Brasil/.test(avisoP1[0].corpo),
    'a ficha mostra o silêncio (até quando, quem deu) e o jogador recebe o aviso na central de mensagens (o tempo e o motivo)', [f1.silencio, avisoP1]);

  // ======================================================================= 5) o silêncio no servidor das salas (WebSocket de verdade)
  const t1 = await entra('p1x109'), t2 = await entra('p2x109'), t5 = await entra('p5x109');
  const W1 = await socket(t1);
  W1.manda({ type: 'hello', name: 'Craque1' }); await W1.espera('hello');
  W1.manda({ type: 'brasil_join', name: 'Craque1' }); await W1.espera('brasil_hello');
  W1.manda({ type: 'brasil_say', text: 'oi galera' });
  const be = await W1.espera('brasil_error');
  confere(be && be.reason === 'silenciado' && /silenciado no chat pela equipe do RACHA por mais (1 hora|59 min)/.test(be.texto) && /Motivo: Xingou no chat do Brasil/.test(be.texto),
    'o Chat do Brasil recusa quem está calado, com o aviso de quanto falta e o motivo', be);
  W1.manda({ type: 'create', name: 'Sala do Craque1', pub: false, n: 1 }); const sala1 = await W1.espera('room');
  W1.manda({ type: 'say', text: 'bora' });
  const se = await W1.espera('error', (x) => x.codigo === 'silenciado_staff');
  confere(sala1 && se && /por mais/.test(se.message), 'o chat da sala também (o erro silenciado_staff com o aviso)', se);
  const bil = lerBilhete((await m('jogo.bilheteSala', {}, t1)).bilhete);
  confere(bil && Math.abs(bil.z - f1.silencio.ate) < 2000 && bil.zm === 'Xingou no chat do Brasil', 'o bilhete das salas leva o silêncio (z: até quando, zm: o motivo) para o servidor das salas separado', bil && { z: bil.z, zm: bil.zm });
  // o aviso ao vivo e o tirar: o Craque2 ainda fala; o Moderador tira o silêncio de 10 dias dele
  const W2 = await socket(t2);
  W2.manda({ type: 'hello', name: 'Craque2' }); await W2.espera('hello');
  W2.manda({ type: 'brasil_join', name: 'Craque2' }); await W2.espera('brasil_hello');
  W2.manda({ type: 'brasil_say', text: 'teste calado' });
  const be2 = await W2.espera('brasil_error');
  const pun2 = (await q('staff109.ficha', { termo: p2 }, modTok)).punicoes.find((p) => p.tipo === 'silencio' && p.valendo);
  W2.limpa();
  await m('staff109.tirarPunicao', { punicaoId: pun2.id, confirmacao: true }, modTok);
  const livre = await W2.espera('silenciado', (x) => x.ate === 0, 3000);
  W2.manda({ type: 'brasil_say', text: 'voltei pro chat' });
  const msg2 = await W2.espera('brasil_message', (x) => x.message && x.message.texto === 'voltei pro chat');
  confere(be2 && /10 dias/.test(be2.texto) && livre && /liberado/.test(livre.texto) && msg2, 'tirar o silêncio vale na hora: o aviso "chat liberado" chega e a mensagem passa', [be2 && be2.texto, livre, !!msg2]);
  W2.limpa();
  await sil(p2, 5, 'Flood de figurinha', modTok);
  const calou = await W2.espera('silenciado', (x) => x.ate > Date.now(), 3000);
  W2.manda({ type: 'brasil_say', text: 'e agora?' });
  const be3 = await W2.espera('brasil_error');
  confere(calou && /por mais 5 min/.test(calou.texto) && /Flood de figurinha/.test(calou.texto) && be3 && be3.reason === 'silenciado', 'silenciar quem está conectado: o aviso ao vivo chega na hora e o chat já recusa', [calou, be3]);
  // quem tira: o Ajudante não desfaz o silêncio que o Moderador deu (a ficha nem mostra o "tirar"); o Administrador pode
  const fAj = await q('staff109.ficha', { termo: p2 }, ajdTok), fAd = await q('staff109.ficha', { termo: p2 }, admTok);
  const silMod = fAj.punicoes.find((p) => p.tipo === 'silencio' && p.valendo);
  const eAjT = await erro(m('staff109.tirarPunicao', { punicaoId: silMod.id, confirmacao: true }, ajdTok));
  const eAjV = await erro(m('admin.revogarPunicao', { punicaoId: silMod.id, confirmacao: true }, ajdTok));
  const punAj = (await q('staff109.punidos', { tipo: 'silencio' }, ajdTok)).find((x) => x.id === silMod.id);
  confere(silMod && silMod.podeTirar === false && fAd.punicoes.find((p) => p.id === silMod.id).podeTirar === true && eAjT && /cargo acima do seu/.test(eAjT.message) && eAjV && eAjV.code === 'FORBIDDEN' && punAj && punAj.podeTirar === false,
    'tirar a punição de quem tem cargo acima: o Ajudante não tira o silêncio que o Moderador deu (nem pela rota de antes); o Administrador pode', [silMod && silMod.podeTirar, eAjT && eAjT.message, eAjV && eAjV.message]);

  // ======================================================================= 6) banir, advertir, tirar da sala, trocar o nome, notas
  const b1 = await erro(m('staff109.banir', { termo: p3, horas: 7 * 24, motivo: 'Trapaça na ranqueada', confirmacao: true }, modTok));
  const b2 = await erro(m('staff109.banir', { termo: p4, horas: 30 * 24, motivo: 'teste teto', confirmacao: true }, modTok));
  const b3 = await erro(m('staff109.banir', { termo: p4, horas: 0, motivo: 'teste teto', confirmacao: true }, modTok));
  const b4 = await erro(m('staff109.banir', { termo: p4, horas: 24, motivo: 'teste teto', confirmacao: true }, ajdTok));
  const t4 = await entra('p4x109');
  const W4 = await socket(t4); W4.manda({ type: 'hello', name: 'Craque4' }); await W4.espera('hello');
  const b5 = await erro(m('staff109.banir', { termo: p4, horas: 0, motivo: 'Hack', confirmacao: true }, admTok));
  for (let i = 0; i < 40 && W4.fechou === null; i++) await espera(50);
  const estados = await sqlT('SELECT id_publico, estado FROM usuarios WHERE id_publico IN (?, ?)', [Number(p3), Number(p4)]);
  const entraBan = await erro(entra('p4x109'));
  confere(b1 === null && b2 && /no máximo 7 dias/.test(b2.message) && b3 && /Administrador ou o Dono/.test(b3.message) && b4 && b4.code === 'FORBIDDEN' && b5 === null
    && estados.find((e) => e.id_publico === Number(p3)).estado === 'suspenso' && estados.find((e) => e.id_publico === Number(p4)).estado === 'banido' && W4.fechou === 4003 && entraBan,
    'banir: o Moderador até 7 dias (não para sempre), o Ajudante não bane, o Administrador bane para sempre — a conta cai das salas na hora e não entra mais', [b1, b2, b3, b4, b5].map((x) => x && x.message).concat([estados, W4.fechou, entraBan && entraBan.message]));
  const pun3 = (await q('staff109.ficha', { termo: p3 }, admTok)).punicoes.find((p) => p.tipo === 'suspensao' && p.valendo);
  const tr1 = await erro(m('staff109.tirarPunicao', { punicaoId: pun3.id, confirmacao: true }, modTok));
  const tr2 = await erro(m('staff109.tirarPunicao', { punicaoId: pun3.id, confirmacao: true }, admTok));
  const est3 = (await sqlT('SELECT estado FROM usuarios WHERE id_publico = ?', [Number(p3)]))[0].estado;
  confere(tr1 && /Administrador ou o Dono/.test(tr1.message) && tr2 === null && est3 === 'ativo', 'tirar o banimento: o Moderador não pode, o Administrador pode (a conta volta a ativa)', [tr1 && tr1.message, tr2 && tr2.message, est3]);
  await m('staff109.advertir', { termo: p1, motivo: 'Provocação depois do gol', confirmacao: true }, modTok);
  const adv = await sqlT("SELECT corpo FROM mensagens m JOIN usuarios u ON u.id = m.usuario_id WHERE u.id_publico = ? AND m.titulo = 'Advertência da equipe do RACHA'", [Number(p1)]);
  confere(adv.length === 1 && /Provocação depois do gol/.test(adv[0].corpo), 'advertir: a advertência chega na central de mensagens do jogador', adv);
  // tirar da sala
  const W5 = await socket(t5); W5.manda({ type: 'hello', name: 'Craque5' }); await W5.espera('hello');
  W5.manda({ type: 'create', name: 'Sala do Craque5', pub: false, n: 2 }); const sala5 = await W5.espera('room');
  W1.limpa(); W1.manda({ type: 'join', code: sala5 && sala5.room && sala5.room.code });   // (o Craque1 entra junto: a sala não fecha quando o Craque5 sai)
  await W1.espera('room', (x) => x.room && sala5 && x.room.code === sala5.room.code);
  const ex = await m('staff109.expulsar', { termo: p5, motivo: 'Atrapalhando a partida', confirmacao: true }, modTok);
  const saiu = await W5.espera('left', null, 3000), avisoEx = await W5.espera('error', (x) => x.codigo === 'expulso', 3000);
  W5.limpa(); W5.manda({ type: 'join', code: sala5 && sala5.room && sala5.room.code });
  const volta = await W5.espera('error', null, 3000);
  confere(ex.saiu === 1 && saiu && avisoEx && /Atrapalhando a partida/.test(avisoEx.message) && volta && /removido desta sala/.test(volta.message), 'tirar da sala: o jogador sai na hora (com o aviso e o motivo) e não volta para a mesma sala', [ex, avisoEx && avisoEx.message, volta && volta.message]);
  // trocar o nome (e a frase)
  await sqlT("UPDATE usuarios SET bio = 'frase feia' WHERE id_publico = ?", [Number(p5)]);
  const tn = await m('staff109.trocarNome', { termo: p5, motivo: 'Nome ofensivo', limparFrase: true, confirmacao: true }, modTok);
  const u5 = (await sqlT('SELECT nome_exibicao, bio FROM usuarios WHERE id_publico = ?', [Number(p5)]))[0];
  confere(tn.depois === 'Jogador' + p5 && u5.nome_exibicao === 'Jogador' + p5 && u5.bio === null, 'trocar o nome impróprio (e a frase do perfil): vira Jogador' + p5, [tn, u5]);
  const eNome = await erro(m('staff109.trocarNome', { termo: p5, motivo: 'teste', confirmacao: true }, ajdTok));
  confere(eNome && /não troca nomes/.test(eNome.message), 'o Ajudante não troca nomes', eNome && eNome.message);
  // as notas
  await m('staff109.anotar', { termo: p1, texto: 'Reincidente: já foi avisado no chat' }, ajdTok);
  const fN = await q('staff109.ficha', { termo: p1 }, admTok);
  confere(fN.notas.length === 1 && fN.notas[0].por === 'Ajuda Léo' && /Reincidente/.test(fN.notas[0].texto) && fN.veNotas, 'as notas da equipe: o Ajudante escreve, o Administrador vê (com quem escreveu)', fN.notas);
  // os punidos
  const pun = await q('staff109.punidos', { tipo: 'todos' }, ajdTok);
  const tipos = pun.map((p) => p.tipo + ':' + (p.jogador && p.jogador.idPublico));
  confere(tipos.includes('silencio:' + p1) && tipos.includes('silencio:' + p2) && tipos.includes('silencio:' + p3) && tipos.includes('banimento:' + p4) && !tipos.some((t) => t.startsWith('suspensao:' + p3)),
    'os punidos agora: os silenciados e o banido para sempre (o banimento tirado não aparece)', tipos);

  // ======================================================================= 7) os registros: a staff vê só os dela; o Dono vê tudo
  const meus = await q('staff109.meusRegistros', { limite: 200 }, modTok);
  const modId = (await sqlT("SELECT id FROM usuarios WHERE username = 'mod109'"))[0].id;
  const antigosMod = await q('admin.registros', { limite: 200 }, modTok);
  const opsAntigos = new Set(antigosMod.map((r) => r.operador.nome));
  confere(meus.length > 5 && meus.some((r) => r.acao === 'silenciar') && meus.some((r) => r.acao === 'banir') && meus.some((r) => r.acao === 'expulsar') && opsAntigos.size === 1 && opsAntigos.has('Mod Bia'),
    'a staff vê só o que ela fez (meus registros e o registro de antes, filtrado)', [meus.length, [...opsAntigos]]);
  const todos = await q('dono109.registros', { soStaff: true, semConsultas: true, dias: 1, limite: 200 }, donoTok);
  const acoes = new Set(todos.itens.map((r) => r.acao));
  const quem = new Set(todos.itens.map((r) => r.operador.nome));
  confere(['silenciar', 'banir', 'banir_para_sempre', 'advertir', 'expulsar', 'trocar_nome', 'anotar', 'tirar_punicao'].every((a) => acoes.has(a)) && !acoes.has('ver_ficha') && !quem.has('dono') && quem.has('Ajuda Léo') && quem.has('Mod Bia') && quem.has('Admin Zé'),
    'o Dono vê tudo o que a staff fez (silenciar, banir, advertir, tirar da sala, trocar o nome, notas, tirar punição), sem as consultas e sem as dele', [...acoes]);
  const soMod = await q('dono109.registros', { operador: 'mod109', soStaff: true, dias: 1, limite: 200 }, donoTok);
  const soBanir = await q('dono109.registros', { acao: 'banir', resultado: 'ok', soStaff: true, dias: 1 }, donoTok);
  const soNeg = await q('dono109.registros', { resultado: 'negado', soStaff: true, dias: 1, limite: 200 }, donoTok);
  const comFicha = await q('dono109.registros', { acao: 'ver_ficha', semConsultas: false, soStaff: true, dias: 1 }, donoTok);
  confere(soMod.itens.length && soMod.itens.every((r) => r.operador.nome === 'Mod Bia') && soBanir.itens.length === 2 && soBanir.itens.every((r) => /^banir/.test(r.acao))
    && soNeg.itens.length >= 30 && soNeg.itens.some((r) => r.acao === 'sem_permissao' && r.detalhes && r.detalhes.permissao === 'gerenciar_selos') && comFicha.itens.length >= 1,
    'os filtros do Dono: quem fez, a ação (banir pega as duas), só as negadas (as tentativas sem permissão com a permissão) e o "olhou a ficha"', [soMod.itens.length, soBanir.itens.map((r) => r.acao), soNeg.itens.length, comFicha.itens.length]);
  const pag1 = await q('dono109.registros', { soStaff: true, dias: 1, limite: 5, resultado: 'todos', semConsultas: false }, donoTok);
  const pag2 = await q('dono109.registros', { soStaff: true, dias: 1, limite: 5, resultado: 'todos', semConsultas: false, antesDe: pag1.itens[4].id }, donoTok);
  confere(pag1.itens.length === 5 && !pag1.fim && pag2.itens.length === 5 && pag2.itens[0].id < pag1.itens[4].id, 'os registros em páginas (os mais antigos depois)', [pag1.itens.map((r) => r.id), pag2.itens.map((r) => r.id)]);
  const resumo = await q('dono109.resumoStaff', { dias: 7 }, donoTok);
  const rMod = resumo.pessoas.find((p) => p.nome === 'Mod Bia'), rAjd = resumo.pessoas.find((p) => p.nome === 'Ajuda Léo');
  confere(rMod && rMod.silenciou === 2 && rMod.baniu === 1 && rMod.advertiu === 1 && rMod.tirouDaSala === 1 && rMod.trocouNome === 1 && rMod.negadas >= 10 && rAjd && rAjd.silenciou === 1 && rAjd.notas === 1,
    'o resumo da staff: quantas vezes cada um silenciou, baniu, advertiu, tirou da sala, trocou nome, e as negadas', [rMod, rAjd]);

  // ======================================================================= 8) o Dono: a carteira, o verificado, a equipe, o 2FA e as permissões
  const w0 = await q('dono109.carteira', { termo: p1 }, donoTok);
  const w1 = await m('dono109.ajustarCarteira', { termo: p1, moedas: 500, gemas: 5, motivo: 'Campeão do torneio', confirmacao: true }, donoTok);
  const eTira = await erro(m('dono109.ajustarCarteira', { termo: p1, moedas: -(w1.moedas + 1000), motivo: 'teste', confirmacao: true }, donoTok));
  const w2 = await m('dono109.ajustarCarteira', { termo: p1, moedas: -100, motivo: 'Correção', confirmacao: true }, donoTok);
  const presente = await sqlT("SELECT corpo FROM mensagens m JOIN usuarios u ON u.id = m.usuario_id WHERE u.id_publico = ? AND m.titulo = 'Presente da equipe do RACHA'", [Number(p1)]);
  const tx = await sqlT("SELECT COUNT(*) AS n FROM transacoes t JOIN usuarios u ON u.id = t.usuario_id WHERE u.id_publico = ? AND t.tipo = 'ajuste_admin'", [Number(p1)]);
  confere(w1.moedas === w0.moedas + 500 && w1.gemas === w0.gemas + 5 && eTira && /não tem tudo isso/.test(eTira.message) && w2.moedas === w1.moedas - 100 && presente.length === 1 && /500 moedas e 5 gemas/.test(presente[0].corpo) && tx[0].n === 2,
    'o Dono dá e tira moedas e gemas (o jogador recebe o aviso do presente; tirar mais do que tem é recusado; o histórico da carteira guarda)', [w0, w1, w2, eTira && eTira.message, presente, tx]);
  await m('admin.gerenciarSelo', { termo: p1, selo: 'verificado', acao: 'conceder', confirmacao: true }, donoTok);
  const fV = await q('staff109.ficha', { termo: p1 }, donoTok);
  confere(fV.selos.includes('verificado'), 'o Dono dá o verificado', fV.selos);
  const eq = await q('dono109.equipe', undefined, donoTok);
  const eMod = eq.find((x) => x.jogador && x.jogador.username === 'mod109'), eLeg = eq.find((x) => x.jogador && x.jogador.username === 'leg109');
  confere(eq[0].cargo === 'dono' && eMod && eMod.doisFatores === 'ligado' && eMod.sessoesAbertas >= 1 && eMod.acoes7d >= 5 && eMod.negadas7d >= 10 && eLeg && eLeg.doisFatores === 'esperando',
    'a equipe no painel do Dono: o cargo, o 2FA (ligado / esperando o 1º login), as sessões abertas e o que cada um fez', eq.map((x) => [x.jogador && x.jogador.username, x.cargo, x.doisFatores, x.sessoesAbertas, x.acoes7d, x.negadas7d]));
  // o ajuste de permissões só tira: tirar o "silenciar" do Moderador; pedir "gerenciar_selos" não dá nada
  const ajuste = await m('admin.definirPermissoes', { termo: 'mod109', permissoes: ['consultar_jogadores', 'analisar_denuncias', 'advertir', 'gerenciar_selos', 'dar_moedas'], confirmacao: true }, donoTok);
  const eSilMod = await erro(sil(p5, 5, 'teste sem permissão', modTok));
  const eSeloMod = await erro(m('admin.gerenciarSelo', { termo: p5, selo: 'verificado', acao: 'conceder', confirmacao: true }, modTok));
  confere(ajuste.aplicadas.join() === 'consultar_jogadores,analisar_denuncias,advertir' && eSilMod && /não silencia/.test(eSilMod.message) && eSeloMod && eSeloMod.code === 'FORBIDDEN',
    'o ajuste de permissões só tira poderes (o "gerenciar_selos" e o "dar_moedas" pedidos não entram; sem "silenciar", o Moderador não cala mais)', [ajuste.aplicadas, eSilMod && eSilMod.message]);
  // resetar o 2FA e encerrar as sessões
  await m('dono109.resetar2fa', { termo: 'mod109', confirmacao: true }, donoTok);
  const estMod = await q('admin.estadoPainel', undefined, modTok);
  const totpMod = await sqlT('SELECT COUNT(*) AS n FROM totp WHERE usuario_id = ?', [modId]);
  const lpMod = await m('admin.loginPainel', { username: 'mod109', senha: 'Senha-mod109-9x' });
  confere(!estMod.logado && totpMod[0].n === 0 && lpMod.configurar2fa && /^[A-Z2-7]{32}$/.test(segredoDaUrl(lpMod.url2fa)), 'resetar o 2FA do Moderador: a sessão do painel dele cai e o próximo login mostra um QR code novo', [estMod.logado, lpMod.configurar2fa]);
  const eProprio = await erro(m('dono109.resetar2fa', { termo: 'dono', confirmacao: true }, donoTok));
  confere(eProprio && /confirme a sua senha/.test(eProprio.message), 'o próprio 2FA do Dono só com a senha', eProprio && eProprio.message);
  await m('dono109.encerrarSessoes', { termo: 'adm109', confirmacao: true }, donoTok);
  const estAdm = await q('admin.estadoPainel', undefined, admTok);
  confere(!estAdm.logado, 'encerrar as sessões do painel do Administrador: ele precisa entrar de novo', estAdm);
  const negDono = await erro(m('staff109.silenciar', { termo: 'dono', minutos: 5, motivo: 'teste', confirmacao: true }, ajdTok));
  confere(negDono && negDono.code === 'FORBIDDEN', 'e ninguém da staff mexe no Dono', negDono && negDono.message);
  W1.ws.close(); W2.ws.close(); W5.ws.close();
} catch (e) {
  falhou++;
  console.log('  FALHOU  (erro) ' + (e && e.stack || e));
  if (S) console.log(S.log().slice(-3000));
} finally {
  if (S) { S.p.kill('SIGTERM'); await new Promise((r) => S.p.once('exit', r)); }
}
console.log(`v109 · os dois painéis e o 2FA: ${ok} ok, ${falhou} falharam em ${((Date.now() - T0) / 1000).toFixed(1)} s`);
process.exit(falhou ? 1 : 0);
