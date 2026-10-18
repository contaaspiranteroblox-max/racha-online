/* ======================================================================================================================
   RACHA v88 · O CLUBE COMPLETO (a tela CLUBE de sempre: criar, procurar, entrar, convidar, editar o escudo e a descrição,
   sair, tirar membro e passar a dono continuam iguais). Na sua conta (a plataforma), entram:
   · PEDIR PARA ENTRAR nos clubes só por convite (e cancelar o pedido); o dono e os admins veem os PEDIDOS e aceitam ou recusam;
   · ADMINS: o dono faz (ou desfaz) admin; o admin aceita pedidos, convida e tira membros comuns;
   · o CHAT DO CLUBE (o painel do chat, na aba CLUBE), as ESTATÍSTICAS do clube (a soma dos membros), o HISTÓRICO (as
     últimas partidas dos membros) e o RANKING dos clubes (pelos troféus: as vitórias validadas).
   Tudo pelo servidor (clubes.*): nada aqui inventa número.
   ====================================================================================================================== */
const V88CL = {parte:'membros', pedidos:null, est:new Map(), hist:new Map(), ranking:null, carregando:{}, erro:{}};
const v88ClPlat = api => !!(api && api.tipo === 'plataforma' && v88Logado());
function v88ClCarga(chave, fn, guarda){
  if (V88CL.carregando[chave]) return;
  V88CL.carregando[chave] = true; V88CL.erro[chave] = '';
  fn().then(r => { guarda(r); }).catch(e => { V88CL.erro[chave] = e.message || 'sem conexão'; })
    .finally(() => { V88CL.carregando[chave] = false; if (v88Aberta('clube')) clbRender(); });
}
function v88ClAbreChat(){
  try { if (lobby.tela) fechaTela(); } catch (_) {}
  V88.chatAba = 'clube'; abreTela('v88chat');
}

/* ---- a página do clube: os botões novos e as partes da direita (MEMBROS · ESTATÍSTICAS · HISTÓRICO) ---- */
const clbPaginaAntes88 = clbPagina;
clbPagina = function(api){
  const w = clbPaginaAntes88.apply(this, arguments);
  try { if (v88ClPlat(api) && CLB.clube) v88ClPagina(w, api, CLB.clube); } catch (e) { console.error(e); }
  return w;
};
function v88ClPagina(w, api, c){
  const ac = w.querySelector('.clb-acoes'), esq = w.querySelector('.clb-pag-esq'), dir = w.querySelector('.clb-pag-dir');
  if (ac){
    if (c.souMembro) ac.insertBefore(clbBt('sx-bt verde v88-cl-chat', v88Ic('chat') + '<span>CHAT DO CLUBE</span>', () => v88ClAbreChat(), 'Abrir o chat do clube'), ac.firstChild);
    if (c.souGestor){
      const n = Array.isArray(V88CL.pedidos) ? V88CL.pedidos.length : 0;
      const b = clbBt('sx-bt amarelo v88-cl-ped', v88Ic('convite') + '<span>PEDIDOS' + (n ? ' (' + n + ')' : '') + '</span>', () => { CLB.modal = {tipo:'v88pedidos'}; clbRender(); V88CL.pedidos = null; v88ClPedidos(); }, 'Pedidos para entrar no clube');
      ac.insertBefore(b, ac.firstChild);
      if (V88CL.pedidos === null && !V88CL.carregando.pedidos) v88ClPedidos();
    }
    if (!c.souMembro && c.tipo === 'convite'){                  // só por convite: pedir para entrar (ou cancelar o pedido)
      const ja = !!c.pedidoEnviado;
      const b = clbBt('sx-bt ' + (ja ? 'cinza' : 'verde') + ' v88-cl-pedir', '<span>' + (ja ? 'CANCELAR PEDIDO' : 'PEDIR PARA ENTRAR') + '</span>', () => v88ClPede(c, !ja));
      ac.insertBefore(b, ac.firstChild);
      const mot = esq && esq.querySelector('.clb-motivo'); if (mot) mot.textContent = ja ? 'Seu pedido está com o clube: o dono ou um admin responde.' : 'Clube só por convite: peça para entrar (o dono e os admins respondem).';
    }
  }
  // os papéis na lista (o admin aparece como Admin) e, para o admin, os membros comuns também abrem o menu
  const lista = c.lista || [], rows = dir ? Array.from(dir.querySelectorAll('.clb-membro')) : [];
  rows.forEach((r, i) => {
    const m = lista[i]; if (!m) return;
    if (m.papel === 'admin'){ const s = r.querySelector('small'); if (s){ s.className = 'admin'; s.innerHTML = CLB_SVG.coroa; s.append('Admin'); } }
    if (c.souAdmin && !c.souDono && !m.eu && m.papel === 'membro' && r.tagName !== 'BUTTON'){
      const b = novoBotao('clb-membro v88-cl-mb', 'Opções de ' + m.nome); while (r.firstChild) b.appendChild(r.firstChild);
      b.addEventListener('click', () => { som.clique(); CLB.modal = {tipo:'membro', m}; clbRender(); }); r.replaceWith(b);
    }
  });
  // a direita: MEMBROS · ESTATÍSTICAS · HISTÓRICO
  if (!dir) return;
  const abas = nodo('nav', 'v88-cl-abas'); abas.setAttribute('role', 'tablist');
  for (const [k, t] of [['membros', 'MEMBROS'], ['est', 'ESTATÍSTICAS'], ['hist', 'HISTÓRICO']]){
    const b = clbBt('clb-aba' + (V88CL.parte === k ? ' on' : ''), t, () => { if (V88CL.parte === k) return; V88CL.parte = k; clbRender(); }); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(V88CL.parte === k)); abas.appendChild(b);
  }
  dir.insertBefore(abas, dir.firstChild);
  if (V88CL.parte === 'membros') return;
  for (const el of Array.from(dir.children)) if (el !== abas) el.hidden = true;
  const box = nodo('div', 'v88-cl-parte clb-rolar'); box.dataset.v = 'v88' + V88CL.parte; dir.appendChild(box);
  const id = c.id;
  if (V88CL.parte === 'est'){
    const d = V88CL.est.get(id);
    if (!d){ if (V88CL.erro.est) v88Erro(box, 'Não deu para carregar (' + V88CL.erro.est + ').', () => { V88CL.erro.est = ''; clbRender(); }); else { v88Carregando(box, 'Somando os números do clube…'); v88ClCarga('est', () => v88Q('clubes.estatisticas', {id}), r => V88CL.est.set(id, r)); } return; }
    const g = nodo('div', 'lb-stats v88-cl-est'), f = v => fmtNum(v | 0);
    g.append(pxCard('TROFÉUS', f(d.trofeus), 'vitórias validadas'), pxCard('RANKING', d.ranking ? '#' + f(d.ranking) : '—', 'entre os clubes'), pxCard('MEMBROS', f(d.membros) + '/' + CLB_MAX),
      pxCard('PARTIDAS', f(d.partidas), 'somando os membros'), pxCard('VITÓRIAS', f(d.vitorias), (d.taxaVitoria | 0) + '%'), pxCard('GOLS', f(d.gols)),
      pxCard('ASSISTÊNCIAS', f(d.assistencias)), pxCard('NA SEMANA', f(d.partidasSemana), 'partidas nos últimos 7 dias'));
    box.appendChild(g);
    box.appendChild(nodo('p', 'clb-nota', 'A soma das partidas que a plataforma contou de cada membro (de quando entraram no RACHA, não só no clube).'));
  } else {
    const L = V88CL.hist.get(id);
    if (!L){ if (V88CL.erro.hist) v88Erro(box, 'Não deu para carregar (' + V88CL.erro.hist + ').', () => { V88CL.erro.hist = ''; clbRender(); }); else { v88Carregando(box, 'Buscando as partidas…'); v88ClCarga('hist', () => v88Q('clubes.historico', {id}), r => V88CL.hist.set(id, Array.isArray(r) ? r : [])); } return; }
    if (!L.length){ v88Vazio(box, 'historico', 'NENHUMA PARTIDA AINDA', 'Quando os membros jogarem com a conta, as partidas aparecem aqui.'); return; }
    const ul = nodo('ul', 'v88-est-hist v88-cl-hist');
    for (const p of L){
      const li = nodo('li', 'v88-est-p ' + (p.resultado || '')), pl = Array.isArray(p.placar) ? p.placar : [0, 0];
      li.append(nodo('b', 'v88-est-res', p.resultado === 'vitoria' ? 'VITÓRIA' : p.resultado === 'derrota' ? 'DERROTA' : 'EMPATE'), nodo('span', 'v88-est-pl', pl[0] + ' × ' + pl[1]),
        nodo('span', 'v88-est-tx', String(p.jogador || '') + ' · ' + (p.ranqueada ? 'RANQUEADA' : p.online ? 'SALA ONLINE' : 'CONTRA BOTS') + ' · ' + (p.gols | 0) + (p.gols === 1 ? ' gol' : ' gols')), nodo('small', 'v88-est-qd', v88Quando(p.quando)));
      ul.appendChild(li);
    }
    box.appendChild(ul);
  }
}
function v88ClPede(c, pedir){
  clbPede(() => v88M(pedir ? 'clubes.pedirEntrada' : 'clubes.cancelarPedido', {id:c.id}), () => {
    aviso(pedir ? 'Pedido enviado ao ' + c.nome + '.' : 'Pedido cancelado.'); if (pedir) som.ok();
    clbAbreClube(c.id);
  });
}
function v88ClPedidos(){ v88ClCarga('pedidos', () => v88Q('clubes.pedidos'), r => { V88CL.pedidos = Array.isArray(r) ? r : []; }); }
function v88ClResponde(p, aceitar){
  clbPede(() => v88M('clubes.responderPedido', {pedidoId:p.pedidoId, aceitar}), () => {
    aviso(aceitar ? p.jogador.nomeExibicao + ' entrou no clube!' : 'Pedido recusado.'); if (aceitar) som.nivel();
    V88CL.pedidos = (V88CL.pedidos || []).filter(x => x.pedidoId !== p.pedidoId);
    v88Resumo(); if (CLB.clube) clbAbreClube(CLB.clube.id);
  });
}

/* ---- as janelas: os pedidos e o menu do membro (o admin) ---- */
const clbModalAntes88 = clbModal;
clbModal = function(api){
  const M = CLB.modal;
  if (M && M.tipo === 'v88pedidos') return v88ClModalPedidos(api);
  const f = clbModalAntes88.apply(this, arguments);
  try {
    const c = CLB.clube;
    if (M && M.tipo === 'membro' && v88ClPlat(api) && c){
      const corpo = f.querySelector('.clb-mem-menu'), m = M.m;
      if (corpo){
        const nota = corpo.querySelector('.clb-nota'); if (nota) nota.textContent = (m.papel === 'dono' ? 'Proprietário' : m.papel === 'admin' ? 'Admin' : 'Membro') + ' · ' + clbFmt(m.trofeus) + ' troféus';
        const bts = Array.from(corpo.querySelectorAll('button'));
        const passar = bts.find(b => /PASSAR A DONO/.test(b.textContent)), tirar = bts.find(b => /TIRAR DO CLUBE/.test(b.textContent));
        if (!c.souDono){ if (passar) passar.remove(); if (tirar && m.papel !== 'membro') tirar.remove(); }
        if (c.souDono && m.papel !== 'dono'){
          const adm = m.papel === 'admin';
          const b = clbBt('sx-bt ' + (adm ? 'cinza' : 'verde'), CLB_SVG.coroa + '<span>' + (adm ? 'TIRAR DE ADMIN' : 'FAZER ADMIN') + '</span>', () => {
            CLB.modal = null; clbPede(() => v88M('clubes.definirAdmin', {id:m.id, admin:!adm}), () => { aviso(adm ? m.nome + ' não é mais admin.' : m.nome + ' agora é admin.'); clbAbreClube(c.id); });
          });
          corpo.insertBefore(b, passar || null);
        }
      }
    }
  } catch (e) { console.error(e); }
  return f;
};
function v88ClModalPedidos(api){
  const fundo = nodo('div', 'clb-modal');
  fundo.addEventListener('pointerdown', e => { if (e.target === fundo){ CLB.modal = null; clbRender(); } });
  const caixa = nodo('div', 'sx clb-form v88-cl-pedidos'), cab = nodo('header', 'clb-form-cab');
  cab.append(nodo('h3', null, 'PEDIDOS PARA ENTRAR'), clbBt('tpe-pop-x', TPE_SVG.x, () => { CLB.modal = null; clbRender(); }, 'Fechar'));
  const corpo = nodo('div', 'clb-form-corpo clb-rolar'); corpo.dataset.v = 'v88ped';
  const L = V88CL.pedidos;
  if (!L){ if (V88CL.erro.pedidos) corpo.appendChild(nodo('p', 'clb-vazio', 'Não deu para carregar (' + V88CL.erro.pedidos + ').')); else corpo.appendChild(nodo('p', 'clb-vazio', 'Carregando os pedidos…')); }
  else if (!L.length) corpo.appendChild(nodo('p', 'clb-vazio', 'Nenhum pedido agora. Clubes só por convite recebem pedidos aqui.'));
  else for (const p of L){
    const j = p.jogador || {}, li = nodo('div', 'clb-membro v88-cl-pedido');
    const av = nodo('span', 'clb-av'); av.appendChild(clbTampa(j.tampa, 64));
    const nm = nodo('span', 'clb-mem-id'); nm.append(nodo('b', null, j.nomeExibicao || 'Jogador'), nodo('small', null, 'ID ' + v88Pub(j.idPublico) + ' · nível ' + (j.nivel | 0) + ' · ' + v88Quando(p.criadoEm)));
    const bts = nodo('span', 'v88-cl-pedido-bts');
    bts.append(clbBt('sx-bt verde', '<span>ACEITAR</span>', () => v88ClResponde(p, true), 'Aceitar ' + (j.nomeExibicao || '')), clbBt('sx-bt verm', '<span>RECUSAR</span>', () => v88ClResponde(p, false), 'Recusar ' + (j.nomeExibicao || '')));
    li.append(av, nm, bts); corpo.appendChild(li);
  }
  caixa.append(cab, corpo); fundo.appendChild(caixa);
  return fundo;
}

/* ---- a lista: a aba RANKING (os 50 clubes com mais troféus) ---- */
const clbListaAntes88 = clbLista;
clbLista = function(api){
  const w = clbListaAntes88.apply(this, arguments);
  try {
    if (!v88ClPlat(api)){ if (CLB.aba === 'ranking'){ CLB.aba = 'clubes'; } return w; }
    const col = w.querySelector('.clb-col'), abas = col && col.querySelector('.clb-abas'); if (!abas) return w;
    const b = clbBt('clb-aba' + (CLB.aba === 'ranking' ? ' on' : ''), 'RANKING', () => { if (CLB.aba === 'ranking') return; CLB.aba = 'ranking'; V88CL.ranking = null; clbRender(); });
    b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(CLB.aba === 'ranking')); abas.appendChild(b);
    if (CLB.aba !== 'ranking') return w;
    for (const x of abas.children) if (x !== b){ x.classList.remove('on'); x.setAttribute('aria-selected', 'false'); }
    for (const el of Array.from(col.children)) if (el !== abas) el.remove();
    const cols = nodo('div', 'clb-cols'); for (const t of ['CLUBE', 'MEMBROS', 'TROFÉUS', 'RANKING']) cols.appendChild(nodo('span', null, t)); col.appendChild(cols);
    const rows = nodo('div', 'clb-rows clb-rolar'); rows.dataset.v = 'ranking';
    const L = V88CL.ranking;
    if (!L){ rows.appendChild(nodo('p', 'clb-vazio', V88CL.erro.ranking ? 'Não deu para carregar (' + V88CL.erro.ranking + ').' : 'Carregando o ranking…')); if (!V88CL.erro.ranking) v88ClCarga('ranking', () => v88Q('clubes.ranking'), r => { V88CL.ranking = Array.isArray(r) ? r : []; }); }
    else if (!L.length) rows.appendChild((() => { const v = nodo('div', 'clb-vazio'); v.append(nodo('b', null, 'NENHUM CLUBE NO RANKING AINDA'), nodo('p', null, 'O ranking conta as vitórias validadas dos membros. Jogue com o clube para aparecer aqui.')); return v; })());
    else for (const c of L) rows.appendChild(clbLinha(c));
    col.appendChild(rows);
  } catch (e) { console.error(e); }
  return w;
};
