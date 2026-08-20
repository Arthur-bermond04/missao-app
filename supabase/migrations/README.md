# Migrations

Cada arquivo é uma migration, nomeada no padrão do Supabase CLI:
`<timestamp>_<nome>.sql`, onde o timestamp é `YYYYMMDDHHMMSS` em UTC.

**A ordem alfabética dos arquivos é a ordem de execução.** Antes, os arquivos
tinham nomes descritivos sem numeração (`migration_pessoas.sql`,
`migration_erp_v2.sql`, ...) e a ordem correta só existia no histórico do git —
era fácil rodar fora de ordem ou esquecer uma ao montar um ambiente novo.

Os timestamps atuais foram derivados da data do commit que introduziu cada
arquivo, então refletem a ordem real em que foram aplicados em produção.

## Rodando em um ambiente novo

Execute os arquivos em ordem alfabética no SQL Editor do Supabase, começando por
`20260716165638_schema_inicial.sql`.

Opcionalmente, com o [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <ref-do-projeto>
supabase db push
```

## Criando uma migration nova

```bash
supabase migration new nome_da_mudanca
```

Isso cria `supabase/migrations/<timestamp>_nome_da_mudanca.sql` já com o
timestamp correto. Sem o CLI, crie o arquivo manualmente usando a data/hora UTC
atual como prefixo.

## Atenção ao adotar o `db push` em um banco já existente

O banco de produção já tem todas estas migrations aplicadas manualmente, mas a
tabela de controle do CLI (`supabase_migrations.schema_migrations`) está vazia —
um `db push` tentaria reaplicar tudo e falharia. Antes do primeiro push, marque
as migrations existentes como já aplicadas:

```bash
supabase migration repair --status applied <timestamp>
```

## Arquivos que não são migrations

- `../reset.sql` — derruba o schema inteiro (só para ambiente de desenvolvimento)
- `../seed_usuario_teste.sql` — cria um usuário de teste

Ambos ficam fora desta pasta de propósito, para não serem executados pelo
`db push`.
