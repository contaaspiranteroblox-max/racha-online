'use strict';
/* Etapa 5 · o servidor da turma (server/): as regras da sala, o resultado conferido, a reconexão, a copa, os clubes,
   o Chat do Brasil, o bilhete da conta e o selo do resultado — e, pela rede de verdade, o HTTP, a origem e duas sessões.
   Rodar: node tests/servidor_test.js   (sem dependências; sobe o servidor numa porta livre, só na memória) */
const path = require('path');
const EventEmitter = require('events');
const {fork} = require('child_process');
const http = require('http');
const RAIZ = path.resolve(__dirname, '..');
const {Turma, origemPermitida} = require(path.join(RAIZ, 'server', 'turma'));
const {assina, confere} = require(path.join(RAIZ, 'server', 'banco'));

let ok = 0, falhou = 0;
function confira(cond, txt, extra){
  if (cond){ ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU ' + txt + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 300) : '')); }
}
const espera = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------- 1) as regras (na memória, com o relógio na mão) */
class WsFalso extends EventEmitter {
  constructor(){ super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; this.vivo = true; }
  send(t){ if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
  close(){ if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate(){ this.close(); }
  ping(){}
}
let relogio = 1.7e12;
function novaTurma(o){ return new Turma(Object.assign({log:() => {}, agora:() => relogio, p2p:false, exigeConta:false}, o || {})); }   // (arnês v84: os testes antigos jogam sem conta; o padrão é conferido em login())
function cliente(t, nome, ip){
  const ws = new WsFalso();
  const c = t.conecta(ws, {headers:{}, socket:{remoteAddress:ip || ('10.0.0.' + Math.floor(Math.random()*250))}});
  const k = {ws, c, nome,
    manda: m => ws.emit('message', JSON.stringify(m)),
    ult: tipo => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === tipo) return ws.caixa[i]; return null; },
    todas: tipo => ws.caixa.filter(x => x.type === tipo),
    limpa: () => { ws.caixa.length = 0; },
    sala: () => { const r = k.ult('room'); return r && r.room; }};
  return k;
}
function entra(t, nome, token){ const k = cliente(t, nome); k.manda({type:'hello', name:nome, skin:'T.AAAA' + nome.toLowerCase().padEnd(4, 'x'), flag:'BR', token}); k.id = k.ult('hello').id; k.token = k.ult('hello').token; return k; }
function quadro(host, round, score, extra){ host.manda({type:'snapshot', round, data:Object.assign({tick:Math.floor(Math.random()*1e6), elapsed:0, state:'jogo', score, ball:[0, 0, 0, 0, 0], players:[]}, extra || {})}); }

function login(){
  console.log('\n0) v84: o login obrigatório (o padrão do servidor: exigeConta ligado)');
  const t = new Turma({log:() => {}, agora:() => relogio, p2p:false, segredo:'segredo-de-teste-v84'});
  const A = cliente(t, 'Ana'); A.manda({type:'hello', name:'Ana', skin:'T.AAAA1111', flag:'BR'});
  const e = A.ult('error');
  confira(!A.ult('hello') && e && e.codigo === 'sem_conta' && A.ws.readyState === 3, 'sem conta: o hello é recusado (erro sem_conta) e a conexão fecha', e);
  const B = cliente(t, 'Bia'); B.manda({type:'hello', name:'Outro Nome', skin:'T.BBBB2222', flag:'BR', conta:assina('segredo-de-teste-v84', {p:'123', n:'Bia'})});
  const h = B.ult('hello');
  confira(h && h.conta === true && h.id === 'c123' && h.pub === '000123', 'com o bilhete assinado pela plataforma: entra com a conta (id c123, ID 000123)', h);
  const C = cliente(t, 'Caio'); C.manda({type:'hello', name:'Caio', skin:'T.CCCC3333', flag:'BR', conta:assina('outro-segredo', {p:'456', n:'Caio'})});
  const e2 = C.ult('error');
  confira(!C.ult('hello') && e2 && e2.codigo === 'sem_conta', 'bilhete assinado com outro segredo não vale: recusado', e2);
}

function regras(){
  console.log('\n1) A SALA: criar, entrar, times, árbitro');
  const t = novaTurma();
  const A = entra(t, 'Ana'), B = entra(t, 'Beto');
  confira(A.id && A.token && /^9\d{6}$/.test(A.ult('hello').pub), 'hello devolve id, token e o ID da turma (v82: 7 números para quem não tem conta; as contas têm 6)', A.ult('hello'));
  confira(A.ult('rooms') && Array.isArray(A.ult('rooms').list), 'depois do hello vem a lista de salas');
  A.manda({type:'create', n:1, map:4, jogo:'curva', tempo:0, bots:false, pub:true, name:'Racha da Laje'});
  let s = A.sala();
  confira(s && s.code.length === 6 && s.host === A.id && s.roster[0] === A.id && s.jogo === 'curva' && s.map === 4 && !s.bots && s.pub, 'criar: código de 6, dono no Time A, as regras pedidas (COM CURVA no ESTÁDIO)', s);
  const Z = entra(t, 'Zeca'); Z.manda({type:'create', n:1, map:2, jogo:'volei', tempo:0, bots:true, pub:false});
  confira(Z.sala() && Z.sala().map === 4 && Z.sala().jogo === 'futebol', 'v70.2: sala pedida no Escadão e no vôlei abre no futebol e no mapa padrão (v79: o Estádio)', Z.sala());
  Z.manda({type:'leave'});
  confira(!!A.ult('sayHistory') && A.todas('say').some(m => m.sys && /chegou na sala/.test(m.text)), 'criar: histórico do chat e a mensagem de entrada');
  A.manda({type:'seat', slot:-1});
  confira(A.sala().roster.every(x => !x), 'o árbitro vai para os espectadores (seat slot -1)');
  B.manda({type:'join', code:s.code.toLowerCase(), spectate:true});
  s = B.sala();
  confira(s && s.members.length === 2 && s.members.find(m => m.id === B.id).slot === -1, 'entrar com código (minúsculo vale) assistindo', s);
  B.manda({type:'seat', id:A.id, team:1});
  confira(/árbitro/.test((B.ult('error') || {}).message || ''), 'só o árbitro mexe nos outros', B.ult('error'));
  A.manda({type:'seat', team:0}); A.manda({type:'seat', id:B.id, team:1});
  s = A.sala();
  confira(s.roster[0] === A.id && s.roster[1] === B.id, 'o árbitro monta os times (ele e o Beto)', s.roster);
  A.manda({type:'seat', id:B.id, team:1});
  confira(A.sala().roster[1] === B.id, 'pôr no time em que já está não muda nada');
  A.manda({type:'config', n:2, bots:true, tempo:3, jogo:'ginga', map:3, name:'  Racha  novo  '});
  s = A.sala();
  confira(s.n === 2 && s.roster.length === 4 && s.roster[0] === A.id && s.roster[2] === B.id && s.bots && s.tempo === 3 && s.name === 'Racha novo', 'config: 2v2 (quem cabe fica no lugar), bots, tempo, nome limpo', s);
  confira(s.jogo === 'curva' && s.map === 4, 'config: a GINGA e o VIADUTO não entram (a sala segue COM CURVA no ESTÁDIO)', [s.jogo, s.map]);
  A.manda({type:'config', map:0}); confira(A.sala().map === 0, 'config: trocar para a ARENA vale');
  B.manda({type:'config', n:4});
  confira(A.sala().n === 2, 'só o dono muda as regras');
  A.manda({type:'config', n:1, bots:false, tempo:0, jogo:'futebol'});
  confira(A.sala().roster.join() === [A.id, B.id].join(), 'de volta ao 1v1: Ana × Beto');

  console.log('\n2) A PARTIDA: começar, comandos, quadros, o resultado conferido');
  const C = entra(t, 'Caio');
  A.manda({type:'start'});
  s = A.sala();
  confira(s.state === 'playing' && s.round === 1 && A.ult('start') && B.ult('start'), 'começar: os dois recebem start (rodada 1)', s && s.state);
  B.manda({type:'input', seq:7, x:.6, y:-2, acao:1, k:5});
  const inp = A.ult('input');
  confira(inp && inp.id === B.id && inp.seq === 7 && inp.x === .6 && inp.y === -1 && inp.acao === 1 && inp.k === 5, 'o comando do convidado chega ao anfitrião, com a curva/finta/drible (k) e o analógico limitado', inp);
  A.limpa(); A.manda({type:'input', seq:1, x:1, y:0, acao:0});
  confira(!A.ult('input') && !B.ult('input'), 'o anfitrião não manda comando (ele simula)');
  quadro(A, 1, [0, 0]);
  confira(B.ult('snapshot') && B.ult('snapshot').round === 1, 'o quadro do anfitrião chega ao convidado');
  B.limpa(); quadro(B, 1, [5, 0]);
  confira(!A.ult('snapshot'), 'quadro de quem não é o anfitrião é ignorado');
  C.manda({type:'join', code:s.code});
  confira(C.ult('start') && C.ult('start').resume && C.sala().members.find(m => m.id === C.id).slot === -1, 'quem entra no meio assiste: recebe start com o placar atual (resume)', C.ult('start'));
  relogio += 5000; quadro(A, 1, [3, 0], {elapsed:4});
  A.manda({type:'finish', round:1, score:[3, 0]});
  let res = B.ult('result');
  confira(res && res.valida === false && /curta/.test(res.motivo), 'fim depressa demais: o resultado não vale (motivo curta)', res);
  confira(t.b.d.gente[A.id].st.jogos === 0, 'resultado que não vale não conta partida');
  confira(A.sala().state === 'ended', 'a sala fica em ended (revanche)');
  B.manda({type:'rematch'});
  confira(A.sala().members.find(m => m.id === B.id).rematch === true, 'convidado pede revanche (sem "on" = sim)');
  A.manda({type:'rematch'});
  s = A.sala();
  confira(s.state === 'playing' && s.round === 2, 'o dono pedindo revanche começa a rodada 2', s && [s.state, s.round]);
  quadro(A, 2, [0, 0]); relogio += 15000; quadro(A, 2, [1, 0], {goal:{author:A.id}}); relogio += 15000; quadro(A, 2, [2, 0], {goal:{author:A.id}}); relogio += 10000;
  quadro(A, 2, [2, 1], {goal:{author:B.id}}); quadro(A, 2, [3, 1], {goal:{author:A.id}, elapsed:33});
  A.manda({type:'finish', round:1, score:[3, 1]});
  confira(A.sala().state === 'playing', 'fim de rodada velha é ignorado');
  A.manda({type:'finish', round:2, score:[3, 1]});
  res = B.ult('result');
  const gA = t.b.d.gente[A.id], gB = t.b.d.gente[B.id];
  confira(res && res.valida === true && res.winner === 0, 'partida inteira: o resultado vale (vitória do Time A)', res);
  confira(gA.st.vit === 1 && gA.st.jogos === 1 && gA.st.gols === 3 && gB.st.der === 1 && gB.st.gols === 1, 'vale: vitória (troféu), derrota e os gols de cada um pelos quadros', [gA.st, gB.st]);
  confira(Object.values(t.b.d.duelos).some(d => d.jogos === 1 && (d.va + d.vb) === 1), 'o duelo 1v1 Ana × Beto fica guardado');
  // placar diferente dos quadros
  A.manda({type:'start'}); quadro(A, 3, [0, 0]); relogio += 40000; quadro(A, 3, [3, 2], {elapsed:35});
  A.manda({type:'finish', round:3, score:[3, 0]});
  confira((B.ult('result') || {}).valida === false && /diferente/.test(B.ult('result').motivo), 'placar do fim diferente do que os quadros mostraram: não vale', B.ult('result'));
  // placar impossível para o modo
  A.manda({type:'start'}); quadro(A, 4, [0, 0]); relogio += 40000; quadro(A, 4, [4, 1], {elapsed:35});
  A.manda({type:'finish', round:4, score:[4, 1]});
  confira((B.ult('result') || {}).valida === false && /impossível/.test(B.ult('result').motivo), 'futebol vai a 3: 4 × 1 não vale', B.ult('result'));
  // v70.2: a sala não vira basquete nem ginga (saíram do jogo): placar de basquete ou de ginga não vale; o COM CURVA vale
  A.manda({type:'config', jogo:'basquete'}); confira(A.sala().jogo === 'futebol', 'a sala não vira basquete');
  A.manda({type:'start'}); quadro(A, 5, [0, 0]); relogio += 90000; quadro(A, 5, [13, 10], {elapsed:80});
  A.manda({type:'finish', round:5, score:[13, 10]});
  confira((B.ult('result') || {}).valida === false && /impossível/.test(B.ult('result').motivo), 'placar de basquete (13 × 10) numa sala de futebol não vale', B.ult('result'));
  A.manda({type:'config', jogo:'curva'}); A.manda({type:'start'}); quadro(A, 6, [0, 0]); relogio += 60000; quadro(A, 6, [3, 1], {elapsed:50});
  A.manda({type:'finish', round:6, score:[3, 1]});
  confira((B.ult('result') || {}).valida === true, 'COM CURVA: 3 × 1 vale', B.ult('result'));
  A.manda({type:'config', jogo:'ginga'}); confira(A.sala().jogo === 'curva', 'a sala não vira ginga');
  A.manda({type:'start'}); quadro(A, 7, [0, 0]); relogio += 60000; quadro(A, 7, [6, 4], {elapsed:50});
  A.manda({type:'finish', round:7, score:[6, 4]});
  confira((B.ult('result') || {}).valida === false, 'placar de ginga (6 × 4) numa sala com curva não vale (vai a 3)', B.ult('result'));
  // com tempo
  A.manda({type:'config', jogo:'futebol', tempo:2}); A.manda({type:'start'}); quadro(A, 8, [0, 0]); relogio += 70000; quadro(A, 8, [2, 1], {elapsed:62});
  A.manda({type:'finish', round:8, score:[2, 1]});
  confira((B.ult('result') || {}).valida === false && /antes do tempo/.test(B.ult('result').motivo), 'com 2 minutos: acabar com 1 minuto não vale', B.ult('result'));
  A.manda({type:'start'}); quadro(A, 9, [0, 0]); relogio += 140000; quadro(A, 9, [1, 1], {elapsed:121});
  A.manda({type:'finish', round:9, score:[1, 1]});
  confira((B.ult('result') || {}).valida === false && /empatada/.test(B.ult('result').motivo), 'com tempo, empate não termina (gol de ouro): não vale');
  A.manda({type:'start'}); quadro(A, 10, [0, 0]); relogio += 150000; quadro(A, 10, [4, 2], {elapsed:128});
  A.manda({type:'finish', round:10, score:[4, 2]});
  confira((B.ult('result') || {}).valida === true, 'com tempo: 4 × 2 depois dos 2 minutos vale');
  // a pausa não conta como tempo de jogo
  A.manda({type:'config', tempo:0}); A.manda({type:'start'}); quadro(A, 11, [0, 0]);
  A.manda({type:'pause', paused:true});
  confira((B.ult('pause') || {}).paused === true, 'a pausa do anfitrião chega a todos');
  relogio += 120000; A.manda({type:'pause', paused:false}); relogio += 8000; quadro(A, 11, [3, 0], {elapsed:7});
  A.manda({type:'finish', round:11, score:[3, 0]});
  confira((B.ult('result') || {}).valida === false && /curta/.test(B.ult('result').motivo), 'o tempo pausado não conta: 8 s de jogo é curto demais', B.ult('result'));
  // encerrada pelo árbitro
  A.manda({type:'start'}); quadro(A, 12, [0, 0]); relogio += 60000; quadro(A, 12, [3, 1], {elapsed:50});
  A.manda({type:'say', text:'⁣ARB:e|12'});
  A.manda({type:'finish', round:12, score:[3, 1]});
  confira((B.ult('result') || {}).valida === false && /árbitro/.test(B.ult('result').motivo), 'encerrada pelo árbitro (mensagem escondida e|rodada): não vale', B.ult('result'));
  confira(!B.todas('say').some(m => /ARB:e/.test(m.text || '') && !m.id), 'a mensagem escondida do árbitro passa pelo chat da sala (o jogo esconde)');

  console.log('\n3) QUEM CAI E VOLTA, QUEM SAI, REMOVER, PASSAR O DONO, JOGAR AGORA');
  A.manda({type:'start'}); quadro(A, 13, [1, 0], {elapsed:10});
  B.ws.close();
  s = A.sala();
  confira(s.roster[1] === null && !s.members.some(m => m.id === B.id) && A.todas('say').some(m => /caiu/.test(m.text || '')), 'o convidado caiu no meio: a vaga fica livre (o anfitrião põe um bot) e a sala avisa', s.roster);
  const B2 = entra(t, 'Beto', B.token);
  confira(B2.id === B.id, 'voltou com o token: o mesmo id', [B2.id, B.id]);
  B2.manda({type:'join', code:s.code, slot:1});
  confira(A.sala().roster[1] === B.id && B2.ult('start') && B2.ult('start').resume.score.join() === '1,0', 'voltou para o mesmo lugar no meio da partida, com o placar (resume)', B2.ult('start'));
  A.ws.close();
  s = B2.sala();
  confira(B2.ult('interrupted') && C.ult('interrupted') && [B.id, C.id].includes(s.host) && s.state === 'waiting', 'o anfitrião caiu: a partida para (interrupted) e a sala passa para quem está há mais tempo', [B2.ult('interrupted'), s.host, s.state]);
  const dono = s.host === B.id ? B2 : C, outro = dono === B2 ? C : B2;
  const A2 = entra(t, 'Ana', A.token);
  A2.manda({type:'join', code:s.code, spectate:true});
  confira(B2.sala().members.some(m => m.id === A.id) && B2.sala().host === dono.id, 'a Ana voltou como convidada (o dono continua o novo)');
  dono.manda({type:'kick', id:A.id});
  confira(A2.ult('left') && /removido/.test((A2.ult('error') || {}).message), 'remover da sala: quem sai recebe left e o aviso');
  A2.manda({type:'join', code:s.code});
  confira(/removido/.test((A2.ult('error') || {}).message) && !B2.sala().members.some(m => m.id === A.id), 'removido não volta na hora (30 s)');
  dono.manda({type:'promote', id:C.id === dono.id ? B.id : C.id});
  const C0 = C;
  confira(B2.sala().host === outro.id, 'passar o dono');
  const Cx = outro;
  const D = entra(t, 'Duda');
  Cx.manda({type:'config', n:2, bots:true});
  D.manda({type:'join', code:s.code, rapido:true});
  const eD = Cx.sala().members.find(m => m.id === D.id);
  confira(eD && eD.slot >= 0, 'JOGAR AGORA (rapido): entra com lugar num time', Cx.sala().roster);
  Cx.manda({type:'leave'});
  confira(Cx.ult('left') && D.sala().host !== Cx.id, 'o dono saiu: left para ele e a sala passa para outro');
  const B2v = Cx === B2 ? C0 : B2;
  D.manda({type:'profile', name:'Dudinha', skin:'T.NOVA1234'});
  const eD2 = B2v.sala().members.find(m => m.id === D.id);
  confira(eD2 && eD2.name === 'Dudinha' && eD2.skin === 'T.NOVA1234', 'trocou o nome e a tampinha: o cartão da sala atualiza para todos', eD2);

  console.log('\n4) A COPA DOS AMIGOS (1v1 com 4)');
  const t2 = novaTurma();
  const J = ['Ana', 'Beto', 'Caio', 'Duda'].map(n => entra(t2, n));
  J[0].manda({type:'create', n:2, map:0, jogo:'futebol', tempo:0, bots:true, pub:true});
  const cod = J[0].sala().code;
  J[0].manda({type:'cupCreate', name:'Copa'});
  confira(/4 ou 8/.test((J[0].ult('error') || {}).message), 'a copa precisa de 4 ou 8 pessoas');
  for (const j of J.slice(1)) j.manda({type:'join', code:cod, spectate:true});
  J[1].manda({type:'cupCreate', name:'Copa'});
  confira(!J[1].sala().tournament, 'só o dono sorteia');
  J[0].manda({type:'cupCreate', name:'Copa da Laje'});
  let s2 = J[0].sala();
  confira(s2.tournament && s2.tournament.matches.length === 2 && s2.n === 1 && !s2.bots && s2.roster[0] && s2.roster[1], 'sorteio: 2 duelos, 1v1 sem bots, o primeiro duelo nos times', s2.tournament);
  const pega = id => J.find(j => j.id === id);
  let rodada = 0;
  const duelo = () => {
    const r = J[0].sala(); rodada = r.round + 1;
    J[0].manda({type:'start'}); quadro(J[0], rodada, [0, 0]); relogio += 40000; quadro(J[0], rodada, [3, 1], {elapsed:35});
    J[0].manda({type:'finish', round:rodada, score:[3, 1]});
    return r.roster[0];
  };
  const v1 = duelo();
  s2 = J[0].sala();
  confira(s2.state === 'ended' && s2.tournament.matches[0].winner === v1, 'o primeiro duelo tem vencedor', s2.tournament.matches[0]);
  J[0].manda({type:'cupNext'}); const v2 = duelo();
  J[0].manda({type:'cupNext'});
  s2 = J[0].sala();
  confira(s2.tournament.rounds.length === 1 && s2.tournament.matches.length === 1 && [s2.roster[0], s2.roster[1]].sort().join() === [v1, v2].sort().join(), 'a final: os dois vencedores', s2.tournament);
  const campeao = duelo(); J[0].manda({type:'cupNext'});
  s2 = J[0].sala();
  confira(s2.tournament.champion === campeao && t2.b.d.campeoes.length === 1 && t2.b.d.campeoes[0].champion.name === pega(campeao).nome, 'campeão e a galeria de campeões', [s2.tournament.champion, t2.b.d.campeoes]);
  J[0].manda({type:'cupEnd'});
  s2 = J[0].sala();
  confira(!s2.tournament && s2.n === 2 && s2.bots, 'encerrar a copa volta às regras da sala');
  J[1].manda({type:'social'});
  confira(J[1].ult('social') && J[1].ult('social').champions.length === 1, 'social: a galeria de campeões');

  console.log('\n5) OS CLUBES (as mesmas regras da plataforma)');
  const t3 = novaTurma();
  const [K1, K2, K3] = ['Ana', 'Beto', 'Caio'].map(n => entra(t3, n));
  let rid = 0;
  const clube = (k, op, args) => { k.manda({type:'club_req', rid:++rid, op, args}); const r = k.todas('club_res').find(x => x.rid === rid); return r; };
  let r = clube(K1, 'criar', {nome:'Cr', descricao:'', pais:'BR', tipo:'publico', trofeuMinimo:0});
  confira(r && !r.ok && /3 letras/.test(r.erro), 'nome curto não vale', r);
  r = clube(K1, 'criar', {nome:'Craques da Laje', descricao:'Só fera', pais:'BR', tipo:'publico', trofeuMinimo:0});
  confira(r.ok && r.data.id, 'criar o clube (grátis)', r);
  const idK = r.data.id;
  r = clube(K2, 'criar', {nome:'craques  da laje!', pais:'PT', tipo:'publico', trofeuMinimo:0});
  confira(!r.ok && /Já existe/.test(r.erro), 'nome repetido (sem acento e maiúscula) não vale', r);
  r = clube(K2, 'listar', {busca:'laje'});
  confira(r.ok && r.data.length === 1 && r.data[0].membros === 1 && r.data[0].donoNome === 'Ana', 'buscar pelo nome', r.data);
  confira(clube(K2, 'listar', {busca:'br'}).data.length === 1 && clube(K2, 'listar', {busca:'pt'}).data.length === 0, 'buscar pela sigla do país');
  r = clube(K2, 'entrar', {id:idK});
  confira(r.ok, 'entrar num clube público', r);
  r = clube(K1, 'ver', {id:idK});
  confira(r.ok && r.data.lista.length === 2 && r.data.souDono && r.data.lista[0].papel === 'dono' && r.data.lista[0].nome === 'Ana', 'a página do clube: dois membros, a dona primeiro', r.data);
  r = clube(K2, 'editar', {id:idK, f:{descricao:'Hackeado'}});
  confira(!r.ok && /dono/.test(r.erro), 'só o dono edita', r);
  r = clube(K1, 'editar', {id:idK, f:{tipo:'convite', trofeuMinimo:5, pais:'PT', descricao:'Nova'}});
  confira(r.ok && clube(K1, 'meu').data.tipo === 'convite', 'o dono edita (tipo, pontos mínimos, país, descrição)', r);
  r = clube(K3, 'entrar', {id:idK});
  confira(!r.ok && /só com convite/.test(r.erro), 'clube só convite: não entra sem convite', r);
  r = clube(K1, 'convidar', {termo:K3.ult('hello').pub});
  confira(r.ok && r.data.nome === 'Caio', 'convidar pelo ID da turma', r);
  r = clube(K3, 'convites');
  confira(r.ok && r.data.length === 1 && r.data[0].clube.nome === 'Craques da Laje' && r.data[0].de.nome === 'Ana', 'o convite aparece para o Caio', r.data);
  r = clube(K3, 'responder', {id:r.data[0].id, aceitar:true});
  confira(r.ok && clube(K3, 'meu').data.id === idK, 'aceitou: entrou (o convite passa por cima dos pontos mínimos)', r);
  r = clube(K1, 'expulsar', {id:K3.id});
  confira(r.ok && !clube(K3, 'meu').data, 'o dono tira um membro');
  clube(K1, 'editar', {id:idK, f:{tipo:'publico'}});
  r = clube(K3, 'entrar', {id:idK});
  confira(!r.ok && /Precisa de 5 troféus \(você tem 0\)/.test(r.erro), 'pontos mínimos: precisa de 5 (tem 0)', r);
  t3.b.d.gente[K3.id].st.vit = 7;
  r = clube(K3, 'entrar', {id:idK});
  confira(r.ok, 'com 7 troféus (vitórias conferidas) entra', r);
  confira(clube(K1, 'listar', {}).data[0].trofeus === 7, 'os troféus do clube são a soma dos membros');
  r = clube(K1, 'passarDono', {id:K2.id});
  confira(r.ok && clube(K2, 'ver', {id:idK}).data.souDono, 'passar o clube para outro membro');
  r = clube(K2, 'sair');
  confira(r.ok && !r.data.fechou && clube(K1, 'ver', {id:idK}).data.lista.find(m => m.papel === 'dono').nome === 'Caio', 'o dono saiu: quem tem mais troféus vira o dono', clube(K1, 'ver', {id:idK}).data.lista);
  clube(K1, 'sair'); r = clube(K3, 'sair');
  confira(r.ok && r.data.fechou && clube(K1, 'listar', {}).data.length === 0, 'o último que sai fecha o clube');
  K1.manda({type:'create', n:1, map:0, jogo:'futebol', tempo:0, bots:true, pub:false});
  clube(K1, 'criar', {nome:'Os Brabos', pais:'BR', tipo:'publico', trofeuMinimo:0});
  const card = K1.sala().members[0].club;
  confira(card && card.name === 'Os Brabos' && /^E\./.test(card.escudo), 'o escudo do clube aparece no cartão da sala na hora', card);

  console.log('\n6) O CHAT DO BRASIL');
  const t4 = novaTurma();
  const ch = ['Ana', 'Beto', 'Caio', 'Duda'].map((n, i) => { const k = cliente(t4, n, '10.1.0.' + i); k.manda({type:'brasil_join', name:n, skin:'T.ABCD1234'}); return k; });
  confira(ch[0].ult('brasil_hello') && ch[0].ult('brasil_history'), 'entrar: hello e o histórico');
  ch[0].manda({type:'brasil_say', text:'  boa   tarde galera  '});
  const msg = ch[1].ult('brasil_message');
  confira(msg && msg.message.texto === 'boa tarde galera' && msg.message.nome === 'Ana', 'a mensagem chega para todos (limpa)', msg);
  ch[0].manda({type:'brasil_say', text:'outra'});
  confira((ch[0].ult('brasil_error') || {}).reason === 'ritmo', '1 mensagem a cada 3 s');
  ch[1].c.ultBrasil = 0; ch[1].manda({type:'brasil_say', text:'segue lá www.site.com'});
  confira((ch[1].ult('brasil_error') || {}).reason === 'filtro', 'link é bloqueado pelo filtro');
  ch[2].manda({type:'brasil_say', text:'oi'}); ch[2].c.ultBrasil = 0; ch[2].manda({type:'brasil_say', text:'OI'});
  confira((ch[2].ult('brasil_error') || {}).reason === 'repetida', 'mensagem repetida não vai');
  ch[0].manda({type:'brasil_say', text:'x'.repeat(130)});
  confira((ch[0].ult('brasil_error') || {}).reason === 'longa', 'mais de 120 letras não vai');
  const mid = msg.message.id;
  for (const k of ch.slice(1)) k.manda({type:'brasil_report', id:mid});
  confira(ch[3].ult('brasil_hide') && ch[3].ult('brasil_hide').id === mid, '3 denúncias de pessoas diferentes escondem a mensagem');
  ch[0].c.ultBrasil = 0; ch[0].manda({type:'brasil_say', text:'voltei'});
  confira((ch[0].ult('brasil_error') || {}).reason === 'silenciado', 'quem foi denunciado fica um tempo sem falar');
  // v81: dados pessoais não passam (telefone, CPF, e-mail) nem os links a mais
  for (const [txt, oq] of [['me chama no 11 99999-8888', 'telefone'], ['meu cpf 123.456.789-00', 'CPF'], ['manda pra fulano@email.com', 'e-mail'], ['entra no bit.ly/abc', 'link curto'], ['zap wa.me/55', 'wa.me']]){
    ch[1].c.ultBrasil = 0; ch[1].manda({type:'brasil_say', text:txt});
    confira((ch[1].ult('brasil_error') || {}).reason === 'filtro', 'v81: ' + oq + ' é barrado pelo filtro', txt);
  }
  ch[1].c.ultBrasil = 0; ch[1].manda({type:'brasil_say', text:'placar 3 x 1, bora de novo às 20h'});
  confira(ch[2].ult('brasil_message').message.texto === 'placar 3 x 1, bora de novo às 20h', 'v81: números comuns (placar, hora) passam');

  console.log('\n6b) v81 · O CHAT DA SALA: o número da mensagem, a denúncia, a repetida e o filtro');
  const t6 = novaTurma();
  const S1 = entra(t6, 'Sol'), S2 = entra(t6, 'Rai'), S3 = entra(t6, 'Lua');
  S1.manda({type:'create', n:2, map:4, jogo:'futebol', tempo:0, bots:true, pub:true});
  const cod6 = S1.sala().code; S2.manda({type:'join', code:cod6, spectate:true}); S3.manda({type:'join', code:cod6, spectate:true});
  S1.limpa(); S2.limpa(); S3.limpa();
  S1.manda({type:'say', text:'bora!'});
  const m6 = S2.ult('say');
  confira(m6 && m6.text === 'bora!' && /^[A-Z0-9]{6}-\d+$/.test(m6.mid || ''), 'a mensagem da sala chega com o número dela (mid)', m6);
  S1.manda({type:'say', text:'BORA!'});
  confira((S1.ult('error') || {}).codigo === 'repetida', 'a mesma mensagem de novo (em 30 s) não vai', S1.ult('error'));
  S1.manda({type:'say', text:'meu zap 21 98888-7777'});
  confira((S1.ult('error') || {}).codigo === 'filtro', 'telefone no chat da sala é barrado', S1.ult('error'));
  S1.manda({type:'report', mid:m6.mid});
  confira(!S3.ult('say_hide'), 'o autor não denuncia a própria mensagem');
  S2.manda({type:'report', mid:m6.mid});
  confira(!S3.ult('say_hide'), 'uma denúncia só ainda não esconde (fica anotada)');
  S3.manda({type:'report', mid:m6.mid});
  confira(S3.ult('say_hide') && S3.ult('say_hide').mid === m6.mid && S1.ult('say_hide') && S1.ult('say_hide').mid === m6.mid, '2 denúncias de pessoas diferentes: a mensagem some para todos (say_hide)', [S3.ult('say_hide'), S1.ult('say_hide')]);
  confira(t6.salas.get(cod6).hist.find(x => x.mid === m6.mid).escondida === true, 'no histórico a mensagem fica marcada como escondida (quem entra depois já vê assim)');
  S1.manda({type:'say', text:'e aí'});
  confira((S1.ult('error') || {}).codigo === 'silenciado', 'quem foi denunciado fica 5 min sem falar na sala', S1.ult('error'));
  S2.manda({type:'say', text:'segue o jogo'});
  confira(S3.ult('say') && S3.ult('say').text === 'segue o jogo', 'os outros continuam falando');

  console.log('\n7) A CONTA DO RACHA: o bilhete e o selo do resultado');
  const SEG = 'segredo-de-teste-123';
  const t5 = novaTurma({segredo:SEG});
  const bil = assina(SEG, {p:'123', n:'Craque10', e:Date.now() + 60000});
  const X = cliente(t5, 'X'); X.manda({type:'hello', name:'Outro nome', conta:bil, skin:'T.XXXX1111'});
  confira(X.ult('hello').id === 'c123' && X.ult('hello').conta === true && X.ult('hello').pub === '000123', 'com o bilhete da plataforma: o id e o ID público da conta', X.ult('hello'));
  const Xf = cliente(t5, 'F'); Xf.manda({type:'hello', name:'F', conta:bil.slice(0, -3) + 'abc'});
  confira(Xf.ult('hello').conta === false && Xf.ult('hello').id[0] === 'u', 'bilhete adulterado não vale (entra como visitante)');
  const Xv = cliente(t5, 'V'); Xv.manda({type:'hello', name:'V', conta:assina(SEG, {p:'124', n:'V', e:Date.now() - 1})});
  confira(Xv.ult('hello').conta === false, 'bilhete vencido não vale');
  X.manda({type:'create', n:1, map:0, jogo:'futebol', tempo:0, bots:true, pub:true});
  X.manda({type:'start'}); quadro(X, 1, [0, 0]); relogio += 45000; quadro(X, 1, [3, 2], {elapsed:40});
  X.manda({type:'finish', round:1, score:[3, 2]});
  const rx = X.ult('result'), selo = confere(SEG, rx.selo);
  confira(rx.valida && selo && selo.j === '000123' && selo.l === 0 && selo.p.join() === '3,2' && selo.m === 'futebol' && selo.s === X.sala().code && selo.r === 1, 'o resultado que vale vem com o selo da conta (a plataforma confere)', selo);
  const i5 = rx.selo.indexOf('.') + 5, troca5 = rx.selo.slice(0, i5) + (rx.selo[i5] === 'A' ? 'B' : 'A') + rx.selo.slice(i5 + 1);   // (v79: troca um caractere do meio da assinatura; o último pode ser só bits de enchimento)
  confira(confere(SEG + 'x', rx.selo) === null && confere(SEG, troca5) === null, 'o selo não confere com outro segredo nem adulterado');
  confira(selo.k === 0 && selo.n === 1, 'v82: o selo de uma sala personalizada diz que não é ranqueada (k:0) e o tamanho (n:1)', selo);
  // v82: o selo de uma RANQUEADA (as duas contas na fila do 1v1) leva k:1 e o tamanho; a plataforma só mexe na patente com ele
  const bil2 = assina(SEG, {p:'124', n:'Beto10', e:Date.now() + 60000});
  const Ra = cliente(t5, 'Ra'); Ra.manda({type:'hello', name:'Ra', conta:assina(SEG, {p:'125', n:'Ra', e:Date.now() + 60000})});
  const Rb = cliente(t5, 'Rb'); Rb.manda({type:'hello', name:'Rb', conta:bil2});
  Ra.manda({type:'fila', n:1, pts:900}); relogio += 1000; Rb.manda({type:'fila', n:1, pts:880});
  const sr = Ra.sala();
  confira(sr && sr.ranked && sr.state === 'playing', 'v82: as duas contas caem na sala ranqueada', sr);
  quadro(Ra, 1, [0, 0]); relogio += 20000; quadro(Ra, 1, [1, 0], {elapsed:20}); relogio += 20000; quadro(Ra, 1, [2, 0], {elapsed:40}); relogio += 20000; quadro(Ra, 1, [3, 0], {elapsed:60});
  Ra.manda({type:'finish', round:1, score:[3, 0]});
  const sra = confere(SEG, (Ra.ult('result') || {}).selo), srb = confere(SEG, (Rb.ult('result') || {}).selo);
  confira(sra && srb && sra.k === 1 && srb.k === 1 && sra.n === 1 && sra.j === '000125' && srb.j === '000124' && sra.p.join() === '3,0' && srb.p.join() === '0,3',
    'v82: o selo da ranqueada leva k:1 e n:1 (cada um com o placar do lado dele)', [sra, srb]);
  // v82: quem joga sem conta ganha um ID de 7 dígitos (9.000.001…), longe dos IDs das contas
  const Vz = cliente(t5, 'Vz'); Vz.manda({type:'hello', name:'Vz'});
  confira(/^9\d{6}$/.test(Vz.ult('hello').pub) && Vz.ult('hello').conta === false, 'v82: visitante tem ID de 7 dígitos (não bate com o de uma conta)', Vz.ult('hello').pub);

  console.log('\n8) A ORIGEM');
  confira(origemPermitida(undefined, 'h:1', []), 'sem Origin (programa): pode');
  confira(origemPermitida('http://meu.site:8080', 'meu.site:8080', []), 'o mesmo endereço do servidor: pode');
  confira(origemPermitida('http://localhost:5173', 'meu.site', []), 'localhost: pode');
  confira(!origemPermitida('https://outro.site', 'meu.site', []), 'outra página: não pode');
  confira(origemPermitida('https://outro.site', 'meu.site', ['https://outro.site']), 'outra página na lista: pode');
  confira(!origemPermitida('null', 'meu.site', []) && origemPermitida('null', 'meu.site', ['null']), 'arquivo aberto direto (null): só se estiver na lista');
  for (const x of [t, t2, t3, t4, t5]) x.fecha();
}

/* ---------------------------------------------------------------- 2) pela rede de verdade (o servidor numa porta) */
function ranqueada(){
  console.log('\n10) v79 · A RANQUEADA ONLINE: a fila, a sala ranqueada e o selo da conta');
  const t = novaTurma({segredo:'segredo-de-teste-79'});
  const A = entra(t, 'Ana'), B = entra(t, 'Beto');
  A.limpa(); B.limpa();
  A.manda({type:'fila', n:1, pts:520});
  const fa = A.ult('fila');
  confira(fa && fa.on && fa.n === 1 && fa.espera === 20000, 'fila: o servidor confirma a procura (1v1, até 20 s)', fa);
  confira(!A.ult('start'), 'sozinho na fila: ainda nada');
  relogio += 3000; B.manda({type:'fila', n:1, pts:500});
  let s = A.sala(), sb = B.sala();
  confira(s && sb && s.code === sb.code && s.ranked && s.map === 4 && s.jogo === 'futebol' && s.n === 1 && s.bots && !s.pub && s.tempo === 3 && s.regra === 'v80',
    'dois no 1v1: a sala ranqueada no Estádio, futebol (v80: 3:00 no relógio do servidor, até 3 gols), fechada (fora da lista)', s);
  confira(s.roster.includes(A.id) && s.roster.includes(B.id) && s.host === A.id && s.state === 'playing' && s.round === 1, 'um em cada time; quem esperava há mais tempo roda a partida; já começou', s);
  confira(!!A.ult('start') && !!B.ult('start') && A.ult('start').room.ranked, 'os dois recebem o start (a partida começa sem ninguém apertar nada)');
  confira(!t.listaMsg().list.some(x => x.code === s.code), 'a sala ranqueada não aparece na lista de salas');
  confira(t.filaEsp.size === 0, 'quem foi para a sala sai da fila');
  // ninguém mexe nos times nem nas regras; sem revanche; quem é de fora não entra pelo código
  B.limpa(); B.manda({type:'seat', team:0}); confira(/sorteio/.test((B.ult('error') || {}).message || ''), 'na ranqueada os times são do sorteio (seat recusado)', B.ult('error'));
  A.manda({type:'config', n:3}); confira(A.sala().n === 1, 'config não muda a ranqueada');
  const Z = entra(t, 'Zeca'); Z.manda({type:'join', code:s.code}); confira(/ranqueada/.test((Z.ult('error') || {}).message || ''), 'quem é de fora não entra pelo código', Z.ult('error'));
  // o resultado conferido sai marcado como ranqueado
  quadro(A, 1, [0, 0]);                                 // (v80: cada gol no relógio de verdade; o anfitrião manda o relógio do servidor)
  relogio += 20000; quadro(A, 1, [1, 0], {elapsed:20}); relogio += 20000; quadro(A, 1, [2, 1], {elapsed:40}); relogio += 20000; quadro(A, 1, [3, 1], {elapsed:60});
  A.manda({type:'finish', round:1, score:[3, 1]});
  const ra = A.ult('result'), rb = B.ult('result');
  confira(ra && rb && ra.valida && ra.ranked && rb.ranked && ra.winner === 0, 'o fim conferido sai com ranked:true para os dois', [ra, rb]);
  B.limpa(); B.manda({type:'rematch', on:true}); confira(/revanche/.test((B.ult('error') || {}).message || ''), 'na ranqueada não tem revanche (procura de novo)', B.ult('error'));
  A.manda({type:'leave'}); B.manda({type:'leave'});
  confira(!t.salas.has(s.code), 'todo mundo saiu: a sala ranqueada fecha');

  // 2v2 com só duas pessoas: na hora, nada; depois de 8 s, as duas jogam juntas e os bots completam
  const C = entra(t, 'Caio'), D = entra(t, 'Duda');
  C.limpa(); D.limpa();
  C.manda({type:'fila', n:2, pts:100}); relogio += 1000; D.manda({type:'fila', n:2, pts:3000});
  confira(!C.ult('start') && !D.ult('start'), '2v2 com duas pessoas: antes de 8 s, ninguém começa (ainda pode chegar gente)');
  relogio += 8000; t.filaTenta();
  s = C.sala();
  confira(s && s.ranked && s.n === 2 && s.roster.filter(Boolean).length === 2 && s.bots && C.ult('start') && D.ult('start'), 'depois de 8 s: as duas pessoas na mesma sala e os bots nas outras vagas', s && s.roster);
  confira(Math.floor(s.roster.indexOf(C.id)/2) !== Math.floor(s.roster.indexOf(D.id)/2), 'os times pelos pontos: o mais forte de um lado, o outro do outro', s.roster);
  C.manda({type:'leave'}); D.manda({type:'leave'});

  // sozinho: 20 s e vem fila_nada (o jogo joga contra os bots)
  const E = entra(t, 'Edu'); E.limpa();
  E.manda({type:'fila', n:3, pts:0});
  relogio += 12000; t.filaTenta(); confira(!E.ult('fila_nada'), 'sozinho: aos 12 s ainda procurando');
  relogio += 9000; t.filaTenta();
  confira(!!E.ult('fila_nada') && t.filaEsp.size === 0, 'sozinho: aos 20 s vem fila_nada e ele sai da fila', E.ult('fila_nada'));
  // sair da fila; cair procurando; procurar estando numa sala
  E.manda({type:'fila', n:1, pts:0}); E.manda({type:'fila_sai'});
  confira(t.filaEsp.size === 0 && E.ult('fila').on === false, 'fila_sai: desistiu, saiu da fila');
  E.manda({type:'fila', n:1, pts:0}); E.ws.close();
  confira(t.filaEsp.size === 0, 'caiu procurando: sai da fila');
  const F = entra(t, 'Fê'); F.manda({type:'create', n:1, map:4, jogo:'futebol', tempo:0, bots:true, pub:true}); F.limpa();
  F.manda({type:'fila', n:1, pts:0});
  confira(t.filaEsp.size === 0 && (F.ult('error') || {}).codigo === 'fila_sala', 'estando numa sala, a fila é recusada (saia da sala antes)', F.ult('error'));

  // o selo da conta: só o assinado pela plataforma vale
  const bil = assina('segredo-de-teste-79', {p:'42', n:'Cria7', s:['parceiro', 'verificado'], e:Date.now() + 60000});
  const V = cliente(t, 'Cria7'); V.manda({type:'hello', name:'Cria7', conta:bil, skin:'', flag:'BR'});
  confira(V.ult('hello') && V.ult('hello').conta && V.ult('hello').selo === 'verificado', 'o bilhete da conta vale (hello com conta e com o seu selo: o V do lobby)', V.ult('hello'));
  V.manda({type:'create', n:1, map:4, jogo:'futebol', tempo:0, bots:true, pub:true, name:'Sala do Cria'});
  const sv = V.sala(), mv = sv && sv.members.find(m => m.id === V.ult('hello').id);
  confira(mv && mv.selo === 'verificado', 'no cartão da sala vai o selo da conta (verificado vem antes de parceiro)', mv);
  confira(t.listaMsg().list.some(x => x.code === sv.code && x.selo === 'verificado'), 'na lista de salas, o selo do dono', t.listaMsg().list);
  const falso = assina('outro-segredo', {p:'43', n:'Fake', s:['equipe'], e:Date.now() + 60000});
  const W = cliente(t, 'Fake'); W.manda({type:'hello', name:'Fake', conta:falso, selo:'equipe'});
  W.manda({type:'create', n:1, map:4, jogo:'futebol', tempo:0, bots:true, pub:true});
  const mw = W.sala() && W.sala().members[0];
  confira(mw && mw.selo === '' && W.ult('hello') && W.ult('hello').selo === '', 'bilhete com outra assinatura (ou o selo mandado pelo jogo) não vale: sem selo (nem no hello)', [mw, W.ult('hello')]);
  V.manda({type:'brasil_join', conta:bil, name:'Cria7'}); V.limpa();
  V.manda({type:'brasil_say', text:'bora uma ranqueada'});
  const bm = V.ult('brasil_message');
  confira(bm && bm.message.selo === 'verificado' && bm.message.nome === 'Cria7', 'no Chat do Brasil a mensagem leva o selo', bm);
}

/* ---------------------------------------------------------------- v80: a partida normal (o relógio do servidor) */
function regra80(){
  console.log('\n11) v80 · A PARTIDA NORMAL: 3:00 no relógio do servidor, prorrogação só no 0 × 0, até 3 gols, empate e o fim conferido pela linha do tempo');
  const t = novaTurma({segredo:'segredo-de-teste-80'});
  let nPar = 0;
  const par = () => {                                    // dois na fila do 1v1: a sala ranqueada (Ana roda a partida)
    nPar++;
    const A = entra(t, 'Ana' + nPar), B = entra(t, 'Beto' + nPar);
    A.manda({type:'fila', n:1, pts:500}); B.manda({type:'fila', n:1, pts:500});
    const s = A.sala(); A.limpa(); B.limpa();
    return {A, B, s};
  };
  const anda = seg => { relogio += Math.round(seg*1000); };
  const fim = (k, score) => { k.A.manda({type:'finish', round:1, score}); return {a:k.A.ult('result'), b:k.B.ult('result')}; };
  const sai = k => { k.A.manda({type:'leave'}); k.B.manda({type:'leave'}); };

  // o relógio: no start, a cada segundo, na pausa
  let k = par();
  confira(k.s && k.s.regra === 'v80' && k.s.tempo === 3 && k.s.relogio && k.s.relogio.ms === 0 && k.s.relogio.seg === 180 && k.s.relogio.prorrog === 120,
    'a sala da partida normal: regra v80, 3 minutos, o relógio do servidor já no start (0 ms, 180 s + 120 s de prorrogação)', k.s);
  anda(5); t.relogios();
  let ra = k.A.ult('relogio'), rb = k.B.ult('relogio');
  confira(ra && rb && ra.round === 1 && ra.ms === 5000 && rb.ms === 5000 && !ra.pausado, 'a cada segundo, o relógio do servidor chega para os dois (5 s de jogo)', [ra, rb]);
  k.A.manda({type:'pause', paused:true}); anda(10); t.relogios();
  rb = k.B.ult('relogio');
  confira(rb && rb.pausado && rb.ms === 5000, 'pausado (o anfitrião saiu da tela): o relógio para no servidor também', rb);
  k.A.manda({type:'pause', paused:false}); anda(2); t.relogios();
  rb = k.B.ult('relogio');
  confira(rb && !rb.pausado && rb.ms === 7000, 'voltou: o relógio segue de onde parou (as pausas não contam)', rb);
  // 1 × 1 no fim dos 3:00: empate (sem prorrogação)
  anda(23); quadro(k.A, 1, [1, 0], {elapsed:30}); anda(30); quadro(k.A, 1, [1, 1], {elapsed:60});
  anda(60); let f = fim(k, [1, 1]);
  confira(f.a && f.a.valida === false && /antes do tempo/.test(f.a.motivo || ''), '1 × 1 aos 2:00: não pode acabar ainda (acabou antes do tempo)', f.a);
  sai(k);

  k = par(); anda(30); quadro(k.A, 1, [1, 0], {elapsed:30}); anda(30); quadro(k.A, 1, [1, 1], {elapsed:60}); anda(121);
  f = fim(k, [1, 1]);
  confira(f.a && f.b && f.a.valida && f.a.winner === -1 && f.b.winner === -1 && f.a.ranked, '1 × 1 no fim dos 3:00: EMPATE que vale (sem prorrogação)', f.a);
  const g1 = t.b.d.gente[k.A.id].st;
  confira(g1 && g1.emp === 1 && g1.vit === 0 && g1.der === 0, 'o empate fica guardado como empate', g1);
  sai(k);

  // gol depois do tempo (de 1 × 1 para 2 × 1 aos 3:05) não vale
  k = par(); anda(30); quadro(k.A, 1, [1, 0], {elapsed:30}); anda(30); quadro(k.A, 1, [1, 1], {elapsed:60}); anda(125); quadro(k.A, 1, [2, 1], {elapsed:185});
  f = fim(k, [2, 1]);
  confira(f.a && !f.a.valida && /depois do tempo/.test(f.a.motivo || ''), 'gol aos 3:05 com 1 × 1: não vale (gol depois do tempo)', f.a);
  sai(k);

  // 2 × 1 no fim: vence quem tem mais gols
  k = par(); anda(40); quadro(k.A, 1, [1, 0], {elapsed:40}); anda(40); quadro(k.A, 1, [1, 1], {elapsed:80}); anda(40); quadro(k.A, 1, [2, 1], {elapsed:120}); anda(61);
  f = fim(k, [2, 1]);
  confira(f.a && f.a.valida && f.a.winner === 0, '2 × 1 no fim dos 3:00: vence quem tem mais gols', f.a);
  sai(k);

  // 0 × 0: prorrogação; o gol de ouro vence na hora; 0 × 0 até −2:00 é empate; antes disso, não acaba
  k = par(); anda(200); quadro(k.A, 1, [0, 1], {elapsed:200}); anda(2);
  f = fim(k, [0, 1]);
  confira(f.a && f.a.valida && f.a.winner === 1, '0 × 0 nos 3:00 → prorrogação: o gol aos −0:20 é GOL DE OURO e vence na hora', f.a);
  sai(k);
  k = par(); quadro(k.A, 1, [0, 0], {elapsed:0}); anda(200); f = fim(k, [0, 0]);
  confira(f.a && !f.a.valida && /antes do tempo/.test(f.a.motivo || ''), '0 × 0 aos −0:20: a prorrogação ainda não acabou', f.a);
  sai(k);
  k = par(); quadro(k.A, 1, [0, 0], {elapsed:0}); anda(301); f = fim(k, [0, 0]);
  confira(f.a && f.a.valida && f.a.winner === -1, '0 × 0 até −2:00: EMPATE que vale', f.a);
  sai(k);
  k = par(); anda(200); quadro(k.A, 1, [1, 0], {elapsed:200}); anda(10); quadro(k.A, 1, [1, 1], {elapsed:210}); anda(2);
  f = fim(k, [1, 1]);
  confira(f.a && !f.a.valida && /depois do fim/.test(f.a.motivo || ''), 'depois do gol de ouro a partida acabou: outro gol não vale', f.a);
  sai(k);
  k = par(); anda(305); quadro(k.A, 1, [1, 0], {elapsed:305}); anda(1); f = fim(k, [1, 0]);
  confira(f.a && !f.a.valida && /prorrogação/.test(f.a.motivo || ''), 'gol depois de −2:00 não vale', f.a);
  sai(k);

  // 3 gols acabam na hora; gol depois disso não vale
  k = par(); anda(20); quadro(k.A, 1, [1, 0], {elapsed:20}); anda(20); quadro(k.A, 1, [2, 0], {elapsed:40}); anda(20); quadro(k.A, 1, [3, 0], {elapsed:60}); anda(2);
  f = fim(k, [3, 0]);
  confira(f.a && f.a.valida && f.a.winner === 0, '3 × 0 aos 1:00: o 3º gol acaba a partida na hora (vale)', f.a);
  sai(k);
  k = par(); anda(20); quadro(k.A, 1, [3, 0], {elapsed:20}); anda(5); quadro(k.A, 1, [3, 1], {elapsed:25}); anda(1);
  f = fim(k, [3, 1]);
  confira(f.a && !f.a.valida && /depois do fim/.test(f.a.motivo || ''), 'gol depois do 3º gol: não vale (a partida já tinha acabado)', f.a);
  sai(k);

  // o relógio do anfitrião longe do servidor; o placar que volta
  k = par(); anda(40); quadro(k.A, 1, [1, 0], {elapsed:20}); anda(141); f = fim(k, [1, 0]);
  confira(f.a && !f.a.valida && /relógio/.test(f.a.motivo || ''), 'o anfitrião diz que o gol foi aos 0:20, mas o servidor recebeu aos 0:40: não vale (relógio diferente)', f.a);
  sai(k);
  k = par(); anda(30); quadro(k.A, 1, [1, 0], {elapsed:30}); anda(5); quadro(k.A, 1, [2, 0], {elapsed:35, goal:{time:0, el:33.2}}); anda(150);
  confira(t.salas.get(k.s.code).linha[1].el === 33.2, 'o gol leva a hora certa dele (goal.el), não a do quadro');
  f = fim(k, [2, 0]);
  confira(f.a && f.a.valida && f.a.winner === 0, '2 × 0 conferido pela linha do tempo', f.a);
  sai(k);

  // o servidor encerra sozinho a partida que passou do fim (o anfitrião não mandou o resultado)
  k = par(); anda(30); quadro(k.A, 1, [0, 1], {elapsed:30}); anda(30); quadro(k.A, 1, [1, 1], {elapsed:60}); anda(30); quadro(k.A, 1, [1, 2], {elapsed:90});
  anda(95); t.relogios();
  confira(!k.A.ult('result'), 'aos 3:05 o servidor ainda espera o resultado do anfitrião');
  anda(6); t.relogios();
  ra = k.A.ult('result'); rb = k.B.ult('result');
  confira(ra && rb && ra.servidor && ra.valida && ra.winner === 1 && ra.score.join() === '1,2', 'aos 3:11 sem o fim: o servidor encerra pelo relógio dele (1 × 2, vale, servidor:true)', ra);
  confira(t.salas.get(k.s.code).state === 'ended', 'a sala sai do jogo (state ended)');
  sai(k);
  k = par(); quadro(k.A, 1, [0, 0], {elapsed:0}); anda(305); t.relogios();
  confira(!k.A.ult('result'), '0 × 0 aos −2:05: ainda dentro da folga');
  anda(6); t.relogios(); ra = k.A.ult('result');
  confira(ra && ra.servidor && ra.valida && ra.winner === -1, '0 × 0 sem fim do anfitrião: o servidor encerra em empate depois da prorrogação', ra);
  sai(k);

  // o tempo da partida normal é do servidor: encurtado (--tempo-normal / --prorrogacao, para testes e demonstrações) vale para todos
  const t2 = novaTurma({regra80:{seg:20, prorrog:10}});
  const A2 = entra(t2, 'Ana'), B2 = entra(t2, 'Beto');
  A2.manda({type:'fila', n:1, pts:500}); B2.manda({type:'fila', n:1, pts:500});
  const s2 = A2.sala();
  confira(s2 && s2.regra === 'v80' && s2.relogio.seg === 20 && s2.relogio.prorrog === 10, 'o servidor diz quanto dura (20 s + 10 s neste teste): o jogo usa o que vem na sala', s2 && s2.relogio);
  quadro(A2, 1, [0, 0]); anda(5); quadro(A2, 1, [1, 0], {elapsed:5}); anda(5); quadro(A2, 1, [1, 1], {elapsed:10}); anda(11);
  A2.manda({type:'finish', round:1, score:[1, 1]});
  confira(A2.ult('result') && A2.ult('result').valida && A2.ult('result').winner === -1, 'com o tempo encurtado: 1 × 1 no fim dos 20 s é empate que vale', A2.ult('result'));

  // a sala personalizada continua como era (sem a regra v80 nem o relógio do servidor)
  const C = entra(t, 'Caio'); C.manda({type:'create', n:1, map:4, jogo:'futebol', tempo:3, bots:true, pub:true}); C.manda({type:'start'});
  const sc = C.ult('start') && C.ult('start').room;
  C.limpa(); anda(5); t.relogios();
  confira(sc && sc.regra === '' && sc.relogio === null && !C.ult('relogio'), 'a sala personalizada (3 minutos) fica com as regras dela: sem a regra v80 e sem o relógio do servidor', sc && [sc.regra, sc.relogio]);
}

function sobe(args){
  return new Promise((ok, falha) => {
    const p = fork(path.join(RAIZ, 'tests', 'servidor_visitantes.cjs'), ['--porta', '0', '--host', '127.0.0.1', '--memoria', '--sem-p2p'].concat(args || []), {silent:true});
    let log = ''; p.stdout.on('data', d => { log += d; }); p.stderr.on('data', d => { log += d; });
    p.on('message', m => { if (m && m.pronto) ok({p, porta:m.porta, log:() => log}); });
    setTimeout(() => falha(new Error('o servidor não subiu: ' + log)), 5000);
  });
}
function pega(url){ return new Promise(ok => http.get(url, r => { let b = ''; r.on('data', d => { b += d; }); r.on('end', () => ok({status:r.statusCode, headers:r.headers, body:b})); }).on('error', e => ok({status:0, erro:e.message}))); }
function socket(porta, origem){
  return new Promise((ok, falha) => {
    const ws = new WebSocket('ws://127.0.0.1:' + porta + '/', origem ? {headers:{Origin:origem}} : undefined);
    const k = {ws, caixa:[], manda:m => ws.send(JSON.stringify(m)), ult:tipo => { for (let i = k.caixa.length - 1; i >= 0; i--) if (k.caixa[i].type === tipo) return k.caixa[i]; return null; },
      espera:async (tipo, cond, ms) => { const t0 = Date.now(); for (;;){ const m = k.caixa.find(x => x.type === tipo && (!cond || cond(x))); if (m) return m; if (Date.now() - t0 > (ms || 3000)) return null; await espera(25); } }};
    ws.onmessage = e => k.caixa.push(JSON.parse(e.data));
    ws.onopen = () => ok(k);
    ws.onerror = () => falha(new Error('não conectou'));
  });
}
async function rede(){
  console.log('\n9) PELA REDE: HTTP, origem e duas sessões independentes');
  const S = await sobe();
  try {
    const base = 'http://127.0.0.1:' + S.porta;
    const raiz = await pega(base + '/');
    confira(raiz.status === 302 && raiz.headers.location === '/game/racha.html', 'a raiz leva ao jogo', raiz.status);
    const jogo = await pega(base + '/game/racha.html');
    confira(jogo.status === 200 && /RACHA/.test(jogo.body) && /config\.js/.test(jogo.body), 'o jogo é entregue pelo mesmo endereço (com o config.js)');
    const cfg = await pega(base + '/game/config.js');
    confira(cfg.status === 200 && /modo: 'producao'/.test(cfg.body), 'o config.js da publicação diz PRODUÇÃO', cfg.body.slice(0, 80));
    const saude = JSON.parse((await pega(base + '/saude')).body);
    confira(saude.ok === true && saude.salas === 0, '/saude responde', saude);
    const fora = await pega(base + '/%2e%2e/%2e%2e/server/turma.js');
    confira(fora.status === 403 || fora.status === 404, 'nada fora da pasta pública', fora.status);
    let recusou = false; try { await socket(S.porta, 'https://site-estranho.example'); } catch (_) { recusou = true; }
    confira(recusou && /recusada/.test(S.log()), 'conexão de uma página de fora (Origin estranho) é recusada');
    const A = await socket(S.porta, 'http://127.0.0.1:' + S.porta), B = await socket(S.porta, 'http://localhost:9999');
    A.manda({type:'hello', name:'Ana', skin:'T.AAAA1111', flag:'BR'}); B.manda({type:'hello', name:'Beto', skin:'T.BBBB2222', flag:'PT'});
    const hA = await A.espera('hello'), hB = await B.espera('hello');
    confira(hA && hB && hA.id !== hB.id, 'duas sessões: dois ids', [hA && hA.id, hB && hB.id]);
    A.manda({type:'create', n:1, map:4, jogo:'futebol', tempo:0, bots:false, pub:true, name:'Rede'});
    const sala = (await A.espera('room')).room;
    const lista = await B.espera('rooms', x => x.list.some(s => s.code === sala.code), 2500);
    confira(!!lista, 'a sala aberta aparece na lista da outra sessão', lista);
    B.manda({type:'join', code:sala.code, slot:1});
    await A.espera('room', x => x.room.roster[1] === hB.id);
    A.manda({type:'start'});
    const st = await B.espera('start');
    confira(st && st.room.round === 1, 'começou: start nas duas sessões');
    B.manda({type:'input', seq:1, x:1, y:0, acao:2, k:1});
    const ic = await A.espera('input');
    confira(ic && ic.id === hB.id && ic.acao === 2 && ic.k === 1, 'o comando (com a curva) chega ao anfitrião pela rede', ic);
    A.manda({type:'snapshot', round:1, data:{tick:3, elapsed:.1, state:'jogo', score:[0, 1], ball:[1, 2, 0, 0, 0], players:[]}});
    const sn = await B.espera('snapshot');
    confira(sn && sn.data.score.join() === '0,1', 'o quadro chega ao convidado pela rede');
    A.manda({type:'finish', round:1, score:[0, 1]});
    const fr = await B.espera('result');
    confira(fr && fr.valida === false && fr.motivo, 'o fim chega (e o servidor diz que não valeu: curto demais)', fr);
    // reconexão: o Beto cai e volta com o token (mesmo id)
    B.ws.close(); await espera(200);
    const B2 = await socket(S.porta, 'http://localhost:9999');
    B2.manda({type:'hello', name:'Beto', token:hB.token});
    const hB2 = await B2.espera('hello');
    confira(hB2 && hB2.id === hB.id, 'reconectou pela rede com o token: o mesmo id');
    B2.manda({type:'join', code:sala.code, slot:1});
    const vr = await B2.espera('room', x => x.room.members.some(m => m.id === hB.id));
    confira(!!vr, 'e voltou para a sala');
    A.ws.close(); B2.ws.close();
  } finally { S.p.kill('SIGTERM'); }
}

(async () => {
  try { login(); regras(); ranqueada(); regra80(); await rede(); }
  catch (e) { falhou++; console.log('  FALHOU (erro) ' + (e && e.stack || e)); }
  console.log('\nservidor da turma: ' + ok + ' ok, ' + falhou + ' falharam');
  process.exit(falhou ? 1 : 0);
})();
