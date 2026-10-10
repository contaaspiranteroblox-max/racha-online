# Racha — salas online

O jogo de futebol de rua com **salas online**: **salas abertas** (qualquer um entra pela lista ou pelo **JOGAR AGORA**)
e **salas personalizadas** (você é o dono e escolhe times, campo, modo, tempo e bots). A sala é igual à do print:
**Time Vermelho · Espectadores · Equipe Azul**, com chat em todo lugar e "digitando…" em cima da cabeça.

> **Importante:** o GitHub guarda o código, mas **não roda o servidor das salas**.
> Para as salas funcionarem, ligue este repositório ao **Render** (grátis, passo 2 abaixo).
> O Render roda o `server.js`, que entrega o jogo **e** as salas no mesmo endereço.

```
├── server.js              o servidor (salas, copa, clubes, Chat do Brasil) — sem dependências
├── public/index.html      o jogo
├── package.json           para a hospedagem saber rodar (npm start)
├── render.yaml            a receita do Render (é só escolher o repositório)
├── Dockerfile             para hospedagens com Docker ou um VPS
└── INICIAR-NO-WINDOWS.bat dois cliques para testar no seu PC
```

## Como funciona

- Onde fica no jogo: **GALERA › SALAS** (ou **JOGAR › ONLINE**).
- **Salas abertas:** a lista mostra as salas esperando gente. Toque em **ENTRAR** (ou **ASSISTIR**).
  **JOGAR AGORA** cai direto na sala que está mais perto de começar; se não tiver nenhuma, abre uma sala aberta
  com as suas regras para os outros entrarem.
- **Sala personalizada:** você vira o dono (a coroa) e escolhe embaixo **TIMES** (1v1 a 4v4), **CAMPO**,
  **MODO** (Futebol, Com curva, Vôlei, Americano, Basquete), **TEMPO** (primeiro a 3, 2, 3 ou 5 minutos) e **BOTS**.
  Na hora de criar você escolhe se ela é **ABERTA** (aparece na lista) ou **FECHADA** (só entra com o código ou o
  link do **CONVIDAR**, que tem botão de WhatsApp). Dá para mudar depois na engrenagem.
- Cada um toca no **Time Vermelho**, na **Equipe Azul** ou em **Espectadores** para trocar de lugar.
  **Iniciar Partida** começa para todo mundo; quem está nos Espectadores assiste ao vivo.
- O celular do **dono** é quem roda a partida (por isso ele precisa manter o jogo aberto). Os outros mandam o
  controle e recebem a partida.
- **Conexão direta:** o celular de cada jogador conversa **direto** com o do dono (WebRTC, como no Haxball).
  O comando não precisa ir até o servidor nos EUA e voltar: o atraso cai muito. Quando a rede não deixa
  (algumas redes de 4G), tudo passa pelo servidor sozinho, sem ninguém perceber. Com ela ligada, a barra da
  partida mostra **"· direto"** do lado do ping.
- **Sem lag para quem entra na sala:** a bola e os outros jogadores andam lisos entre um quadro e outro, e o
  seu boneco não "volta para trás".
- **Chat em todo lugar:** no lobby é o **Chat do Brasil**; na sala e na partida, o **chat da sala**. Toque na
  barra para escrever (no computador: **Enter** abre, **Esc** fecha).
- Com tempo: quem tiver mais gols quando o relógio zera vence. Empatou → **gol de ouro**.
- Caiu a internet? O jogo volta sozinho para a mesma sala. Alguém saiu no meio? Um bot assume o lugar.
- Com **BOTS desativado** a partida só começa com os times completos. Ativado, os bots completam.

## 1. Colocar no GitHub

**Pelo site (mais fácil):**

1. Entre em <https://github.com> e clique em **New repository**. Dê um nome (ex.: `racha-online`),
   pode deixar **Private**, e clique em **Create repository**.
2. Na página do repositório, clique em **uploading an existing file** (ou **Add file › Upload files**).
3. Arraste **todo o conteúdo desta pasta** — inclusive a pasta `public` com o `index.html` dentro —
   e clique em **Commit changes**.

**Pelo terminal (se você usa git):**

```bash
cd racha-online
git init
git add .
git commit -m "Racha com salas online"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/racha-online.git
git push -u origin main
```

## 2. Ligar o servidor de graça (Render)

1. Crie uma conta no **Render** (<https://render.com>) entrando **com o GitHub**.
2. Clique em **New › Blueprint**, escolha o repositório e confirme. O `render.yaml` já diz tudo.
   (Se preferir **New › Web Service**: Runtime **Node**, Build Command `npm install`,
   Start Command `node server.js`, Plan **Free**, Region **Virginia**.)
3. Em uns minutos o Render dá um endereço tipo `https://racha-online.onrender.com`.
   **Esse é o link do jogo.** Mande para a galera.

Daí em diante, **cada vez que você atualizar o repositório no GitHub, o Render publica a versão nova sozinho.**

O que saber do plano grátis do Render:

- Ele **dorme depois de 15 minutos** sem ninguém conectado. O primeiro que abrir espera ~1 minuto para acordar.
- O disco dele **é apagado** quando dorme ou reinicia: as **salas funcionam normal**,
  mas **clubes, duelos e a galeria de campeões zeram**. Para guardar de vez, use um plano pago com disco ou um VPS.
- O Render não tem servidor na América do Sul; **Virginia** é o mais perto. Com a **conexão direta** isso pesa
  pouco na partida (ela vai de celular para celular); o servidor fica só com a sala, o chat e o placar.

### Já tenho o jogo no GitHub Pages

O GitHub Pages só mostra páginas: ele não roda o `server.js`. Faça o passo 2 (Render) e diga ao jogo do Pages onde
está o servidor: no `index.html`, logo no começo do código, troque

```js
const SERVIDOR_DO_JOGO = '';
```

por `const SERVIDOR_DO_JOGO = 'racha-online.onrender.com';` (o endereço que o Render deu).
Também funciona mandar o link com o servidor junto: `https://SEU-SITE/?servidor=racha-online.onrender.com`,
ou cada jogador pôr o endereço em **Ajustes › Avançado › Servidor do jogo**.

## 3. Testar no seu computador

1. Instale o **Node.js** (versão 18 ou mais nova, a "LTS"): <https://nodejs.org>
2. Rode o servidor:
   - **Windows:** dois cliques em `INICIAR-NO-WINDOWS.bat`
   - **Mac/Linux:** abra o terminal nesta pasta e rode `node server.js`
3. No PC, abra <http://localhost:8080>
4. No celular (no **mesmo Wi-Fi**), abra o endereço que aparece na tela do servidor,
   tipo `http://192.168.0.10:8080`. Se o Windows perguntar do firewall, toque em **Permitir**.

## 4. Melhor ping: um VPS no Brasil (opcional)

Qualquer VPS com data center em **São Paulo** serve (Ubuntu, por exemplo):

```bash
# instalar o Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# copiar esta pasta para o servidor (ex.: /opt/racha) e deixar rodando sempre
sudo npm install -g pm2
cd /opt/racha
SERVER_NAME="South America" pm2 start server.js --name racha
pm2 save && pm2 startup
```

O jogo fica em `http://IP-DO-VPS:8080` (libere a porta 8080 no firewall do provedor).
Para ter **domínio com https** (recomendado), instale o **Caddy** (<https://caddyserver.com/docs/install>)
na frente — ele cuida do certificado e já repassa as salas (WebSocket). No `/etc/caddy/Caddyfile`:

```
meuracha.com.br {
    reverse_proxy localhost:8080
}
```

Depois: `sudo systemctl reload caddy`. O jogo fica em `https://meuracha.com.br`.

## Ajustes do servidor (opcionais)

No Render: **Environment › Add Environment Variable**.

| Variável      | Para quê                                                                  | Padrão          |
|---------------|---------------------------------------------------------------------------|-----------------|
| `SERVER_NAME` | o nome em "Servidor: …" no canto da sala                                  | `South America` |
| `PORT`        | a porta (as hospedagens costumam definir sozinhas)                        | `8080`          |
| `DATA_DIR`    | onde salvar clubes, duelos e campeões                                     | `./data`        |
| `P2P`         | `0` desliga a conexão direta (tudo passa pelo servidor)                   | ligada          |
| `ICE_SERVERS` | (avançado) servidores STUN/TURN da conexão direta, em JSON                | STUN do Google e da Cloudflare |
| `MAX_POR_IP`  | conexões abertas do mesmo endereço (no 4G muita gente sai pelo mesmo IP)   | `150`           |

Outras regras (máximo de pessoas por sala, frases rápidas, tempos…) estão no começo do `server.js`, comentadas.

A conexão direta funciona como em qualquer jogo P2P: o celular do dono e o de cada jogador ficam sabendo o endereço
de internet um do outro. Se preferir que tudo passe pelo servidor, use `P2P=0`.

## Se algo não funcionar

- **"Não conectou"**: o servidor está ligado? Abra `SEU-ENDERECO/health` — tem que aparecer `"ok":true`.
- **No Render, demorou para abrir**: ele estava dormindo; espere ~1 minuto e recarregue.
- **Abri pelo GitHub Pages e as salas não aparecem**: falta dizer onde está o servidor (veja *Já tenho o jogo no GitHub Pages*).
- **A partida parou para todo mundo**: o dono da sala fechou ou minimizou o jogo. Ele volta e inicia de novo.
- **Ninguém vê minha sala na lista**: ela está **fechada** (engrenagem › Aberta). Ou mande o link do Convidar.
- **Não aparece "· direto" na partida**: a rede de alguém não deixou a conexão direta; a partida continua
  pelo servidor normalmente. Em outra rede (outro Wi-Fi ou 4G) costuma funcionar.
