'use strict';
/* =====================================================================================================================
   RACHA v108 · O RITMO DOS COMANDOS DA PARTIDA NUM BALDE DE FICHAS (o teto de comandos de cada jogador nas salas do
   servidor: server/partida/sala.js, sala_mapa.js e rachao.js).

   Até a v107 o teto era uma janela de 1 s com no máximo 120 comandos — e a janela contava também os comandos recusados.
   Num apagão da internet do celular (0,5 a 3 s) o aparelho continua mandando o comando de cada passo (60 por segundo) e o
   TCP segura tudo; quando a internet volta, os comandos do apagão chegam juntos. Depois de um apagão de 1 s ou mais a
   janela enchia com eles e o servidor recusava TODOS os comandos novos do segundo seguinte (e cada recusado ainda contava
   na janela): a tampinha ficava parada no servidor até ~1 s depois que a internet já tinha voltado, com o jogador
   apertando o analógico (medido com o jogo de verdade atrás do 4G de mentira: 0,8 s parada depois de um apagão de 2 s).
   No aparelho isso virava uma correção de ~250 px que deslizava devagar — a "câmera lenta" de uns segundos.

   Agora é um balde de fichas: ele enche POR_S fichas por segundo, até RAJADA; cada comando gasta uma. O jogo manda 60 por
   segundo, então o balde fica sempre cheio, e a rajada de um apagão inteiro passa (o aparelho para de mandar depois de 2 s
   sem notícia do servidor: são até ~120 comandos). Quem manda mais que POR_S por segundo sem parar esvazia o balde e o que
   passar disso é recusado (e anotado como suspeito, no máximo uma linha por segundo — antes era uma por comando). E mandar
   mais não anda mais: o servidor usa um comando por passo e pula os que sobram na fila (os botões e os toques ficam).
   ===================================================================================================================== */
const POR_S = 75;                                     // fichas por segundo (o jogo manda 60: 25% de folga para o relógio do aparelho)
const RAJADA = 150;                                   // o balde cheio: 2,5 s de comandos (a rajada de um apagão)
function novo() { return { n: RAJADA, t: null, recusados: 0, aviso: -1e9 }; }
function garante(b) { return b && typeof b === 'object' && !Array.isArray(b) && Number.isFinite(b.n) ? b : novo(); }
// o comando que chegou agora (ms) passa (true) ou é recusado (false)
function passa(b, agora) {
  if (b.t == null || !(agora >= b.t)) b.t = agora;   // (o primeiro, ou o relógio voltando: não ganha nem perde fichas)
  b.n = Math.min(RAJADA, b.n + (agora - b.t) * POR_S / 1000); b.t = agora;
  if (b.n >= 1) { b.n -= 1; return true; }
  b.recusados++;
  return false;
}
// a linha do suspeito: no máximo uma por segundo por jogador
function avisa(b, agora) { if (agora - b.aviso < 1000) return false; b.aviso = agora; return true; }
function texto(b) { return 'mais de ' + POR_S + ' cmd/s (' + b.recusados + ' recusados)'; }
module.exports = { POR_S, RAJADA, novo, garante, passa, avisa, texto };
