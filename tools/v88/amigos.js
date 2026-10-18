/* ======================================================================================================================
   RACHA v88 · AMIGOS (tudo da conta, no servidor: amigosRouter + social; o status e os convites, ao vivo pelas salas)
   · AMIGOS: a lista com o status de verdade (online, na sala, procurando, em partida, offline), chamar para a sala ou para o
     time, assistir a partida, mandar mensagem, ver o perfil; os convites que chegaram (aceitar/recusar) no topo;
   · PEDIDOS: os recebidos (aceitar/recusar) e os enviados (cancelar);
   · BUSCAR: pelo nome ou pelo ID, com a relação de cada um (adicionar, pedido enviado, aceitar, bloqueado);
   · RECENTES: quem jogou com você nas últimas partidas online (adicionar pelo resultado da partida);
   · BLOQUEADOS: desbloquear.
   O PERFIL de um jogador (o cartão, o banner, os números reais, a bio) com as ações certas para a relação; a JANELA DE
   DENÚNCIA (os 7 motivos e o detalhe) que o chat, o perfil e o resultado da partida usam. Nada é inventado: sem conta, a
   tela pede para entrar; lista vazia diz que está vazia.
   ====================================================================================================================== */
const V88A = {aba:'amigos', busca:'', achados:null, buscando:false, pedidos:null, recentes:null, bloqueados:null, carregando:false, erro:''};
const V88_REL = {amigo:'AMIGO', pedido_enviado:'PEDIDO ENVIADO', pedido_recebido:'QUER SER SEU AMIGO', bloqueado:'BLOQUEADO', nada:'', eu:'VOCÊ'};

v88Tela('v88amigos', {titulo:'AMIGOS', ic:'amigos',
  abre:() => { if (V88.amgAba){ V88A.aba = V88.amgAba; V88.amgAba = null; } if (v88Logado()){ v88CarregaAmigos(true); v88Resumo(); v88PedeAmigos(); v88AmigosAba(V88A.aba, true); } },
  render:T => v88AmigosRender(T)});
function v88AmigosAba(aba, forca){
  V88A.aba = aba;
  if (aba === 'pedidos' && (forca || !V88A.pedidos)) v88Carrega('pedidos', () => v88Q('amigos.pedidos'));
  if (aba === 'recentes' && (forca || !V88A.recentes)) v88Carrega('recentes', () => v88Q('social.recentes'));
  if (aba === 'bloqueados' && (forca || !V88A.bloqueados)) v88Carrega('bloqueados', () => v88Q('amigos.bloqueados'));
  v88Repinta('v88amigos');
}
function v88Carrega(chave, fn){
  V88A.carregando = true; V88A.erro = '';
  fn().then(r => { V88A[chave] = r; }).catch(e => { V88A.erro = e.message || 'Falhou.'; }).then(() => { V88A.carregando = false; v88Repinta('v88amigos'); });
}
function v88AmigosRender(T){
  const c = T.corpo; c.textContent = '';
  if (!v88Logado()) return v88PrecisaConta(c, 'Os seus amigos, os pedidos e os convites');
  const R = V88.resumo || {};
  v88Abas(c, [{id:'amigos', rot:'AMIGOS (' + V88.amigos.length + '/100)'}, {id:'pedidos', rot:'PEDIDOS', n:R.pedidos || 0}, {id:'buscar', rot:'BUSCAR'}, {id:'recentes', rot:'RECENTES'}, {id:'bloqueados', rot:'BLOQUEADOS'}], V88A.aba, a => v88AmigosAba(a, true));
  const box = nodo('div', 'v88-amg-corpo'); c.appendChild(box);
  if (V88A.aba === 'amigos') return v88AbaAmigos(box);
  if (V88A.aba === 'buscar') return v88AbaBuscar(box);
  if (V88A.carregando && !V88A[V88A.aba]) return v88Carregando(box);
  if (V88A.erro && !V88A[V88A.aba]) return v88Erro(box, V88A.erro, () => v88AmigosAba(V88A.aba, true));
  if (V88A.aba === 'pedidos') return v88AbaPedidos(box);
  if (V88A.aba === 'recentes') return v88AbaRecentes(box);
  if (V88A.aba === 'bloqueados') return v88AbaBloqueados(box);
}
function v88AbaAmigos(box){
  const cv = V88.convites.filter(x => x.ate > Date.now());
  if (cv.length){
    box.appendChild(nodo('h3', 'v88-sub', 'CONVITES PARA JOGAR'));
    const ul = nodo('ul', 'v88-lista');
    for (const x of cv){
      const s = x.sala || {};
      ul.appendChild(v88Linha({cls:'v88-convite', av:v88IcEl(x.tipo === 'equipe' ? 'equipe' : 'sala', 'v88-linha-ic'), nome:(x.de.nome || 'Amigo') + (x.tipo === 'equipe' ? ' chamou para o time dele' : ' chamou para a sala'),
        sub:(s.nome || 'Sala') + ' · ' + (s.n || 2) + 'v' + (s.n || 2) + ' · vale por ' + Math.max(0, Math.ceil((x.ate - Date.now())/1000)) + ' s',
        acoes:[v88BtIc('x', 'Recusar', () => { v88ConviteResponde(x.id, false); v88Repinta('v88amigos'); }), v88BtIc('ok', 'Entrar', () => v88ConviteResponde(x.id, true))]}));
    }
    box.appendChild(ul);
  }
  const l = v88AmigosOrdenados();
  if (!NET49.id && v88PodeConectar()) box.appendChild(nodo('p', 'v88-nota', 'Conectando ao servidor das salas para mostrar quem está online…'));
  if (V88.statusEu && !V88.statusEu.mostra) box.appendChild(nodo('p', 'v88-nota', 'Você está escondido: os amigos te veem offline (Ajustes › Privacidade).'));
  if (!l.length) return v88Vazio(box, 'amigo_add', 'Nenhum amigo ainda', 'Procure pelo nome ou pelo ID em BUSCAR, ou adicione quem jogou com você em RECENTES.', v88Bt('lb-btn amarelo', 'BUSCAR JOGADORES', () => v88AmigosAba('buscar')));
  const ul = nodo('ul', 'v88-lista');
  for (const a of l){
    const s = v88StatusDe(a.idPublico), pub = v88Pub(a.idPublico);
    const sub = nodo('span', 'v88-st ' + (s ? (V88_ST[s.st] || V88_ST.online).cls : 'off')); sub.textContent = v88StatusTxt(s);
    const ac = [];
    ac.push(v88BtIc('chat', 'Mensagem para ' + a.nome, () => { V88.dmAlvo = pub; abreTela('v88chat'); }));
    if (s && s.st === 'partida' && s.sala && s.sala.assistir && s.sala.code) ac.push(v88BtIc('olho', 'Assistir', () => v88Assistir(s.sala.code)));
    else if (s){ ac.push(v88BtIc('mais', 'Chamar para a sala', () => v88ConvidaComSala(pub, a.nome))); if (NET49.room && !NET49.room.ranked) ac.push(v88BtIc('equipe', 'Chamar para o seu time', () => v88Convida(pub, 'equipe'))); }
    const li = v88Linha({av:v88AvatarEl(a, 64), nome:a.nome, selo:v88SeloConta(a), sub, acoes:ac, clique:() => v88AbrePerfil(pub)});
    const nd = V88.dmNaoLidas.get(pub); if (nd) v88Selo(li, nd);
    ul.appendChild(li);
  }
  box.appendChild(ul);
}
function v88SeloConta(c){ const s = Array.isArray(c.selos) && ['equipe', 'criador', 'verificado', 'parceiro'].find(x => c.selos.indexOf(x) >= 0); if (!s) return null; const i = nodo('i', 'v88-selo-conta s-' + s, '✓'); i.title = s; return i; }
function v88AbaPedidos(box){
  const P = V88A.pedidos || {recebidos:[], enviados:[]};
  box.appendChild(nodo('h3', 'v88-sub', 'RECEBIDOS (' + P.recebidos.length + ')'));
  if (!P.recebidos.length) box.appendChild(nodo('p', 'v88-nota', 'Nenhum pedido de amizade esperando.'));
  else {
    const ul = nodo('ul', 'v88-lista');
    for (const p of P.recebidos){
      const j = p.jogador;
      ul.appendChild(v88Linha({av:v88AvatarEl({tampa:j.tampa}, 64), nome:j.nomeExibicao, sub:'Nível ' + j.nivel + ' · ID ' + j.idPublico + ' · ' + v88Quando(p.criadoEm), clique:() => v88AbrePerfil(j.idPublico),
        acoes:[v88BtIc('x', 'Recusar', () => v88RespondePedido(p.pedidoId, false)), v88BtIc('ok', 'Aceitar', () => v88RespondePedido(p.pedidoId, true))]}));
    }
    box.appendChild(ul);
  }
  box.appendChild(nodo('h3', 'v88-sub', 'ENVIADOS (' + P.enviados.length + ')'));
  if (!P.enviados.length) box.appendChild(nodo('p', 'v88-nota', 'Você não tem pedidos esperando resposta.'));
  else {
    const ul = nodo('ul', 'v88-lista');
    for (const p of P.enviados){
      const j = p.jogador;
      ul.appendChild(v88Linha({av:v88AvatarEl({tampa:j.tampa}, 64), nome:j.nomeExibicao, sub:'Esperando resposta · ' + v88Quando(p.criadoEm), clique:() => v88AbrePerfil(j.idPublico),
        acoes:[v88Bt('lb-btn v88-bt-p', 'CANCELAR', () => v88CancelaPedido(p.pedidoId))]}));
    }
    box.appendChild(ul);
  }
}
function v88RespondePedido(id, aceitar){
  v88M('amigos.responderPedido', {pedidoId:id, aceitar:!!aceitar}).then(() => {
    v88Aviso(aceitar ? 'Agora vocês são amigos!' : 'Pedido recusado.');
    if (aceitar) som.compra();
    v88RelacoesMudaram(); v88Resumo(); v88AmigosAba('pedidos', true);
  }).catch(e => { som.erro(); v88Aviso(e.message); });
}
function v88CancelaPedido(id){ v88M('amigos.cancelarPedido', {pedidoId:id}).then(() => { v88Aviso('Pedido cancelado.'); v88AmigosAba('pedidos', true); }).catch(e => { som.erro(); v88Aviso(e.message); }); }
function v88AbaBuscar(box){
  const f = nodo('form', 'v88-busca'); f.setAttribute('role', 'search');
  const i = nodo('input', 'v88-in'); i.type = 'search'; i.placeholder = 'Nome ou ID do jogador'; i.maxLength = 40; i.value = V88A.busca; i.autocomplete = 'off'; i.spellcheck = false; i.setAttribute('aria-label', 'Nome ou ID do jogador');
  const b = novoBotao('lb-btn amarelo', 'Buscar'); b.type = 'submit'; b.textContent = 'BUSCAR';
  f.append(v88IcEl('lupa'), i, b);
  f.addEventListener('submit', ev => {
    ev.preventDefault(); const t = i.value.trim(); V88A.busca = t; if (!t) return;
    som.clique(); V88A.buscando = true; V88A.achados = null; v88Repinta('v88amigos');
    v88Q('social.buscar', {termo:t}).then(r => { V88A.achados = r || []; }).catch(e => { V88A.achados = []; v88Aviso(e.message); }).then(() => { V88A.buscando = false; v88Repinta('v88amigos'); });
  });
  box.appendChild(f);
  box.appendChild(nodo('p', 'v88-nota', 'O seu ID: ' + V88.eu + ' — passe para os amigos te acharem.'));
  if (V88A.buscando) return v88Carregando(box, 'Procurando…');
  if (V88A.achados === null) return;
  if (!V88A.achados.length) return v88Vazio(box, 'lupa', 'Ninguém encontrado', 'Confira o nome (o começo do nome de usuário ou do nome que aparece) ou o ID de 6 dígitos.');
  const ul = nodo('ul', 'v88-lista');
  for (const x of V88A.achados) ul.appendChild(v88Linha({av:v88AvatarEl(x, 64), nome:x.nome, selo:v88SeloConta(x), sub:'Nível ' + x.nivel + ' · ID ' + x.idPublico + (V88_REL[x.relacao] ? ' · ' + V88_REL[x.relacao] : ''),
    clique:() => v88AbrePerfil(x.idPublico), acoes:[v88AcaoRelacao(x, () => { V88A.achados = null; v88Q('social.buscar', {termo:V88A.busca}).then(r => { V88A.achados = r || []; v88Repinta('v88amigos'); }).catch(() => {}); })]}));
  box.appendChild(ul);
}
function v88AcaoRelacao(x, depois){                        // o botão certo para a relação (o mesmo no perfil, na busca e nos recentes)
  const pub = v88Pub(x.idPublico);
  if (x.relacao === 'nada') return v88Bt('lb-btn verde v88-bt-p', 'ADICIONAR', () => v88PedeAmizade(pub, depois));
  if (x.relacao === 'pedido_recebido' && x.pedidoId) return v88Bt('lb-btn verde v88-bt-p', 'ACEITAR', () => v88M('amigos.responderPedido', {pedidoId:x.pedidoId, aceitar:true}).then(() => { som.compra(); v88Aviso('Agora vocês são amigos!'); v88RelacoesMudaram(); v88Resumo(); if (depois) depois(); }).catch(e => { som.erro(); v88Aviso(e.message); }));
  if (x.relacao === 'pedido_enviado' && x.pedidoId) return v88Bt('lb-btn v88-bt-p', 'CANCELAR PEDIDO', () => v88M('amigos.cancelarPedido', {pedidoId:x.pedidoId}).then(() => { v88Aviso('Pedido cancelado.'); if (depois) depois(); }).catch(e => { som.erro(); v88Aviso(e.message); }));
  if (x.relacao === 'bloqueado') return v88Bt('lb-btn v88-bt-p', 'DESBLOQUEAR', () => v88Desbloqueia(pub, depois));
  if (x.relacao === 'amigo') return v88BtIc('chat', 'Mensagem', () => { V88.dmAlvo = pub; abreTela('v88chat'); });
  return null;
}
function v88PedeAmizade(pub, depois){
  v88M('amigos.enviarPedido', {termo:pub}).then(r => {
    if (r && r.viraram){ som.compra(); v88Aviso('Agora vocês são amigos!'); v88RelacoesMudaram(); }
    else v88Aviso('Pedido de amizade enviado.');
    v88Resumo(); if (depois) depois();
  }).catch(e => { som.erro(); v88Aviso(e.message); });
}
function v88AbaRecentes(box){
  const l = V88A.recentes || [];
  box.appendChild(nodo('p', 'v88-nota', 'Quem jogou com você nas últimas partidas online (contadas pelo servidor das salas).'));
  if (!l.length) return v88Vazio(box, 'historico', 'Ninguém por aqui ainda', 'Jogue partidas online (ranqueada ou salas): quem jogar com você aparece aqui para adicionar.');
  const ul = nodo('ul', 'v88-lista');
  for (const x of l) ul.appendChild(v88Linha({av:v88AvatarEl(x, 64), nome:x.nome, sub:'Nível ' + x.nivel + ' · jogou com você ' + v88Quando(x.quando) + (V88_REL[x.relacao] ? ' · ' + V88_REL[x.relacao] : ''),
    clique:() => v88AbrePerfil(x.idPublico), acoes:[v88BtIc('bandeira', 'Denunciar', () => v88AbreDenuncia({alvo:x.idPublico, nome:x.nome, origem:'partida'})), v88AcaoRelacao(x, () => v88AmigosAba('recentes', true))]}));
  box.appendChild(ul);
}
function v88AbaBloqueados(box){
  const l = V88A.bloqueados || [];
  if (!l.length) return v88Vazio(box, 'bloquear', 'Ninguém bloqueado', 'Quem você bloquear não te acha na busca, não manda pedido nem mensagem, e as mensagens dele somem dos seus chats.');
  const ul = nodo('ul', 'v88-lista');
  for (const x of l) ul.appendChild(v88Linha({av:v88AvatarEl({tampa:x.tampa}, 64), nome:x.nomeExibicao, sub:'ID ' + x.idPublico + ' · desde ' + v88Quando(x.bloqueadoEm), acoes:[v88Bt('lb-btn v88-bt-p', 'DESBLOQUEAR', () => v88Desbloqueia(x.idPublico, () => v88AmigosAba('bloqueados', true)))]}));
  box.appendChild(ul);
}
function v88Bloqueia(pub, nome, depois){
  v88Confirma('BLOQUEAR', 'BLOQUEAR ' + String(nome || 'ESSE JOGADOR').toUpperCase() + '?', 'Ele sai dos seus amigos (se for), não te acha na busca, não manda pedido, convite nem mensagem, e as mensagens dele somem dos seus chats. Dá para desbloquear depois.', 'BLOQUEAR', () => {
    v88M('amigos.bloquear', {termo:v88Pub(pub)}).then(() => { v88Aviso('Bloqueado.'); v88RelacoesMudaram(); v88Resumo(); if (depois) depois(); }).catch(e => { som.erro(); v88Aviso(e.message); });
  }, 'vermelho');
}
function v88Desbloqueia(pub, depois){ v88M('amigos.desbloquear', {termo:v88Pub(pub)}).then(() => { v88Aviso('Desbloqueado.'); v88RelacoesMudaram(); if (depois) depois(); }).catch(e => { som.erro(); v88Aviso(e.message); }); }
function v88RemoveAmigo(pub, nome, depois){
  v88Confirma('AMIGOS', 'DESFAZER A AMIZADE COM ' + String(nome || '').toUpperCase() + '?', 'Vocês deixam de ver o status um do outro e as mensagens diretas param. Dá para pedir de novo depois.', 'DESFAZER', () => {
    v88M('amigos.remover', {termo:v88Pub(pub)}).then(() => { v88Aviso('Amizade desfeita.'); v88RelacoesMudaram(); if (depois) depois(); }).catch(e => { som.erro(); v88Aviso(e.message); });
  }, 'vermelho');
}
for (const ev of ['status', 'amigos', 'resumo', 'convites', 'dm']) v88On(ev, () => { if (v88Aberta('v88amigos')) v88Repinta('v88amigos'); });

/* ---------------------------------------------------------------- o PERFIL de um jogador */
function v88AbrePerfil(idPublico){
  if (!v88Logado()) return v88Aviso('Entre na sua conta para ver perfis.');
  const pub = v88Pub(idPublico);
  if (pub === V88.eu){ try { if (lobby.tela) fechaTela(); } catch (_) {} abreTela('perfil'); return; }
  abrePop(c => { c.classList.add('v88-pop', 'v88-perfil-pop'); v88Carregando(c, 'Abrindo o perfil…'); });
  v88Q('social.perfil', {idPublico:pub}).then(p => { if (!LB.pop.hidden && LB.popCaixa.classList.contains('v88-perfil-pop')) v88PerfilPinta(p); }).catch(e => {
    if (!LB.pop.hidden && LB.popCaixa.classList.contains('v88-perfil-pop')){ LB.popCaixa.textContent = ''; v88Erro(LB.popCaixa, e.message); const a = nodo('div', 'pop-acoes'); a.appendChild(botaoPop('FECHAR', '', () => { som.clique(); fechaPop(); })); LB.popCaixa.appendChild(a); }
  });
}
function v88PerfilPinta(p){
  const c = LB.popCaixa; c.textContent = '';
  const pub = v88Pub(p.idPublico);
  const topo = nodo('div', 'v88-pf-topo');
  const ban = document.createElement('canvas'); ban.className = 'v88-pf-banner'; ban.width = 720; ban.height = 200; ban.setAttribute('aria-hidden', 'true');
  try { const it = v88Item(p.banner || 'banner_laje_noturna'); if (it && typeof v88DesenhaBanner === 'function') v88DesenhaBanner(ban.getContext('2d'), 720, 200, it, 0); } catch (_) {}
  const av = v88AvatarEl(p, 120); av.classList.add('v88-pf-av');
  const id = nodo('div', 'v88-pf-id');
  const nome = nodo('h2', null, p.nome); const sc = v88SeloConta(p); if (sc) nome.appendChild(sc);
  id.append(nome, nodo('small', null, 'ID ' + p.idPublico + ' · Nível ' + p.nivel + (p.titulo ? ' · ' + p.titulo : '')));
  const tags = nodo('div', 'v88-pf-tags');
  if (p.patente) tags.appendChild(nodo('span', 'v88-tag', p.patente));
  if (p.clube) tags.appendChild(nodo('span', 'v88-tag azul', p.clube));
  const st = v88StatusDe(pub); if (p.relacao === 'amigo') tags.appendChild(nodo('span', 'v88-tag ' + (st ? 'verde' : 'cinza'), v88StatusTxt(st)));
  if (V88_REL[p.relacao] && p.relacao !== 'amigo') tags.appendChild(nodo('span', 'v88-tag amarelo', V88_REL[p.relacao]));
  id.appendChild(tags);
  topo.append(ban, av, id);
  c.appendChild(topo);
  if (p.bio) c.appendChild(nodo('p', 'v88-pf-bio', '“' + p.bio + '”'));
  if (p.privado) c.appendChild(nodo('p', 'v88-nota', 'Perfil fechado: os números aparecem para os amigos.'));
  else if (p.numeros){
    const N = p.numeros, g = nodo('div', 'v88-pf-num');
    const n = (rot, v) => { const d = nodo('div'); d.append(nodo('b', null, v), nodo('small', null, rot)); g.appendChild(d); };
    n('Partidas', fmtNum(N.partidas)); n('Vitórias', fmtNum(N.vitorias)); n('Gols', fmtNum(N.gols)); n('Assistências', fmtNum(N.assistencias)); n('Melhor da partida', fmtNum(N.mvp)); n('Tempo jogado', v88Dur(N.tempoSeg));
    c.appendChild(g);
  }
  const a = nodo('div', 'pop-acoes v88-pf-ac');
  const atualiza = () => v88AbrePerfil(pub);
  if (p.relacao === 'amigo'){
    a.appendChild(botaoPop('MENSAGEM', 'verde', () => { som.clique(); fechaPop(); V88.dmAlvo = pub; abreTela('v88chat'); }));
    if (st && st.st !== 'partida') a.appendChild(botaoPop('CHAMAR', 'amarelo', () => { som.clique(); fechaPop(); v88ConvidaComSala(pub, p.nome); }));
    if (st && st.st === 'partida' && st.sala && st.sala.assistir) a.appendChild(botaoPop('ASSISTIR', 'amarelo', () => { som.clique(); fechaPop(); v88Assistir(st.sala.code); }));
  } else {
    const b = v88AcaoRelacao(p, atualiza); if (b){ b.classList.add('lb-btn'); a.appendChild(b); }
  }
  c.appendChild(a);
  const a2 = nodo('div', 'v88-pf-mais');
  if (p.relacao === 'amigo') a2.appendChild(v88Bt('v88-link', 'Desfazer amizade', () => { fechaPop(); v88RemoveAmigo(pub, p.nome, () => v88CarregaAmigos(true)); }));
  if (p.relacao !== 'bloqueado') a2.appendChild(v88Bt('v88-link', 'Bloquear', () => { fechaPop(); v88Bloqueia(pub, p.nome); }));
  a2.appendChild(v88Bt('v88-link', v88Silenciado(pub) ? 'Tirar o silêncio' : 'Silenciar no chat', () => { v88Silencia(pub, !v88Silenciado(pub)); v88Aviso(v88Silenciado(pub) ? 'Silenciado: as mensagens dele somem dos seus chats (só para você).' : 'Silêncio desfeito.'); fechaPop(); }));
  a2.appendChild(v88Bt('v88-link vermelho', 'Denunciar', () => { fechaPop(); v88AbreDenuncia({alvo:pub, nome:p.nome, origem:'perfil'}); }));
  a2.appendChild(v88Bt('v88-link', 'Fechar', () => fechaPop()));
  c.appendChild(a2);
}

/* ---------------------------------------------------------------- a JANELA DE DENÚNCIA (motivos de verdade, vai para o RACHA CONTROL) */
const V88_MOTIVOS = [['trapaca', 'Uso de trapaças'], ['toxico', 'Comportamento tóxico'], ['ofensa', 'Ofensas'], ['spam', 'Spam'], ['nome', 'Nome inadequado'], ['bug', 'Abuso de bugs'], ['outro', 'Outros']];
// o = {alvo: ID público (perfil/partida) · canal + mid (mensagem do chat) · nome · texto · origem}
function v88AbreDenuncia(o){
  if (!v88Logado() && !o.mid) return v88Aviso('Entre na sua conta para denunciar.');
  let motivo = o.mid ? 'ofensa' : '';
  abrePop(c => {
    c.classList.add('v88-pop', 'v88-den');
    c.append(nodo('span', 'pop-tag', 'DENUNCIAR'), nodo('h2', null, o.mid ? 'DENUNCIAR MENSAGEM' : 'DENUNCIAR ' + String(o.nome || 'JOGADOR').toUpperCase()));
    if (o.texto) c.appendChild(nodo('p', 'v88-den-msg', '“' + String(o.texto).slice(0, 160) + '”' + (o.nome ? ' — ' + o.nome : '')));
    const g = nodo('div', 'v88-den-motivos'); g.setAttribute('role', 'radiogroup'); g.setAttribute('aria-label', 'Motivo');
    const marca = () => { for (const b of g.children){ const on = b.dataset.m === motivo; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); } envia.disabled = !motivo; };
    for (const [id, rot] of V88_MOTIVOS){ const b = novoBotao('v88-den-m', rot); b.dataset.m = id; b.setAttribute('role', 'radio'); b.append(nodo('i'), nodo('span', null, rot)); b.addEventListener('click', () => { som.clique(); motivo = id; marca(); }); g.appendChild(b); }
    c.appendChild(g);
    let det = null;
    if (!o.mid){ det = nodo('textarea', 'v88-in v88-den-det'); det.maxLength = 500; det.rows = 2; det.placeholder = 'Conte o que aconteceu (opcional)'; det.setAttribute('aria-label', 'Detalhes'); c.appendChild(det); }
    c.appendChild(nodo('p', 'v88-nota', 'A equipe do RACHA analisa no painel. Denunciar a mesma pessoa pelo mesmo motivo mais de uma vez por dia não conta de novo; denúncias falsas seguidas bloqueiam o botão por um tempo.'));
    const a = nodo('div', 'pop-acoes');
    const envia = botaoPop('ENVIAR', 'vermelho', () => {
      if (!motivo) return;
      som.clique(); envia.disabled = true;
      if (o.mid){ v88DenunciaManda(o, motivo); fechaPop(); v88Aviso('Denúncia enviada para a moderação.'); return; }   // (mensagem do chat: ver o chat.js)
      v88M('amigos.denunciar', {termo:v88Pub(o.alvo), motivo, detalhes:det && det.value.trim() ? det.value.trim().slice(0, 500) : undefined, origem:o.origem || 'perfil', contexto:o.contexto || undefined}).then(r => {
        fechaPop(); v88Aviso(r && r.aviso || 'Denúncia registrada.');
      }).catch(e => { envia.disabled = false; som.erro(); v88Aviso(e.message); });
    });
    a.append(botaoPop('CANCELAR', '', () => { som.clique(); fechaPop(); }), envia);
    c.appendChild(a);
    marca();
  });
}
