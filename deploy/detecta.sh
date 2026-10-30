#!/usr/bin/env bash
# RACHA · DETECTA como o jogo está instalado nesta VPS (só LÊ: não muda nada).
# Uso (como root):   bash deploy/detecta.sh
# Mostra: o sistema, o Node, o MySQL, os processos do RACHA (pm2, systemd, docker, node solto), as pastas com o RACHA, a porta
# em uso, o arquivo .env (só os NOMES das variáveis, nunca os valores) e o arquivo de dados das salas. No fim, sugere o
# comando do prepara-vps.sh. Copie a saída e mande para quem vai configurar.
set -u
t(){ printf '\n== %s\n' "$1"; }
t 'sistema'; (. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME"); uname -m; echo "memória: $(free -h 2>/dev/null | awk '/Mem:/{print $2}') · disco livre em /: $(df -h / | awk 'NR==2{print $4}')"
t 'node e ferramentas'; for c in node npm pm2 docker mysql mysqldump git nginx caddy; do printf '%-10s ' "$c"; command -v "$c" >/dev/null && ("$c" --version 2>/dev/null | head -1) || echo '(não tem)'; done
t 'processos do RACHA'
ps -eo pid,user,etime,args | grep -E 'node|racha' | grep -v -E 'grep|detecta.sh' || echo '(nenhum processo node)'
command -v pm2 >/dev/null && { echo '-- pm2:'; pm2 list 2>/dev/null; for h in /home/*; do u=$(basename "$h"); sudo -u "$u" pm2 list 2>/dev/null | grep -q online && { echo "-- pm2 do usuário $u:"; sudo -u "$u" pm2 list; }; done; }
echo '-- systemd:'; systemctl list-units --type=service --all 2>/dev/null | grep -i -E 'racha|node|streetball' || echo '(nenhum serviço com racha/node no nome)'
command -v docker >/dev/null && { echo '-- docker:'; docker ps -a --format '{{.Names}}  {{.Image}}  {{.Status}}  {{.Ports}}' 2>/dev/null; }
t 'portas em uso (TCP, escutando)'; ss -ltnp 2>/dev/null | grep -E 'node|nginx|caddy|docker|mysql' || ss -ltn
t 'pastas com o RACHA'
for d in $(find / -xdev \( -path /proc -o -path /sys -o -path '*/node_modules' \) -prune -o -name 'server.js' -path '*' -print 2>/dev/null | xargs -r grep -l 'servidor.js' 2>/dev/null | xargs -r -n1 dirname); do
  echo "-- $d"; (cd "$d" && { git log -1 --format='   git: %h %s (%cr)' 2>/dev/null || echo '   (não é um clone git)'; grep -m1 '"version"' package.json 2>/dev/null | sed 's/^/   /'; [ -d app/dist ] && echo '   app/dist existe: a PLATAFORMA (contas, MySQL) foi construída aqui'; [ -f app/.env ] && echo "   app/.env com: $(grep -o '^[A-Z_]*' app/.env | tr '\n' ' ')"; [ -f .env ] && echo "   .env com: $(grep -o '^[A-Z_]*' .env | tr '\n' ' ')"; ls server/dados/*.json 2>/dev/null | sed 's/^/   dados das salas: /'; })
done
t 'configuração do deploy automático (se já existe)'; ls -la /etc/racha /opt/racha 2>/dev/null || echo '(ainda não configurado)'
t 'sugestão'
if ps -eo args | grep -q '[d]ist/boot.js'; then echo 'MODO=plataforma (o processo roda app/dist/boot.js: contas + MySQL + salas no mesmo endereço)';
elif ps -eo args | grep -q -E '[s]erver.js|[s]ervidor.js'; then echo 'MODO=salas (o processo roda server.js: o jogo e as salas, sem a plataforma de contas)';
else echo 'Nenhum processo do RACHA rodando agora: confira acima qual pasta tem o projeto.'; fi
echo 'Depois: sudo bash deploy/prepara-vps.sh --modo <salas|plataforma> --porta <a porta de agora> --importar <a pasta de agora>'
