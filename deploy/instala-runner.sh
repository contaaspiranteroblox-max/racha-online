#!/usr/bin/env bash
# RACHA · INSTALA O RUNNER DO GITHUB NA VPS (uma vez só, como root, depois do prepara-vps.sh).
#
#   sudo bash deploy/instala-runner.sh https://github.com/contaaspiranteroblox-max/racha-online <TOKEN>
#
# O TOKEN aparece no GitHub: o repositório › Settings › Actions › Runners › New self-hosted runner (Linux, x64) — é a
# parte depois de "--token" no comando "./config.sh" que a página mostra. Ele vale por 1 hora e só serve para registrar.
#
# O runner:
#   · roda como o usuário github-runner (sem senha, sem sudo, a não ser racha-deploy/racha-rollback/racha-verifica);
#   · fica com o nome "racha-vps" e o rótulo "racha-producao" (só o job de deploy usa esse rótulo);
#   · vira um serviço do systemd (liga sozinho quando a VPS reinicia) e só faz conexões de SAÍDA para o GitHub (HTTPS):
#     não precisa abrir porta nenhuma na VPS.
set -Eeuo pipefail
[ "$(id -u)" = 0 ] || { echo "rode como root (sudo)"; exit 1; }
URL=${1:?uso: instala-runner.sh <url do repositório> <token>}; TOKEN=${2:?falta o token}
[[ "$URL" =~ ^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || { echo "URL inválida (https://github.com/<dono>/<repo>)"; exit 1; }
id github-runner >/dev/null 2>&1 || { echo "rode o prepara-vps.sh antes"; exit 1; }
D=/home/github-runner/actions-runner
ARCH=$(uname -m); case "$ARCH" in x86_64) A=x64;; aarch64) A=arm64;; *) echo "arquitetura $ARCH não suportada"; exit 1;; esac
VER=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | grep -m1 '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/')
[[ "$VER" =~ ^[0-9.]+$ ]] || { echo "não deu para descobrir a versão do runner"; exit 1; }
echo "runner $VER ($A)"
install -d -o github-runner -g github-runner -m 750 "$D"
cd "$D"
if [ ! -f ./config.sh ]; then
  runuser -u github-runner -- curl -fsSL -o runner.tgz "https://github.com/actions/runner/releases/download/v$VER/actions-runner-linux-$A-$VER.tar.gz"
  runuser -u github-runner -- tar xzf runner.tgz && rm -f runner.tgz
  ./bin/installdependencies.sh >/dev/null
fi
runuser -u github-runner -- ./config.sh --unattended --replace --url "$URL" --token "$TOKEN" --name racha-vps --labels racha-producao --work _work
./svc.sh install github-runner
./svc.sh start
./svc.sh status | head -5
echo
echo "✔ runner instalado. No GitHub (Settings › Actions › Runners) ele aparece como racha-vps (Idle)."
