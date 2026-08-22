-- =========================================================
-- PASTORAL_OVELHAS.PESSOA_ID OBRIGATORIO EM REGISTROS NOVOS
--
-- Item 2 do plano de simplificacao (doc "Funil, Pessoas, Acompanhamento e
-- Presenca v4"): pessoa_id era opcional desde sempre (adicionado em
-- migration_pessoas_vinculos.sql como coluna nullable), e o modal de
-- cadastro (NovaOvelhaModal.tsx) deixava criar uma ovelha digitando
-- nome/telefone/idade soltos, sem nunca vincular ao cadastro central de
-- pessoas -- exatamente a duplicacao que esse cadastro central deveria
-- evitar.
--
-- NAO usamos "alter column pessoa_id set not null": isso quebraria
-- qualquer linha ja existente sem o vinculo (e ha pelo menos uma, criada
-- antes desta migration). Em vez disso, um trigger BEFORE INSERT exige o
-- vinculo so para linhas NOVAS -- dado antigo fica intocado, sem migracao
-- de dado forcada.
-- =========================================================

create or replace function pastoral_ovelhas_exige_pessoa()
returns trigger
language plpgsql
as $$
begin
  if new.pessoa_id is null then
    raise exception 'pastoral_ovelhas.pessoa_id e obrigatorio em registros novos — vincule a uma pessoa do cadastro central (crie uma nova em Pessoas se ainda nao existir)';
  end if;
  return new;
end;
$$;

create trigger trg_pastoral_ovelhas_exige_pessoa
  before insert on pastoral_ovelhas
  for each row execute function pastoral_ovelhas_exige_pessoa();

comment on column pastoral_ovelhas.pessoa_id is
  'Obrigatorio em registros novos (trigger trg_pastoral_ovelhas_exige_pessoa) — registros criados antes desta migration podem estar sem o vinculo.';

comment on column pastoral_ovelhas.nome is
  'Copiado de pessoas.nome no momento da criacao, para telas que hoje leem essa coluna direto sem join. Nao e mais editavel solto no cadastro — diverge de pessoas.nome so se a pessoa for renomeada depois sem essa tela propagar a mudanca (nenhuma automatiza isso ainda).';
