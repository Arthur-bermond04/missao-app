# Melhorias futuras — MissãoApp

Ideias documentadas para implementação posterior (não implementadas ainda).

## Busca global (Command / Ctrl+K)

Objetivo: com vários módulos, o usuário não precisa lembrar em qual seção está a
informação. Uma busca única encontra qualquer coisa.

### UX
- Ícone de busca (`Search`) no topo da Sidebar, acima dos itens de navegação.
- Ao clicar (ou `Ctrl+K` / `Cmd+K`), abre um **modal de busca global**:
  - Input de busca no topo (autofocus).
  - Resultados em tempo real, agrupados por seção:
    - **Contatos** — nome, telefone
    - **Membros** — nome, e-mail
    - **Retiros** — nome, data
    - **Pastoral / Ovelhas** — nome (respeitando a confidencialidade do RLS:
      cada pastor só encontra as próprias ovelhas)
    - **Lançamentos financeiros** — descrição
  - Clicar em um resultado navega direto para o item.
  - `Esc` fecha; setas navegam; `Enter` abre o item destacado.

### Implementação sugerida
- **Opção simples (MVP):** uma função `buscaGlobal(termo)` que roda, em paralelo,
  um `.ilike('%termo%')` em cada tabela (limit ~5 por tabela), respeitando o RLS
  já existente (contatos/membros/retiros/financeiro por comunidade; pastoral por
  pastor). Reaproveitar o componente `Combobox`/`Modal` já existentes.
- **Opção robusta:** colunas `tsvector` + índices GIN por tabela e busca full-text
  do Postgres (`to_tsquery`), com uma RPC única no Supabase que faz `UNION` dos
  resultados já rotulados por tipo. Melhor relevância e performance com muitos dados.

### Onde encaixar
- Componente novo `src/components/layout/BuscaGlobal.tsx` (modal), acionado por um
  botão na `Sidebar.tsx` e por um listener global de teclado (`Ctrl/Cmd+K`).
- Lib `src/lib/busca.ts` com a função de busca (uma query por tabela na versão MVP).
