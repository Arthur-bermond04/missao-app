-- MissãoApp — Melhorias baseadas no feedback do usuário
-- Rodar manualmente no SQL Editor do Supabase, depois de todas as
-- migrations anteriores.

-- =========================================================
-- GRUPO 1 — Terminologia personalizável por comunidade
-- =========================================================
alter table comunidades add column if not exists terminologia jsonb not null
  default '{"etapa_cv":"CV","etapa_cal":"CAL","nome_ovelha":"Ovelha","nome_pastor":"Pastor"}'::jsonb;

-- =========================================================
-- GRUPO 2 — Origem "outro" com texto livre + tipos de evento
-- personalizáveis (pastoral_presencas.nome_evento e
-- ministerio_encontros já existem no schema — nada a migrar lá)
-- =========================================================
alter table pessoas add column if not exists origem_descricao text;

create table if not exists tipos_evento_comunidade (
  id uuid primary key default uuid_generate_v4(),
  comunidade_id uuid not null references comunidades(id) on delete cascade,
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique(comunidade_id, nome)
);

alter table tipos_evento_comunidade enable row level security;

create policy "tipos_evento_select" on tipos_evento_comunidade
  for select using (comunidade_id = auth_comunidade_id());

create policy "tipos_evento_write" on tipos_evento_comunidade
  for all using (comunidade_id = auth_comunidade_id() and auth_perfil() in ('coordenador', 'admin'))
  with check (comunidade_id = auth_comunidade_id() and auth_perfil() in ('coordenador', 'admin'));

-- seed: 5 tipos padrão para toda comunidade já existente (novas comunidades
-- precisam ser semeadas manualmente ou por um trigger — fora de escopo aqui)
insert into tipos_evento_comunidade (comunidade_id, nome)
select c.id, t.nome_evento
from comunidades c
cross join unnest(array['Missa','Célula','Retiro','Ministério','Formação']) as t(nome_evento)
on conflict (comunidade_id, nome) do nothing;

-- =========================================================
-- GRUPO 3 — Exclusão permanente: falta política de DELETE em
-- pessoas (hoje só existe select/insert/update). Restrita a admin —
-- arquivar (ativo=false) continua disponível pra pastor/responsável
-- via UPDATE, que já é permitido.
-- =========================================================
create policy "pessoas_delete_admin" on pessoas
  for delete using (comunidade_id = auth_comunidade_id() and auth_perfil() = 'admin');

-- =========================================================
-- GRUPO 4 — Frutos do acompanhamento pastoral
-- =========================================================
create table if not exists pastoral_frutos (
  id uuid primary key default uuid_generate_v4(),
  ovelha_id uuid not null references pastoral_ovelhas(id) on delete cascade,
  pastor_id uuid not null references usuarios(id),
  data date not null default current_date,
  tipo text not null default 'conquista',
  -- 'conquista', 'sacramento', 'missao', 'cura', 'conversao', 'outro'
  titulo text not null,
  descricao text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_pastoral_frutos_ovelha on pastoral_frutos(ovelha_id);

alter table pastoral_frutos enable row level security;

-- mesma regra de confidencialidade do resto do módulo pastoral
create policy "pastoral_frutos_all" on pastoral_frutos
  for all using (
    ovelha_id in (
      select id from pastoral_ovelhas
      where pastor_id = auth.uid() or auth_perfil() = 'admin'
    )
  );

-- =========================================================
-- GRUPO 6 — Equipe (estrutura/cargos da comunidade, com ou sem login)
-- =========================================================
create table if not exists equipe_cargos (
  id uuid primary key default uuid_generate_v4(),
  comunidade_id uuid not null references comunidades(id) on delete cascade,
  pessoa_id uuid references pessoas(id),
  usuario_id uuid references usuarios(id),
  -- pessoa_id OU usuario_id (nunca os dois nulos)
  cargo text not null,
  cargo_descricao text,
  -- cargo customizado quando "Outro" é escolhido
  nivel text not null default 'membro',
  -- 'lideranca', 'formacao', 'servico', 'membro'
  celula_id uuid references celulas(id),
  data_inicio date default current_date,
  data_fim date,
  ativo boolean not null default true,
  notas text,
  criado_em timestamptz not null default now(),
  constraint equipe_cargos_pessoa_ou_usuario check (pessoa_id is not null or usuario_id is not null)
);

create index if not exists idx_equipe_cargos_comunidade on equipe_cargos(comunidade_id);

alter table equipe_cargos enable row level security;

create policy "equipe_select" on equipe_cargos
  for select using (comunidade_id = auth_comunidade_id());

create policy "equipe_write" on equipe_cargos
  for all using (comunidade_id = auth_comunidade_id() and auth_perfil() in ('coordenador', 'admin'))
  with check (comunidade_id = auth_comunidade_id() and auth_perfil() in ('coordenador', 'admin'));
