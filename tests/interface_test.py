"""Etapa 3 · interface em tamanho real: em cada tamanho de tela pedido, cada tela do lobby, os Ajustes, a pausa e o editor
dos controles — os alvos de toque têm pelo menos 44 px de verdade (medidos depois de qualquer transform) e o texto não fica
abaixo de 12 px. Também confere o Tamanho da interface e o HUD da partida (placar e pausa) crescendo em tela pequena.

Rodar:  python3 tests/interface_test.py            (as cópias de tela ficam em tests/saida/)
"""
import sys, json, pathlib
from comum import abre, rt, roda, Placar, async_playwright, RAIZ

MED = (RAIZ / 'tests' / 'medidas.js').read_text(encoding='utf-8')
SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
TAMANHOS = [(1440, 900), (1280, 720), (844, 390), (667, 375), (390, 844)]
from interface4_test import toque_de, modo_cabe, confere_cabe   # v70.1: no celular deitado tudo cabe (ver interface4_test.py)
TELAS = ['lobby', 'perfil', 'clube', 'clube-criar', 'skins', 'treino', 'loja', 'amigos', 'copa', 'chat', 'ranking', 'replays', 'trocar', 'ajustes']


async def principal():
    P = Placar('Etapa 3 · interface em tamanho real')
    async with async_playwright() as pw:
        for (w, h) in TAMANHOS:
            b, pg, erros = await abre(pw, w, h, toque=toque_de(w, h))
            print('\n· %dx%d' % (w, h))
            for t in TELAS:
                if t == 'trocar': await pg.evaluate("(() => { const b = document.querySelector('.lb-trocar'); if (b) b.click(); })()")
                elif t == 'ajustes': await rt(pg, "ajxAbre('camera'); true")
                elif t == 'clube-criar': await rt(pg, "abreTela('clube'); setTimeout(() => clbCriarAbre(), 200); true"); await pg.wait_for_timeout(400)
                elif t != 'lobby': await rt(pg, "abreTela(%s); true" % json.dumps(t))
                await pg.wait_for_timeout(350)
                raiz = '#pop-ajustes' if t == 'ajustes' else '#lb'
                await pg.screenshot(path=str(SAIDA / ('%s_%dx%d.png' % (t, w, h))))
                if await modo_cabe(pg, raiz):
                    await confere_cabe(P, pg, t, raiz)
                else:
                    m = await pg.evaluate(MED + '(%s)' % json.dumps(raiz))
                    peq = ['%s %dx%d' % (a['rotulo'], a['w'], a['h']) for a in m['pequenos'][:4]]
                    P.confere(not m['pequenos'], '%-8s toques ≥ 44 px (%d alvos)' % (t, m['n']), peq)
                    P.confere(m['texto']['min'] is None or m['texto']['min'] >= 11.95, '%-8s texto ≥ 12 px (menor: %s)' % (t, m['texto']['min']), m['texto']['pequenos'][:3])
                await rt(pg, "try { if (!LB.aj.hidden) LB.aj.hidden = true; if (lobby.tela) fechaTela(); if (!RQP.raiz.hidden) fechaRanqueada(); } catch(e){} true")
                await pg.wait_for_timeout(120)
            if h < 600 or w < 600:                          # em tela pequena: a partida (HUD, pausa e o editor)
                await pg.evaluate("document.getElementById('lb-jogar').click()"); await pg.wait_for_timeout(900)
                hud = await rt(pg, "({k:HUDX.k, pausa:BTN_PAUSA.w*HUDX.css, placar:52*HUDX.k*HUDX.css, ret:innerHeight > innerWidth})")
                if not hud['ret']:
                    P.confere(hud['pausa'] >= 44, 'partida: o botão de pausa tem %d px' % hud['pausa'], hud)
                    P.confere(hud['placar'] >= 30, 'partida: o placar tem %d px de altura' % hud['placar'], hud)
                await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
                m = await pg.evaluate(MED + "('#pausa')")
                P.confere(not m['pequenos'] and (m['texto']['min'] or 99) >= 11.95, 'pausa: toques ≥ 44 px e texto ≥ 12 px', [m['pequenos'][:3], m['texto']['min']])
                await rt(pg, "pausaFecha(); abrirEdicao(); true"); await pg.wait_for_timeout(400)
                await pg.screenshot(path=str(SAIDA / ('editor_%dx%d.png' % (w, h))))
                if await rt(pg, "v70Baixa()"):         # v70.1: no celular deitado o editor encolhe junto para caber inteiro (como na v69)
                    await confere_cabe(P, pg, 'editor', '#hp')
                else:
                    m = await pg.evaluate(MED + "('#hp')")
                    P.confere(not m['pequenos'] and (m['texto']['min'] or 99) >= 11.95, 'editor dos controles: toques ≥ 44 px e texto ≥ 12 px', [m['pequenos'][:3], m['texto']['min']])
                vis = await pg.evaluate("(() => { const s = document.getElementById('hp-salvar').getBoundingClientRect(); return s.bottom <= innerHeight + 1 && s.top >= 0; })()")
                P.confere(vis, 'editor: Salvar e Cancelar ficam à vista sem rolar')
                await rt(pg, "fecharEdicao(false); true")
            rede = [e for e in erros if 'Failed to load resource' in e]
            P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript', [e for e in erros if e not in rede][:3])
            await b.close()
        print('\n· Tamanho da interface (Ajustes › Acessibilidade)')
        b, pg, erros = await abre(pw, 844, 390)
        await rt(pg, "abreTela('perfil'); true"); await pg.wait_for_timeout(300)
        px = "(() => { const s = document.querySelector('#tela-perfil .pf-st small'); return parseFloat(getComputedStyle(s).fontSize)*s.getBoundingClientRect().width/s.offsetWidth; })()"
        a = await pg.evaluate(px)
        await rt(pg, "uiMudaTamanho(1.3); true"); await pg.wait_for_timeout(300)
        d = await pg.evaluate(px)
        hk = await rt(pg, "HUDX.k")
        print('    legenda da estatística: %.1f px → %.1f px · HUD %.2f' % (a, d, hk))
        P.confere(d > a*1.2, 'em 130% o texto das telas cresce', (a, d))
        P.confere(hk >= 1.4*1.2 or hk >= 1.79, 'em 130% o HUD da partida cresce também', hk)
        await rt(pg, "uiMudaTamanho(1); true")
        guardado = await pg.evaluate("localStorage.getItem('racha-ui-v1')")
        P.confere(guardado and '"mul":1' in guardado, 'fica guardado', guardado)
        await b.close()
    return P.fim()

roda(principal())
