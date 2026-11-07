/* PROTÓTIPO COLYSEUS · TESTE 6 — A INTEGRAÇÃO COM O SERVIDOR E A PLATAFORMA DE HOJE
   1) junto: a turma de verdade (server/turma.js) no "/" e as partidas do Colyseus na MESMA porta e no MESMO processo — o
      aperto de mão da turma (hello com o bilhete) responde como sempre enquanto uma ranqueada do Colyseus acontece ao lado;
   2) a ranqueada do começo ao fim, com gol: o selo de cada um tem exatamente os campos do selo da turma e passa nas regras
      de verdade da plataforma (app/api/lib/selo.ts · confereSelo e app/contracts/partida.ts · motivoResultadoOnline, com o
      ID público de 6 dígitos de formatarIdPublico) — os gols e as assistências apurados pelo motor (h:1, gl, as) e o
      contra gente (o:1);
   3) o resultado assinado que o servidor manda direto para a plataforma confere com o mesmo segredo e tem o mesmo número de
      partida (pid) dos selos — a plataforma conta a partida uma vez só, mesmo que ninguém mande o selo;
   4) a ponte (servidor/ponte.mjs, a fase 2 da migração): a sala da turma continua sendo da turma e só a partida vai para o
      Colyseus — com o mesmo código da sala, os lugares que a turma decidiu e uma vaga reservada para cada um; quem não
      está na lista da turma não entra nem com o código na mão, e ninguém cria essa sala pelo matchmaking.
   node prototipos/colyseus/testes/t6_integracao.mjs */
import path from 'node:path';
import { Placar, plataforma, RAIZ } from './comum.mjs';
import { sobe } from '../servidor/index.mjs';
import { Aparelho, ate, espera } from '../cliente/aparelho.mjs';
import { partidaDaTurma } from '../servidor/ponte.mjs';

const P = new Placar('protótipo Colyseus · 6 · a integração com o servidor e a plataforma de hoje');
const SEGREDO = 'segredo-do-teste-' + Date.now();
const PL = await plataforma(SEGREDO);
const { motivoResultadoOnline } = await import(path.join(RAIZ, 'app', 'contracts', 'partida.ts'));
const { formatarIdPublico } = await import(path.join(RAIZ, 'app', 'contracts', 'racha.ts'));
const resultados = [];
const s = await sobe({ junto: true, segredo: SEGREDO, sala: { esperaBotsMs: 0, fimMs: 800, r80: { seg: 9, prorrog: 1 }, plataforma: (txt, r) => resultados.push({ txt, r }) } });
const base = '127.0.0.1:' + s.porta;

// ---------------------------------------------------------------- 1) a turma no "/" e o Colyseus ao lado
const saude = await (await fetch('http://' + base + '/saude')).json();
const turmaWs = (bilhete, nome) => new Promise((ok, erro) => {
  const ws = new WebSocket('ws://' + base + '/');
  const msgs = [];
  ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', name: nome, conta: bilhete || undefined, v93: 1, v105: 1 }));
  ws.onmessage = ev => { const m = JSON.parse(ev.data); msgs.push(m); if (m.type === 'hello') ok({ ws, oi: m, msgs }); };
  ws.onerror = () => erro(new Error('a turma não respondeu'));
  setTimeout(() => erro(new Error('a turma não respondeu a tempo')), 4000);
});
const lia = await turmaWs(PL.bilheteDaConta(7001, 'Lia'), 'Lia'), vis = await turmaWs(null, 'Visitante');
P.confere(saude.turma === true && lia.oi.conta === true && lia.oi.id === 'c7001' && vis.oi.conta === false && /^u/.test(vis.oi.id), 'a turma de verdade responde no "/" da mesma porta: o hello com o bilhete da plataforma vira a conta c7001; sem bilhete, um visitante', { saude, lia: { id: lia.oi.id, conta: lia.oi.conta }, vis: { id: vis.oi.id, conta: vis.oi.conta } });

// ---------------------------------------------------------------- 2) a ranqueada do começo ao fim, com gol
const L = new Aparelho('ws://' + base, { nome: 'Lia', bilhete: PL.bilheteDaConta(7001, 'Lia') }), T = new Aparelho('ws://' + base, { nome: 'Theo', bilhete: PL.bilheteDaConta(7002, 'Theo') });
await Promise.all([L.fila(1), T.fila(1)]);                    // (a ranqueada é pela fila: o QueueRoom com o rank do bilhete)
await ate(() => L.comecou && T.comecou && L.ultimo && T.ultimo, 5000);
// quem dá a saída leva a bola até o gol do outro (com toques de CHUTE); o outro sai do caminho
const kick = L.ultimo.kickoff, atac = L.info.time === kick ? L : T, defe = atac === L ? T : L;
let kc = 0;
atac.joga(seq => {
  const Q = atac.ultimo, eu = Q.players[atac.info.lugar], b = Q.ball, lado = atac.info.time === 0 ? 1 : -1;
  if (seq % 20 === 0) kc++;
  const dx = b[0] - eu[0] - lado * 22, dy = b[1] - eu[1], d = Math.hypot(dx, dy) || 1;   // (atrás da bola, empurrando para o gol)
  return d > 30 ? { x: dx / d, y: dy / d, kc } : { x: lado, y: Math.max(-0.4, Math.min(0.4, dy / 40)), kc };
});
defe.joga(seq => (seq < 90 ? { x: 0, y: 1 } : { x: 0, y: 0 }));
const terminou = await ate(() => L.selo && T.selo && resultados.length === 1, 25000);
const sL = PL.confereSelo(L.selo), sT = PL.confereSelo(T.selo);
const CAMPOS_TURMA = ['s', 'r', 'j', 'l', 'p', 'm', 'd', 'k', 'n', 'g', 'v', 't', 'e', 'h', 'pid', 'gl', 'as', 'o'].sort().join();
P.confere(terminou && sL && sT && Object.keys(sL).sort().join() === CAMPOS_TURMA, 'a ranqueada acabou pelo relógio do servidor e cada um recebeu o selo — com exatamente os campos do selo da turma (s r j l p m d k n g v t e h pid gl as o)', sL && Object.keys(sL));
const placar = L.fim && L.fim.placar;
P.info('o placar: ' + (placar ? placar.join(' × ') : '?') + ' (quem atacou: ' + atac.nome + ')');
const motivo = (sel, id) => motivoResultadoOnline(sel, { valida: true, idPublico: formatarIdPublico(id), placarNosso: sel.p[0], placarDeles: sel.p[1], modo: 'futebol', ranqueada: true, tamanho: 1, agora: Date.now() });
const mL = sL ? motivo(sL, 7001) : 'sem selo', mT = sT ? motivo(sT, 7002) : 'sem selo';
P.confere(mL === '' && mT === '' && sL.j === '007001' && sT.j === '007002', 'os dois selos passam nas regras de verdade da plataforma (motivoResultadoOnline, com o ID público de formatarIdPublico): a conta, o placar, o modo, a validade, ranqueada e o tamanho', { mL, mT, jL: sL && sL.j, jT: sT && sT.j });
const golsAtac = (atac === L ? sL : sT), soma = sL.p[0] + sL.p[1];
P.confere(sL.h === 1 && sT.h === 1 && sL.o === 1 && sL.pid === sT.pid && sL.g.join() === sT.g.join() && sL.g.length === 2 && golsAtac.gl <= golsAtac.p[0] && sL.gl + sT.gl <= soma && sL.p[0] === sT.p[1] && sL.p[1] === sT.p[0],
  'o que o motor apurou bate nos dois selos: h:1, o:1 (contra gente), o mesmo pid, as mesmas contas (g), o placar espelhado e os gols de cada um até o placar do time (' + soma + ' gol(s) na partida; ' + atac.nome + ': ' + golsAtac.gl + ')', { L: sL, T: sT });

// ---------------------------------------------------------------- 3) o resultado direto para a plataforma
{
  const doc = PL.confere(SEGREDO, resultados[0] && resultados[0].txt);
  const ids = doc && doc.jogadores.map(j => j.id).sort().join();
  P.confere(doc && doc.tipo === 'resultado' && doc.pid === sL.pid && ids === '007001,007002' && doc.placar.join() === (sL.l === 0 ? sL.p : sT.p).join() && doc.modo === 'ranqueada',
    'o resultado assinado que o servidor manda para a plataforma confere (o mesmo segredo), com o mesmo pid dos selos, as duas contas e o placar', doc);
}
// ---------------------------------------------------------------- 4) a ponte: a sala da turma começa a partida no Colyseus
{
  // (a turma decidiu: a Lia no time A, o visitante no time B, a sala ABC234 — o código dela; no jogo, a vaga de cada um iria
  //  pelo WebSocket da turma, {type:'partida', vaga})
  const ponte = await partidaDaTurma({ codigo: 'ABC234', n: 1, jogo: 'curva', jogadores: [
    { lugar: 1, auth: { id: 'c7001', publico: '007001', nome: 'Lia', conta: true } },
    { lugar: 0, auth: { id: vis.oi.id, publico: null, nome: 'Visitante', conta: false } },
  ] });
  const PL1 = new Aparelho('ws://' + base, { nome: 'Lia' }), PV = new Aparelho('ws://' + base, { nome: 'Visitante' });
  await PL1.vaga(ponte.vagas.get('c7001'));
  await PV.vaga(ponte.vagas.get(vis.oi.id));
  const ok = await ate(() => PL1.comecou && PV.comecou && PL1.info && PV.info && PL1.nQuadros > 10, 4000);
  const sala = [...s.salas].find(x => x.roomId === 'ABC234');
  P.confere(ok && ponte.sala === 'ABC234' && PL1.sala.roomId === 'ABC234' && PL1.info.lugar === 1 && PV.info.lugar === 0 && sala && sala.jogo === 'curva' && sala._listing.private === true,
    'a ponte: a sala ABC234 da turma joga a partida no Colyseus com o mesmo código, os lugares que a turma decidiu (a Lia no time B) e o modo dela (COM CURVA); a partida começa quando os dois chegam', { sala: ponte.sala, lugares: [PL1.info && PL1.info.lugar, PV.info && PV.info.lugar], jogo: sala && sala.jogo });
  const intruso = await (async () => { try { await new Aparelho('ws://' + base, { nome: 'X', bilhete: PL.bilheteDaConta(7999, 'X') }).entra('joinById', 'ABC234', { modo: 'casual', n: 1 }); return null; } catch (e) { return e.code || e.message; } })();
  const cria = await (async () => { try { await new Aparelho('ws://' + base, { nome: 'Y' }).entra('joinOrCreate', 'racha', { modo: 'turma', n: 1 }); return null; } catch (e) { return e.code || e.message; } })();
  P.confere(!!intruso && !!cria, 'quem não está na lista da turma não entra nem com o código na mão, e ninguém cria uma sala "da turma" pelo matchmaking', { intruso, cria });
  await PL1.sai(); await PV.sai();
}
P.confere(lia.ws.readyState === 1 && vis.ws.readyState === 1, 'e a turma continuou ali o tempo todo: as conexões do lobby seguem abertas depois das partidas do Colyseus', [lia.ws.readyState, vis.ws.readyState]);
lia.ws.close(); vis.ws.close();
await L.sai(); await T.sai();
await espera(200);
await s.fecha();
process.exit(P.fim());
