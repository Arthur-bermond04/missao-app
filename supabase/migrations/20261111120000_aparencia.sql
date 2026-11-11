-- =========================================================
-- APARENCIA: cor de destaque da comunidade + permissao propria
--
-- A comunidade escolhe, em Configuracoes > Aparencia, a cor que identifica a
-- marca (quadrado da comunidade, avatar do usuario, item ativo do menu, linha
-- sob o logo e o simbolo). E so aparencia: nao muda dado nenhum.
--
-- Quem pode alterar e controlado pela matriz de permissoes, no modulo novo
-- "aparencia". Por padrao SO O ADMIN ve e edita; a comunidade pode liberar
-- para outros perfis em Configuracoes > Permissoes.
-- =========================================================

-- 1) A cor (#RRGGBB). Nula = usa o padrao do app.
alter table comunidades
  add column if not exists cor_destaque text
  check (cor_destaque is null or cor_destaque ~ '^#[0-9a-fA-F]{6}$');

comment on column comunidades.cor_destaque is
  'Cor de destaque da marca no painel (#RRGGBB). Nula = padrao do app.';

-- 2) Modulo no catalogo de permissoes (aparece na tela Configuracoes > Permissoes)
insert into permissoes_modulos (chave, nome, grupo, acoes, ordem)
values ('aparencia', 'Aparencia', 'Sistema', array['ver', 'editar'], 155)
on conflict (chave) do nothing;

-- 3) Padrao do sistema: so admin ve e edita
insert into permissoes (comunidade_id, perfil, modulo, acao, permitido)
select null, p.perfil, 'aparencia', a.acao, (p.perfil = 'admin')
from unnest(array['missionario', 'lider', 'coordenador', 'padre', 'admin']) as p(perfil)
cross join unnest(array['ver', 'editar']) as a(acao)
on conflict do nothing;

-- 4) A cor so pode ser alterada por quem tem "aparencia > editar". A policy de
-- UPDATE de comunidades olha "configuracoes > editar"; este gatilho acrescenta a
-- checagem especifica da coluna, sem abrir nenhuma outra edicao.
create or replace function comunidades_protege_cor_destaque()
returns trigger
language plpgsql
as $$
begin
  if new.cor_destaque is distinct from old.cor_destaque and not auth_pode('aparencia', 'editar') then
    raise exception 'Sem permissao para alterar a aparencia da comunidade';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_comunidades_protege_cor_destaque on comunidades;
create trigger trg_comunidades_protege_cor_destaque
  before update of cor_destaque on comunidades
  for each row execute function comunidades_protege_cor_destaque();
