-- ============================================================================
-- RACHA v84 — Migração: login obrigatório (cadastro com e-mail + aceite de
-- termos + recuperação por link de e-mail)
-- ----------------------------------------------------------------------------
-- ANTES DE APLICAR (backup obrigatório):
--   mysqldump -u USUARIO -p NOME_DO_BANCO usuarios > backup_usuarios_v84.sql
--
-- APLICAR:
--   mysql -u USUARIO -p NOME_DO_BANCO < app/db/migrations/v84_login_obrigatorio.sql
--
-- ROLLBACK (se necessário):
--   ALTER TABLE usuarios DROP COLUMN aceite_termos_em;
--   DROP TABLE IF EXISTS recuperacao_tokens;
-- ============================================================================

-- Aceite de termos no cadastro (v84: obrigatório a partir desta versão;
-- contas antigas ficam com NULL = aceite anterior à exigência)
ALTER TABLE usuarios
  ADD COLUMN aceite_termos_em TIMESTAMP NULL DEFAULT NULL AFTER email;

-- Tokens de recuperação de senha por e-mail (link com validade de 1 hora,
-- hash SHA-256, uso único; o token puro nunca vai para o banco)
CREATE TABLE IF NOT EXISTS recuperacao_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expira_em TIMESTAMP NOT NULL,
  usado_em TIMESTAMP NULL DEFAULT NULL,
  criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recup_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
