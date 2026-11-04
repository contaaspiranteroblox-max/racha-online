"""RACHA v103 · TELA CHEIA NO NAVEGADOR (ANDROID E IPHONE), O APP INSTALÁVEL (PWA) E O CAMPO ATÉ A BEIRADA (a etapa
'v103/tela', aplicada por último, depois da v102).
O pedido (03/11/2026): "Faça o RACHA funcionar em tela cheia no navegador, tanto no Android quanto no iPhone. Remova margens e
barras quando permitido, adicione suporte a PWA e um botão de tela cheia. Adapte automaticamente a interface à resolução do
dispositivo, sem cortar botões, alterar o HUD ou prejudicar a jogabilidade. Mantenha compatibilidade com Chrome e Safari."
- tools/v103/tela.js: o botão TELA CHEIA (a barra de cima do lobby, o cantinho da PAUSA, a linha dos AJUSTES › Visual e, em
  pé no Android, o JOGAR EM TELA CHEIA da tela GIRE O CELULAR), a tela cheia de página com a tela travada deitada (Android,
  iPad, computador), o GUIA do iPhone (Compartilhar › Adicionar à Tela de Início), a MOLDURA (o campo, mais escuro, nas
  faixas em volta da área do jogo) e o registro do service worker;
- app/public/game/v103-tela.css: o estilo disso tudo e a página parada (sem puxar para atualizar, sem o elástico do iPhone);
- no <head>: o manifesto (app/public/game/manifest.webmanifest), os ícones (app/public/game/icones/, feitos por
  tools/v103/icones.py com o grafite do jogo), a cor do tema e as etiquetas do app do iPhone e do Android. A etiqueta do
  viewport continua a mesma (com o viewport-fit=cover de sempre: nada de zoom travado a mais);
- app/public/game/sw.js: o service worker (sempre a rede primeiro; a cópia só serve sem internet).
Os dois servidores entregam o manifesto como application/manifest+json e o sw.js como JavaScript (server/servidor.js e
app/api/lib/vite.ts). Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
JOGO = RAIZ / 'app' / 'public' / 'game'
SUBS = []
SUBS_PHYS = []

for arq in ('v103-tela.css', 'manifest.webmanifest', 'sw.js', 'icones/racha-192.png', 'icones/racha-512.png', 'icones/racha-maskable-192.png',
            'icones/racha-maskable-512.png', 'icones/apple-touch-icon.png'):
    assert (JOGO / arq).is_file(), 'falta app/public/game/' + arq

# ---- o estilo da v103 depois de todos (depois do da v102, o último)
SUBS.append(('<link rel="stylesheet" href="./v102.css">\n', '<link rel="stylesheet" href="./v102.css">\n<link rel="stylesheet" href="./v103-tela.css">\n'))

# ---- o app instalável: o manifesto, os ícones, a cor do tema e as etiquetas do iPhone (o viewport fica como estava)
VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
APP = ('\n<meta name="theme-color" content="#0d0a22">'
       '\n<meta name="mobile-web-app-capable" content="yes">'
       '\n<meta name="apple-mobile-web-app-capable" content="yes">'
       '\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
       '\n<meta name="apple-mobile-web-app-title" content="RACHA">'
       '\n<meta name="application-name" content="RACHA">'
       '\n<link rel="manifest" href="./manifest.webmanifest">'
       '\n<link rel="icon" type="image/png" sizes="192x192" href="./icones/racha-192.png">'
       '\n<link rel="apple-touch-icon" sizes="180x180" href="./icones/apple-touch-icon.png">')
SUBS.append((VIEWPORT, VIEWPORT + APP))

# ---- o código (antes do montaAbas do fim, depois do da v102)
CODIGO = (AQUI / 'tela.js').read_text(encoding='utf-8')
assert '</script' not in CODIGO.lower(), 'o código da v103 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v103 · tela cheia (tools/v103/tela.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
