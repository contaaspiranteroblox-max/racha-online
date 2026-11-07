/* PROTÓTIPO COLYSEUS · TESTE 3 — A QUEDA E A VOLTA (o celular no 4G de mentira: tests/v92_proxy.cjs na frente do servidor)
   1) o apagão sem cair (a internet some e volta, a conexão fica): 2 s e 4 s — ninguém é derrubado pelo teto de mensagens do
      Colyseus, o balde do motor (v108) deixa a rajada passar, o freio do aparelho segura os comandos depois de 2 s e a
      tampinha volta a obedecer logo (o ack alcança o aparelho);
   2) a conexão cai de verdade (trocou do Wi-Fi para o 4G): o SDK volta SOZINHO para a mesma sala e o mesmo lugar, com o
      quadro-chave certo (igual ao do servidor naquele passo), o ack andando de novo e todo mundo conectado no estado;
   3) a página recarregou (o token guardado no aparelho): volta com o token, no mesmo lugar;
   4) outro aparelho, a mesma conta (sem o token): a volta pela conta (POST /racha/volta com o bilhete) — e quem não tem a
      vaga (visitante, outra conta, bilhete falso) não pega token nenhum; o token não vale duas vezes;
   5) a janela venceu (aqui 1,5 s; no jogo 90 s): na ranqueada o bot assume na hora e continua; depois da janela o token não
      vale mais e a partida segue; quando todos vão embora, a partida acaba sem resultado e a sala some sozinha.
   node prototipos/colyseus/testes/t3_reconexao.mjs */
import { Placar, proxy, plataforma, canon } from './comum.mjs';
import { sobe } from '../servidor/index.mjs';
import { Aparelho, ate, espera } from '../cliente/aparelho.mjs';

const P = new Placar('protótipo Colyseus · 3 · a queda e a volta');
const logSdk = [], info0 = console.info;
console.info = (...a) => { const t = a.join(' '); if (t.includes('[Colyseus reconnection]')) logSdk.push(t); else info0(...a); };
const SEGREDO = 'segredo-do-teste-' + Date.now();
const PL = await plataforma(SEGREDO);
const s = await sobe({ segredo: SEGREDO, sala: { gravar: true, r80: { seg: 600, prorrog: 60 } } });
const px = await proxy(s.porta, { atraso: 20 });               // 20 ms em cada sentido (40 ms de ida e volta)
const url = 'ws://127.0.0.1:' + px.porta;
const bil = (id, nome) => PL.bilheteDaConta(id, nome);
const recusa = async (p) => { try { await p; return null; } catch (e) { return e && (e.code || e.message || String(e)); } };
const zigue = seq => ({ x: Math.cos(seq / 40), y: Math.sin(seq / 25) * 0.7 });
const salaDe = ap => [...s.salas].find(x => x.roomId === ap.sala.roomId);

// ---------------------------------------------------------------- 1) e 2): Ana e Beto, casual 1v1, pelo 4G de mentira
const A = new Aparelho(url, { nome: 'Ana', bilhete: bil(3001, 'Ana') }), B = new Aparelho(url, { nome: 'Beto', bilhete: bil(3002, 'Beto') });
await A.entra('joinOrCreate', 'racha', { modo: 'casual', n: 1 });
await B.entra('joinOrCreate', 'racha', { modo: 'casual', n: 1 });
await ate(() => A.comecou && B.comecou, 4000);
A.joga(zigue); B.joga(seq => ({ x: -0.8, y: Math.sin(seq / 30) * 0.5 }));
await espera(2000);
const sala1 = salaDe(A), rA = sala1.porConta.get('c3001');
for (const ms of [2000, 4000]) {
  const c0 = rA.cmds, f0 = A.freados, q0 = A.quedas;
  await px.manda('apaga ' + ms);
  await espera(ms);
  const tFim = Date.now();
  const alcancou = await ate(() => A.seq - A.ack <= 12, 3000, 5);
  const recupera = Date.now() - tFim;
  await espera(300);
  const ritmo = sala1.suspeitos.filter(x => x.tipo === 'ritmo').length;
  const rajada = rA.cmds - c0;
  P.confere(A.quedas === q0 && A.saidas.length === 0 && ritmo === 0 && alcancou && recupera < 1000 && (ms < 4000 || (A.freados - f0 > 60 && rajada < 220)),
    'apagão de ' + ms / 1000 + ' s sem cair: ninguém derrubado (teto do Colyseus), nada recusado pelo balde da v108, a tampinha obedece de novo ' + recupera + ' ms depois' + (ms >= 4000 ? ' (o freio segurou ' + (A.freados - f0) + ' comandos)' : ''),
    { quedas: A.quedas - q0, saidas: A.saidas, ritmo, recupera, freados: A.freados - f0, rajada, seq: A.seq, ack: A.ack });
}
// a conexão cai de verdade (os dois lados): o SDK volta sozinho
{
  const id0 = A.sala.roomId, lugar0 = A.info.lugar, tick0 = sala1.partida.tick;
  let primeiro = 0;
  A.aoQuadro = () => { if (!primeiro && A.quedas > 0 && A.info && A.info.volta) primeiro = Date.now(); };
  const t0 = Date.now();
  await px.manda('corta');
  const voltaram = await ate(() => A.voltas >= 1 && B.voltas >= 1 && primeiro, 10000);
  const tempo = primeiro - t0;
  P.confere(voltaram && A.quedas >= 1 && A.sala.roomId === id0 && A.info.volta === true && A.info.lugar === lugar0 && A.saidas.length === 0,
    'a conexão caiu (Wi-Fi → 4G) e o SDK voltou SOZINHO para a mesma sala e o mesmo lugar: ' + tempo + ' ms do corte ao primeiro quadro de novo',
    { quedas: A.quedas, voltas: A.voltas, b: B.voltas, sala: A.sala.roomId === id0, lugar: [lugar0, A.info.lugar], saidas: A.saidas, marcas: A.marcas.slice(-4) });
  // o quadro-chave da volta = o quadro do servidor naquele passo (o binário recomeçou certo)
  await espera(200);
  const meu = A.ultimo, doServ = sala1.gravacao.quadros.map(x => JSON.parse(x)).find(q => q.tick === meu.tick);
  P.confere(doServ && canon(doServ) === canon(meu) && sala1.partida.tick > tick0, 'depois da volta o aparelho vê exatamente o quadro do servidor (o quadro-chave recomeçou o binário) e o motor não parou enquanto eles estavam fora', { tick: meu && meu.tick, achou: !!doServ });
  const ack0 = A.ack;
  await espera(600);
  P.confere(A.ack > ack0 && A.seq - A.ack <= 12, 'os comandos voltam a valer: o ack anda de novo e alcança o aparelho', { ack0, ack: A.ack, seq: A.seq });
  P.confere([...A.sala.state.jogadores.values()].every(j => j.conectado) && A.sala.state.jogadores.size === 2, 'no estado pequeno (Schema) os dois aparecem conectados de novo', [...A.sala.state.jogadores.values()].map(j => j.nome + ':' + j.conectado));
  P.info('o SDK: ' + logSdk.length + ' linhas de reconexão · o motor andou ' + (sala1.partida.tick - tick0) + ' passos desde o corte');
}

// ---------------------------------------------------------------- 3) e 4): Caio e Dani — a página recarregada e o outro aparelho
const C = new Aparelho(url, { nome: 'Caio', bilhete: bil(3003, 'Caio') }), bD = bil(3004, 'Dani'), D = new Aparelho(url, { nome: 'Dani', bilhete: bD });
await C.entra('joinOrCreate', 'racha', { modo: 'casual', n: 1 });
await D.entra('joinOrCreate', 'racha', { modo: 'casual', n: 1 });
await ate(() => C.comecou && D.comecou, 4000);
C.joga(zigue); D.joga(zigue);
await espera(1700);
const sala2 = salaDe(C);
{
  const token = C.sala.reconnectionToken, lugar = C.info.lugar;
  C.some();                                                  // (a página recarregou: o aparelho velho some sem "tchau")
  await ate(() => !sala2.porConta.get('c3003').conectado, 2000);
  const C2 = new Aparelho(url, { nome: 'Caio', bilhete: bil(3003, 'Caio') });
  await C2.volta(token);                                     // (o token guardado no aparelho — no jogo, o sessionStorage)
  C2.joga(zigue);
  const ok = await ate(() => C2.nQuadros > 30 && C2.ack > 20, 4000);
  P.confere(ok && C2.info.volta && C2.info.lugar === lugar && D.quedas === 0 && D.saidas.length === 0, 'a página recarregou: volta com o token guardado, no MESMO lugar, e os comandos do aparelho novo valem (o outro lado nem caiu)', { lugar: [lugar, C2.info && C2.info.lugar], ack: C2.ack, q: C2.nQuadros });
  const de2 = await recusa(new Aparelho(url, { nome: 'X' }).volta(token));
  P.confere(!!de2, 'o mesmo token não vale duas vezes', de2);
  C2.para();
  await C2.sai();
}
{
  const lugar = D.info.lugar;
  D.some();                                                  // (o celular apagou; a Dani pega o tablet)
  await ate(() => !sala2.porConta.get('c3004').conectado, 2000);
  const vis = await recusa(new Aparelho(url, { nome: 'Visit' }).voltaPelaConta());
  const outra = await recusa(new Aparelho(url, { nome: 'Outra', bilhete: bil(3999, 'Outra') }).voltaPelaConta());
  const falso = await recusa(new Aparelho(url, { nome: 'Falsa', bilhete: bD.slice(0, -3) + 'abc' }).voltaPelaConta());
  P.confere(vis === 401 && outra === 404 && falso === 401, 'a volta pela conta não dá token para quem não tem a vaga: visitante (401), outra conta (404), bilhete falso (401)', [vis, outra, falso]);
  const D2 = new Aparelho(url, { nome: 'Dani', bilhete: bD });
  await D2.voltaPelaConta();
  D2.joga(zigue);
  const ok = await ate(() => D2.nQuadros > 30 && D2.ack > 20, 4000);
  P.confere(ok && D2.info.volta && D2.info.lugar === lugar, 'outro aparelho, a mesma conta (sem o token): a volta pela conta devolve a vaga guardada, no mesmo lugar', { lugar: [lugar, D2.info && D2.info.lugar], ack: D2.ack });
  D2.para();
  await D2.sai();
}
await A.sai(); await B.sai();
px.fecha();
await espera(100);
await s.fecha();                                             // (o matchMaker do Colyseus é um só por processo: um servidor de cada vez)

// ---------------------------------------------------------------- 5) a janela venceu (uma sala com 1,5 s de janela), na ranqueada
{
  const s2 = await sobe({ segredo: SEGREDO, sala: { reconexaoS: 1.5, esperaBotsMs: 0, r80: { seg: 600, prorrog: 60 } } });
  const url2 = 'ws://127.0.0.1:' + s2.porta;
  const R1 = new Aparelho(url2, { nome: 'Rafa', bilhete: bil(4001, 'Rafa') }), R2 = new Aparelho(url2, { nome: 'Sofia', bilhete: bil(4002, 'Sofia') });
  await Promise.all([R1.fila(1), R2.fila(1)]);                // (a ranqueada é pela fila)
  await ate(() => R1.comecou && R2.comecou, 4000);
  R1.joga(zigue); R2.joga(zigue);
  await espera(1700);
  const sala = [...s2.salas][0], token = R1.sala.reconnectionToken, lugar = R1.info.lugar;
  R1.some();
  await espera(300);
  const q = sala.partida.jog[lugar];
  P.confere(q.bot === 'dificil' && q.reserva === 'c4001' && !sala.encerrado, 'na ranqueada, quem caiu deixa um bot na tampinha NA HORA (a partida não para) e a vaga fica reservada', { bot: q.bot, reserva: q.reserva });
  await espera(1700);
  const n0 = R2.nQuadros;
  const tarde = await recusa(new Aparelho(url2, { nome: 'Rafa' }).volta(token));
  const pelaConta = await recusa(new Aparelho(url2, { nome: 'Rafa', bilhete: bil(4001, 'Rafa') }).voltaPelaConta());
  await espera(300);
  P.confere(!!tarde && pelaConta === 404 && R2.nQuadros > n0 + 10 && !sala.encerrado && sala.porConta.get('c4001').conectado === false, 'depois da janela, nem o token nem a volta pela conta valem — e a partida segue com o bot', { tarde, pelaConta, quadros: R2.nQuadros - n0 });
  R2.some();
  const acabou = await ate(() => sala.encerrado && s2.salas.size === 0, 5000);
  P.confere(acabou && sala.state.fase === 'abortada' && !sala.resumo && sala.partida.ligado === false, 'todo mundo foi embora: a partida acaba SEM resultado (sem selo), o motor desliga e a sala some sozinha', { fase: sala.state.fase, salas: s2.salas.size, resumo: !!sala.resumo, ligado: sala.partida.ligado });
  await s2.fecha();
}
process.exit(P.fim());
