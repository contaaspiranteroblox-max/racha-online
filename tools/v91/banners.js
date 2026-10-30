/* ======================================================================================================================
   RACHA v91 · OS BANNERS DE PERFIL NO ESTILO DA IMAGEM: as 6 cenas do catálogo (Laje Noturna, Pôr do Sol, Muro Grafitado,
   Cristo ao Fundo, Arquibancada e Carnaval) agora são recortes da própria quadra da tela inicial, com a luz de cada uma
   (tools/v91/banners.py → o atlas V91_BANNERS). Os banners do pódio (v90) continuam desenhados como antes.
   E o SEU PERFIL mostra o banner que está equipado (antes era sempre o mesmo, o das casas no escuro).
   Sem a imagem (ainda carregando), fica o desenho de antes; quando ela chega, as miniaturas são refeitas.
   ====================================================================================================================== */
const V91B = {img:null, ok:false, cenas:{}};
(function(){
  if (typeof V91_BANNERS === 'undefined' || !V91_BANNERS) return;
  V91_BANNERS.cenas.forEach((n, i) => { V91B.cenas[n] = i; });
  const im = new Image(); im.decoding = 'async';
  im.onload = () => {
    V91B.ok = true;
    try { if (typeof V88C !== 'undefined' && V88C.mini) V88C.mini.clear(); } catch (_) {}
    try { if (typeof v88Repinta === 'function') for (const t of ['loja', 'cofre', 'v88passe', 'v88eventos', 'v88caixa']) v88Repinta(t); } catch (_) {}
    try { v91PfBanner(); } catch (_) {}
  };
  im.src = V91_BANNERS.src; V91B.img = im;
})();
if (typeof v88DesenhaBanner === 'function'){
  const v88DesenhaBannerAntes91 = v88DesenhaBanner;
  v88DesenhaBanner = function(g, w, h, it, t){
    const V = (it && it.visual) || {cena:'laje'}, i = V91B.cenas[V.cena || 'laje'];
    if (!V91B.ok || i == null) return v88DesenhaBannerAntes91.apply(this, arguments);
    const B = V91_BANNERS, ar = w/h, arB = B.w/B.h;
    let sw = B.w, sh = B.h, sx = 0, sy = i*B.h;                   // (cobrir: corta o que sobra, no meio)
    if (ar > arB){ sh = B.w/ar; sy += (B.h - sh)/2; } else { sw = B.h*ar; sx = (B.w - sw)/2; }
    g.save();
    try { g.imageSmoothingQuality = 'high'; } catch (_) {}
    g.drawImage(V91B.img, sx, sy, sw, sh, 0, 0, w, h);
    const vg = g.createLinearGradient(0, 0, w, 0); vg.addColorStop(0, 'rgba(6,10,34,.42)'); vg.addColorStop(.42, 'rgba(6,10,34,0)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    const br = g.createLinearGradient(0, 0, 0, h); br.addColorStop(0, 'rgba(255,255,255,.12)'); br.addColorStop(.18, 'rgba(255,255,255,0)'); g.fillStyle = br; g.fillRect(0, 0, w, h);
    g.restore();
  };
}
// o seu perfil: o banner equipado atrás do nome (o letreiro RACHA continua por cima)
function v91PfBanner(){
  const tela = TELAS.perfil && TELAS.perfil.el, ban = tela && tela.querySelector('.v77-pf-banner'); if (!ban) return;
  const cod = typeof v88Equipado === 'function' ? v88Equipado('banner') || 'banner_laje_noturna' : 'banner_laje_noturna';
  const it = typeof v88Item === 'function' ? v88Item(cod) : null; if (!it) return;
  const w = Math.max(40, ban.clientWidth || 440), h = Math.max(20, ban.clientHeight || 120), k = Math.min(2, window.devicePixelRatio || 1)*(PALCO.s || 1);
  let c = ban.querySelector(':scope > canvas.v91-pf-ban');
  if (!c){ c = document.createElement('canvas'); c.className = 'v91-pf-ban'; c.setAttribute('aria-hidden', 'true'); ban.insertBefore(c, ban.firstChild); }
  const key = cod + '|' + w + 'x' + h + '@' + k.toFixed(2) + (V91B.ok ? '' : '*');
  if (c.dataset.k === key) return;
  c.width = Math.round(w*k); c.height = Math.round(h*k); c.dataset.k = key;
  const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0);
  try { v88DesenhaBanner(g, w, h, it, 0); } catch (e) { console.error('v91 banner', e); }
  ban.classList.add('v91-com-banner');
}
if (typeof v88On === 'function') v88On('equipados', () => { try { const c = document.querySelector('.v91-pf-ban'); if (c) c.dataset.k = ''; v91PfBanner(); } catch (_) {} });
