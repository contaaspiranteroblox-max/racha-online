# RACHA · Deploy automático (GitHub Actions + runner na VPS da Serverspace)

Depois desta configuração (uma vez só), **toda atualização que entra na branch `main` é testada e publicada sozinha**.
As outras branches e os pull requests só rodam os testes: nunca vão para o site.

```
você aprova o pull request (ou faz push na main)
        │
        ▼
GitHub Actions ── testes (servidor, plataforma, ranking, build, física) ── testes no navegador
        │  tudo verde
        ▼
runner na VPS (racha-vps) ── sudo racha-deploy <commit>
        │  1. baixa o commit DIRETO do GitHub e recusa o que não está na main
        │  2. monta a versão nova numa pasta nova (a do ar não é tocada)
        │  3. plataforma: npm ci + npm run build (usuário racha, sem root)
        │  4. plataforma: backup do banco → migrações que faltam (v84, v88, v90…)
        │  5. troca a versão e reinicia o serviço racha
        │  6. confere: serviço, saúde, página do jogo e uma conexão de verdade nas salas
        └─ 7. falhou? volta sozinho para a versão de antes e o job fica vermelho
```

Por que um runner na VPS: a VPS não precisa aceitar conexão de fora (nem SSH aberto para o GitHub). O runner é que liga
para o GitHub (só saída, HTTPS) e pergunta se tem trabalho.

---

## 1. A configuração inicial na Serverspace (uma vez só)

Tudo pelo **console da VPS** (painel da Serverspace › o servidor › "…" › Console) ou por SSH do seu computador.

### 1.1 Antes de tudo
- No painel da Serverspace, faça um **snapshot/backup da VPS** (se o seu plano tiver). É o "desfazer" de tudo.
- A **chave `.pem` que foi enviada no chat**: depois de terminar, gere uma chave nova (Serverspace › SSH-keys), coloque-a no
  servidor e **apague a antiga** do `~/.ssh/authorized_keys`. Quem tem aquele arquivo entra na VPS como root.

### 1.2 Baixar o RACHA e descobrir como ele está instalado
```bash
cd /root
git clone https://github.com/contaaspiranteroblox-max/racha-online.git racha-deploy-ferramentas
cd racha-deploy-ferramentas
sudo bash deploy/detecta.sh
```
O `detecta.sh` só **lê** (não muda nada). Ele mostra o processo que está no ar (pm2, systemd, docker ou node solto), a
pasta, a porta, os **nomes** das variáveis do `.env` (nunca os valores) e sugere o modo:

| Modo | Quando | O que roda |
|---|---|---|
| `plataforma` | tem contas, login, MySQL (`app/dist/boot.js`) | o site + as contas + as salas no mesmo endereço |
| `salas` | só o jogo e as salas (`server.js`), sem contas | o jogo + as salas |

### 1.3 Preparar a VPS
```bash
sudo bash deploy/prepara-vps.sh --modo plataforma --porta 3000 --importar /caminho/do/racha/que/esta/no/ar
```
(troque o modo, a porta e a pasta pelo que o `detecta.sh` mostrou). Ele:
- instala o que falta (git, curl, Node 22 se precisar, o cliente do MySQL);
- cria os usuários `racha` (roda o jogo) e `github-runner` (roda o runner);
- copia o `.env` de agora para **`/etc/racha/racha.env`** (só root e o serviço leem) e os dados das salas para
  **`/var/lib/racha/turma.json`**;
- guarda a versão de agora como a primeira (para dar rollback) e instala o serviço **`racha`** (systemd);
- deixa o `github-runner` usar `sudo` **só** para `racha-deploy`, `racha-rollback` e `racha-verifica`.

**Ele não para o que está no ar.**

### 1.4 Conferir os segredos
```bash
sudo nano /etc/racha/racha.env
```
No modo `plataforma`, precisa ter pelo menos: `DATABASE_URL=mysql://usuario:senha@127.0.0.1:3306/banco`, `APP_ID`,
`APP_SECRET`, `RACHA_OWNER_PASSWORD` e (se usar) `RACHA_SEGREDO_SALAS`. O `RACHA_DADOS=/var/lib/racha/turma.json` já vem.

### 1.5 Trocar o processo de agora pelo serviço `racha` (alguns segundos fora do ar)
```bash
# pare o de agora — o detecta.sh mostrou qual é. Exemplos:
pm2 stop all && pm2 save && pm2 unstartup     # se era pm2
sudo systemctl stop <o-servico-antigo> && sudo systemctl disable <o-servico-antigo>   # se era systemd

sudo systemctl start racha
sudo racha-verifica            # ✔ serviço, saúde, página do jogo e multiplayer
```
Se o `racha-verifica` falhar: `sudo systemctl stop racha`, ligue o antigo de novo e veja `journalctl -u racha -n 80`.
O nginx/caddy (se tiver) continua igual: o serviço responde na mesma porta.

### 1.6 Instalar o runner do GitHub
1. GitHub › o repositório › **Settings › Actions › Runners › New self-hosted runner** › Linux › x64.
2. Copie o **token** (o texto depois de `--token` no comando `./config.sh` da página; vale 1 hora).
3. Na VPS:
```bash
sudo bash deploy/instala-runner.sh https://github.com/contaaspiranteroblox-max/racha-online <TOKEN>
```
Em Settings › Actions › Runners ele aparece como **racha-vps** (Idle), com o rótulo `racha-producao`.

---

## 2. A configuração no GitHub (uma vez só)

1. **Settings › Environments › New environment › `producao`**
   - *Deployment branches and tags*: **Selected branches** → `main` (nenhuma outra branch publica).
   - (opcional) *Required reviewers*: você — cada publicação espera o seu clique em "Approve".
   - *Environment variables*: `RACHA_URL` = o endereço público do site (ex.: `https://racha.seudominio.com.br`).
2. **Settings › Branches › Add rule** (ou *Rulesets*) para `main`: *Require a pull request before merging* e
   *Require status checks to pass* (marque **Testes** e **Testes no navegador**). Assim só entra na main o que passou.
3. **Settings › Actions › General**:
   - *Fork pull request workflows from outside collaborators*: **Require approval for all outside collaborators**
     (o repositório é público: ninguém de fora roda nada no runner da VPS sem você aprovar);
   - *Workflow permissions*: **Read repository contents** (o padrão mais fechado).
4. Nenhum segredo vai para o GitHub: a senha do banco e as chaves ficam só em `/etc/racha/racha.env`, na VPS.

---

## 3. O dia a dia

- **Publicar**: faça o merge do pull request na `main` (ou push na `main`). Actions › *Testar e publicar* mostra cada passo.
- **Publicar de novo a mesma versão**: Actions › *Testar e publicar* › *Run workflow* (na `main`).
- **Voltar uma versão**: Actions › *Rollback do site* › *Run workflow* (vazio = a de antes; ou o começo do SHA).
  Na VPS também dá: `sudo racha-rollback --lista` e `sudo racha-rollback <sha>`.
- **Voltar o banco** (raro: só se uma migração estragou dados): `sudo racha-restaura-banco` (lista) e
  `sudo racha-restaura-banco /var/backups/racha/<arquivo>.sql.gz` (pede para digitar RESTAURAR e faz um backup antes).
- **Ver o que aconteceu**: `sudo tail -100 /var/log/racha-deploy.log` e `journalctl -u racha -n 100`.
- **Migração nova** (para quem programa): o arquivo em `app/db/migrations/` + uma linha no `deploy/migracoes.conf`
  (o arquivo e uma tabela que só existe depois dele). Prefira `CREATE TABLE IF NOT EXISTS` e colunas novas — nunca apagar.

## 4. Segurança (o que protege o quê)

| Risco | Proteção |
|---|---|
| publicar uma branch de desenvolvimento | o workflow só publica na `main`; o environment `producao` só aceita a `main`; e o próprio `racha-deploy` baixa o commit do GitHub e **recusa** o que não está na `main` |
| código do repositório rodando como root | o `racha-deploy` é instalado uma vez em `/opt/racha/bin` (dono root) e nunca é trocado pelo deploy; o jogo roda como `racha` com o systemd fechado (`ProtectSystem=strict`, só grava em `/var/lib/racha`) |
| o runner virar uma porta para a VPS | o usuário `github-runner` não tem senha nem sudo além dos 3 comandos; não lê `/etc/racha`, os dados nem os backups |
| vazar a senha do banco | fica só em `/etc/racha/racha.env` (root:racha 640); o backup e as migrações usam um arquivo temporário só do root (a senha nunca vai na linha de comando) |
| migração estragar o banco | backup completo (mysqldump) antes de qualquer migração; sem backup, nada roda; os 15 mais novos ficam em `/var/backups/racha` (só root) |
| versão nova não subir | conferência automática e rollback automático para a versão de antes; as 5 últimas versões ficam guardadas |
| um processo antigo preso na porta "responder no lugar" da versão nova | a conferência exige que o processo do serviço seja da pasta da versão nova e que seja ele quem escuta na porta |
| dois deploys ao mesmo tempo | trava (`flock`) na VPS e `concurrency` no GitHub |
| mudar a física ou a jogabilidade | o teste do build confere o sha256 do bloco de física e para tudo se mudar |

## 5. Os arquivos

| Arquivo | Para quê |
|---|---|
| `.github/workflows/deploy.yml` | os testes em toda branch e o deploy só da `main` |
| `.github/workflows/rollback.yml` | o rollback à mão pelo GitHub |
| `deploy/detecta.sh` | descobre como o RACHA está instalado (só lê) |
| `deploy/prepara-vps.sh` | prepara a VPS (uma vez) |
| `deploy/instala-runner.sh` | instala o runner do GitHub (uma vez) |
| `deploy/racha.service` | o serviço do systemd |
| `deploy/migracoes.conf` | a lista das migrações do banco, na ordem |
| `deploy/bin/racha-deploy` | o deploy (backup, migrações, troca, conferência, rollback) |
| `deploy/bin/racha-migra` | as migrações com backup antes |
| `deploy/bin/racha-verifica` | confere o site e o multiplayer |
| `deploy/bin/racha-rollback` | volta uma versão |
| `deploy/bin/racha-restaura-banco` | volta o banco para um backup |
| `deploy/bin/racha-inicia` | como o serviço sobe (plataforma ou salas) |
| `deploy/bin/verifica_salas.mjs` | a conexão de teste nas salas (WebSocket) |

**Atualizar os comandos da VPS** (raro: só quando os arquivos de `deploy/bin` mudarem): na VPS,
`cd /root/racha-deploy-ferramentas && git pull && sudo bash deploy/prepara-vps.sh --modo <o seu> --porta <a sua>`
(ele não mexe na versão no ar nem nos segredos que já existem).
