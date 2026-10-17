# RACHA rua v70 · Etapa 5 — clube e online (trocas no arquivo gerado; o resto mora em tools/v70/online.js).
#   · o bloqueio de WebSocket só existe na DEMONSTRAÇÃO sem servidor (RACHA_CONFIG.modo = 'demo' sem servidor configurado)
#   · o endereço do servidor da turma vem do config.js (RACHA_CONFIG.servidor; vazio = o mesmo endereço do jogo)
#   · COM CURVA e GINGA iguais para anfitrião e convidado: o comando leva k (1 = CURVA segurada · 2 = FINTA · 4 = DRIBLE),
#     o anfitrião aplica com as mesmas regras do botão dele (tools/v70/online.js: v70Remoto) e a curva automática invisível sai
#   · AMERICANO: o chutão de longe barrado era a regra do bot; quem joga de fora (gente) chuta como o anfitrião
#   · JOGAR AGORA entra com lugar num time (rapido); títulos SALA PÚBLICA / SALA PRIVADA / SALA NESTE APARELHO
#   · os eventos de começo e fim (RACHA_EVT) uma vez por partida, contra os bots e nas salas (v70EvInicio / v70EvFim)
# Cada item: (antes, depois) = exatamente 1 vez no arquivo gerado · (antes, depois, n) = exatamente n vezes.
# SUBS_PHYS: dentro do bloco de física, só regra e dados de modo (conferido pelo aplicar_rua.py: o resto do bloco fica igual).

SUBS_PHYS = [
  # a GINGA também nas salas (o convidado manda FINTA e DRIBLE no comando, como o anfitrião aperta o botão)
  ("const MD_SALA = MD_LISTA.filter(m => m.id !== 'ginga');   // v61: na sala online a GINGA fica de fora (o convidado ainda não manda FINTA/DRIBLE)",
   "const MD_SALA = MD_LISTA.slice();                       // v70: a GINGA também nas salas: o convidado manda FINTA e DRIBLE no comando (k), como o anfitrião"),
  ("const mdSala = id => id === 'ginga' ? 'futebol' : mdValida(id);",
   "const mdSala = id => mdValida(id);                      // v70: (a ginga vale na sala)"),
  # COM CURVA: sem a curva automática invisível do convidado (ele tem o botão CURVA: a carga e o lado chegam no comando)
  ("  if (q && q.remote){ const s = Math.sign((CY - B.y)*dx) || 1; B.cv = (forca >= FORCA_POWER ? 1.15 : .45)*s; B.cvT = .8; B.w = B.cv*9; B.cvUx = null; return; }   // v61: o convidado da sala não tem o botão CURVA: a curva automática do v59\n",
   "  // v70: o convidado tem o botão CURVA como o anfitrião (a carga e o lado chegam no comando: v70Remoto em tools/v70/online.js): sem curva automática\n"),
]

SUBS = [
  # ---- 1) o WebSocket de mentira só na DEMONSTRAÇÃO sem servidor (antes: sempre, até no lançamento)
  ("  F.CONNECTING = 0; F.OPEN = 1; F.CLOSING = 2; F.CLOSED = 3;\n  window.WebSocket = F;\n})();",
   "  F.CONNECTING = 0; F.OPEN = 1; F.CLOSING = 2; F.CLOSED = 3;\n"
   "  const c = window.RACHA_CONFIG || {};                // v70: só na DEMONSTRAÇÃO sem servidor configurado (o lançamento conecta de verdade)\n"
   "  window.RACHA_SEM_REDE = window.RACHA_MODO === 'demo' && c.salas !== 'servidor' && !(typeof c.servidor === 'string' && c.servidor.trim());\n"
   "  if (window.RACHA_SEM_REDE) window.WebSocket = F;\n})();"),
  ("const SERVIDOR_DO_JOGO = '';",
   "const SERVIDOR_DO_JOGO = (window.RACHA_CONFIG && typeof window.RACHA_CONFIG.servidor === 'string') ? window.RACHA_CONFIG.servidor.trim() : '';   // v70: o config.js (vazio = o mesmo endereço do jogo)"),
  ("    : BRASIL.estado === 'semservidor' ? 'O Chat do Brasil usa o servidor do jogo (o mesmo das salas). Abra o jogo pelo endereço do servidor ou ponha o endereço em Ajustes › Avançado.'",
   "    : BRASIL.estado === 'semservidor' ? (window.RACHA_SEM_REDE ? 'Nesta demonstração o Chat do Brasil e as salas online ficam desligados (não tem servidor). O resto do jogo funciona igual.' : 'O Chat do Brasil usa o servidor do jogo (o mesmo das salas). Abra o jogo pelo endereço do servidor ou ponha o endereço em Ajustes › Avançado.')"),
  # ---- 2) a conta do RACHA no hello (o bilhete assinado pela plataforma) e o clube da conta (para o cartão da sala)
  ("net49Send({type:'hello',token,name:perfil.nome,skin:perfil.skin,avatar:perfil.avatar,flag:slPais()});",
   "net49Send(Object.assign({type:'hello',token,name:perfil.nome,skin:perfil.skin,avatar:perfil.avatar,flag:slPais()},v70HelloExtra()));"),
  # ---- 3) o comando do convidado leva a CURVA segurada, a FINTA e o DRIBLE (k) — e a carga aparece na tela dele
  ("const command={type:'input',seq:++NET49.seq,x:d.mx,y:d.my,acao};",
   "const command={type:'input',seq:++NET49.seq,x:d.mx,y:d.my,acao,k:v70ConvidadoK(d.mx,d.my)};"),
  ("    f.fila.push({seq, x:Math.max(-1, Math.min(1, +m.x || 0)), y:Math.max(-1, Math.min(1, +m.y || 0)), acao:(m.acao | 0) & 3});",
   "    const k70 = (m.k | 0) & 7;                           // v70: 1 = CURVA segurada · 2 = FINTA · 4 = DRIBLE (o pedido vale uma vez)\n"
   "    f.fila.push({seq, x:Math.max(-1, Math.min(1, +m.x || 0)), y:Math.max(-1, Math.min(1, +m.y || 0)), acao:(m.acao | 0) & 3, k:k70});\n"
   "    if (k70 & 2) f.pedeF = true;\n    if (k70 & 4) f.pedeD = {x:Math.max(-1, Math.min(1, +m.x || 0)), y:Math.max(-1, Math.min(1, +m.y || 0))};"),
  ("  if (vale) nsSegura(q, b);\n};",
   "  if (vale) nsSegura(q, b);\n  v70Remoto(q, f, vale, dir);                          // v70: a CURVA, a FINTA e o DRIBLE de quem joga de fora (as regras do botão do anfitrião)\n};"),
  ("P2.ult3.push([m.seq, m.x, m.y, m.acao | 0]);", "P2.ult3.push([m.seq, m.x, m.y, m.acao | 0, m.k | 0]);"),
  ("net49Message({type:'input', id:de, seq:v[0], x:v[1], y:v[2], acao:v[3]});", "net49Message({type:'input', id:de, seq:v[0], x:v[1], y:v[2], acao:v[3], k:v[4] | 0});"),
  # o convidado vê CURVA, FINTA e DRIBLE como o anfitrião
  ("  if (k === 'curva') return v61Humano() && RQ.jogo === 'curva';\n  if (k === 'finta' || k === 'drible') return v61Humano() && RQ.jogo === 'ginga';",
   "  if (k === 'curva') return v70Joga() && RQ.jogo === 'curva';             // v70: o convidado da sala também tem os botões do modo\n  if (k === 'finta' || k === 'drible') return v70Joga() && RQ.jogo === 'ginga';"),
  # o último quadro antes do fim vai também pelo servidor (com a conexão direta ligada, ele ia só direto: o servidor confere o placar do fim com ele)
  ("  const pelaRede = force || now - NET49.sentAt >= 1000/30;                 // pelo servidor: 30 quadros por segundo",
   "  const pelaRede = force || now - NET49.sentAt >= 1000/30 || (RQ.estado === 'fim' && !NET49.finishSent);   // pelo servidor: 30 quadros por segundo (v70: e o do fim)"),
  # o quadro leva a janela do GOL DE GINGA (o convidado vê a faixa como o anfitrião)
  ("ns3(q.fxT || -9)]), goal:NET49.goal || null};", "ns3(q.fxT || -9)]), goal:NET49.goal || null, gm:v70GingaJanela()};"),
  # AMERICANO: o chutão de longe barrado é regra do bot; quem joga de fora (gente) chuta como o anfitrião
  ("  if (RQ.td && forca >= FORCA_POWER){ const gl = q.time === 0 ? LX1 : LX0;",
   "  if (RQ.td && forca >= FORCA_POWER && !q.remote){ const gl = q.time === 0 ? LX1 : LX0;   /* v70: (a regra é do bot; quem joga de fora chuta como o anfitrião) */"),
  ("const SL_MODO = {futebol:'Futebol', curva:'Com curva', volei:'Vôlei', americano:'Americano', basquete:'Basquete'};",
   "const SL_MODO = {futebol:'Futebol', curva:'Com curva', volei:'Vôlei', americano:'Americano', basquete:'Basquete', ginga:'Ginga'};   // v70: + ginga"),
  # ---- 4) JOGAR AGORA: entra com lugar num time (o servidor senta no time com menos gente)
  ("  if (L.length){ net49Send({type:'join', code:L[0].code}); return; }",
   "  if (L.length){ net49Send({type:'join', code:L[0].code, rapido:true}); return; }   // v70: com lugar num time"),
  ("  if (m.type === 'join' && !m.spectate && !Number.isInteger(m.slot)) m = Object.assign({}, m, {spectate:true});",
   "  if (m.type === 'join' && !m.spectate && !m.rapido && !Number.isInteger(m.slot)) m = Object.assign({}, m, {spectate:true});   // (v70: JOGAR AGORA entra com lugar)"),
  ("  if (on) cria.appendChild(sxBt('sx-bt amarelo sx-agora', 'JOGAR AGORA', slJogarAgora, 'Jogar agora: entrar na sala aberta que vai começar'));",
   "  if (on) cria.appendChild(sxBt('sx-bt amarelo sx-agora', 'JOGAR AGORA', slJogarAgora, 'Jogar agora: entrar com lugar num time da sala pública que vai começar (ou abrir uma)'));"),
  ("  if (on) nota.append('Online: chame a galera pelo link. Quem entra fica assistindo e ', nodo('b', null, 'o árbitro monta os times'), '.');",
   "  if (on) nota.append('JOGAR AGORA já te põe num time. Pelo link ou pelo código, quem entra fica assistindo e ', nodo('b', null, 'o árbitro monta os times'), '.');"),
  # ---- 5) os títulos: sala PÚBLICA, PRIVADA e NESTE APARELHO
  ("NET49.room.pub?'SALA ABERTA':'SALA FECHADA'", "NET49.room.pub?'SALA PÚBLICA':'SALA PRIVADA'"),
  ("fimEl('fim-info').textContent='Sala '+NET49.room.code+' · '", "fimEl('fim-info').textContent=(NET49.room.pub?'Sala pública ':'Sala privada ')+NET49.room.code+' · '"),
  ("c.append(nodo('span', 'sj-tag', r.tournament ? 'COPA DOS AMIGOS' : 'SALA PRIVADA'), nodo('b', 'sj-cod', r.code),",
   "c.append(nodo('span', 'sj-tag', r.tournament ? 'COPA DOS AMIGOS' : r.local ? 'SALA NESTE APARELHO' : r.pub ? 'SALA PÚBLICA' : 'SALA PRIVADA'), nodo('b', 'sj-cod', r.code),"),
  ("(r.oficial ? 'Oficial · começa sozinha · ' : r.pub ? 'Código ' : 'Fechada · código ')", "(r.oficial ? 'Oficial · começa sozinha · ' : r.pub ? 'Pública · código ' : 'Privada · código ')"),
  ("onChip('ABERTA (NA LISTA)', pub, () => { pub = true; pinta(); }), onChip('FECHADA (SÓ COM CÓDIGO)', !pub,",
   "onChip('PÚBLICA (NA LISTA)', pub, () => { pub = true; pinta(); }), onChip('PRIVADA (SÓ COM CÓDIGO)', !pub,"),
  ("onChip('ABERTA (NA LISTA)', !SL.privada, () => { SL.privada = false; slPrefSalva(); amigosRender(); }), onChip('FECHADA (SÓ COM CÓDIGO)', SL.privada,",
   "onChip('PÚBLICA (NA LISTA)', !SL.privada, () => { SL.privada = false; slPrefSalva(); amigosRender(); }), onChip('PRIVADA (SÓ COM CÓDIGO)', SL.privada,"),
  ("  quem.append(q2(true, 'ABERTA', 'aparece na lista'), q2(false, 'FECHADA', 'só entra com o código'));",
   "  quem.append(q2(true, 'PÚBLICA', 'aparece na lista'), q2(false, 'PRIVADA', 'só entra com o código'));"),
  # ---- 6) o começo e o fim (RACHA_EVT) uma vez por partida: contra os bots o começo é quando a bola rola (rqVsComeca)
  ("  try{ window.__rachaGingaH = 0; window.RACHA_EVT && window.RACHA_EVT.inicio({ modo: String(RQ.jogo || 'futebol'), mapa: (typeof CAMPOS !== 'undefined' && CAMPOS[RQ.mapa]) ? CAMPOS[RQ.mapa].id : '', nivelBots: String(RQ.nivel || ''), tamanho: RQ.n | 0 }); }catch(_){}",
   "  try{ window.__rachaGingaH = 0; }catch(_){}          // v70: o RACHA_EVT.inicio saiu daqui: vai quando a bola rola (v70EvInicio no rqVsComeca), uma vez por partida"),
  ("window.RACHA_EVT.fim({ placarNosso: __n,", "v70EvFim({ placarNosso: __n,"),
]
