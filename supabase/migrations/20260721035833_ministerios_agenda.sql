-- Agendamento de próximo encontro do ministério (Bloco 2.7b)
-- Rodar manualmente no SQL Editor do Supabase.

alter table ministerio_encontros add column if not exists status text not null default 'realizado';
-- 'agendado' (ainda vai acontecer, sem presença registrada) ou 'realizado'
-- (já aconteceu — é o que todo encontro criado antes desta migration já é)
