/* ======================================================================================================================
   RACHA v107 · O ANEL DO CHUTE BEM BRANCO
   O pedido (05/11/2026): "quando o jogador chuta, o arco ao redor deve ficar bem branco: a opacidade do chute tá muito fraca".
   Na v96 (a pedido de então) o branco do anel tinha ficado suave, no máximo 30% (V95S.luz = 0,3, tools/v96/conta.js). Agora
   volta forte e passa do branco da v95: apertou o CHUTE, o anel em volta da tampinha acende em BRANCO OPACO (o anel cheio de
   branco, a borda de fora e um brilho um pouco maior); o PASSE acende quase igual (86%, como na v95: dá para ver qual foi).
   Segurando fica; soltou ou foi só um toque, some rápido — como sempre. Vale para você e para os outros (online, pelo botão de
   cada um no quadro do servidor), na partida, no treino, no replay e na Oficina (tools/v107/chute.py troca o branco de lá).
   Só o desenho: o botão, o chute e a força não mudam.
   ====================================================================================================================== */
try { V95S.luz = 1; } catch (_) {}                         // (tools/v95/times.js e tools/oficina/desenho.js multiplicam por ele)

function v107SpriteBranco(rpx){                              // o anel aceso: o mesmo anel da v95, mas com o branco opaco
  const re = rpx*AROV.ate, ri = rpx*Math.max(1.02, AROV.de - .02), m = Math.ceil(re + rpx*.36 + 4);
  const c = document.createElement('canvas'); c.width = c.height = 2*m;
  const g = c.getContext('2d');
  const anel = () => { g.beginPath(); g.arc(m, m, re, 0, TAU); g.arc(m, m, ri, 0, TAU, true); };
  g.save(); g.shadowColor = 'rgba(255,255,255,.95)'; g.shadowBlur = Math.max(2, rpx*.28);
  anel(); g.fillStyle = '#ffffff'; g.fill(); g.restore();
  anel(); g.fillStyle = '#ffffff'; g.fill();                 // (de novo, sem a sombra: o branco cheio até a borda)
  const w = Math.max(1, rpx*.06);
  g.lineWidth = w; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(m, m, re - w/2, 0, TAU); g.stroke();
  g.lineWidth = Math.max(.75, rpx*.03); g.beginPath(); g.arc(m, m, ri + g.lineWidth/2, 0, TAU); g.stroke();
  return c;
}
v95SpriteBrancoDe = function(rpx){                           // (a mesma caixa das imagens prontas dos anéis, com a chave nova)
  const key = 'w|' + rpx + '|b107'; let c = SPR_ARO.get(key);
  if (!c){ if (SPR_ARO.size > 72) SPR_ARO.clear(); c = v107SpriteBranco(rpx); SPR_ARO.set(key, c); }
  return c;
};
window.RachaChute107 = {luz: () => V95S.luz, sprite: rpx => v95SpriteBrancoDe(rpx)};
