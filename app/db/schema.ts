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
  primaryKey,
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
    email: varchar("email", { length: 120 }).unique(), // v84: obrigatório em contas novas (recuperação segura por e-mail)
    aceiteTermosEm: timestamp("aceite_termos_em"), // v84: quando aceitou os termos e a política (contas antigas: null = antes da exigência)
    codigoRecuperacaoHash: varchar("codigo_recuperacao_hash", { length: 200 }), // hash do código de recuperação
    nivel: int("nivel").notNull().default(1),
    xp: int("xp").notNull().default(0),
    avatarEmoji: varchar("avatar_emoji", { length: 16 }).notNull().default("⚽"),
    corDestaque: varchar("cor_destaque", { length: 9 }).notNull().default("#ffd23f"),
    skinEquipada: varchar("skin_equipada", { length: 40 }).notNull().default("skin_padrao"),
    tampa: varchar("tampa", { length: 48 }), // v69: a tampinha personalizada do jogo (o código T.…); null = a clássica
    bannerEquipado: varchar("banner_equipado", { length: 40 }).notNull().default("banner_laje_noturna"),
    molduraEquipada: varchar("moldura_equipada", { length: 40 }),
    tituloEquipado: varchar("titulo_equipado", { length: 60 }),
    estado: mysqlEnum("estado", ["ativo", "suspenso", "banido"]).notNull().default("ativo"),
    suspensoAte: timestamp("suspenso_ate"),
    // privacidade
    perfilPublico: boolean("perfil_publico").notNull().default(true),
    aceitaPedidos: boolean("aceita_pedidos").notNull().default(true),
    mostraOnline: boolean("mostra_online").notNull().default(true), // v88: os amigos veem online / em partida (desligado: sempre offline)
    aceitaConvites: boolean("aceita_convites").notNull().default(true), // v88: convites de sala/equipe dos amigos
    equipados: json("equipados").$type<Record<string, string>>(), // v88: bola, efeito, comemoracao, gol, banner, avatar (códigos do catálogo)
    bio: varchar("bio", { length: 80 }), // v88: a frase do perfil
    excluidoEm: timestamp("excluido_em"), // v88: conta excluída a pedido (os dados pessoais são apagados; o ID não volta)
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
    // v82: a ranqueada (contra os bots ou online), o tamanho do time, os pontos do placar e os gols contra (antes chegavam e
    // eram jogados fora) e o que a partida mudou na patente
    ranqueada: boolean("ranqueada").notNull().default(false),
    online: boolean("online").notNull().default(false),
    tamanho: int("tamanho"),
    pontos: int("pontos"),
    golsContra: int("gols_contra"),
    rqDelta: int("rq_delta"),
    // v88: o melhor da partida (o servidor das salas decide na online; contra os bots, a regra do contracts/estatisticas88.ts),
    // os IDs públicos de quem jogou junto (o selo da sala online traz) e a temporada da partida
    mvp: boolean("mvp").notNull().default(false),
    jogadores: json("jogadores").$type<string[]>(),
    temporada: varchar("temporada", { length: 16 }),
    moedasConcedidas: int("moedas_concedidas").notNull().default(0),
    criadaEm: timestamp("criada_em").notNull().defaultNow(),
    encerradaEm: timestamp("encerrada_em"),
  },
  (t) => [index("idx_partidas_usuario").on(t.usuarioId, t.criadaEm)],
);

// ---------- v82: A PATENTE DA RANQUEADA NA CONTA (as regras em contracts/patentes.ts; o servidor faz a conta) ----------
export const ranqueada = mysqlTable(
  "ranqueada",
  {
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).primaryKey(),
    pts: int("pts").notNull().default(0),
    melhor: int("melhor").notNull().default(0),
    jogos: int("jogos").notNull().default(0),
    vit: int("vit").notNull().default(0),
    der: int("der").notNull().default(0),
    emp: int("emp").notNull().default(0),
    seq: int("seq").notNull().default(0),
    desist: int("desist").notNull().default(0),
    importado: boolean("importado").notNull().default(false), // a patente do aparelho já entrou (uma vez)
    botsDia: varchar("bots_dia", { length: 10 }).notNull().default(""), // o dia (UTC) do contador de baixo
    botsGanho: int("bots_ganho").notNull().default(0), // pontos ganhos contra os bots nesse dia (o teto do dia)
    atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
  },
  (t) => [index("idx_ranqueada_pts").on(t.pts)],
);

// Cada mudança na patente (a partida, a desistência, o que veio do aparelho, o ajuste do RACHA CONTROL): auditoria e dedup
export const ranqueadaEventos = mysqlTable(
  "ranqueada_eventos",
  {
    id: serial("id").primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    referencia: varchar("referencia", { length: 64 }).notNull(), // o matchId, "importacao" ou "ajuste:<id>"
    motivo: varchar("motivo", { length: 20 }).notNull(), // vitoria | derrota | empate | desistencia | importacao | ajuste
    antes: int("antes").notNull(),
    delta: int("delta").notNull(),
    depois: int("depois").notNull(),
    online: boolean("online").notNull().default(false),
    tamanho: int("tamanho"),
    limitado: boolean("limitado").notNull().default(false), // o teto do dia contra os bots cortou pontos
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_rqev_ref").on(t.usuarioId, t.referencia), index("idx_rqev_usuario").on(t.usuarioId, t.criadoEm)],
);

// ---------- v82: O PROGRESSO DO JOGO NA CONTA (a cópia das chaves do aparelho; formato em contracts/progresso.ts) ----------
export const progressoJogo = mysqlTable("progresso_jogo", {
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).primaryKey(),
  versao: int("versao").notNull().default(0), // sobe a cada cópia salva (quem salva diz de qual versão partiu)
  dados: json("dados").$type<{ v: number; chaves: Record<string, string> }>().notNull(),
  bytes: int("bytes").notNull().default(0),
  aparelho: varchar("aparelho", { length: 40 }), // de qual aparelho veio a última cópia (o jogo sorteia um id por aparelho)
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
});

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
    contexto: json("contexto").$type<Record<string, unknown>>(), // v88: de onde veio (perfil, chat: canal + mensagem, partida)
    chave: varchar("chave", { length: 120 }), // v88: autor+alvo+motivo+dia (a mesma denúncia não entra duas vezes no dia)
    estado: mysqlEnum("estado", ["aberta", "em_analise", "resolvida", "arquivada"]).notNull().default("aberta"),
    atribuidaA: bigint("atribuida_a", { mode: "number", unsigned: true }),
    criadaEm: timestamp("criada_em").notNull().defaultNow(),
    resolvidaEm: timestamp("resolvida_em"),
  },
  (t) => [index("idx_denuncias_alvo").on(t.alvoId), uniqueIndex("uq_denuncia_chave").on(t.chave), index("idx_denuncias_autor").on(t.autorId, t.criadaEm)],
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

// ---------- v69: CLUBES (até 30 jogadores; troféus do clube = a soma das vitórias dos membros) ----------
export const clubes = mysqlTable(
  "clubes",
  {
    id: serial("id").primaryKey(),
    nome: varchar("nome", { length: 24 }).notNull(),
    nomeChave: varchar("nome_chave", { length: 24 }).notNull().unique(), // minúsculo, sem acento nem espaço (nome único)
    descricao: varchar("descricao", { length: 60 }).notNull().default("Junte-se a nós!"),
    pais: varchar("pais", { length: 2 }).notNull().default("BR"),
    tipo: mysqlEnum("tipo", ["publico", "convite"]).notNull().default("publico"),
    trofeuMinimo: int("trofeu_minimo").notNull().default(0),
    escudo: varchar("escudo", { length: 48 }).notNull(), // o escudo desenhado no jogo (o código E.…)
    donoId: bigint("dono_id", { mode: "number", unsigned: true }).notNull(),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (t) => [index("idx_clubes_dono").on(t.donoId)],
);

export const clubeMembros = mysqlTable(
  "clube_membros",
  {
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).primaryKey(), // um clube por jogador
    clubeId: bigint("clube_id", { mode: "number", unsigned: true }).notNull(),
    papel: mysqlEnum("papel", ["dono", "admin", "membro"]).notNull().default("membro"), // v88: admin (o dono escolhe)
    entrouEm: timestamp("entrou_em").notNull().defaultNow(),
  },
  (t) => [index("idx_membros_clube").on(t.clubeId)],
);

export const clubeConvites = mysqlTable(
  "clube_convites",
  {
    id: serial("id").primaryKey(),
    clubeId: bigint("clube_id", { mode: "number", unsigned: true }).notNull(),
    paraId: bigint("para_id", { mode: "number", unsigned: true }).notNull(),
    deId: bigint("de_id", { mode: "number", unsigned: true }).notNull(),
    estado: mysqlEnum("estado", ["pendente", "aceito", "recusado"]).notNull().default("pendente"),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (t) => [index("idx_convites_para").on(t.paraId, t.estado), uniqueIndex("uq_convite").on(t.clubeId, t.paraId)],
);

// ============================================================================
// v84 — LOGIN OBRIGATÓRIO + ECONOMIA 100% NO SERVIDOR
// ============================================================================

// Tokens de recuperação de senha por e-mail (spec 1.3): link seguro, 1 hora, uso
// único, hash no banco — o token puro só vai no e-mail.
export const recuperacaoTokens = mysqlTable(
  "recuperacao_tokens",
  {
    id: serial("id").primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiraEm: timestamp("expira_em").notNull(),
    usadoEm: timestamp("usado_em"),
    criadaEm: timestamp("criada_em").notNull().defaultNow(),
  },
  (t) => [index("idx_recup_usuario").on(t.usuarioId)],
);

// A carteira: uma por usuário. O saldo oficial de moedas e gemas mora AQUI —
// o cliente nunca define o saldo (spec parte 5).
export const carteiras = mysqlTable("carteiras", {
  usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).primaryKey(),
  moedas: int("moedas", { unsigned: true }).notNull().default(0),
  gemas: int("gemas", { unsigned: true }).notNull().default(0),
  migradoEm: timestamp("migrado_em"), // quando o saldo veio da cópia do aparelho (null = não migrou)
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
});

// O livro-razão: CADA movimentação (quem, quanto, antes, depois, por quê, quando).
// Não existe alteração de saldo sem registro aqui.
export const transacoes = mysqlTable(
  "transacoes",
  {
    id: serial("id").primaryKey(),
    operacaoId: varchar("operacao_id", { length: 80 }).notNull().unique(), // dedup: a mesma operação nunca grava duas vezes
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    moedasDelta: int("moedas_delta").notNull().default(0), // + entra, − sai
    gemasDelta: int("gemas_delta").notNull().default(0),
    moedasDepois: int("moedas_depois", { unsigned: true }).notNull(),
    gemasDepois: int("gemas_depois", { unsigned: true }).notNull(),
    tipo: varchar("tipo", { length: 24 }).notNull(), // partida | treino | nivel | compra | troca | admin | migracao | evento
    motivo: varchar("motivo", { length: 200 }).notNull(),
    refTipo: varchar("ref_tipo", { length: 24 }), // partida, skin, aprovacao…
    refId: varchar("ref_id", { length: 60 }),
    adminId: bigint("admin_id", { mode: "number", unsigned: true }), // quem operou no RACHA CONTROL (quando é o caso)
    criadaEm: timestamp("criada_em").notNull().defaultNow(),
  },
  (t) => [index("idx_trans_usuario").on(t.usuarioId, t.criadaEm), index("idx_trans_tipo").on(t.tipo, t.criadaEm)],
);

// Aprovação dupla: ajuste de saldo alto pede o OK de um segundo administrador (spec parte 5)
export const aprovacoes = mysqlTable("aprovacoes", {
  id: serial("id").primaryKey(),
  tipo: varchar("tipo", { length: 30 }).notNull(), // ajuste_saldo
  alvoUsuarioId: bigint("alvo_usuario_id", { mode: "number", unsigned: true }).notNull(),
  moedasDelta: int("moedas_delta").notNull().default(0),
  gemasDelta: int("gemas_delta").notNull().default(0),
  motivo: varchar("motivo", { length: 200 }).notNull(),
  pedidoPorId: bigint("pedido_por_id", { mode: "number", unsigned: true }).notNull(),
  aprovadoPorId: bigint("aprovado_por_id", { mode: "number", unsigned: true }),
  estado: mysqlEnum("estado", ["pendente", "aprovado", "recusado"]).notNull().default("pendente"),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
  resolvidoEm: timestamp("resolvido_em"),
});

// ============================================================================
// v88 — A ATUALIZAÇÃO COMPLETA DOS MENUS (amigos, mensagens, correio, missões, eventos, passe, clube)
// As regras moram em app/contracts/*88.ts e o catálogo em app/contracts/catalogo88.json (o mesmo que o jogo usa).
// ============================================================================

// Pedidos para entrar em clube só por convite (o dono e os admins aceitam ou recusam)
export const clubePedidos = mysqlTable(
  "clube_pedidos",
  {
    id: serial("id").primaryKey(),
    clubeId: bigint("clube_id", { mode: "number", unsigned: true }).notNull(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    estado: mysqlEnum("estado", ["pendente", "aceito", "recusado"]).notNull().default("pendente"),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
    respondidoEm: timestamp("respondido_em"),
  },
  (t) => [uniqueIndex("uq_clube_pedido").on(t.clubeId, t.usuarioId), index("idx_clube_pedidos").on(t.clubeId, t.estado)],
);

// A central de mensagens (os avisos ligados à conta): sistema, amigos, clube, convites e recompensas
export const mensagens = mysqlTable(
  "mensagens",
  {
    id: serial("id").primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    categoria: mysqlEnum("categoria", ["sistema", "amigos", "clube", "convites", "recompensas"]).notNull(),
    titulo: varchar("titulo", { length: 80 }).notNull(),
    corpo: varchar("corpo", { length: 600 }).notNull().default(""),
    deId: bigint("de_id", { mode: "number", unsigned: true }), // quem originou (null = o sistema)
    refTipo: varchar("ref_tipo", { length: 24 }), // pedido_amizade, amizade, convite_clube, pedido_clube, correio, evento, missao…
    refId: varchar("ref_id", { length: 60 }),
    chave: varchar("chave", { length: 80 }), // a mesma mensagem não entra duas vezes (null = sem trava)
    lida: boolean("lida").notNull().default(false),
    criadaEm: timestamp("criada_em").notNull().defaultNow(),
    expiraEm: timestamp("expira_em"),
  },
  (t) => [index("idx_mensagens_usuario").on(t.usuarioId, t.criadaEm), uniqueIndex("uq_mensagens_chave").on(t.usuarioId, t.chave)],
);

// O correio: cada carta pode trazer moedas, gemas, itens do catálogo e XP do passe; COLETAR vale uma vez (o servidor confere)
export type AnexoCorreio = { tipo: "moedas" | "gemas" | "item" | "xp_passe"; qtd: number; codigo?: string };
export const correio = mysqlTable(
  "correio",
  {
    id: serial("id").primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    tipo: mysqlEnum("tipo", ["login", "evento", "temporada", "presente", "manutencao", "compensacao", "missao", "passe", "sistema"]).notNull(),
    titulo: varchar("titulo", { length: 80 }).notNull(),
    corpo: varchar("corpo", { length: 600 }).notNull().default(""),
    anexos: json("anexos").$type<AnexoCorreio[]>().notNull(),
    chave: varchar("chave", { length: 80 }).notNull(), // login:2026-10-18, global:12, presente-teste…: a mesma carta não chega duas vezes
    lidoEm: timestamp("lido_em"),
    coletadoEm: timestamp("coletado_em"),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
    expiraEm: timestamp("expira_em"),
    origemAdminId: bigint("origem_admin_id", { mode: "number", unsigned: true }),
  },
  (t) => [uniqueIndex("uq_correio_chave").on(t.usuarioId, t.chave), index("idx_correio_usuario").on(t.usuarioId, t.criadoEm)],
);

// Carta para todo mundo (manutenção, compensação, presente): cada conta recebe a sua cópia quando abre o jogo na janela
export const correioGlobal = mysqlTable("correio_global", {
  id: serial("id").primaryKey(),
  tipo: mysqlEnum("tipo", ["login", "evento", "temporada", "presente", "manutencao", "compensacao", "missao", "passe", "sistema"]).notNull(),
  titulo: varchar("titulo", { length: 80 }).notNull(),
  corpo: varchar("corpo", { length: 600 }).notNull().default(""),
  anexos: json("anexos").$type<AnexoCorreio[]>().notNull(),
  inicio: timestamp("inicio").notNull().defaultNow(),
  fim: timestamp("fim"),
  contasAte: timestamp("contas_ate"), // compensação: só para contas criadas até esta data (null = todas)
  ativo: boolean("ativo").notNull().default(true),
  criadoPor: bigint("criado_por", { mode: "number", unsigned: true }).notNull(),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

// As missões: o progresso de cada uma por período (dia, semana, temporada ou evento), contado pelo servidor
export const missoesProgresso = mysqlTable(
  "missoes_progresso",
  {
    id: serial("id").primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    missao: varchar("missao", { length: 40 }).notNull(),
    periodo: varchar("periodo", { length: 24 }).notNull(), // D:2026-10-18 · S:2026-10-12 · T:T1 · E:<evento>
    progresso: int("progresso").notNull().default(0),
    meta: int("meta").notNull(),
    coletadaEm: timestamp("coletada_em"),
    atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_missao").on(t.usuarioId, t.missao, t.periodo), index("idx_missao_usuario").on(t.usuarioId, t.periodo)],
);

// Os eventos (configurados pelo servidor/RACHA CONTROL): login diário, desafios, torneios, temporada, recompensas temporárias
export const eventos = mysqlTable("eventos", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 40 }).notNull().unique(),
  tipo: mysqlEnum("tipo", ["ativo", "login", "desafio", "torneio", "temporada", "temporario"]).notNull(),
  nome: varchar("nome", { length: 60 }).notNull(),
  descricao: varchar("descricao", { length: 300 }).notNull().default(""),
  regras: varchar("regras", { length: 1000 }).notNull().default(""),
  imagem: varchar("imagem", { length: 40 }).notNull().default("favela"), // um desenho do jogo (sem endereço de fora)
  inicio: timestamp("inicio").notNull(),
  fim: timestamp("fim").notNull(),
  config: json("config").$type<Record<string, unknown>>().notNull(),
  ativo: boolean("ativo").notNull().default(true),
  ordem: int("ordem").notNull().default(0),
  criadoPor: bigint("criado_por", { mode: "number", unsigned: true }),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
});

export const eventosProgresso = mysqlTable(
  "eventos_progresso",
  {
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    eventoId: bigint("evento_id", { mode: "number", unsigned: true }).notNull(),
    dados: json("dados").$type<Record<string, unknown>>().notNull(), // login: os dias coletados · desafio: o progresso das metas
    atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.eventoId] })],
);

// O Passe RACHA: o XP e as recompensas coletadas em cada temporada (trilha grátis e premium)
export const passeTemporada = mysqlTable(
  "passe_temporada",
  {
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    temporada: varchar("temporada", { length: 16 }).notNull(),
    xp: int("xp").notNull().default(0),
    premium: boolean("premium").notNull().default(false),
    premiumEm: timestamp("premium_em"),
    coletadas: json("coletadas").$type<{ g: number[]; p: number[] }>().notNull(),
    atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.temporada] })],
);

// ============================================================================
// v90 — O RANKING DA TEMPORADA (gols, assistências, pontos ranqueados e Craque do Jogo) · regras em contracts/v90.ts
// Só tabelas novas: nada do que já existia muda ou some (as estatísticas de sempre continuam somando para sempre).
// ============================================================================

// As temporadas do ranking (a T1 nasce das datas do catálogo; as outras, pelo RACHA CONTROL)
export const temporadasRanking = mysqlTable("temporadas_ranking", {
  id: varchar("id", { length: 16 }).primaryKey(), // "T1", "T2"…
  nome: varchar("nome", { length: 60 }).notNull(),
  inicio: timestamp("inicio").notNull(),
  fim: timestamp("fim").notNull(),
  estado: mysqlEnum("estado", ["ativa", "fechando", "fechada"]).notNull().default("ativa"),
  fechadaEm: timestamp("fechada_em"),
  recompensasEm: timestamp("recompensas_em"), // quando as recompensas do TOP 3 foram entregues (uma vez)
  criadaEm: timestamp("criada_em").notNull().defaultNow(),
});

// Os contadores da temporada de cada conta (só partidas que o servidor simulou) · os *Em = quando chegou nesse valor (o desempate)
export const rankingSazonal = mysqlTable(
  "ranking_sazonal",
  {
    temporada: varchar("temporada", { length: 16 }).notNull(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    gols: int("gols").notNull().default(0),
    assistencias: int("assistencias").notNull().default(0),
    craques: int("craques").notNull().default(0),
    partidas: int("partidas").notNull().default(0),
    golsEm: timestamp("gols_em").notNull().defaultNow(),
    assistenciasEm: timestamp("assistencias_em").notNull().defaultNow(),
    craquesEm: timestamp("craques_em").notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.temporada, t.usuarioId] }),
    index("idx_rksaz_gols").on(t.temporada, t.gols),
    index("idx_rksaz_assist").on(t.temporada, t.assistencias),
    index("idx_rksaz_craques").on(t.temporada, t.craques),
  ],
);

// Cada partida conta uma vez por conta (a chave impede duplicar gols, assistências e Craque do Jogo)
export const rankingPartidas = mysqlTable(
  "ranking_partidas",
  {
    pid: varchar("pid", { length: 16 }).notNull(), // o número da partida no servidor das salas (vem no selo)
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    temporada: varchar("temporada", { length: 16 }).notNull(),
    gols: int("gols").notNull().default(0),
    assistencias: int("assistencias").notNull().default(0),
    craque: boolean("craque").notNull().default(false),
    matchId: varchar("match_id", { length: 36 }), // a partida da conta (tabela partidas)
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.pid, t.usuarioId] })],
);

// A classificação final de cada temporada e categoria (todas as posições: o TOP 20 e a de cada um), congelada no fechamento
export const rankingFinal = mysqlTable(
  "ranking_final",
  {
    temporada: varchar("temporada", { length: 16 }).notNull(),
    categoria: mysqlEnum("categoria", ["gols", "assistencias", "pontos", "craque"]).notNull(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    posicao: int("posicao").notNull(),
    valor: int("valor").notNull(),
    nome: varchar("nome", { length: 40 }).notNull(), // o nome e a tampinha do dia do fechamento (o histórico não muda depois)
    tampa: varchar("tampa", { length: 64 }),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.temporada, t.categoria, t.usuarioId] }),
    index("idx_rkfinal_pos").on(t.temporada, t.categoria, t.posicao),
    index("idx_rkfinal_usuario").on(t.usuarioId),
  ],
);

// As recompensas do TOP 3 (a chave impede entregar duas vezes)
export const recompensasRanking = mysqlTable(
  "recompensas_ranking",
  {
    temporada: varchar("temporada", { length: 16 }).notNull(),
    categoria: mysqlEnum("categoria", ["gols", "assistencias", "pontos", "craque"]).notNull(),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true }).notNull(),
    posicao: int("posicao").notNull(),
    itens: json("itens").$type<string[]>().notNull(),
    titulo: varchar("titulo", { length: 80 }).notNull(),
    entregueEm: timestamp("entregue_em").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.temporada, t.categoria, t.usuarioId] }), index("idx_rkpremio_usuario").on(t.usuarioId)],
);
