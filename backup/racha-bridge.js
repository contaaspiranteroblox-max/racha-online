/* ============================================================================
   RACHA 2.0 — Ponte jogo ↔ plataforma
   Recebe as chamadas dos ganchos inseridos no jogo (apenas adições — a física
   original está intacta) e repassa os eventos à página-mãe via postMessage.
   Nenhum cálculo do jogo é lido antes da hora, alterado ou refeito aqui.
   ============================================================================ */
(function () {
  'use strict';

  function emit(tipo, dados) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(Object.assign({ racha: tipo }, dados || {}), window.location.origin);
      }
    } catch (_) {}
  }

  window.RACHA_EVT = {
    // A partida começou (bots, casual ou ranqueada)
    inicio: function (d) {
      emit('partida_inicio', {
        modo: String(d.modo || 'futebol'),
        mapa: String(d.mapa || ''),
        nivelBots: String(d.nivelBots || ''),
        tamanho: d.tamanho | 0
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
        duracaoSeg: d.duracaoSeg | 0,
        abandonada: !!d.abandonada,
        online: !!d.online
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
