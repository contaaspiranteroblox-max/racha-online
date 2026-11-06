/* ======================================================================================================================
   RACHA v108 · O ONLINE SEM CÂMERA LENTA (tools/v108/lento.js — o MESMO arquivo no jogo, o build cola, e no simulador do Node,
   tests/v102/sim.mjs com o cliente 'v108'). Duas partes, como o tools/v102/liso.js:
     1) o núcleo (window.RachaLento108 no jogo; module.exports no Node): as contas, sem nada do jogo;
     2) os ganchos no jogo (só quando este arquivo está colado no script do jogo, depois da v96, da v102 e da v105).
   O pedido (05/11/2026): "às vezes o personagem fica lento do nada por uns segundos até clicar no pausar, aí sai o lag" —
   online, no celular e no PC: "o jogo fica lento, tudo em câmera lenta por uns segundos".
   O que acontecia (medido com o jogo de verdade, o servidor das salas e o 4G de mentira — tests/v108_lento_test.py):
     · num apagão da internet de 1 s ou mais, o servidor para a sua tampinha (350 ms sem comando: a regra de sempre), paga
       no máximo 0,5 s depois (a recuperação da v96) e, até a v107, ainda recusava os comandos do segundo seguinte (o ritmo:
       server/partida/ritmo108.js). A previsão tinha andado com tudo isso: quando os quadros do servidor voltam, a correção
       da sua tampinha passa de 250 px (a dos outros, que a previsão empurrou o apagão inteiro, de 500 px);
     · cada quadro corrige um pouco, abaixo do limite do pulo, e a v96 soma tudo no DESLIZE (a mola). A mola tem teto de
       velocidade (0,3 × a corrida + 30 = 110 px/s nas tampinhas): 250 px levam 2,3 s para sumir — a tampinha desenhada fica
       atrás da prevista e anda a 60% da corrida (158 px/s no lugar de 268) por 2 a 3 s; no celular lento (a CPU 5× mais
       devagar), 500 px e 5 s. É a câmera lenta. E a pausa não curava nada: o deslize continua sumindo no mesmo ritmo com o
       menu aberto (medido: a pausa de 80 ms não muda nada); com o menu aberto uns segundos, quando ele fecha já acabou.
   Agora:
     A) o DESLIZE COM PRAZO: o deslize grande (acima de `tam`) ou o que fica acima de `dur` por mais de `t1` s acaba em ~T2 s
        — a mola e a guarda passam a andar o que falta em T2 (a mola continua crítica: sem tranco). A tampinha dos outros só
        passa da guarda de sempre (na tela, 1,5 × a corrida: a regra da v96) com o deslize grande demais (a volta de um
        apagão); a bola fica com a guarda dela (4 × a corrida). O de sempre (a previsão errando um pouco a cada quadro) fica
        igual: os limites estão acima do que o jogo normal tem (o simulador mede);
     B) o PULO PELO SOMADO: o limite do pulo da v96 (14 u a sua, 30 u os outros, 40 u a bola) vale também para o deslize
        somado, não só para a correção de um quadro (vários quadros abaixo do limite somavam 500 px de deslize);
     C) O REPLAY UMA VEZ POR QUADRO DA TELA: o quadro do servidor que chega é guardado e o rollback + replay roda no começo do
        próximo quadro da tela, com o mais novo. Na volta de um apagão chegam ~150 quadros juntos, e cada um refazia até 120
        comandos (no celular, meio segundo travado e as correções de cada um somando no deslize); agora é um replay só. O
        resto do quadro (placar, gol, sons, o desenho dos outros) continua quadro a quadro, na hora.
   A física, a previsão (o mundo, o replay) e as molas da v96 no jogo normal são as mesmas. No servidor (fora deste arquivo):
   o ritmo dos comandos num balde (server/partida/ritmo108.js) e o motor das salas alcançando 12 passos depois de um engasgo
   (server/partida/sala.js, MOTOR_ALCANCA). RACHA_CONFIG.lento108 = false desliga esta parte (para comparar nas medidas).
   ====================================================================================================================== */
(function (raiz, fabrica) {
  const m = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = m;
  if (raiz) raiz.RachaLento108 = m;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';
  // os limites de cada deslize (u): tam = grande demais (acaba já em T2); dur e t1 = acima de dur por mais de t1 s (acaba em
  // T2); acelerado, ele vai até ficar abaixo de fim (o resto, pequeno, some na mola de sempre). A sua tampinha: o deslize de
  // sempre fica abaixo de 2 u e some em menos de 0,3 s; os outros e a bola deslizam mais no jogo normal (a previsão erra mais
  // neles: até ~8 u por ~0,8 s no 4G ruim do simulador), então o limite deles é mais alto
  const LIMITES = Object.freeze({
    P: Object.freeze({ tam: 3, dur: 1.5, t1: 0.3, fim: 1.5 }),
    J: Object.freeze({ tam: 8, dur: 4, t1: 0.8, fim: 2 }),
    B: Object.freeze({ tam: 10, dur: 4, t1: 0.8, fim: 2 }),
  });
  const T2 = 0.12;                                   // s: o deslize acelerado acaba em ~T2 (a mola crítica + a guarda)
  // a mola de um deslize d ({x, y, vx, vy}) neste quadro: devolve {vmax, ganho, livre, acel} para o RachaLiso.anda e marca
  // em d o tempo acima do limite (d.lento108) e se está acelerado (d.acel108: a guarda usa). U: u → px
  function mola(tipo, d, dt, vmax, ganho, livre, U) {
    const L = LIMITES[tipo] || LIMITES.J, n = Math.hypot(d.x, d.y);
    d.tipo108 = tipo;
    d.lento108 = n > U(L.dur) ? (d.lento108 || 0) + (dt > 0 ? dt : 0) : 0;
    const acel = n > U(L.tam) || d.lento108 > L.t1 || (d.acel108 === true && n > U(L.fim));   // (acelerado, vai até o fim)
    d.acel108 = acel; d.grande108 = n > U(L.tam);
    if (!acel) return { vmax, ganho, livre, acel: false };
    let v = vmax; if (ganho) v += ganho * Math.max(0, n - (livre || 0));
    return { vmax: Math.max(v, n / T2), ganho: 0, livre: 0, acel: true };
  }
  // a guarda do desenho (o máximo que a coisa desenhada anda por segundo): com o deslize acelerado, mais o que ele precisa — na
  // sua tampinha. A tampinha dos outros só passa da guarda de sempre (1,5 × a corrida na tela: a regra da v96, que o
  // tests/v96_online_test.py confere) com o deslize grande demais (acima de `tam`: a volta de um apagão); o que demora, menor,
  // some com a guarda de sempre (freia na hora; para alcançar a prevista lá na frente, no máximo 1,5 × a corrida). A bola fica
  // sempre com a guarda dela (4 × a corrida: a bola desenhada nunca dá o pulo que o v96_online conta)
  function guarda(d, vmax) { return d && d.acel108 && (d.tipo108 === 'P' || (d.tipo108 === 'J' && d.grande108)) ? vmax + Math.hypot(d.x, d.y) / T2 : vmax; }
  // B) a correção c ([dx, dy]) entra no deslize d só se ela e o somado ficam abaixo do limite do pulo (px); senão pula
  function cabe(d, c, lim) { return Math.hypot(c[0], c[1]) < lim && Math.hypot(d.x + c[0], d.y + c[1]) < lim; }
  return { VERSAO: 'v108', LIMITES, T2, mola, guarda, cabe };
});

/* ---------------------------------------------------------------- 2) os ganchos no jogo */
// as três chamadas do desenho liso da v96 trocadas pelo tools/v108/lento.py (sem o núcleo, fazem o de antes)
const V108L = { K: null, ligado: () => false, E: { aceleradas: { P: 0, J: 0, B: 0 }, pulos: 0, juntados: 0, replays: 0, maiorP: 0, erro: null, pend: null } };
function v108Anda(tipo, d, dt, tau, vmax, ganho, livre) {         // A) a mola com prazo
  const E = V108L.E;
  if (d && V108L.K && V108L.ligado()) {
    try {
      const r = V108L.K.mola(tipo, d, dt, vmax, ganho, livre, U);
      if (r.acel) { E.aceleradas[tipo] = (E.aceleradas[tipo] | 0) + 1; vmax = r.vmax; ganho = r.ganho; livre = r.livre; }
      if (tipo === 'P') E.maiorP = Math.max(E.maiorP, Math.hypot(d.x, d.y));
    } catch (e) { E.erro = String(e && e.stack || e); }
  } else if (d) { d.acel108 = false; d.lento108 = 0; }
  return V96L.anda(d, dt, tau, vmax, ganho, livre);
}
function v108Guarda(q, ant, d, vmax, dt) {                       // A) a guarda acompanha a mola acelerada
  if (V108L.K && V108L.ligado()) { try { vmax = V108L.K.guarda(d, vmax); } catch (e) { V108L.E.erro = String(e && e.stack || e); } }
  return V96L.guarda(q, ant, d, vmax, dt);
}
function v108Cabe(d, c, lim) {                                    // B) o pulo pelo somado
  if (!V108L.K || !V108L.ligado()) return Math.hypot(c[0], c[1]) < lim;
  const ok = V108L.K.cabe(d, c, lim);
  if (!ok && Math.hypot(c[0], c[1]) < lim) V108L.E.pulos++;
  return ok;
}
if (typeof window !== 'undefined' && typeof V96R === 'object' && typeof v92SnapPrev === 'function' && typeof V92N === 'object' && window.RachaLento108) (function () {
  const E = V108L.E;
  V108L.K = window.RachaLento108;
  V108L.ligado = () => !(window.RACHA_CONFIG && window.RACHA_CONFIG.lento108 === false);   // (dá para desligar com o jogo aberto, para comparar)

  // C) o rollback + replay uma vez por quadro da tela: o v92SnapPrev (o da v96, com os ganchos da v102 dentro) guarda o
  // quadro mais novo; o começo do quadro da tela (o net49RemoteFrame e o net49Draw) refaz com ele. Quem chega junto (no mesmo
  // quadro da tela) só troca o guardado: os "antes" (onde a previsão estava) ficam os do primeiro, que é onde ela ainda está
  // (a previsão só anda no quadro da tela).
  const snapPrevAntes = v92SnapPrev;
  v92SnapPrev = function (s, antesP, antesB, antesJ) {
    if (!V108L.ligado() || E.erro) return snapPrevAntes.apply(this, arguments);
    if (E.pend) { E.pend.s = s; E.juntados++; return; }
    E.pend = { s, antesP, antesB, antesJ };
  };
  function refaz() {
    const p = E.pend; if (!p) return;
    E.pend = null;
    if (!v92RedeAtiva()) return;
    E.replays++;
    try { snapPrevAntes.call(null, p.s, p.antesP, p.antesB, p.antesJ); }
    catch (e) { E.erro = String(e && e.stack || e); try { v92RedeFalhou(e); } catch (_) {} }
  }
  const remoteAntes = net49RemoteFrame;
  net49RemoteFrame = function () { if (E.pend) refaz(); return remoteAntes.apply(this, arguments); };
  const drawAntes = net49Draw;
  net49Draw = function () { if (E.pend) refaz(); return drawAntes.apply(this, arguments); };
  const beginAntes = net49Begin;
  net49Begin = function () { E.pend = null; return beginAntes.apply(this, arguments); };
  const stopAntes = x49NetStop;
  x49NetStop = function () { E.pend = null; return stopAntes.apply(this, arguments); };

  window.RachaLento108Jogo = {
    ativo: () => V108L.ligado(),
    refaz,
    estado: () => ({ ativo: V108L.ligado(), aceleradas: Object.assign({}, E.aceleradas), pulos: E.pulos, juntados: E.juntados, replays: E.replays,
      maiorP: Math.round(E.maiorP), guardado: !!E.pend, erro: E.erro,
      deslize: { P: Math.round(Math.hypot(V96R.P.x, V96R.P.y)), B: Math.round(Math.hypot(V96R.B.x, V96R.B.y)),
        J: Math.round(V96R.J.reduce((m, d) => d ? Math.max(m, Math.hypot(d.x, d.y)) : m, 0)) } }),
    zera: () => { E.aceleradas = { P: 0, J: 0, B: 0 }; E.pulos = 0; E.juntados = 0; E.replays = 0; E.maiorP = 0; },
  };
})();
