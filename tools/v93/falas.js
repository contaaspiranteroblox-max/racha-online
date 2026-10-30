/* ==================================================================================================================
   RACHA v93 · Fase 5 — OS BALÕES DE FALA RÁPIDA
   Oito frases prontas (sem texto livre: nada para o filtro barrar): Golaço! · Que defesa! · Passa! · Boa! · Foi mal! ·
   Obrigado! · Sem problemas! · Minha culpa!
   · Um botão pequeno do lado do placar (o balão) abre um menu compacto (duas colunas); tocar numa frase manda e fecha. No
     computador, as teclas 1 a 8 com o menu aberto (e o T abre/fecha o menu).
   · O balão aparece perto da tampinha de quem falou por 2,6 s, legível (do tamanho do HUD, não do zoom da câmera), e procura
     o lado em que não cobre a bola, os gols, os controles, o placar nem a pausa (em cima, embaixo, dos lados).
   · No máximo uma frase a cada 1,6 s (e o servidor confere o ritmo de novo: quem passa dele é ignorado).
   · BALÕES: LIGADOS/DESLIGADOS no próprio menu (guardado no aparelho): desligado, nenhum balão aparece na sua tela.
   · Online, vai pelo servidor para todos da sala (fala {i}; quem bloqueou você não recebe); contra os bots, só na sua tela.
   Nada aqui mexe nos comandos: o menu fica fora dos controles e não pega o toque deles.
   ================================================================================================================== */
const V93F_FRASES = ['Golaço!', 'Que defesa!', 'Passa!', 'Boa!', 'Foi mal!', 'Obrigado!', 'Sem problemas!', 'Minha culpa!'];
const V93F_DUR = 2600, V93F_INTERVALO = 1600, V93F_CHAVE = 'racha-falas-v1';
const V93F = {baloes:new Map(), ult:0, menu:false, menuT:0, el:{}, desl:false, lugares:new Map(), desenhados:[]};
try { const o = JSON.parse(localStorage.getItem(V93F_CHAVE) || '{}'); V93F.desl = o && o.desl === true; } catch (_) {}
function v93FalaGuarda(){ try { localStorage.setItem(V93F_CHAVE, JSON.stringify({desl:V93F.desl})); } catch (_) {} }

/* ---------------------------------------------------------------- 1) mandar e receber */
function v93FalaPode(){ return RQ.on && !lobby.aberto && !editing && !RP.ativo && !PAUSA.aberta && !(NET49.playing && NET49.localSlot < 0) && !(typeof HE !== 'undefined' && HE.aberto) && !TR.on; }
function v93FalaManda(i){
  if (!(i >= 0 && i < V93F_FRASES.length) || !v93FalaPode()) return false;
  const agora = performance.now();
  if (agora - V93F.ult < V93F_INTERVALO){ try { som.erro(); } catch (_) {} return false; }
  V93F.ult = agora;
  v93FalaMostra(NET49.playing ? NET49.id : 'eu', i);
  if (NET49.playing) net49Send({type:'fala', i});
  try { som.clique(); } catch (_) {}
  v93FalaMenu(false);
  return true;
}
function v93FalaMostra(quem, i){ V93F.baloes.set(quem, {i, t0:performance.now()}); }
function v93FalaQuem(k){                                       // a tampinha de quem falou
  if (k === 'eu' || (NET49.playing && k === NET49.id && NET49.localSlot >= 0)) return P;
  return RQ.jog.find(q => q.netId === k) || null;
}
const net49MessageAntes93f = net49Message;
net49Message = function(m){
  if (m && m.type === 'fala'){ try { if (m.id && m.id !== NET49.id && Number.isInteger(m.i)) v93FalaMostra(m.id, m.i); } catch (_) {} return; }
  return net49MessageAntes93f.apply(this, arguments);
};

/* ---------------------------------------------------------------- 2) o balão (no HUD, do lado livre da tampinha) */
function v93FalaObst(){                                         // o que o balão não cobre (coordenadas da tela virtual)
  const z = cam.z, o = [];
  const tela = (x, y) => [W/2 + (x - cam.x)*z, H/2 + (y - cam.y)*z];
  const b = tela(VIS.bx, VIS.by); o.push({c:[b[0], b[1], B.r*z + 26], peso:40});
  for (const gx of [[LX0 - GOL_PROF, LX0], [LX1, LX1 + GOL_PROF]]){
    const a = tela(gx[0], GOL_Y0), c = tela(gx[1], GOL_Y1); o.push({r:{x:a[0] - 10, y:a[1] - 10, w:c[0] - a[0] + 20, h:c[1] - a[1] + 20}, peso:12});
  }
  for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id); o.push({c:[e.x, e.y, e.r + 14], peso:60}); }
  try { const hk = HUDX.k || 1, pw = v80PlacarW()*hk; o.push({r:{x:W/2 - pw/2 - 160*hk, y:0, w:pw + 320*hk, h:(PLACAR80.y + PLACAR80.h + 44)*hk}, peso:30}); } catch (_) {}   // (o placar, a faixa de baixo e os dois botões do lado)
  try { o.push({r:{x:BTN_PAUSA.x - 10, y:BTN_PAUSA.y - 10, w:BTN_PAUSA.w + 20, h:BTN_PAUSA.h + 20}, peso:30}); } catch (_) {}
  return o;
}
function v93FalaCusto(R, obst){
  let c = 0;
  if (R.x < 8 || R.y < 8 || R.x + R.w > W - 8 || R.y + R.h > H - 8) c += 500;
  for (const o of obst){
    if (o.c){ const nx = Math.max(R.x, Math.min(o.c[0], R.x + R.w)), ny = Math.max(R.y, Math.min(o.c[1], R.y + R.h)); if (Math.hypot(nx - o.c[0], ny - o.c[1]) < o.c[2]) c += o.peso; }
    else if (R.x < o.r.x + o.r.w && R.x + R.w > o.r.x && R.y < o.r.y + o.r.h && R.y + R.h > o.r.y) c += o.peso;
  }
  return c;
}
function v93FalaDesenha(g){
  if (!V93F.baloes.size || !RQ.on) return;
  const agora = performance.now();
  for (const [k, b] of V93F.baloes) if (agora - b.t0 > V93F_DUR) V93F.baloes.delete(k);
  V93F.desenhados = [];
  if (V93F.desl || editing || RP.ativo || !V93F.baloes.size) return;
  const z = cam.z, a = VIS.a == null ? 1 : VIS.a, obst = v93FalaObst(), u = Math.max(1, Math.min(1.6, HUDX.k || 1)), tam = Math.round(26*u);   // (no tamanho do HUD: no celular, maior)
  g.save(); g.font = tam + 'px ' + FONT;
  for (const [k, b] of V93F.baloes){
    const q = v93FalaQuem(k); if (!q) continue;
    const wx = q === P ? VIS.px : q.ax + (q.x - q.ax)*a + (q.ex || 0), wy = q === P ? VIS.py : q.ay + (q.y - q.ay)*a + (q.ey || 0);
    const sx = W/2 + (wx - cam.x)*z, sy = H/2 + (wy - cam.y)*z, rr0 = q.r*z;
    const s = V93F_FRASES[b.i] || '', w = Math.ceil(g.measureText(s).width) + 34*u, h = 46*u, o1 = 18*u, o2 = 6*u, o3 = 14*u;
    // o lado: em cima (o normal), embaixo, à direita, à esquerda — o que não cobre nada (o lado da vez fica um tempo, sem pular)
    const L = [{x:sx - w/2, y:sy - rr0 - o1 - h, cx:sx, cy:sy - rr0 - o2, k:'c', c0:0}, {x:sx - w/2, y:sy + rr0 + o1, cx:sx, cy:sy + rr0 + o2, k:'b', c0:3},
      {x:sx + rr0 + o1, y:sy - h/2, cx:sx + rr0 + o2, cy:sy, k:'d', c0:4}, {x:sx - rr0 - o1 - w, y:sy - h/2, cx:sx - rr0 - o2, cy:sy, k:'e', c0:4},
      {x:sx + rr0*.4, y:sy - rr0 - o3 - h, cx:sx + rr0*.5, cy:sy - rr0*.8, k:'cd', c0:2}, {x:sx - rr0*.4 - w, y:sy - rr0 - o3 - h, cx:sx - rr0*.5, cy:sy - rr0*.8, k:'ce', c0:2}];
    const antes = V93F.lugares.get(k);
    let m = null;
    for (const p of L){ const c = p.c0 + v93FalaCusto({x:p.x, y:p.y, w, h}, obst) - (antes === p.k ? 3 : 0); if (!m || c < m.c) m = Object.assign({c}, p); }
    V93F.lugares.set(k, m.k);
    const t = agora - b.t0, ent = Math.min(1, t/140), sai = Math.min(1, (V93F_DUR - t)/320), al = Math.max(0, Math.min(ent, sai)), esc = .7 + .3*(1 - Math.pow(1 - ent, 3));
    const x = Math.max(8, Math.min(W - 8 - w, m.x)), y = Math.max(8, Math.min(H - 8 - h, m.y)), mx = x + w/2, my = y + h/2;
    V93F.desenhados.push({k, i:b.i, x, y, w, h, lado:m.k, custo:m.c});   // (o que ficou na tela: os testes conferem que não cobre nada)
    g.save(); g.globalAlpha = al; g.translate(mx, my); g.scale(esc, esc); g.translate(-mx, -my);
    g.lineJoin = 'round';
    // o rabinho apontando para a tampinha
    const tx = Math.max(x + 16*u, Math.min(x + w - 16*u, m.cx)), ty = Math.max(y + 12*u, Math.min(y + h - 12*u, m.cy));
    const lado = m.k === 'c' || m.k === 'cd' || m.k === 'ce' ? [tx, y + h] : m.k === 'b' ? [tx, y] : m.k === 'd' ? [x, ty] : [x + w, ty];
    rr(g, x + 3*u, y + 5*u, w, h, 18*u); g.fillStyle = 'rgba(8,4,24,.3)'; g.fill();
    rr(g, x, y, w, h, 18*u); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 3.5*u; g.strokeStyle = '#14102e'; g.stroke();
    const vert = m.k === 'd' || m.k === 'e', d = vert ? [0, 11*u] : [11*u, 0], fora = (m.k === 'b' || m.k === 'd' ? -1.5 : 1.5)*u;   // (o rabinho por cima da borda)
    g.beginPath(); g.moveTo(lado[0] - d[0], lado[1] - d[1]); g.lineTo(m.cx, m.cy); g.lineTo(lado[0] + d[0], lado[1] + d[1]); g.closePath(); g.fillStyle = '#ffffff'; g.fill();
    g.beginPath(); g.moveTo(lado[0] - d[0], lado[1] - d[1] + (vert ? 0 : -fora)); g.lineTo(m.cx, m.cy); g.lineTo(lado[0] + d[0], lado[1] + d[1] + (vert ? 0 : -fora)); g.stroke();
    g.fillStyle = rqCor(q.time | 0).base; rr(g, x + 7*u, y + 7*u, 6*u, h - 14*u, 3*u); g.fill();
    txt(g, s, x + w/2 + 3*u, y + h/2 + u, tam, '#1b1530', null);
    g.restore();
  }
  g.restore();
}
const desenhaEspecRotuloAntes93 = desenhaEspecRotulo;
desenhaEspecRotulo = function(g){ const r = desenhaEspecRotuloAntes93.apply(this, arguments); try { v93FalaDesenha(g); } catch (_) {} return r; };

/* ---------------------------------------------------------------- 3) o botão e o menu */
function v93FalaMonta(){
  if (V93F.el.bt) return;
  const wrap = document.getElementById('wrap') || document.body;
  const bt = V93F.el.bt = novoBotao('v93-fl-bt', 'Falas rápidas');
  bt.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4.6h18v11.4H9.4L5 19.6v-3.6H3z" fill="currentColor"/><circle cx="8" cy="10.3" r="1.5" fill="#14102e"/><circle cx="12" cy="10.3" r="1.5" fill="#14102e"/><circle cx="16" cy="10.3" r="1.5" fill="#14102e"/></svg>';
  bt.hidden = true;
  bt.addEventListener('pointerdown', e => e.stopPropagation());
  bt.addEventListener('click', e => { e.stopPropagation(); try { som.clique(); } catch (_) {} v93FalaMenu(!V93F.menu); });
  const mn = V93F.el.menu = nodo('div', 'v93-fl-menu'); mn.hidden = true; mn.setAttribute('role', 'menu'); mn.setAttribute('aria-label', 'Falas rápidas');
  mn.addEventListener('pointerdown', e => e.stopPropagation());
  V93F_FRASES.forEach((s, i) => {
    const b = novoBotao('v93-fl-fr', s); b.setAttribute('role', 'menuitem');
    b.append(nodo('i', null, String(i + 1)), document.createTextNode(s));
    b.addEventListener('click', e => { e.stopPropagation(); v93FalaManda(i); });
    mn.appendChild(b);
  });
  const lig = V93F.el.lig = novoBotao('v93-fl-lig', 'Mostrar os balões de fala');
  lig.addEventListener('click', e => { e.stopPropagation(); try { som.clique(); } catch (_) {} V93F.desl = !V93F.desl; v93FalaGuarda(); v93FalaPinta(); });
  mn.appendChild(lig);
  wrap.append(bt, mn);
}
function v93FalaMenu(on){ V93F.menu = !!on; V93F.menuT = performance.now(); v93FalaPinta(); }
function v93FalaPinta(){
  const bt = V93F.el.bt, mn = V93F.el.menu; if (!bt) return;
  const vis = v93FalaPode();
  bt.hidden = !vis; bt.setAttribute('aria-expanded', String(V93F.menu && vis));
  if (!vis) V93F.menu = false;
  if (V93F.menu && performance.now() - V93F.menuT > 6000) V93F.menu = false;   // (esquecido aberto: fecha sozinho)
  mn.hidden = !(vis && V93F.menu);
  V93F.el.lig.textContent = 'BALÕES: ' + (V93F.desl ? 'DESLIGADOS' : 'LIGADOS'); V93F.el.lig.classList.toggle('off', V93F.desl);
  const espera = performance.now() - V93F.ult < V93F_INTERVALO;
  mn.classList.toggle('espera', espera);
  if (vis) v93FalaLugar();
}
function v93FalaLugar(){                                       // do lado do placar, junto do botão dos jogadores; o menu embaixo, fora dos controles
  const bt = V93F.el.bt, mn = V93F.el.menu; if (!bt) return;
  const c = cv.getBoundingClientRect(), wr = (bt.offsetParent || document.body).getBoundingClientRect(), k = c.width/W;
  const L = v93LadoPlacar(), lado = L.lado, ocupado = (() => { try { const b = V93P.el.bt; return b && !b.hidden && V93P.ladoX != null ? V93P.ladoX : null; } catch (_) { return null; } })();
  const xs = ocupado === L.xs[0] || ocupado == null ? [L.xs[2], L.xs[1], L.xs[3], L.xs[0]] : [L.xs[0], L.xs[2], L.xs[3], L.xs[1]];   // (ao lado do botão dos jogadores)
  let x = xs[0], melhor = 1e9;
  xs.forEach((x0, ordem) => {                                   // (o que custa menos: nunca em cima de um controle, da pausa ou do outro botão; o rótulo do modo, só se não tiver outro lugar)
    if (ocupado != null && Math.abs(x0 - ocupado) < lado) return;
    const R = {x:x0, y:L.y - lado/2, w:lado, h:lado}; let custo = ordem;
    for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id); if (heSobra(R, {x:e.x, y:e.y, r:e.r + 10})) custo += 1000; }
    try { if (heSobra(R, {x:BTN_PAUSA.x + BTN_PAUSA.w/2, y:BTN_PAUSA.y + BTN_PAUSA.h/2, r:BTN_PAUSA.w/2 + 8})) custo += 1000; } catch (_) {}
    custo += v93RotuloCusto(R);
    if (custo < melhor){ melhor = custo; x = x0; }
  });
  const px = Math.max(36, Math.round(lado*k));
  bt.style.width = bt.style.height = px + 'px';
  bt.style.left = Math.round(c.left - wr.left + x*k + (lado*k - px)/2) + 'px';
  bt.style.top = Math.round(c.top - wr.top + L.y*k - px/2) + 'px';
  if (!mn.hidden){
    const mw = mn.offsetWidth, mh = mn.offsetHeight, br = bt.getBoundingClientRect(), y0 = br.bottom + 8;
    let melhor = null;
    for (const xc of [br.left + br.width/2 - mw/2, br.right - mw, br.left, c.left + (c.width - mw)/2]){
      const Rr = {x:xc, y:y0, w:mw, h:mh}; let custo = Math.abs(xc - (br.left + br.width/2 - mw/2))*.05;
      if (xc < c.left + 6 || xc + mw > c.right - 6) custo += 400;
      for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id); if (heSobra(Rr, {x:c.left + e.x*k, y:c.top + e.y*k, r:e.r*k + 8})) custo += 1000; }
      if (!melhor || custo < melhor.c) melhor = {c:custo, x:xc};
    }
    mn.style.left = Math.round(melhor.x - wr.left) + 'px'; mn.style.top = Math.round(y0 - wr.top) + 'px';
  }
}
/* ---------------------------------------------------------------- 4) o rótulo do modo do lado direito do placar (CASUAL, SALA PRIVADA…)
   Os botões do lado do placar não ficam em cima dele; e no celular, online, quando a barra da sala (SALA XXXX · admin · 40 ms)
   fica por cima do rótulo, ele não é desenhado (antes os dois textos se encavalavam; a barra já diz a sala). */
const V93R = {t:0, esc:false, x0:0};
function v93RotuloPlacar(){                                     // o retângulo do rótulo (na tela virtual, já com o tamanho do HUD)
  const hk = HUDX.k || 1, w = v80PlacarW(), s0 = x49ModeName() + (X49.matchMode === 'ranked' ? ' · ' + rqElo(CONTA.rq.pts).nome : '');
  let w0 = medeTxt(s0, '22px ' + FONT); const md = RQ.jogo, M = MD_MAP.get(md);
  if (V70_MD_COR[md] && M) w0 += 12 + medeTxt(M.nome, '17px ' + FONT) + 22;
  const x0 = W/2 + (w/2 + 16)*hk;
  return {x:x0, y:(38 - 15)*hk, w:w0*hk, h:30*hk};
}
function v93RotuloCusto(R){ try { if (V93R.esc) return 0; const Q = v93RotuloPlacar(); return R.x < Q.x + Q.w && R.x + R.w > Q.x && R.y < Q.y + Q.h && R.y + R.h > Q.y ? 100 : 0; } catch (_) { return 0; } }
function v93RotuloEscondido(){                                  // (o desenho pergunta a cada quadro; a resposta vale 0,4 s)
  const agora = performance.now(); if (agora - V93R.t < 400) return V93R.esc;
  V93R.t = agora; V93R.esc = false;
  try {
    const b = X49UI.onlinebar; if (!NET49.playing || !b || b.hidden) return false;
    const r = b.getBoundingClientRect(); if (!r.width) return false;
    const c = cv.getBoundingClientRect(), k = c.width/W, Q = v93RotuloPlacar();
    V93R.esc = c.left + (Q.x + Q.w)*k > r.left && c.left + Q.x*k < r.right && c.top + (Q.y + Q.h)*k > r.top && c.top + Q.y*k < r.bottom;
  } catch (_) { V93R.esc = false; }
  return V93R.esc;
}
setInterval(() => { try { v93FalaPinta(); } catch (_) {} }, 500);
addEventListener('resize', () => { try { v93FalaLugar(); } catch (_) {} });
document.addEventListener('pointerdown', e => { try { if (V93F.menu && !V93F.el.menu.contains(e.target) && !V93F.el.bt.contains(e.target)) v93FalaMenu(false); } catch (_) {} }, true);
addEventListener('keydown', e => {                               // (o computador: T abre e fecha; 1 a 8 com o menu aberto)
  try {
    if (!v93FalaPode() || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.code === 'KeyT'){ e.preventDefault(); e.stopImmediatePropagation(); v93FalaMenu(!V93F.menu); return; }   // (o T não é tecla de controle: TECLA_PROIBIDAS)
    if (V93F.menu && /^Digit[1-8]$/.test(e.code)){ e.preventDefault(); e.stopImmediatePropagation(); v93FalaManda(+e.code.slice(5) - 1); }   // (com o menu aberto, o número é a frase)
  } catch (_) {}
}, true);
v93FalaMonta();
window.RachaFalas93 = {frases:V93F_FRASES.slice(), manda:i => v93FalaManda(i), baloes:() => [...V93F.baloes.entries()].map(([k, b]) => ({k, i:b.i}))};
