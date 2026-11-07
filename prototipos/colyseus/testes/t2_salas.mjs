/* PROTÓTIPO COLYSEUS · TESTE 2 — AS SALAS: PÚBLICA, PRIVADA E RANQUEADA (o matchmaking do Colyseus com as regras do RACHA)
   · a casual pública: os dois primeiros caem juntos; com a sala cheia (trancada), o terceiro vai para outra;
   · os modos não se misturam: casual × ranqueada, 1v1 × 2v2, FUTEBOL × COM CURVA; e o pedido sem modo (ou com um modo que
     não existe) é recusado — o filterBy do Colyseus só filtra o que vem no pedido, então a sala confere;
   · a privada: o código de 6 letras (as da turma) é o id da sala; ninguém cai nela pelo joinOrCreate; quem tem o código
     entra (joinById) e a partida começa; código errado não entra;
   · a ranqueada: só pela fila (o QueueRoom do Colyseus, fila.mjs) e só com o bilhete DE VERDADE da plataforma
     (app/api/lib/selo.ts · bilheteDaConta); sem bilhete, com outro segredo, com o bilhete adulterado ou vencido, não entra;
     a fila junta pelo rank ASSINADO no bilhete (o que o aparelho manda no pedido não vale); quem não lotou começa com os bots
     depois da espera; a sala que a fila cria é privada e só aceita quem ela chamou;
   · a mesma conta entrando de novo fica com o MESMO lugar (a conexão velha sai) — uma tampinha por pessoa;
   · o nome do visitante é limpo (sem < >).
   node prototipos/colyseus/testes/t2_salas.mjs */
import { Placar, plataforma } from './comum.mjs';
import { sobe } from '../servidor/index.mjs';
import { Aparelho, ate, espera } from '../cliente/aparelho.mjs';
import { createRequire } from 'node:module';
import { matchMaker } from '@colyseus/core';
const require = createRequire(import.meta.url);
const { assina } = require('../../../server/banco.js');

const P = new Placar('protótipo Colyseus · 2 · as salas: pública, privada e ranqueada');
const SEGREDO = 'segredo-do-teste-' + Date.now();
const PL = await plataforma(SEGREDO);
const s = await sobe({ segredo: SEGREDO, sala: { esperaBotsMs: 1500, filaCiclos: 3, r80: { seg: 600, prorrog: 60 } } });
const url = 'ws://127.0.0.1:' + s.porta;
const ap = (nome, bilhete) => new Aparelho(url, { nome, bilhete });
const recusa = async (p) => { try { await p; return null; } catch (e) { return e && (e.code || e.message || String(e)); } };
const todos = [];
const entra = async (a, metodo, nomeOuId, o) => { todos.push(a); return a.entra(metodo, nomeOuId, o); };

// ---------------------------------------------------------------- a casual pública
{
  const A = ap('Ana'), B = ap('Beto'), C = ap('Caio');
  await entra(A, 'joinOrCreate', 'racha', { modo: 'casual', n: 1 });
  await entra(B, 'joinOrCreate', 'racha', { modo: 'casual', n: 1 });
  await ate(() => A.comecou, 3000);
  await entra(C, 'joinOrCreate', 'racha', { modo: 'casual', n: 1 });
  P.confere(A.sala.roomId === B.sala.roomId && C.sala.roomId !== A.sala.roomId && !!A.comecou, 'casual 1v1: os dois primeiros caem juntos e a partida começa; com a sala cheia (trancada), o terceiro vai para outra', { a: A.sala.roomId, b: B.sala.roomId, c: C.sala.roomId });
  P.confere(A.info.time !== B.info.time && A.info.lugar === 0 && B.info.lugar === 1, 'um em cada time (o lugar 0 é o time A, como no roster da turma)', [A.info, B.info]);
}
// ---------------------------------------------------------------- os modos não se misturam
{
  const D = ap('Dani'), E = ap('Edu'), F = ap('Fabi');
  await entra(D, 'joinOrCreate', 'racha', { modo: 'casual', n: 2 });
  await entra(E, 'joinOrCreate', 'racha', { modo: 'casual', n: 2, jogo: 'curva' });
  await entra(F, 'joinOrCreate', 'racha', { modo: 'casual', n: 2 });
  P.confere(D.sala.roomId === F.sala.roomId && E.sala.roomId !== D.sala.roomId, '2v2 de FUTEBOL e 2v2 COM CURVA em salas diferentes (e os dois de futebol juntos)', { d: D.sala.roomId, e: E.sala.roomId, f: F.sala.roomId });
  const C2 = ap('Gabi');
  await entra(C2, 'joinOrCreate', 'racha', { modo: 'casual', n: 1 });
  P.confere(C2.sala.roomId !== D.sala.roomId, '1v1 e 2v2 não se misturam', { c2: C2.sala.roomId, d: D.sala.roomId });
  const r1 = await recusa(ap('Sem').entra('joinOrCreate', 'racha', {}));
  const r2 = await recusa(ap('Xyz').entra('joinOrCreate', 'racha', { modo: 'xyz', n: 1 }));
  const r3 = await recusa(ap('Sete').entra('joinOrCreate', 'racha', { modo: 'casual', n: 7 }));
  const r4 = await recusa(ap('Bola').entra('joinOrCreate', 'racha', { modo: 'casual', n: 1, jogo: 'basquete' }));
  P.confere(r1 && r2 && r3 && r4, 'o pedido sem modo, com um modo que não existe, com 7 por time ou um jogo que não abre em sala é recusado', [r1, r2, r3, r4]);
}
// ---------------------------------------------------------------- a privada
{
  const H = ap('Hugo'), X = ap('Xavi'), I = ap('Iara');
  await entra(H, 'create', 'racha', { modo: 'privada', n: 1 });
  await ate(() => H.info, 2000);
  const cod = H.info && H.info.codigo;
  P.confere(/^[A-HJ-NP-Z2-9]{6}$/.test(cod || '') && H.sala.state.codigo === cod && H.sala.roomId === cod, 'a privada: o código de 6 letras (sem I, O, 0 e 1) é o id da sala e vai no estado', { cod, id: H.sala.roomId });
  await entra(X, 'joinOrCreate', 'racha', { modo: 'privada', n: 1 });
  P.confere(X.sala.roomId !== cod, 'ninguém cai na privada pelo joinOrCreate (ela não aparece para o matchmaking)', { x: X.sala.roomId, cod });
  await entra(I, 'joinById', cod, { modo: 'privada', n: 1 });
  P.confere(I.sala.roomId === cod && await ate(() => H.comecou && I.comecou, 3000), 'quem tem o código entra (joinById) e a partida começa', { i: I.sala.roomId });
  const r = await recusa(ap('Zé').entra('joinById', 'ZZZZZZ', { modo: 'privada', n: 1 }));
  P.confere(!!r, 'código errado não entra', r);
}
// ---------------------------------------------------------------- a ranqueada: só pela fila, com o bilhete da plataforma e o rank assinado
{
  const b1 = PL.bilheteDaConta(1001, 'Rafa');
  P.confere(typeof b1 === 'string' && b1.includes('.'), 'o bilhete vem da plataforma de verdade (app/api/lib/selo.ts · bilheteDaConta)', (b1 || '').slice(0, 30));
  const semBilhete = await recusa(ap('Visit').fila(1));
  const outro = await recusa(ap('Falso', assina('outro-segredo', { p: '1003', n: 'Falso', t: Date.now(), e: Date.now() + 6e5 })).fila(1));
  const corpo = b1.split('.')[0], mexido = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(corpo, 'base64url').toString()), p: '9999' })).toString('base64url') + '.' + b1.split('.')[1];
  const adulterado = await recusa(ap('Mexido', mexido).fila(1));
  const vencido = await recusa(ap('Velho', assina(SEGREDO, { p: '1004', n: 'Velho', t: Date.now() - 2e6, e: Date.now() - 1000 })).fila(1));
  P.confere(semBilhete && outro && adulterado && vencido, 'na fila da ranqueada não entra: sem bilhete, com outro segredo, com o bilhete adulterado (outra conta) nem com o vencido', [semBilhete, outro, adulterado, vencido]);
  const direto = await recusa(ap('Rafa', b1).entra('joinOrCreate', 'racha', { modo: 'ranqueada', n: 1 }));
  P.confere(!!direto, 'a ranqueada direto pelo matchmaking é recusada: só a fila abre ranqueada', direto);
  // o rank vem do bilhete (o rk que a plataforma assinaria): 1000 e 1100 jogam juntos; 3000 e 4000 esperam e jogam com bot
  const rk = (id, nome, r) => PL.assina(SEGREDO, { p: String(id), n: nome, rk: r, t: Date.now(), e: Date.now() + 15 * 60e3 });
  const R1 = ap('Rafa', rk(1001, 'Rafa', 1000)), R2 = ap('Sofia', rk(1002, 'Sofia', 1100)), R3 = ap('Tati', rk(1003, 'Tati', 4000)), M = ap('Malandro', rk(1009, 'Malandro', 3000)), V = ap('Vini');
  todos.push(R1, R2, R3, M, V);
  const t0 = Date.now();
  const p3 = R3.fila(1), pM = M.fila(1, { rank: 0, maxPlayers: 1, allowIncompleteGroups: true, maxWaitingCycles: 0, matchRoomName: 'outra' });
  await Promise.all([R1.fila(1), R2.fila(1)]);
  const tPar = Date.now() - t0;
  await entra(V, 'joinOrCreate', 'racha', { modo: 'casual', n: 1 });
  P.confere(R1.sala.roomId === R2.sala.roomId && V.sala.roomId !== R1.sala.roomId && await ate(() => R1.comecou && R2.comecou, 3000) && !R3.sala && !M.sala, 'a fila junta quem tem o rank perto (1000 e 1100) em ' + (tPar / 1000).toFixed(1) + ' s e a ranqueada começa; quem está longe no rank (3000, 4000) continua esperando; o visitante da casual nunca cai nela', { r1: R1.sala.roomId, r2: R2.sala.roomId, v: V.sala.roomId, r3: !!R3.sala, m: !!M.sala, tPar });
  await ate(() => R1.sala.state.jogadores.size === 2, 2000);   // (o estado pequeno chega no próximo remendo do Schema)
  const nomes = [...R1.sala.state.jogadores.values()].map(j => j.nome + (j.conta ? '+' : '')).sort();
  const salaR = [...s.salas].find(x => x.roomId === R1.sala.roomId);
  P.confere(nomes.join(',') === 'Rafa+,Sofia+' && salaR._listing.private === true, 'o nome e a conta de cada um vêm do bilhete assinado, e a sala que a fila criou é privada (ninguém cai nela pelo matchmaking)', { nomes, privada: salaR._listing.private });
  await Promise.all([p3, pM]);
  const tM = Date.now() - t0;
  P.confere(R3.sala.roomId !== M.sala.roomId && tM >= 2500 && await ate(() => R3.comecou && M.comecou, 3000) && R3.comecou.jogadores.some(j => j.nome === 'Bot') && M.comecou.jogadores.some(j => j.nome === 'Bot'),
    'o rank que o aparelho manda no pedido (e o maxPlayers, o maxWaitingCycles…) não vale: o "Malandro" esperou os ciclos da fila como todo mundo (' + (tM / 1000).toFixed(1) + ' s) e cada um longe no rank jogou com bot', { tM, r3: R3.sala.roomId, m: M.sala.roomId });
  const R4 = ap('Uli', rk(1005, 'Uli', 1500));
  todos.push(R4);
  await R4.fila(2);
  const comecouSo = await ate(() => R4.comecou, 4000);
  P.confere(comecouSo && R4.comecou.jogadores.filter(j => j.nome === 'Bot').length === 3, 'a ranqueada 2v2 que não lotou começa com 3 bots depois da espera da fila (a fila de hoje faz o mesmo)', R4.comecou);
  // a sala da fila só aceita quem a fila chamou (aqui criada direto no servidor, sem ninguém dentro, para testar a trava)
  const lst = await matchMaker.createRoom('racha', { modo: 'ranqueada', n: 1, jogo: 'futebol', contas: ['c1201', 'c1202'] });
  const C1 = ap('Chamado', PL.bilheteDaConta(1201, 'Chamado'));
  todos.push(C1);
  await C1.entra('joinById', lst.roomId, { modo: 'casual', n: 1 });
  const intruso = await recusa(ap('Intruso', PL.bilheteDaConta(1299, 'Intruso')).entra('joinById', lst.roomId, { modo: 'casual', n: 1 }));
  P.confere(!!intruso && C1.sala.roomId === lst.roomId, 'a sala que a fila criou recusa quem ela não chamou (mesmo com o id na mão) e aceita quem ela chamou', { intruso, c1: C1.sala.roomId === lst.roomId });
}
// ---------------------------------------------------------------- a mesma conta de novo: o mesmo lugar
{
  const b = PL.bilheteDaConta(2001, 'Ugo');
  const U1 = ap('Ugo', b), U2 = ap('Ugo', b);
  await entra(U1, 'joinOrCreate', 'racha', { modo: 'casual', n: 4 });
  await ate(() => U1.info, 2000);
  await entra(U2, 'joinOrCreate', 'racha', { modo: 'casual', n: 4 });
  await ate(() => U2.info && U1.saidas.length, 3000);
  const sala = [...s.salas].find(x => x.roomId === U2.sala.roomId);
  P.confere(U2.sala.roomId === U1.sala.roomId && U2.info.lugar === U1.info.lugar && U1.saidas.includes(4011) && sala.porConta.size === 1 && sala.lugares.filter(Boolean).length === 1, 'a mesma conta entrando de novo fica com o MESMO lugar e a conexão velha sai (uma tampinha por pessoa)', { saidas: U1.saidas, l1: U1.info.lugar, l2: U2.info.lugar, contas: sala && sala.porConta.size });
}
// ---------------------------------------------------------------- o nome do visitante
{
  const W = ap('<b>Wil</b>  \u0007 ' + 'x'.repeat(40));
  await entra(W, 'joinOrCreate', 'racha', { modo: 'casual', n: 3 });
  await ate(() => W.info, 2000);
  const j = W.sala.state.jogadores.get(W.info.conta);
  P.confere(j && !/[<>\u0007]/.test(j.nome) && j.nome.length <= 20 && j.conta === false, 'o nome do visitante é limpo (sem < > nem controle, até 20 letras) e ele joga sem conta', j && j.nome);
}
for (const a of todos) await a.sai();
await espera(200);
await s.fecha();
process.exit(P.fim());
