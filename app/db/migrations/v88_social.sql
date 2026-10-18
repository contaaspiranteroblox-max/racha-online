-- ============================================================================
-- RACHA v88 — Migração: amigos com privacidade, mensagens, correio, missões, eventos, Passe RACHA, clube (admins e
-- pedidos), cosméticos equipados, o melhor da partida e o contexto das denúncias.
-- (O mesmo que o app/db/schema.ts descreve: quem usa "npm run db:push" não precisa deste arquivo.)
-- ----------------------------------------------------------------------------
-- ANTES DE APLICAR (backup obrigatório):
--   mysqldump -u USUARIO -p NOME_DO_BANCO > backup_pre_v88.sql
-- PRECISA da v84 (app/db/migrations/v84_economia.sql: carteiras e transacoes) aplicada antes.
--
-- APLICAR:
--   mysql -u USUARIO -p NOME_DO_BANCO < app/db/migrations/v88_social.sql
--
-- ROLLBACK (se necessário — perde o que foi gravado nas tabelas novas):
--   DROP TABLE IF EXISTS passe_temporada, eventos_progresso, eventos, missoes_progresso, correio_global, correio,
--     mensagens, clube_pedidos;
--   ALTER TABLE usuarios DROP COLUMN mostra_online, DROP COLUMN aceita_convites, DROP COLUMN equipados, DROP COLUMN bio,
--     DROP COLUMN excluido_em;
--   ALTER TABLE partidas DROP COLUMN mvp, DROP COLUMN jogadores, DROP COLUMN temporada, DROP COLUMN moedas_concedidas;
--   ALTER TABLE denuncias DROP INDEX uq_denuncia_chave, DROP INDEX idx_denuncias_autor, DROP COLUMN contexto, DROP COLUMN chave;
--   ALTER TABLE clube_membros MODIFY papel ENUM('dono','membro') NOT NULL DEFAULT 'membro';   (antes, rebaixe os admins)
-- ============================================================================

-- ---------- colunas novas nas tabelas que já existiam ----------
ALTER TABLE usuarios
  ADD COLUMN mostra_online BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN aceita_convites BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN equipados JSON NULL,
  ADD COLUMN bio VARCHAR(80) NULL,
  ADD COLUMN excluido_em TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE partidas
  ADD COLUMN mvp BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN jogadores JSON NULL,
  ADD COLUMN temporada VARCHAR(16) NULL,
  ADD COLUMN moedas_concedidas INT NOT NULL DEFAULT 0;

ALTER TABLE denuncias
  ADD COLUMN contexto JSON NULL,
  ADD COLUMN chave VARCHAR(120) NULL,
  ADD UNIQUE INDEX uq_denuncia_chave (chave),
  ADD INDEX idx_denuncias_autor (autor_id, criada_em);

ALTER TABLE clube_membros
  MODIFY papel ENUM('dono','admin','membro') NOT NULL DEFAULT 'membro';

-- ---------- clube: pedidos para entrar no clube só por convite ----------
CREATE TABLE IF NOT EXISTS clube_pedidos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  clube_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  estado ENUM('pendente','aceito','recusado') NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  respondido_em TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uq_clube_pedido (clube_id, usuario_id),
  KEY idx_clube_pedidos (clube_id, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- a central de mensagens ----------
CREATE TABLE IF NOT EXISTS mensagens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NOT NULL,
  categoria ENUM('sistema','amigos','clube','convites','recompensas') NOT NULL,
  titulo VARCHAR(80) NOT NULL,
  corpo VARCHAR(600) NOT NULL DEFAULT '',
  de_id BIGINT UNSIGNED NULL,
  ref_tipo VARCHAR(24) NULL,
  ref_id VARCHAR(60) NULL,
  chave VARCHAR(80) NULL,
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em TIMESTAMP NULL DEFAULT NULL,
  KEY idx_mensagens_usuario (usuario_id, criada_em),
  UNIQUE KEY uq_mensagens_chave (usuario_id, chave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- o correio (COLETAR uma vez, conferido no servidor) ----------
CREATE TABLE IF NOT EXISTS correio (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NOT NULL,
  tipo ENUM('login','evento','temporada','presente','manutencao','compensacao','missao','passe','sistema') NOT NULL,
  titulo VARCHAR(80) NOT NULL,
  corpo VARCHAR(600) NOT NULL DEFAULT '',
  anexos JSON NOT NULL,
  chave VARCHAR(80) NOT NULL,
  lido_em TIMESTAMP NULL DEFAULT NULL,
  coletado_em TIMESTAMP NULL DEFAULT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em TIMESTAMP NULL DEFAULT NULL,
  origem_admin_id BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_correio_chave (usuario_id, chave),
  KEY idx_correio_usuario (usuario_id, criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS correio_global (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('login','evento','temporada','presente','manutencao','compensacao','missao','passe','sistema') NOT NULL,
  titulo VARCHAR(80) NOT NULL,
  corpo VARCHAR(600) NOT NULL DEFAULT '',
  anexos JSON NOT NULL,
  inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fim TIMESTAMP NULL DEFAULT NULL,
  contas_ate TIMESTAMP NULL DEFAULT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por BIGINT UNSIGNED NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- as missões ----------
CREATE TABLE IF NOT EXISTS missoes_progresso (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NOT NULL,
  missao VARCHAR(40) NOT NULL,
  periodo VARCHAR(24) NOT NULL,
  progresso INT NOT NULL DEFAULT 0,
  meta INT NOT NULL,
  coletada_em TIMESTAMP NULL DEFAULT NULL,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_missao (usuario_id, missao, periodo),
  KEY idx_missao_usuario (usuario_id, periodo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- os eventos ----------
CREATE TABLE IF NOT EXISTS eventos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(40) NOT NULL UNIQUE,
  tipo ENUM('ativo','login','desafio','torneio','temporada','temporario') NOT NULL,
  nome VARCHAR(60) NOT NULL,
  descricao VARCHAR(300) NOT NULL DEFAULT '',
  regras VARCHAR(1000) NOT NULL DEFAULT '',
  imagem VARCHAR(40) NOT NULL DEFAULT 'favela',
  inicio TIMESTAMP NOT NULL,
  fim TIMESTAMP NOT NULL,
  config JSON NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INT NOT NULL DEFAULT 0,
  criado_por BIGINT UNSIGNED NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eventos_progresso (
  usuario_id BIGINT UNSIGNED NOT NULL,
  evento_id BIGINT UNSIGNED NOT NULL,
  dados JSON NOT NULL,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, evento_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- o Passe RACHA ----------
CREATE TABLE IF NOT EXISTS passe_temporada (
  usuario_id BIGINT UNSIGNED NOT NULL,
  temporada VARCHAR(16) NOT NULL,
  xp INT NOT NULL DEFAULT 0,
  premium BOOLEAN NOT NULL DEFAULT FALSE,
  premium_em TIMESTAMP NULL DEFAULT NULL,
  coletadas JSON NOT NULL,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, temporada)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
