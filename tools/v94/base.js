/* ======================================================================================================================
   RACHA v94 · O MOTOR PRÓPRIO NO JOGO — a base (tools/v94/*.js, colado depois da v93).
   O motor (server/partida/motor.js, o MESMO arquivo do servidor) foi escrito a partir de docs/v94/ESPECIFICACAO_MOTOR.md.
   Este arquivo liga o motor ao jogo sem mexer no resto (bots, regras, treinos, HUD, câmera, replay):
     1) o PERFIL: dois campos novos no cfg da versão de testes — `motor` ('v94' = o próprio, 'v93' = o de antes) e
        `fisica94` (os números do motor próprio) — nos perfis, nas memórias A/B, no exportar/importar e no nome curto;
     2) as CONSTANTES DE COMPATIBILIDADE: o jogo inteiro (bots, treinos, desenho) lê R_JOG, VEL_JOG, ALCANCE_CHUTE,
        FORCA_KICK… Com o motor próprio elas passam a dizer os números dele (em px e px/s, como sempre), só para quem lê;
        quem calcula a física é o motor;
     3) o CAMPO: com o motor próprio, as medidas da quadra (linhas, gols, traves, redes, a área da tampinha e as marcas)
        saem da regra do motor (M.campo), convertidas para os px do jogo (V94_PX px por metro).
   O passo da física (o treino, a partida contra os bots, o tutorial) com o motor próprio mora em jogo.js.
   ====================================================================================================================== */
const V94M = window.RachaMotor || null;                          // o motor (o build cola server/partida/motor.js no jogo)
const V94_PX = 95;                                               // px do mundo do jogo por metro do motor: a tampinha de 0,40 m de raio
                                                                 //   fica com os 38 px de sempre (o desenho não muda de tamanho)
// o motor que vale sem o painel de testes: o de antes até a etapa 8. O config.js da publicação escolhe sem refazer o build
// (window.RACHA_CONFIG.motor = 'v94' liga o motor próprio para todo mundo); o servidor tem a mesma chave (RACHA_MOTOR_JOGO)
const V94_MOTOR_PADRAO = (() => { const c = window.RACHA_CONFIG && window.RACHA_CONFIG.motor; return c === 'v93' || c === 'v94' ? c : 'v93'; })();
const V94 = {
  motor:'v93', R:null, G:null, n:0,                              // o motor que está valendo; o perfil resolvido; o campo (metros)
  campoOk:false,                                                 // o campo atual é do motor próprio (Arena ou Estádio, futebol ou curva)
  sala:null,                                                     // numa sala online: o motor da rodada ('v94' | 'v93'), que vale no lugar do do painel
};
const v94Ligado = () => V94.motor === 'v94' && !!V94.R;

/* ---------------------------------------------------------------- 1) o perfil (no cfg da v92) */
const v94LimpaAntes = v92Limpa;
v92Limpa = function(o, base){
  const c = v94LimpaAntes(o, base);
  // (o "PADRÃO v92" e o "RESTAURAR v91" do painel são os perfis do motor de antes: valem com ele; o resto, o padrão)
  const padrao = base === V92_V91 || o === V92_V91 || o === V92_PADRAO ? 'v93' : V94_MOTOR_PADRAO;
  c.motor = o && (o.motor === 'v94' || o.motor === 'v93') ? o.motor : padrao;
  c.fisica94 = V94M ? V94M.perfil(o && o.fisica94) : null;
  c.direcoes94 = o && [0, 8, 16, 32].includes(o.direcoes94) ? o.direcoes94 : 0;   // o analógico com o motor próprio: 0 = livre (analogico.js)
  c.camera94 = o && o.camera94 === 'antes' ? 'antes' : 'obs';     // a câmera com o motor próprio: a dos vídeos ou a de antes (camera.js)
  return c;
};
const V94_PERFIL_PADRAO = V94M ? Object.freeze(V94M.perfil(V94M.PADRAO)) : null;
function v94CfgPadrao(){ return v92Limpa(Object.assign({}, V92_PADRAO, {motor:'v94', fisica94:V94_PERFIL_PADRAO}), V92_PADRAO); }   // o "PADRÃO v94" do painel
const v94CurtoAntes = v92Curto;
v92Curto = function(c){
  if (!c || c.motor !== 'v94') return v94CurtoAntes(c) + (c && c.motor === 'v93' && V94_MOTOR_PADRAO === 'v94' ? ' (motor de antes)' : '');
  return JSON.stringify(c.fisica94) === JSON.stringify(V94_PERFIL_PADRAO) ? 'v94' : 'v94 · ajuste';
};
v92Carrega();                                                    // (de novo, agora com os campos do motor: o salvo no aparelho volta inteiro)

/* ---------------------------------------------------------------- 2) as constantes de compatibilidade */
function v94Compat(){
  const R = V94.R, S = V94_PX, k = TICKS_POR_S;
  R_JOG = R.rJ*S; R_BOLA = R.rB*S;
  ALCANCE_CHUTE = V94M.alcance(R)*S; RAIO_CHUTE = ALCANCE_CHUTE - R_BOLA; MARGEM_CHUTE = RAIO_CHUTE - R_JOG;
  VEL_JOG = R.vMax*S;
  MASSA_BOLA = 1;                                                // (Δv = força ÷ massa: com massa 1 a "força" é a velocidade em u/s)
  FORCA_KICK = R.vPasse*S/PX_POR_U; FORCA_POWER = R.vChute*S/PX_POR_U;
  LIMITE_VEL_BOLA = R.vMaxBola*S;
  FATOR_BOLA = Math.pow(0.5, 1/(R.meiaVida*k));                  // (só o freio proporcional: quem prevê a bola — bots e treino — usa isto)
  for (const c of CAMPOS) if (c.v92Fator !== false) c.fatorBola = FATOR_BOLA;
  P.r = R_JOG; B.r = R_BOLA; B.m = MASSA_BOLA;
  try { if (RQ.on && RQ.jog){ for (const q of RQ.jog) q.r = R_JOG; rqGeo(); } } catch (_) {}
}

/* ---------------------------------------------------------------- 3) o campo do motor próprio, em px */
function v94CampoSuportado(){                                    // Arena e Estádio (a quadra com rede e gol pela boca), futebol e curva
  if (!CAMPO || !CAMPO.rede || !CAMPO.entraGol || CAMPO.golRua || CAMPO.imagem || CAMPO.morro) return false;
  if (RQ.on && RQ.jogo && RQ.jogo !== 'futebol' && RQ.jogo !== 'curva') return false;
  return true;
}
const v94AplicaModoAntes = aplicaModo;
aplicaModo = function(i, c){
  v94AplicaModoAntes(i, c);
  V94.campoOk = false;
  if (v94Ligado() && v94CampoSuportado()) v94Geometria(i + 1);
};
function v94Geometria(n){
  const G = V94M.campo(n, V94.R), S = V94_PX, cp = CAMPO;
  V94.G = G; V94.n = n; V94.campoOk = true;
  const pw = (G.area.x1 - G.area.x0)*S, ph = (G.area.y1 - G.area.y0)*S;
  MW = Math.round(pw + 2*cp.margem[0]); MH = Math.round(ph + 2*cp.margem[1]);
  QUADRO_W = pw + 2*MARGEM_X; QUADRO_H = ph + 2*(MARGEM_Y + (cp.quadroExtra || 0));
  CX = MW/2; CY = MH/2;
  const px = x => CX + x*S, py = y => CY + y*S;
  GRAMADO.x0 = px(G.area.x0); GRAMADO.x1 = px(G.area.x1); GRAMADO.y0 = py(G.area.y0); GRAMADO.y1 = py(G.area.y1);
  LINHAS.x0 = px(G.linhas.x0); LINHAS.x1 = px(G.linhas.x1); LINHAS.y0 = py(G.linhas.y0); LINHAS.y1 = py(G.linhas.y1);
  GL = GRAMADO.x0; GR = GRAMADO.x1; GT = GRAMADO.y0; GB = GRAMADO.y1;
  LX0 = LINHAS.x0; LX1 = LINHAS.x1; LY0 = LINHAS.y0; LY1 = LINHAS.y1;
  GOL_PROF = G.fundo*S; GOL_Y0 = CY - G.boca/2*S; GOL_Y1 = CY + G.boca/2*S;
  REDE_E = Math.max(4, 0.05*S);
  POCKET_L.x0 = LX0 - GOL_PROF; POCKET_L.x1 = LX0; POCKET_R.x0 = LX1; POCKET_R.x1 = LX1 + GOL_PROF;
  POST_R = G.traves[0].r*S; Q_POSTE = Q_TRAVE; ATRITO_POSTE = ATRITO_TRAVE_BOLA;
  POSTS.length = 0; NET_SEGS.length = 0; WALL_SEGS.length = 0; OBST.length = 0; JOG_SEGS.length = 0; CHINELOS.length = 0;
  for (const t of G.traves) POSTS.push([px(t.x), py(t.y)]);
  for (const s of G.redes) NET_SEGS.push([px(s.x0), py(s.y0), px(s.x1), py(s.y1)]);
  for (const s of G.paredesBola) WALL_SEGS.push([px(s.x0), py(s.y0), px(s.x1), py(s.y1)]);
  JOG_SEGS.push(...NET_SEGS); for (const q of POSTS) OBST.push([q[0], q[1], POST_R]);
  JOG_X0 = GL; JOG_X1 = GR; JOG_Y0 = GT; JOG_Y1 = GB;
  START_P.x = CX - 3*2*V94.R.rJ*S; START_P.y = CY;              // (o treino livre: a tampinha começa 3 d à esquerda do centro)
  const M = G.marcas;
  MARCAS.areaW = M.areaGrande.profundidade*S; MARCAS.areaH = M.areaGrande.largura*S;
  MARCAS.pequenaW = M.areaPequena.profundidade*S; MARCAS.pequenaH = M.areaPequena.largura*S;
  // a marca do pênalti e a meia-lua (o motor dá os pontos e os arcos; o desenho do jogo quer a distância até a linha e o raio)
  const pen = Array.isArray(M.penalti) ? G.L/2 - Math.abs(M.penalti[M.penalti.length - 1].x) : +M.penalti || 0;
  const lua = Array.isArray(M.meiaLua) ? M.meiaLua[M.meiaLua.length - 1].r : +M.meiaLua || 0;
  MARCAS.penalti = pen*S; MARCAS.circulo = G.circulo*S; MARCAS.saida = G.circulo*S;
  MARCAS.luaC = pen*S; MARCAS.luaR = lua*S;
}

/* ---------------------------------------------------------------- 4) aplicar o perfil (a cada mudança do cfg) */
const v94AplicaAntes = v92Aplica;
v92Aplica = function(){
  v94AplicaAntes();                                              // (o motor de antes: v92AplicaFisica põe os números dele)
  v94AplicaMotor();
};
function v94AplicaMotor(){
  if (V94.sala && NET49.playing) return;                         // (numa sala online vale o motor da sala: o painel vale de novo na saída)
  const c = V92.cfg, era = V94.motor;
  V94.motor = c && c.motor === 'v94' && V94M ? 'v94' : 'v93';
  V94.R = V94.motor === 'v94' ? V94M.resolve(c.fisica94 || V94M.PADRAO) : null;
  if (V94.motor === 'v94') v94Compat();
  // o campo de agora com as medidas do motor que vale (a partida ou o treino em andamento recomeçam do jeito certo)
  try { aplicaModo(modo, campo); if (typeof v94MundoNovo === 'function') v94MundoNovo('perfil'); if (typeof buildStatic === 'function') buildStatic(); } catch (_) {}
  if (era !== V94.motor && typeof v94MotorMudou === 'function') v94MotorMudou(era);
}
window.RACHA_V94 = {motor:() => V94.motor, versao:V94M ? V94M.VERSAO : null};
