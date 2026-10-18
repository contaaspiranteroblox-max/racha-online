"""RACHA v87 · TUDO DENTRO DO JOGO: o site abre o jogo direto, em tela cheia, e o login e a conta ficam no jogo.

Sobe a plataforma de mentira da v87 (tests/v87_plataforma_falsa.mjs: a raiz leva ao jogo, a API tRPC com token OU cookie,
as páginas da conta) e abre o JOGO DE VERDADE do build (app/public/game/racha.html) no Chromium. Confere:
  1. a raiz do site abre o jogo sozinho, na página inteira (nada da plataforma por cima), e o login é o do jogo — com a
     cara do jogo (o amarelo dos botões, o cinza das janelas);
  2. entrar pelo formulário do jogo: a conta aparece no jogo; o SAIR DA CONTA fica em Ajustes › Conta; v87.2: com o
     presente: true do config.js, a conta ganha as moedas e gemas de teste uma vez (e a janela diz que é de teste);
  3. o botão AMIGOS do lobby abre os amigos da conta POR CIMA do jogo (a página do site num painel, com a sessão), e o
     VOLTAR AO JOGO, o "JOGAR" da página e o Esc fecham o painel sem recarregar o jogo; o ABRIR O PERFIL DA CONTA também;
  4. o SAIR DA CONTA encerra a sessão (no servidor) e volta ao login do jogo;
  5. quem já entrou pelo SITE (o cookie do mesmo endereço) entra direto no jogo, sem a senha de novo e sem ficar recarregando;
  6. a equipe (cargo) ganha o RACHA CONTROL em Ajustes › Conta, que abre o /admin;
  7. o SÓ TREINAR OFFLINE escolhido enquanto o jogo confere a sessão vale (não entra na conta depois);
  8. sem a plataforma (/api responde 404: o servidor das salas, o GitHub Pages), o login de sempre com o SÓ TREINAR OFFLINE;
  9. nenhum erro de JavaScript.
Uso: python3 tests/v87_site_test.py"""
import asyncio, json, subprocess, sys, time, socket, urllib.request
from comum import Placar, RAIZ, CHROME, FONTES, rt
from playwright.async_api import async_playwright


def porta_livre():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


def sobe(*extra):
    p = porta_livre()
    pr = subprocess.Popen(['node', str(RAIZ / 'tests' / 'v87_plataforma_falsa.mjs'), str(p), '--teste', *extra], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for _ in range(50):
        try:
            socket.create_connection(('127.0.0.1', p), timeout=0.2).close(); break
        except OSError:
            time.sleep(0.1)
    return pr, 'http://127.0.0.1:%d' % p


def log(base):
    return json.loads(urllib.request.urlopen(base + '/__log').read().decode())


CARGAS = "try{sessionStorage.setItem('v87_cargas', String((+sessionStorage.getItem('v87_cargas')||0)+1));}catch(e){}"
ESPERA_JOGO = "() => !!(window.RACHA84 && window.__RT && document.querySelector('#v84auth, .v77-amg'))"
# (o jogo roda dentro de uma função: o estado de dentro — C82, ajxAbre, v87Abre… — é lido pelo window.__RT da cópia de teste)
LOGADO = "() => window.RACHA84 && window.RACHA84.logado() && !document.getElementById('v84auth') && window.__RT && window.__RT('!!C82.conta')"


async def principal():
    P = Placar('v87 · tudo dentro do jogo (o site abre o jogo direto)')
    srv, B = sobe()
    lento, BL = sobe('--lento-ms', '1500')
    semapi, BS = sobe('--sem-api')
    erros = []
    try:
        async with async_playwright() as pw:
            nav = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])

            async def contexto():
                ctx = await nav.new_context(viewport={'width': 1280, 'height': 720}, has_touch=True)
                await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
                await ctx.add_init_script(CARGAS)
                pg = await ctx.new_page()
                pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
                # (a plataforma de mentira não tem o servidor das salas: depois da primeira vez o jogo tenta o WebSocket do mesmo
                # endereço — o Chat do Brasil — e segue sem ele; o navegador avisa no console, e isso não é erro do jogo)
                pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' and 'Failed to load resource' not in m.text and not m.text.startswith('WebSocket connection to') else None)
                return ctx, pg

            async def sem_onb(pg):
                await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
                # (as janelas do lobby — o presente de teste do config.js, as novidades — saem da frente dos botões)
                await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")

            # ------------------------------------------------ 1) a raiz abre o jogo, e o login é o do jogo
            print('\n1) a raiz do site abre o jogo, com o login do jogo')
            ctx, pg = await contexto()
            await pg.goto(B + '/')
            await pg.wait_for_function(ESPERA_JOGO, timeout=20000)
            await pg.wait_for_selector('#v84auth .v84-abas', timeout=8000)
            info = await pg.evaluate("""() => ({url:location.pathname, topo:window.top === window, larg:document.documentElement.clientWidth, alt:document.documentElement.clientHeight,
              abas:[...document.querySelectorAll('#v84auth .v84-abas button')].map(b => b.textContent),
              go:getComputedStyle(document.querySelector('#v84auth .v84-go')).backgroundColor,
              card:getComputedStyle(document.querySelector('#v84auth .v84-card')).backgroundImage,
              logo:getComputedStyle(document.querySelector('#v84auth .v84-logo')).color,
              offline:!![...document.querySelectorAll('#v84auth button')].find(b => /TREINAR OFFLINE/.test(b.textContent))})""")
            P.confere(info['url'] == '/game/racha.html' and info['topo'], 'a raiz do site leva ao jogo, aberto na página inteira (não dentro do site)', info)
            P.confere(info['abas'] == ['ENTRAR', 'CRIAR CONTA', 'RECUPERAR'] and info['offline'], 'o login é o do jogo: ENTRAR, CRIAR CONTA, RECUPERAR e o SÓ TREINAR OFFLINE', info['abas'])
            P.confere(info['go'] == 'rgb(244, 189, 50)' and 'linear-gradient' in info['card'] and info['logo'] == 'rgb(244, 189, 50)',
                      'o login tem a cara do jogo (o amarelo dos botões, o cinza-carvão das janelas)', {k: info[k] for k in ('go', 'card', 'logo')})
            l0 = log(B)
            P.confere(any(x['proc'] == 'auth.eu' and x['via'] == 'nada' for x in l0), 'sem sessão no aparelho, o jogo pergunta a sessão do site antes de mostrar o formulário', l0)

            # ------------------------------------------------ 2) entrar pelo jogo
            print('\n2) entrar pelo formulário do jogo')
            await pg.fill('#v84auth input[type=text]', 'croy')
            await pg.fill('#v84auth input[type=password]', 'racha123')
            await pg.click('#v84auth .v84-go')
            await pg.wait_for_function(LOGADO, timeout=20000)
            await pg.wait_for_timeout(600)
            c = await rt(pg, "({nome:C82.conta.nome, token:!!RACHA84.token, cookie:RACHA84.cookie, xp:RACHA84.eu && RACHA84.eu.xp, cargas:+sessionStorage.getItem('v87_cargas')})")
            P.confere(c['nome'] == 'CROY' and c['token'], 'entrou: a conta aparece no jogo (CROY) e a sessão fica no aparelho', c)
            P.confere(c['xp'] == 120, 'depois do login o jogo busca a conta completa (o XP vem do auth.eu)', c)
            pr = await rt(pg, "({m:CONTA.moedas, g:CONTA.gemas, ids:CONTA.presentes.slice(), cfg:window.RACHA_CONFIG && window.RACHA_CONFIG.presente})")
            P.confere(pr['cfg'] is True and pr['ids'].count('teste-v87') == 1 and pr['m'] == 50500 and pr['g'] == 5025,
                      'v87.2: com presente: true no config.js, a conta ganha o presente de teste uma vez (%d moedas e %d gemas)' % (pr['m'], pr['g']), pr)
            # a janela do presente: a fila do lobby (a mesma que o jogo segue quando a apresentação da primeira vez acaba)
            jp = await rt(pg, """(() => {
              if (typeof ONB !== 'undefined' && (ONB.aberto || ONB.aquece)) onbFim();
              for (let i = 0; i < 6; i++){
                if (LB.pop.hidden) filaPops();
                if (LB.pop.hidden) break;
                const tag = LB.popCaixa.querySelector('.pop-tag');
                if (tag && tag.textContent === 'PRESENTE') return LB.popCaixa.querySelector('.pop-txt').textContent;
                fechaPop();
              }
              return null;
            })()""")
            P.confere(bool(jp) and jp.startswith('Presente de teste: moedas e gemas') and 'DEMONSTRAÇÃO' not in jp, 'a janela do presente diz que é de teste (sem falar em demonstração)', jp)
            await sem_onb(pg)
            await rt(pg, "ajxAbre('conta')")
            await pg.wait_for_timeout(300)
            aj = await pg.evaluate("() => ({sair:!!document.querySelector('.c82-card .v84-sair'), admin:!!document.querySelector('.c82-card .v87-admin')})")
            P.confere(aj['sair'] and not aj['admin'], 'Ajustes › Conta: o SAIR DA CONTA está lá (e o RACHA CONTROL não, para quem não é da equipe)', aj)
            await rt(pg, "ajxFecha()")

            # ------------------------------------------------ 3) os amigos no jogo e as páginas da conta por cima do jogo
            print('\n3) os amigos da conta no jogo; as páginas do site por cima do jogo')
            # v88: os amigos da conta ficam no próprio jogo (a tela AMIGOS da v88, com os dados da plataforma): o AMIGOS do lobby
            # abre essa tela, sem o painel do site por cima
            await pg.click('.v77-amg')
            await pg.wait_for_timeout(400)
            t = await rt(pg, "({tela:lobby.tela, painel:!!document.getElementById('v87site')})")
            P.confere(t['tela'] == 'v88amigos' and not t['painel'], 'v88: com a conta, o AMIGOS do lobby abre os amigos da conta dentro do jogo (sem o painel do site)', t)
            await rt(pg, "fechaTela()")
            await pg.wait_for_timeout(200)

            async def abre_perfil_conta():                    # o nome do cartão → ABRIR O PERFIL DA CONTA (a página do site, no painel)
                await rt(pg, "editarNome(true)")
                await pg.wait_for_timeout(200)
                bt = pg.locator('#lb-pop button', has_text='ABRIR O PERFIL DA CONTA')
                tem = await bt.count()
                if tem:
                    await bt.first.click()
                    await pg.wait_for_selector('#v87site .v87-frame', timeout=5000)
                return tem

            await pg.evaluate("window.__marca = 87")
            tem = await abre_perfil_conta()
            src = await pg.get_attribute('#v87site .v87-frame', 'src') if tem else ''
            fr = pg.frame_locator('#v87site .v87-frame')
            quem = None
            if tem:
                await fr.locator('#pg').wait_for(timeout=8000)
                quem = await fr.locator('#quem').text_content()
            tit = await pg.text_content('#v87site .v87-tit') if tem else ''
            P.confere(tem == 1 and src.endswith('/perfil') and quem == 'CROY', 'o ABRIR O PERFIL DA CONTA (o nome do cartão) abre o perfil da conta num painel por cima do jogo, já com a sessão (%s)' % tit, [src, quem])
            await pg.click('#v87site .v87-volta')
            await pg.wait_for_timeout(200)
            fechou = await pg.evaluate("() => ({painel:!!document.getElementById('v87site'), marca:window.__marca, cargas:+sessionStorage.getItem('v87_cargas')})")
            P.confere(not fechou['painel'] and fechou['marca'] == 87, 'o VOLTAR AO JOGO fecha o painel e o jogo continua do jeito que estava (sem recarregar)', fechou)
            await abre_perfil_conta()
            await fr.locator('#jogar').click()
            await pg.wait_for_function("() => !document.getElementById('v87site')", timeout=4000)
            P.confere(True, 'o "JOGAR" de dentro da página do site também fecha o painel')
            await abre_perfil_conta()
            await pg.wait_for_timeout(150)
            await pg.keyboard.press('Escape')
            await pg.wait_for_timeout(300)
            P.confere(not await pg.evaluate("!!document.getElementById('v87site')"), 'o Esc fecha o painel (como as outras janelas do jogo)')
            P.confere(await rt(pg, "v87TemSite() && !v87Abre('/admin') && !v87Abre('https://outro.site/x')"), 'só as páginas da conta abrem no painel (o resto não)')

            # ------------------------------------------------ 4) sair
            print('\n4) SAIR DA CONTA')
            await rt(pg, "ajxAbre('conta')")
            await pg.wait_for_timeout(200)
            await pg.click('.c82-card .v84-sair')
            await pg.wait_for_function("() => !!document.querySelector('#v84auth .v84-abas')", timeout=20000)
            s4 = await pg.evaluate("() => ({logado:RACHA84.logado(), token:RACHA84.token, cookie:RACHA84.cookie})")
            l4 = log(B)
            P.confere(not s4['logado'] and not s4['token'] and not s4['cookie'] and any(x['proc'] == 'auth.sair' for x in l4),
                      'o SAIR DA CONTA encerra a sessão no servidor e volta para o login do jogo', s4)
            await ctx.close()

            # ------------------------------------------------ 5) quem já entrou pelo site entra direto
            print('\n5) a sessão do site vale no jogo')
            ctx, pg = await contexto()
            n5 = len(log(B))                                  # (as chamadas deste aparelho em diante)
            await pg.goto(B + '/__entrar_site?u=croy')
            await pg.wait_for_function(LOGADO, timeout=20000)
            await pg.wait_for_timeout(800)
            s5 = await rt(pg, "({nome:C82.conta.nome, token:RACHA84.token, cookie:RACHA84.cookie, url:location.pathname, cargas:+sessionStorage.getItem('v87_cargas')})")
            P.confere(s5['nome'] == 'CROY' and s5['cookie'] and not s5['token'] and s5['url'] == '/game/racha.html',
                      'quem entrou pelo site cai direto no jogo, já com a conta (sem a senha de novo)', s5)
            P.confere(s5['cargas'] <= 2, 'o jogo abre no máximo 2 vezes para trocar o dono do progresso (sem ficar recarregando: %d)' % s5['cargas'], s5)
            l5 = [x for x in log(B)[n5:] if x['proc'] == 'progresso.carregar' or x['proc'] == 'auth.eu']
            P.confere(l5 and all(x['via'] == 'cookie' for x in l5 if x['conta']), 'as chamadas da conta vão pelo cookie do site (o jogo não guarda senha nem token)', l5[-3:])
            await ctx.close()

            # ------------------------------------------------ 6) a equipe: RACHA CONTROL
            print('\n6) RACHA CONTROL para a equipe')
            ctx, pg = await contexto()
            await pg.goto(B + '/__entrar_site?u=dono')
            await pg.wait_for_function(LOGADO, timeout=20000)
            await pg.wait_for_timeout(500)
            await sem_onb(pg)
            await rt(pg, "ajxAbre('conta')")
            await pg.wait_for_selector('.c82-card .v87-admin', timeout=4000)
            await pg.click('.c82-card .v87-admin')
            await pg.wait_for_url('**/admin', timeout=6000)
            P.confere(pg.url.endswith('/admin'), 'quem é da equipe tem o RACHA CONTROL em Ajustes › Conta, e ele abre o painel (/admin)', pg.url)
            await ctx.close()

            # ------------------------------------------------ 7) SÓ TREINAR OFFLINE enquanto confere
            print('\n7) o SÓ TREINAR OFFLINE enquanto o jogo confere a sessão')
            ctx, pg = await contexto()
            await pg.goto(BL + '/__entrar_site?u=croy')
            await pg.wait_for_selector('#v84auth .v84-ver', timeout=20000)
            await pg.locator('#v84auth button', has_text='SÓ TREINAR OFFLINE').click()
            await pg.wait_for_timeout(2300)
            s7 = await pg.evaluate("() => ({logado:RACHA84.logado(), tela:!!document.getElementById('v84auth'), cargas:+sessionStorage.getItem('v87_cargas')})")
            P.confere(not s7['logado'] and not s7['tela'] and s7['cargas'] == 1, 'escolheu treinar offline: o jogo segue sem a conta (não entra nem recarrega quando a resposta chega)', s7)
            await ctx.close()

            # ------------------------------------------------ 8) sem a plataforma
            print('\n8) sem a plataforma (/api responde 404)')
            ctx, pg = await contexto()
            await pg.goto(BS + '/')
            await pg.wait_for_selector('#v84auth .v84-abas', timeout=20000)
            s8 = await pg.evaluate("() => ({offline:!![...document.querySelectorAll('#v84auth button')].find(b => /TREINAR OFFLINE/.test(b.textContent)), logado:RACHA84.logado(), cookie:RACHA84.cookie})")
            P.confere(s8['offline'] and not s8['logado'] and not s8['cookie'], 'sem a plataforma: o login de sempre, com o SÓ TREINAR OFFLINE (o servidor das salas e o GitHub Pages ficam como antes)', s8)
            await pg.locator('#v84auth button', has_text='SÓ TREINAR OFFLINE').click()
            await pg.wait_for_timeout(300)
            P.confere(not await pg.evaluate("!!document.getElementById('v84auth')"), 'e o SÓ TREINAR OFFLINE abre o jogo')
            await ctx.close()

            P.confere(not erros, 'nenhum erro de JavaScript', erros[:4])
            await nav.close()
    finally:
        for pr in (srv, lento, semapi):
            pr.terminate()
    return P.fim()

if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
