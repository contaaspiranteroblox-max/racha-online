'use strict';
/* RACHA v95 · o servidor das salas nesta rodada (sem navegador: as conexões de mentira do tests/servidor_test.js e, no fim,
   uma conversa pela rede de verdade):
   1) a RANQUEADA AO VIVO (server/fila95.js): {type:'fila_info'} → quantos online, jogando, as salas rolando e quantos procuram
      em cada tamanho (1v1 a 4v4) — só números, nenhum nome ou ID; o ritmo do pedido; quem está na fila recebe sozinho;
   2) o RANK OFF da Oficina: a sala com mapa liga e desliga (só o admin, só com mapa), vai no cartão da sala e na lista, volta
      a desligar sem mapa, vai no resultado e a partida com ele não conta nas jogadas do mapa;
   3) o EMOJI da tampinha no cartão da sala (o "cos" do bilhete assinado pela plataforma) e o que não é emoji fica de fora;
   4) os CAMPOS 30% maiores: as medidas do servidor (física e núcleo) são as do jogo (as do build) e são as de antes × 1,3;
   6) depois do teste: as LINHAS do mapa (o criador liga "para todos": o mapa guarda, a sala leva e o RANK OFF não precisa), a
      TAMPINHA GRANDE que chuta (o anel nunca por dentro dela) e o DESLIZE da tampinha (o freio do mapa).
   Rodar: node tests/v95_servidor_test.js */
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const RAIZ = path.resolve(__dirname, '..');
const {Turma} = require(path.join(RAIZ, 'server', 'turma'));
const {assina} = require(path.join(RAIZ, 'server', 'banco'));
const fila95 = require(path.join(RAIZ, 'server', 'fila95'));

let ok = 0, falhou = 0; const falhas = [];
function confira(cond, txt, extra){
  if (cond){ ok++; console.log('  ok   ' + txt); }
  else { falhou++; falhas.push(txt); console.log('  FALHOU ' + txt + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 500) : '')); }
  return cond;
}
class WsFalso extends EventEmitter {
  constructor(){ super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; this.vivo = true; }
  send(t){ if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
  close(){ if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate(){ this.close(); }
  ping(){}
}
let relogio = 1.76e12;
const anda = ms => { relogio += ms; };
function novaTurma(o){ return new Turma(Object.assign({log:() => {}, agora:() => relogio, p2p:false, exigeConta:false, mapas:null}, o || {})); }
let ipN = 1;
function cliente(t, nome){
  const ws = new WsFalso();
  const c = t.conecta(ws, {headers:{}, socket:{remoteAddress:'10.9.0.' + (ipN++ % 250)}});
  let rid = 0;
  const k = {ws, c, nome,
    manda: m => ws.emit('message', JSON.stringify(m)),
    ult: tipo => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === tipo) return ws.caixa[i]; return null; },
    todas: tipo => ws.caixa.filter(x => x.type === tipo),
    limpa: () => { ws.caixa.length = 0; },
    sala: () => { const r = k.ult('room'); return r && r.room; },
    pede: (op, args) => { const r = ++rid; c.baldes = {}; ws.emit('message', JSON.stringify({type:'mapa_req', rid:r, op, args})); return ws.caixa.find(x => x.type === 'mapa_res' && x.rid === r) || null; }};
  return k;
}
function entra(t, nome, extra){ const k = cliente(t, nome); k.manda(Object.assign({type:'hello', name:nome, skin:'', flag:'BR'}, extra || {})); const h = k.ult('hello'); k.id = h && h.id; k.token = h && h.token; k.pub = h && h.pub; return k; }
const mapaBase = o => Object.assign({formato:'racha-mapa', v:1, nome:'Arena do Rank', descricao:'Campo de teste', categoria:'competitivo',
  campo:{w:71, h:50, margem:7.5, margemY:5}, partida:{equipes:2, porTime:1},
  objetos:[{id:'gA', tipo:'gol', x:-35.5, y:0, rot:180, largura:16, dono:0}, {id:'gB', tipo:'gol', x:35.5, y:0, rot:0, largura:16, dono:1}], logica:[]}, o || {});

function filaInfo(){
  console.log('\n1) a ranqueada ao vivo: online, jogando e procurando em cada tamanho (só números)');
  const t = novaTurma();
  const A = entra(t, 'Ana'), B = entra(t, 'Bia'), C = entra(t, 'Caio'), D = entra(t, 'Dani');
  A.limpa(); A.manda({type:'fila_info'});
  let r = A.ult('fila_info');
  confira(r && r.online === 4 && r.jogando === 0 && r.salas === 0 && JSON.stringify(r.busca) === '[0,0,0,0]', 'quem pede recebe: 4 online, ninguém jogando, ninguém procurando', r);
  confira(r && Object.keys(r).sort().join() === 'busca,jogando,online,salas,type', 'a resposta só tem contagens (nenhum nome, nenhum ID)', r && Object.keys(r));
  B.limpa(); B.manda({type:'fila', n:2, pts:100});
  confira(!!B.ult('fila') && B.ult('fila').on, 'a Bia entra na fila do 2v2');
  const pushB = B.ult('fila_info');
  confira(pushB && JSON.stringify(pushB.busca) === '[0,1,0,0]', 'quem está na fila recebe a contagem sozinho (sem pedir)', pushB);
  C.manda({type:'fila', n:3, pts:100});
  A.limpa(); A.c.baldes = {}; A.manda({type:'fila_info'}); r = A.ult('fila_info');
  confira(r && JSON.stringify(r.busca) === '[0,1,1,0]' && r.online === 4, 'a Ana vê: 1 procurando o 2v2 e 1 o 3v3', r);
  C.manda({type:'fila_sai'});
  A.limpa(); A.c.baldes = {}; A.manda({type:'fila_info'}); r = A.ult('fila_info');
  confira(r && JSON.stringify(r.busca) === '[0,1,0,0]', 'o Caio saiu da fila: some da contagem', r);
  // o ritmo: 2 por segundo, até 4 seguidos (sem resposta quando passa)
  A.limpa(); A.c.baldes = {};
  for (let i = 0; i < 12; i++) A.manda({type:'fila_info'});
  const n = A.todas('fila_info').length;
  confira(n === 4, 'o ritmo: 12 pedidos de uma vez → 4 respostas (o resto fica sem resposta, sem erro)', n);
  confira(!A.ult('error'), 'passar do ritmo não manda mensagem de erro');
  // a ranqueada começa: os dois do 1v1 viram uma sala (jogando = 2, 1 sala rolando)
  D.manda({type:'fila', n:1, pts:50});
  const E = entra(t, 'Eva'); E.manda({type:'fila', n:1, pts:60});
  const rD = t.salaDe(D.c);
  confira(rD && rD.ranked && rD.state === 'playing', 'a Dani e a Eva no 1v1: a ranqueada começou');
  A.limpa(); A.c.baldes = {}; A.manda({type:'fila_info'}); r = A.ult('fila_info');
  confira(r && r.jogando === 2 && r.salas === 1 && r.online === 5 && JSON.stringify(r.busca) === '[0,1,0,0]', 'agora: 5 online, 2 jogando numa sala, a Bia ainda procurando o 2v2', r);
  // a contagem direta (a mesma função do servidor)
  const k = fila95.contagem(t);
  confira(k.online === 5 && k.jogando === 2 && k.salas === 1, 'a contagem do módulo é a mesma da mensagem', k);
  B.ws.close();
  A.limpa(); A.c.baldes = {}; A.manda({type:'fila_info'}); r = A.ult('fila_info');
  confira(r && r.online === 4 && JSON.stringify(r.busca) === '[0,0,0,0]', 'a Bia fechou o jogo: sai do online e da fila', r);
  t.fecha();
}

function rankOff(){
  console.log('\n2) o RANK OFF da Oficina: liga na sala com mapa, vai no cartão e na lista, e a partida não conta nas jogadas do mapa');
  const t = novaTurma({segredo:'s3gr3d0'});
  const A = entra(t, 'Ana', {conta:assina('s3gr3d0', {p:'20', n:'Ana'})}), B = entra(t, 'Bia'), C = entra(t, 'Caio');
  const pub = A.pede('publicar', {mapa:mapaBase(), visibilidade:'publico'});
  confira(pub && pub.ok, 'a Ana publica um mapa', pub && pub.erro);
  const id = pub.meta.id, codigo = pub.meta.codigo;
  A.limpa();
  A.manda({type:'create', mapa:{codigo}, bots:true, n:1, pub:true, rankOff:true});
  let sala = A.sala();
  confira(sala && sala.mapa && sala.rankOff === true, 'criar a sala com mapa e o RANK OFF: o cartão da sala diz rankOff', sala && {mapa:!!sala.mapa, rankOff:sala.rankOff});
  C.manda({type:'list'});
  let item = C.ult('rooms') && C.ult('rooms').list.find(x => x.code === sala.code);
  confira(item && item.rankOff === true && item.mapa, 'a lista das salas também mostra o RANK OFF', item);
  B.manda({type:'join', code:sala.code});
  B.manda({type:'config', rankOff:false});
  confira(A.sala().rankOff === true, 'quem não é o admin não desliga o RANK OFF');
  A.manda({type:'config', rankOff:false}); sala = A.sala();
  confira(sala.rankOff === false, 'o admin desliga');
  A.manda({type:'config', rankOff:true}); sala = A.sala();
  confira(sala.rankOff === true, 'e liga de novo');
  A.manda({type:'config', rankOff:'sim'});
  confira(A.sala().rankOff === true, 'o que não é verdadeiro/falso é ignorado');
  // a partida com o RANK OFF: o resultado leva rankOff e não conta nas jogadas do mapa
  const antes = t.mapas.d.mapas[id].jogos | 0;
  A.limpa(); B.limpa();
  A.manda({type:'start'});
  const r = t.salaDe(A.c);
  confira(r && r.state === 'playing' && r.partida, 'começou a partida no mapa');
  A.manda({type:'config', rankOff:false});
  confira(r.rankOff === true, 'com a partida rolando, o RANK OFF não muda');
  r.partida.desligar();
  anda(45000);
  t.encerraMapa(r, {placar:[2, 0], vencedor:0, jog:[]});
  const res = A.ult('result');
  confira(res && res.custom && res.valida && res.rankOff === true, 'o resultado da partida diz rankOff', res);
  confira((t.mapas.d.mapas[id].jogos | 0) === antes, 'a partida com o RANK OFF não conta nas jogadas do mapa', [antes, t.mapas.d.mapas[id].jogos]);
  // a mesma coisa sem o RANK OFF: conta
  A.manda({type:'config', rankOff:false});
  confira(A.sala().rankOff === false, 'depois da partida o admin desliga o RANK OFF');
  A.manda({type:'rematch'});
  const r2 = t.salaDe(A.c); r2.partida.desligar();
  anda(45000);
  t.encerraMapa(r2, {placar:[1, 0], vencedor:0, jog:[]});
  const res2 = A.ult('result');
  const gente = r2.roster.filter(Boolean).length;
  confira(res2 && res2.rankOff === false && gente >= 1 && (t.mapas.d.mapas[id].jogos | 0) === antes + gente, 'sem o RANK OFF a partida conta (uma por pessoa que jogou)', [res2 && res2.rankOff, gente, t.mapas.d.mapas[id].jogos]);
  // voltar para os campos do RACHA desliga o RANK OFF; numa sala comum ele não existe
  A.manda({type:'config', rankOff:true}); A.manda({type:'config', semMapa:true}); sala = A.sala();
  confira(!sala.mapa && sala.rankOff === false, 'sem o mapa (os campos do RACHA), o RANK OFF desliga');
  A.manda({type:'config', rankOff:true});
  confira(A.sala().rankOff === false, 'numa sala comum o RANK OFF não liga');
  A.manda({type:'leave'});
  const K = entra(t, 'Kai'); K.manda({type:'create', n:2, bots:true, rankOff:true});
  confira(K.sala() && K.sala().rankOff === false, 'criar uma sala comum pedindo o RANK OFF: fica desligado (é só da Oficina)');
  t.fecha();
}

function linhasChuteDeslize(){
  console.log('\n6) depois do teste: as linhas do mapa (o criador liga para todos), a tampinha grande que chuta e o deslize da tampinha');
  const M = require(path.join(RAIZ, 'server', 'partida', 'mapa')), N = require(path.join(RAIZ, 'server', 'partida', 'nucleo'));
  const P1 = {equipes:2, porTime:1};
  const l1 = M.limpa(mapaBase()), l2 = M.limpa(mapaBase({partida:Object.assign({linhas:true}, P1)})), l3 = M.limpa(mapaBase({partida:Object.assign({linhas:'sim'}, P1)}));
  confira(l1.ok && !('linhas' in l1.mapa.partida) && l2.ok && l2.mapa.partida.linhas === true && !('linhas' in l3.mapa.partida),
    'o mapa guarda "linhas da bola para todos" só quando ligado (true); os mapas de antes ficam com o mesmo JSON', [l1.mapa.partida.linhas, l2.mapa.partida.linhas, l3.mapa.partida.linhas]);
  // a sala com esse mapa: o RANK OFF não liga (o mapa já mostra as linhas; a partida conta normal)
  const t = novaTurma({segredo:'s3gr3d0'});
  const A = entra(t, 'Ana', {conta:assina('s3gr3d0', {p:'21', n:'Ana'})});
  const pub = A.pede('publicar', {mapa:mapaBase({nome:'Arena das Linhas', partida:Object.assign({linhas:true}, P1)}), visibilidade:'publico'});
  confira(pub && pub.ok, 'a Ana publica um mapa com as linhas para todos', pub && pub.erro);
  A.manda({type:'create', mapa:{codigo:pub.meta.codigo}, bots:true, n:1, pub:true, rankOff:true});
  const sala = A.sala(), r = t.salaDe(A.c);
  confira(sala && sala.mapa && sala.rankOff === false && r && r.mapaDados && r.mapaDados.partida.linhas === true,
    'a sala com esse mapa: o mapa que vai para os aparelhos leva as linhas e o RANK OFF pedido fica desligado (a partida conta)', sala && {rankOff:sala.rankOff});
  A.manda({type:'config', rankOff:true});
  confira(A.sala().rankOff === false, '   o admin liga o RANK OFF nessa sala: continua desligado');
  t.fecha();
  // a tampinha grande chuta: o anel do chute vale pelo menos o raio + 0,5 u (antes, com o tamanho maior que o anel, não chutava)
  const C0 = N.resolve(N.PERFIL_V92), F = require(path.join(RAIZ, 'server', 'partida', 'fisica.js'));
  confira(C0.RAIO_CHUTE === F.RAIO_CHUTE && C0.ALCANCE_CHUTE === F.ALCANCE_CHUTE && N.FOLGA_CHUTE === 0.5, 'o perfil oficial não muda (o anel de 2,5 u, o alcance de 3,5 u entre os centros)');
  const partida = fis => { const m = mapaBase(); m.fisica = Object.assign({preset:'personalizado', perfil:{}, extra:{}}, fis); const L = M.limpa(m);
    const P = M.novaPartida(L.mapa, {jogadores:[{netId:'a', nome:'A'}, {netId:'b', nome:'B'}]}); P.estado = 'jogo'; return P; };
  const chuta = (rj, rc) => { const P = partida({perfil:{rJog:rj, raioChute:rc}}), q = P.jog[0], B = P.B, C = P.C;
    B.x = q.x + C.R_JOG + C.R_BOLA + 0.5; B.y = q.y; B.vx = B.vy = 0;   // (a bola encostada: o mais perto que a batida deixa)
    return {ok:P.chuta(q, C.FORCA_POWER), anel:+(C.RAIO_CHUTE / N.U(1)).toFixed(3)}; };
  const g = [chuta(3.2, 2.5), chuta(2.6, 2.5), chuta(3.2, 4.2), chuta(1.2, 1.4), chuta(2, 2.5)];
  confira(g.every(x => x.ok) && g[0].anel === 3.7 && g[1].anel === 3.1 && g[2].anel === 4.2 && g[3].anel === 1.7 && g[4].anel === 2.5,
    'a tampinha grande chuta: o anel vale pelo menos o raio + 0,5 u (3,2 → 3,7 u; 2,6 → 3,1 u); o anel maior fica o dele (4,2 u)', g);
  // o deslize da tampinha (o freio do mapa: soltou o analógico, ela anda (1 − f) ÷ f passos de velocidade)
  const desliza = f => { const P = partida({extra:{freioJog:f}}), q = P.jog[0]; q.x = P.B.x - N.U(24); q.y = P.B.y + N.U(12); q.vx = P.C.VEL_JOG; q.vy = 0; const x0 = q.x;   // (longe da bola e do outro)
    for (let i = 0; i < 300; i++) P.passo(null);
    return +((q.x - x0) / N.U(1)).toFixed(2); };
  const d = [desliza(1), desliza(0.5), desliza(0.0583), desliza(0.03)], esperado = f => 14.1 * (1 - f) / f / 60;
  confira(d[0] === 0 && d[1] > 0 && Math.abs(d[2] - esperado(0.0583)) < 0.35 && Math.abs(d[3] - esperado(0.03)) < 0.35 && d[3] > d[2] && d[2] > d[1],
    'o deslize da tampinha: 0% para na hora; 50% anda ~' + esperado(0.0583).toFixed(1) + ' u e 100% ~' + esperado(0.03).toFixed(1) + ' u depois de soltar (medido: ' + d.join(' · ') + ' u)', d);
}

function emojiNoCartao(){
  console.log('\n3) o emoji da tampinha no cartão da sala (vem no bilhete assinado pela plataforma)');
  const t = novaTurma({segredo:'s3gr3d0'});
  const A = entra(t, 'Ana', {conta:assina('s3gr3d0', {p:'30', n:'Ana', q:{emoji:'emoji_diabinho', bola:'bola_rua'}})});
  const B = entra(t, 'Bia', {conta:assina('s3gr3d0', {p:'31', n:'Bia', q:{emoji:'<img src=x onerror=alert(1)>'}})});
  const C = entra(t, 'Caio');
  A.manda({type:'create', n:2, bots:true, pub:true});
  const code = A.sala().code;
  B.manda({type:'join', code}); C.manda({type:'join', code});
  const ms = A.sala().members;
  const a = ms.find(m => m.id === A.id), b = ms.find(m => m.id === B.id), c = ms.find(m => m.id === C.id);
  confira(a && a.cos && a.cos.emoji === 'emoji_diabinho' && a.cos.bola === 'bola_rua', 'a Ana (com a conta) aparece com o emoji dela no cartão da sala', a && a.cos);
  confira(b && b.cos && b.cos.emoji === undefined, 'o que não é um código de emoji não entra no cartão', b && b.cos);
  confira(c && (!c.cos || !c.cos.emoji), 'quem não tem conta não leva emoji', c && c.cos);
  const D = entra(t, 'Dani', {conta:assina('outro-segredo', {p:'32', n:'Dani', q:{emoji:'emoji_rei_racha'}})});
  D.manda({type:'join', code});
  const d = A.sala().members.find(m => m.id === D.id);
  confira(!d || !d.cos || !d.cos.emoji, 'o bilhete com outra assinatura não vale (ninguém põe um emoji que não comprou)', d && d.cos);
  t.fecha();
}

function campos(){
  console.log('\n4) os campos 30% maiores: o servidor tem as mesmas medidas do jogo');
  const F = require(path.join(RAIZ, 'server', 'partida', 'fisica'));
  const N = require(path.join(RAIZ, 'server', 'partida', 'nucleo'));
  const html = fs.readFileSync(path.join(RAIZ, 'app', 'public', 'game', 'racha.html'), 'utf8');
  const bloco = (nome) => { const i = html.indexOf('const ' + nome + ' = ['); if (i < 0) return null; const j = html.indexOf('];', i); return new Function('return ' + html.slice(html.indexOf('[', i), j + 1))(); };
  const MJ = bloco('MODOS'), MK = bloco('MARCAS_MODO');
  const ANTES = [{bola:[56, 40], gol:[6.6, 12.8], jog:[71, 50]}, {bola:[71, 50], gol:[6.6, 16], jog:[86, 60]}, {bola:[86, 70], gol:[7, 20.5], jog:[101, 80]}, {bola:[108, 90], gol:[7, 24.5], jog:[124, 100]}];
  confira(Array.isArray(MJ) && MJ.length === 4 && Array.isArray(MK) && MK.length === 4, 'o jogo (o build) tem as 4 medidas (1v1 a 4v4)');
  const perto = (a, b) => Math.abs(a - b) < .06;
  let ok1 = true, ok2 = true, ok3 = true;
  for (let i = 0; i < 4; i++){
    const a = ANTES[i], j = MJ[i];
    ok1 = ok1 && perto(j.bola[0], a.bola[0]*1.3) && perto(j.bola[1], a.bola[1]*1.3) && j.gol[1] === a.gol[1] && j.gol[0] === a.gol[0];
    ok2 = ok2 && perto(j.jog[0] - j.bola[0], a.jog[0] - a.bola[0]) && perto(j.jog[1] - j.bola[1], a.jog[1] - a.bola[1]);
    for (const S of [F.MODOS[i], N.MODOS[i]]) ok3 = ok3 && JSON.stringify([S.jog, S.bola, S.gol, S.trave, S.rede]) === JSON.stringify([j.jog, j.bola, j.gol, j.trave, j.rede]);
  }
  confira(ok1, 'o campo da bola: o de antes × 1,3; o gol (a boca e a profundidade): o de antes', MJ.map(m => [m.bola, m.gol]));
  confira(ok2, 'a faixa de fora (onde só o jogador anda) continua a mesma', MJ.map(m => [m.jog[0] - m.bola[0], m.jog[1] - m.bola[1]]));
  confira(ok3, 'o servidor (fisica.js e nucleo.js) tem exatamente as medidas do jogo', [F.MODOS[1], N.MODOS[1], MJ[1]]);
  // a barreira da saída do núcleo acompanha o círculo do jogo
  const saidas = [1, 2, 3, 4].map(n => { const G = N.novoCampo(n); return Math.round(G.circ/N.U(1)*100)/100; });
  confira(JSON.stringify(saidas) === JSON.stringify(MK.map(m => Math.round(m.saida*100)/100)), 'a barreira da saída do servidor = o círculo da saída do jogo (× 1,3)', [saidas, MK.map(m => m.saida)]);
  const g2 = N.novoCampo(2);
  confira(perto((g2.LX1 - g2.LX0)/N.U(1), 92.3) && perto((g2.LY1 - g2.LY0)/N.U(1), 65), 'o campo do 2v2 no servidor: 92,3 × 65 (era 71 × 50)', [(g2.LX1 - g2.LX0)/N.U(1), (g2.LY1 - g2.LY0)/N.U(1)]);
}

async function rede(){
  console.log('\n5) pela rede de verdade (WebSocket, o servidor de verdade): o fila_info');
  const {fork} = require('child_process');
  const os = require('os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'racha-v95-rede-'));
  const filho = fork(path.join(RAIZ, 'server', 'servidor.js'), ['--porta', '0', '--memoria', '--visitantes', '--mapas', dir], {silent:true, env:Object.assign({}, process.env, {RACHA_MAPAS:dir})});
  try {
    const porta = await new Promise((res, rej) => { filho.on('message', m => { if (m && m.pronto) res(m.porta); }); setTimeout(() => rej(new Error('o servidor não subiu')), 8000); });
    const conecta = () => new Promise((res, rej) => {
      const ws = new WebSocket('ws://127.0.0.1:' + porta + '/');
      const k = {ws, caixa:[], espera:(tipo, f, ms) => new Promise((ok2, no) => { const t0 = Date.now(); const v = () => { const x = k.caixa.find(m => m.type === tipo && (!f || f(m))); if (x) return ok2(x); if (Date.now() - t0 > (ms || 4000)) return no(new Error('não chegou ' + tipo)); setTimeout(v, 20); }; v(); })};
      ws.onmessage = e => { try { k.caixa.push(JSON.parse(e.data)); } catch (_) {} };
      ws.onopen = () => res(k); ws.onerror = rej;
    });
    const A = await conecta(), B = await conecta();
    A.ws.send(JSON.stringify({type:'hello', name:'Ana'})); B.ws.send(JSON.stringify({type:'hello', name:'Bia'}));
    await A.espera('hello'); await B.espera('hello');
    B.ws.send(JSON.stringify({type:'fila', n:4, pts:10}));
    const pushB = await B.espera('fila_info');
    A.ws.send(JSON.stringify({type:'fila_info'}));
    const r = await A.espera('fila_info');
    confira(r && r.online === 2 && JSON.stringify(r.busca) === '[0,0,0,1]' && r.jogando === 0, 'pela rede: 2 online e 1 procurando o 4v4', r);
    confira(pushB && JSON.stringify(pushB.busca) === '[0,0,0,1]', 'pela rede: quem está na fila recebe a contagem sozinho', pushB);
    A.ws.close(); B.ws.close();
  } catch (e) { confira(false, 'a conversa pela rede', String(e)); }
  filho.kill();
  try { fs.rmSync(dir, {recursive:true, force:true}); } catch (_) {}
}

(async () => {
  const t0 = Date.now();
  filaInfo();
  rankOff();
  emojiNoCartao();
  campos();
  linhasChuteDeslize();
  await rede();
  console.log('\nv95_servidor: ' + ok + '/' + (ok + falhou) + ' verificações ok em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  for (const f of falhas) console.log('  - falhou: ' + f);
  process.exit(falhou ? 1 : 0);
})();
