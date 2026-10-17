// ============================================================================
// RACHA v84 — Catálogo da loja e regras de recompensa (fonte única do servidor)
// ----------------------------------------------------------------------------
// Os preços aqui espelham os do jogo (app/public/game/racha.html, SKINS com
// loja:true). O servidor valida TODA compra contra ESTA tabela — o cliente
// nunca informa preço. O teste tests/v84_loja_test.mjs compara este arquivo
// com o racha.html para garantir que os dois lados não divergem.
// ============================================================================

export interface ItemLoja {
  id: string;
  nome: string;
  moedas?: number;   // preço em moedas (quando comprado com moedas)
  gemas?: number;    // preço em gemas
}

export const CATALOGO_LOJA: ItemLoja[] = [
  { id: "cone",        nome: "Cone",          moedas: 600 },
  { id: "marmita",     nome: "Marmita",       moedas: 700 },
  { id: "ventilador",  nome: "Ventilador",    moedas: 800 },
  { id: "pipoca",      nome: "Pipoca",        moedas: 800 },
  { id: "relogio-luz", nome: "Relógio de luz", moedas: 900 },
  { id: "caixa-dagua", nome: "Caixa d'água",  moedas: 1800 },
  { id: "pipa",        nome: "Pipa",          moedas: 1800 },
  { id: "bone",        nome: "Boné",          moedas: 2000 },
  { id: "acai",        nome: "Açaí",          moedas: 2000 },
  { id: "olho-gato",   nome: "Olho de gato",  moedas: 2200 },
  { id: "farol",       nome: "Farol",         moedas: 2200 },
  { id: "paredao",     nome: "Paredão",       moedas: 5000 },
  { id: "roda-moto",   nome: "Roda de moto",  moedas: 5000 },
  { id: "spray",       nome: "Spray",         moedas: 4500 },
  { id: "lua",         nome: "Lua",           moedas: 4500 },
  { id: "gato-luz",    nome: "Gato de luz",   moedas: 4000 },
  { id: "globo",       nome: "Globo",         gemas: 120 },
  { id: "rojao",       nome: "Rojão",         gemas: 150 },
];

export function itemDaLoja(id: string): ItemLoja | undefined {
  return CATALOGO_LOJA.find((i) => i.id === id);
}

// ----------------------------------------------------------------------------
// Recompensas (espelham PREMIO do jogo; quem confirma e paga é o servidor)
// ----------------------------------------------------------------------------
export const RECOMPENSA = {
  GOL_PARTIDA: 10,          // moedas por gol em partida
  PARTIDA: 25,              // moedas por partida concluída
  VITORIA: 60,              // moedas por vitória
  GOL_TREINO: 4,            // moedas por gol no treino livre
  TREINO_MAX_DIARIO: 10,    // anti-farm: máximo de gols de treino pagos por dia
  NIVEL_MOEDAS: 100,        // por nível de patente alcançado
  NIVEL_GEMAS: 5,
  NIVEL5_GEMAS_EXTRA: 25,   // bônus a cada 5 níveis
  MOEDAS_MAX_DIARIO_PARTIDAS: 4000, // anti-farm: teto diário vindo de partidas
} as const;

// Troca de gemas por moedas (espelha TROCAS do jogo)
export const TROCAS_GEMAS = [
  { gemas: 30, moedas: 600 },
  { gemas: 80, moedas: 1800 },
  { gemas: 200, moedas: 5000 },
] as const;

// Saldo inicial de conta nova (espelha contaPadrao do jogo)
export const CARTEIRA_INICIAL = { moedas: 500, gemas: 25 } as const;

// Acima deste valor absoluto (moedas ou gemas), o ajuste administrativo exige
// aprovação de um segundo administrador (tabela aprovacoes).
export const APROVACAO_DUPLA_ACIMA_DE = 10000;
