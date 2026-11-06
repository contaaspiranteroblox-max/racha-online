/* ======================================================================================================================
   RACHA v110 · O BOTÃO DE METAL E AS SOMBRAS
   O pedido (06/11/2026), com as imagens de dois botões (azul e vermelho, com a listra branca no meio): "deixe o jogo parecido
   com essas skins, as sombras etc." — e, perguntado, "em todas as peças" e "as cores de agora" nos times.
   1) A BOTÃO (a borda de todo mundo desde a v105: a inicial, as do time e a de fábrica) no estilo das imagens novas, medidas
      nelas (os números estão no CHANGELOG): o contorno preto fino por fora; o aro de METAL — escuro na beira de fora,
      clareando para dentro até o lábio claro junto do desenho, com a luz em cima à esquerda —; o sulco escuro entre o aro e
      o desenho; e o desenho afundado: a sombra por dentro em volta toda (mais forte embaixo e à direita, o lado contrário
      à luz) e um degradê leve de cima (mais claro) para baixo (mais escuro). O aro continua na cor 1 da borda (o ARO do
      editor): o branco de fábrica vira o metal prateado; um aro colorido vira o metal daquela cor.
   2) As sombras em todas as peças: as tampinhas com as outras bordas (as de dentes, a Medalhão das mascotes, as acesas) e as
      SEM BORDA ganham a mesma sombra por dentro e o mesmo degradê no desenho; a borda de cada uma continua a dela (as
      compradas não mudam). As caras animadas ficam como são (desenhadas a cada quadro, por cima).
   As medidas de sempre não mudam (o desenho até 84% do raio da BOTÃO, o filete e o tamanho da borda da v105): só a pintura.
   Só desenho, nas imagens prontas (uma por tampinha e tamanho): a física, o tamanho da tampinha e o alcance não mudam, e a
   partida não desenha nada a mais por quadro.
   ====================================================================================================================== */
const V110 = {tinta:'rgba(8,8,10,.97)', sulco:'rgba(60,60,64,.95)', contorno:.02, forca:1};

// o metal do aro, de dentro (t = 0, junto do sulco) para fora (t = 1, junto do contorno): o lábio claro logo depois do sulco,
// escurecendo até a beira de fora (as medidas das imagens: 94% de claro no lábio, 73% no meio, 56% perto do contorno)
function v110Metal(c){
  return [[0, tpMix(c, '#000000', .16)], [.12, tpMix(c, '#ffffff', .32)], [.4, tpMix(c, '#000000', .25)], [.64, tpMix(c, '#000000', .34)],
    [.9, tpMix(c, '#000000', .43)], [1, tpMix(c, '#000000', .5)]];
}
function v110Medidas(r, D){                                 // as da v105 (o desenho, o filete e o tamanho da borda), com o contorno mais fino
  const M = v105Medidas(r, D);
  return {R:M.R, wC:Math.max(1.1, M.R*V110.contorno), wF:M.wF, rt:M.rt};
}
// a sombra no desenho (quem chama já recortou o círculo do desenho; rd = o raio dele, k = a força): o degradê de cima para
// baixo, a sombra por dentro em volta toda e o reforço embaixo à direita (a luz vem de cima à esquerda)
function v110Sombra(g, x, y, rd, k){
  if (!(rd > 0)) return;
  k = (k == null ? 1 : k)*V110.forca;
  const a = v => 'rgba(0,0,0,' + Math.min(1, v*k).toFixed(3) + ')';
  // o degradê de cima para baixo: a cor clareia em cima e escurece embaixo, e o branco continua branco (como nas imagens: a
  // listra branca não muda, o azul vai de #0671c6 em cima a #0552b3 embaixo e o vermelho de #ee3f3f a #b32929) — o "overlay"
  // mexe nos tons do meio, o "color-dodge" clareia as cores fortes em cima e o "multiply" leve escurece embaixo
  const cz = s => { const v = Math.round(s); return 'rgb(' + v + ',' + v + ',' + v + ')'; }, kk = Math.min(1, k);
  const op = g.globalCompositeOperation, faixa = (modo, a0, a1, a2) => {
    const lv = g.createLinearGradient(x, y - rd, x, y + rd);
    lv.addColorStop(0, cz(a0)); lv.addColorStop(.5, cz(a1)); lv.addColorStop(1, cz(a2));
    g.globalCompositeOperation = modo; g.fillStyle = lv; g.fillRect(x - rd, y - rd, rd*2, rd*2);
  };
  faixa('overlay', 128 + 15*kk, 128, 128 - 26*kk);
  faixa('color-dodge', 16*kk, 0, 0);
  faixa('multiply', 255, 255, 255 - 13*kk);
  g.globalCompositeOperation = op;
  // (nas imagens: some a 86% do raio do desenho; 12% a 89%, 23% a 93%, 33% a 95% e metade colada no aro)
  const sh = g.createRadialGradient(x, y, rd*.855, x, y, rd);
  sh.addColorStop(0, a(0)); sh.addColorStop(.26, a(.12)); sh.addColorStop(.51, a(.23)); sh.addColorStop(.67, a(.33)); sh.addColorStop(.92, a(.5)); sh.addColorStop(1, a(.56));
  g.fillStyle = sh; g.fillRect(x - rd, y - rd, rd*2, rd*2);
  const ox = x - rd*.05, oy = y - rd*.06, sd = g.createRadialGradient(ox, oy, rd, ox, oy, rd*1.07);   // (só rente ao aro: embaixo à direita)
  sd.addColorStop(0, a(0)); sd.addColorStop(1, a(.45));
  g.fillStyle = sd; g.fillRect(x - rd, y - rd, rd*2, rd*2);
}

/* ---------------------------------------------------------------- 1) a BOTÃO de metal */
// o aro (r = o raio de fora, como o das outras bordas): o contorno, o metal e a luz — sozinho, ele é a "saia" da BOTÃO
// (a cara animada e o aro aceso põem o miolo por cima)
v102Aro = function(g, x, y, r, D){
  if (typeof tpSemBorda === 'function' && tpSemBorda(D)) return;   // (SEM BORDA: nada em volta do desenho)
  const M = v110Medidas(r, D), cor = (D && D.bc && TP_HEX.test(D.bc[0] || '') && D.bc[0]) || V105.aro;
  const dentro = M.rt + M.wF, fora = M.R - M.wC;
  g.beginPath(); g.arc(x, y, M.R, 0, TP_TAU); g.fillStyle = V110.tinta; g.fill();     // o contorno preto (o círculo inteiro por baixo)
  const anel = () => { g.beginPath(); g.arc(x, y, fora, 0, TP_TAU); g.arc(x, y, M.rt, 0, TP_TAU, true); };
  const mt = g.createRadialGradient(x, y, dentro, x, y, Math.max(dentro + .01, fora));
  for (const [t, c] of v110Metal(cor)) mt.addColorStop(t, c);
  anel(); g.fillStyle = mt; g.fill();
  const lz = g.createLinearGradient(x - M.R*.7, y - M.R*.7, x + M.R*.7, y + M.R*.7);   // a luz em cima à esquerda
  lz.addColorStop(0, 'rgba(255,255,255,.08)'); lz.addColorStop(.5, 'rgba(255,255,255,0)'); lz.addColorStop(1, 'rgba(0,0,0,.1)');
  anel(); g.fillStyle = lz; g.fill();
};
// a tampinha inteira com a BOTÃO: o aro, o desenho afundado (com a sombra por dentro) e o sulco escuro entre os dois
v102Botao = function(g, x, y, r, D, semente){
  if (typeof tpSemBorda === 'function' && tpSemBorda(D)){ tpSoDesenho(g, x, y, r, D, semente); v110SombraSem(g, x, y, r, D); return; }
  const M = v110Medidas(r, D), rd = M.rt + M.wF*.5;
  v102Aro(g, x, y, r, D);
  g.save(); g.beginPath(); g.arc(x, y, rd, 0, TP_TAU); g.clip();
  tpPintaTampo(g, x, y, rd, D, semente);
  v110Sombra(g, x, y, M.rt, 1);
  g.restore();
  g.lineWidth = M.wF; g.strokeStyle = V110.sulco; g.beginPath(); g.arc(x, y, M.rt + M.wF/2, 0, TP_TAU); g.stroke();
};
function v110SombraSem(g, x, y, r, D){                       // SEM BORDA: a mesma sombra na beira do desenho (a cara animada fica como é)
  try { const A = typeof sk76Anim === 'function' ? sk76Anim(D) : null; if (A && A.cara) return; } catch (_) {}
  const R = r*.97;
  g.save(); g.beginPath(); g.arc(x, y, R, 0, TP_TAU); g.clip(); v110Sombra(g, x, y, R, 1); g.restore();
}

/* ---------------------------------------------------------------- 2) as sombras nas outras bordas */
// as de dentes, a Medalhão e as acesas: a sombra por dentro no desenho do meio (o raio de cada tamanho de borda, o tpMiolo);
// a BOTÃO (e a de fábrica, que aparece como ela) já pinta a dela, e as caras animadas ficam como são
const tpTampaAntes110 = tpTampa;
tpTampa = function(g, x, y, r, D, semente){
  const res = tpTampaAntes110.apply(this, arguments);
  try {
    if (D && D.k === 'T' && !v102EhBotao(D) && !v105DeFabrica(D)){
      const A = typeof sk76Anim === 'function' ? sk76Anim(D) : null;
      if (!(A && A.cara)){
        const rt = tpSemBorda(D) ? r*.97 : r*tpMiolo(D);
        g.save(); g.beginPath(); g.arc(x, y, rt, 0, TP_TAU); g.clip(); v110Sombra(g, x, y, rt, tpSemBorda(D) ? 1 : .85); g.restore();
      }
    }
  } catch (e) { console.error('v110 sombra', e); }
  return res;
};
TP_SPR.clear();                                              // (as imagens prontas de antes da v110 saem: o próximo quadro refaz)
if (typeof SK76_BASE !== 'undefined' && SK76_BASE.clear) SK76_BASE.clear();

window.RachaBotao110 = {medidas:(r, D) => v110Medidas(r, D || null), metal:c => v110Metal(c), sombra:v110Sombra, cfg:V110};
