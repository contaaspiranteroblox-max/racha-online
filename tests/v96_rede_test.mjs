// RACHA v96 · O ONLINE LISO — os testes sem navegador: o núcleo das correções (tools/v96/liso.js), o passo só da tampinha
// (server/partida/nucleo.js: passoSolo), a recuperação da fila de comandos (server/partida/sala.js) e o simulador da rede
// (tests/v96/rede_sim.mjs: o motor das salas de verdade + a previsão do aparelho, antes × agora, no 4G e no Brasil → Virgínia).
// Rodar: node tests/v96_rede_test.mjs
import { createRequire } from 'module';
import { simula, mede, media } from './v96/rede_sim.mjs';
const require = createRequire(import.meta.url);
const N = require('../server/partida/nucleo.js');
const { PartidaSala } = require('../server/partida/sala.js');
const L = require('../tools/v96/liso.js');
const U = N.U;
let ok = 0, falhou = 0;
const confere = (c, txt, extra) => { if (c) { ok++; console.log('  ok   ' + txt); } else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra) : '')); } };
const t0 = Date.now();

console.log('1) o deslize liso (RachaLiso.anda): a mola crítica com o teto de velocidade');
{
  const d = L.novo(); L.soma(d, 120, -50);
  let vmax = 0, ultimo = Math.hypot(d.x, d.y), volta = false, t = 0;
  while (t < 3) { const x0 = d.x, y0 = d.y; L.anda(d, 1 / 60, 0.09, 110); const v = Math.hypot(d.x - x0, d.y - y0) * 60; vmax = Math.max(vmax, v); const n = Math.hypot(d.x, d.y); if (n > ultimo + 1e-6) volta = true; ultimo = n; t += 1 / 60; }
  confere(Math.hypot(d.x, d.y) < 0.5, 'some sozinho (130 px em menos de 3 s)', [d.x, d.y]);
  confere(vmax <= 110 + 1e-6, 'nunca mais rápido que o teto (110 px/s; foi ' + vmax.toFixed(1) + ')', vmax);
  confere(!volta, 'sem passar do ponto e voltar (a mola crítica não balança)');
  const e = L.novo(); L.soma(e, 20, 0); const x0 = e.x; L.anda(e, 1 / 60, 0.09, 1e9);
  confere(Math.abs(e.x - x0) < 20 * (1 / 60) / 0.09 * 0.5, 'começa devagar (a velocidade começa em zero: sem o tranco do deslize exponencial)', x0 - e.x);
  const f = L.novo(); L.soma(f, 300, 0); const g = L.novo(); L.soma(g, 300, 0);
  for (let i = 0; i < 30; i++) { L.anda(f, 1 / 60, 0.08, 100); L.anda(g, 1 / 60, 0.08, 100, 1.2, U(3)); }
  confere(g.x < f.x - 40, 'o erro grande some mais rápido com o ganho (a bola depois de um apagão)', [f.x, g.x]);
  const h = L.novo(); L.soma(h, NaN, 3); L.anda(h, 1 / 60, 0.09, 100);
  confere(h.x === 0 && h.y === 0, 'número estranho não entra (NaN fica fora)');
}

console.log('\n2) a guarda e a batida no desenho');
{
  const d = L.novo(), ant = [100, 100], pos = [160, 100];
  const g = L.guarda(pos, ant, d, 300, 1 / 60);
  confere(Math.abs(g[0] - 105) < 1e-6 && Math.abs(d.x + 55) < 1e-6, 'a guarda segura o pulo (60 px num quadro vira 5 px + 55 px de deslize)', [g, d.x]);
  confere(L.guarda([102, 100], ant, d, 300, 1 / 60)[0] === 102, 'o movimento possível passa direto');
  const C = N.resolve(N.PERFIL_V92), G = N.novoCampo(1), p = G.POSTS[0], r = C.R_JOG;
  // de fora do gol, rente à trave, o desenho tenta ir para dentro da trave
  const de = [p[0] + r + G.POST_R + 2, p[1]], para = [p[0] - 6, p[1] + 3];
  const v = L.varre(N, G, de[0], de[1], para[0], para[1], r, false);
  confere(Math.hypot(v[0] - p[0], v[1] - p[1]) >= r + G.POST_R - 0.5, 'a batida não deixa a tampinha desenhada dentro da trave', v);
  // por cima do gol (do lado de fora da rede lateral): o desenho tenta entrar no gol atravessando a rede
  const xM = G.LX0 - G.GOL_PROF / 2;
  const v2 = L.varre(N, G, xM, G.GOL_Y0 - r - 3, xM, G.GOL_Y0 + r + 20, r, false);
  confere(v2[1] <= G.GOL_Y0 - r + 0.5, 'nem do outro lado da rede (a tampinha do lado de fora do gol fica do lado de fora)', [v2[1], G.GOL_Y0 - r]);
  const v3 = L.varre(N, G, G.CX, G.CY, G.CX + 40, G.CY + 10, r, false);
  confere(v3[0] === G.CX + 40 && v3[1] === G.CY + 10, 'no meio do campo nada muda');
  const vb = L.varre(N, G, G.CX, G.LY0 + C.R_BOLA + 2, G.CX, G.LY0 - 30, C.R_BOLA, true);
  confere(vb[1] >= G.LY0 + C.R_BOLA - 0.5, 'a bola desenhada também não passa da linha', vb);
}

console.log('\n3) o passo só da tampinha (N.passoSolo: a recuperação do servidor)');
{
  const C = N.resolve(N.PERFIL_V92), G = N.novoCampo(1);
  const M = { G, B: N.novaBola(C, G.CX, G.CY), jog: [], estado: 'jogo', saidaTime: 0 };
  const q = { x: G.CX - U(10), y: G.CY, vx: 0, vy: 0, r: C.R_JOG, m: C.MASSA_JOG, mx: 0, my: 0, time: 0 };
  const q2 = Object.assign({}, q);
  N.passoSolo(M, C, q, { x: 1, y: 0 });
  // o mesmo passo do motor (sem a bola e os outros por perto) anda o mesmo tanto
  const M2 = { G, B: Object.assign(N.novaBola(C, G.CX + U(30), G.CY + U(20))), jog: [q2], estado: 'jogo', saidaTime: 0 };
  q2.mx = 1; q2.my = 0; N.passo(M2, C, null);
  confere(Math.abs(q.x - q2.x) < 1e-6 && Math.abs(q.vx - q2.vx) < 1e-6, 'anda o mesmo que o passo de sempre (a velocidade aditiva com teto)', [q.x, q2.x]);
  const p = G.POSTS[1], t = { x: p[0] + C.R_JOG + G.POST_R + 0.5, y: p[1], vx: 0, vy: 0, r: C.R_JOG, m: C.MASSA_JOG, time: 0 };
  for (let i = 0; i < 20; i++) N.passoSolo(M, C, t, { x: -1, y: 0 });
  confere(Math.hypot(t.x - p[0], t.y - p[1]) >= C.R_JOG + G.POST_R - 0.5, 'bate na trave (não atravessa)', [t.x, t.y]);
  const s = { x: G.CX - U(3), y: G.CY + U(4), vx: 0, vy: 0, r: C.R_JOG, m: C.MASSA_JOG, time: 1 };
  const Ms = Object.assign({}, M, { estado: 'saida', saidaTime: 0 });
  for (let i = 0; i < 30; i++) N.passoSolo(Ms, C, s, { x: -1, y: 0 });
  confere(s.x >= G.CX - 1e-6, 'na saída, a barreira do meio-campo segura (quem espera não invade)', s.x);
}

console.log('\n4) a fila de comandos do servidor: a recuperação depois do apagão');
function partida(o = {}) {
  let t = 0; const ag = () => t; ag.anda = ms => { t += ms; };
  const p = new PartidaSala(Object.assign({ n: 1, jogo: 'futebol', map: 4, tempo: 0, regra: null, jogadores: [{ netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Beto' }], agora: ag, onSnapshot: () => {}, onGol: () => {}, onAviso: () => {}, onFim: () => {} }, o));
  p.estado = 'jogo';
  for (const q of p.jog) q.fila.chegou = 0;
  return { p, ag };
}
{
  // a Ana corre para a direita mandando 1 comando por passo; no meio, 300 ms sem nada chegar e depois tudo junto
  const corre = (fila) => {
    const { p, ag } = partida({ fila });
    const q = p.jog[0], x0 = q.x; let seq = 0;
    const manda = () => p.entrada('A', { seq: ++seq, x: 0, y: -1, button: 1, kc: 0, pc: 0 });
    for (let i = 0; i < 30; i++) { manda(); ag.anda(1000 / 60); p.passo(); }
    const segurados = [];
    for (let i = 0; i < 18; i++) { segurados.push(++seq); ag.anda(1000 / 60); p.passo(); }   // (os comandos ficaram no caminho)
    for (const s of segurados) p.entrada('A', { seq: s, x: 0, y: -1, button: 1, kc: 0, pc: 0 });
    for (let i = 0; i < 60; i++) { manda(); ag.anda(1000 / 60); p.passo(); }
    const andou = (x0 - q.x) ** 2 + 0; return { p, q, seq, feito: q.fila.feito, recuperados: q.fila.recuperados | 0, y: q.y };
  };
  const nova = corre('v96'), velha = corre('v95');
  const C = nova.p.C, esperado = (s) => s;   // (a previsão do aparelho: um passo por comando)
  // a previsão do aparelho anda VEL_JOG/60 por comando (para cima, até a parede); o servidor novo fez todos
  confere(nova.feito === nova.seq, 'o servidor novo fez todos os comandos (' + nova.feito + ' de ' + nova.seq + ')', [nova.feito, nova.seq]);
  confere(nova.recuperados >= 10, 'os que ficaram para trás andaram na recuperação (' + nova.recuperados + ' passos só da tampinha)', nova.recuperados);
  const yN = nova.y, yV = velha.y;
  // sem parede no caminho: o servidor novo andou o mesmo que o aparelho previu (todos os comandos); o de antes ficou para trás
  const G = nova.p.G, alvo = Math.max(G.GT + C.R_JOG, G.CY - nova.seq * C.VEL_JOG / 60);
  confere(Math.abs(yN - alvo) < 2, 'e chegou onde o aparelho previu (' + yN.toFixed(1) + ' × ' + alvo.toFixed(1) + ' px): a tampinha não volta na tela', [yN, alvo]);
  confere(yV > yN + 20, 'a fila de antes jogava comandos fora (ficava ' + (yV - yN).toFixed(0) + ' px para trás: a tampinha voltava)', [yV, yN]);
}
{
  // sem crédito (o aparelho mandando um pouco mais rápido que 60/s): o que sobra no colchão é pulado como sempre (sem correr a mais)
  const { p, ag } = partida({});
  const q = p.jog[0]; let seq = 0;
  for (let i = 0; i < 240; i++) { p.entrada('A', { seq: ++seq, x: 1, y: 0, button: 1 }); if (i % 20 === 0) p.entrada('A', { seq: ++seq, x: 1, y: 0, button: 1 }); ag.anda(1000 / 60); p.passo(); }
  confere((q.fila.recuperados | 0) === 0, 'sem passo parado não há recuperação: comando a mais é pulado (ninguém corre mais que a tampinha)', q.fila.recuperados | 0);
  const fila = q.fila.fila.length;
  confere(fila <= 3, 'e a fila não cresce (o atraso não aumenta: ' + fila + ' na fila)', fila);
}
{
  // o crédito não vira "pique guardado": parado sem mandar nada meio segundo, depois 2 s normais e então uma rajada — a
  // rajada não anda em dobro (o crédito velho acabou); logo depois do apagão, anda (é o atraso dele chegando)
  const rajada = (esperaNormal) => {
    const { p, ag } = partida({});
    const q = p.jog[0]; let seq = 0;
    const manda = () => p.entrada('A', { seq: ++seq, x: 1, y: 0, button: 1 });
    for (let i = 0; i < 20; i++) { manda(); ag.anda(1000 / 60); p.passo(); }
    for (let i = 0; i < 30; i++) { ++seq; ag.anda(1000 / 60); p.passo(); }               // (meio segundo sem nada chegar)
    seq += 0; for (let i = 0; i < esperaNormal; i++) { manda(); ag.anda(1000 / 60); p.passo(); }
    const antes = q.fila.recuperados | 0;
    for (let k = 0; k < 30; k++) manda();                                              // (a rajada: 30 de uma vez)
    for (let i = 0; i < 40; i++) { ag.anda(1000 / 60); p.passo(); }
    return (q.fila.recuperados | 0) - antes;
  };
  const guardado = rajada(120), logo = rajada(0);
  confere(guardado === 0, 'parado e depois 2 s normais: a rajada não anda em dobro (o crédito velho acabou: ' + guardado + ' passos a mais)', guardado);
  confere(logo >= 10, 'logo depois do apagão a rajada anda (' + logo + ' passos a mais: é o atraso dele chegando)', logo);
}
{
  // o crédito tem teto (0,5 s): um apagão de 3 s não vira 3 s de corrida em dobro
  const { p, ag } = partida({});
  const q = p.jog[0]; let seq = 0;
  for (let i = 0; i < 20; i++) { p.entrada('A', { seq: ++seq, x: 1, y: 0, button: 1 }); ag.anda(1000 / 60); p.passo(); }
  for (let i = 0; i < 180; i++) { ag.anda(1000 / 60); p.passo(); }
  confere(q.fila.cred <= 30, 'o crédito para em 30 passos (' + q.fila.cred + ')', q.fila.cred);
  const a = p.jog[0];
  confere(a.vx === 0 && a.vy === 0, 'e quem some fica parado (a regra de sempre: 350 ms sem comando)');
}
{
  // o RACHA_FILA=v95 / fila:'v95' é a fila de antes, exatamente
  const { p } = partida({ fila: 'v95' });
  confere(p.filaV95 === true, 'a fila de antes continua disponível para comparar (fila: "v95" / RACHA_FILA=v95)');
}

console.log('\n5) o simulador da rede: o que a tela de quem joga desenha (antes × agora, 4 sementes × 45 s cada)');
const SEM = [1, 2, 3, 4];
for (const rede of ['4g', 'br']) {
  const a = media({ rede, dur: 45000, cliente: 'v95', fila: 'v95' }, SEM), b = media({ rede, dur: 45000, cliente: 'v96', fila: 'v96' }, SEM);
  const nome = rede === 'br' ? 'Brasil → Virgínia (~165 ms, 4G, apagões e engasgos)' : '4G (~90 ms, apagões)';
  console.log('  ' + nome);
  for (const k of ['eu', 'bola', 'outro']) console.log('    ' + k.padEnd(6) + ' antes ' + JSON.stringify(a[k]) + '\n           agora ' + JSON.stringify(b[k]));
  confere(b.eu.pulos_min === 0 && b.bola.pulos_min === 0 && b.outro.pulos_min === 0, nome + ': nada pula (a sua tampinha, a bola, o outro) — antes: ' + a.eu.pulos_min + ', ' + a.bola.pulos_min + ' e ' + a.outro.pulos_min + ' pulos por minuto', [b.eu.pulos_min, b.bola.pulos_min, b.outro.pulos_min]);
  confere(b.eu.rapidos_min <= 1 && b.outro.rapidos_min <= 3 && b.bola.rapidos_min <= 1, nome + ': nem desliza rápido demais (a sua: ' + b.eu.rapidos_min + '/min, era ' + a.eu.rapidos_min + '; a do outro: ' + b.outro.rapidos_min + ', era ' + a.outro.rapidos_min + ')', [b.eu.rapidos_min, b.outro.rapidos_min, b.bola.rapidos_min]);
  confere(b.eu.dentro_min === 0 && b.outro.dentro_min === 0 && b.bola.dentro_min === 0, nome + ': nada desenhado dentro da trave ou do outro lado da rede (a sua tampinha antes: ' + a.eu.dentro_min + ' quadros/min, até ' + a.eu.dentro_max_px + ' px)', [b.eu, b.outro]);
  confere(b.eu.excesso_px_min < a.eu.excesso_px_min / 2 && b.outro.excesso_px_min < a.outro.excesso_px_min / 2, nome + ': o movimento impossível na tela cai a menos da metade (a sua: ' + a.eu.excesso_px_min + ' → ' + b.eu.excesso_px_min + ' px/min; a do outro: ' + a.outro.excesso_px_min + ' → ' + b.outro.excesso_px_min + ')');
  confere(b.eu.erro_med_px <= a.eu.erro_med_px * 1.4 + 2, nome + ': a sua tampinha desenhada continua perto do que o servidor decide (' + b.eu.erro_med_px + ' px de média, era ' + a.eu.erro_med_px + ')', [a.eu.erro_med_px, b.eu.erro_med_px]);
}

console.log('\nv96 · o online liso (sem navegador): ' + ok + ' ok, ' + falhou + ' falharam em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(falhou ? 1 : 0);
