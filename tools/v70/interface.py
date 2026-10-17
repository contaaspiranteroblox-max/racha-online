# RACHA rua v70 · Etapa 3 — interface responsiva e HUD
# As telas e janelas do lobby ganham escala própria (PALCO.sc) com piso no celular e rolagem; o palco do lobby (os botões em
# volta da tampinha) fica com a escala dele e ganha pisos no CSS (v70.css). O HUD do jogo (placar, aviso, pausa, setinhas)
# ganha uma escala própria, independente do zoom da câmera (hudK): cresce sozinha em tela pequena e com o Tamanho da interface.

SUBS = [
  # a escala do HUD (antes do primeiro resize)
  ("const BTN_PAUSA = {x:130, y:24, w:84, h:84};           // v57: o botão de pausa (no lugar dos dois de cima: EDITAR HUD e LOBBY ficam no menu dele)",
   "const BTN_PAUSA = {x:130, y:24, w:84, h:84};           // v57: o botão de pausa (no lugar dos dois de cima: EDITAR HUD e LOBBY ficam no menu dele)\n"
   "const HUDX = {k:1, css:1};                             // v70: a escala do HUD (k) e quantos px de verdade vale 1 px da tela virtual (css) — ver hudAplica"),
  # as telas e janelas: a escala delas (com piso), separada da escala do palco
  ("""  const c = LB.camada;                                 // telas e janelas: do tamanho da tela, fora da rolagem
  c.style.left = sa.l + 'px'; c.style.top = sa.t + 'px';
  c.style.width = (aw/PALCO.s) + 'px'; c.style.height = (ah/PALCO.s) + 'px'; c.style.transform = 'scale(' + PALCO.s + ')';""",
   """  const c = LB.camada;                                 // telas e janelas: do tamanho da tela, fora da rolagem
  // v70: as telas e janelas têm a escala delas (PALCO.sc), com um piso para o texto e o toque não ficarem miúdos (o que não cabe
  // rola); o palco do lobby fica com a escala dele (PALCO.s) e os pisos de toque/texto vêm do CSS (--s) e do uiPisoTexto.
  // v70.1: no celular deitado (o palco encolhe abaixo do piso) tudo CABE na tela, como na v69: as telas e janelas com a escala do
  // palco, sem os pisos e sem o texto crescer — nada fica escondido embaixo nem precisa arrastar ('v70-cabe').
  const mul = PALCO.mul || 1, cabe = !ret && PALCO.s < UIX.cabe;
  const sc = PALCO.sc = cabe ? Math.min(1.6, PALCO.s*mul) : uiEscTelas(PALCO.s, ret);
  c.style.left = sa.l + 'px'; c.style.top = sa.t + 'px';
  c.style.width = (aw/sc) + 'px'; c.style.height = (ah/sc) + 'px'; c.style.transform = 'scale(' + sc + ')';
  c.style.setProperty('--s', cabe ? '1' : String(sc/mul)); p.style.setProperty('--s', cabe ? '1' : String(PALCO.s/mul));
  LB.raiz.classList.toggle('v70-cabe', cabe); LB.raiz.classList.toggle('v70-baixo', !cabe && !ret && ah < 560); LB.raiz.classList.toggle('v70-pequeno', !cabe && sc/mul < .68); LB.raiz.classList.toggle('v70-estreitas', !ret && aw/sc < 1400);
  try { uiPisoAgenda(); } catch (_) {}                 // o piso do texto (interface.js) depois de cada arrumação"""),
  # os desenhos das telas (cartão do perfil, mapas, replays, loja...) na resolução da escala das telas
  ("const k = PALCO.s*dprL(); cv.width = Math.round(300*k); cv.height = Math.round(200*k);",
   "const k = (PALCO.sc || PALCO.s)*dprL(); cv.width = Math.round(300*k); cv.height = Math.round(200*k);", 2),
  ("  const k = PALCO.s*(G().plano ? .75 : Math.min(window.devicePixelRatio || 1, 2)), key = w + 'x' + h + '@' + k.toFixed(3);",
   "  const k = (PALCO.sc || PALCO.s)*(G().plano ? .75 : Math.min(window.devicePixelRatio || 1, 2)), key = w + 'x' + h + '@' + k.toFixed(3);"),
  ("    const w = Math.floor(c.clientWidth), h = Math.floor(c.clientHeight), k = PALCO.s*dprL();",
   "    const w = Math.floor(c.clientWidth), h = Math.floor(c.clientHeight), k = (PALCO.sc || PALCO.s)*dprL();"),
  ("  const w = c.clientWidth || 300, h = c.clientHeight || 168, k = PALCO.s*dprL();",
   "  const w = c.clientWidth || 300, h = c.clientHeight || 168, k = (PALCO.sc || PALCO.s)*dprL();"),
  ("  const k = PALCO.s*dprL(), W = Math.max(1, Math.round(w*k)), H = Math.max(1, Math.round(h*k));",
   "  const k = (PALCO.sc || PALCO.s)*dprL(), W = Math.max(1, Math.round(w*k)), H = Math.max(1, Math.round(h*k));"),
  ("  const box = $('sk-grade'), l = skLista(), k = PALCO.s*dprL(), px = Math.max(24, Math.round(100*k));",
   "  const box = $('sk-grade'), l = skLista(), k = (PALCO.sc || PALCO.s)*dprL(), px = Math.max(24, Math.round(100*k));"),
  ("  const k = PALCO.s*dprL(), key = w + 'x' + h + '@' + k.toFixed(3);\n  if (c.dataset.k !== key){ c.style.width = w + 'px'; c.style.height = h + 'px'; c.width = Math.round(w*k); c.height = Math.round(h*k); c.dataset.k = key; }",
   "  const k = (PALCO.sc || PALCO.s)*dprL(), key = w + 'x' + h + '@' + k.toFixed(3);\n  if (c.dataset.k !== key){ c.style.width = w + 'px'; c.style.height = h + 'px'; c.width = Math.round(w*k); c.height = Math.round(h*k); c.dataset.k = key; }"),
  ("  const box = $('sk-efeitos'), feitas = perfil.st.concluidas || 0, k = PALCO.s*dprL(), px = Math.round(84*k);",
   "  const box = $('sk-efeitos'), feitas = perfil.st.concluidas || 0, k = (PALCO.sc || PALCO.s)*dprL(), px = Math.round(84*k);"),
  ("  const k = Math.min(2.5, (PALCO.s || 1)*dprL()), key = w + 'x' + h + '@' + k.toFixed(3);",
   "  const k = Math.min(2.5, (PALCO.sc || PALCO.s || 1)*dprL()), key = w + 'x' + h + '@' + k.toFixed(3);", 2),
  # o HUD do jogo: a escala dele (hudK), separada do zoom da câmera
  ("  K = cv.width/W;\n  SPR_HUD.clear(); SPR_TXT.clear();",
   "  K = cv.width/W; HUDX.css = s; hudAplica();          // v70: a escala do HUD (placar, pausa, setinhas) acompanha o tamanho de verdade da tela\n  SPR_HUD.clear(); SPR_TXT.clear();"),
  ("function rqPlacar(g){\n", "function rqPlacar(g){\n  const hk = HUDX.k; g.save(); if (hk !== 1){ g.translate(W/2, 0); g.scale(hk, hk); g.translate(-W/2, 0); }   // v70: o placar, o aviso e o modo crescem juntos (Tamanho da interface)\n  try { rqPlacar70(g); } finally { g.restore(); }\n}\nfunction rqPlacar70(g){\n"),
  ("  o.push({c:false, x0:W/2 - 196, y0:0, x1:W/2 + 196, y1:72});                  // o placar\n  if (RQ.aviso.t > 0 || RQ.estado === 'saida') o.push({c:false, x0:W/2 - 340, y0:68, x1:W/2 + 340, y1:114});   // a faixa do aviso",
   "  const hk = HUDX.k; o.push({c:false, x0:W/2 - 196*hk, y0:0, x1:W/2 + 196*hk, y1:72*hk});   // o placar\n  if (RQ.aviso.t > 0 || RQ.estado === 'saida') o.push({c:false, x0:W/2 - 340*hk, y0:68*hk, x1:W/2 + 340*hk, y1:114*hk});   // a faixa do aviso"),
  ("    marcadorFora(g, p[0], p[1], ang, cor, bola);\n  };",
   "    g.save(); g.translate(p[0], p[1]); g.scale(HUDX.k, HUDX.k); marcadorFora(g, 0, 0, ang, cor, bola); g.restore();   // v70: no tamanho do HUD\n  };"),
  ("  const z = cam.z, a = VIS.a == null ? 1 : VIS.a, F = FORA_TELA, obs = foraObstaculos(), rr = F.r*1.45;",
   "  const z = cam.z, a = VIS.a == null ? 1 : VIS.a, F = FORA_TELA, obs = foraObstaculos(), rr = F.r*1.45*HUDX.k;"),
  ("      g.save(); g.translate(p[0], p[1]); g.scale(1.3, 1.3); marcadorFora(g, 0, 0, ang, rqCor(P.time).base, false); g.restore();\n      const tx = p[0] - Math.cos(ang)*F.r*3.4, ty = p[1] - Math.sin(ang)*F.r*3.4;\n      txt(g, 'VOCÊ', Math.max(60, Math.min(W - 60, tx)), Math.max(24, Math.min(H - 24, ty)), 24, '#ffffff', 'rgba(10,10,22,.95)', 6);",
   "      const k = 1.3*HUDX.k; g.save(); g.translate(p[0], p[1]); g.scale(k, k); marcadorFora(g, 0, 0, ang, rqCor(P.time).base, false); g.restore();\n      const tx = p[0] - Math.cos(ang)*F.r*3.4*HUDX.k, ty = p[1] - Math.sin(ang)*F.r*3.4*HUDX.k;\n      txt(g, 'VOCÊ', Math.max(60, Math.min(W - 60, tx)), Math.max(24, Math.min(H - 24, ty)), Math.round(24*HUDX.k), '#ffffff', 'rgba(10,10,22,.95)', 6);"),
  # ---------------- os controles da tela (EDITAR CONTROLES) ----------------
  # o layout da GINGA (PASSE, CHUTE, FINTA e DRIBLE juntos no canto de baixo: cobre menos campo) e os conjuntos que trocam de lugar
  ("  reset: {x:66,   y:66,  s:1, a:1}\n};\nconst KM_MIN",
   "  reset: {x:66,   y:66,  s:1, a:1}\n};\n"
   "const HUD_GINGA_PADRAO = {                             // v70: na GINGA os quatro botões ficam juntos no canto de baixo (cobrem menos campo)\n"
   "  kick:  {x:1790, y:520, s:.85, a:1, oc:false},\n  power: {x:1790, y:760, s:.85, a:1, oc:false},\n"
   "  finta: {x:1585, y:560, s:.85, a:1, oc:false},\n  drible:{x:1570, y:780, s:.85, a:1, oc:false}\n};\n"
   "const HUD_TROCA = ['kick', 'power', 'finta', 'drible'];   // v70: os que têm um lugar na GINGA e outro nos outros modos\n"
   "const KM_MIN"),
  ("const hud = {};\nfunction hudPadrao(){ for (const k in HUD_PADRAO) hud[k] = Object.assign({}, HUD_PADRAO[k]); }",
   "const hud = {};\n"
   "const HUDM = {base:{}, ginga:{}, atual:'base', todos:false, editaGinga:false, molde:'destro'};   // v70: os dois conjuntos de lugares (base e GINGA)\n"
   "function hudPadrao(){\n"
   "  for (const k in HUD_PADRAO) hud[k] = Object.assign({}, HUD_PADRAO[k]);\n"
   "  for (const k of HUD_TROCA){ HUDM.base[k] = hud[k]; HUDM.ginga[k] = Object.assign({}, HUD_GINGA_PADRAO[k]); }   // v70\n"
   "  HUDM.atual = 'base'; HUDM.molde = 'destro';\n"
   "}"),
  # quem aparece: no editor, os controles do modo atual (ou todos, com Mostrar todos); na partida, como sempre
  ("""function controleVisivel(k){                           // v60: CURVA só no modo COM CURVA · v61: FINTA e DRIBLE só na GINGA (no editor, tudo aparece)
  if (k === 'reset') return !RQ.on;
  if (k === 'curva') return editing || (v61Humano() && RQ.jogo === 'curva');
  if (k === 'finta' || k === 'drible') return editing || (v61Humano() && RQ.jogo === 'ginga');
  return true;
}""",
   """function controleVisivel(k){                           // v60: CURVA só no modo COM CURVA · v61: FINTA e DRIBLE só na GINGA · v70: no editor, os do modo atual (ou todos)
  if (editing) return hudEditVisivel(k);
  if (k === 'reset') return !RQ.on;
  if (k === 'curva') return v61Humano() && RQ.jogo === 'curva';
  if (k === 'finta' || k === 'drible') return v61Humano() && RQ.jogo === 'ginga';
  return true;
}
function hudEditVisivel(k){                            // v70: o editor mostra os controles do modo atual; Mostrar todos mostra o conjunto inteiro
  if (HUDM.atual === 'ginga') return k === 'joy' || HUD_TROCA.indexOf(k) >= 0;
  if (k === 'finta' || k === 'drible') return false;   // (FINTA e DRIBLE moram no layout da GINGA)
  if (HUDM.todos) return true;
  if (k === 'reset') return !RQ.on;
  if (k === 'curva') return RQ.on && RQ.jogo === 'curva';
  return true;
}"""),
  # cada quadro: o conjunto certo (GINGA ou base) no lugar
  ("function ctlAtualiza(dt){\n", "function ctlAtualiza(dt){\n  hudModoConfere();                                    // v70: na GINGA os botões estão no lugar da GINGA\n"),
  # guardar e voltar: os dois conjuntos (e o volume, se mudou durante a edição)
  ("const estadoHud = () => ({cameraRevision:19, hud:hud, cam:",
   "const estadoHud = () => ({cameraRevision:19, hud:hudBaseParaSalvar(), hudGinga:HUDM.ginga, molde:HUDM.molde, vol:som.volume, cam:"),
  ("    if (o && typeof o.graf === 'string' && GRAFICOS[o.graf]) graf = o.graf;   // v25: qualidade dos gráficos",
   "    if (o && o.hudGinga) for (const k of HUD_TROCA){                          // v70: o layout da GINGA\n"
   "      const s = o.hudGinga[k], e = HUDM.ginga[k]; if (!s) continue;\n"
   "      e.s = num(s.s, TAM_MIN, TAM_MAX, e.s); e.a = num(s.a, OPAC_MIN, 1, e.a); e.oc = bool(s.oc, e.oc); e.x = num(s.x, 0, W, e.x); e.y = num(s.y, 0, H, e.y);\n"
   "    }\n"
   "    if (o && typeof o.molde === 'string') HUDM.molde = o.molde;\n"
   "    if (o && typeof o.graf === 'string' && GRAFICOS[o.graf]) graf = o.graf;   // v25: qualidade dos gráficos"),
  ("  for (const k in HUD_PADRAO) Object.assign(hud[k], o.hud[k]);\n  cam.mode = o.cam.mode;",
   "  for (const k in HUD_PADRAO) Object.assign(HUD_TROCA.indexOf(k) >= 0 ? HUDM.base[k] : hud[k], o.hud[k]);   // v70: o base no base, a GINGA na GINGA\n"
   "  if (o.hudGinga) for (const k of HUD_TROCA) Object.assign(HUDM.ginga[k], o.hudGinga[k]);\n"
   "  if (o.molde) HUDM.molde = o.molde;\n"
   "  if (typeof o.vol === 'number' && o.vol !== som.volume){ som.setVolume(o.vol); try { syncSom(); } catch (_) {} }   // v70: o Cancelar também volta o volume\n"
   "  cam.mode = o.cam.mode;"),
  # ao abrir o editor: começa no conjunto do modo atual e com os controles do modo
  ("  snapEdicao = JSON.stringify(estadoHud());           // para o Cancelar\n  editing = true; limparEntrada();",
   "  HUDM.todos = false; HUDM.editaGinga = RQ.on && RQ.jogo === 'ginga';   // v70: começa com os controles do modo atual\n"
   "  snapEdicao = JSON.stringify(estadoHud());           // para o Cancelar\n  editing = true; limparEntrada(); hudModoConfere();"),
  ("  if (ok) salvar();\n  else if (snapEdicao){\n    restauraHud(JSON.parse(snapEdicao));\n  }\n  editing = false;",
   "  if (ok){ salvar(); hudAvisoSalvo(); }\n  else if (snapEdicao){\n    restauraHud(JSON.parse(snapEdicao));\n  }\n  editing = false; HUDM.editaGinga = false; hudModoConfere();"),
  # soltar um botão no editor: se encostou em outro (ou na pausa/placar), ele escorrega para o lugar livre mais perto
  ("  else if (role === 'drag'){ if (drag.id === e.pointerId) drag.id = null; ui.painel.classList.remove('arrastando'); }",
   "  else if (role === 'drag'){ if (drag.id === e.pointerId){ hudSolta(drag.k); drag.id = null; } ui.painel.classList.remove('arrastando'); }   // v70: hudSolta"),
  # o editor desenha os avisos de botão encostado
  ("  if (editing) drawEditOverlay(); else { drawPausaBtn(); drawSeletores(); }",
   "  if (editing){ drawEditOverlay(); hudDesenhaAvisos(); } else { drawPausaBtn(); drawSeletores(); }   // v70: os avisos de botão encostado"),
  # Restaurar padrão do editor: só os controles (a câmera e o visual moram nos Ajustes); vale ao Salvar, o Cancelar desfaz
  ("""ui.rest.addEventListener('click', () => {               // (v36: a qualidade e o FPS não voltam aqui: eles ficam no menu)
  hudPadrao(); cam.mode = CAM_MODO_PADRAO; cam.estilo = 'jogador'; cam.preset = 'equilibrado'; cam.auto = false; cam.zoom = ZOOM_PADRAO; cam.desl = DESL_MAX;
  const torc = opc.torc; Object.assign(opc, OPC_PADRAO); if (opc.torc !== torc) recriaCenario();
  syncPanel();
});""",
   """ui.rest.addEventListener('click', () => {               // v70: só os controles (o molde Destro e o layout da GINGA de sempre); vale ao Salvar, o Cancelar desfaz
  hudPadrao(); hudModoConfere(); if (!controleVisivel(sel)) sel = 'power';
  syncPanel(); try { HED.aviso.textContent = 'Padrão restaurado. Toque em Salvar para manter (Cancelar desfaz).'; } catch (_) {}
});"""),
  # o teclado: cada ação com as teclas que você escolher (Ajustes › Controles › Teclado)
  ("  keys[e.code] = true;\n  if (RQ.on && /^(KeyR|KeyT|KeyC|Digit[1-4])$/.test(e.code)) return;   // v35: na ranqueada o campo e o treino não mudam\n  if (e.code === 'Space' || e.code === 'KeyJ') BOTAO.kickL = true;\n  else if (e.code === 'KeyK' || e.code === 'KeyL') BOTAO.powerL = true;\n  else if (e.code === 'KeyU' || e.code === 'KeyI') CV.toque = true;                 // v61: CURVA (segura para carregar)\n  else if (e.code === 'KeyF') fazFinta();                                           // v61: FINTA (na ginga)\n  else if (e.code === 'KeyG' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') fazDrible();   // v61: DRIBLE (na ginga)\n  else if (e.code === 'KeyR'){ if (TR.on) trReinicia(); else { resetAll(); goalT = -1; } }   // v30: num exercício, recomeça ele\n  else if (e.code === 'KeyT'){ trTroca(e.shiftKey ? -1 : 1); som.clique(); }                                  // v30: próximo treino\n  else if (e.code === 'KeyH') abrirEdicao();\n  else if (e.code === 'KeyM') som.alternarMudo();\n  else if (/^Digit[1-4]$/.test(e.code)){ const i = +e.code.slice(5) - 1; if (i !== modo && i < MODOS.length) trocaModo(i - modo); }\n  else if (e.code === 'KeyC') trocaCampo(1);                                       // v21: C = próximo campo   // v20: 1 a 4 = 1v1 a 4v4\n  else if (e.code === 'Escape') pausaAbre();                                       // v57: o Esc abre a pausa (o SAIR fica nela)\n});\nwindow.addEventListener('keyup', e => { keys[e.code] = false; });",
   "  const tc = teclaCanon(e.code);                       // v70: a tecla do jeito que o jogo entende (Ajustes › Controles › Teclado)\n  keys[tc] = true;\n  if (RQ.on && /^(KeyR|KeyT|KeyC|Digit[1-4])$/.test(tc)) return;   // v35: na ranqueada o campo e o treino não mudam\n  if (tc === 'Space' || tc === 'KeyJ') BOTAO.kickL = true;\n  else if (tc === 'KeyK' || tc === 'KeyL') BOTAO.powerL = true;\n  else if (tc === 'KeyU' || tc === 'KeyI') CV.toque = true;                 // v61: CURVA (segura para carregar)\n  else if (tc === 'KeyF') fazFinta();                                           // v61: FINTA (na ginga)\n  else if (tc === 'KeyG' || tc === 'ShiftLeft' || tc === 'ShiftRight') fazDrible();   // v61: DRIBLE (na ginga)\n  else if (tc === 'KeyR'){ if (TR.on) trReinicia(); else { resetAll(); goalT = -1; } }   // v30: num exercício, recomeça ele\n  else if (tc === 'KeyT'){ trTroca(e.shiftKey ? -1 : 1); som.clique(); }                                  // v30: próximo treino\n  else if (tc === 'KeyH') abrirEdicao();\n  else if (tc === 'KeyM') som.alternarMudo();\n  else if (/^Digit[1-4]$/.test(tc)){ const i = +tc.slice(5) - 1; if (i !== modo && i < MODOS.length) trocaModo(i - modo); }\n  else if (tc === 'KeyC') trocaCampo(1);                                       // v21: C = próximo campo   // v20: 1 a 4 = 1v1 a 4v4\n  else if (tc === 'Escape') pausaAbre();                                       // v57: o Esc abre a pausa (o SAIR fica nela)\n});\nwindow.addEventListener('keyup', e => { keys[teclaCanon(e.code)] = false; keys[e.code] = false; });   // v70"),
  # o chute armado e o chute que aconteceu: o botão mostra (ARMADO) e pisca quando a bola sai
  ("    if (doKick(BOTAO.estado === 3)){\n      BOTAO.livre = false;\n      vibrarChute(BOTAO.estado === 3);\n    }",
   "    if (doKick(BOTAO.estado === 3)){\n      BOTAO.livre = false;\n      vibrarChute(BOTAO.estado === 3);\n      ARMADO.saiu = BOTAO.estado === 3 ? 'power' : 'kick'; ARMADO.saiuT = performance.now();   // v70: o botão pisca: o chute aconteceu\n    }"),
  ("  drawHUD(); drawConfetti(dt); drawBanner(); drawControls(dt);",
   "  drawHUD(); drawConfetti(dt); drawBanner(); drawControls(dt); desenhaArmado();   // v70: ARMADO no botão segurado sem a bola no alcance"),
]
