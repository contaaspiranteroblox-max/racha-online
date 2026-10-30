'use strict';
/* v93 · Fase 5 — OS BALÕES DE FALA RÁPIDA no servidor da turma, na memória, com contas de verdade (o bilhete):
   a frase vai para todos da sala (só as 8 prontas, só de quem está jogando), o ritmo (quem passa dele é ignorado), quem
   bloqueou não recebe, fora da partida não vai. Rodar: node tests/v93_falas_test.js */
const path = require('path');
const EventEmitter = require('events');
const RAIZ = path.resolve(__dirname, '..');
process.env.RACHA_CONTAGEM_MS = '0'; process.env.RACHA_REPLAY = '0';
const {Turma} = require(path.join(RAIZ, 'server', 'turma'));
const {assina} = require(path.join(RAIZ, 'server', 'banco'));

let ok = 0, falhou = 0;
function confira(cond, txt, extra){
  if (cond){ ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU ' + txt + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 300) : '')); }
}
const espera = ms => new Promise(r => setTimeout(r, ms));
class WsFalso extends EventEmitter {
  constructor(){ super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; this.vivo = true; }
  send(t){ if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
  close(){ if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate(){ this.close(); }
  ping(){}
}
const SEG = 'segredo-v93-falas';
const P6 = n => String(n).padStart(6, '0');
function conta(t, p, n, extra){
  const ws = new WsFalso(), c = t.conecta(ws, {headers:{}, socket:{remoteAddress:'10.0.1.' + p % 250}});
  const k = {ws, c, id:'c' + p, nome:n, manda:m => ws.emit('message', JSON.stringify(m)), falas:() => ws.caixa.filter(x => x.type === 'fala'), limpa:() => { ws.caixa.length = 0; },
    sala:() => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === 'room') return ws.caixa[i].room; return null; }};
  k.manda({type:'hello', name:n, skin:'T.AAAAxxxx', flag:'BR', conta:assina(SEG, Object.assign({p:String(p), n, t:Date.now(), e:Date.now() + 30*60e3}, extra || {}))});
  return k;
}

async function principal(){
  const t = new Turma({log:() => {}, agora:() => Date.now(), p2p:false, segredo:SEG});
  const Ana = conta(t, 301, 'Ana'), Beto = conta(t, 302, 'Beto'), Caio = conta(t, 303, 'Caio'), Duda = conta(t, 304, 'Duda', {b:[P6(301)]});   // (a Duda bloqueou a Ana)
  Ana.manda({type:'create', n:2, map:4, jogo:'futebol', tempo:0, bots:true, pub:true, name:'Falas'});
  const code = Ana.sala().code;
  Beto.manda({type:'join', code, slot:2}); Duda.manda({type:'join', code, slot:1}); Caio.manda({type:'join', code, spectate:true});
  Ana.manda({type:'fala', i:0});
  confira(!Beto.falas().length, 'antes de começar a partida, a fala não vai');
  Ana.manda({type:'start'});
  const r = t.salas.get(code); r.partida && r.partida.desligar();
  for (const k of [Ana, Beto, Caio, Duda]) k.limpa();
  Ana.manda({type:'fala', i:0});
  const fb = Beto.falas(), fc = Caio.falas();
  confira(fb.length === 1 && fb[0].i === 0 && fb[0].id === Ana.id && fb[0].slot === 0 && fc.length === 1, 'a Ana fala "Golaço!": o Beto (jogando) e o Caio (assistindo) recebem (quem, o lugar e a frase)', fb);
  confira(!Ana.falas().length, '   (quem falou não recebe a própria fala de volta: o aparelho dela já mostrou)');
  confira(!Duda.falas().length, 'a Duda bloqueou a Ana: não recebe a fala dela');
  Beto.limpa(); Ana.manda({type:'fala', i:8}); Ana.manda({type:'fala', i:-1}); Ana.manda({type:'fala', i:'Boa!'}); Ana.manda({type:'fala', texto:'oi'});
  confira(!Beto.falas().length, 'só as 8 frases prontas: número fora da lista, texto ou nada não vão');
  Caio.manda({type:'fala', i:3});
  confira(!Beto.falas().length, 'quem assiste não fala no campo');
  Beto.limpa(); for (let i = 0; i < 10; i++) Ana.manda({type:'fala', i:3});
  const n = Beto.falas().length;
  confira(n >= 1 && n <= 3, 'o ritmo: 10 falas seguidas, só ' + n + ' passam (até 3 de uma vez; depois uma a cada 1,5 s)', n);
  await espera(1600); Beto.limpa(); Ana.manda({type:'fala', i:5});
  confira(Beto.falas().length === 1 && Beto.falas()[0].i === 5, 'depois de um tempo, a fala volta a passar ("Obrigado!")');
  Beto.limpa(); Duda.manda({type:'fala', i:4});
  confira(Beto.falas().length === 1 && !Ana.falas().length, 'a fala da Duda também não chega para a Ana (o bloqueio vale dos dois lados)');
  console.log('\n' + ok + ' ok, ' + falhou + ' falharam');
  try { t.fecha(); } catch (_) {}
  process.exit(falhou ? 1 : 0);
}
principal().catch(e => { console.error(e); process.exit(1); });
