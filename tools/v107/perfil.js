/* ======================================================================================================================
   RACHA v107 · O PERFIL PELO NOME — NO CHAT, NA SALA E NA PARTIDA (tools/v107/perfil.js + app/public/game/v107-perfil.css;
   o convite pelo chat no servidor: server/convite107.js)
   O pedido (05/11/2026): "Na foto que mandei, como você pode ver, se clicar no nome de alguém no chat você pode entrar no
   perfil da pessoa, adicionar ela e ver estatísticas — quero isso no chat. E nas salas personalizadas poder clicar no perfil
   da pessoa e ver." (A foto era de outro jogo: de lá vem só o jeito — a janelinha do lado do nome com três botões grandes
   empilhados. O desenho é o do RACHA: o azul-marinho, o contorno preto, os botões com o degrau.)
   1) A JANELINHA DO NOME: tocar no nome de alguém em qualquer chat (o Chat do Brasil no painel — o que a barra do lobby abre —
      e na tela inteira, o da sala, o da partida, o da equipe, o do clube e o dos amigos) abre, colada no nome (a pontinha
      aponta para ele; sempre dentro da tela e da área segura), PERFIL (azul), CONVIDAR (verde) e DENUNCIAR (vermelho), e
      embaixo Silenciar e Bloquear. Fecha tocando fora, no ✕ ou no Esc. É a ficha de sempre por baixo (o c81FichaAbre da v81
      com a v88 e a v103: o cabeçalho, a denúncia com o motivo ali mesmo, o DENUNCIADA), arrumada como a janelinha. O seu
      nome: MEU PERFIL (sem convidar nem denunciar). Quem não tem conta: o PERFIL diz "sem conta" e o CONVIDAR fica apagado
      com o motivo.
   2) PERFIL: o perfil do jogo (os números, a COMPETIÇÃO e o ADICIONAR) — no lobby, na sala e por cima da partida (o
      v103PerfilAbre). Sem estar na conta, diz que precisa entrar (e, no lobby, abre o ENTRAR NA CONTA).
   3) CONVIDAR: chama quem escreveu para a SUA sala, mesmo quem não é seu amigo (convite {mid, canal}: o servidor acha quem
      escreveu a mensagem recente e confere tudo, com os limites — server/convite107.js); os amigos vão pelo ID, como no
      AMIGOS › CHAMAR. Sem sala, o aviso de sempre ("Crie ou entre numa sala para convidar."). Quem recebe vê o convite de
      sempre (ENTRAR ou RECUSAR) dizendo que veio pelo chat.
   4) A SALA E O PAINEL DA PARTIDA: tocar no cartão de alguém (a tela da sala) ou no nome (o painel dos jogadores da partida)
      mostra o perfil para todo mundo — quem não é o árbitro ganha a janelinha com o PERFIL; o árbitro, a ficha de sempre com
      o VER PERFIL primeiro (no painel da partida, por cima do jogo). Só contas: o bot, a vaga livre e o visitante não têm.
      O toque continua o toque: os ganchos são as funções que abrem as fichas (slClique, v103Ficha) e o clique do painel — o
      segurar e arrastar do árbitro (v104) não muda e o toque depois de um arrasto não abre nada.
   Nada aqui mexe na física, nos controles, na partida, no que o chat mostra nem nos emojis.
   ====================================================================================================================== */
const PF107 = {pop:null, seta:null, casa:null, ancora:null, ancoraT:0, ret:null, aberta:'', ctx:'', lobbyAbre:null, membro:null,
  conv:new Map(), pend:null, arrastouT:0, vigia:0, ligado:false, camadaJogo:false, lado:'', engole:0, ctxNovo:''};
const PF107_CONV_MS = 2*60e3;   // (o mesmo do servidor: a mesma pessoa, um convite a cada 2 min)

/* ---------------------------------------------------------------- 0) o básico */
function pf107Logado(){ try { return typeof v88Logado === 'function' && v88Logado(); } catch (_) { return false; } }
function pf107PubDoId(id){ try { return c81Conta(id); } catch (_) { const m = /^c(\d{1,9})$/.exec(String(id || '')); return m ? String(Number(m[1])).padStart(6, '0') : ''; } }
function pf107Amigo(pub){ try { return !!pub && Array.isArray(V88.amigos) && V88.amigos.some(c => v88Pub(c.idPublico) === pub); } catch (_) { return false; } }
function pf107Ins(){ try { return lbInsets(); } catch (_) { return {t:0, r:0, b:0, l:0}; } }
function pf107Ic(nome){
  try { const i = v88IcEl(nome); i.classList.add('pf107-ic'); return i; }
  catch (_) { const i = nodo('i', 'pf107-ic'); i.innerHTML = (typeof C81_SVG !== 'undefined' && C81_SVG[nome]) || ''; return i; }
}
// um botão grande (o rótulo num <span>, o motivo num <small>: os testes de antes leem o .c81-f-bt span)
function pf107Bt(txt, cor, ic, fn, sub, rot){
  const b = novoBotao('c81-f-bt pf107-bt pf107-' + cor, rot || null);
  b.append(pf107Ic(ic), nodo('span', 'pf107-rot', txt));
  if (sub){ b.appendChild(nodo('small', 'pf107-sub', sub)); b.classList.add('pf107-com-sub'); }
  if (fn) b.addEventListener('click', fn);
  return b;
}
function pf107Link(txt, fn, cls){
  const b = novoBotao('c81-f-bt pf107-link' + (cls ? ' ' + cls : ''));
  b.appendChild(nodo('span', null, txt)); b.addEventListener('click', fn); return b;
}
function pf107Sub(b, t){                                      // o motivo embaixo do rótulo (troca na hora)
  if (!b) return;
  let s = b.querySelector('.pf107-sub'); if (!s){ s = nodo('small', 'pf107-sub'); b.appendChild(s); b.classList.add('pf107-com-sub'); }
  s.textContent = t; b.classList.remove('pf107-pisca'); void b.offsetWidth; b.classList.add('pf107-pisca');
}

/* ---------------------------------------------------------------- 1) o lugar da janelinha: colada no que foi tocado, dentro da tela */
function pf107Seta(lado, ret, b){
  let s = PF107.seta;
  if (!s){ s = PF107.seta = nodo('i', 'pf107-seta'); s.setAttribute('aria-hidden', 'true'); s.hidden = true; document.body.appendChild(s); }
  if (!lado || !ret){ s.hidden = true; PF107.lado = ''; return; }
  let sx, sy;
  if (lado === 'dir' || lado === 'esq'){
    sy = Math.max(b.y + 18, Math.min(b.y + b.h - 18, ret.top + ret.height/2));
    sx = lado === 'dir' ? b.x + 2 : b.x + b.w - 2;
  } else {
    sx = Math.max(b.x + 20, Math.min(b.x + b.w - 20, ret.left + Math.min(ret.width/2, 26)));
    sy = lado === 'baixo' ? b.y + 2 : b.y + b.h - 2;
  }
  s.style.left = Math.round(sx) + 'px'; s.style.top = Math.round(sy) + 'px'; s.dataset.lado = lado; s.hidden = false; PF107.lado = lado;
}
// ret: o retângulo do nome (ou do cartão) na tela; sem ele, no meio. Tenta do lado direito, embaixo, em cima e à esquerda, na
// área segura (o entalhe e a barra do iPhone ficam de fora), e corrige se o pai mexer no "fixed" (a caixa do chat animando)
function pf107Posiciona(el, ret){
  if (!el || el.hidden) return;
  const sa = pf107Ins(), M = 8, vw = innerWidth, vh = innerHeight;
  const x0 = sa.l + M, x1 = vw - sa.r - M, y0 = sa.t + M, y1 = vh - sa.b - M;
  el.style.maxWidth = Math.max(160, x1 - x0) + 'px'; el.style.maxHeight = Math.max(140, y1 - y0) + 'px';
  el.style.left = x0 + 'px'; el.style.top = y0 + 'px';
  const w = el.offsetWidth, h = el.offsetHeight;
  let lado = '', x = (x0 + x1 - w)/2, y = (y0 + y1 - h)/2;
  if (ret && (ret.width > 0 || ret.height > 0)){
    const G = 13, cy = ret.top + ret.height/2, topo = cy - Math.min(30, h/2);
    const cands = [['dir', ret.right + G, topo], ['baixo', ret.left - 6, ret.bottom + G], ['cima', ret.left - 6, ret.top - G - h], ['esq', ret.left - G - w, topo]];
    const cabe = c => c[0] === 'dir' ? c[1] + w <= x1 : c[0] === 'esq' ? c[1] >= x0 : c[0] === 'baixo' ? c[2] + h <= y1 : c[2] >= y0;
    const c = cands.find(cabe) || cands.slice().sort((a, b) => {
      const sobra = q => q[0] === 'dir' ? x1 - ret.right : q[0] === 'esq' ? ret.left - x0 : q[0] === 'baixo' ? y1 - ret.bottom : ret.top - y0;
      return sobra(b) - sobra(a);
    })[0];
    lado = c[0]; x = c[1]; y = c[2];
  }
  x = Math.max(x0, Math.min(x1 - w, x)); y = Math.max(y0, Math.min(y1 - h, y));
  el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
  const q = el.getBoundingClientRect();                     // (algum pai com transform: o "fixed" fica preso nele; corrige pelo que mediu)
  if (Math.abs(q.left - Math.round(x)) > .5 || Math.abs(q.top - Math.round(y)) > .5){
    el.style.left = Math.round(2*Math.round(x) - q.left) + 'px'; el.style.top = Math.round(2*Math.round(y) - q.top) + 'px';
  }
  // a pontinha só quando a janelinha ficou mesmo colada (encostada no lado escolhido)
  const colada = lado && ret && (lado === 'dir' ? Math.abs(x - ret.right) < 30 : lado === 'esq' ? Math.abs(x + w - ret.left) < 30 : lado === 'baixo' ? Math.abs(y - ret.bottom) < 30 : Math.abs(y + h - ret.top) < 30);
  pf107Seta(colada ? lado : '', ret, {x, y, w, h});
  el.dataset.pf107Lado = colada ? lado : 'meio';
}

/* ---------------------------------------------------------------- 2) abrir, fechar e o toque fora */
function pf107Aberta(){
  if (PF107.aberta === 'chat') return C81.ficha && !C81.ficha.hidden ? C81.ficha : null;
  if (PF107.aberta === 'membro') return PF107.pop && !PF107.pop.hidden ? PF107.pop : null;
  return null;
}
function pf107Fecha(){
  if (PF107.aberta === 'chat'){ try { c81FichaFecha(); } catch (_) {} }
  else if (PF107.aberta === 'membro') pf107MembroFecha();
  pf107Desliga();
}
function pf107Fora(e){
  const el = pf107Aberta(); if (!el){ pf107Desliga(); return; }
  const t = e.target; if (!(t instanceof Node) || el.contains(t)) return;
  if (CB && CB.pn && t === CB.pn) PF107.engole = performance.now() + 700;   // (o fundo escuro do painel: esse toque só fecha a janelinha)
  pf107Fecha();
}
document.addEventListener('click', e => {
  if (!PF107.engole) return;
  const agora = performance.now(), alvo = e.target; if (agora > PF107.engole){ PF107.engole = 0; return; }
  if (CB && CB.pn && alvo === CB.pn){ PF107.engole = 0; e.stopPropagation(); e.preventDefault(); }
}, true);
function pf107Tecla(e){ if (e.key === 'Escape' && pf107Aberta()){ e.stopPropagation(); e.preventDefault(); pf107Fecha(); } }
// o Esc da v70 fecha a camada de cima (a tela, o painel do chat, a janela): a janelinha passa a ser a de cima enquanto está
// aberta (o Esc fecha só ela; leve: não prende o foco nem deixa o painel do chat inerte)
try { if (typeof V70C_LISTA !== 'undefined' && Array.isArray(V70C_LISTA) && !V70C_LISTA.some(d => d && d.q === '.pf107-pop')) V70C_LISTA.unshift({q:'.pf107-pop', fecha:() => pf107Fecha(), leve:true}); } catch (_) {}
function pf107Gira(){ if (pf107Aberta()) pf107Fecha(); }
function pf107Vigia(){                                        // a janelinha some junto com o lugar dela (a tela, a sala, o painel, a partida)
  const el = pf107Aberta(); if (!el){ pf107Desliga(); return; }
  let some = false;
  try {
    const r = NET49.room;
    if (PF107.ctx === 'tela') some = !lobby.aberto || lobby.tela !== 'chat';
    else if (PF107.ctx === 'solta') some = lobby.aberto !== PF107.lobbyAbre;
    else if (PF107.ctx === 'sala') some = !lobby.aberto || lobby.tela !== 'sala' || !r || !PF107.membro || !r.members.some(x => x.id === PF107.membro.id);
    else if (PF107.ctx === 'painel') some = lobby.aberto || !V93P.el.p || V93P.el.p.hidden || !r || !PF107.membro || !r.members.some(x => x.id === PF107.membro.id) || (typeof PAUSA !== 'undefined' && PAUSA.aberta);
  } catch (_) {}
  if (some) pf107Fecha();
}
function pf107Liga(){
  if (!PF107.ligado){
    PF107.ligado = true;
    document.addEventListener('pointerdown', pf107Fora, true);
    document.addEventListener('keydown', pf107Tecla, true);
    addEventListener('resize', pf107Gira);
  }
  clearInterval(PF107.vigia); PF107.vigia = setInterval(pf107Vigia, 400);
}
function pf107Desliga(){
  clearInterval(PF107.vigia); PF107.vigia = 0;
  if (PF107.seta) PF107.seta.hidden = true;
  if (pf107Aberta()) return;
  PF107.aberta = ''; PF107.ctx = ''; PF107.membro = null;
  if (!PF107.ligado) return;
  PF107.ligado = false;
  document.removeEventListener('pointerdown', pf107Fora, true);
  document.removeEventListener('keydown', pf107Tecla, true);
  removeEventListener('resize', pf107Gira);
}
// a janela de sempre (o perfil, a ficha do árbitro, a confirmação) por cima da partida: a camada da v103 (só a janela aparece)
function pf107SobreJogo(){
  try {
    if (lobby.aberto || !LB || !LB.raiz) return;
    PF107.camadaJogo = true;
    LB.raiz.classList.add('v103-pop-jogo'); LB.raiz.hidden = false;
  } catch (_) {}
}

/* ---------------------------------------------------------------- 3) o que cada botão faz */
function pf107PrecisaConta(oque){
  const txt = 'Entre na sua conta para ' + (oque || 'ver o perfil') + '.';
  if (lobby.aberto && typeof v84AbreLogin === 'function' && window.RACHA84 && !window.RACHA84.embutido && typeof v88TemPlataforma === 'function' && v88TemPlataforma()){
    pf107Fecha(); try { cbFecha(); } catch (_) {}
    try { aviso(txt); } catch (_) {}
    v84AbreLogin('entrar');                                   // (o mesmo ENTRAR NA CONTA das telas que pedem conta)
    return;
  }
  try { c81Aviso(txt); } catch (_) { try { x49Toast(txt); } catch (_) {} }
}
function pf107Perfil(pub){                                    // o perfil do jogo de outra pessoa (no lobby, na sala e por cima da partida)
  if (!pub) return;
  if (!pf107Logado()) return pf107PrecisaConta('ver o perfil');
  pf107Fecha();
  if (typeof v103PerfilAbre === 'function') return v103PerfilAbre(pub);
  if (typeof v88AbrePerfil === 'function') v88AbrePerfil(pub);
}
function pf107MeuPerfil(){                                    // o seu: a tela do PERFIL no lobby; na partida, o da conta por cima do jogo
  pf107Fecha();
  if (lobby.aberto){
    try { cbFecha(); } catch (_) {}
    const volta = lobby.tela === 'sala' || lobby.tela === 'chat' ? lobby.tela : null;   // (o VOLTAR do perfil volta para a sala ou para o chat)
    if (lobby.tela !== 'perfil') abreTela('perfil', volta);
    return;
  }
  if (!pf107Logado() || typeof v88PerfilPinta !== 'function') return x49Toast('O seu perfil fica no menu: abra depois da partida.');
  try { cbFecha(); } catch (_) {}
  pf107SobreJogo();
  abrePop(c => { c.classList.add('v88-pop', 'v88-perfil-pop'); v88Carregando(c, 'Abrindo o perfil…'); });
  v88Q('social.perfil', {idPublico:V88.eu}).then(p => { if (!LB.pop.hidden && LB.popCaixa.classList.contains('v88-perfil-pop')) v88PerfilPinta(p); }).catch(e => {
    if (!LB.pop.hidden && LB.popCaixa.classList.contains('v88-perfil-pop')){ LB.popCaixa.textContent = ''; v88Erro(LB.popCaixa, e.message); const a = nodo('div', 'pop-acoes'); a.appendChild(botaoPop('FECHAR', '', () => { som.clique(); fechaPop(); })); LB.popCaixa.appendChild(a); }
  });
}
function pf107Bloqueia(pub, nome){
  if (!pf107Logado()) return pf107PrecisaConta('bloquear');
  pf107Fecha();
  if (!lobby.aberto){ try { cbFecha(); } catch (_) {} pf107SobreJogo(); }
  v88Bloqueia(pub, nome);
}
// CONVIDAR: como o botão fica (apagado com o motivo, ou com a dica de sempre) — a conferência de verdade é a do servidor
function pf107ConviteEstado(a){
  if (!a.conta) return {apagado:true, sub:'sem conta: só quem tem conta'};
  if (!pf107Logado()) return {apagado:true, sub:'entre na conta para convidar'};
  if (a.escondida) return {apagado:true, sub:'mensagem escondida'};
  const r = NET49.room, id = 'c' + Number(a.conta);
  if (r && !r.local && Array.isArray(r.members) && r.members.some(x => x && x.id === id)) return {apagado:true, sub:'já está na sua sala'};
  const t = PF107.conv.get(a.conta);
  if (t && Date.now() - t < PF107_CONV_MS) return {apagado:true, rot:'CONVIDADO', sub:'convite enviado'};
  const amigo = pf107Amigo(a.conta);
  if (!a.mid && !amigo) return {apagado:true, sub:'só pelo chat ou para amigos'};
  if (!r) return {sub:'crie ou entre numa sala', dica:true};
  if (r.local) return {sub:'só nas salas online', dica:true};
  if (r.ranked) return {sub:'a ranqueada não recebe', dica:true};
  return {sub:(amigo ? 'seu amigo · ' : '') + 'para a sua sala'};
}
function pf107Convida(a, b){
  som.clique();
  const diz = t => { try { c81Aviso(t); } catch (_) {} pf107Sub(b, t.replace(/\.$/, '')); try { if (navigator.vibrate) navigator.vibrate(12); } catch (_) {} };
  const r = NET49.room;
  if (!pf107Logado()) return diz('Entre na sua conta para convidar.');
  if (!r) return diz('Crie ou entre numa sala para convidar.');
  if (r.local) return diz('A sala neste aparelho não recebe convidados: crie uma sala online para convidar.');
  if (r.ranked) return diz('A ranqueada não recebe convidados.');
  if (!NET49.id || !NET49.ws || NET49.ws.readyState !== 1){ try { v88Conecta(); } catch (_) {} return diz('Conectando às salas… tente de novo em instantes.'); }
  PF107.pend = {conta:a.conta, nome:a.nome || '', ate:Date.now() + 10000};
  PF107.conv.set(a.conta, Date.now());
  if (pf107Amigo(a.conta) || !a.mid) v88Convida(a.conta, 'sala');          // os amigos: pelo ID (o caminho de sempre)
  else net49Send({type:'convite', mid:a.mid, canal:a.canal || undefined}); // quem não é amigo: pelo número da mensagem
  pf107Fecha();
}

/* ---------------------------------------------------------------- 4) a janelinha do chat (a ficha de sempre, arrumada) */
function pf107Classes(F){                                      // as peças da ficha com as classes da janelinha (o mesmo desenho nas duas)
  const q = s => F.querySelector(s);
  F.classList.add('pf107-pop');
  const cab = q('.c81-f-cab'); if (cab) cab.classList.add('pf107-cab');
  const tp = q('.c81-f-tampa'); if (tp) tp.classList.add('pf107-tampa');
  const tx = q('.c81-f-tx'); if (tx) tx.classList.add('pf107-id');
  const x = q('.c81-f-x'); if (x) x.classList.add('pf107-x');
  const nota = q('.c81-f-nota'); if (nota){ nota.classList.add('pf107-nota'); if (!nota.textContent) nota.hidden = true; }
  const ac = q('.c81-f-acoes'); if (ac) ac.classList.add('pf107-acoes');
  return {cab, tp, tx, x, nota, ac};
}
function pf107FichaMonta(m, sala){
  const F = C81.ficha; if (!F || F.hidden || !m) return;
  const id = c81Id(m, sala), conta = c81Conta(id), eu = c81Eu(m, sala), nome = c81Nome(m, sala);
  const mid = sala ? m.mid : m.id, canal = sala ? (m.canal === 'equipe' ? 'equipe' : 'sala') : 'brasil';
  const P = pf107Classes(F), ac = P.ac; if (!ac) return;
  F.classList.remove('v88-f-den', 'pf107-den'); F.classList.add('pf107-chat');
  F.setAttribute('aria-label', 'Jogador ' + nome);
  ac.textContent = '';
  // PERFIL (o seu: MEU PERFIL)
  if (eu) ac.appendChild(pf107Bt('MEU PERFIL', 'azul', 'perfil', () => { som.clique(); pf107MeuPerfil(); }, '', 'Abrir o seu perfil'));
  else if (conta) ac.appendChild(pf107Bt('PERFIL', 'azul', 'perfil', () => { som.clique(); pf107Perfil(conta); }, pf107Logado() ? '' : 'entre na conta para ver', 'Ver o perfil de ' + nome));
  else { const k = pf107Bt('PERFIL', 'azul', 'perfil', null, 'sem conta'); k.disabled = true; k.setAttribute('aria-label', nome + ' não tem conta (sem perfil)'); ac.appendChild(k); }
  if (!eu){
    // CONVIDAR (para a sua sala)
    const a = {conta, mid, canal, nome, escondida:!!m.escondida};
    const st = pf107ConviteEstado(a);
    const k = pf107Bt(st.rot || 'CONVIDAR', 'verde', 'convite', null, st.sub, 'Convidar ' + nome + ' para a sua sala');
    k.disabled = !!st.apagado; if (st.dica) k.classList.add('pf107-dica');
    k.addEventListener('click', () => pf107Convida(a, k));
    ac.appendChild(k);
    // DENUNCIAR (a mensagem; a denunciada fica apagada)
    if (!m.escondida){
      const ja = !!mid && BRASIL.denunciados.has(mid);
      const d = pf107Bt(ja ? 'DENUNCIADA' : 'DENUNCIAR', 'vermelho', 'bandeira', () => {
        if (!mid || BRASIL.denunciados.has(mid)) return;
        som.clique();
        if (typeof v88DenunciaFicha === 'function') return v88DenunciaFicha({canal, mid, texto:c81Texto(m, sala), nome});
        BRASIL.denunciados.add(mid);                          // (sem a v88: a denúncia direta da v81)
        if (sala) net49Send({type:'report', mid}); else brasilSend({type:'brasil_report', id:mid});
        c81FichaFecha(); c81Aviso('Denúncia enviada. Com mais denúncias a mensagem some e quem escreveu fica um tempo sem falar.');
      }, ja ? 'já foi para a moderação' : '', 'Denunciar a mensagem de ' + nome);
      if (ja || !mid) d.disabled = true;
      ac.appendChild(d);
    }
    // embaixo: silenciar (só para você) e bloquear (a conta)
    const lk = nodo('div', 'pf107-links'), mudo = c81Mudo(id);
    lk.appendChild(pf107Link(mudo ? 'DEIXAR FALAR' : 'SILENCIAR', () => {
      som.clique();
      if (mudo) BRASIL.silenciados.delete(id); else BRASIL.silenciados.add(id);
      brasilSalvarMudo(); c81FichaFecha(); cbPintaPainel(); cbPinta();
      try { if (BRASIL.aberto) brasilRenderLista(true); } catch (_) {}
      c81Aviso(mudo ? nome + ' voltou a aparecer para você.' : nome + ' silenciado: as mensagens dele não aparecem mais para você.');
    }));
    if (conta && pf107Logado()) lk.appendChild(pf107Link('BLOQUEAR', () => { som.clique(); pf107Bloqueia(conta, nome); }, 'pf107-link-verm'));
    ac.appendChild(lk);
  }
}
// a do clube e a dos amigos (v88FichaCh: a mesma caixa): PERFIL, CONVIDAR (amigo: pelo ID; o clube: pela mensagem), DENUNCIAR
function pf107FichaChMonta(m, canal){
  const F = C81.ficha; if (!F || F.hidden || !m) return;
  const pub = /^\d{6,9}$/.test(String(m.de)) ? v88Pub(m.de) : '', nome = m.nome || 'Jogador', mudo = v88Silenciado(m.de);
  const P = pf107Classes(F), ac = P.ac; if (!ac) return;
  F.classList.remove('v88-f-den', 'pf107-den'); F.classList.add('pf107-chat');
  F.setAttribute('aria-label', 'Jogador ' + nome);
  ac.textContent = '';
  if (pub) ac.appendChild(pf107Bt('PERFIL', 'azul', 'perfil', () => { som.clique(); pf107Perfil(pub); }, '', 'Ver o perfil de ' + nome));
  else { const k = pf107Bt('PERFIL', 'azul', 'perfil', null, 'sem conta'); k.disabled = true; ac.appendChild(k); }
  const a = {conta:pub, mid:canal === 'clube' ? m.mid : '', canal:'clube', nome, escondida:!!m.escondida};
  const st = pf107ConviteEstado(a);
  const k = pf107Bt(st.rot || 'CONVIDAR', 'verde', 'convite', null, st.sub, 'Convidar ' + nome + ' para a sua sala');
  k.disabled = !!st.apagado; if (st.dica) k.classList.add('pf107-dica');
  k.addEventListener('click', () => pf107Convida(a, k));
  ac.appendChild(k);
  if (m.mid){
    const ja = BRASIL.denunciados.has(m.mid);
    const d = pf107Bt(ja ? 'DENUNCIADA' : 'DENUNCIAR', 'vermelho', 'bandeira', () => { if (BRASIL.denunciados.has(m.mid)) return; som.clique(); v88DenunciaFicha({canal, mid:m.mid, texto:m.texto, nome}); }, ja ? 'já foi para a moderação' : '');
    d.disabled = ja; ac.appendChild(d);
  }
  const lk = nodo('div', 'pf107-links');
  lk.appendChild(pf107Link(mudo ? 'DEIXAR FALAR' : 'SILENCIAR', () => { som.clique(); c81FichaFecha(); v88Silencia(m.de, !mudo); c81Aviso(mudo ? nome + ' voltou a aparecer para você.' : nome + ' silenciado (só para você).'); cbPintaPainel(); }));
  if (pub) lk.appendChild(pf107Link('BLOQUEAR', () => { som.clique(); pf107Bloqueia(pub, nome); }, 'pf107-link-verm'));
  ac.appendChild(lk);
}
// onde ela mora: dentro do painel do chat (quando ele está aberto e o nome é dele) ou solta por cima de tudo (a tela inteira do
// Chat do Brasil, a ficha aberta com o painel fechado)
function pf107Hospeda(F, fora){
  if (!PF107.casa) PF107.casa = F.parentNode;
  if (fora){ if (F.parentNode !== document.body) document.body.appendChild(F); F.classList.add('pf107-fora'); }
  else { if (PF107.casa && F.parentNode !== PF107.casa) PF107.casa.appendChild(F); F.classList.remove('pf107-fora'); }
}
function pf107Mostra(F, anc, ctx){
  if (!F || F.hidden) return;
  if (PF107.aberta === 'membro') pf107MembroFecha();
  const noPainel = !!(CB.aberto && CB.pn && !CB.pn.hidden && (!anc || CB.pn.contains(anc)));
  pf107Hospeda(F, !noPainel);
  if (noPainel){ try { const cx = CB.pn.querySelector('.c81-caixa'); if (cx && cx.getAnimations) for (const a of cx.getAnimations()) a.finish(); } catch (_) {} }
  PF107.ret = anc ? anc.getBoundingClientRect() : null;
  PF107.aberta = 'chat'; PF107.ctx = noPainel ? 'painel-chat' : (ctx || 'solta'); PF107.lobbyAbre = lobby.aberto;
  pf107Posiciona(F, PF107.ret);
  pf107Liga();
}
function pf107FichaSolta(){                                   // fechou: a ficha volta para a caixa do painel, sem o jeito de janelinha
  const F = C81.ficha; if (!F) return;
  F.classList.remove('pf107-pop', 'pf107-chat', 'pf107-fora', 'pf107-den');
  for (const k of ['left', 'top', 'maxWidth', 'maxHeight']) F.style[k] = '';
  delete F.dataset.pf107Lado;
  if (PF107.casa && F.parentNode !== PF107.casa) PF107.casa.appendChild(F);
  if (PF107.aberta === 'chat'){ PF107.aberta = ''; pf107Desliga(); }
}

/* ---------------------------------------------------------------- 5) os ganchos do chat */
// o nome tocado (o painel: o .c81-nome de cada linha, também os do clube e dos amigos): a janelinha abre colada nele
document.addEventListener('click', e => {
  const a = e.target instanceof Element ? e.target.closest('.c81-nome') : null;
  if (a){ PF107.ancora = a; PF107.ancoraT = performance.now(); }
}, true);
if (typeof c81FichaAbre === 'function'){
  const c81FichaAbreAntes107 = c81FichaAbre;
  c81FichaAbre = function(m, sala){
    const anc = PF107.ancora && PF107.ancora.isConnected && performance.now() - PF107.ancoraT < 800 ? PF107.ancora : null, ctx = PF107.ctxNovo || '';
    PF107.ancora = null; PF107.ctxNovo = '';
    const out = c81FichaAbreAntes107.apply(this, arguments);
    try { pf107FichaMonta(m, sala); pf107Mostra(C81.ficha, anc, ctx); } catch (e) { console.error('v107 a janelinha do nome', e); }
    return out;
  };
}
if (typeof v88FichaCh === 'function'){
  const v88FichaChAntes107 = v88FichaCh;
  v88FichaCh = function(m, canal){
    const anc = PF107.ancora && PF107.ancora.isConnected && performance.now() - PF107.ancoraT < 800 ? PF107.ancora : null;
    PF107.ancora = null;
    const out = v88FichaChAntes107.apply(this, arguments);
    try { pf107FichaChMonta(m, canal); pf107Mostra(C81.ficha, anc); } catch (e) { console.error('v107 a janelinha do nome (clube/amigos)', e); }
    return out;
  };
}
if (typeof c81FichaFecha === 'function'){
  const c81FichaFechaAntes107 = c81FichaFecha;
  c81FichaFecha = function(){ const r = c81FichaFechaAntes107.apply(this, arguments); try { pf107FichaSolta(); } catch (_) {} return r; };
}
// a denúncia com o motivo (v88): troca o conteúdo da ficha — dentro da janelinha, com o mesmo desenho, no mesmo lugar
if (typeof v88DenunciaFicha === 'function'){
  const v88DenunciaFichaAntes107 = v88DenunciaFicha;
  v88DenunciaFicha = function(){
    const r = v88DenunciaFichaAntes107.apply(this, arguments);
    try {
      const F = C81.ficha;
      if (F && !F.hidden && PF107.aberta === 'chat' && F.classList.contains('pf107-pop')){
        pf107Classes(F); F.classList.add('pf107-den');
        const volta = F.querySelector('.v88-f-volta'), envia = F.querySelector('.v88-f-envia');
        if (volta) volta.classList.add('pf107-bt', 'pf107-cinza');
        if (envia) envia.classList.add('pf107-bt', 'pf107-vermelho');
        pf107Posiciona(F, PF107.ret);
      }
    } catch (e) { console.error('v107 a denúncia na janelinha', e); }
    return r;
  };
}
// a tela inteira do Chat do Brasil: o nome e a tampinha abrem a janelinha (antes: só o SILENCIAR numa janela no meio)
if (typeof brasilRenderLista === 'function'){
  const brasilRenderListaAntes107 = brasilRenderLista;
  brasilRenderLista = function(){
    const r = brasilRenderListaAntes107.apply(this, arguments);
    try {
      const L = (BRASIL.msgs || []).filter(m => m && !BRASIL.silenciados.has(m.from));
      document.querySelectorAll('#br-lista .br-msg').forEach((d, i) => {
        const m = L[i]; if (m && m.id) d.dataset.pf107Id = m.id;
        const nm = d.querySelector('.br-nome');
        if (nm && !nm.hasAttribute('role')){ nm.setAttribute('role', 'button'); nm.tabIndex = 0; nm.style.cursor = 'pointer'; nm.setAttribute('aria-label', 'Ver ' + (m && m.nome || 'Jogador')); }
      });
    } catch (_) {}
    return r;
  };
}
function pf107MsgDaLinha(row){
  const id = row && row.dataset.pf107Id;
  if (id){ const m = (BRASIL.msgs || []).find(x => x && x.id === id); if (m) return m; }
  const linhas = Array.from(document.querySelectorAll('#br-lista .br-msg')), i = linhas.indexOf(row);
  return (BRASIL.msgs || []).filter(m => m && !BRASIL.silenciados.has(m.from))[i] || null;
}
function pf107TelaToque(e){
  const t = e.target instanceof Element ? e.target.closest('#br-lista .br-nome, #br-lista .br-tampa') : null; if (!t) return false;
  const row = t.closest('.br-msg'), m = pf107MsgDaLinha(row); if (!m) return false;
  e.preventDefault(); e.stopImmediatePropagation();
  try { som.clique(); } catch (_) {}
  PF107.ancora = (row && row.querySelector('.br-nome')) || t; PF107.ancoraT = performance.now(); PF107.ctxNovo = 'tela';
  c81FichaAbre(m, false);
  return true;
}
document.addEventListener('click', pf107TelaToque, true);
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target instanceof Element && e.target.matches('#br-lista .br-nome')) pf107TelaToque(e); }, true);

/* ---------------------------------------------------------------- 6) a janelinha de quem está na sala (o cartão e o painel da partida) */
function pf107PopEl(){
  if (!PF107.pop){
    const p = PF107.pop = nodo('div', 'pf107-pop pf107-membro'); p.hidden = true;
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Jogador');
    document.body.appendChild(p);
  }
  return PF107.pop;
}
function pf107MembroFecha(){
  const p = PF107.pop; if (p && !p.hidden){ p.hidden = true; p.textContent = ''; }
  if (PF107.aberta === 'membro'){ PF107.aberta = ''; PF107.membro = null; pf107Desliga(); }
}
function pf107NomeTime(t){ try { return typeof TIME80 !== 'undefined' && TIME80[t] ? TIME80[t].nome : (t ? 'Time B' : 'Time A'); } catch (_) { return t ? 'Time B' : 'Time A'; } }
function pf107Membro(m, anc, ctx){
  if (!m) return;
  try { if (PF107.aberta === 'chat') c81FichaFecha(); } catch (_) {}
  const r = NET49.room, pub = m.bot ? '' : pf107PubDoId(m.id), eu = m.id === NET49.id, arb = !!r && m.id === (r.admin || r.host);
  const p = pf107PopEl(); p.textContent = '';
  const cab = nodo('div', 'pf107-cab'), tp = nodo('span', 'pf107-tampa');
  try { const c = brasilTampa({skin:m.skin, avatar:m.avatar}), k = nodo('canvas'); k.width = k.height = 80; k.getContext('2d').drawImage(c, 0, 0); k.setAttribute('aria-hidden', 'true'); tp.appendChild(k); } catch (_) {}
  const tx = nodo('div', 'pf107-id'), b = nodo('b', null, m.name || 'Jogador');
  try { v79SeloMarca(b, eu ? v79SeloEu() : v79SeloDoMembro(m.id)); } catch (_) {}
  const t = r && m.slot >= 0 ? Math.floor(m.slot/r.n) : -1, det = [];
  det.push(pub ? 'ID ' + pub : 'sem conta');
  det.push(t >= 0 ? pf107NomeTime(t) : m.banco ? 'no banco' : 'assistindo');
  if (arb) det.push('árbitro');
  tx.append(b, nodo('small', null, det.join(' · ')));
  const x = novoBotao('pf107-x', 'Fechar'); x.textContent = '✕'; x.addEventListener('click', () => { som.clique(); pf107MembroFecha(); });
  cab.append(tp, tx, x);
  const ac = nodo('div', 'pf107-acoes');
  if (eu) ac.appendChild(pf107Bt('MEU PERFIL', 'azul', 'perfil', () => { som.clique(); pf107MeuPerfil(); }, '', 'Abrir o seu perfil'));
  else if (pub) ac.appendChild(pf107Bt('PERFIL', 'azul', 'perfil', () => { som.clique(); pf107Perfil(pub); }, pf107Logado() ? 'estatísticas e adicionar' : 'entre na conta para ver', 'Ver o perfil de ' + (m.name || 'Jogador')));
  else { const k = pf107Bt('PERFIL', 'azul', 'perfil', null, 'sem conta'); k.disabled = true; ac.appendChild(k); }
  p.append(cab, ac);
  const nota = ctx === 'sala' ? (eu ? 'Só o árbitro escolhe os times. Peça para ele te colocar.' : arb ? (m.name || 'Ele') + ' é o árbitro da sala.' : 'Só o árbitro mexe nos times.') : '';
  if (nota) p.appendChild(nodo('p', 'pf107-nota', nota));
  p.setAttribute('aria-label', 'Jogador ' + (m.name || ''));
  p.hidden = false;
  PF107.aberta = 'membro'; PF107.ctx = ctx || 'sala'; PF107.membro = {id:m.id}; PF107.lobbyAbre = lobby.aberto;
  PF107.ret = anc ? anc.getBoundingClientRect() : null;
  pf107Posiciona(p, PF107.ret);
  pf107Liga();
  try { x.focus({preventScroll:true}); } catch (_) {}
}
// a tela da sala: quem não é o árbitro toca no cartão e ganha a janelinha com o PERFIL (o árbitro continua com a ficha dele)
if (typeof slClique === 'function'){
  const slCliqueAntes107 = slClique;
  slClique = function(e){
    try {
      const r = NET49.room, card = e && e.target && e.target.closest ? e.target.closest('.sl-card') : null;
      if (card && r && typeof v103SalaSrv === 'function' && v103SalaSrv(r) && !(typeof v103Arb === 'function' && v103Arb(r))){
        const m = r.members.find(x => x.id === card.dataset.id);
        if (m && !m.bot){ som.clique(); pf107Membro(m, card, 'sala'); return; }
      }
    } catch (er) { console.error('v107 o cartão da sala', er); }
    return slCliqueAntes107.apply(this, arguments);
  };
}
// a ficha do árbitro (o cartão de alguém na sala ou o nome no painel da partida): o VER PERFIL primeiro (só para contas)
function pf107FichaArbitro(m){
  const c = LB.popCaixa; if (!m || m.bot || LB.pop.hidden || !c.classList.contains('v103-ficha')) return;
  const pub = pf107PubDoId(m.id); if (!pub || m.id === NET49.id) return;
  const a = c.querySelector('.v103-acoes'); if (!a || a.querySelector('.pf107-ver')) return;
  const b = botaoPop('VER PERFIL', 'azul pf107-ver', () => { som.clique(); fechaPop(); pf107Perfil(pub); });
  b.setAttribute('aria-label', 'Ver o perfil de ' + (m.name || 'Jogador'));
  a.insertBefore(b, a.firstChild);
}
if (typeof v103Ficha === 'function'){
  const v103FichaAntes107 = v103Ficha;
  v103Ficha = function(m){
    pf107Fecha();
    const out = v103FichaAntes107.apply(this, arguments);
    try { pf107FichaArbitro(m); } catch (e) { console.error('v107 a ficha do árbitro', e); }
    return out;
  };
  try { if (window.RachaArbitro103) window.RachaArbitro103.ficha = v103Ficha; } catch (_) {}   // (quem abre pela API também ganha o VER PERFIL)
}
// o painel dos jogadores da partida: tocar num nome (o árbitro: a ficha dele por cima do jogo; os outros: a janelinha). O
// segurar e arrastar do árbitro é o da v104 (pointer): o toque que termina um arrasto não abre nada
function pf107PainelToque(li){
  const r = NET49.room, id = li && li.dataset.id; if (!r || !id || !NET49.playing) return;
  const m = (r.members || []).find(x => x && x.id === id); if (!m || m.bot) return;
  const arb = typeof v104Arb === 'function' ? v104Arb() : (typeof v103Arb === 'function' && v103Arb(r));
  if (arb && typeof v103Ficha === 'function'){ try { som.clique(); } catch (_) {} pf107SobreJogo(); v103Ficha(m); return; }
  try { som.clique(); } catch (_) {}
  pf107Membro(m, li, 'painel');
}
// o painel é só para ver (pointer-events:none: o toque passa para o jogo); as linhas de quem é gente de verdade passam a
// receber o toque (o resto do painel continua deixando passar)
if (typeof v95Linha === 'function'){
  const v95LinhaAntes107 = v95Linha;
  v95Linha = function(o){
    const li = v95LinhaAntes107.apply(this, arguments);
    try { if (o && o.id && !o.bot && o.st !== 'vazio' && o.st !== 'bot' && NET49.playing){ li.classList.add('pf107-toca'); li.setAttribute('role', 'button'); li.setAttribute('aria-label', 'Ver ' + (o.nome || 'Jogador')); } } catch (_) {}
    return li;
  };
}
if (typeof v104Fim === 'function'){
  const v104FimAntes107 = v104Fim;
  v104Fim = function(){ try { if (typeof V104D !== 'undefined' && V104D.arr) PF107.arrastouT = performance.now(); } catch (_) {} return v104FimAntes107.apply(this, arguments); };
}
try {
  if (typeof V93P !== 'undefined' && V93P.el && V93P.el.p) V93P.el.p.addEventListener('click', e => {
    if (performance.now() - PF107.arrastouT < 700) return;
    try { if (typeof V104D !== 'undefined' && (V104D.arr || V104D.ini)) return; } catch (_) {}
    const li = e.target instanceof Element ? e.target.closest('li[data-id]') : null; if (!li || !V93P.el.p.contains(li)) return;
    pf107PainelToque(li);
  });
} catch (e) { console.error('v107 o painel da partida', e); }

/* ---------------------------------------------------------------- 7) as janelas de sempre: por cima da partida, o seu perfil e o convite pelo chat */
const abrePopAntes107 = abrePop;
abrePop = function(){
  try { if (PF107.camadaJogo && !lobby.aberto && NET49.playing && LB.raiz){ LB.raiz.classList.add('v103-pop-jogo'); LB.raiz.hidden = false; } } catch (_) {}
  const r = abrePopAntes107.apply(this, arguments);
  try { pf107ConviteNota(); } catch (_) {}
  return r;
};
const fechaPopAntes107 = fechaPop;
fechaPop = function(){
  const r = fechaPopAntes107.apply(this, arguments);
  setTimeout(() => { try { if (LB.pop.hidden) PF107.camadaJogo = false; } catch (_) {} }, 0);   // (a confirmação que abre logo depois continua por cima)
  return r;
};
if (typeof v88PerfilPinta === 'function'){                    // o seu perfil (a relação "eu"): sem bloquear, silenciar nem denunciar você mesmo
  const v88PerfilPintaAntes107 = v88PerfilPinta;
  v88PerfilPinta = function(p){
    const r = v88PerfilPintaAntes107.apply(this, arguments);
    try { if (p && p.relacao === 'eu') for (const b of LB.popCaixa.querySelectorAll('.v88-pf-mais .v88-link')) if ((b.textContent || '').trim() !== 'Fechar') b.remove(); } catch (_) {}
    return r;
  };
}
function pf107ConviteNota(){                                  // quem recebe o convite pelo chat: a janela de sempre diz de onde veio
  const c = LB.popCaixa; if (!c || !c.classList.contains('v88-convite-pop') || c.querySelector('.pf107-conv-nota')) return;
  const h = c.querySelector('h2'); if (!h) return;
  const cv = (V88.convites || []).slice().reverse().find(x => x && x.via === 'chat' && ((x.de && x.de.nome) || 'Um amigo') + ' chamou você!' === h.textContent);
  if (!cv) return;
  h.insertAdjacentElement('afterend', nodo('p', 'pop-txt pf107-conv-nota', cv.amigo ? 'Pelo chat · vocês são amigos' : 'Pelo chat · vocês ainda não são amigos'));
}
// o que o servidor responde ao convite: na partida (o lobby escondido) e com o painel do chat aberto, o aviso aparece também
const net49MessageAntes107 = net49Message;
net49Message = function(m){
  const out = net49MessageAntes107.apply(this, arguments);
  try {
    if (m && (m.type === 'convite_enviado' || m.type === 'convite_erro')){
      const P0 = PF107.pend;
      if (P0 && Date.now() < P0.ate){
        PF107.pend = null;
        if (m.type === 'convite_erro' && !/já convidou/.test(m.motivo || '')) PF107.conv.delete(P0.conta);
      }
      const t = m.type === 'convite_enviado' ? 'Convite enviado para ' + (m.nome || 'a pessoa') + '.' : (m.motivo || 'O convite não foi.');
      if (CB.aberto || !lobby.aberto) c81Aviso(t);
    }
  } catch (_) {}
  return out;
};

window.RachaPerfil107 = {
  abre:(m, sala, el) => { if (el){ PF107.ancora = el; PF107.ancoraT = performance.now(); } return c81FichaAbre(m, sala); },
  membro:(m, el, ctx) => pf107Membro(m, el, ctx || 'sala'), painel:li => pf107PainelToque(li), fecha:() => pf107Fecha(),
  estado:() => { const el = pf107Aberta(), q = el ? el.getBoundingClientRect() : null, s = PF107.seta && !PF107.seta.hidden ? PF107.seta.getBoundingClientRect() : null;
    return {aberta:el ? PF107.aberta : '', ctx:PF107.ctx, lado:PF107.lado, caixa:q ? {x:q.left, y:q.top, w:q.width, h:q.height} : null, seta:s ? {x:s.left + s.width/2, y:s.top + s.height/2} : null,
      ancora:PF107.ret ? {x:PF107.ret.left, y:PF107.ret.top, w:PF107.ret.width, h:PF107.ret.height} : null, fora:!!(el && !el.closest('#cp')), area:pf107Ins()}; },
  convite:a => pf107ConviteEstado(a), limites:{mesmaPessoaMs:PF107_CONV_MS}
};
try { if (C81.ficha && !PF107.casa) PF107.casa = C81.ficha.parentNode; } catch (_) {}   // (a caixa do painel: para onde a ficha volta)
