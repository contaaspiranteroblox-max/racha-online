// RACHA v85 · a física FR-85: o núcleo (server/partida/nucleo_fisica.js) e as metas de jogo da especificação
// (tools/v85/FISICA_RACHA.md). Roda com Node 18+: node tests/v85_fisica_test.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const N = require('../server/partida/nucleo_fisica.js');
const F = require('../server/partida/fisica.js');

let ok = 0, falhou = 0;
function confere(cond, txt, extra) {
  if (cond) { ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra) : '')); }
}
const U = N.U, DT = N.DT, u = v => v / U(1), perto = (a, b, tol) => Math.abs(a - b) <= tol;

console.log('1) o núcleo é a FR-85 e o servidor usa o mesmo');
confere(N.VERSAO === 'FR-85' && F.N === N, 'VERSAO FR-85; server/partida/fisica.js usa o mesmo núcleo');
confere(F.VEL_JOG === N.TAMPINHA.vmax && F.FORCA_POWER === N.CHUTE.forte && F.R_BOLA === N.BOLA.raio && F.ALCANCE_CHUTE === N.ALCANCE,
  'os nomes do servidor apontam para os números do núcleo');
// (que nenhum número da física antiga sobrou é conferido pela varredura da auditoria, fora do projeto)
confere(N.DIRECOES === 256 && N.TAMPINHA.massa === 1, 'a FR-85 é a da especificação (256 direções, massa de referência 1)');

console.log('2) o analógico: 256 direções, a força do dedo não muda a velocidade');
{
  let okDir = true, idem = true;
  for (let i = 0; i < 2000; i++) {
    const a = Math.random() * 2 * Math.PI, r = 0.05 + Math.random(), d = N.direcao(Math.cos(a) * r, Math.sin(a) * r);
    const ang = Math.atan2(d.my, d.mx), k = ang / (2 * Math.PI / 256);
    if (Math.abs(k - Math.round(k)) > 1e-9 || !perto(Math.hypot(d.mx, d.my), 1, 1e-12)) okDir = false;
    const d2 = N.direcao(d.mx, d.my); if (!perto(d2.mx, d.mx, 1e-12) || !perto(d2.my, d.my, 1e-12)) idem = false;
  }
  confere(okDir, 'toda direção cai num múltiplo de 1/256 de volta, com módulo 1');
  confere(idem, 'quantizar duas vezes dá o mesmo (o aparelho e o servidor concordam)');
  const z = N.direcao(0, 0), nan = N.direcao(NaN, 1);
  confere(z.mx === 0 && z.my === 0 && nan.mx === 0 && nan.my === 0, 'parado (ou valor inválido) não anda');
}

console.log('3) a tampinha: arrancada, freio e o teto da corrida (M2, M6)');
{
  const q = { vx: 0, vy: 0 }; let t = 0;
  while (Math.hypot(q.vx, q.vy) < 0.999 * N.TAMPINHA.vmax && t < 1) { N.anda(q, 1, 0, N.TAMPINHA.vmax, DT); t += DT; }
  confere(t <= N.TAMPINHA.arrancada + DT + 1e-9, 'chega na corrida em ~0,06 s', { t });
  t = 0; while (Math.hypot(q.vx, q.vy) > 0 && t < 1) { N.anda(q, 0, 0, N.TAMPINHA.vmax, DT); t += DT; }
  confere(t <= N.TAMPINHA.freio + DT + 1e-9, 'para em ~0,045 s com o analógico solto', { t });
  q.vx = 3 * N.TAMPINHA.vmax; q.vy = 0; N.anda(q, 0, 1, N.TAMPINHA.vmax, DT);
  confere(Math.hypot(q.vx, q.vy) <= N.TAMPINHA.vmax + 1e-9, 'empurrão de batida não vira corrida: nunca acima da corrida depois do movimento');
}

console.log('4) o chute: alcance, velocidade de saída, embalo e raspão');
{
  const q = { x: 0, y: 0, vx: 0, vy: 0 }, b = { x: N.ALCANCE + 0.5, y: 0, vx: 0, vy: 0 };
  confere(N.chuta(q, b, N.CHUTE.forte) === false && b.vx === 0, 'longe do alcance o chute não pega e a bola nem mexe');
  b.x = N.ALCANCE - 1; b.vx = U(-5); b.vy = U(10);
  q.vx = N.TAMPINHA.vmax;
  N.chuta(q, b, N.CHUTE.passe);
  confere(perto(b.vx, N.CHUTE.passe + N.CHUTE.embalo * N.TAMPINHA.vmax, 1e-9), 'a bola sai com o passe + 35% da corrida na direção do chute (não soma o que tinha)', { vx: u(b.vx) });
  confere(perto(b.vy, N.CHUTE.raspao * U(10), 1e-9), 'e guarda 20% do que tinha de lado', { vy: u(b.vy) });
}

console.log('5) a bola no piso: meia-vida, teto e parada');
{
  const b = { vx: U(30), vy: 0 };
  for (let i = 0; i < Math.round(N.MEIA_VIDA.quadra * 60); i++) N.amortece(b, N.fatorPiso(N.MEIA_VIDA.quadra), 1);
  confere(perto(b.vx / U(30), 0.5, 0.01), 'na quadra, em 0,95 s a bola fica com metade da velocidade', { razao: b.vx / U(30) });
  const c = { vx: U(80), vy: 0 }; N.amortece(c, 1, 1);
  confere(perto(c.vx, N.BOLA.teto, 1e-9), 'acima do teto (48 u/s) ela é cortada');
  const d = { vx: U(0.05), vy: 0 }; N.amortece(d, 1, 1);
  confere(d.vx === 0, 'abaixo de 0,08 u/s ela para');
}

console.log('6) as batidas: restituição, quantidade de movimento e atrito');
{
  const o = { x: 0, y: 0, vx: U(-20), vy: U(4), r: 1 };
  N.bate(o, 1, 0, N.PAR.bolaLinha.e, 0);
  confere(perto(o.vx, U(20) * N.PAR.bolaLinha.e, 1e-9) && perto(o.vy, U(4), 1e-9), 'na linha a bola volta com 55% da velocidade de frente');
  const a = { x: 0, y: 0, vx: U(10), vy: 0, r: N.TAMPINHA.raio, m: N.TAMPINHA.massa }, b = { x: N.TAMPINHA.raio + N.BOLA.raio - 1, y: 0, vx: 0, vy: 0, r: N.BOLA.raio, m: N.BOLA.massa };
  const p0 = a.m * a.vx + b.m * b.vx, rel0 = b.vx - a.vx;
  N.batemCorpos(a, b, N.PAR.bolaTampinha.e, 0);
  const p1 = a.m * a.vx + b.m * b.vx, rel1 = b.vx - a.vx;
  confere(perto(p0, p1, 1e-9), 'tampinha × bola: a quantidade de movimento se conserva');
  confere(perto(rel1, -N.PAR.bolaTampinha.e * rel0, 1e-9), 'e a velocidade relativa de frente volta com e = 0,12', { rel0, rel1 });
  const s = { x: 0, y: 0, vx: U(-10), vy: U(10), r: 1 };
  N.bate(s, 1, 0, 0, N.PAR.bolaRede.mu);
  confere(Math.abs(s.vy) < U(10) && s.vx === 0, 'o atrito freia o deslize de lado (sem giro)');
}

console.log('7) o gatilho: o último apertado vale, um aperto = um chute');
{
  const g = N.novoGatilho(), P1 = N.GATILHO.PASSE, C2 = N.GATILHO.CHUTE;
  const seq = [[0, 0], [P1, P1], [P1, P1], [P1 | C2, C2], [P1 | C2, C2], [P1, 0], [0, 0], [C2 | P1, C2], [0, 0], [P1, P1]];
  let tudo = true; const visto = [];
  for (const [bits, esperado] of seq) { const a = N.gatilho(g, bits); visto.push(a); if (a !== esperado) tudo = false; }
  confere(tudo, 'apertar arma; o outro botão por cima troca; soltar o armado desarma; os dois juntos = CHUTE', visto);
  const h = N.novoGatilho(); N.gatilho(h, P1); N.gastaGatilho(h);
  const segue = N.gatilho(h, P1), novo = (N.gatilho(h, 0), N.gatilho(h, P1));
  confere(segue === 0 && novo === P1, 'depois do chute, segurar não chuta de novo; soltar e apertar arma outra vez');
}

console.log('8) as quadras (regra própria)');
{
  const dims = [[52, 36], [64, 44], [78, 56], [92, 68]];
  let regra = true;
  for (let n = 1; n <= 4; n++) {
    const q = N.quadra(n), [L, W] = dims[n - 1], m = q.marcas;
    if (q.bola[0] !== L || q.bola[1] !== W || q.jog[0] !== L + 12 || q.jog[1] !== W + 12) regra = false;
    if (!perto(q.gol[1], 0.24 * W + 3.8, 0.006) || q.gol[0] !== 4.2) regra = false;
    if (!(m.area[1] < W && m.pequena[1] < m.area[1] && m.pequena[0] < m.area[0] && m.penalti < m.area[0] && m.meiaLua[0] + m.meiaLua[1] > m.area[0])) regra = false;
    if (!(m.saida > u(N.TAMPINHA.raio) * 2)) regra = false;
  }
  confere(regra, 'os 4 tamanhos seguem a regra (linhas, área da tampinha, boca, marcas por dentro, meia-lua para fora da área)');
}

console.log('9) as metas de jogo (M1, M3, M4, M5) no mesmo integrador do jogo');
{
  const atravessa = L => { const q = { vx: 0, vy: 0, x: 0 }; let t = 0; while (q.x < U(L) && t < 30) { N.anda(q, 1, 0, N.TAMPINHA.vmax, DT); q.x += q.vx * DT; t += DT; } return t; };
  const t1 = atravessa(52), t4 = atravessa(92);
  confere(t1 >= 3.7 && t1 <= 4.3 && t4 >= 6.6 && t4 <= 7.6, 'M1: atravessa o 1v1 em ~4 s e o 4v4 em ~7 s', { t1: +t1.toFixed(2), t4: +t4.toFixed(2) });
  const anda = v0 => { const b = { vx: v0, vy: 0, x: 0 }; let t = 0; while (b.vx > 0 && t < 30) { N.amortece(b, N.fatorPiso(N.MEIA_VIDA.quadra), 1); b.x += b.vx * DT; t += DT; } return u(b.x); };
  const dp = anda(N.CHUTE.passe), dc = anda(N.CHUTE.forte);
  confere(dp / 52 >= 0.6 && dp / 52 <= 0.8 && dp / 64 >= 0.45 && dp / 64 <= 0.65, 'M3: o passe anda ~70% do 1v1 e ~55% do 2v2', { passe_u: +dp.toFixed(1) });
  confere(dc / 52 >= 1.0, 'M4: o chute cruza a quadra do 1v1', { chute_u: +dc.toFixed(1) });
  // M5: condução — 3 s correndo reto atrás da bola
  const P = { x: 0, y: 0, vx: 0, vy: 0, r: N.TAMPINHA.raio, m: N.TAMPINHA.massa }, B = { x: N.TAMPINHA.raio + N.BOLA.raio + 2, y: 0, vx: 0, vy: 0, r: N.BOLA.raio, m: N.BOLA.massa };
  let gapMax = 0; const x0 = B.x;
  for (let tk = 0; tk < 180; tk++) {
    N.anda(P, 1, 0, N.TAMPINHA.vmax, DT); N.amortece(B, N.fatorPiso(N.MEIA_VIDA.quadra), 1);
    const n = N.subpassos(Math.max(Math.hypot(B.vx, B.vy), Math.hypot(B.vx - P.vx, B.vy - P.vy)), DT), s = DT / n;
    for (let i = 0; i < n; i++) { P.x += P.vx * s; B.x += B.vx * s; N.batemCorpos(P, B, N.PAR.bolaTampinha.e, N.PAR.bolaTampinha.mu); N.batemCorpos(P, B, N.PAR.bolaTampinha.e, N.PAR.bolaTampinha.mu); }
    if (tk > 30) gapMax = Math.max(gapMax, Math.hypot(B.x - P.x, B.y - P.y) - P.r - B.r);
  }
  const vb = (B.x - x0) / 3;
  confere(gapMax < U(0.5) && vb > 0.9 * N.TAMPINHA.vmax, 'M5: a bola vai grudada no pé (folga < 0,5 u) na velocidade da corrida', { gapMax_u: +u(gapMax).toFixed(3), vbola_u: +u(vb).toFixed(2) });
}

console.log('10) a partida do servidor sobre o núcleo: nada de NaN, a bola não atravessa nada, o gol é da bola inteira');
{
  const sim = F.novaSimulacao(2), G = sim.campo, j = sim.jog[0];
  j.x = sim.bola.x - F.ALCANCE_CHUTE + 2; j.y = sim.bola.y + 3;
  F.chute(sim, 0, F.FORCA_POWER);
  let fin = true, dentro = true;
  for (let i = 0; i < 1200; i++) {
    F.entrada(sim, 1, Math.cos(i / 40), Math.sin(i / 30));
    F.passo(sim);
    const b = sim.bola;
    if (![b.x, b.y, b.vx, b.vy].every(Number.isFinite)) fin = false;
    if (b.y < G.LY0 - b.r - 1 || b.y > G.LY1 + b.r + 1 || b.x < G.LX0 - G.GOL_PROF - b.r - 1 || b.x > G.LX1 + G.GOL_PROF + b.r + 1) dentro = false;
  }
  confere(fin && dentro, '20 s de bola rolando e tampinha correndo: tudo finito e a bola dentro das linhas (ou no gol)');
  const s2 = F.novaSimulacao(1), G2 = s2.campo;
  s2.jog.forEach(q => { q.x = G2.CX; q.y = G2.LY0 + 40; });
  s2.bola.x = G2.LX1 - s2.bola.r - 2; s2.bola.y = G2.CY; s2.bola.vx = U(20); s2.bola.vy = 0;
  let gols = []; for (let i = 0; i < 30 && !gols.length; i++) gols = F.passo(s2);
  confere(gols.length === 1 && gols[0].lado === 1 && s2.bola.x > G2.LX1 + s2.bola.r - 1, 'o gol só vale com a bola inteira além da linha (lado direito)', { gols, x: s2.bola.x - G2.LX1 });
}

console.log('\nfísica FR-85 (v85): ' + ok + ' ok, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
