/* =====================================================================================================================
   RACHÃO · A OFICINA DE ESTÁDIOS (app/public/game/rachao/estadios.js · RACHA v97)
   O pedido: "adicione esse rachão na oficina de criação com várias opções de edição". O Rachão continua com o motor dele
   (a física, os 17 campos e os 8 modos do arquivo enviado pelo dono do jogo); este arquivo, carregado depois do jogo, junta:
     1) o ESTÁDIO como documento — o formato do campo, os gols, o piso, a física, as peças (com espelho), o vento, os
        poderes e a partida —, a limpeza de tudo o que entra (do aparelho ou de um código colado) e a montagem no formato
        dos campos do jogo (MAPS): os estádios criados entram na lista de campos de todos os modos vistos de cima;
     2) a guarda no aparelho (localStorage 'rachao.estadios', até 40 estádios), o código para compartilhar (RACHAO1.…) e a
        miniatura (a Oficina do RACHA mostra os estádios com ela);
     3) as telas novas: SEUS ESTÁDIOS (criar do zero ou a partir de um dos 17 campos, colar código, duplicar, apagar) e o
        EDITOR (o campo desenhado pelo próprio motor; pôr, mover, girar, esticar e apagar peças; o espelho; o ímã; desfazer
        e refazer; o salvamento automático; as abas Campo, Gols, Piso, Física, Vento, Poderes e Partida), o TESTAR
        (bate-bola ou partida rápida no estádio) e o JOGAR (a preparação do Contra bots já com o estádio);
     4) dentro da Oficina do RACHA (a página aberta numa moldura, ?na=oficina): o VOLTAR PARA A OFICINA e as rotas que a
        Oficina pede (#inicio, #estadios, #novo, #importar, #editar=ID, #jogar=ID).
   Depois do teste ("faltou pôr o modo sem cavadinha, sem curva, sem super chute" e "dá pra mesclar a física da bola do
   Rachão no RACHA, ao contrário também"): os CHUTES do estádio (aba Partida: a cavadinha, a curva e o super chute ligam e
   desligam; "Só o Chutar" tira os três — a partida, os bots e a preparação respeitam) e o MISTURAR COM O RACHA (aba Física:
   a bola, o jogador e o chute do RACHA, cada um sozinho, pela ponte da física — ponte.js), com os números novos que isso
   pede: a velocidade máxima da bola, o quique no pé, o peso no contato, o fundo da rede e o jeito de andar (com embalo,
   o do Rachão, ou direto, o do RACHA).
   Nada aqui fala com a internet: o Rachão roda inteiro no aparelho. Texto de quem joga só entra na tela como texto.
   ===================================================================================================================== */
(function () {
'use strict';
if (typeof MAPS === 'undefined' || typeof App === 'undefined' || typeof buildStadium !== 'function') return;

/* ---------------------------------------------------------------- 0) o básico */
const VERSAO = 1, CHAVE = 'rachao.estadios', MAX_ESTADIOS = 40, LIM_CODIGO = 24000, PREFIXO = 'RACHAO1.';
const ORIGINAIS = MAPS.slice();                                   // (os 17 campos do Rachão, antes dos estádios de quem joga)
const ORIG_POR_ID = {}; for (const m of ORIGINAIS) ORIG_POR_ID[m.id] = m;
const PARAMS = new URLSearchParams(location.search);
const NA_OFICINA = PARAMS.get('na') === 'oficina' && window.parent !== window;   // aberto pela Oficina do RACHA (numa moldura)
const VOLTA_RACHA = PARAMS.get('volta') === 'racha';             // aberto pela Oficina do RACHA numa aba (sem a moldura)
const ALVO = location.origin && location.origin !== 'null' ? location.origin : '*';
const PHYS_PADRAO = basePhys();

const LIM = {
  nome: 28, desc: 90, W: [240, 800], H: [130, 380], canto: [0, 240], impulso: [0, 12], circulo: [24, 150], margem: [20, 90],
  gol: [16, 170], fundo: [18, 80], recuo: [40, 300], forca: [2, 14], len: [20, 420], th: [4, 22], a: [-90, 90],
  r: { poste: [5, 40], bumper: [8, 40], vaso: [8, 36], lama: [14, 140], poca: [14, 140] },
  bola: [0.85, 0.999], andar: [0.2, 1], freio: [0.9, 1], ventoForca: [0.25, 3], ventoTroca: [2, 20], poder: [3, 30],
  pecas: 48, copias: 160
};
const TIPOS = ['poste', 'bumper', 'vaso', 'cerca', 'lama', 'poca'];
const N_TIPO = { poste: 'Poste', bumper: 'Para-choque', vaso: 'Vaso', cerca: 'Cerca viva', lama: 'Lama', poca: 'Poça' };
const PECA_PADRAO = { poste: { r: 10 }, bumper: { r: 20, forca: 8.5 }, vaso: { r: 20 }, cerca: { len: 64, th: 14, a: 0 },
  lama: { r: 46, bola: 0.955, andar: 0.6, freio: 0.95 }, poca: { r: 38, bola: 0.93, andar: 0.85, freio: 1 } };
const SIMS = ['n', 'x', 'y', 'xy', 'c'];
const N_SIM = { n: 'Só uma', x: 'Dos dois lados', y: 'Em cima e embaixo', xy: 'Nos 4 cantos', c: 'Do outro lado, girada' };
const PISOS = [['grass', 'Grama'], ['stadium', 'Estádio'], ['check', 'Xadrez'], ['wood', 'Madeira'], ['asphalt', 'Asfalto'], ['dirt', 'Terra'],
  ['sand', 'Areia'], ['ice', 'Gelo'], ['night', 'Noite'], ['rain', 'Chuva'], ['moon', 'Lua'], ['neon', 'Neon'], ['court', 'Quadra'],
  ['clay', 'Saibro'], ['garden', 'Jardim'], ['dry', 'Seca'], ['wall', 'Muro']];
const N_PISO = {}; for (const [k, n] of PISOS) N_PISO[k] = n;
const DICA_PISO = { stadium: 'torcida em volta', asphalt: 'casas em volta', sand: 'mar e guarda-sóis', ice: 'linhas de hóquei', night: 'escuro, com refletores',
  rain: 'chove durante o jogo', moon: 'estrelas e a Terra', neon: 'linhas que brilham', clay: 'muro de pedra', wall: 'tijolos atrás dos gols', wood: 'área em D',
  court: 'quadra pintada', dirt: 'linhas tortas', check: 'grama em xadrez', garden: 'grama listrada', dry: 'grama seca' };
// a física: [grupo, chave, rótulo, mínimo, máximo, passo, dica, extra] — extra.so: só nesse jeito de andar; extra.auto: sem
// valor, o motor calcula (o quique no pé pelo quique da bola, o peso no contato pela leveza); extra.zero: 0 desliga
const FIS = [
  ['Bola', 'ballDamp', 'Rolar no chão', 0.95, 0.999, 0.001, 'Mais alto: a bola rola mais longe antes de parar.'],
  ['Bola', 'airDamp', 'Voar no alto', 0.98, 0.9995, 0.0005, 'Mais alto: a cavadinha vai mais longe.'],
  ['Bola', 'ballBounce', 'Quique nos jogadores e nas traves', 0.1, 1, 0.01, ''],
  ['Bola', 'wallBounce', 'Quique nas paredes', 0, 1.5, 0.01, 'Acima de 1, a parede devolve mais forte; junto com o quique da bola, no máximo a bola volta na velocidade em que bateu.'],
  ['Bola', 'landBounce', 'Quique no chão', 0, 0.9, 0.01, 'Quando a bola cai depois da cavadinha.'],
  ['Bola', 'ballR', 'Tamanho da bola', 6, 18, 0.5, ''],                // (menor que 6, a bola rápida atravessa a parede: 3 subpassos por passo)
  ['Bola', 'ballIm', 'Leveza da bola', 0.5, 1.6, 0.05, 'Mais alto: mais leve, o chute manda mais longe.'],
  ['Bola', 'ballMax', 'Velocidade máxima da bola', 0, 15, 0.01, 'A bola não passa disto (o chute do passo passa só no passo do chute). Zero: sem limite, como no Rachão.', { zero: true }],
  ['Bola', 'ballFootBounce', 'Quique no pé', 0, 0.9, 0.01, 'Quanto a bola volta quando bate no jogador. Zero: gruda no pé, como no RACHA.', { auto: true }],
  ['Bola', 'ballWeight', 'Peso no contato', 0.25, 12, 0.05, 'Quantos jogadores a bola pesa quando eles se batem (o chute não muda). A do RACHA pesa 8.', { auto: true }],
  ['Jogador', 'accel', 'Arrancada', 0.05, 0.2, 0.005, '', { so: 'embalo' }],
  ['Jogador', 'playerDamp', 'Deslizar', 0.92, 0.99, 0.001, 'Mais alto: o jogador escorrega mais, como no gelo.', { so: 'embalo' }],
  ['Jogador', 'moveMax', 'Velocidade máxima', 0.6, 5, 0.01, 'O tanto que ele anda por passo. O do RACHA: 1,76 no tamanho de sempre.', { so: 'direto' }],
  ['Jogador', 'moveAccel', 'Arrancada', 0.02, 1, 0.01, '100%: chega na máxima no primeiro passo, como a tampinha.', { so: 'direto' }],
  ['Jogador', 'moveBrake', 'Freio ao soltar', 0.03, 1, 0.01, '100%: para na hora quando solta, como a tampinha.', { so: 'direto' }],
  ['Jogador', 'sprint', 'Corrida', 1, 1.8, 0.01, 'Quanto a corrida acelera a mais.'],
  ['Jogador', 'playerR', 'Tamanho do jogador', 10, 24, 0.5, ''],
  ['Jogador', 'playerBounce', 'Empurrão entre jogadores', 0.1, 1, 0.01, ''],
  ['Chute', 'kickForce', 'Força do chute', 3, 9, 0.05, ''],
  ['Chute', 'kickReach', 'Alcance do chute', 1, 10, 0.25, 'A distância em que o chute armado pega a bola.'],
  ['Chute', 'kickAccel', 'Velocidade com o chute armado', 0.3, 1, 0.01, ''],
  ['Mundo', 'gravity', 'Gravidade', 0.05, 0.5, 0.005, 'Mais baixa: a bola flutua, como na Lua.'],
  ['Mundo', 'postR', 'Grossura da trave', 4, 14, 0.5, ''],
  ['Mundo', 'postBounce', 'Quique na trave', 0.1, 1, 0.01, ''],
  ['Mundo', 'netBackBounce', 'Quique no fundo da rede', 0, 1, 0.01, '']
].map(([g, k, rot, a, b, p, dica, x]) => Object.assign({ g, k, rot, a, b, p, dica }, x || {}));
const FIS_POR_K = {}; for (const f of FIS) FIS_POR_K[f.k] = f;
// a ponte da física com o RACHA (ponte.js, carregada antes): misturar a bola, o jogador ou o chute do RACHA no estádio
const PONTE = window.RachaPonte && window.RachaPonte.noRachao ? window.RachaPonte : null;
const arredFis = (k, v) => { const f = FIS_POR_K[k]; return f && typeof v === 'number' ? arredonda(clampN(v, f.a, f.b), f.p) : v; };
// o padrão de cada número (o do Rachão de sempre; os ganchos novos: sem teto, automático, o andar com embalo)
const PADRAO_NOVO = { ballMax: 0, ballFootBounce: null, ballWeight: null, netBackBounce: 0.1, moveMax: 0, moveAccel: 1, moveBrake: 1, andar: 'embalo' };
const padraoFis = k => Object.prototype.hasOwnProperty.call(PADRAO_NOVO, k) ? PADRAO_NOVO[k] : PHYS_PADRAO[k];
const fisDe = m => ((ORIG_POR_ID[m] || {}).phys) || {};
const PRESETS = [['classico', 'Clássico', {}], ['quadra', 'Quadra', fisDe('quadra')], ['asfalto', 'Asfalto', fisDe('rua')], ['terra', 'Terra', fisDe('terrao')],
  ['areia', 'Areia', fisDe('praia')], ['gelo', 'Gelo', fisDe('rinque')], ['molhado', 'Molhado', fisDe('chuva')], ['lua', 'Lua', fisDe('lua')],
  ['quica', 'Quica tudo', { ballBounce: 0.85, wallBounce: 1.17, landBounce: 0.75, postBounce: 0.9 }],
  ['praia', 'Bola de praia', { ballR: 14, ballIm: 1.45, ballDamp: 0.984, airDamp: 0.992, gravity: 0.13 }],
  ['chumbo', 'Bola pesada', { ballIm: 0.6, ballDamp: 0.978, ballBounce: 0.3, landBounce: 0.25, kickForce: 6.5 }]];
const VENTOS = { livre: { nome: 'Para todo lado', dirs: null }, gol: { nome: 'De gol a gol', dirs: [[1, 0], [-1, 0]] },
  lado: { nome: 'De lado', dirs: [[0, 1], [0, -1]] }, diagonal: { nome: 'Na diagonal', dirs: [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]] } };
const IDS_PODER = POWERS.map(p => p.id);
const paredeMax = qb => Math.min(1.5, Math.floor(100 / Math.max(qb, 0.01)) / 100);   // (o maior quique da parede com esse quique da bola)

const clampN = (v, a, b) => v < a ? a : v > b ? b : v;
const casas = p => (String(p).split('.')[1] || '').length;
const arredonda = (v, p) => Number(v.toFixed(casas(p)));
const objeto = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const de = (v, lista, d) => lista.indexOf(v) >= 0 ? v : d;
const inteiro = (v, f, d) => { const x = Number(v); return Number.isFinite(x) ? Math.round(clampN(x, f[0], f[1])) : d; };
const decimal = (v, f, p, d) => { const x = Number(v); return Number.isFinite(x) ? arredonda(clampN(x, f[0], f[1]), p) : d; };
const texto = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim() : '';
const novoId = () => 'u_' + Date.now().toString(36) + Math.floor(Math.random() * 2176782336).toString(36).padStart(6, '0');
function listaPt(partes) { return partes.length < 2 ? partes.join('') : partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1]; }

/* ---------------------------------------------------------------- 1) o estádio como documento */
function docNovo() {
  return {
    v: VERSAO, id: '', nome: 'Meu estádio', desc: '', base: '',
    campo: { formato: 'ret', W: 430, H: 205, cantos: 'redondo', canto: 30, impulso: 0, circulo: 72, margem: 46 },
    gol: { largura: 66, fundo: 44, recuo: 82, trave: 'trave', rede: 'net' },
    piso: 'grass', fisica: {}, pecas: [],
    vento: { on: false, forca: 1, troca: 7, dir: 'livre' },
    poderes: { lista: IDS_PODER.slice(), cada: 10, sempre: false },
    partida: { min: 1, max: 4, padrao: 2, gols: 0, chutes: { cavadinha: true, curva: true, super: true } }
  };
}
function limpaPeca(p, C) {
  p = objeto(p);
  const t = de(p.t, TIPOS, null); if (!t) return null;
  const P = PECA_PADRAO[t];
  const q = { t, x: inteiro(p.x, [-C.W, C.W], 0), y: inteiro(p.y, [-C.H, C.H], 0), sim: de(p.sim, SIMS, 'n') };
  if (t === 'cerca') { q.len = inteiro(p.len, LIM.len, P.len); q.th = inteiro(p.th, LIM.th, P.th); q.a = inteiro(p.a, LIM.a, P.a); }
  else q.r = inteiro(p.r, LIM.r[t], P.r);
  if (t === 'bumper') q.forca = decimal(p.forca, LIM.forca, 0.5, P.forca);
  if (t === 'lama' || t === 'poca') { q.bola = decimal(p.bola, LIM.bola, 0.001, P.bola); q.andar = decimal(p.andar, LIM.andar, 0.05, P.andar); q.freio = decimal(p.freio, LIM.freio, 0.005, P.freio); }
  return q;
}
// tudo o que entra (do aparelho ou de um código) passa por aqui: só os campos conhecidos, cada um no seu limite
function limpa(cru) {
  if (!cru || typeof cru !== 'object' || Array.isArray(cru)) return null;
  const d = docNovo(), c = objeto(cru.campo), g = objeto(cru.gol), fi = objeto(cru.fisica), v = objeto(cru.vento), pw = objeto(cru.poderes), pt = objeto(cru.partida);
  d.id = typeof cru.id === 'string' && /^u_[a-z0-9]{6,24}$/.test(cru.id) ? cru.id : '';
  d.nome = texto(cru.nome, LIM.nome) || 'Meu estádio';
  d.desc = texto(cru.desc, LIM.desc);
  d.base = typeof cru.base === 'string' && Object.prototype.hasOwnProperty.call(ORIG_POR_ID, cru.base) ? cru.base : '';
  const C = d.campo;
  C.formato = de(c.formato, ['ret', 'oval', 'rinque'], 'ret');
  C.W = inteiro(c.W, LIM.W, 430); C.H = inteiro(c.H, LIM.H, 205);
  C.cantos = de(c.cantos, ['reto', 'redondo', 'chanfro'], 'redondo');
  C.canto = inteiro(c.canto, LIM.canto, 30); C.impulso = decimal(c.impulso, LIM.impulso, 0.5, 0);
  C.circulo = inteiro(c.circulo, LIM.circulo, 72); C.margem = inteiro(c.margem, LIM.margem, 46);
  const G = d.gol;
  G.largura = inteiro(g.largura, LIM.gol, 66); G.fundo = inteiro(g.fundo, LIM.fundo, 44); G.recuo = inteiro(g.recuo, LIM.recuo, 82);
  G.trave = de(g.trave, ['trave', 'chinelo', 'bambu'], 'trave'); G.rede = de(g.rede, ['net', 'garage', 'hole'], 'net');
  d.piso = de(cru.piso, PISOS.map(p => p[0]), 'grass');
  for (const f of FIS) { const x = Number(fi[f.k]); if (fi[f.k] != null && Number.isFinite(x)) d.fisica[f.k] = arredonda(clampN(x, f.a, f.b), f.p); }
  if (fi.andar === 'direto') d.fisica.andar = 'direto';   // (o andar do RACHA; sem nada, o embalo do Rachão)
  else for (const k of ['moveMax', 'moveAccel', 'moveBrake']) delete d.fisica[k];
  const qb = d.fisica.ballBounce != null ? d.fisica.ballBounce : PHYS_PADRAO.ballBounce;   // (a bola não ganha velocidade batendo na parede:
  if (qb * (d.fisica.wallBounce != null ? d.fisica.wallBounce : PHYS_PADRAO.wallBounce) > 1) d.fisica.wallBounce = paredeMax(qb);   //  o quique dela × o da parede ≤ 1)
  if (Array.isArray(cru.pecas)) for (const p of cru.pecas.slice(0, LIM.pecas * 2)) {
    if (d.pecas.length >= LIM.pecas) break;
    const q = limpaPeca(p, C); if (q) d.pecas.push(q);
  }
  while (d.pecas.length && totalCopias(d) > LIM.copias) d.pecas.pop();
  d.vento = { on: v.on === true, forca: decimal(v.forca, LIM.ventoForca, 0.05, 1), troca: inteiro(v.troca, LIM.ventoTroca, 7), dir: de(v.dir, Object.keys(VENTOS), 'livre') };
  let lista = Array.isArray(pw.lista) ? IDS_PODER.filter(id => pw.lista.indexOf(id) >= 0) : IDS_PODER.slice();
  if (!lista.length) lista = IDS_PODER.slice();
  d.poderes = { lista, cada: inteiro(pw.cada, LIM.poder, 10), sempre: pw.sempre === true };
  const P = d.partida;
  P.min = inteiro(pt.min, [1, 7], 1); P.max = inteiro(pt.max, [1, 7], 4); if (P.max < P.min) P.max = P.min;
  P.padrao = clampN(inteiro(pt.padrao, [1, 7], 2), P.min, P.max);
  P.gols = [0, 1, 3, 5, 7, 10].indexOf(Number(pt.gols)) >= 0 ? Number(pt.gols) : 0;
  const ch = objeto(pt.chutes);                           // (os chutes extras que o estádio deixa: sem nada, os três)
  P.chutes = { cavadinha: ch.cavadinha !== false, curva: ch.curva !== false, super: ch.super !== false };
  return d;
}
// as cópias de uma peça pelo espelho (as que caem no mesmo lugar contam uma vez só)
function copias(p) {
  const L = [{ x: p.x, y: p.y, sx: 1, sy: 1 }];
  const poe = (sx, sy) => {
    const x = p.x * sx, y = p.y * sy, a = p.t === 'cerca' ? ((p.a || 0) * sx * sy) : 0;
    const igual = L.some(c => Math.abs(c.x - x) < 0.5 && Math.abs(c.y - y) < 0.5 && (p.t !== 'cerca' || angIgual((p.a || 0) * c.sx * c.sy, a)));
    if (!igual) L.push({ x, y, sx, sy });
  };
  if (p.sim === 'y' || p.sim === 'xy') poe(1, -1);          // (a ordem do sym4 dos campos do Rachão: x+y+, x+y−, x−y+, x−y−)
  if (p.sim === 'x' || p.sim === 'xy') poe(-1, 1);
  if (p.sim === 'xy' || p.sim === 'c') poe(-1, -1);
  return L;
}
function angIgual(a, b) { const d = ((a - b) % 180 + 180) % 180; return d < 0.5 || d > 179.5; }
function totalCopias(d) { let n = 0; for (const p of d.pecas) n += copias(p).length; return n; }
// os limites que dependem de outras medidas (o canto não pode engolir o gol, o gol cabe no campo...)
function limites(d) {
  const C = d.campo, G = d.gol, W = C.W, H = C.H, L = {};
  const pr = d.fisica.playerR != null ? d.fisica.playerR : PHYS_PADRAO.playerR;
  if (C.formato === 'oval') { L.golMax = Math.floor(H * 0.85); L.cantoMax = 0; L.golGeo = Math.floor(H * 0.9); }
  else if (C.formato === 'rinque') {
    L.cantoMax = Math.max(30, Math.min(W, H) - 12);
    L.recuoMin = Math.min(LIM.recuo[1], G.fundo + 24); L.recuoMax = Math.max(L.recuoMin, Math.min(LIM.recuo[1], Math.floor(W * 0.5)));
    const c = clampN(C.canto, 30, L.cantoMax), gx = W - clampN(G.recuo, L.recuoMin, L.recuoMax);
    const meia = x => x <= W - c ? H : (H - c) + Math.sqrt(Math.max(0, c * c - (x - (W - c)) ** 2));   // (a meia-altura do rinque em x: a tabela curva)
    L.golGeo = Math.floor(Math.min(meia(gx + G.fundo) - 12, meia(gx) - 14));                     // (as traves e o fundo da rede dentro da tabela)
    L.golMax = Math.min(Math.floor(H * 0.55), L.golGeo);
  } else {
    L.golMax = Math.min(LIM.gol[1], H - 12);
    L.cantoMax = Math.max(0, Math.min(Math.floor(Math.min(W, H) * 0.7), H - Math.min(G.largura, L.golMax) - 8));
  }
  L.golMax = Math.max(LIM.gol[0], Math.min(LIM.gol[1], L.golMax));
  const gol = Math.min(G.largura, L.golMax);
  L.gx = C.formato === 'oval' ? W * Math.cos(Math.asin(clampN(gol / H, 0, 0.95))) : C.formato === 'rinque' ? W - clampN(G.recuo, L.recuoMin, L.recuoMax) : W;
  // o círculo do meio não passa da linha do gol (na saída, o time de fora espera do lado de fora dele)
  L.circMax = Math.max(LIM.circulo[0], Math.min(LIM.circulo[1], Math.floor(Math.min(W * 0.45, H * 0.8, L.gx - 2 * pr - 10))));
  return L;
}
function conta(d) {
  const n = { obst: 0, cercas: 0, zonas: 0 };
  for (const p of d.pecas) { const k = copias(p).length; if (p.t === 'lama' || p.t === 'poca') n.zonas += k; else if (p.t === 'cerca') n.cercas += k; else n.obst += k; }
  return n;
}
function descAuto(d) {
  const n = conta(d), partes = [];
  partes.push((d.campo.formato === 'oval' ? 'Campo oval' : d.campo.formato === 'rinque' ? 'Rinque' : 'Campo') + ' de ' + N_PISO[d.piso].toLowerCase());
  if (n.obst) partes.push(n.obst + (n.obst === 1 ? ' obstáculo' : ' obstáculos'));
  if (n.cercas) partes.push(n.cercas + (n.cercas === 1 ? ' cerca viva' : ' cercas vivas'));
  if (n.zonas) partes.push(n.zonas + (n.zonas === 1 ? ' poça ou lama' : ' poças e lamas'));
  if (d.vento.on) partes.push('vento');
  if (d.poderes.sempre) partes.push('poderes em toda partida');
  const ch = d.partida.chutes, sem = [!ch.cavadinha && 'cavadinha', !ch.curva && 'curva', !ch.super && 'super chute'].filter(Boolean);
  if (sem.length === 3) partes.push('só o Chutar'); else if (sem.length) partes.push('sem ' + listaPt(sem));
  const doRacha = PONTE ? PONTE.PARTES.filter(x => PONTE.qualRachao(d.fisica, x, arredFis) === 'racha') : [];
  if (doRacha.length) partes.push('com ' + listaPt(doRacha.map(x => ({ bola: 'a bola', jogador: 'o jogador', chute: 'o chute' })[x])) + ' do RACHA');
  return listaPt(partes) + '.';
}
// o documento → um campo no formato do jogo (o mesmo dos 17 campos: MAPS)
function compila(d) {
  const C = d.campo, G = d.gol, P = d.partida, L = limites(d);
  const m = { id: d.id || 'u_rascunho', name: d.nome, desc: d.desc || descAuto(d), custom: true,
    W: C.W, H: C.H, goal: Math.min(G.largura, L.golMax), depth: G.fundo, circle: Math.min(C.circulo, L.circMax), margin: C.margem,
    surface: d.piso, sizes: [P.min, P.max], def: P.padrao, phys: Object.assign({}, d.fisica), statics: [], walls: [], zones: [] };
  if (C.formato === 'oval') m.shape = 'oval';
  else if (C.formato === 'rinque') { m.shape = 'rink'; m.corner = clampN(C.canto, 30, L.cantoMax); m.goalInset = clampN(G.recuo, L.recuoMin, L.recuoMax); m.margin = 0; }
  else {
    m.corner = C.cantos === 'reto' ? 0 : Math.min(C.canto, L.cantoMax);
    if (C.cantos === 'chanfro' && m.corner > 0) { m.cornerStyle = 'chamfer'; if (C.impulso > 0) m.cornerBoost = C.impulso; }
  }
  // o poder Golzão (o gol × 1,6) também cabe no estádio (o gancho do motor lê o golzaoMax; os 17 campos não têm e ficam iguais)
  m.golzaoMax = Math.max(m.goal, C.formato === 'ret' ? C.H - (m.corner > 0 ? m.corner + 8 : 12) : L.golGeo);
  if (G.trave !== 'trave') m.postStyle = G.trave;
  if (G.rede !== 'net') m.netStyle = G.rede;
  for (const p of d.pecas) for (const c of copias(p)) {
    if (p.t === 'cerca') m.walls.push({ x: c.x, y: c.y, len: p.len, th: p.th, a: (p.a || 0) * c.sx * c.sy, style: 'hedge' });
    else if (p.t === 'lama' || p.t === 'poca') {
      const z = { x: c.x, y: c.y, r: p.r, kind: p.t === 'lama' ? 'mud' : 'puddle', ballDamp: p.bola, accelMul: p.andar };
      if (p.freio < 0.999) z.playerDamp = p.freio;
      m.zones.push(z);
    } else if (p.t === 'bumper') m.statics.push({ x: c.x, y: c.y, r: p.r, boost: p.forca, style: 'bumper' });
    else m.statics.push({ x: c.x, y: c.y, r: p.r, style: p.t });
  }
  if (d.vento.on) { m.wind = true; m.windForce = d.vento.forca; m.windEvery = Math.round(d.vento.troca * 60); const dirs = VENTOS[d.vento.dir].dirs; if (dirs) m.windDirs = dirs.map(x => x.slice()); }
  if (d.poderes.lista.length < IDS_PODER.length) m.powers = d.poderes.lista.slice();
  m.powerEvery = Math.round(d.poderes.cada * 60);
  if (d.poderes.sempre) m.powersAlways = true;
  if (P.gols) m.scoreDefault = P.gols;
  const ch = P.chutes;
  if (!ch.cavadinha || !ch.curva || !ch.super) m.chutes = { lob: ch.cavadinha, curve: ch.curva, superKick: ch.super };
  return m;
}
// um dos 17 campos → documento (as cópias espelhadas viram uma peça com espelho, como foram feitas)
function docDeMapa(m) {
  const d = docNovo(), C = d.campo, G = d.gol;
  d.nome = texto(m.name + ' 2', LIM.nome); d.desc = texto(m.desc, LIM.desc); d.base = ORIG_POR_ID[m.id] ? m.id : '';
  C.formato = m.shape === 'oval' ? 'oval' : m.shape === 'rink' ? 'rinque' : 'ret';
  C.W = m.W; C.H = m.H; C.canto = m.corner || 0; C.circulo = m.circle; C.margem = m.margin || 46;
  C.cantos = !m.corner ? 'reto' : m.cornerStyle === 'chamfer' ? 'chanfro' : 'redondo';
  if (C.formato === 'rinque') { C.cantos = 'redondo'; C.margem = 46; }
  C.impulso = m.cornerBoost || 0;
  G.largura = m.goal; G.fundo = m.depth; G.recuo = m.goalInset || 82; G.trave = m.postStyle || 'trave'; G.rede = m.netStyle || 'net';
  d.piso = m.surface || 'grass';
  d.fisica = Object.assign({}, m.phys || {});
  const itens = [];
  for (const s of m.statics || []) itens.push(s.style === 'bumper' ? { t: 'bumper', x: s.x, y: s.y, r: s.r, forca: s.boost || 8.5 } : { t: s.style === 'vaso' ? 'vaso' : 'poste', x: s.x, y: s.y, r: s.r });
  for (const w of m.walls || []) itens.push({ t: 'cerca', x: w.x, y: w.y, len: w.len, th: w.th, a: w.a || 0 });
  for (const z of m.zones || []) itens.push({ t: z.kind === 'mud' ? 'lama' : 'poca', x: z.x, y: z.y, r: z.r, bola: z.ballDamp || 0.95, andar: z.accelMul || 1, freio: z.playerDamp || 1 });
  const usado = itens.map(() => false);
  const igual = (o, q) => o.t === q.t && (o.r || 0) === (q.r || 0) && (o.len || 0) === (q.len || 0) && (o.th || 0) === (q.th || 0) && (o.forca || 0) === (q.forca || 0)
    && (o.bola || 0) === (q.bola || 0) && (o.andar || 0) === (q.andar || 0) && (o.freio || 0) === (q.freio || 0);
  itens.forEach((q, i) => {                                // o espelho mais simples que refaz as cópias que existem (o que cobre mais vence)
    if (usado[i]) return;
    usado[i] = true;
    let sim = 'n', js = [];
    for (const s of ['x', 'y', 'c', 'xy']) {
      const outras = copias(Object.assign({}, q, { sim: s })).slice(1), achou = [];
      for (const c of outras) {
        const a = (q.a || 0) * c.sx * c.sy;
        const j = itens.findIndex((o, k) => !usado[k] && achou.indexOf(k) < 0 && igual(o, q) && Math.abs(o.x - c.x) < 0.5 && Math.abs(o.y - c.y) < 0.5 && (q.t !== 'cerca' || angIgual(o.a || 0, a)));
        if (j < 0) break;
        achou.push(j);
      }
      if (achou.length === outras.length && achou.length > js.length) { sim = s; js = achou; }
    }
    for (const j of js) usado[j] = true;
    d.pecas.push(Object.assign({}, q, { sim }));
  });
  d.vento.on = !!m.wind;
  d.partida.min = (m.sizes || [1, 4])[0]; d.partida.max = (m.sizes || [1, 4])[1]; d.partida.padrao = m.def || 2; d.partida.gols = m.scoreDefault || 0;
  return limpa(d);
}

/* ---------------------------------------------------------------- 2) a guarda no aparelho e o registro nos campos */
let REGS = [];
const APAGADOS = new Set();                               // (apagados nesta aba: o juntar com outra aba não traz de volta)
const miniOk = t => typeof t === 'string' && t.length <= 60000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(t) ? t : '';
function carrega() {
  let lista = [];
  try { const o = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (o && Array.isArray(o.lista)) lista = o.lista; } catch (_) {}
  const vistos = new Set(); REGS = [];
  for (const r of lista.slice(0, MAX_ESTADIOS)) {
    if (!r || typeof r !== 'object') continue;
    const doc = limpa(r.doc); if (!doc || !doc.id || vistos.has(doc.id)) continue;
    vistos.add(doc.id);
    REGS.push({ id: doc.id, criado: Number(r.criado) || 0, editado: Number(r.editado) || 0, thumb: miniOk(r.thumb), doc });
  }
}
function junta() {                                      // (outra aba guardou: o mais novo de cada estádio vale e os que só ela tem entram)
  let lista = [];
  try { const o = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (o && Array.isArray(o.lista)) lista = o.lista; } catch (_) {}
  for (const r of lista.slice(0, MAX_ESTADIOS * 2)) {
    if (!r || typeof r !== 'object' || typeof r.id !== 'string' || APAGADOS.has(r.id)) continue;
    const ed = Number(r.editado) || 0, aqui = REGS.find(x => x.id === r.id);
    if (aqui && (ed <= aqui.editado || aqui === ED.reg)) continue;
    if (!aqui && REGS.length >= MAX_ESTADIOS) continue;
    const doc = limpa(r.doc); if (!doc || doc.id !== r.id) continue;
    if (aqui) { aqui.doc = doc; aqui.editado = ed; aqui.thumb = miniOk(r.thumb); }
    else REGS.push({ id: r.id, criado: Number(r.criado) || 0, editado: ed, thumb: miniOk(r.thumb), doc });
  }
}
function grava() {
  junta();
  const dados = l => JSON.stringify({ v: VERSAO, lista: l.map(r => ({ id: r.id, criado: r.criado, editado: r.editado, thumb: r.thumb, doc: r.doc })) });
  try { localStorage.setItem(CHAVE, dados(REGS)); avisaPai('mudou'); return true; }
  catch (_) {
    try { localStorage.setItem(CHAVE, dados(REGS.map(r => Object.assign({}, r, { thumb: '' })))); avisaPai('mudou'); return true; }   // (sem espaço: sem as miniaturas)
    catch (e) { aviso('O aparelho está sem espaço para guardar os estádios.', true); return false; }
  }
}
function miniatura(m) {
  try { const c = document.createElement('canvas'); c.width = 288; c.height = 162; renderMapThumb(c, m); return miniOk(c.toDataURL('image/jpeg', 0.72)); } catch (_) { return ''; }
}
function registra() {                                    // os estádios entram na frente dos 17 campos (e no MAP_BY_ID)
  for (let i = MAPS.length - 1; i >= 0; i--) if (MAPS[i].custom) { if (MAP_BY_ID[MAPS[i].id] === MAPS[i]) delete MAP_BY_ID[MAPS[i].id]; MAPS.splice(i, 1); }
  const novos = REGS.slice().sort((a, b) => b.editado - a.editado).map(r => compila(r.doc));
  MAPS.unshift(...novos);
  for (const m of novos) MAP_BY_ID[m.id] = m;
}
function cria(doc) {
  if (REGS.length >= MAX_ESTADIOS) { aviso('Você já tem ' + MAX_ESTADIOS + ' estádios: apague um para criar outro.', true); return null; }
  const d = limpa(doc); if (!d) return null;
  d.id = novoId();
  const agora = Date.now(), reg = { id: d.id, criado: agora, editado: agora, thumb: '', doc: d };
  reg.thumb = miniatura(compila(d));
  REGS.unshift(reg);
  if (!grava()) { REGS.shift(); return null; }
  registra();
  return reg;
}
function salvaReg(reg, doc) {
  reg.doc = limpa(doc); reg.doc.id = reg.id; reg.editado = Date.now();
  reg.thumb = miniatura(compila(reg.doc));
  const ok = grava(); registra(); return ok;
}
function apaga(reg) {
  const i = REGS.indexOf(reg); if (i < 0) return;
  REGS.splice(i, 1); APAGADOS.add(reg.id); grava(); registra();
  for (const k in App.sel) if (App.sel[k] && App.sel[k].map === reg.id) App.sel[k].map = 'classico';
}
function nomeCopia(nome) {
  const m = /^(.*?)\s(\d{1,3})$/.exec(nome);
  const base = m ? m[1] : nome; let n = m ? Number(m[2]) + 1 : 2;
  const nomes = new Set(REGS.map(r => r.doc.nome));
  let s; do { s = texto(base, LIM.nome - String(n).length - 1) + ' ' + n; n++; } while (nomes.has(s) && n < 999);
  return s;
}
function duplica(reg) { const d = JSON.parse(JSON.stringify(reg.doc)); d.nome = nomeCopia(d.nome); return cria(d); }

/* ---------------------------------------------------------------- 3) o código para compartilhar */
function codifica(d) {
  const o = limpa(d); delete o.id;
  const by = new TextEncoder().encode(JSON.stringify(o)); let bin = '';
  for (let i = 0; i < by.length; i++) bin += String.fromCharCode(by[i]);
  return PREFIXO + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodifica(s) {
  if (typeof s !== 'string') return null;
  s = s.replace(/\s+/g, '');
  if (!s || s.length > LIM_CODIGO) return null;
  const m = /^RACHAO1\.([A-Za-z0-9_-]+)$/.exec(s); if (!m) return null;
  try {
    let b = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
    const bin = atob(b), by = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) by[i] = bin.charCodeAt(i);
    const d = limpa(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(by)));
    if (d) d.id = '';
    return d;
  } catch (_) { return null; }
}

/* ---------------------------------------------------------------- 4) os ajudantes de tela */
function h(sel, at, ...filhos) {                         // h('div.classe#id', {atributos, on:{…}}, filhos…) — texto sempre como texto
  const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(sel || 'div');
  const e = document.createElement((m && m[1]) || 'div');
  if (m && m[2]) for (const p of m[2].match(/[.#][\w-]+/g) || []) { if (p[0] === '.') e.classList.add(p.slice(1)); else e.id = p.slice(1); }
  if (at && (typeof at !== 'object' || at instanceof Node || Array.isArray(at))) { filhos.unshift(at); at = null; }
  if (at) for (const k in at) {
    const v = at[k]; if (v == null || v === false) continue;
    if (k === 'on') { for (const ev in v) e.addEventListener(ev, v[ev]); }
    else if (k === 'texto') e.textContent = v;
    else if (k === 'dados') { for (const dk in v) e.dataset[dk] = v[dk]; }
    else if (k === 'style') e.style.cssText = v;
    else if (k in e && typeof v !== 'string') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat(9)) { if (f == null || f === false) continue; e.appendChild(f instanceof Node ? f : document.createTextNode(String(f))); }
  return e;
}
const limpaFilhos = e => { while (e && e.firstChild) e.removeChild(e.firstChild); return e; };
// os desenhos dos ícones (fixos, escritos aqui; nada de quem joga passa por eles)
const IC = {
  mover: '<path d="M6 3.5l12 8.6-5.4 1.3 3.1 6-2.5 1.3-3.1-6L6 18.2z" fill="currentColor"/>',
  poste: '<circle cx="12" cy="12" r="7.6" fill="#c9ced4" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="3.2" fill="#f7c531"/>',
  bumper: '<circle cx="12" cy="12" r="8.6" fill="#ff4fbf" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="4.2" fill="#2ef2ff"/>',
  vaso: '<circle cx="12" cy="12" r="8.6" fill="#c4683c" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="5.2" fill="#5a3a22"/><path d="M12 7.6c2.2 1.6 2.2 7.2 0 8.8M7.6 12c1.6-2.2 7.2-2.2 8.8 0" stroke="#3f8a3d" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  cerca: '<path d="M4 12.5h16" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M4 12.5h16" stroke="#2e6b2f" stroke-width="5.4" stroke-linecap="round"/><circle cx="7.6" cy="11" r="2" fill="#4f9d4b"/><circle cx="12" cy="11" r="2" fill="#4f9d4b"/><circle cx="16.4" cy="11" r="2" fill="#4f9d4b"/>',
  lama: '<path d="M4.6 13.2c-1-3.8 2.6-6.6 6.6-5.8 3.8-1.8 8.4.6 7.6 4.6 1.2 3-1.8 6-5.6 5.2-3.2 1.8-8.2 1-8.6-4z" fill="#6d4424" stroke="currentColor" stroke-width="2"/><ellipse cx="10" cy="11" rx="2.6" ry="1" fill="#a07651"/>',
  poca: '<ellipse cx="12" cy="12.6" rx="8.8" ry="6.2" fill="#78a0bf" stroke="currentColor" stroke-width="2"/><path d="M8.2 11c1.2-1.7 3.4-2.3 5.6-2" stroke="#eaf6ff" stroke-width="1.7" fill="none" stroke-linecap="round"/>',
  apagar: '<path d="M5 7.2h14M9.8 7.2V4.6h4.4v2.6M7 7.2l1.1 12.6h7.8L17 7.2" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"/><path d="M10.4 10.6v6M13.6 10.6v6" stroke="currentColor" stroke-width="2"/>',
  desfazer: '<path d="M9 7H5V3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 7.5A8 8 0 1 1 6 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  refazer: '<path d="M15 7h4V3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 7.5A8 8 0 1 0 18 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  play: '<path d="M7.5 4.6v14.8L19.6 12z" fill="currentColor"/>',
  mais: '<circle cx="5" cy="12" r="2.3" fill="currentColor"/><circle cx="12" cy="12" r="2.3" fill="currentColor"/><circle cx="19" cy="12" r="2.3" fill="currentColor"/>',
  voltar: '<path d="M14.6 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
  ima: '<path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><path d="M6 8.2h4M14 8.2h4" stroke="currentColor" stroke-width="2.3"/>',
  jogadores: '<circle cx="8.4" cy="12" r="5" fill="#e23d28" stroke="currentColor" stroke-width="2"/><circle cx="15.6" cy="12" r="5" fill="#2563c9" stroke="currentColor" stroke-width="2"/>',
  sim_n: '<circle cx="12" cy="12" r="4.6" fill="currentColor"/>',
  sim_x: '<path d="M12 3v18" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 2"/><circle cx="6.4" cy="12" r="3.6" fill="currentColor"/><circle cx="17.6" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="2"/>',
  sim_y: '<path d="M3 12h18" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 2"/><circle cx="12" cy="6.4" r="3.6" fill="currentColor"/><circle cx="12" cy="17.6" r="3.6" fill="none" stroke="currentColor" stroke-width="2"/>',
  sim_xy: '<path d="M12 3v18M3 12h18" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 2"/><circle cx="6.6" cy="6.6" r="3" fill="currentColor"/><circle cx="17.4" cy="6.6" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="6.6" cy="17.4" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="17.4" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  sim_c: '<circle cx="6.6" cy="7.4" r="3.2" fill="currentColor"/><circle cx="17.4" cy="16.6" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.6 5.2a8 8 0 0 1 3.2 5.4M8.4 18.8a8 8 0 0 1-3.2-5.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  duplicar: '<rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2.3"/><path d="M5 15H4V4h11v1" fill="none" stroke="currentColor" stroke-width="2.3"/>',
  codigo: '<path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  novo: '<path d="M12 4.5v15M4.5 12h15" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>'
};
function icone(n) { const i = document.createElement('span'); i.className = 'rc-ic'; i.setAttribute('aria-hidden', 'true'); i.innerHTML = '<svg viewBox="0 0 24 24">' + (IC[n] || IC.mais) + '</svg>'; return i; }
function svgFixo(s) { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstChild; }
function clique() { try { Sound.init(); Sound.resume(); Sound.click(); } catch (_) {} }
function bt(rot, f, cls, ic, titulo) {
  const b = h('button.rc-bt' + (cls ? '.' + cls.split(' ').join('.') : ''), { type: 'button', title: titulo || null, 'aria-label': titulo || null });
  if (ic) b.appendChild(icone(ic));
  if (rot) b.appendChild(h('span.rc-bt-tx', { texto: rot }));
  if (f) b.addEventListener('click', e => { e.stopPropagation(); clique(); f(e); });
  return b;
}
let avisoT = 0;
function aviso(t, erro) {
  let a = document.getElementById('rc-aviso');
  if (!a) { a = h('div#rc-aviso.rc-aviso', { role: 'status', 'aria-live': 'polite' }); document.body.appendChild(a); }
  a.textContent = t; a.className = 'rc-aviso on' + (erro ? ' erro' : '');
  clearTimeout(avisoT); avisoT = setTimeout(() => a.classList.remove('on'), erro ? 4200 : 2400);
}
function avisaPai(o) { if (!NA_OFICINA) return; try { window.parent.postMessage({ rachao: o }, ALVO); } catch (_) {} }
// as janelas por cima (a folha amarela do Rachão)
const FOLHAS = new Set();
function folha(titulo, monta, cls) {
  const volta = document.activeElement;
  const fundo = h('div.rc-fundo', { role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo });
  const caixa = h('div.sheet.rc-folha' + (cls ? '.' + cls : ''));
  const tecla = e => { if (!fundo.isConnected) { solta(); return; } if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecha(); } };
  const solta = () => { document.removeEventListener('keydown', tecla, true); FOLHAS.delete(fecha); };
  function fecha() { solta(); if (!fundo.isConnected) return; fundo.remove(); try { if (volta && volta.isConnected) volta.focus({ preventScroll: true }); } catch (_) {} }
  FOLHAS.add(fecha);
  caixa.appendChild(h('div.modalHead', h('h2', { texto: titulo }), h('button.x', { type: 'button', 'aria-label': 'Fechar', texto: '×', on: { click: () => { clique(); fecha(); } } })));
  monta(caixa, fecha);
  fundo.appendChild(caixa);
  fundo.addEventListener('pointerdown', e => { if (e.target === fundo) fecha(); });
  document.body.appendChild(fundo);
  document.addEventListener('keydown', tecla, true);
  setTimeout(() => { const f = caixa.querySelector('textarea, input, .rc-bt, button:not(.x)'); try { if (f) f.focus({ preventScroll: true }); } catch (_) {} }, 30);
  return fecha;
}
const fechaFolhas = () => { for (const f of [...FOLHAS]) f(); for (const f of document.querySelectorAll('.rc-fundo')) f.remove(); };
function confirma(titulo, txt, sim, f) {
  folha(titulo, (c, fecha) => {
    c.appendChild(h('p.rc-tx', { texto: txt }));
    c.appendChild(h('div.rc-linha-bts', bt('Cancelar', fecha), bt(sim, () => { fecha(); f(); }, 'verm')));
  });
}
async function copia(t) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(t); return true; } } catch (_) {}
  try { const a = h('textarea', { style: 'position:fixed;left:-9999px;top:0' }); a.value = t; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; } catch (_) { return false; }
}

/* ---------------------------------------------------------------- 5) os ganchos no aplicativo do Rachão */
const ED = {
  reg: null, doc: null, mapa: null, st: null, hist: [], pos: -1, sel: -1, ferr: 'mover', sim: 'x', ima: true, jogadores: true,
  aba: 'campo', abaAntes: 'campo', arrasto: null, salvaT: 0, raf: 0, volta: '', teste: null, pop: null, dicaT: 0,
  deFora: false,                                          // (a Oficina do RACHA abriu numa tela daqui: os voltar levam de volta para ela)
  vista: { sc: 1, ox: 0, oy: 0, w: 1, h: 1, dpr: 1 }
};
const TELAS = { estadios: null, editor: null };
const telaAberta = id => !!(TELAS[id] && !TELAS[id].hidden);

const showScreenAntes = App.showScreen;
App.showScreen = function (id) {
  for (const k in TELAS) if (TELAS[k]) TELAS[k].hidden = k !== id;
  if (id in TELAS) {
    for (const s of ['home', 'setup', 'game']) { const el = document.getElementById(s); if (el) el.hidden = true; }
    document.body.classList.remove('playing'); document.body.classList.toggle('rc-editando', id === 'editor');
    this.input.active = false;
    return;
  }
  document.body.classList.remove('rc-editando');
  return showScreenAntes.apply(this, arguments);
};
const showHomeAntes = App.showHome;
App.showHome = function () {
  if (ED.volta === 'editor' && ED.reg && REGS.indexOf(ED.reg) >= 0) { ED.volta = ''; fimTeste(); return abreEditor(ED.reg, true); }
  ED.volta = ''; fimTeste();
  const r = showHomeAntes.apply(this, arguments);
  if (ED.deFora) sair();                                  // (veio da Oficina: o voltar volta para ela)
  return r;
};
const openSetupAntes = App.openSetup;
App.openSetup = function (mode) {
  if (ED.teste) { const id = ED.teste.id; fimTeste(); const s = this.sel[mode]; if (s && s.map !== undefined && MAP_BY_ID[id]) s.map = id; }
  return openSetupAntes.apply(this, arguments);
};
function mapaValido(sel) { if (sel && sel.map !== undefined && !MAP_BY_ID[sel.map]) sel.map = 'classico'; }
const renderSetupAntes = App.renderSetup;
App.renderSetup = function () { mapaValido(this.sel[this.mode]); return renderSetupAntes.apply(this, arguments); };
const buildSceneAntes = App.buildScene;
App.buildScene = function () {
  if (ED.teste) return new TopScene(Object.assign({}, ED.teste.cfg, { map: MAP_BY_ID[ED.teste.id] || ED.mapa }), this);
  const sel = this.sel[this.mode]; mapaValido(sel);
  const m = sel && MAP_BY_ID[sel.map];
  if (this.mode === 'match' && m && m.powersAlways)          // (o estádio pediu poderes em toda partida: o Contra bots vira Caos nele)
    return new TopScene({ mode: 'chaos', map: m, teams: [sel.size, sel.size], humans: [{ team: 0, ctrl: 'p1' }], diff: sel.diff, time: sel.time, goals: sel.goals, run: sel.run, lob: sel.lob !== false, curve: sel.curve !== false, superKick: sel.superKick !== false }, this);
  return buildSceneAntes.apply(this, arguments);
};
const N_CHUTE = { lob: 'cavadinha', curve: 'curva', superKick: 'super chute' };
const semChutes = m => m && m.chutes ? ['lob', 'curve', 'superKick'].filter(k => m.chutes[k] === false) : [];
const buildOptAntes = App.buildOpt;
App.buildOpt = function (o, sel, mode) {
  const el = buildOptAntes.apply(this, arguments);
  if (o === 'shots' && el && sel && MAP_BY_ID[sel.map] && (mode !== 'train' || sel.kind === 'free')) {   // (o estádio sem algum chute: o botão dele fica travado e a nota explica; o treino de finalização e o de goleiro são no Clássico)
    const m = MAP_BY_ID[sel.map], sem = semChutes(m), bts = el.querySelectorAll('.seg button');
    if (sem.length && bts.length === 3) {
      ['lob', 'curve', 'superKick'].forEach((k, i) => {
        if (sem.indexOf(k) < 0) return;
        const b = bts[i]; b.disabled = true; b.classList.remove('on'); b.classList.add('rc-trancado'); b.setAttribute('aria-pressed', 'false'); b.title = 'O estádio «' + m.name + '» não tem ' + N_CHUTE[k];
      });
      const nt = el.querySelector('.note');
      if (nt) nt.textContent = (sem.length === 3 ? 'O estádio «' + m.name + '» é só o Chutar: sem cavadinha, sem curva e sem super chute.' : 'O estádio «' + m.name + '» não tem ' + listaPt(sem.map(k => N_CHUTE[k])) + '.')
        + ' O Chutar normal continua o do Clássico, com força fixa.';
    }
  }
  if (o === 'map' && el) {
    for (const c of el.querySelectorAll('.mapCard')) {
      const m = MAP_BY_ID[c.dataset.map];
      if (m && m.custom) {
        c.classList.add('rc-seu'); const n = c.querySelector('.mn'); if (n) n.insertBefore(h('span.rc-selo', { texto: 'Seu' }), n.firstChild);
        const sem = semChutes(m);
        if (sem.length && n) n.appendChild(h('span.rc-selo.rc-selo-chute', { texto: sem.length === 3 ? 'Só o Chutar' : 'Sem ' + listaPt(sem.map(k => N_CHUTE[k])) }));
      }
    }
    const lista = el.querySelector('.maps');
    if (lista) lista.appendChild(h('button.mapCard.rc-criar', { type: 'button', on: { click: () => { clique(); ED.volta = ''; abreLista(); } } },
      h('div.rc-criar-img', icone('novo')), h('div.mn', { texto: 'Criar o seu' }), h('div.md', { texto: 'Monte um estádio na Oficina de estádios.' })));
  }
  return el;
};
function fimTeste() {
  if (!ED.teste) return;
  ED.teste = null;
  const q = document.getElementById('btnQuit'), m = document.getElementById('btnMenu');
  if (q) q.textContent = 'Sair para o menu';
  if (m) m.textContent = 'Menu';
}
function sair() {                                        // VOLTAR PARA A OFICINA
  ED.deFora = false;
  if (NA_OFICINA) { avisaPai('sair'); return; }
  if (VOLTA_RACHA) { if (history.length > 1) history.back(); else location.href = '../racha.html'; }   // (veio do RACHA nesta aba)
}

/* ---------------------------------------------------------------- 6) a tela inicial: a placa da Oficina e o voltar */
const ICONE_OFICINA = '<svg class="ico" viewBox="0 0 48 48" aria-hidden="true"><rect x="3.5" y="9.5" width="33" height="25" rx="3" fill="#1e7a3c" stroke="#fbf8ee" stroke-width="2.6"/>'
  + '<path d="M20 9.5v25M3.5 17h4.5v10H3.5M36.5 17H32v10h4.5" stroke="#fbf8ee" stroke-width="1.8" fill="none"/><circle cx="20" cy="22" r="4.4" fill="none" stroke="#fbf8ee" stroke-width="1.8"/>'
  + '<circle cx="11" cy="15.5" r="2.6" fill="#ff4fbf" stroke="#1d1b16" stroke-width="1.2"/><path d="M24.5 28.5h8" stroke="#2e6b2f" stroke-width="3.6" stroke-linecap="round"/>'
  + '<path d="M27.6 44.4l1.6-6.6 12.6-12.6 5 5-12.6 12.6z" fill="#f7c531" stroke="#fbf8ee" stroke-width="2.2" stroke-linejoin="round"/><path d="M27.6 44.4l1.6-6.6 5 5z" fill="#fbf8ee"/></svg>';
function montaInicio() {
  const casa = document.getElementById('home'); if (!casa) return;
  const grande = casa.querySelector('.placa.big[data-mode="match"]');
  const pl = h('button.placa.big.rc-placa', { type: 'button', dados: { rc: 'estadios' } }, svgFixo(ICONE_OFICINA),
    h('span.t', { texto: 'Oficina de estádios' }), h('span.d', { texto: 'Monte o seu campo: formato, piso, física, obstáculos, lama, vento e poderes' }));
  pl.addEventListener('click', () => { clique(); abreLista(); });
  if (grande) grande.after(pl);
  if (NA_OFICINA || VOLTA_RACHA) {
    const muro = casa.querySelector('header.wall'), logo = muro && muro.querySelector('.logo');
    const b = h('button.back.rc-volta', { type: 'button' }, icone('voltar'), h('span', { texto: NA_OFICINA ? 'Voltar para a Oficina' : 'Voltar para o RACHA' }));
    b.addEventListener('click', () => { clique(); sair(); });
    if (muro) muro.insertBefore(b, logo);
  }
}

/* ---------------------------------------------------------------- 7) SEUS ESTÁDIOS (a lista) */
const LS = {};
function montaLista() {
  const el = h('section#rc-estadios.screen.menu.rc-tela', { hidden: true, 'aria-label': 'Seus estádios' });
  LS.voltar = h('button.back', { type: 'button', texto: '‹ Voltar', on: { click: () => { clique(); App.showHome(); } } });   // (veio da Oficina: o showHome volta para ela)
  LS.conta = h('span.rc-conta');
  LS.grade = h('div.rc-grade');
  el.append(h('div.rc-coluna', h('div.setupHead', LS.voltar, h('h2.rc-tit', { texto: 'Seus estádios' }), LS.conta),
    h('p.setupDesc', { texto: 'Monte o campo do seu jeito e jogue em qualquer modo visto de cima. Fica guardado neste aparelho; para levar para outro, copie o código.' }),
    h('div.rc-acoes', bt('Criar estádio', () => novoDialogo(), 'verde grande', 'novo'), bt('Colar código', () => importaDialogo(), '', 'codigo')),
    LS.grade));
  document.getElementById('app').appendChild(el);
  TELAS.estadios = el;
}
function abreLista() {
  App.showScreen('estadios');
  pintaLista();
  window.scrollTo(0, 0);
}
function infoTimes(m) { return m.sizes[0] === m.sizes[1] ? 'Melhor em ' + SIZE_LABELS[m.sizes[0]] : 'Melhor de ' + SIZE_LABELS[m.sizes[0]] + ' a ' + SIZE_LABELS[m.sizes[1]]; }
function pintaLista() {
  limpaFilhos(LS.grade);
  LS.conta.textContent = REGS.length ? REGS.length + ' de ' + MAX_ESTADIOS : '';
  const regs = REGS.slice().sort((a, b) => b.editado - a.editado);
  if (!regs.length) {
    LS.grade.appendChild(h('div.rc-vazio', h('b', { texto: 'Nenhum estádio ainda.' }),
      h('span', { texto: 'Comece do zero ou a partir de um dos 17 campos do Rachão: dá para mudar tudo, do tamanho do gol à gravidade.' })));
    return;
  }
  for (const reg of regs) LS.grade.appendChild(cartao(reg));
}
function cartao(reg) {
  const m = MAP_BY_ID[reg.id] || compila(reg.doc);
  const cv = h('canvas', { width: 320, height: 180 });
  try { renderMapThumb(cv, m); } catch (_) {}
  return h('div.rc-cartao', { role: 'group', 'aria-label': reg.doc.nome, dados: { id: reg.id } },
    h('button.rc-cartao-img', { type: 'button', title: 'Editar', 'aria-label': 'Editar ' + reg.doc.nome, on: { click: () => { clique(); abreEditor(reg); } } }, cv),
    h('div.mn', { texto: reg.doc.nome }), h('div.md', { texto: m.desc }), h('div.ms', { texto: infoTimes(m) }),
    h('div.rc-cartao-bts', bt('Editar', () => abreEditor(reg), 'verde'), bt('Jogar', () => jogaDialogo(reg), '', 'play'), bt('', () => menuEstadio(reg), 'ic', 'mais', 'Mais opções')));
}
function menuEstadio(reg, noEditor) {
  folha(reg.doc.nome, (c, fecha) => {
    const it = (ic, t, sub, f, cls) => c.appendChild(h('button.rc-item' + (cls ? '.' + cls : ''), { type: 'button', on: { click: () => { clique(); fecha(); f(); } } }, icone(ic), h('span', h('b', { texto: t }), h('small', { texto: sub }))));
    it('duplicar', 'Duplicar', 'Uma cópia para mexer sem estragar este', () => { const n = duplica(reg); if (n) { aviso('Cópia criada: ' + n.doc.nome); if (noEditor) abreEditor(n); else pintaLista(); } });
    it('codigo', 'Copiar código', 'Para mandar o estádio para alguém (ou guardar)', () => exportaDialogo(reg));
    it('apagar', 'Apagar', 'Some deste aparelho (não dá para desfazer)', () => confirma('Apagar «' + reg.doc.nome + '»?', 'O estádio some deste aparelho. Se quiser guardar, copie o código antes.', 'Apagar', () => { apaga(reg); aviso('Estádio apagado.'); if (noEditor) { ED.reg = null; abreLista(); } else pintaLista(); }), 'perigo');
  }, 'rc-menu');
}
function novoDialogo() {
  folha('Começar de onde?', (c, fecha) => {
    const grade = h('div.rc-modelos');
    const opcao = (nome, sub, faz, m) => {
      const cv = h('canvas', { width: 192, height: 108 });
      try { renderMapThumb(cv, m); } catch (_) {}
      grade.appendChild(h('button.rc-modelo', { type: 'button', on: { click: () => { clique(); fecha(); const reg = cria(faz()); if (reg) abreEditor(reg); } } }, cv, h('b', { texto: nome }), h('small', { texto: sub })));
    };
    const zero = () => { const d = docNovo(); d.nome = nomeLivre('Meu estádio'); return d; };
    opcao('Do zero', 'Gramado liso, sem nada', zero, compila(zero()));
    for (const m of ORIGINAIS) opcao(m.name, m.desc, () => { const d = docDeMapa(m); d.nome = nomeLivre(d.nome); return d; }, m);
    c.append(h('p.rc-tx', { texto: 'Escolha um ponto de partida: depois dá para mudar tudo.' }), grade);
  }, 'rc-larga');
}
function nomeLivre(n) { return REGS.some(r => r.doc.nome === n) ? nomeCopia(n) : n; }
function importaDialogo() {
  folha('Colar código', (c, fecha) => {
    const area = h('textarea.rc-codigo', { rows: 5, maxLength: LIM_CODIGO, placeholder: 'RACHAO1.…', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Código do estádio' });
    const erro = h('p.rc-erro', { role: 'alert', hidden: true });
    const vai = () => {
      const d = decodifica(area.value);
      if (!d) { erro.textContent = 'Esse código não é de um estádio do Rachão. Confira se copiou inteiro (ele começa com RACHAO1.).'; erro.hidden = false; return; }
      d.nome = nomeLivre(d.nome);
      const reg = cria(d); if (!reg) return;
      fecha(); aviso('Estádio importado: ' + reg.doc.nome); abreEditor(reg);
    };
    c.append(h('p.rc-tx', { texto: 'Cole aqui o código que alguém mandou (ou que você guardou). O estádio entra na sua lista.' }), area, erro,
      h('div.rc-linha-bts', bt('Cancelar', fecha), bt('Importar', vai, 'verde')));
  });
}
function exportaDialogo(reg) {
  const cod = codifica(reg === ED.reg && ED.doc ? ED.doc : reg.doc);
  folha('Código do estádio', (c, fecha) => {
    const area = h('textarea.rc-codigo', { rows: 5, readOnly: true, spellcheck: 'false', 'aria-label': 'Código do estádio' }); area.value = cod;
    area.addEventListener('focus', () => area.select());
    c.append(h('p.rc-tx', { texto: 'Mande este código para um amigo: ele toca em Colar código, na Oficina de estádios, e o «' + reg.doc.nome + '» aparece na lista dele.' }), area,
      h('div.rc-linha-bts', bt('Fechar', fecha), bt('Copiar', async () => { const ok = await copia(cod); if (ok) { aviso('Código copiado.'); fecha(); } else { area.focus(); area.select(); aviso('Não deu para copiar sozinho: o código está selecionado, copie com o dedo.', true); } }, 'verde', 'codigo')));
  });
}

/* ---------------------------------------------------------------- 8) jogar e testar o estádio */
const JOGOS = [['match', 'Contra bots', 'Você no time vermelho, com bots de companheiros se o time tiver mais gente.', 'play'],
  ['duo', '2 jogadores', 'Vermelho contra azul no mesmo aparelho: no teclado ou cada um numa metade da tela.', 'jogadores'],
  ['chaos', 'Caos', 'A partida com os poderes do estádio, para todo mundo.', 'play']]
  .concat(NA_OFICINA ? [['online', 'Sala online', 'Uma sala com este estádio para jogar com a galera, cada um no seu aparelho (o código da sala chama).', 'jogadores']] : []);   // (v98)
function jogaDialogo(reg) {                               // JOGAR: em qual modo (a preparação do modo abre já com o estádio)
  if (!reg) return;
  folha('Jogar no «' + reg.doc.nome + '»', (c, fecha) => {
    for (const [modo, t, sub, ic] of JOGOS) c.appendChild(h('button.rc-item', { type: 'button', dados: { modo }, on: { click: () => { clique(); fecha(); jogar(reg, modo); } } }, icone(ic), h('span', h('b', { texto: t }), h('small', { texto: sub }))));
  }, 'rc-menu');
}
function jogar(reg, modo) {
  modo = modo || 'match';
  if (ED.reg === reg && ED.doc) salvaJa();
  const m = MAP_BY_ID[reg.id]; if (!m) return;
  const s = App.sel[modo];
  s.map = m.id;
  if (modo !== 'duo' && (s.size < m.sizes[0] || s.size > m.sizes[1])) s.size = m.def;
  if (m.scoreDefault && s.goals !== undefined) s.goals = m.scoreDefault;
  App.saveSel();
  ED.volta = telaAberta('editor') ? 'editor' : '';
  App.openSetup(modo);
}
const TESTES = [['bola', 'Bate-bola sozinho', 'Só você e a bola, para sentir o campo e a física.'], ['1', '1x1 contra o bot', 'Partida rápida de 2 minutos, até 3 gols.'],
  ['2', '2x2 com bots', 'Partida rápida de 2 minutos, até 3 gols.']];
function testaDialogo() {
  folha('Testar «' + ED.doc.nome + '»', (c, fecha) => {
    for (const [k, t, sub] of TESTES) c.appendChild(h('button.rc-item', { type: 'button', on: { click: () => { clique(); fecha(); testa(k); } } }, icone(k === 'bola' ? 'play' : 'jogadores'), h('span', h('b', { texto: t }), h('small', { texto: sub }))));
  }, 'rc-menu');
}
function testa(k) {
  salvaJa();
  const id = ED.reg.id, m = MAP_BY_ID[id]; if (!m) return;
  const base = { run: 'folego', lob: true, curve: true, superKick: true };
  const cfg = k === 'bola' ? Object.assign({ mode: 'free' }, base)
    : Object.assign({ mode: m.powersAlways ? 'chaos' : 'match', teams: [Number(k), Number(k)], humans: [{ team: 0, ctrl: 'p1' }], diff: 'medio', time: 120, goals: 3 }, base);
  ED.teste = { id, cfg };
  ED.volta = 'editor';
  App.mode = k === 'bola' ? 'train' : 'match';
  App.startGame();
  const q = document.getElementById('btnQuit'), mn = document.getElementById('btnMenu');
  if (q) q.textContent = 'Voltar ao editor';
  if (mn) mn.textContent = 'Voltar ao editor';
}

/* ---------------------------------------------------------------- 9) O EDITOR */
const ABAS = [['campo', 'Campo'], ['gols', 'Gols'], ['piso', 'Piso'], ['fisica', 'Física'], ['chutes', 'Chutes'], ['vento', 'Vento'], ['poderes', 'Poderes'], ['partida', 'Partida']];
const FERR = [['mover', 'Mover', 'mover'], ['poste', 'Poste', 'poste'], ['bumper', 'Para-choque', 'bumper'], ['vaso', 'Vaso', 'vaso'], ['cerca', 'Cerca', 'cerca'],
  ['lama', 'Lama', 'lama'], ['poca', 'Poça', 'poca'], ['apagar', 'Apagar', 'apagar']];
const DICA_FERR = { mover: 'Arraste as peças para mudar de lugar. As bolinhas brancas mudam o tamanho e o giro.', apagar: 'Toque numa peça para apagar.',
  poste: 'Toque no campo para pôr um poste', bumper: 'Toque no campo para pôr um para-choque', vaso: 'Toque no campo para pôr um vaso',
  cerca: 'Toque no campo para pôr uma cerca viva', lama: 'Toque no campo para pôr lama', poca: 'Toque no campo para pôr uma poça' };
function montaEditor() {
  const el = h('section#rc-editor.screen.rc-ed', { hidden: true, 'aria-label': 'Editor de estádio' });
  ED.nome = h('input.rc-ed-nome', { type: 'text', maxLength: LIM.nome, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Nome do estádio' });
  ED.nome.addEventListener('input', () => { ED.doc.nome = texto(ED.nome.value, LIM.nome) || 'Meu estádio'; recompila(); agendaSalvar(); });
  ED.nome.addEventListener('change', () => { ED.nome.value = ED.doc.nome; commit(); });
  ED.nome.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ED.nome.blur(); } });
  ED.estado = h('span.rc-ed-estado', { role: 'status', 'aria-live': 'polite' });
  ED.btDesfaz = bt('', desfaz, 'ic escuro rc-t-desfaz', 'desfazer', 'Desfazer (Ctrl+Z)');
  ED.btRefaz = bt('', refaz, 'ic escuro rc-t-refaz', 'refazer', 'Refazer (Ctrl+Y)');
  const topo = h('header.rc-ed-topo',
    bt('', () => saiEditor(), 'ic voltar rc-t-voltar', 'voltar', 'Voltar'), ED.nome, ED.estado, h('span.rc-esp'), ED.btDesfaz, ED.btRefaz,
    bt('Testar', testaDialogo, 'escuro rc-t-testar', 'play', 'Testar o estádio'), bt('Jogar', () => jogaDialogo(ED.reg), 'verde rc-t-jogar', null, 'Jogar no estádio'),
    bt('', () => { if (ED.salvaT) salvaJa(); menuEstadio(ED.reg, true); }, 'ic escuro rc-t-mais', 'mais', 'Mais opções'));
  ED.cv = h('canvas.rc-ed-cv', { tabIndex: 0, 'aria-label': 'O campo: toque para pôr, arraste para mover (setas movem a peça escolhida)' });
  ED.ctx = ED.cv.getContext('2d');
  ED.dica = h('div.rc-ed-dica');
  ED.alerta = h('div.rc-ed-alerta', { role: 'status', hidden: true });
  ED.palco = h('div.rc-ed-palco', ED.cv, ED.dica, ED.alerta);
  ED.ferrEl = h('div.rc-ed-ferr', { role: 'toolbar', 'aria-label': 'Ferramentas' });
  ED.abasEl = h('nav.rc-ed-abas', { role: 'tablist', 'aria-label': 'Opções do estádio' });
  ED.conteudo = h('div.rc-ed-conteudo');
  const painel = h('aside.rc-ed-painel', ED.abasEl, ED.conteudo);
  el.append(topo, h('div.rc-ed-corpo', h('div.rc-ed-esq', ED.palco, ED.ferrEl), painel));
  document.getElementById('app').appendChild(el);
  TELAS.editor = el;
  // o campo: tocar, arrastar
  ED.cv.addEventListener('pointerdown', apertou);
  ED.cv.addEventListener('pointermove', moveu);
  ED.cv.addEventListener('pointerup', soltou);
  ED.cv.addEventListener('pointercancel', soltou);
  ED.cv.addEventListener('lostpointercapture', soltou);
  try { new ResizeObserver(() => { if (telaAberta('editor')) { medeVista(); pedeDesenho(); } }).observe(ED.palco); } catch (_) {}
  window.addEventListener('resize', () => { if (telaAberta('editor')) { medeVista(); pedeDesenho(); } });
  document.addEventListener('keydown', teclaEditor);
}
function abreEditor(reg, voltando) {
  if (!reg) return abreLista();
  if (!voltando || !ED.doc || ED.reg !== reg) {
    ED.doc = JSON.parse(JSON.stringify(reg.doc));
    ED.hist = [JSON.stringify(ED.doc)]; ED.pos = 0; ED.sel = -1; ED.aba = 'campo'; ED.ferr = 'mover';
  }
  ED.reg = reg;
  App.showScreen('editor');
  ED.nome.value = ED.doc.nome;
  recompila(); montaFerr(); montaAbas(); montaAba(); botoesHist(); estado('Salvo');
  medeVista(); pedeDesenho();
  requestAnimationFrame(() => { medeVista(); pedeDesenho(); });
}
function saiEditor() {
  fechaPop(); salvaJa();
  abreLista();
  if (ED.deFora) sair();                                  // (veio da Oficina: volta para ela, com a lista por baixo)
}
// o documento mudou (sem guardar no histórico ainda): monta o campo de novo e desenha
function recompila() {
  ED.mapa = compila(Object.assign({}, ED.doc, { id: ED.reg ? ED.reg.id : 'u_rascunho' }));
  ED.st = buildStadium(ED.mapa);
  ajustaVista(); pedeDesenho(); alertas();
}
function mudou() { recompila(); estado('Salvando…'); }
function commit() {
  const s = JSON.stringify(ED.doc);
  if (ED.hist[ED.pos] !== s) {
    ED.hist = ED.hist.slice(0, ED.pos + 1); ED.hist.push(s);
    if (ED.hist.length > 80) ED.hist.shift();
    ED.pos = ED.hist.length - 1;
  }
  botoesHist(); agendaSalvar();
}
function trocaDoc(s) {                                    // (desfazer e refazer: a peça escolhida pode não ser mais a mesma — nada fica escolhido)
  ED.doc = JSON.parse(s); ED.sel = -1; if (ED.aba === 'peca') ED.aba = ED.abaAntes;
  ED.nome.value = ED.doc.nome; recompila(); montaAbas(); montaAba(); botoesHist(); agendaSalvar();
}
function desfaz() { if (ED.pos <= 0) return; ED.pos--; trocaDoc(ED.hist[ED.pos]); }
function refaz() { if (ED.pos >= ED.hist.length - 1) return; ED.pos++; trocaDoc(ED.hist[ED.pos]); }
function botoesHist() { ED.btDesfaz.disabled = ED.pos <= 0; ED.btRefaz.disabled = ED.pos >= ED.hist.length - 1; }
function estado(t) { ED.estado.textContent = t; ED.estado.classList.toggle('erro', /Não/.test(t)); }
function agendaSalvar() { estado('Salvando…'); clearTimeout(ED.salvaT); ED.salvaT = setTimeout(salvaJa, 650); }
function salvaJa() {
  clearTimeout(ED.salvaT); ED.salvaT = 0;
  if (!ED.reg || !ED.doc || REGS.indexOf(ED.reg) < 0) return;
  const antes = ED.doc.pecas.length;
  const ok = salvaReg(ED.reg, ED.doc);
  if (ED.reg.doc.pecas.length < antes) {
    ED.doc = JSON.parse(JSON.stringify(ED.reg.doc)); ED.sel = -1; if (ED.aba === 'peca') ED.aba = ED.abaAntes;
    recompila(); montaAbas(); montaAba(); aviso('Algumas peças passaram do limite do estádio e saíram.', true);
  }
  estado(ok ? 'Salvo' : 'Não salvou');
}

/* ---- a vista do campo */
function medeVista() {
  const r = ED.palco.getBoundingClientRect(), V = ED.vista;
  V.w = Math.max(1, Math.floor(r.width)); V.h = Math.max(1, Math.floor(r.height)); V.dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.round(V.w * V.dpr), H = Math.round(V.h * V.dpr);
  if (ED.cv.width !== W) ED.cv.width = W;
  if (ED.cv.height !== H) ED.cv.height = H;
  ED.cv.style.width = V.w + 'px'; ED.cv.style.height = V.h + 'px';
  ajustaVista();
}
function ajustaVista() {
  const V = ED.vista, st = ED.st; if (!st) return;
  const ex = st.ext.x + 12, ey = st.ext.y + 12;
  V.sc = Math.max(0.05, Math.min(V.w / (2 * ex), V.h / (2 * ey)));
  V.ox = V.w / 2; V.oy = V.h / 2;
}
const paraMundo = e => { const r = ED.cv.getBoundingClientRect(), V = ED.vista; return { x: (e.clientX - r.left - V.ox) / V.sc, y: (e.clientY - r.top - V.oy) / V.sc }; };
function pedeDesenho() { if (!ED.raf) ED.raf = requestAnimationFrame(desenha); }
function desenha() {
  ED.raf = 0;
  if (!telaAberta('editor') || !ED.mapa) return;
  const V = ED.vista, ctx = ED.ctx, m = ED.mapa, st = ED.st;
  ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
  ctx.fillStyle = (SURFACES[m.surface] || SURFACES.grass).out; ctx.fillRect(0, 0, V.w, V.h);
  ctx.save(); ctx.translate(V.ox, V.oy); ctx.scale(V.sc, V.sc);
  try { drawField(ctx, st, m, 1 / V.sc); drawStatics(ctx, st.statics, m, 0); } catch (e) { console.error('Oficina de estádios (desenho):', e); }
  if (ED.jogadores) fantasmas(ctx, m, st);
  marcaSelecao(ctx);
  ctx.restore();
  if (m.wind) {                                          // o vento ligado: a bandeirinha no canto
    ctx.save(); ctx.translate(V.w - 26, 24);
    ctx.fillStyle = 'rgba(29,27,22,.72)'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (const [y, l] of [[-5, 16], [1, 12], [7, 8]]) { ctx.beginPath(); ctx.moveTo(-9, y); ctx.lineTo(-9 + l, y); ctx.stroke(); }
    ctx.restore();
  }
}
function fantasmas(ctx, m, st) {                         // onde os times começam (no tamanho padrão do estádio) e a bola
  const P = st.phys, n = clampN(m.def || 2, 1, 7), form = FORMATIONS[n] || FORMATIONS[1];
  const W = Math.abs(st.gx[1]), H = m.H;
  ctx.save(); ctx.globalAlpha = 0.5;
  for (let t = 0; t < 2; t++) {
    const s = t === 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const f = form[i % form.length];
      let x = f[0] * W * s, y = f[1] * H;
      if (i >= form.length) y += (i - form.length + 1) * 30;
      if (t === 0 && i === 0) { x = -s * (P.playerR + P.ballR + 7); y = 0; } else if (i === 0) x = -s * (m.circle + P.playerR + 6);
      ctx.fillStyle = TEAM_COL[t]; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, P.playerR, 0, TAU); ctx.fill(); ctx.stroke();
    }
  }
  ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, P.ballR, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.restore();
}
const ALCA = 12;                                         // (a alça do tamanho fica 12 px fora da borda da peça)
function alcas(p) {                                      // as alças da peça escolhida (na primeira cópia)
  if (p.t === 'cerca') { const a = p.a * Math.PI / 180, dx = Math.cos(a) * p.len / 2, dy = Math.sin(a) * p.len / 2; return [{ k: 'ponta', x: p.x + dx, y: p.y + dy, s: 1 }, { k: 'ponta', x: p.x - dx, y: p.y - dy, s: -1 }]; }
  const a = -Math.PI / 4, d = p.r + ALCA / ED.vista.sc; return [{ k: 'raio', x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d }];
}
function marcaSelecao(ctx) {
  const p = ED.doc.pecas[ED.sel]; if (!p) return;
  const sc = ED.vista.sc;
  ctx.save();
  ctx.lineWidth = 2.4 / sc; ctx.setLineDash([7 / sc, 5 / sc]);
  copias(p).forEach((c, i) => {
    ctx.strokeStyle = i === 0 ? '#fff' : 'rgba(255,255,255,.55)';
    ctx.beginPath();
    if (p.t === 'cerca') {
      const a = p.a * c.sx * c.sy * Math.PI / 180, e = p.th + 6;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(a); ctx.rect(-p.len / 2 - e, -e, p.len + 2 * e, 2 * e); ctx.restore();
    } else ctx.arc(c.x, c.y, p.r + 6, 0, TAU);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  for (const a of alcas(p)) {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2.6 / sc;
    ctx.beginPath(); ctx.arc(a.x, a.y, 8 / sc, 0, TAU); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/* ---- tocar no campo: escolher, pôr, mover, esticar, girar, apagar */
function achaPeca(w, toque) {                           // (no toque do dedo a folga é maior: o alvo fica perto dos 44 px)
  const tol = (toque ? 16 : 9) / ED.vista.sc;
  const dist = (p, c) => {
    if (p.t === 'cerca') { const a = p.a * c.sx * c.sy * Math.PI / 180, dx = Math.cos(a) * p.len / 2, dy = Math.sin(a) * p.len / 2; return segDist(w.x, w.y, c.x - dx, c.y - dy, c.x + dx, c.y + dy) - p.th; }
    return Math.hypot(w.x - c.x, w.y - c.y) - p.r;
  };
  for (const zonas of [false, true]) for (let i = ED.doc.pecas.length - 1; i >= 0; i--) {
    const p = ED.doc.pecas[i];
    if ((p.t === 'lama' || p.t === 'poca') !== zonas) continue;
    for (const c of copias(p)) if (dist(p, c) <= (zonas ? 0 : tol)) return { i, c };
  }
  return null;
}
function achaAlca(w, toque) {
  const p = ED.doc.pecas[ED.sel]; if (!p) return null;
  const tol = (toque ? 20 : 13) / ED.vista.sc;
  for (const a of alcas(p)) if (Math.hypot(w.x - a.x, w.y - a.y) <= tol) return a;
  return null;
}
function prende(v) {                                     // o ímã: de 10 em 10 e grudando na linha do meio
  if (!ED.ima) return Math.round(v);
  const g = Math.round(v / 10) * 10;
  return Math.abs(v) < 7 ? 0 : g;
}
function noCampo(p) { const C = ED.doc.campo; p.x = clampN(Math.round(p.x), -C.W, C.W); p.y = clampN(Math.round(p.y), -C.H, C.H); }
function apertou(e) {
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();
  try { ED.cv.setPointerCapture(e.pointerId); } catch (_) {}
  const w = paraMundo(e), toque = e.pointerType === 'touch' || e.pointerType === 'pen';
  const a = ED.ferr !== 'apagar' ? achaAlca(w, toque) : null;
  if (a) { ED.arrasto = { tipo: a.k, s: a.s || 1, id: e.pointerId, moveu: false }; return; }
  const alvo = achaPeca(w, toque);
  if (ED.ferr === 'apagar') { if (alvo) { ED.doc.pecas.splice(alvo.i, 1); ED.sel = -1; clique(); recompila(); commit(); montaAbas(); montaAba(); } return; }
  if (alvo) {
    escolhe(alvo.i);
    if (ED.ferr !== 'mover') { ED.ferr = 'mover'; pintaFerr(); }
    ED.arrasto = { tipo: 'mover', i: alvo.i, sx: alvo.c.sx, sy: alvo.c.sy, dx: alvo.c.x - w.x, dy: alvo.c.y - w.y, id: e.pointerId, moveu: false };
    return;
  }
  if (TIPOS.indexOf(ED.ferr) >= 0) {
    if (ED.doc.pecas.length >= LIM.pecas) return aviso('Chegou no máximo de peças (' + LIM.pecas + ').', true);
    const p = Object.assign({ t: ED.ferr, x: prende(w.x), y: prende(w.y), sim: ED.sim }, JSON.parse(JSON.stringify(PECA_PADRAO[ED.ferr])));
    noCampo(p);
    ED.doc.pecas.push(p);
    if (totalCopias(ED.doc) > LIM.copias) { ED.doc.pecas.pop(); return aviso('Peças demais com esse espelho: tente “Só uma”.', true); }
    clique();
    escolhe(ED.doc.pecas.length - 1);
    recompila();
    ED.arrasto = { tipo: 'mover', i: ED.sel, sx: 1, sy: 1, dx: p.x - w.x, dy: p.y - w.y, id: e.pointerId, moveu: true };
    return;
  }
  if (ED.sel >= 0) { escolhe(-1); }
}
function moveu(e) {
  const A = ED.arrasto;
  if (!A || A.id !== e.pointerId) { if (!A && e.pointerType === 'mouse') { const w = paraMundo(e); ED.cv.style.cursor = achaAlca(w) ? 'grab' : achaPeca(w) ? (ED.ferr === 'apagar' ? 'not-allowed' : 'move') : TIPOS.indexOf(ED.ferr) >= 0 ? 'crosshair' : 'default'; } return; }
  e.preventDefault();
  const w = paraMundo(e), p = ED.doc.pecas[A.tipo === 'mover' ? A.i : ED.sel]; if (!p) return;
  if (A.tipo === 'mover') {
    const ax = p.x, ay = p.y;
    p.x = prende((w.x + A.dx) * A.sx); p.y = prende((w.y + A.dy) * A.sy); noCampo(p);
    if (p.sim !== 'n' && totalCopias(ED.doc) > LIM.copias) { p.x = ax; p.y = ay; if (!A.avisou) { A.avisou = true; aviso('Peças demais no campo: fora da linha do meio, esta peça espelhada vira mais cópias.', true); } return; }
  }
  else if (A.tipo === 'raio') { const L = LIM.r[p.t]; p.r = Math.round(clampN(Math.hypot(w.x - p.x, w.y - p.y) - ALCA / ED.vista.sc, L[0], L[1])); }
  else if (A.tipo === 'ponta') {
    let vx = (w.x - p.x) * A.s, vy = (w.y - p.y) * A.s;
    p.len = Math.round(clampN(2 * Math.hypot(vx, vy), LIM.len[0], LIM.len[1]));
    let a = Math.atan2(vy, vx) * 180 / Math.PI; if (a > 90) a -= 180; if (a < -90) a += 180;
    if (ED.ima) a = Math.round(a / 15) * 15;
    p.a = Math.round(clampN(a, -90, 90));
  }
  A.moveu = true;
  recompila(); estado('Salvando…');
  if (ED.aba === 'peca') atualizaPeca();
}
function soltou(e) {
  const A = ED.arrasto; if (!A || (e.pointerId !== undefined && A.id !== e.pointerId)) return;
  ED.arrasto = null;
  if (A.moveu) { commit(); if (ED.aba === 'peca') montaAba(); }
}
function escolhe(i) {
  if (i === ED.sel) return;
  if (i >= 0 && ED.sel < 0 && ED.aba !== 'peca') ED.abaAntes = ED.aba;
  ED.sel = i;
  ED.aba = i >= 0 ? 'peca' : (ED.aba === 'peca' ? ED.abaAntes : ED.aba);
  if (i >= 0) { ED.sim = ED.doc.pecas[i].sim; pintaFerr(); }
  montaAbas(); montaAba(); pedeDesenho();
}
function apagaSel() { if (ED.sel < 0) return; ED.doc.pecas.splice(ED.sel, 1); ED.sel = -1; ED.aba = ED.abaAntes; recompila(); commit(); montaAbas(); montaAba(); }
function duplicaSel() {
  const p = ED.doc.pecas[ED.sel]; if (!p) return;
  if (ED.doc.pecas.length >= LIM.pecas) return aviso('Chegou no máximo de peças (' + LIM.pecas + ').', true);
  const q = JSON.parse(JSON.stringify(p)); q.x += 30; q.y += 30; noCampo(q);
  ED.doc.pecas.push(q);
  if (totalCopias(ED.doc) > LIM.copias) { ED.doc.pecas.pop(); return aviso('Peças demais com esse espelho.', true); }
  ED.sel = -1; escolhe(ED.doc.pecas.length - 1); recompila(); commit();
}
function teclaEditor(e) {
  if (!telaAberta('editor') || document.querySelector('.rc-fundo')) return;
  const alvo = e.target, digitando = alvo && (alvo.tagName === 'INPUT' && alvo.type !== 'range' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable);
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (mod && k === 'z' && !digitando) { e.preventDefault(); if (e.shiftKey) refaz(); else desfaz(); return; }
  if (mod && k === 'y' && !digitando) { e.preventDefault(); refaz(); return; }
  if (digitando) return;
  if (mod && k === 'd') { e.preventDefault(); duplicaSel(); return; }
  if (ED.sel >= 0 && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); apagaSel(); return; }
  if (e.key === 'Escape' && ED.pop) { e.preventDefault(); fechaPop(); try { ED.btSim.focus(); } catch (_) {} return; }
  if (e.key === 'Escape' && ED.sel >= 0) { e.preventDefault(); escolhe(-1); return; }
  const setas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (setas && ED.sel >= 0 && alvo === ED.cv) {
    e.preventDefault();
    const p = ED.doc.pecas[ED.sel], n = e.shiftKey ? 10 : 1, ax = p.x, ay = p.y; p.x += setas[0] * n; p.y += setas[1] * n; noCampo(p);
    if (p.sim !== 'n' && totalCopias(ED.doc) > LIM.copias) { p.x = ax; p.y = ay; return aviso('Peças demais no campo: fora da linha do meio, esta peça espelhada vira mais cópias.', true); }
    recompila(); commit(); if (ED.aba === 'peca') atualizaPeca();
  }
}

/* ---- as ferramentas (embaixo do campo) */
function montaFerr() {
  limpaFilhos(ED.ferrEl);
  for (const [id, nome, ic] of FERR) ED.ferrEl.appendChild(h('button.rc-ferr', { type: 'button', title: nome, 'aria-label': nome, dados: { f: id }, on: { click: () => { clique(); ED.ferr = id; pintaFerr(); } } }, icone(ic), h('span.rc-ferr-tx', { texto: nome })));
  ED.ferrEl.appendChild(h('span.rc-ferr-sep', { 'aria-hidden': 'true' }));
  ED.btSim = h('button.rc-ferr.rc-ferr-espelho', { type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', on: { click: e => { e.stopPropagation(); clique(); popEspelho(); } } }, icone('sim_x'), h('span.rc-ferr-tx', { texto: 'Espelho' }));
  ED.btIma = h('button.rc-ferr', { type: 'button', title: 'Ímã: de 10 em 10, grudando na linha do meio (e o giro de 15 em 15°)', 'aria-label': 'Ímã', on: { click: () => { clique(); ED.ima = !ED.ima; pintaFerr(); } } }, icone('ima'), h('span.rc-ferr-tx', { texto: 'Ímã' }));
  ED.btJog = h('button.rc-ferr', { type: 'button', title: 'Mostrar onde os times começam', 'aria-label': 'Mostrar os times', on: { click: () => { clique(); ED.jogadores = !ED.jogadores; pintaFerr(); pedeDesenho(); } } }, icone('jogadores'), h('span.rc-ferr-tx', { texto: 'Times' }));
  ED.ferrEl.append(ED.btSim, ED.btIma, ED.btJog);
  pintaFerr();
}
// o espelho: a lista das 5 escolhas por cima das ferramentas (vale para as peças novas e para a escolhida)
function popEspelho() {
  if (ED.pop) return fechaPop();
  const pop = h('div.rc-pop', { role: 'menu', 'aria-label': 'Espelho das peças' });
  for (const s of SIMS) {
    const on = s === ED.sim;
    pop.appendChild(h('button.rc-pop-it' + (on ? '.on' : ''), { type: 'button', role: 'menuitemradio', 'aria-checked': String(on), on: { click: e => { e.stopPropagation(); clique(); escolheSim(s); fechaPop(); } } },
      icone('sim_' + s), h('span', { texto: N_SIM[s] })));
  }
  const esq = ED.ferrEl.parentNode, r0 = esq.getBoundingClientRect(), rb = ED.btSim.getBoundingClientRect();
  pop.style.left = Math.max(6, Math.min(rb.left - r0.left, r0.width - 236)) + 'px';
  pop.style.bottom = (r0.bottom - rb.top + 6) + 'px';
  esq.appendChild(pop);
  ED.pop = pop; ED.btSim.setAttribute('aria-expanded', 'true');
  setTimeout(() => document.addEventListener('pointerdown', foraPop, true), 0);
  const it = pop.querySelector('.on') || pop.firstChild; try { it.focus({ preventScroll: true }); } catch (_) {}
}
function foraPop(e) { if (ED.pop && !ED.pop.contains(e.target) && e.target !== ED.btSim && !ED.btSim.contains(e.target)) fechaPop(); }
function fechaPop() { if (!ED.pop) return; ED.pop.remove(); ED.pop = null; ED.btSim.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', foraPop, true); }
function escolheSim(s) {
  ED.sim = s;
  const p = ED.doc.pecas[ED.sel];
  if (p && p.sim !== s) {
    const antes = p.sim; p.sim = s;
    if (totalCopias(ED.doc) > LIM.copias) { p.sim = antes; aviso('Peças demais com esse espelho.', true); }
    else { recompila(); commit(); if (ED.aba === 'peca') montaAba(); }
  }
  pintaFerr();
}
function pintaFerr() {
  for (const b of ED.ferrEl.querySelectorAll('[data-f]')) { const on = b.dataset.f === ED.ferr; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
  if (ED.btSim) {
    const ic = ED.btSim.querySelector('.rc-ic'); if (ic) ic.replaceWith(icone('sim_' + ED.sim));
    ED.btSim.title = 'Espelho das peças: ' + N_SIM[ED.sim].toLowerCase(); ED.btSim.setAttribute('aria-label', 'Espelho das peças: ' + N_SIM[ED.sim].toLowerCase());
  }
  if (ED.btIma) { ED.btIma.classList.toggle('on', ED.ima); ED.btIma.setAttribute('aria-pressed', String(ED.ima)); }
  if (ED.btJog) { ED.btJog.classList.toggle('on', ED.jogadores); ED.btJog.setAttribute('aria-pressed', String(ED.jogadores)); }
  const dica = DICA_FERR[ED.ferr] + (TIPOS.indexOf(ED.ferr) >= 0 ? ' (' + N_SIM[ED.sim].toLowerCase() + ').' : '');
  if (ED.dica.textContent !== dica) { ED.dica.textContent = dica; ED.dica.classList.add('on'); clearTimeout(ED.dicaT); ED.dicaT = setTimeout(() => ED.dica.classList.remove('on'), 5200); }
  ED.cv.style.cursor = TIPOS.indexOf(ED.ferr) >= 0 ? 'crosshair' : 'default';
}
function alertas() {                                    // o que pode atrapalhar a partida (não impede de salvar)
  const st = ED.st, avisos = [];
  const R = (st.phys.ballR || 10);
  const tapaGol = st.goals.some(g => st.statics.some(s => s.style !== 'trave' && s.style !== 'chinelo' && s.style !== 'bambu' && Math.abs(s.x - g.x) < s.r + R * 2 && Math.abs(s.y) < g.half + s.r)
    || st.walls.some(w => segDist(g.x, 0, w.x1, w.y1, w.x2, w.y2) < w.th + R * 2 || segDist(g.x, g.half, w.x1, w.y1, w.x2, w.y2) < w.th + R || segDist(g.x, -g.half, w.x1, w.y1, w.x2, w.y2) < w.th + R));
  if (tapaGol) avisos.push('Tem peça na boca do gol: a bola mal passa.');
  const meio = st.statics.some(s => s.style !== 'trave' && s.style !== 'chinelo' && s.style !== 'bambu' && Math.hypot(s.x, s.y) < s.r + R + st.phys.playerR * 2)
    || st.walls.some(w => segDist(0, 0, w.x1, w.y1, w.x2, w.y2) < w.th + R + st.phys.playerR * 2);
  if (meio) avisos.push('Tem peça em cima da bola do meio: a saída fica travada.');
  const C = ED.doc.campo, L = limites(ED.doc);
  if (C.formato === 'ret' && C.cantos !== 'reto' && C.canto > L.cantoMax) avisos.push('O canto ficou menor para caber o gol.');
  ED.alerta.hidden = !avisos.length;
  ED.alerta.textContent = avisos.join(' ');
}

/* ---- o painel: as abas */
function abasVisiveis() { return (ED.sel >= 0 ? [['peca', 'Peça']] : []).concat(ABAS); }
function montaAbas() {
  limpaFilhos(ED.abasEl);
  for (const [id, nome] of abasVisiveis()) {
    const b = h('button.tab', { type: 'button', role: 'tab', 'aria-selected': String(ED.aba === id), dados: { a: id }, texto: nome });
    if (ED.aba === id) b.classList.add('on');
    if (id === 'peca') b.classList.add('rc-tab-peca');
    b.addEventListener('click', () => { clique(); if (id !== 'peca' && ED.sel >= 0) { ED.abaAntes = id; ED.sel = -1; pedeDesenho(); } ED.aba = id; montaAbas(); montaAba(); });
    ED.abasEl.appendChild(b);
  }
  const on = ED.abasEl.querySelector('.on'); if (on) try { on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) {}
}
function montaAba() {
  const c = limpaFilhos(ED.conteudo);
  c.scrollTop = 0;
  const f = { peca: abaPeca, campo: abaCampo, gols: abaGols, piso: abaPiso, fisica: abaFisica, chutes: abaChutes, vento: abaVento, poderes: abaPoderes, partida: abaPartida }[ED.aba] || abaCampo;
  f(c);
}
// os controles: a faixa (slider), os botões de escolha e a chave
function ctlFaixa(rot, obj, chave, a, b, passo, o) {
  o = o || {};
  const fmt = o.fmt || (v => String(v)), pad = o.padrao;
  const atual = () => obj[chave] != null ? obj[chave] : pad;
  const saida = h('output.rc-val', { texto: fmt(atual()) });
  const inp = h('input.rc-faixa', { type: 'range', min: String(a), max: String(b), step: String(passo), 'aria-label': rot });
  inp.value = String(clampN(atual(), a, b));
  const pinta = () => inp.style.setProperty('--p', ((Number(inp.value) - a) / ((b - a) || 1) * 100).toFixed(1) + '%');
  const zera = pad != null && o.zeravel ? h('button.rc-zera', { type: 'button', texto: o.zeraTexto || 'padrão', title: o.zeraTexto ? 'Voltar ao ' + o.zeraTexto + ' (' + fmt(pad) + ')' : 'Voltar ao padrão (' + fmt(pad) + ')', on: { click: () => { clique(); delete obj[chave]; mudou(); commit(); montaAba(); } } }) : null;
  const marca = () => { if (zera) zera.hidden = obj[chave] == null || obj[chave] === pad; };
  inp.addEventListener('input', () => {
    const v = arredonda(Number(inp.value), passo);
    obj[chave] = v; saida.textContent = fmt(v); pinta(); marca();
    if (o.aoMudar) o.aoMudar(v);
    mudou();
  });
  inp.addEventListener('change', () => { if (o.depois) o.depois(); commit(); if (o.remonta) montaAba(); });
  pinta(); marca();
  return h('div.rc-ctl', h('div.rc-rot', h('label', { texto: rot }), zera, saida), inp, o.dica ? h('small.rc-dica', { texto: o.dica }) : null);
}
function ctlSeg(rot, obj, chave, opcoes, o) {
  o = o || {};
  const fila = h('div.rc-seg', { role: 'group', 'aria-label': rot });
  for (const [v, t] of opcoes) {
    const b = h('button', { type: 'button', texto: t, 'aria-pressed': String(obj[chave] === v) });
    if (obj[chave] === v) b.classList.add('on');
    b.addEventListener('click', () => { if (obj[chave] === v) return; clique(); obj[chave] = v; if (o.aoMudar) o.aoMudar(v); mudou(); commit(); montaAba(); });
    fila.appendChild(b);
  }
  return h('div.rc-ctl', rot ? h('div.rc-rot', h('label', { texto: rot })) : null, fila, o.dica ? h('small.rc-dica', { texto: o.dica }) : null);
}
function ctlChave(rot, obj, chave, o) {
  o = o || {};
  const on = !!obj[chave];
  const b = h('button.rc-chave', { type: 'button', role: 'switch', 'aria-checked': String(on) }, h('i'), h('span', { texto: rot }));
  if (on) b.classList.add('on');
  b.addEventListener('click', () => { clique(); obj[chave] = !obj[chave]; if (o.aoMudar) o.aoMudar(obj[chave]); mudou(); commit(); montaAba(); });
  return h('div.rc-ctl', b, o.dica ? h('small.rc-dica', { texto: o.dica }) : null);
}
const grupo = (tit, ...filhos) => h('div.rc-grupo', tit ? h('h3', { texto: tit }) : null, ...filhos);
const nota = t => h('p.rc-nota', { texto: t });
const dobro = v => String(v * 2);
function cabePecas() {                                   // (o campo encolheu: as peças voltam para dentro)
  for (const p of ED.doc.pecas) noCampo(p);
  recompila();
}

function abaCampo(c) {
  const C = ED.doc.campo, L = limites(ED.doc);
  c.append(grupo('Formato',
    ctlSeg('', C, 'formato', [['ret', 'Retângulo'], ['oval', 'Oval'], ['rinque', 'Rinque']], { aoMudar: v => { if (v === 'rinque' && C.canto < 60) C.canto = 112; } }),
    nota(C.formato === 'rinque' ? 'Rinque: as tabelas fecham tudo (a bola e os jogadores não saem) e o gol fica longe da tabela, com espaço atrás.' : C.formato === 'oval' ? 'Oval: o muro em volta é uma elipse, como um coliseu.' : 'Retângulo: o campo de sempre, com a área de fora para os jogadores.')),
    grupo('Tamanho',
      ctlFaixa('Comprimento', C, 'W', LIM.W[0], LIM.W[1], 5, { fmt: dobro, depois: cabePecas, remonta: true }),
      ctlFaixa('Largura', C, 'H', LIM.H[0], LIM.H[1], 5, { fmt: dobro, depois: cabePecas, remonta: true }),
      nota('O Clássico tem 860 × 410. Campos grandes pedem times cheios (veja a aba Partida).')));
  if (C.formato === 'ret') c.append(grupo('Cantos',
    ctlSeg('', C, 'cantos', [['reto', 'Retos'], ['redondo', 'Redondos'], ['chanfro', 'Cortados']]),
    C.cantos !== 'reto' ? ctlFaixa('Tamanho do canto', C, 'canto', 0, Math.max(10, L.cantoMax), 2) : null,
    C.cantos === 'chanfro' ? ctlFaixa('Canto que devolve a bola', C, 'impulso', 0, LIM.impulso[1], 0.5, { fmt: v => v ? v.toFixed(1) : 'não', dica: 'Como no Fliperama: o canto cortado empurra a bola de volta.' }) : null));
  if (C.formato === 'rinque') c.append(grupo('Cantos', ctlFaixa('Curva das tabelas', C, 'canto', 30, L.cantoMax, 2)));
  c.append(grupo('Marcas e entorno',
    ctlFaixa('Círculo do meio', C, 'circulo', LIM.circulo[0], L.circMax, 2, { dica: 'Na saída de bola, o time de fora espera do lado de fora dele.' }),
    C.formato !== 'rinque' ? ctlFaixa('Área de fora (para os jogadores)', C, 'margem', LIM.margem[0], LIM.margem[1], 2) : null));
}
function abaGols(c) {
  const G = ED.doc.gol, C = ED.doc.campo, L = limites(ED.doc);
  c.append(grupo('Gol',
    ctlFaixa('Largura do gol', G, 'largura', LIM.gol[0], L.golMax, 2, { fmt: dobro, remonta: true, dica: 'O Clássico tem 132. O Buraquinho, 52; o Gol Aberto, 240.' }),
    ctlFaixa('Fundo da rede', G, 'fundo', LIM.fundo[0], LIM.fundo[1], 2, { remonta: true }),
    C.formato === 'rinque' ? ctlFaixa('Distância da tabela', G, 'recuo', L.recuoMin, L.recuoMax, 2, { dica: 'O espaço atrás do gol, para a bola dar a volta.' }) : null),
    grupo('Traves', ctlSeg('', G, 'trave', [['trave', 'Traves'], ['chinelo', 'Chinelos'], ['bambu', 'Bambu']], { dica: 'Os chinelos são o gol de rua; o bambu, o da praia. Só muda o desenho: a grossura está na aba Física.' })),
    grupo('Fundo do gol', ctlSeg('', G, 'rede', [['net', 'Rede'], ['garage', 'Portão'], ['hole', 'Buraco no muro']])),
    nota('No modo Caos, o poder Golzão alarga o gol do adversário por 6 segundos.'));
}
const mostras = new Map();
function amostraPiso(id) {                               // a amostra de cada piso, desenhada pelo próprio motor (uma vez)
  if (mostras.has(id)) return mostras.get(id);
  let url = '';
  try { const c = document.createElement('canvas'); c.width = 128; c.height = 72; renderMapThumb(c, { id: 'amostra-' + id, W: 200, H: 100, goal: 30, depth: 24, corner: 14, margin: 24, circle: 30, surface: id, sizes: [1, 1], def: 1 }); url = c.toDataURL('image/png'); } catch (_) {}
  mostras.set(id, url); return url;
}
function abaPiso(c) {
  const grade = h('div.rc-pisos', { role: 'group', 'aria-label': 'Piso' });
  for (const [id, nome] of PISOS) {
    const on = ED.doc.piso === id, u = amostraPiso(id);
    const b = h('button.rc-piso', { type: 'button', 'aria-pressed': String(on), title: nome + (DICA_PISO[id] ? ': ' + DICA_PISO[id] : '') },
      u ? h('img', { src: u, alt: '', draggable: 'false' }) : h('i'), h('b', { texto: nome }), DICA_PISO[id] ? h('small', { texto: DICA_PISO[id] }) : null);
    if (on) b.classList.add('on');
    b.addEventListener('click', () => { if (ED.doc.piso === id) return; clique(); ED.doc.piso = id; mudou(); commit(); for (const x of grade.children) { const o = x === b; x.classList.toggle('on', o); x.setAttribute('aria-pressed', String(o)); } });
    grade.appendChild(b);
  }
  c.append(grupo('Piso', grade, nota('O piso muda o desenho e o clima (a noite escurece, a chuva cai). A física do piso fica na aba Física: escolha lá o jeito de rolar.')));
}
function abaFisica(c) {
  const F = ED.doc.fisica;
  const fila = h('div.rc-chips', { role: 'group', 'aria-label': 'Física pronta' });
  for (const [id, nome, o] of PRESETS) {
    const igual = FIS.every(f => (F[f.k] != null ? F[f.k] : padraoFis(f.k)) === (o[f.k] != null ? o[f.k] : padraoFis(f.k))) && (F.andar || 'embalo') === 'embalo';
    const b = h('button.rc-chip', { type: 'button', texto: nome, 'aria-pressed': String(igual) });
    if (igual) b.classList.add('on');
    b.addEventListener('click', () => { clique(); for (const k in F) delete F[k]; for (const f of FIS) if (o[f.k] != null) F[f.k] = o[f.k]; mudou(); commit(); montaAba(); });
    fila.appendChild(b);
  }
  if (PONTE) c.appendChild(misturaRacha(F));
  c.append(grupo('Física pronta', fila, nota('Comece por uma e ajuste o resto embaixo. «padrão» volta o valor do Clássico.')));
  let g = null, nomeG = '';
  const andar = F.andar === 'direto' ? 'direto' : 'embalo';
  const qb = () => F.ballBounce != null ? F.ballBounce : PHYS_PADRAO.ballBounce, qp = () => F.wallBounce != null ? F.wallBounce : PHYS_PADRAO.wallBounce;
  const pb = () => F.playerBounce != null ? F.playerBounce : PHYS_PADRAO.playerBounce, im = () => F.ballIm != null ? F.ballIm : PHYS_PADRAO.ballIm;
  for (const f of FIS) {
    if (f.g !== nomeG) {
      nomeG = f.g; g = grupo(f.g); c.appendChild(g);
      if (f.g === 'Jogador') g.appendChild(ctlSeg('Jeito de andar', { andar }, 'andar', [['embalo', 'Com embalo (o do Rachão)'], ['direto', 'Direto (o do RACHA)']], {
        aoMudar: v => {
          if (v === 'direto') {                                  // (a mesma velocidade de agora, arrancando e parando na hora)
            const ac = F.accel != null ? F.accel : PHYS_PADRAO.accel, dp = F.playerDamp != null ? F.playerDamp : PHYS_PADRAO.playerDamp;
            F.andar = 'direto'; F.moveMax = arredFis('moveMax', ac / (1 - dp)); F.moveAccel = 1; F.moveBrake = 1;
          } else { delete F.andar; delete F.moveMax; delete F.moveAccel; delete F.moveBrake; }
        },
        dica: andar === 'direto' ? 'Direto: soma a velocidade até o máximo e, soltou, freia — como a tampinha do RACHA.' : 'Com embalo: a arrancada soma aos poucos e o jogador desliza ao soltar — o jeito do Rachão.' }));
    }
    if (f.so && f.so !== andar) continue;
    const o = { padrao: padraoFis(f.k), zeravel: true, dica: f.dica, fmt: v => Number(v).toFixed(Math.max(0, casas(f.p))), depois: repintaMistura };
    let max = f.b;
    if (f.k === 'wallBounce') max = paredeMax(qb());                  // (a parede não faz a bola ganhar velocidade)
    if (f.k === 'ballBounce') { o.aoMudar = v => { if (v * qp() > 1) F.wallBounce = paredeMax(v); }; o.remonta = true; }
    if (f.zero) o.fmt = v => v > 0 ? Number(v).toFixed(2) : 'sem limite';
    if (f.k === 'ballFootBounce') { o.padrao = arredonda(qb() * pb(), 0.01); o.zeraTexto = 'automático'; }   // (sem valor: o quique da bola × o empurrão)
    if (f.k === 'ballWeight') { o.padrao = arredonda(PONTE ? PONTE.IM_JOGADOR / im() : 0.5 / im(), 0.05); o.zeraTexto = 'automático'; o.fmt = v => Number(v).toFixed(2) + '×'; }
    if (f.k === 'moveAccel' || f.k === 'moveBrake') o.fmt = v => Math.round(v * 100) + '%';
    if (f.k === 'moveMax') { const ac = F.accel != null ? F.accel : PHYS_PADRAO.accel, dp = F.playerDamp != null ? F.playerDamp : PHYS_PADRAO.playerDamp; o.padrao = arredFis('moveMax', ac / (1 - dp)); }
    g.appendChild(ctlFaixa(f.rot, F, f.k, f.a, max, f.p, o));
  }
}
// MISTURAR COM O RACHA: a bola, o jogador e o chute do RACHA (a ponte da física traduz pelo comportamento), cada um sozinho
const N_PARTE = { bola: 'Bola', jogador: 'Jogador', chute: 'Chute' };
function misturaRacha(F) {
  const linhas = h('div.rc-mistura');
  for (const parte of PONTE.PARTES) {
    const qual = PONTE.qualRachao(F, parte, arredFis);
    const seg = h('div.rc-seg', { role: 'group', 'aria-label': N_PARTE[parte] + ': de qual jogo' });
    for (const [jogo, nome] of [['rachao', 'Rachão'], ['racha', 'RACHA']]) {
      const b = h('button', { type: 'button', texto: nome, 'aria-pressed': String(qual === jogo), dados: { parte, jogo } });
      if (qual === jogo) b.classList.add('on');
      b.addEventListener('click', () => { clique(); misturaParte(F, parte, jogo); mudou(); commit(); montaAba(); });   // (a mesma de novo também vale: refaz a parte)
      seg.appendChild(b);
    }
    linhas.append(h('div.rc-mistura-l', h('b', { texto: N_PARTE[parte] }), seg, h('small', { texto: PONTE.texto('rachao', parte, qual) })));
  }
  const g = grupo('Misturar com o RACHA', linhas, nota('Cada parte vem com o jeito do outro jogo, medido pelo tamanho do jogador: dá para ter a bola do RACHA com o jogador e o chute do Rachão (e o contrário). Os números embaixo mostram o que mudou.'));
  g.classList.add('rc-mistura-g');
  return g;
}
function repintaMistura() {                               // (um número da física mudou: o cartão diz de quem é cada parte agora)
  const velho = ED.conteudo && ED.conteudo.querySelector('.rc-mistura-g');
  if (velho && PONTE && ED.doc) velho.replaceWith(misturaRacha(ED.doc.fisica));
}
function misturaParte(F, parte, jogo) {
  const f = PONTE.noRachao(F, parte, PONTE.alvo(jogo)[parte], arredFis);
  for (const k of FIS.map(x => x.k).concat(['andar'])) {
    const v = f[k];
    if (v == null || v === padraoFis(k) || (k === 'andar' && v !== 'direto')) delete F[k]; else F[k] = v;
  }
  if (F.andar !== 'direto') { delete F.moveMax; delete F.moveAccel; delete F.moveBrake; }
}
function abaVento(c) {
  const V = ED.doc.vento;
  c.append(grupo('Vento', ctlChave('Vento no estádio', V, 'on', { dica: 'Como no Vendaval: empurra a bola (no alto, bem mais) e muda de tempos em tempos. A seta no topo da partida mostra para onde.' })));
  if (!V.on) return;
  c.append(grupo('Como venta',
    ctlFaixa('Força', V, 'forca', LIM.ventoForca[0], LIM.ventoForca[1], 0.05, { fmt: v => v.toFixed(2) + '×', dica: '1× é o vento do Vendaval.' }),
    ctlFaixa('Muda a cada', V, 'troca', LIM.ventoTroca[0], LIM.ventoTroca[1], 1, { fmt: v => v + ' s' }),
    ctlSeg('Para onde sopra', V, 'dir', Object.keys(VENTOS).map(k => [k, VENTOS[k].nome]), { dica: V.dir === 'gol' ? 'Um tempo a favor de cada time, alternando.' : V.dir === 'lado' ? 'Cruzado: atrapalha os dois times igual.' : '' })));
}
function abaPoderes(c) {
  const P = ED.doc.poderes;
  const grade = h('div.rc-poderes', { role: 'group', 'aria-label': 'Poderes que aparecem' });
  for (const pw of POWERS) {
    const on = P.lista.indexOf(pw.id) >= 0;
    const b = h('button.rc-poder', { type: 'button', 'aria-pressed': String(on), title: pw.desc }, h('span.rc-poder-ic', { texto: pw.icon }), h('b', { texto: pw.name }), h('small', { texto: pw.desc }));
    if (on) b.classList.add('on');
    b.addEventListener('click', () => {
      clique();
      const i = P.lista.indexOf(pw.id);
      if (i >= 0) { if (P.lista.length === 1) return aviso('Pelo menos um poder fica ligado.', true); P.lista.splice(i, 1); }
      else P.lista = IDS_PODER.filter(id => id === pw.id || P.lista.indexOf(id) >= 0);
      mudou(); commit(); montaAba();
    });
    grade.appendChild(b);
  }
  c.append(grupo('Quais poderes aparecem', grade, nota(P.lista.length + ' de ' + IDS_PODER.length + ' ligados.')),
    grupo('Quando', ctlFaixa('Um poder novo a cada', P, 'cada', LIM.poder[0], LIM.poder[1], 1, { fmt: v => v + ' s' }),
      ctlChave('Poderes também no Contra bots', P, 'sempre', { dica: 'Os poderes sempre valem no modo Caos. Ligado aqui, a partida Contra bots neste estádio também tem poderes (use no botão do raio ou na tecla E).' })));
}
function abaPartida(c) {
  const P = ED.doc.partida;
  const desc = h('textarea.rc-in', { rows: 2, maxLength: LIM.desc, placeholder: descAuto(ED.doc), 'aria-label': 'Descrição' });
  desc.value = ED.doc.desc;
  desc.addEventListener('input', () => { ED.doc.desc = texto(desc.value, LIM.desc); recompila(); agendaSalvar(); });
  desc.addEventListener('change', () => commit());
  const nome = h('input.rc-in', { type: 'text', maxLength: LIM.nome, 'aria-label': 'Nome do estádio', autocomplete: 'off' });
  nome.value = ED.doc.nome;
  nome.addEventListener('input', () => { ED.doc.nome = texto(nome.value, LIM.nome) || 'Meu estádio'; ED.nome.value = nome.value; recompila(); agendaSalvar(); });
  nome.addEventListener('change', () => { nome.value = ED.doc.nome; ED.nome.value = ED.doc.nome; commit(); });
  const tam = [1, 2, 3, 4, 5, 6, 7].map(v => [v, SIZE_LABELS[v]]);
  c.append(grupo('Nome e descrição', h('label.rc-rot2', { texto: 'Nome' }), nome, h('label.rc-rot2', { texto: 'Descrição (aparece no cartão do campo)' }), desc),
    grupo('Times',
      ctlSeg('Melhor a partir de', P, 'min', tam, { aoMudar: v => { if (P.max < v) P.max = v; P.padrao = clampN(P.padrao, P.min, P.max); } }),
      ctlSeg('Até', P, 'max', tam, { aoMudar: v => { if (P.min > v) P.min = v; P.padrao = clampN(P.padrao, P.min, P.max); } }),
      ctlSeg('Tamanho que já vem marcado', P, 'padrao', tam.filter(([v]) => v >= P.min && v <= P.max), { dica: 'Os outros tamanhos também funcionam; a preparação da partida só avisa que o campo fica cheio ou vazio.' })),
    grupo('Placar', ctlSeg('Gols para vencer (ao escolher o estádio)', P, 'gols', [[0, 'O do modo'], [1, '1'], [3, '3'], [5, '5'], [7, '7'], [10, '10']], { dica: 'Como o Buraquinho, que já vem até 3.' })));
}
// OS CHUTES DO ESTÁDIO: a cavadinha, a curva e o super chute ligam e desligam; "Só o Chutar" tira os três (o modo clássico)
function abaChutes(c) {
  const CH = ED.doc.partida.chutes, todos = CH.cavadinha && CH.curva && CH.super, nenhum = !CH.cavadinha && !CH.curva && !CH.super;
  const modo = { m: todos ? 'todos' : nenhum ? 'so' : '' };
  c.append(grupo('Chutes da partida',
    ctlSeg('', modo, 'm', [['todos', 'Todos os chutes'], ['so', 'Só o Chutar']], { aoMudar: v => { CH.cavadinha = CH.curva = CH.super = v === 'todos'; } }),
    ctlChave('⌒ Cavadinha', CH, 'cavadinha', { dica: 'O chute por cima de quem estiver na frente.' }),
    ctlChave('↶↷ Curva', CH, 'curva', { dica: 'O chute que entorta para um lado.' }),
    ctlChave('Super chute', CH, 'super', { dica: 'O chute carregado: segura e solta.' }),
    nota(nenhum ? 'Só o Chutar: sem cavadinha, sem curva e sem super chute — como o RACHA e os jogos de bolinha clássicos. O Chutar sai sempre com a mesma força (a da aba Física).'
      : 'O que ficar desligado sai do estádio: o botão some da partida, os bots não usam e a preparação da partida trava a opção. O Chutar normal, de força fixa, vale sempre.')));
}
function abaPeca(c) {
  const p = ED.doc.pecas[ED.sel]; if (!p) { ED.sel = -1; ED.aba = ED.abaAntes; montaAbas(); return montaAba(); }
  const n = copias(p).length;
  c.appendChild(h('div.rc-peca-tit', icone(p.t), h('b', { texto: N_TIPO[p.t] }), h('small', { texto: n > 1 ? n + ' no campo (espelho: ' + N_SIM[p.sim].toLowerCase() + ')' : 'só esta no campo' })));
  const g = grupo('');
  if (p.t === 'cerca') {
    g.append(ctlFaixa('Comprimento', p, 'len', LIM.len[0], LIM.len[1], 2), ctlFaixa('Grossura', p, 'th', LIM.th[0], LIM.th[1], 1),
      ctlFaixa('Inclinação', p, 'a', LIM.a[0], LIM.a[1], 1, { fmt: v => v + '°' }));
  } else {
    g.append(ctlFaixa('Tamanho', p, 'r', LIM.r[p.t][0], LIM.r[p.t][1], 1));
    if (p.t === 'bumper') g.append(ctlFaixa('Força do empurrão', p, 'forca', LIM.forca[0], LIM.forca[1], 0.5, { fmt: v => v.toFixed(1), dica: 'A bola sai do para-choque com pelo menos essa velocidade.' }));
    if (p.t === 'lama' || p.t === 'poca') {
      g.append(ctlFaixa('Segura a bola', p, 'bola', LIM.bola[0], LIM.bola[1], 0.001, { fmt: v => Math.round((1 - v) * 1000) / 10 + '%', dica: 'Quanto a bola perde de velocidade a cada passo dentro dela.' }),
        ctlFaixa('Velocidade de quem pisa', p, 'andar', LIM.andar[0], LIM.andar[1], 0.05, { fmt: v => Math.round(v * 100) + '%' }),
        ctlFaixa('Freia quem pisa', p, 'freio', LIM.freio[0], LIM.freio[1], 0.005, { fmt: v => v >= 0.999 ? 'não' : Math.round((1 - v) * 1000) / 10 + '%' }));
    }
  }
  const pos = h('div.rc-pos', h('span', { texto: 'Posição' }), h('b.rc-pos-v', { texto: Math.round(p.x) + ', ' + Math.round(p.y) }));
  c.append(g, grupo('Espelho', ctlSeg('', p, 'sim', SIMS.map(s => [s, N_SIM[s]]), { aoMudar: v => { ED.sim = v; pintaFerr(); if (totalCopias(ED.doc) > LIM.copias) { p.sim = 'n'; aviso('Peças demais com esse espelho.', true); } } })),
    pos, h('div.rc-linha-bts', bt('Duplicar', duplicaSel, '', 'duplicar'), bt('Apagar', apagaSel, 'verm', 'apagar'), bt('Pronto', () => escolhe(-1), 'verde')));
}
function atualizaPeca() {                                // (no arrasto: só os números, sem montar a aba de novo)
  const p = ED.doc.pecas[ED.sel]; if (!p) return;
  const v = ED.conteudo.querySelector('.rc-pos-v'); if (v) v.textContent = Math.round(p.x) + ', ' + Math.round(p.y);
}

/* ---------------------------------------------------------------- 10) as rotas (a Oficina do RACHA pede pela âncora) */
function rota(r) {
  const base = String(r || '').replace(/^#/, '').split('&')[0];
  const [nome, id] = base.split('=');
  if (!nome || nome === 'partida') return;                   // (v98: a Oficina abrindo a moldura para a partida online: nada a fazer aqui)
  fechaPop(); if (ED.salvaT) salvaJa();                   // (o que estava sendo editado fica salvo antes de trocar de tela)
  fechaFolhas();
  try { App.closeModals(); } catch (_) {}
  if (App.scene) { try { App.quit(true); } catch (_) {} }
  fimTeste(); ED.volta = '';
  ED.deFora = false;
  const reg = id ? REGS.find(x => x.id === id) : null;
  if (nome === 'inicio') return App.showHome();
  if (nome === 'online' && App.sel.online) { ED.deFora = NA_OFICINA; return App.openSetup('online'); }   // (v98: a tela SALA ONLINE, do rede.js)
  ED.deFora = NA_OFICINA || VOLTA_RACHA;
  if (nome === 'estadios') return abreLista();
  if (nome === 'novo') { abreLista(); return novoDialogo(); }
  if (nome === 'importar') { abreLista(); return importaDialogo(); }
  if (nome === 'editar' && reg) return abreEditor(reg);
  abreLista();
  if (nome === 'jogar' && reg) jogaDialogo(reg);
}

/* ---------------------------------------------------------------- 11) começar */
carrega(); registra();
if (document.getElementById('app'))                          // (as telas só montam na página do Rachão; fora dela fica só a API)
  try { montaLista(); montaEditor(); montaInicio(); } catch (e) { console.error('Oficina de estádios: não montou', e); }
window.addEventListener('DOMContentLoaded', () => {          // (depois do App.init do Rachão)
  if (location.hash.length > 1) rota(location.hash);
  window.addEventListener('hashchange', () => rota(location.hash));
  avisaPai('pronto');
});
window.addEventListener('storage', e => {                    // (outra aba mexeu nos estádios)
  if (e.key !== CHAVE || telaAberta('editor')) return;
  carrega(); registra(); if (telaAberta('estadios')) pintaLista();
  if (ED.reg) { const r = REGS.find(x => x.id === ED.reg.id); if (r) ED.reg = r; }   // (o estádio do editor continua o mesmo, agora o da lista nova)
});
document.addEventListener('visibilitychange', () => { if (document.hidden && ED.salvaT) salvaJa(); });
window.addEventListener('message', e => {                   // (a Oficina do RACHA fechou a moldura: a partida pausa e o editor salva)
  if (!NA_OFICINA || e.source !== window.parent) return;
  if (ALVO !== '*' && e.origin !== location.origin) return;
  const d = e.data; if (!d || typeof d !== 'object' || d.oficina !== 'fechou') return;
  if (ED.salvaT) salvaJa();
  try { if (App.scene && !App.paused && !App.scene.over()) App.togglePause(true); } catch (_) {}
});
window.addEventListener('pagehide', () => { if (ED.salvaT) salvaJa(); });

window.RachaoEstadios = Object.freeze({
  versao: 'v98', limpa, compila, codifica, decodifica, docDeMapa, docNovo, copias, limites, arredFis, ponte: () => PONTE,
  original: id => typeof id === 'string' && Object.prototype.hasOwnProperty.call(ORIG_POR_ID, id) ? ORIG_POR_ID[id] : null,   // (v98: um dos 17 campos pelo id — a sala online usa o campo de sempre)
  ui: Object.freeze({ h, bt, folha, icone, aviso, confirma, clique, svgFixo, limpaFilhos, copia, fechaFolhas }),   // (v98: os ajudantes de tela, para o online — rede.js)
  lista: () => REGS.map(r => ({ id: r.id, nome: r.doc.nome, editado: r.editado, thumb: !!r.thumb })),
  doc: id => { const r = REGS.find(x => x.id === id); return r ? JSON.parse(JSON.stringify(r.doc)) : null; },
  cria: d => { const r = cria(d); return r ? r.id : null; },
  abreEditor: id => abreEditor(REGS.find(x => x.id === id)), abreLista, rota, salvaJa,
  editor: () => ({ aberto: telaAberta('editor'), id: ED.reg && ED.reg.id, doc: ED.doc && JSON.parse(JSON.stringify(ED.doc)), mapa: ED.mapa, sel: ED.sel, aba: ED.aba, ferr: ED.ferr, sim: ED.sim, hist: ED.hist.length, pos: ED.pos, vista: Object.assign({}, ED.vista), alerta: ED.alerta.hidden ? '' : ED.alerta.textContent }),
  paraTela: (x, y) => { const r = ED.cv.getBoundingClientRect(), V = ED.vista; return { x: r.left + V.ox + x * V.sc, y: r.top + V.oy + y * V.sc }; }
});
})();
