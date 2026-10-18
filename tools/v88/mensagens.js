/* ======================================================================================================================
   RACHA v88 · A CAIXA DE ENTRADA: a CENTRAL DE MENSAGENS (Sistema, Amigos, Clube, Convites, Recompensas — com as não lidas;
   tudo ligado à conta, no servidor) e o CORREIO (as cartas com moedas, gemas e itens: login do dia, eventos, temporada,
   presentes, manutenção e compensações). COLETAR pede ao servidor, que confere a carta e entrega UMA vez (a marca e o
   prêmio na mesma transação; coletar de novo, em outro aparelho, responde "já coletada").
   ====================================================================================================================== */
const V88M = {aba:'correio', cat:'todas', msgs:null, cartas:null, carregando:false, erro:'', aberta:null};
const V88_CATS = [['todas', 'TODAS', 'mensagens'], ['sistema', 'SISTEMA', 'sistema'], ['amigos', 'AMIGOS', 'amigos'], ['clube', 'CLUBE', 'clube'], ['convites', 'CONVITES', 'convite'], ['recompensas', 'RECOMPENSAS', 'recompensas']];
const V88_TIPO_CARTA = {login:'LOGIN DIÁRIO', evento:'EVENTO', temporada:'TEMPORADA', presente:'PRESENTE', manutencao:'MANUTENÇÃO', compensacao:'COMPENSAÇÃO', sistema:'SISTEMA', liga:'LIGA DA SEMANA'};

v88Tela('v88caixa', {titulo:'CAIXA DE ENTRADA', ic:'correio',
  abre:() => { if (v88Logado()){ if (V88.resumo && !V88.resumo.correio && V88.resumo.mensagensTotal) V88M.aba = 'mensagens'; v88CaixaCarrega(); } },
  render:T => v88CaixaRender(T)});
function v88CaixaCarrega(){
  V88M.carregando = true; V88M.erro = ''; v88Repinta('v88caixa');
  Promise.all([v88Q('mensagens.listar'), v88Q('correio.listar')]).then(([m, c]) => { V88M.msgs = m || []; V88M.cartas = c || []; })
    .catch(e => { V88M.erro = e.message; }).then(() => { V88M.carregando = false; v88Repinta('v88caixa'); });
}
function v88CaixaRender(T){
  const c = T.corpo; c.textContent = '';
  if (!v88Logado()) return v88PrecisaConta(c, 'As suas mensagens e o seu correio');
  const R = V88.resumo || {};
  v88Abas(c, [{id:'correio', rot:'CORREIO', n:R.correio || 0}, {id:'mensagens', rot:'MENSAGENS', n:R.mensagensTotal || 0}], V88M.aba, a => { V88M.aba = a; V88M.aberta = null; v88Repinta('v88caixa'); });
  const box = nodo('div', 'v88-caixa-corpo'); c.appendChild(box);
  if (V88M.carregando && !V88M.cartas) return v88Carregando(box);
  if (V88M.erro && !V88M.cartas) return v88Erro(box, V88M.erro, v88CaixaCarrega);
  if (V88M.aba === 'correio') v88Correio(box); else v88Mensagens(box);
}

/* ---- o correio ---- */
function v88AnexosEl(anexos){
  const d = nodo('div', 'v88-anexos');
  for (const a of anexos || []){
    const s = nodo('span', 'v88-anexo');
    if (a.tipo === 'moedas') s.append(nodo('i', 'ic-moeda'), nodo('b', null, fmtNum(a.qtd)));
    else if (a.tipo === 'gemas') s.append(nodo('i', 'ic-gema'), nodo('b', null, fmtNum(a.qtd)));
    else if (a.tipo === 'xp_passe') s.append(v88IcEl('passe'), nodo('b', null, fmtNum(a.qtd) + ' XP'));
    else if (a.tipo === 'item'){ const it = v88Item(a.codigo); s.classList.add('item'); s.append(v88MiniItem(a.codigo, 44), nodo('b', null, it ? it.nome : a.codigo)); if (it) s.style.setProperty('--r', v88Raridade(it.raridade).cor); }
    d.appendChild(s);
  }
  return d;
}
function v88Correio(box){
  const l = V88M.cartas || [];
  const pend = l.filter(x => (x.anexos || []).length && !x.coletado);
  const top = nodo('div', 'v88-caixa-top');
  top.appendChild(nodo('p', 'v88-nota', pend.length ? pend.length + (pend.length === 1 ? ' carta com prêmio para coletar.' : ' cartas com prêmio para coletar.') : 'Nada para coletar agora.'));
  if (pend.length > 1) top.appendChild(v88Bt('lb-btn verde', 'COLETAR TUDO', () => v88ColetaTodas()));
  box.appendChild(top);
  if (!l.length) return v88Vazio(box, 'envelope', 'Correio vazio', 'Aqui chegam as recompensas de login, os prêmios dos eventos e da temporada, os presentes e os avisos oficiais.');
  const grade = nodo('div', 'v88-caixa-grade'), ul = nodo('ul', 'v88-lista v88-cartas'), ver = nodo('div', 'v88-carta');
  for (const x of l){
    const tem = (x.anexos || []).length, li = v88Linha({cls:'v88-carta-i' + (V88M.aberta === x.id ? ' on' : '') + (!x.lido && !x.coletado ? ' nova' : '') + (x.coletado ? ' feita' : ''),
      av:v88IcEl(x.tipo === 'login' ? 'login' : tem ? 'presente' : x.tipo === 'manutencao' ? 'alerta' : 'envelope', 'v88-linha-ic'), nome:x.titulo,
      sub:(V88_TIPO_CARTA[x.tipo] || 'CARTA') + ' · ' + v88Quando(x.criadoEm) + (x.expiraEm && !x.coletado ? ' · vence em ' + v88Falta(x.expiraEm) : '') + (x.coletado ? ' · coletada' : tem ? ' · com prêmio' : ''),
      clique:() => { V88M.aberta = x.id; if (!x.lido){ x.lido = true; v88M('correio.marcarLido', {id:x.id}).then(() => v88Resumo()).catch(() => {}); } v88Repinta('v88caixa'); }});
    ul.appendChild(li);
  }
  const x = l.find(y => y.id === V88M.aberta) || l[0];
  if (x){
    if (V88M.aberta !== x.id && !x.lido){ x.lido = true; v88M('correio.marcarLido', {id:x.id}).then(() => v88Resumo()).catch(() => {}); }
    V88M.aberta = x.id;
    for (const li of ul.children) li.classList.toggle('on', li === ul.children[l.indexOf(x)]);
    ver.append(nodo('span', 'v88-tag amarelo', V88_TIPO_CARTA[x.tipo] || 'CARTA'), nodo('h3', null, x.titulo));
    if (x.corpo) ver.appendChild(nodo('p', 'v88-carta-tx', x.corpo));
    if ((x.anexos || []).length){ ver.appendChild(nodo('b', 'v88-carta-rot', x.coletado ? 'COLETADO' : 'PRÊMIO')); ver.appendChild(v88AnexosEl(x.anexos)); }
    const a = nodo('div', 'v88-carta-ac');
    if ((x.anexos || []).length && !x.coletado) a.appendChild(v88Bt('lb-btn verde', 'COLETAR', e => v88Coleta(x, e.currentTarget)));
    else if (!(x.anexos || []).length || x.coletado) a.appendChild(v88Bt('lb-btn', 'APAGAR', () => v88M('correio.apagar', {id:x.id}).then(() => { V88M.cartas = V88M.cartas.filter(y => y.id !== x.id); V88M.aberta = null; v88Repinta('v88caixa'); v88Resumo(); }).catch(e => { som.erro(); v88Aviso(e.message); })));
    ver.appendChild(a);
  }
  grade.append(ul, ver); box.appendChild(grade);
}
function v88Entregou(r, titulo){                           // o que o servidor entregou: a carteira nova e um aviso do que chegou
  if (r && r.carteira) v88PoeCarteira(r.carteira);
  const p = [];
  if (r && r.moedas) p.push('+' + fmtNum(r.moedas) + ' moedas');
  if (r && r.gemas) p.push('+' + fmtNum(r.gemas) + ' gemas');
  if (r && r.xpPasse) p.push('+' + fmtNum(r.xpPasse) + ' XP do passe');
  if (r && r.itens && r.itens.length) p.push(r.itens.length === 1 ? (v88Item(r.itens[0]) || {nome:r.itens[0]}).nome : r.itens.length + ' itens');
  if (r && r.jaTinha && r.jaTinha.length) p.push('(já tinha ' + r.jaTinha.length + ')');
  som.moeda(); v88Aviso((titulo ? titulo + ': ' : '') + (p.join(' · ') || 'coletado'));
  if (r && ((r.itens && r.itens.length) || r.xpPasse)) v88Estado(true).catch(() => {});
}
function v88Coleta(x, bt){
  if (bt) bt.disabled = true;
  v88M('correio.coletar', {id:x.id}).then(r => { x.coletado = true; x.lido = true; v88Entregou(r, 'Coletado'); v88Resumo(); v88Repinta('v88caixa'); v88LobbyDados(); })
    .catch(e => { if (bt) bt.disabled = false; som.erro(); v88Aviso(e.message); if (/já foi coletada/.test(e.message)){ x.coletado = true; v88Repinta('v88caixa'); } });
}
function v88ColetaTodas(){
  v88M('correio.coletarTodas').then(r => { v88Entregou(r, r && r.cartas ? r.cartas + (r.cartas === 1 ? ' carta' : ' cartas') : 'Correio'); v88Resumo(); v88CaixaCarrega(); v88LobbyDados(); })
    .catch(e => { som.erro(); v88Aviso(e.message); });
}

/* ---- a central de mensagens ---- */
function v88Mensagens(box){
  const R = V88.resumo || {}, porCat = R.mensagens || {};
  const lado = nodo('div', 'v88-caixa-grade v88-msg-grade');
  v88Coluna(lado, V88_CATS.map(([id, rot, ic]) => ({id, rot, ic, n:id === 'todas' ? R.mensagensTotal || 0 : porCat[id] || 0})), V88M.cat, cat => { V88M.cat = cat; v88Repinta('v88caixa'); });
  const dir = nodo('div', 'v88-msg-dir');
  const l = (V88M.msgs || []).filter(m => V88M.cat === 'todas' || m.categoria === V88M.cat);
  const top = nodo('div', 'v88-caixa-top');
  const nl = l.filter(m => !m.lida).length;
  top.appendChild(nodo('p', 'v88-nota', nl ? nl + (nl === 1 ? ' mensagem não lida.' : ' mensagens não lidas.') : 'Tudo lido.'));
  if (nl) top.appendChild(v88Bt('lb-btn', 'MARCAR COMO LIDAS', () => v88M('mensagens.marcarLida', V88M.cat === 'todas' ? {todas:true} : {categoria:V88M.cat}).then(() => { for (const m of l) m.lida = true; v88Resumo(); v88Repinta('v88caixa'); }).catch(e => v88Aviso(e.message))));
  dir.appendChild(top);
  if (!l.length) v88Vazio(dir, 'mensagens', 'Nenhuma mensagem aqui', 'Os avisos da equipe, os pedidos e as amizades, os convites e os prêmios aparecem aqui.');
  else {
    const ul = nodo('ul', 'v88-lista v88-msgs');
    for (const m of l){
      const ac = [];
      if (m.refTipo === 'pedido_amizade') ac.push(v88Bt('lb-btn v88-bt-p', 'VER PEDIDOS', () => { v88AbreAmigos('pedidos'); }));
      if (m.refTipo === 'amizade') ac.push(v88Bt('lb-btn v88-bt-p', 'AMIGOS', () => { v88AbreAmigos('amigos'); }));
      if (m.refTipo === 'convite_clube' || m.refTipo === 'pedido_clube' || m.refTipo === 'clube') ac.push(v88Bt('lb-btn v88-bt-p', 'ABRIR CLUBE', () => { abreTela('clube'); }));
      if (m.refTipo === 'correio') ac.push(v88Bt('lb-btn v88-bt-p', 'CORREIO', () => { V88M.aba = 'correio'; v88Repinta('v88caixa'); }));
      if (m.de && m.de.idPublico) ac.push(v88BtIc('perfil', 'Ver o perfil', () => v88AbrePerfil(m.de.idPublico)));
      ac.push(v88BtIc('lixo', 'Apagar', () => v88M('mensagens.apagar', {id:m.id}).then(() => { V88M.msgs = V88M.msgs.filter(y => y.id !== m.id); v88Resumo(); v88Repinta('v88caixa'); }).catch(e => v88Aviso(e.message))));
      const li = v88Linha({cls:m.lida ? 'lida' : 'nova', av:v88IcEl((V88_CATS.find(x => x[0] === m.categoria) || V88_CATS[0])[2], 'v88-linha-ic'), nome:m.titulo,
        sub:(m.corpo ? m.corpo + ' · ' : '') + v88Quando(m.criadaEm), acoes:ac,
        clique:() => { if (!m.lida){ m.lida = true; v88M('mensagens.marcarLida', {id:m.id}).then(() => v88Resumo()).catch(() => {}); v88Repinta('v88caixa'); } }});
      ul.appendChild(li);
    }
    dir.appendChild(ul);
  }
  lado.appendChild(dir); box.appendChild(lado);
}
v88On('aviso', () => { if (v88Aberta('v88caixa')) v88CaixaCarrega(); });
v88On('resumo', () => { if (v88Aberta('v88caixa')) v88Repinta('v88caixa'); });
