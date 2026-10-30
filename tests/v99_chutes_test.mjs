// RACHA v99 · OS CHUTES DO RACHÃO NAS SALAS PERSONALIZADAS (sem navegador).
// O pedido: "crie um modo com cavadinha e curva igual do Rachão que dê pra jogar nas salas personalizadas; o cara pode escolher
// sem nada, com cavadinha e curva, e super chute". Aqui:
//   1) o núcleo: as opções da sala (objeto ou letras), o estado de cada um no quadro, as medidas do Rachão na régua do RACHA;
//   2) a física no motor das salas: a cavadinha por cima de quem está na frente, a cabeçada, a curva para cada lado, o super
//      (a carga, o teto, o fogo, a espera pela bola, o PASSE e o CHUTE parados enquanto carrega), o travessão (a bola alta não
//      é gol) e a bola alta que não é toque de ninguém;
//   3) os comandos: os contadores dos toques (par e ímpar, o comando perdido, o descartado que passa adiante), os valores
//      estranhos, o silêncio da internet, a volta e a saída depois do gol;
//   4) os bots usam os três (partidas inteiras de bots, sem erro);
//   5) a previsão do aparelho (o código de verdade do jogo: tools/v92/rede.js, tools/v96/rede.js e tools/v99/chutes.js, num
//      vm) dá o mesmo que o servidor — a cavadinha, a curva, o super, o super que espera a bola, o toque duplo, a cabeçada e
//      o travessão — sem atraso e com 4 passos de atraso nos dois sentidos;
//   6) as salas SEM os chutes são as mesmas da v98, quadro por quadro (as impressões das partidas no motor da v98);
//   7) o servidor de verdade (WebSocket): o hello diz cr: 1; criar com os chutes; a página antiga não vê nem entra; o admin troca
//      os chutes; o COM CURVA e a ranqueada ficam sem; a partida leva os toques, o quadro tem a bola no alto e o estado de cada um.
// Rodar: node tests/v99_chutes_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import net from 'node:net';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = require(path.join(RAIZ, 'server', 'partida', 'nucleo.js'));
const { PartidaSala } = require(path.join(RAIZ, 'server', 'partida', 'sala.js'));
let ok = 0, falhou = 0;
const confere = (c, txt, extra) => { if (c) { ok++; console.log('  ok   ' + txt); } else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra).slice(0, 600) : '')); } return c; };
const t0 = Date.now();
const r1 = v => Math.round(v * 10) / 10;
const TODOS = { lob: true, curva: true, super: true };

/* ---------------------------------------------------------------- 1) o núcleo */
console.log('\n1) o núcleo: as opções, o estado no quadro e as medidas');
confere(N.crOpcoes(null) === null && N.crOpcoes({}) === null && N.crOpcoes({ lob: false, curva: false, super: false }) === null && N.crOpcoes('') === null,
  'nada ligado (ou nada) = null: só o chutar, como sempre');
confere(JSON.stringify(N.crOpcoes({ lob: true })) === '{"lob":true,"curva":false,"super":false}' && JSON.stringify(N.crOpcoes('cs')) === '{"lob":false,"curva":true,"super":true}' && JSON.stringify(N.crOpcoes('lcs')) === JSON.stringify(TODOS),
  'as opções por objeto ou por letras (l, c, s)');
confere(N.crOpcoes({ lob: 1, curva: 'sim', super: true }).lob === false && N.crOpcoes('xyz') === null && N.crOpcoes('lcsl') === null && N.crOpcoes([true]) === null && N.crOpcoes(7) === null && N.crOpcoes({ lob: true, __proto__: { super: true } }).super === false,
  'valor estranho não liga nada (só true de verdade; letra desconhecida, texto comprido, lista e número recusados)');
confere(['', 'l', 'c', 's', 'lc', 'ls', 'cs', 'lcs'].every(t => N.crLetras(N.crOpcoes(t)) === t), 'as oito combinações vão e voltam pelas letras');
{
  let todos = true;
  for (let i = 0; i < 400; i++) {
    const s = N.crNovo(); s.lob = i % 2 === 1; s.curva = (i % 3) - 1; s.segura = i % 5 === 0; s.cT = i % 64; s.espera = i % 16; s.pT = (i * 7) % 64;
    const o = N.crNovo(); N.crUnpack(o, N.crPack(s));
    if (o.lob !== s.lob || o.curva !== s.curva || o.segura !== s.segura || o.cT !== s.cT || o.espera !== s.espera || o.pT !== s.pT) todos = false;
  }
  const o = N.crNovo(); N.crUnpack(o, -5); N.crUnpack(o, 1.5); N.crUnpack(o, 'x');
  confere(todos && N.crPack(null) === 0 && !o.lob && o.curva === 0, 'o estado de cada um cabe num número do quadro (vai e volta igual; número estranho não muda nada)');
}
const C0 = N.resolve(N.PERFIL_V92), K = C0.R_JOG / 15;
confere(Math.abs(C0.CR.k - K) < 1e-9 && Math.abs(C0.CR.G - 0.24 * K * 3600) < 1e-6 && Math.abs(C0.CR.LOB_VZ - 4.2 * K * 60) < 1e-6 && Math.abs(C0.CR.TRAVESSAO - 30 * K) < 1e-9 && Math.abs(C0.CR.ALTURA_JOG - 17 * K) < 1e-9,
  'as medidas do Rachão na régua do RACHA (o jogador de 15 px de lá = a tampinha de ' + r1(C0.R_JOG) + ' px daqui)', { k: C0.CR.k, G: C0.CR.G });
{
  const tAr = 2 * C0.CR.LOB_VZ / C0.CR.G, hMax = C0.CR.LOB_VZ ** 2 / (2 * C0.CR.G);
  confere(Math.abs(tAr - 0.583) < 0.01 && Math.abs(hMax / C0.R_JOG - 2.45) < 0.03, 'a cavadinha fica ' + tAr.toFixed(2) + ' s no ar e sobe ' + (hMax / C0.R_JOG).toFixed(2) + ' tampinhas (como no Rachão)');
}

/* ---------------------------------------------------------------- 2) a física no motor das salas */
console.log('\n2) a física no motor das salas');
let AG = 1000;
const passa = (P, k) => { for (let i = 0; i < k; i++) { AG += 1000 / 60; P.passo(); } };
function sala(chutes, n, jog) {
  return new PartidaSala({ n: n || 1, jogo: 'futebol', map: 0, tempo: 0, jogadores: jog || [{ netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Beto' }], agora: () => AG, chutes });
}
function cmds() { let s = 0; return o => Object.assign({ seq: ++s, x: 0, y: 0, button: 1, k: 0, kc: 0, pc: 0, lb: 0, ce: 0, cd: 0, sx: 0, su: 0 }, o); }
function poeBola(P, x, y, z, vz) { Object.assign(P.B, { x, y, vx: 0, vy: 0, w: 0, z: z || 0, vz: vz || 0, sp: 0, teto: 0, fogo: 0 }); }
function cola(P, q, ux, uy) { const B = P.B, d = q.r + B.r + 1; q.x = B.x - ux * d; q.y = B.y - uy * d; q.vx = q.vy = 0; }
// (a) a cavadinha por cima do Beto parado
{
  const P = sala(TODOS), C = P.C, A = P.jog[0], Bt = P.jog[1], B = P.B, cmd = cmds();
  P.estado = 'jogo'; poeBola(P, P.G.CX - 100, P.G.CY); cola(P, A, 1, 0); Bt.x = B.x + 125; Bt.y = P.G.CY;
  P.entrada('A', cmd({})); passa(P, 1);
  P.entrada('A', cmd({ lb: 1 })); passa(P, 1);
  const armou = A.cr.lob;
  P.entrada('A', cmd({ lb: 1, pc: 1, button: 3 })); passa(P, 1);
  const z0 = B.vz, v0 = Math.hypot(B.vx, B.vy);
  let maxZ = 0, encostou = false, zPerto = Infinity, pouso = -1;
  for (let i = 0; i < 70; i++) {
    P.entrada('A', cmd({ lb: 1, pc: 1 })); P.entrada('B', { seq: i + 1, x: 0, y: 0, button: 1, k: 0 }); passa(P, 1);
    maxZ = Math.max(maxZ, B.z);
    const d = Math.hypot(B.x - Bt.x, B.y - Bt.y);
    if (d < Bt.r + B.r) { encostou = true; zPerto = Math.min(zPerto, B.z); }
    if (pouso < 0 && i > 3 && B.z === 0) pouso = i;
  }
  confere(armou && !A.cr.lob, 'um toque arma a cavadinha; o chute usa (e desarma)');
  confere(z0 > 0 && Math.abs(v0 - N.U(C.FORCA_POWER / B.m) * C.CR.LOB_FORCA * C.CR.FREIO_AR) < 0.5, 'a cavadinha sobe e vai para a frente com 70% da força do CHUTE', { vz: r1(z0), v: r1(v0) });
  confere(encostou && zPerto > C.CR.ALTURA_JOG && Math.abs(Bt.x - (P.G.CX - 100 + 125)) < 0.01 && B.x > Bt.x + 30, 'a bola passa por cima do Beto (alta no ponto em que estaria encostando nele) e cai do outro lado', { zPerto: r1(zPerto), beto: r1(Bt.x), bola: r1(B.x) });
  confere(maxZ > 2 * C.R_JOG && pouso > 20 && pouso < 50, 'sobe ' + r1(maxZ) + ' px (mais de duas tampinhas) e volta ao chão em ' + pouso + ' passos, com o quique', { maxZ, pouso });
}
// (b) a cabeçada: a bola no ar (acima da cabeça baixa, abaixo do alcance) vira cabeçada
{
  const P = sala(TODOS), C = P.C, A = P.jog[0], B = P.B, cmd = cmds();
  P.estado = 'jogo'; P.jog[1].x = P.G.CX + 400; poeBola(P, P.G.CX - 200, P.G.CY, (C.CR.CABECA_Z + C.CR.ALCANCE_Z) / 2, 0); cola(P, A, 1, 0);
  P.entrada('A', cmd({})); passa(P, 1);
  const zAntes = B.z;
  P.entrada('A', cmd({ pc: 1, button: 3 })); passa(P, 1);
  const v = Math.hypot(B.vx, B.vy), esperado = N.U(C.FORCA_POWER / B.m) * C.CR.CABECA_FORCA;
  confere(zAntes > C.CR.CABECA_Z && Math.abs(v / esperado - 1) < 0.01 && B.vz > 0, 'a bola no ar perto da tampinha sai de cabeça: 80% da força e um pouco para cima', { v: r1(v), esperado: r1(esperado), vz: r1(B.vz) });
  const P2 = sala(TODOS), A2 = P2.jog[0], c2 = cmds();
  P2.estado = 'jogo'; P2.jog[1].x = P2.G.CX + 400; poeBola(P2, P2.G.CX - 200, P2.G.CY, P2.C.CR.ALCANCE_Z + 8, 0); cola(P2, A2, 1, 0);
  P2.entrada('A', c2({})); passa(P2, 1); P2.entrada('A', c2({ pc: 1, button: 3 })); passa(P2, 1);
  confere(Math.hypot(P2.B.vx, P2.B.vy) < 1, 'acima do alcance ninguém chuta (a bola passa)');
}
// (c) a curva: esquerda e direita
for (const [lado, campo, sinal] of [['esquerda', 'ce', -1], ['direita', 'cd', 1]]) {
  const P = sala({ curva: true }), A = P.jog[0], B = P.B, cmd = cmds();
  P.estado = 'jogo'; P.jog[1].x = P.G.CX + 300; P.jog[1].y = P.G.LY0 + 30; poeBola(P, P.G.CX - 300, P.G.CY); cola(P, A, 1, 0);
  P.entrada('A', cmd({})); passa(P, 1);
  P.entrada('A', cmd({ [campo]: 1 })); passa(P, 1);
  const armou = A.cr.curva;
  P.entrada('A', cmd({ [campo]: 1, kc: 1, button: 2 })); passa(P, 1);
  const sp = B.sp;
  for (let i = 0; i < 40; i++) { P.entrada('A', cmd({ [campo]: 1, kc: 1 })); passa(P, 1); }
  const dy = B.y - P.G.CY;
  confere(armou === sinal && sp * sinal > 0 && dy * sinal > 20 && A.cr.curva === 0, 'a CURVA ' + lado + ': arma, o chute sai girando e a bola entorta ' + r1(Math.abs(dy)) + ' px para o lado escolhido', { armou, sp, dy: r1(dy) });
}
// (d) o super: a carga, o teto, o fogo; carregando, o PASSE e o CHUTE esperam
{
  const P = sala({ super: true }), C = P.C, A = P.jog[0], B = P.B, cmd = cmds();
  P.estado = 'jogo'; P.jog[1].x = P.G.CX + 400; poeBola(P, P.G.CX - 300, P.G.CY); cola(P, A, 1, 0);
  P.entrada('A', cmd({})); passa(P, 1);
  for (let i = 0; i < 20; i++) { P.entrada('A', cmd({ su: 1, pc: i === 10 ? 1 : 0, button: i >= 10 ? 3 : 1 })); passa(P, 1); }
  const parado = Math.hypot(B.vx, B.vy) < 1 && A.cr.segura;
  for (let i = 0; i < 40; i++) { P.entrada('A', cmd({ su: 1, pc: 1 })); passa(P, 1); }
  const cheio = A.cr.cT;
  P.entrada('A', cmd({ su: 0, pc: 1 })); passa(P, 1);
  const v = Math.hypot(B.vx, B.vy);
  confere(parado, 'carregando o super, o CHUTE apertado com a bola no pé não sai (espera o super)');
  confere(cheio === 45 && v > C.LIMITE_VEL_BOLA && B.teto > C.LIMITE_VEL_BOLA && B.fogo > 0, 'soltou cheio: a bola passa do teto de sempre (' + r1(v / N.U(1)) + ' u/s contra ' + r1(C.LIMITE_VEL_BOLA / N.U(1)) + ') e sai pegando fogo', { cheio, teto: r1(B.teto), fogo: B.fogo });
  let caiu = false; for (let i = 0; i < 200 && !caiu; i++) { P.entrada('A', cmd({ pc: 1 })); passa(P, 1); if (B.teto === 0) caiu = Math.hypot(B.vx, B.vy) <= C.LIMITE_VEL_BOLA + 1e-6; }
  confere(caiu, 'o teto do super acaba quando a bola freia abaixo do de sempre');
  const P2 = sala({ super: true }), A2 = P2.jog[0], B2 = P2.B, c2 = cmds();
  P2.estado = 'jogo'; P2.jog[1].x = P2.G.CX + 400; poeBola(P2, P2.G.CX - 300, P2.G.CY); cola(P2, A2, 1, 0);
  P2.entrada('A', c2({})); passa(P2, 1);
  for (let i = 0; i < 6; i++) { P2.entrada('A', c2({ su: 1 })); passa(P2, 1); }
  P2.entrada('A', c2({ su: 0 })); passa(P2, 1);
  const vf = Math.hypot(B2.vx, B2.vy);
  const vC = N.U(P2.C.FORCA_POWER / B2.m);
  confere(vf > vC * 0.6 * 0.98 && vf < vC * 0.9 && B2.fogo === 0 && B2.teto === 0, 'soltou cedo: um super fraco (de 60% do CHUTE para cima, conforme a carga), sem fogo', { v: r1(vf), chute: r1(vC) });
  // a espera: soltou longe da bola e chegou nela em até 8 passos
  const P3 = sala({ super: true }), A3 = P3.jog[0], B3 = P3.B, c3 = cmds();
  P3.estado = 'jogo'; P3.jog[1].x = P3.G.CX + 400; poeBola(P3, P3.G.CX - 300, P3.G.CY); A3.x = B3.x - (A3.r + B3.r + 1) - 26; A3.y = B3.y;
  P3.entrada('A', c3({})); passa(P3, 1);
  for (let i = 0; i < 30; i++) { P3.entrada('A', c3({ su: 1 })); passa(P3, 1); }
  let saiu = -1;
  for (let i = 0; i < 12 && saiu < 0; i++) { P3.entrada('A', c3({ su: 0, x: 1 })); passa(P3, 1); if (Math.hypot(B3.vx, B3.vy) > N.U(10)) saiu = i; }
  confere(saiu >= 1 && saiu <= 8, 'soltou com a bola um pouco longe: o super espera e sai quando ela entra no alcance (passo ' + saiu + ')', saiu);
  const P4 = sala({ super: true }), A4 = P4.jog[0], B4 = P4.B, c4 = cmds();
  P4.estado = 'jogo'; P4.jog[1].x = P4.G.CX + 400; poeBola(P4, P4.G.CX - 300, P4.G.CY); A4.x = B4.x - 300; A4.y = B4.y;
  P4.entrada('A', c4({})); passa(P4, 1);
  for (let i = 0; i < 30; i++) { P4.entrada('A', c4({ su: 1 })); passa(P4, 1); }
  for (let i = 0; i < 20; i++) { P4.entrada('A', c4({ su: 0 })); passa(P4, 1); }
  confere(A4.cr.espera === 0 && !A4.cr.segura && Math.hypot(B4.vx, B4.vy) < 1, 'soltou longe demais: o super se perde (não fica guardado)');
  // um super em cima do outro (a bola já voando forte no mesmo sentido): não passa do teto do super cheio
  const P5 = sala({ super: true }), C5 = P5.C, B5 = P5.B;
  P5.estado = 'jogo'; P5.jog[1].x = P5.G.CX + 400; poeBola(P5, P5.G.CX - 300, P5.G.CY); B5.vx = 1.8 * C5.CR.V_SUPER;
  N.crDepois(P5, C5, P5.jog[0], 1); passa(P5, 1);
  const vS = N.U(C5.FORCA_POWER * C5.CR.SUPER_MAX / B5.m);
  confere(Math.abs(C5.CR.V_SUPER - vS) < 1e-6 && B5.teto <= C5.CR.V_SUPER + 1e-9 && Math.hypot(B5.vx, B5.vy) <= C5.CR.V_SUPER + 1e-6, 'um super em cima do outro não passa do teto do super cheio (' + r1(C5.CR.V_SUPER / N.U(1)) + ' u/s)', { teto: r1(B5.teto), v: r1(Math.hypot(B5.vx, B5.vy)) });
  // o CHUTE segurado enquanto carrega: soltou o super, ele sai — e o CHUTE no mesmo passo não vira "chute rápido" suspeito
  const sus = [], P6 = new PartidaSala({ n: 1, jogo: 'futebol', map: 0, tempo: 0, jogadores: [{ netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Beto' }], agora: () => AG, chutes: { super: true }, suspeito: (id, t) => sus.push(t) });
  const A6 = P6.jog[0], B6 = P6.B, c6 = cmds();
  P6.estado = 'jogo'; P6.jog[1].x = P6.G.CX + 400; poeBola(P6, P6.G.CX - 300, P6.G.CY); cola(P6, A6, 1, 0);
  P6.entrada('A', c6({})); passa(P6, 1);
  for (let i = 0; i < 30; i++) { P6.entrada('A', c6({ su: 1, pc: 1, button: 3 })); passa(P6, 1); }
  P6.entrada('A', c6({ su: 0, pc: 1, button: 3 })); passa(P6, 1);
  confere(Math.hypot(B6.vx, B6.vy) > P6.C.LIMITE_VEL_BOLA * 0.8 && !sus.includes('chute_rapido'), 'soltou o super com o CHUTE apertado: o super sai e o CHUTE do mesmo passo não fica registrado como suspeito', { sus, v: r1(Math.hypot(B6.vx, B6.vy)) });
}
// (e) o travessão: a bola alta para o gol bate e volta; a mesma bola por baixo é gol
{
  const P = sala({ lob: true }), C = P.C, B = P.B, G = P.G;
  P.estado = 'jogo'; for (const q of P.jog) { q.x = G.CX; q.y = G.LY0 + 40; }
  poeBola(P, G.LX1 - 70, G.CY, C.CR.TRAVESSAO + 20, 120); B.vx = 700;
  const placar0 = P.placar.join('x');
  passa(P, 30);
  confere(P.placar.join('x') === placar0 && B.vx < 0 && B.x < G.LX1 && P.travessao > 0, 'a bola alta no gol bate no travessão e volta: não é gol', { placar: P.placar, vx: r1(B.vx), x: r1(B.x) });
  const P2 = sala({ lob: true }), B2 = P2.B, G2 = P2.G;
  P2.estado = 'jogo'; for (const q of P2.jog) { q.x = G2.CX; q.y = G2.LY0 + 40; }
  poeBola(P2, G2.LX1 - 70, G2.CY, 6, 0); B2.vx = 700;
  passa(P2, 30);
  confere(P2.placar[0] === 1, 'a mesma bola por baixo do travessão é gol', P2.placar);
  // a cavadinha de cada distância (o PASSE e o CHUTE): a que passa por baixo do travessão subindo (e sobe acima dele já dentro)
  // é gol; a que chega alta bate e volta; nenhuma fica parada dentro do gol sem ser gol
  const fim = {}, presas = [];
  for (const [nome, tc] of [['CHUTE', { pc: 1 }], ['PASSE', { kc: 1 }]]) for (let dist = 20; dist <= 240; dist += 5) {
    const Q = sala({ lob: true }), A = Q.jog[0], Bq = Q.B, Gq = Q.G, cmd = cmds();
    Q.estado = 'jogo'; Q.jog[1].x = Gq.CX - 300; Q.jog[1].y = Gq.LY0 + 40;
    poeBola(Q, Gq.LX1 - dist, Gq.CY); cola(Q, A, 1, 0);
    Q.entrada('A', cmd({})); passa(Q, 1);
    Q.entrada('A', cmd({ lb: 1 })); passa(Q, 1);
    Q.entrada('A', cmd(Object.assign({ lb: 1, button: tc.pc ? 3 : 2 }, tc))); passa(Q, 1);
    let gol = false;
    for (let i = 0; i < 200 && !gol; i++) { Q.entrada('A', cmd(Object.assign({ lb: 1 }, tc))); passa(Q, 1); gol = Q.placar[0] > 0; }
    const dentro = !gol && Bq.x > Gq.LX1 && Bq.y > Gq.GOL_Y0 && Bq.y < Gq.GOL_Y1;
    (fim[nome] = fim[nome] || []).push(gol ? 'G' : Q.travessao ? 'T' : '.');
    if (dentro) presas.push(nome + ' ' + dist);
  }
  const g = t => (fim[t].join('').match(/G/g) || []).length, tv = t => (fim[t].join('').match(/T/g) || []).length;
  confere(!presas.length && g('CHUTE') > 5 && g('PASSE') > 5 && tv('CHUTE') > 0 && tv('PASSE') > 0 && fim.CHUTE[(75 - 20) / 5] === 'G' && fim.PASSE[(45 - 20) / 5] === 'G',
    'a cavadinha de 20 a 240 px do gol: por baixo do travessão (mesmo subindo acima dele já dentro) é gol, alta bate e volta, nenhuma fica presa no gol (CHUTE ' + fim.CHUTE.join('') + ' · PASSE ' + fim.PASSE.join('') + ')', { presas });
}
// (f) a bola alta não é toque de ninguém (a autoria do gol)
{
  const P = sala(TODOS, 1), A = P.jog[0], Bt = P.jog[1], B = P.B;
  P.estado = 'jogo'; poeBola(P, P.G.CX, P.G.CY, P.C.CR.ALTURA_JOG + 20, 0); Bt.x = B.x; Bt.y = B.y; A.x = P.G.CX - 400;
  P.toques.length = 0; passa(P, 1);
  const alto = P.toques.length;
  P.B.z = 0; P.B.vz = 0; passa(P, 1);
  confere(alto === 0 && P.toques.length > 0, 'com a bola alta em cima da tampinha, ninguém tocou nela; no chão, o toque conta', { alto, chao: P.toques.length });
}

/* ---------------------------------------------------------------- 3) os comandos */
console.log('\n3) os comandos: os toques que não se perdem e os valores estranhos');
{
  const P = sala(TODOS), A = P.jog[0], cmd = cmds();
  P.estado = 'jogo'; P.jog[1].x = P.G.CX + 400;
  const vai = o => { P.entrada('A', cmd(o)); passa(P, 1); };
  vai({ lb: 4, ce: 9, cd: 2 });
  confere(!A.cr.lob && A.cr.curva === 0 && A.cr.lbN === 4, 'o primeiro comando só marca de onde os contadores partem (nada arma)');
  vai({ lb: 5 }); const l1 = A.cr.lob;
  vai({ lb: 7 }); const l2 = A.cr.lob;
  vai({ lb: 10 }); const l3 = A.cr.lob;
  confere(l1 && l2 && !l3, 'cavadinha: um toque arma; dois toques (um comando perdido no meio) deixam como estava; três desarmam', [l1, l2, l3]);
  vai({ lb: 10, ce: 10 }); const c1 = A.cr.curva;
  vai({ lb: 10, ce: 11 }); const c2 = A.cr.curva;
  vai({ lb: 10, ce: 11, cd: 3 }); const c3 = A.cr.curva;
  vai({ lb: 10, ce: 11, cd: 4 }); const c4 = A.cr.curva;
  confere(c1 === -1 && c2 === 0 && c3 === 1 && c4 === 0, 'curva: ↶ arma, ↶ de novo desarma, ↷ arma para o outro lado, ↷ de novo desarma', [c1, c2, c3, c4]);
  vai({ lb: 9, ce: 11, cd: 4 }); vai({ lb: -3, ce: 1.5, cd: '9' }); vai({ lb: 3e9 });
  confere(!A.cr.lob && A.cr.curva === 0 && A.cr.lbN === 10, 'contador que volta, negativo, quebrado, texto ou gigante não arma nada');
  vai({ lb: 10, su: 2 }); const s2 = A.cr.segura;
  vai({ lb: 10, su: true }); const s3 = A.cr.segura;
  vai({ lb: 10, su: 1 }); const s4 = A.cr.segura;
  confere(!s2 && !s3 && s4, 'o super só segura com su = 1 (2, true e o resto não)');
  for (let i = 0; i < 10; i++) vai({ lb: 10, su: 1 });
  passa(P, 7);                                        // (o buraco curto da internet: 7 passos sem comando nenhum, ~117 ms)
  const buraco = A.cr.segura, cTb = A.cr.cT;
  vai({ lb: 10, su: 1 });
  confere(buraco && cTb >= 10 && cTb <= 15 && A.cr.segura && A.cr.cT === cTb + 1, 'um buraco curto na internet carregando o super: ele continua segurado (não sai sozinho) e volta a carregar com os comandos', { buraco, cTb, cT: A.cr.cT });
  const cT = A.cr.cT; AG += 400; passa(P, 2);
  confere(cT > 5 && !A.cr.segura && A.cr.cT === 0 && Math.hypot(P.B.vx, P.B.vy) < 1, 'a internet sumiu carregando o super (o silêncio de 350 ms): a carga cai sem chutar sozinha');
  const nova = sala(TODOS), cA = cmds(), Aq = nova.jog[0];
  nova.estado = 'jogo';
  nova.entrada('A', cA({ lb: 0 })); passa(nova, 1); nova.entrada('A', cA({ lb: 1 })); passa(nova, 1);
  const armado = Aq.cr.lob;
  nova.sai('A'); nova.entra('A', 'Ana', 0);
  confere(armado && Aq.cr && !Aq.cr.lob && Aq.cr.lbN === -1, 'quem cai e volta começa sem nada armado (os contadores recomeçam)');
  // o comando descartado (o tranco da internet) passa os toques para o próximo
  const D = sala(TODOS), cD = cmds(), Ad = D.jog[0];
  D.estado = 'jogo'; D.jog[1].x = D.G.CX + 400;
  D.entrada('A', cD({ lb: 0 })); passa(D, 1);
  for (let i = 0; i < 60; i++) D.entrada('A', cD({ lb: i === 5 ? 1 : i > 5 ? 1 : 0 }));
  passa(D, 3);
  confere(Ad.cr.lob === true, 'depois de um tranco (60 comandos de uma vez, o servidor descarta os velhos), o toque da cavadinha não se perde');
  // o super cancelado (sx: o sistema tirou o dedo, a janela perdeu o foco): a carga cai e nada sai; segurar de novo e soltar, sai
  const X = sala({ super: true }), cX = cmds(), Ax = X.jog[0], Bx = X.B;
  X.estado = 'jogo'; X.jog[1].x = X.G.CX + 400; poeBola(X, X.G.CX - 300, X.G.CY); cola(X, Ax, 1, 0);
  X.entrada('A', cX({})); passa(X, 1);
  for (let i = 0; i < 30; i++) { X.entrada('A', cX({ su: 1 })); passa(X, 1); }
  X.entrada('A', cX({ su: 0, sx: 1 })); passa(X, 1);
  const cancelou = !Ax.cr.segura && Ax.cr.cT === 0 && Ax.cr.espera === 0;
  for (let i = 0; i < 10; i++) { X.entrada('A', cX({ sx: 1 })); passa(X, 1); }
  const parada = Math.hypot(Bx.vx, Bx.vy) < 1;
  for (let i = 0; i < 20; i++) { X.entrada('A', cX({ su: 1, sx: 1 })); passa(X, 1); }
  X.entrada('A', cX({ su: 0, sx: 1 })); passa(X, 1);
  const saiu = Math.hypot(Bx.vx, Bx.vy) > N.U(10);
  confere(cancelou && parada && saiu, 'o super cancelado (o sistema tirou o dedo, a janela perdeu o foco: sx) não chuta; segurar de novo e soltar, chuta', { cancelou, parada, saiu });
  // a curva dos dois lados num comando só (comandos que o servidor juntou): o lado tocado por último (cu) vale por último
  const K = sala({ curva: true }), cK = cmds(), Ak = K.jog[0];
  K.estado = 'jogo'; K.jog[1].x = K.G.CX + 400;
  K.entrada('A', cK({})); passa(K, 1);
  K.entrada('A', cK({ ce: 1, cd: 1, cu: 1 })); passa(K, 1); const k1 = Ak.cr.curva;
  K.entrada('A', cK({ ce: 2, cd: 2, cu: -1 })); passa(K, 1); const k2 = Ak.cr.curva;
  confere(k1 === 1 && k2 === -1, 'curva: ↶ e ↷ no mesmo comando — fica armado o lado tocado por último (como no aparelho)', [k1, k2]);
  // a recuperação da fila (os comandos que chegaram juntos depois de um engasgo): o super carrega neles também, como no aparelho
  const Rq = sala({ super: true }), cR = cmds(), Ar = Rq.jog[0];
  Rq.estado = 'jogo'; Rq.jog[1].x = Rq.G.CX + 400; poeBola(Rq, Rq.G.CX - 300, Rq.G.CY); Ar.x = Rq.B.x - 300;
  Rq.entrada('A', cR({})); passa(Rq, 1);
  for (let i = 0; i < 5; i++) { Rq.entrada('A', cR({ su: 1 })); passa(Rq, 1); }
  const cT0 = Ar.cr.cT;
  for (let i = 0; i < 3; i++) Rq.entrada('A', cR({ su: 1 }));
  Ar.fila.cred = 3; for (let i = 0; i < 3; i++) Rq.nsRecupera(Ar, Ar.fila, Ar.netButton, false);
  confere(Ar.cr.segura && Ar.cr.cT === cT0 + 3, 'a recuperação da fila carrega o super nos comandos recuperados (' + cT0 + ' → ' + Ar.cr.cT + ')', { cT0, cT: Ar.cr.cT });
  // a saída depois do gol zera tudo
  const S = sala(TODOS), cS = cmds(), As = S.jog[0];
  S.estado = 'jogo'; S.entrada('A', cS({ lb: 0 })); passa(S, 1); S.entrada('A', cS({ lb: 1 })); passa(S, 1);
  S.B.z = 30; S.B.sp = 0.01; S.B.fogo = 20; S.saida(1);
  confere(!As.cr.lob && S.B.z === 0 && S.B.sp === 0 && S.B.fogo === 0, 'na saída (depois do gol) a bola volta ao chão e ninguém fica com nada armado');
}
{
  const P = sala(null);
  confere(P.cr === null && P.jog.every(q => q.cr === null) && !('bz' in P.quadro()) && !('cr' in P.quadro()), 'sala sem os chutes: nada do estado novo, e o quadro é o de sempre (sem bz nem cr)');
  const Q = sala(TODOS).quadro();
  confere(Array.isArray(Q.bz) && Q.bz.length === 5 && Array.isArray(Q.cr) && Q.cr.length === 2, 'sala com os chutes: o quadro leva a bola no alto (bz) e o estado de cada um (cr)');
  const Pc = new PartidaSala({ n: 2, jogo: 'curva', jogadores: [], agora: () => AG, chutes: TODOS }), P94 = new PartidaSala({ n: 2, jogo: 'futebol', jogadores: [], agora: () => AG, chutes: TODOS, motor: 'v94' });
  confere(Pc.cr === null && P94.cr === null, 'o COM CURVA (a curva é a dele) e o motor próprio da v94 ficam sem os chutes do Rachão');
}

/* ---------------------------------------------------------------- 4) os bots usam os três */
console.log('\n4) os bots usam a cavadinha, a curva e o super (partidas inteiras de bots)');
{
  const cont = { lob: 0, curva: 0, super: 0, fogo: 0, gols: 0, partidas: 0, erros: 0 };
  const depois0 = N.crDepois;
  N.crDepois = function (M, C, q, carga) {            // (o motor chama pelo módulo: dá para contar daqui)
    if (q && q.bot && q.cr) { if (q.cr.lob) cont.lob++; if (q.cr.curva) cont.curva++; if (Number.isFinite(carga)) { cont.super++; if (carga > 0.6) cont.fogo++; } }
    return depois0.apply(this, arguments);
  };
  for (const [n, seed] of [[2, 3], [3, 9], [1, 5], [4, 2]]) {
    let s = seed; const rnd = Math.random; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    try {
      const jog = []; for (let i = 0; i < 2 * n; i++) jog.push({ netId: null, nome: 'Bot', bot: 'dificil' });
      const P = new PartidaSala({ n, jogo: 'futebol', map: 0, tempo: 1, jogadores: jog, agora: () => AG, chutes: TODOS, log: t => { if (/erro/.test(t)) cont.erros++; } });
      for (let t = 0; t < 60 * 600 && !P.encerrado; t++) {
        AG += 1000 / 60;
        try { P.passo(); } catch (e) { cont.erros++; break; }
      }
      cont.gols += P.placar[0] + P.placar[1]; cont.partidas += P.encerrado ? 1 : 0;
    } finally { Math.random = rnd; }
  }
  N.crDepois = depois0;
  confere(cont.erros === 0 && cont.partidas === 4 && cont.gols > 0, 'quatro partidas inteiras de bots (1x1 a 4x4) com os três chutes, sem erro, até o fim', cont);
  confere(cont.lob > 0 && cont.curva > 0 && cont.super > 0, 'os bots usaram a cavadinha (' + cont.lob + ' vezes), a curva (' + cont.curva + ') e o super (' + cont.super + ', ' + cont.fogo + ' com fogo)', cont);
}

/* ---------------------------------------------------------------- 5) a previsão do aparelho = o servidor (o código do jogo, num vm) */
console.log('\n5) a previsão do aparelho (o código do jogo) dá o mesmo que o servidor');
const CHUTES_JS = fs.readFileSync(path.join(RAIZ, 'tools', 'v99', 'chutes.js'), 'utf8');
const parte = (t, a, b) => { const i = t.indexOf(a), j = t.indexOf(b); if (i < 0 || j < 0) throw new Error('marca não achada: ' + a.slice(0, 60)); return t.slice(i, j); };
const CODIGO_JOGO = [
  fs.readFileSync(path.join(RAIZ, 'tools', 'v92', 'rede.js'), 'utf8'),
  fs.readFileSync(path.join(RAIZ, 'tools', 'v96', 'rede.js'), 'utf8'),
  parte(CHUTES_JS, 'const CR99_N = window.RachaNucleo;', '/* ---------------------------------------------------------------- 1) os botões no HUD */'),
  parte(CHUTES_JS, '/* ---------------------------------------------------------------- 3) o comando e a previsão */', '/* ---------------------------------------------------------------- 4) o desenho'),
].join('\n;\n');
confere(/v92PrevPasso = function/.test(CODIGO_JOGO) && /net49Snapshot = function/.test(CODIGO_JOGO), 'o código da previsão vem dos arquivos do jogo (tools/v92/rede.js, tools/v96/rede.js e tools/v99/chutes.js)');
function aparelho(envia) {                            // o jogo num vm, com o mínimo do resto da página
  const ctx = { console, Math, JSON, Number, String, Array, Object, Map, Set, Infinity, NaN, isFinite, Date };
  ctx.window = ctx; ctx.performance = { now: () => ctx.__agora }; ctx.addEventListener = () => {}; ctx.document = { addEventListener() {}, getElementById: () => null };
  ctx.__agora = 0; ctx.__envia = envia; ctx.__held = { kick: false, power: false };
  ctx.RachaNucleo = N; ctx.RachaLiso = require(path.join(RAIZ, 'tools', 'v96', 'liso.js'));
  vm.createContext(ctx);
  const PRE = `
    var NET49 = {playing:false, host:false, localSlot:-1, seq:0, room:null, lastTick:-1, pending:[], snapshotAt:0, paused:false, ping:0};
    var V92_NUC = window.RachaNucleo, U = V92_NUC.U, STEP = 1/60, TICKS_POR_S = 60, acc = 0, goalT = -1;
    var V92 = {cfg:{previsao:'v92', bolaPrev:'eu', tauCorr:90, fisica:V92_NUC.PERFIL_V92}, med:{corr:[], corrB:[], chutesPrev:0, toques:0}, ultInp:{mx:0, my:0}};
    var RQ = {jog:[]}, P = {x:0, y:0, vx:0, vy:0, r:38}, B = {x:0, y:0, vx:0, vy:0}, VIS = {px:0, py:0, bx:0, by:0};
    var BOTAO = {kickL:false, powerL:false}, ARMADO = {}, RP = {toque:0, golN:-1, n:0}, X49UI = {open:false};
    var som = {chute(){}, curva(){}, trave(){ window.__trave = (window.__trave | 0) + 1; }, toque(){ window.__quique = (window.__quique | 0) + 1; }, clique(){}};
    function fxChute(){} function net49RemoteFrame(){} function net49Predict(){} function net49Draw(){} function net49Begin(){} function x49NetStop(){}
    function net49Snapshot(s){ if (s.tick <= NET49.lastTick) return; NET49.lastTick = s.tick; NET49.snapshotAt = performance.now(); }
    function net49Send(m){ window.__envia(JSON.parse(JSON.stringify(m))); }
    function v70HelloExtra(){ return {}; } function v92AplicaFisica(){} function vibrarChute(){} function getInput(){ return {mx:0, my:0}; }
    function dirSegue(){} function rpGrava(){} function fimAberto(){ return false; } function x49GameUI(){} function netSuaviza(){} function posVisual(){}
    function updateCamera(){} function spinBall(){} function render(){} function rpMonta(){ return null; } function rpGuardaRecente(){}
    function kickSegurado(){ return window.__held.kick; } function powerSegurado(){ return window.__held.power; } function v70ConvidadoK(){ return 0; }
  `;
  const POS = `
    window.__T = { V92N, CR99, NET49, V92, BOTAO, RQ, inicia: r => v92RedeInicia(r), comando: d => v92Comando(d), quadro: s => net49Snapshot(s), op: () => cr99Op() };
  `;
  vm.runInContext(PRE + '\n' + CODIGO_JOGO + '\n' + POS, ctx, { filename: 'jogo-v99.js' });
  return ctx;
}
// uma partida 1x1: a Ana joga com o aparelho (a previsão); o Beto é uma tampinha parada (sem comando: nada a prever errado)
function simula(o) {
  const lat = o.lat | 0, chutes = 'chutes' in o ? o.chutes : TODOS, inbox = [], saida = [];
  let tk = 0, AG2 = 1000;
  const P = new PartidaSala({ n: 1, jogo: 'futebol', map: 0, tempo: 0, jogadores: [{ netId: 'A', nome: 'Ana' }, { netId: 'Z', nome: 'Beto' }], agora: () => AG2, chutes,
    onSnapshot: d => saida.push({ em: tk + lat, d: JSON.parse(JSON.stringify(d)) }) });
  if (o.prepara) o.prepara(P);
  const ctx = aparelho(m => { if (m.type === 'input') inbox.push({ em: tk + lat, m }); });
  const T = ctx.__T;
  const room = { servidor: true, nucleo: N.VERSAO, fisica: N.PERFIL_V92, n: 1, jogo: 'futebol', chutes, roster: ['A', 'Z'], round: 1 };
  Object.assign(T.NET49, { playing: true, host: false, localSlot: 0, room, lastTick: -1 });
  T.RQ.jog = P.jog.map(q => ({ x: q.x, y: q.y }));
  T.inicia(room);
  T.quadro(JSON.parse(JSON.stringify(P.quadro())));
  const corrB = [], corrP = [], srv = {}, prevs = {}, ext = { vMax: 0, zMax: 0, fogo: 0, teto: 0 };
  let antesB = 0;
  const ctl = { mx: 0, my: 0, eu: () => T.V92N.M.jog[0], bola: () => T.V92N.M.B, P };
  for (; tk < o.passos; tk++) {
    AG2 += 1000 / 60; ctx.__agora = tk * 1000 / 60;
    ctl.mx = 0; ctl.my = 0;
    o.roteiro(tk, ctl, T, ctx);
    T.comando({ mx: ctl.mx, my: ctl.my });
    const M = T.V92N.M; if (T.CR99.ack && !(M.tick in prevs)) prevs[M.tick] = [M.B.x, M.B.y, M.B.z, M.jog[0].x, M.jog[0].y];
    while (inbox.length && inbox[0].em <= tk) P.entrada('A', inbox.shift().m);
    P.passo();
    srv[P.tick] = [P.B.x, P.B.y, P.B.z, P.jog[0].x, P.jog[0].y];
    ext.vMax = Math.max(ext.vMax, Math.hypot(P.B.vx, P.B.vy)); ext.zMax = Math.max(ext.zMax, P.B.z); ext.fogo = Math.max(ext.fogo, P.B.fogo); ext.teto = Math.max(ext.teto, P.B.teto);
    while (saida.length && saida[0].em <= tk) {
      antesB = T.V92.med.corrB.length;
      T.quadro(saida.shift().d);
      corrB.push(T.V92.med.corrB[T.V92.med.corrB.length - 1] || 0); corrP.push(T.V92.med.corr[T.V92.med.corr.length - 1] || 0);
    }
  }
  // o que a previsão mostrou em cada passo × o que o servidor fez naquele passo
  let difMax = 0, comparados = 0;
  for (const k in prevs) if (srv[k]) { const a = prevs[k], b = srv[k]; comparados++; difMax = Math.max(difMax, Math.hypot(a[0] - b[0], a[1] - b[1]), Math.abs(a[2] - b[2]), Math.hypot(a[3] - b[3], a[4] - b[4])); }
  return { P, T, ctx, ext, corrB: Math.max(0, ...corrB), corrP: Math.max(0, ...corrP), nQuadros: corrB.length, difMax, comparados };
}
const prepara = (bx, by, ox, oy) => P => {             // a Ana colada atrás da bola, o Beto (parado) em (ox, oy) relativo à bola
  P.estado = 'jogo'; poeBola(P, P.G.CX + bx, P.G.CY + by); cola(P, P.jog[0], 1, 0);
  P.jog[1].x = P.B.x + ox; P.jog[1].y = P.B.y + oy;
};
const ROTEIROS = {
  'cavadinha por cima do Beto': { prepara: prepara(-120, 0, 125, 0), roteiro: (k, c, T) => { if (k === 10) T.CR99.lb++; if (k === 16) T.BOTAO.powerL = true; }, confere: s => s.P.B.x > s.P.jog[1].x + 20 && s.ext.zMax > s.P.C.CR.ALTURA_JOG && Math.abs(s.P.jog[1].x - (s.P.G.CX + 5)) < 0.5 },
  'a curva ↷ no PASSE': { prepara: prepara(-300, 0, 500, -200), roteiro: (k, c, T) => { if (k === 8) T.CR99.cd++; if (k === 14) T.BOTAO.kickL = true; }, confere: s => s.P.B.y > s.P.G.CY + 10 },
  'a curva ↶ e a cavadinha juntas no CHUTE': { prepara: prepara(-300, 0, 500, -200), roteiro: (k, c, T) => { if (k === 6) T.CR99.ce++; if (k === 8) T.CR99.lb++; if (k === 14) T.BOTAO.powerL = true; }, confere: s => s.P.B.y < s.P.G.CY - 10 },
  'o super cheio': { prepara: prepara(-300, 0, 500, -200), roteiro: (k, c, T) => { T.CR99.suTecla = k >= 6 && k < 60; }, confere: s => s.ext.teto > s.P.C.LIMITE_VEL_BOLA && s.ext.fogo > 30 },
  'o super que espera a bola (soltou longe e andou até ela)': { prepara: P => { prepara(-300, 0, 500, -200)(P); P.jog[0].x -= 24; }, roteiro: (k, c, T) => { T.CR99.suTecla = k >= 4 && k < 40; if (k >= 40 && k < 50) c.mx = 1; }, confere: s => s.ext.vMax > s.P.C.LIMITE_VEL_BOLA * 0.8 },
  'dois toques na cavadinha (desarma) e o CHUTE de sempre': { prepara: prepara(-120, 0, 300, 120), roteiro: (k, c, T) => { if (k === 6 || k === 8) T.CR99.lb++; if (k === 14) T.BOTAO.powerL = true; }, confere: s => s.ext.zMax === 0 && s.ext.vMax > s.P.C.LIMITE_VEL_BOLA * 0.5 },
  'a cabeçada': { prepara: P => { prepara(-200, 0, 500, -200)(P); P.B.z = (P.C.CR.CABECA_Z + P.C.CR.ALCANCE_Z) / 2; P.B.vz = 30; }, roteiro: (k, c, T) => { if (k === 1) T.BOTAO.powerL = true; }, confere: s => s.P.B.x > s.P.G.CX - 150 },
  'o super cancelado (o sistema tirou o dedo)': { prepara: prepara(-300, 0, 500, -200), roteiro: (k, c, T) => { T.CR99.suTecla = k >= 6 && k < 40; if (k === 40) T.CR99.sx++; }, confere: s => s.ext.vMax < 1 && !s.P.jog[0].cr.segura },
  'a cavadinha no travessão': { prepara: P => { P.estado = 'jogo'; poeBola(P, P.G.LX1 - 150, P.G.CY); cola(P, P.jog[0], 1, 0); P.jog[1].x = P.G.CX - 300; }, roteiro: (k, c, T) => { if (k === 4) T.CR99.lb++; if (k === 8) T.BOTAO.powerL = true; }, confere: s => s.P.placar[0] === 0 && s.P.travessao > 0 },
};
for (const lat of [0, 4]) {
  for (const nome in ROTEIROS) {
    const R = ROTEIROS[nome], s = simula(Object.assign({ lat, passos: 150 }, R));
    // (a diferença que sobra é o arredondamento do quadro: a bola e as tampinhas vão com 0,1 px; a altura, com 0,001)
    confere(R.confere(s) && s.nQuadros > 60 && s.comparados > 100 && s.difMax < 0.2 && s.corrB < 0.2 && s.corrP < 0.2 && !s.T.CR99.erro,
      (lat ? 'com 4 passos de atraso' : 'sem atraso') + ' · ' + nome + ': a previsão = o servidor em cada passo (até ' + s.difMax.toFixed(2) + ' px, o arredondamento do quadro)',
      { difMax: s.difMax, corrB: s.corrB, corrP: s.corrP, q: s.nQuadros, c: s.comparados, erro: s.T.CR99.erro, bola: [r1(s.P.B.x), r1(s.P.B.y), r1(s.P.B.z)], placar: s.P.placar });
  }
}
{
  const s = simula(Object.assign({ lat: 4, passos: 150 }, ROTEIROS['a cavadinha no travessão']));
  confere(s.ctx.__trave >= 1 && s.ctx.__quique >= 1, 'na hora do passo (não no replay), o som do travessão e o do quique da bola', { trave: s.ctx.__trave, quique: s.ctx.__quique });
  const ack = s.T.CR99.ack && s.T.CR99.ackLb === 1;
  confere(ack, 'o aparelho conta os toques a partir do último comando que o servidor usou', { ack: s.T.CR99.ack, lb: s.T.CR99.ackLb });
  const sem = simula({ lat: 0, passos: 60, chutes: null, prepara: prepara(-120, 0, 170, 0), roteiro: (k, c, T) => { if (k === 6) T.CR99.lb++; if (k === 10) T.BOTAO.powerL = true; } });
  confere(sem.T.V92N.M.cr === null && sem.difMax < 0.2 && sem.ext.zMax === 0, 'sala sem os chutes: a previsão é a da v92 (o toque na cavadinha não existe nem no comando)', { cr: sem.T.V92N.M.cr });
}

/* ---------------------------------------------------------------- 6) as salas sem os chutes = as da v98 */
console.log('\n6) as salas sem os chutes são as mesmas da v98 (quadro por quadro)');
{
  // as impressões das partidas no motor da v98 (tests/v99: calculadas com o server/partida da v98, antes desta versão)
  const DOURADO = [[['bots', 'futebol', 1, 7], 1946, 'bee12e1ee4c32868'], [['bots', 'futebol', 2, 11], 2101, '229700c61117294c'], [['bots', 'futebol', 3, 5], 2100, '86908e940cf3d8a8'],
    [['bots', 'futebol', 4, 3], 1946, '616dcc865f8dbd14'], [['humano', 'futebol', 2, 21], 1924, '4d1b8e49d46f76a9'], [['humano', 'curva', 2, 9], 2100, 'fb8396f1a5a53e87'], [['bots', 'curva', 3, 13], 2100, '1c1372d5cf743d1d']];
  const roda = (cenario, jogo, n, seed, chutes) => {
    let s = seed; const rnd = Math.random; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    let ag = 1000; const h = crypto.createHash('sha256'); let nq = 0;
    try {
      const jog = []; for (let i = 0; i < 2 * n; i++) jog.push(i === 0 && cenario === 'humano' ? { netId: 'H', nome: 'H' } : { netId: null, nome: 'Bot', bot: 'dificil' });
      const o = { n, jogo, map: 0, tempo: 1, jogadores: jog, agora: () => ag, onSnapshot: d => { h.update(JSON.stringify(d)); nq++; } };
      if (chutes !== undefined) o.chutes = chutes;
      const P = new PartidaSala(o); let sq = 0;
      for (let t = 0; t < 60 * 70 && !P.encerrado; t++) {
        ag += 1000 / 60;
        if (cenario === 'humano') { const a = t * 0.031; P.entrada('H', { seq: ++sq, x: Math.cos(a), y: Math.sin(a * 0.7), button: t % 50 < 6 ? 3 : t % 37 < 4 ? 2 : 1, k: t % 90 < 30 ? 1 : 0, kc: Math.floor(t / 37), pc: Math.floor(t / 50), lb: t, su: 1 }); }
        P.passo();
      }
    } finally { Math.random = rnd; }
    return [nq, h.digest('hex').slice(0, 16)];
  };
  for (const [c, nq, sha] of DOURADO) {
    const a = roda(...c), b = roda(...c, null), d = roda(...c, c[1] === 'curva' ? TODOS : {});
    confere(a[0] === nq && a[1] === sha && b[1] === sha && d[1] === sha, c.join(' ') + ': ' + nq + ' quadros iguais aos da v98' + (c[1] === 'curva' ? ' (o COM CURVA com os chutes pedidos também)' : ' (sem os chutes e com {} vazio)'), { a, b, d, sha });
  }
}

/* ---------------------------------------------------------------- 7) o servidor de verdade (WebSocket) */
console.log('\n7) o servidor das salas de verdade (WebSocket)');
const porta = await new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const srv = spawn('node', [path.join(RAIZ, 'tests', 'servidor_visitantes.cjs'), '--porta', String(porta), '--host', '127.0.0.1', '--memoria', '--nome', 'Teste dos chutes', '--sem-p2p'],
  { env: Object.assign({}, process.env, { RACHA_CONTAGEM_MS: '500' }), stdio: ['ignore', 'pipe', 'pipe'] });
let logSrv = ''; srv.stdout.on('data', b => { logSrv += b; }); srv.stderr.on('data', b => { logSrv += b; });
const dorme = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 80; i++) { const ok2 = await new Promise(r => { const s = net.connect(porta, '127.0.0.1', () => { s.end(); r(true); }); s.on('error', () => r(false)); }); if (ok2) break; await dorme(100); }
function cliente(nome, extra) {
  const c = { nome, msgs: [], id: null, token: null };
  c.abre = () => new Promise((res, rej) => {
    c.ws = new WebSocket('ws://127.0.0.1:' + porta + '/');
    c.ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } c.msgs.push(m); if (m.type === 'hello') { c.id = m.id; c.token = m.token; } };
    c.ws.onopen = () => { c.manda(Object.assign({ type: 'hello', name: nome, token: c.token || undefined, v93: 1 }, extra || {})); res(); };
    c.ws.onerror = rej;
  });
  c.manda = o => c.ws.send(JSON.stringify(o));
  c.espera = async (f, ms) => { const t1 = Date.now() + (ms || 4000); while (Date.now() < t1) { const m = c.msgs.find(f); if (m) return m; await dorme(20); } return null; };
  c.ultimo = f => { for (let i = c.msgs.length - 1; i >= 0; i--) if (f(c.msgs[i])) return c.msgs[i]; return null; };
  c.depois = (k, f) => c.espera(m => c.msgs.indexOf(m) >= k && f(m));
  c.fecha = () => { try { c.ws.close(); } catch (_) {} };
  return c;
}
const A = cliente('Ana', { cr: 1 }), Bc = cliente('Beto', { cr: 1 }), V = cliente('Velho');
try {
  await A.abre(); await Bc.abre(); await V.abre();
  const hA = await A.espera(m => m.type === 'hello'); await Bc.espera(m => m.type === 'hello'); const hV = await V.espera(m => m.type === 'hello');
  confere(hA && hA.cr === 1 && hV && hV.cr === 1, 'o hello do servidor diz que ele tem os chutes do Rachão (cr: 1): o aparelho só oferece quando tem');
  V.manda({ type: 'create', n: 1, map: 0, jogo: 'futebol', tempo: 0, bots: true, pub: true, name: 'Do Velho', chutes: TODOS });
  const rV = await V.espera(m => m.type === 'room' && m.room && m.room.name === 'Do Velho');
  confere(rV && rV.room.chutes === null, 'a página antiga (sem cr: 1) não cria sala com os chutes, mesmo pedindo', rV && rV.room.chutes);
  V.manda({ type: 'leave' }); await dorme(150);
  A.manda({ type: 'create', n: 1, map: 0, jogo: 'futebol', tempo: 0, bots: true, pub: true, name: 'Chutes da Ana', chutes: { lob: true, curva: true } });
  const rA = await A.espera(m => m.type === 'room' && m.room && m.room.name === 'Chutes da Ana');
  const code = rA && rA.room.code;
  confere(rA && JSON.stringify(rA.room.chutes) === '{"lob":true,"curva":true,"super":false}' && rA.room.motor === 'v93', 'a Ana cria a sala com a cavadinha e a curva (a sala fica no núcleo, motor v93)', rA && { chutes: rA.room.chutes, motor: rA.room.motor });
  Bc.manda({ type: 'list' }); V.manda({ type: 'list' }); await dorme(300);
  const lB = Bc.ultimo(m => m.type === 'rooms'), lV = V.ultimo(m => m.type === 'rooms');
  confere(lB && lB.list.some(s => s.code === code && s.chutes && s.chutes.lob) && lV && !lV.list.some(s => s.code === code), 'a sala aparece na lista da página nova (com os chutes) e NÃO na da página antiga');
  const nV = V.msgs.length; V.manda({ type: 'join', code });
  const eV = await V.depois(nV, m => m.type === 'error');
  confere(eV && eV.codigo === 'chutes_velho' && /atualize o jogo/.test(eV.message), 'a página antiga não entra (o aviso para atualizar o jogo)', eV);
  Bc.manda({ type: 'join', code }); await Bc.espera(m => m.type === 'room' && m.room && m.room.code === code);
  Bc.manda({ type: 'seat', team: 1 }); await dorme(200);
  let nA = A.msgs.length; A.manda({ type: 'config', chutes: 's' }); await dorme(200);
  let sala = A.ultimo(m => m.type === 'room').room;
  confere(JSON.stringify(sala.chutes) === '{"lob":false,"curva":false,"super":true}', 'o admin troca para só o super (pelas letras, como as setas da sala)', sala.chutes);
  Bc.manda({ type: 'config', chutes: 'lcs' }); await dorme(200);
  confere(JSON.stringify(A.ultimo(m => m.type === 'room').room.chutes) === '{"lob":false,"curva":false,"super":true}', 'quem não é admin não muda os chutes');
  A.manda({ type: 'config', chutes: 'xyz' }); await dorme(200);
  confere(A.ultimo(m => m.type === 'room').room.chutes === null, 'valor estranho = só o chutar');
  A.manda({ type: 'config', jogo: 'curva', chutes: 'lcs' }); await dorme(200);
  sala = A.ultimo(m => m.type === 'room').room;
  confere(sala.jogo === 'curva' && sala.chutes === null, 'no COM CURVA os chutes do Rachão ficam desligados (a curva é a dele)', { jogo: sala.jogo, chutes: sala.chutes });
  A.manda({ type: 'config', jogo: 'futebol', chutes: 'lcs' }); await dorme(200);
  // o Velho entra numa sala sem os chutes; ligar os chutes com ele lá: recusado com o aviso
  A.manda({ type: 'config', chutes: '' }); await dorme(200);
  const nV2 = V.msgs.length; V.manda({ type: 'join', code, spectate: true }); await V.depois(nV2, m => m.type === 'room' && m.room && m.room.code === code);
  nA = A.msgs.length; A.manda({ type: 'config', chutes: 'lcs' });
  const eA = await A.depois(nA, m => m.type === 'error');
  await dorme(150);
  confere(eA && eA.codigo === 'chutes_velho' && A.ultimo(m => m.type === 'room').room.chutes === null, 'com alguém de página antiga na sala, ligar os chutes é recusado (o aviso diz quem precisa recarregar)', eA);
  V.manda({ type: 'leave' }); await dorme(200);
  A.manda({ type: 'config', chutes: 'lcs' }); await dorme(200);
  confere(JSON.stringify(A.ultimo(m => m.type === 'room').room.chutes) === JSON.stringify(TODOS), 'ele saiu: os três ligados');
  // a partida
  A.manda({ type: 'start' });
  const st = await Bc.espera(m => m.type === 'start'), cont = await Bc.espera(m => m.type === 'contagem');
  confere(st && JSON.stringify(st.room.chutes) === JSON.stringify(TODOS) && st.room.motorRodada === 'v93' && cont, 'COMEÇAR: a sala vai para a partida com os chutes (no núcleo) e a contagem', st && st.room.chutes);
  const q0 = await Bc.espera(m => m.type === 'snapshot');
  confere(q0 && Array.isArray(q0.data.bz) && q0.data.bz.length === 5 && Array.isArray(q0.data.cr) && q0.data.cr.length === 2, 'o quadro tem a bola no alto (bz) e o estado de cada um (cr)', q0 && { bz: q0.data.bz, cr: q0.data.cr });
  await dorme(700);
  let seq = 0;
  const manda = (o, k) => { for (let i = 0; i < (k || 1); i++) A.manda(Object.assign({ type: 'input', seq: ++seq, x: 0, y: 0, button: 1, k: 0, kc: 0, pc: 0, lb: 0, ce: 0, cd: 0, su: 0 }, o)); };
  for (let i = 0; i < 10; i++) { manda({}); await dorme(16); }
  for (let i = 0; i < 10; i++) { manda({ lb: 1, cd: 1 }); await dorme(16); }
  await dorme(150);
  let qa = A.ultimo(m => m.type === 'snapshot'), qb = Bc.ultimo(m => m.type === 'snapshot');
  const sA = N.crNovo(), sB = N.crNovo(); N.crUnpack(sA, qa.data.cr[0]); N.crUnpack(sB, qb.data.cr[0]);
  confere(sA.lob && sA.curva === 1 && sB.lob && sB.curva === 1, 'os toques da Ana (pelo servidor, com os contadores) armam a cavadinha e a curva ↷ dela — e o Beto vê no quadro', { sA, sB });
  for (let i = 0; i < 25; i++) { manda({ lb: 1, cd: 1, su: 1 }); await dorme(16); }
  await dorme(100);
  qa = A.ultimo(m => m.type === 'snapshot'); N.crUnpack(sA, qa.data.cr[0]);
  confere(sA.segura && sA.cT > 5, 'o super segurado (su: 1) carrega no servidor', sA);
  manda({ lb: 1, cd: 1, su: 'x' }, 3); await dorme(150);
  qa = A.ultimo(m => m.type === 'snapshot'); N.crUnpack(sA, qa.data.cr[0]);
  confere(!sA.segura, 'su que não é 1 solta o botão (o super espera a bola, que está longe, e se perde)', sA);
  Bc.manda({ type: 'input', seq: 1, x: 0, y: 0, button: 1, k: 0, lb: 'muito', ce: -1, cd: 1e12, su: [1] }); await dorme(100);
  confere(srv.exitCode === null, 'o comando com lixo nos campos novos não derruba nada');
  // a página antiga do mesmo perfil (outra aba, o app guardado: o hello sem cr) não volta para a partida com os chutes
  const Av = cliente('Ana'); Av.token = A.token;
  await Av.abre();
  const eAv = await Av.espera(m => m.type === 'error' && m.codigo === 'chutes_velho', 3000);
  await dorme(300);
  const salaB = Bc.ultimo(m => m.type === 'room').room;
  confere(eAv && !Av.msgs.some(m => m.type === 'start') && !salaB.members.some(x => x.id === A.id) && salaB.state === 'playing',
    'a página antiga da Ana (o mesmo perfil, sem cr) não volta para a partida com os chutes: sai como quem caiu (um bot fica no lugar) e o aviso diz para atualizar', { eAv, membros: salaB.members.map(x => x.name), estado: salaB.state });
  Av.fecha(); Bc.manda({ type: 'leave' }); await dorme(200);
  // o admin põe um mapa da Oficina na sala com os chutes: os chutes saem (a partida é a do mapa) e a página antiga volta a ver a sala
  const Cm = cliente('Caio', { cr: 1 }); await Cm.abre(); await Cm.espera(m => m.type === 'hello');
  Cm.manda({ type: 'create', n: 1, map: 0, jogo: 'futebol', tempo: 0, bots: true, pub: true, name: 'Vira Mapa', chutes: 'lcs' });
  const rm1 = await Cm.espera(m => m.type === 'room' && m.room && m.room.name === 'Vira Mapa');
  Cm.manda({ type: 'config', mapaDados: { formato: 'racha-mapa', v: 1, nome: 'Arena do Zé', descricao: 'Campo de teste', categoria: 'competitivo', campo: { w: 71, h: 50, margem: 7.5, margemY: 5 }, partida: { equipes: 2, porTime: 2 },
    objetos: [{ id: 'gA', tipo: 'gol', x: -35.5, y: 0, rot: 180, largura: 16, dono: 0 }, { id: 'gB', tipo: 'gol', x: 35.5, y: 0, rot: 0, largura: 16, dono: 1 }], logica: [] } });
  await dorme(400);
  const rm2 = Cm.ultimo(m => m.type === 'room').room;
  const nV3 = V.msgs.length; V.manda({ type: 'join', code: rm2.code, spectate: true });
  const jV = await V.depois(nV3, m => m.type === 'error' || (m.type === 'room' && m.room && m.room.code === rm2.code));
  confere(rm1 && JSON.stringify(rm1.room.chutes) === JSON.stringify(TODOS) && rm2.mapa && rm2.chutes === null && jV && jV.type === 'room',
    'o mapa da Oficina na sala com os chutes: os chutes saem (a partida é a do mapa) e a página antiga já pode entrar', { antes: rm1 && rm1.room.chutes, depois: rm2.chutes, mapa: !!rm2.mapa, entrou: jV && jV.type });
  V.manda({ type: 'leave' }); Cm.manda({ type: 'leave' }); await dorme(150); Cm.fecha();
  // a ranqueada nunca tem os chutes (a turma: poeChutes)
  const poe = require(path.join(RAIZ, 'server', 'turma.js')).Turma.prototype.poeChutes;
  const rr = { jogo: 'futebol', ranked: true }; poe.call({}, rr, TODOS);
  const rm = { jogo: 'futebol', custom: {} }; poe.call({}, rm, TODOS);
  const rc = { jogo: 'futebol' }; poe.call({}, rc, 'ls');
  confere(rr.chutes === null && rm.chutes === null && JSON.stringify(rc.chutes) === '{"lob":true,"curva":false,"super":true}', 'a ranqueada e a sala com mapa da Oficina nunca têm os chutes; a sala de futebol de sempre, sim');
} catch (e) { confere(false, 'o teste pelo WebSocket rodou até o fim', String(e && e.stack || e)); }
finally { for (const c of [A, Bc, V]) c.fecha(); srv.kill(); }
if (/erro no passo|TypeError|ReferenceError/.test(logSrv)) confere(false, 'o servidor não registrou erro', logSrv.split('\n').filter(l => /erro|Error/.test(l)).slice(0, 5));

console.log('\nv99 · os chutes do Rachão nas salas: ' + ok + '/' + (ok + falhou) + ' ok em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(falhou ? 1 : 0);
