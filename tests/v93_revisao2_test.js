'use strict';
/* v93 · as correções da segunda revisão (Fases 4 e 5), no servidor (na memória, com o fechar da conexão como o do ws de verdade):
   1. quem reconecta (outra aba, a internet que voltou) no meio da busca do grupo: a busca para para todos — e a conexão nova
      fica sabendo (antes o grupo seguia procurando sem ele e a partida começava sem ele);
   2. o convite: ninguém do grupo pode ter bloqueio com quem é chamado; o convite de quem saiu do grupo não vale mais; aceitar
      confere de novo a amizade e os bloqueios;
   3. quem saiu do grupo enquanto estava fora pergunta o grupo quando volta (grupo_estado) e recebe "sem grupo";
   4. a busca sozinho de quem já estava no grupo para quando o grupo nasce de verdade (o líder procura com todos);
   5. o Dono zerou as contas: as apagadas saem dos grupos na hora (o número reaproveitado não herda o grupo);
   6. o ritmo das falas é da pessoa na sala: reconectar não zera.
   Rodar: node tests/v93_revisao2_test.js   (sem dependências) */
const path = require('path');
const EventEmitter = require('events');
const RAIZ = path.resolve(__dirname, '..');
process.env.RACHA_CONTAGEM_MS = '0'; process.env.RACHA_REPLAY = '0';
process.env.RACHA_GRUPO_LIDER_MS = '250'; process.env.RACHA_GRUPO_FORA_MS = '700';
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
  close(){ if (this.readyState >= 2) return; this.readyState = 2; setTimeout(() => { this.readyState = 3; this.emit('close'); }, 120); }
  terminate(){ this.readyState = 3; this.emit('close'); }
  ping(){}
}
const SEG = 'segredo-da-revisao-2-1234567890';
const P6 = n => String(n).padStart(6, '0');
let relogio = 1.77e12;
const nova = o => new Turma(Object.assign({log:() => {}, agora:() => relogio, p2p:false, segredo:SEG}, o || {}));
const bilhete = (p, n, extra) => assina(SEG, Object.assign({p:String(p), n, t:Date.now(), e:Date.now() + 30*60e3}, extra || {}));
const amigos = l => ({a:l.map(P6)});
function conta(t, p, n, extra){
  const ws = new WsFalso();
  const c = t.conecta(ws, {headers:{}, socket:{remoteAddress:'10.0.3.' + (p % 250)}});
  const k = {ws, c, id:'c' + p, pub:P6(p), nome:n,
    manda: m => ws.emit('message', JSON.stringify(m)),
    ult: (tipo, f) => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === tipo && (!f || f(ws.caixa[i]))) return ws.caixa[i]; return null; },
    todas: (tipo, f) => ws.caixa.filter(x => x.type === tipo && (!f || f(x))),
    limpa: () => { ws.caixa.length = 0; }};
  k.manda({type:'hello', name:n, skin:'T.AAAAxxxx', flag:'BR', v93:1, conta:bilhete(p, n, extra)});
  return k;
}
const grupo = k => { const m = k.ult('grupo'); return m ? m.g : undefined; };
const nomes = g => g ? g.membros.map(m => m.nome + (m.lider ? '*' : '')).join(' ') : String(g);
const espera = ms => new Promise(r => setTimeout(r, ms));
function junta(t, lider, membros){                        // o líder chama cada um e cada um aceita
  lider.manda({type:'grupo_cria', n:2, pts:500});
  for (const k of membros){
    lider.c.baldes.grupo93c = null;
    lider.manda({type:'grupo_convida', para:k.pub});
    const cv = k.ult('grupo_convite'); if (!cv) throw new Error('sem convite para ' + k.nome + ': ' + JSON.stringify(lider.ult('grupo_erro')));
    k.manda({type:'grupo_resposta', id:cv.id, aceita:true, pts:500});
  }
}

async function principal(){
  console.log('\n1) quem reconecta no meio da busca do grupo');
  {
    const t = nova();
    const Ana = conta(t, 201, 'Ana', amigos([202])), Beto = conta(t, 202, 'Beto', amigos([201]));
    junta(t, Ana, [Beto]);
    Beto.manda({type:'grupo_pronto', on:true});           // (v95: quem não é o líder toca em PRONTO antes do JOGAR do líder)
    Ana.manda({type:'fila', n:2, pts:500});
    const G = t.g93De(Ana.id);
    confira(!!G.busca && t.filaEsp.size === 2, 'a busca do grupo começa (os dois na fila)', t.filaEsp.size);
    const Beto2 = conta(t, 202, 'Beto', amigos([201]));   // (o Beto abre o jogo de novo: a conexão nova fica, a velha fecha)
    await espera(250);
    const avisoB2 = Beto2.ult('fila', x => x.on === false && x.grupo), avisoA = Ana.ult('fila', x => x.on === false && x.grupo);
    confira(!G.busca && t.filaEsp.size === 0 && avisoB2 && avisoA, 'a busca para para todos (a Ana e a conexão nova do Beto ficam sabendo)', [JSON.stringify(G.busca), t.filaEsp.size, !!avisoB2, !!avisoA]);
    const Gil = conta(t, 209, 'Gil', amigos([])), Iza = conta(t, 210, 'Iza', amigos([]));
    Gil.manda({type:'fila', n:2, pts:500}); Iza.manda({type:'fila', n:2, pts:500});
    relogio += 8500; t.filaTenta();
    confira(!t.salaDe(Ana.c), '   e nenhuma partida começa com o grupo pela metade', t.salaDe(Ana.c) && t.salaDe(Ana.c).roster);
    Ana.c.baldes.fila = null; Ana.manda({type:'fila', n:2, pts:500});
    confira(!!G.busca && t.filaEsp.get(Beto2.id) && t.filaEsp.get(Beto2.id).c === Beto2.c, 'o líder procura de novo: o grupo inteiro volta para a fila (com a conexão nova do Beto)', t.filaEsp.size);
    try { t.fecha(); } catch (_) {}
  }

  console.log('\n2) os convites');
  {
    const t = nova();
    const Ana = conta(t, 201, 'Ana', Object.assign(amigos([202]), {b:[P6(205)]}));   // (a Ana bloqueou o Xavi)
    const Beto = conta(t, 202, 'Beto', amigos([201, 205])), Xavi = conta(t, 205, 'Xavi', amigos([202]));
    junta(t, Ana, [Beto]);
    Beto.c.baldes.grupo93c = null; Beto.manda({type:'grupo_convida', para:Xavi.pub});
    confira(!Xavi.ult('grupo_convite') && /Não dá para chamar/.test((Beto.ult('grupo_erro') || {}).motivo || ''), 'o Beto não chama para o grupo quem a líder bloqueou', Beto.ult('grupo_erro'));
    // o convite de quem saiu do grupo
    const t2 = nova();
    const A = conta(t2, 301, 'A', amigos([302])), B = conta(t2, 302, 'B', amigos([301, 305])), X = conta(t2, 305, 'X', amigos([302]));
    junta(t2, A, [B]);
    B.c.baldes.grupo93c = null; B.manda({type:'grupo_convida', para:X.pub});
    const cv = X.ult('grupo_convite');
    A.manda({type:'grupo_expulsa', id:B.id});
    X.manda({type:'grupo_resposta', id:cv && cv.id, aceita:true, pts:500});
    const GA = t2.g93De(A.id);
    confira(cv && !t2.g93De(X.id) && GA && GA.membros.map(m => m.nome).join(' ') === 'A', 'o B sai do grupo: o convite que ele mandou não vale mais', X.ult('grupo_erro'));
    // aceitar confere de novo (a líder bloqueou depois de chamar)
    const t3 = nova();
    const L = conta(t3, 401, 'L', amigos([402])), M = conta(t3, 402, 'M', amigos([401]));
    L.manda({type:'grupo_convida', para:M.pub});
    const cv3 = M.ult('grupo_convite');
    t3.atualizaRelacoes(L.pub, {amigos:[], bloqueios:[M.pub]});
    M.manda({type:'grupo_resposta', id:cv3 && cv3.id, aceita:true, pts:500});
    confira(cv3 && !t3.g93De(M.id), 'a L bloqueou o M depois de chamar: o ACEITAR dele é recusado', M.ult('grupo_erro'));
    try { t.fecha(); t2.fecha(); t3.fecha(); } catch (_) {}
  }

  console.log('\n3) quem saiu do grupo enquanto estava fora');
  {
    const t = nova();
    const Ana = conta(t, 201, 'Ana', amigos([202])), Beto = conta(t, 202, 'Beto', amigos([201]));
    junta(t, Ana, [Beto]);
    Beto.ws.close();
    await espera(150);
    Ana.manda({type:'grupo_expulsa', id:Beto.id});        // (a líder tira o Beto enquanto ele está fora)
    const Beto2 = conta(t, 202, 'Beto', amigos([201]));
    Beto2.manda({type:'grupo_estado'});                  // (o aparelho dele ainda achava que estava no grupo: pergunta ao voltar)
    const g = Beto2.ult('grupo');
    confira(g && g.g === null, 'ele volta e pergunta: o servidor responde "sem grupo" (o aparelho limpa o grupo velho)', g);
    try { t.fecha(); } catch (_) {}
  }

  console.log('\n4) a busca sozinho quando o grupo nasce');
  {
    const t = nova();
    const Ana = conta(t, 201, 'Ana', amigos([202])), Beto = conta(t, 202, 'Beto', amigos([201]));
    Ana.manda({type:'grupo_convida', para:Beto.pub});    // (o grupo de 1 com o convite pendente)
    Ana.manda({type:'fila', n:2, pts:500});              // (sozinha: a fila de sempre)
    const antes = !!t.filaEsp.get(Ana.id);
    Beto.manda({type:'grupo_resposta', id:Beto.ult('grupo_convite').id, aceita:true, pts:500});
    confira(antes && !t.filaEsp.get(Ana.id) && Ana.ult('fila', x => x.on === false) && /grupo/.test((Ana.ult('grupo_aviso') || {}).txt || ''),
      'o Beto entra: a busca sozinho da Ana para (agora ela procura com o grupo)', [antes, !!t.filaEsp.get(Ana.id)]);
    try { t.fecha(); } catch (_) {}
  }

  console.log('\n5) o Dono zerou as contas');
  {
    const t = nova();
    const Dono = conta(t, 1, 'Dono', amigos([502])), Ze = conta(t, 502, 'Ze', amigos([1]));
    junta(t, Ze, [Dono]);
    t.v88ZeraContas([1], Date.now() - 1000);
    const G = t.g93De('c1');
    confira(!t.g93De('c502') && G && G.lider === 'c1' && G.membros.length === 1, 'a conta apagada sai do grupo na hora (o Dono fica sozinho, líder)', G && G.membros.map(m => m.id));
    const Novo = conta(t, 502, 'Novo', amigos([]));
    await espera(50);
    confira(!t.g93De(Novo.id) && !(grupo(Novo)), '   a conta nova com o mesmo número não herda o grupo', grupo(Novo));
    try { t.fecha(); } catch (_) {}
  }

  console.log('\n6) o ritmo das falas');
  {
    const t = nova({agora:() => Date.now()});
    const Ana = conta(t, 301, 'Ana'), Beto = conta(t, 302, 'Beto');
    Ana.manda({type:'create', n:1, map:4, jogo:'futebol', tempo:0, bots:true, pub:false, name:'Falas'});
    const code = Ana.ult('room').room.code;
    Beto.manda({type:'join', code, slot:1});
    Ana.manda({type:'start'}); const r = t.salas.get(code); r.partida && r.partida.desligar();
    Beto.limpa();
    for (let i = 0; i < 6; i++) Ana.manda({type:'fala', i:1});
    for (let k = 0; k < 4; k++){ const A2 = conta(t, 301, 'Ana'); for (let i = 0; i < 3; i++) A2.manda({type:'fala', i:2}); }
    const n = Beto.todas('fala').length;
    confira(n <= 3, 'reconectar 4 vezes no meio não zera o ritmo: no máximo 3 falas de uma vez (chegaram ' + n + ')', n);
    try { t.fecha(); } catch (_) {}
  }

  console.log('\n' + ok + ' ok, ' + falhou + ' falharam');
  process.exit(falhou ? 1 : 0);
}
principal().catch(e => { console.error(e); process.exit(1); });
