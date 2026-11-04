// RACHA v102 · O ONLINE MAIS LISO — os testes sem navegador (passa/falha):
//   1) o servidor (server/partida/sala.js): as direções de cada um (Q.ent) e o crédito (Q.cred) no quadro;
//   2) o núcleo do cliente (tools/v102/liso.js: RachaLiso102);
//   3) o código de verdade do jogo num vm (tools/v92/rede.js + tools/v96/rede.js + tools/v102/liso.js) contra o motor das salas:
//      o tempo do mundo previsto no apagão da Ana (não corre nem para) e a previsão do Beto andando (o erro menor);
//   4) o simulador (tests/v102/sim.mjs): antes × depois no 4G de mentira (as mesmas contas do tests/v102_rede_medidas.py).
// Rodar: node tests/v102_rede_test.mjs
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { media } from './v102/sim.mjs';
const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = require('../server/partida/nucleo.js');
const { PartidaSala } = require('../server/partida/sala.js');
const L = require('../tools/v102/liso.js');
let ok = 0, falhou = 0;
const confere = (c, txt, extra) => { if (c) { ok++; console.log('  ok   ' + txt); } else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra) : '')); } };
const t0 = Date.now();

function partida(o = {}) {
  let t = 0; const ag = () => t; ag.anda = ms => { t += ms; };
  const p = new PartidaSala(Object.assign({ n: 1, jogo: 'futebol', map: 4, tempo: 0, regra: null, jogadores: [{ netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Beto' }], agora: ag, onSnapshot: () => {}, onGol: () => {}, onAviso: () => {}, onFim: () => {} }, o));
  p.estado = 'jogo';
  for (const q of p.jog) q.fila.chegou = 0;
  return { p, ag };
}
const cod = (x, y) => (Math.round(Math.atan2(y, x) * 32 / Math.PI) + 64) % 64;

console.log('1) o servidor: as direções (Q.ent) e o crédito (Q.cred) no quadro');
{
  const { p, ag } = partida();
  let sa = 0, sb = 0;
  for (let i = 0; i < 6; i++) p.entrada('A', { seq: ++sa, x: 1, y: 0, button: 1 });            // a Ana: 6 comandos para a direita (5 ficam na fila)
  p.entrada('B', { seq: ++sb, x: 0, y: -1, button: 1 });                                        // o Beto: 1 para cima
  ag.anda(1000 / 60); p.passo();
  let Q = p.quadro();
  confere(Array.isArray(Q.ent) && Q.ent.length === 2, 'o quadro leva as direções de cada um (Q.ent)', Q.ent);
  confere(Q.ent[0][0] === 0 && Q.ent[0].length === 6 && Q.ent[0].every(k => k === 0), 'a Ana: a do passo (0 = direita) e as 5 da fila', Q.ent[0]);
  confere(Q.ent[1][0] === cod(0, -1) && Q.ent[1].length === 1, 'o Beto: a do passo (48 = para cima), sem fila', Q.ent[1]);
  confere(!('cred' in Q), 'ninguém com crédito: sem o Q.cred (o quadro não cresce à toa)');
  confere(Q.ent[0].every(k => L.direcao(k)[0] > 0.999), 'o setor volta para a mesma direção no aparelho (RachaLiso102.direcao)', Q.ent[0].map(L.direcao));
  // o Beto some (sem comando): 4 palpites (anda com o último) e depois parado à espera, com crédito
  for (let i = 0; i < 12; i++) { p.entrada('A', { seq: ++sa, x: 1, y: 0, button: 1 }); ag.anda(1000 / 60); p.passo(); }
  Q = p.quadro();
  const b = p.jog[1];
  confere(b.vx === 0 && b.vy === 0 && b.fila.cred > 0, 'o Beto sem comando: depois dos palpites o servidor para a tampinha dele e guarda o crédito (a v96)', { cred: b.fila.cred, v: [b.vx, b.vy] });
  confere(Q.ent[1][0] === cod(0, -1), 'parado à espera, o quadro manda a direção que ele QUER (a do último comando), não a parada', Q.ent[1]);
  confere(Array.isArray(Q.cred) && Q.cred[1] === b.fila.cred && Q.cred[0] === 0, 'e o crédito de cada um (Q.cred)', Q.cred);
  // ele volta: os comandos que estavam no caminho chegam juntos (a fila passa do colchão) e a recuperação paga — o crédito
  // continua no quadro; depois, com os comandos chegando em dia e a fila no colchão, a SOBRA (que a recuperação não paga)
  // sai do quadro: o aparelho não anda passos só da tampinha que o servidor não vai fazer
  for (let i = 0; i < 11; i++) p.entrada('B', { seq: ++sb, x: 0, y: -1, button: 1 });
  let pagando = 0, sobraNoServ = 0, sobraFora = 0;
  for (let i = 0; i < 24; i++) {
    p.entrada('A', { seq: ++sa, x: 1, y: 0, button: 1 }); p.entrada('B', { seq: ++sb, x: 0, y: -1, button: 1 });
    ag.anda(1000 / 60); p.passo();
    const Qi = p.quadro(), f = p.jog[1].fila, cq = Qi.cred ? Qi.cred[1] : 0;
    if (f.cred > 0 && f.fila.length > 2 && cq === f.cred) pagando++;
    if (f.cred > 0 && f.fila.length <= 2 && p.tick - f.pagou > 6) { sobraNoServ++; if (!cq) sobraFora++; }
  }
  confere(pagando >= 2 && p.jog[1].fila.recuperados >= 3, 'ele volta (os comandos chegam juntos): com a recuperação pagando, o crédito continua no quadro', { pagando, recuperados: p.jog[1].fila.recuperados });
  confere(sobraNoServ >= 5 && sobraFora === sobraNoServ, 'a sobra que a fila no colchão não paga sai do quadro (o aparelho não anda passos que o servidor não faz)', { sobraNoServ, sobraFora, cred: p.jog[1].fila.cred });
  const { p: p2 } = partida({ entradas: false }); p2.entrada('A', { seq: 1, x: 1, y: 0, button: 1 }); p2.passo();
  const Q2 = p2.quadro();
  confere(!('ent' in Q2) && !('cred' in Q2), 'o.entradas: false (ou RACHA_ENTRADAS=0) não manda os campos novos');
  const { p: p3 } = partida({ fila: 'v95' }); p3.passo();
  confere('ent' in p3.quadro() && !('cred' in p3.quadro()), 'a fila da v95 (sem recuperação) não manda crédito');
  const tam = JSON.stringify(Q).length - JSON.stringify(Object.assign({}, Q, { ent: undefined, cred: undefined })).length;
  confere(tam < 60, 'o quadro 1x1 cresce ' + tam + ' bytes', tam);
}

console.log('\n2) o núcleo do cliente (tools/v102/liso.js)');
{
  const F = L.entradas([[0, 0, 0], [16, 16, -1], [-1]], 0);
  confere(F[0] === null && F[1].length === 3 && F[2].length === 1, 'entradas(): o seu fica de fora; os outros viram [mx, my] por passo');
  confere(Math.abs(F[1][0][1] - 1) < 1e-9 && F[1][2][0] === 0 && F[1][2][1] === 0, '16 = para baixo; -1 = parado');
  confere(L.noPasso(F, 1, 1)[1] > 0.999 && L.noPasso(F, 1, 2)[1] === 0, 'noPasso(): a direção da fila em cada passo');
  const q = { vx: 260, vy: 30 }, perto = [[Math.cos(0.15), Math.sin(0.15)]], longe = [[0, 1]];
  const r1 = L.noPasso([perto], 0, 5, q, 268), r2 = L.noPasso([longe], 0, 5, q, 268), r3 = L.noPasso([[[0, 0]]], 0, 5, q, 268);
  confere(Math.abs(Math.atan2(r1[1], r1[0]) - Math.atan2(30, 260)) < 1e-9, 'depois da fila, a última direção a menos de 20° da velocidade: segue a velocidade (o dedo oscilando entre dois setores)', r1);
  confere(r2[1] === 1 && r3[0] === 0 && r3[1] === 0, 'a curva de verdade e a parada seguem o comando', [r2, r3]);
  confere(L.solo([0, 7], 1, 20) === 7 && L.solo([0, 7], 1, 3) === 3 && L.solo(null, 1, 9) === 0 && L.solo([0, 99], 1, 99) === 30, 'solo(): o seu crédito, no máximo os comandos que faltam confirmar (e 30)');
}

console.log('\n3) o jogo num vm (tools/v92/rede.js + tools/v96/rede.js + tools/v102/liso.js) × o motor das salas');
const CODIGO_JOGO = ['v92/rede.js', 'v96/rede.js', 'v102/liso.js'].map(n => fs.readFileSync(path.join(RAIZ, 'tools', n), 'utf8')).join('\n;\n');
function aparelho(envia, cfg) {                       // o jogo num vm, com o mínimo do resto da página (como no v99_chutes_test)
  const ctx = { console, Math, JSON, Number, String, Array, Object, Map, Set, Infinity, NaN, isFinite, Date };
  ctx.window = ctx; ctx.performance = { now: () => ctx.__agora }; ctx.addEventListener = () => {}; ctx.document = { addEventListener() {}, getElementById: () => null };
  ctx.__agora = 0; ctx.__envia = envia; ctx.RACHA_CONFIG = cfg || {};
  ctx.RachaNucleo = N; ctx.RachaLiso = require('../tools/v96/liso.js');
  vm.createContext(ctx);
  const PRE = `
    var NET49 = {playing:false, host:false, localSlot:-1, seq:0, room:null, lastTick:-1, pending:[], snapshotAt:0, paused:false, ping:0};
    var V92_NUC = window.RachaNucleo, U = V92_NUC.U, STEP = 1/60, TICKS_POR_S = 60, acc = 0, goalT = -1;
    var V92 = {cfg:{previsao:'v92', bolaPrev:'eu', tauCorr:90, fisica:V92_NUC.PERFIL_V92}, med:{corr:[], corrB:[], chutesPrev:0, toques:0}, ultInp:{mx:0, my:0}};
    var RQ = {jog:[]}, P = {x:0, y:0, vx:0, vy:0, r:38}, B = {x:0, y:0, vx:0, vy:0}, VIS = {px:0, py:0, bx:0, by:0};
    var BOTAO = {kickL:false, powerL:false}, ARMADO = {}, RP = {toque:0, golN:-1, n:0}, X49UI = {open:false};
    var som = {chute(){}, curva(){}, trave(){}, toque(){}, clique(){}};
    function fxChute(){} function net49RemoteFrame(){} function net49Predict(){} function net49Draw(){} function net49Begin(){} function x49NetStop(){}
    function net49Snapshot(s){ if (s.tick <= NET49.lastTick) return; NET49.lastTick = s.tick; NET49.snapshotAt = performance.now(); }
    function net49Send(m){ window.__envia(JSON.parse(JSON.stringify(m))); }
    function v70HelloExtra(){ return {}; } function v92AplicaFisica(){} function vibrarChute(){} function getInput(){ return {mx:0, my:0}; }
    function dirSegue(){} function rpGrava(){} function fimAberto(){ return false; } function x49GameUI(){} function netSuaviza(){} function posVisual(){}
    function updateCamera(){} function spinBall(){} function render(){} function rpMonta(){ return null; } function rpGuardaRecente(){}
    function kickSegurado(){ return false; } function powerSegurado(){ return false; } function v70ConvidadoK(){ return 0; }
  `;
  const POS = `window.__T = { V92N, NET49, V92, RQ, inicia: r => v92RedeInicia(r), comando: d => v92Comando(d), quadro: s => net49Snapshot(s),
    r102: () => window.RachaRede102 ? window.RachaRede102.estado() : null };`;
  vm.runInContext(PRE + '\n' + CODIGO_JOGO + '\n' + POS, ctx, { filename: 'jogo-v102.js' });
  return ctx;
}
// uma partida 1x1 com a Ana no aparelho (o vm) e o Beto mandando comandos direto ao servidor. o.latA / o.latB / o.latQ: os
// passos de atraso (subida da Ana, subida do Beto, descida dos quadros); o.apagao: [de, até] passos em que os comandos da Ana
// ficam parados no caminho (e chegam todos juntos depois); o.beto(tk): a direção do Beto no passo tk
function joga(o) {
  const cfg = o.ligado === false ? { rede102: false } : {};
  let tk = 0, AG = 1000;
  const inbox = [], boxB = [], saida = [];
  const P = new PartidaSala({ n: 1, jogo: 'futebol', map: 4, tempo: 0, jogadores: [{ netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Beto' }], agora: () => AG,
    entradas: o.ligado !== false, onSnapshot: d => saida.push({ em: tk + (o.latQ | 0), d: JSON.parse(JSON.stringify(d)) }) });
  P.estado = 'jogo'; P.B.x = P.G.CX; P.B.y = P.G.LY0 + 60;    // (a bola longe dos dois)
  P.jog[0].x = P.G.CX - 300; P.jog[0].y = P.G.CY + 150; P.jog[1].x = P.G.CX + 250; P.jog[1].y = P.G.CY + 100;
  for (const q of P.jog) q.fila.chegou = AG;
  const ctx = aparelho(m => { if (m.type === 'input') inbox.push({ em: tk + (o.latA | 0), m }); }, cfg);
  const T = ctx.__T;
  const room = { servidor: true, nucleo: N.VERSAO, fisica: N.PERFIL_V92, n: 1, jogo: 'futebol', roster: ['A', 'B'], round: 1 };
  Object.assign(T.NET49, { playing: true, host: false, localSlot: 0, room, lastTick: -1 });
  T.RQ.jog = P.jog.map(q => ({ x: q.x, y: q.y }));
  T.inicia(room);
  T.quadro(JSON.parse(JSON.stringify(P.quadro())));
  const saltos = [], erroB = [];
  let seqB = 0;
  for (; tk < o.passos; tk++) {
    AG += 1000 / 60; ctx.__agora = tk * 1000 / 60;
    const a = o.ana(tk), travado = o.trava && tk >= o.trava[0] && tk < o.trava[1];   // (o.trava: o aparelho travado — nem comando nem quadro)
    if (!travado) T.comando({ mx: a[0], my: a[1] });
    const db = o.beto(tk); boxB.push({ em: tk + (o.latB | 0), m: { seq: ++seqB, x: db[0], y: db[1], button: 1 } });
    const preso = o.apagao && tk >= o.apagao[0] && tk < o.apagao[1];
    while (!preso && inbox.length && inbox[0].em <= tk) P.entrada('A', inbox.shift().m);
    while (boxB.length && boxB[0].em <= tk) P.entrada('B', boxB.shift().m);
    P.passo();
    while (!travado && saida.length && saida[0].em <= tk) {
      const M = T.V92N.M, t0 = M.tick, bx = M.jog[1].x, by = M.jog[1].y;
      T.quadro(saida.shift().d);
      saltos.push(M.tick - t0 - 0);                     // (o tempo do mundo previsto no quadro: o mesmo de antes = 0)
      erroB.push(Math.hypot(bx - M.jog[1].x, by - M.jog[1].y));
    }
  }
  const media_ = xs => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
  return { P, T, saltosNz: saltos.filter(x => x !== 0).length, saltosSoma: saltos.reduce((s, x) => s + Math.abs(x), 0), quadros: saltos.length, erroB: media_(erroB), r102: T.r102() };
}
const resumo = r => ({ quadros: r.quadros, saltos: r.saltosNz, soma: r.saltosSoma, erroB: +r.erroB.toFixed(2) });
{
  // a Ana corre em círculo com 3 passos de atraso para cada lado; no passo 120 a internet dela some por 300 ms (18 passos): o
  // servidor dá 4 palpites, para a tampinha dela e guarda o crédito; depois tudo chega junto e a recuperação paga
  const circ = tk => { const g = tk / 40; return [Math.cos(g), Math.sin(g)]; };
  const o = { passos: 360, latA: 3, latB: 3, latQ: 3, apagao: [120, 138], ana: circ, beto: tk => [tk % 90 < 45 ? 1 : -1, 0] };
  const off = joga(Object.assign({}, o, { ligado: false })), on = joga(o);
  confere(on.r102 && on.r102.ativo && on.r102.comEnt > 100 && on.r102.soloFeitos > 0 && !on.r102.erro, 'o liso.js está ligado no jogo: leu as direções e fez os passos do crédito', on.r102);
  confere(off.saltosNz >= 5 && off.saltosSoma >= 10, 'antes: no apagão da Ana o tempo do mundo previsto pulava em ' + off.saltosNz + ' quadros (' + off.saltosSoma + ' passos ao todo: a bola e o Beto corriam e paravam)', resumo(off));
  // (o que sobra: a sobra do crédito que a fila no colchão não paga — o servidor tira do quadro 6 passos depois do último
  //  pagamento, e o mundo previsto anda esses passos de uma vez — e o "meio segundo sobrando: pula" do servidor)
  confere(on.saltosNz <= 4 && on.saltosSoma <= 8 && on.saltosSoma * 3 <= off.saltosSoma, 'agora: ' + on.saltosNz + ' quadro(s), ' + on.saltosSoma + ' passo(s) ao todo (a sobra do crédito e o "meio segundo sobrando: pula" do servidor, que o aparelho não sabe antes)', resumo(on));
  const dif = r => { const M = r.T.V92N.M, s = r.P.jog[0]; return Math.hypot(M.jog[0].x - s.x, M.jog[0].y - s.y); };
  confere(dif(on) < 60, 'e a sua tampinha prevista continua com o servidor depois do apagão (' + dif(on).toFixed(1) + ' px: os comandos ainda no caminho)', dif(on));
  // o APARELHO travado 600 ms (o celular ocupado): nesse tempo não sai comando nenhum, então o crédito que o servidor guarda nunca
  // é pago (acaba sozinho em 1,2 s). O liso.js percebe o buraco nos próprios comandos e deixa o crédito de fora: nada pior que antes
  const o3 = Object.assign({}, o, { apagao: null, trava: [120, 156] });
  const off3 = joga(Object.assign({}, o3, { ligado: false })), on3 = joga(o3);
  confere(on3.r102.travadas >= 1 && on3.saltosSoma <= off3.saltosSoma + 2, 'o aparelho travado: o tempo do mundo não pula mais que antes (' + on3.saltosSoma + ' passos, antes ' + off3.saltosSoma + '; travadas vistas: ' + on3.r102.travadas + ')', [resumo(on3), resumo(off3)]);
  // o Beto em zigue-zague com 6 passos de atraso para cima: a previsão anda ele com o que ele apertou (Q.ent)
  const zz = tk => { const g = Math.floor(tk / 20) % 4; return [[1, 0], [0, 1], [-1, 0], [0, -1]][g]; };
  const o2 = { passos: 420, latA: 2, latB: 6, latQ: 3, ana: tk => [0, 0], beto: zz };
  const off2 = joga(Object.assign({}, o2, { ligado: false })), on2 = joga(o2);
  confere(on2.erroB < off2.erroB * 0.95, 'o Beto mudando de direção: a correção da previsão dele é menor com as direções do servidor (' + on2.erroB.toFixed(2) + ' px por quadro, antes ' + off2.erroB.toFixed(2) + ')', [resumo(on2), resumo(off2)]);
}

// (as partidas sorteadas variam muito umas das outras — uma mudança pequena no começo muda os dedos dali em diante: com 4
//  sementes a correção da sua tampinha variava uns 20% sozinha; com 8 a medida fica estável · v103: com o CHUTE mais forte as
//  8 de antes sortearam partidas em que "o outro pula" ficou 3,46/min contra 1,96 da v96 — com 24 sementes, 2,75 contra 2,43:
//  era o sorteio, não a rede; a medida usa as 24)
const SEMENTES = Array.from({ length: 24 }, (_, i) => 21 + i);
console.log('\n4) o simulador (tests/v102/sim.mjs): antes × depois, ' + SEMENTES.length + ' sementes × 45 s');
for (const rede of ['4g', '4g_ruim']) {
  const a = media({ rede, dur: 45000, cliente: 'v96' }, SEMENTES), b = media({ rede, dur: 45000, cliente: 'v102' }, SEMENTES);
  console.log('  ' + rede + ' antes  ' + JSON.stringify({ eu: a.eu, outro: a.outro, bola: a.bola, saltos: a.saltos_tempo_pct }));
  console.log('  ' + rede + ' agora  ' + JSON.stringify({ eu: b.eu, outro: b.outro, bola: b.bola, saltos: b.saltos_tempo_pct }));
  confere(b.saltos_tempo_pct < a.saltos_tempo_pct * 0.5, rede + ': o tempo do mundo previsto pula em ' + b.saltos_tempo_pct + '% dos quadros (antes ' + a.saltos_tempo_pct + '%)');
  confere(b.outro.paradas_min < a.outro.paradas_min * 0.6 && b.outro.pulos_min <= a.outro.pulos_min * 1.1 + 0.5, rede + ': o outro para menos na tela (' + b.outro.paradas_min + '/min, antes ' + a.outro.paradas_min + ') e não pula mais (' + b.outro.pulos_min + ', antes ' + a.outro.pulos_min + ')');
  confere(b.outro.erro_med_px < a.outro.erro_med_px, rede + ': o outro desenhado mais perto do caminho de verdade (' + b.outro.erro_med_px + ' px, antes ' + a.outro.erro_med_px + ')');
  confere(b.eu.correcao_p95_px <= a.eu.correcao_p95_px * 1.1 && b.eu.deslize_p95_px <= a.eu.deslize_p95_px * 1.1, rede + ': a correção da sua tampinha não cresce (p95 ' + b.eu.correcao_p95_px + ' px, antes ' + a.eu.correcao_p95_px + '; o deslize na tela p95 ' + b.eu.deslize_p95_px + ', antes ' + a.eu.deslize_p95_px + ')');
  // (a bola depende dos chutes de cada partida sorteada — aqui só "não piora muito")
  confere(b.bola.erro_med_px <= a.bola.erro_med_px * 1.3, rede + ': a bola não piora (' + b.bola.erro_med_px + ' px, antes ' + a.bola.erro_med_px + ')');
}

console.log('\nv102 · o online mais liso (sem navegador): ' + ok + ' ok, ' + falhou + ' falharam em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(falhou ? 1 : 0);
