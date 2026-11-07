// RACHA v107 · O CONVITE PELO CHAT no servidor das salas (server/convite107.js), na memória, com contas de verdade (o bilhete
// assinado): convite {mid} — o número de uma mensagem recente do chat (o Chat do Brasil, a sala, a equipe, o clube) — chama
// quem escreveu para a sua sala, mesmo quem não é seu amigo, e quem recebe aceita pelo caminho de sempre (convite_recebido →
// convite_resposta → entra na sala). As regras de sempre (conta, sala, ranqueada, cheia, bloqueio dos dois lados, quem recebe
// convites, quem já está na sala) e as do chat (a mensagem de até 15 min, a escondida, a do sistema, a da equipe dos outros,
// o visitante), os limites (1 a cada 10 s, 6 a cada 10 min, a mesma pessoa 1 a cada 2 min, quem recebe até 8 a cada 10 min,
// reconectar não zera), o texto do erro que não conta nada de quem recebe e os amigos pelo ID como antes.
// Rodar: node tests/v107_convite_servidor_test.mjs   (sem dependências; a plataforma não entra aqui)
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import EventEmitter from 'node:events';
const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.RACHA_CONTAGEM_MS = process.env.RACHA_CONTAGEM_MS || '0';
process.env.RACHA_REPLAY = process.env.RACHA_REPLAY || '0';
const { Turma } = require(path.join(RAIZ, 'server', 'turma'));
const { assina } = require(path.join(RAIZ, 'server', 'banco'));
const C107 = require(path.join(RAIZ, 'server', 'convite107'));
let ok = 0, falhou = 0;
const confere = (c, txt, extra) => { if (c) { ok++; console.log('  ok   ' + txt); } else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra).slice(0, 500) : '')); } };
const t0 = Date.now();

class WsFalso extends EventEmitter {
  constructor() { super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; this.vivo = true; }
  send(t) { if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
  close() { if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate() { this.close(); } ping() {}
}
const SEG = 'segredo-v107-convite';
let relogio = 1.8e12;                                      // (o relógio dos limites: os testes adiantam; a hora das mensagens é a de verdade)
const t = new Turma({ log: () => {}, agora: () => relogio, p2p: false, segredo: SEG, exigeConta: false });
const P = n => String(n).padStart(6, '0');
function cliente() {
  const ws = new WsFalso();
  const c = t.conecta(ws, { headers: {}, socket: { remoteAddress: '10.7.' + (Math.random() * 250 | 0) + '.' + (Math.random() * 250 | 0) } });
  return { ws, c, manda: m => ws.emit('message', JSON.stringify(m)),
    ult: (tipo, f) => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === tipo && (!f || f(ws.caixa[i]))) return ws.caixa[i]; return null; },
    todas: tipo => ws.caixa.filter(x => x.type === tipo), limpa: () => { ws.caixa.length = 0; } };
}
const bilhete = (p, n, extra) => assina(SEG, Object.assign({ p: String(p), n, e: Date.now() + 30 * 60e3, t: Date.now() }, extra || {}));
function conta(p, n, extra) { const k = cliente(); k.manda({ type: 'hello', name: n, skin: '', flag: 'BR', conta: bilhete(p, n, extra) }); k.pub = P(p); k.nome = n; k.p = p; k.extra = extra; return k; }
function brasil(p, n, extra) { const k = cliente(); k.manda({ type: 'brasil_join', name: n, conta: p ? bilhete(p, n, extra) : undefined }); k.pub = p ? P(p) : ''; return k; }
let fala = 0;
function diz(b, texto) {                                   // uma mensagem no Chat do Brasil: o número dela (mid)
  b.c.ultBrasil = 0; b.manda({ type: 'brasil_say', text: (texto || 'bora jogar') + ' ' + (++fala) });
  const m = b.ult('brasil_message'); return m && m.message ? m.message.id : null;
}
// convidar pelo chat (cada tentativa com o balde de sempre cheio: os testes mandam em sequência na hora de verdade)
const erros = new Set();                                   // (os textos dos erros de quem recebe, na parte 2)
let juntaErros = false;
function convida(k, mid, canal) {
  k.c.baldes.convite = null; k.limpa(); k.manda(Object.assign({ type: 'convite', mid }, canal ? { canal } : {}));
  const r = k.ult('convite_enviado') || k.ult('convite_erro');
  if (juntaErros && r && r.type === 'convite_erro') erros.add(r.motivo);
  return r;
}
const GEN = C107.GENERICO;
const salaDe = k => (k.c.sala ? t.salas.get(k.c.sala) : null);

console.log('1) convidar pelo Chat do Brasil quem não é seu amigo: chega e, aceitando, entra na sala');
const Ana = conta(101, 'Ana', { a: [P(102)], b: [P(108)], k: 'p7' });
const Beto = conta(102, 'Beto', { a: [P(101)] });
const Caio = conta(103, 'Caio');
Ana.manda({ type: 'create', name: 'Racha da Ana', pub: false, n: 2 });
const sala0 = Ana.ult('room'); const code = sala0 && sala0.room && sala0.room.code;
confere(!!code && salaDe(Ana) && salaDe(Ana).pub === false, 'a Ana cria uma sala fechada (só entra quem tem o código)', code);
const bCaio = brasil(103, 'Caio');
const mCaio = diz(bCaio, 'alguém pra 2v2?');
confere(/^m\d+$/.test(mCaio || ''), 'o Caio escreve no Chat do Brasil (a mensagem tem número)', mCaio);
let r = convida(Ana, mCaio);
const cr = Caio.ult('convite_recebido');
confere(r && r.type === 'convite_enviado' && r.para === P(103) && r.nome === 'Caio' && r.via === 'chat' && r.mid === mCaio, 'a Ana convida pelo número da mensagem: convite_enviado para o Caio (o ID e o nome)', r);
confere(cr && cr.via === 'chat' && cr.de && cr.de.p === P(101) && cr.de.nome === 'Ana' && cr.sala && cr.sala.code === code && cr.tipo === 'sala' && cr.expira === 60000 && cr.amigo === false,
  'o Caio recebe o convite de sempre (convite_recebido: quem chamou, a sala com o código, 60 s), marcado "pelo chat" e "não é amigo"', cr);
confere(cr && !('rel' in cr.de) && Object.keys(cr.de).sort().join() === 'nome,p,selo', 'o convite só leva o ID público, o nome e o selo de quem chamou', cr && cr.de);
Caio.manda({ type: 'convite_resposta', id: cr && cr.id, aceita: true });
confere(Caio.c.sala === code && salaDe(Ana).members.some(x => x.id === 'c103'), 'o Caio aceita e entra na sala da Ana (mesmo fechada, pelo convite)', [Caio.c.sala, code]);
confere(Ana.ult('convite_resultado') && Ana.ult('convite_resultado').aceita === true && Ana.ult('convite_resultado').nome === 'Caio', 'a Ana fica sabendo que o Caio aceitou');

console.log('\n2) as regras de sempre');
relogio += 3 * 60e3;
const mCaio2 = diz(bCaio, 'cheguei');
r = convida(Ana, mCaio2);
confere(r && r.type === 'convite_erro' && r.motivo === C107.TEXTOS.naSala, 'quem já está na sua sala: "Essa pessoa já está na sua sala."', r);
const Duda = conta(104, 'Duda');
const bDuda = brasil(104, 'Duda');
juntaErros = true;
r = convida(Ana, 'm999999');
confere(r && r.type === 'convite_erro' && r.motivo === GEN && r.para === '', 'o número de uma mensagem que não existe: o erro de sempre (sem o ID de ninguém)', r);
r = convida(Ana, '<img src=x>');
confere(r && r.type === 'convite_erro' && r.motivo === GEN && r.mid === '', 'o número malfeito: o erro de sempre (e não volta o que veio)', r);
r = convida(Ana, 'x'.repeat(41));
confere(r && r.type === 'convite_erro' && r.motivo === GEN, 'o número comprido demais: o erro de sempre', r);
const mDuda = diz(bDuda, 'tô on');
const msgDuda = t.chat.msgs.find(x => x.id === mDuda);
msgDuda.t -= 15 * 60e3 + 5000;
r = convida(Ana, mDuda);
confere(r && r.type === 'convite_erro' && r.motivo === GEN, 'a mensagem de mais de 15 min: o erro de sempre (o convite é de quem acabou de falar)', r);
msgDuda.t = Date.now() - 14 * 60e3;
r = convida(Ana, mDuda);
confere(r && r.type === 'convite_enviado' && r.para === P(104), 'a de 14 min ainda vale', r);
relogio += 3 * 60e3;
msgDuda.escondida = true;
r = convida(Ana, mDuda);
confere(r && r.type === 'convite_erro' && r.motivo === GEN, 'a mensagem escondida pela moderação (as denúncias): o erro de sempre', r);
msgDuda.escondida = false;
const Gabi = conta(107, 'Gabi', { b: [P(101)] }), bGabi = brasil(107, 'Gabi', { b: [P(101)] });
r = convida(Ana, diz(bGabi, 'oi galera'));
confere(r && r.type === 'convite_erro' && r.motivo === GEN && !Gabi.ult('convite_recebido'), 'quem bloqueou você não recebe (e o erro é o de sempre: não conta do bloqueio)', r);
const Hugo = conta(108, 'Hugo'), bHugo = brasil(108, 'Hugo');
r = convida(Ana, diz(bHugo, 'joga alguém?'));
confere(r && r.type === 'convite_erro' && r.motivo === GEN && !Hugo.ult('convite_recebido'), 'quem você bloqueou também não', r);
Hugo.manda({ type: 'create', name: 'Sala do Hugo', pub: false, n: 1 });
const bAna = brasil(101, 'Ana', { a: [P(102)], b: [P(108)] });
r = convida(Hugo, diz(bAna, 'bora'));
confere(r && r.type === 'convite_erro' && r.motivo === GEN && !Ana.ult('convite_recebido'), 'e quem foi bloqueado não chama quem bloqueou', r);
const Eva = conta(105, 'Eva', { c: 0 }), bEva = brasil(105, 'Eva', { c: 0 });
r = convida(Ana, diz(bEva, 'eae'));
confere(r && r.type === 'convite_erro' && r.motivo === GEN && !Eva.ult('convite_recebido'), 'quem desligou "Receber convites para jogar" não recebe (nem pelo chat)', r);
const Fabi = conta(106, 'Fabi', { o: 0 }), bFabi = brasil(106, 'Fabi', { o: 0 });
r = convida(Ana, diz(bFabi, 'salve'));
confere(r && r.type === 'convite_erro' && r.motivo === GEN && !Fabi.ult('convite_recebido'), 'quem escondeu o status online: o mesmo erro (o convite não mostra quem está online escondido)', r);
const bOff = brasil(114, 'Ota');
r = convida(Ana, diz(bOff, 'fui'));
confere(r && r.type === 'convite_erro' && r.motivo === GEN, 'quem só está no Chat do Brasil (sem a conexão das salas): o mesmo erro', r);
const bVis = brasil(0, 'Visita');
const mVis = diz(bVis, 'sou visitante');
r = convida(Ana, mVis);
confere(mVis && r && r.type === 'convite_erro' && r.motivo === GEN, 'o visitante (sem conta) não é convidado pelo chat', r);
confere(GEN === 'Não deu para convidar essa pessoa agora.' && erros.size === 1 && erros.has(GEN), 'um texto só para tudo que é de quem recebe ou da mensagem (a que não existe, a velha, a escondida, o bloqueio dos dois lados, sem convites, escondido, offline, o visitante): "' + GEN + '"', [...erros]);
juntaErros = false;
const V = cliente(); V.manda({ type: 'hello', name: 'Visita', skin: '', flag: 'BR' });
V.manda({ type: 'create', name: 'Sala da Visita', pub: false, n: 1 });
r = convida(V, mCaio2);
confere(r && r.type === 'convite_erro' && r.motivo === C107.TEXTOS.conta && !Caio.todas('convite_recebido').some(x => x.de && x.de.nome === 'Visita'), 'o visitante não convida: "Entre na sua conta para convidar."', r);
const Iara = conta(109, 'Iara'), bIara = brasil(109, 'Iara');
const mIara = diz(bIara, 'quem quer jogar');
r = convida(Duda, mIara);
confere(r && r.type === 'convite_erro' && r.motivo === C107.TEXTOS.semSala, 'quem não está numa sala: "Crie ou entre numa sala para convidar."', r);
salaDe(Ana).ranked = true;
r = convida(Ana, mIara);
confere(r && r.type === 'convite_erro' && r.motivo === C107.TEXTOS.ranqueada, 'na ranqueada: "A ranqueada não recebe convidados."', r);
salaDe(Ana).ranked = false;
const reais = salaDe(Ana).members.slice();
while (salaDe(Ana).members.length < 17) salaDe(Ana).members.push({ id: 'b' + salaDe(Ana).members.length, name: 'x', bot: true, slot: -1 });
r = convida(Ana, mIara);
confere(r && r.type === 'convite_erro' && r.motivo === C107.TEXTOS.cheia, 'com a sala cheia (17, v114): "A sala está cheia."', r);
salaDe(Ana).members = reais;
t.chat.silencio.set('c101', Date.now() + 60e3);
r = convida(Ana, mIara);
confere(r && r.type === 'convite_erro' && r.motivo === C107.TEXTOS.silenciado && !Iara.ult('convite_recebido'), 'quem está silenciado por denúncias no Chat do Brasil não convida pelo chat', r);
t.chat.silencio.delete('c101');
r = convida(Ana, diz(bAna, 'eu mesma'));
confere(r && r.type === 'convite_erro' && r.motivo === GEN, 'a sua própria mensagem: o erro de sempre (ninguém convida a si mesmo)', r);

console.log('\n3) a sala, a equipe e o clube');
const Lia = conta(112, 'Lia', { k: 'p7' });
Lia.manda({ type: 'join', code });
Lia.manda({ type: 'say', text: 'vou ali e já volto' });
const sayLia = Ana.ult('say', x => x.name === 'Lia' && !x.sys);
confere(sayLia && /^[A-Z0-9]{6}-\d+$/.test(sayLia.mid || ''), 'a Lia fala no chat da sala (o número da mensagem é da sala)', sayLia);
Lia.manda({ type: 'leave' });
relogio += 3 * 60e3;
r = convida(Ana, sayLia.mid);
const crLia = Lia.ult('convite_recebido');
confere(r && r.type === 'convite_enviado' && crLia && crLia.via === 'chat' && crLia.sala.code === code, 'quem saiu da sala é chamado de volta pela mensagem do chat da sala', [r, crLia]);
Lia.manda({ type: 'convite_resposta', id: crLia && crLia.id, aceita: true });
confere(Lia.c.sala === code, 'e volta para a sala');
const Mano = conta(113, 'Mano');
Mano.manda({ type: 'join', code });
const sala = salaDe(Ana), livre = sala.roster.findIndex((x, i) => !x && i >= sala.n);
Ana.manda({ type: 'seat', slot: 0 }); Mano.manda({ type: 'seat', slot: livre });
Mano.manda({ type: 'say', text: 'só o time B', canal: 'equipe' });
const eqMano = sala.hist.filter(x => x && x.canal === 'equipe').pop();
r = convida(Ana, eqMano && eqMano.mid);
confere(eqMano && typeof eqMano.equipe === 'number' && r && r.type === 'convite_erro' && r.motivo === GEN, 'a mensagem da equipe do outro time (que a Ana nem viu): o erro de sempre', [eqMano, r]);
sala.hist.push({ type: 'say', sys: true, id: 'c103', text: 'Caio chegou na sala', t: Date.now(), mid: code + '-9999' });
r = convida(Ana, code + '-9999');
confere(r && r.type === 'convite_erro' && r.motivo === GEN, 'a mensagem do sistema não serve', r);
const Nico = conta(115, 'Nico', { k: 'p7' });
Nico.manda({ type: 'clube_say', texto: 'alguém do clube on?' });
const ck = Nico.ult('clube_msg');
relogio += 3 * 60e3;
r = convida(Ana, ck && ck.mid);
confere(ck && /^k/.test(ck.mid) && r && r.type === 'convite_enviado' && Nico.ult('convite_recebido') && Nico.ult('convite_recebido').via === 'chat', 'pelo chat do clube (só do seu clube)', [ck, r]);
const Otto = conta(116, 'Otto', { k: 'p8' });
Otto.manda({ type: 'create', name: 'Sala do Otto', pub: false, n: 1 });
r = convida(Otto, ck && ck.mid);
confere(r && r.type === 'convite_erro' && r.motivo === GEN, 'o número de uma mensagem de outro clube não serve', r);

console.log('\n4) os limites de quem não é amigo (por conta: reconectar não zera)');
relogio += 20 * 60e3;
const alvos = [];
for (let i = 0; i < 9; i++) { const p = 120 + i, k = conta(p, 'Alvo' + i), b = brasil(p, 'Alvo' + i); alvos.push({ k, b, mid: diz(b, 'quero jogar') }); }
r = convida(Ana, alvos[0].mid);
confere(r && r.type === 'convite_enviado', 'o primeiro convite vai', r);
r = convida(Ana, alvos[1].mid);
confere(r && r.type === 'convite_erro' && r.motivo === C107.TEXTOS.intervalo && !alvos[1].k.ult('convite_recebido'), 'o segundo logo em seguida não: 1 a cada 10 s ("Calma: espere uns segundos…")', r);
r = convida(Ana, 'm1');                                    // (a mensagem de alguém que nem está online: o limite vem antes, o texto não depende dela)
confere(r && r.type === 'convite_erro' && r.motivo === C107.TEXTOS.intervalo, 'o "calma" não depende de quem recebe (nada de descobrir quem está online sem a pessoa receber)', r);
relogio += 10e3;
r = convida(Ana, alvos[1].mid);
confere(r && r.type === 'convite_enviado', '10 s depois, vai', r);
relogio += 10e3;
r = convida(Ana, alvos[0].mid);
confere(r && r.type === 'convite_erro' && r.motivo === C107.TEXTOS.par, 'a mesma pessoa de novo antes de 2 min: "Você já convidou essa pessoa agora há pouco."', r);
relogio += 2 * 60e3;
r = convida(Ana, alvos[0].mid);
confere(r && r.type === 'convite_enviado', 'depois de 2 min, a mesma pessoa de novo', r);
const enviados = [];
for (let i = 2; i < 5; i++) { relogio += 10e3; enviados.push(convida(Ana, alvos[i].mid)); }
confere(enviados.every(x => x && x.type === 'convite_enviado'), 'mais três, de 10 em 10 s (6 em menos de 10 min)', enviados.map(x => x && (x.motivo || x.type)));
relogio += 10e3;
r = convida(Ana, alvos[5].mid);
confere(r && r.type === 'convite_erro' && r.motivo === C107.TEXTOS.muitos && !alvos[5].k.ult('convite_recebido'), 'o 7º em 10 min não vai: "Você já mandou muitos convites pelo chat…"', r);
const Ana2 = conta(101, 'Ana', { a: [P(102)], b: [P(108)], k: 'p7' });
confere(Ana.ws.readyState === 3 && Ana2.c.sala === code, 'a Ana abre o jogo de novo (outra conexão, a mesma sala)');
r = convida(Ana2, alvos[5].mid);
confere(r && r.type === 'convite_erro' && r.motivo === C107.TEXTOS.muitos, 'reconectar não zera o limite', r);
relogio += 10 * 60e3;
r = convida(Ana2, alvos[5].mid);
confere(r && r.type === 'convite_enviado', '10 min depois, volta a convidar', r);
// quem recebe: no máximo 8 convites pelo chat a cada 10 min (somando todo mundo)
relogio += 11 * 60e3;
const alvo = alvos[8], quem = [];
for (let i = 0; i < 9; i++) { const k = conta(140 + i, 'Chama' + i); k.manda({ type: 'create', name: 'Sala ' + i, pub: false, n: 1 }); quem.push(k); }
const res = quem.map(k => convida(k, alvo.mid));
confere(res.slice(0, 8).every(x => x && x.type === 'convite_enviado') && res[8] && res[8].type === 'convite_erro' && res[8].motivo === GEN && alvo.k.todas('convite_recebido').length === 8,
  'quem recebe: no máximo 8 convites pelo chat a cada 10 min (o 9º leva o erro de sempre)', res.map(x => x && (x.motivo || x.type)));
const D = t.c107d;
confere(D && D.de.size <= 5000 && D.par.size <= 5000 && D.alvo.size <= 5000, 'os limites ficam na memória com teto (e saem na faxina)', D && [D.de.size, D.par.size, D.alvo.size]);

console.log('\n5) os amigos: pelo ID como antes (e pelo chat sem os limites)');
Beto.limpa(); Ana2.c.baldes.convite = null;
Ana2.manda({ type: 'convite', para: P(102), tipo: 'sala' });
const crB = Beto.ult('convite_recebido');
confere(crB && !crB.via && crB.de.p === P(101) && crB.sala.code === code && Ana2.ult('convite_enviado'), 'a Ana chama o Beto (amigo) pelo ID: o convite de sempre', crB);
Ana2.c.baldes.convite = null; Ana2.limpa();
Ana2.manda({ type: 'convite', para: P(103), tipo: 'sala' });
confere(/amigos|sala/.test((Ana2.ult('convite_erro') || {}).motivo || ''), 'pelo ID, só os amigos (o Caio, que não é amigo: não)', Ana2.ult('convite_erro'));
const bBeto = brasil(102, 'Beto', { a: [P(101)] });
const rs = [];
for (let i = 0; i < 3; i++) { Beto.limpa(); rs.push(convida(Ana2, diz(bBeto, 'amigo aqui'))); }
confere(rs.every(x => x && x.type === 'convite_enviado') && Beto.ult('convite_recebido').amigo === true, 'pelo chat, o amigo não entra nos limites de quem não é amigo (3 seguidos)', rs.map(x => x && (x.motivo || x.type)));
const n0 = [...t.v88.convites.values()].filter(x => x.de === 'c101' && x.para === P(102)).length;
confere(n0 === 1, 'o convite novo vale no lugar do velho (um por pessoa)', n0);

console.log('\n6) o protocolo');
confere(C107.canalDe('m12') === 'brasil' && C107.canalDe('ABCDEF-3') === 'sala' && C107.canalDe('kabc12') === 'clube' && C107.canalDe('m12', 'equipe') === 'equipe' && C107.canalDe('zz') === null && C107.canalDe('m1', 'dm') === 'brasil',
  'o canal: o que veio (brasil, sala, equipe, clube) ou pelo jeito do número; outro canal não vale');
confere(C107.LIMITES.intervalo === 10e3 && C107.LIMITES.max === 6 && C107.LIMITES.janela === 600e3 && C107.LIMITES.par === 120e3 && C107.LIMITES.mensagemMs === 900e3 && C107.LIMITES.alvoMax === 8,
  'os limites: 1 a cada 10 s, 6 a cada 10 min, a mesma pessoa a cada 2 min, a mensagem de até 15 min, quem recebe até 8', C107.LIMITES);
const turmaTxt = require('node:fs').readFileSync(path.join(RAIZ, 'server', 'turma.js'), 'utf8');
confere((turmaTxt.match(/convite107/g) || []).length === 2 && /require\('\.\/convite107'\)\.aplica\(Turma/.test(turmaTxt), 'ligado no turma.js com uma linha', (turmaTxt.match(/.*convite107.*/g) || []));
t.fecha();
console.log('\nv107 · o convite pelo chat no servidor das salas: ' + ok + ' ok, ' + falhou + ' falharam em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(falhou ? 1 : 0);
