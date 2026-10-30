"""RACHA v99 · OS CHUTES DO RACHÃO NAS SALAS PERSONALIZADAS (no navegador, com o servidor de verdade e na sala neste aparelho).
O pedido: "crie um modo com cavadinha e curva igual do Rachão que dê pra jogar nas salas personalizadas; o cara pode escolher
sem nada, com cavadinha e curva, e super chute". O servidor das salas (tests/servidor_visitantes.cjs, com a contagem de 1,2 s)
e duas sessões do jogo (a Ana no celular deitado, o Beto no computador), mais uma sem servidor (a sala neste aparelho):
  1) o CRIAR SALA: os três chutes (CAVADINHA, CURVA e SUPER CHUTE) ligam e desligam; nada ligado = só o chutar; no COM CURVA
     eles ficam travados (com o porquê); com o servidor antigo, o aviso; a escolha fica guardada;
  2) a sala: o quadro CHUTES nas regras (as setas trocam, para todos), os chutes na linha do nome; a lista com a etiqueta;
  3) a partida: os botões só dos chutes ligados (o HUD de sempre), o cartão de como joga, a tecla Q e o toque no botão armam a
     cavadinha (e o outro vê o que ela armou), a cavadinha sobe (nas duas telas: a bola no alto com a sombra), a curva gira,
     e na rodada com o super: segurar e soltar carrega e chuta com fogo; a rodada sem os chutes é a de sempre;
  4) os moldes do HUD põem os quatro sem encostar em nada, o editor mostra com "Mostrar todos", as teclas trocam;
  5) a sala neste aparelho com os chutes: a partida no motor das salas, o 3, 2, 1, a cavadinha, a pausa e o ENCERRAR do
     árbitro, o JOGAR DE NOVO;
  6) as telas no celular deitado sem nada passando da largura.
Capturas em tests/saida/v99_*.png.
Rodar: python3 tests/v99_chutes_online_test.py"""
import sys, json, asyncio, socket, subprocess, time, os
from comum import Placar, rt, abre, async_playwright, RAIZ, CHROME, HARNESS, FONTES

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)


def porta_livre():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


def sobe(porta):
    env = dict(os.environ, RACHA_CONTAGEM_MS='1200')
    p = subprocess.Popen(['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria', '--estaticos', str(RAIZ), '--nome', 'Teste dos chutes', '--sem-p2p'],
                         stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env)
    t0 = time.time()
    while time.time() - t0 < 8:
        try:
            s = socket.create_connection(('127.0.0.1', porta), timeout=.3); s.close(); return p
        except OSError:
            time.sleep(.1)
    return p


async def sessao(pw, url, nome, w, h):
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=True)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script("window.RACHA_CONFIG = Object.assign(window.RACHA_CONFIG || {}, {presente:false});")
    await ctx.add_init_script("try{if(!localStorage.getItem('racha-treino-perfil-v1'))localStorage.setItem('racha-treino-perfil-v1', JSON.stringify({nome:%s, st:{partidas:3, concluidas:3}}));}catch(e){}" % json.dumps(nome))
    pg = await ctx.new_page()
    pg.erros = []
    pg.on('pageerror', lambda e: pg.erros.append(str(e)[:300]))
    pg.on('console', lambda m: pg.erros.append('console: ' + m.text[:200]) if m.type == 'error' and 'WebSocket' not in m.text and 'Failed to load resource' not in m.text else None)
    await pg.goto(url)
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=30000)
    await pg.wait_for_timeout(700)
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    await rt(pg, "(() => { if (typeof v84Fecha === 'function') v84Fecha(); return 1; })()")
    await rt(pg, HARNESS)
    await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return true; })()")
    pg.b, pg.nome = b, nome
    pg.cdp = await ctx.new_cdp_session(pg)
    return pg


async def espera(pg, js, ms=6000):
    t0 = time.time()
    while True:
        try:
            v = await rt(pg, js)
        except Exception:
            v = None
        if v:
            return v
        if (time.time() - t0) * 1000 > ms:
            return v
        await asyncio.sleep(.08)


async def toca(pg, x, y, ms=70):
    """um dedo de verdade (CDP) na tela"""
    pt = [{'x': x, 'y': y, 'id': 5, 'radiusX': 9, 'radiusY': 9, 'force': 1}]
    await pg.cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': pt})
    await asyncio.sleep(ms / 1000)
    await pg.cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': pt})


BOTAO_XY = "(k => { const c = cv.getBoundingClientRect(), e = el(k); return [c.left + e.x*c.width/W, c.top + e.y*c.height/H]; })"
ESTADO = "(() => { const s = RachaChutes99.estado(); return {op:s.op, joga:s.joga, prev:s.prev, lb:s.lb, ce:s.ce, cd:s.cd, su:s.su, meu:s.meu, outros:s.outros, vis:s.vis, erro:s.erro, srv:RachaChutes99.CR99.srv.bz}; })()"
OPS = "(() => [...document.querySelectorAll('.v99-op')].map(b => [b.querySelector('b').textContent, b.getAttribute('aria-pressed'), b.disabled]))()"
RESUMO = "(() => { const r = document.querySelector('.v99-resumo'); return r ? r.textContent : null; })()"
JOGA = "NET49.playing && !NET49.host && NET49.localSlot >= 0 && NET49.lastTick > 0 && !(V93P.contagem && v93Contando())"
SOBRA = "(() => { const d = document.scrollingElement; const fora = [...document.querySelectorAll('#lb button, #lb .sl-op, .v99-op')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).length; return {doc: d.scrollWidth - innerWidth, fora}; })()"
# a altura da bola nas duas telas (o servidor e o desenho), amostrada a cada quadro
AMOSTRA = "(() => { window.__am = []; clearInterval(window.__amT); window.__amT = setInterval(() => { const s = RachaChutes99.CR99; window.__am.push([s.srv.bz ? s.srv.bz[0] : 0, s.vis.z, s.srv.bz ? s.srv.bz[2] : 0, s.srv.bz ? s.srv.bz[4] : 0, s.vis.fogo, s.srv.bz ? s.srv.bz[3] : 0]); }, 16); return 1; })()"
FIM_AMOSTRA = "(() => { clearInterval(window.__amT); const a = window.__am || []; return {n:a.length, z:Math.max(0, ...a.map(x => x[0])), vis:Math.max(0, ...a.map(x => x[1])), sp:Math.max(0, ...a.map(x => Math.abs(x[2]))), fogo:Math.max(0, ...a.map(x => x[3])), visFogo:Math.max(0, ...a.map(x => x[4])), teto:Math.max(0, ...a.map(x => x[5]))}; })()"


async def tres_gols(pg):
    """os gols do Time A pelo gancho de teste do servidor (um de cada vez: na comemoração o motor não aceita outro)"""
    for _ in range(3):
        await espera(pg, "NET49.playing && (RQ.estado === 'jogo' || RQ.estado === 'saida')", 8000)
        antes = await rt(pg, "RQ.placar[0]")
        await rt(pg, "(() => { net49Send({type:'__teste_gol', time:0}); return 1; })()")
        await espera(pg, "RQ.placar[0] > %d" % antes, 4000)


async def principal():
    P = Placar('v99 · os chutes do Rachão nas salas personalizadas')
    porta = porta_livre()
    srv = sobe(porta)
    url = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
    sess = []
    try:
        async with async_playwright() as pw:
            A = await sessao(pw, url, 'Ana', 844, 390); B = await sessao(pw, url, 'Beto', 1280, 600); sess += [A, B]
            for pg in (A, B):
                await rt(pg, "abreTela('amigos')")
            ok = [await espera(pg, "!!NET49.id && RachaSalas99.estado().srv", 15000) for pg in (A, B)]
            P.confere(all(ok), 'as duas sessões conectam no servidor das salas, que diz ter os chutes do Rachão (cr: 1)', ok)

            # ---------------------------------------------------------------- 1) o CRIAR SALA
            print('\n1) o CRIAR SALA com os chutes do Rachão')
            await rt(A, "(() => { sxNovaSala(); const b = document.querySelector('.sx-onde .sx-op'); if (b && !b.classList.contains('on')) b.click(); return 1; })()")
            await asyncio.sleep(.3)
            r = await rt(A, OPS)
            P.confere(r == [['CAVADINHA', 'false', False], ['CURVA', 'false', False], ['SUPER CHUTE', 'false', False]] and 'Só o chutar' in (await rt(A, RESUMO) or ''),
                      'no FUTEBOL online, os três chutes aparecem desligados: "Só o chutar" (o PASSE e o CHUTE de sempre)', r)
            for nome in ('CAVADINHA', 'CURVA'):
                await rt(A, "(() => { const b = [...document.querySelectorAll('.v99-op')].find(x => x.querySelector('b').textContent === %s); b.click(); return 1; })()" % json.dumps(nome))
                await asyncio.sleep(.15)
            r = await rt(A, OPS); res = await rt(A, RESUMO)
            P.confere(r == [['CAVADINHA', 'true', False], ['CURVA', 'true', False], ['SUPER CHUTE', 'false', False]] and res.startswith('Cavadinha e curva.'),
                      'tocar liga a CAVADINHA e a CURVA (aria-pressed e o resumo: "Cavadinha e curva")', [r, res])
            await rt(A, "(() => { const c = document.querySelector('.v99-chutes'); if (c) c.scrollIntoView({block:'center'}); return 1; })()")
            await asyncio.sleep(.2)
            await A.screenshot(path=str(SAIDA / 'v99_criar_sala.png'))
            await rt(A, "(() => { SX.form.jogo = 'curva'; amigosRender(); return 1; })()")
            await asyncio.sleep(.15)
            r = await rt(A, OPS); res = await rt(A, RESUMO)
            P.confere(all(x[2] for x in r) and 'modo Futebol' in res, 'no COM CURVA os três ficam travados, com o porquê', [r, res])
            await rt(A, "(() => { SX.form.jogo = 'futebol'; amigosRender(); return 1; })()")
            await asyncio.sleep(.15)
            P.confere((await rt(A, OPS))[0][1] == 'true', 'de volta ao FUTEBOL, a escolha continua')
            await rt(A, "(() => { RachaSalas99.estado(); CR99S.srv = false; amigosRender(); return 1; })()")
            await asyncio.sleep(.15)
            r = await rt(A, OPS); res = await rt(A, RESUMO)
            P.confere(all(x[2] for x in r) and 'precisa ser atualizado' in res, 'com um servidor antigo (sem os chutes): travados, com o aviso de que ele precisa ser atualizado', res)
            await rt(A, "(() => { CR99S.srv = true; amigosRender(); return 1; })()")
            await asyncio.sleep(.15)
            P.confere(await rt(A, SOBRA) == {'doc': 0, 'fora': 0}, 'o CRIAR SALA no celular deitado: nada passa da largura', await rt(A, SOBRA))
            await rt(A, "(() => { document.querySelector('.sx-pe .sx-criar').click(); return 1; })()")
            sala = await espera(A, "NET49.room && NET49.room.chutes && JSON.stringify(NET49.room.chutes)", 8000)
            P.confere(sala == '{"lob":true,"curva":true,"super":false}', 'CRIAR SALA: a sala nasce com a cavadinha e a curva', sala)
            P.confere(await rt(A, "(() => { const o = JSON.parse(localStorage.getItem('racha-sala-pref')); return o.chutes; })()") == 'lc', 'a escolha fica guardada (a próxima sala começa com ela)')

            # ---------------------------------------------------------------- 2) a sala
            print('\n2) a sala: o quadro CHUTES, a linha do nome e a lista')
            await rt(A, "(() => { if (lobby.tela !== 'sala') abreTela('sala'); return 1; })()")
            await espera(A, "!!document.querySelector('#sl-ops .sl-op[data-k=\"chutes\"]')", 5000)
            r = await rt(A, "(() => ({op:document.querySelector('#sl-ops .sl-op[data-k=\"chutes\"] b').textContent, seis:document.getElementById('sl-ops').classList.contains('v99-6'), sub:document.getElementById('sl-sub').textContent}))()")
            P.confere(r['op'] == 'Cav+Curva' and r['seis'] and r['sub'].endswith('Cavadinha e curva'), 'na sala: o sexto quadro das regras, CHUTES "Cav+Curva", e a linha do nome termina com os chutes', r)
            await rt(A, "(() => { document.querySelector('#sl-ops .sl-op[data-k=\"chutes\"] .sl-seta.dir').click(); return 1; })()")
            r = await espera(A, "NET49.room.chutes && NET49.room.chutes.super && JSON.stringify(NET49.room.chutes)", 4000)
            P.confere(r == '{"lob":true,"curva":false,"super":true}', 'a seta troca os chutes da sala (para todos): Cavadinha e super chute', r)
            await rt(A, "(() => { document.querySelector('#sl-ops .sl-op[data-k=\"chutes\"] .sl-seta.esq').click(); return 1; })()")
            r = await espera(A, "NET49.room.chutes && NET49.room.chutes.curva && JSON.stringify(NET49.room.chutes)", 4000)
            P.confere(r == '{"lob":true,"curva":true,"super":false}', 'e a outra seta volta (Cavadinha e curva)', r)
            await A.screenshot(path=str(SAIDA / 'v99_sala.png'))
            P.confere(await rt(A, SOBRA) == {'doc': 0, 'fora': 0}, 'a sala no celular deitado: nada passa da largura', await rt(A, SOBRA))
            code = await rt(A, "NET49.room.code")
            await rt(B, "(() => { net49Send({type:'list'}); return 1; })()")
            r = await espera(B, "(() => { const l = [...document.querySelectorAll('.sx-lista .sx-sala')].find(d => (d.textContent || '').indexOf('CHUTES') >= 0); return l ? {tag:l.querySelector('.v99-tag').title, rot:l.getAttribute('aria-label')} : null; })()", 6000)
            P.confere(r and r['tag'] == 'Cavadinha e curva' and 'Cavadinha e curva' in r['rot'], 'na lista das salas do Beto, a sala tem a etiqueta CHUTES (e o nome dos chutes no título)', r)
            await B.screenshot(path=str(SAIDA / 'v99_lista.png'))
            await rt(B, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(code))
            await espera(A, "NET49.room && NET49.room.members.length === 2", 6000)
            await rt(A, "(() => { net49Send({type:'seat', team:0}); return 1; })()")
            ok = await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 6000)
            P.confere(ok, 'o Beto entra no Time B e a Ana no Time A')

            # ---------------------------------------------------------------- 3) a partida
            print('\n3) a partida com a cavadinha e a curva')
            await rt(A, "slIniciar()")
            ok = [await espera(pg, JOGA, 15000) for pg in (A, B)]
            P.confere(all(ok), 'COMEÇAR: os dois jogam (a partida no servidor, a contagem)', ok)
            ea, eb = await rt(A, ESTADO), await rt(B, ESTADO)
            P.confere(ea['op'] == {'lob': True, 'curva': True, 'super': False} and ea['joga'] and ea['prev'] and eb['joga'] and eb['prev'], 'nos dois aparelhos: os chutes da sala, jogando, com a previsão do núcleo', [ea['op'], ea['prev'], eb['prev']])
            vis = await rt(A, "['cav', 'cve', 'cvd', 'sup'].map(k => controleVisivel(k))")
            P.confere(vis == [True, True, True, False], 'os botões na tela: CAVADINHA, CURVA ↶ e CURVA ↷ (o SUPER não, a sala não ligou)', vis)
            r = await espera(A, "(() => { const c = document.getElementById('v99-cartao'); return c ? {lin:c.querySelectorAll('.v99-cartao-lin').length, txt:c.textContent, curto:getComputedStyle(c.querySelector('i.curto')).display !== 'none'} : null; })()", 4000)
            P.confere(r and r['lin'] == 2 and 'CAVADINHA' in r['txt'] and 'CURVA' in r['txt'] and 'SUPER' not in r['txt'] and r['curto'], 'depois do 3, 2, 1, o cartão de como joga (só com o que a sala ligou; no celular deitado, a dica curta)', r)
            await A.screenshot(path=str(SAIDA / 'v99_partida_ana.png'))
            await rt(A, "(() => { const c = document.getElementById('v99-cartao'); if (c) c.remove(); return 1; })()")
            await rt(B, "(() => { const c = document.getElementById('v99-cartao'); if (c) c.remove(); return 1; })()")
            await A.keyboard.press('KeyQ')
            ok = await espera(B, "(() => { const o = RachaChutes99.estado().outros[0]; return !!(o && o.lob); })()", 3000)
            ea = await rt(A, ESTADO)
            P.confere(ok and ea['meu']['lob'] and ea['lb'] == 1, 'a tecla Q arma a cavadinha da Ana — e o Beto vê o que ela armou (no quadro do servidor)', [ea['lb'], ea['meu']])
            xy = await rt(A, BOTAO_XY + "('cav')")
            await toca(A, xy[0], xy[1])
            ok = await espera(B, "(() => { const o = RachaChutes99.estado().outros[0]; return !!(o && !o.lob); })()", 3000)
            ea = await rt(A, ESTADO)
            P.confere(ok and not ea['meu']['lob'] and ea['lb'] == 2, 'o dedo no botão CAVADINHA desarma (o toque conta, o Beto vê)', [ea['lb'], ea['meu']])
            # a cavadinha: a bola parada e a Ana encostada (o gancho de teste); Q arma, K chuta
            await rt(A, "(() => { net49Send({type:'__teste_poe', u:3.02, dx:-14}); return 1; })()")
            await asyncio.sleep(.4)
            await A.keyboard.press('KeyQ')
            await espera(A, "RachaChutes99.estado().meu && RachaChutes99.estado().meu.lob", 2000)
            await rt(A, AMOSTRA); await rt(B, AMOSTRA)
            await A.keyboard.down('KeyK'); await asyncio.sleep(.1); await A.keyboard.up('KeyK')
            await asyncio.sleep(.28)
            await B.screenshot(path=str(SAIDA / 'v99_cavadinha_beto.png')); await A.screenshot(path=str(SAIDA / 'v99_cavadinha_ana.png'))
            await asyncio.sleep(.6)
            ma, mb = await rt(A, FIM_AMOSTRA), await rt(B, FIM_AMOSTRA)
            alt = await rt(A, "V92N.C.CR.ALTURA_JOG")
            P.confere(ma['z'] > alt * 1.5 and ma['vis'] > alt * 1.5 and mb['z'] > alt * 1.5 and mb['vis'] > alt * 1.5,
                      'K com a cavadinha armada: a bola sobe (%.0f px) — no servidor e no desenho, na tela da Ana (a previsão) e na do Beto' % mb['z'], [ma, mb])
            # a curva ↷ no PASSE
            await rt(A, "(() => { net49Send({type:'__teste_poe', u:3.02, dx:-14}); return 1; })()")
            await asyncio.sleep(.4)
            await A.keyboard.press('KeyX')
            await espera(A, "RachaChutes99.estado().meu && RachaChutes99.estado().meu.curva === 1", 2000)
            await rt(B, AMOSTRA)
            await A.keyboard.down('KeyJ'); await asyncio.sleep(.1); await A.keyboard.up('KeyJ')
            await asyncio.sleep(.5)
            mb = await rt(B, FIM_AMOSTRA)
            P.confere(mb['sp'] > 0.005 and mb['z'] == 0, 'X arma a curva ↷ e o PASSE sai girando (o giro chega no quadro do Beto), no chão', mb)
            await tres_gols(A)
            ok = await espera(A, "fimAberto()", 8000)
            P.confere(ok, 'os três gols: o fim da partida')

            # ---------------------------------------------------------------- a rodada com o super
            print('\n   a rodada com o super chute')
            await rt(A, "(() => { net49Send({type:'config', chutes:'lcs'}); return 1; })()")
            await espera(A, "NET49.room.chutes && NET49.room.chutes.super", 4000)
            await rt(A, "(() => { net49Send({type:'start'}); return 1; })()")
            ok = [await espera(pg, JOGA + " && RachaChutes99.estado().op && RachaChutes99.estado().op.super", 15000) for pg in (A, B)]
            vis = await rt(A, "['cav', 'cve', 'cvd', 'sup'].map(k => controleVisivel(k))")
            P.confere(all(ok) and vis == [True, True, True, True], 'a sala com os três: a nova rodada tem os quatro botões', vis)
            for pg in (A, B):
                await rt(pg, "(() => { const c = document.getElementById('v99-cartao'); if (c) c.remove(); return 1; })()")
            await rt(A, "(() => { net49Send({type:'__teste_poe', u:3.02, dx:-14}); return 1; })()")
            await asyncio.sleep(.4)
            await rt(B, AMOSTRA)
            await A.keyboard.down('KeyV')
            await asyncio.sleep(.45)
            ea = await rt(A, ESTADO)
            await A.screenshot(path=str(SAIDA / 'v99_super_carga.png'))
            await asyncio.sleep(.45)
            await A.keyboard.up('KeyV')
            await asyncio.sleep(.12)
            await B.screenshot(path=str(SAIDA / 'v99_super_fogo_beto.png'))
            await asyncio.sleep(.5)
            mb = await rt(B, FIM_AMOSTRA)
            lim = await rt(B, "V92N.C.LIMITE_VEL_BOLA")
            P.confere(ea['su'] and ea['meu']['segura'] and ea['meu']['cT'] > 10, 'segurando V: o super carrega (a carga no botão e em volta da tampinha)', ea['meu'])
            P.confere(mb['fogo'] > 0 and mb['visFogo'] > 0 and mb['teto'] > lim, 'soltou: o super sai pegando fogo (o Beto vê o fogo) e passa do teto da bola de sempre', mb)
            await tres_gols(A)
            await espera(A, "fimAberto()", 8000)

            # ---------------------------------------------------------------- a rodada sem os chutes
            print('\n   a rodada sem os chutes (só o chutar)')
            await rt(A, "(() => { net49Send({type:'config', chutes:''}); return 1; })()")
            await espera(A, "NET49.room.chutes === null", 4000)
            await rt(A, "(() => { net49Send({type:'start'}); return 1; })()")
            ok = [await espera(pg, JOGA, 15000) for pg in (A, B)]
            await asyncio.sleep(.4)
            r = await rt(B, "(() => ({vis:['cav', 'cve', 'cvd', 'sup'].map(k => controleVisivel(k)), cr:V92N.M && V92N.M.cr, bz:RachaChutes99.CR99.srv.bz, op:RachaChutes99.estado().op}))()")
            P.confere(all(ok) and r['vis'] == [False] * 4 and r['cr'] is None and r['bz'] is None and r['op'] is None, 'sem os chutes: nenhum botão novo, a previsão e o quadro de sempre', r)
            await A.keyboard.press('KeyQ')
            await asyncio.sleep(.2)
            P.confere(await rt(A, "RachaChutes99.estado().lb") == 0, 'a tecla Q não faz nada na sala sem os chutes')
            await rt(A, "(() => { net49Send({type:'leave'}); return 1; })()"); await rt(B, "(() => { net49Send({type:'leave'}); return 1; })()")
            await asyncio.sleep(.4)

            # ---------------------------------------------------------------- 4) o HUD: os moldes, o editor e as teclas
            print('\n4) o HUD: os moldes, o editor e as teclas')
            r = await rt(B, """(() => { const out = {}; HUDM.todos = true;
              for (const id of ['destro', 'canhoto', 'polegar', 'compacto', 'grande']){ hudAplicaMolde(id); const m = RachaChutes99.moldes[id];
                out[id] = {igual:['cav', 'cve', 'cvd', 'sup'].every(k => Math.abs(hud[k].x - m[k][0]) < .5 && Math.abs(hud[k].y - m[k][1]) < .5 && Math.abs(hud[k].s - m[k][2]) < .01), conflitos:hudConflitos('base').length}; }
              HUDM.todos = false; hudAplicaMolde('destro'); return out; })()""")
            P.confere(all(v['igual'] and v['conflitos'] == 0 for v in r.values()), 'os cinco moldes põem os quatro botões no lugar deles, sem encostar no PASSE, no CHUTE nem no analógico', r)
            r = await rt(B, "(() => { const fora = ['cav', 'cve', 'cvd', 'sup'].map(k => controleVisivel(k)); editing = true; const ed0 = ['cav', 'sup'].map(k => controleVisivel(k)); HUDM.todos = true; const ed1 = ['cav', 'cve', 'cvd', 'sup'].map(k => controleVisivel(k)); HUDM.todos = false; editing = false; return {fora, ed0, ed1, ordem:HE_ORDEM.filter(k => ['cav', 'cve', 'cvd', 'sup'].includes(k))}; })()")
            P.confere(r['fora'] == [False] * 4 and r['ed0'] == [False, False] and r['ed1'] == [True] * 4 and r['ordem'] == ['cav', 'cve', 'cvd', 'sup'],
                      'fora da sala com os chutes eles não aparecem; no editor, com "Mostrar todos" (e na lista dos controles)', r)
            r = await rt(B, "(() => TECLAS_ACOES.filter(a => ['cav', 'cve', 'cvd', 'sup'].includes(a[0])).map(a => [a[0], a[2][0]]))()")
            P.confere(r == [['cav', 'KeyQ'], ['cve', 'KeyZ'], ['cvd', 'KeyX'], ['sup', 'KeyV']], 'as teclas novas em Ajustes › Controles › Teclado (Q, Z, X e V)', r)
        await asyncio.sleep(.1)
        for pg in sess:
            P.confere(not pg.erros, 'nenhum erro na página de %s' % pg.nome, pg.erros[:5])
            await pg.b.close()
        sess.clear()

        # ---------------------------------------------------------------- 5) a sala neste aparelho
        print('\n5) a sala neste aparelho com os chutes (sem servidor)')
        async with async_playwright() as pw:
            b, L, erros = await abre(pw, 1280, 600)
            # o HUD guardado antes da v99 (o molde canhoto, sem os quatro botões): eles vão para o lugar do molde canhoto e ficam lá
            velho = {'cameraRevision': 19, 'molde': 'canhoto', 'hud': {'joy': {'x': 1705, 'y': 706, 's': 1, 'a': 1, 'oc': False, 'adere': True, 'segue': True, 'km': 1, 'al': 1},
                     'kick': {'x': 200, 'y': 330, 's': 1, 'a': 1, 'oc': False}, 'power': {'x': 200, 'y': 700, 's': 1, 'a': 1, 'oc': False}, 'curva': {'x': 425, 'y': 520, 's': 1, 'a': 1, 'oc': False}, 'reset': {'x': 1854, 'y': 66, 's': 1, 'a': 1}}}
            await rt(L, "(() => { for (const k of Object.keys(localStorage)) if (/^racha-hud-|^racha-treino-hud/.test(k)) localStorage.removeItem(k); localStorage.setItem('racha-treino-hud-v11', %s); return 1; })()" % json.dumps(json.dumps(velho)))
            # (e as teclas guardadas antes da v99, com o PASSE no Z, o CHUTE no X e a CURVA no Q)
            await rt(L, "(() => { localStorage.setItem('racha-teclas-v1', JSON.stringify({passe:['KeyZ', 'KeyJ'], chute:['KeyX', 'KeyL'], curva:['KeyQ', 'KeyI']})); return 1; })()")
            POS = "(() => { const m = RachaChutes99.moldes.canhoto, A = heAtivo().estado.base, o = JSON.parse(localStorage.getItem('racha-treino-hud-v11')); return ['cav', 'cve', 'cvd', 'sup'].map(k => [Math.abs(hud[k].x - m[k][0]) < .5 && Math.abs(hud[k].y - m[k][1]) < .5, Math.abs(A[k].x - m[k][0]) < .5 && Math.abs(A[k].y - m[k][1]) < .5, !!(o.hud && o.hud[k] && Math.abs(o.hud[k].x - m[k][0]) < .5)]).flat().every(Boolean) && HUDM.molde === 'canhoto'; })()"
            res = []
            for _ in range(2):
                await L.reload()
                await L.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
                await L.wait_for_timeout(600)
                await L.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); })()")
                await rt(L, HARNESS)
                res.append(await rt(L, POS))
            P.confere(res == [True, True], 'o HUD guardado antes da v99 (canhoto): os quatro vão para o lugar do molde canhoto — no HUD, no layout em uso e no que fica guardado — e continuam lá depois de abrir de novo', res)
            r = await rt(L, "(() => ({z:teclaCanon('KeyZ'), x:teclaCanon('KeyX'), q:teclaCanon('KeyQ'), v:teclaCanon('KeyV'), cav:TECLA.acoes.cav, cve:TECLA.acoes.cve, cvd:TECLA.acoes.cvd, sup:TECLA.acoes.sup}))()")
            P.confere(r['z'] == 'Space' and r['x'] == 'KeyK' and r['q'] == 'KeyU' and r['v'] == 'KeyV' and r['cav'] == [] and r['cve'] == [] and r['cvd'] == [] and r['sup'] == ['KeyV'],
                      'as teclas que o jogador já tinha no Q, no Z e no X (CURVA, PASSE e CHUTE) continuam dele; as ações novas ficam sem tecla (o V, livre, fica com o SUPER)', r)
            await rt(L, "(() => { localStorage.removeItem('racha-teclas-v1'); TECLA.acoes = teclaPadrao(); teclaMonta(); return 1; })()")
            await rt(L, "(() => { abreTela('amigos'); sxNovaSala(); Object.assign(SX.form, {onde:'aqui', jogo:'futebol', n:1, chutes:{lob:true, curva:true, super:true}}); amigosRender(); return 1; })()")
            await asyncio.sleep(.2)
            r = await rt(L, OPS)
            P.confere(r == [['CAVADINHA', 'true', False], ['CURVA', 'true', False], ['SUPER CHUTE', 'true', False]], 'NESTE APARELHO: os três chutes também (a partida roda no motor das salas aqui)', r)
            await rt(L, "(() => { document.querySelector('.sx-pe .sx-criar').click(); return 1; })()")
            ok = await espera(L, "NET49.room && NET49.room.local && NET49.room.chutes && NET49.room.chutes.super", 4000)
            await rt(L, "(() => { net49Send({type:'seat', team:0}); return 1; })()")
            await asyncio.sleep(.2)
            r = await rt(L, "(() => document.querySelector('#sl-ops .sl-op[data-k=\"chutes\"] b').textContent)()")
            P.confere(ok and r == 'Os três', 'a sala neste aparelho com os três (o quadro CHUTES na sala)', r)
            await rt(L, "slIniciar()")
            ok = await espera(L, "NET49.playing && !NET49.host && V92N.on && RachaSalas99.estado().local", 6000)
            r = await rt(L, "(() => ({cont:RachaSalas99.estado().contando, contagem:!!V93P.contagem, servidor:NET49.room.servidor}))()")
            P.confere(ok and r['cont'] and r['contagem'], 'COMEÇAR: o jogo entra como numa sala online (o motor das salas neste aparelho) e o 3, 2, 1', r)
            ok = await espera(L, JOGA, 6000)
            await espera(L, "!!document.getElementById('v99-cartao')", 2500)   # (o cartão aparece logo depois do JÁ!; sai da frente)
            await rt(L, "(() => { const c = document.getElementById('v99-cartao'); if (c) c.remove(); return 1; })()")
            await rt(L, """(() => { const p = RachaSalas99.partida(), G = p.G, B = p.B, eu = p.jog[0], o = p.jog[1];
              o.bot = null; o.botAi = null; o.fila = null; o.netButton = window.RachaNucleo.novoBotao();
              p.estado = 'jogo'; Object.assign(B, {x:G.CX - 100, y:G.CY, vx:0, vy:0, w:0, z:0, vz:0, sp:0, teto:0, fogo:0});
              eu.x = B.x - (eu.r + B.r + 1); eu.y = G.CY; eu.vx = eu.vy = 0; o.x = B.x + 125; o.y = G.CY; o.vx = o.vy = 0; return 1; })()""")
            await asyncio.sleep(.3)
            await L.keyboard.press('KeyQ')
            await espera(L, "RachaSalas99.partida().jog[0].cr.lob", 2000)
            await rt(L, AMOSTRA)
            await L.keyboard.down('KeyK'); await asyncio.sleep(.1); await L.keyboard.up('KeyK')
            await asyncio.sleep(.25)
            await L.screenshot(path=str(SAIDA / 'v99_local_cavadinha.png'))
            await asyncio.sleep(.7)
            m = await rt(L, FIM_AMOSTRA)
            r = await rt(L, "(() => { const p = RachaSalas99.partida(); return {beto:p.jog[1].x - (p.G.CX + 25), bola:p.B.x - p.jog[1].x}; })()")
            P.confere(m['z'] > 60 and m['vis'] > 60 and abs(r['beto']) < 1 and r['bola'] > 20, 'a cavadinha passa por cima do adversário parado (sem encostar nele) e cai do outro lado', [m, r])
            await rt(L, "arbPausa(true)")
            await asyncio.sleep(.3)
            r = await rt(L, "(() => ({pausado:NET49.paused, motor:RachaSalas99.partida().pausado, t:RachaSalas99.partida().tick}))()")
            await asyncio.sleep(.3)
            t2 = await rt(L, "RachaSalas99.partida().tick")
            P.confere(r['pausado'] and r['motor'] and t2 == r['t'], 'a pausa do árbitro (você) para o motor daqui e o jogo', r)
            await rt(L, "arbPausa(false)")
            await asyncio.sleep(.3)
            P.confere(not await rt(L, "NET49.paused || RachaSalas99.partida().pausado") and await rt(L, "RachaSalas99.partida().tick") > t2, 'e volta')
            await rt(L, "arbEncerra()")
            ok = await espera(L, "fimAberto() && /ENCERRADA/.test(fimEl('fim-titulo').textContent)", 6000)
            P.confere(ok and not await rt(L, "RachaSalas99.estado().local") and await rt(L, "NET49.room.state === 'ended' && !NET49.room.servidor"), 'ENCERRAR do árbitro: o fim ENCERRADA, o motor daqui desliga e a sala volta a ser a deste aparelho')
            await L.screenshot(path=str(SAIDA / 'v99_local_fim.png'))
            await rt(L, "(() => { net49Send({type:'rematch', on:true}); return 1; })()")
            ok = await espera(L, "NET49.playing && RachaSalas99.estado().local && NET49.room.round === 2", 6000)
            P.confere(ok, 'JOGAR DE NOVO: a revanche começa outra vez no motor daqui')
            await rt(L, "(() => { TECLA.acoes.cav = ['KeyE']; teclaMonta(); return 1; })()")
            await espera(L, JOGA, 6000)
            lb0 = await rt(L, "RachaChutes99.estado().lb")
            await L.keyboard.press('KeyE')
            await asyncio.sleep(.15)
            P.confere(await rt(L, "RachaChutes99.estado().lb") == lb0 + 1, 'a tecla trocada (E) arma a cavadinha')
            # o toque no SUPER que o sistema cancela (o celular tirou o dedo): o motor fica sabendo (sx) e o super não sai
            r = await rt(L, """(() => { const rc = cv.getBoundingClientRect(), k = rc.width / W, e = hud.sup, C = RachaChutes99.CR99, sx0 = C.sx;
              const o = {pointerId:91, clientX:rc.left + e.x*k, clientY:rc.top + e.y*k, bubbles:true, cancelable:true, pointerType:'touch', isPrimary:true};
              cv.dispatchEvent(new PointerEvent('pointerdown', o)); const seg = C.suToque === 91;
              cv.dispatchEvent(new PointerEvent('pointercancel', o));
              return {seg, sx:C.sx - sx0, solto:C.suToque === null}; })()""")
            await asyncio.sleep(.3)
            r2 = await rt(L, "(() => { const q = RachaSalas99.partida().jog[0]; return {segura:q.cr.segura, sxN:q.cr.sxN, sx:RachaChutes99.CR99.sx}; })()")
            P.confere(r['seg'] and r['sx'] == 1 and r['solto'] and not r2['segura'] and r2['sxN'] == r2['sx'], 'o toque no SUPER que o sistema cancela: o motor fica sabendo (sx) e o super não sai', [r, r2])
            await rt(L, "(() => { net49Send({type:'leave'}); return 1; })()")
            ok = await espera(L, "!SLOC.on && !RachaSalas99.estado().local", 4000)
            P.confere(ok, 'sair da sala desliga o motor daqui')
            P.confere(not erros, 'nenhum erro na página da sala neste aparelho', erros[:5])
            await b.close()
    finally:
        for pg in sess:
            try:
                await pg.b.close()
            except Exception:
                pass
        srv.terminate()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
