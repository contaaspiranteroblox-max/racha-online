"""RACHA v106 · AS BOLAS E AS MASCOTES NOVAS (aplicada por último, depois do tamanho da borda da v105).
O pedido (05/11/2026): "crie mais bolas e skins não muitas" (com as capturas de outro jogo só para o clima: as tampinhas com
mascotes em medalhão e as bolas de gomos coloridas — nada copiado: tudo desenhado aqui, em código).
- os itens novos no catálogo de sempre (app/contracts/catalogo88.json, o MESMO do jogo e da plataforma, que confere a compra):
  6 bolas à venda e 6 tampinhas à venda (as mascotes) — tools/v106/catalogo.py escreve (rode de novo se mudar a lista);
- tools/v106/mascotes.js: o desenho das 6 mascotes (as caras: os bichos do Brasil em medalhão, o olhar bravo e a piscada);
- tools/v106/bolas.js: o desenho dos 3 padrões novos de bola (os gomos de praia, as labaredas e o espaço), ponto a ponto
  na esfera, girando com a mesma matriz da bola de sempre;
- tools/v106/conteudo.js: o jogo — as peças no FIM das listas (as 6 caras e a borda Medalhão: os códigos de sempre não
  mudam), as peças da conta (só quem comprou a mascote vê e usa no editor; não se vendem avulsas), a LOJA (TAMPINHAS ›
  MASCOTES, comprar e EQUIPAR AGORA), a exceção das prontas escondidas da v101, os bots sem elas e as bolas na partida e
  nas miniaturas;
- a troca abaixo: as peças das mascotes entram ANTES de a v105 reler as tampinhas adiadas (no começo do
  tools/v105/cosmeticos.js) — a mascote equipada e as salvas com ela não somem ao abrir o jogo.
Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
SUBS = []
SUBS_PHYS = []

# ---- as peças das mascotes antes da releitura das tampinhas adiadas (as que o começo do tampa_rua.js não conseguiu ler)
SUBS.append(("try { v105Adiadas(); } catch (e) { console.error('v105 adiadas', e); }",
             "try { if (typeof ct106Pecas === 'function') ct106Pecas(); } catch (e) { console.error('v106 peças', e); }   // v106: as caras das mascotes e a borda Medalhão entram antes (tools/v106/conteudo.js)\n"
             "try { v105Adiadas(); } catch (e) { console.error('v105 adiadas', e); }"))

ARQUIVOS = [n for n in ('mascotes.js', 'bolas.js', 'conteudo.js') if (AQUI / n).exists()]
assert ARQUIVOS == ['mascotes.js', 'bolas.js', 'conteudo.js'], 'faltam arquivos em tools/v106: ' + ', '.join(ARQUIVOS)
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v106/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v106 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v106 · as bolas e as mascotes (tools/v106/*.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
