-- MissãoApp ERP Completo — Fase 2 (colunas/tabelas novas do prompt "ERP Completo e Integrado")
-- Rodar manualmente no SQL Editor do Supabase, depois de todas as migrations anteriores.

-- 1) Pessoas: foto e objetivo do acompanhamento
alter table pessoas add column if not exists foto_url text;
alter table pessoas add column if not exists objetivo_atual text;

-- 2) Ministerio_presencas: agora aceita membro sem login (pessoa_id), igual ministerio_membros já aceita.
-- usuario_id deixa de ser obrigatório; precisa ter usuario_id OU pessoa_id.
alter table ministerio_presencas alter column usuario_id drop not null;
alter table ministerio_presencas add column if not exists pessoa_id uuid references pessoas(id);
alter table ministerio_presencas add constraint ministerio_presencas_usuario_ou_pessoa
  check (usuario_id is not null or pessoa_id is not null);

-- unicidade por pessoa (a de usuario_id já existe via UNIQUE(encontro_id, usuario_id) do schema original)
create unique index if not exists idx_ministerio_presencas_pessoa_unica
  on ministerio_presencas(encontro_id, pessoa_id)
  where pessoa_id is not null;

-- 3) Ministerio_financeiro.doador_id passa a apontar pro cadastro central de pessoas
-- (antes apontava pra usuarios — doador não precisa ter login no app).
-- Preserva o nome de quem doou em doador_nome antes de zerar o vínculo antigo,
-- pra não perder informação já registrada.
update ministerio_financeiro mf
  set doador_nome = coalesce(mf.doador_nome, (select u.nome from usuarios u where u.id = mf.doador_id))
  where mf.doador_id is not null;

alter table ministerio_financeiro drop constraint if exists ministerio_financeiro_doador_id_fkey;
update ministerio_financeiro set doador_id = null;
alter table ministerio_financeiro add constraint ministerio_financeiro_doador_id_fkey
  foreign key (doador_id) references pessoas(id);

-- 4) Comunidades: URL do embed do Google Calendar (módulo Agenda) — reaproveita a coluna
-- google_calendar_url já criada em migration_configuracoes.sql; nada a fazer aqui além
-- de documentar que é essa a coluna usada pelo módulo /agenda.
