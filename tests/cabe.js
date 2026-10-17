// v70.1 · no celular deitado tudo cabe: na tela aberta agora nenhuma caixa rola na vertical (fora as que rolam de propósito:
// a conversa do chat e as faixas que arrastam de lado) e nenhum botão fica fora da tela (fora os das faixas de lado).
// Devolve {rola:[descrições], fora:[descrições], zoom:[{alvo, z}]}.
(function(raizSel){
  const vis = n => { if (!n || !n.isConnected) return false; if (n.closest('[hidden]')) return false; const s = getComputedStyle(n); if (s.visibility === 'hidden' || s.display === 'none') return false; const r = n.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const raizes = (raizSel ? Array.from(document.querySelectorAll(raizSel)) : [document.body]).filter(vis);
  const PODE = '#br-lista, .tpe-faixa, .sl-caixa';
  const desc = el => (el.id ? '#' + el.id : el.tagName.toLowerCase()) + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const deLado = el => { for (let p = el.parentElement; p; p = p.parentElement){ const c = getComputedStyle(p); if (/(auto|scroll)/.test(c.overflowX) && p.scrollWidth > p.clientWidth + 2) return true; } return false; };
  const rola = [], fora = [], zoom = [], vw = innerWidth, vh = innerHeight;
  for (const raiz of raizes) for (const el of [raiz, ...raiz.querySelectorAll('*')]){
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2 && !el.matches(PODE)) rola.push(desc(el) + ' ' + el.clientHeight + '→' + el.scrollHeight);
    if (el.dataset && el.dataset.v70z) zoom.push({alvo:desc(el), z:+el.dataset.v70z});
  }
  for (const raiz of raizes) for (const b of raiz.querySelectorAll('button, [role=button], [role=tab], a[href], input:not([type=hidden]), select, textarea')){
    if (!vis(b)) continue;
    const r = b.getBoundingClientRect();
    if ((r.bottom > vh + 1 || r.right > vw + 1 || r.top < -1 || r.left < -1) && !deLado(b)) fora.push((b.getAttribute('aria-label') || b.textContent || desc(b)).replace(/\s+/g, ' ').trim().slice(0, 24) + ' @' + Math.round(r.left) + ',' + Math.round(r.top));
  }
  return {rola, fora:fora.slice(0, 6), zoom};
})
