/* ======================================================================================================================
   RACHA v103 · O LOBBY DE DIA (o pedido: "use esta imagem de fundo", com a quadra de grama do Bar do Seu Zé, a bandeira do
   Brasil, as palmeiras, os refletores e a favela, de dia).
   O fundo troca no build (tools/v103/v103.py): o V101_FUNDO da v101 passa a ser a imagem enviada (tools/v103/arte/fundo_dia.*)
   e o fundo das telas, a mesma cena desfocada — a arrumação da v101/v102 continua igual (a tampinha no meio do palco, os
   cartões flutuando por cima). Aqui, a tampinha do meio de dia: em pé no círculo do meio da quadra, com a sombra macia na
   grama e a luz do sol em cima à esquerda — sem a luz roxa atrás, sem o anel de neon, sem as faíscas e sem o reflexo de chão
   molhado (que eram da quadra da noite). Só aparência: partida, física, rede e conta não mudam.
   ====================================================================================================================== */
const V103D = {dia:!!(typeof V101_FUNDO !== 'undefined' && V101_FUNDO && V101_FUNDO.info && V101_FUNDO.info.dia)};
try { if (V103D.dia){ document.documentElement.classList.add('v103-dia'); if (LB && LB.raiz) LB.raiz.classList.add('v103-dia'); } } catch (_) {}
const v103Dia = () => V103D.dia && typeof V101 !== 'undefined' && V101.on;

/* ---------------------------------------------------------------- o que não mexe: a sombra larga na grama */
if (typeof v91Palco3D === 'function'){
  const v91Palco3DAntes103 = v91Palco3D;
  v91Palco3D = function(slot, R, k0){
    if (!v103Dia()) return v91Palco3DAntes103.apply(this, arguments);
    const MS = V91.palcos || (V91.palcos = {}), key = Math.round(R*k0) + '|' + k0.toFixed(3) + '|dia';
    let P = MS[slot];
    if (P && P.key === key) return P;
    const k = k0*.6, L = R*4.2, H2 = R*3.9, cx = L/2, y0 = R*1.8, chao = y0 + R*1.0;
    const c = P && P.c || document.createElement('canvas');
    c.width = Math.ceil(L*k); c.height = Math.ceil(H2*k);
    const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, L, H2);
    // o sol alto e um pouco da esquerda (as sombras da cena puxam para a direita): a sombra larga e macia, deslocada
    g.save(); g.translate(cx + R*.14, chao + R*.02); g.scale(1, .2);
    const gr = g.createRadialGradient(0, 0, R*.3, 0, 0, R*1.5);
    gr.addColorStop(0, 'rgba(10,30,6,.46)'); gr.addColorStop(.6, 'rgba(10,30,6,.2)'); gr.addColorStop(1, 'rgba(10,30,6,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R*1.5, 0, TAU); g.fill(); g.restore();
    const b = P && P.b || document.createElement('canvas'); b.width = 1; b.height = 1;   // (de dia o pulso da música não acende nada)
    P = MS[slot] = {key, c, b, L, H2, cx, y0};
    return P;
  };
}

/* ---------------------------------------------------------------- a tampinha em pé na grama */
function v103Tampa3D(g, slot, x, y0, R, k, t, o){
  o = o || {};
  const calmo = v91Calmo(), sk = skinAtual(), z = o.z || 1;
  const bob = calmo || o.parada ? 0 : Math.sin(t*1.6)*R*.014, y = y0 - Math.abs(bob)*.6 + bob*.4;
  const chao = y0 + R*1.0;
  const P = v91Palco3D(slot, R, k), ox = x - P.cx, oy = y0 - P.y0;
  g.drawImage(P.c, ox, oy, P.L, P.H2);
  const M = v91Molde(slot, sk, R, k, t), esc = 1/k, L = M.lado*esc;
  // a sombra de contato: curta e firme, onde a beirada encosta na grama
  g.save(); g.translate(x + R*.05, chao); g.scale(1 - bob*.004, .13);
  let gr = g.createRadialGradient(0, 0, 4, 0, 0, R*.98);
  gr.addColorStop(0, 'rgba(6,20,4,.74)'); gr.addColorStop(.7, 'rgba(6,20,4,.3)'); gr.addColorStop(1, 'rgba(6,20,4,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R*.98, 0, TAU); g.fill(); g.restore();
  g.save(); g.translate(x, y); g.scale(z, z);
  if (M.l3) g.drawImage(M.l3, -L/2, -L/2, M.l3.width*esc, M.l3.height*esc);
  botaoPronto(g, 0, 0, R, sk, perfil.avatar, {t, bx:null, by:null, id:0, humor:''}, k*z);
  // a luz do sol: o brilho em cima à esquerda (um pouco mais quente e mais forte que o do refletor da noite)
  g.save(); g.beginPath(); g.arc(0, 0, R*.97, 0, TAU); g.clip();
  gr = g.createRadialGradient(-R*.42, -R*.5, R*.05, -R*.3, -R*.35, R*1.05);
  gr.addColorStop(0, 'rgba(255,253,236,.3)'); gr.addColorStop(.45, 'rgba(255,253,236,.09)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(-R, -R, 2*R, 2*R); g.restore();
  g.restore();
}
if (typeof v91Tampa3D === 'function'){
  const v91Tampa3DAntes103 = v91Tampa3D;
  v91Tampa3D = function(g, slot, x, y0, R, k, t, o){
    if (!v103Dia()) return v91Tampa3DAntes103.apply(this, arguments);
    return v103Tampa3D(g, slot, x, y0, R, k, t, o);
  };
}
try { if (V91.palcos) V91.palcos = {}; } catch (_) {}
