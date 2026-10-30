/* ======================================================================================================================
   RACHA v94 · A CÂMERA COM O MOTOR PRÓPRIO (tools/v94/camera.js) — etapa 6.
   O que os vídeos mostram (docs/v94/OBSERVACOES_VIDEOS.md): a câmera segue a tampinha puxada um pouco para a bola — mais de
   lado (≈ 0,29 do caminho até a bola) que de cima a baixo (≈ 0,13) — (O8, confiança baixa) e a tela mostra ≈ 23 × 13 d do
   campo numa tela 16:9 (O9, confiança média). Com o motor próprio e a regra 'obs' (o padrão; o painel volta para a de antes):
     · o enquadramento EQUILIBRADO mostra pelo menos 23 d de largura e 13 d de altura (o que couber nas duas direções na tela
       de agora), em todo tamanho de time — o campo cresce com o time e a câmera acompanha; PERTO fica 20% mais perto;
       CAMPO INTEIRO e PERSONALIZADO seguem como eram;
     · no Seguir jogador, o Deslocamento (0 a 10) leva a câmera até 0,29 do caminho até a bola de lado e 0,13 de cima a
       baixo (no 10, o padrão) — antes era a metade do caminho nas duas direções.
   O resto (a proteção do seu jogador na área livre da tela, a mola, o zoom automático, os outros estilos) é o de sempre.
   ====================================================================================================================== */
const V94_CAM = {larg:23, alt:13, perto:1.2, bolaX:0.29, bolaY:0.13};   // (d) · (×) · os pesos da bola (O8, O9)
function v94CamVale(){ return V94.motor === 'v94' && !!V94.R && (!V92.cfg || V92.cfg.camera94 !== 'antes'); }
const v94ZoomDeAntes = camZoomDe;
camZoomDe = function(p){
  if (!v94CamVale() || (p !== 'equilibrado' && p !== 'perto')) return v94ZoomDeAntes(p);
  const d = 2*R_JOG, z = Math.min(W/(V94_CAM.larg*d), H/(V94_CAM.alt*d))*(p === 'perto' ? V94_CAM.perto : 1);
  return Math.max(.2, Math.min(ZOOM_MAX, z));
};
const v94AlvoCameraAntes = alvoCamera;
alvoCamera = function(hw, hh, F){
  if (!v94CamVale() || cam.estilo !== 'jogador') return v94AlvoCameraAntes(hw, hh, F);
  const w = Math.max(0, Math.min(1, cam.desl/DESL_MAX));
  return {x:F.x + (VIS.bx - F.x)*V94_CAM.bolaX*w + CAMV.ax, y:F.y + (VIS.by - F.y)*V94_CAM.bolaY*w + CAMV.ay};
};
