-- =========================================================
-- AGENDA — eventos avulsos
-- =========================================================
-- Complementa a agenda agregada (encontros de ministério, reuniões pastorais
-- e retiros) permitindo cadastrar compromissos que não pertencem a nenhum
-- desses módulos (missa, formação, reunião geral, evangelização...).

create table if not exists agenda_eventos (
  id uuid primary key default uuid_generate_v4(),
  comunidade_id uuid not null references comunidades(id) on delete cascade,
  criado_por uuid not null references usuarios(id),
  titulo text not null,
  descricao text,
  local text,
  data_inicio timestamptz not null,
  data_fim timestamptz,
  dia_inteiro boolean not null default false,
  tipo text not null default 'geral',
  -- 'geral','missa','formacao','reuniao','evangelizacao'
  visivel_para text not null default 'todos',
  -- 'todos','lideranca','missionarios'
  criado_em timestamptz not null default now()
);

create index if not exists idx_agenda_eventos_comunidade on agenda_eventos(comunidade_id, data_inicio);

alter table agenda_eventos enable row level security;

-- Leitura respeita o alcance escolhido em visivel_para
create policy "agenda_eventos_select" on agenda_eventos
  for select using (
    comunidade_id = auth_comunidade_id() and (
      visivel_para = 'todos' or
      (visivel_para = 'lideranca' and auth_perfil() in ('coordenador', 'padre', 'admin')) or
      (visivel_para = 'missionarios' and auth_perfil() in ('missionario', 'lider', 'coordenador', 'padre', 'admin'))
    )
  );

-- Só liderança cria/edita/exclui
create policy "agenda_eventos_write" on agenda_eventos
  for all using (
    comunidade_id = auth_comunidade_id()
    and auth_perfil() in ('coordenador', 'padre', 'admin')
  )
  with check (
    comunidade_id = auth_comunidade_id()
    and auth_perfil() in ('coordenador', 'padre', 'admin')
  );
