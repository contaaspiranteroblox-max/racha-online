/* ======================================================================================================================
   RACHA v88 · O CONTROLE BLUETOOTH (ou com fio): qualquer controle que o navegador reconheça (a API Gamepad, o mapa padrão).
   NA PARTIDA: o analógico esquerdo ou o direcional andam (nas MESMAS 32 direções do analógico da tela, na mesma
   velocidade: ninguém fica mais rápido de controle); A = PASSE, B = CHUTE (ou trocados, nos ajustes), X = CURVA (no modo
   com curva); START = pausa (e volta). NOS MENUS: o direcional (ou o analógico) anda entre os botões da tela, A confirma,
   B volta (o mesmo do Esc) e START também volta para a partida.
   O toque continua igual: sem controle (ou com ele parado), nada muda. Ajustes › Controles: liga/desliga e o A/B.
   ====================================================================================================================== */
const V88PAD = {on:true, troca:false, ativo:false, nome:'', idx:-1, ant:[], mx:0, my:0, setor:null, rep:{}, raf:0, usouT:0, segura:{kick:false, power:false, curva:false}};
try { const o = JSON.parse(localStorage.getItem('racha88-controle') || 'null'); if (o){ V88PAD.on = o.on !== false; V88PAD.troca = !!o.troca; } } catch (_) {}
function v88PadSalva(){ try { localStorage.setItem('racha88-controle', JSON.stringify({on:V88PAD.on, troca:V88PAD.troca})); } catch (_) {} }
const V88_PAD_MORTA = .28;                                 // (o analógico do controle: abaixo disso, parado)
function v88Pad(){
  if (!navigator.getGamepads) return null;
  let l = []; try { l = navigator.getGamepads() || []; } catch (_) { return null; }
  if (V88PAD.idx >= 0 && l[V88PAD.idx] && l[V88PAD.idx].connected) return l[V88PAD.idx];
  for (const g of l) if (g && g.connected){ V88PAD.idx = g.index; V88PAD.nome = g.id; return g; }
  return null;
}
const v88Bt88 = (g, i) => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > .5));
function v88PadEmJogo(){ return !lobby.aberto && !PAUSA.aberta && !editing && !fimAberto() && !trFimAberto() && !X49UI.open && !(typeof RP !== 'undefined' && RP.ativo) && (AJX.raiz ? AJX.raiz.hidden : true); }

/* ---- o laço: lê o controle a cada quadro (só com um controle ligado) ---- */
function v88PadLaco(){
  V88PAD.raf = 0;
  const g = V88PAD.on ? v88Pad() : null;
  if (!g){ v88PadSolta(); V88PAD.ativo = false; return; }
  V88PAD.ativo = true;
  const b = i => v88Bt88(g, i), A = V88PAD.troca ? 1 : 0, B = V88PAD.troca ? 0 : 1;
  const novo = i => b(i) && !V88PAD.ant[i];
  // a direção: o analógico esquerdo (com zona morta) ou o direcional
  let ax = g.axes[0] || 0, ay = g.axes[1] || 0;
  const dx = (b(15) ? 1 : 0) - (b(14) ? 1 : 0), dy = (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
  if (dx || dy){ ax = dx; ay = dy; }
  const l = Math.hypot(ax, ay);
  if (l > V88_PAD_MORTA){ V88PAD.mx = ax/l; V88PAD.my = ay/l; } else { V88PAD.mx = V88PAD.my = 0; }
  if (l > V88_PAD_MORTA || g.buttons.some(x => x && x.pressed)) V88PAD.usouT = performance.now();
  if (v88PadEmJogo()){
    // os botões do jogo: o mesmo caminho do teclado (Espaço/J = PASSE, K/L = CHUTE, U/I = CURVA)
    const kick = b(A), power = b(B), curva = b(2);
    if (kick && !V88PAD.segura.kick) BOTAO.kickL = true;
    if (power && !V88PAD.segura.power) BOTAO.powerL = true;
    if (curva && !V88PAD.segura.curva && typeof CV !== 'undefined') CV.toque = true;
    keys.Space = kick || !!keys.__teclaSpace; keys.KeyK = power || !!keys.__teclaKeyK; keys.KeyU = curva || !!keys.__teclaKeyU;
    V88PAD.segura = {kick, power, curva};
    if (novo(9)) pausaAbre();                                     // START: a pausa
  } else {
    if (V88PAD.segura.kick || V88PAD.segura.power || V88PAD.segura.curva) v88PadSolta();
    // nos menus: andar entre os botões, confirmar, voltar
    const dir = v88PadRepete('d', V88PAD.mx, V88PAD.my);
    if (dir) v88PadAnda(dir);
    if (novo(A)) v88PadConfirma();
    if (novo(B) || novo(8)) v88PadVolta();
    if (novo(9)){ if (PAUSA.aberta) pausaFecha(); else v88PadVolta(); }
  }
  V88PAD.ant = g.buttons.map(x => !!(x && (x.pressed || x.value > .5)));
  V88PAD.raf = requestAnimationFrame(v88PadLaco);
}
function v88PadSolta(){
  if (V88PAD.segura.kick) keys.Space = !!keys.__teclaSpace;
  if (V88PAD.segura.power) keys.KeyK = !!keys.__teclaKeyK;
  if (V88PAD.segura.curva) keys.KeyU = !!keys.__teclaKeyU;
  V88PAD.segura = {kick:false, power:false, curva:false}; V88PAD.mx = V88PAD.my = 0; V88PAD.setor = null;
}
// (o teclado continua valendo junto: o que o teclado segura fica guardado à parte)
window.addEventListener('keydown', e => { const c = teclaCanon(e.code); if (c === 'Space' || c === 'KeyK' || c === 'KeyU') keys['__tecla' + c] = true; }, true);
window.addEventListener('keyup', e => { const c = teclaCanon(e.code); if (c === 'Space' || c === 'KeyK' || c === 'KeyU') keys['__tecla' + c] = false; }, true);
function v88PadRepete(k, mx, my){                           // o direcional nos menus: uma vez ao apertar e depois repete devagar
  const d = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'dir' : 'esq') : my ? (my > 0 ? 'baixo' : 'cima') : '';
  const R = V88PAD.rep, agora = performance.now();
  if (!d || !(Math.abs(mx) > .5 || Math.abs(my) > .5)){ R[k] = null; return ''; }
  if (!R[k] || R[k].d !== d){ R[k] = {d, t:agora + 380}; return d; }
  if (agora >= R[k].t){ R[k].t = agora + 160; return d; }
  return '';
}
function v88PadCamada(){                                     // onde estão os botões que valem agora (a janela de cima)
  const vis = el => el && !el.hidden && el.offsetParent !== null;
  if (AJX.raiz && !AJX.raiz.hidden) return AJX.raiz;
  if (LB.pop && !LB.pop.hidden) return LB.pop;
  const dlg = Array.from(document.querySelectorAll('[role="dialog"]:not([hidden]), [aria-modal="true"]:not([hidden])')).filter(vis);
  if (dlg.length) return dlg[dlg.length - 1];
  if (lobby.aberto && lobby.tela && TELAS[lobby.tela]) return TELAS[lobby.tela].el;
  if (lobby.aberto) return LB.raiz;
  return document.body;
}
function v88PadAlvos(){
  const raiz = v88PadCamada(), out = [];
  for (const el of raiz.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])')){
    if (el.disabled || el.closest('[hidden]') || el.offsetParent === null || el.getAttribute('aria-hidden') === 'true') continue;
    const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) continue;
    out.push({el, r, x:r.left + r.width/2, y:r.top + r.height/2});
  }
  return out;
}
function v88PadAnda(dir){
  const L = v88PadAlvos(); if (!L.length) return;
  const at = document.activeElement, cur = L.find(o => o.el === at);
  if (!cur){ const p = (lobby.aberto && !lobby.tela && LB.jogar && L.find(o => o.el === LB.jogar)) || L[0]; v88PadFoca(p.el); return; }
  const v = {dir:[1, 0], esq:[-1, 0], baixo:[0, 1], cima:[0, -1]}[dir];
  let melhor = null, nota = Infinity;
  for (const o of L){
    if (o.el === cur.el) continue;
    const dx = o.x - cur.x, dy = o.y - cur.y, ao = dx*v[0] + dy*v[1];
    if (ao <= 4) continue;                                      // (só o que está para aquele lado)
    const lado = Math.abs(dx*v[1] - dy*v[0]), n = ao + lado*2.2;
    if (n < nota){ nota = n; melhor = o; }
  }
  if (melhor) v88PadFoca(melhor.el); else som.erro();
}
function v88PadFoca(el){
  try { el.focus({preventScroll:false}); } catch (_) {}
  try { el.scrollIntoView({block:'nearest', inline:'nearest'}); } catch (_) {}
  document.body.classList.add('v88-pad-foco');
  som.clique();
}
function v88PadConfirma(){
  const el = document.activeElement;
  if (!el || el === document.body || !v88PadCamada().contains(el)){ v88PadAnda('baixo'); return; }
  if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search' || el.type === 'password')){ try { el.focus(); } catch (_) {} return; }
  el.click();
}
function v88PadVolta(){                                       // B: o mesmo do Esc (fecha a janela de cima; no lobby sem nada aberto, nada)
  const at = document.activeElement, alvo = at && at !== document.body && v88PadCamada().contains(at) ? at : window;
  alvo.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', code:'Escape', bubbles:true, cancelable:true}));   // (sobe até a janela: os Esc de sempre)
  try { window.dispatchEvent(new KeyboardEvent('keyup', {key:'Escape', code:'Escape'})); } catch (_) {}
}
document.addEventListener('pointerdown', () => document.body.classList.remove('v88-pad-foco'), true);

/* ---- a direção do controle entra no getInput (as mesmas 32 direções do analógico da tela) ---- */
const getInputAntes88pad = getInput;
getInput = function(){
  if (!V88PAD.ativo || !(V88PAD.mx || V88PAD.my) || !v88PadEmJogo()){ V88PAD.setor = null; return getInputAntes88pad.apply(this, arguments); }
  const S = TAU/32, ang = Math.atan2(V88PAD.my, V88PAD.mx);
  let k = Math.round(ang/S);
  if (V88PAD.setor !== null){ let d = ang - V88PAD.setor*S; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < S/2 + AN_FOLGA) k = V88PAD.setor; }
  k = ((k % 32) + 32) % 32; V88PAD.setor = k;
  return {mx:Math.cos(k*S), my:Math.sin(k*S)};
};
// o tremidinho no chute (com a vibração ligada nos ajustes), se o controle tiver
const vibrarChuteAntes88 = vibrarChute;
vibrarChute = function(power){
  const r = vibrarChuteAntes88.apply(this, arguments);
  try {
    const g = V88PAD.ativo && v88Pad();
    if (g && g.vibrationActuator && CONTA.vibrar !== false && performance.now() - V88PAD.usouT < 5000)
      g.vibrationActuator.playEffect('dual-rumble', {duration:power ? 70 : 35, strongMagnitude:power ? .6 : .25, weakMagnitude:power ? .4 : .2}).catch(() => {});
  } catch (_) {}
  return r;
};
window.addEventListener('gamepadconnected', e => {
  V88PAD.idx = e.gamepad.index; V88PAD.nome = e.gamepad.id;
  if (V88PAD.on){ try { v88Aviso('Controle conectado: ' + v88PadNome(e.gamepad.id)); } catch (_) {} }
  if (!V88PAD.raf) V88PAD.raf = requestAnimationFrame(v88PadLaco);
  v88PadPinta();
});
window.addEventListener('gamepaddisconnected', e => {
  if (e.gamepad.index === V88PAD.idx){ V88PAD.idx = -1; v88PadSolta(); V88PAD.ativo = false; try { v88Aviso('Controle desconectado.'); } catch (_) {} }
  v88PadPinta();
});
function v88PadNome(id){ return String(id || 'controle').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'controle'; }

/* ---- Ajustes › Controles: o controle ---- */
(function v88PadAjustes(){
  const sec = AJX.secs && AJX.secs.controles; if (!sec) return;
  const g = ajxGrupo('Controle (Bluetooth ou com fio)', 'Ligue o controle no aparelho e aperte um botão dele aqui no jogo. O toque continua valendo junto.');
  g.classList.add('v88-aj-pad');
  const st = nodo('p', 'ajx-nota v88-pad-st'); st.setAttribute('aria-live', 'polite');
  const on = v88AjChave('v88-pad-on', 'Usar o controle', 'Desligado, o jogo ignora o controle', V88PAD.on, v => { V88PAD.on = v; v88PadSalva(); if (!v) v88PadSolta(); else if (!V88PAD.raf) V88PAD.raf = requestAnimationFrame(v88PadLaco); v88PadPinta(); });
  const tr = v88AjChave('v88-pad-troca', 'Trocar A e B', 'Ligado: B = PASSE e A = CHUTE', V88PAD.troca, v => { V88PAD.troca = v; v88PadSalva(); v88PadPinta(); });
  const mapa = nodo('ul', 'v88-pad-mapa');
  g.append(st, on, tr, mapa); sec.appendChild(g);
  V88PAD.ui = {st, on, tr, mapa};
  v88PadPinta();
})();
function v88PadPinta(){
  const U = V88PAD.ui; if (!U) return;
  const g = v88Pad();
  U.st.textContent = !navigator.getGamepads ? 'Este navegador não reconhece controles.' : g ? 'Conectado: ' + v88PadNome(g.id) + (g.mapping === 'standard' ? '' : ' (mapa diferente do padrão: alguns botões podem não bater)') : 'Nenhum controle conectado agora: ligue o controle e aperte um botão dele (o A/B e a lista dos botões aparecem aqui).';
  U.tr.hidden = !g; U.mapa.hidden = !g;                     // (sem controle, o grupo fica curto: cabe no celular deitado)
  ligado(U.on.querySelector('button'), V88PAD.on); ligado(U.tr.querySelector('button'), V88PAD.troca);
  U.mapa.textContent = '';
  const A = V88PAD.troca ? 'B' : 'A', B = V88PAD.troca ? 'A' : 'B';
  for (const [k, t] of [['Analógico / direcional', 'andar (na partida) · escolher (nos menus)'], [A, 'PASSE · confirmar nos menus'], [B, 'CHUTE · voltar nos menus'], ['X', 'CURVA (no modo com curva)'], ['START', 'pausa · voltar à partida'], ['SELECT', 'voltar']]){
    const li = nodo('li'); li.append(nodo('b', null, k), nodo('span', null, t)); U.mapa.appendChild(li);
  }
}
if (navigator.getGamepads){ setTimeout(() => { if (v88Pad() && !V88PAD.raf) V88PAD.raf = requestAnimationFrame(v88PadLaco); }, 800); }
