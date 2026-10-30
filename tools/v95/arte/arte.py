"""RACHA v95 · gera as imagens desenhadas em código (tools/v95/arte/*.webp) — sem imagem gerada por IA.

Cada imagem é um SVG feito pelos scripts daqui (cena.py, logo.py, icones.py, banners.py, mapas.py, caras.py), desenhado pelo Chromium do
Playwright (as letras com as fontes do jogo, app/public/game/fontes) e salvo em WebP. O build (tools/v95/v95.py) troca as
imagens antigas (as da v75, v77 e v91, que vinham de imagens geradas por IA) por estas, com as mesmas medidas.
Uso:  python3 tools/v95/arte/arte.py [nome ...]      (sem nome: todas)
"""
import asyncio, io, json, pathlib, sys
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent.parent
FONTES = RAIZ / 'app' / 'public' / 'game' / 'fontes'
sys.path.insert(0, str(AQUI))

CSS_FONTES = ''.join("@font-face{font-family:'%s';src:url('file://%s') format('truetype');}" % (n, FONTES / a) for n, a in (
    ('LilitaOne', 'LilitaOne-Regular.ttf'), ('Anton', 'Anton-Regular.ttf'), ('BarlowCondensed', 'BarlowCondensed-ExtraBold.ttf'),
    ('BarlowCondensedB', 'BarlowCondensed-Bold.ttf'), ('Barlow', 'Barlow-Bold.ttf')))


async def desenha(itens):
    """itens: [(nome, svg, w, h, escala, qualidade, alfa)] → tools/v95/arte/<nome>.webp"""
    from playwright.async_api import async_playwright
    from PIL import Image
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for nome, svg, w, h, esc, q, alfa in itens:
            pg = await b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=esc)
            html = ('<!doctype html><html><head><meta charset="utf-8"><style>%s html,body{margin:0;padding:0;background:%s;overflow:hidden}'
                    'svg{display:block}</style></head><body>%s</body></html>' % (CSS_FONTES, 'transparent' if alfa else '#000', svg))
            tmp = AQUI / ('_tmp_%s.html' % nome)
            tmp.write_text(html, encoding='utf-8')
            await pg.goto('file://' + str(tmp))
            await pg.evaluate('document.fonts.ready')
            await pg.wait_for_timeout(120)
            png = await pg.screenshot(clip={'x': 0, 'y': 0, 'width': w, 'height': h}, omit_background=bool(alfa))
            tmp.unlink()
            im = Image.open(io.BytesIO(png))
            im = im.convert('RGBA' if alfa else 'RGB')
            out = AQUI / (nome + '.webp')
            im.save(out, 'WEBP', quality=q, method=6)
            print('%-18s %4d × %-4d (×%s)  %6.1f KB' % (nome, im.width, im.height, esc, out.stat().st_size / 1024))
            await pg.close()
        await b.close()


def todos():
    from cena import svg_cena
    L = []
    # o fundo do lobby (V91_FUNDO.src): o mundo inteiro, 2272 × 837 (desenhado em 1,5× para as telas grandes)
    L.append(('fundo', svg_cena(0, 0, 2272, 837, 2272, 837), 2272, 837, 1.5, 84, False))
    # o fundo das telas (V91_FUNDO.telas): a mesma cena desfocada e escurecida, pequena (vai esticada atrás das telas)
    L.append(('fundo_telas', svg_cena(0, 0, 2272, 837, 1136, 418, escurece=.42, borra=9, grao=False), 1136, 418, 1, 80, False))
    # os fundos da v75 e da v77 (LOBBY75 e V77P.fundo: 1844 × 853, a tampinha em 917, 548): a mesma quadra, de mais longe
    k = .62
    x0, y0 = 1132 - 917 / k, 386 - 548 / k
    L.append(('fundo77', svg_cena(x0, y0, 1844 / k, 853 / k, 1844, 853), 1844, 853, 1, 80, False))
    L.append(('fundo75', svg_cena(x0, y0, 1844 / k, 853 / k, 922, 427, grao=False), 922, 427, 1, 72, False))   # (o da v75 só aparece sem o da v77: pequeno)
    # o letreiro (V77P.letreiro: 447 × 221, transparente; desenhado em 2×)
    from logo import svg_logo
    L.append(('letreiro', svg_logo(447, 221), 447, 221, 2, 90, True))
    # o banner do perfil de antes (V77P.banner: 760 × 190): as casas de noite (o letreiro vai por cima, à direita)
    L.append(('banner_perfil', svg_cena(300, 128, 760, 190, 760, 190, hora='noite'), 760, 190, 2, 82, False))
    # a folha de ícones (V77P.icones: 520 × 268, transparente; os mesmos lugares; desenhada em 2×)
    from icones import svg_icones
    L.append(('icones', svg_icones(), 520, 268, 2, 92, True))
    # os 6 banners de perfil (V91_BANNERS: as cenas 720 × 200, uma embaixo da outra; desenhados em 1,5× — o build acerta as medidas)
    from banners import svg_atlas
    L.append(('banners', svg_atlas(), 720, 1200, 1.5, 84, False))
    # os kits dos mapas (QD_KIT da Arena: 1700 × 1057; CN_KIT do Estádio de noite: 640 × 630), transparentes, os mesmos lugares (1×:
    # o jogo recorta as peças em pixels da imagem)
    from mapas import svg_quadra, svg_noite
    L.append(('quadra_kit', svg_quadra(), 1700, 1057, 1, 88, True))
    L.append(('campo_noite_kit', svg_noite(), 640, 630, 1, 88, True))
    # as caras das tampinhas animadas (SK76_KIT: as 8 peças da v76 — 5 caras e 3 camadas da frente —, maiores: o mapa das peças
    # vai em skins_kit.json)
    from caras import svg_kit
    svg, w, h = svg_kit()
    L.append(('skins_kit', svg, w, h, 1, 90, True))
    return L


def grao_tx(caminho):
    """o grão da tinta da Arena (a peça tx_det do kit: o cinza 128 com o ruído, sem emenda quando repete)"""
    import numpy as np
    from PIL import Image
    from mapas import QDJ
    x, y, w, h = QDJ['tx_det']
    rng = np.random.default_rng(7)
    n = rng.normal(0, 1, (h, w))
    for _ in range(2):                                  # (desfoque que dá a volta: o ladrilho repete sem emenda)
        n = (n + np.roll(n, 1, 0) + np.roll(n, -1, 0) + np.roll(n, 1, 1) + np.roll(n, -1, 1)) / 5
    n = (n - n.mean()) / (n.std() + 1e-9)
    g = np.clip(128 + n * 15, 0, 255).astype('uint8')
    im = Image.open(caminho).convert('RGBA')
    tile = Image.fromarray(np.dstack([g, g, g, np.full_like(g, 255)]), 'RGBA')
    im.paste(tile, (x, y))
    im.save(caminho, 'WEBP', quality=88, method=6)


if __name__ == '__main__':
    quais = set(sys.argv[1:])
    itens = [x for x in todos() if not quais or x[0] in quais]
    asyncio.run(desenha(itens))
    if any(x[0] == 'quadra_kit' for x in itens):
        grao_tx(AQUI / 'quadra_kit.webp')
    if any(x[0] == 'skins_kit' for x in itens):
        from caras import rects
        (AQUI / 'skins_kit.json').write_text(json.dumps(rects(), indent=1), encoding='utf-8')
