-- Agendamento de mensagens recorrentes (Bloco 2.4b do prompt "Melhorias UI")
-- Rodar manualmente no SQL Editor do Supabase.

alter table mensagens_enviadas add column if not exists recorrencia text;
-- valores: null (não recorrente), 'semanal', 'mensal'
-- OBS: isso só grava a intenção de recorrência — o disparo automático
-- recorrente depende de um job agendado (cron/edge function) que ainda
-- não existe neste projeto, assim como o disparo real de push/WhatsApp/e-mail.
