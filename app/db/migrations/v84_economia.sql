-- ============================================================================
-- RACHA v84 — Migração: economia 100% no servidor
-- (carteiras + histórico imutável de transações + aprovações duplas)
-- ----------------------------------------------------------------------------
-- ANTES DE APLICAR (backup obrigatório):
--   mysqldump -u USUARIO -p NOME_DO_BANCO > backup_pre_v84_economia.sql
--
-- APLICAR:
--   mysql -u USUARIO -p NOME_DO_BANCO < app/db/migrations/v84_economia.sql
--
-- ROLLBACK (se necessário):
--   DROP TABLE IF EXISTS aprovacoes;
--   DROP TABLE IF EXISTS transacoes;
--   DROP TABLE IF EXISTS carteiras;
-- ============================================================================

-- Saldo oficial de cada jogador (o cliente NUNCA define estes valores)
CREATE TABLE IF NOT EXISTS carteiras (
  usuario_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  moedas INT UNSIGNED NOT NULL DEFAULT 0,
  gemas INT UNSIGNED NOT NULL DEFAULT 0,
  migrado_em TIMESTAMP NULL DEFAULT NULL,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Histórico imutável: quem, quanto, antes/depois, motivo, quando.
-- operacao_id único impede recompensa duplicada (dedup).
CREATE TABLE IF NOT EXISTS transacoes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  operacao_id VARCHAR(80) NOT NULL UNIQUE,
  usuario_id BIGINT UNSIGNED NOT NULL,
  moedas_delta INT NOT NULL DEFAULT 0,
  gemas_delta INT NOT NULL DEFAULT 0,
  moedas_depois INT UNSIGNED NOT NULL,
  gemas_depois INT UNSIGNED NOT NULL,
  tipo VARCHAR(24) NOT NULL,
  motivo VARCHAR(200) NOT NULL,
  ref_tipo VARCHAR(24) NULL,
  ref_id VARCHAR(60) NULL,
  admin_id BIGINT UNSIGNED NULL,
  criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trans_usuario (usuario_id, criada_em),
  INDEX idx_trans_tipo (tipo, criada_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ajustes administrativos acima de 10.000 (moedas ou gemas) exigem aprovação
-- de um SEGUNDO administrador antes de valer.
CREATE TABLE IF NOT EXISTS aprovacoes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(30) NOT NULL,
  alvo_usuario_id BIGINT UNSIGNED NOT NULL,
  moedas_delta INT NOT NULL DEFAULT 0,
  gemas_delta INT NOT NULL DEFAULT 0,
  motivo VARCHAR(200) NOT NULL,
  pedido_por_id BIGINT UNSIGNED NOT NULL,
  aprovado_por_id BIGINT UNSIGNED NULL,
  estado ENUM('pendente','aprovado','recusado') NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolvido_em TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
