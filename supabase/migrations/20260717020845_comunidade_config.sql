-- =========================================================
-- CONFIGURAÇÕES DA COMUNIDADE — campos novos para a tela /configuracoes
-- Rodar manualmente no SQL Editor do Supabase, depois de schema.sql
-- =========================================================

alter table comunidades add column if not exists telefone text;
alter table comunidades add column if not exists logo_url text;
