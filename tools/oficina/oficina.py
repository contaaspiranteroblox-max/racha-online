"""OFICINA DE CRIAÇÃO 2.0 (v92 · aplicada por último, depois da v92): o editor de mapas, a central dos mapas (os seus, a
comunidade, os modelos, importar e exportar, publicar), o TESTAR e a sala com mapa (até 4 times, no servidor das salas).
- o motor dos mapas (server/partida/mapa.js: o MESMO arquivo que o servidor usa para validar, compilar e jogar) colado
  depois do núcleo da v92 — o TESTAR e a previsão do online rodam exatamente a conta do servidor;
- o código em tools/oficina/*.js (na ordem de ARQUIVOS) dentro de UMA função (nada vira variável global do jogo, só o
  window.OFI): base (os ícones, os ajudantes de tela, a gaveta do aparelho, a conversa com o servidor e os ganchos),
  modelos (os 15 modelos e o criar do zero), desenho (o desenho dos mapas), editor (a tela, a câmera, a seleção, as
  ferramentas, desfazer/refazer, o salvamento automático), ferramentas (lançar a bola, copiar para o outro lado, repetir,
  as medidas, as guias e a vibração), paineis (as propriedades, as abas do mapa e a biblioteca),
  hub (a central; v98: os dois modos, RACHA e RACHÃO, e o CRIAR que pergunta qual), rachao (v97: a aba RACHÃO e o Rachão
  aberto por cima da Oficina), jogo (a partida no canvas do jogo), sala (a sala com mapa) e rachao_sala (v98: a sala online
  do Rachão — o servidor joga a partida e a Oficina faz a ponte com a página do Rachão);
- o estilo em app/public/game/oficina.css (depois do v92.css).
Nada no bloco PHYS muda: a física oficial (as salas de sempre e a ranqueada) continua a mesma (o build confere o sha)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- o estilo da Oficina depois do da v92
SUBS.append(('<link rel="stylesheet" href="./v92.css">\n', '<link rel="stylesheet" href="./v92.css">\n<link rel="stylesheet" href="./oficina.css">\n'))

# ---- o código: o motor dos mapas + tools/oficina/*.js numa função só
MAPA = (RAIZ / 'server' / 'partida' / 'mapa.js').read_text(encoding='utf-8')
PONTE = (RAIZ / 'app' / 'public' / 'game' / 'rachao' / 'ponte.js').read_text(encoding='utf-8')   # v97 (depois do teste): a ponte da física RACHA × Rachão
ARQUIVOS = ['base.js', 'modelos.js', 'desenho.js', 'editor.js', 'ferramentas.js', 'paineis.js', 'hub.js', 'rachao.js', 'jogo.js', 'sala.js', 'rachao_sala.js']   # v97: rachao.js (a aba RACHÃO e o Rachão por cima da Oficina) · v98: rachao_sala.js (a sala online do Rachão)
for n in ARQUIVOS:
    assert (AQUI / n).exists(), 'falta tools/oficina/' + n
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/oficina/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in MAPA.lower() and '</script' not in CODIGO.lower() and '</script' not in PONTE.lower(), 'o código da Oficina não pode ter </script'
ANCORA = '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'
SUBS.append((ANCORA,
             '\n/* ======================================================================= RACHA v92 · OFICINA: o motor dos mapas (server/partida/mapa.js) */\n;' + MAPA
             + '\n/* ======================================================================= RACHA v97 · a ponte da física RACHA × Rachão (app/public/game/rachao/ponte.js) */\n;' + PONTE
             + '\n/* ======================================================================= RACHA v92 · OFICINA (tools/oficina/*.js) */\n;(function () {\n\'use strict\';\ntry {\n' + CODIGO
             + '\n} catch (e) { console.error(\'Oficina: não carregou\', e); }\n})();\n' + ANCORA))
