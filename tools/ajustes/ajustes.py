"""OS AJUSTES FINOS E AS LINHAS DA BOLA (aplicado depois da v94, antes da Oficina).
- o código em tools/ajustes/*.js (na ordem de ARQUIVOS), colado no fim do script principal, depois do da v94:
  ajustes.js (a página AJUSTES FINOS dentro dos Ajustes de sempre: o que o painel de testes tinha — a fluidez, as linhas
  da bola, o online com a extrapolação, o analógico e a câmera — na versão oficial, guardado no aparelho) e linhas.js (a
  linha do chute e o caminho da bola: a conta da física de verdade rodada à frente, no treino, contra os bots e no online;
  e a extrapolação do online);
- o estilo em app/public/game/ajustes.css (depois do v93.css).
Nada aqui entra no bloco PHYS (o build confere a física): as linhas só LEEM o estado e chamam as mesmas funções de batida
(hitSeg, hitPoint, hitBox, hitBodies) numa bola de mentira."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- o estilo depois do da v93
SUBS.append(('<link rel="stylesheet" href="./v93.css">\n', '<link rel="stylesheet" href="./v93.css">\n<link rel="stylesheet" href="./ajustes.css">\n'))

# ---- as linhas da bola no quadro do jogo: logo depois do rastro da bola (no chão, por baixo de todo mundo; o rastro continua
#      o que era — a v70.2 deixou ele vazio). A função vem do código colado no fim (a declaração sobe para o começo do script;
#      o try segura um quadro desenhado antes de o código dos ajustes rodar).
SUBS.append(('trilhaPoe(TRILHA, VIS.bx, VIS.by, agoraFx()); trilhaDesenha(ctx, TRILHA);',
             'trilhaPoe(TRILHA, VIS.bx, VIS.by, agoraFx()); trilhaDesenha(ctx, TRILHA); try { lnDesenha(ctx); } catch (_) {}'))

# ---- o código
ARQUIVOS = ['ajustes.js', 'linhas.js']
for n in ARQUIVOS:
    assert (AQUI / n).exists(), 'falta tools/ajustes/' + n
CODIGO = '\n'.join((AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código dos ajustes não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA · os ajustes finos e as linhas da bola (tools/ajustes/*.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
