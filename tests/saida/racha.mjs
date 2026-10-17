// app/contracts/racha.ts
var FAIXAS_TITULO = [
  { min: 1, max: 4, titulo: "Novato da Rua" },
  { min: 5, max: 9, titulo: "Peladeiro" },
  { min: 10, max: 19, titulo: "Talento da Quadra" },
  { min: 20, max: 29, titulo: "Bom de Bola" },
  { min: 30, max: 39, titulo: "Artilheiro da Rua" },
  { min: 40, max: 49, titulo: "Craque da Quebrada" },
  { min: 50, max: 59, titulo: "Dono da Quadra" },
  { min: 60, max: 69, titulo: "Rei da Laje" },
  { min: 70, max: 79, titulo: "Lenda do Bairro" },
  { min: 80, max: 89, titulo: "\xCDdolo do RACHA" },
  { min: 90, max: 99, titulo: "Imortal da Quebrada" },
  { min: 100, max: 100, titulo: "Lenda Suprema do RACHA" }
];
var NIVEL_MAX = 100;
function xpTotalParaNivel(nivel) {
  const n = Math.max(1, Math.min(NIVEL_MAX, Math.floor(nivel)));
  return 50 * n * (n - 1);
}
function nivelPorXp(xp) {
  let nivel = 1;
  const alvo = Math.max(0, Math.floor(xp));
  while (nivel < NIVEL_MAX && xpTotalParaNivel(nivel + 1) <= alvo) nivel++;
  return nivel;
}
function tituloPorNivel(nivel) {
  const f = FAIXAS_TITULO.find((q) => nivel >= q.min && nivel <= q.max);
  return f ? f.titulo : FAIXAS_TITULO[0].titulo;
}
function progressoNivel(xp) {
  const nivel = nivelPorXp(xp);
  const base = xpTotalParaNivel(nivel);
  const prox = nivel >= NIVEL_MAX ? base : xpTotalParaNivel(nivel + 1);
  const atual = Math.max(0, xp - base);
  const necessario = Math.max(1, prox - base);
  return { nivel, atual, necessario, pct: Math.min(1, atual / necessario) };
}
var XP = {
  PARTICIPACAO: 20,
  // completar partida válida
  VITORIA: 40,
  EMPATE: 15,
  GOL: 10,
  ASSISTENCIA: 8,
  GOL_GINGA: 4,
  // bônus por gol de ginga
  MAX_POR_PARTIDA: 250,
  // teto anti-exploração por partida
  MAX_DIARIO_PARTIDAS: 3e3,
  // teto diário de XP vindo de partidas
  TREINO_GOL: 2,
  // gol em treino livre/exercícios
  TREINO_MAX_DIARIO: 10,
  // gols de treino que rendem XP por dia (espelha o jogo)
  PARTIDA_MIN_SEG: 20,
  // duração mínima plausível
  PARTIDA_MAX_SEG: 3600,
  // duração máxima plausível
  PLACAR_MAX: 99
  // teto de gols por lado
};
var CATALOGO_ITENS = [
  // ---- Skins de tampinha ----
  { codigo: "skin_padrao", nome: "Tampinha da Rua", categoria: "skin", raridade: "comum", origem: "inicial", visual: { emoji: "\u26BD", cores: ["#2f5bd6", "#7f9cff"] }, descricao: "A tampinha cl\xE1ssica de todo mundo." },
  { codigo: "skin_artilheiro", nome: "Artilheiro", categoria: "skin", raridade: "epico", origem: "nivel", visual: { emoji: "\u{1F3AF}", cores: ["#e03131", "#ff922b"] }, descricao: "N\xEDvel 30. Quem v\xEA, j\xE1 sabe: perigo na \xE1rea." },
  { codigo: "skin_lenda_suprema", nome: "Lenda Suprema", categoria: "skin", raridade: "exclusivo", origem: "nivel", visual: { emoji: "\u{1F451}", cores: ["#ffd23f", "#f59a0c"], extra: "#fff3bf" }, descricao: "N\xEDvel 100. A tampinha das lendas." },
  { codigo: "skin_aniversario", nome: "Anivers\xE1rio do RACHA", categoria: "skin", raridade: "lendario", origem: "evento", visual: { emoji: "\u{1F382}", cores: ["#b197fc", "#ffd23f"] }, descricao: "Distribu\xEDda em comemora\xE7\xF5es especiais." },
  { codigo: "skin_parceiro", nome: "Parceiro RACHA", categoria: "skin", raridade: "exclusivo", origem: "admin", visual: { emoji: "\u{1F91D}", cores: ["#3bc9db", "#0b7285"] } },
  { codigo: "skin_fundador", nome: "Fundador", categoria: "skin", raridade: "exclusivo", origem: "admin", visual: { emoji: "\u{1F3D7}\uFE0F", cores: ["#ffd23f", "#7048e8"] }, descricao: "Para quem estava l\xE1 desde o primeiro tijolo." },
  // ---- Banners ----
  { codigo: "banner_laje_noturna", nome: "Laje Noturna", categoria: "banner", raridade: "comum", origem: "inicial", visual: { emoji: "\u{1F303}", cores: ["#1a2744", "#3b5bdb"] } },
  { codigo: "banner_favela_colorida", nome: "Favela Colorida", categoria: "banner", raridade: "raro", origem: "evento", visual: { emoji: "\u{1F3D8}\uFE0F", cores: ["#f783ac", "#ffd23f"] } },
  { codigo: "banner_escadao_neon", nome: "Escad\xE3o Neon", categoria: "banner", raridade: "raro", origem: "evento", visual: { emoji: "\u{1F6DD}", cores: ["#7048e8", "#3bc9db"] } },
  { codigo: "banner_viaduto", nome: "Viaduto Underground", categoria: "banner", raridade: "raro", origem: "evento", visual: { emoji: "\u{1F309}", cores: ["#343a40", "#69db7c"] } },
  { codigo: "banner_rei_quadra", nome: "Rei da Quadra", categoria: "banner", raridade: "epico", origem: "evento", visual: { emoji: "\u{1F945}", cores: ["#f59a0c", "#e03131"] } },
  { codigo: "banner_craque_quebrada", nome: "Craque da Quebrada", categoria: "banner", raridade: "epico", origem: "evento", visual: { emoji: "\u2B50", cores: ["#7048e8", "#ffd23f"] } },
  { codigo: "banner_lenda", nome: "Lenda do RACHA", categoria: "banner", raridade: "lendario", origem: "evento", visual: { emoji: "\u{1F410}", cores: ["#0b7285", "#ffd23f"] } },
  { codigo: "banner_campeao_evento", nome: "Campe\xE3o de Evento", categoria: "banner", raridade: "lendario", origem: "evento", visual: { emoji: "\u{1F3C6}", cores: ["#ffd23f", "#e03131"] } },
  { codigo: "banner_parceiro", nome: "Parceiro RACHA", categoria: "banner", raridade: "exclusivo", origem: "admin", visual: { emoji: "\u{1F4E3}", cores: ["#3bc9db", "#7048e8"] } },
  { codigo: "banner_fundador", nome: "Fundador", categoria: "banner", raridade: "exclusivo", origem: "admin", visual: { emoji: "\u{1F9F1}", cores: ["#f59a0c", "#1a2744"] } },
  { codigo: "banner_talento_quadra", nome: "Talento da Quadra", categoria: "banner", raridade: "raro", origem: "nivel", visual: { emoji: "\u2728", cores: ["#3b5bdb", "#3bc9db"] }, descricao: "N\xEDvel 10." },
  { codigo: "banner_rei_laje", nome: "Rei da Laje", categoria: "banner", raridade: "epico", origem: "nivel", visual: { emoji: "\u{1F3E0}", cores: ["#e8590c", "#ffd23f"] }, descricao: "N\xEDvel 60." },
  // ---- Molduras ----
  { codigo: "moldura_bronze", nome: "Bronze", categoria: "moldura", raridade: "comum", origem: "nivel", visual: { emoji: "\u{1F949}", cores: ["#ad5611", "#e8965a"] } },
  { codigo: "moldura_prata", nome: "Prata", categoria: "moldura", raridade: "raro", origem: "nivel", visual: { emoji: "\u{1F948}", cores: ["#868e96", "#dee2e6"] } },
  { codigo: "moldura_ouro", nome: "Ouro", categoria: "moldura", raridade: "epico", origem: "nivel", visual: { emoji: "\u{1F947}", cores: ["#f59a0c", "#ffd23f"] } },
  { codigo: "moldura_neon", nome: "Neon", categoria: "moldura", raridade: "epico", origem: "evento", visual: { emoji: "\u{1F4A1}", cores: ["#3bc9db", "#b197fc"], extra: "#66fcf1" } },
  { codigo: "moldura_grafite", nome: "Grafite", categoria: "moldura", raridade: "raro", origem: "evento", visual: { emoji: "\u{1F3A8}", cores: ["#495057", "#f783ac"] } },
  { codigo: "moldura_lendaria", nome: "Lend\xE1ria", categoria: "moldura", raridade: "lendario", origem: "nivel", visual: { emoji: "\u{1F525}", cores: ["#e03131", "#ffd23f"] } },
  { codigo: "moldura_fundador", nome: "Fundador", categoria: "moldura", raridade: "exclusivo", origem: "admin", visual: { emoji: "\u{1F4A0}", cores: ["#7048e8", "#ffd23f"] } },
  { codigo: "moldura_dono_quadra", nome: "Dono da Quadra", categoria: "moldura", raridade: "epico", origem: "nivel", visual: { emoji: "\u{1F451}", cores: ["#3b5bdb", "#ffd23f"] }, descricao: "N\xEDvel 50." },
  // ---- Títulos especiais equipáveis (os de carreira entram por faixa) ----
  { codigo: "titulo_craque_quebrada", nome: "Craque da Quebrada", categoria: "titulo", raridade: "epico", origem: "nivel", visual: { emoji: "\u26A1", cores: ["#7048e8", "#ffd23f"] }, descricao: "N\xEDvel 40. O t\xEDtulo que todo mundo quer." },
  { codigo: "titulo_campeao_evento", nome: "Campe\xE3o de Evento", categoria: "titulo", raridade: "lendario", origem: "evento", visual: { emoji: "\u{1F3C6}", cores: ["#ffd23f", "#e03131"] } },
  { codigo: "titulo_parceiro", nome: "Parceiro RACHA", categoria: "titulo", raridade: "exclusivo", origem: "admin", visual: { emoji: "\u{1F3AC}", cores: ["#3bc9db", "#7048e8"] } },
  { codigo: "titulo_fundador", nome: "Fundador", categoria: "titulo", raridade: "exclusivo", origem: "admin", visual: { emoji: "\u{1F9F1}", cores: ["#f59a0c", "#1a2744"] } },
  // ---- Emblemas de marco de nível ----
  { codigo: "emblema_bom_de_bola", nome: "Bom de Bola", categoria: "emblema", raridade: "raro", origem: "nivel", visual: { emoji: "\u26BD", cores: ["#2f9e44", "#8ce99a"] }, descricao: "N\xEDvel 20." },
  // ---- Efeitos cosméticos ----
  { codigo: "efeito_idolo", nome: "Brilho do \xCDdolo", categoria: "efeito", raridade: "lendario", origem: "nivel", visual: { emoji: "\u2728", cores: ["#ffd23f", "#fff3bf"], extra: "#ffe066" }, descricao: "N\xEDvel 80. Um brilho dourado no cart\xE3o." }
];
var RECOMPENSAS_MARCO = [
  { nivel: 10, item: "banner_talento_quadra" },
  { nivel: 20, item: "emblema_bom_de_bola" },
  { nivel: 30, item: "skin_artilheiro" },
  { nivel: 40, item: "titulo_craque_quebrada" },
  { nivel: 50, item: "moldura_dono_quadra" },
  { nivel: 60, item: "banner_rei_laje" },
  { nivel: 80, item: "efeito_idolo" },
  { nivel: 100, item: "skin_lenda_suprema" }
];
var MOLDURAS_NIVEL = [
  { nivel: 5, item: "moldura_bronze" },
  { nivel: 15, item: "moldura_prata" },
  { nivel: 30, item: "moldura_ouro" },
  { nivel: 70, item: "moldura_lendaria" }
];
function itemPorCodigo(codigo) {
  return CATALOGO_ITENS.find((i) => i.codigo === codigo);
}
var CATALOGO_CONQUISTAS = [
  { codigo: "primeiro_racha", nome: "Primeiro Racha", descricao: "Jogar a primeira partida v\xE1lida.", emoji: "\u{1F3AE}", metrica: "partidas", marco: 1 },
  { codigo: "primeiro_golaco", nome: "Primeiro Gola\xE7o", descricao: "Marcar o primeiro gol.", emoji: "\u26BD", metrica: "gols", marco: 1 },
  { codigo: "artilheiro_100", nome: "Artilheiro da Quebrada", descricao: "Alcan\xE7ar 100 gols.", emoji: "\u{1F945}", metrica: "gols", marco: 100 },
  { codigo: "maquina_500", nome: "M\xE1quina de Gols", descricao: "Alcan\xE7ar 500 gols.", emoji: "\u{1F916}", metrica: "gols", marco: 500 },
  { codigo: "mil_gols", nome: "Mil Gols na Rua", descricao: "Alcan\xE7ar 1.000 gols.", emoji: "\u{1F4AF}", metrica: "gols", marco: 1e3 },
  { codigo: "rei_tabela", nome: "Rei da Tabela", descricao: "Alcan\xE7ar 100 assist\xEAncias.", emoji: "\u{1F45F}", metrica: "assistencias", marco: 100 },
  { codigo: "ginga_brasileira", nome: "Ginga Brasileira", descricao: "Marcar 25 gols de ginga.", emoji: "\u{1F1E7}\u{1F1F7}", metrica: "golsGinga", marco: 25 },
  { codigo: "invicto", nome: "Invicto", descricao: "Conseguir uma sequ\xEAncia de 5 vit\xF3rias.", emoji: "\u{1F6E1}\uFE0F", metrica: "melhorSequencia", marco: 5 },
  { codigo: "veterano", nome: "Veterano da Quadra", descricao: "Jogar 100 partidas v\xE1lidas.", emoji: "\u{1F396}\uFE0F", metrica: "partidas", marco: 100 },
  { codigo: "lenda_racha", nome: "Lenda do RACHA", descricao: "Alcan\xE7ar o n\xEDvel 100.", emoji: "\u{1F451}", metrica: "nivel", marco: 100 }
];
var SELOS = ["verificado", "criador", "parceiro", "equipe"];
var SELO_INFO = {
  verificado: { nome: "Verificado RACHA", cor: "#2f9e44", emoji: "\u2714\uFE0F" },
  criador: { nome: "Criador do RACHA", cor: "#ffd23f", emoji: "\u{1F451}" },
  parceiro: { nome: "Parceiro RACHA", cor: "#3bc9db", emoji: "\u{1F91D}" },
  equipe: { nome: "Equipe RACHA", cor: "#b197fc", emoji: "\u{1F6E1}\uFE0F" }
};
var CARGOS = ["dono", "administrador", "moderador", "ajudante"];
var CARGO_PESO = { dono: 100, administrador: 70, moderador: 40, ajudante: 10 };
var PERMISSOES = [
  "gerenciar_equipe",
  "definir_permissoes",
  "gerenciar_selos",
  "enviar_itens",
  "gerenciar_eventos",
  "consultar_jogadores",
  "analisar_denuncias",
  "aplicar_punicoes",
  "consultar_registros",
  "distribuir_global",
  "advertir",
  "suspender",
  "ver_denuncias_atribuidas"
];
var PERMISSOES_PADRAO = {
  dono: [...PERMISSOES],
  administrador: [
    "gerenciar_eventos",
    "analisar_denuncias",
    "aplicar_punicoes",
    "enviar_itens",
    "consultar_jogadores",
    "consultar_registros",
    "advertir",
    "suspender"
  ],
  moderador: [
    "consultar_jogadores",
    "analisar_denuncias",
    "advertir",
    "suspender",
    "consultar_registros"
  ],
  ajudante: ["ver_denuncias_atribuidas", "analisar_denuncias"]
};
function formatarIdPublico(id) {
  return String(id).padStart(6, "0");
}
var SUSPENSAO_MAX_HORAS = {
  dono: 24 * 365,
  administrador: 24 * 90,
  moderador: 24 * 7,
  ajudante: 0
};
export {
  CARGOS,
  CARGO_PESO,
  CATALOGO_CONQUISTAS,
  CATALOGO_ITENS,
  FAIXAS_TITULO,
  MOLDURAS_NIVEL,
  NIVEL_MAX,
  PERMISSOES,
  PERMISSOES_PADRAO,
  RECOMPENSAS_MARCO,
  SELOS,
  SELO_INFO,
  SUSPENSAO_MAX_HORAS,
  XP,
  formatarIdPublico,
  itemPorCodigo,
  nivelPorXp,
  progressoNivel,
  tituloPorNivel,
  xpTotalParaNivel
};
