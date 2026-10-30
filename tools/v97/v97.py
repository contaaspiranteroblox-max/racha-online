"""RACHA v97 · O RACHÃO NA OFICINA (aplicada por último, depois da v96). O pedido (29/10/2026, com o arquivo rachao.html):
"adicione esse rachão na oficina de criação com várias opções de edição" — e a escolha: do jeito dele (o Rachão com o
motor dele; o editor de estádios com várias opções; jogar contra bots ou em 2; sem online).
- a página do Rachão (app/public/game/rachao/rachao.html) sai do original guardado em backup/rachao.html por
  tools/v97/rachao.py (as fontes do pacote, a trava da página e quatro ganchos pequenos no motor), com a Oficina de
  estádios ao lado (app/public/game/rachao/estadios.js e estadios.css);
- no RACHA, a aba RACHÃO da Oficina e o Rachão aberto por cima dela ficam em tools/oficina/rachao.js (colado com a
  Oficina, etapa oficina/oficina) e o estilo no fim do app/public/game/oficina.css.
Nada no bloco PHYS do RACHA muda (o build confere o sha da física); o servidor e a plataforma não mudam."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
SUBS = []
SUBS_PHYS = []
_arq = AQUI / 'rachao.py'
exec(compile(_arq.read_text(encoding='utf-8'), str(_arq), 'exec'), {'__file__': str(_arq), '__name__': 'etapa_v97'})
