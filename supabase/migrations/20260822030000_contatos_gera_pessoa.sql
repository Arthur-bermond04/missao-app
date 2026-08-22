-- =========================================================
-- CONTATOS PASSA A SER SO BUFFER DE SYNC OFFLINE DO MOBILE
--
-- Item 4 do plano de simplificacao (doc "Funil, Pessoas, Acompanhamento e
-- Presenca v4"): contatos e ~90% redundante com pessoas. Abordagem
-- HIBRIDA, escolhida depois de descobrir que o app mobile tem uma camada
-- de sincronizacao offline (SQLite local + upsert quando volta conexao)
-- construida especificamente sobre a tabela contatos — reescrever isso
-- pra sincronizar direto com pessoas (schema bem maior, mais campos
-- obrigatorios, RLS diferente) seria um projeto a parte, com risco real
-- pro fluxo de evangelizacao de rua sem sinal, que e provavelmente o uso
-- mais critico do app. Entao:
--
--   - O app mobile NAO MUDA NADA: continua criando/atualizando em
--     contatos exatamente como sempre fez.
--   - O painel web PARA DE CRIAR em contatos (ver commit que atualiza
--     funil/page.tsx) — abordagem feita pelo web cria direto em pessoas.
--   - Este trigger garante que TODO contato (venha do mobile ou de uma
--     sincronizacao antiga) tenha uma pessoa correspondente, para o Funil
--     web (que passa a ler so pessoas) nunca ficar cego a uma abordagem
--     feita em campo. Sem isso, um contato sincronizado do celular so
--     apareceria no funil web depois de alguem promove-lo manualmente —
--     quebraria a visao fim-a-fim que ja existia hoje.
-- =========================================================

-- Mesmo mapeamento conceitual do funil de 5 etapas de contatos para o
-- funil de 7 etapas (mais rico) de pessoas. 'retiro' vira 'participando'
-- porque nao e bem uma etapa persistente — e um evento pontual, hoje
-- registrado tambem em pessoa_retiros quando a pessoa existe.
create or replace function mapear_etapa_contato_para_pessoa(etapa text)
returns text
language sql
immutable
as $$
  select case etapa
    when 'abordagem' then 'contato_inicial'
    when 'celula' then 'participando'
    when 'retiro' then 'participando'
    when 'cv' then 'cv'
    when 'cal' then 'cal'
    else 'contato_inicial'
  end;
$$;

create or replace function contatos_gera_pessoa()
returns trigger
language plpgsql
security definer
as $$
declare
  nova_pessoa_id uuid;
begin
  -- Contato ja tem pessoa vinculada (promovido manualmente antes, ou o
  -- proprio insert ja trouxe o vinculo) — so propaga a etapa, nao duplica.
  -- Cobre tambem o UPDATE de um contato legado que so ganhou pessoa_id
  -- depois desta migration existir.
  if new.pessoa_id is not null then
    update pessoas
      set etapa_jornada = mapear_etapa_contato_para_pessoa(new.etapa_jornada)
      where id = new.pessoa_id
        -- nunca regride uma pessoa que ja avancou por outro caminho
        -- (encontro pastoral, retiro, formulario web) so por causa de um
        -- contato de campo desatualizado.
        and etapa_jornada in ('contato_inicial', 'interessado', 'participando');
    return new;
  end if;

  -- Sem pessoa_id ainda — cobre tanto o insert normal quanto um UPDATE de
  -- contato legado (criado antes desta migration, nunca promovido).
  -- missionario_id pode ser nulo (ON DELETE SET NULL na FK); nesse caso
  -- extremo cai num admin qualquer da comunidade só para satisfazer
  -- pessoas.cadastrado_por NOT NULL — não deveria acontecer no fluxo normal
  -- do mobile, que sempre atrela ao usuário logado.
  insert into pessoas (
    comunidade_id, cadastrado_por, nome, telefone, idade,
    origem, local_primeiro_contato, data_primeiro_contato,
    etapa_jornada, responsavel_id
  ) values (
    new.comunidade_id,
    coalesce(new.missionario_id, (select id from usuarios where comunidade_id = new.comunidade_id and perfil = 'admin' limit 1)),
    new.nome,
    new.telefone,
    new.idade,
    'evangelizacao',
    new.local_abordagem,
    new.data_abordagem::date,
    mapear_etapa_contato_para_pessoa(new.etapa_jornada),
    new.missionario_id
  )
  returning id into nova_pessoa_id;

  new.pessoa_id := nova_pessoa_id;
  return new;
end;
$$;

-- BEFORE (nao AFTER): precisa poder setar new.pessoa_id no INSERT antes da
-- linha ser gravada. No UPDATE so propaga a etapa (ver acima), nao
-- reescreve pessoa_id.
create trigger trg_contatos_gera_pessoa
  before insert or update of etapa_jornada on contatos
  for each row execute function contatos_gera_pessoa();

comment on function contatos_gera_pessoa() is
  'Mantem contatos e pessoas em sincronia de um so lado: todo contato (tipicamente vindo do sync offline do mobile) ganha uma pessoa correspondente automaticamente, para o Funil web (que le só pessoas) nunca ficar cego a uma abordagem feita em campo.';

-- =========================================================
-- BACKFILL — contatos ja existentes antes desta migration, sem pessoa_id.
-- O trigger so dispara em insert/update novos; sem isso, os contatos
-- historicos ficariam de fora do funil web indefinidamente. UPDATE ... SET
-- etapa_jornada = etapa_jornada dispara o "before update of etapa_jornada"
-- mesmo sem mudar o valor.
-- =========================================================
update contatos set etapa_jornada = etapa_jornada where pessoa_id is null;
