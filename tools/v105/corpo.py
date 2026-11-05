"""RACHA v105 · o jogo de corpo (aplicada depois da v104).
O pedido (04/11/2026): "quero melhorar o jogo de corpo — os jogadores, quando se encostam para disputar a bola, deslizam
muito". A física das salas mora no núcleo (server/partida/nucleo.js: o atritoJogJog do PERFIL_V92 e o contatoJog no passo;
o build cola o arquivo no jogo pela v92); o motor dos mapas da Oficina (server/partida/mapa.js) usa o mesmo. Aqui, a partida
contra os bots (o motor do jogo):
- o atrito na batida jogador × jogador (o rqColide, fora do bloco PHYS) e a variável V105_AJJ, posta pelo v92AplicaFisica;
- tools/v105/corpo.js: o contatoJog no começo do passo (depois da amostraBotoes);
- o painel de testes ganha a faixa do atrito tampinha × tampinha.
Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
SUBS = []
SUBS_PHYS = []
SUBS.append(("let V92_QJJ = 0.3, V92_QJP = 0.65, V92_DIRECOES = 32;   // v92: tampinha × tampinha, tampinha × muro da área, direções do analógico (os da v91)\n",
             "let V92_QJJ = 0.3, V92_QJP = 0.65, V92_DIRECOES = 32;   // v92: tampinha × tampinha, tampinha × muro da área, direções do analógico (os da v91)\n"
             "var V105_AJJ = 0, V105_VIRA = false;                      // v105: o atrito tampinha × tampinha (o jogo de corpo) e a virada na hora (o v92AplicaFisica põe os do perfil)\n"))
SUBS.append(("  V92_QJJ = p.quiqueJogJog; V92_QJP = p.quiqueJogParede; V92_DIRECOES = p.direcoes;\n",
             "  V92_QJJ = p.quiqueJogJog; V92_QJP = p.quiqueJogParede; V92_DIRECOES = p.direcoes;\n"
             "  V105_AJJ = p.atritoJogJog || 0; V105_VIRA = !!p.viraNaHora;     // v105: o jogo de corpo e a virada na hora\n"))
SUBS.append(("  for (let i = 0; i < J.length; i++) for (let k = i + 1; k < J.length; k++) hitBodies(J[i], J[k], V92_QJJ, 0);\n",
             "  for (let i = 0; i < J.length; i++) for (let k = i + 1; k < J.length; k++) hitBodies(J[i], J[k], V92_QJJ, V105_AJJ);   // (v105: com o atrito do jogo de corpo)\n"))
SUBS.append(("  ['quiqueJogJog', 'Quique tampinha × tampinha', 'a trombada', 0, 1, .05, v => v.toFixed(2)],\n",
             "  ['quiqueJogJog', 'Quique tampinha × tampinha', 'a trombada', 0, 1, .05, v => v.toFixed(2)],\n"
             "  ['atritoJogJog', 'Atrito tampinha × tampinha', 'o jogo de corpo: 0 = escorrega uma em volta da outra (como até a v104)', 0, 1, .05, v => v.toFixed(2)],\n"
             "  ['viraNaHora', 'Virada na hora', '1 = a tampinha vai na hora para onde o analógico aponta; 0 = a velocidade somada de antes (até a v104)', 0, 1, 1, v => v >= .5 ? 'sim' : 'não'],\n"))
# os bots da partida deste aparelho: a virada na hora também (o mesmo passo do núcleo)
SUBS.append(("    if (d.mx || d.my){ q.vx += d.mx*vmax; q.vy += d.my*vmax; const v = Math.hypot(q.vx, q.vy); if (v > vmax){ q.vx *= vmax/v; q.vy *= vmax/v; } }\n",
             "    if (d.mx || d.my){ if (V105_VIRA){ q.vx = d.mx*vmax; q.vy = d.my*vmax; } else { q.vx += d.mx*vmax; q.vy += d.my*vmax; const v = Math.hypot(q.vx, q.vy); if (v > vmax){ q.vx *= vmax/v; q.vy *= vmax/v; } } }   // (v105: a virada na hora)\n"))
# o desenho do online: a sua tampinha entre os passos com a velocidade do próximo passo (a virada na hora, como o núcleo)
SUBS.append(("  if (vale && (d.mx || d.my)){ vx = eu.vx + d.mx*C.VEL_JOG; vy = eu.vy + d.my*C.VEL_JOG; const v = Math.hypot(vx, vy); if (v > C.VEL_JOG){ vx *= C.VEL_JOG/v; vy *= C.VEL_JOG/v; } }\n",
             "  if (vale && (d.mx || d.my) && C.VIRA_NA_HORA){ vx = d.mx*C.VEL_JOG; vy = d.my*C.VEL_JOG; }   // (v105: a virada na hora)\n"
             "  else if (vale && (d.mx || d.my)){ vx = eu.vx + d.mx*C.VEL_JOG; vy = eu.vy + d.my*C.VEL_JOG; const v = Math.hypot(vx, vy); if (v > C.VEL_JOG){ vx *= C.VEL_JOG/v; vy *= C.VEL_JOG/v; } }\n"))
CODIGO = (AQUI / 'corpo.js').read_text(encoding='utf-8')
assert '</script' not in CODIGO.lower(), 'o código da v105 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v105 · o jogo de corpo (tools/v105/corpo.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
