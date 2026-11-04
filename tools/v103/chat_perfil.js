/* ======================================================================================================================
   RACHA v103 · O PERFIL PELO CHAT (o pedido: "poder clicar no perfil dos players pelo chat")
   Tocar no nome de quem escreveu (no Chat do Brasil, no chat da sala e no da partida) abre a ficha da v81, com o VER PERFIL
   da v88 (o perfil dentro do jogo) para quem está logado. O que falhava: NA PARTIDA o lobby fica escondido e a janela do
   perfil abria dentro dele — tocar no VER PERFIL não mostrava nada. Agora:
     · na partida, o perfil abre por cima do jogo (a camada do lobby aparece só com a janela; fechar volta ao jogo);
     · a ficha de quem tem conta sempre tem o VER PERFIL como o primeiro botão (sem conta: a ficha diz que não tem perfil);
     · tocar na tampinha da ficha também abre o perfil;
     · a sua própria ficha abre o seu perfil do jogo (no lobby) — na partida, o do site por cima, como antes.
   ====================================================================================================================== */
function v103PerfilAbre(conta){
  try { c81FichaFecha(); } catch (_) {}
  if (typeof v88AbrePerfil !== 'function') return;
  if (!lobby.aberto && LB && LB.raiz){                      // (na partida: só a janela do perfil, por cima do jogo)
    LB.raiz.classList.add('v103-pop-jogo'); LB.raiz.hidden = false;
  }
  v88AbrePerfil(conta);
}
function v103PopJogoFecha(){
  try {
    if (!LB.raiz.classList.contains('v103-pop-jogo') || !LB.pop.hidden) return;
    LB.raiz.classList.remove('v103-pop-jogo');
    if (!lobby.aberto) LB.raiz.hidden = true;
  } catch (_) {}
}
if (typeof c81FichaAbre === 'function'){
  const c81FichaAbreAntes103 = c81FichaAbre;
  c81FichaAbre = function(m, sala){
    const out = c81FichaAbreAntes103.apply(this, arguments);
    try {
      const F = C81.ficha; if (!F) return out;
      const id = c81Id(m, sala), conta = c81Conta(id), eu = c81Eu(m, sala), logado = typeof v88Logado === 'function' && v88Logado();
      const acoes = F.querySelector('.c81-f-acoes'); if (!acoes) return out;
      const ver = [...acoes.querySelectorAll('.c81-f-bt')].find(b => /VER PERFIL/.test(b.textContent || ''));
      if (conta && !eu){
        if (!ver){                                          // (sem o botão: o perfil dentro do jogo)
          const k = novoBotao('c81-f-bt amarelo v103-ver-perfil', 'Ver o perfil de ' + c81Nome(m, sala)); const i = nodo('i'); i.innerHTML = C81_SVG.perfil;
          k.append(i, nodo('span', null, 'VER PERFIL')); k.addEventListener('click', () => { som.clique(); v103PerfilAbre(conta); });
          acoes.insertBefore(k, acoes.firstChild);
        } else if (logado){                                 // (o da v88: o mesmo perfil, agora também na partida)
          const k = ver.cloneNode(true); k.classList.add('v103-ver-perfil'); k.addEventListener('click', () => { som.clique(); v103PerfilAbre(conta); });
          ver.replaceWith(k); if (k !== acoes.firstChild) acoes.insertBefore(k, acoes.firstChild);
        }
      } else if (conta && eu && ver && logado && lobby.aberto){   // (a sua: o seu perfil do jogo)
        const k = ver.cloneNode(true); k.classList.add('v103-ver-perfil'); k.addEventListener('click', () => { som.clique(); c81FichaFecha(); cbFecha(); abreTela('perfil'); });
        ver.replaceWith(k);
      }
      const tp = F.querySelector('.c81-f-tampa');
      if (tp && conta && !eu){
        tp.classList.add('v103-toca'); tp.setAttribute('role', 'button'); tp.tabIndex = 0; tp.setAttribute('aria-label', 'Ver o perfil de ' + c81Nome(m, sala));
        tp.addEventListener('click', () => { som.clique(); v103PerfilAbre(conta); });
      }
      if (!conta && !eu){ const sm = F.querySelector('.c81-f-tx small'); if (sm && !/sem conta/.test(sm.textContent)) sm.textContent += ' · sem conta (sem perfil)'; }
    } catch (e) { console.error('v103 perfil pelo chat', e); }
    return out;
  };
}
if (typeof fechaPop === 'function'){
  const fechaPopAntes103 = fechaPop;
  fechaPop = function(){ const r = fechaPopAntes103.apply(this, arguments); v103PopJogoFecha(); return r; };
}
setInterval(v103PopJogoFecha, 500);                          // (a janela fechada por outro caminho: a camada some também)
window.RachaChatPerfil103 = {abre:v103PerfilAbre};
