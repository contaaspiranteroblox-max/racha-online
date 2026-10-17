/* ==================================================================================================================
   RACHA rua v80 · OS CONTROLES DO TREINO (os três seletores embaixo: TAMANHO, CAMPO e TREINO)
   O pedido: "os botões de baixo do Treino têm as setas verdes e parecem os de outro jogo: um visual novo, original do RACHA,
   moderno e competitivo, sem as setas verdes, com ícones próprios, bordas bem definidas, efeito discreto ao apertar,
   transparência equilibrada, tamanho bom para o celular e bem organizados embaixo; as funções e a resposta, as mesmas."
   · Cada seletor é um cartão de grafite meio transparente (o campo aparece por trás) com a borda clara bem marcada; em cima,
     o ícone dele (duas tampinhas frente a frente no TAMANHO, o campinho no CAMPO, o cone no TREINO) e o nome em amarelo;
     no meio, o que está escolhido; embaixo, as bolinhas de quantas opções tem e em qual você está.
   · Nas duas pontas, uma tampinha pequena (a serrilha da tampinha do RACHA) com a seta fina branca: a da esquerda volta, a da
     direita avança, como antes (a metade do cartão que você toca decide; troca quando o dedo sobe).
   · Ao apertar: a metade tocada acende de leve e a tampinha dela afunda um pouco e ganha a borda amarela.
   · Um exercício escolhido (fora o Livre) deixa a borda do TREINO amarela, como antes.
   · Maiores que os de antes (272 × 80 na tela virtual; a área de toque continua maior que o desenho) e mais juntos do meio,
     longe do analógico e do PASSE/CHUTE. As trocas (trocaModo, trocaCampo, trTroca) e a hora do toque são as mesmas.
   ================================================================================================================== */
const SEL80 = {w:272, h:80, gap:304, y:H - 72, raio:20, tampa:21, ponta:33};
ARC_SELS.forEach((s, i) => Object.assign(s, {x:W/2 + (i - 1)*SEL80.gap, y:SEL80.y, w:SEL80.w, h:SEL80.h}));
function v80SelOpcoes(id){                               // [quantas, qual] (as bolinhas embaixo)
  if (id === 'modo') return [MODOS.length, modo];
  if (id === 'campo'){ const L = typeof v702Mapas === 'function' ? v702Mapas() : CAMPOS.map((_, i) => i); return [L.length, Math.max(0, L.indexOf(campo))]; }
  return [TR_LISTA.length, Math.max(0, TR_LISTA.indexOf(TR.id))];
}
function v80SelIcone(g, id, x, y, cor){                  // os ícones (próprios): duas tampinhas (TAMANHO), o campinho (CAMPO) e o cone (TREINO)
  g.save(); g.translate(x, y); g.lineJoin = 'round'; g.lineCap = 'round';
  const esc = 'rgba(10,8,18,.9)';
  if (id === 'modo'){
    for (const [dx, r, cheia] of [[5.5, 6.2, false], [-5.5, 6.8, true]]){
      g.beginPath(); for (let i = 0; i <= 24; i++){ const a = i/24*TAU, rr0 = r*(i % 2 ? .86 : 1); g.lineTo(dx + Math.cos(a)*rr0, Math.sin(a)*rr0); } g.closePath();
      g.lineWidth = 3.2; g.strokeStyle = esc; g.stroke(); g.fillStyle = cheia ? cor : '#ffffff'; g.fill();
    }
  } else if (id === 'campo'){
    rr(g, -12, -8.5, 24, 17, 3); g.lineWidth = 4.4; g.strokeStyle = esc; g.stroke(); g.lineWidth = 2.2; g.strokeStyle = cor; g.stroke();
    g.beginPath(); g.moveTo(0, -8.5); g.lineTo(0, 8.5); g.moveTo(3.4, 0); g.arc(0, 0, 3.4, 0, TAU); g.lineWidth = 3.8; g.strokeStyle = esc; g.stroke(); g.lineWidth = 1.8; g.strokeStyle = cor; g.stroke();
  } else {
    g.beginPath(); g.moveTo(-2.6, -10); g.lineTo(2.6, -10); g.lineTo(8, 6); g.lineTo(-8, 6); g.closePath();
    g.lineWidth = 3.2; g.strokeStyle = esc; g.stroke(); g.fillStyle = cor; g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-4.6, -3); g.lineTo(4.6, -3); g.lineTo(5.6, 0); g.lineTo(-5.6, 0); g.closePath(); g.fill();
    rr(g, -10.5, 5.5, 21, 4.5, 2); g.fillStyle = cor; g.fill(); g.lineWidth = 2.2; g.strokeStyle = esc; g.stroke();
  }
  g.restore();
}
function v80SelTampa(g, x, y, dir, apertada){             // a tampinha da ponta (serrilhada) com a seta fina
  const T = SEL80.tampa*(apertada ? .9 : 1);
  g.save(); g.translate(x, y + (apertada ? 1.5 : 0));
  g.beginPath(); for (let i = 0; i <= 40; i++){ const a = i/40*TAU, r = T*(i % 2 ? .9 : 1); g.lineTo(Math.cos(a)*r, Math.sin(a)*r); } g.closePath();
  const gr = g.createLinearGradient(0, -T, 0, T); gr.addColorStop(0, apertada ? '#2a2e35' : '#3a3f48'); gr.addColorStop(1, apertada ? '#14161a' : '#1d2026');
  g.fillStyle = gr; g.fill(); g.lineWidth = 2.4; g.strokeStyle = apertada ? '#ffd23f' : 'rgba(255,255,255,.42)'; g.stroke();
  g.beginPath(); g.arc(0, 0, T*.66, 0, TAU); g.lineWidth = 1.4; g.strokeStyle = 'rgba(255,255,255,.12)'; g.stroke();
  g.scale(dir, 1); g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(-2.5, -7.5); g.lineTo(4, 0); g.lineTo(-2.5, 7.5);
  g.lineWidth = 6.5; g.strokeStyle = 'rgba(10,8,18,.85)'; g.stroke(); g.lineWidth = 3.4; g.strokeStyle = apertada ? '#ffd23f' : '#ffffff'; g.stroke();
  g.restore();
}
selCorpo = function(g, s, texto, papel, x0, y0){        // (para a imagem pronta, como antes) o cartão de um seletor
  const id = papel.slice(4), pm = pressed(papel + '-'), pp = pressed(papel + '+'), ativo = id === 'treino' && TR.id !== 'livre';
  const S = SEL80, w = s.w, h = s.h, R = S.raio, cx = s.x, cy = s.y;
  rr(g, x0, y0 + 5, w, h, R); g.fillStyle = 'rgba(0,0,0,.26)'; g.fill();                                                    // a sombra
  rr(g, x0, y0, w, h, R); g.fillStyle = 'rgba(20,22,27,.7)'; g.fill();                                                       // o grafite meio transparente
  g.save(); rr(g, x0, y0, w, h, R); g.clip();
  const gr = g.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, 'rgba(255,255,255,.13)'); gr.addColorStop(.45, 'rgba(255,255,255,.02)'); gr.addColorStop(1, 'rgba(0,0,0,.18)');
  g.fillStyle = gr; g.fillRect(x0, y0, w, h);
  if (pm || pp){ g.fillStyle = 'rgba(255,210,63,.14)'; g.fillRect(pm ? x0 : cx, y0, w/2, h); }                             // a metade apertada acende
  g.restore();
  rr(g, x0, y0, w, h, R); g.lineWidth = ativo ? 3.4 : 2.6; g.strokeStyle = ativo ? '#ffd23f' : 'rgba(255,255,255,.34)'; g.stroke();   // a borda bem marcada
  rr(g, x0 - 2.5, y0 - 2.5, w + 5, h + 5, R + 2.5); g.lineWidth = 2; g.strokeStyle = 'rgba(8,8,14,.55)'; g.stroke();
  v80SelTampa(g, x0 + S.ponta, cy, -1, pm); v80SelTampa(g, x0 + w - S.ponta, cy, 1, pp);
  const nome = s.nome, lw = medeTxt(nome, '17px ' + FONT), ix = cx - (lw + 34)/2 + 13;                                       // o ícone e o nome em cima
  v80SelIcone(g, id, ix, y0 + 19, '#ffd23f');
  txt(g, nome, ix + 21 + lw/2, y0 + 20, 17, '#ffd23f', 'rgba(10,8,18,.9)', 4);
  g.font = '31px ' + FONT; const tw = g.measureText(texto).width, tam = Math.min(31, 31*(w - 2*S.ponta - 46)/Math.max(1, tw));   // o escolhido (o comprido diminui)
  txt(g, texto, cx, y0 + 47, tam, '#ffffff', 'rgba(10,8,18,.95)', 6);
  const [n, k] = v80SelOpcoes(id), ds = 11, d0 = cx - (n - 1)*ds/2;                                                           // as bolinhas: quantas e qual
  for (let i = 0; i < n; i++){ g.beginPath(); g.arc(d0 + i*ds, y0 + h - 10, i === k ? 3.6 : 2.4, 0, TAU); g.fillStyle = i === k ? '#ffd23f' : 'rgba(255,255,255,.34)'; g.fill(); }
};
drawSeletores = function(){                              // (o nome agora mora dentro do cartão)
  if (RQ.on){ if (pilulaVisivel()) rqInfoPilula(); return; }
  for (const s of ARC_SELS) drawSel(s, arcTextoSel(s.id), 'arc-' + s.id);
};

window.RachaTreino80 = {sels:() => ARC_SELS.map(s => ({id:s.id, x:s.x, y:s.y, w:s.w, h:s.h})), opcoes:id => v80SelOpcoes(id)};
