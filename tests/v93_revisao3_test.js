'use strict';
/* v93 · as correções da terceira revisão, no servidor (na memória):
   1. quem já está sentado e volta por outra conexão (outra aba, a rede do celular que trocou) com a antiga ainda aberta: os
      comandos da conexão nova valem na hora (antes o servidor jogava fora até 10 s de comandos: a tampinha ficava parada);
   2. aceitar o convite numa sala esperando (personalizada): sai da sala depois que o servidor aceita, e o JOGAR do líder
      começa a busca (antes ficava OCUPADO e a busca não começava);
   3. a pausa que começou durante a contagem conta só a partir do começo da partida (antes tirava até 3 s a mais do relógio).
   Rodar: node tests/v93_revisao3_test.js   (sem dependências) */
const path = require('path');
const EventEmitter = require('events');
const RAIZ = path.resolve(__dirname, '..');
process.env.RACHA_CONTAGEM_MS = '3000'; process.env.RACHA_REPLAY = '0';
const {Turma} = require(path.join(RAIZ, 'server', 'turma'));
const {assina} = require(path.join(RAIZ, 'server', 'banco'));

let ok = 0, falhou = 0;
function confira(cond, txt, extra){
  if (cond){ ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU ' + txt + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 400) : '')); }
}
class WsFalso extends EventEmitter {                     // (como o ws de verdade: close() → o evento 'close' um pouco depois)
  constructor(){ super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; this.vivo = true; }
  send(t){ if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
  close(){ if (this.readyState >= 2) return; this.readyState = 2; setTimeout(() => { this.readyState = 3; this.emit('close'); }, 60); }
  terminate(){ this.readyState = 3; this.emit('close'); }
  ping(){}
}
const SEG = 'segredo-da-revisao-3-1234567890';
const P6 = n => String(n).padStart(6, '0');
let relogio = 1.78e12;
const nova = o => new Turma(Object.assign({log:() => {}, agora:() => relogio, p2p:false, segredo:SEG, exigeConta:false}, o || {}));
function cliente(t, nome, extra){
  const ws = new WsFalso();
  const c = t.conecta(ws, {headers:{}, socket:{remoteAddress:'10.0.4.' + Math.floor(Math.random()*250)}});
  const k = {ws, c, nome,
    manda: m => ws.emit('message', JSON.stringify(m)),
    ult: (tipo, f) => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === tipo && (!f || f(ws.caixa[i]))) return ws.caixa[i]; return null; },
    limpa: () => { ws.caixa.length = 0; },
    sala: () => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === 'room') return ws.caixa[i].room; return null; }};
  k.manda(Object.assign({type:'hello', name:nome, skin:'T.AAAAxxxx', flag:'BR', v93:1}, extra || {}));
  const h = k.ult('hello'); k.id = h && h.id; k.token = h && h.token;
  return k;
}
const conta = (p, n, a) => ({conta:assina(SEG, {p:String(p), n, t:Date.now(), e:Date.now() + 30*60e3, a:(a || []).map(P6)})});
const espera = ms => new Promise(r => setTimeout(r, ms));

async function principal(){
  console.log('\n1) a volta por outra conexão, com a antiga ainda aberta');
  {
    const t = nova();
    const Ana = cliente(t, 'Ana');
    Ana.manda({type:'create', n:1, map:4, jogo:'futebol', tempo:0, bots:true, pub:false, name:'r1'});
    const r = t.salas.get(Ana.c.sala);
    Ana.manda({type:'start'}); t.contagemFim(r); clearTimeout(r.contagemT);
    const p = r.partida; p.desligar();
    const q = () => p.jog.find(x => x.netId === Ana.id);
    for (let s = 1; s <= 300; s++){ relogio += 17; p.entrada(Ana.id, {seq:s, x:1, y:0, button:1, k:0}); }   // (5 s de comandos, no ritmo de sempre)
    q().fila.fila.length = 0;
    const Ana2 = cliente(t, 'Ana', {token:Ana.token});    // (a conexão nova: o mesmo jogador, a antiga ainda aberta)
    let aceitos = 0;
    for (let s = 1; s <= 60; s++){ relogio += 17; const n0 = q().fila.fila.length; Ana2.c.baldes.comando = null; Ana2.manda({type:'input', seq:s, x:-1, y:0, button:1, k:0}); if (q().fila.fila.length > n0) aceitos++; }
    confira(Ana2.id === Ana.id && aceitos === 60 && p.jog.filter(x => x.netId === Ana.id).length === 1, 'os comandos da conexão nova valem na hora (' + aceitos + ' de 60) e ela continua numa tampinha só', [aceitos]);
    try { t.fecha(); } catch (_) {}
  }

  console.log('\n2) aceitar o convite numa sala esperando');
  {
    const t = nova();
    const Ana = cliente(t, 'Ana', conta(201, 'Ana', [202])), Beto = cliente(t, 'Beto', conta(202, 'Beto', [201])), Caio = cliente(t, 'Caio');
    Caio.manda({type:'create', n:2, map:4, jogo:'futebol', tempo:0, bots:true, pub:false, name:'esperando'});
    const code = Caio.sala().code;
    Beto.manda({type:'join', code, slot:1});              // (o Beto está numa sala esperando começar)
    Ana.manda({type:'grupo_convida', para:P6(202)});
    const cv = Beto.ult('grupo_convite');
    Beto.limpa();
    Beto.manda({type:'grupo_resposta', id:cv && cv.id, aceita:true, pts:500});
    const G = t.g93De(Ana.id);
    confira(cv && G && G.membros.length === 2 && !t.salaDe(Beto.c) && Beto.ult('left'), 'o servidor aceita: o Beto entra no grupo e sai da sala (o aparelho volta para o lobby)', [!!t.salaDe(Beto.c), !!Beto.ult('left')]);
    Beto.manda({type:'grupo_pronto', on:true});           // (v95: o PRONTO de quem não é o líder)
    Ana.manda({type:'fila', n:2, pts:500});
    confira(!!G.busca && t.filaEsp.size === 2, '   o JOGAR da líder começa a busca com o grupo (antes: "o Beto está numa sala")', [JSON.stringify(G.busca), Ana.ult('error')]);
    try { t.fecha(); } catch (_) {}
  }

  console.log('\n3) a pausa durante a contagem');
  {
    relogio = 1.78e12;
    const t = nova();
    const Ana = cliente(t, 'Ana');
    Ana.manda({type:'create', n:1, map:4, jogo:'futebol', tempo:0, bots:true, pub:false, name:'r3'});
    const r = t.salas.get(Ana.c.sala);
    Ana.manda({type:'start'});                           // (a contagem: o relógio começa daqui a 3 s)
    relogio += 1000; Ana.manda({type:'pause', paused:true});   // (a pausa no meio da contagem)
    relogio += 4000;                                     // (2 s de contagem + 2 s de jogo, pausado)
    confira(t.decorrido(r) === 0, 'pausada desde a contagem: o relógio da partida fica em 0', t.decorrido(r));
    Ana.manda({type:'pause', paused:false});
    relogio += 5000;
    confira(t.decorrido(r) === 5000, 'a pausa acaba: o relógio anda certo (5 s de jogo, sem tirar a contagem)', t.decorrido(r));
    clearTimeout(r.contagemT);
    try { t.fecha(); } catch (_) {}
  }

  console.log('\n' + ok + ' ok, ' + falhou + ' falharam');
  process.exit(falhou ? 1 : 0);
}
principal().catch(e => { console.error(e); process.exit(1); });
