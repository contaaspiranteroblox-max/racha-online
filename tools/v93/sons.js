/* ==================================================================================================================
   RACHA v93 · Fase 7 — OS SONS (as trocas ficam dentro do motor de som, em tools/v93/v93.py: o som é uma "caixa fechada")
   · Sem estouro: um limitador no fim da cadeia (chute + torcida + apito juntos não passam do teto) e o ataque de 2–3 ms
     em cada som (antes o volume começava cheio de uma vez: o "clique" seco no começo de cada chute, toque e botão).
   · O CHUTE e o PASSE com o som de cada um: o chute com o "tum" grave e o "pá" do contato; o passe, um "toc" redondo e curto
     (antes era o mesmo chute mais baixo). Dois chutes colados (o DB): o segundo mais baixo, sem dobrar o volume.
   · Variações discretas (±3 a 6% na afinação do impacto e ±8% no volume) no chute, no passe, no toque na bola e nos estalos:
     o mesmo som repetido não fica robótico. Os sons com notas (moeda, compra, nível, OK) não variam (continuam afinados).
     O sorteio é só dos sons: o Math.random da partida fica igual.
   · O GOL: a rede (o "chuá" da bola entrando) e um acorde curto no lugar do apito agudo, com a torcida de sempre.
   · Os BOTÕES: o clique mais macio.
   · O COMEÇO: o bip do 3, 2, 1 e o JÁ! (mais agudo, com o apito da saída) — a contagem da Fase 2.
   · No celular: até 32 sons ao mesmo tempo (o resto espera a vez: nada de travar o áudio), a latência de jogo e o áudio que
     volta sozinho depois de uma ligação ou de trocar de app (o toque seguinte religa, como antes).
   · Os volumes separados (MÚSICA e EFEITOS, em Ajustes › Áudio) continuam os da v88.
   ================================================================================================================== */
window.RachaSons93 = {versao:'v93'};
