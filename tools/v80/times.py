"""RACHA rua · v80 — TIME A (LARANJA) × TIME B (ROXO) e a tampinha inicial no modelo Listras.

O pedido: "Time A — laranja #FF6A00 (no placar e na identificação do Time A); Time B — roxo #7A3FC4. A tampinha inicial
gratuita usa o modelo Listras do editor: sem equipe, metade laranja e metade roxa (divisão vertical, no meio, sem branco,
com a borda e os detalhes de sempre); no Time A, toda laranja; no Time B, toda roxa; na hora em que troca de time, para
todos; sem equipe, volta para a metade/metade. Só a padrão muda: as compradas, desbloqueadas e personalizadas ficam como são."

As trocas de texto (SUBS) desta etapa; o resto mora em tools/v80/times.js (entra no fim do script). Nada aqui entra no bloco
de física (SUBS_PHYS fica vazio): só o desenho da tampinha padrão, o nome dos times e a classe dos botões dos times.
Os arquivos JS da v80 não escrevem os nomes antigos dos times (as contas abaixo valem para o arquivo inteiro).
"""

SUBS = [
    # ---- a tampinha PADRÃO: o modelo Listras com uma listra só, do meio para a direita (pp: posição 76, tamanho 84 → a listra
    #      começa no centro e passa da borda; a vizinha fica fora), o fundo laranja à esquerda e a listra roxa à direita; a
    #      borda (Clássica, a saia prateada) é a de sempre. No time ela fica de uma cor só (o mesmo modelo, as duas cores iguais).
    #      TP_PADRAO_PB = a padrão da v71 (metade preta, metade branca): só para quem estava com ela passar para a nova.
    ("const TP_PADRAO_COD = tpCodigo(TP_PADRAO_V71('#17191c', '#f2f0ea', '#c7ccd2', 'me'));",
     "const TP_PADRAO_PB = tpCodigo(TP_PADRAO_V71('#17191c', '#f2f0ea', '#c7ccd2', 'me'));   // v80: a padrão da v71 (só para a troca)\n"
     "const TP_PADRAO_V80 = (esq, dir) => Object.assign(TP_PADRAO_V71(esq, dir, '#c7ccd2', 'ls'), {pp:[76, 50, 84, 0]});   // v80: Listras, uma listra do meio para a direita\n"
     "const TP_PADRAO_COD = tpCodigo(TP_PADRAO_V80('#ff6a00', '#7a3fc4'));   // v80: sem equipe, metade laranja (esquerda) e metade roxa (direita)"),
    ("const TP_TIME_COD = [tpCodigo(TP_PADRAO_V71('#17191c', '#f2f0ea', '#2e3238', 'li')), tpCodigo(TP_PADRAO_V71('#f2f0ea', '#f2f0ea', '#e9e6de', 'li'))];",
     "const TP_TIME_COD = [tpCodigo(TP_PADRAO_V80('#ff6a00', '#ff6a00')), tpCodigo(TP_PADRAO_V80('#7a3fc4', '#7a3fc4'))];   // v80: no Time A toda laranja; no Time B toda roxa"),

    # ---- a primeira vez: o texto que explica a tampinha (antes da troca geral dos nomes)
    ("a padrão é metade preta e metade branca — no Time Preto ela fica toda preta, no Time Branco, toda branca.",
     "a padrão é a Listras, metade laranja e metade roxa — no Time A ela fica toda laranja; no Time B, toda roxa."),

    # ---- no treino você não está em nenhum time: a padrão fica metade/metade (antes ficava a do time da esquerda)
    ("tpNoTimeSk(skinAtual(), RQ.on ? P.time : 0)", "tpNoTimeSk(skinAtual(), RQ.on ? P.time : -1)"),

    # ---- as frases com o nome curto do time
    ("'SAÍDA DO ' + (RQ.saidaTime ? 'BRANCO' : 'PRETO')", "'SAÍDA DO ' + (RQ.saidaTime ? 'TIME B' : 'TIME A')"),
    ("' DO TIME '+(t?'BRANCO':'PRETO')", "' DO TIME '+(t?'B':'A')"),

    # ---- os botões que mandam alguém para um time: o nome e a classe (a cor mora no v80.css)
    ("vai('TIME PRETO', 'preto',", "vai('TIME A', 'time-a',", 2),
    ("vai('TIME BRANCO', 'branco',", "vai('TIME B', 'time-b',", 2),
    ("t < 0 ? '' : t ? 'branco' : 'preto'", "t < 0 ? '' : t ? 'time-b' : 'time-a'"),   # (roxo já é a classe do botão neutro)

    # ---- os nomes dos times em todo o resto (telas, mensagens, a sala, o árbitro e os comentários)
    ("Time Preto", "Time A", 16),
    ("Time Branco", "Time B", 16),
    ("TIME PRETO", "TIME A", 5),
    ("TIME BRANCO", "TIME B", 5),
]

SUBS_PHYS = []
