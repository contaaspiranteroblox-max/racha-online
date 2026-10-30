"""v93 (aplicado por último, depois da v92): A ATUALIZAÇÃO COMPLETA — INTERFACE, PARTIDAS E SOCIAL, por fases.
O editor de HUD novo (tools/v92/hud.js, a "Fase 1" do pedido anterior) é preservado: aqui só entram as melhorias pedidas.
- Fase 1 · os efeitos ao pressionar (a opção de cada controle no editor, hud[k].fx): desligado, o botão fica parado ao
  tocar e segurar — sem encolher, sem o anel do ARMADO, sem a piscada do chute em cima dele, sem o anel da carga e a
  fatia da espera, e no analógico sem a fatia acesa, a luz e o pino andando. Só o desenho: o toque, o tempo de resposta
  e a mecânica dos comandos não mudam (nada disso olha o desenho).
- o código das fases em tools/v93/*.js (na ordem de ARQUIVOS), colado no fim do script principal, depois do da v92;
- o estilo em app/public/game/v93.css (depois do v92-hud.css; as cores, letras e contornos da v91).
Nada aqui entra no bloco PHYS (o build confere a física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- o estilo da v93 depois do editor de HUD
if (RAIZ / 'app' / 'public' / 'game' / 'v93.css').exists():
    SUBS.append(('<link rel="stylesheet" href="./v92-hud.css">\n', '<link rel="stylesheet" href="./v92-hud.css">\n<link rel="stylesheet" href="./v93.css">\n'))

# ---- Fase 1 · os efeitos ao pressionar (hud[k].fx === false: o botão parado). Só o desenho dos controles.
SUBS += [
  # o PASSE e o CHUTE: não encolhem ao tocar
  ("g.translate(e.x, e.y); g.scale(e.s, e.s); if (down) g.scale(.92, .92);",
   "g.translate(e.x, e.y); g.scale(e.s, e.s); if (down && e.fx !== false) g.scale(.92, .92);   // v93: sem efeitos, não encolhe"),
  # CURVA, FINTA e DRIBLE: não encolhem; sem o anel da carga (que pisca e muda de cor) e sem a fatia da espera em cima do botão
  ("  if (pressed(k)) g.scale(.92, .92);\n  pintaHud(g, sprHud('v61|'",
   "  if (pressed(k) && e.fx !== false) g.scale(.92, .92);\n  pintaHud(g, sprHud('v61|'"),
  ("  if (!editing && RQ.on){\n    if (carregando){",
   "  if (!editing && RQ.on && e.fx !== false){   // v93: sem efeitos, o botão fica parado (a carga continua no aviso ao lado)\n    if (carregando){"),
  ("  } else if (k === 'finta' || k === 'drible'){             // a espera em segundos",
   "  } else if ((k === 'finta' || k === 'drible') && e.fx !== false){   // a espera em segundos"),
  # o REINICIAR do treino
  ("if (pressed('reset')) g.scale(.92, .92);",
   "if (pressed('reset') && e.fx !== false) g.scale(.92, .92);"),
  # o ARMADO (o anel tracejado que pulsa e o aviso) e a piscada do chute (o anel branco que abre em cima do botão)
  ("  if (ARMADO.desde && agora - ARMADO.desde > 150){",
   "  if (ARMADO.desde && agora - ARMADO.desde > 150 && hud[seg].fx !== false){   // v93: sem efeitos, nada em cima do botão"),
  ("  if (ARMADO.saiu && dt < 260 && controleVisivel(ARMADO.saiu)){",
   "  if (ARMADO.saiu && dt < 260 && controleVisivel(ARMADO.saiu) && hud[ARMADO.saiu].fx !== false){"),
  # o analógico: sem a fatia acesa, o arco e a luz; o pino fica no meio (a direção é a mesma: só o desenho)
  ("  if (joy.id !== null){\n    if (joy.ativo){",
   "  if (joy.id !== null && j.fx !== false){   // v93: sem efeitos, o analógico não acende\n    if (joy.ativo){"),
  ("  g.translate(joy.dx, joy.dy);\n  pintaHud(g, sprHud('joyPino|' + kr, q,",
   "  if (j.fx !== false) g.translate(joy.dx, joy.dy);   // v93: sem efeitos, o pino fica parado no meio\n  pintaHud(g, sprHud('joyPino|' + kr, q,"),
]

# ---- Fase 1 · os avisos perto dos botões (o ARMADO e a carga da CURVA) vão para o lado livre (v93Rotulo, em tools/v93/base.js):
#      antes iam sempre em cima do botão — e em cima do CHUTE fica o PASSE
SUBS += [
  ("    const s = 'ARMADO · ENCOSTE NA BOLA', ty = e.y - r - 30 >= 24 ? e.y - r - 30 : e.y + r + 30, tx = Math.max(150, Math.min(W - 150, e.x));\n"
   "    g.save(); g.font = '22px ' + FONT; const w = g.measureText(s).width + 28; rr(g, tx - w/2, ty - 19, w, 38, 19); g.fillStyle = 'rgba(8,10,28,.82)'; g.fill(); g.restore();\n"
   "    txt(g, s, tx, ty, 22, '#ffe14d', 'rgba(5,10,25,.95)', 4);\n",
   "    v93Rotulo(g, 'ARMADO · ENCOSTE NA BOLA', e.x, e.y, r, 22, '#ffe14d', 'rgba(8,10,28,.82)');   // v93: no lado livre (não em cima do PASSE)\n"),
  ("    const ty = e.y - r - 40 >= 24 ? e.y - r - 40 : e.y + r + 40, tx = Math.max(130, Math.min(W - 130, e.x));\n"
   "    g.save(); g.font = '24px ' + FONT; const w = g.measureText(s).width + 26; rr(g, tx - w/2, ty - 20, w, 40, 20); g.fillStyle = 'rgba(8,10,28,.84)'; g.fill(); g.restore();\n"
   "    txt(g, s, tx, ty, 24, c >= 1 ? '#aef52a' : '#7fe8ff', 'rgba(5,10,25,.95)', 4);\n",
   "    v93Rotulo(g, s, e.x, e.y, r, 24, c >= 1 ? '#aef52a' : '#7fe8ff', 'rgba(8,10,28,.84)');   // v93: no lado livre\n"),
]

# ---- Fase 1 · os itens que não equipavam (tools/v93/equipa.js explica cada um)
SUBS += [
  # o efeito do chute também no chute armado / no toque armado (antes: só no passo em que o botão foi apertado)
  ("if (!q || novo === false || !v88Efeitos()) return r;",
   "if (!q || (novo === false && !v93FxArmado(q)) || !v88Efeitos()) return r;   // v93: o chute armado também tem o efeito"),
  # as tampinhas exclusivas da conta continuam na lista do editor (a lista do site não substitui mais a do inventário)
  ("TP.conta = cods; for (const c of cods) TP.livres.add(tpCodigo(TP_CONTA[c].d));",
   "TP.conta = cods; for (const c of cods) TP.livres.add(tpCodigo(TP_CONTA[c].d)); try { v88TampinhasDaConta(); } catch (_) {}   // v93: as exclusivas (passe, eventos) ficam"),
  # o INVENTÁRIO mostra todas as peças (parava em 60)
  (".concat([...V88.inv].filter(c => /^peca:/.test(c)).slice(0, 60))",
   ".concat([...V88.inv].filter(c => /^peca:/.test(c)).sort())"),
  # o rótulo do que é seu: EQUIPAR também nas peças e nas tampinhas exclusivas
  ("pe.appendChild(nodo('span', 'v88-item-st', it && (CAT88.tiposEquipaveis || []).indexOf(it.tipo) >= 0 ? 'EQUIPAR' : 'É SEU'));",
   "pe.appendChild(nodo('span', 'v88-item-st', v93RotuloSeu(codigo, it)));"),
  # a miniatura da FORMA do escudo mostra a forma
  ("if (/^peca:/.test(codigo)){ const D = TP_PADRAO_D(), t = codigo.slice(5, 6), id = codigo.slice(7); if (t === 'b') D.b = id; else if (t === 'p') D.p = id; else if (t === 'i') D.i = id;",
   "if (/^peca:/.test(codigo)){ const t = codigo.slice(5, 6), id = codigo.slice(7), D = t === 'f' ? TP_ESCUDO_D() : TP_PADRAO_D(); if (t === 'b' || t === 'f') D.b = id; else if (t === 'p') D.p = id; else if (t === 'i') D.i = id;"),
]

# ---- Fase 2 · partidas, placar e craque (tools/v93/partida.js; cada fase só entra com o código dela)
if (AQUI / 'partida.js').exists():
  SUBS += [
  # (o replay, o PULAR · 1/3 e o fim do replay online ficam em tools/v93/partida.js, por fora: o replay mora no bloco PHYS)
  # o ping que o aparelho mede vai junto (o painel de jogadores mostra o de cada um)
  ("setInterval(()=>{if(NET49.id)net49Send({type:'ping',time:performance.now()});},3000);",
   "setInterval(()=>{if(NET49.id)net49Send({type:'ping',time:performance.now(),ms:Math.round(NET49.ping||0)});},3000);"),
  ("net49Send({type:'ping', time:performance.now()});",
   "net49Send({type:'ping', time:performance.now(), ms:Math.round(NET49.ping || 0)});"),
]

# ---- Fase 5 · os balões de fala (tools/v93/falas.js): o rótulo do modo do lado do placar (CASUAL, SALA PRIVADA…) sai quando,
#      no celular, a barra da sala (SALA XXXX · admin · 40 ms) fica por cima dele (antes os dois textos se encavalavam)
if (AQUI / 'falas.js').exists():
  SUBS += [
  ("  txt(g, s0, xl, 38, 22, e.elo.cor[1], 'rgba(5,10,25,.95)', 5);\n  const md = RQ.jogo, corM = V70_MD_COR[md], M = MD_MAP.get(md);\n  if (corM && M){",
   "  let esc93 = false; try { esc93 = v93RotuloEscondido(); } catch (_) {}   // v93: a barra da sala por cima do rótulo (no celular): o rótulo sai\n"
   "  if (!esc93) txt(g, s0, xl, 38, 22, e.elo.cor[1], 'rgba(5,10,25,.95)', 5);\n  const md = RQ.jogo, corM = V70_MD_COR[md], M = MD_MAP.get(md);\n  if (corM && M && !esc93){"),
  ]

# ---- Fase 7 · os sons (tools/v93/sons.js explica): dentro do motor de som (fora do bloco PHYS), só quando o arquivo da fase existe
if (AQUI / 'sons.js').exists():
  SUBS += [
  # o limitador no fim da cadeia (vários sons juntos não estouram) e a latência de jogo
  ("      ac = new AC();\n      geral88 = ac.createGain(); geral88.gain.value = mudo ? 0 : vol; geral88.connect(ac.destination);",
   "      try { ac = new AC({latencyHint:'interactive'}); } catch (_) { ac = new AC(); }   // v93: a latência de jogo (o som sai junto com o toque)\n"
   "      geral88 = ac.createGain(); geral88.gain.value = mudo ? 0 : vol;\n"
   "      const lim93 = ac.createDynamicsCompressor(); lim93.threshold.value = -10; lim93.knee.value = 10; lim93.ratio.value = 8; lim93.attack.value = .003; lim93.release.value = .2;\n"
   "      geral88.connect(lim93); lim93.connect(ac.destination);   // v93: o limitador no fim (chute + torcida + apito juntos não estouram)"),
  # o tom e o estalo: o ataque de 3 ms (sem o clique seco do começo) e o limite de vozes; o estalo (ruído) varia um pouco
  ("  function tom(freq, freq2, dur, ganho, tipo, t0){      // um \"tum\" com a frequência caindo\n"
   "    const o = ac.createOscillator(), g = ac.createGain(), t = t0 || agora();\n"
   "    o.type = tipo || 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq2, t + dur);\n"
   "    g.gain.setValueAtTime(ganho, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);\n"
   "    o.connect(g); g.connect(mestre); o.start(t); o.stop(t + dur + .02);\n"
   "  }\n",
   "  let vozes93 = 0, ultChute93 = -1;                    // v93: quantos sons tocando agora (no celular, até 32) · o último chute\n"
   "  const rnd93 = (() => { let s = 93177; return () => { s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; }; })();   // (o sorteio só dos sons: o Math.random da partida fica igual)\n"
   "  const var93 = (x, p) => x*(1 + (rnd93()*2 - 1)*p);    // a variação discreta (±p)\n"
   "  function tom(freq, freq2, dur, ganho, tipo, t0){      // um \"tum\" com a frequência caindo · v93: com o ataque de 3 ms (sem o estalo do começo)\n"
   "    if (vozes93 >= 32) return;\n"
   "    const o = ac.createOscillator(), g = ac.createGain(), t = t0 || agora();\n"
   "    o.type = tipo || 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq2, t + dur);\n"
   "    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(ganho, t + Math.min(.003, dur*.25)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);\n"
   "    o.connect(g); g.connect(mestre); o.start(t); o.stop(t + dur + .02);\n"
   "    vozes93++; o.onended = () => { vozes93 = Math.max(0, vozes93 - 1); };\n"
   "  }\n"),
  ("  function estalo(freq, tipo, dur, ganho){             // pedacinho de ruído filtrado (contato, batida)\n"
   "    const s = fonteRuido(false), f = ac.createBiquadFilter(), g = ac.createGain(), t = agora();\n"
   "    f.type = tipo; f.frequency.value = freq;\n"
   "    g.gain.setValueAtTime(ganho, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);\n"
   "    s.connect(f); f.connect(g); g.connect(mestre); s.start(t, Math.random()*2); s.stop(t + dur + .02);\n"
   "  }\n",
   "  function estalo(freq, tipo, dur, ganho){             // pedacinho de ruído filtrado (contato, batida) · v93: o ataque de 2 ms, ±6% no filtro, o limite de vozes\n"
   "    if (vozes93 >= 32) return;\n"
   "    const s = fonteRuido(false), f = ac.createBiquadFilter(), g = ac.createGain(), t = agora();\n"
   "    f.type = tipo; f.frequency.value = var93(freq, .06);\n"
   "    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(ganho, t + Math.min(.002, dur*.2)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);\n"
   "    s.connect(f); f.connect(g); g.connect(mestre); s.start(t, Math.random()*2); s.stop(t + dur + .02);\n"
   "    vozes93++; s.onended = () => { vozes93 = Math.max(0, vozes93 - 1); };\n"
   "  }\n"),
  # o chute (forte) e o passe (fraco): o passe é um toque redondo e curto (antes era o chute mais baixo); dois colados: o segundo mais baixo
  ("    chute(forte){                                      // bico na bola: tum grave + estalo do contato\n"
   "      if (!pronto()) return;\n"
   "      tom(forte ? 190 : 165, 48, forte ? .16 : .12, forte ? .95 : .7);\n"
   "      estalo(forte ? 1400 : 1100, 'lowpass', .05, forte ? .9 : .6);\n"
   "      estalo(forte ? 2600 : 3200, 'bandpass', forte ? .045 : .03, forte ? .5 : .32);   // v37: o \"pá\" do contato, agudo e curtinho (fica nítido que saiu)\n"
   "    },\n",
   "    chute(forte){                                      // bico na bola: tum grave + estalo do contato · v93: o passe com o som dele, a variação e sem repetir colado\n"
   "      if (!pronto()) return;\n"
   "      const t = agora(), colado = t - ultChute93 < .045, k = var93(1, .035), a = (colado ? .45 : 1)*var93(1, .08); ultChute93 = t;\n"
   "      if (forte){\n"
   "        tom(188*k, 46, .17, .8*a);\n"
   "        estalo(1350*k, 'lowpass', .055, .72*a);\n"
   "        estalo(2650*k, 'bandpass', .045, .4*a);        // (o \"pá\" do contato: nítido que saiu)\n"
   "      } else {                                         // o PASSE: o \"toc\" redondo do lado do pé\n"
   "        tom(215*k, 72, .1, .48*a);\n"
   "        estalo(950*k, 'lowpass', .04, .4*a);\n"
   "        estalo(2100*k, 'bandpass', .024, .15*a);\n"
   "      }\n"
   "    },\n"),
  # o toque na bola (o domínio de cada passo): a variação discreta
  ("    toque(f){ if (!pronto()) return; const t = agora(); if (t - ultToque < .08) return; ultToque = t; tom(150, 70, .07, .1 + .25*f); estalo(700, 'lowpass', .035, .08 + .2*f); },",
   "    toque(f){ if (!pronto()) return; const t = agora(); if (t - ultToque < .08) return; ultToque = t; const k = var93(1, .05); tom(150*k, 70, .07, var93(.1 + .22*f, .1)); estalo(700*k, 'lowpass', .035, var93(.07 + .18*f, .1)); },   // v93: + a variação"),
  # os botões: o clique mais macio
  ("    clique(){ if (!pronto()) return; tom(540, 320, .06, .22, 'triangle'); },",
   "    clique(){ if (!pronto()) return; tom(620, 380, .05, .16, 'triangle'); tom(1240, 980, .03, .035); },   // v93: o clique mais macio (sem o estalo seco)"),
  # o gol: a rede (o \"chuá\") e um acorde curto no lugar do apito agudo; a torcida um pouco mais baixa no pico
  ("      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.55, t + .35);\n"
   "      g.gain.setValueAtTime(.55, t + 1.1); g.gain.exponentialRampToValueAtTime(.0001, t + 3.6);\n"
   "      s.connect(f); f.connect(g); g.connect(mestre); s.start(t, Math.random()*2); s.stop(t + 3.7);\n"
   "      tom(880, 860, .35, .18, 'triangle', t + .05);    // apito curto\n",
   "      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.5, t + .35);\n"
   "      g.gain.setValueAtTime(.5, t + 1.1); g.gain.exponentialRampToValueAtTime(.0001, t + 3.6);\n"
   "      s.connect(f); f.connect(g); g.connect(mestre); s.start(t, Math.random()*2); s.stop(t + 3.7);\n"
   "      { const r = fonteRuido(false), rf = ac.createBiquadFilter(), rg = ac.createGain();   // v93: a rede (o \"chuá\" da bola entrando)\n"
   "        rf.type = 'bandpass'; rf.Q.value = 1.3; rf.frequency.setValueAtTime(5200, t); rf.frequency.exponentialRampToValueAtTime(1300, t + .34);\n"
   "        rg.gain.setValueAtTime(.0001, t); rg.gain.linearRampToValueAtTime(.2, t + .015); rg.gain.exponentialRampToValueAtTime(.0001, t + .38);\n"
   "        r.connect(rf); rf.connect(rg); rg.connect(mestre); r.start(t, Math.random()*2); r.stop(t + .42); }\n"
   "      for (const fq of [523.25, 659.25, 783.99]) tom(fq, fq*.996, .45, .05, 'triangle', t + .08);   // v93: o acorde curto (no lugar do apito agudo)\n"),
  # a bola na trave (a colisão com o metal): o ataque de 2 ms também (sem o clique do começo)
  ("        g.gain.setValueAtTime(a*k, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);",
   "        g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(a*k, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + dur);   // v93: o ataque de 2 ms"),
  # o começo: o 3, 2, 1 e o JÁ! (a contagem da Fase 2)
  ("    apito(tipo){ if (!pronto()) return; const t = agora();",
   "    contagem(n){                                       // v93: o bip do 3, 2, 1 e o JÁ! (mais agudo, com o apito da saída)\n"
   "      if (!pronto()) return; const t = agora();\n"
   "      if (n > 0){ tom(740, 738, .13, .14, 'sine', t); tom(1480, 1476, .08, .035, 'sine', t); }\n"
   "      else { tom(1110, 1105, .26, .16, 'sine', t); tom(2220, 2210, .14, .04, 'sine', t); apitoNota(t + .02, .45, .1); }\n"
   "    },\n"
   "    apito(tipo){ if (!pronto()) return; const t = agora();"),
]

# ---- o código das fases
ARQUIVOS = [n for n in ('base.js', 'equipa.js', 'tutorial.js', 'partida.js', 'admin.js', 'grupo.js', 'falas.js', 'bolas.js', 'sons.js') if (AQUI / n).exists()]
if ARQUIVOS:
    CODIGO = '\n'.join((AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
    SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
                 '\n/* ======================================================================= RACHA v93 (tools/v93/*.js) */\n' + CODIGO
                 + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
