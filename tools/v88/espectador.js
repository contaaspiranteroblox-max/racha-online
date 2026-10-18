/* ======================================================================================================================
   RACHA v88 · O ESPECTADOR (o de sempre: entra numa sala pelo ASSISTIR da lista ou do amigo, vê o placar e o tempo, não
   controla nada — o servidor não aceita comando de quem assiste). Entram:
   · a câmera CAMPO INTEIRO na volta do botão CÂMERA (a bola → cada jogador → o campo inteiro → a bola), sem mexer no
     ajuste de câmera de quem assiste. O campo inteiro é mais um alvo do ESPEC.alvo (V88_CAMPO = -2): quem zera o alvo
     (a saída da sala, o fim da partida) zera o campo inteiro junto;
   · o SAIR direto na barra de quem assiste (o mesmo "sair da sala" do menu).
   ====================================================================================================================== */
const V88_CAMPO = -2;                                       // (o alvo "campo inteiro"; -1 = a bola · i = RQ.jog[i], como na v70)
const v88Assistindo = () => !!(NET49.playing && NET49.localSlot < 0);
const v88CampoInteiro = () => ESPEC.alvo === V88_CAMPO && v88Assistindo();
especTroca = function(){                                   // CÂMERA: a bola → cada jogador → o campo inteiro → a bola
  const n = RQ.jog.length;
  if (ESPEC.alvo === V88_CAMPO){ ESPEC.alvo = -1; return 'BOLA'; }
  if (ESPEC.alvo + 1 >= n){ ESPEC.alvo = V88_CAMPO; return 'CAMPO INTEIRO'; }
  ESPEC.alvo++;
  return RQ.jog[ESPEC.alvo] ? String(RQ.jog[ESPEC.alvo].nome || 'JOGADOR') : 'BOLA';
};
const updateCameraAntes88 = updateCamera;
updateCamera = function(dt, snap){                          // o campo inteiro: a câmera fixa só enquanto assiste (o ajuste salvo não muda)
  if (!v88CampoInteiro()) return updateCameraAntes88.apply(this, arguments);
  const m = cam.mode; cam.mode = 'fixa';
  try { return updateCameraAntes88.apply(this, arguments); } finally { cam.mode = m; }
};
const desenhaEspecRotuloAntes88 = desenhaEspecRotulo;
desenhaEspecRotulo = function(g){
  if (!v88CampoInteiro() || editing) return desenhaEspecRotuloAntes88.apply(this, arguments);
  const s = 'CÂMERA: CAMPO INTEIRO';
  g.save(); g.font = '22px ' + FONT; const w = g.measureText(s).width + 40; rr(g, W/2 - w/2, H - 64, w, 40, 20); g.fillStyle = 'rgba(8,10,28,.72)'; g.fill(); g.restore();
  txt(g, s, W/2, H - 44, 22, '#ffe9a8', 'rgba(5,10,25,.9)', 4);
};
(function v88EspecBarra(){
  if (!X49UI.onlinebar) return;
  const sair = x49Btn('SAIR', () => { som.clique(); v88EspecSai(); });
  sair.id = 'v88-espec-sair'; sair.hidden = true; sair.classList.add('v88-espec-sair'); sair.setAttribute('aria-label', 'Parar de assistir e sair da sala');
  X49UI.onlinebar.appendChild(sair);
  const antes = x49GameUI;
  x49GameUI = function(){
    const r = antes.apply(this, arguments);
    sair.hidden = !v88Assistindo();                         // (o alvo volta para a bola no x49GameUI da v70, o campo inteiro junto)
    return r;
  };
})();
function v88EspecSai(){
  if (!NET49.room) return;
  net49Send({type:'leave'});
  try { salaJogoFecha(); } catch (_) {}
}
