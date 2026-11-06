"""RACHA v110 · O BOTÃO DE METAL E AS SOMBRAS — passa/falha, no navegador (medido nos pixels do desenho):
  1) a BOTÃO (a borda de todo mundo) como nas imagens enviadas: o contorno preto fino por fora; o aro de METAL (o lábio claro
     junto do desenho, escurecendo para a beira de fora, e a luz em cima à esquerda: o mesmo raio mais claro em cima à
     esquerda que embaixo à direita); o sulco escuro entre o aro e o desenho; o desenho afundado — a sombra por dentro em
     volta toda (mais forte embaixo à direita), que some antes de 80% do raio do desenho — e o degradê de cima (mais claro)
     para baixo (mais escuro), com o branco continuando branco; nada fora do botão; as medidas da v105 iguais (o desenho até
     84%, o filete com 3,5%) e o contorno com 2%; o aro colorido vira o metal daquela cor; FINA, GROSSA e SEM BORDA (a SEM
     sem aro, com a sombra);
  2) as sombras nas outras bordas: a Clássica escolhida, a Medalhão das mascotes, a Ouro e um aro aceso ganham a sombra por
     dentro no desenho (a beira mais escura que o meio) e a borda continua a delas; a cara animada fica como é;
  3) a partida: as tampinhas saem das imagens prontas (o desenho não é refeito a cada quadro: em 60 quadros, só um ou outro
     desenho quando o zoom pede um tamanho novo);
  4) nenhum erro de JavaScript. Capturas em tests/saida/v110_botao_*.png (a folha de tampinhas e a partida de perto).
  python3 tests/v110_botao_test.py"""
import asyncio, base64, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, abre, rt, async_playwright, RAIZ

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
R0 = 107/.97                                           # (o raio que deixa o contorno de fora com 107 px: o das imagens)

# uma tampinha com o desenho liso (cor) e a borda b (aro = a cor 1 da borda; k = o tamanho da borda)
LISA = "((b, cor, aro, k) => { const D = TP_PADRAO_D(); D.b = b; D.bc = [aro || '#f7f7f3', '#1d1d1d']; D.p = 'li'; D.pc = [cor, cor, cor]; D.i = '--'; D.bt = k | 0; return tpNorm(D); })"
# desenha e lê pontos: pontos = [[raio em px, ângulo em graus], ...] → [[r, g, b, a], ...]
LE = r"""((D, r, pontos) => { const c = document.createElement('canvas'); c.width = c.height = Math.ceil(2*r + 40); const g = c.getContext('2d'), m = c.width/2;
  tpDesenha(g, m, m, r, D, 7);
  return pontos.map(([k, a]) => Array.from(g.getImageData(Math.round(m + Math.cos(a*Math.PI/180)*k), Math.round(m + Math.sin(a*Math.PI/180)*k), 1, 1).data)); })"""
ANGS = [0, 45, 90, 135, 180, 225, 270, 315]


def lum(p):
    return .2126*p[0] + .7152*p[1] + .0722*p[2]


async def le(pg, D_js, r, pontos):
    return await rt(pg, '(%s)(%s, %s, %s)' % (LE, D_js, json.dumps(r), json.dumps(pontos)))


async def principal():
    P = Placar('v110 · o botão de metal e as sombras')
    erros_todos = []
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        erros_todos.append(erros)
        api = await rt(pg, "(() => ({api: typeof window.RachaBotao110 === 'object', spr: TP_SPR.size, M: RachaBotao110.medidas(%s), M105: RachaCosmeticos105.medidas(%s)}))()" % (R0, R0))
        M = api['M']; R, wC, wF, rt_ = M['R'], M['wC'], M['wF'], M['rt']
        dentro, fora = rt_ + wF, R - wC

        # ---------------------------------------------------------------- 1) a BOTÃO de metal
        print('\n1) a BOTÃO de metal, como nas imagens')
        P.confere(api['api'], 'window.RachaBotao110 (as medidas, o metal e a sombra) existe', api)
        P.confere(abs(rt_/R - .84) < .01 and abs(wF/R - .035) < .005 and abs(wC/R - .02) < .004 and rt_ == api['M105']['rt'] and R == api['M105']['R'],
                  'as medidas da v105 iguais (o desenho até 84%%, o filete com 3,5%%) e o contorno com 2%% (%.1f px)' % wC, M)
        pts = []
        for a in ANGS:
            pts += [[R - wC*.6, a], [dentro + (fora - dentro)*.14, a], [dentro + (fora - dentro)*.5, a], [dentro + (fora - dentro)*.9, a], [rt_ + wF/2, a],
                    [rt_*.985, a], [rt_*.94, a], [rt_*.78, a]]
        pts += [[0, 0], [rt_*.5, 270], [rt_*.5, 90], [R0*.995, 0], [R0*.995, 225]]
        px = await le(pg, "(%s)('bt', '#0561bc')" % LISA, R0, pts)
        porA = {a: px[i*8:(i + 1)*8] for i, a in enumerate(ANGS)}
        # (o contorno tem ~2 px: em cada ângulo, o pixel mais escuro de 4 pontos entre a beira de dentro e a de fora dele)
        ct = await le(pg, "(%s)('bt', '#0561bc')" % LISA, R0, [[R - wC*k, a] for a in ANGS for k in (.15, .38, .62, .85)])
        ctA = {a: min(ct[i*4:(i + 1)*4], key=lambda q: lum(q) if q[3] > 200 else 999) for i, a in enumerate(ANGS)}   # (o mais escuro dos opacos)
        P.confere(all(lum(v) < 45 and v[3] > 200 for v in ctA.values()), 'o contorno preto por fora, em volta toda', ctA)
        P.confere(all(lum(v[1]) > 200 and lum(v[1]) > lum(v[2]) + 12 > lum(v[3]) + 24 for v in porA.values()),
                  'o aro de metal: o lábio claro junto do desenho e escurecendo para a beira de fora, em volta toda',
                  {a: [round(lum(porA[a][k])) for k in (1, 2, 3)] for a in (0, 90, 225)})
        P.confere(all(90 < lum(v[3]) < 185 and max(v[3][:3]) - min(v[3][:3]) < 12 for v in porA.values()), 'o metal prateado (cinza, sem cor) com o aro branco de fábrica',
                  [porA[a][3] for a in (0, 225)])
        P.confere(lum(porA[225][2]) > lum(porA[45][2]) + 8 and lum(porA[225][3]) > lum(porA[45][3]) + 8,
                  'a luz em cima à esquerda: o mesmo raio do aro mais claro em cima à esquerda que embaixo à direita',
                  {'225': [round(lum(porA[225][k])) for k in (2, 3)], '45': [round(lum(porA[45][k])) for k in (2, 3)]})
        P.confere(all(lum(v[4]) < 110 and lum(v[4]) < lum(v[1]) - 80 for v in porA.values()), 'o sulco escuro entre o aro e o desenho, em volta toda', [porA[a][4] for a in (0, 180)])
        centro = px[64]
        P.confere(all(v[5][2] < v[7][2]*.75 and v[6][2] < v[7][2]*.95 for v in porA.values()),
                  'o desenho afundado: a sombra por dentro em volta toda (a beira bem mais escura, ainda um pouco a 94%)',
                  {a: [porA[a][k][2] for k in (5, 6, 7)] for a in (45, 225)})
        P.confere(lum(porA[45][5]) < lum(porA[225][5]) - 4 and lum(porA[0][5]) < lum(porA[180][5]) and lum(porA[90][5]) < lum(porA[270][5]),
                  'a sombra mais forte embaixo e à direita (o lado contrário à luz)', {a: round(lum(porA[a][5]), 1) for a in (45, 225, 0, 180, 90, 270)})
        P.confere(all(abs(porA[a][7][2] - centro[2]) <= centro[2]*.05 for a in (0, 180)), 'a sombra some antes de 80% do raio do desenho (a 78%, dos lados, a cor do meio)',
                  {a: porA[a][7] for a in (0, 180)} | {'meio': centro})
        P.confere(px[65][2] > px[66][2] + 6 and px[65][1] > px[66][1] + 6, 'o degradê de cima para baixo: o azul mais claro em cima que embaixo', [px[65], px[66]])
        P.confere(px[67][3] < 12 and px[68][3] < 12, 'nada fora do botão (o tamanho da tampinha não muda)', [px[67], px[68]])
        br = await le(pg, "(%s)('bt', '#ffffff')" % LISA, R0, [[0, 0], [rt_*.5, 270], [rt_*.5, 0], [rt_*.5, 180], [rt_*.985, 90]])
        P.confere(all(min(p[:3]) >= 250 for p in br[:4]) and lum(br[4]) < 150, 'o branco continua branco no meio (a listra branca não escurece; só a sombra rente ao aro)', br)
        ouro = await le(pg, "(%s)('bt', '#0561bc', '#d9a520')" % LISA, R0, [[dentro + (fora - dentro)*.14, 270], [dentro + (fora - dentro)*.6, 270], [dentro + (fora - dentro)*.6, 90]])
        P.confere(all(p[0] > p[1] > p[2] + 30 for p in ouro) and lum(ouro[0]) > lum(ouro[1]) + 15, 'o aro colorido (dourado) vira o metal daquela cor: o lábio mais claro', ouro)
        tam = await rt(pg, """(() => { const out = {};
          for (const k of [1, 0, 2, 3]){ const D = (%s)('bt', '#0561bc', null, k), M = RachaBotao110.medidas(%s, D); out[k] = {aro: k === 3 ? 0 : M.R - M.wC - M.rt - M.wF, rt: M.rt}; }
          return out; })()""" % (LISA, R0))
        P.confere(tam['1']['aro'] < tam['0']['aro'] < tam['2']['aro'] and tam['1']['rt'] > tam['0']['rt'] > tam['2']['rt'],
                  'os tamanhos da borda continuam: FINA (aro mais fino, desenho maior), NORMAL e GROSSA', tam)
        sem = await le(pg, "(%s)('bt', '#0561bc', null, 3)" % LISA, R0, [[R0*.97*.985, 45], [R0*.97*.7, 45], [R0*.97*.9 + 2, 225], [R0*.99, 0]])
        P.confere(sem[0][2] < sem[1][2]*.8 and sem[0][3] > 230 and sem[3][3] < 12 and abs(sem[2][2] - sem[1][2]) < 40,
                  'SEM BORDA: só o desenho até a beirada (sem aro), com a sombra por dentro', sem)

        # ---------------------------------------------------------------- 2) as sombras nas outras bordas
        print('\n2) as sombras nas outras bordas (a borda continua a delas)')
        out = await rt(pg, r"""(() => { const out = {};
          const L = %s, mi = D => tpMiolo(D);
          for (const [b, aro] of [['cl', '#e2412f'], ['mh', '#d9a520'], ['ou', '#d9a520'], ['vf', '#f39a1c']]){
            const D = L(b, '#0561bc', aro), r = %s, rt = r*mi(D), c = document.createElement('canvas'); c.width = c.height = Math.ceil(2*r + 40); const g = c.getContext('2d'), m = c.width/2;
            tpDesenha(g, m, m, r, D, 7);
            const p = (k, a) => Array.from(g.getImageData(Math.round(m + Math.cos(a)*k), Math.round(m + Math.sin(a)*k), 1, 1).data);
            out[b] = {borda: TP_MAPA.b.has(b) ? D.b : '?', fab: v105DeFabrica(D), beira: [p(rt*.975, Math.PI/4), p(rt*.975, Math.PI*1.25)], dentro: [p(rt*.7, Math.PI/4), p(rt*.7, Math.PI*1.25)], fora: p(r*.95, -Math.PI/2)};
          }
          return out; })()""" % (LISA, R0))
        P.confere(all(v['borda'] == b and not v['fab'] for b, v in out.items()), 'a borda escolhida continua a dela (Clássica, Medalhão, Ouro e um aro aceso)', {b: v['borda'] for b, v in out.items()})
        # (na mesma linha do centro: a beira, rente à borda, mais escura que 70% do raio do desenho — embaixo à direita e em cima à
        #  esquerda, onde a luz de esmalte das bordas de dentes clareia)
        P.confere(all(v['beira'][0][2] < v['dentro'][0][2]*.6 and v['beira'][1][2] < v['dentro'][1][2]*.8 for v in out.values()),
                  'o desenho de cada uma ganha a sombra por dentro (a beira mais escura que o meio do desenho; mais embaixo à direita)',
                  {b: {'beira': [v['beira'][0][2], v['beira'][1][2]], '70%': [v['dentro'][0][2], v['dentro'][1][2]]} for b, v in out.items()})
        P.confere(all(v['fora'][3] > 200 for v in out.values()), 'a borda (os dentes, o metal da Medalhão e o aro aceso) continua desenhada em volta', {b: v['fora'] for b, v in out.items()})
        cara = await rt(pg, """(() => { const D = (%s)('bt', '#0561bc'); D.i = SK76_CARAS[0].id; const c = document.createElement('canvas'); c.width = c.height = 260; const g = c.getContext('2d');
          let n = 0; try { tpDesenha(g, 130, 130, %s, D, 7); n = 1; } catch (e) { return {erro: String(e)}; }
          const aro = Array.from(g.getImageData(130 + Math.round(%s), 130, 1, 1).data); return {ok: n, aro}; })()""" % (LISA, R0, dentro + (fora - dentro)*.14))
        P.confere(cara.get('ok') == 1 and lum(cara['aro']) > 190, 'a cara animada com a BOTÃO: o aro de metal em volta e a cara como é (sem erro)', cara)

        # ---------------------------------------------------------------- capturas: a folha e a partida
        url = await rt(pg, r"""(() => { const W = 1180, H = 700, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
          g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, 260); g.fillStyle = '#23a52f'; g.fillRect(0, 260, W, 220); g.fillStyle = '#121418'; g.fillRect(0, 480, W, 220);
          const L = %s, lis = (cor, p) => { const D = TP_PADRAO_D(); D.b = 'bt'; D.bc = ['#f7f7f3', '#1d1d1d']; D.p = p; D.pc = [cor, '#ffffff', '#ffffff']; D.i = '--'; return tpNorm(D); };
          const grandes = [lis('#0561bc', 'fx'), lis('#d03232', 'fx'), tpLe(TP_PADRAO_COD), L('bt', '#0561bc', '#d9a520')];
          grandes.forEach((D, i) => tpDesenha(g, 140 + i*300, 130, 110, D, 7));
          const todas = [...grandes, L('cl', '#0561bc', '#e2412f'), L('mh', '#0561bc', '#d9a520'), L('ou', '#d03232', '#d9a520'), L('bt', '#d03232', null, 3)];
          for (let f = 0; f < 2; f++){ let y0 = 260 + f*220 + 12; for (const r of [14, 22, 34]){ todas.forEach((D, i) => tpDesenha(g, 24 + r + i*(2*r + 16), y0 + r, r, D, 7)); y0 += 2*r + 12; } }
          return c.toDataURL('image/png'); })()""" % LISA)
        (SAIDA / 'v110_botao_folha.png').write_bytes(base64.b64decode(url.split(',', 1)[1]))
        await b.close()

        # ---------------------------------------------------------------- 3) a partida: as imagens prontas
        print('\n3) a partida: as tampinhas das imagens prontas')
        b, pg, erros = await abre(pw, 844, 390, dsf=2)
        erros_todos.append(erros)
        await pg.mouse.click(745, 343); await pg.wait_for_timeout(7000)
        n = await rt(pg, """(async () => { let n = 0; const antes = tpTampa; tpTampa = function(){ n++; return antes.apply(this, arguments); };
          const q = () => new Promise(res => requestAnimationFrame(() => res())); for (let i = 0; i < 60; i++) await q();
          tpTampa = antes; return {n, spr: TP_SPR.size, partida: !!(typeof RQ !== 'undefined' && RQ.on), jog: typeof RQ !== 'undefined' && RQ.jog ? RQ.jog.length : 0}; })()""")
        P.confere(n['partida'] and n['n'] < 20 and n['spr'] > 0,
                  'na partida as tampinhas saem das imagens prontas: o desenho não é refeito a cada quadro (%d desenhos em 60 quadros com %d jogadores; %d imagens prontas)' % (n['n'], n['jog'], n['spr']), n)
        await pg.screenshot(path=str(SAIDA / 'v110_botao_partida.png'))
        await b.close()

    todos = [e for lista in erros_todos for e in lista]
    P.confere(not todos, 'nenhum erro de JavaScript', todos[:3])
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
