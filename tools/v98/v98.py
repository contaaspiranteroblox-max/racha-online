"""RACHA v98 · O RACHA E O RACHÃO SEPARADOS NA OFICINA E AS SALAS ONLINE DO RACHÃO (aplicada por último, depois da v97).
O pedido (29/10/2026): "Deixe separado o racha e o rachão, os caras podem escolher criar modo racha ou rachão, porém dá pra
criar sala de rachão também on-line".
- a Oficina tem dois modos, RACHA e RACHÃO (a escolha no topo da central e no CRIAR): cada um com as suas abas, os seus
  criados e as suas salas (tools/oficina/hub.js, rachao.js e rachao_sala.js);
- as salas online do Rachão: o servidor das salas joga a partida com o motor do Rachão — server/partida/rachao_motor.js é
  gerado da página por tools/v98/rachao_servidor.py (este script roda aqui) e server/partida/rachao.js é a partida da
  sala; a página do Rachão ganha a partida online (app/public/game/rachao/rede.js, com o quadro.js que as duas pontas usam;
  os ganchos pequenos no desenho ficam no tools/v97/rachao.py, parte 6);
- o hello do jogo diz que o aparelho conhece as salas do Rachão (rch: 1): a página antiga guardada num aparelho não entra
  nelas (o servidor avisa para atualizar).
Nada no bloco PHYS do RACHA muda (o build confere o sha da física); a física das salas comuns e da ranqueada também não."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
SUBS = []
SUBS_PHYS = []
_arq = AQUI / 'rachao_servidor.py'
exec(compile(_arq.read_text(encoding='utf-8'), str(_arq), 'exec'), {'__file__': str(_arq), '__name__': 'etapa_v98'})
