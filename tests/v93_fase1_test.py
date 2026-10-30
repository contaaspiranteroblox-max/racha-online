"""RACHA v93 · FASE 1 — HUD E CONTROLES NO CELULAR (passa/falha, com as medidas impressas). O Chromium faz de conta que é um
celular deitado (iPhone 844 × 390, Android 915 × 412 e um pequeno 667 × 375) e os toques chegam como dedos (CDP).
Confere:
  1. EFEITOS AO PRESSIONAR (a opção de cada controle no editor, pelo dedo: OPÇÕES › Efeitos ao pressionar): ligado, o
     PASSE encolhe ao tocar; desligado, os pixels do botão tocado são os mesmos do botão solto. A piscada do chute em cima
     do CHUTE some, e o analógico com o dedo fica parado (sem a fatia acesa e com o pino no meio). O toque continua valendo
     (o PASSE desligado chuta). A opção fica no layout (e volta depois de recarregar);
  2. OPACIDADE 1%: o deslizante chega a 1% (a barra mostra 1%) e, na partida, o botão aparece de leve (mais que 0%, bem
     menos que 100%);
  3. os LAYOUTS: NOVO começa com os controles no lugar padrão (e, com mudança por salvar, pergunta antes: SALVAR E CRIAR /
     CRIAR SEM SALVAR) e DUPLICAR copia os controles de agora;
  4. o TUTORIAL: em cada passo o painel não fica em cima de nenhum controle nem da pausa (também com o PASSE levado para o
     alto da tela no editor), os textos são curtos, o recado aparece dentro do painel e os seletores do treino somem (e não
     pegam o toque); o aviso ARMADO vai para o lado livre (não em cima do PASSE).
  python3 tests/v93_fase1_test.py [--so iPhone]"""
import asyncio, json, math, sys, time
from comum import Placar, rt, async_playwright
from v92_hud_test import (CELULARES, Dedos, abre_cel, pronto, espera, geo, toca_el, entra_treino, abre_editor_pela_pausa, cobre,
                          HE_OPC, HE_OPA, HE_LAY, CONTA_CHUTES, ESTADO)

# os pixels de um botão (em volta do centro), lidos no canvas logo depois de um desenho
PIX = """(k0 => { const k = cv.width/W, e = hud[k0], g = cv.getContext('2d'), r = (k0 === 'joy' ? JOY.aro*e.al + JOY.knob*e.km : BASE[k0].r)*e.s, out = [];
  for (let i = 0; i < 24; i++){ const a = i*Math.PI/12, f = (i % 3 + 1)/3.2; const p = g.getImageData(Math.round((e.x + Math.cos(a)*r*f)*k), Math.round((e.y + Math.sin(a)*r*f)*k), 1, 1).data; out.push([p[0], p[1], p[2]]); }
  for (const R of [r + 14, r + 24]) for (let i = 0; i < 12; i++){ const a = i*Math.PI/6; const p = g.getImageData(Math.round((e.x + Math.cos(a)*R)*k), Math.round((e.y + Math.sin(a)*R)*k), 1, 1).data; out.push([p[0], p[1], p[2]]); }
  return out; })"""
dif = lambda A, Bv: max(max(abs(a[i] - b2[i]) for i in range(3)) for a, b2 in zip(A, Bv))


async def efeitos(P, pw, cel):
    b, ctx, pg, d, cdp, erros = await abre_cel(pw, cel)
    try:
        await entra_treino(pg)
        await asyncio.sleep(.3)
        # com os efeitos ligados (o padrão): o PASSE tocado encolhe
        px = await rt(pg, """(() => { const pa = %s; ptrs.clear(); render(0); const solto = pa('kick');
          ptrs.set(991, 'kick'); render(0); const tocado = pa('kick'); ptrs.delete(991); render(0);
          return {solto, tocado, fx:hud.kick.fx !== false}; })()""" % PIX)
        P.confere(px['fx'] and dif(px['solto'], px['tocado']) > 20, '%s: com os efeitos ligados (padrão), o PASSE tocado encolhe (dif. %d)' % (cel, dif(px['solto'], px['tocado'])), dif(px['solto'], px['tocado']))
        # desligar pelo editor, com o dedo: escolhe o PASSE › OPÇÕES › Efeitos ao pressionar › SALVAR
        await abre_editor_pela_pausa(pg, d)
        g = await geo(pg)
        await d.toca(g['ctl']['kick']['x'], g['ctl']['kick']['y']); await asyncio.sleep(.3)
        await toca_el(pg, d, HE_OPC); await asyncio.sleep(.3)
        chave = "(() => Array.from(HE.el.pop.querySelectorAll('button')).find(b => /Efeitos ao pressionar/.test(b.textContent)))()"
        antes = await rt(pg, chave + ".getAttribute('aria-pressed')")
        await toca_el(pg, d, chave); await asyncio.sleep(.2)
        depois = await rt(pg, chave + ".getAttribute('aria-pressed')")
        await rt(pg, "heFechaPop(); 1"); await asyncio.sleep(.3)
        await toca_el(pg, d, '#hp-salvar'); await asyncio.sleep(.4)
        st = await rt(pg, "({fx:hud.kick.fx, aberto:HE.aberto, salvo:JSON.parse(localStorage.getItem('racha-hud-layouts-v1')).lista.find(L => L.id === HE.store.ativo).estado.base.kick.fx})")
        P.confere(antes == 'true' and depois == 'false' and st['fx'] is False and st['salvo'] is False and not st['aberto'],
                  '%s: OPÇÕES › Efeitos ao pressionar (com o dedo) desliga só o PASSE e fica no layout' % cel, [antes, depois, st])
        await asyncio.sleep(.3)
        px = await rt(pg, """(() => { const pa = %s; ptrs.clear(); render(0); const solto = pa('kick');
          ptrs.set(991, 'kick'); render(0); const tocado = pa('kick'); ptrs.delete(991);
          ptrs.set(992, 'power'); render(0); const chuteTocado = pa('power'); ptrs.delete(992); render(0); const chuteSolto = pa('power');
          return {solto, tocado, chuteTocado, chuteSolto}; })()""" % PIX)
        P.confere(dif(px['solto'], px['tocado']) <= 2, '%s: desligado, o PASSE tocado fica parado: os mesmos pixels do solto (dif. %d)' % (cel, dif(px['solto'], px['tocado'])), dif(px['solto'], px['tocado']))
        P.confere(dif(px['chuteSolto'], px['chuteTocado']) > 20, '%s: o CHUTE (ligado) continua encolhendo: a opção é de cada controle' % cel, dif(px['chuteSolto'], px['chuteTocado']))
        # a piscada do chute em cima do botão (o anel branco) e o analógico
        await rt(pg, "(() => { hud.power.fx = false; hud.joy.fx = false; return 1; })()")
        px = await rt(pg, """(() => { const pa = %s; ptrs.clear(); ARMADO.saiu = ''; render(0); const sem = pa('power');
          ARMADO.saiu = 'power'; ARMADO.saiuT = performance.now() - 60; render(0); const pisca = pa('power'); ARMADO.saiu = '';
          const j0 = {id:joy.id, dx:joy.dx, dy:joy.dy, at:joy.ativo, cx:joy.cx, cy:joy.cy}; render(0); const joySolto = pa('joy');
          joy.id = 993; joy.cx = hud.joy.x; joy.cy = hud.joy.y; joy.dx = 46; joy.dy = -20; joy.ativo = true; render(0); const joyDedo = pa('joy');
          Object.assign(joy, {id:j0.id, dx:j0.dx, dy:j0.dy, ativo:j0.at, cx:j0.cx, cy:j0.cy}); render(0);
          hud.power.fx = true; hud.joy.fx = true;
          ARMADO.saiu = 'power'; ARMADO.saiuT = performance.now() - 60; render(0); const piscaLigado = pa('power'); ARMADO.saiu = ''; render(0);
          return {sem, pisca, joySolto, joyDedo, piscaLigado}; })()""" % PIX)
        P.confere(dif(px['sem'], px['pisca']) <= 2 and dif(px['sem'], px['piscaLigado']) > 20, '%s: a piscada do chute em cima do CHUTE some com os efeitos desligados (ligado: dif. %d)' % (cel, dif(px['sem'], px['piscaLigado'])), [dif(px['sem'], px['pisca']), dif(px['sem'], px['piscaLigado'])])
        P.confere(dif(px['joySolto'], px['joyDedo']) <= 2, '%s: o analógico desligado, com o dedo puxando, fica parado (sem a fatia acesa, o pino no meio: dif. %d)' % (cel, dif(px['joySolto'], px['joyDedo'])), dif(px['joySolto'], px['joyDedo']))
        # o toque do PASSE desligado continua chutando
        await rt(pg, CONTA_CHUTES + "; P.x = P.ax = CX; P.y = P.ay = CY; P.vx = P.vy = 0; B.x = CX + ALCANCE_CHUTE - U(.5); B.y = CY; B.vx = B.vy = 0; resetBotoes(); guardaAnterior(); 1")
        g = await geo(pg)
        await d.toca(g['ctl']['kick']['x'], g['ctl']['kick']['y'], ms=70); await asyncio.sleep(.25)
        nk = await rt(pg, "window.__nk.slice()")
        P.confere(nk[:1] == [False], '%s: o PASSE sem efeitos chuta igual (o toque e a resposta não mudam)' % cel, nk)
        # recarregar: a opção volta com o layout
        await pg.reload(); await pronto(pg)
        P.confere(await rt(pg, "hud.kick.fx === false && hud.power.fx !== false"), '%s: depois de recarregar, o PASSE continua sem efeitos (o layout guarda)' % cel, await rt(pg, "[hud.kick.fx, hud.power.fx]"))

        # 2) opacidade 1%
        await entra_treino(pg)
        await abre_editor_pela_pausa(pg, d)
        g = await geo(pg)
        await d.toca(g['ctl']['power']['x'], g['ctl']['power']['y']); await asyncio.sleep(.3)
        await toca_el(pg, d, HE_OPA); await asyncio.sleep(.3)
        await toca_el(pg, d, "(() => Array.from(HE.el.pop.querySelectorAll('button')).find(b => b.textContent.trim() === '0%'))()"); await asyncio.sleep(.2)
        await toca_el(pg, d, "(() => Array.from(HE.el.pop.querySelectorAll('button')).find(b => /^Mais/.test(b.getAttribute('aria-label') || '')))()"); await asyncio.sleep(.2)
        # (o + sobe 5%: o deslizante desce até 1% pela tecla da seta, como no celular com o dedo bem de leve)
        await rt(pg, "(() => { const r = HE.el.pop.querySelector('input[type=range]'); r.value = '1'; r.dispatchEvent(new Event('input', {bubbles:true})); r.dispatchEvent(new Event('change', {bubbles:true})); return 1; })()")
        a1 = await rt(pg, "[hud.power.a, HE.el.opaV.textContent]")
        await rt(pg, "heFechaPop(); 1"); await asyncio.sleep(.3)
        await toca_el(pg, d, '#hp-salvar'); await asyncio.sleep(.5)
        px = await rt(pg, """(() => { const k = cv.width/W, e = hud.power, ex = e.x, ey = e.y, g = cv.getContext('2d');
          const S = () => { const out = []; for (const [dx, dy] of [[0, 0], [-40, -20], [40, 20], [-30, 35], [30, -35], [0, 50], [55, 0]]){ const p = g.getImageData(Math.round((ex + dx)*k), Math.round((ey + dy)*k), 1, 1).data; out.push([p[0], p[1], p[2]]); } return out; };
          ptrs.clear(); render(0); const um = S();
          e.x = W + 900; render(0); const sem = S(); e.x = ex;
          e.a = 1; render(0); const cem = S(); e.a = .01; render(0);
          return {um, sem, cem}; })()""")
        d1, d100 = dif(px['um'], px['sem']), dif(px['cem'], px['sem'])
        P.confere(abs(a1[0] - .01) < .001 and a1[1] == '1%' and 0 < d1 < d100 / 4, '%s: OPACIDADE 1%%: a barra mostra 1%% e, na partida, o CHUTE aparece de leve (dif. %d; com 100%%: %d)' % (cel, d1, d100), [a1, d1, d100])

        # 3) os layouts: NOVO (do padrão) e DUPLICAR (a cópia)
        await abre_editor_pela_pausa(pg, d)
        g = await geo(pg); k0 = g['ctl']['kick']
        await d.arrasta(k0['x'], k0['y'], k0['x'] - 60, k0['y'] + 30); await asyncio.sleep(.3)
        movido = await rt(pg, ESTADO + "('kick')")
        await toca_el(pg, d, HE_LAY); await asyncio.sleep(.3)
        await toca_el(pg, d, "(() => Array.from(HE.el.pop.querySelectorAll('button')).find(b => /DUPLICAR/.test(b.textContent)))()"); await asyncio.sleep(.3)
        nome_dup = await rt(pg, "HE.el.pop.querySelector('input.he-nome').value")
        await toca_el(pg, d, "(() => Array.from(HE.el.pop.querySelectorAll('button')).find(b => b.textContent.trim() === 'OK'))()"); await asyncio.sleep(.3)
        dup = await rt(pg, "({ativo:heAtivo().nome, n:HE.store.lista.length, kick:" + ESTADO + "('kick'), sujo:HE.sujo, salvo:heAtivo().estado.base.kick.x})")
        P.confere(dup['ativo'] == nome_dup and abs(dup['kick']['x'] - movido['x']) < .01 and abs(dup['salvo'] - movido['x']) < .01 and not dup['sujo'],
                  '%s: LAYOUTS › DUPLICAR ("%s"): o layout novo é a cópia dos controles de agora (com o PASSE no lugar novo)' % (cel, nome_dup), dup)
        g = await geo(pg); k0 = g['ctl']['kick']
        await rt(pg, "heFechaPop(); 1"); await asyncio.sleep(.3)
        await d.arrasta(k0['x'], k0['y'], k0['x'] + 40, k0['y'] - 20); await asyncio.sleep(.3)
        await toca_el(pg, d, HE_LAY); await asyncio.sleep(.3)
        await toca_el(pg, d, "(() => Array.from(HE.el.pop.querySelectorAll('button')).find(b => b.textContent.trim() === 'NOVO'))()"); await asyncio.sleep(.3)
        await toca_el(pg, d, "(() => Array.from(HE.el.pop.querySelectorAll('button')).find(b => b.textContent.trim() === 'OK'))()"); await asyncio.sleep(.3)
        pergunta = await rt(pg, "({pop:HE.pop, tit:(HE.el.pop.querySelector('.he-pop-tit') || {}).textContent || '', bts:Array.from(HE.el.pop.querySelectorAll('button')).map(b => b.textContent.trim())})")
        await toca_el(pg, d, "(() => Array.from(HE.el.pop.querySelectorAll('button')).find(b => b.textContent.trim() === 'SALVAR E CRIAR'))()"); await asyncio.sleep(.4)
        nv = await rt(pg, "({ativo:heAtivo().nome, n:HE.store.lista.length, kx:hud.kick.x, px:HUD_PADRAO.kick.x, ky:hud.kick.y, py:HUD_PADRAO.kick.y, dupSalvo:HE.store.lista.find(L => L.nome === %s).estado.base.kick.x})" % json.dumps(nome_dup))
        P.confere('CRIAR O LAYOUT NOVO' in pergunta['tit'] and 'SALVAR E CRIAR' in pergunta['bts'] and 'CRIAR SEM SALVAR' in pergunta['bts'], '%s: NOVO com mudança por salvar pergunta antes (SALVAR E CRIAR / CRIAR SEM SALVAR / CANCELAR)' % cel, pergunta)
        P.confere(abs(nv['kx'] - nv['px']) < .01 and abs(nv['ky'] - nv['py']) < .01 and abs(nv['dupSalvo'] - (k0['x'] + 40 - g['cv'][0]) / g['k']) < 1.5,
                  '%s: SALVAR E CRIAR: a mudança fica na cópia e o layout NOVO começa com os controles no lugar padrão' % cel, nv)
        await toca_el(pg, d, '#hp-salvar'); await asyncio.sleep(.3)
        P.confere(not [e for e in erros if 'Failed to load' not in e], '%s: nenhum erro de JavaScript (efeitos, opacidade, layouts)' % cel, erros[:3])
    finally:
        await b.close()


OBST_TUT = """(() => { const c = cv.getBoundingClientRect(), k = c.width/W, out = [];
  for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id); out.push({id, x:c.left + e.x*k, y:c.top + e.y*k, r:e.r*k}); }
  const p = BTN_PAUSA; out.push({id:'pausa', x:c.left + (p.x + p.w/2)*k, y:c.top + (p.y + p.h/2)*k, r:Math.max(p.w, p.h)*.55*k});
  const r = TU.el.getBoundingClientRect();
  return {obst:out, painel:{x:r.left, y:r.top, w:r.width, h:r.height}, vis:!TU.el.hidden, txt:TU.el.querySelector('.tu-txt').textContent,
    aviso:(TU.el.querySelector('.tu-aviso') || {}).textContent || '', avisoVis:!!TU.el.querySelector('.tu-aviso') && !TU.el.querySelector('.tu-aviso').hidden, vh:innerHeight}; })()"""


async def tutorial(P, pw, cel):
    b, ctx, pg, d, cdp, erros = await abre_cel(pw, cel)
    try:
        ruins, textos, alturas = [], [], []
        for rodada in ('padrão', 'PASSE no alto'):
            if rodada == 'PASSE no alto':                       # (o editor: o PASSE vai para o alto da tela, no meio)
                await rt(pg, "(() => { if (TR.id === 'tut'){ tuSai(); } abrirLobby(); return 1; })()"); await asyncio.sleep(.3)
                await entra_treino(pg)
                await abre_editor_pela_pausa(pg, d)
                g = await geo(pg); k0 = g['ctl']['kick']
                await d.arrasta(k0['x'], k0['y'], g['cv'][0] + g['cv'][2] * .5, g['cv'][1] + g['cv'][3] * .2); await asyncio.sleep(.3)
                await toca_el(pg, d, '#hp-salvar'); await asyncio.sleep(.4)
            await rt(pg, "(() => { tutComeca({onb:true}); return 1; })()"); await asyncio.sleep(1.0)
            for k in range(0, 6):
                if k:
                    await rt(pg, "(() => { TR.fase = 'jogo'; TR.rod = %d; TR_X.tut.prep(); tuPainel(); trAviso('ISSO! VOCÊ ANDA COM O ANALÓGICO', '#9dff6b'); return 1; })()" % k)
                await asyncio.sleep(.35)
                o = await rt(pg, OBST_TUT)
                if not o['vis']:
                    ruins.append([rodada, k, 'escondido']); continue
                for c in o['obst']:
                    if cobre(o['painel'], c, 1):
                        ruins.append([rodada, k, c['id'], o['painel']])
                textos.append(len(o['txt'])); alturas.append(round(o['painel']['h'] / o['vh'] * 100))
                if k and not (o['avisoVis'] and 'ISSO' in o['aviso']):
                    ruins.append([rodada, k, 'sem o recado no painel', o['aviso']])
            if rodada == 'padrão':
                await pg.screenshot(path='tests/saida/v93_tutorial_%s.png' % cel)
        P.confere(not ruins, '%s: o painel do tutorial não fica em cima de nenhum controle nem da pausa, em nenhum passo (também com o PASSE no alto), e o recado aparece dentro dele' % cel, ruins[:4])
        P.confere(max(textos) <= 64 and max(alturas) <= 34, '%s: os textos são curtos (até %d letras) e o painel ocupa até %d%% da altura' % (cel, max(textos), max(alturas)), [textos, alturas])
        sel = await rt(pg, "(() => { const s = ARC_SELS[2]; return [arcHitSel(s.x, s.y, 0), (() => { let n = 0; const t0 = txt; txt = function(g, s){ if (/TREINO|TAMANHO|CAMPO/.test(String(s))) n++; return t0.apply(this, arguments); }; render(0); txt = t0; return n; })()]; })()")
        P.confere(sel[0] is None and sel[1] == 0, '%s: no tutorial os seletores do treino (TAMANHO · CAMPO · TREINO) somem e não pegam o toque' % cel, sel)
        rot = await rt(pg, """(() => { const e = el('power'), L = v93RotuloLugar('ARMADO · ENCOSTE NA BOLA', e.x, e.y, BASE.power.r*hud.power.s, 22), R = {x:L.x - L.w/2, y:L.y - L.h/2, w:L.w, h:L.h}, bad = [];
          for (const k of HE_ORDEM){ if (!controleVisivel(k)) continue; const o = el(k); if (heSobra(R, {x:o.x, y:o.y, r:o.r})) bad.push(k); }
          return {bad, x:L.x, y:L.y}; })()""")
        P.confere(not rot['bad'], '%s: o aviso ARMADO fica no lado livre do CHUTE (não em cima do PASSE nem de outro controle)' % cel, rot)
        P.confere(not [e for e in erros if 'Failed to load' not in e], '%s: nenhum erro de JavaScript (tutorial)' % cel, erros[:3])
    finally:
        await b.close()


async def principal():
    P = Placar('v93 · Fase 1 · HUD e controles no celular (efeitos ao pressionar, 1%, layouts, tutorial)')
    so = sys.argv[sys.argv.index('--so') + 1] if '--so' in sys.argv else None
    async with async_playwright() as pw:
        for cel in CELULARES:
            if so and cel != so:
                continue
            print('\n· %s (%d × %d)' % (cel, CELULARES[cel][0], CELULARES[cel][1]))
            await efeitos(P, pw, cel)
            await tutorial(P, pw, cel)
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
