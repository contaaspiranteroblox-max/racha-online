# RACHA v94 · o motor de antes × o motor próprio × o que os vídeos mostram

Medidas dos cenários reproduzíveis de `tests/v94/cenarios.js` (o mesmo cenário, passo a passo, nos dois motores: `node
tests/v94/cenarios.js atual` e `node tests/v94/cenarios.js novo`), em **d** (o diâmetro da tampinha) e segundos. A coluna
dos vídeos vem de `docs/v94/OBSERVACOES_VIDEOS.md`, com a confiança de lá; "—" = os vídeos não deixam medir.
Os vídeos têm 30 quadros por segundo: nada abaixo de 33 ms aparece neles (não é a frequência da física nem do toque).
Isto é o motor medido por ele mesmo, sem celular: **não diz como fica a sensação na mão** (ver as limitações no relatório).

Para refazer: `node tests/v94/cenarios.js atual --json A.json && node tests/v94/cenarios.js novo --json N.json &&
node tools/v94/compara.js A.json N.json`.

| medida | o motor de antes | o motor próprio | o que os vídeos mostram | confiança |
|---|---|---|---|---|
| Velocidade máxima da tampinha (d/s) | 3,52 | 3,69 | 3,5–3,9 (O3) | média |
| Arrancada: 90% da máxima | 17 ms | 67 ms | ≤ 33–67 ms (O4) | média |
| Parada: da máxima até parar | 17 ms | 50 ms | ≤ 67 ms (O4) | média |
| Distância da parada (d) | 0,00 | 0,06 | — |  |
| Inversão: até 90% do outro lado | 33 ms | 100 ms | a mais rápida ≈ 67 ms (O5) | baixa |
| Virada de 90°: direção a 10° | 67 ms | 83 ms | — |  |
| Analógico: meia inclinação ÷ toda | 1,00 | 1,00 | — |  |
| PASSE parado: velocidade de saída (d/s) | 5,26 | 5,94 | ≈ 6,1 (O6, um caso) | baixa |
| CHUTE parado: velocidade de saída (d/s) | 8,41 | 9,41 | 9,4–10,2 (O6) | média |
| A bola rolando: fator por segundo | 0,55 | 0,56 | ≈ 0,55 (O7) | média-baixa |
| CHUTE parado: até parar (d) | 13,77 | 15,14 | — |  |
| CHUTE parado: tempo até parar | 8,0 s | 6,2 s | — |  |
| CHUTE correndo (d/s) | 8,41 | 10,87 | — |  |
| CHUTE na bola vindo a 3 d/s (d/s) | 5,45 | 9,41 | — |  |
| CHUTE na bola indo a 3 d/s (d/s) | 11,38 | 10,30 | — |  |
| Alcance: centro a centro (d) | 0,88 | 0,89 | — |  |
| Alcance além do contato (d) | 0,13 | 0,14 | o anel desenhado: 1,25–1,32 d (O2, é desenho) |  |
| Raio da bola ÷ raio da tampinha | 0,50 | 0,50 | 0,47–0,50 (O1) | alta |
| Lateral a 90°, 8 d/s: quique | 0,64 | 0,59 | — |  |
| Lateral a 45°, 8 d/s: o que fica de lado | 0,66 | 0,89 | — |  |
| Trave a 8 d/s: quique | 0,59 | 0,54 | — |  |
| Condução: vão mediano (d) | -0,00 | 0,01 | ≈ 0,55 (24 quadros: pouco para concluir) | baixa |
| Condução: toques em 1,5 s | 0 | 9 | — |  |
| Disputa de frente: a bola andou (d) | 0,00 | 0,00 | — |  |
| PASSE → CHUTE, bola parada, no passo seguinte | passe@0 chute@1 | passe@0 chute@1 | — |  |
| PASSE → CHUTE, bola parada, 2 passos depois | passe@0 | passe@0 | — |  |
| PASSE → CHUTE, bola vindo, 2 passos depois | passe@0 chute@2 | passe@0 | — |  |
| PASSE → CHUTE, bola vindo, 3 passos depois | passe@0 | passe@0 | — |  |
| Segurando o CHUTE até a bola chegar: chutes | 1 | 1 | — |  |
| Toque 100 ms antes de a bola chegar vale? | não | sim | — |  |
| Toque 150 ms antes vale? | não | não | — |  |
| Chutes em 1 s apertando sem parar | 30 | 10 | — |  |
| Menor intervalo entre chutes | 33 ms | 100 ms | — |  |

## Leitura

- **Movimento.** O motor de antes muda a velocidade num passo só (arranca, para e inverte em 17–33 ms). O próprio tem
  aceleração limitada: arranca em 67 ms (90%), para em 50 ms e inverte em 100 ms — dentro do que os vídeos mostram
  (O4: de 15% a 85% da corrida em um quadro de 33 ms; O5: a inversão mais rápida em 67 ms). Na mão, isso pesa um pouco
  mais que o de antes; os três números (Arrancada, Parada, Inversão) estão no painel para testar.
- **Chute.** O CHUTE parado sai a 9,41 d/s (os vídeos: 9,4–10,2) e o PASSE a 5,94 (≈ 6,1, um caso só). Chutar
  correndo soma 40% da corrida; a bola que vem contra perde o que trazia e sai como a parada (no de antes, a bola vindo
  saía fraca: 5,45 d/s); a bola que já ia a favor ajuda 30%.
- **Bola rolando.** O mesmo ritmo por segundo (≈ 0,55, O7); com o atrito de rolamento ela para de vez (6,2 s em vez de
  ficar se arrastando até 8 s).
- **Batidas.** A bola quica um pouco menos e escorrega mais de lado nas linhas (0,59 e 0,89 contra 0,64 e 0,66); a
  trave segura um pouco mais. Os vídeos não mostram nenhum rebote limpo o bastante para medir.
- **Condução.** No de antes a bola fica grudada na tampinha (o vão é negativo: ela fica encostada por dentro); no próprio
  a tampinha dá toques curtos (9 em 1,5 s) e a bola descola ~1 cm. Os vídeos sugerem um vão maior (≈ 0,55 d), mas com
  24 quadros só: não dá para concluir.
- **Comandos.** O toque até 100 ms antes de a bola chegar vale (antes, só até 67 ms); o intervalo entre chutes do mesmo
  jogador passou de 33 ms para 100 ms (no máximo 10 chutes por segundo); o PASSE → CHUTE com a bola parada continua só
  no passo seguinte; com a bola vindo, a combinação só sai enquanto a bola estiver no alcance.
