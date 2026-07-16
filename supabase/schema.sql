-- MissãoApp — schema inicial Supabase (PostgreSQL)
-- Rodar no SQL Editor do Supabase (ou via supabase db push)

create extension if not exists "uuid-ossp";

-- =========================================================
-- COMUNIDADES
-- =========================================================
create table comunidades (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  tipo text not null check (tipo in ('paroquia', 'comunidade', 'movimento')),
  plano text not null default 'semente' check (plano in ('semente', 'missao', 'diocese')),
  max_contatos integer default 50,
  criado_em timestamptz not null default now()
);

-- =========================================================
-- USUARIOS
-- =========================================================
create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  comunidade_id uuid references comunidades(id) on delete set null,
  nome text not null,
  telefone text,
  perfil text not null check (perfil in ('missionario', 'lider', 'coordenador', 'padre', 'admin')),
  ativo boolean not null default true,
  dispositivo_id text,
  ultimo_acesso timestamptz,
  criado_em timestamptz not null default now()
);

-- =========================================================
-- CONTATOS
-- =========================================================
create table contatos (
  id uuid primary key default uuid_generate_v4(),
  comunidade_id uuid not null references comunidades(id) on delete cascade,
  missionario_id uuid references usuarios(id) on delete set null,
  nome text not null,
  telefone text,
  idade integer,
  nivel_interesse text not null default 'morno' check (nivel_interesse in ('quente', 'morno', 'frio')),
  local_abordagem text,
  latitude double precision,
  longitude double precision,
  data_abordagem timestamptz not null default now(),
  tags text[] default '{}',
  observacoes text,
  etapa_jornada text not null default 'abordagem' check (etapa_jornada in ('abordagem', 'celula', 'retiro', 'cv', 'cal')),
  proximo_contato date,
  sincronizado boolean not null default true,
  criado_em timestamptz not null default now()
);

create index idx_contatos_comunidade on contatos(comunidade_id);
create index idx_contatos_missionario on contatos(missionario_id);

-- =========================================================
-- RETIROS
-- =========================================================
create table retiros (
  id uuid primary key default uuid_generate_v4(),
  comunidade_id uuid not null references comunidades(id) on delete cascade,
  nome text not null,
  data_inicio date not null,
  data_fim date not null,
  local text,
  vagas integer,
  valor numeric(10, 2),
  status text not null default 'aberto' check (status in ('aberto', 'encerrado', 'realizado')),
  criado_em timestamptz not null default now()
);

-- =========================================================
-- INSCRICOES_RETIRO
-- =========================================================
create table inscricoes_retiro (
  id uuid primary key default uuid_generate_v4(),
  retiro_id uuid not null references retiros(id) on delete cascade,
  contato_id uuid references contatos(id) on delete set null,
  usuario_id uuid references usuarios(id) on delete set null,
  nome text,
  telefone text,
  pagou boolean not null default false,
  valor_pago numeric(10, 2) default 0,
  grupo text,
  presente boolean not null default false,
  criado_em timestamptz not null default now()
);

create index idx_inscricoes_retiro on inscricoes_retiro(retiro_id);

-- =========================================================
-- CELULAS
-- =========================================================
create table celulas (
  id uuid primary key default uuid_generate_v4(),
  comunidade_id uuid not null references comunidades(id) on delete cascade,
  nome text not null,
  lider_id uuid references usuarios(id) on delete set null,
  dia_semana text,
  horario text,
  endereco text,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

-- =========================================================
-- FINANCEIRO
-- =========================================================
create table financeiro (
  id uuid primary key default uuid_generate_v4(),
  comunidade_id uuid not null references comunidades(id) on delete cascade,
  tipo text not null check (tipo in ('receita', 'despesa')),
  categoria text not null,
  descricao text,
  valor numeric(10, 2) not null,
  data date not null default current_date,
  retiro_id uuid references retiros(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index idx_financeiro_comunidade on financeiro(comunidade_id);

-- =========================================================
-- MENSAGENS_ENVIADAS
-- =========================================================
create table mensagens_enviadas (
  id uuid primary key default uuid_generate_v4(),
  comunidade_id uuid not null references comunidades(id) on delete cascade,
  remetente_id uuid references usuarios(id) on delete set null,
  canal text not null check (canal in ('push', 'whatsapp', 'email', 'sms')),
  destinatarios text not null,
  titulo text,
  corpo text not null,
  enviado_em timestamptz,
  total_enviados integer default 0,
  criado_em timestamptz not null default now()
);

-- =========================================================
-- LEMBRETES
-- =========================================================
create table lembretes (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  contato_id uuid references contatos(id) on delete cascade,
  data_lembrete date not null,
  texto text,
  concluido boolean not null default false,
  criado_em timestamptz not null default now()
);

create index idx_lembretes_usuario on lembretes(usuario_id);

-- =========================================================
-- FUNÇÕES AUXILIARES (para RLS)
-- =========================================================

-- Retorna a comunidade do usuário autenticado
create or replace function auth_comunidade_id()
returns uuid
language sql
stable
security definer
as $$
  select comunidade_id from usuarios where id = auth.uid();
$$;

-- Retorna o perfil do usuário autenticado
create or replace function auth_perfil()
returns text
language sql
stable
security definer
as $$
  select perfil from usuarios where id = auth.uid();
$$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table comunidades enable row level security;
alter table usuarios enable row level security;
alter table contatos enable row level security;
alter table retiros enable row level security;
alter table inscricoes_retiro enable row level security;
alter table celulas enable row level security;
alter table financeiro enable row level security;
alter table mensagens_enviadas enable row level security;
alter table lembretes enable row level security;

-- COMUNIDADES: usuário só vê a própria comunidade
create policy "comunidade_select_propria" on comunidades
  for select using (id = auth_comunidade_id());

create policy "comunidade_update_admin" on comunidades
  for update using (id = auth_comunidade_id() and auth_perfil() = 'admin');

-- USUARIOS: vê usuários da própria comunidade
create policy "usuarios_select_mesma_comunidade" on usuarios
  for select using (comunidade_id = auth_comunidade_id());

create policy "usuarios_update_proprio_ou_admin" on usuarios
  for update using (id = auth.uid() or auth_perfil() in ('admin', 'coordenador'));

create policy "usuarios_insert_admin" on usuarios
  for insert with check (auth_perfil() in ('admin', 'coordenador'));

-- CONTATOS: missionário vê/gerencia os próprios; líder/coordenador/admin vê todos da comunidade
create policy "contatos_select_comunidade" on contatos
  for select using (comunidade_id = auth_comunidade_id());

create policy "contatos_insert_comunidade" on contatos
  for insert with check (comunidade_id = auth_comunidade_id());

create policy "contatos_update_proprio_ou_lideranca" on contatos
  for update using (
    comunidade_id = auth_comunidade_id()
    and (missionario_id = auth.uid() or auth_perfil() in ('lider', 'coordenador', 'admin'))
  );

create policy "contatos_delete_lideranca" on contatos
  for delete using (
    comunidade_id = auth_comunidade_id() and auth_perfil() in ('coordenador', 'admin')
  );

-- RETIROS: leitura para todos da comunidade, escrita para liderança
create policy "retiros_select_comunidade" on retiros
  for select using (comunidade_id = auth_comunidade_id());

create policy "retiros_write_lideranca" on retiros
  for all using (comunidade_id = auth_comunidade_id() and auth_perfil() in ('coordenador', 'admin'))
  with check (comunidade_id = auth_comunidade_id() and auth_perfil() in ('coordenador', 'admin'));

-- INSCRICOES_RETIRO: segue a comunidade do retiro
create policy "inscricoes_select" on inscricoes_retiro
  for select using (
    retiro_id in (select id from retiros where comunidade_id = auth_comunidade_id())
  );

create policy "inscricoes_write" on inscricoes_retiro
  for all using (
    retiro_id in (select id from retiros where comunidade_id = auth_comunidade_id())
  )
  with check (
    retiro_id in (select id from retiros where comunidade_id = auth_comunidade_id())
  );

-- CELULAS
create policy "celulas_select_comunidade" on celulas
  for select using (comunidade_id = auth_comunidade_id());

create policy "celulas_write_lideranca" on celulas
  for all using (comunidade_id = auth_comunidade_id() and auth_perfil() in ('lider', 'coordenador', 'admin'))
  with check (comunidade_id = auth_comunidade_id() and auth_perfil() in ('lider', 'coordenador', 'admin'));

-- FINANCEIRO: somente coordenador/admin
create policy "financeiro_select_lideranca" on financeiro
  for select using (comunidade_id = auth_comunidade_id() and auth_perfil() in ('coordenador', 'admin'));

create policy "financeiro_write_lideranca" on financeiro
  for all using (comunidade_id = auth_comunidade_id() and auth_perfil() in ('coordenador', 'admin'))
  with check (comunidade_id = auth_comunidade_id() and auth_perfil() in ('coordenador', 'admin'));

-- MENSAGENS_ENVIADAS: leitura da comunidade, envio para coordenador/admin
create policy "mensagens_select_comunidade" on mensagens_enviadas
  for select using (comunidade_id = auth_comunidade_id());

create policy "mensagens_insert_lideranca" on mensagens_enviadas
  for insert with check (comunidade_id = auth_comunidade_id() and auth_perfil() in ('coordenador', 'admin'));

-- LEMBRETES: cada usuário vê/gerencia os próprios lembretes
create policy "lembretes_proprio" on lembretes
  for all using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());
