/* PROTÓTIPO COLYSEUS · TESTE 5 — A REDE: OS BYTES, O ATRASO E A PREVISÃO
   1) os bytes de verdade (contados no soquete de cada aparelho, no servidor) de partidas 1v1, 2v2 e 3v3 COM CURVA com todo
      mundo correndo e tocando, contra o JSON que a turma manda hoje com OS MESMOS quadros ({type:'snapshot', round, data},
      60 por segundo desde a v105) e os mesmos comandos ({type:'input', …});
   2) a previsão no 4G de mentira (40 ms ± 10 e 75 ms ± 25 em cada sentido): a tampinha responde na hora no aparelho, o
      quanto ela pula quando o quadro do servidor chega (a correção) e o atraso que o jogador sentiria SEM a previsão;
      e quanto tempo o comando leva até o servidor confirmar (o ack);
   3) dez salas ao mesmo tempo: o motor de cada uma nos 60 passos por segundo e cada aparelho recebendo os 60 quadros.
   (os bytes do TCP/IP — ~50 por pacote — são os mesmos nos dois caminhos: um pacote por quadro e por comando)
   node prototipos/colyseus/testes/t5_rede.mjs */
import { Placar, proxy, pct } from './comum.mjs';
import { sobe } from '../servidor/index.mjs';
import { Aparelho, ate, espera } from '../cliente/aparelho.mjs';

const P = new Placar('protótipo Colyseus · 5 · a rede: os bytes, o atraso e a previsão');
const s = await sobe({ sala: { gravar: true, r80: { seg: 600, prorrog: 60 } } });
const url = 'ws://127.0.0.1:' + s.porta;
const kb = b => (b / 1024).toFixed(1) + ' KB/s';
const sock = c => c.ref && c.ref._socket;
const salaDe = ap => [...s.salas].find(x => x.roomId === ap.sala.roomId);
const todos = [];

// ---------------------------------------------------------------- 1) os bytes
for (const cfg of [{ n: 1 }, { n: 2 }, { n: 3, jogo: 'curva' }]) {
  const aps = [];
  for (let i = 0; i < 2 * cfg.n; i++) { const a = new Aparelho(url, { nome: 'J' + i }); await a.entra('joinOrCreate', 'racha', { modo: 'casual', n: cfg.n, jogo: cfg.jogo }); aps.push(a); todos.push(a); }
  await ate(() => aps.every(a => a.comecou), 4000);
  aps.forEach((a, i) => a.joga(seq => ({ x: Math.cos(seq / 40 + i), y: Math.sin(seq / 27 + i) * 0.8, kc: (seq / 50) | 0, pc: (seq / 70) | 0 })));
  await espera(1000);
  const sala = salaDe(aps[0]);
  const lido = () => sala.clients.map(c => [sock(c).bytesWritten, sock(c).bytesRead]);
  const b0 = lido(), q0 = sala.gravacao.quadros.length, c0 = sala.gravacao.comandos.length, t0 = performance.now();
  await espera(5000);
  const b1 = lido(), q1 = sala.gravacao.quadros.length, c1 = sala.gravacao.comandos.length, seg = (performance.now() - t0) / 1000;
  const desce = b1.reduce((a, b, i) => a + b[0] - b0[i][0], 0) / b1.length / seg;
  const sobe_ = b1.reduce((a, b, i) => a + b[1] - b0[i][1], 0) / b1.length / seg;
  // o JSON de hoje, com os mesmos quadros e comandos (+ o cabeçalho do WebSocket: 4 bytes no quadro; 6 no comando, que vai mascarado)
  let jq = 0; for (let k = q0; k < q1; k++) jq += Buffer.byteLength(JSON.stringify({ type: 'snapshot', round: 1, data: JSON.parse(sala.gravacao.quadros[k]) })) + 4;
  let jc = 0; for (let k = c0; k < c1; k++) jc += Buffer.byteLength(JSON.stringify({ type: 'input', ...sala.gravacao.comandos[k].cmd })) + 6;
  const jsonDesce = jq / seg, jsonSobe = jc / (2 * cfg.n) / seg;
  const nome = cfg.n + 'v' + cfg.n + (cfg.jogo === 'curva' ? ' COM CURVA' : '');
  P.confere(desce < jsonDesce * 0.45 && (q1 - q0) / seg > 57, nome + ': o que desce para cada aparelho ' + kb(desce) + ' (o JSON de hoje: ' + kb(jsonDesce) + ', ' + Math.round(100 - 100 * desce / jsonDesce) + '% menos) com ' + ((q1 - q0) / seg).toFixed(0) + ' quadros/s', { desce, jsonDesce });
  P.info('o que sobe de cada aparelho: ' + kb(sobe_) + ' (o JSON de hoje: ' + kb(jsonSobe) + ') — o comando ainda vai em msgpack com o x e o y em 8 bytes cada');
  for (const a of aps) await a.sai();
}

// ---------------------------------------------------------------- 2) a previsão no 4G de mentira
// (a previsão do protótipo é o esqueleto: só a tampinha, com o N.passoSolo; perto da bola ou de outra tampinha, e na saída
//  de bola, o jogo de verdade usa o passo inteiro do núcleo — tools/v92/rede.js. Então a correção é medida com a bola rolando
//  e a tampinha longe da bola e do outro: o que sobra ali é a rede e a fila de comandos do motor.)
for (const rede of [{ atraso: 40, oscila: 10 }, { atraso: 75, oscila: 25 }]) {
  const px = await proxy(s.porta, { ...rede, semente: 11 });
  const u = 'ws://127.0.0.1:' + px.porta;
  const A = new Aparelho(u, { nome: 'Ana', prever: true }), B = new Aparelho(u, { nome: 'Beto' });
  todos.push(A, B);
  await A.entra('joinOrCreate', 'racha', { modo: 'casual', n: 1 });
  await B.entra('joinOrCreate', 'racha', { modo: 'casual', n: 1 });
  await ate(() => A.comecou && B.comecou && A.info && B.info, 5000);
  const saiu = new Map(), lat = [], semPrev = [], cor = [];
  let conf = 0, medindo = false;
  A.aoQuadro = Q => {
    const p = Q.players[A.info.lugar], agora = performance.now(), o = Q.players[B.info.lugar];
    for (; conf < p[4]; conf++) { const t = saiu.get(conf + 1); if (t != null) { lat.push(agora - t); saiu.delete(conf + 1); } }
    if (!medindo || !A.prev || Q.state !== 'jogo') return;
    const longe = Math.hypot(p[0] - Q.ball[0], p[1] - Q.ball[1]) > 70 && Math.hypot(p[0] - o[0], p[1] - o[1]) > 70;
    const e = A.prev.pos();
    semPrev.push(Math.hypot(e.x - p[0], e.y - p[1]));            // (onde a previsão põe a tampinha AGORA × onde o último quadro mostra)
    if (longe && A.correcao != null) cor.push(A.correcao);
  };
  // a saída de bola: quem tem a saída encosta na bola; depois a Ana dribla (viradas bruscas a cada ~0,4 s) e o Beto fica parado
  const saida = (ap) => { const Q = ap.ultimo; return Q && Q.state === 'saida' && Q.kickoff === ap.info.time ? { x: ap.info.time === 0 ? 1 : -1, y: 0 } : null; };
  A.joga(seq => { saiu.set(seq, performance.now()); const k = saida(A); if (k) return k; if (A.ultimo && A.ultimo.state === 'saida') return { x: 0, y: 0 }; const a = ((seq / 24) | 0) * 2.4; return { x: 0.9 * Math.cos(a), y: 0.9 * Math.sin(a) }; });
  B.joga(() => saida(B) || { x: 0, y: 0 });
  await ate(() => A.ultimo && A.ultimo.state === 'jogo', 4000);
  await espera(800);
  medindo = true; lat.length = 0;
  await espera(6000);
  medindo = false;
  const rtt = 2 * rede.atraso;
  const c95 = pct(cor, 95), c50 = pct(cor, 50), cmax = Math.max(...cor), s50 = pct(semPrev, 50), s95 = pct(semPrev, 95), l50 = pct(lat, 50), l95 = pct(lat, 95);
  P.confere(cor.length > 150 && c50 < 0.5 && c95 < s50 / 4, 'no 4G de ' + rtt + ' ms (± ' + rede.oscila + '): com a previsão a tampinha responde na hora e pula só ' + c50.toFixed(2) + ' px (p50) / ' + c95.toFixed(2) + ' px (p95) quando o quadro chega; SEM a previsão o jogador veria a tampinha ' + s50.toFixed(0) + ' px (p50) / ' + s95.toFixed(0) + ' px (p95) atrás do dedo', { c50, c95, cmax, s50, s95, n: cor.length });
  P.confere(l50 < rtt + 2 * rede.oscila + 40 && l95 < rtt + 4 * rede.oscila + 80, 'o comando chega e é confirmado (o ack) em ' + l50.toFixed(0) + ' ms (p50) / ' + l95.toFixed(0) + ' ms (p95) — a ida e volta da rede (' + rtt + ' ms) mais o colchão da fila', { l50, l95, rtt, n: lat.length });
  const fA = salaDe(A).partida.jog[A.info.lugar].fila;
  P.info('a maior correção: ' + cmax.toFixed(1) + ' px (' + cor.length + ' quadros medidos) · o servidor pagou ' + ((fA && fA.recuperados) | 0) + ' passos atrasados (v96) — quando a fila de comandos do motor fica vazia, ele segue o último comando (o palpite); se a Ana virou bem nessa hora, a previsão corrige (o motor de hoje faz igual)');
  await A.sai(); await B.sai();
  px.fecha();
}

// ---------------------------------------------------------------- 3) dez salas ao mesmo tempo
{
  const aps = [];
  for (let k = 0; k < 10; k++) for (let i = 0; i < 2; i++) { const a = new Aparelho(url, { nome: 'S' + k + 'J' + i }); await a.entra('joinOrCreate', 'racha', { modo: 'casual', n: 1 }); aps.push(a); todos.push(a); }
  await ate(() => aps.every(a => a.comecou), 6000);
  aps.forEach((a, i) => a.joga(seq => ({ x: Math.cos(seq / 33 + i), y: Math.sin(seq / 21 + i) })));
  await espera(800);
  const salas = [...new Set(aps.map(salaDe))];
  const k0 = salas.map(x => x.partida.tick), n0 = aps.map(a => a.nQuadros), t0 = performance.now(), cpu0 = process.cpuUsage();
  await espera(4000);
  const seg = (performance.now() - t0) / 1000, cpu = process.cpuUsage(cpu0);
  const passos = salas.map((x, i) => (x.partida.tick - k0[i]) / seg), quadros = aps.map((a, i) => (a.nQuadros - n0[i]) / seg);
  P.confere(salas.length === 10 && passos.every(v => v > 57 && v < 63) && quadros.every(v => v > 56), 'dez salas ao mesmo tempo (20 aparelhos): o motor de cada uma entre ' + Math.min(...passos).toFixed(1) + ' e ' + Math.max(...passos).toFixed(1) + ' passos/s e cada aparelho com ' + Math.min(...quadros).toFixed(0) + '+ quadros/s', { salas: salas.length, passos: passos.map(v => v.toFixed(1)), quadros: Math.min(...quadros) });
  P.info('o processo inteiro (o servidor E os 20 aparelhos de mentira): ' + ((cpu.user + cpu.system) / 1000 / seg / 10).toFixed(1) + '% de um núcleo');
  for (const a of aps) await a.sai();
}
await espera(200);
await s.fecha();
process.exit(P.fim());
