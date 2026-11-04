/* ======================================================================================================================
   RACHA v102 · A BORDA BOTÃO E O ANEL DA SUA TAMPINHA
   O pedido (03/11/2026), com a imagem de duas tampinhas listradas num campo: "crie uma borda de botão nesse estilo …
   melhore essa borda ao redor".
   1) A borda BOTÃO no CRIAR TAMPINHA (grátis): o jeito do futebol de botão — o aro liso e claro (na cor 1 da borda), o
      contorno escuro firme por fora, um filete fino entre o aro e o desenho e o brilho em cima à esquerda. O desenho (o
      padrão, as cores e o ícone) ocupa mais da tampinha que na tampinha de garrafa. Ela entra no FIM da lista das bordas
      (o 28º lugar, índice 27): o código das tampinhas guarda o lugar da borda (5 bits), então os códigos de sempre não
      mudam; o servidor das salas só olha o lugar 26 (a dos fundadores) e o catálogo da plataforma (app/contracts/
      catalogo_tampinhas.json) é gerado do jogo (tools/v88/extrai_catalogo.py). Na faixa do editor ela aparece logo depois
      da Lisa (só a ordem na tela).
      · o desenho parado (as imagens prontas, as miniaturas, o lobby e a partida): o tpTampa;
      · com uma cara animada (v76) o miolo é a cara: o aro do botão entra no lugar da saia (o tpSaia).
   2) O anel em volta da tampinha (o sensor: o seu verde; o dos outros, na cor do time): encostado na tampinha, um degradê
      (mais forte perto dela, mais leve na borda), a sombra curta da tampinha em cima dele, o brilho de vidro em cima à
      esquerda, a borda de fora clara e firme (continua sendo o alcance do chute) com a luz no chão e um fio escuro bem fino
      por fora, que lê em qualquer chão (a grama, a quadra, o concreto).
   Só desenho: a física, o alcance e a força do chute não mudam.
   ====================================================================================================================== */
const V102_BORDA = {id:'bt', nome:'Botão', pr:'gratis', n:0, forma:'lisa', pinta:'botao', cores:1};
if (!TP_MAPA.b.has(V102_BORDA.id)){ TP_BORDAS.push(V102_BORDA); TP_MAPA.b.set(V102_BORDA.id, V102_BORDA); }
const V102_BORDA_I = TP_BORDAS.indexOf(V102_BORDA);   // (27: o fim da lista)
const v102EhBotao = D => { const B = D && TP_MAPA.b.get(D.b); return !!B && B.pinta === 'botao'; };

// o aro do botão (r = o raio de fora, como o das outras bordas): o corpo liso na cor 1, o relevo, o brilho e o contorno
function v102Aro(g, x, y, r, D){
  const R = r*.97, rt = R*.83, aro = (D && D.bc && D.bc[0]) || '#f4f2ec';
  g.beginPath(); g.arc(x, y, R, 0, TP_TAU); g.fillStyle = aro; g.fill();
  const rel = g.createLinearGradient(x - R*.72, y - R*.72, x + R*.72, y + R*.72);
  rel.addColorStop(0, 'rgba(255,255,255,.5)'); rel.addColorStop(.48, 'rgba(255,255,255,0)'); rel.addColorStop(1, 'rgba(0,0,0,.26)');
  g.fillStyle = rel; g.fill();
  g.lineCap = 'round'; g.lineWidth = Math.max(1, r*.042); g.strokeStyle = 'rgba(255,255,255,.72)';
  g.beginPath(); g.arc(x, y, (R + rt)/2, Math.PI*1.06, Math.PI*1.44); g.stroke();   // (o brilho do aro, em cima à esquerda)
  g.lineCap = 'butt';
  const w = Math.max(1.2, r*.058);
  g.lineWidth = w; g.strokeStyle = 'rgba(14,8,26,.92)'; g.beginPath(); g.arc(x, y, R - w/2, 0, TP_TAU); g.stroke();
}
function v102Botao(g, x, y, r, D, semente){            // a tampinha inteira com a borda BOTÃO
  const R = r*.97, rt = R*.83;
  v102Aro(g, x, y, r, D);
  g.save(); g.beginPath(); g.arc(x, y, rt, 0, TP_TAU); g.clip();
  tpPintaTampo(g, x, y, rt, D, semente); tpLuz(g, x, y, rt);
  g.restore();
  // o filete entre o aro e o desenho e a sombra curta do aro por cima do desenho (embaixo)
  g.lineWidth = Math.max(.8, r*.026); g.strokeStyle = 'rgba(14,8,26,.45)'; g.beginPath(); g.arc(x, y, rt, 0, TP_TAU); g.stroke();
  g.lineWidth = Math.max(.6, r*.03); g.strokeStyle = 'rgba(14,8,26,.16)'; g.beginPath(); g.arc(x, y, rt - r*.03, Math.PI*.12, Math.PI*.88); g.stroke();
}
const tpSaiaAntes102 = tpSaia;
tpSaia = function(g, x, y, r, D){
  if (!v102EhBotao(D)) return tpSaiaAntes102.apply(this, arguments);
  v102Aro(g, x, y, r, D);
};
const tpTampaAntes102 = tpTampa;
tpTampa = function(g, x, y, r, D, semente){
  if (!v102EhBotao(D)) return tpTampaAntes102.apply(this, arguments);
  const A = typeof sk76Anim === 'function' ? sk76Anim(D) : null;
  if (A && A.cara) return tpTampaAntes102.apply(this, arguments);   // (a cara animada: o aro entra pelo tpSaia)
  v102Botao(g, x, y, r, D, semente);
};
// a faixa do editor: a BOTÃO logo depois da Lisa (as grátis juntas; só a ordem na tela)
const tpeFaixaAntes102 = tpeFaixa;
tpeFaixa = function(){
  const r = tpeFaixaAntes102.apply(this, arguments);
  try {
    const f = ED.el && ED.el.faixa, bt = f && f.querySelector('.tpe-item[data-id="' + V102_BORDA.id + '"]'), ls = f && f.querySelector('.tpe-item[data-id="ls"]');
    if (bt && ls && ls.nextSibling !== bt) ls.insertAdjacentElement('afterend', bt);
  } catch (_) {}
  return r;
};

// a cor da BOTÃO no editor é a do ARO (as outras bordas de uma cor chamam de METAL)
const tpeSlotsAntes102 = tpeSlots;
tpeSlots = function(){
  const r = tpeSlotsAntes102.apply(this, arguments);
  try { if (ED.aba === 'b' && ED.modo !== 'E' && v102EhBotao(ED.D) && r[0]) r[0] = [r[0][0], r[0][1], 'ARO']; } catch (_) {}
  return r;
};
// (o editor só refaz as cores quando muda a quantidade: de uma borda de METAL para a BOTÃO, o nome tem que trocar aqui)
const tpeSincronizaAntes102 = tpeSincroniza;
tpeSincroniza = function(){
  const r = tpeSincronizaAntes102.apply(this, arguments);
  try {
    const E = ED.el;
    if (E && E.slotsEl && ED.aba !== 'pre' && ED.aba !== 'inv') tpeSlots().forEach(([, , rot], n) => {
      const s = E.slotsEl.children[n], t = s && s.querySelector('.tpe-slot-rot'); if (!t || t.textContent === rot) return;
      t.textContent = rot; const m = rot.toLowerCase();
      const sw = s.querySelector('.tpe-cor'), hx = s.querySelector('.tpe-hex'), gt = s.querySelector('.tpe-gota');
      if (sw) sw.setAttribute('aria-label', 'Escolher ' + m); if (hx) hx.setAttribute('aria-label', rot + ' em hexadecimal'); if (gt) gt.setAttribute('aria-label', 'Conta-gotas: pegar ' + m + ' da tampinha');
    });
  } catch (_) {}
  return r;
};
// o CRIAR TAMPINHA abre pelo abreTela de antes da v91: os 3 quadrados do cabeçalho (o chat, os amigos e os ajustes) ficavam
// vazios (o v91.css esconde os ícones antigos e os novos só entravam pelo abreTela da v91). Agora entram ao abrir — e em todas
// as telas montadas no fim (o montaAbas, depois de todas as etapas)
const tpeAbreAntes102 = tpeAbre;
tpeAbre = function(){
  const r = tpeAbreAntes102.apply(this, arguments);
  try { if (typeof V91 !== 'undefined' && V91.on && lobby.tela) v91Cab(lobby.tela); } catch (_) {}
  return r;
};
const montaAbasAntes102 = montaAbas;
montaAbas = function(){
  const r = montaAbasAntes102.apply(this, arguments);
  try { if (typeof V91 !== 'undefined' && V91.on) v91TodasCabs(); } catch (_) {}
  return r;
};

/* ---------------------------------------------------------------- o anel em volta da tampinha (o sensor) */
function v102SpriteAnel(cor, rpx){
  const re = rpx*AROV.ate, ri = rpx, m = Math.ceil(re + rpx*.32 + 4);
  const c = document.createElement('canvas'); c.width = c.height = 2*m;
  const g = c.getContext('2d');
  const anel = (a, b) => { g.beginPath(); g.arc(m, m, b, 0, TAU); g.arc(m, m, a, 0, TAU, true); };
  // a luz no chão, por fora do alcance (na cor do anel)
  g.save(); g.shadowColor = corRgba(cor, .9); g.shadowBlur = rpx*.32; anel(re - rpx*.05, re); g.fillStyle = corRgba(cor, .75); g.fill(); g.restore();
  // o anel: mais forte encostado na tampinha, mais leve na borda
  const gr = g.createRadialGradient(m, m, ri, m, m, re);
  gr.addColorStop(0, corRgba(corMix(cor, '#ffffff', .18), .78)); gr.addColorStop(.4, corRgba(cor, .5)); gr.addColorStop(1, corRgba(cor, .3));
  anel(ri, re); g.fillStyle = gr; g.fill();
  // a sombra curta da tampinha em cima do anel (a tampinha pisa no anel)
  const sh = g.createRadialGradient(m, m + rpx*.04, ri*.98, m, m + rpx*.04, ri + rpx*.11);
  sh.addColorStop(0, 'rgba(4,6,14,.42)'); sh.addColorStop(1, 'rgba(4,6,14,0)');
  anel(ri, ri + rpx*.12); g.fillStyle = sh; g.fill();
  // o brilho de vidro em cima à esquerda
  g.lineCap = 'round'; g.lineWidth = Math.max(1, rpx*.045); g.strokeStyle = 'rgba(255,255,255,.42)';
  g.beginPath(); g.arc(m, m, (ri + re)/2 + rpx*.01, Math.PI*1.08, Math.PI*1.42); g.stroke(); g.lineCap = 'butt';
  // a borda de fora = o alcance do chute: clara e firme, e o fio escuro por fora (lê na grama, na quadra e no concreto)
  const w = Math.max(1.4, rpx*.068);
  g.lineWidth = w; g.strokeStyle = corRgba(corMix(cor, '#ffffff', .62), .95); g.beginPath(); g.arc(m, m, re - w/2, 0, TAU); g.stroke();   // (.95: o anel continua translúcido, como o da v95)
  const f = Math.max(.9, rpx*.024);
  g.lineWidth = f; g.strokeStyle = 'rgba(6,10,20,.42)'; g.beginPath(); g.arc(m, m, re + f/2, 0, TAU); g.stroke();
  return c;
}
v95SpriteAnel = v102SpriteAnel;
try { SPR_ARO.clear(); } catch (_) {}
