"""RACHA v107 · OS GESTOS DO EMOJI E DAS FALAS (aplicada por último, depois do COFRE da v106).
O pedido (05/11/2026): "Neste vídeo mostrei como funcionam os emojis e msg rápidas no MamoBall: não precisa clicar, é só
arrastar para o lado que você quer e vai aparecer as msg e emojis." (o vídeo era de outro jogo: de lá vem só o jeito de tocar —
segurar, arrastar e soltar —; os desenhos, os nomes e as frases são os do RACHA).
- tools/v107/gestos.js: segurar e arrastar nos dois botões do lado do placar (o do emoji da v106 e o das falas da v93) — a
  cruz dos 5 no meio da tela, o aro do analógico pequeno em volta do botão e o X de cancelar do lado; para onde o dedo vai,
  acende uma opção (parado, a do meio) e soltar manda (no X, nada); o toque rápido de sempre (a cruz da v106 e o menu das 8
  frases); cada gesto com o seu dedo (o analógico, o PASSE e o CHUTE continuam com os outros); a cruz das 5 frases (em
  racha-falas-v107, que vai na cópia do progresso da conta: tools/v82/inicio.js e app/contracts/progresso.ts); no COFRE ›
  EMOJI, a troca EMOJIS | FRASES (a cruz das frases para editar); e a API dos testes (window.RachaGestos107);
- app/public/game/v107-gestos.css: o aro, o botão que anda, o X, a cruz (os emojis e as pílulas das frases, com o brilho da
  acesa e as setinhas) e a cruz das frases no COFRE.
O servidor não muda (as mensagens emote {e} e fala {i} já existem). Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- o estilo da v107 depois do último da v106 (o dos emojis da partida)
CSS = RAIZ / 'app' / 'public' / 'game' / 'v107-gestos.css'
assert CSS.exists(), 'falta app/public/game/v107-gestos.css'
SUBS.append(('<link rel="stylesheet" href="./v106-emotes.css">\n', '<link rel="stylesheet" href="./v106-emotes.css">\n<link rel="stylesheet" href="./v107-gestos.css">\n'))

ARQUIVOS = [n for n in ('gestos.js',) if (AQUI / n).exists()]
assert ARQUIVOS == ['gestos.js'], 'falta tools/v107/gestos.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v107/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v107 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v107 · os gestos do emoji e das falas (tools/v107/gestos.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
