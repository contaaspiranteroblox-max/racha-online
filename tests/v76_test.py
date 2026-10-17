"""v76 · o Estádio com a grama de fora toda no verde escuro e a calçada de Copacabana · as 8 tampinhas animadas.

· O campo: fora das linhas (entre as linhas e o alambrado: atrás dos gols, em cima e embaixo) a grama é toda do verde
  escuro, sem as faixas claras (que ficam só entre as linhas); a calçada em volta é a de Copacabana — as ondas de pedra
  portuguesa, preta e branca (medido: a cor vai e volta entre clara e escura, várias vezes, atravessando a calçada), no
  desenho normal e no Ultra leve. A física é a mesma (com RACHA_REF, o bloco de física igual ao da v71.1).
· As tampinhas: as 8 caras (CRIA, CRISTO, BRASIL, PITBULL, DEBOCHE, FÉ, DRAGÃO e GALÁXIA) e as 4 bordas acesas entram no
  FIM das listas — os códigos das tampinhas que já existiam não mudam (as 44 prontas dão o mesmo código ida e volta e,
  com RACHA_REF, o mesmo código da v71.1); o kit das ilustrações abre; cada uma das 8 muda com o tempo (dois instantes,
  desenhos diferentes) e a miniatura é sempre igual; nada passa de 1,2 × o raio da tampinha (o aro do time fica livre).
· Onde mexe: na partida (a sua tampinha, parada no lugar, muda de um quadro para o outro), no lobby e no editor (a grande
  e os cartões da coleção); com Reduzir animações fica parada (nos três); os bots nunca pegam as animadas.
· O editor: MODELOS PRONTOS começa pelas 8 da coleção (com o selo ANIMADA); no ÍCONE, com uma cara animada, a posição, o
  tamanho e o estilo saem (a cara ocupa a tampinha).
· O custo: 8 tampinhas animadas desenhadas como na partida (medido aqui, no Chromium de teste sem placa de vídeo).
Capturas em tests/saida/v76_*.png. Isto mede a página no Chromium de teste; se as animações ficaram bonitas, e como rodam
num celular de verdade com 8 tampinhas animadas na tela, é com quem joga.

Rodar:  python3 tests/v76_test.py
        RACHA_REF=<racha_teste.html da v71.1> python3 tests/v76_test.py   (com a comparação entre as versões)
"""
import json, os, pathlib
from comum import abre, rt, roda, Placar, async_playwright, RAIZ, PAGINA

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)

CAMPO = r"""((n, plano) => {
  const g0 = graf; if (plano){ graf = Object.keys(GRAFICOS).find(k => GRAFICOS[k].plano) || graf; aplicaGraficos(); }
  __T.comeca('futebol', n, 4); __T.limpa(); cam.mode = 'fixa'; updateCamera(0, true); buildStatic();
  const g = stat.getContext('2d'), sx = stat.width/MW, sy = stat.height/MH;
  const am = (x, y) => { const d = g.getImageData(Math.round(x*sx) - 1, Math.round(y*sy) - 1, 3, 3).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 4){ r += d[i]; gg += d[i + 1]; b += d[i + 2]; } const k = d.length/4; return [r/k, gg/k, b/k].map(Math.round); };
  const sw = (LX1 - LX0)/CN.faixas, dentro = [], fora = [], ladoFora = [];
  for (const k of [-6, -4, -2, 2, 4, 6]){ const x = CX + k*sw; dentro.push(am(x, LY0 + (CY - LY0)*.35)); fora.push([am(x, (GT + LY0)/2), am(x, (GB + LY1)/2)]); }   // (as colunas das faixas claras; o meio é a linha)
  for (const y of [CY - U(8), CY, CY + U(8)]){ ladoFora.push(am((GL + LX0)/2, y)); ladoFora.push(am((GR + LX1)/2, y)); }
  const px1 = (x, y) => { const d = g.getImageData(Math.round(x*sx), Math.round(y*sy), 1, 1).data; return .3*d[0] + .59*d[1] + .11*d[2]; }, c = CN.cerca, P = CN.piso;
  const vira = l => { const lo = Math.min(...l), hi = Math.max(...l); if (hi - lo < 60) return 0; const a = lo + (hi - lo)*.35, b = lo + (hi - lo)*.65; let v = 0, est = null;   // (claro e escuro com folga: o grão não conta)
    for (const x of l){ const e = x > b ? 1 : x < a ? 0 : est; if (est !== null && e !== est) v++; est = e; } return v; };
  const lado = [], cima = [];
  for (let y = CY - U(9); y <= CY + U(9); y += U(.2)) lado.push(px1(GL - c - P*.5, y));
  for (let x = CX - U(14); x <= CX + U(14); x += U(.2)) cima.push(px1(x, (GT - c)*.5));
  const r = {n, plano:!!G().plano, dentro, fora, ladoFora, viraLado:vira(lado), viraCima:vira(cima), err:window.RUA_CAMPO74_ERRO || null};
  rqSai(); if (plano){ graf = g0; aplicaGraficos(); }
  return r; })"""

# as tampinhas: o catálogo, os códigos, o desenho mexendo e o tamanho do desenho
SKINS = r"""(() => {
  const hash = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (Math.imul(h ^ (d[i] | d[i + 1] << 8 | d[i + 2] << 16 | d[i + 3] << 24), 2654435761) + 0x9e3779b9) | 0; return h; };
  const quadro = (D, t) => { const c = document.createElement('canvas'); c.width = c.height = 200; sk76Desenha(c.getContext('2d'), 100, 100, 70, D, t, 1); return c; };
  const fora = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0, m = 0; for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++){ const r = Math.hypot(x + .5 - 100, y + .5 - 100); if (r > 70*1.2 && d[(y*c.width + x)*4 + 3] > 8){ n++; m = Math.max(m, r/70); } } return {n, m:+m.toFixed(3)}; };
  const mexe = SK76_PRE.map(x => ({nome:x.nome, a:hash(quadro(x.d, 1)), b:hash(quadro(x.d, 2.3)), m1:hash(tpMiniatura(x.d, 96)), m2:hash(tpMiniatura(x.d, 96)), fora:fora(quadro(x.d, 1.7)),
    ida:tpCodigo(tpLe(x.cod)) === x.cod, anim:!!sk76Anim(tpLe(x.cod))}));
  return {ok:SK76.ok, erro:SK76.erro, icones:TP_ICONES.length, bordas:TP_BORDAS.length, novosI:TP_ICONES.slice(-8).map(i => i.id + ':' + i.pr), novosB:TP_BORDAS.slice(-4).map(b => b.id + ':' + b.pr + ':' + b.anim),
    velhos:TP_PRE.map(x => tpCodigo(x.d)), voltam:TP_PRE.every(x => { const c = tpCodigo(x.d); return tpCodigo(tpLe(c)) === c; }), mexe,
    bots:(() => { let n = 0; for (let i = 0; i < 300; i++) if (sk76Anim(tpLe(tpDoBot('bot-teste-' + i)))) n++; return n; })()};
})()"""

VELHOS_REF = r"""TP_PRE.map(x => tpCodigo(x.d))"""

CUSTO = r"""(() => { const z = K*cam.z, out = {};
  for (const x of SK76_PRE){ const sk = tpSkin(x.cod); let t0 = performance.now();
    for (let f = 0; f < 60; f++){ ctx.save(); ctx.setTransform(z, 0, 0, z, 0, 0); for (let i = 0; i < 8; i++) botaoPronto(ctx, 60 + i*90, 80, R_JOG, sk, null, EST0, z); ctx.restore(); }
    out[x.nome] = +((performance.now() - t0)/60).toFixed(2); }
  return out; })()"""


def bloco(p):
    t = pathlib.Path(p).read_text(encoding='utf-8')
    return t[t.index('/*PHYS_START*/'):t.index('/*PHYS_END*/')]


async def regiao(pg, x, y, r):
    """os pixels da tela num quadrado em volta de (x, y) (px da página)"""
    return await pg.evaluate("""([x, y, r]) => { const c = document.getElementById('c'), b = c.getBoundingClientRect(), k = c.width/b.width, g = c.getContext('2d');
      const d = g.getImageData(Math.round((x - b.left - r)*k), Math.round((y - b.top - r)*k), Math.round(2*r*k), Math.round(2*r*k)).data; let h = 0;
      for (let i = 0; i < d.length; i += 4) h = (Math.imul(h ^ (d[i] | d[i + 1] << 8 | d[i + 2] << 16), 2654435761) + 0x9e3779b9) | 0; return h; }""", [x, y, r])


async def principal():
    P = Placar('v76 · a grama de fora escura, a calçada de Copacabana e as tampinhas animadas')
    ref = os.environ.get('RACHA_REF')
    html = (RAIZ / 'app' / 'public' / 'game' / 'racha.html').read_text(encoding='utf-8')
    P.confere('const SK76_KIT = {src:"data:image/webp;base64,' in html, 'o kit das ilustrações das tampinhas vai embutido no jogo pelo build')
    if ref and pathlib.Path(ref).exists():
        P.confere(bloco(PAGINA) == bloco(ref), 'o bloco de física é o mesmo da v71.1, byte a byte')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        await pg.wait_for_function('() => window.__RT("SK76.ok && CN_IMG.ok")', polling=100, timeout=10000)

        # ---------------------------------------------------------------- o campo
        for n, plano in [(1, False), (2, False), (4, False), (2, True)]:
            r = await rt(pg, '(%s)(%d, %s)' % (CAMPO, n, 'true' if plano else 'false'))
            nome = '%dv%d%s' % (n, n, ' (Ultra leve)' if plano else '')
            escuro_fora = all(f[1] < d[1] - 25 for d, par in zip(r['dentro'], r['fora']) for f in par) and all(f[1] < min(d[1] for d in r['dentro']) - 25 for f in r['ladoFora'])
            verde = all(f[1] > f[0] + 15 and f[1] > f[2] + 10 for f in sum(r['fora'], []) + r['ladoFora'])
            P.confere(escuro_fora and verde and not r['err'], '%s: fora das linhas a grama é toda do verde escuro (sem as faixas claras), em cima, embaixo e atrás dos gols' % nome, {k: r[k] for k in ('dentro', 'fora', 'ladoFora')})
            P.confere(r['viraLado'] >= 4 and r['viraCima'] >= 4, '%s: a calçada de Copacabana: as ondas preta e branca indo e voltando (atrás do gol e em cima)' % nome, [r['viraLado'], r['viraCima']])
        await rt(pg, "(() => { __T.comeca('futebol', 2, 4); __T.limpa(); cam.mode = 'fixa'; updateCamera(0, true); buildStatic(); return true; })()")
        await pg.wait_for_timeout(300); await pg.screenshot(path=str(SAIDA / 'v76_estadio_2v2.png'))
        await rt(pg, 'rqSai(); true')

        # ---------------------------------------------------------------- as tampinhas
        s = await rt(pg, SKINS)
        print('    ', json.dumps({k: s[k] for k in ('icones', 'bordas', 'novosI', 'novosB', 'bots')}, ensure_ascii=False))
        P.confere(s['ok'] and not s['erro'], 'o kit das ilustrações abre (sem erro)', s['erro'])
        P.confere(s['icones'] == 80 and s['bordas'] == 23 and [x.split(':')[0] for x in s['novosI']] == ['zc', 'zr', 'zb', 'zp', 'zd', 'zf', 'zg', 'zx'] and all(x.endswith(':lendario') for x in s['novosI'])
                  and [x.split(':')[0] for x in s['novosB']] == ['vf', 've', 'vb', 'vp'] and all(':epico:' in x for x in s['novosB']),
                  'as 8 caras (lendárias) e as 4 bordas acesas (épicas) entram no fim das listas', [s['novosI'], s['novosB']])
        P.confere(s['voltam'] and len(s['velhos']) == 44, 'as 44 tampinhas prontas de antes: o mesmo código ida e volta')
        m = s['mexe']
        P.confere(all(x['ida'] and x['anim'] for x in m), 'as 8 da coleção: o código vai e volta igual e é reconhecido como animada', [x['nome'] for x in m if not (x['ida'] and x['anim'])])
        P.confere(all(x['a'] != x['b'] for x in m), 'as 8 mudam com o tempo (dois instantes, dois desenhos diferentes)', [x['nome'] for x in m if x['a'] == x['b']])
        P.confere(all(x['m1'] == x['m2'] for x in m), 'a miniatura (parada) sai sempre igual', [x['nome'] for x in m if x['m1'] != x['m2']])
        P.confere(all(x['fora']['n'] == 0 for x in m), 'nada do desenho passa de 1,2 × o raio da tampinha (o aro do time e a bola ficam livres)', [(x['nome'], x['fora']) for x in m if x['fora']['n']])
        P.confere(s['bots'] == 0, 'os bots nunca pegam as animadas (300 sorteios)', s['bots'])
        if ref and pathlib.Path(ref).exists():
            b2, pg2, e2 = await abre(pw, 1280, 720, pagina=pathlib.Path(ref))
            velhos_ref = await rt(pg2, VELHOS_REF); await b2.close()
            P.confere(velhos_ref == s['velhos'], 'as 44 tampinhas prontas dão o mesmo código da v71.1 (os códigos salvos continuam valendo)')
        v = await rt(pg, """(() => { const o = document.createElement('canvas').getContext('2d'), r = {partida:sk76Vivo(ctx), outra:sk76Vivo(o), lobby:sk76Vivo(LB.brilho.getContext('2d'))};
          CONTA.menosAnim = true; r.calmo = sk76Vivo(ctx); CONTA.menosAnim = false;
          const g0 = graf; graf = Object.keys(GRAFICOS).find(k => GRAFICOS[k].plano) || graf; r.leve = sk76Vivo(ctx); graf = g0; return r; })()""")
        P.confere(v == {'partida': True, 'outra': False, 'lobby': True, 'calmo': False, 'leve': False}, 'mexem na partida e no lobby; nas imagens prontas não; com Reduzir animações ou Ultra leve, paradas', v)

        # ---------------------------------------------------------------- na partida: a sua tampinha parada no lugar muda de um quadro para o outro
        for nome, calmo in [('CRISTO', False), ('CRISTO com Reduzir animações', True)]:
            pos = await rt(pg, """(c => { CONTA.menosAnim = c; tpEquipa(SK76_PRE[1].cod); __T.comeca('futebol', 2, 4); __T.limpa(); __T.poe(P, CX - U(10), CY + U(6)); __T.bola(CX + U(10), CY - U(8));
              posVisual(0); cam.mode = 'fixa'; updateCamera(0, true); buildStatic(); const r = cv.getBoundingClientRect(), z = cam.z;
              return {x:(W/2 + (P.x - cam.x)*z)*r.width/W + r.left, y:(H/2 + (P.y - cam.y)*z)*r.height/H + r.top, r:R_JOG*z*r.width/W}; })(%s)""" % ('true' if calmo else 'false'))
            await pg.wait_for_timeout(400); h1 = await regiao(pg, pos['x'], pos['y'], pos['r']*.7)
            await pg.wait_for_timeout(650); h2 = await regiao(pg, pos['x'], pos['y'], pos['r']*.7)
            if calmo: P.confere(h1 == h2, 'partida, %s: a tampinha fica parada' % nome, [h1, h2])
            else:
                P.confere(h1 != h2, 'partida, %s: a tampinha mexe (dois quadros diferentes, com ela parada no lugar)' % nome, [h1, h2])
                await pg.screenshot(path=str(SAIDA / 'v76_partida.png'))
            await rt(pg, 'rqSai(); CONTA.menosAnim = false; true')

        # ---------------------------------------------------------------- no lobby
        await rt(pg, "(() => { tpEquipa(SK76_PRE[7].cod); abrirLobby(); return true; })()"); await pg.wait_for_timeout(600)
        hl = await rt(pg, "(() => { const c = LB.brilho, g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 64) h = (Math.imul(h ^ d[i] ^ d[i + 1] << 8 ^ d[i + 2] << 16, 2654435761) + 7) | 0; return h; })()")
        await pg.wait_for_timeout(500)
        hl2 = await rt(pg, "(() => { const c = LB.brilho, g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 64) h = (Math.imul(h ^ d[i] ^ d[i + 1] << 8 ^ d[i + 2] << 16, 2654435761) + 7) | 0; return h; })()")
        P.confere(hl != hl2, 'lobby: a GALÁXIA mexe no meio da quadra', [hl, hl2])
        await pg.screenshot(path=str(SAIDA / 'v76_lobby_galaxia.png'))

        # ---------------------------------------------------------------- o editor
        await rt(pg, "(() => { tpEquipa(SK76_PRE[0].cod); abreTela('skins'); return true; })()"); await pg.wait_for_timeout(600)
        await rt(pg, "(() => { ED.aba = 'pre'; tpeAtualiza(true); return true; })()"); await pg.wait_for_timeout(700)
        r = await rt(pg, """(() => { const cs = [...ED.el.ctl.querySelectorAll('.tpe-card')].slice(0, 9);
          return {nomes:cs.map(c => c.querySelector('.tpe-card-n').textContent), anim:cs.map(c => c.classList.contains('sk76-card')), selo:cs.slice(0, 8).every(c => !!c.querySelector('.sk76-selo')),
            nota:(ED.el.ctl.querySelector('.tpe-nota-topo') || {}).textContent || ''}; })()""")
        P.confere(r['nomes'][:8] == ['Cria', 'Cristo', 'Brasil', 'Pitbull', 'Deboche', 'Fé', 'Dragão', 'Galáxia'] and r['anim'] == [True]*8 + [False] and r['selo'] and 'MISTURA DE TODAS' in r['nota'],
                  'editor › MODELOS PRONTOS: começa pelas 8 da coleção, com o selo ANIMADA', r)
        hc = await rt(pg, "(() => { const c = ED.el.ctl.querySelector('.sk76-card canvas'); return c.toDataURL().length + ':' + c.toDataURL().slice(-60); })()")
        await pg.wait_for_timeout(400)
        hc2 = await rt(pg, "(() => { const c = ED.el.ctl.querySelector('.sk76-card canvas'); return c.toDataURL().length + ':' + c.toDataURL().slice(-60); })()")
        P.confere(hc != hc2, 'editor: os cartões da coleção mexem', [hc[:20], hc2[:20]])
        await pg.screenshot(path=str(SAIDA / 'v76_editor_colecao.png'))
        await rt(pg, "(() => { ED.aba = 'i'; tpeAtualiza(true); return true; })()"); await pg.wait_for_timeout(500)
        r = await rt(pg, "(() => ({cara:ED.D.i, geo:ED.el.geo.hidden, est:ED.el.estSeg ? ED.el.estSeg.parentNode.hidden : null, nota:ED.el.semGeo.textContent, selos:[...ED.el.faixa.querySelectorAll('.tpe-item.sk76-anim')].map(b => b.dataset.id)}))()")
        P.confere(r['cara'] == 'zc' and r['geo'] and r['est'] and 'ocupa a tampinha' in r['nota'] and r['selos'] == ['zc', 'zr', 'zb', 'zp', 'zd', 'zf', 'zg', 'zx'],
                  'editor › ÍCONE: com uma cara animada, sem posição, tamanho e estilo; as 8 caras com o selo na faixa', r)
        await pg.screenshot(path=str(SAIDA / 'v76_editor_icone.png'))
        await rt(pg, "(() => { fechaTela(); return true; })()")

        # ---------------------------------------------------------------- o custo
        c = await rt(pg, CUSTO)
        print('     ms por quadro, 8 tampinhas iguais na tela:', json.dumps(c, ensure_ascii=False))
        P.confere(max(c.values()) < 25, 'o custo: 8 tampinhas animadas por quadro, no pior caso %.1f ms (Chromium de teste, sem placa de vídeo)' % max(c.values()), c)
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript (computador)', [e for e in erros if e not in rede][:3])
        await b.close()

        # ---------------------------------------------------------------- no celular deitado
        b, pg, erros = await abre(pw, 844, 390, dsf=3)
        await pg.wait_for_function('() => window.__RT("SK76.ok")', polling=100, timeout=10000)
        await rt(pg, "(() => { tpEquipa(SK76_PRE[4].cod); abrirLobby(); return true; })()"); await pg.wait_for_timeout(800)
        await pg.screenshot(path=str(SAIDA / 'v76_lobby_844x390.png'))
        await rt(pg, "(() => { abreTela('skins'); return true; })()"); await pg.wait_for_timeout(500)
        await rt(pg, "(() => { ED.aba = 'pre'; tpeAtualiza(true); return true; })()"); await pg.wait_for_timeout(700)
        await pg.screenshot(path=str(SAIDA / 'v76_editor_844x390.png'))
        r = await rt(pg, "(() => { const c = ED.el.ctl, g = c.querySelector('.tpe-cards'); return {rolaV:c.scrollHeight > c.clientHeight + 2, cartoes:g.children.length, primeiro:g.firstChild.classList.contains('sk76-card')}; })()")
        P.confere(r['primeiro'] and r['cartoes'] == 52, '844x390: a coleção no começo da faixa dos modelos prontos (52 cartões)', r)
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], '844x390: nenhum erro de JavaScript', [e for e in erros if e not in rede][:3])
        await b.close()
    return P.fim()


roda(principal())
