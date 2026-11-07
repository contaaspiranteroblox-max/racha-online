/* =====================================================================================================================
   RACHA v112 · O ONLINE SEM TRAVAR A TELA (tools/v112/tela.js — o build cola por último, depois da v110/botao).

   O que pesava no quadro da partida online (medido: tests/v112_fps_medidas.py, o jogo de verdade no Chromium com a CPU 4×
   mais lenta, como um Android intermediário; 4×4 online: 25 fps, contra 45 no treino com os mesmos 8 jogadores):
     1) o placar: a faixa de baixo (SAÍDA DO SEU TIME, o aviso, a prorrogação) trocava a fonte do desenho e media o texto A
        CADA QUADRO (g.font + g.measureText) — 10% de toda a CPU da partida numa linha. Agora a largura vem do medeTxt (a
        medida guardada que o resto do HUD já usa) — a troca é no build (tools/v112/v112.py);
     2) a página mudava a cada quadro sem mudar nada: a barra da sala (o "SALA X · 45 ms") era escrita até 4 vezes por quadro
        pelos embrulhos da v63, v68, v79 e v103, e os botões dela (CÂMERA, SAIR) e o chat recebiam hidden de novo, igual. Cada
        escrita é uma mudança na página: o observador das janelas (tools/v70/polimento.js) refazia a busca de todas as
        janelas (querySelectorAll) e o navegador recalculava o estilo e o layout — 6,5% da CPU, mais os getBoundingClientRect
        que, com a página suja, forçavam o layout na hora;
     3) a barra da partida (o x49GameUI) rodava DUAS vezes por quadro no online: no fim do quadro da partida e num segundo
        laço de requestAnimationFrame só dela (o da v49).
   Agora:
     · escrever no hidden o valor que ele já tem não faz nada (antes virava uma mudança na página);
     · os textos da barra da sala escritos durante a barra do quadro valem só no fim (a última escrita) e só se mudaram;
     · a barra roda uma vez por quadro (o segundo laço pula o quadro em que ela já rodou);
     · as janelas continuam sincronizadas: o observador da v70 segue igual (abriu ou fechou uma janela = mudou o hidden ou a
       árvore), mais a troca do lobby (aberto/tela) e uma conferência por segundo, para nada depender das escritas repetidas;
     · o endereço do servidor (normalizaServidor: um new URL) fica guardado por texto (a barra do chat perguntava a cada quadro).
   Nada da física, da rede ou do desenho do campo muda.
   ===================================================================================================================== */
const V112T = {
  q: 0,                      // o número do quadro da tela (o frame)
  uiQ: -1, uiT: -1e9,        // o quadro e a hora em que a barra rodou
  adiado: false, adiados: [], // os textos esperando o fim da barra do quadro
  la: null, lt: null, syncT: 0,
  medidas: { uiPuladas: 0, textosIguais: 0, textosEscritos: 0, hiddenIguais: 0, syncs: 0 }
};

/* ---------------------------------------------------------------- 1) o hidden repetido não muda a página */
(function () {
  const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidden');
  if (!d || typeof d.get !== 'function' || typeof d.set !== 'function') return;
  Object.defineProperty(HTMLElement.prototype, 'hidden', {
    configurable: true, enumerable: d.enumerable, get: d.get,
    set(v) {
      const a = d.get.call(this);
      if (a === v || (typeof v !== 'string' && typeof a === 'boolean' && a === !!v)) { V112T.medidas.hiddenIguais++; return; }
      d.set.call(this, v);
    }
  });
})();

/* ---------------------------------------------------------------- 2) o texto da barra da sala: a última escrita do quadro */
function v112TextoAdiado(el) {
  const TC = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  if (!el || !TC || el.v112Adiado) return;
  el.v112Adiado = true; el.v112Pend = null;
  Object.defineProperty(el, 'textContent', {
    configurable: true, enumerable: true,
    get() { return this.v112Pend !== null ? this.v112Pend : TC.get.call(this); },
    set(v) {
      v = v == null ? '' : String(v);
      if (V112T.adiado) { if (this.v112Pend === null) V112T.adiados.push(this); this.v112Pend = v; return; }
      this.v112Pend = null;
      if (TC.get.call(this) === v) { V112T.medidas.textosIguais++; return; }
      TC.set.call(this, v); V112T.medidas.textosEscritos++;
    }
  });
  el.v112Confirma = function () {
    const v = this.v112Pend; if (v === null) return;
    this.v112Pend = null;
    if (TC.get.call(this) === v) { V112T.medidas.textosIguais++; return; }
    TC.set.call(this, v); V112T.medidas.textosEscritos++;
  };
}
function v112Confirma() {
  const l = V112T.adiados; if (!l.length) return;
  for (let i = 0; i < l.length; i++) { try { l[i].v112Confirma(); } catch (_) {} }
  l.length = 0;
}
try { if (typeof X49UI === 'object' && X49UI && X49UI.netText) v112TextoAdiado(X49UI.netText); } catch (_) {}

/* ---------------------------------------------------------------- 3) a barra uma vez por quadro (e as janelas sincronizadas) */
if (typeof frame === 'function') {
  const frameAntes112 = frame;
  frame = function () { V112T.q++; return frameAntes112.apply(this, arguments); };
}
if (typeof x49GameUI === 'function') {
  const x49GameUIAntes112 = x49GameUI;
  x49GameUI = function () {
    const agora = performance.now();
    if (V112T.uiQ === V112T.q && agora - V112T.uiT < 100) { V112T.medidas.uiPuladas++; return; }   // (já rodou neste quadro)
    V112T.uiQ = V112T.q; V112T.uiT = agora;
    V112T.adiado = true;
    try { return x49GameUIAntes112.apply(this, arguments); }
    finally {
      V112T.adiado = false; v112Confirma();
      try { v112SyncJanelas(agora); } catch (_) {}
    }
  };
}
function v112SyncJanelas(agora) {                        // o que antes vinha de carona nas escritas repetidas de cada quadro
  if (typeof v70PedeSync !== 'function' || typeof lobby !== 'object') return;
  if (lobby.aberto !== V112T.la || lobby.tela !== V112T.lt || agora - V112T.syncT > 1000) {
    V112T.la = lobby.aberto; V112T.lt = lobby.tela; V112T.syncT = agora;
    V112T.medidas.syncs++; v70PedeSync();
  }
}

/* ---------------------------------------------------------------- 4) o endereço do servidor guardado por texto */
if (typeof normalizaServidor === 'function') {
  const normalizaServidorAntes112 = normalizaServidor, V112NS = new Map();
  normalizaServidor = function (txt) {
    if (typeof txt !== 'string') return normalizaServidorAntes112.apply(this, arguments);
    let r = V112NS.get(txt);
    if (r === undefined) { r = normalizaServidorAntes112(txt); if (V112NS.size > 64) V112NS.clear(); V112NS.set(txt, r); }
    return r;
  };
}

window.RachaTela112 = { estado: () => Object.assign({ quadro: V112T.q }, V112T.medidas) };
