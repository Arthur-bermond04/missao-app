-- =========================================================
-- VÍNCULOS DE PESSOAS COM OS DEMAIS MÓDULOS
-- Rodar depois de migration_pessoas.sql
-- =========================================================

-- Evangelização: cada contato pode estar ligado a um registro central de pessoa
ALTER TABLE contatos ADD COLUMN IF NOT EXISTS pessoa_id uuid REFERENCES pessoas(id);
CREATE INDEX IF NOT EXISTS idx_contatos_pessoa ON contatos(pessoa_id);

-- Retiros: inscrição pode estar ligada a uma pessoa cadastrada
ALTER TABLE inscricoes_retiro ADD COLUMN IF NOT EXISTS pessoa_id uuid REFERENCES pessoas(id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_pessoa ON inscricoes_retiro(pessoa_id);

-- Pastoral: ovelha pode estar ligada a uma pessoa cadastrada
ALTER TABLE pastoral_ovelhas ADD COLUMN IF NOT EXISTS pessoa_id uuid REFERENCES pessoas(id);
CREATE INDEX IF NOT EXISTS idx_pastoral_ovelhas_pessoa ON pastoral_ovelhas(pessoa_id);

-- Ministérios: membro pode ser uma pessoa sem login (pessoa_id) OU um
-- usuário com login (usuario_id) — usuario_id continua NOT NULL hoje
-- (schema.sql), então tornamos opcional para permitir membros só-pessoa.
ALTER TABLE ministerio_membros ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE ministerio_membros ADD COLUMN IF NOT EXISTS pessoa_id uuid REFERENCES pessoas(id);
CREATE INDEX IF NOT EXISTS idx_ministerio_membros_pessoa ON ministerio_membros(pessoa_id);

-- Garante que cada linha de ministerio_membros tenha pelo menos um vínculo
-- (usuário OU pessoa), nunca os dois nulos.
ALTER TABLE ministerio_membros
  ADD CONSTRAINT ministerio_membros_usuario_ou_pessoa
  CHECK (usuario_id IS NOT NULL OR pessoa_id IS NOT NULL);

-- Evita duplicar a mesma pessoa (sem login) duas vezes no mesmo ministério
-- (o schema.sql já garante isso para usuario_id via UNIQUE(ministerio_id, usuario_id)).
CREATE UNIQUE INDEX IF NOT EXISTS idx_ministerio_membros_pessoa_unica
  ON ministerio_membros(ministerio_id, pessoa_id)
  WHERE pessoa_id IS NOT NULL;
