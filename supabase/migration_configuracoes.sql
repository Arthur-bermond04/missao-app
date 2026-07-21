-- Aba Financeiro + aba Integrações + horários de missa (Bloco 2.9)
-- Rodar manualmente no SQL Editor do Supabase.
-- (meta_arrecadacao_mensal e categorias_financeiras já foram adicionados em
--  migration_financeiro_metas.sql — só rode esta aqui depois daquela)

alter table comunidades add column if not exists banco text;
alter table comunidades add column if not exists agencia text;
alter table comunidades add column if not exists conta text;
-- dados bancários: só referência interna, não integra com banco de verdade

alter table comunidades add column if not exists google_calendar_url text;
-- URL do iframe do Google Calendar embutido (não é segredo, é uma URL pública de embed)

alter table comunidades add column if not exists horarios_missa jsonb not null default '[]'::jsonb;
-- lista de { dia_semana, horario, local }
