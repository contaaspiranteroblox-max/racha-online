/* ======================================================================================================================
   RACHA v101 · SÓ O CRIAR TAMPINHA (o pedido: "tire todas as skins, deixe apenas o criar skins por enquanto").
   As TAMPINHAS PRONTAS saem de cena — os 44 modelos prontos do editor (e a Coroa RACHA), as 14 animadas (CRIA, CRISTO,
   PITBULL, FÉ, DRAGÃO…), a dos FUNDADORES, as da conta (skin_*) e as exclusivas do passe, dos eventos e do ranking (tp_*) — e
   fica o editor (COFRE › CRIAR TAMPINHA): as peças, as cores, as salvas criadas e a inicial (roxo, branco e laranja).
   · POR ENQUANTO: nada é apagado. O que é seu continua na conta e no aparelho (a equipada, as salvas, o inventário); quem
     estava com uma pronta aparece com a inicial — para todo mundo — até criar a sua; religar faz a pronta voltar sozinha.
   · O INTERRUPTOR: V101_SKINS_PRONTAS = true aqui, ou RACHA_CONFIG.skinsProntas = true no config.js (sem refazer o build).
   · As peças do editor ficam (inclusive as caras e as bordas animadas: são peças de CRIAR, compradas na loja de peças).
   · Uma tampinha é "pronta" quando o código dela é o de um desses modelos (o código é o próprio desenho); a inicial nunca é.
   Só aparência: a física, o tamanho e o chute não mudam.
   ====================================================================================================================== */
var V101_SKINS_PRONTAS = false;                           // (true: as prontas de volta)
var V101S = {esconde:false, pronto:false, set:null, nConta:-1, tConta:0, memo:null, avisoPend:false};
function v101SkinsLigadas(){ try { return V101_SKINS_PRONTAS === true || !!(window.RACHA_CONFIG && window.RACHA_CONFIG.skinsProntas === true); } catch (_) { return true; } }
// (o tpMinha chama esta antes deste arquivo rodar: até o fim dele, nada some — por isso só var e function aqui em cima)
function v101Esconde(cod){ return !!(V101S && V101S.pronto && V101S.esconde && cod && v101EhPronta(cod)); }
function v101EhPronta(cod){                              // (chamada a cada quadro pelo desenho: a resposta fica guardada por código)
  if (!cod || typeof cod !== 'string') return false;
  const agora = Date.now();
  if (!V101S.set || agora - V101S.tConta > 2000){          // (as da conta chegam depois, com o login: a lista é conferida a cada 2 s)
    V101S.tConta = agora;
    let n = 0; try { n = typeof TP_CONTA !== 'undefined' ? Object.keys(TP_CONTA).length : 0; } catch (_) {}
    if (!V101S.set || n !== V101S.nConta) v101MontaPronta(n);
  }
  let r = V101S.memo.get(cod);
  if (r === undefined){
    r = false;
    try { r = !(typeof v95EhInicial === 'function' && v95EhInicial(cod)) && V101S.set.has(cod); } catch (_) {}
    if (V101S.memo.size > 600) V101S.memo.clear();
    V101S.memo.set(cod, r);
  }
  return r;
}
function v101MontaPronta(n){                             // os códigos de todas as prontas (montado na primeira pergunta)
  const S = new Set(), poe = c => { if (c && typeof c === 'string') S.add(c); }, doD = d => { try { if (d) poe(tpCodigo(d)); } catch (_) {} };
  try { for (const x of TP_PRE) doD(x.d); } catch (_) {}
  try { for (const x of SK76_PRE) poe(x.cod || ''); } catch (_) {}
  try { if (typeof SK96_PRE_FUNDADOR !== 'undefined') { poe(SK96_PRE_FUNDADOR.cod); doD(SK96_PRE_FUNDADOR.d); } } catch (_) {}
  try { for (const id in TP_CONTA) doD(TP_CONTA[id].d); } catch (_) {}
  try { for (const it of (typeof CAT88 !== 'undefined' ? CAT88.itens : [])) if (it.tipo === 'tampinha' && it.visual && it.visual.d) doD(tpNorm(tpD(it.visual.d))); } catch (_) {}
  try { for (const id of ['tp_fundador']) if (typeof v93ExclusivaCod === 'function') poe(v93ExclusivaCod(id)); } catch (_) {}
  for (const c of [...S]) { try { if (typeof v95EhInicial === 'function' && v95EhInicial(c)) S.delete(c); } catch (_) {} }
  V101S.set = S; V101S.nConta = n; V101S.memo = new Map();
}
const v101Inicial = () => TP_PADRAO_COD;

V101S.esconde = !v101SkinsLigadas();
if (V101S.esconde) document.documentElement.classList.add('v101-semskins');

if (V101S.esconde){
  /* ---------------------------------------------------------------- 1) o desenho: a pronta (sua ou dos outros) vira a inicial */
  const tpSkinAntes101 = tpSkin;
  tpSkin = function(cod){ return tpSkinAntes101.call(this, v101Esconde(cod) ? v101Inicial() : cod); };
  const tpNoTimeAntes101 = tpNoTime;
  tpNoTime = function(cod, t){ return tpNoTimeAntes101.call(this, v101Esconde(cod) ? v101Inicial() : cod, t); };
  const tpNoTimeSkAntes101 = tpNoTimeSk;
  tpNoTimeSk = function(sk, t){ if (sk && v101Esconde(sk.id)) sk = tpSkin(v101Inicial()) || sk; return tpNoTimeSkAntes101.call(this, sk, t); };
  if (typeof emjMiniatura === 'function'){                // (o fim da partida, o perfil, as fichas)
    const emjMiniaturaAntes101 = emjMiniatura;
    emjMiniatura = function(cod, emoji, px){ return emjMiniaturaAntes101.call(this, v101Esconde(cod) ? v101Inicial() : cod, emoji, px); };
  }
  if (typeof v93Linha === 'function'){                    // (o painel dos jogadores na partida)
    const v93LinhaAntes101 = v93Linha;
    v93Linha = function(o){ if (o && v101Esconde(o.skin)) o = Object.assign({}, o, {skin:v101Inicial()}); return v93LinhaAntes101.call(this, o); };
  }
  if (typeof v93CartaoGol === 'function'){                // (o cartão de quem marcou, no replay)
    const v93CartaoGolAntes101 = v93CartaoGol;
    v93CartaoGol = function(){ try { const G = V93P.gol; if (G && G.autor && v101Esconde(G.autor.skin)) G.autor = Object.assign({}, G.autor, {skin:v101Inicial()}); } catch (_) {} return v93CartaoGolAntes101.apply(this, arguments); };
  }
  if (typeof ofjAvatar === 'function'){                   // (a partida da Oficina)
    const ofjAvatarAntes101 = ofjAvatar;
    ofjAvatar = function(g, p, x, y, r){ if (p && v101Esconde(p.skin)) p = Object.assign({}, p, {skin:v101Inicial()}); return ofjAvatarAntes101.call(this, g, p, x, y, r); };
  }

  /* ---------------------------------------------------------------- 2) o que vai para o servidor: a inicial no lugar da pronta */
  // (o servidor guarda a última tampinha de cada um e mostra para os outros: com a inicial, todo mundo vê a inicial)
  const net49SendAntes101 = net49Send;
  net49Send = function(m){
    if (!m || typeof m !== 'object' || !m.skin || !v101Esconde(m.skin)) return net49SendAntes101.apply(this, arguments);
    return net49SendAntes101.call(this, Object.assign({}, m, {skin:v101Inicial()}));
  };
  if (typeof brasilSend === 'function'){
    const brasilSendAntes101 = brasilSend;
    brasilSend = function(m){
      if (!m || typeof m !== 'object' || !m.skin || !v101Esconde(m.skin)) return brasilSendAntes101.apply(this, arguments);
      return brasilSendAntes101.call(this, Object.assign({}, m, {skin:v101Inicial()}));
    };
  }

  /* ---------------------------------------------------------------- 3) equipar: só as criadas */
  const V101S_AVISO = 'As tampinhas prontas saíram por enquanto: crie a sua em COFRE › CRIAR TAMPINHA.';
  const tpEquipaAntes101 = tpEquipa;
  tpEquipa = function(cod){
    if (v101Esconde(cod)){ try { som.erro && som.erro(); aviso(V101S_AVISO); } catch (_) {} return false; }
    return tpEquipaAntes101.apply(this, arguments);
  };
  if (typeof tpeConcluir === 'function'){                 // (um código colado de uma pronta: o editor não diz "equipada")
    const tpeConcluirAntes101 = tpeConcluir;
    tpeConcluir = function(){
      try { if (ED.modo !== 'E' && ED.D && v101Esconde(tpCodigo(ED.D))){ som.erro && som.erro(); aviso('Essa é uma tampinha pronta: mude alguma coisa para ela virar a sua.'); return; } } catch (_) {}
      return tpeConcluirAntes101.apply(this, arguments);
    };
  }

  /* ---------------------------------------------------------------- 4) as listas: o editor, o cofre, a roda, a loja e as miniaturas */
  // o editor: sem a aba MODELOS PRONTOS (a do escudo do clube continua) e sem o bloco DA SUA CONTA no inventário
  try { const i = TPE_ABAS.T.findIndex(a => a[0] === 'pre'); if (i >= 0) TPE_ABAS.T.splice(i, 1); if (ED.modo !== 'E' && ED.aba === 'pre') ED.aba = 'p'; } catch (_) {}
  const v101SoCriadas = (fn, ctx, args) => {               // (as salvas sem as prontas, só durante a chamada: nada é apagado)
    const S = TP.salvas; if (!Array.isArray(S)) return fn.apply(ctx, args);
    TP.salvas = S.filter(s => !(s && v101Esconde(s.c)));
    try { return fn.apply(ctx, args); } finally { TP.salvas = S; }
  };
  if (typeof tpeInventario === 'function'){
    const tpeInventarioAntes101 = tpeInventario;
    tpeInventario = function(c){
      const r = tpeInventarioAntes101.apply(this, arguments);
      try {
        for (const cab of [...c.querySelectorAll('.tpe-inv-cab')]){
          const b = cab.querySelector('.tpe-rot'); if (!b || !/DA SUA CONTA/.test(b.textContent)) continue;
          let n = cab.nextElementSibling;
          while (n && !n.classList.contains('tpe-pecas') && !n.classList.contains('tpe-inv-cab')){ const prox = n.nextElementSibling; n.remove(); n = prox; }
          cab.remove();
        }
      } catch (e) { console.error('v101 inventário', e); }
      return r;
    };
  }
  if (typeof tpeInvGrade === 'function'){ const tpeInvGradeAntes101 = tpeInvGrade; tpeInvGrade = function(){ return v101SoCriadas(tpeInvGradeAntes101, this, arguments); }; }
  // o cofre e a roda das favoritas
  if (typeof v90CofreTampinhas === 'function'){
    const v90CofreTampinhasAntes101 = v90CofreTampinhas;
    v90CofreTampinhas = function(painel){
      const r = v101SoCriadas(v90CofreTampinhasAntes101, this, arguments);
      try {
        for (const c of [...painel.querySelectorAll('.cf90-tp.exclusiva')]) c.remove();
        const nota = painel.querySelector('.cf90-nota');
        if (nota && !painel.querySelector('.v101-cofre-nota')) nota.insertAdjacentElement('afterend', nodo('p', 'v88-nota v101-cofre-nota', 'As tampinhas prontas saíram por enquanto: monte a sua em CRIAR TAMPINHA (as peças, as cores e o ícone são seus).'));
      } catch (e) { console.error('v101 cofre', e); }
      return r;
    };
  }
  if (typeof v90Favoritas === 'function'){ const v90FavoritasAntes101 = v90Favoritas; v90Favoritas = function(){ return v90FavoritasAntes101.apply(this, arguments).filter(s => !v101Esconde(s.c)); }; }
  // a loja: a categoria TAMPINHAS continua (as PEÇAS do editor), sem as exclusivas prontas; o inventário sem as tampinhas
  if (typeof v88LojaExclusivas === 'function') v88LojaExclusivas = function(){};
  if (typeof v88LojaLista === 'function'){
    const v88LojaListaAntes101 = v88LojaLista;
    v88LojaLista = function(){
      const l = v88LojaListaAntes101.apply(this, arguments);
      try { return l.filter(c => { const it = typeof v88Item === 'function' ? v88Item(c) : null; return !(it && it.tipo === 'tampinha'); }); } catch (_) { return l; }
    };
  }
  try { if (typeof V93_CARTAO_CATS !== 'undefined') delete V93_CARTAO_CATS.skin; } catch (_) {}   // (as tampinhas da conta no cartão)
  // as miniaturas (o passe, os eventos, o correio, a loja): uma tampinha pronta vira a marca neutra "?"
  if (typeof v88PintaMini === 'function'){
    const v88PintaMiniAntes101 = v88PintaMini;
    v88PintaMini = function(g, px, codigo){
      try { const it = typeof v88Item === 'function' ? v88Item(codigo) : null; if (it && it.tipo === 'tampinha'){ v101MarcaNeutra(g, px); return; } } catch (_) {}
      return v88PintaMiniAntes101.apply(this, arguments);
    };
    try { if (typeof V88C !== 'undefined' && V88C.mini) V88C.mini.clear(); } catch (_) {}
  }
  if (typeof v90PopPremios === 'function'){               // (os prêmios do TOP 3: a tampinha exclusiva vira a marca neutra)
    const v90PopPremiosAntes101 = v90PopPremios;
    v90PopPremios = function(){
      const r = v90PopPremiosAntes101.apply(this, arguments);
      try { for (const cv of document.querySelectorAll('.rk90-tp')){ const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); v101MarcaNeutra(g, cv.width); } } catch (_) {}
      return r;
    };
  }
  // os FUNDADORES: a janela "você é um dos 30" (com o EQUIPAR) espera as prontas voltarem
  if (typeof sk96PopGanhou === 'function'){
    sk96PopGanhou = function(){ try { localStorage.removeItem(SK96_AVISO_CHAVE); } catch (_) {} };
  }

  /* ---------------------------------------------------------------- 5) quem estava com uma pronta: a inicial e um aviso (uma vez por aparelho) */
  const V101S_VISTO = 'racha101-semskins-visto';
  try { V101S.avisoPend = !!TP.equipada && localStorage.getItem(V101S_VISTO) !== '1'; } catch (_) {}
  const v101FilaVolta = () => filaPops();
  const filaPopsAntes101 = filaPops;
  filaPops = function(){
    const r = filaPopsAntes101.apply(this, arguments);
    try {
      if (V101S.avisoPend && lobby.aberto && TP.equipada && v101Esconde(TP.equipada)){
        const livre = LB.pop.hidden && !(typeof ONB !== 'undefined' && (ONB.aberto || ONB.aquece)) && !(window.RachaContas82 && RachaContas82.C82 && RachaContas82.C82.popAberto);
        if (livre){ V101S.avisoPend = false; v101PopAviso(); }
        else if (filaPop.indexOf(v101FilaVolta) < 0) filaPop.push(v101FilaVolta);
      }
    } catch (_) {}
    return r;
  };
}
function v101MarcaNeutra(g, px){                         // a tampinha "?" (o lugar de uma pronta: por enquanto, fora)
  const m = px/2, r = px*.4;
  g.save();
  let gr = g.createRadialGradient(m - r*.3, m - r*.35, r*.1, m, m, r);
  gr.addColorStop(0, '#3a2f7a'); gr.addColorStop(1, '#15123a');
  g.fillStyle = gr; g.beginPath(); g.arc(m, m, r, 0, TAU); g.fill();
  g.lineWidth = Math.max(2, px*.035); g.strokeStyle = 'rgba(190,170,255,.75)'; g.setLineDash([px*.06, px*.045]);
  g.beginPath(); g.arc(m, m, r*.82, 0, TAU); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#efe9ff'; g.font = '800 ' + Math.round(px*.42) + 'px "Barlow Condensed", "Arial Narrow", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('?', m, m + px*.02);
  g.restore();
}
function v101PopAviso(){
  try { localStorage.setItem('racha101-semskins-visto', '1'); } catch (_) {}
  abrePop(c => {
    c.append(nodo('span', 'pop-tag', 'TAMPINHAS'), nodo('h2', null, 'CRIE A SUA TAMPINHA'));
    c.appendChild(nodo('p', 'pop-txt', 'As tampinhas prontas saíram por enquanto. A sua continua guardada; até lá, você joga com a inicial. Monte a sua do seu jeito no CRIAR TAMPINHA: as peças, as cores e o ícone.'));
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('DEPOIS', '', () => { som.clique(); fechaPop(); }),
      botaoPop('CRIAR AGORA', 'amarelo', () => { som.clique(); fechaPop(); try { abreTela('skins', 'cofre'); } catch (_) {} }));
    c.appendChild(a);
  });
}

// pronto: daqui em diante a pronta some (a sua volta a ser a inicial e o desenho é refeito)
V101S.pronto = true;
if (V101S.esconde){
  try { perfil.skin = tpMinha(); } catch (_) {}
  try { if (typeof sk76Refaz === 'function') sk76Refaz(); } catch (_) {}
  try { if (typeof BRASIL !== 'undefined' && BRASIL.tampas && BRASIL.tampas.clear) BRASIL.tampas.clear(); } catch (_) {}
}
window.RachaSemSkins101 = {esconde:() => V101S.esconde, ehPronta:v101EhPronta, quantas:() => { v101EhPronta('T'); return V101S.set ? V101S.set.size : 0; }};
