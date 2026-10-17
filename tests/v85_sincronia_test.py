"""RACHA v85 · o mesmo lance no aparelho e no servidor dá o mesmo resultado (física FR-85, núcleo compartilhado).

O teste monta um lance roteirizado — a tampinha corre, chuta, vira, solta o analógico, conduz — e roda:
  · no jogo (tests/build/racha_teste.html, o physicsStep de verdade, Arena 1v1, treino livre, o quadro parado);
  · no servidor (server/partida/fisica.js, a mesma quadra, uma tampinha só).
Compara posição e velocidade da tampinha e da bola passo a passo. Como o código da física é o MESMO arquivo nos dois
lados (server/partida/nucleo_fisica.js), a diferença tem de ser zero (só ruído de ponto flutuante).
Uso: python3 tests/v85_sincronia_test.py"""
import asyncio, json, subprocess, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from comum import abre, Placar, RAIZ
from playwright.async_api import async_playwright

# o roteiro: (de, até) em passos → analógico (mx, my); e os passos em que um chute é tentado (força: 'passe' ou 'chute')
ROTEIRO = [(0, 40, 0.83, -0.55), (40, 70, 0, 1), (70, 110, -1, -1), (110, 150, 0, 0), (150, 230, 1, 0.3), (230, 300, -0.5, 1), (300, 360, 0, 0)]
CHUTES = {18: 'passe', 22: 'passe', 26: 'chute', 30: 'chute', 34: 'chute', 190: 'passe', 205: 'passe', 220: 'chute'}
# começo: a tampinha embaixo à esquerda da bola; a bola fora da linha dos gols (o chute vai na lateral de cima)
INICIO = {'p': [-8, 6], 'b': [-2, 2]}
PASSOS = 360

JS_JOGO = r"""(() => {
  ARB_PARADO = function(){ return true; };          // (o quadro do jogo não chama a física: o teste dá os passos)
  if (typeof lobby !== 'undefined' && lobby.aberto){ lobby.aberto = false; if (LB && LB.raiz) LB.raiz.hidden = true; }
  RQ.on = false; if (TR) TR.on = false;
  aplicaModo(0, 0); resetAll();
  const R = %s, C = %s, I = %s, out = [];
  P.x = CX + U(I.p[0]); P.y = CY + U(I.p[1]); B.x = CX + U(I.b[0]); B.y = CY + U(I.b[1]); guardaAnterior();
  const forca = s => s === 'chute' ? FORCA_POWER : FORCA_KICK;
  const tentou = [];
  for (let i = 0; i < %d; i++){
    let mx = 0, my = 0; for (const r of R) if (i >= r[0] && i < r[1]){ mx = r[2]; my = r[3]; }
    if (C[i]){ const d = Math.hypot(B.x - P.x, B.y - P.y); tentou.push([i, d <= ALCANCE_CHUTE - 2 && kickBall(forca(C[i])) ? 1 : 0, d]); }
    guardaAnterior(); physicsStep(STEP, mx, my);
    out.push([P.x, P.y, P.vx, P.vy, B.x, B.y, B.vx, B.vy]);
  }
  return {out, tentou, geo:[MW, MH, CX, CY, LX0, LX1, LY0, LY1, GOL_Y0, GOL_Y1], ini:[START_P.x, START_P.y], gols:goals};
})()"""

NODE = r"""
const F = require(process.argv[1] + '/server/partida/fisica.js');
const { R, C, PASSOS, ok, I } = JSON.parse(process.argv[2]);
const sim = F.novaSimulacao(1); sim.jog = [sim.jog[0]];
const G = sim.campo, j = sim.jog[0], B = sim.bola;
j.x = G.CX + F.U(I.p[0]); j.y = G.CY + F.U(I.p[1]); j.vx = j.vy = 0; B.x = G.CX + F.U(I.b[0]); B.y = G.CY + F.U(I.b[1]);
const out = [], forca = s => s === 'chute' ? F.FORCA_POWER : F.FORCA_KICK;
for (let i = 0; i < PASSOS; i++) {
  let mx = 0, my = 0; for (const r of R) if (i >= r[0] && i < r[1]) { mx = r[2]; my = r[3]; }
  if (ok[i]) F.chute(sim, 0, forca(C[i]));
  F.entrada(sim, 0, mx, my);
  F.passo(sim);
  out.push([j.x, j.y, j.vx, j.vy, B.x, B.y, B.vx, B.vy]);
}
console.log(JSON.stringify({ out, geo: [G.MW, G.MH, G.CX, G.CY, G.LX0, G.LX1, G.LY0, G.LY1, G.GOL_Y0, G.GOL_Y1] }));
"""


async def principal():
    P = Placar('v85 · o mesmo lance no aparelho e no servidor')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        r = await pg.evaluate('window.__RT(%s)' % json.dumps(JS_JOGO % (json.dumps([list(x) for x in ROTEIRO]), json.dumps({str(k): v for k, v in CHUTES.items()}), json.dumps(INICIO), PASSOS)))
        await b.close()
    ok = {t[0]: t[1] for t in r['tentou']}
    srv = json.loads(subprocess.run(['node', '-e', NODE, str(RAIZ), json.dumps({'R': ROTEIRO, 'C': {str(k): v for k, v in CHUTES.items()}, 'PASSOS': PASSOS, 'ok': {str(k): v for k, v in ok.items()}, 'I': INICIO})],
                                    capture_output=True, text=True, check=True).stdout)
    P.confere(all(abs(a - c) < 1e-9 for a, c in zip(r['geo'], srv['geo'])), 'a quadra é a mesma (mundo, linhas e gols)', {'jogo': r['geo'], 'servidor': srv['geo']})
    P.confere(sum(ok.values()) >= 1, 'o roteiro tem chutes de verdade (a bola no alcance)', r['tentou'])
    dif = max(max(abs(a - c) for a, c in zip(x, y)) for x, y in zip(r['out'], srv['out']))
    pior = max(range(PASSOS), key=lambda i: max(abs(a - c) for a, c in zip(r['out'][i], srv['out'][i])))
    P.confere(dif < 1e-6, '%d passos: tampinha e bola iguais nos dois lados (maior diferença %.2e px)' % (PASSOS, dif), {'passo': pior, 'jogo': r['out'][pior], 'servidor': srv['out'][pior]})
    andou = max(abs(x[4] - r['out'][0][4]) + abs(x[5] - r['out'][0][5]) for x in r['out'])
    P.confere(andou > 200, 'a bola andou de verdade no lance (não é um teste vazio)', {'andou_px': andou})
    P.confere(r['gols'] == 0, 'sem gol no roteiro (o servidor para no gol; o treino livre não)', r['gols'])
    P.confere(not [e for e in erros if 'Failed to load resource' not in e], 'nenhum erro de JavaScript', erros[:3])
    return P.fim()

if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
