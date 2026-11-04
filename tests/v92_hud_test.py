"""RACHA v92 · FASE 1 — O EDITOR DOS CONTROLES NO CELULAR, COM TOQUES DE VERDADE (passa/falha, com as medidas impressas).
O Chromium faz de conta que é um celular deitado (tela pequena e densa, toque, o navegador do celular) e os toques chegam pelo
mesmo caminho de um dedo (CDP Input.dispatchTouchEvent → touchstart/pointerdown, vários dedos ao mesmo tempo). Em três
celulares (iPhone 844 × 390, Android 915 × 412 e um pequeno 667 × 375) confere, com o dedo:
  1. abrir pela pausa (o botão de pausa e o EDITAR CONTROLES tocados): a barra compacta aparece, fora do meio da tela;
  2. tocar em cada controle escolhe ele, e a barra nunca fica em cima do escolhido;
  3. EDIÇÃO LIVRE: o PASSE arrastado para o meio de baixo (onde ficava o painel) fica exatamente onde o dedo soltou; durante o
     arrasto a barra sai da frente (transparente e sem pegar toque);
  4. encostar um no outro não empurra mais: o contorno avisa e o ARRUMAR resolve;
  5. DESFAZER e REFAZER pelos botões da barra (cada gesto um passo);
  6. o TAMANHO pelo deslizante (a prévia muda enquanto o dedo arrasta), a OPACIDADE 0% e a PINÇA com dois dedos;
  7. RESTAURAR ESTE CONTROLE: só ele volta; SALVAR guarda no layout e no aparelho;
  8. 0% de opacidade: na partida o CHUTE não aparece (os pixels são os do campo) e o toque no lugar dele chuta;
  9. os LAYOUTS: novo com nome (digitado), molde, trocar no editor e na PAUSA, renomear, excluir;
 10. o SALVAMENTO AUTOMÁTICO: a página fecha no meio da edição (recarregar) → no menu, MUDANÇAS NÃO SALVAS (CONTINUAR
     EDITANDO volta com as posições; SAIR SEM SALVAR desfaz; SALVAR ASSIM guarda) — e o Esc não joga as mudanças fora;
 11. o MODO TESTE no treino (o jogo anda com os controles não salvos: o analógico anda e o CHUTE no lugar novo chuta) e numa
     partida (só o toque é mostrado: a partida não anda e nada vira comando);
 12. a ÁREA SEGURA (o notch e a barra de gestos do iPhone: a barra fica dentro) e a TELA GIRANDO (em pé e de volta: o editor
     e as mudanças continuam).
E, com a plataforma de mentira (tests/plataforma82_falsa.mjs, as regras de app/contracts/progresso.ts):
 13. NA CONTA: o aparelho A salva um layout → ele sobe com o progresso; o aparelho B (um navegador novo = o cache limpo)
     entra na mesma conta e recebe o layout já valendo; os dois mexendo ao mesmo tempo, as listas se juntam.
E, com o servidor da turma de verdade (tests/servidor_visitantes.cjs) e dois navegadores numa sala 1v1:
 14. ONLINE: o editor e o modo teste no meio da partida não mandam nada para a sala (só comandos parados, os contadores de
     toque não andam) e a tampinha fica parada no servidor.
O que isto NÃO prova: o vidro de um celular de verdade (Safari no iPhone e Chrome no Android), a área segura de verdade do
iOS (aqui ela é imitada) e a plataforma de verdade com o MySQL (a mesma regra está no contrato testado).
Uso: python3 tests/v92_hud_test.py [--sem-conta] [--sem-online] [--sem-celular] [--so iPhone]"""
import asyncio, json, math, os, sys, time
from comum import Placar, rt, async_playwright, RAIZ, CHROME, HARNESS, FONTES, PAGINA

UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'
CELULARES = {'iPhone': (844, 390, 3, UA_IPHONE), 'Android': (915, 412, 2.625, UA_ANDROID), 'pequeno': (667, 375, 2, UA_IPHONE)}
SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)

GEO = r"""(() => {
  const c = cv.getBoundingClientRect(), k = c.width/W, wr = document.getElementById('wrap').getBoundingClientRect();
  const ctl = {}; for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id); ctl[id] = {x:c.left + e.x*k, y:c.top + e.y*k, r:e.r*k}; }
  const R = n => { if (!n || n.hidden || n.closest('[hidden]') || !n.getClientRects().length) return null; const r = n.getBoundingClientRect(); return {x:r.left, y:r.top, w:r.width, h:r.height}; };
  const p = BTN_PAUSA;
  return {k, cv:[c.left, c.top, c.width, c.height], wrap:[wr.left, wr.top, wr.width, wr.height], vw:innerWidth, vh:innerHeight, ctl, sel,
    barra:R(HE.el.barra), mini:R(HE.el.mini), teste:R(HE.el.teste), pop:R(HE.el.pop), aviso:R(HE.el.aviso),
    pausa:{x:c.left + (p.x + p.w/2)*k, y:c.top + (p.y + p.h/2)*k}, editing, aberto:HE.aberto, arrastando:ui.painel.classList.contains('he-arrastando')};
})()"""
# o centro de um elemento (para o dedo)
CENTRO = "(n => { if (!n || !n.getClientRects().length) return null; const r = n.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; })"
ESTADO = "(k => { const e = hud[k]; return {x:+e.x.toFixed(2), y:+e.y.toFixed(2), s:+e.s.toFixed(3), a:+e.a.toFixed(3)}; })"
CONFLITOS = "hudConflitos(HUDM.atual).filter(c => controleVisivel(c.a) && (!c.b || controleVisivel(c.b))).length"
# conta os chutes que saem (de novo a cada página: depois de recarregar, o contador some com ela)
CONTA_CHUTES = "(() => { window.__nk = []; if (!window.__dkw){ window.__dkw = 1; const dk = doKick; doKick = function(power){ const ok = dk.apply(this, arguments); if (ok) window.__nk.push(!!power); return ok; }; } return 1; })()"


class Dedos:
    """os dedos na tela (CDP): cada evento manda todos os dedos que estão encostados, como o navegador do celular recebe"""
    def __init__(self, cdp):
        self.cdp, self.vivos = cdp, {}

    async def _manda(self, tipo):
        pts = [{'x': x, 'y': y, 'id': i, 'radiusX': 9, 'radiusY': 9, 'force': 1} for i, (x, y) in self.vivos.items()]
        await self.cdp.send('Input.dispatchTouchEvent', {'type': tipo, 'touchPoints': pts})

    async def poe(self, i, x, y):
        self.vivos[i] = (x, y); await self._manda('touchStart')

    async def move(self, i, x, y):
        self.vivos[i] = (x, y); await self._manda('touchMove')

    async def tira(self, i):
        x, y = self.vivos.pop(i)
        await self.cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': [{'x': x, 'y': y, 'id': i, 'radiusX': 9, 'radiusY': 9, 'force': 1}]})

    async def toca(self, x, y, ms=60):
        await self.poe(9, x, y); await asyncio.sleep(ms / 1000); await self.tira(9)

    async def arrasta(self, x0, y0, x1, y1, passos=14, ms=16, solta=True, i=8):
        await self.poe(i, x0, y0)
        for k in range(1, passos + 1):
            await self.move(i, x0 + (x1 - x0) * k / passos, y0 + (y1 - y0) * k / passos)
            await asyncio.sleep(ms / 1000)
        if solta:
            await self.tira(i)


def cobre(R, c, folga=0):
    """o retângulo R (x, y, w, h) encosta no círculo c (x, y, r)?"""
    if not R or not c:
        return False
    nx = max(R['x'], min(R['x'] + R['w'], c['x'])); ny = max(R['y'], min(R['y'] + R['h'], c['y']))
    return math.hypot(c['x'] - nx, c['y'] - ny) < c['r'] - folga


def dentro(R, x0, y0, x1, y1, f=1):
    return R and R['x'] >= x0 - f and R['y'] >= y0 - f and R['x'] + R['w'] <= x1 + f and R['y'] + R['h'] <= y1 + f


async def abre_cel(pw, cel, pagina=None):
    w, h, dsf, ua = CELULARES[cel]
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dsf, has_touch=True, is_mobile=True, user_agent=ua)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script('window.RACHA_CONFIG = %s;' % json.dumps({'presente': False}))
    pg = await ctx.new_page()
    erros = []
    pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
    pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    await pg.goto((pagina or PAGINA).resolve().as_uri())
    await pronto(pg)
    cdp = await ctx.new_cdp_session(pg)
    return b, ctx, pg, Dedos(cdp), cdp, erros


async def pronto(pg):
    """o jogo abriu (de novo): a primeira vez e o login saem da frente, como quem já joga"""
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=30000)
    await pg.wait_for_timeout(500)
    await pg.evaluate("(() => { const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); })()")
    await pg.wait_for_timeout(150)
    await rt(pg, HARNESS)
    await rt(pg, """(() => { try { if (ONB.aberto) onbFim(); } catch (_) {} const o = document.getElementById('onb'); if (o) o.hidden = true;
      for (const k of ['v59', 'v61', 'v46']) if (CONTA.presentes.indexOf(k) < 0) CONTA.presentes.push(k); CONTA.onb = true; CONTA.niveis.length = 0; contaSalvar();
      return 1; })()""")


async def espera(pg, js, ms=6000, passo=80):
    t0 = time.time(); v = None
    while (time.time() - t0) * 1000 < ms:
        try:
            v = await rt(pg, js)
        except Exception:
            v = None
        if v:
            return v
        await asyncio.sleep(passo / 1000)
    return v


async def geo(pg):
    return await rt(pg, GEO)


async def toca_el(pg, d, expr):
    """toca com o dedo no centro de um elemento (expr: uma expressão no script do jogo que devolve o elemento, ou '#id')"""
    if expr.startswith('#'):
        expr = 'document.querySelector(%s)' % json.dumps(expr)
    await rt(pg, "((n) => { if (n && n.scrollIntoView && n.closest('.he-pop')) n.scrollIntoView({block:'nearest'}); return 1; })(%s)" % expr)   # (na caixinha que rola)
    c = None
    for _ in range(25):                                          # (a barra pode estar deslizando para o lugar novo: espera parar)
        c2 = await rt(pg, CENTRO + '(%s)' % expr)
        if c2 and c and abs(c2[0] - c[0]) < .5 and abs(c2[1] - c[1]) < .5:
            break
        c = c2
        await asyncio.sleep(0.06)
    if not c:
        return False
    await d.toca(c[0], c[1]); await asyncio.sleep(0.12)
    return True


async def entra_treino(pg):
    await rt(pg, "(() => { if (!lobby.aberto) abrirLobby(); jogar(); return 1; })()")
    await espera(pg, "!lobby.aberto")
    await asyncio.sleep(0.5)
    await rt(pg, "(() => { try { if (typeof trUiFecha === 'function') trUiFecha(); } catch (_) {} return 1; })()")


async def abre_editor_pela_pausa(pg, d):
    g = await geo(pg)
    await d.toca(g['pausa']['x'], g['pausa']['y'])
    await espera(pg, "PAUSA.aberta", 2000)
    await asyncio.sleep(0.45)                                   # (o clique fantasma da pausa: 400 ms)
    await toca_el(pg, d, '#pa-hud')
    return await espera(pg, "HE.aberto && editing && !HE.el.barra.hidden", 3000)


# ------------------------------------------------------------------------------------------------ 1–12: num celular
async def celular(P, pw, cel, M):
    b, ctx, pg, d, cdp, erros = await abre_cel(pw, cel)
    print('\n· %s (%d × %d)' % (cel, CELULARES[cel][0], CELULARES[cel][1]))
    try:
        await rt(pg, "localStorage.removeItem('racha-hud-barra-v1'); HE.barra.px = HE.barra.py = null; HE.barra.recolhida = false; 1")
        await entra_treino(pg)
        # 1) abrir pela pausa
        ok = await abre_editor_pela_pausa(pg, d)
        g = await geo(pg)
        await pg.screenshot(path=str(SAIDA / ('hud92_%s_editor.png' % cel)))
        P.confere(ok and g['barra'], '%s: a pausa › EDITAR CONTROLES (com o dedo) abre o editor com a barra' % cel, g.get('barra'))
        B = g['barra']; vw, vh = g['vw'], g['vh']
        meio = B and (B['x'] < vw / 2 < B['x'] + B['w'] and B['y'] < vh / 2 < B['y'] + B['h'])
        area = B and B['w'] * B['h'] / (vw * vh)
        P.confere(B and not meio and area < .3 and (B['y'] + B['h'] / 2 < vh * .3 or B['y'] + B['h'] / 2 > vh * .7),
                  '%s: a barra fica na beira (em cima ou embaixo), fora do meio da tela (%.0f%% da tela)' % (cel, (area or 0) * 100), B)
        M[cel] = {'barra': B and [round(B['x']), round(B['y']), round(B['w']), round(B['h'])], 'tela': [vw, vh]}
        # 2) tocar em cada controle: escolhe, e a barra não fica em cima dele
        ruins = []
        for k, c in g['ctl'].items():
            await d.toca(c['x'], c['y']); await asyncio.sleep(0.35)
            g2 = await geo(pg)
            if g2['sel'] != k or cobre(g2['barra'], g2['ctl'][k]):
                ruins.append([k, g2['sel'], g2['barra']])
        P.confere(not ruins and len(g['ctl']) >= 3, '%s: tocar em cada um dos %d controles escolhe ele, e a barra nunca fica em cima do escolhido' % (cel, len(g['ctl'])), ruins)
        # 3) edição livre: o PASSE para o meio de baixo, onde ficava o painel antigo
        g = await geo(pg)
        k0 = g['ctl']['kick']
        alvo = (g['cv'][0] + g['cv'][2] * .52, g['cv'][1] + g['cv'][3] * .66)
        await d.arrasta(k0['x'], k0['y'], alvo[0], alvo[1], solta=False)
        durante = await geo(pg)
        await d.tira(8); await asyncio.sleep(0.4)
        depois = await geo(pg)
        e = await rt(pg, ESTADO + "('kick')")
        esperado = ((alvo[0] - g['cv'][0]) / g['k'], (alvo[1] - g['cv'][1]) / g['k'])
        erro = math.hypot(e['x'] - esperado[0], e['y'] - esperado[1])
        P.confere(durante['arrastando'], '%s: durante o arrasto a barra sai da frente (transparente, sem pegar o toque)' % cel)
        P.confere(erro < 1.5, '%s: o PASSE ficou exatamente onde o dedo soltou, no meio de baixo (%.1f px da tela virtual de diferença)' % (cel, erro), [e, esperado])
        P.confere(not cobre(depois['barra'], depois['ctl']['kick']) and not depois['arrastando'], '%s: solto, a barra não cobre o PASSE no lugar novo' % cel, depois['barra'])
        # 4) encostar não empurra: o aviso e o ARRUMAR
        g = await geo(pg)
        p0 = g['ctl']['power']; kk = g['ctl']['kick']
        await d.arrasta(p0['x'], p0['y'], kk['x'] + kk['r'] * .9, kk['y'])
        await asyncio.sleep(0.4)
        e_drop = await rt(pg, ESTADO + "('power')")
        av = await rt(pg, "({vis:!HE.el.aviso.hidden, ruim:HE.el.aviso.classList.contains('ruim'), bt:!HE.el.avisoBt.hidden && HE.el.avisoBt.textContent, tx:HE.el.avisoTx.textContent, n:%s})" % CONFLITOS)
        P.confere(av['vis'] and av['ruim'] and av['bt'] == 'ARRUMAR' and av['n'] > 0, '%s: soltar o CHUTE encostado no PASSE: ele fica lá e a barra avisa (%s)' % (cel, av['tx'][:46]), av)
        await toca_el(pg, d, HE_AVISO_BT)
        await asyncio.sleep(0.3)
        n_dep = await rt(pg, CONFLITOS)
        P.confere(n_dep == 0, '%s: ARRUMAR (com o dedo) afasta os encostados' % cel, n_dep)
        # 5) desfazer e refazer pelos botões
        await toca_el(pg, d, HE_DESFAZ); e1 = await rt(pg, ESTADO + "('power')")
        await toca_el(pg, d, HE_DESFAZ); e2 = await rt(pg, ESTADO + "('power')"); k2 = await rt(pg, ESTADO + "('kick')")
        await toca_el(pg, d, HE_REFAZ); e3 = await rt(pg, ESTADO + "('power')")
        P.confere(abs(e1['x'] - e_drop['x']) < .01 and abs(e1['y'] - e_drop['y']) < .01, '%s: ↶ desfaz o ARRUMAR (o CHUTE volta para onde foi solto)' % cel, [e1, e_drop])
        P.confere(abs(e2['x'] - (p0['x'] - g['cv'][0]) / g['k']) < 1 and abs(k2['x'] - e['x']) < .01, '%s: ↶ de novo desfaz só o arrasto do CHUTE (o PASSE continua no lugar novo)' % cel, [e2, k2])
        P.confere(abs(e3['x'] - e_drop['x']) < .01, '%s: ↷ refaz o arrasto' % cel, e3)
        # 6) o tamanho pelo deslizante, com a prévia na hora
        await rt(pg, "sel = 'power'; heSync(); heLayout(true); 1"); await asyncio.sleep(0.3)
        await toca_el(pg, d, HE_TAM); await asyncio.sleep(0.3)
        g = await geo(pg)
        P.confere(g['pop'] and not cobre(g['pop'], g['ctl']['power']) and not cobre(g['barra'], g['ctl']['power']),
                  '%s: a caixinha do TAMANHO abre sem cobrir o CHUTE (nem a barra)' % cel, [g['pop'], g['ctl']['power']])
        s0 = (await rt(pg, ESTADO + "('power')"))['s']
        th = await rt(pg, """(() => { const r = HE.el.pop.querySelector('input[type=range]'), b = r.getBoundingClientRect(), f = (r.value - r.min)/(r.max - r.min);
          return [b.left + 15 + (b.width - 30)*f, b.top + b.height/2, b.width]; })()""")
        await d.arrasta(th[0], th[1], th[0] + th[2] * .25, th[1], solta=False, passos=10)
        s_meio = (await rt(pg, ESTADO + "('power')"))['s']
        h_meio = await rt(pg, "HE.hist.length")
        await d.tira(8); await asyncio.sleep(0.2)
        s1 = (await rt(pg, ESTADO + "('power')"))['s']; h1 = await rt(pg, "[HE.hist.length, HE.hist.length ? HE.hist[HE.hist.length - 1].rotulo : '']")
        P.confere(s_meio > s0 + .05, '%s: arrastando o deslizante, o CHUTE cresce na hora (%d%% → %d%% com o dedo ainda no vidro)' % (cel, s0 * 100, s_meio * 100), [s0, s_meio])
        P.confere(h1[0] == h_meio + 1 and 'tamanho' in h1[1], '%s: soltar o deslizante vira um passo do desfazer ("%s")' % (cel, h1[1]), [h_meio, h1])
        # a opacidade: 0%
        await toca_el(pg, d, HE_OPA); await asyncio.sleep(0.25)
        await toca_el(pg, d, "(() => Array.from(HE.el.pop.querySelectorAll('button')).find(b => b.textContent.trim() === '0%'))()")
        a0 = (await rt(pg, ESTADO + "('power')"))['a']
        chip = await rt(pg, "HE.el.opaV.textContent")
        P.confere(a0 == 0 and chip == '0%', '%s: OPACIDADE 0%% (o botão rápido): o CHUTE fica invisível (a barra mostra %s)' % (cel, chip), [a0, chip])
        await rt(pg, "heFechaPop(); 1"); await asyncio.sleep(0.2)
        # a pinça com dois dedos em cima do CHUTE
        g = await geo(pg); c = g['ctl']['power']; sA = (await rt(pg, ESTADO + "('power')"))['s']
        await d.poe(1, c['x'] - 12, c['y']); await asyncio.sleep(0.05)
        await d.poe(2, c['x'] + 12, c['y']); await asyncio.sleep(0.05)
        for i in range(1, 9):
            await d.move(1, c['x'] - 12 - 3 * i, c['y']); await d.move(2, c['x'] + 12 + 3 * i, c['y']); await asyncio.sleep(0.016)
        await d.tira(2); await d.tira(1); await asyncio.sleep(0.25)
        sB = (await rt(pg, ESTADO + "('power')"))['s']; rot = await rt(pg, "HE.hist.length ? HE.hist[HE.hist.length - 1].rotulo : ''")
        P.confere(sB > sA + .1 and 'tamanho' in rot, '%s: a PINÇA (dois dedos abrindo em cima do CHUTE) aumenta o tamanho: %d%% → %d%%' % (cel, sA * 100, sB * 100), [sA, sB, rot])
        # 7) restaurar só um controle
        g = await geo(pg); kc = g['ctl']['kick']
        await d.toca(kc['x'], kc['y']); await asyncio.sleep(0.3)
        await toca_el(pg, d, HE_OPC); await asyncio.sleep(0.25)
        antesP = await rt(pg, ESTADO + "('power')")
        await toca_el(pg, d, "(() => Array.from(HE.el.pop.querySelectorAll('button')).find(b => /RESTAURAR ESTE/.test(b.textContent)))()")
        kR = await rt(pg, ESTADO + "('kick')"); pR = await rt(pg, ESTADO + "('power')"); padrao = await rt(pg, "({x:HUD_PADRAO.kick.x, y:HUD_PADRAO.kick.y, s:HUD_PADRAO.kick.s, a:HUD_PADRAO.kick.a})")
        P.confere(abs(kR['x'] - padrao['x']) < .01 and abs(kR['y'] - padrao['y']) < .01 and kR['s'] == padrao['s'] and pR == antesP,
                  '%s: RESTAURAR ESTE CONTROLE: só o PASSE volta ao padrão (o CHUTE fica grande e invisível)' % cel, [kR, padrao, pR, antesP])
        await rt(pg, "heFechaPop(); 1"); await asyncio.sleep(0.35)
        # SALVAR
        await toca_el(pg, d, '#hp-salvar'); await asyncio.sleep(0.3)
        sv = await rt(pg, """(() => { const st = JSON.parse(localStorage.getItem('racha-hud-layouts-v1')), L = st.lista.find(x => x.id === st.ativo), d = JSON.parse(localStorage.getItem('racha-treino-hud-v11'));
          return {aberto:HE.aberto, editing, a:L.estado.base.power.a, s:L.estado.base.power.s, kx:L.estado.base.kick.x, dA:d.hud.power.a, rasc:localStorage.getItem('racha-hud-rascunho-v1')}; })()""")
        P.confere(not sv['aberto'] and not sv['editing'] and sv['a'] == 0 and abs(sv['s'] - sB) < .001 and sv['dA'] == 0 and sv['rasc'] is None,
                  '%s: SALVAR (com o dedo) fecha o editor e guarda no layout e no aparelho (sem rascunho sobrando)' % cel, sv)
        # 8) 0%: invisível na partida, o toque continua valendo (três desenhos seguidos, no mesmo instante: com 0%, sem o CHUTE e com 100%)
        await asyncio.sleep(0.3)
        px = await rt(pg, """(() => { const k = K, e = hud.power, ex = e.x, ey = e.y, g = cv.getContext('2d');
          const S = () => { const out = []; for (const [dx, dy] of [[0, 0], [-40, -20], [40, 20], [-30, 35], [30, -35], [0, 50], [55, 0]]){ const p = g.getImageData(Math.round((ex + dx)*k), Math.round((ey + dy)*k), 1, 1).data; out.push([p[0], p[1], p[2]]); } return out; };
          render(0); const inv = S();
          e.x = W + 900; render(0); const sem = S(); e.x = ex;
          e.a = 1; render(0); const vis = S(); e.a = 0; render(0);
          return {inv, sem, vis}; })()""")
        dif = lambda A, Bv: max(max(abs(a[i] - b2[i]) for i in range(3)) for a, b2 in zip(A, Bv))
        P.confere(dif(px['inv'], px['sem']) <= 2 and dif(px['vis'], px['sem']) > 40,
                  '%s: na partida o CHUTE com 0%% não aparece (os pixels são os do campo sem ele: dif. %d; com 100%%: %d)' % (cel, dif(px['inv'], px['sem']), dif(px['vis'], px['sem'])), px)
        await rt(pg, CONTA_CHUTES + "; P.x = P.ax = CX; P.y = P.ay = CY; P.vx = P.vy = 0; B.x = CX + ALCANCE_CHUTE - U(.5); B.y = CY; B.vx = B.vy = 0; resetBotoes(); guardaAnterior(); 1")
        g = await geo(pg)
        await d.toca(g['ctl']['power']['x'], g['ctl']['power']['y'], ms=70); await asyncio.sleep(0.25)
        nk = await rt(pg, "window.__nk.slice()")
        P.confere(nk[:1] == [True], '%s: um toque no lugar do CHUTE invisível chuta (a área de toque continua)' % cel, nk)
        # 9) os layouts: novo com nome, molde, trocar (no editor e na pausa), renomear, excluir
        await abre_editor_pela_pausa(pg, d)
        await toca_el(pg, d, HE_LAY); await asyncio.sleep(0.25)
        await toca_el(pg, d, "(() => Array.from(HE.el.pop.querySelectorAll('button')).find(b => /NOVO/.test(b.textContent)))()"); await asyncio.sleep(0.25)
        await rt(pg, "(() => { const i = HE.el.pop.querySelector('input.he-nome'); i.value = ''; i.focus(); return 1; })()")
        await pg.keyboard.type('Canhoto Zé')
        await toca_el(pg, d, "(() => Array.from(HE.el.pop.querySelectorAll('button')).find(b => b.textContent.trim() === 'OK'))()"); await asyncio.sleep(0.2)
        await toca_el(pg, d, "(() => Array.from(HE.el.pop.querySelectorAll('button')).find(b => b.textContent.trim() === 'Canhoto'))()"); await asyncio.sleep(0.2)
        ly = await rt(pg, "({n:HE.store.lista.length, ativo:heAtivo().nome, joyDir:hud.joy.x > W/2, kickEsq:hud.kick.x < W/2, sujo:HE.sujo})")
        P.confere(ly['n'] == 2 and ly['ativo'] == 'Canhoto Zé' and ly['joyDir'] and ly['kickEsq'], '%s: LAYOUTS › NOVO "Canhoto Zé" (digitado) e o molde Canhoto: o analógico vai para a direita' % cel, ly)
        await pg.screenshot(path=str(SAIDA / ('hud92_%s_layouts.png' % cel)))
        await toca_el(pg, d, '#hp-salvar'); await asyncio.sleep(0.25)
        await abre_editor_pela_pausa(pg, d)
        await toca_el(pg, d, HE_LAY); await asyncio.sleep(0.25)
        await toca_el(pg, d, "(() => Array.from(HE.el.pop.querySelectorAll('.he-escolha')).find(b => /Principal/.test(b.textContent)))()"); await asyncio.sleep(0.25)
        tr = await rt(pg, "({ativo:heAtivo().nome, joyEsq:hud.joy.x < W/2, a:hud.power.a, pop:HE.pop})")
        P.confere(tr['ativo'] == 'Principal' and tr['joyEsq'] and tr['a'] == 0, '%s: tocar em "Principal" troca na hora (sem mudança pendente, nada a perguntar)' % cel, tr)
        await toca_el(pg, d, '#hp-canc'); await asyncio.sleep(0.25)
        fechou = await rt(pg, "!HE.aberto && !editing")
        P.confere(fechou, '%s: ✕ sem mudanças fecha direto' % cel)
        g = await geo(pg)
        await d.toca(g['pausa']['x'], g['pausa']['y']); await espera(pg, "PAUSA.aberta", 2000); await asyncio.sleep(0.45)
        pa = await rt(pg, "(() => { const b = document.getElementById('pa-layout'); return b && !b.hidden ? b.textContent : null; })()")
        await toca_el(pg, d, '#pa-layout'); await asyncio.sleep(0.2)
        pa2 = await rt(pg, "({ativo:heAtivo().nome, joyDir:hud.joy.x > W/2, tx:document.getElementById('pa-layout').textContent, salvo:JSON.parse(localStorage.getItem('racha-hud-layouts-v1')).ativo === HE.store.ativo})")
        P.confere(pa and 'PRINCIPAL' in pa and pa2['ativo'] == 'Canhoto Zé' and pa2['joyDir'] and pa2['salvo'],
                  '%s: na PAUSA, LAYOUT ⇄ troca o layout em uso na hora (e fica guardado)' % cel, [pa, pa2])
        await toca_el(pg, d, '#pa-continuar'); await asyncio.sleep(0.3)
        await abre_editor_pela_pausa(pg, d)
        await toca_el(pg, d, HE_LAY); await asyncio.sleep(0.2)
        await toca_el(pg, d, "(() => Array.from(HE.el.pop.querySelectorAll('button')).find(b => /NOME/.test(b.textContent)))()"); await asyncio.sleep(0.2)
        await rt(pg, "(() => { const i = HE.el.pop.querySelector('input.he-nome'); i.value = ''; i.focus(); return 1; })()")
        await pg.keyboard.type('Meu Canhoto'); await pg.keyboard.press('Enter'); await asyncio.sleep(0.2)
        rn = await rt(pg, "heAtivo().nome")
        exc = "HE.el.pop.querySelector('.he-exclui')"
        await toca_el(pg, d, exc); await asyncio.sleep(0.15); um = await rt(pg, "HE.store.lista.length")
        await toca_el(pg, d, exc); await asyncio.sleep(0.25)
        ex = await rt(pg, "({n:HE.store.lista.length, ativo:heAtivo().nome, apagado:HE.store.apagados.length, joyEsq:hud.joy.x < W/2})")
        P.confere(rn == 'Meu Canhoto' and um == 2 and ex['n'] == 1 and ex['ativo'] == 'Principal' and ex['apagado'] >= 1 and ex['joyEsq'],
                  '%s: NOME (digitado + Enter) renomeia; EXCLUIR pede o segundo toque e volta para o Principal' % cel, [rn, um, ex])
        await rt(pg, "heFechaPop(); 1")
        # 10) o salvamento automático: a página fecha no meio da edição
        g = await geo(pg); c = g['ctl']['power']
        alvo2 = (g['cv'][0] + g['cv'][2] * .62, g['cv'][1] + g['cv'][3] * .5)
        await d.arrasta(c['x'], c['y'], alvo2[0], alvo2[1]); await asyncio.sleep(0.5)
        arrastado = await rt(pg, ESTADO + "('power')")
        rasc = await rt(pg, "!!localStorage.getItem('racha-hud-rascunho-v1')")
        await pg.keyboard.press('Escape'); await asyncio.sleep(0.25)
        esc = await rt(pg, "({aberto:HE.aberto, pop:HE.pop, x:hud.power.x})")
        P.confere(rasc and esc['aberto'] and esc['pop'] == 'conf' and abs(esc['x'] - arrastado['x']) < .01,
                  '%s: com mudança, o Esc não joga fora: pergunta (SALVAR / SAIR SEM SALVAR / CONTINUAR), e o rascunho já está guardado' % cel, [rasc, esc])
        await pg.reload(); await pronto(pg)
        await rt(pg, "(() => { if (lobby.aberto) filaPops(); return 1; })()")
        pop = await espera(pg, "(() => { const h = LB.popCaixa.querySelector('h2'); return !LB.pop.hidden && h && h.textContent === 'MUDANÇAS NÃO SALVAS' ? Array.from(LB.popCaixa.querySelectorAll('.pop-acoes button')).map(b => b.textContent) : null; })()", 6000)
        P.confere(pop == ['DESCARTAR', 'SALVAR ASSIM', 'CONTINUAR EDITANDO'], '%s: o jogo fechou no meio da edição → no menu, MUDANÇAS NÃO SALVAS' % cel, pop)
        await toca_el(pg, d, "(() => Array.from(LB.popCaixa.querySelectorAll('.pop-acoes button')).find(b => b.textContent === 'CONTINUAR EDITANDO'))()")
        voltou = await espera(pg, "HE.aberto && editing ? {x:hud.power.x, y:hud.power.y, sujo:HE.sujo, aviso:HE.el.avisoTx.textContent} : null", 5000)
        P.confere(voltou and abs(voltou['x'] - arrastado['x']) < .01 and abs(voltou['y'] - arrastado['y']) < .01 and voltou['sujo'] and 'Voltaram' in voltou['aviso'],
                  '%s: CONTINUAR EDITANDO abre o editor com o CHUTE onde ele estava (as posições não se perderam)' % cel, voltou)
        await toca_el(pg, d, '#hp-canc'); await asyncio.sleep(0.25)
        await toca_el(pg, d, "(() => Array.from(HE.el.pop.querySelectorAll('button')).find(b => /SAIR SEM SALVAR/.test(b.textContent)))()"); await asyncio.sleep(0.25)
        sai = await rt(pg, "({aberto:HE.aberto, x:hud.power.x, rasc:localStorage.getItem('racha-hud-rascunho-v1'), salvo:JSON.parse(localStorage.getItem('racha-hud-layouts-v1')).lista[0].estado.base.power.x})")
        P.confere(not sai['aberto'] and abs(sai['x'] - sai['salvo']) < .01 and sai['rasc'] is None, '%s: ✕ › SAIR SEM SALVAR volta o CHUTE ao que estava salvo' % cel, sai)
        await abre_editor_pela_pausa(pg, d)
        g = await geo(pg); c = g['ctl']['power']
        await d.arrasta(c['x'], c['y'], alvo2[0], alvo2[1] - 30); await asyncio.sleep(0.5)
        arr2 = await rt(pg, ESTADO + "('power')")
        await pg.reload(); await pronto(pg)
        await rt(pg, "(() => { if (lobby.aberto) filaPops(); return 1; })()")
        await espera(pg, "!LB.pop.hidden", 5000)
        await toca_el(pg, d, "(() => Array.from(LB.popCaixa.querySelectorAll('.pop-acoes button')).find(b => b.textContent === 'SALVAR ASSIM'))()"); await asyncio.sleep(0.3)
        sa = await rt(pg, "(() => { const st = JSON.parse(localStorage.getItem('racha-hud-layouts-v1')), L = st.lista.find(x => x.id === st.ativo); return {x:L.estado.base.power.x, hx:hud.power.x, rasc:localStorage.getItem('racha-hud-rascunho-v1')}; })()")
        P.confere(abs(sa['x'] - arr2['x']) < .01 and abs(sa['hx'] - arr2['x']) < .01 and sa['rasc'] is None, '%s: ou SALVAR ASSIM, direto do menu' % cel, [sa, arr2])
        # 11) o modo teste: no treino o jogo anda com os controles não salvos
        await entra_treino(pg)
        await abre_editor_pela_pausa(pg, d)
        await rt(pg, "hud.power.a = 1; heMudou(); 1")
        g = await geo(pg); c = g['ctl']['power']
        alvo3 = (g['cv'][0] + g['cv'][2] * .55, g['cv'][1] + g['cv'][3] * .72)
        await d.arrasta(c['x'], c['y'], alvo3[0], alvo3[1]); await asyncio.sleep(0.4)
        loja0 = await rt(pg, "localStorage.getItem('racha-hud-layouts-v1')")
        await toca_el(pg, d, HE_TESTE); await asyncio.sleep(0.3)
        t1 = await rt(pg, "({teste:HE.teste, real:HE.testeReal, editing, pill:!HE.el.teste.hidden, barra:HE.el.barra.hidden})")
        P.confere(t1['teste'] and t1['real'] and not t1['editing'] and t1['pill'] and t1['barra'], '%s: ▶ TESTAR no treino: o jogo volta a andar com os controles ainda não salvos' % cel, t1)
        await rt(pg, "P.x = P.ax = CX - U(20); P.y = P.ay = CY; P.vx = P.vy = 0; B.x = CX + U(30); B.y = LY0 + U(5); B.vx = B.vy = 0; guardaAnterior(); 1")
        g = await geo(pg); j = g['ctl']['joy']
        x0 = await rt(pg, "P.x")
        await d.poe(3, j['x'], j['y']); await d.move(3, j['x'] + j['r'] * .4, j['y']); await d.move(3, j['x'] + j['r'] * .8, j['y'])
        await asyncio.sleep(0.6)
        x1 = await rt(pg, "P.x")
        await d.tira(3); await asyncio.sleep(0.25)
        P.confere(x1 - x0 > 20, '%s: no teste, o analógico (com o dedo) anda a tampinha (%.0f u para a direita)' % (cel, (x1 - x0) / await rt(pg, "U(1)")), [x0, x1])
        await rt(pg, CONTA_CHUTES + "; P.vx = P.vy = 0; B.x = P.x + ALCANCE_CHUTE - U(.5); B.y = P.y; B.vx = B.vy = 0; resetBotoes(); guardaAnterior(); 1")
        g = await geo(pg)
        await d.toca(g['ctl']['power']['x'], g['ctl']['power']['y'], ms=70); await asyncio.sleep(0.3)
        nk = await rt(pg, "window.__nk.slice()")
        sub = await rt(pg, "HE.el.tstSub.textContent")
        P.confere(nk[:1] == [True] and 'CHUTE' in sub, '%s: no teste, tocar no CHUTE no lugar novo (não salvo) chuta — a pílula diz "%s"' % (cel, sub), [nk, sub])
        await toca_el(pg, d, "(() => Array.from(HE.el.teste.querySelectorAll('button')).find(b => /VOLTAR/.test(b.textContent)))()"); await asyncio.sleep(0.3)
        t2 = await rt(pg, "({teste:HE.teste, editing, barra:!HE.el.barra.hidden, loja:localStorage.getItem('racha-hud-layouts-v1')})")
        P.confere(not t2['teste'] and t2['editing'] and t2['barra'] and t2['loja'] == loja0, '%s: VOLTAR volta ao editor, e o teste não salvou nada' % cel, {k: v for k, v in t2.items() if k != 'loja'})
        await rt(pg, "heFecha(false); 1")
        # o modo teste numa partida (contra os bots): só o toque é mostrado
        await rt(pg, """(() => { try { if (fimAberto()) fechaFim(); } catch (_) {} x49Start(1, 0); try { rqVsFecha(); } catch (_) {} rqBots = function(){}; RQ.estado = 'jogo'; RQ.autoH = false;
          ARB_PARADO = function(){ return false; }; window.__np = 0; if (!window.__npw){ window.__npw = 1; const ps = physicsStep; physicsStep = function(){ window.__np++; return ps.apply(this, arguments); }; } return 1; })()""")
        await asyncio.sleep(0.6)
        ok = await abre_editor_pela_pausa(pg, d)
        await toca_el(pg, d, HE_TESTE); await asyncio.sleep(0.3)
        np0 = await rt(pg, "window.__np"); tk0 = await rt(pg, "RQ.tick"); p0 = await rt(pg, "[P.x, P.y]")
        sb = await rt(pg, "({teste:HE.teste, real:HE.testeReal, editing})")
        g = await geo(pg)
        await d.poe(4, g['ctl']['power']['x'], g['ctl']['power']['y']); await asyncio.sleep(0.12)
        s_chute = await rt(pg, "({sub:HE.el.tstSub.textContent, powerL:BOTAO.powerL, seg:powerSegurado(), ptrs:ptrs.size})")
        await d.tira(4)
        await d.poe(4, g['ctl']['joy']['x'], g['ctl']['joy']['y']); await d.move(4, g['ctl']['joy']['x'] + 40, g['ctl']['joy']['y']); await asyncio.sleep(0.4)
        s_joy = await rt(pg, "({sub:HE.el.tstSub.textContent, joy:joy.id, inp:getInput()})")
        await d.tira(4); await asyncio.sleep(0.2)
        np1 = await rt(pg, "window.__np"); tk1 = await rt(pg, "RQ.tick"); p1 = await rt(pg, "[P.x, P.y]")
        await pg.screenshot(path=str(SAIDA / ('hud92_%s_teste_partida.png' % cel)))
        P.confere(ok and sb['teste'] and not sb['real'] and sb['editing'], '%s: ▶ TESTAR numa partida contra os bots: o teste só do toque (a partida continua parada)' % cel, sb)
        P.confere('CHUTE' in s_chute['sub'] and not s_chute['powerL'] and not s_chute['seg'] and s_chute['ptrs'] == 0, '%s: tocar no CHUTE mostra "%s" e não vira comando' % (cel, s_chute['sub']), s_chute)
        P.confere('ANALÓGICO' in s_joy['sub'] and s_joy['joy'] is None and s_joy['inp'] == {'mx': 0, 'my': 0}, '%s: arrastar o analógico mostra o toque e não anda' % cel, s_joy)
        P.confere(np1 == np0 and tk1 == tk0 and p1 == p0, '%s: a partida não andou um passo durante o teste' % cel, [np0, np1, tk0, tk1])
        await rt(pg, "heFecha(false); rqSai(); 1")
        # 12) a área segura do iPhone (imitada) e a tela girando
        await entra_treino(pg)
        try:
            await cdp.send('Emulation.setSafeAreaInsetsOverride', {'insets': {'top': 0, 'left': 47, 'bottom': 21, 'right': 47}})
            imitada = 'CDP'
        except Exception:
            await pg.add_style_tag(content=':root{ padding:0 47px 21px 47px !important; }')
            imitada = 'CSS'
        await rt(pg, "window.dispatchEvent(new Event('resize')); 1"); await asyncio.sleep(0.6)
        await abre_editor_pela_pausa(pg, d)
        await asyncio.sleep(0.4)
        g = await geo(pg)
        sa_ok = dentro(g['barra'], 47, 0, g['vw'] - 47, g['vh'] - 21) and g['cv'][0] >= 46 and g['cv'][0] + g['cv'][2] <= g['vw'] - 46
        bts = await rt(pg, "Array.from(HE.el.barra.querySelectorAll('button')).filter(b => b.getClientRects().length && !b.closest('[hidden]')).map(b => { const r = b.getBoundingClientRect(); return [r.left, r.right, r.bottom]; })")
        bts_ok = all(l >= 46 and r <= g['vw'] - 46 and bt <= g['vh'] - 20 for l, r, bt in bts)
        await pg.screenshot(path=str(SAIDA / ('hud92_%s_area_segura.png' % cel)))
        P.confere(sa_ok and bts_ok, '%s: com o notch e a barra de gestos (47 px dos lados, 21 embaixo; %s), a barra e a quadra ficam dentro da área segura' % (cel, imitada), [sa_ok, g['barra'], g['cv'], [x for x in bts if not (x[0] >= 46 and x[1] <= g['vw'] - 46 and x[2] <= g['vh'] - 20)]])
        g0 = await geo(pg); c = g0['ctl']['power']
        await d.arrasta(c['x'], c['y'], c['x'] - 60, c['y'] - 20); await asyncio.sleep(0.4)
        antes_giro = await rt(pg, ESTADO + "('power')")
        w, h = CELULARES[cel][0], CELULARES[cel][1]
        await pg.set_viewport_size({'width': h, 'height': w}); await asyncio.sleep(0.8)
        em_pe = await rt(pg, "({gire:!V70G.el.hidden, aberto:HE.aberto})")
        await pg.set_viewport_size({'width': w, 'height': h}); await asyncio.sleep(0.9)
        g = await geo(pg)
        depois_giro = await rt(pg, ESTADO + "('power')")
        P.confere(em_pe['gire'] and em_pe['aberto'] and g['aberto'] and depois_giro == antes_giro and dentro(g['barra'], 0, 0, g['vw'], g['vh']),
                  '%s: em pé aparece o GIRE O CELULAR; deitando de novo, o editor e a mudança continuam e a barra fica na tela' % cel, [em_pe, g['barra'], depois_giro == antes_giro])
        try:
            await cdp.send('Emulation.setSafeAreaInsetsOverride', {'insets': {'top': 0, 'left': 0, 'bottom': 0, 'right': 0}})
        except Exception:
            pass
        await rt(pg, "heFecha(false); 1")
        js = [e for e in erros]
        P.confere(not js, '%s: nenhum erro de JavaScript' % cel, js[:3])
    finally:
        await b.close()


HE_DESFAZ = "HE.el.desf"
HE_REFAZ = "HE.el.refz"
HE_TAM = "HE.el.tam"
HE_OPA = "HE.el.opa"
HE_OPC = "HE.el.opc"
HE_LAY = "HE.el.lay"
HE_TESTE = "HE.el.tst"
HE_AVISO_BT = "HE.el.avisoBt"


# ------------------------------------------------------------------------------------------------ 13: na conta (a plataforma de mentira)
async def conta(P, pw):
    from v82_test import Plataforma, Aparelho, LIMPA
    print('\n· na conta (a plataforma de mentira, as regras de app/contracts/progresso.ts)')
    plat = Plataforma(); A = B = None
    try:
        A = await Aparelho().abre(pw, plat, 844, 390)
        await A.monta(77); await A.limpa()
        await A.rt("(() => { if (!lobby.aberto) abrirLobby(); jogar(); return 1; })()"); await asyncio.sleep(0.6)
        r = await A.rt("""(() => { abrirEdicao(); hud.power.x = 1200; hud.power.y = 520; hud.power.a = .4; heMudou(); heNovoDoEditor('Na Nuvem'); hud.kick.s = 1.3; heMudou(); heFecha(true);
          return {n:HE.store.lista.length, ativo:heAtivo().nome, dono:R82.dono}; })()""")
        await A.rt("(() => { RachaContas82.envia(false); return 1; })()")
        async def na_nuvem(nome, ms=12000):
            t0 = time.time()
            while time.time() - t0 < ms / 1000:
                e = await A.api('teste/estado')
                c = next((c for c in e['contas'] if c['id'] == 77), None)
                ch = c and c.get('nuvem') and c['nuvem']['dados']['chaves'].get('racha-hud-layouts-v1')
                if ch and nome in ch:
                    return json.loads(ch)
                await asyncio.sleep(0.4)
            return None
        st = await na_nuvem('Na Nuvem')
        P.confere(r['dono'] == 'c77' and st and any(L['nome'] == 'Na Nuvem' for L in st['lista']),
                  'conta: o layout "Na Nuvem" sobe com o progresso da conta 000077 (a chave racha-hud-layouts-v1)', [r, st and [L['nome'] for L in st['lista']]])
        B = await Aparelho().abre(pw, plat, 915, 412)            # um navegador novo: o cache limpo
        await B.monta(77); await B.limpa()
        vb = await B.rt("({ativo:heAtivo().nome, nomes:HE.store.lista.map(L => L.nome), px:hud.power.x, py:hud.power.y, a:hud.power.a, ks:hud.kick.s})")
        P.confere(vb['ativo'] == 'Na Nuvem' and abs(vb['px'] - 1200) < .01 and abs(vb['a'] - .4) < .001 and abs(vb['ks'] - 1.3) < .001,
                  'conta: noutro aparelho (o cache limpo), ao entrar na conta, o layout "Na Nuvem" já está valendo, com as posições', vb)
        # os dois mexendo: B cria um e sobe; A (sem saber) cria outro → a conta tem outra cópia → O DA CONTA → as listas se juntam
        await B.rt("(() => { jogar(); return 1; })()"); await asyncio.sleep(0.5)
        await B.rt("(() => { abrirEdicao(); heNovoDoEditor('Do B'); heFecha(true); RachaContas82.envia(false); return 1; })()")
        stB = await na_nuvem('Do B')
        await A.rt("(() => { abrirEdicao(); heNovoDoEditor('Do A'); heFecha(true); RachaContas82.envia(false); return 1; })()")
        conf = await A.espera("(() => { const h = LB.popCaixa.querySelector('h2'); return !LB.pop.hidden && h && h.textContent === 'QUAL PROGRESSO FICA?'; })()", ms=10000)
        if not conf:                                             # (no meio do treino a conta espera o menu)
            await A.rt("(() => { abrirLobby(); return 1; })()")
            conf = await A.espera("(() => { const h = LB.popCaixa.querySelector('h2'); return !LB.pop.hidden && h && h.textContent === 'QUAL PROGRESSO FICA?'; })()", ms=10000)
        await asyncio.sleep(0.5)                                  # (o menu engole o clique dos primeiros 300 ms: o "clique fantasma" do toque que o abriu)
        await A.marca()
        clicou = await A.clica_pop('O DA CONTA')
        try:
            await A.pronto()
        except RuntimeError:
            f = A.quadro()
            try:
                v = await f.evaluate('() => [typeof window.__RT, typeof window.RachaContas82, !!window.__marca82, document.readyState, window.__RT("({rec:C82.recarrega, rq:RQ.on, net:NET49.playing, lobby:lobby.aberto, tr:typeof TR !== \'undefined\' && TR.on, est:RQ.estado})")]') if f else None
            except Exception as ex:
                v = str(ex)[:200]
            print('    (o jogo não abriu de novo depois de O DA CONTA: conf=%r, clicou=%r, quadro=%r, %r, erros=%r)' % (conf, clicou, v, [fr.url[-40:] for fr in A.pg.frames], [e for e in A.erros if 'Failed to load' not in e][:4]))
            raise
        va = await A.espera("(() => { const n = HE.store.lista.map(L => L.nome); return n.indexOf('Do A') >= 0 && n.indexOf('Do B') >= 0 ? n : null; })()", ms=8000)
        P.confere(stB and conf and clicou and va and 'Na Nuvem' in va, 'conta: dois aparelhos criando ao mesmo tempo (QUAL PROGRESSO FICA? › O DA CONTA): os layouts dos dois ficam (%s)' % (va and ', '.join(va)), [bool(stB), conf, clicou, va])
        await A.rt("(() => { RachaContas82.envia(false); return 1; })()")
        st2 = await na_nuvem('Do A', ms=20000)
        P.confere(st2 and {'Do A', 'Do B', 'Na Nuvem'} <= {L['nome'] for L in st2['lista']}, 'conta: e a lista junta sobe para a conta', st2 and [L['nome'] for L in st2['lista']])
        erros = [e for e in (A.erros + B.erros) if 'Failed to load resource' not in e]
        P.confere(not erros, 'conta: nenhum erro de JavaScript', erros[:3])
    finally:
        for x in (A, B):
            if x:
                await x.fecha()
        plat.fecha()


# ------------------------------------------------------------------------------------------------ 14: online (o servidor de verdade)
async def online(P, pw):
    from v92_online_test import sobe, sala
    print('\n· online (o servidor da turma de verdade, sala 1v1)')
    srv, prx, url, ws = sobe(False)
    A = Bp = None
    try:
        A, Bp, s0, ok = await sala(pw, url, ws)
        P.confere(ok, 'online: a partida começou nos dois navegadores')
        await asyncio.sleep(1.0)
        await rt(A, """(() => { window.__cmds = []; const s = net49Send; net49Send = function(m){ if (m && m.type === 'input') window.__cmds.push({x:m.x, y:m.y, b:m.button, kc:m.kc | 0, pc:m.pc | 0, seq:m.seq}); return s.apply(this, arguments); };
          return 1; })()""")
        await rt(A, "(() => { abrirEdicao(); heTesteEntra(); return 1; })()")
        st = await rt(A, "({aberto:HE.aberto, teste:HE.teste, real:HE.testeReal, editing, playing:NET49.playing})")
        cdp = await A.context.new_cdp_session(A); dd = Dedos(cdp)
        await asyncio.sleep(0.3)
        await rt(A, "window.__cmds.length = 0; window.__p0 = [P.x, P.y]; 1")
        g = await geo(A)
        kc0 = await rt(A, "[V92N.kc | 0, V92N.pc | 0]")
        for _ in range(3):
            await dd.toca(g['ctl']['power']['x'], g['ctl']['power']['y'], ms=80); await asyncio.sleep(0.15)
            await dd.toca(g['ctl']['kick']['x'], g['ctl']['kick']['y'], ms=80); await asyncio.sleep(0.15)
        await dd.poe(4, g['ctl']['joy']['x'], g['ctl']['joy']['y']); await dd.move(4, g['ctl']['joy']['x'] + 50, g['ctl']['joy']['y'] - 30); await asyncio.sleep(0.8); await dd.tira(4)
        await asyncio.sleep(0.4)
        r = await rt(A, "({n:window.__cmds.length, mexe:window.__cmds.filter(c => c.x || c.y || c.b !== 1).length, kc:[V92N.kc | 0, V92N.pc | 0], sub:HE.el.tstSub.textContent, p:[P.x, P.y], p0:window.__p0, u:U(1)})")
        anda = math.hypot(r['p'][0] - r['p0'][0], r['p'][1] - r['p0'][1]) / r['u']
        P.confere(st['teste'] and not st['real'] and st['playing'], 'online: o modo teste no meio da partida é o teste só do toque', st)
        P.confere(r['n'] > 30 and r['mexe'] == 0 and r['kc'] == kc0, 'online: %d comandos foram para a sala durante o teste, todos parados (sem botão, sem direção; os contadores de toque não andaram)' % r['n'], r)
        P.confere(anda < 1.5 and ('ANALÓGICO' in r['sub'] or 'CHUTE' in r['sub'] or 'PASSE' in r['sub']), 'online: a sua tampinha ficou parada no servidor (%.2f u) e a pílula mostrou o toque (%s)' % (anda, r['sub']), r)
        await rt(A, "(() => { heFecha(false); return 1; })()")
        await asyncio.sleep(0.3)
        await dd.poe(4, g['ctl']['joy']['x'], g['ctl']['joy']['y']); await dd.move(4, g['ctl']['joy']['x'] + 60, g['ctl']['joy']['y']); await asyncio.sleep(0.5)
        depois = await rt(A, "window.__cmds.slice(-10).filter(c => c.x || c.y).length")
        await dd.tira(4)
        P.confere(depois > 0, 'online: fechou o editor, o analógico volta a mandar a direção para a sala', depois)
        erros = [e for pg in (A, Bp) for e in pg.erros]
        P.confere(not erros, 'online: nenhum erro de JavaScript', erros[:3])
    finally:
        for pg in (A, Bp):
            if pg:
                try:
                    await pg.b.close()
                except Exception:
                    pass
        srv.terminate(); prx.terminate()


async def principal():
    P = Placar('v92 · Fase 1 · o editor dos controles no celular')
    M = {}
    so = sys.argv[sys.argv.index('--so') + 1] if '--so' in sys.argv else None
    async with async_playwright() as pw:
        for cel in CELULARES:
            if (so and cel != so) or '--sem-celular' in sys.argv:
                continue
            await celular(P, pw, cel, M)
        if '--sem-conta' not in sys.argv:
            await conta(P, pw)
        if '--sem-online' not in sys.argv:
            await online(P, pw)
    print('\n    a barra ao abrir (x, y, largura, altura em px da tela):', json.dumps(M))
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
