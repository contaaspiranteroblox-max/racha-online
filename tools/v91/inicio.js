/* ======================================================================================================================
   RACHA v91 · A TELA INICIAL NO ESTILO DA IMAGEM DE REFERÊNCIA. A mesma arrumação da v90 (os mesmos botões nos mesmos
   lugares, abrindo as mesmas telas), com a cara da imagem:
   · o FUNDO é a própria quadra da imagem (V91_FUNDO: sem os botões, com os lados estendidos para as telas largas), cobrindo
     a tela do fim da faixa azul até embaixo; a tampinha do jogo fica exatamente onde a da imagem estava;
   · em cima, a FAIXA AZUL: o perfil (a tampinha, o nível no hexágono, o nome e o XP), a PATENTE (a insígnia, o nome e a
     barra até a próxima divisão; tocar abre as patentes), as moedas e as gemas com o + verde, o chat, o correio e os ajustes;
   · os lados: LOJA (amarela), COFRE, CLUBE e TREINO; SALAS, AMIGOS, RANKING e EVENTOS — quadrados com o ícone grande, o nome
     embaixo e o contorno grosso; o número vermelho de não lido no canto;
   · no meio, a TAMPINHA equipada em pé, com espessura (3D), a luz roxa atrás, o anel no chão e o reflexo no chão molhado
     (tocar abre o COFRE e segurar abre a roda das favoritas, como na v90);
   · embaixo: o PASSE RACHA (a coroa, o nível no hexágono dourado, a barra e o bilhete), as MISSÕES (a prancheta e o prêmio),
     o MODO (o campo, o nome e a setinha) e o JOGAR amarelo grande.
   Nada aqui mexe em partida, física, rede, conta, moedas ou gemas.
   ====================================================================================================================== */

const V91_3D = {dx:.045, dy:.11, passos:6};                // a espessura da tampinha (em frações do raio)

/* ---------------------------------------------------------------- 1) montar (uma vez) */
function v91Monta(){
  if (V91.on || !LB.raiz || !LB.palco || !V91.F) return;
  const R = LB.raiz, topo = LB.palco.querySelector('.lb-topo'), rol = document.getElementById('lb-rolagem');
  if (!topo || !rol || !LB.jogar) return;
  V91.on = true;
  R.classList.add('v91');
  document.documentElement.classList.add('v91');            // (o painel do chat e as janelas que ficam fora do #lb)
  // o fundo (a imagem) e a faixa azul, atrás do palco
  const cena = nodo('div', 'v91-cena'); cena.setAttribute('aria-hidden', 'true');
  const img = new Image(); img.alt = ''; img.decoding = 'async'; img.draggable = false; img.src = V91.F.src;
  img.width = V91.F.info.w; img.height = V91.F.info.h;
  cena.appendChild(img);
  const faixa = nodo('div', 'v91-faixa'); faixa.setAttribute('aria-hidden', 'true');
  R.insertBefore(cena, rol); R.insertBefore(faixa, rol);
  V91.cena = cena; V91.img = img; V91.faixa = faixa;
  // a PATENTE (um bloco próprio na faixa, como na imagem)
  if (LB.eu && !topo.querySelector('.v91-pat')){
    const pat = novoBotao('v91-pat', 'Patente da ranqueada: ver as patentes');
    pat.innerHTML = '<i class="v91-pat-ins"></i><span class="v91-pat-tx"><b>BRONZE III</b><span class="v91-barra"><i></i></span></span>';
    pat.addEventListener('click', e => { e.stopPropagation(); som.clique(); if (typeof v79PatentesAbre === 'function') v79PatentesAbre(); });
    // (depois da LIGA da v71, que continua colada no cartão — escondida desde a v90 — para quem a procura do lado dele)
    const liga = LB.eu.nextElementSibling && LB.eu.nextElementSibling.classList.contains('v71-liga') ? LB.eu.nextElementSibling : LB.eu;
    liga.insertAdjacentElement('afterend', pat);
    V91.pat = pat;
  }
  // os ícones novos: os botões dos lados
  v91Icones();
  // em cima à direita: moedas e gemas (com o + verde) e os quadrados (chat, correio, ajustes)
  for (const g of topo.querySelectorAll('.hm-grana')){
    const i = g.querySelector(':scope > i');
    const gema = !!(i && /gema/.test(i.className)) || /gema/i.test(g.getAttribute('aria-label') || '');
    if (i){ i.classList.add('v91-grana-ic'); i.innerHTML = v91Ic(gema ? 'gema' : 'moeda'); }
    if (!g.querySelector('.v91-mais')) g.appendChild(v91IcEl('mais', 'v91-mais'));
    g.classList.add('v91-grana', gema ? 'gema' : 'moeda');
  }
  const troca = (el, nome) => { if (!el) return; for (const x of el.querySelectorAll(':scope > svg, :scope > i, :scope > img, :scope > canvas')) x.remove(); el.insertBefore(v91IcEl(nome, 'v91-tp-ic'), el.firstChild); el.classList.add('v91-quad'); };
  troca(LB.chat || document.getElementById('lb-chat'), 'chat');
  troca(topo.querySelector('.v88-caixa'), 'carta');
  troca(LB.ajustes || document.getElementById('lb-ajustes'), 'ajustes');
  // embaixo: o PASSE (a coroa, o hexágono, a barra com os números e o bilhete)
  v91PasseMonta();
  // as MISSÕES: a prancheta
  if (LB.missoes){
    const ic = LB.missoes.querySelector(':scope > i'); if (ic){ ic.className = 'v91-mi-ic'; ic.innerHTML = v91Ic('missoes'); }
    if (!LB.missoes.querySelector('.v91-mi-tit')) LB.missoes.insertBefore(nodo('b', 'v91-mi-tit', 'MISSÕES'), LB.missoes.firstChild);
  }
  // o MODO: o campo e a setinha
  if (LB.modo){
    const ic = LB.modo.querySelector(':scope > i'); if (ic){ ic.className = 'v71-modo-ic v91-modo-ic'; ic.innerHTML = v91Ic('campo'); }
    if (!LB.modo.querySelector('.v91-desce')) LB.modo.appendChild(v91IcEl('desce', 'v91-desce'));
  }
  // o JOGAR: o triângulo branco
  if (!LB.jogar.querySelector('.v91-play')) LB.jogar.insertBefore(v91IcEl('play', 'v91-play'), LB.jogar.firstChild);
  try { lbLayout(); } catch (_) {}
}

// os botões dos lados: o ícone novo e o nome da cor (idempotente: a v90 troca o ícone do COFRE na primeira arrumação)
function v91Icones(){
  const rx = document.getElementById('rx'); if (!rx) return;
  const icone = (el, nome) => {
    if (!el) return;
    el.dataset.v91 = nome;
    const i = el.querySelector(':scope > i'); if (!i || (i.classList.contains('v91-tile-ic') && i.dataset.ic === nome)) return;
    i.className = 'v77-ic-box v91-tile-ic'; i.dataset.ic = nome; i.innerHTML = v91Ic(nome);
  };
  icone(rx.querySelector('.v71-esq .rx-bt[data-loja]'), 'loja'); icone(rx.querySelector('.v71-esq [data-rx="cofre"], .v71-esq [data-rx="skins"]'), 'cofre');
  icone(rx.querySelector('.v71-esq [data-rx="clube"]'), 'clube'); icone(rx.querySelector('.v71-esq [data-rx="treino"]'), 'treino');
  icone(rx.querySelector('.v71-dir [data-rx="salas"]'), 'salas'); icone(rx.querySelector('.v71-dir [data-rx="amigos"]'), 'amigos');
  icone(rx.querySelector('.v71-dir [data-rx="ranking"]'), 'ranking'); icone(rx.querySelector('.v71-dir .v77-eventos'), 'eventos');
}
function v91PasseMonta(){
  const pa = document.querySelector('#lb .v88-passe');
  if (!pa || pa.querySelector('.v91-passe-coroa')) return;
  pa.classList.add('v91-passe');
  const coroa = v91IcEl('coroa', 'v91-passe-coroa');
  const hex = nodo('span', 'v91-hex'); hex.setAttribute('aria-hidden', 'true'); hex.appendChild(nodo('b', null, '–'));
  const bil = v91IcEl('bilhete', 'v91-passe-bil');
  const num = nodo('em', 'v91-passe-num');
  const barra = pa.querySelector('.v88-passe-barra'); if (barra) barra.appendChild(num);
  pa.append(coroa, hex, bil);
  v91PasseNumeros();
}
function v91PasseNumeros(){
  const pa = document.querySelector('#lb .v88-passe'); if (!pa) return;
  const hex = pa.querySelector('.v91-hex b'), num = pa.querySelector('.v91-passe-num'); if (!hex || !num) return;
  const P = (typeof V88 !== 'undefined' && typeof v88Logado === 'function' && v88Logado()) ? V88.passeLobby : null;
  if (P){ hex.textContent = String(P.nivel); num.textContent = P.max ? 'MÁXIMO' : fmtNum(P.atual | 0) + '/' + fmtNum(P.prox | 0); }
  else { hex.textContent = '–'; num.textContent = 'VER PRÊMIOS'; }
}
if (typeof v88PassePinta === 'function'){
  const v88PassePintaAntes91 = v88PassePinta;
  v88PassePinta = function(){ const r = v88PassePintaAntes91.apply(this, arguments); try { v91PasseNumeros(); } catch (_) {} return r; };
}

/* ---------------------------------------------------------------- 2) o encaixe: o fundo cobrindo a tela e a tampinha no lugar */
function v91Encaixe(){
  const I = V91.F.info, s = PALCO.s || 1, sa = PALCO.sa || {t:0, r:0, b:0, l:0}, vw = PALCO.vw || innerWidth, vh = PALCO.vh || innerHeight;
  const fim = sa.t + V91.FAIXA*s;                         // o fim da faixa azul (px da tela)
  let k = (vh - fim + 3)/I.h;                             // a imagem vai do fim da faixa até embaixo…
  k = Math.max(k, vw/I.w);                                // …e cobre a largura toda
  const cxTela = sa.l + (PALCO.w/2)*s;                    // a tampinha fica no meio do palco
  let x = cxTela - I.tampa.x*k;
  x = Math.min(0, Math.max(vw - I.w*k, x));
  const y = fim - 3;
  return {x, y, k, cx:(x + I.tampa.x*k - sa.l)/s, cy:(y + I.tampa.y*k - sa.t)/s, R:I.tampa.r*k/s};
}
if (window.RUA_LOBBY && typeof RUA_LOBBY.layout === 'function'){
  const layoutAntes91 = RUA_LOBBY.layout;
  RUA_LOBBY.layout = function(P, palco){
    const r = layoutAntes91.apply(this, arguments);
    try {
      if (V91.on && v91Deitado()){
        const E = V91.E = v91Encaixe();
        P.cx = Math.round(E.cx); P.cy = Math.round(E.cy);
        palco.style.setProperty('--rx-cy', P.cy + 'px'); palco.style.setProperty('--hm-cx', P.cx + 'px');
        EMB.R = Math.round(E.R*.97);
        EMB.w = Math.round(EMB.R*5.4); EMB.h = Math.round(EMB.R*4.6); EMB.oy = Math.round(EMB.R*2.3);
        v91Medidas(P, palco);
      }
    } catch (e) { console.error('v91 layout', e); }
    return r;
  };
}
if (window.RUA_LOBBY){
  const depoisAntes91 = RUA_LOBBY.depois;
  RUA_LOBBY.depois = function(){
    const r = depoisAntes91 ? depoisAntes91.apply(this, arguments) : undefined;
    try { v91Posiciona(); } catch (e) { console.error('v91 posiciona', e); }
    return r;
  };
}
// as medidas que dependem do tamanho do palco: a fileira de baixo divide a largura que sobra (os dois da esquerda encostam
// na esquerda, o MODO e o JOGAR na direita) e as colunas dos lados ficam no meio da altura entre a faixa e a fileira de baixo
const V91M = {m:22, gap:12, tile:126, tileGap:12, baixo:140, baixoB:24};
function v91Medidas(P, palco){
  const W = P.w, H = P.h, M = V91M, larg = W - 2*M.m;
  const jog = Math.round(Math.min(440, Math.max(360, larg*.27)));
  const modo = Math.round(Math.min(420, Math.max(320, larg*.25)));
  const resto = larg - jog - modo - 3*M.gap;                // (o PASSE e as MISSÕES dividem o resto: nada de buraco nas telas largas)
  const passe = Math.round(Math.min(640, Math.max(300, resto*.64)));
  const mis = Math.round(Math.max(200, resto - passe));
  const lMis = M.m + passe + M.gap, lModo = W - M.m - jog - M.gap - modo;
  const st = palco.style;
  st.setProperty('--v91-jogar', jog + 'px'); st.setProperty('--v91-modo', modo + 'px');
  st.setProperty('--v91-mis', mis + 'px'); st.setProperty('--v91-passe', passe + 'px');
  st.setProperty('--v91-l-mis', lMis + 'px'); st.setProperty('--v91-l-modo', lModo + 'px');
  const alto = 4*M.tile + 3*M.tileGap, livre = H - V91.FAIXA - (M.baixo + M.baixoB) - alto;
  st.setProperty('--v91-col-top', Math.round(V91.FAIXA + Math.max(30, Math.min(livre*.42, 120))) + 'px');
}
function v91Posiciona(){
  if (!V91.on) return;
  const R = LB.raiz, dei = v91Deitado();
  if (!dei){ V91.cena.style.transform = ''; return; }
  const E = V91.E || v91Encaixe(), s = PALCO.s || 1, sa = PALCO.sa || {t:0, l:0};
  V91.cena.style.transform = 'translate(' + E.x.toFixed(1) + 'px,' + E.y.toFixed(1) + 'px) scale(' + E.k.toFixed(5) + ')';
  V91.faixa.style.height = Math.round(sa.t + V91.FAIXA*s) + 'px';
  R.style.setProperty('--v91-s', s);
  // a área de toque da tampinha: o círculo dela (a v90 continua cuidando do toque e do segurar)
  const r = EMB.R*1.04;
  Object.assign(LB.emblema.style, {left:(PALCO.cx - r) + 'px', top:(PALCO.cy - r) + 'px', width:(2*r) + 'px', height:(2*r) + 'px'});
  const dica = LB.palco.querySelector('.v90-dica');
  if (dica){ dica.style.setProperty('--v91-dx', PALCO.cx + 'px'); dica.style.setProperty('--v91-dy', Math.round(PALCO.cy + EMB.R*1.13) + 'px'); }
}

/* ---------------------------------------------------------------- 3) a tampinha em pé, com espessura, luz e reflexo */
function v91Molde(slot, sk, R, k, t){                      // (um molde por lugar: a tela inicial e o perfil)
  const MS = V91.moldes || (V91.moldes = {}), M = MS[slot] || (MS[slot] = {key:'', t:-9});
  const px = Math.max(8, Math.round(R*k)), key = px + '|' + (typeof tpMinha === 'function' ? tpMinha() : '') + '|' + (perfil && perfil.avatar ? (perfil.avatar.t + perfil.avatar.e + perfil.avatar.cor) : '');
  if (M.key === key && (!M.anim || t - M.t < .8)) return M;
  const lado = Math.ceil(px*2.5), meio = lado/2;
  const mk = () => { const c = document.createElement('canvas'); c.width = lado; c.height = lado; return c; };
  if (!M.face || M.face.width !== lado){ M.face = mk(); M.som = mk(); M.refl = document.createElement('canvas'); }
  const f = M.face.getContext('2d'); f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, lado, lado);
  botaoPronto(f, meio, meio, px, sk, perfil.avatar, {t, bx:null, by:null, id:0, humor:''}, 1);
  // a lateral (a espessura): a silhueta repetida para baixo e para a direita, do escuro (longe) ao menos escuro (perto),
  // com um fio de luz roxa na beirada de baixo — tudo num canvas só (1 desenho por quadro)
  const sil = (cor) => { const s2 = M.som.getContext('2d'); s2.setTransform(1, 0, 0, 1, 0, 0); s2.globalCompositeOperation = 'source-over'; s2.clearRect(0, 0, lado, lado);
    s2.drawImage(M.face, 0, 0); s2.globalCompositeOperation = 'source-in'; s2.fillStyle = cor; s2.fillRect(0, 0, lado, lado); s2.globalCompositeOperation = 'source-over'; return M.som; };
  const dx = px*V91_3D.dx, dy = px*V91_3D.dy, n = V91_3D.passos;
  if (!M.l3) M.l3 = document.createElement('canvas');
  M.l3.width = Math.ceil(lado + dx + 2); M.l3.height = Math.ceil(lado + dy + 2);
  const l3 = M.l3.getContext('2d'); l3.clearRect(0, 0, M.l3.width, M.l3.height);
  l3.drawImage(sil('#8a6fe0'), dx, dy);                                               // o fio de luz (fica só a beirada)
  for (let i = n; i >= 1; i--){
    const fr = (i - .55)/n, t2 = 1 - (i - 1)/(n - 1 || 1);                           // fr: o deslocamento · t2: 0 longe → 1 perto
    const c0 = [16, 11, 32], c1 = [58, 44, 102], cor = 'rgb(' + c0.map((v, j) => Math.round(v + (c1[j] - v)*t2)).join(',') + ')';
    l3.drawImage(sil(cor), dx*fr, dy*fr);
  }
  // o reflexo: a face de cabeça para baixo, achatada e sumindo
  const rh = Math.ceil(lado*.5); M.refl.width = lado; M.refl.height = rh;
  const r = M.refl.getContext('2d'); r.setTransform(1, 0, 0, -.5, 0, rh); r.drawImage(M.face, 0, 0); r.setTransform(1, 0, 0, 1, 0, 0);
  r.globalCompositeOperation = 'destination-in';
  const gr = r.createLinearGradient(0, 0, 0, rh); gr.addColorStop(0, 'rgba(0,0,0,.42)'); gr.addColorStop(.4, 'rgba(0,0,0,.1)'); gr.addColorStop(.85, 'rgba(0,0,0,0)');
  r.fillStyle = gr; r.fillRect(0, 0, lado, rh); r.globalCompositeOperation = 'source-over';
  M.key = key; M.t = t; M.lado = lado; M.px = px; M.anim = v91Animada();
  return M;
}
function v91Animada(){ try { return typeof sk76Anim === 'function' && typeof tpLe === 'function' && typeof tpMinha === 'function' && !!sk76Anim(tpLe(tpMinha())); } catch (_) { return false; } }
// o que não mexe (a luz roxa atrás, a luz e o anel no chão, a sombra): desenhado uma vez por tamanho num canvas à parte
// (o anel tem desfoque: caro para refazer a cada quadro no celular) — a cada quadro só entra o brilho da música por cima
function v91Palco3D(slot, R, k0){
  const MS = V91.palcos || (V91.palcos = {}), key = Math.round(R*k0) + '|' + k0.toFixed(3);
  let P = MS[slot];
  if (P && P.key === key) return P;
  const k = k0*.6;                                          // (luz e anel são macios: meia resolução basta e economiza memória)
  const L = R*4.2, H2 = R*3.9, cx = L/2, y0 = R*1.8, chao = y0 + R*1.0;
  const c = P && P.c || document.createElement('canvas');
  c.width = Math.ceil(L*k); c.height = Math.ceil(H2*k);
  const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, L, H2);
  let gr = g.createRadialGradient(cx, y0, R*.5, cx, y0, R*1.75);
  gr.addColorStop(0, 'rgba(160,90,255,.46)'); gr.addColorStop(.48, 'rgba(140,70,255,.22)'); gr.addColorStop(1, 'rgba(120,60,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, y0, R*1.75, 0, TAU); g.fill();
  g.save(); g.translate(cx, chao); g.scale(1, .26);
  gr = g.createRadialGradient(0, 0, R*.2, 0, 0, R*1.9); gr.addColorStop(0, 'rgba(175,110,255,.62)'); gr.addColorStop(.55, 'rgba(140,70,255,.28)'); gr.addColorStop(1, 'rgba(120,60,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R*1.9, 0, TAU); g.fill();
  g.lineWidth = R*.055; g.strokeStyle = 'rgba(214,178,255,.62)';
  g.shadowColor = 'rgba(170,100,255,.95)'; g.shadowBlur = R*.12*k;
  g.beginPath(); g.arc(0, R*.05, R*1.42, 0, TAU); g.stroke();
  g.restore();
  // o brilho que pulsa com a música (por cima, com a transparência do pulso)
  const b = P && P.b || document.createElement('canvas');
  b.width = c.width; b.height = c.height;
  const gb = b.getContext('2d'); gb.setTransform(k, 0, 0, k, 0, 0); gb.clearRect(0, 0, L, H2);
  gr = gb.createRadialGradient(cx, y0, R*.4, cx, y0, R*1.5); gr.addColorStop(0, 'rgba(190,130,255,.5)'); gr.addColorStop(1, 'rgba(190,130,255,0)');
  gb.fillStyle = gr; gb.beginPath(); gb.arc(cx, y0, R*1.5, 0, TAU); gb.fill();
  P = MS[slot] = {key, c, b, L, H2, cx, y0};
  return P;
}
// a tampinha em pé no chão molhado: a luz roxa atrás, o anel no chão, o reflexo, a sombra, a espessura, a face e o brilho
function v91Tampa3D(g, slot, x, y0, R, k, t, o){
  o = o || {};
  const calmo = v91Calmo(), sk = skinAtual(), z = o.z || 1, bat = o.bat || 0;
  const bob = calmo || o.parada ? 0 : Math.sin(t*1.6)*R*.014, y = y0 - Math.abs(bob)*.6 + bob*.4;
  const chao = y0 + R*1.0;
  const P = v91Palco3D(slot, R, k), ox = x - P.cx, oy = y0 - P.y0;
  g.drawImage(P.c, ox, oy, P.L, P.H2);
  if (bat > .02){ g.globalAlpha = Math.min(1, bat); g.drawImage(P.b, ox, oy, P.L, P.H2); g.globalAlpha = 1; }
  const M = v91Molde(slot, sk, R, k, t), esc = 1/k, L = M.lado*esc;
  if (M.refl && !o.semReflexo){ g.globalAlpha = .9; g.drawImage(M.refl, x - L/2, chao + R*.06, L, M.refl.height*esc); g.globalAlpha = 1; }
  g.save(); g.translate(x + R*.04, chao); g.scale(1 - bob*.004, .16);
  let gr = g.createRadialGradient(0, 0, 4, 0, 0, R*1.05); gr.addColorStop(0, 'rgba(8,4,18,.8)'); gr.addColorStop(.7, 'rgba(8,4,18,.38)'); gr.addColorStop(1, 'rgba(8,4,18,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R*1.05, 0, TAU); g.fill(); g.restore();
  g.save(); g.translate(x, y); g.scale(z, z);
  if (M.l3) g.drawImage(M.l3, -L/2, -L/2, M.l3.width*esc, M.l3.height*esc);
  botaoPronto(g, 0, 0, R, sk, perfil.avatar, {t, bx:null, by:null, id:0, humor:''}, k*z);
  g.save(); g.beginPath(); g.arc(0, 0, R*.97, 0, TAU); g.clip();
  gr = g.createRadialGradient(-R*.42, -R*.5, R*.05, -R*.3, -R*.35, R*1.05);
  gr.addColorStop(0, 'rgba(255,255,255,.26)'); gr.addColorStop(.45, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(-R, -R, 2*R, 2*R); g.restore();
  g.restore();
}
if (typeof pintaBrilho === 'function'){
  const pintaBrilhoAntes91 = pintaBrilho;
  pintaBrilho = function(t){
    if (!V91.on || !v91Deitado()) return pintaBrilhoAntes91.apply(this, arguments);
    const c = LB.brilho, g = c.getContext('2d'), k = c.width/EMB.w;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    g.setTransform(k, 0, 0, k, 0, 0);
    const p = som.pulso();
    EMB.pop = Math.max(0, EMB.pop - .06);
    v91Tampa3D(g, 'lobby', EMB.w/2, EMB.oy, EMB.R, k, t, {z:1 + Math.sin(EMB.pop*Math.PI)*.07, bat:p >= 0 ? p : 0});
  };
}
// o PERFIL: a mesma tampinha em pé, no palco da esquerda
if (typeof pintaPalcoPerfil === 'function'){
  const pintaPalcoPerfilAntes91 = pintaPalcoPerfil;
  pintaPalcoPerfil = function(t){
    if (!V91.on || typeof V77T === 'undefined' || !V77T.pf || typeof PF === 'undefined' || !PF.palco || !PF.palcoBox) return pintaPalcoPerfilAntes91.apply(this, arguments);
    const box = PF.palcoBox, c = PF.palco, w = box.clientWidth, h = box.clientHeight;
    if (w < 20 || h < 20) return;
    const k = (PALCO.sc || PALCO.s)*(G().plano ? .75 : Math.min(window.devicePixelRatio || 1, 2)), key = w + 'x' + h + '@' + k.toFixed(3);
    if (c.dataset.k !== key){ c.style.width = w + 'px'; c.style.height = h + 'px'; c.width = Math.max(1, Math.round(w*k)); c.height = Math.max(1, Math.round(h*k)); c.dataset.k = key; }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(k, 0, 0, k, 0, 0);
    if (V77T.parte !== 'geral') return;
    const rk = !!(TELAS.perfil && TELAS.perfil.el.querySelector('.v90-pf-rk'));   // (logado: o bloco COMPETIÇÃO fica em cima, à esquerda)
    const R = Math.min(w*.42, h*(rk ? .31 : .35), 220);       // (o tamanho da v78: a tampinha grande do perfil)
    if (typeof V78P !== 'undefined') V78P.R = R;
    v91Tampa3D(g, 'perfil', w/2, h*(rk ? .6 : .54), R, k, t, {});
  };
}

/* ---------------------------------------------------------------- 4) a tampinha da imagem: o modelo pronto COROA RACHA */
// preto, o anel roxo e a coroa branca (a tampinha do meio da imagem de referência), entre os MODELOS PRONTOS do editor,
// logo depois da Clássica. Não vira a inicial de ninguém: a tampinha de quem já joga continua a mesma.
const V91_COROA = {p:'an', pc:['#121019', '#7a3cff', '#000000'], pp:[50, 50, 62, 0], b:'ls', bc:['#1a1726', '#000000'], i:'co', ic:['#ffffff', '#9b5cff'], ip:[50, 52, 54, 0], ie:2};
try {
  if (typeof TP_PRE !== 'undefined' && typeof tpD === 'function' && !TP_PRE.some(x => x.id === 'coroa-racha'))
    TP_PRE.splice(1, 0, {id:'coroa-racha', nome:'Coroa RACHA', d:tpNorm(tpD(V91_COROA))});
} catch (e) { console.error('v91 coroa', e); }

/* ---------------------------------------------------------------- 5) a cada arrumação: a patente, o passe e as legendas */
function v91Arruma(){
  if (!V91.on) return;
  v91Icones();
  // a patente
  const pat = V91.pat;
  if (pat && typeof rqElo === 'function' && typeof CONTA !== 'undefined'){
    const e = rqElo(CONTA.rq ? CONTA.rq.pts : 0), key = e.ordem + '|' + Math.round(e.pct*100);
    if (pat.dataset.k !== key){
      pat.dataset.k = key;
      pat.querySelector('.v91-pat-ins').innerHTML = rqInsignia(e);
      pat.querySelector('b').textContent = e.nome;
      pat.querySelector('.v91-barra i').style.width = Math.round(100*Math.max(0, Math.min(1, e.pct))) + '%';
      pat.style.setProperty('--pc', (e.elo && e.elo.txt) || '#ff9c5b');
      pat.setAttribute('aria-label', 'Patente ' + e.nome + (e.prox != null ? ', ' + Math.round(100*e.pct) + '% até a próxima divisão' : '') + '. Ver as patentes');
    }
  }
  v91PasseNumeros();
}
const lbLayoutAntes91 = lbLayout;
lbLayout = function(){ const r = lbLayoutAntes91.apply(this, arguments); try { v91Posiciona(); } catch (e) { console.error('v91', e); } return r; };   // (depois da v90, que também mexe na dica)
const lbRenderAntes91 = lbRender;
lbRender = function(){ const r = lbRenderAntes91.apply(this, arguments); try { v91Monta(); v91Arruma(); } catch (e) { console.error('v91', e); } return r; };
try { v91Monta(); v91Arruma(); } catch (e) { console.error('v91', e); }
