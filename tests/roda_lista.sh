#!/usr/bin/env bash
# RACHA · roda os testes da lista (sem refazer o build) e guarda a saída INTEIRA de cada um em $LOGS (padrão tests/saida/logs).
# Uso: bash tests/roda_lista.sh regras camera online online--p2p servidor_test.js ...   (nome do teste Python sem _test.py, ou o arquivo .js/.mjs)
cd "$(dirname "$0")/.." || exit 1
LOGS=${LOGS:-tests/saida/logs}; mkdir -p "$LOGS"
falhou=0
for t in "$@"; do
  case "$t" in
    guard) cmd=(bash -c 'node tests/compila_guard.cjs && node tests/guard_test.mjs') ;;
    *.mjs|*.js|*.cjs) cmd=(node "tests/$t") ;;
    *--p2p) cmd=(python3 "tests/${t%--p2p}_test.py" --p2p) ;;
    *) cmd=(python3 "tests/${t}_test.py") ;;
  esac
  nome=${t%.*}
  t0=$(date +%s)
  timeout 1200 "${cmd[@]}" > "$LOGS/$nome.txt" 2>&1; rc=$?
  t1=$(date +%s)
  [ $rc -ne 0 ] && falhou=1
  resumo=$(grep -E 'verificações ok|[0-9]+ ok, [0-9]+ falharam' "$LOGS/$nome.txt" | tail -1)
  [ -z "$resumo" ] && resumo=$(grep -E 'Error|error' "$LOGS/$nome.txt" | tail -1 | cut -c1-160)
  nf=$(grep -c 'FALHOU' "$LOGS/$nome.txt")
  printf '%-26s rc=%-3s %5ss  FALHOU=%-3s %s\n' "$nome" "$rc" "$((t1-t0))" "$nf" "$resumo"
done
exit $falhou
