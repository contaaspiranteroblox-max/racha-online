"""v92 · OFICINA — A BOLA BRANCA E AS FERRAMENTAS NOVAS DO EDITOR (passa/falha), no navegador de verdade:
  1) só a v92 oficial: o racha.html publicado, com o config.js dele, abre sem o modo de testes (sem a aba TESTES v92 nos
     AJUSTES e sem os botões A ⇄ B e DB na pausa);
  2) a bola: no TESTAR ela é BRANCA com o contorno preto (os pixels do canvas do jogo), a colorida pinta da cor escolhida;
     o painel Aparência tem a seção Bola (a amostra, o estilo, a cor) e a chave da sombra das peças;
  3) LANÇAR A BOLA: o botão e a tecla B, a mira com o caminho antes de soltar (a força, as batidas, o GOL previsto), o
     chute de verdade no motor do mapa (GOL! no gol do Time B), a batida na linha, o toque sem arrasto não chuta, mudar o
     mapa some com a bola de teste e trocar de ferramenta também;
  4) COPIAR PARA O OUTRO LADO: a parede girada, o gol, a zona, o spawn e o botão do Time A viram do B do outro lado, a cor
     do time troca, o par de portais continua par, o que está no meio fica, e o desfazer volta tudo;
  5) REPETIR: em fila (o passo) e em círculo (em volta do centro, girando junto), pela janela e pelo código; o limite;
  6) AS MEDIDAS e AS GUIAS: a etiqueta enquanto desenha, move e gira; mover perto do lugar espelhado de outra peça encaixa
     nele, perto da altura de outra encaixa na altura; com o ímã desligado nada encaixa;
  7) A VIBRAÇÃO ao criar, apagar e chutar — e nada com a Vibração desligada nos Ajustes do jogo;
  8) AS SOMBRAS: a parede tem a sombra para a direita e para baixo, e ela some com a chave da Aparência;
  9) sem erros no console.
Rodar:  python3 tests/oficina_ferramentas_test.py"""
import asyncio, pathlib, time
from comum import Placar, abre, rt, roda, async_playwright, CHROME, RAIZ

PONTEIRO = """(([tipo, x, y, id, pt]) => {
  const cv = OFI.interno.EDU.cv, r = cv.getBoundingClientRect();
  const e = new PointerEvent(tipo, { clientX: r.left + x, clientY: r.top + y, pointerId: id || 1, pointerType: pt || 'touch', isPrimary: true, bubbles: true, cancelable: true, buttons: tipo === 'pointerup' ? 0 : 1, button: 0 });
  cv.dispatchEvent(e); return true; })"""


async def ev(pg, js, *a):
    return await pg.evaluate(js, *a) if a else await pg.evaluate(js)


async def espera(pg, js, ms=5000):
    t0 = time.time()
    while True:
        try:
            v = await pg.evaluate(js)
        except Exception:
            v = None
        if v or (time.time() - t0) * 1000 > ms:
            return v
        await asyncio.sleep(.08)


async def ponteiro(pg, tipo, x, y, pt='touch'):
    await ev(pg, PONTEIRO, [tipo, x, y, 1, pt])


async def arrasta(pg, x0, y0, x1, y1, n=8, solta=True, pt='touch'):
    await ponteiro(pg, 'pointerdown', x0, y0, pt)
    for k in range(1, n + 1):
        await ponteiro(pg, 'pointermove', x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, pt)
    if solta:
        await ponteiro(pg, 'pointerup', x1, y1, pt)


async def tela_de(pg, ux, uy):
    return await ev(pg, "([x, y]) => { const I = OFI.interno, w = I.uParaMundo(x, y); return I.mundoParaTela(w[0], w[1]); }", [ux, uy])


async def novo_mapa(pg, modelo=None):
    js = """async (modelo) => { const I = OFI.interno; let M;
      if (modelo) { const md = I.MODELOS.find(m => m.id === modelo); M = I.limpaModelo(md.faz(), md.nome); }
      else M = I.limpaModelo(I.mapaDoZero('medio', 'retangulo', 90, 60), 'teste');
      const reg = await I.novoRascunho(M); await I.editorAbre(reg); await new Promise(r => setTimeout(r, 150)); I.edAjusta(); return reg.id; }"""
    return await ev(pg, js, modelo)


async def poe(pg, o):
    return await ev(pg, "o => { const I = OFI.interno, n = I.poeObjeto(o, false); return n ? n.id : null; }", o)


async def seleciona(pg, ids):
    await ev(pg, "ids => { const I = OFI.interno; I.OFE.sel = new Set(ids); I.edEstado(); I.painelAtualiza(); }", ids)


async def obj(pg, oid):
    return await ev(pg, "id => { const o = OFI.interno.porId(id); return o ? JSON.parse(JSON.stringify(o)) : null; }", oid)


async def pagina_oficial(pw, P):
    """o racha.html publicado com o config.js de verdade do lado (nada por cima): a versão oficial"""
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    try:
        ctx = await b.new_context(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg = await ctx.new_page()
        erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)[:200]))
        await pg.goto((RAIZ / 'app' / 'public' / 'game' / 'racha.html').resolve().as_uri())
        await pg.wait_for_function('() => window.RACHA_V92 && document.getElementById("pop-ajustes")', polling=100, timeout=30000)
        await pg.wait_for_timeout(600)
        o = await ev(pg, """() => ({ v92: window.RACHA_V92, exp: !!(window.RACHA_CONFIG && window.RACHA_CONFIG.experimental),
          aba: !!document.getElementById('ajx-t-v92'), painel: !!document.getElementById('ajx-v92'), ab: !!document.getElementById('pa-v92ab'), db: !!document.getElementById('pa-v92db') })""")
        cfg = (RAIZ / 'app' / 'public' / 'game' / 'config.js').read_text(encoding='utf-8').split('window.RACHA_CONFIG', 1)[1]
        P.confere('experimental' not in cfg and o['v92'] and o['v92'].get('experimental') is False and o['v92'].get('versao', '').startswith('v92') and not o['exp'],
                  'a versão publicada é só a v92 oficial: o config.js não liga o modo de testes (window.RACHA_V92.experimental = false)', o)
        P.confere(not o['aba'] and not o['painel'] and not o['ab'] and not o['db'], 'nos AJUSTES não existe a aba TESTES v92, e a pausa não tem o A ⇄ B nem o DB', o)
        P.confere(not erros, 'a página publicada abre sem erro de JavaScript', erros[:3])
    finally:
        await b.close()


PIXELS = """(() => { const J = OFI.interno.OFJ, P = J.P, B = P.B, cv = document.getElementById('c'), g = cv.getContext('2d');
  const px = K * (W / 2 + (B.x - J.cx) * J.z), py = K * (H / 2 + (B.y - J.cy) * J.z), r = K * J.z * P.C.R_BOLA;
  const cor = (x, y) => { const d = g.getImageData(Math.round(x) - 1, Math.round(y) - 1, 3, 3).data; let s = [0, 0, 0]; for (let i = 0; i < 36; i += 4) { s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; } return s.map(v => Math.round(v / 9)); };
  const um = (x, y) => { const d = g.getImageData(Math.round(x), Math.round(y), 1, 1).data; return [d[0], d[1], d[2]]; };
  const borda = []; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; let m = null;   // (o mais escuro do raio, de 0,75 r até a beira: o contorno)
    for (let rr = r * .75; rr <= r; rr += .5) { const c = um(px + Math.cos(a) * rr, py + Math.sin(a) * rr); if (!m || Math.max(...c) < Math.max(...m)) m = c; } borda.push(m); }
  return { r, centro: cor(px, py), meio: cor(px + r * .45, py - r * .3), borda, fora: cor(px + r * 1.6, py) }; })()"""


async def principal():
    P = Placar('Oficina · a bola branca e as ferramentas novas do editor')
    async with async_playwright() as pw:
        # ---------------------------------------------------------------- 1) só a v92 oficial
        print('\n1) a versão publicada: só a v92 oficial (sem o painel de testes)')
        await pagina_oficial(pw, P)

        b, pg, erros = await abre(pw, 1280, 720, toque=True)
        await ev(pg, "() => { window.__vib = []; navigator.vibrate = p => { window.__vib.push(p); return true; }; }")
        await ev(pg, "() => OFI.abre('hub')")

        # ---------------------------------------------------------------- 2) a bola branca
        print('\n2) a bola: branca de contorno preto no TESTAR, a colorida e o painel Aparência')
        await novo_mapa(pg, 'classico')
        r = await ev(pg, "() => [OFI.interno.OFE.M.aparencia.bola, OFI.interno.OFE.M.aparencia.sombras]")
        P.confere(r == ['branca', True], 'o modelo (sem dizer nada) já vem com a bola branca e a sombra das peças', r)
        await ev(pg, "() => document.querySelector('.ofi-ed-testar').click()")
        ok = await espera(pg, "OFI.interno.OFJ.on && OFI.interno.OFJ.P.tick > 5", 4000)
        await pg.keyboard.press('Escape')
        await espera(pg, "!!OFI.interno.OFJ.menu", 2000)
        await ev(pg, """() => { const J = OFI.interno.OFJ, P = J.P; P.B.x = P.G.CX; P.B.y = P.G.CY; P.B.vx = P.B.vy = 0;
          P.jog.forEach((q, i) => { const k = i === J.eu ? 0 : i + 1; q.x = P.G.CX + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 70; q.y = P.G.CY + 150; q.vx = q.vy = 0; }); }""")
        await pg.wait_for_timeout(900)
        px = await rt(pg, PIXELS)
        branco = all(c >= 225 for c in px['centro']) and all(c >= 225 for c in px['meio'])
        preto = all(max(c) <= 60 for c in px['borda'])
        P.confere(ok and px['r'] >= 6 and branco and preto, 'no TESTAR a bola é BRANCA por dentro e tem o contorno PRETO em volta inteira (os pixels do canvas)', px)
        P.confere(sum(px['fora']) < 600 and px['fora'] != px['centro'], 'fora da bola é o piso (a bola não tem halo nem brilho branco em volta)', px['fora'])
        await ev(pg, "() => { const A = OFI.interno.OFJ.M.aparencia; A.bola = 'cor'; A.corBola = '#ff3b3b'; }")
        await pg.wait_for_timeout(300)
        px2 = await rt(pg, PIXELS)
        c = px2['centro']
        P.confere(c[0] >= 200 and c[1] <= 110 and c[2] <= 110 and all(max(q) <= 60 for q in px2['borda']), 'a bola COLORIDA (Aparência › Bola) pinta da cor escolhida, com o mesmo contorno preto', px2)
        await ev(pg, "() => { OFI.interno.OFJ.M.aparencia.bola = 'racha'; }")
        await pg.wait_for_timeout(300)
        px3 = await rt(pg, PIXELS)
        P.confere(px3['centro'] != px2['centro'], 'a bola do RACHA (a de sempre do jogo) também pode ser escolhida', px3['centro'])
        await ev(pg, "() => { const b = [...OFI.interno.OFJ.menu.querySelectorAll('button')].find(x => /VOLTAR AO EDITOR/.test(x.textContent)); b.click(); }")
        await espera(pg, "OFI.tela === 'editor' && !OFI.interno.OFJ.on", 3000)
        # o painel Aparência
        await ev(pg, "() => { const I = OFI.interno; I.OFE.painelAberto = true; I.OFE.sel.clear(); I.OFE.aba = 'aparencia'; I.painelAtualiza(); }")
        r = await ev(pg, """() => { const p = OFI.interno.EDU.painel, tits = [...p.querySelectorAll('.ofi-p-tit b')].map(b => b.textContent);
          const am = p.querySelector('canvas.ofi-bola-amostra'), d = am ? am.getContext('2d').getImageData(59, 35, 2, 2).data : null;
          const seg = [...p.querySelectorAll('.ofi-seg')].find(s => s.getAttribute('aria-label') === 'Estilo da bola');
          return { tits, amostra: d ? [d[0], d[1], d[2]] : null, estilos: seg ? [...seg.querySelectorAll('button')].map(b => b.textContent) : null,
            sombra: [...p.querySelectorAll('.ofi-f-rot')].some(l => /Sombra nas peças sólidas/.test(l.textContent)) }; }""")
        P.confere('Bola' in r['tits'] and 'Peças' in r['tits'] and r['estilos'] == ['Branca', 'Colorida', 'RACHA', 'Equipada'] and r['amostra'] and min(r['amostra']) >= 230 and r['sombra'],
                  'APARÊNCIA: a seção Bola (a amostra branca em cima do piso, o estilo Branca/Colorida/RACHA/Equipada — a da loja, v93) e a chave da sombra das peças', r)
        await ev(pg, "() => [...OFI.interno.EDU.painel.querySelectorAll('.ofi-seg[aria-label=\"Estilo da bola\"] button')].find(b => b.textContent === 'Colorida').click()")
        await pg.wait_for_timeout(150)
        r = await ev(pg, """() => { const I = OFI.interno, p = I.EDU.painel, am = p.querySelector('canvas.ofi-bola-amostra'), d = am.getContext('2d').getImageData(59, 35, 2, 2).data;
          return { bola: I.OFE.M.aparencia.bola, cor: [...p.querySelectorAll('.ofi-f-rot')].some(l => l.textContent === 'Cor da bola'), amostra: [d[0], d[1], d[2]] }; }""")
        P.confere(r['bola'] == 'cor' and r['cor'] and r['amostra'][0] > 200 and r['amostra'][2] < 120, 'COLORIDA: aparece o campo Cor da bola e a amostra pinta (amarela, o padrão)', r)
        await ev(pg, "() => [...OFI.interno.EDU.painel.querySelectorAll('.ofi-seg[aria-label=\"Estilo da bola\"] button')].find(b => b.textContent === 'Branca').click()")
        await ev(pg, "() => { const l = [...OFI.interno.EDU.painel.querySelectorAll('.ofi-f')].find(f => /Sombra nas peças sólidas/.test(f.textContent)); l.querySelector('button[role=switch]').click(); }")
        r = await ev(pg, "() => [OFI.interno.OFE.M.aparencia.bola, OFI.interno.OFE.M.aparencia.sombras]")
        P.confere(r == ['branca', False], 'a bola volta para a Branca e a chave desliga a sombra das peças (as duas entram no desfazer)', r)
        await ev(pg, "() => OFI.interno.desfaz()")
        r = await ev(pg, "() => OFI.interno.OFE.M.aparencia.sombras")
        P.confere(r is True, 'DESFAZER liga a sombra de novo', r)

        # ---------------------------------------------------------------- 3) lançar a bola
        print('\n3) LANÇAR A BOLA: a mira, o caminho antes de soltar, o chute de verdade, o gol e a batida')
        await novo_mapa(pg, 'classico')
        await ev(pg, "() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); }")
        await pg.keyboard.press('b')
        r = await ev(pg, "() => [OFI.interno.OFE.ferr, !!document.querySelector('.ofi-ferr[data-f=bola].on')]")
        P.confere(r == ['bola', True], 'a tecla B escolhe LANÇAR A BOLA (o botão novo das ferramentas acende)', r)
        a = await tela_de(pg, -12, 0)
        await arrasta(pg, a[0], a[1], a[0] + 230, a[1], solta=False)
        await pg.wait_for_timeout(120)
        r = await ev(pg, """() => { const I = OFI.interno, A = I.OFE.arr, pv = I.miraPrevia(A);
          return { tipo: A && A.tipo, med: I.medidaTexto(A), pts: pv.pts.length, fim: pv.fim && pv.fim.t, lanca: !!I.OFE.lanca, x0: A.w0[0], gx: I.OFE.G.gols.map(g => g.cx) }; }""")
        P.confere(r['tipo'] == 'mira' and r['pts'] > 20 and r['fim'] == 'gol' and not r['lanca'], 'a MIRA: antes de soltar, a linha do caminho (rodada no motor do mapa) já mostra que a bola entra no gol', r)
        P.confere(r['med'].startswith('100% do chute') and 'u/s' in r['med'], 'a etiqueta da força: "100% do chute · 34 u/s" (arrastar longe = a força toda do CHUTE)', r['med'])
        await ponteiro(pg, 'pointerup', a[0] + 230, a[1])
        ok = await espera(pg, "OFI.interno.OFE.lanca && OFI.interno.OFE.lanca.msg === 'GOL!'", 4000)
        r = await ev(pg, "() => { const L = OFI.interno.OFE.lanca; return L ? { msg: L.msg, sub: L.sub, trilha: L.trilha.length, mesmo: L.P.G === OFI.interno.OFE.G, vazias: L.P.jog.every(q => q.fora) } : null; }")
        P.confere(bool(ok and r and r['trilha'] > 20 and r['mesmo'] and r['vazias'] and 'gol do' in r['sub']),
                  'SOLTAR chuta de verdade: a bola corre no motor do mapa (sem ninguém em campo), deixa a trilha e o GOL! aparece (no gol do Time B)', r)
        vib = await ev(pg, "() => window.__vib.slice()")
        P.confere(any(v in (14, 28) for v in vib if isinstance(v, int)) and any(isinstance(v, list) for v in vib), 'o celular treme no chute e no gol (navigator.vibrate)', vib[-6:])
        sumiu = await espera(pg, "!OFI.interno.OFE.lanca", 6000)
        P.confere(sumiu, 'depois do gol a bola de teste some sozinha (o mapa fica como estava)')
        # a batida: para cima, na linha do campo
        c = await tela_de(pg, 0, 0)
        await arrasta(pg, c[0], c[1], c[0], c[1] - 200, solta=False)
        await pg.wait_for_timeout(100)
        bat = await ev(pg, "() => OFI.interno.miraPrevia(OFI.interno.OFE.arr).batidas.length")
        await ponteiro(pg, 'pointerup', c[0], c[1] - 200)
        ok = await espera(pg, "OFI.interno.OFE.lanca && OFI.interno.OFE.lanca.batidas >= 1", 3000)
        P.confere(bat >= 1 and ok, 'para cima: a prévia marca a batida na linha e a bola de verdade bate e volta (o anel da batida)', bat)
        # mudar o mapa some com a bola; o toque sem arrasto não chuta; trocar de ferramenta para
        await ev(pg, "() => { const I = OFI.interno; I.muda(M => { M.partida.meta = 3; }); }")
        await pg.wait_for_timeout(120)
        P.confere(await ev(pg, "() => !OFI.interno.OFE.lanca"), 'mudou o mapa: a bola de teste some na hora (ela era do mapa de antes)')
        await ponteiro(pg, 'pointerdown', c[0], c[1]); await ponteiro(pg, 'pointerup', c[0], c[1])
        await pg.wait_for_timeout(100)
        r = await ev(pg, "() => [!!OFI.interno.OFE.lanca, (document.querySelector('.ofi-aviso') || {}).textContent || '']")
        P.confere(not r[0] and 'Arraste' in r[1], 'o toque sem arrastar não chuta: o aviso explica (arraste para onde a bola vai)', r)
        await arrasta(pg, c[0], c[1], c[0] + 120, c[1] + 40)
        await pg.wait_for_timeout(80)
        await ev(pg, "() => OFI.interno.escolheFerr('sel')")
        await pg.wait_for_timeout(80)
        P.confere(await ev(pg, "() => !OFI.interno.OFE.lanca && OFI.interno.OFE.ferr === 'sel'"), 'trocar de ferramenta tira a bola de teste')

        # ---------------------------------------------------------------- 4) copiar para o outro lado
        print('\n4) COPIAR PARA O OUTRO LADO (os times trocados)')
        await novo_mapa(pg)
        cores = await ev(pg, "() => OFI.interno.OFE.M.partida.times.map(t => t.cor)")
        ids = []
        ids.append(await poe(pg, {'tipo': 'parede', 'x': -15, 'y': 6, 'comp': 8, 'rot': 30, 'cor': cores[0]}))
        ids.append(await poe(pg, {'tipo': 'gol', 'x': -30, 'y': -14, 'rot': 0, 'largura': 6, 'prof': 3, 'dono': 0}))
        ids.append(await poe(pg, {'tipo': 'zona', 'x': -12, 'y': -6, 'w': 6, 'h': 4, 'efeito': 'impulso', 'dir': 20, 'equipe': 0}))
        ids.append(await poe(pg, {'tipo': 'spawn', 'x': -10, 'y': 3, 'equipe': 0, 'ordem': 3}))
        ids.append(await poe(pg, {'tipo': 'botao', 'x': -18, 'y': 12, 'equipe': 0}))
        p1 = await poe(pg, {'tipo': 'portal', 'x': -22, 'y': -12}); p2 = await poe(pg, {'tipo': 'portal', 'x': -32, 'y': 12})
        await ev(pg, "([a, b]) => OFI.interno.muda(M => { M.objetos.find(o => o.id === a).par = b; M.objetos.find(o => o.id === b).par = a; })", [p1, p2])
        meio = await poe(pg, {'tipo': 'obstaculo', 'forma': 'retangulo', 'x': 0, 'y': 18, 'w': 4, 'h': 2})
        ids += [p1, p2]
        n0 = await ev(pg, "() => OFI.interno.OFE.M.objetos.length")
        await seleciona(pg, ids + [meio])
        tit = await ev(pg, "() => [...OFI.interno.EDU.selBar.querySelectorAll('button')].map(b => b.title)")
        P.confere('Copiar para o outro lado (times trocados)' in tit and 'Repetir em fila ou em círculo' in tit, 'a barra da seleção tem COPIAR PARA O OUTRO LADO e REPETIR', tit)
        await ev(pg, "() => [...OFI.interno.EDU.selBar.querySelectorAll('button')].find(b => b.title === 'Copiar para o outro lado (times trocados)').click()")
        await pg.wait_for_timeout(150)
        novos = await ev(pg, "() => [...OFI.interno.OFE.sel]")
        cop = {}
        for nid in novos:
            o = await obj(pg, nid)
            cop[o['tipo']] = cop.get(o['tipo'], []) + [o]
        n1 = await ev(pg, "() => OFI.interno.OFE.M.objetos.length")
        P.confere(n1 == n0 + 7 and len(novos) == 7, 'as 7 peças fora do meio ganharam a cópia (a do meio ficou como estava)', (n0, n1, len(novos)))
        w = cop.get('parede', [{}])[0]
        P.confere(w.get('x') == 15 and w.get('y') == 6 and w.get('rot') == 330 and str(w.get('cor', '')).lower() == str(cores[1]).lower(),
                  'a PAREDE girada 30° vai para x = +15 girada 330° (o espelho), e a cor do Time A vira a do Time B', w)
        g = cop.get('gol', [{}])[0]
        P.confere(g.get('x') == 30 and g.get('y') == -14 and g.get('rot') == 180 and g.get('dono') == 1, 'o GOL do Time A vira o gol do Time B do outro lado, de boca para o outro lado', g)
        z = cop.get('zona', [{}])[0]; s = cop.get('spawn', [{}])[0]; bt = cop.get('botao', [{}])[0]
        P.confere(z.get('equipe') == 1 and z.get('dir') == 160 and z.get('x') == 12 and s.get('equipe') == 1 and s.get('x') == 10 and s.get('ordem') == 3 and bt.get('equipe') == 1,
                  'a ZONA (empurra para o lado espelhado), o SPAWN e o BOTÃO do Time A viram do Time B', [z.get('equipe'), z.get('dir'), s.get('equipe'), bt.get('equipe')])
        ps = cop.get('portal', [])
        P.confere(len(ps) == 2 and ps[0]['par'] == ps[1]['id'] and ps[1]['par'] == ps[0]['id'] and sorted(p['x'] for p in ps) == [22, 32],
                  'o PAR DE PORTAIS copiado continua em par (um leva ao outro, os novos)', [(p['id'], p['par'], p['x']) for p in ps])
        r = await ev(pg, "() => [OFI.interno.OFE.erros.length, (document.querySelector('.ofi-aviso') || {}).textContent || '']")
        P.confere(r[0] == 0 and 'outro lado' in r[1] and 'meio' in r[1], 'o mapa continua válido e o aviso conta o que foi (e que a peça do meio ficou)', r)
        await ev(pg, "() => OFI.interno.desfaz()")
        P.confere(await ev(pg, "() => OFI.interno.OFE.M.objetos.length") == n0, 'DESFAZER tira todas as cópias de uma vez')

        # ---------------------------------------------------------------- 5) repetir
        print('\n5) REPETIR: em fila e em círculo')
        o1 = await poe(pg, {'tipo': 'obstaculo', 'forma': 'retangulo', 'x': -20, 'y': 0, 'w': 2, 'h': 2})
        await seleciona(pg, [o1])
        novos = await ev(pg, "() => OFI.interno.repeteSel('fila', { n: 4, dx: 5, dy: 0 })")
        xs = sorted([(await obj(pg, i))['x'] for i in novos])
        P.confere(xs == [-15, -10, -5, 0], 'EM FILA: 4 cópias de 5 em 5 u para o lado', xs)
        o2 = await poe(pg, {'tipo': 'obstaculo', 'forma': 'retangulo', 'x': 10, 'y': 0, 'w': 3, 'h': 1, 'rot': 0})
        await seleciona(pg, [o2])
        novos = await ev(pg, "() => OFI.interno.repeteSel('circulo', { n: 6, raio: 10, gira: true })")
        cs = [await obj(pg, i) for i in novos]
        import math
        boas = all(abs(math.hypot(o['x'], o['y']) - 10) < 0.02 for o in cs)
        angs = sorted(round(math.degrees(math.atan2(o['y'], o['x'])) % 360) for o in cs)
        rots = sorted(round(o['rot']) % 360 for o in cs)
        P.confere(len(cs) == 5 and boas and angs == [60, 120, 180, 240, 300] and rots == [60, 120, 180, 240, 300],
                  'EM CÍRCULO: 6 no total em volta do centro (raio 10 u, de 60 em 60°), cada cópia girada junto', (angs, rots))
        # pela janela
        o3 = await poe(pg, {'tipo': 'obstaculo', 'forma': 'circulo', 'x': 0, 'y': -12, 'w': 2, 'h': 2})
        await seleciona(pg, [o3])
        n0 = await ev(pg, "() => OFI.interno.OFE.M.objetos.length")
        await ev(pg, "() => [...OFI.interno.EDU.selBar.querySelectorAll('button')].find(b => b.title === 'Repetir em fila ou em círculo').click()")
        await espera(pg, "!!document.querySelector('.ofi-jan')", 2000)
        await ev(pg, "() => [...document.querySelectorAll('.ofi-jan .ofi-seg button')].find(b => b.textContent === 'Em círculo').click()")
        await ev(pg, "() => [...document.querySelectorAll('.ofi-jan .ofi-jan-pe button')].find(b => /REPETIR/.test(b.textContent)).click()")
        await pg.wait_for_timeout(150)
        r = await ev(pg, "() => [OFI.interno.OFE.M.objetos.length, OFI.interno.OFE.sel.size, !!document.querySelector('.ofi-jan')]")
        P.confere(r[0] == n0 + 7 and r[1] == 8 and not r[2], 'a janela REPETIR › Em círculo (8 peças, o padrão) põe 7 cópias e deixa as 8 selecionadas', r)
        # o limite do mapa (12 gols)
        gid = await ev(pg, "() => OFI.interno.OFE.M.objetos.find(o => o.tipo === 'gol').id")
        await seleciona(pg, [gid])
        n0 = await ev(pg, "() => OFI.interno.OFE.M.objetos.length")
        r = await ev(pg, "() => OFI.interno.repeteSel('fila', { n: 12, dx: 1, dy: 0 })")
        aviso = await ev(pg, "() => (document.querySelector('.ofi-aviso') || {}).textContent || ''")
        P.confere(r is None and await ev(pg, "() => OFI.interno.OFE.M.objetos.length") == n0 and '12 gols' in aviso, 'repetir além do limite (mais de 12 gols) não faz nada e avisa', aviso)

        # ---------------------------------------------------------------- 6) as medidas e as guias
        print('\n6) AS MEDIDAS e AS GUIAS')
        await novo_mapa(pg)
        await ev(pg, "() => OFI.interno.escolheFerr('parede')")
        a = await tela_de(pg, -10, -10); bb = await tela_de(pg, 0, -10)
        await arrasta(pg, a[0], a[1], bb[0], bb[1], solta=False)
        med = await ev(pg, "() => OFI.interno.medidaTexto(OFI.interno.OFE.arr)")
        await ponteiro(pg, 'pointerup', bb[0], bb[1])
        P.confere(med == '10 u · 0°', 'desenhando a parede, a etiqueta mostra o comprimento e o ângulo ("10 u · 0°")', med)
        ref = await poe(pg, {'tipo': 'obstaculo', 'forma': 'retangulo', 'x': -12.3, 'y': 4.1, 'w': 2, 'h': 2})
        mov = await poe(pg, {'tipo': 'obstaculo', 'forma': 'retangulo', 'x': 20, 'y': -15, 'w': 2, 'h': 2})
        await ev(pg, "() => OFI.interno.OFE.sel.clear()")
        de = await tela_de(pg, 20, -15); alvo = await tela_de(pg, 12.3, 4.1)
        await arrasta(pg, de[0], de[1], alvo[0] + 3, alvo[1] - 2, solta=False)
        r = await ev(pg, "() => { const I = OFI.interno, A = I.OFE.arr; return { med: I.medidaTexto(A), guia: A.guia && A.guia.tx }; }")
        await ponteiro(pg, 'pointerup', alvo[0] + 3, alvo[1] - 2)
        o = await obj(pg, mov)
        P.confere(o['x'] == 12.3 and o['y'] == 4.1 and r['guia'] == 'espelho' and 'espelhado' in r['med'],
                  'GUIA DO ESPELHO: soltar perto do lugar espelhado de outra peça encaixa nele (x = 12,3, y = 4,1: fora da grade) e a etiqueta diz "espelhado"', (o['x'], o['y'], r))
        de = await tela_de(pg, 12.3, 4.1); alvo = await tela_de(pg, 25, 7.4)
        alt = await poe(pg, {'tipo': 'obstaculo', 'forma': 'circulo', 'x': -30, 'y': 7.3, 'w': 2, 'h': 2})
        await ev(pg, "() => OFI.interno.OFE.sel.clear()")
        await arrasta(pg, de[0], de[1], alvo[0], alvo[1])
        o = await obj(pg, mov)
        P.confere(o['y'] == 7.3, 'GUIA DE ALINHAMENTO: perto da altura de outra peça, encaixa na altura dela (y = 7,3)', o['y'])
        await ev(pg, "() => { OFI.interno.OFE.encaixa = false; OFI.interno.OFE.sel.clear(); }")
        de = await tela_de(pg, o['x'], o['y']); alvo = await tela_de(pg, 12.3, 4.1)
        await arrasta(pg, de[0], de[1], alvo[0] + 3, alvo[1] - 2)
        o = await obj(pg, mov)
        P.confere(not (o['x'] == 12.3 and o['y'] == 4.1), 'com o ÍMÃ desligado nada encaixa (a peça fica onde o dedo soltou)', (o['x'], o['y']))
        await ev(pg, "() => { OFI.interno.OFE.encaixa = true; }")
        # girar pela alça: a etiqueta do ângulo
        await seleciona(pg, [ref])
        al = await ev(pg, "() => OFI.interno.alcas().find(a => a.tipo === 'girar')")
        cc = await tela_de(pg, -12.3, 4.1)
        await arrasta(pg, al['x'], al['y'], cc[0] + 120, cc[1], solta=False)
        med = await ev(pg, "() => OFI.interno.medidaTexto(OFI.interno.OFE.arr)")
        await ponteiro(pg, 'pointerup', cc[0] + 120, cc[1])
        P.confere(med == '90°', 'girando pela alça, a etiqueta mostra o ângulo (90°, de 15 em 15 com o ímã)', med)

        # ---------------------------------------------------------------- 7) a vibração
        print('\n7) A VIBRAÇÃO (e a chave do jogo)')
        await ev(pg, "() => { window.__vib.length = 0; }")
        x = await poe(pg, {'tipo': 'obstaculo', 'forma': 'retangulo', 'x': 5, 'y': 5, 'w': 2, 'h': 2})
        await seleciona(pg, [x]); await ev(pg, "() => OFI.interno.exclui()")
        vib = await ev(pg, "() => window.__vib.slice()")
        P.confere(10 in vib and 20 in vib, 'criar uma peça dá um toque curto e apagar um mais longo', vib)
        await rt(pg, "(CONTA.vibrar = false, 1)")
        await ev(pg, "() => { window.__vib.length = 0; }")
        x = await poe(pg, {'tipo': 'obstaculo', 'forma': 'retangulo', 'x': 6, 'y': 6, 'w': 2, 'h': 2})
        await seleciona(pg, [x]); await ev(pg, "() => OFI.interno.exclui()")
        vib = await ev(pg, "() => window.__vib.slice()")
        await rt(pg, "(CONTA.vibrar = true, 1)")
        P.confere(vib == [], 'com a Vibração desligada nos Ajustes do jogo, a Oficina não treme', vib)

        # ---------------------------------------------------------------- 8) as sombras
        print('\n8) AS SOMBRAS das peças sólidas')
        r = await ev(pg, """() => { const I = OFI.interno, base = JSON.parse(JSON.stringify(I.OFE.M));
          const mede = sombras => { const m = JSON.parse(JSON.stringify(base)); m.aparencia.sombras = sombras;
            m.objetos = [{ id: 'w1', tipo: 'parede', x: 0, y: 0, comp: 10, esp: 1, rot: 0 }, { id: 'sb', tipo: 'spawnBola', x: 0, y: 10 }];
            const l = RachaMapa.limpa(m), M = l.mapa, G = RachaMapa.compila(M), o = M.objetos[0];
            const cv = document.createElement('canvas'); cv.width = Math.ceil(G.MW); cv.height = Math.ceil(G.MH); const g = cv.getContext('2d');
            I.DES.objeto(g, M, G, o, 0, { on: true, vis: true, aberto: false, ligado: false, press: false, T: null, cor: '' }, {});
            const a = (x, y) => g.getImageData(Math.round(G.CX + x), Math.round(G.CY + y), 1, 1).data[3];
            return { abaixo: a(0, 15), acima: a(0, -15), parede: a(0, 0) }; };
          return { com: mede(true), sem: mede(false) }; }""")
        P.confere(r['com']['parede'] > 200 and r['com']['abaixo'] > 40 and r['com']['acima'] == 0, 'a parede tem a sombra embaixo (a luz vem de cima, à esquerda) e nada em cima', r['com'])
        P.confere(r['sem']['abaixo'] == 0 and r['sem']['parede'] > 200, 'com a sombra desligada na Aparência, a parede fica sem sombra', r['sem'])

        P.confere(not [e for e in erros if 'Oficina' in e or 'TypeError' in e or 'ReferenceError' in e], 'sem erros no console', erros[:5])
        await b.close()
    return P.fim()

roda(principal())
