# RACHA v94 · o que os vídeos do Mamoball mostram (e o que não mostram)

Os 9 vídeos enviados são repostagens do TikTok, de terceiros (@huk.mb, @playermamoball, @user755436120, @fbz10.mb), com
música, cortes, zoom e efeitos. Oito são quadrados (576 × 576, recortados do celular deitado); só um está deitado
(`6014db3b`, 1024 × 576, 30 quadros por segundo, com o HUD inteiro) e é dele que saem as medidas de movimento. Nenhum
quadro mostra o campo inteiro. Não se sabe se as partidas são do modo Equal (pode haver atributos ou corrida).

**Régua.** Tudo é medido em **d = o diâmetro da tampinha no próprio quadro** (e em segundos), nunca em pixels do vídeo.
No `6014db3b`, d ≈ 44 px (a incerteza da escala é de uns ±8%: a borda da tampinha é borrada na compressão).

**Ferramentas** (`tools/v94/video/`, Python + OpenCV): `trilha2.py` segue uma tampinha (o modelo recortado de um quadro,
com subpixel) e a bola; `camera2.py` mede o deslocamento da câmera pelo fluxo óptico de cantos do cenário (fora das caixas
do HUD, que ficam paradas na tela); `movimento2.py` junta os dois (a posição no mundo = a da tela + a da câmera) e acha
arrancadas, paradas e inversões; `bola_cam.py` acha os chutes, os trechos em que a bola rola sozinha e o que a câmera segue.
A primeira tentativa de câmera (correlação de fase no gramado) foi descartada: as listras do campo não têm informação
vertical e ela inventava movimento (a tampinha chegava a "7,5 d/s"); o fluxo óptico corrigiu isso.

**Os 30 quadros por segundo não são a física nem o toque.** Um quadro do vídeo dura 33 ms; nada abaixo disso pode ser
medido, e o atraso entre o dedo e a tela não aparece (a gravação não mostra os toques).

## Observações

| # | o quê | medida | de onde | confiança |
|---|---|---|---|---|
| O1 | diâmetro da bola ÷ diâmetro da tampinha | 0,47–0,50 | `6014db3b` 12,0 s (22 ÷ 41–44 px); `2adbdafb` 1,0 s (23,4 ÷ 46,6 px); `7898206b` 2,0 s (≈ 22 ÷ 46,8 px, bola borrada) | alta |
| O2 | o anel em volta da tampinha (desenho) | 1,25–1,32 × o diâmetro | `2adbdafb` 1,0 s; `6014db3b` 12,0 s | média (é desenho; não diz o alcance do chute) |
| O3 | velocidade máxima da tampinha | 3,5–3,9 d/s (o patamar: 3,80–3,90 d/s em 377 quadros, com d = 44 px) | `6014db3b` 0–51 s, a tampinha FBz10 | média |
| O4 | arrancada e parada | quase instantâneas: de 15% a 85% da máxima em 1 quadro (mediana das 19 arrancadas) e em 2 quadros (mediana das 16 paradas) — ≤ 33 a 67 ms | `6014db3b` (2,4; 3,2; 4,4; 8,3; 20,2 s…) | média |
| O5 | inversão (a direção vira mais de 150°) | a mais rápida em 2 quadros (67 ms); a mediana 0,30 s (inclui o tempo do polegar atravessar o analógico) | `6014db3b` (7,2; 9,2; 10,1; 12,0 s…) | baixa |
| O6 | velocidade da bola logo depois do chute | o chute forte: 9,4–10,2 d/s (4 casos); um mais fraco a 8,3 d/s; um provável passe a 6,1 d/s | `6014db3b` 3,93; 8,33; 34,20; 41,37; 44,33; 43,23 s | média (forte) · baixa (passe) |
| O7 | quanto a bola perde rolando sozinha | ≈ 45% da velocidade por segundo (fator 0,55/s) | `6014db3b` 42,00–43,27 s (o trecho mais limpo, 3% de erro do ajuste); os outros trechos dão 0,45–0,66 com contatos no meio | média-baixa |
| O8 | a câmera | segue a tampinha (x ≈ 0,54·tampinha + 0,22·bola; y ≈ 0,86·tampinha + 0,13·bola) e a deixa fora do centro (mediana 2,4 d); não aparece o atraso proporcional à velocidade | `6014db3b` 0–51 s (1268 quadros; resíduo de ~2 d) | baixa |
| O9 | quanto do campo cabe na tela | ≈ 23 × 13 d (tela 16:9) · o RACHA hoje: ≈ 25,3 × 11,7 d (2,16:1) | `6014db3b` | média |
| O10 | espaço fora das linhas | da linha lateral ao muro ≈ 1,3 d; da linha de fundo ao muro ≈ 2,7 d (com o gol) | `2adbdafb` 1,0 s (um quadro) | baixa |

## O que estes vídeos não deixam determinar

- a frequência da física e o atraso do toque (o vídeo tem 30 quadros por segundo e não mostra os dedos);
- o analógico: quantas direções, zona morta, se a inclinação muda a velocidade;
- o alcance exato do chute e a regra da direção (provavelmente a linha centro da tampinha → centro da bola — não verificado);
- o DB (PASSE → CHUTE): o intervalo, a janela, o que acontece com a bola parada;
- o quique nas linhas, na trave e na rede (há rebotes nos vídeos, mas nenhum limpo o bastante para medir);
- a condução (só 24 quadros correndo com a bola perto: o vão mediano foi 0,55 d, pouco para concluir);
- o tamanho do campo e da boca do gol (nenhum quadro mostra o campo ou um gol inteiro);
- o efeito das batidas entre jogadores no controle.

## O que pedir para fechar as lacunas (gravações próprias)

Gravação de tela original (sem edição), a 60 quadros por segundo, celular deitado, com **Mostrar toques** ligado no
Android (Opções do desenvolvedor), e, se der, o celular filmado por outro em câmera lenta (o dedo e a tela juntos):
1. o campo inteiro parado (o menu de pausa por cima serve), em cada tamanho;
2. sair do zero com o analógico no máximo por 1 s e soltar (5 vezes); inverter; virar 90°; andar em círculo;
3. bola parada: só PASSE e só CHUTE, 3 de cada, deixando rolar até parar;
4. chutar a bola vindo e indo; bater na lateral a uns 45° e na trave;
5. conduzir em reta e em curva; disputa com outro jogador;
6. PASSE e logo depois CHUTE (toque rápido e segurando); apertar antes de chegar na bola; andar e chutar com dois dedos.
