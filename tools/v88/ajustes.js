/* ======================================================================================================================
   RACHA v88 · OS AJUSTES QUE FALTAVAM (nos AJUSTES de sempre: Áudio, Visual, Controles, Câmera, Acessibilidade e Conta
   continuam iguais, com tudo o que já tinham). Entram:
   · ÁUDIO: o volume da MÚSICA e o dos EFEITOS (o Volume geral de antes continua por cima dos dois);
   · CONTROLES: a SENSIBILIDADE DO ANALÓGICO (o quanto o dedo precisa andar para começar a correr: a velocidade e as 32
     direções são as mesmas para todos) — o controle Bluetooth fica no controle.js;
   · ACESSIBILIDADE: o IDIOMA (o jogo está em português do Brasil; por enquanto é o único);
   · a aba nova PRIVACIDADE: as notificações dentro do jogo (por tipo), a privacidade da conta (no servidor: aparecer
     online, receber convites, perfil aberto, pedidos de amizade), os silenciados do chat e os bloqueados;
   · CONTA: EXCLUIR A CONTA (com a senha e a palavra EXCLUIR: o servidor apaga a conta e as relações; não tem volta).
   ====================================================================================================================== */
const V88AJ = {sens:1, priv:null, privErro:'', carregandoPriv:false, el:{}};
try { const s = +localStorage.getItem('racha88-analogico'); if (s >= .6 && s <= 1.6) V88AJ.sens = s; } catch (_) {}

/* ---- a sensibilidade do analógico: o dedo "anda" mais (ou menos) antes de chegar na zona morta. A direção e a velocidade não mudam ---- */
const getInputAntes88 = getInput;
getInput = function(){
  const s = V88AJ.sens;
  if (joy.id === null || s === 1) return getInputAntes88.apply(this, arguments);
  const dx = joy.dx, dy = joy.dy; joy.dx = dx*s; joy.dy = dy*s;
  try { return getInputAntes88.apply(this, arguments); } finally { joy.dx = dx; joy.dy = dy; }
};

/* ---- as peças da janela (do mesmo jeito das linhas de antes) ---- */
function v88AjFaixa(id, titulo, min, max, passo, valor, fmt, fn){
  const lin = nodo('label', 'aj-lin v88-aj-faixa'), sp = nodo('span', null, titulo), inp = nodo('input'), out = nodo('output');
  inp.type = 'range'; inp.min = String(min); inp.max = String(max); inp.step = String(passo); inp.value = String(valor); inp.id = id;
  const pinta = () => { out.textContent = fmt(+inp.value); inp.style.setProperty('--p', (100*(+inp.value - min)/(max - min)).toFixed(1) + '%'); };
  inp.addEventListener('input', () => { fn(+inp.value); pinta(); });
  pinta(); lin.append(sp, inp, out); lin.v88Pinta = v => { inp.value = String(v); pinta(); };
  return lin;
}
function v88AjChave(id, titulo, nota, on, fn){
  const lin = ajxChave(id, titulo, nota), b = lin.querySelector('button');
  ligado(b, on); b.addEventListener('click', () => { som.clique(); fn(b.getAttribute('aria-pressed') !== 'true', b); });
  return lin;
}
function v88AjNovaAba(id, nome, antes){                      // uma aba nova na janela (do mesmo jeito das de antes)
  if (AJX.secs[id]) return AJX.secs[id];
  const nav = AJX.raiz.querySelector('.ajx-abas'), corpo = AJX.raiz.querySelector('.ajx-corpo'); if (!nav || !corpo) return null;
  const t = novoBotao('ajx-aba'); t.id = 'ajx-t-' + id; t.textContent = nome; t.dataset.aba = id;
  const ic = nodo('i', 'v71-ic'); ic.innerHTML = v88Ic('privacidade'); t.insertBefore(ic, t.firstChild);   // (o desenho, como nas outras abas)
  t.setAttribute('role', 'tab'); t.setAttribute('aria-controls', 'ajx-' + id); t.setAttribute('aria-selected', 'false'); t.tabIndex = -1;
  const s = nodo('section', 'ajx-sec'); s.id = 'ajx-' + id; s.dataset.aba = id; s.setAttribute('role', 'tabpanel'); s.setAttribute('aria-labelledby', t.id); s.hidden = true;
  const i = AJX_ABAS.findIndex(a => a[0] === antes);
  if (i >= 0){ AJX_ABAS.splice(i, 0, [id, nome]); nav.insertBefore(t, AJX.abas[antes]); corpo.insertBefore(s, AJX.secs[antes]); }
  else { AJX_ABAS.push([id, nome]); nav.appendChild(t); corpo.appendChild(s); }
  AJX.abas[id] = t; AJX.secs[id] = s;
  return s;
}

/* ---- montar (no fim do arquivo, depois de tudo definido) ---- */
function v88AjMonta(){
  if (!AJX.secs || !AJX.secs.audio) return;
  const S = AJX.secs;
  // ÁUDIO: a música e os efeitos
  if (som.mistura){
    const g = ajxGrupo('Música e efeitos', 'O Volume de cima vale para tudo; aqui, cada parte do som.');
    const mx = som.mistura;
    V88AJ.el.mus = v88AjFaixa('v88-aj-mus', 'Música', 0, 100, 1, mx.musica, v => v + '%', v => som.setMistura(v, null));
    V88AJ.el.efx = v88AjFaixa('v88-aj-efx', 'Efeitos (chute, torcida, apito, botões)', 0, 100, 1, mx.efeitos, v => v + '%', v => som.setMistura(null, v));
    g.append(V88AJ.el.mus, V88AJ.el.efx); S.audio.appendChild(g);
  }
  // CONTROLES: a sensibilidade do analógico
  {
    const g = ajxGrupo('Analógico da tela', 'Mais sensível: anda com o dedo mais perto do centro. A velocidade e as direções são as mesmas para todos.');
    V88AJ.el.sens = v88AjFaixa('v88-aj-sens', 'Sensibilidade', 60, 160, 5, Math.round(V88AJ.sens*100), v => (v === 100 ? 'padrão' : v + '%'), v => {
      V88AJ.sens = v/100; try { localStorage.setItem('racha88-analogico', String(V88AJ.sens)); } catch (_) {}
    });
    g.appendChild(V88AJ.el.sens);
    const ed = S.controles.querySelector('.ajx-grupo'); if (ed && ed.nextSibling) S.controles.insertBefore(g, ed.nextSibling); else S.controles.appendChild(g);
  }
  // ACESSIBILIDADE: o idioma (o jogo está em português do Brasil)
  {
    const g = ajxGrupo('Idioma', null), lin = nodo('div', 'aj-lin'), tx = nodo('span', 'ajx-tx');
    tx.append(nodo('b', null, 'Português (Brasil)'), nodo('small', null, 'Por enquanto o RACHA só tem português. Quando tiver outro idioma, a escolha aparece aqui.'));
    lin.appendChild(tx); g.appendChild(lin); S.acess.appendChild(g);
  }
  // PRIVACIDADE (a aba nova, antes da Conta: as notificações, a privacidade da conta, os silenciados e os bloqueados)
  const sec = v88AjNovaAba('social', 'Privacidade', 'conta');   // (o nome curto: as 7 abas cabem no celular deitado)
  if (sec) V88AJ.el.social = sec;                             // (pinta quando a aba abre: o ajxSync)
  // CONTA: excluir a conta
  {
    const g = ajxGrupo('Excluir a conta', 'Apaga a conta do RACHA no servidor: o perfil, os amigos, o clube (o dono passa para outro), as mensagens, o correio e os itens. Não tem volta.');
    g.classList.add('v88-aj-excluir');
    const b = novoBotao('lb-btn vermelho ajx-acao v88-aj-excluir-bt'); b.textContent = 'EXCLUIR MINHA CONTA';
    b.addEventListener('click', () => { som.clique(); v88ExcluirAbre(); });
    g.appendChild(b); S.conta.appendChild(g); V88AJ.el.excluir = g;
  }
}
function v88AjSync(){
  try {
    const el = V88AJ.el;
    if (el.mus && som.mistura) el.mus.v88Pinta(som.mistura.musica);
    if (el.efx && som.mistura) el.efx.v88Pinta(som.mistura.efeitos);
    if (el.sens) el.sens.v88Pinta(Math.round(V88AJ.sens*100));
    if (el.excluir) el.excluir.hidden = !v88Logado();
    if (el.social && AJX.aba === 'social') v88AjSocial();
  } catch (_) {}
}
const ajxSyncAntes88 = ajxSync;
ajxSync = function(){ const r = ajxSyncAntes88.apply(this, arguments); v88AjSync(); return r; };

/* ---- a aba PRIVACIDADE (notificações, privacidade da conta, silenciados e bloqueados) ---- */
const V88_NOTIF = [['tudo', 'Avisos dentro do jogo', 'O balão de cima quando chega algo (com o jogo aberto).'], ['amigos', 'Amigos', 'Pedidos de amizade e quem aceitou'], ['convites', 'Convites para jogar', 'Quando alguém chama você para a sala'],
  ['clube', 'Clube', 'Convites, pedidos e avisos do clube'], ['recompensas', 'Prêmios e correio', 'Cartas para coletar e recompensas'], ['sistema', 'Avisos do RACHA', 'Manutenção, eventos e novidades']];
function v88NotifSalva(cat, on){ try { const o = JSON.parse(localStorage.getItem('racha88-notif') || '{}'); o[cat] = !!on; localStorage.setItem('racha88-notif', JSON.stringify(o)); } catch (_) {} }
const V88_PRIV = [['mostraOnline', 'Aparecer online para os amigos', 'Desligado, você aparece offline (e ninguém vê em que sala você está)'],
  ['aceitaConvites', 'Receber convites para jogar', 'Desligado, os amigos não conseguem chamar você para a sala'],
  ['aceitaPedidos', 'Receber pedidos de amizade', 'Desligado, só você manda pedidos'],
  ['perfilPublico', 'Perfil aberto', 'Ligado, quem não é seu amigo também vê o seu perfil completo']];
function v88AjSocial(){
  const sec = V88AJ.el.social; if (!sec) return;
  const foco = document.activeElement && sec.contains(document.activeElement) ? document.activeElement.id : '';
  sec.textContent = '';
  const g1 = ajxGrupo('Notificações', 'Os avisos aparecem só com o jogo aberto (o RACHA não manda notificação fora do jogo).');
  let o = {}; try { o = JSON.parse(localStorage.getItem('racha88-notif') || '{}') || {}; } catch (_) {}
  for (const [k, t, n] of V88_NOTIF){
    const lin = v88AjChave('v88-nt-' + k, t, n, o[k] !== false, on => { v88NotifSalva(k, on); v88AjSocial(); });
    if (k !== 'tudo' && o.tudo === false){ lin.classList.add('apagada'); lin.querySelector('button').disabled = true; }
    g1.appendChild(lin);
  }
  sec.appendChild(g1);
  const g2 = ajxGrupo('Privacidade da conta', 'Fica guardada na sua conta (vale em qualquer aparelho).');
  if (!v88Logado()){ g2.appendChild(nodo('p', 'ajx-nota', 'Entre na conta para mudar a privacidade. Sem conta, você joga offline e ninguém vê você online.')); }
  else if (!V88AJ.priv){
    if (V88AJ.privErro){ g2.appendChild(nodo('p', 'ajx-nota', 'Não deu para carregar (' + V88AJ.privErro + ').')); const b = novoBotao('lb-btn ajx-acao'); b.textContent = 'TENTAR DE NOVO'; b.addEventListener('click', () => { som.clique(); V88AJ.privErro = ''; v88PrivCarrega(); }); g2.appendChild(b); }
    else { g2.appendChild(nodo('p', 'ajx-nota', 'Carregando…')); v88PrivCarrega(); }
  } else {
    for (const [k, t, n] of V88_PRIV){
      g2.appendChild(v88AjChave('v88-pv-' + k, t, n, !!V88AJ.priv[k], (on, b) => {
        b.disabled = true;
        v88M('social.definirPrivacidade', {[k]:on}).then(p => { V88AJ.priv = Object.assign({}, V88AJ.priv, p || {}); v88RelacoesMudaram(); v88AjSocial(); })
          .catch(e => { b.disabled = false; v88Aviso('Não deu para mudar: ' + e.message); });
      }));
    }
  }
  sec.appendChild(g2);
  const g3 = ajxGrupo('Chat e bloqueios', null);
  const mudos = v88Silenciados();
  g3.appendChild(nodo('p', 'ajx-nota', mudos.length ? 'Silenciados no chat (só neste aparelho): ' + mudos.length + '.' : 'Ninguém silenciado no chat.'));
  if (mudos.length){ const b = novoBotao('lb-btn ajx-acao'); b.textContent = 'TIRAR TODOS DO SILÊNCIO'; b.addEventListener('click', () => { som.clique(); for (const q of mudos) v88Silencia(q, false); v88AjSocial(); }); g3.appendChild(b); }
  if (v88Logado()){ const b = novoBotao('lb-btn ajx-acao'); b.textContent = 'VER OS BLOQUEADOS'; b.addEventListener('click', () => { som.clique(); ajxFecha(); if (lobby.aberto){ V88.amgAba = 'bloqueados'; abreTela('v88amigos'); } else v88Aviso('Os bloqueados ficam em AMIGOS, no lobby.'); }); g3.appendChild(b); }
  sec.appendChild(g3);
  if (foco){ const f = document.getElementById(foco); if (f) try { f.focus({preventScroll:true}); } catch (_) {} }
}
function v88PrivCarrega(){
  if (V88AJ.carregandoPriv || !v88Logado()) return;
  V88AJ.carregandoPriv = true;
  v88Q('social.privacidade').then(p => { V88AJ.priv = p || {}; }).catch(e => { V88AJ.privErro = e.message || 'sem conexão'; })
    .finally(() => { V88AJ.carregandoPriv = false; if (AJX.aba === 'social') v88AjSocial(); });
}
v88On('resumo', r => { if (!r){ V88AJ.priv = null; } });

/* ---- excluir a conta ---- */
function v88ExcluirAbre(){
  if (!v88Logado()) return v88Aviso('Entre na conta primeiro.');
  if (!lobby.aberto) return v88Aviso('Volte ao lobby para excluir a conta.');
  ajxFecha();
  abrePop(c => {
    c.classList.add('v88-pop', 'v88-pop-perigo');
    c.append(nodo('span', 'pop-tag', 'CONTA'), nodo('h2', null, 'EXCLUIR A CONTA?'),
      nodo('p', 'pop-txt', 'A conta ' + (C82.conta.nome || '') + ' (ID ' + v88Pub(C82.conta.idPublico) + ') some do servidor: perfil, amigos, clube, mensagens, correio, itens e moedas. Não tem como desfazer.'));
    const f = nodo('div', 'v88-form');
    const s = nodo('input'); s.type = 'password'; s.placeholder = 'Sua senha'; s.autocomplete = 'current-password'; s.maxLength = 100; s.setAttribute('aria-label', 'Sua senha');
    const w = nodo('input'); w.type = 'text'; w.placeholder = 'Digite EXCLUIR'; w.maxLength = 10; w.autocapitalize = 'characters'; w.setAttribute('aria-label', 'Digite EXCLUIR para confirmar');
    const msg = nodo('p', 'v88-form-msg'); msg.setAttribute('role', 'alert');
    f.append(s, w, msg); c.appendChild(f);
    const a = nodo('div', 'pop-acoes'), ok = botaoPop('EXCLUIR', 'vermelho', () => {
      if (w.value.trim().toUpperCase() !== 'EXCLUIR'){ msg.textContent = 'Digite EXCLUIR (em letras maiúsculas) para confirmar.'; som.erro(); return; }
      if (!s.value){ msg.textContent = 'Digite a sua senha.'; som.erro(); return; }
      ok.disabled = true; msg.textContent = 'Excluindo…';
      v88M('conta.excluir', {senha:s.value, confirmacao:'EXCLUIR'}).then(() => {
        msg.textContent = 'Conta excluída.';
        try { window.RACHA84 && window.RACHA84.saiu(); } catch (_) {}
        setTimeout(() => location.reload(), 900);
      }).catch(e => { ok.disabled = false; msg.textContent = e.message || 'Não deu certo.'; som.erro(); });
    });
    a.append(botaoPop('CANCELAR', '', () => { som.clique(); fechaPop(); }), ok); c.appendChild(a);
    setTimeout(() => { try { s.focus(); } catch (_) {} }, 60);
  });
}
try { v88AjMonta(); } catch (e) { console.error('v88 ajustes', e); }
