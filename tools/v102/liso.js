/* ======================================================================================================================
   RACHA v102 · O ONLINE MAIS LISO (tools/v102/liso.js — o cliente; o servidor manda o que ele usa: server/partida/sala.js,
   PartidaSala.entradas e Q.ent / Q.cred no quadro). Um arquivo só, em duas partes:
     1) o núcleo (window.RachaLiso102 no jogo; module.exports no Node): o MESMO código que o simulador do Node roda
        (tests/v102/sim.mjs) — as contas sem nada do jogo;
     2) os ganchos no jogo (só quando este arquivo está colado no script do jogo, depois da v92, da v96 e da v99).
   O pedido: "deixe o jogo mais liso multiplayer" (o servidor num VPS, quem joga no celular pela internet). Medido com dois
   navegadores numa partida de verdade atrás de um 4G de mentira (tests/v102_rede_medidas.py + tests/v92_proxy.cjs: 50–80 ms
   em cada sentido, ±30 ms de oscilação, picos de 150 ms e rajadas) e no simulador, o que mais pesava no desenho:
     A) O TEMPO DO MUNDO PREVISTO PULANDO: a previsão da v92 põe o mundo no passo do quadro + os seus comandos ainda não
        confirmados. Quando a internet do celular falha uns passos, o servidor para a sua tampinha e depois paga em passos
        dobrados (a recuperação da v96: o crédito). Os comandos parados contavam como "tempo" — o mundo previsto (a bola e os
        outros) corria na frente no apagão e parava na recuperação. Agora o servidor manda o crédito que vai pagar a cada um
        (Q.cred: com a tampinha esperando ou pagando — PartidaSala.credito102) e a previsão faz como ele: os comandos que vão
        ser pagos na recuperação andam só a sua tampinha (N.passoSolo), sem o mundo andar (no simulador, 3–6% dos quadros
        pulavam o tempo; agora 0,4–1%; no navegador, a metade).
     B) OS OUTROS ADIVINHADOS PELA VELOCIDADE: a previsão andava cada um dos outros na direção da velocidade do último quadro
        — parado no quadro = parado na previsão. No apagão DELE o servidor para a tampinha dele por uns passos e depois corre o
        dobro: na sua tela ele parava e disparava. Agora o servidor manda a direção que cada um QUER (a do passo, ou a do
        último comando dele quando está parado esperando) e as que estão na fila dele (os próximos passos): a previsão anda
        cada um com o que ele de fato apertou, passo a passo, e só depois disso repete a última direção conhecida.
   A física, o núcleo, o rollback/replay da v92 e o desenho liso da v96 (as molas) são os mesmos. Sala de servidor antigo (sem
   Q.ent/Q.cred): tudo como antes. RACHA_CONFIG.rede102 = false desliga (para comparar nas medidas).
   ====================================================================================================================== */
(function (raiz, fabrica) {
  const m = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = m;
  if (raiz) raiz.RachaLiso102 = m;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';
  const SETOR = Math.PI / 32;
  // o setor (0..63, 0 = para a direita, 16 = para baixo) → [mx, my]; -1 (ou estranho) → parado
  function direcao(k) {
    if (!Number.isInteger(k) || k < 0 || k > 63) return [0, 0];
    return [Math.cos(k * SETOR), Math.sin(k * SETOR)];
  }
  // o Q.ent do quadro → por jogador: [[mx, my] que ele quer agora, [mx, my] do passo seguinte, ...] (o seu fica de fora: null)
  function entradas(ent, slot) {
    if (!Array.isArray(ent)) return null;
    return ent.map((v, i) => (i === slot || !Array.isArray(v) || !v.length) ? null : v.slice(0, 12).map(direcao));
  }
  // a direção do jogador i no passo k depois do quadro (k = 0: o passo do quadro): a da fila do servidor (o que ele já apertou
  // e vai valer nesse passo); depois da fila, o palpite com a última conhecida. q (opcional): a tampinha dele no mundo da
  // previsão, vmax: a corrida — no palpite, se ele está correndo e a última direção fica a menos de ~20° da velocidade dele, segue
  // a velocidade (o dedo no analógico oscila entre dois setores vizinhos: repetir o último setor por vários passos entortava a
  // previsão para um lado e o quadro seguinte desentortava — o tranco); parada, arrancada e curva de verdade seguem o comando.
  const COS_RETO = Math.cos(20 * Math.PI / 180);
  function noPasso(F, i, k, q, vmax) {
    const l = F && F[i]; if (!l) return null;
    if (k < l.length) return l[Math.max(0, k)];
    const d = l[l.length - 1];
    if (!q || !(vmax > 0) || (!d[0] && !d[1])) return d;
    const v = Math.hypot(q.vx, q.vy);
    if (v > 0.5 * vmax && (q.vx * d[0] + q.vy * d[1]) / v >= COS_RETO) return [q.vx / v, q.vy / v];
    return d;
  }
  // o SEU CRÉDITO (Q.cred[slot]: os passos que a sua tampinha vai receber na recuperação da fila do servidor — os que ela ficou
  // parada lá esperando comando no seu apagão; o servidor só manda o que vai pagar: com ela esperando ou pagando, não a sobra
  // que a fila no colchão não paga — PartidaSala.credito102). O servidor paga cada um como um passo só da tampinha
  // (N.passoSolo), sem o mundo andar: `solo` dos comandos ainda não confirmados vão ser pagos assim. Na previsão eles andam só a
  // sua tampinha, e o mundo previsto (a bola e os outros) não corre na frente com o seu apagão (nem para depois dele, na recuperação).
  // (O crédito dos OUTROS fica de fora de propósito: pôr a tampinha deles na frente de uma vez atravessa a bola que ele está
  //  conduzindo — medido no simulador, piora; para eles basta a direção que eles querem, que o servidor manda no Q.ent.)
  function solo(cred, slot, pend) {
    if (!Array.isArray(cred)) return 0;
    return Math.max(0, Math.min(30, cred[slot] | 0, pend | 0));
  }
  // qual dos `n` comandos refeitos é um passo só da tampinha: os `s` espalhados por igual, o primeiro deles logo no começo (o
  // servidor paga um por passo, antes do comando do passo; todos juntos no começo faziam a tampinha atravessar a bola que ela
  // conduz — e a batida seguinte "chutava" a bola na previsão)
  function ehSolo(i, s, n) { return s > 0 && n > 0 && Math.ceil((i + 1) * s / n - 1e-9) > Math.ceil(i * s / n - 1e-9); }
  return { VERSAO: 'v102', direcao, entradas, noPasso, solo, ehSolo };
});

/* ---------------------------------------------------------------- 2) os ganchos no jogo (a previsão da v92, por fora) */
if (typeof window !== 'undefined' && typeof v92Base === 'function' && typeof v92PrevPasso === 'function' && typeof V92N === 'object' && window.RachaLiso102) (function () {
  const L = window.RachaLiso102;
  const LIGADO = !(window.RACHA_CONFIG && window.RACHA_CONFIG.rede102 === false);
  const E = { fut: null, base: 0, solo: 0, n: 0, i: 0, quadros: 0, comEnt: 0, comCred: 0, soloFeitos: 0, erro: null, ultCmd: 0, semCreditoAte: 0, travadas: 0, credVisto: [] };
  // (quando NÓS não mandamos comando — o começo da partida, a contagem, o replay do gol, o celular que TRAVA ou o app em segundo
  //  plano — o servidor guarda crédito por passos que nunca vão chegar: ele só é pago se a fila passar do colchão, e acaba
  //  sozinho em 1,2 s. Num buraco nosso maior que o que um quadro alcança (8 passos: 133 ms; o primeiro comando da partida
  //  também conta), o crédito fica de fora por 2 s. Medido: sem isso a previsão andava só a tampinha no começo da partida e
  //  errava o PASSE + CHUTE e a carga do super nos testes de 150 ms)
  const GUARDA_MS = 140, GUARDA_DURA = 2000;
  const cmdAntes = typeof v92Comando === 'function' ? v92Comando : null;
  if (cmdAntes) v92Comando = function () {
    const t = performance.now();
    if (!E.ultCmd || t - E.ultCmd > GUARDA_MS) { E.semCreditoAte = t + GUARDA_DURA; if (E.ultCmd) E.travadas++; }
    E.ultCmd = t;
    return cmdAntes.apply(this, arguments);
  };
  const falhou = e => { E.fut = null; E.solo = 0; E.erro = String(e && e.stack || e); try { console.error('v102 · o online liso parou (fica o de antes):', e); } catch (_) {} };

  // o quadro do servidor (o v92Base roda no começo do rollback, logo antes de refazer os seus comandos não confirmados)
  const baseAntes = v92Base;
  v92Base = function (s) {
    const r = baseAntes.apply(this, arguments);
    E.fut = null; E.solo = 0; E.n = V92N.pend.length; E.i = 0; E.base = s && s.tick | 0; E.quadros++;
    if (!LIGADO || !s) return r;
    try {
      if (Array.isArray(s.ent)) { E.fut = L.entradas(s.ent, V92N.slot); E.comEnt++; }
      if (Array.isArray(s.cred)) {
        const trava = performance.now() < E.semCreditoAte;
        if (!trava) { E.solo = L.solo(s.cred, V92N.slot, V92N.pend.length); E.comCred++; }
        E.credVisto.push([Math.round(performance.now()), s.tick | 0, s.cred[V92N.slot] | 0, V92N.pend.length, E.solo, trava ? 1 : 0]); if (E.credVisto.length > 40) E.credVisto.shift();
      }
    } catch (e) { falhou(e); }
    return r;
  };

  // cada passo da previsão: os comandos que o servidor vai pagar na recuperação andam só a sua tampinha (o mundo não anda),
  // espalhados entre os refeitos (L.ehSolo); nos outros passos, cada um dos outros anda com a direção dele (a da fila do
  // servidor, depois a última conhecida)
  const passoAntes = v92PrevPasso;
  v92PrevPasso = function (cmd, efeitos) {
    const M = V92N.M;
    const i = efeitos ? -1 : E.i++;
    if (LIGADO && M && i >= 0 && L.ehSolo(i, E.solo, E.n) && (M.estado === 'saida' || M.estado === 'jogo')) {   // (o servidor só paga com a bola rolando)
      try {
        E.soloFeitos++;
        const C = V92N.C, eu = M.jog[V92N.slot];
        if (eu) {
          V92_NUC.botaoComando(V92N.bt, cmd, C);         // (como o servidor na recuperação: o botão anda; o chute fica para o passo de verdade)
          if (M.cr && eu.cr && typeof CR99_N === 'object') { CR99_N.crComando(eu.cr, cmd, M); CR99_N.crTick(M, C, eu, eu.cr, cmd.su === 1, true, () => false); }
          V92_NUC.passoSolo(M, C, eu, cmd);
        }
        return;
      } catch (e) { falhou(e); }
    }
    const F = E.fut;
    if (LIGADO && F && M) {
      try {
        const k = M.tick - E.base + 1, vmax = V92N.C ? V92N.C.VEL_JOG : 0;   // (k = 1: o primeiro passo depois do quadro)
        for (let i = 0; i < M.jog.length; i++) {
          if (i === V92N.slot) continue;
          const q = M.jog[i], d = L.noPasso(F, i, k, q, vmax); if (!d) continue;
          q.mx = d[0]; q.my = d[1];
        }
      } catch (e) { falhou(e); }
    }
    return passoAntes.apply(this, arguments);
  };

  const beginAntes = net49Begin;
  net49Begin = function () { E.fut = null; E.solo = 0; E.base = 0; E.ultCmd = 0; E.semCreditoAte = 0; return beginAntes.apply(this, arguments); };
  const stopAntes = x49NetStop;
  x49NetStop = function () { E.fut = null; E.solo = 0; return stopAntes.apply(this, arguments); };

  window.RachaRede102 = {
    ativo: () => LIGADO,
    estado: () => ({ ativo: LIGADO, quadros: E.quadros, comEnt: E.comEnt, comCred: E.comCred, soloFeitos: E.soloFeitos, travadas: E.travadas, erro: E.erro,
      credVisto: E.credVisto.slice(),                     // (os últimos quadros com crédito: [ms, passo, o seu crédito, comandos sem confirmar, passos só da tampinha, trava])
      v96: typeof V96R !== 'undefined' ? Object.assign({}, V96R.medidas) : null }),
  };
})();
