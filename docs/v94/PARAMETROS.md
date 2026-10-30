# RACHA v94 · os parâmetros do motor próprio

Tirados do próprio motor (`server/partida/motor.js`: `M.PADRAO` e `M.LIMITES`) por `node tools/v94/parametros.js`. d = o diâmetro
da tampinha (0,8 m); 1 passo = 1/60 s. **[obs]** = o número veio de uma medida dos vídeos (com a confiança de
`docs/v94/OBSERVACOES_VIDEOS.md`); **[dec]** = decisão de projeto, sem confirmação nos vídeos. Todos ficam no painel
AJUSTES › TESTES › MOTOR (os do campo valem a partir da próxima partida).

| chave | o que faz | padrão | unidade | no jogo | faixa aceita | origem |
|---|---|---|---|---|---|---|
| `vMax` | a corrida da tampinha (a inclinação do analógico não muda) | 2,95 | m/s | 3,6875 d/s | 1,5 – 4,5 | [obs O3: 3,5–3,9 d/s] |
| `aAcel` | a aceleração de arrancada | 52 | m/s² | 0 → corrida em 57 ms | 10 – 400 | [obs O4: ≤ 33–67 ms] |
| `aPara` | a aceleração de parada (alvo zero) | 60 | m/s² | 0 → corrida em 49 ms | 10 – 400 | [obs O4] |
| `aVira` | a aceleração na inversão (alvo contra a velocidade) | 75 | m/s² | +corrida → −corrida em 79 ms | 10 – 400 | [obs O5: a mais rápida em 67 ms] |
| `zonaMorta` | abaixo disto o comando é zero (só corta ruído; a zona morta de verdade é a do HUD) | 0,05 | — |  | 0 – 0,3 | [dec] |
| `meiaVida` | o freio proporcional da bola: perde metade da velocidade neste tempo | 1,25 | s |  | 0,4 – 4 | [obs O7: ≈ 0,55 por segundo, com o atrito] |
| `atritoRolamento` | o freio constante da bola (ela para de vez) | 0,12 | m/s² |  | 0 – 1 | [dec] |
| `vParou` | abaixo disto a bola para | 0,03 | m/s | 0,0375 d/s | 0 – 0,2 | [dec] |
| `vMaxBola` | o teto da bola | 10,4 | m/s | 13 d/s | 5 – 16 | [dec] acima do chute mais forte observado (O6) |
| `quiqueParede` | quique da bola nas linhas | 0,6 | — |  | 0 – 1 | [dec] |
| `retParede` | o que fica da velocidade de lado nas linhas | 0,9 | — |  | 0 – 1 | [dec] |
| `quiqueTrave` | quique da bola na trave | 0,55 | — |  | 0 – 1 | [dec] |
| `retTrave` | o que fica de lado na trave | 0,85 | — |  | 0 – 1 | [dec] |
| `quiqueRede` | quique da bola na rede | 0,12 | — |  | 0 – 1 | [dec] |
| `retRede` | o que fica de lado na rede | 0,55 | — |  | 0 – 1 | [dec] |
| `limiarQuique` | batida mais lenta que isto não quica | 0,4 | m/s | 0,5 d/s | 0 – 2 | [dec] |
| `quiqueJog` | quique tampinha × tampinha | 0,25 | — |  | 0 – 1 | [dec] |
| `quiqueConducao` | a bola que chega numa tampinha volta com esta fração (o domínio) | 0,1 | — |  | 0 – 0,6 | [dec] |
| `retConducao` | o que fica da velocidade de lado da bola na tampinha | 0,8 | — |  | 0 – 1 | [dec] |
| `pesoBola` | quanto a tampinha sente a bola (perde velocidade na direção dela) | 0,08 | — |  | 0 – 0,5 | [dec] |
| `impulsoConducao` | empurrando, a bola sai pelo menos isto mais rápida que a tampinha (os toques da condução) | 0,2 | m/s | 0,25 d/s | 0 – 1 | [dec] |
| `folgaChute` | o alcance do chute além de encostar | 0,11 | m | 0,1375 d | 0 – 0,4 | [dec] (o anel desenhado é maior: O2) |
| `vPasse` | a velocidade do PASSE com a bola parada | 4,8 | m/s | 6 d/s | 2 – 9 | [obs O6: ≈ 6,1 d/s, um caso] |
| `vChute` | a velocidade do CHUTE com a bola parada | 7,6 | m/s | 9,5 d/s | 3 – 13 | [obs O6: 9,4–10,2 d/s] |
| `heranca` | quanto da velocidade que a bola já tinha a favor fica no chute | 0,3 | — |  | 0 – 1 | [dec] |
| `herancaLado` | quanto da velocidade de lado da bola fica no chute | 0,3 | — |  | 0 – 1 | [dec] |
| `herancaCorrida` | quanto da corrida da tampinha (na direção do chute) entra no chute | 0,4 | — |  | 0 – 1 | [dec] |
| `herancaCombo` | a herança do CHUTE que completa o PASSE → CHUTE | 0,6 | — |  | 0 – 1 | [dec] |
| `janelaToque` | o toque solto espera a bola por este tanto (o toque antecipado) | 6 | passos | 100 ms | 0 – 15 | [dec] |
| `intervaloMin` | o mínimo entre dois chutes do mesmo jogador | 6 | passos | 100 ms | 1 – 20 | [dec] |
| `janelaParada` | PASSE → CHUTE com a bola parada: o CHUTE até este tanto depois do PASSE | 1 | passos | 17 ms | 0 – 6 | [dec] (o DB parado difícil, pedido da v92) |
| `janelaMovel` | PASSE → CHUTE com a bola andando | 3 | passos | 50 ms | 0 – 6 | [dec] |
| `protecaoParada` | com a bola parada, o CHUTE depois da janela é anulado até este tanto | 4 | passos | 67 ms | 0 – 12 | [dec] |
| `protecaoMovel` | o mesmo com a bola andando (0 = só a física decide) | 0 | passos | 0 ms | 0 – 12 | [dec] |
| `vParada` | a bola "parada" para a combinação | 0,3 | m/s | 0,375 d/s | 0 – 2 | [dec] |
| `paradaPassos` | a bola que estava parada até este tanto antes ainda conta como parada | 6 | passos | 100 ms | 0 – 12 | [dec] |
| `cargaTempo` | a CURVA carrega de 0 a 100% neste tempo | 1,2 | s |  | 0,3 – 3 | [dec] |
| `armadoTempo` | solta, a CURVA fica armada por este tempo | 0,35 | s |  | 0,05 – 1 | [dec] |
| `vCurva0` | a velocidade do chute de CURVA sem carga | 5,6 | m/s | 7 d/s | 2 – 10 | [dec] |
| `vCurva1` | o que a carga cheia soma | 2 | m/s | 2,5 d/s | 0 – 5 | [dec] |
| `curvaK0` | o efeito da CURVA sem carga | 0,25 | 1/s |  | 0 – 2 | [dec] |
| `curvaK1` | o que a carga cheia soma ao efeito | 0,95 | 1/s |  | 0 – 2 | [dec] |
| `curvaT0` | quanto tempo o efeito dura sem carga | 0,45 | s |  | 0 – 2 | [dec] |
| `curvaT1` | o que a carga cheia soma ao tempo | 0,45 | s |  | 0 – 2 | [dec] |
| `areaPorJogador` | o espaço de cada jogador (o campo cresce com o time) | 62 | d² |  | 35 – 110 | [dec] |
| `proporcao1` | comprimento ÷ largura no 1 VS 1 | 1,46 | — |  | 1 – 2 | [dec] |
| `proporcaoPasso` | quanto a proporção cai a cada jogador a mais | 0,07 | — |  | 0 – 0,2 | [dec] |
| `margemLado` | da linha lateral ao limite da tampinha | 1,35 | d |  | 0,5 – 4 | [obs O10: ≈ 1,3 d] |
| `margemFundo` | da linha de fundo ao limite da tampinha | 2,4 | d |  | 0,5 – 4 | [obs O10: ≈ 2,7 d] |
| `bocaBase` | a boca do gol: a parte fixa | 0,4 | d |  | 0 – 3 | [dec] |
| `bocaFator` | a boca do gol: a fração da largura do campo | 0,3 | — |  | 0,1 – 0,6 | [dec] |
| `fundoGol` | a profundidade do gol | 1,55 | d |  | 0,8 – 3 | [dec] |
| `raioTrave` | o raio da trave | 0,07 | d |  | 0,02 – 0,3 | [dec] |
| `circuloBase` | o círculo central: a parte fixa | 0,8 | d |  | 0 – 3 | [dec] |
| `circuloFator` | o círculo central: a fração da largura | 0,12 | — |  | 0 – 0,3 | [dec] |

Fixos (não são parâmetros): o raio da tampinha 0,40 m (d/2), o raio da bola 0,20 m ([obs O1: 0,47–0,50 do diâmetro]), o passo
de 1/60 s, os subpassos (2 a 16, cada um com no máximo 0,35 × o raio da bola de deslocamento) e o "encostar" do evento toque
(a distância entre os centros ≤ rJ + rB + 0,02 m).
