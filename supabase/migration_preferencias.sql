-- =========================================================
-- PREFERÊNCIAS DE NOTIFICAÇÃO — coluna nova em usuarios
-- Rodar manualmente no SQL Editor do Supabase, depois de schema.sql
-- =========================================================

alter table usuarios add column if not exists preferencias_notificacao jsonb not null default '{}'::jsonb;
