"""RACHA v102 · A BORDA BOTÃO, O ANEL DA TAMPINHA, O LOBBY MAIS LIMPO E O ONLINE MAIS LISO (aplicada por último, depois da v101).
O pedido (03/11/2026), com a imagem de duas tampinhas listradas num campo: "crie uma borda de botão nesse estilo e os
mensagens do correio não funciona no racha melhore essa borda ao redor e deixe o jogo mais liso multiplayer manda um preview
pra mim cria um lobby com menos informações tá muito confuso".
- tools/v102/borda.js: a borda BOTÃO (grátis, no fim da lista das bordas: os códigos de sempre não mudam) e o anel novo em
  volta da tampinha (o sensor; só o desenho — o alcance do chute é o mesmo);
- tools/v102/lobby.js + app/public/game/v102.css: o lobby com menos coisa na tela — em cima, o perfil, as moedas, as gemas, o
  correio e o MENU; no meio, a tampinha (e a vaga do grupo); embaixo, a barra com SALAS, TREINO, OFICINA e COFRE e, na direita,
  o modo em cima do JOGAR. O resto (LOJA, CLUBE, AMIGOS, RANKING, EVENTOS, PASSE, MISSÕES, CHAT, AJUSTES, CONEXÃO) fica no MENU,
  com os mesmos números e pontos; cada botão abre o que já abria;
- tools/v102/liso.js (quando existir): o online mais liso (só o cliente: o desenho das outras tampinhas e da bola).
O correio (app/api) é o servidor da plataforma: a correção dele não passa por aqui.
Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- o estilo da v102 depois de todos (depois do da v101, o último)
CSS = RAIZ / 'app' / 'public' / 'game' / 'v102.css'
if CSS.exists():
    SUBS.append(('<link rel="stylesheet" href="./v101.css">\n', '<link rel="stylesheet" href="./v101.css">\n<link rel="stylesheet" href="./v102.css">\n'))

ARQUIVOS = [n for n in ('borda.js', 'lobby.js', 'liso.js') if (AQUI / n).exists()]
assert 'borda.js' in ARQUIVOS, 'falta tools/v102/borda.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v102/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v102 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v102 (tools/v102/*.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
