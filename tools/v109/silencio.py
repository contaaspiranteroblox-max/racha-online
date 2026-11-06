"""RACHA v109 · O SILÊNCIO DA EQUIPE NO JOGO (aplicada por último, depois da v108/lento).
O pedido (06/11/2026): o painel da staff "multa" o jogador no chat — "o chat daí não pode mais mandar msg por 5 min, 10 min,
1 hora, 1 dia, 5 dias, 10 dias, 30 dias" — e o Dono vê tudo o que a staff faz.
- tools/v109/silencio.js: o jogo mostra o aviso do servidor das salas (quanto falta e o motivo) quando a conta calada tenta
  falar em qualquer chat, e o aviso na hora quando a equipe cala ou libera o chat, ou tira a conta da sala;
- o servidor (server/silencio109.js, as trocas em server/turma.js, social88.js e emotes106.js) e a plataforma (app/api/racha/
  v109/, o RACHA CONTROL com os dois painéis em app/src/pages/) não passam pelo build.
Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
SUBS = []
SUBS_PHYS = []
ARQUIVOS = [n for n in ('silencio.js',) if (AQUI / n).exists()]
assert ARQUIVOS == ['silencio.js'], 'falta tools/v109/silencio.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v109/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v109 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v109 · o silêncio da equipe no jogo (tools/v109/silencio.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
