"""RACHA v86 · a mecânica clássica de volta (a da v84) e a força do chute (v87.1: 15% abaixo da versão antiga).

Confere no jogo de verdade (tests/build/racha_teste.html) e no servidor (server/partida/fisica.js e o motor das salas,
server/partida/sala.js — o que roda as salas hospedadas):
  1. os números: PASSE 212,5 e CHUTE 340 (eram 250 e 400; na v86, 275 e 440) e o teto da bola 46,75 u/s (era 55; na v86,
     60), iguais no jogo e no servidor;
     o resto da física igual ao da v84 (corrida, raios, massas, bola, materiais, alcance, quadras);
  2. a bola parada depois do PASSE e do CHUTE: Δv = força ÷ massa da bola = 21,25 e 34 u/s (15% a menos que os 25 e 40
     da v84) — no kickBall, pelos botões de verdade (Espaço e K), na partida autoritativa e no motor das salas (pelo chute e
     pelo comando da rede, o mesmo valor do aparelho);
  3. o teto: o CHUTE numa bola que já corre na mesma direção para em 46,75 u/s (jogo, partida autoritativa e sala);
  4. a mecânica clássica: o analógico de 32 direções (o mesmo no jogo e no servidor), os botões 1/2/3 com os 0,02 s,
     o movimento que soma e corta no teto, a quadra da v84;
  5. nenhum erro de JavaScript.
Uso: python3 tests/v86_chute_test.py"""
import asyncio, json, math, subprocess, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from comum import abre, Placar, RAIZ, rt
from playwright.async_api import async_playwright

ENTRADAS = [[math.cos(a)*r, math.sin(a)*r] for a, r in [(i*0.377 + 0.05, 0.3 + (i % 5)*0.17) for i in range(64)]]

JS_JOGO = r"""(() => {
  ARB_PARADO = function(){ return true; };            // (o quadro do jogo não chama a física: o teste dá os passos)
  if (typeof lobby !== 'undefined' && lobby.aberto){ lobby.aberto = false; if (LB && LB.raiz) LB.raiz.hidden = true; }
  RQ.on = false; if (TR) TR.on = false;
  aplicaModo(0, 0); resetAll();
  const r = {};
  r.k = {FORCA_KICK, FORCA_POWER, LIMITE_VEL_BOLA, VEL_JOG, R_JOG, RAIO_CHUTE, R_BOLA, MASSA_BOLA, MASSA_JOG, FATOR_BOLA,
         AMORT_ANGULAR, ATRITO_BOLA, ATRITO_JOG_BOLA, ALCANCE_CHUTE, TICKS_POR_S, PX_POR_U, COOLDOWN_BOTAO,
         MODOS:MODOS.map(m => [m.jog, m.bola, m.gol, m.trave, m.rede]), fatorArena:CAMPOS[0].fatorBola};
  const poe = (bvx) => { resetBotoes(); P.x = CX - U(3.2); P.y = CY; P.vx = P.vy = 0; B.x = CX; B.y = CY; B.vx = bvx || 0; B.vy = 0; B.w = 0; guardaAnterior(); };
  // 1) o kickBall com a bola parada
  poe(); r.passe = kickBall(FORCA_KICK) ? Math.hypot(B.vx, B.vy) : -1;
  poe(); r.chute = kickBall(FORCA_POWER) ? Math.hypot(B.vx, B.vy) : -1;
  // 2) pelos botões de verdade: o teclado (K = CHUTE, Espaço = PASSE), um passo da física
  poe(); keys.KeyK = true; physicsStep(STEP, 0, 0); keys.KeyK = false; r.botaoChute = Math.hypot(B.vx, B.vy); r.estadoChute = BOTAO.estado;
  physicsStep(STEP, 0, 0); r.estadoSolto = BOTAO.estado;
  poe(); keys.Space = true; physicsStep(STEP, 0, 0); keys.Space = false; r.botaoPasse = Math.hypot(B.vx, B.vy); r.estadoPasse = BOTAO.estado;
  physicsStep(STEP, 0, 0);
  // os 0,02 s entre trocas de botão (a regra da v84): do PASSE para o CHUTE no passo seguinte (16,7 ms) o aperto ainda não
  // vale (o estado fica no neutro); no outro passo (33 ms) vale
  poe(); keys.Space = true; physicsStep(STEP, 0, 0); keys.Space = false; keys.KeyK = true; physicsStep(STEP, 0, 0); r.trocaRapida = BOTAO.estado;
  physicsStep(STEP, 0, 0); r.trocaDepois = BOTAO.estado; keys.KeyK = false; physicsStep(STEP, 0, 0);
  // 3) o teto: a bola já correndo a 40 u/s para a frente leva o CHUTE (+44): no passo, ela para no teto
  poe(U(40)); r.antesTeto = kickBall(FORCA_POWER) ? Math.hypot(B.vx, B.vy) : -1; physicsStep(STEP, 0, 0); r.teto = Math.hypot(B.vx, B.vy);
  // e chutando atrás dela por 3 s, a bola nunca passa do teto
  poe(); let maxV = 0, chutes = 0;
  for (let i = 0; i < 180; i++){
    const dx = B.x - P.x, dy = B.y - P.y, d = Math.hypot(dx, dy) || 1;
    if (B.x > LX1 - U(12)){ B.x = CX - U(8); P.x = B.x - U(3.2); P.y = B.y; guardaAnterior(); }
    if (d <= ALCANCE_CHUTE && kickBall(FORCA_POWER)) chutes++;
    physicsStep(STEP, dx/d, dy/d);
    maxV = Math.max(maxV, Math.hypot(B.vx, B.vy));
  }
  r.maxV = maxV; r.chutesTeto = chutes;
  // 4) a mecânica clássica: o analógico de 32 direções e o movimento que soma e corta no teto
  r.dirs = %s.map(e => { const d = direcaoOriginal(e[0], e[1]); return [d.mx, d.my]; });
  poe(); physicsStep(STEP, 0, 1); const v1 = [P.vx, P.vy]; physicsStep(STEP, -1, -1); r.mov = {v1, v2:[P.vx, P.vy]}; physicsStep(STEP, 0, 0); r.mov.solto = [P.vx, P.vy];
  r.quadra = [LX1 - LX0, LY1 - LY0, GOL_Y1 - GOL_Y0];
  return r;
})()"""

NODE = r"""
const RAIZ = process.argv[1], ENTRADAS = JSON.parse(process.argv[2]);
const F = require(RAIZ + '/server/partida/fisica.js');
const { PartidaSala } = require(RAIZ + '/server/partida/sala.js');
const out = {};
out.k = {FORCA_KICK:F.FORCA_KICK, FORCA_POWER:F.FORCA_POWER, LIMITE_VEL_BOLA:F.LIMITE_VEL_BOLA, VEL_JOG:F.VEL_JOG, R_JOG:F.R_JOG,
         RAIO_CHUTE:F.RAIO_CHUTE, R_BOLA:F.R_BOLA, MASSA_BOLA:F.MASSA_BOLA, MASSA_JOG:F.MASSA_JOG, FATOR_BOLA:F.FATOR_BOLA,
         AMORT_ANGULAR:F.AMORT_ANGULAR, ATRITO_BOLA:F.ATRITO_BOLA, ATRITO_JOG_BOLA:F.ATRITO_JOG_BOLA, ALCANCE_CHUTE:F.ALCANCE_CHUTE,
         TICKS_POR_S:F.TICKS_POR_S, PX_POR_U:F.PX_POR_U, MODOS:F.MODOS.map(m => [m.jog, m.bola, m.gol, m.trave, m.rede])};
// a partida autoritativa (fisica.js): o chute da bola parada e o teto
for (const [nome, f] of [['passe', F.FORCA_KICK], ['chute', F.FORCA_POWER]]) {
  const sim = F.novaSimulacao(1), j = sim.jog[0], B = sim.bola;
  j.x = B.x - F.U(3.2); j.y = B.y; B.vx = B.vy = 0;
  out['auto_' + nome] = F.chute(sim, 0, f) ? Math.hypot(B.vx, B.vy) : -1;
}
{ const sim = F.novaSimulacao(1), j = sim.jog[0], B = sim.bola;
  j.x = B.x - F.U(3.2); j.y = B.y; B.vx = F.U(40); B.vy = 0;
  F.chute(sim, 0, F.FORCA_POWER); out.auto_antesTeto = Math.hypot(B.vx, B.vy); F.passo(sim); out.auto_teto = Math.hypot(B.vx, B.vy); }
// o motor das salas (sala.js): o chute direto e pelo comando da rede (button 3 = CHUTE, 2 = PASSE)
function novaSala() {
  let t = 1000; const agora = () => t; agora.anda = ms => { t += ms; };
  const p = new PartidaSala({ n: 1, jogo: 'futebol', map: 0, tempo: 0, regra: null,
    jogadores: [{ netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Bia' }], agora });
  for (const q of p.jog) if (q.netId && !q.fila) {
    q.fila = { fila: [], chegou: 1, min: 99, n: 0, ult: null, feito: 0, visto: 0 };
    q.netButton = { estado: 1, livre: true, t: 0, ultimo: -1e9 };
    q.cv70 = { carga: 0, segura: false, arma: 0, armaC: 0 };
  }
  p.on = true; p.estado = 'jogo';
  const q = p.jog.find(x => x.netId === 'A'), o = p.jog.find(x => x.netId === 'B');
  o.x = p.B.x + F.U(20); o.y = p.B.y + F.U(12); o.vx = o.vy = 0;
  q.x = p.B.x - F.U(3.2); q.y = p.B.y; q.vx = q.vy = 0; p.B.vx = p.B.vy = 0; p.B.w = 0;
  return { p, q, agora };
}
{ const { p, q } = novaSala(); out.sala_passe = p.chuta(q, F.FORCA_KICK) ? Math.hypot(p.B.vx, p.B.vy) : -1; }
{ const { p, q } = novaSala(); out.sala_chute = p.chuta(q, F.FORCA_POWER) ? Math.hypot(p.B.vx, p.B.vy) : -1; }
for (const [nome, bt] of [['passe', 2], ['chute', 3]]) {
  const { p, q } = novaSala();
  p.entrada('A', { seq: 1, x: 0, y: 0, button: bt, k: 0 }); p.passo();
  out['sala_cmd_' + nome] = Math.hypot(p.B.vx, p.B.vy);
}
{ const { p, q } = novaSala(); p.B.vx = F.U(40);
  out.sala_antesTeto = p.chuta(q, F.FORCA_POWER) ? Math.hypot(p.B.vx, p.B.vy) : -1;
  q.fila.chegou = 0; p.passo(); out.sala_teto = Math.hypot(p.B.vx, p.B.vy); }
out.dirs = ENTRADAS.map(e => { const d = F.direcaoOriginal(e[0], e[1]); return [d.mx, d.my]; });
console.log(JSON.stringify(out));
"""


async def principal():
    P = Placar('v86 · a mecânica clássica e a força do chute (v87.1)')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        r = await rt(pg, JS_JOGO % json.dumps(ENTRADAS))
        await b.close()
    s = json.loads(subprocess.run(['node', '-e', NODE, str(RAIZ), json.dumps(ENTRADAS)], capture_output=True, text=True, check=True).stdout)
    k = r['k']; U = lambda v: v*k['PX_POR_U']
    dv_passe, dv_chute = U(k['FORCA_KICK']/k['MASSA_BOLA']), U(k['FORCA_POWER']/k['MASSA_BOLA'])
    perto = lambda a, c, tol=1e-6: abs(a - c) <= tol*max(1, abs(c))

    print('\n1) os números')
    P.confere(k['FORCA_KICK'] == 212.5 and k['FORCA_POWER'] == 340, 'no jogo: PASSE 212,5 e CHUTE 340 (v84: 250 e 400 — 15% a menos; na v86, 275 e 440)', k)
    P.confere(perto(k['LIMITE_VEL_BOLA'], U(46.75)), 'no jogo: o teto da bola é 46,75 u/s = %.2f px/s (v84: 55 — 15%% a menos)' % U(46.75), k['LIMITE_VEL_BOLA'])
    iguais = {n: (k[n], s['k'][n]) for n in s['k'] if json.dumps(k[n]) != json.dumps(s['k'][n])}
    P.confere(not iguais, 'o servidor usa os MESMOS números do jogo (%d constantes, as quadras inclusive)' % len(s['k']), iguais)
    v84 = {'VEL_JOG': U(14.1), 'R_JOG': U(2.0), 'RAIO_CHUTE': U(2.5), 'R_BOLA': U(1.0), 'MASSA_BOLA': 10, 'MASSA_JOG': 1.25, 'FATOR_BOLA': 0.99,
           'COOLDOWN_BOTAO': 0.02, 'TICKS_POR_S': 60}
    dif = {n: (k[n], v) for n, v in v84.items() if not perto(k[n], v)}
    P.confere(not dif and k['fatorArena'] == k['FATOR_BOLA'], 'o resto da física é o da v84 (corrida, raios, massas, bola, botões, passo)', dif)

    print('\n2) a bola parada depois do PASSE e do CHUTE')
    P.confere(perto(r['passe'], dv_passe) and perto(r['chute'], dv_chute),
              'kickBall: o PASSE sai a %.2f px/s (21,25 u/s) e o CHUTE a %.1f px/s (34 u/s)' % (r['passe'], r['chute']), r)
    P.confere(perto(r['botaoChute'], dv_chute*k['FATOR_BOLA']) and perto(r['botaoPasse'], dv_passe*k['FATOR_BOLA']) and r['estadoChute'] == 3 and r['estadoPasse'] == 2,
              'pelos botões de verdade (K e Espaço): o chute sai no mesmo passo (%.1f e %.1f px/s depois do 0,99 do passo)' % (r['botaoChute'], r['botaoPasse']),
              {k2: r[k2] for k2 in ('botaoChute', 'botaoPasse', 'estadoChute', 'estadoPasse')})
    P.confere(perto(s['auto_passe'], dv_passe) and perto(s['auto_chute'], dv_chute), 'na partida autoritativa (fisica.js): os mesmos %.1f e %.1f px/s' % (s['auto_passe'], s['auto_chute']), s)
    P.confere(perto(s['sala_passe'], dv_passe) and perto(s['sala_chute'], dv_chute), 'no motor das salas (sala.js): os mesmos %.1f e %.1f px/s' % (s['sala_passe'], s['sala_chute']), s)
    P.confere(perto(s['sala_cmd_chute'], r['botaoChute']) and perto(s['sala_cmd_passe'], r['botaoPasse']),
              'pelo comando da rede (button 3 e 2), a sala do servidor dá o MESMO chute do aparelho (%.3f / %.3f px/s)' % (s['sala_cmd_chute'], s['sala_cmd_passe']),
              {'sala': [s['sala_cmd_chute'], s['sala_cmd_passe']], 'jogo': [r['botaoChute'], r['botaoPasse']]})
    dist = dv_chute/k['TICKS_POR_S']/(1 - k['FATOR_BOLA'])/k['PX_POR_U']
    print('  (o CHUTE da bola parada rola uns %.0f u até parar sem bater em nada; na v84, %.0f u)' % (dist, dist*40/34))

    print('\n3) o teto')
    teto = U(46.75)
    P.confere(perto(r['antesTeto'], U(74)) and perto(r['teto'], teto), 'no jogo: a bola a 40 u/s leva o CHUTE (vai a 74 u/s) e no passo para em 46,75 u/s (%.2f px/s)' % r['teto'], r)
    P.confere(r['maxV'] <= teto + 1e-6 and r['chutesTeto'] >= 3, 'chutando atrás da bola por 3 s (%d chutes), ela nunca passa do teto (máx. %.1f px/s)' % (r['chutesTeto'], r['maxV']), r)
    P.confere(perto(s['auto_teto'], teto) and perto(s['sala_teto'], teto), 'no servidor também: %.1f (autoritativa) e %.1f px/s (sala)' % (s['auto_teto'], s['sala_teto']), s)

    print('\n4) a mecânica clássica')
    S = 2*math.pi/32
    quant = all(abs(math.atan2(d[1], d[0])/S - round(math.atan2(d[1], d[0])/S)) < 1e-9 and abs(math.hypot(*d) - 1) < 1e-9 for d in r['dirs'])
    P.confere(quant, 'o analógico do jogo anda em 32 direções (11,25°), com a mesma velocidade perto ou longe do centro', r['dirs'][:3])
    P.confere(all(abs(a[0] - c[0]) < 1e-12 and abs(a[1] - c[1]) < 1e-12 for a, c in zip(r['dirs'], s['dirs'])), 'o servidor arredonda a direção igual ao jogo (%d entradas)' % len(ENTRADAS))
    v1, v2, solto = r['mov']['v1'], r['mov']['v2'], r['mov']['solto']
    vj = k['VEL_JOG']; e = vj/math.sqrt(2)
    P.confere(perto(v1[1], vj) and perto(v2[0], -e) and perto(v2[1], vj - e) and solto == [0, 0],
              'o movimento soma a direção nova à velocidade e corta no teto; soltou, para na hora (v84)', r['mov'])
    P.confere(r['trocaRapida'] == 1 and r['trocaDepois'] == 3 and r['estadoSolto'] == 1,
              'os botões 1/2/3 da v84: do PASSE para o CHUTE em menos de 0,02 s o aperto ainda não vale; depois vale; soltou, volta ao 1',
              {k2: r[k2] for k2 in ('trocaRapida', 'trocaDepois', 'estadoSolto')})
    P.confere(perto(r['quadra'][0], U(56)) and perto(r['quadra'][1], U(40)) and perto(r['quadra'][2], U(12.8)), 'a quadra do 1v1 é a da v84 (56 × 40 u, gol de 12,8 u)', r['quadra'])
    P.confere(not [x for x in erros if 'Failed to load resource' not in x], 'nenhum erro de JavaScript', erros[:3])
    return P.fim()

if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
