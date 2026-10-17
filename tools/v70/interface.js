/* ==================================================================================================================
   RACHA rua v70 · interface em tamanho real
   · As telas e janelas do lobby usam a escala delas (PALCO.sc, no lbLayout), com piso no celular: o texto e os toques não
     encolhem junto com a tela; o que não cabe rola. O palco do lobby mantém a composição e ganha pisos de toque no CSS.
   · uiPisoTexto: o texto que ficaria abaixo de 12 px de verdade (vezes o Tamanho da interface) cresce até esse piso.
   · O HUD da partida (placar, aviso, botão de pausa, setinhas) tem escala própria (HUDX.k): cresce sozinho em tela pequena
     e com o Tamanho da interface, sem mexer no zoom da câmera.
   · Ajustes › Acessibilidade › Tamanho da interface: 90%, 100%, 115% ou 130% (fica guardado em racha-ui-v1).
   ================================================================================================================== */
const UIX = {chave:'racha-ui-v1', opcoes:[.9, 1, 1.15, 1.3], pisoTexto:12.5, cabe:.56};   // v70.1: abaixo de cabe (celular deitado), tudo cabe na tela como na v69
(function(){ try { const o = JSON.parse(localStorage.getItem(UIX.chave) || 'null'); if (o && UIX.opcoes.indexOf(o.mul) >= 0) PALCO.mul = o.mul; } catch (_) {} })();
function uiEscTelas(s, ret){                            // a escala das telas e janelas: a do palco, mas nunca abaixo do piso (vezes o Tamanho da interface)
  const mul = PALCO.mul || 1, piso = ret ? .56 : .56;
  return Math.min(1.6, Math.max(s, piso)*mul);
}
function hudAplica(){                                   // a escala do HUD: 1 em tela grande; cresce quando 1 px virtual vale pouco na tela (celular)
  try {
    const mul = PALCO.mul || 1, css = HUDX.css || 1;
    HUDX.k = Math.max(1, Math.min(1.8, Math.max(1, .62/css)*mul));
    BTN_PAUSA.w = BTN_PAUSA.h = Math.round(84*HUDX.k);  // (o toque da pausa acompanha o desenho)
    document.documentElement.style.setProperty('--v70-ui', String(mul));
  } catch (_) {}
}
function uiMudaTamanho(mul){                            // Ajustes › Tamanho da interface
  if (UIX.opcoes.indexOf(mul) < 0) return;
  PALCO.mul = mul;
  try { localStorage.setItem(UIX.chave, JSON.stringify({mul})); } catch (_) { uiAvisoSalvar(); }
  hudAplica(); tamKey = ''; resize(); if (lobby.aberto) lbLayout();
  SPR_HUD.clear(); SPR_TXT.clear(); uiPisoAgenda();
}
function uiAvisoSalvar(){ try { x49Toast('Não deu para guardar neste aparelho: vale só até fechar o jogo.'); } catch (_) {} }

/* ---- o piso do texto: roda depois de cada mudança nas telas visíveis (debounce de um quadro) ---- */
const UI_PISO = {agendado:false};
function uiPisoAgenda(){ if (UI_PISO.agendado) return; UI_PISO.agendado = true; requestAnimationFrame(() => { UI_PISO.agendado = false; uiPisoTodos(); }); }
function uiPisoTodos(){
  if (!lobby.aberto) return;
  if (LB.raiz.classList.contains('v70-cabe')){          // v70.1: no celular deitado tudo cabe na tela (como na v69): o texto não cresce
    for (const el of LB.raiz.querySelectorAll('[data-v70fs]')){ el.style.removeProperty('font-size'); delete el.dataset.v70fs; }
    return;
  }
  const sc = PALCO.sc || PALCO.s || 1, s = PALCO.s || 1;
  for (const raiz of LB.camada.children){ if (!raiz.hidden && raiz.id !== 'lb-aviso') uiPisoTexto(raiz, sc); }
  uiPisoTexto(LB.palco, s);
}
function uiPisoTexto(raiz, esc){                        // o texto abaixo do piso cresce até ele (guarda o tamanho de antes para voltar se a tela crescer)
  const min = UIX.pisoTexto*(PALCO.mul || 1);
  const it = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT); const vistos = new Set(); let t;
  while ((t = it.nextNode())){
    if (t.data.trim().length < 1) continue;
    const el = t.parentElement; if (!el || vistos.has(el)) continue; vistos.add(el);
    if (el.closest('svg, canvas, .v70-livre, [aria-hidden="true"]')) continue;
    const base = el.dataset.v70fs ? +el.dataset.v70fs : parseFloat(getComputedStyle(el).fontSize);
    if (!(base > 0)) continue;
    const med = el.offsetWidth ? el.getBoundingClientRect().width/el.offsetWidth : esc, e = Math.min(esc, med > 0 ? med : esc), a = min/e;   // (um selo encolhido por transform também conta)
    if (base < a - .2){ if (!el.dataset.v70fs) el.dataset.v70fs = String(base); el.style.setProperty('font-size', a.toFixed(2) + 'px', 'important'); }   // (vence até regra com !important)
    else if (el.dataset.v70fs){ el.style.removeProperty('font-size'); delete el.dataset.v70fs; }
  }
}
new MutationObserver(uiPisoAgenda).observe(LB.camada, {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['hidden']});
new MutationObserver(uiPisoAgenda).observe(LB.palco, {childList:true, subtree:true, characterData:true});

/* ---- Ajustes › Acessibilidade: Tamanho da interface ---- */
(function(){
  const sec = AJX.secs && AJX.secs.acess; if (!sec) return;
  const lin = nodo('div', 'aj-lin aj-col ajx-lin'), tx = nodo('span', 'ajx-tx');
  tx.append(nodo('b', null, 'Tamanho da interface'), nodo('small', null, 'Menus, textos, placar e botão de pausa. Não muda o zoom da câmera.'));
  const seg = nodo('div', 'ajx-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Tamanho da interface');
  for (const m of UIX.opcoes){ const b = novoBotao(''); b.dataset.mul = m; b.textContent = Math.round(m*100) + '%'; b.setAttribute('aria-pressed', 'false'); seg.appendChild(b); }
  seg.addEventListener('click', e => { const b = e.target.closest('[data-mul]'); if (!b) return; som.clique(); uiMudaTamanho(+b.dataset.mul); uiSyncTamanho(); });
  lin.append(tx, seg); sec.insertBefore(lin, sec.firstChild);
  UIX.seg = seg;
})();
function uiSyncTamanho(){ if (!UIX.seg) return; for (const b of UIX.seg.children){ const on = +b.dataset.mul === (PALCO.mul || 1); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); } }
hudAplica();

/* ==================================================================================================================
   v70 · EDITAR CONTROLES: moldes (Destro, Canhoto, Polegar, Compacto, Grande), o layout da GINGA, Mostrar todos, os
   botões que não se encostam (nem cobrem a pausa e o placar) e o Salvar/Cancelar/Restaurar com o mesmo comportamento.
   ================================================================================================================== */
function hudBaseParaSalvar(){ const o = {}; for (const k in HUD_PADRAO) o[k] = HUD_TROCA.indexOf(k) >= 0 ? HUDM.base[k] : hud[k]; return o; }
function hudConjunto(){ return editing ? (HUDM.editaGinga ? 'ginga' : 'base') : (RQ.on && RQ.jogo === 'ginga' ? 'ginga' : 'base'); }
function hudModoConfere(){
  const g = hudConjunto(); if (g === HUDM.atual && hud.kick === HUDM[g].kick) return;
  for (const k of HUD_TROCA) hud[k] = HUDM[g][k];
  HUDM.atual = g;
}
// os moldes: lugar e tamanho de cada controle (base) e o layout da GINGA; a opacidade e o jeito do analógico ficam como estão
const HUD_MOLDES = {
  destro:  {nome:'Destro', nota:'Analógico à esquerda, botões à direita (o padrão)',
    base:{joy:[215, 706, 1], kick:[1735, 200, 1], power:[1735, 690, 1], curva:[1560, 455, 1], reset:[66, 66, 1]},
    ginga:{kick:[1790, 520, .85], power:[1790, 760, .85], finta:[1585, 560, .85], drible:[1570, 780, .85]}},
  canhoto: {nome:'Canhoto', nota:'Analógico à direita, botões à esquerda',
    base:{joy:[1705, 706, 1], kick:[200, 330, 1], power:[200, 700, 1], curva:[425, 520, 1], reset:[1854, 66, 1]},
    ginga:{kick:[130, 520, .85], power:[130, 760, .85], finta:[335, 560, .85], drible:[350, 780, .85]}},
  polegar: {nome:'Polegar', nota:'PASSE e CHUTE juntinhos no canto, no caminho do polegar',
    base:{joy:[215, 706, 1], kick:[1545, 768, .85], power:[1772, 625, .9], curva:[1710, 385, .82], reset:[66, 66, 1]},
    ginga:{kick:[1545, 768, .8], power:[1775, 640, .85], finta:[1730, 395, .78], drible:[1340, 790, .78]}},
  compacto:{nome:'Compacto', nota:'Tudo menor e na beira: cobre menos campo',
    base:{joy:[180, 722, .85], kick:[1785, 240, .8], power:[1785, 715, .8], curva:[1640, 478, .78], reset:[60, 60, .9]},
    ginga:{kick:[1820, 560, .72], power:[1820, 770, .75], finta:[1640, 600, .72], drible:[1635, 790, .72]}},
  grande:  {nome:'Grande', nota:'Botões maiores, mais fáceis de acertar',
    base:{joy:[250, 650, 1.2], kick:[1700, 260, 1.2], power:[1700, 680, 1.2], curva:[1450, 470, 1.2], reset:[70, 70, 1.1]},
    ginga:{kick:[1765, 470, 1.05], power:[1765, 745, 1.05], finta:[1505, 520, 1], drible:[1495, 785, 1]}}
};
function hudAplicaMolde(id){
  const M = HUD_MOLDES[id]; if (!M) return;
  for (const k in M.base){ const e = HUD_TROCA.indexOf(k) >= 0 ? HUDM.base[k] : hud[k], v = M.base[k]; e.x = v[0]; e.y = v[1]; e.s = v[2]; }
  for (const k in M.ginga){ const e = HUDM.ginga[k], v = M.ginga[k]; e.x = v[0]; e.y = v[1]; e.s = v[2]; }
  HUDM.molde = id;
  hudArruma('base'); hudArruma('ginga');
}
/* ---- encostar: os grupos que aparecem juntos e as áreas que nenhum botão cobre (a pausa e o placar, com o aviso) ---- */
function hudGrupos(conj){ return conj === 'ginga' ? [['joy', 'kick', 'power', 'finta', 'drible']] : [['joy', 'kick', 'power', 'curva'], ['joy', 'kick', 'power', 'reset']]; }
function hudZonas(){
  const hk = HUDX.k, b = BTN_PAUSA;
  return [{nome:'a pausa', x0:b.x - 10, y0:b.y - 10, x1:b.x + b.w + 10, y1:b.y + b.h + 10}, {nome:'o placar', x0:W/2 - 205*hk, y0:0, x1:W/2 + 205*hk, y1:118*hk}];
}
function hudObj(conj, k){ return HUD_TROCA.indexOf(k) >= 0 ? HUDM[conj][k] : hud[k]; }
function hudRaio(conj, k){ const e = hudObj(conj, k); return (k === 'joy' ? JOY.aro*e.al + JOY.knob*e.km + 4 : BASE[k].r)*e.s; }
function hudConflitos(conj){                           // [{a, b}] botões encostados · [{a, zona}] botão em cima da pausa/placar
  const out = [], vistos = new Set();
  for (const G of hudGrupos(conj)) for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++){
    const a = G[i], b = G[j], ch = a + '|' + b; if (vistos.has(ch)) continue; vistos.add(ch);
    const A = hudObj(conj, a), Bo = hudObj(conj, b);
    if (Math.hypot(A.x - Bo.x, A.y - Bo.y) < hudRaio(conj, a) + hudRaio(conj, b) + 6) out.push({a, b});
  }
  const ks = new Set(hudGrupos(conj).flat());
  for (const k of ks){ const e = hudObj(conj, k), r = hudRaio(conj, k); for (const z of hudZonas()){ const nx = Math.max(z.x0, Math.min(z.x1, e.x)), ny = Math.max(z.y0, Math.min(z.y1, e.y)); if (Math.hypot(e.x - nx, e.y - ny) < r) out.push({a:k, zona:z.nome}); } }
  return out;
}
function hudPrende(conj, k){ const e = hudObj(conj, k), r = hudRaio(conj, k); e.x = Math.max(r, Math.min(W - r, e.x)); e.y = Math.max(r, Math.min(H - r, e.y)); }
function hudArruma(conj, so){                          // afasta quem se encosta (e quem cobre a pausa/placar); com "so", só aquele se mexe
  const ks = Array.from(new Set(hudGrupos(conj).flat()));
  for (let it = 0; it < 80; it++){
    let mexeu = false;
    for (const G of hudGrupos(conj)) for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++){
      const a = G[i], b = G[j], A = hudObj(conj, a), Bo = hudObj(conj, b), need = hudRaio(conj, a) + hudRaio(conj, b) + 10;
      let dx = Bo.x - A.x, dy = Bo.y - A.y, d = Math.hypot(dx, dy); if (d >= need) continue;
      if (d < 1e-3){ dx = 1; dy = 0; d = 1; }
      const f = (need - d)/d, ma = so ? (a === so ? 1 : 0) : (b === 'joy' ? 1 : .5), mb = so ? (b === so ? 1 : 0) : (a === 'joy' ? 1 : .5);
      if (!ma && !mb) continue;
      A.x -= dx*f*ma; A.y -= dy*f*ma; Bo.x += dx*f*mb; Bo.y += dy*f*mb; mexeu = true;
    }
    for (const k of ks){
      if (so && k !== so) continue;
      const e = hudObj(conj, k), r = hudRaio(conj, k) + 6;
      for (const z of hudZonas()){
        const dentro = e.x > z.x0 && e.x < z.x1 && e.y > z.y0 && e.y < z.y1;
        if (dentro){                                   // o centro dentro da área: sai pela beira mais perto que tem espaço na tela
          const op = [[e.x - z.x0, -1, 0], [z.x1 - e.x, 1, 0], [e.y - z.y0, 0, -1], [z.y1 - e.y, 0, 1]].filter(o => (o[1] < 0 ? z.x0 - r >= r : o[1] > 0 ? z.x1 + r <= W - r : true) && (o[2] < 0 ? z.y0 - r >= r : o[2] > 0 ? z.y1 + r <= H - r : true)).sort((a, b) => a[0] - b[0])[0] || [0, 0, 1];
          if (op[1]) e.x = op[1] < 0 ? z.x0 - r : z.x1 + r; else e.y = op[2] < 0 ? z.y0 - r : z.y1 + r;
          mexeu = true; continue;
        }
        const nx = Math.max(z.x0, Math.min(z.x1, e.x)), ny = Math.max(z.y0, Math.min(z.y1, e.y)); const dx = e.x - nx, dy = e.y - ny, d = Math.hypot(dx, dy);
        if (d >= r) continue;
        e.x = nx + dx/d*r; e.y = ny + dy/d*r; mexeu = true;
      }
    }
    for (const k of ks) hudPrende(conj, k);
    if (!mexeu) break;
  }
}
function hudSolta(k){ if (!k) return; const conj = HUDM.atual; const antes = hudConflitos(conj).length; hudArruma(conj, k); hudEdSync(antes > 0); }
function hudDesenhaAvisos(){                           // no editor: o anel vermelho em quem se encosta (e o nome da área coberta)
  const conj = HUDM.atual, cs = hudConflitos(conj); if (!cs.length) return;
  const g = ctx; g.save(); g.lineWidth = 7; g.strokeStyle = '#ff4b3a'; g.setLineDash([18, 10]);
  const ja = new Set();
  for (const c of cs) for (const k of [c.a, c.b]){ if (!k || ja.has(k) || !controleVisivel(k)) continue; ja.add(k); const e = hud[k]; g.beginPath(); g.arc(e.x, e.y, rCtl(k)*e.s + 16, 0, TAU); g.stroke(); }
  g.restore();
}
function hudAvisoSalvo(){ try { x49Toast('Controles salvos.'); } catch (_) {} }

/* ---- o painel do editor: moldes, Mostrar todos, layout da GINGA, Arrumar e o aviso ---- */
const HED = {};
(function(){
  const corpo = ui.painel.querySelector('.hp-corpo > section[data-aba="ctl"]'); if (!corpo) return;
  const cab = $('hp-cab'); if (cab){ const b = cab.querySelector('b'); if (b) b.textContent = 'EDITAR CONTROLES'; const s = cab.querySelector('small'); if (s) s.textContent = 'arraste na tela · toque para escolher'; }
  ui.painel.setAttribute('aria-label', 'Editar os controles da tela');
  const box = nodo('div', 'hed'); box.id = 'hed';
  const lin1 = nodo('div', 'hed-moldes'); lin1.setAttribute('role', 'group'); lin1.setAttribute('aria-label', 'Moldes de controles');
  for (const id in HUD_MOLDES){ const b = novoBotao('hed-molde'); b.dataset.molde = id; b.textContent = HUD_MOLDES[id].nome; b.title = HUD_MOLDES[id].nota; b.setAttribute('aria-pressed', 'false'); lin1.appendChild(b); }
  lin1.addEventListener('click', e => { const b = e.target.closest('[data-molde]'); if (!b) return; som.clique(); hudAplicaMolde(b.dataset.molde); if (!controleVisivel(sel)) sel = 'power'; syncPanel(); hudEdSync(); });
  const lin2 = nodo('div', 'hed-opcoes');
  const todos = novoBotao('chip hed-chip'); todos.id = 'hed-todos'; todos.setAttribute('aria-pressed', 'false'); todos.append(nodo('i'), nodo('span', null, 'Mostrar todos'));
  todos.addEventListener('click', () => { som.clique(); HUDM.todos = !HUDM.todos; if (HUDM.todos) HUDM.editaGinga = false; hudModoConfere(); if (!controleVisivel(sel)) sel = 'power'; syncPanel(); hudEdSync(); });
  const ging = novoBotao('chip hed-chip'); ging.id = 'hed-ginga'; ging.setAttribute('aria-pressed', 'false'); ging.append(nodo('i'), nodo('span', null, 'Layout da GINGA'));
  ging.addEventListener('click', () => { som.clique(); HUDM.editaGinga = !HUDM.editaGinga; if (HUDM.editaGinga) HUDM.todos = false; hudModoConfere(); if (!controleVisivel(sel)) sel = 'power'; syncPanel(); hudEdSync(); });
  const arr = novoBotao('hed-arruma'); arr.id = 'hed-arruma'; arr.textContent = 'Arrumar encostados';
  arr.addEventListener('click', () => { som.clique(); hudArruma(HUDM.atual); hudEdSync(true); });
  lin2.append(todos, ging, arr);
  const aviso = nodo('p', 'hed-aviso'); aviso.setAttribute('aria-live', 'polite');
  box.append(lin1, lin2, aviso); corpo.insertBefore(box, corpo.firstChild);
  Object.assign(HED, {box, lin1, todos, ging, arr, aviso});
  ui.rest.textContent = 'Restaurar padrão';
})();
function hudEdSync(arrumou){
  if (!HED.box) return;
  for (const b of HED.lin1.children){ const on = b.dataset.molde === HUDM.molde; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
  ligado(HED.todos, HUDM.todos); ligado(HED.ging, HUDM.editaGinga);
  const cs = hudConflitos(HUDM.atual), nome = k => BASE[k] ? BASE[k].nome : k;
  if (cs.length){
    const c = cs[0]; HED.aviso.textContent = '⚠ ' + (c.zona ? nome(c.a) + ' cobre ' + c.zona : nome(c.a) + ' encosta em ' + nome(c.b)) + (cs.length > 1 ? ' (e mais ' + (cs.length - 1) + ')' : '') + ': o toque pode cair no botão errado. Solte longe ou toque em Arrumar.';
    HED.aviso.className = 'hed-aviso ruim'; HED.arr.disabled = false;
  } else {
    HED.aviso.textContent = arrumou ? 'Pronto: nenhum botão encostado, e a pausa e o placar ficam livres.' : (HUDM.editaGinga ? 'Editando os lugares da GINGA (PASSE, CHUTE, FINTA e DRIBLE).' : HUDM.todos ? 'Todos os controles deste layout.' : 'Mostrando os controles do modo atual.');
    HED.aviso.className = 'hed-aviso'; HED.arr.disabled = true;
  }
}
const syncPanelAntes70 = syncPanel;
syncPanel = function(){ syncPanelAntes70(); hudEdSync(); };

/* ==================================================================================================================
   v70 · TECLADO: cada ação com até duas teclas (Ajustes › Controles › Teclado). O jogo continua entendendo as teclas de
   sempre: a tecla escolhida vira a tecla "canônica" da ação (teclaCanon) antes de chegar ao jogo; a tecla de sempre que
   saiu de uma ação fica sem efeito. Esc (pausa) e as teclas do treino (R, T, C, 1 a 4) não mudam.
   ================================================================================================================== */
const TECLAS_ACOES = [
  ['cima', 'Andar para cima', ['KeyW', 'ArrowUp']], ['baixo', 'Andar para baixo', ['KeyS', 'ArrowDown']],
  ['esq', 'Andar para a esquerda', ['KeyA', 'ArrowLeft']], ['dir', 'Andar para a direita', ['KeyD', 'ArrowRight']],
  ['passe', 'PASSE (batida fraca)', ['Space', 'KeyJ']], ['chute', 'CHUTE (batida forte)', ['KeyK', 'KeyL']],
  ['curva', 'CURVA — segure para carregar (COM CURVA)', ['KeyU', 'KeyI']], ['finta', 'FINTA (GINGA)', ['KeyF']],
  ['drible', 'DRIBLE (GINGA)', ['KeyG', 'ShiftLeft']], ['hud', 'Editar os controles da tela', ['KeyH']], ['mudo', 'Som liga/desliga', ['KeyM']]
];
const TECLA = {chave:'racha-teclas-v1', mapa:{}, acoes:{}, captura:null};
function teclaPadrao(){ const o = {}; for (const [id, , cs] of TECLAS_ACOES) o[id] = cs.slice(); return o; }
function teclaCanon(code){ return TECLA.mapa[code] || code; }
function teclaMonta(){                                  // o mapa tecla → código canônico (o 1º de cada ação no padrão)
  const m = {};
  for (const [id, , cs] of TECLAS_ACOES) for (const c of cs) m[c] = '_livre_' + c;   // a tecla de sempre que saiu da ação: sem efeito
  for (const [id, , cs] of TECLAS_ACOES){
    const canon = cs[0];
    for (const c of TECLA.acoes[id] || []){ m[c] = canon; if (c === 'ShiftLeft') m.ShiftRight = canon; if (c === 'ShiftRight') m.ShiftLeft = canon; }
  }
  TECLA.mapa = m;
}
(function(){
  TECLA.acoes = teclaPadrao();
  try { const o = JSON.parse(localStorage.getItem(TECLA.chave) || 'null'); if (o) for (const [id] of TECLAS_ACOES) if (Array.isArray(o[id]) && o[id].length) TECLA.acoes[id] = o[id].filter(c => typeof c === 'string' && /^[A-Za-z0-9]+$/.test(c)).slice(0, 2); } catch (_) {}
  teclaMonta();
})();
function teclaSalva(){ teclaMonta(); try { localStorage.setItem(TECLA.chave, JSON.stringify(TECLA.acoes)); } catch (_) { uiAvisoSalvar(); } }
function teclaNome(c){
  const fixos = {Space:'Espaço', ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→', ShiftLeft:'Shift', ShiftRight:'Shift', ControlLeft:'Ctrl', ControlRight:'Ctrl', AltLeft:'Alt', AltRight:'Alt', Enter:'Enter', Tab:'Tab', Backquote:'`', Minus:'-', Equal:'=', BracketLeft:'[', BracketRight:']', Semicolon:';', Quote:"'", Comma:',', Period:'.', Slash:'/', Backslash:'\\'};
  if (fixos[c]) return fixos[c];
  if (/^Key[A-Z]$/.test(c)) return c.slice(3);
  if (/^Digit\d$/.test(c)) return c.slice(5);
  if (/^Numpad/.test(c)) return 'Num ' + c.slice(6);
  return c;
}
const TECLA_PROIBIDAS = ['Escape', 'KeyR', 'KeyT', 'KeyC', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Tab', 'MetaLeft', 'MetaRight'];
function teclaUI(sec){
  const g = ajxGrupo('Teclado', 'Toque numa tecla para trocar: aperte a nova (Esc cancela, Backspace apaga a segunda). Esc é sempre a pausa.');
  const lista = nodo('div', 'ajx-teclas'); TECLA.lista = lista;
  for (const [id, nome] of TECLAS_ACOES){
    const lin = nodo('div', 'aj-lin ajx-lin ajx-tecla'), tx = nodo('span', 'ajx-tx'); tx.append(nodo('b', null, nome));
    const caixa = nodo('div', 'ajx-tecla-bts');
    for (const i of [0, 1]){ const b = novoBotao('ajx-tbt'); b.dataset.acao = id; b.dataset.i = i; caixa.appendChild(b); }
    lin.append(tx, caixa); lista.appendChild(lin);
  }
  lista.addEventListener('click', e => { const b = e.target.closest('.ajx-tbt'); if (!b) return; som.clique(); teclaCaptura(b); });
  const rest = novoBotao('ajx-rest'); rest.id = 'ajx-teclas-rest'; rest.textContent = 'Voltar as teclas ao padrão';
  rest.addEventListener('click', () => { som.clique(); TECLA.acoes = teclaPadrao(); teclaSalva(); teclaSync(); });
  TECLA.msg = nodo('p', 'ajx-nota'); TECLA.msg.setAttribute('aria-live', 'polite');
  g.append(lista, TECLA.msg, rest); sec.appendChild(g);
  teclaSync();
}
function teclaSync(){
  if (!TECLA.lista) return;
  for (const b of TECLA.lista.querySelectorAll('.ajx-tbt')){
    const cs = TECLA.acoes[b.dataset.acao] || [], c = cs[+b.dataset.i], cap = TECLA.captura === b;
    b.textContent = cap ? 'aperte…' : c ? teclaNome(c) : '+';
    b.classList.toggle('on', cap); b.classList.toggle('vazia', !c && !cap);
    b.setAttribute('aria-label', (b.closest('.ajx-tecla').querySelector('b').textContent) + ': ' + (c ? 'tecla ' + teclaNome(c) + '. Toque para trocar' : 'sem segunda tecla. Toque para escolher'));
  }
}
function teclaCaptura(b){
  if (TECLA.captura === b){ TECLA.captura = null; teclaSync(); return; }
  TECLA.captura = b; TECLA.msg.textContent = 'Aperte a tecla nova para ' + b.closest('.ajx-tecla').querySelector('b').textContent + '.'; teclaSync();
}
window.addEventListener('keydown', e => {               // (antes de tudo: a tecla vai para a captura e não chega ao jogo nem ao Esc da janela)
  const b = TECLA.captura; if (!b) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const id = b.dataset.acao, i = +b.dataset.i, cs = TECLA.acoes[id] || (TECLA.acoes[id] = []);
  TECLA.captura = null;
  if (e.code === 'Escape'){ TECLA.msg.textContent = 'Troca cancelada.'; teclaSync(); return; }
  if ((e.code === 'Backspace' || e.code === 'Delete') && i === 1){ cs.splice(1); TECLA.msg.textContent = 'Segunda tecla apagada.'; teclaSalva(); teclaSync(); return; }
  if (TECLA_PROIBIDAS.indexOf(e.code) >= 0){ TECLA.msg.textContent = teclaNome(e.code) + ' fica com outra função (pausa ou treino). Escolha outra.'; teclaSync(); return; }
  let saiu = '';
  for (const [o, nome] of TECLAS_ACOES){ const l = TECLA.acoes[o] || []; const j = l.indexOf(e.code); if (j >= 0 && !(o === id && j === i)){ if (l.length > 1 || o === id){ l.splice(j, 1); saiu = nome; } else { TECLA.msg.textContent = teclaNome(e.code) + ' é a única tecla de ' + nome + '. Troque aquela primeiro.'; teclaSync(); return; } } }
  if (i === 0 || cs.length === 0) cs[0] = e.code; else cs[1] = e.code;
  TECLA.acoes[id] = cs.filter((c, k) => cs.indexOf(c) === k).slice(0, 2);
  TECLA.msg.textContent = teclaNome(e.code) + ' agora é ' + b.closest('.ajx-tecla').querySelector('b').textContent + (saiu ? ' (saiu de ' + saiu + ')' : '') + '.';
  teclaSalva(); teclaSync();
}, true);

/* ---- Ajustes › Controles: como jogar no toque (e o que é o chute armado) ---- */
function toqueAjuda(sec){
  const g = ajxGrupo('Como jogar no toque');
  const itens = [
    ['Analógico', 'Arraste para andar. Perto do centro não anda (zona morta), para o dedo não escorregar sem querer.'],
    ['PASSE', 'Batida mais fraca na direção da tampinha para a bola. Não escolhe companheiro sozinho: mire com a posição.'],
    ['CHUTE', 'Batida forte. A bola sai do centro da sua tampinha para o centro da bola: chegue por trás do lado que quer chutar.'],
    ['ARMADO', 'Apertou com a bola longe? O botão fica ARMADO enquanto você segura: o chute sai quando você encosta na bola. O botão pisca quando a bola sai.'],
    ['CURVA', 'Só no COM CURVA: segure para carregar (mais tempo, mais efeito) e solte para chutar. O analógico escolhe o lado.'],
    ['FINTA e DRIBLE', 'Só na GINGA: a FINTA ameaça o chute (o marcador cai); o DRIBLE arranca com um toquinho na bola.'],
    ['Pausa', 'O botão no canto de cima: continuar, editar os controles, ajustes ou sair.']
  ];
  const dl = nodo('dl', 'ajx-ajuda');
  for (const [t, d] of itens){ dl.append(nodo('dt', null, t), nodo('dd', null, d)); }
  g.appendChild(dl); sec.appendChild(g);
}
(function(){ const sec = AJX.secs && AJX.secs.controles; if (!sec) return; teclaUI(sec); toqueAjuda(sec); })();

/* ==================================================================================================================
   v70 · CHUTE ARMADO: segurando PASSE ou CHUTE com a bola fora do alcance, o botão mostra ARMADO (o chute sai ao encostar);
   quando a bola sai do pé, o botão dá uma piscada curta (com o som e a vibração de sempre).
   ================================================================================================================== */
const ARMADO = {desde:0, saiu:'', saiuT:-1e9};
function desenhaArmado(){
  if (editing || lobby.aberto || PAUSA.aberta) return;
  const agora = performance.now(), g = ctx;
  const seg = BOTAO.armado === NF.GATILHO.CHUTE ? 'power' : BOTAO.armado === NF.GATILHO.PASSE ? 'kick' : '';
  const longe = Math.hypot(B.x - P.x, B.y - P.y) > ALCANCE_CHUTE;
  if (seg && longe && controleVisivel(seg)){ if (!ARMADO.desde) ARMADO.desde = agora; } else ARMADO.desde = 0;
  if (ARMADO.desde && agora - ARMADO.desde > 150){       // (um instante de folga: no chute normal a bola já está no pé e o aviso nem aparece)
    const e = hud[seg], r = BASE[seg].r*e.s, pulso = .5 + .5*Math.sin(agora/110);
    g.save(); g.globalAlpha = .55 + .45*pulso; g.lineWidth = 7; g.strokeStyle = '#ffe14d'; g.setLineDash([16, 10]);
    g.beginPath(); g.arc(e.x, e.y, r + 12, 0, TAU); g.stroke(); g.restore();
    const s = 'ARMADO · ENCOSTE NA BOLA', ty = e.y - r - 30 >= 24 ? e.y - r - 30 : e.y + r + 30, tx = Math.max(150, Math.min(W - 150, e.x));
    g.save(); g.font = '22px ' + FONT; const w = g.measureText(s).width + 28; rr(g, tx - w/2, ty - 19, w, 38, 19); g.fillStyle = 'rgba(8,10,28,.82)'; g.fill(); g.restore();
    txt(g, s, tx, ty, 22, '#ffe14d', 'rgba(5,10,25,.95)', 4);
  }
  const dt = agora - ARMADO.saiuT;
  if (ARMADO.saiu && dt < 260 && controleVisivel(ARMADO.saiu)){   // a piscada: um anel que abre e some
    const e = hud[ARMADO.saiu], r = BASE[ARMADO.saiu].r*e.s, p = dt/260;
    g.save(); g.globalAlpha = (1 - p)*.9; g.lineWidth = 9*(1 - p) + 2; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(e.x, e.y, r + 6 + p*34, 0, TAU); g.stroke(); g.restore();
  }
}
