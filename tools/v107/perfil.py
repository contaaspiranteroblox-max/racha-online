"""RACHA v107 · O PERFIL PELO NOME — NO CHAT, NA SALA E NA PARTIDA (aplicada por último, depois da v106/cofre).
O pedido (05/11/2026): "Na foto que mandei, como você pode ver, se clicar no nome de alguém no chat você pode entrar no perfil
da pessoa, adicionar ela e ver estatísticas — quero isso no chat. E nas salas personalizadas poder clicar no perfil da pessoa e
ver." (a foto era de outro jogo: de lá vem só o jeito — a janelinha do lado do nome com três botões grandes empilhados; o
desenho é o do RACHA).
- tools/v107/perfil.js: a janelinha do nome em todos os chats (o painel que a barra do lobby abre, a tela inteira do Chat do
  Brasil, a sala, a partida, a equipe, o clube e os amigos) — colada no nome, dentro da tela e da área segura, fechando ao
  tocar fora —, com PERFIL (o perfil do jogo: os números e o ADICIONAR, também por cima da partida), CONVIDAR (para a sua
  sala, mesmo quem não é amigo: convite {mid}, server/convite107.js; os amigos pelo ID) e DENUNCIAR (com o motivo, a da v88),
  e SILENCIAR · BLOQUEAR embaixo; o MEU PERFIL no seu nome; "sem conta" para quem não tem. Na tela da sala, tocar no cartão
  de alguém abre a janelinha com o PERFIL (quem não é o árbitro) ou a ficha do árbitro com o VER PERFIL primeiro; o mesmo no
  painel dos jogadores da partida (o arrastar do árbitro da v104 continua o mesmo);
- app/public/game/v107-perfil.css: a janelinha, a pontinha e o VER PERFIL na ficha do árbitro;
- o texto de "Receber convites para jogar" (Ajustes › Privacidade) diz que vale para o convite pelo chat também.
Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- o estilo da v107 depois do último da v106 (os emojis)
CSS = RAIZ / 'app' / 'public' / 'game' / 'v107-perfil.css'
assert CSS.exists(), 'falta app/public/game/v107-perfil.css'
SUBS.append(('<link rel="stylesheet" href="./v106-emotes.css">\n', '<link rel="stylesheet" href="./v106-emotes.css">\n<link rel="stylesheet" href="./v107-perfil.css">\n'))

# ---- Ajustes › Privacidade: receber convites agora vale também para quem chama pelo chat (não só os amigos)
SUBS.append(("['aceitaConvites', 'Receber convites para jogar', 'Desligado, os amigos não conseguem chamar você para a sala'],",
             "['aceitaConvites', 'Receber convites para jogar', 'Desligado, ninguém chama você para a sala (nem os amigos, nem pelo chat)'],"))

ARQUIVOS = [n for n in ('perfil.js',) if (AQUI / n).exists()]
assert ARQUIVOS == ['perfil.js'], 'falta tools/v107/perfil.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v107/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v107 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v107 · o perfil pelo nome no chat, na sala e na partida (tools/v107/perfil.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
