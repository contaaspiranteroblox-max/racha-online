/* =====================================================================================================================
   RACHA v92 · OFICINA DE CRIAÇÃO — O MAPA PERSONALIZADO (um arquivo só para o servidor e para o aparelho)

   O que mora aqui (tudo determinístico: nada de Math.random — o servidor, o TESTAR do editor e a previsão do aparelho
   rodam exatamente a mesma conta):
     · o FORMATO do mapa (JSON, em u: 1 u = 19 px) e a VALIDAÇÃO — tudo o que chega de fora (importar, publicar, abrir
       sala) passa por limpa(): campos conhecidos, números cortados nos limites, textos limpos, referências conferidas,
       tamanho e complexidade limitados. Mapa malformado é recusado com a lista dos erros;
     · a COMPILAÇÃO — o mapa vira a geometria de jogo em px (segmentos, círculos e polígonos com o modo de colisão,
       os gols com a boca, as traves e a rede, as zonas, os portais, os botões, os spawns e a grade espacial);
     · a PARTIDA no mapa — o passo de 1/60 s (as batidas são as do núcleo: reflect, hitPoint, hitSeg, hitBodies), até 4
       equipes, gols em qualquer lugar e direção, zonas (velocidade, lentidão, impulso, gravidade, esteira, rampa,
       pontos, reinício, eliminação), portais, portões, botões, interruptores, cronômetros, objetos móveis e barreiras
       temporárias, e a LÓGICA sem programação (QUANDO … ENTÃO …, só ações da lista, com limites);
     · os bots para qualquer mapa (vão no gol adversário mais perto, defendem o seu) e o quadro compacto da rede.

   A física OFICIAL (as salas de sempre e a ranqueada) não passa por aqui: ela continua no nucleo.js, intocada.
   Com o perfil "clássico" e um campo igual ao das salas, a conta do passo é a mesma do núcleo (o teste confere).
   ===================================================================================================================== */
(function (raiz, fabrica) {
  'use strict';
  const nucleo = (typeof module === 'object' && module.exports && typeof require === 'function') ? require('./nucleo') : (raiz && raiz.RachaNucleo);
  const M = fabrica(nucleo);
  if (typeof module === 'object' && module.exports) module.exports = M;
  if (raiz) raiz.RachaMapa = M;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function (N) {
  'use strict';
  if (!N) throw new Error('RachaMapa precisa do núcleo (nucleo.js) antes');

  const VERSAO = 'oficina-1';
  const FORMATO = 'racha-mapa';
  const PX = N.PX_POR_U, U = N.U, TPS = N.TPS, DT = N.DT;
  const TAU = Math.PI * 2, RAD = Math.PI / 180;

  /* ================================================================================================ OS LIMITES */
  const LIM = Object.freeze({
    campoW: [16, 220], campoH: [12, 160],          // u (a área da bola)
    margem: [2, 40],                                // u em volta do campo (onde o jogador anda e o cenário aparece)
    objetos: 400,                                   // objetos por mapa
    pontos: 48,                                     // vértices de um polígono / caminho
    regras: 80, acoes: 8,                           // regras da lógica e ações por regra
    gols: 12, portais: 24, zonas: 80, moveis: 40, spawns: 40,
    equipes: [1, 4], porTime: [1, 5], totalJog: 16,
    nome: 40, descricao: 300, texto: 40, tags: 6,
    bytes: 180000,                                  // o JSON do mapa inteiro (o que vai para o servidor)
    segmentos: 2400,                                // depois de compilar (arcos, círculos do campo, polígonos…)
    celulas: 120000,                                // as entradas da grade espacial (peça × célula que ela cobre): o custo de verdade da colisão
    tempo: [0, 30], meta: [0, 99],                  // minutos · gols para vencer (0 = sem)
    coordX: 160, coordY: 130,                       // u: onde um objeto pode ficar (o mundo maior: campo + margem + cenário)
    velMov: 40,                                     // u/s: o máximo de um objeto que se move (a ponta de quem gira também): mais rápido atravessaria a bola
  });
  const TIPOS = ['parede', 'arco', 'linha', 'obstaculo', 'gol', 'zona', 'portal', 'portao', 'botao', 'interruptor',
    'cronometro', 'spawn', 'spawnBola', 'decoracao', 'marcacao', 'texto'];
  const COLISAO = ['todos', 'bola', 'jogadores', 'nenhum'];
  const COLISAO_BIT = { todos: 3, bola: 1, jogadores: 2, nenhum: 0 };
  const FORMAS_CAMPO = ['retangulo', 'quadrado', 'circulo', 'octogono', 'arena', 'poligono', 'livre'];
  const BORDAS = ['bola', 'todos', 'aberto'];       // as linhas do campo: só para a bola (o clássico) · para todos · sem
  const FORMAS_OBJ = ['retangulo', 'circulo', 'triangulo', 'poligono'];
  const EFEITOS_ZONA = ['velocidade', 'lentidao', 'impulso', 'gravidade', 'esteira', 'rampa', 'pontos', 'reinicio', 'elimina', 'nada'];
  const AFETA = ['todos', 'bola', 'jogadores'];
  const PISOS = ['grama', 'grama_escura', 'grama_clara', 'sintetica', 'concreto', 'asfalto', 'quadra', 'areia', 'neon', 'futurista', 'personalizado'];
  const TEXTURAS = ['listras', 'xadrez', 'liso', 'ruido', 'grade', 'ondas', 'hexagonos', 'circulos'];
  const FUNDOS = ['liso', 'gradiente', 'arquibancada', 'rua', 'noite', 'neon'];
  const LUZES = ['dia', 'tarde', 'noite', 'neon'];
  const BOLAS = ['branca', 'racha', 'cor', 'jogador'];            // o desenho da bola: branca de contorno preto (o padrão), a do RACHA, de uma cor, a equipada de cada um (a da loja)
  const MODOS_JOGO = ['futebol', 'futsal', 'x1', 'x2', 'x3', 'x4', 'x5', 'treino', 'corrida', 'precisao', 'labirinto',
    'sobrevivencia', 'quatro_gols', 'arena_circular', 'minigame', 'livre'];
  const CATEGORIAS = ['competitivo', 'criativo', 'treinamento', 'minigame', 'classico', 'outro'];
  const SAIDAS = ['meio', 'circulo', 'livre'];
  const REINICIOS = ['saida', 'bola', 'continua'];
  const LATERAIS = ['parede', 'reinicio', 'lateral'];
  const DESEMPATES = ['empate', 'ouro'];
  const GOL_CONTRA = ['adversario', 'menos1', 'nada'];
  const VITORIAS = ['gols', 'sobrevivencia'];
  const AREAS_GOL = ['livre', 'defesa', 'todos'];     // as regras do goleiro: quem pode ficar na área de cada gol com dono
  const ICONES_DECOR = ['estrela', 'coracao', 'raio', 'coroa', 'bola', 'seta', 'chama', 'caveira', 'trofeu', 'nota', 'flor', 'lua'];
  const TEXTURA_DECOR = ['liso', 'listras', 'pontos'];
  const CORES_EQUIPE = ['#ff8a1c', '#8b5cf6', '#3cb44b', '#2f9bff'];
  const NOMES_EQUIPE = ['TIME A', 'TIME B', 'TIME C', 'TIME D'];

  // as camadas (a ordem é a do desenho: a primeira fica embaixo)
  const CAMADAS = [
    { id: 'fundo', nome: 'Fundo' }, { id: 'texturas', nome: 'Texturas' }, { id: 'marcacoes', nome: 'Marcações' },
    { id: 'geometria', nome: 'Geometria' }, { id: 'colisoes', nome: 'Colisões' }, { id: 'objetos', nome: 'Objetos' },
    { id: 'interativos', nome: 'Elementos interativos' }, { id: 'decoracao', nome: 'Decoração' }, { id: 'interface', nome: 'Interface do mapa' },
  ];
  const CAMADA_IDS = CAMADAS.map(c => c.id);
  const CAMADA_PADRAO = {
    parede: 'geometria', arco: 'geometria', linha: 'colisoes', obstaculo: 'objetos', gol: 'objetos', zona: 'interativos',
    portal: 'interativos', portao: 'interativos', botao: 'interativos', interruptor: 'interativos', cronometro: 'interface',
    spawn: 'interface', spawnBola: 'interface', decoracao: 'decoracao', marcacao: 'marcacoes', texto: 'decoracao',
  };

  /* ================================================================================================ A FÍSICA */
  // os campos do perfil do núcleo que o mapa pode mexer (cortados nos LIMITES do núcleo) + os que só o mapa tem
  // v97 (depois do teste): a arrancada vai até 0,02 — a tampinha com o embalo do Rachão (a ponte da física) chega na máxima
  // devagar como o jogador de lá; o servidor antigo corta em 0,05 (a sala fica um pouco mais arrancada, igual para todos)
  const EXTRA_LIM = Object.freeze({ acelJog: [0.02, 1], freioJog: [0.03, 1], recuo: [0, 1], giroCurva: [0, 2], massaChute: [0.5, 2] });
  const EXTRA_PADRAO = Object.freeze({ acelJog: 1, freioJog: 1, recuo: 0, giroCurva: 1, massaChute: 1 });
  const PERFIL_CAMPOS = ['rJog', 'raioChute', 'massaJog', 'velJog', 'forcaPasse', 'forcaChute', 'rBola', 'massaBola', 'limiteBola',
    'fatorBola', 'amortAngular', 'atritoBola', 'atritoJog', 'atritoTrave', 'quiqueBola', 'quiqueParede', 'quiqueTrave',
    'quiqueRede', 'quiqueJogJog', 'quiqueJogParede'];
  const PRESETS = Object.freeze({
    classico: { nome: 'Clássico', perfil: {}, extra: {} },
    rapido: { nome: 'Rápido', perfil: { velJog: 17, limiteBola: 58, fatorBola: 0.992, forcaChute: 410, forcaPasse: 255 }, extra: {} },
    tecnico: { nome: 'Técnico', perfil: { velJog: 13, fatorBola: 0.985, atritoBola: 0.65, quiqueParede: 0.5, forcaPasse: 190, forcaChute: 318 }, extra: { acelJog: 0.55, freioJog: 0.5 } },
    arcade: { nome: 'Arcade', perfil: { velJog: 18, limiteBola: 72, fatorBola: 0.995, quiqueParede: 0.92, quiqueTrave: 0.85, forcaChute: 480, forcaPasse: 285 }, extra: { recuo: 0.25 } },
    precisao: { nome: 'Precisão', perfil: { velJog: 12, fatorBola: 0.98, limiteBola: 40, forcaChute: 300, forcaPasse: 172, rBola: 0.85 }, extra: { acelJog: 0.5, freioJog: 0.8 } },
    personalizado: { nome: 'Personalizado', perfil: {}, extra: {} },
  });

  /* ================================================================================================ LIMPEZA (tudo que vem de fora) */
  const num = (v, a, b, padrao) => { v = Number(v); if (!Number.isFinite(v)) v = padrao; return Math.max(a, Math.min(b, v)); };
  const int = (v, a, b, padrao) => Math.round(num(v, a, b, padrao));
  const bool = (v, padrao) => typeof v === 'boolean' ? v : !!padrao;
  const um = (v, lista, padrao) => lista.indexOf(v) >= 0 ? v : padrao;
  const COR_RE = /^#[0-9a-fA-F]{6}$/;
  const cor = (v, padrao) => typeof v === 'string' && COR_RE.test(v) ? v.toLowerCase() : padrao;
  const ID_RE = /^[A-Za-z0-9_-]{1,16}$/;
  // texto limpo: sem controles, sem os invisíveis que invertem ou escondem, sem < > (o editor e o catálogo mostram por textContent)
  const texto = (v, max) => typeof v !== 'string' ? '' : Array.from(v.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff<>]/g, '').replace(/\s+/g, ' ').trim()).slice(0, max).join('');
  const ang = v => { v = Number(v); if (!Number.isFinite(v)) return 0; v = v % 360; if (v < 0) v += 360; return Math.round(v * 100) / 100; };
  const arred = (v, c) => Math.round(v * c) / c;
  const ponto = (p, lim) => Array.isArray(p) && p.length >= 2 ? [arred(num(p[0], -lim, lim, 0), 100), arred(num(p[1], -lim, lim, 0), 100)] : null;

  function limpaFisica(f) {
    f = f && typeof f === 'object' ? f : {};
    const preset = um(f.preset, Object.keys(PRESETS), 'classico');
    const o = { preset, perfil: {}, extra: {} };
    const base = Object.assign({}, N.PERFIL_V92, PRESETS[preset].perfil), baseX = Object.assign({}, EXTRA_PADRAO, PRESETS[preset].extra);
    const fp = f.perfil && typeof f.perfil === 'object' ? f.perfil : {}, fx = f.extra && typeof f.extra === 'object' ? f.extra : {};
    for (const k of PERFIL_CAMPOS) {
      const L = N.LIMITES[k]; if (!L) continue;
      const v = Object.prototype.hasOwnProperty.call(fp, k) ? num(fp[k], L[0], L[1], base[k]) : base[k];
      if (preset === 'personalizado' || v !== base[k]) o.perfil[k] = arred(v, 1e4);
    }
    for (const k in EXTRA_LIM) {
      const L = EXTRA_LIM[k], v = Object.prototype.hasOwnProperty.call(fx, k) ? num(fx[k], L[0], L[1], baseX[k]) : baseX[k];
      if (preset === 'personalizado' || v !== baseX[k]) o.extra[k] = arred(v, 1e4);
    }
    o.colideParedes = bool(f.colideParedes, true);
    return o;
  }
  // o perfil do núcleo + os extras do mapa (o que a partida usa)
  function fisicaResolvida(f) {
    const L = limpaFisica(f), P = PRESETS[L.preset];
    const perfil = Object.assign({}, N.PERFIL_V92, P.perfil, L.perfil, { dbModo: 0 });   // (o DB por estados é só da versão de testes)
    const extra = Object.assign({}, EXTRA_PADRAO, P.extra, L.extra);
    return { perfil: N.perfilLimpo(perfil, N.PERFIL_V92), extra, colideParedes: L.colideParedes };
  }

  function limpaCampo(c, avisos) {
    c = c && typeof c === 'object' ? c : {};
    const forma = um(c.forma, FORMAS_CAMPO, 'retangulo');
    let w = num(c.w, LIM.campoW[0], LIM.campoW[1], 71), h = num(c.h, LIM.campoH[0], LIM.campoH[1], 50);
    if (forma === 'quadrado') { const s = Math.min(Math.max(w, h), LIM.campoH[1]); w = h = s; }
    const mg = arred(num(c.margem, LIM.margem[0], LIM.margem[1], 7.5), 100);
    const o = { forma, w: arred(w, 100), h: arred(h, 100), borda: um(c.borda, BORDAS, 'bola'), margem: mg, margemY: arred(num(c.margemY, LIM.margem[0], LIM.margem[1], mg), 100),
      canto: arred(num(c.canto, 0, Math.min(w, h) / 2, forma === 'octogono' ? Math.min(w, h) * 0.22 : forma === 'arena' ? Math.min(w, h) * 0.18 : 0), 100),
      laterais: um(c.laterais, LATERAIS, 'parede') };
    if (forma === 'poligono') {
      const pts = Array.isArray(c.pontos) ? c.pontos.slice(0, LIM.pontos).map(p => ponto(p, 120)).filter(Boolean) : [];
      if (pts.length >= 3) o.pontos = pts; else { o.forma = 'retangulo'; if (avisos) avisos.push('o formato livre do campo precisava de 3 pontos: ficou retangular'); }
    }
    return o;
  }

  function limpaAparencia(a) {
    a = a && typeof a === 'object' ? a : {};
    const l = a.linhas && typeof a.linhas === 'object' ? a.linhas : {};
    return {
      piso: um(a.piso, PISOS, 'grama'), cor1: cor(a.cor1, '#2f8f4e'), cor2: cor(a.cor2, '#2a8045'),
      textura: um(a.textura, TEXTURAS, 'listras'), escala: arred(num(a.escala, 1, 30, 6), 100),
      linhas: { cor: cor(l.cor, '#f3efe4'), esp: arred(num(l.esp, 0.1, 1.5, 0.35), 100), on: bool(l.on, true),
        centro: bool(l.centro, true), meio: bool(l.meio, true), areas: bool(l.areas, true), penalti: bool(l.penalti, true), laterais: bool(l.laterais, true) },
      fundo: um(a.fundo, FUNDOS, 'arquibancada'), corFundo: cor(a.corFundo, '#1d2326'), luz: um(a.luz, LUZES, 'dia'),
      bola: um(a.bola, BOLAS, 'branca'), corBola: cor(a.corBola, '#ffd23f'), sombras: bool(a.sombras, true),
    };
  }

  function limpaPartida(p, avisos) {
    p = p && typeof p === 'object' ? p : {};
    const equipes = int(p.equipes, LIM.equipes[0], LIM.equipes[1], 2);
    const maxPor = Math.max(1, Math.min(LIM.porTime[1], Math.floor(LIM.totalJog / equipes)));
    const porTime = int(p.porTime, 1, maxPor, Math.min(2, maxPor));
    const porMin = int(p.porMin, 1, porTime, 1), porMax = int(p.porMax, porTime, maxPor, maxPor);
    const eqs = [];
    const fonte = Array.isArray(p.times) ? p.times : [];
    for (let i = 0; i < equipes; i++) {
      const t = fonte[i] && typeof fonte[i] === 'object' ? fonte[i] : {};
      eqs.push({ nome: texto(t.nome, 16) || NOMES_EQUIPE[i], cor: cor(t.cor, CORES_EQUIPE[i]) });
    }
    if (Array.isArray(p.times) && p.times.length > equipes && avisos) avisos.push('mais times do que o número de equipes: os de sobra saíram');
    return {
      modo: um(p.modo, MODOS_JOGO, 'futebol'), jogo: um(p.jogo, ['futebol', 'curva'], 'futebol'),
      equipes, porTime, porMin, porMax, times: eqs,
      meta: int(p.meta, LIM.meta[0], LIM.meta[1], 3), tempo: int(p.tempo, LIM.tempo[0], LIM.tempo[1], 0),
      prorrogacao: int(p.prorrogacao, 0, 10, 2), desempate: um(p.desempate, DESEMPATES, 'ouro'),
      reinicio: um(p.reinicio, REINICIOS, 'saida'), saida: um(p.saida, SAIDAS, equipes === 2 ? 'meio' : 'circulo'),
      raioSaida: arred(num(p.raioSaida, 0, 40, 10), 100), trocaLados: bool(p.trocaLados, false),
      colisaoAmigos: bool(p.colisaoAmigos, true), colisaoAdversarios: bool(p.colisaoAdversarios, true),
      espectadores: bool(p.espectadores, true), golContra: um(p.golContra, GOL_CONTRA, 'adversario'),
      vitoria: um(p.vitoria, VITORIAS, 'gols'), bots: bool(p.bots, true), saidaLivre: int(p.saidaLivre, 2, 30, 8),
      goleiro: bool(p.goleiro, true), areaGol: um(p.areaGol, AREAS_GOL, 'livre'), goleiroPreso: bool(p.goleiroPreso, false),
      // v95: as linhas da bola para todos (o criador liga no editor: valem em toda sala com o mapa e no TESTAR; a partida
      // conta normal). Só aparece quando ligado (os mapas de antes continuam com o mesmo JSON).
      ...(p.linhas === true ? { linhas: true } : {}),
    };
  }

  // um objeto do mapa (o que não for do tipo some; o que for número é cortado)
  function limpaObjeto(o, avisos) {
    if (!o || typeof o !== 'object') return null;
    const tipo = um(o.tipo, TIPOS, null); if (!tipo) { if (avisos) avisos.push('um objeto de tipo desconhecido saiu'); return null; }
    const id = typeof o.id === 'string' && ID_RE.test(o.id) ? o.id : null; if (!id) return null;
    const x = arred(num(o.x, -LIM.coordX, LIM.coordX, 0), 100), y = arred(num(o.y, -LIM.coordY, LIM.coordY, 0), 100);
    const b = { id, tipo, x, y, rot: ang(o.rot), camada: um(o.camada, CAMADA_IDS, CAMADA_PADRAO[tipo]), nome: texto(o.nome, 24),
      grupo: typeof o.grupo === 'string' && ID_RE.test(o.grupo) ? o.grupo : '', bloqueado: bool(o.bloqueado, false), oculto: bool(o.oculto, false),
      visivel: bool(o.visivel, true), ativo: bool(o.ativo, true), cor: cor(o.cor, padraoCor(tipo, o)), opac: arred(num(o.opac, 0.05, 1, tipo === 'zona' ? 0.35 : 1), 100) };
    const mov = limpaMov(o.mov); if (mov) b.mov = mov;
    const fisico = () => { b.colide = um(o.colide, COLISAO, 'todos'); b.quique = arred(num(o.quique, 0, 1.2, 0.65), 1000); b.atrito = arred(num(o.atrito, 0, 1, 0.5), 1000); };
    switch (tipo) {
      case 'parede': b.comp = arred(num(o.comp, 0.5, 240, 10), 100); b.esp = arred(num(o.esp, 0.1, 8, 0.6), 100); fisico(); b.temp = arred(num(o.temp, 0, 120, 0), 100); break;
      case 'arco': b.raio = arred(num(o.raio, 1, 120, 10), 100); b.abertura = arred(num(o.abertura, 5, 360, 90), 100); b.esp = arred(num(o.esp, 0.1, 8, 0.6), 100); fisico(); b.temp = arred(num(o.temp, 0, 120, 0), 100); break;
      case 'linha': {
        const pts = Array.isArray(o.pontos) ? o.pontos.slice(0, LIM.pontos).map(p => ponto(p, 200)).filter(Boolean) : [];
        if (pts.length < 2) return null;
        b.pontos = pts; b.fechada = bool(o.fechada, false); b.esp = arred(num(o.esp, 0.1, 8, 0.6), 100); fisico(); b.temp = arred(num(o.temp, 0, 120, 0), 100); break;
      }
      case 'obstaculo': {
        b.forma = um(o.forma, FORMAS_OBJ, 'retangulo'); b.w = arred(num(o.w, 0.4, 200, 6), 100); b.h = arred(num(o.h, 0.4, 200, 6), 100);
        if (b.forma === 'poligono') {
          const pts = Array.isArray(o.pontos) ? o.pontos.slice(0, LIM.pontos).map(p => ponto(p, 120)).filter(Boolean) : [];
          if (pts.length < 3) { b.forma = 'retangulo'; } else b.pontos = pts;
        }
        fisico(); b.textura = um(o.textura, TEXTURA_DECOR, 'liso'); b.temp = arred(num(o.temp, 0, 120, 0), 100); break;
      }
      case 'gol': b.largura = arred(num(o.largura, 2, 80, 16), 100); b.prof = arred(num(o.prof, 0.5, 30, 6.6), 100); b.dono = int(o.dono, -1, 3, 0);
        b.traves = bool(o.traves, true); b.rede = bool(o.rede, true); b.det = um(o.det, ['linha', 'area'], 'linha'); b.pontos = int(o.pontos, 1, 10, 1);
        b.raioTrave = arred(num(o.raioTrave, 0.1, 2, 0.25), 100); break;
      case 'zona': b.forma = um(o.forma, ['retangulo', 'circulo', 'poligono'], 'retangulo'); b.w = arred(num(o.w, 0.5, 220, 10), 100); b.h = arred(num(o.h, 0.5, 160, 8), 100);
        if (b.forma === 'poligono') { const pts = Array.isArray(o.pontos) ? o.pontos.slice(0, LIM.pontos).map(p => ponto(p, 120)).filter(Boolean) : []; if (pts.length < 3) b.forma = 'retangulo'; else b.pontos = pts; }
        b.efeito = um(o.efeito, EFEITOS_ZONA, 'nada'); b.afeta = um(o.afeta, AFETA, 'todos'); b.forca = arred(num(o.forca, -200, 200, 30), 100);
        b.fator = arred(num(o.fator, 0.1, 3, b.efeito === 'lentidao' ? 0.5 : 1.5), 1000); b.dir = ang(o.dir); b.pontosZ = int(o.pontosZ, 1, 10, 1);
        b.equipe = int(o.equipe, -1, 3, -1); b.reinicia = bool(o.reinicia, true); b.centro = bool(o.centro, false); break;
      case 'portal': b.raio = arred(num(o.raio, 0.8, 12, 2.6), 100); b.par = typeof o.par === 'string' && ID_RE.test(o.par) ? o.par : '';
        b.afeta = um(o.afeta, AFETA, 'bola'); b.saida = um(o.saida, ['mesma', 'angulo'], 'mesma'); b.dir = ang(o.dir); b.espera = int(o.espera, 5, 240, 24); break;
      case 'portao': b.comp = arred(num(o.comp, 0.5, 120, 10), 100); b.esp = arred(num(o.esp, 0.1, 8, 0.8), 100); fisico(); b.aberto = bool(o.aberto, false);
        b.ciclo = arred(num(o.ciclo, 0, 120, 0), 100); b.tempoAberto = arred(num(o.tempoAberto, 0, 120, 0), 100); break;
      case 'botao': case 'interruptor': b.raio = arred(num(o.raio, 0.6, 10, 2), 100); b.por = um(o.por, AFETA, 'jogadores'); b.equipe = int(o.equipe, -1, 3, -1);
        b.modo = tipo === 'interruptor' ? 'alterna' : um(o.modo, ['momentaneo', 'alterna'], 'momentaneo'); b.ligado = bool(o.ligado, false); break;
      case 'cronometro': b.seg = arred(num(o.seg, 0.5, 1800, 30), 100); b.repete = bool(o.repete, false); b.inicia = um(o.inicia, ['partida', 'manual'], 'partida'); b.mostra = bool(o.mostra, true); break;
      case 'spawn': b.equipe = int(o.equipe, 0, 3, 0); b.ordem = int(o.ordem, 0, 15, 0); b.alvo = typeof o.alvo === 'string' && ID_RE.test(o.alvo) ? o.alvo : ''; break;
      case 'spawnBola': break;
      case 'decoracao': b.forma = um(o.forma, ['retangulo', 'circulo', 'triangulo', 'poligono', 'icone'], 'retangulo'); b.w = arred(num(o.w, 0.2, 220, 4), 100); b.h = arred(num(o.h, 0.2, 160, 4), 100);
        if (b.forma === 'poligono') { const pts = Array.isArray(o.pontos) ? o.pontos.slice(0, LIM.pontos).map(p => ponto(p, 120)).filter(Boolean) : []; if (pts.length < 3) b.forma = 'retangulo'; else b.pontos = pts; }
        b.icone = um(o.icone, ICONES_DECOR, 'estrela'); b.cor2 = cor(o.cor2, '#ffffff'); b.textura = um(o.textura, TEXTURA_DECOR, 'liso'); b.contorno = arred(num(o.contorno, 0, 2, 0), 100); break;
      case 'marcacao': b.forma = um(o.forma, ['linha', 'circulo', 'arco', 'retangulo', 'ponto'], 'linha'); b.w = arred(num(o.w, 0.2, 240, 10), 100); b.h = arred(num(o.h, 0.2, 160, 10), 100);
        b.abertura = arred(num(o.abertura, 5, 360, 180), 100); b.esp = arred(num(o.esp, 0.05, 3, 0.35), 100); b.tracejada = bool(o.tracejada, false); break;
      case 'texto': b.texto = texto(o.texto, LIM.texto) || 'TEXTO'; b.tam = arred(num(o.tam, 0.6, 20, 3), 100); b.cor2 = cor(o.cor2, '#000000'); break;
    }
    return b;
  }
  function padraoCor(tipo, o) {
    switch (tipo) {
      case 'parede': case 'arco': case 'linha': return '#e9e5da';
      case 'obstaculo': return '#d86a38';
      case 'gol': return o && Number(o.dono) >= 0 && Number(o.dono) <= 3 ? CORES_EQUIPE[Number(o.dono) | 0] : '#f5c542';
      case 'zona': return '#14d4f0';
      case 'portal': return '#b197fc';
      case 'portao': return '#f5c542';
      case 'botao': return '#ff5c8a';
      case 'interruptor': return '#3cff6a';
      case 'cronometro': return '#ffffff';
      case 'spawn': return CORES_EQUIPE[Math.max(0, Math.min(3, Number(o && o.equipe) | 0))];
      case 'decoracao': return '#ffd23f';
      case 'marcacao': return '#f3efe4';
      case 'texto': return '#ffffff';
    }
    return '#ffffff';
  }
  function limpaMov(m) {
    if (!m || typeof m !== 'object') return null;
    const tipo = um(m.tipo, ['vaivem', 'circular', 'girar'], null); if (!tipo) return null;
    // vel: u/s no vaivém e no circular · voltas por minuto no girar (a ponta também fica no máximo de LIM.velMov: ver movEm)
    return { tipo, dx: arred(num(m.dx, -200, 200, 10), 100), dy: arred(num(m.dy, -160, 160, 0), 100), raio: arred(num(m.raio, 0.5, 100, 6), 100),
      vel: arred(num(m.vel, 0, tipo === 'girar' ? 60 : LIM.velMov, tipo === 'girar' ? 10 : 6), 100), fase: arred(num(m.fase, 0, 1, 0), 1000), auto: bool(m.auto, true) };
  }

  /* ---------------- a LÓGICA: QUANDO (condição) → ENTÃO (ações). Só o que está nas listas; tudo conferido ---------------- */
  const QUANDOS = ['inicio', 'saida', 'bola_entra', 'bola_sai', 'jogador_entra', 'jogador_sai', 'botao', 'botao_solto', 'interruptor_liga',
    'interruptor_desliga', 'cronometro', 'tempo', 'a_cada', 'gol', 'gol_no', 'placar', 'portal', 'toque_objeto'];
  const ACOES = ['abrir', 'fechar', 'alternar', 'ativar', 'desativar', 'alterna_ativo', 'mostrar', 'ocultar', 'mover', 'voltar', 'cor',
    'bola_para', 'bola_spawn', 'bola_vel', 'pontos', 'mensagem', 'efeito', 'cronometro_inicia', 'cronometro_para', 'interruptor', 'fim'];
  const EFEITOS_VISUAIS = ['confete', 'flash', 'tremor', 'brilho'];
  function limpaRegra(r, ids, avisos, idx) {
    if (!r || typeof r !== 'object') return null;
    const q = r.quando && typeof r.quando === 'object' ? r.quando : {};
    const tipo = um(q.tipo, QUANDOS, null); if (!tipo) return null;
    const alvoOk = v => typeof v === 'string' && ids.has(v) ? v : '';
    const quando = { tipo, alvo: alvoOk(q.alvo), equipe: int(q.equipe, -1, 3, -1), seg: arred(num(q.seg, 0, 1800, 10), 100), valor: int(q.valor, 0, 99, 1) };
    if (['bola_entra', 'bola_sai', 'jogador_entra', 'jogador_sai', 'botao', 'botao_solto', 'interruptor_liga', 'interruptor_desliga', 'cronometro', 'gol_no', 'portal', 'toque_objeto'].indexOf(tipo) >= 0 && !quando.alvo) {
      if (avisos) avisos.push('uma regra sem o objeto do QUANDO saiu'); return null;
    }
    const acoes = [];
    for (const a of Array.isArray(r.entao) ? r.entao.slice(0, LIM.acoes) : []) {
      if (!a || typeof a !== 'object') continue;
      const t = um(a.acao, ACOES, null); if (!t) continue;
      const x = { acao: t, alvo: alvoOk(a.alvo), dx: arred(num(a.dx, -200, 200, 0), 100), dy: arred(num(a.dy, -160, 160, 0), 100),
        seg: arred(num(a.seg, 0, 60, 1), 100), equipe: int(a.equipe, -2, 3, -2), valor: arred(num(a.valor, -10, 10, 1), 100),
        fator: arred(num(a.fator, 0, 3, 1), 1000), cor: cor(a.cor, '#ffd23f'), texto: texto(a.texto, 48), efeito: um(a.efeito, EFEITOS_VISUAIS, 'confete') };
      if (['abrir', 'fechar', 'alternar', 'ativar', 'desativar', 'alterna_ativo', 'mostrar', 'ocultar', 'mover', 'voltar', 'cor', 'cronometro_inicia', 'cronometro_para', 'interruptor'].indexOf(t) >= 0 && !x.alvo) continue;
      acoes.push(x);
    }
    if (!acoes.length) { if (avisos) avisos.push('uma regra sem nenhuma ação válida saiu'); return null; }
    return { id: typeof r.id === 'string' && ID_RE.test(r.id) ? r.id : 'r' + (idx | 0), nome: texto(r.nome, 32), on: bool(r.on, true),
      quando, entao: acoes, atraso: arred(num(r.atraso, 0, 60, 0), 100), repete: um(r.repete, ['sempre', 'uma', 'vezes'], 'sempre'), vezes: int(r.vezes, 1, 99, 3),
      espera: arred(num(r.espera, 0, 60, 0), 100) };
  }

  /* ---------------- o mapa inteiro ---------------- */
  // devolve {ok, mapa, avisos} ou {ok:false, erros}. opcoes.estrito: avisos viram erros (a publicação usa o modo normal)
  function limpa(m, opcoes) {
    const erros = [], avisos = [];
    if (!m || typeof m !== 'object' || Array.isArray(m)) return { ok: false, erros: ['isso não é um mapa do RACHA'] };
    let bytes = 0; try { bytes = JSON.stringify(m).length; } catch (_) { return { ok: false, erros: ['o mapa tem um formato que não dá para ler'] }; }
    if (bytes > LIM.bytes) return { ok: false, erros: ['o mapa é grande demais (' + Math.round(bytes / 1024) + ' KB; o máximo é ' + Math.round(LIM.bytes / 1024) + ' KB)'] };
    if (m.formato != null && m.formato !== FORMATO) erros.push('o arquivo não é um mapa do RACHA (formato "' + texto(String(m.formato), 30) + '")');
    if (m.v != null && !(Number(m.v) >= 1 && Number(m.v) <= 1)) erros.push('o mapa é de uma versão que este jogo não conhece (v' + texto(String(m.v), 8) + ')');
    if (erros.length) return { ok: false, erros };
    const objs = Array.isArray(m.objetos) ? m.objetos : [];
    if (objs.length > LIM.objetos) avisos.push('o mapa tinha ' + objs.length + ' objetos: ficaram os ' + LIM.objetos + ' primeiros');
    const saida = { formato: FORMATO, v: 1, id: typeof m.id === 'string' && /^[A-Za-z0-9_-]{4,40}$/.test(m.id) ? m.id : '',
      codigo: typeof m.codigo === 'string' && /^[A-Z0-9]{4,10}$/.test(m.codigo) ? m.codigo : '',
      nome: texto(m.nome, LIM.nome) || 'Mapa sem nome', descricao: texto(m.descricao, LIM.descricao), autor: texto(m.autor, 24),
      categoria: um(m.categoria, CATEGORIAS, 'outro'), tags: (Array.isArray(m.tags) ? m.tags : []).map(t => texto(t, 16)).filter(Boolean).slice(0, LIM.tags),
      versao: int(m.versao, 1, 99999, 1), criado: int(m.criado, 0, 9e15, 0), editado: int(m.editado, 0, 9e15, 0),
      campo: limpaCampo(m.campo, avisos), aparencia: limpaAparencia(m.aparencia), fisica: limpaFisica(m.fisica), partida: limpaPartida(m.partida, avisos),
      camadas: limpaCamadas(m.camadas), objetos: [], logica: [] };
    const vistos = new Set(), conta = {};
    for (const o of objs.slice(0, LIM.objetos)) {
      const c = limpaObjeto(o, avisos); if (!c) continue;
      if (vistos.has(c.id)) { avisos.push('dois objetos com o mesmo id (' + c.id + '): o segundo saiu'); continue; }
      conta[c.tipo] = (conta[c.tipo] || 0) + 1;
      if (c.tipo === 'gol' && conta.gol > LIM.gols) { avisos.push('gols demais: o máximo é ' + LIM.gols); continue; }
      if (c.tipo === 'portal' && conta.portal > LIM.portais) { avisos.push('portais demais: o máximo é ' + LIM.portais); continue; }
      if (c.tipo === 'zona' && conta.zona > LIM.zonas) { avisos.push('zonas demais: o máximo é ' + LIM.zonas); continue; }
      if ((c.tipo === 'spawn') && conta.spawn > LIM.spawns) { avisos.push('pontos de nascimento demais'); continue; }
      if (c.tipo === 'spawnBola' && conta.spawnBola > 1) { avisos.push('só vale um spawn da bola: os outros saíram'); continue; }
      if (c.mov) { conta.mov = (conta.mov || 0) + 1; if (conta.mov > LIM.moveis) { delete c.mov; avisos.push('objetos móveis demais: o máximo é ' + LIM.moveis); } }
      vistos.add(c.id); saida.objetos.push(c);
    }
    // as referências: o par do portal e o alvo do spawn precisam existir
    for (const o of saida.objetos) {
      if (o.tipo === 'portal' && o.par && (!vistos.has(o.par) || o.par === o.id || !saida.objetos.some(x => x.id === o.par && x.tipo === 'portal'))) o.par = '';
      if (o.tipo === 'spawn' && o.alvo && !vistos.has(o.alvo)) o.alvo = '';
      if (o.tipo === 'spawn' && o.equipe >= saida.partida.equipes) { o.equipe = saida.partida.equipes - 1; avisos.push('um spawn de um time que não existe passou para o último time'); }
      if (o.tipo === 'gol' && o.dono >= saida.partida.equipes) { o.dono = -1; avisos.push('um gol de um time que não existe ficou sem dono'); }
      if (o.tipo === 'zona' && o.equipe >= saida.partida.equipes) o.equipe = -1;
    }
    const regras = Array.isArray(m.logica) ? m.logica : [];
    if (regras.length > LIM.regras) avisos.push('regras demais na lógica: ficaram as ' + LIM.regras + ' primeiras');
    const rid = new Set();
    regras.slice(0, LIM.regras).forEach((r, k) => { const c = limpaRegra(r, vistos, avisos, k); if (c && !rid.has(c.id)) { rid.add(c.id); saida.logica.push(c); } });
    // a complexidade de verdade (depois de compilar): segmentos demais travam celular intermediário
    let comp = null;
    try { comp = compila(saida); } catch (e) { return { ok: false, erros: ['o mapa não montou: ' + (e && e.message || e)] }; }
    // (daqui para baixo o mapa está bem formado: a resposta leva o mapa limpo também quando ele ainda não dá para jogar — o editor
    // continua com ele e mostra o que falta; o servidor só aceita ok:true)
    if (comp.nSeg > LIM.segmentos) return { ok: false, erros: ['o mapa tem peças demais para colidir (' + comp.nSeg + ' pedaços; o máximo é ' + LIM.segmentos + ')'], avisos, mapa: saida, complexo: true };
    if (!comp.grade) return { ok: false, erros: ['as peças que colidem cobrem área demais do campo (paredes muito compridas ou obstáculos gigantes, muitos de uma vez): diminua ou junte algumas'], avisos, mapa: saida, complexo: true };
    const prob = problemas(saida, comp);
    for (const p of prob.erros) erros.push(p);
    for (const p of prob.avisos) avisos.push(p);
    if (erros.length) return { ok: false, erros, avisos, mapa: saida };
    if (opcoes && opcoes.estrito && avisos.length) return { ok: false, erros: avisos };
    return { ok: true, mapa: saida, avisos };
  }
  function limpaCamadas(c) {
    const fonte = Array.isArray(c) ? c : [], out = [], vistas = new Set();
    for (const x of fonte) {
      if (!x || typeof x !== 'object' || CAMADA_IDS.indexOf(x.id) < 0 || vistas.has(x.id)) continue;
      vistas.add(x.id); out.push({ id: x.id, visivel: bool(x.visivel, true), bloqueada: bool(x.bloqueada, false) });
    }
    for (const id of CAMADA_IDS) if (!vistas.has(id)) out.push({ id, visivel: true, bloqueada: false });
    return out;
  }
  /* ================================================================================================ A GEOMETRIA (u → px do mundo) */
  // o mundo: a área da bola (w × h) + a margem do jogador (onde ele anda: o GL..GB, como nas salas) + o cenário em volta
  const CENARIO_U = 6;
  function rotaciona(px, py, a) { const c = Math.cos(a), s = Math.sin(a); return [px * c - py * s, px * s + py * c]; }
  function poligonoDaForma(forma, w, h, pontos) {      // (u, local, sem girar)
    if (forma === 'circulo') { const n = 28, out = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; out.push([Math.cos(a) * w / 2, Math.sin(a) * h / 2]); } return out; }
    if (forma === 'triangulo') return [[-w / 2, h / 2], [w / 2, h / 2], [0, -h / 2]];
    if (forma === 'poligono' && pontos && pontos.length >= 3) return pontos.map(p => [p[0], p[1]]);
    return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  }
  function contornoCampo(c) {                          // o contorno do campo (u, centro em 0,0); null = formato livre (sem linhas)
    const w = c.w, h = c.h, k = Math.min(c.canto || 0, w / 2 - 0.01, h / 2 - 0.01);
    switch (c.forma) {
      case 'circulo': { const n = 64, out = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; out.push([Math.cos(a) * w / 2, Math.sin(a) * h / 2]); } return out; }
      case 'octogono': if (k > 0.05) return [[-w / 2 + k, -h / 2], [w / 2 - k, -h / 2], [w / 2, -h / 2 + k], [w / 2, h / 2 - k], [w / 2 - k, h / 2], [-w / 2 + k, h / 2], [-w / 2, h / 2 - k], [-w / 2, -h / 2 + k]]; break;
      case 'arena': {
        if (k <= 0.05) break;
        const out = [], quarto = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + i / 6 * Math.PI / 2; out.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k]); } };
        quarto(w / 2 - k, -h / 2 + k, -Math.PI / 2); quarto(w / 2 - k, h / 2 - k, 0); quarto(-w / 2 + k, h / 2 - k, Math.PI / 2); quarto(-w / 2 + k, -h / 2 + k, Math.PI);
        return out;
      }
      case 'poligono': if (c.pontos && c.pontos.length >= 3) return c.pontos.map(p => [p[0], p[1]]); break;
      case 'livre': return null;
    }
    return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  }
  // tira de um segmento o pedaço que fica dentro de um retângulo girado (a boca do gol abre a linha do campo)
  function recortaSeg(ax, ay, bx, by, R) {
    const loc = (x, y) => [(x - R.cx) * R.ux + (y - R.cy) * R.uy, (x - R.cx) * R.vx + (y - R.cy) * R.vy];
    const [t0, s0] = loc(ax, ay), [t1, s1] = loc(bx, by);
    let e0 = 0, e1 = 1;                               // (Liang–Barsky)
    const corta = (p, q) => { if (Math.abs(p) < 1e-12) return q >= 0; const r = q / p; if (p < 0) { if (r > e1) return false; if (r > e0) e0 = r; } else { if (r < e0) return false; if (r < e1) e1 = r; } return true; };
    const dt = t1 - t0, ds = s1 - s0;
    const dentro = corta(-dt, t0 + R.hu) && corta(dt, R.hu - t0) && corta(-ds, s0 + R.hv) && corta(ds, R.hv - s0) && e1 > e0;
    if (!dentro) return [[ax, ay, bx, by]];
    const out = [], px = t => [ax + (bx - ax) * t, ay + (by - ay) * t];
    if (e0 > 1e-6) { const p = px(e0); out.push([ax, ay, p[0], p[1]]); }
    if (e1 < 1 - 1e-6) { const p = px(e1); out.push([p[0], p[1], bx, by]); }
    return out;
  }
  const T0 = Object.freeze({ dx: 0, dy: 0, da: 0 });
  // o cosseno e o seno do giro (graus do objeto + o giro do movimento): os quartos de volta saem exatos (a conta do campo das
  // salas não pode ganhar o 1e-16 do Math.sin(π))
  function cosSin(graus, da) {
    if (!da) { const g = ((graus % 360) + 360) % 360; if (g === 0) return [1, 0]; if (g === 90) return [0, 1]; if (g === 180) return [-1, 0]; if (g === 270) return [0, -1]; }
    const a = graus * RAD + (da || 0); return [Math.cos(a), Math.sin(a)];
  }
  function centroPx(G, o, T) { return [G.CX + U(o.x) + (T ? T.dx : 0), G.CY + U(o.y) + (T ? T.dy : 0)]; }
  function pontoObj(G, o, T, lx, ly) {                 // um ponto local do objeto (u) no mundo (px), com o giro do objeto e o do movimento
    const cs = cosSin(o.rot, T ? T.da : 0), c = centroPx(G, o, T);
    return [c[0] + U(lx * cs[0] - ly * cs[1]), c[1] + U(lx * cs[1] + ly * cs[0])];
  }
  // o segmento sempre do ponto "menor" (x, depois y) para o "maior": a mesma direção dos segmentos do campo das salas (a conta do
  // ponto mais perto sai igual, bit a bit)
  function seg(ax, ay, bx, by, r, modo, q, mu, obj, mat) {
    if (bx < ax || (bx === ax && by < ay)) { let t = ax; ax = bx; bx = t; t = ay; ay = by; by = t; }
    return { k: 's', ax, ay, bx, by, r, modo, q, mu, obj, mat };
  }
  function caixa(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } return [x0, y0, x1, y1]; }
  // o tamanho do objeto (u, do centro até a ponta mais longe): a caixa dos que se movem e o limite da ponta de quem gira
  function raioObjeto(o) {
    const maxP = (pts, extra) => pts && pts.length ? pts.reduce((m, p) => Math.max(m, Math.hypot(p[0], p[1])), 0) + (extra || 0) : 1;
    switch (o.tipo) {
      case 'parede': case 'portao': return o.comp / 2 + o.esp / 2;
      case 'arco': return o.raio + o.esp / 2;
      case 'linha': return maxP(o.pontos, o.esp / 2);
      case 'obstaculo': case 'zona': case 'decoracao':
        if (o.forma === 'poligono') return maxP(o.pontos);
        return o.forma === 'circulo' ? Math.max(o.w, o.h) / 2 : Math.hypot(o.w / 2, o.h / 2);
      case 'marcacao': return Math.hypot(o.w / 2, o.h / 2) + o.esp;
      case 'gol': return Math.hypot(o.largura / 2, o.prof) + o.raioTrave;
      case 'portal': case 'botao': case 'interruptor': return o.raio;
      case 'texto': return o.tam * 3;
    }
    return 1;
  }
  // os colisores de um objeto (parede, arco, linha, portão, obstáculo) — os mesmos na compilação e no objeto que se move
  function colisoresDe(G, o, i, T, out) {
    const modo = COLISAO_BIT[o.colide] || 0; if (!modo) return out;
    const segP = (A, B, r) => out.push(seg(A[0], A[1], B[0], B[1], r, modo, o.quique, o.atrito, i, 'obj'));
    switch (o.tipo) {
      case 'parede': case 'portao': segP(pontoObj(G, o, T, -o.comp / 2, 0), pontoObj(G, o, T, o.comp / 2, 0), U(o.esp / 2)); break;
      case 'arco': {
        const n = Math.max(4, Math.min(48, Math.round(o.abertura / 7.5))), a0 = -o.abertura / 2 * RAD, da = o.abertura * RAD / n;
        for (let k = 0; k < n; k++) segP(pontoObj(G, o, T, Math.cos(a0 + da * k) * o.raio, Math.sin(a0 + da * k) * o.raio), pontoObj(G, o, T, Math.cos(a0 + da * (k + 1)) * o.raio, Math.sin(a0 + da * (k + 1)) * o.raio), U(o.esp / 2));
        break;
      }
      case 'linha': {
        const pts = o.pontos.map(p => pontoObj(G, o, T, p[0], p[1])), n = o.fechada ? pts.length : pts.length - 1;
        for (let k = 0; k < n; k++) segP(pts[k], pts[(k + 1) % pts.length], U(o.esp / 2));
        break;
      }
      case 'obstaculo': {
        if (o.forma === 'circulo' && Math.abs(o.w - o.h) < 0.01) { const c = centroPx(G, o, T); out.push({ k: 'c', x: c[0], y: c[1], r: U(o.w / 2), modo, q: o.quique, mu: o.atrito, obj: i, mat: 'obj' }); break; }
        const pts = poligonoDaForma(o.forma, o.w, o.h, o.pontos).map(p => pontoObj(G, o, T, p[0], p[1]));
        out.push({ k: 'p', pts, bb: caixa(pts), modo, q: o.quique, mu: o.atrito, obj: i, mat: 'obj' });
        break;
      }
    }
    return out;
  }
  function golGeom(G, o, i, T) {
    const cs = cosSin(o.rot, T ? T.da : 0), nx = cs[0], ny = cs[1], ux = -ny, uy = nx;   // n = para dentro do gol · u = ao longo da boca
    const c = centroPx(G, o, T), L = U(o.largura), P = U(o.prof), pr = U(o.raioTrave);
    const P0 = [c[0] - ux * L / 2, c[1] - uy * L / 2], P1 = [c[0] + ux * L / 2, c[1] + uy * L / 2];
    const F0 = [P0[0] + nx * P, P0[1] + ny * P], F1 = [P1[0] + nx * P, P1[1] + ny * P];
    return { obj: i, id: o.id, cx: c[0], cy: c[1], nx, ny, ux, uy, larg: L, prof: P, postR: pr, P0, P1, F0, F1,
      traves: o.traves, rede: o.rede, dono: o.dono, pontos: o.pontos, det: o.det,
      area: { prof: Math.min(U(5), G.w * 0.08), meia: (L + U(6)) / 2 } };   // (a área do goleiro: a mesma caixa que a marcação desenha)
  }
  function colisoresGol(g, out) {                     // as traves (círculos) e a rede (segmentos) de um gol
    if (g.traves) for (const p of [g.P0, g.P1]) out.push({ k: 'c', x: p[0], y: p[1], r: g.postR, modo: 3, q: -1, mu: -1, obj: g.obj, mat: 'trave' });
    if (g.rede) for (const s of [[g.P0, g.F0], [g.P1, g.F1], [g.F0, g.F1]]) out.push(seg(s[0][0], s[0][1], s[1][0], s[1][1], 0, 3, -1, -1, g.obj, 'rede'));
    return out;
  }
  function zonaGeom(G, o, i, T) {
    const c = centroPx(G, o, T), a = o.rot * RAD + (T ? T.da : 0);   // (a zona não precisa do giro exato: ela não bate em nada)
    const z = { obj: i, id: o.id, x: c[0], y: c[1], a, forma: o.forma, rx: U(o.w / 2), ry: U(o.h / 2), efeito: o.efeito, afeta: o.afeta,
      forca: U(o.forca), fator: o.fator, dir: o.dir * RAD + (T ? T.da : 0), pontos: o.pontosZ, equipe: o.equipe, reinicia: o.reinicia, centro: o.centro };
    if (o.forma === 'poligono') { z.pts = o.pontos.map(p => pontoObj(G, o, T, p[0], p[1])); z.bb = caixa(z.pts); }
    return z;
  }
  function naZona(z, x, y) {
    if (z.forma === 'circulo') { const r = rotaciona(x - z.x, y - z.y, -z.a), dx = r[0] / (z.rx || 1), dy = r[1] / (z.ry || 1); return dx * dx + dy * dy <= 1; }
    if (z.forma === 'poligono') return x >= z.bb[0] && x <= z.bb[2] && y >= z.bb[1] && y <= z.bb[3] && pontoNoPoligono(x, y, z.pts);
    const r = rotaciona(x - z.x, y - z.y, -z.a); return Math.abs(r[0]) <= z.rx && Math.abs(r[1]) <= z.ry;
  }
  // o objeto pode mudar durante a partida (se mexe, é interativo, é temporário ou a lógica mexe nele)?
  function objetoMuda(o, m) {
    if (o.mov || o.tipo === 'portao' || o.tipo === 'botao' || o.tipo === 'interruptor' || o.tipo === 'cronometro' || o.temp > 0) return true;
    if (!o.ativo || !o.visivel) return true;
    return !!(m && m.logica && m.logica.some(r => r.entao.some(a => a.alvo === o.id)));
  }

  /* ================================================================================================ A COMPILAÇÃO */
  // a ordem das batidas de cada corpo no mesmo lugar (a do núcleo: a bola bate na linha, na trave e na rede; a tampinha na
  // rede e na trave) — com o perfil clássico e o campo das salas, a conta fica igual à do núcleo
  const ORDEM_BOLA = { borda: 0, trave: 1, rede: 2, obj: 3 }, ORDEM_JOG = { borda: 0, rede: 1, trave: 2, obj: 3 };
  function compila(m) {
    const F = fisicaResolvida(m.fisica), C = N.resolve(F.perfil);
    C.EXTRA = F.extra; C.COLIDE_PAREDES = F.colideParedes;
    const c = m.campo, mx = c.margem, my = c.margemY != null ? c.margemY : c.margem;
    const MW = Math.round(U(c.w + 2 * (mx + CENARIO_U))), MH = Math.round(U(c.h + 2 * (my + CENARIO_U))), CX = MW / 2, CY = MH / 2;
    const W = (x, y) => [CX + U(x), CY + U(y)];
    const G = { MW, MH, CX, CY, w: U(c.w), h: U(c.h),
      GL: CX - U(c.w / 2 + mx), GR: CX + U(c.w / 2 + mx), GT: CY - U(c.h / 2 + my), GB: CY + U(c.h / 2 + my),   // a área do jogador (como o GL..GB das salas)
      LX0: CX - U(c.w) / 2, LX1: CX + U(c.w) / 2, LY0: CY - U(c.h) / 2, LY1: CY + U(c.h) / 2,
      col: [], gols: [], zonas: [], portais: [], botoes: [], cronos: [], spawns: {}, spawnsTodos: [], bola0: null,
      objs: m.objetos, porId: new Map(), dinamicos: [], ehDin: [], nSeg: 0, borda: c.borda, laterais: c.laterais, contorno: null, C, mapa: m };
    m.objetos.forEach((o, i) => G.porId.set(o.id, i));
    G.ehDin = m.objetos.map(o => objetoMuda(o, m));
    G.dinamicos = G.ehDin.map((v, i) => v ? i : -1).filter(i => i >= 0);
    G.idxDin = new Map(G.dinamicos.map((i, k) => [i, k]));
    // os gols (a boca dos gols parados abre o contorno do campo)
    const recortes = [], golCols = [];
    m.objetos.forEach((o, i) => {
      if (o.tipo !== 'gol') return;
      const g = golGeom(G, o, i, T0); G.gols.push(g);
      recortes.push({ cx: g.cx, cy: g.cy, ux: g.ux, uy: g.uy, vx: g.nx, vy: g.ny, hu: g.larg / 2, hv: U(0.9) + g.postR, P0: g.P0, P1: g.P1 });
      if (!G.ehDin[i]) colisoresGol(g, golCols);
    });
    const cont = contornoCampo(c);
    if (cont) {
      G.contorno = cont.map(p => W(p[0], p[1]));
      if (c.borda !== 'aberto') {
        const modo = c.borda === 'todos' ? 3 : 1, K = G.contorno;
        // (no retângulo, a ordem das linhas do campo das salas: em cima, embaixo, a esquerda e a direita — a batida no canto sai igual)
        const lados = (c.forma === 'retangulo' || c.forma === 'quadrado') && K.length === 4 ? [[K[0], K[1]], [K[3], K[2]], [K[0], K[3]], [K[1], K[2]]] : K.map((a, i) => [a, K[(i + 1) % K.length]]);
        const postes = []; for (const R of recortes) postes.push(R.P0, R.P1);
        const crava = (x, y) => { for (const p of postes) if (Math.abs(x - p[0]) < 1e-6 && Math.abs(y - p[1]) < 1e-6) return p; return [x, y]; };   // (o corte cai exatamente na trave)
        for (const [a, b] of lados) {
          let partes = [[a[0], a[1], b[0], b[1]]];
          for (const R of recortes) { const n = []; for (const s of partes) for (const x of recortaSeg(s[0], s[1], s[2], s[3], R)) n.push(x); partes = n; }
          for (const s of partes) {
            if (Math.hypot(s[2] - s[0], s[3] - s[1]) <= 0.5) continue;
            const p = crava(s[0], s[1]), q = crava(s[2], s[3]);
            G.col.push(seg(p[0], p[1], q[0], q[1], 0, modo, -1, -1, -1, 'borda'));
          }
        }
      }
    }
    for (const s of golCols) G.col.push(s);
    m.objetos.forEach((o, i) => {
      const din = G.ehDin[i];
      switch (o.tipo) {
        case 'parede': case 'arco': case 'linha': case 'obstaculo': case 'portao': if (!din) colisoresDe(G, o, i, T0, G.col); break;
        case 'zona': G.zonas.push(zonaGeom(G, o, i, T0)); break;
        case 'portal': { const p = centroPx(G, o, T0); G.portais.push({ obj: i, id: o.id, x: p[0], y: p[1], r: U(o.raio), parId: o.par, par: -1, afeta: o.afeta, saida: o.saida, dir: o.dir * RAD, espera: o.espera }); break; }
        case 'botao': case 'interruptor': { const p = centroPx(G, o, T0); G.botoes.push({ obj: i, id: o.id, x: p[0], y: p[1], r: U(o.raio), por: o.por, equipe: o.equipe, modo: o.modo, ligado: o.ligado, interruptor: o.tipo === 'interruptor' }); break; }
        case 'cronometro': G.cronos.push({ obj: i, id: o.id, seg: o.seg, repete: o.repete, inicia: o.inicia, mostra: o.mostra }); break;
        case 'spawn': { const p = W(o.x, o.y), s = { x: p[0], y: p[1], equipe: o.equipe, ordem: o.ordem, alvo: o.alvo, obj: i }; (G.spawns[o.equipe] || (G.spawns[o.equipe] = [])).push(s); G.spawnsTodos.push(s); break; }
        case 'spawnBola': { const p = W(o.x, o.y); G.bola0 = { x: p[0], y: p[1], obj: i }; break; }
      }
    });
    for (const t in G.spawns) G.spawns[t].sort((a, b) => a.ordem - b.ordem || a.obj - b.obj);
    if (!G.bola0) G.bola0 = { x: CX, y: CY, obj: -1 };
    for (const p of G.portais) { const k = G.portais.findIndex(x => x.id === p.parId && x !== p); p.par = k >= 0 ? k : -1; }
    // a complexidade: os pedaços que colidem (os parados + os dos objetos que mudam)
    let nDin = 0; for (const i of G.dinamicos) { const o = m.objetos[i]; nDin += colisoresDe(G, o, i, T0, []).reduce((s, x) => s + (x.k === 'p' ? x.pts.length : 1), 0); if (o.tipo === 'gol') nDin += 5; }
    G.nSeg = G.col.reduce((s, x) => s + (x.k === 'p' ? x.pts.length : 1), 0) + nDin;
    // (peças demais: nem monta a grade — o limpa recusa o mapa sem gastar o tempo dela; a grade também para no limite de entradas)
    if (G.nSeg > LIM.segmentos || !montaGrade(G)) { G.grade = null; G.complexo = true; }
    const P = m.partida;
    G.saida = { tipo: P.equipes === 2 ? P.saida : (P.saida === 'meio' ? 'circulo' : P.saida), raio: U(P.raioSaida) };
    G.circ = U(P.raioSaida);
    // de que lado cada time fica (a saída "meio", a formação padrão e o gol que os bots defendem)
    G.lado = [];
    for (let t = 0; t < P.equipes; t++) {
      const l = G.spawns[t] || [];
      if (l.length) { const ax = l.reduce((s, p) => s + p.x, 0) / l.length, ay = l.reduce((s, p) => s + p.y, 0) / l.length; G.lado[t] = norm(ax - G.bola0.x, ay - G.bola0.y, t, P.equipes); }
      else {
        const g = G.gols.find(x => x.dono === t);   // sem spawn: o lado do gol do time (ou os lados do campo)
        G.lado[t] = g ? norm(g.cx - G.bola0.x, g.cy - G.bola0.y, t, P.equipes) : norm(0, 0, t, P.equipes);
      }
    }
    return G;
  }
  function norm(x, y, t, E) {                          // a direção do lado do time (sem spawn nem gol: os lados do campo)
    const d = Math.hypot(x, y); if (d > 1) return [x / d, y / d];
    const padrao = E === 2 ? [[-1, 0], [1, 0]] : [[-1, 0], [1, 0], [0, -1], [0, 1]];
    return (padrao[t] || [1, 0]).slice();
  }

  /* ---------------- a grade espacial: cada célula guarda os colisores parados que passam perto dela ---------------- */
  const CELULA = U(5);
  // cada peça entra só nas células que ela alcança (a faixa em volta de um segmento comprido, não a caixa inteira dele; o
  // contorno e o miolo de um polígono ou de um círculo) — e a grade inteira tem um teto de entradas (LIM.celulas): um mapa
  // feito para pesar (peças compridas na diagonal, círculos gigantes) para no teto em vez de travar o servidor. false = passou.
  function montaGrade(G) {
    const nx = Math.max(1, Math.ceil(G.MW / CELULA)), ny = Math.max(1, Math.ceil(G.MH / CELULA)), cel = new Array(nx * ny).fill(null);
    let total = 0;
    const marca = (c, r, k) => {
      const i = r * nx + c, l = cel[i] || (cel[i] = []);
      if (l[l.length - 1] !== k) { l.push(k); total++; }   // (a mesma peça só uma vez por célula: ela entra seguida)
    };
    const caixa = (x0, y0, x1, y1, k) => {
      const c0 = Math.max(0, Math.floor(x0 / CELULA)), c1 = Math.min(nx - 1, Math.floor(x1 / CELULA));
      const r0 = Math.max(0, Math.floor(y0 / CELULA)), r1 = Math.min(ny - 1, Math.floor(y1 / CELULA));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) marca(c, r, k);
    };
    const faixa = (ax, ay, bx, by, m, k) => {          // as células a até m do segmento: quadrados em volta de pontos a cada meia célula
      const L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / (CELULA * 0.5))), mm = m + CELULA * 0.5;   // (+ meia célula: o passo entre os pontos e a corda do círculo)
      for (let j = 0; j <= n; j++) { const t = j / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t; caixa(x - mm, y - mm, x + mm, y + mm, k); }
    };
    const miolo = (dentro, x0, y0, x1, y1, k) => {      // as células com o centro dentro da forma (o contorno já entrou pela faixa)
      const c0 = Math.max(0, Math.floor(x0 / CELULA)), c1 = Math.min(nx - 1, Math.floor(x1 / CELULA));
      const r0 = Math.max(0, Math.floor(y0 / CELULA)), r1 = Math.min(ny - 1, Math.floor(y1 / CELULA));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (dentro((c + 0.5) * CELULA, (r + 0.5) * CELULA)) marca(c, r, k);
    };
    const f = U(4.5);                                  // (o maior corpo + a folga: quem está numa célula enxerga o que passa perto)
    for (let k = 0; k < G.col.length; k++) {
      const s = G.col[k];
      if (s.k === 's') faixa(s.ax, s.ay, s.bx, s.by, s.r + f, k);
      else if (s.k === 'c') {
        if (s.r <= CELULA) caixa(s.x - s.r - f, s.y - s.r - f, s.x + s.r + f, s.y + s.r + f, k);
        else {                                         // (o círculo grande: a volta em pedaços e o miolo)
          const n = Math.max(8, Math.ceil(TAU * s.r / CELULA));
          for (let j = 0; j < n; j++) { const a0 = TAU * j / n, a1 = TAU * (j + 1) / n; faixa(s.x + Math.cos(a0) * s.r, s.y + Math.sin(a0) * s.r, s.x + Math.cos(a1) * s.r, s.y + Math.sin(a1) * s.r, f, k); }
          miolo((x, y) => Math.hypot(x - s.x, y - s.y) < s.r, s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r, k);
        }
      } else {
        const p = s.pts;
        for (let j = 0; j < p.length; j++) { const a = p[j], b = p[(j + 1) % p.length]; faixa(a[0], a[1], b[0], b[1], f, k); }
        miolo((x, y) => pontoNoPoligono(x, y, p), s.bb[0], s.bb[1], s.bb[2], s.bb[3], k);
      }
      if (total > LIM.celulas) return false;
    }
    const ordena = (l, O) => l ? l.slice().sort((a, b) => (O[G.col[a].mat] - O[G.col[b].mat]) || a - b) : null;
    G.grade = { nx, ny, celB: cel.map(l => ordena(l, ORDEM_BOLA)), celJ: cel.map(l => ordena(l, ORDEM_JOG)) };
    G.nCel = total;
    return true;
  }
  const VAZIO = [];
  function perto(G, x, y, bola) {
    const gr = G.grade, c = Math.floor(x / CELULA), r = Math.floor(y / CELULA);
    if (!gr || c < 0 || r < 0 || c >= gr.nx || r >= gr.ny) return VAZIO;   // (sem grade: o mapa complexo demais, que o limpa recusa)
    return (bola ? gr.celB : gr.celJ)[r * gr.nx + c] || VAZIO;
  }

  function distSeg(px, py, ax, ay, bx, by) {
    const abx = bx - ax, aby = by - ay, l = abx * abx + aby * aby;
    const t = l ? Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / l)) : 0;
    return Math.hypot(px - ax - abx * t, py - ay - aby * t);
  }
  function pontoNoPoligono(x, y, pts) {
    let dentro = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi)) dentro = !dentro;
    }
    return dentro;
  }
  function dentroDoMundo(G, x, y, r) { return x - r >= G.GL - 1 && x + r <= G.GR + 1 && y - r >= G.GT - 1 && y + r <= G.GB + 1; }
  function solidoToca(s, x, y, r) {
    if (s.k === 's') return distSeg(x, y, s.ax, s.ay, s.bx, s.by) < s.r + r;
    if (s.k === 'c') return Math.hypot(x - s.x, y - s.y) < s.r + r;
    return pontoNoPoligono(x, y, s.pts) || s.pts.some((p, i) => { const q = s.pts[(i + 1) % s.pts.length]; return distSeg(x, y, p[0], p[1], q[0], q[1]) < r; });
  }
  function dentroDeSolido(G, x, y, r, bit) {
    bit = bit || 2;
    const teste = s => (s.modo & bit) && s.mat !== 'borda' && s.mat !== 'rede' && solidoToca(s, x, y, r * 0.6);
    for (const s of G.col) if (teste(s)) return true;
    for (const i of G.dinamicos) { const o = G.objs[i]; if (!o.ativo || (o.tipo === 'portao' && o.aberto)) continue; for (const s of colisoresDe(G, o, i, T0, [])) if (teste(s)) return true; }
    return false;
  }
  // o que impede jogar (erro) ou vale avisar (aviso): o editor mostra antes do TESTAR e do PUBLICAR
  function problemas(m, G) {
    const erros = [], avisos = [], P = m.partida, C = G.C;
    const temPontos = G.zonas.some(z => z.efeito === 'pontos') || m.logica.some(r => r.entao.some(a => a.acao === 'pontos' || a.acao === 'fim'));
    if (!G.gols.length && !temPontos && P.vitoria === 'gols' && P.tempo === 0)
      avisos.push('o mapa não tem gol, zona de pontos nem tempo: a partida só acaba quando alguém sair');
    for (let t = 0; t < P.equipes; t++) {
      const n = G.spawns[t] ? G.spawns[t].length : 0;
      if (n && n < P.porTime) avisos.push(P.times[t].nome + ' tem ' + n + ' ponto(s) de nascimento para ' + P.porTime + ' jogadores: os outros nascem perto');
    }
    if (G.spawnsTodos.some(s => !dentroDoMundo(G, s.x, s.y, C.R_JOG))) erros.push('um ponto de nascimento está fora da área do jogador');
    if (!dentroDoMundo(G, G.bola0.x, G.bola0.y, C.R_BOLA)) erros.push('o spawn da bola está fora do mapa');
    if (G.spawnsTodos.some(s => dentroDeSolido(G, s.x, s.y, C.R_JOG * 0.9, 2))) avisos.push('um ponto de nascimento está dentro de uma parede ou obstáculo');
    if (dentroDeSolido(G, G.bola0.x, G.bola0.y, C.R_BOLA * 0.9, 1)) erros.push('o spawn da bola está dentro de uma parede ou obstáculo');
    if (G.portais.some(p => p.par < 0)) avisos.push('um portal está sem par: ele não leva a lugar nenhum');
    if (G.gols.some(g => g.dono >= P.equipes)) avisos.push('um gol é de um time que não existe');
    if (P.equipes > 2 && P.saida === 'meio') avisos.push('com mais de 2 times a saída é pelo círculo');
    if (P.areaGol !== 'livre' || P.goleiroPreso) {      // as regras do goleiro
      if (!G.gols.some(g => g.dono >= 0)) avisos.push('as regras do goleiro precisam de um gol com dono (nenhum gol do mapa é de um time)');
      else if (!(P.goleiro && P.porTime >= 3)) avisos.push(P.areaGol === 'livre' ? 'o "goleiro não sai da área" só vale com o Goleiro ligado e 3 ou mais por time' : 'sem goleiro (ligue o Goleiro e ponha 3 ou mais por time), ninguém do time entra na própria área');
    }
    return { erros, avisos };
  }

  /* ================================================================================================ O MOVIMENTO DOS OBJETOS */
  // o deslocamento (px) e o giro (rad) de um objeto com movimento, tau segundos depois de começar a andar (determinístico)
  function movEm(o, tau) {
    const m = o.mov; if (!m) return T0;
    const fase = +m.fase || 0, vel = +m.vel || 0;
    if (m.tipo === 'girar') {                          // vel = voltas por minuto (a ponta fica no máximo de LIM.velMov u/s)
      const w = Math.min(vel * TAU / 60, LIM.velMov / Math.max(0.5, raioObjeto(o)));
      return { dx: 0, dy: 0, da: w * tau + fase * TAU };
    }
    if (m.tipo === 'circular') {
      const R = Math.max(0.5, +m.raio || 0), w = Math.min(vel, LIM.velMov) / R, a = w * tau + fase * TAU;   // vel = u/s na volta
      return { dx: U(R * (Math.cos(a) - Math.cos(fase * TAU))), dy: U(R * (Math.sin(a) - Math.sin(fase * TAU))), da: 0 };
    }
    const dx = +m.dx || 0, dy = +m.dy || 0, L = Math.hypot(dx, dy); if (L < 1e-6) return T0;   // vaivém: vai até (dx, dy) e volta
    // (a velocidade média é vel; no meio do caminho ela chega a π/2 × vel: o máximo fica em LIM.velMov)
    const v = Math.min(vel, LIM.velMov * 2 / Math.PI), f = v / (2 * L), s = (1 - Math.cos(TAU * (f * tau + fase))) / 2;
    return { dx: U(dx * s), dy: U(dy * s), da: 0 };
  }

  /* ================================================================================================ A PARTIDA NO MAPA */
  const GOL_TICKS = 120, FIM_TICKS = 80, ASSIST_TICKS = 600, MIN_PASSOS_CHUTE = 2;
  const DESVIO_TK = 6, DESVIO_JANELA = 120;           // (os do jogo: o toque curto que desvia · o gol logo depois do desvio)
  const LOGICA_PROF = 4, LOGICA_ACOES_TICK = 64, FILA_LOGICA = 200;   // a lógica: QUANDO dentro de QUANDO · ações por passo · ações esperando
  const DERIVA_JOG = 0.4;                             // as zonas de força levam a tampinha a esta fração da força (u/s por u/s²)
  // um PRNG pequeno e determinístico (os bots erram a mira igual no servidor e no TESTAR)
  function prng(seed) { let a = (seed >>> 0) || 0x9e3779b9; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* o = {jogadores:[{netId, nome, bot:'facil'|'dificil'} | {vazio:true} | {humano:true, nome} | null] na ordem das vagas
          (equipe 0: 0..n-1, equipe 1: n..2n-1, …; null = bot), porTime, seed, saida0 (o time da primeira saída), previsao,
          onGol(info), onFim(res), onAviso(txt), onEvento(ev)} */
  function novaPartida(mapa, o) {
    o = o || {};
    const G = mapa.__G || compila(mapa), Pm = mapa.partida, C = G.C;
    const E = Pm.equipes, n = Math.max(Pm.porMin, Math.min(Pm.porMax, (o.porTime | 0) || Pm.porTime));
    const P = {
      mapa, G, C, E, n, jogo: Pm.jogo, regras: Pm, tick: 0, tj: 0, tjLog: 0, t: 0, estado: 'saida', saidaTime: 0, saidaT0: 0, golT: 0, golTime: -1,
      fimPendente: false, fimT: 0, prorrog: false, encerrado: false, on: true, pausado: false, placar: new Array(E).fill(0), ultimoGol: null,
      toques: [], chuteDe: null, ev: [], hist: [], rnd: prng((o.seed | 0) || 12345), previsao: !!o.previsao,
      meta: Pm.vitoria === 'sobrevivencia' ? (Pm.meta || 3) : Pm.meta, tempoLim: Pm.tempo * 60, prorrogLim: Pm.prorrogacao * 60,
      onGol: o.onGol || (() => {}), onFim: o.onFim || (() => {}), onAviso: o.onAviso || (() => {}), onEvento: o.onEvento || null,
      D: [], dyn: [], golsDyn: new Map(), zonasDyn: new Map(), filaAcoes: [], regrasN: mapa.logica.map(() => ({ n: 0, ult: -1e9, placar: false })),
      dentroZ: new Map(), botaoEst: [], cron: [], mensagem: null, logProf: 0, acoesTick: 0, _toq: null, trocado: false, saida0: 0,
      regraGol: Pm.areaGol !== 'livre' || !!Pm.goleiroPreso,
    };
    P.B = N.novaBola(C, G.bola0.x, G.bola0.y);
    // os estados dos objetos que mudam
    for (const i of G.dinamicos) {
      const ob = mapa.objetos[i];
      P.D[i] = { on: ob.ativo, vis: ob.visivel, aberto: !!ob.aberto, ligado: !!ob.ligado, press: false, ax: ob.mov && ob.mov.auto ? 0 : -1, ox: 0, oy: 0, tw: null,
        temp: ob.temp > 0 && ob.ativo ? Math.round(ob.temp * TPS) : 0, cor: '', manual: false, T: T0, x: null, y: null, cache: null, cacheT: null, vx: 0, vy: 0, va: 0 };
    }
    P.botaoEst = G.botoes.map(b => ({ ligado: b.ligado, press: false }));
    P.cron = G.cronos.map(c => ({ rodando: c.inicia === 'partida', t0: 0 }));
    const fonte = Array.isArray(o.jogadores) ? o.jogadores : [];
    P.jog = [];
    for (let i = 0; i < E * n; i++) P.jog.push(novoJog(P, fonte[i] || null, i));
    atualizaDinamicos(P, true);
    P.saida0 = Math.max(0, Math.min(E - 1, o.saida0 | 0));
    saida(P, P.saida0);
    P.chuta = (q, forca) => chuta(P, q, forca);
    P.passo = entrada => passo(P, entrada);
    P.quadro = () => quadro(P);
    P.fim = () => fim(P);                             // (o apito final agora: o ENCERRAR do admin da sala)
    return P;
  }
  function novoJog(P, j, i) {
    const C = P.C, time = Math.floor(i / P.n), k = i % P.n, vazio = !!(j && j.vazio);
    const humano = !!(j && (j.netId || j.humano));
    const q = { i, time, k, netId: j && j.netId ? String(j.netId) : null, nome: (j && j.nome) || (vazio ? '' : 'Bot'), vazio,
      bot: vazio || humano ? null : (j && (j.bot === 'facil' || j.bot === 'dificil') ? j.bot : 'dificil'),
      x: 0, y: 0, vx: 0, vy: 0, mx: 0, my: 0, r: C.R_JOG, m: C.MASSA_JOG, chuteT: -99, fxT: -9, ack49: 0, fora: vazio, portalT: -999, golsFeitos: 0, assist: 0,
      papel: P.regras.goleiro && P.n >= 3 && k === P.n - 1 ? 'gk' : 'campo', ai: null, netButton: null };
    if (q.bot) q.ai = { nivel: q.bot, planoT: 0, alvo: null, ultChute: -99, pinoT: 0, desvio: 1 };
    return q;
  }
  // o jogador da vaga i vira bot (saiu, caiu) ou volta a ser de alguém (entrou) — o servidor chama
  function botAssume(P, q) { q.netId = null; q.bot = 'dificil'; q.ai = { nivel: 'dificil', planoT: 0, alvo: null, ultChute: -99, pinoT: 0, desvio: 1 }; q.mx = q.my = 0; q.netButton = null; }
  function humanoAssume(P, q, netId, nome) { q.netId = netId ? String(netId) : null; q.nome = nome || q.nome; q.bot = null; q.ai = null; q.vazio = false; q.ack49 = 0; if (q.fora && P.estado === 'saida') { q.fora = false; poeNoSpawn(P, q); } }
  const FORMA = { 1: [[0.22, 0]], 2: [[0.2, 0], [0.58, 0]], 3: [[0.2, -0.42], [0.2, 0.42], [0.62, 0]], 4: [[0.2, -0.43], [0.2, 0.43], [0.62, -0.43], [0.62, 0.43]],
    5: [[0.2, -0.45], [0.2, 0.45], [0.45, -0.22], [0.45, 0.22], [0.72, 0]] };   // (a das salas, RQ_FORMA; o 5 é novo, com o goleiro no fundo)
  function spawnDe(P, q) {                             // o ponto de nascimento da vaga (o do mapa, ou um perto, ou a formação padrão)
    const G = P.G, lq = lt(P, q.time), l = G.spawns[lq], ld = G.lado[lq] || [1, 0];
    if (l && l.length) {
      if (q.k < l.length) return [l[q.k].x, l[q.k].y];
      const b = l[q.k % l.length], extra = Math.floor(q.k / l.length), lado = (q.k % 2 ? 1 : -1) * extra;
      return [b.x - ld[1] * U(4.5) * lado + ld[0] * U(2) * extra, b.y + ld[0] * U(4.5) * lado + ld[1] * U(2) * extra];
    }
    const f = (FORMA[P.n] || FORMA[5])[Math.min(q.k, P.n - 1)];
    const horiz = Math.abs(ld[0]) >= Math.abs(ld[1]);
    const L = horiz ? G.w / 2 : G.h / 2, A = horiz ? G.h / 2 : G.w / 2;
    return [G.bola0.x + ld[0] * f[0] * L - ld[1] * f[1] * A, G.bola0.y + ld[1] * f[0] * L + ld[0] * f[1] * A];
  }
  function poeNoSpawn(P, q) {
    const s = spawnDe(P, q); q.x = s[0]; q.y = s[1];
    if (P.estado === 'saida' && q.time === P.saidaTime && q.k === 0) {   // quem bate fica atrás da bola (do lado do time)
      const ld = P.G.lado[lt(P, q.time)] || [1, 0], d = q.r + P.C.R_BOLA + 10;
      q.x = P.B.x + ld[0] * d; q.y = P.B.y + ld[1] * d;
    }
    q.vx = q.vy = 0; q.mx = q.my = 0;
  }
  function bolaNoSpawn(P) { const B = P.B; B.x = P.G.bola0.x; B.y = P.G.bola0.y; B.vx = B.vy = 0; B.w = 0; B.cvT = 0; B.cv = 0; B.cvUx = null; }
  function saida(P, t) {
    P.saidaTime = Math.max(0, Math.min(P.E - 1, t | 0)); P.estado = 'saida'; P.saidaT0 = P.tick;
    P.toques.length = 0; P.chuteDe = null;
    bolaNoSpawn(P);
    for (const q of P.jog) { q.fora = !!q.vazio; if (!q.fora) poeNoSpawn(P, q); }
    evento(P, { t: 'saida', time: P.saidaTime });
    logicaEvento(P, 'saida', { equipe: P.saidaTime });
  }
  function evento(P, e) { if (P.previsao) return; e.tick = P.tick; P.ev.push(e); if (P.ev.length > 64) P.ev.shift(); if (P.onEvento) P.onEvento(e); }

  // a TROCA DE LADO (2 times, com tempo): no 2º tempo cada time usa o lado (os spawns, o gol e as zonas do time) do outro.
  // lt(P, t): de quem é, agora, o lado que o mapa desenhou para o time t (e o contrário: a conta é a mesma nos dois sentidos)
  const lt = (P, t) => P.trocado && P.E === 2 && t >= 0 && t <= 1 ? 1 - t : t;

  /* ---------------- o estado de cada objeto que muda (ligado, visível, aberto, posição) ---------------- */
  function ativo(P, i) {
    if (i < 0) return true;
    const d = P.D[i]; if (!d) return P.mapa.objetos[i].ativo;
    return d.on && !(P.mapa.objetos[i].tipo === 'portao' && d.aberto);
  }
  function mesmoT(a, b) { return !!a && !!b && a.dx === b.dx && a.dy === b.dy && a.da === b.da; }
  function caixaCols(l) {
    let x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18;
    for (const s of l) {
      if (s.k === 's') { x0 = Math.min(x0, s.ax - s.r, s.bx - s.r); x1 = Math.max(x1, s.ax + s.r, s.bx + s.r); y0 = Math.min(y0, s.ay - s.r, s.by - s.r); y1 = Math.max(y1, s.ay + s.r, s.by + s.r); }
      else if (s.k === 'c') { x0 = Math.min(x0, s.x - s.r); x1 = Math.max(x1, s.x + s.r); y0 = Math.min(y0, s.y - s.r); y1 = Math.max(y1, s.y + s.r); }
      else { x0 = Math.min(x0, s.bb[0]); y0 = Math.min(y0, s.bb[1]); x1 = Math.max(x1, s.bb[2]); y1 = Math.max(y1, s.bb[3]); }
    }
    return [x0, y0, x1, y1];
  }
  function atualizaDinamicos(P, forca) {
    const G = P.G, m = P.mapa;
    P.dyn.length = 0;
    for (const i of G.dinamicos) {
      const o = m.objetos[i], d = P.D[i];
      // o tempo do movimento (os que andam sozinhos desde o começo; os outros desde que a lógica ligou)
      let T = T0;
      if (o.mov) T = movEm(o, d.ax >= 0 ? Math.max(0, P.tick - d.ax) / TPS : 0);
      if (d.tw) {                                     // o MOVER da lógica (vai de um deslocamento a outro em seg segundos)
        const u = d.tw.t1 > d.tw.t0 ? Math.max(0, Math.min(1, (P.tick - d.tw.t0) / (d.tw.t1 - d.tw.t0))) : 1, e = u * u * (3 - 2 * u);
        d.ox = d.tw.fx + (d.tw.tx - d.tw.fx) * e; d.oy = d.tw.fy + (d.tw.ty - d.tw.fy) * e;
        if (u >= 1) d.tw = null;
      }
      const T2 = (d.ox || d.oy) ? { dx: T.dx + d.ox, dy: T.dy + d.oy, da: T.da } : T;
      const ant = d.T;
      d.vx = forca ? 0 : (T2.dx - ant.dx) * TPS; d.vy = forca ? 0 : (T2.dy - ant.dy) * TPS; d.va = forca ? 0 : (T2.da - ant.da) * TPS;
      d.T = T2;
      const parado = !d.vx && !d.vy && !d.va;
      if (o.tipo === 'gol') {
        const g = golGeom(G, o, i, T2); P.golsDyn.set(i, g);
        if (d.on) {
          if (!d.cache || !mesmoT(d.cacheT, T2)) { d.cache = colisoresGol(g, []); d.cacheT = T2; d.bb = caixaCols(d.cache); }
          for (const s of d.cache) { s.vx = d.vx; s.vy = d.vy; s.va = d.va; s.cx = g.cx; s.cy = g.cy; }
          if (d.cache.length) P.dyn.push({ i, bb: d.bb, cols: d.cache });
        }
        continue;
      }
      if (o.tipo === 'zona') { P.zonasDyn.set(i, zonaGeom(G, o, i, T2)); continue; }
      if (o.tipo === 'portal' || o.tipo === 'botao' || o.tipo === 'interruptor') { const c = centroPx(G, o, T2); d.x = c[0]; d.y = c[1]; continue; }
      if (o.tipo === 'cronometro' || !ativo(P, i)) continue;
      if (!d.cache || !mesmoT(d.cacheT, T2)) { d.cache = colisoresDe(G, o, i, T2, []); d.cacheT = T2; d.bb = d.cache.length ? caixaCols(d.cache) : null; }
      if (!d.cache.length) continue;
      const c = centroPx(G, o, T2);
      for (const s of d.cache) { s.vx = parado ? 0 : d.vx; s.vy = parado ? 0 : d.vy; s.va = parado ? 0 : d.va; s.cx = c[0]; s.cy = c[1]; }
      P.dyn.push({ i, bb: d.bb, cols: d.cache });
    }
  }
  function golAtual(P, k) { const g = P.G.gols[k]; return P.golsDyn.get(g.obj) || g; }
  function zonaAtual(P, z) { return P.zonasDyn.get(z.obj) || z; }
  function posObj(P, item) { const d = P.D[item.obj]; return d && d.x != null ? [d.x, d.y] : [item.x, item.y]; }

  /* ---------------- as batidas com o mapa ---------------- */
  function coef(P, s, bola) {                         // o quique e o atrito de cada material (os do jogo; os objetos têm os deles)
    const C = P.C;
    if (s.mat === 'borda') return bola ? [C.Q_PAREDE, C.ATRITO_BOLA] : [C.Q_JOG_PAREDE, 0];
    if (s.mat === 'trave') return bola ? [C.Q_TRAVE, C.ATRITO_TRAVE_BOLA] : [0.3, 0];
    if (s.mat === 'rede') return bola ? [C.Q_REDE, C.ATRITO_BOLA] : [0.6, 0];
    return bola ? [Math.max(C.QUIQUE_BOLA, s.q), Math.sqrt(Math.max(0, s.mu) * C.ATRITO_BOLA)] : [Math.min(1, s.q), 0];
  }
  function comVel(o, s, px, py, f) {                  // a batida num objeto que se move: no referencial do ponto que bate (ele empurra)
    let vx = s.vx || 0, vy = s.vy || 0;
    if (s.va) { vx -= s.va * (py - s.cy); vy += s.va * (px - s.cx); }
    if (!vx && !vy) return f();
    o.vx -= vx; o.vy -= vy; const r = f(); o.vx += vx; o.vy += vy; return r;
  }
  function bate(P, o, s, bola, lq) {
    const k = coef(P, s, bola), e = k[0], mu = k[1];
    if (s.k === 's') {
      const abx = s.bx - s.ax, aby = s.by - s.ay, l = abx * abx + aby * aby;
      const t = l ? Math.max(0, Math.min(1, ((o.x - s.ax) * abx + (o.y - s.ay) * aby) / l)) : 0;
      const px = s.ax + abx * t, py = s.ay + aby * t, rs = o.r + s.r;
      const dx = o.x - px, dy = o.y - py; if (dx * dx + dy * dy >= rs * rs) return false;
      return comVel(o, s, px, py, () => N.hitPoint(o, px, py, s.r, e, mu, lq));
    }
    if (s.k === 'c') {
      const dx = o.x - s.x, dy = o.y - s.y, rs = o.r + s.r; if (dx * dx + dy * dy >= rs * rs) return false;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      return comVel(o, s, s.x + dx / d * s.r, s.y + dy / d * s.r, () => N.hitPoint(o, s.x, s.y, s.r, e, mu, lq));
    }
    // o polígono cheio: de dentro sai pela beira mais perto; de fora, as beiras
    const bb = s.bb; if (o.x + o.r < bb[0] || o.x - o.r > bb[2] || o.y + o.r < bb[1] || o.y - o.r > bb[3]) return false;
    const pts = s.pts, n = pts.length;
    if (pontoNoPoligono(o.x, o.y, pts)) {
      let bd = 1e18, bx = 0, by = 0;
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n], abx = b[0] - a[0], aby = b[1] - a[1], l = abx * abx + aby * aby;
        const t = l ? Math.max(0, Math.min(1, ((o.x - a[0]) * abx + (o.y - a[1]) * aby) / l)) : 0, px = a[0] + abx * t, py = a[1] + aby * t;
        const d = (o.x - px) * (o.x - px) + (o.y - py) * (o.y - py); if (d < bd) { bd = d; bx = px; by = py; }
      }
      let nx = bx - o.x, ny = by - o.y, d = Math.hypot(nx, ny); if (d < 1e-9) { nx = 1; ny = 0; d = 1; }
      nx /= d; ny /= d; o.x = bx + nx * o.r; o.y = by + ny * o.r;
      comVel(o, s, bx, by, () => N.reflect(o, nx, ny, e, mu, lq));
      return true;
    }
    let bateu = false;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], abx = b[0] - a[0], aby = b[1] - a[1], l = abx * abx + aby * aby;
      const t = l ? Math.max(0, Math.min(1, ((o.x - a[0]) * abx + (o.y - a[1]) * aby) / l)) : 0, px = a[0] + abx * t, py = a[1] + aby * t;
      const dx = o.x - px, dy = o.y - py; if (dx * dx + dy * dy >= o.r * o.r) continue;
      if (comVel(o, s, px, py, () => N.hitPoint(o, px, py, 0, e, mu, lq))) bateu = true;
    }
    return bateu;
  }
  function vale(P, s, bola) {                         // este colisor segura este corpo agora?
    if (!(s.modo & (bola ? 1 : 2))) return false;
    if (s.mat === 'obj') return bola ? P.C.COLIDE_PAREDES : true;
    if (!bola && (s.mat === 'rede' || s.mat === 'trave')) return P.C.JOG_REDE;
    return true;
  }
  function colideCorpo(P, o, bola) {
    const G = P.G, lq = P.C.LIMIAR_QUIQUE;
    const l = perto(G, o.x, o.y, bola);
    for (let i = 0; i < l.length; i++) {
      const s = G.col[l[i]];
      if (vale(P, s, bola) && bate(P, o, s, bola, lq) && bola && s.obj >= 0 && s.mat === 'obj') toqueObjeto(P, s.obj);
    }
    for (let k = 0; k < P.dyn.length; k++) {
      const D = P.dyn[k], bb = D.bb;
      if (!bb || o.x + o.r < bb[0] || o.x - o.r > bb[2] || o.y + o.r < bb[1] || o.y - o.r > bb[3]) continue;
      const cs = D.cols;
      for (let j = 0; j < cs.length; j++) { const s = cs[j]; if (vale(P, s, bola) && bate(P, o, s, bola, lq) && bola && s.mat === 'obj') toqueObjeto(P, s.obj); }
    }
  }
  function toqueObjeto(P, i) { if (P.previsao) return; const o = P.mapa.objetos[i]; if (o) (P._toq || (P._toq = new Set())).add(o.id); }

  /* ---------------- o chute (o do núcleo: centro da tampinha → centro da bola, só no alcance) ---------------- */
  function chuta(P, q, forca) {
    if (q.fora || (P.estado !== 'jogo' && P.estado !== 'saida')) return false;
    const B = P.B, C = P.C;
    let dx = B.x - q.x, dy = B.y - q.y, d = Math.hypot(dx, dy);
    if (d === 0) { dx = 1; dy = 0; d = 1; }
    if (d > C.ALCANCE_CHUTE) return false;
    if (!q.bot && P.tick - q.chuteT < MIN_PASSOS_CHUTE) { if (P.suspeito && q.netId) P.suspeito(q.netId, 'chute_rapido'); return false; }
    B.w = 0; const dv = U(forca * (C.EXTRA.massaChute || 1) / B.m); B.vx += dx / d * dv; B.vy += dy / d * dv;
    if (P.jogo === 'curva') B.cvT = 0;                 // PASSE e CHUTE saem retos; a curva é só do botão CURVA
    if (C.EXTRA.recuo > 0 && !q.cinematico) { const r = dv * C.EXTRA.recuo * 0.35; q.vx -= dx / d * r; q.vy -= dy / d * r; }
    q.chuteT = P.tick; q.fxT = Math.round(P.t * 1000) / 1000;
    toque(P, q); marcaChute(P, q, forca);
    evento(P, { t: 'chute', j: q.i, forte: forca >= C.FORCA_POWER });
    return true;
  }
  function toque(P, q) {
    const h = P.toques, u = h[h.length - 1];
    if (u && u.p === q) u.tick = P.tick;
    else { h.push({ p: q, t0: P.tick, tick: P.tick, chute: -1 }); if (h.length > 16) h.shift(); }
    const cd = P.chuteDe, e = h[h.length - 1];         // (o adversário ficou com a bola: o chute no ar perde a validade)
    if (cd && cd.time !== q.time && e.tick - e.t0 > DESVIO_TK) P.chuteDe = null;
    if (P.estado === 'saida' && q.time === P.saidaTime) P.estado = 'jogo';   // a saída foi dada
  }
  function marcaChute(P, q, forca) {
    const h = P.toques, u = h[h.length - 1]; if (u && u.p === q) u.chute = P.tick;
    P.chuteDe = { p: q, time: q.time, tick: P.tick, forte: forca >= P.C.FORCA_POWER, alvo: P.previsao ? -1 : golNaMira(P) };
  }
  function golNaMira(P) {                              // o gol em que a bola entra se seguir reta (sem batidas) — a regra do desvio
    const B = P.B, v = Math.hypot(B.vx, B.vy); if (v < U(3)) return -1;
    const ux = B.vx / v, uy = B.vy / v, alcance = v / (1 - P.C.FATOR_BOLA) / TPS;   // (até onde ela vai com o freio do campo)
    let melhor = -1, md = alcance;
    for (let k = 0; k < P.G.gols.length; k++) {
      const g = golAtual(P, k), den = ux * g.nx + uy * g.ny; if (den <= 1e-6) continue;   // (indo para dentro do gol)
      const t = ((g.P0[0] - B.x) * g.nx + (g.P0[1] - B.y) * g.ny) / den; if (t < 0 || t > md) continue;
      const px = B.x + ux * t, py = B.y + uy * t, s = (px - g.P0[0]) * g.ux + (py - g.P0[1]) * g.uy;
      if (s > 0 && s < g.larg) { md = t; melhor = k; }
    }
    return melhor;
  }
  function toquesNaBola(P) {
    const B = P.B, lim = P.C.R_BOLA + 2;
    for (const q of P.jog) if (!q.fora && Math.hypot(q.x - B.x, q.y - B.y) <= q.r + lim) toque(P, q);
  }

  /* ---------------- o gol (a bola inteira do lado de dentro da boca) ---------------- */
  function golCruzou(P, x0, y0, x1, y1) {
    const R = P.C.R_BOLA, gs = P.G.gols;
    for (let k = 0; k < gs.length; k++) {
      const g = golAtual(P, k); if (P.D[g.obj] && !P.D[g.obj].on) continue;
      const s0 = (x0 - g.P0[0]) * g.nx + (y0 - g.P0[1]) * g.ny, s1 = (x1 - g.P0[0]) * g.nx + (y1 - g.P0[1]) * g.ny;
      if (g.det === 'area') {                          // (a área de detecção: o centro da bola entra na caixa do gol)
        const dentro = (x, y, s) => { if (!(s > 0 && s < g.prof)) return false; const t = (x - g.P0[0]) * g.ux + (y - g.P0[1]) * g.uy; return t > 0 && t < g.larg; };
        if (!dentro(x0, y0, s0) && dentro(x1, y1, s1)) return k;
        continue;
      }
      if (s0 <= R && s1 > R) {
        const f = (R - s0) / ((s1 - s0) || 1e-12), xc = x0 + (x1 - x0) * f, yc = y0 + (y1 - y0) * f;
        const t = (xc - g.P0[0]) * g.ux + (yc - g.P0[1]) * g.uy;
        if (t > 0 && t < g.larg) return k;
      }
    }
    return -1;
  }
  // a autoria do gol no gol k de dono D (a regra das salas: o último toque; o desvio de quem defende não é gol contra)
  function lance(P, k, D) {
    const h = P.toques, n = h.length, L = { autor: null, assist: null, contra: false, contraDe: null, desvio: null, time: -1, i: -1 };
    if (!n) return L;
    let i = n - 1;
    if (D >= 0 && h[i].p.time === D) {                 // o último toque foi de quem sofreu: desvio ou gol contra
      let j = i; while (j >= 0 && h[j].p.time === D && h[j].tick - h[j].t0 <= DESVIO_TK) j--;
      const a = j >= 0 ? h[j] : null, cd = P.chuteDe;
      if (a && a.p.time !== D && cd && cd.p === a.p && cd.alvo === k && cd.tick >= a.t0 && a.tick - cd.tick <= 4 && P.tick - h[i].tick <= DESVIO_JANELA) { L.desvio = h[i].p; i = j; }
      else { L.contra = true; L.contraDe = h[i].p; return L; }
    }
    L.autor = h[i].p; L.time = L.autor.time; L.i = i;
    const a = i > 0 ? h[i - 1] : null;                 // a assistência: o toque antes do autor, de companheiro, limpo
    if (a && a.p !== L.autor && a.p.time === L.time && P.tick - a.tick <= ASSIST_TICKS) L.assist = a.p;
    return L;
  }
  function infoGol(P, time, pts, L, extra) {
    const nome = q => q ? q.nome : '', net = q => q && q.netId ? q.netId : null;
    return Object.assign({ time, pts, contra: !!L.contra, jogo: P.jogo, author: net(L.autor), assist: net(L.assist), contraBy: net(L.contraDe),
      name: nome(L.autor), assistName: nome(L.assist), contraName: nome(L.contraDe), desvioName: nome(L.desvio), j: L.autor ? L.autor.i : -1,
      ja: L.assist ? L.assist.i : -1, jc: L.contraDe ? L.contraDe.i : -1 }, extra || {});
  }
  // marca pontos para o time (gol, zona ou lógica) · reinicio: 'saida' | 'bola' | 'continua' · saiDepois: o time da próxima saída
  function marca(P, time, pts, L, extra, reinicio, saiDepois) {
    if (P.estado !== 'jogo' && P.estado !== 'saida') return;
    if (time >= 0) P.placar[time] += pts;
    if (L.autor && time >= 0 && L.autor.time === time) L.autor.golsFeitos = (L.autor.golsFeitos | 0) + pts;
    if (L.assist && time >= 0) L.assist.assist = (L.assist.assist | 0) + 1;
    P.ultimoGol = infoGol(P, time, pts, L, extra);
    P.golTime = time;
    if (P.meta > 0 && time >= 0 && P.placar[time] >= P.meta) P.fimPendente = true;
    if (P.prorrog && time >= 0) P.fimPendente = true;   // (o gol de ouro)
    const info = Object.assign({ placar: P.placar.slice(), tick: P.tick, t: P.t }, P.ultimoGol);
    evento(P, Object.assign({}, info, { t: 'gol', seg: info.t }));   // (o t do evento é o tipo: o tempo do jogo vai em seg — antes o tempo apagava o 'gol')
    P.onGol(info);
    if (reinicio === 'continua' && !P.fimPendente) { P.golT = 0; }
    else { P.estado = 'gol'; P.golT = 0; P.reinicioDepois = reinicio === 'continua' ? 'saida' : reinicio; P.saidaDepois = saiDepois; }
    logicaEvento(P, 'gol', { equipe: time, alvo: (extra && (extra.gol || extra.zona)) || '' });
  }
  function golNo(P, k) {
    const g = golAtual(P, k), D = lt(P, g.dono), E = P.E, rg = P.regras, L = lance(P, k, D);
    const saiDepois = D >= 0 ? D : (L.autor ? (L.autor.time + 1) % E : P.saidaTime);
    let time = -1;
    if (L.contra) {                                    // o gol contra (a regra do mapa)
      if (rg.golContra === 'adversario') {
        if (E === 2) time = 1 - D;
        else for (let i = P.toques.length - 1; i >= 0; i--) if (P.toques[i].p.time !== D) { time = P.toques[i].p.time; break; }
      } else if (rg.golContra === 'menos1') P.placar[D] = Math.max(0, P.placar[D] - g.pontos);
      if (time < 0) {                                  // (ninguém ganha o ponto: só recomeça)
        const ok = P.estado === 'jogo' || P.estado === 'saida';
        if (ok) { P.ultimoGol = infoGol(P, -1, 0, L, { gol: g.id }); evento(P, Object.assign({ t: 'gol', placar: P.placar.slice() }, P.ultimoGol)); P.onGol(Object.assign({ placar: P.placar.slice(), tick: P.tick, t: P.t }, P.ultimoGol)); P.estado = 'gol'; P.golT = 0; P.golTime = -1; P.reinicioDepois = rg.reinicio === 'continua' ? 'saida' : rg.reinicio; P.saidaDepois = D; }
        logicaEvento(P, 'gol_no', { alvo: g.id, equipe: -1 });
        return;
      }
    } else if (L.autor) time = L.autor.time;
    else if (D >= 0 && E === 2) time = 1 - D;          // (a bola entrou sem ninguém tocar: o ponto é de quem ataca aquele gol)
    if (time < 0 || time === D) {                       // gol neutro sem toque (ou do próprio dono): só recomeça
      P.estado = 'gol'; P.golT = 0; P.golTime = -1; P.reinicioDepois = rg.reinicio === 'continua' ? 'saida' : rg.reinicio; P.saidaDepois = saiDepois;
      evento(P, { t: 'semgol', gol: g.id });
      logicaEvento(P, 'gol_no', { alvo: g.id, equipe: -1 });
      return;
    }
    marca(P, time, g.pontos, L, { gol: g.id, contra: L.contra }, rg.reinicio, saiDepois);
    logicaEvento(P, 'gol_no', { alvo: g.id, equipe: time });
  }

  /* ---------------- as zonas, os portais, os botões e o fora ---------------- */
  const afetaBola = z => z.afeta !== 'jogadores';
  const afetaJog = (P, z, q) => z.afeta !== 'bola' && (z.equipe < 0 || lt(P, z.equipe) === q.time);
  function forcaZona(z, x, y) {                        // a direção e o tamanho da força (px/s²) de uma zona de força no ponto
    if (z.efeito === 'gravidade' && z.centro) { const dx = z.x - x, dy = z.y - y, d = Math.hypot(dx, dy) || 1; return [dx / d * z.forca, dy / d * z.forca]; }
    return [Math.cos(z.dir) * z.forca, Math.sin(z.dir) * z.forca];
  }
  const ZONA_FORCA = { impulso: 1, gravidade: 1, rampa: 1 };
  function zonasTick(P) {                              // uma vez por passo: a força na bola e o freio/empurrão das zonas de velocidade
    const B = P.B;
    for (const z0 of P.G.zonas) {
      if (!ativo(P, z0.obj) || !afetaBola(z0)) continue;
      const z = zonaAtual(P, z0);
      if (ZONA_FORCA[z.efeito]) { if (naZona(z, B.x, B.y)) { const f = forcaZona(z, B.x, B.y); B.vx += f[0] * DT; B.vy += f[1] * DT; } }
      else if ((z.efeito === 'lentidao' || z.efeito === 'velocidade') && naZona(z, B.x, B.y)) {
        const k = z.fator < 1 ? 1 - (1 - z.fator) * 0.06 : 1 + (z.fator - 1) * 0.02;
        B.vx *= k; B.vy *= k;
      }
    }
  }
  function fatorVelJog(P, q) {                         // o teto da velocidade do jogador nas zonas de velocidade e lentidão
    let f = 1;
    for (const z0 of P.G.zonas) {
      if ((z0.efeito !== 'velocidade' && z0.efeito !== 'lentidao') || !ativo(P, z0.obj)) continue;
      const z = zonaAtual(P, z0);
      if (afetaJog(P, z, q) && naZona(z, q.x, q.y)) f *= z.fator;
    }
    return Math.max(0.1, Math.min(3, f));
  }
  function zonasSub(P, sub) {                          // a cada subpasso: a esteira (e a plataforma que anda) leva quem está em cima; as zonas de força levam a tampinha
    const B = P.B;
    for (const z0 of P.G.zonas) {
      const ef = z0.efeito; if ((ef !== 'esteira' && !ZONA_FORCA[ef]) || !ativo(P, z0.obj)) continue;
      const z = zonaAtual(P, z0), d = P.D[z0.obj];
      let vx = 0, vy = 0;
      if (ef === 'esteira') { vx = Math.cos(z.dir) * z.forca; vy = Math.sin(z.dir) * z.forca; if (d) { vx += d.vx || 0; vy += d.vy || 0; } }
      if (ef === 'esteira' && afetaBola(z) && naZona(z, B.x, B.y)) { B.x += vx * sub; B.y += vy * sub; }
      for (const q of P.jog) {
        if (q.fora || q.cinematico || !afetaJog(P, z, q) || !naZona(z, q.x, q.y)) continue;
        if (ef === 'esteira') { q.x += vx * sub; q.y += vy * sub; }
        else { const f = forcaZona(z, q.x, q.y); q.x += f[0] * DERIVA_JOG * sub; q.y += f[1] * DERIVA_JOG * sub; }
      }
    }
  }
  function portaisBola(P) {
    const B = P.B, G = P.G;
    for (let k = 0; k < G.portais.length; k++) {
      const p = G.portais[k]; if (p.par < 0 || p.afeta === 'jogadores' || !ativo(P, p.obj)) continue;
      if (P.tick - (B.portalT == null ? -1e9 : B.portalT) < p.espera) return;
      const pp = posObj(P, p); if (Math.hypot(B.x - pp[0], B.y - pp[1]) > p.r) continue;
      teleporta(P, B, G.portais[p.par]); B.portalT = P.tick;
      evento(P, { t: 'portal', de: p.id, para: G.portais[p.par].id, bola: true }); logicaEvento(P, 'portal', { alvo: p.id });
      return;
    }
  }
  function portaisJog(P) {
    const G = P.G;
    for (const q of P.jog) {
      if (q.fora || q.cinematico) continue;
      for (const p of G.portais) {
        if (p.par < 0 || p.afeta === 'bola' || !ativo(P, p.obj) || P.tick - q.portalT < p.espera) continue;
        const pp = posObj(P, p); if (Math.hypot(q.x - pp[0], q.y - pp[1]) > p.r) continue;
        teleporta(P, q, G.portais[p.par]); q.portalT = P.tick;
        evento(P, { t: 'portal', de: p.id, para: G.portais[p.par].id, j: q.i }); logicaEvento(P, 'portal', { alvo: p.id, equipe: q.time });
        break;
      }
    }
  }
  function teleporta(P, o, para) {
    const v = Math.hypot(o.vx, o.vy), dp = posObj(P, para);
    let ux, uy;
    if (para.saida === 'angulo') { ux = Math.cos(para.dir); uy = Math.sin(para.dir); o.vx = ux * v; o.vy = uy * v; }
    else if (v > 1) { ux = o.vx / v; uy = o.vy / v; } else { ux = Math.cos(para.dir); uy = Math.sin(para.dir); }
    o.x = dp[0] + ux * (para.r + o.r + 2); o.y = dp[1] + uy * (para.r + o.r + 2);
    if (o === P.B) { o.cvT = 0; o.cvUx = null; }
  }
  function foraDoCampo(P) {                            // campo aberto: a bola que sai pelas laterais (true = recomeçou)
    const G = P.G, B = P.B; if (G.borda !== 'aberto' || !G.contorno || G.laterais === 'parede') return false;
    if (pontoNoPoligono(B.x, B.y, G.contorno)) return false;
    for (let k = 0; k < G.gols.length; k++) {           // (dentro de um gol não é fora)
      const g = golAtual(P, k), s = (B.x - g.P0[0]) * g.nx + (B.y - g.P0[1]) * g.ny, t = (B.x - g.P0[0]) * g.ux + (B.y - g.P0[1]) * g.uy;
      if (s > -U(1.5) && s < g.prof + U(1) && t > -U(1) && t < g.larg + U(1)) return false;
    }
    if (G.laterais === 'reinicio') {
      const h = P.toques, u = h.length ? h[h.length - 1].p : null;
      evento(P, { t: 'fora' }); saida(P, u ? (u.time + 1) % P.E : P.saidaTime); return true;
    }
    // a lateral: a bola volta parada um pouco para dentro do ponto em que saiu
    let bd = 1e18, bx = B.x, by = B.y; const pts = G.contorno;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], abx = b[0] - a[0], aby = b[1] - a[1], l = abx * abx + aby * aby, t = l ? Math.max(0, Math.min(1, ((B.x - a[0]) * abx + (B.y - a[1]) * aby) / l)) : 0, px = a[0] + abx * t, py = a[1] + aby * t, d = (B.x - px) ** 2 + (B.y - py) ** 2; if (d < bd) { bd = d; bx = px; by = py; } }
    const dx = G.CX - bx, dy = G.CY - by, d = Math.hypot(dx, dy) || 1;
    B.x = bx + dx / d * B.r * 2.2; B.y = by + dy / d * B.r * 2.2; B.vx = B.vy = 0; B.w = 0; B.cvT = 0;
    evento(P, { t: 'lateral' });
    return false;
  }
  function zonasGatilhos(P) {                          // entrar e sair das zonas (pontos, reinício, eliminação e a lógica)
    const G = P.G, B = P.B;
    for (const z0 of G.zonas) {
      const z = zonaAtual(P, z0), on = ativo(P, z0.obj);
      const kb = 'b' + z0.obj, bola = on && afetaBola(z) && naZona(z, B.x, B.y), antes = !!P.dentroZ.get(kb);
      if (bola !== antes) {
        P.dentroZ.set(kb, bola);
        logicaEvento(P, bola ? 'bola_entra' : 'bola_sai', { alvo: z.id });
        if (bola && z.efeito === 'pontos' && (P.estado === 'jogo' || P.estado === 'saida')) {
          const h = P.toques, u = h.length ? h[h.length - 1].p : null, time = z.equipe >= 0 ? lt(P, z.equipe) : (u ? u.time : -1);
          if (time >= 0) { const L = { autor: u && u.time === time ? u : null, assist: null }; marca(P, time, z.pontos, L, { zona: z.id }, z.reinicia ? P.regras.reinicio : 'continua', (time + 1) % P.E); }
        }
        if (bola && z.efeito === 'reinicio') { bolaNoSpawn(P); evento(P, { t: 'reinicio', zona: z.id }); }
      }
      for (const q of P.jog) {
        if (q.fora || q.cinematico) continue;
        const kj = z0.obj + ':' + q.i, dentro = on && afetaJog(P, z, q) && naZona(z, q.x, q.y), a2 = !!P.dentroZ.get(kj);
        if (dentro === a2) continue;
        P.dentroZ.set(kj, dentro);
        logicaEvento(P, dentro ? 'jogador_entra' : 'jogador_sai', { alvo: z.id, equipe: q.time });
        if (dentro && z.efeito === 'reinicio') { poeNoSpawn(P, q); evento(P, { t: 'volta', j: q.i }); }
        if (dentro && z.efeito === 'elimina' && P.estado === 'jogo') { q.fora = true; q.vx = q.vy = 0; q.mx = q.my = 0; P.dentroZ.set(kj, false); evento(P, { t: 'eliminado', j: q.i }); }
      }
    }
    if (P.regras.vitoria === 'sobrevivencia' && P.E >= 2 && P.estado === 'jogo') {
      const vivos = new Set(); for (const q of P.jog) if (!q.fora) vivos.add(q.time);
      if (vivos.size === 1) marca(P, [...vivos][0], 1, { autor: null, assist: null }, { rodada: true }, 'saida', P.saidaTime);
      else if (vivos.size === 0) { P.estado = 'gol'; P.golT = 0; P.golTime = -1; P.reinicioDepois = 'saida'; P.saidaDepois = P.saidaTime; }
    }
  }
  function botoes(P) {
    const G = P.G, B = P.B, C = P.C;
    G.botoes.forEach((b, k) => {
      const st = P.botaoEst[k]; if (!ativo(P, b.obj)) { st.press = false; return; }
      const pp = posObj(P, b);
      let press = false;
      if (b.por !== 'jogadores' && Math.hypot(B.x - pp[0], B.y - pp[1]) <= b.r + C.R_BOLA * 0.5) press = true;
      if (!press && b.por !== 'bola') for (const q of P.jog) if (!q.fora && (b.equipe < 0 || lt(P, b.equipe) === q.time) && Math.hypot(q.x - pp[0], q.y - pp[1]) <= b.r + q.r * 0.5) { press = true; break; }
      if (press === st.press) return;
      st.press = press;
      const d = P.D[b.obj]; if (d) d.press = press;
      if (press) {
        logicaEvento(P, 'botao', { alvo: b.id });
        if (b.modo === 'alterna') { st.ligado = !st.ligado; if (d) d.ligado = st.ligado; logicaEvento(P, st.ligado ? 'interruptor_liga' : 'interruptor_desliga', { alvo: b.id }); }
        evento(P, { t: 'botao', id: b.id, ligado: st.ligado });
      } else logicaEvento(P, 'botao_solto', { alvo: b.id });
      if (b.modo === 'momentaneo') { st.ligado = press; if (d) d.ligado = press; }
    });
  }
  function portoesECronos(P) {
    const m = P.mapa;
    for (const i of P.G.dinamicos) {
      const o = m.objetos[i], d = P.D[i];
      if (o.tipo === 'portao' && o.ciclo > 0 && !d.manual) { const ciclo = Math.max(1, Math.round(o.ciclo * TPS)), ab = Math.round(Math.min(o.ciclo, o.tempoAberto) * TPS); d.aberto = (P.tick % ciclo) < ab; }
      if (d.temp > 0 && d.on) { d.temp--; if (d.temp === 0) { d.on = false; evento(P, { t: 'some', id: o.id }); } }
    }
    P.G.cronos.forEach((c, k) => {
      const st = P.cron[k]; if (!st.rodando || !ativo(P, c.obj)) return;
      if (P.tick - st.t0 >= Math.max(1, Math.round(c.seg * TPS))) { if (c.repete) st.t0 = P.tick; else st.rodando = false; evento(P, { t: 'cronometro', id: c.id }); logicaEvento(P, 'cronometro', { alvo: c.id }); }
    });
  }

  /* ---------------- A LÓGICA (QUANDO … ENTÃO …): só as ações da lista, com limite de profundidade e de ações por passo ---------------- */
  function logicaEvento(P, tipo, info) {
    if (P.previsao || P.logProf >= LOGICA_PROF) return;
    const rs = P.mapa.logica; if (!rs.length) return;
    P.logProf++;
    try {
      for (let k = 0; k < rs.length; k++) {
        const r = rs[k]; if (!r.on || r.quando.tipo !== tipo) continue;
        const q = r.quando;
        if (q.alvo && info.alvo !== q.alvo) continue;
        if (q.equipe >= 0 && info.equipe !== q.equipe) continue;
        dispara(P, k);
      }
    } finally { P.logProf--; }
  }
  function logicaTempo(P) {                            // os QUANDO de tempo (o relógio da partida, a cada N segundos e o placar)
    if (P.previsao) return;
    const rs = P.mapa.logica; if (!rs.length) return;
    const novo = P.tj > P.tjLog; P.tjLog = P.tj;
    for (let k = 0; k < rs.length; k++) {
      const r = rs[k]; if (!r.on) continue;
      const q = r.quando, n = Math.max(1, Math.round(q.seg * TPS));
      if (q.tipo === 'tempo' && novo && P.tj === n) dispara(P, k);
      else if (q.tipo === 'a_cada' && novo && P.tj % n === 0) dispara(P, k);
      else if (q.tipo === 'placar' && !P.regrasN[k].placar) { const ok = q.equipe >= 0 ? P.placar[q.equipe] >= q.valor : P.placar.some(v => v >= q.valor); if (ok) { P.regrasN[k].placar = true; dispara(P, k); } }
    }
  }
  function dispara(P, k) {
    const r = P.mapa.logica[k], st = P.regrasN[k];
    if (r.repete === 'uma' && st.n >= 1) return;
    if (r.repete === 'vezes' && st.n >= r.vezes) return;
    if (r.espera > 0 && P.tick - st.ult < r.espera * TPS) return;
    st.n++; st.ult = P.tick;
    const quando = P.tick + Math.round(r.atraso * TPS);
    for (const a of r.entao) { if (quando <= P.tick) executa(P, a); else P.filaAcoes.push({ tick: quando, a }); }
    if (P.filaAcoes.length > FILA_LOGICA) P.filaAcoes.splice(0, P.filaAcoes.length - FILA_LOGICA);
  }
  function filaDaLogica(P) {
    if (!P.filaAcoes.length) return;
    const agora = [], fica = [];
    for (const x of P.filaAcoes) (x.tick <= P.tick ? agora : fica).push(x);
    P.filaAcoes = fica;
    for (const x of agora) executa(P, x.a);
  }
  // os passos de um MOVER/VOLTAR de dist u em seg s: nunca menos que o teto de velocidade deixa (o pico da curva suave é 1,5 × a média)
  function tempoTween(seg, dist) { return Math.max(1, Math.round((+seg || 0) * TPS), Math.ceil(1.5 * (+dist || 0) / LIM.velMov * TPS)); }
  function executa(P, a) {
    if (++P.acoesTick > LOGICA_ACOES_TICK) return;     // (o limite de ações por passo: uma regra que chama a outra não trava o servidor)
    const G = P.G, i = a.alvo ? G.porId.get(a.alvo) : -1, d = i != null && i >= 0 ? P.D[i] : null, B = P.B, o = i >= 0 ? P.mapa.objetos[i] : null;
    switch (a.acao) {
      case 'abrir': if (d) { d.aberto = true; d.manual = true; } break;
      case 'fechar': if (d) { d.aberto = false; d.manual = true; } break;
      case 'alternar': if (d) { d.aberto = !d.aberto; d.manual = true; } break;
      case 'ativar': if (d) { d.on = true; if (o.temp > 0) d.temp = Math.round(o.temp * TPS); if (o.mov && !o.mov.auto && d.ax < 0) d.ax = P.tick; } break;
      case 'desativar': if (d) d.on = false; break;
      case 'alterna_ativo': if (d) { d.on = !d.on; if (d.on && o.temp > 0) d.temp = Math.round(o.temp * TPS); if (d.on && o.mov && !o.mov.auto && d.ax < 0) d.ax = P.tick; } break;
      case 'mostrar': if (d) d.vis = true; break;
      case 'ocultar': if (d) d.vis = false; break;
      // (o MOVER e o VOLTAR andam suave — no meio, 1,5 × a média —, com o mesmo teto de velocidade dos objetos que se movem:
      //  mais rápido, a peça atravessaria a bola; quem pede 0 s leva o tempo mínimo desse teto)
      case 'mover': if (d) { const fx = d.ox, fy = d.oy; d.tw = { fx, fy, tx: fx + U(a.dx), ty: fy + U(a.dy), t0: P.tick, t1: P.tick + tempoTween(a.seg, Math.hypot(a.dx, a.dy)) }; } break;
      case 'voltar': if (d) d.tw = { fx: d.ox, fy: d.oy, tx: 0, ty: 0, t0: P.tick, t1: P.tick + tempoTween(a.seg, Math.hypot(d.ox, d.oy) / U(1)) }; break;
      case 'cor': if (d) d.cor = a.cor; break;
      case 'bola_para': B.vx = B.vy = 0; B.w = 0; B.cvT = 0; break;
      case 'bola_spawn': bolaNoSpawn(P); break;
      case 'bola_vel': { B.vx *= a.fator; B.vy *= a.fator; const v = Math.hypot(B.vx, B.vy), lim = P.C.LIMITE_VEL_BOLA; if (v > lim) { B.vx *= lim / v; B.vy *= lim / v; } break; }
      case 'pontos': {
        let time = a.equipe;
        if (time === -2) { const h = P.toques; time = h.length ? h[h.length - 1].p.time : -1; }
        const v = Math.round(a.valor);
        if (time >= 0 && time < P.E && v > 0) marca(P, time, v, { autor: null, assist: null }, { logica: true }, 'continua', (time + 1) % P.E);
        else if (time >= 0 && time < P.E && v < 0) P.placar[time] = Math.max(0, P.placar[time] + v);
        break;
      }
      case 'mensagem': P.mensagem = { texto: a.texto || '', ate: P.tick + Math.round(Math.max(0.5, a.seg) * TPS), cor: a.cor }; evento(P, { t: 'mensagem', texto: a.texto, seg: a.seg, cor: a.cor }); break;
      case 'efeito': evento(P, { t: 'efeito', efeito: a.efeito, cor: a.cor }); break;
      case 'cronometro_inicia': { const k = G.cronos.findIndex(c => c.id === a.alvo); if (k >= 0) { P.cron[k].rodando = true; P.cron[k].t0 = P.tick; } break; }
      case 'cronometro_para': { const k = G.cronos.findIndex(c => c.id === a.alvo); if (k >= 0) P.cron[k].rodando = false; break; }
      case 'interruptor': { const k = G.botoes.findIndex(b => b.id === a.alvo); if (k >= 0) { const st = P.botaoEst[k]; st.ligado = !st.ligado; if (d) d.ligado = st.ligado; logicaEvento(P, st.ligado ? 'interruptor_liga' : 'interruptor_desliga', { alvo: a.alvo }); } break; }
      case 'fim': if (P.estado !== 'fim') fim(P); break;
    }
  }

  /* ---------------- a barreira da saída (meio-campo ou círculo) ---------------- */
  function barreira(P, q) {
    const G = P.G, s = G.saida; if (s.tipo === 'livre' || q.fora || q.cinematico) return;
    const cx = G.bola0.x, cy = G.bola0.y;
    if (s.tipo === 'meio' && P.E === 2) {             // o barreiraUm do núcleo, com o lado de cada time
      const ld = G.lado[lt(P, q.time)] || [q.time === 0 ? -1 : 1, 0], sx = ld[0] >= 0 ? 1 : -1;
      if (q.time !== P.saidaTime) {
        if (sx < 0 && q.x > cx) { q.x = cx; if (q.vx > 0) q.vx = 0; } else if (sx > 0 && q.x < cx) { q.x = cx; if (q.vx < 0) q.vx = 0; }
        const dx = q.x - cx, dy = q.y - cy, d = Math.hypot(dx, dy), mm = s.raio + q.r;
        if (d < mm) { if (d > 1e-6) { q.x = cx + dx * mm / d; q.y = cy + dy * mm / d; } else q.x = cx + sx * mm; }
        return;
      }
      if (sx < 0 ? q.x <= cx : q.x >= cx) return;
      const dx = q.x - cx, dy = q.y - cy, d = Math.hypot(dx, dy), lim = s.raio - q.r;
      if (d <= lim) return;
      if (lim > 0 && d - lim < Math.abs(dx)) { q.x = cx + dx * lim / d; q.y = cy + dy * lim / d; }
      else { q.x = cx; if (sx < 0 ? q.vx > 0 : q.vx < 0) q.vx = 0; }
      return;
    }
    if (q.time === P.saidaTime) return;               // círculo: quem espera fica fora do círculo da bola
    const dx = q.x - cx, dy = q.y - cy, d = Math.hypot(dx, dy), mm = s.raio + q.r;
    if (d < mm) { if (d > 1e-6) { q.x = cx + dx * mm / d; q.y = cy + dy * mm / d; } else { const ld = G.lado[lt(P, q.time)] || [1, 0]; q.x = cx + ld[0] * mm; q.y = cy + ld[1] * mm; } }
  }

  /* ---------------- AS REGRAS DO GOLEIRO (a área de cada gol com dono: a caixa que a marcação "Área do goleiro" desenha) ----------------
     areaGol 'defesa': na área do gol de um time só fica o goleiro dele (os jogadores de linha do time ficam fora; o adversário entra);
     areaGol 'todos' : na área do gol de um time só fica o goleiro dele (ninguém mais, nem o adversário — como no handebol);
     goleiroPreso    : o goleiro não sai da área do gol dele (o mais perto, se o time tiver mais de um).
     O goleiro é a última vaga do time com o Goleiro ligado e 3 ou mais por time (o papel 'gk', o mesmo do bot goleiro); sem
     goleiro, a área fica fechada para o time inteiro. Só a tampinha: a bola entra e sai da área à vontade. */
  function regrasGoleiro(P, q) {
    if (q.fora || q.cinematico) return;
    const R = P.regras, gs = P.G.gols, gk = q.papel === 'gk';
    let casa = null, dCasa = 1e18;
    for (let k = 0; k < gs.length; k++) {
      const g = golAtual(P, k); if (g.dono < 0 || (P.D[g.obj] && !P.D[g.obj].on)) continue;
      const dono = lt(P, g.dono);
      if (gk && R.goleiroPreso && q.time === dono) { const d = Math.hypot(q.x - g.cx, q.y - g.cy); if (d < dCasa) { dCasa = d; casa = g; } }
      if (R.areaGol === 'livre' || (q.time === dono ? gk : R.areaGol !== 'todos')) continue;
      foraDaArea(g, q);
    }
    if (casa) dentroDaArea(casa, q);
  }
  // a tampinha não encosta na caixa da área: sai pelo lado mais perto (a frente ou um dos lados; para trás da linha só fora da boca do gol)
  function foraDaArea(g, q) {
    const A = g.area, r = q.r, rx = q.x - g.cx, ry = q.y - g.cy;
    const d = -(rx * g.nx + ry * g.ny), s = rx * g.ux + ry * g.uy;   // d: da linha do gol para dentro do campo · s: ao longo da boca
    const lado = A.meia + r, fundo = A.prof + r, naBoca = Math.abs(s) < g.larg / 2 + r;
    if (d >= fundo || s >= lado || s <= -lado || (naBoca ? d < 0 : d <= -r)) return;   // (dentro do gol a regra não vale)
    const pf = fundo - d, pe = s + lado, pd = lado - s, pt = naBoca ? 1e18 : d + r, m = Math.min(pf, pe, pd, pt);
    if (m === pf) { q.x -= g.nx * pf; q.y -= g.ny * pf; const vn = q.vx * g.nx + q.vy * g.ny; if (vn > 0) { q.vx -= g.nx * vn; q.vy -= g.ny * vn; } }
    else if (m === pe) { q.x -= g.ux * pe; q.y -= g.uy * pe; const vu = q.vx * g.ux + q.vy * g.uy; if (vu > 0) { q.vx -= g.ux * vu; q.vy -= g.uy * vu; } }
    else if (m === pd) { q.x += g.ux * pd; q.y += g.uy * pd; const vu = q.vx * g.ux + q.vy * g.uy; if (vu < 0) { q.vx -= g.ux * vu; q.vy -= g.uy * vu; } }
    else { q.x += g.nx * pt; q.y += g.ny * pt; const vn = q.vx * g.nx + q.vy * g.ny; if (vn < 0) { q.vx -= g.nx * vn; q.vy -= g.ny * vn; } }
  }
  // o goleiro preso: o centro da tampinha fica na caixa da área (ou dentro do gol)
  function dentroDaArea(g, q) {
    const A = g.area, rx = q.x - g.cx, ry = q.y - g.cy;
    const d = -(rx * g.nx + ry * g.ny), s = rx * g.ux + ry * g.uy;
    if (d > A.prof) { const e = d - A.prof; q.x += g.nx * e; q.y += g.ny * e; const vn = q.vx * g.nx + q.vy * g.ny; if (vn < 0) { q.vx -= g.nx * vn; q.vy -= g.ny * vn; } }
    if (s > A.meia) { const e = s - A.meia; q.x -= g.ux * e; q.y -= g.uy * e; const vu = q.vx * g.ux + q.vy * g.uy; if (vu > 0) { q.vx -= g.ux * vu; q.vy -= g.uy * vu; } }
    else if (s < -A.meia) { const e = -A.meia - s; q.x += g.ux * e; q.y += g.uy * e; const vu = q.vx * g.ux + q.vy * g.uy; if (vu < 0) { q.vx -= g.ux * vu; q.vy -= g.uy * vu; } }
  }

  /* ---------------- O PASSO (1/60 s) ----------------
     entrada(q) (opcional): para cada humano, aplica o comando dele (a direção e os botões — o servidor usa a fila de
     comandos das salas; o TESTAR, o analógico do aparelho). Os bots decidem aqui mesmo. */
  function passo(P, entrada) {
    if (!P.on || P.encerrado || P.pausado) return;
    P.tick++; P.acoesTick = 0; P._toq = null;
    if (P.tick === 1) logicaEvento(P, 'inicio', {});
    atualizaDinamicos(P, false);
    if (!P.previsao) portoesECronos(P);
    for (const q of P.jog) {
      if (q.fora || q.cinematico) { if (q.fora) q.mx = q.my = 0; continue; }
      if (q.bot) { decideBot(P, q); desencalha(P, q); } else if (entrada) entrada(q); else q.mx = q.my = 0;   // (v105: o bot não encalha no empurra-empurra)
    }
    fisica(P);
    if (!P.previsao) {
      botoes(P); zonasGatilhos(P); portaisJog(P);
      if (P._toq) for (const id of P._toq) logicaEvento(P, 'toque_objeto', { alvo: id });
      logicaTempo(P); filaDaLogica(P);
      pos(P);
    }
    const h = P.hist; h.push(P.B.x, P.B.y); if (h.length > 64) h.splice(0, 2);
  }
  function fisica(P) {
    const C = P.C, B = P.B, X = C.EXTRA, J = P.jog, G = P.G;
    for (const q of J) {
      if (q.fora || q.cinematico) continue;
      const d = N.direcao(q.mx, q.my, C.DIRECOES), vmax = C.VEL_JOG * fatorVelJog(P, q);
      if ((d.mx || d.my) && C.VIRA_NA_HORA && X.acelJog >= 1) { q.vx = d.mx * vmax; q.vy = d.my * vmax; }   // v105: a virada na hora (o RACHA de sempre; quem embala aos poucos continua embalando)
      else if (d.mx || d.my) {
        q.vx += d.mx * vmax * X.acelJog; q.vy += d.my * vmax * X.acelJog;
        const v = Math.hypot(q.vx, q.vy); if (v > vmax) { q.vx *= vmax / v; q.vy *= vmax / v; }
      } else if (X.freioJog >= 1) { q.vx = 0; q.vy = 0; }
      else { q.vx *= 1 - X.freioJog; q.vy *= 1 - X.freioJog; if (Math.hypot(q.vx, q.vy) < 2) q.vx = q.vy = 0; }
    }
    if (C.ATRITO_JOG_JOG > 0 && N.contatoJog) {      // v105: o jogo de corpo (o contato encostado se segura antes de andar), com a regra de colisão dos times
      const am = P.regras.colisaoAmigos, ad = P.regras.colisaoAdversarios;
      N.contatoJog(J, C, (a, b) => !a.fora && !b.fora && (a.time === b.time ? am : ad));
    }
    B.vx *= C.FATOR_BOLA; B.vy *= C.FATOR_BOLA;
    B.w *= 1 / (1 + C.AMORT_ANGULAR / TPS);
    if (G.zonas.length) zonasTick(P);
    let speed = Math.hypot(B.vx, B.vy);
    if (speed > C.LIMITE_VEL_BOLA) { B.vx *= C.LIMITE_VEL_BOLA / speed; B.vy *= C.LIMITE_VEL_BOLA / speed; speed = C.LIMITE_VEL_BOLA; }
    let relative = 0;
    for (const q of J) { if (q.fora) continue; const r = Math.hypot(B.vx - q.vx, B.vy - q.vy); if (r > relative) relative = r; }
    const steps = Math.max(2, Math.min(12, Math.ceil(Math.max(speed, relative) * DT / (C.R_BOLA * 0.3))));
    const sub = DT / steps, amigos = P.regras.colisaoAmigos, adv = P.regras.colisaoAdversarios, giro = X.giroCurva == null ? 1 : X.giroCurva;
    for (let s = 0; s < steps; s++) {
      const bx0 = B.x, by0 = B.y;
      for (const q of J) { if (q.fora) continue; q.x += q.vx * sub; q.y += q.vy * sub; }
      B.x += B.vx * sub; B.y += B.vy * sub;
      if (G.zonas.length) zonasSub(P, sub);
      if (P.jogo === 'curva') { if (giro === 1) N.curvaNoAr(B, sub); else { const cv = B.cv; B.cv = (cv || 0) * giro; N.curvaNoAr(B, sub); B.cv = cv; } }
      for (let k = 0; k < 2; k++) {
        for (const q of J) {
          if (q.fora) continue;
          N.hitBodies(q, B, C.QUIQUE_BOLA, C.ATRITO_JOG_BOLA);
          N.hitBox(q, G.GL, G.GT, G.GR, G.GB, C.Q_JOG_PAREDE, 0, C.LIMIAR_QUIQUE);
          colideCorpo(P, q, false);
          if (P.regraGol) regrasGoleiro(P, q);
        }
        for (let i = 0; i < J.length; i++) {
          if (J[i].fora) continue;
          for (let j = i + 1; j < J.length; j++) {
            if (J[j].fora) continue;
            if (J[i].time === J[j].time ? !amigos : !adv) continue;
            N.hitBodies(J[i], J[j], C.Q_JOG_JOG, C.ATRITO_JOG_JOG || 0);   // (v105: o jogo de corpo, o atrito do núcleo)
          }
        }
        if (P.estado === 'saida') for (const q of J) barreira(P, q);
        colideCorpo(P, B, true);
        N.hitBox(B, G.GL, G.GT, G.GR, G.GB, C.Q_PAREDE, C.ATRITO_BOLA, C.LIMIAR_QUIQUE);
      }
      toquesNaBola(P);
      if (!P.previsao) {
        if (P.estado === 'jogo' || P.estado === 'saida') {
          const k = golCruzou(P, bx0, by0, B.x, B.y);
          if (k >= 0) { golNo(P, k); if (P.estado === 'gol' || P.estado === 'fim') break; }
        }
        portaisBola(P);
        if (foraDoCampo(P)) break;
      } else if (G.portais.length) portaisBola(P);
      if (P.estado === 'fim') break;
    }
  }

  /* ---------------- a máquina de estados e as regras de término ---------------- */
  function pos(P) {
    if (P.estado === 'jogo') { P.tj++; P.t = P.tj / TPS; regraTempo(P); }
    else if (P.estado === 'gol') {
      if (++P.golT >= GOL_TICKS) {
        if (P.fimPendente) fim(P);
        else if (P.reinicioDepois === 'bola') { bolaNoSpawn(P); for (const q of P.jog) if (!q.vazio && q.fora) { q.fora = false; poeNoSpawn(P, q); } P.estado = 'jogo'; P.toques.length = 0; P.chuteDe = null; }
        else saida(P, P.saidaDepois != null ? P.saidaDepois : P.saidaTime);
      }
    } else if (P.estado === 'saida') {
      if (P.tick - P.saidaT0 > P.regras.saidaLivre * TPS) P.estado = 'jogo';   // ninguém deu a saída: a bola fica livre
    } else if (P.estado === 'fim') {
      if (++P.fimT >= FIM_TICKS) { P.on = false; encerra(P); }
    }
    if (P.mensagem && P.tick >= P.mensagem.ate) P.mensagem = null;
  }
  function lideres(P) { const mx = Math.max(...P.placar); return P.placar.map((v, i) => v === mx ? i : -1).filter(i => i >= 0); }
  function regraTempo(P) {
    if (P.tempoLim <= 0) return;
    if (P.regras.trocaLados && P.E === 2 && !P.trocado && !P.prorrog && P.t >= P.tempoLim / 2 && P.t < P.tempoLim) {   // o intervalo: troca de lado
      P.trocado = true; P.onAviso('TROCA DE LADO!'); evento(P, { t: 'troca' }); saida(P, 1 - P.saida0); return;
    }
    if (P.prorrog) { if (P.prorrogLim > 0 && P.t >= P.tempoLim + P.prorrogLim) fim(P); return; }
    if (P.t < P.tempoLim) return;
    if (lideres(P).length === 1 || P.regras.desempate === 'empate' || P.prorrogLim <= 0) { fim(P); return; }
    P.prorrog = true; P.onAviso('PRORROGAÇÃO — GOL DE OURO!'); evento(P, { t: 'aviso', texto: 'PRORROGAÇÃO — GOL DE OURO!' });
  }
  function fim(P) { if (P.estado === 'fim') return; P.estado = 'fim'; P.fimT = 0; evento(P, { t: 'fim', placar: P.placar.slice() }); }
  function encerra(P) {
    if (P.encerrado) return;
    P.encerrado = true;
    const l = lideres(P), gols = {}, assist = {};
    for (const q of P.jog) { if (q.netId && q.golsFeitos) gols[q.netId] = q.golsFeitos; if (q.netId && q.assist) assist[q.netId] = q.assist; }
    P.onFim({ placar: P.placar.slice(), vencedor: l.length === 1 ? l[0] : -1, duracao: P.t, prorrog: P.prorrog, tick: P.tick, equipes: P.E, gols, assist,
      jog: P.jog.map(q => ({ i: q.i, time: q.time, nome: q.nome, netId: q.netId, gols: q.golsFeitos | 0, assist: q.assist | 0, bot: !!q.bot, vazio: !!q.vazio })) });
  }

  /* ================================================================================================ OS BOTS (qualquer mapa) */
  // o espírito dos bots das salas (partida/bot.js): quem vai na bola, o goleiro, o apoio, a saída ensaiada, o anti-pino, a
  // mira com erro pelo nível — para qualquer mapa: atacam o gol de outro time mais perto da bola (ou a zona de pontos) e
  // desviam das paredes no caminho. O erro da mira vem do PRNG da partida (a mesma conta no servidor e no TESTAR).
  const NIVEIS = { facil: { plano: 16, foco: 12, mira: 0.14, saida: 75, pino: 24 }, dificil: { plano: 8, foco: 5, mira: 0.04, saida: 45, pino: 18 } };
  const CHUTE_CD_TICKS = 6, ALINHA_COS = 0.82;
  function bloqueado(P, q, dx, dy) {
    const px = q.x + dx * (q.r + U(2.2)), py = q.y + dy * (q.r + U(2.2)), G = P.G;
    const teste = s => (s.modo & 2) && s.mat !== 'rede' && s.mat !== 'trave' && s.mat !== 'borda' && solidoToca(s, px, py, q.r * 0.9);
    const l = perto(G, px, py, false); for (let i = 0; i < l.length; i++) if (teste(G.col[l[i]])) return true;
    for (const D of P.dyn) { const bb = D.bb; if (!bb || px + q.r < bb[0] || px - q.r > bb[2] || py + q.r < bb[1] || py - q.r > bb[3]) continue; for (const s of D.cols) if (teste(s)) return true; }
    if (px < G.GL + q.r || px > G.GR - q.r || py < G.GT + q.r || py > G.GB - q.r) return true;
    return false;
  }
  function vaiPara(P, q, x, y) {
    let dx = x - q.x, dy = y - q.y; const d = Math.hypot(dx, dy);
    if (d < q.r * 0.35) { q.mx = q.my = 0; return; }
    dx /= d; dy /= d;
    if (d > q.r && bloqueado(P, q, dx, dy)) {          // desvia do que está na frente (paredes e obstáculos que seguram a tampinha)
      const pref = q.ai ? q.ai.desvio : 1;
      for (const a0 of [0.55, -0.55, 1.1, -1.1, 1.65, -1.65, 2.3, -2.3]) {
        const a = a0 * pref, c = Math.cos(a), s = Math.sin(a), nx = dx * c - dy * s, ny = dx * s + dy * c;
        if (!bloqueado(P, q, nx, ny)) { dx = nx; dy = ny; if (q.ai && a0 < 0) q.ai.desvio = -pref; break; }
      }
    }
    q.mx = dx; q.my = dy;
  }
  function alvoDoTime(P, time) {                      // o gol que o time ataca (o mais perto da bola, de outro dono ou neutro)
    let melhor = null, md = 1e18; const B = P.B;
    for (let k = 0; k < P.G.gols.length; k++) {
      const g = golAtual(P, k); if ((P.D[g.obj] && !P.D[g.obj].on) || lt(P, g.dono) === time) continue;
      const d = Math.hypot(g.cx - B.x, g.cy - B.y); if (d < md) { md = d; melhor = { x: g.cx + g.nx * U(1), y: g.cy + g.ny * U(1), g }; }
    }
    if (melhor) return melhor;
    for (const z0 of P.G.zonas) {
      if (z0.efeito !== 'pontos' || !ativo(P, z0.obj) || (z0.equipe >= 0 && lt(P, z0.equipe) !== time)) continue;
      const z = zonaAtual(P, z0), d = Math.hypot(z.x - B.x, z.y - B.y); if (d < md) { md = d; melhor = { x: z.x, y: z.y }; }
    }
    return melhor;
  }
  function golDoTime(P, time) { let m = null, md = 1e18; for (let k = 0; k < P.G.gols.length; k++) { const g = golAtual(P, k); if (lt(P, g.dono) !== time) continue; const d = Math.hypot(g.cx - P.B.x, g.cy - P.B.y); if (d < md) { md = d; m = g; } } return m; }
  function chutarEm(P, q, tx, ty, forte) {
    const B = P.B, ai = q.ai, nv = NIVEIS[ai.nivel], C = P.C;
    const ex = tx - B.x, ey = ty - B.y, ed = Math.hypot(ex, ey) || 1, bx = B.x - q.x, by = B.y - q.y, bd = Math.hypot(bx, by) || 1;
    const alinhado = (ex * bx + ey * by) / (ed * bd) >= ALINHA_COS, pertoB = bd <= C.ALCANCE_CHUTE;
    if (pertoB && alinhado && P.tick - ai.ultChute >= CHUTE_CD_TICKS) {
      const erro = (P.rnd() * 2 - 1) * nv.mira;      // a mira do nível: gira um pouco o corpo em volta da bola (como o bot das salas)
      if (erro) { const c = Math.cos(erro), s = Math.sin(erro), px = q.x - B.x, py = q.y - B.y; q.x = B.x + px * c - py * s; q.y = B.y + py * c + px * s; }
      if (chuta(P, q, forte ? C.FORCA_POWER : C.FORCA_KICK)) { ai.ultChute = P.tick; ai.planoT = P.tick + nv.plano; return; }
    }
    if (pertoB && alinhado) { q.mx = q.my = 0; return; }
    vaiPara(P, q, B.x - (ex / ed) * (q.r + B.r) * 1.15, B.y - (ey / ed) * (q.r + B.r) * 1.15);
  }
  function linhaLivre(P, time, alvo) {                 // nenhum adversário na linha do passe
    const B = P.B, ex = alvo.x - B.x, ey = alvo.y - B.y, L2 = ex * ex + ey * ey || 1;
    for (const o of P.jog) {
      if (o.fora || o.time === time) continue;
      const t = ((o.x - B.x) * ex + (o.y - B.y) * ey) / L2; if (t <= 0 || t > 1.05) continue;
      if (Math.hypot(B.x + ex * t - o.x, B.y + ey * t - o.y) < o.r + B.r + U(1)) return false;
    }
    return true;
  }
  // v105 · o bot não fica encalhado no empurra-empurra (o mesmo do server/partida/bot.js): andando para alguém e parado,
  // encostado em outra tampinha por 12 passos, ele desvia 70° por 24 passos, sempre no mesmo sentido (os dois passam um pelo outro)
  const ENC_PASSOS = 12, DESVIO_PASSOS = 24, DESVIO_C = Math.cos(70 * Math.PI / 180), DESVIO_S = Math.sin(70 * Math.PI / 180);
  function desencalha(P, q) {
    const ai = q.ai; if (!ai) return;
    if (!(q.mx || q.my) || P.estado !== 'jogo') { ai.encT = 0; ai.desvioT = 0; return; }
    if (ai.desvioT > 0) { ai.desvioT--; const mx = q.mx, my = q.my; q.mx = mx * DESVIO_C - my * DESVIO_S; q.my = mx * DESVIO_S + my * DESVIO_C; return; }
    const C = P.C;
    if (!(C.ATRITO_JOG_JOG > 0) || Math.hypot(q.vx, q.vy) >= 0.3 * C.VEL_JOG) { ai.encT = 0; return; }
    let enc = false;
    for (const o of P.jog) { if (o !== q && !o.fora && Math.hypot(o.x - q.x, o.y - q.y) < q.r + o.r + 1.5) { enc = true; break; } }
    if (!enc) { ai.encT = 0; return; }
    if (++ai.encT >= ENC_PASSOS) { ai.encT = 0; ai.desvioT = DESVIO_PASSOS; }
  }
  function decideBot(P, q) {
    const ai = q.ai, nv = NIVEIS[ai.nivel], B = P.B, C = P.C, G = P.G, ld = G.lado[lt(P, q.time)] || [1, 0];
    const h = P.hist, i0 = Math.max(0, h.length - 2 - 2 * nv.foco), bv = { x: h[i0] != null ? h[i0] : B.x, y: h[i0 + 1] != null ? h[i0 + 1] : B.y };
    if (P.estado === 'saida') {
      if (q.time === P.saidaTime && q.k === 0) {        // o batedor: espera colado na bola e toca
        if (P.tick - P.saidaT0 < nv.saida) {
          const ax = B.x + ld[0] * (q.r + B.r), ay = B.y + ld[1] * (q.r + B.r);
          if (Math.hypot(ax - q.x, ay - q.y) > (q.r + B.r) * 0.2) vaiPara(P, q, ax, ay); else q.mx = q.my = 0;
          return;
        }
        let melhor = null, md = 1e18;
        for (const o of P.jog) { if (o === q || o.fora || o.time !== q.time) continue; const d = Math.hypot(o.x - B.x, o.y - B.y); if (d < md) { md = d; melhor = o; } }
        const alvo = alvoDoTime(P, q.time);
        const frente = melhor && alvo && Math.hypot(alvo.x - melhor.x, alvo.y - melhor.y) < Math.hypot(alvo.x - B.x, alvo.y - B.y);
        const t = frente ? melhor : (alvo || { x: B.x - ld[0] * U(10), y: B.y - ld[1] * U(10) });
        chutarEm(P, q, t.x, t.y, false); return;
      }
      const s = spawnDe(P, q);
      if (Math.hypot(s[0] - q.x, s[1] - q.y) > q.r) vaiPara(P, q, s[0], s[1]); else q.mx = q.my = 0;
      return;
    }
    if (P.estado !== 'jogo') { q.mx = q.my = 0; return; }
    const alvo = alvoDoTime(P, q.time), meu = golDoTime(P, q.time);
    const dB = Math.hypot(B.x - q.x, B.y - q.y), comBola = dB <= C.ALCANCE_CHUTE * 1.05;
    // o anti-pino: a bola parada no pé por muito tempo, tira de lá
    if (dB <= C.ALCANCE_CHUTE && Math.hypot(B.vx, B.vy) < U(1)) {
      if (++ai.pinoT >= nv.pino) { const a = alvo || { x: B.x - ld[0] * U(12), y: B.y - ld[1] * U(12) }; ai.pinoT = 0; chutarEm(P, q, a.x, a.y, true); return; }
    } else ai.pinoT = 0;
    if (q.papel === 'gk' && meu) {                    // o goleiro: entre a bola e o próprio gol; sai para afastar
      if (comBola) { const a = alvo || { x: G.CX, y: G.CY }; chutarEm(P, q, a.x, a.y, true); return; }
      const dx = bv.x - meu.cx, dy = bv.y - meu.cy, d = Math.hypot(dx, dy) || 1;
      if (d < U(9)) { vaiPara(P, q, B.x, B.y); return; }
      const lado = Math.max(-1, Math.min(1, (dx * meu.ux + dy * meu.uy) / d)) * 0.35;
      vaiPara(P, q, meu.cx - meu.nx * q.r * 2.4 + meu.ux * lado * meu.larg, meu.cy - meu.ny * q.r * 2.4 + meu.uy * lado * meu.larg); return;
    }
    let chaser = null, md = 1e18;
    for (const o of P.jog) { if (o.fora || o.time !== q.time || (o.papel === 'gk' && meu)) continue; const d = Math.hypot(bv.x - o.x, bv.y - o.y); if (d < md) { md = d; chaser = o; } }
    if (P.tick >= ai.planoT || !ai.alvo) { ai.planoT = P.tick + nv.plano; ai.alvo = { mira: (P.rnd() - 0.5) * 0.6 }; }
    if (chaser === q) {
      if (comBola && alvo) {
        const g = alvo.g, tx = g ? g.cx + g.ux * g.larg * ai.alvo.mira : alvo.x, ty = g ? g.cy + g.uy * g.larg * ai.alvo.mira : alvo.y;
        const dist = Math.hypot(tx - B.x, ty - B.y);
        if (dist > U(38)) {                            // longe do gol: o passe para o companheiro mais à frente e livre, ou conduz
          let melhor = null, nota = -1e9;
          for (const o of P.jog) {
            if (o === q || o.fora || o.time !== q.time || o.papel === 'gk') continue;
            const nt = (dist - Math.hypot(tx - o.x, ty - o.y)) / U(10) + (linhaLivre(P, q.time, o) ? 1 : 0) - Math.hypot(o.x - B.x, o.y - B.y) / U(40);
            if (nt > nota) { nota = nt; melhor = o; }
          }
          if (melhor && nota > 0.6) { chutarEm(P, q, melhor.x + melhor.vx * 0.25, melhor.y + melhor.vy * 0.25, false); return; }
          const dd = dist || 1; vaiPara(P, q, B.x - (tx - B.x) / dd * B.r, B.y - (ty - B.y) / dd * B.r); return;
        }
        chutarEm(P, q, tx, ty, true); return;
      }
      if (comBola) { q.mx = q.my = 0; return; }
      const t = Math.min(1.2, Math.hypot(bv.x - q.x, bv.y - q.y) / C.VEL_JOG);
      vaiPara(P, q, B.x + B.vx * t * 0.5, B.y + B.vy * t * 0.5); return;
    }
    // o apoio: entre o próprio lugar e a bola, puxado para o ataque
    const s = spawnDe(P, q), ax = alvo ? alvo.x : B.x, ay = alvo ? alvo.y : B.y;
    vaiPara(P, q, Math.max(G.GL + q.r, Math.min(G.GR - q.r, s[0] * 0.45 + bv.x * 0.35 + ax * 0.2)), Math.max(G.GT + q.r, Math.min(G.GB - q.r, s[1] * 0.45 + bv.y * 0.35 + ay * 0.2)));
  }

  /* ================================================================================================ O QUADRO (a rede) */
  const r1 = v => Math.round(v * 10) / 10, r3 = v => Math.round(v * 1000) / 1000;
  function botaoQuadro(q) { const b = q.netButton; if (!b) return 0; return (b.estado & 3) | (b.livre ? 4 : 0) | ((b.armaTipo & 3) << 3) | (Math.max(0, Math.min(31, b.arma | 0)) << 5); }
  function quadro(P) {
    const B = P.B, d = [];
    for (const i of P.G.dinamicos) {
      const x = P.D[i];
      const f = (x.on ? 1 : 0) | (x.vis ? 2 : 0) | (x.aberto ? 4 : 0) | (x.ligado ? 8 : 0) | (x.press ? 16 : 0) | (x.manual ? 32 : 0);
      d.push([f, x.ax, r1(x.ox), r1(x.oy), x.temp | 0, x.tw ? [r1(x.tw.fx), r1(x.tw.fy), r1(x.tw.tx), r1(x.tw.ty), x.tw.t0, x.tw.t1] : 0, x.cor || 0]);
    }
    return {
      tick: P.tick, el: r3(P.t), tj: P.tj, st: P.estado, ko: P.saidaTime, sc: P.placar.slice(), pr: P.prorrog ? 1 : 0, gt: P.golT, gT: P.golTime, tr: P.trocado ? 1 : 0,
      b: [r1(B.x), r1(B.y), r1(B.vx), r1(B.vy), r3(B.w), r3(B.cv || 0), r3(B.cvT > 0 ? B.cvT : 0)],
      p: P.jog.map(q => [r1(q.x), r1(q.y), r1(q.vx), r1(q.vy), q.ack49 || 0, q.chuteT == null ? -99 : q.chuteT, r3(q.fxT == null ? -9 : q.fxT), botaoQuadro(q), (q.fora ? 1 : 0) | (q.bot ? 2 : 0)]),
      d, g: P.ultimoGol || null, c: P.cron.map(c => c.rodando ? [1, c.t0] : 0), bt: P.botaoEst.map(b => (b.ligado ? 1 : 0) | (b.press ? 2 : 0)),
      m: P.mensagem ? [P.mensagem.texto, P.mensagem.ate, P.mensagem.cor] : 0,
    };
  }
  // o aparelho põe o quadro do servidor na partida local (para desenhar e prever a partir dele)
  function aplicaQuadro(P, s) {
    if (!s || typeof s !== 'object') return;
    P.tick = s.tick | 0; P.t = +s.el || 0; P.tj = s.tj | 0; P.tjLog = P.tj; P.estado = typeof s.st === 'string' ? s.st : P.estado; P.saidaTime = s.ko | 0; P.prorrog = !!s.pr; P.trocado = !!s.tr;
    if (Number.isFinite(s.gt)) P.golT = s.gt | 0; if (Number.isFinite(s.gT)) P.golTime = s.gT | 0;
    if (Array.isArray(s.sc)) for (let i = 0; i < P.E; i++) P.placar[i] = s.sc[i] | 0;
    const B = P.B, b = Array.isArray(s.b) ? s.b : [];
    B.x = +b[0] || 0; B.y = +b[1] || 0; B.vx = +b[2] || 0; B.vy = +b[3] || 0; B.w = +b[4] || 0; B.cv = +b[5] || 0; B.cvT = +b[6] || 0; B.cvUx = null;
    (s.p || []).forEach((v, i) => { const q = P.jog[i]; if (!q || !Array.isArray(v)) return; q.x = +v[0]; q.y = +v[1]; q.vx = +v[2]; q.vy = +v[3]; q.ack49 = v[4] | 0; q.chuteT = +v[5]; q.fxT = +v[6]; q.btn = v[7] | 0; q.fora = !!((v[8] | 0) & 1); q.ehBot = !!((v[8] | 0) & 2); });
    (s.d || []).forEach((v, k) => {
      const i = P.G.dinamicos[k], x = P.D[i]; if (!x || !Array.isArray(v)) return;
      const f = v[0] | 0; x.on = !!(f & 1); x.vis = !!(f & 2); x.aberto = !!(f & 4); x.ligado = !!(f & 8); x.press = !!(f & 16); x.manual = !!(f & 32);
      x.ax = +v[1]; x.ox = +v[2] || 0; x.oy = +v[3] || 0; x.temp = v[4] | 0; x.tw = Array.isArray(v[5]) ? { fx: +v[5][0], fy: +v[5][1], tx: +v[5][2], ty: +v[5][3], t0: +v[5][4], t1: +v[5][5] } : null; x.cor = typeof v[6] === 'string' ? v[6] : '';
    });
    (s.c || []).forEach((v, k) => { if (P.cron[k]) { P.cron[k].rodando = !!v; if (Array.isArray(v)) P.cron[k].t0 = v[1] | 0; } });
    (s.bt || []).forEach((v, k) => { if (P.botaoEst[k]) { P.botaoEst[k].ligado = !!(v & 1); P.botaoEst[k].press = !!(v & 2); } });
    P.mensagem = Array.isArray(s.m) ? { texto: String(s.m[0] || ''), ate: s.m[1] | 0, cor: s.m[2] } : null;
    if (s.g) P.ultimoGol = s.g;
    atualizaDinamicos(P, true);
  }
  // o estado de cada objeto para desenhar (ligado, visível, aberto, a posição de agora)
  function estadoObjeto(P, i) {
    const o = P.mapa.objetos[i], d = P.D[i];
    if (!d) return { on: o.ativo, vis: o.visivel, aberto: !!o.aberto, ligado: !!o.ligado, press: false, T: T0, cor: '', temp: 0 };
    return { on: d.on, vis: d.vis, aberto: d.aberto, ligado: d.ligado, press: d.press, T: d.T || T0, cor: d.cor, temp: d.temp | 0 };
  }
  function restoCronometro(P, k) { const c = P.G.cronos[k], st = P.cron[k]; if (!c || !st) return 0; if (!st.rodando) return c.seg; return Math.max(0, c.seg - (P.tick - st.t0) / TPS); }

  // um mapa novo e vazio (o editor começa daqui)
  function mapaVazio(o) {
    o = o || {};
    const w = o.w || 71, h = o.h || 50;
    return limpa({ formato: FORMATO, v: 1, nome: o.nome || 'Mapa novo', campo: { forma: 'retangulo', w, h, borda: 'bola', margem: 7.5, margemY: 5 },
      partida: { equipes: 2, porTime: 2 }, objetos: [
        { id: 'gA', tipo: 'gol', x: -w / 2, y: 0, rot: 180, largura: 16, prof: 6.6, dono: 0 },
        { id: 'gB', tipo: 'gol', x: w / 2, y: 0, rot: 0, largura: 16, prof: 6.6, dono: 1 }], logica: [] }).mapa;
  }

  return { VERSAO, FORMATO, LIM, TIPOS, COLISAO, FORMAS_CAMPO, BORDAS, FORMAS_OBJ, EFEITOS_ZONA, AFETA, PISOS, TEXTURAS, FUNDOS, LUZES, BOLAS,
    MODOS_JOGO, CATEGORIAS, SAIDAS, REINICIOS, LATERAIS, DESEMPATES, GOL_CONTRA, VITORIAS, ICONES_DECOR, TEXTURA_DECOR, CORES_EQUIPE, NOMES_EQUIPE,
    CAMADAS, CAMADA_PADRAO, PRESETS, EXTRA_LIM, EXTRA_PADRAO, PERFIL_CAMPOS, QUANDOS, ACOES, EFEITOS_VISUAIS, CENARIO_U, GOL_TICKS, FIM_TICKS,
    limpa, limpaObjeto, limpaRegra, limpaFisica, fisicaResolvida, compila, contornoCampo, poligonoDaForma, rotaciona, pontoNoPoligono, distSeg,
    novaPartida, aplicaQuadro, quadro, estadoObjeto, restoCronometro, movEm, golAtual, zonaAtual, naZona, ativo, spawnDe, mapaVazio, colisoresDe, golGeom,
    raioObjeto, botAssume, humanoAssume, texto, padraoCor, U, PX, TPS, DT, prng, timeDoLado: lt,
    __interno: { perto, recortaSeg, problemas, dentroDeSolido, objetoMuda, passo, fisica, chuta, saida, atualizaDinamicos, executa, lance, golNaMira, golCruzou } };
});
