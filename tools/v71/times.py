"""RACHA rua · v71 — TIMES PRETO × BRANCO (o pedido: "cores rivais no jogo preto x branco; o personagem padrão não é mais
amarelo: metade preto, metade branco; no time preto ele fica todo preto, no branco todo branco; nas salas também; com outra
skin que não seja a padrão, não muda").

As trocas de texto (SUBS) desta etapa; o resto mora em tools/v71/times.js (entra no fim do script). Nada aqui entra no
bloco de física (SUBS_PHYS fica vazio): só cor, nome de time e qual desenho de tampinha cada um usa.
"""

SUBS = [
    # ---- a tampinha PADRÃO nova (metade preta, metade branca) e as duas do time (toda preta, toda branca). Os códigos saem
    #      do mesmo formato das tampinhas personalizadas; a amarela de antes continua nos MODELOS PRONTOS ("Clássica").
    ("const tpNormal = a => a[0] === 50 && a[1] === 50 && a[2] === 50 && a[3] === 0;",
     "const tpNormal = a => a[0] === 50 && a[1] === 50 && a[2] === 50 && a[3] === 0;\n"
     "// v71: a tampinha PADRÃO é metade preta e metade branca; na partida ela fica toda preta no Time Preto e toda branca no\n"
     "// Time Branco (as outras tampinhas ficam como são). TP_PADRAO_ANTIGO = a amarela, a padrão até a v70.2.\n"
     "const TP_PADRAO_V71 = (fundo, metade, saia, pad) => ({k:'T', b:'cl', bc:[saia, '#5b636c'], p:pad, pc:[fundo, metade, '#1d1d1d'], pp:[50, 50, 50, 0], i:'--', ic:['#9aa0a8', '#1d1d1d'], ip:[50, 50, 50, 0], ie:0, t:''});\n"
     "const TP_PADRAO_COD = tpCodigo(TP_PADRAO_V71('#17191c', '#f2f0ea', '#c7ccd2', 'me'));\n"
     "const TP_TIME_COD = [tpCodigo(TP_PADRAO_V71('#17191c', '#f2f0ea', '#2e3238', 'li')), tpCodigo(TP_PADRAO_V71('#f2f0ea', '#f2f0ea', '#e9e6de', 'li'))];\n"
     "const TP_PADRAO_ANTIGO = tpCodigo(TP_PADRAO_D());"),
    ("const tpMinha = () => TP.equipada || tpCodigo(TP_PADRAO_D());",
     "const tpMinha = () => TP.equipada || TP_PADRAO_COD;   // v71: a padrão é a metade preta, metade branca"),
    ("|| TP_PADRAO_D(), px); }", "|| tpLe(TP_PADRAO_COD), px); }"),          # o clube: a tampinha de quem não tem uma válida

    # ---- a primeira vez: a tampinha que aparece é a padrão nova, e o texto explica o preto × branco
    ("drawBotao(g, 75, 75, 62, SEM_SKIN, null, false, EST0);",
     "drawBotao(g, 75, 75, 62, tpSkin(TP_PADRAO_COD) || SEM_SKIN, null, false, EST0);"),
    ("o seu time de amarelo, o adversário de azul.",
     "a padrão é metade preta e metade branca — no Time Preto ela fica toda preta, no Time Branco, toda branca."),

    # ---- o seu botão na partida: a padrão vira a do seu time (no treino, o seu time é o preto)
    ("drawPlayer(ctx, VIS.px, VIS.py, P.r, skinAtual(), perfil.nome,",
     "drawPlayer(ctx, VIS.px, VIS.py, P.r, tpNoTimeSk(skinAtual(), RQ.on ? P.time : 0), perfil.nome,"),
    # ---- no treino o seu halo é o do Time Preto (os companheiros também; o goleiro é do Branco)
    ("aroDe(g, P, VIS.px, VIS.py, skinAtual().cor, t);", "aroDe(g, P, VIS.px, VIS.py, skinDoTime(0).cor, t);"),
    # ---- o replay das salas também em preto × branco (era vermelho × azul)
    ("R.on ? (t ? '#2f6fe0' : '#e2412f') : skinDoTime(t).cor", "skinDoTime(t).cor"),

    # ---- o bot chamado para a sala neste aparelho joga com a padrão (no time, ela fica da cor dele)
    ("bot:true, name:nome, flag:'BR', skin:tpDoBot(nome),", "bot:true, name:nome, flag:'BR', skin:TP_PADRAO_COD,"),
    # ---- os nomes dos times: Time Vermelho × Equipe Azul viram Time Preto × Time Branco (as frases primeiro, depois os nomes)
    ("vai('TIME VERMELHO', 'vermelho',", "vai('TIME PRETO', 'preto',", 2),
    ("vai('EQUIPE AZUL', 'azul',", "vai('TIME BRANCO', 'branco',", 2),
    ("t < 0 ? '' : t ? 'azul' : 'vermelho'", "t < 0 ? '' : t ? 'branco' : 'preto'"),
    ("no Time Vermelho ou na Equipe Azul", "no Time Preto ou no Time Branco", 2),
    ("o Time Vermelho e a Equipe Azul", "o Time Preto e o Time Branco"),
    ("A Equipe Azul", "O Time Branco", 2),
    ("A EQUIPE AZUL", "O TIME BRANCO"),
    ("Equipe Azul", "Time Branco", 9),
    ("EQUIPE AZUL", "TIME BRANCO", 3),
    ("Time Vermelho", "Time Preto", 10),
    ("TIME VERMELHO", "TIME PRETO", 4),
    ("'SAÍDA DO ' + (RQ.saidaTime ? 'AZUL' : 'VERMELHO')", "'SAÍDA DO ' + (RQ.saidaTime ? 'BRANCO' : 'PRETO')"),
    ("' DO TIME '+(t?'AZUL':'VERMELHO')", "' DO TIME '+(t?'BRANCO':'PRETO')"),
]

SUBS_PHYS = []
