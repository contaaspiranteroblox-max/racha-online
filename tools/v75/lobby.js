/* ======================================================================================================================
   RACHA rua v75 · o fundo do LOBBY é a imagem enviada (tools/v75/lobby_fundo_original.png): a quadra da favela com o Rio de
   Janeiro atrás — o Cristo no Corcovado, o Pão de Açúcar, a praia e o morro colorido — no fim de tarde.
   Qual implementação valia: o pintaFundoLobby (jogo-base) chama o cenaQuadra, que entrega o desenho ao window.RUA_CENA do
   lobby.js (o céu, o Cristo, o morro, o muro e a quadra desenhados) e a v71 (tools/v71/lobby.js) embrulha esse RUA_CENA com
   o véu escuro nas bordas e embaixo (onde ficam os botões). A v75 embrulha de novo: com a imagem aberta, ela é o cenário
   (cobrindo a tela inteira, o meio da quadra da imagem embaixo da tampinha) e o mesmo véu da v71 vai por cima; enquanto a
   imagem abre, um degradê nas cores dela; se a imagem não abrir, fica o cenário desenhado de antes (o lobby.js com o véu).
   O resto do lobby não muda: o letreiro RACHA, a tampinha no meio com a luz no chão, a bola e todos os botões.
   A imagem vai embutida pelo build (LOBBY75 · tools/v75/lobby_fundo.webp, feito por tools/v75/lobby_fundo.py): o jogo
   continua sendo um arquivo que funciona sozinho, sem internet.
   ====================================================================================================================== */
const LOBBY75 = /*FUNDO75*/null;                            // {src:'data:image/webp;base64,…', w:1844, h:853} (o build põe)
const L75 = {el:null, ok:false, erro:false, ext:null,
  foco:[930, 672],                                          // px da imagem: o meio da quadra (a marca do centro, na linha do meio-campo)
  cores:[[0, '#197fe7'], [.1, '#5293cf'], [.2, '#888877'], [.35, '#675b4e'], [.5, '#644c33'], [.65, '#4d5b45'], [.8, '#778f4a'], [.9, '#587d3f'], [1, '#6f533b']]};   // (a média de cada faixa da imagem: o degradê de espera)
function l75Repinta(){ try { LB.fundo.dataset.k = ''; pintaFundoLobby(); } catch (_) {} }
if (LOBBY75 && LOBBY75.src){
  const im = new Image();
  im.onload = () => { L75.ok = true; l75Repinta(); };
  im.onerror = () => { L75.erro = true; window.RUA_LOBBY75_ERRO = 'a imagem do lobby não abriu'; l75Repinta(); };
  im.src = LOBBY75.src; L75.el = im;
  if (im.complete && im.naturalWidth) L75.ok = true;
}
function l75Veu(g, w, h, X){                                // o mesmo véu da v71: escuro nas bordas (os botões) e embaixo; o meio fica aceso
  g.save();
  if (!(X && X.ret)){
    const lado = Math.min(560, w*.32);
    for (const [x0, x1] of [[0, lado], [w, w - lado]]){ const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, 'rgba(8,10,14,.5)'); gr.addColorStop(1, 'rgba(8,10,14,0)'); g.fillStyle = gr; g.fillRect(Math.min(x0, x1), 0, lado, h); }
  }
  const gb = g.createLinearGradient(0, h, 0, h - 280); gb.addColorStop(0, 'rgba(8,10,14,.5)'); gb.addColorStop(1, 'rgba(8,10,14,0)'); g.fillStyle = gb; g.fillRect(0, h - 280, w, 280);
  const gt = g.createLinearGradient(0, 0, 0, 150); gt.addColorStop(0, 'rgba(8,10,14,.32)'); gt.addColorStop(1, 'rgba(8,10,14,0)'); g.fillStyle = gt; g.fillRect(0, 0, w, 150);
  g.restore();
}
const L75_BORDA = {lado:300, topo:170, alto:100};             // px da imagem: o espelho dos lados e de cima · px do palco: onde fica o alto da imagem (abaixo da fileira de cima)
function l75Estendida(){                                    // a imagem com as beiradas espelhadas (dos lados e em cima): só aparecem atrás dos botões
  if (L75.ext) return L75.ext;
  const im = L75.el, iw = LOBBY75.w, ih = LOBBY75.h, P = L75_BORDA.lado, PT = L75_BORDA.topo;
  const c = document.createElement('canvas'); c.width = iw + 2*P; c.height = ih + PT;
  const g = c.getContext('2d');
  g.drawImage(im, P, PT);
  g.save(); g.translate(P, 0); g.scale(-1, 1); g.drawImage(im, 0, 0, P, ih, 0, PT, P, ih); g.restore();                 // o lado esquerdo, espelhado
  g.save(); g.translate(P + iw, 0); g.scale(-1, 1); g.drawImage(im, iw - P, 0, P, ih, -P, PT, P, ih); g.restore();     // o direito
  const ceu = g.createLinearGradient(0, 0, 0, PT);            // em cima: o azul do céu da imagem (espelhar repetiria o Cristo de cabeça para baixo;
  ceu.addColorStop(0, '#0858c4'); ceu.addColorStop(1, '#0a78e8');   // esticar a primeira fila puxaria a nuvem do canto num borrão cinza)
  g.fillStyle = ceu; g.fillRect(0, 0, c.width, PT);
  for (let i = 0; i < 12; i++){ g.globalAlpha = .7*(1 - i/12); g.fillStyle = '#0a78e8'; g.fillRect(0, PT + i*4, c.width, 4); }   // (a emenda some aos poucos)
  g.globalAlpha = 1;
  return (L75.ext = c);
}
function l75Encaixe(w, h, chao, cx, X){                      // onde a imagem vai (px do palco): o alto dela abaixo da fileira de cima (o Cristo aparece), o
  const iw = LOBBY75.w, ih = LOBBY75.h, [fx, fy] = L75.foco, B = L75_BORDA;   // meio da quadra embaixo da tampinha e nenhuma beirada vazia
  const deitado = !(X && X.ret) && w >= h;
  let s = deitado ? (h - B.alto)/ih : Math.max(w/iw, h/ih), y = deitado ? B.alto : 0;
  s = Math.max(s, w/(iw + 2*B.lado), h/(ih + B.topo));        // (numa tela larga demais, aumenta até cobrir)
  if (y - B.topo*s > 0) y = B.topo*s;
  if (y + ih*s < h) y = h - ih*s;
  const W = iw*s, x = W >= w ? Math.min(0, Math.max(w - W, cx - fx*s)) : Math.max(w - (iw + B.lado)*s, Math.min(B.lado*s, cx - fx*s));
  return {x, y, W, H:ih*s, s};
}
function l75Cena(g, w, h, chao, cx, X){
  const E = l75Encaixe(w, h, chao, cx, X), B = L75_BORDA, ext = l75Estendida();
  g.save();
  try { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; } catch (_) {}
  g.drawImage(ext, E.x - B.lado*E.s, E.y - B.topo*E.s, ext.width*E.s, ext.height*E.s);
  g.restore();
  l75Veu(g, w, h, X);
  return true;
}
function l75Espera(g, w, h, X){                              // a imagem ainda abrindo (um instante): o degradê nas cores dela, com o véu
  const gr = g.createLinearGradient(0, 0, 0, h);
  for (const [t, c] of L75.cores) gr.addColorStop(t, c);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  l75Veu(g, w, h, X);
  return true;
}
(function(){
  const cenaAntes75 = typeof window.RUA_CENA === 'function' ? window.RUA_CENA : null;
  window.RUA_CENA = function(g, w, h, chao, cx, esq, dir, zonas, X){
    if (LOBBY75 && !L75.erro){
      try { return L75.ok ? l75Cena(g, w, h, chao, cx, X) : l75Espera(g, w, h, X); }
      catch (e) { window.RUA_LOBBY75_ERRO = String(e && e.stack); }
    }
    return cenaAntes75 ? cenaAntes75.apply(this, arguments) : false;   // (sem a imagem: o cenário desenhado de antes)
  };
  l75Repinta();                                             // (o lobby já foi pintado antes daqui: pinta de novo, já com a imagem ou com o degradê)
})();
