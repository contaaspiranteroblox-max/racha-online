# RACHA rua v70 · Etapa 4 — perfil, estatísticas, inventário, economia, dificuldade (trocas fora do bloco de física).
# O resto mora em tools/v70/economia.js, perfil.js e tutorial.js (injetados no fim do script do jogo) e nas edições diretas de
# tools/tampa_rua.js (as peças compradas junto com o saldo) e tools/editor_rua.js (rascunho, botão com preço, inventário).
# Cada item: (antes, depois) = exatamente 1 vez no arquivo gerado · (antes, depois, n) = exatamente n vezes.

CONFIG = r"""<script src="./config.js"></script>
<script>
(function(){   /* v70: DEMONSTRAÇÃO × PRODUÇÃO. O config.js (ao lado do jogo) diz o modo; sem ele, ?demo=1 liga a demonstração.
   O padrão é PRODUÇÃO (o lançamento): sem o presente de teste e com as salas online de verdade. A demonstração tem o presente
   de teste (moedas e gemas) e o selo DEMONSTRAÇÃO no lobby. */
  var c = window.RACHA_CONFIG || null, m = 'producao';
  if (c && (c.modo === 'demo' || c.modo === 'producao')) m = c.modo;
  else { try { if (/[?&]demo=1(&|$)/.test(location.search)) m = 'demo'; } catch (_) {} }
  window.RACHA_MODO = m;
})();
</script>
"""

SUBS = [
  # ---- 1) o modo (demonstração × produção) antes de tudo; o armazenamento que só guarda na memória fica marcado (o jogo avisa)
  ("<script>\n(function(){   /* preview: se o lugar onde o jogo abriu não deixar guardar (prévia dentro de um app), guarda na memória */",
   CONFIG + "<script>\n(function(){   /* preview: se o lugar onde o jogo abriu não deixar guardar (prévia dentro de um app), guarda na memória */"),
  ("  catch (_) {\n    const novo = () => {",
   "  catch (_) {\n    window.RACHA_SEM_SALVAR = 'memoria';   // v70: o jogo avisa que o progresso vale só até fechar (e oferece exportar)\n    const novo = () => {"),
  # ---- 2) o presente de teste (50.000 moedas e 5.000 gemas) só na demonstração
  ("  if (CONTA.presentes.indexOf(PRESENTE.id) < 0){      // v32: o presente (uma vez por aparelho); a janela aparece no lobby",
   "  if (window.RACHA_MODO === 'demo' && !(window.RACHA_CONFIG && window.RACHA_CONFIG.presente === false) && CONTA.presentes.indexOf(PRESENTE.id) < 0){      // v32: o presente (uma vez por aparelho) · v70: só na DEMONSTRAÇÃO (presente:false tira)"),
  # ---- 3) a conta: as peças compradas (junto com o saldo), os ganhos do dia, as missões e o que já foi visto
  ("missaoPagas:0, chatBrasil:true, menosAnim:false, vibrar:true, onb:false,",
   "missaoPagas:0, pecas:[], cap:null, missoes:null, vistos:[], chatBrasil:true, menosAnim:false, vibrar:true, onb:false,   // v70: pecas · cap (o dia) · missoes · vistos\n "),
  ("    if (typeof o.vibrar === 'boolean') CONTA.vibrar = o.vibrar;\n",
   "    if (typeof o.vibrar === 'boolean') CONTA.vibrar = o.vibrar;\n    contaCarregaV70(o);                              // v70: as peças, os ganhos do dia, as missões e o que já foi visto\n"),
  ("    CONTA.xp = Math.round(s.gols*4 + s.treinos*10 + s.partidas*30 + s.vitorias*30);\n    contaSalvar();\n",
   "    CONTA.xp = Math.round(s.gols*4 + s.treinos*10 + s.partidas*30 + s.vitorias*30);\n    if (!s.partidas && !s.treinos) contaNovaV70();   // v70: conta nova de verdade (sem as janelas de novidade antigas)\n    contaSalvar();\n"),
  # ---- 4) o perfil: as estatísticas por contexto e modo e os títulos conquistados
  ("    assist:0, semSofrer:0, golsA:0, chutesA:0, golsC:0, chutesC:0}       // v34: assistências, jogos sem sofrer gol, gols e chutes (A = Arcade; C = o Clássico, que saiu na v58)\n});",
   "    assist:0, semSofrer:0, golsA:0, chutesA:0, golsC:0, chutesC:0},      // v34: assistências, jogos sem sofrer gol, gols e chutes (A = Arcade; C = o Clássico, que saiu na v58)\n"
   "  est:{}, ganhos:[], v70:1                                             // v70: os números por contexto e modo (tools/v70/perfil.js) e os títulos conquistados\n});"),
  ("    if (Array.isArray(o.titulos)) perfil.titulos = [0, 1].map(i => typeof o.titulos[i] === 'string' && TITULO_MAP.has(o.titulos[i]) ? o.titulos[i] : '');\n  } catch (_) {}",
   "    if (Array.isArray(o.titulos)) perfil.titulos = [0, 1].map(i => typeof o.titulos[i] === 'string' && TITULO_MAP.has(o.titulos[i]) ? o.titulos[i] : '');\n"
   "    perfilCarregaV70(o);                               // v70\n  } catch (_) {}"),
  # ---- 5) os lances da partida no contexto e no modo: o seu gol (cesta, touchdown, ponto, com os pontos), a assistência e o gol contra
  ("    if (e.golH){ stGol(); perfilSalvar(); ecoGol('partida'); }   // moedas, XP e o Top semanal\n    if (e.assistH){ perfil.st.assist++; perfilSalvar(); }\n",
   "    if (e.golH){ estMarca(e.pts); estGolDeFinalizacao(); stGol(); perfilSalvar(); ecoGol('partida'); }   // moedas, XP e o Top semanal · v70: no modo e no contexto\n"
   "    if (e.assistH){ perfil.st.assist++; estConta('as'); perfilSalvar(); }\n    if (e.contraH){ estConta('gc'); perfilSalvar(); }\n"),
  ("if(eu(g.author)){NET49.onlineGols++;NET49.onlinePts+=(g.pts|0)||1;stGol();perfilSalvar();ecoGol('partida');}if(eu(g.assist))NET49.onlineAssist++;if(eu(g.contraBy))NET49.onlineContra++;",
   "if(eu(g.author)){NET49.onlineGols++;NET49.onlinePts+=(g.pts|0)||1;estMarca((g.pts|0)||1);stGol();perfilSalvar();ecoGol('partida');}if(eu(g.assist)){NET49.onlineAssist++;estConta('as');}if(eu(g.contraBy)){NET49.onlineContra++;estConta('gc');}"),
  ("    acc += dt; perfil.st.segundos += dt;\n", "    acc += dt; perfil.st.segundos += dt; estTempo(dt);   // v70: o tempo em campo no contexto e no modo\n"),
  ("if(NET49.playing&&!NET49.host){net49RemoteFrame(Math.max(0,dt),now);", "if(NET49.playing&&!NET49.host){estTempo(Math.max(0,dt));net49RemoteFrame(Math.max(0,dt),now);"),
  # ---- 6) as missões: a faixa DESAFIOS e o toque nela (as do dia, o bônus e a série)
  ("  const concl = perfil.st.concluidas || 0, miLivres = Math.floor(concl/5) - (CONTA.missaoPagas || 0), mi = concl % 5;   // v56: a missão vale de verdade\n"
   "  LB.missoes.classList.toggle('pronta', miLivres > 0);\n"
   "  const miTx = LB.missoes.querySelector('.mi-tx'); if (miTx) miTx.textContent = miLivres > 0 ? 'Missão concluída!' : 'Jogue 5 partidas';\n"
   "  LB.miBarra.style.width = (miLivres > 0 ? 100 : 100*mi/5) + '%'; LB.miN.textContent = (miLivres > 0 ? 5 : mi) + '/5';\n",
   "  missoesWidget();                                     // v70: as missões do dia, o bônus e a série (tools/v70/economia.js)\n"),
  ("  clique(LB.missoes, () => {                            // v56: a missão paga de verdade (500 moedas a cada 5 partidas concluídas)",
   "  clique(LB.missoes, () => { som.clique(); missoesAbre(); });   // v70: as missões do dia, o bônus e a série\n"
   "  if (0) clique(LB.missoes, () => {                    // (a missão antiga de 5 partidas virou a SÉRIE das missões)"),
  # ---- 7) a dificuldade: casual com a escolha (Fácil, Difícil, Aleatória); a liga com o desafio pelo elo
  ("'SORTEIO: BOTS ' + RQ_NIVEIS[RQ.nivel].nome.toUpperCase(), RQ.nivel === 'dificil'", "rqNivelTexto() + RQ_NIVEIS[RQ.nivel].nome.toUpperCase(), RQ.nivel === 'dificil'"),
  ("    VS.nivel.textContent = 'SORTEIO: BOTS ' + RQ_NIVEIS[RQ.nivel].nome.toUpperCase() + ' · ' + mdMetaTxt();",
   "    VS.nivel.textContent = rqNivelTexto() + RQ_NIVEIS[RQ.nivel].nome.toUpperCase() + ' · ' + mdMetaTxt();   // v70: sorteio, escolha ou liga"),
  ("CAMPOS[X49.map].nome.toUpperCase() + ' · BOTS SORTEADOS'; }", "CAMPOS[X49.map].nome.toUpperCase() + ' · ' + rqNivelCurto(); }   // v70: os bots escolhidos"),
  ("MD_MAP.get(RQP.jogo).desc + ' Os bots o jogo sorteia em cada partida: FÁCIL ou DIFÍCIL.';", "MD_MAP.get(RQP.jogo).desc + ' ' + rqNivelDesc();   // v70"),
  ("  R.nota.textContent = rq ? 'Primeiro a 3 gols vence · vitória +25 a +41 pontos (contra o Difícil vale +6), derrota −16 a −20 (no Bronze, a metade) · sair no meio conta derrota (−25)'",
   "  R.nota.textContent = rq ? ligaNota()                  // v70: a liga contra bots (o elo é deste aparelho; o desafio cresce com ele)"),
  ("' · moedas e XP como na ranqueada';", "' · moedas e XP como na liga';"),
  ("<small>Primeiro a 3 gols vence. Os bots o jogo sorteia em cada partida: FÁCIL ou DIFÍCIL.</small>", "<small>Partida sem elo contra bots.</small>"),
  # ---- 8) a ranqueada de hoje é a LIGA CONTRA BOTS (o nome no placar, no histórico e na pílula da partida)
  ("X49.matchMode==='ranked'?'RANQUEADA':'CASUAL'", "X49.matchMode==='ranked'?'LIGA CONTRA BOTS':'CASUAL'"),
  ("(rep.ranq ? 'Ranqueada ' + rep.n + 'v' + rep.n : 'Treino livre')", "(rep.ranq ? 'Partida ' + rep.n + 'v' + rep.n : 'Treino livre')"),   # (o replay de qualquer partida dizia Ranqueada)
  ('<div id="rq-vs" hidden role="dialog" aria-label="Ranqueada">', '<div id="rq-vs" hidden role="dialog" aria-label="Apresentação dos times">'),
]
