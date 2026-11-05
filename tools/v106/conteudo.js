/* ======================================================================================================================
   RACHA v106 · AS BOLAS E AS MASCOTES NOVAS (no jogo)
   O pedido (05/11/2026): "crie mais bolas e skins não muitas" (com as capturas de outro jogo só de referência do clima: as
   tampinhas com mascotes em medalhão e as bolas de gomos coloridas). Tudo nosso, desenhado em código.
   1) AS 6 BOLAS (app/contracts/catalogo88.json, à venda na LOJA › BOLAS; o desenho em tools/v106/bolas.js), com 3 padrões
      novos que giram e rolam como a bola de sempre (a mesma matriz do giro):
        · gomos de praia: BOLA DE PRAIA (rara) e BOLA DO ARRAIÁ (rara, as cores das bandeirinhas);
        · labaredas: BOLA DE FOGO e BOLA MAÇARICO (épicas, a chama azul);
        · espaço: BOLA GALÁXIA e CÉU DO SERTÃO (lendárias, a Via Láctea).
      Elas entram no desenho da bola da partida, do treino e do replay (v88DesenhaBolaJogo), da Oficina e em toda miniatura
      (v88BolaParada: a LOJA, o COFRE, o correio, o passe). Só o desenho: o raio, a colisão e a física não mudam.
   2) AS 6 MASCOTES (os bichos do Brasil em medalhão: o desenho em tools/v106/mascotes.js): ARARA INVOCADA, ONÇA-PRETA e
      MICO-LEÃO BOLADO (lendárias) · GUARÁ DA VÁRZEA, TUCANO MARRENTO e JACARÉ PAPO-AMARELO (épicas). Cada uma é um item
      "tampinha" do catálogo À VENDA (o preço é o do catálogo: a plataforma confere a compra) feito de duas peças novas
      no FIM das listas, como a v96 fez (os códigos de sempre não mudam):
        · a CARA da mascote (um ícone com cara: true, os lugares 87 a 92) — ela ocupa a tampinha inteira e pisca de vez em
          quando (a única coisa que mexe: duas imagens prontas, o olho aberto e o fechado);
        · a borda MEDALHÃO (o lugar 28): o aro de metal com o chanfro, os rebites e o filete colorido (as duas cores da
          borda), no tamanho da BOTÃO; vale o TAMANHO DA BORDA da v105.
      As peças são da CONTA: quem comprou a mascote tem a cara dela (e a borda Medalhão, que vem com qualquer mascote) e
      usa no CRIAR TAMPINHA como as peças pagas; quem não tem não vê as peças no editor, não monta pelo código colado nem
      pela sorteada, e a loja de peças não vende avulsas (o editor manda para a LOJA). Os bots não pegam as mascotes.
   3) AS PRONTAS ESCONDIDAS (v101): as mascotes são a exceção — continuam à venda, equipam, aparecem na LOJA (TAMPINHAS ›
      MASCOTES), nas miniaturas (no lugar do "?") e no inventário, mesmo com as outras prontas guardadas.
   A ORDEM: as peças entram ANTES da releitura das tampinhas adiadas da v105 (tools/v106/conteudo.py põe a chamada do
   ct106Pecas no começo do tools/v105/cosmeticos.js) — quem já usava uma mascote abre o jogo com ela, sem sumir.
   ====================================================================================================================== */

/* ---------------------------------------------------------------- 0) as peças (declarações: valem desde o começo do script) */
var CT106;                                                 // {masc, borda, porCara, porItem} (sem valor aqui: a chamada do começo já pode ter preenchido)
function ct106Pecas(){
  if (CT106) return CT106;
  const masc = [                                           // item do catálogo · a cara · o nome · a raridade · o quadro parado
    {item:'tp_m_arara', cara:'ar', nome:'Arara Invocada', pr:'lendario', t0:1.1},
    {item:'tp_m_oncapreta', cara:'op', nome:'Onça-Preta', pr:'lendario', t0:.9},
    {item:'tp_m_mico', cara:'mi', nome:'Mico-Leão Bolado', pr:'lendario', t0:.7},
    {item:'tp_m_guara', cara:'lg', nome:'Guará da Várzea', pr:'epico', t0:.5},
    {item:'tp_m_tucano', cara:'tu', nome:'Tucano Marrento', pr:'epico', t0:1.3},
    {item:'tp_m_jacare', cara:'jc', nome:'Jacaré Papo-Amarelo', pr:'epico', t0:.4},
  ];
  const borda = {id:'mh', nome:'Medalhão', pr:'epico', n:0, forma:'lisa', pinta:'medalhao', cores:2, loja:'mascote'};
  for (const m of masc){
    if (TP_MAPA.i.has(m.cara)) continue;
    const c = {id:m.cara, nome:m.nome, anim:'Pisca de vez em quando', t0:m.t0, pinta:ct106PintaDe(m.cara), pr:m.pr, mascote:m.item};
    SK76_CARAS.push(c); SK76_CARA.set(c.id, c);
    const it = {id:m.cara, nome:m.nome, pr:m.pr, cores:0, cara:true, loja:m.item};
    TP_ICONES.push(it); TP_MAPA.i.set(it.id, it);
  }
  if (!TP_MAPA.b.has(borda.id)){ TP_BORDAS.push(borda); TP_MAPA.b.set(borda.id, borda); }
  CT106 = {masc, borda, porCara:new Map(masc.map(m => [m.cara, m])), porItem:new Map(masc.map(m => [m.item, m])), cod:new Map(), bot:new Map()};
  // as prontas escondidas (v101): as mascotes são a exceção já daqui — a releitura da v105, logo depois, devolve a mascote
  // equipada e o perfil.skin (o tpMinha pergunta à v101 se a equipada está escondida)
  try {
    if (typeof v101MontaPronta === 'function' && !v101MontaPronta.ct106){
      const v101MontaProntaAntesCt106 = v101MontaPronta;
      v101MontaPronta = function(){
        const r = v101MontaProntaAntesCt106.apply(this, arguments);
        try { for (const c of [...V101S.set]) if (ct106UsaMascote(c)) V101S.set.delete(c); V101S.memo = new Map(); } catch (_) {}
        return r;
      };
      v101MontaPronta.ct106 = true;
    }
  } catch (_) {}
  // (o que foi montado antes das peças novas é refeito: as prontas da v101 e os "inválidos" guardados)
  try { if (typeof V101S !== 'undefined' && V101S){ V101S.set = null; V101S.memo = new Map(); } } catch (_) {}
  try { for (const [k, v] of [...TP_LIDOS]) if (v === null) TP_LIDOS.delete(k); } catch (_) {}
  return CT106;
}
function ct106PintaDe(id){                                  // a cara da mascote (a imagem pronta do tamanho, aberta ou piscando)
  return function(g, R, t, px){
    const W = sk76Lado(px*2), olho = msc106Pisca(id, t);
    g.drawImage(sk76Cache('msc106|' + id + '|' + olho + '|' + W, W, (c, w) => msc106Mascote(c, id, w, olho)), -R, -R, 2*R, 2*R);
  };
}
function ct106EhItem(codigo){ return !!(CT106 && CT106.porItem.has(codigo)); }
function ct106Item(codigo){ try { return typeof CAT88 !== 'undefined' ? CAT88.itens.find(x => x.id === codigo) || null : null; } catch (_) { return null; } }
function ct106CodDoItem(codigo){                            // o código da tampinha de uma mascote (o mesmo que o catálogo descreve)
  const P = ct106Pecas(); let c = P.cod.get(codigo);
  if (c === undefined){
    c = '';
    try { const it = ct106Item(codigo); if (it && it.visual && it.visual.d) c = tpCodigo(tpNorm(tpD(it.visual.d))); } catch (_) {}
    P.cod.set(codigo, c);
  }
  return c;
}
function ct106UsaMascote(cod){                              // o código usa uma peça das mascotes? (a cara ou a borda Medalhão)
  try { const D = tpEhCodigo(cod) ? tpLe(cod) : null; if (!D || D.k !== 'T') return false; const i = TP_MAPA.i.get(D.i), b = TP_MAPA.b.get(D.b); return !!((i && i.loja) || (b && b.loja)); } catch (_) { return false; }
}
ct106Pecas();

/* ---------------------------------------------------------------- 1) as bolas: o desenho girando e o parado */
const v88DesenhaBolaJogoAntesCt106 = v88DesenhaBolaJogo;
v88DesenhaBolaJogo = function(g, x, y, r, it){
  const V = it && it.visual;
  if (bl106EhNova(V)){ try { return bl106Desenha(g, x, y, r, V, Rm, true); } catch (e) { console.error('v106 bola', e); } }
  return v88DesenhaBolaJogoAntesCt106.apply(this, arguments);
};
const v88BolaParadaAntesCt106 = v88BolaParada;
v88BolaParada = function(g, x, y, r, it){
  const V = it && it.visual;
  if (bl106EhNova(V)){ try { return bl106Desenha(g, x, y, r, V, bl106Parada(V), false); } catch (e) { console.error('v106 bola', e); } }
  return v88BolaParadaAntesCt106.apply(this, arguments);
};

/* ---------------------------------------------------------------- 2) a borda MEDALHÃO (o aro de metal com o chanfro) */
function ct106Aro(g, x, y, r, D){
  const R = r*.97, c1 = tpHex(D.bc[0], '#d9a520'), c2 = tpHex(D.bc[1], '#ffffff'), esc = tpEscalaDe(g), rpx = r*esc;
  const rm = r*(tpMiolo(D) + .035), wC = Math.max(1.2/esc, R*.055), fora = R - wC, larg = Math.max(.5/esc, fora - rm);
  g.beginPath(); g.arc(x, y, R, 0, TP_TAU); g.fillStyle = msc106K(); g.fill();                  // o contorno escuro firme por fora
  const gr = g.createLinearGradient(x - R*.72, y - R*.72, x + R*.72, y + R*.72);             // o metal: a luz em cima à esquerda
  gr.addColorStop(0, tpMix(c1, '#ffffff', .55)); gr.addColorStop(.42, c1); gr.addColorStop(.7, tpMix(c1, '#000000', .2)); gr.addColorStop(1, tpMix(c1, '#000000', .5));
  g.beginPath(); g.arc(x, y, fora, 0, TP_TAU); g.fillStyle = gr; g.fill();
  const meio = (fora + rm)/2;                                                                 // o chanfro: o brilho e a sombra no meio do aro
  g.lineCap = 'round'; g.lineWidth = Math.max(.8/esc, larg*.26);
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(x, y, meio + larg*.16, Math.PI*1.02, Math.PI*1.58); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.arc(x, y, meio - larg*.12, Math.PI*.04, Math.PI*.6); g.stroke();
  g.lineCap = 'butt';
  if (rpx > 26 && larg*esc > 4.5){                                                            // grande: os rebites e a estrela do escudo
    for (let i = 0; i < 10; i++){
      const a = -Math.PI/2 + (i + .5)*TP_TAU/10, px = x + Math.cos(a)*meio, py = y + Math.sin(a)*meio, rr = larg*.15;
      tpCirc(g, px + rr*.25, py + rr*.3, rr, 'rgba(0,0,0,.35)'); tpCirc(g, px, py, rr, tpMix(c1, '#ffffff', .35)); tpCirc(g, px - rr*.3, py - rr*.3, rr*.42, 'rgba(255,255,255,.75)');
    }
    const p = new Path2D(); tpEstrelaPath(p, x, y - meio, larg*.42, 5, .45);
    g.fillStyle = c2; g.fill(p); g.lineWidth = Math.max(.8/esc, larg*.08); g.strokeStyle = msc106K(); g.stroke(p);
  }
  g.lineWidth = Math.max(1/esc, r*.034); g.strokeStyle = c2;                                  // o filete colorido por dentro
  g.beginPath(); g.arc(x, y, rm + g.lineWidth/2, 0, TP_TAU); g.stroke();
}
const tpSaiaAntesCt106 = tpSaia;
tpSaia = function(g, x, y, r, D){
  if (typeof tpSemBorda === 'function' && tpSemBorda(D)) return;
  const B = D && TP_MAPA.b.get(D.b);
  if (B && B.pinta === 'medalhao') return ct106Aro(g, x, y, r, D);
  return tpSaiaAntesCt106.apply(this, arguments);
};

/* ---------------------------------------------------------------- 3) as peças são da conta (quem comprou a mascote) */
function ct106TemItem(codigo){ try { return typeof V88 !== 'undefined' && !!V88.inv && V88.inv.has(codigo); } catch (_) { return false; } }
// null: não é peça das mascotes · true/false: a conta tem (a cara: a mascote dela; a Medalhão: qualquer mascote)
function ct106TemPeca(tipo, id){
  if (tipo !== 'i' && tipo !== 'b') return null;
  const it = tpMapaDe(tipo).get(id); if (!it || !it.loja) return null;
  if (TP.itens.has(tpChave(tipo, id))) return true;         // (a peça avulsa na conta, se um dia a plataforma vender)
  if (it.loja === 'mascote') return CT106.masc.some(m => ct106TemItem(m.item));
  return ct106TemItem(it.loja);
}
function ct106ItemDe(D, x){                                  // a mascote que traz a peça que falta (a Medalhão: a da cara, ou a primeira)
  if (x && x.it && x.it.loja && x.it.loja !== 'mascote') return x.it.loja;
  const m = D && CT106.porCara.get(D.i); return m ? m.item : CT106.masc[0].item;
}
function ct106PodeUsar(cod){                                 // pode equipar este código? (sem peça das mascotes, sempre)
  const D = tpEhCodigo(cod) ? tpLe(cod) : null; if (!D || D.k !== 'T') return true;
  if (ct106TemPeca('i', D.i) !== false && ct106TemPeca('b', D.b) !== false) return true;
  try { if (v88Logado() && !V88.estado) return true; } catch (_) {}   // (o inventário da conta ainda chegando: vale o que a conta guardou)
  return false;
}
const tpTemAntesCt106 = tpTem;
tpTem = function(tipo, id){ const r = ct106TemPeca(tipo, id); return r === null ? tpTemAntesCt106.apply(this, arguments) : r; };
const tpFaltamAntesCt106 = tpFaltam;
tpFaltam = function(D){                                     // a peça das mascotes que falta não se compra avulsa: vem com a mascote, na LOJA
  const L = tpFaltamAntesCt106.apply(this, arguments);
  for (const x of L) if (x.it && x.it.loja){ x.loja = ct106ItemDe(D, x); x.pr = {m:0, g:0, nome:'Na LOJA'}; }
  return L;
};
const tpCustoAntesCt106 = tpCusto;
tpCusto = function(D){ const c = tpCustoAntesCt106.apply(this, arguments); if (tpFaltam(D).some(x => x.loja)) c.loja = true; return c; };
const tpCompraAntesCt106 = tpCompra;
tpCompra = function(D){
  const x = tpFaltam(D).find(y => y.loja);
  if (x){ const it = ct106Item(x.loja); try { som.erro(); aviso('Essa peça vem com a mascote ' + (it ? it.nome : '') + ': compre na LOJA › TAMPINHAS.'); } catch (_) {} return false; }
  return tpCompraAntesCt106.apply(this, arguments);
};
const tpEquipaAntesCt106 = tpEquipa;
tpEquipa = function(cod){                                   // (equipar por código colado ou salvo: sem a mascote, não vale)
  if (!ct106PodeUsar(cod)){ try { som.erro(); aviso('Essa é uma mascote da LOJA: compre para usar (LOJA › TAMPINHAS).'); } catch (_) {} return false; }
  return tpEquipaAntesCt106.apply(this, arguments);
};
if (typeof ecoPecas === 'function'){                        // (a loja de peças não vende as das mascotes avulsas)
  const ecoPecasAntesCt106 = ecoPecas;
  ecoPecas = function(){ return ecoPecasAntesCt106.apply(this, arguments).filter(x => !(x.it && x.it.loja)); };
}
// os bots não pegam as mascotes (como as animadas)
const tpDoBotAntesCt106 = tpDoBot;
tpDoBot = function(semente){
  const c = tpDoBotAntesCt106.apply(this, arguments), M = CT106.bot;
  let s = M.get(c); if (s !== undefined) return s;
  s = c;
  try {
    const D = tpLe(c);
    if (D){
      let mudou = false;
      const I = TP_MAPA.i.get(D.i), B = TP_MAPA.b.get(D.b);
      if (I && I.loja){ D.i = '--'; D.ie = 0; mudou = true; }
      if (B && B.loja){ D.b = 'dt'; mudou = true; }
      if (mudou) s = tpCodigo(D);
    }
  } catch (_) {}
  if (M.size > 300) M.clear();
  M.set(c, s); return s;
};

/* ---------------------------------------------------------------- 4) o editor: só para quem tem, com o selo MASCOTE */
if (typeof tpeFaixa === 'function'){
  const tpeFaixaAntesCt106 = tpeFaixa;
  tpeFaixa = function(){
    const r = tpeFaixaAntesCt106.apply(this, arguments);
    try {
      const tipo = tpeTipo(ED.aba);
      for (const b of [...ED.el.faixa.children]){
        const t = ct106TemPeca(tipo, b.dataset.id); if (t === null) continue;
        if (!t) b.remove(); else { b.classList.remove('sk76-anim'); b.classList.add('ct106-masc'); }
      }
    } catch (_) {}
    return r;
  };
}
if (typeof tpeConcluir === 'function'){                     // o CONCLUÍDO com uma peça das mascotes que não é sua: a janela manda para a LOJA
  const tpeConcluirAntesCt106 = tpeConcluir;
  tpeConcluir = function(){
    try {
      const x = ED.D ? tpFaltam(ED.D).find(y => y.loja) : null;
      if (x){
        const cod = tpCodigo(ED.D);
        if (ED.modo !== 'E' && cod === tpMinha()){ som.clique(); return tpeAplica(cod); }   // (a mascote que já está equipada, sem mudar nada: só volta)
        som.clique(); ct106PopLoja(x.loja); return;
      }
    } catch (e) { console.error('v106 editor', e); }
    return tpeConcluirAntesCt106.apply(this, arguments);
  };
}
function ct106PopLoja(codigo){
  const it = ct106Item(codigo); if (!it) return;
  abrePop(cx => {
    cx.classList.add('ct106-pop');
    cx.append(nodo('span', 'pop-tag', 'MASCOTE DA LOJA'), nodo('h2', null, String(it.nome).toUpperCase()));
    const cvs = v88MiniItem(codigo, 120); cvs.classList.add('ct106-pop-mini'); cx.appendChild(cvs);
    cx.appendChild(nodo('p', 'pop-txt', 'A cara ' + it.nome + ' e a borda Medalhão vêm com a mascote, na LOJA › TAMPINHAS. Depois de comprar, elas ficam na sua conta e aparecem aqui no CRIAR TAMPINHA.'));
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('VOLTAR', '', () => { som.clique(); fechaPop(); }), botaoPop('VER NA LOJA', 'verde', () => { som.clique(); fechaPop(); ct106AbreLoja(codigo); }));
    cx.appendChild(a);
  });
}
function ct106AbreLoja(codigo){
  try { ED.manter = true; } catch (_) {}
  try { if (typeof V88S !== 'undefined') V88S.cat = 'tampinhas'; } catch (_) {}
  try { abreTela('loja', lobby.tela === 'skins' ? 'skins' : undefined); } catch (_) {}
  if (codigo) setTimeout(() => { try { v88ItemAbre(codigo); } catch (_) {} }, 250);
}
if (typeof tpeAleatoria === 'function'){                    // (a sorteada nunca cai numa peça das mascotes que não é sua)
  const tpeAleatoriaAntesCt106 = tpeAleatoria;
  tpeAleatoria = function(){
    const r = tpeAleatoriaAntesCt106.apply(this, arguments);
    try {
      if (ED.D){
        let mudou = false;
        if (ct106TemPeca('i', ED.D.i) === false){ ED.D.i = '--'; ED.D.ie = 0; mudou = true; }
        if (ED.modo !== 'E' && ct106TemPeca('b', ED.D.b) === false){ ED.D.b = 'dt'; mudou = true; }
        if (mudou) tpeAtualiza(true);
      }
    } catch (_) {}
    return r;
  };
}
if (typeof tpeSincroniza === 'function'){                   // os textos da cara (a mascote ocupa a tampinha) e da borda Medalhão
  const tpeSincronizaAntesCt106 = tpeSincroniza;
  tpeSincroniza = function(){
    const r = tpeSincronizaAntesCt106.apply(this, arguments);
    try {
      const E = ED.el, D = ED.D; if (!E || !D || ED.modo !== 'T') return r;
      const m = CT106.porCara.get(D.i);
      if (ED.aba === 'i' && m){ E.semGeo.textContent = 'A mascote ocupa a tampinha inteira (e pisca de vez em quando): o padrão fica por baixo dela.'; E.notaCor.hidden = false; E.notaCor.textContent = 'A mascote ' + m.nome + ' tem as cores dela. A borda Medalhão combina: veja em BORDA.'; }
      if (ED.aba === 'b' && D.b === CT106.borda.id && !(typeof tpSemBorda === 'function' && tpSemBorda(D))) E.semGeo.textContent = 'A borda Medalhão: o aro de metal (METAL) com o filete colorido por dentro (FILETE). Vem com as mascotes.';
    } catch (_) {}
    return r;
  };
}
if (typeof tpeSlots === 'function'){                        // (as duas cores da Medalhão: o METAL e o FILETE)
  const tpeSlotsAntesCt106 = tpeSlots;
  tpeSlots = function(){
    const r = tpeSlotsAntesCt106.apply(this, arguments);
    try { if (ED.aba === 'b' && ED.modo !== 'E' && ED.D && ED.D.b === CT106.borda.id && r.length === 2){ r[0] = [r[0][0], r[0][1], 'METAL']; r[1] = [r[1][0], r[1][1], 'FILETE']; } } catch (_) {}
    return r;
  };
}
if (typeof tpeNomeDe === 'function'){                       // (o nome da mascote, mesmo sem a conta ter carregado)
  const tpeNomeDeAntesCt106 = tpeNomeDe;
  tpeNomeDe = function(D){
    try { if (D && D.k === 'T' && CT106.porCara.has(D.i)){ const cod = tpCodigo(D); for (const m of CT106.masc) if (ct106CodDoItem(m.item) === cod) return m.nome; } } catch (_) {}
    return tpeNomeDeAntesCt106.apply(this, arguments);
  };
}

/* ---------------------------------------------------------------- 5) as prontas escondidas (v101): as mascotes são a exceção
   (a lista das prontas já sai sem as mascotes desde o ct106Pecas, lá em cima; aqui, as miniaturas) */
try { if (typeof V101S !== 'undefined' && V101S) V101S.set = null; } catch (_) {}   // (montada de novo na próxima pergunta)
if (typeof v88PintaMini === 'function'){                   // a miniatura da mascote (a v101 punha o "?" em toda tampinha do catálogo)
  const v88PintaMiniAntesCt106 = v88PintaMini;
  v88PintaMini = function(g, px, codigo){
    if (ct106EhItem(codigo)){ const cod = ct106CodDoItem(codigo), D = cod && tpLe(cod); if (D){ g.drawImage(tpMiniatura(D, px), 0, 0, px, px); return; } }
    return v88PintaMiniAntesCt106.apply(this, arguments);
  };
  try { if (typeof V88C !== 'undefined' && V88C.mini) V88C.mini.clear(); } catch (_) {}
}

/* ---------------------------------------------------------------- 6) a LOJA: TAMPINHAS › MASCOTES (à venda), comprar e equipar */
if (typeof v88LojaExclusivas === 'function'){
  const v88LojaExclusivasAntesCt106 = v88LojaExclusivas;
  v88LojaExclusivas = function(pai){
    try { ct106LojaMascotes(pai); } catch (e) { console.error('v106 loja', e); }
    // (as exclusivas de sempre — do passe, dos eventos e do ranking — sem as mascotes, que já estão em cima)
    const C = typeof CAT88 !== 'undefined' ? CAT88 : null, todos = C && C.itens;
    if (!todos) return v88LojaExclusivasAntesCt106.apply(this, arguments);
    C.itens = todos.filter(i => !ct106EhItem(i.id));
    try { return v88LojaExclusivasAntesCt106.apply(this, arguments); } finally { C.itens = todos; }
  };
}
function ct106LojaMascotes(pai){                            // (em cima de tudo na TAMPINHAS: antes das peças da tampinha)
  const caixa = nodo('div', 'ct106-loja-masc'), cab = nodo('div', 'v88-loja-cab ct106-loja-cab');
  cab.append(nodo('h3', 'tl-sub', 'MASCOTES'), nodo('small', 'v88-nota', 'Os bichos do Brasil em medalhão, com a borda Medalhão. Ficam na sua conta: equipam em qualquer aparelho e aparecem para todo mundo na partida.'));
  caixa.appendChild(cab);
  v88LojaGrade(caixa, CT106.masc.map(m => m.item), !v88Logado());
  const grade = caixa.lastChild;
  if (grade && grade !== cab){
    grade.classList.add('ct106-mascotes');
    for (const b of grade.querySelectorAll('.v88-item.st-seu .v88-item-st')) b.textContent = 'EQUIPAR';
    for (const b of grade.querySelectorAll('.v88-item.st-equipado .v88-item-st')) b.textContent = 'EQUIPADA';
  }
  const bloco = typeof V88S !== 'undefined' && V88S.blocoTampinhas;
  if (bloco && bloco.parentNode === pai) pai.insertBefore(caixa, bloco); else pai.appendChild(caixa);
}
if (typeof v88LojaEstadoDe === 'function'){                 // (a mascote equipada: EQUIPADA)
  const v88LojaEstadoDeAntesCt106 = v88LojaEstadoDe;
  v88LojaEstadoDe = function(codigo){
    const st = v88LojaEstadoDeAntesCt106.apply(this, arguments);
    try { if (st === 'seu' && ct106EhItem(codigo) && ct106CodDoItem(codigo) === tpMinha()) return 'equipado'; } catch (_) {}
    return st;
  };
}
if (typeof v88LojaLista === 'function'){                    // (as ofertas, os destaques e o inventário com as mascotes, mesmo sem as prontas)
  const v88LojaListaAntesCt106 = v88LojaLista;
  v88LojaLista = function(cat){
    const l = v88LojaListaAntesCt106.apply(this, arguments);
    try {
      const E = typeof V88 !== 'undefined' ? V88.estado : null;
      let mais = [];
      if ((cat === 'ofertas' || cat === 'destaques') && E && Array.isArray(E[cat])) mais = E[cat].map(v => v.codigo).filter(ct106EhItem);
      else if (cat === 'inventario') mais = CT106.masc.map(m => m.item).filter(ct106TemItem);
      for (const c of mais) if (l.indexOf(c) < 0) l.push(c);
    } catch (_) {}
    return l;
  };
}
if (typeof v88ItemAbre === 'function'){
  const v88ItemAbreAntesCt106 = v88ItemAbre;
  v88ItemAbre = function(codigo){ if (ct106EhItem(codigo)) return ct106ItemAbre(codigo); return v88ItemAbreAntesCt106.apply(this, arguments); };
}
function ct106ItemAbre(codigo){                              // a mascote aberta: grande, a descrição, o preço e o botão certo
  const it = ct106Item(codigo); if (!it) return;
  const v = v88Venda(codigo), st = v88Logado() ? v88LojaEstadoDe(codigo) : 'venda', R = v88Raridade(it.raridade);
  abrePop(c => {
    c.classList.add('v88-pop', 'v88-item-pop', 'ct106-pop'); c.style.setProperty('--r', R.cor);
    const topo = nodo('div', 'v88-item-pop-topo'), mini = nodo('div', 'v88-item-pop-mini'); mini.appendChild(v88MiniItem(codigo, 220));
    const tx = nodo('div', 'v88-item-pop-tx');
    tx.append(nodo('span', 'pop-tag', 'MASCOTE · ' + R.nome.toUpperCase()), nodo('h2', null, it.nome));
    if (it.desc) tx.appendChild(nodo('p', 'pop-txt', it.desc));
    if (v && st === 'venda'){ const p = nodo('div', 'v88-item-pop-preco'); if (v.desconto) p.appendChild(nodo('s', null, fmtNum(v.base.gemas || v.base.moedas))); p.appendChild(v88Preco(v.moedas, v.gemas)); if (v.desconto) p.appendChild(nodo('em', 'v88-tag vermelho', '-' + v.desconto + '%')); tx.appendChild(p); }
    topo.append(mini, tx); c.appendChild(topo);
    const a = nodo('div', 'pop-acoes');
    a.appendChild(botaoPop('FECHAR', '', () => { som.clique(); fechaPop(); }));
    if (!v88Logado()){ if (v88TemPlataforma() && typeof v84AbreLogin === 'function' && window.RACHA84 && !window.RACHA84.embutido) a.appendChild(botaoPop('ENTRAR PARA COMPRAR', 'amarelo', () => { som.clique(); fechaPop(); try { fechaTela(); } catch (_) {} v84AbreLogin('entrar'); })); }
    else if (st === 'equipado') a.appendChild(botaoPop('EQUIPADA', 'verde', () => { som.clique(); fechaPop(); }));
    else if (st === 'seu') a.appendChild(botaoPop('EQUIPAR', 'verde', () => { som.clique(); fechaPop(); ct106Equipa(codigo); }));
    else if (st === 'venda' && v){
      const pode = CONTA.moedas >= v.moedas && CONTA.gemas >= v.gemas;
      a.appendChild(botaoPop(pode ? 'COMPRAR' : 'FALTA SALDO', pode ? 'verde' : '', () => { som.clique(); if (!pode){ som.erro(); v88FaltaSaldo(v); return; } fechaPop(); ct106Compra(codigo, v); }));
    }
    c.appendChild(a);
  });
}
function ct106Compra(codigo, v){                             // a compra é na conta (o servidor confere o preço e o saldo)
  const it = ct106Item(codigo); if (!it) return;
  v88Confirma('LOJA', 'COMPRAR ' + String(it.nome).toUpperCase() + '?', 'Preço: ' + (v.gemas ? fmtNum(v.gemas) + ' gemas' : fmtNum(v.moedas) + ' moedas') + '. Saldo depois: ' + fmtNum(CONTA.moedas - v.moedas) + ' moedas · ' + fmtNum(CONTA.gemas - v.gemas) + ' gemas. A mascote fica na sua conta (com a cara e a borda Medalhão para o CRIAR TAMPINHA).', 'COMPRAR', () => {
    v88M('loja.comprar', {codigo, preco:{moedas:v.moedas, gemas:v.gemas}}).then(r => {
      if (r && r.carteira) v88PoeCarteira(r.carteira);
      V88.inv.add(codigo);
      try { v88TampinhasDaConta(); } catch (_) {}
      som.compra();
      abrePop(cx => {
        cx.classList.add('v88-pop', 'ct106-pop'); cx.append(nodo('span', 'pop-tag', 'COMPRADA!'), nodo('h2', null, String(it.nome).toUpperCase()));
        const m = nodo('div', 'v88-item-pop-mini'); m.appendChild(v88MiniItem(codigo, 160)); cx.appendChild(m);
        const a = nodo('div', 'pop-acoes'); a.append(botaoPop('DEPOIS', '', () => { som.clique(); fechaPop(); }), botaoPop('EQUIPAR AGORA', 'verde', () => { som.clique(); fechaPop(); ct106Equipa(codigo); })); cx.appendChild(a);
      });
      v88Estado(true).then(() => { if (v88Aberta('loja')) renderLoja(); }).catch(() => {});
      if (v88Aberta('loja')) renderLoja();
    }).catch(e => {
      som.erro(); v88Aviso(e.message || 'A compra não deu certo: nada foi cobrado.');
      if (/preço mudou|já tem|já foi feita/i.test(e.message || '')) v88Estado(true).then(() => { if (v88Aberta('loja')) renderLoja(); }).catch(() => {});
    });
  });
}
function ct106Equipa(codigo){                                // equipar a mascote: a tampinha da conta (o lobby, o perfil, a sala e a conta ficam sabendo)
  const cod = ct106CodDoItem(codigo), it = ct106Item(codigo); if (!cod) return false;
  if (!tpEquipa(cod)) return false;
  try { som.compra(); v88Aviso((it ? it.nome : 'Mascote') + ' equipada!'); } catch (_) {}
  try { if (v88Aberta('loja')) renderLoja(); } catch (_) {}
  return true;
}
// o INVENTÁRIO do editor (sem as prontas, a v101 tira o bloco DA SUA CONTA): as mascotes da conta voltam num bloco só delas
if (typeof tpeInventario === 'function'){
  const tpeInventarioAntesCt106 = tpeInventario;
  tpeInventario = function(c){
    const r = tpeInventarioAntesCt106.apply(this, arguments);
    try {
      if (ED.modo === 'E' || c.querySelector('.ct106-inv')) return r;
      const minhas = CT106.masc.filter(m => ct106TemItem(m.item)), jaTem = [...c.querySelectorAll('.tpe-card')].map(b => b.dataset.cod);
      const l = minhas.filter(m => jaTem.indexOf(ct106CodDoItem(m.item)) < 0);
      if (!l.length) return r;
      const cab = nodo('div', 'tpe-inv-cab ct106-inv'); cab.appendChild(nodo('b', 'tpe-rot', 'SUAS MASCOTES'));
      const g = nodo('div', 'tpe-cards ct106-inv-cards'), fila = [];
      for (const m of l){ const D = tpLe(ct106CodDoItem(m.item)); if (D) g.appendChild(tpeCartao(D, m.nome, null, fila)); }
      const pecas = c.querySelector('.tpe-pecas');
      if (pecas){ c.insertBefore(cab, pecas); c.insertBefore(g, pecas); } else c.append(cab, g);
      tpeMarcaGrade(); tpeEnche(fila);
    } catch (e) { console.error('v106 inventário', e); }
    return r;
  };
}

/* ---------------------------------------------------------------- 7) o estilo (o selo MASCOTE na faixa e a loja) */
(function(){
  const st = document.createElement('style'); st.id = 'ct106-css';
  st.textContent = '#lb .tpe-item.ct106-masc::after{ content:"MASCOTE"; position:absolute; top:2px; left:50%; transform:translateX(-50%); padding:2px 6px; border-radius:7px; background:#ffd23f; color:#1a1300; font:800 15px/1 system-ui, sans-serif; letter-spacing:.3px; border:2px solid #0f1112; pointer-events:none; }'
    + '#lb .ct106-loja-cab{ margin-top:4px; }'
    + '#lb .ct106-loja-masc{ margin-bottom:18px; }'
    + '.ct106-pop-mini{ display:block; width:120px; height:120px; margin:6px auto 2px; }';
  document.head.appendChild(st);
})();

/* ---------------------------------------------------------------- 8) começo: o que foi desenhado antes é refeito */
try {
  if (typeof sk76Refaz === 'function') sk76Refaz(); else TP_SPR.clear();
  if (typeof CLB_MINI !== 'undefined') CLB_MINI.clear();
  if (typeof V88C !== 'undefined' && V88C.mini) V88C.mini.clear();
  if (typeof BRASIL !== 'undefined' && BRASIL.tampas && BRASIL.tampas.clear) BRASIL.tampas.clear();
  if (typeof V91 !== 'undefined' && V91.moldes) for (const k in V91.moldes) V91.moldes[k].key = '';
} catch (_) {}
window.RachaConteudo106 = {
  mascotes:() => CT106.masc.map(m => Object.assign({}, m, {codigo:ct106CodDoItem(m.item), tem:ct106TemItem(m.item)})),
  bolas:() => (typeof CAT88 !== 'undefined' ? CAT88.itens : []).filter(i => i.tipo === 'bola' && bl106EhNova(i.visual)).map(i => i.id),
  padroes:bl106Padroes, codigo:ct106CodDoItem, temPeca:ct106TemPeca, podeUsar:ct106PodeUsar, usaMascote:ct106UsaMascote,
  borda:() => CT106.borda.id, caras:() => CT106.masc.map(m => m.cara), equipa:ct106Equipa, abreLoja:ct106AbreLoja,
};
