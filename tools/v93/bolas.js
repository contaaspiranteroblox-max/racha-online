/* ==================================================================================================================
   RACHA v93 · Fase 6 — AS BOLAS LISAS (brilhantes, com o 3D estilizado) E A CLÁSSICA LISA (2D, como a do Haxball)
   · 10 bolas lisas e brilhantes (Roxo, Rosa, Verde-claro, Verde-escuro, Preto, Branco, Azul, Cinza, Marrom e Amarelo): a cor
     chapada com o degradê da luz, o reflexo definido em cima (a janela de luz e um ponto), a luz que volta do chão embaixo e o
     contorno escuro — mais um aro claro por dentro nas escuras (Preto e Verde-escuro), para a bola não sumir no chão escuro
     nem na grama. Sem gomos: a bola é lisa (o reflexo fica parado, como a luz de verdade).
   · A CLÁSSICA LISA: branca, lisa, com o contorno preto — 2D, sem degradê, sem sombra, sem textura (arte nossa).
   Os itens estão no catálogo de sempre (app/contracts/catalogo88.json: o mesmo arquivo da loja do jogo e da plataforma, que
   confere cada compra e cada equipar): aparecem na LOJA (BOLAS), no inventário e no EQUIPAR. Só o desenho: o tamanho da bola
   na física, a colisão, a velocidade e a força não mudam (o desenho usa o mesmo raio de sempre; na Clássica Lisa o contorno
   fica para dentro, para a bola não parecer maior). A bola equipada continua sendo vista só por quem a equipou.
   ================================================================================================================== */
function v93BolaLisa(g, x, y, r, V, sombra){
  const base = V.base || '#8f4dff', claro = corMix(base, '#ffffff', V.claro != null ? V.claro : .5), escuro = corMix(base, '#000000', V.escuro != null ? V.escuro : .5);
  if (sombra){ g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x + r*.18, y + r*.32, r*1.02, r*.92, 0, 0, TAU); g.fill(); }
  const gr = g.createRadialGradient(x - r*.34, y - r*.4, r*.06, x + r*.08, y + r*.1, r*1.1);   // o corpo: a luz de cima à esquerda
  gr.addColorStop(0, claro); gr.addColorStop(.42, base); gr.addColorStop(1, escuro);
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = gr; g.fill();
  g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
  const vb = g.createRadialGradient(x + r*.34, y + r*.62, r*.04, x + r*.34, y + r*.62, r*.78);   // a luz que volta do chão (embaixo)
  vb.addColorStop(0, 'rgba(255,255,255,' + (V.volta != null ? V.volta : .2) + ')'); vb.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = vb; g.fillRect(x - r, y - r, 2*r, 2*r);
  const hb = g.createRadialGradient(x - r*.36, y - r*.42, 0, x - r*.36, y - r*.42, r*.66);       // o brilho largo e suave
  hb.addColorStop(0, 'rgba(255,255,255,' + (V.brilho != null ? V.brilho : .5) + ')'); hb.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hb; g.fillRect(x - r, y - r, 2*r, 2*r);
  g.restore();
  g.save(); g.translate(x - r*.34, y - r*.46); g.rotate(-.62);                                   // o reflexo definido (a janela de luz)
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(0, 0, r*.27, r*.135, 0, 0, TAU); g.fill();
  g.restore();
  g.fillStyle = 'rgba(255,255,255,.78)'; g.beginPath(); g.arc(x + r*.1, y - r*.64, Math.max(.6, r*.055), 0, TAU); g.fill();   // (e um ponto de luz menor)
  if (V.aro){ g.lineWidth = Math.max(1, r*.07); g.strokeStyle = V.aro; g.beginPath(); g.arc(x, y, r*.9, 0, TAU); g.stroke(); }
  g.lineWidth = Math.max(1.5, r*.1); g.strokeStyle = V.linha || 'rgba(12,10,22,.88)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
}
function v93BolaPlana(g, x, y, r, V){                         // a Clássica Lisa: o círculo branco e o contorno preto, chapados
  const lw = Math.max(1.5, r*.2);
  g.beginPath(); g.arc(x, y, r - lw/2, 0, TAU); g.fillStyle = V.base || '#ffffff'; g.fill();
  g.lineWidth = lw; g.strokeStyle = V.linha || '#000000'; g.stroke();
}
const v88DesenhaBolaJogoAntes93 = v88DesenhaBolaJogo;
v88DesenhaBolaJogo = function(g, x, y, r, it){
  const V = (it && it.visual) || {};
  if (V.padrao === 'lisa') return v93BolaLisa(g, x, y, r, V, true);
  if (V.padrao === 'plana') return v93BolaPlana(g, x, y, r, V);
  return v88DesenhaBolaJogoAntes93.apply(this, arguments);
};
const v88BolaParadaAntes93 = v88BolaParada;
v88BolaParada = function(g, x, y, r, it){
  const V = (it && it.visual) || {};
  if (V.padrao === 'lisa') return v93BolaLisa(g, x, y, r, V, false);
  if (V.padrao === 'plana') return v93BolaPlana(g, x, y, r, V);
  return v88BolaParadaAntes93.apply(this, arguments);
};
window.RachaBolas93 = {lisas:() => CAT88.itens.filter(i => i.tipo === 'bola' && i.visual && (i.visual.padrao === 'lisa' || i.visual.padrao === 'plana')).map(i => i.id)};
