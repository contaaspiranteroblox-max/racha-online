"""RACHA v94 · O MOTOR PRÓPRIO NO JOGO (o navegador, a versão de testes): o motor vai junto no jogo, o painel troca de motor
sem misturar números, o campo e os tamanhos passam a ser os da regra do motor, e o treino, a partida contra os bots, o
analógico e a câmera usam o motor próprio. Confere:
  1. o motor no jogo (window.RachaMotor, a mesma versão do servidor) e o padrão da versão oficial;
  2. o painel MOTOR: os dois motores, o PADRÃO v94, os números do motor próprio, as memórias A (v94) e B (motor de antes);
  3. com o motor próprio: o campo de cada tamanho e os raios em px (95 px por metro) e a volta exata para o de antes;
  4. o treino: o toque no CHUTE com a bola no alcance sai na hora com a velocidade do motor; o PASSE → CHUTE combina;
  5. a partida contra os bots (2 VS 2, 40 s de jogo): os bots chutam pelo botão, sai gol, a saída do motor, nada sai do campo;
  6. o analógico: a direção contínua (e 8 direções quando o painel pede);
  7. a câmera: o EQUILIBRADO mostra pelo menos 23 × 13 d e o Deslocamento puxa 0,29/0,13 para a bola;
  8. a pausa: MOTOR ⇄ troca na hora.
Uso: python3 tests/v94_jogo_test.py"""
import asyncio, json
from comum import Placar, abre, rt, async_playwright, RAIZ

CFG = {'experimental': True}


async def main():
    P = Placar('v94 · o motor próprio no jogo')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720, config=CFG)
        # 1) o motor no jogo
        m = await rt(pg, "({v: window.RachaMotor && RachaMotor.VERSAO, padrao: V94_MOTOR_PADRAO, motor: V94.motor, exp: V92.exp})")
        P.confere(m['v'] == '94.0', 'o motor próprio vai junto no jogo (RachaMotor 94.0)', m)
        P.confere(m['exp'] is True, 'a página de teste abre como versão de testes', m)

        # 2) o painel
        pn = await rt(pg, r"""(() => {
          const sub = V92P.segs.sub, bt = sub && [...sub.querySelectorAll('button')].map(x => x.textContent);
          const faixas = Object.keys(V92P.faixas).filter(k => k.startsWith('m-'));
          return {sub: bt, faixas: faixas.length, nomes: V94_NOMES.filter(x => x[0] !== 'g').length,
                  A: V92.slots.A && V92.slots.A.motor, B: V92.slots.B && V92.slots.B.motor,
                  segMotor: !!V92P.segs.motor, segDir: !!V92P.segs.direcoes94, segCam: !!V92P.segs.camera94};
        })()""")
        P.confere(pn['sub'] and pn['sub'][0] == 'MOTOR', 'o painel ganhou a parte MOTOR (a primeira)', pn['sub'])
        P.confere(pn['faixas'] == pn['nomes'] and pn['faixas'] >= 25, 'um deslizante para cada número do motor próprio', pn)
        P.confere(pn['A'] == 'v94' and pn['B'] == 'v93', 'as memórias A (motor próprio) e B (motor de antes) prontas para comparar', pn)
        P.confere(pn['segMotor'] and pn['segDir'] and pn['segCam'], 'os botões do motor, das direções e da câmera', pn)

        # 3) o campo e os tamanhos com o motor próprio (e a volta)
        antes = await rt(pg, "({rj: R_JOG, rb: R_BOLA, L: LX1 - LX0, W: LY1 - LY0, vel: VEL_JOG, alc: ALCANCE_CHUTE, MW, MH})")
        g = await rt(pg, r"""(() => {
          v92Usa(v94CfgPadrao(), 'v94');
          const R = V94.R, G = V94M.campo(modo + 1, R);
          return {motor: V94.motor, rj: R_JOG, rb: R_BOLA, L: LX1 - LX0, W: LY1 - LY0, Lm: G.L*V94_PX, Wm: G.W*V94_PX, vel: VEL_JOG, vm: R.vMax*V94_PX,
                  alc: ALCANCE_CHUTE, alcm: V94M.alcance(R)*V94_PX, campoOk: V94.campoOk, n: modo + 1};
        })()""")
        P.confere(g['motor'] == 'v94' and g['campoOk'], 'o PADRÃO v94 liga o motor próprio no campo de agora', g)
        P.confere(abs(g['rj'] - 38) < 1e-9 and abs(g['rb'] - 19) < 1e-9, 'a tampinha (0,40 m) e a bola (0,20 m) com 38 e 19 px', g)
        P.confere(abs(g['L'] - g['Lm']) < 1e-6 and abs(g['W'] - g['Wm']) < 1e-6, 'o campo do jogo é o da regra do motor', g)
        P.confere(abs(g['vel'] - g['vm']) < 1e-9 and abs(g['alc'] - g['alcm']) < 1e-9, 'a corrida e o alcance que o resto do jogo lê são os do motor', g)
        volta = await rt(pg, r"""(() => { v92Usa(V92.slots.B, 'B');
          return {motor: V94.motor, rj: R_JOG, rb: R_BOLA, L: LX1 - LX0, W: LY1 - LY0, vel: VEL_JOG, alc: ALCANCE_CHUTE, MW, MH}; })()""")
        P.confere(volta['motor'] == 'v93' and all(abs(volta[k] - antes[k]) < 1e-9 for k in antes), 'a memória B volta exatamente ao motor de antes (o campo e os números)', [volta, antes])

        # 4) o treino com o motor próprio: o CHUTE na hora e a combinação
        k = await rt(pg, r"""(() => {
          v92Usa(V92.slots.A, 'A');
          const R = V94.R, S = V94_PX;
          const poe = (bx, by, folga) => { P.x = P.ax = bx - (R.rJ + R.rB + folga)*S; P.y = P.ay = by; P.vx = P.vy = 0; B.x = bx; B.y = by; B.vx = B.vy = 0; B.w = 0; resetBotoes(); guardaAnterior(); };
          poe(CX, CY, 0.05);
          physicsStep(STEP, 0, 0);
          BOTAO.powerL = true; physicsStep(STEP, 0, 0);
          const v1 = Math.hypot(B.vx, B.vy)/S, ev1 = V94J.ev.map(e => e.t + (e.b ? ':' + e.b : ''));
          for (let i = 0; i < 30; i++) physicsStep(STEP, 0, 0);
          poe(CX, CY, 0.005); for (let i = 0; i < 3; i++) physicsStep(STEP, 0, 0);   // (encostada: o DB parado só sai assim)
          BOTAO.kickL = true; physicsStep(STEP, 0, 0);
          const evP = V94J.ev.map(e => e.t + (e.b ? ':' + e.b : ''));
          BOTAO.powerL = true; physicsStep(STEP, 0, 0);
          const evC = V94J.ev.filter(e => e.t === 'chute'), v2 = Math.hypot(B.vx, B.vy)/S;
          return {v1, ev1, evP, comb: evC.length ? evC[0].comb : null, v2, vChute: R.vChute, vPasse: R.vPasse, v1esp: R.vChute*R.fRol - R.freioPasso};
        })()""")
        P.confere(abs(k['v1'] - k['v1esp']) < 1e-9 and 'chute:chute' in k['ev1'], 'o toque no CHUTE com a bola no alcance sai no mesmo passo, com vChute (e o freio do passo)', k)
        P.confere('chute:passe' in k['evP'] and k['comb'] is True and k['v2'] > k['vChute'], 'PASSE e, no passo seguinte, CHUTE: a combinação (mais forte que o CHUTE sozinho)', k)

        # 5) a partida contra os bots
        pt = await rt(pg, r"""(() => {
          try { if (fimAberto()) fechaFim(); } catch (_) {}
          x49Start(2, 0); try { rqVsFecha(); } catch (_) {}
          RQ.autoH = true; ARB_PARADO = function(){ return true; };
          const G = V94.G, S = V94_PX; let fora = 0, chutes = 0, gols = 0, saidas = 0, erro = null, maxv = 0, est = {};
          const nk = RQ.placar ? RQ.placar.slice() : [0, 0];
          try {
            for (let i = 0; i < 60*40; i++){
              guardaAnterior(); physicsStep(STEP, 0, 0);
              if (RQ.estado === 'fim') break;
              est[RQ.estado] = (est[RQ.estado] | 0) + 1;
              for (const e of V94J.ev){ if (e.t === 'chute') chutes++; if (e.t === 'gol') gols++; if (e.t === 'saida') saidas++; }
              const b = V94J.W.bola; maxv = Math.max(maxv, Math.sqrt(b.vx*b.vx + b.vy*b.vy));
              if (b.x < G.area.x0 - 1e-6 || b.x > G.area.x1 + 1e-6 || b.y < G.linhas.y0 - 1e-6 || b.y > G.linhas.y1 + 1e-6) fora++;
              for (const q of V94J.W.jog) if (q.x < G.area.x0 - 1e-6 || q.x > G.area.x1 + 1e-6 || q.y < G.area.y0 - 1e-6 || q.y > G.area.y1 + 1e-6) fora++;
            }
          } catch (e) { erro = String(e && e.stack || e).slice(0, 300); }
          // o gol de verdade (a bola rolando para dentro do gol da direita) e a saída do motor depois da comemoração
          let golEv = 0, estGol = null, saidaMotor = null;
          if (!erro){
            RQ.placar = [0, 0]; RQ.prorrog = false;   // (v95: com o campo maior e o gol de antes, a partida automática pode já ter 2 gols: este seria o 3º e acabaria a partida)
            rqSaida(0); RQ.estado = 'jogo'; V94J.W.estado = 'jogo';   // (uma saída de verdade antes: o motor esquece o gol de antes)
            for (const q of RQ.jog){ q.x = q.ax = CX - 300; q.y = q.ay = CY + 200*(q.k%2 ? 1 : -1); q.vx = q.vy = 0; }
            B.x = LX1 - 0.5*S; B.y = CY; B.vx = 6*S; B.vy = 0;
            for (let i = 0; i < 30 && RQ.estado !== 'gol'; i++){ guardaAnterior(); physicsStep(STEP, 0, 0); for (const e of V94J.ev) if (e.t === 'gol') golEv++; }
            estGol = RQ.estado;
            for (let i = 0; i < 600 && RQ.estado !== 'saida'; i++){ guardaAnterior(); physicsStep(STEP, 0, 0); }
            const W2 = V94J.W, Wf = V94M.copia(W2); V94M.saida(Wf, W2.saidaTime);
            saidaMotor = {estado: W2.estado, rq: RQ.estado, bola: [W2.bola.x, W2.bola.y], igual: W2.jog.every((q, i) => Math.abs(q.x - Wf.jog[i].x) < 1e-9 && Math.abs(q.y - Wf.jog[i].y) < 1e-9)};
          }
          return {erro, fora, chutes, gols, saidas, maxv, vmb: V94.R.vMaxBola, placar: RQ.placar, est, n: V94J.W.jog.length, motor: V94.motor, vale: v94Vale(), golEv, estGol, saidaMotor};
        })()""")
        P.confere(pt['erro'] is None and pt['vale'] and pt['n'] == 4, 'a partida 2 VS 2 roda no motor próprio, sem erro', pt)
        P.confere(pt['chutes'] >= 5, 'os bots (e o jogo por você) chutam pelo botão', pt['chutes'])
        P.confere(pt['saidas'] >= 1, 'a primeira saída é a do motor (a barreira e o fim da saída no toque de quem bate)', pt)
        sm = pt.get('saidaMotor') or {}
        P.confere(pt['golEv'] == 1 and pt['estGol'] == 'gol' and sm.get('estado') == 'saida' and sm.get('rq') == 'saida' and sm.get('igual') and sm.get('bola') == [0, 0],
                  'o gol: um evento, a comemoração e a saída do motor (a formação, a bola no meio)', [pt['golEv'], pt['estGol'], sm])
        P.confere(pt['fora'] == 0 and pt['maxv'] <= pt['vmb'] + 1e-9, 'nada sai do campo e a bola respeita o teto', pt)

        # 6) o analógico
        an = await rt(pg, r"""(() => {
          const a = 10*Math.PI/180, d0 = direcaoOriginal(Math.cos(a), Math.sin(a));
          V92.cfg.direcoes94 = 8; const d8 = direcaoOriginal(Math.cos(a), Math.sin(a)); V92.cfg.direcoes94 = 0;
          // o analógico da tela de verdade (getInput com o dedo a 10°, no meio do curso)
          const R = JOY.max*hud.joy.al, id0 = joy.id; joy.id = 77; joy.dx = Math.cos(a)*R*.6; joy.dy = Math.sin(a)*R*.6; AN.ativo = false;
          const g = getInput(); joy.id = id0; joy.dx = joy.dy = 0; AN.ativo = false;
          return {livre: [d0.mx, d0.my], oito: [d8.mx, d8.my], c: [Math.cos(a), Math.sin(a)], tela: [g.mx, g.my]};
        })()""")
        P.confere(abs(an['livre'][0] - an['c'][0]) <= 5e-4 and abs(an['livre'][1] - an['c'][1]) <= 5e-4 and an['livre'][1] > 0.17, 'o analógico: a direção contínua (10° fica 10°, com 3 casas no comando)', an)
        P.confere(abs(an['oito'][0] - 1) < 1e-12 and abs(an['oito'][1]) < 1e-12, '   com 8 direções no painel, 10° vira 0°', an)
        P.confere(abs(an['tela'][0] - an['c'][0]) <= 5e-4 and abs(an['tela'][1] - an['c'][1]) <= 5e-4, '   e o analógico da tela (getInput) também: o dedo a 10° anda a 10°', an)

        # 7) a câmera
        cm = await rt(pg, r"""(() => {
          cam.mode = 'seguir'; cam.estilo = 'jogador'; cam.preset = 'equilibrado'; cam.desl = DESL_MAX;
          const z = camZoomDe('equilibrado'), d = 2*R_JOG, larg = W/z/d, alt = H/z/d;
          VIS.px = CX; VIS.py = CY; VIS.bx = CX + 1000; VIS.by = CY + 1000; CAMV.ax = CAMV.ay = 0;
          const a = alvoCamera(W/(2*z), H/(2*z), {x: CX, y: CY, r: R_JOG});
          V92.cfg.camera94 = 'antes'; const z2 = camZoomDe('equilibrado'); V92.cfg.camera94 = 'obs';
          return {larg, alt, ax: (a.x - CX)/1000, ay: (a.y - CY)/1000, zAntes: z2, z};
        })()""")
        P.confere(cm['larg'] >= 23 - 1e-6 and cm['alt'] >= 13 - 1e-6 and (abs(cm['larg'] - 23) < 1e-6 or abs(cm['alt'] - 13) < 1e-6), 'a câmera EQUILIBRADO mostra pelo menos 23 × 13 d (justo numa das direções)', cm)
        P.confere(abs(cm['ax'] - 0.29) < 1e-9 and abs(cm['ay'] - 0.13) < 1e-9, 'o Deslocamento no 10 puxa 0,29 de lado e 0,13 de cima a baixo', cm)

        # 8) a pausa
        pa = await rt(pg, r"""(() => { const m = document.getElementById('pa-v94motor'); if (!m) return null;
          const t0 = m.textContent, a = V92.cfg.motor; m.click(); const b = V92.cfg.motor, t1 = m.textContent; m.click();
          return {t0, t1, a, b, c: V92.cfg.motor}; })()""")
        P.confere(pa and pa['a'] != pa['b'] and pa['c'] == pa['a'] and pa['t0'] != pa['t1'], 'a pausa: MOTOR ⇄ troca na hora e volta', pa)
        P.confere(not [e for e in erros if 'favicon' not in e], 'sem erro na página', erros[:5])
        await b.close()
    return P.fim()


if __name__ == '__main__':
    raise SystemExit(asyncio.run(main()))
