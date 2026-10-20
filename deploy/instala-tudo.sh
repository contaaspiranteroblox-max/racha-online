#!/usr/bin/env bash
# RACHA · INSTALA TUDO num servidor (Ubuntu 22.04/24.04). Pode rodar de novo sem estragar nada.
# Uso (como root, no console da VPS):
#   curl -fsSL https://raw.githubusercontent.com/contaaspiranteroblox-max/racha-online/main/deploy/instala-tudo.sh | bash
#   (com o token do runner do GitHub no fim: ... | bash -s -- <TOKEN>)
# Modos (MODO=...):
#   plataforma (o padrão) → as CONTAS: o login com usuário e senha (o e-mail é opcional), o banco MySQL nesta VPS, o RACHA
#                           CONTROL do Dono, o ranking, a loja e o cofre na conta. Os números das contas começam do zero: a
#                           000001 é a do Dono (o usuário e a senha que este script pergunta) e a próxima conta é a 000002.
#                           O cadastro fica ABERTO (os amigos criam a conta no jogo); o Dono fecha no RACHA CONTROL.
#   salas                 → só o jogo e as salas online, sem contas.
# Faz: prepara a VPS (usuários, pastas, serviço racha, sudoers), o banco (no modo plataforma), publica a versão de agora,
# põe o Caddy na porta 80 (o site em http://<IP>/; com um domínio, troque o :80 do /etc/caddy/Caddyfile pelo domínio e o
# HTTPS liga sozinho) e, com o token, instala o runner do GitHub (o deploy automático).
set -Eeuo pipefail
TOKEN=${1:-}
MODO=${MODO:-plataforma}
REPO=https://github.com/contaaspiranteroblox-max/racha-online
RAMO=${RAMO:-main}
PORTA=8080
ENV=/etc/racha/racha.env
[ "$(id -u)" = 0 ] || { echo "rode como root"; exit 1; }
[[ "$MODO" == plataforma || "$MODO" == salas ]] || { echo "MODO=plataforma ou MODO=salas"; exit 1; }
passo(){ printf '\n▶ %s\n' "$*"; }
tem(){ [ -f "$ENV" ] && grep -q "^$1=" "$ENV"; }
poe(){ tem "$1" || echo "$1=$2" >> "$ENV"; }                  # (só acrescenta: o que já existe fica)
aleat(){ head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c "${1:-32}"; }
pergunta(){ local r; read -r ${3:-} -p "$1" r < /dev/tty; [ -n "${3:-}" ] && echo >&2; printf -v "$2" '%s' "$r"; }

passo "1/6 baixando as ferramentas do RACHA"
apt-get update -qq && apt-get install -y -qq git curl ca-certificates >/dev/null
DIR=/root/racha-deploy-ferramentas
if [ -d "$DIR/.git" ]; then git -C "$DIR" fetch -q origin "$RAMO" && git -C "$DIR" checkout -q -B "$RAMO" "origin/$RAMO"
else git clone -q --branch "$RAMO" "$REPO.git" "$DIR"; fi
mkdir -p /etc/racha; touch "$ENV"; chmod 600 "$ENV"
# pouca memória (1 GB) e sem swap: 2 GB de swap, para o MySQL e o build da plataforma caberem
if [ "$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)" -lt 1900 ] && [ "$(awk 'NR>1' /proc/swaps | wc -l)" = 0 ] && [ ! -e /swapfile ]; then
  echo "  memória pequena: criando 2 GB de swap"; fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap -q /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if [ "$MODO" = plataforma ]; then
  passo "2/6 o banco (MySQL nesta VPS) e a conta do Dono (000001)"
  apt-get install -y -qq mysql-server >/dev/null
  systemctl enable -q --now mysql
  if ! tem DATABASE_URL; then
    SB=$(aleat 28)
    mysql -e "CREATE DATABASE IF NOT EXISTS racha CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
              CREATE USER IF NOT EXISTS 'racha'@'localhost' IDENTIFIED BY '$SB'; ALTER USER 'racha'@'localhost' IDENTIFIED BY '$SB';
              CREATE USER IF NOT EXISTS 'racha'@'127.0.0.1' IDENTIFIED BY '$SB'; ALTER USER 'racha'@'127.0.0.1' IDENTIFIED BY '$SB';
              GRANT ALL PRIVILEGES ON racha.* TO 'racha'@'localhost'; GRANT ALL PRIVILEGES ON racha.* TO 'racha'@'127.0.0.1'; FLUSH PRIVILEGES;"
    echo "DATABASE_URL=mysql://racha:$SB@127.0.0.1:3306/racha" >> "$ENV"
  fi
  if ! tem RACHA_OWNER_PASSWORD; then
    U=${DONO_USUARIO:-}; S=${DONO_SENHA:-}
    while ! [[ "$U" =~ ^[a-z0-9_]{3,20}$ ]]; do pergunta "Seu usuário de Dono (3 a 20: letras minúsculas, números e _): " U; done
    while [ ${#S} -lt 8 ] || ! [[ "$S" =~ [A-Za-z] && "$S" =~ [0-9] ]] || [[ "$S" =~ [[:space:]\"\'\\\$\`] ]]; do
      pergunta "Sua senha de Dono (mínimo 8, com letra e número; sem espaço, aspas, \\, \$ ou crase): " S -s; pergunta "Repita a senha: " S2 -s
      [ "$S" = "$S2" ] || { echo "as senhas não são iguais"; S=""; }
    done
    echo "RACHA_OWNER_USERNAME=$U" >> "$ENV"; echo "RACHA_OWNER_PASSWORD=$S" >> "$ENV"
  fi
  poe APP_ID racha; poe APP_SECRET "$(aleat 48)"; poe RACHA_SEGREDO_SALAS "$(aleat 48)"; poe RACHA_CADASTRO aberto
fi

passo "3/6 preparando a VPS (modo $MODO, porta interna $PORTA)"
bash "$DIR/deploy/prepara-vps.sh" --modo "$MODO" --porta "$PORTA" --ramo "$RAMO"

if [ "$MODO" = plataforma ]; then
  passo "4/6 as tabelas do banco"
  URL=$(grep '^DATABASE_URL=' "$ENV" | cut -d= -f2-)
  tabelas(){ mysql -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='racha' AND table_name='usuarios'"; }
  if [ "$(tabelas)" = 0 ]; then
    (cd "$DIR/app" && npm ci --no-audit --no-fund --loglevel=error && DATABASE_URL="$URL" npx drizzle-kit push --force)
    [ "$(tabelas)" != 0 ] || { echo "✖ as tabelas do banco não foram criadas (veja o erro acima)"; exit 1; }
    echo "  ✔ tabelas criadas"
  else echo "  as tabelas já existem (as contas de agora ficam)"; fi
fi

passo "5/6 publicando a versão de agora da $RAMO"
/opt/racha/bin/racha-deploy "$(git -C "$DIR" rev-parse HEAD)"

passo "6/6 Caddy na porta 80 e o runner do GitHub"
apt-get install -y -qq caddy >/dev/null
cat > /etc/caddy/Caddyfile <<EOF
# RACHA: troque ":80" pelo seu domínio (ex.: racha.com.br) quando tiver um — o HTTPS liga sozinho.
:80 {
	encode gzip
	reverse_proxy 127.0.0.1:$PORTA
}
EOF
systemctl enable -q caddy && systemctl restart caddy
if command -v ufw >/dev/null && ufw status | grep -q active; then for p in 22 80 443; do ufw allow $p/tcp >/dev/null; done; fi
if [ -n "$TOKEN" ]; then bash "$DIR/deploy/instala-runner.sh" "$REPO" "$TOKEN"
else echo "  (sem token: o runner fica para depois →  sudo bash $DIR/deploy/instala-runner.sh $REPO <TOKEN>)"; fi

IP=$(curl -fsS -4 --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
printf '\n✔ PRONTO. O jogo: http://%s/\n' "$IP"
[ "$MODO" = plataforma ] && printf '  Entre com o seu usuário de Dono (%s): a conta 000001, com o RACHA CONTROL.\n' "$(grep '^RACHA_OWNER_USERNAME=' "$ENV" | cut -d= -f2-)"
exit 0
