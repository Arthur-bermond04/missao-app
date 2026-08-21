-- =========================================================
-- CELULA_ENCONTROS + CELULA_PRESENCAS
--
-- Ate aqui Grupos (celulas) era a unica estrutura de encontro recorrente do
-- app sem tabela propria de presenca — so Ministerios tinha
-- (ministerio_encontros/ministerio_presencas). Sem isso, o pedido de campo
-- "nao consigo confiar em reconhecer nomes de cor pra marcar presenca" nao
-- tinha onde pousar: nao existia registro de quem esteve em qual encontro.
--
-- Espelha a estrutura de ministerio_encontros/ministerio_presencas (mesmas
-- colunas usuario_id/pessoa_id, mesma regra "um dos dois, nao os dois").
-- Presenca de celula tende a incluir gente que nao tem cargo formal na
-- celula (equipe_cargos.celula_id e sobre lideranca, nao sobre quem
-- frequenta) — por isso a tela de registro busca em toda a pessoas() da
-- comunidade, nao so nos membros vinculados.
-- =========================================================

create table celula_encontros (
  id uuid primary key default uuid_generate_v4(),
  celula_id uuid not null references celulas(id) on delete cascade,
  data date not null,
  horario time,
  local text,
  observacoes text,
  status text not null default 'realizado' check (status in ('agendado', 'realizado', 'cancelado')),
  criado_em timestamptz not null default now()
);

create index idx_celula_encontros_celula on celula_encontros(celula_id, data desc);

create table celula_presencas (
  id uuid primary key default uuid_generate_v4(),
  encontro_id uuid not null references celula_encontros(id) on delete cascade,
  usuario_id uuid references usuarios(id),
  pessoa_id uuid references pessoas(id),
  presente boolean not null default true,
  criado_em timestamptz not null default now(),
  constraint celula_presencas_usuario_ou_pessoa check (usuario_id is not null or pessoa_id is not null)
);

create unique index idx_celula_presencas_usuario_unica
  on celula_presencas(encontro_id, usuario_id)
  where usuario_id is not null;

create unique index idx_celula_presencas_pessoa_unica
  on celula_presencas(encontro_id, pessoa_id)
  where pessoa_id is not null;

-- =========================================================
-- RLS
--
-- Diferente do padrao antigo de ministerio_encontros/presencas (escrita
-- liberada pra qualquer um da comunidade, sem checar perfil — decisao de
-- antes da tabela de permissoes existir), aqui a escrita ja nasce checando
-- auth_pode('celulas', ...), que e o padrao atual do app.
-- =========================================================

alter table celula_encontros enable row level security;
alter table celula_presencas enable row level security;

create policy "celula_encontros_select" on celula_encontros
  for select using (
    celula_id in (select id from celulas where comunidade_id = auth_comunidade_id())
  );

create policy "celula_encontros_insert" on celula_encontros
  for insert with check (
    celula_id in (select id from celulas where comunidade_id = auth_comunidade_id())
    and auth_pode('celulas', 'criar')
  );

create policy "celula_encontros_update" on celula_encontros
  for update using (
    celula_id in (select id from celulas where comunidade_id = auth_comunidade_id())
    and auth_pode('celulas', 'editar')
  )
  with check (
    celula_id in (select id from celulas where comunidade_id = auth_comunidade_id())
    and auth_pode('celulas', 'editar')
  );

create policy "celula_encontros_delete" on celula_encontros
  for delete using (
    celula_id in (select id from celulas where comunidade_id = auth_comunidade_id())
    and auth_pode('celulas', 'excluir')
  );

create policy "celula_presencas_select" on celula_presencas
  for select using (
    encontro_id in (
      select ce.id from celula_encontros ce
      join celulas c on c.id = ce.celula_id
      where c.comunidade_id = auth_comunidade_id()
    )
  );

create policy "celula_presencas_write" on celula_presencas
  for all using (
    encontro_id in (
      select ce.id from celula_encontros ce
      join celulas c on c.id = ce.celula_id
      where c.comunidade_id = auth_comunidade_id()
    )
    and auth_pode('celulas', 'editar')
  )
  with check (
    encontro_id in (
      select ce.id from celula_encontros ce
      join celulas c on c.id = ce.celula_id
      where c.comunidade_id = auth_comunidade_id()
    )
    and auth_pode('celulas', 'editar')
  );
