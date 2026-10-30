/* RACHA v94 · o motor da partida: a física, a máquina de comandos e as regras da bola.
   Feito só a partir de docs/ESPECIFICACAO_MOTOR.md — os "§n" dos comentários apontam a seção da especificação.
   Um arquivo, sem dependências, UMD: module.exports no Node e window.RachaMotor no navegador (o mesmo arquivo roda no
   servidor e no celular).
   Determinismo (§13): dentro de passo() só + − × ÷, Math.sqrt, comparações e Math.min/max/abs/floor/ceil/round; pow só
   no resolve(). O mundo é JSON puro (objetos e vetores simples, sem classes, Map ou funções). */
(function (raiz, fabrica) {
  'use strict';
  const motor = fabrica();
  if (typeof module === 'object' && module && module.exports) module.exports = motor;
  else raiz.RachaMotor = motor;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';

  // ───────────────────────────── §1 unidades e tempo · §3 os corpos ─────────────────────────────
  const VERSAO = '94.0';
  const DT = 1 / 60;            // o passo fixo (s): um comando por passo
  const D = 0.8;                // d = o diâmetro da tampinha (m), a régua das medidas
  const RAIO_JOG = 0.40;        // a tampinha (d/2)
  const RAIO_BOLA = 0.20;       // a bola (0,50 do diâmetro da tampinha)
  const FOLGA_TOQUE = 0.02;     // §12 "encostar": a distância entre os centros ≤ rJ + rB + 0,02 m
  const COS20 = 0.9396926207859084;   // §8 cos 20° (a curva acaba se a batida vira a bola mais que isso); literal: sem trigonometria
  const ANTIGO = -1000000000;   // "nunca" para os registros de passo (um número, para o mundo continuar JSON)

  // ───────────────────────────── §15 os parâmetros: o padrão e as faixas ─────────────────────────────
  // (velocidades em m/s, acelerações em m/s², tempos em s, janelas em passos; os do campo em d, d² ou frações)
  const PADRAO = Object.freeze({
    // §4 o movimento da tampinha
    vMax: 2.95, aAcel: 52, aPara: 60, aVira: 75, zonaMorta: 0.05,
    // §5 a bola rolando
    meiaVida: 1.25, atritoRolamento: 0.12, vParou: 0.03, vMaxBola: 10.4,
    // §6 as batidas
    quiqueParede: 0.60, retParede: 0.90, quiqueTrave: 0.55, retTrave: 0.85, quiqueRede: 0.12, retRede: 0.55,
    limiarQuique: 0.40, quiqueJog: 0.25,
    quiqueConducao: 0.10, retConducao: 0.80, pesoBola: 0.08, impulsoConducao: 0.20,
    // §7 o chute
    folgaChute: 0.11, vPasse: 4.8, vChute: 7.6,
    heranca: 0.30, herancaLado: 0.30, herancaCorrida: 0.40, herancaCombo: 0.60,
    // §9 a máquina de comandos
    janelaToque: 6, intervaloMin: 6, janelaParada: 1, janelaMovel: 3, protecaoParada: 4, protecaoMovel: 0,
    vParada: 0.30, paradaPassos: 6,
    // §8 a CURVA
    cargaTempo: 1.2, armadoTempo: 0.35, vCurva0: 5.6, vCurva1: 2.0, curvaK0: 0.25, curvaK1: 0.95, curvaT0: 0.45, curvaT1: 0.45,
    // §2 o campo
    areaPorJogador: 62, proporcao1: 1.46, proporcaoPasso: 0.07, margemLado: 1.35, margemFundo: 2.4,
    bocaBase: 0.4, bocaFator: 0.30, fundoGol: 1.55, raioTrave: 0.07, circuloBase: 0.8, circuloFator: 0.12,
  });

  const faixa = (a, b) => Object.freeze([a, b]);
  const LIMITES = Object.freeze({
    vMax: faixa(1.5, 4.5), aAcel: faixa(10, 400), aPara: faixa(10, 400), aVira: faixa(10, 400), zonaMorta: faixa(0, 0.3),
    meiaVida: faixa(0.4, 4), atritoRolamento: faixa(0, 1), vParou: faixa(0, 0.2), vMaxBola: faixa(5, 16),
    quiqueParede: faixa(0, 1), retParede: faixa(0, 1), quiqueTrave: faixa(0, 1), retTrave: faixa(0, 1),
    quiqueRede: faixa(0, 1), retRede: faixa(0, 1), limiarQuique: faixa(0, 2), quiqueJog: faixa(0, 1),
    quiqueConducao: faixa(0, 0.6), retConducao: faixa(0, 1), pesoBola: faixa(0, 0.5), impulsoConducao: faixa(0, 1),
    folgaChute: faixa(0, 0.4), vPasse: faixa(2, 9), vChute: faixa(3, 13),
    heranca: faixa(0, 1), herancaLado: faixa(0, 1), herancaCorrida: faixa(0, 1), herancaCombo: faixa(0, 1),
    janelaToque: faixa(0, 15), intervaloMin: faixa(1, 20), janelaParada: faixa(0, 6), janelaMovel: faixa(0, 6),
    protecaoParada: faixa(0, 12), protecaoMovel: faixa(0, 12), vParada: faixa(0, 2), paradaPassos: faixa(0, 12),
    cargaTempo: faixa(0.3, 3), armadoTempo: faixa(0.05, 1), vCurva0: faixa(2, 10), vCurva1: faixa(0, 5),
    curvaK0: faixa(0, 2), curvaK1: faixa(0, 2), curvaT0: faixa(0, 2), curvaT1: faixa(0, 2),
    areaPorJogador: faixa(35, 110), proporcao1: faixa(1, 2), proporcaoPasso: faixa(0, 0.2),
    margemLado: faixa(0.5, 4), margemFundo: faixa(0.5, 4), bocaBase: faixa(0, 3), bocaFator: faixa(0.1, 0.6),
    fundoGol: faixa(0.8, 3), raioTrave: faixa(0.02, 0.3), circuloBase: faixa(0, 3), circuloFator: faixa(0, 0.3),
  });

  // os parâmetros contados em passos (o perfil os arredonda)
  const EM_PASSOS = { janelaToque: 1, intervaloMin: 1, janelaParada: 1, janelaMovel: 1, protecaoParada: 1, protecaoMovel: 1, paradaPassos: 1 };

  // ───────────────────────────── §14 perfil() e resolve() ─────────────────────────────
  // perfil: todas as chaves do PADRAO (as desconhecidas ficam de fora), números, cortados na faixa, inteiros nos passos.
  function perfil(p) {
    const fonte = p && typeof p === 'object' ? p : {};
    const out = {};
    for (const k of Object.keys(PADRAO)) {
      const bruto = fonte[k];
      let v = (typeof bruto === 'number' || (typeof bruto === 'string' && bruto.trim() !== '')) ? Number(bruto) : NaN;
      if (!isFinite(v)) v = PADRAO[k];
      v = Math.min(LIMITES[k][1], Math.max(LIMITES[k][0], v));
      if (EM_PASSOS[k]) v = Math.round(v);
      out[k] = v;
    }
    return out;
  }

  // resolve: o perfil limpo + as constantes por passo. É JSON: o servidor manda este objeto para os aparelhos, que usam
  // os mesmos números sem recalcular (o único pow do motor está aqui).
  function resolve(p) {
    const R = perfil(p);
    R.versao = VERSAO;
    R.DT = DT;
    R.d = D;
    R.rJ = RAIO_JOG;
    R.rB = RAIO_BOLA;
    R.contato = RAIO_JOG + RAIO_BOLA;                 // distância entre os centros no encosto tampinha × bola
    R.alcance = R.contato + R.folgaChute;             // §7 o alcance do chute
    R.toque = R.contato + FOLGA_TOQUE;                // §12 o evento toque
    R.fRol = Math.pow(2, -DT / R.meiaVida);           // §5 o freio proporcional de um passo
    R.freioPasso = R.atritoRolamento * DT;            // §5 o freio constante de um passo (m/s)
    R.dvAcel = R.aAcel * DT;                          // §4 o quanto a velocidade muda num passo
    R.dvPara = R.aPara * DT;
    R.dvVira = R.aVira * DT;
    R.deslocSub = 0.35 * RAIO_BOLA;                   // §6 o maior deslocamento por subpasso
    R.subMin = 2;
    R.subMax = 16;
    R.cargaPasso = DT / R.cargaTempo;                 // §8 a carga que a CURVA ganha por passo segurando
    R.armadoPassos = Math.max(1, Math.round(R.armadoTempo / DT));
    R.cos20 = COS20;
    R.penMin = 1e-9;                                  // abaixo disto (m) não é penetração (só o arredondamento)
    return R;
  }

  // ───────────────────────────── §2 o campo ─────────────────────────────
  // um segmento com o que as batidas precisam já calculado. A normal de reserva (nx, ny) só serve se o centro de um corpo
  // cair exatamente em cima do segmento; ela aponta para o lado do centro do campo (para dentro do campo e do gol).
  function segmento(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, c2 = dx * dx + dy * dy, c = Math.sqrt(c2);
    let nx = c > 0 ? -dy / c : 0, ny = c > 0 ? dx / c : 1;
    if (nx * -(x0 + x1) + ny * -(y0 + y1) < 0) { nx = -nx; ny = -ny; }
    return { x0, y0, x1, y1, dx, dy, inv: c2 > 0 ? 1 / c2 : 0, nx: nx + 0, ny: ny + 0 };
  }

  function campo(n, R) {
    const P = R && typeof R === 'object' && R.rJ ? R : resolve(R);
    const t = Math.min(4, Math.max(1, Math.round(Number(n) || 1)));
    const d = D;
    // o tamanho: A = areaPorJogador · 2n · d²; a proporção comprimento ÷ largura cai um pouco a cada jogador
    const A = P.areaPorJogador * 2 * t * d * d;
    const prop = P.proporcao1 - P.proporcaoPasso * (t - 1);
    const L = Math.sqrt(A * prop), W = A / L;
    const hx = L / 2, hy = W / 2;
    // a boca do gol (cortada para sobrar linha de fundo dos dois lados) e a profundidade
    const B = Math.min(P.bocaBase * d + P.bocaFator * W, W - 2 * d), hb = B / 2;
    const F = P.fundoGol * d, rT = P.raioTrave * d;
    const linhas = { x0: -hx, x1: hx, y0: -hy, y1: hy };
    // a área da tampinha: maior que as linhas (a tampinha pode sair um pouco); o gol fica dentro dela
    const area = { x0: -hx - P.margemFundo * d, x1: hx + P.margemFundo * d, y0: -hy - P.margemLado * d, y1: hy + P.margemLado * d };
    // as traves (círculos): 0 e 1 no gol da esquerda, 2 e 3 no da direita
    const traves = [{ x: -hx, y: -hb, r: rT }, { x: -hx, y: hb, r: rT }, { x: hx, y: -hb, r: rT }, { x: hx, y: hb, r: rT }];
    // as redes (para a bola e para a tampinha): os dois lados e o fundo de cada gol
    const redes = [
      segmento(-hx, -hb, -hx - F, -hb), segmento(-hx, hb, -hx - F, hb), segmento(-hx - F, -hb, -hx - F, hb),
      segmento(hx, -hb, hx + F, -hb), segmento(hx, hb, hx + F, hb), segmento(hx + F, -hb, hx + F, hb),
    ];
    // as paredes da bola: as laterais inteiras e as de fundo em dois pedaços (a boca fica aberta)
    const paredesBola = [
      segmento(-hx, -hy, hx, -hy), segmento(-hx, hy, hx, hy),
      segmento(-hx, -hy, -hx, -hb), segmento(-hx, hb, -hx, hy),
      segmento(hx, -hy, hx, -hb), segmento(hx, hb, hx, hy),
    ];
    const circulo = P.circuloBase * d + P.circuloFator * W;
    return { n: t, L, W, linhas, area, boca: B, fundo: F, traves, redes, paredesBola, circulo, marcas: marcas(L, W, B) };
  }

  // as marcas (só desenho): o motor devolve, o jogo desenha
  function marcas(L, W, B) {
    const d = D, hx = L / 2;
    const larguraGrande = Math.min(B + 0.5 * W, W - d), fundoGrande = 0.21 * L;
    const larguraPequena = B + 1.6 * d, fundoPequena = 0.085 * L;
    const ret = (lado, larg, prof) => ({ x0: lado < 0 ? -hx : hx - prof, x1: lado < 0 ? -hx + prof : hx, y0: -larg / 2, y1: larg / 2 });
    const penaltiX = hx - 0.165 * L, rMeia = 0.11 * L;
    // a meia-lua: o arco de raio 0,11·L em volta da marca, só a parte fora da área grande (cortado pela reta x = corte)
    const dxCorte = fundoGrande - 0.165 * L;
    const meiaY = dxCorte < rMeia ? Math.sqrt(rMeia * rMeia - dxCorte * dxCorte) : 0;
    const meia = lado => ({ x: lado * penaltiX, y: 0, r: rMeia, corteX: lado * (hx - fundoGrande), y0: -meiaY, y1: meiaY });
    return {
      areaGrande: { largura: larguraGrande, profundidade: fundoGrande, esq: ret(-1, larguraGrande, fundoGrande), dir: ret(1, larguraGrande, fundoGrande) },
      areaPequena: { largura: larguraPequena, profundidade: fundoPequena, esq: ret(-1, larguraPequena, fundoPequena), dir: ret(1, larguraPequena, fundoPequena) },
      penalti: [{ x: -penaltiX, y: 0 }, { x: penaltiX, y: 0 }],
      meiaLua: [meia(-1), meia(1)],
      centro: { x: 0, y: 0 },
    };
  }

  // §7 o alcance do chute: a distância máxima entre os centros
  function alcance(R) {
    const rJ = R && R.rJ ? R.rJ : RAIO_JOG, rB = R && R.rB ? R.rB : RAIO_BOLA;
    const folga = R && typeof R.folgaChute === 'number' ? R.folgaChute : PADRAO.folgaChute;
    return rJ + rB + folga;
  }

  // ───────────────────────────── §14 o mundo (JSON puro) ─────────────────────────────
  const corta = (v, a, b) => Math.min(b, Math.max(a, v));
  const numero = (v, padrao) => (typeof v === 'number' && isFinite(v) ? v : padrao);
  const resolvido = R => !!(R && typeof R === 'object' && R.versao === VERSAO && typeof R.fRol === 'number');

  // §9 a máquina de comandos de um jogador (o que ela lembra entre um passo e outro)
  function novaMaquina() {
    return {
      base: 0,            // 0 = ainda não viu o primeiro comando (nele os contadores só viram a base)
      np: -1, nc: -1,     // os últimos contadores de PASSE e CHUTE (−1 = o comando não traz contador)
      bp: 0, bc: 0, bv: 0,   // os botões PASSE, CHUTE e CURVA no último comando (a passagem de solto para apertado)
      passe: null,        // a intenção de PASSE pendente: {criado: passo, segura: 0|1}
      chute: null,        // a intenção de CHUTE pendente
      ultimo: ANTIGO,     // o passo do último chute deste jogador (o intervalo mínimo)
      passeSaiu: ANTIGO,  // o passo do último PASSE que saiu, enquanto um CHUTE ainda pode completar a combinação
      passeParado: 0,     // a bola estava parada (1) ou andando (0) naquele PASSE
      carga: 0,           // §8 a carga da CURVA, de 0 a 1
      armadoAte: ANTIGO,  // §8 o último passo em que o chute de CURVA ainda está armado
      armadoC: 0,         // a carga do chute armado
    };
  }

  function novaBola() {
    // curvaK: o efeito da CURVA (1/s, com o sinal do lado; 0 = sem efeito); curvaFim: o passo em que acaba;
    // parada: o último passo que começou com a bola parada (|v| ≤ vParada), para a janela da combinação
    return { x: 0, y: 0, vx: 0, vy: 0, curvaK: 0, curvaFim: ANTIGO, parada: ANTIGO };
  }

  function mundo(op) {
    const o = op || {};
    const R = resolvido(o.R) ? o.R : resolve(o.R || PADRAO);
    const G = campo(o.n, R);
    const lista = Array.isArray(o.jogadores) && o.jogadores.length ? o.jogadores : [{ time: 0 }, { time: 1 }];
    const W = {
      versao: VERSAO, n: G.n, jogo: o.jogo === 'curva' ? 'curva' : 'futebol', R, G,
      tick: 0,              // quantos passos já rodaram
      estado: 'jogo',       // 'saida' | 'jogo'
      saidaTime: 0,         // o time da última saída de bola
      gol: 0,               // o lado do gol já marcado (−1 | 1) desde a última saída; 0 = nenhum
      bola: novaBola(),
      jog: [],
      obst: [],             // os obstáculos do treino (obstaculos())
    };
    for (const p of lista) {
      const q = p || {};
      W.jog.push({
        time: q.time === 1 || q.time === '1' ? 1 : 0,
        x: 0, y: 0, vx: 0, vy: 0,
        cinematico: !!q.cinematico,
        fatorVel: corta(numero(q.fatorVel, 1), 0.5, 1.5),   // §4 multiplica o vMax deste jogador
        cmd: null,          // o último comando guardado (null = nenhum ainda)
        maq: novaMaquina(),
      });
    }
    formacao(W, 0);
    return W;
  }

  // §10 a formação da saída: s = −1 para o time 0 e +1 para o time 1; i = a ordem dentro do time
  function formacao(W, time) {
    const R = W.R, G = W.G, d = D, a = G.area, cont = [0, 0];
    for (const q of W.jog) {
      const i = cont[q.time]++, s = q.time === 0 ? -1 : 1;
      let x, y;
      if (i === 0) { x = q.time === time ? s * (R.rJ + R.rB + 0.9 * d) : s * (G.circulo + 1.0 * d); y = 0; }
      else { x = s * (3.0 + 2.2 * i) * d; y = (i % 2 === 1 ? 1 : -1) * (1.6 + 1.4 * Math.ceil(i / 2)) * d; }
      q.x = corta(x, a.x0 + R.rJ, a.x1 - R.rJ);
      q.y = corta(y, a.y0 + R.rJ, a.y1 - R.rJ);
      q.vx = 0; q.vy = 0;
    }
  }

  // §10 saida(): a bola no centro e parada, as intenções e a curva zeradas, as tampinhas na formação
  function saida(W, time) {
    const t = time === 1 || time === '1' ? 1 : 0;
    W.estado = 'saida';
    W.saidaTime = t;
    W.gol = 0;
    const b = W.bola;
    b.x = 0; b.y = 0; b.vx = 0; b.vy = 0; b.curvaK = 0; b.curvaFim = ANTIGO; b.parada = ANTIGO;
    for (const q of W.jog) {
      const m = q.maq;
      if (m.passe) m.passe = null;
      if (m.chute) m.chute = null;
      m.passeSaiu = ANTIGO; m.passeParado = 0;
      m.carga = 0; m.armadoAte = ANTIGO; m.armadoC = 0;
    }
    formacao(W, t);
    return W;
  }

  // os teleportes
  function poeJogador(W, j, x, y, vx, vy) {
    const q = W.jog[j];
    if (!q) return;
    q.x = numero(x, q.x); q.y = numero(y, q.y); q.vx = numero(vx, 0); q.vy = numero(vy, 0);
  }
  function poeBola(W, x, y, vx, vy) {
    const b = W.bola;
    b.x = numero(x, b.x); b.y = numero(y, b.y); b.vx = numero(vx, 0); b.vy = numero(vy, 0);
    b.curvaK = 0; b.curvaFim = ANTIGO;      // poeBola zera a curva
    b.parada = ANTIGO;                      // e a lembrança de "bola parada" (o próximo passo olha a velocidade nova)
  }

  // §9 o comando de um jogador para o próximo passo (o último guardado vale até chegar outro)
  const eixo = v => { const n = Number(v); return isFinite(n) ? corta(n, -1, 1) : 0; };
  const contador = v => (typeof v === 'number' && isFinite(v) && v >= 0 ? Math.floor(v) : -1);
  const apertado = v => (v === true || Number(v) > 0 ? 1 : 0);
  function comando(W, j, c) {
    const q = W.jog[j];
    if (!q) return;
    const e = c || {};
    q.cmd = {
      mx: eixo(e.mx), my: eixo(e.my),
      passe: apertado(e.passe), chute: apertado(e.chute), curva: apertado(e.curva),
      np: contador(e.np), nc: contador(e.nc),
      ordem: typeof e.ordem === 'number' && isFinite(e.ordem) ? e.ordem : 0,
    };
  }

  // outra conexão assumiu a tampinha: esquece a máquina e o comando; o próximo comando é a base
  function reiniciaComandos(W, j) {
    const q = W.jog[j];
    if (!q) return;
    q.maq = novaMaquina();
    q.cmd = null;
  }

  // §3 os obstáculos fixos do treino: segmentos com espessura (cápsulas) e círculos; o índice é o da lista
  function obstaculos(W, lista) {
    W.obst = [];
    for (const o of Array.isArray(lista) ? lista : []) {
      const e = o || {};
      const afeta = e.afeta === 'bola' || e.afeta === 'jog' ? e.afeta : 'ambos';
      const comum = { quique: corta(numero(e.quique, 0.5), 0, 1), afeta, naBola: afeta !== 'jog' ? 1 : 0, noJog: afeta !== 'bola' ? 1 : 0 };
      if (e.tipo === 'circulo') {
        W.obst.push(Object.assign({ tipo: 'circulo', x: numero(e.x, 0), y: numero(e.y, 0), r: Math.max(0, numero(e.r, 0)) }, comum));
      } else {
        const s = segmento(numero(e.x0, 0), numero(e.y0, 0), numero(e.x1, 0), numero(e.y1, 0));
        // a espessura e é a largura toda da cápsula: o raio em volta do segmento é e/2
        W.obst.push(Object.assign({ tipo: 'segmento' }, s, { r: Math.max(0, numero(e.e, 0)) / 2 }, comum));
      }
    }
    return W.obst;
  }

  // §13 a cópia profunda (o mundo é só objetos, vetores, números, textos, booleanos e null)
  function clona(v) {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) { const a = new Array(v.length); for (let i = 0; i < v.length; i++) a[i] = clona(v[i]); return a; }
    const o = {};
    for (const k in v) o[k] = clona(v[k]);
    return o;
  }
  function copia(W) { return clona(W); }

  // §13 empacota(): um vetor de números com tudo o que muda; desempacota() volta exatamente ao mesmo estado.
  // (o campo, o perfil, os obstáculos, os times e quem é cinemático são da montagem do mundo: não vão no pacote)
  const PACOTE = 94, CABECA = 13, POR_JOG = 5 + 9 + 16;   // cabeça + bola; por jogador: corpo, comando, máquina
  function empacota(W) {
    const b = W.bola, out = [PACOTE, W.tick, W.estado === 'saida' ? 1 : 0, W.saidaTime, W.gol, W.jog.length,
      b.x, b.y, b.vx, b.vy, b.curvaK, b.curvaFim, b.parada];
    for (const q of W.jog) {
      const c = q.cmd, m = q.maq;
      out.push(q.x, q.y, q.vx, q.vy, q.fatorVel);
      if (c) out.push(1, c.mx, c.my, c.passe, c.chute, c.curva, c.np, c.nc, c.ordem);
      else out.push(0, 0, 0, 0, 0, 0, -1, -1, 0);
      out.push(m.base, m.np, m.nc, m.bp, m.bc, m.bv,
        m.passe ? m.passe.criado : -1, m.passe ? m.passe.segura : 0,
        m.chute ? m.chute.criado : -1, m.chute ? m.chute.segura : 0,
        m.ultimo, m.passeSaiu, m.passeParado, m.carga, m.armadoAte, m.armadoC);
    }
    return out;
  }
  function desempacota(W, arr) {
    if (!arr || arr[0] !== PACOTE || arr[5] !== W.jog.length || arr.length !== CABECA + POR_JOG * W.jog.length)
      throw new Error('RachaMotor.desempacota: o pacote não é deste mundo');
    let k = 1;
    W.tick = arr[k++]; W.estado = arr[k++] === 1 ? 'saida' : 'jogo'; W.saidaTime = arr[k++]; W.gol = arr[k++]; k++;
    const b = W.bola;
    b.x = arr[k++]; b.y = arr[k++]; b.vx = arr[k++]; b.vy = arr[k++]; b.curvaK = arr[k++]; b.curvaFim = arr[k++]; b.parada = arr[k++];
    for (const q of W.jog) {
      q.x = arr[k++]; q.y = arr[k++]; q.vx = arr[k++]; q.vy = arr[k++]; q.fatorVel = arr[k++];
      if (arr[k++] === 1) {
        q.cmd = { mx: arr[k++], my: arr[k++], passe: arr[k++], chute: arr[k++], curva: arr[k++], np: arr[k++], nc: arr[k++], ordem: arr[k++] };
      } else { q.cmd = null; k += 8; }
      const m = q.maq = novaMaquina();
      m.base = arr[k++]; m.np = arr[k++]; m.nc = arr[k++]; m.bp = arr[k++]; m.bc = arr[k++]; m.bv = arr[k++];
      const pc = arr[k++], ps = arr[k++], cc = arr[k++], cs = arr[k++];
      m.passe = pc >= 0 ? { criado: pc, segura: ps } : null;
      m.chute = cc >= 0 ? { criado: cc, segura: cs } : null;
      m.ultimo = arr[k++]; m.passeSaiu = arr[k++]; m.passeParado = arr[k++];
      m.carga = arr[k++]; m.armadoAte = arr[k++]; m.armadoC = arr[k++];
    }
    return W;
  }

  // ───────────────────────────── §4 o movimento da tampinha ─────────────────────────────
  // o alvo é a direção do analógico na velocidade toda (a inclinação não muda a velocidade); a velocidade vai até ele
  // com a aceleração limitada: aPara se o alvo é zero, aVira na inversão (v · alvo < 0), senão aAcel
  function movimento(q, c, R) {
    let ax = 0, ay = 0;
    if (c) {
      const a = Math.sqrt(c.mx * c.mx + c.my * c.my);
      if (a >= R.zonaMorta && a > 0) { const k = R.vMax * q.fatorVel / a; ax = c.mx * k; ay = c.my * k; }
    }
    const dvx = ax - q.vx, dvy = ay - q.vy, dv2 = dvx * dvx + dvy * dvy;
    if (dv2 === 0) return;
    const lim = ax === 0 && ay === 0 ? R.dvPara : (q.vx * ax + q.vy * ay < 0 ? R.dvVira : R.dvAcel);
    if (dv2 <= lim * lim) { q.vx = ax; q.vy = ay; }
    else { const f = lim / Math.sqrt(dv2); q.vx += dvx * f; q.vy += dvy * f; }
  }

  // ───────────────────────────── §6 as batidas: as peças ─────────────────────────────
  // a batida num corpo parado: n = a normal da superfície para o corpo; o corpo sai da penetração pela normal; se está
  // entrando (vn < 0) quica (e = 0 abaixo do limiarQuique) e a parte tangente fica multiplicada pela retenção kt.
  // Devolve a velocidade normal da batida (> 0), 0 se só encostou, para os eventos.
  function bateParado(c, nx, ny, pen, e, kt, R) {
    c.x += nx * pen; c.y += ny * pen;
    const vn = c.vx * nx + c.vy * ny;
    if (vn >= 0) return 0;
    const quique = -vn < R.limiarQuique ? 0 : e;
    const tx = c.vx - vn * nx, ty = c.vy - vn * ny;
    c.vx = -quique * vn * nx + kt * tx;
    c.vy = -quique * vn * ny + kt * ty;
    return -vn;
  }

  // um corpo (raio r) contra um segmento com espessura (raio rs em volta); −1 = não encostou
  function contraSegmento(c, r, s, rs, e, kt, R) {
    const lim = r + rs;
    let t = ((c.x - s.x0) * s.dx + (c.y - s.y0) * s.dy) * s.inv;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    const px = c.x - (s.x0 + t * s.dx), py = c.y - (s.y0 + t * s.dy), d2 = px * px + py * py;
    if (d2 >= lim * lim) return -1;
    const dist = Math.sqrt(d2);
    return dist > 0 ? bateParado(c, px / dist, py / dist, lim - dist, e, kt, R) : bateParado(c, s.nx, s.ny, lim, e, kt, R);
  }

  // um corpo (raio r) contra um círculo parado (cx, cy, rc); −1 = não encostou
  function contraCirculo(c, r, cx, cy, rc, e, kt, R) {
    const lim = r + rc, px = c.x - cx, py = c.y - cy, d2 = px * px + py * py;
    if (d2 >= lim * lim) return -1;
    const dist = Math.sqrt(d2);
    return dist > 0 ? bateParado(c, px / dist, py / dist, lim - dist, e, kt, R) : bateParado(c, 0, cy > 0 ? -1 : 1, lim, e, kt, R);
  }

  // um corpo (raio r) dentro de uma caixa (a área da tampinha); devolve a maior velocidade normal, −1 = não encostou
  function contraCaixa(c, r, a, e, kt, R) {
    let v = -1, w;
    if (c.x < a.x0 + r) { w = bateParado(c, 1, 0, a.x0 + r - c.x, e, kt, R); if (w > v) v = w; }
    else if (c.x > a.x1 - r) { w = bateParado(c, -1, 0, c.x - (a.x1 - r), e, kt, R); if (w > v) v = w; }
    if (c.y < a.y0 + r) { w = bateParado(c, 0, 1, a.y0 + r - c.y, e, kt, R); if (w > v) v = w; }
    else if (c.y > a.y1 - r) { w = bateParado(c, 0, -1, c.y - (a.y1 - r), e, kt, R); if (w > v) v = w; }
    return v;
  }

  // um obstáculo do treino: o quique é o dele; a retenção tangente é 1 (a especificação só dá o quique)
  function contraObstaculo(c, r, o, R) {
    return o.tipo === 'circulo' ? contraCirculo(c, r, o.x, o.y, o.r, o.quique, 1, R) : contraSegmento(c, r, o, o.r, o.quique, 1, R);
  }

  // os eventos de batida: um por material (e um por obstáculo) por passo, com a maior velocidade, na ordem da primeira
  function batida(ctx, tipo, v) {
    const e = ctx.mat[tipo];
    if (e) { if (v > e.v) e.v = v; }
    else { const novo = { t: tipo, v }; ctx.mat[tipo] = novo; ctx.ev.push(novo); }
  }
  function batidaObstaculo(ctx, i, v) {
    const e = ctx.obs[i];
    if (e) { if (v > e.v) e.v = v; }
    else { const novo = { t: 'obstaculo', i, v }; ctx.obs[i] = novo; ctx.ev.push(novo); }
  }

  // §12 o toque (uma vez por jogador por passo) e §10 o fim da saída: o time da saída tocou na bola
  function marcaToque(W, ctx, j) {
    if (ctx.toque[j]) return;
    ctx.toque[j] = 1;
    ctx.ev.push({ t: 'toque', j });
    if (W.estado === 'saida' && W.jog[j].time === W.saidaTime) { W.estado = 'jogo'; ctx.ev.push({ t: 'saida' }); }
  }

  // ───────────────────────────── §6 os subpassos e as batidas, na ordem ─────────────────────────────
  // n = ⌈o maior deslocamento do passo ÷ (0,35 · rB)⌉, entre 2 e 16 (a bola, cada tampinha e a bola relativa a cada uma)
  function contaSubpassos(W) {
    const R = W.R, b = W.bola, J = W.jog;
    let m2 = b.vx * b.vx + b.vy * b.vy;
    for (let j = 0; j < J.length; j++) {
      const q = J[j], v2 = q.vx * q.vx + q.vy * q.vy, rx = b.vx - q.vx, ry = b.vy - q.vy, r2 = rx * rx + ry * ry;
      if (v2 > m2) m2 = v2;
      if (r2 > m2) m2 = r2;
    }
    return Math.min(R.subMax, Math.max(R.subMin, Math.ceil(Math.sqrt(m2) * DT / R.deslocSub)));
  }

  // 1. tampinha × tampinha: massas iguais, cada uma sai metade e o impulso se divide; com uma cinemática, a outra sai
  //    toda e leva o impulso inteiro (uma parede que anda)
  function tampinhas(W) {
    const R = W.R, J = W.jog, lim = 2 * R.rJ, lim2 = lim * lim, e1 = 1 + R.quiqueJog;
    for (let a = 0; a < J.length; a++) {
      const p = J[a];
      for (let c = a + 1; c < J.length; c++) {
        const q = J[c];
        if (p.cinematico && q.cinematico) continue;
        let nx = q.x - p.x, ny = q.y - p.y;
        const d2 = nx * nx + ny * ny;
        if (d2 >= lim2) continue;
        const dist = Math.sqrt(d2);
        if (dist > 0) { nx /= dist; ny /= dist; } else { nx = 1; ny = 0; }
        const pen = lim - dist, vn = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
        if (!p.cinematico && !q.cinematico) {
          const m = pen / 2;
          p.x -= nx * m; p.y -= ny * m; q.x += nx * m; q.y += ny * m;
          if (vn < 0) { const j = -e1 * vn / 2; p.vx -= j * nx; p.vy -= j * ny; q.vx += j * nx; q.vy += j * ny; }
        } else if (p.cinematico) {
          q.x += nx * pen; q.y += ny * pen;
          if (vn < 0) { const j = -e1 * vn; q.vx += j * nx; q.vy += j * ny; }
        } else {
          p.x -= nx * pen; p.y -= ny * pen;
          if (vn < 0) { const j = -e1 * vn; p.vx -= j * nx; p.vy -= j * ny; }
        }
      }
    }
  }

  // §10 a barreira da saída: cada um no seu campo (x·s ≥ 0; se passar, x = 0 e a velocidade para o outro lado zera);
  // o time que não dá a saída fica também fora do círculo central (distância ao centro ≥ Rc + rJ); o que dá a saída pode
  // entrar no círculo, inclusive no outro campo (o centro dentro do círculo)
  function barreira(W, q) {
    const R = W.R, s = q.time === 0 ? -1 : 1, Rc = W.G.circulo;
    if (q.time === W.saidaTime) {
      if (q.x * s >= 0) return;
      const d2 = q.x * q.x + q.y * q.y;
      if (d2 <= Rc * Rc) return;
      const dist = Math.sqrt(d2);
      if (-q.x * s <= dist - Rc) { q.x = 0; if (q.vx * s < 0) q.vx = 0; }      // a reta do meio está mais perto
      else {                                                                    // a borda do círculo está mais perto
        const nx = q.x / dist, ny = q.y / dist, vr = q.vx * nx + q.vy * ny;
        q.x = nx * Rc; q.y = ny * Rc;
        if (vr > 0) { q.vx -= vr * nx; q.vy -= vr * ny; }
      }
      return;
    }
    if (q.x * s < 0) { q.x = 0; if (q.vx * s < 0) q.vx = 0; }
    const lim = Rc + R.rJ, d2 = q.x * q.x + q.y * q.y;
    if (d2 >= lim * lim) return;
    const dist = Math.sqrt(d2);
    const nx = dist > 0 ? q.x / dist : s, ny = dist > 0 ? q.y / dist : 0, vr = q.vx * nx + q.vy * ny;
    q.x = nx * lim; q.y = ny * lim;
    if (vr < 0) { q.vx -= vr * nx; q.vy -= vr * ny; }
  }

  // 2. tampinha × redes, traves, obstáculos, a barreira da saída e, por último, a área da tampinha (o limite duro).
  //    A tampinha não quica (e = 0) e escorrega (kt = 1); nos obstáculos vale o quique de cada um.
  function tampinhaParedes(W, q) {
    const R = W.R, G = W.G, r = R.rJ;
    const pertoGol = Math.abs(q.x) + r + G.traves[0].r >= G.linhas.x1;   // senão não alcança rede nem trave
    if (pertoGol) {
      const redes = G.redes, traves = G.traves;
      for (let i = 0; i < redes.length; i++) contraSegmento(q, r, redes[i], 0, 0, 1, R);
      for (let i = 0; i < traves.length; i++) { const t = traves[i]; contraCirculo(q, r, t.x, t.y, t.r, 0, 1, R); }
    }
    for (let i = 0; i < W.obst.length; i++) if (W.obst[i].noJog) contraObstaculo(q, r, W.obst[i], R);
    if (W.estado === 'saida') barreira(W, q);
    if (contraCaixa(q, r, G.area, 0, 1, R) >= 0 && pertoGol) desencrava(q, r, G, R);
  }

  // A tampinha encravada: a área (o limite duro) a devolveu para dentro de uma rede. Só acontece num lugar onde ela não
  // cabe — com os padrões, o vão atrás do gol (margemFundo − fundoGol = 0,85 d, menor que a tampinha) — e só por
  // teleporte. Ela passa para o outro lado da rede (o único lado em que cabe); nas pontas da rede (os cantos do gol) não:
  // ali o empurrão já tem um lado para escorregar.
  function desencrava(q, r, G, R) {
    for (const s of G.redes) {
      const t = ((q.x - s.x0) * s.dx + (q.y - s.y0) * s.dy) * s.inv;
      if (t <= 0 || t >= 1) continue;
      const cx = s.x0 + t * s.dx, cy = s.y0 + t * s.dy, px = q.x - cx, py = q.y - cy, d2 = px * px + py * py;
      if (d2 >= r * r || r - Math.sqrt(d2) <= R.penMin) continue;
      const dist = Math.sqrt(d2), nx = dist > 0 ? -px / dist : s.nx, ny = dist > 0 ? -py / dist : s.ny;
      q.x = cx + nx * r; q.y = cy + ny * r;
      const vn = q.vx * nx + q.vy * ny;
      if (vn < 0) { q.vx -= vn * nx; q.vy -= vn * ny; }
    }
  }

  // §5 a bola rolando (uma vez por passo, antes dos subpassos): o freio s' = s·fRol − atritoRolamento·DT (se s' ≤ vParou
  // a bola para) e o teto vMaxBola
  function freia(R, s) {
    const s2 = s * R.fRol - R.freioPasso;
    return s2 <= R.vParou ? 0 : (s2 > R.vMaxBola ? R.vMaxBola : s2);
  }
  function bolaRola(W) {
    const b = W.bola, v2 = b.vx * b.vx + b.vy * b.vy;
    if (v2 === 0) return;
    const s = Math.sqrt(v2), s2 = freia(W.R, s);
    if (s2 === 0) { b.vx = 0; b.vy = 0; return; }
    const f = s2 / s;
    b.vx *= f; b.vy *= f;
  }

  // §11 o gol: o centro da bola cruza x = ±(L/2 + rB) (a bola inteira do lado de dentro), com o y do cruzamento na
  // boca; conferido em cada subpasso, do centro de antes para o de agora; um evento só, até a próxima saida()
  function confereGol(W, ctx, x0, y0) {
    if (W.gol !== 0) return;
    const b = W.bola, xg = W.G.linhas.x1 + W.R.rB, hb = W.G.boca / 2;
    let lado, t;
    if (x0 < xg && b.x >= xg) { lado = 1; t = (xg - x0) / (b.x - x0); }
    else if (x0 > -xg && b.x <= -xg) { lado = -1; t = (-xg - x0) / (b.x - x0); }
    else return;
    const y = y0 + t * (b.y - y0);
    if (y < -hb || y > hb) return;
    W.gol = lado;
    ctx.ev.push({ t: 'gol', lado });
  }

  // 4. bola × traves, linhas, redes, a área da tampinha (a rede de segurança) e obstáculos (a trave vem antes da linha:
  //    a ponta da linha fica no centro da trave, e assim a batida ali é sempre de trave)
  function bolaParedes(W, ctx) {
    const R = W.R, G = W.G, b = W.bola, r = R.rB, hx = G.linhas.x1, hy = G.linhas.y1;
    let v;
    const traves = G.traves, paredes = G.paredesBola, redes = G.redes;
    if (Math.abs(b.x) + r + traves[0].r >= hx) {
      for (let i = 0; i < traves.length; i++) {
        const t = traves[i];
        v = contraCirculo(b, r, t.x, t.y, t.r, R.quiqueTrave, R.retTrave, R);
        if (v > 0) batida(ctx, 'trave', v);
      }
    }
    if (Math.abs(b.y) + r >= hy || Math.abs(b.x) + r >= hx) {
      for (let i = 0; i < paredes.length; i++) {
        v = contraSegmento(b, r, paredes[i], 0, R.quiqueParede, R.retParede, R);
        if (v > 0) batida(ctx, 'parede', v);
      }
    }
    if (Math.abs(b.x) + r >= hx) {
      for (let i = 0; i < redes.length; i++) {
        v = contraSegmento(b, r, redes[i], 0, R.quiqueRede, R.retRede, R);
        if (v > 0) batida(ctx, 'rede', v);
      }
    }
    v = contraCaixa(b, r, G.area, R.quiqueParede, R.retParede, R);
    if (v > 0) batida(ctx, 'parede', v);
    for (let i = 0; i < W.obst.length; i++) {
      const o = W.obst[i];
      if (!o.naBola) continue;
      v = contraObstaculo(b, r, o, R);
      if (v > 0) batidaObstaculo(ctx, i, v);
    }
  }

  // 3. tampinha × bola — a tampinha manda: a bola sai toda da penetração e, se está chegando (vr < 0), sai com
  //    vJ + vr'·n + retConducao·(a parte tangente de vB − vJ), vr' = max(−quiqueConducao·vr, impulsoConducao); a tampinha
  //    (não cinemática) perde pesoBola·|vr| na direção da bola. Com mais de uma tampinha encostando no mesmo subpasso,
  //    cada uma é resolvida contra a bola de antes e os empurrões se somam (dois de frente se anulam: a disputa é simétrica);
  //    a velocidade somada não passa da maior que uma delas daria sozinha.
  function tampinhaBola(W, ctx) {
    const R = W.R, b = W.bola, J = W.jog, lim = R.contato, lim2 = lim * lim, toque2 = R.toque * R.toque;
    const bx = b.x, by = b.y, bvx = b.vx, bvy = b.vy;
    let sx = 0, sy = 0, svx = 0, svy = 0, nPos = 0, nVel = 0, v2max = 0, ux = 0, uy = 0;
    for (let j = 0; j < J.length; j++) {
      const q = J[j];
      let nx = bx - q.x, ny = by - q.y;
      const d2 = nx * nx + ny * ny;
      if (d2 > toque2) continue;
      marcaToque(W, ctx, j);
      if (d2 >= lim2) continue;
      const dist = Math.sqrt(d2);
      if (dist > 0) { nx /= dist; ny /= dist; } else { nx = q.time === 0 ? 1 : -1; ny = 0; }
      const pen = lim - dist;
      sx += nx * pen; sy += ny * pen; nPos++;
      const rvx = bvx - q.vx, rvy = bvy - q.vy, vr = rvx * nx + rvy * ny;
      if (vr >= 0) continue;
      const vr2 = Math.max(-R.quiqueConducao * vr, R.impulsoConducao);
      const tx = rvx - vr * nx, ty = rvy - vr * ny;
      ux = q.vx + vr2 * nx + R.retConducao * tx;
      uy = q.vy + vr2 * ny + R.retConducao * ty;
      svx += ux - bvx; svy += uy - bvy; nVel++;
      const u2 = ux * ux + uy * uy;
      if (u2 > v2max) v2max = u2;
      if (!q.cinematico) { const perde = R.pesoBola * -vr; q.vx -= perde * nx; q.vy -= perde * ny; }
    }
    if (nPos === 0) return;
    b.x = bx + sx; b.y = by + sy;
    if (nVel === 1) { b.vx = ux; b.vy = uy; }
    else if (nVel > 1) {
      let vx = bvx + svx, vy = bvy + svy;
      const v2 = vx * vx + vy * vy;
      if (v2 > v2max) { const f = Math.sqrt(v2max / v2); vx *= f; vy *= f; }
      b.vx = vx; b.vy = vy;
    }
  }

  // 5. a bola presa: se ela ainda está dentro de alguma tampinha (entre duas, ou entre a tampinha e uma parede), quem sai
  //    é a tampinha: volta até encostar e perde a velocidade que tinha na direção da bola
  function bolaPresa(W) {
    const R = W.R, b = W.bola, J = W.jog, lim = R.contato, lim2 = lim * lim;
    for (let j = 0; j < J.length; j++) {
      const q = J[j];
      if (q.cinematico) continue;
      let nx = b.x - q.x, ny = b.y - q.y;
      const d2 = nx * nx + ny * ny;
      if (d2 >= lim2) continue;
      const dist = Math.sqrt(d2), pen = lim - dist;
      if (pen <= R.penMin) continue;
      if (dist > 0) { nx /= dist; ny /= dist; } else { nx = q.time === 0 ? 1 : -1; ny = 0; }
      q.x -= nx * pen; q.y -= ny * pen;
      const vn = q.vx * nx + q.vy * ny;
      if (vn > 0) { q.vx -= vn * nx; q.vy -= vn * ny; }
    }
  }

  // ───────────────────────────── §8 o efeito da CURVA na bola ─────────────────────────────
  // a aceleração de lado k·s, perpendicular à velocidade, aplicada em cada subpasso sem trigonometria: a velocidade gira
  // de k·h pela rotação racional (cos, sen) = ((1 − t²), 2t)/(1 + t²), t = k·h/2 — para giros pequenos é v + k·h·(−vy, vx),
  // e a rapidez não muda (o freio cuida dela). Acaba no fim do tempo T ou se a bola fica abaixo de 1 m/s.
  function efeitoCurva(W, h) {
    const b = W.bola, s2 = b.vx * b.vx + b.vy * b.vy;
    if (W.tick >= b.curvaFim || s2 < 1) { b.curvaK = 0; b.curvaFim = ANTIGO; return; }
    const t = b.curvaK * h / 2, t2 = t * t, cos = (1 - t2) / (1 + t2), sen = 2 * t / (1 + t2), vx = b.vx, vy = b.vy;
    b.vx = cos * vx - sen * vy;
    b.vy = sen * vx + cos * vy;
  }
  // e acaba antes se a bola bateu em alguma coisa: a direção mudou mais de 20° nas batidas do subpasso
  function curvaBateu(W, vx0, vy0) {
    const b = W.bola, n0 = vx0 * vx0 + vy0 * vy0, n1 = b.vx * b.vx + b.vy * b.vy;
    if (n0 > 0 && n1 > 0 && vx0 * b.vx + vy0 * b.vy >= W.R.cos20 * Math.sqrt(n0 * n1)) return;
    b.curvaK = 0; b.curvaFim = ANTIGO;
  }

  // um subpasso: todos andam (x += v·h) e as batidas na ordem da §6
  function subpasso(W, h, ctx) {
    const b = W.bola, J = W.jog, x0 = b.x, y0 = b.y;
    if (b.curvaK !== 0) efeitoCurva(W, h);                          // §8
    for (let j = 0; j < J.length; j++) { const q = J[j]; q.x += q.vx * h; q.y += q.vy * h; }
    b.x += b.vx * h; b.y += b.vy * h;
    tampinhas(W);                                                   // 1
    for (let j = 0; j < J.length; j++) if (!J[j].cinematico) tampinhaParedes(W, J[j]);   // 2
    const vx0 = b.vx, vy0 = b.vy;
    tampinhaBola(W, ctx);                                           // 3
    bolaParedes(W, ctx);                                            // 4
    bolaPresa(W);                                                   // 5
    if (b.curvaK !== 0) curvaBateu(W, vx0, vy0);
    confereGol(W, ctx, x0, y0);                                     // 6
  }

  // ───────────────────────────── §7 o chute ─────────────────────────────
  // u = do centro da tampinha para o da bola (centros iguais: (1, 0) no time 0, (−1, 0) no time 1). Ao longo de u:
  // max(0, vL)·h + vBotão + herancaCorrida·max(0, vJ·u); de lado: vP·herancaLado; depois o teto. A bola fica encostada.
  const DIRECAO = { x: 0, y: 0 };   // rascunho: a direção u do último chute (a CURVA usa para escolher o lado)
  function chuta(W, q, vBotao, h) {
    const R = W.R, b = W.bola;
    let ux = b.x - q.x, uy = b.y - q.y;
    const d2 = ux * ux + uy * uy;
    if (d2 > 0) { const dist = Math.sqrt(d2); ux /= dist; uy /= dist; } else { ux = q.time === 0 ? 1 : -1; uy = 0; }
    const vL = b.vx * ux + b.vy * uy, pvx = b.vx - vL * ux, pvy = b.vy - vL * uy;
    const ao = Math.max(0, vL) * h + vBotao + R.herancaCorrida * Math.max(0, q.vx * ux + q.vy * uy);
    let vx = ao * ux + R.herancaLado * pvx, vy = ao * uy + R.herancaLado * pvy;
    const v2 = vx * vx + vy * vy, teto = R.vMaxBola;
    if (v2 > teto * teto) { const f = teto / Math.sqrt(v2); vx *= f; vy *= f; }
    b.vx = vx; b.vy = vy;
    if (d2 < R.contato * R.contato) { b.x = q.x + ux * R.contato; b.y = q.y + uy * R.contato; }
    b.curvaK = 0; b.curvaFim = ANTIGO;      // o chute novo apaga o efeito de uma CURVA anterior
    DIRECAO.x = ux; DIRECAO.y = uy;
    return Math.sqrt(vx * vx + vy * vy);
  }

  // ───────────────────────────── §9 a máquina de comandos (e §8 o botão CURVA) ─────────────────────────────
  function anula(ctx, j, m, botao, motivo) {
    if (!m[botao]) return;
    m[botao] = null;
    ctx.ev.push({ t: 'anulado', j, b: botao, motivo });
  }

  // as ordens possíveis das intenções (fixas, para o passo não criar vetores)
  const PASSE_CHUTE = ['passe', 'chute'], CHUTE_PASSE = ['chute', 'passe'], SO_PASSE = ['passe'], SO_CHUTE = ['chute'], NENHUM = [];

  // a cada passo, antes de tudo andar; no máximo um chute por jogador por passo
  function maquina(W, j, ctx) {
    const R = W.R, q = W.jog[j], c = q.cmd, m = q.maq, tick = W.tick, b = W.bola;
    if (!c) return;
    // 1) os toques novos viram intenções (o contador subiu; sem contador, a passagem de solto para apertado). No primeiro
    //    comando os contadores só viram a base (com o botão apertado, conta como toque).
    let novoP, novoC;
    if (!m.base) { m.base = 1; novoP = c.passe === 1; novoC = c.chute === 1; }
    else {
      novoP = c.np >= 0 && m.np >= 0 ? c.np > m.np : (c.passe === 1 && m.bp === 0);
      novoC = c.nc >= 0 && m.nc >= 0 ? c.nc > m.nc : (c.chute === 1 && m.bc === 0);
    }
    m.np = c.np; m.nc = c.nc; m.bp = c.passe; m.bc = c.chute;
    if (novoP) m.passe = { criado: tick, segura: 0 };     // substitui a anterior do mesmo botão
    if (novoC) m.chute = { criado: tick, segura: 0 };
    if (m.passe) m.passe.segura = c.passe;                // segurando, espera a bola o tempo que for
    if (m.chute) m.chute.segura = c.chute;
    // §8 a CURVA: segurando, a carga sobe de 0 a 1 em cargaTempo; ao soltar, fica armada por armadoTempo
    if (W.jogo === 'curva') {
      if (c.curva === 1) {
        if (m.bv === 0) { m.carga = 0; m.armadoAte = ANTIGO; }
        m.carga = Math.min(1, m.carga + R.cargaPasso);
      } else if (m.bv === 1) {
        m.armadoAte = tick + R.armadoPassos - 1;
        m.armadoC = Math.max(m.carga, R.cargaPasso);
        m.carga = 0;
      }
      m.bv = c.curva;
      if (m.armadoAte !== ANTIGO && tick > m.armadoAte) {
        m.armadoAte = ANTIGO;
        ctx.ev.push({ t: 'anulado', j, b: 'curva', motivo: 'expirou' });
      }
    }
    // 2) o toque antecipado: solta, a intenção vale até janelaToque passos depois do passo em que foi criada, inclusive
    if (m.passe && !m.passe.segura && tick - m.passe.criado > R.janelaToque) anula(ctx, j, m, 'passe', 'expirou');
    if (m.chute && !m.chute.segura && tick - m.chute.criado > R.janelaToque) anula(ctx, j, m, 'chute', 'expirou');
    // 3) o chute: só com a bola no alcance e passados intervaloMin passos do último chute (menos a combinação)
    const dx = b.x - q.x, dy = b.y - q.y;
    const noAlcance = dx * dx + dy * dy <= R.alcance * R.alcance;
    const intervaloOk = tick - m.ultimo >= R.intervaloMin;
    // a CURVA armada (respeita o intervalo e consome as intenções de PASSE e CHUTE pendentes)
    if (m.armadoAte !== ANTIGO && noAlcance && intervaloOk) {
      const carga = m.armadoC, v = chuta(W, q, R.vCurva0 + R.vCurva1 * carga, R.heranca);
      marcaCurva(W, c, carga);
      m.armadoAte = ANTIGO; m.ultimo = tick; m.passeSaiu = ANTIGO;
      ctx.ev.push({ t: 'chute', j, b: 'curva', comb: false, v });
      anula(ctx, j, m, 'passe', 'consumido');
      anula(ctx, j, m, 'chute', 'consumido');
      marcaToque(W, ctx, j);
      return;
    }
    // a ordem: vai primeiro a criada antes; no mesmo passo o CHUTE, a menos que ordem diga que o PASSE veio ≥ 2 ms antes
    let ordem;
    if (m.passe && m.chute) {
      const passeAntes = m.passe.criado < m.chute.criado || (m.passe.criado === m.chute.criado && c.ordem >= 2);
      ordem = passeAntes ? PASSE_CHUTE : CHUTE_PASSE;
    } else ordem = m.passe ? SO_PASSE : (m.chute ? SO_CHUTE : NENHUM);
    for (let i = 0; i < ordem.length; i++) {
      const botao = ordem[i], it = m[botao];
      if (!it) continue;
      let comb = false;
      // a combinação PASSE → CHUTE: um CHUTE criado no passo do PASSE que saiu ou depois, saindo de 1 até janela passos
      // depois dele (a janela e a proteção dependem de a bola estar parada ou andando naquele PASSE); depois da janela e
      // até a proteção, é anulado
      if (botao === 'chute' && m.passeSaiu !== ANTIGO && it.criado >= m.passeSaiu) {
        const k = tick - m.passeSaiu;
        const janela = m.passeParado ? R.janelaParada : R.janelaMovel;
        const protecao = m.passeParado ? R.protecaoParada : R.protecaoMovel;
        if (k >= 1 && k <= janela) comb = true;
        else if (k > janela && k <= protecao) { anula(ctx, j, m, 'chute', 'janela'); continue; }
      }
      if (!noAlcance || !(comb || intervaloOk)) continue;
      const v = chuta(W, q, botao === 'passe' ? R.vPasse : R.vChute, comb ? R.herancaCombo : R.heranca);
      m[botao] = null;
      m.ultimo = tick;
      ctx.ev.push({ t: 'chute', j, b: botao, comb, v });
      // 4) o chute consome a outra intenção — menos o CHUTE que ainda pode completar a combinação com este PASSE
      if (botao === 'passe') {
        m.passeSaiu = tick;
        m.passeParado = tick - b.parada <= R.paradaPassos ? 1 : 0;
        if (m.chute && m.chute.criado < tick) anula(ctx, j, m, 'chute', 'consumido');
      } else {
        m.passeSaiu = ANTIGO;
        anula(ctx, j, m, 'passe', 'consumido');
      }
      marcaToque(W, ctx, j);
      return;
    }
  }

  // §8 o efeito do chute de CURVA: o lado pelo analógico (x = (ux·my − uy·mx)/|m|, se |m| > 0,1 e |x| > 0,26) ou, sem
  // analógico, o lado que leva a bola para o meio do campo; k = lado·(curvaK0 + curvaK1·c) por T = curvaT0 + curvaT1·c
  function marcaCurva(W, c, carga) {
    const R = W.R, b = W.bola, ux = DIRECAO.x, uy = DIRECAO.y;
    const mm = Math.sqrt(c.mx * c.mx + c.my * c.my), x = mm > 0 ? (ux * c.my - uy * c.mx) / mm : 0;
    let lado;
    if (mm > 0.1 && Math.abs(x) > 0.26) lado = x > 0 ? 1 : -1;
    else lado = -b.y * ux < 0 ? -1 : 1;
    b.curvaK = lado * (R.curvaK0 + R.curvaK1 * carga);
    b.curvaFim = W.tick + Math.round((R.curvaT0 + R.curvaT1 * carga) / DT);
  }

  // ───────────────────────────── §14 passo() ─────────────────────────────
  function passo(W) {
    const R = W.R, ev = [], b = W.bola, J = W.jog;
    const ctx = { ev, toque: new Array(J.length).fill(0), mat: { parede: null, trave: null, rede: null }, obs: [] };
    if (b.vx * b.vx + b.vy * b.vy <= R.vParada * R.vParada) b.parada = W.tick;   // §9 a lembrança da bola parada
    for (let j = 0; j < J.length; j++) if (!J[j].cinematico) maquina(W, j, ctx); // §9 os comandos e os chutes
    for (let j = 0; j < J.length; j++) if (!J[j].cinematico) movimento(J[j], J[j].cmd, R);   // §4
    bolaRola(W);                                                                // §5
    const n = contaSubpassos(W), h = DT / n;                                    // §6
    for (let s = 0; s < n; s++) subpasso(W, h, ctx);
    W.tick++;
    return ev;
  }

  // ───────────────────────────── §14 as ajudas dos bots e do treino ─────────────────────────────
  // A bola rolando sozinha, sem batidas, pela mesma conta do passo() (o freio de §5 a cada passo, depois o deslocamento
  // v·DT): o que estas funções dizem é o que o motor faz. Só + − × ÷ e comparações (podem rodar no aparelho).
  const MAX_PASSOS = 60 * 120;   // um teto para as contas (2 min de bola rolando; sem freio constante ela nunca para)
  const perfilResolvido = R => (resolvido(R) ? R : resolve(R));

  // até parar (m)
  function bolaDistancia(R0, v0) {
    const R = perfilResolvido(R0);
    let s = Math.max(0, numero(v0, 0)), dist = 0;
    for (let k = 0; k < MAX_PASSOS && s > 0; k++) { s = freia(R, s); dist += s * DT; }
    return dist;
  }

  // quanto tempo leva para andar dist (s); Infinity se para antes
  function bolaTempo(R0, v0, dist) {
    const R = perfilResolvido(R0), alvo = numero(dist, 0);
    if (alvo <= 0) return 0;
    let s = Math.max(0, numero(v0, 0)), x = 0;
    for (let k = 1; k <= MAX_PASSOS; k++) {
      s = freia(R, s);
      if (s === 0) return Infinity;
      const d = s * DT;
      if (x + d >= alvo) return (k - 1 + (alvo - x) / d) * DT;
      x += d;
    }
    return Infinity;
  }

  // a velocidade de saída para chegar a dist com vFinal: a conta do freio feita de trás para a frente, a partir da
  // chegada (a velocidade de um passo antes é (s + atritoRolamento·DT) / fRol), até juntar a distância
  function bolaVelocidadePara(R0, dist, vFinal) {
    const R = perfilResolvido(R0), alvo = numero(dist, 0);
    let s = Math.max(numero(vFinal, 0), R.vParou + 1e-6);
    if (alvo <= 0) return s;
    let junto = 0;
    for (let k = 0; k < MAX_PASSOS; k++) {
      const d = s * DT, antes = (s + R.freioPasso) / R.fRol;
      if (junto + d >= alvo) return s + (antes - s) * (alvo - junto) / d;
      junto += d;
      s = antes;
    }
    return s;
  }

  // {x, y, vx, vy} depois de n passos
  function bolaPrevisao(R0, x, y, vx, vy, passos) {
    const R = perfilResolvido(R0), n = Math.max(0, Math.floor(numero(passos, 0)));
    let px = numero(x, 0), py = numero(y, 0), qx = numero(vx, 0), qy = numero(vy, 0);
    for (let k = 0; k < n; k++) {
      const v2 = qx * qx + qy * qy;
      if (v2 === 0) break;
      const s = Math.sqrt(v2), s2 = freia(R, s);
      if (s2 === 0) { qx = 0; qy = 0; break; }
      const f = s2 / s;
      qx *= f; qy *= f;
      px += qx * DT; py += qy * DT;
    }
    return { x: px, y: py, vx: qx, vy: qy };
  }

  return {
    VERSAO, DT, PADRAO, LIMITES,
    perfil, resolve, campo, alcance,
    mundo, saida, comando, passo, poeJogador, poeBola, reiniciaComandos, obstaculos, copia, empacota, desempacota,
    bolaDistancia, bolaVelocidadePara, bolaTempo, bolaPrevisao,
  };
});
