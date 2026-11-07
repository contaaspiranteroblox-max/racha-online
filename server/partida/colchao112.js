'use strict';
/* =====================================================================================================================
   RACHA v112 · O COLCHÃO DA FILA DE COMANDOS (server/partida/colchao112.js — usado pelo server/partida/sala.js).
   DESLIGADO POR PADRÃO: a fila de sempre. Liga com RACHA_COLCHAO=1 no servidor (ou o.colchao: true na PartidaSala).

   O que acontece com a fila de sempre (medido no simulador do online, tests/v112/sim.mjs, com o motor de verdade e as
   internets de mentira): ela anda SEM folga — a cada meio segundo é cortada até sobrar só o comando do passo. Com a
   oscilação da internet (o Wi-Fi: ±6 ms; o 4G: ±30 ms), a fila fica vazia na hora do passo em 18 a 29% dos passos, e o
   servidor ADIVINHA o comando (o palpite: repetir o último); o comando de verdade, quando chega, é jogado fora. Quase sempre
   o palpite acerta (quem corre segura a direção), mas na virada a "verdade" do servidor fica com a virada atrasada, e com o
   4G a tampinha para e depois corre o dobro (a recuperação da v96): 36 a 64 paradas por minuto na verdade de cada um.

   Com o colchão, cada jogador tem uma folga do tamanho da oscilação DELE:
     · a chegada de cada comando é medida (o atraso dele em relação ao ritmo de 60 por segundo: chegada − seq × 16,7 ms; o
       mais adiantado da janela é o zero) e o colchão é o atraso de quase todos (o percentil 90 dos últimos 2 s), em passos,
       entre ALVO_MIN e ALVO_MAX (16 a 33 ms);
     · a fila não é mais cortada até o comando do passo: fica o comando do passo + o colchão (só o excesso sai);
     · quando mesmo assim a fila fica vazia, o servidor SEGURA (repete a direção do último comando sem gastar o próximo
       número): o comando atrasado anda no passo seguinte em vez de ser jogado fora. Até SEGURA_MAX passos seguidos; depois,
       a regra de sempre (o palpite e o crédito da recuperação da v96).

   A troca medida (40 sementes × 60 s por caso, a mesma partida com e sem; tests/v112/pareado.mjs e docs/v112/RESULTADOS.md):
     · melhora: os palpites de 18–29% para 1–9% dos passos; as paradas na verdade do servidor −50 a −65% no 4G; a correção
       da sua tampinha (95%) −20 a −45% no 1×1 e no 2×2;
     · piora: o comando leva 16 ms (Wi-Fi) a 34 ms (4G) a mais para valer no servidor, e a previsão precisa adivinhar mais
       longe: a bola na tela fica mais longe da verdade em todos os casos (o erro 95%: +4 a +27 px) e, no 4×4, os outros
       pulam mais.
   Como o pedido é não atrasar os controles nem mexer na disputa da bola, o padrão continua a fila de sempre.
   A física, os passos, os botões e a ordem dos comandos não mudam: muda só QUANDO cada comando entra.
   ===================================================================================================================== */
const PASSO_MS = 1000 / 60;
const JANELA = 120;          // as últimas 120 chegadas (2 s)
const ALVO_MIN = 1;          // passos: a folga mínima (16 ms — o relógio da tela do aparelho já oscila isso)
const ALVO_MAX = 2;          // passos: a maior folga (33 ms) — acima disso o atraso a mais pesa mais que a oscilação (o palpite de sempre cuida)
const ALVO_INICIAL = 1;
const PERCENTIL = 0.9;
const SEGURA_MAX = 4;        // passos seguidos repetindo o último comando (66 ms) antes de parar a tampinha (a regra de sempre)
const FOLGA = 0;             // passos acima do colchão que a fila pode ter sem ser cortada

// o (opcional, só para as medidas): {min, max, pct, inicial, folga} no lugar dos números de cima
function novo(o) {
  const min = o && Number.isInteger(o.min) ? o.min : ALVO_MIN, max = o && Number.isInteger(o.max) ? Math.max(min, o.max) : ALVO_MAX;
  const ini = Math.max(min, Math.min(max, o && Number.isInteger(o.inicial) ? o.inicial : ALVO_INICIAL));
  return { e: new Float64Array(JANELA), n: 0, i: 0, alvo: ini, ini, min, max, pct: o && o.pct > 0 && o.pct < 1 ? o.pct : PERCENTIL,
    folga: o && Number.isInteger(o.folga) ? o.folga : FOLGA, seguras: 0, cortes: 0, medidas: 0 };
}
// a chegada do comando seq agora (ms)
function chegou(k, seq, agora) {
  if (!k || !Number.isFinite(agora) || !(seq > 0)) return;
  k.e[k.i] = agora - seq * PASSO_MS; k.i = (k.i + 1) % JANELA; if (k.n < JANELA) k.n++;
}
// o colchão (passos) a partir das chegadas da janela; sobe na hora e desce no máximo 1 por chamada (meio segundo)
const ORDEM = new Float64Array(JANELA);
function mede(k) {
  if (!k || k.n < 30) return k ? k.alvo : ALVO_INICIAL;
  let min = Infinity;
  for (let j = 0; j < k.n; j++) if (k.e[j] < min) min = k.e[j];
  for (let j = 0; j < k.n; j++) ORDEM[j] = k.e[j] - min;
  const o = ORDEM.subarray(0, k.n).sort();
  const p = o[Math.min(k.n - 1, Math.floor(k.pct * k.n))];
  const quer = Math.max(k.min, Math.min(k.max, Math.ceil(p / PASSO_MS - 0.15)));
  k.alvo = quer >= k.alvo ? quer : k.alvo - 1;
  k.medidas++;
  return k.alvo;
}
function zera(k) { if (k) { k.n = 0; k.i = 0; k.alvo = k.ini; } }
module.exports = { PASSO_MS, JANELA, ALVO_MIN, ALVO_MAX, ALVO_INICIAL, PERCENTIL, SEGURA_MAX, FOLGA, novo, chegou, mede, zera };
