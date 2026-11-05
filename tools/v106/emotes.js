/* ======================================================================================================================
   RACHA v106 · OS EMOJIS DA PARTIDA (as reações rápidas num balão em cima da tampinha)
   O pedido (05/11/2026): "crie emojis e um balão para emoji na partida" (com a foto da aba Emoji de outro jogo: as carinhas
   laranja dentro de um balão de fala branco e, do lado, a cruz com os 5 lugares). De lá vem só a ideia; os desenhos são daqui.
   Não confundir com os EMOJIS DA TAMPINHA da v95 (tools/v95/emoji.js: as imagens compradas na loja que vão NO MEIO da
   tampinha): estes são as REAÇÕES da partida — a categoria EMOTES do COFRE ("Os emotes estão chegando").
     1) OS EMOJIS: 20 carinhas desenhadas aqui mesmo, no canvas (nítidas em qualquer tamanho, sem imagem de fora), redondas e
        amarelo-alaranjadas, cada uma dentro do contorno branco de um balão de fala com a pontinha. Todas de graça (sem compra,
        sem catálogo e sem a plataforma). As carinhas ficam prontas numa imagem por tamanho (o celular só cola a imagem: nada
        é redesenhado a cada quadro).
     2) A CRUZ DOS 5: cima, esquerda, meio, direita e baixo — os emojis rápidos da partida. Começa com VALEU, RINDO,
        COMEMORANDO, BRAVO e CHORANDO; guardada em racha-emotes-v106 (que vai na cópia do progresso da conta: tools/v82).
     3) NA PARTIDA (o treino, contra os bots e o online): o botão do emoji do lado do placar (junto do das falas e do dos
        jogadores, no lugar livre); tocar abre a cruz (os 5, com alvos grandes; fecha tocando fora); escolher mostra o balão
        branco em cima da SUA tampinha (a pontinha apontando para ela), com um "pop", por 2,5 s; ele acompanha a tampinha e é
        do tamanho da tampinha na câmera (com o zoom). Um emoji a cada 1,5 s (e no máximo 3 em 6 s): o botão mostra a espera.
        No computador: E abre a cruz e 1 a 5 escolhem (cima, esquerda, meio, direita, baixo) — só se o E não for de uma ação
        nos Ajustes › Controles › Teclado. No controle: o SELECT abre, o direcional manda o do lado e o SELECT de novo, o do
        meio (só se o SELECT não for de uma ação da partida).
     4) ONLINE: emote {e} para o servidor (server/emotes106.js confere o emoji e o ritmo) e todos da sala veem o seu balão;
        você vê o deles. O jogo de antes ignora a mensagem nova (cai no fim do net49Message, que não faz nada com ela).
     5) Ajustes › Visual: "Emojis dos outros na partida" (ligado): desligado, só o seu balão aparece (o dos bots também some).
     6) Os bots (só contra os bots, neste aparelho): depois de um gol, às vezes (1 em 4), um bot do time que marcou comemora
        (COMEMORANDO ou RINDO) e um do outro time lamenta (TRISTE ou BRAVO) — no 1x1 é só o bot: comemora o gol dele e
        lamenta o seu.
   A API para o COFRE (window.RachaEmotes106): lista, desenha, slots, poeSlot, padrao e mudou. Nada aqui mexe na física, na
   bola, nos comandos nem no bloco PHYS: só desenho, a tela e uma mensagem a mais na rede.
   ====================================================================================================================== */

/* ---------------------------------------------------------------- 1) os emojis: a lista e o desenho */
// (o id vai na rede e no armazenamento: só letras minúsculas e _; a ordem é a da grade do COFRE)
const EMO106_LISTA = [
  {id:'rindo', nome:'RINDO'}, {id:'chorando_rir', nome:'CHORANDO DE RIR'}, {id:'comemorando', nome:'COMEMORANDO'}, {id:'valeu', nome:'VALEU'},
  {id:'na_moral', nome:'NA MORAL'}, {id:'piscada', nome:'PISCADA'}, {id:'zoando', nome:'ZOANDO'}, {id:'confiante', nome:'CONFIANTE'},
  {id:'apaixonado', nome:'APAIXONADO'}, {id:'surpreso', nome:'SURPRESO'}, {id:'pensando', nome:'PENSANDO'}, {id:'desconfiado', nome:'DESCONFIADO'},
  {id:'aff', nome:'AFF'}, {id:'nervoso', nome:'NERVOSO'}, {id:'assustado', nome:'ASSUSTADO'}, {id:'sono', nome:'SONO'},
  {id:'triste', nome:'TRISTE'}, {id:'chorando', nome:'CHORANDO'}, {id:'bravo', nome:'BRAVO'}, {id:'furioso', nome:'FURIOSO'}
];
const EMO106_IDS = new Set(EMO106_LISTA.map(e => e.id));
const EMO106_TAU = Math.PI*2;
// as cores (a pele laranja, o contorno marrom e os traços; o balão branco de contorno escuro, o mesmo azul-noite do jogo)
const EMO106_COR = {
  pele:['#ffe68c', '#ffb72e', '#f37a14'], peleBrava:['#ffd27c', '#ff8f35', '#e5521a'], peleFuria:['#ffb38a', '#ff6136', '#d0231a'],
  contorno:'#5b2806', tinta:'#3b1704', boca:'#7d1d10', bocaFundo:'#4e0c07', lingua:'#ff6f72', linguaRisco:'#d4434b',
  dente:'#ffffff', olho:'#ffffff', pupila:'#2a1103', rubor:'rgba(255,84,60,.36)',
  lagrima:'#5fc8ff', lagrimaC:'#1b6fc0', suor:'#9ddcff', suorC:'#2b80cc', coracao:'#ff3558', coracaoC:'#8e0c23',
  balao:'#ffffff', balaoC:'#22163a'
};
const EMO106_FACE = .8;              // o raio da carinha, em raios do balão (o resto é o branco do balão em volta)
const EMO106_BORDA = .07;            // o contorno escuro do balão, em raios do balão (nunca mais fino que 1,2 px)

// (os traços: tudo em "raios da carinha" — o meio da carinha no 0, 0 e o raio 1; u = 1 px nessa medida, para nenhum traço
//  ficar mais fino que ~1 px nas carinhas pequenas)
const emo106Lw = (g, v, u) => { g.lineWidth = Math.max(v, 1.05*u); };
function emo106Traco(g, u, w, cor){ emo106Lw(g, w, u); g.strokeStyle = cor || EMO106_COR.tinta; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
function emo106Pele(g, u, tom){                              // a carinha: o degradê laranja, o contorno e o brilho de cima
  const c = tom === 'furia' ? EMO106_COR.peleFuria : tom === 'brava' ? EMO106_COR.peleBrava : EMO106_COR.pele;
  const gr = g.createRadialGradient(-.3, -.42, .04, -.12, -.12, 1.3);
  gr.addColorStop(0, c[0]); gr.addColorStop(.48, c[1]); gr.addColorStop(1, c[2]);
  g.beginPath(); g.arc(0, 0, 1, 0, EMO106_TAU); g.fillStyle = gr; g.fill();
  if (tom === 'medo'){                                       // (o medo: o azul que desce da testa)
    g.save(); g.beginPath(); g.arc(0, 0, 1, 0, EMO106_TAU); g.clip();
    const az = g.createLinearGradient(0, -1, 0, -.02); az.addColorStop(0, 'rgba(84,142,255,1)'); az.addColorStop(.6, 'rgba(118,172,255,.92)'); az.addColorStop(1, 'rgba(150,195,255,0)');
    g.fillStyle = az; g.fillRect(-1, -1, 2, 1); g.restore();
  }
  g.beginPath(); g.arc(0, 0, 1 - Math.max(.04, .5*u), 0, EMO106_TAU); emo106Traco(g, u, .085, tom === 'furia' ? '#5a0e06' : EMO106_COR.contorno);
  g.save(); g.translate(-.4, -.56); g.rotate(-.55); g.beginPath(); g.ellipse(0, 0, .3, .14, 0, 0, EMO106_TAU);
  g.fillStyle = 'rgba(255,255,255,.42)'; g.fill(); g.restore();
}
function emo106Rubor(g, x, y){ g.beginPath(); g.ellipse(x, y, .17, .1, 0, 0, EMO106_TAU); g.fillStyle = EMO106_COR.rubor; g.fill(); }
// o olho aberto: o branco, o contorno, a pupila (dx, dy: para onde olha) e o brilho; corte = a pálpebra (a reta de cima, de
// (x0, y0) a (x1, y1) em volta do olho: o que fica acima dela não aparece) · baixo = a pálpebra de baixo (a mesma conta)
function emo106Olho(g, u, x, y, rx, ry, dx, dy, pr, corte, baixo){
  const ladoY = (L, xx) => L[1] + (L[3] - L[1])*(xx - L[0])/(L[2] - L[0]);
  g.save();
  if (corte || baixo){                                       // (só o que fica entre as pálpebras)
    const xa = x - rx - .2, xb = x + rx + .2;
    g.beginPath();
    g.moveTo(xa, corte ? ladoY(corte, xa) : y - ry - .5); g.lineTo(xb, corte ? ladoY(corte, xb) : y - ry - .5);
    g.lineTo(xb, baixo ? ladoY(baixo, xb) : y + ry + .5); g.lineTo(xa, baixo ? ladoY(baixo, xa) : y + ry + .5); g.closePath(); g.clip();
  }
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, EMO106_TAU); g.fillStyle = EMO106_COR.olho; g.fill();
  g.save(); g.clip();
  const px = x + dx, py = y + dy;
  g.beginPath(); g.arc(px, py, pr, 0, EMO106_TAU); g.fillStyle = EMO106_COR.pupila; g.fill();
  g.beginPath(); g.arc(px - pr*.34, py - pr*.38, pr*.36, 0, EMO106_TAU); g.fillStyle = 'rgba(255,255,255,.9)'; g.fill();
  g.restore();
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, EMO106_TAU); emo106Traco(g, u, .065);
  g.restore();
  for (const L of [corte, baixo]) if (L){                     // (a pálpebra: a corda da reta dentro do olho)
    const m = (L[3] - L[1])/(L[2] - L[0]), b = L[1] + m*(x - L[0]) - y;
    const A = 1/(rx*rx) + m*m/(ry*ry), Bq = 2*b*m/(ry*ry), Cq = b*b/(ry*ry) - 1, disc = Bq*Bq - 4*A*Cq;
    if (disc <= 0) continue;
    const d0 = (-Bq - Math.sqrt(disc))/(2*A), d1 = (-Bq + Math.sqrt(disc))/(2*A);
    g.beginPath(); g.moveTo(x + d0, y + b + m*d0); g.lineTo(x + d1, y + b + m*d1); emo106Traco(g, u, .085);
  }
}
function emo106Arco(g, u, x0, y0, cx, cy, x1, y1, w, cor){ g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); emo106Traco(g, u, w, cor); }
function emo106Feliz(g, u, x, y, w){ emo106Arco(g, u, x - w, y + .06, x, y - .2, x + w, y + .06, .12); }          // ^ (o olho fechado de alegria)
function emo106Fechado(g, u, x, y, w){ emo106Arco(g, u, x - w, y - .04, x, y + .14, x + w, y - .04, .1); }        // ◡ (o olho fechado relaxado)
function emo106Aperta(g, u, x, y, lado){                     // > ou < (o olho bem apertado; lado 1: a ponta para a direita)
  g.beginPath(); g.moveTo(x - lado*.13, y - .13); g.lineTo(x + lado*.13, y); g.lineTo(x - lado*.13, y + .13); emo106Traco(g, u, .115);
}
// a boca aberta (o caminho já montado em g): o fundo escuro, os dentes em cima, a língua embaixo e o contorno
function emo106BocaAberta(g, u, caminho, o){
  o = o || {};
  g.save(); caminho(); g.clip();
  const gr = g.createLinearGradient(0, o.y0 != null ? o.y0 : .1, 0, o.y1 != null ? o.y1 : .8); gr.addColorStop(0, EMO106_COR.boca); gr.addColorStop(1, EMO106_COR.bocaFundo);
  g.fillStyle = gr; g.fillRect(-1.2, -1.2, 2.4, 2.4);
  if (o.dentes) { g.fillStyle = EMO106_COR.dente; g.fillRect(-1.2, o.dentes[0] - 1, 2.4, 1 + o.dentes[1]); }
  if (o.lingua){ const L = o.lingua; g.beginPath(); g.ellipse(L[0], L[1], L[2], L[3], 0, 0, EMO106_TAU); g.fillStyle = EMO106_COR.lingua; g.fill(); }
  g.restore();
  caminho(); emo106Traco(g, u, .085);
}
function emo106Gota(g, u, x, y, s, cor, corC, ang){         // a gota (de suor ou de lágrima): a ponta para cima (ang gira)
  g.save(); g.translate(x, y); if (ang) g.rotate(ang);
  g.beginPath(); g.moveTo(0, -s*1.25); g.bezierCurveTo(s*.55, -s*.5, s*.95, -s*.05, s*.95, s*.32);
  g.arc(0, s*.32, s*.95, 0, Math.PI); g.bezierCurveTo(-s*.95, -s*.05, -s*.55, -s*.5, 0, -s*1.25); g.closePath();
  g.fillStyle = cor; g.fill(); emo106Traco(g, u, .055, corC);
  g.beginPath(); g.ellipse(-s*.32, s*.18, s*.2, s*.32, -.3, 0, EMO106_TAU); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill();
  g.restore();
}
function emo106Coracao(g, u, x, y, s, ang){                  // o coração (s: a meia largura)
  g.save(); g.translate(x, y); if (ang) g.rotate(ang);
  g.beginPath(); g.moveTo(0, s*1.05);
  g.bezierCurveTo(-s*.35, s*.72, -s*1.12, s*.25, -s*1.02, -s*.32);
  g.bezierCurveTo(-s*.94, -s*.86, -s*.25, -s*1.02, 0, -s*.5);
  g.bezierCurveTo(s*.25, -s*1.02, s*.94, -s*.86, s*1.02, -s*.32);
  g.bezierCurveTo(s*1.12, s*.25, s*.35, s*.72, 0, s*1.05); g.closePath();
  const gr = g.createLinearGradient(0, -s, 0, s); gr.addColorStop(0, '#ff6b84'); gr.addColorStop(1, EMO106_COR.coracao);
  g.fillStyle = gr; g.fill(); emo106Traco(g, u, .06, EMO106_COR.coracaoC);
  g.beginPath(); g.ellipse(-s*.48, -s*.42, s*.2, s*.12, -.6, 0, EMO106_TAU); g.fillStyle = 'rgba(255,255,255,.8)'; g.fill();
  g.restore();
}
function emo106Mao(g, u, caminho){                            // a mão (o joia, o queixo): mais clara que a carinha, para destacar
  caminho();
  const gr = g.createLinearGradient(0, -.4, 0, .5); gr.addColorStop(0, '#fff0b0'); gr.addColorStop(1, '#ffc23c');
  g.fillStyle = gr; g.fill(); emo106Traco(g, u, .075, EMO106_COR.contorno);
}
function emo106Dedos(g, u, x0, x1, y0, n, h){                // os dedos dobrados do punho (n gomos, um embaixo do outro)
  for (let i = 0; i < n; i++) emo106Mao(g, u, () => emo106Rr(g, x0, y0 + i*h, x1 - x0, h, h*.5));
}
function emo106Rr(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// cada carinha: (g, u) com o (0, 0) no meio dela e o raio 1 (até ~1,15 ainda é o branco do balão: o que passa disso é cortado)
const EMO106_DESENHO = {
  rindo(g, u){                                                  // os olhos fechados de alegria e a boca enorme, com os dentes e a língua
    emo106Pele(g, u);
    emo106Rubor(g, -.62, .16); emo106Rubor(g, .62, .16);
    emo106Feliz(g, u, -.35, -.2, .21); emo106Feliz(g, u, .35, -.2, .21);
    emo106BocaAberta(g, u, () => { g.beginPath(); g.moveTo(-.6, .1); g.quadraticCurveTo(0, .2, .6, .1); g.bezierCurveTo(.56, .56, .3, .8, 0, .8); g.bezierCurveTo(-.3, .8, -.56, .56, -.6, .1); g.closePath(); },
      {dentes:[.1, .24], lingua:[0, .8, .32, .2]});
  },
  chorando_rir(g, u){                                           // torta de tanto rir: os olhos apertados e as lágrimas espirrando para os lados
    emo106Pele(g, u);
    g.save(); g.rotate(-.24);
    for (const s of [-1, 1]){                                   // (as lágrimas: um jato que sai do canto do olho e cai)
      g.beginPath(); g.moveTo(s*.5, -.16); g.quadraticCurveTo(s*.9, -.36, s*1.0, .02);
      emo106Lw(g, .2, u); g.strokeStyle = EMO106_COR.lagrimaC; g.lineCap = 'round'; g.stroke();
      emo106Lw(g, .13, u); g.strokeStyle = EMO106_COR.lagrima; g.stroke();
      emo106Gota(g, u, s*1.0, .1, .1, EMO106_COR.lagrima, EMO106_COR.lagrimaC, s*-.5);
    }
    emo106Aperta(g, u, -.34, -.2, 1); emo106Aperta(g, u, .34, -.2, -1);
    emo106BocaAberta(g, u, () => { g.beginPath(); g.moveTo(-.62, .1); g.quadraticCurveTo(0, .2, .62, .1); g.bezierCurveTo(.58, .58, .3, .82, 0, .82); g.bezierCurveTo(-.3, .82, -.58, .58, -.62, .1); g.closePath(); },
      {dentes:[.1, .24], lingua:[0, .82, .34, .21]});
    g.restore();
  },
  comemorando(g, u){                                            // o chapéu de festa, os papeizinhos e o sorrisão
    emo106Pele(g, u);
    const conf = [[-.96, -.28, '#3fa7ff', .5], [-.84, .5, '#7be04a', -.3], [-.5, -.94, '#ff4f8b', .9], [.98, .16, '#ffd23f', -.6], [.78, .7, '#a066ff', .3], [.36, .98, '#ff4f8b', 1.1], [-.4, .98, '#3fa7ff', -.8]];
    for (const [x, y, c, a] of conf){ g.save(); g.translate(x, y); g.rotate(a); emo106Rr(g, -.075, -.04, .15, .08, .02); g.fillStyle = c; g.fill(); g.restore(); }
    emo106Rubor(g, -.62, .18); emo106Rubor(g, .62, .18);
    emo106Feliz(g, u, -.34, -.12, .19); emo106Feliz(g, u, .34, -.12, .19);
    emo106BocaAberta(g, u, () => { g.beginPath(); g.moveTo(-.5, .2); g.quadraticCurveTo(0, .3, .5, .2); g.quadraticCurveTo(.4, .72, 0, .72); g.quadraticCurveTo(-.4, .72, -.5, .2); g.closePath(); },
      {lingua:[0, .74, .26, .16]});
    // o chapéu (por cima da testa, torto): as listras, o contorno e o pompom
    g.save(); g.translate(.2, -.66); g.rotate(.3);
    const chapeu = () => { g.beginPath(); g.moveTo(-.34, .16); g.lineTo(0, -.42); g.lineTo(.34, .16); g.quadraticCurveTo(0, .27, -.34, .16); g.closePath(); };
    chapeu(); g.fillStyle = '#3fa7ff'; g.fill();
    g.save(); chapeu(); g.clip(); g.fillStyle = '#ffd23f'; for (const y of [-.24, -.04, .16]){ g.beginPath(); g.moveTo(-.4, y); g.lineTo(.4, y - .1); g.lineTo(.4, y - .02); g.lineTo(-.4, y + .08); g.closePath(); g.fill(); } g.restore();
    chapeu(); emo106Traco(g, u, .065, EMO106_COR.balaoC);
    g.beginPath(); g.arc(0, -.44, .075, 0, EMO106_TAU); g.fillStyle = '#ff4f8b'; g.fill(); emo106Traco(g, u, .05, EMO106_COR.balaoC);
    g.restore();
  },
  valeu(g, u){                                                  // o sorriso e o joia (o polegar para cima) do lado direito
    emo106Pele(g, u);
    emo106Rubor(g, -.66, .14);
    emo106Arco(g, u, -.66, -.44, -.46, -.56, -.26, -.46, .09); emo106Arco(g, u, -.06, -.46, .14, -.56, .32, -.44, .09);
    emo106Olho(g, u, -.44, -.17, .15, .19, .04, .02, .1); emo106Olho(g, u, .1, -.17, .15, .19, .04, .02, .1);
    emo106Arco(g, u, -.6, .2, -.26, .6, .1, .24, .11);
    g.save(); g.translate(.5, .46); g.rotate(-.1); g.scale(.92, .92);
    emo106Mao(g, u, () => emo106Rr(g, -.27, -.6, .25, .62, .125));   // (o polegar para cima, por trás do punho)
    emo106Mao(g, u, () => emo106Rr(g, -.32, -.14, .44, .52, .16));    // (a palma)
    emo106Dedos(g, u, -.04, .32, -.14, 3, .174);                     // (os dedos dobrados, do lado de fora)
    g.restore();
  },
  na_moral(g, u){                                               // os óculos escuros e o sorriso de canto
    emo106Pele(g, u);
    const lente = s => { g.beginPath(); g.moveTo(s*.06, -.3); g.lineTo(s*.7, -.3); g.quadraticCurveTo(s*.7, .06, s*.38, .08); g.quadraticCurveTo(s*.08, .08, s*.06, -.3); g.closePath(); };
    for (const s of [-1, 1]){
      lente(s); const gr = g.createLinearGradient(0, -.3, 0, .08); gr.addColorStop(0, '#3b3b46'); gr.addColorStop(1, '#0b0b10'); g.fillStyle = gr; g.fill();
      g.save(); lente(s); g.clip(); g.beginPath(); g.moveTo(s*.2, .04); g.lineTo(s*.42, -.3); g.lineTo(s*.52, -.3); g.lineTo(s*.3, .04); g.closePath(); g.fillStyle = 'rgba(255,255,255,.4)'; g.fill(); g.restore();
      lente(s); emo106Traco(g, u, .06, '#0b0b10');
      g.beginPath(); g.moveTo(s*.7, -.28); g.lineTo(s*.93, -.36); emo106Traco(g, u, .08, '#0b0b10');
    }
    g.beginPath(); g.moveTo(-.74, -.31); g.lineTo(.74, -.31); emo106Traco(g, u, .1, '#0b0b10');
    emo106Arco(g, u, -.3, .4, .08, .56, .4, .28, .11);
    emo106Arco(g, u, .33, .23, .42, .31, .45, .2, .08);
  },
  piscada(g, u){                                                // um olho aberto, o outro piscando, e o sorriso de lado
    emo106Pele(g, u);
    emo106Rubor(g, .62, .2);
    emo106Arco(g, u, -.56, -.44, -.36, -.56, -.16, -.46, .09); emo106Arco(g, u, .16, -.36, .36, -.42, .56, -.34, .09);
    emo106Olho(g, u, -.34, -.14, .16, .2, .01, .02, .1);
    emo106Feliz(g, u, .35, -.12, .19);
    emo106Arco(g, u, -.4, .3, .02, .64, .44, .22, .11);
    g.save(); g.translate(.82, -.62); g.beginPath();                      // (o brilho da piscada)
    for (let i = 0; i < 8; i++){ const a = i*Math.PI/4, r = i % 2 ? .05 : .15; g.lineTo(Math.cos(a)*r, Math.sin(a)*r); }
    g.closePath(); g.fillStyle = '#fff7c2'; g.fill(); emo106Traco(g, u, .035, EMO106_COR.contorno); g.restore();
  },
  zoando(g, u){                                                 // a língua para fora e um olho apertado
    emo106Pele(g, u);
    emo106Aperta(g, u, -.36, -.18, 1);
    emo106Arco(g, u, .14, -.5, .36, -.62, .58, -.5, .09);
    emo106Olho(g, u, .34, -.18, .18, .22, -.02, .02, .11);
    emo106BocaAberta(g, u, () => { g.beginPath(); g.moveTo(-.5, .2); g.quadraticCurveTo(0, .32, .5, .2); g.quadraticCurveTo(.38, .58, 0, .6); g.quadraticCurveTo(-.38, .58, -.5, .2); g.closePath(); }, {});
    g.save(); g.translate(.06, .36); g.rotate(-.16);
    const lingua = () => { g.beginPath(); g.moveTo(-.2, 0); g.lineTo(-.2, .34); g.arc(0, .34, .2, Math.PI, 0, true); g.lineTo(.2, 0); g.closePath(); };
    lingua(); const gr = g.createLinearGradient(0, 0, 0, .55); gr.addColorStop(0, '#ff8b8e'); gr.addColorStop(1, EMO106_COR.lingua); g.fillStyle = gr; g.fill();
    g.beginPath(); g.moveTo(0, .1); g.lineTo(0, .36); emo106Traco(g, u, .05, EMO106_COR.linguaRisco);
    lingua(); emo106Traco(g, u, .075);
    g.restore();
  },
  confiante(g, u){                                              // as pálpebras pela metade, a sobrancelha levantada e o sorriso de canto
    emo106Pele(g, u);
    emo106Arco(g, u, -.56, -.36, -.36, -.4, -.14, -.36, .09); emo106Arco(g, u, .14, -.5, .36, -.7, .58, -.52, .09);
    emo106Olho(g, u, -.34, -.12, .17, .19, .07, .04, .1, [-.6, -.13, -.1, -.13]);
    emo106Olho(g, u, .34, -.12, .17, .19, .07, .04, .1, [.1, -.15, .6, -.15]);
    emo106Arco(g, u, -.26, .42, .12, .5, .42, .26, .11);
  },
  apaixonado(g, u){                                             // os olhos de coração, o sorriso aberto e um coração voando
    emo106Pele(g, u);
    emo106Rubor(g, -.62, .2); emo106Rubor(g, .62, .2);
    emo106Coracao(g, u, -.34, -.16, .22, -.12); emo106Coracao(g, u, .34, -.16, .22, .12);
    emo106BocaAberta(g, u, () => { g.beginPath(); g.moveTo(-.44, .24); g.quadraticCurveTo(0, .34, .44, .24); g.quadraticCurveTo(.36, .7, 0, .7); g.quadraticCurveTo(-.36, .7, -.44, .24); g.closePath(); },
      {lingua:[0, .72, .24, .15]});
    emo106Coracao(g, u, .78, -.66, .13, .35);
  },
  surpreso(g, u){                                               // as sobrancelhas lá em cima, os olhos redondos e a boca em O
    emo106Pele(g, u);
    emo106Arco(g, u, -.6, -.5, -.38, -.78, -.14, -.56, .1); emo106Arco(g, u, .14, -.56, .38, -.78, .6, -.5, .1);
    emo106Olho(g, u, -.34, -.14, .2, .22, 0, 0, .085); emo106Olho(g, u, .34, -.14, .2, .22, 0, 0, .085);
    emo106BocaAberta(g, u, () => { g.beginPath(); g.ellipse(0, .46, .17, .22, 0, 0, EMO106_TAU); }, {y0:.24, y1:.68, lingua:[0, .64, .12, .07]});
  },
  pensando(g, u){                                               // olhando para cima, uma sobrancelha levantada e a mão no queixo
    emo106Pele(g, u);
    emo106Arco(g, u, -.58, -.5, -.38, -.72, -.16, -.56, .1); emo106Arco(g, u, .14, -.42, .36, -.44, .58, -.4, .1);
    emo106Olho(g, u, -.34, -.18, .16, .2, .05, -.07, .1); emo106Olho(g, u, .32, -.16, .16, .19, .05, -.07, .1);
    emo106Arco(g, u, .02, .4, .22, .34, .44, .4, .1);
    g.save(); g.translate(-.36, .7); g.rotate(-.18);
    emo106Mao(g, u, () => { g.save(); g.translate(.16, -.04); g.rotate(.5); emo106Rr(g, -.1, -.5, .2, .54, .1); g.restore(); });   // (o indicador subindo até o canto da boca)
    emo106Mao(g, u, () => emo106Rr(g, -.3, -.12, .5, .3, .15));      // (o punho, embaixo do queixo)
    emo106Dedos(g, u, -.3, .02, .02, 2, .15);                       // (os dedos dobrados)
    g.restore();
  },
  desconfiado(g, u){                                            // os olhos apertados olhando de lado e uma sobrancelha lá em cima
    emo106Pele(g, u);
    emo106Arco(g, u, -.58, -.3, -.36, -.32, -.14, -.26, .1); emo106Arco(g, u, .14, -.5, .38, -.74, .6, -.5, .1);
    emo106Olho(g, u, -.34, -.1, .18, .18, .08, 0, .1, [-.6, -.15, -.1, -.13], [-.6, -.02, -.1, -.03]);
    emo106Olho(g, u, .34, -.14, .18, .2, .08, 0, .1, [.1, -.22, .6, -.24], [.1, -.03, .6, -.04]);
    g.beginPath(); g.moveTo(-.16, .44); g.lineTo(.28, .44); g.quadraticCurveTo(.34, .44, .36, .38); emo106Traco(g, u, .1);
  },
  aff(g, u){                                                    // os olhos virados para cima e a boca reta
    emo106Pele(g, u);
    emo106Arco(g, u, -.58, -.46, -.36, -.52, -.14, -.46, .09); emo106Arco(g, u, .14, -.46, .36, -.52, .58, -.46, .09);
    emo106Olho(g, u, -.34, -.14, .18, .21, .05, -.12, .1); emo106Olho(g, u, .34, -.14, .18, .21, .05, -.12, .1);
    g.beginPath(); g.moveTo(-.3, .46); g.quadraticCurveTo(.02, .4, .32, .44); emo106Traco(g, u, .1);
    g.beginPath(); g.moveTo(.32, .44); g.lineTo(.4, .5); emo106Traco(g, u, .08);
  },
  nervoso(g, u){                                                // a boca tremida, os olhos de lado e a gota de suor
    emo106Pele(g, u);
    emo106Arco(g, u, -.58, -.38, -.4, -.52, -.16, -.5, .09); emo106Arco(g, u, .16, -.5, .4, -.52, .58, -.38, .09);
    emo106Olho(g, u, -.34, -.12, .16, .2, -.06, .02, .095); emo106Olho(g, u, .34, -.12, .16, .2, -.06, .02, .095);
    g.beginPath(); g.moveTo(-.4, .44);
    for (let i = 1; i <= 6; i++) g.lineTo(-.4 + i*.135, i % 2 ? .34 : .44);
    emo106Traco(g, u, .085);
    emo106Gota(g, u, .7, -.46, .13, EMO106_COR.suor, EMO106_COR.suorC);
  },
  assustado(g, u){                                              // a testa azul, os olhos arregalados e os dentes trincados
    emo106Pele(g, u, 'medo');
    emo106Arco(g, u, -.6, -.46, -.42, -.64, -.16, -.62, .09); emo106Arco(g, u, .16, -.62, .42, -.64, .6, -.46, .09);
    emo106Olho(g, u, -.34, -.18, .2, .24, 0, .01, .055); emo106Olho(g, u, .34, -.18, .2, .24, 0, .01, .055);
    emo106Rr(g, -.46, .28, .92, .32, .12); g.fillStyle = EMO106_COR.dente; g.fill();
    g.beginPath(); g.moveTo(-.44, .44); g.lineTo(.44, .44); for (const x of [-.22, 0, .22]){ g.moveTo(x, .29); g.lineTo(x, .59); }
    emo106Traco(g, u, .045, '#7a6a66');
    emo106Rr(g, -.46, .28, .92, .32, .12); emo106Traco(g, u, .08);
  },
  sono(g, u){                                                   // os olhos fechados, a boca pequena e os Z subindo
    emo106Pele(g, u);
    emo106Fechado(g, u, -.34, -.1, .2); emo106Fechado(g, u, .34, -.1, .2);
    emo106BocaAberta(g, u, () => { g.beginPath(); g.ellipse(.04, .46, .11, .13, 0, 0, EMO106_TAU); }, {y0:.33, y1:.6});
    for (const [x, y, s] of [[.36, -.58, .1], [.58, -.72, .13], [.86, -.5, .16]]){
      g.beginPath(); g.moveTo(x - s, y - s); g.lineTo(x + s, y - s); g.lineTo(x - s, y + s); g.lineTo(x + s, y + s);
      emo106Traco(g, u, .15, '#ffffff'); emo106Traco(g, u, .075, '#3346b8');
    }
  },
  triste(g, u){                                                 // as sobrancelhas caídas, os olhos olhando para baixo e a boca para baixo
    emo106Pele(g, u);
    emo106Arco(g, u, -.6, -.36, -.4, -.4, -.18, -.54, .1); emo106Arco(g, u, .18, -.54, .4, -.4, .6, -.36, .1);
    emo106Olho(g, u, -.34, -.12, .16, .2, -.01, .07, .1, [-.6, -.06, -.1, -.24]); emo106Olho(g, u, .34, -.12, .16, .2, .01, .07, .1, [.1, -.24, .6, -.06]);
    emo106Arco(g, u, -.3, .54, 0, .3, .3, .54, .11);
  },
  chorando(g, u){                                               // o choro: os olhos fechados, as cachoeiras de lágrima e a boca aberta
    emo106Pele(g, u);
    emo106Arco(g, u, -.6, -.4, -.4, -.44, -.18, -.58, .1); emo106Arco(g, u, .18, -.58, .4, -.44, .6, -.4, .1);
    for (const s of [-1, 1]){                                   // (as duas cachoeiras, do olho até embaixo)
      g.beginPath(); g.moveTo(s*.34, -.08); g.bezierCurveTo(s*.36, .3, s*.5, .6, s*.44, .98);
      emo106Lw(g, .26, u); g.strokeStyle = EMO106_COR.lagrimaC; g.lineCap = 'round'; g.stroke();
      emo106Lw(g, .19, u); g.strokeStyle = EMO106_COR.lagrima; g.stroke();
      emo106Lw(g, .05, u); g.strokeStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(s*.32, .02); g.bezierCurveTo(s*.33, .3, s*.45, .55, s*.4, .8); g.stroke();
    }
    emo106Arco(g, u, -.52, -.1, -.34, -.26, -.16, -.1, .11); emo106Arco(g, u, .16, -.1, .34, -.26, .52, -.1, .11);
    emo106BocaAberta(g, u, () => { g.beginPath(); g.moveTo(-.26, .32); g.quadraticCurveTo(0, .24, .26, .32); g.quadraticCurveTo(.3, .64, 0, .64); g.quadraticCurveTo(-.3, .64, -.26, .32); g.closePath(); },
      {y0:.26, y1:.66, lingua:[0, .64, .17, .1]});
  },
  bravo(g, u){                                                  // as sobrancelhas em V e a boca virada
    emo106Pele(g, u, 'brava');
    emo106Arco(g, u, -.64, -.52, -.4, -.44, -.12, -.3, .14); emo106Arco(g, u, .12, -.3, .4, -.44, .64, -.52, .14);
    emo106Olho(g, u, -.34, -.1, .17, .19, .03, .03, .1, [-.6, -.24, -.1, -.08]); emo106Olho(g, u, .34, -.1, .17, .19, -.03, .03, .1, [.1, -.08, .6, -.24]);
    emo106Arco(g, u, -.32, .54, 0, .26, .32, .54, .12);
  },
  furioso(g, u){                                                // vermelho, os dentes trincados, a veia na testa e a fumaça
    emo106Pele(g, u, 'furia');
    for (const s of [-1, 1]){                                     // (a fumaça saindo da cabeça, dos dois lados de cima)
      const nuvem = () => { g.beginPath(); g.arc(s*.6, -.84, .12, 0, EMO106_TAU); g.moveTo(s*.82 + .08, -.7); g.arc(s*.82, -.7, .085, 0, EMO106_TAU); g.moveTo(s*.44 + .07, -.98); g.arc(s*.44, -.98, .07, 0, EMO106_TAU); };
      nuvem(); emo106Traco(g, u, .09, '#7d8794'); nuvem(); g.fillStyle = '#eef1f5'; g.fill();
    }
    emo106Arco(g, u, -.66, -.58, -.4, -.46, -.1, -.26, .16); emo106Arco(g, u, .1, -.26, .4, -.46, .66, -.58, .16);
    emo106Olho(g, u, -.34, -.08, .16, .16, .03, .03, .08, [-.6, -.2, -.1, -.02]); emo106Olho(g, u, .34, -.08, .16, .16, -.03, .03, .08, [.1, -.02, .6, -.2]);
    emo106Rr(g, -.44, .3, .88, .3, .11); g.fillStyle = EMO106_COR.dente; g.fill();
    g.beginPath(); g.moveTo(-.42, .45); g.lineTo(.42, .45); for (const x of [-.22, 0, .22]){ g.moveTo(x, .31); g.lineTo(x, .59); }
    emo106Traco(g, u, .045, '#7a6a66');
    emo106Rr(g, -.44, .3, .88, .3, .11); emo106Traco(g, u, .08, '#4a0a04');
    g.save(); g.translate(.5, -.66);                              // (a veia saltando na testa)
    for (let i = 0; i < 4; i++){ g.save(); g.rotate(i*Math.PI/2); g.beginPath(); g.moveTo(.045, -.15); g.quadraticCurveTo(.05, -.05, .15, -.045); emo106Traco(g, u, .06, '#b3120a'); g.restore(); }
    g.restore();
  }
};

// o balão: o círculo (de raio R, já com o contorno) e a pontinha até a distância "ponta" do meio, na direção ang (radianos,
// no sentido do canvas: π/2 = para baixo). ang null: sem pontinha.
function emo106BalaoCaminho(g, cx, cy, R, ang, ponta){
  g.beginPath();
  if (ang == null){ g.arc(cx, cy, R, 0, EMO106_TAU); return; }
  const d = .36, a0 = ang + d, a1 = ang - d + EMO106_TAU, tx = cx + Math.cos(ang)*ponta, ty = cy + Math.sin(ang)*ponta;
  g.arc(cx, cy, R, a0, a1);                                     // (a volta toda menos a boca da pontinha)
  const bx = cx + Math.cos(ang - d)*R, by = cy + Math.sin(ang - d)*R, ex = cx + Math.cos(a0)*R, ey = cy + Math.sin(a0)*R;
  const m = (ponta - R)*.25;                                    // (a pontinha um pouco curvada, como a da fala)
  g.quadraticCurveTo(bx + Math.cos(ang)*m, by + Math.sin(ang)*m, tx, ty);
  g.quadraticCurveTo(ex + Math.cos(ang)*m*1.6, ey + Math.sin(ang)*m*1.6, ex, ey);
  g.closePath();
}
function emo106Balao(g, cx, cy, R, ang, ponta, px){            // o branco com o contorno escuro (tudo dentro de R e da pontinha)
  const o = Math.max(EMO106_BORDA*R, 1.2*px);
  emo106BalaoCaminho(g, cx, cy, R - o/2, ang, ponta == null ? null : ponta - o*.7);
  g.fillStyle = EMO106_COR.balao; g.fill();
  g.lineWidth = o; g.lineJoin = 'round'; g.strokeStyle = EMO106_COR.balaoC; g.stroke();
  return o;
}

/* ---------------------------------------------------------------- 2) as imagens prontas (uma por emoji e tamanho) */
// a carinha pronta numa imagem px × px: o balão inteiro cabe nela (raio px/2), só a parte de dentro do contorno é pintada
const EMO106_CACHE = new Map();
const EMO106_CACHE_MAX = 160;
function emo106Pinta(g, id, cx, cy, R, px){                     // a carinha (sem o balão) no raio R do balão
  const D = EMO106_DESENHO[id]; if (!D) return false;
  const o = Math.max(EMO106_BORDA*R, 1.2*px), f = R*EMO106_FACE;
  g.save();
  g.beginPath(); g.arc(cx, cy, R - o*.95, 0, EMO106_TAU); g.clip();   // (nada sai do balão: o que passar do branco é cortado)
  g.translate(cx, cy); g.scale(f, f);
  try { D(g, px/f); } catch (e) { console.error('v106 emoji ' + id, e); }
  g.restore();
  return true;
}
function emo106Rosto(id, px){                                    // (a imagem da carinha: px = o diâmetro do balão em px de verdade)
  px = Math.max(8, Math.min(512, Math.round(px)));
  if (px > 160) px = Math.round(px/8)*8; else if (px > 64) px = Math.round(px/2)*2;   // (os tamanhos grandes em degraus: o cache não enche)
  const k = id + '|' + px;
  let c = EMO106_CACHE.get(k);
  if (c){ EMO106_CACHE.delete(k); EMO106_CACHE.set(k, c); return c; }   // (o usado por último fica no fim: sai por último)
  if (!EMO106_DESENHO[id]) return null;
  c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d');
  if (g) emo106Pinta(g, id, px/2, px/2, px/2, 1);
  EMO106_CACHE.set(k, c);
  while (EMO106_CACHE.size > EMO106_CACHE_MAX) EMO106_CACHE.delete(EMO106_CACHE.keys().next().value);
  return c;
}
const EMO106_PONTA_GRADE = Math.PI*.7;                           // (na grade do COFRE e na cruz: a pontinha embaixo, à esquerda)
// o emoji com o balão em qualquer contexto 2D: o balão de raio r no (cx, cy) (a pontinha passa um pouco dele)
// op: {ponta: o ângulo da pontinha (null: sem pontinha), alcance: até onde ela vai (em r; 1,3), alfa, sombra (na partida),
//      px: o tamanho da imagem pronta (o diâmetro em px de verdade; sem ele, o do contexto — o "pop" da partida passa o px
//      do tamanho final, para não fazer uma imagem nova a cada quadro da animação)}
function emo106Desenha(g, id, cx, cy, r, op){
  if (!g || !EMO106_DESENHO[id] || !(r > 0)) return false;
  op = op || {};
  let esc = 1;
  try { const T = g.getTransform(); esc = Math.max(.05, Math.hypot(T.a, T.b)); } catch (_) {}
  const ang = op.ponta === undefined ? EMO106_PONTA_GRADE : op.ponta, alc = (op.alcance || 1.3)*r;
  g.save();
  if (op.alfa != null) g.globalAlpha *= Math.max(0, Math.min(1, op.alfa));
  if (op.sombra){                                                // (a sombra embaixo: o balão destaca no campo claro)
    emo106BalaoCaminho(g, cx, cy + r*.09, r, ang, ang == null ? null : alc);
    g.fillStyle = 'rgba(0,0,0,.24)'; g.fill();
  }
  emo106Balao(g, cx, cy, r, ang, ang == null ? null : alc, 1/esc);
  const img = emo106Rosto(id, op.px > 0 ? op.px : 2*r*esc);
  if (img) g.drawImage(img, cx - r, cy - r, 2*r, 2*r);
  g.restore();
  return true;
}
function emo106Imagem(id, px, op){                               // um canvas novo com o emoji (para pôr na página: a grade, a cruz)
  px = Math.max(8, Math.round(px || 64));
  const c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d'); if (!g) return c;
  const r = px/2/1.08;                                           // (a pontinha cabe no quadrado)
  emo106Desenha(g, id, px/2 + r*.06, px/2 - r*.04, r, Object.assign({alcance:1.12}, op || {}));
  return c;
}

/* ---------------------------------------------------------------- 3) os 5 lugares da cruz (cima, esquerda, meio, direita, baixo) */
const EMO106_LUGARES = ['cima', 'esquerda', 'meio', 'direita', 'baixo'];
const EMO106_PADRAO = ['valeu', 'rindo', 'comemorando', 'bravo', 'chorando'];
const EMO106_CHAVE = 'racha-emotes-v106';                       // (os 5 lugares: vão na cópia do progresso da conta — tools/v82/inicio.js)
const EMO106_CHAVE_OUTROS = 'racha-emotes-outros-v106';        // (mostrar os dos outros: fica no aparelho, como os outros ajustes)
const EMO106_DUR = 2500, EMO106_INTERVALO = 1500, EMO106_RAJADA = 3, EMO106_JANELA = 6000;   // (o servidor: 1 a cada 1 s e 3 a cada 5 s)
const EMO106_BOT_CHANCE = .25;
const EMO106 = {slots:EMO106_PADRAO.slice(), outros:true, baloes:new Map(), relogio:0, relT:0, envios:[], esperaIni:0, esperaFim:0, esperaRaf:0,
  cruz:false, cruzT:0, el:{}, ouvintes:new Set(), desenhados:[], lugar:null, cruzLugar:null, kCss:0, kCssT:-1e9, erros:0, mandados:0, recebidos:0};
function emo106Norma(s){                                       // 5 emojis da lista, sem repetir (o que faltar vem do padrão)
  const L = [], usados = new Set();
  for (let i = 0; i < 5; i++){ const id = Array.isArray(s) ? s[i] : null; if (EMO106_IDS.has(id) && !usados.has(id)){ L[i] = id; usados.add(id); } else L[i] = null; }
  const sobra = EMO106_PADRAO.concat(EMO106_LISTA.map(e => e.id));
  for (let i = 0; i < 5; i++) if (!L[i]){ L[i] = !usados.has(EMO106_PADRAO[i]) ? EMO106_PADRAO[i] : sobra.find(id => !usados.has(id)); usados.add(L[i]); }
  return L;
}
function emo106Le(){
  try { const o = JSON.parse(localStorage.getItem(EMO106_CHAVE) || 'null'); EMO106.slots = emo106Norma(o && o.s); } catch (_) { EMO106.slots = EMO106_PADRAO.slice(); }
  try { EMO106.outros = localStorage.getItem(EMO106_CHAVE_OUTROS) !== '0'; } catch (_) { EMO106.outros = true; }
}
function emo106Grava(){ try { localStorage.setItem(EMO106_CHAVE, JSON.stringify({v:1, s:EMO106.slots})); } catch (_) {} }
function emo106GravaOutros(){ try { if (EMO106.outros) localStorage.removeItem(EMO106_CHAVE_OUTROS); else localStorage.setItem(EMO106_CHAVE_OUTROS, '0'); } catch (_) {} }
function emo106Avisa(){
  const s = EMO106.slots.slice();
  for (const f of [...EMO106.ouvintes]) try { f(s.slice()); } catch (e) { console.error('v106 emotes (mudou)', e); }
}
function emo106PoeSlot(i, id){                                 // troca o lugar i; o emoji que já estava em outro lugar troca com ele
  i = Number(i);
  if (!(Number.isInteger(i) && i >= 0 && i < 5) || !EMO106_IDS.has(id)) return null;
  const s = EMO106.slots.slice();
  if (s[i] === id) return s;
  const j = s.indexOf(id);
  if (j >= 0) s[j] = s[i];
  s[i] = id;
  EMO106.slots = s;
  emo106Grava(); emo106PintaCruz(); emo106Avisa();
  try { if (typeof v105Empurra === 'function') v105Empurra(); } catch (_) {}   // (a cópia vai para a conta logo, como a das tampinhas)
  return s.slice();
}
function emo106Mudou(fn){ if (typeof fn !== 'function') return () => {}; EMO106.ouvintes.add(fn); return () => { EMO106.ouvintes.delete(fn); }; }
emo106Le();
addEventListener('storage', e => {                             // (outra aba do jogo trocou os lugares: esta acompanha)
  try { if (e.key === EMO106_CHAVE){ const antes = EMO106.slots.join(); emo106Le(); if (EMO106.slots.join() !== antes){ emo106PintaCruz(); emo106Avisa(); } } } catch (_) {}
});

/* ---------------------------------------------------------------- 4) mandar e mostrar */
function emo106NoJogo(){                                       // o campo à vista (o treino livre é o jogo com o lobby fechado e sem RQ nem TR)
  try { return !lobby.aberto && !(typeof OFJ !== 'undefined' && OFJ.on); } catch (_) { return false; }
}
function emo106Pode(){                                         // a partida (o treino, contra os bots, o online) à vista e você com a tampinha
  try {
    if (!emo106NoJogo() || editing || RP.ativo || PAUSA.aberta) return false;
    if (TR.on && !RQ.on && TR.id === 'tut') return false;      // (o tutorial tem o painel dele)
    if (typeof HE !== 'undefined' && HE.aberto) return false;
    if (NET49.playing && NET49.localSlot < 0) return false;    // (quem assiste não tem tampinha em campo)
    if (fimAberto() || trFimAberto() || rqVsAberto() || X49UI.open) return false;
    return true;
  } catch (_) { return false; }
}
function emo106Eu(){ return NET49.playing && NET49.localSlot >= 0 && NET49.id ? NET49.id : 'eu'; }
function emo106Espera(agora){                                  // quanto falta para o próximo (ms; 0 = já pode)
  const E = EMO106.envios; let f = 0;
  if (E.length) f = Math.max(f, E[E.length - 1] + EMO106_INTERVALO - agora);
  if (E.length >= EMO106_RAJADA) f = Math.max(f, E[E.length - EMO106_RAJADA] + EMO106_JANELA - agora);
  return Math.max(0, f);
}
function emo106Mostra(quem, id, deFora){                       // o balão de quem (você, o id de rede de alguém ou a tampinha do bot)
  if (!EMO106_IDS.has(id) || quem == null) return false;
  EMO106.baloes.set(quem, {e:id, t0:EMO106.relogio, fora:!!deFora});
  return true;
}
function emo106Manda(id){
  if (!EMO106_IDS.has(id) || !emo106Pode()) return false;
  const agora = performance.now();
  if (emo106Espera(agora) > 0){ try { som.erro(); } catch (_) {} emo106Pisca(); return false; }
  EMO106.envios.push(agora); if (EMO106.envios.length > 8) EMO106.envios.shift();
  emo106Mostra(emo106Eu(), id);
  if (NET49.playing && NET49.localSlot >= 0) try { net49Send({type:'emote', e:id}); EMO106.mandados++; } catch (_) {}
  try { som.clique(); } catch (_) {}
  emo106Cruz(false);
  emo106EsperaComeca(agora);
  return true;
}
// online: o balão dos outros (o servidor repassa {type:'emote', id:<quem mandou>, e}); o seu já apareceu na hora
const net49MessageAntes106 = net49Message;
net49Message = function(m){
  if (m && m.type === 'emote'){
    try { if (typeof m.id === 'string' && m.id && m.id !== NET49.id && EMO106_IDS.has(m.e)){ EMO106.recebidos++; emo106Mostra(m.id, m.e, true); } } catch (_) {}
    return;
  }
  return net49MessageAntes106.apply(this, arguments);
};
const net49BeginAntes106 = net49Begin;
net49Begin = function(){ EMO106.baloes.clear(); return net49BeginAntes106.apply(this, arguments); };

/* ---------------------------------------------------------------- 5) o balão em cima da tampinha (no canvas do jogo) */
const EMO106_TAM = 1.12;                                       // (o raio do balão: um pouco maior que o da tampinha na câmera)
const EMO106_MIN_CSS = 44;                                     // (mas nunca menos de 44 px de verdade de diâmetro: dá para ler no celular)
function emo106Calmo(){ try { return typeof v70Calmo === 'function' && v70Calmo(); } catch (_) { return false; } }
function emo106Kcss(){                                         // px da página por px da tela virtual (medido no máximo a cada 0,5 s)
  const agora = performance.now();
  if (agora - EMO106.kCssT > 500 || !EMO106.kCss){
    EMO106.kCssT = agora;
    try { const r = cv.getBoundingClientRect(); if (r.width > 1) EMO106.kCss = r.width/W; } catch (_) {}
    if (!EMO106.kCss) EMO106.kCss = 1;
  }
  return EMO106.kCss;
}
function emo106Quem(k){                                        // a tampinha de quem mandou
  if (k && typeof k === 'object') return RQ.on && RQ.jog.indexOf(k) >= 0 ? k : null;
  if (k === 'eu' || (NET49.playing && k === NET49.id && NET49.localSlot >= 0)) return emo106NoJogo() ? P : null;
  if (!RQ.on) return null;
  return RQ.jog.find(q => q && q !== P && q.netId === k) || null;
}
function emo106Pos(q){                                         // onde a tampinha está desenhada agora (a mesma conta do desenho dos jogadores)
  if (q === P) return [VIS.px, VIS.py];
  const a = VIS.a == null ? 1 : VIS.a;
  return [q.ax + (q.x - q.ax)*a + (q.ex || 0), q.ay + (q.y - q.ay)*a + (q.ey || 0)];
}
function emo106Pop(t, calmo){                                  // {esc, alfa}: entra com um "pop" (sem ele com Reduzir animações) e some no fim
  const sai = Math.max(0, Math.min(1, (EMO106_DUR - t)/300));
  if (calmo) return {esc:1, alfa:sai};
  let esc = 1;
  if (t < 120){ const x = t/120; esc = .35 + .8*(1 - Math.pow(1 - x, 3)); }
  else if (t < 230) esc = 1.15 - .15*((t - 120)/110);
  if (sai < 1) esc *= .85 + .15*sai;
  return {esc, alfa:Math.min(1, t/70)*sai};
}
function emo106Correndo(){                                     // o relógio dos balões anda? (para na pausa, no replay e no editor)
  try { return !RP.ativo && !editing && !(PAUSA.aberta && !NET49.playing) && !(NET49.playing && NET49.paused); } catch (_) { return true; }
}
function emo106DesenhaBaloes(g){
  // (o relógio dos balões: o tempo de partida. Um buraco grande entre dois quadros — o replay, a aba no fundo — não conta; o
  //  quadro lento do celular ocupado conta inteiro, para o balão não ficar mais que os 2,5 s)
  const agora = performance.now(), dt0 = Math.max(0, agora - (EMO106.relT || agora)), dt = dt0 > 400 ? 0 : dt0;
  EMO106.relT = agora;
  if (emo106Correndo()) EMO106.relogio += dt;
  EMO106.desenhados = [];
  if (!EMO106.baloes.size) return;
  if (!emo106NoJogo()){ EMO106.baloes.clear(); return; }
  for (const [k, b] of EMO106.baloes) if (EMO106.relogio - b.t0 >= EMO106_DUR) EMO106.baloes.delete(k);
  if (RP.ativo || editing || !EMO106.baloes.size) return;
  let Kp = 1; try { const T = g.getTransform(); Kp = Math.max(.1, Math.hypot(T.a, T.b)); } catch (_) {}
  const z = cam.z, kc = emo106Kcss(), calmo = emo106Calmo();
  const bx = W/2 + (VIS.bx - cam.x)*z, by = H/2 + (VIS.by - cam.y)*z, br = B.r*z;
  for (const [k, b] of EMO106.baloes){
    if (b.fora && !EMO106.outros) continue;
    const q = emo106Quem(k); if (!q) continue;
    const [wx, wy] = emo106Pos(q), sx = W/2 + (wx - cam.x)*z, sy = H/2 + (wy - cam.y)*z, rq = q.r*z;
    const R = Math.max(rq*EMO106_TAM, EMO106_MIN_CSS/2/kc), ponta = R*.34;
    // a pontinha: logo em cima da tampinha; a sua, em cima da setinha branca (e do VOCÊ da saída de bola)
    let topo = sy - rq - 3*z;
    try { if (q === P && RQ.on && typeof v70VoceVisivel === 'function' && v70VoceVisivel()) topo = sy - rq*(V70P.raioVoce + .48) - (RQ.estado === 'saida' ? rq*.5 + 13*z : 0) - 2; } catch (_) {}
    let cy = topo - ponta - R, ty = topo, baixo = false;
    if (cy - R < 6){ ty = sy + rq + 3*z; cy = ty + ponta + R; baixo = true; }   // (sem lugar em cima: embaixo, com a pontinha para cima)
    const cx = Math.max(R + 6, Math.min(W - R - 6, sx));
    const ang = Math.atan2(ty - cy, sx - cx), alc = Math.hypot(sx - cx, ty - cy)/R;
    const P0 = emo106Pop(EMO106.relogio - b.t0, calmo);
    let alfa = P0.alfa;
    if (Math.hypot(bx - cx, by - cy) < R + br) alfa *= .45;    // (a bola atrás do balão: ele fica transparente — a jogada à vista)
    if (alfa <= 0) continue;
    g.save();
    g.translate(sx, ty); g.scale(P0.esc, P0.esc); g.translate(-sx, -ty);   // (o "pop" sai da tampinha)
    emo106Desenha(g, b.e, cx, cy, R, {ponta:ang, alcance:alc, alfa, sombra:true, px:2*R*Kp});
    g.restore();
    EMO106.desenhados.push({k:typeof k === 'object' ? 'bot:' + RQ.jog.indexOf(k) : k, e:b.e, x:cx, y:cy, r:R, ponta:[sx, ty], alvo:[sx, sy], rq, esc:P0.esc, alfa, baixo, t:EMO106.relogio - b.t0});
  }
}
const desenhaForaDaTelaAntes106 = desenhaForaDaTela;
desenhaForaDaTela = function(g){                               // (no espaço da tela, depois do campo e antes do placar e dos controles)
  try { emo106DesenhaBaloes(g); } catch (e) { if (EMO106.erros++ < 3) console.error('v106 emotes (balão)', e); }
  return desenhaForaDaTelaAntes106.apply(this, arguments);
};

/* ---------------------------------------------------------------- 6) o botão e a cruz (do lado do placar) */
const EMO106_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="2.4"/>'
  + '<circle cx="8.9" cy="9.7" r="1.55" fill="currentColor"/><circle cx="15.1" cy="9.7" r="1.55" fill="currentColor"/>'
  + '<path d="M7.6 13.4c1 2.3 2.6 3.4 4.4 3.4s3.4-1.1 4.4-3.4" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>';
function emo106Monta(){
  if (EMO106.el.bt) return;
  const wrap = document.getElementById('wrap') || document.body;
  const bt = novoBotao('emo106-bt', 'Emojis');
  bt.innerHTML = '<i class="emo106-espera" aria-hidden="true"></i>' + EMO106_SVG;
  bt.hidden = true; bt.setAttribute('aria-haspopup', 'menu'); bt.setAttribute('aria-expanded', 'false');
  bt.addEventListener('pointerdown', e => e.stopPropagation());
  bt.addEventListener('click', e => { e.stopPropagation(); try { som.clique(); } catch (_) {} emo106Cruz(!EMO106.cruz); });
  const cruz = nodo('div', 'emo106-cruz'); cruz.hidden = true; cruz.setAttribute('role', 'menu'); cruz.setAttribute('aria-label', 'Emojis da partida');
  cruz.addEventListener('pointerdown', e => e.stopPropagation());
  const ops = EMO106_LUGARES.map((lugar, i) => {
    const b = novoBotao('emo106-op emo106-' + lugar); b.setAttribute('role', 'menuitem'); b.dataset.i = String(i);
    const c = document.createElement('canvas'); c.className = 'emo106-op-cv'; c.setAttribute('aria-hidden', 'true');
    b.append(c, nodo('i', 'emo106-n', String(i + 1)));
    b.addEventListener('click', e => { e.stopPropagation(); emo106Manda(EMO106.slots[i]); });
    cruz.appendChild(b);
    return b;
  });
  wrap.append(bt, cruz);
  EMO106.el = {bt, cruz, ops};
}
function emo106PintaCruz(){                                    // os 5 emojis nos lugares (no tamanho de verdade do botão)
  const E = EMO106.el; if (!E.ops) return;
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  E.ops.forEach((b, i) => {
    const id = EMO106.slots[i], c = b.querySelector('canvas'), css = Math.max(20, Math.round(c.getBoundingClientRect().width || 46)), px = Math.round(css*dpr);
    b.setAttribute('aria-label', (window.RachaEmotes106 ? RachaEmotes106.nome(id) : id) + ' (' + EMO106_LUGARES[i] + ')'); b.dataset.e = id;
    if (c.width !== px || c.height !== px){ c.width = c.height = px; c.dataset.e = ''; }
    if (c.dataset.e === id) return;
    c.dataset.e = id;
    const g = c.getContext('2d'); if (!g) return;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, px, px);
    const r = px/2/1.08; emo106Desenha(g, id, px/2 + r*.06, px/2 - r*.04, r, {alcance:1.12});
  });
}
function emo106Cruz(on){
  EMO106.cruz = !!on && emo106Pode(); EMO106.cruzT = performance.now();
  if (EMO106.cruz){                                            // (uma janela por vez: as falas e o painel dos jogadores fecham)
    try { if (V93F.menu) v93FalaMenu(false); } catch (_) {}
    try { if (V93P.aberto){ V93P.aberto = false; v93PainelPinta(); } } catch (_) {}
  }
  emo106PintaBotao();
  if (EMO106.cruz){ emo106PintaCruz(); emo106LugarCruz(); }
}
function emo106PintaBotao(){
  const E = EMO106.el; if (!E.bt) return;
  const vis = emo106Pode();
  if (E.bt.hidden === vis) E.bt.hidden = !vis;
  if (!vis) EMO106.cruz = false;
  if (EMO106.cruz && performance.now() - EMO106.cruzT > 6000) EMO106.cruz = false;   // (esquecida aberta: fecha sozinha)
  if (E.cruz.hidden === (vis && EMO106.cruz)) E.cruz.hidden = !(vis && EMO106.cruz);
  E.bt.setAttribute('aria-expanded', String(vis && EMO106.cruz));
  const espera = emo106Espera(performance.now()) > 0;
  E.bt.classList.toggle('espera', espera); E.cruz.classList.toggle('espera', espera);
  if (vis) emo106Lugar();
}
// a espera no botão: o setor escuro que vai sumindo (só enquanto espera: nada por quadro no resto do tempo)
function emo106EsperaComeca(agora){
  EMO106.esperaIni = agora; EMO106.esperaFim = agora + emo106Espera(agora);
  if (!EMO106.esperaRaf) EMO106.esperaRaf = requestAnimationFrame(emo106EsperaPasso);
}
function emo106EsperaPasso(){
  EMO106.esperaRaf = 0;
  const E = EMO106.el; if (!E.bt) return;
  const agora = performance.now(), tot = Math.max(1, EMO106.esperaFim - EMO106.esperaIni), falta = Math.max(0, EMO106.esperaFim - agora);
  E.bt.style.setProperty('--emo106-p', (falta/tot).toFixed(3));
  const espera = falta > 0;
  E.bt.classList.toggle('espera', espera); E.cruz.classList.toggle('espera', espera);
  if (espera) EMO106.esperaRaf = requestAnimationFrame(emo106EsperaPasso);
}
function emo106Pisca(){                                        // (tocou na espera: o botão balança um pouco)
  const b = EMO106.el.bt; if (!b) return;
  b.classList.remove('nao'); void b.offsetWidth; b.classList.add('nao');
  setTimeout(() => { try { b.classList.remove('nao'); } catch (_) {} }, 400);
}
// o lugar do botão: do lado do placar, no primeiro lugar livre (à direita do placar primeiro: do outro lado do botão das falas
// e do dos jogadores), sem encostar num controle, na pausa, nos outros dois botões nem na barra da sala online
function emo106Lugar(){
  const bt = EMO106.el.bt; if (!bt || bt.hidden) return;
  const c = cv.getBoundingClientRect(), wr = (bt.offsetParent || document.body).getBoundingClientRect(), k = c.width/W;
  if (!(k > 0)) return;
  const L = v93LadoPlacar(), lado = L.lado, gap = 14*(HUDX.k || 1), px = Math.max(36, Math.round(lado*k));
  const xs = [L.xs[1], L.xs[3], L.xs[3] + lado + gap, L.xs[2] - lado - gap, L.xs[0], L.xs[2]];
  const ocup = [];
  for (const o of [V93P.el && V93P.el.bt, V93F.el && V93F.el.bt, X49UI.onlinebar]){
    if (!o || o.hidden || o === bt) continue;
    const r = o.getBoundingClientRect(); if (r.width > 1 && getComputedStyle(o).display !== 'none') ocup.push(r);
  }
  let melhor = null;
  xs.forEach((x0, ordem) => {
    const Rv = {x:x0, y:L.y - lado/2, w:lado, h:lado};
    const Rc = {l:c.left + (x0 + lado/2)*k - px/2, t:c.top + L.y*k - px/2}; Rc.r = Rc.l + px; Rc.b = Rc.t + px;
    let custo = ordem;
    if (x0 < 0 || x0 + lado > W) custo += 500;
    for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id); if (heSobra(Rv, {x:e.x, y:e.y, r:e.r + 10})) custo += 1000; }
    try { if (heSobra(Rv, {x:BTN_PAUSA.x + BTN_PAUSA.w/2, y:BTN_PAUSA.y + BTN_PAUSA.h/2, r:BTN_PAUSA.w/2 + 8})) custo += 1000; } catch (_) {}
    for (const r of ocup) if (Rc.l < r.right + 4 && Rc.r > r.left - 4 && Rc.t < r.bottom + 4 && Rc.b > r.top - 4) custo += 1000;
    try { custo += v93RotuloCusto(Rv); } catch (_) {}
    if (!melhor || custo < melhor.custo) melhor = {custo, x0, Rc};
  });
  const left = Math.round(melhor.Rc.l - wr.left) + 'px', top = Math.round(melhor.Rc.t - wr.top) + 'px', tam = px + 'px';
  if (bt.style.left !== left) bt.style.left = left;
  if (bt.style.top !== top) bt.style.top = top;
  if (bt.style.width !== tam){ bt.style.width = tam; bt.style.height = tam; }
  EMO106.lugar = {x:melhor.Rc.l, y:melhor.Rc.t, w:px, custo:melhor.custo};
  if (EMO106.cruz) emo106LugarCruz();
}
function emo106LugarCruz(){                                    // a cruz embaixo do botão, fora dos controles e dentro da tela
  const E = EMO106.el; if (!E.cruz || E.cruz.hidden) return;
  const c = cv.getBoundingClientRect(), wr = (E.cruz.offsetParent || document.body).getBoundingClientRect(), k = c.width/W;
  const br = E.bt.getBoundingClientRect(), mw = E.cruz.offsetWidth, mh = E.cruz.offsetHeight, y0 = br.bottom + 6;
  let melhor = null;
  for (const xc of [br.left + br.width/2 - mw/2, br.right - mw, br.left, c.left + (c.width - mw)/2]){
    const Rr = {x:xc, y:y0, w:mw, h:mh}; let custo = Math.abs(xc - (br.left + br.width/2 - mw/2))*.05;
    if (xc < Math.max(0, c.left) + 4 || xc + mw > Math.min(innerWidth, c.right) - 4) custo += 400;
    if (y0 + mh > innerHeight - 4) custo += 200;
    for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id); if (heSobra(Rr, {x:c.left + e.x*k, y:c.top + e.y*k, r:e.r*k + 6})) custo += 1000; }
    try { if (heSobra(Rr, {x:c.left + (BTN_PAUSA.x + BTN_PAUSA.w/2)*k, y:c.top + (BTN_PAUSA.y + BTN_PAUSA.h/2)*k, r:BTN_PAUSA.w/2*k + 6})) custo += 1000; } catch (_) {}
    if (!melhor || custo < melhor.custo) melhor = {custo, x:xc};
  }
  E.cruz.style.left = Math.round(melhor.x - wr.left) + 'px'; E.cruz.style.top = Math.round(y0 - wr.top) + 'px';
  EMO106.cruzLugar = {x:melhor.x, y:y0, w:mw, h:mh, custo:melhor.custo};
}
emo106Monta();
setInterval(() => { try { emo106PintaBotao(); } catch (e) { if (EMO106.erros++ < 3) console.error('v106 emotes (botão)', e); } }, 300);
addEventListener('resize', () => { try { EMO106.kCssT = -1e9; emo106PintaBotao(); if (EMO106.cruz) emo106PintaCruz(); } catch (_) {} });
document.addEventListener('pointerdown', e => {                // tocou fora da cruz: fecha
  try { if (EMO106.cruz && !EMO106.el.cruz.contains(e.target) && !EMO106.el.bt.contains(e.target)) emo106Cruz(false); } catch (_) {}
}, true);
// as falas abrindo (o T) fecham a cruz; e o placar mudando de largura (o clube do time) leva o botão junto
if (typeof v93FalaMenu === 'function'){
  const v93FalaMenuAntes106 = v93FalaMenu;
  v93FalaMenu = function(on){ if (on && EMO106.cruz) emo106Cruz(false); return v93FalaMenuAntes106.apply(this, arguments); };
}
if (typeof v93FalaLugar === 'function'){
  const v93FalaLugarAntes106 = v93FalaLugar;
  v93FalaLugar = function(){ const r = v93FalaLugarAntes106.apply(this, arguments); try { emo106Lugar(); } catch (_) {} return r; };
}

/* ---------------------------------------------------------------- 7) o teclado: E abre a cruz; com ela aberta, 1 a 5 escolhem */
function emo106TeclaLivre(code){                               // a tecla não é de nenhuma ação (Ajustes › Controles › Teclado)
  try { const m = TECLA.mapa[code]; return !m || /^_livre_/.test(m); } catch (_) { return true; }
}
addEventListener('keydown', e => {
  try {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (typeof TECLA !== 'undefined' && TECLA.captura) return;  // (trocando uma tecla nos Ajustes)
    if (!emo106Pode()) return;
    if (EMO106.cruz && e.code === 'Escape'){ e.preventDefault(); e.stopImmediatePropagation(); emo106Cruz(false); return; }
    if (EMO106.cruz && /^(Digit|Numpad)[1-5]$/.test(e.code)){ e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) emo106Manda(EMO106.slots[+e.code.slice(-1) - 1]); return; }
    if (e.code === 'KeyE' && emo106TeclaLivre('KeyE')){ e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat){ try { som.clique(); } catch (_) {} emo106Cruz(!EMO106.cruz); } }
  } catch (_) {}
}, true);

// o controle (o de mapa padrão): o SELECT abre a cruz; com ela aberta, o direcional manda o do lado (cima, esquerda, direita,
// baixo) e o SELECT de novo manda o do meio — só quando o SELECT não é de nenhuma ação da partida (Ajustes › Controles)
function emo106Pad(){
  const g = typeof v88Pad === 'function' ? v88Pad() : null; if (!g || g.mapping !== 'standard' || !emo106Pode()) return;
  const ant = (typeof V88PAD !== 'undefined' && V88PAD.ant) || [], bt = i => typeof v103Bt === 'function' ? v103Bt(g, i) : !!(g.buttons[i] && g.buttons[i].pressed);
  const novo = i => bt(i) && !ant[i];
  let ocupado = false;
  try { ocupado = V103_ACOES.some(a => a[3] !== 'menu' && (V103.mapa[a[0]] || []).indexOf(8) >= 0); } catch (_) {}
  if (!ocupado && novo(8)){
    if (EMO106.cruz) emo106Manda(EMO106.slots[2]); else { try { som.clique(); } catch (_) {} emo106Cruz(true); }
    return;
  }
  if (EMO106.cruz) for (const [b, i] of [[12, 0], [14, 1], [15, 3], [13, 4]]) if (novo(b)){ emo106Manda(EMO106.slots[i]); return; }
}
if (typeof v103PadJogo === 'function'){
  const v103PadJogoAntes106 = v103PadJogo;
  v103PadJogo = function(){ const r = v103PadJogoAntes106.apply(this, arguments); try { emo106Pad(); } catch (_) {} return r; };
}

/* ---------------------------------------------------------------- 8) os bots: depois de um gol, às vezes */
function emo106BotsGol(t){
  if (NET49.playing || !RQ.on || TR.on || !(t === 0 || t === 1) || Math.random() >= EMO106_BOT_CHANCE) return 0;
  const bots = RQ.jog.filter(q => q && q !== P), sorteia = L => L[Math.floor(Math.random()*L.length)];
  const fez = bots.filter(q => q.time === t), levou = bots.filter(q => q.time !== t), quem = [];
  if (fez.length) quem.push([sorteia(fez), Math.random() < .5 ? 'comemorando' : 'rindo']);
  if (levou.length) quem.push([sorteia(levou), Math.random() < .5 ? 'triste' : 'bravo']);
  quem.forEach(([q, id], i) => setTimeout(() => { try { if (RQ.on && !NET49.playing && RQ.jog.indexOf(q) >= 0) emo106Mostra(q, id, true); } catch (_) {} }, 450 + i*550 + Math.random()*250));
  return quem.length;
}
const rqGolAntes106 = rqGol;
rqGol = function(){
  const antes = RQ.placar[0] + RQ.placar[1];
  const r = rqGolAntes106.apply(this, arguments);
  try { if (RQ.placar[0] + RQ.placar[1] !== antes) emo106BotsGol(RQ.golTime); } catch (_) {}
  return r;
};

/* ---------------------------------------------------------------- 9) Ajustes › Visual: os emojis dos outros */
(function emo106Ajustes(){
  try {
    const sec = AJX.secs && AJX.secs.visual; if (!sec || document.getElementById('aj-emotes-outros')) return;
    const lin = ajxChave('aj-emotes-outros', 'Emojis dos outros na partida', 'Os balões de emoji de quem joga com você (e dos bots). Desligado, só o seu aparece');
    const rep = ajxLinhaDe('aj-replay');
    if (rep && rep.parentNode === sec) rep.insertAdjacentElement('afterend', lin); else sec.appendChild(lin);
    lin.querySelector('button').addEventListener('click', () => { try { som.clique(); } catch (_) {} EMO106.outros = !EMO106.outros; emo106GravaOutros(); ajxSync(); });
  } catch (e) { console.error('v106 emotes (ajustes)', e); }
})();
const ajxSyncAntes106 = ajxSync;
ajxSync = function(){ const r = ajxSyncAntes106.apply(this, arguments); try { const b = document.getElementById('aj-emotes-outros'); if (b) ligado(b, EMO106.outros); } catch (_) {} return r; };
try { ajxSync(); } catch (_) {}

/* ---------------------------------------------------------------- 10) a API (o COFRE novo usa exatamente estes nomes) */
window.RachaEmotes106 = {
  lista:() => EMO106_LISTA.map(e => ({id:e.id, nome:e.nome})),           // os 20, na ordem da grade
  // o emoji com o balão: o círculo de raio r no (cx, cy) e a pontinha embaixo à esquerda (passa ~0,3 r do círculo); op:
  // {ponta: o ângulo da pontinha em radianos (π/2 = para baixo; null = sem pontinha), alcance (em r), alfa} · devolve false
  // se o id não é da lista
  desenha:(g, id, cx, cy, r, op) => emo106Desenha(g, id, cx, cy, r, op),
  slots:() => EMO106.slots.slice(),                                       // [cima, esquerda, meio, direita, baixo]
  poeSlot:(i, id) => emo106PoeSlot(i, id),                                // troca e grava (devolve os 5; null se não deu)
  padrao:() => EMO106_PADRAO.slice(),
  mudou:fn => emo106Mudou(fn),                                            // fn(slots) a cada troca; devolve o "parar de avisar"
  // (a mais: para a página e para os testes)
  nome:id => { const e = EMO106_LISTA.find(x => x.id === id); return e ? e.nome : ''; },
  imagem:(id, px, op) => emo106Imagem(id, px, op),
  lugares:() => EMO106_LUGARES.slice(),
  manda:id => emo106Manda(id),
  estado:() => ({slots:EMO106.slots.slice(), outros:EMO106.outros, cruz:EMO106.cruz, pode:emo106Pode(), espera:Math.round(emo106Espera(performance.now())),
    baloes:[...EMO106.baloes.entries()].map(([k, b]) => ({k:typeof k === 'object' ? 'bot' : k, e:b.e, t:Math.round(EMO106.relogio - b.t0)})),
    desenhados:EMO106.desenhados.map(d => Object.assign({}, d)), lugar:EMO106.lugar, cruzLugar:EMO106.cruzLugar, mandados:EMO106.mandados, recebidos:EMO106.recebidos})
};
