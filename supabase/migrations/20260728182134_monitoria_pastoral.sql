-- =========================================================
-- MONITORIA PASTORAL — métricas de acompanhamento sem expor conteúdo
-- =========================================================
--
-- REGRA DE OURO: o coordenador pode ver MÉTRICAS (quantas ovelhas, com que
-- frequência, estado geral, último encontro) mas NUNCA o CONTEÚDO dos
-- encontros (relato, temas_abordados, nivel_abertura, encaminhamentos).
--
-- Como o RLS de pastoral_ovelhas/pastoral_encontros hoje só deixa o próprio
-- pastor (ou admin) ler as linhas, o coordenador não enxerga os outros
-- pastores. Em vez de afrouxar esse RLS (o que exporia os relatos via API),
-- criamos uma VIEW que:
--   1. roda com direito do owner (security_invoker = off, padrão no Postgres)
--      — portanto contorna o RLS das tabelas base;
--   2. seleciona SÓ colunas seguras (nunca relato/temas/abertura/
--      encaminhamentos), então o conteúdo confidencial é inacessível por ela;
--   3. filtra internamente por comunidade e por perfil coordenador/admin, de
--      modo que missionário/líder/padre não recebem nada e ninguém vê outra
--      comunidade.
-- Assim o limite fica no banco (a view não tem as colunas sensíveis) e na UI.

create or replace view pastoral_ovelhas_resumo
with (security_invoker = off) as
select
  o.id,
  o.pastor_id,
  o.comunidade_id,
  o.nome,                          -- nome da ovelha (o coordenador pode ver)
  o.telefone,
  o.etapa_formacao,
  o.estado_espiritual,
  o.frequencia_acompanhamento,
  o.proxima_reuniao,
  o.ativo,
  (select count(*) from pastoral_encontros e where e.ovelha_id = o.id) as total_encontros,
  (select count(*) from pastoral_encontros e where e.ovelha_id = o.id and e.data >= current_date - 30)
    as encontros_ultimo_mes,
  (select max(e.data) from pastoral_encontros e where e.ovelha_id = o.id) as ultimo_encontro,
  current_date - (select max(e.data) from pastoral_encontros e where e.ovelha_id = o.id) as dias_sem_encontro
  -- NÃO inclui: relato, encaminhamentos, nivel_abertura, temas_abordados
from pastoral_ovelhas o
where o.comunidade_id = auth_comunidade_id()
  and auth_perfil() in ('coordenador', 'admin');

grant select on pastoral_ovelhas_resumo to authenticated;
