'use strict';
/* =====================================================================
   RACHA-NUVEM — o anfitrião na nuvem.
   Para cada sala que começa uma partida, o servidor abre uma instância do
   próprio jogo (jsdom) que entra na sala pelo link de convite e vira a
   anfitriã: a física roda na máquina do servidor, então TODOS os jogadores
   ficam com o mesmo ping baixo — não depende mais do celular de quem criou.
   ===================================================================== */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const PORTA = +(process.env.PORT || 8080);
let HTML = null;

/* canvas sem desenho (a física importa, a imagem não) */
function ctxStub(canvas){
  const grad = { addColorStop(){} };
  return new Proxy({}, {
    get(t, k){
      if (k === 'canvas') return canvas;
      if (k === 'measureText') return () => ({ width: 0 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h });
      if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(Math.max(4, (w|0) * (h|0) * 4)), width: w, height: h });
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (k === 'getLineDash') return () => [];
      if (k === 'isPointInPath' || k === 'isPointInStroke') return () => false;
      if (k === 'getContextAttributes') return () => ({});
      return function(){};
    },
    set(){ return true; }
  });
}

/* devolve { dom, janela } — a instância já entra na sala sozinha pelo ?sala= */
module.exports = function abreNuvem(codigoSala){
  if (!HTML) HTML = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  const dom = new JSDOM(HTML, {
    url: 'http://localhost:' + PORTA + '/?sala=' + encodeURIComponent(codigoSala),
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window){
      window.HTMLCanvasElement.prototype.getContext = function(){ return ctxStub(this); };
      // APIs de canvas que o jsdom não tem e o jogo usa
      window.Path2D = class Path2D { constructor(){} };
      ['moveTo','lineTo','arc','arcTo','bezierCurveTo','quadraticCurveTo','rect','ellipse','closePath','addPath','roundRect']
        .forEach(m => { window.Path2D.prototype[m] = function(){}; });
      if (!window.DOMMatrix) window.DOMMatrix = class { constructor(){ this.isIdentity = true; } };
      if (!window.DOMPoint) window.DOMPoint = class { constructor(x = 0, y = 0){ this.x = x; this.y = y; } };
      try {
        window.localStorage.setItem('mamoball-treino-perfil-v1', JSON.stringify({
          nome: 'NUVEM', skin: 'tampinha',
          avatar: { t: '☁', e: '', cor: '#8ad0ff' },
          st: { concluidas: 0, gols: 0, chutes: 0, dominios: 0, segundos: 0, treinos: 0, partidas: 0, vitorias: 0, assist: 0, semSofrer: 0, golsA: 0, chutesA: 0, golsC: 0, chutesC: 0 }
        }));
      } catch (_) {}
    }
  });
  const w = dom.window;
  w.addEventListener('error', e => {
    const st = e.error && e.error.stack ? e.error.stack.split('\n').slice(0, 4).join(' | ') : e.message;
    console.log('[nuvem %s] erro na página: %s', codigoSala, st);
  });
  return { dom, janela: w };
};
