/* ======================================================================================================================
   RACHA v94 · O ANALÓGICO COM O MOTOR PRÓPRIO (tools/v94/analogico.js)
   O motor recebe a direção do analógico como ela vem (mx, my) e não usa a inclinação para a velocidade (a tampinha anda
   sempre no máximo; a zona morta de verdade é a do HUD). Com o motor próprio o jogo manda a direção CONTÍNUA — sem os 32
   setores do motor de antes —, a menos que o painel de testes peça 8, 16 ou 32 direções (cfg.direcoes94). O comando que
   vai para o servidor é o mesmo que a previsão usa: o arredondamento (quando há) acontece aqui, uma vez só.
   O teclado continua com as 8 direções dele. O toque em vários dedos (o analógico e os botões juntos) é o de sempre.
   ====================================================================================================================== */
function v94Entrada(){ return V94.motor === 'v94' && !!V94.R; }
function v94Direcao(mx, my){
  const a = Math.hypot(mx, my); if (!(a > 0)) return {mx:0, my:0};
  let x = mx/a, y = my/a;
  const n = V92.cfg ? V92.cfg.direcoes94 | 0 : 0;
  if (n >= 4){ const p = 2*Math.PI/n, g = Math.round(Math.atan2(y, x)/p)*p; x = Math.cos(g); y = Math.sin(g); if (Math.abs(x) < 1e-12) x = 0; if (Math.abs(y) < 1e-12) y = 0; }
  return {mx:Math.round(x*1000)/1000, my:Math.round(y*1000)/1000};   // (3 casas: o comando que vai para o servidor fica curto, e é o mesmo na previsão)
}
const v94DirecaoAntes = direcaoOriginal;
direcaoOriginal = function(mx, my){ return v94Entrada() ? v94Direcao(mx, my) : v94DirecaoAntes(mx, my); };
// o analógico da tela (a regra da v92: liga acima de zonaLiga e desliga abaixo de zonaDesliga, a zona morta do HUD) com a
// direção do motor próprio — a da v92 arredondava sempre nos setores do perfil antigo (32)
const v94AnalogicoAntes = v92Analogico;
v92Analogico = function(){
  if (!v94Entrada()) return v94AnalogicoAntes.apply(this, arguments);
  const c = V92.cfg, s = (typeof V88AJ !== 'undefined' && V88AJ.sens) || 1, R = JOY.max*hud.joy.al;
  const dx = joy.dx*s, dy = joy.dy*s, l = Math.hypot(dx, dy)/R;
  if (!AN.ativo){ if (l > c.zonaLiga) AN.ativo = true; }
  else if (l < c.zonaDesliga){ AN.ativo = false; AN.setor = null; }
  joy.ativo = AN.ativo;
  if (!AN.ativo) return {mx:0, my:0};
  return v94Direcao(dx, dy);
};
