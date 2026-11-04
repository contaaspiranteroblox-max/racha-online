/* ======================================================================================================================
   RACHA v104 · A TELA INTEIRA SÓ COM O JOGO (o pedido: "a tela cheia ainda fica com umas bordas estranhas, meio bugadas; quero
   tela cheia sem bordas meio transparentes — totalmente transparente, só o jogo")
   A v103 pintava as faixas em volta da área do jogo num canvas de trás (a moldura: o campo escurecido, redesenhado no máximo
   10 vezes por segundo): parecia uma borda à parte, escura, que andava atrasada. Agora o PRÓPRIO canvas do jogo cobre a tela
   toda — o mundo (o campo, as tampinhas, a bola, as redes) vai até a beirada, no mesmo quadro, sem escurecer:
     · a área de sempre (1920 × 888 da tela virtual: o HUD, os botões, o analógico, a pausa) continua no mesmo lugar e do mesmo
       tamanho, dentro da área segura do celular (o entalhe e a barrinha do iPhone ficam só com o campo);
     · como: o canvas vai para a tela toda; o contexto soma o deslocamento da área de sempre em cada setTransform (o jogo
       continua desenhando nas mesmas coordenadas de sempre) e no getImageData/putImageData, e o canvas responde, no
       getBoundingClientRect, a área de sempre (os toques, o HUD e as janelas por cima continuam fazendo as mesmas contas);
     · no Ultra leve e na partida da Oficina fica como antes (as faixas na cor do fundo do campo); RACHA_CONFIG.telaInteira =
       false desliga.
   ====================================================================================================================== */
const V104T = {on:false, ox:0, oy:0, oxc:0, oyc:0, rw:0, rh:0};
const V104T_ST = CanvasRenderingContext2D.prototype.setTransform, V104T_RT = CanvasRenderingContext2D.prototype.resetTransform;
const V104T_BCR = Element.prototype.getBoundingClientRect;
ctx.setTransform = function(a, b, c, d, e, f){
  if (!V104T.on) return V104T_ST.apply(this, arguments);
  if (arguments.length === 0) return V104T_ST.call(this, 1, 0, 0, 1, V104T.ox, V104T.oy);
  if (arguments.length === 1 && a && typeof a === 'object'){
    const m = a, v = (x, y, p) => typeof m[x] === 'number' ? m[x] : typeof m[y] === 'number' ? m[y] : p;
    return V104T_ST.call(this, v('a', 'm11', 1), v('b', 'm12', 0), v('c', 'm21', 0), v('d', 'm22', 1), v('e', 'm41', 0) + V104T.ox, v('f', 'm42', 0) + V104T.oy);
  }
  return V104T_ST.call(this, a, b, c, d, e + V104T.ox, f + V104T.oy);
};
if (typeof V104T_RT === 'function') ctx.resetTransform = function(){ return V104T.on ? V104T_ST.call(this, 1, 0, 0, 1, V104T.ox, V104T.oy) : V104T_RT.call(this); };
// (ler e escrever pixels também na conta da área de sempre: quem lia o pixel (x·K, y·K) continua lendo o mesmo ponto do jogo)
const V104T_GID = CanvasRenderingContext2D.prototype.getImageData, V104T_PID = CanvasRenderingContext2D.prototype.putImageData;
ctx.getImageData = function(sx, sy){ if (!V104T.on) return V104T_GID.apply(this, arguments); const a = [...arguments]; a[0] = sx + V104T.ox; a[1] = sy + V104T.oy; return V104T_GID.apply(this, a); };
ctx.putImageData = function(img, dx, dy){ if (!V104T.on) return V104T_PID.apply(this, arguments); const a = [...arguments]; a[1] = dx + V104T.ox; a[2] = dy + V104T.oy; return V104T_PID.apply(this, a); };
cv.getBoundingClientRect = function(){
  const r = V104T_BCR.call(this);
  return V104T.on ? new DOMRect(r.left + V104T.oxc, r.top + V104T.oyc, V104T.rw, V104T.rh) : r;
};
function v104TelaQuer(){
  try { if (window.RACHA_CONFIG && window.RACHA_CONFIG.telaInteira === false) return false; } catch (_) {}
  try { if (G().plano) return false; } catch (_) {}                      // (Ultra leve: nada a mais para desenhar)
  try { if (typeof OFJ !== 'undefined' && OFJ && OFJ.on) return false; } catch (_) {}   // (a Oficina tem o fundo dela)
  return true;
}
function v104Encaixa(){
  const s = (typeof HUDX !== 'undefined' && HUDX.css) || 1, q = K/s;   // (px do aparelho por px da página: a qualidade escolhida)
  const rw = Math.floor(W*s), rh = Math.floor(H*s), st = cv.style;
  st.position = ''; st.left = ''; st.top = ''; st.width = rw + 'px'; st.height = rh + 'px';   // (a área de sempre, no lugar de sempre)
  if (!v104TelaQuer()){
    const bw = Math.max(1, Math.round(W*K)), bh = Math.max(1, Math.round(H*K));
    if (cv.width !== bw || cv.height !== bh){ cv.width = bw; cv.height = bh; }
    V104T.on = false; V104T.ox = V104T.oy = 0;
    return;
  }
  const r = V104T_BCR.call(cv);
  const vw = Math.max(1, Math.round(window.innerWidth || r.width)), vh = Math.max(1, Math.round(window.innerHeight || r.height));
  st.position = 'fixed'; st.left = '0px'; st.top = '0px'; st.width = vw + 'px'; st.height = vh + 'px';
  const bw = Math.max(1, Math.round(vw*q)), bh = Math.max(1, Math.round(vh*q));
  if (cv.width !== bw || cv.height !== bh){ cv.width = bw; cv.height = bh; }
  Object.assign(V104T, {oxc:r.left, oyc:r.top, rw:r.width, rh:r.height, ox:Math.round(r.left*q), oy:Math.round(r.top*q), on:true});
}
const resizeAntes104 = resize;
resize = function(){
  const out = resizeAntes104.apply(this, arguments);
  try { v104Encaixa(); } catch (e) { console.error('v104 tela inteira', e); }
  return out;
};
const renderAntes104 = render;
render = function(){
  try {
    if (v104TelaQuer() !== V104T.on) v104Encaixa();
    if (V104T.on){                                       // (o render limpa a partir da área de sempre: as faixas de cima e da esquerda aqui)
      V104T_ST.call(ctx, 1, 0, 0, 1, 0, 0);
      ctx.fillStyle = (typeof CAMPO !== 'undefined' && CAMPO.fundo) || '#121212';
      if (V104T.oy > 0) ctx.fillRect(0, 0, cv.width, V104T.oy);
      if (V104T.ox > 0) ctx.fillRect(0, 0, V104T.ox, cv.height);
    }
  } catch (_) {}
  return renderAntes104.apply(this, arguments);
};
try { if (typeof V103M !== 'undefined'){ V103M.desligada = true; if (typeof v103MolduraEsconde === 'function') v103MolduraEsconde(); } } catch (_) {}   // (a moldura da v103 sai: o jogo cobre a tela)
try { v104Encaixa(); } catch (e) { console.error('v104 tela inteira', e); }
window.RachaTelaInteira104 = {estado:() => Object.assign({}, V104T), encaixa:v104Encaixa};
