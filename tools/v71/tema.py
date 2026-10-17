"""RACHA rua · v71.1 — o TEMA das telas de dentro: o azul-marinho vira o preto-carvão do lobby novo.

As telas das salas, da comunidade, do clube e do editor da tampinha (sala.css, tampa.css e partes do v70.css) foram
desenhadas em azul-marinho; o lobby da v71 é preto-carvão com amarelo. Em vez de reescrever centenas de regras à mão,
este script lê esses arquivos e gera app/public/game/v71-tema.css com:
  1) as variáveis do tema (--sx-*) no carvão;
  2) para cada declaração que tem uma cor da família do marinho (matiz 222°–236°, saturação ≥ 0,2), a mesma declaração
     com a cor trocada por um cinza-carvão de luz parecida (as escuras um pouco mais escuras, porque o azul parece mais
     escuro que o cinza na mesma luz). O seletor é o mesmo: o arquivo gerado vem depois na página, então vale ele.
As cores de destaque (o azul dos botões AZUL, o céu, os roxos das raridades) ficam como estão (fora dessa faixa).
O build (tools/aplicar_rua.py) roda isto sempre; o arquivo gerado não se edita à mão (o que for de desenho vai no v71.css).
"""
import re, colorsys, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent
JOGO = RAIZ / 'app' / 'public' / 'game'
FONTES = ['lobby.css', 'sala.css', 'tampa.css', 'v70.css']
SAIDA = JOGO / 'v71-tema.css'

VARIAVEIS = {'--sx-azul': '#23272d', '--sx-azul2': '#2d3239', '--sx-fundo': '#121417', '--sx-borda': '#0b0c0e',
             '--sx-linha': '#353b43', '--sx-txt': '#f3f1ea', '--sx-sub': '#a9b0ba',
             '--rx-azul': '#23272d', '--rx-azul2': '#2d3239', '--rx-borda': '#0b0c0e', '--rx-sub': '#a9b0ba'}


def _hls(r, g, b):
    return colorsys.rgb_to_hls(r/255, g/255, b/255)


def marinho(r, g, b):
    h, l, s = _hls(r, g, b)
    return 222 <= h*360 <= 236 and s >= .2


def carvao(r, g, b):
    """a cor do marinho na família do carvão (matiz 214°, saturação baixa)"""
    h, l, s = _hls(r, g, b)
    l2 = l*.86 if l < .5 else l
    s2 = .07 if l < .5 else .06
    rr, gg, bb = colorsys.hls_to_rgb(214/360, l2, s2)
    return round(rr*255), round(gg*255), round(bb*255)


HEX = re.compile(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
RGBA = re.compile(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*[\d.]+\s*)?\)')


def troca(valor):
    mudou = False

    def h(m):
        nonlocal mudou
        x = m.group(1)
        if len(x) == 3: x = ''.join(c*2 for c in x)
        r, g, b = (int(x[i:i + 2], 16) for i in (0, 2, 4))
        if not marinho(r, g, b): return m.group(0)
        mudou = True
        return '#%02x%02x%02x' % carvao(r, g, b)

    def a(m):
        nonlocal mudou
        r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if not marinho(r, g, b): return m.group(0)
        mudou = True
        r2, g2, b2 = carvao(r, g, b)
        return ('rgba(%d,%d,%d%s)' % (r2, g2, b2, m.group(4))) if m.group(4) else 'rgb(%d,%d,%d)' % (r2, g2, b2)

    v = HEX.sub(h, valor)
    v = RGBA.sub(a, v)
    return v, mudou


def regras(css):
    """(contexto @media ou '', seletor, corpo) de cada regra, com um nível de @media/@supports"""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    i, n, out, ctx = 0, len(css), [], ''
    pilha = []
    buf = ''
    while i < n:
        c = css[i]
        if c == '{':
            cab = buf.split(';')[-1].strip(); buf = ''          # (o que vem antes de um ';' solto não é seletor)
            if cab.startswith('@media') or cab.startswith('@supports'):
                pilha.append(cab); i += 1; continue
            if cab.startswith('@keyframes') or cab.startswith('@font-face') or cab.startswith('@-webkit-keyframes'):
                prof, j = 1, i + 1                       # pula o bloco inteiro
                while j < n and prof:
                    prof += {'{': 1, '}': -1}.get(css[j], 0); j += 1
                i = j; continue
            j = css.index('}', i)
            out.append((' and '.join(pilha), cab, css[i + 1:j]))
            i = j + 1; continue
        if c == '}':
            if pilha: pilha.pop()
            buf = ''; i += 1; continue
        buf += c; i += 1
    return out


def gera():
    linhas = ['/* GERADO por tools/v71/tema.py a cada build — não editar à mão (ver o cabeçalho do script).',
              '   O azul-marinho das telas de dentro (salas, comunidade, clube, editor) vira o preto-carvão do lobby da v71. */',
              '#lb{ ' + ' '.join('%s:%s;' % kv for kv in VARIAVEIS.items()) + ' }']
    total = 0
    for nome in FONTES:
        css = (JOGO / nome).read_text(encoding='utf-8')
        blocos = {}
        for ctx, sel, corpo in regras(css):
            decl = []
            for d in corpo.split(';'):
                if ':' not in d or d.strip().startswith('--sx-') or d.strip().startswith('--rx-'): continue
                prop, val = d.split(':', 1)
                v2, mudou = troca(val)
                if mudou: decl.append('%s:%s' % (prop.strip(), v2.strip()))
            if decl:
                blocos.setdefault(ctx, []).append('%s{ %s; }' % (' '.join(sel.split()), '; '.join(decl)))
                total += len(decl)
        if blocos:
            linhas.append('\n/* ---- de %s */' % nome)
            for ctx, rs in blocos.items():
                if ctx: linhas.append('%s{\n  %s\n}' % (ctx, '\n  '.join(rs)))
                else: linhas.extend(rs)
    SAIDA.write_text('\n'.join(linhas) + '\n', encoding='utf-8')
    return total


if __name__ == '__main__':
    print('v71-tema.css:', gera(), 'cores trocadas')
