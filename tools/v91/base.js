/* ======================================================================================================================
   RACHA v91 · O VISUAL DA IMAGEM DE REFERÊNCIA (o pedido: "use a imagem enviada como referência principal e recrie o visual
   do meu jogo nesse mesmo estilo", com a tela inicial, o perfil, o cofre, a loja, o ranking, as salas, os eventos, o passe,
   os amigos, o clube, o treino, o chat, os banners de perfil e as patentes no mesmo padrão).
   Qual implementação valia: a tela inicial e as telas da v90 (tools/v90/*.js + v90.css, por cima da v88, da v77 e da v71).
   A v91 embrulha, sem apagar nada e sem mexer em partida, física, rede, conta, moedas ou gemas:
   · base.js (este): os ícones novos (um sprite SVG só, tools/v91/icones.svg, colado pelo build) e as ajudas;
   · patentes.js: as 8 insígnias novas (o rqInsignia) e a tela das patentes;
   · banners.js: os banners de perfil novos (os desenhos do catálogo v88 e o banner do perfil);
   · inicio.js: a tela inicial (o fundo da imagem, a faixa azul, os botões, a tampinha em 3D, a fileira de baixo);
   · telas.js: as telas internas (a mesma faixa, os mesmos painéis e botões).
   O visual mora no app/public/game/v91.css. Tudo que é v91 fica atrás da classe .v91 no #lb: sem ela, é a v90 de sempre.
   ====================================================================================================================== */
const V91 = {on:false, cena:null, img:null, faixa:null, E:null, F:typeof V91_FUNDO !== 'undefined' ? V91_FUNDO : null,
  FAIXA:92,                                              // a altura da faixa azul de cima (em unidades do palco)
  molde:{key:'', t:-9, face:null, som:null, refl:null}, pat:null};

/* ---- os ícones: um sprite só no documento; cada ícone é um <svg><use> (os degradês ficam no sprite) ---- */
(function v91Sprite(){
  if (typeof V91_SPRITE !== 'string' || !V91_SPRITE || document.getElementById('v91-sprite')) return;
  const d = document.createElement('div');
  d.id = 'v91-sprite'; d.setAttribute('aria-hidden', 'true');
  d.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none';
  d.innerHTML = V91_SPRITE;
  document.body.insertBefore(d, document.body.firstChild);
})();
const V91_LARGOS = {bilhete:120};
function v91Ic(nome, cls){
  const w = V91_LARGOS[nome] || 100;
  // (só o xlink:href: um href solto faria o <use> parecer um link para quem procura '[href]' — o controle e as janelas)
  return '<svg class="v91-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 ' + w + ' 100" aria-hidden="true" focusable="false"><use xlink:href="#v91i-' + nome + '"/></svg>';
}
function v91IcEl(nome, cls){ const i = document.createElement('i'); i.className = 'v91-ico' + (cls ? ' ' + cls : ''); i.innerHTML = v91Ic(nome); return i; }
// o tema da v91 no documento todo (o login, o painel do chat e as janelas ficam fora do #lb) e o carvão da v71.1 desligado:
// as telas das salas, do clube, da comunidade e do editor voltam ao azul-marinho de quando foram desenhadas (sala.css,
// tampa.css, v70.css), que é o da v91 — o v91.css só põe o contorno e o brilho por cima
(function(){
  if (!V91.F) return;
  try {
    document.documentElement.classList.add('v91');
    if (V91.F.telas) document.documentElement.style.setProperty('--v91-fundo-telas', 'url("' + V91.F.telas + '")');
    document.documentElement.style.setProperty('--v91-fundo', 'url("' + V91.F.src + '")');
    // o letreiro grafitado da v77 (o RACHA com a coroa e o FUTEBOL DE RUA) para a entrada do jogo
    if (typeof V77P !== 'undefined' && V77P.letreiro && V77P.letreiro.src){
      document.documentElement.style.setProperty('--v91-letreiro', 'url("' + V77P.letreiro.src + '")');
      document.documentElement.classList.add('v91-graf');
    }
    for (const l of document.querySelectorAll('link[rel="stylesheet"]')) if (/v71-tema\.css(\?|$)/.test(l.getAttribute('href') || '')) l.disabled = true;
  } catch (e) { console.error('v91 tema', e); }
})();
const V91_MQ = (() => { try { return window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null; } catch (_) { return null; } })();   // (uma vez: o v91Calmo roda a cada quadro)
function v91Calmo(){ try { return LB.raiz.classList.contains('calmo') || document.documentElement.classList.contains('v70-calmo') || !!(V91_MQ && V91_MQ.matches); } catch (_) { return false; } }
function v91Deitado(){ return !!(LB && LB.raiz && !LB.raiz.classList.contains('retrato')); }
// o controle Bluetooth (v88) anda só entre os botões de verdade (nunca dentro de um desenho SVG)
if (typeof v88PadAlvos === 'function'){
  const v88PadAlvosAntes91 = v88PadAlvos;
  v88PadAlvos = function(){ return v88PadAlvosAntes91.apply(this, arguments).filter(o => !(typeof SVGElement !== 'undefined' && o.el instanceof SVGElement)); };
}
