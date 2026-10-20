#!/usr/bin/env bash
# RACHA · PREPARA A VPS PARA O DEPLOY AUTOMÁTICO (uma vez só, como root). Não para nem apaga o que já está no ar.
#
#   sudo bash deploy/prepara-vps.sh --modo plataforma --porta 3000 --importar /caminho/do/racha/de/agora
#   sudo bash deploy/prepara-vps.sh --modo salas      --porta 8080 --importar /root/racha-online
#
# --modo      plataforma (app/dist/boot.js: contas + MySQL + salas) ou salas (server.js: o jogo e as salas, sem contas)
#             — o deploy/detecta.sh mostra qual é o seu
# --porta     a porta em que o RACHA responde hoje (o nginx/caddy, se tiver, continua apontando para ela)
# --importar  a pasta do RACHA que está no ar agora: vira a primeira versão guardada (para dar rollback) e de lá vêm o .env
#             e os dados das salas (server/dados/turma.json). Sem ele, começa sem versão guardada.
# --repo      o repositório (padrão: https://github.com/contaaspiranteroblox-max/racha-online.git) · --ramo (padrão: main)
#
# O que faz:
#   · instala o que falta: git, curl, o Node 22 (se não tiver um Node 20+), o cliente do MySQL (modo plataforma);
#   · cria os usuários: "racha" (roda o jogo, sem senha e sem shell) e "github-runner" (roda o runner do GitHub, sem
#     sudo nenhum além dos 3 comandos do deploy);
#   · cria as pastas: /opt/racha (as versões e os comandos), /etc/racha (a configuração e os segredos: só root e o serviço
#     leem), /var/lib/racha (os dados das salas), /var/backups/racha (os backups do banco: só root);
#   · instala os comandos racha-deploy, racha-migra, racha-verifica, racha-rollback, racha-restaura-banco e o racha.service;
#   · deixa o github-runner chamar SÓ racha-deploy, racha-rollback e racha-verifica com sudo (/etc/sudoers.d/racha-deploy).
# NÃO liga o serviço novo: o fim mostra os comandos para trocar o processo de agora pelo serviço racha, com calma.
set -Eeuo pipefail
[ "$(id -u)" = 0 ] || { echo "rode como root (sudo)"; exit 1; }
AQUI=$(cd "$(dirname "$0")" && pwd)
MODO=""; PORTA=""; IMPORTAR=""; REPO=https://github.com/contaaspiranteroblox-max/racha-online.git; RAMO=main
while [ $# -gt 0 ]; do case "$1" in
  --modo) MODO=$2; shift 2;; --porta) PORTA=$2; shift 2;; --importar) IMPORTAR=$(readlink -f "$2"); shift 2;;
  --repo) REPO=$2; shift 2;; --ramo) RAMO=$2; shift 2;; *) echo "opção desconhecida: $1"; exit 1;; esac; done
[[ "$MODO" == salas || "$MODO" == plataforma ]] || { echo "--modo salas ou --modo plataforma"; exit 1; }
[[ "$PORTA" =~ ^[0-9]{2,5}$ ]] || { echo "--porta <número>"; exit 1; }
[[ "$RAMO" =~ ^[A-Za-z0-9._/-]+$ ]] || { echo "--ramo inválido"; exit 1; }
[ -z "$IMPORTAR" ] || [ -f "$IMPORTAR/server.js" ] || { echo "--importar: $IMPORTAR não tem o server.js do RACHA"; exit 1; }
p(){ printf '\n▶ %s\n' "$*"; }

p "pacotes"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl ca-certificates tar gzip util-linux >/dev/null
if [ "$MODO" = plataforma ]; then apt-get install -y -qq default-mysql-client >/dev/null 2>&1 || apt-get install -y -qq mariadb-client >/dev/null; fi
NV=$(node -v 2>/dev/null | sed 's/^v//; s/\..*//' || echo 0)
if [ "${NV:-0}" -lt 20 ]; then
  p "instalando o Node 22 (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "node $(node -v)"

p "usuários"
id racha >/dev/null 2>&1 || useradd --system --home-dir /var/lib/racha --shell /usr/sbin/nologin racha
id github-runner >/dev/null 2>&1 || useradd --create-home --shell /bin/bash github-runner
passwd -l github-runner >/dev/null 2>&1 || true

p "pastas"
install -d -o root -g root -m 755 /opt/racha /opt/racha/bin /opt/racha/releases
install -d -o root -g racha -m 750 /etc/racha
install -d -o racha -g racha -m 750 /var/lib/racha
install -d -o racha -g racha -m 750 /var/cache/racha-npm
install -d -o root -g root -m 700 /var/backups/racha
touch /var/log/racha-deploy.log; chmod 640 /var/log/racha-deploy.log

p "comandos do deploy"
for c in racha-deploy racha-migra racha-verifica racha-rollback racha-restaura-banco racha-inicia; do install -o root -g root -m 755 "$AQUI/bin/$c" /opt/racha/bin/$c; done
install -o root -g root -m 644 "$AQUI/bin/verifica_salas.mjs" /opt/racha/bin/verifica_salas.mjs
for c in racha-deploy racha-rollback racha-verifica racha-restaura-banco; do ln -sf /opt/racha/bin/$c /usr/local/sbin/$c; done

p "configuração (/etc/racha)"
cat > /etc/racha/deploy.conf <<EOF
# RACHA · o deploy automático (sem segredos aqui: os segredos ficam no racha.env)
MODO=$MODO
PORTA=$PORTA
REPO_URL=$REPO
RAMO=$RAMO
MANTER=5
EOF
chown root:racha /etc/racha/deploy.conf; chmod 640 /etc/racha/deploy.conf
if [ ! -f /etc/racha/racha.env ]; then
  : > /etc/racha/racha.env
  for f in "$IMPORTAR/app/.env" "$IMPORTAR/.env"; do [ -n "$IMPORTAR" ] && [ -f "$f" ] && { grep -E '^[A-Z_][A-Z0-9_]*=' "$f" >> /etc/racha/racha.env; echo "variáveis copiadas de $f"; }; done
  grep -q '^RACHA_DADOS=' /etc/racha/racha.env || echo 'RACHA_DADOS=/var/lib/racha/turma.json' >> /etc/racha/racha.env
  if [ "$MODO" = plataforma ]; then for v in DATABASE_URL APP_ID APP_SECRET RACHA_OWNER_PASSWORD; do grep -q "^$v=" /etc/racha/racha.env || echo "⚠ falta $v em /etc/racha/racha.env (preencha antes de ligar o serviço)"; done; fi
fi
chown root:racha /etc/racha/racha.env; chmod 640 /etc/racha/racha.env
if [ -n "$IMPORTAR" ] && [ -f "$IMPORTAR/server/dados/turma.json" ] && [ ! -f /var/lib/racha/turma.json ]; then
  install -o racha -g racha -m 640 "$IMPORTAR/server/dados/turma.json" /var/lib/racha/turma.json; echo "dados das salas copiados para /var/lib/racha/turma.json"
fi

if [ -n "$IMPORTAR" ] && [ ! -e /opt/racha/current ]; then
  p "a versão de agora vira a primeira guardada (para dar rollback)"
  V0=/opt/racha/releases/00000000-000000-importada
  mkdir -p "$V0"; tar -C "$IMPORTAR" --exclude=.git -cf - . | tar -C "$V0" -xf -
  [ -f "$V0/app/.env" ] && ln -sf /etc/racha/racha.env "$V0/app/.env"
  chown -R root:racha "$V0"; chmod -R g-w,o-rwx "$V0"
  ln -sfn "$V0" /opt/racha/current
fi

p "serviço racha (systemd)"
install -o root -g root -m 644 "$AQUI/racha.service" /etc/systemd/system/racha.service
systemctl daemon-reload
systemctl enable racha >/dev/null 2>&1

p "permissões do runner"
cat > /etc/sudoers.d/racha-deploy <<'EOF'
# o runner do GitHub só pode publicar, voltar e conferir o RACHA (e nada mais como root)
Defaults:github-runner !requiretty
github-runner ALL=(root) NOPASSWD: /opt/racha/bin/racha-deploy, /opt/racha/bin/racha-rollback, /opt/racha/bin/racha-verifica
EOF
chmod 440 /etc/sudoers.d/racha-deploy
visudo -cf /etc/sudoers.d/racha-deploy >/dev/null

cat <<EOF

✔ VPS preparada (modo $MODO, porta $PORTA). O que está no ar agora NÃO foi parado.

PRÓXIMOS PASSOS
1) Confira os segredos:   sudo nano /etc/racha/racha.env
2) Troque o processo de agora pelo serviço racha (alguns segundos fora do ar):
     - pare o de agora (o detecta.sh mostrou qual é: pm2 stop <nome> && pm2 save, ou systemctl stop <serviço>, ou kill <pid>)
     - sudo systemctl start racha && sudo racha-verifica
     - se der errado: sudo systemctl stop racha e ligue o de antes de novo
3) Instale o runner do GitHub:   sudo bash deploy/instala-runner.sh <URL do repositório> <token>
EOF
