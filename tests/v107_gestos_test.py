"""RACHA v107 · OS GESTOS DO EMOJI E DAS FALAS (tools/v107/gestos.js e app/public/game/v107-gestos.css) — passa/falha, no navegador:
  1) arrastar de verdade (o toque pelo CDP: Input.dispatchTouchEvent) para os 5 lados, nos dois botões, contra os bots no iPhone
     com o entalhe (844×390): a cruz daquele botão no meio da tela, o aro e o X; o lado aceso (a opção e a setinha); soltar manda
     o emoji / a frase daquele lugar e o balão aparece em cima da sua tampinha; parado (segurando), o do meio; as capturas
     (tests/saida/v107_gestos_emoji_844x390.png e v107_gestos_falas_844x390.png);
  2) cancelar e o toque rápido: soltar no X não manda nada (e não abre a cruz do toque); o sistema tirando o dedo (touchCancel)
     também não; o toque rápido de sempre abre a cruz da v106 e o menu das 8 frases da v93, e tocar numa opção manda; com o
     celular ocupado (o relógio do gesto vencendo a fila), vale a hora dos eventos: o toque continua toque e o segurar manda;
  3) dois dedos: o analógico seguro (a tampinha andando) enquanto o outro dedo arrasta o emoji; o emoji vai e o analógico continua
     com o dedo dele; o PASSE apertado com um terceiro dedo no meio do gesto; o aro, o X e a cruz não pegam toque nenhum;
  4) o mouse (o computador, 1280×720): arrastar também manda e o clique continua abrindo a cruz;
  5) o ritmo: o segundo logo em seguida não vai (a cruz apagada enquanto espera), nem o emoji nem a frase;
  6) os tamanhos: 844×390 com o entalhe, 667×375, 740×360 (Android com o furo), 1280×720, 1920×1080 e o treino (só o emoji, como
     antes): o aro, o X e a cruz inteiros na tela e na área segura, sem encostar nos controles, na pausa, no placar, nos outros
     botões nem na barra da sala (tests/saida/v107_gestos_<tamanho>.png);
  7) a cruz das frases: o padrão, o poeFrase (troca, grava em racha-falas-v107 e avisa), o que não vale, a leitura ao abrir de
     novo (e a estragada), a chave na cópia da conta (tools/v82 e app/contracts/progresso.ts); no COFRE › EMOJI, a troca
     EMOJIS | FRASES, escolher o lugar, pôr a frase, o PADRÃO e, na partida, o arrasto mandando a frase escolhida no COFRE; o COFRE
     cabendo em 1280×720, 844×390, 568×320 e no iPhone com o entalhe (tests/saida/v107_gestos_cofre_frases_<tamanho>.png);
  8) Reduzir animações (o do sistema e o dos Ajustes): as peças sem animação nem transição;
  9) online com duas sessões (o servidor da turma de verdade): o emoji e a frase arrastados pela Ana chegam ao Beto, em cima da
     tampinha dela; com os emojis dos outros desligados no Beto, o dela chega e não aparece (tests/saida/v107_gestos_online_844x390.png);
  e nenhum erro de JavaScript.
  python3 tests/v107_gestos_test.py   (--sem-online: sem a parte 9 · --so 3,5: só as partes 3 e 5)"""
import asyncio, json, math, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, abre, rt, RAIZ, CHROME, async_playwright
from v106_emotes_test import pagina, COMECA, TREINO, sem_rede, cruza, no_circulo
from online_test import porta_livre, sessao, espera
from v106_cofre_test import CABE

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
ERROS = []
IPHONE = {'top': 0, 'left': 47, 'right': 47, 'bottom': 21}
LUGARES = ['cima', 'esquerda', 'meio', 'direita', 'baixo']
FRASES_PADRAO = [0, 3, 2, 1, 4]
PRONTO = "RachaEmotes106.estado().pode && !EMO106.el.bt.hidden && !!EMO106.lugar"
PRONTO_BOTS = PRONTO + " && RQ.estado === 'jogo' && !V93P.contagem && v93FalaPode() && !V93F.el.bt.hidden"
BT = {'emoji': 'EMO106.el.bt', 'falas': 'V93F.el.bt'}
ZERA = "(() => { EMO106.envios = []; V93F.ult = 0; EMO106.baloes.clear(); V93F.baloes.clear(); return 1; })()"
PARA = "(() => { if (!window.__arb0) window.__arb0 = ARB_PARADO; ARB_PARADO = () => true; return 1; })()"      # (a física parada: nada de gol no meio da conta)
ANDA = "(() => { if (window.__arb0) ARB_PARADO = window.__arb0; window.__arb0 = null; return 1; })()"

# as peças do gesto e o que elas não podem cobrir (em px da página)
GEO7 = """(() => {
  const c = cv.getBoundingClientRect(), k = c.width/W, hk = HUDX.k || 1;
  const s = getComputedStyle(document.documentElement), n = v => parseFloat(v) || 0;
  const sa = {t:n(s.paddingTop), r:n(s.paddingRight), b:n(s.paddingBottom), l:n(s.paddingLeft)};
  const R = e => { if (!e || e.hidden || e.closest('[hidden]')) return null; const q = e.getBoundingClientRect(), cs = getComputedStyle(e); if (q.width < 1 || cs.display === 'none') return null; return [q.left, q.top, q.right, q.bottom]; };
  const ctl = []; for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id); ctl.push([id, c.left + e.x*k, c.top + e.y*k, e.r*k]); }
  const b = BTN_PAUSA, pausa = [c.left + b.x*k, c.top + b.y*k, c.left + (b.x + b.w)*k, c.top + (b.y + b.h)*k];
  let placar = null; try { const pw = v80PlacarW()*hk; placar = [c.left + (W/2 - pw/2)*k, c.top, c.left + (W/2 + pw/2)*k, c.top + (PLACAR80.y + PLACAR80.h)*hk*k]; } catch (_) {}
  const E = GES107.el, est = RachaGestos107.estado();
  return {vw:innerWidth, vh:innerHeight, sa, ctl, pausa, placar, est, aro:R(E.aro), x:R(E.x), pino:R(E.pino), ops:E.ops.map(R), chev:E.chev.map(R),
    on:E.ops.map(o => o.classList.contains('on')), chevOn:E.chev.map(x => x.classList.contains('on')), xOn:E.x.classList.contains('on'),
    tipo:E.cruz.classList.contains('emoji') ? 'emoji' : E.cruz.classList.contains('falas') ? 'falas' : '', espera:E.cruz.classList.contains('espera'), cancela:E.cruz.classList.contains('cancela'),
    rotulos:E.ops.map(o => o.getAttribute('aria-label')), atual:E.ops.map(o => o.getAttribute('aria-current')), cruzRot:E.cruz.getAttribute('aria-label'),
    valores:E.ops.map(o => o.dataset.v), segura:[EMO106.el.bt.classList.contains('ges107-segura'), V93F.el.bt.classList.contains('ges107-segura')],
    emo:R(EMO106.el.bt), falas:R(V93F.el.bt), jog:R(V93P.el && V93P.el.bt), barra:R(X49UI.onlinebar), cruzV106:EMO106.cruz, menuV93:V93F.menu};
})()"""
CENTRO = "(() => { const r = %s.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; })()"
PRONTA = "[GES107.el.aro, GES107.el.x, GES107.el.cruz, GES107.el.pino].every(e => !e.hidden && e.getAnimations({subtree:true}).every(a => a.playState === 'finished'))"
TELA_PRONTA = ("lobby.tela === 'cofre' && [document.getElementById('tela-cofre'), document.getElementById('lb-camada')].every(e => !e || e.getAnimations({subtree:true})"
               ".every(a => a.playState !== 'running' || (a.effect && a.effect.getTiming().iterations === Infinity)))")   # (a tela já entrou: as animações de entrada acabaram)
EST = "RachaGestos107.estado()"
BALOES = "({emo:RachaEmotes106.estado().baloes.map(b => b.k + ':' + b.e), falas:RachaFalas93.baloes().map(b => b.k + ':' + b.i)})"


async def toque(cdp, tipo, pts):
    await cdp.send('Input.dispatchTouchEvent', {'type': tipo, 'touchPoints': [{'x': float(x), 'y': float(y), 'id': i} for i, x, y in pts]})


async def segura(cdp, x, y, i=5, outros=()):
    """um dedo a mais (i) pousa em (x, y); os outros continuam onde estão"""
    await toque(cdp, 'touchStart', list(outros) + [(i, x, y)])


async def anda(cdp, x0, y0, x1, y1, i=5, outros=(), passos=6):
    for k in range(1, passos + 1):
        await toque(cdp, 'touchMove', list(outros) + [(i, x0 + (x1 - x0)*k/passos, y0 + (y1 - y0)*k/passos)])
        await asyncio.sleep(.025)


async def solta(cdp, x, y, i=5):
    """(o touchEnd do CDP solta os dedos da lista; os outros continuam)"""
    await toque(cdp, 'touchEnd', [(i, x, y)])


def circ(r):
    return [(r[0] + r[2])/2, (r[1] + r[3])/2, (r[2] - r[0])/2] if r else None


def circ_ret(c, R, folga=0):
    nx = max(R[0], min(c[0], R[2])); ny = max(R[1], min(c[1], R[3]))
    return math.hypot(nx - c[0], ny - c[1]) < c[2] - folga


def circ_circ(a, c, folga=0):
    return math.hypot(a[0] - c[1], a[1] - c[2]) < a[2] + c[3] - folga


def problemas(g, tipo):
    """o que as peças do gesto cobrem (ou o que sai da tela): [] quando está tudo certo"""
    sa, ruins = g['sa'], []
    tela = [sa['l'] - 1, sa['t'] - 1, g['vw'] - sa['r'] + 1, g['vh'] - sa['b'] + 1]
    pecas = [('aro', g['aro'], True), ('x', g['x'], True)] + [('op:' + LUGARES[i], r, False) for i, r in enumerate(g['ops'])] + [('seta%d' % i, r, False) for i, r in enumerate(g['chev'])]
    outros = [('pausa', g['pausa']), ('placar', g['placar']), ('jogadores', g['jog']), ('barra', g['barra']), ('falas' if tipo == 'emoji' else 'emoji', g['falas'] if tipo == 'emoji' else g['emo'])]
    for nome, r, redondo in pecas:
        if not r: ruins.append(nome + ' não aparece'); continue
        if r[0] < tela[0] or r[1] < tela[1] or r[2] > tela[2] or r[3] > tela[3]: ruins.append(nome + ' fora da tela ' + str([round(v) for v in r]))
        c = circ(r)
        for ct in g['ctl']:
            if (circ_circ(c, ct) if redondo else no_circulo(r, ct)): ruins.append(nome + ' no controle ' + ct[0])
        for on, R in outros:
            if R and (circ_ret(c, R) if redondo else cruza(r, R)): ruins.append(nome + ' em cima de ' + on)
    return ruins


ESTAVEL = "JSON.stringify([EMO106.el.bt, V93F.el.bt].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), b.hidden]; }))"


async def comeca(pg, modo='bots'):
    await rt(pg, "(() => { opc.replay = false; return 1; })()")
    await rt(pg, COMECA if modo == 'bots' else TREINO)
    ok = await espera(pg, PRONTO_BOTS if modo == 'bots' else PRONTO, 20000)
    antes = None                                           # (os botões do lado do placar no lugar deles: o HUD acabou de se arrumar)
    for _ in range(14):
        await asyncio.sleep(.35)
        agora = await rt(pg, ESTAVEL)
        if agora == antes: break
        antes = agora
    return ok


async def gesto(pg, cdp, tipo, dx, dy, parado=False, foto=None, ler=True):
    """segura o botão, arrasta (dx, dy) — ou fica parado — e solta. Devolve (o que se via antes de soltar, o estado depois)"""
    x0, y0 = await rt(pg, CENTRO % BT[tipo])
    await segura(cdp, x0, y0)
    if parado: await asyncio.sleep(.36)
    else: await anda(cdp, x0, y0, x0 + dx, y0 + dy)
    await asyncio.sleep(.12)
    g = await rt(pg, GEO7) if ler else None
    if foto: await pg.screenshot(path=str(SAIDA / foto))
    await solta(cdp, x0 + dx, y0 + dy)
    await asyncio.sleep(.25)
    return g, await rt(pg, EST)


# ---------------------------------------------------------------------------------------------------------------- 1) os 5 lados nos dois botões
async def cinco(P, b):
    print('\n1) arrastar para os 5 lados nos dois botões (contra os bots, 844 × 390 com o entalhe; o toque de verdade)')
    ctx, pg = await pagina(b, 844, 390, ins=IPHONE, toque=True)
    cdp = await ctx.new_cdp_session(pg)
    try:
        ok = await comeca(pg)
        P.confere(bool(ok), 'a partida contra os bots com os dois botões à vista (o emoji e as falas)', ok)
        await rt(pg, PARA)
        api = await rt(pg, "Object.keys(RachaGestos107)")
        P.confere(all(k in api for k in ('estado', 'frases', 'textos', 'poeFrase', 'padraoFrases', 'mudouFrases', 'lugares', 'todas')), 'a API dos testes: window.RachaGestos107 (estado, frases, poeFrase…)', api)
        rot = await rt(pg, "[EMO106.el.bt, V93F.el.bt].map(b => [b.getAttribute('aria-label'), (document.getElementById(b.getAttribute('aria-describedby') || '') || {}).textContent || '', getComputedStyle(b).touchAction])")
        P.confere(all(r[0] and 'arraste' in r[1] and r[2] == 'none' for r in rot), 'os dois botões: o rótulo de sempre, a dica do gesto (aria-describedby) e o toque preso no botão (touch-action: none)', rot)
        slots = await rt(pg, "RachaEmotes106.slots()")
        frases = await rt(pg, "RachaGestos107.frases()")
        todas = await rt(pg, "RachaGestos107.todas()")
        for tipo in ('emoji', 'falas'):
            esperado = slots if tipo == 'emoji' else frases
            for i, (lugar, dx, dy) in enumerate([('cima', 0, -26), ('esquerda', -42, 0), ('meio', 0, 0), ('direita', 42, 0), ('baixo', 0, 40)]):
                await rt(pg, ZERA)
                n0 = await rt(pg, "RachaGestos107.estado().enviados.length")
                foto = ('v107_gestos_%s_844x390.png' % tipo) if (tipo, lugar) in (('emoji', 'direita'), ('falas', 'baixo')) else None
                g, e = await gesto(pg, cdp, tipo, dx, dy, parado=(lugar == 'meio'), foto=foto)
                bal = await rt(pg, BALOES)
                vis = g['est']
                aceso = g['on'] == [j == i for j in range(5)] and g['atual'][i] == 'true' and (g['chevOn'] == [False]*4 if lugar == 'meio' else g['chevOn'][{'cima': 0, 'esquerda': 1, 'direita': 2, 'baixo': 3}[lugar]])
                pecas = g['aro'] and g['x'] and g['pino'] and all(g['ops']) and g['tipo'] == tipo and g['segura'][0 if tipo == 'emoji' else 1]
                ult = e['ultimo'] or {}
                valor = esperado[i]
                foi = ult.get('tipo') == tipo and ult.get('lugar') == lugar and ult.get('ok') is True and ult.get('valor') == valor and len(e['enviados']) == n0 + 1
                balao = ('eu:' + valor) in bal['emo'] if tipo == 'emoji' else ('eu:%d' % valor) in bal['falas']
                nome = valor if tipo == 'emoji' else todas[valor]
                fechou = not e['ativo'] and not (await rt(pg, "!GES107.el.cruz.hidden || !GES107.el.aro.hidden || !GES107.el.x.hidden || EMO106.cruz || V93F.menu"))
                P.confere(vis['fase'] == 'aberto' and vis['sel'] == lugar and aceso and pecas and foi and balao and fechou,
                          '%s, %s%s: a cruz, o aro e o X; o %s aceso; soltar manda %s e o balão aparece em cima da sua tampinha' % (tipo.upper(), lugar.upper(), ' (parado, segurando)' if lugar == 'meio' else '', lugar, nome),
                          [vis['fase'], vis['sel'], g['on'], g['chevOn'], g['tipo'], ult, bal, fechou])
        # (as opções com o rótulo de cada uma, para o leitor de tela)
        await rt(pg, ZERA)
        x0, y0 = await rt(pg, CENTRO % 'EMO106.el.bt')
        await segura(cdp, x0, y0); await asyncio.sleep(.36)
        g = await rt(pg, GEO7)
        await anda(cdp, x0, y0, g['est']['geo']['x']['cx'], g['est']['geo']['x']['cy']); await solta(cdp, g['est']['geo']['x']['cx'], g['est']['geo']['x']['cy']); await asyncio.sleep(.25)
        P.confere(g['cruzRot'] and 'arraste' in g['cruzRot'] and all(r and '(' + LUGARES[j] + ')' in r for j, r in enumerate(g['rotulos'])) and g['valores'] == slots,
                  'os rótulos: a cruz ("arraste até um e solte") e cada opção com o nome e o lugar (VALEU (cima)…)', [g['cruzRot'], g['rotulos']])
    finally:
        ERROS.extend(sem_rede(pg.erros)); await ctx.close()


# ---------------------------------------------------------------------------------------------------------------- 2) cancelar e o toque rápido
async def cancela(P, b):
    print('\n2) cancelar (o X e o sistema tirando o dedo) e o toque rápido de sempre')
    ctx, pg = await pagina(b, 844, 390, ins=IPHONE, toque=True)
    cdp = await ctx.new_cdp_session(pg)
    try:
        await comeca(pg); await rt(pg, PARA)
        for tipo in ('emoji', 'falas'):
            await rt(pg, ZERA)
            e0 = await rt(pg, EST)
            x0, y0 = await rt(pg, CENTRO % BT[tipo])
            await segura(cdp, x0, y0); await asyncio.sleep(.36)
            g0 = await rt(pg, GEO7)
            if not P.confere(g0['est']['fase'] == 'aberto' and g0['est']['geo'], '%s: segurar o botão parado abre o gesto (a cruz, o aro e o X)' % tipo.upper(), g0['est']):
                await toque(cdp, 'touchCancel', []); await asyncio.sleep(.3); continue
            X = g0['est']['geo']['x']
            await anda(cdp, x0, y0, X['cx'], X['cy'], passos=8); await asyncio.sleep(.1)
            g = await rt(pg, GEO7)
            if tipo == 'emoji': await pg.screenshot(path=str(SAIDA / 'v107_gestos_cancela_844x390.png'))
            await solta(cdp, X['cx'], X['cy']); await asyncio.sleep(.35)
            e = await rt(pg, EST)
            bal = await rt(pg, BALOES)
            aberto = await rt(pg, "({v106:EMO106.cruz, v93:V93F.menu, cruz:!GES107.el.cruz.hidden})")
            P.confere(g['est']['sel'] == 'cancela' and g['xOn'] and g['cancela'] and len(e['enviados']) == len(e0['enviados']) and e['cancelados'] == e0['cancelados'] + 1
                      and not bal['emo'] and not bal['falas'] and aberto == {'v106': False, 'v93': False, 'cruz': False},
                      '%s: arrastar até o X acende o X (a cruz apagada) e soltar não manda nada — nem abre a cruz do toque' % tipo.upper(), [g['est']['sel'], g['xOn'], e['ultimo'], bal, aberto])
            # o sistema tira o dedo (a ligação, o gesto do aparelho): o touchCancel
            await rt(pg, ZERA)
            await segura(cdp, x0, y0); await anda(cdp, x0, y0, x0 + 40, y0); await asyncio.sleep(.1)
            antes = (await rt(pg, EST))['sel']
            await toque(cdp, 'touchCancel', []); await asyncio.sleep(.3)
            e2 = await rt(pg, EST)
            bal = await rt(pg, BALOES)
            P.confere(antes == 'direita' and not e2['ativo'] and len(e2['enviados']) == len(e['enviados']) and not bal['emo'] and not bal['falas'] and e2['cancelados'] == e['cancelados'] + 1,
                      '%s: o toque cancelado pelo sistema (touchCancel) no meio do arrasto não manda nada' % tipo.upper(), [antes, e2['ultimo'], bal])
        # o toque rápido de sempre (o toque de verdade: o Playwright toca e solta)
        await rt(pg, ZERA)
        t0 = await rt(pg, EST)
        x0, y0 = await rt(pg, CENTRO % 'EMO106.el.bt')
        await pg.touchscreen.tap(x0, y0); await asyncio.sleep(.35)
        c = await rt(pg, "({cruz:EMO106.cruz, vis:!EMO106.el.cruz.hidden, g:!GES107.el.cruz.hidden})")
        t1 = await rt(pg, EST)
        meio = await rt(pg, "(() => { const r = EMO106.el.ops[2].getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; })()")
        await pg.touchscreen.tap(meio[0], meio[1]); await asyncio.sleep(.35)
        bal = await rt(pg, BALOES)
        slots = await rt(pg, "RachaEmotes106.slots()")
        P.confere(c == {'cruz': True, 'vis': True, 'g': False} and t1['toques'] == t0['toques'] + 1 and t1['gestos'] == t0['gestos'] and ('eu:' + slots[2]) in bal['emo'],
                  'EMOJI: o toque rápido abre a cruz de sempre (a da v106, embaixo do botão; o gesto não abre) e tocar no do meio manda', [c, t1['toques'] - t0['toques'], bal])
        x0, y0 = await rt(pg, CENTRO % 'V93F.el.bt')
        await pg.touchscreen.tap(x0, y0); await asyncio.sleep(.35)
        m = await rt(pg, "({menu:V93F.menu, vis:!V93F.el.menu.hidden, n:V93F.el.menu.querySelectorAll('.v93-fl-fr').length, frases:[...V93F.el.menu.querySelectorAll('.v93-fl-fr')].map(b => b.textContent.slice(1))})")
        ob = await rt(pg, "(() => { const b = [...V93F.el.menu.querySelectorAll('.v93-fl-fr')].find(x => /Obrigado/.test(x.textContent)); const r = b.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; })()")
        await pg.touchscreen.tap(ob[0], ob[1]); await asyncio.sleep(.35)
        bal = await rt(pg, BALOES)
        todas = await rt(pg, "RachaGestos107.todas()")
        P.confere(m['menu'] and m['vis'] and m['n'] == 8 and m['frases'] == todas and 'eu:5' in bal['falas'],
                  'FALAS: o toque rápido abre o menu de sempre com as 8 frases (todas continuam ao alcance) e tocar em Obrigado! manda', [m, bal])
        # o celular ocupado: o relógio do gesto vence a fila e abre antes de o "soltar" ser lido — vale a hora dos eventos
        await rt(pg, ZERA)
        r = await rt(pg, """(() => { const b = EMO106.el.bt.getBoundingClientRect(), x = b.left + b.width/2, y = b.top + b.height/2, t = performance.now();
          const ev = dt => ({pointerId:4242, clientX:x, clientY:y, timeStamp:t + dt, pointerType:'touch', button:0, isPrimary:true, cancelable:false, preventDefault(){}});
          if (EMO106.cruz) emo106Cruz(false);
          const s0 = RachaGestos107.estado();
          ges107Comeca('emoji', ev(0)); ges107Abre(true);                            // (o relógio venceu a fila)
          const aberto = [RachaGestos107.estado().fase, document.documentElement.classList.contains('ges107-aberto')];
          ges107Solta(ev(90));                                                        // (mas o dedo saiu 90 ms depois de encostar)
          const s1 = RachaGestos107.estado();
          const toque = {aberto, fase:s1.fase, toques:s1.toques - s0.toques, gestos:s1.gestos - s0.gestos, enviados:s1.enviados.length - s0.enviados.length,
            engole:!!GES107.engole, classe:document.documentElement.classList.contains('ges107-aberto'), escondido:GES107.el.cruz.hidden};
          ges107Comeca('emoji', ev(400)); ges107Abre(true); ges107Solta(ev(720));     // (segurou de verdade: 320 ms parado)
          const s2 = RachaGestos107.estado();
          return {toque, segurou:{enviados:s2.enviados.length - s1.enviados.length, ultimo:s2.ultimo, engole:!!GES107.engole}}; })()""")
        slots = await rt(pg, "RachaEmotes106.slots()")
        P.confere(r['toque'] == {'aberto': ['aberto', True], 'fase': None, 'toques': 1, 'gestos': 0, 'enviados': 0, 'engole': False, 'classe': False, 'escondido': True},
                  'o celular ocupado (o relógio abriu o gesto antes de o soltar ser lido): pela hora dos eventos foi um toque rápido — nada vai e o clique de sempre passa', r['toque'])
        P.confere(r['segurou']['enviados'] == 1 and r['segurou']['ultimo']['lugar'] == 'meio' and r['segurou']['ultimo']['valor'] == slots[2] and r['segurou']['engole'],
                  '   e segurando de verdade (320 ms pela hora dos eventos), o do meio vai', r['segurou'])
    finally:
        ERROS.extend(sem_rede(pg.erros)); await ctx.close()


# ---------------------------------------------------------------------------------------------------------------- 3) dois dedos (o analógico e o gesto)
JOGO = "({joy:joy.id, papeis:[...ptrs.values()], P:[P.x, P.y], g:RachaGestos107.estado().fase, sel:RachaGestos107.estado().sel})"


async def dois_dedos(P, b):
    print('\n3) dois dedos: o analógico com um, o emoji com o outro (e o PASSE no meio)')
    ctx, pg = await pagina(b, 844, 390, ins=IPHONE, toque=True)
    cdp = await ctx.new_cdp_session(pg)
    try:
        await comeca(pg)
        await rt(pg, ZERA)
        jx, jy = await rt(pg, "(() => { const c = cv.getBoundingClientRect(), k = c.width/W, e = el('joy'); return [c.left + e.x*k, c.top + e.y*k]; })()")
        kx, ky = await rt(pg, "(() => { const c = cv.getBoundingClientRect(), k = c.width/W, e = el('kick'); return [c.left + e.x*k, c.top + e.y*k]; })()")
        bx, by = await rt(pg, CENTRO % 'EMO106.el.bt')
        # (a tampinha no lado direito, por cima, longe da bola e das paredes: ela anda para a esquerda o gesto inteiro sem bater em nada)
        await rt(pg, "(() => { P.x = LX1 - 260; P.y = LY0 + 150; P.vx = P.vy = 0; try { guardaAnterior(); } catch (_) {} return 1; })()")
        await asyncio.sleep(.1)
        dedo = (0, jx - 50, jy)                            # (o analógico para a esquerda)
        await segura(cdp, jx, jy, i=0); await anda(cdp, jx, jy, dedo[1], dedo[2], i=0, passos=4)
        await asyncio.sleep(.3)
        a = await rt(pg, JOGO)
        await segura(cdp, bx, by, i=1, outros=[dedo])
        await anda(cdp, bx, by, bx + 42, by, i=1, outros=[dedo])
        await asyncio.sleep(.15)
        b1 = await rt(pg, JOGO)
        await asyncio.sleep(.45)
        b2 = await rt(pg, JOGO)
        andou = b1['P'][0] - b2['P'][0]
        P.confere(a['joy'] is not None and b1['g'] == 'aberto' and b1['sel'] == 'direita' and b2['joy'] == a['joy'] and 'joy' in b2['papeis'] and andou > 20,
                  'com o analógico seguro (um dedo), o outro dedo arrasta o emoji: o gesto abre (direita) e a tampinha continua andando (%d px de campo em 0,45 s)' % andou, [a, b1, b2])
        # o PASSE com um terceiro dedo, no meio do gesto
        await segura(cdp, kx, ky, i=2, outros=[dedo, (1, bx + 42, by)]); await asyncio.sleep(.15)
        c = await rt(pg, JOGO)
        await solta(cdp, kx, ky, i=2); await asyncio.sleep(.15)
        c2 = await rt(pg, JOGO)
        P.confere('kick' in c['papeis'] and 'joy' in c['papeis'] and c['g'] == 'aberto' and c['sel'] == 'direita' and 'kick' not in c2['papeis'] and c2['g'] == 'aberto',
                  'o PASSE apertado com um terceiro dedo no meio do gesto: o jogo pega o PASSE (e o analógico), o gesto continua aceso', [c['papeis'], c['g'], c['sel'], c2['papeis']])
        # o aro, o X e a cruz não pegam toque (um dedo em cima deles cai no jogo)
        pe = await rt(pg, """(() => { const E = GES107.el, R = e => e.getBoundingClientRect(), meio = e => { const r = R(e); return [r.left + r.width/2, r.top + r.height/2]; };
          const alvo = e => { const [x, y] = meio(e), q = document.elementFromPoint(x, y); return q ? (q === cv ? 'cv' : (q.className && q.className.baseVal === undefined ? String(q.className) : q.tagName)) : null; };
          return {pe:[E.aro, E.x, E.cruz, E.pino].map(e => getComputedStyle(e).pointerEvents), alvos:E.ops.map(alvo), x:alvo(E.x)}; })()""")
        P.confere(pe['pe'] == ['none']*4 and all(a == 'cv' for a in pe['alvos'] + [pe['x']]), 'o aro, o X e a cruz não pegam toque: um dedo em cima de qualquer opção cai no campo (no canvas do jogo)', pe)
        # o analógico vira para a direita (o mesmo dedo) e o emoji é solto: vai (o da direita) e o analógico continua com o dedo dele
        volta = (0, jx + 50, jy)
        await anda(cdp, dedo[1], dedo[2], volta[1], volta[2], i=0, outros=[(1, bx + 42, by)], passos=4)
        n0 = await rt(pg, "RachaGestos107.estado().enviados.length")
        await solta(cdp, bx + 42, by, i=1); await asyncio.sleep(.2)
        d1 = await rt(pg, JOGO)
        await asyncio.sleep(.35)
        d2 = await rt(pg, JOGO)
        e = await rt(pg, EST)
        slots = await rt(pg, "RachaEmotes106.slots()")
        bal = await rt(pg, BALOES)
        P.confere(len(e['enviados']) == n0 + 1 and e['ultimo']['lugar'] == 'direita' and e['ultimo']['ok'] and ('eu:' + slots[3]) in bal['emo'] and d2['joy'] == a['joy'] and d2['P'][0] - d1['P'][0] > 12,
                  'soltar o emoji manda o da direita (%s) e o analógico continua com o dedo dele (a tampinha virou e segue andando)' % slots[3], [e['ultimo'], bal, d1, d2])
        dedo = volta
        await solta(cdp, dedo[1], dedo[2], i=0); await asyncio.sleep(.2)
        f = await rt(pg, JOGO)
        P.confere(f['joy'] is None and not f['papeis'], 'soltar o analógico solta (nada fica preso)', f)
        # ao contrário: o gesto primeiro, o analógico depois
        await rt(pg, ZERA)
        await segura(cdp, bx, by, i=1); await anda(cdp, bx, by, bx, by + 40, i=1); await asyncio.sleep(.1)
        await segura(cdp, jx, jy, i=0, outros=[(1, bx, by + 40)]); await anda(cdp, jx, jy, jx - 50, jy, i=0, outros=[(1, bx, by + 40)], passos=4)
        await asyncio.sleep(.3)
        h = await rt(pg, JOGO)
        await solta(cdp, bx, by + 40, i=1); await asyncio.sleep(.2)
        e = await rt(pg, EST)
        await solta(cdp, jx - 50, jy, i=0); await asyncio.sleep(.1)
        P.confere(h['g'] == 'aberto' and h['sel'] == 'baixo' and h['joy'] is not None and 'joy' in h['papeis'] and e['ultimo']['lugar'] == 'baixo' and e['ultimo']['ok'],
                  'o gesto primeiro e o analógico depois: o analógico pega o dedo novo e o gesto manda o de baixo', [h, e['ultimo']])
    finally:
        ERROS.extend(sem_rede(pg.erros)); await ctx.close()


# ---------------------------------------------------------------------------------------------------------------- 4) o mouse
async def mouse(P, b):
    print('\n4) o mouse (o computador, 1280 × 720): arrastar manda; o clique abre')
    ctx, pg = await pagina(b, 1280, 720, toque=False)
    try:
        await comeca(pg); await rt(pg, PARA); await rt(pg, ZERA)
        for tipo, dx, dy, lugar in (('emoji', 46, 0, 'direita'), ('falas', -46, 0, 'esquerda')):
            x0, y0 = await rt(pg, CENTRO % BT[tipo])
            await pg.mouse.move(x0, y0); await pg.mouse.down()
            await pg.mouse.move(x0 + dx, y0 + dy, steps=6); await asyncio.sleep(.1)
            g = await rt(pg, GEO7)
            await pg.mouse.up(); await asyncio.sleep(.35)
            e = await rt(pg, EST)
            ab = await rt(pg, "({v106:EMO106.cruz, v93:V93F.menu})")
            P.confere(g['est']['fase'] == 'aberto' and g['est']['sel'] == lugar and e['ultimo']['lugar'] == lugar and e['ultimo']['tipo'] == tipo and e['ultimo']['ok'] and ab == {'v106': False, 'v93': False},
                      '%s com o mouse: segurar o botão e arrastar (%s) manda; o clique que vem depois não abre a cruz do toque' % (tipo.upper(), lugar), [g['est']['sel'], e['ultimo'], ab])
        x0, y0 = await rt(pg, CENTRO % 'EMO106.el.bt')
        await pg.mouse.click(x0, y0); await asyncio.sleep(.35)
        ab = await rt(pg, "({v106:EMO106.cruz, g:!GES107.el.cruz.hidden})")
        P.confere(ab == {'v106': True, 'g': False}, 'o clique de sempre (sem arrastar) continua abrindo a cruz da v106', ab)
        await pg.keyboard.press('Escape'); await asyncio.sleep(.2)
    finally:
        ERROS.extend(sem_rede(pg.erros)); await ctx.close()


# ---------------------------------------------------------------------------------------------------------------- 5) o ritmo
async def ritmo(P, b):
    print('\n5) o ritmo (o mesmo intervalo da v106 e da v93): o segundo logo em seguida não vai')
    ctx, pg = await pagina(b, 844, 390, ins=IPHONE, toque=True)
    cdp = await ctx.new_cdp_session(pg)
    try:
        await comeca(pg); await rt(pg, PARA); await rt(pg, ZERA)
        for tipo, espera_ms in (('emoji', 1500), ('falas', 1600)):
            g1, e1 = await gesto(pg, cdp, tipo, 42, 0)
            # ("logo em seguida" mesmo com a máquina ocupada: o último envio fica com a hora de agora, antes do segundo arrasto)
            await rt(pg, "(() => { const a = performance.now(); if (EMO106.envios.length) EMO106.envios[EMO106.envios.length - 1] = a; if (V93F.ult) V93F.ult = a; return 1; })()")
            g2, e2 = await gesto(pg, cdp, tipo, -42, 0)
            bal = await rt(pg, BALOES)
            lista = bal['emo'] if tipo == 'emoji' else bal['falas']
            P.confere(e1['ultimo']['ok'] and not g1['espera'] and g2['espera'] and e2['ultimo']['lugar'] == 'esquerda' and e2['ultimo']['ok'] is False and len(lista) == 1,
                      '%s: o segundo logo em seguida não vai (a cruz aparece apagada enquanto espera; o balão continua o primeiro)' % tipo.upper(), [e1['ultimo'], g2['espera'], e2['ultimo'], lista])
            await asyncio.sleep(espera_ms/1000 + .2)
            g3, e3 = await gesto(pg, cdp, tipo, 0, 40)
            P.confere(not g3['espera'] and e3['ultimo']['lugar'] == 'baixo' and e3['ultimo']['ok'], '   %s: depois do intervalo (%.1f s), o próximo vai' % (tipo.upper(), espera_ms/1000), e3['ultimo'])
    finally:
        ERROS.extend(sem_rede(pg.erros)); await ctx.close()


# ---------------------------------------------------------------------------------------------------------------- 6) os tamanhos
TAMANHOS = [('iPhone (o entalhe) 844 × 390', '844x390', 844, 390, IPHONE, 'bots'),
            ('667 × 375', '667x375', 667, 375, None, 'bots'),
            ('Android 740 × 360 (o furo)', '740x360', 740, 360, {'top': 0, 'left': 34, 'right': 0, 'bottom': 0}, 'bots'),
            ('1280 × 720', '1280x720', 1280, 720, None, 'bots'),
            ('1920 × 1080', '1920x1080', 1920, 1080, None, 'bots'),
            ('o treino 844 × 390', 'treino_844x390', 844, 390, None, 'treino')]


async def tamanhos(P, b):
    print('\n6) as peças do gesto em vários tamanhos (dentro da tela, sem cobrir nada)')
    for nome, arq, w, h, ins, modo in TAMANHOS:
        ctx, pg = await pagina(b, w, h, ins=ins, toque=True)
        cdp = await ctx.new_cdp_session(pg)
        try:
            ok = await comeca(pg, modo)
            await rt(pg, PARA)
            tipos = ['emoji', 'falas'] if modo == 'bots' else ['emoji']
            if modo == 'treino':
                fl = await rt(pg, "V93F.el.bt.hidden")
                P.confere(fl, nome + ': no treino só o botão do emoji (as falas são das partidas, como antes)', fl)
            for tipo in tipos:
                await rt(pg, ZERA)
                x0, y0 = await rt(pg, CENTRO % BT[tipo])
                await segura(cdp, x0, y0); await asyncio.sleep(.36)
                await espera(pg, PRONTA, 3000, 30)            # (as peças no tamanho final: a entrada curta acabou)
                g = await rt(pg, GEO7)
                if tipo == 'emoji': await pg.screenshot(path=str(SAIDA / ('v107_gestos_%s.png' % arq)))
                X = g['est']['geo']['x'] if g['est']['geo'] else {'cx': x0, 'cy': y0 + 200}
                await anda(cdp, x0, y0, X['cx'], X['cy']); await solta(cdp, X['cx'], X['cy']); await asyncio.sleep(.25)
                e = await rt(pg, EST)
                ruins = problemas(g, tipo)
                med = (round(g['aro'][2] - g['aro'][0]) if g['aro'] else 0, round(g['x'][2] - g['x'][0]) if g['x'] else 0, min(round(r[2] - r[0]) for r in g['ops'] if r) if all(g['ops']) else 0)
                P.confere(bool(ok) and g['est']['fase'] == 'aberto' and g['est']['sel'] == 'meio' and not ruins and e['ultimo'] and e['ultimo'].get('cancelou'),
                          '%s, %s: o aro (%d px), o X (%d px) e a cruz (a menor opção com %d px) inteiros na tela e na área segura, sem cobrir controle, pausa, placar ou os outros botões'
                          % (nome, tipo.upper(), med[0], med[1], med[2]), [ruins, g['est']['geo'] and {k: g['est']['geo'][k] for k in ('aro', 'x')}, g['sa']])
                P.confere(med[1] >= 30 and med[2] >= 40, '   %s: o X com 30 px ou mais e as opções da cruz com 40 px ou mais' % tipo.upper(), med)
        finally:
            ERROS.extend(sem_rede(pg.erros)); await ctx.close()


# ---------------------------------------------------------------------------------------------------------------- 7) a cruz das frases e o COFRE
async def frases(P, pw, b):
    print('\n7) a cruz das frases: a gravação, a cópia da conta e o COFRE › EMOJI › FRASES')
    ctx, pg = await pagina(b, 1280, 720, toque=False)
    try:
        s = await rt(pg, "({f:RachaGestos107.frases(), t:RachaGestos107.textos(), p:RachaGestos107.padrao(), l:RachaGestos107.lugares(), chave:localStorage.getItem('racha-falas-v107'), todas:RachaGestos107.todas()})")
        P.confere(s['f'] == FRASES_PADRAO and s['t'] == ['Golaço!', 'Boa!', 'Passa!', 'Que defesa!', 'Foi mal!'] and s['p'] == FRASES_PADRAO and s['l'] == LUGARES and s['chave'] is None and len(s['todas']) == 8,
                  'o padrão da cruz das falas: Golaço! em cima, Boa! à esquerda, Passa! no meio, Que defesa! à direita e Foi mal! embaixo (das 8; nada gravado ainda)', s)
        r = await rt(pg, """(() => { window.__av = []; window.__solta7 = RachaGestos107.mudouFrases(f => window.__av.push(f));
          const a = RachaGestos107.poeFrase(2, 5); return {a, f:RachaGestos107.frases(), chave:JSON.parse(localStorage.getItem('racha-falas-v107')), av:window.__av.slice()}; })()""")
        P.confere(r['a'] == [0, 3, 5, 1, 4] and r['f'] == r['a'] and r['chave'] == {'v': 1, 's': r['a']} and r['av'] == [r['a']],
                  'poeFrase(meio, Obrigado!): o meio troca, grava em racha-falas-v107 e o mudouFrases avisa (uma vez, com os 5)', r)
        r = await rt(pg, "(() => { window.__av = []; const a = RachaGestos107.poeFrase(0, 3); return {a, av:window.__av.length}; })()")
        P.confere(r['a'] == [3, 0, 5, 1, 4] and r['av'] == 1, 'a frase que já estava em outro lugar troca com ele (sem repetir)', r)
        r = await rt(pg, """(() => { window.__av = []; const v = [RachaGestos107.poeFrase(5, 1), RachaGestos107.poeFrase(-1, 1), RachaGestos107.poeFrase(1, 8), RachaGestos107.poeFrase(1, 'a'), RachaGestos107.poeFrase(1, null)];
          return {v, f:RachaGestos107.frases(), av:window.__av.length}; })()""")
        P.confere(r['v'] == [None]*5 and r['f'] == [3, 0, 5, 1, 4] and r['av'] == 0, 'o que não vale (lugar fora de 0 a 4, frase fora das 8) não muda nada e não avisa', r)
        cp = await rt(pg, "({chaves:window.RACHA82 ? RACHA82.chaves.slice() : null, copia:window.RACHA82 ? RACHA82.copia() : null})")
        inicio = (RAIZ / 'tools' / 'v82' / 'inicio.js').read_text(encoding='utf-8')
        contrato = (RAIZ / 'app' / 'contracts' / 'progresso.ts').read_text(encoding='utf-8')
        no_contrato = '"racha-falas-v107"' in contrato.split('PROGRESSO_CHAVES', 1)[1].split('] as const', 1)[0]
        no_inicio = "'racha-falas-v107'" in inicio.split('var CHAVES', 1)[1].split('];', 1)[0]
        P.confere(cp['chaves'] and 'racha-falas-v107' in cp['chaves'] and cp['copia'].get('racha-falas-v107') == json.dumps({'v': 1, 's': [3, 0, 5, 1, 4]}, separators=(',', ':')) and no_inicio and no_contrato
                  and 'racha-falas-v1' not in cp['chaves'],
                  'a chave vai na cópia do progresso da conta (tools/v82/inicio.js: RACHA82.chaves e a cópia; app/contracts/progresso.ts: PROGRESSO_CHAVES); o BALÕES LIGADOS/DESLIGADOS fica no aparelho', [cp['chaves'], no_inicio, no_contrato])
        await pg.reload(); await pg.wait_for_function('() => typeof window.__RT === "function"', timeout=30000); await pg.wait_for_timeout(500)
        P.confere(await rt(pg, "RachaGestos107.frases()") == [3, 0, 5, 1, 4], 'abrindo o jogo de novo, as 5 continuam', await rt(pg, "RachaGestos107.frases()"))
        await rt(pg, "localStorage.setItem('racha-falas-v107', JSON.stringify({v:1, s:[3, 3, 99, 'x']}))")
        await pg.reload(); await pg.wait_for_function('() => typeof window.__RT === "function"', timeout=30000); await pg.wait_for_timeout(500)
        f = await rt(pg, "RachaGestos107.frases()")
        P.confere(f == [3, 0, 2, 1, 4], 'a chave estragada (repetida, fora das 8, faltando) volta arrumada: o que valia fica e o resto vem do padrão', f)
        await rt(pg, "localStorage.setItem('racha-falas-v107', '{isto não é json')")
        await pg.reload(); await pg.wait_for_function('() => typeof window.__RT === "function"', timeout=30000); await pg.wait_for_timeout(500)
        P.confere(await rt(pg, "RachaGestos107.frases()") == FRASES_PADRAO, '   e sem JSON nenhum: o padrão', await rt(pg, "RachaGestos107.frases()"))
    finally:
        ERROS.extend(sem_rede(pg.erros)); await ctx.close()

    # o COFRE › EMOJI: a troca EMOJIS | FRASES e a cruz das frases (o clique de verdade)
    B, pg, erros = await abre(pw, 1280, 720)
    async def clica(k):
        sel = '#tela-cofre [data-k=%s]' % json.dumps(k)
        await pg.locator(sel).first.scroll_into_view_if_needed(timeout=3000)
        await pg.click(sel, timeout=3000); await asyncio.sleep(.3)
    try:
        await rt(pg, "(() => { abreTela('cofre'); RachaCofre106.vai('emoji'); return 1; })()"); await asyncio.sleep(.4)
        t = await rt(pg, """(() => { const T = document.getElementById('tela-cofre'), n = T.querySelector('.ges107-cf-troca');
          return {troca:n ? [...n.querySelectorAll('.cf106-sub-bt')].map(b => [b.textContent, b.getAttribute('aria-selected'), b.getAttribute('role')]) : null, lista:n && n.getAttribute('role'),
            emo:T.querySelectorAll('.cf106-grade-emo .cf106-card').length, lugares:T.querySelectorAll('.cf106-lugar[data-k^="lugar:"]').length}; })()""")
        P.confere(t['troca'] == [['EMOJIS', 'true', 'tab'], ['FRASES', 'false', 'tab']] and t['lista'] == 'tablist' and t['emo'] == 20 and t['lugares'] == 5,
                  'COFRE › EMOJI: a troca EMOJIS | FRASES em cima (EMOJIS acesa: a cruz e a grade dos 20 emojis de sempre)', t)
        await clica('emo-modo:frases')
        ESTF = """(() => { const T = document.getElementById('tela-cofre');
          return {modo:RachaGestos107.cofre(), troca:[...T.querySelectorAll('.ges107-cf-troca .cf106-sub-bt')].map(b => b.getAttribute('aria-selected')),
            lugares:[...T.querySelectorAll('.cf106-lugar[data-k^="lugar-frase:"]')].map(b => [b.textContent, b.getAttribute('aria-pressed')]), cartas:[...T.querySelectorAll('.ges107-cf-grade .cf106-card-bt')].map(b => b.dataset.k),
            checks:[...T.querySelectorAll('.ges107-cf-grade .cf106-card')].filter(c => c.querySelector(':scope > .cf106-check')).map(c => c.querySelector('.cf106-card-bt').dataset.k),
            topo:(T.querySelector('.cf106-topo-bt') || {}).textContent, placa:(T.querySelector('.cf106-placa b') || {}).textContent, emo:T.querySelectorAll('.cf106-grade-emo').length,
            aria:(T.querySelector('[data-k="frase:7"]') || {getAttribute:() => ''}).getAttribute('aria-label')}; })()"""
        f0 = await rt(pg, ESTF)
        todas = await rt(pg, "RachaGestos107.todas()")
        P.confere(f0['modo'] == 'frases' and f0['troca'] == ['false', 'true'] and [l[0] for l in f0['lugares']] == ['Golaço!', 'Boa!', 'Passa!', 'Que defesa!', 'Foi mal!'] and f0['lugares'][2][1] == 'true'
                  and f0['cartas'] == ['frase:%d' % i for i in range(8)] and sorted(f0['checks']) == sorted('frase:%d' % i for i in FRASES_PADRAO) and f0['topo'] == 'PADRÃO' and f0['emo'] == 0 and 'MEIO' in f0['placa'],
                  'FRASES: a cruz das 5 frases (o meio aceso), a grade das 8 (o check nas 5 da cruz) e o PADRÃO', f0)
        await clica('lugar-frase:4')
        f1 = await rt(pg, ESTF)
        await clica('frase:7')
        f2 = await rt(pg, ESTF)
        P.confere(f1['lugares'][4][1] == 'true' and 'BAIXO' in f1['placa'] and 'baixo' in f1['aria'], 'tocar num lugar acende o lugar (o de baixo) e a placa diz qual', [f1['lugares'], f1['placa']])
        P.confere(await rt(pg, "RachaGestos107.frases()") == [0, 3, 2, 1, 7] and f2['lugares'][4][0] == 'Minha culpa!' and 'frase:7' in f2['checks'] and 'frase:4' not in f2['checks']
                  and json.loads(await rt(pg, "localStorage.getItem('racha-falas-v107')")) == {'v': 1, 's': [0, 3, 2, 1, 7]},
                  'tocar numa frase da grade põe ela no lugar aceso (Minha culpa! embaixo), grava e a cruz se refaz', [f2['lugares'], f2['checks']])
        await rt(pg, "(() => { RachaCofre106.vai('emoji'); return 1; })()"); await asyncio.sleep(.3)
        for (w, h, ins) in ((1280, 720, None),):
            m = await rt(pg, CABE + "({t:0,r:0,b:0,l:0})")
            prob = {k: m[k] for k in ('fora', 'cortadas', 'rolam', 'ladoCorta', 'cobertos') if m[k]}
            if m['sobre']: prob['sobre'] = m['sobre']
            if m['vistos'] and m['tocaveis'] < m['vistos']: prob['tocaveis'] = '%d/%d' % (m['tocaveis'], m['vistos'])
            P.confere(not prob and m['ladoPx'] >= 26 and m['cartaPx'] >= 40, 'o COFRE em FRASES (%d × %d): nada fora da tela, a página sem rolar, nada em cima de nada e tudo tocável (o lugar com %d px)' % (w, h, m['ladoPx']), prob or m)
        await pg.screenshot(path=str(SAIDA / 'v107_gestos_cofre_frases_1280x720.png'))
        await clica('topo:padrao-frases')
        P.confere(await rt(pg, "RachaGestos107.frases()") == FRASES_PADRAO and (await rt(pg, ESTF))['lugares'][4][0] == 'Foi mal!', 'o PADRÃO volta as 5 frases de fábrica', await rt(pg, "RachaGestos107.frases()"))
        # a de cima vira Obrigado! no COFRE e a partida usa: o arrasto para cima manda o Obrigado!
        await clica('lugar-frase:0'); await clica('frase:5')
        await clica('emo-modo:emojis')
        e = await rt(pg, "({modo:RachaGestos107.cofre(), emo:document.querySelectorAll('#tela-cofre .cf106-grade-emo .cf106-card').length})")
        P.confere(e == {'modo': 'emojis', 'emo': 20}, 'EMOJIS de novo: a grade dos emojis de sempre', e)
        js = [x for x in erros if 'Failed to load resource' not in x]
        P.confere(not js, '   sem erro de JavaScript no COFRE', js[:3])
    finally:
        await B.close()

    # a partida com a frase escolhida no COFRE (outra página: a chave gravada)
    ctx, pg = await pagina(b, 844, 390, ins=IPHONE, toque=True, armazenamento={'racha-falas-v107': json.dumps({'v': 1, 's': [5, 3, 2, 1, 4]})})
    cdp = await ctx.new_cdp_session(pg)
    try:
        await comeca(pg); await rt(pg, PARA); await rt(pg, ZERA)
        g, e = await gesto(pg, cdp, 'falas', 0, -26)
        bal = await rt(pg, BALOES)
        P.confere(g['valores'][0] == '5' and 'Obrigado!' in g['rotulos'][0] and e['ultimo']['lugar'] == 'cima' and e['ultimo']['valor'] == 5 and 'eu:5' in bal['falas'],
                  'na partida, o arrasto para cima no botão das falas manda a frase escolhida no COFRE (Obrigado!)', [g['rotulos'][0], e['ultimo'], bal])
    finally:
        ERROS.extend(sem_rede(pg.erros)); await ctx.close()

    # o COFRE em FRASES nos tamanhos pequenos (e no iPhone com o entalhe)
    from v106_cofre_test import abre_ins
    for w, h, ins in ((844, 390, None), (568, 320, None), (844, 390, IPHONE)):
        if ins: B, pg, erros = await abre_ins(pw, w, h, ins)
        else: B, pg, erros = await abre(pw, w, h)
        try:
            await rt(pg, "(() => { abreTela('cofre'); RachaCofre106.vai('emoji'); RachaGestos107.cofre('frases'); return 1; })()"); await asyncio.sleep(.5)
            await espera(pg, TELA_PRONTA, 5000, 50); await asyncio.sleep(.2)
            sa = {'t': ins['top'], 'r': ins['right'], 'b': ins['bottom'], 'l': ins['left']} if ins else {'t': 0, 'r': 0, 'b': 0, 'l': 0}
            m = await rt(pg, CABE + '(%s)' % json.dumps(sa))
            prob = {k: m[k] for k in ('fora', 'cortadas', 'rolam', 'ladoCorta', 'cobertos') if m[k]}
            if m['sobre']: prob['sobre'] = m['sobre']
            if m['vistos'] and m['tocaveis'] < m['vistos']: prob['tocaveis'] = '%d/%d' % (m['tocaveis'], m['vistos'])
            cabe = await rt(pg, """(() => { const T = document.getElementById('tela-cofre'), ruins = [];
              for (const b of T.querySelectorAll('.cf106-lugar[data-k^="lugar-frase:"], .ges107-cf-balao')){ const s = b.querySelector('.ges107-cf-tx, b'); if (s && (s.scrollWidth > s.clientWidth + 1 || s.getBoundingClientRect().right > b.getBoundingClientRect().right + 1)) ruins.push(s.textContent); }
              return ruins; })()""")
            nome = '%d × %d%s' % (w, h, ' (iPhone com o entalhe)' if ins else '')
            P.confere(not prob and not cabe and m['ladoPx'] >= 26 and m['cartaPx'] >= 40, 'o COFRE em FRASES (%s): tudo cabe e é tocável, e cada frase cabe no lugar e no balão (o menor lugar com %d px)' % (nome, m['ladoPx']), [prob, cabe, m['ladoPx'], m['cartaPx']])
            if not ins: await pg.screenshot(path=str(SAIDA / ('v107_gestos_cofre_frases_%dx%d.png' % (w, h))))
            js = [x for x in erros if 'Failed to load resource' not in x]
            P.confere(not js, '   sem erro de JavaScript (%s)' % nome, js[:3])
        finally:
            await B.close()


# ---------------------------------------------------------------------------------------------------------------- 8) Reduzir animações
SEM_ANIM = """(() => { const E = GES107.el, cs = e => getComputedStyle(e);
  return [E.aro, E.x, E.fundo, E.chev[0], E.ops[0], E.ops[2]].map(e => [cs(e).animationName, cs(e).transitionDuration]); })()"""


async def calmo(P, b):
    print('\n8) Reduzir animações (o do sistema e o dos Ajustes)')
    for nome, mov, ajuste in (('o do sistema (prefers-reduced-motion)', 'reduce', False), ('o dos Ajustes (Reduzir animações)', None, True)):
        ctx, pg = await pagina(b, 844, 390, toque=True, movimento=mov)
        cdp = await ctx.new_cdp_session(pg)
        try:
            await comeca(pg); await rt(pg, PARA)
            if ajuste: await rt(pg, "(() => { CONTA.menosAnim = true; CONTA.menosAnimEscolha = true; v70AplicaCalmo(); return 1; })()")
            x0, y0 = await rt(pg, CENTRO % 'EMO106.el.bt')
            await segura(cdp, x0, y0); await asyncio.sleep(.36)
            s = await rt(pg, SEM_ANIM)
            e = await rt(pg, EST)
            await toque(cdp, 'touchCancel', []); await asyncio.sleep(.2)
            curtas = all(float(x.strip().rstrip('s') or 0) < .01 for _, t in s for x in t.split(','))   # (o jogo põe 0,00001 s em toda transição com o Reduzir animações)
            P.confere(e['fase'] == 'aberto' and all(a == 'none' for a, _ in s) and curtas, nome + ': o aro, o X e a cruz aparecem sem animação nem transição', s)
        finally:
            ERROS.extend(sem_rede(pg.erros)); await ctx.close()
    ctx, pg = await pagina(b, 844, 390, toque=True)
    cdp = await ctx.new_cdp_session(pg)
    try:
        await comeca(pg); await rt(pg, PARA)
        x0, y0 = await rt(pg, CENTRO % 'EMO106.el.bt')
        await segura(cdp, x0, y0); await asyncio.sleep(.36)
        s = await rt(pg, SEM_ANIM)
        await toque(cdp, 'touchCancel', []); await asyncio.sleep(.2)
        P.confere(s[0][0] != 'none' and s[4][0] != 'none', '   (e sem o Reduzir animações: as peças entram com a animação curta)', s)
    finally:
        ERROS.extend(sem_rede(pg.erros)); await ctx.close()


# ---------------------------------------------------------------------------------------------------------------- 9) online com duas sessões
JOGA = "NET49.playing && !NET49.host && NET49.localSlot >= 0 && NET49.lastTick > 0"


async def online(P, pw):
    print('\n9) online com duas sessões (o servidor da turma de verdade)')
    porta = porta_livre()
    srv = subprocess.Popen(['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria', '--estaticos', str(RAIZ),
                            '--nome', 'Teste v107', '--sem-p2p'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    time.sleep(.9)
    url = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
    A = Bp = None
    try:
        A = await sessao(pw, url, 'Ana', 844, 390); Bp = await sessao(pw, url, 'Beto')
        cdp = await A.context.new_cdp_session(A)
        for pg in (A, Bp):
            await rt(pg, "abreTela('amigos')")
        await espera(A, "!!NET49.id", 10000); await espera(Bp, "!!NET49.id", 10000)
        await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:0, jogo:'futebol', tempo:0, bots:false, nome:'v107'}); sxCriar(); return 1; })()")
        cod = await espera(A, "NET49.room && NET49.room.code", 8000)
        await rt(Bp, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
        await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
        await rt(A, "(() => { const b = document.querySelector('.v70-sl-atalhos .entrar'); if (b) b.click(); return 1; })()")
        await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 8000)
        await rt(A, "slIniciar()")
        ok = await espera(A, JOGA, 12000) and await espera(Bp, JOGA, 12000)
        for pg in (A, Bp):
            await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
        pode = await espera(A, "RachaEmotes106.estado().pode && v93FalaPode() && !EMO106.el.bt.hidden && !V93F.el.bt.hidden && !!EMO106.lugar", 8000)
        P.confere(bool(ok and pode), 'a sala 1v1 no servidor: os dois jogando, com os dois botões', [await rt(A, "NET49.room && NET49.room.state"), pode])
        await asyncio.sleep(.5)
        idA = await rt(A, "NET49.id")
        slots = await rt(A, "RachaEmotes106.slots()"); frasesA = await rt(A, "RachaGestos107.frases()")
        await rt(A, "(() => { window.__env = []; const ws = NET49.ws, s0 = ws.send.bind(ws); ws.send = t => { try { const m = JSON.parse(t); if (m.type === 'emote' || m.type === 'fala') window.__env.push(m); } catch (_) {} return s0(t); }; return 1; })()")
        n0 = await rt(Bp, "EMO106.recebidos")
        g, e = await gesto(A, cdp, 'emoji', 42, 0, foto='v107_gestos_online_844x390.png')
        chegou = await espera(Bp, "EMO106.recebidos > %d && (EMO106.desenhados || []).length > 0" % n0, 5000, 50)
        vb = await rt(Bp, "(() => { const d = (EMO106.desenhados || [])[0]; return d ? {k:d.k, e:d.e} : null; })()")
        env = await rt(A, "window.__env")
        P.confere(e['ultimo']['ok'] and {'type': 'emote', 'e': slots[3]} in env and bool(chegou) and vb == {'k': idA, 'e': slots[3]},
                  'a Ana arrasta o emoji para a direita: vai pelo servidor (emote) e o Beto vê o %s em cima da tampinha dela' % slots[3].upper(), [e['ultimo'], env, vb])
        await asyncio.sleep(.3)
        g, e = await gesto(A, cdp, 'falas', 0, -26)
        fala = await espera(Bp, "(() => { const b = V93F.baloes.get(%s); return b ? b.i + 1 : 0; })()" % json.dumps(idA), 5000, 50)
        env = await rt(A, "window.__env")
        P.confere(e['ultimo']['ok'] and {'type': 'fala', 'i': frasesA[0]} in env and fala == frasesA[0] + 1,
                  'a Ana arrasta as falas para cima: vai pelo servidor (fala) e o Beto vê o balão da frase dela (%s)' % (await rt(A, "RachaGestos107.textos()[0]")), [e['ultimo'], env, fala])
        # os emojis dos outros desligados no Beto: o da Ana chega e não aparece
        await rt(Bp, "(() => { EMO106.outros = false; emo106GravaOutros(); EMO106.baloes.clear(); return 1; })()")
        await asyncio.sleep(1.2)
        n1 = await rt(Bp, "EMO106.recebidos")
        g, e = await gesto(A, cdp, 'emoji', -42, 0)
        chegou2 = await espera(Bp, "EMO106.recebidos > %d" % n1, 5000, 50)
        await asyncio.sleep(.25)
        dB = await rt(Bp, "RachaEmotes106.estado().desenhados.length")
        await rt(Bp, "(() => { EMO106.outros = true; emo106GravaOutros(); return 1; })()")
        P.confere(e['ultimo']['ok'] and bool(chegou2) and dB == 0, 'com "Emojis dos outros" desligado no Beto, o emoji arrastado pela Ana chega e não aparece', [e['ultimo'], chegou2, dB])
        # a barra da sala no celular: as peças do gesto não encostam nela
        await asyncio.sleep(1.6)
        x0, y0 = await rt(A, CENTRO % 'EMO106.el.bt')
        await segura(cdp, x0, y0); await asyncio.sleep(.36)
        g = await rt(A, GEO7)
        await toque(cdp, 'touchCancel', []); await asyncio.sleep(.2)
        ruins = problemas(g, 'emoji')
        P.confere(g['barra'] and g['est']['fase'] == 'aberto' and not ruins, 'no celular, online: o aro, o X e a cruz longe da barra da sala, dos controles, da pausa e do placar', [ruins, g['barra']])
        er = [x for pg in (A, Bp) for x in sem_rede(pg.erros)]
        P.confere(not er, '   nenhum erro de JavaScript (online)', er[:3])
    finally:
        for pg in (A, Bp):
            if pg:
                try: await pg.b.close()
                except Exception: pass
        srv.terminate()
        try: srv.wait(timeout=5)
        except Exception: srv.kill()


def parte(n):
    """--so 3,5 roda só as partes 3 e 5 (para conferir uma parte depois de mexer nela)"""
    so = next((a.split('=', 1)[1] if '=' in a else (sys.argv[sys.argv.index(a) + 1] if sys.argv.index(a) + 1 < len(sys.argv) else '') for a in sys.argv if a.startswith('--so')), None)
    return so is None or str(n) in so.split(',')


async def principal():
    P = Placar('v107 · os gestos do emoji e das falas')
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        try:
            for n, f in ((1, cinco), (2, cancela), (3, dois_dedos), (4, mouse), (5, ritmo), (6, tamanhos)):
                if parte(n): await f(P, b)
            if parte(7): await frases(P, pw, b)
            if parte(8): await calmo(P, b)
        finally:
            await b.close()
        if '--sem-online' not in sys.argv and parte(9):
            await online(P, pw)
    P.confere(not ERROS, 'nenhum erro de JavaScript (os gestos, o COFRE, os tamanhos e o Reduzir animações)', ERROS[:4])
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
