"""Etapa 4 · as telas novas em tamanho real: o perfil (com as estatísticas), a loja, as missões, zerar, o inventário do
editor, a escolha dos bots, o tutorial e o COMO JOGA — rolando cada tela até o fim, os alvos de toque têm pelo menos 44 px
de verdade e o texto não fica abaixo de 12 px (medidos depois de qualquer transform).

Rodar:  python3 tests/interface4_test.py            (as cópias de tela ficam em tests/saida/)
"""
import json
from comum import abre, rt, roda, Placar, async_playwright, RAIZ

MED = (RAIZ / 'tests' / 'medidas.js').read_text(encoding='utf-8')
CABE = (RAIZ / 'tests' / 'cabe.js').read_text(encoding='utf-8')
SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
TAMANHOS = [(1440, 900), (1280, 720), (844, 390), (667, 375), (390, 844)]
# v70.1: no celular deitado (844x390, 667x375) tudo cabe na tela, na escala do palco como na v69 — ali o que se confere é que
# nada rola nem fica fora da tela (os pisos de 44 px e 12 px valem do tablet para cima e na janela em pé). Em pé, estes
# testes abrem a janela estreita do computador (sem toque): no aparelho de toque em pé entra o GIRE O CELULAR (celular_test.py).


def toque_de(w, h):
    return not h > w


async def modo_cabe(pg, raiz):
    """A tela medida está no modo em que tudo cabe (celular deitado)? Os Ajustes têm o modo deles (compacto)."""
    if raiz == '#pop-ajustes':
        return await rt(pg, "AJX.raiz.classList.contains('v70-compacto')")
    return await rt(pg, "LB.raiz.classList.contains('v70-cabe')")


async def confere_cabe(P, pg, nome, raiz):
    m = await pg.evaluate(CABE + '(%s)' % json.dumps(raiz))
    z = ', '.join('%s %.2f' % (x['alvo'], x['z']) for x in m['zoom'])
    P.confere(not m['rola'] and not m['fora'], '%-12s celular deitado: cabe sem rolar%s' % (nome, (' (encolheu: ' + z + ')') if z else ''), m)


async def mede_rolando(pg, corpo_sel, raiz_sel):
    """Mede a tela em cada posição da rolagem (do começo ao fim) e junta o que ficou pequeno."""
    peq, txt, n = {}, [], 0
    alt = await pg.evaluate("(s => { const c = document.querySelector(s); return c ? [c.scrollHeight, c.clientHeight] : [0, 0]; })(%s)" % json.dumps(corpo_sel))
    passos = max(1, min(14, int((alt[0] - 1) // max(1, alt[1])) + 1)) if alt[1] else 1
    for i in range(passos + 1):
        await pg.evaluate("((s, i, n) => { const c = document.querySelector(s); if (c) c.scrollTop = (c.scrollHeight - c.clientHeight)*i/n; })(%s, %d, %d)" % (json.dumps(corpo_sel), i, max(1, passos)))
        await pg.wait_for_timeout(120)
        m = await pg.evaluate(MED + "(%s)" % json.dumps(raiz_sel))
        n = max(n, m['n'])
        for a in m['pequenos']: peq[a['rotulo']] = a
        txt += m['texto']['pequenos']
    return n, list(peq.values()), txt


async def principal():
    P = Placar('Etapa 4 · as telas novas em tamanho real')
    async with async_playwright() as pw:
        for (w, h) in TAMANHOS:
            b, pg, erros = await abre(pw, w, h, toque=toque_de(w, h))
            print('\n· %dx%d' % (w, h))
            await rt(pg, """(() => { CONTA.moedas = 3000; CONTA.gemas = 120; contaSalvar();
              const D = tpLe(tpMinha()); TP.salvas = [{c:tpCodigo(D), n:'Laje', f:true}, {c:tpCodigo(Object.assign(tpCopia(D), {p:'bo'})), n:'Bolinha da quebrada', f:false}]; tpSalva();
              perfil.est = {'casual|futebol':{p:4, c:3, v:2, d:1, a:1, m:5, pt:5, as:2, f:9, fa:5, fg:3, ss:1, t:300}, 'liga|futebol':{p:1, c:1, v:1}, 'treino|futebol':{m:12, c:2, t:120}}; perfilSalvar(); return true; })()""")
            casos = [
              ('perfil', "abreTela('perfil'); true", '#tela-perfil .tl-corpo', '#lb'),
              ('perfil-treino', "PX.ctx = 'treino'; pxEstRender(); true", '#tela-perfil .tl-corpo', '#lb'),
              ('loja', "fechaTela(); abreTela('loja'); true", '#tela-loja .tl-corpo', '#lb'),
              ('ranking', "fechaTela(); abreTela('ranking'); true", '#tela-ranking .tl-corpo', '#lb'),
              ('missoes', "fechaTela(); missoesAbre(); true", '#pop-caixa', '#lb-pop'),
              ('zerar', "fechaPop(); pxZerarPop(); true", '#pop-caixa', '#lb-pop'),
              ('inventario', "fechaPop(); abreTela('skins'); setTimeout(() => { ED.aba = 'inv'; tpeAtualiza(true); }, 60); true", '#tela-skins .tpe-ctl', '#lb'),
              ('salva-menu', "tpeSalvaMenu(TP.salvas[0]); true", '#pop-caixa', '#lb-pop'),
              ('jogar-casual', "fechaPop(); ED.saindo = true; fechaTela(); ED.saindo = false; abreJogar('casual'); true", '#lb-rq .folha', '#lb-rq'),
              ('conta', "fechaRanqueada(); ajxAbre('conta'); true", '#pop-ajustes .ajx-corpo', '#pop-ajustes'),
            ]
            for nome, js, corpo, raiz in casos:
                await rt(pg, js); await pg.wait_for_timeout(380)
                if await modo_cabe(pg, raiz):
                    await pg.screenshot(path=str(SAIDA / ('e4_%s_%dx%d.png' % (nome, w, h))))
                    await confere_cabe(P, pg, nome, raiz)
                    continue
                n, peq, txt = await mede_rolando(pg, corpo, raiz)
                await pg.screenshot(path=str(SAIDA / ('e4_%s_%dx%d.png' % (nome, w, h))))
                P.confere(not peq, '%-12s toques ≥ 44 px (%d alvos)' % (nome, n), ['%s %dx%d' % (a['rotulo'], a['w'], a['h']) for a in peq[:4]])
                P.confere(not txt, '%-12s texto ≥ 12 px' % nome, txt[:3])
            await rt(pg, "ajxFecha(); true")
            # a partida: o painel do tutorial e o COMO JOGA
            await rt(pg, "tutComeca(); TR.ft = TR_INTRO - 2; true"); await pg.wait_for_timeout(700)
            m = await pg.evaluate(MED + "('.tu-painel')")
            await pg.screenshot(path=str(SAIDA / ('e4_tut_%dx%d.png' % (w, h))))
            P.confere(not m['pequenos'] and (m['texto']['min'] or 99) >= 11.95, 'tutorial: o painel do passo (PULAR ≥ 44 px, texto ≥ 12 px)', [m['pequenos'][:2], m['texto']['min']])
            r = await pg.evaluate("(() => { const p = document.querySelector('.tu-painel').getBoundingClientRect(); return {cabe:p.left >= 0 && p.right <= innerWidth && p.top >= 0, alt:Math.round(p.height), h:innerHeight}; })()")
            P.confere(r['cabe'] and r['alt'] <= r['h']*.45, 'tutorial: o painel cabe na tela e não cobre o campo inteiro (%d px de %d)' % (r['alt'], r['h']), r)
            await rt(pg, "tuIntroAbre('curva'); true"); await pg.wait_for_timeout(200)
            await pg.screenshot(path=str(SAIDA / ('e4_comojoga_%dx%d.png' % (w, h))))
            if await rt(pg, "!!document.querySelector('.tu-intro-cx[data-v70z]')"):   # v70.1: no celular deitado o cartão encolhe junto para caber inteiro
                await confere_cabe(P, pg, 'COMO JOGA', '.tu-intro')
            else:
                m = await pg.evaluate(MED + "('.tu-intro')")
                P.confere(not m['pequenos'] and (m['texto']['min'] or 99) >= 11.95, 'COMO JOGA: botão ≥ 44 px e texto ≥ 12 px', [m['pequenos'][:2], m['texto']['min']])
            r = await pg.evaluate("(() => { const p = document.querySelector('.tu-intro-ok').getBoundingClientRect(); return p.bottom <= innerHeight + 1 && p.top >= 0; })()")
            P.confere(r, 'COMO JOGA: o BORA! fica à vista')
            await rt(pg, "tuIntroFecha(); tuPula(); true")
            rede = [e for e in erros if 'Failed to load resource' in e]
            P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript', [e for e in erros if e not in rede][:3])
            await b.close()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
