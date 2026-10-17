"""Etapa 5 · as telas do clube e do online em tamanho real: COMUNIDADE (início), o clube pessoal (lista, criar, página),
a sala neste aparelho com ENTRAR NO TIME / MONTAR COM BOTS e a demonstração sem servidor — rolando cada tela até o fim,
os alvos de toque têm pelo menos 44 px de verdade e o texto não fica abaixo de 12 px.

Rodar:  python3 tests/interface5_test.py            (as cópias de tela ficam em tests/saida/e5_*.png)
"""
from comum import abre, rt, roda, Placar, async_playwright
from interface4_test import mede_rolando, MED, SAIDA, TAMANHOS, toque_de, modo_cabe, confere_cabe


async def principal():
    P = Placar('Etapa 5 · as telas do clube e do online em tamanho real')
    async with async_playwright() as pw:
        for (w, h) in TAMANHOS:
            b, pg, erros = await abre(pw, w, h, toque=toque_de(w, h))
            print('\n· %dx%d' % (w, h))
            casos = [
              ('comunidade', "abreTela('comunidade'); true", '#tela-comunidade .sx-corpo2', '#lb'),
              ('clube-lista', "abreTela('clube'); true", '#tela-clubes .clb-rolar', '#lb'),
              ('clube-criar', "clbCriarAbre(); true", '.clb-form-corpo', '#lb'),
              ('clube-pagina', "(() => { CLB.form.nome = 'Os Brabos da Laje'; clbCriar(); return true; })()", '#tela-clubes .clb-pag', '#lb'),
              ('clube-como', "clbComoConta(clbApi()); true", '#pop-caixa', '#lb-pop'),
              ('sala-aqui', "(() => { fechaPop(); abreTela('amigos'); slocCria({n:2, map:0, jogo:'futebol', tempo:0, name:'Teste'}); return true; })()", '#tela-sala .sl-corpo', '#tela-sala'),
              ('sala-montada', "(() => { v70SlMontaComBots(); return true; })()", '#tela-sala .sl-corpo', '#tela-sala'),
            ]
            for nome, js, corpo, raiz in casos:
                await rt(pg, js); await pg.wait_for_timeout(420)
                if await modo_cabe(pg, raiz):
                    await pg.screenshot(path=str(SAIDA / ('e5_%s_%dx%d.png' % (nome, w, h))))
                    await confere_cabe(P, pg, nome, raiz)
                    continue
                n, peq, txt = await mede_rolando(pg, corpo, raiz)
                await pg.screenshot(path=str(SAIDA / ('e5_%s_%dx%d.png' % (nome, w, h))))
                P.confere(not peq, '%-13s toques ≥ 44 px (%d alvos)' % (nome, n), ['%s %dx%d' % (a['rotulo'], a['w'], a['h']) for a in peq[:4]])
                P.confere(not txt, '%-13s texto ≥ 12 px' % nome, txt[:3])
            at = await pg.evaluate("(() => { const b = document.querySelector('.v70-sl-atalhos'); if (!b || b.hidden) return null; const r = b.getBoundingClientRect(); return {l:r.left, r:r.right, t:r.top, b:r.bottom, W:innerWidth, H:innerHeight}; })()")
            P.confere(at is None, 'sala montada com bots: os atalhos somem (não sobrou vaga)', at)
            await rt(pg, "net49Send({type:'leave'}); true"); await pg.wait_for_timeout(200)
            rede = [e for e in erros if 'Failed to load resource' in e]
            P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript', [e for e in erros if e not in rede][:3])
            await b.close()
        # a demonstração sem servidor: o aviso claro (sem tentar conectar)
        b, pg, erros = await abre(pw, 1280, 720, config={'modo': 'demo', 'presente': False})
        await rt(pg, "abreTela('amigos'); sxConectar(); true"); await pg.wait_for_timeout(300)
        t = await pg.evaluate("(document.querySelector('#lb-pop h2') || {}).textContent")
        st = await pg.evaluate("(document.querySelector('.sx-st span') || {}).textContent")
        await pg.screenshot(path=str(SAIDA / 'e5_demo_1280x720.png'))
        P.confere(t == 'SALAS ONLINE DESLIGADAS' and 'DEMONSTRAÇÃO' in (st or ''), 'demonstração sem servidor: SALAS ONLINE DESLIGADAS, sem tentar conectar', [t, st])
        m = await rt(pg, "({ws:String(window.WebSocket).indexOf('native') < 0, moedas:CONTA.moedas, gemas:CONTA.gemas})")
        P.confere(m['ws'] and m['moedas'] == 500 and m['gemas'] == 25, 'o bloqueio de rede só existe na demonstração; presente:false tira o presente de teste', m)
        await b.close()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
