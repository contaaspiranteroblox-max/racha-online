/* =====================================================================================================================
   RACHA × RACHÃO · A PONTE DA FÍSICA (app/public/game/rachao/ponte.js · RACHA v97, depois do teste)
   O pedido: "dá pra mesclar, por exemplo, física da bola do Rachão no RACHA, ao contrário também". Os dois jogos são de
   discos vistos de cima, a 60 passos por segundo, mas cada um com as suas medidas (o RACHA em u, 1 u = 19 px; o Rachão em
   px) e o seu jeito de fazer a conta. A ponte fala uma língua só, a do COMPORTAMENTO, medido pelo raio do jogador (R) e
   pelo passo: de que tamanho é a bola perto do jogador, quanto ela pesa no contato, quanto quica no pé e na parede, até
   onde vai um chute, quanto o jogador anda por passo e em quantos passos arranca e para...
   Misturar a BOLA, o JOGADOR ou o CHUTE do outro jogo é: ler o comportamento de sempre do outro e escrever os números
   deste jogo que dão esse comportamento — uma parte de cada vez, sem mudar o comportamento das outras duas (a bola mais
   pesada não deixa o chute mais fraco: a força acompanha). O que um jogo não tem fica de fora (o RACHA não tem a bola no
   alto nem a corrida; o Rachão não tem o PASSE nem o giro da bola no contato).
   O mesmo arquivo roda nas duas páginas: o Rachão carrega ./ponte.js antes da oficina de estádios e o build do RACHA cola
   este arquivo antes da Oficina (window.RachaPonte). Só faz contas: não toca o motor de nenhum dos dois.
   ===================================================================================================================== */
(function (raiz, fabrica) {
  'use strict';
  const P = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = P;
  if (raiz) raiz.RachaPonte = P;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';
  const TPS = 60;
  const PARTES = Object.freeze(['bola', 'jogador', 'chute']);

  /* ---------- o RACHA de sempre: o perfil oficial (PERFIL_V92 do núcleo) e os extras do mapa no Clássico ---------- */
  const RACHA = Object.freeze({ rJog: 2.0, raioChute: 2.5, massaJog: 1.25, velJog: 14.1, forcaPasse: 212.5, forcaChute: 340, rBola: 1.0, massaBola: 10,
    limiteBola: 46.75, fatorBola: 0.99, atritoBola: 0.5, atritoJog: 0.3, quiqueBola: 0, quiqueParede: 0.65, quiqueTrave: 0.6, quiqueRede: 0.15,
    quiqueJogJog: 0.3, quiqueJogParede: 0.65 });
  const RACHA_EXTRA = Object.freeze({ acelJog: 1, freioJog: 1, recuo: 0, giroCurva: 1, massaChute: 1 });
  // os limites do RACHA (os do núcleo e os extras do mapa — o teste confere que são os mesmos de server/partida)
  const LIM_RACHA = Object.freeze({ rBola: [0.5, 1.8], massaBola: [2, 30], massaJog: [0.3, 6], fatorBola: [0.97, 0.998], limiteBola: [20, 90],
    quiqueBola: [0, 0.9], quiqueParede: [0, 1], quiqueTrave: [0, 1], quiqueRede: [0, 0.8], atritoBola: [0, 1], atritoJog: [0, 1], velJog: [7, 24],
    quiqueJogJog: [0, 1], quiqueJogParede: [0, 1], forcaChute: [120, 700], forcaPasse: [80, 500], raioChute: [1.4, 4.2],
    acelJog: [0.02, 1], freioJog: [0.03, 1], recuo: [0, 1], massaChute: [0.5, 2] });
  const FOLGA_CHUTE = 0.5;                              // (o núcleo: o anel do chute passa do corpo pelo menos 0,5 u)
  const PASSE = RACHA.forcaPasse / RACHA.forcaChute;    // (o Rachão não tem PASSE: no RACHA ele fica na proporção de sempre)

  /* ---------- o Rachão de sempre: basePhys (a bola e o jogador do Clássico, o andar do Rachão) ---------- */
  const RACHAO = Object.freeze({ ballDamp: 0.99, ballBounce: 0.5, playerBounce: 0.5, wallBounce: 1, postBounce: 0.5, netBackBounce: 0.1, borderBounce: 0,
    ballR: 10, ballIm: 1, playerR: 15, accel: 0.11, playerDamp: 0.96, sprint: 1.34, kickForce: 5, kickReach: 4, kickAccel: 0.7,
    // os ganchos da oficina de estádios (ausentes = o Rachão de sempre)
    ballMax: 0, ballFootBounce: null, ballWeight: null, andar: 'embalo', moveMax: 0, moveAccel: 1, moveBrake: 1 });
  const IM_JOGADOR = 0.5;                               // (a massa inversa do jogador no Rachão: a bola de massa inversa 1 pesa meio jogador)

  const corta = (v, L) => L ? Math.max(L[0], Math.min(L[1], v)) : v;
  const r4 = v => Math.round(v * 1e4) / 1e4;
  // no embalo do Rachão (soma a arrancada e amortece d a cada passo) o jogador anda a ÷ (1 − d) por passo e perde, até chegar
  // na máxima, d ÷ (1 − d) passos de caminho; na arrancada em linha reta do RACHA (soma a × máxima por passo) a mesma perda
  // sai com a = (1 − d) ÷ (1 + d). Soltou: os dois freiam multiplicando por d.
  const acelDoEmbalo = d => (1 - d) / (1 + d);

  /* ---------- o comportamento (R = o raio do jogador; velocidades em R por passo) ---------- */
  function doRacha(perfil, extra) {
    const p = Object.assign({}, RACHA, perfil || {}), x = Object.assign({}, RACHA_EXTRA, extra || {}), R = p.rJog, uP = TPS * R, pe = p.quiqueBola;
    return {
      bola: { raio: p.rBola / R, peso: p.massaBola / p.massaJog, freio: p.fatorBola, teto: p.limiteBola >= LIM_RACHA.limiteBola[1] - 1e-9 ? Infinity : p.limiteBola / uP,
        pe, parede: Math.max(pe, p.quiqueParede), trave: Math.max(pe, p.quiqueTrave), rede: Math.max(pe, p.quiqueRede), giro: p.atritoBola },
      jogador: { vel: p.velJog / uP, acel: x.acelJog, freio: x.freioJog, corrida: 1, choque: p.quiqueJogJog, muro: p.quiqueJogParede, atrito: p.atritoJog },
      chute: { forca: p.forcaChute * x.massaChute / p.massaBola / uP, passe: p.forcaPasse * x.massaChute / p.massaBola / uP,
        alcance: (Math.max(p.raioChute, R + FOLGA_CHUTE) - R) / R, devagar: 1, recuo: x.recuo }
    };
  }
  function cheioRachao(phys) {                          // (o que o estádio não diz é o do Rachão de sempre)
    const f = Object.assign({}, RACHAO);
    for (const k in phys || {}) if (phys[k] !== undefined) f[k] = phys[k];
    return f;
  }
  function doRachao(phys) {
    const f = cheioRachao(phys), R = f.playerR, bb = f.ballBounce, d = f.playerDamp;
    const pe = f.ballFootBounce != null ? f.ballFootBounce : bb * f.playerBounce;
    const direto = f.andar === 'direto';
    return {
      bola: { raio: f.ballR / R, peso: f.ballWeight != null ? f.ballWeight : IM_JOGADOR / f.ballIm, freio: f.ballDamp, teto: f.ballMax > 0 ? f.ballMax / R : Infinity,
        pe, parede: bb * f.wallBounce, trave: bb * f.postBounce, rede: bb * f.netBackBounce, giro: 0 },
      jogador: direto
        ? { vel: (f.moveMax > 0 ? f.moveMax : f.accel / (1 - d)) / R, acel: f.moveAccel, freio: f.moveBrake, corrida: f.sprint, choque: f.playerBounce * f.playerBounce, muro: f.playerBounce * f.borderBounce, atrito: 0 }
        : { vel: f.accel / (1 - d) / R, acel: acelDoEmbalo(d), freio: 1 - d, corrida: f.sprint, choque: f.playerBounce * f.playerBounce, muro: f.playerBounce * f.borderBounce, atrito: 0 },
      chute: { forca: f.kickForce * f.ballIm / R, passe: f.kickForce * f.ballIm / R * PASSE, alcance: f.kickReach / R, devagar: f.kickAccel, recuo: 0 }
    };
  }
  const ALVOS = { racha: doRacha(RACHA, RACHA_EXTRA), rachao: doRachao({}) };
  const alvo = jogo => ALVOS[jogo];

  /* ---------- escrever no RACHA (perfil e extras resolvidos, inteiros) ---------- */
  // as massas e as forças: a bola pesa `peso` tampinhas no contato e o CHUTE e o PASSE saem com a velocidade pedida, tudo
  // nos limites. Entre as contas que dão certo, a mais perto da de sempre (a bola 10, o multiplicador do chute 1).
  function massas(p, x, peso, ch) {
    const L = LIM_RACHA, uP = TPS * p.rJog, vc = ch.forca * uP, vp = ch.passe * uP;
    const kMin = Math.max(L.forcaChute[0] / vc, L.forcaPasse[0] / vp), kMax = Math.min(L.forcaChute[1] / vc, L.forcaPasse[1] / vp);
    const mbMin = Math.max(L.massaBola[0], peso * L.massaJog[0]), mbMax = Math.min(L.massaBola[1], peso * L.massaJog[1]);
    let melhor = null;
    const prova = mb => {
      if (!(mb >= mbMin - 1e-9 && mb <= mbMax + 1e-9)) return;
      const lo = Math.max(kMin, mb / L.massaChute[1]), hi = Math.min(kMax, mb / L.massaChute[0]);   // (k = massa da bola ÷ multiplicador)
      if (lo > hi + 1e-9) return;
      const k = corta(mb, [lo, hi]), custo = Math.abs(mb - RACHA.massaBola) + 5 * Math.abs(mb / k - 1);
      if (!melhor || custo < melhor.custo - 1e-9) melhor = { mb, k, custo };
    };
    prova(corta(RACHA.massaBola, [mbMin, mbMax]));
    for (let mb = Math.ceil(mbMin * 4) / 4; mb <= mbMax + 1e-9; mb += 0.25) prova(mb);
    if (!melhor) {                                      // (nada cabe: o mais perto dentro dos limites)
      const mb = corta(RACHA.massaBola, [mbMin, Math.max(mbMin, mbMax)]);
      melhor = { mb, k: corta(mb, [Math.min(kMin, kMax), Math.max(kMin, kMax)]) };
    }
    p.massaBola = r4(corta(melhor.mb, L.massaBola)); p.massaJog = r4(corta(melhor.mb / peso, L.massaJog));
    x.massaChute = r4(corta(melhor.mb / melhor.k, L.massaChute));
    p.forcaChute = r4(corta(vc * p.massaBola / x.massaChute, L.forcaChute)); p.forcaPasse = r4(corta(vp * p.massaBola / x.massaChute, L.forcaPasse));
  }
  function noRacha(perfil, extra, parte, a) {
    const p = Object.assign({}, RACHA, perfil || {}), x = Object.assign({}, RACHA_EXTRA, extra || {}), R = p.rJog, uP = TPS * R, L = LIM_RACHA;
    const antes = doRacha(p, x), poe = (o, k, v) => { o[k] = r4(corta(v, L[k])); };
    if (parte === 'bola') {
      poe(p, 'rBola', a.raio * R); poe(p, 'fatorBola', a.freio); poe(p, 'limiteBola', a.teto === Infinity ? L.limiteBola[1] : a.teto * uP);
      poe(p, 'quiqueBola', a.pe); poe(p, 'quiqueParede', a.parede); poe(p, 'quiqueTrave', a.trave); poe(p, 'quiqueRede', a.rede); poe(p, 'atritoBola', a.giro);
      massas(p, x, a.peso, antes.chute);
    } else if (parte === 'jogador') {
      poe(p, 'velJog', a.vel * uP); poe(x, 'acelJog', a.acel); poe(x, 'freioJog', a.freio);
      poe(p, 'quiqueJogJog', a.choque); poe(p, 'quiqueJogParede', a.muro); poe(p, 'atritoJog', a.atrito);
    } else if (parte === 'chute') {
      poe(p, 'raioChute', R * (1 + a.alcance)); poe(x, 'recuo', a.recuo);
      massas(p, x, antes.bola.peso, a);
    }
    return { perfil: p, extra: x };
  }

  /* ---------- escrever no Rachão (a física do estádio; arred(k, v) põe no passo e nos limites do editor) ---------- */
  // O que é de quem no Rachão: a BOLA é o tamanho, o freio, o teto, os quiques e o peso NO CONTATO (ballWeight); o CHUTE é a
  // velocidade que a bola ganha (kickForce × ballIm — a leveza da bola também muda o super chute e a cavadinha, por isso ela é
  // do chute), o alcance e o andar mais devagar com o chute armado. Cada parte guarda o comportamento das outras: o chute que
  // muda a leveza põe o peso no contato à parte; o jogador que muda o empurrão põe o quique no pé à parte.
  function noRachao(phys, parte, a, arred) {
    const ar = arred || ((k, v) => v), f = cheioRachao(phys), R = f.playerR, antes = doRachao(f);
    const poe = (k, v) => { f[k] = v == null ? null : ar(k, v); };
    const igual = (k, x, y) => Math.abs(ar(k, x) - ar(k, y)) < 1e-9;      // (no passo do controle: o que o editor grava)
    const pePreso = pe => { poe('ballFootBounce', igual('ballFootBounce', pe, f.ballBounce * f.playerBounce) ? null : pe); };
    const pesoPreso = peso => { poe('ballWeight', igual('ballWeight', peso, IM_JOGADOR / f.ballIm) ? null : peso); };
    if (parte === 'bola') {
      poe('ballR', a.raio * R); poe('ballDamp', a.freio); poe('ballMax', a.teto === Infinity ? 0 : a.teto * R);
      // o quique é o produto (bola × parede, bola × trave...): a bola fica com o maior e as paredes acompanham
      poe('ballBounce', corta(Math.max(a.parede, a.trave), [0.1, 1]));
      poe('wallBounce', a.parede / f.ballBounce); poe('postBounce', corta(a.trave / f.ballBounce, [0.1, 1])); poe('netBackBounce', corta(a.rede / f.ballBounce, [0, 1]));
      pePreso(a.pe); pesoPreso(a.peso);
    } else if (parte === 'jogador') {
      const peAntes = antes.bola.pe, d = 1 - a.freio;
      const embalo = d >= 0.9 && d < 1 && Math.abs(a.acel - acelDoEmbalo(d)) < 0.002;
      if (embalo) { f.andar = 'embalo'; poe('playerDamp', d); poe('accel', a.vel * R * (1 - f.playerDamp)); f.moveMax = 0; f.moveAccel = 1; f.moveBrake = 1; }
      else { f.andar = 'direto'; poe('moveMax', a.vel * R); poe('moveAccel', a.acel); poe('moveBrake', a.freio); }
      poe('sprint', corta(a.corrida, [1, 2])); poe('playerBounce', Math.sqrt(a.choque));
      pePreso(peAntes);                                   // (a bola continua quicando no pé como antes)
    } else if (parte === 'chute') {
      const pesoAntes = antes.bola.peso;
      poe('ballIm', 1); poe('kickForce', a.forca * R / f.ballIm); poe('kickReach', a.alcance * R); poe('kickAccel', a.devagar);
      pesoPreso(pesoAntes);                               // (a bola continua pesando o mesmo no contato)
    }
    return f;
  }

  /* ---------- qual é cada parte agora: a do RACHA, a do Rachão ou ajustada ('') ---------- */
  const perto = (a, b) => a === b || (a == null && b == null) || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 1e-3 + 4e-3 * Math.max(Math.abs(a), Math.abs(b)));
  const iguais = (o1, o2, chaves) => chaves.every(k => perto(o1[k], o2[k]));
  const CHAVES_RACHA = Object.keys(LIM_RACHA);
  function qualRacha(perfil, extra, parte) {
    const ag = Object.assign({}, RACHA, perfil || {}, RACHA_EXTRA, extra || {});
    for (const j of ['racha', 'rachao']) {
      const n = noRacha(perfil, extra, parte, ALVOS[j][parte]);
      if (iguais(Object.assign({}, n.perfil, n.extra), ag, CHAVES_RACHA)) return j;
    }
    return '';
  }
  const CHAVES_RACHAO = Object.keys(RACHAO);
  function qualRachao(phys, parte, arred) {             // (a física já gravada pelo editor: comparada como está)
    const f = cheioRachao(phys);
    for (const j of ['rachao', 'racha']) if (iguais(noRachao(f, parte, ALVOS[j][parte], arred), f, CHAVES_RACHAO)) return j;
    return '';
  }

  /* ---------- as frases (o editor de cada jogo explica o que a mistura faz) ---------- */
  const TEXTOS = {
    rachao: {
      bola: { rachao: 'A bola do Rachão: leve, quica no pé e na parede, sem velocidade máxima.',
        racha: 'A bola do RACHA: metade do tamanho do jogador, pesada no contato (gruda no pé), quica 65% na parede e tem velocidade máxima (até o super chute para nela).' },
      jogador: { rachao: 'O jogador do Rachão: embala aos poucos, desliza ao soltar e corre com o fôlego.',
        racha: 'O jogador do RACHA: arranca e para na hora, sem corrida e um pouco mais devagar.' },
      chute: { rachao: 'O chute do Rachão: a força fixa do Clássico; com o chute armado, o jogador anda mais devagar.',
        racha: 'O chute do RACHA: um pouco mais fraco, e o jogador não perde velocidade com o chute armado.' } },
    racha: {
      bola: { racha: 'A bola de sempre do RACHA.',
        rachao: 'A bola do Rachão: maior, mais leve que a tampinha (quica no pé), quica a metade na parede e não tem velocidade máxima.' },
      jogador: { racha: 'A tampinha de sempre do RACHA: arranca e para na hora.',
        rachao: 'A tampinha do Rachão: mais rápida, mas embala aos poucos e desliza ao soltar.' },
      chute: { racha: 'O chute e o passe de sempre do RACHA.',
        rachao: 'O chute do Rachão: um pouco mais forte (o passe acompanha).' } }
  };
  const texto = (editor, parte, jogo) => jogo ? TEXTOS[editor][parte][jogo] : 'Ajustada nos números.';

  return Object.freeze({ VERSAO: 'v97.1', TPS, PARTES, RACHA, RACHA_EXTRA, LIM_RACHA, RACHAO, IM_JOGADOR, acelDoEmbalo,
    doRacha, doRachao, alvo, noRacha, noRachao, qualRacha, qualRachao, texto });
});
