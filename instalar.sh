#!/bin/bash
# =====================================================================================
#  RACHA — instala (ou atualiza) o jogo num servidor Ubuntu 22.04 ou 24.04 (VPS).
#
#  Entre no servidor como root (no celular: app Termius) e cole:
#     curl -fsSL https://raw.githubusercontent.com/contaaspiranteroblox-max/racha-online/main/instalar.sh | bash
#  Para ATUALIZAR o jogo depois (clubes e campeões ficam guardados):
#     atualizar-racha
#
#  O que ele faz:
#   1. instala o Node.js, o git e o Caddy (o Caddy dá o cadeado https sozinho, de graça)
#   2. baixa o jogo do GitHub em /opt/racha
#   3. deixa o servidor do jogo sempre ligado (volta sozinho se cair ou se a máquina reiniciar)
#   4. libera as portas no firewall do Ubuntu (se ele estiver ligado)
#   5. link com cadeado: https://IP-COM-TRACINHOS.sslip.io (não precisa comprar domínio)
#
#  Opções (ficam guardadas em /etc/racha.conf para as próximas atualizações):
#     DOMINIO=meujogo.com.br     usa o seu domínio no lugar do sslip.io (aponte o domínio para o IP antes)
#     SERVER_NAME="São Paulo"    o nome em "Servidor: …" na sala
#     RAMO=main  REPO=https://github.com/…/….git     de onde baixar o jogo
#  Exemplo:  curl -fsSL …/instalar.sh | DOMINIO=meujogo.com.br bash
# =====================================================================================
if [ -z "${BASH_VERSION:-}" ]; then echo "Rode com bash:  curl -fsSL …/instalar.sh | bash"; exit 1; fi

INSTALADOR=1                      # (sobe quando o instalador muda: quem atualiza passa a usar o novo)
REPO_PADRAO="https://github.com/contaaspiranteroblox-max/racha-online.git"
RAMO_NOVO="correcao-lag-e-dono"   # enquanto a versão nova não entra na main, ela mora neste ramo
PASTA=/opt/racha
DADOS=/var/lib/racha
CONF=/etc/racha.conf

falha(){
  echo
  echo "  ✗ Não deu certo: $*"
  echo "  (rode de novo; se repetir, tire um print desta tela e peça ajuda)"
  exit 1
}

espera(){                         # espera URL SEGUNDOS: a página responde?
  local fim=$((SECONDS + $2))
  while [ "$SECONDS" -lt "$fim" ]; do
    curl -fsS --max-time 3 "$1" >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

ws_ok(){                          # ws_ok URL: as salas (WebSocket) passam por ali? (a resposta tem que ser "101")
  local r
  r="$(curl -sS -i -N --http1.1 --max-time 3 -H 'Connection: Upgrade' -H 'Upgrade: websocket' \
       -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: SGVsbG8sIFJhY2hhISEhIQ==' "$1" 2>/dev/null | head -n 1)"
  [[ "$r" == *" 101"* ]]
}

pega(){ git fetch -q --depth 1 "$REPO" "$1" >/dev/null 2>&1; }    # pega RAMO: baixa a versão mais nova do ramo

servico(){                        # servico PORTA: o jogo como serviço do sistema (sempre ligado)
  local extra=""
  [ "$1" -lt 1024 ] && extra="AmbientCapabilities=CAP_NET_BIND_SERVICE"
  cat > /etc/systemd/system/racha.service <<EOF
[Unit]
Description=Racha - servidor do jogo (salas online)
After=network-online.target
Wants=network-online.target

[Service]
User=racha
WorkingDirectory=$PASTA
Environment=PORT=$1
Environment=DATA_DIR=$DADOS/dados
Environment="SERVER_NAME=$NOME"
ExecStart=$(command -v node) server.js
Restart=always
RestartSec=2
LimitNOFILE=65535
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true
$extra

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable racha >/dev/null 2>&1
  systemctl restart racha
}

principal(){
  set -uo pipefail
  export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a NEEDRESTART_SUSPEND=1 GIT_TERMINAL_PROMPT=0
  APT="apt-get -y -qq -o DPkg::Lock::Timeout=600 -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold"
  [ "$(id -u)" = 0 ] || falha "rode como root (ou com sudo)."
  command -v apt-get >/dev/null 2>&1 && command -v systemctl >/dev/null 2>&1 || falha "este instalador é para Ubuntu (precisa do apt e do systemd)."

  # as opções: o que veio agora > o que ficou guardado > o padrão
  local E_REPO="${REPO:-}" E_RAMO="${RAMO:-}" E_DOM="${DOMINIO:-}" E_NOME="${SERVER_NAME:-}"
  REPO=""; RAMO=""; DOMINIO=""; SERVER_NAME=""
  if [ -f "$CONF" ]; then . "$CONF"; fi
  REPO="${E_REPO:-${REPO:-$REPO_PADRAO}}"
  RAMO="${E_RAMO:-${RAMO:-}}"
  DOMINIO="$(printf '%s' "${E_DOM:-${DOMINIO:-}}" | tr -cd 'a-zA-Z0-9.-')"
  NOME="$(printf '%s' "${E_NOME:-${SERVER_NAME:-South America}}" | tr -d '"\\\n' | cut -c1-32)"

  echo "==> 1/5 Instalando o que o jogo precisa (2 a 3 minutos)..."
  local i ok=0
  for i in $(seq 1 40); do
    if apt-get update -qq >/dev/null 2>&1; then ok=1; break; fi
    [ "$i" = 1 ] && echo "    (o Ubuntu está fazendo uma atualização automática; esperando ela acabar...)"
    sleep 6
  done
  [ "$ok" = 1 ] || falha "não consegui atualizar a lista de programas (apt-get update)."
  $APT install curl ca-certificates git >/dev/null 2>&1 || falha "não consegui instalar o curl e o git."
  if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)" -lt 18 ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource.sh && bash /tmp/nodesource.sh >/dev/null 2>&1
    $APT install nodejs >/dev/null 2>&1 || falha "não consegui instalar o Node.js."
  fi
  command -v node >/dev/null 2>&1 || falha "o Node.js não ficou instalado."
  CADDY=1
  if ! command -v caddy >/dev/null 2>&1 && ! $APT install caddy >/dev/null 2>&1; then
    # (o Ubuntu não tinha o Caddy: vem do repositório oficial dele)
    $APT install gnupg >/dev/null 2>&1
    if curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key 2>/dev/null | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null \
       && curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt -o /etc/apt/sources.list.d/caddy-stable.list 2>/dev/null; then
      chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
      apt-get update -qq >/dev/null 2>&1
      $APT install caddy >/dev/null 2>&1 || CADDY=0
    else
      CADDY=0
      rm -f /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
    fi
  fi
  echo "    Node $(node -v)$([ "$CADDY" = 1 ] && echo ' · Caddy ok' || echo ' · sem o Caddy (fica sem cadeado)')"

  echo "==> 2/5 Baixando o jogo do GitHub..."
  mkdir -p "$PASTA" && cd "$PASTA" || falha "não consegui criar a pasta $PASTA."
  [ -d .git ] || git init -q . >/dev/null 2>&1 || falha "não consegui preparar a pasta $PASTA."
  local R=""
  if [ -n "$RAMO" ]; then
    pega "$RAMO" && R="$RAMO"
  elif pega main && git cat-file -e FETCH_HEAD:instalar.sh 2>/dev/null; then
    R=main                        # (a versão nova já entrou na main)
  elif pega "$RAMO_NOVO"; then
    R="$RAMO_NOVO"
  elif pega main; then
    R=main
  fi
  [ -n "$R" ] || falha "não consegui baixar o jogo de $REPO (a internet do servidor está funcionando?)."
  git reset -q --hard FETCH_HEAD >/dev/null 2>&1 || falha "não consegui atualizar os arquivos do jogo."
  [ -f server.js ] && [ -f public/index.html ] || falha "o jogo baixado está sem o server.js ou o public/index.html."
  echo "    pronto (ramo $R)"
  local NOVO                      # o instalador que veio do GitHub é mais novo que este? continua com ele
  NOVO="$(sed -n 's/^INSTALADOR=\([0-9][0-9]*\).*/\1/p' instalar.sh 2>/dev/null | head -n 1)"
  if [ -z "${RACHA_DE_NOVO:-}" ] && [ "${NOVO:-0}" -gt "$INSTALADOR" ]; then
    echo "    (o instalador também mudou: continuando com o novo)"
    RACHA_DE_NOVO=1 exec bash "$PASTA/instalar.sh"
  fi

  echo "==> 3/5 Ligando o servidor do jogo..."
  id racha >/dev/null 2>&1 || useradd --system --home-dir "$DADOS" --create-home --shell /usr/sbin/nologin racha \
    || falha "não consegui criar o usuário racha."
  mkdir -p "$DADOS/dados" && chown -R racha:racha "$DADOS"
  PORTA=8080                      # (o jogo na 8080 com o Caddy na frente; sem o Caddy, o jogo vai direto na 80)
  [ "$CADDY" = 1 ] || PORTA=80
  servico "$PORTA"
  espera "http://127.0.0.1:$PORTA/health" 30 || falha "o servidor do jogo não ligou. Veja o motivo com:  journalctl -u racha -n 30 --no-pager"
  VERSAO="$(curl -fsS --max-time 3 "http://127.0.0.1:$PORTA/health" 2>/dev/null | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')"
  echo "    ligado: versão ${VERSAO:-?}"

  echo "==> 4/5 Firewall..."
  if command -v ufw >/dev/null 2>&1 && [[ "$(ufw status 2>/dev/null)" == *"Status: active"* ]]; then
    ufw allow 22/tcp >/dev/null 2>&1; ufw allow 80/tcp >/dev/null 2>&1; ufw allow 443/tcp >/dev/null 2>&1
    echo "    portas 80 e 443 liberadas"
  else
    echo "    (o firewall do Ubuntu está desligado: nada a fazer)"
  fi

  echo "==> 5/5 Link com cadeado (https)..."
  local IP HOST LINK MODO=direto
  IP="$(curl -fsS4 --max-time 8 https://api.ipify.org 2>/dev/null || true)"
  [[ "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
  HOST="${DOMINIO:-$(printf '%s' "$IP" | tr . -).sslip.io}"
  LINK="http://$IP"
  if [ "$CADDY" = 1 ]; then
    cat > /etc/caddy/Caddyfile <<EOF
# Racha (feito pelo instalar.sh; rodar o instalador de novo reescreve este arquivo)
# o jogo com cadeado: o certificado é automático e renova sozinho
$HOST {
	reverse_proxy 127.0.0.1:8080
}
# pelo IP, sem cadeado
:80 {
	reverse_proxy 127.0.0.1:8080
}
EOF
    systemctl enable caddy >/dev/null 2>&1
    systemctl restart caddy
    if espera http://127.0.0.1/health 20 && ws_ok http://127.0.0.1/; then MODO=caddy; fi
  fi
  if [ "$MODO" = caddy ]; then
    echo "    pedindo o cadeado para $HOST (até 1 minuto)..."
    if espera "https://$HOST/health" 75; then
      LINK="https://$HOST"
    else
      echo "    (o cadeado ainda não saiu: o Caddy continua tentando sozinho; o link sem cadeado já funciona)"
    fi
  else
    [ "$CADDY" = 1 ] && echo "    (o Caddy não funcionou aqui: o jogo vai direto na porta 80, sem cadeado)"
    systemctl disable --now caddy >/dev/null 2>&1
    if [ "$PORTA" != 80 ]; then
      PORTA=80
      servico 80
      espera http://127.0.0.1/health 30 || falha "o servidor do jogo não ligou na porta 80. Veja o motivo com:  journalctl -u racha -n 30 --no-pager"
    fi
  fi

  cat > /usr/local/bin/atualizar-racha <<EOF
#!/bin/bash
# atualizar-racha: baixa a versão mais nova do Racha do GitHub e reinicia o jogo (clubes e campeões ficam)
exec bash $PASTA/instalar.sh "\$@"
EOF
  chmod 755 /usr/local/bin/atualizar-racha
  {
    echo "# Racha: opções do instalar.sh (mude aqui e rode: atualizar-racha)"
    [ "$REPO" != "$REPO_PADRAO" ] && echo "REPO=\"$REPO\""
    [ -n "$RAMO" ] && echo "RAMO=\"$RAMO\""
    [ -n "$DOMINIO" ] && echo "DOMINIO=\"$DOMINIO\""
    echo "SERVER_NAME=\"$NOME\""
  } > "$CONF"

  echo
  echo "  =============================================="
  echo "   RACHA NO AR!  (versão ${VERSAO:-?})"
  echo
  echo "   Link do jogo:  $LINK"
  [ "$LINK" != "http://$IP" ] && echo "   Sem cadeado:   http://$IP"
  [ "$MODO" = caddy ] && [ "$LINK" = "http://$IP" ] && echo "   Com cadeado:   https://$HOST  (em alguns minutos)"
  echo
  echo "   Para atualizar o jogo depois:  atualizar-racha"
  echo "  =============================================="
}

principal "$@"
