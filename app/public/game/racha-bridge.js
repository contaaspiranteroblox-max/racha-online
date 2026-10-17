/* ============================================================================
   RACHA 2.0 — Ponte jogo ↔ plataforma
   Recebe as chamadas dos ganchos inseridos no jogo (apenas adições — a física
   original está intacta) e repassa os eventos à página-mãe via postMessage.
   Nenhum cálculo do jogo é lido antes da hora, alterado ou refeito aqui.
   v70: as mensagens só vão para as origens permitidas da página-mãe: a do próprio jogo (o site que o abriu)
   ou as de window.RACHA_CONFIG.origensPlataforma (config.js), nunca para '*'. O começo e o fim vêm uma vez
   por partida (o jogo controla: tools/v70/online.js); o fim da partida online leva o selo do servidor da turma.
   v82: o começo e o fim dizem se a partida é da RANQUEADA (a patente da conta) e o tamanho do time.
   ============================================================================ */
(function () {
  'use strict';

  function destinos() {
    var c = window.RACHA_CONFIG || {}, l = [];
    if (Array.isArray(c.origensPlataforma)) {
      for (var i = 0; i < c.origensPlataforma.length; i++) {
        var o = c.origensPlataforma[i];
        if (typeof o === 'string' && /^https?:\/\/[^\/\s]+$/.test(o)) l.push(o);
      }
    }
    if (!l.length && /^https?:$/.test(location.protocol)) l.push(window.location.origin);
    return l;
  }

  function emit(tipo, dados) {
    try {
      if (!window.parent || window.parent === window) return;
      var msg = Object.assign({ racha: tipo }, dados || {}), d = destinos();
      for (var i = 0; i < d.length; i++) { try { window.parent.postMessage(msg, d[i]); } catch (_) {} }
    } catch (_) {}
  }

  window.RACHA_EVT = {
    // A partida começou (bots, casual, liga ou sala) — quando a bola rola
    inicio: function (d) {
      emit('partida_inicio', {
        modo: String(d.modo || 'futebol'),
        mapa: String(d.mapa || ''),
        nivelBots: String(d.nivelBots || ''),
        tamanho: d.tamanho | 0,
        online: !!d.online,
        ranqueada: !!d.ranqueada   // v82
      });
    },

    // A partida terminou e foi contabilizada pelo jogo (uma única vez)
    fim: function (d) {
      emit('partida_fim', {
        placarNosso: d.placarNosso | 0,
        placarDeles: d.placarDeles | 0,
        gols: d.gols | 0,
        assistencias: d.assistencias | 0,
        golsGinga: d.golsGinga | 0,
        // v70: a mesma classificação do placar (gol, ponto, cesta ou touchdown conforme o modo)
        modo: String(d.modo || 'futebol'),
        pontos: d.pontos | 0,
        golsContra: d.golsContra | 0,
        duracaoSeg: d.duracaoSeg | 0,
        abandonada: !!d.abandonada,
        online: !!d.online,
        valida: d.valida !== false,
        selo: typeof d.selo === 'string' && d.selo.length < 600 ? d.selo : '',
        ranqueada: !!d.ranqueada,   // v82
        tamanho: d.tamanho | 0
      });
    },

    // Gol de treino ('livre' = treino livre · 'treino' = exercício)
    treino: function (tipo) {
      if (tipo === 'livre' || tipo === 'treino') emit('gol_treino', { origem: tipo });
    }
  };

  window.addEventListener('load', function () {
    emit('ponte_pronta', {});
  });
})();
