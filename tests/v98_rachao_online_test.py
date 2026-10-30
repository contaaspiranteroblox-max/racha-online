"""RACHA v98 · O RACHA E O RACHÃO SEPARADOS NA OFICINA E AS SALAS ONLINE DO RACHÃO (no navegador, com o servidor de verdade).
O pedido: "Deixe separado o racha e o rachão, os caras podem escolher criar modo racha ou rachão, porém dá pra criar sala de
rachão também on-line". O servidor das salas (tests/servidor_visitantes.cjs, com a contagem de 1,5 s) e três sessões do jogo
(Ana, Beto e Caio, cada uma com o seu armazenamento):
  1) a central da Oficina tem os dois MODOS (RACHA e RACHÃO, no topo): cada um com as suas abas; o modo fica guardado; o
     CRIAR pergunta o que criar (o mapa do RACHA abre o editor de mapas; o estádio do Rachão abre a oficina de estádios);
  2) a aba SALAS ONLINE (modo RACHÃO) → CRIAR SALA abre a tela do Rachão (o campo com a miniatura, os times, Partida ou
     Caos, os bots, o tempo, os gols, a corrida, os chutes, aberta ou fechada, e o ENTRAR COM O CÓDIGO); criar → a tela da
     sala da Oficina (Vermelho × Azul, o campo e as opções);
  3) o Beto vê a sala na lista do modo RACHÃO e entra; o Caio entra pelo código da tela do Rachão; os AJUSTES do admin (a
     mesma tela do Rachão, com o que a sala tem) trocam o campo e o tamanho para todos;
  4) COMEÇAR: a moldura do Rachão abre nos três com a partida do servidor (a contagem 3, 2, 1; o placar; os nomes embaixo
     das tampinhas dos outros; quem assiste sem os botões); o teclado da Ana mexe a tampinha dela no aparelho dela (a
     previsão) e no do Beto (o servidor); o fechar no meio e o VOLTAR PARA A PARTIDA; a queda da internet do Beto e a volta;
  5) os gols (o gancho de teste pede ao motor do Rachão) até o fim: a tela do fim de cada um (Vitória, Derrota, quem
     assistiu), o VOLTAR PARA A SALA e a "Última" na sala; a lista de salas do GALERA com a etiqueta RACHÃO;
  6) sem servidor (a versão de demonstração): o CRIAR SALA explica que o online precisa do servidor das salas;
  7) as telas no celular deitado (844x390) e em pé (390x844), sem nada passando da largura.
Capturas em tests/saida/v98_*.png.
Rodar: python3 tests/v98_rachao_online_test.py"""
import sys, json, asyncio, socket, subprocess, time, tempfile, os, functools, http.server, socketserver, threading
from comum import Placar, rt, roda, async_playwright, RAIZ, CHROME, HARNESS, FONTES

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)


def porta_livre():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


def sobe(porta):
    env = dict(os.environ, RACHA_CONTAGEM_MS='1500')
    p = subprocess.Popen(['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria', '--estaticos', str(RAIZ), '--nome', 'Teste do Rachão online', '--sem-p2p'],
                         stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env)
    t0 = time.time()
    while time.time() - t0 < 8:
        try:
            s = socket.create_connection(('127.0.0.1', porta), timeout=.3); s.close(); return p
        except OSError:
            time.sleep(.1)
    return p


class Quieto(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


async def sessao(pw, url, nome, w=844, h=390, config=None):
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=True)
    if config:
        await ctx.add_init_script('window.RACHA_CONFIG = %s;' % json.dumps(config))
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script("try{if(!localStorage.getItem('racha-treino-perfil-v1'))localStorage.setItem('racha-treino-perfil-v1', JSON.stringify({nome:%s, st:{partidas:3, concluidas:3}}));}catch(e){}" % json.dumps(nome))
    pg = await ctx.new_page()
    pg.erros = []
    pg.on('pageerror', lambda e: pg.erros.append(str(e)[:300]))
    pg.on('console', lambda m: pg.erros.append('console: ' + m.text[:200]) if m.type == 'error' and '404' not in m.text and 'WebSocket' not in m.text and 'Failed to load resource' not in m.text else None)
    await pg.goto(url)
    await pg.wait_for_function('() => typeof window.__RT === "function" && window.OFI && OFI.pronta', polling=100, timeout=20000)
    await pg.wait_for_timeout(600)
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    await rt(pg, "(() => { if (typeof v84Fecha === 'function') v84Fecha(); return 1; })()")
    await rt(pg, HARNESS)
    await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return true; })()")
    pg.b, pg.ctx, pg.nome = b, ctx, nome
    return pg


async def espera(pg, js, ms=6000):
    t0 = time.time()
    while True:
        try:
            v = await pg.evaluate('s => window.__RT(s)', js)
        except Exception:
            v = None
        if v:
            return v
        if (time.time() - t0) * 1000 > ms:
            return v
        await asyncio.sleep(.1)


async def espera_q(fr, js, ms=6000):
    """o mesmo, dentro da moldura do Rachão"""
    t0 = time.time()
    while True:
        try:
            v = await fr.evaluate(js)
        except Exception:
            v = None
        if v:
            return v
        if (time.time() - t0) * 1000 > ms:
            return v
        await asyncio.sleep(.1)


def moldura(pg):
    return next((f for f in pg.frames if 'rachao.html' in f.url), None)


async def seg(fr, titulo, rotulo):
    """toca no botão de uma opção da preparação do Rachão (o título da opção e o texto do botão)"""
    return await fr.evaluate("""([t, r]) => { const o = [...document.querySelectorAll('#setupBody .opt')].find(x => { const h = x.querySelector('h3'); return h && h.textContent === t; });
      const b = o && [...o.querySelectorAll('.seg button')].find(x => x.textContent === r); if (!b) return false; b.click(); return true; }""", [titulo, rotulo])


async def sobra(pg, fr=None):
    alvo = fr or pg
    return await alvo.evaluate("() => { const d = document.scrollingElement; const fora = [...document.querySelectorAll('button, .opt, .ofi-bt')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).length; return {doc: d.scrollWidth - innerWidth, fora}; }")


CENA = """(() => { const c = RachaoRede.cena(); if (!c || App.scene !== c) return null; return {eu: c.eu ? c.eu.lugar : -1, tem: c.temQuadro, tick: c.m.tick, placar: c.m.score.slice(),
  j: c.m.players.map(p => [Math.round(p.disc.x * 10) / 10, Math.round(p.disc.y * 10) / 10, p.nomeRede || '', p.lugar]), bola: [Math.round(c.m.ball.x), Math.round(c.m.ball.y)],
  fim: !!c.fimRes, jogo: !document.getElementById('game').hidden, toque: document.getElementById('touch').classList.contains('on'), sub: document.getElementById('hudSub').textContent,
  banner: document.querySelector('#banner .bt').textContent, bannerOn: document.getElementById('banner').classList.contains('show')}; })()"""


async def principal():
    P = Placar('v98 · o RACHA e o Rachão separados e as salas online do Rachão')
    porta = porta_livre()
    srv = sobe(porta)
    url = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
    sess = []
    try:
        async with async_playwright() as pw:
            A = await sessao(pw, url, 'Ana'); B = await sessao(pw, url, 'Beto'); C = await sessao(pw, url, 'Caio', 390, 844); sess += [A, B, C]   # (o Caio no celular em pé)
            for pg in (A, B, C):
                await pg.evaluate("() => OFI.abre('hub')")
            ok = [await espera(pg, "(async () => (await OFI.interno.conecta(6000)) && !!NET49.id && OFI.interno.RSL.srv === true)()", 9000) for pg in (A, B, C)]
            P.confere(all(ok), 'as três sessões abrem a Oficina e conectam no servidor das salas (que diz ter as salas do Rachão)', ok)

            # ---------------------------------------------------------------- 1) os dois modos
            print('\n1) os dois modos da Oficina: RACHA e RACHÃO')
            r = await rt(A, "(() => ({modo: OFI.interno.HUB.modo, bts: [...document.querySelectorAll('.ofi-modo-bt')].map(b => [b.dataset.m, b.textContent, b.classList.contains('on')]), abas: [...document.querySelectorAll('.ofi-hub-aba')].filter(b => !b.hidden).map(b => b.dataset.a), busca: !document.querySelector('.ofi-hub-busca').hidden, criar: document.querySelector('.ofi-hub-criar').textContent}))()")
            P.confere(r['modo'] == 'racha' and r['bts'] == [['racha', 'RACHA', True], ['rachao', 'RACHÃO', False]] and 'meus' in r['abas'] and 'comunidade' in r['abas'] and 'rachao' not in r['abas'] and 'rachao_salas' not in r['abas'] and r['busca'] and r['criar'] == 'CRIAR',
                      'a central abre no modo RACHA: a chave RACHA | RACHÃO no topo, só as abas dos mapas do RACHA e a busca', r)
            await A.screenshot(path=str(SAIDA / 'v98_modo_racha.png'))
            await A.click('.ofi-modo-bt[data-m="rachao"]'); await A.wait_for_timeout(500)
            r = await rt(A, "(() => ({modo: OFI.interno.HUB.modo, aba: OFI.interno.HUB.aba, abas: [...document.querySelectorAll('.ofi-hub-aba')].filter(b => !b.hidden).map(b => [b.dataset.a, b.textContent]), busca: !document.querySelector('.ofi-hub-busca').hidden, placa: !!document.querySelector('.ofi-rch-placa'), guardado: localStorage.getItem('racha-ofi-modo'), dm: document.querySelector('.ofi-hub').dataset.modo}))()")
            P.confere(r['modo'] == 'rachao' and r['aba'] == 'rachao' and r['abas'] == [['rachao', 'Estádios'], ['rachao_salas', 'Salas online']] and not r['busca'] and r['placa'] and r['guardado'] == 'rachao' and r['dm'] == 'rachao',
                      'RACHÃO: só as abas do Rachão (Estádios e Salas online), sem a busca dos mapas; o modo fica guardado no aparelho', r)
            await A.screenshot(path=str(SAIDA / 'v98_modo_rachao.png'))
            await A.evaluate("() => { OFI.fecha(); }"); await A.wait_for_timeout(300); await A.evaluate("() => OFI.abre('hub')"); await A.wait_for_timeout(500)
            P.confere(await rt(A, "OFI.interno.HUB.modo === 'rachao' && OFI.interno.HUB.aba === 'rachao'"), 'fechar e abrir a Oficina de novo: ela volta no modo RACHÃO')
            await A.click('.ofi-hub-criar'); await A.wait_for_timeout(400)
            r = await rt(A, "(() => { const j = document.querySelector('.ofi-jan-escolha'); return j && {tit: j.querySelector('.ofi-jan-tit b').textContent, ops: [...j.querySelectorAll('.ofi-escolha')].map(b => [b.dataset.m, b.querySelector('b').textContent, b.querySelector('.ofi-escolha-ir').textContent, b.classList.contains('on')])}; })()")
            P.confere(r and r['tit'] == 'O que você quer criar?' and r['ops'] == [['racha', 'Mapa do RACHA', 'CRIAR MAPA', False], ['rachao', 'Estádio do Rachão', 'CRIAR ESTÁDIO', True]],
                      'CRIAR pergunta o que criar: um mapa do RACHA ou um estádio do Rachão (o do modo de agora marcado)', r)
            await A.screenshot(path=str(SAIDA / 'v98_criar_escolha.png'))
            await A.click('.ofi-escolha[data-m="racha"]'); await A.wait_for_timeout(400)
            r = await rt(A, "(() => ({janela: (document.querySelector('.ofi-jan-tit b') || {}).textContent, modo: OFI.interno.HUB.modo, abas: [...document.querySelectorAll('.ofi-hub-aba')].filter(b => !b.hidden).map(b => b.dataset.a).slice(0, 2)}))()")
            P.confere(r['janela'] == 'Criar novo mapa' and r['modo'] == 'racha' and r['abas'] == ['meus', 'dev'], 'o MAPA DO RACHA leva para o modo RACHA e abre o criar mapa de sempre (do zero ou de um modelo)', r)
            await A.evaluate("() => [...document.querySelectorAll('.ofi-jan-fundo .ofi-jan-tit .ofi-x')].reverse().forEach(b => b.click())"); await A.wait_for_timeout(200)
            await A.click('.ofi-hub-criar'); await A.wait_for_timeout(300)
            await A.click('.ofi-escolha[data-m="rachao"]'); await A.wait_for_timeout(1800)
            fa = moldura(A)
            r = await fa.evaluate("({folha: (document.querySelector('.rc-folha h2') || {}).textContent})") if fa else {}
            P.confere(fa and r.get('folha') == 'Começar de onde?' and await rt(A, "OFI.rachao.aberto() && OFI.interno.HUB.modo === 'rachao'"), 'o ESTÁDIO DO RACHÃO leva para o modo RACHÃO e abre a oficina de estádios no "Começar de onde?"', r)
            await fa.evaluate("() => { document.querySelectorAll('.rc-fundo').forEach(f => f.remove()); }")
            await A.evaluate("() => OFI.rachao.fecha()"); await A.wait_for_timeout(300)

            # ---------------------------------------------------------------- 2) criar a sala
            print('\n2) a aba SALAS ONLINE e o CRIAR SALA (a tela do Rachão)')
            await A.click('.ofi-hub-aba[data-a="rachao_salas"]'); await A.wait_for_timeout(700)
            r = await rt(A, "(() => { const p = document.querySelector('.ofi-rch-online'); return {placa: p && p.querySelector('.ofi-rch-marca').textContent, bts: p ? [...p.querySelectorAll('.ofi-bt')].map(b => b.textContent) : [], sep: [...document.querySelectorAll('.ofi-grade .ofi-sep')].map(s => s.textContent), vazio: (document.querySelector('.ofi-rch-salas .ofi-vazio b') || {}).textContent}; })()")
            P.confere(r['placa'] == 'Rachão online' and r['bts'] == ['CRIAR SALA', 'ENTRAR COM CÓDIGO'] and 'SALAS ABERTAS DO RACHÃO' in r['sep'] and r['vazio'] == 'Nenhuma sala do Rachão aberta agora.',
                      'SALAS ONLINE: criar a sala, entrar com o código e a lista das salas abertas do Rachão (ainda nenhuma)', r)
            await A.screenshot(path=str(SAIDA / 'v98_salas_online.png'))
            await A.click('.ofi-rch-online .ofi-bt:has-text("CRIAR SALA")'); await A.wait_for_timeout(900)
            fa = moldura(A)
            st = await espera_q(fa, "(() => !document.getElementById('setup').hidden && App.mode === 'online' && {tit: document.getElementById('setupTitle').textContent, cta: document.querySelector('#btnStart .t').textContent, opts: [...document.querySelectorAll('#setupBody .opt h3')].map(x => x.textContent), cartoes: document.querySelectorAll('.mapCard').length})()")
            P.confere(st and st['tit'] == 'Sala online' and st['cta'] == 'Criar sala online' and st['opts'] == ['Tem o código de uma sala?', 'Campo', 'Tamanho dos times', 'Modo', 'Nível dos bots', 'Tempo', 'Gols para vencer', 'Corrida', 'Chutes extras', 'Vagas vazias', 'A sala'] and st['cartoes'] >= 18,
                      'CRIAR SALA abre a SALA ONLINE do Rachão: o código, o campo (os 17 com a miniatura e o criar o seu), os times, Partida ou Caos, os bots, o tempo, os gols, a corrida, os chutes e a sala', st)
            await A.screenshot(path=str(SAIDA / 'v98_sala_online_tela.png'))
            # o servidor das salas antigo (sem as salas do Rachão) faria uma sala comum: o CRIAR explica e não cria nada
            await A.evaluate("() => { OFI.interno.RSL.srv = false; }")
            await fa.click('#btnStart')
            av = await espera_q(fa, "(() => { const a = document.getElementById('rc-aviso'); return a && a.classList.contains('on') && /atualizado/.test(a.textContent) && a.textContent; })()", 4000)
            semSala = await rt(A, "!OFI.interno.OFS.code && OFI.rachao.aberto()")
            P.confere(av and 'ainda não tem as salas do Rachão' in av and semSala, 'com o servidor das salas antigo, o CRIAR SALA explica que ele precisa ser atualizado (e não cria uma sala comum)', [av, semSala])
            await A.evaluate("() => { OFI.interno.RSL.srv = true; }")
            await fa.click('.mapCard[data-map="fliper"]'); await A.wait_for_timeout(250)
            P.confere(await seg(fa, 'Tamanho dos times', '1x1') and await seg(fa, 'Modo', 'Caos, com poderes') and await seg(fa, 'Tempo', '2 min') and await seg(fa, 'A sala', 'Fechada'), 'escolhe o Fliperama, 1x1, Caos, 2 min e sala fechada (os botões de sempre do Rachão)')
            await fa.click('#btnStart')
            sala = await espera(A, "(() => { const S = OFI.interno.OFS; return S.code && S.sala && S.sala.rachao && OFI.tela === 'sala' && !OFI.rachao.aberto() && {code: S.code, nome: S.sala.rachao.info.nome, opc: S.sala.rachao.opc, n: S.sala.n, pub: S.sala.pub, linha: document.querySelector('.ofi-sala-mapa').textContent, times: [...document.querySelectorAll('.ofi-time-cab b')].map(b => b.textContent)}; })()", 8000)
            P.confere(sala and sala['nome'] == 'Fliperama' and sala['opc']['modo'] == 'chaos' and sala['opc']['tempo'] == 120 and sala['n'] == 1 and not sala['pub'] and sala['times'] == ['Vermelho', 'Azul'] and 'RACHÃO' in sala['linha'] and 'Caos' in sala['linha'] and 'fechada' in sala['linha'],
                      'criar: a moldura fecha e a tela da sala da Oficina mostra a sala do Rachão (Vermelho × Azul, o Fliperama, Caos 1x1, 2 min, fechada)', sala)
            await A.screenshot(path=str(SAIDA / 'v98_sala_criada.png'))
            code = sala['code'] if sala else ''
            # a sala fechada não aparece na lista; a Ana abre a sala (os ajustes) para o Beto ver
            await A.click('.ofi-sala-topo .ofi-bt:has-text("AJUSTES")'); await A.wait_for_timeout(900)
            fa = moldura(A)
            aj = await espera_q(fa, "(() => !document.getElementById('setup').hidden && {tit: document.getElementById('setupTitle').textContent, cta: document.querySelector('#btnStart .t').textContent, mapa: App.sel.online.map, size: App.sel.online.size, modo: App.sel.online.modo, pub: App.sel.online.pub, codigo: !!document.querySelector('.rd-entrar')})()")
            P.confere(aj and aj['tit'] == 'Ajustes da sala' and aj['cta'] == 'Salvar ajustes' and aj['mapa'] == 'fliper' and aj['size'] == 1 and aj['modo'] == 'chaos' and aj['pub'] is False and not aj['codigo'],
                      'AJUSTES (o admin): a mesma tela do Rachão, com o que a sala tem agora (o Fliperama, 1x1, Caos, fechada)', aj)
            await fa.click('.mapCard[data-map="classico"]'); await A.wait_for_timeout(200)
            await seg(fa, 'Tamanho dos times', '2x2'); await seg(fa, 'Modo', 'Partida'); await seg(fa, 'Gols para vencer', '3'); await seg(fa, 'A sala', 'Aberta')
            await fa.click('#btnStart')
            sala = await espera(A, "(() => { const S = OFI.interno.OFS; return S.sala && S.sala.rachao.info.nome === 'Clássico' && !OFI.rachao.aberto() && {opc: S.sala.rachao.opc, n: S.sala.n, pub: S.sala.pub, linha: document.querySelector('.ofi-sala-mapa').textContent}; })()", 6000)
            P.confere(sala and sala['opc']['modo'] == 'match' and sala['opc']['gols'] == 3 and sala['n'] == 2 and sala['pub'], 'SALVAR AJUSTES: a sala vira Clássico, Partida 2x2 até 3 gols, aberta', sala)

            # ---------------------------------------------------------------- 3) quem entra
            print('\n3) o Beto pela lista do Rachão, o Caio pelo código')
            await B.click('.ofi-modo-bt[data-m="rachao"]'); await B.wait_for_timeout(300)
            await B.click('.ofi-hub-aba[data-a="rachao_salas"]')
            lin = await espera(B, "(() => { const l = [...document.querySelectorAll('.ofi-rch-sala')]; return l.length && l.map(x => x.textContent); })()", 6000)
            P.confere(lin and any('Rachão de Ana' in x and 'Clássico' in x and '1/4' in x for x in lin), 'a sala da Ana aparece na lista do modo RACHÃO do Beto (o nome, o campo e as vagas)', lin)
            await B.screenshot(path=str(SAIDA / 'v98_lista_rachao.png'))
            await B.click('.ofi-rch-sala .ofi-bt:has-text("ENTRAR")')
            sb = await espera(B, "(() => { const S = OFI.interno.OFS; return S.code && S.sala && S.sala.rachao && OFI.tela === 'sala' && {code: S.code, eu: S.sala.roster.indexOf(NET49.id)}; })()", 6000)
            P.confere(sb and sb['code'] == code and sb['eu'] == 2, 'ENTRAR: o Beto cai no Azul (o time com menos gente)', sb)
            await C.evaluate("() => OFI.interno.mudaModo('rachao')"); await C.wait_for_timeout(300)   # (em pé, a Oficina pede para girar: a tela do Rachão não)
            await C.evaluate("() => OFI.rachao.abre('online')"); await C.wait_for_timeout(1500)
            fc = moldura(C)
            await fc.fill('.rd-codigo', code.lower()); await fc.click('.rd-entrar .rc-bt')
            sc = await espera(C, "(() => { const S = OFI.interno.OFS; return S.code && S.sala && S.sala.rachao && OFI.tela === 'sala' && !OFI.rachao.aberto() && {code: S.code, eu: S.sala.roster.indexOf(NET49.id)}; })()", 6000)
            P.confere(sc and sc['code'] == code and sc['eu'] in (1, 3), 'o Caio digita o código na tela do Rachão (minúsculo vira maiúsculo): entra na sala', sc)
            await C.evaluate("() => OFI.interno.mandaSala({type: 'seat', slot: -1})"); await C.wait_for_timeout(400)
            P.confere(await rt(C, "OFI.interno.OFS.sala.roster.indexOf(NET49.id) === -1"), 'o Caio vai só assistir')
            await A.wait_for_timeout(300)
            await A.screenshot(path=str(SAIDA / 'v98_sala_tres.png'))

            # ---------------------------------------------------------------- 4) a partida
            print('\n4) a partida: a contagem, os nomes, os comandos, o fechar e o voltar, a queda')
            await A.click('.ofi-sala-comecar')
            for pg in (A, B, C):
                await espera(pg, "OFI.rachao.aberto() && !!OFI.interno.RSL.partida", 6000)
            fa, fb, fc = moldura(A), moldura(B), moldura(C)
            c0 = await espera_q(fa, "(() => { const c = RachaoRede.cena(), t = document.querySelector('#banner .bt').textContent; return c && c.temQuadro && /^[123]$/.test(t) && {banner: t, sub: document.querySelector('#banner .bs').textContent}; })()", 3000)
            P.confere(c0 and c0['banner'] in ('3', '2', '1') and c0['sub'] == 'Prepare-se', 'COMEÇAR: a moldura do Rachão abre nos três com a contagem 3, 2, 1 do servidor', c0)
            await A.screenshot(path=str(SAIDA / 'v98_contagem.png'))
            await A.wait_for_timeout(1800)
            ca, cb, cc = await fa.evaluate(CENA), await fb.evaluate(CENA), await fc.evaluate(CENA)
            P.confere(ca and cb and cc and ca['eu'] == 0 and cb['eu'] == 2 and cc['eu'] == -1 and ca['jogo'] and len(ca['j']) == 4,
                      'a partida nos três aparelhos: a Ana no lugar dela, o Beto no dele e o Caio assistindo', [ca and ca['eu'], cb and cb['eu'], cc and cc['eu']])
            P.confere(ca['j'][2][2] == 'Beto' and ca['j'][0][2] == '' and cb['j'][0][2] == 'Ana' and cc['j'][0][2] == 'Ana' and cc['j'][2][2] == 'Beto' and ca['j'][1][2] == '',
                      'os nomes de quem joga embaixo das tampinhas dos outros (a sua tem a setinha; os bots, nada)', [ca['j'], cb['j']])
            P.confere(cc['sub'] == 'Assistindo' and not cc['toque'], 'quem assiste vê "Assistindo" no placar e não tem os botões de jogar', [cc['sub'], cc['toque']])
            r = await fc.evaluate("({rot: App.topR.rot, w: innerWidth, h: innerHeight})")
            P.confere(r['rot'] and r['h'] > r['w'], 'em pé, o Rachão online gira o campo (como nos modos de sempre)', r)
            y0 = ca['j'][0][1]
            await A.keyboard.down('ArrowDown'); await A.wait_for_timeout(700)
            ca1 = await fa.evaluate(CENA)
            await A.keyboard.up('ArrowDown'); await A.wait_for_timeout(500)
            ca2, cb2, cc2 = await fa.evaluate(CENA), await fb.evaluate(CENA), await fc.evaluate(CENA)
            P.confere(ca1['j'][0][1] - y0 > 25, 'o teclado da Ana anda com a tampinha dela na hora, no aparelho dela (a previsão)', [y0, ca1['j'][0][1]])
            P.confere(abs(cb2['j'][0][1] - ca2['j'][0][1]) < 6 and abs(cc2['j'][0][1] - ca2['j'][0][1]) < 6 and cb2['j'][0][1] - y0 > 25,
                      'e o Beto e o Caio veem a Ana no mesmo lugar (o servidor jogou o comando dela)', [ca2['j'][0][:2], cb2['j'][0][:2], cc2['j'][0][:2]])
            P.confere(abs(cb2['bola'][0] - ca2['bola'][0]) < 8 and abs(cb2['bola'][1] - ca2['bola'][1]) < 8, 'a bola no mesmo lugar nos aparelhos', [ca2['bola'], cb2['bola']])
            await A.screenshot(path=str(SAIDA / 'v98_partida_ana.png')); await B.screenshot(path=str(SAIDA / 'v98_partida_beto.png')); await C.screenshot(path=str(SAIDA / 'v98_partida_caio.png'))
            # fechar no meio e voltar
            sq0 = await fa.evaluate("(() => { const c = RachaoRede.cena(); return c ? c.seq : -1; })()")
            await A.evaluate("() => OFI.rachao.fecha()"); await A.wait_for_timeout(500)
            r = await rt(A, "(() => { const b = document.querySelector('.ofi-rch-volta'); return {tela: OFI.tela, aberto: OFI.rachao.aberto(), volta: !!b && !b.hidden, status: document.querySelector('.ofi-sala-status').textContent}; })()")
            P.confere(r['tela'] == 'sala' and not r['aberto'] and r['volta'] and 'rolando' in r['status'], 'fechar o Rachão no meio: a tela da sala, com a partida rolando e o VOLTAR PARA A PARTIDA', r)
            await A.screenshot(path=str(SAIDA / 'v98_sala_rolando.png'))
            await A.click('.ofi-rch-volta'); await A.wait_for_timeout(900)
            fa = moldura(A)
            r = await espera_q(fa, "(() => { const c = RachaoRede.cena(); return c && App.scene === c && c.temQuadro && document.getElementById('pause').hidden && {eu: c.eu && c.eu.lugar}; })()", 4000)
            P.confere(r and r['eu'] == 0 and await rt(A, "OFI.rachao.aberto()"), 'VOLTAR PARA A PARTIDA: a partida volta (no lugar dela, sem a pausa)', r)
            # (depois da revisão) a contagem dos comandos continua a de antes: o servidor aceita os comandos na hora
            sq1 = await fa.evaluate("(() => { const c = RachaoRede.cena(); return c ? c.seq : -1; })()")
            yb0 = (await fb.evaluate(CENA))['j'][0][1]
            await A.keyboard.down('ArrowUp'); await A.wait_for_timeout(600); await A.keyboard.up('ArrowUp'); await A.wait_for_timeout(300)
            yb1 = (await fb.evaluate(CENA))['j'][0][1]
            P.confere(sq0 > 0 and sq1 >= sq0 and yb0 - yb1 > 15, 'e a contagem dos comandos continua a de antes da moldura fechar: o teclado da Ana anda na hora, também no Beto', [sq0, sq1, yb0, yb1])
            # o chat da sala aparece na partida; a mensagem escondida do árbitro do jogo de sempre (ARB:) não
            await fa.evaluate("() => { window.__avisos = []; const t0 = App.toast; App.toast = function (x) { window.__avisos.push(String(x)); return t0.apply(this, arguments); }; }")
            await B.evaluate("() => OFI.interno.mandaSala({type: 'say', text: 'ARB:x|isso-nao-aparece'})"); await B.wait_for_timeout(300)
            await B.evaluate("() => OFI.interno.mandaSala({type: 'say', text: 'bora time'})")
            av = await espera_q(fa, "(() => window.__avisos.some(x => /bora time/.test(x)) && window.__avisos)()", 3000)
            P.confere(av and any('Beto: bora time' in x for x in av) and not any('ARB' in x or 'isso-nao' in x for x in av), 'o chat da sala aparece na partida (Beto: bora time); a mensagem escondida do árbitro (ARB:) não', av)
            # a queda do Beto: a conexão cai e volta sozinha (a Oficina volta para a sala; o servidor manda a partida de novo)
            await B.evaluate("() => window.__RT('NET49.ws.close()')")
            ok2 = await espera(B, "(() => !!OFI.interno.RSL.partida && OFI.interno.OFS.sala && OFI.interno.OFS.sala.state === 'playing' && NET49.ws && NET49.ws.readyState === 1)()", 12000)
            await B.wait_for_timeout(1500)
            fb = moldura(B)
            cb3 = await espera_q(fb, "(() => { const c = RachaoRede.cena(); return c && c.temQuadro && performance.now() - c.ultQuadro < 300 && {eu: c.eu && c.eu.lugar}; })()", 6000)
            P.confere(ok2 and cb3 and cb3['eu'] == 2, 'a internet do Beto cai e volta: ele volta para a partida, no mesmo lugar, recebendo os quadros', [ok2, cb3])

            # ---------------------------------------------------------------- 5) o fim
            print('\n5) os gols e o fim')
            for g in range(3):
                await A.evaluate("() => OFI.interno.mandaSala({type: '__teste_gol', time: 0})"); await A.wait_for_timeout(2700)
            fins = [await espera_q(f, "(() => !document.getElementById('end').hidden && {tit: document.getElementById('endTitle').textContent, txt: document.getElementById('endText').innerText, placar: document.getElementById('endScore').innerText, volta: document.querySelector('#btnAgain .t').textContent, sair: document.getElementById('btnMenu').textContent, muda: document.getElementById('btnChange').hidden})()", 9000) for f in (fa, fb, fc)]
            P.confere(fins[0] and fins[0]['tit'] == 'Vitória!' and 'Você fez 3 gols' in fins[0]['txt'] and fins[0]['volta'] == 'Voltar para a sala' and fins[0]['sair'] == 'Sair da sala' and fins[0]['muda'],
                      'três gols da Ana: o fim dela (Vitória!, os gols dela, VOLTAR PARA A SALA e SAIR DA SALA; sem jogar de novo nem mudar opções)', fins[0])
            P.confere(fins[1] and fins[1]['tit'] == 'Derrota' and 'Ana 3' in fins[1]['txt'] and fins[2] and fins[2]['tit'] == 'Vermelho venceu',
                      'o do Beto (Derrota, com quem fez os gols) e o do Caio, que assistiu (Vermelho venceu)', [fins[1], fins[2]])
            await A.screenshot(path=str(SAIDA / 'v98_fim_ana.png')); await B.screenshot(path=str(SAIDA / 'v98_fim_beto.png'))
            await fa.click('#btnAgain'); await A.wait_for_timeout(700)
            r = await rt(A, "(() => ({tela: OFI.tela, aberto: OFI.rachao.aberto(), status: document.querySelector('.ofi-sala-status').textContent, comecar: !document.querySelector('.ofi-sala-comecar').hidden}))()")
            P.confere(r['tela'] == 'sala' and not r['aberto'] and 'Última: 3 × 0' in r['status'] and r['comecar'], 'VOLTAR PARA A SALA: a tela da sala, com a última partida e o COMEÇAR de novo', r)
            # a lista do GALERA (a do jogo de sempre): a sala do Rachão com a etiqueta
            r = await rt(C, "(() => { const s = SL.lista.find(x => x.rachao); if (!s) return null; const d = sbLinha(s); return {tag: (d.querySelector('.ofi-tag-rch') || {}).textContent, sub: (d.querySelector('small') || {}).textContent}; })()")
            P.confere(r and r['tag'] == 'RACHÃO' and 'Clássico' in r['sub'], 'na lista de salas do GALERA, a sala aparece com a etiqueta RACHÃO e o campo', r)
            await C.evaluate("() => OFI.interno.OFS.sai()"); await C.wait_for_timeout(600)
            r = await rt(C, "(() => ({code: OFI.interno.OFS.code, tela: OFI.tela, aba: OFI.interno.HUB.aba, aberto: OFI.rachao.aberto()}))()")
            P.confere(not r['code'] and r['tela'] == 'hub' and r['aba'] == 'rachao_salas' and not r['aberto'], 'sair da sala do Rachão volta para as Salas online do modo RACHÃO', r)

            # ---------------------------------------------------------------- 5b) a sala com um estádio de quem cria
            print('\n5b) a sala com um estádio da Ana: os ajustes, o admin que herdou a sala e a partida no estádio')
            await fb.click('#btnAgain'); await B.wait_for_timeout(600)          # (o Beto volta para a sala)
            await A.click('.ofi-sala-topo .ofi-bt:has-text("AJUSTES")'); await A.wait_for_timeout(900)
            fa = moldura(A)
            await espera_q(fa, "!document.getElementById('setup').hidden")
            # a Ana faz um estádio dela (a cópia da Rua, com outro nome) — o armazenamento é o da moldura do Rachão
            idA = await fa.evaluate("(() => { const E = RachaoEstadios, d = E.docDeMapa(E.original('rua')); d.nome = 'Rua da Ana'; const id = E.cria(d); App.renderSetup(); return id; })()")
            r = await fa.evaluate("(id) => { const c = document.querySelector('.mapCard[data-map=\"' + id + '\"]'); return c && (c.querySelector('.rc-selo') || {}).textContent; }", idA)
            P.confere(bool(idA) and r == 'Seu', 'os AJUSTES mostram os estádios da Ana junto dos 17 campos (com o selo Seu)', [idA, r])
            await fa.click('.mapCard[data-map="%s"]' % idA); await A.wait_for_timeout(200)
            await fa.click('#btnStart')
            s5 = await espera(A, "(() => { const S = OFI.interno.OFS, c = S.sala && OFI.interno.RSL.campos.get(S.code); return S.sala && S.sala.rachao.info.nome === 'Rua da Ana' && !OFI.rachao.aberto() && c && c.estadio && {hash: c.hash, id: c.estadio.id, linha: document.querySelector('.ofi-sala-mapa').textContent}; })()", 6000)
            sb5 = await espera(B, "(() => { const S = OFI.interno.OFS, c = S.sala && OFI.interno.RSL.campos.get(S.code); return c && c.estadio && c.estadio.nome === 'Rua da Ana' && {hash: c.hash, linha: document.querySelector('.ofi-sala-mapa').textContent}; })()", 6000)
            P.confere(s5 and sb5 and s5['hash'] == sb5['hash'] and s5['id'].startswith('u_') and 'Rua da Ana' in s5['linha'] and 'Rua da Ana' in sb5['linha'],
                      'SALVAR AJUSTES com o estádio da Ana: a sala vira o estádio dela, e o servidor manda o estádio para quem está na sala', [s5, sb5])
            await A.click('.ofi-sala-topo .ofi-bt:has-text("AJUSTES")'); await A.wait_for_timeout(900)
            fa = moldura(A)
            r = await espera_q(fa, "(() => !document.getElementById('setup').hidden && {mapa: App.sel.online.map, daSala: !!document.querySelector('.mapCard.rd-da-sala'), seus: RachaoEstadios.lista().length})()")
            P.confere(r and r['mapa'] == idA and not r['daSala'] and r['seus'] == 1, 'os AJUSTES de novo: o estádio da sala é o da Ana (o cartão dela marcado, sem cópia nenhuma)', r)
            await A.evaluate("() => OFI.rachao.fecha()"); await A.wait_for_timeout(400)
            idB = await rt(B, "NET49.id")
            await A.evaluate("(id) => OFI.interno.mandaSala({type: 'adm', acao: 'admin', id})", idB)
            okB = await espera(B, "OFI.interno.OFS.sala && OFI.interno.OFS.sala.admin === NET49.id", 5000)
            await B.wait_for_timeout(300)
            await B.click('.ofi-sala-topo .ofi-bt:has-text("AJUSTES")'); await B.wait_for_timeout(900)
            fb = moldura(B)
            r = await espera_q(fb, "(() => { if (document.getElementById('setup').hidden) return null; const c = document.querySelector('.mapCard.rd-da-sala'); return {mapa: App.sel.online.map, on: !!c && c.classList.contains('on'), selo: c && (c.querySelector('.rc-selo') || {}).textContent, nome: c && c.querySelector('.mn').textContent, seus: RachaoEstadios.lista().length}; })()")
            P.confere(okB and r and r['mapa'] == 'rd-da-sala' and r['on'] and r['selo'] == 'Da sala' and 'Rua da Ana' in r['nome'] and r['seus'] == 0,
                      'a Ana passa o admin: o Beto não tem o estádio, e os AJUSTES dele mostram o da sala («Da sala», marcado), sem guardar nos estádios dele', r)
            await B.screenshot(path=str(SAIDA / 'v98_ajustes_da_sala.png'))
            await seg(fb, 'Tamanho dos times', '1x1')
            await fb.click('#btnStart')
            r = await espera(B, "(() => { const S = OFI.interno.OFS, c = S.sala && OFI.interno.RSL.campos.get(S.code); return S.sala && S.sala.n === 1 && !OFI.rachao.aberto() && c && {nome: S.sala.rachao.info.nome, hash: c.hash}; })()", 6000)
            P.confere(r and s5 and r['nome'] == 'Rua da Ana' and r['hash'] == s5['hash'], 'SALVAR AJUSTES do Beto: a sala continua no estádio da Ana (o mesmo) e vira 1x1', r)
            await B.evaluate("() => OFI.rachao.abre('partida')"); await B.wait_for_timeout(900)
            fb = moldura(B)
            await espera_q(fb, "typeof App !== 'undefined' && !!App.sel", 3000)
            await fb.evaluate("() => App.openSetup('match')"); await B.wait_for_timeout(300)
            r = await fb.evaluate("(() => ({daSala: MAPS.filter(m => m.daSala).length, cartao: !!document.querySelector('.mapCard[data-map=\"rd-da-sala\"]'), cartoes: document.querySelectorAll('.mapCard').length, seus: RachaoEstadios.lista().length}))()")
            P.confere(r['daSala'] == 0 and not r['cartao'] and r['cartoes'] >= 18 and r['seus'] == 0, 'fora dos AJUSTES (o Contra bots), o estádio da sala some dos campos do Beto', r)
            await B.evaluate("() => OFI.rachao.fecha()"); await B.wait_for_timeout(400)
            await B.click('.ofi-sala-comecar')
            for pg in (A, B):
                await espera(pg, "OFI.rachao.aberto() && !!OFI.interno.RSL.partida", 6000)
            fa, fb = moldura(A), moldura(B)
            cs = [await espera_q(f, "(() => { const c = RachaoRede.cena(); return c && c.temQuadro && {campo: c.m.map.name, n: c.m.players.length, eu: c.eu ? c.eu.lugar : -1}; })()", 5000) for f in (fa, fb)]
            P.confere(all(cs) and cs[0]['campo'] == 'Rua da Ana' and cs[1]['campo'] == 'Rua da Ana' and cs[0]['n'] == 2 and cs[0]['eu'] != cs[1]['eu'],
                      'COMEÇAR (o Beto, o admin agora): a partida no estádio da Ana, 1x1, nos dois aparelhos', cs)
            await A.wait_for_timeout(1800)
            await A.screenshot(path=str(SAIDA / 'v98_partida_estadio.png'))
            await B.evaluate("() => OFI.interno.mandaSala({type: 'adm', acao: 'encerrar'})")
            fins = [await espera_q(f, "(() => !document.getElementById('end').hidden && document.getElementById('endText').innerText)()", 6000) for f in (fa, fb)]
            P.confere(all(fins) and all('O admin encerrou' in x for x in fins), 'o ENCERRAR do admin: o fim nos dois, dizendo que o admin encerrou (não vale para a sala)', fins)
            for pg in (A, B, C):
                P.confere(not pg.erros, 'sem erro no console de ' + pg.nome, pg.erros[:5])
            for pg in (A, B, C):
                await pg.b.close()
    finally:
        srv.kill()
        try:
            out = srv.stdout.read() if srv.stdout else ''
        except Exception:
            out = ''
        if P.falhas:
            print('--- servidor ---\n' + out[-2500:])

    # ---------------------------------------------------------------- 6) sem servidor, e 7) as telas
    print('\n6) sem o servidor das salas, e 7) as telas no celular')
    h = functools.partial(Quieto, directory=str(RAIZ))
    s = socketserver.ThreadingTCPServer(('127.0.0.1', 0), h); s.daemon_threads = True
    threading.Thread(target=s.serve_forever, daemon=True).start()
    url2 = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % s.server_address[1]
    async with async_playwright() as pw:
        D = await sessao(pw, url2, 'Duda', config={'modo': 'demo'})   # (a versão de demonstração: o artefato)
        await D.evaluate("() => { localStorage.setItem('racha-ofi-modo', 'rachao'); OFI.abre('hub'); }"); await D.wait_for_timeout(500)
        await D.evaluate("() => OFI.interno.mudaAba('rachao_salas')"); await D.wait_for_timeout(1200)
        r = await rt(D, "(() => ({b: (document.querySelector('.ofi-rch-salas .ofi-vazio b') || {}).textContent, s: (document.querySelector('.ofi-rch-salas .ofi-vazio small') || {}).textContent}))()")
        P.confere(r['b'] == 'Sem conexão com o servidor das salas.' and 'precisa do servidor das salas' in r['s'], 'na demonstração (sem servidor), a aba SALAS ONLINE explica que o online do Rachão precisa do servidor das salas', r)
        await D.screenshot(path=str(SAIDA / 'v98_sem_servidor.png'))
        await D.click('.ofi-rch-online .ofi-bt:has-text("CRIAR SALA")'); await D.wait_for_timeout(1500)
        fd = moldura(D)
        await fd.click('#btnStart')
        av = await espera_q(fd, "(() => { const a = document.getElementById('rc-aviso'); return a && a.classList.contains('on') && /servidor das salas/.test(a.textContent) && a.textContent; })()", 4000)
        P.confere(av and 'desligado' in av, 'e o CRIAR SALA da tela do Rachão diz o mesmo, sem travar (o resto do Rachão funciona)', av)
        r = await sobra(D, fd)
        P.confere(r['doc'] <= 0, 'a SALA ONLINE cabe no celular deitado (844x390)', r)
        await D.screenshot(path=str(SAIDA / 'v98_sem_servidor_criar.png'))
        await D.b.close()
        E = await sessao(pw, url2, 'Edu', 390, 844, config={'modo': 'demo'})
        await E.evaluate("() => { localStorage.setItem('racha-ofi-modo', 'rachao'); OFI.abre('hub'); }"); await E.wait_for_timeout(500)
        r = await sobra(E)
        P.confere(r['doc'] <= 0, 'a central no modo RACHÃO cabe no celular em pé (390x844)', r)
        await E.screenshot(path=str(SAIDA / 'v98_rachao_em_pe.png'))
        await E.evaluate("() => OFI.rachao.abre('online')"); await E.wait_for_timeout(1500)
        fe = moldura(E)
        r = await sobra(E, fe)
        P.confere(r['doc'] <= 0, 'a SALA ONLINE do Rachão cabe em pé (390x844)', r)
        await E.screenshot(path=str(SAIDA / 'v98_sala_online_em_pe.png'))
        P.confere(not D.erros and not E.erros, 'sem erro no console sem o servidor', D.erros[:3] + E.erros[:3])
        await E.b.close()
    s.shutdown()
    return P.fim()

roda(principal())
