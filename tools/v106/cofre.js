/* ======================================================================================================================
   RACHA v106 · O COFRE NO ESTILO DAS FOTOS (o pedido: "quero o cofre nesse estilo das foto"; as 5 capturas eram de outro
   jogo, só para o jeito — o LAYOUT e a linguagem visual: as abas, o pedestal, os cartões bege, o cadeado, o check e o roxo do
   criar. O fundo é o do RACHA e todo desenho sai do código do jogo: as tampinhas, as bolas, os banners, os escudos…).
   · A MESMA TELA 'cofre' (a do V90CF, montada pela v90), com o desenho novo por cima: o render e o abre do V90CF são trocados
     aqui (o texto da v90 fica como estava). Tudo que abria o COFRE abre o novo: o atalho COFRE da barra do lobby, o toque na
     tampinha grande, o "+ FAVORITA" da RODA, o v90AbreCofre(cat) (a categoria antiga vira a aba nova) e o abreTela('cofre').
   · Em cima, a faixa de sempre (o VOLTAR — azul, como nas fotos —, o título e as moedas e as gemas). À ESQUERDA, a peça
     escolhida GRANDE no pedestal (o disco cinza), um botão em cima e a placa com o nome embaixo. À DIREITA, a barra escura
     com as ABAS (a escolhida com o sublinhado branco) e a GRADE de cartões bege: a peça no meio, o CADEADO no canto do que não
     é seu (com o preço embaixo), o CHECK verde no equipado e a raridade numa faixinha na cor dela (CAT88.raridades). Só a
     grade rola; a página, não.
   · As ABAS (o que cada uma lê e chama):
     CARTÕES — os banners do catálogo (o fundo do cartão do perfil); à esquerda, o cartão equipado (v88Equipado('banner'),
       desenhado pelo v88DesenhaBanner, com a sua tampinha e o seu nome).
     SKIN — o CRIAR PERSONALIZADO (roxo, primeiro: abreTela('skins', 'cofre'), o editor volta para cá), a equipada (tpMinha),
       as criadas (TP.salvas, com a ★ das favoritas da RODA: o v90AlternaFavorita de sempre), as da conta (TP_CONTA que são
       suas) e, numa parte só delas, as tampinhas do catálogo À VENDA (venda não false e com preço: aparecem sozinhas, mesmo
       com as prontas escondidas pela v101 — e, sendo de comprar, não contam como "prontas": equipam e aparecem na partida).
       Embaixo, EMOJI NA TAMPINHA: os emojis da v95 (o que vai no meio da tampinha; emjTem / emjEquipa / a compra da v95).
       À esquerda, a tampinha equipada com o emoji, o ALTERAR AVATAR (abre MAIS › AVATARES) e o nome do jogador.
     EMOJI — os emojis de REAÇÃO da partida, pela window.RachaEmotes106 (lista, desenha, slots, poeSlot, padrao, mudou): à
       esquerda a CRUZ dos 5 lugares (cima, esquerda, meio, direita e baixo, com as setas; tocar escolhe o lugar aceso) e o
       PADRÃO; à direita a grade de todos (de graça; tocar põe o emoji no lugar aceso). Sem a API, o aviso de que eles chegam
       na próxima versão (sem erro). (O desenha leva um 6º argumento a mais, que a API dos emojis entende: na cruz o círculo sem
       a pontinha do balão, {ponta:null}; na grade a pontinha cabendo no quadrado, {alcance:1.12}. Quem não entende, ignora.)
     ESCUDO DO CLUBE — o seu clube pelo clbApi() (o da conta, o da turma ou o deste aparelho: meu() e ver()); à esquerda o
       escudo grande (ou SEM CLUBE, com o IR PARA O CLUBE); à direita os escudos prontos (TP_PRE_ESCUDO). Só o DONO troca (a
       regra do clube, nos três lugares): toca e troca pelo clbApi().editar(id, {escudo}) — o mesmo caminho do lápis do clube;
       as peças que faltam no escudo são compradas antes, como no editor (tpCompra). Quem não é o dono vê quem pode.
     BOLA — a bola equipada no pedestal e todas as bolas do catálogo (as novas, com padrões novos, aparecem sozinhas: o
       desenho é o da loja, v88MiniItem).
     MAIS — AVATARES, EFEITOS, COMEMORAÇÕES e GOLS (as sub-abas pequenas), no mesmo estilo.
   · Tocar num seu = equipar na hora (o pedestal muda: v88Equipa / tpEquipa / emjEquipa). Tocar num bloqueado = a janelinha com
     a peça, o preço (moedas ou gemas) e COMPRAR / CANCELAR: a compra é a da LOJA (o v88Compra: o loja.comprar no servidor
     confere o preço e o saldo; a janelinha do cofre já é a confirmação, então a pergunta da loja não aparece de novo). Sem
     conta, tudo à vista (o de graça e o que é seu no aparelho sem cadeado, o equipado com o check); tocar no bloqueado explica
     que precisa entrar na conta. Na demonstração sem servidor, os emojis da tampinha como a v95 (as moedas do aparelho).
   · O teclado: as abas com as setas, os cartões em ordem, o foco sempre à vista; cada botão com o aria-label do que faz.
   Só aparência e as compras de sempre: nada aqui mexe na física, na partida ou nas regras.
   ====================================================================================================================== */
const V106 = {aba:'skin', sub:'avatares', slot:0, rola:{}, clube:{estado:'', c:null, t:0, erro:'', tok:0, tipo:''}, pendEscudo:null,
  cods:{n:-1, set:new Set()}, emoOuve:new WeakSet(), emjT:0, mini:new Map()};
const V106_ABAS = [['cartoes', 'CARTÕES'], ['skin', 'SKIN'], ['emoji', 'EMOJI'], ['escudo', 'ESCUDO DO CLUBE'], ['bola', 'BOLA'], ['mais', 'MAIS']];
const V106_SUB = [['avatares', 'AVATARES', 'avatar'], ['efeitos', 'EFEITOS', 'efeito'], ['comemoracoes', 'COMEMORAÇÕES', 'comemoracao'], ['gols', 'GOLS', 'gol']];
// as categorias da v90 (o v90AbreCofre de quem já chamava) → a aba nova
const V106_DE90 = {tampinhas:'skin', emojis:'skin', banners:'cartoes', bolas:'bola', emotes:'emoji', avatares:'mais:avatares', efeitos:'mais:efeitos',
  comemoracoes:'mais:comemoracoes', gols:'mais:gols', escudo:'escudo', cartoes:'cartoes', skin:'skin', emoji:'emoji', bola:'bola', mais:'mais'};
const V106_LUGARES = ['CIMA', 'ESQUERDA', 'MEIO', 'DIREITA', 'BAIXO'];
const V106_TIPO = {banner:'CARTÃO', bola:'BOLA', avatar:'AVATAR', efeito:'EFEITO', comemoracao:'COMEMORAÇÃO', gol:'GOL', tampinha:'SKIN', emoji:'EMOJI NA TAMPINHA'};
const V106_SVG = {
  cadeado:'<svg viewBox="0 0 40 46" aria-hidden="true"><path d="M11 21v-7a9 9 0 0 1 18 0v7" fill="none" stroke="#10141b" stroke-width="10" stroke-linecap="round"/>'
    + '<path d="M11 21v-7a9 9 0 0 1 18 0v7" fill="none" stroke="#6d7682" stroke-width="5" stroke-linecap="round"/>'
    + '<rect x="4" y="19" width="32" height="24" rx="7" fill="#4d5561" stroke="#10141b" stroke-width="3.5"/><rect x="8.5" y="22.5" width="23" height="5" rx="2.5" fill="#8a94a1" opacity=".55"/>'
    + '<circle cx="20" cy="31" r="3.6" fill="#10141b"/><path d="M20 33v5" stroke="#10141b" stroke-width="3.4" stroke-linecap="round"/></svg>',
  check:'<svg viewBox="0 0 52 44" aria-hidden="true"><path d="M7 23l12 12L45 8" fill="none" stroke="#0b2810" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M7 23l12 12L45 8" fill="none" stroke="#3fcf51" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M9.5 21.5l9.5 9.5" stroke="#b4f5bb" stroke-width="2.4" stroke-linecap="round"/></svg>',
  mais:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 11v42M11 32h42" stroke="#0d2a5e" stroke-width="21" stroke-linecap="round"/>'
    + '<path d="M32 11v42M11 32h42" stroke="#5cc3ff" stroke-width="13" stroke-linecap="round"/><path d="M28.5 15v9M15 28.5h9" stroke="#dff4ff" stroke-width="3.6" stroke-linecap="round"/></svg>',
  maisLugar:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 14v36M14 32h36" stroke="#0a1636" stroke-width="15" stroke-linecap="round"/><path d="M32 14v36M14 32h36" stroke="#eef6ff" stroke-width="9" stroke-linecap="round"/></svg>',
  seta:'<svg viewBox="0 0 130 34" aria-hidden="true"><path d="M8 27L65 7l57 20" fill="none" stroke="#06244a" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M8 27L65 7l57 20" fill="none" stroke="#33c8ff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 18L65 6" stroke="#bdf0ff" stroke-width="2.2" stroke-linecap="round"/></svg>'
};

/* ---------------------------------------------------------------- 0) a tela de sempre (o V90CF), com o desenho novo */
V90CF.el.classList.add('cf106-tela');
V90CF.o.render = T => v106Render(T);
V90CF.o.abre = () => v106Abre();
if (TELAS.cofre) TELAS.cofre.fecha = () => { V106.pendEscudo = null; };
v90AbreCofre = function(cat){ if (cat) v106VaiPara(V106_DE90[cat] || 'skin'); abreTela('cofre'); };   // (a v90, a RODA e o lobby chamam pelo nome)
function v106VaiPara(alvo){
  const [a, s] = String(alvo || '').split(':');
  if (V106_ABAS.some(x => x[0] === a)) V106.aba = a;
  if (s && V106_SUB.some(x => x[0] === s)) V106.sub = s;
}
function v106Abre(){
  V106.rola = {};
  try { if (v88Logado()) v88Estado(false).catch(() => {}); } catch (_) {}
  if (V106.aba === 'escudo') v106ClubeCarrega(true);
  v106OuveEmotes();
}
function v106Repinta(){ try { v88Repinta('cofre'); } catch (_) {} }
function v106Troca(id){ V106.aba = id; if (id === 'escudo') v106ClubeCarrega(false); v106Repinta(); }

/* ---------------------------------------------------------------- 1) a tela inteira: a peça à esquerda, as abas e a grade à direita */
function v106Render(T){
  const corpo = T.corpo;
  const velha = corpo.querySelector('.cf106-rola'); if (velha) V106.rola[velha.dataset.v] = velha.scrollTop;   // (a grade volta onde estava)
  const ae = document.activeElement, foco = ae && corpo.contains(ae) && ae.dataset ? ae.dataset.k || '' : '';
  corpo.textContent = '';
  T.el.classList.add('cf106-tela');
  const w = nodo('div', 'cf106'); w.dataset.aba = V106.aba;
  const lado = nodo('aside', 'cf106-lado'), dir = nodo('section', 'cf106-dir');
  lado.setAttribute('aria-label', 'O que está equipado');
  dir.appendChild(v106Abas());
  const rola = nodo('div', 'cf106-rola');
  rola.dataset.v = V106.aba === 'mais' ? 'mais:' + V106.sub : V106.aba;
  rola.id = 'cf106-painel'; rola.setAttribute('role', 'tabpanel'); rola.setAttribute('aria-labelledby', 'cf106-aba-' + V106.aba);
  const fn = {cartoes:v106Cartoes, skin:v106Skin, emoji:v106Emoji, escudo:v106Escudo, bola:v106Bola, mais:v106Mais}[V106.aba] || v106Skin;
  fn(lado, rola, dir);
  dir.appendChild(rola);
  w.append(lado, dir); corpo.appendChild(w);
  const y = V106.rola[rola.dataset.v]; if (y) rola.scrollTop = y;
  if (foco){ let e = null; try { e = corpo.querySelector('[data-k="' + CSS.escape(foco) + '"]'); } catch (_) {} if (e) try { e.focus({preventScroll:true}); } catch (_) {} }
  if (V106.pendEscudo) v106EscudoPendente();
}
function v106Abas(){
  const nav = nodo('nav', 'cf106-abas'); nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', 'Partes do cofre');
  for (const [id, rot] of V106_ABAS){
    const on = id === V106.aba, b = novoBotao('cf106-aba' + (on ? ' on' : ''), rot);
    b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(on)); b.setAttribute('aria-controls', 'cf106-painel');
    b.id = 'cf106-aba-' + id; b.tabIndex = on ? 0 : -1; b.dataset.k = 'aba:' + id; b.dataset.aba = id;
    b.appendChild(nodo('span', null, rot));
    b.addEventListener('click', () => { if (id === V106.aba) return; som.clique(); v106Troca(id); });
    nav.appendChild(b);
  }
  nav.addEventListener('keydown', e => {                          // (as setas andam pelas abas; Home e End vão às pontas)
    const i = V106_ABAS.findIndex(x => x[0] === V106.aba), n = V106_ABAS.length;
    const j = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (j < 0 || j === i) return;
    e.preventDefault(); som.clique(); v106Troca(V106_ABAS[j][0]);
    const b = document.getElementById('cf106-aba-' + V106_ABAS[j][0]); if (b) try { b.focus({preventScroll:true}); } catch (_) {}
  });
  return nav;
}
function v106Dica(dir, txt, cls){ const p = nodo('p', 'cf106-dica' + (cls ? ' ' + cls : ''), txt); p.title = txt; dir.appendChild(p); return p; }
function v106Secao(pai, tit, txt){
  const s = nodo('div', 'cf106-secao'); s.appendChild(nodo('h3', null, tit)); if (txt) s.appendChild(nodo('small', null, txt));
  pai.appendChild(s); return s;
}
function v106Aviso(pai, tit, txt, bt){
  const d = nodo('div', 'cf106-aviso'); d.setAttribute('role', 'status');
  d.append(nodo('b', null, tit)); if (txt) d.appendChild(nodo('p', null, txt)); if (bt) d.appendChild(bt);
  pai.appendChild(d); return d;
}

/* ---------------------------------------------------------------- 2) as peças: o pedestal, os cartões e a janelinha */
const v106Tam = u => Math.round(u*Math.max(1, (typeof PALCO !== 'undefined' && PALCO.s) || 1));   // (os desenhos na nitidez da tela: o palco é escalado)
function v106Tela(px){
  const k = Math.min(2, window.devicePixelRatio || 1), c = document.createElement('canvas');
  c.width = c.height = Math.max(8, Math.round(px*k)); c.setAttribute('aria-hidden', 'true');
  const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0);
  return {c, g, k};
}
function v106Copia(src){ const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.setAttribute('aria-hidden', 'true'); c.getContext('2d').drawImage(src, 0, 0); return c; }
function v106Pedestal(lado, o){
  // o = {topo:{rot, fn, k, aria}, peca, nome, sub, vazio, semPedestal, cls, depois}
  if (o.topo){
    const b = novoBotao('cf106-topo-bt', o.topo.aria || o.topo.rot); b.textContent = o.topo.rot; b.dataset.k = o.topo.k || 'topo';
    b.addEventListener('click', () => { som.clique(); o.topo.fn(); }); lado.appendChild(b);
  } else lado.appendChild(nodo('span', 'cf106-topo-vago'));           // (o lugar do botão: a peça fica na mesma altura em todas as abas)
  const palco = nodo('div', 'cf106-palco' + (o.cls ? ' ' + o.cls : ''));
  if (o.peca){ const p = nodo('div', 'cf106-peca'); p.appendChild(o.peca); palco.appendChild(p); }
  if (o.vazio) palco.appendChild(nodo('b', 'cf106-vazio', o.vazio));
  if (!o.semPedestal) palco.appendChild(nodo('i', 'cf106-pedestal'));
  lado.appendChild(palco);
  if (o.nome != null){
    const pl = nodo('div', 'cf106-placa'); pl.appendChild(nodo('b', null, o.nome || '—')); if (o.sub) pl.appendChild(nodo('small', null, o.sub));
    pl.title = o.nome || ''; lado.appendChild(pl);
  }
  if (o.depois) lado.appendChild(o.depois);
}
function v106Card(o){
  // o = {k, nome, st:'equipado'|'seu'|'venda'|'fora', mini, rar, v, tag, cls, aria, fn, extra}
  const st = o.st || 'seu', card = nodo('div', 'cf106-card st-' + st + (o.cls ? ' ' + o.cls : ''));
  if (o.rar){ card.style.setProperty('--r', v88Raridade(o.rar).cor); card.dataset.r = o.rar; }
  const bt = novoBotao('cf106-card-bt', o.aria || o.nome || 'Item'); bt.dataset.k = o.k; if (o.nome) bt.title = o.nome;
  if (st === 'equipado') bt.setAttribute('aria-current', 'true');
  const pe = nodo('span', 'cf106-card-peca'); if (o.mini) pe.appendChild(o.mini); bt.appendChild(pe);
  const pe2 = nodo('span', 'cf106-card-pe');
  if (st === 'venda' && o.v) pe2.appendChild(v106Preco(o.v));
  else if (st === 'venda' || st === 'fora') pe2.appendChild(nodo('small', 'cf106-card-tag', o.tag || (st === 'fora' ? 'EXCLUSIVO' : 'BLOQUEADO')));
  else pe2.appendChild(nodo('b', 'cf106-card-nome', o.nome || ''));
  bt.appendChild(pe2);
  bt.addEventListener('click', () => { som.clique(); try { if (o.fn) o.fn(); } catch (e) { console.error('v106 cofre', e); } });
  card.appendChild(bt);
  if (st === 'venda' || st === 'fora'){ const l = nodo('i', 'cf106-cad'); l.innerHTML = V106_SVG.cadeado; card.appendChild(l); }
  if (st === 'equipado'){ const c = nodo('i', 'cf106-check'); c.innerHTML = V106_SVG.check; card.appendChild(c); }
  if (o.extra) card.appendChild(o.extra);
  return card;
}
function v106Criar(rot, aria, fn, k){                                // o cartão roxo do CRIAR PERSONALIZADO (o primeiro da grade)
  const card = nodo('div', 'cf106-card cf106-criar');
  const bt = novoBotao('cf106-card-bt', aria); bt.dataset.k = k || 'criar';
  const ic = nodo('span', 'cf106-criar-ic'); ic.innerHTML = V106_SVG.mais;
  bt.append(ic, nodo('b', 'cf106-criar-tx', rot));
  bt.addEventListener('click', () => { som.clique(); fn(); });
  card.appendChild(bt); return card;
}
function v106Preco(v){                                               // o preço (moedas, gemas ou os dois: as peças do escudo)
  const m = v.moedas | 0, g = v.gemas | 0;
  if (m && g){ const s = nodo('span', 'cf106-precos'); s.append(v88Preco(m, 0), v88Preco(0, g)); return s; }
  return v88Preco(m, g);
}
function v106PrecoTxt(v){ const m = v.moedas | 0, g = v.gemas | 0; return [m ? fmtNum(m) + ' moedas' : '', g ? fmtNum(g) + ' gemas' : ''].filter(Boolean).join(' e ') || 'grátis'; }
function v106Aria(nome, st, v, acao){
  if (st === 'equipado') return nome + ': equipado';
  if (st === 'seu') return nome + ': ' + (acao || 'equipar');
  if (st === 'venda') return nome + ': bloqueado' + (v ? ', ' + v106PrecoTxt(v) : '') + ' — ver e comprar';
  return nome + ': exclusivo, não vende — como ganhar';
}
function v106GradeEl(cls){ const g = nodo('div', 'cf106-grade' + (cls ? ' ' + cls : '')); return g; }
function v106PodeEntrar(){ try { return v88TemPlataforma() && typeof v84AbreLogin === 'function' && !!window.RACHA84 && !window.RACHA84.embutido; } catch (_) { return false; } }
function v106Entrar(){ try { fechaTela(); } catch (_) {} try { v84AbreLogin('entrar'); } catch (_) {} }
// a janelinha: a peça grande, o nome, a raridade, o preço e COMPRAR / CANCELAR (ou o que fazer quando não dá para comprar)
function v106Janela(o){
  // o = {tag, nome, mini, rar, desc, v, nota, acoes:[[rot, cls, fn, desligado]]}
  abrePop(c => {
    c.classList.add('v88-pop', 'v88-item-pop', 'cf106-pop');
    if (o.rar) c.style.setProperty('--r', v88Raridade(o.rar).cor);
    const topo = nodo('div', 'v88-item-pop-topo'), mini = nodo('div', 'v88-item-pop-mini cf106-pop-mini'); if (o.mini) mini.appendChild(o.mini);
    const tx = nodo('div', 'v88-item-pop-tx');
    tx.append(nodo('span', 'pop-tag', o.tag), nodo('h2', null, o.nome));
    if (o.desc) tx.appendChild(nodo('p', 'pop-txt', o.desc));
    if (o.lista) tx.appendChild(o.lista);
    if (o.v){
      const p = nodo('div', 'v88-item-pop-preco');
      if (o.v.desconto && o.v.base) p.appendChild(nodo('s', null, fmtNum(o.v.base.gemas || o.v.base.moedas)));
      p.appendChild(v106Preco(o.v));
      if (o.v.desconto) p.appendChild(nodo('em', 'v88-tag vermelho', '-' + o.v.desconto + '%'));
      tx.appendChild(p);
    }
    if (o.nota) tx.appendChild(nodo('p', 'v88-nota cf106-pop-nota', o.nota));
    topo.append(mini, tx); c.appendChild(topo);
    const a = nodo('div', 'pop-acoes');
    a.appendChild(botaoPop(o.acoes && o.acoes.length ? 'CANCELAR' : 'FECHAR', '', () => { som.clique(); fechaPop(); }));
    for (const [rot, cls, fn, des] of o.acoes || []){
      const b = botaoPop(rot, cls, () => { som.clique(); fechaPop(); fn(); });
      if (des){ b.disabled = true; b.setAttribute('aria-disabled', 'true'); }
      a.appendChild(b);
    }
    c.appendChild(a);
  });
}
// a compra da LOJA (o v88Compra: o servidor confere o preço e o saldo e entrega o item) sem a segunda pergunta — a janelinha
// do cofre já mostrou a peça, o preço e o saldo de depois: ela é a confirmação
function v106SemConfirma(fn){
  const antes = v88Confirma;
  v88Confirma = function(tag, tit, txt, ok, cb){ cb(); };
  try { fn(); } finally { v88Confirma = antes; }
}
function v106CompraLoja(codigo, v){ try { v88Aviso('Comprando na sua conta…'); } catch (_) {} v106SemConfirma(() => v88Compra(codigo, v)); }
function v106SaldoDepois(v){ return 'Saldo depois: ' + fmtNum(CONTA.moedas - (v.moedas | 0)) + ' moedas · ' + fmtNum(CONTA.gemas - (v.gemas | 0)) + ' gemas.'; }
function v106Faltam(v){
  const fm = Math.max(0, (v.moedas | 0) - CONTA.moedas), fg = Math.max(0, (v.gemas | 0) - CONTA.gemas);
  return 'Faltam ' + [fm ? fmtNum(fm) + ' moedas' : '', fg ? fmtNum(fg) + ' gemas' : ''].filter(Boolean).join(' e ') + '. Jogue partidas, cumpra missões ou troque gemas em LOJA › OFERTAS.';
}
// o item do catálogo bloqueado (ou exclusivo): a janelinha com o caminho certo de cada caso
function v106JanelaItem(it, st, v){
  const R = v88Raridade(it.raridade), tag = (V106_TIPO[it.tipo] || String(it.tipo).toUpperCase()) + ' · ' + String(R.nome).toUpperCase();
  const emj = it.tipo === 'emoji', local = emj && typeof emjLojaLocal === 'function' && emjLojaLocal();
  let mini = null;
  if (emj){ try { mini = emjMiniatura(tpMinha(), emjValido(it.id), v106Tam(200)); } catch (_) {} }   // (o emoji na sua tampinha: como vai ficar)
  if (!mini) mini = v106MiniItem(it, 200);
  const o = {tag, nome:it.nome, mini, rar:it.raridade, desc:it.desc || '', v:null, acoes:[]};
  if (st === 'fora' || !v){
    o.nota = it.ranking ? 'Prêmio do TOP 3 do ranking da temporada: não vende.' : it.tipo === 'tampinha' ? 'Exclusiva: vem do Passe RACHA e dos eventos (não vende).' : 'Não vende: vem do Passe RACHA, dos eventos ou dos prêmios.';
  } else if (v88Logado() || local){
    o.v = v;
    const pode = CONTA.moedas >= (v.moedas | 0) && CONTA.gemas >= (v.gemas | 0);
    o.nota = pode ? v106SaldoDepois(v) + (local ? ' (Demonstração: fica neste aparelho.)' : ' O item fica na sua conta.') : v106Faltam(v);
    const compra = local ? () => v106SemConfirma(() => emjCompraLocal(it.id)) : () => v106CompraLoja(it.id, v);
    o.acoes.push(['COMPRAR', 'verde', compra, !pode]);
  } else {
    o.v = v;
    o.nota = 'Para comprar, entre na sua conta do RACHA: o que é seu fica na conta (vale em qualquer aparelho).' + (v106PodeEntrar() ? '' : ' Abra o jogo pelo endereço do RACHA (o site) para entrar.');
    if (v106PodeEntrar()) o.acoes.push(['ENTRAR PARA COMPRAR', 'amarelo', v106Entrar]);
  }
  v106Janela(o);
}
function v106PedeConta(it){                                          // sem conta: o de graça que não dá para equipar no aparelho
  v106Janela({tag:(V106_TIPO[it.tipo] || 'ITEM') + ' · ' + String(v88Raridade(it.raridade).nome).toUpperCase(), nome:it.nome, mini:v106MiniItem(it, 200), rar:it.raridade,
    nota:'Para trocar, entre na sua conta do RACHA: o que você equipa fica na conta (aparece nas suas partidas, em qualquer aparelho).' + (v106PodeEntrar() ? '' : ' Abra o jogo pelo endereço do RACHA (o site) para entrar.'),
    acoes:v106PodeEntrar() ? [['ENTRAR NA CONTA', 'amarelo', v106Entrar]] : []});
}

/* ---------------------------------------------------------------- 3) os desenhos de cada peça */
function v106MiniItem(it, u){                                        // a miniatura de um item do catálogo (a mesma da loja)
  if (!it) return v106Tela(v106Tam(u)).c;
  if (it.tipo === 'tampinha'){                                       // (a v101 troca a miniatura das tampinhas pela marca "?": aqui, o desenho de verdade)
    const cod = v106CodItem(it), D = cod && tpLe(cod);
    return D ? tpMiniatura(D, v106Tam(u)) : v106Tela(v106Tam(u)).c;
  }
  if (it.tipo === 'emoji') return v106MiniEmoji(it.id, u);
  // a sua tampinha no desenho (o avatar "Minha tampinha" e a comemoração): sem a cópia guardada, que ficava com a tampinha de antes
  if ((it.tipo === 'avatar' && it.visual && it.visual.desenho === 'tampinha') || it.tipo === 'comemoracao'){
    const px = Math.round(v106Tam(u)*Math.min(2, window.devicePixelRatio || 1)), c = document.createElement('canvas');
    c.width = c.height = px; c.className = 'v88-mini'; c.setAttribute('aria-hidden', 'true');
    try { v88PintaMini(c.getContext('2d'), px, it.id); } catch (e) { console.warn('v106 mini', it.id, e); }
    return c;
  }
  return v88MiniItem(it.id, v106Tam(u));
}
function v106MiniEmoji(id, u){                                       // o emoji da v95 sozinho (o "Sem emoji": o círculo vazio)
  const px = v106Tam(u), {c, g} = v106Tela(px), m = px/2;
  if (id === 'emoji_nenhum' || typeof emjSprite !== 'function'){
    g.lineWidth = Math.max(2, px*.06); g.strokeStyle = 'rgba(74,44,14,.55)'; g.setLineDash([px*.09, px*.07]);
    g.beginPath(); g.arc(m, m, px*.36, 0, Math.PI*2); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.moveTo(m - px*.2, m + px*.2); g.lineTo(m + px*.2, m - px*.2); g.stroke();
    return c;
  }
  const k = Math.min(2, window.devicePixelRatio || 1), chave = id + '|' + Math.round(px*.84*k);
  let s = V106.mini.get(chave);
  if (!s){ const e = emjSprite(id, px*.84*k); if (e){ s = v106Copia(e); if (V106.mini.size > 260) V106.mini.clear(); V106.mini.set(chave, s); } }
  if (s){ g.drawImage(s, m - px*.42, m - px*.42, px*.84, px*.84); g.lineWidth = Math.max(1.2, px*.035); g.strokeStyle = 'rgba(8,6,18,.72)'; g.beginPath(); g.arc(m, m, px*.42 - g.lineWidth/2, 0, Math.PI*2); g.stroke(); }
  else {                                                             // (o atlas ainda carregando: um círculo no lugar e a tela refaz já já)
    g.fillStyle = 'rgba(74,44,14,.18)'; g.beginPath(); g.arc(m, m, px*.38, 0, Math.PI*2); g.fill();
    clearTimeout(V106.emjT); V106.emjT = setTimeout(v106Repinta, 400);
  }
  return c;
}
function v106TampaGrande(cod, u){                                    // a sua tampinha grande, com o emoji do meio (como no jogo)
  const px = v106Tam(u);
  try { if (typeof emjMiniatura === 'function') return emjMiniatura(cod, typeof emjMeu === 'function' ? emjMeu() : '', px); } catch (_) {}
  const D = tpLe(cod) || TP_PADRAO_D(); return tpMiniatura(D, px);
}
function v106CodItem(it){                                            // o código da tampinha de um item do catálogo (o desenho em visual.d ou o código pronto)
  const V = (it && it.visual) || {};
  try { if (V.d) return tpCodigo(tpNorm(tpD(V.d))); } catch (_) {}
  for (const k of ['cod', 'codigo']){ const s = V[k]; try { if (tpEhCodigo(s) && s[0] === 'T' && tpLe(s)) return s; } catch (_) {} }
  return '';
}
function v106EhAVenda(it){ return !!it && it.tipo === 'tampinha' && it.venda !== false && (it.gratis === true || (it.moedas | 0) > 0 || (it.gemas | 0) > 0); }
function v106CodsAVenda(){                                           // os códigos das tampinhas à venda (refeito quando o catálogo muda)
  const L = typeof CAT88 !== 'undefined' && CAT88 && Array.isArray(CAT88.itens) ? CAT88.itens : [];
  if (V106.cods.n !== L.length){
    const S = new Set();
    for (const it of L) if (v106EhAVenda(it)){ const c = v106CodItem(it); if (c) S.add(c); }
    V106.cods = {n:L.length, set:S};
  }
  return V106.cods.set;
}
// as tampinhas À VENDA não são "prontas" para a v101: é a skin que se compra (aparece, equipa e vai para a partida)
if (typeof v101EhPronta === 'function'){
  const v101EhProntaAntes106 = v101EhPronta;
  v101EhPronta = function(cod){ try { if (cod && v106CodsAVenda().has(cod)) return false; } catch (_) {} return v101EhProntaAntes106.apply(this, arguments); };
  try { if (V101S && V101S.memo) V101S.memo.clear(); } catch (_) {}
}
function v106Escondida(cod){ try { return typeof v101Esconde === 'function' && v101Esconde(cod); } catch (_) { return false; } }

/* ---------------------------------------------------------------- 4) os itens do catálogo (o estado, a ordem e o toque) */
function v106Itens(tipo){                                            // de graça, os seus, os à venda (pelo preço) e os exclusivos
  const L = (typeof CAT88 !== 'undefined' ? CAT88.itens : []).filter(i => i.tipo === tipo);
  const peso = it => { const st = v106EstadoItem(it); return st === 'equipado' || st === 'seu' ? (it.gratis ? 0 : 1) : st === 'venda' ? 2 : 3; };
  return L.map((it, i) => ({it, i, p:peso(it)})).sort((a, b) => a.p - b.p || (a.p === 2 ? ((a.it.gemas | 0) - (b.it.gemas | 0) || (a.it.moedas | 0) - (b.it.moedas | 0)) : 0) || a.i - b.i).map(x => x.it);
}
function v106EstadoItem(it){
  if (it.tipo === 'emoji'){
    const tem = emjTem(it.id);
    if (tem) return emjEquipado() === it.id ? 'equipado' : 'seu';
    return v88Venda(it.id) ? 'venda' : 'fora';
  }
  if (v88Logado()){ const st = v88LojaEstadoDe(it.id); return st === 'fora' && v88Venda(it.id) ? 'venda' : st; }
  if (it.gratis) return v88Equipado(it.tipo) === it.id ? 'equipado' : 'seu';
  return v88Venda(it.id) ? 'venda' : 'fora';
}
function v106CardItem(it){
  const st = v106EstadoItem(it), v = st === 'venda' ? v88Venda(it.id) : null;
  return v106Card({k:'it:' + it.id, nome:it.nome, st, v, rar:it.raridade, mini:v106MiniItem(it, 104), aria:v106Aria(it.nome, st, v),
    tag:st === 'fora' && it.ranking ? 'TOP 3' : '', fn:() => v106TocaItem(it, st, v)});
}
function v106TocaItem(it, st, v){
  if (st === 'equipado') return;
  if (st === 'seu'){
    if (it.tipo === 'emoji') return emjEquipa(it.id);
    if (!v88Logado()) return v106PedeConta(it);
    return v88Equipa(it.tipo, it.id);                                // (o v93: aparece na hora e vai para a conta)
  }
  v106JanelaItem(it, st, v);
}
function v106GradeItens(rola, tipo){
  const g = v106GradeEl(), L = v106Itens(tipo);
  for (const it of L) g.appendChild(v106CardItem(it));
  if (!L.length) v106Aviso(rola, 'Nada por aqui ainda', 'Os itens desta parte aparecem aqui quando chegarem na loja.');
  rola.appendChild(g);
}
function v106DicaConta(dir){
  if (v88Logado()) return v106Dica(dir, 'Toque num seu para equipar · no do cadeado, para ver o preço e comprar (fica na sua conta)');
  return v106Dica(dir, 'Sem conta: o de graça fica com você · para comprar e trocar, entre na sua conta do RACHA', 'sem-conta');
}

/* ---------------------------------------------------------------- 5) CARTÕES (os banners do perfil) */
function v106Cartoes(lado, rola, dir){
  const eq = v88Equipado('banner') || 'banner_laje_noturna', it = v88Item(eq);
  v106Pedestal(lado, {peca:v106CartaoGrande(it), nome:it ? it.nome : 'Cartão', sub:'O SEU CARTÃO DO PERFIL', cls:'cartao'});
  v106DicaConta(dir);
  v106GradeItens(rola, 'banner');
}
function v106CartaoGrande(it){                                       // o cartão equipado: o banner, a sua tampinha (ou o avatar) e o nome
  const box = nodo('div', 'cf106-cartao');
  const W = 400, H = 220, k = Math.min(2, window.devicePixelRatio || 1)*Math.max(1, (typeof PALCO !== 'undefined' && PALCO.s) || 1);
  const c = document.createElement('canvas'); c.width = Math.round(W*k); c.height = Math.round(H*k); c.className = 'cf106-cartao-fundo'; c.setAttribute('aria-hidden', 'true');
  try { const g = c.getContext('2d'); g.setTransform(c.width/W, 0, 0, c.height/H, 0, 0); v88DesenhaBanner(g, W, H, it, 0); } catch (e) { console.warn('v106 cartão', e); }
  let av = null;
  try {
    const a = v88Equipado('avatar');
    av = a && a !== 'av_tampinha' && v88Item(a) ? v106MiniItem(v88Item(a), 120) : v106TampaGrande(tpMinha(), 120);
  } catch (_) { av = v106Tela(v106Tam(120)).c; }
  av.classList.add('cf106-cartao-av');
  const nome = nodo('b', 'cf106-cartao-nome', (typeof perfil !== 'undefined' && perfil.nome) || 'Jogador');
  box.append(c, av, nome, nodo('small', 'cf106-cartao-marca', 'RACHA'));
  return box;
}

/* ---------------------------------------------------------------- 6) SKIN (as tampinhas e o emoji no meio delas) */
function v106Skin(lado, rola, dir){
  const minha = tpMinha(), salva = (TP.salvas || []).find(s => s.c === minha);
  let nomeTampa = salva ? salva.n : '';
  if (!nomeTampa){ try { const s = tpSkin(minha); nomeTampa = (s && s.nome) || ''; } catch (_) {} }
  v106Pedestal(lado, {topo:{rot:'ALTERAR AVATAR', aria:'Alterar avatar: abrir os avatares', k:'topo:avatar', fn:() => { v106VaiPara('mais:avatares'); v106Repinta(); }},
    peca:v106TampaGrande(minha, 300), nome:(typeof perfil !== 'undefined' && perfil.nome) || 'Jogador', sub:nomeTampa ? 'SKIN: ' + String(nomeTampa).toUpperCase() : 'A SUA SKIN', cls:'tampa'});
  let favs = 0; try { favs = v90Favoritas().length; } catch (_) {}
  v106Dica(dir, 'Toque numa tampinha para equipar · a ★ marca as favoritas da RODA (segure a tampinha no lobby): ' + favs + '/' + V90_FAV_MAX);
  // 1) o CRIAR e as suas
  const g = v106GradeEl('cf106-grade-tp');
  g.appendChild(v106Criar('CRIAR\nPERSONALIZADO', 'Criar personalizado: abrir o editor da tampinha', () => abreTela('skins', 'cofre'), 'criar'));
  for (const x of v106MinhasTampinhas()){ const c = v106CardTampa(x, minha); if (c) g.appendChild(c); }
  rola.appendChild(g);
  // 2) as do catálogo à venda (as skins novas aparecem sozinhas)
  const venda = v106TampinhasAVenda();
  if (typeof V101S !== 'undefined' && V101S && V101S.esconde)   // (com as mascotes À VENDA logo embaixo, a nota não diz que as prontas saíram todas)
    rola.appendChild(nodo('p', 'cf106-nota v101-cofre-nota', venda.length
      ? 'As outras tampinhas prontas saíram por enquanto: monte a sua no CRIAR PERSONALIZADO ou compre uma À VENDA, aqui embaixo.'
      : 'As tampinhas prontas saíram por enquanto: monte a sua no CRIAR PERSONALIZADO.'));
  if (venda.length){
    v106Secao(rola, 'À VENDA', v88Logado() ? 'Skins prontas para comprar: ficam na sua conta.' : 'Skins prontas para comprar (com a sua conta do RACHA).');
    const g2 = v106GradeEl('cf106-grade-tp');
    for (const it of venda){ const c = v106CardTampaItem(it, minha); if (c) g2.appendChild(c); }
    rola.appendChild(g2);
  }
  // 3) o emoji na tampinha (o da v95: vai no meio da sua tampinha — não é o emoji de reação da partida, que fica na aba EMOJI)
  if (typeof emjOrdem === 'function'){
    v106Secao(rola, 'EMOJI NA TAMPINHA', 'O emoji vai no meio da sua tampinha, em todo lugar (os de reação da partida ficam na aba EMOJI).');
    const g3 = v106GradeEl('cf106-grade-emj');
    for (const id of emjOrdem()){ const it = emjItem(id); if (it) g3.appendChild(v106CardItem(it)); }
    rola.appendChild(g3);
  }
}
function v106MinhasTampinhas(){                                      // a equipada, as criadas e as da conta que são suas (sem as escondidas pela v101)
  const L = [], ja = new Set(), minha = tpMinha(), aVenda = v106CodsAVenda(), salvas = TP.salvas || [];
  const poe = x => { if (!x.c || ja.has(x.c) || aVenda.has(x.c) || v106Escondida(x.c)) return; try { if (!tpLe(x.c)) return; } catch (_) { return; } ja.add(x.c); L.push(x); };
  if (!salvas.some(s => s.c === minha)){ let n = ''; try { n = (tpSkin(minha) || {}).nome || ''; } catch (_) {} poe({c:minha, n:n || 'A sua tampinha', nova:true}); }
  for (const s of salvas) poe({c:s.c, n:s.n, f:s.f, salva:s});
  if (typeof TP_CONTA !== 'undefined') for (const id in TP_CONTA){
    const tem = (v88Logado() && V88.inv.has(id)) || (TP.conta || []).indexOf(id) >= 0; if (!tem) continue;
    let cod = ''; try { cod = tpCodigo(TP_CONTA[id].d); } catch (_) { continue; }
    poe({c:cod, n:TP_CONTA[id].nome, conta:id, exclusiva:true});
  }
  return L;
}
function v106TampinhasAVenda(){
  const L = (typeof CAT88 !== 'undefined' ? CAT88.itens : []).filter(it => v106EhAVenda(it) && !!v106CodItem(it));
  return L.map((it, i) => ({it, i})).sort((a, b) => (a.it.gemas | 0) - (b.it.gemas | 0) || (a.it.moedas | 0) - (b.it.moedas | 0) || a.i - b.i).map(x => x.it);
}
function v106Fav(x, nome){                                           // a ★ das favoritas da RODA (o mesmo de antes: TP.salvas, até 3)
  const s = x.salva || (TP.salvas || []).find(y => y.c === x.c), on = !!(s && s.f);
  const b = novoBotao('cf106-fav' + (on ? ' on' : ''), on ? 'Tirar ' + nome + ' das favoritas da roda' : 'Marcar ' + nome + ' como favorita da roda');
  b.textContent = '★'; b.dataset.k = 'fav:' + x.c; b.setAttribute('aria-pressed', String(on));
  b.addEventListener('click', e => { e.stopPropagation(); v90AlternaFavorita(Object.assign({}, x, {salva:s, f:on})); });
  return b;
}
function v106CardTampa(x, minha){
  let D = null; try { D = tpLe(x.c); } catch (_) {} if (!D) return null;
  const eq = x.c === minha, nome = x.n || 'Tampinha';
  return v106Card({k:'tp:' + x.c, nome, st:eq ? 'equipado' : 'seu', mini:tpMiniatura(D, v106Tam(104)), cls:x.exclusiva ? 'exclusiva' : '',
    aria:v106Aria(nome, eq ? 'equipado' : 'seu'), extra:v106Fav(x, nome), fn:() => v106EquipaTampa(x.c, nome, !!x.conta)});
}
function v106CardTampaItem(it, minha){                               // a tampinha do catálogo à venda (a sua: equipa; a dos outros: cadeado e preço)
  const cod = v106CodItem(it); let D = null; try { D = cod && tpLe(cod); } catch (_) {} if (!D) return null;
  const tem = !!it.gratis || (v88Logado() && V88.inv.has(it.id)), eq = tem && cod === minha;
  const st = eq ? 'equipado' : tem ? 'seu' : 'venda', v = st === 'venda' ? v88Venda(it.id) : null;
  return v106Card({k:'it:' + it.id, nome:it.nome, st, v, rar:it.raridade, mini:tpMiniatura(D, v106Tam(104)), aria:v106Aria(it.nome, st, v),
    extra:tem ? v106Fav({c:cod, n:it.nome}, it.nome) : null, fn:() => { if (st === 'equipado') return; if (tem) v106EquipaTampa(cod, it.nome, true); else v106JanelaItem(it, 'venda', v); }});
}
function v106EquipaTampa(cod, nome, daConta){
  if (cod === tpMinha()) return;
  if (daConta){ try { TP.livres.add(cod); } catch (_) {} }          // (a da conta e a comprada não se paga de novo no editor)
  if (tpEquipa(cod)){ try { som.compra(); } catch (_) {} aviso((nome || 'Tampinha') + ' equipada!'); v106Repinta(); }
}

/* ---------------------------------------------------------------- 7) EMOJI (os de reação da partida: a cruz dos 5 lugares) */
function v106Emotes(){
  const A = window.RachaEmotes106;
  return A && typeof A.lista === 'function' && typeof A.slots === 'function' && typeof A.poeSlot === 'function' && typeof A.desenha === 'function' ? A : null;
}
function v106OuveEmotes(){                                           // (a API avisa quando os lugares mudam: a cruz se refaz)
  const A = v106Emotes(); if (!A || typeof A.mudou !== 'function' || V106.emoOuve.has(A)) return;
  V106.emoOuve.add(A);
  try { A.mudou(() => { if (v88Aberta('cofre') && V106.aba === 'emoji') v106Repinta(); }); } catch (e) { console.warn('v106 emojis', e); }
}
function v106Slots(A){
  let s = []; try { s = A.slots(); } catch (_) {}
  s = Array.isArray(s) ? s.slice(0, 5) : [];
  while (s.length < 5) s.push('');
  return s.map(x => typeof x === 'string' ? x : x && x.id ? String(x.id) : '');
}
function v106ListaEmotes(A){
  let l = []; try { l = A.lista(); } catch (_) {}
  return (Array.isArray(l) ? l : []).filter(e => e && e.id != null).map(e => ({id:String(e.id), nome:String(e.nome || e.id)}));
}
function v106MiniEmote(A, id, u, semPonta){                         // (na grade, o balão com a pontinha cabendo no quadrado; na cruz, só o círculo)
  const px = v106Tam(u), {c, g} = v106Tela(px), r = px*(semPonta ? .46 : .4);
  try {
    if (semPonta) A.desenha(g, id, px/2, px/2, r, {ponta:null});
    else A.desenha(g, id, px/2 + r*.06, px/2 - r*.04, r, {alcance:1.12});
  } catch (e) { if (!V106.emoErro){ V106.emoErro = true; console.warn('v106 emoji ' + id, e); } }
  return c;
}
function v106Emoji(lado, rola, dir){
  const A = v106Emotes(); v106OuveEmotes();
  const ids = A ? v106Slots(A) : ['', '', '', '', ''], lista = A ? v106ListaEmotes(A) : [], nomeDe = id => (lista.find(e => e.id === id) || {}).nome || '';
  const i0 = Math.max(0, Math.min(4, V106.slot | 0));
  v106Pedestal(lado, {topo:A ? {rot:'PADRÃO', aria:'Voltar os 5 emojis para o padrão', k:'topo:padrao', fn:() => v106EmotesPadrao(A)} : null,
    peca:v106Cruz(A, ids, nomeDe), semPedestal:true, cls:'cruz', nome:A ? (V106_LUGARES[i0] + (ids[i0] ? ' · ' + (nomeDe(ids[i0]) || ids[i0]) : ' · VAZIO')) : 'OS 5 LUGARES',
    sub:A ? 'O LUGAR ACESO' : 'NO BALÃO DA PARTIDA'});
  if (!A){
    v106Dica(dir, 'Os emojis de reação da partida: o balão com os 5 lugares da cruz');
    v106Aviso(rola, 'Os emojis da partida chegam na próxima versão', 'Aqui você vai escolher os 5 emojis do balão da partida: cima, esquerda, meio, direita e baixo. (O emoji que vai no meio da sua tampinha fica na aba SKIN.)');
    return;
  }
  v106Dica(dir, 'Toque num lugar da cruz e depois no emoji: ele vai para o lugar aceso (' + V106_LUGARES[i0].toLowerCase() + ') · todos de graça');
  const g = v106GradeEl('cf106-grade-emo');
  for (const e of lista){
    const usado = ids.indexOf(e.id) >= 0;
    g.appendChild(v106Card({k:'emo:' + e.id, nome:e.nome, st:usado ? 'equipado' : 'seu', mini:v106MiniEmote(A, e.id, 104),
      aria:'Pôr ' + e.nome + ' no lugar ' + V106_LUGARES[i0].toLowerCase() + (usado ? ' (já está num lugar)' : ''), fn:() => v106PoeEmote(A, e)}));
  }
  if (!lista.length) v106Aviso(rola, 'Nenhum emoji ainda', 'Os emojis da partida aparecem aqui.');
  rola.appendChild(g);
}
function v106Cruz(A, ids, nomeDe){
  const box = nodo('div', 'cf106-cruz' + (A ? '' : ' off')); box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Os 5 lugares do balão de emojis');
  for (const d of ['cima', 'esq', 'dir', 'baixo']){ const s = nodo('i', 'cf106-seta ' + d); s.innerHTML = V106_SVG.seta; box.appendChild(s); }
  V106_LUGARES.forEach((nome, i) => {
    const on = !!A && i === (V106.slot | 0), id = ids[i];
    const b = novoBotao('cf106-lugar l' + i + (on ? ' on' : '') + (id ? ' cheio' : ''), 'Lugar ' + nome.toLowerCase() + ': ' + (id ? nomeDe(id) || id : 'vazio') + (on ? ' (aceso)' : ''));
    b.dataset.k = 'lugar:' + i; b.setAttribute('aria-pressed', String(on)); if (!A) b.disabled = true;
    if (id && A) b.appendChild(v106MiniEmote(A, id, 96, true)); else { const p = nodo('i', 'cf106-lugar-mais'); p.innerHTML = V106_SVG.maisLugar; b.appendChild(p); }
    b.addEventListener('click', () => { if (!A) return; som.clique(); V106.slot = i; v106Repinta(); });
    box.appendChild(b);
  });
  return box;
}
function v106PoeEmote(A, e){
  const i = Math.max(0, Math.min(4, V106.slot | 0));
  try { A.poeSlot(i, e.id); } catch (err) { console.warn('v106 poeSlot', err); try { som.erro(); } catch (_) {} return; }
  try { som.compra(); } catch (_) {}
  aviso(e.nome + ' no lugar ' + V106_LUGARES[i].toLowerCase() + '!');
  v106Repinta();
}
function v106EmotesPadrao(A){                                        // (o padrao() da API: volta sozinho, ou devolve os 5 de fábrica)
  let r = null; try { r = A.padrao(); } catch (e) { console.warn('v106 padrão', e); }
  if (Array.isArray(r) && r.length >= 5 && JSON.stringify(v106Slots(A)) !== JSON.stringify(r.slice(0, 5).map(String))) r.slice(0, 5).forEach((id, i) => { try { A.poeSlot(i, id); } catch (_) {} });
  aviso('Os emojis do balão voltaram para o padrão.');
  v106Repinta();
}

/* ---------------------------------------------------------------- 8) ESCUDO DO CLUBE (só o dono troca) */
function v106ClubeCarrega(forca){
  const C = V106.clube;
  if (!forca && (C.estado === 'carregando' || (C.t && Date.now() - C.t < 15000))) return;
  let api = null; try { api = clbApi(); } catch (_) {}
  if (!api){ Object.assign(C, {estado:'erro', erro:'o clube não está disponível', t:Date.now()}); return; }
  const tok = ++C.tok; C.estado = 'carregando';
  Promise.resolve().then(() => api.meu()).then(meu => {
    if (!meu) return null;
    return Promise.resolve().then(() => api.ver(meu.id)).then(v => Object.assign({}, meu, v || {})).catch(() => meu);
  }).then(c => {
    if (tok !== C.tok) return;
    Object.assign(C, {estado:c ? 'ok' : 'sem', c:c || null, t:Date.now(), erro:'', tipo:api.tipo});
    if (v88Aberta('cofre') && V106.aba === 'escudo') v106Repinta();
  }).catch(e => {
    if (tok !== C.tok) return;
    Object.assign(C, {estado:'erro', erro:(e && e.message) || 'sem conexão', t:Date.now()});
    if (v88Aberta('cofre') && V106.aba === 'escudo') v106Repinta();
  });
}
if (typeof clbMudouMeu === 'function'){                              // (entrou, saiu ou trocou de clube: o cofre lê de novo)
  const clbMudouMeuAntes106 = clbMudouMeu;
  clbMudouMeu = function(){ V106.clube.t = 0; return clbMudouMeuAntes106.apply(this, arguments); };
}
function v106ClubeZera(){ V106.clube = {estado:'', c:null, t:0, erro:'', tok:V106.clube.tok + 1, tipo:''}; V106.pendEscudo = null; }
// a conta entrou ou saiu: o clube é outro (o da conta, o da turma ou o deste aparelho)
if (typeof v88Sincroniza === 'function'){ const v88SincronizaAntes106 = v88Sincroniza; v88Sincroniza = function(){ v106ClubeZera(); return v88SincronizaAntes106.apply(this, arguments); }; }
if (typeof v88Esquece === 'function'){ const v88EsqueceAntes106 = v88Esquece; v88Esquece = function(){ v106ClubeZera(); return v88EsqueceAntes106.apply(this, arguments); }; }
function v106Escudo(lado, rola, dir){
  const C = V106.clube; if (!C.estado || (C.estado !== 'carregando' && Date.now() - C.t > 30000)) v106ClubeCarrega(false);
  const c = C.c, dono = !!(c && c.souDono), carregando = C.estado === 'carregando' && !c;
  const irClube = (rot, k) => { const b = novoBotao('cf106-topo-bt cf106-ir-clube', rot === 'VER O CLUBE' ? 'Ver o seu clube' : 'Ir para o clube'); b.textContent = rot; b.dataset.k = k; b.addEventListener('click', () => { som.clique(); abreTela('clube', 'cofre'); }); return b; };
  if (carregando) v106Pedestal(lado, {vazio:'CARREGANDO…', semPedestal:true, cls:'sem'});
  else if (!c) v106Pedestal(lado, {vazio:C.estado === 'erro' ? 'SEM CONEXÃO' : 'SEM CLUBE', semPedestal:true, cls:'sem', depois:irClube('IR PARA O CLUBE', 'topo:clube')});
  else {
    let esc = null; try { esc = clbEscudo(c.escudo, v106Tam(300)); } catch (_) { esc = tpMiniatura(TP_ESCUDO_D(), v106Tam(300)); }
    v106Pedestal(lado, {topo:{rot:'VER O CLUBE', aria:'Ver o seu clube', k:'topo:clube', fn:() => abreTela('clube', 'cofre')}, peca:esc, nome:c.nome || 'Clube',
      sub:dono ? 'VOCÊ É O DONO' : c.donoNome ? 'DONO: ' + String(c.donoNome).toUpperCase() : 'O SEU CLUBE', cls:'escudo'});
  }
  if (carregando) v106Dica(dir, 'Carregando o seu clube…');
  else if (dono) v106Dica(dir, 'Toque num escudo para usar no clube: todos os membros veem o escudo novo');
  else if (c) v106Dica(dir, 'Só o dono do clube troca o escudo' + (c.donoNome ? ' (' + c.donoNome + ')' : ''), 'sem-conta');
  else if (C.estado === 'erro') v106Dica(dir, 'Não deu para ver o seu clube agora (' + C.erro + ')', 'sem-conta');
  else v106Dica(dir, 'Você ainda não tem clube: entre num (ou crie o seu, é grátis) para ter um escudo', 'sem-conta');
  const g = v106GradeEl('cf106-grade-esc');
  if (dono) g.appendChild(v106Criar('CRIAR\nPERSONALIZADO', 'Criar um escudo personalizado: abrir o editor do escudo', () => v106EscudoEditor(c), 'criar:escudo'));
  for (const x of TP_PRE_ESCUDO) g.appendChild(v106CardEscudo(x, c, dono));
  rola.appendChild(g);
}
function v106CardEscudo(x, c, dono){
  const cod = tpCodigo(x.d), falta = tpFaltam(x.d), tem = !falta.length, eq = !!c && c.escudo === cod;
  const st = eq ? 'equipado' : tem ? 'seu' : 'venda', custo = tpCusto(x.d), v = {moedas:custo.m, gemas:custo.g};
  return v106Card({k:'esc:' + x.id, nome:x.nome, st, v:st === 'venda' ? v : null, mini:tpMiniatura(x.d, v106Tam(104)),
    aria:dono ? v106Aria(x.nome, st, v, 'usar no clube') : x.nome + (eq ? ': o escudo do seu clube' : ': ver quem pode trocar'),
    fn:() => v106TocaEscudo(x, cod, st, c, dono)});
}
function v106TocaEscudo(x, cod, st, c, dono){
  if (V106.clube.estado === 'carregando' && !c) return aviso('Carregando o seu clube…');
  if (!c) return v106Janela({tag:'ESCUDO DO CLUBE', nome:x.nome, mini:tpMiniatura(x.d, v106Tam(200)), nota:'Você ainda não tem clube. Entre num clube (ou crie o seu, é grátis) e o escudo dele aparece aqui.',
    acoes:[['IR PARA O CLUBE', 'verde', () => abreTela('clube', 'cofre')]]});
  if (!dono) return v106Janela({tag:'ESCUDO DO CLUBE', nome:x.nome, mini:tpMiniatura(x.d, v106Tam(200)),
    nota:'Só o dono do clube troca o escudo' + (c.donoNome ? ': ' + c.donoNome + '.' : '.') + ' Peça para ele: CLUBE › o lápis no escudo (ou aqui no COFRE).'});
  if (st === 'equipado') return;
  if (st === 'seu') return v106EscudoUsa(cod);
  v106JanelaEscudo(x, cod);
}
function v106JanelaEscudo(x, cod){                                   // as peças que faltam no escudo pronto (como no editor: compra e usa)
  const L = tpFaltam(x.d), c = tpCusto(x.d), v = {moedas:c.m, gemas:c.g}, pode = tpPode(c);
  const ul = nodo('ul', 'cf106-pecas');
  for (const f of L){ const li = nodo('li'); li.append(nodo('span', null, ({b:'Borda', f:'Forma', p:'Padrão', i:'Ícone'}[f.tipo] || 'Peça') + ': ' + (f.it && f.it.nome || f.id)), v106Preco({moedas:f.pr.m, gemas:f.pr.g})); ul.appendChild(li); }
  v106Janela({tag:'ESCUDO DO CLUBE · PEÇAS', nome:x.nome, mini:tpMiniatura(x.d, v106Tam(200)), lista:ul, v,
    nota:pode ? 'As peças ficam suas (dá para usar em outros escudos e tampinhas). ' + v106SaldoDepois(v) : v106Faltam(v),
    acoes:[['COMPRAR E USAR', 'verde', () => v106CompraEscudo(x, cod), !pode]]});
}
function v106CompraEscudo(x, cod){
  const ok = tpCompra(x.d);                                          // (no aparelho: na hora · na conta: o servidor confirma e as peças chegam)
  if (ok){ v106EscudoUsa(cod); return; }
  if (v88Logado()) V106.pendEscudo = {cod, D:x.d, ate:Date.now() + 20000};
}
function v106EscudoPendente(){                                       // (as peças compradas na conta chegaram: o escudo vai para o clube)
  const p = V106.pendEscudo; if (!p) return;
  if (Date.now() > p.ate){ V106.pendEscudo = null; return; }
  let falta = 1; try { falta = tpFaltam(p.D).length; } catch (_) {}
  if (!falta){ V106.pendEscudo = null; setTimeout(() => v106EscudoUsa(p.cod), 0); }
}
try { v88On('inventario', () => { if (V106.pendEscudo) v106EscudoPendente(); }); } catch (_) {}
function v106EscudoUsa(cod){
  const c = V106.clube.c; if (!c || !c.souDono || c.escudo === cod) return;
  let api = null; try { api = clbApi(); } catch (_) {}
  if (!api) return;
  try { v88Aviso('Trocando o escudo do clube…'); } catch (_) {}
  Promise.resolve().then(() => api.editar(c.id, {escudo:cod})).then(() => {
    c.escudo = cod;
    try { if (CLB.meu && CLB.meu.id === c.id) CLB.meu.escudo = cod; if (CLB.clube && CLB.clube.id === c.id) CLB.clube.escudo = cod; } catch (_) {}
    try { som.compra(); } catch (_) {}
    aviso('Escudo novo no clube!');
    try { clbMudouMeu(); } catch (_) {}
    V106.clube.t = Date.now();                                       // (o que está na tela já é o novo)
    v106Repinta();
  }).catch(e => { try { som.erro(); } catch (_) {} try { v88Aviso((e && e.message) || 'Não deu para trocar o escudo.'); } catch (_) {} });
}
function v106EscudoEditor(c){                                        // o CRIAR PERSONALIZADO do escudo: o editor no modo escudo, de volta ao COFRE
  try { tpeAbre({modo:'E', D:clbEscudoD(c.escudo), volta:'cofre', ok:cod => { V106.aba = 'escudo'; v106EscudoUsa(cod); }}); } catch (e) { console.error('v106 escudo', e); }
}

/* ---------------------------------------------------------------- 9) BOLA e MAIS */
function v106Bola(lado, rola, dir){
  const eq = v88Equipado('bola') || 'bola_classica', it = v88Item(eq);
  v106Pedestal(lado, {peca:v106MiniItem(it, 300), nome:it ? it.nome : 'Bola', sub:'A SUA BOLA', cls:'bola'});
  v106DicaConta(dir);
  v106GradeItens(rola, 'bola');
}
function v106Mais(lado, rola, dir){
  const S = V106_SUB.find(s => s[0] === V106.sub) || V106_SUB[0], tipo = S[2];
  const nav = nodo('nav', 'cf106-sub'); nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', 'Mais itens');
  for (const [id, rot] of V106_SUB){
    const on = id === S[0], b = novoBotao('cf106-sub-bt' + (on ? ' on' : ''), rot);
    b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(on)); b.dataset.k = 'sub:' + id; b.textContent = rot;
    b.addEventListener('click', () => { if (on) return; som.clique(); V106.sub = id; v106Repinta(); });
    nav.appendChild(b);
  }
  dir.appendChild(nav);
  const eq = v88Equipado(tipo) || (CAT88.padroes || {})[tipo], it = v88Item(eq);
  const SUBN = {avatar:'O SEU AVATAR', efeito:'O EFEITO DO CHUTE', comemoracao:'A COMEMORAÇÃO', gol:'O EFEITO DE GOL'};
  v106Pedestal(lado, {peca:v106MiniItem(it, 300), nome:it ? it.nome : '—', sub:SUBN[tipo] || '', cls:'mais ' + tipo});
  v106DicaConta(dir);
  v106GradeItens(rola, tipo);
}
v88On('carteira', () => { if (v88Aberta('cofre')) v106Repinta(); });   // (o saldo mudou: os preços e o FALTA SALDO)

window.RachaCofre106 = {aba:() => V106.aba, sub:() => V106.sub, slot:() => V106.slot, vai:alvo => { v106VaiPara(alvo); v106Repinta(); }, abas:V106_ABAS.map(a => a[0]),
  aVenda:() => v106TampinhasAVenda().map(i => i.id), clube:() => V106.clube};
