-- =========================================================
-- MENSAGENS_TEMPLATES — templates reutilizáveis de mensagem
-- Rodar manualmente no SQL Editor do Supabase, depois de schema.sql
-- =========================================================

create table mensagens_templates (
  id uuid primary key default uuid_generate_v4(),
  comunidade_id uuid not null references comunidades(id) on delete cascade,
  nome text not null,
  titulo text,
  corpo text not null,
  criado_em timestamptz not null default now()
);

create unique index idx_mensagens_templates_comunidade_nome on mensagens_templates(comunidade_id, nome);

alter table mensagens_templates enable row level security;

-- leitura: qualquer usuário da comunidade pode usar templates ao compor mensagem
create policy "mensagens_templates_select_comunidade" on mensagens_templates
  for select using (comunidade_id = auth_comunidade_id());

-- escrita (criar/editar/apagar templates): só coordenador/admin, mesmo padrão de mensagens_enviadas
create policy "mensagens_templates_write_lideranca" on mensagens_templates
  for all using (comunidade_id = auth_comunidade_id() and auth_perfil() in ('coordenador', 'admin'))
  with check (comunidade_id = auth_comunidade_id() and auth_perfil() in ('coordenador', 'admin'));

-- seed: 4 templates padrão para cada comunidade já existente
insert into mensagens_templates (comunidade_id, nome, titulo, corpo)
select c.id, t.nome, t.titulo, t.corpo
from comunidades c
cross join (
  values
    ('Convite para célula', 'Vem pra célula!', 'Oi {{nome}}! Nossa célula acontece toda semana e vai ser incrível te ver por lá. Confirma presença? 🙏'),
    ('Lembrete de retiro', 'Falta pouco para o retiro!', 'Oi {{nome}}, o retiro está chegando! Não esqueça de trazer roupas confortáveis e muita disposição para o encontro com Deus.'),
    ('Boas-vindas', 'Seja bem-vindo(a)!', 'Oi {{nome}}, que alegria ter você com a gente! Qualquer dúvida, estamos aqui.'),
    ('Convite para contribuir', 'Contamos com você', 'Oi {{nome}}, lembrando que sua contribuição ajuda a manter nossa missão viva. Deus te abençoe!')
) as t(nome, titulo, corpo)
on conflict (comunidade_id, nome) do nothing;
