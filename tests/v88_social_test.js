'use strict';
/* v88 · o SOCIAL AO VIVO no servidor da turma (server/social88.js), na memória, com contas de verdade (o bilhete assinado):
   o status dos amigos (online, sala, procurando, em partida, offline, escondido), os convites (sala e time), o chat dos
   amigos, do clube e da equipe, o bloqueio (chat da sala, Chat do Brasil, históricos, convites, mensagens), a denúncia com
   motivo (que vai para a plataforma), o histórico sem o texto das escondidas, as relações que mudam (o bilhete novo e o
   aviso da plataforma), o selo com quem jogou (g) e o melhor da partida (v), o placar na lista (assistir) e o histórico do
   chat dos amigos gravado no arquivo.
   Rodar: node tests/v88_social_test.js   (sem dependências) */
const path = require('path');
const fs = require('fs');
const os = require('os');
const EventEmitter = require('events');
const RAIZ = path.resolve(__dirname, '..');
const {Turma} = require(path.join(RAIZ, 'server', 'turma'));
const {assina, confere} = require(path.join(RAIZ, 'server', 'banco'));

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
const SEG = 'segredo-v88-social';
let relogio = 1.75e12;
function cliente(t){
  const ws = new WsFalso();
  const c = t.conecta(ws, {headers:{}, socket:{remoteAddress:'10.0.0.' + Math.floor(Math.random()*250)}});
  return {ws, c,
    manda: m => ws.emit('message', JSON.stringify(m)),
    ult: (tipo, f) => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === tipo && (!f || f(ws.caixa[i]))) return ws.caixa[i]; return null; },
    todas: (tipo, f) => ws.caixa.filter(x => x.type === tipo && (!f || f(x))),
    limpa: () => { ws.caixa.length = 0; },
    sala: () => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === 'room') return ws.caixa[i].room; return null; }};
}
// o bilhete da conta (o que a plataforma assina: p, n, a = amigos, b = bloqueios, o:0 = escondido, c:0 = sem convites, k = clube, q = cosméticos)
function bilhete(p, n, extra){ return assina(SEG, Object.assign({p:String(p), n, e:Date.now() + 30*60e3}, extra || {})); }
function conta(t, p, n, extra){ const k = cliente(t); k.manda({type:'hello', name:n, skin:'T.AAAAxxxx', flag:'BR', conta:bilhete(p, n, extra)}); k.id = 'c' + p; k.pub = String(p).padStart(6, '0'); k.nome = n; return k; }

async function principal(){
  const denuncias = [];
  const t = new Turma({log:() => {}, agora:() => relogio, p2p:false, segredo:SEG, denuncia:async d => { denuncias.push(d); }});
  const P = n => String(n).padStart(6, '0');

  console.log('\n1) o status dos amigos (só entre amigos dos dois lados; o escondido aparece offline)');
  const Ana = conta(t, 101, 'Ana', {a:[P(102), P(103), P(106), P(107)], k:'p9', q:{banner:'banner_grafite', avatar:'av_10'}});
  confira(Ana.ult('hello') && Ana.ult('hello').conta, 'a Ana entra com a conta');
  const la = Ana.ult('amigos_status');
  confira(la && Array.isArray(la.lista) && la.lista.length === 0, 'logo ao entrar, a lista dos amigos online (ninguém ainda)', la);
  const Beto = conta(t, 102, 'Beto', {a:[P(101)], k:'p9'});
  const lb = Beto.ult('amigos_status');
  confira(lb && lb.lista.length === 1 && lb.lista[0].p === P(101) && lb.lista[0].st === 'online', 'o Beto entra e já vê a Ana online', lb);
  confira(Ana.ult('amigo_status', x => x.p === P(102) && x.st === 'online'), 'a Ana recebe na hora: Beto online');
  const Caio = conta(t, 103, 'Caio', {a:[P(101)], o:0});
  confira(!Ana.ult('amigo_status', x => x.p === P(103) && x.st !== 'offline'), 'o Caio escondeu o status: para a Ana ele continua offline');
  const lc = Caio.ult('amigos_status');
  confira(lc && lc.lista.some(x => x.p === P(101)) && lc.mostra === false, 'mas o Caio vê os amigos dele (e sabe que está escondido)', lc);
  const Edu = conta(t, 105, 'Edu', {a:[P(101)]});
  confira(!Ana.ult('amigo_status', x => x.p === P(105)) && Edu.ult('amigos_status').lista.length === 0, 'o Edu diz que é amigo da Ana, mas ela não confirma: ninguém vê ninguém', Edu.ult('amigos_status'));
  const Fabi = conta(t, 106, 'Fabi', {a:[P(101)], c:0});
  const Gabi = conta(t, 107, 'Gabi', {a:[P(101)]});
  const Duda = conta(t, 104, 'Duda', {b:[P(101)], k:'p9'});   // a Duda bloqueou a Ana

  console.log('\n2) o status muda: na sala, em partida, procurando, offline');
  Beto.manda({type:'create', n:2, map:4, jogo:'futebol', tempo:0, bots:true, pub:true, name:'Racha do Beto'});
  const code = Beto.sala().code;
  await espera(320);
  const sb = Ana.ult('amigo_status', x => x.p === P(102));
  confira(sb && sb.st === 'sala' && sb.sala && sb.sala.code === code && sb.sala.nome === 'Racha do Beto', 'Beto criou a sala: a Ana vê "na sala" (com o código, porque é aberta)', sb);
  Gabi.manda({type:'fila', n:1, pts:500});
  await espera(320);
  confira(Ana.ult('amigo_status', x => x.p === P(107) && x.st === 'buscando'), 'a Gabi foi procurar a ranqueada: "procurando partida"');
  Gabi.manda({type:'fila_sai'});
  await espera(320);
  confira(Ana.ult('amigo_status', x => x.p === P(107)).st === 'online', 'cancelou a busca: volta a "online"', Ana.ult('amigo_status', x => x.p === P(107)));
  const n0 = Ana.todas('amigo_status').length;
  Beto.manda({type:'ready', on:true}); Beto.manda({type:'ready', on:false}); Beto.manda({type:'config', name:'Racha do Beto'});
  await espera(320);
  confira(Ana.todas('amigo_status').length === n0, 'mexer no "pronto" e na configuração não manda status repetido para os amigos', Ana.todas('amigo_status').length - n0);

  console.log('\n3) os convites (sala e time; só amigos online que aceitam convites)');
  Beto.manda({type:'convite', para:P(101), tipo:'sala'});
  const cr = Ana.ult('convite_recebido');
  confira(cr && cr.de.p === P(102) && cr.de.nome === 'Beto' && cr.sala.code === code && cr.tipo === 'sala', 'a Ana recebe o convite do Beto na hora (quem chamou e a sala)', cr);
  confira(Beto.ult('convite_enviado') && Beto.ult('convite_enviado').para === P(101), 'o Beto vê que o convite foi');
  Beto.manda({type:'convite', para:P(103)}); const e1 = Beto.ult('convite_erro');
  confira(e1 && /online/.test(e1.motivo), 'convidar quem está escondido: "não está online" (o status não vaza)', e1);
  Beto.manda({type:'convite', para:P(105)}); const e2 = Beto.ult('convite_erro');
  confira(e2 && /amigos/.test(e2.motivo), 'convidar quem não é amigo: não pode', e2);
  Ana.manda({type:'convite_resposta', id:cr.id, aceita:true});
  confira(Ana.c.sala === code && Ana.sala() && Ana.sala().members.some(x => x.id === Ana.id), 'a Ana aceitou: entrou na sala do Beto', Ana.sala());
  confira(Beto.ult('convite_resultado') && Beto.ult('convite_resultado').aceita === true && Beto.ult('convite_resultado').nome === 'Ana', 'o Beto fica sabendo que ela aceitou');
  Ana.manda({type:'convite_resposta', id:cr.id, aceita:true});
  confira(Ana.ult('convite_erro') && /não vale/.test(Ana.ult('convite_erro').motivo), 'o mesmo convite não vale duas vezes');
  Ana.manda({type:'convite', para:P(106), tipo:'sala'});
  confira(/convites/.test((Ana.ult('convite_erro') || {}).motivo || ''), 'a Fabi desligou os convites: ninguém consegue chamar', Ana.ult('convite_erro'));
  const timeAna = Math.floor(Ana.sala().members.find(x => x.id === Ana.id).slot / 2);
  Ana.manda({type:'convite', para:P(107), tipo:'equipe'});
  const cg = Gabi.ult('convite_recebido');
  confira(cg && cg.tipo === 'equipe' && cg.time === timeAna, 'a Ana chama a Gabi para o time DELA', cg);
  Gabi.manda({type:'convite_resposta', id:cg.id, aceita:true});
  const mg = Gabi.sala() && Gabi.sala().members.find(x => x.id === Gabi.id);
  confira(mg && mg.slot >= 0 && Math.floor(mg.slot / 2) === timeAna, 'a Gabi entrou no mesmo time da Ana', mg);
  const mAna = Ana.sala().members.find(x => x.id === Ana.id);
  confira(mAna && mAna.cos && mAna.cos.banner === 'banner_grafite' && mAna.cos.avatar === 'av_10', 'no cartão da sala vão os cosméticos da conta (só visual; vêm assinados)', mAna && mAna.cos);

  console.log('\n4) o chat dos amigos (mensagem direta)');
  Ana.manda({type:'dm', para:P(102), texto:'bora jogar mais uma?'});
  const dmB = Beto.ult('dm'), dmA = Ana.ult('dm');
  confira(dmB && dmB.de === P(101) && dmB.texto === 'bora jogar mais uma?' && dmA && dmA.mid === dmB.mid, 'a Ana manda para o Beto: os dois recebem (com o mesmo número)', dmB);
  Ana.manda({type:'dm', para:P(102), texto:'bora jogar mais uma?'});
  confira((Ana.ult('dm_erro') || {}).reason === 'repetida', 'a mesma mensagem logo em seguida não vai (anti-spam)', Ana.ult('dm_erro'));
  relogio += 0; await espera(1100);
  Ana.manda({type:'dm', para:P(102), texto:'me chama no 11 91234-5678'});
  confira((Ana.ult('dm_erro') || {}).reason === 'filtro', 'telefone (dado pessoal) é barrado pelo filtro', Ana.ult('dm_erro'));
  await espera(1100);
  Ana.manda({type:'dm', para:P(102), texto:'seu otario'});
  confira((Ana.ult('dm_erro') || {}).reason === 'filtro', 'ofensa é barrada pelo filtro', Ana.ult('dm_erro'));
  Ana.manda({type:'dm', para:P(105), texto:'oi'});
  confira((Ana.ult('dm_erro') || {}).reason === 'amigo', 'só para amigos (o Edu não é amigo da Ana)', Ana.ult('dm_erro'));
  Beto.manda({type:'dm_hist', com:P(101)});
  const hb = Beto.ult('dm_hist');
  confira(hb && hb.lista.length === 1 && hb.lista[0].texto === 'bora jogar mais uma?', 'o histórico da conversa (só o que passou)', hb);

  console.log('\n5) o chat da sala: a equipe e o bloqueio');
  Duda.manda({type:'join', code, spectate:true});
  confira(Duda.c.sala === code, 'a Duda (que bloqueou a Ana) entra para assistir');
  Beto.limpa(); Duda.limpa(); Gabi.limpa(); Ana.limpa();
  await espera(1100);
  Ana.manda({type:'say', text:'boa tarde, galera'});
  confira(Beto.ult('say', x => x.text === 'boa tarde, galera') && !Duda.ult('say', x => x.text === 'boa tarde, galera'), 'a fala da Ana chega ao Beto, mas não à Duda (bloqueio)');
  Duda.manda({type:'say', text:'oi pessoal'});
  confira(Beto.ult('say', x => x.text === 'oi pessoal') && !Ana.ult('say', x => x.text === 'oi pessoal'), 'e a fala da Duda não chega à Ana (o bloqueio vale dos dois lados)');
  await espera(1100);
  Ana.manda({type:'say', text:'vamos fechar o meio', canal:'equipe'});
  const eq = Gabi.ult('say', x => x.text === 'vamos fechar o meio');
  const timeBeto = t.v88TimeDe(t.salaDe(Beto.c), Beto.id);
  confira(eq && eq.canal === 'equipe' && eq.equipe === timeAna, 'o chat da EQUIPE chega à Gabi (mesmo time)', eq);
  confira(timeBeto === timeAna ? !!Beto.ult('say', x => x.text === 'vamos fechar o meio') : !Beto.ult('say', x => x.text === 'vamos fechar o meio'), 'e não chega ao time adversário', {timeBeto, timeAna});
  confira(!Duda.ult('say', x => x.text === 'vamos fechar o meio'), 'quem só assiste não vê o chat da equipe');
  Duda.manda({type:'say', text:'eu também', canal:'equipe'});
  confira(Duda.ult('error') && Duda.ult('error').codigo === 'sem_time', 'quem assiste não tem equipe para falar', Duda.ult('error'));
  const Hugo = conta(t, 108, 'Hugo', {});
  Hugo.manda({type:'join', code, spectate:true});
  const hh = Hugo.ult('sayHistory');
  confira(hh && hh.list.some(x => x.text === 'boa tarde, galera') && !hh.list.some(x => x.text === 'vamos fechar o meio'), 'quem chega vê o histórico da sala, mas não o chat da equipe dos outros', hh && hh.list.map(x => x.text));
  Duda.manda({type:'leave'}); Duda.limpa(); Duda.manda({type:'join', code, spectate:true});
  const hd = Duda.ult('sayHistory');
  confira(hd && !hd.list.some(x => x.id === Ana.id && !x.sys), 'no histórico que a Duda recebe não vem nada que a Ana escreveu', hd && hd.list.map(x => x.text));

  console.log('\n6) a denúncia com motivo (vai para a plataforma) e a mensagem escondida');
  const dm = Beto.ult('say', x => x.text === 'oi pessoal');
  Beto.manda({type:'report', mid:dm.mid, motivo:'toxico'});
  await espera(20);
  const d1 = denuncias.find(x => x.mid === dm.mid);
  confira(d1 && d1.autor === P(102) && d1.alvo === P(104) && d1.motivo === 'toxico' && d1.canal === 'sala' && d1.sala === code && d1.texto === 'oi pessoal', 'a denúncia do Beto vai para a plataforma: quem, contra quem, o motivo, o texto e a sala', d1);
  confira(Beto.ult('denuncia_ok', x => x.mid === dm.mid), 'o Beto recebe a confirmação');
  Beto.manda({type:'report', mid:dm.mid, motivo:'toxico'});
  await espera(20);
  confira(denuncias.filter(x => x.mid === dm.mid).length === 1, 'denunciar de novo a mesma mensagem não manda outra denúncia');
  Hugo.manda({type:'chat_denuncia', canal:'sala', mid:dm.mid, motivo:'spam'});
  await espera(20);
  confira(Beto.ult('say_hide', x => x.mid === dm.mid), 'duas pessoas denunciaram: a mensagem some para todos (como antes)');
  const Ivo = conta(t, 109, 'Ivo', {});
  Ivo.manda({type:'join', code, spectate:true});
  const hi = Ivo.ult('sayHistory'), esc = hi && hi.list.find(x => x.mid === dm.mid);
  confira(esc && esc.escondida && esc.text === '', 'quem chega depois recebe a mensagem escondida SEM o texto', esc);

  console.log('\n7) o chat do clube');
  Ana.manda({type:'clube_say', texto:'treino do clube às 20h'});
  const kb = Beto.ult('clube_msg');
  confira(kb && kb.clube === 'p9' && kb.texto === 'treino do clube às 20h' && kb.de === P(101), 'a Ana fala no clube: o Beto (mesmo clube) recebe', kb);
  confira(!Duda.ult('clube_msg', x => x.texto === 'treino do clube às 20h'), 'a Duda é do mesmo clube, mas bloqueou a Ana: não recebe');
  confira(!Hugo.ult('clube_msg'), 'quem é de fora do clube não recebe');
  Hugo.manda({type:'clube_say', texto:'oi'});
  confira((Hugo.ult('clube_erro') || {}).reason === 'sem_clube', 'sem clube não tem chat do clube', Hugo.ult('clube_erro'));
  Duda.manda({type:'clube_hist'});
  confira(Duda.ult('clube_hist') && Duda.ult('clube_hist').lista.length === 0, 'e o histórico do clube que a Duda recebe também não traz a Ana', Duda.ult('clube_hist'));
  Beto.manda({type:'clube_hist'});
  confira(Beto.ult('clube_hist').lista.length === 1, 'o histórico do clube para o Beto', Beto.ult('clube_hist'));
  Beto.manda({type:'chat_denuncia', canal:'clube', mid:kb.mid, motivo:'spam'});
  await espera(20);
  confira(denuncias.some(x => x.canal === 'clube' && x.alvo === P(101) && x.motivo === 'spam'), 'a denúncia de uma mensagem do clube também vai para a plataforma');

  console.log('\n8) as relações que mudam: o bilhete novo (separado da plataforma) e o aviso da plataforma (montada)');
  Beto.limpa();
  Ana.manda({type:'relacoes', conta:bilhete(101, 'Ana', {a:[P(103), P(106), P(107)], k:'p9'})});   // a Ana desfez a amizade com o Beto
  confira(Ana.ult('relacoes_ok') && Ana.ult('relacoes_ok').ok, 'o bilhete novo da Ana vale');
  confira(Beto.ult('amigo_status', x => x.p === P(101) && x.st === 'offline'), 'o Beto deixa de ver a Ana (offline) na hora');
  await espera(1100);
  Beto.manda({type:'dm', para:P(101), texto:'ué, por quê?'});
  confira((Beto.ult('dm_erro') || {}).reason === 'amigo', 'e não consegue mais mandar mensagem para ela', Beto.ult('dm_erro'));
  Ana.manda({type:'relacoes', conta:bilhete(999, 'Outro', {a:[P(102)]})});
  confira(Ana.ult('relacoes_ok') && !Ana.ult('relacoes_ok').ok, 'o bilhete de outra conta não vale');
  t.atualizaRelacoes(P(101), {amigos:[P(102), P(103), P(106), P(107)], bloqueios:[], mostraOnline:true, aceitaConvites:true, clube:'p9', cos:{banner:'banner_cristo'}});
  confira(Beto.ult('amigo_status', x => x.p === P(101) && x.st !== 'offline'), 'a plataforma avisa que voltaram a ser amigos: o Beto vê a Ana de novo');
  confira(t.salaDe(Ana.c).members.find(x => x.id === Ana.id).cos.banner === 'banner_cristo' && Ana.sala() && Ana.sala().members.find(x => x.id === Ana.id).cos.banner === 'banner_cristo', 'e o cosmético novo aparece no cartão da sala (para todos)');
  confira(t.avisaConta(P(101), {categoria:'amigos', titulo:'Pedido de amizade'}) && Ana.ult('conta_aviso') && Ana.ult('conta_aviso').titulo === 'Pedido de amizade', 'o aviso da plataforma chega na hora (conta_aviso)', Ana.ult('conta_aviso'));
  t.atualizaRelacoes(P(101), {amigos:[P(102)], bloqueios:[], mostraOnline:false, aceitaConvites:true, clube:'p9', cos:{}});
  confira(Beto.ult('amigo_status', x => x.p === P(101)).st === 'offline', 'a Ana escondeu o status: o Beto passa a ver offline', Beto.ult('amigo_status', x => x.p === P(101)));
  t.atualizaRelacoes(P(101), {amigos:[P(102), P(103), P(106), P(107)], bloqueios:[], mostraOnline:true, aceitaConvites:true, clube:'p9', cos:{}});

  console.log('\n9) o Chat do Brasil: o bloqueio, a denúncia com motivo e o histórico sem o texto escondido');
  const bAna = cliente(t); bAna.manda({type:'brasil_join', conta:bilhete(101, 'Ana', {a:[P(102)]})});
  const bDuda = cliente(t); bDuda.manda({type:'brasil_join', conta:bilhete(104, 'Duda', {b:[P(101)]})});
  const bBeto = cliente(t); bBeto.manda({type:'brasil_join', conta:bilhete(102, 'Beto', {a:[P(101)]})});
  bAna.manda({type:'brasil_say', text:'salve, Brasil!'});
  confira(bBeto.ult('brasil_message') && bBeto.ult('brasil_message').message.texto === 'salve, Brasil!', 'a mensagem da Ana chega ao Beto');
  confira(!bDuda.ult('brasil_message'), 'mas não à Duda (que bloqueou a Ana)');
  const bDuda2 = cliente(t); bDuda2.manda({type:'brasil_join', conta:bilhete(104, 'Duda', {b:[P(101)]})});
  confira(bDuda2.ult('brasil_history') && !bDuda2.ult('brasil_history').messages.some(x => x.texto === 'salve, Brasil!'), 'nem no histórico que a Duda recebe');
  relogio += 3000;
  bBeto.manda({type:'brasil_say', text:'bora racha'});
  const mb = bAna.ult('brasil_message', x => x.message.texto === 'bora racha').message;
  bAna.manda({type:'brasil_report', id:mb.id, motivo:'spam'});
  await espera(20);
  confira(denuncias.some(x => x.canal === 'brasil' && x.mid === mb.id && x.alvo === P(102) && x.motivo === 'spam' && x.autor === P(101)), 'a denúncia no Chat do Brasil vai para a plataforma com o motivo', denuncias.slice(-1));
  const r2 = cliente(t); r2.manda({type:'brasil_join', conta:bilhete(110, 'Juca', {})});
  const r3 = cliente(t); r3.manda({type:'brasil_join', conta:bilhete(111, 'Lia', {})});
  r2.manda({type:'brasil_report', id:mb.id, motivo:'spam'}); r3.manda({type:'brasil_report', id:mb.id, motivo:'spam'});
  confira(bAna.ult('brasil_hide', x => x.id === mb.id), 'três denúncias: some para todos (como antes)');
  const r4 = cliente(t); r4.manda({type:'brasil_join', conta:bilhete(112, 'Mel', {})});
  const hx = r4.ult('brasil_history').messages.find(x => x.id === mb.id);
  confira(hx && hx.escondida && hx.texto === '', 'quem entra depois recebe a escondida SEM o texto', hx);

  console.log('\n10) o selo: quem jogou junto (g) e o melhor da partida (v); a lista mostra o placar (assistir)');
  const t2 = new Turma({log:() => {}, agora:() => relogio, p2p:false, segredo:SEG});
  const X = conta(t2, 201, 'Xavi', {a:[P(202)]}), Y = conta(t2, 202, 'Yara', {a:[P(201)]}), Z = conta(t2, 203, 'Zeca', {});
  X.manda({type:'create', n:1, map:4, jogo:'futebol', tempo:0, bots:false, pub:true});
  const cx = X.sala().code;
  Y.manda({type:'join', code:cx, slot:1});
  X.manda({type:'start'});
  const r = t2.salaDe(X.c);
  r.partida.onSnapshot({tick:1, elapsed:0, state:'jogo', kickoff:0, score:[0, 0], ball:[0, 0, 0, 0, 0], players:[], goal:null});
  relogio += 20000; r.partida.placar = [1, 0]; r.partida.onGol({author:X.id, assist:null, placar:[1, 0], el:20});
  r.partida.onSnapshot({tick:2, elapsed:20, state:'jogo', kickoff:0, score:[1, 0], ball:[0, 0, 0, 0, 0], players:[], goal:{author:X.id}});
  await espera(600);
  const li = Z.ult('rooms'), lx = li && li.list.find(x => x.code === cx);
  confira(lx && lx.state === 'playing' && lx.placar && lx.placar.join() === '1,0' && lx.assistir === true, 'quem está fora vê a sala em jogo com o placar (e que dá para assistir)', lx);
  await espera(300);
  confira(Y.ult('amigo_status', x => x.p === P(201) && x.st === 'partida'), 'a Yara vê o Xavi "em partida"', Y.ult('amigo_status', x => x.p === P(201)));
  relogio += 20000; r.partida.placar = [2, 0]; r.partida.onGol({author:X.id, assist:null, placar:[2, 0], el:40});
  r.partida.onSnapshot({tick:3, elapsed:40, state:'jogo', kickoff:0, score:[2, 0], ball:[0, 0, 0, 0, 0], players:[], goal:{author:X.id}});
  relogio += 20000; r.partida.placar = [2, 1]; r.partida.onGol({author:Y.id, assist:null, placar:[2, 1], el:60});
  r.partida.onSnapshot({tick:4, elapsed:60, state:'jogo', kickoff:0, score:[2, 1], ball:[0, 0, 0, 0, 0], players:[], goal:{author:Y.id}});
  relogio += 20000; r.partida.placar = [3, 1]; r.partida.onGol({author:X.id, assist:null, placar:[3, 1], el:80});
  r.partida.onSnapshot({tick:5, elapsed:80, state:'jogo', kickoff:0, score:[3, 1], ball:[0, 0, 0, 0, 0], players:[], goal:{author:X.id}});
  r.partida.onFim({placar:[3, 1], vencedor:0, duracao:80, jogo:'futebol'});
  const rx = X.ult('result'), ry = Y.ult('result');
  const sx = rx && confere(SEG, rx.selo), sy = ry && confere(SEG, ry.selo);
  confira(rx && rx.valida && sx && Array.isArray(sx.g) && sx.g.join() === [P(201), P(202)].join() && sy && sy.g.join() === sx.g.join(), 'o selo leva as contas que jogaram (g), igual para os dois', [sx, sy]);
  confira(sx && sx.v === 1 && sy && sy.v === 0 && rx.mvp === true && !ry.mvp && rx.melhor && rx.melhor.id === X.id && ry.melhor && ry.melhor.nome === 'Xavi', 'o melhor da partida (3 gols): v:1 só no selo dele, e todos veem quem foi', [sx && sx.v, sy && sy.v, rx.melhor]);
  // empate em gols: decide a assistência; empate em tudo: ninguém
  const rr = {roster:['c1', 'c2', 'c3', 'c4'], n:2, gols:{c1:1, c3:1}, assist:{c3:1}};
  confira(t2.v88Mvp(rr, 0) === 'c3', 'empate em gols: quem deu mais assistências é o melhor');
  const rr2 = {roster:['c1', 'c2', 'c3', 'c4'], n:2, gols:{c1:1, c3:1}, assist:{}};
  confira(t2.v88Mvp(rr2, 0) === 'c1' && t2.v88Mvp(rr2, -1) === null, 'empate em gols e assistências: o do time que venceu; no empate da partida, ninguém');
  confira(t2.v88Mvp({roster:['c1', 'c2'], n:1, gols:{}, assist:{}}, -1) === null, '0 × 0: não tem melhor da partida');

  console.log('\n11) offline e o histórico do chat dos amigos gravado no arquivo');
  Ana.limpa();
  Beto.ws.close();
  confira(Ana.ult('amigo_status', x => x.p === P(102) && x.st === 'offline'), 'o Beto fechou o jogo: a Ana vê offline na hora');
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'racha88-')), arq = path.join(pasta, 'turma.json');
  const t3 = new Turma({log:() => {}, agora:() => relogio, p2p:false, segredo:SEG, arquivo:arq});
  const A3 = conta(t3, 301, 'Ari', {a:[P(302)]}), B3 = conta(t3, 302, 'Bia', {a:[P(301)]});
  A3.manda({type:'dm', para:P(302), texto:'amanhã tem racha'});
  B3.manda({type:'clube_say', texto:'x'});
  t3.fecha();
  const t4 = new Turma({log:() => {}, agora:() => relogio, p2p:false, segredo:SEG, arquivo:arq});
  const B4 = conta(t4, 302, 'Bia', {a:[P(301)]});
  B4.manda({type:'dm_hist', com:P(301)});
  confira(B4.ult('dm_hist') && B4.ult('dm_hist').lista.length === 1 && B4.ult('dm_hist').lista[0].texto === 'amanhã tem racha', 'o servidor reiniciou: a conversa (curta) continua lá', B4.ult('dm_hist'));
  t4.fecha();
  fs.rmSync(pasta, {recursive:true, force:true});
  for (const x of [t, t2]) x.fecha();
}

(async () => {
  try { await principal(); }
  catch (e) { falhou++; console.log('  FALHOU (erro) ' + (e && e.stack || e)); }
  console.log('\nv88 · o social ao vivo no servidor da turma: ' + ok + ' ok, ' + falhou + ' falharam');
  process.exit(falhou ? 1 : 0);
})();
