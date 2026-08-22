-- =========================================================
-- FIX: contatos_gera_pessoa() nao copiava nivel_interesse/observacoes
--
-- Testando a migration 20260822030000 em producao (simulando um insert de
-- contato como o sync do mobile faz), a pessoa criada automaticamente
-- sempre saia com nivel_interesse = 'morno' (o default da coluna) e
-- observacoes = null, ignorando o que o contato de fato trazia -- perda de
-- dado silenciosa. CREATE OR REPLACE FUNCTION substitui só o corpo da
-- function; o trigger já existente continua apontando pra ela, sem precisar
-- recriar o trigger.
-- =========================================================

create or replace function contatos_gera_pessoa()
returns trigger
language plpgsql
security definer
as $$
declare
  nova_pessoa_id uuid;
begin
  if new.pessoa_id is not null then
    update pessoas
      set etapa_jornada = mapear_etapa_contato_para_pessoa(new.etapa_jornada)
      where id = new.pessoa_id
        and etapa_jornada in ('contato_inicial', 'interessado', 'participando');
    return new;
  end if;

  insert into pessoas (
    comunidade_id, cadastrado_por, nome, telefone, idade,
    nivel_interesse, origem, local_primeiro_contato, data_primeiro_contato,
    etapa_jornada, responsavel_id, observacoes
  ) values (
    new.comunidade_id,
    coalesce(new.missionario_id, (select id from usuarios where comunidade_id = new.comunidade_id and perfil = 'admin' limit 1)),
    new.nome,
    new.telefone,
    new.idade,
    new.nivel_interesse,
    'evangelizacao',
    new.local_abordagem,
    new.data_abordagem::date,
    mapear_etapa_contato_para_pessoa(new.etapa_jornada),
    new.missionario_id,
    new.observacoes
  )
  returning id into nova_pessoa_id;

  new.pessoa_id := nova_pessoa_id;
  return new;
end;
$$;
