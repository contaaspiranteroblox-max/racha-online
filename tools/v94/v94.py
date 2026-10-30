"""RACHA v94 · o motor próprio (a jogabilidade reconstruída a partir de docs/v94/ESPECIFICACAO_MOTOR.md).
O build cola no jogo, nesta ordem, depois da v93:
- o motor (server/partida/motor.js: o MESMO arquivo que o servidor usa — window.RachaMotor);
- o código da integração em tools/v94/*.js (na ordem de ARQUIVOS).
Nada aqui mexe no bloco de física (SUBS_PHYS vazio): o motor antigo continua inteiro para o perfil "motor de antes" do
painel de testes; o motor próprio entra por cima (o physicsStep, o aplicaModo e o rqSaida são trocados por fora).
"""
import pathlib

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent

SUBS = []
SUBS_PHYS = []

MOTOR = RAIZ / 'server' / 'partida' / 'motor.js'
ARQUIVOS = [n for n in ('base.js', 'jogo.js', 'desenho.js', 'analogico.js', 'camera.js', 'painel.js', 'rede.js', 'fim.js') if (AQUI / n).exists()]
if MOTOR.exists() and ARQUIVOS:
    CODIGO = '\n'.join((AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
    SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
                 '\n/* ======================================================================= RACHA v94 · o motor próprio (server/partida/motor.js) */\n;'
                 + MOTOR.read_text(encoding='utf-8')
                 + '\n/* ======================================================================= RACHA v94 (tools/v94/*.js) */\n' + CODIGO
                 + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
