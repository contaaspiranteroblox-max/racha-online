"""RACHA v95 · A RODADA DO FIM DE PARTIDA, DOS EMOJIS, DA RANQUEADA, DO CHAT, DO PERFIL, DOS CAMPOS E DA ECONOMIA
(aplicada por último, depois da Oficina). O pedido: "depois que termina as partidas, faça algo nesse estilo [a imagem do
VITÓRIA DO AZUL], e esses emojis faça para pôr na tampinha, o sistema de ranqueada: faça patentes mais bonitas, a ranqueada
mais daora na hora de jogar, ao escolher faça algo diferente, quantos players estão procurando partida etc, players online,
chat mais fácil de mexer, e um perfil que os caras olhem e sintam orgulho de ver, aumente os mapas de 1v1 2v2 3v3 4v4 (estão
muito pequenos), melhore a economia do jogo".
- os CAMPOS 30% maiores: as medidas de MODOS e MARCAS_MODO (fora do bloco PHYS — a física é a mesma; só o tamanho do campo, do
  gol e das marcas cresce) — o servidor (server/partida/fisica.js e nucleo.js) tem as mesmas;
- o código em tools/v95/*.js (na ordem de ARQUIVOS), colado no fim do script principal, depois da Oficina; o atlas dos emojis
  (tools/v95/emojis.webp, feito pelo tools/v95/emojis_atlas.py) entra embutido no lugar da marca /*EMJ95*/null;
- o estilo em app/public/game/v95.css (depois do oficina.css).
Nada no bloco PHYS muda (o build confere o sha da física)."""
import base64, json, pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- o estilo depois do da Oficina
SUBS.append(('<link rel="stylesheet" href="./oficina.css">\n', '<link rel="stylesheet" href="./oficina.css">\n<link rel="stylesheet" href="./v95.css">\n'))

# ---- os campos 30% maiores (o 1v1 ao 4v4): a área da bola, as áreas, o pênalti, o círculo e a meia-lua × 1,3; a faixa de fora
#      (onde só o jogador anda: atrás do gol e nas laterais) continua a mesma; o GOL (a boca e a profundidade) é o de antes — o
#      pedido depois de testar: "os gols quero que nem antes, agora ficou muito grande; quero apenas o campo maior"
MODOS_ANTES = """const MODOS = [
  {nome:'1v1', jog:[71, 50],   bola:[56, 40],  gol:[6.6, 12.8], trave:.5, rede:.4, pressao:[16, 40],   penalti:[25, 25]},
  {nome:'2v2', jog:[86, 60],   bola:[71, 50],  gol:[6.6, 16],   trave:.5, rede:.4, pressao:[21.3, 50], penalti:[31.7, 31.7]},
  {nome:'3v3', jog:[101, 80],  bola:[86, 70],  gol:[7, 20.5],   trave:.5, rede:.4, pressao:[25, 70],   penalti:[38.4, 38.4]},
  {nome:'4v4', jog:[124, 100], bola:[108, 90], gol:[7, 24.5],   trave:.5, rede:.4, pressao:[33, 90],   penalti:[48.4, 48.4]}
];"""
MODOS_V95 = """const MODOS = [                                     // v95: o campo 30% maior (a área da bola e as marcas × 1,3; a faixa de fora igual) · o gol do tamanho de antes
  {nome:'1v1', jog:[87.8, 62],   bola:[72.8, 52],   gol:[6.6, 12.8], trave:.5, rede:.4, pressao:[20.8, 52],   penalti:[32.5, 32.5]},
  {nome:'2v2', jog:[107.3, 75],  bola:[92.3, 65],   gol:[6.6, 16],   trave:.5, rede:.4, pressao:[27.7, 65],   penalti:[41.2, 41.2]},
  {nome:'3v3', jog:[126.8, 101], bola:[111.8, 91],  gol:[7, 20.5],   trave:.5, rede:.4, pressao:[32.5, 91],   penalti:[49.9, 49.9]},
  {nome:'4v4', jog:[156.4, 127], bola:[140.4, 117], gol:[7, 24.5],   trave:.5, rede:.4, pressao:[42.9, 117],  penalti:[62.9, 62.9]}
];"""
MARCAS_ANTES = """const MARCAS_MODO = [
  {area:[13.333, 26.667], pequena:[6.667, 16.667], penalti:9.667,  circulo:8,      saida:8,    meiaLua:[8.6, 6.667]},
  {area:[16.667, 33.333], pequena:[10, 23.333],     penalti:13,     circulo:10,     saida:10,   meiaLua:[10.8, 8.333]},
  {area:[20, 40],         pequena:[13.333, 26.667], penalti:16.333, circulo:12.167, saida:12,   meiaLua:[12.833, 10]},
  {area:[25, 50],         pequena:[16.667, 33.333], penalti:21.333, circulo:13.5,   saida:13.5, meiaLua:[16.167, 12.5]}
];"""
MARCAS_V95 = """const MARCAS_MODO = [                               // v95: × 1,3 (as do servidor — SAIDA_U do núcleo — são as mesmas)
  {area:[17.333, 34.667], pequena:[8.667, 21.667],  penalti:12.567, circulo:10.4,   saida:10.4,  meiaLua:[11.18, 8.667]},
  {area:[21.667, 43.333], pequena:[13, 30.333],     penalti:16.9,   circulo:13,     saida:13,    meiaLua:[14.04, 10.833]},
  {area:[26, 52],         pequena:[17.333, 34.667], penalti:21.233, circulo:15.817, saida:15.6,  meiaLua:[16.683, 13]},
  {area:[32.5, 65],       pequena:[21.667, 43.333], penalti:27.733, circulo:17.55,  saida:17.55, meiaLua:[21.017, 16.25]}
];"""
SUBS.append((MODOS_ANTES, MODOS_V95))
SUBS.append((MARCAS_ANTES, MARCAS_V95))

# ---- a tampinha INICIAL: as listras em pé ROXO, BRANCO e LARANJA (o Tricolor: a do meio é o fundo, branco; a borda de sempre);
#      no time, a cor do time dos lados (Time A: laranja, branco e laranja; Time B: roxo, branco e roxo). A da v80 (metade laranja,
#      metade roxa) e as do time dela ficam guardadas só para a troca (tools/v95/times.js: quem chega com ela vê a nova).
SUBS.append(("const TP_PADRAO_COD = tpCodigo(TP_PADRAO_V80('#ff6a00', '#7a3fc4'));   // v80: sem equipe, metade laranja (esquerda) e metade roxa (direita)",
             "const TP_PADRAO_V80COD = tpCodigo(TP_PADRAO_V80('#ff6a00', '#7a3fc4'));   // v95: a inicial da v80 (metade laranja, metade roxa: só para a troca)\n"
             "const TP_PADRAO_V95 = (esq, dir) => Object.assign(TP_PADRAO_V71('#f4f2ec', esq, '#c7ccd2', 'tc'), {pc:['#f4f2ec', esq, dir]});   // v95: o Tricolor, as listras em pé (a do meio, branca)\n"
             "const TP_PADRAO_COD = tpCodigo(TP_PADRAO_V95('#7a3fc4', '#ff6a00'));   // v95: sem equipe, roxo, branco e laranja"))
SUBS.append(("const TP_TIME_COD = [tpCodigo(TP_PADRAO_V80('#ff6a00', '#ff6a00')), tpCodigo(TP_PADRAO_V80('#7a3fc4', '#7a3fc4'))];   // v80: no Time A toda laranja; no Time B toda roxa",
             "const TP_TIME_V80 = [tpCodigo(TP_PADRAO_V80('#ff6a00', '#ff6a00')), tpCodigo(TP_PADRAO_V80('#7a3fc4', '#7a3fc4'))];   // v95: as do time da v80 (só para a troca)\n"
             "const TP_TIME_COD = [tpCodigo(TP_PADRAO_V95('#ff6a00', '#ff6a00')), tpCodigo(TP_PADRAO_V95('#7a3fc4', '#7a3fc4'))];   // v95: Time A laranja, branco e laranja; Time B roxo, branco e roxo"))
SUBS.append(("a padrão é a Listras, metade laranja e metade roxa — no Time A ela fica toda laranja; no Time B, toda roxa.",
             "a inicial tem as listras roxo, branco e laranja — no Time A ela fica laranja, branco e laranja; no Time B, roxo, branco e roxo."))

# ---- a ARTE desenhada aqui (tools/v95/arte/arte.py: SVG desenhado em código, sem imagem gerada por IA) no lugar das imagens
#      da v75, v77 e v91 (as que vinham de imagens geradas por IA — ver PROVENIENCIA.md), com as mesmas medidas: o fundo do
#      lobby e o das telas, os fundos antigos do lobby e do perfil, o letreiro, o banner do perfil, a folha de ícones e os
#      banners de perfil. (Até a v109, cada troca era a imagem inteira: o texto base64 da antiga pelo da nova.)
ARTE = AQUI / 'arte'
# (v110: as imagens antigas — tools/v74, v75, v76, v77 e v91 — saíram do projeto. A arte daqui entra direto nas etapas de
#  cada versão (tools/aplicar_rua.py e tools/v91/v91.py), no lugar onde a imagem antiga entrava: não há mais o que trocar.
#  As caras das tampinhas animadas (SK76_KIT: CRIA, CRISTO, PITBULL, FÉ e DRAGÃO) também: tools/v95/arte/caras.py, com o
#  mapa das peças tools/v95/arte/skins_kit.json.)

# (os banners desenhados em 1,5×: as medidas do atlas acompanham — o recorte de cada cena é em pixels da imagem)
def _webp_tamanho(p):                                  # (v101: o tamanho lido do cabeçalho do WebP — o build só usa a biblioteca padrão;
    b = p.read_bytes()[:30]                             #  com o PIL, o build no GitHub Actions caía: lá o Python vem sem ele)
    assert b[:4] == b'RIFF' and b[8:12] == b'WEBP', 'não é um WebP: %s' % p
    if b[12:16] == b'VP8X': return 1 + int.from_bytes(b[24:27], 'little'), 1 + int.from_bytes(b[27:30], 'little')
    if b[12:16] == b'VP8 ': return int.from_bytes(b[26:28], 'little') & 0x3fff, int.from_bytes(b[28:30], 'little') & 0x3fff
    if b[12:16] == b'VP8L': v = int.from_bytes(b[21:25], 'little'); return (v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1
    raise ValueError('WebP desconhecido: %s' % p)
if (ARTE / 'banners.webp').exists():
    _bw, _bh = _webp_tamanho(ARTE / 'banners.webp')
    if (_bw, _bh) != (720, 1200):
        SUBS.append(('", w:720, h:200, cenas:[', '", w:%d, h:%d, cenas:[' % (_bw, _bh // 6)))

# ---- os ícones da v91 (o sprite v91i-*: a tela inicial e as telas) no desenho chapado da v95 (tools/v95/arte/sprite.py: os
#      mesmos 22 nomes, o contorno de tinta e a cor chapada, a mesma família da folha de ícones)
import re as _re, sys as _sys
_sys.path.insert(0, str(ARTE))
from sprite import svg_sprite as _svg_sprite
def _sprite_js(svg):
    svg = _re.sub(r'<!--.*?-->', '', svg, flags=_re.S)
    svg = _re.sub(r'>\s+<', '><', svg).strip()
    return 'const V91_SPRITE = ' + json.dumps(svg, ensure_ascii=False) + ';'
SUBS.append((_sprite_js((RAIZ / 'tools' / 'v91' / 'icones.svg').read_text(encoding='utf-8')), _sprite_js(_svg_sprite())))

# ---- o código
ARQUIVOS = ['visual.js', 'times.js', 'emoji.js', 'fim.js', 'patentes.js', 'ranqueada.js', 'chat.js', 'perfil.js', 'economia.js', 'hud.js', 'grupo.js', 'mapas.js']
for n in ARQUIVOS:
    assert (AQUI / n).exists(), 'falta tools/v95/' + n
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v95/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
# o atlas dos emojis (feito pelo tools/v95/emojis_atlas.py): {src, lado, p:{id:[x, y]}}
ATLAS = json.loads((AQUI / 'emojis.json').read_text(encoding='utf-8'))
assert CODIGO.count('/*EMJ95*/null') == 1, 'a marca do atlas dos emojis'
CODIGO = CODIGO.replace('/*EMJ95*/null', '{src:"data:image/webp;base64,' + base64.b64encode((AQUI / 'emojis.webp').read_bytes()).decode('ascii') + '",lado:'
                        + str(int(ATLAS['lado'])) + ',p:' + json.dumps(ATLAS['p'], separators=(',', ':')) + '}', 1)
assert '</script' not in CODIGO.lower(), 'o código da v95 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v95 (tools/v95/*.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
