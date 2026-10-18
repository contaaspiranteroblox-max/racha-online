// RACHA · v88 — a PLATAFORMA (as rotas novas e as completadas) rodando de verdade na plataforma de teste (tests/plataforma:
// o código de app/api com um SQLite no lugar do MySQL), com três contas: amizades (pedir, recusar, pedir de novo, cancelar,
// aceitar, remover, bloquear), a central de mensagens, o correio (login do dia, presente de teste, COLETAR uma vez), a
// carteira e a loja (comprar, saldo insuficiente, preço mudado, pacote, peças da tampinha, equipar, trocar gemas), as partidas
// rendendo moedas/missões/passe, as missões (COLETAR), o passe (grátis, premium, coletar tudo), os eventos (presente), as
// estatísticas, a denúncia (repetida e conta nova), o clube (pedido, admin, estatísticas, histórico, ranking), a
// privacidade, o RACHA CONTROL (2FA, carta para uma conta, evento novo), excluir a conta e — reiniciando o servidor com o
// mesmo arquivo de banco — tudo continua lá.
//   node tests/v88_plataforma_test.mjs
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
const banco = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'racha88-')), 'plataforma.sqlite');

function sobe() {
  return new Promise((res, rej) => {
    const p = fork(path.join(RAIZ, 'tests', 'plataforma', 'servidor.mjs'), ['--porta', '0', '--teste', '--banco', banco, '--sem-compilar'], { silent: true, env: { ...process.env, RACHA_PRESENTE_TESTE: '1', RACHA_CADASTRO: 'aberto', RACHA_OWNER_PASSWORD: 'Dono-Teste-88v' } });   // v88.1: o cadastro aberto (as contas pelo jogo) e a senha do Dono pela variável
    let log = '';
    p.stdout.on('data', (d) => { log += d; }); p.stderr.on('data', (d) => { log += d; });
    p.on('message', (m) => { if (m && m.pronto) res({ p, porta: m.porta, log: () => log }); });
    setTimeout(() => rej(new Error('a plataforma de teste não subiu: ' + log)), 20000);
  });
}
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
  return (await r.json()).linhas;
}
function totp(segredoB32, t = Date.now()) {               // (o mesmo TOTP do app/api/racha/security.ts: RFC 6238, 30 s, 6 dígitos)
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = ''; for (const ch of segredoB32.replace(/=+$/, '').toUpperCase()) bits += B32.indexOf(ch).toString(2).padStart(5, '0');
  const chave = Buffer.alloc(Math.floor(bits.length / 8)); for (let i = 0; i < chave.length; i++) chave[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  const cont = Buffer.alloc(8); cont.writeBigUInt64BE(BigInt(Math.floor(t / 30000)));
  const h = crypto.createHmac('sha1', chave).update(cont).digest(); const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1000000)).padStart(6, '0');
}

async function conta(nome) {
  const r = await m('auth.registrar', { username: nome, nomeExibicao: nome, senha: 'senha1234', confirmacaoSenha: 'senha1234', email: nome + '@x.com', aceiteTermos: true });
  return { token: r.token, pub: r.conta.idPublico, nome };
}
async function partida(token, o) {
  const id = crypto.randomUUID();
  const ini = await m('jogo.iniciarPartida', { matchId: id, modo: 'futebol', mapa: 'estadio', nivelBots: 'medio', ranqueada: !!o.ranqueada, online: false, tamanho: 1 }, token);
  return m('jogo.encerrarPartida', { matchId: id, matchToken: ini.matchToken, placarNosso: o.nosso, placarDeles: o.deles, gols: o.gols, assistencias: o.assist || 0, duracaoSeg: 150, mvp: !!o.mvp }, token);
}

async function principal() {
  let S = await sobe();
  BASE = 'http://127.0.0.1:' + S.porta;
  try {
    console.log('1) três contas na plataforma de teste (as rotas de verdade, banco SQLite)');
    const A = await conta('kauazin7'), B = await conta('lucasznx'), C = await conta('santiagox');
    confere(A.pub && B.pub && C.pub && A.pub !== B.pub, 'três contas com ID público', [A.pub, B.pub, C.pub]);

    console.log('\n2) amigos: buscar, pedir, recusar, pedir de novo, cancelar, aceitar');
    let busca = await q('social.buscar', { termo: 'luc' }, A.token);
    confere(busca.length === 1 && busca[0].idPublico === B.pub && busca[0].relacao === 'nada', 'buscar pelo começo do nome: acha e diz a relação (nada)', busca);
    busca = await q('social.buscar', { termo: B.pub }, A.token);
    confere(busca.length === 1 && busca[0].nome === 'lucasznx', 'buscar pelo ID público', busca);
    const p1 = await m('amigos.enviarPedido', { termo: B.pub }, A.token);
    let rB = await q('social.resumo', undefined, B.token);
    confere(p1.ok && !p1.viraram && rB.pedidos === 1 && rB.mensagens.amigos === 1, 'pedido enviado: o outro vê o pedido e a mensagem em AMIGOS (não lida)', rB);
    let ped = await q('amigos.pedidos', undefined, B.token);
    await m('amigos.responderPedido', { pedidoId: ped.recebidos[0].pedidoId, aceitar: false }, B.token);
    const de2 = await m('amigos.enviarPedido', { termo: B.pub }, A.token).catch((e) => e);
    confere(de2 && de2.ok, 'v88: depois de recusado, pedir de novo funciona (antes: erro de chave repetida)', de2 && de2.message);
    ped = await q('amigos.pedidos', undefined, A.token);
    const can = await m('amigos.cancelarPedido', { pedidoId: ped.enviados[0].pedidoId }, A.token);
    rB = await q('social.resumo', undefined, B.token);
    confere(can.ok && rB.pedidos === 0, 'cancelar o pedido enviado: some para o outro', rB);
    await m('amigos.enviarPedido', { termo: B.pub }, A.token);
    ped = await q('amigos.pedidos', undefined, B.token);
    await m('amigos.responderPedido', { pedidoId: ped.recebidos[0].pedidoId, aceitar: true }, B.token);
    const amA = await q('social.amigos', undefined, A.token), amB = await q('social.amigos', undefined, B.token);
    confere(amA.length === 1 && amA[0].idPublico === B.pub && amB.length === 1 && amB[0].idPublico === A.pub, 'aceitou: os dois na lista de amigos (com o cartão)', [amA, amB]);
    const relA = await q('social.relacoes', undefined, A.token);
    confere(relA.amigos.includes(B.pub) && relA.mostraOnline === true, 'as relações da conta (para o servidor das salas): o amigo novo', relA);
    const msgsA = await q('mensagens.listar', { categoria: 'amigos' }, A.token);
    confere(msgsA.some((x) => /agora é seu amigo/.test(x.titulo) && x.de && x.de.idPublico === B.pub), 'a mensagem da amizade na central (categoria AMIGOS, com quem)', msgsA.map((x) => x.titulo));
    const lidas = await m('mensagens.marcarLida', { categoria: 'amigos' }, A.token);
    const rA0 = await q('social.resumo', undefined, A.token);
    confere(lidas.marcadas >= 1 && rA0.mensagens.amigos === 0, 'marcar como lidas: o contador zera', rA0.mensagens);
    const perf = await q('social.perfil', { idPublico: B.pub }, A.token);
    confere(perf.relacao === 'amigo' && perf.numeros && perf.numeros.partidas === 0 && !perf.privado, 'ver o perfil do amigo (os números reais: zero partidas ainda)', perf);

    console.log('\n3) bloqueio e privacidade');
    await m('amigos.enviarPedido', { termo: A.pub }, C.token);
    await m('amigos.bloquear', { termo: C.pub }, A.token);
    const pedC = await q('amigos.pedidos', undefined, A.token);
    const buscaC = await q('social.buscar', { termo: A.pub }, C.token);
    const e1 = await erro(m('amigos.enviarPedido', { termo: A.pub }, C.token));
    confere(pedC.recebidos.length === 0 && buscaC.length === 0 && e1 && e1.code === 'FORBIDDEN', 'bloquear: o pedido some, quem foi bloqueado não acha você nem pede de novo', [pedC, buscaC, e1 && e1.message]);
    const relA2 = await q('social.relacoes', undefined, A.token);
    confere(relA2.bloqueios.includes(C.pub), 'o bloqueado entra nas relações (o servidor das salas esconde as mensagens dele)', relA2);
    await m('amigos.desbloquear', { termo: C.pub }, A.token);
    const pv = await m('social.definirPrivacidade', { mostraOnline: false, aceitaConvites: false }, B.token);
    const relB = await q('social.relacoes', undefined, B.token);
    confere(pv.mostraOnline === false && relB.mostraOnline === false && relB.aceitaConvites === false, 'privacidade: esconder o status online e não aceitar convites (vai para o servidor das salas)', relB);
    await m('social.definirPrivacidade', { mostraOnline: true, aceitaConvites: true }, B.token);
    const bio = await erro(m('social.definirBio', { bio: 'me chama no zap 21 98888-7777' }, A.token));
    const bio2 = await m('social.definirBio', { bio: 'Se joga no estilo!' }, A.token);
    confere(bio && bio.code === 'BAD_REQUEST' && bio2.bio === 'Se joga no estilo!', 'a bio: telefone barrado, frase normal salva', bio && bio.message);

    console.log('\n4) o correio: o login do dia e o presente de teste, COLETAR uma vez');
    const carta0 = await q('correio.listar', undefined, A.token);
    const login = carta0.find((c) => c.tipo === 'login'), presente = carta0.find((c) => c.tipo === 'presente');
    confere(login && /dia 1/.test(login.titulo) && login.anexos.length && presente && presente.anexos.some((a) => a.tipo === 'moedas' && a.qtd === 50000), 'chegaram: a recompensa de login (dia 1) e o presente de teste (RACHA_PRESENTE_TESTE)', carta0.map((c) => c.titulo));
    const cart0 = await q('loja.carteira', undefined, A.token);
    confere(cart0.moedas === 500 && cart0.gemas === 25, 'a carteira da conta nova começa como o jogo: 500 moedas e 25 gemas', cart0);
    const col = await m('correio.coletar', { id: presente.id }, A.token);
    const col2 = await erro(m('correio.coletar', { id: presente.id }, A.token));
    confere(col.carteira.moedas === 50500 && col.carteira.gemas === 5025 && col2 && col2.code === 'CONFLICT', 'COLETAR: o prêmio entra na carteira (validado no servidor) e não vale de novo', [col.carteira, col2 && col2.message]);
    const colB = await erro(m('correio.coletar', { id: login.id }, B.token));
    confere(colB && colB.code === 'NOT_FOUND', 'a carta de uma conta não se coleta com outra', colB && colB.message);
    const todas = await m('correio.coletarTodas', undefined, A.token);
    confere(todas.cartas >= 1 && todas.moedas >= 200, 'COLETAR TUDO: o login do dia', todas);
    const ext = await q('loja.extrato', undefined, A.token);
    confere(ext.some((t) => t.tipo === 'correio' && t.moedas === 50000), 'o extrato da carteira registra a coleta (tipo correio)', ext.slice(0, 3));

    console.log('\n5) a loja: comprar, preço mudado, saldo insuficiente, pacote, peças, equipar, trocar');
    const est = await q('loja.estado', undefined, A.token);
    confere(est.destaques.length >= 6 && est.ofertas.length >= 4 && est.ofertas.every((o) => o.desconto === 30), 'a vitrine: destaques do dia e ofertas da semana (30% off) com o preço do servidor', [est.destaques.length, est.ofertas.map((o) => o.codigo)]);
    const errPreco = await erro(m('loja.comprar', { codigo: 'bola_rua', preco: { moedas: 1, gemas: 0 } }, A.token));
    confere(errPreco && errPreco.code === 'CONFLICT' && /mudou/.test(errPreco.message), 'preço diferente do catálogo: recusado (o aparelho não decide preço)', errPreco && errPreco.message);
    const precoRua = est.ofertas.find((o) => o.codigo === 'bola_rua') ? est.ofertas.find((o) => o.codigo === 'bola_rua') : { moedas: 1500, gemas: 0 };
    const compra = await m('loja.comprar', { codigo: 'bola_rua', preco: { moedas: precoRua.moedas, gemas: precoRua.gemas } }, A.token);
    confere(compra.ok && compra.itens.includes('bola_rua') && compra.carteira.moedas === todas.carteira.moedas - precoRua.moedas, 'comprou a Bola de Rua: o item no inventário e a carteira menor', compra);
    const de2c = await erro(m('loja.comprar', { codigo: 'bola_rua', preco: { moedas: precoRua.moedas, gemas: precoRua.gemas } }, A.token));
    confere(de2c && de2c.code === 'CONFLICT', 'comprar o mesmo item de novo: recusado', de2c && de2c.message);
    const pobre = await erro(m('loja.comprar', { codigo: 'bola_ouro', preco: { moedas: 0, gemas: est.ofertas.find((o) => o.codigo === 'bola_ouro') ? est.ofertas.find((o) => o.codigo === 'bola_ouro').gemas : 150 } }, B.token));
    const cartB = await q('loja.carteira', undefined, B.token);
    confere(pobre && pobre.code === 'PRECONDITION_FAILED' && /insuficiente/i.test(pobre.message) && cartB.gemas === 25, 'saldo insuficiente: a compra não acontece e o saldo fica igual', [pobre && pobre.message, cartB]);
    const pac = await m('loja.comprar', { codigo: 'pacote_laje', preco: { moedas: 0, gemas: 90 } }, A.token);
    const inv = await q('loja.estado', undefined, A.token);
    confere(pac.ok && ['banner_grafite', 'com_danca', 'gol_confete'].every((c) => inv.inventario.includes(c)), 'o pacote entrega tudo o que mostra', pac.itens);
    const pecas = await m('loja.comprarPecas', { pecas: ['b:df', 'p:an', 'i:al'], total: { moedas: 900, gemas: 0 } }, A.token);
    confere(pecas.ok && pecas.itens.length === 3 && pecas.pago.moedas === 900, 'as peças da tampinha (o editor): as três de uma vez, pelo preço do jogo (300 cada)', pecas);
    const eq1 = await m('loja.equipar', { tipo: 'bola', codigo: 'bola_rua' }, A.token);
    const eq2 = await erro(m('loja.equipar', { tipo: 'bola', codigo: 'bola_ouro' }, A.token));
    const eq3 = await erro(m('loja.equipar', { tipo: 'avatar', codigo: 'bola_rua' }, A.token));
    confere(eq1.equipados.bola === 'bola_rua' && eq2 && eq2.code === 'FORBIDDEN' && eq3 && eq3.code === 'FORBIDDEN', 'equipar: só o que é seu e no lugar certo', [eq1.equipados, eq2 && eq2.message]);
    const relA3 = await q('social.relacoes', undefined, A.token);
    confere(relA3.cos.bola === 'bola_rua', 'o cosmético equipado vai para o servidor das salas (os outros veem na partida)', relA3.cos);
    const nonce = crypto.randomUUID();
    const tr = await m('loja.trocar', { id: 'troca_30', nonce }, A.token);
    const tr2 = await m('loja.trocar', { id: 'troca_30', nonce }, A.token);
    confere(tr.ok && !tr.duplicada && tr2.duplicada && tr2.carteira.gemas === tr.carteira.gemas, 'trocar 30 gemas por 600 moedas; o toque dobrado (mesmo nonce) não troca duas vezes', [tr, tr2]);

    console.log('\n6) as partidas rendem na conta: moedas, missões e o passe');
    const cAntes = (await q('loja.carteira', undefined, A.token)).moedas;
    const p1r = await partida(A.token, { nosso: 2, deles: 1, gols: 2, mvp: true });
    confere(p1r.moedasGanhas === 25 + 60 + 20 && p1r.carteira.moedas === cAntes + 105 + (p1r.niveisPremiados || []).reduce((a, n) => a + n.moedas, 0), 'vitória com 2 gols: +105 moedas na carteira (as regras do jogo: 25 + 60 + 10 por gol)', p1r);
    confere(p1r.passe && p1r.passe.xp === 100 && p1r.mvp === true, 'o passe ganha 100 de XP (partida + vitória) e o melhor da partida conta', [p1r.passe, p1r.mvp]);
    let ms = await q('missoes.listar', undefined, A.token);
    const dia = ms.find((g) => g.grupo === 'diarias'), sem = ms.find((g) => g.grupo === 'semanais'), temp = ms.find((g) => g.grupo === 'temporada'), esp = ms.find((g) => g.grupo === 'especiais');
    const d3 = dia.missoes.find((x) => x.id === 'd_partidas3');
    confere(dia.missoes.length === 4 && sem.missoes.length === 4 && temp && esp && d3.progresso === 1, 'as missões: 4 diárias, 4 semanais, as da temporada e as especiais (do evento); "Jogue 3 partidas" em 1/3', [dia.missoes.map((x) => x.id + ':' + x.progresso), esp && esp.evento]);
    const naoPronta = await erro(m('missoes.coletar', { missao: 'd_partidas3', periodo: dia.periodo }, A.token));
    confere(naoPronta && naoPronta.code === 'PRECONDITION_FAILED', 'COLETAR antes de cumprir: recusado', naoPronta && naoPronta.message);
    await partida(A.token, { nosso: 0, deles: 1, gols: 0 });
    await partida(A.token, { nosso: 1, deles: 1, gols: 1, assist: 1 });
    ms = await q('missoes.listar', undefined, A.token);
    const d3b = ms.find((g) => g.grupo === 'diarias').missoes.find((x) => x.id === 'd_partidas3');
    const colM = await m('missoes.coletar', { missao: 'd_partidas3', periodo: dia.periodo }, A.token);
    const colM2 = await erro(m('missoes.coletar', { missao: 'd_partidas3', periodo: dia.periodo }, A.token));
    confere(d3b.pronta && colM.moedas === 200 && colM.xpPasse === 100 && colM2 && colM2.code === 'CONFLICT', '3 partidas: a missão fica pronta, COLETAR dá o prêmio (200 moedas + 100 XP do passe) uma vez só', [d3b, colM, colM2 && colM2.message]);
    const desafio = (await q('eventos.listar', undefined, A.token)).find((e) => e.slug === 'desafio-da-favela');
    confere(desafio && desafio.progresso.missoes.find((x) => x.id.endsWith('gols10')).progresso === 3, 'o desafio do evento conta os gols das partidas válidas (3 de 10)', desafio && desafio.progresso);
    const treino = await m('jogo.golTreino', { quantidade: 2, origem: 'livre' }, A.token);
    confere(treino.validos === 2 && treino.moedasGanhas === 8, 'gol no treino livre: 4 moedas por gol (o teto do dia do jogo)', treino);
    const ex1 = await m('jogo.treinoConcluido', { exercicio: 'finalizacao', estrelas: 3, recorde: true, nonce: crypto.randomUUID() }, A.token);
    confere(ex1.moedas === 120 && ex1.gemas === 10 && ex1.cheio, 'fim do exercício com 3 estrelas e recorde: 100 + 20 moedas e 10 gemas (a primeira vez)', ex1);

    console.log('\n7) o passe: grátis, premium, coletar tudo');
    await sqlT('UPDATE passe_temporada SET xp = 1350 WHERE usuario_id = (SELECT id FROM usuarios WHERE username = ?)', ['kauazin7']);
    let ps = await q('passe.estado', undefined, A.token);
    confere(ps.nivel === 2 && !ps.premium && ps.trilha.length === 30, 'o passe: nível 2 (1.350 XP), 30 níveis, ainda grátis', [ps.nivel, ps.premium]);
    const g1 = await m('passe.coletar', { nivel: 1, trilha: 'g' }, A.token);
    const p1e = await erro(m('passe.coletar', { nivel: 1, trilha: 'p' }, A.token));
    const g3 = await erro(m('passe.coletar', { nivel: 3, trilha: 'g' }, A.token));
    confere(g1.moedas === 300 && p1e && p1e.code === 'FORBIDDEN' && g3 && g3.code === 'PRECONDITION_FAILED', 'coletar: o nível 1 grátis (300 moedas); o premium sem passe e o nível que não chegou são recusados', [g1.moedas, p1e && p1e.message, g3 && g3.message]);
    const prem = await m('passe.comprarPremium', undefined, A.token);
    const tudo = await m('passe.coletarTudo', undefined, A.token);
    const inv2 = await q('loja.estado', undefined, A.token);
    confere(prem.ok && tudo.recompensas === 3 && inv2.inventario.includes('tp_t1_rua'), 'o premium com 499 gemas; COLETAR TUDO: o que faltava (o nível 2 grátis e os dois premium: a tampinha exclusiva)', [tudo, inv2.inventario.filter((x) => x.startsWith('tp_'))]);

    console.log('\n8) os eventos e as estatísticas');
    const evs = await q('eventos.listar', undefined, A.token);
    confere(evs.length >= 5 && evs.every((e) => e.nome && e.regras && e.inicio && e.fim && e.imagem), 'a central de eventos: os 5 padrão com nome, desenho, duração e regras', evs.map((e) => e.slug));
    const pg = await m('eventos.pegarPresente', { slug: 'bem-vindo-v88' }, A.token);
    const pg2 = await m('eventos.pegarPresente', { slug: 'bem-vindo-v88' }, A.token);
    confere(pg.ok && !pg.jaPegou && pg2.jaPegou, 'o presente do evento vai para o correio, uma vez', [pg, pg2]);
    const st = await q('estat.resumo', { temporada: 'tudo', modo: 'tudo' }, A.token);
    confere(st.partidas === 3 && st.vitorias === 1 && st.derrotas === 1 && st.empates === 1 && st.gols === 3 && st.assistencias === 1 && st.aproveitamento === 44 && st.mvp === 1 && st.tempoSeg === 450 && st.historico.length === 3,
      'as estatísticas de verdade: 3 partidas (1V 1E 1D), 3 gols, 1 assistência, aproveitamento 44%, 1 melhor da partida, 7:30 jogados', st);
    const stR = await q('estat.resumo', { temporada: 'tudo', modo: 'ranqueada' }, A.token);
    confere(stR.partidas === 0, 'o filtro por modo (ranqueada: nenhuma ainda)', stR.partidas);

    console.log('\n9) a denúncia: conta nova, repetida, os motivos novos');
    const nova = await erro(m('amigos.denunciar', { termo: C.pub, motivo: 'toxico' }, A.token));
    confere(nova && nova.code === 'FORBIDDEN', 'conta criada agora não denuncia (conta feita só para denunciar)', nova && nova.message);
    await sqlT("UPDATE usuarios SET criado_em = criado_em - 3600000 WHERE username IN ('kauazin7','lucasznx','santiagox')");
    const den = await m('amigos.denunciar', { termo: C.pub, motivo: 'toxico', detalhes: 'xingou no chat', origem: 'perfil' }, A.token);
    const den2 = await m('amigos.denunciar', { termo: C.pub, motivo: 'toxico' }, A.token);
    const linhaDen = await sqlT("SELECT motivo, contexto, estado FROM denuncias");
    confere(den.ok && !den.repetida && den2.repetida && linhaDen.length === 1 && linhaDen[0].motivo === 'toxico' && /Comportamento tóxico/.test(linhaDen[0].contexto), 'a denúncia entra no banco (a tabela do RACHA CONTROL) e a repetida do dia não entra de novo', linhaDen);

    console.log('\n10) o clube: pedido para entrar, admin, estatísticas, histórico e ranking');
    const cl = await m('clubes.criar', { nome: 'Racha FC', descricao: 'Futebol de rua sempre!', pais: 'BR', tipo: 'convite', trofeuMinimo: 0 }, A.token);
    const entr = await erro(m('clubes.entrar', { id: cl.id }, B.token));
    const pd = await m('clubes.pedirEntrada', { id: cl.id }, B.token);
    const rA = await q('social.resumo', undefined, A.token);
    const pds = await q('clubes.pedidos', undefined, A.token);
    confere(entr && entr.code === 'FORBIDDEN' && pd.ok && rA.pedidosClube === 1 && pds.length === 1 && pds[0].jogador.idPublico === B.pub, 'clube só por convite: entrar direto não dá; o pedido chega ao dono (com aviso)', [entr && entr.message, rA.pedidosClube]);
    await m('clubes.responderPedido', { pedidoId: pds[0].pedidoId, aceitar: true }, A.token);
    await m('clubes.definirAdmin', { id: B.pub, admin: true }, A.token);
    const ver = await q('clubes.ver', { id: cl.id }, B.token);
    confere(ver.souMembro && ver.souAdmin && ver.souGestor && ver.lista.find((x) => x.id === B.pub).papel === 'admin', 'aceito e virou admin (o dono escolhe)', ver.lista);
    const relB2 = await q('social.relacoes', undefined, B.token);
    confere(relB2.clube === 'p' + cl.id, 'o clube vai nas relações (o chat do clube no servidor das salas)', relB2.clube);
    const ce = await q('clubes.estatisticas', { id: cl.id }, A.token), ch = await q('clubes.historico', { id: cl.id }, A.token), cr = await q('clubes.ranking', undefined, A.token);
    confere(ce.membros === 2 && ce.partidas === 3 && ce.gols === 3 && ch.length === 3 && ch[0].jogador === 'kauazin7' && cr[0].nome === 'Racha FC', 'as estatísticas coletivas, o histórico das partidas dos membros e o ranking', [ce, ch.length, cr.length]);

    console.log('\n11) RACHA CONTROL (painel com 2FA): carta para uma conta e evento novo');
    const lp = await m('admin.loginPainel', { username: 'dono', senha: 'Dono-Teste-88v' });   // (v88.1: a senha do manual não abre mais o painel)
    const seg = (await sqlT('SELECT segredo FROM totp LIMIT 1'))[0].segredo;
    await m('admin.verificar2fa', { token: lp.token, codigo: totp(seg) });
    const env = await m('admin88.correioEnviar', { para: B.pub, tipo: 'compensacao', titulo: 'Compensação oficial', corpo: 'Desculpe pela queda do servidor.', anexos: [{ tipo: 'gemas', qtd: 50 }, { tipo: 'item', codigo: 'av_coroa', qtd: 1 }] }, lp.token);
    const errAnexo = await erro(m('admin88.correioEnviar', { para: B.pub, tipo: 'presente', titulo: 'Item falso', anexos: [{ tipo: 'item', codigo: 'item_que_nao_existe', qtd: 1 }] }, lp.token));
    const cartasB = await q('correio.listar', undefined, B.token);
    const comp = cartasB.find((c) => c.tipo === 'compensacao');
    const colComp = await m('correio.coletar', { id: comp.id }, B.token);
    confere(env.ok && comp && colComp.gemas === 50 && colComp.itens.includes('av_coroa') && errAnexo && errAnexo.code === 'BAD_REQUEST', 'a compensação chega no correio da conta e COLETAR entrega (anexo de item inexistente é recusado)', [colComp, errAnexo && errAnexo.message]);
    const semPainel = await erro(m('admin88.correioEnviar', { para: B.pub, tipo: 'presente', titulo: 'Tentativa', anexos: [{ tipo: 'gemas', qtd: 9999 }] }, A.token));
    confere(semPainel && (semPainel.code === 'FORBIDDEN' || semPainel.code === 'UNAUTHORIZED'), 'quem não é da equipe (sessão de jogo) não manda carta', semPainel && semPainel.message);
    const agora = Date.now();
    const evNovo = await m('admin88.eventoSalvar', { slug: 'fim-de-semana', tipo: 'temporario', nome: 'FIM DE SEMANA NA LAJE', descricao: 'Oferta especial', regras: 'Vale até domingo.', imagem: 'noite', inicio: new Date(agora - 1000).toISOString(), fim: new Date(agora + 3 * 864e5).toISOString(), config: { ofertas: { bola_couro: 50 } } }, lp.token);
    const evs2 = await q('eventos.listar', undefined, A.token);
    const est2 = await q('loja.estado', undefined, A.token);
    const of = est2.ofertas.find((o) => o.codigo === 'bola_couro');
    confere(evNovo.ok && evs2.some((e) => e.slug === 'fim-de-semana') && of && of.desconto === 50 && of.moedas === 1500, 'o evento novo aparece na central e a oferta dele vale na loja (50%: 1.500 moedas)', of);
    const globais = await m('admin88.correioEnviar', { para: 'todos', tipo: 'manutencao', titulo: 'Manutenção às 3h', corpo: 'O servidor fica fora do ar 10 minutos.', anexos: [], confirmacao: 'DISTRIBUIR' }, lp.token);
    const rC = await q('mensagens.listar', { categoria: 'sistema' }, C.token);
    confere(globais.ok && globais.global && rC.some((x) => x.titulo === 'Manutenção às 3h'), 'o aviso para todos: cada conta recebe na central (SISTEMA) quando abre o jogo', rC.map((x) => x.titulo));

    console.log('\n12) excluir a conta');
    const errSenha = await erro(m('conta.excluir', { senha: 'errada', confirmacao: 'EXCLUIR' }, C.token));
    const exc = await m('conta.excluir', { senha: 'senha1234', confirmacao: 'EXCLUIR' }, C.token);
    const login2 = await erro(m('auth.entrar', { identificador: 'santiagox', senha: 'senha1234' }));
    const busca2 = await q('social.buscar', { termo: C.pub }, A.token);
    const usado = await erro(q('social.resumo', undefined, C.token));
    confere(errSenha && errSenha.code === 'UNAUTHORIZED' && exc.ok && login2 && busca2.length === 0 && usado && usado.code === 'UNAUTHORIZED', 'com a senha errada não exclui; com a certa: a conta some (login, busca, sessão)', [errSenha && errSenha.message, login2 && login2.message]);

    console.log('\n13) reiniciar o servidor com o mesmo banco: tudo continua lá');
    const antes = { cart: await q('loja.carteira', undefined, A.token), inv: (await q('loja.estado', undefined, A.token)).inventario.length, amigos: (await q('social.amigos', undefined, A.token)).length };
    S.p.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 900));
    S = await sobe(); BASE = 'http://127.0.0.1:' + S.porta;
    const depois = { cart: await q('loja.carteira', undefined, A.token), inv: (await q('loja.estado', undefined, A.token)).inventario.length, amigos: (await q('social.amigos', undefined, A.token)).length };
    confere(JSON.stringify(antes) === JSON.stringify(depois) && depois.amigos === 1, 'depois de reiniciar: a mesma sessão, a mesma carteira, o mesmo inventário e os mesmos amigos', [antes, depois]);
    const col3 = await erro(m('correio.coletar', { id: presente.id }, A.token));
    confere(col3 && col3.code === 'CONFLICT', 'e o que foi coletado continua coletado (não paga de novo depois de reiniciar)', col3 && col3.message);
  } catch (e) {
    falhou++; console.log('  FALHOU (erro) ' + (e && e.stack || e) + (e && e.code ? ' [' + e.code + ']' : ''));
    console.log(S.log().slice(-3000));
  } finally {
    S.p.kill('SIGTERM');
  }
  console.log('\nplataforma v88 (rotas de verdade, banco de teste): ' + ok + ' ok, ' + falhou + ' falharam');
  process.exit(falhou ? 1 : 0);
}
principal();
