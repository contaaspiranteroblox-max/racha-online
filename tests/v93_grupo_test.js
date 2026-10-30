'use strict';
/* v93 · Fase 4 — O GRUPO COM LÍDER no servidor da turma (server/grupo93.js), na memória, com contas de verdade (o bilhete):
   criar, convidar (só amigos dos dois lados, sem bloqueio, quem recebe convites), aceitar/recusar, o limite de 4, sair,
   expulsar, passar a liderança, o status de cada um (disponível, ocupado, procurando, em partida, offline), a busca do
   líder (só ele; o grupo cabe no time; todos no MESMO time; com outros na fila e com os bots completando), cancelar (para
   todos), o líder que cai (a coroa passa), quem cai e volta, e o grupo que continua depois da partida.
   Rodar: node tests/v93_grupo_test.js   (sem dependências) */
const path = require('path');
const EventEmitter = require('events');
const RAIZ = path.resolve(__dirname, '..');
process.env.RACHA_CONTAGEM_MS = '0'; process.env.RACHA_REPLAY = '0';
process.env.RACHA_GRUPO_LIDER_MS = '250'; process.env.RACHA_GRUPO_FORA_MS = '700';   // (os tempos de queda, encurtados para o teste)
const {Turma, FILA_MISTA_MS} = require(path.join(RAIZ, 'server', 'turma'));
const {assina} = require(path.join(RAIZ, 'server', 'banco'));

let ok = 0, falhou = 0;
function confira(cond, txt, extra){
  if (cond){ ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU ' + txt + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 400) : '')); }
}
const espera = ms => new Promise(r => setTimeout(r, ms));
class WsFalso extends EventEmitter {
  constructor(){ super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; this.vivo = true; }
  send(t){ if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
  close(){ if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate(){ this.close(); }
  ping(){}
}
const SEG = 'segredo-v93-grupo';
let relogio = 1.77e12;
const P6 = n => String(n).padStart(6, '0');
function cliente(t){
  const ws = new WsFalso();
  const c = t.conecta(ws, {headers:{}, socket:{remoteAddress:'10.0.0.' + Math.floor(Math.random()*250)}});
  return {ws, c,
    manda: m => ws.emit('message', JSON.stringify(m)),
    ult: (tipo, f) => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === tipo && (!f || f(ws.caixa[i]))) return ws.caixa[i]; return null; },
    todas: (tipo, f) => ws.caixa.filter(x => x.type === tipo && (!f || f(x))),
    limpa: () => { ws.caixa.length = 0; }};
}
function bilhete(p, n, extra){ return assina(SEG, Object.assign({p:String(p), n, t:Date.now(), e:Date.now() + 30*60e3}, extra || {})); }
function conta(t, p, n, extra){ const k = cliente(t); k.manda({type:'hello', name:n, skin:'T.AAAA' + n.toLowerCase().padEnd(4, 'x'), flag:'BR', conta:bilhete(p, n, extra)}); k.id = 'c' + p; k.pub = P6(p); k.nome = n; k.extra = extra; return k; }
const grupo = k => { const m = k.ult('grupo'); return m ? m.g : undefined; };
const nomes = g => g ? g.membros.map(m => m.nome + (m.lider ? '*' : '') + ':' + m.st).join(' ') : String(g);

async function principal(){
  const t = new Turma({log:() => {}, agora:() => relogio, p2p:false, segredo:SEG});
  const amigos = l => ({a:l.map(P6)});
  console.log('\n1) criar e convidar (só amigos, sem bloqueio, quem recebe convites)');
  const Ana = conta(t, 201, 'Ana', Object.assign(amigos([202, 203, 204, 205, 207, 208]), {b:[P6(206)]}));
  const Beto = conta(t, 202, 'Beto', amigos([201])), Caio = conta(t, 203, 'Caio', amigos([201])), Duda = conta(t, 204, 'Duda', amigos([201]));
  const Edu = conta(t, 205, 'Edu', amigos([])), Fabi = conta(t, 206, 'Fabi', amigos([201])), Gabi = conta(t, 207, 'Gabi', Object.assign(amigos([201]), {c:0}));
  const Hugo = conta(t, 208, 'Hugo', amigos([201]));
  Ana.manda({type:'grupo_cria', n:2, pts:500});
  let g = grupo(Ana);
  confira(g && g.lider === Ana.id && g.membros.length === 1 && g.membros[0].st === 'disponivel' && g.max === 4, 'CRIAR GRUPO: a Ana é a líder (coroa), disponível, até 4 pessoas', g);
  const erroDe = (para) => { Ana.limpa(); Ana.manda({type:'grupo_convida', para}); const e = Ana.ult('grupo_erro'); return e ? e.motivo : ''; };
  confira(/Só dá para chamar amigos/.test(erroDe(P6(205))), 'o Edu não confirmou a amizade: não dá para chamar');
  confira(/Só dá para chamar amigos/.test(erroDe(P6(206))), 'a Fabi está bloqueada: não dá para chamar');
  confira(/não está recebendo convites/.test(erroDe(P6(207))), 'a Gabi desligou os convites: o aviso certo');
  confira(/não está online/.test(erroDe(P6(299))), 'quem não está online: o aviso certo');
  Ana.limpa(); Ana.manda({type:'grupo_convida', para:Beto.pub});
  const cv = Beto.ult('grupo_convite');
  confira(cv && cv.de.nome === 'Ana' && cv.expira === 60000 && Ana.ult('grupo_aviso') && grupo(Ana).convites.length === 1, 'o Beto recebe o convite (vale 60 s); a Ana vê o convite pendente no grupo', cv);
  Beto.manda({type:'grupo_resposta', id:cv.id, aceita:false});
  confira(/recusou/.test((Ana.ult('grupo_aviso') || {}).txt || '') && grupo(Ana).membros.length === 1, 'RECUSAR: a Ana fica sabendo e o grupo continua só com ela');
  await espera(2100);                                      // (o ritmo dos convites: um a cada 2 s)
  Ana.manda({type:'grupo_convida', para:Beto.pub});
  Beto.manda({type:'grupo_resposta', id:Beto.ult('grupo_convite').id, aceita:true, pts:520});
  g = grupo(Beto);
  confira(g && g.membros.length === 2 && grupo(Ana).membros.length === 2 && nomes(g) === 'Ana*:disponivel Beto:disponivel', 'ACEITAR: o Beto entra; os dois veem o grupo com a coroa na Ana (' + nomes(g) + ')', g);
  for (const [k, pts] of [[Caio, 480], [Duda, 510]]){ await espera(2100); Ana.manda({type:'grupo_convida', para:k.pub}); k.manda({type:'grupo_resposta', id:k.ult('grupo_convite').id, aceita:true, pts}); }
  confira(grupo(Ana).membros.length === 4, 'com o Caio e a Duda: 4 no grupo', nomes(grupo(Ana)));
  await espera(2100);
  confira(/cheio/.test(erroDe(Hugo.pub)), 'o 5º não cabe: "O grupo está cheio"');

  console.log('\n2) sair, expulsar, passar a liderança');
  Duda.manda({type:'grupo_sai'});
  confira(grupo(Duda) === null && grupo(Ana).membros.length === 3 && /Duda saiu/.test((Ana.ult('grupo_aviso') || {}).txt || ''), 'SAIR: a Duda sai (os outros ficam sabendo)', nomes(grupo(Ana)));
  Beto.limpa(); Beto.manda({type:'grupo_expulsa', id:Caio.id});
  confira(/Só o líder/.test((Beto.ult('grupo_erro') || {}).motivo || '') && grupo(Ana).membros.length === 3, 'quem não é o líder não tira ninguém');
  Ana.manda({type:'grupo_expulsa', id:Caio.id});
  const gc = Caio.ult('grupo');
  confira(gc && gc.g === null && gc.motivo === 'expulso' && grupo(Ana).membros.length === 2, 'EXPULSAR: a líder tira o Caio (ele fica sabendo)', gc);
  Ana.manda({type:'grupo_lider', id:Beto.id});
  confira(grupo(Ana).lider === Beto.id && nomes(grupo(Beto)) === 'Ana:disponivel Beto*:disponivel', 'PASSAR A LIDERANÇA: o Beto ganha a coroa', nomes(grupo(Beto)));

  console.log('\n3) o status de cada um (de verdade)');
  Ana.manda({type:'create', n:2, map:4, jogo:'futebol', tempo:0, bots:true, pub:false, name:'Sala da Ana'});
  await espera(250);
  confira(/Ana:ocupado/.test(nomes(grupo(Beto))), 'a Ana numa sala: OCUPADO para o Beto', nomes(grupo(Beto)));
  Ana.manda({type:'leave'}); await espera(250);
  confira(/Ana:disponivel/.test(nomes(grupo(Beto))), 'saiu da sala: DISPONÍVEL de novo', nomes(grupo(Beto)));

  console.log('\n4) a busca do grupo (a ranqueada): só o líder, o grupo cabe no time, todos no mesmo time');
  Ana.limpa(); Ana.manda({type:'fila', n:2, pts:500});
  const ea = Ana.ult('error');
  confira(ea && ea.codigo === 'fila_grupo' && /líder do grupo \(Beto\)/.test(ea.message) && !t.filaEsp.has(Ana.id), 'a Ana (não é a líder) toca em JOGAR: "Quem procura a partida é o líder do grupo (Beto)."', ea);
  Beto.limpa(); Beto.manda({type:'fila', n:1, pts:520});
  const eb = Beto.ult('error');
  confira(eb && eb.codigo === 'fila_grupo' && /escolha 2 VS 2/.test(eb.message), 'o líder escolhe 1 VS 1 com 2 no grupo: "O grupo tem 2 pessoas: escolha 2 VS 2 ou maior."', eb);
  await espera(2100);
  Ana.manda({type:'grupo_pronto', on:true});              // (v95: quem não é o líder toca em PRONTO antes do JOGAR do líder)
  Ana.limpa(); Beto.limpa(); Beto.manda({type:'fila', n:2, pts:520});
  const fa = Ana.ult('fila'), fb = Beto.ult('fila');
  confira(fa && fa.on && fa.grupo && fb && fb.on && fb.lider === true && fa.lider === false && t.filaEsp.get(Ana.id) && t.filaEsp.get(Ana.id).grp, 'o líder procura 2 VS 2: os dois entram na fila juntos (a busca abre no aparelho da Ana também)', [fa, fb]);
  await espera(250);
  confira(nomes(grupo(Ana)) === 'Ana:buscando Beto*:buscando', '   os dois aparecem PROCURANDO', nomes(grupo(Ana)));
  Ana.manda({type:'fila_sai'});
  const fs = Beto.ult('fila', x => x.on === false);
  confira(fs && /Ana cancelou/.test(fs.motivo || '') && !t.filaEsp.has(Beto.id) && !t.filaEsp.has(Ana.id), 'qualquer um cancela: a busca para para os dois ("Ana cancelou a busca.")', fs);
  // com mais dois sozinhos na fila: a partida cheia, o grupo no mesmo time
  await espera(2100);
  const Gil = conta(t, 209, 'Gil', amigos([])), Iza = conta(t, 210, 'Iza', amigos([]));
  Ana.manda({type:'grupo_pronto', on:true});              // (v95: quem cancelou deixou de estar pronto)
  Beto.manda({type:'fila', n:2, pts:520});
  Gil.manda({type:'fila', n:2, pts:900}); Iza.manda({type:'fila', n:2, pts:100});
  const r = t.salaDe(Ana.c);
  const tA = r ? Math.floor(r.roster.indexOf(Ana.id)/2) : -1, tB = r ? Math.floor(r.roster.indexOf(Beto.id)/2) : -2;
  confira(r && r.ranked && r.state === 'playing' && r.roster.every(Boolean) && tA === tB && Math.floor(r.roster.indexOf(Gil.id)/2) !== tA, 'com o Gil e a Iza na fila: a ranqueada 2 VS 2 começa — Ana e Beto no MESMO time, os dois sozinhos no outro', r && r.roster);
  await espera(250);
  confira(nomes(grupo(Ana)) === 'Ana:partida Beto*:partida', '   no grupo: EM PARTIDA', nomes(grupo(Ana)));
  // o fim: o grupo continua; v95: o JOGAR DE NOVO do grupo (os dois tocam) e a busca recomeça com quem estava na tela do fim
  r.partida.onFim({placar:[3, 1], vencedor:0, duracao:60, jogo:'futebol'});
  confira(r.state !== 'playing' && grupo(Ana) && grupo(Ana).membros.length === 2, 'a partida acabou: o grupo continua (os dois)', nomes(grupo(Ana)));
  await espera(2100);
  Ana.limpa(); Ana.manda({type:'grupo_denovo', sim:true}); Beto.manda({type:'grupo_denovo', sim:true});
  confira(Ana.ult('left') && !t.salaDe(Ana.c) && t.filaEsp.get(Ana.id) && t.filaEsp.get(Ana.id).grp, 'os dois tocam em JOGAR DE NOVO: a Ana, ainda na tela do fim da ranqueada, sai junto e entra na busca', !!Ana.ult('left'));
  // sozinhos na fila: depois de 8 s os bots completam (o grupo junto num time)
  relogio += FILA_MISTA_MS + 500; t.filaTenta();
  const r2 = t.salaDe(Ana.c);
  confira(r2 && r2.ranked && r2.state === 'playing' && Math.floor(r2.roster.indexOf(Ana.id)/2) === Math.floor(r2.roster.indexOf(Beto.id)/2) && r2.roster.filter(Boolean).length === 2,
    'só o grupo na fila: depois de 8 s a partida começa com os bots completando (o grupo no mesmo time)', r2 && r2.roster);
  r2.partida.onFim({placar:[1, 0], vencedor:0, duracao:60, jogo:'futebol'});
  Ana.manda({type:'leave'}); Beto.manda({type:'leave'});

  console.log('\n5) quem cai: o líder passa a coroa; quem volta continua no grupo');
  await espera(300);
  Beto.ws.close();
  await espera(120);
  confira(/Beto\*:offline/.test(nomes(grupo(Ana))), 'o Beto (líder) caiu: OFFLINE para a Ana', nomes(grupo(Ana)));
  await espera(400);
  confira(grupo(Ana).lider === Ana.id && /caiu: Ana agora é o líder/.test((Ana.ult('grupo_aviso') || {}).txt || ''), 'depois de um tempo, a coroa passa para a Ana', nomes(grupo(Ana)));
  const Beto2 = conta(t, 202, 'Beto', amigos([201]));
  await espera(100);
  confira(grupo(Beto2) && grupo(Beto2).membros.length === 2 && /Beto:disponivel/.test(nomes(grupo(Ana))), 'o Beto volta antes do limite: continua no grupo (sem a coroa)', nomes(grupo(Beto2)));
  Beto2.ws.close();
  await espera(900);
  confira(grupo(Ana) && grupo(Ana).membros.length === 1 && /saiu do grupo \(caiu\)/.test((Ana.ult('grupo_aviso') || {}).txt || ''), 'o Beto cai e não volta: sai do grupo (a Ana fica sabendo)', nomes(grupo(Ana)));

  console.log('\n' + ok + ' ok, ' + falhou + ' falharam');
  try { t.fecha(); } catch (_) {}
  process.exit(falhou ? 1 : 0);
}
principal().catch(e => { console.error(e); process.exit(1); });
