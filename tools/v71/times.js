/* ==================================================================================================================
   RACHA rua v71 · TIMES PRETO × BRANCO (entra no fim do script do jogo, depois do enxuto.js; as trocas de texto em times.py)
   O pedido: "cores rivais no jogo: preto x branco. O personagem padrão não é mais amarelo: metade preto, metade branco.
   Quando o jogador vai para o time preto ele fica todo preto; no branco, todo branco. Nas salas também. Com outra skin que
   não seja a padrão, não muda."
   · Os dois times são sempre o TIME PRETO (o 0: o seu, na partida contra os bots; o da esquerda) e o TIME BRANCO (o 1),
     em todo lugar: casual, liga, treino, sala neste aparelho, sala online, copa e replay. O halo, o placar, a apresentação,
     a tela do fim, a saída de bola, a rede, a torcida e os marcadores de quem está fora da tela seguem essas duas cores.
   · A tampinha PADRÃO (TP_PADRAO_COD, em tampa_rua.js pela troca de times.py) é metade preta e metade branca no lobby, no
     perfil e no editor; na partida ela vira a do time (TP_TIME_COD: toda preta ou toda branca). Os bots jogam com a padrão.
     Quem usa outra tampinha (personalizada ou modelo pronto) continua com ela; o time aparece no halo e no contorno.
   · A amarela (a padrão até a v70.2) continua nos MODELOS PRONTOS como "Clássica" e, escolhida, fica amarela como qualquer
     outra. Quem estava com ela por ser a padrão (o "equipar" da primeira vez gravava a padrão) passa para a nova UMA vez
     (racha-v71-padrao); depois vale a escolha.
   Nada aqui mexe na física: só cor, nome e qual desenho cada um usa.
   ================================================================================================================== */
const TIME71 = [
  {nome:'Time Preto', curto:'PRETO', base:'#1b1d21', claro:'#d7dae0', escuro:'#000000', txt:'#ffffff', contra:'#ffffff'},
  {nome:'Time Branco', curto:'BRANCO', base:'#f3f1ea', claro:'#ffffff', escuro:'#6f6b63', txt:'#15171a', contra:'#15171a'}
];
const TIME71_SKIN = TIME71.map((c, i) => Object.assign({}, SEM_SKIN, {id:'time71-' + i, nome:c.nome, cor:c.base}));
skinDoTime = function(t){ return TIME71_SKIN[t ? 1 : 0]; };            // a COR do time (o halo, o placar, a torcida, a rede)
rqCor = function(t){ return TIME71[t ? 1 : 0]; };                      // {base, claro, escuro, txt}: txt = a letra em cima da cor
SALA_COR.forEach((s, i) => { s.nome = TIME71[i].nome; s.cor = TIME71[i].base; });

/* ---------------------------------------------------------------- a tampinha de cada um */
const tp71Padrao = cod => cod === TP_PADRAO_COD;   // (a Clássica amarela, a padrão até a v70.2, agora é um modelo como os outros: não muda)
const tp71Time = q => q && (q.time != null ? q.time : q.funcao === 'gk' ? 1 : 0) ? 1 : 0;
function tpNoTime(cod, t){ return tp71Padrao(cod) ? TP_TIME_COD[t ? 1 : 0] : cod; }
function tpNoTimeSk(sk, t){ return sk && tp71Padrao(sk.id) ? (tpSkin(TP_TIME_COD[t ? 1 : 0]) || sk) : sk; }
skinDoBot = function(q){                                 // os bots (e os companheiros do treino) jogam com a padrão, na cor do time
  const t = tp71Time(q);
  return tpSkin(tpEhCodigo(q && q.netSkin) ? tpNoTime(q.netSkin, t) : TP_TIME_COD[t]);
};
net49Skin = function(q){                                 // na sala online: cada um com a sua; a padrão (e o bot da vaga) na cor do time
  if (q === P) return tpNoTimeSk(skinAtual(), P.time);
  return tpSkin(tpEhCodigo(q && q.netSkin) ? tpNoTime(q.netSkin, q && q.time) : TP_TIME_COD[q && q.time ? 1 : 0]);
};
const rpSkinDeAntes71 = rpSkinDe;
rpSkinDe = function(q, eu){                              // o replay guarda a tampinha já na cor do time
  const c = rpSkinDeAntes71(q, eu);
  return tpEhCodigo(c) ? tpNoTime(c, eu || q === P ? P.time : tp71Time(q)) : c;
};
const rpSkinEntAntes71 = rpSkinEnt;
rpSkinEnt = function(R, i){                              // (replays de antes: a padrão também sai na cor do time)
  const s = rpSkinEntAntes71(R, i), e = R && R.ents && R.ents[i];
  return e ? tpNoTimeSk(s, e.time) : s;
};
try {                                                    // quem estava com a amarela por ser a padrão passa para a nova (uma vez)
  if (!localStorage.getItem('racha-v71-padrao')){
    if (TP.equipada === TP_PADRAO_ANTIGO){ TP.equipada = ''; tpSalva(); perfil.skin = tpMinha(); perfilSalvar(); }
    localStorage.setItem('racha-v71-padrao', '1');
  }
} catch (_) {}
if (perfil.skin === TP_PADRAO_ANTIGO && !TP.equipada) perfil.skin = tpMinha();

/* ---------------------------------------------------------------- o placar, a tela do fim e a saída de bola */
placarCaixa = function(g, p0, p1, tempo, prorrog, un){  // os números na cor que dá para ler em cima de cada time
  const cx = W/2, y = 12, h = 52, wt = 150, wp = 92, x0 = cx - wt/2 - wp, c0 = rqCor(0), c1 = rqCor(1);
  g.save();
  g.translate(x0, y); pintaHud(g, sprHud('placar71|' + c0.base + '|' + c1.base, escHud(1), 6, 6, wt + 2*wp + 6, h + 12, k => { k.translate(-x0, -y); placarFundo(k, x0, y, h, wt, wp); })); g.translate(-x0, -y);
  txt(g, String(p0), x0 + wp/2, y + h/2 + 2, 38, c0.txt, c0.txt === '#ffffff' ? 'rgba(0,0,0,.55)' : null, 5);
  txt(g, String(p1), x0 + wp + wt + wp/2, y + h/2 + 2, 38, c1.txt, c1.txt === '#ffffff' ? 'rgba(0,0,0,.55)' : null, 5);
  if (un){ txt(g, tempo, cx, y + h/2 - 7, 27, '#fff', 'rgba(0,0,0,.6)', 5); txt(g, un, cx, y + h - 9, 19, '#ffe9a8', 'rgba(0,0,0,.7)', 4); }
  else txt(g, tempo, cx, y + h/2 + 2, prorrog ? 30 : 34, prorrog ? '#ffd23f' : '#fff', 'rgba(0,0,0,.6)', 5);
  g.restore();
};
placarFundo = function(g, x0, y, h, wt, wp){             // a caixa: o meio escuro, o preto e o branco nas pontas, o ○ cheio e o ◌ tracejado
  rr(g, x0, y + 5, wt + 2*wp, h, 16); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
  rr(g, x0, y, wt + 2*wp, h, 16); g.fillStyle = '#23272c'; g.fill();
  g.save(); rr(g, x0, y, wt + 2*wp, h, 16); g.clip();
  const c0 = rqCor(0), c1 = rqCor(1);
  g.fillStyle = c0.base; g.fillRect(x0, y, wp, h);
  g.fillStyle = c1.base; g.fillRect(x0 + wp + wt, y, wp, h);
  g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x0, y, wt + 2*wp, 6);
  g.restore();
  rr(g, x0, y, wt + 2*wp, h, 16); g.lineWidth = 4; g.strokeStyle = '#0d0f12'; g.stroke();
  const cy = y + h/2, r0 = 7;
  g.save(); g.lineWidth = 3.4;
  g.strokeStyle = c0.txt; g.beginPath(); g.arc(x0 + 15, cy, r0, 0, TAU); g.stroke();
  g.strokeStyle = c1.txt; g.setLineDash([3.6, 2.6]); g.beginPath(); g.arc(x0 + 2*wp + wt - 15, cy, r0, 0, TAU); g.stroke();
  g.restore();
};
const rqMostraFimAntes71 = rqMostraFim;
rqMostraFim = function(){                                // a tela do fim: o número em cima de cada time com a cor que dá para ler
  const r = rqMostraFimAntes71.apply(this, arguments);
  try { for (const [id, t] of [['fim-v', 0], ['fim-a', 1]]){ const el = fimEl(id); if (el){ el.style.background = rqCor(t).base; el.style.color = rqCor(t).txt; el.style.textShadow = t ? 'none' : ''; } } } catch (_) {}
  return r;
};
desenhaSaidaArco = function(g){                          // a barreira da saída na cor de quem bate, com um contorno (o branco em cima da cal)
  if (!RQ.on || RQ.estado !== 'saida') return;
  const t = RQ.saidaTime ? 1 : 0, lado = rqLado(1 - t), c = MARCAS.circulo, e = U(LINHA_E), l = U(.367), cor = rqCor(t).base;
  const desenha = (k, cr) => {
    g.fillStyle = cr; g.strokeStyle = cr;
    g.fillRect(CX - l*k/2, GT, l*k, CY - c + e - GT); g.fillRect(CX - l*k/2, CY + c - e, l*k, GB - (CY + c - e));
    g.lineWidth = e*k; g.lineCap = 'butt'; g.beginPath();
    if (lado < 0) g.arc(CX, CY, c - e/2, Math.PI/2, Math.PI*1.5); else g.arc(CX, CY, c - e/2, -Math.PI/2, Math.PI/2);
    g.stroke();
  };
  g.save(); desenha(1.9, t ? 'rgba(10,12,14,.75)' : 'rgba(255,255,255,.55)'); desenha(1, cor); g.restore();
};

/* ---------------------------------------------------------------- a sala: o cartão de quem está num time mostra a tampinha do time */
const slTampaAntes71 = slTampa;
slTampa = function(m){
  const r = NET49.room, t = m && r && m.slot >= 0 && r.n ? Math.floor(m.slot/r.n) : -1;
  return slTampaAntes71(t >= 0 && tpEhCodigo(m.skin) ? Object.assign({}, m, {skin:tpNoTime(m.skin, t)}) : m);
};
