// RACHA v96 · A TAMPINHA DOS FUNDADORES — o servidor das salas (só quem é fundador aparece com ela) e a plataforma de teste
// (as 30 primeiras contas que entram no jogo ganham, numeradas; ninguém compra; ninguém ganha duas; o bilhete diz quem é;
// o ZERAR CONTAS do Dono devolve as vagas — as contas de teste de antes do lançamento não ficam com elas).
// Rodar: node tests/v96_fundador_test.mjs   (a plataforma de teste: node tests/plataforma/compila.cjs antes, se mudou app/api)
import { fork } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import EventEmitter from 'node:events';
import crypto from 'node:crypto';
const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.RACHA_CONTAGEM_MS = process.env.RACHA_CONTAGEM_MS || '0';
process.env.RACHA_REPLAY = process.env.RACHA_REPLAY || '0';
const { Turma } = require(path.join(RAIZ, 'server', 'turma'));
const { assina } = require(path.join(RAIZ, 'server', 'banco'));
const F96 = require(path.join(RAIZ, 'server', 'fundador96'));
let ok = 0, falhou = 0;
const confere = (c, txt, extra) => { if (c) { ok++; console.log('  ok   ' + txt); } else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra).slice(0, 400) : '')); } };
const t0 = Date.now();

// a tampinha dos fundadores (o código tirado do jogo: RachaSkins96.codigoFundador()) e uma comum
const COD_FUND = 'T.NAVj_qX_-lAKFEA', COD_COMUM = 'T.AAAAaaaa';

console.log('1) o código da tampinha: as peças pelo lugar nas listas');
{
  const p = F96.pecasDoCodigo(COD_FUND);
  confere(p && p.borda === F96.FUNDADOR.borda && p.icone === F96.FUNDADOR.icone, 'a dos fundadores: a borda Aura dos Fundadores (26) e a cara Fundador (86)', p);
  confere(F96.temPecaFundador(COD_FUND) && !F96.temPecaFundador(COD_COMUM) && !F96.temPecaFundador('lixo') && !F96.temPecaFundador(''), 'só ela tem as peças (a comum, o lixo e o vazio não)');
  confere(F96.skinValida({ rel: { cos: {} } }, COD_FUND) === '' && F96.skinValida({ rel: { cos: { fundador: 'tp_fundador' } } }, COD_FUND) === COD_FUND, 'quem não é fundador fica com a padrão; o fundador, com a dele');
  confere(F96.skinValida({}, COD_COMUM) === COD_COMUM, 'as outras tampinhas passam como sempre');
}

console.log('\n2) o servidor das salas: o cartão da sala com a tampinha que vale');
class WsFalso extends EventEmitter {
  constructor() { super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; }
  send(t) { if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
  close() { if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate() { this.close(); } ping() {}
}
{
  const SEG = 'segredo-v96-fundador';
  const t = new Turma({ log: () => {}, agora: () => 1.7e12, p2p: false, segredo: SEG, exigeConta: false });
  const cliente = (nome) => { const ws = new WsFalso(); const c = t.conecta(ws, { headers: {}, socket: { remoteAddress: '10.9.0.' + (Math.random() * 250 | 0) } }); return { ws, c, manda: m => ws.emit('message', JSON.stringify(m)), ult: tipo => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === tipo) return ws.caixa[i]; return null; } }; };
  const bil = (p, n, q) => assina(SEG, Object.assign({ p, n, e: Date.now() + 600000 }, q ? { q } : {}));
  const A = cliente('Ana'); A.manda({ type: 'hello', name: 'Ana', skin: COD_FUND, flag: 'BR', conta: bil('111', 'Ana', { fundador: 'tp_fundador' }) });
  const B = cliente('Beto'); B.manda({ type: 'hello', name: 'Beto', skin: COD_FUND, flag: 'BR', conta: bil('222', 'Beto') });
  const V = cliente('Visita'); V.manda({ type: 'hello', name: 'Visita', skin: COD_FUND, flag: 'BR' });
  confere(A.c.skin === COD_FUND, 'a fundadora (o bilhete assinado diz) entra com a tampinha dos fundadores', A.c.skin);
  confere(B.c.skin === '' && V.c.skin === '', 'a conta comum e o visitante que mandaram o código dela ficam com a padrão', [B.c.skin, V.c.skin]);
  A.manda({ type: 'create', name: 'Sala dos fundadores', pub: false, n: 1 });
  const sala = A.ult('room'); const code = sala && sala.room && sala.room.code;
  B.manda({ type: 'join', code });
  const r = B.ult('room'), mem = r && r.room && r.room.members || [];
  const mA = mem.find(x => x.name === 'Ana'), mB = mem.find(x => x.name === 'Beto');
  confere(mA && mA.skin === COD_FUND && mB && mB.skin === '', 'no cartão da sala: a Ana com a dos fundadores, o Beto com a padrão', mem.map(x => [x.name, x.skin]));
  B.manda({ type: 'profile', skin: COD_FUND });
  const r2 = A.ult('room'), mB2 = (r2 && r2.room.members || []).find(x => x.name === 'Beto');
  confere(mB2 && mB2.skin === '', 'trocar a tampinha pela dos fundadores no meio da sala não vale para quem não é', mB2 && mB2.skin);
  B.manda({ type: 'profile', skin: COD_COMUM });
  const r3 = A.ult('room'), mB3 = (r3 && r3.room.members || []).find(x => x.name === 'Beto');
  confere(mB3 && mB3.skin === COD_COMUM, 'e a tampinha comum vale na hora', mB3 && mB3.skin);
  A.manda({ type: 'profile', skin: COD_COMUM }); A.manda({ type: 'profile', skin: COD_FUND });
  const r4 = B.ult('room'), mA4 = (r4 && r4.room.members || []).find(x => x.name === 'Ana');
  confere(mA4 && mA4.skin === COD_FUND, 'a fundadora troca e volta para a dela', mA4 && mA4.skin);
}

console.log('\n3) a plataforma de teste: as 30 primeiras contas que entram no jogo');
const banco = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'racha96-')), 'plataforma.sqlite');
function sobe() {
  return new Promise((res, rej) => {
    const p = fork(path.join(RAIZ, 'tests', 'plataforma', 'servidor.mjs'), ['--porta', '0', '--teste', '--banco', banco, '--sem-compilar', '--segredo', 'segredo-suite-v96'], { silent: true, env: { ...process.env, RACHA_CADASTRO: 'aberto', RACHA_OWNER_PASSWORD: SENHA_DONO, RACHA_OWNER_USERNAME: 'dono' } });
    let log = ''; p.stdout.on('data', d => { log += d; }); p.stderr.on('data', d => { log += d; });
    p.on('message', m => { if (m && m.pronto) res({ p, porta: m.porta, log: () => log }); });
    setTimeout(() => rej(new Error('a plataforma de teste não subiu: ' + log)), 30000);
  });
}
let BASE = '';
async function api(proc, input, token, query) {
  const corpo = JSON.stringify({ 0: { json: input === undefined ? null : input } });
  const url = BASE + '/api/trpc/' + proc + '?batch=1' + (query ? '&input=' + encodeURIComponent(corpo) : '');
  const r = await fetch(url, { method: query ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: query ? undefined : corpo });
  const um = JSON.parse(await r.text())[0];
  if (um.error) { const e = new Error(um.error.json.message); e.code = um.error.json.data.code; throw e; }
  return um.result.data.json;
}
const q = (p, i, t) => api(p, i, t, true), m = (p, i, t) => api(p, i, t, false);
const sqlT = async (s, params) => (await (await fetch(BASE + '/__teste/sql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql: s, params }) })).json()).linhas;
const SENHA_DONO = 'Dono-Teste-96v';
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
  return lp.token;
}
async function novaConta(nome) {
  await sqlT('DELETE FROM limites');
  const r = await m('auth.registrar', { username: nome, nomeExibicao: nome, senha: 'senha1234', confirmacaoSenha: 'senha1234', email: nome + '@x.com', aceiteTermos: true });
  return r.token;
}
const contaFund = async () => ({ itens: Number((await sqlT("SELECT COUNT(*) AS n FROM itens_usuario WHERE codigo_item = 'tp_fundador'"))[0].n), cont: Number(((await sqlT("SELECT valor FROM contadores WHERE nome = 'fundadores'"))[0] || {}).valor) });
async function principal() {
  const S = await sobe(); BASE = 'http://127.0.0.1:' + S.porta;
  try {
    const contas = [];
    for (let i = 0; i < 33; i++) {
      if (i % 4 === 0) await sqlT('DELETE FROM limites');       // (o limite de cadastros por endereço: o teste cria 33 do mesmo)
      const nome = 'fund' + String(i).padStart(2, '0') + 'x';
      const r = await m('auth.registrar', { username: nome, nomeExibicao: nome, senha: 'senha1234', confirmacaoSenha: 'senha1234', email: nome + '@x.com', aceiteTermos: true });
      contas.push({ token: r.token, pub: r.conta.idPublico, nome });
    }
    confere(contas.length === 33, '33 contas criadas');
    // todas entram no jogo ao mesmo tempo (o jogo pede loja.estado logo que a conta entra)
    const est = await Promise.all(contas.map(c => q('loja.estado', undefined, c.token)));
    const fund = est.map(e => e.fundador).filter(Boolean), nums = fund.map(f => f.numero).sort((a, b) => a - b);
    confere(fund.length === 30, 'exatamente 30 viraram fundadoras (' + fund.length + ')', fund.length);
    confere(nums.join(',') === Array.from({ length: 30 }, (_, i) => i + 1).join(','), 'numeradas de 1 a 30, sem repetir', nums);
    confere(fund.every(f => f.novo && f.vagas === 30), 'a primeira vez diz que é nova (o jogo mostra o aviso uma vez)');
    const semVaga = est.filter(e => !e.fundador).length;
    confere(semVaga === 3, 'as 3 que chegaram depois não ganharam (as vagas acabaram)', semVaga);
    const dono = contas[est.findIndex(e => e.fundador && e.fundador.numero === 7)];
    const de7 = est.find(e => e.fundador && e.fundador.numero === 7);
    confere(de7.inventario.includes('tp_fundador') && de7.inventario.includes('peca:i:zw') && de7.inventario.includes('peca:b:vw'), 'a fundadora tem a tampinha (tp_fundador) e as duas peças no inventário', de7.inventario);
    const inv = await q('loja.inventario', undefined, dono.token), it = inv.find(x => x.codigo === 'tp_fundador');
    confere(it && it.detalhe === 'Fundador nº 7 de 30' && it.raridade === 'fundador', 'no inventário: "Fundador nº 7 de 30", raridade FUNDADOR', it);
    const de7b = await q('loja.estado', undefined, dono.token);
    confere(de7b.fundador && de7b.fundador.numero === 7 && de7b.fundador.novo === false, 'entrar de novo: o mesmo número, sem aviso de novo', de7b.fundador);
    const linhas = await sqlT("SELECT COUNT(*) AS n FROM itens_usuario WHERE codigo_item = 'tp_fundador'");
    confere(Number(linhas[0].n) === 30, 'no banco: 30 tampinhas dos fundadores, nenhuma a mais', linhas);
    const cont = await sqlT("SELECT valor FROM contadores WHERE nome = 'fundadores'");
    confere(Number(cont[0].valor) === 30, 'o contador parou em 30', cont);
    // quem não é fundador não compra
    const fora = contas[est.findIndex(e => !e.fundador)];
    const c1 = await m('loja.comprarPecas', { pecas: ['i:zw', 'b:vw'], total: { moedas: 0, gemas: 0 } }, fora.token).catch(e => e);
    const invF = await q('loja.estado', undefined, fora.token);
    confere(!invF.inventario.includes('peca:i:zw') && !invF.inventario.includes('peca:b:vw') && !invF.fundador, 'as peças dos fundadores não se compram (nada entrou no inventário)', [c1 && (c1.message || c1.itens), invF.inventario.filter(x => /zw|vw|fund/.test(x))]);
    const c2 = await m('loja.comprar', { codigo: 'tp_fundador', preco: { moedas: 0, gemas: 0 } }, fora.token).catch(e => e);
    confere(c2 instanceof Error, 'nem a tampinha inteira (não está à venda)', c2 && c2.message);
    confere(!(invF.destaques || []).some(v => /peca:(i:zw|b:vw)/.test(v.codigo)) && !(invF.ofertas || []).some(v => /fundador|zw|vw/.test(v.codigo)), 'e ela nunca aparece nos destaques nem nas ofertas');
    // a tampinha da conta e o escudo do clube guardados na plataforma (o perfil, o clube e o ranking mostram): sem ser
    // fundador, nem pelo código montado na mão
    const ESC_FUND = 'E.AAVgAAAAAAAA';                     // (um escudo com a cara Fundador: o ícone 86)
    const t1 = await m('clubes.salvarTampa', { codigo: COD_FUND }, fora.token).catch(e => e);
    const t2 = await m('clubes.salvarTampa', { codigo: COD_FUND }, dono.token).catch(e => e);
    const t3 = await m('clubes.criar', { nome: 'Laje Falsa', descricao: 'x', pais: 'BR', tipo: 'publico', trofeuMinimo: 0, escudo: ESC_FUND }, fora.token).catch(e => e);
    const t4 = await m('clubes.criar', { nome: 'Laje Comum', descricao: 'x', pais: 'BR', tipo: 'publico', trofeuMinimo: 0, escudo: 'E.AAgjz35Cxo4u34esSH___g' }, fora.token).catch(e => e);
    const tampaF = (await sqlT('SELECT tampa FROM usuarios WHERE username = ?', [fora.nome]))[0].tampa;
    confere(t1 instanceof Error && t1.code === 'FORBIDDEN' && !(t2 instanceof Error) && t3 instanceof Error && t3.code === 'FORBIDDEN' && !(t4 instanceof Error) && tampaF !== COD_FUND,
      'a tampinha da conta e o escudo do clube: com uma peça dos fundadores, só quem é fundador guarda (a outra conta é recusada; o escudo comum vale)', [t1 && t1.message, t2 && t2.message, t3 && t3.message, t4 && t4.message, tampaF]);
    // o bilhete das salas: as relações assinadas dizem quem é fundador
    const rel7 = await q('social.relacoes', undefined, dono.token), relF = await q('social.relacoes', undefined, fora.token);
    confere(rel7.cos && rel7.cos.fundador === 'tp_fundador' && !(relF.cos && relF.cos.fundador), 'as relações da conta (o bilhete das salas): a fundadora com o selo, a outra sem', [rel7.cos, relF.cos]);
    const b = await m('jogo.bilheteSala', undefined, dono.token);
    const corpo = JSON.parse(Buffer.from(String(b.bilhete).split('.')[0], 'base64url').toString('utf8'));
    confere(corpo.q && corpo.q.fundador === 'tp_fundador', 'o bilhete assinado leva q.fundador (o servidor das salas confere a tampinha por ele)', corpo.q);

    console.log('\n4) o ZERAR CONTAS do Dono (antes do lançamento): as vagas voltam para os jogadores de verdade');
    const D = await m('auth.entrar', { identificador: 'dono', senha: SENHA_DONO });
    const eD = await q('loja.estado', undefined, D.token);
    confere(!eD.fundador, 'o Dono, chegando depois das 30, não ganha', eD.fundador);
    const lp = await painel('dono', SENHA_DONO);
    const z1 = await m('donoContas.zerar', { senha: SENHA_DONO, confirmacao: 'ZERAR' }, lp);
    const f1 = await contaFund();
    confere(z1.ok && z1.apagadas === 33 && f1.itens === 0 && f1.cont === 0, 'zerado: as 33 contas saem e as 30 vagas voltam (nenhuma tampinha, o contador em 0)', [z1.apagadas, f1]);
    const n1 = await novaConta('lanca01x'), n2 = await novaConta('lanca02x');
    const e1 = await q('loja.estado', undefined, n1), e2 = await q('loja.estado', undefined, n2);
    const eD2 = await q('loja.estado', undefined, D.token);
    confere(e1.fundador && e1.fundador.numero === 1 && e2.fundador && e2.fundador.numero === 2 && eD2.fundador && eD2.fundador.numero === 3,
      'logo depois (sem esperar): a primeira conta de verdade é a Fundadora nº 1, a segunda a nº 2 e o Dono, entrando agora, o nº 3', [e1.fundador, e2.fundador, eD2.fundador]);
    const z2 = await m('donoContas.zerar', { senha: SENHA_DONO, confirmacao: 'ZERAR' }, lp);
    const f2 = await contaFund(), invD = await q('loja.inventario', undefined, D.token), itD = invD.find(x => x.codigo === 'tp_fundador');
    confere(z2.ok && f2.itens === 1 && f2.cont === 1 && itD && itD.detalhe === 'Fundador nº 1 de 30', 'zerado de novo com o Dono fundador: ele fica com o nº 1 (e o contador em 1)', [f2, itD && itD.detalhe]);
    const n3 = await novaConta('lanca03x'), e3 = await q('loja.estado', undefined, n3);
    confere(e3.fundador && e3.fundador.numero === 2, 'a próxima conta é a nº 2 (os números nunca repetem)', e3.fundador);
  } finally { S.p.kill(); }
}
await principal().catch(e => { falhou++; console.log('  FALHOU  a plataforma: ' + (e && e.stack || e)); });
console.log('\nv96 · a tampinha dos fundadores: ' + ok + ' ok, ' + falhou + ' falharam em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(falhou ? 1 : 0);
