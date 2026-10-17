/* ==================================================================================================================
   RACHA rua v71.1 · AS TELAS DE DENTRO no estilo do lobby novo (o pedido: "agora muda o interior dos botões, quando clica
   nos botões; o perfil, tudo, os ajustes, quando pausa, todos mesmo"). Quase tudo é visual e mora no v71.css (a moldura,
   o cabeçalho, as abas, os botões, as janelas, os Ajustes, a pausa e o fim) e no v71-tema.css (o marinho vira carvão).
   Aqui fica só o que precisa de JS:
   · o PERFIL em partes (CARTÃO · ESTATÍSTICAS · RECORDES · PARTIDAS) em toda tela deitada — era só no celular; no
     computador era uma página de 4 telas de altura;
   · a tampinha padrão com o nome PADRÃO (o editor e o perfil chamavam de "Personalizada");
   · os desenhos das abas e dos botões da pausa, e o selo de cada modo/tempo na pausa.
   Nada aqui mexe em partida, física, rede, conta ou economia.
   ================================================================================================================== */
const V71T = {};

/* ---------------------------------------------------------------- o perfil em partes em toda tela deitada */
const v70PfAplicaAntes711 = v70PfAplica;
v70PfAplica = function(){
  v70PfAplicaAntes711.apply(this, arguments);
  const corpo = document.querySelector('#tela-perfil .pf-corpo'); if (!corpo) return;
  const em = !LB.raiz.classList.contains('retrato');
  corpo.classList.toggle('v70-pf-partes', em);
  for (const [id] of V70PF_PARTES) corpo.classList.toggle('ver-' + id, em && V70PF.parte === id);
};

/* ---------------------------------------------------------------- a padrão se chama PADRÃO */
const tpeNomeDeAntes711 = tpeNomeDe;
tpeNomeDe = function(D){
  try { if (D && D.k === 'T' && tpCodigo(D) === TP_PADRAO_COD) return 'Padrão'; } catch (_) {}
  return tpeNomeDeAntes711.apply(this, arguments);
};

/* ---------------------------------------------------------------- a loja: a cor da raridade em cada peça do dia */
const renderLojaAntes711 = renderLoja;
renderLoja = function(){
  const r = renderLojaAntes711.apply(this, arguments);
  try { for (const b of document.querySelectorAll('#tela-loja .v70-lj-peca')){ const t = (b.querySelector('small') || {}).textContent || '';
    b.dataset.r = /LEND/.test(t) ? 'lendario' : /PICO/.test(t) ? 'epico' : /RARO/.test(t) ? 'raro' : 'comum'; } } catch (_) {}
  return r;
};

/* ---------------------------------------------------------------- os desenhos (mesma família dos botões do lobby) */
const V71T_SVG = (() => {
  const k = V71_K, sv = c => '<svg viewBox="0 0 64 64" aria-hidden="true">' + c + '</svg>';
  return {
    continuar:sv('<path d="M20 12l32 20-32 20z" fill="#17191c" stroke="#17191c" stroke-width="6" stroke-linejoin="round"/>'),
    controles:sv('<rect x="6" y="18" width="52" height="30" rx="15" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><path d="M18 27v12M12 33h12" stroke="' + k + '" stroke-width="4.5" stroke-linecap="round"/>'
      + '<circle cx="42" cy="29" r="4" fill="#ff8a2a" stroke="' + k + '" stroke-width="2.5"/><circle cx="50" cy="36" r="4" fill="#2fbf5b" stroke="' + k + '" stroke-width="2.5"/>'),
    ajustes:sv('<path d="M35.6 6l1.4 6.4c1.7.5 3.3 1.2 4.8 2.1l5.6-3.5 4.6 4.6-3.5 5.6c.9 1.5 1.6 3.1 2.1 4.8L57 27.4v6.4l-6.4 1.4c-.5 1.7-1.2 3.3-2.1 4.8l3.5 5.6-4.6 4.6-5.6-3.5c-1.5.9-3.1 1.6-4.8 2.1L35.6 55h-6.4l-1.4-6.4c-1.7-.5-3.3-1.2-4.8-2.1l-5.6 3.5-4.6-4.6 3.5-5.6c-.9-1.5-1.6-3.1-2.1-4.8L8 33.8v-6.4l6.4-1.4c.5-1.7 1.2-3.3 2.1-4.8l-3.5-5.6 4.6-4.6 5.6 3.5c1.5-.9 3.1-1.6 4.8-2.1L29.2 6z" fill="#c9ced6" stroke="' + k + '" stroke-width="3.6" stroke-linejoin="round"/>'
      + '<circle cx="32.4" cy="30.6" r="9" fill="#2b3037" stroke="' + k + '" stroke-width="3.6"/>'),
    sair:sv('<path d="M14 8h22v48H14z" fill="#8a5a2b" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><circle cx="30" cy="33" r="2.6" fill="#ffd23f"/>'
      + '<path d="M40 32h18M50 23l9 9-9 9" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'),
    // as abas dos Ajustes
    audio:sv('<path d="M10 25h10l13-11v36L20 39H10z" fill="#f6f3ea" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><path d="M41 23c4 5 4 13 0 18M47 17c7 8 7 22 0 30" fill="none" stroke="#ffd23f" stroke-width="4.5" stroke-linecap="round"/>'),
    visual:sv('<path d="M4 32c8-12 18-18 28-18s20 6 28 18c-8 12-18 18-28 18S12 44 4 32z" fill="#f6f3ea" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><circle cx="32" cy="32" r="10" fill="#3f8cff" stroke="' + k + '" stroke-width="3.5"/><circle cx="32" cy="32" r="4" fill="' + k + '"/>'),
    camera:sv('<rect x="5" y="18" width="40" height="30" rx="6" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><path d="M45 27l14-8v28l-14-8z" fill="#ffd23f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/><circle cx="18" cy="28" r="4" fill="#e8452c"/>'),
    acess:sv('<circle cx="32" cy="11" r="6" fill="#f6f3ea" stroke="' + k + '" stroke-width="3.5"/><path d="M12 22l20 4 20-4M32 26v12l-9 18M32 38l9 18" fill="none" stroke="' + k + '" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<path d="M12 22l20 4 20-4M32 26v12l-9 18M32 38l9 18" fill="none" stroke="#f6f3ea" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'),
    conta:sv('<circle cx="32" cy="22" r="11" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><path d="M11 57c0-13 9-21 21-21s21 8 21 21z" fill="#2fbf5b" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>')
  };
})();

/* ---------------------------------------------------------------- os Ajustes: o desenho em cada aba */
(function v71AjustesAbas(){
  const ic = {audio:'audio', visual:'visual', controles:'controles', camera:'camera', acess:'acess', conta:'conta'};
  for (const id in ic){
    const b = document.getElementById('ajx-t-' + id); if (!b || b.querySelector('.v71-ic')) continue;
    const i = nodo('i', 'v71-ic'); i.innerHTML = V71T_SVG[ic[id]]; b.insertBefore(i, b.firstChild);
  }
})();

/* ---------------------------------------------------------------- a pausa: os desenhos nos botões
   (o SAIR troca de texto — SAIR PARA O LOBBY, DESISTIR, VER A SALA, TOQUE DE NOVO… — e o texto novo apaga o desenho: quem
   vigia os botões põe o desenho de volta) */
(function v71Pausa(){
  const p = document.getElementById('pausa'), ac = p && p.querySelector('.pa-acoes'); if (!ac) return;
  p.classList.add('v71-pausa');
  const IC = {'pa-continuar':V71T_SVG.continuar, 'pa-hud':V71T_SVG.controles, 'pa-ajustes':V71T_SVG.ajustes, 'pa-sair':V71T_SVG.sair};
  const poe = () => { for (const id in IC){ const b = document.getElementById(id); if (b && !b.querySelector('.v71-ic')){ const i = nodo('i', 'v71-ic'); i.innerHTML = IC[id]; b.insertBefore(i, b.firstChild); } } };
  poe();
  new MutationObserver(poe).observe(ac, {childList:true, subtree:true, characterData:true});
})();
