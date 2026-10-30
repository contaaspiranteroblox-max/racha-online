'use strict';
/* v95 · O GRUPO NA RANQUEADA no servidor da turma (server/grupo93.js), na memória, com contas de verdade (o bilhete):
   1. o PRONTO no lobby: o JOGAR do líder só procura com todos prontos (o aviso diz quem falta); quem cancela a busca deixa de
      estar pronto; a partida começou, o PRONTO zera;
   2. o JOGAR DE NOVO do grupo no fim da ranqueada: a votação aparece para todos (quem já tocou e o tempo); todos tocaram, a
      busca do grupo começa sozinha (os dois saem da tela do fim juntos, o mesmo tamanho);
   3. ninguém mais tocou em 10 s (aqui, 0,4 s): todo mundo volta para o lobby, com o aviso de quem não confirmou;
   4. o LOBBY durante a votação: todo mundo para o lobby;
   5. quem já está no lobby quando o outro toca: a votação não fecha (todo mundo para o lobby na hora);
   6. sozinho (sem grupo): o servidor responde "sozinho" (o aparelho faz o JOGAR DE NOVO de sempre);
   7. quem cai durante a votação: todo mundo para o lobby.
   Rodar: node tests/v95_grupo_test.js   (sem dependências) */
const path = require('path');
const EventEmitter = require('events');
const RAIZ = path.resolve(__dirname, '..');
process.env.RACHA_CONTAGEM_MS = '0'; process.env.RACHA_REPLAY = '0';
process.env.RACHA_GRUPO_DENOVO_MS = '400';                 // (os 10 s da votação, encurtados para o teste)
const {Turma, FILA_MISTA_MS} = require(path.join(RAIZ, 'server', 'turma'));
const {assina} = require(path.join(RAIZ, 'server', 'banco'));

let ok = 0, falhou = 0;
function confira(cond, txt, extra){
  if (cond){ ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU ' + txt + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 500) : '')); }
}
const espera = ms => new Promise(r => setTimeout(r, ms));
class WsFalso extends EventEmitter {
  constructor(){ super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; this.vivo = true; }
  send(t){ if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
  close(){ if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate(){ this.close(); }
  ping(){}
}
const SEG = 'segredo-v95-grupo';
let relogio = 1.79e12;
const P6 = n => String(n).padStart(6, '0');
function cliente(t){
  const ws = new WsFalso();
  const c = t.conecta(ws, {headers:{}, socket:{remoteAddress:'10.1.0.' + Math.floor(Math.random()*250)}});
  return {ws, c,
    manda: m => { c.baldes = {}; ws.emit('message', JSON.stringify(m)); },   // (sem o limite de ritmo: o teste anda rápido)
    ult: (tipo, f) => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === tipo && (!f || f(ws.caixa[i]))) return ws.caixa[i]; return null; },
    todas: (tipo, f) => ws.caixa.filter(x => x.type === tipo && (!f || f(x))),
    tipos: () => ws.caixa.map(x => x.type),
    limpa: () => { ws.caixa.length = 0; }};
}
function bilhete(p, n, extra){ return assina(SEG, Object.assign({p:String(p), n, t:Date.now(), e:Date.now() + 30*60e3}, extra || {})); }
function conta(t, p, n, extra){ const k = cliente(t); k.manda({type:'hello', name:n, skin:'T.AAAA' + n.toLowerCase().padEnd(4, 'x'), flag:'BR', conta:bilhete(p, n, extra)}); k.id = 'c' + p; k.pub = P6(p); k.nome = n; return k; }
const grupo = k => { const m = k.ult('grupo'); return m ? m.g : undefined; };
const prontos = g => g ? g.membros.map(m => m.nome + (m.lider ? '*' : '') + (m.pronto ? ':pronto' : '')).join(' ') : String(g);

async function principal(){
  const t = new Turma({log:() => {}, agora:() => relogio, p2p:false, segredo:SEG});
  const amigos = l => ({a:l.map(P6)});
  const Ana = conta(t, 301, 'Ana', amigos([302])), Beto = conta(t, 302, 'Beto', amigos([301])), Caio = conta(t, 303, 'Caio', amigos([]));
  Ana.manda({type:'grupo_cria', n:2, pts:500});
  Ana.manda({type:'grupo_convida', para:Beto.pub});
  Beto.manda({type:'grupo_resposta', id:Beto.ult('grupo_convite').id, aceita:true, pts:520});
  const G = t.g93De(Ana.id);
  confira(G && G.membros.length === 2 && G.lider === Ana.id, 'o grupo: a Ana (líder) e o Beto', prontos(grupo(Ana)));
  // uma ranqueada do grupo com os bots completando (o PRONTO do Beto e o JOGAR da Ana)
  const partida = () => {
    Beto.manda({type:'grupo_pronto', on:true});
    Ana.manda({type:'fila', n:2, pts:500});
    relogio += FILA_MISTA_MS + 500; t.filaTenta();
    return t.salaDe(Ana.c);
  };
  const acaba = r => r.partida.onFim({placar:[2, 1], vencedor:0, duracao:60, jogo:'futebol'});

  console.log('\n1) o PRONTO no lobby');
  confira(grupo(Ana).membros.every(m => m.pronto === false), 'no começo ninguém está pronto (o campo pronto vai para os dois)', prontos(grupo(Ana)));
  Ana.limpa(); Ana.manda({type:'fila', n:2, pts:500});
  let e = Ana.ult('error');
  confira(e && e.codigo === 'fila_grupo' && /Beto ainda não está pronto/.test(e.message) && !t.filaEsp.size && !G.busca, 'o JOGAR da líder sem o Beto pronto: "' + (e && e.message) + '" (ninguém entra na fila)', e);
  Beto.manda({type:'grupo_pronto', on:true});
  confira(/Beto:pronto/.test(prontos(grupo(Ana))) && /Beto:pronto/.test(prontos(grupo(Beto))), 'o Beto toca em PRONTO: a Ana e o Beto veem na hora', prontos(grupo(Ana)));
  Ana.limpa(); Beto.limpa(); Ana.manda({type:'fila', n:2, pts:500});
  const fa = Ana.ult('fila'), fb = Beto.ult('fila');
  confira(fa && fa.on && fa.lider === true && fb && fb.on && fb.lider === false && t.filaEsp.get(Beto.id) && t.filaEsp.get(Beto.id).grp === G.id, 'com todos prontos, o JOGAR da líder leva o grupo para a busca', [fa, fb]);
  Beto.manda({type:'fila_sai'});
  await espera(200);                                       // (o grupo vai de novo para todos 150 ms depois)
  confira(!G.busca && !t.filaEsp.size && /Beto(?!:pronto)/.test(prontos(grupo(Ana))) && !G.membros.find(x => x.id === Beto.id).pronto, 'o Beto cancela: a busca para e ele deixa de estar pronto', prontos(grupo(Ana)));
  Beto.manda({type:'grupo_pronto', on:true}); Beto.manda({type:'grupo_pronto', on:false});
  confira(!G.membros.find(x => x.id === Beto.id).pronto, 'tocar de novo no PRONTO tira o pronto', prontos(grupo(Ana)));
  let r = partida();
  confira(r && r.ranked && r.state === 'playing' && Math.floor(r.roster.indexOf(Ana.id)/2) === Math.floor(r.roster.indexOf(Beto.id)/2), 'PRONTO e o JOGAR: a ranqueada começa com os dois no mesmo time (os bots completam)', r && r.roster);
  await espera(200);
  confira(G.membros.every(x => !x.pronto) && grupo(Ana).membros.every(m => !m.pronto), 'a partida começou: o PRONTO zera (depois, no lobby, cada um toca de novo)', prontos(grupo(Ana)));

  console.log('\n2) o JOGAR DE NOVO do grupo');
  acaba(r);
  Ana.limpa(); Beto.limpa();
  Ana.manda({type:'grupo_denovo', sim:true});
  const gb = grupo(Beto);
  confira(G.denovo && gb && gb.denovo && gb.denovo.votos.length === 1 && gb.denovo.votos[0] === Ana.id && gb.denovo.resta > 0 && gb.denovo.resta <= 400 && gb.denovo.n === 2,
    'a Ana toca em JOGAR DE NOVO: a votação aparece para o Beto (quem já tocou, o tempo, o tamanho)', gb && gb.denovo);
  confira(t.salaDe(Ana.c) === r && t.salaDe(Beto.c) === r && !Ana.ult('left'), '   ninguém sai da tela do fim ainda');
  Beto.manda({type:'grupo_denovo', sim:true});
  const fa2 = Ana.ult('fila'), fb2 = Beto.ult('fila');
  confira(!G.denovo && Ana.ult('left') && Beto.ult('left') && !t.salaDe(Ana.c) && !t.salaDe(Beto.c) && fa2 && fa2.on && fa2.denovo && fa2.lider && fb2 && fb2.on && !fb2.lider && fa2.n === 2
    && t.filaEsp.get(Ana.id) && t.filaEsp.get(Ana.id).grp === G.id && t.filaEsp.get(Beto.id) && G.busca,
    'o Beto também toca: os dois saem da tela do fim juntos e a busca do grupo começa sozinha (2 VS 2, sem precisar do PRONTO)', [Ana.tipos(), Beto.tipos()]);
  const ordem = Ana.tipos().filter(x => x === 'left' || x === 'fila');
  confira(ordem[0] === 'left' && ordem[1] === 'fila', '   a ordem no aparelho: primeiro sai da sala, depois a busca abre', ordem);
  relogio += FILA_MISTA_MS + 500; t.filaTenta();
  r = t.salaDe(Ana.c);
  confira(r && r.ranked && r.state === 'playing' && t.salaDe(Beto.c) === r, '   e a partida seguinte começa com os dois', r && r.roster);

  console.log('\n3) ninguém mais tocou a tempo (10 s; aqui 0,4 s)');
  acaba(r);
  Ana.limpa(); Beto.limpa();
  Ana.manda({type:'grupo_denovo', sim:true});
  await espera(650);
  const fimA = Ana.ult('grupo_denovo_fim'), fimB = Beto.ult('grupo_denovo_fim');
  confira(!G.denovo && fimA && fimB && /Beto não confirmou a tempo/.test(fimA.motivo) && Ana.ult('left') && Beto.ult('left') && !t.salaDe(Ana.c) && !t.salaDe(Beto.c) && !t.filaEsp.size && !G.busca,
    'o tempo acabou: os dois voltam para o lobby ("' + (fimA && fimA.motivo) + '")', [fimA, fimB]);
  confira(G.membros.every(x => !x.pronto), '   no lobby, cada um toca em PRONTO de novo', prontos(grupo(Ana)));

  console.log('\n4) o LOBBY durante a votação');
  r = partida(); acaba(r);
  Ana.limpa(); Beto.limpa();
  Ana.manda({type:'grupo_denovo', sim:true});
  Beto.manda({type:'grupo_denovo', sim:false});
  const l4 = Ana.ult('grupo_denovo_fim');
  confira(!G.denovo && l4 && /Beto voltou para o lobby/.test(l4.motivo) && !t.salaDe(Ana.c) && !t.salaDe(Beto.c) && Ana.ult('left') && Beto.ult('left'),
    'o Beto toca em LOBBY: todo mundo para o lobby na hora ("' + (l4 && l4.motivo) + '")', l4);

  console.log('\n5) quem já está no lobby');
  r = partida(); acaba(r);
  Beto.manda({type:'leave'});
  Ana.limpa();
  Ana.manda({type:'grupo_denovo', sim:true});
  const l5 = Ana.ult('grupo_denovo_fim');
  confira(!G.denovo && l5 && /Beto já está no lobby/.test(l5.motivo) && !t.salaDe(Ana.c) && Ana.ult('left'), 'o Beto já voltou para o lobby: o JOGAR DE NOVO da Ana leva ela para o lobby ("' + (l5 && l5.motivo) + '")', l5);

  console.log('\n6) sozinho');
  Caio.limpa(); Caio.manda({type:'grupo_denovo', sim:true});
  const s6 = Caio.ult('grupo_denovo_fim');
  confira(s6 && s6.sozinho === true, 'sem grupo: o servidor responde "sozinho" (o aparelho faz o JOGAR DE NOVO de sempre)', s6);

  console.log('\n7) quem cai durante a votação');
  r = partida(); acaba(r);
  Ana.limpa();
  Ana.manda({type:'grupo_denovo', sim:true});
  Beto.ws.close();
  await espera(60);
  const l7 = Ana.ult('grupo_denovo_fim');
  confira(!G.denovo && l7 && /Beto caiu/.test(l7.motivo) && !t.salaDe(Ana.c) && Ana.ult('left'), 'o Beto caiu: a Ana volta para o lobby ("' + (l7 && l7.motivo) + '")', l7);

  console.log('\n' + ok + ' ok, ' + falhou + ' falharam');
  try { t.fecha(); } catch (_) {}
  process.exit(falhou ? 1 : 0);
}
principal().catch(e => { console.error(e); process.exit(1); });
