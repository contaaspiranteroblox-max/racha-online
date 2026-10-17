// ============================================================================
// RACHA 2.0 — Constantes compartilhadas (frontend ↔ backend)
// Níveis, XP, catálogo de itens cosméticos, conquistas, cargos e permissões.
// Os intervalos de títulos e as recompensas de marco são CONFIGURÁVEIS aqui.
// ============================================================================

// ---------- 5. NÍVEIS DE CARREIRA ----------
export type FaixaTitulo = { min: number; max: number; titulo: string };

// Tabela inicial de títulos (configurável — proposta do design)
export const FAIXAS_TITULO: FaixaTitulo[] = [
  { min: 1, max: 4, titulo: "Novato da Rua" },
  { min: 5, max: 9, titulo: "Peladeiro" },
  { min: 10, max: 19, titulo: "Talento da Quadra" },
  { min: 20, max: 29, titulo: "Bom de Bola" },
  { min: 30, max: 39, titulo: "Artilheiro da Rua" },
  { min: 40, max: 49, titulo: "Craque da Quebrada" },
  { min: 50, max: 59, titulo: "Dono da Quadra" },
  { min: 60, max: 69, titulo: "Rei da Laje" },
  { min: 70, max: 79, titulo: "Lenda do Bairro" },
  { min: 80, max: 89, titulo: "Ídolo do RACHA" },
  { min: 90, max: 99, titulo: "Imortal da Quebrada" },
  { min: 100, max: 100, titulo: "Lenda Suprema do RACHA" },
];

export const NIVEL_MAX = 100;

// XP total acumulado necessário para ESTAR no nível `nivel` (nível 1 = 0).
// Curva: 50 * n * (n-1) → L2: 100 · L10: 4.500 · L50: 122.500 · L100: 495.000
export function xpTotalParaNivel(nivel: number): number {
  const n = Math.max(1, Math.min(NIVEL_MAX, Math.floor(nivel)));
  return 50 * n * (n - 1);
}

// Nível correspondente a um total de XP (1..100)
export function nivelPorXp(xp: number): number {
  let nivel = 1;
  const alvo = Math.max(0, Math.floor(xp));
  while (nivel < NIVEL_MAX && xpTotalParaNivel(nivel + 1) <= alvo) nivel++;
  return nivel;
}

export function tituloPorNivel(nivel: number): string {
  const f = FAIXAS_TITULO.find((q) => nivel >= q.min && nivel <= q.max);
  return f ? f.titulo : FAIXAS_TITULO[0].titulo;
}

// Progresso dentro do nível atual: { atual, necessario, pct }
export function progressoNivel(xp: number) {
  const nivel = nivelPorXp(xp);
  const base = xpTotalParaNivel(nivel);
  const prox = nivel >= NIVEL_MAX ? base : xpTotalParaNivel(nivel + 1);
  const atual = Math.max(0, xp - base);
  const necessario = Math.max(1, prox - base);
  return { nivel, atual, necessario, pct: Math.min(1, atual / necessario) };
}

// ---------- 5.1. REGRAS DE XP (servidor) ----------
export const XP = {
  PARTICIPACAO: 20, // completar partida válida
  VITORIA: 40,
  EMPATE: 15,
  GOL: 10,
  ASSISTENCIA: 8,
  GOL_GINGA: 4, // bônus por gol de ginga
  MAX_POR_PARTIDA: 250, // teto anti-exploração por partida
  MAX_DIARIO_PARTIDAS: 3000, // teto diário de XP vindo de partidas
  TREINO_GOL: 2, // gol em treino livre/exercícios
  TREINO_MAX_DIARIO: 10, // gols de treino que rendem XP por dia (espelha o jogo)
  PARTIDA_MIN_SEG: 20, // duração mínima plausível
  PARTIDA_MAX_SEG: 3600, // duração máxima plausível
  PLACAR_MAX: 99, // teto de gols por lado
} as const;

// ---------- 8/13. CATÁLOGO DE ITENS COSMÉTICOS ----------
export type CategoriaItem =
  | "skin"
  | "banner"
  | "moldura"
  | "titulo"
  | "emblema"
  | "efeito";
export type Raridade = "comum" | "raro" | "epico" | "lendario" | "exclusivo";
export type OrigemItem = "nivel" | "conquista" | "evento" | "admin" | "inicial";

export type VisualItem = {
  emoji: string; // representação visual leve
  cores: [string, string]; // gradiente principal
  extra?: string; // cor de brilho/acento
};

export type ItemCatalogo = {
  codigo: string;
  nome: string;
  categoria: CategoriaItem;
  raridade: Raridade;
  origem: OrigemItem;
  visual: VisualItem;
  descricao?: string;
};

export const CATALOGO_ITENS: ItemCatalogo[] = [
  // ---- Skins de tampinha ----
  { codigo: "skin_padrao", nome: "Tampinha da Rua", categoria: "skin", raridade: "comum", origem: "inicial", visual: { emoji: "⚽", cores: ["#2f5bd6", "#7f9cff"] }, descricao: "A tampinha clássica de todo mundo." },
  { codigo: "skin_artilheiro", nome: "Artilheiro", categoria: "skin", raridade: "epico", origem: "nivel", visual: { emoji: "🎯", cores: ["#e03131", "#ff922b"] }, descricao: "Nível 30. Quem vê, já sabe: perigo na área." },
  { codigo: "skin_lenda_suprema", nome: "Lenda Suprema", categoria: "skin", raridade: "exclusivo", origem: "nivel", visual: { emoji: "👑", cores: ["#ffd23f", "#f59a0c"], extra: "#fff3bf" }, descricao: "Nível 100. A tampinha das lendas." },
  { codigo: "skin_aniversario", nome: "Aniversário do RACHA", categoria: "skin", raridade: "lendario", origem: "evento", visual: { emoji: "🎂", cores: ["#b197fc", "#ffd23f"] }, descricao: "Distribuída em comemorações especiais." },
  { codigo: "skin_parceiro", nome: "Parceiro RACHA", categoria: "skin", raridade: "exclusivo", origem: "admin", visual: { emoji: "🤝", cores: ["#3bc9db", "#0b7285"] } },
  { codigo: "skin_fundador", nome: "Fundador", categoria: "skin", raridade: "exclusivo", origem: "admin", visual: { emoji: "🏗️", cores: ["#ffd23f", "#7048e8"] }, descricao: "Para quem estava lá desde o primeiro tijolo." },

  // ---- Banners ----
  { codigo: "banner_laje_noturna", nome: "Laje Noturna", categoria: "banner", raridade: "comum", origem: "inicial", visual: { emoji: "🌃", cores: ["#1a2744", "#3b5bdb"] } },
  { codigo: "banner_favela_colorida", nome: "Favela Colorida", categoria: "banner", raridade: "raro", origem: "evento", visual: { emoji: "🏘️", cores: ["#f783ac", "#ffd23f"] } },
  { codigo: "banner_escadao_neon", nome: "Escadão Neon", categoria: "banner", raridade: "raro", origem: "evento", visual: { emoji: "🛝", cores: ["#7048e8", "#3bc9db"] } },
  { codigo: "banner_viaduto", nome: "Viaduto Underground", categoria: "banner", raridade: "raro", origem: "evento", visual: { emoji: "🌉", cores: ["#343a40", "#69db7c"] } },
  { codigo: "banner_rei_quadra", nome: "Rei da Quadra", categoria: "banner", raridade: "epico", origem: "evento", visual: { emoji: "🥅", cores: ["#f59a0c", "#e03131"] } },
  { codigo: "banner_craque_quebrada", nome: "Craque da Quebrada", categoria: "banner", raridade: "epico", origem: "evento", visual: { emoji: "⭐", cores: ["#7048e8", "#ffd23f"] } },
  { codigo: "banner_lenda", nome: "Lenda do RACHA", categoria: "banner", raridade: "lendario", origem: "evento", visual: { emoji: "🐐", cores: ["#0b7285", "#ffd23f"] } },
  { codigo: "banner_campeao_evento", nome: "Campeão de Evento", categoria: "banner", raridade: "lendario", origem: "evento", visual: { emoji: "🏆", cores: ["#ffd23f", "#e03131"] } },
  { codigo: "banner_parceiro", nome: "Parceiro RACHA", categoria: "banner", raridade: "exclusivo", origem: "admin", visual: { emoji: "📣", cores: ["#3bc9db", "#7048e8"] } },
  { codigo: "banner_fundador", nome: "Fundador", categoria: "banner", raridade: "exclusivo", origem: "admin", visual: { emoji: "🧱", cores: ["#f59a0c", "#1a2744"] } },
  { codigo: "banner_talento_quadra", nome: "Talento da Quadra", categoria: "banner", raridade: "raro", origem: "nivel", visual: { emoji: "✨", cores: ["#3b5bdb", "#3bc9db"] }, descricao: "Nível 10." },
  { codigo: "banner_rei_laje", nome: "Rei da Laje", categoria: "banner", raridade: "epico", origem: "nivel", visual: { emoji: "🏠", cores: ["#e8590c", "#ffd23f"] }, descricao: "Nível 60." },

  // ---- Molduras ----
  { codigo: "moldura_bronze", nome: "Bronze", categoria: "moldura", raridade: "comum", origem: "nivel", visual: { emoji: "🥉", cores: ["#ad5611", "#e8965a"] } },
  { codigo: "moldura_prata", nome: "Prata", categoria: "moldura", raridade: "raro", origem: "nivel", visual: { emoji: "🥈", cores: ["#868e96", "#dee2e6"] } },
  { codigo: "moldura_ouro", nome: "Ouro", categoria: "moldura", raridade: "epico", origem: "nivel", visual: { emoji: "🥇", cores: ["#f59a0c", "#ffd23f"] } },
  { codigo: "moldura_neon", nome: "Neon", categoria: "moldura", raridade: "epico", origem: "evento", visual: { emoji: "💡", cores: ["#3bc9db", "#b197fc"], extra: "#66fcf1" } },
  { codigo: "moldura_grafite", nome: "Grafite", categoria: "moldura", raridade: "raro", origem: "evento", visual: { emoji: "🎨", cores: ["#495057", "#f783ac"] } },
  { codigo: "moldura_lendaria", nome: "Lendária", categoria: "moldura", raridade: "lendario", origem: "nivel", visual: { emoji: "🔥", cores: ["#e03131", "#ffd23f"] } },
  { codigo: "moldura_fundador", nome: "Fundador", categoria: "moldura", raridade: "exclusivo", origem: "admin", visual: { emoji: "💠", cores: ["#7048e8", "#ffd23f"] } },
  { codigo: "moldura_dono_quadra", nome: "Dono da Quadra", categoria: "moldura", raridade: "epico", origem: "nivel", visual: { emoji: "👑", cores: ["#3b5bdb", "#ffd23f"] }, descricao: "Nível 50." },

  // ---- Títulos especiais equipáveis (os de carreira entram por faixa) ----
  { codigo: "titulo_craque_quebrada", nome: "Craque da Quebrada", categoria: "titulo", raridade: "epico", origem: "nivel", visual: { emoji: "⚡", cores: ["#7048e8", "#ffd23f"] }, descricao: "Nível 40. O título que todo mundo quer." },
  { codigo: "titulo_campeao_evento", nome: "Campeão de Evento", categoria: "titulo", raridade: "lendario", origem: "evento", visual: { emoji: "🏆", cores: ["#ffd23f", "#e03131"] } },
  { codigo: "titulo_parceiro", nome: "Parceiro RACHA", categoria: "titulo", raridade: "exclusivo", origem: "admin", visual: { emoji: "🎬", cores: ["#3bc9db", "#7048e8"] } },
  { codigo: "titulo_fundador", nome: "Fundador", categoria: "titulo", raridade: "exclusivo", origem: "admin", visual: { emoji: "🧱", cores: ["#f59a0c", "#1a2744"] } },

  // ---- Emblemas de marco de nível ----
  { codigo: "emblema_bom_de_bola", nome: "Bom de Bola", categoria: "emblema", raridade: "raro", origem: "nivel", visual: { emoji: "⚽", cores: ["#2f9e44", "#8ce99a"] }, descricao: "Nível 20." },

  // ---- Efeitos cosméticos ----
  { codigo: "efeito_idolo", nome: "Brilho do Ídolo", categoria: "efeito", raridade: "lendario", origem: "nivel", visual: { emoji: "✨", cores: ["#ffd23f", "#fff3bf"], extra: "#ffe066" }, descricao: "Nível 80. Um brilho dourado no cartão." },
];

// 5.2. Recompensas por marco de nível (configurável)
export const RECOMPENSAS_MARCO: { nivel: number; item: string }[] = [
  { nivel: 10, item: "banner_talento_quadra" },
  { nivel: 20, item: "emblema_bom_de_bola" },
  { nivel: 30, item: "skin_artilheiro" },
  { nivel: 40, item: "titulo_craque_quebrada" },
  { nivel: 50, item: "moldura_dono_quadra" },
  { nivel: 60, item: "banner_rei_laje" },
  { nivel: 80, item: "efeito_idolo" },
  { nivel: 100, item: "skin_lenda_suprema" },
];

// Molduras automáticas por nível (progressão contínua)
export const MOLDURAS_NIVEL: { nivel: number; item: string }[] = [
  { nivel: 5, item: "moldura_bronze" },
  { nivel: 15, item: "moldura_prata" },
  { nivel: 30, item: "moldura_ouro" },
  { nivel: 70, item: "moldura_lendaria" },
];

export function itemPorCodigo(codigo: string): ItemCatalogo | undefined {
  return CATALOGO_ITENS.find((i) => i.codigo === codigo);
}

// ---------- 7. CONQUISTAS ----------
export type MetricaConquista =
  | "partidas"
  | "gols"
  | "assistencias"
  | "golsGinga"
  | "melhorSequencia"
  | "nivel";

export type ConquistaCatalogo = {
  codigo: string;
  nome: string;
  descricao: string;
  emoji: string;
  metrica: MetricaConquista;
  marco: number;
};

export const CATALOGO_CONQUISTAS: ConquistaCatalogo[] = [
  { codigo: "primeiro_racha", nome: "Primeiro Racha", descricao: "Jogar a primeira partida válida.", emoji: "🎮", metrica: "partidas", marco: 1 },
  { codigo: "primeiro_golaco", nome: "Primeiro Golaço", descricao: "Marcar o primeiro gol.", emoji: "⚽", metrica: "gols", marco: 1 },
  { codigo: "artilheiro_100", nome: "Artilheiro da Quebrada", descricao: "Alcançar 100 gols.", emoji: "🥅", metrica: "gols", marco: 100 },
  { codigo: "maquina_500", nome: "Máquina de Gols", descricao: "Alcançar 500 gols.", emoji: "🤖", metrica: "gols", marco: 500 },
  { codigo: "mil_gols", nome: "Mil Gols na Rua", descricao: "Alcançar 1.000 gols.", emoji: "💯", metrica: "gols", marco: 1000 },
  { codigo: "rei_tabela", nome: "Rei da Tabela", descricao: "Alcançar 100 assistências.", emoji: "👟", metrica: "assistencias", marco: 100 },
  { codigo: "ginga_brasileira", nome: "Ginga Brasileira", descricao: "Marcar 25 gols de ginga.", emoji: "🇧🇷", metrica: "golsGinga", marco: 25 },
  { codigo: "invicto", nome: "Invicto", descricao: "Conseguir uma sequência de 5 vitórias.", emoji: "🛡️", metrica: "melhorSequencia", marco: 5 },
  { codigo: "veterano", nome: "Veterano da Quadra", descricao: "Jogar 100 partidas válidas.", emoji: "🎖️", metrica: "partidas", marco: 100 },
  { codigo: "lenda_racha", nome: "Lenda do RACHA", descricao: "Alcançar o nível 100.", emoji: "👑", metrica: "nivel", marco: 100 },
];

// ---------- 9. SELOS OFICIAIS ----------
export const SELOS = ["verificado", "criador", "parceiro", "equipe"] as const;
export type Selo = (typeof SELOS)[number];
export const SELO_INFO: Record<Selo, { nome: string; cor: string; emoji: string }> = {
  verificado: { nome: "Verificado RACHA", cor: "#2f9e44", emoji: "✔️" },
  criador: { nome: "Criador do RACHA", cor: "#ffd23f", emoji: "👑" },
  parceiro: { nome: "Parceiro RACHA", cor: "#3bc9db", emoji: "🤝" },
  equipe: { nome: "Equipe RACHA", cor: "#b197fc", emoji: "🛡️" },
};

// ---------- 10. CARGOS E PERMISSÕES ----------
export const CARGOS = ["dono", "administrador", "moderador", "ajudante"] as const;
export type Cargo = (typeof CARGOS)[number];
export const CARGO_PESO: Record<Cargo, number> = { dono: 100, administrador: 70, moderador: 40, ajudante: 10 };

export const PERMISSOES = [
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
  "ver_denuncias_atribuidas",
] as const;
export type Permissao = (typeof PERMISSOES)[number];

// Permissões padrão por cargo (o Dono pode ajustar administrador/moderador dentro dos limites)
export const PERMISSOES_PADRAO: Record<Cargo, Permissao[]> = {
  dono: [...PERMISSOES],
  administrador: [
    "gerenciar_eventos",
    "analisar_denuncias",
    "aplicar_punicoes",
    "enviar_itens",
    "consultar_jogadores",
    "consultar_registros",
    "advertir",
    "suspender",
  ],
  moderador: [
    "consultar_jogadores",
    "analisar_denuncias",
    "advertir",
    "suspender",
    "consultar_registros",
  ],
  ajudante: ["ver_denuncias_atribuidas", "analisar_denuncias"],
};

// ---------- Formatação do ID público ----------
export function formatarIdPublico(id: number): string {
  return String(id).padStart(6, "0");
}

// Durações de suspensão permitidas por cargo (horas) — moderador é limitado
export const SUSPENSAO_MAX_HORAS: Record<Cargo, number> = {
  dono: 24 * 365,
  administrador: 24 * 90,
  moderador: 24 * 7,
  ajudante: 0,
};
