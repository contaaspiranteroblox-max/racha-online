"""v88 (aplicado por último, depois da v87): A ATUALIZAÇÃO COMPLETA DOS MENUS — amigos com status e convites em tempo real,
central de mensagens, correio com COLETAR validado no servidor, carteira e inventário na conta, loja por categorias, missões,
eventos, Passe RACHA, chat por canais, denúncias, estatísticas da conta, espectador, treinos novos, a tela de modo e mapa,
ajustes que faltavam e o controle Bluetooth. A física NÃO muda (o build continua conferindo o bloco de física).
O código novo mora em tools/v88/*.js (colado depois do site.js da v87, na ordem de ARQUIVOS) e o estilo em
app/public/game/v88.css. As trocas exatas abaixo mexem no mínimo do que já existia (falham alto se o texto mudar)."""
import pathlib, json
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []

# ---- o estilo da v88 depois dos outros
SUBS.append(('<link rel="stylesheet" href="./v82.css">\n', '<link rel="stylesheet" href="./v82.css">\n<link rel="stylesheet" href="./v88.css">\n'))

# ---- a sala hospedada (v83): o admin pausa a partida de verdade (o servidor já pausa o motor e avisa todo mundo — a turma
# aceita a pausa do admin fora da ranqueada; só o jogo não mandava). A ranqueada continua sem pausa.
SUBS.append(("    if (!NET49.host) return x49Toast('Esta partida está rodando no servidor: daqui não dá para pausar.');\n",
             "    if (!NET49.host && !(r.servidor && !r.ranked && !r.local)) return x49Toast('Esta partida está rodando no servidor: daqui não dá para pausar.');   // v88: na sala hospedada o admin pausa pelo servidor\n"))

# ---- o código novo, depois do site.js da v87 (o fim dele: o texto do presente de teste)
ARQUIVOS = [n for n in ('base.js', 'lobby.js', 'amigos.js', 'mensagens.js', 'loja.js', 'cosmeticos.js', 'progressao.js', 'clube.js',
                        'chat.js', 'estatisticas.js', 'espectador.js', 'treino.js', 'modos.js', 'ajustes.js', 'controle.js') if (AQUI / n).exists()]
CODIGO = '\n'.join((AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
# o catálogo da loja (app/contracts/catalogo88.json: o MESMO arquivo que a plataforma usa para conferir preço e item)
CAT = RAIZ / 'app' / 'contracts' / 'catalogo88.json'
if CAT.exists():
    CODIGO = 'const CAT88 = ' + json.dumps(json.loads(CAT.read_text(encoding='utf-8')), ensure_ascii=False, separators=(',', ':')) + ';\n' + CODIGO
SUBS.append(("  if (window.RACHA_MODO !== 'demo'){ const t = LB.popCaixa && LB.popCaixa.querySelector('.pop-txt'); if (t) t.textContent = 'Presente de teste: moedas e gemas para experimentar a loja à vontade.'; }\n};\n",
             "  if (window.RACHA_MODO !== 'demo'){ const t = LB.popCaixa && LB.popCaixa.querySelector('.pop-txt'); if (t) t.textContent = 'Presente de teste: moedas e gemas para experimentar a loja à vontade.'; }\n};\n"
             + ("/* ======================================================================= RACHA v88 (tools/v88/*.js) */\n" + CODIGO if CODIGO.strip() else '')))
