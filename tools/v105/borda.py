"""RACHA v105 · o TAMANHO DA BORDA da tampinha (SEM · FINA · NORMAL · GROSSA), aplicado por último, depois dos cosméticos.
O pedido (05/11/2026): "crie uma função tamanho da borda, sem borda, na skin".
- o código da tampinha leva o tamanho no FIM (2 bits, só quando não é a normal): as trocas abaixo no tpCodigo, no tpLe e no
  tpCopia (tools/tampa_rua.js). Os códigos de sempre não mudam; o jogo de antes lê a mesma tampinha com a borda normal;
- o desenho: o meio das bordas de dentes e das caras animadas pelo tamanho (tpMiolo: .74 a normal) e, SEM BORDA, só o desenho
  (o tpTampa de sempre, a cara animada parada e mexendo, o aro aceso), nas trocas abaixo; a BOTÃO pelo v105Medidas
  (tools/v105/cosmeticos.js);
- tools/v105/borda.js: o TAMANHO DA BORDA na aba BORDA do CRIAR TAMPINHA, a saia que some SEM BORDA e o emoji do tamanho do meio.
Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
SUBS = []
SUBS_PHYS = []

# ---- o código: o tamanho no fim (depois do texto), só quando não é a normal — quem lê com o jogo de antes para antes dele
SUBS.append(("  if (I && I.texto){ const t = Array.from(tpTexto(D.t)); put(t.length, 2); for (const ch of t) put(TP_LETRA_I.get(ch) || 0, 6); }\n",
             "  if (I && I.texto){ const t = Array.from(tpTexto(D.t)); put(t.length, 2); for (const ch of t) put(TP_LETRA_I.get(ch) || 0, 6); }\n"
             "  if (D.k === 'T' && ((D.bt | 0) & 3)) put((D.bt | 0) & 3, 2);   // v105: o tamanho da borda (1 fina · 2 grossa · 3 sem borda; a normal não vai)\n"))
SUBS.append(("    if (i.texto){ const n = get(2); let t = ''; for (let j = 0; j < n; j++) t += TP_LETRAS[get(6)] || ''; D.t = tpTexto(t); }\n",
             "    if (i.texto){ const n = get(2); let t = ''; for (let j = 0; j < n; j++) t += TP_LETRAS[get(6)] || ''; D.t = tpTexto(t); }\n"
             "    D.bt = k === 'T' && at + 2 <= bits.length ? get(2) : 0;   // v105: o tamanho da borda (no fim; sem ele, os zeros do fim = a normal)\n"))
SUBS.append(("function tpCopia(D){ return {k:D.k, b:D.b, bc:D.bc.slice(), p:D.p, pc:D.pc.slice(), pp:D.pp.slice(), i:D.i, ic:D.ic.slice(), ip:D.ip.slice(), ie:D.ie | 0, t:D.t || ''}; }",
             "function tpCopia(D){ return {k:D.k, b:D.b, bc:D.bc.slice(), p:D.p, pc:D.pc.slice(), pp:D.pp.slice(), i:D.i, ic:D.ic.slice(), ip:D.ip.slice(), ie:D.ie | 0, t:D.t || '', bt:D.k === 'T' ? (D.bt | 0) & 3 : 0}; }   // v105: + bt (o tamanho da borda)"))

# ---- o desenho parado das bordas de dentes: SEM BORDA, só o desenho; o meio pelo tamanho
SUBS.append(("  tpSaia(g, x, y, r, D);\n  const rt = r*.74, B = TP_MAPA.b.get(D.b) || TP_BORDAS[0];\n",
             "  if (tpSemBorda(D)) return tpSoDesenho(g, x, y, r, D, semente);   // v105: SEM BORDA (tools/v105/borda.js)\n"
             "  tpSaia(g, x, y, r, D);\n  const rt = r*tpMiolo(D), B = TP_MAPA.b.get(D.b) || TP_BORDAS[0];   // v105: o meio pelo tamanho da borda (a normal: .74)\n"))
# ---- as caras animadas (v76 e v96): o meio pelo tamanho; SEM BORDA, sem o fundo escuro em volta e sem a animação do aro aceso
SUBS.append(("  const rt = r*.74;\n  g.save(); g.beginPath(); g.arc(x, y, rt, 0, SK76_TAU); g.clip(); g.translate(x, y);",
             "  const rt = r*tpMiolo(D);   // v105: o meio pelo tamanho da borda (a normal: .74; sem borda: a tampinha inteira)\n"
             "  g.save(); g.beginPath(); g.arc(x, y, rt, 0, SK76_TAU); g.clip(); g.translate(x, y);"))
SUBS.append(("  else { tpSaia(g, x, y, r, D); tpCirc(g, x, y, r*.775, '#07060a'); sk76Cara(g, x, y, r, D, A.cara, t == null ? A.cara.t0 : t, esc); }\n"
             "  if (A && A.aro && t != null) sk76Aro(g, x, y, r, D, t);",
             "  else { tpSaia(g, x, y, r, D); if (!tpSemBorda(D)) tpCirc(g, x, y, r*(tpMiolo(D) + .035), '#07060a'); sk76Cara(g, x, y, r, D, A.cara, t == null ? A.cara.t0 : t, esc); }   // v105: o tamanho da borda\n"
             "  if (A && A.aro && t != null && !tpSemBorda(D)) sk76Aro(g, x, y, r, D, t);"))
SUBS.append(("tpSaia(g, lado/2, lado/2, rpx, D); tpCirc(g, lado/2, lado/2, rpx*.775, '#07060a');",
             "tpSaia(g, lado/2, lado/2, rpx, D); if (!tpSemBorda(D)) tpCirc(g, lado/2, lado/2, rpx*(tpMiolo(D) + .035), '#07060a');   // v105: o tamanho da borda"))
SUBS.append(("  if (A.aro) try { sk76Aro(g, x, y, r, D, t); } catch (e) { sk76Erro(e); }",
             "  if (A.aro && !tpSemBorda(D)) try { sk76Aro(g, x, y, r, D, t); } catch (e) { sk76Erro(e); }   // v105: sem borda, sem o aro aceso"))
# ---- a faixa das bordas no editor: SEM BORDA, as miniaturas mostram cada borda no tamanho normal (senão ficavam todas iguais)
SUBS.append(("        else D.b = id;\n        const box = b.querySelector('.tpe-mini-cv');",
             "        else { D.b = id; if (D.bt === 3) D.bt = 0; }   // v105: sem borda, cada borda aparece no tamanho normal\n"
             "        const box = b.querySelector('.tpe-mini-cv');"))

ARQUIVOS = [n for n in ('borda.js',) if (AQUI / n).exists()]
assert ARQUIVOS == ['borda.js'], 'falta tools/v105/borda.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v105/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v105 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v105 · o tamanho da borda (tools/v105/borda.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
