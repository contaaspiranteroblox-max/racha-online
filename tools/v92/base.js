/* ======================================================================================================================
   RACHA v92 · A MECÂNICA MAIS LISA, MAIS PRECISA E MAIS RESPONSIVA (tools/v92/*.js, colado depois da v91).
   A interface da v91 NÃO muda: aqui só entram a cadência dos quadros, o desenho entre os passos da física, o toque armado
   do PASSE/CHUTE, o analógico, a previsão do online (rede.js) e — só na VERSÃO DE TESTES (config.js: experimental: true)
   — o painel de ajustes (painel.js). Sem o experimental, o jogo usa o padrão da v92 e o painel não existe.

   O que este arquivo faz (cada item tem a chave dele no V92.cfg; o perfil "Restaurar v91" volta tudo ao que era):
   1) A CADÊNCIA (dtSnap): a física anda em passos fixos de 1/60 s e a tela em 60, 90 ou 120 Hz com o relógio oscilando uns
      décimos de ms. Na v91 o offline não acertava o intervalo (o online já acertava): em 60 Hz, de vez em quando um quadro
      ficava com 0 passos e o seguinte com 2 (a tampinha "engasgava"). Agora o intervalo perto de 1 passo (ou de meio, ou
      de 2) vira exatamente isso, e a diferença que sobra fica guardada: dentro de uma folga de 6 ms (o relógio oscilando em
      volta do quadro da tela) ela não mexe em nada; passou disso (uma tela de 59,94 Hz, ou um pouco mais rápida que 60), o
      jogo acompanha o relógio de verdade aos poucos, no máximo 1 ms por quadro — sem salto de passos e sem intervalo
      negativo (importante no online, que manda 1 comando por passo). Um quadro perdido (o dobro do intervalo) conta 2
      passos, como deve.
      O LIMITE DE FPS EM PASSO INTEIRO (fpsInteiro): com o limite de 60 (o padrão) numa tela de 90 Hz, a v91 desenhava 2 de
      cada 3 quadros da tela (um fica 11 ms, o outro 22 ms: a tela "tremia" num ritmo de 30 Hz). Agora o limite usa um
      número inteiro de quadros da tela: 90 Hz → todos (90/s); 120 Hz → 1 em 2 (60/s, iguais); 144 Hz → 1 em 2 (72/s).
   2) O DESENHO ENTRE OS PASSOS (render): 'v91' desenha o último passo (como era); 'suave' desenha entre o passo anterior e
      o atual (sempre exato, 1 passo = 16 ms atrás); 'prever' (o padrão da v92) desenha onde cada um vai estar AGORA: a sua
      tampinha com a velocidade do próximo passo (já com o analógico de agora), a bola com a velocidade dela batendo nas
      paredes, traves e rede, e os bots com o último deslocamento. Sem atraso a mais e sem tranco em 90/120 Hz.
   3) O TOQUE ARMADO (fisica.bufferToque, em passos): um toque no PASSE/CHUTE fica valendo por alguns passos (6 = 100 ms)
      esperando a bola entrar no alcance. Antes o toque só chutava se a bola já estivesse no alcance naquele passo: um toque
      um pouco adiantado se perdia. Um chute por toque; segurar continua armando como sempre. A mesma regra do servidor
      (server/partida/nucleo.js: botaoTick), para o treino e a sala se comportarem igual.
   4) O ANALÓGICO (zonaLiga, zonaDesliga, folgaDir, fisica.direcoes): começa a andar a 15% do curso (era 20%), para abaixo
      de 9% (era 12%) e troca de direção com 0,03 rad de folga na divisa (era 0,05: o ajuste fino ficava "grudento").
      Com os valores da v91 o analógico é exatamente o de antes (a mesma função).
   5) A FÍSICA DE NÚMEROS (fisica): os mesmos números da v91 no padrão. Na versão de testes o painel muda o tamanho da
      tampinha e da bola, a velocidade, o peso, o freio, os quiques, a força do PASSE/CHUTE… no treino e nas partidas contra
      bots (as variáveis do jogo deixaram de ser constantes só para isso: o build documenta cada troca no bloco de física).
   ====================================================================================================================== */
const V92_NUC = window.RachaNucleo;                              // o núcleo compartilhado (o mesmo arquivo do servidor)
const V92_CHAVE = 'racha-v92-testes';                            // (só a versão de testes guarda os ajustes do painel)
const V92_EXP = !!(window.RACHA_CONFIG && window.RACHA_CONFIG.experimental === true);
const V92_V91 = Object.freeze({                                  // o comportamento exato da v91 (o "Restaurar v91" do painel)
  render:'v91', dtSnap:false, fpsInteiro:false, previsao:'v91', bolaPrev:'servidor', tauCorr:90, quadros:30,
  zonaLiga:.2, zonaDesliga:.12, folgaDir:.05, areaToque:0, camMola:0, camLead:.08, aroJusto:false, medidor:false,
  fisica:V92_NUC.PERFIL_V91
});
const V92_PADRAO = Object.freeze(Object.assign({}, V92_V91, {   // o padrão da v92 (o que a versão oficial usa)
  render:'prever', dtSnap:true, fpsInteiro:true, previsao:'v92', bolaPrev:'eu',
  zonaLiga:.15, zonaDesliga:.09, folgaDir:.03,
  fisica:V92_NUC.PERFIL_V92
}));
const V92_FAIXAS = {                                             // os limites de cada ajuste do cliente (o servidor corta os da física)
  tauCorr:[30, 250], quadros:[30, 60], zonaLiga:[.04, .45], zonaDesliga:[.02, .4], folgaDir:[0, .12], areaToque:[0, 60],
  camMola:[0, .6], camLead:[0, .4]
};
const V92_ESCOLHAS = {render:['v91', 'suave', 'prever'], previsao:['v91', 'v92'], bolaPrev:['servidor', 'misto', 'eu']};
const V92 = {
  versao:'v92.1', exp:V92_EXP, cfg:null, ultInp:{mx:0, my:0},
  slots:{A:null, B:null}, slot:'',
  med:{quadros:[], passos:[0, 0, 0, 0], ultimo:0, toques:0, chutes:0, perdidos:0, corr:[], corrMax:0, tps:0, fila:0},
};
function v92Limpa(o, base){                                       // um cfg de fora (salvo ou importado): só o conhecido, nos limites
  const b = base || V92_PADRAO, c = {};
  for (const k in b){
    if (k === 'fisica'){ c.fisica = V92_NUC.perfilLimpo(o && o.fisica, b.fisica); continue; }
    let v = o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : b[k];
    if (typeof b[k] === 'boolean') v = !!v;
    else if (typeof b[k] === 'number'){ v = Number(v); if (!Number.isFinite(v)) v = b[k]; const f = V92_FAIXAS[k]; if (f) v = Math.max(f[0], Math.min(f[1], v)); }
    else if (V92_ESCOLHAS[k]){ if (V92_ESCOLHAS[k].indexOf(v) < 0) v = b[k]; }
    c[k] = v;
  }
  if (c.zonaDesliga > c.zonaLiga) c.zonaDesliga = c.zonaLiga;    // (para abaixo de onde começa: senão o analógico pisca)
  return c;
}
function v92Carrega(){
  V92.cfg = v92Limpa(null, V92_PADRAO);
  if (!V92.exp) return;
  let o = null;
  try { o = JSON.parse(localStorage.getItem(V92_CHAVE) || 'null'); } catch (_) {}
  try {
    if (o && o.cfg) V92.cfg = v92Limpa(o.cfg, V92_PADRAO);
    if (o && o.slots){ for (const s of ['A', 'B']) V92.slots[s] = o.slots[s] ? v92Limpa(o.slots[s], V92_PADRAO) : null; }
    if (o && typeof o.slot === 'string') V92.slot = o.slot;
  } catch (_) {}
  // o teste nos celulares: as memórias já vêm prontas — A = o Padrão v92 (o que está valendo na primeira vez), B = a v91
  // (tudo como era) — e a pausa da partida já tem o A ⇄ B para comparar as duas no mesmo lance (uma memória guardada fica)
  if (!V92.slots.A) V92.slots.A = v92Limpa(V92_PADRAO);
  if (!V92.slots.B) V92.slots.B = v92Limpa(V92_V91);
  if (!o || !o.cfg) V92.slot = 'A';
}
function v92Curto(c){                                            // o nome curto de um perfil: v92, v91 ou "ajuste" (o medidor não conta)
  const j = x => { const o = v92Limpa(x); o.medidor = false; return JSON.stringify(o); };
  const db = !!(c && c.fisica && c.fisica.dbModo === 1);           // (o DB por estados aparece junto: "v92 + DB por estados")
  const a = j(db ? Object.assign({}, c, {fisica:Object.assign({}, c.fisica, {dbModo:0})}) : c);
  return (a === j(V92_PADRAO) ? 'v92' : a === j(V92_V91) ? 'v91' : 'ajuste') + (db ? ' + DB por estados' : '');
}
function v92Salva(){
  if (!V92.exp) return;
  try { localStorage.setItem(V92_CHAVE, JSON.stringify({cfg:V92.cfg, slots:V92.slots, slot:V92.slot, versao:V92.versao})); } catch (_) {}
}
const v92IgualV91 = k => JSON.stringify(V92.cfg[k]) === JSON.stringify(V92_V91[k]);

/* ---------------------------------------------------------------- 5) a física de números (offline: treino e bots) */
let V92_FIS = null;                                              // o perfil que está valendo no aparelho (o resolvido do núcleo)
function v92AplicaFisica(f){
  const p = V92_NUC.perfilLimpo(f, V92_NUC.PERFIL_V92);
  V92_FIS = V92_NUC.resolve(p);
  R_JOG = U(p.rJog); RAIO_CHUTE = V92_FIS.RAIO_CHUTE; MASSA_JOG = p.massaJog; VEL_JOG = U(p.velJog);   // (v95: o anel nunca por dentro da tampinha)
  FORCA_KICK = p.forcaPasse; FORCA_POWER = p.forcaChute;
  R_BOLA = U(p.rBola); MASSA_BOLA = p.massaBola; LIMITE_VEL_BOLA = U(p.limiteBola);
  for (const c of CAMPOS){ if (c.v92Fator === undefined) c.v92Fator = c.fatorBola === FATOR_BOLA; if (c.v92Fator) c.fatorBola = p.fatorBola; }
  FATOR_BOLA = p.fatorBola;
  AMORT_ANGULAR = p.amortAngular; ATRITO_BOLA = p.atritoBola;
  ATRITO_JOG_BOLA = Math.sqrt(p.atritoJog*p.atritoBola); ATRITO_TRAVE_BOLA = Math.sqrt(p.atritoTrave*p.atritoBola);
  QUIQUE_BOLA = p.quiqueBola; QUIQUE_TRAVE = p.quiqueTrave; QUIQUE_REDE = p.quiqueRede; QUIQUE_PAREDE_BOLA = p.quiqueParede;
  Q_PAREDE = Math.max(QUIQUE_BOLA, QUIQUE_PAREDE_BOLA); Q_TRAVE = Math.max(QUIQUE_BOLA, QUIQUE_TRAVE); Q_REDE = Math.max(QUIQUE_BOLA, QUIQUE_REDE);
  if (CAMPO.rede){ Q_POSTE = Q_TRAVE; ATRITO_POSTE = ATRITO_TRAVE_BOLA; }
  V92_QJJ = p.quiqueJogJog; V92_QJP = p.quiqueJogParede; V92_DIRECOES = p.direcoes;
  LIMIAR_QUIQUE = U(p.limiarQuique); COOLDOWN_BOTAO = p.cooldownBotao;
  MARGEM_CHUTE = RAIO_CHUTE - R_JOG; ALCANCE_CHUTE = RAIO_CHUTE + R_BOLA;
  P.r = R_JOG; P.m = MASSA_JOG; B.r = R_BOLA; B.m = MASSA_BOLA; B.I = 0.5*MASSA_BOLA*R_BOLA*R_BOLA;
  try { if (RQ.on && RQ.jog){ for (const q of RQ.jog){ q.r = R_JOG; q.m = MASSA_JOG; } rqGeo(); } } catch (_) {}
}
// as direções da física (8, 16, 32, 64 ou livre): com 32 é a função de sempre
const v92DirecaoAntes = direcaoOriginal;
direcaoOriginal = function(mx, my){
  if (V92_DIRECOES === 32) return v92DirecaoAntes(mx, my);
  return V92_NUC.direcao(mx, my, V92_DIRECOES);
};

/* ---------------------------------------------------------------- 1) a cadência dos quadros */
const V92Q = {real:null, aj:null, der:0, ultLast:null, ivs:[], base:0, cont:0};
const V92Q_FOLGA = 6, V92Q_SERVO = 1;                            // (ms) a folga do relógio da tela e o quanto o jogo acompanha por quadro
const v92FrameAntes = frame;
function v92FrameLimite(now){                                    // o limite de FPS num número inteiro de quadros da tela (fpsInteiro)
  const alvo = FPS.alvo, tela = FPS.tela;
  if (!V92.cfg.fpsInteiro || !(alvo < 120) || !(tela > 3) || !(tela < 1000/alvo*.85)) return v92FrameAntes(now);
  const k = Math.max(1, Math.floor((1000/alvo)/tela + .2));       // 90 Hz → 1 (todos) · 120 Hz → 2 · 144 Hz → 2 · 240 Hz → 4
  if (k > 1 && (V92Q.cont = (V92Q.cont | 0) + 1) % k !== 0){ fpsTela(now); requestAnimationFrame(frame); return; }   // (pula este quadro da tela)
  FPS.alvo = 1000;                                              // (o limite da v91 desligado neste quadro: o quadro já foi escolhido)
  try { return v92FrameAntes(now); } finally { FPS.alvo = alvo; }
}
frame = function(now){
  if (!V92.cfg.dtSnap || !(now > 0)){ V92Q.real = null; return v92FrameLimite(now); }
  if (V92Q.real === null || now < V92Q.real || now - V92Q.real > 250 || last !== V92Q.ultLast){   // começo, aba voltando ou alguém mexeu no relógio do jogo
    V92Q.real = now; V92Q.aj = now; V92Q.der = 0;
    const r = v92FrameLimite(now); V92Q.ultLast = last; return r;
  }
  const dReal = now - V92Q.real; V92Q.real = now;
  // o ritmo da tela: a mediana dos últimos 21 intervalos (um engasgo, uma aba que voltou ou um quadro perdido não mexem nela).
  // Entra no ritmo de 60 Hz (ou 30, 20) ou de 120 Hz com a mediana a menos de 6% dele e só sai a mais de 10% (a oscilação
  // do relógio não liga e desliga o acerto).
  if (dReal > 2 && dReal < 125){ V92Q.ivs.push(dReal); if (V92Q.ivs.length > 21) V92Q.ivs.shift(); }
  const S = 1000/TICKS_POR_S;
  let base = 0, d = dReal;
  if (V92Q.ivs.length >= 5){
    const o = V92Q.ivs.slice().sort((a, b) => a - b), md = o[o.length >> 1];
    const perto = b => { const k = Math.round(md/b), w = V92Q.base === b ? .1 : .06; return k >= 1 && k <= (b < S ? 1 : 3) && Math.abs(md - k*b) < k*b*w; };
    if (perto(S/2)) base = S/2;                                  // 120 Hz: meio passo por quadro
    else if (perto(S)) base = S;                                 // 60, 30 ou 20 Hz
  }
  V92Q.base = base;
  if (!base) V92Q.der = 0;                                       // (sem ritmo certo: o intervalo de verdade, sem diferença guardada)
  if (base){                                                     // o intervalo vira o múltiplo mais perto (1 quadro perdido = 2 passos, certo)
    const dk = Math.max(1, Math.round(dReal/base))*base;
    const der = V92Q.der + dReal - dk;                           // o quanto o relógio de verdade está à frente (+) ou atrás (−) do jogo
    // a diferença que fica dentro da folga (o relógio da tela oscilando em volta do quadro) não mexe em nada: todo quadro
    // tem o mesmo número de passos. Passou da folga (a tela é um pouco mais lenta ou mais rápida que 60 Hz): o jogo acompanha
    // devagar, no máximo V92Q_SERVO ms por quadro (6% do quadro) — nunca um salto de passos inteiros, nunca um intervalo
    // negativo. (Com o desenho "prever" a tampinha e a bola continuam lisas quando um quadro fica com 0 ou 2 passos.)
    const fora = der > V92Q_FOLGA ? der - V92Q_FOLGA : der < -V92Q_FOLGA ? der + V92Q_FOLGA : 0;
    let c = Math.max(-V92Q_SERVO, Math.min(V92Q_SERVO, fora));
    if (Math.abs(fora) > 3*S) c = fora;                          // (um tranco grande do relógio, sem ser um quadro perdido: acerta de uma vez)
    d = Math.max(0, dk + c); V92Q.der = der - (d - dk);
  }
  V92Q.aj += d;
  const r = v92FrameLimite(V92Q.aj);
  V92Q.ultLast = last;
  return r;
};

/* ---------------------------------------------------------------- 2) o desenho entre os passos */
const V92B = {x:0, y:0, vx:0, vy:0, w:0, r:0, m:1, I:1};        // (a bola de mentira da previsão do desenho)
function v92BolaAgora(t){                                       // onde a bola vai estar daqui a t s: anda e bate nas paredes, traves e rede
  const o = V92B; o.x = B.x; o.y = B.y; o.vx = B.vx; o.vy = B.vy; o.w = B.w || 0; o.r = B.r; o.m = B.m; o.I = B.I;
  if (!(t > 0) || (Math.abs(o.vx) + Math.abs(o.vy)) < 1) return o;
  o.x += o.vx*t; o.y += o.vy*t;
  for (let i = 0; i < WALL_SEGS.length; i++){ const w = WALL_SEGS[i]; hitSeg(o, w[0], w[1], w[2], w[3], Q_PAREDE, 0); }
  hitBox(o, GL, GT, GR, GB, Q_PAREDE, 0);
  for (let i = 0; i < POSTS.length; i++){ const q = POSTS[i]; if (q.length === 2) hitPoint(o, q[0], q[1], POST_R, Q_POSTE, 0); }
  for (let i = 0; i < NET_SEGS.length; i++){ const s = NET_SEGS[i]; hitSeg(o, s[0], s[1], s[2], s[3], Q_REDE, 0); }
  return o;
}
function v92VelProxima(){                                        // a velocidade da sua tampinha no próximo passo (com o analógico de agora)
  const d = direcaoOriginal(V92.ultInp.mx, V92.ultInp.my);
  if (!(d.mx || d.my)) return [0, 0];
  let vx = P.vx + d.mx*VEL_JOG, vy = P.vy + d.my*VEL_JOG; const v = Math.hypot(vx, vy);
  if (v > VEL_JOG){ vx *= VEL_JOG/v; vy *= VEL_JOG/v; }
  return [vx, vy];
}
const v92PosVisualAntes = posVisual;
posVisual = function(a){
  v92PosVisualAntes(a);
  try { v92PosVisual(); } catch (e) { V92.cfg.render = 'v91'; try { console.error('v92 · o desenho entre os passos parou (volta o da v91):', e); } catch (_) {} v92PosVisualAntes(a); }
};
function v92PosVisual(){
  const m = V92.cfg.render;
  if (m === 'v91' || RP.ativo || (NET49.playing && !NET49.host) || lobby.aberto) return;   // (o online de quem joga de fora: rede.js)
  const f = Math.max(0, Math.min(1, acc/STEP));
  if (m === 'suave'){
    VIS.px = ANT.px + (P.x - ANT.px)*f; VIS.py = ANT.py + (P.y - ANT.py)*f;
    VIS.bx = ANT.bx + (B.x - ANT.bx)*f; VIS.by = ANT.by + (B.y - ANT.by)*f;
    VIS.a = f;
    return;
  }
  // 'prever': onde cada um está agora (acc s depois do último passo)
  const t = acc;
  if (Math.hypot(P.x - ANT.px, P.y - ANT.py) > U(6) || Math.hypot(B.x - ANT.bx, B.y - ANT.by) > U(8)){ VIS.a = 1; return; }   // (teleporte: saída, gol, replay)
  const par = editing || PAUSA.on || ARB_PARADO();
  if (!par){
    const v = v92VelProxima();
    VIS.px = Math.max(JOG_X0 + P.r, Math.min(JOG_X1 - P.r, P.x + v[0]*t));
    VIS.py = Math.max(JOG_Y0 + P.r, Math.min(JOG_Y1 - P.r, P.y + v[1]*t));
    const b = v92BolaAgora(t); VIS.bx = b.x; VIS.by = b.y;
    VIS.a = 1 + f;
  }
}
// o analógico de cada quadro (a previsão do desenho usa o mesmo que a física vai usar)
const v92GetInputAntes = getInput;
getInput = function(){
  const c = V92.cfg;
  const v91 = c.zonaLiga === V92_V91.zonaLiga && c.zonaDesliga === V92_V91.zonaDesliga && c.folgaDir === V92_V91.folgaDir && V92_DIRECOES === 32;
  const pad = typeof V88PAD !== 'undefined' && V88PAD.ativo && (V88PAD.mx || V88PAD.my);
  const r = (v91 || joy.id === null || pad) ? v92GetInputAntes.apply(this, arguments) : v92Analogico();
  V92.ultInp = r;
  return r;
};
/* ---------------------------------------------------------------- 4) o analógico (a mesma regra da v65, com os números do cfg) */
function v92Analogico(){
  const c = V92.cfg, s = (typeof V88AJ !== 'undefined' && V88AJ.sens) || 1, R = JOY.max*hud.joy.al;
  const dx = joy.dx*s, dy = joy.dy*s, l = Math.hypot(dx, dy)/R;
  if (!AN.ativo){ if (l > c.zonaLiga) AN.ativo = true; }
  else if (l < c.zonaDesliga){ AN.ativo = false; AN.setor = null; }
  joy.ativo = AN.ativo;
  if (!AN.ativo) return {mx:0, my:0};
  const n = V92_DIRECOES, ang = Math.atan2(dy, dx);
  if (!n){ AN.setor = null; return {mx:Math.cos(ang), my:Math.sin(ang)}; }
  const S = TAU/n;
  let k = Math.round(ang/S);
  if (AN.setor !== null && AN.n92 === n){ let d = ang - AN.setor*S; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < S/2 + c.folgaDir) k = AN.setor; }
  k = ((k % n) + n) % n; AN.setor = k; AN.n92 = n;
  return {mx:Math.cos(k*S), my:Math.sin(k*S)};
}

/* ---------------------------------------------------------------- 3) o toque armado do PASSE/CHUTE (treino e bots) */
const V92T = {arma:0, tipo:0};
const v92AmostraAntes = amostraBotoes;
amostraBotoes = function(dt){
  const livre0 = BOTAO.livre, est0 = BOTAO.estado;
  const r = v92AmostraAntes.apply(this, arguments);
  const n = V92_FIS ? V92_FIS.BUFFER_TOQUE : 0;
  if (BOTAO.novo && BOTAO.estado !== 1){ V92.med.toques++; if (n > 0){ V92T.arma = n + 1; V92T.tipo = BOTAO.estado; } }
  if (livre0 && !BOTAO.livre && BOTAO.estado !== 1){ V92T.arma = 0; V92.med.chutes++; return r; }   // (segurado: chutou agora)
  if (V92T.arma > 0){
    V92T.arma--;
    if (V92T.arma > 0 && !(NET49.playing && NET49.localSlot < 0) && Math.hypot(B.x - P.x, B.y - P.y) <= ALCANCE_CHUTE){
      const forte = V92T.tipo === 3;
      if (doKick(forte)){
        V92T.arma = 0; V92.med.chutes++;
        if (BOTAO.estado !== 1) BOTAO.livre = false;           // um chute por toque (segurando, não chuta de novo)
        vibrarChute(forte);
        ARMADO.saiu = forte ? 'power' : 'kick'; ARMADO.saiuT = performance.now();
      }
    } else if (V92T.arma === 0 && est0 !== undefined) V92.med.perdidos++;
  }
  return r;
};
const v92ResetBotoesAntes = resetBotoes;
resetBotoes = function(){ V92T.arma = 0; return v92ResetBotoesAntes.apply(this, arguments); };
// a vibração do iPhone no toque armado: no iPhone a vibração só sai DENTRO do toque (o truque do interruptor da v48), e a
// v91 só vibrava com a bola já no alcance. Com o toque armado, o chute de um toque um pouco adiantado sai depois — quando o
// toque já acabou e o iPhone não vibra mais. Então, no toque: se a bola ainda não está no alcance mas entra nele dentro da
// janela do toque armado (indo como vai), vibra agora, junto com o toque. (No Android o navigator.vibrate vibra quando o
// chute sai, como sempre.)
const v92HapticoAntes = hapticoChute;
hapticoChute = function(){
  const r = v92HapticoAntes.apply(this, arguments);
  try {
    const n = V92_FIS ? V92_FIS.BUFFER_TOQUE : 0;
    if (!HAP.ok || !n || CONTA.vibrar === false || (!BOTAO.livre && BOTAO.estado !== 1)) return r;
    const dx = B.x - P.x, dy = B.y - P.y; if (Math.hypot(dx, dy) <= ALCANCE_CHUTE) return r;   // (no alcance: a da v91 já vibrou)
    const vx = B.vx - P.vx, vy = B.vy - P.vy, vv = vx*vx + vy*vy, T = n*STEP;
    const s = vv > 0 ? Math.max(0, Math.min(T, -(dx*vx + dy*vy)/vv)) : 0;   // o instante em que ficam mais perto, dentro da janela
    if (Math.hypot(dx + vx*s, dy + vy*s) > ALCANCE_CHUTE) return r;
    if (!HAP.el){                                                 // (o mesmo interruptor escondido da v48)
      const l = document.createElement('label'), i = document.createElement('input');
      i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1;
      l.setAttribute('aria-hidden', 'true');
      l.style.cssText = 'position:fixed;left:-300px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden';
      l.appendChild(i); document.body.appendChild(l); HAP.el = l;
      l.addEventListener('click', e => e.stopPropagation());
    }
    HAP.el.click(); V92.med.hapArmado = (V92.med.hapArmado | 0) + 1;
    cv.focus({preventScroll:true});
  } catch (_) {}
  return r;
};

/* ---------------------------------------------------------------- a área de toque dos botões (px a mais em volta) */
const v92BotaoPertoAntes = botaoPerto;
botaoPerto = function(x, y){
  const extra = V92.cfg.areaToque | 0;
  if (!extra) return v92BotaoPertoAntes(x, y);
  let best = null, bd = Infinity;
  for (const k of ['power', 'kick', 'curva', 'finta', 'drible']){
    if (!controleVisivel(k)) continue;
    const c = el(k); if (!hit(x, y, c, 10 + extra)) continue;
    const d = Math.hypot(x - c.x, y - c.y)/c.r; if (d < bd){ bd = d; best = k; }
  }
  return best;
};

/* ---------------------------------------------------------------- a câmera (só se o painel mexer: o padrão é o de sempre) */
const V92_CAM_MOLA0 = Object.assign({}, CAM_MOLA);
const v92CamCorridaAntes = camCorrida;
camCorrida = function(dt, F, snap, hw, hh){
  const lead = V92.cfg.camLead;
  if (lead === V92_V91.camLead || cam.estilo === 'frente') return v92CamCorridaAntes.apply(this, arguments);
  // a mesma conta, com o "à frente" do Seguir jogador escolhido no painel
  if (CAMV.lx === null || snap || !(dt > 0) || Math.hypot(F.x - CAMV.lx, F.y - CAMV.ly) > 400){ CAMV.lx = F.x; CAMV.ly = F.y; CAMV.svx = CAMV.svy = 0; if (snap) CAMV.ax = CAMV.ay = 0; return; }
  const vx = (F.x - CAMV.lx)/dt, vy = (F.y - CAMV.ly)/dt; CAMV.lx = F.x; CAMV.ly = F.y;
  const kv = 1 - Math.exp(-7*dt); CAMV.svx += (vx - CAMV.svx)*kv; CAMV.svy += (vy - CAMV.svy)*kv;
  const sp = Math.hypot(CAMV.svx, CAMV.svy), f = Math.min(1, sp/(VEL_JOG*.85));
  const tx = sp > 1 ? CAMV.svx/sp*f*hw*lead : 0, ty = sp > 1 ? CAMV.svy/sp*f*hh*lead : 0, ka = 1 - Math.exp(-2.4*dt);
  CAMV.ax += (tx - CAMV.ax)*ka; CAMV.ay += (ty - CAMV.ay)*ka;
};
function v92AplicaCamera(){
  const m = V92.cfg.camMola;
  for (const k in V92_CAM_MOLA0) CAM_MOLA[k] = m > 0 ? m : V92_CAM_MOLA0[k];
}

/* ---------------------------------------------------------------- o aro: acompanha o alcance do chute (e o "aro justo" da versão de testes)
   Na v91 a borda de fora do aro (1,245 raio) é o alcance do chute (2,5 u ÷ 2 u). Se o painel muda o alcance ou o tamanho
   da tampinha, o aro acompanha; com o "aro mais justo", ele fica a 1,15 raio (só o desenho: o alcance continua o mesmo). */
const V92_AROV0 = Object.assign({}, AROV);
function v92AplicaAro(){
  const j = !!V92.cfg.aroJusto, k = (RAIO_CHUTE/R_JOG)/1.25, chave = j + '|' + k.toFixed(4);
  if (chave === V92.aroFeito) return;
  V92.aroFeito = chave;
  if (j){ AROV.ate = 1.15; AROV.de = 1.04; AROV.meio = 1.095; }
  else { AROV.ate = V92_AROV0.ate*k; AROV.de = V92_AROV0.de*k; AROV.meio = V92_AROV0.meio*k; }
  try { SPR_ARO.clear(); } catch (_) {}
}

/* ---------------------------------------------------------------- o medidor (passos por quadro, FPS, toques; o online soma o dele) */
const v92FrameMede = frame;
frame = function(now){
  const n0 = V92.med.np | 0;
  const r = v92FrameMede(now);
  const M = V92.med, k = Math.min(3, (M.np | 0) - n0);
  if (!lobby.aberto && !RP.ativo){ M.passos[k]++; M.quadros.push(k); if (M.quadros.length > 240) M.quadros.shift(); }
  return r;
};
const v92PhysicsMede = physicsStep;
physicsStep = function(){ V92.med.np = (V92.med.np | 0) + 1; return v92PhysicsMede.apply(this, arguments); };

/* ---------------------------------------------------------------- aplicar tudo (no começo e a cada mudança do painel) */
function v92Aplica(){
  v92AplicaFisica(V92.cfg.fisica);
  v92AplicaCamera();
  v92AplicaAro();
  if (typeof v92RedeAplica === 'function') v92RedeAplica();
  if (typeof v92PainelSync === 'function') v92PainelSync();
}
v92Carrega();                                                    // (o cfg já vale daqui para baixo; o v92Aplica roda no fim.js, depois de todos)
window.RACHA_V92 = {versao:V92.versao, experimental:V92.exp};   // (para quem embute o jogo saber o que está rodando)
