-- ============================================================================
-- RACHA v109 — Migração: os dois painéis (o do Dono e o da staff). Só ACRESCENTA: o tipo "silencio" nas punições (o chat
-- calado por um tempo), um índice na auditoria (o filtro do Dono por jogador) e a tabela das notas da equipe. Nenhuma linha
-- que já existe muda; a versão de antes continua funcionando com o banco assim.
-- (O mesmo que o app/db/schema.ts descreve: quem usa "npm run db:push" não precisa deste arquivo.)
-- ----------------------------------------------------------------------------
-- O deploy (racha-migra) faz o backup do banco antes e aplica uma vez só. À mão:
--   mysqldump -u USUARIO -p NOME_DO_BANCO > backup_pre_v109.sql
--   mysql -u USUARIO -p NOME_DO_BANCO < app/db/migrations/v109_painel.sql
--
-- ROLLBACK (perde só as notas da equipe; os silêncios aplicados viram linhas sem efeito na versão de antes):
--   DROP TABLE IF EXISTS notas_staff;
--   DROP INDEX idx_auditoria_alvo ON auditoria;
--   (o tipo "silencio" pode ficar: a versão de antes não grava nem lê esse tipo)
-- A tabela nova vem POR ÚLTIMO: é ela que o deploy usa para reconhecer um banco que já tem esta migração.
-- ============================================================================

ALTER TABLE punicoes MODIFY COLUMN tipo ENUM('advertencia','suspensao','banimento','silencio') NOT NULL;

CREATE INDEX idx_auditoria_alvo ON auditoria (alvo_id, criado_em);

CREATE TABLE IF NOT EXISTS notas_staff (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NOT NULL,
  autor_id BIGINT UNSIGNED NOT NULL,
  texto VARCHAR(500) NOT NULL,
  criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notas_staff_usuario (usuario_id, criada_em)
);
