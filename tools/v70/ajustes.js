/* ==================================================================================================================
   RACHA rua v70 · AJUSTES em abas (Áudio · Visual · Controles · Câmera · Acessibilidade · Conta)
   Uma janela só, no tamanho real da tela (fora do palco do lobby, que encolhe tudo), que abre no lobby e na pausa da
   partida. As linhas que já existiam (volume, música, gráficos, FPS, efeitos...) só mudam de lugar: os mesmos botões,
   com as mesmas funções. A aba Câmera junta o que estava espalhado entre o EDITAR HUD e os Ajustes: o modo (5 jeitos), o
   enquadramento (Perto, Equilibrado, Campo inteiro, Personalizado), o zoom e o deslocamento, o zoom automático, a Câmera
   firme e o Suavizar movimento. O editor de HUD fica só com os controles da tela.
   ================================================================================================================== */
const AJX = {raiz:LB.aj, aba:'audio', volta:null, secs:{}, abas:{}};
const AJX_ABAS = [['audio', 'Áudio'], ['visual', 'Visual'], ['controles', 'Controles'], ['camera', 'Câmera'], ['acess', 'Acessibilidade'], ['conta', 'Conta']];
function ajxLinhaDe(id){ const n = document.getElementById(id); return n ? n.closest('.aj-lin') : null; }
function ajxChave(id, titulo, nota){                    // uma linha com a chave liga/desliga (o mesmo desenho das outras)
  const lin = nodo('div', 'aj-lin ajx-lin'), tx = nodo('span', 'ajx-tx'), b = novoBotao('aj-chave');
  tx.append(nodo('b', null, titulo)); if (nota) tx.append(nodo('small', null, nota));
  b.id = id; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', titulo); b.appendChild(nodo('i'));
  lin.append(tx, b); return lin;
}
function ajxGrupo(titulo, nota){ const g = nodo('div', 'ajx-grupo'); if (titulo) g.appendChild(nodo('h3', 'ajx-h', titulo)); if (nota) g.appendChild(nodo('p', 'ajx-nota', nota)); return g; }
function ajxMonta(){
  const raiz = AJX.raiz, caixa = raiz.querySelector('.aj-caixa'); if (!caixa) return;
  (document.getElementById('wrap') || document.body).appendChild(raiz);   // fora do palco do lobby: tamanho real, em cima de tudo (lobby e partida)
  raiz.classList.remove('lb-pop'); raiz.classList.add('ajx'); raiz.setAttribute('aria-labelledby', 'ajx-tit'); raiz.removeAttribute('aria-label');
  const h2 = caixa.querySelector('h2'); if (h2) h2.id = 'ajx-tit';
  const cab = nodo('div', 'ajx-cab'), fechar = novoBotao('ajx-fechar'); fechar.setAttribute('aria-label', 'Fechar os ajustes'); fechar.textContent = '✕';
  fechar.addEventListener('click', () => { som.clique(); ajxFecha(); });
  if (h2) cab.append(h2); cab.append(fechar);
  const nav = nodo('div', 'ajx-abas'); nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', 'Partes dos ajustes');
  const corpo = nodo('div', 'ajx-corpo');
  for (const [id, nome] of AJX_ABAS){
    const t = novoBotao('ajx-aba'); t.id = 'ajx-t-' + id; t.textContent = nome; t.dataset.aba = id;
    t.setAttribute('role', 'tab'); t.setAttribute('aria-controls', 'ajx-' + id); t.setAttribute('aria-selected', 'false'); t.tabIndex = -1;
    nav.appendChild(t); AJX.abas[id] = t;
    const s = nodo('section', 'ajx-sec'); s.id = 'ajx-' + id; s.dataset.aba = id; s.setAttribute('role', 'tabpanel'); s.setAttribute('aria-labelledby', t.id); s.hidden = true;
    corpo.appendChild(s); AJX.secs[id] = s;
  }
  nav.addEventListener('click', e => { const t = e.target.closest('[data-aba]'); if (t){ som.clique(); ajxAba(t.dataset.aba, true); } });
  nav.addEventListener('keydown', e => {                // as setas andam entre as abas (Home/End vão às pontas)
    const ids = AJX_ABAS.map(a => a[0]), i = ids.indexOf(AJX.aba);
    let j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : -1;
    if (j < 0 && e.key !== 'ArrowLeft') return; j = (j + ids.length) % ids.length; e.preventDefault(); ajxAba(ids[j], true);
  });
  // as linhas de antes, cada uma na sua aba
  const S = AJX.secs, poe = (sec, ids) => { for (const id of ids){ const l = ajxLinhaDe(id); if (l) S[sec].appendChild(l); } };
  poe('audio', ['aj-vol', 'aj-mus', 'aj-faixa']);
  poe('visual', ['aj-graf', 'aj-fps', 'aj-verfps', 'aj-efx', 'aj-torc', 'aj-replay']);
  const dir = ajxChave('aj-dir', 'Seta da direção', 'A setinha para onde você vai'); S.visual.appendChild(dir);
  dir.querySelector('button').addEventListener('click', () => { opc.dir = !opc.dir; salvar(); ajxSync(); som.clique(); });
  poe('controles', ['aj-vibra']);
  poe('acess', ['aj-anim']);
  poe('conta', ['aj-chat']);
  const avan = caixa.querySelector('h3.aj-sec'); if (avan){ S.conta.appendChild(avan); }
  poe('conta', ['aj-serv']);
  const hConta = Array.from(caixa.querySelectorAll('h3.aj-sec')).find(h => /CONTA/.test(h.textContent)); if (hConta) S.conta.appendChild(hConta);
  poe('conta', ['lb-zerar']);
  ajxCamera(S.camera);
  ajxControles(S.controles);
  // o que sobrou da janela antiga (as linhas da câmera e do contato saíram para a aba Câmera; a nota longa saiu)
  for (const id of ['aj-cam', 'aj-contato']){ const l = ajxLinhaDe(id); if (l){ l.hidden = true; l.classList.add('ajx-velha'); S.camera.appendChild(l); } }
  const nota = caixa.querySelector('.tl-nota'); if (nota) nota.remove();
  const acoes = caixa.querySelector('.pop-acoes'); const ok = $('aj-ok'); if (ok){ ok.textContent = 'PRONTO'; }
  caixa.textContent = '';
  caixa.append(cab, nav, corpo); if (acoes) caixa.appendChild(acoes);
  caixa.classList.add('ajx-caixa');
  // abre e fecha: os caminhos de sempre (LB.aj.hidden) continuam valendo; aqui entram o foco, as abas e o Escape
  new MutationObserver(() => { if (!raiz.hidden) ajxAbriu(); else ajxFechou(); }).observe(raiz, {attributes:true, attributeFilter:['hidden']});
  raiz.addEventListener('keydown', ajxTeclas);
  ajxAba(AJX.aba, false);
}
function ajxAba(id, foca){
  AJX.aba = id;
  for (const [k] of AJX_ABAS){ const on = k === id; AJX.abas[k].setAttribute('aria-selected', String(on)); AJX.abas[k].tabIndex = on ? 0 : -1; AJX.abas[k].classList.toggle('on', on); AJX.secs[k].hidden = !on; }
  if (foca) try { AJX.abas[id].focus({preventScroll:true}); } catch (_) {}
  ajxSync();
}
function ajxAbriu(){
  if (AJX.aberta) return; AJX.aberta = true;
  if (!AJX.volta) AJX.volta = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
  syncAjustes(); ajxSync();
  try { AJX.abas[AJX.aba].focus({preventScroll:true}); } catch (_) {}
}
function ajxFechou(){
  if (!AJX.aberta) return; AJX.aberta = false;
  const v = AJX.volta; AJX.volta = null;
  if (v && document.contains(v) && !v.closest('[hidden]')) try { v.focus({preventScroll:true}); } catch (_) {}
}
function ajxAbre(aba, volta){ if (aba) AJX.aba = aba; AJX.volta = volta || null; syncAjustes(); AJX.raiz.hidden = false; ajxAba(AJX.aba, true); }   // (volta: quem recebe o foco ao fechar)
function ajxFecha(){ AJX.raiz.hidden = true; }
function ajxTeclas(e){                                  // Escape fecha esta janela (só ela); Tab fica dentro dela
  if (AJX.raiz.hidden) return;
  if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); som.clique(); ajxFecha(); return; }
  if (e.key !== 'Tab') return;
  const f = Array.from(AJX.raiz.querySelectorAll('button, [href], input, select, textarea, [tabindex]')).filter(n => !n.disabled && n.tabIndex >= 0 && n.offsetParent !== null && !n.closest('[hidden]'));
  if (!f.length) return;
  const a = f[0], z = f[f.length - 1];
  if (e.shiftKey && document.activeElement === a){ e.preventDefault(); z.focus(); }
  else if (!e.shiftKey && document.activeElement === z){ e.preventDefault(); a.focus(); }
}

/* ---------------- a aba Câmera ---------------- */
const CAM_TXT = {
  jogador:'Segue você. A câmera nunca deixa o seu jogador sair da área livre da tela (fora do placar e longe dos controles).',
  frente:'Segue você e mostra mais do campo para onde você corre: dá para ver quem vem. Também nunca deixa você sair da tela.',
  bola:'A câmera vai atrás da bola. Quando você sai da tela, a setinha VOCÊ mostra onde você está.',
  tv:'Como na TV: corre de lado com a bola e quase não sobe nem desce. A setinha VOCÊ mostra onde você está.',
  fixa:'Tela parada: o campo inteiro do modo, sem a câmera andar. O enquadramento e o zoom valem com a câmera andando.'
};
const CAM_PRESET_TXT = {perto:['Perto', 'mais perto do lance'], equilibrado:['Equilibrado', 'o padrão, ajustado ao time'], campo:['Campo inteiro', 'a quadra toda na tela'], pers:['Personalizado', 'o seu zoom']};
const AJC = {};
function ajxCamera(sec){
  const g1 = ajxGrupo('Modo da câmera');
  const modo = nodo('div', 'ajx-seg ajx-seg5'); modo.setAttribute('role', 'group'); modo.setAttribute('aria-label', 'Modo da câmera');
  const bBola = $('hp-bola'); if (bBola) bBola.textContent = 'Seguir bola';   // (o mesmo nome do pedido: Seguir bola)
  AJC.modos = [];
  for (const [id, k] of [['hp-seguir', 'jogador'], ['hp-frente', 'frente'], ['hp-bola', 'bola'], ['hp-tv', 'tv'], ['hp-fixa', 'fixa']]){ const b = $(id); if (b){ modo.appendChild(b); AJC.modos.push([b, k]); } }
  AJC.nota = nodo('p', 'ajx-nota'); AJC.nota.setAttribute('aria-live', 'polite');
  g1.append(modo, AJC.nota);
  modo.addEventListener('click', e => { if (e.target.closest('button')){ som.clique(); setTimeout(() => { salvar(); ajxSync(); }, 0); } });
  const g2 = ajxGrupo('Enquadramento', 'Perto, Equilibrado e Campo inteiro se ajustam ao tamanho do time (1v1 a 4v4).');
  AJC.pre = nodo('div', 'ajx-seg ajx-seg4'); AJC.pre.setAttribute('role', 'group'); AJC.pre.setAttribute('aria-label', 'Enquadramento');
  for (const p of CAM_PRESETS){
    const b = novoBotao('ajx-pre'); b.dataset.preset = p; b.setAttribute('aria-pressed', 'false');
    b.append(nodo('b', null, CAM_PRESET_TXT[p][0]), nodo('small', null, CAM_PRESET_TXT[p][1])); AJC.pre.appendChild(b);
  }
  AJC.pre.addEventListener('click', e => { const b = e.target.closest('[data-preset]'); if (!b) return; som.clique(); cam.preset = b.dataset.preset; cam.mode = 'seguir'; salvar(); syncPanel(); ajxSync(); });
  g2.appendChild(AJC.pre);
  const zoomLin = ajxLinhaDe('hp-zoom') || $('hp-zoom') && $('hp-zoom').closest('label');
  if (zoomLin){ zoomLin.classList.add('aj-lin', 'ajx-lin', 'ajx-range'); zoomLin.querySelector('span').textContent = 'Zoom (Personalizado)'; g2.appendChild(zoomLin); AJC.zoomLin = zoomLin; }
  const deslLin = $('hp-desl') && $('hp-desl').closest('label');
  if (deslLin){ deslLin.classList.add('aj-lin', 'ajx-lin', 'ajx-range'); deslLin.querySelector('span').textContent = 'Quanto a câmera olha à frente (Seguir jogador)'; g2.appendChild(deslLin); AJC.deslLin = deslLin; }
  ui.zoom.addEventListener('input', () => { if (cam.preset !== 'pers'){ cam.preset = 'pers'; } ajxSync(); });   // mexeu no zoom: é o Personalizado
  for (const r of [ui.zoom, ui.desl]) r.addEventListener('change', () => salvar());
  ui.desl.addEventListener('input', () => ajxSync());
  const auto = ajxChave('aj-camauto', 'Zoom automático', 'Abre um pouco quando você e a bola não cabem juntos e volta com calma');
  auto.querySelector('button').addEventListener('click', () => { cam.auto = !cam.auto; salvar(); ajxSync(); som.clique(); });
  g2.appendChild(auto); AJC.auto = auto;
  const g3 = ajxGrupo('Estabilidade da imagem');
  const firme = ajxChave('aj-firme', 'Câmera firme', 'A câmera não treme com mexidas bem pequenas');
  firme.querySelector('button').addEventListener('click', () => { X49.camera = X49.camera === 'stable' ? 'original' : 'stable'; x49Save(); ajxSync(); som.clique(); });
  const suave = ajxChave('aj-suave', 'Suavizar movimento', 'Os outros jogadores andam mais macio na tela; os toques podem parecer um tiquinho atrasados');
  suave.querySelector('button').addEventListener('click', () => { const on = !(opc.lag && !X49.contactSync); opc.lag = on; X49.contactSync = !on; salvar(); x49Save(); ajxSync(); som.clique(); });
  g3.append(firme, suave);
  const rest = novoBotao('ajx-rest'); rest.id = 'ajx-cam-rest'; rest.textContent = 'Voltar a câmera ao padrão';
  rest.addEventListener('click', () => { som.clique(); cam.mode = CAM_MODO_PADRAO; cam.estilo = 'jogador'; cam.preset = 'equilibrado'; cam.auto = false; cam.zoom = ZOOM_PADRAO; cam.desl = DESL_MAX; X49.camera = 'stable'; salvar(); x49Save(); syncPanel(); ajxSync(); });
  sec.append(g1, g2, g3, rest);
}
function ajxSyncCam(){
  if (!AJC.pre) return;
  const seg = cam.mode === 'seguir', est = seg ? cam.estilo : 'fixa';
  for (const [b, k] of AJC.modos){ const on = k === est; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
  AJC.nota.textContent = CAM_TXT[est] || '';
  for (const b of AJC.pre.children){
    const p = b.dataset.preset, on = cam.preset === p && seg; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));   // (na Tela parada, escolher um enquadramento volta a câmera a andar)
    const sm = b.querySelector('small'); if (sm) sm.textContent = p === 'pers' ? Math.round(cam.zoom) + '%' : CAM_PRESET_TXT[p][1] + ' · ' + camPresetPct(p) + '%';
  }
  if (AJC.zoomLin) AJC.zoomLin.classList.toggle('apagada', !seg || cam.preset !== 'pers');
  ui.zoom.disabled = !seg; ui.desl.disabled = !(seg && cam.estilo === 'jogador');
  if (AJC.deslLin) AJC.deslLin.classList.toggle('apagada', ui.desl.disabled);
  ligado($('aj-camauto'), cam.auto); $('aj-camauto').disabled = !(seg && (cam.estilo === 'jogador' || cam.estilo === 'frente'));
  ligado($('aj-firme'), X49.camera === 'stable');
  ligado($('aj-suave'), opc.lag && !X49.contactSync);
  paint(ui.zoom); paint(ui.desl);
}

/* ---------------- a aba Controles (o editor de controles da tela; os moldes e o teclado entram na Etapa 3) ---------------- */
function ajxControles(sec){
  const g = ajxGrupo('Controles na tela', 'Posição, tamanho, transparência e o jeito do analógico: no editor, com a partida parada.');
  const b = novoBotao('lb-btn ajx-acao'); b.id = 'ajx-editar'; b.textContent = 'EDITAR CONTROLES DA TELA';
  b.addEventListener('click', () => { som.clique(); ajxEditarControles(); });
  g.appendChild(b); AJC.editar = b;
  sec.insertBefore(g, sec.firstChild);
}
function ajxEditarControles(){                          // na partida: fecha os ajustes e a pausa e abre o editor; no lobby: abre o treino livre com o editor
  ajxFecha();
  if (lobby.aberto){ try { abreTreinoLivreParaEditar(); } catch (_) { x49Toast('Abra o editor pela pausa de uma partida ou do treino.'); } return; }
  if (PAUSA.aberta) pausaFecha();
  abrirEdicao();
}
function abreTreinoLivreParaEditar(){                   // o treino livre (sem placar) com o editor aberto por cima
  jogar(); setTimeout(() => { try { if (!editing) abrirEdicao(); } catch (_) {} }, 120);
}
function ajxSync(){
  try { ligado($('aj-dir'), opc.dir); } catch (_) {}
  try { ajxSyncCam(); } catch (_) {}
  try { uiSyncTamanho(); } catch (_) {}                // (interface.js: o Tamanho da interface)
  if (AJC.editar) AJC.editar.textContent = lobby.aberto ? 'EDITAR CONTROLES (NO TREINO LIVRE)' : 'EDITAR CONTROLES DA TELA';
}
const syncAjustesAntes70 = syncAjustes;
syncAjustes = function(){ syncAjustesAntes70(); ajxSync(); };

/* ---------------- a pausa ganha AJUSTES; o editor de HUD fica só com os controles ---------------- */
(function(){
  const hudBt = $('pa-hud'); if (!hudBt) return;
  const b = novoBotao('pa-bt'); b.id = 'pa-ajustes'; b.textContent = 'AJUSTES';
  hudBt.textContent = 'EDITAR CONTROLES'; hudBt.after(b);
  b.addEventListener('click', () => { som.clique(); ajxAbre(AJX.aba === 'audio' ? 'camera' : AJX.aba, b); });
})();
(function(){                                            // o editor: as abas Câmera e Jogo saem (a câmera, o som e o visual moram nos Ajustes)
  for (const a of ['cam', 'jogo']){
    const t = ui.abas.querySelector('button[data-aba="' + a + '"]'); if (t) t.hidden = true;
    const s = ui.painel.querySelector('.hp-corpo > section[data-aba="' + a + '"]'); if (s) s.classList.add('ajx-saiu');
  }
  ui.abas.hidden = true; mostraAba('ctl');
  const ctl = ui.painel.querySelector('.hp-corpo > section[data-aba="ctl"]');
  if (ctl){ const p = nodo('p', 'nota ajx-hp-nota', 'Câmera, som e visual: no botão AJUSTES da pausa.'); ctl.appendChild(p); }
})();
(function(){                                            // o espectador da sala: CÂMERA troca quem a câmera acompanha (a bola ou cada jogador)
  if (!X49UI.onlinebar) return;
  const bt = x49Btn('CÂMERA: BOLA', () => { const n = especTroca(); bt.textContent = 'CÂMERA: ' + String(n).toUpperCase(); som.clique(); });
  bt.id = 'x49-camera'; bt.hidden = true; bt.setAttribute('aria-label', 'Trocar quem a câmera acompanha'); X49UI.onlinebar.appendChild(bt);
  const antes = x49GameUI;
  x49GameUI = function(){ antes(); const esp = NET49.playing && NET49.localSlot < 0; bt.hidden = !esp; if (!esp && ESPEC.alvo !== -1){ ESPEC.alvo = -1; bt.textContent = 'CÂMERA: BOLA'; } };
})();
ajxMonta();
