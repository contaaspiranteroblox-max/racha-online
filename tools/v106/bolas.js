/* ======================================================================================================================
   RACHA v106 · AS BOLAS NOVAS (o desenho): três padrões novos, desenhados aqui em código, que giram com a bola de sempre.
     praia   · os GOMOS do polo ao polo (como a bola de praia e a do futevôlei), com as tampas e as costuras;
     chamas  · as LABAREDAS subindo de um lado da bola, em três camadas e com o contorno escuro;
     galaxia · o ESPAÇO: a nebulosa (ou a faixa da Via Láctea), as estrelas e os brilhos.
   O desenho é feito ponto a ponto na esfera: cada pixel da bola vira um ponto da superfície, que volta para o "lugar da
   bola" pela matriz do giro (a mesma Rm do desenho da bola de sempre: a bola nova rola e gira igual), e ganha a cor do
   padrão e a luz (em cima à esquerda, com o brilho). As estrelas e os brilhos vão por cima, girando junto. O contorno e a
   sombra são os de todas as bolas. Só o desenho: o raio, a colisão e a física não mudam (nada sai do círculo da bola).
   (declarações function e var: nada aqui depende da ordem do script)
   ====================================================================================================================== */
var BL106;                                                 // {buf: Map(lado → canvas), est: Map(semente → estrelas)} (criado no primeiro desenho)
function bl106Estado(){ return BL106 || (BL106 = {buf:new Map(), est:new Map()}); }
// a matriz do giro que leva o eixo da bola (o polo do padrão) para a direção z da tela, com a volta roll em torno dele
function bl106Olhar(zx, zy, zz, roll){
  let l = Math.hypot(zx, zy, zz) || 1; const Z = [zx/l, zy/l, zz/l];
  const u = Math.abs(Z[2]) > .9 ? [1, 0, 0] : [0, 0, 1];
  let X = [u[1]*Z[2] - u[2]*Z[1], u[2]*Z[0] - u[0]*Z[2], u[0]*Z[1] - u[1]*Z[0]]; l = Math.hypot(X[0], X[1], X[2]) || 1; X = X.map(v => v/l);
  let Y = [Z[1]*X[2] - Z[2]*X[1], Z[2]*X[0] - Z[0]*X[2], Z[0]*X[1] - Z[1]*X[0]];
  const c = Math.cos(roll || 0), s = Math.sin(roll || 0), X2 = X.map((v, i) => v*c + Y[i]*s), Y2 = Y.map((v, i) => v*c - X[i]*s);
  return [X2[0], Y2[0], Z[0], X2[1], Y2[1], Z[1], X2[2], Y2[2], Z[2]];
}
// a matriz com o eixo y da bola apontando para (yx, yy, yz) na tela (o x o mais deitado possível)
function bl106ComY(yx, yy, yz){
  let l = Math.hypot(yx, yy, yz) || 1; const Y = [yx/l, yy/l, yz/l];
  let X = [1 - Y[0]*Y[0], -Y[0]*Y[1], -Y[0]*Y[2]]; l = Math.hypot(X[0], X[1], X[2]) || 1; X = X.map(v => v/l);
  const Z = [X[1]*Y[2] - X[2]*Y[1], X[2]*Y[0] - X[0]*Y[2], X[0]*Y[1] - X[1]*Y[0]];
  return [X[0], Y[0], Z[0], X[1], Y[1], Z[1], X[2], Y[2], Z[2]];
}
// a bola parada (a loja, o cofre, o correio): cada padrão virado do jeito que mostra mais dele
function bl106Parada(V){
  if (V && V.padrao === 'chamas') return bl106ComY(-.12, .94, -.32);        // (as labaredas subindo pela frente, o escuro em cima)
  if (V && V.padrao === 'praia') return bl106Olhar(.3, -.58, .76, .35);    // (a tampa em cima e os gomos descendo)
  return bl106Olhar(.25, -.3, .92, .2);
}
function bl106Hex(h){ const n = parseInt(/^#[0-9a-f]{6}$/i.test(h || '') ? h.slice(1) : '888888', 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function bl106Padroes(){ return ['praia', 'chamas', 'galaxia']; }
function bl106EhNova(V){ return !!V && (V.padrao === 'praia' || V.padrao === 'chamas' || V.padrao === 'galaxia'); }
function bl106Buf(S){                                      // o quadro do lado S (reaproveitado: nada de lixo a cada quadro)
  const E = bl106Estado(); let b = E.buf.get(S);
  if (!b){
    if (E.buf.size > 24) E.buf.clear();
    const c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'); b = {c, g, img:g.createImageData(S, S)}; E.buf.set(S, b);
  }
  return b;
}
function bl106Suave(a, b, x){ const t = Math.max(0, Math.min(1, (x - a)/(b - a))); return t*t*(3 - 2*t); }

// as cores de cada padrão já prontas (uma vez por item)
function bl106Prep(V){
  if (V.__bl106) return V.__bl106;
  const cores = (Array.isArray(V.cores) && V.cores.length ? V.cores : ['#e8322e', '#ffffff', '#2f74d8', '#ffffff', '#ffd23f', '#ffffff']).map(bl106Hex);
  const P = {cores, base:bl106Hex(V.base || '#ffffff'), linha:bl106Hex(V.linha || '#1b2233'), n:cores.length, est:bl106Hex(V.estrela || '#fff6dc')};
  if (V.padrao === 'galaxia'){                             // as nuvens da nebulosa: direções fixas na bola
    const d = [[.55, -.45, .7], [-.6, .3, .74], [.1, .85, -.5], [-.3, -.7, -.65]];
    P.neb = d.map((v, i) => { const l = Math.hypot(v[0], v[1], v[2]); return {x:v[0]/l, y:v[1]/l, z:v[2]/l, c:cores[i % cores.length], k:i < 2 ? 4.2 : 5.5}; });
    const a = [.3, .8, .52], la = Math.hypot(a[0], a[1], a[2]); P.eixo = [a[0]/la, a[1]/la, a[2]/la];
  }
  try { Object.defineProperty(V, '__bl106', {value:P, enumerable:false}); } catch (_) {}
  return P;
}
// a cor do ponto (x, y, z) da superfície (no lugar da bola), em out[0..2]; px = o tamanho de um pixel na esfera
function bl106Cor(V, P, x, y, z, px, out){
  if (V.padrao === 'praia'){
    const az = Math.abs(z), cap = .9;
    let c, borda = 9;
    if (az > cap){ c = P.base; borda = (az - cap)*2.3; }    // (2,3: o z vira a distância na superfície, perto da tampa)
    else {
      const lon = Math.atan2(y, x), f = (lon + Math.PI)/(Math.PI*2)*P.n, k = Math.floor(f), fr = f - k;
      c = P.cores[((k % P.n) + P.n) % P.n];
      const raio = Math.sqrt(Math.max(0, 1 - z*z));
      borda = Math.min(Math.min(fr, 1 - fr)*(Math.PI*2/P.n)*raio, (cap - az)*2.3);
    }
    const w = .022, t = bl106Suave(w - px*.6, w + px*.6, borda);
    out[0] = P.linha[0] + (c[0] - P.linha[0])*t; out[1] = P.linha[1] + (c[1] - P.linha[1])*t; out[2] = P.linha[2] + (c[2] - P.linha[2])*t;
    return;
  }
  if (V.padrao === 'chamas'){                              // (o eixo do fogo é o -y da bola: parada, as labaredas sobem pela frente)
    const lat = Math.asin(Math.max(-1, Math.min(1, -y))), lon = Math.atan2(z, x);
    const lingua = (fase, n) => Math.pow(Math.abs(Math.sin(n*.5*lon + fase)), .7);
    const e1 = -.26 + .9*lingua(.3, 7) + .1*Math.sin(3*lon + 1.3);
    const e2 = e1 - .42 + .14*lingua(1.1, 5), e3 = e2 - .5 + .12*lingua(2.2, 4);
    let c = P.base;
    if (lat < e3) c = P.cores[2] || P.cores[1] || P.cores[0];
    else if (lat < e2) c = P.cores[1] || P.cores[0];
    else if (lat < e1) c = P.cores[0];
    const w = .03, d1 = Math.abs(lat - e1), t = bl106Suave(w - px*.6, w + px*.6, d1);
    // (o calor em volta da labareda, no escuro de cima)
    const q = lat >= e1 ? Math.max(0, 1 - (lat - e1)/.35)*.35 : 0;
    const b0 = c[0] + (P.cores[0][0] - c[0])*q, b1 = c[1] + (P.cores[0][1] - c[1])*q, b2 = c[2] + (P.cores[0][2] - c[2])*q;
    out[0] = P.linha[0] + (b0 - P.linha[0])*t; out[1] = P.linha[1] + (b1 - P.linha[1])*t; out[2] = P.linha[2] + (b2 - P.linha[2])*t;
    return;
  }
  // galaxia
  let r = P.base[0], g = P.base[1], b = P.base[2];
  if (V.faixa){                                            // a Via Láctea: a faixa de luz em volta da bola, com a poeira escura no meio
    const s = x*P.eixo[0] + y*P.eixo[1] + z*P.eixo[2], luz = Math.exp(-s*s/.03) + .35*Math.exp(-s*s/.12), poeira = 1 - .5*Math.exp(-s*s/.0016);
    const c0 = P.cores[0], c1 = P.cores[1] || c0;
    r += (c0[0]*.6 + c1[0]*.4)*luz*.55; g += (c0[1]*.6 + c1[1]*.4)*luz*.55; b += (c0[2]*.6 + c1[2]*.4)*luz*.55;
    r *= poeira; g *= poeira; b *= poeira;
  }
  for (const n of P.neb){
    const d = x*n.x + y*n.y + z*n.z, k = Math.exp(-(1 - d)*n.k)*(V.faixa ? .35 : .9);
    r += n.c[0]*k; g += n.c[1]*k; b += n.c[2]*k;
  }
  out[0] = Math.min(255, r); out[1] = Math.min(255, g); out[2] = Math.min(255, b);
}
// as estrelas (direções fixas na bola, por semente): [x, y, z, tamanho, brilho]
function bl106Estrelas(sem, n, eixo){                     // (com o eixo da Via Láctea: metade delas junto da faixa)
  const E = bl106Estado(), k = sem + '|' + n + '|' + !!eixo; let l = E.est.get(k); if (l) return l;
  let s = (sem*2654435761) >>> 0 || 1; const rnd = () => { s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; };
  l = [];
  for (let i = 0; i < n; i++){
    const z = rnd()*2 - 1, a = rnd()*Math.PI*2, q = Math.sqrt(1 - z*z); let v = [Math.cos(a)*q, Math.sin(a)*q, z];
    if (eixo && i & 1){ const d = v[0]*eixo[0] + v[1]*eixo[1] + v[2]*eixo[2], f = .82; v = v.map((c, j) => c - eixo[j]*d*f); const L = Math.hypot(v[0], v[1], v[2]) || 1; v = v.map(c => c/L); }
    l.push([v[0], v[1], v[2], .35 + rnd()*.65, .45 + rnd()*.55]);
  }
  E.est.set(k, l); return l;
}
// a bola inteira em (x, y) com o raio r; M = a matriz do giro (do lugar da bola para a tela, como a Rm); sombra: a do chão
function bl106Desenha(g, x, y, r, V, M, sombra){
  if (!(r > 0)) return;
  const P = bl106Prep(V);
  if (sombra){ g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x + 3, y + 5, r*1.02, r*.92, 0, 0, Math.PI*2); g.fill(); }
  let esc = 1; try { const t = g.getTransform(); esc = Math.max(.1, Math.hypot(t.a, t.b)); } catch (_) {}
  const S = Math.max(8, Math.min(420, Math.ceil(2*r*esc))), B = bl106Buf(S), d = B.img.data, h = S/2, px = 2/S, out = [0, 0, 0];
  const L0 = -.42, L1 = -.55, L2 = .72;                  // (a luz: em cima à esquerda, na frente)
  const brilhante = V.padrao === 'galaxia' ? 1 : .55;
  for (let j = 0; j < S; j++){
    const ny = (j + .5 - h)/h;
    for (let i = 0; i < S; i++){
      const nx = (i + .5 - h)/h, d2 = nx*nx + ny*ny, o = (j*S + i)*4;
      const cob = (1 - Math.sqrt(d2))*h + .5;              // (quanto do pixel fica dentro da bola: a beirada lisa, nada para fora)
      if (cob <= 0){ d[o + 3] = 0; continue; }
      const nz = Math.sqrt(Math.max(0, 1 - d2));
      const lx = M[0]*nx + M[3]*ny + M[6]*nz, ly = M[1]*nx + M[4]*ny + M[7]*nz, lz = M[2]*nx + M[5]*ny + M[8]*nz;
      bl106Cor(V, P, lx, ly, lz, px, out);
      const lam = Math.max(0, nx*L0 + ny*L1 + nz*L2), luz = .58 + .52*lam, esp = Math.pow(lam, 22)*120*brilhante, beira = .8 + .2*nz;
      d[o] = Math.min(255, out[0]*luz*beira + esp); d[o + 1] = Math.min(255, out[1]*luz*beira + esp); d[o + 2] = Math.min(255, out[2]*luz*beira + esp);
      d[o + 3] = Math.min(255, cob*255);
    }
  }
  B.g.putImageData(B.img, 0, 0);
  g.drawImage(B.c, x - r, y - r, 2*r, 2*r);
  if (V.padrao === 'galaxia'){                             // as estrelas e os brilhos, girando com a bola (só na frente)
    g.save(); g.beginPath(); g.arc(x, y, r*.985, 0, Math.PI*2); g.clip();
    const est = bl106Estrelas(V.faixa ? 77 : 31, V.faixa ? 170 : 90, V.faixa ? P.eixo : null), cor = 'rgb(' + P.est.join(',') + ')', rp = Math.max(.6/esc, r*.028);
    g.fillStyle = cor;
    for (const s of est){
      const vx = M[0]*s[0] + M[1]*s[1] + M[2]*s[2], vy = M[3]*s[0] + M[4]*s[1] + M[5]*s[2], vz = M[6]*s[0] + M[7]*s[1] + M[8]*s[2];
      if (vz < .08) continue;
      g.globalAlpha = Math.min(1, s[4]*(.35 + .65*vz)); const t = rp*s[3]*(.6 + .4*vz);
      g.fillRect(x + vx*r - t, y + vy*r - t, 2*t, 2*t);
    }
    g.globalAlpha = 1;
    for (const s of [[.6, -.5, .62], [-.55, .2, .8], [.05, .7, -.71]]){   // os brilhos de 4 pontas
      const vx = M[0]*s[0] + M[1]*s[1] + M[2]*s[2], vy = M[3]*s[0] + M[4]*s[1] + M[5]*s[2], vz = M[6]*s[0] + M[7]*s[1] + M[8]*s[2];
      if (vz < .2) continue;
      const cx = x + vx*r, cy = y + vy*r, q = r*.16*vz;
      g.globalAlpha = .9*vz; g.beginPath(); g.moveTo(cx, cy - q); g.quadraticCurveTo(cx + q*.12, cy - q*.12, cx + q, cy); g.quadraticCurveTo(cx + q*.12, cy + q*.12, cx, cy + q);
      g.quadraticCurveTo(cx - q*.12, cy + q*.12, cx - q, cy); g.quadraticCurveTo(cx - q*.12, cy - q*.12, cx, cy - q); g.fill();
    }
    g.globalAlpha = 1; g.restore();
  }
  // o contorno (o de todas as bolas): por dentro do raio, para a bola não parecer maior
  const lw = Math.max(1/esc, r*.09);
  g.lineWidth = lw; g.strokeStyle = 'rgba(20,20,25,.78)'; g.beginPath(); g.arc(x, y, r - lw/2, 0, Math.PI*2); g.stroke();
}
