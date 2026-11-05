"""RACHA v107 · O ANEL DO CHUTE BEM BRANCO (no navegador).
O pedido (05/11/2026): "quando o jogador chuta, o arco ao redor deve ficar bem branco: a opacidade do chute tá muito fraca".
· Sem nada apertado, o V95S.luz é 1 (a v96 tinha deixado em 0,3) e o anel aceso da partida é a imagem nova (o branco opaco).
· Na partida, segurando o CHUTE, o anel em volta da tampinha fica quase branco nos pixels (a luz média do anel perto de 255,
  e bem mais clara que com o branco suave da v96); o PASSE acende quase igual; soltou, some rápido.
· A imagem do anel aceso: o meio do anel é branco opaco (alfa 255).
· A Oficina usa o mesmo branco opaco (a troca no desenho de lá).
Capturas em tests/saida/v107_chute_*.png.
Rodar: python3 tests/v107_chute_test.py"""
from comum import abre, rt, roda, Placar, async_playwright, RAIZ

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)

# a luz média do anel do jogador na tela (entre 1,08 e 1,18 × o raio: o meio do anel do sensor), como no v96_conta
ANEL = r"""(() => { const c = document.getElementById('c'), g = c.getContext('2d'), r0 = cv.getBoundingClientRect(), k = c.width / r0.width, z = cam.z;
  const x = (W / 2 + (P.x - cam.x) * z) * r0.width / W * k, y = (H / 2 + (P.y - cam.y) * z) * r0.height / H * k, r = R_JOG * z * r0.width / W * k;
  const a = Math.ceil(r * 1.3), d = g.getImageData(Math.round(x - a), Math.round(y - a), 2 * a, 2 * a).data; let s = 0, n = 0, mn = 255;
  for (let j = 0; j < 2 * a; j++) for (let i = 0; i < 2 * a; i++) { const q = Math.hypot(i - a + .5, j - a + .5) / r; if (q > 1.08 && q < 1.18) { const o = (j * 2 * a + i) * 4; const l = .2126 * d[o] + .7152 * d[o + 1] + .0722 * d[o + 2]; s += l; n++; } }
  return n ? s / n : 0; })()"""


async def principal():
    P = Placar('v107 · o anel do chute bem branco')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        html = (RAIZ / 'app' / 'public' / 'game' / 'racha.html').read_text(encoding='utf-8')

        # ---------------------------------------------------------------- 1) o branco de volta forte, e opaco
        r = await rt(pg, """(() => { const c = RachaChute107.sprite(40), g = c.getContext('2d'), m = c.width / 2;
          const re = 40 * AROV.ate, ri = 40 * Math.max(1.02, AROV.de - .02), x = Math.round(m + (re + ri) / 2), y = Math.round(m);
          const p = g.getImageData(x, y, 1, 1).data; return {luz: V95S.luz, px: Array.from(p)}; })()""")
        P.confere(r['luz'] == 1 and r['px'][3] == 255 and min(r['px'][:3]) >= 250, 'o V95S.luz é 1 (era 0,3 desde a v96) e o meio do anel aceso é branco opaco (alfa 255)', r)

        # ---------------------------------------------------------------- 2) na partida: segurando o CHUTE e o PASSE
        await rt(pg, """(() => { __T.comeca('futebol', 1, 4); __T.limpa(); __T.poe(P, CX - U(14), CY); __T.bola(CX + U(16), CY - U(10)); posVisual(0); cam.mode = 'fixa'; updateCamera(0, true); buildStatic(); return true; })()""")
        await pg.wait_for_timeout(4200)
        await rt(pg, "(() => { __T.poe(P, CX - U(14), CY); __T.bola(CX + U(16), CY - U(10)); posVisual(0); return true; })()")
        luz = {}
        for nome, js in (('parado', "keys.KeyK = false; keys.KeyJ = false;"),
                         ('suave_v96', "V95S.luz = .3; keys.KeyK = true;"),
                         ('chute', "V95S.luz = 1; keys.KeyK = true;"),
                         ('passe', "keys.KeyK = false; keys.KeyJ = true;"),
                         ('soltou', "keys.KeyJ = false;")):
            await rt(pg, "(() => { " + js + " return true; })()"); await pg.wait_for_timeout(450 if nome == 'soltou' else 300)
            luz[nome] = round(await rt(pg, ANEL), 1)
            if nome == 'chute': await pg.screenshot(path=str(SAIDA / 'v107_chute_partida.png'))
            if nome == 'passe': await pg.screenshot(path=str(SAIDA / 'v107_chute_passe.png'))
        await rt(pg, "keys.KeyK = false; keys.KeyJ = false; V95S.luz = 1; true")
        print('     a luz do anel (0 a 255):', luz)
        P.confere(luz['chute'] >= 225, 'segurando o CHUTE, o anel em volta da tampinha fica quase branco na tela (%.0f de 255)' % luz['chute'], luz)
        P.confere(luz['chute'] - luz['parado'] > 2.2 * (luz['suave_v96'] - luz['parado']) and luz['chute'] - luz['suave_v96'] > 60,
                  'bem mais branco que o branco suave da v96 (+%.0f contra +%.0f)' % (luz['chute'] - luz['parado'], luz['suave_v96'] - luz['parado']), luz)
        P.confere(luz['passe'] >= 200 and luz['passe'] <= luz['chute'] + 1, 'o PASSE acende quase igual (%.0f)' % luz['passe'], luz)
        P.confere(luz['soltou'] < luz['parado'] + 15, 'soltou, o branco some rápido (%.0f)' % luz['soltou'], luz)

        # ---------------------------------------------------------------- 3) a Oficina com o mesmo branco
        P.confere("g.fillStyle = '#ffffff'; g.fill(); g.restore();   // (v107: o branco opaco)\n    g.lineWidth = w * 1.2;" in html
                  and "rgba(255,255,255,.84)'; g.fill(); g.restore();\n    g.lineWidth = w * 1.2;" not in html
                  and 'g.globalAlpha = Math.min(1, wb) * luz;' in html, 'a Oficina desenha o anel aceso com o mesmo branco opaco (e o mesmo V95S.luz)')

        await rt(pg, "rqSai(); true")
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript', [e for e in erros if e not in rede][:3])
        await b.close()
    return P.fim()

roda(principal())
