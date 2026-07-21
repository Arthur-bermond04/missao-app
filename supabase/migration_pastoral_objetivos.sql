-- Histórico de objetivos do acompanhamento pastoral (Bloco 2.8c)
-- Rodar manualmente no SQL Editor do Supabase.

create table pastoral_objetivos (
  id uuid primary key default uuid_generate_v4(),
  ovelha_id uuid not null references pastoral_ovelhas(id) on delete cascade,
  objetivo text not null,
  data_inicio date not null default current_date,
  data_fim date,
  resultado text,
  criado_em timestamptz not null default now()
);

create index idx_pastoral_objetivos_ovelha on pastoral_objetivos(ovelha_id);

alter table pastoral_objetivos enable row level security;

-- Mesma regra de confidencialidade das outras tabelas pastorais: só o
-- pastor da ovelha (ou admin) vê/edita o histórico de objetivos.
create policy "pastoral_objetivos_all" on pastoral_objetivos
  for all using (
    ovelha_id in (
      select id from pastoral_ovelhas
      where pastor_id = auth.uid() or auth_perfil() = 'admin'
    )
  );
