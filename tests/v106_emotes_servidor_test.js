'use strict';
/* v106 · OS EMOJIS DA PARTIDA no servidor da turma (server/emotes106.js), na memória, com contas de verdade (o bilhete) e o
   relógio na mão: o emoji vai para todos da sala (o id de quem mandou e o emoji), só os 20 da lista, só de quem está jogando
   com a partida rolando, quem não está numa sala é ignorado, o ritmo (1 a cada 1 s e 3 a cada 5 s; o resto é ignorado), quem
   bloqueou não recebe (dos dois lados), o silenciado não manda e quem mandou não recebe de volta.
   Rodar: node tests/v106_emotes_servidor_test.js   (o tests/v106_emotes_test.py também roda este arquivo) */
const path = require('path');
const EventEmitter = require('events');
const RAIZ = path.resolve(__dirname, '..');
process.env.RACHA_CONTAGEM_MS = '0'; process.env.RACHA_REPLAY = '0';
const {Turma} = require(path.join(RAIZ, 'server', 'turma'));
const {assina} = require(path.join(RAIZ, 'server', 'banco'));
const E106 = require(path.join(RAIZ, 'server', 'emotes106'));

let ok = 0, falhou = 0;
function confira(cond, txt, extra){
  if (cond){ ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU ' + txt + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 300) : '')); }
}
class WsFalso extends EventEmitter {
  constructor(){ super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; this.vivo = true; }
  send(t){ if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
  close(){ if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate(){ this.close(); }
  ping(){}
}
const SEG = 'segredo-v106-emotes';
const P6 = n => String(n).padStart(6, '0');
let relogio = Date.now();
function conta(t, p, n, extra){
  const ws = new WsFalso(), c = t.conecta(ws, {headers:{}, socket:{remoteAddress:'10.0.6.' + p % 250}});
  const k = {ws, c, id:'c' + p, nome:n, manda:m => ws.emit('message', JSON.stringify(m)), emotes:() => ws.caixa.filter(x => x.type === 'emote'), limpa:() => { ws.caixa.length = 0; },
    sala:() => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === 'room') return ws.caixa[i].room; return null; }};
  k.manda({type:'hello', name:n, skin:'T.AAAAxxxx', flag:'BR', conta:assina(SEG, Object.assign({p:String(p), n, t:Date.now(), e:Date.now() + 30*60e3}, extra || {}))});
  return k;
}

function principal(){
  console.log('\n1) a lista e o ritmo (as funções)');
  confira(E106.EMOTES.length === 20 && new Set(E106.EMOTES).size === 20 && E106.EMOTES.every(e => /^[a-z_]+$/.test(e)), 'a lista fixa: 20 emojis, sem repetir, só letras minúsculas e _', E106.EMOTES);
  const L = [], t0 = 1e6;
  const passa = [0, 400, 999, 1000, 1500, 2000, 2999, 3000, 4999, 5000, 6000, 6500, 7000].map(dt => E106.ritmoOk(L, t0 + dt));
  confira(JSON.stringify(passa) === JSON.stringify([true, false, false, true, false, true, false, false, false, true, true, false, true]),
          'o ritmo: 1 a cada 1 s e no máximo 3 em 5 s (0, 1 e 2 s passam; 3 s e 4,999 s não; 5 s, 6 s e 7 s passam)', passa);

  console.log('\n2) a sala (contas de verdade, o relógio na mão)');
  const t = new Turma({log:() => {}, agora:() => relogio, p2p:false, segredo:SEG});
  const Ana = conta(t, 601, 'Ana'), Beto = conta(t, 602, 'Beto'), Caio = conta(t, 603, 'Caio'), Duda = conta(t, 604, 'Duda', {b:[P6(601)]});   // (a Duda bloqueou a Ana)
  const Eva = conta(t, 605, 'Eva');                                       // (a Eva não entra em sala nenhuma)
  confira(typeof Turma.ACOES.emote === 'string' && typeof t[Turma.ACOES.emote] === 'function', 'o servidor conhece a mensagem emote (Turma.ACOES.emote)');
  Ana.manda({type:'create', n:2, map:4, jogo:'futebol', tempo:0, bots:true, pub:true, name:'Emojis'});
  const code = Ana.sala() && Ana.sala().code;
  Beto.manda({type:'join', code, slot:2}); Duda.manda({type:'join', code, slot:1}); Caio.manda({type:'join', code, spectate:true});
  Ana.manda({type:'emote', e:'rindo'});
  confira(!Beto.emotes().length && !Caio.emotes().length, 'antes de a partida começar, o emoji não vai (a sala esperando)');
  Ana.manda({type:'start'});
  const r = t.salas.get(code); if (r && r.partida) r.partida.desligar();
  confira(!!r && r.state === 'playing', 'a partida começou (a sala hospedada)', r && r.state);
  for (const k of [Ana, Beto, Caio, Duda, Eva]) k.limpa();
  relogio += 10000;
  Ana.manda({type:'emote', e:'rindo'});
  const eb = Beto.emotes(), ec = Caio.emotes();
  confira(eb.length === 1 && eb[0].id === Ana.id && eb[0].e === 'rindo' && Object.keys(eb[0]).sort().join() === 'e,id,type' && ec.length === 1,
          'a Ana manda RINDO: o Beto (jogando) e o Caio (assistindo) recebem {type:"emote", id:<a Ana>, e:"rindo"}', [eb, ec]);
  confira(!Ana.emotes().length, '   quem mandou não recebe de volta (o aparelho dela já mostrou)');
  confira(!Duda.emotes().length, '   a Duda bloqueou a Ana: não recebe o emoji dela');
  confira(!Eva.emotes().length, '   quem não está na sala não recebe nada');
  console.log('\n3) só os 20 da lista e só de quem joga');
  for (const k of [Beto, Caio]) k.limpa();
  for (const e of ['xyz', '', 'RINDO', ' rindo', 'rindo ', '__proto__', 'constructor', 'toString', 5, null, true, {}, ['rindo']]){ relogio += 1100; Ana.manda({type:'emote', e}); }
  relogio += 1100; Ana.manda({type:'emote'}); relogio += 1100; Ana.manda({type:'emote', i:3, texto:'oi'});
  confira(!Beto.emotes().length && !Caio.emotes().length, 'o que não é um id da lista não vai (outro texto, maiúsculas, espaço, número, objeto, lista, nada)');
  relogio += 1100; Caio.manda({type:'emote', e:'valeu'});
  confira(!Beto.emotes().length, 'quem assiste não manda (não tem tampinha em campo)');
  relogio += 1100; Eva.manda({type:'emote', e:'valeu'});
  confira(!Beto.emotes().length && !Ana.emotes().length, 'quem não está numa sala é ignorado (sem erro)');
  confira(Beto.ws.caixa.every(x => x.type !== 'error') && Eva.ws.caixa.every(x => x.type !== 'error'), '   (e o servidor não responde erro para ninguém: o que não vale só é ignorado)', Eva.ws.caixa.filter(x => x.type === 'error'));
  console.log('\n4) o ritmo na sala: no máximo 1 a cada 1 s e 3 a cada 5 s');
  relogio += 10000; Beto.limpa();
  for (let i = 0; i < 10; i++) Ana.manda({type:'emote', e:'valeu'});
  confira(Beto.emotes().length === 1, '10 seguidos no mesmo instante: só 1 passa', Beto.emotes().length);
  Beto.limpa(); relogio += 500; Ana.manda({type:'emote', e:'bravo'});
  confira(!Beto.emotes().length, 'meio segundo depois: não passa (1 a cada 1 s)');
  relogio += 500; Ana.manda({type:'emote', e:'bravo'});
  relogio += 1000; Ana.manda({type:'emote', e:'triste'});
  relogio += 1000; Ana.manda({type:'emote', e:'chorando'});
  const tres = Beto.emotes().map(x => x.e);
  confira(JSON.stringify(tres) === JSON.stringify(['bravo', 'triste']), 'com 1 s entre eles passam, até 3 em 5 s (o 4º no mesmo trecho de 5 s fica de fora)', tres);
  relogio += 2000; Ana.manda({type:'emote', e:'sono'});
  confira(Beto.emotes().length === 3 && Beto.emotes()[2].e === 'sono', 'depois que o trecho de 5 s passa, volta a passar', Beto.emotes().map(x => x.e));
  Beto.limpa(); relogio += 1000; Duda.manda({type:'emote', e:'zoando'});
  confira(Beto.emotes().length === 1 && Beto.emotes()[0].id === Duda.id && !Ana.emotes().length, 'o emoji da Duda chega ao Beto e não chega à Ana (o bloqueio vale dos dois lados)', [Beto.emotes(), Ana.emotes()]);
  confira(r.emotes106 instanceof Map && r.emotes106.has(Ana.id) && r.emotes106.has(Duda.id), '   o ritmo é guardado por pessoa na sala (reconectar não zera)');
  console.log('\n5) o silenciado e a sala que acabou');
  Beto.limpa(); relogio += 6000;
  (r.silencio || (r.silencio = new Map())).set(Ana.id, Date.now() + 60000);
  Ana.manda({type:'emote', e:'rindo'});
  confira(!Beto.emotes().length, 'quem está silenciado na sala (as denúncias) também não manda emoji');
  r.silencio.delete(Ana.id); relogio += 2000; Ana.manda({type:'emote', e:'rindo'});
  confira(Beto.emotes().length === 1, '   sem o silêncio, volta a mandar');
  Beto.limpa(); r.state = 'ended'; relogio += 2000; Ana.manda({type:'emote', e:'rindo'});
  confira(!Beto.emotes().length, 'a partida acabou: o emoji não vai');
  console.log('\n' + ok + ' ok, ' + falhou + ' falharam');
  try { t.fecha(); } catch (_) {}
  process.exit(falhou ? 1 : 0);
}
try { principal(); } catch (e) { console.error(e); process.exit(1); }
