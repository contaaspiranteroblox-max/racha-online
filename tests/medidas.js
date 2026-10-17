// Mede a tela aberta agora, no tamanho final (depois de qualquer transform): alvos de toque e texto.
// Devolve {alvos:[{rotulo, w, h}], pequenos:[...< 44 px], texto:{min, pequenos:[{tx, px}]}, cortados:[...]}
(function(raizSel){
  const vis = n => { if (!n || !n.isConnected) return false; if (n.closest('[hidden]')) return false; const s = getComputedStyle(n); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false; const r = n.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const raizes = raizSel ? Array.from(document.querySelectorAll(raizSel)).filter(vis) : [document.body];
  const vw = innerWidth, vh = innerHeight;
  const rot = n => (n.getAttribute('aria-label') || n.textContent || n.title || n.id || n.className || n.tagName).replace(/\s+/g, ' ').trim().slice(0, 28);
  const escala = n => { const r = n.getBoundingClientRect(); return n.offsetWidth ? r.width/n.offsetWidth : 1; };
  // a área de toque: a caixa e um ::before/::after posicionado que passe dela (o toque no pseudo-elemento vale para o botão)
  const alcance = (n, r) => {
    let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom; const k = escala(n), cs = getComputedStyle(n);
    const bt = parseFloat(cs.borderTopWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0, bl = parseFloat(cs.borderLeftWidth) || 0;
    for (const pe of ['::before', '::after']){
      const s = getComputedStyle(n, pe);
      if (s.content === 'none' || s.content === 'normal' || s.position !== 'absolute' || s.pointerEvents === 'none' || s.display === 'none') continue;
      const L = parseFloat(s.left), R = parseFloat(s.right), T = parseFloat(s.top), B = parseFloat(s.bottom);
      if (![L, R, T, B].every(Number.isFinite)) continue;
      x0 = Math.min(x0, r.left + (bl + L)*k); x1 = Math.max(x1, r.right - (br + R)*k); y0 = Math.min(y0, r.top + (bt + T)*k); y1 = Math.max(y1, r.bottom - (bb + B)*k);
    }
    return {w:x1 - x0, h:y1 - y0};
  };
  const alvos = [], pequenos = [], cortados = [];
  const sel = 'button, [role=button], [role=tab], a[href], input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"]), .lb-btn';
  const vistos = new Set();
  for (const raiz of raizes) for (const n of raiz.querySelectorAll(sel)){
    if (vistos.has(n) || !vis(n)) continue; vistos.add(n);
    const r = n.getBoundingClientRect();
    if (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh){ continue; }   // fora da tela (rolagem): não conta como pequeno
    const cx = Math.max(0, Math.min(vw - 1, r.left + r.width/2)), cy = Math.max(0, Math.min(vh - 1, r.top + r.height/2)), topo = document.elementFromPoint(cx, cy);
    if (topo && topo !== n && !n.contains(topo) && !topo.contains(n)) continue;   // coberto por outra camada (tela ou janela por cima)
    let {w, h} = alcance(n, r);
    if (n.matches('input[type=range]')){ h = Math.max(h, 0); }
    const a = {rotulo:rot(n), w:Math.round(w), h:Math.round(h)};
    alvos.push(a);
    if (Math.min(w, h) < 43.5) pequenos.push(a);
    if (r.left < -1 || r.right > vw + 1) cortados.push(a);
  }
  const txt = [];
  for (const raiz of raizes){
    const it = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    let t; const ja = new Set();
    while ((t = it.nextNode())){
      const s = t.data.replace(/\s+/g, ' ').trim(); if (s.length < 2) continue;
      const el = t.parentElement; if (!el || ja.has(el) || !vis(el)) continue; ja.add(el);
      const r = el.getBoundingClientRect(); if (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh) continue;
      const cx = Math.max(0, Math.min(vw - 1, r.left + r.width/2)), cy = Math.max(0, Math.min(vh - 1, r.top + r.height/2)), topo = document.elementFromPoint(cx, cy);
      if (topo && topo !== el && !el.contains(topo) && !topo.contains(el) && !(topo.closest && el.closest && topo.closest('button, [role=button]') === el.closest('button, [role=button]') && el.closest('button, [role=button]'))) continue;   // coberto por outra camada (texto atrás de uma tela não conta)
      const px = parseFloat(getComputedStyle(el).fontSize)*escala(el);
      txt.push({tx:s.slice(0, 24), px:+px.toFixed(1)});
    }
  }
  txt.sort((a, b) => a.px - b.px);
  return {n:alvos.length, pequenos:pequenos.sort((a, b) => Math.min(a.w, a.h) - Math.min(b.w, b.h)), cortados, texto:{min:txt.length ? txt[0].px : null, pequenos:txt.filter(x => x.px < 12)}};
})
