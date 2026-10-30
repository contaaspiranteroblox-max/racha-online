/* =====================================================================================================================
   RACHA v92 · OFICINA — OS MODELOS PRONTOS (tools/oficina/modelos.js)
   Os 15 modelos (todos editáveis: viram um rascunho seu) e o "criar do zero" (o tamanho e o formato do campo).
   Cada modelo é um mapa no formato do jogo; ele passa pelo RachaMapa.limpa como qualquer mapa (o mesmo do servidor).
   ===================================================================================================================== */
const TAMANHOS = {                                     // u (1 u = 19 px): a área da bola, o gol e quantos por time
  mini: { nome: 'Mini', w: 56, h: 40, gol: 12.8, por: 1, mx: 7.5, my: 5 },
  pequeno: { nome: 'Pequeno', w: 71, h: 50, gol: 16, por: 2, mx: 7.5, my: 5 },
  medio: { nome: 'Médio', w: 86, h: 70, gol: 20.5, por: 3, mx: 7.5, my: 5 },
  grande: { nome: 'Grande', w: 108, h: 90, gol: 24.5, por: 4, mx: 8, my: 5 },
  gigante: { nome: 'Gigante', w: 150, h: 100, gol: 28, por: 5, mx: 9, my: 6 },
};
const FORMATOS = [
  { id: 'retangulo', nome: 'Retangular' }, { id: 'quadrado', nome: 'Quadrado' }, { id: 'circulo', nome: 'Circular' },
  { id: 'octogono', nome: 'Octogonal' }, { id: 'arena', nome: 'Arena' }, { id: 'paredes', nome: 'Com paredes' },
  { id: 'aberto', nome: 'Aberto' }, { id: 'assimetrico', nome: 'Assimétrico' }, { id: 'livre', nome: 'Livre' },
];
let seqModelo = 0;
const oid = p => (p || 'o') + (++seqModelo).toString(36);
const mGol = (x, y, rot, largura, dono, o) => Object.assign({ id: oid('g'), tipo: 'gol', x, y, rot, largura, prof: 6.6, dono }, o || {});
const mParede = (x, y, comp, rot, o) => Object.assign({ id: oid('w'), tipo: 'parede', x, y, comp, rot: rot || 0, esp: 0.6 }, o || {});
const mObst = (forma, x, y, w, hh, o) => Object.assign({ id: oid('b'), tipo: 'obstaculo', forma, x, y, w, h: hh }, o || {});
const mZona = (efeito, x, y, w, hh, o) => Object.assign({ id: oid('z'), tipo: 'zona', efeito, x, y, w, h: hh }, o || {});
const mSpawn = (equipe, x, y, ordem) => ({ id: oid('s'), tipo: 'spawn', equipe, x, y, ordem: ordem || 0 });
const mMarca = (forma, x, y, w, hh, o) => Object.assign({ id: oid('k'), tipo: 'marcacao', forma, x, y, w, h: hh }, o || {});
const mTexto = (t, x, y, tam, o) => Object.assign({ id: oid('t'), tipo: 'texto', texto: t, x, y, tam: tam || 3 }, o || {});
const mDecor = (forma, x, y, w, hh, o) => Object.assign({ id: oid('d'), tipo: 'decoracao', forma, x, y, w, h: hh }, o || {});
const mDoisGols = (w, larg, o) => [mGol(-w / 2, 0, 180, larg, 0, o), mGol(w / 2, 0, 0, larg, 1, o)];
function mBase(nome, o) {
  return Object.assign({ formato: RM.FORMATO, v: 1, nome, descricao: '', categoria: 'classico', tags: [],
    campo: { forma: 'retangulo', w: 71, h: 50, borda: 'bola', margem: 7.5, margemY: 5 },
    aparencia: {}, fisica: { preset: 'classico' }, partida: { equipes: 2, porTime: 2 }, objetos: [], logica: [] }, o || {});
}

const MODELOS = [
  { id: 'classico', nome: 'Campo Clássico RACHA', sub: 'O campo das salas, 2 × 2, a física oficial', ic: 'campo', faz: () => mBase('Campo Clássico RACHA', {
    descricao: 'O campo das salas do RACHA (2 × 2) com a física de sempre. Comece daqui e mude o que quiser.', categoria: 'classico',
    partida: { modo: 'futebol', equipes: 2, porTime: 2, meta: 3, raioSaida: 10 }, objetos: mDoisGols(71, 16) }) },
  { id: 'x1', nome: 'Mini Arena X1', sub: 'Um contra um, campo pequeno de cantos arredondados', ic: 'pessoas', faz: () => mBase('Mini Arena X1', {
    descricao: 'X1 rápido: campo pequeno, cantos arredondados e gol estreito.', categoria: 'competitivo',
    campo: { forma: 'arena', w: 56, h: 40, canto: 7, borda: 'bola', margem: 6, margemY: 4 },
    aparencia: { piso: 'grama_escura', textura: 'listras', escala: 5 },
    partida: { modo: 'x1', equipes: 2, porTime: 1, porMax: 1, meta: 5, raioSaida: 8 }, objetos: mDoisGols(56, 12.8) }) },
  { id: 'futsal', nome: 'Futsal Brasileiro', sub: 'Quadra de madeira, 3 × 3, bola mais pesada', ic: 'escudo', faz: () => mBase('Futsal Brasileiro', {
    descricao: 'Quadra coberta, piso de madeira, linhas de futsal e bola que corre menos (física Técnico).', categoria: 'competitivo',
    campo: { forma: 'retangulo', w: 86, h: 54, borda: 'bola', margem: 6, margemY: 4 },
    aparencia: { piso: 'quadra', cor1: '#c98a4b', cor2: '#b9783d', textura: 'listras', escala: 3, linhas: { cor: '#ffffff', esp: 0.3 }, fundo: 'arquibancada', luz: 'dia' },
    fisica: { preset: 'tecnico' }, partida: { modo: 'futsal', equipes: 2, porTime: 3, tempo: 4, meta: 0, prorrogacao: 1 },
    objetos: mDoisGols(86, 14, { prof: 5 }).concat([mMarca('arco', -43, 0, 24, 24, { rot: 0, abertura: 180, esp: 0.3 }), mMarca('arco', 43, 0, 24, 24, { rot: 180, abertura: 180, esp: 0.3 })]) }) },
  { id: 'circular', nome: 'Arena Circular', sub: 'O campo redondo: a bola nunca para no canto', ic: 'circulo', faz: () => mBase('Arena Circular', {
    descricao: 'Sem canto para prender a bola: o campo é um círculo e os gols ficam um de cada lado.', categoria: 'criativo',
    campo: { forma: 'circulo', w: 72, h: 72, borda: 'bola', margem: 5, margemY: 5 },
    aparencia: { piso: 'sintetica', textura: 'circulos', escala: 6 },
    partida: { modo: 'arena_circular', equipes: 2, porTime: 2, meta: 3 }, objetos: mDoisGols(72, 14) }) },
  { id: 'gigante', nome: 'Campo Gigante', sub: '5 × 5 com goleiro, gol grande, 5 minutos', ic: 'ajustar', faz: () => mBase('Campo Gigante', {
    descricao: 'O maior campo: 5 por time (com goleiro), 5 minutos e prorrogação de gol de ouro.', categoria: 'competitivo',
    campo: { forma: 'retangulo', w: 150, h: 100, borda: 'bola', margem: 9, margemY: 6 },
    partida: { modo: 'x5', equipes: 2, porTime: 5, tempo: 5, meta: 0, raioSaida: 14, goleiro: true }, objetos: mDoisGols(150, 28, { prof: 7.5 }) }) },
  { id: 'quatro', nome: 'Arena de Quatro Gols', sub: '4 times, cada um defende o seu gol', ic: 'gol', faz: () => {
    const m = mBase('Arena de Quatro Gols', { descricao: 'Quatro times, quatro gols: faça gol nos outros e defenda o seu. Até 5 pontos.', categoria: 'criativo',
      campo: { forma: 'octogono', w: 76, h: 76, canto: 16, borda: 'bola', margem: 6, margemY: 6 },
      aparencia: { piso: 'grama', textura: 'xadrez', escala: 8 },
      partida: { modo: 'quatro_gols', equipes: 4, porTime: 1, porMax: 2, meta: 5, saida: 'circulo', raioSaida: 9 },
      objetos: [mGol(-38, 0, 180, 14, 0), mGol(38, 0, 0, 14, 1), mGol(0, -38, 270, 14, 2), mGol(0, 38, 90, 14, 3),
        mSpawn(0, -24, 0), mSpawn(0, -24, 5, 1), mSpawn(1, 24, 0), mSpawn(1, 24, -5, 1), mSpawn(2, 0, -24), mSpawn(2, 5, -24, 1), mSpawn(3, 0, 24), mSpawn(3, -5, 24, 1)] });
    return m;
  } },
  { id: 'obstaculos', nome: 'Campo com Obstáculos', sub: 'Pilares e muretas no caminho', ic: 'retangulo', faz: () => mBase('Campo com Obstáculos', {
    descricao: 'O campo clássico com pilares e muretas: tabela neles para passar do marcador.', categoria: 'criativo',
    campo: { forma: 'retangulo', w: 86, h: 60, borda: 'bola', margem: 7.5, margemY: 5 },
    partida: { modo: 'futebol', equipes: 2, porTime: 2, meta: 3 },
    objetos: mDoisGols(86, 18).concat([mObst('circulo', -18, -12, 4, 4), mObst('circulo', -18, 12, 4, 4), mObst('circulo', 18, -12, 4, 4), mObst('circulo', 18, 12, 4, 4),
      mParede(0, -20, 14, 0, { esp: 1 }), mParede(0, 20, 14, 0, { esp: 1 }), mObst('triangulo', -32, 0, 5, 5, { rot: 90 }), mObst('triangulo', 32, 0, 5, 5, { rot: 270 })]) }) },
  { id: 'treino', nome: 'Campo de Treinamento', sub: 'Cones, alvos e o gol para treinar sozinho', ic: 'trofeu', faz: () => mBase('Campo de Treinamento', {
    descricao: 'Treine sozinho: conduza entre os cones, acerte os alvos (2 pontos) e faça gol.', categoria: 'treinamento',
    campo: { forma: 'retangulo', w: 80, h: 54, borda: 'bola', margem: 7.5, margemY: 5 },
    aparencia: { piso: 'grama_clara', textura: 'listras', escala: 4 },
    partida: { modo: 'treino', equipes: 1, porTime: 1, porMax: 2, meta: 0, tempo: 0, bots: false, saida: 'livre', reinicio: 'bola' },
    objetos: [mGol(40, 0, 0, 16, -1), mSpawn(0, -30, 0), { id: 'sb', tipo: 'spawnBola', x: -26, y: 0 }]
      .concat([-16, -8, 0, 8].map((x, i) => mObst('circulo', x, i % 2 ? 4 : -4, 1.6, 1.6, { cor: '#ff8a1c', nome: 'cone' })))
      .concat([mZona('pontos', 26, -20, 5, 5, { pontosZ: 2, equipe: 0, reinicia: false, cor: '#ffd23f', nome: 'alvo' }), mZona('pontos', 26, 20, 5, 5, { pontosZ: 2, equipe: 0, reinicia: false, cor: '#ffd23f', nome: 'alvo' })])
      .concat([mTexto('TREINO', -26, -20, 3.5, { cor: '#ffffff', opac: 0.6 })]) }) },
  { id: 'labirinto', nome: 'Labirinto de Bola', sub: 'Leve a bola pelo labirinto até a saída', ic: 'mapa', faz: () => {
    const W = 80, H = 56, o = [];
    const v = (x, y1, y2) => o.push(mParede(x, (y1 + y2) / 2, Math.abs(y2 - y1), 90, { esp: 1.2, cor: '#4a5a8a' }));
    const hz = (y, x1, x2) => o.push(mParede((x1 + x2) / 2, y, Math.abs(x2 - x1), 0, { esp: 1.2, cor: '#4a5a8a' }));
    v(-28, -28, 14); v(-14, -14, 28); v(0, -28, 14); v(14, -14, 28); v(28, -28, 10);
    hz(-14, -28, -18); hz(14, -10, 0); hz(0, 14, 24); hz(-2, -14, -4);
    o.push(mZona('pontos', 36, 20, 7, 10, { pontosZ: 1, equipe: 0, cor: '#3cff6a', nome: 'saída' }), { id: 'sb', tipo: 'spawnBola', x: -35, y: -22 }, mSpawn(0, -35, -16));
    o.push(mTexto('SAÍDA', 36, 13, 2.4, { cor: '#3cff6a' }));
    return mBase('Labirinto de Bola', { descricao: 'Leve a bola do canto até a SAÍDA sem perder tempo. Cada saída vale 1 ponto; a bola volta para o começo.', categoria: 'minigame',
      campo: { forma: 'retangulo', w: W, h: H, borda: 'todos', margem: 3, margemY: 3 }, aparencia: { piso: 'concreto', textura: 'grade', escala: 7, linhas: { on: true, cor: '#9fb3d9' }, fundo: 'noite', luz: 'noite' },
      fisica: { preset: 'precisao' }, partida: { modo: 'labirinto', equipes: 1, porTime: 1, porMax: 2, meta: 0, tempo: 3, bots: false, saida: 'livre', reinicio: 'bola' }, objetos: o });
  } },
  { id: 'neon', nome: 'Arena Neon', sub: 'Física arcade, para-choques e portais', ic: 'raio', faz: () => mBase('Arena Neon', {
    descricao: 'Luz neon, bola rápida, para-choques que devolvem a bola com força e dois portais ligados.', categoria: 'criativo',
    campo: { forma: 'arena', w: 80, h: 54, canto: 10, borda: 'bola', margem: 7, margemY: 5 },
    aparencia: { piso: 'neon', cor1: '#120a2e', cor2: '#1d0f46', textura: 'hexagonos', escala: 5, linhas: { cor: '#36f2ff', esp: 0.4 }, fundo: 'neon', corFundo: '#07051a', luz: 'neon' },
    fisica: { preset: 'arcade' }, partida: { modo: 'futebol', equipes: 2, porTime: 2, meta: 5 },
    objetos: mDoisGols(80, 16, { cor: '#ff3df2' }).concat([
      mObst('circulo', -14, -12, 4, 4, { quique: 1.15, cor: '#ff3df2', nome: 'para-choque' }), mObst('circulo', 14, 12, 4, 4, { quique: 1.15, cor: '#ff3df2', nome: 'para-choque' }),
      mObst('circulo', 14, -12, 4, 4, { quique: 1.15, cor: '#36f2ff', nome: 'para-choque' }), mObst('circulo', -14, 12, 4, 4, { quique: 1.15, cor: '#36f2ff', nome: 'para-choque' }),
      { id: 'pa', tipo: 'portal', x: 0, y: -21, raio: 2.4, par: 'pb', afeta: 'bola', cor: '#b197fc' }, { id: 'pb', tipo: 'portal', x: 0, y: 21, raio: 2.4, par: 'pa', afeta: 'bola', cor: '#ffb84d' }]) }) },
  { id: 'rua', nome: 'Futebol de Rua', sub: 'No asfalto, sem paredes: bola fora volta na lateral', ic: 'pino', faz: () => mBase('Futebol de Rua', {
    descricao: 'Pelada no asfalto: o campo é aberto (a bola sai e volta na lateral), gol de chinelo e 3 por time.', categoria: 'classico',
    campo: { forma: 'retangulo', w: 84, h: 46, borda: 'aberto', laterais: 'lateral', margem: 8, margemY: 7 },
    aparencia: { piso: 'asfalto', cor1: '#3d3f45', cor2: '#34363b', textura: 'ruido', escala: 4, linhas: { cor: '#f2d34a', esp: 0.3, areas: false, penalti: false }, fundo: 'rua', luz: 'tarde' },
    partida: { modo: 'futebol', equipes: 2, porTime: 3, meta: 5 },
    objetos: mDoisGols(84, 9, { rede: false, prof: 1.2, raioTrave: 0.5, nome: 'chinelo' }).concat([mDecor('icone', -30, -26, 3, 3, { icone: 'seta', cor: '#f2d34a' }), mTexto('RUA', 0, -26, 3, { cor: '#f2d34a', opac: 0.7 })]) }) },
  { id: 'favela', nome: 'Quadra de Favela', sub: 'Quadra fechada de concreto: tudo bate no muro', ic: 'portao', faz: () => mBase('Quadra de Favela', {
    descricao: 'A quadra da comunidade: chão de concreto, muro em volta (a tampinha também bate) e a galera grafitando.', categoria: 'classico',
    campo: { forma: 'retangulo', w: 64, h: 42, borda: 'todos', margem: 2.5, margemY: 2.5 },
    aparencia: { piso: 'concreto', cor1: '#8f8b80', cor2: '#86817a', textura: 'ruido', escala: 5, linhas: { cor: '#f5c542', esp: 0.4 }, fundo: 'rua', corFundo: '#3e3029', luz: 'tarde' },
    partida: { modo: 'futebol', equipes: 2, porTime: 2, meta: 3 },
    objetos: mDoisGols(64, 12, { prof: 4 }).concat([mTexto('RACHA', 0, -19.2, 2.6, { cor: '#d86a38', cor2: '#000000' }), mDecor('icone', -26, 18, 2.4, 2.4, { icone: 'coroa', cor: '#f5c542' }), mDecor('icone', 26, 18, 2.4, 2.4, { icone: 'chama', cor: '#ff5c3a' })]) }) },
  { id: 'tecnica', nome: 'Arena Técnica', sub: 'Física de precisão e gol estreito', ic: 'check', faz: () => mBase('Arena Técnica', {
    descricao: 'Para quem tem controle: a bola obedece (física Precisão), o gol é estreito e a área tem marcação de alvo.', categoria: 'competitivo',
    campo: { forma: 'retangulo', w: 76, h: 50, borda: 'bola', margem: 7.5, margemY: 5 },
    aparencia: { piso: 'sintetica', cor1: '#1f6f8b', cor2: '#1b6178', textura: 'grade', escala: 6, linhas: { cor: '#eaf6ff' }, fundo: 'gradiente', corFundo: '#0e2233', luz: 'dia' },
    fisica: { preset: 'precisao' }, partida: { modo: 'precisao', equipes: 2, porTime: 2, meta: 3 },
    objetos: mDoisGols(76, 11).concat([mMarca('circulo', -26, 0, 8, 8, { esp: 0.25, tracejada: true }), mMarca('circulo', 26, 0, 8, 8, { esp: 0.25, tracejada: true })]) }) },
  { id: 'assimetrico', nome: 'Campo Assimétrico', sub: 'Um campo torto: cada lado é de um jeito', ic: 'poligono', faz: () => mBase('Campo Assimétrico', {
    descricao: 'O campo não é igual dos dois lados: um lado é largo, o outro é estreito e tem um pilar. Escolha bem o lado.', categoria: 'criativo',
    campo: { forma: 'poligono', w: 90, h: 64, pontos: [[-45, -18], [-20, -32], [30, -26], [45, -8], [45, 14], [12, 32], [-36, 28], [-45, 10]], borda: 'bola', margem: 4, margemY: 4 },
    aparencia: { piso: 'grama', textura: 'ondas', escala: 6 },
    partida: { modo: 'futebol', equipes: 2, porTime: 2, meta: 3 },
    objetos: [mGol(-45, -4, 180, 14, 0), mGol(45, 3, 0, 14, 1), mObst('circulo', 22, 10, 5, 5), mParede(-12, 18, 12, 30, { esp: 1 })] }) },
  { id: 'vazio', nome: 'Mapa Vazio', sub: 'Só o chão: desenhe tudo do seu jeito', ic: 'adicionar', faz: () => mBase('Mapa Vazio', {
    descricao: '', categoria: 'outro', campo: { forma: 'livre', w: 90, h: 60, borda: 'aberto', margem: 6, margemY: 6 },
    partida: { modo: 'livre', equipes: 2, porTime: 2, meta: 0 }, objetos: [{ id: 'sb', tipo: 'spawnBola', x: 0, y: 0 }] }) },
];

// o mapa do zero: o tamanho e o formato escolhidos
function mapaDoZero(tam, formato, w, hh) {
  const T = TAMANHOS[tam] || TAMANHOS.pequeno;
  let W = tam === 'personalizado' ? clamp(+w || 71, RM.LIM.campoW[0], RM.LIM.campoW[1]) : T.w, H = tam === 'personalizado' ? clamp(+hh || 50, RM.LIM.campoH[0], RM.LIM.campoH[1]) : T.h;
  const larg = tam === 'personalizado' ? clamp(Math.round(H * 0.32 * 10) / 10, 4, 40) : T.gol, por = tam === 'personalizado' ? clamp(Math.round(W / 36), 1, 5) : T.por;
  const campo = { forma: 'retangulo', w: W, h: H, borda: 'bola', margem: T.mx, margemY: T.my };
  let objetos = mDoisGols(W, larg, { prof: W > 120 ? 7.5 : 6.6 });
  switch (formato) {
    case 'quadrado': campo.forma = 'quadrado'; W = H = Math.min(Math.max(W, H), RM.LIM.campoH[1]); campo.w = campo.h = W; objetos = mDoisGols(W, larg); break;
    case 'circulo': campo.forma = 'circulo'; W = H = Math.min(Math.max(W, H), RM.LIM.campoH[1]); campo.w = campo.h = W; campo.margem = campo.margemY = Math.max(4, T.my); objetos = mDoisGols(W, larg); break;
    case 'octogono': campo.forma = 'octogono'; campo.canto = Math.round(Math.min(W, H) * 0.22); break;
    case 'arena': campo.forma = 'arena'; campo.canto = Math.round(Math.min(W, H) * 0.18); break;
    case 'paredes': campo.borda = 'todos'; campo.margem = campo.margemY = 2.5; break;
    case 'aberto': campo.borda = 'aberto'; campo.laterais = 'lateral'; break;
    case 'assimetrico': campo.forma = 'poligono'; campo.pontos = [[-W / 2, -H * 0.3], [-W * 0.2, -H / 2], [W * 0.35, -H * 0.42], [W / 2, -H * 0.1], [W / 2, H * 0.22], [W * 0.15, H / 2], [-W * 0.4, H * 0.44], [-W / 2, H * 0.12]].map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]); objetos = [mGol(-W / 2, -H * 0.08, 180, larg, 0), mGol(W / 2, H * 0.05, 0, larg, 1)]; break;
    case 'livre': campo.forma = 'livre'; campo.borda = 'aberto'; objetos = [{ id: 'sb', tipo: 'spawnBola', x: 0, y: 0 }]; break;
  }
  return mBase('Mapa novo', { campo, partida: { modo: formato === 'livre' ? 'livre' : por === 1 ? 'x1' : 'futebol', equipes: 2, porTime: por, meta: 3, raioSaida: clamp(Math.round(H / 5), 6, 14) }, objetos, categoria: 'outro' });
}
function limpaModelo(cru, nome) {
  const r = RM.limpa(cru);
  if (!r.ok) { console.error('Oficina: um modelo não passou na validação', nome, r.erros); return RM.mapaVazio({ nome: nome || 'Mapa novo' }); }
  return r.mapa;
}
