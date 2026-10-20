#!/usr/bin/env bash
# RACHA · INSTALA TUDO num servidor NOVO (Ubuntu 22.04/24.04), modo "salas" (o jogo e as salas online, sem contas/MySQL).
# Uso (como root, no console da VPS nova):
#   curl -fsSL https://raw.githubusercontent.com/contaaspiranteroblox-max/racha-online/main/deploy/instala-tudo.sh -o instala-tudo.sh
#   sudo bash instala-tudo.sh <TOKEN do runner>        (o token: GitHub › Settings › Actions › Runners › New self-hosted runner)
# Faz: prepara a VPS (usuários, pastas, serviço racha, sudoers), publica a versão de agora da main, põe o Caddy na porta 80
# (o site abre em http://<IP>/; com um domínio depois, é só trocar o :80 do /etc/caddy/Caddyfile pelo domínio e o Caddy
# liga o HTTPS sozinho) e instala o runner do GitHub. Pode rodar de novo sem estragar nada.
set -Eeuo pipefail
TOKEN=${1:-}
REPO=https://github.com/contaaspiranteroblox-max/racha-online
RAMO=${RAMO:-main}
PORTA=8080
[ "$(id -u)" = 0 ] || { echo "rode como root: sudo bash $0 <TOKEN>"; exit 1; }
passo(){ printf '\n▶ %s\n' "$*"; }

passo "1/5 baixando as ferramentas do RACHA"
apt-get update -qq && apt-get install -y -qq git curl ca-certificates >/dev/null
DIR=/root/racha-deploy-ferramentas
if [ -d "$DIR/.git" ]; then git -C "$DIR" fetch -q origin "$RAMO" && git -C "$DIR" checkout -q -B "$RAMO" "origin/$RAMO"
else git clone -q --branch "$RAMO" "$REPO.git" "$DIR"; fi

passo "2/5 preparando a VPS (modo salas, porta interna $PORTA)"
bash "$DIR/deploy/prepara-vps.sh" --modo salas --porta "$PORTA" --ramo "$RAMO"

passo "3/5 publicando a versão de agora da $RAMO"
SHA=$(git -C "$DIR" rev-parse HEAD)
/opt/racha/bin/racha-deploy "$SHA"

passo "4/5 Caddy na porta 80 (o site em http://<IP>/, com o multiplayer)"
apt-get install -y -qq caddy >/dev/null
cat > /etc/caddy/Caddyfile <<EOF
# RACHA: troque ":80" pelo seu domínio (ex.: racha.com.br) quando tiver um — o HTTPS liga sozinho.
:80 {
	encode gzip
	reverse_proxy 127.0.0.1:$PORTA
}
EOF
systemctl enable -q caddy && systemctl restart caddy
if command -v ufw >/dev/null && ufw status | grep -q active; then ufw allow 22/tcp >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; fi

passo "5/5 runner do GitHub (o deploy automático)"
if [ -n "$TOKEN" ]; then bash "$DIR/deploy/instala-runner.sh" "$REPO" "$TOKEN"
else echo "sem token: o runner fica para depois →  sudo bash $DIR/deploy/instala-runner.sh $REPO <TOKEN>"; fi

IP=$(curl -fsS -4 --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
printf '\n✔ PRONTO. O jogo: http://%s/\n  A partir de agora, cada merge na main é testado e publicado sozinho.\n' "$IP"
