"""RACHA v101 · gera a arte desenhada em código da v101 (tools/v101/arte/*.webp e fundo.json) — sem imagem gerada por IA.

Cada imagem é um SVG feito pelos scripts daqui (cena.py: o fundo; oficina.py: a ilustração do cartão da OFICINA), desenhado
pelo Chromium do Playwright com as fontes do jogo (app/public/game/fontes) e salvo em WebP. O sprite dos ícones (sprite.py)
vai como SVG para dentro do jogo (o build chama svg_sprite()); aqui ele só ganha a folha de prévia.
Uso:  python3 tools/v101/arte/arte.py [fundo] [telas] [oficina] [icones] [previa]      (sem nome: tudo)
      RACHA_PREVIA=<pasta> é onde ficam as prévias (o padrão é a pasta temporária do sistema: nada de prévia no projeto);
      RACHA_REFERENCIA=<png> põe a imagem de referência na prévia, ao lado do fundo.
"""
import asyncio, importlib.util, io, json, os, pathlib, sys, tempfile
sys.dont_write_bytecode = True                    # (sem __pycache__ na pasta da arte)
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent.parent
FONTES = RAIZ / 'app' / 'public' / 'game' / 'fontes'
PREVIA = pathlib.Path(os.environ.get('RACHA_PREVIA', str(pathlib.Path(tempfile.gettempdir()) / 'racha_v101_previas')))

CSS_FONTES = ''.join("@font-face{font-family:'%s';src:url('file://%s') format('truetype');}" % (n, FONTES / a) for n, a in (
    ('LilitaOne', 'LilitaOne-Regular.ttf'), ('Lilita One', 'LilitaOne-Regular.ttf'), ('Anton', 'Anton-Regular.ttf'),
    ('BarlowCondensed', 'BarlowCondensed-ExtraBold.ttf'), ('BarlowCondensedB', 'BarlowCondensed-Bold.ttf'), ('Barlow', 'Barlow-Bold.ttf')))


def modulo(nome):
    """importa um script daqui pelo caminho (os nomes cena/sprite também existem na pasta da v95)"""
    spec = importlib.util.spec_from_file_location('v101arte_' + nome, AQUI / (nome + '.py'))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


async def desenha(itens):
    """itens: [(nome, html_do_corpo, w, h, escala, alfa)] → {nome: PIL.Image}"""
    from playwright.async_api import async_playwright
    from PIL import Image
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--no-sandbox'])
        for nome, corpo, w, h, esc, alfa in itens:
            pg = await b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=esc)
            html = ('<!doctype html><html><head><meta charset="utf-8"><style>%s html,body{margin:0;padding:0;background:%s;overflow:hidden}'
                    'svg{display:block}</style></head><body>%s</body></html>' % (CSS_FONTES, 'transparent' if alfa else '#000', corpo))
            tmp = AQUI / ('_tmp_%s.html' % nome)
            tmp.write_text(html, encoding='utf-8')
            try:
                await pg.goto('file://' + str(tmp))
                await pg.evaluate('document.fonts.ready')
                await pg.wait_for_timeout(200)
                png = await pg.screenshot(clip={'x': 0, 'y': 0, 'width': w, 'height': h}, omit_background=bool(alfa))
            finally:
                tmp.unlink()
            out[nome] = Image.open(io.BytesIO(png)).convert('RGBA' if alfa else 'RGB')
            await pg.close()
        await b.close()
    return out


def salva(im, nome, q):
    out = AQUI / (nome + '.webp')
    im.save(out, 'WEBP', quality=q, method=6)
    print('%-14s %4d × %-4d  %6.1f KB' % (nome + '.webp', im.width, im.height, out.stat().st_size / 1024))
    return out


def fundo(escala=1.25):
    C = modulo('cena')
    ims = asyncio.run(desenha([('fundo', C.svg_cena101(0, 0, C.W, C.H, C.W, C.H), C.W, C.H, escala, False)]))
    im = ims['fundo']
    PREVIA.mkdir(parents=True, exist_ok=True)
    im.save(PREVIA / 'fundo_inteiro.png')
    salva(im, 'fundo', 80)
    json.dump(C.info(), open(AQUI / 'fundo.json', 'w'), indent=1, ensure_ascii=False)
    return im


def telas():
    """o fundo das telas internas: a mesma cena pequena, desfocada e escurecida (o painel fica legível por cima)"""
    import numpy as np
    from PIL import Image, ImageFilter
    C = modulo('cena')
    ims = asyncio.run(desenha([('telas', C.svg_cena101(0, 0, C.W, C.H, 1200, 500), 1200, 500, 1, False)]))
    im = ims['telas'].filter(ImageFilter.GaussianBlur(9))
    q = np.asarray(im).astype(np.float32)
    q = q * np.array([.5, .46, .6], np.float32) + np.array([8, 5, 22], np.float32)
    return salva(Image.fromarray(np.clip(q, 0, 255).astype(np.uint8)), 'fundo_telas', 78)


def oficina():
    O = modulo('oficina')
    ims = asyncio.run(desenha([('oficina', O.svg_oficina(), O.W, O.H, 2, True)]))
    return salva(ims['oficina'], 'oficina', 88)


def icones():
    """a folha de prévia dos ícones (32 e 64 px no painel escuro) — o sprite em si vai para o jogo pelo build"""
    S = modulo('sprite')
    nomes = S.NOMES
    sprite = S.svg_sprite()
    cel = []
    for n in nomes:
        w = S.LARGOS.get(n, 100)
        u = '<svg viewBox="0 0 %d 100" width="%d" height="%d"><use href="#v91i-%s"/></svg>'
        cel.append('<div class="c"><div class="g">%s</div><div class="p">%s %s</div><b>%s</b></div>'
                   % (u % (w, round(64 * w / 100), 64, n), u % (w, round(32 * w / 100), 32, n), u % (w, round(24 * w / 100), 24, n), n))
    corpo = ('<style>body{background:#12153a;font:600 12px Barlow,sans-serif;color:#cfd2ff}.w{display:flex;flex-wrap:wrap;gap:10px;padding:14px;width:1092px}'
             '.c{width:124px;height:132px;background:#1a1d4a;border:1px solid #3a3f8a;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}'
             '.p{display:flex;gap:8px;align-items:center}b{font-size:11px;letter-spacing:.5px}</style>' + sprite + '<div class="w">%s</div>' % ''.join(cel))
    lin = (len(nomes) + 7) // 8
    ims = asyncio.run(desenha([('icones', corpo, 1120, 28 + lin * 142, 1, False)]))
    PREVIA.mkdir(parents=True, exist_ok=True)
    ims['icones'].save(PREVIA / 'icones_previa.png')
    print('icones_previa.png  %d ícones' % len(nomes))


# a interface da referência (828 × 466): onde ficam os botões (para a prévia)
UI = {
    'cartoes': [(12, 6, 187, 54), (205, 6, 345, 54), (508, 12, 592, 40), (598, 12, 683, 40), (690, 8, 820, 44)],
    'esq': [(10, 86, 116, 128), (10, 132, 116, 174), (10, 178, 116, 220), (10, 224, 116, 266), (8, 272, 190, 326)],
    'dir': [(722, 86, 820, 128), (722, 132, 820, 174), (722, 178, 820, 220), (722, 224, 820, 266)],
    'baixo': [(10, 376, 240, 438), (246, 382, 304, 438), (309, 382, 482, 438), (486, 382, 625, 438), (630, 370, 815, 440)],
}


def previa(im=None):
    """o fundo em 16:9 (x 311..2089) com os botões por cima, ao lado da referência; e o celular deitado (19,5:9)"""
    from PIL import Image, ImageDraw
    C = modulo('cena')
    if im is None:
        im = Image.open(PREVIA / 'fundo_inteiro.png').convert('RGB')
    k = im.width / C.W
    caminho_ref = pathlib.Path(os.environ.get('RACHA_REFERENCIA', '/nao-tem'))
    jan = im.crop((round(311 * k), 0, round(2089 * k), im.height)).resize((828, 466), Image.LANCZOS)
    com = jan.copy().convert('RGBA')
    d = ImageDraw.Draw(com, 'RGBA')
    for grupo in UI.values():
        for b in grupo:
            d.rounded_rectangle(b, radius=5, fill=(14, 16, 48, 150), outline=(140, 150, 255, 160))
    d.ellipse((415 - 75, 272 - 75, 415 + 75, 272 + 75), outline=(200, 120, 255, 220), width=2)
    for x in (292, 513, 577):
        d.ellipse((x - 23, 289 - 23, x + 23, 289 + 23), outline=(255, 140, 60, 220), width=2)
    lado = Image.new('RGB', (828 * 2 + 12, 466 * 2 + 12), (0, 0, 0))
    lado.paste(jan, (0, 0)); lado.paste(com.convert('RGB'), (840, 0))
    if caminho_ref.exists():
        lado.paste(Image.open(caminho_ref).convert('RGB').resize((828, 466)), (0, 478))
    cel = im.crop((round(117 * k), 0, round(2283 * k), im.height)).resize((828, round(828 * im.height / ((2283 - 117) * k))), Image.LANCZOS)
    lado.paste(cel, (840, 478))
    PREVIA.mkdir(parents=True, exist_ok=True)
    lado.save(PREVIA / 'fundo_previa.png')
    jan.save(PREVIA / 'fundo_16x9.png')
    print('prévias em', PREVIA)


if __name__ == '__main__':
    pedidos = [a for a in sys.argv[1:]] or ['fundo', 'telas', 'oficina', 'icones', 'previa']
    im = None
    if 'fundo' in pedidos:
        im = fundo()
    if 'telas' in pedidos:
        telas()
    if 'oficina' in pedidos and (AQUI / 'oficina.py').exists():
        oficina()
    if 'icones' in pedidos and (AQUI / 'sprite.py').exists():
        icones()
    if 'previa' in pedidos:
        previa(im)
