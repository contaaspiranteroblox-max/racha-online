// RACHA v92 · OFICINA — o motor dos mapas personalizados (server/partida/mapa.js), sem navegador.
// Confere:
//   1. a VALIDAÇÃO (limpa): o que vem de fora é limpo, cortado e conferido; o malformado é recusado;
//   2. a FIDELIDADE: com o perfil Clássico e o campo das salas, o passo do mapa dá EXATAMENTE as mesmas posições do núcleo
//      (nucleo.js) — tique a tique, nas batidas de linha, canto, trave, rede, tampinha × bola e tampinha × tampinha;
//   3. o DETERMINISMO: o mesmo mapa e a mesma semente dão os mesmos quadros (bots, objetos que se movem, lógica);
//   4. os gols de até 4 times, o dono do gol, o gol contra (as três regras), o gol neutro, o desvio;
//   5. as zonas (velocidade, lentidão, impulso, esteira, pontos, reinício, eliminação e a sobrevivência), os portais, os
//      botões, os portões (manual e por ciclo), as barreiras temporárias, os cronômetros e a LÓGICA (com o limite);
//   6. os objetos que se movem empurram a bola; o giro tem a ponta limitada;
//   7. o quadro da rede e o aplicaQuadro (a previsão do aparelho continua do quadro);
//   8. os avisos e erros do editor (problemas), o limite de complexidade e o desempenho com 16 jogadores;
//   9. as regras do goleiro, o teto do MOVER e o custo da grade;
//  10. a aparência da bola (branca, colorida, a do RACHA) e das sombras, e a bola sozinha no motor (o LANÇAR do editor).
// Uso: node tests/oficina_mapa_test.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const M = require('../server/partida/mapa.js');
const N = require('../server/partida/nucleo.js');

let ok = 0; const falhas = [];
const confere = (c, o, d) => { if (c) { ok++; console.log('  OK      ' + o); } else { falhas.push(o); console.log('  FALHOU  ' + o + (d !== undefined ? '  ·  ' + JSON.stringify(d).slice(0, 400) : '')); } return c; };
const t0 = Date.now();
const U = N.U;

// um mapa de teste: campo + objetos + regras (passa pelo limpa, como tudo que vem de fora)
function mapa(o) {
  const r = M.limpa(Object.assign({ formato: 'racha-mapa', v: 1, nome: 'teste', campo: { w: 71, h: 50, margem: 7.5, margemY: 5 }, partida: { equipes: 2, porTime: 1 },
    objetos: [{ id: 'gA', tipo: 'gol', x: -35.5, y: 0, rot: 180, largura: 16, prof: 6.6, dono: 0 }, { id: 'gB', tipo: 'gol', x: 35.5, y: 0, rot: 0, largura: 16, prof: 6.6, dono: 1 }], logica: [] }, o));
  if (!r.ok) throw new Error('mapa de teste recusado: ' + JSON.stringify(r.erros));
  return r.mapa;
}
// uma partida só com humanos parados (ninguém mexe sem a gente mandar) — o teste põe as posições
function partida(m, n, extra) {
  const jog = []; for (let i = 0; i < m.partida.equipes * (n || m.partida.porTime); i++) jog.push({ netId: 'h' + i, nome: 'H' + i });
  return M.novaPartida(m, Object.assign({ jogadores: jog, porTime: n || m.partida.porTime }, extra));
}
const longe = (P, q) => { q.x = P.G.GL + 30 + q.i * 50; q.y = P.G.GT + 30; q.vx = q.vy = 0; };   // tira a tampinha do caminho
function anda(P, n, entrada) { for (let i = 0; i < n && !P.encerrado; i++) P.passo(entrada); }

console.log('1) a validação (limpa)');
{
  confere(!M.limpa(null).ok && !M.limpa([1, 2]).ok && !M.limpa('x').ok, 'o que não é objeto é recusado');
  confere(!M.limpa({ formato: 'outro' }).ok, 'formato de outro jogo é recusado');
  confere(!M.limpa({ formato: 'racha-mapa', v: 9 }).ok, 'versão desconhecida é recusada');
  const grande = { formato: 'racha-mapa', v: 1, descricao: 'x'.repeat(200000) };
  confere(!M.limpa(grande).ok && /grande demais/.test(M.limpa(grande).erros[0]), 'mapa grande demais é recusado');
  const r = M.limpa({ formato: 'racha-mapa', v: 1, nome: '  <b>Meu‮ mapa\u0000</b>  ', campo: { w: 99999, h: -5, forma: 'hexagono' },
    partida: { equipes: 9, porTime: 50 }, objetos: [
      { id: 'a', tipo: 'parede', x: 9999, y: 'xx', comp: 1e9, esp: -1, colide: 'tudo', quique: 7 },
      { id: 'a', tipo: 'parede' }, { id: 'b c', tipo: 'parede' }, { id: 'z', tipo: 'foguete' }, null, 5,
      { id: 'p1', tipo: 'portal', par: 'nao-existe' }, { id: 's1', tipo: 'spawn', equipe: 7 },
      { id: 'g1', tipo: 'gol', dono: 3 }], logica: [{ quando: { tipo: 'botao', alvo: 'nada' }, entao: [{ acao: 'abrir', alvo: 'a' }] },
      { quando: { tipo: 'tempo', seg: 5 }, entao: [{ acao: 'rm -rf' }, { acao: 'mensagem', texto: 'oi' }, { acao: 'abrir' }] },
      { quando: { tipo: 'inicio' }, entao: [{ acao: 'eval', codigo: 'alert(1)' }] }] });
  confere(r.ok, 'o mapa estranho é aceito depois de limpo', r.erros);
  const m = r.mapa;
  confere(m.nome === 'bMeu mapa/b', 'o nome perde < >, controles e os invisíveis que invertem o texto', m.nome);
  confere(m.campo.w === M.LIM.campoW[1] && m.campo.h === M.LIM.campoH[0] && m.campo.forma === 'retangulo', 'o campo é cortado nos limites e a forma desconhecida vira retângulo', m.campo);
  confere(m.partida.equipes === 4 && m.partida.porTime === 4, '9 equipes viram 4; o time cabe em 16 jogadores no total', m.partida);
  const a = m.objetos.find(o => o.id === 'a');
  confere(a && a.x === M.LIM.coordX && a.y === 0 && a.comp === 240 && a.esp === 0.1 && a.colide === 'todos' && a.quique === 1.2, 'os números do objeto são cortados (o texto vira o padrão)', a);
  confere(m.objetos.filter(o => o.id === 'a').length === 1, 'o id repetido sai');
  confere(!m.objetos.some(o => o.id === 'b c' || o.id === 'z'), 'id inválido e tipo desconhecido saem');
  confere(m.objetos.find(o => o.id === 'p1').par === '', 'o par do portal que não existe é apagado');
  confere(m.objetos.find(o => o.id === 's1').equipe === 3, 'o spawn de um time que não existe vai para o último');
  confere(m.logica.length === 1 && m.logica[0].entao.length === 1 && m.logica[0].entao[0].acao === 'mensagem', 'a lógica só fica com ações da lista e com o alvo que existe', m.logica);
  confere(r.avisos.length > 0, 'quem importa recebe os avisos do que mudou', r.avisos.length);
  const json = JSON.stringify(m);
  confere(!/eval|alert|rm -rf/.test(json), 'nenhum código de fora sobra no mapa');
  // texto com emoji e acento continua (só o perigoso sai)
  confere(M.texto('Arena do Zé ⚽ 🔥', 40) === 'Arena do Zé ⚽ 🔥', 'acento e emoji continuam no texto');
  // o limite de objetos e de gols
  const muitos = []; for (let i = 0; i < 500; i++) muitos.push({ id: 'o' + i, tipo: 'decoracao', x: (i % 40) - 20, y: Math.floor(i / 40) - 6 });
  const r2 = M.limpa({ formato: 'racha-mapa', v: 1, objetos: muitos });
  confere(r2.ok && r2.mapa.objetos.length === M.LIM.objetos, 'mais de ' + M.LIM.objetos + ' objetos: ficam os primeiros', r2.mapa && r2.mapa.objetos.length);
  const gols = []; for (let i = 0; i < 20; i++) gols.push({ id: 'g' + i, tipo: 'gol', x: -30 + i * 3, y: 20, dono: -1, largura: 2 });
  confere(M.limpa({ formato: 'racha-mapa', v: 1, objetos: gols }).mapa.objetos.filter(o => o.tipo === 'gol').length === M.LIM.gols, 'no máximo ' + M.LIM.gols + ' gols');
  // a complexidade de verdade (depois de compilar)
  const arcos = []; for (let i = 0; i < 70; i++) arcos.push({ id: 'a' + i, tipo: 'arco', x: (i % 10) * 6 - 30, y: Math.floor(i / 10) * 6 - 20, raio: 2, abertura: 360 });
  const r3 = M.limpa({ formato: 'racha-mapa', v: 1, campo: { w: 120, h: 80 }, objetos: arcos.concat(arcos.map(a => Object.assign({}, a, { id: 'b' + a.id.slice(1), y: a.y + 2 }))) });
  confere(!r3.ok && /peças demais/.test(r3.erros[0]), 'peças demais para colidir: o mapa é recusado (celular intermediário)', r3.erros);
  // o JSON depois de limpo passa de novo igual (idempotente)
  const de2 = M.limpa(JSON.parse(json));
  confere(de2.ok && JSON.stringify(de2.mapa) === json, 'limpar duas vezes dá o mesmo mapa (exportar e importar não muda nada)');
}

console.log('2) a fidelidade: o perfil Clássico no campo das salas = o núcleo, tique a tique');
{
  const m = mapa({ partida: { equipes: 2, porTime: 2, raioSaida: 10 } });
  const G = M.compila(m), C = N.resolve(N.PERFIL_V92);
  // o campo das salas (o novoCampo(2) do núcleo) com o mesmo centro do mapa: as mesmas contas, com o CX/CY daqui
  function campoSalas(CX, CY) {
    // (v95: os campos das salas ficaram 30% maiores; o mapa clássico da Oficina continua com as medidas do 2v2 de antes — o motor é o mesmo)
    const md = { jog: [86, 60], bola: [71, 50], gol: [6.6, 16], trave: .5 }, pw = U(md.jog[0]), ph = U(md.jog[1]), bw = U(md.bola[0]), bh = U(md.bola[1]);
    const K = { n: 2, CX, CY, GL: CX - pw / 2, GR: CX + pw / 2, GT: CY - ph / 2, GB: CY + ph / 2, LX0: CX - bw / 2, LX1: CX + bw / 2, LY0: CY - bh / 2, LY1: CY + bh / 2 };
    K.GOL_PROF = U(md.gol[0]); K.GOL_Y0 = CY - U(md.gol[1]) / 2; K.GOL_Y1 = CY + U(md.gol[1]) / 2; K.POST_R = U(md.trave) / 2;
    K.POSTS = [[K.LX0, K.GOL_Y0], [K.LX0, K.GOL_Y1], [K.LX1, K.GOL_Y0], [K.LX1, K.GOL_Y1]];
    const PL = { x0: K.LX0 - K.GOL_PROF, x1: K.LX0 }, PR = { x0: K.LX1, x1: K.LX1 + K.GOL_PROF };
    K.NET_SEGS = [[PL.x0, K.GOL_Y0, PL.x1, K.GOL_Y0], [PL.x0, K.GOL_Y1, PL.x1, K.GOL_Y1], [PL.x0, K.GOL_Y0, PL.x0, K.GOL_Y1],
      [PR.x0, K.GOL_Y0, PR.x1, K.GOL_Y0], [PR.x0, K.GOL_Y1, PR.x1, K.GOL_Y1], [PR.x1, K.GOL_Y0, PR.x1, K.GOL_Y1]];
    K.WALL_SEGS = [[K.LX0, K.LY0, K.LX1, K.LY0], [K.LX0, K.LY1, K.LX1, K.LY1], [K.LX0, K.LY0, K.LX0, K.GOL_Y0], [K.LX0, K.GOL_Y1, K.LX0, K.LY1],
      [K.LX1, K.LY0, K.LX1, K.GOL_Y0], [K.LX1, K.GOL_Y1, K.LX1, K.LY1]];
    K.circ = U(10);
    return K;
  }
  const K = campoSalas(G.CX, G.CY);
  confere(K.GL === G.GL && K.GT === G.GT && K.LX0 === G.LX0 && K.LY1 === G.LY1, 'o campo das salas e o mapa clássico têm a mesma área (bit a bit)');
  // um cenário: bola + 4 tampinhas (posições e comandos fixos) nos dois motores
  function cenario(nome, ini, cmds, ticks) {
    const P = partida(m, 2); P.estado = 'jogo';
    const Mn = { G: K, B: N.novaBola(C, 0, 0), jog: [], estado: 'jogo', saidaTime: 0, jogo: 'futebol' };
    for (let i = 0; i < 4; i++) { const q = P.jog[i]; Mn.jog.push({ x: 0, y: 0, vx: 0, vy: 0, r: C.R_JOG, m: C.MASSA_JOG, mx: 0, my: 0, time: q.time }); }
    ini(P.B, P.jog, G); ini(Mn.B, Mn.jog, G);
    let dif = null, golM = -1, golN = -1;
    const cb = { toques: () => {}, gol: () => { if (golN < 0) golN = tk; return 'para'; } };
    let tk = 0;
    for (tk = 0; tk < ticks && !dif; tk++) {
      for (let i = 0; i < 4; i++) { const c = cmds(tk, i) || [0, 0]; P.jog[i].mx = Mn.jog[i].mx = c[0]; P.jog[i].my = Mn.jog[i].my = c[1]; }
      if (P.estado === 'jogo') M.__interno.fisica(P);
      if (golM < 0 && P.estado === 'gol') golM = tk;
      if (golN < 0) N.passo(Mn, C, cb);
      if (golM >= 0 || golN >= 0) break;
      const a = [P.B.x, P.B.y, P.B.vx, P.B.vy, P.B.w].concat(...P.jog.map(q => [q.x, q.y, q.vx, q.vy]));
      const b = [Mn.B.x, Mn.B.y, Mn.B.vx, Mn.B.vy, Mn.B.w].concat(...Mn.jog.map(q => [q.x, q.y, q.vx, q.vy]));
      for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) { dif = { tick: tk, k, mapa: a[k], nucleo: b[k] }; break; }
    }
    confere(!dif && golM === golN, nome + ' (' + tk + ' tiques' + (golM >= 0 ? ', gol no tique ' + golM : '') + ')', dif || { golM, golN });
  }
  const parados = () => [0, 0];
  const poe = (bola, jog, sit) => (B, J) => { Object.assign(B, bola, { w: bola.w || 0 }); J.forEach((q, i) => { Object.assign(q, sit[i]); }); };
  const fora4 = G2 => [{ x: G2.GL + 40, y: G2.GT + 40 }, { x: G2.GL + 140, y: G2.GT + 40 }, { x: G2.GR - 140, y: G2.GB - 40 }, { x: G2.GR - 40, y: G2.GB - 40 }];
  const F4 = fora4(G);
  cenario('a bola no canto de cima à direita (linha × linha, com giro)', poe({ x: G.CX + 300, y: G.CY - 200, vx: 700, vy: -650, w: 3 }, null, F4), parados, 400);
  cenario('a bola no canto de baixo à direita (a ordem das linhas)', poe({ x: G.CX + 300, y: G.CY + 200, vx: 720, vy: 690 }, null, F4), parados, 400);
  cenario('a bola na trave e na rede, de raspão', poe({ x: G.CX + 400, y: G.CY - 190, vx: 800, vy: 60 }, null, F4), parados, 400);
  cenario('a bola entrando no gol (o tique do gol é o mesmo)', poe({ x: G.CX + 400, y: G.CY + 20, vx: 820, vy: -30 }, null, F4), parados, 400);
  cenario('a bola na quina da trave com a linha', poe({ x: G.CX + 500, y: G.CY - 300, vx: 300, vy: 260 }, null, F4), parados, 400);
  cenario('as tampinhas correndo na bola e umas nas outras',
    poe({ x: G.CX, y: G.CY }, null, [{ x: G.CX - 300, y: G.CY - 100 }, { x: G.CX - 300, y: G.CY + 100 }, { x: G.CX + 300, y: G.CY - 100 }, { x: G.CX + 300, y: G.CY + 100 }]),
    (tk, i) => { const a = (i < 2 ? 0 : Math.PI) + (i % 2 ? 0.25 : -0.25) + (tk > 90 ? Math.sin(tk / 17 + i) : 0); return [Math.cos(a), Math.sin(a)]; }, 600);
  cenario('a tampinha entrando no gol (a rede e a trave seguram a tampinha)',
    poe({ x: G.CX, y: G.CY + 300 }, null, [{ x: G.CX + 500, y: G.CY - 60 }, { x: G.CX + 520, y: G.CY + 140 }, { x: G.GL + 60, y: G.GT + 60 }, { x: G.GL + 160, y: G.GT + 60 }]),
    (tk, i) => i < 2 ? [1, i ? -0.2 : 0.15] : [0, 0], 300);
}

console.log('3) o determinismo (a mesma conta no servidor, no TESTAR e na previsão)');
{
  const m = mapa({ campo: { w: 90, h: 60 }, partida: { equipes: 2, porTime: 3, tempo: 0, meta: 99 },
    objetos: [{ id: 'gA', tipo: 'gol', x: -45, y: 0, rot: 180, largura: 18, dono: 0 }, { id: 'gB', tipo: 'gol', x: 45, y: 0, rot: 0, largura: 18, dono: 1 },
      { id: 'm1', tipo: 'parede', x: 0, y: -14, comp: 12, mov: { tipo: 'vaivem', dx: 0, dy: 10, vel: 8 } },
      { id: 'm2', tipo: 'obstaculo', forma: 'retangulo', x: 18, y: 12, w: 8, h: 2, mov: { tipo: 'girar', vel: 20 } },
      { id: 'z1', tipo: 'zona', x: -20, y: 15, w: 14, h: 10, efeito: 'impulso', forca: 40, dir: 0 },
      { id: 'b1', tipo: 'botao', x: 0, y: 22 }, { id: 'pt', tipo: 'portao', x: 30, y: -20, comp: 10, rot: 90 }],
    logica: [{ quando: { tipo: 'botao', alvo: 'b1' }, entao: [{ acao: 'alternar', alvo: 'pt' }] }, { quando: { tipo: 'a_cada', seg: 7 }, entao: [{ acao: 'mensagem', texto: 'vai!' }] }] });
  const roda = seed => { const P = M.novaPartida(m, { seed }); const qs = []; for (let i = 0; i < 3600; i++) { P.passo(); if (i % 30 === 0) qs.push(JSON.stringify(P.quadro())); } return { qs, P }; };
  const a = roda(42), b = roda(42), c = roda(43);
  confere(a.qs.join('|') === b.qs.join('|'), 'a mesma semente: os mesmos quadros por 1 minuto (bots, objetos que se movem, botão, lógica)');
  confere(a.qs.join('|') !== c.qs.join('|'), 'outra semente: outra partida (a mira dos bots)');
  const sane = q => Number.isFinite(q.x) && Number.isFinite(q.y) && q.x >= a.P.G.GL - 1 && q.x <= a.P.G.GR + 1 && q.y >= a.P.G.GT - 1 && q.y <= a.P.G.GB + 1;
  confere(a.P.jog.every(sane) && Number.isFinite(a.P.B.x) && Number.isFinite(a.P.B.y), 'ninguém sai do mundo nem vira NaN');
  confere(a.P.placar[0] + a.P.placar[1] > 0, 'os bots fazem gol no mapa novo', a.P.placar);
  let src = M.novaPartida.toString() + M.compila.toString();
  confere(!/Math\.random\s*\(|Date\.now\s*\(|performance\.now\s*\(|new Date\b/.test(require('fs').readFileSync(new URL('../server/partida/mapa.js', import.meta.url), 'utf8')), 'o arquivo do mapa não usa Math.random, Date.now nem o relógio');
}

console.log('4) os gols: até 4 times, o dono do gol, o gol contra, o gol neutro e o desvio');
{
  const quatro = (extra) => mapa(Object.assign({ campo: { forma: 'quadrado', w: 70, h: 70 }, partida: Object.assign({ equipes: 4, porTime: 1 }, extra || {}),
    objetos: [{ id: 'g0', tipo: 'gol', x: -35, y: 0, rot: 180, largura: 14, dono: 0 }, { id: 'g1', tipo: 'gol', x: 35, y: 0, rot: 0, largura: 14, dono: 1 },
      { id: 'g2', tipo: 'gol', x: 0, y: -35, rot: 270, largura: 14, dono: 2 }, { id: 'g3', tipo: 'gol', x: 0, y: 35, rot: 90, largura: 14, dono: 3 }] }));
  // chuta do ponto (x, y) na direção do gol k com o jogador j
  function golDe(P, j, k) {
    const g = P.G.gols[k], q = P.jog[j]; P.estado = 'jogo';
    for (const o of P.jog) if (o !== q) longe(P, o);
    const bx = g.cx - g.nx * U(8), by = g.cy - g.ny * U(8);
    P.B.x = bx; P.B.y = by; P.B.vx = P.B.vy = 0;
    q.x = bx - g.nx * (q.r + P.C.R_BOLA + 2); q.y = by - g.ny * (q.r + P.C.R_BOLA + 2);
    const okc = M.__interno.chuta(P, q, P.C.FORCA_POWER);
    let gol = null; P.onGol = x => { gol = x; };
    anda(P, 60);
    return { okc, gol, placar: P.placar.slice() };
  }
  {
    const P = partida(quatro()); const r = golDe(P, 2, 0);
    confere(r.okc && r.gol && r.gol.time === 2 && r.placar.join() === '0,0,1,0', 'o time C chuta no gol do time A: ponto do C', r);
  }
  {
    const P = partida(quatro()); const r = golDe(P, 3, 1);
    confere(r.gol && r.gol.time === 3 && r.placar.join() === '0,0,0,1', 'o time D no gol do B: ponto do D', r);
  }
  {
    const P = partida(quatro()); M.__interno.lance; P.toques.push({ p: P.jog[1], t0: 0, tick: 0, chute: -1 });   // o B tocou antes
    const r = golDe(P, 0, 0);
    confere(r.gol && r.gol.contra && r.gol.time === 1 && r.placar.join() === '0,1,0,0', 'gol contra (regra "adversário"): o ponto vai para o último adversário que tocou', r);
  }
  {
    const P = partida(quatro({ golContra: 'menos1' })); P.placar[0] = 2;
    const r = golDe(P, 0, 0);
    confere(r.placar.join() === '1,0,0,0', 'gol contra (regra "menos 1"): o dono perde um ponto', r.placar);
  }
  {
    const P = partida(quatro({ golContra: 'nada' }));
    const r = golDe(P, 0, 0);
    confere(r.placar.join() === '0,0,0,0' && P.estado === 'gol', 'gol contra (regra "nada"): ninguém pontua, a bola volta', r.placar);
  }
  {
    const m = mapa({ objetos: [{ id: 'gN', tipo: 'gol', x: 0, y: -15, rot: 270, largura: 10, dono: -1, pontos: 3 }] });
    const P = partida(m); const r = golDe(P, 1, 0);
    confere(r.gol && r.gol.time === 1 && r.placar.join() === '0,3', 'o gol neutro: o time de quem chutou faz os pontos do gol (3)', r);
  }
  {
    const m = mapa({ partida: { equipes: 2, porTime: 1, meta: 2 } });
    const P = partida(m); let fim = null; P.onFim = x => { fim = x; };
    golDe(P, 0, 1); anda(P, M.GOL_TICKS + 5); golDe(P, 0, 1); anda(P, M.GOL_TICKS + M.FIM_TICKS + 10);
    confere(fim && fim.vencedor === 0 && fim.placar.join() === '2,0' && P.encerrado, 'a meta de gols encerra a partida com o vencedor', fim);
  }
  {   // o desvio: A chuta no gol do B, o B só raspa → o gol é do A (não é contra)
    const m = mapa();
    const P = partida(m); P.estado = 'jogo';
    const g = P.G.gols[1], a = P.jog[0], b = P.jog[1];
    P.B.x = g.cx - U(20); P.B.y = g.cy; a.x = P.B.x - (a.r + P.C.R_BOLA + 2); a.y = g.cy; b.x = g.cx - U(6); b.y = g.cy + b.r + P.C.R_BOLA - 3;
    M.__interno.chuta(P, a, P.C.FORCA_POWER);
    let gol = null; P.onGol = x => { gol = x; }; anda(P, 80);
    confere(gol && gol.time === 0 && !gol.contra, 'o desvio de quem defende não vira gol contra: o gol é de quem chutou', gol);
  }
  {   // a detecção por área
    const m = mapa({ objetos: [{ id: 'gA', tipo: 'gol', x: -35.5, y: 0, rot: 180, largura: 16, dono: 0 }, { id: 'gB', tipo: 'gol', x: 35.5, y: 0, rot: 0, largura: 16, dono: 1, det: 'area' }] });
    const P = partida(m); const r = golDe(P, 0, 1);
    confere(r.gol && r.gol.time === 0, 'o gol com detecção por área também vale', r);
  }
}

console.log('5) as zonas, os portais, os botões, os portões, as barreiras e os cronômetros');
{
  const z = (efeito, o) => mapa({ objetos: [Object.assign({ id: 'z', tipo: 'zona', x: 0, y: 0, w: 30, h: 30, efeito }, o || {})] });
  {   // velocidade e lentidão: o teto da tampinha
    const vel = f => { const P = partida(z(f > 1 ? 'velocidade' : 'lentidao', { fator: f, afeta: 'jogadores' })); P.estado = 'jogo'; const q = P.jog[0]; longe(P, P.jog[1]); q.x = P.G.CX - U(10); q.y = P.G.CY + U(5); P.B.x = P.G.CX; P.B.y = P.G.CY - U(12); const x0 = q.x; anda(P, 20, j => { if (j === q) { j.mx = 1; j.my = 0; } }); return (q.x - x0) / 20; };
    const n = (() => { const P = partida(mapa()); P.estado = 'jogo'; const q = P.jog[0]; longe(P, P.jog[1]); q.x = P.G.CX - U(10); q.y = P.G.CY + U(5); P.B.y = P.G.CY - U(12); const x0 = q.x; anda(P, 20, j => { if (j === q) { j.mx = 1; j.my = 0; } }); return (q.x - x0) / 20; })();
    const r = vel(1.6), l = vel(0.5);
    confere(Math.abs(r / n - 1.6) < 0.05 && Math.abs(l / n - 0.5) < 0.05, 'a zona de velocidade (×1,6) e a de lentidão (×0,5) mudam o teto da tampinha', { n, r, l });
  }
  {   // impulso na bola
    const P = partida(z('impulso', { forca: 60, dir: 0, afeta: 'bola' })); P.estado = 'jogo'; for (const q of P.jog) longe(P, q);
    P.B.x = P.G.CX; P.B.y = P.G.CY; anda(P, 30);
    confere(P.B.vx > U(20) && Math.abs(P.B.vy) < 1, 'a zona de impulso empurra a bola na direção dela', [P.B.vx, P.B.vy]);
  }
  {   // esteira: leva quem está em cima
    const P = partida(z('esteira', { forca: 6, dir: 90, afeta: 'todos' })); P.estado = 'jogo'; const q = P.jog[0]; longe(P, P.jog[1]);
    q.x = P.G.CX + U(3); q.y = P.G.CY - U(5); P.B.x = P.G.CX - U(8); P.B.y = P.G.CY - U(8); const y0 = q.y, by0 = P.B.y;
    anda(P, 60);
    confere(Math.abs((q.y - y0) - U(6)) < 2 && Math.abs((P.B.y - by0) - U(6)) < 30, 'a esteira leva a tampinha e a bola (6 u/s)', [q.y - y0, P.B.y - by0]);
  }
  {   // pontos: a bola entra na zona
    const P = partida(z('pontos', { equipe: 1, pontosZ: 2, w: 8, h: 8, x: 10, reinicia: false })); P.estado = 'jogo'; for (const q of P.jog) longe(P, q);
    P.B.x = P.G.CX - U(5); P.B.y = P.G.CY; P.B.vx = U(30); anda(P, 60);
    confere(P.placar.join() === '0,2' && P.estado === 'jogo', 'a zona de pontos dá os pontos ao time dela (sem parar a partida)', [P.placar, P.estado]);
  }
  {   // reinício: a bola volta para o spawn
    const m = mapa({ objetos: [{ id: 'z', tipo: 'zona', x: 20, y: 0, w: 6, h: 30, efeito: 'reinicio', afeta: 'bola' }, { id: 'sb', tipo: 'spawnBola', x: -10, y: 5 }] });
    const P = partida(m); P.estado = 'jogo'; for (const q of P.jog) longe(P, q);
    P.B.x = P.G.CX + U(10); P.B.y = P.G.CY; P.B.vx = U(30); anda(P, 30);
    confere(Math.abs(P.B.x - (P.G.CX + U(-10))) < 1 && Math.abs(P.B.y - (P.G.CY + U(5))) < 1 && P.B.vx === 0, 'a zona de reinício põe a bola no spawn da bola', [P.B.x - P.G.CX, P.B.y - P.G.CY]);
  }
  {   // eliminação e sobrevivência
    const m = mapa({ campo: { w: 60, h: 40 }, partida: { equipes: 2, porTime: 1, vitoria: 'sobrevivencia', meta: 2 }, objetos: [{ id: 'lava', tipo: 'zona', x: 20, y: 0, w: 10, h: 40, efeito: 'elimina', afeta: 'jogadores' }] });
    const P = partida(m); P.estado = 'jogo'; const q = P.jog[1]; q.x = P.G.CX + U(10); q.y = P.G.CY; P.jog[0].x = P.G.CX - U(20);
    anda(P, 40, j => { if (j === q) { j.mx = 1; j.my = 0; } });
    confere(P.placar.join() === '1,0', 'quem entra na zona de eliminação sai; o time que sobra vence a rodada', [P.placar, q.fora]);
    anda(P, M.GOL_TICKS + 2);
    confere(P.estado === 'saida' && !q.fora, 'a rodada recomeça com todo mundo de volta');
  }
  {   // portais
    const m = mapa({ objetos: [{ id: 'pa', tipo: 'portal', x: -10, y: 0, raio: 2, par: 'pb', afeta: 'todos' }, { id: 'pb', tipo: 'portal', x: 10, y: 15, raio: 2, par: 'pa', afeta: 'todos', saida: 'angulo', dir: 270 }] });
    const P = partida(m); P.estado = 'jogo'; for (const q of P.jog) longe(P, q);
    P.B.x = P.G.CX - U(16); P.B.y = P.G.CY; P.B.vx = U(25); let ev = 0; P.onEvento = e => { if (e.t === 'portal') ev++; };
    anda(P, 25);
    confere(ev === 1 && Math.abs(P.B.x - (P.G.CX + U(10))) < U(1) && P.B.y < P.G.CY + U(15) && P.B.vy < 0 && Math.abs(P.B.vx) < 1, 'o portal leva a bola para o par e solta no ângulo dele', [P.B.x - P.G.CX, P.B.y - P.G.CY, P.B.vx, P.B.vy, ev]);
    const q = P.jog[0]; q.x = P.G.CX - U(13); q.y = P.G.CY; anda(P, 30, j => { if (j === q) { j.mx = 1; j.my = 0; } });
    confere(q.x > P.G.CX + U(9) && Math.abs(q.y - (P.G.CY + U(15) - U(2) - q.r - 2)) < 15 && q.y < P.G.CY + U(15), 'o portal também leva a tampinha (afeta todos): sai no ângulo do par', [q.x - P.G.CX, q.y - P.G.CY]);
  }
  {   // botão → portão (a lógica) + o portão por ciclo + a barreira temporária + o cronômetro
    const m = mapa({ objetos: [{ id: 'bt', tipo: 'botao', x: -20, y: 15, raio: 2 }, { id: 'pt', tipo: 'portao', x: 10, y: 0, comp: 30, rot: 90 },
      { id: 'cic', tipo: 'portao', x: -25, y: -10, comp: 6, ciclo: 2, tempoAberto: 1 }, { id: 'tmp', tipo: 'parede', x: 0, y: 20, comp: 10, temp: 1.5 },
      { id: 'cr', tipo: 'cronometro', seg: 2, repete: true }],
      logica: [{ quando: { tipo: 'botao', alvo: 'bt' }, entao: [{ acao: 'abrir', alvo: 'pt' }] }, { quando: { tipo: 'cronometro', alvo: 'cr' }, entao: [{ acao: 'mensagem', texto: 'tic' }] }] });
    const P = partida(m); P.estado = 'jogo'; longe(P, P.jog[1]);
    const bola = (vx) => { P.B.x = P.G.CX - U(5); P.B.y = P.G.CY; P.B.vx = vx; P.B.vy = 0; };
    bola(U(30)); const q = P.jog[0]; q.x = P.G.CX - U(30); q.y = P.G.CY - U(20); anda(P, 30);
    confere(P.B.x < P.G.CX + U(10), 'o portão fechado segura a bola', P.B.x - P.G.CX);
    q.x = P.G.CX - U(20); q.y = P.G.CY + U(15); anda(P, 2);
    bola(U(30)); anda(P, 40);
    confere(P.B.x > P.G.CX + U(10) + P.C.R_BOLA, 'pisou no botão: a lógica abriu o portão e a bola passa', P.B.x - P.G.CX);
    const k = P.G.dinamicos.indexOf(P.G.porId.get('cic')), est = [];
    const P2 = partida(m); for (let i = 0; i < 240; i++) { P2.passo(); est.push(P2.D[P2.G.porId.get('cic')].aberto ? 1 : 0); }
    confere(est.slice(0, 59).every(v => v) && est.slice(59, 119).every(v => !v) && est[119] && est[125], 'o portão automático abre 1 s a cada 2 s', est.join('').slice(0, 130));
    confere(P2.D[P2.G.porId.get('tmp')].on === false && P.D[P.G.porId.get('tmp')].on === true, 'a barreira temporária (1,5 s) fica no começo e some depois do tempo dela');
    let tics = 0; const P3 = partida(m); P3.onEvento = e => { if (e.t === 'mensagem' && e.texto === 'tic') tics++; }; anda(P3, 60 * 7);
    confere(tics === 3, 'o cronômetro de 2 s que repete dispara 3 vezes em 7 s (e a lógica escreve a mensagem)', tics);
  }
  {   // a lógica não trava: uma regra que se chama sem parar
    const m = mapa({ objetos: [{ id: 'z', tipo: 'zona', x: 10, y: 0, w: 6, h: 6, efeito: 'nada', afeta: 'bola' }],
      logica: [{ quando: { tipo: 'gol' }, entao: [{ acao: 'pontos', equipe: 0, valor: 1 }] }, { quando: { tipo: 'bola_entra', alvo: 'z' }, entao: [{ acao: 'pontos', equipe: 1, valor: 1 }] }] });
    const P = partida(m); P.estado = 'jogo'; for (const q of P.jog) longe(P, q);
    P.B.x = P.G.CX; P.B.y = P.G.CY; P.B.vx = U(20); const t = Date.now(); anda(P, 30);
    confere(Date.now() - t < 1000 && P.placar[0] > 0 && P.placar[0] < 100, 'QUANDO gol → ENTÃO pontos (que é gol) não entra em laço: para no limite de profundidade', P.placar);
  }
  {   // o tempo e o "a cada"
    const m = mapa({ logica: [{ quando: { tipo: 'tempo', seg: 3 }, entao: [{ acao: 'mensagem', texto: 'tres' }] }, { quando: { tipo: 'a_cada', seg: 2 }, entao: [{ acao: 'mensagem', texto: 'dois' }] }] });
    const P = partida(m); P.estado = 'jogo'; for (const q of P.jog) longe(P, q); P.B.x = P.G.CX + U(5);
    const ms = []; P.onEvento = e => { if (e.t === 'mensagem') ms.push(e.texto + '@' + Math.round(P.t * 10) / 10); };
    anda(P, 60 * 7);
    confere(ms.filter(x => x.startsWith('tres')).length === 1 && ms.filter(x => x.startsWith('dois')).length === 3, 'o QUANDO de tempo dispara uma vez; o "a cada 2 s" dispara a cada 2 s de jogo', ms);
  }
}

console.log('6) os objetos que se movem');
{
  const m = mapa({ objetos: [{ id: 'mv', tipo: 'parede', x: -10, y: 0, comp: 20, rot: 90, esp: 1, mov: { tipo: 'vaivem', dx: 20, dy: 0, vel: 12 } }] });
  const P = partida(m); P.estado = 'jogo'; for (const q of P.jog) longe(P, q);
  P.B.x = P.G.CX + U(2); P.B.y = P.G.CY; P.B.vx = P.B.vy = 0;
  anda(P, 60);
  confere(P.B.vx > U(5) || P.B.x > P.G.CX + U(6), 'a parede que anda empurra a bola parada', [P.B.x - P.G.CX, P.B.vx]);
  const o = { tipo: 'obstaculo', forma: 'retangulo', w: 80, h: 1, mov: { tipo: 'girar', vel: 60 } };
  const T = M.movEm(o, 1), ponta = T.da * 40;   // (40 u da ponta, em 1 s)
  confere(ponta <= M.LIM.velMov + 0.01, 'a ponta de quem gira fica no máximo de ' + M.LIM.velMov + ' u/s (não atravessa a bola)', ponta);
  const vv = { tipo: 'parede', comp: 4, esp: 1, mov: { tipo: 'vaivem', dx: 100, dy: 0, vel: 40 } };
  let vmax = 0; for (let i = 1; i < 600; i++) vmax = Math.max(vmax, Math.abs(M.movEm(vv, i / 60).dx - M.movEm(vv, (i - 1) / 60).dx) * 60 / U(1));
  confere(vmax <= M.LIM.velMov + 0.5, 'o vaivém mais rápido também fica no máximo', vmax);
  const ida = M.movEm(vv, 0), meio = M.movEm({ ...vv, mov: { ...vv.mov, vel: 10 } }, 10);
  confere(ida.dx === 0 && Math.abs(meio.dx - U(100)) < 1, 'o vaivém começa no lugar e chega ao fim do caminho na metade da volta', [ida.dx, meio.dx / U(1)]);
}

console.log('7) o quadro da rede e a previsão');
{
  const m = mapa({ partida: { equipes: 3, porTime: 2 }, objetos: [{ id: 'g0', tipo: 'gol', x: -35.5, y: 0, rot: 180, dono: 0 }, { id: 'g1', tipo: 'gol', x: 35.5, y: 0, rot: 0, dono: 1 }, { id: 'g2', tipo: 'gol', x: 0, y: -25, rot: 270, dono: 2 },
    { id: 'mv', tipo: 'parede', x: 0, y: 10, comp: 8, mov: { tipo: 'circular', raio: 4, vel: 5 } }, { id: 'pt', tipo: 'portao', x: 20, y: 15, comp: 6, ciclo: 3, tempoAberto: 1 }] });
  const P = M.novaPartida(m, { seed: 5 });
  anda(P, 900);
  const q = P.quadro(), txt = JSON.stringify(q);
  confere(txt.length < 2600, 'o quadro de 6 jogadores com objetos cabe em ' + txt.length + ' bytes');
  const Q = M.novaPartida(m, { previsao: true, jogadores: P.jog.map(x => ({ humano: true, nome: x.nome })) });
  M.aplicaQuadro(Q, JSON.parse(txt));
  const d = Math.max(Math.abs(Q.B.x - P.B.x), Math.abs(Q.B.y - P.B.y), ...P.jog.map((x, i) => Math.hypot(x.x - Q.jog[i].x, x.y - Q.jog[i].y)));
  const di = P.G.porId.get('mv'), dT = Math.hypot(P.D[di].T.dx - Q.D[di].T.dx, P.D[di].T.dy - Q.D[di].T.dy);
  confere(d <= 0.06 && dT < 1e-9 && Q.placar.join() === P.placar.join() && Q.estado === P.estado && Q.tick === P.tick, 'o aparelho põe o quadro na partida local: as mesmas posições (0,05 px), o mesmo objeto, placar e estado', { d, dT });
  confere(Q.D[P.G.porId.get('pt')].aberto === P.D[P.G.porId.get('pt')].aberto, 'o estado do portão vem no quadro');
}

console.log('7b) a troca de lado no intervalo (2 times, com tempo)');
{
  const m = mapa({ partida: { equipes: 2, porTime: 1, tempo: 1, meta: 0, trocaLados: true }, objetos: [{ id: 'gA', tipo: 'gol', x: -35.5, y: 0, rot: 180, largura: 16, dono: 0 }, { id: 'gB', tipo: 'gol', x: 35.5, y: 0, rot: 0, largura: 16, dono: 1 },
    { id: 's0', tipo: 'spawn', equipe: 0, x: -20, y: 0 }, { id: 's1', tipo: 'spawn', equipe: 1, x: 20, y: 0 }] });
  const P = partida(m); let troca = 0; P.onEvento = e => { if (e.t === 'troca') troca++; };
  P.estado = 'jogo'; for (const q of P.jog) longe(P, q); P.B.x = P.G.CX; P.B.y = P.G.CY - U(15);
  anda(P, 60 * 31);
  const a = P.jog[0];
  confere(troca === 1 && P.trocado && P.estado === 'saida', 'no meio do tempo os times trocam de lado (e tem uma saída nova)', { troca, t: P.t, estado: P.estado });
  confere(a.x > P.G.CX, 'o time A agora nasce do lado direito', a.x - P.G.CX);
  // depois da troca, o gol da direita (do time B no mapa) é o que o time A defende: a bola nele é ponto do B
  P.estado = 'jogo'; const g = P.G.gols[1], b = P.jog[1]; longe(P, a);
  P.B.x = g.cx - U(8); P.B.y = g.cy; P.B.vx = P.B.vy = 0; b.x = P.B.x - (b.r + P.C.R_BOLA + 2); b.y = g.cy;
  M.__interno.chuta(P, b, P.C.FORCA_POWER); anda(P, 40);
  confere(P.placar.join() === '0,1', 'depois da troca: o time B chuta no gol da direita (agora do A) e faz o ponto', P.placar);
  const q = P.quadro(); confere(q.tr === 1, 'a troca vai no quadro (o aparelho desenha as cores dos gols trocadas)');
}

console.log('8) os avisos do editor, o mapa vazio e o desempenho');
{
  const r = M.limpa({ formato: 'racha-mapa', v: 1, objetos: [{ id: 'w', tipo: 'obstaculo', x: 0, y: 0, w: 20, h: 20 }, { id: 'sb', tipo: 'spawnBola', x: 0, y: 0 }] });
  confere(!r.ok && r.erros.some(e => /spawn da bola/.test(e)), 'o spawn da bola dentro de um obstáculo é erro (não dá para jogar)', r.erros);
  const r2 = M.limpa({ formato: 'racha-mapa', v: 1, objetos: [{ id: 'sb', tipo: 'spawnBola', x: 140, y: 0 }] });
  confere(!r2.ok && r2.erros.some(e => /fora do mapa/.test(e)), 'o spawn da bola fora do mapa é erro', r2.erros);
  const r3 = M.limpa({ formato: 'racha-mapa', v: 1, objetos: [{ id: 'w', tipo: 'obstaculo', x: -20, y: 0, w: 6, h: 6 }, { id: 's', tipo: 'spawn', equipe: 0, x: -20, y: 0 }, { id: 'p', tipo: 'portal', x: 10, y: 10 }] });
  confere(r3.ok && r3.avisos.some(e => /nascimento está dentro/.test(e)) && r3.avisos.some(e => /sem par/.test(e)), 'o spawn dentro de obstáculo e o portal sem par viram aviso', r3.avisos);
  const v = M.mapaVazio();
  confere(v.objetos.length === 2 && v.partida.equipes === 2 && M.limpa(v).ok, 'o mapa vazio tem os dois gols e passa na validação');
  // o desempenho: 16 jogadores (4 × 4 bots) num mapa cheio de coisas
  const objs = [];
  for (let i = 0; i < 4; i++) objs.push({ id: 'g' + i, tipo: 'gol', x: [-50, 50, 0, 0][i], y: [0, 0, -38, 38][i], rot: [180, 0, 270, 90][i], dono: i, largura: 14 });
  for (let i = 0; i < 40; i++) objs.push({ id: 'm' + i, tipo: i % 2 ? 'parede' : 'obstaculo', forma: 'circulo', w: 2, h: 2, comp: 5, x: (i % 8) * 10 - 35, y: Math.floor(i / 8) * 12 - 24, mov: { tipo: i % 3 ? 'vaivem' : 'girar', dx: 3, vel: 4 } });
  for (let i = 0; i < 60; i++) objs.push({ id: 'o' + i, tipo: 'arco', x: (i % 12) * 8 - 44, y: Math.floor(i / 12) * 14 - 28, raio: 1.5, abertura: 180, rot: i * 30 });
  for (let i = 0; i < 20; i++) objs.push({ id: 'z' + i, tipo: 'zona', x: (i % 5) * 18 - 36, y: Math.floor(i / 5) * 16 - 24, w: 6, h: 6, efeito: ['velocidade', 'lentidao', 'impulso', 'esteira'][i % 4] });
  const rp = M.limpa({ formato: 'racha-mapa', v: 1, campo: { w: 100, h: 76 }, partida: { equipes: 4, porTime: 4 }, objetos: objs });
  confere(rp.ok, 'o mapa pesado (4 × 4, 40 móveis, 60 arcos, 20 zonas) passa na validação', rp.erros);
  if (rp.ok) {
    const P = M.novaPartida(rp.mapa, { seed: 9 }); const t = process.hrtime.bigint();
    anda(P, 1800);
    const ms = Number(process.hrtime.bigint() - t) / 1e6 / 1800;
    confere(ms < 1.5, 'o passo do mapa pesado leva ' + ms.toFixed(3) + ' ms (o servidor aguenta muitas salas)', ms);
    confere(P.jog.every(q => Number.isFinite(q.x) && Number.isFinite(q.y)) && Number.isFinite(P.B.x), 'no mapa pesado ninguém vira NaN');
  }
}

console.log('\n9) as regras do goleiro (a área de cada gol com dono), o teto do MOVER e o custo da grade');
{
  // 3 por time e o Goleiro ligado: a vaga 2 de cada time é o goleiro (papel gk)
  const base = (areaGol, goleiroPreso) => mapa({ partida: { equipes: 2, porTime: 3, goleiro: true, areaGol, goleiroPreso } });
  const naArea = (P, q, g) => { const rx = q.x - g.cx, ry = q.y - g.cy, d = -(rx * g.nx + ry * g.ny), s = rx * g.ux + ry * g.uy; return d > -q.r && d < g.area.prof + q.r && Math.abs(s) < g.area.meia + q.r; };
  const centroArea = (g) => [g.cx - g.nx * g.area.prof * 0.5, g.cy - g.ny * g.area.prof * 0.5];
  const solta = (P) => { for (const q of P.jog) longe(P, q); P.estado = 'jogo'; };
  { // livre: ninguém é empurrado
    const P = partida(base('livre', false)), g = P.G.gols[0]; solta(P);
    const q = P.jog[0]; [q.x, q.y] = centroArea(g); anda(P, 3);
    confere(naArea(P, q, g), 'área LIVRE: o zagueiro fica na própria área');
  }
  { // defesa: o zagueiro (linha) do Time A não fica na área do gol A; o goleiro fica; o atacante do B entra
    const P = partida(base('defesa', false)), gA = P.G.gols[0]; solta(P);
    const z = P.jog[0], gk = P.jog[2], at = P.jog[3];
    confere(gk.papel === 'gk' && z.papel === 'campo', 'com 3 por time e o Goleiro ligado, a última vaga é o goleiro');
    [z.x, z.y] = centroArea(gA); [gk.x, gk.y] = centroArea(gA); gk.y += U(4); [at.x, at.y] = centroArea(gA); at.y -= U(4);
    anda(P, 3);
    confere(!naArea(P, z, gA) && naArea(P, gk, gA) && naArea(P, at, gA), 'área "só o goleiro do time": o zagueiro sai da área; o goleiro e o atacante ficam', [naArea(P, z, gA), naArea(P, gk, gA), naArea(P, at, gA)]);
    // andando para dentro: a tampinha para na borda (não atravessa)
    const P2 = partida(base('defesa', false)), g2 = P2.G.gols[0]; solta(P2);
    const z2 = P2.jog[0]; z2.x = g2.cx - g2.nx * U(14); z2.y = g2.cy;
    anda(P2, 240, q => { if (q === z2) { q.mx = g2.nx; q.my = g2.ny; } else q.mx = q.my = 0; });
    confere(!naArea(P2, z2, g2) && Math.abs(-((z2.x - g2.cx) * g2.nx + (z2.y - g2.cy) * g2.ny) - (g2.area.prof + z2.r)) < 2, 'o zagueiro correndo para o próprio gol para na borda da área', -((z2.x - g2.cx) * g2.nx + (z2.y - g2.cy) * g2.ny));
  }
  { // todos: nem o atacante entra; o goleiro fica
    const P = partida(base('todos', false)), gA = P.G.gols[0]; solta(P);
    const gk = P.jog[2], at = P.jog[3];
    [gk.x, gk.y] = centroArea(gA); [at.x, at.y] = centroArea(gA); at.y -= U(4);
    anda(P, 3);
    confere(naArea(P, gk, gA) && !naArea(P, at, gA), 'área "só o goleiro, para todos": o atacante também sai; o goleiro fica', [naArea(P, gk, gA), naArea(P, at, gA)]);
  }
  { // goleiro preso: correndo para o meio, ele para na borda da área
    const P = partida(base('livre', true)), gA = P.G.gols[0]; solta(P);
    const gk = P.jog[2]; [gk.x, gk.y] = centroArea(gA);
    anda(P, 240, q => { if (q === gk) { q.mx = -gA.nx; q.my = -gA.ny; } else q.mx = q.my = 0; });
    const d = -((gk.x - gA.cx) * gA.nx + (gk.y - gA.cy) * gA.ny);
    confere(d <= gA.area.prof + 0.01 && d > gA.area.prof - U(1), 'o goleiro preso correndo para o meio para no limite da área', [d, gA.area.prof]);
    const P2 = partida(base('livre', true)); solta(P2);
    const outro = P2.jog[0], g = P2.G.gols[0]; outro.x = g.cx - g.nx * U(20); outro.y = g.cy; anda(P2, 3);
    confere(-((outro.x - g.cx) * g.nx + (outro.y - g.cy) * g.ny) > U(19), '…e o jogador de linha anda livre');
  }
  { // trocou de lado no intervalo: a área que vale é a do gol que o time defende agora
    const P = partida(base('defesa', false)), gB = P.G.gols[1]; solta(P); P.trocado = true;
    const z = P.jog[0]; [z.x, z.y] = centroArea(gB); anda(P, 3);
    confere(!naArea(P, z, gB), 'depois da troca de lado, o zagueiro do Time A sai da área do gol que ele defende agora (o do lado B)');
  }
  { // o editor avisa: sem gol com dono, ou sem goleiro
    const r1 = M.limpa({ formato: 'racha-mapa', v: 1, campo: { w: 71, h: 50 }, partida: { equipes: 2, porTime: 2, areaGol: 'defesa' }, objetos: [{ id: 'gA', tipo: 'gol', x: -35.5, y: 0, rot: 180, largura: 16, dono: 0 }] });
    const r2 = M.limpa({ formato: 'racha-mapa', v: 1, campo: { w: 71, h: 50 }, partida: { equipes: 2, porTime: 2, areaGol: 'defesa' }, objetos: [{ id: 'gN', tipo: 'gol', x: 35.5, y: 0, rot: 0, largura: 16, dono: -1 }] });
    confere(r1.ok && r1.avisos.some(a => /sem goleiro/.test(a)) && r2.ok && r2.avisos.some(a => /gol com dono/.test(a)), 'o editor avisa: a área sem goleiro fica fechada para o time inteiro; sem gol com dono a regra não vale', [r1.avisos, r2.avisos]);
    const r3 = M.limpa({ formato: 'racha-mapa', v: 1, campo: { w: 71, h: 50 }, partida: { areaGol: 'xis', goleiroPreso: 'sim' } });
    confere(r3.mapa.partida.areaGol === 'livre' && r3.mapa.partida.goleiroPreso === false, 'valores que não existem viram o padrão (livre, sem goleiro preso)');
  }
  { // o MOVER com 0 s não passa do teto de velocidade (a parede não atravessa a bola)
    const m3 = mapa({ objetos: [{ id: 'w1', tipo: 'parede', x: 0, y: -20, comp: 10 }], logica: [{ id: 'r1', quando: { tipo: 'inicio' }, entao: [{ acao: 'mover', alvo: 'w1', dx: 200, dy: 0, seg: 0 }] }] });
    const P = M.novaPartida(m3, {}), i = P.G.porId.get('w1'); let max = 0;
    for (let k = 0; k < 900; k++) { P.passo(); max = Math.max(max, Math.hypot(P.D[i].vx, P.D[i].vy)); }
    confere(max / U(1) <= M.LIM.velMov + 0.01 && Math.abs(P.D[i].ox / U(1) - 200) < 0.01, 'MOVER 200 u em "0 s": chega lá, mas no máximo a ' + M.LIM.velMov + ' u/s (' + (max / U(1)).toFixed(1) + ')', max / U(1));
    // o VOLTAR em "0 s" depois (a parede já longe): também volta no teto
    const m4 = mapa({ objetos: [{ id: 'w1', tipo: 'parede', x: 0, y: -20, comp: 10 }], logica: [{ id: 'r1', quando: { tipo: 'inicio' }, entao: [{ acao: 'mover', alvo: 'w1', dx: 200, dy: 0, seg: 0 }] },
      { id: 'r2', quando: { tipo: 'tempo', seg: 9 }, entao: [{ acao: 'voltar', alvo: 'w1', seg: 0 }] }] });
    const P4 = M.novaPartida(m4, {}), i4 = P4.G.porId.get('w1'); P4.estado = 'jogo'; let max4 = 0, voltou = -1;
    for (let k = 0; k < 1500; k++) { P4.passo(); if (P4.tj > 9 * 60) { max4 = Math.max(max4, Math.hypot(P4.D[i4].vx, P4.D[i4].vy)); if (voltou < 0 && Math.abs(P4.D[i4].ox) < 0.01 && !P4.D[i4].tw) voltou = k; } }
    confere(voltou > 0 && max4 / U(1) <= M.LIM.velMov + 0.01, 'o VOLTAR em "0 s" também volta no máximo a ' + M.LIM.velMov + ' u/s (' + (max4 / U(1)).toFixed(1) + ')', [voltou, max4 / U(1)]);
  }
  { // o custo da grade: o mapa feito para pesar é recusado rápido; um mapa grande de verdade passa
    const pts = []; for (let k = 0; k < 48; k++) pts.push(k % 2 ? [100, 70] : [-100, -70]);
    const lin = []; for (let k = 0; k < 49; k++) lin.push({ id: 'l' + k, tipo: 'linha', pontos: pts });
    const circ = []; for (let k = 0; k < 400; k++) circ.push({ id: 'c' + k, tipo: 'obstaculo', forma: 'circulo', x: 0, y: 0, w: 150, h: 150 });
    let pior = 0;
    for (const objetos of [lin, circ]) { const t = Date.now(); const r = M.limpa({ formato: 'racha-mapa', v: 1, campo: { w: 220, h: 160, margem: 40 }, objetos }); pior = Math.max(pior, Date.now() - t); if (r.ok) pior = 1e9; }
    confere(pior < 400, 'mapas feitos para pesar (49 linhas cruzando o campo; 400 círculos gigantes) são recusados em ' + pior + ' ms (o servidor não trava)', pior);
    const lab = []; for (let k = 0; k < 120; k++) lab.push({ id: 'p' + k, tipo: 'parede', x: -100 + (k % 12) * 18, y: -70 + Math.floor(k / 12) * 15, comp: 14, rot: (k * 37) % 180 });
    const r = M.limpa({ formato: 'racha-mapa', v: 1, campo: { w: 220, h: 160, margem: 10 }, objetos: lab.concat([{ id: 'sb', tipo: 'spawnBola', x: 0, y: 77 }]) });
    const G = r.mapa && M.compila(r.mapa);
    confere(r.ok && G.grade && G.nCel < M.LIM.celulas / 4, 'um mapa gigante de verdade (120 paredes) passa, longe do teto da grade (' + (G && G.nCel) + ' de ' + M.LIM.celulas + ')', r.erros);
  }
}

console.log('\n10) a bola da Oficina (a aparência), as sombras e a bola sozinha no motor (o LANÇAR A BOLA do editor)');
{
  const m0 = mapa({});
  confere(m0.aparencia.bola === 'branca' && m0.aparencia.corBola === '#ffd23f' && m0.aparencia.sombras === true,
    'sem dizer nada (os mapas de antes também), a bola é a BRANCA de contorno preto e as peças têm sombra', m0.aparencia);
  const m1 = mapa({ aparencia: { bola: 'arco-iris', corBola: 'javascript:alert(1)', sombras: 'sim' } });
  confere(m1.aparencia.bola === 'branca' && m1.aparencia.corBola === '#ffd23f' && m1.aparencia.sombras === true, 'estilo, cor e sombra inválidos voltam ao padrão (nada de texto solto)', m1.aparencia);
  const m2 = mapa({ aparencia: { bola: 'cor', corBola: '#FF3B3B', sombras: false } }), m3 = mapa({ aparencia: { bola: 'racha' } });
  confere(m2.aparencia.bola === 'cor' && /^#ff3b3b$/i.test(m2.aparencia.corBola) && m2.aparencia.sombras === false && m3.aparencia.bola === 'racha' && M.BOLAS.join() === 'branca,racha,cor,jogador',
    'a bola colorida (com a cor), a do RACHA e a sombra desligada ficam como o criador escolheu', [m2.aparencia, m3.aparencia.bola]);
  const ida = JSON.parse(JSON.stringify(m2)), volta = M.limpa(ida);
  confere(volta.ok && JSON.stringify(volta.mapa.aparencia) === JSON.stringify(m2.aparencia), 'a aparência nova vai e volta igual (o servidor guarda e manda o mesmo mapa para a sala)');
  // a bola sozinha (as vagas vazias, como o editor lança): o chute reto entra no gol do Time B e vale para o A; na parede ela volta
  const vazias = () => Array.from({ length: 16 }, () => ({ vazio: true }));
  const P = M.novaPartida(m0, { jogadores: vazias() }); P.estado = 'jogo';
  confere(P.jog.every(q => q.fora), 'a partida sem ninguém: todas as vagas ficam fora (só a bola anda)');
  const gols = []; P.onGol = g => gols.push(g);
  P.B.x = P.G.CX; P.B.y = P.G.CY; P.B.vx = U(34); P.B.vy = 0;
  anda(P, 240);
  confere(gols.length === 1 && gols[0].time === 0 && gols[0].gol === 'gB', 'o chute reto do meio (34 u/s, a força do CHUTE) entra no gol do Time B e o ponto é do Time A', gols);
  const evGol = P.ev.filter(e => e.gol === 'gB');
  confere(evGol.length === 1 && evGol[0].t === 'gol' && typeof evGol[0].seg === 'number' && evGol[0].time === 0,
    'o EVENTO do gol diz "gol" (o tempo do jogo vai em seg: antes ele apagava o tipo e o GOL DO TIME… não aparecia na tela)', evGol.map(e => [e.t, e.seg]));
  const P2 = M.novaPartida(m0, { jogadores: vazias() }); P2.estado = 'jogo';
  P2.B.x = P2.G.CX; P2.B.y = P2.G.CY; P2.B.vx = 0; P2.B.vy = -U(30);
  let virou = -1; for (let k = 0; k < 180; k++) { P2.passo(); if (P2.B.vy > 0) { virou = k; break; } }
  confere(virou > 0 && P2.B.y > P2.G.GT, 'o chute para cima bate na linha do campo e volta (a batida que o editor mostra)', [virou, P2.B.y]);
  const P3 = M.novaPartida(m0, { jogadores: vazias() }), P4 = M.novaPartida(m0, { jogadores: vazias() });
  for (const Q of [P3, P4]) { Q.estado = 'jogo'; Q.B.x = Q.G.CX + 40; Q.B.y = Q.G.CY + 20; Q.B.vx = U(25); Q.B.vy = -U(19); anda(Q, 200); }
  confere(P3.B.x === P4.B.x && P3.B.y === P4.B.y, 'o mesmo lançamento dá o mesmo caminho (a prévia antes de soltar é o que acontece depois)', [P3.B.x, P4.B.x]);
}

console.log('\noficina_mapa: ' + ok + '/' + (ok + falhas.length) + ' verificações ok em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
for (const f of falhas) console.log('  - falhou: ' + f);
process.exit(falhas.length ? 1 : 0);
