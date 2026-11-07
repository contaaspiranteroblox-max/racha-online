/* =====================================================================================================================
   RACHA v115 · A PARTIDA DA SALA PERSONALIZADA LIMPA (tools/v115/limpa.js — o build cola depois da v112 e da v113).

   O pedido (07/11/2026, com duas fotos): a faixa de cima da partida na sala ("SALA KL6S6Q · árbitro [SALA] [CÂMERA: BOLA]
   [SAIR]") polui o jogo — no celular ela até corta os botões e encosta no PASSE. Quer "um bagulho bem limpo", como na foto
   de referência: botões quadrados só com o desenho, no canto, e o FPS e o ping pequenininhos no canto de baixo.
   Agora, na partida das salas personalizadas (online, neste aparelho, do Rachão e do mapa — a ranqueada fica como está):
     · a faixa vira só os botões, quadrados como o da pausa (o contorno escuro e a sombra dura), em fila do lado da pausa, no
       canto de cima à esquerda (como na foto): SALA (azul, o desenho de menu: abre a sala, como antes), e para quem assiste
       CÂMERA (azul, a câmera: troca quem ela acompanha) e SAIR (vermelho, a porta). Se não couber do lado da pausa (os botões
       do placar no caminho) a fila desce embaixo dela; com a pausa mudada de lugar no EDITAR HUD, fica no canto de cima à
       direita, onde a faixa ficava. O texto da faixa ("SALA KL6S6Q · árbitro", o ping) sai (a pausa do
       árbitro já tem o aviso grande no meio da tela); só o "esperando quem roda a partida" continua, numa plaquinha;
     · o FPS e o ping no canto de baixo à esquerda (o ping some na sala neste aparelho, que não tem internet no meio).
   Os botões são os mesmos elementos de antes (o que cada um faz não muda, nem o espaço que o placar, o emoji, as falas e os
   gestos deixam para eles: todos já desviam da faixa). Os desenhos são nossos (SVG simples).
   ===================================================================================================================== */
const V115 = { limpa: false, aviso: false, caixa: null, fps: 0, ultQ: 0, ultT: 0, ping: -1, semPing: null, lugarT: 0, lugar: '', esq: false };
const V115_ICONES = {
  sala: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.8' stroke-linecap='round'><path d='M5 7h14M5 12h14M5 17h14'/></svg>",
  camera: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.4' stroke-linejoin='round'><path d='M3.5 8.5a2 2 0 0 1 2-2h2.2l1.6-2.2h5.4l1.6 2.2h2.2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z'/><circle cx='12' cy='13' r='3.6'/></svg>",
  sair: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'><path d='M10 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h4'/><path d='M14.5 8l4 4-4 4M18.5 12H9.5'/></svg>"
};
const v115Url = s => 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")';

(function v115Monta() {
  const st = document.createElement('style');
  st.textContent = [
    ':root{ --v115-t:clamp(36px, 10.5vh, 50px); }',
    '#x49-onlinebar.v115-limpa{ gap:8px; max-width:none; padding:0; border-radius:0; background:none; box-shadow:none; }',
    '#x49-onlinebar.v115-limpa > span{ display:none; }',
    '#x49-onlinebar.v115-limpa.v115-esq{ right:auto; }',
    '#x49-onlinebar.v115-limpa.v115-col{ flex-direction:column; align-items:flex-start; }',
    '#x49-onlinebar.v115-limpa.v115-aviso > span{ display:block; align-self:center; padding:6px 12px; border-radius:999px; color:#ffe9a8; background:rgba(10,14,40,.86); box-shadow:inset 0 0 0 2px rgba(255,210,63,.5); }',
    '#x49-onlinebar.v115-limpa > button{ width:var(--v115-t); height:var(--v115-t); min-width:0; padding:0; border-radius:12px; font-size:0; color:transparent; letter-spacing:0; overflow:hidden;',
    '  border:3px solid #14161a; box-shadow:0 4px 0 rgba(20,22,26,.85); background:#2f7cf6 ' + v115Url(V115_ICONES.sala) + ' center/58% no-repeat !important; }',
    '#x49-onlinebar.v115-limpa > button#x49-camera{ background:#2f7cf6 ' + v115Url(V115_ICONES.camera) + ' center/60% no-repeat !important; }',
    '#x49-onlinebar.v115-limpa > button#v88-espec-sair{ background:#e2392f ' + v115Url(V115_ICONES.sair) + ' center/60% no-repeat !important; }',
    '#x49-onlinebar.v115-limpa > button:active{ transform:translateY(3px); box-shadow:0 1px 0 rgba(20,22,26,.85); }',
    '#x49-onlinebar.v115-limpa > button:focus-visible{ outline:3px solid #ffd23f; outline-offset:2px; }',
    '#x49-onlinebar.v115-limpa > button[hidden]{ display:none !important; }',
    '#v115-fps{ position:fixed; z-index:38; left:max(10px, env(safe-area-inset-left)); bottom:max(6px, env(safe-area-inset-bottom)); display:grid; grid-template-columns:auto auto; column-gap:12px;',
    '  pointer-events:none; text-align:center; color:#fff; font:400 clamp(11px, 3.3vh, 15px)/1.08 "Lilita One","Arial Black",Impact,system-ui,sans-serif; font-synthesis:none;',
    '  text-shadow:1px 0 0 #14161a, -1px 0 0 #14161a, 0 1px 0 #14161a, 0 -1px 0 #14161a, 1px 1px 0 #14161a, -1px 1px 0 #14161a, 0 2px 3px rgba(0,0,0,.5); }',
    '#v115-fps > :nth-child(1){ grid-area:1/1; } #v115-fps > :nth-child(2){ grid-area:1/2; } #v115-fps > :nth-child(3){ grid-area:2/1; } #v115-fps > :nth-child(4){ grid-area:2/2; }',
    '#v115-fps b{ font-weight:400; }',
    '#v115-fps.v115-sem-ping .v115-p{ display:none; }',
    '#v115-fps[hidden]{ display:none !important; }'
  ].join('\n');
  document.head.appendChild(st);
  const cx = document.createElement('div'); cx.id = 'v115-fps'; cx.hidden = true; cx.setAttribute('aria-hidden', 'true');
  cx.innerHTML = '<span>FPS</span><span class="v115-p">Ping</span><b class="v115-f">—</b><b class="v115-p v115-v">—</b>';
  document.body.appendChild(cx);
  V115.caixa = cx; V115.fEl = cx.querySelector('.v115-f'); V115.pEl = cx.querySelector('.v115-v');
  try {                                                    // (o SALA só tinha o texto: o nome falado continua sendo o dele)
    const b = X49UI.onlinebar && X49UI.onlinebar.querySelector('button');
    if (b && !b.id) { b.classList.add('v115-sala'); b.title = 'Abrir a sala'; }
  } catch (_) {}
})();

function v115Modo() {                                      // a partida de uma sala que não é a ranqueada
  const r = typeof NET49 === 'object' ? NET49.room : null;
  return !!(NET49.playing && r && !r.ranked);
}
if (typeof x49GameUI === 'function') {
  const x49GameUIAntes115 = x49GameUI;
  x49GameUI = function () {
    const out = x49GameUIAntes115.apply(this, arguments);
    try {
      const bar = X49UI.onlinebar; if (!bar) return out;
      const limpa = v115Modo();
      if (limpa !== V115.limpa) { V115.limpa = limpa; bar.classList.toggle('v115-limpa', limpa); }
      const aviso = limpa && /esperando/i.test(X49UI.netText ? X49UI.netText.textContent || '' : '');   // (a pausa do árbitro já tem o aviso grande no meio da tela)
      if (aviso !== V115.aviso) { V115.aviso = aviso; bar.classList.toggle('v115-aviso', aviso); }
      const sala = bar.querySelector('button.v115-sala');
      if (sala) { const n = limpa ? 'Abrir a sala' : null; if ((sala.getAttribute('aria-label') || null) !== n) { if (n) sala.setAttribute('aria-label', n); else sala.removeAttribute('aria-label'); } }
      V115.caixa.hidden = !(limpa && !bar.hidden);
      const agora = performance.now();
      if (limpa && !bar.hidden && agora - V115.lugarT > 300) { V115.lugarT = agora; v115Lugar(bar); }
      else if (!limpa && V115.lugar) v115Solta(bar);
    } catch (_) {}
    return out;
  };
}
function v115Solta(bar) {                                  // (fora da sala: a faixa volta ao lugar dela)
  V115.lugar = ''; V115.esq = false;
  bar.classList.remove('v115-esq', 'v115-col'); bar.style.left = ''; bar.style.top = '';
}
function v115Lugar(bar) {                                  // a fila do lado da pausa (ou embaixo dela)
  const c = cv.getBoundingClientRect(), k = c.width / W, b = BTN_PAUSA;
  if (!(k > 0)) return;
  const pl = c.left + b.x * k, pt = c.top + b.y * k, pw = b.w * k, ph = b.h * k;
  if (pl + pw / 2 > innerWidth * 0.4 || pt + ph / 2 > innerHeight * 0.3) { if (V115.lugar) v115Solta(bar); return; }   // (a pausa mudou de lugar)
  const bs = [...bar.querySelectorAll(':scope > button')].filter(x => !x.hidden);
  if (!bs.length) return;
  const t = bs[0].offsetHeight || 40, gap = 8, larg = bs.length * t + (bs.length - 1) * gap;
  let x = pl + pw + gap + 2, y = pt + (ph - t) / 2, col = false;
  const obs = [];
  try { obs.push(V93F.el.bt); } catch (_) {} try { obs.push(V93P.el.bt); } catch (_) {} try { obs.push(EMO106.el.bt); } catch (_) {}
  for (const o of obs) {                                   // (os botões do placar no caminho: desce)
    try {
      if (!o || o.hidden || o.closest('[hidden]')) continue;
      const r = o.getBoundingClientRect(); if (r.width < 2 || getComputedStyle(o).display === 'none') continue;
      if (r.left < x + larg + gap && r.right > x - gap && r.top < y + t + gap && r.bottom > y - gap) col = true;
    } catch (_) {}
  }
  if (col) { x = pl + (pw - t) / 2; y = pt + ph + gap + 4; }
  const L = Math.round(x) + 'px', T = Math.round(y) + 'px', chave = L + T + col;
  if (chave === V115.lugar) return;
  V115.lugar = chave; V115.esq = true;
  bar.classList.add('v115-esq'); bar.classList.toggle('v115-col', col);
  bar.style.left = L; bar.style.top = T;
}
if (typeof v95LimiteDireita === 'function') {               // (o placar abria espaço para a faixa à direita; à esquerda, não precisa)
  const v95LimiteDireitaAntes115 = v95LimiteDireita;
  v95LimiteDireita = function () { if (V115.limpa && V115.esq) return Infinity; return v95LimiteDireitaAntes115.apply(this, arguments); };
}
addEventListener('resize', () => { V115.lugarT = 0; });
setInterval(() => {                                        // o FPS e o ping, uma vez por segundo (só com a caixinha à vista)
  try {
    const agora = performance.now();
    const q = typeof V112D === 'object' ? V112D.desenhos : (typeof V112T === 'object' ? V112T.q : 0);
    if (V115.ultT && q >= V115.ultQ) V115.fps = Math.round((q - V115.ultQ) * 1000 / Math.max(1, agora - V115.ultT));   // (a conta zera na partida nova)
    V115.ultQ = q; V115.ultT = agora;
    if (!V115.caixa || V115.caixa.hidden) return;
    const f = String(Math.max(0, V115.fps));
    if (V115.fEl.textContent !== f) V115.fEl.textContent = f;
    const local = !!(NET49.room && NET49.room.local);
    if (local !== V115.semPing) { V115.semPing = local; V115.caixa.classList.toggle('v115-sem-ping', local); }
    const p = !local && NET49.ping > 0 ? String(Math.round(NET49.ping)) : '—';
    if (V115.pEl.textContent !== p) V115.pEl.textContent = p;
  } catch (_) {}
}, 1000);
window.RachaLimpa115 = { estado: () => ({ limpa: V115.limpa, aviso: V115.aviso, fps: V115.fps, caixa: V115.caixa && !V115.caixa.hidden }) };
