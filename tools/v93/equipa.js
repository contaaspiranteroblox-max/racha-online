/* ==================================================================================================================
   RACHA v93 · Fase 1 — OS ITENS QUE NÃO EQUIPAVAM (investigado e corrigido categoria por categoria)
   O que estava errado (e o que mudou):
   1) EFEITOS de chute: só apareciam quando o botão tinha acabado de ser apertado (BOTAO.novo). O chute armado (segurou
      antes de chegar na bola) e o toque armado da v92 (o toque espera a bola uns passos) saíam sem o efeito — quase todo
      chute do treino. Agora o efeito sai em todo chute de verdade (no máximo um a cada 180 ms por jogador).
   2) TAMPINHAS exclusivas (do passe e dos eventos): sumiam da lista DA SUA CONTA do editor quando ele abria (a lista das
      skins do site substituía a do inventário). Agora as duas se somam; e na LOJA a exclusiva que é sua tem EQUIPAR
      (antes: USAR NO EDITOR, que abria o editor com a tampinha de antes) e mostra EQUIPADA quando é a que você usa.
   3) BORDAS, PADRÕES e ÍCONES comprados na loja: o produto dizia "É SEU" e só tinha FECHAR. Agora tem EQUIPAR NA TAMPINHA
      (troca só aquela peça na sua tampinha, na hora, e salva na conta) e EDITAR. O INVENTÁRIO mostra todas as peças (antes
      parava em 60) e a miniatura da FORMA do escudo mostra a forma.
   4) Equipar e TIRAR: o equipado aparece na hora (antes esperava o servidor) e não volta mais sozinho para o anterior (a
      resposta do estado da loja que saiu ANTES do equipar desfazia a troca na tela). Os pedidos vão um de cada vez. Cada
      item equipado (que não é o padrão) tem TIRAR — volta ao padrão, também na conta.
   5) O equipado era guardado no aparelho sem dono: outra conta no mesmo aparelho (ou depois de sair) via os itens da
      anterior. Agora o guardado é da conta; ao sair, tudo volta ao padrão.
   6) Os cosméticos antigos da v49 (o aro e a faixa na tampinha, a comemoração) não tinham mais onde trocar — quem
      escolheu um ficou com ele preso. Voltam ao original (uma vez; vale também na cópia da conta).
   7) As recompensas de nível do site (banners, molduras, títulos, emblemas) não apareciam no jogo: os banners entram no
      catálogo do jogo (equipam no BANNER), e o INVENTÁRIO ganha ITENS DO CARTÃO DA CONTA (moldura e título equipam no
      cartão da conta; a skin de nível equipa na tampinha).
   8) A compra de peças com desconto de evento no editor dava "O preço mudou" (o editor somava o preço cheio): agora usa o
      preço da conta. E logo depois de entrar na conta, antes de a carteira chegar, o editor comprava no aparelho (e a peça
      "sumia" depois): agora espera a carteira.
   9) Trocar de tampinha ou de cosmético várias vezes seguidas: o servidor das salas descartava os avisos que passavam do
      ritmo (e os outros jogadores continuavam vendo a antiga). Agora o jogo junta os avisos e manda o último na hora certa.
   A bola equipada continua sendo vista só por quem a equipou (cada um vê a bola que escolheu: a visibilidade da bola não
   muda para ninguém); a tampinha, o efeito do chute, a comemoração e o gol aparecem para todos na partida online.
   ================================================================================================================== */
const V93E = {fila:Promise.resolve(), marca:0, pend:0, perfil:{t:0, timer:0, msg:null}, rel:{t:0, timer:0, msg:null}, cartao:null, cartaoT:0};

/* ---------------------------------------------------------------- 1) o efeito do chute no chute armado (cosmeticos.js) */
function v93FxArmado(q){ const t = performance.now(); if (q.v93FxT && t - q.v93FxT < 180) return false; q.v93FxT = t; return true; }

/* ---------------------------------------------------------------- 2) e 3) os rótulos e os botões da loja */
function v93PecaPartes(codigo){ const m = /^peca:([bfpi]):([a-z0-9-]{2})$/.exec(codigo || ''); return m ? {t:m[1], id:m[2]} : null; }
function v93PecaUsada(codigo){
  const p = v93PecaPartes(codigo); if (!p || p.t === 'f') return false;
  const D = tpLe(tpMinha()); if (!D) return false;
  return p.t === 'b' ? D.b === p.id : p.t === 'p' ? D.p === p.id : D.i === p.id;
}
function v93ComPeca(codigo){                                    // a sua tampinha com a peça no lugar
  const p = v93PecaPartes(codigo); if (!p || p.t === 'f') return null;
  const D = tpLe(tpMinha()) || TP_PADRAO_D();
  if (p.t === 'b') D.b = p.id;
  else if (p.t === 'p'){ D.p = p.id; if (!Array.isArray(D.pp)) D.pp = [50, 50, 50, 0]; }
  else { D.i = p.id; const it = tpMapaDe('i').get(p.id); if (it && it.texto && !D.t) D.t = 'RACHA'; }
  return D;
}
function v93UsaPeca(codigo){
  const D = v93ComPeca(codigo); if (!D) return false;
  const cod = tpCodigo(tpNorm(D));
  if (tpFaltam(tpLe(cod)).length){ ED.experimenta = {D, aba:codigo[5] === 'b' ? 'b' : codigo[5] === 'p' ? 'p' : 'i'}; abreTela('skins', 'loja'); return false; }   // (falta outra peça: o editor mostra o que falta)
  if (!tpEquipa(cod)){ som.erro(); v88Aviso('Não deu para equipar essa peça.'); return false; }
  som.compra(); v88Aviso(nomeDaPeca88(codigo) + ' na sua tampinha!');
  if (v88Aberta('loja')) renderLoja();
  return true;
}
function v93ExclusivaCod(id){ try { const e = TP_CONTA[id]; return e ? tpCodigo(tpNorm(tpD(e.d))) : ''; } catch (_) { return ''; } }
function v93RotuloSeu(codigo, it){
  if (it && (CAT88.tiposEquipaveis || []).indexOf(it.tipo) >= 0) return 'EQUIPAR';
  if (it && it.tipo === 'tampinha') return 'EQUIPAR';
  const p = v93PecaPartes(codigo); if (p && p.t !== 'f') return 'EQUIPAR';
  return 'É SEU';
}
const v88LojaEstadoDeAntes93 = v88LojaEstadoDe;
v88LojaEstadoDe = function(codigo){
  const st = v88LojaEstadoDeAntes93(codigo);
  if (st !== 'seu') return st;
  try {
    const it = v88Item(codigo);
    if (it && it.tipo === 'tampinha'){ const c = v93ExclusivaCod(codigo); if (c && c === tpMinha()) return 'equipado'; }
    if (v93PecaUsada(codigo)) return 'equipado';
  } catch (_) {}
  return st;
};
const v88ItemAbreAntes93 = v88ItemAbre;
v88ItemAbre = function(codigo){
  const r = v88ItemAbreAntes93.apply(this, arguments);
  try { v93ItemAcoes(codigo); } catch (e) { console.error('v93 item', e); }
  return r;
};
function v93ItemAcoes(codigo){
  const c = LB.popCaixa, a = c && c.querySelector('.pop-acoes'); if (!a || LB.pop.hidden || !v88Logado()) return;
  const it = v88Item(codigo), st = v88LojaEstadoDe(codigo), p = v93PecaPartes(codigo), tem = V88.inv.has(codigo) || (p && TP.itens.has(p.t + ':' + p.id));
  const tira = (rot, fn, cls) => { const b = botaoPop(rot, cls || '', fn); a.appendChild(b); return b; };
  if (p && tem){                                                 // a peça da tampinha
    if (p.t === 'f'){ c.appendChild(nodo('p', 'v88-nota', 'A forma é do escudo do clube: CLUBE › ESCUDO.')); return; }
    if (st === 'equipado') tira('NA SUA TAMPINHA', () => { som.clique(); fechaPop(); }, 'verde');
    else tira('EQUIPAR NA TAMPINHA', () => { som.clique(); fechaPop(); v93UsaPeca(codigo); }, 'verde');
    tira('EDITAR', () => { som.clique(); fechaPop(); const D = v93ComPeca(codigo); if (D) ED.experimenta = {D, aba:p.t === 'b' ? 'b' : p.t === 'p' ? 'p' : 'i'}; abreTela('skins', 'loja'); });
    return;
  }
  if (it && it.tipo === 'tampinha' && v88Tem(codigo)){            // a tampinha exclusiva: equipa direto
    for (const b of a.querySelectorAll('button')) if (/USAR NO EDITOR/.test(b.textContent)) b.remove();
    const cod = v93ExclusivaCod(codigo);
    if (st === 'equipado') tira('EQUIPADA', () => { som.clique(); fechaPop(); }, 'verde');
    else if (cod) tira('EQUIPAR', () => { som.clique(); fechaPop(); TP.livres.add(cod); if (tpEquipa(cod)){ som.compra(); v88Aviso(it.nome + ' equipada!'); if (v88Aberta('loja')) renderLoja(); } }, 'verde');
    return;
  }
  const pad = it && CAT88.padroes ? CAT88.padroes[it.tipo] : '';
  if (it && st === 'equipado' && pad && pad !== codigo){          // TIRAR: volta ao padrão
    const b = tira('TIRAR', () => { som.clique(); fechaPop(); v88Equipa(it.tipo, pad); });
    a.insertBefore(b, a.lastChild);
  }
}

/* ---------------------------------------------------------------- 4) equipar: na hora, um de cada vez, sem voltar sozinho */
v88Equipa = function(tipo, codigo){
  if (!v88Logado()) return;
  const antes = Object.assign({}, V88.equip), pad = CAT88.padroes && CAT88.padroes[tipo];
  V93E.marca = Date.now(); V93E.pend++;
  V88.equip = Object.assign({}, V88.equip, {[tipo]:codigo}); v93GuardaEquip(); v88Emite('equipados', V88.equip);   // (aparece na hora)
  if (v88Aberta('loja')) renderLoja();
  V93E.fila = V93E.fila.then(() => v88M('loja.equipar', {tipo, codigo})).then(r => {
    V93E.marca = Date.now(); V93E.pend = Math.max(0, V93E.pend - 1);
    if (r && r.equipados) v88PoeEquipados(r.equipados);
    som.compra(); v88Aviso(codigo === pad ? 'Tirado: voltou ao padrão.' : 'Equipado!');
    v88RelacoesMudaram();
    if (v88Aberta('loja')) renderLoja();
  }).catch(e => {
    V93E.pend = Math.max(0, V93E.pend - 1);
    V88.equip = antes; v93GuardaEquip(); v88Emite('equipados', V88.equip);
    som.erro(); v88Aviso((e && e.message) || 'Não deu para equipar.');
    if (v88Aberta('loja')) renderLoja();
  });
};
v88Estado = function(forca){                                     // (o mesmo de antes; só não desfaz um equipar mais novo que o pedido)
  if (!v88Logado()) return Promise.resolve(null);
  if (!forca && V88.estado && Date.now() - V88.sincT < 20000) return Promise.resolve(V88.estado);
  V88.sincT = Date.now();
  const t0 = Date.now();
  return v88Q('loja.estado').then(e => {
    if (!e) return null;
    V88.estado = e;
    v88PoeCarteira(e.carteira); v88PoeInventario(e.inventario);
    if (!V93E.pend && V93E.marca < t0) v88PoeEquipados(e.equipados);
    return e;
  }).catch(err => { V88.sincT = 0; throw err; });
};

/* ---------------------------------------------------------------- 5) o equipado guardado é da conta */
function v93Dono(){ try { return C82.conta ? v88Pub(C82.conta.idPublico) : ''; } catch (_) { return ''; } }
function v93GuardaEquip(){ try { localStorage.setItem('racha88-equip', JSON.stringify(Object.assign({}, V88.equip, {__dono:v93Dono()}))); } catch (_) {} }
const v88PoeEquipadosAntes93 = v88PoeEquipados;
v88PoeEquipados = function(e){
  if (!e || typeof e !== 'object') return;
  v88PoeEquipadosAntes93(e);
  V88.equip.__dono = v93Dono(); v93GuardaEquip();
};
v88Equipado = function(tipo){
  const P = (typeof CAT88 !== 'undefined' && CAT88.padroes) || {};
  if (!v88Logado()) return P[tipo] || '';
  const d = V88.equip && V88.equip.__dono;
  if (d && d !== v93Dono()) return P[tipo] || '';               // (o guardado é de outra conta: até o servidor responder, o padrão)
  return (V88.equip && V88.equip[tipo]) || P[tipo] || '';
};
const v88CosAntes93 = v88Cos;                                   // (os seus cosméticos na partida: os da sua conta, nunca os guardados de outra)
v88Cos = function(q){
  if (q === P && !(NET49.playing && NET49.localSlot < 0)){ if (!v88Logado()) return null; const o = {}; for (const t of (CAT88.tiposEquipaveis || [])) o[t] = v88Equipado(t); return o; }
  return v88CosAntes93.apply(this, arguments);
};
const v88EsqueceAntes93 = v88Esquece;
v88Esquece = function(){ const r = v88EsqueceAntes93.apply(this, arguments); V88.equip = {}; V93E.cartao = null; try { localStorage.removeItem('racha88-equip'); } catch (_) {} v88Emite('equipados', V88.equip); return r; };

/* ---------------------------------------------------------------- 6) os cosméticos antigos da v49 (sem onde trocar) voltam ao original */
try {
  if (X49.border !== 'plain' || X49.uniform !== 'plain' || X49.celebration !== 'confetti'){
    X49.border = 'plain'; X49.uniform = 'plain'; X49.celebration = 'confetti'; x49Save();
  }
} catch (_) {}

/* ---------------------------------------------------------------- 7) os itens do cartão da conta (as recompensas de nível do site) */
const V93_CARTAO_CATS = {moldura:'MOLDURA', titulo:'TÍTULO', emblema:'EMBLEMA', efeito:'EFEITO DO CARTÃO', skin:'TAMPINHA', banner:'BANNER'};
function v93CartaoCarrega(forca){
  if (!v88Logado()) return Promise.resolve(null);
  if (!forca && V93E.cartao && Date.now() - V93E.cartaoT < 30000) return Promise.resolve(V93E.cartao);
  V93E.cartaoT = Date.now();
  return v88Q('perfil.meuInventario').then(l => {
    V93E.cartao = (Array.isArray(l) ? l : []).filter(i => i && V93_CARTAO_CATS[i.categoria] && !v88Item(i.codigo) && !/^peca:|^emb_/.test(i.codigo));
    return V93E.cartao;
  }).catch(() => { V93E.cartaoT = 0; return V93E.cartao; });
}
function v93CartaoEquipa(i){
  if (i.categoria === 'skin'){ const cod = v93ExclusivaCod(i.codigo); if (!cod){ v88Aviso('Essa tampinha ainda não tem desenho no jogo.'); return; } TP.livres.add(cod); if (tpEquipa(cod)){ som.compra(); v88Aviso(i.nome + ' equipada!'); } return; }
  const campo = i.categoria === 'moldura' ? 'molduraEquipada' : i.categoria === 'titulo' ? 'tituloEquipado' : '';
  if (!campo) return;
  const valor = i.equipado ? null : i.codigo;                       // (o título vai pelo código: o servidor guarda o nome)
  v88M('perfil.editarPerfil', {[campo]:valor}).then(() => {
    som.compra(); v88Aviso(valor ? i.nome + ' no seu cartão!' : 'Tirado do cartão.');
    v93CartaoCarrega(true).then(() => { if (v88Aberta('loja')) renderLoja(); });
  }).catch(e => { som.erro(); v88Aviso((e && e.message) || 'Não deu para equipar.'); });
}
function v93CartaoBloco(pai){
  const l = V93E.cartao; if (!l || !l.length) return;
  const cab = nodo('div', 'v88-loja-cab'); cab.append(nodo('h3', 'tl-sub', 'ITENS DO CARTÃO DA CONTA'), nodo('small', 'v88-nota', 'As recompensas de nível e de evento da conta: a moldura e o título aparecem no seu cartão; a tampinha equipa no jogo.'));
  pai.appendChild(cab);
  const g = nodo('div', 'v88-itens v93-cartao');
  for (const i of l){
    const b = novoBotao('v88-item' + (i.equipado ? ' st-equipado' : ' st-seu'), i.nome);
    const cores = (i.visual && Array.isArray(i.visual.cores) ? i.visual.cores : ['#3b5bdb', '#ffd23f']);
    const mini = nodo('span', 'v88-item-mini v93-cartao-mini'); mini.style.background = 'linear-gradient(135deg, ' + cores[0] + ', ' + (cores[1] || cores[0]) + ')';
    mini.appendChild(nodo('b', null, (i.visual && i.visual.emoji) || '★'));
    const equipavel = i.categoria === 'moldura' || i.categoria === 'titulo' || i.categoria === 'skin';
    const st = i.categoria === 'skin' ? (v93ExclusivaCod(i.codigo) === tpMinha() ? 'EQUIPADA' : 'EQUIPAR') : !equipavel ? 'NO CARTÃO' : i.equipado ? 'TIRAR' : 'EQUIPAR';
    b.append(mini, nodo('small', 'v88-item-rar', V93_CARTAO_CATS[i.categoria] + ' · ' + String(i.raridade || '').toUpperCase()), nodo('b', 'v88-item-nome', i.nome), nodo('span', 'v88-item-pe', ''));
    b.lastChild.appendChild(nodo('span', 'v88-item-st' + (i.equipado || st === 'EQUIPADA' ? ' on' : ''), st));
    b.addEventListener('click', () => { som.clique(); if (equipavel && st !== 'EQUIPADA') v93CartaoEquipa(i); });
    g.appendChild(b);
  }
  pai.appendChild(g);
}
const v88LojaPintaAntes93 = v88LojaPinta;
v88LojaPinta = function(){
  const r = v88LojaPintaAntes93.apply(this, arguments);
  try {
    if (V88S.cat === 'inventario' && v88Logado()){
      if (V93E.cartao) v93CartaoBloco(V88S.painel);
      if (!V93E.cartao || Date.now() - V93E.cartaoT > 30000) v93CartaoCarrega().then(l => { if (l && l.length && V88S.cat === 'inventario' && v88Aberta('loja')) v88LojaPintaAntes93Re(); });
    }
  } catch (e) { console.error('v93 cartão', e); }
  return r;
};
function v88LojaPintaAntes93Re(){ try { v88LojaPinta(); } catch (_) {} }

/* ---------------------------------------------------------------- 8) as peças no editor: o preço da conta, e esperar a carteira */
const tpFaltamAntes93 = tpFaltam;
tpFaltam = function(D){
  const L = tpFaltamAntes93(D);
  try {
    if (v88Logado() && V88.estado) for (const x of L){ const v = v88Venda('peca:' + tpChave(x.tipo, x.id)); if (v && (v.moedas || v.gemas)) x.pr = {m:v.moedas | 0, g:v.gemas | 0}; }
  } catch (_) {}
  return L;
};
const tpCompraAntes93 = tpCompra;
tpCompra = function(D){
  if (v88Logado() && !V88.carteiraOk){                           // (entrou agora: a carteira da conta ainda não chegou)
    som.erro(); v88Aviso('Carregando a carteira da sua conta… toque de novo em instantes.');
    v88Estado(true).catch(() => {});
    return false;
  }
  return tpCompraAntes93.apply(this, arguments);
};

/* ---------------------------------------------------------------- 9) os avisos para a sala: juntos, no ritmo do servidor */
function v93NoRitmo(o, ms, m, manda){
  const agora = Date.now(); o.msg = m;
  if (agora - o.t >= ms && !o.timer){ o.t = agora; o.msg = null; return manda(m); }
  if (!o.timer) o.timer = setTimeout(() => { o.timer = 0; o.t = Date.now(); const x = o.msg; o.msg = null; if (x) manda(x); }, Math.max(60, ms - (agora - o.t)));
  return true;
}
const net49SendAntes93 = net49Send;
net49Send = function(m){
  if (m && m.type === 'profile') return v93NoRitmo(V93E.perfil, 2100, m, x => net49SendAntes93(x));      // (o servidor: 1 a cada 2 s)
  if (m && m.type === 'relacoes') return v93NoRitmo(V93E.rel, 5200, m, x => net49SendAntes93(x));       // (1 a cada 5 s)
  return net49SendAntes93.apply(this, arguments);
};
