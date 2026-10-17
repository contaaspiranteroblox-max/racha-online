"""RACHA rua · v70.2 — ENXUTO (o pedido: "remova todos os modos, deixe o normal e o com curva; um estádio de grama
também; o resto dos campos sai; tire os efeitos da bola; o indicador já vem desligado").

As trocas de texto (SUBS) desta etapa; o resto mora em tools/v70/enxuto.js (entra no fim do script, depois do
celular.js). Nada aqui entra no bloco de física (SUBS_PHYS fica vazio): o Estádio novo usa as mesmas medidas, margens,
paredes, gols e o mesmo fator da bola da Arena — só o desenho é outro.
Os modos e mapas que saíram NÃO foram apagados: só não aparecem mais (a lista do que aparece fica em V702, no
enxuto.js). O código deles continua no jogo, para voltar se um dia quiser.
"""

SUBS = [
    # ---- o ESTÁDIO de grama: um mapa novo no fim do CAMPOS (índice 4: o que já estava salvo continua apontando para o mesmo mapa).
    #      As medidas são as da Arena (margem 206 × 59, FATOR_BOLA, rede, entra no gol pela boca): a física é a mesma.
    ("fundo:'#26283a', morro:true}   // v61: a quadra debaixo do elevado",
     "fundo:'#26283a', morro:true},   // v61: a quadra debaixo do elevado"),
    ("\n];\nconst CHINELO_R = 0.55",
     "\n  {id:'gramado', nome:'Estádio', margem:[206, 59], fatorBola:FATOR_BOLA, rede:true, entraGol:true, fundo:'#1d2326', grama:true}   "
     "// v70.2: o ESTÁDIO de grama (as medidas e a bola da Arena; o desenho é o gramado com a arquibancada)\n];\nconst CHINELO_R = 0.55"),

    # ---- a Seta da direção começa desligada (quem já jogava: o enxuto.js desliga uma vez; depois vale o que escolher)
    ("const OPC_PADRAO = {lag:true, torc:true, efx:true, dir:true, verFps:false, replay:true};",
     "const OPC_PADRAO = {lag:true, torc:true, efx:true, dir:false, verFps:false, replay:true};   // v70.2: a Seta da direção começa desligada"),
    ("<b>Seta da direção</b><small>Setinha para onde você vai</small>",
     "<b>Seta da direção</b><small>Setinha para onde você vai (começa desligado)</small>"),

    # ---- o Estádio é tratado como a Arena onde o jogo pergunta "é o estádio?"
    ("c = CAMPO.id === 'estadio' && !q.plano ? Math.min(1, q.cena) : q.cena;",
     "c = (CAMPO.id === 'estadio' || CAMPO.grama) && !q.plano ? Math.min(1, q.cena) : q.cena;"),                    # o teto de resolução do cenário
    ("campo(id){ ambTipo = id === 'estadio' ? 'estadio' : 'favela'; ajustaAmbiente(); }",
     "campo(id){ ambTipo = id === 'estadio' || id === 'gramado' ? 'estadio' : 'favela'; ajustaAmbiente(); }"),     # o som de fundo: a torcida, não a rua
    ("const est = CAMPO.id === 'estadio', fav = CAMPO.id === 'favela', P = est ? 0 : MR_PASSEIO + 30;",
     "const est = CAMPO.id === 'estadio' || !!CAMPO.grama, fav = CAMPO.id === 'favela', P = est ? 0 : MR_PASSEIO + 30;"),   # a prévia do JOGAR
    ("if (cp.morro || cp.id === 'estadio' || (favela && (RQP.n > 1 || !cp.img1v1))){",
     "if (cp.morro || cp.id === 'estadio' || cp.grama || (favela && (RQP.n > 1 || !cp.img1v1))){"),

    # ---- CRIAR SALA: o seletor de CAMPO só com os mapas que aparecem
    ("sxSeletor('CAMPO', CAMPOS.map((_, i) => i), F.map, v => slCampo(v), v => { F.map = v; amigosRender(); }),",
     "sxSeletor('CAMPO', v702Mapas(), v702Mapa(F.map), v => slCampo(v), v => { F.map = v; amigosRender(); }),"),

    # ---- os textos dos Efeitos na Quadra (a bola não tem mais rastro nem respingo)
    ("<small>Confete, rojão, respingo do chute e rastro da bola</small>",
     "<small>Confete do gol, nome da jogada e brilho do chute</small>"),
    ("'aj-efx':['Efeitos na quadra', 'O respingo de tinta, o rastro da bola e o brilho do chute'],",
     "'aj-efx':['Efeitos na quadra', 'O confete do gol, o nome da jogada e o brilho do chute (a bola não tem efeito)'],"),

    # ---- PERFIL › estatísticas: o cartão de gols não cita mais a ginga
    ("G.appendChild(um(EST_GOL, 'GOLS', 'm', 'futebol, curva e ginga'));",
     "G.appendChild(um(EST_GOL, 'GOLS', 'm', 'nas partidas'));"),
]

SUBS_PHYS = []
