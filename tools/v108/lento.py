"""RACHA v108 · O ONLINE SEM CÂMERA LENTA (aplicada por último, depois da v107/chute).
O pedido (05/11/2026): "às vezes o personagem fica lento do nada por uns segundos até clicar no pausar, aí sai o lag" (online,
no celular e no PC: "o jogo fica lento, tudo em câmera lenta por uns segundos").
- tools/v108/lento.js: o deslize com prazo (as molas da v96 acabam em ~0,12 s quando o deslize fica grande ou demora — no jogo
  normal, nada muda), o pulo pelo deslize somado (o limite da v96 também para o somado) e o rollback + replay uma vez por quadro
  da tela (o quadro do servidor mais novo; a volta de um apagão trazia ~150 quadros juntos, cada um com o seu replay);
- as trocas abaixo ligam isso no desenho liso da v96 (tools/v96/rede.js): as três molas, a guarda e as três somas do deslize;
- o servidor (server/partida/ritmo108.js e o motor em server/partida/sala.js) não passa pelo build — fora a sala neste
  aparelho (o pacote da v99), que leva o ritmo108.js junto (a troca abaixo).
Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- a sala neste aparelho (o pacote da v99 com o motor das salas: server/partida/sala.js) leva também o balde do ritmo dos
#      comandos (server/partida/ritmo108.js), que o sala.js passou a usar
def modulo(nome):
    t = (RAIZ / 'server' / 'partida' / nome).read_text(encoding='utf-8')
    assert '</script' not in t.lower(), nome
    return "(function () {\n  const module = { exports: {} }, exports = module.exports;\n" + t + "\n  return module.exports;\n})()"
SUBS.append(("MODS['./sala'] = (function () {\n",
             "MODS['./ritmo108'] = " + modulo('ritmo108.js') + ";   // (v108: o ritmo dos comandos num balde de fichas)\nMODS['./sala'] = (function () {\n"))

# ---- B) o pulo pelo somado (o v92SnapPrev da v96): a correção entra no deslize só se ela e o somado cabem no limite
SUBS.append(("    if (nP < U(p.teleP)) V96L.soma(V96R.P, dP[0], dP[1]); else {",
             "    if (v108Cabe(V96R.P, dP, U(p.teleP))) V96L.soma(V96R.P, dP[0], dP[1]); else { /* v108: o somado também */"))
SUBS.append(("    if (nB < U(p.teleB)) V96L.soma(V96R.B, dB[0], dB[1]); else {",
             "    if (v108Cabe(V96R.B, dB, U(p.teleB))) V96L.soma(V96R.B, dB[0], dB[1]); else { /* v108: o somado também */"))
SUBS.append(("      if (Math.hypot(d[0], d[1]) < U(p.teleJ)) V96L.soma(v96Deslize(i), d[0], d[1]); else {",
             "      if (v108Cabe(v96Deslize(i), d, U(p.teleJ))) V96L.soma(v96Deslize(i), d[0], d[1]); else { /* v108: o somado também */"))
# ---- A) o deslize com prazo (o v96Desenha): as três molas e a guarda
SUBS.append(("  V96L.anda(V96R.P, dt, tau, V96L.tetoJ(C, p));",
             "  v108Anda('P', V96R.P, dt, tau, V96L.tetoJ(C, p));   // (v108: com prazo)"))
SUBS.append(("  V96L.anda(V96R.B, dt, tau * 0.9, V96L.tetoB(C, p, vb, dEu, U), p.gB, U(p.livreB));",
             "  v108Anda('B', V96R.B, dt, tau * 0.9, V96L.tetoB(C, p, vb, dEu, U), p.gB, U(p.livreB));   // (v108: com prazo)"))
SUBS.append(("  for (let i = 0; i < M.jog.length; i++) if (i !== V92N.slot) V96L.anda(v96Deslize(i), dt, tau, V96L.tetoJ(C, p));",
             "  for (let i = 0; i < M.jog.length; i++) if (i !== V92N.slot) v108Anda('J', v96Deslize(i), dt, tau, V96L.tetoJ(C, p));   // (v108: com prazo)"))
SUBS.append(("    if (!salto && ant) { const g = V96L.guarda(q, ant, d, vmax, dt); if (g !== q) V96R.medidas.guardas++; q = g; }",
             "    if (!salto && ant) { const g = v108Guarda(q, ant, d, vmax, dt); if (g !== q) V96R.medidas.guardas++; q = g; }   // (v108: a guarda acompanha o prazo)"))

ARQUIVOS = [n for n in ('lento.js',) if (AQUI / n).exists()]
assert ARQUIVOS == ['lento.js'], 'falta tools/v108/lento.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v108/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v108 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v108 · o online sem câmera lenta (tools/v108/lento.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
