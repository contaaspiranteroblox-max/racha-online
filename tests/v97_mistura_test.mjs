// RACHA v97 (depois do teste) · A MISTURA DA FÍSICA ENTRE O RACHA E O RACHÃO, medida nos dois motores (sem navegador).
// A ponte (app/public/game/rachao/ponte.js) traduz a BOLA, o JOGADOR e o CHUTE de um jogo para o outro pelo comportamento
// (medido no raio do jogador e no passo). Aqui cada mistura é JOGADA: a mesma medida feita no jogo de origem e no outro jogo
// com a física traduzida tem de dar o mesmo resultado —
//   · a bola: o tamanho perto do jogador, até onde rola, o teto de velocidade, quanto volta da parede e quanto sai do pé
//     do jogador que bate nela parada;
//   · o jogador: a velocidade máxima, o caminho que perde arrancando e o que ainda anda depois de soltar;
//   · o chute: a velocidade que a bola ganha.
// E também: as constantes da ponte são as dos dois jogos; uma parte misturada não muda as outras duas (medido nos motores,
// partindo de várias físicas de cada jogo); a ponte reconhece cada parte (do RACHA, do Rachão ou ajustada); o que ela
// escreve no RACHA fica nos limites do servidor; os ganchos novos do motor do Rachão (os chutes do estádio, o teto da bola,
// o peso e o quique no pé, o andar do RACHA com os bots) jogam partidas inteiras sem quebrar; o estádio guarda tudo; e os 17
// campos do Rachão, com o mesmo sorteio e os mesmos comandos, dão EXATAMENTE a mesma partida no motor original e no da página.
// Rodar: node tests/v97_mistura_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = path.join(RAIZ, 'app', 'public', 'game', 'rachao');
require(path.join(PASTA, 'ponte.js'));                 // (a pasta app/ é "type": "module": a ponte se põe em globalThis.RachaPonte)
const PONTE = globalThis.RachaPonte;
const M = require(path.join(RAIZ, 'server', 'partida', 'mapa.js'));
const N = require(path.join(RAIZ, 'server', 'partida', 'nucleo.js'));
let ok = 0, falhou = 0;
const confere = (c, txt, extra) => { if (c) { ok++; console.log('  ok   ' + txt); } else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra).slice(0, 500) : '')); } return c; };
const perto = (a, b, rel, abs) => Math.abs(a - b) <= (abs || 0) + (rel || 0) * Math.max(Math.abs(a), Math.abs(b));
const r3 = v => Math.round(v * 1000) / 1000;
const t0 = Date.now();

/* ---------------------------------------------------------------- os dois motores */
// o Rachão: o script da página (até o fim da partida vista de cima) num vm, com Math.random sorteado (a mesma semente dá o mesmo jogo)
function motorRachao(html) {
  const ini = html.indexOf('<script>') + 8, fim = html.indexOf('/* ---- 07-toprender.js ---- */');
  if (ini < 8 || fim < 0) throw new Error('o script do Rachão mudou de forma');
  let s = 97; const MM = Object.create(Math); MM.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const nada = () => {};
  const ctx = { console: { log: nada, error: nada, warn: nada }, Math: MM, JSON, Number, String, Array, Object, Set, Map, Infinity, NaN,
    window: {}, document: { getElementById: () => null, addEventListener: nada, querySelector: () => null }, localStorage: { getItem: () => null, setItem: nada },
    requestAnimationFrame: () => 0, setTimeout: () => 0 };
  vm.createContext(ctx); vm.runInContext(html.slice(ini, fim), ctx);
  return { E: x => vm.runInContext(x, ctx), semente: v => { s = v; } };
}
const PAG = fs.readFileSync(path.join(PASTA, 'rachao.html'), 'utf8');
const RC = motorRachao(PAG);
const TopMatch = RC.E('TopMatch'), MAP_BY_ID = RC.E('MAP_BY_ID'), basePhys = RC.E('basePhys');
// a oficina de estádios (com a ponte, como na página): a física do Rachão como o editor grava — o mesmo arredondamento
// dos controles (arredFis) que a ponte usa
function oficinaDeEstadios() {
  const nada = () => {};
  const ctx = { console: { log: nada, error: nada, warn: nada }, Math, JSON, Number, String, Array, Object, Set, Map, Proxy, TextEncoder, TextDecoder, btoa, atob, Date, URLSearchParams, Infinity, NaN,
    location: { search: '', origin: 'http://x', hash: '' }, localStorage: { getItem: () => null, setItem: nada, removeItem: nada },
    document: { getElementById: () => null, createElement: () => ({}), addEventListener: nada, querySelector: () => null, querySelectorAll: () => [] },
    requestAnimationFrame: () => 0, setTimeout: () => 0, clearTimeout: nada };
  ctx.window = ctx; ctx.addEventListener = nada; ctx.parent = ctx;
  vm.createContext(ctx);
  const ini = PAG.indexOf('<script>') + 8, fim = PAG.indexOf('/* ---- 07-toprender.js ---- */');
  vm.runInContext(PAG.slice(ini, fim) + '\nvar App = { showScreen(){}, showHome(){}, openSetup(){}, renderSetup(){}, buildScene(){}, buildOpt(){}, sel: {} }; var SIZE_LABELS = {1:"1x1",2:"2x2",3:"3x3",4:"4x4",5:"5x5",6:"6x6",7:"7x7"};', ctx);
  vm.runInContext(fs.readFileSync(path.join(PASTA, 'ponte.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(PASTA, 'estadios.js'), 'utf8'), ctx);
  return ctx.RachaoEstadios;
}
const EST = oficinaDeEstadios(), arred = EST.arredFis;
const fisRachao = (parte, jogo, base) => { const f = PONTE.noRachao(base || {}, parte, PONTE.alvo(jogo)[parte], arred); const o = {}; for (const k in f) if (f[k] !== null) o[k] = f[k]; return o; };

function jogoRachao(phys) {               // o bate-bola do Rachão: um jogador (p1) e a bola, no campo Clássico, sem corrida
  const map = Object.assign({}, MAP_BY_ID.classico, { id: 'u_teste', custom: true, phys: Object.assign({}, phys || {}) });
  const T = new TopMatch({ mode: 'free', map, run: 'normal' });
  const cmd = { mx: 0, my: 0 };
  T.inputProvider = (ctrl, p) => { p.input.mx = cmd.mx; p.input.my = cmd.my; p.input.kick = false; p.input.sprint = false; };
  return { T, cmd, p: T.players[0], b: T.ball, R: T.P.playerR, H: T.map.H };
}
// o RACHA: o motor dos mapas (server/partida/mapa.js) num campo grande, com dois jogadores (o segundo longe de tudo)
function jogoRacha(perfil, extra) {
  const fisica = perfil ? { preset: 'personalizado', perfil: Object.fromEntries(M.PERFIL_CAMPOS.map(k => [k, perfil[k]])), extra: Object.assign({}, extra) } : { preset: 'classico' };
  const r = M.limpa({ formato: 'racha-mapa', v: 1, nome: 'mistura', campo: { w: 200, h: 120, margem: 10, margemY: 10 }, partida: { equipes: 2, porTime: 1 }, fisica,
    objetos: [{ id: 'gA', tipo: 'gol', x: -100, y: 50, rot: 180, largura: 8, prof: 4, dono: 0 }, { id: 'gB', tipo: 'gol', x: 100, y: 50, rot: 0, largura: 8, prof: 4, dono: 1 }], logica: [] });
  if (!r.ok) throw new Error('mapa de teste recusado: ' + JSON.stringify(r.erros));
  const P = M.novaPartida(r.mapa, { jogadores: [{ netId: 'a', nome: 'A' }, { netId: 'b', nome: 'B' }], porTime: 1 });
  P.estado = 'jogo';
  const q = P.jog[0], o = P.jog[1], cmd = { mx: 0, my: 0 };
  o.x = P.G.GL + 40; o.y = P.G.GB - 40; o.vx = o.vy = 0;
  const passo = () => P.passo(j => { if (j === q) { j.mx = cmd.mx; j.my = cmd.my; } else { j.mx = j.my = 0; } });
  return { P, q, cmd, passo, R: P.C.R_JOG, B: P.B, C: P.C };
}

/* ---------------------------------------------------------------- as medidas (R = o raio do jogador; por passo de 1/60 s) */
// o jogador: a velocidade máxima, o caminho perdido arrancando (em passos) e o que anda depois de soltar (em R)
function andarRachao(phys) {
  const J = jogoRachao(phys), d = J.p.disc; d.x = -380; d.y = 150; d.vx = d.vy = 0; J.b.x = 0; J.b.y = -150;
  J.cmd.mx = 1; const xs = [d.x];
  for (let t = 0; t < 150; t++) { J.T.update(); xs.push(d.x); }
  const top = (xs[150] - xs[149]) / J.R, lag = 60 - (xs[60] - xs[0]) / (top * J.R);
  J.cmd.mx = 0; const x0 = d.x; for (let t = 0; t < 400; t++) J.T.update();
  return { top, lag, solta: (d.x - x0) / J.R };
}
function andarRacha(perfil, extra) {
  const J = jogoRacha(perfil, extra), q = J.q; q.x = J.P.G.GL + 30; q.y = J.P.G.CY; q.vx = q.vy = 0; J.B.x = J.P.G.CX; J.B.y = J.P.G.GT + 20; J.B.vx = J.B.vy = 0;
  J.cmd.mx = 1; const xs = [q.x];
  for (let t = 0; t < 150; t++) { J.passo(); xs.push(q.x); }
  const top = (xs[150] - xs[149]) / J.R, lag = 60 - (xs[60] - xs[0]) / (top * J.R);
  J.cmd.mx = 0; const x0 = q.x; for (let t = 0; t < 400; t++) J.passo();
  return { top, lag, solta: (q.x - x0) / J.R };
}
// a bola solta: até onde rola com a velocidade v0 (R por passo), em R
function rolaRachao(phys, v0) {
  const J = jogoRachao(phys), d = J.p.disc; d.x = 300; d.y = 180;
  const b = J.b; b.x = -400; b.y = -60; b.vx = v0 * J.R; b.vy = 0; const x0 = b.x;
  for (let t = 0; t < 1200 && (b.vx || b.vy); t++) J.T.update();
  return (b.x - x0) / J.R;
}
function rolaRacha(perfil, extra, v0) {
  const J = jogoRacha(perfil, extra); J.q.x = J.P.G.GR - 30; J.q.y = J.P.G.GB - 30;
  const B = J.B; B.x = J.P.G.LX0 + 20; B.y = J.P.G.CY - 30; B.vx = v0 * J.R * N.TPS; B.vy = 0; const x0 = B.x;
  for (let t = 0; t < 1200 && Math.hypot(B.vx, B.vy) > 1e-3; t++) J.passo();
  return (B.x - x0) / J.R;
}
// o teto: a bola lançada a v0 (R por passo) — a velocidade que sobra depois de 3 passos
function tetoRachao(phys, v0) {
  const J = jogoRachao(phys), d = J.p.disc; d.x = 300; d.y = 180;
  const b = J.b; b.x = -400; b.y = -60; b.vx = v0 * J.R; b.vy = 0;
  for (let t = 0; t < 3; t++) J.T.update();
  return Math.hypot(b.vx, b.vy) / J.R;
}
function tetoRacha(perfil, extra, v0) {
  const J = jogoRacha(perfil, extra); J.q.x = J.P.G.GR - 30; J.q.y = J.P.G.GB - 30;
  const B = J.B; B.x = J.P.G.LX0 + 20; B.y = J.P.G.CY - 30; B.vx = v0 * J.R * N.TPS; B.vy = 0;
  for (let t = 0; t < 3; t++) J.passo();
  return Math.hypot(B.vx, B.vy) / N.TPS / J.R;
}
// a parede: a bola sobe reto e volta — quanto da velocidade ela devolve (já tirado o freio do passo)
function paredeRachao(phys, v) {
  const J = jogoRachao(phys), d = J.p.disc; d.x = 300; d.y = 180;
  const b = J.b; b.x = -100; b.y = -J.H + 40; b.vx = 0; b.vy = -v * J.R; let antes = 0;
  for (let t = 0; t < 60; t++) { const vy = b.vy; J.T.update(); if (b.vy > 0) return b.vy / (-vy * J.T.P.ballDamp); antes = vy; }
  return NaN;
}
function paredeRacha(perfil, extra, v) {
  const J = jogoRacha(perfil, extra); J.q.x = J.P.G.GR - 30; J.q.y = J.P.G.GB - 30;
  const B = J.B; B.x = J.P.G.CX; B.y = J.P.G.LY0 + 3 * J.R; B.vx = 0; B.vy = -v * J.R * N.TPS;
  for (let t = 0; t < 60; t++) { const vy = B.vy; J.passo(); if (B.vy > 0) return B.vy / (-vy * J.C.FATOR_BOLA); }
  return NaN;
}
// o pé: o jogador vem andando e bate na bola parada — a velocidade que a bola ganha ÷ a que o jogador vinha (o passo de antes)
function peRachao(phys) {
  const J = jogoRachao(phys), d = J.p.disc, b = J.b; d.x = -300; d.y = 60; b.x = -300 + J.R * 30; b.y = 60; b.vx = b.vy = 0;
  J.cmd.mx = 1; let vAntes = 0;
  for (let t = 0; t < 400; t++) { const x = d.x; J.T.update(); if (Math.hypot(b.vx, b.vy) > 1e-6) return { razao: Math.hypot(b.vx, b.vy) / vAntes }; vAntes = d.x - x; }
  return { razao: NaN };
}
function peRacha(perfil, extra) {
  const J = jogoRacha(perfil, extra), q = J.q, B = J.B; q.x = J.P.G.GL + 30; q.y = J.P.G.CY; q.vx = q.vy = 0; B.x = q.x + J.R * 30; B.y = q.y; B.vx = B.vy = 0;
  J.cmd.mx = 1; let vAntes = 0;
  for (let t = 0; t < 600; t++) { const x = q.x; J.passo(); if (Math.hypot(B.vx, B.vy) > 1e-6) return { razao: Math.hypot(B.vx, B.vy) / N.TPS / vAntes }; vAntes = q.x - x; }
  return { razao: NaN };
}
// o chute: a bola parada encostada no jogador — a velocidade que ela ganha (R por passo)
function chuteRachao(phys) {
  const J = jogoRachao(phys), d = J.p.disc, b = J.b; d.x = 0; d.y = 0; b.x = d.r + b.r + 1; b.y = 0; b.vx = b.vy = 0;
  J.T.doKick(J.p, b); return Math.hypot(b.vx, b.vy) / J.R;
}
function chuteRacha(perfil, extra) {
  const J = jogoRacha(perfil, extra), q = J.q, B = J.B; q.x = J.P.G.CX; q.y = J.P.G.CY; q.vx = q.vy = 0; B.x = q.x + J.C.R_JOG + J.C.R_BOLA + 1; B.y = q.y; B.vx = B.vy = 0;
  M.__interno.chuta(J.P, q, J.C.FORCA_POWER); return Math.hypot(B.vx, B.vy) / N.TPS / J.R;
}

console.log('1) a ponte tem os números dos dois jogos');
{
  const lims = Object.keys(PONTE.LIM_RACHA).every(k => { const L = N.LIMITES[k] || M.EXTRA_LIM[k]; return L && L[0] === PONTE.LIM_RACHA[k][0] && L[1] === PONTE.LIM_RACHA[k][1]; });
  confere(lims, 'os limites do RACHA na ponte são os do núcleo e os do mapa (a arrancada agora vai até 0,02)', { acelJog: M.EXTRA_LIM.acelJog });
  confere(Object.keys(PONTE.RACHA).every(k => N.PERFIL_V92[k] === PONTE.RACHA[k]) && Object.keys(PONTE.RACHA_EXTRA).every(k => M.EXTRA_PADRAO[k] === PONTE.RACHA_EXTRA[k]),
    'o RACHA de sempre na ponte é o perfil oficial (PERFIL_V92) e os extras do Clássico');
  const bp = basePhys();
  confere(['ballDamp', 'ballBounce', 'playerBounce', 'wallBounce', 'postBounce', 'netBackBounce', 'borderBounce', 'ballR', 'ballIm', 'playerR', 'accel', 'playerDamp', 'sprint', 'kickForce', 'kickReach', 'kickAccel']
    .every(k => bp[k] === PONTE.RACHAO[k]) && bp.ballMax === undefined && bp.andar === undefined, 'o Rachão de sempre na ponte é o basePhys do jogo (e os ganchos novos ficam de fora dele)');
}

console.log('2) cada parte sozinha, e a ponte reconhece o que é de quem');
{
  const RR = M.fisicaResolvida({ preset: 'classico' });
  const quais = PONTE.PARTES.map(p => PONTE.qualRacha(RR.perfil, RR.extra, p) + '/' + PONTE.qualRachao({}, p, arred));
  confere(quais.join() === 'racha/rachao,racha/rachao,racha/rachao', 'o Clássico de cada jogo: as três partes são do próprio jogo', quais);
  let quebrou = [];
  for (const parte of PONTE.PARTES) {
    // no RACHA: a parte do Rachão entra e as outras duas continuam do RACHA (e voltam)
    const n = PONTE.noRacha(RR.perfil, RR.extra, parte, PONTE.alvo('rachao')[parte]);
    const q = PONTE.PARTES.map(x => PONTE.qualRacha(n.perfil, n.extra, x));
    if (q.join() !== PONTE.PARTES.map(x => x === parte ? 'rachao' : 'racha').join()) quebrou.push(['racha', parte, q]);
    const v = PONTE.noRacha(n.perfil, n.extra, parte, PONTE.alvo('racha')[parte]);
    if (!PONTE.PARTES.every(x => PONTE.qualRacha(v.perfil, v.extra, x) === 'racha')) quebrou.push(['racha-volta', parte]);
    // no Rachão: a parte do RACHA entra e as outras duas continuam do Rachão (e voltam)
    const f = fisRachao(parte, 'racha');
    const qr = PONTE.PARTES.map(x => PONTE.qualRachao(f, x, arred));
    if (qr.join() !== PONTE.PARTES.map(x => x === parte ? 'racha' : 'rachao').join()) quebrou.push(['rachao', parte, qr, f]);
    const fv = fisRachao(parte, 'rachao', f);
    if (!PONTE.PARTES.every(x => PONTE.qualRachao(fv, x, arred) === 'rachao')) quebrou.push(['rachao-volta', parte, fv]);
  }
  confere(!quebrou.length, 'em cada jogo, misturar a bola, o jogador ou o chute do outro muda só essa parte; voltar devolve a de sempre', quebrou);
  // tudo do outro jogo, em qualquer ordem: as três partes reconhecidas
  let f = {}; for (const parte of ['chute', 'bola', 'jogador']) f = fisRachao(parte, 'racha', f);
  let n = { perfil: RR.perfil, extra: RR.extra }; for (const parte of ['jogador', 'chute', 'bola']) n = PONTE.noRacha(n.perfil, n.extra, parte, PONTE.alvo('rachao')[parte]);
  confere(PONTE.PARTES.every(x => PONTE.qualRachao(f, x, arred) === 'racha') && PONTE.PARTES.every(x => PONTE.qualRacha(n.perfil, n.extra, x) === 'rachao'),
    'as três partes do outro jogo juntas (em qualquer ordem) ficam todas reconhecidas');
  const ajust = PONTE.noRacha(RR.perfil, RR.extra, 'bola', PONTE.alvo('rachao').bola); ajust.perfil.fatorBola = 0.98;
  confere(PONTE.qualRacha(ajust.perfil, ajust.extra, 'bola') === '' && PONTE.qualRachao({ ballDamp: 0.97 }, 'bola', arred) === '', 'mexeu num número da parte: ela fica «ajustada» (nem de um, nem de outro)');
  const lim = Object.entries(n.perfil).concat(Object.entries(n.extra)).filter(([k, v]) => PONTE.LIM_RACHA[k] && (v < PONTE.LIM_RACHA[k][0] - 1e-9 || v > PONTE.LIM_RACHA[k][1] + 1e-9));
  confere(!lim.length, 'o que a ponte escreve no RACHA fica dentro dos limites do servidor', lim);
}

console.log('3) a bola, jogada nos dois motores');
const RR = M.fisicaResolvida({ preset: 'classico' });
const bolaRachao = fisRachao('bola', 'racha'), bolaRacha = PONTE.noRacha(RR.perfil, RR.extra, 'bola', PONTE.alvo('rachao').bola);
{
  const tam = [bolaRachao.ballR / 15, PONTE.RACHA.rBola / PONTE.RACHA.rJog, bolaRacha.perfil.rBola / bolaRacha.perfil.rJog, PONTE.RACHAO.ballR / PONTE.RACHAO.playerR];
  confere(perto(tam[0], tam[1], 0.01) && perto(tam[2], tam[3], 0.01), 'o tamanho perto do jogador: a do RACHA é metade dele, a do Rachão dois terços (nos dois jogos)', tam.map(r3));
  const rola = [rolaRacha(null, null, 0.25), rolaRachao(bolaRachao, 0.25), rolaRachao({}, 0.25), rolaRacha(bolaRacha.perfil, bolaRacha.extra, 0.25)];
  confere(perto(rola[0], rola[1], 0.03) && perto(rola[2], rola[3], 0.03), 'até onde a bola rola solta (0,25 R por passo): a do RACHA no Rachão rola o mesmo que no RACHA, e a do Rachão no RACHA o mesmo que no Rachão', rola.map(r3));
  const teto = [tetoRacha(null, null, 0.7), tetoRachao(bolaRachao, 0.7), tetoRachao({}, 0.7), tetoRacha(bolaRacha.perfil, bolaRacha.extra, 0.7)];
  confere(perto(teto[0], teto[1], 0.03) && perto(teto[0], 0.39, 0.03) && perto(teto[2], teto[3], 0.03) && teto[2] > 0.65, 'a velocidade máxima: a bola do RACHA para no teto (0,39 R por passo) também no Rachão; a do Rachão, sem teto lá, no RACHA fica com o maior teto que ele aceita (90 u/s, 0,75 R por passo) e a 0,7 passa solta', teto.map(r3));
  const par = [paredeRacha(null, null, 0.2), paredeRachao(bolaRachao, 0.2), paredeRachao({}, 0.2), paredeRacha(bolaRacha.perfil, bolaRacha.extra, 0.2)];
  confere(perto(par[0], par[1], 0.04) && perto(par[2], par[3], 0.04) && perto(par[0], 0.65, 0.04) && perto(par[2], 0.5, 0.04), 'o quique na parede: 65% a do RACHA e 50% a do Rachão, nos dois motores', par.map(r3));
  const pe = [peRacha(), peRachao(bolaRachao), peRachao({}), peRacha(bolaRacha.perfil, bolaRacha.extra)].map(x => x.razao);
  confere(perto(pe[0], pe[1], 0.15) && perto(pe[2], pe[3], 0.15) && pe[1] < 0.2 && pe[2] > 0.6,
    'o pé (o jogador bate andando na bola parada): a bola do RACHA, pesada e sem quique, sai com ' + Math.round(pe[0] * 100) + '% da velocidade dele no RACHA e ' + Math.round(pe[1] * 100)
    + '% no Rachão; a do Rachão, leve, com ' + Math.round(pe[2] * 100) + '% no Rachão e ' + Math.round(pe[3] * 100) + '% no RACHA', pe.map(r3));
  confere(perto(chuteRachao(bolaRachao), chuteRachao({}), 0.02) && perto(chuteRacha(bolaRacha.perfil, bolaRacha.extra), chuteRacha(), 0.02), 'trocar a bola não muda o chute (a força acompanha o peso)');
}

console.log('4) o jogador, jogado nos dois motores');
const jogRachao = fisRachao('jogador', 'racha'), jogRacha = PONTE.noRacha(RR.perfil, RR.extra, 'jogador', PONTE.alvo('rachao').jogador);
{
  const a = andarRacha(), b = andarRachao(jogRachao), c = andarRachao({}), d = andarRacha(jogRacha.perfil, jogRacha.extra);
  confere(jogRachao.andar === 'direto' && perto(a.top, b.top, 0.02) && Math.abs(a.lag - b.lag) < 1.5 && Math.abs(a.solta - b.solta) < 0.15,
    'o jogador do RACHA no Rachão: a mesma velocidade máxima, arranca e para na hora (o andar direto)', { racha: a, rachao: b });
  confere(perto(c.top, d.top, 0.03) && perto(c.lag, d.lag, 0.12) && perto(c.solta, d.solta, 0.1),
    'o jogador do Rachão no RACHA: a mesma velocidade máxima, o mesmo caminho perdido no embalo e o mesmo deslize ao soltar', { rachao: c, racha: d });
  confere(c.top > a.top * 1.4 && c.lag > 15 && a.lag < 1 && c.solta > 3, 'e os dois são bem diferentes: o do Rachão é mais rápido e embala; o do RACHA arranca e para na hora', { rachao: c, racha: a });
}

console.log('5) o chute, jogado nos dois motores');
const chRachao = fisRachao('chute', 'racha'), chRacha = PONTE.noRacha(RR.perfil, RR.extra, 'chute', PONTE.alvo('rachao').chute);
{
  const v = [chuteRacha(), chuteRachao(chRachao), chuteRachao({}), chuteRacha(chRacha.perfil, chRacha.extra)];
  confere(perto(v[0], v[1], 0.02) && perto(v[2], v[3], 0.02) && v[2] > v[0] * 1.1, 'a bola sai do chute com a mesma velocidade nos dois motores (o do Rachão é um pouco mais forte)', v.map(r3));
  const rch = [PONTE.doRacha(chRacha.perfil, chRacha.extra).chute.alcance, PONTE.RACHAO.kickReach / PONTE.RACHAO.playerR, chRachao.kickReach / 15, 0.5 / PONTE.RACHA.rJog];
  confere(perto(rch[0], rch[1], 0.03) && perto(rch[2], rch[3], 0.04), 'o alcance do chute (a folga entre o pé e a bola) também vai junto', rch.map(r3));
}

console.log('6) os ganchos novos do motor do Rachão, em partidas inteiras');
{
  const sem = Object.assign({}, MAP_BY_ID.classico, { id: 'u_sem', custom: true, chutes: { lob: false, curve: false, superKick: false } });
  const T = new TopMatch({ mode: 'match', map: sem, teams: [2, 2], humans: [], diff: 'dificil', time: 60, goals: 0, lob: true, curve: true, superKick: true });
  const so = Object.assign({}, MAP_BY_ID.classico, { id: 'u_so', custom: true, chutes: { lob: false } }), T2 = new TopMatch({ mode: 'match', map: so, teams: [1, 1], humans: [] });
  confere(!T.allowLob && !T.allowCurve && !T.allowSuper && !T2.allowLob && T2.allowCurve && T2.allowSuper, 'o estádio sem cavadinha, sem curva e sem super chute vale mesmo com as três ligadas na preparação (e um só desligado também)');
  let lobs = 0, supers = 0, curvas = 0; T.onKick = (p, b) => { if (b.vz > 1) lobs++; if (b.spin) curvas++; };
  for (let t = 0; t < 3600; t++) { T.update(); for (const e of T.events) if (e.t === 'kick' && e.superKick) supers++; T.events.length = 0; }
  confere(T.stats.kicks > 20 && lobs === 0 && supers === 0 && curvas === 0, 'numa partida de 1 minuto de bots no estádio só com o Chutar: nenhum chute por cima, nenhum com curva, nenhum super (' + T.stats.kicks + ' chutes)', { lobs, supers, curvas });
  const tudo = {}; for (const parte of PONTE.PARTES) Object.assign(tudo, fisRachao(parte, 'racha', tudo));
  const mR = Object.assign({}, MAP_BY_ID.classico, { id: 'u_racha', custom: true, phys: tudo });
  const problemas = []; let maxB = 0, gols = 0, anda = 0;
  for (const modo of ['match', 'chaos']) {
    RC.semente(1234);
    const U = new TopMatch({ mode: modo, map: mR, teams: [3, 3], humans: [], diff: 'dificil', time: 90, goals: 0, run: 'folego' });
    const x0 = U.players.map(p => p.disc.x);
    for (let t = 0; t < 5400; t++) {
      U.update();
      for (const b of U.balls) { if (!(b.z > 0)) maxB = Math.max(maxB, Math.hypot(b.vx, b.vy)); if (!Number.isFinite(b.x + b.y + b.vx + b.vy)) problemas.push([modo, t, 'bola']); }
      if (U.players.some(p => !Number.isFinite(p.disc.x + p.disc.y))) problemas.push([modo, t, 'jogador']);
      if (problemas.length) break;
    }
    gols += U.score[0] + U.score[1]; anda += U.players.filter((p, i) => Math.abs(p.disc.x - x0[i]) > 1).length;
  }
  confere(!problemas.length && gols > 0 && anda >= 10, 'o Rachão todo com a física do RACHA (bola, jogador e chute): 3x3 de bots, Contra bots e Caos de 90 s — tudo anda, sai gol (' + gols + '), nada vira NaN', problemas.slice(0, 3));
  confere(maxB <= tudo.ballMax + 0.6, 'a bola do RACHA respeita o teto na partida (o chute do passo passa só no passo do chute)', [r3(maxB), tudo.ballMax]);
}

console.log('7) uma parte não mexe nas outras — medido nos motores, partindo de várias físicas (não só a do Clássico)');
{
  // o Rachão: as medidas de cada parte (a bola: rola, parede e pé; o jogador: máxima, embalo e deslize; o chute: o normal e o super)
  function superRachao(phys) { const J = jogoRachao(phys), d = J.p.disc, b = J.b; d.x = 0; d.y = 0; b.x = d.r + b.r + 1; b.y = 0; b.vx = b.vy = 0; J.T.doKick(J.p, b, 1); return Math.hypot(b.vx, b.vy) / J.R; }
  const medeRachao = f => ({ bola: [rolaRachao(f, 0.2), paredeRachao(f, 0.2), peRachao(f).razao], jogador: (a => [a.top, a.lag, a.solta])(andarRachao(f)), chute: [chuteRachao(f), superRachao(f)] });
  const COMECOS = { 'Clássico': {}, 'Bola de praia': { ballR: 14, ballIm: 1.45, ballDamp: 0.984, airDamp: 0.992, gravity: 0.13 }, 'Bola pesada': { ballIm: 0.6, ballDamp: 0.978, ballBounce: 0.3, landBounce: 0.25, kickForce: 6.5 },
    'Gelo': Object.assign({}, MAP_BY_ID.rinque.phys), 'Quica tudo': { ballBounce: 0.85, wallBounce: 1.17, landBounce: 0.75, postBounce: 0.9 }, 'Lua': Object.assign({}, MAP_BY_ID.lua.phys) };
  const vaz = [];
  for (const [nome, f0] of Object.entries(COMECOS)) {
    const m0 = medeRachao(f0);
    for (const parte of PONTE.PARTES) {
      const f1 = fisRachao(parte, 'racha', f0), m1 = medeRachao(f1);
      for (const outra of PONTE.PARTES) if (outra !== parte) m0[outra].forEach((v, i) => { const tol = outra === 'bola' && i === 2 ? 0.1 : outra === 'jogador' && i === 1 ? 0.06 : 0.03;
        if (!perto(v, m1[outra][i], tol, outra === 'jogador' && i === 1 ? 0.5 : 0.002)) vaz.push([nome, parte + '→' + outra, i, r3(v), r3(m1[outra][i])]); });
    }
  }
  confere(!vaz.length, 'no Rachão, partindo do Clássico, da bola de praia, da pesada, do gelo, do quica tudo e da Lua: a bola, o jogador ou o chute do RACHA não mudam as outras duas partes (nem o super chute)', vaz.slice(0, 6));
  // o RACHA: as medidas de cada parte (a bola: rola, parede e pé; a tampinha: máxima, arranque e deslize; o chute e o passe)
  function passeRacha(perfil, extra) { const J = jogoRacha(perfil, extra), q = J.q, B = J.B; q.x = J.P.G.CX; q.y = J.P.G.CY; q.vx = q.vy = 0; B.x = q.x + J.C.R_JOG + J.C.R_BOLA + 1; B.y = q.y; B.vx = B.vy = 0; M.__interno.chuta(J.P, q, J.C.FORCA_KICK); return Math.hypot(B.vx, B.vy) / N.TPS / J.R; }
  const medeRacha = (p, x) => ({ bola: [rolaRacha(p, x, 0.2), paredeRacha(p, x, 0.2), peRacha(p, x).razao], jogador: (a => [a.top, a.lag, a.solta])(andarRacha(p, x)), chute: [chuteRacha(p, x), passeRacha(p, x)] });
  const vazR = [];
  for (const pre of Object.keys(M.PRESETS).filter(k => k !== 'personalizado')) {
    const R0 = M.fisicaResolvida({ preset: pre }), m0 = medeRacha(R0.perfil, R0.extra);
    for (const parte of PONTE.PARTES) {
      const n = PONTE.noRacha(R0.perfil, R0.extra, parte, PONTE.alvo('rachao')[parte]), R1 = M.fisicaResolvida({ preset: 'personalizado', perfil: n.perfil, extra: n.extra });
      const m1 = medeRacha(R1.perfil, R1.extra);
      for (const outra of PONTE.PARTES) if (outra !== parte) m0[outra].forEach((v, i) => { const tol = outra === 'bola' && i === 2 ? 0.1 : outra === 'jogador' && i === 1 ? 0.06 : 0.03;
        if (!perto(v, m1[outra][i], tol, outra === 'jogador' && i === 1 ? 0.5 : 0.002)) vazR.push([pre, parte + '→' + outra, i, r3(v), r3(m1[outra][i])]); });
    }
  }
  confere(!vazR.length, 'no RACHA, partindo do Clássico, do Rápido, do Técnico, do Arcade e da Precisão: a bola, a tampinha ou o chute do Rachão não mudam as outras duas partes (nem o passe)', vazR.slice(0, 6));
  // os limites do servidor com físicas sorteadas (cada parte de cada jogo, por cima de qualquer coisa que o RACHA aceite)
  let semente = 5; const rnd = () => { semente = (semente * 1103515245 + 12345) & 0x7fffffff; return semente / 0x7fffffff; };
  const fora = [];
  for (let k = 0; k < 400; k++) {
    const perfil = {}, extra = {};
    for (const c of M.PERFIL_CAMPOS) { const L = N.LIMITES[c]; if (L && rnd() < 0.6) perfil[c] = L[0] + rnd() * (L[1] - L[0]); }
    for (const c in M.EXTRA_LIM) { const L = M.EXTRA_LIM[c]; if (rnd() < 0.6) extra[c] = L[0] + rnd() * (L[1] - L[0]); }
    const R0 = M.fisicaResolvida({ preset: 'personalizado', perfil, extra });
    for (const parte of PONTE.PARTES) for (const jogo of ['rachao', 'racha']) {
      const n = PONTE.noRacha(R0.perfil, R0.extra, parte, PONTE.alvo(jogo)[parte]);
      for (const [c, v] of Object.entries(n.perfil).concat(Object.entries(n.extra))) { const L = N.LIMITES[c] || M.EXTRA_LIM[c]; if (L && !(v >= L[0] - 1e-9 && v <= L[1] + 1e-9)) fora.push([k, parte, jogo, c, v]); }
    }
  }
  confere(!fora.length, 'o que a ponte escreve no RACHA fica nos limites do servidor (400 físicas sorteadas × 3 partes × 2 jogos)', fora.slice(0, 5));
}

console.log('8) o estádio guarda os chutes e a mistura (a limpeza, o código e a montagem)');
{
  const d = EST.docNovo(); d.nome = 'Só o Chutar do RACHA'; d.partida.chutes = { cavadinha: false, curva: false, super: false };
  for (const parte of PONTE.PARTES) Object.assign(d.fisica, fisRachao(parte, 'racha', d.fisica));
  const L = EST.limpa(d), volta = EST.decodifica(EST.codifica(Object.assign({}, L, { id: 'u_misturado1' })));
  const igual = JSON.stringify(volta.fisica) === JSON.stringify(L.fisica) && JSON.stringify(volta.partida.chutes) === JSON.stringify(L.partida.chutes);
  confere(L.fisica.andar === 'direto' && L.fisica.ballWeight === 8 && L.fisica.ballFootBounce === 0 && igual, 'a física misturada e os chutes passam pela limpeza e pelo código (RACHAO1.…) sem mudar nada', [L.fisica, volta && volta.fisica]);
  const m = EST.compila(Object.assign({}, L, { id: 'u_misturado1' }));
  confere(m.chutes && m.chutes.lob === false && m.chutes.curve === false && m.chutes.superKick === false && m.phys.andar === 'direto' && m.phys.ballMax === L.fisica.ballMax && /só o Chutar/.test(m.desc) && /bola, o jogador e o chute do RACHA/.test(m.desc),
    'montado no formato do jogo: os chutes (lob, curve, superKick), a física do RACHA no phys e a descrição que conta os dois', [m.chutes, m.desc]);
  const so = EST.limpa(Object.assign(EST.docNovo(), { partida: { min: 1, max: 4, padrao: 2, gols: 0, chutes: { curva: false } } }));
  const ms = EST.compila(Object.assign({}, so, { id: 'u_semcurva1' }));
  confere(ms.chutes && ms.chutes.lob === true && ms.chutes.curve === false && ms.chutes.superKick === true && !EST.compila(Object.assign(EST.docNovo(), { id: 'u_todos001' })).chutes,
    'só a curva desligada: só ela sai; com os três ligados o estádio nem leva a regra (como os 17 campos)');
  const orig = RC.E('MAPS').filter(x => !x.custom).map(x => EST.compila(Object.assign(EST.docDeMapa(x), { id: 'u_' + x.id.replace(/[^a-z0-9]/g, '').padEnd(6, '0') })));
  confere(orig.every(x => !x.chutes && x.phys.andar === undefined && x.phys.ballMax === undefined && x.phys.ballWeight === undefined && x.phys.ballFootBounce === undefined),
    'os 17 campos, abertos no editor: todos os chutes e nenhum número novo (a física de cada um como era)');
  const sujo = EST.limpa({ fisica: { andar: 'voar', moveMax: 3, ballMax: 99, ballWeight: -2, ballFootBounce: 'x' }, partida: { chutes: { cavadinha: 'nao', curva: null } } });
  confere(!('andar' in sujo.fisica) && !('moveMax' in sujo.fisica) && sujo.fisica.ballMax === 15 && sujo.fisica.ballWeight === 0.25 && !('ballFootBounce' in sujo.fisica) && sujo.partida.chutes.cavadinha === true && sujo.partida.chutes.curva === true,
    'o que vem de fora estranho: o andar desconhecido some (e os números do andar direto junto), os números ficam nos limites e os chutes só desligam com false', sujo.fisica);
}

console.log('9) os 17 campos do Rachão continuam iguais (o motor original × o da página, com o mesmo sorteio e os mesmos comandos)');
{
  const RO = motorRachao(fs.readFileSync(path.join(RAIZ, 'backup', 'rachao.html'), 'utf8'));
  const mapsA = RO.E('MAPS'), mapsB = RC.E('MAPS').filter(m => !m.custom), TA = RO.E('TopMatch');
  // um roteiro de comandos para quem é gente (o mesmo nos dois motores): anda em curvas, corre, arma o chute, a cavadinha,
  // a curva e o super chute de tempos em tempos (no treino de goleiro, o mergulho)
  const roteiro = T => (ctrl, p) => {
    const k = T.tick + (ctrl === 'p2' ? 57 : 0), I = p.input;
    I.mx = Math.sin(k / 23); I.my = Math.cos(k / 37); I.sprint = k % 90 < 40; I.kick = k % 30 < 6;
    I.lob = k % 200 === 0; I.curveL = k % 170 === 0; I.curveR = k % 230 === 0; I.superKick = k % 120 < 20; I.power = k % 260 === 0;
  };
  const MODOS = [['match', {}], ['chaos', {}], ['free', {}], ['match', { humans: [{ team: 0, ctrl: 'p1' }, { team: 1, ctrl: 'p2' }], teams: [2, 2] }],
    ['train_shoot', { keeper: true }], ['train_keep', {}]];
  const dif = []; let n = 0, mexeu = 0;
  for (let i = 0; i < mapsA.length; i++) for (const [modo, extra] of MODOS) {
    const fins = [];
    for (const [E, TT, mp] of [[RO, TA, mapsA[i]], [RC, TopMatch, mapsB[i]]]) {
      E.semente(777 + i);
      const T = new TT(Object.assign({ mode: modo, map: mp, teams: [3, 3], humans: [], diff: 'dificil', time: 60, goals: 0, run: 'folego' }, extra));
      T.inputProvider = roteiro(T);
      const x0 = T.players.map(q => q.disc.x + ',' + q.disc.y).join();
      for (let t = 0; t < 1200; t++) T.update();
      if (T.players.map(q => q.disc.x + ',' + q.disc.y).join() !== x0) mexeu++;
      fins.push(JSON.stringify([T.balls.map(b => [b.x, b.y, b.vx, b.vy, b.z]), T.players.map(q => [q.disc.x, q.disc.y, q.disc.vx, q.disc.vy]), T.score, T.stats]));
    }
    n++; if (fins[0] !== fins[1]) dif.push(mapsA[i].id + ':' + modo);
  }
  confere(n === 17 * MODOS.length && mexeu === 2 * n && !dif.length,
    n + ' partidas (17 campos × Contra bots, Caos, bate-bola, 2 jogadores, treino de finalização e de goleiro; 20 s, os bots e um roteiro de comandos): todas mexem e dão posições, placar e chutes idênticos, número por número', { dif: dif.slice(0, 6), mexeu, n });
}

console.log('\nv97 · a mistura da física entre o RACHA e o Rachão: ' + ok + ' ok, ' + falhou + ' falharam (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
process.exit(falhou ? 1 : 0);
