/* ======================================================================================================================
   RACHA v95 · O VISUAL SEM CARA DE IA (o pedido: "deixe o jogo sem cara de IA, melhore tudo — gráficos, lobby etc., menos a
   mecânica; os botões e o perfil bem organizados e tangíveis").
   · A ARTE: os fundos, o letreiro, o banner do perfil, a folha de ícones e os banners de perfil que vinham de imagens geradas
     por IA (v75, v77 e v91) foram trocados por desenhos feitos em código (tools/v95/arte: a quadra da quebrada no fim da tarde,
     em cores chapadas, como um cartaz) — a troca é no build (tools/v95/v95.py), com as mesmas medidas.
   · A TAMPINHA DO MEIO (lobby e perfil): sem a luz roxa borrada atrás, sem o anel de neon e sem o reflexo de chão molhado
     (a quadra é de cimento): fica a sombra no chão, a luz do refletor do desenho e a lateral de metal (a espessura) cinza.
   · OS BOTÕES viram PLACAS: a face chapada, o contorno de tinta e a beirada de baixo grossa — apertar afunda a placa (v95.css,
     parte 6). Sem brilho de neon em volta; o que é cor diz alguma coisa: a coluna da esquerda tem a faixa laranja (o lado do
     Time A) e a da direita, a roxa (o Time B); o amarelo é só do JOGAR.
   Só aparência: partida, física, rede, conta, moedas e gemas não mudam.
   ====================================================================================================================== */
const V95V = {on:true};
try { document.documentElement.classList.add('v95v'); if (LB && LB.raiz) LB.raiz.classList.add('v95v'); } catch (_) {}

/* ---------------------------------------------------------------- a tampinha em pé: sem neon, sem reflexo, a lateral de metal */
if (typeof v91Palco3D === 'function'){
  v91Palco3D = function(slot, R, k0){                      // (o que não mexe: só a sombra macia no chão, embaixo da tampinha)
    const MS = V91.palcos || (V91.palcos = {}), key = Math.round(R*k0) + '|' + k0.toFixed(3) + '|v95';
    let P = MS[slot];
    if (P && P.key === key) return P;
    const k = k0*.6, L = R*4.2, H2 = R*3.9, cx = L/2, y0 = R*1.8, chao = y0 + R*1.0;
    const c = P && P.c || document.createElement('canvas');
    c.width = Math.ceil(L*k); c.height = Math.ceil(H2*k);
    const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, L, H2);
    g.save(); g.translate(cx, chao + R*.03); g.scale(1, .2);
    const gr = g.createRadialGradient(0, 0, R*.35, 0, 0, R*1.55); gr.addColorStop(0, 'rgba(6,8,22,.42)'); gr.addColorStop(1, 'rgba(6,8,22,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R*1.55, 0, TAU); g.fill(); g.restore();
    const b = P && P.b || document.createElement('canvas'); b.width = 1; b.height = 1;   // (o pulso da música não acende nada)
    P = MS[slot] = {key, c, b, L, H2, cx, y0};
    return P;
  };
}
function v95Lateral(M){                                    // a espessura da tampinha: o metal da saia, do escuro (longe) ao cinza (perto)
  if (!M || !M.face || !M.som || !M.l3) return;
  const lado = M.face.width, px = M.px || lado/2.5, dx = px*V91_3D.dx, dy = px*V91_3D.dy, n = V91_3D.passos;
  const sil = cor => { const s2 = M.som.getContext('2d'); s2.setTransform(1, 0, 0, 1, 0, 0); s2.globalCompositeOperation = 'source-over'; s2.clearRect(0, 0, lado, lado);
    s2.drawImage(M.face, 0, 0); s2.globalCompositeOperation = 'source-in'; s2.fillStyle = cor; s2.fillRect(0, 0, lado, lado); s2.globalCompositeOperation = 'source-over'; return M.som; };
  const l3 = M.l3.getContext('2d'); l3.setTransform(1, 0, 0, 1, 0, 0); l3.clearRect(0, 0, M.l3.width, M.l3.height);
  l3.drawImage(sil('#0f1222'), dx + px*.02, dy + px*.02);  // (o contorno de tinta por fora da lateral)
  for (let i = n; i >= 1; i--){
    const fr = (i - .55)/n, t2 = 1 - (i - 1)/(n - 1 || 1);
    const c0 = [18, 20, 32], c1 = [92, 98, 118], cor = 'rgb(' + c0.map((v, j) => Math.round(v + (c1[j] - v)*t2)).join(',') + ')';
    l3.drawImage(sil(cor), dx*fr, dy*fr);
  }
}
if (typeof v91Molde === 'function'){
  const v91MoldeAntesV = v91Molde;
  v91Molde = function(slot){
    const MS = V91.moldes || {}, M0 = MS[slot], antes = M0 ? M0.key + '|' + M0.t : '';
    const M = v91MoldeAntesV.apply(this, arguments);
    try { if (M && (M.key + '|' + M.t) !== antes) v95Lateral(M); } catch (e) { console.error('v95 lateral', e); }
    return M;
  };
}
if (typeof v91Tampa3D === 'function'){
  const v91Tampa3DAntesV = v91Tampa3D;
  v91Tampa3D = function(g, slot, x, y0, R, k, t, o){ return v91Tampa3DAntesV.call(this, g, slot, x, y0, R, k, t, Object.assign({}, o || {}, {semReflexo:true})); };
}
try { if (V91.palcos) V91.palcos = {}; if (V91.moldes) for (const k in V91.moldes) V91.moldes[k].key = ''; } catch (_) {}

/* ---------------------------------------------------------------- o lobby: a dica embaixo da tampinha (sem a pílula, em frase) */
function v95Dica(){
  const d = document.querySelector('#lb .v90-dica span'), t = 'Toque para abrir o cofre, segure para trocar';
  if (d && d.textContent !== t) d.textContent = t;
}
if (typeof lbRender === 'function'){
  const lbRenderAntesV = lbRender;
  lbRender = function(){ const r = lbRenderAntesV.apply(this, arguments); try { v95Dica(); if (LB && LB.raiz) LB.raiz.classList.add('v95v'); } catch (_) {} return r; };
}
try { v95Dica(); } catch (_) {}
window.RachaVisual95 = {lateral:v95Lateral};
