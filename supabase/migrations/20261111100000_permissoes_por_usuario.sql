-- =========================================================
-- PERMISSOES POR USUARIO
--
-- Ate aqui o acesso era decidido so pelo PERFIL (perfil x modulo x acao, com
-- ajuste por comunidade). Esta migration adiciona um terceiro nivel, o mais
-- especifico: o AJUSTE DO USUARIO.
--
-- Ordem de decisao em auth_pode(modulo, acao):
--   1. ajuste do usuario        (usuario_permissoes)            <- novo
--   2. ajuste da comunidade     (permissoes, comunidade_id)
--   3. padrao do sistema        (permissoes, comunidade_id null)
--   4. negado
--
-- Sem nenhuma linha em usuario_permissoes o comportamento e EXATAMENTE o de
-- antes: rodar esta migration nao muda o acesso de ninguem.
--
-- So guarda a DIFERENCA em relacao ao perfil. Se o valor escolhido para um
-- usuario coincidir com o que o perfil ja da, o app apaga a linha, e o usuario
-- volta a acompanhar mudancas futuras do perfil.
-- =========================================================

create table usuario_permissoes (
  id uuid primary key default uuid_generate_v4(),
  -- Denormalizado de usuarios.comunidade_id: o gatilho de auditoria le a
  -- comunidade da propria linha, e a RLS fica simples.
  comunidade_id uuid not null references comunidades(id) on delete cascade,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  modulo text not null references permissoes_modulos(chave) on delete cascade,
  acao text not null check (acao in ('ver', 'criar', 'editar', 'excluir')),
  permitido boolean not null,
  criado_em timestamptz not null default now(),
  unique (usuario_id, modulo, acao)
);

create index idx_usuario_permissoes_usuario on usuario_permissoes(usuario_id);

comment on table usuario_permissoes is
  'Ajustes de permissao por usuario. Vencem o ajuste da comunidade e o padrao do sistema. Guarda so a diferenca em relacao ao perfil.';

alter table usuario_permissoes enable row level security;

-- Cada usuario le os proprios ajustes (o app precisa deles para montar o menu);
-- o admin le os da propria comunidade (e a tela de permissoes por usuario).
create policy "usuario_permissoes_select" on usuario_permissoes
  for select using (
    usuario_id = auth.uid()
    or (comunidade_id = auth_comunidade_id() and auth_perfil() = 'admin')
  );

-- So admin escreve, so na propria comunidade, e so para usuario da mesma
-- comunidade. O perfil e checado como literal ('admin') de proposito, como em
-- `permissoes`: se dependesse de auth_pode(), um admin poderia se trancar para
-- fora ajustando o proprio acesso.
create policy "usuario_permissoes_write_admin" on usuario_permissoes
  for all using (
    comunidade_id = auth_comunidade_id() and auth_perfil() = 'admin'
  )
  with check (
    comunidade_id = auth_comunidade_id()
    and auth_perfil() = 'admin'
    and exists (
      select 1 from usuarios u
      where u.id = usuario_permissoes.usuario_id
        and u.comunidade_id = usuario_permissoes.comunidade_id
    )
  );

-- Quem alterou o que, quando (mesmo gatilho das demais tabelas sensíveis).
create trigger trg_auditoria_usuario_permissoes
  after insert or update or delete on usuario_permissoes
  for each row execute function auditoria_registrar();

-- =========================================================
-- auth_pode(): passa a consultar o ajuste do usuario primeiro
-- =========================================================
create or replace function auth_pode(p_modulo text, p_acao text)
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    (
      select permitido from usuario_permissoes
      where usuario_id = auth.uid()
        and modulo = p_modulo
        and acao = p_acao
    ),
    (
      select permitido from permissoes
      where comunidade_id = auth_comunidade_id()
        and perfil = auth_perfil()
        and modulo = p_modulo
        and acao = p_acao
    ),
    (
      select permitido from permissoes
      where comunidade_id is null
        and perfil = auth_perfil()
        and modulo = p_modulo
        and acao = p_acao
    ),
    false
  );
$$;
