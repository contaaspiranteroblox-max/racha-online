"""v92 · OFICINA DE CRIAÇÃO 2.0 — o cliente no navegador de verdade (sem servidor: tudo o que roda no aparelho).

Abre a cópia de teste do jogo (tests/build/racha_teste.html) no Chromium e usa a Oficina como quem cria um mapa:
  1) o botão OFICINA na tela inicial (568×320 a 1920×1080: aparece, cabe e abre) e a central (as abas, sem servidor);
  2) criar do zero (os 6 tamanhos × os 9 formatos) e os 15 modelos: todos válidos, todos abrem no editor e jogam no TESTAR;
  3) as ferramentas pelo toque (ponteiros de verdade no canvas do editor): parede, curva, retângulo, círculo, zona,
     linha e polígono desenhados; selecionar, mover, girar e redimensionar pelas alças; caixa de seleção; câmera (arrastar,
     zoom de dois dedos, roda); duplicar, excluir, copiar e colar, desfazer e refazer, agrupar e desagrupar, bloquear,
     ocultar, alinhar, distribuir, espelhar, ordem, grade e encaixe; o painel de propriedades e as abas do mapa; camadas;
     spawns automáticos; a lógica QUANDO → ENTÃO; a biblioteca inteira; a validação;
  4) salvar: o automático, o manual (Ctrl+S), as versões (voltar para uma), a recuperação depois de o aparelho "travar"
     (recarregar sem salvar), duplicar, renomear, apagar, exportar e importar (o mesmo mapa de volta, e um arquivo ruim);
  5) o TESTAR: o chute de verdade (os botões do jogo), o gol, o placar, o fim com o resultado, jogar de novo, trocar de
     time, os bots ligados e desligados, ver as colisões, a pausa e a volta para o editor do jeito que estava;
  6) o jogo de sempre continua: depois da Oficina, o treino do jogo roda (o laço do quadro volta para ele).
Rodar:  python3 tests/oficina_cliente_test.py
"""
import asyncio, json, sys, time
from comum import Placar, abre, rt, roda, async_playwright

I = "OFI.interno"

async def ev(pg, js, *a):
    return await pg.evaluate(js, *a) if a else await pg.evaluate(js)

async def espera(pg, js, ms=5000):
    t0 = time.time()
    while True:
        try:
            v = await pg.evaluate(js)
        except Exception:
            v = None
        if v:
            return v
        if (time.time() - t0) * 1000 > ms:
            return v
        await asyncio.sleep(.08)

# ponteiro de verdade no canvas do editor (o mesmo caminho do dedo: pointerdown/move/up nas coordenadas da tela)
PONTEIRO = """(([tipo, x, y, id, pt, botoes]) => {
  const cv = OFI.interno.EDU.cv, r = cv.getBoundingClientRect();
  const e = new PointerEvent(tipo, { clientX: r.left + x, clientY: r.top + y, pointerId: id || 1, pointerType: pt || 'touch', isPrimary: (id || 1) === 1, bubbles: true, cancelable: true, buttons: tipo === 'pointerup' ? 0 : 1, button: botoes || 0 });
  cv.dispatchEvent(e); return true; })"""

async def toque(pg, x, y, id=1):
    await ev(pg, PONTEIRO, ['pointerdown', x, y, id])
    await ev(pg, PONTEIRO, ['pointerup', x, y, id])

async def arrasta(pg, x0, y0, x1, y1, n=6, id=1, pt='touch'):
    await ev(pg, PONTEIRO, ['pointerdown', x0, y0, id, pt])
    for k in range(1, n + 1):
        await ev(pg, PONTEIRO, ['pointermove', x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, id, pt])
    await ev(pg, PONTEIRO, ['pointerup', x1, y1, id, pt])

async def tela_de(pg, ux, uy):
    """(u do mapa) → (px do canvas do editor)"""
    return await ev(pg, "([x, y]) => { const I = OFI.interno, w = I.uParaMundo(x, y); return I.mundoParaTela(w[0], w[1]); }", [ux, uy])

async def novo_mapa(pg, modelo=None, tam='pequeno', formato='retangulo'):
    js = """async ([modelo, tam, formato]) => { const I = OFI.interno; let M;
      if (modelo) { const md = I.MODELOS.find(m => m.id === modelo); M = I.limpaModelo(md.faz(), md.nome); }
      else M = I.limpaModelo(I.mapaDoZero(tam, formato, 90, 60), 'teste');
      const reg = await I.novoRascunho(M); await I.editorAbre(reg); await new Promise(r => setTimeout(r, 120)); I.edAjusta(); return reg.id; }"""
    return await ev(pg, js, [modelo, tam, formato])

async def objs(pg):
    return await ev(pg, "() => OFI.interno.OFE.M.objetos.map(o => Object.assign({}, o))")

async def principal():
    P = Placar('Oficina · o cliente (editor, central, TESTAR)')
    async with async_playwright() as pw:
        # ---------------------------------------------------------------- 1) o botão e a central em vários tamanhos
        print('\n1) o botão OFICINA na tela inicial e a central (vários tamanhos de tela)')
        for (w, h) in [(568, 320), (640, 360), (844, 390), (1024, 768), (1280, 720), (1920, 1080)]:
            b, pg, erros = await abre(pw, w, h, toque=True)
            # (v102: o lobby com menos coisa na tela — a OFICINA é o botão da barra de atalhos, que toca o de sempre)
            r = await ev(pg, """() => { const b = (document.querySelector('#lb.v102') && [...document.querySelectorAll('#lb .v102-doca-bt')].find(x => /OFICINA/.test(x.textContent))) || document.getElementById('ofi-lobby'); if (!b) return null; const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
              const dentro = r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
              const outros = [...document.querySelectorAll('#lb button, #lb .rx-bt')].filter(x => x !== b && x.offsetParent && !b.contains(x)).map(x => x.getBoundingClientRect()).filter(q => q.width > 4 && q.height > 4);
              const cobre = outros.some(q => !(q.right <= r.left + 2 || q.left >= r.right - 2 || q.bottom <= r.top + 2 || q.top >= r.bottom - 2));
              return { dentro, clica: !!e && (e === b || b.contains(e)), cobre, w: Math.round(r.width), h: Math.round(r.height) }; }""")
            P.confere(r and r['dentro'] and r['clica'] and not r['cobre'] and r['h'] >= 30, '%dx%d: o botão OFICINA aparece inteiro, sem cobrir outro botão, e recebe o toque' % (w, h), r)
            box = await ev(pg, "() => { const b = (document.querySelector('#lb.v102') && [...document.querySelectorAll('#lb .v102-doca-bt')].find(x => /OFICINA/.test(x.textContent))) || document.getElementById('ofi-lobby'); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }")
            await pg.touchscreen.tap(box[0], box[1])
            ok = await espera(pg, "OFI.aberta && OFI.tela === 'hub' && !OFI.raiz.hidden", 3000)
            sem_rolar = await ev(pg, "() => document.scrollingElement.scrollWidth <= innerWidth + 1 && [...document.querySelectorAll('.ofi-hub-topo .ofi-bt')].every(b => b.getBoundingClientRect().right <= innerWidth + 1)")
            P.confere(ok and sem_rolar, '%dx%d: o toque abre a central (cabe na tela, nada passa da borda)' % (w, h))
            if (w, h) == (844, 390):
                abas = await ev(pg, "() => [...document.querySelectorAll('.ofi-hub-aba')].filter(b => !b.hidden).map(b => b.dataset.a)")
                P.confere(set(['meus', 'dev', 'comunidade', 'populares', 'recentes', 'favoritos', 'oficiais', 'compartilhados']) <= set(abas) and 'importar' not in abas, 'a central tem Meus mapas, Em desenvolvimento, Comunidade, Populares, Recentes, Favoritos, Oficiais e Compartilhados (o Importar saiu)', abas)
                falhas = []
                for a in abas:
                    await ev(pg, "a => OFI.interno.mudaAba(a)", a)
                    await pg.wait_for_timeout(250)
                    txt = await ev(pg, "() => OFI.raiz.innerText")
                    if 'null' in txt or 'undefined' in txt or 'NaN' in txt:
                        falhas.append(a)
                P.confere(not falhas, 'todas as abas abrem sem texto quebrado (null/undefined/NaN)', falhas)
                await ev(pg, "() => OFI.interno.mudaAba('comunidade')")
                await pg.wait_for_timeout(700)
                txt = await ev(pg, "() => OFI.raiz.innerText")
                P.confere('Sem conexão' in txt or 'servidor' in txt, 'sem o servidor das salas, a Comunidade avisa (os mapas do aparelho e os modelos continuam)')
                await ev(pg, "() => OFI.interno.mudaAba('oficiais')")
                await pg.wait_for_timeout(300)
                n = await ev(pg, "() => document.querySelectorAll('.ofi-cartao').length")
                P.confere(n >= 15, 'a aba Oficiais mostra os 15 modelos do RACHA mesmo sem internet', n)
                ok = await ev(pg, "() => { const b = document.querySelector('.ofi-hub-topo .ofi-voltar'); b.click(); return !OFI.aberta && !document.getElementById('lb').hidden; }")
                P.confere(ok, 'VOLTAR fecha a Oficina e o lobby do jogo volta')
            P.confere(not erros, '%dx%d: sem erros no console' % (w, h), erros[:3])
            await b.close()

        b, pg, erros = await abre(pw, 844, 390, toque=True)
        await ev(pg, "() => OFI.abre('hub')")
        # (v94 + Oficina: o TESTAR começa com o 3, 2, 1, JÁ! da v93 — conferido no tests/ajustes_linhas_test.py; aqui ele fica
        #  desligado pela chave da pausa, guardada no aparelho, para o teste continuar medindo o TESTAR "na hora")
        await ev(pg, "() => { try { localStorage.setItem('racha-ofi-contagem', '0'); } catch (_) {} OFI.interno.OFJ.semContagem = true; return true; }")
        # ---------------------------------------------------------------- 2) do zero e os modelos
        print('\n2) criar do zero (tamanhos × formatos) e os 15 modelos')
        r = await ev(pg, """() => { const I = OFI.interno, ruins = [];
          for (const tam of Object.keys(I.TAMANHOS).concat([null])) for (const f of I.FORMATOS) {
            const M = I.mapaDoZero(tam, f.id, 77, 55), l = RachaMapa.limpa(M);
            if (!l.ok) { ruins.push((tam || 'personalizado') + '/' + f.id + ': ' + l.erros.join(',')); continue; }
            try { const G = RachaMapa.compila(l.mapa), P = RachaMapa.novaPartida(l.mapa, { porTime: l.mapa.partida.porTime, jogadores: [] }); for (let i = 0; i < 120; i++) P.passo(); if (!Number.isFinite(P.B.x)) ruins.push(f.id + ' NaN'); }
            catch (e) { ruins.push((tam || 'pers') + '/' + f.id + ' ' + e.message); } }
          return ruins; }""")
        P.confere(not r, 'os 6 tamanhos (Mini, Pequeno, Médio, Grande, Gigante, Personalizado) × os 9 formatos viram mapas válidos que jogam', r)
        r = await ev(pg, """() => { const I = OFI.interno, ruins = [], ok = [];
          for (const md of I.MODELOS) { const cru = md.faz(), l = RachaMapa.limpa(cru);
            if (!l.ok) { ruins.push(md.nome + ': ' + l.erros.join(',')); continue; }
            const P = RachaMapa.novaPartida(l.mapa, { porTime: l.mapa.partida.porTime, jogadores: [], seed: 7 }), x0 = P.jog.map(q => q.x);
            for (let i = 0; i < 600 && P.on; i++) P.passo();
            const mexeu = P.jog.some((q, i) => Math.abs(q.x - x0[i]) > 1 || P.estado !== 'saida');
            if (!Number.isFinite(P.B.x) || !mexeu) ruins.push(md.nome + ' (parado ou NaN)'); else ok.push(md.id); }
          return { n: I.MODELOS.length, ruins, nomes: I.MODELOS.map(m => m.nome) }; }""")
        esperados = ['Campo Clássico RACHA', 'Mini Arena X1', 'Futsal Brasileiro', 'Arena Circular', 'Campo Gigante', 'Arena de Quatro Gols', 'Campo com Obstáculos', 'Campo de Treinamento',
                     'Labirinto de Bola', 'Arena Neon', 'Futebol de Rua', 'Quadra de Favela', 'Arena Técnica', 'Campo Assimétrico', 'Mapa Vazio']
        P.confere(r['n'] == 15 and set(esperados) <= set(r['nomes']), 'os 15 modelos pedidos existem (Campo Clássico RACHA … Mapa Vazio)', r['nomes'])
        P.confere(not r['ruins'], 'os 15 modelos são válidos e a partida anda com os bots em todos (10 s de jogo cada)', r['ruins'])
        # abrir cada modelo no editor e testar rapidinho
        falhas = []
        for mid in await ev(pg, "() => OFI.interno.MODELOS.map(m => m.id)"):
            await novo_mapa(pg, mid)
            e = await ev(pg, "() => [OFI.tela, OFI.interno.OFE.erros.length, OFI.interno.OFE.M.objetos.length]")
            if e[0] != 'editor' or e[1]:
                falhas.append((mid, e)); continue
            await ev(pg, "() => document.querySelector('.ofi-ed-testar').click()")
            ok = await espera(pg, "OFI.interno.OFJ.on && OFI.interno.OFJ.P && OFI.interno.OFJ.P.tick > 20", 3000)
            if not ok:
                falhas.append((mid, 'testar'))
            await ev(pg, "() => OFI.interno.OFJ.sai()")
            await espera(pg, "OFI.tela === 'editor' && !OFI.raiz.hidden", 2000)
        P.confere(not falhas, 'cada modelo abre no editor sem erro e o TESTAR roda (e volta para o editor)', falhas)
        P.confere(not erros, 'sem erros no console nos modelos', erros[:3])

        # ---------------------------------------------------------------- 3) as ferramentas pelo toque
        print('\n3) as ferramentas pelo toque, as alças, a câmera, o painel, as camadas, a lógica e a biblioteca')
        await novo_mapa(pg, None, 'medio', 'retangulo')
        await ev(pg, "() => { const I = OFI.interno; I.OFE.encaixa = true; I.OFE.passo = 0.5; I.escolheFerr('parede'); }")
        a = await tela_de(pg, -10, -12); c = await tela_de(pg, 10, -12)
        n0 = len(await objs(pg))
        await arrasta(pg, a[0], a[1], c[0], c[1])
        os_ = await objs(pg); par = [o for o in os_ if o['tipo'] == 'parede']
        P.confere(len(os_) == n0 + 1 and par and abs(par[-1]['comp'] - 20) < 0.6 and abs(par[-1]['y'] + 12) < 0.6, 'PAREDE: arrastar desenha a parede reta do tamanho do arrasto (20 u, encaixada na grade)', par[-1] if par else os_)
        pid = par[-1]['id']
        sel = await ev(pg, "() => [...OFI.interno.OFE.sel]")
        P.confere(sel == [pid], 'o objeto novo fica selecionado (e a ferramenta volta para Selecionar)', sel)
        # mover arrastando
        m = await tela_de(pg, 0, -12); d = await tela_de(pg, 6, -6)
        await arrasta(pg, m[0], m[1], d[0], d[1])
        o = [x for x in await objs(pg) if x['id'] == pid][0]
        P.confere(abs(o['x'] - 6) < 0.6 and abs(o['y'] + 6) < 0.6, 'MOVER: arrastar o objeto leva ele junto (encaixado na grade)', (o['x'], o['y']))
        # desfazer / refazer
        await ev(pg, "() => OFI.interno.desfaz()")
        o = [x for x in await objs(pg) if x['id'] == pid][0]
        P.confere(abs(o['x']) < 0.01 and abs(o['y'] + 12) < 0.01, 'DESFAZER volta a parede para onde estava', (o['x'], o['y']))
        await ev(pg, "() => OFI.interno.refaz()")
        o = [x for x in await objs(pg) if x['id'] == pid][0]
        P.confere(abs(o['x'] - 6) < 0.6, 'REFAZER leva de novo', o['x'])
        # girar pela alça
        al = await ev(pg, "() => OFI.interno.alcas()")
        g = [x for x in al if x['tipo'] == 'girar']
        cen = await tela_de(pg, o['x'], o['y'])
        if g:
            await arrasta(pg, g[0]['x'], g[0]['y'], cen[0] + 60, cen[1])
        o2 = [x for x in await objs(pg) if x['id'] == pid][0]
        P.confere(g and abs(o2['rot'] - 90) < 0.01 and o2['x'] == o['x'], 'GIRAR: a alça azul gira o objeto (de 15 em 15° com o encaixe: puxada para a direita, 90°)', o2['rot'] if g else al)
        # redimensionar pela ponta
        al = await ev(pg, "() => OFI.interno.alcas()")
        pts = [x for x in al if x['tipo'] == 'ponta']
        comp0 = o2['comp']
        if pts:
            p0 = pts[0]
            await arrasta(pg, p0['x'], p0['y'], p0['x'] + (p0['x'] - cen[0]) * 0.5, p0['y'] + (p0['y'] - cen[1]) * 0.5)
        o3 = [x for x in await objs(pg) if x['id'] == pid][0]
        P.confere(pts and o3['comp'] > comp0 + 3, 'REDIMENSIONAR: puxar a ponta deixa a parede mais comprida (a outra ponta fica parada)', (comp0, o3['comp']))
        # as outras ferramentas de desenho
        criados = {}
        for ferr, a0, a1, tipo in [('arco', (-20, 10), (-12, 10), 'arco'), ('ret', (-6, 4), (2, 10), 'obstaculo'), ('circ', (14, 8), (17, 8), 'obstaculo'), ('zona', (-30, -20), (-20, -14), 'zona')]:
            await ev(pg, "f => OFI.interno.escolheFerr(f)", ferr)
            A = await tela_de(pg, *a0); B = await tela_de(pg, *a1)
            n0 = len(await objs(pg))
            await arrasta(pg, A[0], A[1], B[0], B[1])
            os_ = await objs(pg)
            criados[ferr] = os_[-1] if len(os_) == n0 + 1 and os_[-1]['tipo'] == tipo else None
        P.confere(all(criados.values()), 'PAREDE CURVA, RETÂNGULO, CÍRCULO e ZONA: arrastar desenha cada um', {k: (v['tipo'] if v else None) for k, v in criados.items()})
        P.confere(criados['arco'] and abs(criados['arco']['raio'] - 8) < 0.6 and criados['circ'] and abs(criados['circ']['w'] - 6) < 0.6 and criados['ret'] and abs(criados['ret']['w'] - 8) < 0.6 and abs(criados['ret']['h'] - 6) < 0.6,
                  'as medidas saem do arrasto (o raio da curva, o diâmetro do círculo, a largura e a altura do retângulo)')
        # linha de pontos (toque a toque + CONCLUIR)
        await ev(pg, "() => OFI.interno.escolheFerr('linha')")
        for (x, y) in [(20, -20), (26, -16), (30, -22)]:
            t = await tela_de(pg, x, y); await toque(pg, t[0], t[1])
        await ev(pg, "() => [...document.querySelectorAll('.ofi-ed-dica button')].find(b => /CONCLUIR/.test(b.textContent)).click()")
        await pg.wait_for_timeout(100)
        u = (await objs(pg))[-1]
        P.confere(u['tipo'] == 'linha' and len(u['pontos']) == 3, 'LINHA DE PONTOS: toque ponto a ponto e CONCLUIR (3 pontos)', u['tipo'])
        # polígono: toca 4 pontos e fecha no primeiro → escolhe ZONA
        await ev(pg, "() => OFI.interno.escolheFerr('poli')")
        pts_ = [(-34, 12), (-26, 12), (-26, 20), (-34, 20)]
        for (x, y) in pts_:
            t = await tela_de(pg, x, y); await toque(pg, t[0], t[1])
        t = await tela_de(pg, *pts_[0]); await toque(pg, t[0], t[1])
        await pg.wait_for_timeout(150)
        await ev(pg, "() => [...document.querySelectorAll('.ofi-jan-pe button')].find(b => /ZONA/.test(b.textContent)).click()")
        await pg.wait_for_timeout(150)
        u = (await objs(pg))[-1]
        P.confere(u['tipo'] == 'zona' and u['forma'] == 'poligono' and len(u['pontos']) == 4, 'POLÍGONO: 4 toques e o primeiro de novo fecha; vira ZONA (ou obstáculo, decoração, o contorno do campo)', (u['tipo'], u.get('forma')))
        # caixa de seleção
        await ev(pg, "() => { const I = OFI.interno; I.escolheFerr('sel'); I.OFE.sel.clear(); }")
        A = await tela_de(pg, -36, 2); B = await tela_de(pg, 4, 22)
        await arrasta(pg, A[0], A[1], B[0], B[1])
        sel = await ev(pg, "() => [...OFI.interno.OFE.sel].map(id => OFI.interno.porId(id).tipo).sort()")
        P.confere(len(sel) >= 3 and 'zona' in sel and 'arco' in sel, 'CAIXA DE SELEÇÃO: arrastar no vazio seleciona o que está dentro', sel)
        # agrupar, desagrupar
        r = await ev(pg, "() => { const I = OFI.interno; I.agrupa(); const g = I.OFE.M.objetos.filter(o => I.OFE.sel.has(o.id)).map(o => o.grupo); return g; }")
        P.confere(len(set(r)) == 1 and r[0], 'AGRUPAR põe a seleção num grupo', r)
        gid = r[0]
        await ev(pg, "() => OFI.interno.OFE.sel.clear()")
        z = [o for o in await objs(pg) if o['grupo'] == gid and o['tipo'] == 'arco'][0]
        t = await tela_de(pg, z['x'] + z['raio'], z['y'])
        await toque(pg, t[0], t[1])
        n = await ev(pg, "() => OFI.interno.OFE.sel.size")
        P.confere(n == len(r), 'tocar num objeto do grupo seleciona o grupo inteiro', n)
        await ev(pg, "() => OFI.interno.desagrupa()")
        sel = await ev(pg, "() => [...OFI.interno.OFE.sel]")
        P.confere(sel and all(not o['grupo'] for o in await objs(pg) if o['id'] in sel), 'DESAGRUPAR tira o grupo', sel)
        # alinhar e distribuir
        r = await ev(pg, """() => { const I = OFI.interno; const ids = [];
          for (const [x, y] of [[-10, 20], [0, 26], [12, 22]]) ids.push(I.poeObjeto({ tipo: 'obstaculo', forma: 'retangulo', x, y, w: 2, h: 2 }, false).id);
          I.OFE.sel = new Set(ids); I.alinha('t'); const ys = ids.map(id => I.porId(id).y);
          I.distribui('h'); const xs = ids.map(id => I.porId(id).x); return [ys, xs]; }""")
        ys, xs = r
        P.confere(len(set(ys)) == 1 and abs((xs[1] - xs[0]) - (xs[2] - xs[1])) < 0.02, 'ALINHAR em cima deixa todos na mesma altura; DISTRIBUIR deixa o mesmo espaço entre eles', r)
        # espelhar (um triângulo apontando para a direita vira para a esquerda)
        r = await ev(pg, """() => { const I = OFI.interno; const o = I.poeObjeto({ tipo: 'obstaculo', forma: 'triangulo', x: 30, y: 10, w: 4, h: 4, rot: 90 });
          I.espelha('h'); const a = I.porId(o.id).rot; I.espelha('v'); const b = I.porId(o.id).rot; return [a, b]; }""")
        P.confere(r == [270, 270], 'ESPELHAR: na horizontal o triângulo que apontava para a direita aponta para a esquerda; na vertical ele continua para a esquerda', r)
        # duplicar, excluir, copiar e colar (teclado), ordem
        n0 = len(await objs(pg))
        await ev(pg, "() => OFI.interno.duplica()")
        n1 = len(await objs(pg))
        await ev(pg, "() => OFI.interno.exclui()")
        n2 = len(await objs(pg))
        await ev(pg, "() => { const I = OFI.interno; I.OFE.sel = new Set([I.OFE.M.objetos[I.OFE.M.objetos.length - 1].id]); }")
        await ev(pg, "() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); }")
        await pg.keyboard.press('Control+c'); await pg.keyboard.press('Control+v')
        n3 = len(await objs(pg))
        P.confere(n1 == n0 + 1 and n2 == n0 and n3 == n0 + 1, 'DUPLICAR, EXCLUIR e COPIAR/COLAR (Ctrl+C, Ctrl+V) mudam a quantidade certa', (n0, n1, n2, n3))
        r = await ev(pg, "() => { const I = OFI.interno, id = [...I.OFE.sel][0]; I.ordem(-1); const a = I.OFE.M.objetos.findIndex(o => o.id === id); I.ordem(1); const b = I.OFE.M.objetos.findIndex(o => o.id === id); return [a, b, I.OFE.M.objetos.length]; }")
        P.confere(r[0] == 0 and r[1] == r[2] - 1, 'MANDAR PARA TRÁS / TRAZER PARA A FRENTE mudam a ordem do desenho', r)
        # bloquear e ocultar
        r = await ev(pg, "() => { const I = OFI.interno, o = I.porId(" + json.dumps(pid) + "); I.OFE.sel = new Set([o.id]); I.bloqueia(); return [I.porId(o.id).bloqueado, I.OFE.sel.size, o.x, o.y]; }")
        t = await tela_de(pg, r[2], r[3])
        await arrasta(pg, t[0], t[1], t[0] + 80, t[1] + 40)
        o4 = [x for x in await objs(pg) if x['id'] == pid][0]
        P.confere(r[0] and o4['x'] == r[2] and o4['y'] == r[3], 'BLOQUEAR: o objeto bloqueado não mexe pelo toque', (r, o4['x']))
        r = await ev(pg, "() => { const I = OFI.interno; I.muda(M => { M.objetos.find(o => o.id === " + json.dumps(pid) + ").bloqueado = false; }); I.OFE.sel = new Set([" + json.dumps(pid) + "]); I.oculta(); const o = I.porId(" + json.dumps(pid) + "); const w = I.uParaMundo(o.x, o.y); return [o.oculto, !!I.objetoNoPonto(w[0], w[1]) && I.objetoNoPonto(w[0], w[1]).id === o.id]; }")
        P.confere(r[0] and not r[1], 'OCULTAR: o objeto oculto some do editor (e o toque passa por ele)', r)
        await ev(pg, "() => { const I = OFI.interno; I.OFE.sel.clear(); I.OFE.aba = 'camadas'; I.painelAtualiza(); }")
        ok = await ev(pg, "() => { const b = [...document.querySelectorAll('.ofi-ed-painel button')].find(x => /MOSTRAR E SOLTAR/.test(x.textContent)); if (!b) return false; b.click(); const o = OFI.interno.porId(" + json.dumps(pid) + "); return !o.oculto && !o.bloqueado; }")
        P.confere(ok, 'CAMADAS › Ocultos e bloqueados: MOSTRAR E SOLTAR devolve o objeto')
        # camadas: esconder uma camada inteira e trocar a ordem
        r = await ev(pg, """() => { const I = OFI.interno, M = I.OFE.M, c = M.objetos.find(o => o.tipo === 'zona').camada, j = M.camadas.findIndex(x => x.id === c);
          I.muda(M2 => { M2.camadas[j].visivel = false; }); const z = M.objetos.find(o => o.tipo === 'zona'), w = I.uParaMundo(z.x, z.y), toca = I.objetoNoPonto(w[0], w[1]);
          const antes = I.OFE.M.camadas.map(x => x.id).join(); I.muda(M2 => { const l = M2.camadas; [l[0], l[1]] = [l[1], l[0]]; }); const depois = I.OFE.M.camadas.map(x => x.id).join();
          I.muda(M2 => { M2.camadas.forEach(x => { x.visivel = true; }); }); return [!toca || toca.tipo !== 'zona', antes !== depois, I.OFE.M.camadas.length]; }""")
        P.confere(r[0] and r[1] and r[2] == 9, 'CAMADAS: as 9 camadas; esconder uma tira os objetos dela do toque; a ordem troca', r)
        # grade e encaixe
        # (num canto vazio: no meio do campo fica o spawn da bola, que é da camada de cima e pegaria o toque)
        #  (e sem nada selecionado: com o círculo pequeno selecionado, as alças dele ficam em cima do centro e pegariam o arrasto)
        r = await ev(pg, """() => { const I = OFI.interno; I.OFE.encaixa = false; const o = I.poeObjeto({ tipo: 'obstaculo', forma: 'circulo', x: 38, y: -28, w: 6, h: 6 });
          I.OFE.sel.clear(); I.painelAtualiza(); return o.id; }""")
        A = await tela_de(pg, 38, -28)
        await arrasta(pg, A[0], A[1], A[0] + 7, A[1] + 3)
        o5 = [x for x in await objs(pg) if x['id'] == r][0]
        P.confere(abs(o5['x'] * 2 - round(o5['x'] * 2)) > 0.01 or abs(o5['y'] * 2 - round(o5['y'] * 2)) > 0.01, 'ENCAIXAR NA GRADE desligado: o objeto anda livre (fora dos 0,5 u)', (o5['x'], o5['y']))
        r2 = await ev(pg, "() => { const I = OFI.interno; I.OFE.encaixa = true; const g0 = I.OFE.grade; I.EDU.btGrade.click(); const g1 = I.OFE.grade; I.EDU.btGrade.click(); return [g0, g1, I.OFE.grade]; }")
        P.confere(r2[0] != r2[1] and r2[0] == r2[2], 'o botão da GRADE liga e desliga a grade', r2)
        # câmera: arrastar com a mão, roda do mouse, dois dedos
        c0 = await ev(pg, "() => Object.assign({}, OFI.interno.OFE.cam)")
        await ev(pg, "() => OFI.interno.escolheFerr('mao')")
        await arrasta(pg, 300, 150, 200, 100)
        c1 = await ev(pg, "() => Object.assign({}, OFI.interno.OFE.cam)")
        await ev(pg, "() => OFI.interno.escolheFerr('sel')")
        await ev(pg, "() => { const cv = OFI.interno.EDU.cv, r = cv.getBoundingClientRect(); cv.dispatchEvent(new WheelEvent('wheel', { clientX: r.left + 200, clientY: r.top + 120, deltaY: -300, bubbles: true, cancelable: true })); }")
        c2 = await ev(pg, "() => Object.assign({}, OFI.interno.OFE.cam)")
        await ev(pg, PONTEIRO, ['pointerdown', 200, 150, 1]); await ev(pg, PONTEIRO, ['pointerdown', 260, 150, 2])
        for k in range(1, 6):
            await ev(pg, PONTEIRO, ['pointermove', 200 - k * 12, 150, 1]); await ev(pg, PONTEIRO, ['pointermove', 260 + k * 12, 150, 2])
        await ev(pg, PONTEIRO, ['pointerup', 140, 150, 1]); await ev(pg, PONTEIRO, ['pointerup', 320, 150, 2])
        c3 = await ev(pg, "() => Object.assign({}, OFI.interno.OFE.cam)")
        P.confere(c1['x'] > c0['x'] + 1 and c2['z'] > c1['z'] and c3['z'] > c2['z'] * 1.5, 'CÂMERA: a mão arrasta; a roda e os dois dedos (pinça) dão zoom', (c0, c1, c2, c3))
        n = len(await objs(pg))
        P.confere(n > 0 and await ev(pg, "() => OFI.interno.OFE.arr === null"), 'os dois dedos não criaram nem mexeram em nada (o gesto acabou limpo)')
        await ev(pg, "() => OFI.interno.edAjusta()")
        # zoom pelos botões
        z0 = await ev(pg, "() => OFI.interno.OFE.cam.z")
        await ev(pg, "() => [...document.querySelectorAll('.ofi-ed-base .ofi-bt')].find(b => b.title === 'Mais zoom').click()")
        z1 = await ev(pg, "() => OFI.interno.OFE.cam.z")
        P.confere(abs(z1 / z0 - 1.25) < 0.01, 'os botões de zoom da barra de baixo', (z0, z1))
        # seleção múltipla pelo botão e pelo segurar
        r = await ev(pg, "() => { const I = OFI.interno; I.edAjusta(); I.OFE.sel.clear(); I.EDU.btMulti.click(); return I.OFE.multi; }")
        zs = [o for o in await objs(pg) if o['tipo'] in ('arco', 'zona') and not o.get('oculto')][:2]
        for o in zs:
            t = await tela_de(pg, o['x'] + (o.get('raio') or 0), o['y'])
            await toque(pg, t[0], t[1])
        n = await ev(pg, "() => OFI.interno.OFE.sel.size")
        await ev(pg, "() => { OFI.interno.EDU.btMulti.click(); }")
        P.confere(r and n == 2, 'SELEÇÃO MÚLTIPLA: com o botão ligado, cada toque soma um objeto', n)
        # o painel de propriedades: muda o X pelo campo de número e pelo deslizante
        r = await ev(pg, """() => { const I = OFI.interno, o = I.porId(""" + json.dumps(pid) + """); I.OFE.sel = new Set([o.id]); I.painelAtualiza();
          const linhas = [...document.querySelectorAll('.ofi-ed-painel .ofi-f')]; const lx = linhas.find(l => /Posição X/.test(l.textContent));
          const n = lx.querySelector('input[type=number]'); n.value = '-7.5'; n.dispatchEvent(new Event('change', { bubbles: true }));
          const depois = I.porId(o.id).x; I.desfaz(); const volta = I.porId(o.id).x;
          const lc = linhas.find(l => /Comprimento/.test(l.textContent)); const rg = lc.querySelector('input[type=range]'); rg.value = '30'; rg.dispatchEvent(new Event('input', { bubbles: true })); rg.dispatchEvent(new Event('change', { bubbles: true }));
          return [depois, volta, I.porId(o.id).comp]; }""")
        P.confere(r[0] == -7.5 and r[1] != -7.5 and r[2] == 30, 'PROPRIEDADES: o número e o deslizante mudam o objeto na hora (e o desfazer volta)', r)
        r = await ev(pg, """() => { const I = OFI.interno, falhas = [];
          const tipos = new Map(); for (const o of I.OFE.M.objetos) if (!tipos.has(o.tipo)) tipos.set(o.tipo, o);
          for (const [t, o] of tipos) { try { I.OFE.sel = new Set([o.id]); I.painelAtualiza(); const txt = I.EDU.painel.innerText; if (/null|undefined|NaN/.test(txt)) falhas.push(t); } catch (e) { falhas.push(t + ': ' + e.message); } }
          I.OFE.sel.clear();
          for (const a of ['campo', 'aparencia', 'fisica', 'partida', 'logica', 'camadas', 'spawns', 'validar']) { try { I.OFE.aba = a; I.painelAtualiza(); const txt = I.EDU.painel.innerText; if (/null|undefined|NaN/.test(txt)) falhas.push('aba ' + a); } catch (e) { falhas.push('aba ' + a + ': ' + e.message); } }
          return [tipos.size, falhas]; }""")
        P.confere(not r[1], 'o painel monta as propriedades de cada tipo e as 8 abas do mapa (Campo, Aparência, Física, Partida, Lógica, Camadas, Spawns, Validação) sem erro', r)
        # a física personalizada: o deslizante tira do preset
        r = await ev(pg, """() => { const I = OFI.interno; I.OFE.sel.clear(); I.OFE.aba = 'fisica'; I.painelAtualiza();
          const bt = [...I.EDU.painel.querySelectorAll('.ofi-seg-bt')].find(b => /Arcade/.test(b.textContent)); bt.click(); const p1 = I.OFE.M.fisica.preset;
          const l = [...I.EDU.painel.querySelectorAll('.ofi-f')].find(x => /Velocidade máxima/.test(x.textContent)), n = l.querySelector('input[type=number]'); n.value = '30'; n.dispatchEvent(new Event('change', { bubbles: true }));
          const F = RachaMapa.fisicaResolvida(I.OFE.M.fisica); return [p1, I.OFE.M.fisica.preset, F.perfil.limiteBola]; }""")
        P.confere(r[0] == 'arcade' and r[1] == 'personalizado' and abs(r[2] - 30) < 0.01, 'FÍSICA: as predefinições (Arcade) e mexer num número vira Personalizado com o valor', r)
        await ev(pg, "() => [...OFI.interno.EDU.painel.querySelectorAll('.ofi-bt')].find(b => /CLÁSSICO/.test(b.textContent)).click()")
        # spawns automáticos e a validação deles
        r = await ev(pg, """() => { const I = OFI.interno; I.OFE.aba = 'spawns'; I.painelAtualiza(); I.geraSpawns(); const M = I.OFE.M; return [M.objetos.filter(o => o.tipo === 'spawn').length, M.partida.equipes * M.partida.porTime, I.OFE.problemasObj.size]; }""")
        P.confere(r[0] == r[1] and r[0] > 0, 'SPAWNS: GERAR AUTOMÁTICO põe um ponto de nascimento por jogador de cada time', r)
        r = await ev(pg, """() => { const I = OFI.interno, M = I.OFE.M, s = M.objetos.find(o => o.tipo === 'spawn'); I.poeObjeto({ tipo: 'obstaculo', forma: 'retangulo', x: s.x, y: s.y, w: 6, h: 6 }, false);
          return [I.OFE.problemasObj.has(s.id), I.OFE.avisos.some(a => /nascimento/.test(a))]; }""")
        P.confere(r[0] and r[1], 'VALIDAÇÃO: um spawn dentro de um obstáculo fica marcado em vermelho e aparece nos avisos', r)
        # a lógica QUANDO → ENTÃO pelo painel
        r = await ev(pg, """() => { const I = OFI.interno; I.poeObjeto({ tipo: 'botao', x: -20, y: 20 }, false); I.poeObjeto({ tipo: 'portao', x: 20, y: 20, comp: 8 }, false);
          I.OFE.sel.clear(); I.OFE.aba = 'logica'; I.painelAtualiza();
          [...I.EDU.painel.querySelectorAll('.ofi-bt')].find(b => /NOVA REGRA/.test(b.textContent)).click();
          const sel = (rot, v) => { const l = [...I.EDU.painel.querySelectorAll('.ofi-f')].find(x => x.querySelector('.ofi-f-rot').textContent === rot); const s = l.querySelector('select'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); };
          sel('Acontece', 'botao'); sel('Faz', 'abrir');
          const r = I.OFE.M.logica[I.OFE.M.logica.length - 1]; return [I.OFE.M.logica.length, r.quando.tipo, !!r.quando.alvo, r.entao[0].acao, !!r.entao[0].alvo]; }""")
        P.confere(r[1] == 'botao' and r[2] and r[3] == 'abrir' and r[4], 'LÓGICA: NOVA REGRA e QUANDO apertam o botão → ENTÃO abrir o portão (o alvo é escolhido sozinho)', r)
        r = await ev(pg, """() => { const I = OFI.interno, M = I.OFE.M; const l = RachaMapa.limpa(M); const P = RachaMapa.novaPartida(l.mapa, { porTime: 1, jogadores: [{ humano: true }] });
          const b = M.objetos.find(o => o.tipo === 'botao'), g = M.objetos.findIndex(o => o.tipo === 'portao'); const q = P.jog[0], G = P.G;
          q.x = G.CX + b.x * 19; q.y = G.CY + b.y * 19; for (let i = 0; i < 30; i++) P.passo(x => { x.mx = x.my = 0; }); return RachaMapa.estadoObjeto(P, g).aberto; }""")
        P.confere(r is True, 'a regra feita no painel funciona na partida: pisar no botão abre o portão', r)
        # a biblioteca inteira
        r = await ev(pg, """() => { const I = OFI.interno, antes = I.OFE.M.objetos.length, falhas = []; let n = 0;
          for (const [cat, ic, itens] of I.BIBLIOTECA) for (const [nome, ic2, cru] of itens) { if (typeof cru === 'string' && cru !== 'portal') continue; try { const k = I.OFE.M.objetos.length; I.usaBiblioteca(cru); if (I.OFE.M.objetos.length <= k && !(cru && cru.tipo === 'spawnBola')) falhas.push(nome); n++; } catch (e) { falhas.push(nome + ': ' + e.message); } }
          const portais = I.OFE.M.objetos.filter(o => o.tipo === 'portal'); return [n, falhas, portais.length >= 2 && portais.every(p => p.par), I.OFE.M.objetos.length - antes]; }""")
        P.confere(not r[1] and r[0] >= 45, 'BIBLIOTECA: cada item (paredes, obstáculos, gols, zonas, interativos, nascimento, decoração e marcações) entra no mapa', r)
        P.confere(r[2], 'o PORTAL da biblioteca vem em par, já ligado')
        await ev(pg, "() => OFI.interno.janela && [...document.querySelectorAll('.ofi-jan-fundo .ofi-jan-tit .ofi-x')].reverse().forEach(b => b.click())")
        abriu = await ev(pg, "() => { [...document.querySelectorAll('.ofi-ed-base .ofi-bt')].find(b => /BIBLIOTECA/.test(b.textContent)).click(); return document.querySelectorAll('.ofi-lib-it').length; }")
        P.confere(abriu >= 5, 'o botão BIBLIOTECA abre a janela com os itens', abriu)
        await ev(pg, "() => [...document.querySelectorAll('.ofi-jan-fundo .ofi-jan-tit .ofi-x')].reverse().forEach(b => b.click())")
        P.confere(not erros, 'sem erros no console nas ferramentas', erros[:4])

        # ---------------------------------------------------------------- 4) salvar, versões, recuperação, exportar e importar
        print('\n4) salvar, versões, recuperação, duplicar, renomear, apagar, exportar e importar')
        await novo_mapa(pg, 'classico')
        rid = await ev(pg, "() => OFI.interno.OFE.reg.id")
        await ev(pg, "() => { OFI.interno.poeObjeto({ tipo: 'obstaculo', forma: 'circulo', x: 0, y: 8, w: 3, h: 3, nome: 'salvo-auto' }); }")
        ok = await espera(pg, "!OFI.interno.OFE.mudou", 4500)
        r = await ev(pg, "async (id) => { const reg = await OFI.interno.GAVETA.pega('mapas', id); return reg && reg.mapa.objetos.some(o => o.nome === 'salvo-auto'); }", rid)
        P.confere(ok and r, 'SALVAMENTO AUTOMÁTICO: 2,5 s depois da mudança o rascunho está gravado no aparelho')
        await ev(pg, "() => { OFI.interno.poeObjeto({ tipo: 'obstaculo', forma: 'circulo', x: 6, y: 8, w: 3, h: 3, nome: 'salvo-mao' }); }")
        await ev(pg, "() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); }")
        await pg.keyboard.press('Control+s')
        await pg.wait_for_timeout(300)
        r = await ev(pg, "async (id) => { const G = OFI.interno.GAVETA; const reg = await G.pega('mapas', id); const v = await G.versoesDe(id); return [reg.mapa.objetos.some(o => o.nome === 'salvo-mao'), v.length]; }", rid)
        P.confere(r[0] and r[1] >= 2, 'SALVAR (Ctrl+S) grava e cria uma versão', r)
        # voltar para uma versão (a primeira, pelo menu MAIS › VERSÕES)
        r = await ev(pg, "async (id) => { const v = await OFI.interno.GAVETA.versoesDe(id); const a = v[v.length - 1]; return [a.n, a.dados.objetos.length]; }", rid)
        await ev(pg, "() => { [...document.querySelectorAll('.ofi-jan-fundo .ofi-jan-tit .ofi-x')].reverse().forEach(b => b.click()); }")
        await ev(pg, "() => document.querySelector('.ofi-ed-topo .ofi-bt[title^=\"Mais\"]').click()")
        await ev(pg, "() => [...document.querySelectorAll('.ofi-item')].find(b => /VERSÕES/.test(b.textContent)).click()")
        await pg.wait_for_timeout(300)
        nv = await ev(pg, "() => document.querySelectorAll('.ofi-jan .ofi-item').length")
        await ev(pg, "() => { const l = [...document.querySelectorAll('.ofi-jan .ofi-item')]; l[l.length - 1].click(); }")
        await pg.wait_for_timeout(200)
        await ev(pg, "() => [...document.querySelectorAll('.ofi-jan-pe button')].find(b => /VOLTAR/.test(b.textContent)).click()")
        await pg.wait_for_timeout(400)
        n_obj = await ev(pg, "() => OFI.interno.OFE.M.objetos.length")
        P.confere(nv >= 2 and n_obj == r[1], 'VERSÕES: a lista abre e voltar para a primeira deixa o mapa como ele era', (nv, n_obj, r))
        await ev(pg, "() => OFI.interno.desfaz()")
        P.confere(await ev(pg, "() => OFI.interno.OFE.M.objetos.some(o => o.nome === 'salvo-mao')"), 'e o desfazer volta para antes da troca de versão')
        # recuperação: muda e "trava" (recarrega sem esperar o automático)
        await ev(pg, "() => { OFI.interno.poeObjeto({ tipo: 'obstaculo', forma: 'circulo', x: -6, y: 8, w: 3, h: 3, nome: 'sem-salvar' }); }")
        await pg.wait_for_timeout(900)   # (a recuperação grava em 0,6 s; o automático só em 2,5 s)
        await pg.reload()
        await pg.wait_for_function('() => typeof window.__RT === "function" && window.OFI && OFI.pronta', polling=100, timeout=20000)
        await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); })()")
        await ev(pg, "() => OFI.abre('hub')")
        await pg.wait_for_timeout(600)
        tem = await ev(pg, "() => /alterações não salvas/.test(OFI.raiz.innerText)")
        P.confere(tem, 'RECUPERAÇÃO: depois de o aparelho "travar", a central avisa das alterações não salvas')
        await ev(pg, "() => [...document.querySelectorAll('.ofi-hub-aviso button')].find(b => /RECUPERAR/.test(b.textContent)).click()")
        await pg.wait_for_timeout(500)
        await ev(pg, "() => [...document.querySelectorAll('.ofi-jan-pe button')].find(b => /RECUPERAR/.test(b.textContent)).click()")
        await pg.wait_for_timeout(300)
        P.confere(await ev(pg, "() => OFI.tela === 'editor' && OFI.interno.OFE.M.objetos.some(o => o.nome === 'sem-salvar')"), 'RECUPERAR abre o editor com a mudança que não tinha sido salva')
        # só EDITAR, SALVAR e PUBLICAR: o exportar e o importar saíram (o editor e a central)
        await ev(pg, "() => [...document.querySelectorAll('.ofi-ed-topo button')].find(b => /^Mais/.test(b.title || '')).click()")
        await pg.wait_for_timeout(200)
        itens = await ev(pg, "() => [...document.querySelectorAll('.ofi-jan .ofi-item b')].map(b => b.textContent)")
        P.confere(itens and not any('EXPORTAR' in x or 'IMPORTAR' in x for x in itens) and 'PUBLICAR' in itens and 'CRIAR SALA' in itens, 'o MAIS do editor: sem EXPORTAR; tem PUBLICAR e CRIAR SALA', itens)
        await ev(pg, "() => [...document.querySelectorAll('.ofi-jan-fundo .ofi-jan-tit .ofi-x')].reverse().forEach(b => b.click())")
        r = await ev(pg, "() => ['exportaDialogo', 'importaTexto'].filter(k => k in OFI.interno)")
        P.confere(r == [], 'as funções de exportar e importar não existem mais', r)
        # duplicar, renomear e apagar pela central
        regid = await ev(pg, "() => OFI.interno.OFE.reg.id")
        await ev(pg, "() => OFI.interno.editorSai()")
        await pg.wait_for_timeout(300)
        n0 = await ev(pg, "async () => (await OFI.interno.GAVETA.todos('mapas')).length")
        await ev(pg, "async (id) => { const reg = await OFI.interno.GAVETA.pega('mapas', id); await OFI.interno.duplicaRascunho(reg, false); }", regid)
        await pg.wait_for_timeout(300)
        l = await ev(pg, "async () => (await OFI.interno.GAVETA.todos('mapas')).map(r => r.nome)")
        P.confere(len(l) == n0 + 1 and any(x.startswith('Cópia de') for x in l), 'DUPLICAR cria a cópia nos seus mapas', l)
        cartoes = await ev(pg, "() => document.querySelectorAll('.ofi-grade .ofi-cartao:not(.ofi-cartao-novo)').length")
        P.confere(cartoes == len(l), 'Meus mapas mostra um cartão por mapa do aparelho', (cartoes, len(l)))
        # (pelo id do rascunho: o mapa importado tem o mesmo nome do original)
        menu = "async (id) => { const card = document.querySelector('.ofi-cartao[data-id=\\'' + id + '\\']'); card.querySelector('.ofi-bt[title=\\'Mais opções\\']').click(); return true; }"
        await ev(pg, menu, regid)
        await pg.wait_for_timeout(150)
        await ev(pg, "() => [...document.querySelectorAll('.ofi-item')].find(b => /RENOMEAR/.test(b.textContent)).click()")
        await pg.wait_for_timeout(150)
        await ev(pg, "() => { const js = [...document.querySelectorAll('.ofi-jan')], j = js[js.length - 1]; const i = j.querySelector('input'); i.value = 'Nome Novo'; [...j.querySelectorAll('.ofi-jan-pe button')].find(b => b.textContent === 'OK').click(); }")   # (a janela de cima)
        await pg.wait_for_timeout(300)
        nome = await ev(pg, "async (id) => (await OFI.interno.GAVETA.pega('mapas', id)).nome", regid)
        P.confere(nome == 'Nome Novo', 'RENOMEAR (no menu do cartão) troca o nome do mapa', nome)
        n1 = await ev(pg, "async () => (await OFI.interno.GAVETA.todos('mapas')).length")
        await ev(pg, menu, regid)
        await pg.wait_for_timeout(150)
        await ev(pg, "() => [...document.querySelectorAll('.ofi-item')].find(b => /APAGAR DO APARELHO/.test(b.textContent)).click()")
        await pg.wait_for_timeout(150)
        await ev(pg, "() => [...document.querySelectorAll('.ofi-jan-pe button')].find(b => /APAGAR/.test(b.textContent)).click()")
        await pg.wait_for_timeout(300)
        n2 = await ev(pg, "async () => (await OFI.interno.GAVETA.todos('mapas')).length")
        P.confere(n2 == n1 - 1, 'APAGAR DO APARELHO (no menu do cartão, com a confirmação) tira o mapa', (n1, n2))
        P.confere(not [e for e in erros if 'Oficina' in e], 'sem erros da Oficina no console ao salvar e importar', erros[:4])

        # ---------------------------------------------------------------- 5) o TESTAR de verdade
        print('\n5) o TESTAR: o chute, o gol, o placar, o fim, jogar de novo, trocar de time, os bots e a volta')
        await novo_mapa(pg, 'classico')
        await ev(pg, "() => { const I = OFI.interno; I.muda(M => { M.partida.meta = 1; }); }")
        nobj = await ev(pg, "() => OFI.interno.OFE.M.objetos.length")
        await ev(pg, "() => document.querySelector('.ofi-ed-testar').click()")
        ok = await espera(pg, "OFI.interno.OFJ.on && OFI.interno.OFJ.P.tick > 5", 3000)
        P.confere(ok and await ev(pg, "() => OFI.raiz.hidden && document.getElementById('lb').hidden"), 'TESTAR abre a partida na hora, no canvas do jogo (a Oficina e o lobby saem de cena)')
        r = await rt(pg, "[controleVisivel('kick'), controleVisivel('power'), controleVisivel('joy'), controleVisivel('reset'), controleVisivel('curva')]")
        P.confere(r == [True, True, True, False, False], 'os controles do jogo aparecem (analógico, PASSE, CHUTE; sem o REINICIAR do treino e sem CURVA no futebol)', r)
        # o chute: a bola do lado, segura o CHUTE
        await ev(pg, "() => { const J = OFI.interno.OFJ, P = J.P, q = P.jog[J.eu]; P.estado = 'jogo'; q.x = P.B.x - (q.r + P.C.R_BOLA + 2); q.y = P.B.y; q.vx = q.vy = 0; P.B.vx = P.B.vy = 0; }")
        await pg.keyboard.down('KeyK'); await pg.wait_for_timeout(120); await pg.keyboard.up('KeyK')
        await pg.wait_for_timeout(60)
        v = await ev(pg, "() => { const B = OFI.interno.OFJ.P.B; return Math.hypot(B.vx, B.vy); }")
        P.confere(v > 200, 'o CHUTE do jogo (tecla K, o mesmo do botão) chuta a bola de verdade no TESTAR', v)
        # o gol: a bola rolando para dentro do gol do Time B
        await ev(pg, "() => { const J = OFI.interno.OFJ, P = J.P, g = P.G.gols.find(x => x.dono === 1) || P.G.gols[1]; P.B.x = g.cx - g.nx * 60; P.B.y = g.cy - g.ny * 60; P.B.vx = g.nx * 900; P.B.vy = g.ny * 900; for (const q of P.jog) { q.x = P.G.CX; q.y = P.G.GT + 30 + q.i * 40; } }")
        ok = await espera(pg, "OFI.interno.OFJ.P.placar[0] === 1", 2500)
        P.confere(ok, 'GOL: a bola entrando no gol do Time B vale 1 para o Time A')
        ban = await ev(pg, "() => { const b = OFI.interno.OFJ.banner; return b ? b.t : ''; }")
        P.confere('GOL DO' in ban, 'e o letreiro GOL DO TIME A! aparece (o evento do gol sai com o tipo "gol")', ban)
        fim = await espera(pg, "!!OFI.interno.OFJ.menu && /VITÓRIA|DERROTA|EMPATE/.test(OFI.interno.OFJ.menu.innerText)", 7000)
        txt = await ev(pg, "() => OFI.interno.OFJ.menu ? OFI.interno.OFJ.menu.innerText : ''")
        P.confere(fim and 'VITÓRIA' in txt and 'não conta para a ranqueada' in txt, 'com a meta de 1 gol, a partida acaba e o resultado aparece (VITÓRIA, o placar, os gols; sem valer para a ranqueada)', txt[:120])
        await ev(pg, "() => [...OFI.interno.OFJ.menu.querySelectorAll('button')].find(b => /JOGAR DE NOVO/.test(b.textContent)).click()")
        await pg.wait_for_timeout(200)
        r = await ev(pg, "() => [OFI.interno.OFJ.P.placar.join(), OFI.interno.OFJ.P.estado, !OFI.interno.OFJ.menu]")
        P.confere(r == ['0,0', 'saida', True], 'JOGAR DE NOVO recomeça do zero com a saída', r)
        # trocar de time e bots
        await pg.keyboard.press('Escape')
        await pg.wait_for_timeout(100)
        await ev(pg, "() => [...OFI.interno.OFJ.menu.querySelectorAll('button')].find(b => /TROCAR DE TIME/.test(b.textContent)).click()")
        r = await ev(pg, "() => { const J = OFI.interno.OFJ; return [J.cfg.time, J.P.jog[J.eu].time]; }")
        P.confere(r == [1, 1], 'TROCAR DE TIME (na pausa) põe você no Time B', r)
        await pg.keyboard.press('Escape')
        await ev(pg, "() => [...OFI.interno.OFJ.menu.querySelectorAll('button')].find(b => /BOTS/.test(b.textContent)).click()")
        r = await ev(pg, "() => { const J = OFI.interno.OFJ; return [J.cfg.bots, J.P.jog.filter(q => q.vazio).length, J.P.jog.length]; }")
        P.confere(r[0] is False and r[1] == r[2] - 1, 'BOTS: DESLIGADOS deixa só você no campo', r)
        await pg.keyboard.press('Escape')
        await ev(pg, "() => [...OFI.interno.OFJ.menu.querySelectorAll('button')].find(b => /BOTS/.test(b.textContent)).click()")
        await pg.keyboard.press('Escape')
        await ev(pg, "() => [...OFI.interno.OFJ.menu.querySelectorAll('button')].find(b => /COLISÕES/.test(b.textContent)).click()")
        P.confere(await ev(pg, "() => OFI.interno.OFJ.colisoes && !OFI.interno.OFJ.menu"), 'VER AS COLISÕES liga o desenho das peças que batem')
        # a pausa congela
        await pg.keyboard.press('Escape')
        t0 = await ev(pg, "() => OFI.interno.OFJ.P.tick"); await pg.wait_for_timeout(300); t1 = await ev(pg, "() => OFI.interno.OFJ.P.tick")
        P.confere(t0 == t1, 'com o menu da pausa aberto o teste fica parado', (t0, t1))
        r = await ev(pg, "() => { const b = [...OFI.interno.OFJ.menu.querySelectorAll('button')].find(x => /VOLTAR AO EDITOR/.test(x.textContent)); b.click(); return [OFI.interno.OFJ.on, OFI.tela, OFI.raiz.hidden, OFI.interno.OFE.M.objetos.length]; }")
        P.confere(r == [False, 'editor', False, nobj], 'VOLTAR AO EDITOR volta com o mapa do jeito que estava', r)
        # (as teclas do modo clássico não mexem em nada na partida da Oficina)
        await ev(pg, "() => document.querySelector('.ofi-ed-testar').click()")
        await espera(pg, "OFI.interno.OFJ.on", 2000)
        antes = await rt(pg, "JSON.stringify([modo, campo, TR.on, editing])")
        for k in ['KeyT', 'KeyC', 'Digit2', 'KeyH', 'KeyR']:
            await pg.keyboard.press(k)
        depois = await rt(pg, "JSON.stringify([modo, campo, TR.on, editing])")
        P.confere(antes == depois, 'as teclas do modo clássico (T, C, 1–4, H) não mudam o jogo de sempre durante o teste; R reinicia o teste', (antes, depois))
        await ev(pg, "() => OFI.interno.OFJ.sai()")

        # ---------------------------------------------------------------- 6) o jogo de sempre depois da Oficina
        print('\n6) o jogo de sempre continua depois da Oficina')
        await ev(pg, "() => OFI.fecha()")
        await pg.wait_for_timeout(300)
        P.confere(await ev(pg, "() => !OFI.aberta && !document.getElementById('lb').hidden"), 'fechar a Oficina volta para o lobby')
        # (como o tests/matriz_test.py começa uma partida do jogo: x49Start + rqVsComeca)
        await rt(pg, "(() => { if (typeof fimAberto === 'function' && fimAberto()) fechaFim(); if (RQ.on) rqSai(); abrirLobby(); X49.mode = 'casual'; X49.jogo = 'futebol'; x49Start(2, 0); rqVsComeca(); return 1; })()")
        t0 = await rt(pg, "RQ.tick")
        for _ in range(40):
            if await rt(pg, "RQ.tick") >= t0 + 12: break
            await pg.wait_for_timeout(100)
        await pg.focus('#c')
        a = json.loads(await rt(pg, "JSON.stringify({ lobby: lobby.aberto, rq: RQ.on, tick: RQ.tick, x: P.x, cx: CX })"))
        seta = 'ArrowLeft' if a['x'] < a['cx'] else 'ArrowRight'
        await pg.keyboard.down(seta); await pg.wait_for_timeout(700); await pg.keyboard.up(seta)
        bb = json.loads(await rt(pg, "JSON.stringify({ lobby: lobby.aberto, rq: RQ.on, tick: RQ.tick, x: P.x, cx: CX })"))
        P.confere(a['rq'] and not a['lobby'] and bb['tick'] > a['tick'] + 20 and abs(bb['x'] - a['x']) > 5, 'a partida do jogo roda depois da Oficina (o laço do quadro voltou para o jogo: o relógio anda e a tampinha mexe)', (a, bb))
        await rt(pg, "(() => { rqSai(); if (!lobby.aberto) abrirLobby(); return 1; })()")
        P.confere(not [e for e in erros if 'Oficina' in e or 'TypeError' in e or 'ReferenceError' in e], 'sem erros no console', erros[:5])
        await b.close()
    return P.fim()

roda(principal())
