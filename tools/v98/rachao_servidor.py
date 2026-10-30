#!/usr/bin/env python3
"""RACHA v98 · O MOTOR DO RACHÃO NO SERVIDOR DAS SALAS — gera server/partida/rachao_motor.js a partir da página.

O pedido (29/10/2026): "Deixe separado o racha e o rachão, os caras podem escolher criar modo racha ou rachão, porém dá
pra criar sala de rachão também on-line". Nas salas online do Rachão quem joga a partida é o servidor (como nas salas com
mapa da Oficina: ninguém é anfitrião). Para a física ser EXATAMENTE a do Rachão, o servidor roda o mesmo código da página:
este script copia, sem mudar uma letra,
  · de app/public/game/rachao/rachao.html: o script do jogo do começo até a partida vista de cima (o trecho que vai até
    o desenho da partida, "07-toprender": as contas, a física, os 17 campos, os bots e a partida — TopMatch);
  · app/public/game/rachao/ponte.js (a ponte da física: o estádio pode ter a física misturada com a do RACHA);
  · app/public/game/rachao/quadro.js (a língua da partida online: o comando, o quadro e os eventos);
  · de app/public/game/rachao/estadios.js: as partes 0 a 3 (o estádio como documento: a limpeza e a montagem),
e escreve tudo dentro de uma função (criaMotorRachao) que devolve as peças. Nada da página roda no servidor além disso
(sem desenho, sem som, sem tela). O tests/v98_rachao_servidor_test.mjs gera de novo e confere que o arquivo é o mesmo.
Uso: python3 tools/v98/rachao_servidor.py (o build, tools/aplicar_rua.py, roda na etapa v98, depois da página da v97)."""
import hashlib, pathlib

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
PASTA = RAIZ / 'app' / 'public' / 'game' / 'rachao'
SAIDA = RAIZ / 'server' / 'partida' / 'rachao_motor.js'

INI_JOGO, FIM_JOGO = '<script>\n', '/* ---- 07-toprender.js ---- */'
INI_EST = '/* ---------------------------------------------------------------- 0) o básico */'
FIM_EST = '/* ---------------------------------------------------------------- 4) os ajudantes de tela */'
# o que o servidor usa do motor (o resto fica lá dentro, como na página)
PECAS_JOGO = ['TopMatch', 'MAPS', 'MAP_BY_ID', 'basePhys', 'buildStadium', 'POWERS', 'POWER_BY_ID', 'POWER_EVERY', 'DIFF', 'FORMATIONS', 'PHYS', 'SUPER',
              'KICK_LOB', 'KICK_CURVE', 'TEAM_NAMES', 'Disc', 'World', 'mkSeg', 'M_BALL', 'M_PLAYER', 'M_ALL', 'fmtTime']
PECAS_EST = ['VERSAO', 'LIM', 'LIM_CODIGO', 'PREFIXO', 'FIS', 'ORIGINAIS', 'limpa', 'compila', 'codifica', 'decodifica', 'docNovo', 'descAuto', 'limites', 'copias']


def trecho(t, a, b, nome):
    assert t.count(a) == 1 and t.count(b) == 1, ('rachão (servidor): o trecho de ' + nome + ' mudou de forma', t.count(a), t.count(b))
    i, j = t.index(a) + len(a), t.index(b)
    assert i < j, nome
    return t[i:j]


def gera():
    pag = (PASTA / 'rachao.html').read_text(encoding='utf-8')
    ponte = (PASTA / 'ponte.js').read_text(encoding='utf-8')
    quadro = (PASTA / 'quadro.js').read_text(encoding='utf-8')
    est = (PASTA / 'estadios.js').read_text(encoding='utf-8')
    jogo = trecho(pag, INI_JOGO, FIM_JOGO, 'o jogo')
    est03 = trecho(est, INI_EST, FIM_EST, 'o estádio')
    for p in PECAS_JOGO:
        assert ('class ' + p + ' ') in jogo or ('const ' + p + ' ') in jogo or ('function ' + p + '(') in jogo or (', ' + p + ' =') in jogo, 'rachão (servidor): sumiu ' + p
    for p in PECAS_EST:
        assert ('const ' + p + ' ') in est03 or ('function ' + p + '(') in est03 or (', ' + p + ' =') in est03, 'rachão (servidor): sumiu ' + p
    sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()[:16]
    cab = ("'use strict';\n"
           "/* =====================================================================================================================\n"
           "   RACHA v98 · O MOTOR DO RACHÃO NO SERVIDOR DAS SALAS (server/partida/rachao_motor.js) — ARQUIVO GERADO: NÃO EDITE.\n"
           "   Gerado por tools/v98/rachao_servidor.py (o build roda) a partir da página do Rachão, sem mudar uma letra:\n"
           "     · app/public/game/rachao/rachao.html: o script do jogo até a partida vista de cima (a física, os 17 campos, os bots\n"
           "       e a partida — TopMatch);\n"
           "     · app/public/game/rachao/ponte.js (a física misturada) e app/public/game/rachao/quadro.js (a língua do online);\n"
           "     · app/public/game/rachao/estadios.js, as partes 0 a 3 (o estádio como documento: a limpeza e a montagem).\n"
           "   As salas online do Rachão jogam com ESTE código — o mesmo da página (tests/v98_rachao_servidor_test.mjs confere).\n"
           "   sha256 (16): jogo " + sha(jogo) + " · ponte " + sha(ponte) + " · quadro " + sha(quadro) + " · estádio " + sha(est03) + "\n"
           "   ===================================================================================================================== */\n"
           "function criaMotorRachao(opcoes) {\n"
           "  opcoes = opcoes || {};\n"
           "  const Math = Object.create(globalThis.Math);           // (o sorteio do motor: o do servidor; os testes passam um com semente)\n"
           "  if (typeof opcoes.sorteio === 'function') Math.random = opcoes.sorteio;\n"
           "  const nada = () => {};\n"
           "  const window = {}, navigator = {}, location = { search: '', origin: 'null', hash: '' };   // (a página fora do navegador: nada de tela)\n"
           "  window.parent = window;\n"
           "  const document = { getElementById: () => null, createElement: () => ({ getContext: () => null }), addEventListener: nada, querySelector: () => null, querySelectorAll: () => [] };\n"
           "  const localStorage = { getItem: () => null, setItem: nada, removeItem: nada };\n"
           "  const module = undefined, exports = undefined, define = undefined;   // (a ponte e o quadro são UMD: aqui ficam só no window de mentira)\n")
    corpo = ("  /* ======================================================================= app/public/game/rachao/rachao.html (o jogo) */\n"
             + jogo
             + "\n  /* ======================================================================= app/public/game/rachao/ponte.js */\n"
             + ponte
             + "\n  /* ======================================================================= app/public/game/rachao/quadro.js */\n"
             + quadro
             + "\n  /* ======================================================================= app/public/game/rachao/estadios.js (0 a 3) */\n"
             + "  const EST = (function () {\n'use strict';\n" + est03
             + "\n  return Object.freeze({ " + ', '.join(PECAS_EST) + " });\n  })();\n")
    fim = ("  return Object.freeze({ " + ', '.join(PECAS_JOGO) + ", Ponte: window.RachaPonte, Quadro: window.RachaoQuadro, EST, Math });\n"
           "}\n"
           "module.exports = { criaMotorRachao, SHA: Object.freeze({ jogo: '" + sha(jogo) + "', ponte: '" + sha(ponte) + "', quadro: '" + sha(quadro) + "', estadio: '" + sha(est03) + "' }) };\n")
    return cab + corpo + fim


if __name__ == '__main__' or __name__.startswith('etapa_'):
    txt = gera()
    antes = SAIDA.read_text(encoding='utf-8') if SAIDA.exists() else ''
    if antes != txt:
        SAIDA.write_text(txt, encoding='utf-8')
    print('rachão (servidor): server/partida/rachao_motor.js ·', len(txt.encode('utf-8')), 'bytes' + ('' if antes != txt else ' (igual)'))
