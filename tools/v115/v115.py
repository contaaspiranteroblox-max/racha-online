"""RACHA v115 · A PARTIDA DA SALA PERSONALIZADA LIMPA (aplicada depois da v113; a v111 enxuga depois de todas).
O pedido (07/11/2026, com a foto de como está e a de como quer): a faixa de cima da partida na sala ("SALA KL6S6Q · árbitro
[SALA] [CÂMERA: BOLA] [SAIR]") polui o jogo; quer os botões só com o desenho, quadrados, no canto, e o FPS e o ping pequenos
no canto de baixo — tools/v115/limpa.js (o que cada botão faz não muda; a ranqueada fica como está).
Nada no bloco PHYS muda."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
CODIGO = (AQUI / 'limpa.js').read_text(encoding='utf-8')
assert '</script' not in CODIGO.lower(), 'o código da v115 não pode ter </script'
SUBS = [('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
         '\n/* ======================================================================= RACHA v115 · a partida da sala limpa (tools/v115/limpa.js) */\n' + CODIGO
         + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();')]
SUBS_PHYS = []
