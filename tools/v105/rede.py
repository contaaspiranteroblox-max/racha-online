"""RACHA v105 · o contato desenhado no online (aplicada depois da v105/corpo).
- tools/v105/rede.js: a bola desenhada nunca dentro de uma tampinha desenhada (o deslize das correções da v96 com o ping
  ruim fazia a bola "atravessar" a tampinha) — o mesmo arquivo que o simulador do Node (tests/v102/sim.mjs) roda;
- o servidor (server/turma.js) manda 60 quadros por segundo nas salas (eram 30): as correções da previsão ficam com a metade
  do tamanho (o simulador: a correção da sua tampinha no 4G ruim de 6,1 para 2,1 px, o erro da bola de 16 para 11 px).
Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
SUBS = []
SUBS_PHYS = []
CODIGO = (AQUI / 'rede.js').read_text(encoding='utf-8')
assert '</script' not in CODIGO.lower(), 'o código da v105 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v105 · o contato desenhado no online (tools/v105/rede.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
