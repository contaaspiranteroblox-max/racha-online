"""RACHA v103 · OS CONTROLES: O CONTROLE E O TECLADO DO JEITO DE CADA UM, E O ANALÓGICO SEM ATRASO (depois da v102).
O pedido (03/11/2026): "crie uma função nas configurações para configurar o controle — chute no quadrado etc., várias
coisas — e pra PC também caso não tenha" e "caso tenha algum delay no analógico, retire".
- tools/v103/controles.js + app/public/game/v103-controles.css: AJUSTES › Controles › Controle — cada ação (PASSE, CHUTE,
  CURVA, PAUSA, os chutes do Rachão com o SUPER, FINTA e DRIBLE da GINGA, CONFIRMAR e VOLTAR nos menus) com o botão que o
  jogador escolher (toca na ação e aperta o botão no controle), os jeitos prontos (PADRÃO, ESTILO FIFA e INVERTIDO), os nomes
  dos botões do controle que está ligado (PlayStation ✕ ○ □ △, Xbox A B X Y, Nintendo, ou "Botão n"), a zona morta do
  analógico do controle, a vibração do controle no chute e o VOLTAR AO PADRÃO. O "Trocar A e B" da v88 vira o jeito
  INVERTIDO (quem tinha ligado continua com ele). O controle passa a ser lido no começo de cada quadro do jogo (antes era lido
  depois: um quadro de atraso) e anda nas mesmas direções do analógico da tela;
- o TECLADO ganha a PAUSA (P; o Esc continua) e as dicas da partida mostram as teclas (ou os botões do controle) que valem;
- o ANALÓGICO DA TELA começa a andar com o dedo a 6% do curso (era 15%) e para abaixo de 4% (era 9%): a zona morta fica só
  para o dedo parado não escorregar.
Trocas no gerado (o resto é código colado no fim, como nas outras etapas):
  · o padrão do analógico da tela (V92_PADRAO: zonaLiga e zonaDesliga);
  · a ação PAUSA na lista do teclado (TECLAS_ACOES), depois do DRIBLE;
  · a dica das teclas no começo da partida (o texto vem de v103Dica: as teclas escolhidas, ou os botões do controle) e ela
    aparece também para quem joga de controle;
  · as teclas do cartão dos chutes do Rachão (com o controle, o botão dele).
Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- o estilo dos controles depois do da v102 (o último)
CSS = RAIZ / 'app' / 'public' / 'game' / 'v103-controles.css'
if CSS.exists():
    SUBS.append(('<link rel="stylesheet" href="./v102.css">\n', '<link rel="stylesheet" href="./v102.css">\n<link rel="stylesheet" href="./v103-controles.css">\n'))

# ---- o analógico da tela sem a espera: a zona morta só para o dedo parado (o perfil v91 e o painel de testes seguem iguais)
SUBS.append(("  zonaLiga:.15, zonaDesliga:.09, folgaDir:.03,\n",
             "  zonaLiga:.06, zonaDesliga:.04, folgaDir:.03,     // v103: começa a andar a 6% do curso (era 15%) e para abaixo de 4% (era 9%)\n"))

# ---- o teclado: a PAUSA também numa tecla que dá para trocar (o Esc continua sendo a pausa)
SUBS.append(("['drible', 'DRIBLE (GINGA)', ['KeyG', 'ShiftLeft']], ['hud', 'Editar os controles da tela', ['KeyH']]",
             "['drible', 'DRIBLE (GINGA)', ['KeyG', 'ShiftLeft']], ['pausa', 'PAUSA / MENU (o Esc também abre)', ['KeyP']], ['hud', 'Editar os controles da tela', ['KeyH']]"))

# ---- a dica do começo da partida: as teclas que o jogador escolheu (ou os botões do controle, para quem joga com ele)
SUBS.append(("  if (hintT > 0 && !editing && window.matchMedia && window.matchMedia('(pointer:fine)').matches){\n",
             "  if (hintT > 0 && !editing && (v103PadUsando() || (window.matchMedia && window.matchMedia('(pointer:fine)').matches))){   // v103: e com o controle\n"))
SUBS.append(("    txt(g, RQ.on ? 'WASD mover · Espaço passe · K chute' + (RQ.jogo === 'curva' ? ' · U curva (segure)' : RQ.jogo === 'ginga' ? ' · F finta · G drible' : '') + ' · H HUD · Esc ' + (NET49.playing ? 'menu' : 'sair (conta derrota)')   // v61: as teclas do modo\n"
             "      : 'WASD mover · Espaço passe · K chute · R reiniciar · 1-4 tamanho · C campo · T treino · H HUD · Esc lobby', W/2, 744, 19, 'rgba(255,255,255,.92)', 'rgba(5,10,25,.9)', 4);\n",
             "    txt(g, v103Dica(), W/2, 744, 19, 'rgba(255,255,255,.92)', 'rgba(5,10,25,.9)', 4);   // v103: as teclas do modo (as que o jogador escolheu) ou os botões do controle\n"))

# ---- o cartão dos chutes do Rachão: com o controle, o botão dele no lugar da tecla
SUBS.append(("const cr99Tecla = id => { try { const c = (TECLA.acoes[id] || [])[0]; return c ? teclaNome(c) : ''; } catch (_) { return ''; } };",
             "const cr99Tecla = id => { try { const p = v103RotuloPad(id); if (p) return p; const c = (TECLA.acoes[id] || [])[0]; return c ? teclaNome(c) : ''; } catch (_) { return ''; } };   // v103: com o controle, o botão dele"))

ARQUIVOS = ['controles.js']
for n in ARQUIVOS:
    assert (AQUI / n).exists(), 'falta tools/v103/' + n
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v103/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v103 (controles) não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v103 · os controles (tools/v103/controles.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
