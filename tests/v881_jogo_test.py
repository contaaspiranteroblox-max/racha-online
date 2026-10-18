"""v88.1 · o JOGO de verdade (tests/build/racha_teste.html) com as contas pelo Dono, na PLATAFORMA DE TESTE (as rotas de
app/api com SQLite), pelos botões e pelo armazenamento de verdade do navegador:
  · o cadastro fechado: o login do jogo só com ENTRAR e RECUPERAR (e o aviso), o v84Form('criar') indo para o ENTRAR, o
    CRIAR CONTA do Ajustes › Conta escondido — e, com o cadastro aberto pelo Dono, tudo de volta;
  · o mesmo número, outra conta: duas contas jogam neste aparelho (uma nas chaves, a outra guardada na gaveta), o Dono zera
    as contas e cria contas novas com os mesmos números — quando elas entram, o que era das contas apagadas sai do aparelho
    (nada passa para a conta nova) e o que é do Dono continua.
  python3 tests/v881_jogo_test.py
"""
import asyncio, json, os, sys, tempfile, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from comum import Placar, RAIZ, CHROME, FONTES, rt
from v881_painel_test import Plataforma, totp
from playwright.async_api import async_playwright

SENHA = 'Dono-Jogo-881b'
MARCA = 'racha-tampa-rascunho-v1'                            # (uma chave de progresso que o jogo só regrava quando muda)


def painel_api(PL):
    """O login do RACHA CONTROL pela API (o 2FA com o segredo lido do banco): o token do painel."""
    lp = PL.m('admin.loginPainel', {'username': 'dono', 'senha': SENHA})
    seg = PL.sql("SELECT segredo FROM totp WHERE usuario_id = (SELECT id FROM usuarios WHERE id_publico = 1)")[0]['segredo']
    PL.m('admin.verificar2fa', {'token': lp['token'], 'codigo': totp(seg)})
    return lp['token']


async def novo(pw, PL, ctx=None):
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    c = await b.new_context(viewport={'width': 1280, 'height': 720}, has_touch=True)
    await c.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await c.add_init_script('window.RACHA_CONFIG = {presente:false};')
    pg = await c.new_page()
    erros = []
    pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
    await pg.goto(PL.base + '/tests/build/racha_teste.html')
    return b, pg, erros


async def espera(pg, js, ms=8000, passo=150):
    t0 = time.time(); v = None
    while (time.time() - t0) * 1000 < ms:
        try: v = await rt(pg, js)
        except Exception: v = None
        if v: return v
        await asyncio.sleep(passo / 1000)
    return v


async def abas_login(pg):
    await pg.wait_for_selector('#v84auth .v84-abas button', timeout=20000)
    await asyncio.sleep(.5)                                  # (a resposta do auth.cadastro chega logo depois do formulário)
    return await rt(pg, "[...document.querySelectorAll('#v84auth .v84-abas button')].map(b => b.textContent)")


async def entra(pg, usuario, senha):
    await pg.wait_for_selector('#v84auth input[autocomplete="username"]', timeout=20000)
    await pg.fill('#v84auth input[autocomplete="username"]', usuario)
    await pg.fill('#v84auth input[type="password"]', senha)
    await pg.click('#v84auth .v84-go')
    async def pronto():
        t0 = time.time()                                     # (a entrada pode abrir o jogo de novo: o aparelho passa a ser desta conta)
        while time.time() - t0 < 25:
            try:
                if await pg.evaluate('() => typeof window.__RT === "function" && !!window.__RT("v88Logado() && lobby.aberto && !!C82.conta")'): return True
            except Exception: pass
            await asyncio.sleep(.3)
        return False
    await pronto()
    await asyncio.sleep(1.5)                                 # (se o jogo abriu de novo logo depois de entrar, espera a página nova)
    await pronto()
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    return await rt(pg, "C82.conta ? C82.conta.idPublico : null")


async def sai(pg):                                           # SAIR DA CONTA (Ajustes › Conta): o jogo abre de novo sem conta
    await rt(pg, "(v84Sair(), 1)")
    await pg.wait_for_selector('#v84auth input[autocomplete="username"]', timeout=20000)


async def principal():
    P = Placar('v88.1 · o jogo com as contas pelo Dono (cadastro fechado e o mesmo número de outra conta)')
    banco = os.path.join(tempfile.mkdtemp(prefix='racha881j-'), 'plataforma.sqlite')
    PL = Plataforma(banco, {'RACHA_OWNER_PASSWORD': SENHA}).sobe()
    erros = []
    try:
        tk = painel_api(PL)
        async with async_playwright() as pw:
            print('1) o login do jogo com o cadastro fechado (o padrão)')
            b, pg, e1 = await novo(pw, PL); erros.append(e1)
            abas = await abas_login(pg)
            nota = await rt(pg, "(document.querySelector('#v84auth .v881-fechado') || {}).textContent || ''")
            P.confere(abas == ['ENTRAR', 'RECUPERAR'] and 'dono do RACHA' in nota, 'só ENTRAR e RECUPERAR, com o aviso de que as contas saem do dono', (abas, nota))
            aba = await rt(pg, "(v84Form('criar'), V84.aba)")
            P.confere(aba == 'entrar' and await rt(pg, "!!document.querySelector('#v84auth .v881-fechado')"), 'pedir o CRIAR CONTA (os botões do jogo) leva ao ENTRAR, com o aviso', aba)
            await rt(pg, "(() => { [...document.querySelectorAll('#v84auth .v84-alt')].find(x => x.textContent === 'SÓ TREINAR OFFLINE').click(); return 1; })()")
            await rt(pg, "(ajxAbre('conta'), 1)")
            cr = await espera(pg, "(() => { const e = document.querySelector('.c82-card .c82-criar'), n = document.querySelector('.c82-card .c82-entrar'); return e && n ? JSON.stringify({criar: !e.hidden && e.offsetParent !== null, entrar: n.offsetParent !== null}) : null; })()", 6000)
            cr = json.loads(cr) if cr else {}
            P.confere(cr.get('entrar') is True and cr.get('criar') is False, 'Ajustes › Conta (sem conta): fica o ENTRAR; o CRIAR CONTA some', cr)
            await b.close()
            PL.m('donoContas.cadastro', {'aberto': True}, tk)
            b, pg, e2 = await novo(pw, PL); erros.append(e2)
            abas = await abas_login(pg)
            P.confere(abas == ['ENTRAR', 'CRIAR CONTA', 'RECUPERAR'] and not await rt(pg, "!!document.querySelector('#v84auth .v881-fechado')"), 'com o cadastro aberto pelo Dono, o CRIAR CONTA volta', abas)
            await b.close()
            PL.m('donoContas.cadastro', {'aberto': False}, tk)

            print('\n2) duas contas jogam no mesmo aparelho (uma nas chaves, outra na gaveta)')
            c2 = PL.m('donoContas.criar', {'username': 'kauazin7', 'nomeExibicao': 'Kauã', 'aceiteTermos': True}, tk)
            c3 = PL.m('donoContas.criar', {'username': 'lucasznx', 'nomeExibicao': 'Lucas', 'aceiteTermos': True}, tk)
            b, pg, e3 = await novo(pw, PL); erros.append(e3)
            pub = await entra(pg, 'lucasznx', c3['senha'])
            await rt(pg, "(localStorage.setItem(%s, JSON.stringify({marca:'VELHA3'})), 1)" % json.dumps(MARCA))
            nasc3 = await rt(pg, "localStorage.getItem('racha-82-nasc:c3')")
            P.confere(pub == '000003' and nasc3 and int(nasc3) > 0, 'a 000003 entrou neste aparelho (e o jogo anotou quando ela nasceu)', (pub, nasc3))
            await sai(pg)
            pub = await entra(pg, 'kauazin7', c2['senha'])
            gaveta3 = await rt(pg, "localStorage.getItem('racha-guarda:c3') || ''")
            await rt(pg, "(localStorage.setItem(%s, JSON.stringify({marca:'VELHA2'})), 1)" % json.dumps(MARCA))
            P.confere(pub == '000002' and 'VELHA3' in gaveta3 and await rt(pg, "localStorage.getItem('racha-dono')") == 'c2',
                      'a 000002 entrou depois: o progresso da 000003 foi para a gaveta dela e as chaves são da 000002', (pub, gaveta3[:80]))
            await sai(pg)
            pubD = await entra(pg, 'dono', SENHA)
            await rt(pg, "(localStorage.setItem(%s, JSON.stringify({marca:'DO-DONO'})), 1)" % json.dumps(MARCA))
            P.confere(pubD == '000001' and 'VELHA2' in (await rt(pg, "localStorage.getItem('racha-guarda:c2') || ''")), 'e o Dono por último: a 000002 também na gaveta', pubD)

            print('\n3) o Dono zera as contas e cria contas novas com os mesmos números')
            z = PL.m('donoContas.zerar', {'senha': SENHA, 'confirmacao': 'ZERAR'}, tk)
            n2 = PL.m('donoContas.criar', {'username': 'outrocara2', 'nomeExibicao': 'Outro Dois', 'aceiteTermos': True}, tk)
            n3 = PL.m('donoContas.criar', {'username': 'outrocara3', 'nomeExibicao': 'Outro Três', 'aceiteTermos': True}, tk)
            P.confere(z['apagadas'] == 2 and n2['idPublico'] == '000002' and n3['idPublico'] == '000003', 'zerado: as contas novas são de novo a 000002 e a 000003', (z, n2['idPublico'], n3['idPublico']))
            await sai(pg)
            pub = await entra(pg, 'outrocara2', n2['senha'])
            st = json.loads(await rt(pg, "JSON.stringify({dono: localStorage.getItem('racha-dono'), marca: localStorage.getItem(%s), g2: localStorage.getItem('racha-guarda:c2'), g3: localStorage.getItem('racha-guarda:c3'), g1: localStorage.getItem('racha-guarda:c1'), apagou: !!RACHA82.apagouVelha, nasc: localStorage.getItem('racha-82-nasc:c2')})" % json.dumps(MARCA)))
            P.confere(pub == '000002' and st['apagou'] and 'VELHA2' not in (st['marca'] or '') and 'VELHA2' not in (st['g2'] or ''),
                      'a 000002 nova entrou e NÃO herdou o progresso da 000002 apagada (a gaveta dela saiu do aparelho)', st)
            P.confere(st['g1'] and 'DO-DONO' in st['g1'], 'o progresso do Dono continua na gaveta dele (o Dono não foi apagado)', (st['g1'] or '')[:80])
            nasc_novo = PL.q('auth.eu', None, PL.m('auth.entrar', {'identificador': 'outrocara2', 'senha': n2['senha']})['token'])['conta']['criadoEm']
            P.confere(st['nasc'] and int(st['nasc']) == await rt(pg, "Date.parse(%s)" % json.dumps(nasc_novo)), 'o aparelho anotou a hora em que a conta nova nasceu (para este número)', (st['nasc'], nasc_novo))

            print('\n4) a outra conta apagada (a 000003, guardada na gaveta)')
            await sai(pg)
            pub = await entra(pg, 'outrocara3', n3['senha'])
            st3 = json.loads(await rt(pg, "JSON.stringify({dono: localStorage.getItem('racha-dono'), marca: localStorage.getItem(%s), g3: localStorage.getItem('racha-guarda:c3'), apagou: !!RACHA82.apagouVelha})" % json.dumps(MARCA)))
            P.confere(pub == '000003' and st3['apagou'] and 'VELHA3' not in (st3['marca'] or '') and not st3['g3'], 'a 000003 nova também começa limpa (sem o progresso da 000003 apagada)', st3)
            await b.close()

            print('\n5) a conta apagada era a última a jogar (nas chaves): o jogo abre com ela guardada e a sessão já não vale')
            c4 = PL.m('donoContas.criar', {'username': 'quartoo4', 'nomeExibicao': 'Quarto', 'aceiteTermos': True}, tk)
            b, pg, e4 = await novo(pw, PL); erros.append(e4)
            pub = await entra(pg, 'quartoo4', c4['senha'])
            await rt(pg, "(localStorage.setItem(%s, JSON.stringify({marca:'VELHA4'})), 1)" % json.dumps(MARCA))
            PL.m('donoContas.zerar', {'senha': SENHA, 'confirmacao': 'ZERAR'}, tk)
            for u in ('nova2', 'nova3'):
                PL.m('donoContas.criar', {'username': u + 'xx', 'nomeExibicao': u, 'aceiteTermos': True}, tk)
            n4 = PL.m('donoContas.criar', {'username': 'quarto4b', 'nomeExibicao': 'Quarto Novo', 'aceiteTermos': True}, tk)
            # (o aparelho sem a anotação da hora: como o que ficou de uma versão de antes — quem decide é o servidor: a conta
            # nova nasceu depois do zerar)
            await rt(pg, "(localStorage.removeItem('racha-82-nasc:c4'), 1)")
            await pg.reload()                                 # (o jogo abre com a conta guardada: a sessão dela caiu no zerar → o ENTRAR)
            pub2 = await entra(pg, 'quarto4b', n4['senha'])
            st4 = json.loads(await rt(pg, "JSON.stringify({dono: localStorage.getItem('racha-dono'), marca: localStorage.getItem(%s), apagou: !!RACHA82.apagouVelha})" % json.dumps(MARCA)))
            P.confere(pub == '000004' and pub2 == '000004' and st4['dono'] == 'c4' and st4['apagou'] and 'VELHA4' not in (st4['marca'] or ''),
                      'a conta apagada estava nas chaves (a última a jogar), sem a anotação de versão de antes: a 000004 nova entra e as chaves velhas saem', (pub, pub2, st4))
            # o Dono, também sem a anotação: não é apagado (o servidor diz que a conta dele não nasceu depois do zerar)
            await sai(pg)
            await entra(pg, 'dono', SENHA)
            await rt(pg, "(localStorage.setItem(%s, JSON.stringify({marca:'DONO-FICA'})), localStorage.removeItem('racha-82-nasc:c1'), 1)" % json.dumps(MARCA))
            await sai(pg)
            await entra(pg, 'quarto4b', n4['senha'])
            await sai(pg)
            await entra(pg, 'dono', SENHA)
            stD = json.loads(await rt(pg, "JSON.stringify({marca: localStorage.getItem(%s), apagou: !!RACHA82.apagouVelha})" % json.dumps(MARCA)))
            P.confere('DONO-FICA' in (stD['marca'] or '') and not stD['apagou'], 'o Dono sem a anotação da hora: o progresso dele continua (só as contas nascidas depois do zerar passam pela faxina)', stD)
            await b.close()
    finally:
        PL.desce()
    todos = [x for l in erros for x in l]
    P.confere(not todos, 'nenhum erro de JavaScript', todos[:3])
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
