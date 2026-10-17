/* ==================================================================================================================
   RACHA rua v80 · TIME A (LARANJA) × TIME B (ROXO) (entra no fim do script, depois da v79; as trocas de texto em times.py)
   O pedido: "duas cores rivais oficiais em todo o RACHA: Time A laranja #FF6A00 e Time B roxo #7A3FC4, no placar e na
   identificação de cada time, com bom contraste com o gramado e com a interface. A tampinha inicial gratuita usa o modelo
   Listras: sem equipe, metade laranja e metade roxa; no Time A toda laranja; no Time B toda roxa; nas salas também; só a
   padrão muda (as compradas, desbloqueadas e personalizadas ficam como são)."
   · Os dois times são o TIME A (o 0: o da esquerda; o seu, contra os bots) e o TIME B (o 1), em todo lugar: ranqueada,
     treino, sala neste aparelho, sala online, copa e replay. O halo, o contorno, o placar, a apresentação, a tela do fim,
     a saída de bola, a rede, a torcida e as telas da sala seguem as duas cores.
   · A tampinha padrão (TP_PADRAO_COD, em times.py) é a Listras com o fundo laranja à esquerda e uma listra roxa do meio
     para a direita; a borda e os detalhes são os de sempre. No time ela fica de uma cor só (TP_TIME_COD); sem time (no
     lobby, no perfil, no treino, assistindo na sala) volta para a metade/metade. Os bots jogam com a padrão do time.
   · A troca de time aparece na hora para todos: cada jogo desenha a tampinha de cada um pela vaga dele na sala (a sala
     vem do servidor a cada mudança), então ninguém precisa mandar nada novo.
   · Quem estava com a padrão da v71 (metade preta, metade branca) passa para a nova uma vez (racha-v80-padrao); a padrão
     da v71 que chega de um jogo antigo (de outra pessoa) também aparece como a nova.
   Nada aqui mexe na física: só cor, nome e qual desenho cada um usa.
   ================================================================================================================== */
const TIME80 = [
  {nome:'Time A', curto:'A', base:'#ff6a00', claro:'#ffb46e', escuro:'#7a2e00', txt:'#ffffff', contra:'#ffffff'},
  {nome:'Time B', curto:'B', base:'#7a3fc4', claro:'#d0b0ff', escuro:'#341063', txt:'#ffffff', contra:'#ffffff'}
];
TIME71.forEach((c, i) => Object.assign(c, TIME80[i]));                  // (rqCor devolve estes: o placar, o halo, a apresentação…)
TIME71_SKIN.forEach((s, i) => { s.nome = TIME80[i].nome; s.cor = TIME80[i].base; });   // (skinDoTime: a cor do time)
SALA_COR.forEach((s, i) => { s.nome = TIME80[i].nome; s.cor = TIME80[i].base; });

/* ---------------------------------------------------------------- a tampinha de cada um */
const tp80Padrao = cod => cod === TP_PADRAO_COD || cod === TP_PADRAO_PB;   // (a da v71 que chega de outro jogo também é "a padrão")
const tp80Time = t => t === 0 || t === 1 ? t : -1;                         // -1: sem time
tpNoTime = function(cod, t){                             // a padrão: no time, de uma cor só; sem time, a metade/metade · as outras ficam como são
  if (!tp80Padrao(cod)) return cod;
  t = tp80Time(t); return t < 0 ? TP_PADRAO_COD : TP_TIME_COD[t];
};
tpNoTimeSk = function(sk, t){
  if (!sk || !tp80Padrao(sk.id)) return sk;
  t = tp80Time(t); return tpSkin(t < 0 ? TP_PADRAO_COD : TP_TIME_COD[t]) || sk;
};
const tpSkinAntes80 = tpSkin;
tpSkin = function(cod){ return tpSkinAntes80.call(this, cod === TP_PADRAO_PB ? TP_PADRAO_COD : cod); };   // a padrão da v71 vira a nova
try {                                                    // quem estava com a padrão da v71 passa para a nova (uma vez)
  if (!localStorage.getItem('racha-v80-padrao')){
    if (TP.equipada === TP_PADRAO_PB){ TP.equipada = ''; tpSalva(); }
    if (perfil.skin === TP_PADRAO_PB){ perfil.skin = tpMinha(); perfilSalvar(); }
    localStorage.setItem('racha-v80-padrao', '1');
  }
} catch (_) {}
if (perfil.skin === TP_PADRAO_PB && !TP.equipada) perfil.skin = tpMinha();

/* ---------------------------------------------------------------- a tela do fim: os dois números em branco com sombra */
const rqMostraFimAntes80t = rqMostraFim;
rqMostraFim = function(){
  const r = rqMostraFimAntes80t.apply(this, arguments);
  try { for (const id of ['fim-v', 'fim-a']){ const el = fimEl(id); if (el) el.style.textShadow = ''; } } catch (_) {}
  return r;
};

window.RachaTimes80 = {
  cores:() => [0, 1].map(t => Object.assign({}, rqCor(t))),
  padrao:() => TP_PADRAO_COD, doTime:t => TP_TIME_COD[t ? 1 : 0], antiga:() => TP_PADRAO_PB,
  desenho:cod => tpLe(cod)
};
