"""Etapa 2 · câmeras: o seu jogador inteiro na tela (4v4 e 3v3, zoom alto, bola longe), enquadramentos por tamanho de time,
suavidade e resposta, zoom automático sem vaivém, setinhas fora da tela longe dos controles, a sua setinha (VOCÊ) e o rótulo
do espectador.

Rodar:  python3 tests/camera_test.py
        RACHA_TESTE=<cópia da versão anterior>.html python3 tests/camera_test.py --antes   (só a medida do jogador cortado)
"""
import sys, json
from comum import abre, rt, roda, Placar, async_playwright

ANTES = '--antes' in sys.argv

# o jogador num canto, a bola no canto oposto; a câmera roda 3 s de quadros (60 por segundo) e mede o pior quadro
CANTO = r"""((n, estilo, preset, zoom, desl, mexe) => {
  const T = __T; T.comeca('futebol', n, 0); T.limpa();
  cam.mode = 'seguir'; cam.estilo = estilo; cam.zoom = zoom; cam.desl = desl;
  if ('preset' in cam) cam.preset = preset;
  if ('auto' in cam) cam.auto = false;
  const m = R_JOG*1.2;
  const px0 = LX0 + m, py0 = LY0 + m, bx = LX1 - m, by = LY1 - m;
  T.poe(P, px0, py0); T.bola(bx, by);
  posVisual(1); updateCamera(1/60, true);
  let pior = {corte:0, centro:0, livre:true, quadro:-1};
  const livre = typeof camLivre === 'function' ? camLivre() : {L:0, R:0, T:0, B:0};
  for (let i = 0; i < 180; i++){
    if (mexe){ const a = i/180*Math.PI; P.x = px0 + (LX1 - LX0 - 2*m)*.5*(1 - Math.cos(a)); P.y = py0 + (i % 60 < 30 ? 0 : 6); }   // corre pela beira de cima
    posVisual(1); updateCamera(1/60, false);
    const z = cam.z, sx = W/2 + (VIS.px - cam.x)*z, sy = H/2 + (VIS.py - cam.y)*z, r = P.r*z;
    const fora = Math.max(0, -(sx - r), (sx + r) - W, -(sy - r), (sy + r) - H);        // quanto do corpo passou da beira (px)
    const corte = Math.min(1, fora/(2*r));                                              // parte do diâmetro cortada (0 a 1+)
    const centro = Math.max(0, -sx, sx - W, -sy, sy - H)/r;                              // o centro fora da tela, em raios
    const ok = sx - r >= livre.L && sx + r <= W - livre.R && sy - r >= livre.T && sy + r <= H - livre.B;
    if (corte > pior.corte || centro > pior.centro || (!ok && pior.livre)) pior = {corte, centro, livre:ok && pior.livre, quadro:i, sx, sy, r, z};
  }
  return {n, estilo, preset, zoom, z:cam.z, pior, livre};
})"""

PRESETS = r"""(() => {
  const out = {};
  for (const n of [1, 2, 3, 4]){
    __T.comeca('futebol', n, 0); cam.mode = 'seguir'; cam.estilo = 'jogador';
    const r = {};
    for (const p of ['perto', 'equilibrado', 'campo']){ cam.preset = p; r[p] = {z:+zoomAlvo().toFixed(3), pct:camPresetPct(p)}; }
    // Campo inteiro: a quadra inteira cabe na tela
    cam.preset = 'campo'; posVisual(1); updateCamera(1/60, true);
    const z = cam.z, sx0 = W/2 + (LX0 - cam.x)*z, sx1 = W/2 + (LX1 - cam.x)*z, sy0 = H/2 + (LY0 - cam.y)*z, sy1 = H/2 + (LY1 - cam.y)*z;
    r.campoCabe = sx0 >= -1 && sx1 <= W + 1 && sy0 >= -1 && sy1 <= H + 1;
    out[n] = r;
  }
  cam.preset = 'equilibrado';
  return out;
})()"""

# suavidade e resposta: a bola chutada de um lado para o outro (o alvo pula); mede o maior passo e a maior mudança de velocidade
# da câmera por quadro (px da tela) e quanto tempo leva para chegar perto do alvo novo
SUAVE = r"""(() => {
  const T = __T; T.comeca('futebol', 2, 0); T.limpa();
  cam.mode = 'seguir'; cam.estilo = 'jogador'; cam.preset = 'equilibrado'; cam.desl = 10; cam.auto = false;
  T.poe(P, CX, CY); T.bola(CX + 30, CY); posVisual(1); updateCamera(1/60, true);
  let maxPasso = 0, maxAcel = 0, vAnt = 0, xAnt = cam.x, t90 = null;
  const x0 = cam.x;
  T.bola(CX + 700, CY + 200);                           // o chute: o ponto médio pula 350 px
  posVisual(1);
  const alvoX = (() => { const sv = {x:cam.x, y:cam.y, vx:CAMV.vx, vy:CAMV.vy}; for (let i = 0; i < 600; i++) updateCamera(1/60, false); const a = cam.x; cam.x = sv.x; cam.y = sv.y; CAMV.vx = sv.vx; CAMV.vy = sv.vy; return a; })();
  for (let i = 0; i < 120; i++){
    updateCamera(1/60, false);
    const passo = Math.abs(cam.x - xAnt)*cam.z, acel = Math.abs(passo - vAnt);
    maxPasso = Math.max(maxPasso, passo); if (i > 0) maxAcel = Math.max(maxAcel, acel);
    vAnt = passo; xAnt = cam.x;
    if (t90 === null && Math.abs(cam.x - alvoX) <= .1*Math.abs(alvoX - x0)) t90 = (i + 1)/60;
  }
  return {salto:Math.round((alvoX - x0)*cam.z), maxPasso:+maxPasso.toFixed(1), maxAcel:+maxAcel.toFixed(1), t90};
})()"""

AUTO = r"""(() => {
  const T = __T; T.comeca('futebol', 4, 0); T.limpa();
  cam.mode = 'seguir'; cam.estilo = 'jogador'; cam.preset = 'perto'; cam.desl = 10; cam.auto = true;
  T.poe(P, CX - 300, CY); T.bola(CX - 240, CY); posVisual(1); updateCamera(1/60, true);
  const z0 = cam.z, zs = [];
  const roteiro = i => i < 60 ? CX - 240 : i < 240 ? CX + 900 : i < 300 ? CX + 900 - (i - 240)*19 : CX - 240;   // perto → longe → volta
  for (let i = 0; i < 600; i++){ B.x = roteiro(i); posVisual(1); updateCamera(1/60, false); zs.push(cam.z); }
  let inv = 0, ult = 0; for (let i = 1; i < zs.length; i++){ const d = zs[i] - zs[i - 1]; if (Math.abs(d) < 1e-5) continue; const s = Math.sign(d); if (ult && s !== ult) inv++; ult = s; }
  let maxDz = 0; for (let i = 1; i < zs.length; i++) maxDz = Math.max(maxDz, Math.abs(zs[i] - zs[i - 1])*60/z0);
  const zMin = Math.min(...zs);
  cam.auto = false; cam.preset = 'equilibrado';
  return {z0, zMin, zFim:zs[zs.length - 1], abriu:1 - zMin/z0, inversoes:inv, maxDzPorS:maxDz};
})()"""

SETAS = r"""(() => {
  const T = __T; T.comeca('futebol', 2, 0); T.limpa();
  cam.mode = 'seguir'; cam.estilo = 'jogador'; cam.preset = 'perto'; cam.auto = false;
  T.poe(P, CX, CY); T.bola(CX, CY + 60); posVisual(1); updateCamera(1/60, true);
  const obs = foraObstaculos(), rr = FORA_TELA.r*1.45, res = [];
  // direções que, sem desvio, cairiam em cima do PASSE, do CHUTE, do analógico e do placar
  const alvos = [['kick', hud.kick.x, hud.kick.y], ['power', hud.power.x, hud.power.y], ['joy', hud.joy.x, hud.joy.y], ['placar', W/2, 20], ['pausa', BTN_PAUSA.x + 40, BTN_PAUSA.y + 40]];
  for (const [nome, x, y] of alvos){
    const p = foraNaBeira(x - W/2, y - H/2, obs, rr);
    res.push({nome, livre:foraLivre(p[0], p[1], rr, obs), p:[Math.round(p[0]), Math.round(p[1])]});
  }
  // a sua setinha: com Seguir bola e você longe da bola, o VOCÊ aparece
  const chamadas = []; const mf = marcadorFora; marcadorFora = function(g, x, y, ang, cor, bola){ chamadas.push({x, y, cor, bola}); return mf.apply(this, arguments); };
  const tx = []; const tf = txt; txt = function(g, s){ if (s === 'VOCÊ') tx.push(s); return tf.apply(this, arguments); };
  cam.estilo = 'bola'; T.poe(P, LX0 + 60, LY0 + 60); T.bola(LX1 - 60, LY1 - 60); posVisual(1); updateCamera(1/60, true);
  ctx.setTransform(K, 0, 0, K, 0, 0); desenhaForaDaTela(ctx);
  const comVoce = tx.length;
  cam.estilo = 'jogador'; posVisual(1); updateCamera(1/60, true); tx.length = 0;
  ctx.setTransform(K, 0, 0, K, 0, 0); desenhaForaDaTela(ctx);
  const semVoce = tx.length;
  marcadorFora = mf; txt = tf; cam.preset = 'equilibrado';
  return {res, comVoce, semVoce};
})()"""

ESPEC = r"""(() => {
  const T = __T; T.comeca('futebol', 2, 0); T.limpa();
  const sv = {playing:NET49.playing, slot:NET49.localSlot};
  NET49.playing = true; NET49.localSlot = -1;
  const nomes = [especTroca(), especTroca(), especTroca(), especTroca(), especTroca(), especTroca()];   // (v88: depois dos 4 jogadores, o CAMPO INTEIRO e a bola)
  ESPEC.alvo = 1; const q = RQ.jog[1]; T.poe(q, LX1 - 80, LY1 - 80); T.bola(LX0 + 80, LY0 + 80);
  cam.mode = 'seguir'; cam.estilo = 'jogador'; cam.preset = 'perto'; posVisual(1); updateCamera(1/60, true);
  for (let i = 0; i < 60; i++){ posVisual(1); updateCamera(1/60, false); }
  const z = cam.z, sx = W/2 + (q.x - cam.x)*z, sy = H/2 + (q.y - cam.y)*z;
  const visivel = sx - q.r*z >= 0 && sx + q.r*z <= W && sy - q.r*z >= 0 && sy + q.r*z <= H;
  const rotulos = []; const tf = txt; txt = function(g, s){ if (/^CÂMERA:/.test(s)) rotulos.push(s); return tf.apply(this, arguments); };
  ctx.setTransform(K, 0, 0, K, 0, 0); desenhaEspecRotulo(ctx); txt = tf;
  ESPEC.alvo = -1; NET49.playing = sv.playing; NET49.localSlot = sv.slot; cam.preset = 'equilibrado';
  return {nomes, visivel, rotulos, nomeAlvo:q.nome};
})()"""


async def principal():
    P = Placar('Etapa 2 · câmeras' + (' (versão anterior: só a medida)' if ANTES else ''))
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw)
        print('\n· seu jogador num canto, a bola no canto oposto (3 s de quadros; o pior quadro)')
        casos = [(4, 'jogador', 'pers', 213, 10, False), (4, 'jogador', 'pers', 213, 10, True), (3, 'jogador', 'pers', 213, 10, False),
                 (4, 'jogador', 'perto', 100, 10, False), (4, 'frente', 'pers', 213, 10, True), (3, 'frente', 'perto', 100, 10, False),
                 (2, 'jogador', 'equilibrado', 100, 10, True), (1, 'jogador', 'pers', 213, 0, False)]
        for c in casos:
            r = await rt(pg, CANTO + '(%d, %s, %s, %d, %d, %s)' % (c[0], json.dumps(c[1]), json.dumps(c[2]), c[3], c[4], 'true' if c[5] else 'false'))
            pi = r['pior']
            rot = '%dv%d %-8s %-12s zoom %s%s' % (c[0], c[0], c[1], c[2], ('%d%%' % c[3]) if c[2] == 'pers' else '', ' correndo' if c[5] else '')
            print('    %-46s corpo cortado %5.0f%% · centro fora %5.0f%% do raio · na área livre: %s' % (rot, pi['corte']*100, pi['centro']*100, pi['livre']))
            P.confere(pi['corte'] == 0 and pi['centro'] == 0, rot + ': o corpo inteiro na tela', pi)
            if not ANTES:
                P.confere(pi['livre'], rot + ': com a folga, fora do placar e longe dos controles', pi)
        if not ANTES:
            print('\n· enquadramentos por tamanho de time (o % é do enquadramento de sempre)')
            r = await rt(pg, PRESETS)
            for n, v in r.items():
                print('    %sv%s  perto %3d%%  equilibrado %3d%%  campo inteiro %3d%%  (a quadra cabe: %s)' % (n, n, v['perto']['pct'], v['equilibrado']['pct'], v['campo']['pct'], v['campoCabe']))
                P.confere(v['perto']['z'] > v['equilibrado']['z'] > v['campo']['z'], '%sv%s: Perto > Equilibrado > Campo inteiro' % (n, n), v)
                P.confere(v['campoCabe'], '%sv%s: no Campo inteiro a quadra inteira aparece' % (n, n))
            P.confere(r['4']['equilibrado']['z'] < r['1']['equilibrado']['z'], 'o Equilibrado abre mais no 4v4 que no 1v1')

            print('\n· suavidade e resposta (a bola vai longe de repente)')
            r = await rt(pg, SUAVE)
            print('    ', json.dumps(r))
            P.confere(r['maxAcel'] <= 6, 'sem tranco: a velocidade da câmera muda pouco de um quadro para o outro (≤ 6 px/quadro)', r)
            P.confere(r['t90'] is not None and r['t90'] <= .9, 'sem atraso grande: chega a 90% do caminho em até 0,9 s', r)

            print('\n· zoom automático (opcional)')
            r = await rt(pg, AUTO)
            print('    ', json.dumps(r))
            P.confere(.05 < r['abriu'] <= .301, 'abre quando a bola vai longe (no máximo 30%)', r)
            P.confere(r['inversoes'] <= 2, 'sem vaivém: no máximo uma ida e uma volta', r)
            P.confere(r['maxDzPorS'] <= .9, 'transição suave: menos de 90% do zoom por segundo', r)
            P.confere(abs(r['zFim'] - r['z0'])/r['z0'] < .03, 'volta ao enquadramento escolhido quando a bola volta', r)

            print('\n· setinhas fora da tela, a sua setinha e o espectador')
            r = await rt(pg, SETAS)
            for s in r['res']:
                P.confere(s['livre'], 'a setinha que cairia em %s fica num lugar livre %s' % (s['nome'], s['p']))
            P.confere(r['comVoce'] == 1 and r['semVoce'] == 0, 'com Seguir bola e você fora da tela aparece VOCÊ; no Seguir jogador não precisa', r)
            r = await rt(pg, ESPEC)
            print('    ', json.dumps(r, ensure_ascii=False))
            P.confere(r['nomes'][0] != 'BOLA' and r['nomes'][-2] == 'CAMPO INTEIRO' and r['nomes'][-1] == 'BOLA', 'o espectador troca: jogadores, o campo inteiro (v88) e de volta para a bola', r['nomes'])
            P.confere(r['visivel'], 'a câmera do espectador mantém o jogador escolhido inteiro na tela')
            P.confere(r['rotulos'] == ['CÂMERA: ' + r['nomeAlvo'].upper()], 'o rótulo diz quem a câmera acompanha', r['rotulos'])

            print('\n· Ajustes › Câmera: tudo num lugar só (e fica guardado)')
            await rt(pg, "if (!lobby.aberto) abrirLobby(); true")
            await pg.evaluate("document.getElementById('lb-ajustes').click()"); await pg.wait_for_timeout(200)
            await pg.evaluate("document.getElementById('ajx-t-camera').click()"); await pg.wait_for_timeout(150)
            await pg.evaluate("document.querySelector('#pop-ajustes [data-preset=perto]').click()")
            await pg.evaluate("document.getElementById('hp-frente').click()")
            await pg.evaluate("document.getElementById('aj-camauto').click()")
            firme0 = await rt(pg, "X49.camera")
            await pg.evaluate("document.getElementById('aj-firme').click()")
            await pg.evaluate("document.getElementById('aj-suave').click()")
            st = await rt(pg, "({preset:cam.preset, estilo:cam.estilo, mode:cam.mode, auto:cam.auto, firme:X49.camera, suave:opc.lag && !X49.contactSync, salvo:JSON.parse(localStorage.getItem('racha-treino-hud-v11') || '{}').cam})")
            print('    ', json.dumps(st, ensure_ascii=False))
            P.confere(st['preset'] == 'perto' and st['estilo'] == 'frente' and st['mode'] == 'seguir' and st['auto'] is True, 'modo, enquadramento e zoom automático mudam na hora')
            P.confere(st['firme'] != firme0 and st['suave'] is True, 'Câmera firme e Suavizar movimento mudam na hora')
            P.confere(st['salvo'] and st['salvo'].get('preset') == 'perto' and st['salvo'].get('auto') is True and st['salvo'].get('estilo') == 'frente', 'fica guardado', st['salvo'])
            await pg.evaluate("document.querySelector('#pop-ajustes [data-preset=equilibrado]').click()")
            await pg.evaluate("(() => { const r = document.getElementById('hp-zoom'); r.value = 150; r.dispatchEvent(new Event('input', {bubbles:true})); r.dispatchEvent(new Event('change', {bubbles:true})); })()")
            st2 = await rt(pg, "({preset:cam.preset, zoom:cam.zoom})")
            P.confere(st2['preset'] == 'pers' and st2['zoom'] == 150, 'mexer no zoom passa para o Personalizado', st2)
            await pg.evaluate("document.getElementById('ajx-cam-rest').click()")
            st3 = await rt(pg, "({preset:cam.preset, estilo:cam.estilo, auto:cam.auto, firme:X49.camera})")
            P.confere(st3 == {'preset': 'equilibrado', 'estilo': 'jogador', 'auto': False, 'firme': 'stable'}, 'Voltar a câmera ao padrão', st3)
            hud = await rt(pg, "({abas:!ui.abas.hidden, cam:!!ui.painel.querySelector('section[data-aba=cam]:not(.ajx-saiu)'), jogo:!!ui.painel.querySelector('section[data-aba=jogo]:not(.ajx-saiu)')})")
            P.confere(not hud['abas'] and not hud['cam'] and not hud['jogo'], 'o editor de HUD ficou só com os controles', hud)

        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript', [e for e in erros if e not in rede][:4])
        await b.close()
    return P.fim()

roda(principal())
