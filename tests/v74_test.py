"""v74 · o ESTÁDIO (o mapa de grama) virou o society da imagem enviada, no tamanho e com os gols do jogo.

· O kit da imagem (os 6 carros, as 2 árvores e as 2 faixas de casas, recortados por tools/v74/campo_kit.py) vai embutido
  no jogo e abre; o desenho novo (tools/v74/campo.js) é o que vale no Estádio, do 1v1 ao 4v4.
· O desenho segue a geometria do jogo: as 13 faixas do corte entre as linhas de fundo (a do meio clara, claras e escuras
  alternando, a de fora da linha de fundo escura), a grama até a beira da área do jogador, o alambrado logo depois, o
  calçamento por fora; os bancos na cor de cada time; o gol de cada tamanho (o desenho do gol do jogo, por cima da bola).
· A física não muda: as medidas, as paredes, as traves, as redes e as marcas do Estádio continuam iguais às da Arena
  (1v1 a 4v4) e o mesmo chute dá o mesmo caminho nos dois mapas; com RACHA_REF=<racha_teste.html da v71.1> o bloco de
  física é o mesmo, byte a byte, e o mesmo chute no Estádio dá o mesmo caminho nas duas versões. A Arena não muda nada
  (a imagem do cenário dela sai igual à da versão de referência).
· Tela parada: dos lados do mundo entra a imagem de fora (o resto do estacionamento e as casas); seguindo o jogador, não.
· Ultra leve (as cores lisas, sem o kit e sem a imagem de fora), Galera na arquibancada (a galera no calçamento liga e
  desliga), sem o kit (os carros lisos) e com erro no desenho novo (fica o gramado da v70.2): tudo desenha sem quebrar.
Capturas em tests/saida/v74_*.png. Isto mede a página no Chromium de teste: se o campo ficou bonito, e como roda em cada
celular, é com quem joga.

Rodar:  python3 tests/v74_test.py
        RACHA_REF=<racha_teste.html da v71.1> python3 tests/v74_test.py   (com a comparação entre as versões)
"""
import json, os, pathlib
from comum import abre, rt, roda, Placar, async_playwright, RAIZ, PAGINA

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)

# a imagem do cenário (stat) num tamanho de time, no Estádio: as amostras de cor em pontos certos do desenho
AMOSTRAS = r"""((n) => {
  __T.comeca('futebol', n, 4); __T.limpa(); cam.mode = 'fixa'; updateCamera(0, true);
  window.RUA_CAMPO74_ERRO = null;
  const C = CanvasRenderingContext2D.prototype, di = C.drawImage; let kit = 0;
  C.drawImage = function(img){ if (img === CN_IMG.el) kit++; return di.apply(this, arguments); };
  try { buildStatic(); } finally { C.drawImage = di; }
  const g = stat.getContext('2d'), sx = stat.width/MW, sy = stat.height/MH;
  const am = (x, y) => { const d = g.getImageData(Math.round(x*sx) - 2, Math.round(y*sy) - 2, 4, 4).data; let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4){ r += d[i]; gg += d[i + 1]; b += d[i + 2]; } const k = d.length/4; return [r/k, gg/k, b/k].map(Math.round); };
  const sw = (LX1 - LX0)/CN.faixas, M = MARCAS, yf = CY + (M.areaH/2 + (LY1 - CY))/2;   // (entre a grande área e a linha lateral: sem linha nenhuma)
  const faixas = [];
  for (let k = -6; k <= 6; k++) faixas.push(am(CX + k*sw + (k === 0 ? sw*.3 : 0), yf));
  const fora = am(LX0 - Math.min(sw, LX0 - GL)*.5, CY + (LY1 - CY)*.8);                    // depois da linha de fundo (ainda dentro da área do jogador)
  const c = CN.cerca, P = CN.piso, rgb = h => { const s = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); };
  const yt = GT - c, hb = Math.min(U(1.85), yt - U(.5)), yb0 = yt - U(.3) - hb, nb = Math.max(3, Math.round(U(10)/U(2))), sb = (U(10) - U(.3) - U(.16)*(nb - 1))/nb;
  const banco = a => am(a + U(.15) + 2*(sb + U(.16)) + sb/2, yb0 + U(.38) + (hb - U(.53))/2);
  return {n, campo:CAMPO.id, err:window.RUA_CAMPO74_ERRO || null, kit, faixas, fora,
    dentro:am(GL + U(1.2), CY + (LY1 - CY)*.8), cerca:am(GL - c*.5, CY + (LY1 - CY)*.8), piso:am(GL - c - P*.8, CY + (LY1 - CY)*.8),
    bancos:[banco(CX - U(13.1)), banco(CX + U(3.1))], cores:[rgb(skinDoTime(0).cor), rgb(skinDoTime(1).cor)],
    redes:nets.length, fora_ex:CN_FORA.ex, fundo:CAMPO.fundo, stat:[stat.width, stat.height]};
})"""

GEO = r"""((m) => { const out = [];
  for (let n = 1; n <= 4; n++){ __T.comeca('futebol', n, m);
    out.push({MW, MH, GL, GR, GT, GB, LX0, LX1, LY0, LY1, CX, CY, GOL_PROF, GOL_Y0, GOL_Y1, REDE_E, POST_R, fator:CAMPO.fatorBola, QUADRO_W, QUADRO_H,
      posts:JSON.stringify(POSTS), wall:JSON.stringify(WALL_SEGS), net:JSON.stringify(NET_SEGS), jog:JSON.stringify(JOG_SEGS), obst:JSON.stringify(OBST), marcas:JSON.stringify(MARCAS)});
    rqSai(); }
  return out; })"""

CHUTE = r"""((m) => { const T = __T; T.comeca('futebol', 2, m); T.limpa();
  T.poe(P, CX - U(14), CY + U(3)); T.cola(P, 1, -.35); P.chutar = FORCA_POWER; const cam = [];
  T.passos(300, i => { if (i > 0) P.chutar = 0; cam.push(Math.round((B.x - CX)*1000)/1000, Math.round((B.y - CY)*1000)/1000); });
  rqSai(); return cam.join(','); })"""

# o que o quadro desenha da imagem de fora do mundo (a Tela parada e a câmera seguindo)
FORA = r"""((modo) => {
  __T.comeca('futebol', 2, 4); __T.limpa(); cam.mode = modo; __T.poe(P, LX0 + U(3), CY); posVisual(0); updateCamera(0, true); buildStatic();
  const C = CanvasRenderingContext2D.prototype, di = C.drawImage; let esq = 0, dir = 0;
  C.drawImage = function(img){ if (this === ctx){ if (img === CN_FORA.esq) esq++; if (img === CN_FORA.dir) dir++; } return di.apply(this, arguments); };
  try { render(0); } finally { C.drawImage = di; }
  const d = ctx.getImageData(Math.round(4*K), Math.round(cv.height/2), 1, 1).data;
  return {modo, esq, dir, ex:CN_FORA.ex, borda:[d[0], d[1], d[2]], visivel:cam.x - W/(2*cam.z) < 0};
})"""

# a Arena: a imagem do cenário (o mesmo tamanho nas duas páginas), num número só
ARENA = r"""(() => { __T.comeca('futebol', 2, 0); __T.limpa(); cam.mode = 'fixa'; updateCamera(0, true);
  const qs0 = wantQS; wantQS = () => .5; window.RUA_QUADRA77_DESLIGA = true; try { buildStatic(); } finally { wantQS = qs0; window.RUA_QUADRA77_DESLIGA = false; }   // (v77: a Arena de antes, a reserva da quadra nova)
  const d = stat.getContext('2d').getImageData(0, 0, stat.width, stat.height).data; let h = 0;
  for (let i = 0; i < d.length; i += 4) h = (Math.imul(h ^ (d[i] | d[i + 1] << 8 | d[i + 2] << 16), 2654435761) + 0x9e3779b9) | 0;
  const r = {h, w:stat.width, fora:typeof CN_FORA === 'undefined' ? 0 : CN_FORA.ex}; rqSai(); return r; })()"""


def bloco(p):
    t = pathlib.Path(p).read_text(encoding='utf-8')
    return t[t.index('/*PHYS_START*/'):t.index('/*PHYS_END*/')]


def verde(c, m=25):
    return c[1] > c[0] + m and c[1] > c[2] + m


async def principal():
    P = Placar('v74 · o Estádio virou o society da imagem (no tamanho e com os gols do jogo)')
    ref = os.environ.get('RACHA_REF')
    html = (RAIZ / 'app' / 'public' / 'game' / 'racha.html').read_text(encoding='utf-8')
    fonte = (RAIZ / 'tools' / 'v74' / 'campo.js').read_text(encoding='utf-8')
    pecas = json.loads((RAIZ / 'tools' / 'v74' / 'campo_noite_kit.json').read_text(encoding='utf-8'))
    P.confere('const CN_KIT = {src:"data:image/webp;base64,' in html and fonte.count('/*KIT74*/null') == 1 and len(pecas) == 10,
              'o kit da imagem (6 carros, 2 árvores, 2 faixas de casas) vai embutido no jogo pelo build', sorted(pecas))
    P.confere("{id:'gramado', nome:'Estádio', margem:[206, 59], fatorBola:FATOR_BOLA, rede:true, entraGol:true, fundo:'#1d2326', grama:true}" in html,
              'a declaração do Estádio no CAMPOS é a mesma (as margens e a bola da Arena; só a cor de fundo troca, depois, no desenho)')
    if ref and pathlib.Path(ref).exists():
        P.confere(bloco(PAGINA) == bloco(ref), 'o bloco de física é o mesmo da v71.1, byte a byte')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        await pg.wait_for_function('() => window.__RT("CN_IMG.ok")', polling=100, timeout=10000)
        r = await rt(pg, "({ok:CN_IMG.ok, w:CN_IMG.el.naturalWidth, h:CN_IMG.el.naturalHeight, n:Object.keys(CN_KIT.p).length, desc:MAPA_DESC.gramado, fundo:CAMPOS[4].fundo, erro:window.RUA_CAMPO74_KIT || null})")
        P.confere(r['ok'] and r['w'] == 640 and r['h'] == 630 and r['n'] == 10 and not r['erro'], 'a imagem do kit abre no jogo (640×630, 10 peças)', r)
        P.confere('Gramado' in r['desc'] and 'estacionamento' in r['desc'] and r['fundo'] == '#161b21', 'a descrição do Estádio no JOGAR e a cor de onde o mundo acaba (a noite)', r)

        # ---------------------------------------------------------------- o desenho em cada tamanho
        for n in (1, 2, 3, 4):
            a = await rt(pg, '(%s)(%d)' % (AMOSTRAS, n))
            f = a['faixas']
            alterna = all((f[i][1] > f[i + 1][1] + 25) if i % 2 == 0 else (f[i + 1][1] > f[i][1] + 25) for i in range(12))
            P.confere(a['campo'] == 'gramado' and not a['err'] and a['kit'] >= 4 and a['redes'] == 2,
                      '%dv%d: o Estádio desenha com o desenho novo, sem erro, com as peças do kit e os 2 gols' % (n, n), {k: a[k] for k in ('campo', 'err', 'kit', 'redes', 'stat')})
            P.confere(len(f) == 13 and all(verde(c) for c in f) and alterna and f[0][1] > a['fora'][1] + 25 and verde(a['fora']),
                      '%dv%d: 13 faixas entre as linhas de fundo, claras e escuras alternando (a do meio e as das pontas claras) e escura depois da linha' % (n, n), {'faixas': f, 'fora': a['fora']})
            P.confere(verde(a['dentro']) and not verde(a['cerca'], 15) and not verde(a['piso'], 10),
                      '%dv%d: a grama vai até a beira da área do jogador; ali começa o alambrado e, por fora, o calçamento' % (n, n), {k: a[k] for k in ('dentro', 'cerca', 'piso')})
            ok = all(all(abs(x - y) <= 14 for x, y in zip(a['bancos'][t], a['cores'][t])) for t in (0, 1))
            P.confere(ok, '%dv%d: o banco de cada time na cor do time (o seu à esquerda, o do adversário à direita)' % (n, n), {'bancos': a['bancos'], 'cores': a['cores']})
            await pg.wait_for_timeout(300)
            await pg.screenshot(path=str(SAIDA / ('v74_estadio_%dv%d_tela_parada.png' % (n, n))))
            await rt(pg, 'rqSai(); true')

        # ---------------------------------------------------------------- a física: a mesma da Arena (e, com REF, a mesma da v71.1)
        ga = await rt(pg, '(%s)(0)' % GEO); ge = await rt(pg, '(%s)(4)' % GEO)
        dif = ['%dv%d %s' % (i + 1, i + 1, k) for i in range(4) for k in ga[i] if ga[i][k] != ge[i][k]]
        P.confere(not dif, '1v1 a 4v4: as mesmas medidas, paredes, traves, redes, marcas e fator da bola da Arena', dif[:4])
        ca = await rt(pg, '(%s)(0)' % CHUTE); ce = await rt(pg, '(%s)(4)' % CHUTE)
        P.confere(ca == ce and len(ca) > 1000, 'o mesmo chute dá o mesmo caminho da bola (300 passos) na Arena e no Estádio', [ca[:50], ce[:50]])

        # ---------------------------------------------------------------- Tela parada × seguindo o jogador
        fx = await rt(pg, '(%s)("fixa")' % FORA)
        await pg.wait_for_timeout(300); await pg.screenshot(path=str(SAIDA / 'v74_estadio_2v2_lados.png'))
        sg = await rt(pg, '(%s)("seguir")' % FORA)
        await pg.wait_for_timeout(300); await pg.screenshot(path=str(SAIDA / 'v74_estadio_2v2_seguindo.png'))
        await rt(pg, 'rqSai(); true')
        fundo = [0x16, 0x1b, 0x21]
        P.confere(fx['visivel'] and fx['esq'] == 1 and fx['dir'] == 1 and fx['ex'] > 600 and any(abs(x - y) > 12 for x, y in zip(fx['borda'], fundo)),
                  'Tela parada: dos lados do mundo entram o estacionamento e as casas (não a cor lisa)', fx)
        P.confere(not sg['visivel'] and sg['esq'] == 0 and sg['dir'] == 0, 'seguindo o jogador a câmera fica dentro do mundo e a imagem de fora nem é desenhada', sg)

        # ---------------------------------------------------------------- Ultra leve, sem torcedores, sem o kit, com erro
        r = await rt(pg, """(() => { const g0 = graf; graf = Object.keys(GRAFICOS).find(k => GRAFICOS[k].plano) || graf; aplicaGraficos();
          __T.comeca('futebol', 2, 4); __T.limpa(); window.RUA_CAMPO74_ERRO = null;
          const C = CanvasRenderingContext2D.prototype, di = C.drawImage; let kit = 0;
          C.drawImage = function(img){ if (img === CN_IMG.el) kit++; return di.apply(this, arguments); };
          try { buildStatic(); } finally { C.drawImage = di; }
          const g = stat.getContext('2d'), d = g.getImageData(Math.round((CX + U(6))*stat.width/MW), Math.round((CY + U(5))*stat.height/MH), 1, 1).data;
          const r = {plano:!!G().plano, kit, ex:CN_FORA.ex, meio:[d[0], d[1], d[2]], err:window.RUA_CAMPO74_ERRO || null};
          rqSai(); graf = g0; aplicaGraficos(); return r; })()""")
        P.confere(r['plano'] and r['kit'] == 0 and r['ex'] == 0 and verde(r['meio']) and not r['err'], 'Ultra leve: as cores lisas (sem o kit e sem a imagem de fora), a grama no meio', r)
        r = await rt(pg, """(() => { const o = cnPessoa; let n = 0; cnPessoa = function(){ n++; return o.apply(this, arguments); };
          const out = {};
          try { for (const t of [true, false]){ opc.torc = t; n = 0; __T.comeca('futebol', 3, 4); buildStatic(); out[t ? 'com' : 'sem'] = n; rqSai(); } }
          finally { cnPessoa = o; opc.torc = true; }
          return out; })()""")
        P.confere(r['com'] > 10 and r['sem'] == 0, 'Galera na arquibancada: a galera no calçamento aparece e some com a opção', r)
        r = await rt(pg, """(() => { CN_IMG.ok = false; window.RUA_CAMPO74_ERRO = null; let r;
          try { __T.comeca('futebol', 2, 4); buildStatic(); r = {err:window.RUA_CAMPO74_ERRO || null, stat:stat.width > 1}; rqSai(); } finally { CN_IMG.ok = true; }
          return r; })()""")
        P.confere(not r['err'] and r['stat'], 'sem o kit (se a imagem não abrir) o Estádio desenha do mesmo jeito, com os carros lisos', r)
        r = await rt(pg, """(() => { const o = cnGrama; cnGrama = function(){ throw new Error('teste: erro no desenho novo'); }; window.RUA_CAMPO74_ERRO = null; let r;
          try { __T.comeca('futebol', 2, 4); buildStatic();
            const g = stat.getContext('2d'), d = g.getImageData(Math.round((CX + U(6))*stat.width/MW), Math.round((CY + U(5))*stat.height/MH), 1, 1).data;
            r = {err:String(window.RUA_CAMPO74_ERRO || '').slice(0, 60), meio:[d[0], d[1], d[2]]}; rqSai(); }
          finally { cnGrama = o; window.RUA_CAMPO74_ERRO = null; }
          return r; })()""")
        P.confere('teste: erro no desenho novo' in r['err'] and verde(r['meio']), 'com erro no desenho novo, o erro fica guardado e entra o gramado da v70.2 (o jogo não quebra)', r)

        # ---------------------------------------------------------------- a prévia no JOGAR e a Arena
        await rt(pg, "(() => { try { rqSai(); } catch (_) {} abrirLobby(); abreJogar('casual'); return true; })()"); await pg.wait_for_timeout(900)
        await rt(pg, "RQP.mapas.querySelector('[data-m=\"4\"]').click(); true"); await pg.wait_for_timeout(1200)
        r = await rt(pg, """(() => { const c = RQP.mapas.querySelector('[data-m="4"] canvas'), g = c.getContext('2d');
          const px = (fx, fy) => [...g.getImageData(Math.round(c.width*fx), Math.round(c.height*fy), 1, 1).data].slice(0, 3);
          const key = [...PREV_MORRO.keys()].find(k => k.startsWith('4-'));
          return {meio:px(.32, .3), lado:px(.015, .5), key:key || null}; })()""")
        await pg.screenshot(path=str(SAIDA / 'v74_jogar_previa.png'))
        await rt(pg, 'fechaRanqueada(); true')
        P.confere(verde(r['meio'], 20) and not verde(r['lado'], 10) and r['key'], 'a prévia do ESTÁDIO no JOGAR: a grama no meio e o estacionamento na beira', r)
        ar = await rt(pg, ARENA)
        P.confere(ar['fora'] == 0, 'na Arena não entra nada do Estádio novo (nem a imagem de fora do mundo)', ar)
        if ref and pathlib.Path(ref).exists():
            b2, pg2, e2 = await abre(pw, 1280, 720, pagina=pathlib.Path(ref))
            ar2 = await rt(pg2, ARENA)
            ce2 = await rt(pg2, '(%s)(4)' % CHUTE)
            await b2.close()
            # v80: as redes e os bancos da Arena saem na cor de cada time, e os times viraram laranja × roxo: a comparação com a v71.1
            # desenha esta versão com as cores da v71 (preto × branco) por um momento — o desenho é o mesmo, só as cores mudaram
            ar80 = await rt(pg, """(() => { const V = [{base:'#1b1d21', claro:'#d7dae0', escuro:'#000000', txt:'#ffffff', contra:'#ffffff'}, {base:'#f3f1ea', claro:'#ffffff', escuro:'#6f6b63', txt:'#15171a', contra:'#15171a'}];
              const salva = TIME71.map(c => Object.assign({}, c)), sk = TIME71_SKIN.map(x => x.cor);
              TIME71.forEach((c, i) => Object.assign(c, V[i])); TIME71_SKIN.forEach((x, i) => x.cor = V[i].base);
              try { return (%s); } finally { TIME71.forEach((c, i) => Object.assign(c, salva[i])); TIME71_SKIN.forEach((x, i) => x.cor = sk[i]); } })()""" % ARENA.strip())
            P.confere(ar80['h'] == ar2['h'] and ar80['w'] == ar2['w'], 'a Arena de antes (a reserva da quadra da v77) sai igual à da v71.1, pixel a pixel (v80: com as cores dos times da v71)', [ar80, ar2])
            P.confere(ce == ce2, 'o mesmo chute no Estádio dá o mesmo caminho na v71.1 e na v74', [ce[:50], ce2[:50]])
        else:
            print('  (sem RACHA_REF: a comparação com a v71.1 fica de fora)')
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript (computador)', [e for e in erros if e not in rede][:3])
        await b.close()

        # ---------------------------------------------------------------- no celular deitado
        b, pg, erros = await abre(pw, 844, 390, dsf=3)
        await pg.wait_for_function('() => window.__RT("CN_IMG.ok")', polling=100, timeout=10000)
        r = await rt(pg, """(() => { __T.comeca('futebol', 2, 4); __T.limpa(); cam.mode = 'seguir'; __T.poe(P, LX0 + U(4), LY1 - U(2)); posVisual(0); updateCamera(0, true); buildStatic();
          return {err:window.RUA_CAMPO74_ERRO || null, stat:[stat.width, stat.height], fora:CN_FORA.esq ? [CN_FORA.esq.width, CN_FORA.esq.height] : null}; })()""")
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=str(SAIDA / 'v74_estadio_844x390.png'))
        P.confere(not r['err'] and max(r['stat']) <= 4096 and (r['fora'] is None or r['fora'][0]*r['fora'][1] <= 6e6),
                  '844x390: o Estádio abre seguindo o jogador, com a imagem do cenário dentro do limite (4096 px) e a de fora pequena', r)
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], '844x390: nenhum erro de JavaScript', [e for e in erros if e not in rede][:3])
        await b.close()
    return P.fim()


roda(principal())
