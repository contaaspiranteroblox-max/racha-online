# FR-85 — a física própria do RACHA

Versão do núcleo: `FR-85` (`server/partida/nucleo_fisica.js`). Escrita na auditoria de 17/10/2026.

## 1. Por que esta especificação existe

A auditoria de proveniência de 17/10/2026 encontrou que os números da física do RACHA até a v84 eram valores de outro
jogo: velocidade, chutes, massas, raios, desaceleração, teto da bola, materiais, medidas das quadras, a quantização do
analógico, os estados dos botões e a suavização da câmera. Esta especificação substitui todos eles. Nenhum número daqui
foi copiado de outro jogo nem obtido ajustando os números antigos; o que se aproveitou da versão anterior foi o
comportamento de jogo (o ritmo), usado como referência das metas M1, M3 e M4, como explicado logo abaixo.

**Como foi feita, sem esconder nada.** As metas da seção 3 foram escritas para manter o *tipo de jogo* que o RACHA já tinha:
o ritmo de uma partida curta de rua, o passe que anda mais ou menos meia quadra, o chute que cruza a quadra pequena, a
condução com a bola grudada no pé. Então o ritmo geral fica parecido com o da v84, e isso é de propósito: é a experiência
de jogo do próprio RACHA. O que é novo:
* os **modelos**: aceleração limitada no lugar de "impulso, teto e zerar ao soltar"; chute que define a velocidade de saída
  no lugar de somar "força ÷ massa"; meia-vida por piso; tabela de batidas por par, sem regra de combinação de materiais e
  sem giro físico; analógico de 256 direções; gatilho de chute em bits;
* **todos os números**, que saem das metas;
* as **quadras**, por uma regra de medidas própria.

A especificação e a reimplementação foram feitas pelo mesmo assistente de IA que, nesta mesma sessão de trabalho, tinha
analisado o outro jogo. **Não houve separação de equipes (clean room).** A independência vem da especificação escrita por
metas e da conferência automática (a varredura de valores e estruturas), não de separação de pessoas.

## 2. Unidades e passo

* Posição em px da tela virtual; 1 u (unidade de quadra) = 19 px. Tempo em segundos; velocidade em px/s (os valores
  abaixo vêm em u ou u/s).
* Passo fixo de 60 Hz (a taxa de tela mais comum), igual no aparelho e no servidor.
* Subpassos: em cada passo, nada anda mais que 30% do raio da bola de uma vez (de 2 a 12 subpassos), e as batidas são
  resolvidas duas vezes em cada subpasso.

## 3. As metas de jogo (escritas antes dos números)

| meta | o que se quer | como se mede |
|---|---|---|
| M1 ritmo | a tampinha atravessa a quadra do 1v1 em cerca de 4 s e a do 4v4 em cerca de 7 s | da linha de fundo até a outra, com o analógico apontado |
| M2 resposta | parece imediata, mas a tampinha não "teleporta": arranca em ~0,06 s e para em ~0,05 s | de parada até a corrida; da corrida até parar |
| M3 passe | ~2× a corrida; anda ~70% da quadra do 1v1 e ~55% da do 2v2 até parar | chute parado na Arena |
| M4 chute | ~3× a corrida; cruza a quadra do 1v1 | idem |
| M5 condução | correndo atrás da bola, ela vai grudada no pé, sem quicar para longe | 3 s de corrida reta atrás da bola |
| M6 igualdade | todo mundo igual: o mesmo corpo, a mesma corrida, o mesmo chute (cosmético não muda nada); ninguém passa da corrida pelas próprias pernas | os bots usam as mesmas funções |
| M7 leitura | a bola um pouco maior que a metade da tampinha (dá para ver no celular); o anel desenhado mostra o alcance real do chute | o desenho usa os mesmos números |
| M8 quadras | proporções de quadra de rua, gols grandes de arcade, marcas pintadas proporcionais | regra da seção 5 |

## 4. O modelo e os números

### Tampinha (todo mundo igual)
| parâmetro | valor | de onde sai |
|---|---|---|
| raio | 1,8 u | M7/M8: com as quadras da seção 5, dá ~14 diâmetros no comprimento do 1v1 |
| massa | 1 | referência |
| corrida (vmax) | 13 u/s | M1 |
| arrancada | 0,06 s até a corrida (aceleração = vmax/0,06) | M2 |
| freio | 0,045 s até parar, com o analógico solto | M2 |
| teto | nunca acima de vmax depois do passo de movimento (o empurrão de uma batida não vira corrida) | M6 |

**Movimento:** a cada passo, a velocidade vai em direção à do analógico (direção × vmax, ou zero) sem mudar mais que
aceleração × dt (arrancada se o analógico está apontado, freio se está solto); depois, o módulo fica limitado a vmax.

### Analógico
256 direções (o ângulo arredondado para 1/256 de volta; cabe num byte na rede). A força do dedo não muda a velocidade:
ou corre, ou está parado. A zona morta e a "direção firme" (só troca de direção quando o dedo passa meio setor da
divisa) continuam no código do analógico.

### Bola
| parâmetro | valor | de onde sai |
|---|---|---|
| raio | 1,15 u | M7 |
| massa | 1,6 | M5: mais pesada que a tampinha, o encontro empurra sem arremessar |
| meia-vida da velocidade — quadra (Arena e Estádio) | 0,95 s (fica 0,987913 da velocidade a cada passo) | M3/M4 |
| meia-vida — rua de cimento gasto (campos guardados) | 1,10 s | rola mais |
| teto | 48 u/s | acima do chute mais forte com embalo (40,5 + 0,35 × 13 = 45,05 u/s) |
| parada | abaixo de 0,08 u/s a bola para | não fica "arrastando" para sempre |

### Chute
| parâmetro | valor | de onde sai |
|---|---|---|
| alcance | a borda da bola até 0,75 u da borda da tampinha (centros a no máximo 3,70 u) | M7 |
| passe (velocidade de saída) | 26,5 u/s | M3: 2,04× a corrida |
| chute (velocidade de saída) | 40,5 u/s | M4: 3,12× a corrida |
| embalo | + 35% da velocidade da tampinha na direção do chute | correr para a bola dá mais força |
| raspão | fica 20% do que a bola tinha de lado | o chute redireciona, não soma |

**Chute:** a direção é do centro da tampinha ao centro da bola; a bola sai com (velocidade do botão + embalo) nessa
direção, mais 20% da velocidade lateral que tinha. O que ela tinha na direção do chute é substituído.

### Gatilho dos botões
Cada passo lê o que está apertado em bits (1 = PASSE, 2 = CHUTE). Apertar arma o chute daquele botão: vale o último
apertado, e se os dois descerem no mesmo passo vale o CHUTE. Segurando, o chute fica armado até a bola entrar no alcance.
Depois de chutar, só um aperto novo arma de novo (um aperto = um chute). Na rede, o comando leva `acao` (os bits).

### Batidas (restituição e e atrito de Coulomb μ, por par, sem giro)
| par | e | μ |
|---|---|---|
| bola × linhas da quadra (a parede da bola) | 0,55 | 0,20 |
| bola × trave de ferro | 0,50 | 0,10 |
| bola × rede de corda | 0,10 | 0,40 |
| bola × tampinha | 0,12 | 0,15 |
| tampinha × tampinha | 0,20 | 0 |
| tampinha × alambrado, rede e traves | 0,15 | 0 |
| bola × paredão do treino | 0,80 | 0,20 |
| bola × chinelo (campo guardado) | 0,30 | 0,30 |

Batida mais lenta que 0,25 u/s não quica. Entre dois corpos, a separação é dividida na proporção das massas, com folga
de 0,25 px, e corrige 80% da sobreposição. As fórmulas são de livro: impulso normal −(1+e)·vn e impulso tangencial
limitado a μ vezes o normal.

## 5. As quadras (regra própria)

Comprimento L × largura W dentro das linhas, por tamanho de time: 1v1 52 × 36 · 2v2 64 × 44 · 3v3 78 × 56 · 4v4 92 × 68 u.

* A tampinha anda até 6 u além das linhas (busca a bola na beira).
* Boca do gol = 0,24·W + 3,8 u (arredondada a 0,01). Profundidade 4,2 u, trave de 0,64 u, rede de 0,3 u.
* Marcas: área [0,17·L de fundo, boca + 0,4·W de altura]; pequena área [0,075·L, boca + 4 u]; marca do pênalti a 0,12·L;
  círculo do meio de raio 0,14·W (é também a barreira da saída); meia-lua de raio 0,1·W com centro na marca do pênalti.
* A tampinha começa o treino livre a 0,21·L do centro.

| tamanho | linhas (u) | área da tampinha | boca × profundidade | área | pequena | pênalti | círculo |
|---|---|---|---|---|---|---|---|
| 1v1 | 52 × 36 | 64 × 48 | 12,44 × 4,2 | 8,84 × 26,84 | 3,9 × 16,44 | 6,24 | 5,04 |
| 2v2 | 64 × 44 | 76 × 56 | 14,36 × 4,2 | 10,88 × 31,96 | 4,8 × 18,36 | 7,68 | 6,16 |
| 3v3 | 78 × 56 | 90 × 68 | 17,24 × 4,2 | 13,26 × 39,64 | 5,85 × 21,24 | 9,36 | 7,84 |
| 4v4 | 92 × 68 | 104 × 80 | 20,12 × 4,2 | 15,64 × 47,32 | 6,9 × 24,12 | 11,04 | 9,52 |

**Regras de futebol que a quadra aplica** (Regras do Jogo, públicas): o gol só vale com a bola inteira além da linha, entre
as traves. Na saída, cada time fica no seu campo e o adversário fica fora do círculo do meio; quem bate pode usar o círculo
inteiro.

## 6. Onde está

* `server/partida/nucleo_fisica.js` — o núcleo (números e funções). O build cola o arquivo no jogo (`window.RACHA_FISICA`)
  e confere o sha256 dele; o servidor faz `require`. É o mesmo texto nos dois lados.
* `backup/racha.html` — o jogo-base: o bloco AJUSTES dá nomes aos números do núcleo; o bloco PHYS chama o núcleo
  (movimento, batidas, chute, bola, analógico); os bots, o treino, a previsão e o online usam as mesmas funções.
* `server/partida/fisica.js` (a partida autoritativa) e `server/partida/sala.js` (as salas hospedadas) — sobre o núcleo.
* Testes: `tests/v85_fisica_test.mjs` (o núcleo e as metas), `tests/v85_sincronia_test.py` (o mesmo lance no aparelho e
  no servidor), `tests/v85_online_test.py` (o jogo de verdade numa sala hospedada: o analógico e os botões chegando ao
  servidor com a velocidade da FR-85) e os testes de sempre ajustados à FR-85 (cada ajuste explicado no
  `RELATORIO_DE_TESTES`).

## 7. Medidas do modelo (calibração, mesmo integrador de 60 Hz)

| medida | FR-85 |
|---|---|
| atravessar a quadra 1v1 / 2v2 / 3v3 / 4v4 (s) | 4,03 / 4,95 / 6,03 / 7,10 |
| inverter a direção na corrida (s) | 0,133 |
| parar ao soltar (s · u percorridos) | 0,05 · 0,19 |
| passe parado: distância (u) · tempo até parar (s) | 36,0 · 7,97 |
| chute parado: distância (u) · tempo (s) | 55,1 · 8,55 |
| passe em fração da quadra 1v1 / 2v2 / 3v3 / 4v4 | 0,69 / 0,56 / 0,46 / 0,39 |
| chute em fração da quadra 1v1 / 2v2 / 3v3 / 4v4 | 1,06 / 0,86 / 0,71 / 0,60 |
| condução 3 s: distância média borda a borda (u) · velocidade média da bola (u/s) | −0,01 · 12,46 |
| razão passe/corrida · chute/corrida · raio bola/tampinha · boca 1v1/diâmetro | 2,04 · 3,12 · 0,64 · 3,46 |

A comparação com a versão anterior (antes/depois) está no RELATORIO_DE_TESTES da auditoria. Essas medidas não provam
equilíbrio nem sensação em celular: isso depende de jogar no aparelho.

## 8. Como mudar um número

Mude no núcleo, rode `python3 tools/aplicar_rua.py` e atualize o sha256 do núcleo no build (a trava é de propósito: mudar
a física sem querer quebra o build). Depois rode `node tests/v85_fisica_test.mjs` e a bateria (`bash tests/roda_tudo.sh`).
