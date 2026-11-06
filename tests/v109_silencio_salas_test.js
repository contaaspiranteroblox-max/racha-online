'use strict';
/* v109 · O SILÊNCIO DA EQUIPE no servidor das salas (server/silencio109.js), na memória, com contas de verdade (o bilhete
   assinado) — o caminho do servidor das salas SEPARADO da plataforma (o silêncio vem no bilhete: z e zm) e o aviso da
   plataforma montada (silenciaConta). Confere, em cada chat: o Chat do Brasil, a sala, a equipe, os amigos (mensagem direta),
   o clube, as falas e os emojis da partida — o calado não manda nada e recebe o aviso com quanto falta e o motivo; os outros
   continuam falando; o bilhete de ANTES do silêncio não tira o silêncio, um assinado depois tira; o silêncio que vence volta
   sozinho; a sessão da plataforma (montada) é a palavra final; e a expulsão da sala (sai, a vaga guardada some, não volta por
   10 min, a sala dos outros segue).
   Rodar: node tests/v109_silencio_salas_test.js */
const path = require('path');
const EventEmitter = require('events');
const RAIZ = path.resolve(__dirname, '..');
process.env.RACHA_CONTAGEM_MS = '0'; process.env.RACHA_REPLAY = '0';
const {Turma} = require(path.join(RAIZ, 'server', 'turma'));
const {assina} = require(path.join(RAIZ, 'server', 'banco'));
const S109 = require(path.join(RAIZ, 'server', 'silencio109'));

let ok = 0, falhou = 0;
function confira(cond, txt, extra){
  if (cond){ ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU ' + txt + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 400) : '')); }
}
class WsFalso extends EventEmitter {
  constructor(){ super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; this.vivo = true; }
  send(t){ if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
  close(){ if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate(){ this.close(); }
  ping(){}
}
const SEG = 'segredo-v109-silencio';
const P6 = n => String(n).padStart(6, '0');
let relogio = Date.now();
function bilhete(p, n, extra){ return assina(SEG, Object.assign({p:String(p), n, t:Date.now(), e:Date.now() + 30*60e3}, extra || {})); }
function conta(t, p, n, extra, req, bil){                 // (bil: o bilhete exato do hello — senão, um assinado agora)
  const ws = new WsFalso(), c = t.conecta(ws, Object.assign({headers:{}, socket:{remoteAddress:'10.0.9.' + p % 250}}, req || {}));
  const k = {ws, c, id:'c' + p, nome:n, manda:m => ws.emit('message', JSON.stringify(m)), limpa:() => { ws.caixa.length = 0; },
    acha:(tipo, f) => ws.caixa.find(x => x.type === tipo && (!f || f(x))),
    sala:() => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === 'room') return ws.caixa[i].room; return null; }};
  k.manda({type:'hello', name:n, skin:'T.AAAAxxxx', flag:'BR', conta:bil || bilhete(p, n, extra)});
  return k;
}

console.log('v109 · o silêncio da equipe no servidor das salas');
console.log('\n1) os textos');
confira(S109.duracao(4 * 60e3) === '4 min' && S109.duracao(59 * 60e3) === '59 min' && S109.duracao(3600e3) === '1 hora' && S109.duracao(5 * 3600e3) === '5 horas' && S109.duracao(5 * 864e5) === '5 dias' && S109.duracao(30 * 864e5) === '30 dias',
  'quanto falta: 4 min, 59 min, 1 hora, 5 horas, 5 dias, 30 dias', [S109.duracao(4 * 60e3), S109.duracao(3600e3), S109.duracao(5 * 864e5)]);
confira(S109.silencioDoBilhete({z:Date.now() + 5000, zm:'Xingou <b>'}).motivo === 'Xingou b' && S109.silencioDoBilhete({}) === null && S109.silencioDoBilhete({z:'lixo'}) === null,
  'o silêncio do bilhete: o motivo limpo (sem < >), sem z nada');

console.log('\n2) o bilhete com o silêncio (o servidor das salas separado da plataforma)');
const t = new Turma({log:() => {}, agora:() => relogio, p2p:false, segredo:SEG});
const ate = Date.now() + 10 * 60e3;
// a Ana e o Beto são amigos (o bilhete traz a lista); a Ana está calada pela equipe (z/zm); o Caio é do mesmo clube
const Ana = conta(t, 901, 'Ana', {a:[P6(902)], k:'k901', z:ate, zm:'Ofendeu no chat'});
const Beto = conta(t, 902, 'Beto', {a:[P6(901)], k:'k901'});
const Caio = conta(t, 903, 'Caio', {k:'k901'});
confira(!!Ana.acha('hello') && !!Beto.acha('hello') && !!Caio.acha('hello'), 'as três contas entram nas salas (o bilhete)');
const calado = x => x && /silenciado no chat pela equipe do RACHA por mais 10 min/.test(x.texto || x.message || '') && /Motivo: Ofendeu no chat/.test(x.texto || x.message || '');
// o Chat do Brasil
Ana.manda({type:'brasil_join', name:'Ana', conta:bilhete(901, 'Ana', {a:[P6(902)], k:'k901', z:ate, zm:'Ofendeu no chat'})}); Beto.manda({type:'brasil_join', name:'Beto', conta:bilhete(902, 'Beto', {a:[P6(901)], k:'k901'})});
Ana.limpa(); Beto.limpa();
Ana.manda({type:'brasil_say', text:'oi gente'});
confira(calado(Ana.acha('brasil_error', x => x.reason === 'silenciado')) && !Beto.acha('brasil_message'), 'o Chat do Brasil: a Ana calada não fala (o aviso com quanto falta e o motivo) e ninguém recebe nada', Ana.ws.caixa);
Beto.manda({type:'brasil_say', text:'cadê a Ana?'});
confira(!!Ana.acha('brasil_message', x => x.message.texto === 'cadê a Ana?'), 'o Beto fala normalmente (e a calada continua lendo)');
// os amigos (mensagem direta) e o clube
Ana.limpa(); Beto.limpa();
Ana.manda({type:'dm', para:P6(902), texto:'bora jogar'});
confira(calado(Ana.acha('dm_erro', x => x.reason === 'silenciado')) && !Beto.acha('dm'), 'o chat dos amigos: a mensagem direta da calada não sai (o aviso com o tempo e o motivo)', Ana.ws.caixa);
Ana.manda({type:'clube_say', texto:'salve clube'});
confira(calado(Ana.acha('clube_erro', x => x.reason === 'silenciado')) && !Caio.acha('clube_msg'), 'o chat do clube: também não', Ana.ws.caixa);
Beto.manda({type:'dm', para:P6(901), texto:'tá calada?'});
confira(!!Ana.acha('dm', x => x.texto === 'tá calada?'), 'e ela recebe as mensagens dos amigos normalmente');
// a sala, a equipe, as falas e os emojis da partida
Ana.manda({type:'create', n:2, map:4, jogo:'futebol', tempo:0, bots:true, pub:true, name:'Silêncio'});
const code = Ana.sala() && Ana.sala().code;
Beto.manda({type:'join', code, slot:2}); Caio.manda({type:'join', code, slot:1});
Ana.limpa(); Beto.limpa();
Ana.manda({type:'say', text:'foi mal'});
Ana.manda({type:'say', text:'time bora', canal:'equipe'});
const errosSala = Ana.ws.caixa.filter(x => x.type === 'error' && x.codigo === 'silenciado_staff');
confira(errosSala.length === 2 && errosSala.every(calado) && !Beto.acha('say', x => x.text === 'foi mal' || x.text === 'time bora'), 'a sala e o chat da equipe: nada sai (o erro silenciado_staff com o aviso)', Ana.ws.caixa);
Ana.manda({type:'start'});
const r = t.salas.get(code); if (r && r.partida) r.partida.desligar();
relogio += 10000;
Ana.limpa(); Beto.limpa();
Ana.manda({type:'fala', i:0});
Ana.manda({type:'emote', e:'rindo'});
confira(r && r.state === 'playing' && Ana.ws.caixa.filter(x => x.type === 'error' && x.codigo === 'silenciado_staff').length === 2 && !Beto.acha('fala') && !Beto.acha('emote'),
  'as falas e os emojis da partida também ficam calados', [r && r.state, Ana.ws.caixa.map(x => x.type + ':' + (x.codigo || ''))]);
Beto.limpa(); Ana.limpa();
Beto.manda({type:'emote', e:'rindo'});
confira(!!Ana.acha('emote', x => x.e === 'rindo'), 'o emoji do Beto chega (os outros jogam normal)');

console.log('\n3) o bilhete de antes e o de depois; o silêncio que vence');
// a Gabi entra calada (o bilhete com z); depois, outra aba dela com um bilhete SEM o silêncio assinado ANTES disso: continua calada
const ateG = Date.now() + 10 * 60e3;
const Gabi = conta(t, 907, 'Gabi', {z:ateG, zm:'Ofendeu no chat'});
const antes = assina(SEG, {p:'907', n:'Gabi', t:Date.now() - 60e3, e:Date.now() + 30*60e3});
const Gabi2 = conta(t, 907, 'Gabi', null, null, antes);
Gabi2.manda({type:'brasil_join', name:'Gabi', conta:antes}); Gabi2.limpa();
Gabi2.manda({type:'brasil_say', text:'escapei?'});
confira(!!Gabi.acha('hello') && calado(Gabi2.acha('brasil_error')), 'um bilhete assinado ANTES do silêncio (sem z) não tira o silêncio', Gabi2.ws.caixa);
// um bilhete assinado DEPOIS, sem z (a plataforma assina com o silêncio de agora: ele foi tirado), libera
const depois = assina(SEG, {p:'907', n:'Gabi', t:Date.now() + 1000, e:Date.now() + 30*60e3});
const Gabi3 = conta(t, 907, 'Gabi', null, null, depois);
Gabi3.manda({type:'brasil_join', name:'Gabi', conta:depois}); Gabi3.limpa();
Gabi3.manda({type:'brasil_say', text:'voltei'});
confira(!Gabi3.acha('brasil_error') && !!Gabi3.acha('brasil_message', x => x.message.texto === 'voltei'), 'um bilhete assinado DEPOIS, sem o silêncio, libera o chat', Gabi3.ws.caixa);
// o silêncio que vence volta sozinho
t.silenciaConta('903', Date.now() + 50, 'Teste curto');
Caio.limpa();
Caio.manda({type:'say', text:'falando'});
const caladoCaio = Caio.acha('error', x => x.codigo === 'silenciado_staff');
const ini = Date.now(); while (Date.now() - ini < 80) { /* (espera o silêncio de 50 ms vencer) */ }
Caio.limpa(); relogio += 2000;
Caio.manda({type:'say', text:'falando de novo'});
confira(caladoCaio && /Teste curto/.test(caladoCaio.message) && !Caio.acha('error', x => x.codigo === 'silenciado_staff') && !!Beto.acha('say', x => x.text === 'falando de novo'), 'o silêncio que venceu sai sozinho (a mensagem passa)', [caladoCaio, Caio.ws.caixa]);

console.log('\n4) a plataforma montada: o aviso ao vivo e a sessão como palavra final');
Beto.limpa();
const avisados = t.silenciaConta('902', Date.now() + 2 * 864e5, 'Spam de convite');
const av = Beto.acha('silenciado');
confira(avisados >= 1 && av && av.ate > Date.now() && /por mais 2 dias/.test(av.texto) && /Spam de convite/.test(av.texto), 'silenciaConta: a conexão da conta recebe o aviso na hora (até quando e o motivo)', [avisados, av]);
Beto.limpa();
t.silenciaConta('902', 0);
const lib = Beto.acha('silenciado');
Beto.manda({type:'say', text:'liberado'});
confira(lib && lib.ate === 0 && /liberado/.test(lib.texto) && !Beto.acha('error', x => x.codigo === 'silenciado_staff'), 'tirar o silêncio (ate 0): o aviso "chat liberado" e a mensagem passa', [lib, Beto.ws.caixa]);
// a sessão (montada na plataforma) traz o silêncio do banco; outra sessão sem silêncio libera
const Duda = conta(t, 904, 'Duda', null, {racha:{idPublico:904, nome:'Duda', selos:[], rel:null, silencio:{ate:Date.now() + 3600e3, motivo:'Racismo'}}});
Duda.manda({type:'brasil_join', name:'Duda'}); Duda.limpa();
Duda.manda({type:'brasil_say', text:'oi'});
const dudaCalada = Duda.acha('brasil_error');
const Duda2 = conta(t, 904, 'Duda', null, {racha:{idPublico:904, nome:'Duda', selos:[], rel:null, silencio:null}});
Duda2.manda({type:'brasil_join', name:'Duda'}); Duda2.limpa(); Duda2.manda({type:'brasil_say', text:'agora vai'});
confira(dudaCalada && /Racismo/.test(dudaCalada.texto) && !!Duda2.acha('brasil_message', x => x.message.texto === 'agora vai'), 'a sessão da plataforma traz o silêncio do banco na conexão (e a sessão sem silêncio libera: ela é a palavra final)', [dudaCalada, Duda2.ws.caixa.map(x => x.type)]);

console.log('\n5) a expulsão da sala');
const Eva = conta(t, 905, 'Eva'), Fabi = conta(t, 906, 'Fabi');
Eva.manda({type:'create', n:2, map:4, jogo:'futebol', tempo:0, bots:false, pub:true, name:'Sala da Eva'});
const code2 = Eva.sala() && Eva.sala().code;
Fabi.manda({type:'join', code:code2, slot:2});
Fabi.limpa(); Eva.limpa();
const saiu = t.expulsaConta('906', 'Atrapalhando');
const r2 = t.salas.get(code2);
confira(saiu === 1 && !!Fabi.acha('left') && /Atrapalhando/.test((Fabi.acha('error', x => x.codigo === 'expulso') || {}).message || '') && r2 && !r2.members.some(x => x.id === 'c906') && r2.members.some(x => x.id === 'c905'),
  'expulsaConta: a Fabi sai da sala (o aviso com o motivo) e a sala da Eva continua', [saiu, Fabi.ws.caixa.map(x => x.type)]);
Fabi.limpa(); Fabi.manda({type:'join', code:code2, slot:2});
confira(/removido desta sala/.test((Fabi.acha('error') || {}).message || '') && !r2.members.some(x => x.id === 'c906'), 'e não volta para a mesma sala (10 min)', Fabi.ws.caixa);
confira(t.expulsaConta('999999', 'x') === 0 && t.silenciaConta('lixo', Date.now() + 1000) === 0, 'conta que não está em sala nenhuma / ID inválido: nada acontece');

t.fecha();
console.log(`\nv109 · o silêncio da equipe nas salas: ${ok} ok, ${falhou} falharam`);
process.exit(falhou ? 1 : 0);
