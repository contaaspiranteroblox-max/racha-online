import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  timestamp,
  int,
  bigint,
  boolean,
  json,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";

// ============================================================================
// RACHA 2.0 — Schema do banco (MySQL / Drizzle)
// ============================================================================

// Contador global atômico (geração do ID público numérico, sem reuso)
export const contadores = mysqlTable("contadores", {
  nome: varchar("nome", { length: 40 }).primaryKey(),
  valor: bigint("valor", { mode: "number", unsigned: true }).notNull().default(0),
});

// ---------- 2. CONTAS ----------
export const usuarios = mysqlTable(
  "usuarios",
  {
    id: serial("id").primaryKey(),
    uuid: varchar("uuid", { length: 36 }).notNull().unique(), // ID interno (UUID)
    idPublico: bigint("id_publico", { mode: "number", unsigned: true }).notNull().unique(), // ID público 000001
    username: varchar("username", { length: 24 }).notNull().unique(), // login (minúsculo)
    nomeExibicao: varchar("nome_exibicao", { length: 32 }).notNull(),
    senhaHash: varchar("senha_hash", { length: 200 }).notNull(), // scrypt — nunca texto puro
    email: varchar("email", { length: 120 }).unique(), // opcional (recuperação)
    codigoRecuperacaoHash: varchar("codigo_recuperacao_hash", { length: 200 }), // hash do código de recuperação
    nivel: int("nivel").notNull().default(1),
    xp: int("xp").notNull().default(0),
    avatarEmoji: varchar("avatar_emoji", { length: 16 }).notNull().default("⚽"),
    corDestaque: varchar("cor_destaque", { length: 9 }).notNull().default("#ffd23f"),
    skinEquipada: varchar("skin_equipada", { length: 40 }).notNull().default("skin_padrao"),
    bannerEquipado: varchar("banner_equipado", { length: 40 }).notNull().default("banner_laje_noturna"),
    molduraEquipada: varchar("moldura_equipada", { length: 40 }),
    tituloEquipado: varchar("titulo_equipado", { length: 60 }),
    estado: mysqlEnum("estado", ["ativo", "suspenso", "banido"]).notNull().default("ativo"),
    suspensoAte: timestamp("suspenso_ate"),
    // privacidade
    perfilPublico: boolean("perfil_publico").notNull().default(true),
    aceitaPedidos: boolean("aceita_pedidos").notNull().default(true),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
    ultimoLoginEm: timestamp("ultimo_login_em"),
  },
  (t) => [index("idx_usuarios_nome").on(t.nomeExibicao)],
);

// Sessões (hash do token — o token em si nunca é salvo)
export const sessoes = mysqlTable(
  "sessoes",
  {
    id: serial("id").primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    painelAdmin: boolean("painel_admin").notNull().default(false), // sessão do RACHA CONTROL
    totpVerificado: boolean("totp_verificado").notNull().default(false),
    ip: varchar("ip", { length: 60 }),
    agente: varchar("agente", { length: 200 }),
    criadaEm: timestamp("criada_em").notNull().defaultNow(),
    expiraEm: timestamp("expira_em").notNull(),
    revogadaEm: timestamp("revogada_em"),
  },
  (t) => [index("idx_sessoes_usuario").on(t.usuarioId)],
);

// ---------- 10. CARGOS / EQUIPE ----------
export const cargos = mysqlTable("cargos", {
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).primaryKey(),
  cargo: mysqlEnum("cargo", ["dono", "administrador", "moderador", "ajudante"]).notNull(),
  permissoes: json("permissoes").$type<string[]>(), // overrides dentro dos limites do cargo
  concedidoPor: bigint("concedido_por", { mode: "number", unsigned: true }),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

// 2FA TOTP dos administradores
export const totp = mysqlTable("totp", {
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).primaryKey(),
  segredo: varchar("segredo", { length: 64 }).notNull(), // base32
  ativo: boolean("ativo").notNull().default(false),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

// ---------- 9. SELOS OFICIAIS ----------
export const selos = mysqlTable(
  "selos",
  {
    id: serial("id").primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    selo: mysqlEnum("selo", ["verificado", "criador", "parceiro", "equipe"]).notNull(),
    concedidoPor: bigint("concedido_por", { mode: "number", unsigned: true }).notNull(),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_selo_usuario").on(t.usuarioId, t.selo)],
);

// ---------- 6. ESTATÍSTICAS ----------
export const estatisticas = mysqlTable("estatisticas", {
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).primaryKey(),
  partidas: int("partidas").notNull().default(0),
  vitorias: int("vitorias").notNull().default(0),
  derrotas: int("derrotas").notNull().default(0),
  empates: int("empates").notNull().default(0),
  gols: int("gols").notNull().default(0),
  assistencias: int("assistencias").notNull().default(0),
  defesas: int("defesas").notNull().default(0),
  dribles: int("dribles").notNull().default(0),
  fintas: int("fintas").notNull().default(0),
  golsGinga: int("gols_ginga").notNull().default(0),
  golsTreino: int("gols_treino").notNull().default(0),
  sequenciaVitorias: int("sequencia_vitorias").notNull().default(0),
  melhorSequencia: int("melhor_sequencia").notNull().default(0),
  modos: json("modos").$type<Record<string, number>>().notNull(),
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
});

// ---------- 5. PROGRESSÃO ----------
export const historicoNiveis = mysqlTable(
  "historico_niveis",
  {
    id: serial("id").primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    nivel: int("nivel").notNull(),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (t) => [index("idx_histnivel_usuario").on(t.usuarioId)],
);

export const eventosXp = mysqlTable(
  "eventos_xp",
  {
    id: serial("id").primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    quantidade: int("quantidade").notNull(),
    motivo: varchar("motivo", { length: 60 }).notNull(),
    referencia: varchar("referencia", { length: 64 }), // ex.: matchId
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (t) => [
    index("idx_eventosxp_usuario").on(t.usuarioId),
    uniqueIndex("uq_eventosxp_ref").on(t.usuarioId, t.motivo, t.referencia),
  ],
);

// Teto diário de XP de partidas (anti-farm)
export const xpDiario = mysqlTable(
  "xp_diario",
  {
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    dia: varchar("dia", { length: 10 }).notNull(), // YYYY-MM-DD (UTC)
    xpPartidas: int("xp_partidas").notNull().default(0),
    golsTreino: int("gols_treino").notNull().default(0),
  },
  (t) => [uniqueIndex("uq_xpdiario").on(t.usuarioId, t.dia)],
);

// ---------- Partidas (token + dedup + validação) ----------
export const partidas = mysqlTable(
  "partidas",
  {
    id: varchar("id", { length: 36 }).primaryKey(), // matchId (UUID gerado pelo cliente, único)
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    modo: varchar("modo", { length: 20 }).notNull(),
    mapa: varchar("mapa", { length: 30 }),
    nivelBots: varchar("nivel_bots", { length: 20 }),
    estado: mysqlEnum("estado", ["aberta", "encerrada"]).notNull().default("aberta"),
    placarNosso: int("placar_nosso"),
    placarDeles: int("placar_deles"),
    resultado: mysqlEnum("resultado", ["vitoria", "derrota", "empate"]),
    gols: int("gols"),
    assistencias: int("assistencias"),
    golsGinga: int("gols_ginga"),
    duracaoSeg: int("duracao_seg"),
    xpConcedido: int("xp_concedido").notNull().default(0),
    criadaEm: timestamp("criada_em").notNull().defaultNow(),
    encerradaEm: timestamp("encerrada_em"),
  },
  (t) => [index("idx_partidas_usuario").on(t.usuarioId, t.criadaEm)],
);

// ---------- 13. INVENTÁRIO ----------
export const itensUsuario = mysqlTable(
  "itens_usuario",
  {
    id: serial("id").primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    codigoItem: varchar("codigo_item", { length: 40 }).notNull(),
    origem: varchar("origem", { length: 20 }).notNull(), // nivel | conquista | evento | admin | inicial
    origemDetalhe: varchar("origem_detalhe", { length: 80 }), // ex.: "Nível 30", "Distribuição #12"
    obtidoEm: timestamp("obtido_em").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_item_usuario").on(t.usuarioId, t.codigoItem)],
);

// ---------- 7. CONQUISTAS ----------
export const conquistasUsuario = mysqlTable(
  "conquistas_usuario",
  {
    id: serial("id").primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    codigo: varchar("codigo", { length: 40 }).notNull(),
    favorita: boolean("favorita").notNull().default(false),
    desbloqueadaEm: timestamp("desbloqueada_em").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_conquista_usuario").on(t.usuarioId, t.codigo)],
);

// ---------- 14. AMIGOS ----------
export const amizades = mysqlTable(
  "amizades",
  {
    id: serial("id").primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    amigoId: bigint("amigo_id", { mode: "number", unsigned: true }).notNull(),
    criadaEm: timestamp("criada_em").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_amizade").on(t.usuarioId, t.amigoId)],
);

export const pedidosAmizade = mysqlTable(
  "pedidos_amizade",
  {
    id: serial("id").primaryKey(),
    deId: bigint("de_id", { mode: "number", unsigned: true }).notNull(),
    paraId: bigint("para_id", { mode: "number", unsigned: true }).notNull(),
    estado: mysqlEnum("estado", ["pendente", "aceito", "recusado"]).notNull().default("pendente"),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
    respondidoEm: timestamp("respondido_em"),
  },
  (t) => [
    index("idx_pedidos_para").on(t.paraId, t.estado),
    uniqueIndex("uq_pedido_par").on(t.deId, t.paraId),
  ],
);

export const bloqueios = mysqlTable(
  "bloqueios",
  {
    id: serial("id").primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    bloqueadoId: bigint("bloqueado_id", { mode: "number", unsigned: true }).notNull(),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_bloqueio").on(t.usuarioId, t.bloqueadoId)],
);

// ---------- Denúncias ----------
export const denuncias = mysqlTable(
  "denuncias",
  {
    id: serial("id").primaryKey(),
    autorId: bigint("autor_id", { mode: "number", unsigned: true }).notNull(),
    alvoId: bigint("alvo_id", { mode: "number", unsigned: true }).notNull(),
    motivo: varchar("motivo", { length: 60 }).notNull(),
    detalhes: varchar("detalhes", { length: 500 }),
    estado: mysqlEnum("estado", ["aberta", "em_analise", "resolvida", "arquivada"]).notNull().default("aberta"),
    atribuidaA: bigint("atribuida_a", { mode: "number", unsigned: true }),
    criadaEm: timestamp("criada_em").notNull().defaultNow(),
    resolvidaEm: timestamp("resolvida_em"),
  },
  (t) => [index("idx_denuncias_alvo").on(t.alvoId)],
);

// ---------- Punições ----------
export const punicoes = mysqlTable(
  "punicoes",
  {
    id: serial("id").primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    tipo: mysqlEnum("tipo", ["advertencia", "suspensao", "banimento"]).notNull(),
    motivo: varchar("motivo", { length: 300 }).notNull(),
    aplicadaPor: bigint("aplicada_por", { mode: "number", unsigned: true }).notNull(),
    expiraEm: timestamp("expira_em"),
    ativa: boolean("ativa").notNull().default(true),
    criadaEm: timestamp("criada_em").notNull().defaultNow(),
  },
  (t) => [index("idx_punicoes_usuario").on(t.usuarioId)],
);

// ---------- 12. DISTRIBUIÇÃO DE RECOMPENSAS ----------
export const distribuicoes = mysqlTable("distribuicoes", {
  id: serial("id").primaryKey(),
  chave: varchar("chave", { length: 64 }).notNull().unique(), // idempotência
  tipo: mysqlEnum("tipo", ["individual", "grupo", "global"]).notNull(),
  codigoItem: varchar("codigo_item", { length: 40 }).notNull(),
  criadaPor: bigint("criada_por", { mode: "number", unsigned: true }).notNull(),
  estado: mysqlEnum("estado", ["concluida", "falhou"]).notNull(),
  total: int("total").notNull().default(0),
  entregues: int("entregues").notNull().default(0),
  jaPossuiam: int("ja_possuiam").notNull().default(0),
  falhas: int("falhas").notNull().default(0),
  detalhe: varchar("detalhe", { length: 300 }),
  criadaEm: timestamp("criada_em").notNull().defaultNow(),
});

export const distribuicaoItens = mysqlTable(
  "distribuicao_itens",
  {
    id: serial("id").primaryKey(),
    distribuicaoId: bigint("distribuicao_id", { mode: "number", unsigned: true }).notNull(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    estado: mysqlEnum("estado", ["entregue", "ja_possuia", "falhou"]).notNull(),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_distrib_item").on(t.distribuicaoId, t.usuarioId)],
);

// ---------- Histórico de recompensas do jogador ----------
export const recompensasUsuario = mysqlTable(
  "recompensas_usuario",
  {
    id: serial("id").primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    codigoItem: varchar("codigo_item", { length: 40 }).notNull(),
    origem: varchar("origem", { length: 60 }).notNull(),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (t) => [index("idx_recompensas_usuario").on(t.usuarioId)],
);

// ---------- 15. AUDITORIA ----------
export const auditoria = mysqlTable(
  "auditoria",
  {
    id: serial("id").primaryKey(),
    operadorId: bigint("operador_id", { mode: "number", unsigned: true }).notNull(),
    cargoOperador: varchar("cargo_operador", { length: 20 }).notNull(),
    acao: varchar("acao", { length: 60 }).notNull(),
    alvoId: bigint("alvo_id", { mode: "number", unsigned: true }),
    detalhes: json("detalhes").$type<Record<string, unknown>>(),
    resultado: varchar("resultado", { length: 20 }).notNull(), // ok | negado | erro
    ip: varchar("ip", { length: 60 }),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (t) => [index("idx_auditoria_op").on(t.operadorId, t.criadoEm)],
);

// ---------- Rate limiting persistente leve (buscas, auth) ----------
export const limites = mysqlTable(
  "limites",
  {
    chave: varchar("chave", { length: 120 }).primaryKey(), // ex.: "busca:123" ou "login:ip"
    contagem: int("contagem").notNull().default(0),
    janelaInicio: timestamp("janela_inicio").notNull().defaultNow(),
  },
);
