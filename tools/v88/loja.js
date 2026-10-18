/* ======================================================================================================================
   RACHA v88 · A LOJA POR CATEGORIAS (a mesma tela LOJA de antes, com a coluna de categorias do lado). Já existiam (e ficam,
   do mesmo jeito): as PEÇAS DA TAMPINHA (as do dia, o PERSONALIZAR, o COMO GANHAR) e a TROCA DE GEMAS POR MOEDAS — elas
   moram agora em TAMPINHAS e em OFERTAS. Entram as categorias que faltavam: DESTAQUES, BOLAS, EFEITOS, COMEMORAÇÕES, GOLS,
   BANNERS, AVATARES, PACOTES, OFERTAS e o INVENTÁRIO. Cada produto mostra o desenho, o nome, a raridade, o preço e o
   botão. A compra é na conta: o servidor confere o preço (o de agora, com a oferta), o saldo e entrega o item na mesma
   transação; o jogo nunca soma nem tira moeda sozinho. Nada é vendido por dinheiro de verdade.
   ====================================================================================================================== */
const V88S = {cat:'destaques', montada:false, coluna:null, painel:null, blocoTampinhas:null, blocoTrocas:null, carregando:false, erro:''};
const V88_LOJA_CATS = [['destaques', 'DESTAQUES'], ['tampinhas', 'TAMPINHAS'], ['bolas', 'BOLAS'], ['efeitos', 'EFEITOS'], ['comemoracoes', 'COMEMORAÇÕES'], ['gols', 'GOLS'],
  ['banners', 'BANNERS'], ['avatares', 'AVATARES'], ['pacotes', 'PACOTES'], ['ofertas', 'OFERTAS'], ['inventario', 'INVENTÁRIO']];
const V88_TIPO_CAT = {bolas:'bola', efeitos:'efeito', comemoracoes:'comemoracao', gols:'gol', banners:'banner', avatares:'avatar'};
const V88_TIPO_NOME = {bola:'BOLA', efeito:'EFEITO', comemoracao:'COMEMORAÇÃO', gol:'GOL', banner:'BANNER', avatar:'AVATAR', tampinha:'TAMPINHA', caixa:'CAIXA', pacote:'PACOTE', peca:'PEÇA'};

function v88Venda(codigo){                                 // o preço de agora (o mesmo do servidor: as ofertas vêm do loja.estado)
  const E = V88.estado, l = E ? (E.ofertas || []).concat(E.destaques || []) : [];
  const v = l.find(x => x.codigo === codigo); if (v) return v;
  const it = v88Item(codigo);
  if (it){ if (it.gratis || it.venda === false || (!(it.moedas > 0) && !(it.gemas > 0))) return null; return {codigo, tipo:'item', nome:it.nome, raridade:it.raridade, moedas:it.moedas || 0, gemas:it.gemas || 0, base:{moedas:it.moedas || 0, gemas:it.gemas || 0}, desconto:0}; }
  const pc = v88Pacote(codigo); if (pc) return {codigo, tipo:'pacote', nome:pc.nome, raridade:pc.raridade, moedas:pc.moedas || 0, gemas:pc.gemas || 0, base:{moedas:pc.moedas || 0, gemas:pc.gemas || 0}, desconto:0};
  return null;
}
function v88LojaMonta(){
  const T = TELAS.loja, corpo = T && T.el && T.el.querySelector('.lj-corpo');
  if (!corpo || V88S.montada) return !!corpo;
  V88S.montada = true;
  T.el.classList.add('v88-loja-tela');
  const blocoTampinhas = nodo('div', 'v88-loja-bloco v88-loja-tampinhas'), blocoTrocas = nodo('div', 'v88-loja-bloco v88-loja-trocas');
  // as trocas de gemas vão para OFERTAS (o mesmo quadro: o mesmo elemento e o mesmo clique)
  const tSub = Array.from(corpo.querySelectorAll('h3.tl-sub')).find(h => /TROCAR/.test(h.textContent));
  if (tSub) blocoTrocas.appendChild(tSub);
  if (LB.ljTrocas) blocoTrocas.appendChild(LB.ljTrocas);
  for (const n of Array.from(corpo.childNodes)) blocoTampinhas.appendChild(n);
  const breve = blocoTampinhas.querySelector('.v70-lj-breve'); if (breve) breve.hidden = true;   // (os pacotes chegaram: a nota de "em breve" sai)
  const grade = nodo('div', 'v88-loja');
  const coluna = nodo('div', 'v88-loja-col'), painel = nodo('div', 'v88-loja-painel');
  grade.append(coluna, painel);
  corpo.appendChild(grade);
  painel.appendChild(blocoTampinhas); blocoTampinhas.hidden = V88S.cat !== 'tampinhas';
  Object.assign(V88S, {coluna, painel, blocoTampinhas, blocoTrocas});
  return true;
}
const renderLojaAntes88 = renderLoja;
renderLoja = function(){
  const r = renderLojaAntes88.apply(this, arguments);
  try { if (v88LojaMonta()) v88LojaPinta(); } catch (e) { console.error('v88 loja', e); }
  return r;
};
(function(){                                                // ao abrir a LOJA: o estado da conta (preços, ofertas, inventário) na hora
  const T = TELAS.loja; if (!T) return;
  const abreAntes = T.abre;
  T.abre = function(){ if (abreAntes) abreAntes.apply(this, arguments); if (v88Logado()){ V88S.carregando = !V88.estado; v88Estado(true).then(() => { V88S.erro = ''; }).catch(e => { V88S.erro = e.message; }).then(() => { V88S.carregando = false; if (v88Aberta('loja')) renderLoja(); }); } };
})();
function v88LojaPinta(){
  const {coluna, painel} = V88S; if (!coluna) return;
  coluna.textContent = '';
  // (as peças da tampinha ficam sempre no lugar: o renderLoja de antes procura por elas dentro da loja; só escondem)
  for (const n of Array.from(painel.childNodes)) if (n !== V88S.blocoTampinhas) n.remove();
  if (V88S.blocoTampinhas.parentNode !== painel) painel.insertBefore(V88S.blocoTampinhas, painel.firstChild);
  const E = V88.estado;
  v88Coluna(coluna, V88_LOJA_CATS.map(([id, rot]) => ({id, rot, ic:id === 'inventario' ? 'pacotes' : id, n:id === 'ofertas' && E ? (E.ofertas || []).length : 0})), V88S.cat, c => { V88S.cat = c; v88LojaPinta(); const t = V88S.painel && V88S.painel.closest('.tl-corpo'); if (t) t.scrollTop = 0; });   // (a tela rola inteira: volta para o alto)
  const cat = V88S.cat;
  V88S.blocoTampinhas.hidden = cat !== 'tampinhas';
  if (cat === 'tampinhas'){ v88LojaExclusivas(painel); return; }
  const titulo = (V88_LOJA_CATS.find(x => x[0] === cat) || ['', ''])[1];
  const cab = nodo('div', 'v88-loja-cab'); cab.appendChild(nodo('h3', 'tl-sub', titulo));
  painel.appendChild(cab);
  if (!v88Logado()){
    if (cat === 'ofertas'){ painel.appendChild(V88S.blocoTrocas); }
    v88PrecisaConta(painel, 'As compras da loja (e o que você já tem)');
    if (cat !== 'ofertas') v88LojaGrade(painel, v88LojaLista(cat), true);
    return;
  }
  if (V88S.carregando && !E) return v88Carregando(painel);
  if (V88S.erro && !E) return v88Erro(painel, V88S.erro, () => { V88S.carregando = true; v88LojaPinta(); v88Estado(true).then(() => { V88S.erro = ''; }).catch(e => { V88S.erro = e.message; }).then(() => { V88S.carregando = false; v88LojaPinta(); }); });
  if (cat === 'destaques') cab.appendChild(nodo('small', 'v88-nota', 'Mudam todo dia (à meia-noite, horário de Brasília -3).'));
  if (cat === 'ofertas'){
    cab.appendChild(nodo('small', 'v88-nota', 'Itens com ' + ((typeof CAT88 !== 'undefined' && CAT88.ofertas.desconto) || 30) + '% de desconto nesta semana (e as dos eventos).'));
    v88LojaGrade(painel, v88LojaLista(cat));
    painel.appendChild(V88S.blocoTrocas);
    return;
  }
  if (cat === 'inventario') cab.appendChild(nodo('small', 'v88-nota', 'O que é seu na conta (vale em qualquer aparelho). Toque para equipar.'));
  const l = v88LojaLista(cat);
  if (!l.length) return v88Vazio(painel, cat === 'inventario' ? 'pacotes' : 'loja', cat === 'inventario' ? 'Nada no inventário ainda' : 'Nada por aqui agora', cat === 'inventario' ? 'Compre na loja, colete no correio, nas missões, no passe e nos eventos.' : '');
  v88LojaGrade(painel, l);
  painel.appendChild(nodo('p', 'v88-nota v88-loja-rodape', 'Só aparência: nenhum item muda a física, a força do chute ou a velocidade. Nada é vendido por dinheiro de verdade — moedas e gemas vêm de jogar, das missões, do passe e dos eventos.'));
}
function v88LojaLista(cat){
  const C = typeof CAT88 !== 'undefined' ? CAT88 : {itens:[], pacotes:[]}, E = V88.estado;
  if (cat === 'destaques') return E && E.destaques ? E.destaques.map(v => v.codigo) : C.itens.filter(i => !i.gratis && i.venda !== false).slice(0, 6).map(i => i.id);
  if (cat === 'ofertas') return E && E.ofertas ? E.ofertas.map(v => v.codigo) : [];
  if (cat === 'pacotes') return C.pacotes.map(p => p.id);
  if (cat === 'inventario') return C.itens.filter(i => V88.inv.has(i.id) || (i.gratis && i.tipo !== 'tampinha')).map(i => i.id).concat([...V88.inv].filter(c => /^peca:/.test(c)).slice(0, 60));
  const tipo = V88_TIPO_CAT[cat];
  return C.itens.filter(i => i.tipo === tipo).sort((a, b) => (a.gratis ? -1 : 0) - (b.gratis ? -1 : 0) || (a.gemas || 0) - (b.gemas || 0) || (a.moedas || 0) - (b.moedas || 0)).map(i => i.id);
}
function v88LojaEstadoDe(codigo){                          // 'equipado' · 'seu' · 'venda' · 'fora' (não está à venda)
  const it = v88Item(codigo), pc = v88Pacote(codigo);
  if (pc) return pc.itens.every(c => V88.inv.has(c)) ? 'seu' : 'venda';
  if (/^peca:/.test(codigo)) return V88.inv.has(codigo) ? 'seu' : 'venda';
  if (!it) return 'fora';
  const tem = it.gratis || V88.inv.has(codigo);
  if (tem && (CAT88.tiposEquipaveis || []).indexOf(it.tipo) >= 0 && v88Equipado(it.tipo) === codigo) return 'equipado';
  if (tem) return 'seu';
  return v88Venda(codigo) ? 'venda' : 'fora';
}
function v88LojaGrade(pai, lista, soVer){
  const g = nodo('div', 'v88-itens');
  for (const codigo of lista){
    const it = v88Item(codigo), pc = v88Pacote(codigo), peca = /^peca:/.test(codigo), v = v88Venda(codigo), st = soVer ? (it && it.gratis ? 'seu' : 'venda') : v88LojaEstadoDe(codigo);
    const nome = it ? it.nome : pc ? pc.nome : peca ? (typeof nomeDaPeca88 === 'function' ? nomeDaPeca88(codigo) : codigo.slice(5)) : codigo;
    const rar = it ? it.raridade : pc ? pc.raridade : 'comum', R = v88Raridade(rar);
    const b = novoBotao('v88-item st-' + st, nome); b.style.setProperty('--r', R.cor); b.dataset.r = rar;
    const mini = nodo('span', 'v88-item-mini'); mini.appendChild(v88MiniItem(codigo, 112));
    if (v && v.desconto) mini.appendChild(nodo('em', 'v88-item-off', '-' + v.desconto + '%'));
    const tipo = it ? V88_TIPO_NOME[it.tipo] : pc ? 'PACOTE' : 'PEÇA';
    b.append(mini, nodo('small', 'v88-item-rar', tipo + ' · ' + R.nome.toUpperCase()), nodo('b', 'v88-item-nome', nome));
    const pe = nodo('span', 'v88-item-pe');
    if (st === 'equipado') pe.appendChild(nodo('span', 'v88-item-st on', 'EQUIPADO'));
    else if (st === 'seu') pe.appendChild(nodo('span', 'v88-item-st', it && (CAT88.tiposEquipaveis || []).indexOf(it.tipo) >= 0 ? 'EQUIPAR' : 'É SEU'));
    else if (st === 'venda' && v){ if (v.desconto) pe.appendChild(nodo('s', 'v88-item-de', fmtNum(v.base.gemas || v.base.moedas))); pe.appendChild(v88Preco(v.moedas, v.gemas)); }
    else pe.appendChild(nodo('span', 'v88-item-st', it && it.tipo === 'tampinha' ? 'DO PASSE' : 'NÃO VENDE'));
    b.appendChild(pe);
    b.addEventListener('click', () => { som.clique(); v88ItemAbre(codigo); });
    g.appendChild(b);
  }
  pai.appendChild(g);
}
function v88LojaExclusivas(pai){                           // as tampinhas exclusivas (do passe): o que é cada uma e se já é sua
  const l = (typeof CAT88 !== 'undefined' ? CAT88.itens : []).filter(i => i.tipo === 'tampinha');
  if (!l.length) return;
  const cab = nodo('div', 'v88-loja-cab'); cab.append(nodo('h3', 'tl-sub', 'TAMPINHAS EXCLUSIVAS'), nodo('small', 'v88-nota', 'Não vendem: vêm do Passe RACHA e dos eventos. As suas aparecem no editor da tampinha, em INVENTÁRIO › DA SUA CONTA.'));
  pai.appendChild(cab);
  v88LojaGrade(pai, l.map(i => i.id), !v88Logado());
}
function nomeDaPeca88(codigo){                              // "peca:b:dt" → "Borda Dente" (o nome do editor)
  try { const t = codigo.slice(5, 6), id = codigo.slice(7), it = tpMapaDe(t).get(id); return ({b:'Borda ', f:'Forma ', p:'Padrão ', i:'Ícone '}[t] || '') + (it ? it.nome : id); } catch (_) { return codigo; }
}

/* ---- o produto aberto (o desenho grande, a descrição, o preço e o botão certo) ---- */
function v88ItemAbre(codigo){
  const it = v88Item(codigo), pc = v88Pacote(codigo), v = v88Venda(codigo), st = v88Logado() ? v88LojaEstadoDe(codigo) : 'venda';
  const nome = it ? it.nome : pc ? pc.nome : nomeDaPeca88(codigo), rar = it ? it.raridade : pc ? pc.raridade : 'comum', R = v88Raridade(rar);
  abrePop(c => {
    c.classList.add('v88-pop', 'v88-item-pop'); c.style.setProperty('--r', R.cor);
    const topo = nodo('div', 'v88-item-pop-topo'), mini = nodo('div', 'v88-item-pop-mini'); mini.appendChild(v88MiniItem(codigo, 220));
    const tx = nodo('div', 'v88-item-pop-tx');
    tx.append(nodo('span', 'pop-tag', (it ? V88_TIPO_NOME[it.tipo] : pc ? 'PACOTE' : 'PEÇA') + ' · ' + R.nome.toUpperCase()), nodo('h2', null, nome));
    if (it && it.desc) tx.appendChild(nodo('p', 'pop-txt', it.desc));
    if (pc){
      tx.appendChild(nodo('p', 'pop-txt', pc.desc || ''));
      const ul = nodo('ul', 'v88-pac-l');
      for (const ci of pc.itens){ const x = v88Item(ci), li = nodo('li', V88.inv.has(ci) ? 'tem' : ''); li.append(v88MiniItem(ci, 48), nodo('span', null, x ? x.nome : ci), nodo('small', null, V88.inv.has(ci) ? 'já é seu' : x ? V88_TIPO_NOME[x.tipo] : '')); ul.appendChild(li); }
      tx.appendChild(ul);
      const tem = pc.itens.filter(ci => V88.inv.has(ci)).length; if (tem && tem < pc.itens.length) tx.appendChild(nodo('p', 'v88-nota', 'Você já tem ' + tem + ' dos ' + pc.itens.length + ' itens: o pacote entrega os que faltam (o preço é o do pacote).'));
    }
    if (it && it.tipo === 'caixa' && Array.isArray(it.conteudo)) tx.appendChild(nodo('p', 'v88-nota', 'Conteúdo fixo, mostrado antes: sem sorteio.'));
    if (v && st === 'venda'){ const p = nodo('div', 'v88-item-pop-preco'); if (v.desconto) p.appendChild(nodo('s', null, fmtNum(v.base.gemas || v.base.moedas))); p.appendChild(v88Preco(v.moedas, v.gemas)); if (v.desconto) p.appendChild(nodo('em', 'v88-tag vermelho', '-' + v.desconto + '%')); tx.appendChild(p); }
    topo.append(mini, tx); c.appendChild(topo);
    const a = nodo('div', 'pop-acoes');
    a.appendChild(botaoPop('FECHAR', '', () => { som.clique(); fechaPop(); }));
    const equipavel = it && (CAT88.tiposEquipaveis || []).indexOf(it.tipo) >= 0;
    if (!v88Logado()){ if (v88TemPlataforma() && typeof v84AbreLogin === 'function' && window.RACHA84 && !window.RACHA84.embutido) a.appendChild(botaoPop('ENTRAR PARA COMPRAR', 'amarelo', () => { som.clique(); fechaPop(); try { fechaTela(); } catch (_) {} v84AbreLogin('entrar'); })); }
    else if (st === 'equipado') a.appendChild(botaoPop('EQUIPADO', 'verde', () => { som.clique(); fechaPop(); }));
    else if (st === 'seu' && equipavel) a.appendChild(botaoPop('EQUIPAR', 'verde', () => { som.clique(); fechaPop(); v88Equipa(it.tipo, codigo); }));
    else if (st === 'seu' && it && it.tipo === 'tampinha') a.appendChild(botaoPop('USAR NO EDITOR', 'verde', () => { som.clique(); fechaPop(); abreTela('skins', 'loja'); }));
    else if (st === 'venda' && v){
      const pode = CONTA.moedas >= v.moedas && CONTA.gemas >= v.gemas;
      a.appendChild(botaoPop(pode ? 'COMPRAR' : 'FALTA SALDO', pode ? 'verde' : '', () => { som.clique(); if (!pode){ som.erro(); v88FaltaSaldo(v); return; } fechaPop(); v88Compra(codigo, v); }));
    }
    c.appendChild(a);
  });
}
function v88FaltaSaldo(v){
  const fm = Math.max(0, v.moedas - CONTA.moedas), fg = Math.max(0, v.gemas - CONTA.gemas);
  v88Aviso('Faltam ' + [fm ? fmtNum(fm) + ' moedas' : '', fg ? fmtNum(fg) + ' gemas' : ''].filter(Boolean).join(' e ') + '. Jogue partidas, cumpra missões ou troque gemas em OFERTAS.');
}
function v88Compra(codigo, v){
  v88Confirma('LOJA', 'COMPRAR ' + String(v.nome).toUpperCase() + '?', 'Preço: ' + (v.gemas ? fmtNum(v.gemas) + ' gemas' : fmtNum(v.moedas) + ' moedas') + '. Saldo depois: ' + fmtNum(CONTA.moedas - v.moedas) + ' moedas · ' + fmtNum(CONTA.gemas - v.gemas) + ' gemas. O item fica na sua conta.', 'COMPRAR', () => {
    v88M('loja.comprar', {codigo, preco:{moedas:v.moedas, gemas:v.gemas}}).then(r => {
      if (r && r.carteira) v88PoeCarteira(r.carteira);
      const pc = v88Pacote(codigo); for (const c of (pc ? pc.itens : [codigo])) V88.inv.add(c);
      som.compra();
      const it = v88Item(codigo);
      if (it && (CAT88.tiposEquipaveis || []).indexOf(it.tipo) >= 0){
        abrePop(cx => {
          cx.classList.add('v88-pop'); cx.append(nodo('span', 'pop-tag', 'COMPRADO!'), nodo('h2', null, it.nome.toUpperCase()));
          const m = nodo('div', 'v88-item-pop-mini'); m.appendChild(v88MiniItem(codigo, 160)); cx.appendChild(m);
          const a = nodo('div', 'pop-acoes'); a.append(botaoPop('DEPOIS', '', () => { som.clique(); fechaPop(); }), botaoPop('EQUIPAR AGORA', 'verde', () => { som.clique(); fechaPop(); v88Equipa(it.tipo, codigo); })); cx.appendChild(a);
        });
      } else v88Aviso((r && r.nome ? r.nome : 'Item') + ' comprado!');
      v88Estado(true).then(() => { if (v88Aberta('loja')) renderLoja(); }).catch(() => {});
      if (v88Aberta('loja')) renderLoja();
    }).catch(e => {
      som.erro(); v88Aviso(e.message || 'A compra não deu certo: nada foi cobrado.');
      if (/preço mudou|já tem|já foi feita/i.test(e.message || '')) v88Estado(true).then(() => { if (v88Aberta('loja')) renderLoja(); }).catch(() => {});
    });
  });
}
function v88Equipa(tipo, codigo){
  if (!v88Logado()) return;
  v88M('loja.equipar', {tipo, codigo}).then(r => {
    if (r && r.equipados) v88PoeEquipados(r.equipados);
    som.compra(); v88Aviso('Equipado!');
    v88RelacoesMudaram();
    if (v88Aberta('loja')) renderLoja();
  }).catch(e => { som.erro(); v88Aviso(e.message); });
}
v88On('carteira', () => { if (v88Aberta('loja')) try { lbCarteira(); } catch (_) {} });
v88On('inventario', () => { if (v88Aberta('loja') && V88S.montada) v88LojaPinta(); });
