/* ======================================================================================================================
   RACHA v94 · o desenho entre os passos com o motor próprio (o modo 'prever' da v92: onde cada um vai estar AGORA).
   A tampinha: a velocidade do próximo passo pela regra de movimento do motor (a aceleração limitada, seção 4 da
   especificação), com o analógico de agora. A bola: anda reto e para na linha (só desenho: o passo de verdade é do motor).
   ====================================================================================================================== */
const v94VelProximaAntes = v92VelProxima;
v92VelProxima = function(){
  if (!v94Vale()) return v94VelProximaAntes();
  const R = V94.R, S = V94_PX, inp = V92.ultInp || {mx:0, my:0};
  const a = Math.hypot(inp.mx || 0, inp.my || 0);
  const alvo = a < R.zonaMorta ? [0, 0] : [inp.mx/a*R.vMax*S, inp.my/a*R.vMax*S];
  const dvx = alvo[0] - P.vx, dvy = alvo[1] - P.vy, dv = Math.hypot(dvx, dvy);
  const acel = (alvo[0] === 0 && alvo[1] === 0 ? R.aPara : P.vx*alvo[0] + P.vy*alvo[1] < 0 ? R.aVira : R.aAcel)*S*STEP;
  if (dv <= acel) return alvo;
  return [P.vx + dvx/dv*acel, P.vy + dvy/dv*acel];
};
const v94BolaAgoraAntes = v92BolaAgora;
v92BolaAgora = function(t){
  if (!v94Vale()) return v94BolaAgoraAntes(t);
  const o = V92B; o.x = B.x; o.y = B.y; o.vx = B.vx; o.vy = B.vy; o.w = 0; o.r = B.r; o.m = B.m; o.I = B.I;
  if (!(t > 0)) return o;
  o.x = Math.max(GL + B.r, Math.min(GR - B.r, o.x + o.vx*t));
  o.y = Math.max(LY0 + B.r, Math.min(LY1 - B.r, o.y + o.vy*t));
  return o;
};
