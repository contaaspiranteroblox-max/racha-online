/* ======================================================================================================================
   RACHA rua v76 · as TAMPINHAS ANIMADAS (a COLEÇÃO MISTURA DE TODAS da folha enviada, tools/v76/skins_original.png):
   CRIA (as luzes da favela piscando) · CRISTO (o dia e a noite) · BRASIL (a bandeira ondulando) · PITBULL (os olhos e a
   corrente) · DEBOCHE (as caras e a língua) · FÉ (a cruz brilhando com os raios) · DRAGÃO (as chamas) · GALÁXIA (os
   planetas girando).
   Como entram no jogo: cada cara é um ÍCONE novo da tampinha (TP_ICONES, no fim da lista: os códigos antigos não mudam)
   que ocupa a tampinha inteira, e o aro aceso é uma BORDA nova (TP_BORDAS: Fogo vivo, Elétrica, Brilhos e Pulso neon,
   com as duas cores da borda). As 8 da folha são os modelos prontos da coleção (no PRÉ-PROJETADO, primeiro). Viajam no
   mesmo código de sempre (T.xxxx): no online, quem tem a v76 vê a tampinha mexendo; versão antiga mostra uma tampinha
   comum. São só aparência: o tamanho, o aro do time e a física são os de todo mundo (o brilho do aro fica rente aos
   dentes, por baixo do aro do time).
   Onde mexem: na partida, no treino, no replay, no lobby, no perfil, no editor da tampinha e nos cartões da coleção.
   Nas listas e miniaturas ficam paradas (um quadro bonito de cada). Com Reduzir animações ou o Ultra leve, ficam paradas
   em todo lugar.
   Qual implementação valia: a tampinha é desenhada por tpDesenha → tpTampa (tools/tampa_rua.js, v69: tpSaia, o miolo
   com tpPintaTampo → tpPintaIcone, e o verniz) e, no jogo, por tpPoe (drawBotao e botaoPronto chamam; ele usa a imagem
   pronta tpSprite). Esta camada troca tpTampa (as caras: o miolo inteiro), tpSaia (o brilho parado das bordas novas),
   tpPintaIcone (a cara num escudo de clube), tpPoe (na tela que se mexe: a cara e o aro desenhados a cada quadro),
   tpDoBot (os bots não pegam as animadas), e no editor tpePreProjetados, tpeFaixa, tpeSincroniza, tpeNomeDe e
   pintaPreview (o editor e os cartões da coleção mexendo).
   As ilustrações (CRIA, CRISTO, PITBULL, FÉ e DRAGÃO) vêm do kit tools/v76/skins_kit (tools/v76/skins_kit.py), embutido
   pelo build (SK76_KIT). BRASIL, DEBOCHE e GALÁXIA são desenhadas aqui (a bandeira com o lema certo).
   ====================================================================================================================== */
const SK76_KIT = /*KIT76*/null;                             // {src:'data:image/webp;base64,…', p:{peça:[x, y, w, h]}} (o build põe)
const SK76_PRECO = {cara:'lendario', aro:'epico'};          // o preço: cada cara animada (100 gemas) e cada borda acesa (40 gemas) · mude aqui
const SK76 = {img:null, ok:false, cache:new Map(), erro:null, ultimoEd:0, ultimoCards:0};
const SK76_TAU = Math.PI*2;
if (SK76_KIT && SK76_KIT.src){
  const im = new Image();
  im.onload = () => { SK76.ok = true; sk76Refaz(); };
  im.onerror = () => { SK76.erro = 'o kit das tampinhas animadas não abriu'; window.RUA_SKINS76_ERRO = SK76.erro; };
  im.src = SK76_KIT.src; SK76.img = im;
}
function sk76Erro(e){ SK76.erro = String(e && e.stack || e); window.RUA_SKINS76_ERRO = SK76.erro; }
function sk76Refaz(){                                       // o kit chegou: refaz as tampinhas já desenhadas (sem a ilustração ainda)
  try {
    TP_SPR.clear(); SK76.cache.clear();
    EMB.leveFeito = false; PFP.feito = false; SKL.feito = false;
    if (lobby.aberto) lbRender();
    if (lobby.tela === 'skins' && ED.el && ED.D) tpeAtualiza(true);
  } catch (_) {}
}

/* ---------------------------------------------------------------- 1) ajudantes */
const sk76Suave = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a)/(b - a))); return k*k*(3 - 2*k); };
const sk76Rgb = h => { const n = parseInt(tpHex(h, '#ffffff').slice(1), 16); return (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255); };
function sk76Luz(g, x, y, R, rgb, a){                      // uma luz redonda (use com 'lighter')
  if (!(a > .004) || !(R > 0)) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, R);
  gr.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, a).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
  g.fillStyle = gr; g.fillRect(x - R, y - R, 2*R, 2*R);
}
function sk76Brilho(g, x, y, s, a){                         // a estrelinha de 4 pontas com a luz em volta
  if (!(a > .02)) return;
  sk76Luz(g, x, y, s*1.6, '255,236,170', .45*a);
  estrela4(g, x, y, s, 'rgba(255,250,228,' + Math.min(1, a).toFixed(3) + ')');
}
function sk76Arte(g, nome, R){                              // uma peça do kit no quadrado da cara (-R..R)
  const p = SK76.ok && SK76_KIT && SK76_KIT.p[nome]; if (!p) return false;
  g.drawImage(SK76.img, p[0], p[1], p[2], p[3], -R, -R, 2*R, 2*R); return true;
}
function sk76Espera(g, R, c0, c1){                          // (o kit ainda abrindo: um fundo nas cores da cara)
  const gr = g.createRadialGradient(0, -R*.25, R*.08, 0, 0, R*1.05); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  g.fillStyle = gr; g.fillRect(-R, -R, 2*R, 2*R);
}
function sk76Cache(chave, lado, desenha){                   // uma imagem pronta (as partes paradas das caras desenhadas aqui)
  let c = SK76.cache.get(chave); if (c) return c;
  if (SK76.cache.size > 160) SK76.cache.clear();
  c = document.createElement('canvas'); c.width = c.height = Math.max(4, Math.ceil(lado));
  try { desenha(c.getContext('2d'), c.width); } catch (e) { sk76Erro(e); }
  SK76.cache.set(chave, c); return c;
}
const sk76Lado = px => Math.max(16, Math.min(640, Math.round(px/8)*8));   // (de 8 em 8 px: o zoom mexendo não refaz a imagem a cada quadro)
function sk76NaLinha(pts, s){                               // o ponto a uma fração s do caminho
  let tot = 0; const L = [];
  for (let i = 1; i < pts.length; i++){ const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; }
  let a = Math.max(0, Math.min(1, s))*tot;
  for (let i = 0; i < L.length; i++){ if (a <= L[i]){ const f = L[i] ? a/L[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0])*f, pts[i][1] + (pts[i + 1][1] - pts[i][1])*f]; } a -= L[i]; }
  return pts[pts.length - 1];
}
function sk76Coroa(g, x, y, s, cor, borda){                 // a coroa de grafite (as três pontas e a faixa)
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.moveTo(-1, .45); g.lineTo(-1.08, -.55); g.lineTo(-.5, -.05); g.lineTo(0, -.75); g.lineTo(.5, -.05); g.lineTo(1.08, -.55); g.lineTo(1, .45); g.closePath();
  g.lineJoin = 'round'; g.lineWidth = .32; g.strokeStyle = borda; g.stroke(); g.fillStyle = cor; g.fill();
  g.fillRect(-1.05, .55, 2.1, .3); g.lineWidth = .18; g.strokeRect(-1.05, .55, 2.1, .3);
  g.restore();
}

/* ---------------------------------------------------------------- 2) as caras (R = o raio do miolo; o centro é 0, 0) */
// CRIA · as luzes da favela piscando, o sol pulsando atrás do menino e a coroa brilhando
const SK76_CRIA_LUZ = [[-.65, -.44], [-.78, -.46], [-.65, -.22], [-.68, 0], [-.84, -.07], [-.77, .26], [-.53, .41], [.85, -.25], [.6, 0], [.85, 0], [.6, .19], [.72, .46], [.89, .46]];
function skCria(g, R, t){
  if (!sk76Arte(g, 'cria', R)){ sk76Espera(g, R, '#ffc457', '#8a2c10'); return; }
  g.save(); g.globalCompositeOperation = 'lighter';
  sk76Luz(g, 0, -R*.12, R*.8, '255,196,90', .1 + .14*(.5 + .5*Math.sin(t*1.9)));
  SK76_CRIA_LUZ.forEach(([u, v], i) => {                    // cada janela acende e apaga no seu tempo
    const per = 1.3 + (i*.53) % 1.6, f = (t/per + i*.37) % 1, a = sk76Suave(0, .06, f)*(1 - sk76Suave(.52, .6, f));
    if (a < .02) return;
    sk76Luz(g, u*R, v*R, R*.12, '255,206,110', .55*a);
    g.fillStyle = 'rgba(255,236,170,' + (.9*a).toFixed(3) + ')'; g.fillRect(u*R - R*.028, v*R - R*.034, R*.056, R*.068);
  });
  g.restore();
  sk76Arte(g, 'cria_menino', R);                            // o menino e a bola na frente do sol
  g.save(); g.globalCompositeOperation = 'lighter'; sk76Brilho(g, R*.66, -R*.7, R*.13, Math.pow(Math.max(0, Math.sin(t*1.3)), 10)); g.restore();
}

// CRISTO · o dia, o pôr do sol, a noite (as estrelas, a lua, as luzes das casas e a estátua acesa) e o amanhecer
const SK76_CRISTO_CASA = [[-.82, .5], [-.66, .62], [-.48, .72], [-.75, .78], [-.6, .45], [.45, .58], [.6, .48], [.75, .62], [.62, .78], [.86, .5], [.5, .75]];
const SK76_CEU = (() => { const r = estRnd(777), l = []; for (let i = 0; i < 20; i++) l.push([r()*1.8 - .9, -.95 + r()*.8, .5 + r()*.8, r()*6]); return l; })();
function skCristo(g, R, t){
  if (!sk76Arte(g, 'cristo', R)){ sk76Espera(g, R, '#8fd0ff', '#1d3f8a'); return; }
  const f = (t % 10)/10;
  const tarde = sk76Suave(.2, .34, f)*(1 - sk76Suave(.4, .52, f)), noite = sk76Suave(.32, .5, f)*(1 - sk76Suave(.82, .97, f)), aurora = sk76Suave(.8, .88, f)*(1 - sk76Suave(.92, 1, f));
  g.save();
  g.globalCompositeOperation = 'multiply';
  if (tarde > .01){ g.fillStyle = 'rgba(255,150,90,' + (.6*tarde).toFixed(3) + ')'; g.fillRect(-R, -R, 2*R, 2*R); }
  if (aurora > .01){ g.fillStyle = 'rgba(255,175,200,' + (.45*aurora).toFixed(3) + ')'; g.fillRect(-R, -R, 2*R, 2*R); }
  if (noite > .01){ g.fillStyle = 'rgba(34,52,128,' + (.82*noite).toFixed(3) + ')'; g.fillRect(-R, -R, 2*R, 2*R); }
  g.globalCompositeOperation = 'lighter';
  if (tarde > .01) sk76Luz(g, R*.72, R*.1, R*.75, '255,140,50', .38*tarde);
  if (aurora > .01) sk76Luz(g, -R*.7, R*.05, R*.75, '255,170,190', .3*aurora);
  if (noite > .01){
    for (const [u, v, s, ph] of SK76_CEU){ const a = noite*(.55 + .45*Math.sin(t*2.3 + ph)); g.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; g.beginPath(); g.arc(u*R, v*R, R*.014*s, 0, SK76_TAU); g.fill(); }
    sk76Luz(g, -R*.58, -R*.6, R*.26, '255,244,200', .35*noite);
    g.fillStyle = 'rgba(255,248,220,' + noite.toFixed(3) + ')'; g.beginPath(); g.arc(-R*.58, -R*.6, R*.085, 0, SK76_TAU); g.fill();
    g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(30,42,96,' + noite.toFixed(3) + ')'; g.beginPath(); g.arc(-R*.54, -R*.63, R*.07, 0, SK76_TAU); g.fill();   // (a lua minguante)
    g.globalCompositeOperation = 'lighter';
    SK76_CRISTO_CASA.forEach(([u, v], i) => { const a = noite*((t*.6 + i*.37) % 1 < .86 ? 1 : .25); sk76Luz(g, u*R, v*R, R*.09, '255,196,100', .6*a); g.fillStyle = 'rgba(255,226,150,' + (.9*a).toFixed(3) + ')'; g.fillRect(u*R - R*.02, v*R - R*.024, R*.04, R*.048); });
  }
  g.restore();
  if (noite > .01){                                         // a estátua acesa pelos refletores
    g.save(); g.globalAlpha = noite; sk76Arte(g, 'cristo_estatua', R); g.restore();
    g.save(); g.globalCompositeOperation = 'lighter'; sk76Luz(g, 0, -R*.25, R*.8, '190,215,255', .16*noite); g.restore();
  }
}

// BRASIL · a bandeira (com o lema certo) ondulando, com o desgaste de muro
function skBrasilPano(g, W){                                // a bandeira parada, no quadrado W × W (cobre 2,3 R: sobra para a onda)
  const R = W/2.3; g.translate(W/2, W/2);
  g.fillStyle = '#16994a'; g.fillRect(-W/2, -W/2, W, W);
  const sombra = g.createRadialGradient(0, 0, R*.2, 0, 0, R*1.15); sombra.addColorStop(0, 'rgba(255,255,255,.06)'); sombra.addColorStop(1, 'rgba(0,30,10,.3)');
  g.fillStyle = sombra; g.fillRect(-W/2, -W/2, W, W);
  g.beginPath(); g.moveTo(-R*.94, 0); g.lineTo(0, -R*.66); g.lineTo(R*.94, 0); g.lineTo(0, R*.66); g.closePath();
  g.fillStyle = '#ffd21f'; g.fill(); g.lineWidth = R*.02; g.strokeStyle = 'rgba(120,90,0,.35)'; g.stroke();
  g.beginPath(); g.arc(0, 0, R*.38, 0, SK76_TAU); g.fillStyle = '#1b3e93'; g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, R*.38, 0, SK76_TAU); g.clip();
  const cx = R*.34, cy = R*1.32, r0 = R*1.36, e = R*.085;    // a faixa: um arco que sobe da esquerda para a direita
  g.beginPath(); g.arc(cx, cy, r0 + e/2, 0, SK76_TAU); g.arc(cx, cy, r0 - e/2, 0, SK76_TAU, true); g.fillStyle = '#f7f5ec'; g.fill('evenodd');
  const txt = 'ORDEM E PROGRESSO', fs = e*.72, a0 = Math.atan2(-cy, -R*.33 - cx), a1 = Math.atan2(-cy - R*.05, R*.33 - cx);
  g.fillStyle = '#16994a'; g.font = '700 ' + fs.toFixed(2) + 'px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  Array.from(txt).forEach((ch, i) => { const a = a0 + (a1 - a0)*(i + .5)/txt.length; g.save(); g.translate(cx + Math.cos(a)*r0, cy + Math.sin(a)*r0); g.rotate(a + Math.PI/2); g.fillText(ch, 0, fs*.06); g.restore(); });
  const r = estRnd(1889);                                   // as estrelas (embaixo da faixa) e a Espiga (em cima)
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 26; i++){ const a = Math.PI*(.15 + r()*.8), d = R*(.14 + r()*.2), x = Math.cos(a)*d*1.05, y = Math.sin(a)*d + R*.05; g.beginPath(); g.arc(x, y, R*(.008 + r()*.012), 0, SK76_TAU); g.fill(); }
  g.beginPath(); g.arc(-R*.04, -R*.22, R*.016, 0, SK76_TAU); g.fill();
  g.restore();
  const rr = estRnd(2026);                                  // o desgaste de muro: riscos claros e pintas escuras
  for (let i = 0; i < 90; i++){ g.fillStyle = rr() < .6 ? 'rgba(0,0,0,' + (.08 + rr()*.12).toFixed(2) + ')' : 'rgba(255,255,255,' + (.05 + rr()*.08).toFixed(2) + ')'; const x = (rr() - .5)*W, y = (rr() - .5)*W, s = R*(.01 + rr()*.03); g.fillRect(x, y, s*(1 + rr()*3), s); }
}
function skBrasil(g, R, t, px){
  const W = sk76Lado(px*2.3), pano = sk76Cache('bandeira|' + W, W, skBrasilPano), S = R*2.3, n = Math.max(8, Math.min(22, Math.round(px/4))), sw = S/n, A = R*.055, k = SK76_TAU/(R*1.35), w = t*4.4;   // (menos fatias na tampinha pequena)
  for (let i = 0; i < n; i++){                              // a onda: o pano em fatias, cada uma subindo e descendo
    const x = -S/2 + i*sw, dy = A*Math.sin(k*(x + sw/2) - w) - A*.3*Math.sin(w*.5);
    g.drawImage(pano, i*W/n, 0, W/n + .8, W, x, -S/2 + dy, sw + .6, S);
  }
  const gr = g.createLinearGradient(-R, 0, R, 0);          // a luz nas dobras (anda com a onda)
  for (let j = 0; j <= 12; j++){ const x = -R + j*R/6, s = Math.cos(k*x - w); gr.addColorStop(j/12, s > 0 ? 'rgba(255,255,255,' + (.16*s).toFixed(3) + ')' : 'rgba(0,0,0,' + (-.24*s).toFixed(3) + ')'); }
  g.fillStyle = gr; g.fillRect(-R, -R, 2*R, 2*R);
}

// PITBULL · os olhos acesos (e o clarão de raiva), o brilho correndo pela corrente e a coroa
const SK76_PB_OLHO = [[-.36, -.12], [.39, -.13]];
const SK76_PB_CORRENTE = [[[-.86, .28], [-.8, .45], [-.7, .6], [-.58, .76], [-.44, .9]], [[.88, .28], [.8, .45], [.72, .62], [.6, .78], [.47, .92]]];
function skPitbull(g, R, t){
  if (!sk76Arte(g, 'pitbull', R)){ sk76Espera(g, R, '#8a5a34', '#1b0d08'); return; }
  g.save(); g.globalCompositeOperation = 'lighter';
  const p = .5 + .5*Math.sin(t*3.1), raiva = Math.pow(Math.max(0, Math.sin(t*.9)), 14);
  for (const [u, v] of SK76_PB_OLHO){ sk76Luz(g, u*R, v*R, R*(.17 + .08*raiva), '255,36,24', .32 + .34*p + .34*raiva); sk76Luz(g, u*R, v*R, R*.05, '255,214,190', .3 + .45*p); }
  SK76_PB_CORRENTE.forEach((pts, lado) => { for (const d of [0, .5]){ const s = (t*.36 + lado*.27 + d) % 1, [u, v] = sk76NaLinha(pts, s); sk76Brilho(g, u*R, v*R, R*.08, Math.sin(s*Math.PI)); } });
  sk76Brilho(g, R*.17, -R*.9, R*.12, Math.pow(Math.max(0, Math.sin(t*1.1 + 1)), 10));
  g.restore();
}

// DEBOCHE · a carinha de grafite: deboche com a língua, piscadinha, a língua de lado e de óculos escuros
function skDebocheFundo(g, W){                              // o fundo de muro com os pixos e a coroa
  const R = W/2; g.translate(R, R);
  g.fillStyle = '#120d19'; g.fillRect(-R, -R, W, W);
  const r = estRnd(808), cores = ['rgba(162,76,255,.75)', 'rgba(59,107,255,.65)', 'rgba(255,210,63,.55)', 'rgba(230,90,255,.6)'];
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < 14; i++){                             // os pixos na volta (a carinha cobre o meio)
    const a = r()*SK76_TAU, d = R*(.78 + r()*.2), x = Math.cos(a)*d, y = Math.sin(a)*d;
    g.strokeStyle = cores[i % cores.length]; g.lineWidth = R*(.025 + r()*.03);
    g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) g.quadraticCurveTo(x + (r() - .5)*R*.35, y + (r() - .5)*R*.35, x + (r() - .5)*R*.4, y + (r() - .5)*R*.4); g.stroke();
    if (r() < .5){ g.lineWidth = R*.012; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + R*(.05 + r()*.12)); g.stroke(); }   // (o escorrido da tinta)
  }
  sk76Coroa(g, 0, -R*.84, R*.085, '#ffcf33', '#3a2400');
}
function skDebocheGota(g, x, y0, L, w){                    // um escorrido: estreita um pouco e acaba numa gota redonda
  g.beginPath(); g.moveTo(x - w/2, y0); g.quadraticCurveTo(x - w*.42, y0 + L*.6, x - w*.36, y0 + L - w*.5);
  g.arc(x, y0 + L - w*.5, w*.48, Math.PI, 0, true); g.quadraticCurveTo(x + w*.42, y0 + L*.6, x + w/2, y0); g.closePath();
}
function skDeboche(g, R, t, px){
  const W = sk76Lado(px*2); g.drawImage(sk76Cache('deboche|' + W, W, skDebocheFundo), -R, -R, 2*R, 2*R);
  const T = 7.2, f = t % T, cara = f < 2.4 ? 0 : f < 3.6 ? 1 : f < 5 ? 2 : 3;   // 0 deboche · 1 piscadinha · 2 língua de lado · 3 óculos
  const troca = [0, 2.4, 3.6, 5][cara], pulo = Math.max(0, 1 - (f - troca)/.28), z = 1 + .07*Math.sin(pulo*Math.PI);
  g.save(); g.scale(z, z);
  const fy = R*.02, rf = R*.64, tinta = '#0d0b10', lw = R*.05;
  // os escorridos (embaixo da carinha), crescendo e voltando devagar
  const gotas = [[-.38, .12, .11], [-.14, .24, .13], [.12, .17, .11], [.36, .1, .1]];   // [x, o quanto desce além da carinha, a largura]
  const gy = u => fy + Math.sqrt(Math.max(0, rf*rf - (u*R)*(u*R))) - R*.08;   // (de onde sai: a beira de baixo da carinha)
  g.lineWidth = lw*.8; g.strokeStyle = tinta; g.fillStyle = '#f4b414';
  gotas.forEach(([u, L, w], i) => { const l = L*(1 + .18*Math.sin(t*1.1 + i*1.7)); skDebocheGota(g, u*R, gy(u) - R*.06, R*(l + .14), R*w); g.stroke(); g.fill(); });
  // a carinha
  const gr = g.createRadialGradient(-rf*.3, fy - rf*.35, rf*.1, 0, fy, rf*1.05); gr.addColorStop(0, '#ffe46a'); gr.addColorStop(.6, '#ffc61f'); gr.addColorStop(1, '#ec9a00');
  g.beginPath(); g.arc(0, fy, rf, 0, SK76_TAU); g.fillStyle = gr; g.fill(); g.lineWidth = lw; g.strokeStyle = tinta; g.stroke();
  gotas.forEach(([u, L, w], i) => { const l = L*(1 + .18*Math.sin(t*1.1 + i*1.7)); g.fillStyle = '#efa40c'; skDebocheGota(g, u*R, gy(u) - R*.1, R*(l + .16), R*w - lw*.8); g.fill(); });   // (a carinha "derretendo": a tinta emendada na beira)
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = tinta; g.fillStyle = tinta;
  const olho = (x, fechado, olha) => {                       // olho de deboche: a pálpebra caída e brava
    if (fechado){ g.lineWidth = lw*1.1; g.beginPath(); g.moveTo(x - R*.1, fy - R*.12); g.quadraticCurveTo(x, fy - R*.04, x + R*.1, fy - R*.12); g.stroke(); return; }
    g.save(); g.beginPath(); g.ellipse(x + olha*R*.03, fy - R*.11, R*.085, R*.1, 0, 0, SK76_TAU); g.clip();
    g.fill(); g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(x - R*.12, fy - R*.24); g.lineTo(x + R*.12, fy - R*.24); g.lineTo(x + R*.12, fy - R*.14 + (x < 0 ? R*.03 : -R*.03)); g.lineTo(x - R*.12, fy - R*.14 + (x < 0 ? -R*.03 : R*.03)); g.closePath(); g.fill();
    g.restore(); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x + olha*R*.03 - R*.025, fy - R*.07, R*.018, 0, SK76_TAU); g.fill(); g.fillStyle = tinta;
  };
  if (cara === 3){                                          // de óculos escuros, com o sorrisão
    const lente = x => { g.beginPath(); g.moveTo(x - R*.17, fy - R*.2); g.lineTo(x + R*.17, fy - R*.2); g.quadraticCurveTo(x + R*.16, fy - R*.02, x, fy - R*.02); g.quadraticCurveTo(x - R*.16, fy - R*.02, x - R*.17, fy - R*.2); g.closePath(); };
    for (const x of [-R*.22, R*.22]){ lente(x); g.fill(); }
    g.lineWidth = lw*.8; g.beginPath(); g.moveTo(-R*.06, fy - R*.18); g.lineTo(R*.06, fy - R*.18); g.stroke();
    g.beginPath(); g.moveTo(-R*.39, fy - R*.18); g.lineTo(-R*.55, fy - R*.24); g.moveTo(R*.39, fy - R*.18); g.lineTo(R*.55, fy - R*.24); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = lw*.4; for (const x of [-R*.3, R*.14]){ g.beginPath(); g.moveTo(x, fy - R*.17); g.lineTo(x + R*.06, fy - R*.07); g.stroke(); } g.strokeStyle = tinta;
    g.lineWidth = lw*1.15; g.beginPath(); g.moveTo(-R*.36, fy + R*.12); g.quadraticCurveTo(0, fy + R*.44, R*.38, fy + R*.1); g.stroke();
    g.save(); g.globalCompositeOperation = 'lighter'; sk76Brilho(g, R*.1, -R*.92, R*.1, Math.pow(Math.max(0, Math.sin((f - 5)*2.6)), 4)); g.restore();
  } else {
    g.lineWidth = lw*1.15;                                  // as sobrancelhas bravas
    g.beginPath(); g.moveTo(-R*.4, fy - R*.33 + (cara === 1 ? -R*.05 : 0)); g.lineTo(-R*.1, fy - R*.22); g.moveTo(R*.1, fy - R*.22); g.lineTo(R*.4, fy - R*.33); g.stroke();
    const olha = cara === 2 ? Math.sin(t*3) : 0;
    olho(-R*.23, cara === 1, olha); olho(R*.23, false, olha);
    g.lineWidth = lw*1.15; g.beginPath(); g.moveTo(-R*.42, fy + R*.05); g.quadraticCurveTo(-R*.05, fy + R*.38, R*.44, fy + R*.08); g.stroke();   // o sorriso de lado
    const ang = cara === 2 ? .5*Math.sin(t*5.5) : cara === 1 ? .25*Math.sin(t*9) : .18*Math.sin(t*6.5), bx = cara === 2 ? R*.02 : R*.18, by = fy + R*.25;
    g.save(); g.translate(bx, by); g.rotate(ang);             // a língua (presa no canto da boca, balançando)
    g.beginPath(); g.moveTo(-R*.11, 0); g.lineTo(-R*.11, R*.17); g.arc(0, R*.17, R*.11, Math.PI, 0, true); g.lineTo(R*.11, 0); g.closePath();
    g.fillStyle = '#e8323c'; g.fill(); g.lineWidth = lw*.85; g.stroke();
    g.strokeStyle = 'rgba(120,0,10,.7)'; g.lineWidth = lw*.5; g.beginPath(); g.moveTo(0, R*.03); g.lineTo(0, R*.17); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-R*.05, R*.12, R*.025, R*.045, 0, 0, SK76_TAU); g.fill();
    g.restore();
  }
  g.restore();
}

// FÉ · os raios girando atrás da cruz e a cruz brilhando
function skFe(g, R, t){
  if (!sk76Arte(g, 'fe', R)){ sk76Espera(g, R, '#5a4a20', '#0b0906'); return; }
  const cx = R*.02, cy = -R*.37, p = .5 + .5*Math.sin(t*2.2);
  g.save(); g.globalCompositeOperation = 'lighter';
  sk76Luz(g, cx, cy, R*1.1, '255,196,80', .12 + .12*p);
  const gr = g.createRadialGradient(cx, cy, R*.05, cx, cy, R*1.5); gr.addColorStop(0, 'rgba(255,214,120,' + (.42 + .2*p).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,190,70,0)');
  g.fillStyle = gr; g.beginPath();
  const n = 16, a0 = t*.32;
  for (let i = 0; i < n; i++){ const a = a0 + i*SK76_TAU/n, w = i & 1 ? .03 : .055; g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - w)*R*1.6, cy + Math.sin(a - w)*R*1.6); g.lineTo(cx + Math.cos(a + w)*R*1.6, cy + Math.sin(a + w)*R*1.6); g.closePath(); }
  g.fill();
  g.restore();
  sk76Arte(g, 'fe_cruz', R);                                // a cruz na frente dos raios
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .14 + .3*p; sk76Arte(g, 'fe_cruz', R); g.globalAlpha = 1;   // e brilhando
  sk76Brilho(g, R*.56, -R*.13, R*.12, Math.pow(Math.max(0, Math.sin(t*1.4 + 2)), 10));
  g.restore();
}

// DRAGÃO · o fogo tremendo, as chamas subindo, o bafo de fogo e as brasas
function skDragao(g, R, t){
  if (!sk76Arte(g, 'dragao', R)){ sk76Espera(g, R, '#ff9a2a', '#5a0a04'); return; }
  const fl = .5 + .25*Math.sin(t*9.1) + .25*Math.sin(t*13.7 + 1);
  g.save(); g.globalCompositeOperation = 'lighter';
  sk76Luz(g, 0, R*.45, R*1.15, '255,90,20', .07 + .1*fl);
  const gr = g.createLinearGradient(0, R, 0, R*.15); gr.addColorStop(0, 'rgba(255,205,70,.6)'); gr.addColorStop(.45, 'rgba(255,100,25,.36)'); gr.addColorStop(1, 'rgba(255,40,10,0)');
  g.fillStyle = gr; g.beginPath();
  for (let i = 0; i < 9; i++){                              // as línguas de fogo subindo da beira de baixo
    const x = (-.9 + i*.225)*R, h = R*(.32 + .28*(.5 + .5*Math.sin(t*5.2 + i*1.9))), w = R*.13, b = Math.sin(t*3.3 + i)*R*.06;
    g.moveTo(x - w, R*1.02); g.quadraticCurveTo(x - w*.7, R - h*.55, x + b, R - h); g.quadraticCurveTo(x + w*.7, R - h*.55, x + w, R*1.02); g.closePath();
  }
  g.fill();
  for (let k = 0; k < 3; k++){                              // o bafo saindo da boca
    const s = (t*.9 + k/3) % 1, x = R*(.62 + .55*s), y = R*(.14 + .3*s), rr = R*(.06 + .17*s);
    sk76Luz(g, x, y, rr*1.8, '255,140,40', .55*(1 - s)); sk76Luz(g, x, y, rr*.8, '255,236,170', .5*(1 - s));
  }
  for (let i = 0; i < 12; i++){                             // as brasas subindo
    const s = (t*.33 + i*.137) % 1, x = R*(-.85 + ((i*.613) % 1)*1.7) + Math.sin(t*2 + i)*R*.05, y = R*(.98 - 1.9*s), a = Math.sin(s*Math.PI);
    g.fillStyle = 'rgba(255,196,90,' + (.85*a).toFixed(3) + ')'; g.fillRect(x - R*.013, y - R*.013, R*.026, R*.026);
  }
  sk76Luz(g, R*.45, -R*.38, R*.13, '255,240,150', .25 + .35*fl);   // o olho
  g.restore();
}

// GALÁXIA · o disco girando, os planetas em volta (passando por trás e pela frente) e as estrelas piscando
function skGalaxiaFundo(g, W){
  const R = W/2; g.translate(R, R);
  const gr = g.createRadialGradient(0, -R*.1, R*.1, 0, 0, R*1.05); gr.addColorStop(0, '#3a1478'); gr.addColorStop(.55, '#1c0c4c'); gr.addColorStop(1, '#090422');
  g.fillStyle = gr; g.fillRect(-R, -R, W, W);
  g.globalCompositeOperation = 'lighter';
  const r = estRnd(4242);
  for (const [x, y, s, c, a] of [[-.55, .5, .6, '60,90,255', .32], [.6, -.5, .55, '170,60,255', .3], [.25, .65, .45, '255,60,200', .22], [-.6, -.45, .5, '50,140,255', .26], [.0, -.1, .7, '120,60,255', .2]]) sk76Luz(g, x*R, y*R, s*R, c, a);
  for (let i = 0; i < 90; i++){ g.fillStyle = 'rgba(255,255,255,' + (.3 + r()*.6).toFixed(2) + ')'; const s = R*(.005 + r()*.01); g.fillRect((r()*2 - 1)*R, (r()*2 - 1)*R, s, s); }
}
function skGalaxiaDisco(g, W){                              // o disco visto de cima (redondo): os dois braços acesos em espiral e o miolo
  const R = W/2; g.translate(R, R); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  const braco = (a0) => { g.beginPath(); for (let th = 0; th <= 11.3; th += .12){ const d = R*.09*Math.exp(.205*th), a = th + a0; th ? g.lineTo(Math.cos(a)*d, Math.sin(a)*d) : g.moveTo(Math.cos(a)*d, Math.sin(a)*d); } };
  for (const a0 of [0, Math.PI]){
    for (const [lw, cor] of [[.26, 'rgba(120,60,255,.16)'], [.16, 'rgba(200,70,255,.22)'], [.09, 'rgba(255,90,210,.3)'], [.035, 'rgba(255,215,245,.45)']]){ braco(a0); g.lineWidth = R*lw; g.strokeStyle = cor; g.stroke(); }
  }
  const r = estRnd(9001);
  for (let k = 0; k < 260; k++){                            // a poeira de estrelas nos braços
    const th = r()*11.3, d = R*.09*Math.exp(.205*th)*(1 + (r() - .5)*.25), a = th + (k & 1)*Math.PI + (r() - .5)*.35; if (d > R*.98) continue;
    g.fillStyle = 'rgba(255,' + (200 + (r()*55 | 0)) + ',255,' + (.25 + r()*.5).toFixed(2) + ')'; const s = R*(.008 + r()*.016); g.fillRect(Math.cos(a)*d, Math.sin(a)*d, s, s);
  }
  sk76Luz(g, 0, 0, R*.5, '255,150,220', .55); sk76Luz(g, 0, 0, R*.3, '255,226,160', 1); sk76Luz(g, 0, 0, R*.14, '255,255,240', 1);
}
function skGalaxiaPlaneta(g, x, y, r, c0, c1, luzX, luzY){
  const d = Math.hypot(luzX - x, luzY - y) || 1, lx = x + (luzX - x)/d*r*.45, ly = y + (luzY - y)/d*r*.45;
  const gr = g.createRadialGradient(lx, ly, r*.1, x, y, r*1.05); gr.addColorStop(0, c0); gr.addColorStop(.7, c1); gr.addColorStop(1, '#2a0a12');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, SK76_TAU); g.fill();
  g.lineWidth = r*.12; g.strokeStyle = 'rgba(255,110,190,.55)'; g.stroke();
}
const SK76_GX_PLANETA = [{d:.84, v:.42, f:0, r:.13, c:['#ffd39a', '#e0601e']}, {d:.6, v:.27, f:3.4, r:.17, c:['#ffc27a', '#c4421a']}];
function skGalaxia(g, R, t, px){
  const W = sk76Lado(px*2);
  g.drawImage(sk76Cache('gx-fundo|' + W, W, skGalaxiaFundo), -R, -R, 2*R, 2*R);
  const tilt = -.45, achata = .58, pos = SK76_GX_PLANETA.map(P => {   // os planetas no plano do disco (achatado e inclinado)
    const a = P.f + t*P.v, x0 = Math.cos(a)*P.d*R, y0 = Math.sin(a)*P.d*R*achata;
    return {P, x:x0*Math.cos(tilt) - y0*Math.sin(tilt), y:x0*Math.sin(tilt) + y0*Math.cos(tilt), atras:Math.sin(a) < 0, z:1 + .12*Math.sin(a)};
  });
  for (const q of pos) if (q.atras) skGalaxiaPlaneta(g, q.x, q.y, R*q.P.r*q.z, q.P.c[0], q.P.c[1], 0, 0);
  g.save(); g.globalCompositeOperation = 'lighter'; g.rotate(tilt); g.scale(1, achata); g.rotate(t*.55);
  g.drawImage(sk76Cache('gx-disco|' + W, W, skGalaxiaDisco), -R*1.22, -R*1.22, R*2.44, R*2.44);
  g.restore();
  g.save(); g.globalCompositeOperation = 'lighter'; sk76Luz(g, 0, 0, R*.32, '255,232,190', .22 + .12*Math.sin(t*2.1)); g.restore();
  for (const q of pos) if (!q.atras) skGalaxiaPlaneta(g, q.x, q.y, R*q.P.r*q.z, q.P.c[0], q.P.c[1], 0, 0);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++){ const u = Math.cos(i*2.4 + 1)*.72, v = Math.sin(i*3.1 + .5)*.72; sk76Brilho(g, u*R, v*R, R*.07, Math.pow(Math.max(0, Math.sin(t*1.7 + i*1.9)), 6)); }
  g.restore();
}

// a lista: o ícone novo de cada cara (id de 2 letras, como os outros), o nome, o que mexe e o quadro parado (t0, em s)
const SK76_CARAS = [
  {id:'zc', nome:'Cria', anim:'Luzes da favela piscando', t0:.3, pinta:skCria},
  {id:'zr', nome:'Cristo', anim:'Ciclo dia e noite', t0:.6, pinta:skCristo},
  {id:'zb', nome:'Brasil', anim:'Bandeira ondulando', t0:.4, pinta:skBrasil},
  {id:'zp', nome:'Pitbull', anim:'Olhos e corrente em movimento', t0:.5, pinta:skPitbull},
  {id:'zd', nome:'Deboche', anim:'Expressões e língua', t0:.8, pinta:skDeboche},
  {id:'zf', nome:'Fé', anim:'Cruz brilhando com raios', t0:.7, pinta:skFe},
  {id:'zg', nome:'Dragão em chamas', anim:'Chamas em movimento', t0:.4, pinta:skDragao},
  {id:'zx', nome:'Galáxia', anim:'Planetas girando', t0:2.2, pinta:skGalaxia}
];
const SK76_CARA = new Map(SK76_CARAS.map(c => [c.id, c]));
// as bordas acesas (cor 1 = os dentes · cor 2 = a luz): o desenho parado é o metal (ou os dois tons) com a beira acesa
const SK76_AROS = [
  {id:'vf', nome:'Fogo vivo', n:21, forma:'onda', pinta:'metal', anim:'fogo'},
  {id:'ve', nome:'Elétrica', n:21, forma:'onda', pinta:'metal', anim:'raio'},
  {id:'vb', nome:'Brilhos', n:21, forma:'onda', pinta:'alterna', anim:'brilho'},
  {id:'vp', nome:'Pulso neon', n:21, forma:'onda', pinta:'metal', anim:'pulso'}
];
for (const c of SK76_CARAS){ const it = {id:c.id, nome:c.nome, pr:SK76_PRECO.cara, cores:0, cara:true}; TP_ICONES.push(it); TP_MAPA.i.set(it.id, it); }
for (const a of SK76_AROS){ const it = Object.assign({pr:SK76_PRECO.aro, cores:2}, a); TP_BORDAS.push(it); TP_MAPA.b.set(it.id, it); }
function sk76Anim(D){                                       // o que mexe no desenho: {cara, aro} (ou null)
  if (!D || D.k !== 'T') return null;
  const cara = SK76_CARA.get(D.i) || null, B = TP_MAPA.b.get(D.b), aro = B && B.anim ? B : null;
  return cara || aro ? {cara, aro} : null;
}

/* ---------------------------------------------------------------- 3) o aro aceso (parado e mexendo) */
const tpSaiaAntes76 = tpSaia;
tpSaia = function(g, x, y, r, D){
  const B = TP_MAPA.b.get(D.b);
  if (!B || !B.anim) return tpSaiaAntes76.apply(this, arguments);
  const rgb = sk76Rgb(D.bc[1]);
  const gr = g.createRadialGradient(x, y, r*.82, x, y, r*1.12); gr.addColorStop(0, 'rgba(' + rgb + ',.5)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r*1.12, 0, SK76_TAU); g.fill();   // a luz rente aos dentes
  tpSaiaAntes76.apply(this, arguments);
  tpSaiaPath(g, x, y, r*.975, B); g.lineJoin = 'round'; g.strokeStyle = tpMix(D.bc[1], '#ffffff', .3); g.lineWidth = Math.max(1, r*.028); g.stroke();   // a beira acesa
  g.beginPath(); g.arc(x, y, r*.79, 0, SK76_TAU); g.strokeStyle = 'rgba(' + rgb + ',.75)'; g.lineWidth = Math.max(1, r*.025); g.stroke();
};
function sk76Aro(g, x, y, r, D, t){                         // a animação do aro, por cima dos dentes (só na tela que se mexe e no editor)
  const B = TP_MAPA.b.get(D.b); if (!B || !B.anim) return;
  const rgb = sk76Rgb(D.bc[1]);
  g.save(); g.translate(x, y); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  if (B.anim === 'fogo'){                                   // as chamas em volta: um caminho só, com a luz da cor 2
    const gr = g.createRadialGradient(0, 0, r*.84, 0, 0, r*1.16); gr.addColorStop(0, 'rgba(' + rgb + ',.85)'); gr.addColorStop(.55, 'rgba(' + rgb + ',.4)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.beginPath();
    const n = 16, rot = t*.25;
    for (let i = 0; i < n; i++){
      const a = rot + i*SK76_TAU/n, h = .06 + .06*(.5 + .5*Math.sin(t*6.3 + i*2.17)) + .025*Math.sin(t*11 + i), w = .14, b = .06*Math.sin(t*4 + i*1.3);
      const b1 = a - w/2, b2 = a + w/2, tip = a + b, m = 1 + h*.55;
      g.moveTo(Math.cos(b1)*r*.88, Math.sin(b1)*r*.88);
      g.quadraticCurveTo(Math.cos(b1 + .02)*r*m, Math.sin(b1 + .02)*r*m, Math.cos(tip)*r*(1 + h), Math.sin(tip)*r*(1 + h));
      g.quadraticCurveTo(Math.cos(b2 - .02)*r*m, Math.sin(b2 - .02)*r*m, Math.cos(b2)*r*.88, Math.sin(b2)*r*.88); g.closePath();
    }
    g.fill();
    for (let i = 0; i < 6; i++){ const s = (t*.8 + i/6) % 1, a = i*1.7 + t*.3, d = r*(1 + .14*s); g.fillStyle = 'rgba(255,240,180,' + (.9*(1 - s)).toFixed(3) + ')'; g.fillRect(Math.cos(a)*d - r*.016, Math.sin(a)*d - r*.016, r*.032, r*.032); }
  } else if (B.anim === 'raio'){                            // os raios estalando em volta (mudam 14 vezes por segundo)
    const rnd = estRnd(1 + (Math.floor(t*14) % 997)*7919);
    for (let j = 0; j < 3; j++){
      const a0 = rnd()*SK76_TAU, sp = .5 + rnd()*.6, ns = 7;
      g.beginPath();
      for (let s = 0; s <= ns; s++){ const a = a0 + sp*s/ns, d = r*(.96 + (rnd() - .5)*.14); s ? g.lineTo(Math.cos(a)*d, Math.sin(a)*d) : g.moveTo(Math.cos(a)*d, Math.sin(a)*d); }
      g.strokeStyle = 'rgba(' + rgb + ',.5)'; g.lineWidth = r*.08; g.stroke();
      g.strokeStyle = 'rgba(235,250,255,.95)'; g.lineWidth = r*.022; g.stroke();
    }
    g.beginPath(); g.arc(0, 0, r*.97, 0, SK76_TAU); g.strokeStyle = 'rgba(' + rgb + ',' + (.12 + .1*Math.abs(Math.sin(t*17))).toFixed(3) + ')'; g.lineWidth = r*.07; g.stroke();
  } else if (B.anim === 'brilho'){                          // a luz correndo em volta e as estrelinhas piscando
    const a = t*1.8;
    g.beginPath(); g.arc(0, 0, r*.95, a, a + .8); g.strokeStyle = 'rgba(' + rgb + ',.55)'; g.lineWidth = r*.09; g.stroke();
    g.beginPath(); g.arc(0, 0, r*.95, a + .25, a + .65); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = r*.03; g.stroke();
    for (let i = 0; i < 6; i++){ const b = i*SK76_TAU/6 + .4, s = Math.pow(Math.max(0, Math.sin(t*2.6 + i*2.1)), 5); sk76Brilho(g, Math.cos(b)*r*.97, Math.sin(b)*r*.97, r*.17, s); }
  } else if (B.anim === 'pulso'){                           // o neon respirando e o ponto de luz dando a volta
    const p = .5 + .5*Math.sin(t*3.2);
    g.beginPath(); g.arc(0, 0, r*.97, 0, SK76_TAU); g.strokeStyle = 'rgba(' + rgb + ',' + (.16 + .34*p).toFixed(3) + ')'; g.lineWidth = r*.08; g.stroke();
    g.beginPath(); g.arc(0, 0, r*1.03, 0, SK76_TAU); g.strokeStyle = 'rgba(' + rgb + ',' + (.14*p).toFixed(3) + ')'; g.lineWidth = r*.06; g.stroke();
    const b = t*2.2; sk76Luz(g, Math.cos(b)*r*.97, Math.sin(b)*r*.97, r*.22, rgb, .8); sk76Brilho(g, Math.cos(b)*r*.97, Math.sin(b)*r*.97, r*.09, 1);
  }
  g.restore();
}

/* ---------------------------------------------------------------- 4) a tampinha com cara: o desenho parado e o que mexe */
function sk76Verniz(g, rt){                                 // o esmalte por cima da cara (mais leve que o da tampinha lisa) e a beira escurecendo
  const gr = g.createLinearGradient(-rt*.7, -rt*.8, rt*.7, rt*.8);
  gr.addColorStop(0, 'rgba(255,255,255,.13)'); gr.addColorStop(.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.16)');
  g.fillStyle = gr; g.fillRect(-rt, -rt, 2*rt, 2*rt);
  const b = g.createRadialGradient(-rt*.38, -rt*.46, 0, -rt*.38, -rt*.46, rt*.85);
  b.addColorStop(0, 'rgba(255,255,255,.2)'); b.addColorStop(.4, 'rgba(255,255,255,.05)'); b.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = b; g.fillRect(-rt, -rt, 2*rt, 2*rt);
  const e = g.createRadialGradient(0, 0, rt*.78, 0, 0, rt); e.addColorStop(0, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = e; g.fillRect(-rt, -rt, 2*rt, 2*rt);
}
function sk76Cara(g, x, y, r, D, cara, t, esc){             // o miolo (recortado no círculo) com a cara no tempo t e o verniz
  const rt = r*.74;
  g.save(); g.beginPath(); g.arc(x, y, rt, 0, SK76_TAU); g.clip(); g.translate(x, y);
  try { cara.pinta(g, rt, t, rt*(esc || tpEscalaDe(g))); } catch (e) { sk76Erro(e); }
  sk76Verniz(g, rt);
  g.restore();
}
function sk76Desenha(g, x, y, r, D, t, esc){                // a tampinha inteira desenhada agora (o editor, os cartões e o desenho parado)
  const A = sk76Anim(D);
  if (!A || !A.cara){ tpTampaAntes76(g, x, y, r, D, tpSemente(tpCodigo(D))); }
  else { tpSaia(g, x, y, r, D); tpCirc(g, x, y, r*.775, '#07060a'); sk76Cara(g, x, y, r, D, A.cara, t == null ? A.cara.t0 : t, esc); }
  if (A && A.aro && t != null) sk76Aro(g, x, y, r, D, t);
}
const tpTampaAntes76 = tpTampa;
tpTampa = function(g, x, y, r, D, semente){                 // o desenho parado (as imagens prontas, as miniaturas): a cara no quadro t0
  const A = sk76Anim(D);
  if (!A || !A.cara) return tpTampaAntes76.apply(this, arguments);
  sk76Desenha(g, x, y, r, D, null);
};
const tpPintaIconeAntes76 = tpPintaIcone;
tpPintaIcone = function(g, cx, cy, rt, D){                  // a cara num escudo de clube: o medalhão redondo, no lugar do ícone
  const c = SK76_CARA.get(D.i); if (!c) return tpPintaIconeAntes76.apply(this, arguments);
  const q = D.ip || [50, 50, 50, 0], f = Math.pow(2, (q[2] - 50)/40), rr = rt*.62*f, ox = (q[0] - 50)/50*rt*.8, oy = (q[1] - 50)/50*rt*.8;
  g.save(); g.beginPath(); g.arc(cx + ox, cy + oy, rr, 0, SK76_TAU); g.clip(); g.translate(cx + ox, cy + oy);
  try { c.pinta(g, rr, c.t0, rr*tpEscalaDe(g)); } catch (e) { sk76Erro(e); }
  g.restore();
  g.beginPath(); g.arc(cx + ox, cy + oy, rr, 0, SK76_TAU); g.lineWidth = rt*.05; g.strokeStyle = 'rgba(14,8,26,.92)'; g.stroke();
};
function sk76Vivo(g){                                       // esta tela mexe? (a partida, o lobby, o perfil e o editor; nunca com Reduzir animações ou no Ultra leve)
  if (!g || !g.canvas || CONTA.menosAnim || G().plano) return false;
  const c = g.canvas;
  return c === cv || c === LB.brilho || (typeof PF !== 'undefined' && c === PF.palco) || !!(ED.el && c === ED.el.cv);
}
const SK76_BASE = new Map();
function sk76Base(D, cod, rpx){                             // a parte parada da tampinha com cara: os dentes, a luz do aro e o fundo do miolo
  const k = cod + '|' + rpx; let c = SK76_BASE.get(k); if (c) return c;
  if (SK76_BASE.size > 120) SK76_BASE.clear();
  const lado = Math.ceil(2*(rpx*1.16 + 3)); c = document.createElement('canvas'); c.width = c.height = lado;
  const g = c.getContext('2d'); tpSaia(g, lado/2, lado/2, rpx, D); tpCirc(g, lado/2, lado/2, rpx*.775, '#07060a');
  SK76_BASE.set(k, c); return c;
}
const tpPoeAntes76 = tpPoe;
tpPoe = function(g, x, y, r, D, cod, esc){                  // na tela que se mexe: a cara e o aro desenhados a cada quadro
  const A = sk76Anim(D);
  if (!A || !sk76Vivo(g)) return tpPoeAntes76.apply(this, arguments);
  const t = performance.now()/1000;
  if (A.cara){
    const rpx = tamPronto(r*esc), base = sk76Base(D, cod, rpx), m = base.width/2*r/rpx;
    g.drawImage(base, x - m, y - m, 2*m, 2*m);
    sk76Cara(g, x, y, r, D, A.cara, t, esc);
  } else tpPoeAntes76.apply(this, arguments);
  if (A.aro) try { sk76Aro(g, x, y, r, D, t); } catch (e) { sk76Erro(e); }
};

/* ---------------------------------------------------------------- 5) os bots não pegam as animadas (ficam para quem joga) */
const SK76_BOT = new Map();
const tpDoBotAntes76 = tpDoBot;
tpDoBot = function(semente){
  const c = tpDoBotAntes76(semente); let s = SK76_BOT.get(c); if (s) return s;
  s = c; const D = tpLe(c);
  if (D && sk76Anim(D)){ if (SK76_CARA.has(D.i)){ D.i = '--'; D.ie = 0; } const B = TP_MAPA.b.get(D.b); if (B && B.anim) D.b = 'dt'; s = tpCodigo(D); }
  if (SK76_BOT.size > 300) SK76_BOT.clear();
  SK76_BOT.set(c, s); return s;
};

/* ---------------------------------------------------------------- 6) a coleção: os 8 modelos prontos da folha */
const sk76D = (i, b, bc) => tpNorm(Object.assign(TP_PADRAO_D(), {b, bc, p:'li', pc:['#0b0a10', '#ffffff', '#1d1d1d'], pp:[50, 50, 50, 0], i, ic:['#ffffff', '#1d1d1d'], ip:[50, 50, 50, 0], ie:0, t:''}));
const SK76_PRE = [
  {nome:'Cria', d:sk76D('zc', 'vf', ['#f39a1c', '#ffd23f'])},
  {nome:'Cristo', d:sk76D('zr', 've', ['#2f74d8', '#8fe0ff'])},
  {nome:'Brasil', d:sk76D('zb', 'vb', ['#1f9a4a', '#ffd23f'])},
  {nome:'Pitbull', d:sk76D('zp', 'vp', ['#b5121b', '#ff3b3b'])},
  {nome:'Deboche', d:sk76D('zd', 'vp', ['#7b2ff0', '#d36bff'])},
  {nome:'Fé', d:sk76D('zf', 'vf', ['#d9a51c', '#ffe08a'])},
  {nome:'Dragão', d:sk76D('zg', 'vf', ['#c81e14', '#ff8a1c'])},
  {nome:'Galáxia', d:sk76D('zx', 'vb', ['#6a2bd6', '#3b7bff'])}
];
SK76_PRE.forEach(x => { x.cod = tpCodigo(x.d); x.anim = SK76_CARA.get(x.d.i).anim; });

/* ---------------------------------------------------------------- 7) o editor: a coleção no PRÉ-PROJETADO, o selo na faixa e tudo mexendo */
const tpeNomeDeAntes76 = tpeNomeDe;
tpeNomeDe = function(D){ const cod = tpCodigo(D), x = SK76_PRE.find(p => p.cod === cod); return x ? x.nome : tpeNomeDeAntes76.apply(this, arguments); };
const tpePreProjetadosAntes76 = tpePreProjetados;
tpePreProjetados = function(c){
  const r = tpePreProjetadosAntes76.apply(this, arguments);
  if (ED.modo === 'E') return r;
  try {
    const grade = c.querySelector('.tpe-cards'), nota = c.querySelector('.tpe-nota-topo'); if (!grade) return r;
    const primeiro = grade.firstChild;
    for (const x of SK76_PRE){                               // (as miniaturas na hora: a fila aos poucos do editor é a dos outros cartões)
      const selo = nodo('span', 'sk76-selo', 'ANIMADA');
      const b = tpeCartao(x.d, x.nome, selo, null); b.classList.add('sk76-card'); b.sk76D = x.d;
      b.setAttribute('aria-label', x.nome + ': tampinha animada (' + x.anim.toLowerCase() + ')');
      b.title = x.nome + ' · ' + x.anim;
      grade.insertBefore(b, primeiro);
    }
    tpeMarcaGrade();
    if (nota) nota.textContent = 'COLEÇÃO MISTURA DE TODAS: as ' + SK76_PRE.length + ' primeiras são animadas (mexem na partida, no lobby e aqui). ' + nota.textContent;
  } catch (e) { sk76Erro(e); }
  return r;
};
const tpeFaixaAntes76 = tpeFaixa;
tpeFaixa = function(){                                       // o selo ANIMADA nas caras e bordas novas da faixa
  const r = tpeFaixaAntes76.apply(this, arguments);
  try { for (const b of ED.el.faixa.children){ const id = b.dataset.id, anim = ED.aba === 'i' ? SK76_CARA.has(id) : ED.aba === 'b' && ED.modo === 'T' ? !!(TP_MAPA.b.get(id) || {}).anim : false; b.classList.toggle('sk76-anim', anim); } } catch (_) {}
  return r;
};
const tpeSincronizaAntes76 = tpeSincroniza;
tpeSincroniza = function(){                                  // com uma cara animada, a posição, o tamanho e o estilo não valem: a cara ocupa a tampinha
  const r = tpeSincronizaAntes76.apply(this, arguments);
  try {
    const E = ED.el, D = ED.D; if (!E || ED.aba !== 'i' || ED.modo !== 'T' || !D) return r;
    const c = SK76_CARA.get(D.i);
    E.ctl.classList.toggle('sk76-cara', !!c);
    if (c){
      E.geo.hidden = true; if (E.estSeg) E.estSeg.parentNode.hidden = true;
      E.semGeo.hidden = false; E.semGeo.textContent = 'A cara animada ocupa a tampinha inteira (' + c.anim.toLowerCase() + '): o padrão fica por baixo dela.';
      E.notaCor.hidden = false; E.notaCor.textContent = 'A cara ' + c.nome + ' tem as cores dela. A borda acesa combina: veja em BORDA.';
    }
  } catch (_) {}
  return r;
};
function sk76PintaEditor(t){                                // a tampinha grande do editor mexendo (o mesmo desenho do tpePinta, com o tempo)
  const E = ED.el; if (!E || !ED.D || !sk76Anim(ED.D)) return;
  const cv2 = E.cv, rc = cv2.getBoundingClientRect(); if (rc.width < 4) return;
  const k = Math.min(3, dprL()), W = Math.round(rc.width*k), H = Math.round(rc.height*k);
  if (cv2.width !== W || cv2.height !== H){ cv2.width = W; cv2.height = H; }
  const g = cv2.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  const s = Math.min(W, H), x = W/2, y = H/2 - s*.02, R = s*.42;
  g.save(); g.translate(x, y + R*1.02); g.scale(1, .2); const gr = g.createRadialGradient(0, 0, R*.2, 0, 0, R*1.1);
  gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R*1.1, 0, SK76_TAU); g.fill(); g.restore();
  sk76Desenha(g, x, y, R, ED.D, t, 1);
}
function sk76PintaCartoes(t){                               // os cartões da coleção mexendo (uns 20 quadros por segundo)
  const E = ED.el; if (!E || ED.aba !== 'pre' || t - SK76.ultimoCards < .05) return;
  SK76.ultimoCards = t;
  for (const b of E.ctl.querySelectorAll('.sk76-card')){
    const c = b.querySelector('.tpe-mini-cv canvas'); if (!c || !b.sk76D) continue;
    const rc = c.getBoundingClientRect(); if (rc.width < 4 || rc.bottom < 0 || rc.top > innerHeight || rc.right < 0 || rc.left > innerWidth) continue;
    const g = c.getContext('2d'), px = c.width; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, px, px);
    sk76Desenha(g, px/2, px/2, px*.46, b.sk76D, t + (b.sk76D.i.charCodeAt(1) % 7)*.37, 1);
  }
}
const pintaPreviewAntes76 = pintaPreview;
pintaPreview = function(t){                                  // (o lobby chama a cada quadro com a tela SKINS aberta, menos com as animações paradas)
  const r = pintaPreviewAntes76.apply(this, arguments);
  if (t && lobby.tela === 'skins' && !CONTA.menosAnim && !G().plano) try { sk76PintaEditor(t); sk76PintaCartoes(t); } catch (e) { sk76Erro(e); }
  return r;
};

/* ---------------------------------------------------------------- 8) o estilo (o selo ANIMADA nos cartões e na faixa) */
(function(){
  const st = document.createElement('style'); st.id = 'sk76-css';
  st.textContent = '#lb .sk76-selo{ position:absolute; top:5px; left:5px; z-index:2; padding:3px 7px; border-radius:8px; background:#ffd23f; color:#1a1300; font:800 15px/1 system-ui, sans-serif; letter-spacing:.3px; border:2px solid #0f1112; pointer-events:none; }'
    + '#lb .sk76-card{ border-color:rgba(255,210,63,.55) !important; }'
    + '#lb .tpe-item.sk76-anim::after{ content:"ANIMADA"; position:absolute; top:2px; left:50%; transform:translateX(-50%); padding:2px 6px; border-radius:7px; background:#ffd23f; color:#1a1300; font:800 15px/1 system-ui, sans-serif; letter-spacing:.3px; border:2px solid #0f1112; pointer-events:none; }';
  document.head.appendChild(st);
})();
