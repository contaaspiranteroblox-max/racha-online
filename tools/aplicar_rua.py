#!/usr/bin/env python3
"""RACHA · identidade visual de rua.
Lê o backup original (backup/racha.html) e gera public/game/racha.html:
  1. recolore SOMENTE o bloco <style> (roxo/neon -> asfalto/amarelo quadra/tijolo)
  2. liga rua.css (camada nova) e as fontes
  3. liga rua.js (cenário novo do lobby) e o gancho em cenaQuadra
  4. repinta paletas dos mapas (constantes de cor, fora do bloco PHYS)
  5. liga arena.js: a Arena (campo principal) redesenhada como a quadra da comunidade
  6. liga lobby.css/lobby.js: o lobby em colunas (com RANKING) e o fundo da favela com o Cristo
  7. v67 (tools/partida_rua.js, colado no fim do script): analógico novo e fixo, mais câmeras e o jogo sem skins
  8. v68 (tools/salas_rua.js depois do partida_rua.js + sala.css): as salas (lista, criar, a sala na favela),
     a sala neste aparelho com bots e o árbitro (times, pausa, encerrar, banir, apito)
  9. v69 (tools/tampa_rua.js + editor_rua.js + clubes_rua.js depois do salas_rua.js + tampa.css): as tampinhas
     personalizadas (borda, padrão, ícone, cores, posição, tamanho, ângulo, pré-projetadas, inventário) e os clubes
 10. v70 (tools/v70/*.py, por etapa): regras e resultados, câmera, interface, perfil/economia, clube/online e polimento.
     v70.1 (tools/v70/celular.js): só na horizontal e tudo cabe na tela do celular.
     v70.2 (tools/v70/enxuto.py + enxuto.js): só FUTEBOL e COM CURVA, só a ARENA e o ESTÁDIO (gramado novo, mesma física),
     a bola sem efeitos e a Seta da direção começando desligada (os modos e mapas que saíram ficam guardados).
     Dentro do bloco PHYS só entram as trocas listadas em SUBS_PHYS (funções de regra, texto e dados do replay).
 11. v71–v76 (tools/v71/ … tools/v76/, colados no fim do script): preto × branco, o lobby novo, o sensor, o Estádio da imagem,
     o fundo do lobby da imagem e as tampinhas animadas.
 12. v77 (tools/v77/pecas.js, lobby.js, telas.js e quadra.js + v77.css, com as peças das imagens embutidas): o lobby e o perfil
     como nas imagens enviadas, cada botão abrindo só a sua tela e o mapa principal (a Arena) como a quadra da imagem.
 13. v78 (tools/v78/bots.js, perfil.js + v78.css): os bots novos (os jeitos de jogar, os companheiros que jogam com você, o placar
     mexendo no jogo), nada escrito em cima da cabeça dos jogadores, e o perfil mais fácil de entender, com a tampinha maior.
 14. v79 (tools/v79/patentes.js, ranqueada.js, selo.js + v79.css): as 8 patentes da ranqueada (Bronze a Lendário, III → I), só
     ranqueada (a casual saiu), no Estádio, com a busca de partida online e os bots quando ninguém aparece, e o selo V.
 15. v80 (tools/v80/times.py + times.js, partida.js, gol.js, treino.js + v80.css): Time A laranja × Time B roxo e a tampinha
     inicial no modelo Listras (metade/metade; toda da cor do time), o placar novo com 3:00 (o relógio do servidor na online),
     a prorrogação só no 0 × 0 até -2:00, o empate, os adversários sem os indicadores a mais, a animação GOOOL! e os
     controles novos do treino.
 16. v81 (tools/v81/chat.js + v81.css): o chat com cara própria — a barra fixa embaixo no menu, nas telas, na sala e na partida,
     as abas BRASIL | SALA, o perfil pelo nome, o "digitando" com três pontinhos em cima da tampinha e a moderação (silenciar,
     denunciar, filtros, limite, ocultar).
 17. v82 (tools/v82/conta.py + inicio.js + conta.js + v82.css): as contas — cada conta com o seu progresso no aparelho e a cópia
     na conta (o script de entrada antes do jogo), a patente da ranqueada calculada e guardada pela plataforma, o nível e o XP da
     conta (uma curva só), RANKING › PATENTES, ENTRAR/CRIAR CONTA pelo jogo.
 18. v83/v84 (tools/v84/v84.py + login_cedo.js + login.js, aplicados por último): os textos das salas hospedadas no servidor
     (o criador é o admin) e o login obrigatório sem o site. Antes da auditoria de 17/10/2026 essas mudanças estavam só no
     racha.html gerado (o build não as reproduzia); agora o build gera o mesmo arquivo entregue na v84.
Falha se o bloco de física (PHYS_START..PHYS_END) mudar fora das trocas de regra documentadas em tools/v70/*.py:
o bloco original precisa ter o sha256 de sempre, e o bloco final precisa ser exatamente o original com essas trocas."""
import re, sys, colorsys, hashlib, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent   # (a pasta do projeto: tools/..)
ORIG = RAIZ / 'backup' / 'racha.html'
SAIDA = RAIZ / 'app' / 'public' / 'game' / 'racha.html'

src = ORIG.read_text(encoding='utf-8')

def bloco_fisica(t):
    a = t.index('/*PHYS_START*/'); b = t.index('/*PHYS_END*/')
    return t[a:b]
hash_antes = hashlib.sha256(bloco_fisica(src).encode()).hexdigest()
# v86: o bloco de física da base voltou a ser o da v84 (a mecânica clássica; a v85 tinha trocado pela FR-85). A trava
# continua: mudar a física sem atualizar este sha falha o build.
assert hash_antes == 'ad9f1d2216409b0e6d80b5227cc1fceda1869a5c2f0431075989af902b4d45ac', 'O BLOCO DE FÍSICA DA BASE MUDOU (atualize o sha conscientemente)'

# v70: as etapas (cada arquivo define SUBS e, se precisar, SUBS_PHYS); a ordem é a do pedido
V70_ETAPAS = ['regras', 'camera', 'interface', 'perfil', 'online', 'polimento', 'enxuto',   # v70.2: enxuto (2 modos, 2 mapas, a bola sem efeitos)
              'v71/times',                                                                # v71: preto × branco (as etapas da v71 moram em tools/v71/)
              'v80/times',                                                                # v80: Time A laranja × Time B roxo e a tampinha Listras
              'v82/conta',                                                                # v82: as contas (o script de entrada, a exportação, o XP das missões)
              'v84/v84']                                                                  # v83/v84: os textos das salas no servidor e o login obrigatório (eram editados direto no gerado)
# (v73: o TESTE da v72 saiu, a pedido: 'v72/teste' e os 2 ganchos dele no physicsStep não entram mais; o bloco volta ao da v71.1)
V70 = []
for nome in V70_ETAPAS:
    arq = RAIZ / 'tools' / ((nome if '/' in nome else 'v70/' + nome) + '.py')
    if not arq.exists(): continue
    ns = {'__file__': str(arq)}                         # (v82: a etapa lê o inicio.js ao lado dela)
    exec(compile(arq.read_text(encoding='utf-8'), str(arq), 'exec'), ns)
    V70.append((nome, ns.get('SUBS', []), ns.get('SUBS_PHYS', [])))
fisica_esperada = bloco_fisica(src)                    # o bloco original com as trocas de regra (e nada mais)
for nome, _, sp in V70:
    for a, b in sp:
        assert fisica_esperada.count(a) == 1, ('v70 PHYS', nome, a[:70], fisica_esperada.count(a))
        fisica_esperada = fisica_esperada.replace(a, b, 1)

# ---------------------------------------------------------------- recolor
def hsl_para_rgb(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360.0, max(0, min(1, l)), max(0, min(1, s)))
    return round(r * 255), round(g * 255), round(b * 255)

MODO_JS = False
def mapeia(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    h *= 360
    if MODO_JS and (h >= 346 or h < 8 or 100 <= h < 165 or 205 <= h < 232):   # JS: cores de time e verdes ficam
        return r, g, b
    if s < 0.10 and not (230 <= h <= 310 and s > .04):
        return r, g, b                                           # cinzas e brancos puros ficam
    # roxo/indigo -> asfalto, concreto, poeira
    if 232 <= h < 308:
        if l >= .66:               return hsl_para_rgb(46, .10, min(.94, l))        # claros -> cal / poeira
        if s > .55 and l >= .42:   return hsl_para_rgb(200, .06, .30)    # roxo vivo (botão secundário) -> concreto
        if l < .30:                return hsl_para_rgb(205, .08, l * .9)   # fundos escuros -> asfalto
        if l < .62:                return hsl_para_rgb(200, .07, l * .78)  # medios -> concreto
        return hsl_para_rgb(46, .10, min(.93, l))                          # claros -> cal / poeira
    # magenta/rosa -> laranja tijolo
    if 308 <= h < 346:             return hsl_para_rgb(17, .66, max(.40, min(.56, l)))
    # vermelho-rosado vivo -> vermelho discreto
    if h >= 346 or h < 8:
        if s > .6:                 return hsl_para_rgb(6, .52, max(.38, min(.52, l)))
        return r, g, b
    # lima/verde-limao -> amarelo quadra
    if 58 <= h < 100 and s > .45:  return hsl_para_rgb(43, .90 if l > .5 else .80, l * (.96 if l > .5 else 1.0))
    # verde vivo -> verde campo
    if 100 <= h < 165 and s > .5:  return hsl_para_rgb(148, .40, max(.30, min(.50, l)))
    # ciano/turquesa -> cal
    if 165 <= h < 205 and s > .35: return hsl_para_rgb(46, .30, max(.72, l)) if l > .45 else hsl_para_rgb(200, .12, l)
    # azul claro/eletrico -> azul de quadra desgastado
    if 205 <= h < 232 and s > .40: return hsl_para_rgb(h, s * .55, l * .92)
    return r, g, b

def hex_para_str(r, g, b): return '#%02x%02x%02x' % (r, g, b)

def recolor_css(css):
    def sub_hex(m):
        t = m.group(1)
        if len(t) == 3: t = ''.join(c * 2 for c in t); curto = True
        elif len(t) == 6: curto = False
        else: return m.group(0)
        r, g, b = int(t[0:2], 16), int(t[2:4], 16), int(t[4:6], 16)
        return hex_para_str(*mapeia(r, g, b))
    css = re.sub(r'(?<![&\w%])#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b', sub_hex, css)
    def sub_rgba(m):
        r, g, b = int(m.group(2)), int(m.group(3)), int(m.group(4))
        nr, ng, nb = mapeia(r, g, b)
        return '%s(%d,%d,%d%s' % (m.group(1), nr, ng, nb, m.group(5))
    css = re.sub(r'(rgba?)\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(\s*[,)])', sub_rgba, css)
    return css

i0 = src.index('<style>') + len('<style>')
i1 = src.index('</style>', i0)
css_orig = src[i0:i1]
css_novo = recolor_css(css_orig)

# ---------------------------------------------------------------- injeções
fontes = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
          '<link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@500;600;700&display=swap" rel="stylesheet">')
out = src[:i0] + css_novo + src[i1:]
out = out.replace('</style>', '</style>\n<link rel="stylesheet" href="./rua.css">\n<link rel="stylesheet" href="./lobby.css">\n<link rel="stylesheet" href="./sala.css">\n<link rel="stylesheet" href="./tampa.css">\n<link rel="stylesheet" href="./v70.css">\n<link rel="stylesheet" href="./v71-tema.css">\n<link rel="stylesheet" href="./v71.css">\n<link rel="stylesheet" href="./v77.css">\n<link rel="stylesheet" href="./v78.css">\n<link rel="stylesheet" href="./v79.css">\n<link rel="stylesheet" href="./v80.css">\n<link rel="stylesheet" href="./v81.css">\n<link rel="stylesheet" href="./v82.css">\n<script src="./rua.js"></script>\n<script src="./arena.js"></script>\n<script src="./lobby.js"></script>', 1)
out = out.replace('<link href="https://fonts.googleapis.com/css2?family=Lilita+One&display=swap" rel="stylesheet">',
                  '<link href="https://fonts.googleapis.com/css2?family=Lilita+One&display=swap" rel="stylesheet">' + fontes, 1)
# v70 · Etapa 6: as fontes sem internet. Se a pasta app/public/game/fontes/ tiver os arquivos .woff2 (licença OFL; ver
# fontes/LEIA-ME.txt), o jogo usa os arquivos locais; com os oito, os links do Google Fonts saem (nada vem de fora).
# Sem os arquivos, nada muda: o jogo usa o Google Fonts quando tem internet e as fontes do sistema quando não tem.
# v85: aceita também o .ttf original de cada nome (os oito vêm no pacote desde a v85; ver fontes/LEIA-ME.txt).
FONTES_LOCAIS = [('LilitaOne-Regular.woff2', 'Lilita One', 400), ('Anton-Regular.woff2', 'Anton', 400),
                 ('BarlowCondensed-SemiBold.woff2', 'Barlow Condensed', 600), ('BarlowCondensed-Bold.woff2', 'Barlow Condensed', 700),
                 ('BarlowCondensed-ExtraBold.woff2', 'Barlow Condensed', 800), ('Barlow-Medium.woff2', 'Barlow', 500),
                 ('Barlow-SemiBold.woff2', 'Barlow', 600), ('Barlow-Bold.woff2', 'Barlow', 700)]
_pasta_fontes = SAIDA.parent / 'fontes'
_tem = []
for _arq, _fam, _peso in FONTES_LOCAIS:                 # v85: o .woff2 se existir; se não, o .ttf original
    for _ext, _fmt in (('.woff2', 'woff2'), ('.ttf', 'truetype')):
        _nome = _arq[:-6] + _ext
        if (_pasta_fontes / _nome).is_file():
            _tem.append((_nome, _fam, _peso, _fmt)); break
if _tem:
    _css = ''.join("@font-face{font-family:'%s';src:url('./fontes/%s') format('%s');font-weight:%d;font-display:swap;}" % (fam, arq, fmt, peso) for arq, fam, peso, fmt in _tem)
    _links = '<link href="https://fonts.googleapis.com/css2?family=Lilita+One&display=swap" rel="stylesheet">' + fontes
    assert out.count(_links) == 1
    out = out.replace(_links, ('' if len(_tem) == len(FONTES_LOCAIS) else _links) + '<style>' + _css + '</style>', 1)
    print('fontes locais:', len(_tem), 'de', len(FONTES_LOCAIS))

# gancho: o cenário novo do lobby (se rua.js não carregar, o antigo continua)
gancho_alvo = 'function cenaQuadra(g, w, h, chao, cx, esq, dir, zonas){\n'
assert gancho_alvo in out
out = out.replace(gancho_alvo, gancho_alvo + '  if (window.RUA_CENA && RUA_CENA(g, w, h, chao, cx, esq, dir, zonas, {rndFixo:rndFixo, RB:EMB.R, ret:!!PALCO.ret, oy:(PALCO.sa ? PALCO.sa.t : 0)/(PALCO.s || 1), repinta:function(){ LB.fundo.dataset.k = ""; pintaFundoLobby(); }})) return;   // RACHA rua: cenário de fim de tarde (visual)\n', 1)


# ---------------------------------------------------------------- paletas dos mapas (so cores)
subs = [
  # Escadão: quadra roxa -> cimento pintado verde campo, faixa tijolo/amarelo/cal
  ("quadra:'#4a2390', quadraEsc:'#3a1c72', area:'#b3e83a', circulo:'#b3e83a', cimento:'#9c9a94', calcada:'#a9a49a', linha:'#f6f6f0', faixa:['#bfff33', '#ff3d9a', '#39e6ff']",
   "quadra:'#3d6b4f', quadraEsc:'#30573f', area:'#e9c349', circulo:'#e9c349', cimento:'#9c9a94', calcada:'#a9a49a', linha:'#f3efe4', faixa:['#f5c542', '#d86a38', '#f3efe4']"),
  ("noite: ['#3f3080', '#e8e0ff']", "noite: ['#4a3626', '#ffe2b0']"),
  ("quadra:'#1f5466', quadraEsc:'#183f4d', area:'#14d4f0', circulo:'#14d4f0'", "quadra:'#2c4a52', quadraEsc:'#223b42', area:'#e9c349', circulo:'#e9c349'"),
  ("noite: ['#2c3468', '#ff9a3a']", "noite: ['#3a3a42', '#ff9a3a']"),
]
for a, b in subs:
    assert a in out, a[:40]
    out = out.replace(a, b, 1)

# ---- botões do HUD: cada ação com cor própria e legível (só cor; tamanho, posição e toque não mudam)
hud = [
 ("['rgba(191,255,51,.55)','rgba(147,224,0,.5)','rgba(74,122,0,.6)'], '#F0FFCF', 'rgba(30,50,4,.92)', '#14d4f0'",
  "['rgba(245,197,66,.66)','rgba(201,154,30,.58)','rgba(96,70,8,.70)'], '#FFF8DC', 'rgba(40,30,4,.92)', '#F3EFE4'"),
 ("['rgba(255,61,154,.55)','rgba(209,17,107,.5)','rgba(110,2,64,.6)'], '#FFD7EA', 'rgba(70,2,36,.92)', '#aef52a'",
  "['rgba(216,106,56,.68)','rgba(172,72,30,.58)','rgba(86,34,10,.70)'], '#FFE9DC', 'rgba(56,22,6,.92)', '#F5C542'"),
 ("cols:['rgba(20,212,240,.55)', 'rgba(6,150,196,.5)', 'rgba(0,66,92,.66)'], fill:'#E2FCFF', stroke:'rgba(0,36,56,.92)', pixo:'#aef52a'",
  "cols:['rgba(120,162,186,.62)', 'rgba(78,118,142,.55)', 'rgba(26,48,62,.70)'], fill:'#EAF5FB', stroke:'rgba(12,28,38,.92)', pixo:'#F5C542'"),
 ("cols:['rgba(138,77,255,.58)', 'rgba(98,40,214,.52)', 'rgba(42,12,108,.66)'], fill:'#EFE4FF', stroke:'rgba(28,8,72,.92)', pixo:'#14d4f0'",
  "cols:['rgba(82,160,114,.64)', 'rgba(52,124,82,.56)', 'rgba(16,54,34,.70)'], fill:'#E8F7EE', stroke:'rgba(6,34,20,.92)', pixo:'#F3EFE4'"),
 ("cols:['rgba(255,170,30,.56)', 'rgba(232,112,0,.5)', 'rgba(108,48,0,.66)'], fill:'#FFF1D6', stroke:'rgba(66,28,0,.92)', pixo:'#ff2bd6'",
  "cols:['rgba(190,186,172,.64)', 'rgba(128,126,114,.56)', 'rgba(38,38,34,.70)'], fill:'#FFFFFF', stroke:'rgba(18,18,16,.92)', pixo:'#D86A38'"),
]
for a, b in hud:
    assert a in out, a[:50]
    out = out.replace(a, b, 1)

# ---- desenho dos mapas (camada estática até as skins) e botões/analógico do HUD: só literais de cor
def recolor_trecho(txt, ini, fim):
    a = txt.index(ini); b = txt.index(fim, a)
    return txt[:a] + recolor_css(txt[a:b]) + txt[b:]
MODO_JS = True
out = recolor_trecho(out, '/* ---------- camada estática ---------- */', 'const COR_RE = ')
out = recolor_trecho(out, 'function joyAroCorpo(', 'function v61Seta(')
MODO_JS = False

# ---- a Arena da comunidade (arena.js): ganchos de 1 linha em desenhaEstadio e campoPlano + o contexto (só leitura)
m = re.search(r'function desenhaEstadio\(g, leve\)\{[^\n]*\n', out)
assert m
CTX = ("function ruaArenaCtx(g, leve){                         // RACHA rua: o que a Arena nova precisa saber (só lê a geometria; nada aqui muda o jogo)\n"
       "  return {MW, MH, GL, GT, GR, GB, LX0, LX1, LY0, LY1, CX, CY, M: MARCAS, U, mu: U(AR_MURETA), calcada: U(AR_CALCADA), LINHA_E, FONT,\n"
       "    semGol: mdSemGol(), torc: !!opc.torc, t0: skinDoTime(0).cor, t1: skinDoTime(1).cor,\n"
       "    galera: (r, lado, cor) => arGalera(g, r, lado, cor, leve), golChao: s => estGolChao(g, s), tinta: (cor, seed) => arTinta(g, cor, seed),\n"
       "    rachadura: (r, x, y, len, ang, galho) => arRachadura(g, r, x, y, len, ang, galho), golRua: CAMPO.golRua ? (s => golRuaChao(g, s)) : null,\n"
       "    rnd: estRnd, sem, pontos, rr, casa: mrCasa, novaCasa: mrNovaCasa, sombraRet: mrSombraRet, caixa: mrCaixa, laje: mrLajeTopo,\n"
       "    ondulado: mrOndulado, barro: mrTelhaBarro, varal: mrVaralTopo, beco: mrBeco, chao: mrChao, traco: mrTraco,\n"
       "    getLeve: () => mrLeve, setLeve: v => { mrLeve = !!v; }};\n"
       "}\n")
GANCHO = "  try { if (window.RUA_ARENA && RUA_ARENA(g, leve, ruaArenaCtx(g, leve))) return; } catch (_) {}   // RACHA rua: a Arena da comunidade (visual)\n"
out = out[:m.start()] + CTX + m.group(0) + GANCHO + out[m.end():]
m = re.search(r'function campoPlano\(g\)\{[^\n]*\n', out)
assert m
out = out[:m.end()] + "  try { if (window.RUA_ARENA_PLANO && RUA_ARENA_PLANO(g, ruaArenaCtx(g, true))) return; } catch (_) {}   // RACHA rua: Ultra leve com as cores da Arena nova\n" + out[m.end():]

# o gol da Arena: a armação de ferro pintada de branco (a fita e a rede seguem na cor do time)
a = "for (const [p, e] of grupo){ caminho(p); g.lineWidth = U(e); g.strokeStyle = '#2f3437'; g.stroke(); }"
assert out.count(a) == 1
out = out.replace(a, a.replace("'#2f3437'", "'#ece8dc'"), 1)
# a cor de fundo da Arena (onde o mundo não cobre a tela) e a descrição no painel
a = "fundo:'#120a1f'"
assert out.count(a) == 1
out = out.replace(a, "fundo:'#3e3029'", 1)
a = "estadio:'Quadra de cimento debaixo dos refletores, alambrado com as faixas e a galera em pé atrás dos gols'"
assert out.count(a) == 1
out = out.replace(a, "estadio:'Quadra verde no meio da comunidade: áreas amarelas, o chão pintado de ondas, os muros grafitados e a galera atrás dos gols'", 1)

# ---- o lobby novo (lobby.css / lobby.js): ganchos, ponte para as telas e a marcação dos botões
a = "    p.style.setProperty('--placa-y', (PALCO.cy + 190) + 'px'); p.style.setProperty('--skin-y', (PALCO.cy + 258) + 'px');\n  } else {"
assert out.count(a) == 1
out = out.replace(a, "    p.style.setProperty('--placa-y', (PALCO.cy + 190) + 'px'); p.style.setProperty('--skin-y', (PALCO.cy + 258) + 'px');\n    try { if (window.RUA_LOBBY) RUA_LOBBY.layout(PALCO, p); } catch (_) {}   // RACHA rua: a tampinha no meio do lobby novo\n  } else {", 1)
a = "  if (LB.brilho.width !== bw || LB.brilho.height !== bh){ LB.brilho.width = bw; LB.brilho.height = bh; }\n  pintaFundoLobby();\n}"
assert out.count(a) == 1
out = out.replace(a, a[:-1] + "  try { if (window.RUA_LOBBY && RUA_LOBBY.depois) RUA_LOBBY.depois(PALCO); } catch (_) {}   // RACHA rua: as legendas dos botões cabem numa linha\n}", 1)
a = "/* ---- os botões do lobby novo ---- */"
assert out.count(a) == 1
out = out.replace(a, "window.RUA_LOBBY_API = {abre: id => abreTela(id), jogar: aba => abreJogar(aba), emBreve: (t, x) => { som.clique(); popEmBreve(t, x); }, info: (tag, t, x) => { som.clique(); abrePop(c => { c.append(nodo('span', 'pop-tag', tag), nodo('h2', null, t), nodo('p', 'pop-txt', x)); const a = nodo('div', 'pop-acoes'); a.appendChild(botaoPop('OK', 'verde', () => { som.clique(); fechaPop(); })); c.appendChild(a); }); }, nome: () => perfil.nome};   // RACHA rua: os botões do lobby novo abrem as telas que já existem\n" + a, 1)

SV = {
 'clube': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l8 3v6.2c0 4.8-3.4 8.4-8 9.8-4.6-1.4-8-5-8-9.8V5.5z" fill="currentColor"/><path d="M8.3 10.2l3.7 3.6 3.7-3.6" fill="none" stroke="#1b2236" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 'tampa': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6l1.6 1.5 2.1-.6.9 2 2.2.3.1 2.2 1.9 1.1-.7 2.1 1.3 1.8-1.6 1.5.4 2.2-2 .9-.3 2.2-2.2.1-1.1 1.9-2.1-.7L12 22.4l-1.5-1.6-2.1.7-1.1-1.9-2.2-.1-.3-2.2-2-.9.4-2.2L1.6 12.2l1.3-1.8-.7-2.1 1.9-1.1.1-2.2 2.2-.3.9-2 2.1.6z" fill="currentColor"/><circle cx="12" cy="12" r="6.2" fill="#1b2236"/><path d="M12 7.6l1.3 2.7 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4z" fill="currentColor"/></svg>',
 'replays': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 13.4A7 7 0 1 0 7.4 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M3.6 4.2l.6 4.6 4.6-.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.4 9v6.4l5.2-3.2z" fill="currentColor"/></svg>',
 'treino': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.2 2.8h3.6l4.8 15H5.4z" fill="currentColor"/><path d="M7.9 10.3h8.2M6.6 14.4h10.8" stroke="#1b2236" stroke-width="2.2"/><rect x="3" y="17.8" width="18" height="3.4" rx="1.2" fill="currentColor"/></svg>',
 'loja': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 4h3l2.3 10.2h10.4L20.5 7H7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="9.5" cy="19" r="2" fill="currentColor"/><circle cx="17" cy="19" r="2" fill="currentColor"/></svg>',
 'balao': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4.4h18v11.6H9.4L5 19.8v-3.8H3z" fill="currentColor"/><path d="M7 9.2h10M7 12.4h6" stroke="#1b2236" stroke-width="2.2" stroke-linecap="round"/></svg>',
 'coroa': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" fill="currentColor"/><path d="M6.5 16h11v-6.2l-3.2 2.4L12 8l-2.3 4.2-3.2-2.4z" fill="#1b2236"/></svg>',
 'trofeu': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10v5a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H3.5v1.5A3.5 3.5 0 0 0 7 10M17 5h3.5v1.5A3.5 3.5 0 0 1 17 10" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10.8" y="13" width="2.4" height="4" fill="currentColor"/><rect x="7.5" y="17" width="9" height="3.2" rx="1" fill="currentColor"/></svg>',
 'podio': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="12.5" width="6" height="8.5" rx="1" fill="currentColor"/><rect x="9" y="8.5" width="6" height="12.5" rx="1" fill="currentColor"/><rect x="15.5" y="15" width="6" height="6" rx="1" fill="currentColor"/><path d="M12 1.6l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" fill="currentColor"/></svg>',
 'galera': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.5" cy="8" r="3.6" fill="currentColor"/><path d="M1.8 20c0-4.4 3-6.9 6.7-6.9s6.7 2.5 6.7 6.9z" fill="currentColor"/><circle cx="16.6" cy="9" r="3" fill="currentColor"/><path d="M15.8 13.4c3.6-.3 6.4 1.9 6.4 6.6h-5.3" fill="currentColor"/></svg>',
}
def bt(acao, cor, icone, titulo, sub=None, extra=''):
    sub_html = '<small>%s</small>' % sub if sub else ''
    duas = ' rx-duas' if sub else ''
    attr = 'data-loja="1"' if acao == 'loja' else 'data-rx="%s"' % acao
    return '<button type="button" class="rx-bt%s" %s style="--c:%s" aria-label="%s"><i>%s</i><b>%s</b>%s<u></u></button>' % (duas, attr, cor, titulo.title(), icone, titulo, sub_html)
RX = ('\n    <!-- RACHA rua: o lobby em colunas (cada botão abre uma tela que já existe; ver lobby.js) -->\n'
      '    <div class="rx" id="rx">\n'
      '      <div class="rx-marca" aria-hidden="true"><b class="rx-logo">RACHA</b><span class="rx-pronto">Pronto, <span id="rx-nome">Jogador</span>!</span></div>\n'
      '      <nav class="rx-col rx-esq" aria-label="Menu">'
      + bt('clube', '#3f7fe0', SV['clube'], 'CLUBE') + bt('skins', '#8b5cf6', SV['tampa'], 'TAMPINHA') + bt('treino', '#f08a24', SV['treino'], 'TREINAMENTO')
      + bt('loja', '#f5c542', SV['loja'], 'LOJA') + bt('comunidade', '#26a69a', SV['balao'], 'COMUNIDADE') + '</nav>\n'
      '      <nav class="rx-col rx-dir" aria-label="Partidas">'
      + bt('passe', '#e8b931', SV['coroa'], 'PASSE', 'SEM TEMPORADA ATIVA')
      + bt('ranqueada', '#d9a43a', '<span class="rx-ins" id="lb-rq-ins">' + SV['trofeu'] + '</span>', 'RANQUEADA', 'COMPETITIVO · <span id="lb-rq-elo">BRONZE I</span>')
      + bt('ranking', '#e0663a', SV['podio'], 'RANKING', 'TOP DA SEMANA')
      + bt('salas', '#3f7fe0', SV['galera'], 'SALAS', 'PÚBLICAS E PERSONALIZADAS') + '</nav>\n'
      '      <div class="rx-baixo">'
      + bt('chat', '#3f7fe0', SV['balao'], 'CHAT', 'CHAT DO BRASIL') + bt('amigos', '#3fb39b', SV['galera'], 'AMIGOS', 'LISTA NÃO CONECTADA') + '</div>\n'
      '    </div>\n')
a = '    <p class="lb-rot">Gire o celular para jogar na horizontal</p>'
assert out.count(a) == 1
out = out.replace(a, RX + a, 1)
a = '<button type="button" class="tp-ic" id="lb-chat" aria-label="Chat do Brasil">'
assert out.count(a) == 1
out = out.replace(a, '<button type="button" class="tp-ic rx-amg" data-rx="salas" aria-label="Salas: jogar com os amigos">' + SV['galera'] + '</button>' + a, 1)

# rótulos reais da lista de salas (a etiqueta reflete o estado verdadeiro da sala)
a = "s.cup ? 'COPA' : s.state === 'playing' ? 'JOGANDO' : 'ESPERANDO'"
assert a in out
out = out.replace(a, "s.cup ? 'COPA' : s.state === 'playing' ? 'ROLANDO' : 'PELADA ABERTA'", 1)

# ---------------------------------------------------------------- v67: a partida (ver tools/partida_rua.js)
a = '<title>PREVIEW Fejuca · Racha</title>'
assert out.count(a) == 1
out = out.replace(a, '<title>RACHA · Futebol de Rua</title>', 1)
# o botão de teste do MC Fejuca (era só do preview) sai; no lugar dele entra o código da v67
i = out.index('TESTE (só no preview'); a0 = out.rfind('/* ====', 0, i)
fim = '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'
assert out.count(fim) == 1 and a0 > 0 and out.index(fim) > i
b0 = out.index(fim)
V69 = '\n'.join((RAIZ / 'tools' / n).read_text(encoding='utf-8') for n in ('tampa_rua.js', 'editor_rua.js', 'clubes_rua.js') if (RAIZ / 'tools' / n).exists())
V70JS = '\n'.join((RAIZ / 'tools' / 'v70' / n).read_text(encoding='utf-8') for n in ('ajustes.js', 'interface.js', 'economia.js', 'perfil.js', 'tutorial.js', 'online.js', 'comunidade.js', 'polimento.js', 'celular.js', 'enxuto.js') if (RAIZ / 'tools' / 'v70' / n).exists())
V70JS += '\n' + '\n'.join((RAIZ / 'tools' / 'v71' / n).read_text(encoding='utf-8') for n in ('times.js', 'lobby.js', 'telas.js') if (RAIZ / 'tools' / 'v71' / n).exists())   # v71: preto × branco, o lobby novo · v71.1: as telas de dentro
V70JS += '\n' + '\n'.join((RAIZ / 'tools' / 'v73' / n).read_text(encoding='utf-8') for n in ('sensor.js',) if (RAIZ / 'tools' / 'v73' / n).exists())   # v73: o sensor (o halo dos jogadores) mais transparente · o TESTE da v72 saiu
def _campo74():                                           # v74: o ESTÁDIO virou o society da imagem enviada (tools/v74/campo.js), com o kit embutido
    import base64, json
    pasta = RAIZ / 'tools' / 'v74'
    if not (pasta / 'campo.js').exists(): return ''
    js = (pasta / 'campo.js').read_text(encoding='utf-8')
    kit, mapa = pasta / 'campo_noite_kit.webp', pasta / 'campo_noite_kit.json'
    if kit.exists() and mapa.exists():                   # (os carros, as árvores e as casas, recortados da imagem por tools/v74/campo_kit.py)
        assert js.count('/*KIT74*/null') == 1
        dado = '{src:"data:image/webp;base64,' + base64.b64encode(kit.read_bytes()).decode('ascii') + '",p:' + json.dumps(json.loads(mapa.read_text(encoding='utf-8')), separators=(',', ':')) + '}'
        js = js.replace('/*KIT74*/null', dado, 1)
    return js
V70JS += '\n' + _campo74()
def _lobby75():                                           # v75: o fundo do lobby é a imagem enviada (tools/v75/lobby.js), embutida
    import base64, struct
    pasta = RAIZ / 'tools' / 'v75'
    if not (pasta / 'lobby.js').exists(): return ''
    js = (pasta / 'lobby.js').read_text(encoding='utf-8')
    img, orig = pasta / 'lobby_fundo.webp', pasta / 'lobby_fundo_original.png'
    if img.exists() and orig.exists():                   # (a medida vem do cabeçalho do PNG original: a mesma imagem, em WebP)
        w, h = struct.unpack('>II', orig.read_bytes()[16:24])
        assert js.count('/*FUNDO75*/null') == 1
        js = js.replace('/*FUNDO75*/null', '{src:"data:image/webp;base64,' + base64.b64encode(img.read_bytes()).decode('ascii') + '",w:%d,h:%d}' % (w, h), 1)
    return js
V70JS += '\n' + _lobby75()
def _skins76():                                          # v76: as tampinhas animadas (tools/v76/skins.js), com o kit das ilustrações embutido
    import base64, json
    pasta = RAIZ / 'tools' / 'v76'
    if not (pasta / 'skins.js').exists(): return ''
    js = (pasta / 'skins.js').read_text(encoding='utf-8')
    kit, mapa = pasta / 'skins_kit.webp', pasta / 'skins_kit.json'
    if kit.exists() and mapa.exists():
        assert js.count('/*KIT76*/null') == 1
        js = js.replace('/*KIT76*/null', '{src:"data:image/webp;base64,' + base64.b64encode(kit.read_bytes()).decode('ascii') + '",p:' + json.dumps(json.loads(mapa.read_text(encoding='utf-8')), separators=(',', ':')) + '}', 1)
    return js
V70JS += '\n' + _skins76()
def _v77():                                              # v77: o lobby, o perfil e as telas com a cara das imagens enviadas (tools/v77/), com as peças embutidas
    import base64, json
    pasta = RAIZ / 'tools' / 'v77'
    nomes = [n for n in ('pecas.js', 'lobby.js', 'telas.js', 'quadra.js') if (pasta / n).exists()]
    if not nomes: return ''
    js = '\n'.join((pasta / n).read_text(encoding='utf-8') for n in nomes)
    info = json.loads((pasta / 'pecas.json').read_text(encoding='utf-8'))
    uri = lambda arq: 'data:image/webp;base64,' + base64.b64encode((pasta / arq).read_bytes()).decode('ascii')
    for marca, arq, chave in (('/*FUNDO77*/null', 'fundo_lobby.webp', 'fundo'), ('/*LETREIRO77*/null', 'letreiro.webp', 'letreiro'), ('/*BANNER77*/null', 'banner_perfil.webp', 'banner')):
        if marca in js and (pasta / arq).exists():
            assert js.count(marca) == 1
            w, h = info['tam'][chave]
            js = js.replace(marca, '{src:"%s",w:%d,h:%d}' % (uri(arq), w, h), 1)
    if '/*ICONES77*/null' in js and (pasta / 'icones.webp').exists():
        assert js.count('/*ICONES77*/null') == 1
        w, h = info['tam']['icones']; mapa = json.loads((pasta / 'icones.json').read_text(encoding='utf-8'))
        js = js.replace('/*ICONES77*/null', '{src:"%s",w:%d,h:%d,p:%s}' % (uri('icones.webp'), w, h, json.dumps(mapa, separators=(',', ':'))), 1)
    if '/*KIT77*/null' in js and (pasta / 'quadra_kit.webp').exists():
        assert js.count('/*KIT77*/null') == 1
        mapa = json.loads((pasta / 'quadra_kit.json').read_text(encoding='utf-8'))
        js = js.replace('/*KIT77*/null', '{src:"%s",p:%s}' % (uri('quadra_kit.webp'), json.dumps(mapa, separators=(',', ':'))), 1)
    return js
V70JS += '\n' + _v77()
def _v78():                                              # v78: os bots novos (tools/v78/bots.js), nada em cima da cabeça e o perfil mais fácil de entender
    pasta = RAIZ / 'tools' / 'v78'
    nomes = [n for n in ('bots.js', 'perfil.js') if (pasta / n).exists()]
    return '\n'.join((pasta / n).read_text(encoding='utf-8') for n in nomes)
V70JS += '\n' + _v78()
def _v79():                                              # v79: as patentes da ranqueada, só ranqueada (online, com os bots de reserva) e o selo V
    pasta = RAIZ / 'tools' / 'v79'
    nomes = [n for n in ('patentes.js', 'ranqueada.js', 'selo.js') if (pasta / n).exists()]
    return '\n'.join((pasta / n).read_text(encoding='utf-8') for n in nomes)
V70JS += '\n' + _v79()
def _v80():                                              # v80: os times laranja × roxo, a partida de 3:00, o placar, o GOOOL! e o treino
    pasta = RAIZ / 'tools' / 'v80'
    nomes = [n for n in ('times.js', 'partida.js', 'gol.js', 'treino.js') if (pasta / n).exists()]
    return '\n'.join((pasta / n).read_text(encoding='utf-8') for n in nomes)
V70JS += '\n' + _v80()
def _v81():                                              # v81: o chat (a barra, o painel, os três pontinhos e a moderação)
    pasta = RAIZ / 'tools' / 'v81'
    nomes = [n for n in ('chat.js',) if (pasta / n).exists()]
    return '\n'.join((pasta / n).read_text(encoding='utf-8') for n in nomes)
V70JS += '\n' + _v81()
def _v82():                                              # v82: as contas (a patente na conta, a curva da conta, a cópia, o RANKING › PATENTES)
    pasta = RAIZ / 'tools' / 'v82'
    nomes = [n for n in ('conta.js',) if (pasta / n).exists()]
    return '\n'.join((pasta / n).read_text(encoding='utf-8') for n in nomes)
V70JS += '\n' + _v82()
sys.dont_write_bytecode = True; sys.path.insert(0, str(RAIZ / 'tools' / 'v71')); import tema as _tema71; _tema71.gera()   # (sem __pycache__ na pasta das fontes)   # v71.1: o v71-tema.css (o marinho das telas vira carvão), gerado a cada build
out = out[:a0] + (RAIZ / 'tools' / 'partida_rua.js').read_text(encoding='utf-8') + '\n' + (RAIZ / 'tools' / 'salas_rua.js').read_text(encoding='utf-8') + '\n' + V69 + '\n' + V70JS + out[b0:]   # v68: as salas e o árbitro · v69: as tampinhas e os clubes · v70: ajustes, interface, perfil, online
assert 'fejuca' not in out.lower(), 'sobrou Fejuca'
subs67 = [
  # o analógico: a base passa a vir de JOY.aro (o raio e o toque do editor acompanham)
  ("const JOY = {ring:129, knob:32, max:100, zone:240};", "const JOY = {ring:129, knob:32, max:100, zone:240, aro:97};"),
  ("const rCtl = k => k === 'joy' ? 97*hud.joy.al + JOY.knob*hud.joy.km + 4 : BASE[k].r;", "const rCtl = k => k === 'joy' ? JOY.aro*hud.joy.al + JOY.knob*hud.joy.km + 4 : BASE[k].r;"),
  ("kr = JOY.knob*j.km, anel = 97*j.al + kr;", "kr = JOY.knob*j.km, anel = JOY.aro*j.al + kr;"),
  # a câmera: o estilo (jogador, frente, bola, tv) fica salvo junto com o resto do HUD
  ("const cam = {mode:CAM_MODO_PADRAO, zoom:ZOOM_PADRAO, desl:DESL_MAX, x:CX, y:CY, z:1};", "const cam = {mode:CAM_MODO_PADRAO, estilo:'jogador', zoom:ZOOM_PADRAO, desl:DESL_MAX, x:CX, y:CY, z:1};"),
  ("cam:{mode:cam.mode, zoom:cam.zoom, desl:cam.desl}, graf:graf", "cam:{mode:cam.mode, estilo:cam.estilo, zoom:cam.zoom, desl:cam.desl}, graf:graf"),
  ("      cam.desl = num(o.cam.desl, 0, DESL_MAX, cam.desl);\n", "      cam.desl = num(o.cam.desl, 0, DESL_MAX, cam.desl);\n      if (['jogador', 'frente', 'bola', 'tv'].indexOf(o.cam.estilo) >= 0) cam.estilo = o.cam.estilo;   // RACHA rua v67: como a câmera segue\n"),
  ("  cam.mode = o.cam.mode; cam.zoom = o.cam.zoom; cam.desl = o.cam.desl;", "  cam.mode = o.cam.mode; cam.zoom = o.cam.zoom; cam.desl = o.cam.desl; cam.estilo = o.cam.estilo || 'jogador';"),
  ("  hudPadrao(); cam.mode = CAM_MODO_PADRAO; cam.zoom = ZOOM_PADRAO; cam.desl = DESL_MAX;", "  hudPadrao(); cam.mode = CAM_MODO_PADRAO; cam.estilo = 'jogador'; cam.zoom = ZOOM_PADRAO; cam.desl = DESL_MAX;"),
  # o EDITAR HUD: as 5 câmeras e o chip Fixo na tela
  ('<div class="seg" role="group" aria-label="Modo da câmera">\n          <button type="button" id="hp-seguir">Seguir jogador</button>\n          <button type="button" id="hp-fixa">Tela parada</button>',
   '<div class="seg seg-cam" role="group" aria-label="Modo da câmera">\n          <button type="button" id="hp-seguir">Seguir jogador</button>\n          <button type="button" id="hp-frente">À frente</button>\n          <button type="button" id="hp-bola">Seguir a bola</button>\n          <button type="button" id="hp-tv">Transmissão</button>\n          <button type="button" id="hp-fixa">Tela parada</button>'),
  ('<button type="button" class="chip" id="hp-oc" data-so="oc" aria-pressed="false"><i></i><span>Esconde quando solta</span></button>',
   '<button type="button" class="chip" id="hp-fixo" data-so="joy" aria-pressed="true"><i></i><span>Fixo na tela</span></button>\n          <button type="button" class="chip" id="hp-oc" data-so="oc" aria-pressed="false"><i></i><span>Esconde quando solta</span></button>'),
  # AJUSTES: a trilha do lobby (saiu de SKINS) e os textos sem skins
  ('<div class="aj-lin"><span>Música no lobby</span><button type="button" class="aj-chave" id="aj-mus" aria-pressed="true"><i></i></button></div>',
   '<div class="aj-lin"><span>Música no lobby</span><button type="button" class="aj-chave" id="aj-mus" aria-pressed="true"><i></i></button></div>\n        <div class="aj-lin aj-col"><span>Trilha do lobby</span><div class="tl-seg aj-graf" id="aj-faixa"></div></div>'),
  ("A trilha do lobby fica em SKINS.", "A trilha do lobby fica aqui em cima."),
  ("<span>Zerar perfil: apaga moedas, gemas, skins, recordes e estatísticas deste aparelho</span>", "<span>Zerar perfil: apaga moedas, gemas, recordes e estatísticas deste aparelho</span>"),
  ("Apaga as moedas, as gemas, as skins compradas, os recordes, as estatísticas e o nível deste aparelho.", "Apaga as moedas, as gemas, os recordes, as estatísticas e o nível deste aparelho."),
  ("Pacotes com moedas, gemas e discos chegam em breve.", "Pacotes com moedas e gemas chegam em breve."),
  ("Ganhe caixas jogando e abra para ganhar moedas, gemas e discos.", "Ganhe caixas jogando e abra para ganhar moedas e gemas."),
]
for a, b in subs67:
    assert out.count(a) == 1, ('v67', a[:60], out.count(a))
    out = out.replace(a, b, 1)

# ---------------------------------------------------------------- v68: as salas e o árbitro (ver tools/salas_rua.js)
subs68 = [
  # a pausa do árbitro: o quadro de quem roda a partida deixa de chamar o passo da física (igual à pausa de sempre)
  ("  const parado = editing || PAUSA.on || trFimAberto() || fimAberto() || rqVsAberto();",
   "  const parado = editing || PAUSA.on || trFimAberto() || fimAberto() || rqVsAberto() || ARB_PARADO();   // RACHA rua v68: a pausa do árbitro"),
  # o replay de partida de sala: Time Vermelho × Equipe Azul (as cores da sala)
  ("const rpCorTime = (R, t) => R.on ? (t ? '#8a4dff' : '#b6f224') : skinDoTime(t).cor;",
   "const rpCorTime = (R, t) => R.on ? (t ? '#2f6fe0' : '#e2412f') : skinDoTime(t).cor;"),
  # a dica das teclas: na partida de sala o Esc abre o menu (não conta derrota)
  ("' · H HUD · Esc sair (conta derrota)'", "' · H HUD · Esc ' + (NET49.playing ? 'menu' : 'sair (conta derrota)')"),
]
for a, b in subs68:
    assert out.count(a) == 1, ('v68', a[:60], out.count(a))
    out = out.replace(a, b, 1)

# ---------------------------------------------------------------- v70: as etapas (regras, câmera, interface, perfil, online, polimento)
assert bloco_fisica(out) == bloco_fisica(src), 'BLOCO DE FISICA ALTERADO ANTES DA v70'
n_phys = 0
for nome, subs, sp in V70:
    a0 = out.index('/*PHYS_START*/'); b0 = out.index('/*PHYS_END*/')
    bloco = out[a0:b0]
    for a, b in sp:
        assert bloco.count(a) == 1, ('v70 PHYS', nome, a[:70], bloco.count(a))
        bloco = bloco.replace(a, b, 1); n_phys += 1
    out = out[:a0] + bloco + out[b0:]
    for s in subs:                                     # (antes, depois) = exatamente 1 vez · (antes, depois, n) = exatamente n vezes
        a, b, n = (s[0], s[1], 1) if len(s) == 2 else s
        assert out.count(a) == n, ('v70', nome, a[:70], out.count(a), n)
        out = out.replace(a, b)

# ---------------------------------------------------------------- conferência: a física não pode mudar
assert bloco_fisica(out) == fisica_esperada, 'BLOCO DE FISICA ALTERADO (fora das trocas de regra documentadas)'
SAIDA.write_text(out, encoding='utf-8')
# a cópia de teste (tests/build/racha_teste.html): o mesmo jogo + window.__RT, que avalia expressões dentro do script do jogo.
# Só para os testes automáticos (tests/*.py); não vai para a pasta pública nem para o pacote.
TESTE = RAIZ / 'tests' / 'build' / 'racha_teste.html'
TESTE.parent.mkdir(parents=True, exist_ok=True)
fim_t = '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'
assert out.count(fim_t) == 1 and out.count('<head>') == 1
teste = out.replace(fim_t, '\nwindow.__RT = function(s){ return eval(s); };   /* só na cópia de teste */' + fim_t, 1)
teste = teste.replace('<head>', '<head>\n<base href="../../app/public/game/">', 1)
TESTE.write_text(teste, encoding='utf-8')
print('ok · fisica identica · sha256', hash_antes[:16], '· trocas de regra no bloco:', n_phys, '·', ', '.join(n for n, _, _ in V70))
print('css bytes', len(css_orig), '->', len(css_novo))
