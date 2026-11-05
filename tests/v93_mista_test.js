'use strict';
/* v93 · Fase 2 — A SALA MISTA no servidor: um aparelho com a v93 e outro ainda com a página antiga guardada (sem o v93:1 no
   hello). A contagem 3, 2, 1, JÁ! e o replay do gol só esperam por quem conhece os dois: a página antiga não tem o PULAR, então
   não trava o replay de ninguém; numa sala só com páginas antigas, a partida começa e recomeça na hora, como antes.
   Rodar: node tests/v93_mista_test.js   (sem dependências) */
const path = require('path');
const EventEmitter = require('events');
const RAIZ = path.resolve(__dirname, '..');
delete process.env.RACHA_CONTAGEM_MS; delete process.env.RACHA_REPLAY;   // (o padrão do servidor: com a contagem e o replay)
const {Turma} = require(path.join(RAIZ, 'server', 'turma'));

let ok = 0, falhou = 0;
function confira(cond, txt, extra){
  if (cond){ ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU ' + txt + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 400) : '')); }
}
class WsFalso extends EventEmitter {
  constructor(){ super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; }
  send(t){ if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
  close(){ if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate(){ this.close(); }
  ping(){}
}
function cliente(t, nome, v93){
  const ws = new WsFalso();
  t.conecta(ws, {headers:{}, socket:{remoteAddress:'10.0.1.' + Math.floor(Math.random()*250)}});
  const k = {ws, nome,
    manda: m => ws.emit('message', JSON.stringify(m)),
    ult: (tipo, f) => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === tipo && (!f || f(ws.caixa[i]))) return ws.caixa[i]; return null; },
    sala: () => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === 'room') return ws.caixa[i].room; return null; }};
  k.manda(Object.assign({type:'hello', name:nome, skin:'T.AAAA' + nome.toLowerCase().padEnd(4, 'x'), flag:'BR'}, v93 ? {v93:1, v105:1} : {}));
  k.id = k.ult('hello').id;
  return k;
}

async function principal(){
  const t = new Turma({log:() => {}, p2p:false, exigeConta:false});
  console.log('\n1) a sala mista: Ana (v93) e Beto (a página antiga)');
  const Ana = cliente(t, 'Ana', true), Beto = cliente(t, 'Beto', false);
  Ana.manda({type:'create', n:1, map:4, jogo:'futebol', tempo:0, bots:true, pub:false, name:'mista'});
  const code = Ana.sala().code, r = t.salas.get(code);
  Beto.manda({type:'join', code, slot:1});
  Ana.manda({type:'start'});
  confira(r.state === 'playing' && r.partida && !!r.contagem && Ana.ult('contagem') && Beto.ult('contagem'), 'com alguém da v93 na sala, a contagem acontece (para os dois: a partida é uma só)', [r.state, !!r.contagem]);
  t.contagemFim(r); clearTimeout(r.contagemT);
  r.partida.desligar();
  const vai = t.replayComeca(r);
  confira(vai && r.replay && r.replay.precisa === 1, 'o replay do gol: só a Ana vota (precisa de 1 voto — a página do Beto não tem o PULAR)', r.replay && r.replay.precisa);
  Beto.manda({type:'replay_pula', round:r.round});
  confira(!!r.replay && r.replay.votos.size === 0, '   o voto que viesse da página antiga não conta', r.replay && r.replay.votos.size);
  Ana.manda({type:'replay_pula', round:r.round});
  confira(!r.replay && Beto.ult('replay_fim') && Ana.ult('replay_fim'), '   a Ana pula: o replay acaba para os dois na hora', !!r.replay);

  console.log('\n2) a sala só com páginas antigas: tudo como antes');
  const Caio = cliente(t, 'Caio', false), Duda = cliente(t, 'Duda', false);
  Caio.manda({type:'create', n:1, map:4, jogo:'futebol', tempo:0, bots:true, pub:false, name:'antiga'});
  const r2 = t.salas.get(Caio.sala().code);
  Duda.manda({type:'join', code:r2.code, slot:1});
  Caio.manda({type:'start'});
  confira(r2.state === 'playing' && r2.partida && !r2.contagem && !Caio.ult('contagem') && !r2.partida.pausado, 'a partida começa na hora (sem a contagem, que essas páginas não mostram)', [!!r2.contagem, r2.partida && r2.partida.pausado]);
  r2.partida.desligar();
  confira(t.replayComeca(r2) === false && !r2.replay, 'depois do gol, a saída na hora (sem o replay que travaria a tela deles)', !!r2.replay);
  console.log('\n' + ok + ' ok, ' + falhou + ' falharam');
  try { t.fecha(); } catch (_) {}
  process.exit(falhou ? 1 : 0);
}
principal().catch(e => { console.error(e); process.exit(1); });
