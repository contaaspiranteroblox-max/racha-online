// RACHA v106 · O JOGO DE CORPO NO MEIO-TERMO (sem navegador): o núcleo das salas (server/partida/nucleo.js — o mesmo do
// servidor, da previsão do online e da partida contra os bots). O pedido: "antes o jogo de corpo deslizava muito, agora gruda
// muito: tem que ser o meio-termo, porque senão os players ficam fechando o caminho — tem que ser uma boa disputa de bola".
// O atrito tampinha × tampinha foi de 0,5 (v105) para 0,2. Confere, contra os dois de antes (a v104 sem atrito e a v105):
//   1. QUEM FECHA O CAMINHO: alguém de frente para você (empurrando de volta) só segura quando você vem quase reto — até ~25° da
//      linha dos centros (v105: até ~52°; v104: ~2,5°); a 30° e a 45° você passa por ele;
//   2. QUEM ESTÁ PARADO: empurrando de lado (15°) você escorrega em volta dele (na v105 grudava: 0°) e ainda leva ele um pouco
//      junto (na v104 quase nada); bem de lado (45°) você passa quase como na v104;
//   3. O EMPURRA-EMPURRA: correndo um contra o outro quase reto (desvio 0,1 u) os dois se seguram, como na v105; com um desvio
//      maior (1 u), um passa pelo outro, mais devagar que na v104;
//   4. a bola, o chute e a virada não mudam (só o atrito).
//   node tests/v106_corpo_test.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const N = require('../server/partida/nucleo.js');
const U = N.U, t0 = Date.now();
let ok = 0, falhas = 0;
function confere(c, txt, info) { if (c) { ok++; console.log('  OK      ' + txt); } else { falhas++; console.log('  FALHOU  ' + txt + (info !== undefined ? '  ·  ' + JSON.stringify(info) : '')); } }
const P106 = N.PERFIL_V92, P105 = Object.assign({}, N.PERFIL_V92, { atritoJogJog: 0.5 }), P104 = Object.assign({}, N.PERFIL_V92, { atritoJogJog: 0 });

function mundo(perfil) {
  const C = N.resolve(perfil), G = N.novoCampo(2), B = N.novaBola(C, G.CX, G.CY - U(25));
  const jog = [0, 1].map(i => ({ x: G.CX, y: G.CY, vx: 0, vy: 0, r: C.R_JOG, m: C.MASSA_JOG, mx: 0, my: 0, time: i }));
  return { C, G, M: { B, G, jog, estado: 'jogo', jogo: 'futebol' } };
}
// A encostado em B, correndo a th° da linha dos centros por 1 s; B parado ou de frente para A (empurrando de volta): quantos graus A
// dá em volta de B e quanto B andou
function cena(perfil, th, segura) {
  const { C, G, M } = mundo(perfil), [a, b] = M.jog, r = C.R_JOG, k = th * Math.PI / 180;
  a.x = G.CX - 2 * r - 0.3; a.y = G.CY; b.x = G.CX; b.y = G.CY;
  const b0 = [b.x, b.y], a0 = Math.atan2(a.y - b.y, a.x - b.x);
  for (let t = 0; t < 60; t++) {
    a.mx = Math.cos(k); a.my = Math.sin(k);
    if (segura) { const dx = a.x - b.x, dy = a.y - b.y, l = Math.hypot(dx, dy) || 1; b.mx = dx / l; b.my = dy / l; } else { b.mx = b.my = 0; }
    N.passo(M, C, null);
  }
  let g = (Math.atan2(a.y - b.y, a.x - b.x) - a0) * 180 / Math.PI; while (g > 180) g -= 360; while (g < -180) g += 360;
  return { gira: Math.abs(g), levou: Math.hypot(b.x - b0[0], b.y - b0[1]) / U(1) };
}
const fecha = perfil => { let ate = 0; for (let th = 0; th <= 60; th += 2.5) { if (cena(perfil, th, true).gira < 10) ate = th; else break; } return ate; };
function frente(perfil, d) {                       // correndo um contra o outro com o desvio d (em u): quando um passa pelo outro
  const { C, G, M } = mundo(perfil), [a, b] = M.jog, r = C.R_JOG;
  a.x = G.CX - r; b.x = G.CX + r + 0.5; a.y = G.CY; b.y = G.CY + U(d);
  for (let t = 0; t < 120; t++) { a.mx = 1; a.my = 0; b.mx = -1; b.my = 0; N.passo(M, C, null); if (a.x > b.x) return t / 60; }
  return null;
}

console.log('1) quem fica de frente para você fecha o caminho só quando você vem quase reto');
{
  const f = [P104, P105, P106].map(fecha);
  confere(N.PERFIL_V92.atritoJogJog === 0.2, 'o atrito tampinha × tampinha do padrão é 0,2 (era 0,5 na v105)', N.PERFIL_V92.atritoJogJog);
  confere(f[2] >= 15 && f[2] <= 30 && f[1] >= 45 && f[0] <= 5,
    'fecha o caminho até ' + f[2] + '° (v105: até ' + f[1] + '°; v104: ' + f[0] + '°)', f);
  const s30 = cena(P106, 30, true), s45 = cena(P106, 45, true), v30 = cena(P105, 30, true), v45 = cena(P105, 45, true);
  confere(s30.gira > 60 && s45.gira > 60 && v30.gira < 10 && v45.gira < 10,
    'a 30° e a 45° você passa por quem segura (' + s30.gira.toFixed(0) + '° e ' + s45.gira.toFixed(0) + '° em volta dele em 1 s; na v105 ficava preso: ' + v30.gira.toFixed(0) + '° e ' + v45.gira.toFixed(0) + '°)', { s30, s45, v30, v45 });
}
console.log('\n2) quem está parado: você escorrega em volta e ainda leva ele um pouco');
{
  const e = [P104, P105, P106].map(p => cena(p, 15, false)), l = [P104, P105, P106].map(p => cena(p, 45, false));
  confere(e[2].gira > 60 && e[2].gira < e[0].gira - 10 && e[1].gira < 5,
    'empurrando a 15°: você escorrega ' + e[2].gira.toFixed(0) + '° em volta dele em 1 s (v104: ' + e[0].gira.toFixed(0) + '°; v105 grudava: ' + e[1].gira.toFixed(0) + '°)', e);
  confere(e[2].levou > e[0].levou + 1 && e[2].levou < e[1].levou,
    'e leva ele junto um pouco: ' + e[2].levou.toFixed(1) + ' u (v104: ' + e[0].levou.toFixed(1) + ' u; v105: ' + e[1].levou.toFixed(1) + ' u)', e);
  confere(l[2].gira > 0.9 * l[0].gira, 'bem de lado (45°) você passa quase como na v104 (' + l[2].gira.toFixed(0) + '° × ' + l[0].gira.toFixed(0) + '°)', l);
}
console.log('\n3) o empurra-empurra correndo um contra o outro');
{
  const q = [P104, P105, P106].map(p => frente(p, 0.1)), d = [P104, P105, P106].map(p => frente(p, 1));
  confere(q[2] === null && q[1] === null && q[0] !== null, 'quase reto (desvio 0,1 u): os dois se seguram por 2 s, como na v105 (na v104 passavam um pelo outro em ' + (q[0] || 0).toFixed(2) + ' s)', q);
  confere(d[2] !== null && d[0] !== null && d[2] > d[0] && d[1] === null,
    'com 1 u de desvio, um passa pelo outro em ' + (d[2] || 0).toFixed(2) + ' s — mais devagar que na v104 (' + (d[0] || 0).toFixed(2) + ' s); na v105 ficavam presos', d);
}
console.log('\n4) a bola, o chute e a virada não mudam');
{
  const chuta = perfil => { const { C, G, M } = mundo(perfil), q = M.jog[0]; M.jog[1].x = G.CX + U(30); M.B.x = q.x + C.R_JOG + C.R_BOLA + U(0.2); M.B.y = q.y; N.chute(M, C, q, C.FORCA_POWER); for (let t = 0; t < 30; t++) N.passo(M, C, null); return [M.B.x, M.B.y]; };
  const a = chuta(P106), b = chuta(P105);
  const d = Object.keys(N.PERFIL_V92).filter(k => N.PERFIL_V92[k] !== P105[k]);
  confere(Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9 && JSON.stringify(d) === '["atritoJogJog"]', 'um chute sozinho dá no mesmo lugar e só o atrito mudou no perfil', { a, b, d });
}
console.log('\nv106 · o jogo de corpo no meio-termo: ' + ok + ' ok, ' + falhas + ' falharam em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(falhas ? 1 : 0);
