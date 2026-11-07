"""RACHA v113 · AS SALAS PERSONALIZADAS COM 10 MINUTOS E A SAÍDA DO TIME VERMELHO (aplicada depois da v112; a v111 enxuga
depois de todas). O pedido (07/11/2026): "quero 10 min nas salas personalizadas" e "quando a sala iniciar é sempre do mesmo
lado, porém quando um time fizer gol a bola vai pro que sofreu o gol".
- o TEMPO da sala ganha 10 minutos (sem tempo, 2, 3, 5 ou 10): a lista do jogo (SL_TEMPOS, a da criação e a das regras da
  sala) — o servidor (server/turma.js, TEMPOS) aceita o mesmo;
- a saída (server/partida/sala.js, que a sala neste aparelho também usa pelo pacote da v99): na sala personalizada a partida
  começa sempre com a saída do Time Vermelho (o da esquerda); depois de cada gol sai quem levou o gol (como já era). A
  ranqueada continua sorteando a primeira saída.
Nada no bloco PHYS muda."""
SUBS = [("const SL_TEMPOS = [0, 2, 3, 5];", "const SL_TEMPOS = [0, 2, 3, 5, 10];   // (v113: + os 10 minutos)")]
SUBS_PHYS = []
