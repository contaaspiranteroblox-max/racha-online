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

# ---- o som: a MÚSICA e os EFEITOS com volume próprio (Ajustes › Áudio). O Volume de sempre continua sendo o geral, por cima
# dos dois; a música (o funk do lobby e do paredão) passa a ter o seu canal, e o resto (chute, torcida, apito, botões) o dele.
SUBS.append(("  function aplicarVol(){ if (mestre) mestre.gain.setTargetAtTime(mudo ? 0 : vol, agora(), .05); }\n",
             "  let geral88 = null, musBus88 = null, mus88 = 1, efx88 = 1;   // v88: a música e os efeitos, cada um com o seu volume (o geral fica por cima)\n"
             "  try { const o = JSON.parse(localStorage.getItem('racha88-som') || 'null'); if (o){ if (o.mus >= 0 && o.mus <= 100) mus88 = o.mus/100; if (o.efx >= 0 && o.efx <= 100) efx88 = o.efx/100; } } catch (_) {}\n"
             "  function aplicarVol(){ if (geral88) geral88.gain.setTargetAtTime(mudo ? 0 : vol, agora(), .05); }\n"))
SUBS.append(("      mestre = ac.createGain(); mestre.gain.value = mudo ? 0 : vol; mestre.connect(ac.destination);\n",
             "      geral88 = ac.createGain(); geral88.gain.value = mudo ? 0 : vol; geral88.connect(ac.destination);   // v88: o geral; embaixo dele, os efeitos (mestre) e a música\n"
             "      mestre = ac.createGain(); mestre.gain.value = efx88; mestre.connect(geral88);\n"
             "      musBus88 = ac.createGain(); musBus88.gain.value = mus88; musBus88.connect(geral88);\n"))
SUBS.append(("    musIn.connect(musLP); musLP.connect(musG); musG.connect(mestre);",
             "    musIn.connect(musLP); musLP.connect(musG); musG.connect(musBus88 || mestre);"))
SUBS.append(("    get volume(){ return Math.round(vol*100); },\n",
             "    get volume(){ return Math.round(vol*100); },\n"
             "    get mistura(){ return {musica:Math.round(mus88*100), efeitos:Math.round(efx88*100)}; },   // v88\n"
             "    setMistura(m, e){\n"
             "      if (m != null && isFinite(m)) mus88 = Math.max(0, Math.min(1, m/100));\n"
             "      if (e != null && isFinite(e)) efx88 = Math.max(0, Math.min(1, e/100));\n"
             "      if (ac){ if (musBus88) musBus88.gain.setTargetAtTime(mus88, agora(), .05); if (mestre) mestre.gain.setTargetAtTime(efx88, agora(), .05); }\n"
             "      try { localStorage.setItem('racha88-som', JSON.stringify({mus:Math.round(mus88*100), efx:Math.round(efx88*100)})); } catch (_) {}\n"
             "    },\n"))

# ---- v88.1: O MESMO NÚMERO, OUTRA CONTA. Depois do ZERAR CONTAS (RACHA CONTROL › Contas) os números voltam a ser usados
# (000002…): o que o aparelho guardava para a conta APAGADA com o número de quem chegou não pode virar dela. O começo do jogo
# (tools/v82/inicio.js, antes de o jogo ler as chaves) confere a hora em que a conta nasceu (guardada aqui na primeira vez;
# diferente = outra conta) e, para o que ficou de antes desta versão, a hora do zerar (a conta nasceu depois dela) — e tira a
# gaveta, a cópia da conta e o que ia entrar daquele número. A ponte do login (tools/v84/login_cedo.js) passa a hora em que
# a conta nasceu e o que o SERVIDOR diz: se ela nasceu depois do último zerar (sem comparar relógios — o do banco, o do servidor
# e o do aparelho podem não bater; o zerar apaga todas as contas menos a 000001, então qualquer outra nasceu depois dele).
SUBS.append(("  // 2) de quem é o progresso que está nas chaves\n",
             "  // v88.1: o mesmo número, outra conta (depois do ZERAR CONTAS do dono do RACHA): o que era da conta apagada sai antes de o jogo ler\n"
             "  if (R.dono && R.conta){\n"
             "    var nasc881 = +R.conta.nasc || 0, depois881 = !!R.conta.depois, kN881 = 'racha-82-nasc:' + R.dono, antes881 = +le(kN881) || 0;\n"
             "    if (nasc881 > 0){\n"
             "      var tem881 = le('racha-dono') === R.dono || le('racha-guarda:' + R.dono) !== null || le('racha-nuvem:' + R.dono) !== null || le('racha-82-entra:' + R.dono) !== null;\n"
             "      if (tem881 && (antes881 ? antes881 !== nasc881 : depois881)){\n"
             "        grava('racha-guarda:' + R.dono, null); grava('racha-nuvem:' + R.dono, null); grava('racha-82-entra:' + R.dono, null);\n"
             "        if (le('racha-dono') === R.dono) poe({});\n"
             "        R.apagouVelha = true;\n"
             "      }\n"
             "      grava(kN881, String(nasc881));\n"
             "    }\n"
             "  }\n"
             "  // 2) de quem é o progresso que está nas chaves\n"))
SUBS.append(("        rq: c.rq ? c.rq : null\n      };\n    },\n",
             "        rq: c.rq ? c.rq : null,\n"
             "        nasc: c.criadoEm ? (Date.parse(c.criadoEm) || 0) : 0,   // v88.1: quando a conta nasceu e se nasceu depois do último ZERAR CONTAS\n"
             "        depois: !!c.depoisDoZerar                                 // (o servidor diz: o mesmo número pode ter sido de uma conta apagada)\n"
             "      };\n    },\n"))

# ---- o código novo, depois do site.js da v87 (o fim dele: o texto do presente de teste)
ARQUIVOS = [n for n in ('base.js', 'lobby.js', 'amigos.js', 'mensagens.js', 'loja.js', 'cosmeticos.js', 'progressao.js', 'clube.js',
                        'chat.js', 'estatisticas.js', 'espectador.js', 'treino.js', 'modos.js', 'ajustes.js', 'controle.js', 'resultado.js',
                        'contas.js', 'visitante.js') if (AQUI / n).exists()]   # v88.1: o cadastro fechado e o mesmo número de outra conta (contas.js) · v88.2: jogar online sem conta, só com o nome (visitante.js)
CODIGO = '\n'.join((AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
# o catálogo da loja (app/contracts/catalogo88.json: o MESMO arquivo que a plataforma usa para conferir preço e item)
CAT = RAIZ / 'app' / 'contracts' / 'catalogo88.json'
if CAT.exists():
    CODIGO = 'const CAT88 = ' + json.dumps(json.loads(CAT.read_text(encoding='utf-8')), ensure_ascii=False, separators=(',', ':')) + ';\n' + CODIGO
SUBS.append(("  if (window.RACHA_MODO !== 'demo'){ const t = LB.popCaixa && LB.popCaixa.querySelector('.pop-txt'); if (t) t.textContent = 'Presente de teste: moedas e gemas para experimentar a loja à vontade.'; }\n};\n",
             "  if (window.RACHA_MODO !== 'demo'){ const t = LB.popCaixa && LB.popCaixa.querySelector('.pop-txt'); if (t) t.textContent = 'Presente de teste: moedas e gemas para experimentar a loja à vontade.'; }\n};\n"
             + ("/* ======================================================================= RACHA v88 (tools/v88/*.js) */\n" + CODIGO if CODIGO.strip() else '')))
