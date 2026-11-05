/* ======================================================================================================================
   RACHA v105 · O JOGO DE CORPO NA PARTIDA DESTE APARELHO (o pedido: "quando se encostam para disputar a bola eles deslizam
   muito")
   O núcleo das salas (server/partida/nucleo.js, o mesmo do servidor e da previsão do online) ganhou o atrito tampinha ×
   tampinha (atritoJogJog no padrão: 0,5 na v105; 0,2 desde a v106, o meio-termo) e o contato que já vem encostado segurado antes de andar (contatoJog). A partida
   contra os bots roda no motor do jogo (o bloco da física, que não muda): aqui ela recebe o mesmo —
     · o atrito na batida jogador × jogador (rqColide; o build troca o 0 pelo V105_AJJ);
     · o contatoJog no começo do passo, com as velocidades do analógico e dos bots já postas: a amostraBotoes é chamada
       exatamente ali (depois do impulso do passo, antes dos subpassos).
   O perfil da v91 (o "Restaurar v91" do painel de testes) tem atrito 0 e a virada de sempre: tudo como antes.
   ====================================================================================================================== */
/* ---------------------------------------------------------------- a virada na hora (o pedido: "o analógico está com um mini delay")
   O núcleo ganhou a virada na hora (viraNaHora: a tampinha vai na hora para onde o analógico aponta, em vez de somar a direção
   nova à velocidade de antes e cortar no teto — a curva de 30° levava ~100 ms para valer, a meia-volta parava um passo). O
   bloco da física (o passo da sua tampinha) não muda: logo depois do impulso de sempre, aqui a velocidade vira a da direção
   nova (a mesma direção que o passo usou: a do analógico, a do jogo jogando por você nos testes). Na GINGA a arrancada do
   drible manda na velocidade: ali fica o de sempre. O desenho entre os passos (o 'prever') usa a mesma conta. */
const V105V = {mx:0, my:0};
const physicsStepAntes105 = physicsStep;
physicsStep = function(dt, mx, my){ V105V.mx = mx; V105V.my = my; return physicsStepAntes105.apply(this, arguments); };
function v105Vira(){
  if (!V105_VIRA || (RQ.on && RQ.jogo === 'ginga')) return;
  if (NET49.playing && NET49.host && NET49.localSlot < 0) return;   // (o anfitrião assistindo: a tampinha é de outro)
  let mx = V105V.mx, my = V105V.my;
  if (RQ.on && RQ.autoH){ mx = P.mx; my = P.my; }
  const d = direcaoOriginal(mx, my);
  if (d.mx || d.my){ P.vx = d.mx*VEL_JOG; P.vy = d.my*VEL_JOG; }
}
if (typeof v92VelProxima === 'function'){
  const v92VelProximaAntes105 = v92VelProxima;
  v92VelProxima = function(){
    if (!V105_VIRA || (RQ.on && RQ.jogo === 'ginga')) return v92VelProximaAntes105.apply(this, arguments);
    const d = direcaoOriginal(V92.ultInp.mx, V92.ultInp.my);
    return d.mx || d.my ? [d.mx*VEL_JOG, d.my*VEL_JOG] : [0, 0];
  };
}
const amostraBotoesAntes105 = amostraBotoes;
amostraBotoes = function(){
  try { v105Vira(); } catch (e) { console.error('v105 virada', e); }
  const out = amostraBotoesAntes105.apply(this, arguments);
  try {
    if (RQ.on && V105_AJJ > 0 && RQ.jog && RQ.jog.length > 1 && typeof V92_NUC !== 'undefined' && V92_NUC && V92_NUC.contatoJog)
      V92_NUC.contatoJog(RQ.jog, {ATRITO_JOG_JOG:V105_AJJ});
  } catch (e) { console.error('v105 corpo', e); }
  return out;
};
/* ---------------------------------------------------------------- o bot não fica encalhado no empurra-empurra (o mesmo do servidor:
   server/partida/bot.js, desencalha) — andando para alguém e parado encostado em outra tampinha por 12 passos, ele desvia 70°
   por 24 passos, sempre no mesmo sentido (os dois do empurra-empurra passam um pelo outro) */
const V105_ENC = 12, V105_DESVIO = 24, V105_COS = Math.cos(70*Math.PI/180), V105_SIN = Math.sin(70*Math.PI/180);
function v105Desencalha(q){
  const e = q.e105 || (q.e105 = {enc:0, desvio:0});
  if (!(q.mx || q.my) || RQ.estado !== 'jogo'){ e.enc = 0; e.desvio = 0; return; }
  if (e.desvio > 0){ e.desvio--; const mx = q.mx, my = q.my; q.mx = mx*V105_COS - my*V105_SIN; q.my = mx*V105_SIN + my*V105_COS; return; }
  if (Math.hypot(q.vx, q.vy) >= 0.3*VEL_JOG){ e.enc = 0; return; }
  let encosta = false;
  for (const o of RQ.jog){ if (o !== q && Math.hypot(o.x - q.x, o.y - q.y) < q.r + o.r + 1.5){ encosta = true; break; } }
  if (!encosta){ e.enc = 0; return; }
  if (++e.enc >= V105_ENC){ e.enc = 0; e.desvio = V105_DESVIO; }
}
if (typeof rqBots === 'function'){
  const rqBotsAntes105 = rqBots;
  rqBots = function(){
    const out = rqBotsAntes105.apply(this, arguments);
    try { if (V105_AJJ > 0 && RQ.on && RQ.bots) for (const q of RQ.bots) v105Desencalha(q); } catch (e) { console.error('v105 desencalha', e); }
    return out;
  };
}
/* ---------------------------------------------------------------- o servidor sabe que esta página tem a física nova (a página de
   antes — o app guardado no fundo, a aba esquecida — não entra nas salas do RACHA nem na ranqueada: o aviso diz para atualizar) */
if (typeof v70HelloExtra === 'function'){
  const v70HelloExtraAntes105 = v70HelloExtra;
  v70HelloExtra = function(){ const o = v70HelloExtraAntes105.apply(this, arguments) || {}; o.v105 = 1; return o; };
}
window.RachaCorpo105 = {atrito:() => V105_AJJ, vira:() => V105_VIRA};
