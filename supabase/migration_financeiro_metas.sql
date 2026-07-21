-- Orçamento mensal, categorias personalizadas e vínculo a ministério (Bloco 2.5)
-- Rodar manualmente no SQL Editor do Supabase.

alter table comunidades add column if not exists meta_arrecadacao_mensal numeric;
alter table comunidades add column if not exists categorias_financeiras jsonb not null default '[]'::jsonb;
-- categorias_financeiras: lista de categorias extras além das padrão
-- (dizimo, oferta, retiro, bazar, manutencao, material, salarios, outros)

alter table financeiro add column if not exists ministerio_id uuid references ministerios(id);
create index if not exists idx_financeiro_ministerio on financeiro(ministerio_id);
