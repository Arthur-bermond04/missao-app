-- =========================================================
-- MONITORIA: TENDENCIA DE ENCONTROS + SINAL DE OBJETIVO PARADO
--
-- Itens 1.1 e 1.2 do doc "Poda do Sistema": a view so mostrava "quantos
-- encontros neste mes", sem dar pra saber se o ritmo esta subindo ou caindo,
-- e pastoral_objetivos (RLS restrita ao proprio pastor) nao aparecia na view
-- nenhuma — um coordenador precisava abrir cada ovelha pra saber se os
-- objetivos estavam sendo revisados.
--
-- Mesma tecnica das colunas que ja existiam: subquery de contagem/data sobre
-- pastoral_encontros e pastoral_objetivos, nunca o conteudo (objetivo,
-- relato) em si. O filtro da view (quem pode ver) nao muda.
-- =========================================================

create or replace view pastoral_ovelhas_resumo
with (security_invoker = off) as
select
  o.id,
  o.pastor_id,
  o.comunidade_id,
  o.nome,
  o.telefone,
  o.etapa_formacao,
  o.estado_espiritual,
  o.frequencia_acompanhamento,
  o.proxima_reuniao,
  o.ativo,
  (select count(*) from pastoral_encontros e where e.ovelha_id = o.id) as total_encontros,
  (select count(*) from pastoral_encontros e where e.ovelha_id = o.id and e.data >= current_date - 30)
    as encontros_ultimo_mes,
  -- Mesma janela de 30 dias, deslocada um mes pra tras — da pra comparar
  -- "este mes" com "mes passado" sem outra ida ao banco.
  (select count(*) from pastoral_encontros e
     where e.ovelha_id = o.id and e.data >= current_date - 60 and e.data < current_date - 30)
    as encontros_mes_anterior,
  (select max(e.data) from pastoral_encontros e where e.ovelha_id = o.id) as ultimo_encontro,
  current_date - (select max(e.data) from pastoral_encontros e where e.ovelha_id = o.id) as dias_sem_encontro,
  -- Data do objetivo mais recente (pastoral_objetivos.data_inicio) — nunca o
  -- texto do objetivo nem o resultado. null quando a ovelha nunca teve um
  -- objetivo registrado.
  current_date - (select max(ob.data_inicio) from pastoral_objetivos ob where ob.ovelha_id = o.id)
    as dias_sem_atualizar_objetivo
  -- NAO inclui: relato, encaminhamentos, nivel_abertura, temas_abordados,
  -- objetivo, resultado
from pastoral_ovelhas o
where o.comunidade_id = auth_comunidade_id()
  and (auth_pode('monitoria', 'ver') or auth_supervisiona(o.pastor_id));

grant select on pastoral_ovelhas_resumo to authenticated;
