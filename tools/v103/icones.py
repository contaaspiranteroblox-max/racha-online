#!/usr/bin/env python3
"""RACHA v103 · os ícones do app (o PWA e a Tela de Início do iPhone) — feitos com a arte do próprio jogo, sem imagem de fora.

O RACHA pichado é o grafite do muro da tela inicial (tools/v101/arte/cena.py, grafite(): as cinco letras do roxo ao laranja,
o contorno escuro, os escorridos e a coroa dourada), desenhado pelo Chromium do Playwright com as fontes do jogo — o mesmo
caminho do tools/v101/arte/arte.py. O fundo é a própria cena da tela inicial (tools/v101/arte/fundo.webp: o céu do pôr do sol,
o Cristo e a favela acesa), desfocada e escurecida para o grafite ler bem até no ícone pequeno. O PIL monta cada tamanho:
  app/public/game/icones/racha-192.png e racha-512.png        (purpose "any": o grafite grande, quase de ponta a ponta)
  app/public/game/icones/racha-maskable-192.png e -512.png    (purpose "maskable": o grafite dentro do círculo seguro de 80%)
  app/public/game/icones/apple-touch-icon.png                 (180 × 180, sem transparência: o iPhone arredonda os cantos)
O build (tools/aplicar_rua.py) não roda isto: os PNG ficam no git, como as outras artes.
Uso:  python3 tools/v103/icones.py            (precisa do Playwright com o Chromium e do PIL)
      RACHA_PREVIA=<pasta> grava também a folha de prévia (os cinco ícones lado a lado, nos tamanhos de verdade e com a
      máscara redonda do Android por cima do maskable).
"""
import asyncio, importlib.util, os, pathlib, sys
sys.dont_write_bytecode = True                    # (sem __pycache__ nas pastas da arte)
from PIL import Image, ImageChops, ImageDraw, ImageFilter

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
ARTE = RAIZ / 'tools' / 'v101' / 'arte'
SAIDA = RAIZ / 'app' / 'public' / 'game' / 'icones'
NOITE = (13, 10, 34)                              # o azul-noite dos painéis da v101 (o fundo do app enquanto abre)


def modulo(caminho, nome):
    spec = importlib.util.spec_from_file_location(nome, caminho)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def grafite():
    """o RACHA pichado (com a coroa), sem o muro: fundo transparente, recortado rente à tinta"""
    arte = modulo(ARTE / 'arte.py', 'v103_arte')
    C = arte.modulo('cena')
    S = C.Svg()
    C.grafite(S)
    x0, y0, w, h = 540, 262, 580, 330            # (a janela do mundo 2400 × 1000 em volta do grafite: das letras à coroa)
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="%d %d %d %d"><defs>%s</defs>%s</svg>'
           % (w, h, x0, y0, w, h, ''.join(S.defs), ''.join(S.corpo)))
    im = asyncio.run(arte.desenha([('grafite103', svg, w, h, 3, True)]))['grafite103']
    caixa = im.getchannel('A').point(lambda a: 255 if a > 10 else 0).getbbox()
    return im.crop(caixa)


def ceu(n):
    """o fundo: a cena da tela inicial em volta do Cristo (o céu, o morro e as luzes), desfocada e escurecida"""
    im = Image.open(ARTE / 'fundo.webp').convert('RGB')
    W, H = im.size
    lado = H                                     # (um quadrado da altura toda: do céu ao chão molhado)
    cx = round(W * .565)                         # (o Cristo)
    q = im.crop((cx - lado // 2, 0, cx - lado // 2 + lado, lado)).resize((n, n), Image.LANCZOS)
    q = q.filter(ImageFilter.GaussianBlur(n * .028))
    escuro = Image.new('RGB', (n, n), NOITE)
    q = Image.blend(q, escuro, .48)
    # o escuro das beiradas (o olho vai para o meio) e o roxo do neon atrás das letras
    v = Image.new('L', (n, n), 0)
    d = ImageDraw.Draw(v)
    for i in range(40):
        t = i / 39
        r = n * (.78 - .36 * t)
        d.ellipse((n / 2 - r, n * .52 - r, n / 2 + r, n * .52 + r), fill=round(150 * t))
    v = v.filter(ImageFilter.GaussianBlur(n * .06))
    luz = Image.new('RGB', (n, n), (120, 40, 190))
    q = Image.composite(Image.blend(q, luz, .35), q, v)
    borda = Image.new('L', (n, n), 0)
    d = ImageDraw.Draw(borda)
    d.ellipse((-n * .2, -n * .2, n * 1.2, n * 1.2), fill=255)
    borda = ImageChops.invert(borda.filter(ImageFilter.GaussianBlur(n * .12)))
    return Image.composite(Image.new('RGB', (n, n), (6, 4, 16)), q, borda.point(lambda a: round(a * .8)))


def icone(g, n, largura, cy=.5):
    """o ícone n × n: o fundo e o grafite com largura (fração do lado), centrado em (0,5; cy), com a sombra escura atrás"""
    base = ceu(n).convert('RGBA')
    w = round(n * largura)
    h = round(g.height * w / g.width)
    letras = g.resize((w, h), Image.LANCZOS)
    x, y = (n - w) // 2, round(n * cy - h / 2)
    sombra = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    a = Image.new('L', (n, n), 0)
    a.paste(letras.getchannel('A'), (x, y + round(n * .012)))
    a = a.filter(ImageFilter.GaussianBlur(n * .02)).point(lambda v: round(v * .75))
    sombra.putalpha(a)
    base = Image.alpha_composite(base, sombra)
    camada = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    camada.paste(letras, (x, y), letras)
    return Image.alpha_composite(base, camada).convert('RGB')


def salva(im, nome):
    SAIDA.mkdir(parents=True, exist_ok=True)
    out = SAIDA / nome
    im.save(out, 'PNG', optimize=True)
    print('%-26s %4d × %-4d %6.1f KB' % ('icones/' + nome, im.width, im.height, out.stat().st_size / 1024))
    return out


def principal():
    g = grafite()
    feitos = {}
    for n in (192, 512):
        feitos['racha-%d.png' % n] = icone(g, n, .86, .52)
        # maskable: tudo o que importa dentro do círculo de raio 40% (o resto pode ser cortado pela máscara do aparelho)
        feitos['racha-maskable-%d.png' % n] = icone(g, n, .64, .52)
    feitos['apple-touch-icon.png'] = icone(g, 180, .8, .52)
    for nome, im in feitos.items():
        salva(im, nome)
    previa = os.environ.get('RACHA_PREVIA')
    if previa:
        folha = Image.new('RGB', (512 * 3 + 40 + 192 + 180 + 60, 532), (40, 40, 48))
        x = 10
        for nome in ('racha-512.png', 'racha-maskable-512.png'):
            folha.paste(feitos[nome], (x, 10)); x += 522
        m = feitos['racha-maskable-512.png'].copy()
        mascara = Image.new('L', (512, 512), 0)
        ImageDraw.Draw(mascara).ellipse((0, 0, 511, 511), fill=255)
        redondo = Image.new('RGB', (512, 512), (40, 40, 48))
        redondo.paste(m, (0, 0), mascara)
        folha.paste(redondo, (x, 10)); x += 522
        folha.paste(feitos['racha-192.png'], (x, 10)); x += 202
        folha.paste(feitos['apple-touch-icon.png'], (x, 10)); x += 190
        pequeno = feitos['racha-192.png'].resize((48, 48), Image.LANCZOS)
        folha.paste(pequeno, (x - 380, 300))
        pathlib.Path(previa).mkdir(parents=True, exist_ok=True)
        folha.save(pathlib.Path(previa) / 'icones_v103_previa.png')
        print('prévia em', pathlib.Path(previa) / 'icones_v103_previa.png')


if __name__ == '__main__':
    principal()
