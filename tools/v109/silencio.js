/* RACHA v109 · O SILÊNCIO DA EQUIPE NO JOGO (o painel da staff do RACHA CONTROL cala o chat de um jogador por um tempo).
   O servidor das salas (server/silencio109.js) recusa as mensagens de quem está calado em todos os chats e manda o aviso com
   quanto falta e o motivo — aqui o jogo mostra ESSE aviso (o de antes dizia "silenciado por denúncias"):
   · brasil_error {reason:'silenciado', texto} no Chat do Brasil, dm_erro/clube_erro {reason:'silenciado', texto} no chat dos
     amigos e no do clube, e error {codigo:'silenciado_staff'} na sala, na equipe, nas falas e nos emojis da partida;
   · silenciado {ate, texto}: a equipe acabou de calar (ou de liberar) o chat — o aviso aparece na hora;
   · error {codigo:'expulso'}: a equipe tirou você da sala (o aviso, sem a volta para a tela dos amigos da v88).
   Sem o texto (um servidor de antes), tudo continua como era. Nada aqui mexe na partida nem na física. */
const V109S = {ate:0};
// um aviso só: no lobby, o balão de cima do lobby (o de texto longo, que fica mais tempo); na partida, o aviso de baixo
// (o #x49-toast fica por cima de tudo — os dois juntos no lobby eram o mesmo texto duas vezes)
function v109AvisoSilencio(t){
  if (!t) return;
  let noLobby = false;
  try { noLobby = typeof lobby === 'object' && !!lobby && !!lobby.aberto; } catch (_) {}
  if (noLobby){ try { v88Aviso(t); return; } catch (_) {} }
  try { x49Toast(t); } catch (_) {}
}
const net49MessageAntes109 = net49Message;
net49Message = function(m){
  if (m && m.type === 'silenciado'){
    V109S.ate = Number(m.ate) || 0;
    v109AvisoSilencio(String(m.texto || (V109S.ate ? 'A equipe do RACHA silenciou o seu chat.' : 'O seu chat está liberado.')));
    return;
  }
  if (m && (m.type === 'dm_erro' || m.type === 'clube_erro') && m.reason === 'silenciado' && m.texto){
    try { som.erro(); } catch (_) {}
    try { v88Aviso(String(m.texto)); } catch (_) {}
    return;
  }
  if (m && m.type === 'error' && (m.codigo === 'silenciado_staff' || m.codigo === 'expulso')){
    v109AvisoSilencio(String(m.message || ''));
    return;
  }
  return net49MessageAntes109.apply(this, arguments);
};
const brasilMsgAntes109 = brasilMsg;
brasilMsg = function(m){
  if (m && m.type === 'brasil_error' && m.reason === 'silenciado' && m.texto){
    try { c81Aviso(String(m.texto)); } catch (_) { try { aviso(String(m.texto)); } catch (__) {} }
    return;
  }
  return brasilMsgAntes109.apply(this, arguments);
};
window.RachaSilencio109 = {estado:() => ({ate:V109S.ate})};
