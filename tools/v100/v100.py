"""RACHA v100 · A REVISÃO DE SEGURANÇA (aplicada por último, depois da v99) — o lado do jogo.
O pedido (29/10/2026): a revisão completa de segurança (login, multiplayer, patentes, o projeto), corrigindo o que existe
de verdade sem mudar a jogabilidade, a física, os controles nem os menus. O que mudou no servidor e na plataforma está em
server/ e app/api (o CHANGELOG.md, v100); aqui, só o que o jogo precisa:
- o convite com OUTRO servidor (?servidor= no link): antes o jogo trocava de servidor sozinho e guardava a troca, e o
  bilhete da conta ia junto no hello — um link podia mandar o jogo (e o bilhete, que abre as salas como a conta) para o
  servidor de outra pessoa. Agora o endereço do link espera a confirmação (tools/v100/seguranca.js) e o bilhete da conta só
  vai para o servidor do jogo (o mesmo endereço do jogo, o do config.js ou os de RACHA_CONFIG.servidoresConfiaveis) — em
  qualquer mensagem das salas e do Chat do Brasil (o jogo tira a conta do que vai para outro servidor); a entrada no Chat do
  Brasil leva o bilhete (o servidor das salas não reconhece mais a conta pelo token do aparelho) e, antes de se apresentar,
  o jogo pede um bilhete novo se o dele passou de 10 minutos (o celular que voltou do segundo plano);
- o bilhete da conta passou a valer 15 minutos (eram 30): o jogo usa o de até 12 minutos (eram 25) e pede outro com mais de
  10 (eram 20) — o jogo continua pedindo um novo a cada 9.
Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
SUBS = []
SUBS_PHYS = []

# ---- o convite com outro servidor: o endereço espera a confirmação (não troca sozinho nem fica guardado sem a pessoa querer)
SUBS.append(("    if (sv){ const u = normalizaServidor(sv); if (u) localStorage.setItem('streetball-server', u); }",
             "    if (sv){ const u = normalizaServidor(sv); if (u) SL.servidorConvite = u; }   // v100: o servidor do convite espera a confirmação (tools/v100/seguranca.js)"))

# ---- o bilhete da conta vale 15 minutos no servidor (app/api/lib/selo.ts): o jogo usa o de até 12 e pede outro com mais de 10
SUBS.append(("  if (V70ON.bilhete && Date.now() - V70ON.bilheteT < 25*60e3) o.conta = V70ON.bilhete;",
             "  if (V70ON.bilhete && Date.now() - V70ON.bilheteT < 12*60e3) o.conta = V70ON.bilhete;   // v100: o bilhete vale 15 min (eram 30)"))
SUBS.append(("  if (!V70ON.bilhete || Date.now() - V70ON.bilheteT > 20*60e3) v70PedeBilhete().then(comeca); else comeca();",
             "  if (!V70ON.bilhete || Date.now() - V70ON.bilheteT > 10*60e3) v70PedeBilhete().then(comeca); else comeca();   // v100: (o bilhete vale 15 min)"))

ARQUIVOS = ['seguranca.js']
for n in ARQUIVOS:
    assert (AQUI / n).exists(), 'falta tools/v100/' + n
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v100/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v100 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v100 (tools/v100/*.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
