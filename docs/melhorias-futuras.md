# Melhorias futuras — MissãoApp

Ideias documentadas para implementação posterior (não implementadas ainda).

## Busca global (Command / Ctrl+K)

**Implementada em 2026-07-21** (`lib/busca.ts`, `components/layout/BuscaGlobal.tsx`, atalho `Ctrl/Cmd+K` na `Topbar.tsx`). Versão MVP: um `.ilike('%termo%')` por tabela (pessoas, contatos, membros, retiros, pastoral, financeiro, ministérios), respeitando o RLS já existente.

**Possível evolução futura**: trocar os `.ilike` por colunas `tsvector` + índices GIN e uma RPC única no Supabase com `UNION` dos resultados (melhor relevância e performance com muitos dados).
