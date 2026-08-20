-- =========================================================
-- AUDITORIA — log de alteracoes campo a campo
--
-- Ate aqui o unico rastro de atividade era usuarios.ultimo_acesso: nao dava
-- para responder "quem mudou a etapa desta ovelha?" nem atender a um pedido
-- de LGPD sobre o historico de um dado pessoal.
--
-- O log e append-only: o trigger escreve (security definer, por fora do RLS)
-- e o app so le. Nao existe policy de insert/update/delete em auditoria, entao
-- nem um admin consegue adulterar o historico pela API.
-- =========================================================

create table auditoria (
  id uuid primary key default uuid_generate_v4(),
  comunidade_id uuid references comunidades(id) on delete cascade,
  tabela text not null,
  registro_id uuid,
  operacao text not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  campo text,                    -- null em INSERT/DELETE (a linha inteira)
  valor_antigo text,
  valor_novo text,
  usuario_id uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index idx_auditoria_registro on auditoria(tabela, registro_id, criado_em desc);
create index idx_auditoria_comunidade on auditoria(comunidade_id, criado_em desc);
create index idx_auditoria_usuario on auditoria(usuario_id, criado_em desc);

comment on table auditoria is
  'Log append-only de alteracoes. Escrito por trigger; sem policy de escrita, de proposito.';

-- =========================================================
-- COLUNAS DE CONTEUDO SENSIVEL
--
-- Para estas colunas o log guarda que houve mudanca, mas nao o conteudo. Se o
-- valor fosse copiado para ca, o relato confidencial de um acompanhamento
-- pastoral passaria a existir em uma segunda tabela, com outro RLS — que e
-- exatamente o vazamento que a view de monitoria evita.
-- =========================================================
create or replace function auditoria_valor_visivel(p_campo text, p_valor text)
returns text
language sql
immutable
as $$
  select case
    when p_valor is null then null
    when p_campo in (
      'relato', 'temas_abordados', 'nivel_abertura', 'encaminhamentos',
      'observacoes', 'objetivo_atual'
    ) then '(conteudo omitido)'
    else p_valor
  end;
$$;

-- =========================================================
-- TRIGGER GENERICO
-- =========================================================
create or replace function auditoria_registrar()
returns trigger
language plpgsql
security definer
as $$
declare
  dados_novos jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  dados_antigos jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  linha jsonb := coalesce(dados_novos, dados_antigos);
  comunidade uuid;
  registro uuid;
  campo text;
  -- Ruido: mudam em toda escrita e nao dizem nada sobre a decisao de ninguem.
  ignorados text[] := array['criado_em', 'atualizado_em', 'ultimo_acesso', 'sincronizado'];
begin
  comunidade := nullif(linha ->> 'comunidade_id', '')::uuid;
  registro := nullif(linha ->> 'id', '')::uuid;

  if tg_op = 'UPDATE' then
    for campo in select jsonb_object_keys(dados_novos) loop
      continue when campo = any(ignorados);
      continue when dados_novos -> campo is not distinct from dados_antigos -> campo;

      insert into auditoria (comunidade_id, tabela, registro_id, operacao, campo, valor_antigo, valor_novo, usuario_id)
      values (
        comunidade,
        tg_table_name,
        registro,
        tg_op,
        campo,
        auditoria_valor_visivel(campo, dados_antigos ->> campo),
        auditoria_valor_visivel(campo, dados_novos ->> campo),
        auth.uid()
      );
    end loop;
  else
    -- INSERT/DELETE sao registrados como um evento da linha inteira; o detalhe
    -- campo a campo so faz sentido em UPDATE.
    insert into auditoria (comunidade_id, tabela, registro_id, operacao, campo, valor_antigo, valor_novo, usuario_id)
    values (comunidade, tg_table_name, registro, tg_op, null, null, null, auth.uid());
  end if;

  return coalesce(new, old);
end;
$$;

-- =========================================================
-- TABELAS AUDITADAS
--
-- pastoral_encontros fica FORA de proposito: e a tabela do relato. Auditar a
-- ovelha (etapa, estado, pastor responsavel) responde as perguntas de gestao
-- sem criar uma segunda copia do conteudo confidencial.
-- =========================================================
create trigger trg_auditoria_pessoas
  after insert or update or delete on pessoas
  for each row execute function auditoria_registrar();

create trigger trg_auditoria_pastoral_ovelhas
  after insert or update or delete on pastoral_ovelhas
  for each row execute function auditoria_registrar();

create trigger trg_auditoria_usuarios
  after insert or update or delete on usuarios
  for each row execute function auditoria_registrar();

create trigger trg_auditoria_permissoes
  after insert or update or delete on permissoes
  for each row execute function auditoria_registrar();

create trigger trg_auditoria_financeiro
  after insert or update or delete on financeiro
  for each row execute function auditoria_registrar();

create trigger trg_auditoria_comunidades
  after update on comunidades
  for each row execute function auditoria_registrar();

-- comunidades nao tem coluna comunidade_id; o proprio id e a comunidade.
create or replace function auditoria_corrige_comunidade()
returns trigger
language plpgsql
as $$
begin
  if new.comunidade_id is null and new.tabela = 'comunidades' then
    new.comunidade_id := new.registro_id;
  end if;
  return new;
end;
$$;

create trigger trg_auditoria_corrige_comunidade
  before insert on auditoria
  for each row execute function auditoria_corrige_comunidade();

-- =========================================================
-- PERMISSAO E RLS
-- =========================================================
insert into permissoes_modulos (chave, nome, grupo, acoes, ordem) values
  ('auditoria', 'Auditoria', 'Sistema', array['ver'], 160);

insert into permissoes (comunidade_id, perfil, modulo, acao, permitido)
select null, perfil, 'auditoria', 'ver', perfil = 'admin'
from unnest(array['missionario','lider','coordenador','padre','admin']) as perfil;

alter table auditoria enable row level security;

create policy "auditoria_select" on auditoria
  for select using (
    comunidade_id = auth_comunidade_id() and auth_pode('auditoria', 'ver')
  );

-- Sem policy de INSERT/UPDATE/DELETE: o log so cresce, e so pelo trigger.
