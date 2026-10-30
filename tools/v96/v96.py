"""RACHA v96 · O ONLINE COM A SENSAÇÃO DO TREINO, AS TAMPINHAS ANIMADAS NOVAS E A TAMPINHA DOS 30 PRIMEIROS (aplicada por
último, depois da v95). O pedido: "deixar o online com a mesma sensação que no treino — online é tudo bugado, lag, parece
pesado, bola e personagem teleportam; as traves: quando está perto delas realmente atravessa e dá um bug de teleporte;
crie skins animadas; uma skin ultra rara para os 30 primeiros players que entrarem no jogo — deve ser muito bonita".
- o código em tools/v96/*.js (na ordem de ARQUIVOS), colado no fim do script principal, depois da v95:
  liso.js (o núcleo das correções lisas: o mesmo arquivo dos testes do Node), rede.js (o online liso), skins.js (as
  tampinhas animadas novas e a dos 30 primeiros), conta.js (depois do teste: a conta fora dos Ajustes — a janela SUA
  CONTA pelo perfil, o chat em Privacidade — e o anel do chute com o branco suave);
- o estilo em app/public/game/v96.css (depois do v95.css).
Nada no bloco PHYS muda (o build confere o sha da física); o servidor (server/partida/sala.js, nucleo.js) tem a recuperação
da fila de comandos e a plataforma (app/api) a tampinha dos 30 primeiros."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

CSS = RAIZ / 'app' / 'public' / 'game' / 'v96.css'
if CSS.exists():
    SUBS.append(('<link rel="stylesheet" href="./v95.css">\n', '<link rel="stylesheet" href="./v95.css">\n<link rel="stylesheet" href="./v96.css">\n'))

ARQUIVOS = [n for n in ['liso.js', 'rede.js', 'skins.js', 'conta.js'] if (AQUI / n).exists()]
assert 'liso.js' in ARQUIVOS and 'rede.js' in ARQUIVOS, 'faltam tools/v96/liso.js e rede.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v96/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v96 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v96 (tools/v96/*.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
