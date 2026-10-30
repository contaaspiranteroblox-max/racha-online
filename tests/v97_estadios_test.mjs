// RACHA v97 · A OFICINA DE ESTÁDIOS NO MOTOR DO RACHÃO (Node, sem navegador): o motor de verdade (o script da página
// app/public/game/rachao/rachao.html até o fim da partida vista de cima) e o estadios.js num vm.
// 1) os 17 campos: abertos no editor e montados de volta, dão o MESMO estádio (paredes, traves, obstáculos, zonas, física e
//    regras); 2) a limpeza nunca quebra e sempre devolve um estádio dentro dos limites, com qualquer entrada; 3) o código
//    para compartilhar volta igual; 4) estádios sorteados (de entradas ruins, limpas) jogados pelo motor — bate-bola,
//    partida e caos com 3x3 de bots —: nada vira NaN, o círculo do meio não passa da linha do gol, a parede não acelera a
//    bola e o Golzão cabe no estádio.
// Rodar: node tests/v97_estadios_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = path.join(RAIZ, 'app', 'public', 'game', 'rachao');
const html = fs.readFileSync(path.join(PASTA, 'rachao.html'), 'utf8');
const ini = html.indexOf('<script>') + 8, fim = html.indexOf('/* ---- 07-toprender.js ---- */');
if (ini < 8 || fim < 0) throw new Error('o script do Rachão mudou de forma');
let ok = 0, falhou = 0;
const confere = (c, txt, extra) => { if (c) { ok++; console.log('  ok   ' + txt); } else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra).slice(0, 400) : '')); } };
const t0 = Date.now();

// o vm: o motor e o estadios.js, com um documento de mentira (o estadios.js só monta as telas se achar o #app)
const nada = () => {};
const falso = () => new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : falso(), set: () => true, apply: () => falso() });
const guardado = {};
const ctx = { console: { log: nada, error: nada, warn: nada }, Math, JSON, Number, String, Array, Object, Set, Map, Proxy, TextEncoder, TextDecoder, btoa, atob, Date, URLSearchParams, Infinity, NaN,
  location: { search: '', origin: 'http://x', hash: '' },
  localStorage: { getItem: k => guardado[k] ?? null, setItem: (k, v) => { guardado[k] = String(v); }, removeItem: k => { delete guardado[k]; } },
  document: { getElementById: () => null, createElement: () => falso(), createTextNode: () => falso(), addEventListener: nada, querySelector: () => null, querySelectorAll: () => [], body: falso(), activeElement: null },
  requestAnimationFrame: () => 0, setTimeout: () => 0, clearTimeout: nada, ResizeObserver: function () { return { observe: nada }; }, Node: function () {} };
ctx.window = ctx; ctx.addEventListener = nada; ctx.parent = ctx;
vm.createContext(ctx);
vm.runInContext(html.slice(ini, fim) + '\nvar App = { showScreen(){}, showHome(){}, openSetup(){}, renderSetup(){}, buildScene(){}, buildOpt(){}, sel: {} }; var SIZE_LABELS = {1:"1x1",2:"2x2",3:"3x3",4:"4x4",5:"5x5",6:"6x6",7:"7x7"};', ctx);
vm.runInContext(fs.readFileSync(path.join(PASTA, 'ponte.js'), 'utf8'), ctx);      // (a ponte da física vem antes, como na página)
vm.runInContext(fs.readFileSync(path.join(PASTA, 'estadios.js'), 'utf8'), ctx);
const R = ctx.RachaoEstadios, E = s => vm.runInContext(s, ctx);
const buildStadium = E('buildStadium'), TopMatch = E('TopMatch'), MAPS = E('MAPS'), POWERS = E('POWERS');
confere(!!R && typeof R.compila === 'function' && MAPS.filter(m => !m.custom).length === 17, 'o motor do Rachão e a oficina de estádios carregam juntos (os 17 campos)');

console.log('1) os 17 campos de ida e volta pelo editor');
const r3 = v => v === undefined ? null : typeof v === 'number' ? Math.round(v * 1000) / 1000 : v;
const digital = m => {
  const st = buildStadium(m);
  return JSON.stringify({ segs: st.segs.map(s => [s.x1, s.y1, s.x2, s.y2, s.bounce, s.mask, s.kind, s.boost, s.minZ, s.maxZ, s.th, s.vis].map(r3)),
    statics: st.statics.map(s => [s.x, s.y, s.r, s.style, s.boost, s.bounce, s.im, s.h].map(r3)), zones: st.zones.map(z => [z.x, z.y, z.r, z.kind, z.ballDamp, z.accelMul, z.playerDamp].map(r3)),
    goals: st.goals.map(g => [g.side, g.x, g.dir, g.half, g.depth].map(r3)), gx: st.gx.map(r3), ext: [st.ext.x, st.ext.y].map(r3), walls: st.walls.length,
    phys: Object.keys(st.phys).sort().map(k => [k, r3(st.phys[k])]),
    topo: ['W', 'H', 'goal', 'depth', 'corner', 'cornerStyle', 'cornerBoost', 'margin', 'circle', 'surface', 'def', 'postStyle', 'netStyle', 'shape', 'goalInset', 'scoreDefault', 'wind'].map(k => [k, r3(m[k])]).concat([['sizes', JSON.stringify(m.sizes)]]) });
};
const dif = MAPS.filter(m => !m.custom).filter(m => digital(m) !== digital(R.compila(Object.assign(R.docDeMapa(m), { id: 'u_teste00' })))).map(m => m.id);
confere(dif.length === 0, 'cada um dos 17, aberto no editor e montado de volta, dá o mesmo estádio', dif);
const sims = Object.fromEntries(MAPS.filter(m => !m.custom).map(m => [m.id, R.docDeMapa(m).pecas.map(p => p.t + ':' + p.sim).join(',')]));
confere(sims.rua === 'poste:xy' && sims.fliper === 'bumper:xy,bumper:y' && sims.chuva === 'poca:xy,poca:x' && sims.labirinto === 'vaso:x,cerca:xy' && sims.terrao === 'lama:xy' && sims.classico === '',
  'as cópias espelhadas viram uma peça com o espelho mais simples (Rua, Fliperama, Temporal, Jardim, Terrão)', sims);

console.log('2) a limpeza, com entradas sorteadas (inclusive as ruins)');
let semente = 97;
const rnd = () => { semente = (semente * 1103515245 + 12345) & 0x7fffffff; return semente / 0x7fffffff; };
const esc = l => l[Math.floor(rnd() * l.length)];
const num = (a, b) => a + rnd() * (b - a);
const lixo = () => esc([undefined, null, NaN, Infinity, -Infinity, '12', 'oi', {}, [], true, 1e9, -1e9, num(-5, 5)]);
const sorteia = k => {
  const v = (a, b) => rnd() < 0.15 ? lixo() : num(a, b);
  const d = { v: 1, id: rnd() < 0.2 ? 'u_<b>' : 'u_fuzz' + String(k).padStart(4, '0'), nome: esc(['Campo', '<img src=x onerror=alert(1)>', 'a‮b', '', 7, 'x'.repeat(80)]), desc: esc(['', 'y'.repeat(300), null]), base: esc(['', 'rua', '__proto__', 'constructor']),
    campo: { formato: esc(['ret', 'oval', 'rinque', 'triangulo']), W: v(150, 950), H: v(80, 450), cantos: esc(['reto', 'redondo', 'chanfro', 'x']), canto: v(-20, 300), impulso: v(-2, 16), circulo: v(0, 220), margem: v(0, 120) },
    gol: { largura: v(0, 230), fundo: v(0, 110), recuo: v(0, 340), trave: esc(['trave', 'chinelo', 'bambu', 'x']), rede: esc(['net', 'garage', 'hole', 'x']) },
    piso: esc(['grass', 'ice', 'night', 'rain', 'moon', 'neon', 'wall', 'sand', 'lava']), fisica: {}, pecas: [],
    vento: { on: esc([true, false, 'sim']), forca: v(-1, 6), troca: v(-1, 40), dir: esc(['livre', 'gol', 'lado', 'diagonal', 'x']) },
    poderes: { lista: esc([undefined, [], ['turbo'], ['golzao', 'hack'], POWERS.map(p => p.id)]), cada: v(-1, 50), sempre: esc([true, false, 1]) },
    partida: { min: v(-1, 10), max: v(-1, 10), padrao: v(-1, 10), gols: esc([0, 1, 3, 4, 10, 'x']), chutes: esc([undefined, null, 'x', { cavadinha: false }, { curva: 0, super: false }, { cavadinha: false, curva: false, super: false }]) } };
  for (const k2 of ['ballDamp', 'airDamp', 'ballBounce', 'wallBounce', 'landBounce', 'ballR', 'ballIm', 'accel', 'playerDamp', 'sprint', 'playerR', 'playerBounce', 'kickForce', 'kickReach', 'kickAccel', 'gravity', 'postR', 'postBounce', 'foo',
    'ballMax', 'ballFootBounce', 'ballWeight', 'netBackBounce', 'moveMax', 'moveAccel', 'moveBrake'])
    if (rnd() < 0.5) d.fisica[k2] = v(-1, 3);
  if (rnd() < 0.4) d.fisica.andar = esc(['direto', 'embalo', 'x', 7]);
  const n = Math.floor(num(0, 70));
  for (let i = 0; i < n; i++) d.pecas.push(rnd() < 0.05 ? lixo() : { t: esc(['poste', 'bumper', 'vaso', 'cerca', 'lama', 'poca', 'bomba']), x: v(-950, 950), y: v(-450, 450), r: v(-5, 220), forca: v(-1, 20),
    len: v(-5, 500), th: v(-1, 30), a: v(-200, 200), bola: v(0.5, 1.2), andar: v(-1, 2), freio: v(0.5, 1.2), sim: esc(['n', 'x', 'y', 'xy', 'c', 'z']) });
  return d;
};
const docs = [];
let quebrou = 0, foraLimite = [];
for (let k = 0; k < 400; k++) {
  const d = sorteia(k);
  let L = null;
  try { L = R.limpa(d); } catch (e) { quebrou++; continue; }
  const C = L.campo, G = L.gol, n = L.pecas.reduce((s, p) => s + R.copias(p).length, 0);
  const dentro = typeof L.nome === 'string' && L.nome.length >= 1 && L.nome.length <= 28 && L.desc.length <= 90 && !/[\u0000-\u001f‮]/.test(L.nome)
    && C.W >= 240 && C.W <= 800 && C.H >= 130 && C.H <= 380 && ['ret', 'oval', 'rinque'].includes(C.formato) && G.largura >= 16 && G.largura <= 170
    && L.pecas.length <= 48 && n <= 160 && L.pecas.every(p => Math.abs(p.x) <= C.W && Math.abs(p.y) <= C.H && Number.isFinite(p.x) && Number.isFinite(p.y))
    && Object.entries(L.fisica).every(([k, x]) => k === 'andar' ? x === 'direto' : Number.isFinite(x)) && !('foo' in L.fisica) && (L.fisica.andar === 'direto' || !('moveMax' in L.fisica))
    && ['cavadinha', 'curva', 'super'].every(k => typeof L.partida.chutes[k] === 'boolean') && L.poderes.lista.length >= 1 && L.partida.min <= L.partida.max
    && L.partida.padrao >= L.partida.min && L.partida.padrao <= L.partida.max && (L.base === '' || L.base === 'rua')
    && ((L.fisica.ballBounce ?? 0.5) * (L.fisica.wallBounce ?? 1)) <= 1.0001;
  if (!dentro) foraLimite.push(k);
  L.id = 'u_fuzz' + String(k).padStart(4, '0');
  docs.push(L);
}
confere(quebrou === 0 && foraLimite.length === 0, 'a limpeza nunca quebra e devolve sempre um estádio nos limites (400 entradas sorteadas, metade ruins: textos, números, listas, chaves estranhas)', { quebrou, foraLimite: foraLimite.slice(0, 8) });
confere(R.limpa(null) === null && R.limpa([]) === null && R.limpa('x') === null, 'o que não é um estádio (nada, lista, texto) não vira estádio');

console.log('3) o código para compartilhar');
let codRuim = [];
for (const L of docs.slice(0, 120)) {
  const c = R.codifica(L), v = R.decodifica(c);
  if (!c.startsWith('RACHAO1.') || JSON.stringify(v) !== JSON.stringify(Object.assign({}, L, { id: '' }))) codRuim.push(L.id);
}
confere(codRuim.length === 0, 'o código (RACHAO1.…) de 120 estádios volta igual', codRuim.slice(0, 5));
const quebrados = ['', 'RACHAO1.', 'RACHAO2.e30', 'RACHAO1.e30=', 'RACHAO1.@@', 'RACHAO1.' + 'A'.repeat(30000), 'RACHAO1.bm9wZQ', 'RACHAO1.WzEsMiwzXQ'];
confere(quebrados.every(s => R.decodifica(s) === null), 'códigos quebrados, longos demais ou que não são um estádio dão nada');

console.log('4) estádios sorteados jogados pelo motor (bate-bola, partida e caos, 3x3 de bots)');
let partidas = 0;
const problemas = [];
for (const L of docs.slice(0, 70)) {
  const m = R.compila(L);
  try {
    const st = buildStadium(m), pr = st.phys.playerR, gx = Math.abs(st.gx[1]);
    if ([st.ext.x, st.ext.y, ...st.gx].some(v => !Number.isFinite(v)) || st.segs.some(s => ![s.x1, s.y1, s.x2, s.y2].every(Number.isFinite))) problemas.push([L.id, 'geometria com NaN']);
    if (m.circle + 2 * pr + 6 > gx) problemas.push([L.id, 'o círculo do meio passa da linha do gol', m.circle, gx]);
    if (st.phys.ballBounce * st.phys.wallBounce > 1.0001) problemas.push([L.id, 'a parede acelera a bola']);
    for (const modo of ['free', 'match', 'chaos']) {
      const T = new TopMatch({ mode: modo, map: m, teams: [3, 3], humans: [], diff: 'dificil', time: 60, goals: 0, run: 'sempre' });
      if (modo === 'chaos') { const p = T.players[0]; p.power = 'golzao'; T.usePower(p); }
      for (let t = 0; t < 480; t++) T.update();
      if (T.balls.some(b => !Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.vx))) problemas.push([L.id, modo, 'bola com NaN']);
      if (T.players.some(p => !Number.isFinite(p.disc.x) || !Number.isFinite(p.disc.y))) problemas.push([L.id, modo, 'jogador com NaN']);
      if (T.goalHalf.some(g => g > (m.golzaoMax || 1e9) + 0.5 || g > m.H)) problemas.push([L.id, modo, 'o Golzão não cabe', T.goalHalf, m.golzaoMax, m.H]);
      partidas++;
    }
  } catch (e) { problemas.push([L.id, 'erro', String(e && e.message).slice(0, 120)]); }
}
confere(problemas.length === 0, partidas + ' partidas em 70 estádios sorteados: nada vira NaN, o círculo do meio e o Golzão cabem e a parede não acelera a bola', problemas.slice(0, 6));

console.log('\nv97 · a oficina de estádios no motor do Rachão: ' + ok + ' ok, ' + falhou + ' falharam (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
process.exit(falhou ? 1 : 0);
