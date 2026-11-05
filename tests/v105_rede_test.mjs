// RACHA v105 · o jogo de corpo, a virada na hora e o online sem a bola atravessando (sem navegador): o núcleo das salas
// (server/partida/nucleo.js) e o simulador da rede (tests/v102/sim.mjs: o motor das salas de verdade + uma cópia fiel do
// aparelho, ligados por um 4G de mentira).
//   1. o jogo de corpo: duas tampinhas correndo uma contra a outra com um desvio pequeno se seguram (antes: passavam uma pela
//      outra em ~0,4 s); empurrando quem está parado quase de frente, você leva ele; bem de lado, você ainda passa; o perfil
//      da v91 continua escorregando (a v91 exata);
//   2. a virada na hora: a meia-volta e a curva de 90° valem no passo seguinte (antes: um passo parado e ~80 ms escorregando);
//   3. o online: a bola desenhada dentro de uma tampinha desenhada (o que parecia a tampinha atravessando a bola) cai a menos
//      de um quarto, sem piorar o resto (as correções, o erro contra o servidor);
//   4. os 60 quadros por segundo das salas: as correções da sua tampinha menores que com 30.
//   node tests/v105_rede_test.mjs
import { createRequire } from 'module';
import { media } from './v102/sim.mjs';
const require = createRequire(import.meta.url);
const N = require('../server/partida/nucleo.js');
const U = N.U, t0 = Date.now();
let ok = 0, falhas = 0;
function confere(c, txt, info) { if (c) { ok++; console.log('  OK      ' + txt); } else { falhas++; console.log('  FALHOU  ' + txt + (info !== undefined ? '  ·  ' + JSON.stringify(info) : '')); } }

function mundo(perfil) {
  const C = N.resolve(perfil), G = N.novoCampo(2), B = N.novaBola(C, G.CX, G.CY - U(25));
  const jog = [0, 1].map(i => ({ x: G.CX, y: G.CY, vx: 0, vy: 0, r: C.R_JOG, m: C.MASSA_JOG, mx: 0, my: 0, time: i }));
  return { C, G, M: { B, G, jog, estado: 'jogo', jogo: 'futebol' } };
}
function frente(perfil, desvioU) {                  // de 3 u de distância, os dois correndo um contra o outro
  const { C, G, M } = mundo(perfil), [a, b] = M.jog, r = C.R_JOG;
  a.x = G.CX - r - U(1.5); b.x = G.CX + r + U(1.5); b.y = G.CY + U(desvioU);
  let passou = null;
  for (let t = 0; t < 120; t++) { a.mx = 1; a.my = 0; b.mx = -1; b.my = 0; N.passo(M, C, null); if (passou === null && a.x > b.x) passou = t / 60; }
  return passou;
}
function empurra(perfil, th) {                      // A encostado em B (parado), empurrando a th° da linha dos centros, 1 s
  const { C, G, M } = mundo(perfil), [a, b] = M.jog, r = C.R_JOG, k = th * Math.PI / 180;
  a.x = G.CX - 2 * r - 0.3; a.y = G.CY; b.x = G.CX; b.y = G.CY;
  const b0 = [b.x, b.y], a0 = Math.atan2(a.y - b.y, a.x - b.x);
  for (let t = 0; t < 60; t++) { a.mx = Math.cos(k); a.my = Math.sin(k); b.mx = b.my = 0; N.passo(M, C, null); }
  let gira = (Math.atan2(a.y - b.y, a.x - b.x) - a0) * 180 / Math.PI; while (gira > 180) gira -= 360; while (gira < -180) gira += 360;
  return { gira: Math.abs(gira), levou: Math.hypot(b.x - b0[0], b.y - b0[1]) / U(1) };
}
console.log('1) o jogo de corpo (o núcleo das salas, o mesmo do servidor e da previsão)');
{
  const V92 = N.PERFIL_V92, V91 = N.PERFIL_V91;
  const p92 = [0.1, 0.5, 1.5].map(d => frente(V92, d)), p91 = [0.1, 0.5, 1.5].map(d => frente(V91, d));
  confere(p92.every(x => x === null) && p91.every(x => x !== null && x < 0.7),
    'correndo um contra o outro (desvio de 0,1, 0,5 e 1,5 u): agora se seguram por 2 s; no perfil da v91 passavam um pelo outro em ' + p91.map(x => x && x.toFixed(2)).join(', ') + ' s', { p92, p91 });
  const e15 = empurra(V92, 15), e60 = empurra(V92, 60), v15 = empurra(V91, 15);
  confere(e15.gira < 5 && e15.levou > 5 && v15.gira > 100,
    'empurrando quem está parado a 15° da linha dos centros: você leva ele (' + e15.levou.toFixed(1) + ' u em 1 s, sem escorregar); na v91 escorregava ' + v15.gira.toFixed(0) + '° em volta dele', { e15, v15 });
  confere(e60.gira > 60, 'bem de lado (60°) você ainda passa por ele (escorrega ' + e60.gira.toFixed(0) + '° em volta)', e60);
  // a bola e o chute não mudam: um chute de frente com a bola parada sai igual nos dois perfis
  const chuta = perfil => { const { C, G, M } = mundo(perfil), q = M.jog[0]; M.jog[1].x = G.CX + U(30); M.B.x = q.x + C.R_JOG + C.R_BOLA + U(0.2); M.B.y = q.y; N.chute(M, C, q, C.FORCA_POWER); for (let t = 0; t < 30; t++) N.passo(M, C, null); return [M.B.x, M.B.y]; };
  const c92 = chuta(Object.assign({}, V91, { forcaChute: V92.forcaChute })), c105 = chuta(V92);
  confere(Math.abs(c92[0] - c105[0]) < 1e-6 && Math.abs(c92[1] - c105[1]) < 1e-6, 'a bola e o chute são os mesmos (um chute sozinho dá no mesmo lugar com e sem o jogo de corpo)', [c92, c105]);
}

console.log('\n2) a virada na hora (o analógico sem atraso)');
{
  const vira = (perfil, de, para) => {
    const { C, G, M } = mundo(perfil), q = M.jog[0]; M.jog[1].x = G.CX + U(40);
    for (let t = 0; t < 20; t++) { q.mx = de[0]; q.my = de[1]; N.passo(M, C, null); }
    q.mx = para[0]; q.my = para[1]; N.passo(M, C, null);
    return (q.vx * para[0] + q.vy * para[1]) / C.VEL_JOG;   // (a parte da corrida no sentido novo, no primeiro passo depois da virada)
  };
  const m92 = vira(N.PERFIL_V92, [1, 0], [-1, 0]), m91 = vira(N.PERFIL_V91, [1, 0], [-1, 0]);
  const c92 = vira(N.PERFIL_V92, [1, 0], [0, 1]), c91 = vira(N.PERFIL_V91, [1, 0], [0, 1]);
  confere(m92 > 0.99 && Math.abs(m91) < 0.01, 'a meia-volta vale no passo seguinte (a corrida toda no sentido novo; na v91 a tampinha parava um passo: ' + m91.toFixed(2) + ')', [m92, m91]);
  confere(c92 > 0.99 && c91 < 0.75, 'a curva de 90° também (na v91 só ' + Math.round(c91 * 100) + '% no primeiro passo, o resto escorregando para o lado de antes)', [c92, c91]);
  confere(N.resolve(N.PERFIL_V92).DIRECOES === 64 && N.resolve(N.PERFIL_V91).DIRECOES === 32, 'o analógico com 64 direções (eram 32: os degraus de 11,25° viram 5,6°)');
}

console.log('\n3) o online: a bola desenhada não atravessa as tampinhas (o simulador da rede, 6 sementes × 40 s)');
const SEM = [1, 2, 3, 4, 5, 6];
for (const rede of ['4g', '4g_ruim']) {
  const a = media({ rede, dur: 40000, cliente: 'v102', quadros: 60 }, SEM), b = media({ rede, dur: 40000, cliente: 'v105' }, SEM);
  console.log('  ' + rede + ' sem o contato: ' + JSON.stringify(a.sobre) + '\n  ' + rede + ' com o contato: ' + JSON.stringify(b.sobre));
  console.log('    a sua: correção p95 ' + a.eu.correcao_p95_px + ' → ' + b.eu.correcao_p95_px + ' px · o outro: erro ' + a.outro.erro_med_px + ' → ' + b.outro.erro_med_px + ' px · a bola: erro ' + a.bola.erro_med_px + ' → ' + b.bola.erro_med_px + ' px, trancos ' + a.bola.d2_rms_px + ' → ' + b.bola.d2_rms_px);
  confere(b.sobre.bola_dentro_pct <= a.sobre.bola_dentro_pct / 4 && b.sobre.bola_dentro_pct < 1.5,
    rede + ': a bola desenhada dentro de uma tampinha (mais de 3 px) em ' + b.sobre.bola_dentro_pct + '% dos quadros (sem o contato: ' + a.sobre.bola_dentro_pct + '%)', [a.sobre, b.sobre]);
  confere(b.sobre.bola_max_px < a.sobre.bola_max_px * 0.7, rede + ': e a mais funda ' + b.sobre.bola_max_px + ' px (era ' + a.sobre.bola_max_px + ' px; a bola tem 19)', [a.sobre.bola_max_px, b.sobre.bola_max_px]);
  confere(b.eu.correcao_p95_px <= a.eu.correcao_p95_px * 1.3 + 1 && b.outro.erro_med_px <= a.outro.erro_med_px * 1.2 + 2 && b.bola.erro_med_px <= a.bola.erro_med_px * 1.3 + 2 && b.bola.d2_rms_px <= a.bola.d2_rms_px * 1.3 + 0.2,
    rede + ': o resto não piora (as correções da sua tampinha, o erro do outro e da bola contra o servidor, os trancos da bola)', [a.eu.correcao_p95_px, b.eu.correcao_p95_px, a.outro.erro_med_px, b.outro.erro_med_px, a.bola.erro_med_px, b.bola.erro_med_px, a.bola.d2_rms_px, b.bola.d2_rms_px]);
}

console.log('\n4) as salas a 60 quadros por segundo (eram 30)');
{
  const a = media({ rede: '4g_ruim', dur: 40000, cliente: 'v105', quadros: 30 }, SEM), b = media({ rede: '4g_ruim', dur: 40000, cliente: 'v105' }, SEM);
  confere(b.eu.correcao_p95_px < a.eu.correcao_p95_px * 0.75, '4G ruim: a correção da sua tampinha (p95) ' + a.eu.correcao_p95_px + ' → ' + b.eu.correcao_p95_px + ' px', [a.eu, b.eu]);
  confere(b.bola.erro_med_px <= a.bola.erro_med_px + 1, '4G ruim: o erro da bola contra o servidor ' + a.bola.erro_med_px + ' → ' + b.bola.erro_med_px + ' px', [a.bola, b.bola]);
  const T = require('../server/turma.js'), Tq = T.Turma || T;
  confere(typeof (Tq.prototype && Tq.prototype.quadrosDe) === 'function', 'o servidor tem a escolha dos quadros da sala (quadrosDe)');
  if (Tq.prototype && Tq.prototype.quadrosDe) {
    const qd = (r, env) => { const v = process.env.RACHA_QUADROS; if (env) process.env.RACHA_QUADROS = env; else delete process.env.RACHA_QUADROS; try { return Tq.prototype.quadrosDe.call({}, r); } finally { if (v === undefined) delete process.env.RACHA_QUADROS; else process.env.RACHA_QUADROS = v; } };
    confere(qd({}) === 60 && qd({ quadros: 30 }) === 30 && qd({ custom: {} }) === 30 && qd({ rachao: {} }) === 30 && qd({}, '30') === 30,
      'as salas do RACHA mandam 60 por segundo; as do mapa e as do Rachão seguem com 30; o painel de testes e o RACHA_QUADROS=30 ainda escolhem', [qd({}), qd({ quadros: 30 }), qd({ custom: {} }), qd({ rachao: {} }), qd({}, '30')]);
  }
}
console.log('\n5) a página de antes não entra nas salas do RACHA (a física mudou: ela preveria com a física velha)');
{
  const T = require('../server/turma.js'), Tq = T.Turma || T;
  const fonte = require('fs').readFileSync(require.resolve('../server/turma.js'), 'utf8');
  confere(/c\.velho105 = c\.v93 && m\.v105 !== 1/.test(fonte) && (fonte.match(/AVISO_V105, 'jogo_velho'/g) || []).length >= 4,
    'o servidor marca a página do jogo sem o v105 (só a que manda o v93: os clientes de teste e os de fora não) e recusa criar, entrar, voltar e a fila');
  const jogo = require('fs').readFileSync(require.resolve('../app/public/game/racha.html'), 'utf8');
  confere(/o\.v105 = 1/.test(jogo), 'o jogo novo manda o v105 no hello');
}
console.log('\n6) as partes da v105 no jogo: nenhuma função com o nome de outra (a de baixo apagava a de cima sem erro nenhum)');
{
  const fs = require('fs'), path = require('path'), dir = path.join(path.dirname(require.resolve('../tools/aplicar_rua.py')), 'v105');
  const jogo = fs.readFileSync(require.resolve('../app/public/game/racha.html'), 'utf8');
  const nomes = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) for (const m of fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/^(?:async )?function ([A-Za-z0-9_$]+)\(/gm)) nomes.push([m[1], f]);
  const dup = nomes.filter(([n]) => (jogo.match(new RegExp('^(?:async )?function ' + n.replace(/\$/g, '\\$') + '\\(', 'gm')) || []).length !== 1);
  confere(nomes.length > 20 && !dup.length, 'as ' + nomes.length + ' funções das partes da v105 (o corpo, a rede, o chat no lobby e os cosméticos) aparecem uma vez só no jogo', dup);
}
console.log('\nv105 · o jogo de corpo, a virada na hora e o online: ' + ok + ' ok, ' + falhas + ' falharam em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(falhas ? 1 : 0);
