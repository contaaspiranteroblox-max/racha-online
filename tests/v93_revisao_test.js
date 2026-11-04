'use strict';
/* v93 · as correções da revisão das Fases 2 e 3, no servidor (na memória):
   1. o REINICIAR que não pode começar (bots desligados e alguém caiu) não para a partida: o admin recebe o motivo;
   2. a pausa que chega no meio do replay do gol: depois do replay o motor continua parado (antes a física andava com a sala
      pausada) e o relógio conta o tempo parado uma vez só;
   3. a vaga guardada de quem caiu, quando o admin põe outra pessoa nela: quem volta assiste (antes o motor dava a ele o
      primeiro bot livre, às vezes do outro time) — e a volta normal usa o mesmo lugar da sala no motor;
   4. depois do apito final o admin não muda ninguém de time; quem o admin trocou de time no meio da partida não leva o
      resultado do time novo (sem prêmio, troféu nem selo);
   5. a partida encerrada no meio do replay manda o fim do replay para todos (antes o replay ficava parado na tela).
   Rodar: node tests/v93_revisao_test.js   (sem dependências) */
const path = require('path');
const EventEmitter = require('events');
const RAIZ = path.resolve(__dirname, '..');
process.env.RACHA_CONTAGEM_MS = '0'; process.env.RACHA_REPLAY_MS = '5000'; delete process.env.RACHA_REPLAY;
const {Turma} = require(path.join(RAIZ, 'server', 'turma'));
const {RQ_GOL_TICKS, RQ_FIM_TICKS} = require(path.join(RAIZ, 'server', 'partida', 'sala'));
const {assina} = require(path.join(RAIZ, 'server', 'banco'));
const SEG = 'segredo-de-teste-da-revisao-1234567890';
const conta = (p, n) => ({conta:assina(SEG, {p:String(p), n, e:Date.now() + 3600e3})});

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
let relogio = 1.76e12;
function cliente(t, nome, extra){
  const ws = new WsFalso();
  t.conecta(ws, {headers:{}, socket:{remoteAddress:'10.0.2.' + Math.floor(Math.random()*250)}});
  const k = {ws, nome,
    manda: m => ws.emit('message', JSON.stringify(m)),
    ult: (tipo, f) => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === tipo && (!f || f(ws.caixa[i]))) return ws.caixa[i]; return null; },
    tipos: () => ws.caixa.map(x => x.type),
    limpa: () => { ws.caixa.length = 0; },
    sala: () => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === 'room') return ws.caixa[i].room; return null; }};
  k.manda(Object.assign({type:'hello', name:nome, skin:'T.AAAA' + nome.toLowerCase().padEnd(4, 'x'), flag:'BR', v93:1}, extra || {}));
  k.id = k.ult('hello').id; k.token = k.ult('hello').token;
  return k;
}
const espera = ms => new Promise(res => setTimeout(res, ms));
const adm = async (k, o) => { await espera(360); k.manda(Object.assign({type:'adm'}, o)); };
const erroAdm = k => { const e = k.ult('error'); return e && e.codigo === 'adm' ? e.message : ''; };
const nova = o => new Turma(Object.assign({log:() => {}, agora:() => relogio, p2p:false, exigeConta:false}, o || {}));

async function principal(){
  console.log('\n1) o REINICIAR que não pode começar');
  {
    const t = nova();
    const Ana = cliente(t, 'Ana'), Beto = cliente(t, 'Beto'), Caio = cliente(t, 'Caio');
    Ana.manda({type:'create', n:1, map:4, jogo:'futebol', tempo:0, bots:false, pub:false, name:'r1'});
    const code = Ana.sala().code, r = t.salas.get(code);
    Beto.manda({type:'join', code, slot:1}); Caio.manda({type:'join', code, spectate:true});
    Ana.manda({type:'start'}); r.partida.desligar();
    Beto.ws.close();                                    // (o Beto cai: a vaga dele fica vazia — v103: sem bots — e a partida continua)
    const p0 = r.partida;
    Ana.limpa(); await adm(Ana, {acao:'reiniciar'});
    confira(/Não dá para reiniciar agora: cada time precisa de pelo menos uma pessoa/.test(erroAdm(Ana)) && r.state === 'playing' && r.partida === p0 && !p0.encerrado,
      'sem os bots e com alguém fora, o REINICIAR é recusado com o motivo — e a partida continua para todos', [erroAdm(Ana), r.state]);
    try { t.fecha(); } catch (_) {}
  }

  console.log('\n2) a pausa no meio do replay do gol');
  {
    relogio = 1.76e12;
    const t = nova();
    const Ana = cliente(t, 'Ana');
    Ana.manda({type:'create', n:1, map:4, jogo:'futebol', tempo:0, bots:true, pub:false, name:'r2'});
    const r = t.salas.get(Ana.sala().code);
    { const Beto0 = cliente(t, 'Beto'); Beto0.manda({type:'join', code:r.code, slot:1}); }   // (v103: sem bots, o outro time precisa de alguém)
    Ana.manda({type:'start'});
    const p = r.partida; p.desligar(); p.rodar(5); p.estado = 'jogo';
    relogio += 20000; const d0 = t.decorrido(r);
    p.gol(1); p.rodar(RQ_GOL_TICKS + 2);
    confira(!!r.replay && p.estado === 'replay' && p.pausado, 'o gol: o replay começa (o motor parado)', [!!r.replay, p.estado]);
    relogio += 200; Ana.manda({type:'pause', paused:true});
    relogio += 300;
    t.replayFim(r, 'tempo');                             // (o tempo do replay acaba com a sala pausada)
    confira(!r.replay && !!r.pausa && p.pausado && p.estado === 'saida', 'o replay acaba com a sala pausada: a saída do gol fica pronta e o motor continua parado', [!!r.replay, !!r.pausa, p.pausado, p.estado]);
    const tk = p.tick; p.rodar(60);
    confira(p.tick === tk, '   nada anda enquanto a sala está pausada (0 passos em 60)', p.tick - tk);
    const dPausa = t.decorrido(r);
    relogio += 1000; Ana.manda({type:'pause', paused:false});
    const d1 = t.decorrido(r);
    confira(Math.abs(dPausa - d0) < 5 && Math.abs(d1 - d0) < 5 && !p.pausado, 'o relógio da partida não andou no replay nem na pausa (contados uma vez só) e a pausa acaba', [d0, dPausa, d1]);
    relogio += 2000;
    confira(Math.abs(t.decorrido(r) - d0 - 2000) < 5, '   depois, o relógio volta a andar normalmente', t.decorrido(r) - d0);
    try { t.fecha(); } catch (_) {}
  }

  console.log('\n3) a vaga guardada de quem caiu');
  {
    relogio = 1.76e12;
    const t = nova();
    const Ana = cliente(t, 'Ana'), Xico = cliente(t, 'Xico'), Beto = cliente(t, 'Beto');
    Ana.manda({type:'create', n:2, map:4, jogo:'futebol', tempo:0, bots:true, pub:false, name:'r3'});
    const code = Ana.sala().code, r = t.salas.get(code);
    Xico.manda({type:'join', code, slot:2}); Beto.manda({type:'join', code, slot:3});
    Ana.manda({type:'start'}); r.partida.desligar();
    const ids = () => r.partida.jog.map(q => q.netId);
    Xico.ws.close();                                    // (o Xico cai do lugar 3, Time B: o lugar fica guardado 90 s)
    await adm(Ana, {acao:'mover', id:Ana.id, slot:2});  // a Ana passa pela vaga dele…
    await adm(Ana, {acao:'mover', id:Ana.id, slot:0});  // … e volta
    const X2 = cliente(t, 'Xico', {token:Xico.token});
    X2.manda({type:'join', code, slot:2});
    const ri = r.roster.indexOf(X2.id), ei = ids().indexOf(X2.id);
    confira(ri === -1 && ei === -1 && r.members.find(x => x.id === X2.id), 'o admin pôs outra pessoa na vaga do Xico: ele volta assistindo (a sala e o motor de acordo)', [ri, ei]);
    // a volta normal: o motor usa o mesmo lugar da sala
    Beto.ws.close();
    const B2 = cliente(t, 'Beto', {token:Beto.token});
    B2.manda({type:'join', code, slot:3});
    confira(r.roster.indexOf(B2.id) === 3 && ids().indexOf(B2.id) === 3 && new Set(ids().filter(Boolean)).size === ids().filter(Boolean).length,
      'quem cai e volta a tempo reassume o MESMO lugar (na sala e no motor)', [r.roster.indexOf(B2.id), ids().indexOf(B2.id)]);
    try { t.fecha(); } catch (_) {}
  }

  console.log('\n4) o apito final e quem trocou de time');
  {
    relogio = 1.76e12;
    const t = nova({segredo:SEG});
    const Ana = cliente(t, 'Ana', conta(201, 'Ana')), Beto = cliente(t, 'Beto', conta(202, 'Beto')), Caio = cliente(t, 'Caio', conta(203, 'Caio'));
    Ana.manda({type:'create', n:2, map:4, jogo:'futebol', tempo:0, bots:true, pub:false, name:'r4'});
    const code = Ana.sala().code, r = t.salas.get(code);
    Beto.manda({type:'join', code, slot:2}); Caio.manda({type:'join', code, slot:1});
    Ana.manda({type:'start'});                           // (Ana e Caio no Time A; Beto no Time B)
    const p = r.partida; p.desligar(); p.rodar(3); p.estado = 'jogo';
    relogio += 60000;
    await adm(Ana, {acao:'mover', id:Caio.id, slot:3}); // no meio da partida, a admin manda o Caio para o Time B
    confira(r.roster[3] === Caio.id && r.v93Trocou.has(Caio.id), 'o Caio vai para o Time B no meio da partida (anotado: trocou de time)', r.roster);
    p.placar = [0, 2]; p.gol(-1);                        // (o Time B faz o 3º: o apito final)
    p.rodar(RQ_GOL_TICKS + 2);
    Ana.limpa(); await adm(Ana, {acao:'mover', id:Ana.id, slot:3});
    confira(/acabando/.test(erroAdm(Ana)) && r.roster[0] === Ana.id, 'depois do apito final a admin não muda de time ("A partida está acabando…")', [erroAdm(Ana), r.roster]);
    p.rodar(RQ_FIM_TICKS + 5);
    const rc = Caio.ult('result'), rb = Beto.ult('result');
    confira(rc && rc.valida === false && !rc.selo && /trocou de time/.test(rc.motivo || '') && rb && rb.valida === true && !!rb.selo,
      'o resultado: o Caio (que trocou de time) não leva o do time novo (sem selo); o Beto, normal', [rc && {v:rc.valida, m:rc.motivo, s:!!rc.selo}, rb && {v:rb.valida, s:!!rb.selo}]);
    const st = id => (t.b.d.gente[id] && t.b.d.gente[id].st) || {};
    confira((st(Caio.id).vit | 0) === 0 && (st(Beto.id).vit | 0) === 1, '   o troféu da vitória vai para o Beto, não para o Caio', [st(Caio.id), st(Beto.id)]);
    try { t.fecha(); } catch (_) {}
  }

  console.log('\n5) ENCERRAR no meio do replay');
  {
    relogio = 1.76e12;
    const t = nova();
    const Ana = cliente(t, 'Ana'), Beto = cliente(t, 'Beto');
    Ana.manda({type:'create', n:1, map:4, jogo:'futebol', tempo:0, bots:true, pub:false, name:'r5'});
    const code = Ana.sala().code, r = t.salas.get(code);
    Beto.manda({type:'join', code, slot:1});
    Ana.manda({type:'start'});
    const p = r.partida; p.desligar(); p.rodar(3); p.estado = 'jogo'; p.gol(1); p.rodar(RQ_GOL_TICKS + 2);
    const noReplay = !!r.replay;
    Beto.limpa();
    await adm(Ana, {acao:'encerrar'});
    p.rodar(RQ_FIM_TICKS + 2);
    confira(noReplay && Beto.ult('replay_fim') && Beto.ult('result') && !r.replay, 'a partida encerrada no meio do replay manda o fim do replay para todos (e o resultado)', Beto.tipos().filter(x => x !== 'snapshot'));
    try { t.fecha(); } catch (_) {}
  }

  console.log('\n' + ok + ' ok, ' + falhou + ' falharam');
  process.exit(falhou ? 1 : 0);
}
principal().catch(e => { console.error(e); process.exit(1); });
