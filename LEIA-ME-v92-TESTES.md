# RACHA v92 · a versão de TESTES da mecânica

Esta é a **versão de testes** do RACHA v92, feita em cima do ZIP da v91 (a interface nova da v91 não mudou). Ela traz a
mecânica nova (mais lisa, mais precisa e mais responsiva) e um **painel de ajustes** para experimentar a física, os controles,
a câmera e o online antes de decidir o que vai para a versão oficial.

> Nada aqui foi publicado no servidor oficial e nenhum banco de dados foi mexido. Para testar, rode no seu computador ou
> num serviço de teste separado (veja abaixo).
>
> **Não publique este ZIP como está no serviço oficial:** ele vem com `experimental: true` no `app/public/game/config.js`
> e assim o painel aparece para todos os jogadores. Para a versão oficial, apague essa linha.

## Como testar nos celulares (o jeito mais rápido)

**Só o treino (só o celular):** abra o link da versão de testes que veio com o relatório, deite o celular, role a tela de
entrada até o fim e toque em **SÓ TREINAR OFFLINE**; depois **JOGAR**. Na partida, a **pausa** (canto de cima, à esquerda)
tem o botão **A ⇄ B**: a memória A é o Padrão v92 e a B é a v91 (tudo como era) — já vêm prontas — e o botão diz qual está
valendo ("A ⇄ B · agora B (v91)"). Para a v91 sem nenhuma mudança, abra o link da v91 original.

**O online (dois celulares):**

1. No computador (Windows), descompacte o ZIP e dê dois cliques em **`INICIAR-TESTES-NO-WINDOWS.bat`**
   (precisa do Node.js: https://nodejs.org, versão LTS). Ele sobe o jogo e as salas **com o modo de testes ligado**
   (`RACHA_EXPERIMENTAL=1`). Se o Windows perguntar, permita o acesso nas redes privadas.
2. No mesmo computador: abra `http://localhost:8080`. **Nos celulares** (mesmo Wi-Fi): `http://IP-DO-COMPUTADOR:8080`
   (o .bat mostra o IP). Escreva um nome e toque em **JOGAR ONLINE**; um toca em **CRIAR SALA** e o outro em **ENTRAR COM
   CÓDIGO**. (Sem internet, **SÓ TREINAR OFFLINE** abre o treino.)
3. O painel: **AJUSTES › TESTES v92** (a primeira aba; no lobby pela engrenagem, na partida pela pausa › AJUSTES; no
   computador, **F2**). No online, o A ⇄ B troca a previsão e o desenho do seu celular; o servidor continua o da v92.

No Linux/Mac: `RACHA_EXPERIMENTAL=1 node server.js`.

## O painel (AJUSTES › TESTES v92)

| Parte | O que dá para mexer |
|---|---|
| **PERFIS** | **PADRÃO v92** · **RESTAURAR v91** (tudo como era) · memórias **A** e **B** (GUARDAR, USAR e **A ⇄ B** — com as duas guardadas, a pausa da partida ganha o botão A ⇄ B) · a tabela do que muda entre elas · EXPORTAR/IMPORTAR (texto para levar a outro celular) |
| **FÍSICA** | tamanho da tampinha, alcance do chute, tamanho da bola, velocidade, peso da tampinha e da bola, força do PASSE e do CHUTE, teto e freio da bola, giro, atritos e quiques (vale **na hora** no treino e contra os bots) |
| **CONTROLES** | toque armado, intervalo entre botões, área de toque a mais, direções (8/16/32/64/livre), zona morta (liga/desliga), folga da direção, analógico fixo/flutuante, moldes e tamanho do PASSE/CHUTE |
| **TELA** | o desenho entre os passos (v91 / SUAVE / PREVER), a cadência, o limite de FPS em passo inteiro, a mola e o "olhar à frente" da câmera, o aro mais justo, o **medidor na tela** |
| **ONLINE** | a previsão (v91 / v92), a bola na tela (SERVIDOR / MISTO / PREVISTA), o deslize das correções, 30 ou 60 quadros/s, e **MANDAR PARA A SALA** (o admin, antes de começar: a sala inteira joga com a física do painel) |
| **MEDIDAS** | FPS, passos da física por quadro, toques e chutes; no online: ping, correção da sua tampinha e da bola, passos/s do servidor, comandos à frente |
| **DB** | a mecânica do DB (PASSE + CHUTE): **ATUAL** ou **POR ESTADOS** (experimental) · a janela e a proteção da bola parada, quando a bola conta como parada, a janela e a proteção da bola andando, a parede (só a física ou igual ao campo aberto), quem veio antes no mesmo passo pelo relógio do toque, a regra de ms (2–5 ms, só para comparar) · o **medidor do DB** (cada tentativa: o que a regra decidiu, os passos entre o PASSE e o CHUTE, o intervalo entre os dedos e a varredura da tela de toque do aparelho). Na pausa, **DB: ATUAL ⇄ POR ESTADOS** troca na hora no treino |

O painel guarda tudo no aparelho (`racha-v92-testes`). **RESTAURAR v91** volta exatamente ao jogo de antes.

## O DB (PASSE + CHUTE) por estados

O DB por estados é **experimental** e fica desligado na versão oficial. Para comparar com o DB atual no mesmo lance: na pausa
do treino, **DB: ATUAL ⇄** (vira **DB: POR ESTADOS**). Faça cada lance algumas vezes em cada mecânica — de pé com a bola
encostada, chegando correndo na bola parada, conduzindo, girando, de lado e na parede — e veja em **AJUSTES › TESTES v92 ›
DB** o medidor: o que a regra decidiu, os passos entre o PASSE e o CHUTE e o intervalo entre os dedos em ms. Ande com o
analógico alguns segundos para o medidor mostrar a varredura da tela de toque do aparelho. No online, o admin escolhe a
mecânica no painel e toca em **ONLINE › MANDAR PARA A SALA** antes de começar (na sala vale o perfil da sala). O relatório
de viabilidade explica as regras e os números; os testes automáticos são `tests/v92_db_test.cjs`,
`tests/v92_db_celular_test.py` e `tests/v92_db_online_test.py`, e o laboratório `node tests/v92_db/lab.cjs` imprime a
chance de DB em cada cenário. O `tests/v92_db_online_test.py` é sensível a travadas da máquina (dois navegadores, o servidor
e o proxy ao mesmo tempo): se falhar, rode-o de novo sozinho, com a máquina livre, e veja as causas no CHANGELOG.

## Versão oficial × versão de testes

- O painel só existe com `experimental: true` em `app/public/game/config.js` (o ZIP de testes vem assim).
  **Para a versão oficial, apague essa linha**: o painel some e o jogo usa o **padrão da v92**. Um celular que já usou a
  versão de testes não leva nada para a oficial: o ajuste guardado no aparelho é ignorado (`tests/v92_test.py`, parte 1b).
- O ZIP da versão oficial sai pronto com `python3 tools/v92/pacote.py --producao racha-online-v92.zip` (o `config.js` sem
  o experimental, sem o `INICIAR-TESTES-NO-WINDOWS.bat` e sem este LEIA-ME). `tests/v92_pacote_test.py <oficial.zip>
  <testes.zip>` descompacta os dois, sobe cada um com `node server.js` e confere que o oficial não tem o painel e recusa a
  física do admin, e que o de testes tem e aceita.
- O servidor só aceita o perfil da física mandado pelo admin com `RACHA_EXPERIMENTAL=1` (ou `--experimental`). Sem isso,
  toda sala usa o padrão (os números da v91 + o toque armado + a rede segurando a tampinha). **Nunca ligue essa variável
  no serviço oficial.**
- Para comparar com a v91 no servidor: `RACHA_FISICA=v91` (a física das salas exatamente como na v91) e `RACHA_MOTOR=v91`
  (o relógio antigo do motor).
- Antes do lançamento (não é da v92): o `config.js` ainda tem `presente: true` (o presente de TESTE da v87.2, com o
  comentário "apague esta linha no lançamento").

## Num serviço de teste no Render (separado do oficial)

Crie um serviço NOVO (não use o `racha-online` oficial), com o mesmo `startCommand: node server.js` e as variáveis do
`render.yaml` mais `RACHA_EXPERIMENTAL=1`. O `render.yaml` deste ZIP continua o do oficial (não muda nada).

## O que mudou (resumo — os detalhes estão no CHANGELOG.md)

1. **Sem trancos**: a cadência dos quadros acerta o intervalo (60, 120 e 30 Hz) e o desenho mostra onde cada um está
   *agora* entre os passos da física; com o limite de 60 FPS numa tela de 90 Hz, o jogo desenha 90/s (antes: 2 de cada 3).
2. **A bola no online na hora**: quem joga roda o mesmo passo do servidor (o núcleo `server/partida/nucleo.js`, um arquivo
   só para os dois) e prevê a bola e o chute; o servidor corrige com um deslize curto quando alguém faz o inesperado.
3. **Chutes que registram**: o toque no PASSE/CHUTE fica armado 100 ms esperando a bola (no treino e no servidor); um
   toque que caiu num comando atrasado não se perde (os contadores de toque no comando).
4. **Aparelho = servidor**: o servidor anda 60 passos/s de verdade (antes ~61: 60,7 a 61,2 medidos) e a rede e as traves seguram a tampinha
   no servidor como no jogo.
5. **Controles**: o analógico começa a andar a 15% do curso (antes 20%) e troca de direção com menos "grude".
6. **A vibração do iPhone no toque armado**: no iPhone a vibração só sai dentro do toque; se a bola entra no alcance dentro
   da janela do toque armado, vibra no toque (antes o chute armado saía sem vibrar).
7. **Internet falhando**: depois de um soluço de ~0,5 s a sua tampinha desliza para onde o servidor diz (até 12 u) em vez
   de pular; só pula no teleporte de verdade (a saída depois do gol, o fim) ou depois de segundos sem internet.

A física de números (velocidade, força, tamanhos, freio) **é a mesma da v91** no padrão — o painel é que permite testar outras.

## Os arquivos do ZIP da v91 que mudaram

- **O jogo:** `app/public/game/racha.html` (gerado pelo build; o código novo mora em `tools/v92/` e o estilo do painel em
  `app/public/game/v92.css`) e, só no ZIP de testes, `app/public/game/config.js` (a linha `experimental: true`).
- **O servidor:** `server/partida/sala.js`, `server/partida/bot.js`, `server/turma.js`, `server/servidor.js` e o novo
  `server/partida/nucleo.js` (a física das salas, o mesmo arquivo que o jogo usa na previsão).
- **O build e os testes:** `tools/aplicar_rua.py`, `tests/roda_tudo.sh`, `tests/v83_sala_test.mjs` (o quadro do servidor
  pode ter 8 campos), `tests/v79_test.py` (a conta da vitória pelo placar final) e os testes novos `tests/v92*`:
  `v92_celular` (os controles com toques de verdade num iPhone e num Android de mentira), `v92_reconexao` (a internet
  falhando: soluço, apagão, queda, segundo plano), `v92_mista` (um celular com a v91 e outro com a v92 na mesma sala; precisa
  da página da v91) e `v92_pacote` (os dois ZIPs servidos pelo `node server.js`).
- **A plataforma:** `app/api/racha/authRouter.ts` (a mensagem "E-mail inválido." do cadastro, que o zod 4 trocava por uma
  genérica em inglês).
- `CHANGELOG.md` (a entrada da v92). **Todos os outros arquivos são os do ZIP da v91, byte a byte.**

## O que testar nos celulares (nada disto foi testado em celular de verdade ainda)

Compare sempre pelo botão A ⇄ B da pausa (a memória A já vem com o Padrão v92 e a B com a v91) e, se quiser os números,
ligue o MEDIDOR (TESTES v92 › TELA). Use pelo menos um iPhone (Safari) e um Android: as medidas foram todas no navegador do
Chrome (o `tests/v92_celular_test.py` faz de conta que é um iPhone e um Android, com toques de verdade, mas não é o vidro).

- [ ] Celular de 60 Hz, treino: correr reto e em zigue-zague por 1 minuto — os passos por quadro ficam em 1 e a tampinha
      não treme.
- [ ] Celular de 90, 120 ou 144 Hz: o mesmo; o FPS mostra 90, 60 ou 72.
- [ ] Bateria: anotar a % gasta em 10 minutos de treino na v92 e no RESTAURAR v91, no mesmo celular. (Se a v92 gastar
      muito mais numa tela de 90 Hz, desligue "Limite de FPS em passo inteiro" em TELA.)
- [ ] Celular fraco (perto de 30 FPS): a tampinha anda lisa e os toques respondem.
- [ ] Toque armado: tocar PASSE/CHUTE um pouco antes de a bola chegar deve chutar. Se parecer "chute sozinho", baixar o
      Toque armado de 6 para 3 ou 4 passos (CONTROLES).
- [ ] O som e a vibração do chute saem junto com a bola, no treino e no online.
- [ ] Analógico: mira fina sem "grudar" e sem andar sozinho com o dedo parado no meio (se ficar sensível demais, subir a
      zona morta).
- [ ] Botões: tamanho, área de toque a mais e os moldes, em celular grande e pequeno; o EDITAR CONTROLES continua salvando.
- [ ] Online (Wi-Fi e 4G, dois celulares numa sala deste servidor de testes): o chute sai na hora do toque, a bola
      acompanha na condução e o MEDIDOR mostra o servidor perto de 60 passos/s.
- [ ] Disputa de bola cara a cara no online: a bola PREVISTA (padrão) × a MISTO — qual parece mais justa.
- [ ] Internet ruim: a partida segue sem travar e as correções deslizam em vez de pular.
- [ ] Sair do app no meio da partida e voltar: a tampinha para e volta sem ficar presa.
- [ ] Um celular com a v91 e outro com a v92 na mesma sala do servidor de testes: os dois jogam.
- [ ] A versão oficial (o `config.js` sem a linha `experimental`): o painel não aparece em lugar nenhum.
- [ ] A física no painel (tamanho, velocidade, peso, força, colisões): anotar o que ficou melhor e EXPORTAR o ajuste.
