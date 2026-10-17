/* ==================================================================================================================
   RACHA rua v73 · O SENSOR MAIS TRANSPARENTE (o pedido: "o sensor preto ao redor dos players deve ser mais transparente,
   para ficar com um visual mais bonito").
   O "sensor" é o halo de spray em volta de cada jogador (v61), na cor do time: no Time Preto, um anel quase preto com
   contorno escuro e sombra dura; a borda de fora dele marca o alcance do chute. Agora:
   · o halo fica com 45% da força (o mesmo desenho e o mesmo tamanho: a borda de fora continua no alcance do chute);
   · a ponta que mostra para onde cada um está virado, com 70%;
   · o contorno escuro de cada time nas partidas e no replay (cheio = casa, tracejado = visitante; v70), com 40%.
   A carga do chute armado (o tracejado que gira por cima) e a piscada do chute que sai continuam fortes: são o aviso do
   botão. Vale em todo lugar onde o halo aparece: partida, treino, replay e a prévia dos times em SKINS (o mesmo desenho
   pronto). Só desenho: física, colisão, alcance e força do chute não mudam.
   (A v73 também tira o TESTE da v72, a pedido: o build não junta mais tools/v72; aqui só some a escolha que ele guardava.)
   ================================================================================================================== */
const SENSOR73 = {halo:.45, tag:.7, contorno:.4};
try { localStorage.removeItem('racha-teste-modo-v72'); } catch (_) {}   // (o modo que o TESTE da v72 guardava)

const spriteHaloAntes73 = spriteHalo;
spriteHalo = function(cor, rpx, camada){                   // o halo parado ('p') sai pronto já transparente; a carga ('c') fica igual
  if (camada !== 'p') return spriteHaloAntes73.apply(this, arguments);
  const key = cor + '|' + rpx + '|p73';
  let c = SPR_ARO.get(key);
  if (c) return c;
  const o = spriteHaloAntes73(cor, rpx, 'p');
  c = document.createElement('canvas'); c.width = o.width; c.height = o.height;
  const g = c.getContext('2d'); g.globalAlpha = SENSOR73.halo; g.drawImage(o, 0, 0);
  SPR_ARO.delete(cor + '|' + rpx + '|p');                  // (o forte não é mais desenhado: só o transparente fica guardado)
  SPR_ARO.set(key, c);
  return c;
};
const SPR_TAG73 = new Map();
const spriteTagAntes73 = spriteTag;
spriteTag = function(cor, rpx, k){                         // a ponta, também pronta (com o mesmo dc, a distância do centro)
  const key = cor + '|' + rpx;
  let v = SPR_TAG73.get(key);
  if (!v){ if (SPR_TAG73.size > 12) SPR_TAG73.clear(); v = new Array(HALO.dirs); SPR_TAG73.set(key, v); }
  if (v[k]) return v[k];
  const o = spriteTagAntes73(cor, rpx, k), c = document.createElement('canvas');
  c.width = o.width; c.height = o.height; c.dc = o.dc;
  const g = c.getContext('2d'); g.globalAlpha = SENSOR73.tag; g.drawImage(o, 0, 0);
  return v[k] = c;
};
const v70ContornoAntes73 = v70Contorno;
v70Contorno = function(g){                                 // o contorno do time (cheio/tracejado) mais leve: ainda separa os times sem pesar
  g.save(); g.globalAlpha *= SENSOR73.contorno;
  try { return v70ContornoAntes73.apply(this, arguments); } finally { g.restore(); }
};
