'use strict';
/* v93 · Fase 3 — O ADMIN DA SALA no servidor (server/turma.js: adm; o motor: server/partida/sala.js), na memória:
   quem pode (só o admin, só a sala personalizada; a ranqueada e a copa não têm admin), organizar os times antes de começar
   (mover, trocar de lugar, o banco), no meio da partida (o banco ↔ o time, a vaga do bot, a troca entre dois jogadores — o
   motor troca quem joga em cada tampinha, sem duplicar ninguém), o placar e o relógio que continuam, passar o admin,
   ENCERRAR (o resultado não vale prêmio, como o encerrar do árbitro), REINICIAR (0 × 0, os mesmos times), a pessoa que já
   saiu, o ritmo, o registro no log e o aviso no chat da sala.
   Rodar: node tests/v93_salas_test.js   (sem dependências) */
const path = require('path');
const EventEmitter = require('events');
const RAIZ = path.resolve(__dirname, '..');
process.env.RACHA_CONTAGEM_MS = '0'; process.env.RACHA_REPLAY = '0';   // (as regras aqui; a contagem e o replay têm o teste deles: v93_fase2)
const {Turma} = require(path.join(RAIZ, 'server', 'turma'));
const {RQ_FIM_TICKS} = require(path.join(RAIZ, 'server', 'partida', 'sala'));

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
let relogio = 1.76e12;
const LOG = [];
function cliente(t, nome){
  const ws = new WsFalso();
  const c = t.conecta(ws, {headers:{}, socket:{remoteAddress:'10.0.0.' + Math.floor(Math.random()*250)}});
  const k = {ws, c, nome,
    manda: m => ws.emit('message', JSON.stringify(m)),
    ult: (tipo, f) => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === tipo && (!f || f(ws.caixa[i]))) return ws.caixa[i]; return null; },
    todas: (tipo, f) => ws.caixa.filter(x => x.type === tipo && (!f || f(x))),
    limpa: () => { ws.caixa.length = 0; },
    sala: () => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === 'room') return ws.caixa[i].room; return null; }};
  k.manda({type:'hello', name:nome, skin:'T.AAAA' + nome.toLowerCase().padEnd(4, 'x'), flag:'BR'});
  k.id = k.ult('hello').id;
  return k;
}
const ids = r => r.partida ? r.partida.jog.map(q => q.netId) : null;
const semDuplicados = r => { const l = ids(r).filter(Boolean); return new Set(l).size === l.length; };
const erroAdm = k => { const e = k.ult('error'); return e && e.codigo === 'adm' ? e.message : ''; };
const espera = ms => new Promise(res => setTimeout(res, ms));
const adm = async (k, o) => { await espera(360); k.manda(Object.assign({type:'adm'}, o)); };   // (o ritmo do servidor: 3 ações por segundo)

async function principal(){
  const t = new Turma({log:x => LOG.push(String(x)), agora:() => relogio, p2p:false, exigeConta:false});
  console.log('\n1) antes de começar: só o admin organiza os times (mover, trocar, banco)');
  const Ana = cliente(t, 'Ana'), Beto = cliente(t, 'Beto'), Caio = cliente(t, 'Caio'), Duda = cliente(t, 'Duda');
  Ana.manda({type:'create', n:2, map:4, jogo:'futebol', tempo:0, bots:true, pub:false, name:'Racha da Ana'});
  const code = Ana.sala().code, r = t.salas.get(code);
  Beto.manda({type:'join', code, slot:1}); Duda.manda({type:'join', code, slot:2}); Caio.manda({type:'join', code, spectate:true});
  confira(r.roster.join(',') === [Ana.id, Beto.id, Duda.id, null].join(',') && Ana.sala().admin === Ana.id, 'a sala: Ana (admin) e Beto no Time A, Duda no Time B, Caio assistindo', r.roster);
  Beto.limpa(); await adm(Beto, {acao:'mover', id:Duda.id, time:0});
  confira(/Só o admin/.test(erroAdm(Beto)) && r.roster[2] === Duda.id, 'quem não é o admin não mexe: "Só o admin da sala faz isso." (nada muda)', erroAdm(Beto));
  await adm(Ana, {acao:'mover', id:Beto.id, time:1});
  confira(r.roster[3] === Beto.id && !r.roster[1], 'MOVER: o Beto vai para a vaga livre do Time B', r.roster);
  Ana.limpa(); await adm(Ana, {acao:'mover', id:Ana.id, time:1});
  confira(/cheio/.test(erroAdm(Ana)), 'o Time B cheio: o servidor pede para escolher com quem trocar', erroAdm(Ana));
  await adm(Ana, {acao:'mover', id:Caio.id, slot:2});
  const duda = r.members.find(x => x.id === Duda.id), caio = r.members.find(x => x.id === Caio.id);
  confira(r.roster[2] === Caio.id && duda.slot === -1 && duda.banco === true && caio.banco === false, 'TROCAR (do banco): o Caio entra no lugar da Duda, que vai para o banco (reserva)', r.roster);
  await adm(Ana, {acao:'mover', id:Beto.id, slot:0});
  confira(r.roster[0] === Beto.id && r.roster[3] === Ana.id, 'TROCAR (dois jogadores): Ana e Beto trocam de lugar', r.roster);
  const avisos = Caio.todas('say', x => x.sys && /foi para o/.test(x.text)).map(x => x.text);
  confira(avisos.length >= 3 && LOG.some(l => /admin da sala .*: Beto foi para o Time A/.test(l)), 'cada ação vai para o chat da sala e para o registro do servidor', avisos.slice(-2));
  await adm(Ana, {acao:'mover', id:Beto.id, slot:3}); await adm(Ana, {acao:'mover', id:Ana.id, slot:0});   // (de volta: Ana 0, Beto 3)
  confira(r.roster[0] === Ana.id && r.roster[3] === Beto.id, '   (de volta: Ana no Time A, Beto no Time B)', r.roster);

  console.log('\n2) na partida (hospedada): o banco, a vaga do bot e a troca — o motor troca quem joga em cada tampinha');
  Ana.manda({type:'start'});
  confira(r.state === 'playing' && r.partida && ids(r).join(',') === [Ana.id, null, Caio.id, Beto.id].join(','), 'a partida começa: Ana, bot, Caio, Beto (o bot na vaga)', ids(r));
  r.partida.desligar();                                 // (daqui o teste anda o motor na mão: rodar)
  r.partida.rodar(30); r.partida.placar = [1, 0]; const tick0 = r.partida.tick;
  const pos0 = r.partida.jog.map(q => [Math.round(q.x), Math.round(q.y)]);
  await adm(Ana, {acao:'reserva', id:Caio.id});
  const qc = r.partida.jog[2];
  confira(!r.roster[2] && qc.bot && !qc.netId && caio.slot === -1 && caio.banco, 'RESERVA: o Caio vai para o banco e o bot segura o lugar dele na hora', [r.roster, qc.bot, qc.netId]);
  await adm(Ana, {acao:'mover', id:Duda.id, slot:2});
  confira(r.roster[2] === Duda.id && r.partida.jog[2].netId === Duda.id && !r.partida.jog[2].bot && semDuplicados(r), 'ENTRAR (do banco na vaga do bot): a Duda assume a tampinha do lugar 3', ids(r));
  await adm(Ana, {acao:'mover', id:Caio.id, slot:1});
  confira(r.partida.jog[1].netId === Caio.id && semDuplicados(r), 'o Caio entra na vaga do bot do Time A', ids(r));
  await adm(Ana, {acao:'mover', id:Beto.id, slot:0});
  confira(r.partida.jog[0].netId === Beto.id && r.partida.jog[3].netId === Ana.id && r.roster[0] === Beto.id && r.roster[3] === Ana.id && semDuplicados(r),
    'TROCAR no meio da partida: Ana e Beto trocam de tampinha (cada um com a sua fila de comandos nova)', ids(r));
  const pos1 = r.partida.jog.map(q => [Math.round(q.x), Math.round(q.y)]);
  confira(r.partida.placar.join('×') === '1×0' && r.partida.tick === tick0 && JSON.stringify(pos0) === JSON.stringify(pos1), 'o placar (1 × 0), o relógio do motor e as tampinhas no campo continuam iguais', [r.partida.placar, r.partida.tick, tick0]);
  r.partida.rodar(20);
  confira(r.partida.tick === tick0 + 20 && r.partida.jog.every(q => q.bot ? !!q.botAi : !!q.fila && !!q.netButton), 'o motor segue jogando (bots com a inteligência, humanos com a fila e os botões)', r.partida.tick);
  Ana.limpa(); await adm(Ana, {acao:'mover', id:'u_nao_existe', slot:1});
  confira(/não está mais na sala/.test(erroAdm(Ana)), 'alguém que já saiu: "Essa pessoa não está mais na sala."', erroAdm(Ana));
  Duda.manda({type:'leave'});
  confira(!r.partida.jog.some(q => q.netId === Duda.id) && semDuplicados(r), 'a Duda sai da sala no meio: o bot assume (ninguém em dois lugares)', ids(r));
  Duda.manda({type:'join', code});
  const duda2 = r.members.find(x => x.id === Duda.id);
  confira(duda2 && duda2.slot === -1 && !r.partida.jog.some(q => q.netId === Duda.id) && semDuplicados(r), 'a Duda volta como espectadora (o lugar dela não volta sozinho: o admin decide)', ids(r));

  console.log('\n3) o ritmo, passar o admin, ENCERRAR e REINICIAR');
  Ana.limpa(); for (let i = 0; i < 12; i++) Ana.manda({type:'adm', acao:'reserva', id:'x' + i});
  confira(/uma ação de cada vez/.test(erroAdm(Ana)), 'muitas ações de uma vez: o servidor segura o ritmo', erroAdm(Ana));
  relogio += 10000; await espera(1400);
  await adm(Ana, {acao:'admin', id:Beto.id});
  confira(r.host === Beto.id && Beto.sala().admin === Beto.id, 'PASSAR O ADMIN: o Beto vira o admin (todos veem)', [r.host, Beto.sala().admin]);
  Ana.limpa(); await adm(Ana, {acao:'encerrar'});
  confira(/Só o admin/.test(erroAdm(Ana)) && r.state === 'playing', 'a Ana não é mais admin: não encerra', erroAdm(Ana));
  const round = r.round;
  await adm(Beto, {acao:'reiniciar'});
  confira(r.state === 'playing' && r.round === round + 1 && r.partida && r.partida.placar.join('×') === '0×0' && r.roster.join(',') === [Beto.id, Caio.id, null, Ana.id].join(','),
    'REINICIAR: uma rodada nova, 0 × 0, com os mesmos times', [r.round, r.partida && r.partida.placar, r.roster]);
  confira(Ana.todas('say', x => x.sys && /reiniciou/.test(x.text)).length === 1 && LOG.some(l => /reiniciou a partida/.test(l)), '   o aviso no chat e o registro do reiniciar');
  r.partida.desligar(); r.partida.placar = [2, 1];
  Ana.limpa(); Beto.limpa();
  await adm(Beto, {acao:'encerrar'});
  r.partida && r.partida.rodar(RQ_FIM_TICKS + 5);
  const res = Ana.ult('result');
  confira(res && res.valida === false && /encerrada/.test(res.motivo || '') && res.score.join('×') === '2×1' && r.state !== 'playing',
    'ENCERRAR: o apito final na hora, com o placar de agora (2 × 1) — e o resultado não vale prêmio (como o encerrar do árbitro)', res);

  console.log('\n3b) o admin cai no meio da partida');
  relogio += 10000; await espera(400);
  Beto.manda({type:'start'});
  const rodada = r.round;
  confira(r.state === 'playing' && r.partida && r.host === Beto.id, 'uma partida nova (o Beto é o admin)', [r.state, r.host]);
  r.partida.desligar(); r.partida.rodar(10);
  Beto.ws.close();                                      // (caiu: a conexão fechou sem o "leave")
  confira(r.host === Ana.id && Ana.sala().admin === Ana.id && r.state === 'playing' && r.round === rodada && !r.partida.jog.some(q => q.netId === Beto.id),
    'o admin cai: a administração passa para quem está há mais tempo na sala (a Ana) e a partida continua (o bot segura o lugar dele)', [r.host, r.state, ids(r)]);
  Ana.limpa(); await adm(Ana, {acao:'reserva', id:Caio.id});
  confira(!erroAdm(Ana) && r.members.find(x => x.id === Caio.id).slot === -1 && semDuplicados(r), '   a Ana (a admin nova) já usa o painel: o Caio vai para o banco', [erroAdm(Ana), ids(r)]);
  Ana.limpa(); await adm(Ana, {acao:'encerrar'});
  r.partida && r.partida.rodar(RQ_FIM_TICKS + 5);

  console.log('\n4) a ranqueada e a copa não têm admin');
  const e1 = cliente(t, 'Edu'), f1 = cliente(t, 'Fabi');
  e1.manda({type:'fila', n:1, pts:100}); f1.manda({type:'fila', n:1, pts:100});
  const rr = t.salaDe(e1.c);
  confira(rr && rr.ranked && rr.state === 'playing', 'a ranqueada 1v1 começou (Edu × Fabi)', rr && rr.code);
  e1.limpa(); await adm(e1, {acao:'encerrar'}); await adm(e1, {acao:'mover', id:f1.id, slot:0});
  confira(/ranqueada/.test(erroAdm(e1)) && rr.state === 'playing' && rr.roster.indexOf(f1.id) >= 0, 'na ranqueada: "não tem admin: as regras são fixas" (nada muda)', erroAdm(e1));
  confira(rr.partida && semDuplicados(rr), '   e ninguém fica em dois lugares', ids(rr));

  console.log('\n' + ok + ' ok, ' + falhou + ' falharam');
  try { t.fecha(); } catch (_) {}
  process.exit(falhou ? 1 : 0);
}
principal().catch(e => { console.error(e); process.exit(1); });
