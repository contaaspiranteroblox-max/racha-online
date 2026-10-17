# Verifier v2 — 2026-10-11 (substitui v1 no item 1)
Mudança em relação à v1:
- Item 1 (física): antes "apenas 1 linha de script tag". Agora: o jogo em public/game/racha.html
  deve diferir do original APENAS POR ADIÇÕES (diff sem nenhuma linha '<'): 4 ganchos
  try/catch dentro da IIFE (início de partida, ginga, fim contado, gol de treino) + 1 tag
  <script> da ponte. Nenhuma linha de física/jogabilidade pode ser modificada, removida
  ou reordenada — verificado por `diff original servido | grep -c '^<' == 0`.
- Novo item 9: os ganchos devem disparar de verdade — ao iniciar partida no jogo, a API
  jogo.iniciarPartida é chamada (token); ao contabilizar o fim, jogo.encerrarPartida.
Demais itens (2–8) herdados da v1.
