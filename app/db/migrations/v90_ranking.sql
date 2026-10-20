-- ============================================================================
-- RACHA v90 — Migração: o RANKING DA TEMPORADA (gols, assistências, pontos ranqueados e Craque do Jogo), as temporadas,
-- a classificação final congelada e as recompensas do TOP 3. Só TABELAS NOVAS: nenhuma coluna ou dado que já existe muda.
-- (O mesmo que o app/db/schema.ts descreve: quem usa "npm run db:push" não precisa deste arquivo.)
-- ----------------------------------------------------------------------------
-- ANTES DE APLICAR (backup obrigatório):
--   mysqldump -u USUARIO -p NOME_DO_BANCO > backup_pre_v90.sql
-- PRECISA da v88 aplicada antes.
--
-- APLICAR:
--   mysql -u USUARIO -p NOME_DO_BANCO < app/db/migrations/v90_ranking.sql
--
-- ROLLBACK (perde só o que foi gravado nestas tabelas novas; o resto da conta não muda):
--   DROP TABLE IF EXISTS recompensas_ranking, ranking_final, ranking_partidas, ranking_sazonal, temporadas_ranking;
--   (o recomeço parcial da ranqueada fica no histórico ranqueada_eventos com motivo 'temporada': para desfazer, some o
--    delta de volta em ranqueada.pts de cada conta antes de apagar os eventos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS temporadas_ranking (
  id VARCHAR(16) NOT NULL PRIMARY KEY,
  nome VARCHAR(60) NOT NULL,
  inicio TIMESTAMP NOT NULL,
  fim TIMESTAMP NOT NULL,
  estado ENUM('ativa','fechando','fechada') NOT NULL DEFAULT 'ativa',
  fechada_em TIMESTAMP NULL DEFAULT NULL,
  recompensas_em TIMESTAMP NULL DEFAULT NULL,
  criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ranking_sazonal (
  temporada VARCHAR(16) NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  gols INT NOT NULL DEFAULT 0,
  assistencias INT NOT NULL DEFAULT 0,
  craques INT NOT NULL DEFAULT 0,
  partidas INT NOT NULL DEFAULT 0,
  gols_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assistencias_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  craques_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (temporada, usuario_id),
  INDEX idx_rksaz_gols (temporada, gols),
  INDEX idx_rksaz_assist (temporada, assistencias),
  INDEX idx_rksaz_craques (temporada, craques)
);

CREATE TABLE IF NOT EXISTS ranking_partidas (
  pid VARCHAR(16) NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  temporada VARCHAR(16) NOT NULL,
  gols INT NOT NULL DEFAULT 0,
  assistencias INT NOT NULL DEFAULT 0,
  craque BOOLEAN NOT NULL DEFAULT FALSE,
  match_id VARCHAR(36) NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (pid, usuario_id)
);

CREATE TABLE IF NOT EXISTS ranking_final (
  temporada VARCHAR(16) NOT NULL,
  categoria ENUM('gols','assistencias','pontos','craque') NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  posicao INT NOT NULL,
  valor INT NOT NULL,
  nome VARCHAR(40) NOT NULL,
  tampa VARCHAR(64) NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (temporada, categoria, usuario_id),
  INDEX idx_rkfinal_pos (temporada, categoria, posicao),
  INDEX idx_rkfinal_usuario (usuario_id)
);

CREATE TABLE IF NOT EXISTS recompensas_ranking (
  temporada VARCHAR(16) NOT NULL,
  categoria ENUM('gols','assistencias','pontos','craque') NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  posicao INT NOT NULL,
  itens JSON NOT NULL,
  titulo VARCHAR(80) NOT NULL,
  entregue_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (temporada, categoria, usuario_id),
  INDEX idx_rkpremio_usuario (usuario_id)
);
