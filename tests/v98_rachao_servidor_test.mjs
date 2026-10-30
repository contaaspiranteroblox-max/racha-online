// RACHA v98 · AS SALAS ONLINE DO RACHÃO no servidor das salas (sem navegador).
// O pedido: "Deixe separado o racha e o rachão, os caras podem escolher criar modo racha ou rachão, porém dá pra criar sala de
// rachão também on-line". Aqui:
//   1) o motor do servidor (server/partida/rachao_motor.js) é o código da página do Rachão, letra por letra;
//   2) o campo da sala (os 17 e os estádios da Oficina de estádios, limpos com o código da página; o mesmo campo montado nas
//      duas pontas, o tamanho máximo, o filtro no nome) e 3) as opções conferidas;
//   4) a partida da sala: a fila de comandos (o palpite, os atrasados, o silêncio), os contadores dos toques (a cavadinha, as
//      curvas, o chute e o super chute rápidos, o poder) que não se perdem, o estádio sem chutes extras e o ritmo;
//   5) quem sai vira bot e quem volta reassume (e o admin trocando lugares); 6) o fim (os gols, o tempo, a prorrogação com
//      limite, o ENCERRAR) e partidas inteiras de bots nos 17 campos e no Caos;
//   7) o quadro e a previsão: o aparelho põe o quadro no próprio motor e prevê a sua tampinha e a bola — e dá o mesmo que o
//      servidor; o Multibola, o Golzão, a Muralha e o vento chegam certos;
//   8) o servidor de verdade por WebSocket: criar, entrar pelo código, a lista (a página antiga não vê nem entra), os
//      ajustes do admin (o estádio da Oficina), a contagem, os quadros, os comandos, os gols, o resultado, a queda e a volta.
// Rodar: node tests/v98_rachao_servidor_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import net from 'node:net';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = path.join(RAIZ, 'app', 'public', 'game', 'rachao');
let ok = 0, falhou = 0;
const confere = (c, txt, extra) => { if (c) { ok++; console.log('  ok   ' + txt); } else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra).slice(0, 500) : '')); } return c; };
const t0 = Date.now();
const sha16 = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

/* ---------------------------------------------------------------- 1) o motor do servidor é o da página */
console.log('\n1) o motor do servidor é o código da página');
const PAG = fs.readFileSync(path.join(PASTA, 'rachao.html'), 'utf8');
const PONTE_TXT = fs.readFileSync(path.join(PASTA, 'ponte.js'), 'utf8');
const QUADRO_TXT = fs.readFileSync(path.join(PASTA, 'quadro.js'), 'utf8');
const EST_TXT = fs.readFileSync(path.join(PASTA, 'estadios.js'), 'utf8');
const GERADO = fs.readFileSync(path.join(RAIZ, 'server', 'partida', 'rachao_motor.js'), 'utf8');
const corta = (t, a, b) => t.slice(t.indexOf(a) + a.length, t.indexOf(b));
const JOGO = corta(PAG, '<script>\n', '/* ---- 07-toprender.js ---- */');
const EST03 = corta(EST_TXT, '/* ---------------------------------------------------------------- 0) o básico */', '/* ---------------------------------------------------------------- 4) os ajudantes de tela */');
confere(JOGO.length > 100000 && GERADO.includes(JOGO), 'o script do jogo da página (até a partida vista de cima) está inteiro, sem mudar uma letra, no motor do servidor', JOGO.length);
confere(GERADO.includes(PONTE_TXT) && GERADO.includes(QUADRO_TXT), 'a ponte da física e o quadro do online também (os mesmos arquivos que a página carrega)');
confere(EST03.length > 10000 && GERADO.includes(EST03), 'e o estádio como documento (as partes 0 a 3 da Oficina de estádios: a limpeza e a montagem)');
const MOT = require(path.join(RAIZ, 'server', 'partida', 'rachao_motor.js'));
confere(MOT.SHA.jogo === sha16(JOGO) && MOT.SHA.ponte === sha16(PONTE_TXT) && MOT.SHA.quadro === sha16(QUADRO_TXT) && MOT.SHA.estadio === sha16(EST03),
  'as impressões digitais do arquivo gerado batem com a página de agora (o build está em dia)', MOT.SHA);
const RS = require(path.join(RAIZ, 'server', 'partida', 'rachao.js'));
const M = RS.motor(), Q = M.Quadro;
confere(M.MAPS.length === 17 && M.EST.ORIGINAIS.length === 17 && M.Ponte && typeof M.Ponte.noRachao === 'function', 'o motor do servidor carrega com os 17 campos, a ponte e o quadro', M.MAPS.map(m => m.id));
confere(!/document\.|window\.addEventListener|localStorage\.setItem/.test(GERADO.slice(GERADO.indexOf('function criaMotorRachao'), GERADO.indexOf('/* ---- 00-util.js'))), 'o servidor não roda tela, som nem armazenamento (só os stubs vazios da página fora do navegador)');

/* ---------------------------------------------------------------- 2) o campo da sala */
console.log('\n2) o campo da sala (os 17 e os estádios da Oficina de estádios)');
let todos = true;
for (const m of M.EST.ORIGINAIS) { const e = RS.estadioDaSala({ campo: m.id }); if (!e.mapa || e.mapa !== M.MAP_BY_ID[m.id] || e.info.nome !== m.name || e.info.hash !== 'c_' + m.id) todos = false; }
confere(todos, 'cada um dos 17 campos vira a sala com o campo de sempre (o mesmo objeto do motor)');
confere(!!RS.estadioDaSala({ campo: 'naoexiste' }).erro && !!RS.estadioDaSala(null).erro && !!RS.estadioDaSala({ estadio: [1, 2] }).erro && !!RS.estadioDaSala('x').erro, 'campo que não existe, nada, lista e texto: recusados com o aviso');
// a Oficina de estádios da página (num vm, como na página: o motor, a ponte e o estadios.js) — para comparar as duas pontas
function oficinaDaPagina() {
  const nada = () => {};
  const ctx = { console: { log: nada, error: nada, warn: nada }, Math, JSON, Number, String, Array, Object, Set, Map, Proxy, TextEncoder, TextDecoder, btoa, atob, Date, URLSearchParams, Infinity, NaN,
    location: { search: '', origin: 'http://x', hash: '' }, localStorage: { getItem: () => null, setItem: nada, removeItem: nada },
    document: { getElementById: () => null, createElement: () => ({}), addEventListener: nada, querySelector: () => null, querySelectorAll: () => [] },
    requestAnimationFrame: () => 0, setTimeout: () => 0, clearTimeout: nada };
  ctx.window = ctx; ctx.addEventListener = nada; ctx.parent = ctx;
  vm.createContext(ctx);
  vm.runInContext(JOGO + '\nvar App = { showScreen(){}, showHome(){}, openSetup(){}, renderSetup(){}, buildScene(){}, buildOpt(){}, sel: {} }; var SIZE_LABELS = {1:"1x1",2:"2x2",3:"3x3",4:"4x4",5:"5x5",6:"6x6",7:"7x7"};', ctx);
  vm.runInContext(PONTE_TXT, ctx); vm.runInContext(QUADRO_TXT, ctx); vm.runInContext(EST_TXT, ctx);
  return { EST: ctx.RachaoEstadios, Q: ctx.RachaoQuadro, E: s => vm.runInContext(s, ctx) };
}
const PG = oficinaDaPagina();
const docTeste = () => {
  const d = M.EST.docNovo(); d.nome = 'Arena do Teste'; d.piso = 'neon';
  d.pecas = [{ t: 'bumper', x: 120, y: 60, r: 18, forca: 8, sim: 'xy' }, { t: 'cerca', x: 0, y: 120, len: 90, th: 12, a: 20, sim: 'y' }, { t: 'lama', x: -150, y: 0, r: 40, bola: 0.96, andar: 0.6, freio: 0.95, sim: 'x' }];
  d.fisica = { ballR: 12, kickForce: 6.2, ballMax: 9 }; d.vento = { on: true, forca: 1.5, troca: 5, dir: 'gol' }; d.partida.chutes = { cavadinha: false, curva: true, super: true };
  return d;
};
const e1 = RS.estadioDaSala({ estadio: docTeste() }), e2 = RS.estadioDaSala({ estadio: docTeste() });
confere(e1.mapa && e1.info.hash === e2.info.hash && e1.doc.id === 'u_' + e1.info.hash && /^[0-9a-f]{16}$/.test(e1.info.hash), 'o estádio da Oficina vira a sala: o mesmo estádio dá o mesmo código (u_ + a impressão digital, nos dois lados)', e1.info);
const mapaPagina = PG.EST.compila(PG.EST.limpa(JSON.parse(JSON.stringify(e1.doc))));
confere(JSON.stringify(mapaPagina) === JSON.stringify(e1.mapa), 'o aparelho monta o MESMO campo que o servidor a partir do estádio que chega (a limpeza e a montagem da página)');
confere(e1.mapa.chutes && e1.mapa.chutes.lob === false && e1.mapa.wind === true && e1.mapa.statics.length === 4 && e1.mapa.walls.length === 2 && e1.mapa.zones.length === 2, 'as regras do estádio vão junto (sem cavadinha, o vento, as peças com o espelho)', { ch: e1.mapa.chutes, s: e1.mapa.statics.length });
const sujo = Object.assign(docTeste(), { nome: 'x'.repeat(300), lixo: { a: 1 }, campo: { W: 99999, H: -5, formato: 'triangulo' }, fisica: { ballR: 0.001, kickForce: 1e9, gravidade: 3 }, pecas: new Array(300).fill({ t: 'poste', x: 1e9, y: 'a', r: 900 }) });
const e3 = RS.estadioDaSala({ estadio: sujo });
confere(e3.mapa && e3.doc.nome.length <= 28 && e3.mapa.W === 800 && e3.mapa.H === 130 && e3.doc.fisica.ballR === 6 && e3.doc.fisica.kickForce === 9 && e3.doc.pecas.length <= 48 && !('lixo' in e3.doc) && !('gravidade' in e3.doc.fisica),
  'o estádio sujo é limpo pela mesma regra da Oficina de estádios (nome cortado, medidas e física nos limites, até 48 peças, chave estranha fora)', { W: e3.mapa.W, H: e3.mapa.H, f: e3.doc.fisica, n: e3.doc.pecas.length });
const enorme = docTeste(); enorme.desc = 'a'.repeat(30000);
confere(/grande demais/.test(RS.estadioDaSala({ estadio: enorme }).erro || ''), 'o estádio grande demais (mais de 24 mil letras) é recusado com o aviso');
const feio = docTeste(); feio.nome = 'www.golpe.com'; feio.desc = 'chama no @fulano_123';
const e4 = RS.estadioDaSala({ estadio: feio }, t => /www\.|@[a-z0-9_.]{3,}/i.test(t));
confere(e4.doc.nome === 'Estádio' && e4.doc.desc === '', 'o nome e a descrição do estádio passam pelo filtro do chat (link e @ não aparecem na lista de salas)', [e4.doc.nome, e4.doc.desc]);

/* ---------------------------------------------------------------- 3) as opções */
console.log('\n3) as opções da sala');
const o0 = RS.opcoesDaSala({});
confere(o0.modo === 'match' && o0.tempo === 180 && o0.gols === 5 && o0.corrida === 'folego' && o0.nivel === 'medio' && o0.chutes.lob && o0.chutes.curve && o0.chutes.superKick, 'sem nada: a Partida de 3 min até 5 gols, com fôlego, bots no Médio e os três chutes extras', o0);
const o1 = RS.opcoesDaSala({ modo: 'hack', tempo: 9999, gols: -1, corrida: 'voa', nivel: 'deus', chutes: { lob: false, curve: 0, superKick: 'x' } });
confere(o1.modo === 'match' && o1.tempo === 180 && o1.gols === 5 && o1.corrida === 'folego' && o1.nivel === 'medio' && o1.chutes.lob === false && o1.chutes.curve === true, 'valores que não existem voltam para o padrão (só false desliga um chute)', o1);
confere(RS.opcoesDaSala({ tempo: 0, gols: 0 }).tempo === 180 && RS.opcoesDaSala({ modo: 'chaos' }).gols === 0 && RS.opcoesDaSala({ modo: 'chaos', tempo: 0, gols: 3 }).tempo === 0, 'sem tempo e sem gols vira 3 min (a partida tem de acabar); o Caos começa sem limite de gols');

/* ---------------------------------------------------------------- 4) a partida: os comandos */
console.log('\n4) a partida da sala: a fila de comandos e os toques');
let AG = 0; const agora = () => AG;
function nova(o) {
  o = o || {};
  const e = o.e || RS.estadioDaSala({ campo: o.campo || 'classico' });
  const res = { snaps: [], evs: [], fim: null, gols: [], avisos: [], suspeitos: [] };
  res.P = new RS.PartidaRachao({ mapa: e.mapa, opc: o.opc || RS.opcoesDaSala(o.op || { tempo: 300, gols: 0 }), porTime: o.n || 1, jogadores: o.jogadores || [{ netId: 'A', nome: 'Ana' }, { netId: 'B', nome: 'Beto' }], agora,
    onSnapshot: d => { res.snaps.push(d); if (res.snaps.length > 40) res.snaps.shift(); if (d.ev) res.evs.push(...d.ev); if (res.evs.length > 4000) res.evs.splice(0, 2000); }, onFim: r => { res.fim = r; }, onGol: g => res.gols.push(g), onAviso: t => res.avisos.push(t), suspeito: (id, tipo) => res.suspeitos.push(tipo) });
  res.T = res.P.T;
  return res;
}
const passa = (P, n) => { for (let i = 0; i < n; i++) { AG += 1000 / 60; P.passo(); } };
const cmd = (seq, o) => Object.assign({ seq, x: 0, y: 0, f: 0, kn: 0, st: 0, lb: 0, cl: 0, cr: 0, pw: 0 }, o || {});
{
  const J = nova({ n: 2, jogadores: [{ netId: 'A', nome: 'Ana' }, { bot: true }, { netId: 'B', nome: 'Beto' }, { vazio: true }] });
  const T = J.T;
  confere(J.P.lugares.join() === '0,1,2' && T.players.map(p => p.team).join() === '0,0,1' && T.players[0].label === 'Ana' && T.players[0].human && !T.players[1].human && T.players[1].bot && T.players[2].label === 'Beto',
    'os lugares da sala viram os jogadores na ordem (Vermelho primeiro); a vaga com bot tem bot e a vazia (bots desligados) não tem ninguém', T.players.map(p => [p.lugar, p.team, p.label]));
  confere(J.P.temLugar(1) && !J.P.temLugar(3), 'o lugar vazio não tem jogador nesta partida (o admin não consegue pôr ninguém nele no meio)');
}
{
  const J = nova(); const P = J.P, T = J.T, a = T.players[0];
  T.kickoffTeam = 0;   // a saída é sorteada; com a saída do Azul a barreira do círculo segura a Ana (correndo para o centro)
  let s = 0;
  for (let i = 0; i < 60; i++) { AG += 1000 / 60; P.entrada('A', cmd(++s, { x: 1 })); P.passo(); }
  const vx = a.disc.vx, x1 = a.disc.x;
  confere(vx > 1 && a.ack === 60, 'cada comando anda um passo: a Ana corre para a direita e o servidor confirma o último (ack)', { vx, ack: a.ack });
  passa(P, 3);
  confere(a.ack === 63 && a.disc.x > x1, 'sem comando chegando, o servidor anda com o último por até 4 passos (o palpite) e confirma adiantado', a.ack);
  for (const k of [61, 62, 63]) P.entrada('A', cmd(k, { x: 1 }));
  P.entrada('A', cmd(64, { x: -1 }));
  AG += 1000 / 60; P.passo();
  confere(a.ack === 64 && a.input.mx === -1, 'os comandos que chegaram depois do palpite são pulados (o passo já foi) e o próximo vale', { ack: a.ack, mx: a.input.mx });
  AG += 400; P.passo();
  confere(a.input.mx === 0 && a.input.kick === false, 'em silêncio por mais de 350 ms (a internet travou): a tampinha fica parada (nada de correr sozinha)');
  const antes = J.suspeitos.length;
  for (let i = 0; i < 130; i++) P.entrada('A', cmd(1000 + i));
  confere(J.suspeitos.length > antes, 'mais de 120 comandos por segundo: o servidor ignora o excesso e anota (sem expulsar ninguém)');
  const c = Q.comando({ seq: 5, x: 9, y: 9, f: 255, kn: -3, lb: 'a', cl: 2.5, cr: 1e12, pw: NaN });
  confere(c && Math.abs(Math.hypot(c.x, c.y) - 1) < 0.01 && c.f === 7 && c.kn === 0 && c.lb === 0 && c.cl === 0 && c.cr === 0 && c.pw === 0 && Q.comando({ seq: -1 }) === null && Q.comando({ seq: 'x' }) === null && Q.comando(null) === null,
    'o comando é conferido: a direção vai até 1, só 3 botões e os contadores inteiros (o resto vira 0); seq errada é jogada fora', c);
}
{
  // os toques: a cavadinha, as curvas, o chute rápido e o super rápido (contadores que só sobem)
  const J = nova(); const P = J.P, T = J.T, a = T.players[0];
  let s = 0, k = { lb: 0, cl: 0, cr: 0, kn: 0, st: 0, pw: 0 };
  const manda = o => { AG += 1000 / 60; Object.assign(k, o || {}); P.entrada('A', cmd(++s, Object.assign({}, k))); P.passo(); };
  manda(); manda();
  manda({ lb: 1 });
  confere(a.lobArm === true, 'o contador da cavadinha subiu: a cavadinha arma (uma vez)');
  // um comando se perde no caminho (o servidor recebe o seguinte, com o contador já somado): o toque vale do mesmo jeito
  s++; Object.assign(k, { lb: 2 });
  manda({ cr: 1 }); manda();                             // (a seq que se perdeu deixa o servidor um passo atrás: o toque vale no passo seguinte)
  confere(a.lobArm === false && a.curveArm === 1, 'o comando com o segundo toque se perdeu: o seguinte traz o contador somado e o toque não se perde (a cavadinha desarma; a curva para a direita arma)', { lob: a.lobArm, curva: a.curveArm });
  manda({ cl: 1 }); manda();
  confere(a.curveArm === -1, 'a curva para a esquerda troca a da direita');
  // o chute rápido: a bola encostada, o contador do chute sobe sem o botão segurado
  const b = T.ball; T.phase = 'play';
  manda({ cl: 2 }); manda(); manda();                    // (desarma a curva e espera o servidor ficar em dia)
  a.lobArm = false; a.curveArm = 0;
  a.disc.x = b.x - a.disc.r - b.r - 1; a.disc.y = b.y; a.disc.vx = a.disc.vy = 0; b.vx = b.vy = 0;
  let vChute = 0;
  for (const o of [{ kn: 1 }, {}]) { manda(o); vChute = Math.max(vChute, Math.hypot(b.vx, b.vy)); }
  confere(vChute > 2, 'o toque rápido no CHUTAR (aperta e solta entre dois quadros) chuta a bola encostada', vChute);
  passa(P, 120);
  b.x = 0; b.y = -120; b.vx = b.vy = 0; b.z = b.vz = 0; b.spin = 0;   // (a bola num lugar livre do campo, longe do Beto)
  for (const p of [a]) { p.disc.x = b.x - p.disc.r - b.r - 1; p.disc.y = b.y; p.disc.vx = p.disc.vy = 0; } a.lobArm = false; a.curveArm = 0;
  let vSuper = 0;                                          // (a maior velocidade logo depois: o Beto pode estar no caminho da bola)
  for (const o of [{ st: 1 }, {}, {}, {}]) { manda(o); vSuper = Math.max(vSuper, Math.hypot(b.vx, b.vy)); }
  confere(vSuper > 2 && vSuper < 5, 'o toque rápido no SUPER: o super chute sai fraquinho (o toquinho: sem carga)', vSuper);
  const ns = J.evs.filter(e => e[0] === 'k' && e[1] === 0).length;
  confere(ns >= 2, 'os dois chutes da Ana vão nos eventos do quadro (o som e a vibração de cada aparelho)', ns);
}
{
  // o estádio sem cavadinha: o contador sobe e nada arma
  const J = nova({ e: RS.estadioDaSala({ estadio: docTeste() }) }); const P = J.P, a = J.T.players[0];
  let s = 0; P.entrada('A', cmd(++s)); AG += 17; P.passo(); P.entrada('A', cmd(++s, { lb: 1 })); AG += 17; P.passo();
  confere(a.lobArm === false && J.T.allowLob === false, 'no estádio sem cavadinha, o toque da cavadinha não arma nada (a regra do estádio vale no servidor)');
}
{
  // o poder do Caos
  const J = nova({ op: { modo: 'chaos', tempo: 300 } }); const P = J.P, T = J.T, a = T.players[0];
  T.phase = 'play'; a.power = 'turbo';
  let s = 0; P.entrada('A', cmd(++s)); AG += 17; P.passo(); P.entrada('A', cmd(++s, { pw: 1 })); AG += 17; P.passo(); AG += 17; P.passo(); AG += 17; P.passo();
  const ev = J.snaps.flatMap(d => d.ev || []);
  confere(a.fx.turbo > 0 && a.power === null && ev.some(e => e[0] === 'pw' && e[1] === 0 && Q.PODERES[e[2]] === 'turbo') && ev.some(e => e[0] === 'fb'), 'no Caos, o contador do poder usa o poder (o Turbo): o evento e as faíscas vão no quadro', { turbo: a.fx.turbo });
  const d = J.snaps[J.snaps.length - 1];
  confere(Array.isArray(d.j[0][22]) && d.j[0][22][0] > 0, 'os efeitos dos poderes vão no quadro (o Turbo da Ana)', d.j[0][22]);
}

/* ---------------------------------------------------------------- 5) quem sai e quem volta */
console.log('\n5) quem sai vira bot, quem volta reassume');
{
  const J = nova({ n: 2, jogadores: [{ netId: 'A', nome: 'Ana' }, { bot: true }, { netId: 'B', nome: 'Beto' }, { bot: true }] }); const P = J.P, T = J.T, a = T.players[0];
  T.phase = 'play'; passa(P, 30);
  P.sai('A');
  confere(!a.human && a.bot && a.reserva === 'A' && a.label === '' && P.gente() === 1, 'a Ana caiu: um bot assume a tampinha dela na hora (o lugar fica guardado)');
  const x0 = a.disc.x, y0 = a.disc.y; passa(P, 90);
  confere(Math.hypot(a.disc.x - x0, a.disc.y - y0) > 5, 'e o bot joga (a partida não para por ninguém)');
  confere(P.entra('A', 'Ana', 0) === 0 && a.human && !a.bot && a.label === 'Ana' && a.reserva === null, 'a Ana voltou: reassume a mesma tampinha');
  P.entrada('A', cmd(1, { x: 1 })); AG += 17; P.passo();
  confere(a.input.mx === 1, 'e os comandos dela voltam a valer (a contagem do aparelho recomeça do zero)');
  confere(P.admTroca(0, 2) && T.players[0].netId === 'B' && T.players[2].netId === 'A', 'o admin troca dois lugares no meio (a Ana vai para o Azul e o Beto para o Vermelho)');
  confere(P.admTira('A') && !T.players[2].netId && T.players[2].bot, 'o admin manda a Ana para o banco: o bot segura o lugar');
  confere(P.admPoe('A', 'Ana', 3) && T.players[3].netId === 'A' && !P.admPoe('A', 'Ana', 9), 'e põe ela num lugar que tem jogador (lugar sem jogador: não)');
}

/* ---------------------------------------------------------------- 6) o fim */
console.log('\n6) o fim da partida');
{
  const J = nova({ op: { tempo: 300, gols: 3 } }); const P = J.P, T = J.T;
  T.phase = 'play'; const A = T.players[0];
  for (let g = 0; g < 3; g++) { T.ball.lastTouch = A; T.scoreGoal(0, T.ball); passa(P, 160); }
  passa(P, 200);
  confere(J.fim && J.fim.placar.join() === '3,0' && J.fim.vencedor === 0 && J.fim.jog[0].gols === 3 && J.fim.gols.A === 3 && J.gols.length === 3 && J.gols[0].author === 'A',
    'até 3 gols: o terceiro gol da Ana acaba a partida e sai o resultado (o placar, quem venceu, os gols de cada um)', J.fim);
  confere(P.encerrado && !P.on, 'a partida acabada para de andar');
}
{
  const J = nova({ op: { tempo: 60, gols: 0 } }); const P = J.P, T = J.T;
  T.phase = 'play'; T.time = 59.9; passa(P, 30);
  confere(T.overtime && T.phase !== 'end', 'empatado no fim do tempo: a prorrogação com gol de ouro (a do Rachão)');
  T.time = 60 + 179.95; passa(P, 10);
  confere(T.phase === 'end' && T.winner === -1 && J.avisos.some(t => /prorrogação acabou/.test(t)), 'a prorrogação tem limite (3 min): depois, empate, com o aviso no chat da sala', J.avisos);
  passa(P, 100);
  confere(J.fim && J.fim.vencedor === -1, 'e o resultado sai como empate');
}
{
  const J = nova(); const P = J.P; J.T.phase = 'play'; passa(P, 30);
  P.encerraJa(); passa(P, 100);
  confere(J.fim && J.T.phase === 'end', 'o ENCERRAR do admin: o apito final na hora (o placar de agora fica)');
}
{
  // partidas inteiras de bots: os 17 campos (Partida) e alguns no Caos, até o fim, sem erro
  let erros = [], fins = 0, kicks = 0, golsEv = 0, conf = 0, maiorQuadro = 0;
  const lista = M.EST.ORIGINAIS.map(m => [m.id, 'match']).concat([['fliper', 'chaos'], ['labirinto', 'chaos'], ['vendaval', 'chaos'], ['coliseu', 'chaos']]);
  for (const [campo, modo] of lista) {
    try {
      const n = campo === 'coliseu' ? 4 : 2;
      const J = nova({ campo, n, op: { modo, tempo: 60, gols: 3, nivel: 'craque' }, jogadores: new Array(2 * n).fill(0).map(() => ({ bot: true })) });
      let k = 0; while (!J.fim && k < 60 * 60 * 6) { AG += 1000 / 60; J.P.passo(); k++; for (const d of J.snaps.splice(0)) { maiorQuadro = Math.max(maiorQuadro, JSON.stringify(d).length); for (const e of d.ev || []) { if (e[0] === 'k') kicks++; if (e[0] === 'g') golsEv++; if (e[0] === 'fc') conf++; } } }
      if (J.fim) fins++; else erros.push(campo + ': não acabou');
    } catch (e) { erros.push(campo + ': ' + e.message); }
  }
  confere(!erros.length && fins === lista.length, 'partidas inteiras de bots nos 17 campos e no Caos (Fliperama, Labirinto, Vendaval e Coliseu 4x4) vão até o fim, sem erro', erros);
  confere(kicks > 100 && golsEv > 10 && conf >= golsEv, 'os chutes, os gols e os confetes de cada gol saem nos eventos dos quadros', { kicks, golsEv, conf });
  confere(maiorQuadro < 4000, 'o maior quadro dessas partidas (até 8 jogadores, com os poderes) tem menos de 4 KB', maiorQuadro);
}

{
  // (depois da revisão) a saída não trava: quem tem a saída parado (a aba escondida, a moldura fechada) — em 8 s a bola fica livre
  const J = nova(); const P = J.P, T = J.T;
  passa(P, RS.SAIDA_LIVRE - 5);
  const antes = T.phase;
  passa(P, 10);
  confere(antes === 'kickoff' && T.phase === 'play' && T.time > 0, 'a saída com os dois parados: depois de 8 s a bola fica livre e o relógio anda (ninguém trava a partida)', [antes, T.phase, T.time]);
}
{
  // (depois da revisão) os gols e os passes são da PESSOA: trocar de lugar não leva os gols junto, e o bot que segurou o lugar tem os dele
  const J = nova({ op: { tempo: 300, gols: 0 } }); const P = J.P, T = J.T;
  T.phase = 'play';
  for (let g = 0; g < 2; g++) { T.ball.lastTouch = T.players[0]; T.scoreGoal(0, T.ball); passa(P, 160); }
  P.admTroca(0, 1);                                     // (a Ana vai para o Azul e o Beto para o Vermelho)
  P.sai('B'); T.phase = 'play'; T.ball.lastTouch = T.players[0]; T.scoreGoal(0, T.ball); passa(P, 160);   // (o bot no lugar do Beto marca)
  P.entra('B', 'Beto', 0);
  const est = P.est;
  confere(est.A.g === 2 && est.A.i === 1 && est.B.g === 0, 'no painel, os 2 gols continuam da Ana no lugar novo (e não do Beto, que foi para o lugar dela)', { A: est.A, B: est.B });
  P.encerraJa(); passa(P, 100);
  const ja = J.fim && J.fim.jog.find(j => j.netId === 'A'), jb = J.fim && J.fim.jog.find(j => j.netId === 'B'), bot = J.fim && J.fim.jog.find(j => j.bot && j.i === 0);
  confere(ja && ja.gols === 2 && ja.i === 1 && jb && jb.gols === 0 && jb.i === 0 && bot && bot.gols === 1 && J.fim.gols.A === 2 && !J.fim.gols.B,
    'no fim: a Ana com os 2 dela, o Beto (que caiu e voltou) com 0 e o bot que segurou o lugar dele com o gol do bot', J.fim && J.fim.jog);
}

/* ---------------------------------------------------------------- 7) o quadro e a previsão do aparelho */
console.log('\n7) o quadro no aparelho e a previsão');
const O = { mkSeg: M.mkSeg, M_BALL: M.M_BALL };
function espelho(J, eu) { const C = Q.cria(M.TopMatch, J.T.map, J.P.opc, J.P.n, J.P.lugares, s => s === eu ? 'p1' : null); return C; }
function previsao(campo, op) {
  const J = nova({ campo, op }); const P = J.P;
  const cmds = []; let s = 0;
  const de = i => { const a = i * 0.05; return cmd(++s, { x: Math.cos(a), y: Math.sin(a * 0.7), f: (i % 40 < 20 ? 1 : 0) | (i % 90 < 30 ? 2 : 0), lb: Math.floor(i / 50), cr: Math.floor(i / 77), kn: Math.floor(i / 33) }); };
  for (let i = 0; i < 240; i++) { AG += 1000 / 60; const c = de(i); cmds.push(c); P.entrada('A', c); P.passo(); }
  const d = JSON.parse(JSON.stringify(J.snaps[J.snaps.length - 1]));
  const C = espelho(J, 0), eu = C.players[0];
  Q.aplica(C, d, O);
  const cont = {}; const base = cmds[d.a[0] - 1]; for (const k of ['kn', 'st', 'lb', 'cl', 'cr']) cont[k] = base[k];
  const novos = []; for (let i = 240; i < 252; i++) novos.push(de(i));
  for (const c of cmds.filter(c => c.seq > d.a[0]).concat(novos)) { const t = { x: c.x, y: c.y, f: c.f }; for (const k in cont) { t[k] = c[k] > cont[k]; cont[k] = c[k]; } Q.preve(C, eu, t); }
  for (const c of novos) { AG += 1000 / 60; P.entrada('A', c); P.passo(); }
  const S = P.T.players[0], B = P.T.ball;
  return { dj: Math.hypot(S.disc.x - eu.disc.x, S.disc.y - eu.disc.y), db: Math.hypot(B.x - C.ball.x, B.y - C.ball.y), tick: [P.T.tick, C.tick], arm: [S.armed, eu.armed, S.lobArm, eu.lobArm, S.curveArm, eu.curveArm], st: Math.abs(S.stamina - eu.stamina) };
}
for (const [campo, op] of [['classico', {}], ['fliper', {}], ['rinque', { corrida: 'sempre' }], ['lua', {}], ['praia', { corrida: 'normal' }]]) {
  const r = previsao(campo, Object.assign({ tempo: 300, gols: 0 }, op));
  confere(r.dj < 0.05 && r.db < 0.05 && r.tick[0] === r.tick[1] && r.arm[0] === r.arm[1] && r.arm[2] === r.arm[3] && r.arm[4] === r.arm[5] && r.st < 0.002,
    'a previsão do aparelho (o quadro + os comandos que o servidor ainda não usou) dá a MESMA tampinha e a MESMA bola que o servidor · ' + campo, r);
}
{
  // o Multibola, o Golzão, a Muralha e o vento chegam certos no aparelho
  const J = nova({ campo: 'vendaval', op: { modo: 'chaos', tempo: 300 } }); const P = J.P, T = J.T, a = T.players[0], b = T.players[1];
  T.phase = 'play'; passa(P, 20);
  a.power = 'multibola'; T.usePower(a); b.power = 'golzao'; T.usePower(b); a.power = 'muralha'; T.usePower(a);
  passa(P, 4);
  const d = J.snaps[J.snaps.length - 1], C = espelho(J, 0);
  Q.aplica(C, JSON.parse(JSON.stringify(d)), O);
  confere(T.balls.length === 3 && C.balls.length === 3 && C.balls[1].extra && Math.hypot(C.balls[2].x - T.balls[2].x, C.balls[2].y - T.balls[2].y) < 0.02, 'o Multibola: as duas bolas extras chegam no aparelho (no mesmo lugar)', [T.balls.length, C.balls.length]);
  confere(Math.abs(C.goalHalf[0] - T.goalHalf[0]) < 0.01 && C.goalHalf[0] > T.map.goal && Math.abs(C.stadium.goals[0].half - T.stadium.goals[0].half) < 0.01, 'o Golzão: o gol maior chega e o aparelho refaz o campo (as traves no lugar novo)', [C.goalHalf, T.goalHalf]);
  confere(!!C.muralha[0] && C.world.segs.some(s => s.kind === 'muralha') && C.muralha[0].t === T.muralha[0].t, 'a Muralha: o muro na frente do gol aparece no aparelho (e bate na bola dele também)');
  confere(Math.abs(C.wind.x - T.wind.x) < 1e-3 && C.wind.dx === T.wind.dx, 'o vento do Vendaval: a força e a direção de agora', [C.wind, T.wind]);
  passa(P, 400); const d2 = J.snaps[J.snaps.length - 1]; Q.aplica(C, JSON.parse(JSON.stringify(d2)), O);
  confere(C.balls.length === T.balls.length && !C.muralha[0] && C.world.segs.every(s => s.kind !== 'muralha') && Math.abs(C.goalHalf[0] - T.goalHalf[0]) < 0.01, 'e tudo some no aparelho quando acaba no servidor (as bolas extras, o muro, o gol volta ao tamanho)', [C.balls.length, T.balls.length, C.goalHalf]);
  const tipos = new Set();
  for (const e of J.evs) { const x = Q.deEvento(C, e); if (x) tipos.add(x.t); }
  confere(['power', 'fx'].every(t => tipos.has(t)), 'os eventos voltam ao formato do motor no aparelho (o poder e as faíscas)', [...tipos]);
  confere(Q.aplica(C, { v: 99 }) === false && Q.aplica(C, null) === false && Q.deEvento(C, ['zz']) === null && Q.deEvento(C, ['pw', 0, 99]) === null, 'quadro de outra versão ou evento estranho: o aparelho ignora');
  // (depois da revisão) o quadro fora do formato não entra pela metade; o poder com número quebrado não vira poder; o comando com
  // um "número" que não é número não derruba nada
  const tk = C.tick, sc = C.score.slice(), quebrado = Object.assign(JSON.parse(JSON.stringify(d2)), { t: tk + 500, s: null });
  confere(Q.aplica(C, quebrado) === false && C.tick === tk && C.score.join() === sc.join(), 'o quadro sem o placar (fora do formato): ignorado inteiro, nada muda pela metade', [C.tick, tk]);
  const comJogadorRuim = Object.assign(JSON.parse(JSON.stringify(d2)), { j: [null, 'x'].concat(d2.j.slice(2)) });
  let ok3 = true; try { ok3 = Q.aplica(C, comJogadorRuim) === true; } catch (_) { ok3 = false; }
  confere(ok3 && Q.deEvento(C, ['pw', 0, 1.5]) === null && Q.deEvento(C, ['gp', 0, '2']) === null, 'o jogador que não é lista é pulado e o poder com índice quebrado não entra');
  let c2 = null; try { c2 = Q.comando({ seq: 7, x: { valueOf: 1, toString: 1 }, y: '0.5', f: { valueOf: 1 } }); } catch (_) { c2 = 'derrubou'; }
  confere(c2 && c2.seq === 7 && c2.x === 0 && c2.y === 0 && c2.f === 0 && Q.comando({ seq: '7' }) === null, 'o comando com "números" que não são número: vira parado, sem derrubar a mensagem (e a seq em texto não vale)', c2);
}

/* ---------------------------------------------------------------- 8) o servidor de verdade por WebSocket */
console.log('\n8) o servidor das salas de verdade (WebSocket)');
const porta = await new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const srv = spawn('node', [path.join(RAIZ, 'tests', 'servidor_visitantes.cjs'), '--porta', String(porta), '--host', '127.0.0.1', '--memoria', '--nome', 'Teste do Rachão', '--sem-p2p'],
  { env: Object.assign({}, process.env, { RACHA_CONTAGEM_MS: '600' }), stdio: ['ignore', 'pipe', 'pipe'] });
let logSrv = ''; srv.stdout.on('data', b => { logSrv += b; }); srv.stderr.on('data', b => { logSrv += b; });
const dorme = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 80; i++) { const ok2 = await new Promise(r => { const s = net.connect(porta, '127.0.0.1', () => { s.end(); r(true); }); s.on('error', () => r(false)); }); if (ok2) break; await dorme(100); }
function cliente(nome, extra) {
  const c = { nome, msgs: [], id: null, token: null };
  c.abre = () => new Promise((res, rej) => {
    c.ws = new WebSocket('ws://127.0.0.1:' + porta + '/');
    c.ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } c.msgs.push(m); if (m.type === 'hello') { c.id = m.id; c.token = m.token; } };
    c.ws.onopen = () => { c.manda(Object.assign({ type: 'hello', name: nome, token: c.token || undefined, v93: 1 }, extra || {})); res(); };
    c.ws.onerror = rej;
  });
  c.manda = o => c.ws.send(JSON.stringify(o));
  c.espera = async (f, ms) => { const t1 = Date.now() + (ms || 4000); while (Date.now() < t1) { const m = c.msgs.find(f); if (m) return m; await dorme(20); } return null; };
  c.ultimo = f => { for (let i = c.msgs.length - 1; i >= 0; i--) if (f(c.msgs[i])) return c.msgs[i]; return null; };
  c.fecha = () => { try { c.ws.close(); } catch (_) {} };
  return c;
}
const A = cliente('Ana', { rch: 1 }), B = cliente('Beto', { rch: 1 }), V = cliente('Velho');
try {
  await A.abre(); await B.abre(); await V.abre();
  await A.espera(m => m.type === 'hello'); await B.espera(m => m.type === 'hello'); await V.espera(m => m.type === 'hello');
  confere(!!A.id && !!B.id && !!V.id, 'as três conexões entram (Ana e Beto com a página nova; o Velho com a página antiga)');
  confere(A.ultimo(m => m.type === 'hello').rch === 1 && V.ultimo(m => m.type === 'hello').rch === 1, 'o hello do servidor diz que ele tem as salas do Rachão (rch: 1): o aparelho só oferece criar quando tem');
  A.manda({ type: 'create', rachao: { campo: 'classico', modo: 'match', tempo: 60, gols: 3, nivel: 'facil' }, n: 2, bots: true, pub: true, name: 'Rachão da Ana' });
  const rs = await A.espera(m => m.type === 'rachao_sala'), rm = await A.espera(m => m.type === 'room' && m.room && m.room.rachao);
  confere(rs && rs.campo === 'classico' && rs.estadio === null && rm && rm.room.rachao.info.nome === 'Clássico' && rm.room.n === 2 && rm.room.E === 2 && rm.room.servidor && rm.room.admin === A.id && !rm.room.mapa,
    'a Ana cria a sala do Rachão no Clássico: o campo chega (rachao_sala) antes da sala, que é do servidor, com ela de admin', rm && rm.room.rachao);
  const code = rm.room.code;
  confere(/Partida · 2x2 · 1 min ou até 3 gols/.test(rm.room.rachao.resumo), 'o resumo da sala: a Partida, 2x2, 1 min ou até 3 gols', rm.room.rachao.resumo);
  B.manda({ type: 'list' }); V.manda({ type: 'list' }); await dorme(300);
  const lB = B.ultimo(m => m.type === 'rooms'), lV = V.ultimo(m => m.type === 'rooms');
  confere(lB && lB.list.some(s => s.code === code && s.rachao && s.rachao.nome === 'Clássico') && lV && !lV.list.some(s => s.code === code), 'a sala aparece na lista da página nova (com o campo) e NÃO na da página antiga');
  V.manda({ type: 'join', code });
  const eV = await V.espera(m => m.type === 'error');
  confere(eV && eV.codigo === 'rachao_velho' && /atualize o jogo/.test(eV.message), 'a página antiga não entra na sala do Rachão (o aviso para atualizar o jogo)', eV);
  B.manda({ type: 'join', code });
  const bRs = await B.espera(m => m.type === 'rachao_sala' && m.code === code), bRm = await B.espera(m => m.type === 'room' && m.room && m.room.code === code);
  confere(bRs && bRm, 'o Beto entra pelo código: recebe o campo e a sala');
  B.manda({ type: 'seat', team: 1 }); await dorme(250);
  let sala = A.ultimo(m => m.type === 'room').room;
  confere(sala.roster[0] === A.id && sala.roster[2] === B.id, 'o Beto vai para o Azul (a Ana está no Vermelho)', sala.roster);
  // o admin troca para um estádio da Oficina de estádios
  const nA = A.msgs.length, nB = B.msgs.length;
  A.manda({ type: 'config', rachao: { estadio: docTeste(), modo: 'chaos', tempo: 120, gols: 2, corrida: 'sempre', chutes: { superKick: false } } });
  const rs2 = await B.espera(m => m.type === 'rachao_sala' && m.estadio && B.msgs.indexOf(m) >= nB);
  await dorme(200);
  sala = A.ultimo(m => m.type === 'room').room;
  confere(rs2 && rs2.estadio.nome === 'Arena do Teste' && rs2.hash === e1.info.hash && sala.rachao.opc.modo === 'chaos' && sala.rachao.opc.chutes.superKick === false && sala.rachao.info.estadio,
    'nos AJUSTES, o admin troca para um estádio dele (o estádio vai para todos) e para o Caos de 2 min, sem super chute', sala.rachao);
  B.manda({ type: 'config', rachao: { campo: 'lua' } }); await dorme(200);
  confere(A.ultimo(m => m.type === 'room').room.rachao.info.estadio === true, 'quem não é admin não muda a sala');
  A.manda({ type: 'config', rachao: { campo: 'nada' } });
  const eC = await A.espera(m => m.type === 'error' && A.msgs.indexOf(m) >= nA);
  confere(eC && /não existe/.test(eC.message), 'campo que não existe nos ajustes: o aviso, e a sala continua como estava', eC);
  A.manda({ type: 'config', rachao: { campo: 'classico', modo: 'match', tempo: 60, gols: 3 } }); await dorme(300);
  // a partida
  A.manda({ type: 'start' });
  const st = await B.espera(m => m.type === 'start' && m.room && m.room.rachao), cont = await B.espera(m => m.type === 'contagem');
  confere(st && Array.isArray(st.room.rachao.lugares) && st.room.rachao.lugares.join() === '0,1,2,3' && cont && cont.ms === 600, 'COMEÇAR: todos recebem o começo com os lugares da partida e a contagem 3, 2, 1 do servidor', st && st.room.rachao);
  const q1 = await B.espera(m => m.type === 'rq');
  confere(q1 && q1.d.j.length === 4 && q1.d.b.length === 1 && q1.round === st.room.round, 'os quadros da partida chegam (os 4 jogadores e a bola)');
  await dorme(700);
  let seq = 0; const q0 = A.ultimo(m => m.type === 'rq'), x0 = q0.d.j[0][0], y0 = q0.d.j[0][1];
  for (let i = 0; i < 45; i++) { A.manda({ type: 'input', seq: ++seq, x: 0, y: 1, f: 2 }); await dorme(16); }
  const qa = A.ultimo(m => m.type === 'rq'), qb = B.ultimo(m => m.type === 'rq');
  confere(qa && qa.d.a[0] > 20 && qa.d.j[0][1] - y0 > 25 && qb && Math.abs(qb.d.t - qa.d.t) < 6, 'os comandos da Ana mexem a tampinha dela no servidor (o ack sobe) e o Beto vê o mesmo quadro', { ack: qa && qa.d.a, y: [y0, qa && qa.d.j[0][1]] });
  {
    const nP = B.msgs.length; A.manda({ type: 'pause', paused: true }); await dorme(350);
    const tAntes = B.ultimo(m => m.type === 'rq').d.t; await dorme(250); const tDepois = B.ultimo(m => m.type === 'rq').d.t;
    confere(!B.msgs.slice(nP).some(m => m.type === 'pause') && tDepois > tAntes + 6, '(depois da revisão) a sala do Rachão não pausa: o pedido de pausa é ignorado e os quadros continuam', [tAntes, tDepois]);
  }
  // o Beto cai e volta
  const tokB = B.token; B.fecha(); await dorme(400);
  let qq = A.ultimo(m => m.type === 'rq');
  confere(qq && (qq.d.j[2][5] & 128), 'o Beto caiu: um bot assume a tampinha dele no meio da partida (no quadro, o lugar dele é de bot)');
  const B2 = cliente('Beto', { rch: 1 }); B2.token = tokB; await B2.abre();
  await B2.espera(m => m.type === 'hello');
  B2.manda({ type: 'join', code, slot: 2 });             // (o aparelho volta para o mesmo lugar: a Oficina faz isso sozinha em até 90 s)
  const st2 = await B2.espera(m => m.type === 'start' && m.resume, 5000);
  await dorme(300); qq = A.ultimo(m => m.type === 'rq');
  confere(st2 && st2.room.rachao && qq && !(qq.d.j[2][5] & 128) && B2.msgs.some(m => m.type === 'rachao_sala'), 'o Beto volta (o mesmo token): o campo, o começo com a retomada e a tampinha dele de volta', st2 && st2.resume);
  // os gols (o gancho de teste pede o gol ao motor do Rachão) e o fim
  for (let g = 0; g < 3; g++) { A.manda({ type: '__teste_gol', time: 0 }); await dorme(2700); }
  const res = await A.espera(m => m.type === 'result', 8000), resB = await B2.espera(m => m.type === 'result', 3000);
  confere(res && res.rachao && res.score.join() === '3,0' && res.winner === 0 && res.valida && res.jog.find(j => j.id === A.id).gols === 3 && resB && resB.score.join() === '3,0',
    'três gols da Ana: a partida acaba no servidor (até 3 gols) e o resultado chega para os dois, com os gols de cada um', res);
  await dorme(200);
  confere(A.ultimo(m => m.type === 'room').room.state === 'ended', 'a sala volta a esperar o admin (dá para jogar de novo)');
  A.manda({ type: 'cupCreate' });
  const eCopa = await A.espera(m => m.type === 'error' && /copa/i.test(m.message || ''), 3000);
  confere(eCopa && /Rachão/.test(eCopa.message) && !A.ultimo(m => m.type === 'room').room.tournament, '(depois da revisão) a copa dos amigos não é para a sala do Rachão (o aviso, e nada de copa)', eCopa);
  const evs = A.msgs.filter(m => m.type === 'rq').flatMap(m => m.d.ev || []);
  confere(evs.some(e => e[0] === 'g') && evs.some(e => e[0] === 'fc') && evs.some(e => e[0] === 'wh'), 'os gols, os confetes e os apitos passaram nos quadros');
  // o estádio grande demais e o ritmo de criar
  A.manda({ type: 'create', rachao: { estadio: enorme } });
  const eG = await A.espera(m => m.type === 'error' && /grande demais/.test(m.message));
  confere(!!eG, 'criar sala com o estádio grande demais: recusado com o aviso');
} catch (e) { confere(false, 'o teste pelo WebSocket rodou até o fim', String(e && e.stack || e)); }
finally { for (const c of [A, B, V]) c.fecha(); srv.kill(); }
if (falhou) console.log('\n--- o log do servidor ---\n' + logSrv.slice(-3000));
console.log('\n' + ok + ' verificações ok, ' + falhou + ' falharam (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
process.exit(falhou ? 1 : 0);
