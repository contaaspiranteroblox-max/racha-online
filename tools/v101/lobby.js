/* ======================================================================================================================
   RACHA v101 · O LOBBY NO ESTILO DA IMAGEM DA NOITE (o pedido: "reformule o jogo neste estilo", com a imagem da tela inicial
   no pôr do sol). A mesma arrumação da v91/v95 (os mesmos botões, abrindo as mesmas telas), com a cara da imagem nova:
   · o FUNDO novo (V101_FUNDO, desenhado em código em tools/v101/arte) cobre a TELA TODA — sem a faixa de cima: os cartões de
     cima flutuam por cima da cena; a tampinha fica onde o desenho deixou o lugar dela (o círculo do meio da quadra);
   · em cima: o PERFIL (a tampinha, o nível no hexágono, o nome com a bandeira, o ID e o XP), a PATENTE (a insígnia, o nome, a
     barra e os pontos com o troféu), as MOEDAS e as GEMAS com o + verde, o chat, o correio, os ajustes e o SINAL (as barras e
     o ping do servidor das salas — tocar abre a conexão);
   · os lados: LOJA, COFRE, CLUBE e TREINO; SALAS, AMIGOS, RANKING e EVENTOS — botões baixos com o ícone e o nome; embaixo da
     coluna da esquerda, o cartão dourado da OFICINA (a coroa, o martelo e a chave e a planta do campo);
   · no meio, a TAMPINHA (menor) em pé no chão molhado: a luz roxa atrás, o anel aceso no chão e o reflexo; ao lado, as TRÊS
     VAGAS do grupo (+): tocar cria o grupo e abre o painel para chamar os amigos (sem conta, o aviso de sempre); com o grupo,
     as vagas mostram quem está nele (a tampinha, o nome e o PRONTO);
   · embaixo: o PASSE RACHA, as MISSÕES (o ponto vermelho quando tem prêmio para pegar), o CAMPO (o desenho, o tamanho do time e
     o nome do campo, com as setas de trocar), o MODO (a bola, RANQUEADA e a setinha) e o JOGAR (com a coroa).
   Só aparência e arrumação: partida, física, rede, conta, moedas e gemas não mudam; cada botão abre o que já abria.
   ====================================================================================================================== */
const V101 = {on:false, F:typeof V101_FUNDO !== 'undefined' ? V101_FUNDO : null, vagas:null, vagasK:'', modo2:null, sinal:null, sinalT:0, k:{}, timer:0};
const V101_TROFEU = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v2h3.2v2.4c0 2.7-1.9 4.6-4.5 4.9A5.2 5.2 0 0 1 13 15v2.4h3.2V21H7.8v-3.6H11V15a5.2 5.2 0 0 1-2.7-2.7C5.7 12 3.8 10.1 3.8 7.4V5H7zm-1.2 4v.4c0 1.4.8 2.4 2.1 2.8A7.6 7.6 0 0 1 7 7zm11.2 0a7.6 7.6 0 0 1-.9 3.2c1.3-.4 2.1-1.4 2.1-2.8V7z" fill="#ffc83a" stroke="#4a2a00" stroke-width=".9" stroke-linejoin="round"/><path d="M9 4.6h2.4v5.6c-1.3-.5-2.4-2.4-2.4-5.6z" fill="#fff2b0" opacity=".75"/></svg>';
const V101_WIFI = '<svg viewBox="0 0 32 26" aria-hidden="true"><path class="w4" d="M2.4 9.2a19.6 19.6 0 0 1 27.2 0"/><path class="w3" d="M6.6 13.4a13.6 13.6 0 0 1 18.8 0"/><path class="w2" d="M10.8 17.6a7.6 7.6 0 0 1 10.4 0"/><circle class="w1" cx="16" cy="22" r="2.6"/></svg>';
const V101_MAIS = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 9v22M9 20h22" stroke="#fff6dc" stroke-width="5.4" stroke-linecap="round"/></svg>';

function v101Tem(nome){ return !!document.getElementById('v91i-' + nome); }        // (o ícone existe no sprite?)
function v101Ic(nome, reserva){ return v101Tem(nome) ? v91Ic(nome) : (reserva || ''); }

/* ---------------------------------------------------------------- 1) montar (uma vez, depois da v91) */
function v101Monta(){
  if (V101.on || !V91.on || !LB.raiz || !LB.palco) return;
  V101.on = true;
  LB.raiz.classList.add('v101');
  document.documentElement.classList.add('v101');
  // o fundo novo (sem a faixa de cima: a cena vai até o alto da tela)
  if (V101.F && V101.F.info){
    V91.F = {src:V101.F.src, telas:V101.F.telas || (V91.F && V91.F.telas) || null, info:V101.F.info};
    if (V91.img){ V91.img.src = V101.F.src; V91.img.width = V101.F.info.w; V91.img.height = V101.F.info.h; }
    if (V101.F.telas){
      const u = 'url("' + V101.F.telas + '")';
      document.documentElement.style.setProperty('--v91-fundo-telas', u); LB.raiz.style.setProperty('--v91-fundo-telas', u);
    }
    V91.E = null;
  }
  V91.FAIXA = 0;
  try { if (V91.palcos) V91.palcos = {}; if (V91.moldes) for (const k in V91.moldes) V91.moldes[k].key = ''; } catch (_) {}
  v101Pecas();
  try { lbLayout(); } catch (_) {}
}

// as peças novas (idempotente: as telas da v88/v90/oficina aparecem em momentos diferentes)
function v101Pecas(){
  const topo = LB.palco.querySelector('.lb-topo');
  // o PERFIL: a bandeira do lado do nome, o ID embaixo e a setinha
  const eu = LB.eu;
  if (eu && !eu.querySelector('.v101-id')){
    const nome = eu.querySelector('#lb-eu-nome'), tx = eu.querySelector('.tp-eu-tx');
    const linha = nodo('span', 'v101-nome');
    if (nome && tx){ nome.replaceWith(linha); linha.appendChild(nome); const band = nodo('i', 'v101-band'); band.setAttribute('aria-hidden', 'true'); linha.appendChild(band); }
    const id = nodo('small', 'v101-id');
    if (linha.parentNode) linha.insertAdjacentElement('afterend', id); else if (tx) tx.insertBefore(id, tx.firstChild);
    eu.appendChild(v91IcEl('desce', 'v101-seta'));
  }
  // a PATENTE: os pontos com o troféu
  if (V91.pat && !V91.pat.querySelector('.v101-pts')){
    const p = nodo('span', 'v101-pts'); p.innerHTML = V101_TROFEU + '<b>0</b>';
    V91.pat.appendChild(p);
  }
  // o SINAL: depois dos ajustes (as barras e o ping do servidor das salas; tocar abre a conexão da v88)
  const dir = topo && topo.querySelector('.tp-dir');
  if (dir && !V101.sinal){
    const s = novoBotao('v101-sinal', 'Conexão');
    s.innerHTML = V101_WIFI + '<small>—</small>';
    s.addEventListener('click', e => { e.stopPropagation(); som.clique(); if (typeof v88SinalPop === 'function') v88SinalPop(); });
    dir.appendChild(s); V101.sinal = s;
  }
  // a OFICINA: a coroa, o martelo e a chave e a planta do campo
  const ofi = document.getElementById('ofi-lobby');
  if (ofi && !ofi.querySelector('.v101-ofi-coroa')){
    ofi.classList.add('v101-ofi');
    ofi.appendChild(v91IcEl('coroa', 'v101-ofi-coroa'));
    const ic = ofi.querySelector('.ofi-lobby-ic');
    if (ic && v101Tem('oficina')){ ic.textContent = ''; ic.appendChild(v91IcEl('oficina', 'v101-ofi-ic')); }
    if (typeof V101_OFICINA === 'string' && V101_OFICINA){
      const im = new Image(); im.alt = ''; im.decoding = 'async'; im.draggable = false; im.className = 'v101-ofi-arte'; im.src = V101_OFICINA;
      im.setAttribute('aria-hidden', 'true'); ofi.appendChild(im);
    }
  }
  // o CAMPO (o #lb-modo de sempre): as setas de trocar e o nome do campo
  if (LB.modo && !LB.modo.querySelector('.v101-campo')){
    LB.modo.classList.add('v101-mapa');
    const tx = LB.modo.querySelector('.v71-modo-tx');
    if (tx) tx.appendChild(nodo('small', 'v101-campo', 'ESTÁDIO'));
    LB.modo.appendChild(v101Tem('troca') ? v91IcEl('troca', 'v101-troca') : nodo('i', 'v101-troca', '⇄'));
  }
  // o MODO: a bola, RANQUEADA e a setinha (abre a mesma folha do JOGAR que o campo abre)
  if (LB.modo && !V101.modo2){
    const m = novoBotao('v101-modo', 'Modo de jogo: ranqueada. Trocar o tamanho do time');
    m.innerHTML = '<i class="v101-modo-ic">' + v101Ic('bola', (typeof SLI !== 'undefined' && SLI.bola) || '') + '</i><span class="v101-modo-tx"><b>MODO</b><small>RANQUEADA</small></span>';
    m.appendChild(v91IcEl('desce', 'v101-modo-seta'));
    m.addEventListener('click', e => { e.stopPropagation(); try { LB.modo.click(); } catch (_) {} });
    LB.modo.insertAdjacentElement('afterend', m); V101.modo2 = m;
  }
  // o JOGAR: a coroa no canto
  if (LB.jogar && !LB.jogar.querySelector('.v101-jogar-coroa')) LB.jogar.appendChild(v91IcEl('coroa', 'v101-jogar-coroa'));
  // as vagas do grupo
  v101VagasMonta();
}

/* ---------------------------------------------------------------- 2) o encaixe: o fundo cobrindo a tela toda */
if (typeof v91Encaixe === 'function'){
  const v91EncaixeAntes101 = v91Encaixe;
  v91Encaixe = function(){
    if (!V101.on || !V91.F || !V91.F.info) return v91EncaixeAntes101.apply(this, arguments);
    const I = V91.F.info, s = PALCO.s || 1, sa = PALCO.sa || {t:0, r:0, b:0, l:0}, vw = PALCO.vw || innerWidth, vh = PALCO.vh || innerHeight;
    const k = Math.max(vh/I.h, vw/I.w);                     // cobre a tela inteira (a altura toda; nas telas muito largas, a largura)
    const cxTela = sa.l + (PALCO.w/2)*s;                    // a tampinha no meio do palco
    let x = cxTela - I.tampa.x*k;
    x = Math.min(0, Math.max(vw - I.w*k, x));
    const y = Math.min(0, Math.max(vh - I.h*k, (vh - I.h*k)*.55));
    return {x, y, k, cx:(x + I.tampa.x*k - sa.l)/s, cy:(y + I.tampa.y*k - sa.t)/s, R:I.tampa.r*k/s};
  };
}

/* ---------------------------------------------------------------- 3) as medidas (no palco: a altura de sempre é 888) */
const V101M = {m:22, gap:12, colTop:148, colTopCel:110, tileW:204, tileWd:194, tileH:84, tileGap:10, ofiW:356, ofiH:104, baixo:116, baixoB:42, jogarH:140, jogarB:36};
function v101Medidas(P, palco){
  const W = P.w, H = P.h, M = V101M, st = palco.style;
  // a fileira de baixo: as larguras de base e a sobra repartida (sem buraco no meio nas telas largas)
  const ordem = ['passe', 'mis', 'mapa', 'modo', 'jogar'];
  const base = {passe:430, mis:118, mapa:330, modo:262, jogar:372}, teto = {passe:600, mis:150, mapa:450, modo:360, jogar:460}, peso = {passe:.36, mis:.06, mapa:.24, modo:.14, jogar:.2};
  const livre = W - 2*M.m - 4*M.gap;
  const w = Object.assign({}, base);
  let soma = 0; for (const n of ordem) soma += w[n];
  let extra = livre - soma;
  if (extra < 0){ const f = livre/soma; for (const n of ordem) w[n] = Math.floor(w[n]*f); extra = livre - ordem.reduce((a, n) => a + w[n], 0); }   // (a sobra do arredondamento também é repartida: o JOGAR a 22 da borda)
  for (let volta = 0; volta < 4 && extra > 1; volta++){
    const abertos = ordem.filter(n => w[n] < teto[n]); if (!abertos.length) break;
    const pz = abertos.reduce((a, n) => a + peso[n], 0);
    let usado = 0;
    for (const n of abertos){ const d = Math.min(teto[n] - w[n], Math.floor(extra*peso[n]/pz)); w[n] += d; usado += d; }
    extra -= usado; if (!usado) break;
  }
  const gap = M.gap + Math.max(0, extra)/4;
  let x = M.m;
  for (const n of ordem){
    const x0 = n === 'jogar' ? W - M.m - Math.round(w[n]) : Math.round(x);   // (o JOGAR medido da direita: sempre a 22 da borda)
    st.setProperty('--v101-x-' + n, x0 + 'px'); st.setProperty('--v101-w-' + n, Math.round(w[n]) + 'px'); x += w[n] + gap;
  }
  // as colunas dos lados (mais para baixo nas telas mais altas que 16:9) e a OFICINA embaixo da esquerda. No celular deitado o
  // palco encolhe (667 × 375: 0,42) e o botão de 84 ficaria com 35 px de verdade: ali o botão cresce até 44,5 px de verdade (o
  // dedo), a coluna sobe para logo embaixo da barra de cima e a OFICINA cabe no que sobra até a fileira de baixo — no celular
  // menor (568 × 320: 0,36), se não couber, os botões dos lados param de crescer antes de a OFICINA chegar na fileira de baixo
  const s = PALCO.s || 1;
  let tileH = Math.max(M.tileH, Math.ceil(44.5/s));
  const cel = tileH > M.tileH, ofiMin = Math.max(76, Math.ceil(31/s));   // (a OFICINA com 31 px de verdade, no mínimo)
  let tgap = cel ? 8 : M.tileGap, ofiGap = cel ? 10 : 14;
  let top = Math.round(M.colTop + Math.max(0, (H - 888)*.32));
  if (cel) top = Math.min(top, M.colTopCel);
  const limite = H - M.baixoB - M.baixo - 10;
  const cabeTile = () => Math.floor((limite - ofiMin - ofiGap - top - 3*tgap)/4);
  if (cel && cabeTile() < tileH){ tgap = 6; ofiGap = 8; }                 // (apertado: os espaços entre os botões encolhem antes)
  tileH = Math.max(M.tileH, Math.min(tileH, cabeTile()));
  const ofiTop = top + 4*tileH + 3*tgap + ofiGap;
  const ofiH = Math.max(ofiMin, Math.min(M.ofiH, limite - ofiTop));
  st.setProperty('--v101-col-top', top + 'px');
  palco.classList.toggle('v101-cel', cel);   // (no celular: a coroa da OFICINA mais baixa, sem encostar no TREINO)
  st.setProperty('--v101-tile-h', tileH + 'px'); st.setProperty('--v101-tile-gap', tgap + 'px');
  st.setProperty('--v101-ofi-top', Math.round(ofiTop) + 'px'); st.setProperty('--v101-ofi-h', Math.round(ofiH) + 'px');
  // os quadrados de cima (o chat, o correio, os ajustes) e as moedas/gemas: 62 no palco; nunca menos de 44 px de verdade (o
  // tablet 4:3 encolhe o palco para 0,68) e, no celular deitado (onde tudo cabe na tela, como na v69), 30 px
  const cabe = s < ((typeof UIX !== 'undefined' && UIX.cabe) || .56);
  // (e sem passar da largura: o perfil, a patente, as moedas e as gemas já ocupam 1186 do palco; os 3 quadrados e o sinal, o resto)
  st.setProperty('--v101-q', Math.min(84, Math.floor((W - 1186)/4), Math.max(62, Math.ceil((cabe ? 30 : 44.5)/s))) + 'px');
  // a tampinha e as vagas do grupo (o centro e o raio dela, no palco)
  const R = EMB.R || 140;
  st.setProperty('--v101-cx', Math.round(P.cx) + 'px'); st.setProperty('--v101-cy', Math.round(P.cy) + 'px'); st.setProperty('--v101-r', Math.round(R) + 'px');
  st.setProperty('--v101-vr', Math.round(Math.max(R*.33, 23/s)) + 'px');   // (o raio da vaga: no celular, 46 px de verdade — o dedo)
}
if (window.RUA_LOBBY && typeof RUA_LOBBY.layout === 'function'){
  const layoutAntes101 = RUA_LOBBY.layout;
  RUA_LOBBY.layout = function(P, palco){
    const r = layoutAntes101.apply(this, arguments);
    try { if (V101.on && v91Deitado()) v101Medidas(P, palco); } catch (e) { console.error('v101 layout', e); }
    return r;
  };
}

/* ---------------------------------------------------------------- 4) a tampinha em pé no chão molhado: a luz roxa, o anel aceso e o reflexo */
if (typeof v91Palco3D === 'function'){
  const v91Palco3DAntes101 = v91Palco3D;
  v91Palco3D = function(slot, R, k0){
    if (!V101.on) return v91Palco3DAntes101.apply(this, arguments);
    const MS = V91.palcos || (V91.palcos = {}), key = Math.round(R*k0) + '|' + k0.toFixed(3) + '|v101';
    let P = MS[slot];
    if (P && P.key === key) return P;
    const k = k0*.6, L = R*4.2, H2 = R*3.9, cx = L/2, y0 = R*1.8;
    // o anel acende o CÍRCULO DO MEIO desenhado no fundo (as proporções vêm do fundo.json: o círculo em volta do pé da tampinha)
    const I = V91.F && V91.F.info, T = I && I.tampa, C = I && I.circulo;
    const A = T && C ? {dx:(C.cx - T.x)/T.r, dy:(C.cy - T.y)/T.r, rx:C.rx/T.r, ry:C.ry/T.r} : {dx:0, dy:1, rx:1.38, ry:.33};
    const ax = cx + A.dx*R, ay = y0 + A.dy*R, ach = A.ry/A.rx;
    const c = P && P.c || document.createElement('canvas');
    c.width = Math.ceil(L*k); c.height = Math.ceil(H2*k);
    const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, L, H2);
    // a luz roxa atrás
    let gr = g.createRadialGradient(cx, y0, R*.45, cx, y0, R*1.8);
    gr.addColorStop(0, 'rgba(176,96,255,.5)'); gr.addColorStop(.5, 'rgba(150,70,255,.22)'); gr.addColorStop(1, 'rgba(120,50,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, y0, R*1.8, 0, TAU); g.fill();
    // a luz no chão (achatada como o círculo) e o anel aceso em cima da linha do círculo
    g.save(); g.translate(ax, ay); g.scale(1, ach);
    gr = g.createRadialGradient(0, 0, R*.2, 0, 0, A.rx*R*1.12);
    gr.addColorStop(0, 'rgba(196,128,255,.62)'); gr.addColorStop(.6, 'rgba(146,72,255,.28)'); gr.addColorStop(1, 'rgba(120,50,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, A.rx*R*1.12, 0, TAU); g.fill();
    g.lineWidth = R*.05/Math.max(.2, ach*1.6); g.strokeStyle = 'rgba(238,214,255,.88)';
    g.shadowColor = 'rgba(178,102,255,1)'; g.shadowBlur = R*.16*k;
    g.beginPath(); g.arc(0, 0, A.rx*R, 0, TAU); g.stroke();
    g.shadowBlur = 0;
    g.restore();
    // as faíscas em volta do anel (sempre as mesmas)
    let sd = 7;
    const rnd = () => (sd = (sd*16807) % 2147483647)/2147483647;
    for (let i = 0; i < 18; i++){
      const a = rnd()*TAU, rr = A.rx*R*(.82 + rnd()*.32), px = ax + Math.cos(a)*rr, py = ay + Math.sin(a)*rr*ach - rnd()*R*.2, sz = R*(.012 + rnd()*.02);
      gr = g.createRadialGradient(px, py, 0, px, py, sz*4);
      gr.addColorStop(0, 'rgba(255,236,255,.95)'); gr.addColorStop(.35, 'rgba(206,140,255,.55)'); gr.addColorStop(1, 'rgba(160,80,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(px, py, sz*4, 0, TAU); g.fill();
    }
    // o brilho que pulsa com a música (por cima, com a transparência do pulso)
    const b = P && P.b || document.createElement('canvas');
    b.width = c.width; b.height = c.height;
    const gb = b.getContext('2d'); gb.setTransform(k, 0, 0, k, 0, 0); gb.clearRect(0, 0, L, H2);
    gr = gb.createRadialGradient(cx, y0, R*.4, cx, y0, R*1.55); gr.addColorStop(0, 'rgba(200,140,255,.5)'); gr.addColorStop(1, 'rgba(200,140,255,0)');
    gb.fillStyle = gr; gb.beginPath(); gb.arc(cx, y0, R*1.55, 0, TAU); gb.fill();
    P = MS[slot] = {key, c, b, L, H2, cx, y0};
    return P;
  };
}
// a tampinha (a mesma da v91, com o reflexo de volta: o chão da quadra nova é molhado)
function v101Tampa3D(g, slot, x, y0, R, k, t, o){
  o = o || {};
  const calmo = v91Calmo(), sk = skinAtual(), z = o.z || 1, bat = o.bat || 0;
  const bob = calmo || o.parada ? 0 : Math.sin(t*1.6)*R*.014, y = y0 - Math.abs(bob)*.6 + bob*.4;
  const chao = y0 + R*1.0;
  const P = v91Palco3D(slot, R, k), ox = x - P.cx, oy = y0 - P.y0;
  g.drawImage(P.c, ox, oy, P.L, P.H2);
  if (bat > .02){ g.globalAlpha = Math.min(1, bat); g.drawImage(P.b, ox, oy, P.L, P.H2); g.globalAlpha = 1; }
  const M = v91Molde(slot, sk, R, k, t), esc = 1/k, L = M.lado*esc;
  if (M.refl){ g.globalAlpha = .72; g.drawImage(M.refl, x - L/2, chao + R*.05, L, M.refl.height*esc); g.globalAlpha = 1; }
  g.save(); g.translate(x + R*.04, chao); g.scale(1 - bob*.004, .16);
  let gr = g.createRadialGradient(0, 0, 4, 0, 0, R*1.05); gr.addColorStop(0, 'rgba(8,4,18,.78)'); gr.addColorStop(.7, 'rgba(8,4,18,.34)'); gr.addColorStop(1, 'rgba(8,4,18,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R*1.05, 0, TAU); g.fill(); g.restore();
  g.save(); g.translate(x, y); g.scale(z, z);
  if (M.l3) g.drawImage(M.l3, -L/2, -L/2, M.l3.width*esc, M.l3.height*esc);
  botaoPronto(g, 0, 0, R, sk, perfil.avatar, {t, bx:null, by:null, id:0, humor:''}, k*z);
  g.save(); g.beginPath(); g.arc(0, 0, R*.97, 0, TAU); g.clip();
  gr = g.createRadialGradient(-R*.42, -R*.5, R*.05, -R*.3, -R*.35, R*1.05);
  gr.addColorStop(0, 'rgba(255,255,255,.24)'); gr.addColorStop(.45, 'rgba(255,255,255,.07)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(-R, -R, 2*R, 2*R); g.restore();
  // a luz roxa batendo na beirada de baixo (o neon do chão)
  g.save(); g.beginPath(); g.arc(0, 0, R*.99, 0, TAU); g.clip();
  gr = g.createLinearGradient(0, R*.35, 0, R);
  gr.addColorStop(0, 'rgba(170,100,255,0)'); gr.addColorStop(1, 'rgba(170,100,255,.28)');
  g.fillStyle = gr; g.fillRect(-R, R*.35, 2*R, R*.65); g.restore();
  g.restore();
}
if (typeof v91Tampa3D === 'function'){
  const v91Tampa3DAntes101 = v91Tampa3D;
  v91Tampa3D = function(g, slot, x, y0, R, k, t, o){
    if (!V101.on) return v91Tampa3DAntes101.apply(this, arguments);
    return v101Tampa3D(g, slot, x, y0, R, k, t, o);
  };
}

/* ---------------------------------------------------------------- 5) as vagas do grupo (as três do lado da tampinha) */
function v101VagasMonta(){
  if (V101.vagas || !LB.palco) return V101.vagas;
  const c = nodo('div', 'v101-vagas');
  for (let i = 0; i < 3; i++){
    const b = novoBotao('v101-vaga', 'Chamar um amigo para o grupo');
    b.dataset.i = String(i);
    b.addEventListener('click', e => { e.stopPropagation(); som.clique(); v101VagaToque(i); });
    c.appendChild(b);
  }
  const emb = LB.emblema;
  if (emb && emb.parentNode === LB.palco) emb.insertAdjacentElement('afterend', c); else LB.palco.appendChild(c);
  V101.vagas = c; V101.vagasK = '';
  v101VagasPinta();
  return c;
}
function v101VagaToque(){
  const pode = typeof v93GrupoPode === 'function' && v93GrupoPode();
  if (!pode) return v88Aviso('Entre na sua conta para jogar em grupo com os amigos.');
  if (!V93G.g) return v93GrupoBotao();                     // (cria o grupo e abre o painel para chamar os amigos)
  V93G.painel = true; v93GrupoPinta();
}
function v101VagasPinta(){
  const c = V101.vagas; if (!c) return;
  const g = typeof V93G !== 'undefined' ? V93G.g : null, eu = typeof NET49 !== 'undefined' ? NET49.id : null;
  const outros = g ? g.membros.filter(m => m.id !== eu).slice(0, 3) : [];
  const chave = JSON.stringify(outros.map(m => [m.id, m.nome, m.skin, m.st, !!m.lider, !!m.pronto]));
  if (chave === V101.vagasK) return;
  V101.vagasK = chave;
  const ST = typeof V93G_ST !== 'undefined' ? V93G_ST : {};
  [...c.children].forEach((b, i) => {
    const m = outros[i];
    b.textContent = ''; b.className = 'v101-vaga' + (m ? ' cheia' : '');
    if (!m){ b.innerHTML = '<span class="v101-vaga-mais">' + V101_MAIS + '</span>'; b.setAttribute('aria-label', 'Chamar um amigo para o grupo'); return; }
    const pronto = typeof v95ProntoDe === 'function' ? v95ProntoDe(m) : !!m.pronto, st = pronto ? (ST.pronto || ['PRONTO ✓', 'pronto']) : (ST[m.st] || ST.offline || ['OFFLINE', 'off']);
    const cv = document.createElement('canvas'); cv.width = cv.height = 120; cv.className = 'v101-vaga-cap';
    try { miniCanvas(cv, skinPorId(m.skin || ''), null); } catch (_) {}
    b.appendChild(cv);
    if (m.lider){ const k = nodo('i', 'v101-vaga-coroa'); k.innerHTML = typeof V93G_COROA === 'string' ? V93G_COROA : ''; b.appendChild(k); }
    b.append(nodo('span', 'v101-vaga-nome', m.nome), nodo('span', 'v101-vaga-st st-' + st[1], st[0]));
    b.setAttribute('aria-label', m.nome + (m.lider ? ' (líder)' : '') + ': ' + st[0].toLowerCase() + '. Abrir o grupo');
  });
}
if (typeof v93GrupoPinta === 'function'){
  const v93GrupoPintaAntes101 = v93GrupoPinta;
  v93GrupoPinta = function(){ const r = v93GrupoPintaAntes101.apply(this, arguments); try { v101VagasPinta(); } catch (e) { console.error('v101 vagas', e); } return r; };
}

/* ---------------------------------------------------------------- 6) a cada arrumação: o ID, os pontos, o campo, o sinal e o JOGAR */
function v101Arruma(){
  if (!V101.on) return;
  v101Pecas();
  const K = V101.k;
  // o ID da conta e a bandeira (a do aparelho, como no cartão da sala)
  const id = LB.eu && LB.eu.querySelector('.v101-id');
  if (id){
    let t = 'SEM CONTA';
    try { if (typeof v88Logado === 'function' && v88Logado() && C82.conta && C82.conta.idPublico != null) t = 'ID: ' + v88Pub(C82.conta.idPublico); } catch (_) {}
    if (id.textContent !== t) id.textContent = t;
  }
  const band = LB.eu && LB.eu.querySelector('.v101-band');
  if (band){ let f = 'BR'; try { f = slPais(); } catch (_) {} if (band.dataset.f !== f){ band.dataset.f = f; band.innerHTML = typeof slBandeira === 'function' ? slBandeira(f) : ''; } }
  // os pontos da ranqueada
  const pts = V91.pat && V91.pat.querySelector('.v101-pts b');
  if (pts){ let n = 0; try { n = CONTA.rq.pts | 0; } catch (_) {} const t = fmtNum(n); if (pts.textContent !== t) pts.textContent = t; }
  // o campo da ranqueada
  const cp = LB.modo && LB.modo.querySelector('.v101-campo');
  if (cp){ let t = 'ESTÁDIO'; try { t = CAMPOS[MAPA_RQ].nome.toUpperCase(); } catch (_) {} if (cp.textContent !== t) cp.textContent = t; }
  // o JOGAR: a linha de baixo só com o grupo (PRONTO, ESPERANDO O LÍDER…); sozinho, o campo e o modo já estão do lado
  if (LB.jogar){ const gr = typeof V93G !== 'undefined' && !!V93G.g; if (K.grupo !== gr){ K.grupo = gr; LB.jogar.classList.toggle('v101-com-sub', gr); } }
  // as MISSÕES: o ponto vermelho quando tem prêmio para pegar
  if (LB.missoes){ const p = LB.missoes.classList.contains('pronta'); if (K.mis !== p){ K.mis = p; LB.missoes.classList.toggle('v101-ponto', p); } }
  v101SinalPinta();
  v101VagasPinta();
}
function v101SinalPinta(){
  const s = V101.sinal; if (!s || typeof v88SinalEstado !== 'function') return;
  let e; try { e = v88SinalEstado(); } catch (_) { return; }
  const p = typeof NET49 !== 'undefined' ? Math.round(NET49.ping || 0) : 0;
  const tx = e.cor === 'cinza' ? 'OFF' : (p && e.barras >= 2 ? p + 'ms' : e.cor === 'vermelho' ? 'SEM' : '…');
  const key = e.cor + '|' + e.barras + '|' + tx;
  if (s.dataset.k === key) return;
  s.dataset.k = key; s.dataset.cor = e.cor; s.dataset.barras = String(e.barras);
  s.querySelector('small').textContent = tx;
  s.setAttribute('aria-label', 'Conexão: ' + e.txt);
}

/* ---------------------------------------------------------------- 7) os ganchos */
const lbRenderAntes101 = lbRender;
lbRender = function(){ const r = lbRenderAntes101.apply(this, arguments); try { v101Monta(); v101Arruma(); } catch (e) { console.error('v101', e); } return r; };
const lbLayoutAntes101 = lbLayout;
lbLayout = function(){
  const r = lbLayoutAntes101.apply(this, arguments);
  try { if (V101.on) v101Arruma(); } catch (e) { console.error('v101', e); }
  // o piso do texto (a v70: o texto pequeno cresce até 12 px de verdade) roda quando o texto muda; a troca deitado ⇄ em pé só
  // muda a classe do lobby (nenhum texto) — sem isso, em pé o piso às vezes ficava sem rodar e o texto dos botões ficava miúdo
  try { if (typeof uiPisoAgenda === 'function') uiPisoAgenda(); } catch (_) {}
  return r;
};
// o sinal muda sem o lobby se redesenhar (o ping chega do servidor): uma olhada a cada 2 s, só com o lobby aberto
V101.timer = setInterval(() => { try { if (V101.on && lobby.aberto && !document.hidden) v101SinalPinta(); } catch (_) {} }, 2000);
try { v101Monta(); v101Arruma(); } catch (e) { console.error('v101', e); }
window.RachaLobby101 = {estado:() => ({on:V101.on, fundo:!!V101.F, vagas:V101.vagas ? V101.vagas.children.length : 0, E:V91.E})};
