"""RACHA v107 · o árbitro arrastando os jogadores na sala e na partida (passa/falha, com fotos em tests/saida/). Com o jogo logado
na PLATAFORMA DE TESTE (o código de verdade de app/api com SQLite e o servidor das salas montado no mesmo endereço) e três
contas em três navegadores numa sala online 2v2: a Ana (a árbitra, que cria a sala; 1280 × 720), o Beto (1280 × 720) e o Caio
(o celular deitado, 844 × 390). Os arrastos são de verdade — o mouse do Playwright (apertar, mexer, soltar) e o dedo pelo CDP
(Input.dispatchTouchEvent) —, nunca chamando as funções do arrasto por dentro:
  1. a sala: a Ana arrasta o Caio (assistindo) para a coluna do TIME B — a cópia do cartão vai com o mouse, a coluna acende e a
     etiqueta diz PARA O TIME B; ao soltar ele entra no time B nos três navegadores (a ficha não abre) e a faixa "caiov107 foi
     para o TIME B" aparece para os três;
  2. com o dedo, o Beto para QUEM ASSISTE (o banco);
  3. a coluna que rola (QUEM ASSISTE apertada): o dedo na vertical rola a coluna sem levantar nada; de lado, o mesmo dedo
     arrasta o Beto (no banco) para a VAGA LIVRE do time A (a vaga acende); e o time A cheio acende vermelho (soltar ali não
     manda nada e avisa);
  4. o Caio (time B) em cima da Ana (time A): os dois trocam (o cartão dela acende, TROCAR COM ANAV107);
  5. quem não é o árbitro (o Beto) aperta e arrasta: nada levanta e ninguém muda;
  6. tocar sem mexer — o clique, o clique com um tremidinho de 3 px e o dedo — continua abrindo a ficha do árbitro;
  7. a partida: no painel dos jogadores, apertar e mexer na hora levanta o nome pelo movimento (não pelo meio segundo da v104:
     conferido por dentro, num arrasto solto no cabeçalho, que não muda ninguém); e a Ana arrasta SEM SEGURAR — com o dedo, o
     Beto para o BANCO (o banco à mão durante o arrasto) e, com o mouse, o Beto do banco para a VAGA LIVRE do time B —; cada um
     muda na hora, com a partida rolando, e a faixa aparece em cima do jogo;
  8. tocar num nome do painel continua chegando como toque (o click, com o mouse e com o dedo) sem levantar nada; o click do
     fim de um arrasto não chega. Em todo arrasto, soltar não abre janela nenhuma (nem a ficha do árbitro nem, com o perfil
     da v107 junto — tools/v107/perfil.js —, a janelinha do perfil): só o toque abre;
  9. o placar e a rodada seguem (a partida não reinicia) e nenhum erro de JavaScript.
  python3 tests/v107_painel_test.py"""
import asyncio, json, math, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, rt, async_playwright, RAIZ
from v88_cliente_test import Plataforma, conta, abre_logado, espera

SAIDA = RAIZ / 'tests' / 'saida'
JOGA = "NET49.playing && NET49.localSlot >= 0 && NET49.lastTick > 0"
PONTO = """([s, fx, fy]) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect();
  return r.width > 2 && r.height > 2 ? [Math.round(r.left + r.width*fx), Math.round(r.top + r.height*fy)] : null; }"""
FICHA = """(() => { const c = LB.popCaixa; if (LB.pop.hidden || !c.classList.contains('v103-ficha')) return '';
  return (c.querySelector('h2') || {}).textContent || '?'; })()"""
NO_MEIO = """(() => { const g = document.querySelector('#lb .sl-card.pn107-fantasma'), q = g && g.getBoundingClientRect(), acesos = [...document.querySelectorAll('#sl-meio .pn107-alvo')];
  return {g:!!g, cx:q ? Math.round(q.left + q.width/2) : null, cy:q ? Math.round(q.top + q.height/2) : null, w:q ? Math.round(q.width) : 0,
    acesos:acesos.map(x => x.dataset.id || x.dataset.slot || x.className.split(' ').filter(c => c && !/^pn107|^cheio$/.test(c)).join('.')), tag:g ? (g.querySelector('.pn107-acao') || {}).textContent || '' : '',
    origem:document.querySelectorAll('#sl-meio .sl-card.pn107-origem').length, est:window.RachaPainel107.estado()}; })()"""
NO_MEIO_NAO = "(() => { const o = " + NO_MEIO + "; o.nao = document.querySelectorAll('#sl-meio .pn107-nao').length; o.tagNao = !!document.querySelector('.pn107-fantasma .pn107-acao.pn107-acao-nao'); return o; })()"
# nenhuma janela aberta: nem a ficha (LB.pop) nem a janelinha do perfil da v107 (o tools/v107/perfil.js, quando junto): soltar
# um arrasto não abre nada — só o toque abre
NADA_ABERTO = "(() => LB.pop.hidden && !(window.RachaPerfil107 && window.RachaPerfil107.estado().aberta))()"
FECHA_TUDO = "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); try { if (window.RachaPerfil107) window.RachaPerfil107.fecha(); } catch (_) {} return 1; })()"


async def foto(pg, nome):
    SAIDA.mkdir(parents=True, exist_ok=True)
    await pg.screenshot(path=str(SAIDA / nome))


async def ponto(pg, sel, fx=.5, fy=.5):
    return await pg.evaluate(PONTO, [sel, fx, fy])


async def arrasta_mouse(pg, a, b, passos=12, meio=None, segura=0.0):
    """Aperta em a, mexe até b em passos (30 ms cada) e solta; meio(pg) roda antes de soltar (o dedo ainda em b)."""
    await pg.mouse.move(a[0], a[1]); await pg.mouse.down()
    if segura: await asyncio.sleep(segura)
    for k in range(1, passos + 1):
        await pg.mouse.move(a[0] + (b[0] - a[0])*k/passos, a[1] + (b[1] - a[1])*k/passos); await asyncio.sleep(.03)
    r = await meio(pg) if meio else None
    await pg.mouse.up(); await asyncio.sleep(.25)
    return r


async def dedo(cdp, tipo, p=None):
    await cdp.send('Input.dispatchTouchEvent', {'type': tipo, 'touchPoints': [{'x': p[0], 'y': p[1], 'id': 1, 'radiusX': 6, 'radiusY': 6, 'force': 1}] if p else []})


async def arrasta_dedo(pg, cdp, a, b, passos=12, meio=None):
    """O mesmo com o dedo (o toque de verdade do Chromium: touch-action, o gesto e o pointercancel valem)."""
    await dedo(cdp, 'touchStart', a)
    for k in range(1, passos + 1):
        await dedo(cdp, 'touchMove', (a[0] + (b[0] - a[0])*k/passos, a[1] + (b[1] - a[1])*k/passos)); await asyncio.sleep(.03)
    r = await meio(pg) if meio else None
    await dedo(cdp, 'touchEnd'); await asyncio.sleep(.3)
    return r


async def toca_dedo(cdp, p):
    await dedo(cdp, 'touchStart', p); await dedo(cdp, 'touchEnd'); await asyncio.sleep(.35)   # (um atrás do outro: com a máquina cheia, o meio segundo do segurar não chega)


# quem levantou o nome no painel da partida: o movimento (o v107 zera o V104D.t antes) ou o meio segundo do segurar (o timer da v104)
ESPIA_PEGA = """(() => { if (!window.__pn107p){ window.__pn107p = []; window.addEventListener('pointerdown', () => { window.__pn107d = performance.now(); }, true);
  const f = v104Pega; v104Pega = function(){ window.__pn107p.push({ms:Math.round(performance.now() - (window.__pn107d || 0)), mov:V104D.t === null}); return f.apply(this, arguments); }; }
  return window.__pn107p.length; })()"""


def passo12(a, b):
    """O primeiro movimento: 12 px de a na direção de b (passa do limiar de 8 px de uma vez)."""
    d = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
    return (a[0] + (b[0] - a[0])*12/d, a[1] + (b[1] - a[1])*12/d)


async def todos(pgs, js, ms=8000):
    return [bool(await espera(pg, js, ms)) for pg in pgs]


async def fecha_pops(pgs):
    for pg in pgs: await rt(pg, FECHA_TUDO)


async def principal():
    P = Placar('v107 · o árbitro arrastando na sala e na partida')
    banco = os.path.join(tempfile.mkdtemp(prefix='racha107-'), 'plataforma.sqlite')
    PL = Plataforma(banco).sobe()
    navs, errs = [], []
    try:
        for n in ('anav107', 'betov107', 'caiov107'): conta(PL, n)
        async with async_playwright() as pw:
            bA, A, eA = await abre_logado(pw, PL, 'anav107'); navs.append(bA)
            bB, B, eB = await abre_logado(pw, PL, 'betov107'); navs.append(bB)
            bC, C, eC = await abre_logado(pw, PL, 'caiov107', 844, 390); navs.append(bC)
            errs = [eA, eB, eC]; pgs = (A, B, C)
            cdpA = await A.context.new_cdp_session(A)
            for pg in pgs: await rt(pg, "abreTela('amigos')")
            for pg in pgs: await espera(pg, "!!NET49.id", 10000)
            await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:false, n:2, map:0, jogo:'futebol', tempo:0, nome:'v107 arrastar'}); sxCriar(); return 1; })()")
            cod = await espera(A, "NET49.room && NET49.room.code", 8000)
            await rt(B, "(() => { net49Send({type:'join', code:%s, slot:2}); return 1; })()" % json.dumps(cod))
            await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
            await rt(C, "(() => { net49Send({type:'join', code:%s, spectate:true}); return 1; })()" % json.dumps(cod))
            ok0 = await espera(A, "NET49.room && NET49.room.members.length === 3 && NET49.room.roster[0] === NET49.id && !!NET49.room.roster[2]", 8000)
            telas = await todos(pgs, "lobby.aberto && lobby.tela === 'sala' && NET49.room && NET49.room.members.length === 3 && !!document.querySelector('#tela-sala .sl-card')")
            ids = {n: await rt(pg, "NET49.id") for n, pg in (('ana', A), ('beto', B), ('caio', C))}
            await fecha_pops(pgs); await asyncio.sleep(.8)
            arb = [await rt(pg, "window.RachaPainel107.salaArb() && SL.el.classList.contains('pn107-arb')") for pg in pgs]
            P.confere(ok0 and all(telas) and arb == [True, False, False],
                      '0) a sala 2v2 da plataforma (Ana no time A, Beto no B, Caio assistindo) aberta nos três; só a Ana (a árbitra) pega os cartões', [ok0, telas, arb, ids])
            card = lambda nome: '#sl-meio .sl-card[data-id="%s"]' % ids[nome]
            for pg in pgs: await rt(pg, "(PN107.faixaMs = 8000, 1)")   # (a faixa fica 8 s no teste: conferir nos três e fotografar, com a máquina cheia, passa dos 2,6 s)

            # 1) o Caio (assistindo) para a coluna do TIME B, com o mouse
            print('\n1) a sala: o Caio para o TIME B (o mouse)')
            a = await ponto(A, card('caio')); b = await ponto(A, '#sl-c1', .5, .9)
            async def meio1(pg):
                st = await rt(pg, NO_MEIO); await foto(pg, 'v107_sala_arrastando.png'); return st
            m1 = await arrasta_mouse(A, a, b, meio=meio1)
            v1 = await todos(pgs, "NET49.room.roster[3] === %s && !!document.querySelector('#sl-c1 .sl-card[data-id=%s]')" % (json.dumps(ids['caio']), json.dumps(ids['caio'])))
            f1 = [await espera(pg, "(window.RachaPainel107.estado().faixa || '').indexOf('caiov107 foi para o TIME B') >= 0", 4000) for pg in pgs]
            await foto(C, 'v107_faixa_sala.png')
            nada1 = await rt(A, NADA_ABERTO)
            perto = m1 and m1['g'] and m1['cx'] is not None and math.hypot(m1['cx'] - b[0], m1['cy'] - b[1]) < 40
            P.confere(perto and m1['acesos'] == ['sl-col.sl-time.sl-azul'] and m1['tag'] == 'PARA O TIME B' and m1['origem'] == 1,
                      '1) arrastando: a cópia do cartão vai com o mouse (%s px do ponteiro), a coluna do TIME B acende e a etiqueta diz PARA O TIME B' % (m1 and m1['cx'] is not None and round(math.hypot(m1['cx'] - b[0], m1['cy'] - b[1]))), m1)
            P.confere(all(v1) and nada1, '1) ao soltar, o Caio entra no time B (o lugar 4) nos três navegadores, e nenhuma janela abre (nem a ficha nem o perfil)', [v1, nada1])
            P.confere(all(f1), '1) a faixa "caiov107 foi para o TIME B" aparece para os três (a árbitra, o Beto e o Caio)', f1)

            # 2) o Beto para QUEM ASSISTE, com o dedo
            print('\n2) a sala: o Beto para o banco (o dedo)')
            rola = await rt(A, "(() => { const c = document.getElementById('sl-c1'); return {rola:c.classList.contains('pn107-rola'), ta:getComputedStyle(c.querySelector('.sl-card')).touchAction}; })()")
            a = await ponto(A, card('beto')); b = await ponto(A, '#sl-cE', .5, .75)
            m2 = await arrasta_dedo(A, cdpA, a, b, meio=lambda pg: rt(pg, NO_MEIO))
            v2 = await todos(pgs, "(() => { const r = NET49.room, m = r.members.find(x => x.id === %s); return m && m.slot < 0 && r.roster.indexOf(m.id) < 0 && !!document.querySelector('#sl-cE .sl-card[data-id=%s]'); })()" % (json.dumps(ids['beto']), json.dumps(ids['beto'])))
            f2 = await espera(B, "(window.RachaPainel107.estado().faixa || '').indexOf('betov107 foi para o BANCO') >= 0", 4000)
            nada2 = await rt(A, NADA_ABERTO)
            P.confere(not rola['rola'] and rola['ta'] == 'none' and m2 and m2['g'] and m2['tag'] == 'PARA O BANCO' and m2['acesos'] == ['sl-col.sl-esp'],
                      '2) com o dedo (touch-action: none no cartão da coluna que não rola) a cópia levanta e QUEM ASSISTE acende: PARA O BANCO', [rola, m2])
            P.confere(all(v2) and bool(f2) and nada2, '2) ao soltar, o Beto vai para o banco nos três navegadores (nada abre) e a faixa diz "betov107 foi para o BANCO"', [v2, f2, nada2])

            # 3) a coluna que rola (QUEM ASSISTE apertada, como com muita gente): o dedo na vertical rola; de lado, arrasta o Beto
            #    (no banco) para a VAGA LIVRE do time A
            print('\n3) a sala: a coluna que rola e o Beto do banco para a VAGA LIVRE do time A (o dedo)')
            await rt(A, "(() => { const s = document.createElement('style'); s.id = 'pn107-aperta'; s.textContent = '#lb #tela-sala #sl-cE{ flex:0 0 auto !important; height:96px !important; min-height:0 !important; }'; document.head.appendChild(s); slRender(); return 1; })()")
            await asyncio.sleep(.3)
            ro = await rt(A, "(() => { const c = document.getElementById('sl-cE'), k = c.querySelector('.sl-card'); return {rola:c.classList.contains('pn107-rola'), ta:k ? getComputedStyle(k).touchAction : '', top:c.scrollTop}; })()")
            a = await ponto(A, card('beto'))
            mr = await arrasta_dedo(A, cdpA, a, (a[0], a[1] - 70), passos=10, meio=lambda pg: rt(pg, NO_MEIO))
            ro2 = await rt(A, "(() => ({top:document.getElementById('sl-cE').scrollTop, banco:NET49.room.members.find(m => m.id === %s).slot}))()" % json.dumps(ids['beto']))
            P.confere(ro['rola'] and ro['ta'] == 'pan-y' and mr and not mr['g'] and not mr['est']['ini'] and ro2['top'] > ro['top'] and ro2['banco'] < 0,
                      '3) na coluna que rola, o dedo na vertical rola a coluna (scrollTop %s → %s) e nada levanta' % (ro['top'], ro2['top']), [ro, mr, ro2])
            a = await ponto(A, card('beto')); b = await ponto(A, '#sl-c0 .sl-vaga[data-slot="1"]')
            m3 = await arrasta_dedo(A, cdpA, a, b, meio=lambda pg: rt(pg, NO_MEIO))
            v3 = await todos(pgs, "NET49.room.roster[1] === %s && !!document.querySelector('#sl-c0 .sl-card[data-id=%s]')" % (json.dumps(ids['beto']), json.dumps(ids['beto'])))
            await rt(A, "(() => { const s = document.getElementById('pn107-aperta'); if (s) s.remove(); slRender(); return 1; })()")
            nada3 = await rt(A, NADA_ABERTO)
            P.confere(m3 and m3['g'] and m3['acesos'] == ['1'] and m3['tag'] == 'PARA O TIME A' and all(v3) and nada3,
                      '3) de lado, o mesmo dedo arrasta: a VAGA LIVRE do time A acende (PARA O TIME A); ao soltar, o Beto entra nela nos três navegadores (nada abre)', [m3, v3, nada3])
            # o time cheio: soltar na coluna (fora dos cartões) não manda nada e avisa
            a = await ponto(A, card('caio')); b = await ponto(A, '#sl-c0', .5, .9)
            async def meio_cheio(pg):
                st = await rt(pg, NO_MEIO_NAO); await foto(pg, 'v107_sala_time_cheio.png'); return st
            mc = await arrasta_mouse(A, a, b, meio=meio_cheio)
            await asyncio.sleep(.6)
            rc = await rt(A, "({roster:NET49.room.roster.slice(), toast:X49UI.toast ? X49UI.toast.textContent : ''})")
            P.confere(mc and mc['nao'] == 1 and mc['tagNao'] and mc['tag'] == 'O TIME A ESTÁ CHEIO' and rc['roster'][3] == ids['caio'] and 'cheio' in rc['toast'],
                      '3) o time A cheio acende vermelho (O TIME A ESTÁ CHEIO); soltar ali não muda ninguém e avisa ("%s")' % rc['toast'], [mc, rc])

            # 4) o Caio (time B) em cima da Ana (time A): trocam
            print('\n4) a sala: o Caio em cima da Ana (troca)')
            await asyncio.sleep(2.9)                              # (o servidor aceita 3 ações do árbitro a cada 8 s)
            a = await ponto(A, card('caio')); b = await ponto(A, card('ana'))
            m4 = await arrasta_mouse(A, a, b, meio=lambda pg: rt(pg, NO_MEIO))
            v4 = await todos(pgs, "NET49.room.roster[0] === %s && NET49.room.roster[3] === %s" % (json.dumps(ids['caio']), json.dumps(ids['ana'])))
            f4 = await espera(C, "(() => { const t = window.RachaPainel107.estado().faixa || ''; return t.indexOf('caiov107 foi para o TIME A') >= 0 && t.indexOf('trocou com anav107') >= 0 ? t : ''; })()", 4000)
            nada4 = await rt(A, NADA_ABERTO)
            P.confere(m4 and m4['acesos'] == [ids['ana']] and m4['tag'] == 'TROCAR COM ANAV107' and all(v4) and bool(f4) and nada4,
                      '4) o cartão da Ana acende (TROCAR COM ANAV107); ao soltar (em cima de outro cartão: nada abre), os dois trocam nos três navegadores e a faixa conta a troca', [m4, v4, f4, nada4])

            # 5) quem não é o árbitro não arrasta
            print('\n5) o Beto (não é o árbitro) tenta arrastar')
            r5a = await rt(A, "NET49.room.roster.slice()")
            a = await ponto(B, card('caio')); b = await ponto(B, '#sl-cE', .5, .7)
            m5 = await arrasta_mouse(B, a, b, meio=lambda pg: rt(pg, NO_MEIO))
            await asyncio.sleep(.8)
            r5b = await rt(A, "NET49.room.roster.slice()")
            P.confere(m5 and not m5['g'] and not m5['est']['ini'] and not m5['acesos'] and r5a == r5b,
                      '5) o Beto aperta e arrasta o cartão do Caio: nada levanta, nada acende e ninguém muda', [m5, r5a, r5b])
            await fecha_pops(pgs)

            # 6) tocar sem mexer continua abrindo a ficha
            print('\n6) tocar continua abrindo a ficha')
            q = await ponto(A, card('beto'))
            await A.mouse.click(q[0], q[1]); await asyncio.sleep(.4)
            t1 = await rt(A, FICHA); await rt(A, "fechaPop(), 1"); await asyncio.sleep(.2)
            await A.mouse.move(q[0], q[1]); await A.mouse.down(); await A.mouse.move(q[0] + 3, q[1] + 1); await asyncio.sleep(.05); await A.mouse.move(q[0] + 2, q[1] + 2); await A.mouse.up(); await asyncio.sleep(.4)
            t2 = await rt(A, FICHA); await foto(A, 'v107_sala_toque_ficha.png'); await rt(A, "fechaPop(), 1"); await asyncio.sleep(.2)
            await toca_dedo(cdpA, q)
            t3 = await rt(A, FICHA); await rt(A, "fechaPop(), 1"); await asyncio.sleep(.2)
            P.confere(all('BETOV107' in (t or '') for t in (t1, t2, t3)),
                      '6) tocar no cartão do Beto abre a ficha do árbitro: o clique, o clique com um tremidinho de 3 px e o dedo', [t1, t2, t3])

            # 7) a partida: o painel arrasta sem segurar
            print('\n7) a partida: arrastar no painel sem segurar')
            await asyncio.sleep(2.0)
            await rt(A, "slIniciar()")
            jog = await todos(pgs, JOGA, 15000)
            await fecha_pops(pgs)
            await rt(A, "(() => { net49Send({type:'__teste_gol', time:P.time}); return 1; })()")
            pl0 = await espera(A, "RQ.placar[0] + RQ.placar[1] === 1 ? RQ.placar.join('×') : ''", 8000)
            antes = await rt(A, "({round:NET49.room.round, tick:NET49.lastTick})")
            await rt(A, "(() => { v93PainelAlterna(true); return 1; })()"); await asyncio.sleep(.8)
            dica = await rt(A, "(() => { const d = V93P.el.p.querySelector('.v104-dica'); return d ? d.textContent : ''; })()")
            P.confere(all(jog) and pl0 == '0×1' and 'arraste' in dica and 'segure' not in dica,
                      '7) a partida começa (Caio e Beto × Ana), sai um gol (0 × 1) e a dica do painel da árbitra diz arraste (sem o segure)', [jog, pl0, dica])
            MEIO_P = """(() => { const p = V93P.el.p, f = p.querySelector('.v95-pj-fora'), q = f && f.getBoundingClientRect(), g = document.querySelector('.v104-fantasma');
              return {arr:window.RachaPainel104.estado().arr, g:!!g, gTampa:!!(g && (() => { const c = g.querySelector('canvas'); if (!c) return false; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return true; return false; })()),
                banco:!!q && q.width > 20 && q.height > 10 && q.top >= 0 && q.bottom <= innerHeight && q.left >= 0 && q.right <= innerWidth,
                alvo:[...p.querySelectorAll('.v104-alvo')].map(x => x.dataset.slot != null ? 'slot' + x.dataset.slot : x.classList.contains('v95-pj-fora') ? 'banco' : x.className)}; })()"""
            # o sem segurar: apertar e mexer 12 px na hora levanta o nome pelo movimento (não pelo meio segundo da v104). Num arrasto
            # que não muda ninguém (solto no cabeçalho); com a máquina cheia a página pode ficar parada mais de meio segundo e o timer
            # chegar antes do movimento — aí o teste tenta de novo (até 3 vezes)
            prova = []
            for _ in range(3):
                n0 = await rt(A, ESPIA_PEGA)
                a = await ponto(A, '.v95-pj li[data-id="%s"]' % ids['caio']); cab = await ponto(A, '.v95-pj-cab', .2, .5)
                await A.mouse.move(a[0], a[1]); await A.mouse.down(); await A.mouse.move(*passo12(a, cab))
                for k in range(1, 7):
                    await A.mouse.move(a[0] + (cab[0] - a[0])*k/6, a[1] + (cab[1] - a[1])*k/6); await asyncio.sleep(.03)
                await A.mouse.up(); await asyncio.sleep(.35)
                p = await rt(A, "window.__pn107p.slice(%d)" % n0); prova.append(p)
                if len(p) == 1 and p[0]['mov']: break
            r7 = await rt(A, "NET49.room.roster.slice()"); nada7 = await rt(A, NADA_ABERTO)
            ok7 = prova and len(prova[-1]) == 1 and prova[-1][0]['mov'] and prova[-1][0]['ms'] < 450
            P.confere(ok7 and r7[0] == ids['caio'] and nada7,
                      '7) sem segurar: apertar e mexer na hora levanta o nome pelo movimento (%s ms depois de apertar; o meio segundo nem chega) — solto no cabeçalho, ninguém muda e nada abre' % (prova[-1][0]['ms'] if prova and prova[-1] else '?'), [prova, r7, nada7])
            # com o dedo e sem segurar: o Beto para o banco (o banco à mão durante o arrasto)
            await asyncio.sleep(.4)
            n0 = await rt(A, ESPIA_PEGA)
            a = await ponto(A, '.v95-pj li[data-id="%s"]' % ids['beto']); b = await ponto(A, '.v95-pj-fora', .5, .6)
            await dedo(cdpA, 'touchStart', a); await dedo(cdpA, 'touchMove', passo12(a, b))   # (o primeiro movimento logo depois de encostar)
            for k in range(2, 11):
                await dedo(cdpA, 'touchMove', (a[0] + (b[0] - a[0])*k/10, a[1] + (b[1] - a[1])*k/10)); await asyncio.sleep(.03)
            m7 = await rt(A, MEIO_P)
            await dedo(cdpA, 'touchEnd'); await asyncio.sleep(.3)
            p7 = await rt(A, "window.__pn107p.slice(%d)" % n0)
            b7 = await espera(B, "NET49.playing && NET49.localSlot < 0 ? 1 : 0", 6000); nada7b = await rt(A, NADA_ABERTO)
            P.confere(len(p7) == 1 and m7['g'] and m7['gTampa'] and m7['banco'] and m7['alvo'] == ['banco'] and bool(b7) and nada7b,
                      '7) com o dedo e sem segurar (o nome levanta %s ms depois de encostar%s), a cópia sai com a tampinha, o banco fica à mão e acende; ao soltar o Beto vai para o banco com a partida rolando (nada abre)'
                      % (p7[0]['ms'] if p7 else '?', '' if p7 and p7[0]['mov'] else ' — pelo timer: a página ficou parada'), [p7, m7, b7, nada7b])
            # com o mouse e sem segurar: o Beto do banco para a VAGA LIVRE do time B
            await asyncio.sleep(2.9)
            n0 = await rt(A, ESPIA_PEGA)
            a = await ponto(A, '.v95-pj-fora li[data-id="%s"]' % ids['beto']); b = await ponto(A, '.v95-pj li[data-slot="2"]')
            await A.mouse.move(a[0], a[1]); await A.mouse.down(); await A.mouse.move(*passo12(a, b))
            for k in range(2, 13):
                await A.mouse.move(a[0] + (b[0] - a[0])*k/12, a[1] + (b[1] - a[1])*k/12); await asyncio.sleep(.03)
            m8 = await rt(A, MEIO_P); await foto(A, 'v107_partida_arrastando.png')
            await A.mouse.up(); await asyncio.sleep(.3)
            p8 = await rt(A, "window.__pn107p.slice(%d)" % n0)
            b8 = await espera(B, "NET49.playing && NET49.localSlot === 2 ? 1 : 0", 6000); nada8 = await rt(A, NADA_ABERTO)
            # (a faixa à vista e onde ela está, na mesma leitura; o pé do placar na tela: o placar cresce com o HUD)
            FAIXA_LUGAR = """(() => { const f = document.getElementById('pn107-faixa'); if (!f || f.hidden || (f.textContent || '').indexOf('betov107 foi para o TIME B') < 0) return null;
              const q = f.getBoundingClientRect(), c = cv.getBoundingClientRect(), k = c.width/W, hk = HUDX.k || 1, pb = c.top + (PLACAR80.y + PLACAR80.h)*hk*k;
              return {top:Math.round(q.top), bottom:Math.round(q.bottom), placar:Math.round(pb), dentro:q.left >= 0 && q.right <= innerWidth && q.width > 50}; })()"""
            f8 = await asyncio.gather(*[espera(pg, FAIXA_LUGAR, 6000) for pg in pgs])
            await asyncio.gather(foto(B, 'v107_faixa_partida.png'), foto(C, 'v107_faixa_partida_celular.png'))
            fx = f8[2]
            P.confere(len(p8) == 1 and m8['g'] and m8['alvo'] == ['slot2'] and bool(b8) and nada8,
                      '7) com o mouse e sem segurar (o nome levanta %s ms depois de apertar%s), o Beto do banco vai para a VAGA LIVRE do time B: ele entra no time B na hora (nada abre)'
                      % (p8[0]['ms'] if p8 else '?', '' if p8 and p8[0]['mov'] else ' — pelo timer: a página ficou parada'), [p8, m8, b8, nada8])
            P.confere(all(f8) and all(x['dentro'] and x['top'] >= x['placar'] - 2 for x in f8),
                      '7) a faixa "betov107 foi para o TIME B" aparece em cima do jogo para os três (no celular deitado, embaixo do placar: %s ≥ %s px)' % (fx and fx['top'], fx and fx['placar']), [f8, fx])

            # 8) tocar num nome do painel continua sendo toque; o click do fim de um arrasto não chega
            print('\n8) tocar no painel continua sendo toque')
            await rt(A, "(() => { window.__pn107c = []; if (!window.__pn107l){ window.__pn107l = 1; V93P.el.p.addEventListener('click', e => { const li = e.target.closest('li[data-id]'); window.__pn107c.push(li ? li.dataset.id : '-'); }); } return 1; })()")
            r8a = await rt(A, "NET49.room.roster.slice()")
            q = await ponto(A, '.v95-pj li[data-id="%s"]' % ids['caio'])
            # (o toque pode abrir alguma coisa — com o perfil da v107 junto, a ficha do árbitro por cima do jogo —: fecha antes do próximo)
            await A.mouse.click(q[0], q[1]); await asyncio.sleep(.4)
            g8 = await rt(A, "!!document.querySelector('.v104-fantasma') || window.RachaPainel104.estado().arr")
            await rt(A, FECHA_TUDO); await asyncio.sleep(.6)    # (fechando a janela por cima do jogo, a camada do lobby some de novo)
            for _ in range(2):                                    # (se a máquina cheia segurou o dedo por meio segundo, o nome levantou: não era toque; de novo)
                n0 = await rt(A, ESPIA_PEGA); await toca_dedo(cdpA, q)
                if await rt(A, "window.__pn107p.length") == n0: break
                await rt(A, "window.__pn107c.splice(1)")
            c8 = await rt(A, "window.__pn107c.slice()"); g8 = g8 or await rt(A, "!!document.querySelector('.v104-fantasma') || window.RachaPainel104.estado().arr")
            await rt(A, FECHA_TUDO); await asyncio.sleep(.6)
            q = await ponto(A, '.v95-pj li[data-id="%s"]' % ids['caio']); cab = await ponto(A, '.v95-pj-cab')
            await arrasta_mouse(A, q, cab, passos=8)             # (soltar no cabeçalho: nenhum lugar; o click do fim não vale)
            await asyncio.sleep(.5)
            c8b = await rt(A, "window.__pn107c.slice()"); r8b = await rt(A, "NET49.room.roster.slice()"); nada8b = await rt(A, NADA_ABERTO)
            P.confere(c8 == [ids['caio'], ids['caio']] and not g8 and c8b == c8 and r8a == r8b and nada8b,
                      '8) tocar no nome do Caio chega como toque (o click, com o mouse e com o dedo) sem levantar nada; o arrasto solto no cabeçalho não muda ninguém, o click do fim dele não chega e nada abre', [c8, g8, c8b, r8a, r8b, nada8b])

            # 9) a partida seguiu
            dep = await rt(A, "({round:NET49.room.round, tick:NET49.lastTick, placar:RQ.placar.join('×'), fim:RQ.estado === 'fim', jogando:NET49.playing})")
            P.confere(dep['round'] == antes['round'] and dep['tick'] > antes['tick'] and dep['placar'] == '0×1' and not dep['fim'] and dep['jogando'],
                      '9) o placar continua (%s), a rodada é a mesma e o relógio andou: a partida não reiniciou' % dep['placar'], [antes, dep])
            erros = [e for L in errs for e in L if 'Failed to load resource' not in e and 'WebSocket' not in e]
            P.confere(not erros, '9) nenhum erro de JavaScript nos três navegadores', erros[:4])
    finally:
        for b in navs:
            try: await b.close()
            except Exception: pass
        PL.desce()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
