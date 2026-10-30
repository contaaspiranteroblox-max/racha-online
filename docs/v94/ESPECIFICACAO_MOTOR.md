# RACHA v94 · O MOTOR PRÓPRIO DA PARTIDA — especificação

Esta é a especificação do núcleo novo da jogabilidade do RACHA (a física, os comandos e as regras da bola). Ela é a única
fonte para quem implementa o núcleo: nada aqui foi copiado de outro jogo, e quem implementa **não deve** olhar o código de
física atual do RACHA nem nenhum material do jogo de referência (ver "Separação" no fim).

**Origem das decisões.** Cada número tem uma de duas origens:
- **[obs]** veio de uma observação dos vídeos (`docs/v94/OBSERVACOES_VIDEOS.md`, com o código da observação, ex. O3), e o
  valor escolhido fica dentro da faixa observada;
- **[dec]** é uma decisão de projeto (o que os vídeos não mostram), com o motivo ao lado.
Os valores de referência de outros jogos não são alvo. Os parâmetros são todos ajustáveis (o painel AJUSTES › TESTES).

---------------------------------------------------------------------------------------------------------------------

## 1. Unidades, tempo e coordenadas

- Metro (m), segundo (s). **d = o diâmetro da tampinha = 0,80 m** (a régua das medidas e das metas).
- Passo fixo: **DT = 1/60 s** [dec: o padrão do jogo, do servidor e dos comandos — um comando por passo].
- Coordenadas: a origem no **centro do campo**; x para a direita, y **para baixo** (como a tela). O time 0 ataca para a
  direita (+x), o time 1 para a esquerda.
- Tamanho do time: n = 1, 2, 3 ou 4 (1 VS 1 … 4 VS 4).

## 2. O campo (uma regra própria, não uma tabela)

Entradas: n e os parâmetros abaixo. Saídas em metros. A **área da bola** é o retângulo entre as linhas (as linhas são
paredes da bola, com a boca dos gols aberta); a **área da tampinha** é maior (a tampinha pode sair um pouco das linhas).

| parâmetro | padrão | unidade | origem |
|---|---|---|---|
| `areaPorJogador` | 62 | d² | [dec] o espaço de cada jogador; o mesmo em todos os tamanhos (o ritmo não muda com n) |
| `proporcao1` | 1,46 | — | [dec] comprimento ÷ largura no 1 VS 1 |
| `proporcaoPasso` | 0,07 | — | [dec] o campo fica mais "quadrado" a cada jogador a mais |
| `margemLado` | 1,35 | d | [obs O10 ≈ 1,3 d] da linha lateral até o limite da tampinha |
| `margemFundo` | 2,4 | d | [obs O10 ≈ 2,7 d] da linha de fundo até o limite da tampinha (o gol fica dentro disso) |
| `bocaBase`, `bocaFator` | 0,4 d · 0,30 | d · — | [dec] a boca do gol = 0,4 d + 0,30 × a largura |
| `fundoGol` | 1,55 | d | [dec] a profundidade do gol |
| `raioTrave` | 0,07 | d | [dec] a trave é um círculo |
| `circuloBase`, `circuloFator` | 0,8 d · 0,12 | d · — | [dec] o raio do círculo central (a barreira da saída) |

Conta (A = `areaPorJogador` · 2n · d², a = `proporcao1` − `proporcaoPasso` · (n − 1)):
- comprimento **L = √(A·a)**, largura **W = A / L**;
- linhas: x de −L/2 a +L/2, y de −W/2 a +W/2;
- área da tampinha: x de −L/2 − `margemFundo`·d a +L/2 + `margemFundo`·d; y de −W/2 − `margemLado`·d a +W/2 + `margemLado`·d;
- boca B = `bocaBase`·d + `bocaFator`·W (y de −B/2 a +B/2); profundidade F = `fundoGol`·d;
- traves: (±L/2, ±B/2), raio `raioTrave`·d;
- redes (segmentos; valem para a bola **e** para a tampinha): em cada gol, os dois lados (da linha até a profundidade) e o
  fundo. Gol da direita: (L/2, −B/2)→(L/2+F, −B/2), (L/2, B/2)→(L/2+F, B/2), (L/2+F, −B/2)→(L/2+F, B/2); o da esquerda espelhado;
- paredes da bola: as duas linhas laterais inteiras e as de fundo em dois pedaços (fora da boca);
- círculo central: raio Rc = `circuloBase`·d + `circuloFator`·W;
- **marcas** (só desenho; o motor devolve para o jogo desenhar): área grande (largura B + 0,5·W, limitada a W − 1 d;
  profundidade 0,21·L), área pequena (largura B + 1,6 d; profundidade 0,085·L), marca do pênalti a 0,165·L da linha de fundo,
  meia-lua de raio 0,11·L centrada na marca (só a parte fora da área grande), marca central.

Com os padrões: 1 VS 1 ≈ 13,45 × 9,22 d; 2 VS 2 ≈ 18,57 × 13,36 d; 3 VS 3 ≈ 22,16 × 16,79 d; 4 VS 4 ≈ 24,90 × 19,92 d.

## 3. Os corpos

- Tampinha: círculo de raio **rJ = 0,40 m** (d/2). [dec: a régua]
- Bola: círculo de raio **rB = 0,20 m** [obs O1: o diâmetro da bola é 0,47–0,50 do da tampinha → 0,50].
- A bola **não tem giro** (sem velocidade angular). O efeito existe só no chute de CURVA (seção 8).
- Uma tampinha pode ser **cinemática** (`cinematico: true`): o motor a move pela velocidade que alguém de fora pôs nela, ela
  empurra a bola e as outras tampinhas, mas não é empurrada nem usa comandos. Serve para a previsão do online (os outros
  jogadores) e para os bonecos do treino.
- Obstáculos fixos do treino (`obstaculos`): segmentos com espessura (cápsulas) e círculos, cada um com o quique e a quem
  afeta (`'bola'`, `'jog'` ou `'ambos'`).

## 4. O movimento da tampinha

O comando traz a direção do analógico (mx, my), cada um de −1 a 1.
- Amplitude a = √(mx² + my²). Se a < `zonaMorta` (0,05) → alvo = (0, 0). Senão alvo = (mx/a, my/a) · `vMax`.
  **A inclinação não muda a velocidade** [dec: previsível; a zona morta de verdade é a do HUD, esta só corta ruído].
- A velocidade vai até o alvo com aceleração limitada: dv = alvo − v; a aceleração usada é
  `aPara` se o alvo é zero, `aVira` se v · alvo < 0 (inversão), senão `aAcel`. Se |dv| ≤ acel·DT, v = alvo; senão
  v += dv/|dv| · acel·DT.
- Depois das batidas a velocidade pode passar de `vMax` por um instante (um empurrão); a regra acima a traz de volta.
- Cada jogador pode ter `fatorVel` (padrão 1, faixa 0,5–1,5) que multiplica o `vMax` dele (os níveis dos bots); as
  acelerações não mudam. Fica no mundo (`W.jog[j].fatorVel`) e entra na cópia e no empacotamento.

| parâmetro | padrão | unidade | origem |
|---|---|---|---|
| `vMax` | 2,95 | m/s (= 3,69 d/s) | [obs O3: 3,5–3,9 d/s] |
| `aAcel` | 52 | m/s² | [obs O4: quase instantâneo, ≤ 67 ms] de 0 a `vMax` em ~0,057 s (3–4 passos): rápido, mas não num passo só |
| `aPara` | 60 | m/s² | [obs O4] para em ~0,05 s |
| `aVira` | 75 | m/s² | [obs O5: a inversão mais rápida em ~67 ms] de +`vMax` a −`vMax` em ~0,08 s |
| `zonaMorta` | 0,05 | — | [dec] |

## 5. A bola rolando

A cada passo, antes dos subpassos, com s = |v| da bola:
1. **o freio**: s' = s · fRol − `atritoRolamento` · DT, com fRol = 2^(−DT / `meiaVida`) (calculado uma vez no `resolve`).
   Se s' ≤ `vParou`, a bola para (v = 0); senão v = v · s'/s.
2. **o teto**: se s' > `vMaxBola`, v = v · `vMaxBola`/s'.
3. o efeito da CURVA, se houver (seção 8).

| parâmetro | padrão | unidade | origem |
|---|---|---|---|
| `meiaVida` | 1,25 | s | [obs O7: perde ~45% por segundo] o freio proporcional |
| `atritoRolamento` | 0,12 | m/s² | [dec] um freio constante pequeno: a bola **para** de verdade (não fica se arrastando) |
| `vParou` | 0,03 | m/s | [dec] |
| `vMaxBola` | 10,4 | m/s (= 13 d/s) | [dec] acima do chute mais forte observado (O6: ~10 d/s); só a combinação chega nele |

Com os padrões, a bola a 4 m/s fica com ~0,55 da velocidade depois de 1 s (O7).

## 6. Os subpassos e as batidas

**Subpassos.** n = ⌈maior deslocamento do passo ÷ (0,35 · rB)⌉, entre 2 e 16 (o maior deslocamento: a maior |v|·DT entre a
bola, as tampinhas e a velocidade da bola relativa a cada tampinha). Em cada subpasso, com h = DT/n: todos andam (x += v·h)
e as batidas são resolvidas nesta ordem:
1. tampinha × tampinha;
2. tampinha × área da tampinha, redes, traves, obstáculos e a barreira da saída (seção 10);
3. tampinha × bola;
4. bola × paredes (linhas), traves, redes, a área da tampinha (a rede de segurança) e obstáculos;
5. **a bola presa**: se depois disso a bola ainda estiver dentro de alguma tampinha (presa entre duas tampinhas ou entre a
   tampinha e uma parede), quem sai é a tampinha: ela volta até encostar e perde a velocidade que tinha na direção da bola
   (assim ninguém atravessa a bola, e dois empurrando de frente ficam travados);
6. o gol (seção 11).

**Batida num corpo parado** (bola ou tampinha contra parede, trave, rede, obstáculo): n = a normal da superfície para o
corpo; o corpo sai da penetração pela normal; vn = v · n; se vn < 0: o quique e = 0 se −vn < `limiarQuique`, senão o do
material; v += −(1 + e) · vn · n; depois a parte tangente é multiplicada pela **retenção tangente** kt do material
(v = (v·n)·n + kt · (v − (v·n)·n)). [dec: a retenção é uma perda proporcional simples, sem atrito de Coulomb nem giro]

| material | quique e | retenção kt | origem |
|---|---|---|---|
| bola × linhas (`quiqueParede`, `retParede`) | 0,60 | 0,90 | [dec] os vídeos não deram rebote limpo |
| bola × trave (`quiqueTrave`, `retTrave`) | 0,55 | 0,85 | [dec] |
| bola × rede (`quiqueRede`, `retRede`) | 0,12 | 0,55 | [dec] a rede segura a bola |
| tampinha × área, redes, traves | 0 | 1 | [dec] a tampinha não quica na parede: escorrega (mais controle) |
| `limiarQuique` | 0,40 m/s | | [dec] batida lenta não quica (a bola não treme encostada) |

**Tampinha × tampinha** (as duas comuns): massas iguais; cada uma sai metade da penetração; vn = (vb − va) · n (n de a para
b); se vn < 0: j = −(1 + `quiqueJog`) · vn / 2; va −= j·n; vb += j·n. Com uma cinemática, a outra sai toda e leva o impulso
inteiro (como numa parede que anda). `quiqueJog` = 0,25 [dec].

**Tampinha × bola** — a tampinha manda: a bola nunca empurra a tampinha [dec: a tampinha é muito mais pesada que a bola].
Com n da tampinha para a bola: a bola sai toda da penetração; vr = (vB − vJ) · n; se vr < 0:
vB = vJ + (vr' · n) + `retConducao` · (parte tangente de vB − vJ), com vr' = max(−`quiqueConducao` · vr, `impulsoConducao`).
E a tampinha sente um pouco a bola: o componente da velocidade dela na direção da bola perde `pesoBola` × |vr| (só se a
tampinha não for cinemática).

| parâmetro | padrão | origem |
|---|---|---|
| `quiqueConducao` | 0,10 | [dec] a bola que chega morre no pé (o domínio): volta com 10% da velocidade |
| `impulsoConducao` | 0,20 m/s | [dec] empurrando, a bola sai pelo menos isso mais rápida que a tampinha: a condução tem toques curtos (a bola descola uns centímetros e a tampinha alcança), em vez de "grudar" |
| `retConducao` | 0,80 | [dec] |
| `pesoBola` | 0,08 | [dec] |

## 7. O chute (PASSE e CHUTE)

- **Alcance**: a distância entre os centros ≤ rJ + rB + `folgaChute` (`folgaChute` = 0,11 m [dec; o anel desenhado é maior,
  O2, mas o anel é desenho]).
- **Direção**: u = do centro da tampinha para o centro da bola [dec: a regra do gênero; previsível — quem quer mirar
  posiciona a tampinha]. Se os centros coincidirem, u = (1, 0) para o time 0 e (−1, 0) para o time 1.
- **A velocidade nova da bola**, com vL = vbola · u e vP = vbola − vL · u (a velocidade de antes), vJ = a da tampinha:
  - ao longo de u: max(0, vL) · h + vBotão + `herancaCorrida` · max(0, vJ · u);
  - de lado: vP · `herancaLado`;
  - depois o teto `vMaxBola`. A bola sai da penetração (fica encostada, sem sobrepor).
- h = `heranca` no chute comum e `herancaCombo` quando o CHUTE completa a combinação (seção 9).

| parâmetro | padrão | unidade | origem |
|---|---|---|---|
| `vPasse` | 4,8 | m/s (= 6 d/s) | [obs O6: um provável passe a ~6,1 d/s, confiança baixa] |
| `vChute` | 7,6 | m/s (= 9,5 d/s) | [obs O6: chute forte 9,4–10,2 d/s] |
| `heranca` | 0,30 | — | [dec] a bola que já vinha a favor ajuda um pouco |
| `herancaLado` | 0,30 | — | [dec] o chute "limpa" a direção |
| `herancaCorrida` | 0,40 | — | [dec] chutar correndo sai mais forte |
| `herancaCombo` | 0,60 | — | [dec] o PASSE logo antes do CHUTE vale mais (a combinação compensa, mas sem passar do teto) |
| `folgaChute` | 0,11 | m | [dec] |

## 8. A CURVA (só no modo `curva`)

O botão CURVA: segurando, a carga c sobe de 0 a 1 em `cargaTempo` (1,2 s); ao soltar, o chute fica **armado** por
`armadoTempo` (0,35 s) com c = max(carga, DT/`cargaTempo`). Armado e com a bola no alcance: chuta pela mesma conta do
chute (seção 7) com vBotão = `vCurva0` + `vCurva1` · c, e marca o efeito na bola:
- o lado: com m = (mx, my) do comando e u a direção do chute, x = (ux·my − uy·mx)/|m|; se |m| > 0,1 e |x| > 0,26, o lado é
  o sinal de x; senão o lado que leva a bola para o meio do campo (o sinal de −y_bola · ux; 1 se der 0);
- o efeito: a aceleração de lado = k · s (s = |v| da bola, k = lado · (`curvaK0` + `curvaK1` · c), em 1/s), perpendicular
  à velocidade, por T = `curvaT0` + `curvaT1` · c segundos, aplicada em cada subpasso **sem trigonometria** (a perpendicular
  de (vx, vy) é (−vy, vx));
- o efeito acaba antes se a bola bater em alguma coisa (a direção da bola muda mais de 20° entre um subpasso e o seguinte
  por batida) ou se s < 1 m/s.

| parâmetro | padrão | origem |
|---|---|---|
| `cargaTempo`, `armadoTempo` | 1,2 s · 0,35 s | [dec] |
| `vCurva0`, `vCurva1` | 5,6 · 2,0 m/s | [dec] |
| `curvaK0`, `curvaK1` | 0,25 · 0,95 1/s | [dec] |
| `curvaT0`, `curvaT1` | 0,45 · 0,45 s | [dec] |

O chute de CURVA respeita o intervalo mínimo e consome as intenções de PASSE/CHUTE pendentes.

## 9. A máquina de comandos (a mesma no treino, na partida local, no servidor e na previsão)

**O comando** (um por passo, por jogador): `{mx, my, passe, chute, curva, np, nc, ordem}` —
`passe`/`chute`/`curva` = 1 enquanto o botão está apertado; `np`/`nc` = quantas vezes o PASSE/o CHUTE já foi apertado
(contadores que só sobem: um toque rápido entre dois comandos não se perde); `ordem` (opcional) = o instante do CHUTE menos
o do PASSE, em ms, quando os dois foram apertados no mesmo comando (o relógio do toque do aparelho).

**A intenção.** Cada toque novo (o contador subiu; sem contador, a passagem de solto para apertado) cria uma intenção
`{criado: passo, segura}` daquele botão (substitui a anterior do mesmo botão). No primeiro comando de um jogador os
contadores só viram a base (com o botão apertado, conta como toque).
- Enquanto o botão está apertado, a intenção espera a bola o tempo que for (**segurar** = chutar quando a bola chegar).
- Solto, ela vale até `janelaToque` passos depois do passo em que foi criada, inclusive (o **toque antecipado**: apertar
  um pouco antes de a bola chegar ainda vale). Depois some (evento `anulado`, motivo `expirou`).
- Cada intenção dá **um** chute. Segurar depois do chute não chuta de novo (precisa de um toque novo).

**A cada passo**, antes de tudo andar, para cada jogador (no máximo um chute por jogador por passo):
1. A ordem: com as duas pendentes, vai primeiro a criada antes; criadas no mesmo passo, o **CHUTE** vai primeiro, a menos
   que `ordem` diga que o PASSE veio pelo menos 2 ms antes.
2. A intenção da vez só sai com a bola no alcance; e só se já passaram `intervaloMin` passos do último chute daquele
   jogador — **menos** a combinação (abaixo).
3. **A combinação PASSE → CHUTE.** Um CHUTE criado no passo do PASSE que saiu ou depois dele, e que sai de 1 até
   `janela` passos depois desse PASSE, é a combinação: o chute usa `herancaCombo`. A janela depende de como a bola estava
   no PASSE: **parada** (|v| ≤ `vParada` naquele passo ou em algum dos `paradaPassos` passos antes) → `janelaParada`;
   **andando** → `janelaMovel`. Um CHUTE desse tipo que chega **depois** da janela e até `protecao` passos depois do PASSE
   é **anulado** (motivo `janela`): com a bola parada, a combinação fica difícil (só no passo seguinte) sem atraso
   artificial [dec: o DB parado muito difícil — o pedido da v92 do RACHA].
4. Um chute **consome** a outra intenção (motivo `consumido`), menos o CHUTE que ainda pode completar a combinação com o
   PASSE que acabou de sair.

| parâmetro | padrão | unidade | origem |
|---|---|---|---|
| `janelaToque` | 6 | passos (0,1 s) | [dec] |
| `intervaloMin` | 6 | passos (0,1 s) | [dec] |
| `janelaParada` | 1 | passos | [dec] |
| `janelaMovel` | 3 | passos | [dec] |
| `protecaoParada` | 4 | passos | [dec] |
| `protecaoMovel` | 0 | passos | [dec] (0 = só a física decide) |
| `vParada` | 0,30 | m/s | [dec] |
| `paradaPassos` | 6 | passos | [dec] a bola que estava parada e a tampinha empurrou chegando ainda conta como parada |

## 10. A saída de bola

`saida(mundo, time)`: a bola no centro e parada, as intenções e a curva zeradas, o estado `'saida'`, e as tampinhas na
formação (time t, lado s = −1 para o time 0 e +1 para o time 1; i = a ordem dentro do time):
- i = 0 do time que dá a saída: x = s · (rJ + rB + 0,9·d), y = 0; i = 0 do outro time: x = s · (Rc + 1,0·d), y = 0;
- i ≥ 1: x = s · (3,0 + 2,2·i)·d, y = (i ímpar ? +1 : −1) · (1,6 + 1,4·⌈i/2⌉)·d; tudo dentro da área da tampinha.

**A barreira** (enquanto o estado é `'saida'`, no passo 2 das batidas): cada tampinha fica no seu campo (x·s ≥ 0; se
passar, x = 0 e a velocidade que leva para o outro lado zera); as do time que **não** dá a saída também ficam fora do
círculo central (distância ao centro ≥ Rc + rJ); as do time que dá a saída podem entrar no círculo, inclusive no outro campo
(dentro do círculo).

A saída acaba (estado `'jogo'`, evento `saida`) quando uma tampinha do time da saída toca ou chuta a bola.

## 11. O gol

A bola marca quando o **centro** dela cruza a reta x = −L/2 − rB (gol da esquerda, lado −1) ou x = +L/2 + rB (gol da
direita, lado +1) — a bola inteira do lado de dentro — com o y do cruzamento entre −B/2 e +B/2. O cruzamento é conferido
em cada subpasso (do centro de antes para o de agora). Evento `gol` uma vez; o motor continua simulando até alguém chamar
`saida()`.

## 12. Os eventos (o que `passo()` devolve, na ordem em que acontecem)

- `{t: 'chute', j, b: 'passe'|'chute'|'curva', comb: bool, v}` — v = a velocidade da bola logo depois (m/s);
- `{t: 'anulado', j, b, motivo: 'expirou'|'janela'|'consumido'}`;
- `{t: 'toque', j}` — a tampinha j encostou na bola neste passo (uma vez por jogador por passo; encostar = a distância
  entre os centros ≤ rJ + rB + 0,02 m em algum subpasso, ou ter chutado);
- `{t: 'parede'|'trave'|'rede', v}` — a bola bateu (v = a velocidade normal da batida, m/s; um por material por passo, a
  maior);
- `{t: 'obstaculo', i, v}` — a bola bateu no obstáculo i do treino (o índice na lista de `obstaculos`; um por obstáculo
  por passo, o maior);
- `{t: 'gol', lado}`;
- `{t: 'saida'}` — a saída foi dada.

## 13. Determinismo e rede

- Funções puras sobre objetos simples. Nada de `Math.random`, `Date` ou relógio. No `passo()` só + − × ÷, `Math.sqrt`,
  comparações e `Math.min/max/abs/floor/ceil/round` — **nada de trigonometria, `exp`, `pow` ou `hypot`** (variam entre o
  V8 do servidor e o JavaScriptCore do iPhone). `pow`/`exp` só no `resolve()`.
- `resolve(perfil)` devolve todas as constantes por passo num objeto JSON. **O servidor manda o resolvido para os
  aparelhos**, que usam os mesmos números (não recalculam).
- O mundo é JSON puro (sem funções, `Map` ou classes): `copia()` é uma cópia profunda; `empacota()` devolve um vetor de
  números com tudo o que muda (tick, estado, a bola com a curva, cada tampinha com a velocidade, o comando guardado e a
  máquina de comandos) e `desempacota()` volta exatamente ao mesmo estado (o `passo` seguinte dá o mesmo resultado).
- Dois mundos iguais com os mesmos comandos dão o **mesmo** resultado, bit a bit.

## 14. A API

```js
const M = require('server/partida/motor.js');   // no navegador: window.RachaMotor (o mesmo arquivo, UMD)
M.VERSAO                     // '94.0'
M.DT                         // 1/60
M.PADRAO, M.LIMITES          // os parâmetros (seção 15) e as faixas [mín, máx]
M.perfil(p)                  // → todas as chaves do PADRAO; números; cortados nas faixas; inteiros onde são passos
M.resolve(p)                 // → R: o perfil limpo + as constantes por passo (JSON)
M.campo(n, R)                // → G: a geometria da seção 2 (JSON): {n, L, W, linhas, area, boca, fundo, traves, redes,
                             //    paredesBola, circulo, marcas}
M.mundo({n, jogo, jogadores, R})   // jogo: 'futebol' | 'curva'; jogadores: [{time, cinematico?, fatorVel?}] → W (JSON), estado 'jogo'
M.saida(W, time)
M.comando(W, j, cmd)         // o comando do jogador j para o próximo passo (o último guardado vale; sem comando novo,
                             //   o passo usa o último com os contadores iguais — nenhum toque novo)
M.passo(W)                   // → eventos (seção 12)
M.poeJogador(W, j, x, y, vx, vy), M.poeBola(W, x, y, vx, vy)   // teleporte (poeBola zera a curva)
M.reiniciaComandos(W, j)     // esquece a máquina de comandos de j (outra conexão assumiu a tampinha): o próximo comando é a base
M.obstaculos(W, lista)       // [{tipo: 'segmento', x0, y0, x1, y1, e, quique, afeta} | {tipo: 'circulo', x, y, r, quique, afeta}]
M.copia(W), M.empacota(W), M.desempacota(W, arr)
// para os bots e o treino (a bola rolando sozinha, sem batidas):
M.bolaDistancia(R, v0)                 // até parar (m)
M.bolaVelocidadePara(R, dist, vFinal)  // a velocidade de saída para chegar a dist com vFinal
M.bolaTempo(R, v0, dist)               // quanto tempo leva (s); Infinity se não chega
M.bolaPrevisao(R, x, y, vx, vy, passos) // {x, y, vx, vy} depois de n passos
M.alcance(R)                           // a distância máxima entre os centros para chutar (m)
```
`W.jog[j]` = `{time, x, y, vx, vy, cinematico, ...}`; `W.bola` = `{x, y, vx, vy, ...}`; `W.estado` ∈ `'saida'|'jogo'`;
`W.tick`; `W.G` (a geometria). Tudo em metros e m/s.

## 15. Os parâmetros (o PADRAO e as faixas)

| chave | padrão | faixa | unidade |
|---|---|---|---|
| vMax | 2,95 | 1,5–4,5 | m/s |
| aAcel · aPara · aVira | 52 · 60 · 75 | 10–400 cada | m/s² |
| zonaMorta | 0,05 | 0–0,3 | — |
| meiaVida | 1,25 | 0,4–4 | s |
| atritoRolamento | 0,12 | 0–1 | m/s² |
| vParou | 0,03 | 0–0,2 | m/s |
| vMaxBola | 10,4 | 5–16 | m/s |
| quiqueParede · retParede | 0,60 · 0,90 | 0–1 | — |
| quiqueTrave · retTrave | 0,55 · 0,85 | 0–1 | — |
| quiqueRede · retRede | 0,12 · 0,55 | 0–1 | — |
| limiarQuique | 0,40 | 0–2 | m/s |
| quiqueJog | 0,25 | 0–1 | — |
| quiqueConducao · retConducao · pesoBola | 0,10 · 0,80 · 0,08 | 0–0,6 · 0–1 · 0–0,5 | — |
| impulsoConducao | 0,20 | 0–1 | m/s |
| folgaChute | 0,11 | 0–0,4 | m |
| vPasse · vChute | 4,8 · 7,6 | 2–9 · 3–13 | m/s |
| heranca · herancaLado · herancaCorrida · herancaCombo | 0,30 · 0,30 · 0,40 · 0,60 | 0–1 | — |
| janelaToque · intervaloMin | 6 · 6 | 0–15 · 1–20 | passos |
| janelaParada · janelaMovel | 1 · 3 | 0–6 | passos |
| protecaoParada · protecaoMovel | 4 · 0 | 0–12 | passos |
| vParada | 0,30 | 0–2 | m/s |
| paradaPassos | 6 | 0–12 | passos |
| cargaTempo · armadoTempo | 1,2 · 0,35 | 0,3–3 · 0,05–1 | s |
| vCurva0 · vCurva1 | 5,6 · 2,0 | 2–10 · 0–5 | m/s |
| curvaK0 · curvaK1 | 0,25 · 0,95 | 0–2 | 1/s |
| curvaT0 · curvaT1 | 0,45 · 0,45 | 0–2 | s |
| areaPorJogador | 62 | 35–110 | d² |
| proporcao1 · proporcaoPasso | 1,46 · 0,07 | 1–2 · 0–0,2 | — |
| margemLado · margemFundo | 1,35 · 2,4 | 0,5–4 | d |
| bocaBase · bocaFator | 0,4 · 0,30 | 0–3 d · 0,1–0,6 | — |
| fundoGol · raioTrave | 1,55 · 0,07 | 0,8–3 · 0,02–0,3 | d |
| circuloBase · circuloFator | 0,8 · 0,12 | 0–3 d · 0–0,3 | — |

## 16. As metas de aceitação do motor (medidas em d e s pelos cenários de `tests/v94/cenarios.js`)

| cenário | meta |
|---|---|
| arrancada | vmax 3,6–3,8 d/s; t90 0,04–0,07 s; t99 ≤ 0,08 s |
| frenagem | t_parar 0,03–0,08 s; distância ≤ 0,12 d |
| inversão | t_zero ≤ 0,05 s; t90 ≤ 0,10 s |
| virada de 90° | t_direção10 ≤ 0,10 s |
| analógico | diagonal = reta (±1%); meia inclinação = toda; 0,02 → parado |
| passe parado | v0 5,8–6,2 d/s; fator em 1 s 0,50–0,60; para antes de 8 s |
| chute parado | v0 9,3–9,7 d/s; fator em 1 s 0,50–0,60 |
| chute correndo | mais forte que o parado (10,5–11,5 d/s) |
| bola vindo a 3 d/s · indo a 3 d/s | ≈ o chute parado · ≈ chute + 0,3 × 3 d/s |
| alcance | a folga além do contato 0,13–0,15 d |
| direção | a bola a 30° sai a 30°; a 60°, a 60° |
| rebote na linha a 90° e 45° | e 0,55–0,65; tangente 0,85–0,95; a 3 d/s ainda quica |
| trave | e 0,50–0,60 |
| condução (2 s correndo com a bola) | toques curtos: ≥ 2 toques em 1,5 s; vão mediano ≤ 0,1 d e o maior ≤ 0,3 d; bola ÷ tampinha 0,9–1,3 |
| disputa (dois empurrando de frente) | simétrica: a bola quase não sai do lugar |
| combinação com a bola parada | k = 0 só CHUTE · k = 1 PASSE + CHUTE combinado (~13 d/s) · k = 2, 3 só o PASSE · k = 5 só o PASSE |
| combinação com a bola vindo a 3 d/s | k = 1 combinado; k = 2–3 combinado se a bola ainda estiver no alcance |
| segurando o CHUTE chegando na bola | 1 chute, quando entra no alcance |
| toque antecipado | 0–100 ms antes: chuta; 150 e 200 ms: não |
| intervalo entre chutes | o menor 0,10 s (≤ 10 chutes por segundo) |
| desempenho | 4 VS 4: 1000 passos em menos de 100 ms (node) |
| determinismo | dois mundos, os mesmos comandos: o mesmo estado bit a bit; `empacota`/`desempacota` volta ao mesmo passo |

## 17. Separação (como este motor é feito)

- Quem escreveu esta especificação já leu o código de física atual do RACHA (que, pelos registros do projeto, veio da
  análise de outro jogo) e os parâmetros extraídos desse jogo. Por isso a especificação foi escrita por metas e
  observações, e a **implementação é feita por outro agente**, que só recebe esta especificação, os cenários de medida
  (`tests/v94/cenarios.js`) e o teste da API (`tests/v94/motor_api_test.js`) — sem acesso ao código de física atual, aos
  registros de proveniência nem a material do outro jogo. Isso **não** é uma "sala limpa" jurídica (é a mesma ferramenta
  e quem especifica viu o código antigo), mas separa o texto do código novo do antigo.
- Depois, uma varredura compara as constantes e a estrutura do motor novo com as do motor antigo e com os parâmetros do
  outro jogo; toda coincidência é listada com a origem (medida ou decisão).
