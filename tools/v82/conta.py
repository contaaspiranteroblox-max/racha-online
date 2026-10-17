"""RACHA rua · v82 — AS CONTAS: as trocas de texto desta etapa (o resto mora em tools/v82/conta.js, no fim do script).

1) O script de entrada (tools/v82/inicio.js) vai ANTES do script do jogo: ele separa o progresso de cada conta neste aparelho e
   põe a cópia da conta no lugar antes de o jogo ler o armazenamento (o jogo lê tudo ao carregar e grava o que tem na memória
   ao fechar — por isso não dá para trocar depois).
2) Exportar/importar o progresso (Ajustes › Conta) não leva nem apaga as gavetas das contas, as cópias da conta e o id do aparelho
   (racha-dono, racha-guarda:*, racha-nuvem:*, racha-aparelho, racha-82-*).
3) Com a conta, os prêmios das missões não mostram o XP do aparelho (quem dá XP da conta é o servidor: partidas e gols de
   treino). Sem a v82 (c82SemXpLocal não existe), fica como era.
Nada aqui entra no bloco de física (SUBS_PHYS vazio).
"""
from pathlib import Path

_INICIO = (Path(__file__).resolve().parent / 'inicio.js').read_text(encoding='utf-8')
_ANCORA = "<script>\n(function(){\n'use strict';\n/* v62: O SERVIDOR DO JOGO"

SUBS = [
    (_ANCORA, "<script>\n/* RACHA rua v82: as contas (tools/v82/inicio.js) */\n" + _INICIO + "\n</script>\n" + _ANCORA),
    ("const PX_CHAVES = /^(streetball-|racha-)/;",
     "const PX_CHAVES = /^(streetball-|racha-(?!dono$|guarda:|nuvem:|aparelho$|82-))/;   // v82: sem as gavetas das contas, as cópias da conta e o id do aparelho"),
    ("  aviso('+' + [p.m ? fmtNum(p.m) + ' moedas' : '', p.g ? p.g + ' gemas' : '', p.xp ? p.xp + ' XP' : ''].filter(Boolean).join(' · '));",
     "  aviso('+' + [p.m ? fmtNum(p.m) + ' moedas' : '', p.g ? p.g + ' gemas' : '', p.xp && !(typeof c82SemXpLocal === 'function' && c82SemXpLocal()) ? p.xp + ' XP' : ''].filter(Boolean).join(' · '));   // v82: com a conta, sem o XP do aparelho"),
    ("'<i class=\"ic-moeda\"></i>' + D.m + ' · ' + D.xp + ' XP'",
     "'<i class=\"ic-moeda\"></i>' + D.m + (typeof c82SemXpLocal === 'function' && c82SemXpLocal() ? '' : ' · ' + D.xp + ' XP')"),
]
SUBS_PHYS = []
