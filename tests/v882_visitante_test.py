"""v88.2 · JOGAR ONLINE SEM CONTA (só o nome), com o jogo de verdade em dois navegadores:
  · num servidor das salas que aceita visitante (como o site de teste do Render: tests/servidor_visitantes.cjs, sem a
    plataforma de contas): a tela de entrada só com o JOGAR ONLINE e o SÓ TREINAR OFFLINE, os nomes recusados (curto,
    "Jogador", palavrão), e duas pessoas sem conta — cada uma só com o nome — criando a sala, entrando pelo JOGAR AGORA,
    vendo o nome uma da outra e jogando a partida (no servidor); o nome lembrado ao abrir de novo;
  · na plataforma de teste (com as contas): o JOGAR ONLINE em cima e o ENTRAR da conta embaixo; sem conta, a sala abre
    (o padrão da v88.2); com RACHA_VISITANTES=0, o servidor recusa e o jogo mostra o LOGIN OBRIGATÓRIO.
  python3 tests/v882_visitante_test.py
"""
import asyncio, json, os, socket, subprocess, sys, tempfile, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from comum import Placar, RAIZ, CHROME, FONTES, rt
from v881_painel_test import Plataforma
from playwright.async_api import async_playwright


def porta_livre():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


async def abre(pw, url, nav=None):
    b = nav or await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': 1280, 'height': 720}, has_touch=True)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script('window.RACHA_CONFIG = {presente:false};')
    pg = await ctx.new_page()
    pg.erros = []
    pg.on('pageerror', lambda e: pg.erros.append(str(e)[:300]))
    await pg.goto(url)
    await pg.wait_for_selector('#v84auth .v882-visit', timeout=20000)
    await asyncio.sleep(.8)                                  # (a pergunta do cadastro: com ou sem a plataforma neste endereço)
    pg.b, pg.ctx = b, ctx
    return pg


async def espera(pg, js, ms=8000, passo=120):
    t0 = time.time(); v = None
    while (time.time() - t0) * 1000 < ms:
        try: v = await rt(pg, js)
        except Exception: v = None
        if v: return v
        await asyncio.sleep(passo / 1000)
    return v


async def joga(pg, nome):
    """O JOGAR ONLINE pelos botões: o nome e o botão; devolve o erro mostrado (ou '')."""
    await pg.fill('#v84auth .v882-nome', nome)
    await pg.click('#v84auth .v882-go')
    await asyncio.sleep(.4)
    return await pg.evaluate("(() => { const e = document.querySelector('#v84auth .v882-visit .v84-erro'); return e && !e.hidden ? e.textContent : ''; })()")


async def principal():
    P = Placar('v88.2 · jogar online sem conta (só o nome)')
    porta = porta_livre()
    srv = subprocess.Popen(['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria',
                            '--estaticos', str(RAIZ), '--nome', 'Servidor de teste', '--sem-p2p'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    time.sleep(.8)
    url = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
    erros = []
    try:
        async with async_playwright() as pw:
            print('1) num servidor que aceita visitante (como o site de teste), sem a plataforma de contas')
            A = await abre(pw, url)
            vis = await rt(A, "[...document.querySelectorAll('#v84auth .v84-card > div > *')].filter(e => !e.hidden && e.offsetParent !== null).map(e => e.className)")
            P.confere(vis == ['v882-visit', 'v84-alt'], 'a tela de entrada mostra só o JOGAR ONLINE (com o nome) e o SÓ TREINAR OFFLINE — as abas da conta não funcionariam aqui', vis)
            e1 = await joga(A, 'K')
            e2 = await joga(A, 'Jogador')
            e3 = await joga(A, 'p0rra10')
            P.confere('2 a 12' in e1 and 'Jogador' in e2 and 'palavrão' in e3 and await rt(A, "!!document.getElementById('v84auth')"),
                      'os nomes recusados na hora (curto demais, o "Jogador" de quem não escolheu, palavrão) — a tela continua', [e1, e2, e3])
            e4 = await joga(A, 'Kauã10')
            ok = await espera(A, "!document.getElementById('v84auth') && lobby.aberto && lobby.tela === 'amigos' && !!NET49.id && perfil.nome === 'Kauã10'")
            P.confere(e4 == '' and ok, 'JOGAR ONLINE com o nome: a tela fecha, abre as SALAS e o jogo já conecta no servidor (sem conta)', await rt(A, "({tela:lobby.tela, id:NET49.id, nome:perfil.nome})"))
            B = await abre(pw, url, A.b)
            await joga(B, 'Beto7')
            okB = await espera(B, "!!NET49.id && perfil.nome === 'Beto7'")
            P.confere(bool(okB), 'a segunda pessoa (outro navegador) entra do mesmo jeito, só com o nome', await rt(B, "({id:NET49.id, nome:perfil.nome})"))

            print('\n2) a sala online entre duas pessoas sem conta')
            await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:4, jogo:'futebol', tempo:0, bots:false, nome:'Racha da Rua'}); sxCriar(); return true; })()")
            sala = await espera(A, "NET49.room && NET49.room.roster[0] === NET49.id && NET49.room.code")
            P.confere(bool(sala), 'quem entrou sem conta cria a sala online (e já fica no Time A)', sala)
            await rt(B, "slJogarAgora()")
            junto = await espera(B, "NET49.room && NET49.room.code === %s && NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)" % json.dumps(sala))
            nomes = await rt(A, "NET49.room ? NET49.room.members.filter(m => !m.bot).map(m => m.name).sort() : []")
            P.confere(bool(junto) and nomes == ['Beto7', 'Kauã10'], 'a outra entra pelo JOGAR AGORA e as duas veem o nome uma da outra na sala', nomes)
            pubs = await rt(A, "NET49.room.members.filter(m => !m.bot).map(m => m.id)")
            P.confere(all(p and not p.startswith('c') for p in pubs), 'as duas estão como visitantes (sem conta: o número de visitante, não o de uma conta)', pubs)
            await rt(A, "slIniciar()")
            jA = await espera(A, "NET49.playing && NET49.lastTick > 0", 10000); jB = await espera(B, "NET49.playing && NET49.lastTick > 0", 10000)
            P.confere(bool(jA and jB), 'a partida começa e roda no servidor para as duas (os quadros chegando)', [await rt(A, "({p:NET49.playing, t:NET49.lastTick})"), await rt(B, "({p:NET49.playing, t:NET49.lastTick})")])
            erros += A.erros + B.erros
            await A.ctx.close(); await B.ctx.close()

            print('\n3) o nome fica guardado para a próxima vez')
            # (outra aba no mesmo navegador do A não serve: o contexto foi fechado; abre um novo e faz o caminho inteiro)
            C = await abre(pw, url, A.b)
            await joga(C, 'Chico99')
            await espera(C, "!!NET49.id")
            await C.reload()
            await C.wait_for_selector('#v84auth .v882-visit', timeout=20000)
            await asyncio.sleep(.6)
            v = await C.evaluate("(document.querySelector('#v84auth .v882-nome') || {}).value")
            P.confere(v == 'Chico99', 'abrindo de novo, o nome já vem escrito (é só tocar em JOGAR ONLINE)', v)
            erros += C.erros
            await C.ctx.close()
            await A.b.close()
    finally:
        srv.terminate()

    # ---------------------------------------------------------------- a plataforma de teste (com as contas)
    for visit in ('', '0'):
        banco = os.path.join(tempfile.mkdtemp(prefix='racha882-'), 'plataforma.sqlite')
        env = {'RACHA_OWNER_PASSWORD': 'Dono-Visita-882x'}
        if visit: env['RACHA_VISITANTES'] = visit
        PL = Plataforma(banco, env).sobe()
        try:
            async with async_playwright() as pw:
                pg = await abre(pw, PL.base + '/tests/build/racha_teste.html')
                if not visit:
                    print('\n4) na plataforma com as contas: o JOGAR ONLINE em cima e o ENTRAR da conta embaixo')
                    vis = await rt(pg, "[...document.querySelectorAll('#v84auth .v84-card > div > *')].filter(e => !e.hidden && e.offsetParent !== null).map(e => e.className)")
                    P.confere(vis[:3] == ['v882-visit', 'v882-ou', 'v84-abas'], 'com a plataforma: o JOGAR ONLINE, o "OU ENTRE NA SUA CONTA" e as abas da conta', vis)
                    await joga(pg, 'Visita1')
                    okp = await espera(pg, "!!NET49.id && !NET49.conta")
                    await rt(pg, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:4, jogo:'futebol', tempo:0, bots:false, nome:'Sala da Visita'}); sxCriar(); return true; })()")
                    s2 = await espera(pg, "NET49.room && NET49.room.code")
                    P.confere(bool(okp and s2), 'sem conta, a sala abre também na plataforma (o padrão da v88.2: visitante entra nas salas)', s2)
                else:
                    print('\n5) a plataforma com RACHA_VISITANTES=0 (o login obrigatório de antes, se o dono quiser)')
                    await joga(pg, 'Visita2')
                    pop = await espera(pg, "!LB.pop.hidden && /ENTRE PARA JOGAR ONLINE/.test(LB.popCaixa.textContent) && !NET49.id", 8000)
                    P.confere(bool(pop), 'o servidor recusa quem não tem conta e o jogo mostra o LOGIN OBRIGATÓRIO (ENTRAR NA CONTA / SÓ TREINAR OFFLINE)')
                erros += pg.erros
                await pg.b.close()
        finally:
            PL.desce()
    P.confere(not erros, 'nenhum erro de JavaScript', erros[:3])
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
