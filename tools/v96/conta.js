/* ======================================================================================================================
   RACHA v96 · A CONTA FORA DOS AJUSTES e O ANEL DO CHUTE SUAVE (tools/v96/conta.js, colado depois das tampinhas).
   Os pedidos (com o print dos AJUSTES › Conta): "tire o modo conta das configurações" e "quando o jogador chuta a bola, o
   arco ao redor tem que ser uma opacidade baixa".
   1) Os AJUSTES ficam com 6 abas (Áudio, Visual, Controles, Câmera, Acessibilidade e Privacidade): a aba Conta saiu.
      · o que era de jogo continua nos Ajustes: o "Chat do Brasil" e o "Chat na tela" foram para Privacidade (em cima);
      · o que era da conta virou a janela SUA CONTA, que abre pelo selo ao lado do seu ID no PERFIL ("CONTA" ou "NESTE
        APARELHO"): o cartão da conta (ou o SEM CONTA com o ENTRAR e o CRIAR CONTA), o SALVAR AGORA, o SAIR DA CONTA, o
        RACHA CONTROL (a equipe), o progresso deste aparelho (EXPORTAR e IMPORTAR), o ZERAR PROGRESSO e o EXCLUIR MINHA
        CONTA. É a mesma janela por baixo (o mesmo desenho e os mesmos botões, sem as abas e com o nome SUA CONTA), então
        tudo o que pintava a aba Conta continua pintando aqui; quem chama ajxAbre('conta') abre a SUA CONTA.
      · o "Servidor do jogo" (Avançado) saiu da tela: o endereço vem do config.js da publicação ou do link
        (…/racha.html?servidor=ENDERECO); o que já estava guardado no aparelho continua valendo.
   2) O anel do chute: apertou o CHUTE (ou o PASSE), o anel acende em branco BEM SUAVE (no máximo 30% — era o branco forte da
      v95); segurando fica, soltou some rápido, como antes. Vale na partida, no online, no replay e na Oficina.
   Só a arrumação das telas e o desenho: nada da conta, do chat, do chute ou da física muda.
   ====================================================================================================================== */
const V96C = { modo: false, titulo: '', chat: null, foco: null };

/* ---------------------------------------------------------------- 2) o anel do chute: o branco com opacidade baixa */
try { V95S.luz = 0.3; } catch (_) {}                         // (tools/v95/times.js e tools/oficina/desenho.js multiplicam por ele)

/* ---------------------------------------------------------------- 1a) a aba Conta sai da faixa dos Ajustes */
(function v96TiraAbaConta() {
  if (typeof AJX === 'undefined' || !AJX.secs || !AJX.secs.conta) return;
  const i = AJX_ABAS.findIndex(a => a[0] === 'conta');
  if (i >= 0) AJX_ABAS.splice(i, 1);                          // (as setas do teclado e o ajxAba passam só pelas outras)
  const t = AJX.abas.conta; if (t && t.parentNode) t.remove();
  AJX.secs.conta.hidden = true;
  if (AJX.aba === 'conta') AJX.aba = 'audio';
  // o que não é da conta: o chat vai para Privacidade; o servidor e o título CONTA saem da tela
  const S = AJX.secs.conta, linha = id => { const n = document.getElementById(id); return n ? n.closest('.aj-lin') : null; };
  const chat = ajxGrupo('Chat', null); chat.classList.add('v96-aj-chat');
  for (const id of ['aj-chat', 'aj-chat-tela']) { const l = linha(id); if (l) chat.appendChild(l); }
  V96C.chat = chat;
  for (const h of S.querySelectorAll('h3.aj-sec')) if (/AVAN|CONTA/i.test(h.textContent)) { h.hidden = true; h.classList.add('v96-fora'); }
  const serv = linha('aj-serv'); if (serv) { serv.hidden = true; serv.classList.add('v96-fora'); }
  v96PoeChat();
})();
function v96PoeChat() {                                        // (Privacidade › Chat, em cima; a aba se pinta de novo sempre que abre)
  const sec = AJX.secs && AJX.secs.social, g = V96C.chat;
  if (!sec || !g) return;
  if (g.parentNode !== sec || sec.firstChild !== g) sec.insertBefore(g, sec.firstChild);
}
if (typeof v88AjSocial === 'function') {
  const v88AjSocialAntes96 = v88AjSocial;
  v88AjSocial = function () { const r = v88AjSocialAntes96.apply(this, arguments); try { v96PoeChat(); } catch (_) {} return r; };
}

/* ---------------------------------------------------------------- 1b) a janela SUA CONTA (a mesma janela, sem as abas) */
function v96ContaAbre(volta) {
  if (typeof AJX === 'undefined' || !AJX.secs || !AJX.secs.conta) return;
  const h2 = document.getElementById('ajx-tit');
  if (!V96C.modo) { V96C.titulo = h2 ? h2.textContent : 'AJUSTES'; }
  V96C.modo = true;
  AJX.raiz.classList.add('v96-conta');
  if (h2) h2.textContent = 'SUA CONTA';
  AJX.raiz.setAttribute('aria-label', 'Sua conta');
  for (const k in AJX.secs) AJX.secs[k].hidden = k !== 'conta';
  AJX.volta = volta || (document.activeElement && document.activeElement !== document.body ? document.activeElement : null);
  try { syncAjustes(); } catch (_) {}
  AJX.raiz.hidden = false;
  try { ajxSync(); } catch (_) {}
  for (const k in AJX.secs) AJX.secs[k].hidden = k !== 'conta';   // (o sync pinta; a janela continua só com a conta)
  requestAnimationFrame(() => {                              // o foco: o primeiro botão da conta (o ENTRAR, ou o SALVAR AGORA)
    try { const b = [...AJX.secs.conta.querySelectorAll('button, input')].find(n => !n.disabled && n.offsetParent !== null); if (b) b.focus({ preventScroll: true }); } catch (_) {}
  });
}
function v96ContaSai() {
  if (!V96C.modo) return;
  V96C.modo = false;
  AJX.raiz.classList.remove('v96-conta');
  AJX.raiz.removeAttribute('aria-label');
  const h2 = document.getElementById('ajx-tit'); if (h2 && V96C.titulo) h2.textContent = V96C.titulo;
  AJX.secs.conta.hidden = true;
  for (const [k] of AJX_ABAS) if (AJX.secs[k]) AJX.secs[k].hidden = k !== AJX.aba;
}
if (typeof ajxAbre === 'function') {
  const ajxAbreAntes96 = ajxAbre;
  ajxAbre = function (aba, volta) {
    if (aba === 'conta') return v96ContaAbre(volta);
    if (V96C.modo) v96ContaSai();
    if (AJX.aba === 'conta' || !AJX.secs[AJX.aba]) AJX.aba = 'audio';
    return ajxAbreAntes96.call(this, aba, volta);
  };
}
if (typeof ajxAba === 'function') {
  const ajxAbaAntes96 = ajxAba;
  ajxAba = function (id, foca) {
    if (id === 'conta') { v96ContaAbre(); return; }
    if (V96C.modo) { if (AJX.raiz.hidden) v96ContaSai(); else return; }   // (aberta como SUA CONTA: as abas não existem)
    const r = ajxAbaAntes96.apply(this, arguments);
    try { AJX.secs.conta.hidden = true; } catch (_) {}
    return r;
  };
}
if (typeof ajxSync === 'function') {                          // (o que pinta a janela não mostra as abas na SUA CONTA)
  const ajxSyncAntes96 = ajxSync;
  ajxSync = function () {
    const r = ajxSyncAntes96.apply(this, arguments);
    try { if (V96C.modo) for (const k in AJX.secs) AJX.secs[k].hidden = k !== 'conta'; else if (AJX.secs.conta) AJX.secs.conta.hidden = true; } catch (_) {}
    try { v96PoeChat(); } catch (_) {}
    return r;
  };
}
try {                                                         // fechou (PRONTO, ✕, Escape, tocar fora): volta a ser a janela dos Ajustes
  new MutationObserver(() => { if (AJX.raiz.hidden && V96C.modo) v96ContaSai(); }).observe(AJX.raiz, { attributes: true, attributeFilter: ['hidden'] });
} catch (_) {}

/* ---------------------------------------------------------------- 1c) o selo do PERFIL abre a SUA CONTA (com ou sem conta) */
function v96SeloConta() {
  const sel = document.querySelector('#tela-perfil .pf-ident'); if (!sel) return;
  const conta = sel.classList.contains('conta');
  sel.setAttribute('role', 'button'); sel.tabIndex = 0;
  sel.title = conta ? 'Sua conta: sair, salvar, exportar o progresso, excluir' : 'Sua conta: entrar, criar conta, exportar ou zerar o progresso deste aparelho';
  sel.setAttribute('aria-label', conta ? 'Abrir a sua conta' : 'Abrir a sua conta (sem conta: o progresso deste aparelho)');
  sel.classList.add('v96-selo');
  if (sel.dataset.v96) return;
  sel.dataset.v96 = '1';
  const abre = e => { e.preventDefault(); e.stopImmediatePropagation(); try { som.clique(); } catch (_) {} v96ContaAbre(sel); };
  sel.addEventListener('click', abre, true);                  // (antes do ENTRAR da v82: o selo agora abre a janela inteira)
  sel.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') abre(e); }, true);
}
if (typeof renderPerfil === 'function') {
  const renderPerfilAntes96 = renderPerfil;
  renderPerfil = function () { const r = renderPerfilAntes96.apply(this, arguments); try { v96SeloConta(); } catch (_) {} return r; };
}

window.RachaConta96 = { abre: v96ContaAbre, aberta: () => V96C.modo && !AJX.raiz.hidden, abas: () => AJX_ABAS.map(a => a[0]), luz: () => V95S.luz };
