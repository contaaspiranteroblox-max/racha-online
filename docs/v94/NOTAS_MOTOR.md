# RACHA v94 · o motor próprio — notas de implementação

Entrega: `server/partida/motor.js` (um arquivo, UMD, sem dependências, ~940 linhas). Os comentários do código apontam a
seção da especificação (`§n`) de cada regra.

Resultado: `node tests/v94_motor_test.js` → **79 ok, 0 falharam**. Todas as metas da §16 fecham com o PADRAO intacto
(medidas no fim). Nenhum número do PADRAO foi mudado.

## Interpretações (onde a especificação deixou espaço)

### O passo (a ordem)
1. A cada passo: (a) a lembrança de "bola parada" (§9); (b) a máquina de comandos e os chutes de cada jogador, na ordem
   do vetor `W.jog`; (c) a aceleração das tampinhas (§4); (d) o freio e o teto da bola (§5); (e) os subpassos (§6).
   O chute vem antes do freio do mesmo passo: o `v` do evento `chute` é a velocidade logo depois do chute, e a medida
   "depois de 1 passo" já tem um freio (7,6 m/s → 7,53 m/s = 9,41 d/s).
2. Dois jogadores que chutam no mesmo passo: vale a ordem do vetor (o segundo chuta a bola que o primeiro já mudou).

### O campo e os corpos
3. **A área da tampinha é um muro para o corpo inteiro**: o centro fica a rJ da borda (o adaptador assume isso ao pôr os
   jogadores "num canto"). A bola também bate nela (a rede de segurança, com o material da parede).
4. **O vão atrás do gol.** Com os padrões, margemFundo − fundoGol = 2,4 − 1,55 = 0,85 d, e a tampinha tem 1 d: ela não cabe
   atrás do gol. O cenário da frenagem põe a tampinha em (−15 d, 0) num 2 VS 2, fora da área e atrás do gol. A área a traz
   para dentro, a rede do fundo a empurra para fora, e ela ficava presa (a medida dava v0 = 0, t_parar = 0). Regra
   adotada: **a área é o limite duro; uma tampinha que a área devolveu para dentro de uma rede (no meio do segmento, não na
   ponta) passa para o lado da rede onde cabe** (`desencrava`). Ela só age onde a tampinha não cabe, e na prática só por
   teleporte: 240 mil passos de jogo com bots aleatórios (1 a 4 VS 4) dão o mesmo resultado com a regra ligada e
   desligada. Se margemFundo − fundoGol ≥ 1 d, a tampinha cabe atrás do gol e a regra nunca age.
5. **A boca do gol** fica limitada a W − 2 d (com os padrões isso nunca corta nada).
6. **As marcas** vêm sem trigonometria. A meia-lua é `{x, y, r, corteX, y0, y1}`: o círculo, a reta da área grande que o
   corta e os dois pontos onde ela corta (o desenho calcula os ângulos). `campo()` também não usa pow nem trigonometria,
   porque cada aparelho o calcula a partir do R recebido.
7. **Obstáculos**: `e` é a espessura toda (o raio da cápsula é e/2). Vale o quique do obstáculo, na bola e na tampinha (com
   o limiarQuique), e a retenção tangente é 1, porque a especificação só dá o quique. Os padrões são quique 0,5 e afeta
   'ambos'. O índice do evento é a posição na lista recebida.
8. **Cinemática**: não sofre muro, área, barreira, pesoBola nem a regra da bola presa. Se a bola ficar presa entre uma
   cinemática e uma parede, ela fica sobreposta à cinemática até o subpasso seguinte (ninguém pode sair).

### As batidas (§6)
9. **A retenção tangente só vale na batida** (vn < 0). Encostado sem entrar, nada muda.
10. **A trave antes da linha** (passo 4). A ponta da linha de fundo fica no centro da trave. Numa batida funda na trave
    (penetração > raio da trave), a linha resolveria primeiro e o quique sairia com o material da parede.
11. **Várias tampinhas na bola no mesmo subpasso**: cada uma é resolvida contra a bola de antes. Os empurrões (posição e
    velocidade) se somam, e a velocidade somada não passa da maior que uma delas daria sozinha. Com uma tampinha só, é
    exatamente a regra da §6. Na disputa, os dois empurrões se anulam, a bola não sai do lugar (0,000 d) e a regra da
    bola presa trava os dois. Resolvendo uma tampinha depois da outra, quem viesse por último no vetor ganharia sempre.
12. **A bola presa** ignora penetrações de até 1e-9 m (o arredondamento). Sem essa folga, a tampinha perderia a velocidade
    em todo encosto e a condução não funcionaria.
13. **O toque** é conferido no passo 3 de cada subpasso, com a distância depois de andar e antes do empurrão.
14. **Os eventos de batida** (`parede`, `trave`, `rede`, `obstaculo`) só saem quando a bola entra na superfície (v > 0).
    O evento entra na lista na primeira batida do passo e fica com a maior velocidade.

### O chute e a máquina de comandos (§7 e §9)
15. **Antes do primeiro comando** a tampinha fica parada e a máquina espera. O primeiro comando processado pelo `passo` é
    a base. `reiniciaComandos` apaga a máquina **e o comando guardado**; sem isso, o comando da conexão antiga viraria a
    base e um botão que ela deixou apertado contaria como toque.
16. **Contadores**: se o contador baixa sem `reiniciaComandos`, ele vira a base nova (nenhum toque). Sem contador
    (np/nc ausentes), vale a passagem de solto para apertado. `ordem` ausente conta como 0 (o CHUTE vai primeiro).
17. **Segurando**: a cada passo, o estado do botão no comando diz se a intenção está segura. Solta, ela vale enquanto
    passo − criado ≤ janelaToque. Quem segura muito tempo e solta perde a intenção na hora (a janela conta da criação).
18. **A ordem das intenções**: tenta a da vez e, se ela não pode sair, a outra (no máximo um chute). Na leitura estrita,
    só a da vez seria tentada. As duas leituras só divergem num caso raro: um CHUTE de combinação, isento do intervalo,
    atrás de um PASSE que o intervalo segura.
19. **A combinação**: o CHUTE precisa ter sido criado no passo do último PASSE que saiu ou depois dele, e esse PASSE
    precisa ser o último chute do jogador. Qualquer outro chute desfaz o vínculo, e não há duas combinações seguidas.
    "Chega depois da janela" é conferido a cada passo. Um CHUTE desse tipo é anulado (`janela`) no primeiro passo depois
    da janela que cair dentro da proteção. Dentro da janela, mas com a bola fora do alcance, ele espera. Passada a
    proteção, é um CHUTE comum (com o intervalo).
20. **"Parada" no PASSE**: vale a velocidade da bola no começo do passo, antes dos chutes. `poeBola` e `saida` esquecem
    o histórico (o teleporte não conta como "estava parada").

### A CURVA (§8)
21. **O chute armado vai antes das intenções de PASSE e CHUTE**; quando sai, as consome. Ele fica armado por
    round(armadoTempo/DT) = 21 passos, contando o da soltura. Se expira, sai `{t:'anulado', b:'curva', motivo:'expirou'}`.
    Apertar CURVA de novo, com um chute armado, começa outra carga e descarta o armado (sem evento).
22. **O giro sem trigonometria**: a cada subpasso, a velocidade gira k·h pela rotação racional (cos, sen) =
    ((1 − t²), 2t)/(1 + t²), com t = k·h/2. Para giros pequenos isso é v + k·h·(−vy, vx), a fórmula da especificação, e a
    rapidez fica igual (quem a reduz é o freio). O efeito dura round(T/DT) passos a partir do chute. O teste de 20°
    compara a velocidade antes e depois das batidas de cada subpasso (cos 20° fica escrito como número). Um chute novo
    apaga o efeito anterior.

### A saída, o mundo e o pacote
23. **A barreira do time da saída**: fora do próprio campo e fora do círculo, a tampinha volta para o mais perto dos dois:
    a reta x = 0 ou a borda do círculo. Para "dentro do círculo" conta o centro da tampinha.
24. **`saida()`** zera as velocidades, as intenções, a carga e o armado da CURVA, o efeito na bola e o vínculo da
    combinação. Guarda a base dos contadores e o último chute (o intervalo).
25. **`mundo()`** já põe as tampinhas na formação da saída do time 0, mas com estado 'jogo'.
26. **O pacote** leva tudo o que o `passo` muda e o comando guardado. Não leva o que é da montagem do mundo: o campo, o
    perfil, os obstáculos, os times e quem é cinemático (um aparelho pode ter a sua própria escolha de cinemáticos para a
    previsão). `desempacota` confere o tamanho e recusa um pacote de outro mundo.
27. **O gol** é conferido do centro de antes do subpasso até o centro depois de todas as batidas. Sai um evento só, até a
    próxima `saida()`.

### As ajudas dos bots
28. `bolaDistancia`, `bolaTempo` e `bolaPrevisao` repetem o freio do `passo`, passo a passo. O que dizem é o que o motor
    faz (a distância até parar confere com o motor no arredondamento, ~1e-15 m, a 2, 6 e 10 m/s). `bolaTempo` interpola dentro do passo. `bolaVelocidadePara` faz a
    conta de trás para a frente a partir da chegada e não aplica o teto, então pode devolver mais que vMaxBola se o
    pedido for impossível. Um vFinal ≤ vParou vale como "chegar parando". Só usam + − × ÷ e comparações, então podem
    rodar no aparelho.

## As metas (§16) — medidas com `node tests/v94/cenarios.js novo`

| cenário | meta | medida |
|---|---|---|
| arrancada | vmax 3,6–3,8 d/s; t90 0,04–0,07 s; t99 ≤ 0,08 s | 3,688 d/s; 0,067 s; 0,067 s |
| frenagem | 0,03–0,08 s; ≤ 0,12 d | 0,050 s; 0,060 d |
| inversão | zero ≤ 0,05 s; 90% ≤ 0,10 s | 0,050 s; 0,100 s |
| virada de 90° | ≤ 0,10 s | 0,083 s |
| analógico | diagonal = reta; meia = toda; 0,02 parado | 1,000; 1,000; 0 |
| passe parado | 5,8–6,2 d/s; fator 0,50–0,60/s; para antes de 8 s | 5,942 d/s; 0,555; 5,4 s |
| chute parado | 9,3–9,7 d/s; fator 0,50–0,60/s | 9,410 d/s; 0,562 |
| chute correndo | 10,5–11,5 d/s | 10,9 d/s |
| bola vindo / indo a 3 d/s | ≈ chute parado / ≈ chute + 0,9 d/s | 9,41 / 10,3 d/s |
| alcance | folga 0,13–0,15 d | 0,135 d |
| direção | 30° → 30°; 60° → 60° | 30,0°; 60,0° |
| rebote na linha 90° e 45° | e 0,55–0,65; tangente 0,85–0,95; a 3 d/s quica | e 0,594; tangente 0,891; a 3 d/s e 0,594 |
| trave | e 0,50–0,60 | 0,545 |
| condução | ≥ 2 toques em 1,5 s; vão mediano ≤ 0,1 d, máx ≤ 0,3 d; bola ÷ tampinha 0,9–1,3 | 9 toques; 0,009 d; 0,014 d; 0,948 |
| disputa | a bola quase não sai do lugar | 0,000 d |
| combinação, bola parada | k0 só CHUTE; k1 combinado (~13 d/s); k2, k3, k5 só o PASSE | chute@0; passe@0 chute@1 (12,76 d/s); passe@0 nos três |
| combinação, bola vindo a 3 d/s | k1 combinado; k2–3 se a bola ainda estiver no alcance | k1 combinado; em k2–3 a bola já saiu do alcance (vão 0,17 m > 0,11 m): só o PASSE |
| segurando o CHUTE | 1 chute ao entrar no alcance | 1 chute (0,883 s) |
| toque antecipado | 0–100 ms chuta; 150 e 200 ms não | sim até 100 ms; não em 150 e 200 ms |
| intervalo | o menor 0,10 s; ≤ 10 por segundo | 0,100 s; 10 |
| desempenho | 4 VS 4, 1000 passos < 100 ms | 30–40 ms dentro do teste (a maior parte é o JIT a frio); ~3 ms aquecido |
| determinismo | o mesmo estado bit a bit; empacota/desempacota e copia voltam ao mesmo passo | ok |

### Observações sobre as metas (todas fecham, algumas sem folga)
- **Inversão, t_zero e t90 caem exatamente no limite** (3 e 6 passos = 0,050 s e 0,100 s). É a conta da própria
  especificação: com aVira = 75 até cruzar o zero e aAcel = 52 depois, a velocidade é
  2,95 → 1,70 → 0,45 → −0,80 → −1,67 → −2,53 → −2,95 m/s. O 90% (−2,655) só chega no 6º passo. Passa, mas qualquer
  mudança nesses parâmetros tira a folga.
- **Arrancada t90 = 0,067 s**, perto do teto de 0,07 s: 52 m/s² dá +0,867 m/s por passo, e 2,6 m/s no 3º passo ainda é
  menos que 90% de 2,95.
- **Condução, bola ÷ tampinha**: o ciclo dura 12–13 passos. A bola descola ~1 cm (0,014 d) e a razão oscila entre 0,948
  e 1,073. A medida final pegou o fundo do ciclo (0,948).
- **Desempenho**: o tempo medido é quase todo o JIT reotimizando o código na primeira rodada de 4 VS 4 (as rodadas
  seguintes custam ~3 ms). Os laços quentes não criam objetos nem usam `for…of`, para que a fase a frio pese menos.
