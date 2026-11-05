/* =====================================================================================================================
   RACHA v92 · O NÚCLEO DA FÍSICA DAS SALAS — um arquivo só para o servidor e para o aparelho.

   Por que existe: até a v91 a física das salas morava em dois lugares diferentes — o motor do servidor
   (server/partida/sala.js, o "porte fiel") e a previsão do aparelho (net49Predict no racha.html, com 2 subpassos fixos,
   uma cópia da bola que não reagia e paredes diferentes). Cada diferença virava correção (tranco) na tela. Agora o
   servidor (require) e o jogo (o build cola este arquivo no racha.html) rodam EXATAMENTE o mesmo código:
     · as batidas (reflect, hitSeg, hitBox, hitPoint, hitBodies) — as mesmas fórmulas de sempre;
     · o passo da física das salas (velocidade aditiva com teto, bola com freio e teto, subpassos 2–12 com colisão dupla,
       a barreira da saída, o efeito da CURVA, o cruzamento do gol);
     · os botões PASSE/CHUTE (a máquina aperta/segura/solta de sempre + o toque que fica armado por alguns ticks e o
       contador de toques no comando, que não deixa um toque se perder na rede).
   Os números vêm de um PERFIL (em u, as unidades do jogo; 1 u = 19 px). PERFIL_V91 reproduz a v91 exatamente;
   PERFIL_V92 é o padrão novo (os mesmos números de física + o toque armado e a rede do gol segurando a tampinha também
   no servidor, como no jogo offline; desde a v103, o CHUTE uns 6% mais forte: 360, era 340; desde a v105, o JOGO DE
   CORPO: as tampinhas encostadas se seguram em vez de escorregar uma em volta da outra — atritoJogJog).
   O painel de testes da versão experimental troca o perfil; a versão oficial usa o
   padrão e o servidor só aceita perfil de fora com RACHA_EXPERIMENTAL=1.
   Determinístico: nada de Math.random aqui (o servidor e a previsão precisam dar o mesmo resultado).
   ===================================================================================================================== */
(function (raiz, fabrica) {
  'use strict';
  const N = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = N;
  if (raiz) raiz.RachaNucleo = N;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';

  const PX_POR_U = 19;
  const U = v => v * PX_POR_U;
  const TPS = 60;
  const DT = 1 / TPS;

  /* ---------- os perfis (u, u/s, massas e coeficientes) ---------- */
  // v91: os números do jogo (a mecânica clássica da v84 com o chute da v87.1) e o comportamento do servidor da v91.
  const PERFIL_V91 = Object.freeze({
    rJog: 2.0,            // raio do corpo da tampinha (u)
    raioChute: 2.5,       // o anel de chute (u): alcance = raioChute + rBola entre os centros
    massaJog: 1.25,
    velJog: 14.1,         // velocidade máxima da tampinha (u/s)
    forcaPasse: 212.5,    // PASSE: Δv = força ÷ massa da bola (u/s)
    forcaChute: 340,      // CHUTE
    rBola: 1.0,
    massaBola: 10,
    limiteBola: 46.75,    // teto da bola (u/s)
    fatorBola: 0.99,      // a bola guarda isso da velocidade a cada tick (o freio)
    amortAngular: 0.5,    // o giro da bola diminui sozinho
    atritoBola: 0.5,      // atrito da bola (o da tampinha × bola e o da trave × bola saem dele pela média geométrica)
    atritoJog: 0.3,
    atritoTrave: 0.1,
    quiqueBola: 0,        // tampinha × bola (o quique da bola)
    quiqueParede: 0.65,   // bola × linhas
    quiqueTrave: 0.6,     // bola × trave
    quiqueRede: 0.15,     // bola × rede
    quiqueJogJog: 0.3,    // tampinha × tampinha
    atritoJogJog: 0,      // v105: o atrito tampinha × tampinha (o jogo de corpo); 0 = escorrega como até a v104
    viraNaHora: 0,        // v105: 1 = a tampinha vai na hora para onde o analógico aponta (0 = a velocidade aditiva com teto de sempre)
    quiqueJogParede: 0.65,// tampinha × muro da área
    limiarQuique: 1,      // u/s: batida mais lenta que isso não quica
    direcoes: 32,         // setores do analógico (0 = livre)
    bufferToque: 0,       // ticks que um toque fica armado esperando a bola (0 = só o passo seguinte, como até a v91)
    jogRede: 0,           // 1 = a rede e as traves seguram a tampinha também no servidor (o jogo offline sempre segurou)
    cooldownBotao: 0.02,  // s entre trocas de botão
    // o DB (PASSE + CHUTE) POR ESTADOS — experimental (ver "O DB POR ESTADOS" mais abaixo). dbModo 0 = a máquina de sempre
    // (o padrão e a versão oficial: os outros campos db* não valem nada com ele).
    dbModo: 0,
    dbJanelaParada: 1,    // passos depois do PASSE em que um CHUTE novo completa o DB (bola parada, campo aberto)
    dbProtecaoParada: 4,  // passos depois de um chute em que outro chute na mesma bola não sai (0 = só a física decide)
    dbJanelaMovel: 3,     // o mesmo com a bola andando (colado, girando, de lado, normal)
    dbProtecaoMovel: 0,   //   (0 = só a física decide)
    dbVParada: 1.5,       // u/s: até esta velocidade a bola conta como parada
    dbParadaPassos: 6,    // passos: a bola que estava parada até este tanto antes ainda conta (a tampinha chegou empurrando)
    dbMargemParede: 2,    // u: a bola a menos que isto de uma linha, trave ou rede é jogada de parede
    dbParede: 0,          // 0 = na parede só a física decide; 1 = as regras do campo aberto também na parede
    dbOrdem: 1,           // 1 = no mesmo passo, o relógio do toque diz quem veio antes (CHUTE antes: a prioridade é dele)
    dbRelogio: 0,         // 1 = o DB parado decide pelo intervalo entre os dedos medido no aparelho (dbAnulaMs, dbJanelaMs)
    dbAnulaMs: 2,         // ms: o CHUTE até aqui depois do PASSE é anulado (só com dbRelogio)
    dbJanelaMs: 5,        // ms: o CHUTE até aqui completa o DB; depois, a bola parada "já saiu do alcance" (só com dbRelogio)
  });
  // v92: o padrão novo — a física de números é a MESMA; só o toque armado (100 ms) e a rede do gol igual ao offline.
  // v103 (a pedido: "aumentar bem pouco a força do chute e do passe — o chute sem DB é relativamente fraco"): o CHUTE uns 6%
  // mais forte (a bola parada sai a 36 u/s, era 34). O teto da bola não muda (46,75 u/s): o DB (PASSE + CHUTE) continua no
  // teto, então o chute sozinho fica um pouco mais perto dele. O PASSE fica em 212,5: ele decide o DB com a bola rolando (a
  // bola não pode sair do alcance antes do CHUTE do passo seguinte) e qualquer aumento derruba o DB — no laboratório
  // (tests/v92_db/lab.cjs, o cenário "normal"), com o PASSE a 213 a chance cai de 76% para 31%; a 220, para 0%.
  // v105 (a pedido: "quando se encostam para disputar a bola eles deslizam muito"): o JOGO DE CORPO — o atrito entre as
  // tampinhas (0,5) e o contato que já vem encostado segurado antes de andar (contatoJog). Sem ele, duas tampinhas correndo
  // uma contra a outra com um desvio de 0,1 u passavam uma pela outra em 0,4 s, e quem empurrava de lado escorregava em volta
  // do outro (mais de 120° por segundo). Agora: de frente, elas se seguram (o empurra-empurra); empurrando quem está parado
  // até uns 27° da linha dos centros, você leva ele junto; mais de lado que isso, você ainda passa por ele (escorregando mais
  // devagar contra quem segura). A bola, o chute, o DB e o resto da física: os mesmos números.
  // v105 (a pedido: "o analógico está com um mini delay"): a VIRADA NA HORA — com a velocidade aditiva com teto (a de sempre:
  // a direção nova SOMADA à velocidade de antes e cortada no teto), cada virada só chegava na metade do caminho por passo: uma
  // curva de 30° levava uns 6 passos (100 ms) para valer, a de 90° passava uns 80 ms ainda escorregando para o lado de antes
  // e a meia-volta parava um passo inteiro (17 ms) antes de voltar. Agora a tampinha vai na hora para onde o analógico aponta
  // (a velocidade toda, na direção nova), e o analógico tem 64 direções (eram 32: os degraus de 11,25° viram 5,6°).
  const PERFIL_V92 = Object.freeze(Object.assign({}, PERFIL_V91, { bufferToque: 6, jogRede: 1, forcaChute: 360, atritoJogJog: 0.5, viraNaHora: 1, direcoes: 64 }));

  // os limites que o painel e o servidor aceitam (o servidor corta qualquer coisa fora disto)
  const LIMITES = Object.freeze({
    rJog: [1.2, 3.2], raioChute: [1.4, 4.2], massaJog: [0.3, 6], velJog: [7, 24],
    forcaPasse: [80, 500], forcaChute: [120, 700], rBola: [0.5, 1.8], massaBola: [2, 30], limiteBola: [20, 90],
    fatorBola: [0.97, 0.998], amortAngular: [0, 4], atritoBola: [0, 1], atritoJog: [0, 1], atritoTrave: [0, 1],
    quiqueBola: [0, 0.9], quiqueParede: [0, 1], quiqueTrave: [0, 1], quiqueRede: [0, 0.8], quiqueJogJog: [0, 1], atritoJogJog: [0, 1], viraNaHora: [0, 1],
    quiqueJogParede: [0, 1], limiarQuique: [0, 4], direcoes: [0, 64], bufferToque: [0, 15], jogRede: [0, 1],
    cooldownBotao: [0, 0.1],
    dbModo: [0, 1], dbJanelaParada: [0, 6], dbProtecaoParada: [0, 12], dbJanelaMovel: [0, 6], dbProtecaoMovel: [0, 12],
    dbVParada: [0, 20], dbParadaPassos: [0, 12], dbMargemParede: [0, 8], dbParede: [0, 1], dbOrdem: [0, 1], dbRelogio: [0, 1],
    dbAnulaMs: [0, 10], dbJanelaMs: [1, 16],
  });
  const FOLGA_CHUTE = 0.5;                             // v95: o anel do chute passa do corpo pelo menos isto (u)
  const SIM_NAO = new Set(['jogRede', 'dbModo', 'dbParede', 'dbOrdem', 'dbRelogio', 'viraNaHora']);
  const INTEIROS = new Set(['bufferToque', 'dbJanelaParada', 'dbProtecaoParada', 'dbJanelaMovel', 'dbProtecaoMovel', 'dbParadaPassos']);

  function perfilLimpo(p, base) {                     // um perfil de fora (do painel ou da rede): só os campos conhecidos, cortados
    const b = base || PERFIL_V92, o = {};
    for (const k in b) {
      let v = p && Object.prototype.hasOwnProperty.call(p, k) ? Number(p[k]) : b[k];
      if (!Number.isFinite(v)) v = b[k];
      const L = LIMITES[k];
      if (L) v = Math.max(L[0], Math.min(L[1], v));
      if (k === 'direcoes') v = v <= 0 ? 0 : v <= 8 ? 8 : v <= 16 ? 16 : v <= 32 ? 32 : 64;   // 8, 16, 32, 64 ou livre
      if (INTEIROS.has(k)) v = Math.round(v);
      if (SIM_NAO.has(k)) v = v >= 0.5 ? 1 : 0;
      o[k] = v;
    }
    return o;
  }

  // o perfil vira as constantes em px (os mesmos nomes do jogo, para o código ler igual)
  function resolve(perfil) {
    const p = perfilLimpo(perfil, PERFIL_V92);
    const C = {
      perfil: p,
      R_JOG: U(p.rJog), RAIO_CHUTE: U(p.raioChute), MASSA_JOG: p.massaJog, VEL_JOG: U(p.velJog),
      FORCA_KICK: p.forcaPasse, FORCA_POWER: p.forcaChute,
      R_BOLA: U(p.rBola), MASSA_BOLA: p.massaBola, LIMITE_VEL_BOLA: U(p.limiteBola), FATOR_BOLA: p.fatorBola,
      AMORT_ANGULAR: p.amortAngular, ATRITO_BOLA: p.atritoBola,
      ATRITO_JOG_BOLA: Math.sqrt(p.atritoJog * p.atritoBola), ATRITO_TRAVE_BOLA: Math.sqrt(p.atritoTrave * p.atritoBola),
      QUIQUE_BOLA: p.quiqueBola,
      Q_PAREDE: Math.max(p.quiqueBola, p.quiqueParede), Q_TRAVE: Math.max(p.quiqueBola, p.quiqueTrave), Q_REDE: Math.max(p.quiqueBola, p.quiqueRede),
      Q_JOG_JOG: p.quiqueJogJog, Q_JOG_PAREDE: p.quiqueJogParede, ATRITO_JOG_JOG: p.atritoJogJog, VIRA_NA_HORA: !!p.viraNaHora,
      LIMIAR_QUIQUE: U(p.limiarQuique),
      DIRECOES: p.direcoes, BUFFER_TOQUE: p.bufferToque, JOG_REDE: !!p.jogRede, COOLDOWN_BOTAO: p.cooldownBotao,
      // o DB por estados (experimental): [janela, proteção] em passos por contexto (0 parada, 1 andando, 2 parede)
      DB_MODO: p.dbModo, DB_POL: [[p.dbJanelaParada, p.dbProtecaoParada], [p.dbJanelaMovel, p.dbProtecaoMovel],
        p.dbParede ? [p.dbJanelaParada, p.dbProtecaoParada] : [0, 0]],
      DB_V_PARADA: U(p.dbVParada), DB_PARADA_PASSOS: p.dbParadaPassos, DB_MARGEM_PAREDE: U(p.dbMargemParede), DB_ORDEM: p.dbOrdem,
      DB_RELOGIO: p.dbRelogio, DB_ANULA_MS: p.dbAnulaMs, DB_JANELA_MS: p.dbJanelaMs,
      DB_MIN_PASSOS: 2,   // o mínimo entre dois chutes do mesmo jogador (os 33 ms do servidor, em passos), menos no par do DB
    };
    // v95: o anel do chute nunca fica por dentro da tampinha. Com o tamanho maior que o anel a tampinha não chutava nunca
    // (a bola não chega mais perto que rJog + rBola dos centros): o anel vale pelo menos o raio + 0,5 u, a mesma folga do
    // RACHA de sempre (2,5 − 2,0). No perfil oficial não muda nada.
    C.RAIO_CHUTE = Math.max(C.RAIO_CHUTE, C.R_JOG + U(FOLGA_CHUTE));
    C.ALCANCE_CHUTE = C.RAIO_CHUTE + C.R_BOLA;
    C.CR = crMedidas(C);                               // v99: as medidas dos chutes do Rachão (só valem na sala que liga)
    return C;
  }

  /* ---------- v99 · OS CHUTES DO RACHÃO — a CAVADINHA, a CURVA e o SUPER CHUTE, opcionais em cada sala ----------
     O pedido (29/10/2026): "crie um modo com cavadinha e curva igual do Rachão que dê pra jogar nas salas personalizadas;
     o cara pode escolher sem nada, com cavadinha e curva, e super chute". A sala liga cada um (M.cr = {lob, curva, super};
     sem nada ligado, M.cr = null e NADA aqui roda: a física oficial, a ranqueada e as salas sem os chutes são as mesmas).
     As regras são as do Rachão (app/public/game/rachao/rachao.html: doKick, integrateBall, controlPlayer), nas medidas do
     RACHA: o Rachão mede tudo pelo jogador de raio 15 px; aqui cada medida é multiplicada por R_JOG ÷ 15 (o tempo é o
     mesmo: 60 passos por segundo). Assim a cavadinha sobe 2,45 tampinhas e fica 0,58 s no ar, como lá:
       · a BOLA NO ALTO (z, vz): a gravidade e o quique no chão; no ar ela freia menos (0,996 por passo, contra o 0,99 do
         campo); acima da altura da tampinha passa por cima de todo mundo (nem bate nem conta toque); acima do alcance
         ninguém chuta; e o TRAVESSÃO (a boca do gol na altura de 30 do Rachão) segura a bola alta — ela bate e volta, não é gol;
       · a CAVADINHA: um toque arma (outro desarma); o próximo chute (PASSE, CHUTE ou SUPER) sai com 70% da força para a
         frente e sobe; a bola no ar que é chutada vira CABEÇADA (80% da força, sobe pouco);
       · a CURVA: ↶ ou ↷ armam (o mesmo de novo desarma); a bola sai na linha do chute e vai girando para o lado escolhido
         (o giro diminui 3% por passo, como no Rachão);
       · o SUPER CHUTE: segure para carregar (0,75 s até o fim), solte para chutar — de 0,6 a 2,2 vezes o CHUTE, conforme a
         carga; se a bola ainda não está no pé ao soltar, ele espera 8 passos por ela. Carregando, o PASSE e o CHUTE esperam.
         A bola do super passa do teto de sempre (até ela frear abaixo dele) e, bem carregado, sai pegando fogo.
     Os toques chegam por contador no comando (lb, ce, cd: não se perdem com um comando perdido) e o super segurado no bit su.
     Determinístico (nada de sorteio): o servidor e a previsão do aparelho rodam o mesmo. */
  const CR_RAIO = 15;                                  // o raio do jogador do Rachão (px): a régua das medidas de lá
  function crMedidas(C) {
    const k = C.R_JOG / CR_RAIO, SUPER_MAX = 2.2;
    return Object.freeze({
      k, G: 0.24 * k * TPS * TPS,                      // a gravidade (px/s²)
      LOB_VZ: 4.2 * k * TPS, LOB_FORCA: 0.7,           // a cavadinha: a subida e a parte da força para a frente
      CABECA_Z: 3 * k, CABECA_FORCA: 0.8, CABECA_VZ: 0.6 * k * TPS,
      ALTURA_JOG: 17 * k, ALCANCE_Z: 30 * k, TRAVESSAO: 30 * k,   // por cima da tampinha · ainda dá para chutar · o travessão
      QUIQUE_CHAO: 0.5, FREIO_QUIQUE: 0.88, VZ_QUIQUE: 1 * k * TPS, FREIO_AR: 0.996, QUIQUE_TRAVESSAO: 0.5,
      CURVA: 0.012, CURVA_FICA: 0.97, CURVA_V: 2 * k * TPS, CURVA_MIN: 0.0004,
      SUPER_PASSOS: 45, SUPER_MIN: 0.6, SUPER_MAX, SUPER_ESPERA: 8,
      V_SUPER: U(SUPER_MAX * C.FORCA_POWER / C.MASSA_BOLA),   // o teto do super: a bola do super cheio (um super em cima do outro não passa disso)
    });
  }
  function crOpcoes(o) {                               // a opção da sala → {lob, curva, super} (null = só o chutar) · também em letras: 'l', 'c', 's' ('lcs' = os três)
    if (typeof o === 'string') o = o.length <= 3 && /^[lcs]*$/.test(o) ? { lob: o.indexOf('l') >= 0, curva: o.indexOf('c') >= 0, super: o.indexOf('s') >= 0 } : null;
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    const tem = k => Object.prototype.hasOwnProperty.call(o, k) && o[k] === true;   // (só o que é dele: nada herdado)
    const r = { lob: tem('lob'), curva: tem('curva'), super: tem('super') };
    return r.lob || r.curva || r.super ? r : null;
  }
  const crLetras = o => o ? (o.lob ? 'l' : '') + (o.curva ? 'c' : '') + (o.super ? 's' : '') : '';
  // o estado de cada jogador: lob/curva armados, o super (segura, a carga em passos, a carga do que saiu, a espera) e os contadores
  function crNovo() { return { lob: false, curva: 0, segura: false, cT: 0, pT: 0, espera: 0, su: false, cancela: false, lbN: -1, ceN: -1, cdN: -1, sxN: -1 }; }
  function crZera(s) { if (!s) return; s.lob = false; s.curva = 0; s.segura = false; s.cT = 0; s.pT = 0; s.espera = 0; s.su = false; s.cancela = false; }
  function crZeraBola(B) { B.z = 0; B.vz = 0; B.sp = 0; B.teto = 0; B.fogo = 0; }
  const crN = v => Number.isInteger(v) && v >= 0 && v < 2e9 ? v : null;
  const crEsq = x => x === -1 ? 0 : -1, crDir = x => x === 1 ? 0 : 1;
  function crCe(s, ce, M) { if (ce == null) return; if (s.ceN >= 0 && ce > s.ceN && M.cr.curva) for (let i = Math.min(4, ce - s.ceN); i > 0; i--) s.curva = crEsq(s.curva); if (ce > s.ceN) s.ceN = ce; }
  function crCd(s, cd, M) { if (cd == null) return; if (s.cdN >= 0 && cd > s.cdN && M.cr.curva) for (let i = Math.min(4, cd - s.cdN); i > 0; i--) s.curva = crDir(s.curva); if (cd > s.cdN) s.cdN = cd; }
  // um comando consumido: os toques (pelo contador), o super segurado e o super cancelado (sx: o sistema tirou o dedo ou a
  // janela perdeu o foco — soltar assim não chuta). Os dois lados da curva no mesmo comando (comandos que o servidor juntou):
  // o lado tocado por último (cu: -1 ou 1) vale por último, como no aparelho.
  function crComando(s, c, M) {
    if (!s || !M.cr) return;
    const lb = crN(c.lb), sx = crN(c.sx);
    if (lb != null) { if (s.lbN >= 0 && lb > s.lbN && M.cr.lob && (lb - s.lbN) % 2) s.lob = !s.lob; if (lb > s.lbN) s.lbN = lb; }
    if (c.cu === -1) { crCd(s, crN(c.cd), M); crCe(s, crN(c.ce), M); } else { crCe(s, crN(c.ce), M); crCd(s, crN(c.cd), M); }
    if (sx != null) { if (s.sxN >= 0 && sx > s.sxN && s.segura) s.cancela = true; if (sx > s.sxN) s.sxN = sx; }
    s.su = c.su === 1 && !!M.cr.super;
  }
  const crForcaSuper = (C, c) => (C.CR.SUPER_MIN + (C.CR.SUPER_MAX - C.CR.SUPER_MIN) * c) * C.FORCA_POWER;
  const crCarga = s => Math.pow(Math.max(0, Math.min(1, s.pT / CR_SUPER_PASSOS)), 0.9);
  const CR_SUPER_PASSOS = 45;
  // uma vez por passo de cada jogador: o super (segura carrega; soltou, chuta — esperando a bola até 8 passos).
  // segura = o botão neste passo (o comando do passo ou o palpite). chuta(q, forca, carga) faz o chute de quem chama.
  function crTick(M, C, q, s, segura, vale, chuta) {
    if (!s) return false;
    const cancela = s.cancela; s.cancela = false;
    if (!M.cr || !M.cr.super || !vale) { s.segura = false; s.cT = 0; s.espera = 0; return false; }
    if (cancela && s.segura) { s.segura = false; s.cT = 0; }   // (o super cancelado: a carga cai e nada sai)
    if (segura) { if (!s.segura) { s.segura = true; s.cT = 0; } else if (s.cT < CR_SUPER_PASSOS) s.cT++; }
    else if (s.segura) { s.segura = false; s.pT = s.cT; s.cT = 0; s.espera = C.CR.SUPER_ESPERA; }
    if (s.espera > 0) {
      const c = crCarga(s);
      if (chuta(q, crForcaSuper(C, c), c)) { s.espera = 0; return true; }
      s.espera--;
    }
    return false;
  }
  function crAlta(M, C) { return !!M.cr && M.B.z > C.CR.ALTURA_JOG; }       // a bola passa por cima das tampinhas
  function crAlcanca(M, C) { return !M.cr || !(M.B.z > C.CR.ALCANCE_Z); }  // ainda dá para chutar (no chão ou de cabeça)
  // o chute com os extras: f = a parte da força (cavadinha 70%, cabeçada 80%); depois do impulso, a subida, o giro e o fogo
  function crFator(M, C, q) {
    const s = q.cr, B = M.B; let f = 1;
    if (B.z > C.CR.CABECA_Z) f *= C.CR.CABECA_FORCA;
    if (s && s.lob && M.cr.lob) f *= C.CR.LOB_FORCA;
    return f;
  }
  function crDepois(M, C, q, carga) {
    const s = q.cr, B = M.B, CR = C.CR, sup = Number.isFinite(carga), c = sup ? carga : 0;
    const lob = !!(s && s.lob && M.cr.lob), curva = s && M.cr.curva ? s.curva : 0, cabeca = B.z > CR.CABECA_Z;
    if (lob) B.vz = CR.LOB_VZ * (1 + 0.45 * c);
    else if (cabeca) B.vz = Math.max(0, B.vz * 0.2) + CR.CABECA_VZ;
    B.sp = curva * CR.CURVA * (1 + 0.6 * c);
    const v = Math.hypot(B.vx, B.vy);
    B.teto = sup && v > C.LIMITE_VEL_BOLA ? Math.min(v, CR.V_SUPER) : 0;
    B.fogo = sup && c > 0.6 ? Math.round(15 + 30 * c) : 0;
    if (s) { s.lob = false; s.curva = 0; }
  }
  // o giro da curva (uma vez por passo, como no Rachão): a velocidade vira um pouco para o lado, e o giro diminui
  function crGiro(B, CR) {
    const v = Math.hypot(B.vx, B.vy), a = B.sp * Math.min(1, v / CR.CURVA_V), c = Math.cos(a), si = Math.sin(a);
    const vx = B.vx * c - B.vy * si, vy = B.vx * si + B.vy * c; B.vx = vx; B.vy = vy;
    B.sp *= CR.CURVA_FICA; if (Math.abs(B.sp) < CR.CURVA_MIN) B.sp = 0;
  }
  // a altura (uma vez por passo, depois do movimento): a gravidade e o quique no chão
  function crAltura(B, CR) {
    if (!(B.z > 0 || B.vz > 0)) { B.z = 0; B.vz = 0; return 0; }
    B.vz -= CR.G * DT; B.z += B.vz * DT;
    if (B.z <= 0) {
      B.z = 0;
      if (B.vz < -CR.VZ_QUIQUE) { const imp = -B.vz; B.vz = -B.vz * CR.QUIQUE_CHAO; B.vx *= CR.FREIO_QUIQUE; B.vy *= CR.FREIO_QUIQUE; return imp; }
      B.vz = 0;
    }
    return 0;
  }
  // o estado de um jogador no quadro (um número): lob, curva, segura, a carga, a carga que saiu e a espera
  function crPack(s) {
    if (!s) return 0;
    return (s.lob ? 1 : 0) | ((s.curva + 1) << 1) | (s.segura ? 8 : 0) | (Math.max(0, Math.min(63, s.cT | 0)) << 4) | (Math.max(0, Math.min(15, s.espera | 0)) << 10) | (Math.max(0, Math.min(63, s.pT | 0)) << 14);
  }
  function crUnpack(s, n) {
    if (!s || !Number.isInteger(n) || n < 0) return;
    s.lob = !!(n & 1); s.curva = Math.max(-1, Math.min(1, ((n >> 1) & 3) - 1)); s.segura = !!(n & 8);
    s.cT = (n >> 4) & 63; s.espera = (n >> 10) & 15; s.pT = (n >> 14) & 63;
  }

  /* ---------- as batidas (as mesmas fórmulas do jogo e da v83) ---------- */
  // (nx, ny) = a normal da superfície para o corpo; e = quique; mu = atrito; lq = limiar do quique (px/s)
  function reflect(o, nx, ny, e, mu, lq) {
    const vn = o.vx * nx + o.vy * ny;
    if (vn >= 0) return;
    const eff = (-vn < lq) ? 0 : e;
    const jn = -(1 + eff) * vn;
    o.vx += nx * jn; o.vy += ny * jn;
    if (mu > 0) {
      const tx = -ny, ty = nx, R = o.r, w = o.w || 0;
      const vt = o.vx * tx + o.vy * ty - w * R;
      const k = 1 + (o.I ? (o.m * R * R) / o.I : 0);
      let jt = -vt / k;
      const lim = mu * jn;
      if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
      o.vx += tx * jt; o.vy += ty * jt;
      if (o.I) o.w = w - (R * jt * o.m) / o.I;
    }
  }
  function hitPoint(o, px, py, pr, e, mu, lq) {
    let dx = o.x - px, dy = o.y - py;
    const rs = o.r + pr, d2 = dx * dx + dy * dy;
    if (d2 >= rs * rs) return false;
    let d = Math.sqrt(d2);
    if (d < 1e-9) { const v = Math.hypot(o.vx, o.vy); dx = v > 1e-9 ? -o.vx / v : 1; dy = v > 1e-9 ? -o.vy / v : 0; d = 1; }
    const nx = dx / d, ny = dy / d;
    o.x = px + nx * rs; o.y = py + ny * rs;
    reflect(o, nx, ny, e, mu, lq);
    return true;
  }
  function hitSeg(o, ax, ay, bx, by, e, mu, lq) {
    const abx = bx - ax, aby = by - ay;
    const t = Math.max(0, Math.min(1, ((o.x - ax) * abx + (o.y - ay) * aby) / (abx * abx + aby * aby)));
    return hitPoint(o, ax + abx * t, ay + aby * t, 0, e, mu, lq);
  }
  function hitBox(o, x0, y0, x1, y1, e, mu, lq) {
    if (o.x < x0 + o.r) { o.x = x0 + o.r; reflect(o, 1, 0, e, mu, lq); }
    else if (o.x > x1 - o.r) { o.x = x1 - o.r; reflect(o, -1, 0, e, mu, lq); }
    if (o.y < y0 + o.r) { o.y = y0 + o.r; reflect(o, 0, 1, e, mu, lq); }
    else if (o.y > y1 - o.r) { o.y = y1 - o.r; reflect(o, 0, -1, e, mu, lq); }
  }
  // círculo × círculo com massas; o atrito gira a bola (b)
  function hitBodies(a, b, e, mu) {
    let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    const rs = a.r + b.r;
    if (d >= rs) return;
    if (d < 1e-6) {
      dx = a.vx - b.vx; dy = a.vy - b.vy; d = Math.hypot(dx, dy);
      if (d < 1e-6) { dx = 1; dy = 0; d = 1; }
      dx /= d; dy /= d; d = 1e-6; dx *= d; dy *= d;
    }
    const nx = dx / d, ny = dy / d;
    const ia = a.cinematico ? 0 : 1 / a.m, ib = b.cinematico ? 0 : 1 / b.m, is = ia + ib;   // (v92: cinemático = não é empurrado)
    if (is <= 0) return;
    const pen = Math.max(0, rs - d - 0.2) * 0.9;
    a.x -= nx * pen * ia / is; a.y -= ny * pen * ia / is;
    b.x += nx * pen * ib / is; b.y += ny * pen * ib / is;
    const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (vn < 0) {
      const j = -(1 + e) * vn / is;
      a.vx -= j * ia * nx; a.vy -= j * ia * ny;
      b.vx += j * ib * nx; b.vy += j * ib * ny;
      if (mu > 0) {
        const tx = -ny, ty = nx, R = b.r, w = b.w || 0;
        const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty - w * R;
        let jt = -vt / (is + (b.I ? (R * R) / b.I : 0));
        const lim = mu * j;
        if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
        a.vx -= jt * ia * tx; a.vy -= jt * ia * ty;
        b.vx += jt * ib * tx; b.vy += jt * ib * ty;
        if (b.I) b.w = w - (R * jt) / b.I;
      }
    }
  }

  /* ---------- o campo das salas (Arena e Estádio: a mesma geometria) · v95: o campo 30% maior (o gol, o de antes), os mesmos números do jogo ---------- */
  const MODOS = [
    { nome: '1v1', jog: [87.8, 62],   bola: [72.8, 52],   gol: [6.6, 12.8], trave: 0.5, rede: 0.4 },
    { nome: '2v2', jog: [107.3, 75],  bola: [92.3, 65],   gol: [6.6, 16],   trave: 0.5, rede: 0.4 },
    { nome: '3v3', jog: [126.8, 101], bola: [111.8, 91],  gol: [7, 20.5],   trave: 0.5, rede: 0.4 },
    { nome: '4v4', jog: [156.4, 127], bola: [140.4, 117], gol: [7, 24.5],   trave: 0.5, rede: 0.4 },
  ];
  const MARGEM_X = 206, MARGEM_Y = 59;
  const SAIDA_U = [10.4, 13, 15.6, 17.55];          // o raio da barreira da saída por tamanho (v95: × 1,3, com o campo)
  function novoCampo(tamanho) {
    const n = Math.min(4, Math.max(1, tamanho | 0)), m = MODOS[n - 1];
    const pw = U(m.jog[0]), ph = U(m.jog[1]), bw = U(m.bola[0]), bh = U(m.bola[1]);
    const MW = Math.round(pw + 2 * MARGEM_X), MH = Math.round(ph + 2 * MARGEM_Y);
    const CX = MW / 2, CY = MH / 2;
    const G = {
      nome: m.nome, n, MW, MH, CX, CY,
      GL: CX - pw / 2, GR: CX + pw / 2, GT: CY - ph / 2, GB: CY + ph / 2,
      LX0: CX - bw / 2, LX1: CX + bw / 2, LY0: CY - bh / 2, LY1: CY + bh / 2,
    };
    G.GOL_PROF = U(m.gol[0]);
    G.GOL_Y0 = CY - U(m.gol[1]) / 2; G.GOL_Y1 = CY + U(m.gol[1]) / 2;
    G.POST_R = U(m.trave) / 2;
    G.REDE_E = U(m.rede);
    G.POSTS = [[G.LX0, G.GOL_Y0], [G.LX0, G.GOL_Y1], [G.LX1, G.GOL_Y0], [G.LX1, G.GOL_Y1]];
    const PL = { x0: G.LX0 - G.GOL_PROF, x1: G.LX0 }, PR = { x0: G.LX1, x1: G.LX1 + G.GOL_PROF };
    G.NET_SEGS = [
      [PL.x0, G.GOL_Y0, PL.x1, G.GOL_Y0], [PL.x0, G.GOL_Y1, PL.x1, G.GOL_Y1], [PL.x0, G.GOL_Y0, PL.x0, G.GOL_Y1],
      [PR.x0, G.GOL_Y0, PR.x1, G.GOL_Y0], [PR.x0, G.GOL_Y1, PR.x1, G.GOL_Y1], [PR.x1, G.GOL_Y0, PR.x1, G.GOL_Y1],
    ];
    G.WALL_SEGS = [
      [G.LX0, G.LY0, G.LX1, G.LY0], [G.LX0, G.LY1, G.LX1, G.LY1],
      [G.LX0, G.LY0, G.LX0, G.GOL_Y0], [G.LX0, G.GOL_Y1, G.LX0, G.LY1],
      [G.LX1, G.LY0, G.LX1, G.GOL_Y0], [G.LX1, G.GOL_Y1, G.LX1, G.LY1],
    ];
    G.circ = U(SAIDA_U[n - 1]);
    return G;
  }

  /* ---------- o analógico: n setores (0 = livre); a amplitude não muda a velocidade ---------- */
  const ZONA_MORTA = 0.00001;
  function direcao(mx, my, n) {
    if (!Number.isFinite(mx) || !Number.isFinite(my) || Math.hypot(mx, my) <= ZONA_MORTA) return { mx: 0, my: 0 };
    if (!n) { const l = Math.hypot(mx, my); return { mx: mx / l, my: my / l }; }
    const setor = (Math.PI * 2) / n, ang = Math.round(Math.atan2(my, mx) / setor) * setor;
    return { mx: Math.cos(ang), my: Math.sin(ang) };
  }

  /* ---------- a CURVA (o efeito no ar e o chute de curva) ---------- */
  const CV_CARGA_S = 1.2, CV_ARMA_S = 0.35, CV_W = [0.2, 1], CV_T = [0.45, 0.9];
  const cvW = c => CV_W[0] + (CV_W[1] - CV_W[0]) * c, cvT = c => CV_T[0] + (CV_T[1] - CV_T[0]) * c;
  function curvaNoAr(B, sub) {                        // a bola entorta no ar
    if (!(B.cvT > 0)) return;
    B.cvT -= sub;
    const v = Math.hypot(B.vx, B.vy);
    if (v < U(3)) { B.cvT = 0; return; }
    if (B.cvUx != null && (B.vx * B.cvUx + B.vy * B.cvUy) / v < 0.94) { B.cvT = 0; return; }   // bateu: o efeito acaba
    const a = (B.cv || 0) * v * sub, nx = -B.vy / v, ny = B.vx / v;
    B.vx += nx * a; B.vy += ny * a;
    const l = Math.hypot(B.vx, B.vy) || 1; B.cvUx = B.vx / l; B.cvUy = B.vy / l;
  }
  function cvSinal(M, ux, uy, mx, my) {
    const l = Math.hypot(mx, my);
    if (l > 0.1) { const x = (ux * my - uy * mx) / l; if (Math.abs(x) > 0.26) return x > 0 ? 1 : -1; }
    return Math.sign((M.G.CY - M.B.y) * ux) || 1;
  }
  function cvMarca(B, s, c) { B.cv = s * cvW(c); B.cvT = cvT(c); B.w = B.cv * 9; B.cvUx = null; }

  /* ---------- o chute (centro da tampinha → centro da bola, só no alcance) ---------- */
  // devolve true se chutou. Quem chama marca autoria, efeito e som (o servidor e o aparelho fazem coisas diferentes).
  function chute(M, C, q, forca, carga) {             // (v99: carga = o super chute dos chutes do Rachão; sem ela, o chute de sempre)
    const B = M.B;
    let dx = B.x - q.x, dy = B.y - q.y, d = Math.hypot(dx, dy);
    if (d === 0) { dx = 1; dy = 0; d = 1; }
    if (d > C.ALCANCE_CHUTE) return false;
    if (M.cr && (!crAlcanca(M, C) || (q.cr && q.cr.segura && !Number.isFinite(carga)))) return false;   // v99: alta demais · carregando o super
    B.w = 0; const dv = U(forca / B.m) * (M.cr ? crFator(M, C, q) : 1); B.vx += dx / d * dv; B.vy += dy / d * dv;
    if (M.jogo === 'curva') B.cvT = 0;               // PASSE e CHUTE saem retos; a curva é só do botão CURVA
    if (M.cr) crDepois(M, C, q, carga);
    return true;
  }

  /* ---------- os botões PASSE/CHUTE de um jogador ----------
     b = {estado:1|2|3, livre, t, ultimo, kc, pc, arma, armaTipo, cv:{carga,segura,arma,armaC}}
     · comando(b, c): um comando consumido (cada um, na ordem; os atrasados também) — a máquina de sempre + o toque novo
       (pelo contador kc/pc do comando; sem contador, pela passagem de solto para apertado);
     · tick(M, C, q, b, chuta): uma vez por passo — segurando: chuta quando a bola entra no alcance (como sempre);
       o toque armado: chuta se a bola chegar no alcance dentro de C.BUFFER_TOQUE ticks. Um chute por toque. */
  function novoBotao() {
    return { estado: 1, livre: true, t: 0, ultimo: -1e9, kc: -1, pc: -1, arma: 0, armaTipo: 0, cv: { carga: 0, segura: false, arma: 0, armaC: 0 },
      sq: 0, cP: null, cC: null, lance: null, hp: false, hc: false, lenta: -1e9, ev: null };   // (os do DB por estados: só com dbModo 1)
  }
  function botaoComando(b, c, C) {
    if (C.DB_MODO === 1) return dbComando(b, c, C);
    b.t += DT;
    const bt = c.button === 2 || c.button === 3 ? c.button : 1;
    const antes = b.estado;
    const aceito = bt !== 1 && (b.t - b.ultimo > C.COOLDOWN_BOTAO || b.estado === bt);
    b.estado = aceito ? bt : 1; if (aceito) b.ultimo = b.t;
    // o toque novo: pelo contador (não se perde) ou, sem contador, pela borda solto → apertado
    let novo = 0;
    const kc = Number.isFinite(c.kc) ? c.kc : null, pc = Number.isFinite(c.pc) ? c.pc : null;
    if (kc != null || pc != null) {
      if (pc != null && b.pc >= 0 && pc > b.pc) novo = 3;
      else if (kc != null && b.kc >= 0 && kc > b.kc) novo = 2;
      if (pc != null) b.pc = Math.max(b.pc, pc);
      if (kc != null) b.kc = Math.max(b.kc, kc);
    } else if (b.estado !== 1 && antes !== b.estado) novo = b.estado;
    if (novo && C.BUFFER_TOQUE > 0) { b.arma = C.BUFFER_TOQUE + 1; b.armaTipo = novo; }
    return novo;
  }
  function botaoTick(M, C, q, b, chuta) {             // chuta(q, forca) faz o chute de verdade (e o registro de quem chamou)
    if (C.DB_MODO === 1) return dbTick(M, C, q, b, chuta);
    const B = M.B;
    const perto = Math.hypot(B.x - q.x, B.y - q.y) <= C.ALCANCE_CHUTE;
    if (b.estado === 1) b.livre = true;
    else if (b.livre && perto) {
      if (chuta(q, b.estado === 3 ? C.FORCA_POWER : C.FORCA_KICK)) { b.livre = false; b.arma = 0; return b.estado; }
    }
    if (b.arma > 0) {
      b.arma--;
      if (b.arma > 0 && perto && chuta(q, b.armaTipo === 3 ? C.FORCA_POWER : C.FORCA_KICK)) {
        const t = b.armaTipo; b.arma = 0; if (b.estado !== 1) b.livre = false; return t;
      }
    }
    return 0;
  }

  /* ---------- O DB POR ESTADOS (experimental: dbModo 1) ----------
     O DB é o PASSE e logo depois o CHUTE na mesma bola: os dois impulsos somam e a bola sai no teto (46,75 u/s, contra 34
     do CHUTE sozinho). A máquina de sempre (dbModo 0) não foi feita para ele: o DB sai ou não por travas que existem por
     outros motivos (os 20 ms entre trocas de botão no aparelho, os 33 ms entre chutes no relógio do servidor) e pelo tempo
     que a bola fica no alcance. Aqui a decisão é dos COMANDOS, contados em passos pelo seq do comando — o relógio do aparelho,
     o mesmo no servidor, na previsão e no treino: o ping não muda nada. Nenhum toque espera: cada um vale no passo em que
     chegou ou é anulado.
       · cada toque novo (contador kc/pc) vira um comando, PASSE ou CHUTE, que vale enquanto o botão está apertado ou pelos
         passos do toque armado (bufferToque), esperando a bola entrar no alcance;
       · os dois no mesmo passo: a prioridade é do PASSE e o CHUTE é anulado. Com dbOrdem, se o relógio do toque (dt no
         comando: o CHUTE menos o PASSE, em décimos de ms) disser que o CHUTE veio antes, a prioridade é dele;
       · um chute CONSOME os comandos: o outro que estava apertado ou armado não sai depois, e segurar não chuta de novo;
       · o DB: um CHUTE apertado DEPOIS que o PASSE saiu completa o DB dentro da janela do contexto; depois dela, e dentro
         da proteção, é anulado (a bola parada "já saiu do alcance"); passada a proteção, só a física decide;
       · qualquer outro segundo chute na mesma bola (CHUTE → PASSE, PASSE → PASSE...) dentro da proteção também é anulado;
         fora dela vale o mínimo de 2 passos entre chutes do mesmo jogador (os 33 ms do servidor) — menos o par do DB;
       · o contexto é o da bola na hora do primeiro chute: parede (a menos de dbMargemParede de linha, trave ou rede; por
         padrão só a física decide), parada (até dbVParada agora ou até dbParadaPassos passos antes: a bola "inicialmente
         parada" que a tampinha empurrou chegando) ou andando;
       · dbRelogio 1 (para comparar no aparelho): o DB parado decide pelo intervalo entre os dedos medido no aparelho —
         menos de dbAnulaMs anula, até dbJanelaMs completa (no mesmo passo, se for o caso), depois anula.
     b.ev (quem chama liga com b.ev = []): o que a máquina decidiu, para o medidor do painel de testes. */
  function dbEv(b, e, s, x) { if (!b.ev) return; const o = { e, s }; if (x) Object.assign(o, x); b.ev.push(o); if (b.ev.length > 60) b.ev.shift(); }
  function dbComando(b, c, C) {
    b.t += DT;
    const s = Number.isFinite(c.seq) && c.seq > b.sq ? c.seq : b.sq + 1;    // (o passo do aparelho; sem seq, conta sozinho)
    b.sq = s;
    const bt = c.button === 2 || c.button === 3 ? c.button : 1;
    let hp, hc;
    if (Number.isInteger(c.bh)) { hp = (c.bh & 1) === 1; hc = (c.bh & 2) === 2; } else { hp = bt === 2; hc = bt === 3; }
    let nP = false, nC = false;
    const kc = Number.isFinite(c.kc) ? c.kc : null, pc = Number.isFinite(c.pc) ? c.pc : null;
    if (kc != null || pc != null) {
      if (pc != null && b.pc >= 0 && pc > b.pc) nC = true;
      if (kc != null && b.kc >= 0 && kc > b.kc) nP = true;
      if (pc != null) b.pc = Math.max(b.pc, pc);
      if (kc != null) b.kc = Math.max(b.kc, kc);
    } else { nP = hp && !b.hp; nC = hc && !b.hc; }       // (aparelho sem contador: a passagem de solto para apertado)
    if (b.cP && !hp) b.cP.segura = false;
    if (b.cC && !hc) b.cC.segura = false;
    b.hp = hp; b.hc = hc; b.estado = hc ? 3 : hp ? 2 : 1;
    const dt = Number.isFinite(c.dt) ? Math.max(-100, Math.min(100, c.dt / 10)) : null;   // ms, o CHUTE menos o PASSE
    let par = false;
    if (nP && nC) {                                      // os dois no mesmo passo
      if (C.DB_ORDEM && dt != null && dt < 0) { nP = false; dbEv(b, 'anulaPasse', s, { dt }); }
      else if (C.DB_RELOGIO && dt != null && dt >= C.DB_ANULA_MS && dt <= C.DB_JANELA_MS) par = true;
      else { nC = false; dbEv(b, 'anulaMesmoPasso', s, { dt }); }
    }
    if (nP) b.cP = { seq: s, segura: hp };
    if (nC) b.cC = { seq: s, segura: hc, dt, par };
    return nC ? 3 : nP ? 2 : 0;
  }
  function dbContexto(M, C, b, s) {                    // 0 parada, 1 andando, 2 parede (a bola como está, antes do chute)
    if (dbFolga(M) <= C.DB_MARGEM_PAREDE) return 2;
    return Math.hypot(M.B.vx, M.B.vy) <= C.DB_V_PARADA || s - b.lenta <= C.DB_PARADA_PASSOS ? 0 : 1;
  }
  function dbFolga(M) {                                // a distância da superfície da bola até a linha, trave ou rede mais perto
    const B = M.B, G = M.G; if (!G) return Infinity;
    const seg = (ax, ay, bx, by) => {
      const abx = bx - ax, aby = by - ay, l = abx * abx + aby * aby;
      const t = l ? Math.max(0, Math.min(1, ((B.x - ax) * abx + (B.y - ay) * aby) / l)) : 0;
      return Math.hypot(B.x - ax - abx * t, B.y - ay - aby * t);
    };
    let m = Infinity;
    for (const s of G.WALL_SEGS || []) m = Math.min(m, seg(s[0], s[1], s[2], s[3]));
    for (const s of G.NET_SEGS || []) m = Math.min(m, seg(s[0], s[1], s[2], s[3]));
    for (const p of G.POSTS || []) m = Math.min(m, (p.length >= 4 ? seg(p[0], p[1], p[2], p[3]) : Math.hypot(B.x - p[0], B.y - p[1])) - (G.POST_R || 0));
    if (G.GL != null) m = Math.min(m, B.x - G.GL, G.GR - B.x, B.y - G.GT, G.GB - B.y);
    return m - (B.r || 0);
  }
  function dbTick(M, C, q, b, chuta) {
    const s = b.sq, vida = Math.max(1, C.BUFFER_TOQUE);  // (o toque armado: o passo do toque e os seguintes, como o arma)
    if (Math.hypot(M.B.vx, M.B.vy) <= C.DB_V_PARADA) b.lenta = s;   // (quando a bola esteve parada pela última vez)
    if (b.cP && !b.cP.segura && s - b.cP.seq >= vida) { dbEv(b, 'expirou', s, { tipo: 2 }); b.cP = null; }
    if (b.cC && !b.cC.segura && s - b.cC.seq >= vida) { dbEv(b, 'expirou', s, { tipo: 3 }); b.cC = null; }
    let r = 0;
    for (let i = 0; i < 2; i++) {                      // (dois chutes no mesmo passo só no DB do relógio do toque)
      const cmd = b.cP && (!b.cC || b.cP.seq <= b.cC.seq) ? b.cP : b.cC;
      if (!cmd) break;
      const t = dbTenta(M, C, q, b, chuta, cmd);
      if (!t) break;
      r = t;
      if (!(t === 2 && b.cC && b.cC.par && b.cC.seq === s)) break;
    }
    return r;
  }
  function dbTenta(M, C, q, b, chuta, cmd) {
    const tipo = cmd === b.cP ? 2 : 3, s = b.sq, L = b.lance, k = L ? s - L.seq : 1e9;
    const par = !!L && L.tipo === 2 && tipo === 3 && (cmd.seq > L.seq || (cmd.par && cmd.seq === L.seq));
    const anula = (e, x) => { dbEv(b, e, s, Object.assign({ tipo, k, ctx: L ? L.ctx : null, dt: cmd.dt == null ? null : cmd.dt }, x)); if (tipo === 2) b.cP = null; else b.cC = null; return 0; };
    if (L) {
      const pol = C.DB_POL[L.ctx] || [0, 0], prot = pol[1];
      if (par) {
        let ok = !prot || k <= pol[0];
        if (C.DB_RELOGIO && L.ctx === 0 && L.seq === L.criado && cmd.dt != null && cmd.dt >= 0) ok = cmd.dt >= C.DB_ANULA_MS && cmd.dt <= C.DB_JANELA_MS;
        if (!ok && prot && k <= prot) return anula('foraDaJanela');
      } else if (prot && k <= prot) return anula('protecao');
      else if (k < C.DB_MIN_PASSOS) return 0;          // (o mínimo entre dois chutes: o comando continua valendo)
    }
    const B = M.B;
    if (Math.hypot(B.x - q.x, B.y - q.y) > C.ALCANCE_CHUTE) return 0;
    const ctx = par ? L.ctx : dbContexto(M, C, b, s);
    if (!chuta(q, tipo === 3 ? C.FORCA_POWER : C.FORCA_KICK)) return 0;
    dbEv(b, par ? 'DB' : tipo === 3 ? 'chute' : 'passe', s, { tipo, k: par ? k : null, ctx, dt: cmd.dt == null ? null : cmd.dt, espera: s - cmd.seq });
    const outro = tipo === 2 ? b.cC : b.cP;
    b.lance = { tipo, seq: s, criado: cmd.seq, ctx };
    if (tipo === 2) b.cP = null; else b.cC = null;
    if (outro && !(tipo === 2 && outro.par && outro.seq === s)) {   // o chute consome o outro comando (apertado antes dele sair)
      dbEv(b, 'consumido', s, { tipo: tipo === 2 ? 3 : 2 });
      if (tipo === 2) b.cC = null; else b.cP = null;
    }
    return tipo;
  }
  // o estado da máquina do DB no quadro do servidor (a previsão do aparelho continua daqui); as idades são passos antes do ack
  const DB_RADIX = [3, 64, 3, 2, 2, 32, 2, 2, 32, 2, 2, 2, 401, 64];
  function dbPack(b, ack) {
    const L = b.lance, P = b.cP, Cc = b.cC, id = (seq, m) => Math.max(0, Math.min(m, ack - seq));
    const dtOn = Cc && Cc.dt != null ? 1 : 0;
    const v = [L ? (L.tipo === 3 ? 2 : 1) : 0, L ? id(L.seq, 63) : 0, L ? L.ctx : 0, L && L.seq === L.criado ? 1 : 0,
      P ? 1 : 0, P ? id(P.seq, 31) : 0, P && P.segura ? 1 : 0,
      Cc ? 1 : 0, Cc ? id(Cc.seq, 31) : 0, Cc && Cc.segura ? 1 : 0, Cc && Cc.par ? 1 : 0, dtOn, dtOn ? Math.round(Cc.dt * 2) + 200 : 0,
      id(b.lenta, 63)];
    let n = 0;
    for (let i = 0; i < v.length; i++) n = n * DB_RADIX[i] + Math.max(0, Math.min(DB_RADIX[i] - 1, v[i]));
    return n;
  }
  function dbUnpack(b, n, ack) {
    const v = new Array(DB_RADIX.length);
    for (let i = DB_RADIX.length - 1; i >= 0; i--) { v[i] = n % DB_RADIX[i]; n = Math.floor(n / DB_RADIX[i]); }
    b.sq = ack;
    b.lance = v[0] ? { tipo: v[0] === 2 ? 3 : 2, seq: ack - v[1], criado: v[3] ? ack - v[1] : ack - v[1] - 1, ctx: v[2] } : null;
    b.cP = v[4] ? { seq: ack - v[5], segura: !!v[6] } : null;
    b.cC = v[7] ? { seq: ack - v[8], segura: !!v[9], par: !!v[10], dt: v[11] ? (v[12] - 200) / 2 : null } : null;
    b.lenta = v[13] >= 63 ? -1e9 : ack - v[13];
  }
  // a CURVA de quem joga (o bit 1 do k): segura carrega, solta arma por 0,35 s
  function curvaTick(M, C, q, b, k, vale, chuta) {
    if (M.jogo !== 'curva') return false;
    const s = b.cv;
    if (!vale) { s.carga = 0; s.segura = false; s.arma = 0; return false; }
    if (k & 1) { s.segura = true; s.carga = Math.min(1, s.carga + DT / CV_CARGA_S); s.arma = 0; return false; }
    if (s.segura) { s.segura = false; s.armaC = Math.max(s.carga, DT / CV_CARGA_S); s.carga = 0; s.arma = CV_ARMA_S; }
    if (s.arma > 0) {
      const B = M.B;
      let dx = B.x - q.x, dy = B.y - q.y, d = Math.hypot(dx, dy);
      if (d <= C.ALCANCE_CHUTE) {
        if (d === 0) { dx = 1; dy = 0; d = 1; }
        if (chuta(q, C.FORCA_POWER)) { cvMarca(B, cvSinal(M, dx / d, dy / d, q.mx, q.my), s.armaC); s.arma = 0; return true; }
      }
      s.arma = Math.max(0, s.arma - DT);
    }
    return false;
  }

  /* ---------- a barreira da saída (o meio-campo segura todos; o arco segura quem espera) ---------- */
  function barreiraUm(M, q) {
    const G = M.G, s = q.time === 0 ? -1 : 1;
    if (q.time !== M.saidaTime) {
      if (s < 0 && q.x > G.CX) { q.x = G.CX; if (q.vx > 0) q.vx = 0; }
      else if (s > 0 && q.x < G.CX) { q.x = G.CX; if (q.vx < 0) q.vx = 0; }
      const dx = q.x - G.CX, dy = q.y - G.CY, d = Math.hypot(dx, dy), m = G.circ + q.r;
      if (d < m) { if (d > 1e-6) { q.x = G.CX + dx * m / d; q.y = G.CY + dy * m / d; } else q.x = G.CX + s * m; }
      return;
    }
    if (s < 0 ? q.x <= G.CX : q.x >= G.CX) return;
    const dx = q.x - G.CX, dy = q.y - G.CY, d = Math.hypot(dx, dy), lim = G.circ - q.r;
    if (d <= lim) return;
    if (lim > 0 && d - lim < Math.abs(dx)) { q.x = G.CX + dx * lim / d; q.y = G.CY + dy * lim / d; }
    else { q.x = G.CX; if (s < 0 ? q.vx > 0 : q.vx < 0) q.vx = 0; }
  }

  // v103 · a vaga vazia (as salas personalizadas sem bots: quem saiu deixa o time com um a menos): a tampinha com fora = true
  // não anda, não bate em nada e não toca na bola. Sem ninguém fora, a lista é a mesma de sempre (o passo não muda nada).
  function presentes(J) { for (let i = 0; i < J.length; i++) if (J[i].fora) return J.filter(q => !q.fora); return J; }

  /* ---------- as colisões de um subpasso (a ordem do motor das salas) ---------- */
  function colide(M, C) {
    const B = M.B, G = M.G, J = presentes(M.jog), lq = C.LIMIAR_QUIQUE, alta = M.cr ? crAlta(M, C) : false;
    for (const q of J) {
      if (!alta) hitBodies(q, B, C.QUIQUE_BOLA, C.ATRITO_JOG_BOLA);   // (v99: a bola alta passa por cima)
      hitBox(q, G.GL, G.GT, G.GR, G.GB, C.Q_JOG_PAREDE, 0, lq);
      if (C.JOG_REDE) {                              // v92: como no jogo offline (rqParedes): a rede segura e a trave bate
        for (const s of G.NET_SEGS) hitSeg(q, s[0], s[1], s[2], s[3], 0.6, 0, lq);
        for (const p of G.POSTS) hitPoint(q, p[0], p[1], G.POST_R, 0.3, 0, lq);
      }
    }
    for (let i = 0; i < J.length; i++) for (let k = i + 1; k < J.length; k++) hitBodies(J[i], J[k], C.Q_JOG_JOG, C.ATRITO_JOG_JOG);
    if (M.estado === 'saida') for (const q of J) barreiraUm(M, q);
    for (const s of G.WALL_SEGS) hitSeg(B, s[0], s[1], s[2], s[3], C.Q_PAREDE, C.ATRITO_BOLA, lq);
    hitBox(B, G.GL, G.GT, G.GR, G.GB, C.Q_PAREDE, C.ATRITO_BOLA, lq);
    let trave = 0;
    for (const p of G.POSTS) {
      const d = Math.hypot(B.x - p[0], B.y - p[1]) || 1, vn = -(B.vx * (B.x - p[0]) + B.vy * (B.y - p[1])) / d;
      if (hitPoint(B, p[0], p[1], G.POST_R, C.Q_TRAVE, C.ATRITO_TRAVE_BOLA, lq) && vn > trave) trave = vn;
    }
    for (const s of G.NET_SEGS) hitSeg(B, s[0], s[1], s[2], s[3], C.Q_REDE, C.ATRITO_BOLA, lq);
    // v99: o travessão — a bola alta bate na boca do gol e volta. Só vindo do campo (o centro da bola do lado de fora da linha):
    // a que já passou por baixo dele segue para dentro, mesmo subindo (como no Rachão: o gol é a bola dentro)
    if (M.cr && B.z >= C.CR.TRAVESSAO) {
      const v0 = Math.abs(B.vx);
      if ((B.x >= G.LX0 && hitSeg(B, G.LX0, G.GOL_Y0, G.LX0, G.GOL_Y1, C.CR.QUIQUE_TRAVESSAO, 0, lq)) || (B.x <= G.LX1 && hitSeg(B, G.LX1, G.GOL_Y0, G.LX1, G.GOL_Y1, C.CR.QUIQUE_TRAVESSAO, 0, lq))) {
        if (v0 > (M.trave || 0)) M.trave = v0;
        M.travessao = (M.travessao | 0) + 1;
      }
    }
    if (trave > (M.trave || 0)) M.trave = trave;
  }

  // o gol: a bola INTEIRA do lado de dentro da linha, na altura da boca (lado -1 = gol da esquerda, 1 = da direita)
  function golCruzou(M, C, x0, y0, x1, y1) {
    const G = M.G, m = C.R_BOLA, xa = G.LX0 - m, xb = G.LX1 + m;
    if (x0 >= xa && x1 < xa) { const yc = y0 + (y1 - y0) * (x0 - xa) / (x0 - x1); if (yc > G.GOL_Y0 && yc < G.GOL_Y1) return -1; }
    if (x0 <= xb && x1 > xb) { const yc = y0 + (y1 - y0) * (xb - x0) / (x1 - x0); if (yc > G.GOL_Y0 && yc < G.GOL_Y1) return 1; }
    return 0;
  }

  /* ---------- O PASSO (1/60 s) ----------
     M = {G, B:{x,y,vx,vy,w,r,m,I,cv,cvT,cvUx,cvUy}, jog:[{x,y,vx,vy,r,m,mx,my,time,cinematico?}], estado, saidaTime, jogo}
     As entradas (mx, my e os chutes) já foram aplicadas por quem chama. cb (opcional):
       cb.toques()              — depois de cada subpasso (autoria);
       cb.gol(lado) → 'para'?   — a bola cruzou a linha num subpasso (devolver 'para' interrompe o passo).
     Tampinha cinemática (a previsão do aparelho para os outros jogadores): não usa entrada nem é empurrada. */
  /* ---------- v105 · O JOGO DE CORPO: o contato que já vem encostado ----------
     As batidas acontecem depois de andar: a tampinha encostada em outra anda o primeiro subpasso com a velocidade toda do
     analógico (inclusive a parte de lado) e só então a batida corrige — com isso ela escorregava em volta da outra mesmo com
     atrito. Aqui, no começo do passo (as velocidades do analógico já postas, antes de andar), cada par que já está encostado
     (até FOLGA_CORPO px de folga) perde a parte da velocidade que aperta um contra o outro (sem quique: é o empurra-empurra,
     não uma trombada) e o atrito (até atritoJogJog × o aperto) segura o deslize de lado. A trombada de quem chega correndo
     continua sendo a batida de sempre (com o quique tampinha × tampinha). pode(a, b): quem bate em quem (o motor dos mapas
     tem a regra de colisão entre os times). */
  const FOLGA_CORPO = 1;
  // o impulso do passo de uma tampinha: a direção do analógico (d) → a velocidade. v105: com VIRA_NA_HORA, a velocidade toda
  // na direção nova; sem, a de sempre (somada à de antes e cortada no teto). Sem direção: parada.
  function anda(q, d, C) {
    if (d.mx || d.my) {
      if (C.VIRA_NA_HORA) { q.vx = d.mx * C.VEL_JOG; q.vy = d.my * C.VEL_JOG; return; }
      q.vx += d.mx * C.VEL_JOG; q.vy += d.my * C.VEL_JOG;
      const v = Math.hypot(q.vx, q.vy);
      if (v > C.VEL_JOG) { q.vx *= C.VEL_JOG / v; q.vy *= C.VEL_JOG / v; }
    } else { q.vx = 0; q.vy = 0; }
  }
  function contatoJog(J, C, pode) {
    const mu = C.ATRITO_JOG_JOG;
    if (!(mu > 0)) return;
    for (let i = 0; i < J.length; i++) for (let k = i + 1; k < J.length; k++) {
      const a = J[i], b = J[k];
      if (pode && !pode(a, b)) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d >= a.r + b.r + FOLGA_CORPO || d < 1e-6) continue;
      const ia = a.cinematico ? 0 : 1 / a.m, ib = b.cinematico ? 0 : 1 / b.m, is = ia + ib;
      if (is <= 0) continue;
      const nx = dx / d, ny = dy / d, vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn >= 0) continue;
      const j = -vn / is;
      a.vx -= j * ia * nx; a.vy -= j * ia * ny;
      b.vx += j * ib * nx; b.vy += j * ib * ny;
      const tx = -ny, ty = nx, vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
      let jt = -vt / is;
      const lim = mu * j;
      if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
      a.vx -= jt * ia * tx; a.vy -= jt * ia * ty;
      b.vx += jt * ib * tx; b.vy += jt * ib * ty;
    }
  }

  function passo(M, C, cb) {
    const B = M.B, CR = M.cr ? C.CR : null, J = presentes(M.jog);   // (v103: sem as vagas vazias)
    for (const q of J) {
      if (q.cinematico) continue;
      const d = direcao(q.mx, q.my, C.DIRECOES);
      anda(q, d, C);
    }
    contatoJog(J, C);                                // v105: o jogo de corpo (só com atrito tampinha × tampinha)
    const fb = CR && (B.z > 0 || B.vz > 0) ? CR.FREIO_AR : C.FATOR_BOLA;   // (v99: no ar a bola freia menos)
    B.vx *= fb; B.vy *= fb;
    B.w *= 1 / (1 + C.AMORT_ANGULAR / TPS);
    if (CR && B.sp) crGiro(B, CR);                   // v99: a curva do Rachão
    const speed = Math.hypot(B.vx, B.vy), teto = CR && B.teto > C.LIMITE_VEL_BOLA ? B.teto : C.LIMITE_VEL_BOLA;   // (v99: o super passa do teto)
    if (speed > teto) { B.vx *= teto / speed; B.vy *= teto / speed; }
    if (CR && B.teto && speed <= C.LIMITE_VEL_BOLA) B.teto = 0;
    let relative = 0;
    for (const q of J) { const r = Math.hypot(B.vx - q.vx, B.vy - q.vy); if (r > relative) relative = r; }
    const steps = Math.max(2, Math.min(12, Math.ceil(Math.max(speed, relative) * DT / (C.R_BOLA * 0.3))));
    const sub = DT / steps;
    for (let i = 0; i < steps; i++) {
      const bx0 = B.x, by0 = B.y;
      for (const q of J) { q.x += q.vx * sub; q.y += q.vy * sub; }
      B.x += B.vx * sub; B.y += B.vy * sub;
      if (M.jogo === 'curva') curvaNoAr(B, sub);
      colide(M, C); colide(M, C);
      if (cb && cb.toques) cb.toques();
      const lado = golCruzou(M, C, bx0, by0, B.x, B.y);   // (v99: a bola alta não chega lá — o travessão segura do lado do campo)
      if (lado && cb && cb.gol && cb.gol(lado) === 'para') break;
      if (M.estado === 'fim') break;                 // (o motor das salas: o gol de ouro ou o da meta encerra na hora)
    }
    if (CR) { const imp = crAltura(B, CR); if (imp) M.quique = Math.max(M.quique || 0, imp); if (B.fogo > 0) B.fogo--; }   // v99: a gravidade e o quique
  }

  /* ---------- v96 · O PASSO SÓ DA TAMPINHA (a recuperação da fila de comandos) ----------
     O servidor deixou a tampinha parada uns passos (o comando atrasou: um apagão do 4G, um engasgo) e os comandos chegaram
     depois, todos juntos. Antes eles eram jogados fora (a previsão do aparelho já tinha andado com eles: a tampinha "voltava").
     Agora cada comando que ficou para trás anda como um passo só da tampinha, com as paredes, a rede, as traves e a barreira
     da saída (a bola e os outros não se mexem nele): o servidor alcança o lugar que o aparelho previu. Os mesmos números do
     passo de sempre (a velocidade aditiva com teto, 2 subpassos). */
  function passoSolo(M, C, q, c) {
    const G = M.G, lq = C.LIMIAR_QUIQUE, d = direcao(c ? c.x : 0, c ? c.y : 0, C.DIRECOES);
    anda(q, d, C);
    for (let i = 0; i < 2; i++) {
      q.x += q.vx * DT / 2; q.y += q.vy * DT / 2;
      hitBox(q, G.GL, G.GT, G.GR, G.GB, C.Q_JOG_PAREDE, 0, lq);
      if (C.JOG_REDE) {
        for (const s of G.NET_SEGS) hitSeg(q, s[0], s[1], s[2], s[3], 0.6, 0, lq);
        for (const p of G.POSTS) hitPoint(q, p[0], p[1], G.POST_R, 0.3, 0, lq);
      }
      if (M.estado === 'saida') barreiraUm(M, q);
    }
  }

  function novaBola(C, x, y) { return { x, y, vx: 0, vy: 0, w: 0, r: C.R_BOLA, m: C.MASSA_BOLA, I: 0.5 * C.MASSA_BOLA * C.R_BOLA * C.R_BOLA, cv: 0, cvT: 0, cvUx: null, cvUy: null, z: 0, vz: 0, sp: 0, teto: 0, fogo: 0 }; }
  function ajustaCorpos(M, C) {                       // o perfil mudou: os raios e as massas de todo mundo seguem
    const B = M.B; B.r = C.R_BOLA; B.m = C.MASSA_BOLA; B.I = 0.5 * C.MASSA_BOLA * C.R_BOLA * C.R_BOLA;
    for (const q of M.jog) { q.r = C.R_JOG; q.m = C.MASSA_JOG; }
  }

  return {
    VERSAO: 'v92.1', PX_POR_U, U, TPS, DT, PERFIL_V91, PERFIL_V92, LIMITES, FOLGA_CHUTE, perfilLimpo, resolve, presentes,
    reflect, hitPoint, hitSeg, hitBox, hitBodies, MODOS, MARGEM_X, MARGEM_Y, novoCampo, direcao,
    chute, novoBotao, botaoComando, botaoTick, curvaTick, curvaNoAr, cvSinal, cvMarca, CV_CARGA_S, CV_ARMA_S,
    dbContexto, dbFolga, dbPack, dbUnpack,
    barreiraUm, colide, golCruzou, passo, passoSolo, novaBola, ajustaCorpos, contatoJog, FOLGA_CORPO, anda,
    // v99 · os chutes do Rachão
    crOpcoes, crLetras, crNovo, crZera, crZeraBola, crComando, crTick, crAlta, crAlcanca, crFator, crDepois, crGiro, crAltura, crPack, crUnpack, crForcaSuper,
  };
});
