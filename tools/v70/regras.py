# RACHA rua v70 · Etapa 1 — regras e resultados
# Cada par (antes, depois) precisa aparecer exatamente uma vez no arquivo (o aplicar_rua.py confere).
# SUBS_PHYS: trocas dentro do bloco PHYS_START..PHYS_END. Só funções de regra, texto e dados do replay; a conferência do
# aplicar_rua.py aplica estas mesmas trocas no bloco original e exige que o resultado seja idêntico ao do arquivo final
# (nenhuma outra linha do bloco pode mudar: a física fica byte a byte igual).

SUBS_PHYS = [
  # touchdown: só com um jogador do time que ataca conduzindo a bola na travessia (o defensor perto não conta mais)
  (r"""  const encostado = RQ.jog.some(q => Math.hypot(q.x - B.x, q.y - B.y) <= q.r + B.r + 8);
  if (encostado) return lado;                          // touchdown: alguém carregou a bola para dentro (empilhado vale)
""",
   r"""  const time = lado > 0 ? 0 : 1;                       // v70: touchdown só com um jogador do time que ataca conduzindo: colado na bola e com toque nela agora há pouco
  let por = null, pd = 1e9;                            // (o defensor perto da bola não conta: não transforma chutão em touchdown)
  for (const q of RQ.jog){
    if (q.time !== time) continue;
    const d = Math.hypot(q.x - B.x, q.y - B.y);
    if (d <= q.r + B.r + 8 && d < pd && RQ.tick - mdUltToque(q) <= MD_TD_TOQUE){ por = q; pd = d; }
  }
  if (por){ RQ.tdPortador = por; return lado; }        // touchdown: quem ataca carregou a bola para dentro (empilhado vale, se ele está com ela)
"""),
  # o título do replay: o mesmo texto da faixa do jogo e da sala online (rqTextoLance), do lado de quem gravou
  (r"""function rpTitulo(R){                                  // {t: GOL! / GOL DELES / GOL CONTRA, s: GOL DE FULANO (ou ''), nosso}
  const I = R.info || {}, nosso = (I.time | 0) === 0, md = I.jogo || 'futebol';
  const acao = md === 'volei' ? 'PONTO' : md === 'americano' ? 'TOUCHDOWN' : md === 'basquete' ? 'CESTA' : 'GOL';
  if (I.livre) return {t:nosso ? 'GOL!' : 'GOL CONTRA', s:'', nosso};
  if (I.ginga) return {t:nosso ? 'GOL DE GINGA!' : 'GINGA DELES', s:(I.autor ? 'GOL DE ' + String(I.autor).toUpperCase() + ' · ' : '') + '+' + (I.pts || 2) + ' PONTOS', nosso};   // v61
  return {t:nosso ? acao + '!' : acao + ' DELES', s:I.autor ? acao + ' DE ' + String(I.autor).toUpperCase() : I.contra ? (nosso ? 'GOL CONTRA DELES' : 'GOL CONTRA') : '', nosso};
}""",
   r"""function rpTitulo(R){                                  // {t: GOL! / GOL DELES / GOL CONTRA, s: GOL DE FULANO (ou ''), nosso}
  const I = R.info || {}, nosso = (I.time | 0) === (I.meu | 0);   // v70: do lado de quem gravou (na sala, você pode ser o azul)
  if (I.livre) return {t:nosso ? 'GOL!' : 'GOL CONTRA', s:'', nosso};
  return rqTextoLance(I, nosso, true);                 // v70: a regra única (autor, gol contra, desvio, unidade do modo; o passe vai na linha de baixo do replay)
}"""),
  # o replay guarda quem fez contra, o desvio e o lado de quem gravou
  (r"""      jogo:String(I.jogo || 'futebol'), pts:I.pts | 0, ginga:!!I.ginga},   // v61: o modo e o GOL DE GINGA chegam ao título do replay""",
   r"""      jogo:String(I.jogo || 'futebol'), pts:I.pts | 0, ginga:!!I.ginga,   // v61: o modo e o GOL DE GINGA chegam ao título do replay
      contraDe:String(I.contraDe || ''), desvio:String(I.desvio || ''), meu:I.meu ? 1 : 0},   // v70: quem fez contra, em quem desviou e o lado de quem gravou"""),
  (r"""        jogo:mdValida(String(I.jogo || 'futebol')), pts:Math.max(0, Math.min(3, I.pts | 0)), ginga:!!I.ginga}, cmp,""",
   r"""        jogo:mdValida(String(I.jogo || 'futebol')), pts:Math.max(0, Math.min(3, I.pts | 0)), ginga:!!I.ginga,
        contraDe:limpaNome(String(I.contraDe || '')), desvio:limpaNome(String(I.desvio || '')), meu:I.meu ? 1 : 0}, cmp,   // v70"""),
]

SUBS = [
  # o começo da partida zera também os pontos, os gols contra e o lance
  ("  RQ.placar = [0, 0]; RQ.tick = 0; RQ.t = 0; RQ.prorrog = false; RQ.fimPendente = false; RQ.fimT = 0; RQ.golsH = RQ.assistH = 0;\n",
   "  RQ.placar = [0, 0]; RQ.tick = 0; RQ.t = 0; RQ.prorrog = false; RQ.fimPendente = false; RQ.fimT = 0; RQ.golsH = RQ.assistH = 0;\n"
   "  RQ.ptsH = RQ.contraH = 0; RQ.golAutor = null; RQ.tdPortador = null; RQ.ultLance = null;   // v70: os pontos (cestas de 2/3, gol de ginga), os gols contra e o lance\n"),
  # a saída zera o lance: a sequência de toques, a origem do arremesso e o portador do touchdown
  ("  RQ.saidaTime = t; RQ.estado = 'saida'; RQ.saidaT0 = RQ.tick; RQ.toques.length = 0; RQ.ultPor = [null, null]; rpCorte();",
   "  RQ.saidaTime = t; RQ.estado = 'saida'; RQ.saidaT0 = RQ.tick; RQ.toques.length = 0; RQ.ultPor = [null, null]; rpCorte();\n"
   "  RQ.chuteDe = null; RQ.tdPortador = null; RQ.golAutor = null;   // v70: a saída zera o lance (a cesta nova não herda o arremesso de antes)"),
  # a sequência de toques: o começo de cada toque (t0) e o último chute (chute); o adversário que fica com a bola invalida o arremesso
  (r"""  if (u && u.p === q){u.tick=RQ.tick;if(RQ.mind&&RQ.mind.ultimo&&RQ.mind.ultimo.p===q)Object.assign(RQ.mind.ultimo,{tick:RQ.tick,x:q.x,y:q.y});} else { rqEliteToque(q,u);h.push({p:q, tick:RQ.tick}); if (h.length > 12) h.shift(); rqHmToque(q); }
  RQ.ultPor[q.time] = {p:q, tick:RQ.tick};
""",
   r"""  if (u && u.p === q){u.tick=RQ.tick;if(RQ.mind&&RQ.mind.ultimo&&RQ.mind.ultimo.p===q)Object.assign(RQ.mind.ultimo,{tick:RQ.tick,x:q.x,y:q.y});} else { rqEliteToque(q,u);h.push({p:q, t0:RQ.tick, tick:RQ.tick, chute:-1}); if (h.length > 12) h.shift(); rqHmToque(q); }   // v70: t0 = o começo deste toque · chute = o último chute nele
  RQ.ultPor[q.time] = {p:q, tick:RQ.tick};
  const cd = RQ.chuteDe, e = h[h.length - 1];         // v70: o adversário ficou com a bola (mais que um desvio): o arremesso que estava no ar perde a validade
  if (cd && cd.time !== q.time && e.tick - e.t0 > RQ_DESVIO_TK) RQ.chuteDe = null;
"""),
  # o chute do bot (e de quem joga de fora na sala) guarda de quem e quando
  ("  RQ.chuteDe = {x:B.x, y:B.y, time:q.time}; mdAplicaCurva(q, dx, dy, d, forca);   // v59: origem do chute (3 pontos) e a curva",
   "  RQ.chuteDe = {x:B.x, y:B.y, time:q.time, p:q, tick:RQ.tick}; mdAplicaCurva(q, dx, dy, d, forca);   // v59: origem do chute (3 pontos) e a curva · v70: de quem e quando"),
  # todo chute (seu, do bot, de quem joga de fora, a curva) passa pelo rqHmChute: ali ele entra na sequência
  ("function rqHmChute(q, forca){                          // (rqChuta, doKick) depois de um chute de q\n  xeChutou(q);xkChute(q);",
   "function rqHmChute(q, forca){                          // (rqChuta, doKick) depois de um chute de q\n  rqMarcaChute(q, forca);                              // v70: o chute entra na sequência de toques (e a conta de \"ia no gol\")\n  xeChutou(q);xkChute(q);"),
]

RQGOL_ANTES = r"""function rqGol(lado){                                  // a bola passou da linha do gol: lado 1 = gol da direita (do azul) = gol do vermelho
  if (RQ.estado !== 'jogo' && RQ.estado !== 'saida') return;   // (a bola que entra na comemoração não vale)
  const time = lado > 0 ? 0 : 1;
  let pts = 1;                                         // v59: no basquete a cesta vale 2 (ou 3, de fora do arco)
  if (RQ.jogo === 'basquete'){
    const hx = lado > 0 ? LX1 : LX0, cd = RQ.chuteDe;
    pts = cd && cd.time === time && Math.hypot(cd.x - hx, cd.y - CY) > (RQ.tres || 0) ? 3 : 2;
  }
  if (RQ.jogo === 'ginga' && gnGolDeGinga(time)){ pts = 2; RQ.ev.ginga = true; }   // v61: GOL DE GINGA vale 2
  RQ.placar[time] += pts; RQ.estado = 'gol'; RQ.golT = 0; RQ.golTime = time; RQ.ev.gol = time; RQ.ev.pts = pts;
  const a = RQ.ultPor[time], vale = a && RQ.tick - a.tick < 240;   // o gol é de quem do time marcou tocou por último
  RQ.ev.contra = !vale;
  if (vale){
    RQ.ev.autor = a.p;
    if (a.p.humano){ RQ.ev.golH = true; RQ.golsH++; }
    const h = RQ.toques; let i = h.length - 1;          // assistência: o toque de um companheiro logo antes (sem adversário no meio)
    while (i >= 0 && h[i].p !== a.p) i--;
    const ant = i > 0 ? h[i - 1] : null;
    if (ant && ant.p.time === time && RQ.tick - ant.tick <= ASSIST_TICKS){ RQ.ev.assist = ant.p; if (ant.p.humano){ RQ.ev.assistH = true; RQ.assistH++; } }
  }
  if (RQ.placar[time] >= (RQ.meta || 3)) RQ.fimPendente = true;               // morte súbita: o gol acaba o jogo (v59: a meta vem do modo)
  rpMarcaGol({time, placar:RQ.placar.slice(), autor:vale ? (a.p.humano ? perfil.nome : a.p.nome) : '', assist:RQ.ev.assist ? (RQ.ev.assist.humano ? perfil.nome : RQ.ev.assist.nome) : '', contra:!vale, jogo:RQ.jogo, pts, ginga:!!RQ.ev.ginga});   // v45 · v59: o modo vai junto (TOUCHDOWN! no replay)

  try{ if (RQ.ev.golH && RQ.ev.ginga) window.__rachaGingaH = (window.__rachaGingaH | 0) + 1; }catch(_){}
}"""

RQGOL_DEPOIS = r"""function rqGol(lado){                                  // a bola passou da linha do gol: lado 1 = gol da direita (do azul) = gol do vermelho
  if (RQ.estado !== 'jogo' && RQ.estado !== 'saida') return;   // (a bola que entra na comemoração não vale)
  const time = lado > 0 ? 0 : 1, md = RQ.jogo, e = RQ.ev, L = rqLance(time);   // v70: quem fez, pela sequência de toques (a regra única: rqLance, logo abaixo)
  let pts = md === 'basquete' ? (L.tres ? 3 : 2) : 1;  // v59: no basquete a cesta vale 2 (ou 3, de fora do arco) · v70: os 3 só do arremesso atual do autor
  if (md === 'ginga' && gnGolDeGinga(time) && !L.contra){ pts = 2; e.ginga = true; }   // v61: GOL DE GINGA vale 2 · v70: gol contra não vira gol de ginga (a janela fecha do mesmo jeito)
  RQ.placar[time] += pts; RQ.estado = 'gol'; RQ.golT = 0; RQ.golTime = time; e.gol = time; e.pts = pts;
  e.autor = L.autor; e.assist = L.assist; e.contra = L.contra; e.contraDe = L.contraDe; e.desvio = L.desvio;
  RQ.golAutor = L.autor; RQ.ultLance = L;              // (a comemoração do autor e os testes)
  if (L.autor && L.autor.humano){ e.golH = true; RQ.golsH++; RQ.ptsH = (RQ.ptsH | 0) + pts; }
  if (L.assist && L.assist.humano){ e.assistH = true; RQ.assistH++; }
  if (L.contraDe && L.contraDe.humano){ e.contraH = true; RQ.contraH = (RQ.contraH | 0) + 1; }
  if (RQ.placar[time] >= (RQ.meta || 3)) RQ.fimPendente = true;               // morte súbita: o gol acaba o jogo (v59: a meta vem do modo)
  rpMarcaGol({time, placar:RQ.placar.slice(), autor:rqNomeDe(L.autor), assist:rqNomeDe(L.assist), contra:L.contra, contraDe:rqNomeDe(L.contraDe), desvio:rqNomeDe(L.desvio),
    jogo:md, pts, ginga:!!e.ginga, meu:NET49.playing && NET49.localSlot >= 0 ? P.time | 0 : 0});   // v45 · v59 · v70: o replay leva a mesma classificação

  try{ if (e.golH && e.ginga) window.__rachaGingaH = (window.__rachaGingaH | 0) + 1; }catch(_){}
}

/* ---- v70: a regra de autoria — uma só para o placar, a faixa, o replay, as estatísticas, o prêmio, a sala online e a plataforma ----
   RQ.toques: cada jogador que encostou na bola, em ordem; toques seguidos do mesmo viram um só (t0 = o primeiro tick desse toque,
   tick = o último, chute = o tick do último chute/passe dele nesse toque). RQ.chuteDe: o último chute — de onde, de quem, quando e
   se a bola, do jeito que saiu do pé e sem ninguém no caminho, ia entrar (alvo; paredes e traves contam).
   · O último toque decide. Se é de alguém do time que marcou, o gol é dele.
   · Se é de quem sofreu, é GOL CONTRA (dele) — a não ser que tenha sido só um desvio: um ou mais toques curtos (até RQ_DESVIO_TK
     ticks cada) de quem sofreu num chute do time que marcou que já ia no gol, com o gol saindo logo (até RQ_DESVIO_JANELA ticks
     depois). Aí o gol é de quem chutou ("desviou em ..."). Quem dominou a bola (toque mais longo) e mandou para dentro fez contra.
   · Assistência: o toque imediatamente antes do autor, se é de um companheiro e foi até ASSIST_TICKS antes do gol. Qualquer toque
     adversário entre o passe e o autor (interceptação, corte ou desvio) acaba com ela.
   · AMERICANO: o touchdown é de quem conduziu a bola pela linha (RQ.tdPortador, conferido no mdCruzou); não há touchdown contra.
   · BASQUETE: 3 pontos só quando a cesta sai do arremesso atual do autor — o chute dele neste toque, sem encostar de novo depois —
     de fora do arco. A saída zera a origem, e o adversário que fica com a bola também.
   · GINGA: gol contra não é GOL DE GINGA. */
const RQ_DESVIO_TK = 6, RQ_DESVIO_JANELA = 120, MD_TD_TOQUE = 30;   // ticks: o toque curto (desvio) · o gol logo depois do desvio · o portador do touchdown tocou na bola agora há pouco
const RQ_BUF_ALVO = {pts:[], arr:[]}, RQ_CV_ALVO = new Float32Array(360);
function rqLance(time){                                // quem fez o ponto do time "time": {autor, assist, contra, contraDe, desvio, tres, i}
  const h = RQ.toques, n = h.length, L = {autor:null, assist:null, contra:false, contraDe:null, desvio:null, tres:false, i:-1};
  const td = RQ.td && RQ.tdPortador && RQ.tdPortador.time === time ? RQ.tdPortador : null; RQ.tdPortador = null;
  if (td){ let i = n - 1; while (i >= 0 && h[i].p !== td) i--; L.autor = td; L.i = i; rqAssist(L, h, time); return L; }   // americano: quem conduziu
  if (!n) return L;                                    // ninguém encostou desde a saída: o ponto fica sem autor
  let i = n - 1;
  if (h[i].p.time !== time){                           // o último toque foi de quem sofreu: desvio de um chute que ia no gol, ou gol contra
    let j = i; while (j >= 0 && h[j].p.time !== time && h[j].tick - h[j].t0 <= RQ_DESVIO_TK) j--;
    const k = j >= 0 ? h[j] : null, cd = RQ.chuteDe;
    if (k && k.p.time === time && cd && cd.p === k.p && cd.alvo && cd.tick >= k.t0 && k.tick - cd.tick <= 4 && RQ.tick - h[i].tick <= RQ_DESVIO_JANELA){ L.desvio = h[i].p; i = j; }
    else { L.contra = true; L.contraDe = h[i].p; return L; }
  }
  L.autor = h[i].p; L.i = i; rqAssist(L, h, time);
  if (RQ.jogo === 'basquete'){                         // 3 pontos: o arremesso atual do autor, de fora do arco
    const cd = RQ.chuteDe, u = h[i], hx = time === 0 ? LX1 : LX0;
    L.tres = !!(cd && cd.p === u.p && cd.tick >= u.t0 && u.tick - cd.tick <= 4 && Math.hypot(cd.x - hx, cd.y - CY) > (RQ.tres || 0));
  }
  return L;
}
function rqAssist(L, h, time){                         // o passe para o autor: o toque logo antes do dele, de um companheiro, sem adversário no meio
  const a = L.i > 0 ? h[L.i - 1] : null;
  if (a && a.p !== L.autor && a.p.time === time && RQ.tick - a.tick <= ASSIST_TICKS) L.assist = a.p;
}
function mdUltToque(q){ const h = RQ.toques; for (let i = h.length - 1; i >= 0; i--) if (h[i].p === q) return h[i].tick; return -1e9; }   // (mdCruzou) o último tick em que q encostou na bola
function rqMarcaChute(q, forca){                       // (rqHmChute) o chute ou passe de q: marca o toque dele e guarda se a bola, como saiu, ia no gol
  if (!RQ.on) return;
  const h = RQ.toques, u = h[h.length - 1];
  if (u && u.p === q) u.chute = RQ.tick;
  let cd = RQ.chuteDe;
  if (!cd || (cd.p && cd.p !== q)) cd = RQ.chuteDe = {x:B.x, y:B.y, time:q.time};
  cd.p = q; cd.time = q.time; cd.tick = RQ.tick; cd.forte = forca >= FORCA_POWER; cd.alvo = rqNoAlvo(q.time);
}
function rqNoAlvo(time){                               // o caminho da bola agora (paredes e traves, sem ninguém no meio) termina no gol que "time" ataca?
  const lado = time === 0 ? 1 : -1;
  if (RQ.jogo === 'curva' && B.cvT > 0){             // com curva: o caminho com o efeito (sem batidas: para na primeira linha que cruzar)
    const n = cvSimula(B.x, B.y, B.vx, B.vy, B.cv || 0, B.cvT, 180, RQ_CV_ALVO); let x0 = B.x, y0 = B.y;
    for (let i = 0; i < n; i++){
      const x1 = RQ_CV_ALVO[2*i], y1 = RQ_CV_ALVO[2*i + 1], l = golCruzou(x0, y0, x1, y1);
      if (l) return l === lado;
      if (y1 < LY0 || y1 > LY1 || x1 < LX0 - GOL_PROF || x1 > LX1 + GOL_PROF) return false;
      x0 = x1; y0 = y1;
    }
    return false;
  }
  const a = rqTrajeto(B.vx, B.vy, 90, 2/TICKS_POR_S, RQ_BUF_ALVO), u = a[a.length - 1];
  return !!(u && u.gol && (u.x > CX ? 1 : -1) === lado);
}
function rqNomeDe(q){ return !q ? '' : String((q === P || (q.humano && !q.remote) ? perfil.nome : q.nome) || ''); }
const MD_UN = {                                        // v70: o nome do ponto de cada modo (faixa, replay, placar, fim de jogo, sala)
  futebol:  {acao:'GOL', um:'gol', varios:'gols', placar:'gols', contra:'GOL CONTRA'},
  curva:    {acao:'GOL', um:'gol', varios:'gols', placar:'gols', contra:'GOL CONTRA'},
  ginga:    {acao:'GOL', um:'gol', varios:'gols', placar:'pontos', contra:'GOL CONTRA'},   // (o GOL DE GINGA vale 2: o placar conta pontos)
  volei:    {acao:'PONTO', um:'ponto', varios:'pontos', placar:'pontos', contra:'PONTO CONTRA'},
  americano:{acao:'TOUCHDOWN', curto:'TD', um:'touchdown', varios:'touchdowns', placar:'touchdowns', contra:'TOUCHDOWN CONTRA'},
  basquete: {acao:'CESTA', um:'cesta', varios:'cestas', placar:'pontos', contra:'CESTA CONTRA'}};
function mdUn(md){ return MD_UN[md] || MD_UN.futebol; }
function mdMetaTxt(){                                  // v70: a meta da partida, com a unidade do modo (a apresentação, a sala e o fim)
  const un = mdUn(RQ.jogo), m = RQ.meta || 3;
  if (RQ.tempoLim) return Math.round(RQ.tempoLim/60) + ' MIN · NO EMPATE, QUEM MARCAR PRIMEIRO';
  return 'PRIMEIRO A ' + m + ' ' + (m === 1 ? un.um : un.placar).toUpperCase();
}
function rqTextoLance(I, nosso, semPasse){            // v70: o texto do lance — {t: GOL! / CESTA DE 3! / TD DELES ..., s: a linha de baixo, nosso} · semPasse: o replay mostra o passe numa linha própria
  const md = I.jogo || 'futebol', un = mdUn(md), pts = I.pts | 0, N = x => String(x || '').toUpperCase(), s = [];
  const ginga = !!I.ginga && !I.contra;
  const t = ginga ? (nosso ? 'GOL DE GINGA!' : 'GINGA DELES')
    : md === 'basquete' && pts === 3 ? (nosso ? 'CESTA DE 3!' : 'CESTA DE 3 DELES')
    : nosso ? un.acao + '!' : (un.curto || un.acao) + ' DELES';
  if (I.contra) s.push(I.contraEu ? un.contra + ' (VOCÊ)' : I.contraDe ? un.contra + ' DE ' + N(I.contraDe) : un.contra);
  else if (I.autor && !I.autorEu) s.push(un.acao + ' DE ' + N(I.autor));
  if (!I.contra && I.desvio) s.push('DESVIOU EM ' + N(I.desvio));
  if (!I.contra && I.assistEu) s.push('ASSISTÊNCIA SUA!');
  else if (!I.contra && I.assist && !semPasse) s.push('PASSE DE ' + N(I.assist));
  if (md === 'basquete' || ginga) s.push('+' + (pts || 2) + ' PONTOS');
  while (s.length > 2 && s.join(' · ').length > 34) s.splice(s.length - 2, 1);   // (cabe na fita: sai o do meio, ficam o autor e os pontos)
  return {t, s:s.join(' · '), nosso};
}"""

SUBS.append((RQGOL_ANTES, RQGOL_DEPOIS))

SUBS += [
  # o fim da partida leva o modo, os pontos e os gols contra (estatísticas, plataforma)
  ("  RQ.resultado = {placar:RQ.placar.slice(), venceu:RQ.placar[0] > RQ.placar[1], golsH:RQ.golsH, assistH:RQ.assistH, n:RQ.n, mapa:RQ.mapa, nivel:RQ.nivel, abandono:false};",
   "  RQ.resultado = {placar:RQ.placar.slice(), venceu:RQ.placar[0] > RQ.placar[1], golsH:RQ.golsH, assistH:RQ.assistH, n:RQ.n, mapa:RQ.mapa, nivel:RQ.nivel, abandono:false,\n"
   "    jogo:RQ.jogo || 'futebol', ptsH:RQ.ptsH | 0, contraH:RQ.contraH | 0};   // v70: o modo, os pontos e os gols contra"),
  ("  RQ.resultado = {placar:RQ.placar.slice(), venceu:false, golsH:RQ.golsH, assistH:RQ.assistH, n:RQ.n, mapa:RQ.mapa, nivel:RQ.nivel, abandono:true, mostrado:true};",
   "  RQ.resultado = {placar:RQ.placar.slice(), venceu:false, golsH:RQ.golsH, assistH:RQ.assistH, n:RQ.n, mapa:RQ.mapa, nivel:RQ.nivel, abandono:true, mostrado:true,\n"
   "    jogo:RQ.jogo || 'futebol', ptsH:RQ.ptsH | 0, contraH:RQ.contraH | 0};   // v70"),
  # a comemoração: o autor da regra única (gol contra: ninguém corre para comemorar)
  ("  const t = RQ.golTime, a = RQ.ultPor[t], autor = a && RQ.tick - a.tick < 260 ? a.p : null;",
   "  const t = RQ.golTime, autor = RQ.golAutor && RQ.golAutor.time === t ? RQ.golAutor : null;   // v70: o autor da regra única (no gol contra ninguém corre para comemorar)"),
  # a faixa do GOL!: o texto da regra única (e a linha de baixo também no ponto deles: GOL CONTRA (VOCÊ), GOL DE ...)
  (r"""    const nosso = e.gol === (NET49.playing?P.time:0);
    const md = RQ.jogo, txtN = md === 'volei' ? 'PONTO!' : md === 'americano' ? 'TOUCHDOWN!' : md === 'basquete' ? (e.pts === 3 ? 'CESTA DE 3!' : 'CESTA!') : e.ginga ? 'GOL DE GINGA!' : 'GOL!',
      txtD = md === 'volei' ? 'PONTO DELES' : md === 'americano' ? 'TD DELES' : md === 'basquete' ? 'CESTA DELES' : e.ginga ? 'GINGA DELES' : 'GOL DELES';   // v61: ginga
    goalT = 0; ganhoGol = 0; bannerSub = '';
    if (nosso){ bannerTxt = txtN; bannerAzul = false; spawnConfetti(); som.gol(); }
    else { bannerTxt = txtD; bannerAzul = true; som.golContra(); }
    if (md === 'basquete' || e.ginga) bannerSub = '+' + (e.pts || 2) + ' PONTOS';   // v59 · v61: e o GOL DE GINGA
    if (e.golH){ stGol(); perfilSalvar(); ecoGol('partida'); }   // moedas, XP e o Top semanal
    if (e.assistH){ perfil.st.assist++; perfilSalvar(); bannerSub += (bannerSub ? ' · ' : '') + 'ASSISTÊNCIA SUA!'; }
    else if (e.assist && nosso && e.golH) bannerSub += (bannerSub ? ' · ' : '') + 'PASSE DE ' + e.assist.nome.toUpperCase();   // v61: sem apagar o +2 PONTOS
    else if (nosso && e.autor && !e.autor.humano) bannerSub = (e.ginga ? bannerSub + ' · ' : '') + (md === 'futebol' || md === 'curva' || md === 'ginga' ? 'GOL DE ' : 'PONTO DE ') + e.autor.nome.toUpperCase();
    else if (nosso && e.contra) bannerSub = 'GOL CONTRA DELES';
""",
   r"""    const nosso = e.gol === (NET49.playing?P.time:0);
    const T = rqTextoLance({jogo:RQ.jogo, pts:e.pts, ginga:e.ginga, contra:e.contra, autor:rqNomeDe(e.autor), assist:rqNomeDe(e.assist), contraDe:rqNomeDe(e.contraDe), desvio:rqNomeDe(e.desvio),
      autorEu:!!e.golH, assistEu:!!e.assistH, contraEu:!!e.contraH}, nosso);   // v70: o mesmo texto do replay e da sala online (a regra única)
    goalT = 0; ganhoGol = 0; bannerTxt = T.t; bannerSub = T.s;
    if (nosso){ bannerAzul = false; spawnConfetti(); som.gol(); }
    else { bannerAzul = true; som.golContra(); }
    if (e.golH){ stGol(); perfilSalvar(); ecoGol('partida'); }   // moedas, XP e o Top semanal
    if (e.assistH){ perfil.st.assist++; perfilSalvar(); }
"""),
  ("const moedas = ganhoGol > 0 && !tr && !az ? ganhoGol : 0, sub = bannerSub && dois && !tr && !az ? bannerSub : '';",
   "const moedas = ganhoGol > 0 && !tr && !az ? ganhoGol : 0, sub = bannerSub && dois && !tr ? bannerSub : '';   // v70: a linha de baixo também no ponto deles (GOL CONTRA, GOL DE ...)"),
  # a plataforma recebe o modo, os pontos e os gols contra (a mesma classificação)
  ("golsGinga: window.__rachaGingaH | 0, duracaoSeg:",
   "golsGinga: window.__rachaGingaH | 0, modo: String(R.jogo || RQ.jogo || 'futebol'), pontos: R.ptsH | 0, golsContra: R.contraH | 0, duracaoSeg:"),
  # a apresentação: a meta do modo de verdade (era sempre "PRIMEIRO A 3 GOLS", também no basquete, na ginga e na sala com tempo)
  ("    VS.nivel.textContent = 'SORTEIO: BOTS ' + RQ_NIVEIS[RQ.nivel].nome.toUpperCase() + ' · PRIMEIRO A 3 GOLS';   // v58: o jogo sorteia o nível",
   "    VS.nivel.textContent = 'SORTEIO: BOTS ' + RQ_NIVEIS[RQ.nivel].nome.toUpperCase() + ' · ' + mdMetaTxt();   // v58: o jogo sorteia o nível · v70: a meta e a unidade do modo"),
  # o fim de jogo: os seus números na unidade do modo
  ("  if (R.golsH) fez.push(R.golsH === 1 ? '1 gol' : R.golsH + ' gols');",
   "  const unF = mdUn(R.jogo || RQ.jogo); if (R.golsH) fez.push(R.golsH + ' ' + (R.golsH === 1 ? unF.um : unF.varios));   // v70: na unidade do modo"),
  ("  fimNumeros(R.golsH, R.assistH); f.classList.toggle('perdeu', !R.venceu);",
   "  fimNumeros(R.golsH, R.assistH, R.jogo || RQ.jogo, R.ptsH); f.classList.toggle('perdeu', !R.venceu);"),
  (r"""function fimNumeros(gols, assist){                     // os seus números no fim da partida
  const el = fimEl('fim-stats'); if (!el) return; el.textContent = '';
  const um = (n, rot) => { const s = nodo('span'); s.append(nodo('b', null, String(n || 0)), rot); el.appendChild(s); };
  um(gols, gols === 1 ? 'GOL' : 'GOLS'); um(assist, assist === 1 ? 'ASSISTÊNCIA' : 'ASSISTÊNCIAS');
}""",
   r"""function fimNumeros(gols, assist, jogo, pts){         // os seus números no fim da partida · v70: na unidade do modo (gol, ponto, touchdown, cesta)
  const el = fimEl('fim-stats'); if (!el) return; el.textContent = '';
  const um = (n, rot) => { const s = nodo('span'); s.append(nodo('b', null, String(n || 0)), rot); el.appendChild(s); };
  const un = mdUn(jogo || 'futebol');
  um(gols, (gols === 1 ? un.um : un.varios).toUpperCase());
  if (jogo === 'basquete' || jogo === 'ginga') um(pts, pts === 1 ? 'PONTO' : 'PONTOS');   // (cesta de 2/3 e gol de ginga: os pontos à parte)
  um(assist, assist === 1 ? 'ASSISTÊNCIA' : 'ASSISTÊNCIAS');
}"""),
  # o placar: a unidade do modo embaixo da meta
  ("function placarCaixa(g, p0, p1, tempo, prorrog){       // a caixa do placar da ranqueada (seu time · tempo · adversário; v44: nas cores das tampinhas)",
   "function placarCaixa(g, p0, p1, tempo, prorrog, un){   // a caixa do placar da ranqueada (seu time · tempo · adversário; v44: nas cores das tampinhas) · v70: (un) a unidade embaixo da meta"),
  ("  txt(g, tempo, cx, y + h/2 + 2, prorrog ? 30 : 34, prorrog ? '#ffd23f' : '#fff', 'rgba(0,0,0,.6)', 5);\n  g.restore();",
   "  if (un){ txt(g, tempo, cx, y + h/2 - 7, 27, '#fff', 'rgba(0,0,0,.6)', 5); txt(g, un, cx, y + h - 9, 19, '#ffe9a8', 'rgba(0,0,0,.7)', 4); }\n"
   "  else txt(g, tempo, cx, y + h/2 + 2, prorrog ? 30 : 34, prorrog ? '#ffd23f' : '#fff', 'rgba(0,0,0,.6)', 5);\n  g.restore();"),
  (": 'ATÉ ' + (RQ.meta || 3), ouro);",
   ": 'ATÉ ' + (RQ.meta || 3), ouro, lim > 0 ? '' : mdUn(RQ.jogo).placar.toUpperCase());   // v70: ATÉ 12 · PONTOS"),
  # a sala online: o anfitrião manda a classificação inteira; o convidado mostra o mesmo texto e conta igual
  ("NET49.onlineGols=NET49.onlineAssist=0;NET49.paused=false;",
   "NET49.onlineGols=NET49.onlineAssist=NET49.onlinePts=NET49.onlineContra=0;NET49.paused=false;"),
  ("if(changed){const t=s.score[0]>NET49.lastScore[0]?0:1,ours=NET49.localSlot>=0&&P.time===t;goalT=0;bannerTxt=ours?'GOL!':'GOL DO TIME '+(t?'AZUL':'VERMELHO');bannerAzul=!!t;bannerSub=s.goal?.name||'';RQ.golTime=t;som.gol();spawnConfetti();rpMarcaGol({time:t,placar:s.score,autor:s.goal?.name||''});if(s.goal?.author===NET49.id){NET49.onlineGols++;stGol();perfilSalvar();ecoGol('partida');}if(s.goal?.assist===NET49.id)NET49.onlineAssist++;}",
   "if(changed){const t=s.score[0]>NET49.lastScore[0]?0:1,esp=NET49.localSlot<0,ours=!esp&&P.time===t,g=s.goal&&s.goal.time===t?s.goal:{},md=g.jogo||RQ.jogo||'futebol',eu=x=>!!x&&x===NET49.id;"
   "const T=rqTextoLance({jogo:md,pts:g.pts|0,ginga:!!g.ginga,contra:!!g.contra,autor:g.name||'',assist:g.assistName||'',contraDe:g.contraName||'',desvio:g.desvioName||'',autorEu:eu(g.author),assistEu:eu(g.assist),contraEu:eu(g.contraBy)},ours);"   # v70: o mesmo texto e a mesma classificação do anfitrião
   "goalT=0;bannerTxt=esp?mdUn(md).acao+' DO TIME '+(t?'AZUL':'VERMELHO'):T.t;bannerAzul=esp?!!t:!ours;bannerSub=T.s;RQ.golTime=t;if(ours||esp){som.gol();spawnConfetti();}else som.golContra();"
   "rpMarcaGol({time:t,placar:s.score,autor:g.name||'',assist:g.assistName||'',contra:!!g.contra,contraDe:g.contraName||'',desvio:g.desvioName||'',jogo:md,pts:g.pts|0,ginga:!!g.ginga,meu:esp?0:P.time|0});"
   "if(eu(g.author)){NET49.onlineGols++;NET49.onlinePts+=(g.pts|0)||1;stGol();perfilSalvar();ecoGol('partida');}if(eu(g.assist))NET49.onlineAssist++;if(eu(g.contraBy))NET49.onlineContra++;}   /* v70: a regra única também na sala */"),
  ("const R={placar:m.score.slice(),venceu:won,golsH:NET49.host?RQ.golsH:NET49.onlineGols,assistH:NET49.host?RQ.assistH:NET49.onlineAssist,n:RQ.n,mapa:RQ.mapa,nivel:'dificil',contado:true};",
   "const R={placar:m.score.slice(),venceu:won,golsH:NET49.host?RQ.golsH:NET49.onlineGols,assistH:NET49.host?RQ.assistH:NET49.onlineAssist,n:RQ.n,mapa:RQ.mapa,nivel:'dificil',contado:true,jogo:RQ.jogo||'futebol',ptsH:NET49.host?RQ.ptsH:NET49.onlinePts|0,contraH:NET49.host?RQ.contraH:NET49.onlineContra|0};"),
  ("NET49.room.tempo?NET49.room.tempo+' minutos':'primeiro a '+(RQ.meta||3)",
   "NET49.room.tempo?NET49.room.tempo+' minutos':mdMetaTxt().toLowerCase()"),
  ("NET49.goal={author:e.autor?.netId,assist:e.assist?.netId,name:e.autor?.nome||perfil.nome};",
   "NET49.goal={time:RQ.golTime,jogo:RQ.jogo,pts:e.pts|0,ginga:!!e.ginga,contra:!!e.contra,author:e.autor?.netId||null,assist:e.assist?.netId||null,contraBy:e.contraDe?.netId||null,"
   "name:rqNomeDe(e.autor),assistName:rqNomeDe(e.assist),contraName:rqNomeDe(e.contraDe),desvioName:rqNomeDe(e.desvio)};   /* v70: a classificação inteira vai para quem joga de fora */"),
]
