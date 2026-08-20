# MissãoApp

App para acompanhamento de evangelização, retiros, células e gestão de comunidades católicas e movimentos missionários.

## Estrutura do monorepo

```
missao-app/
├── apps/
│   ├── mobile/   → App React Native (Expo, TypeScript) — uso do missionário no campo
│   └── web/      → Painel admin (Next.js, TypeScript) — uso do líder/coordenador/admin
└── supabase/
    ├── migrations/  → Migrations em ordem (ver migrations/README.md)
    ├── reset.sql    → Derruba o schema (só desenvolvimento)
    └── seed_usuario_teste.sql
```

## Stack

- **Mobile**: React Native + Expo (TypeScript)
- **Web**: Next.js (TypeScript)
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Push**: Firebase Cloud Messaging
- **WhatsApp**: Z-API
- **E-mail**: Resend
- **Exportação**: SheetJS (Excel), pdfmake (PDF)
- **Deploy web**: Vercel

## Como rodar localmente

### 1. Supabase

1. Crie um projeto em https://supabase.com
2. Rode os arquivos de `supabase/migrations/` **em ordem alfabética** no SQL Editor
   (o prefixo de timestamp já é a ordem de execução — ver `supabase/migrations/README.md`)
3. Copie a URL e a `anon key` do projeto

### 2. Mobile (apps/mobile)

```bash
cd apps/mobile
npm install
cp .env.example .env   # preencha com as chaves do Supabase
npx expo start
```

Abra no app **Expo Go** (Android/iOS) para testar.

### 3. Web (apps/web)

```bash
cd apps/web
npm install
cp .env.example .env.local   # preencha com as chaves do Supabase
npm run dev
```

## Verificação (CI)

O workflow `.github/workflows/ci.yml` roda em todo push na `main` e em todo PR:

```bash
npm ci
npm run typecheck --workspace web      # tsc --noEmit
npm run typecheck --workspace mobile   # tsc --noEmit
npm run lint --workspace web           # eslint (advisory, ver abaixo)
```

O job de lint está como `continue-on-error` porque o código tem 60 erros de lint
pré-existentes (a maioria `react-hooks/set-state-in-effect` e
`@typescript-eslint/no-explicit-any`). Assim que essa dívida for zerada, remova o
`continue-on-error` para o lint passar a barrar PRs.

## Variáveis de ambiente

Nunca commitar chaves reais. Use sempre `.env` / `.env.local` (já ignorados no `.gitignore`).

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (somente no backend/web, nunca no mobile)

## Status do desenvolvimento

- [x] Schema do banco + RLS
- [x] Módulo 1 — Evangelização de campo (mobile)
- [x] Módulo 2 — Funil de evangelização (web)
- [x] Módulo 3 — Retiros (mobile + web)
- [x] Módulo 4 — Comunicação automatizada (registro em banco; falta ligar FCM/Z-API/Resend para disparo real)
- [x] Módulo 5 — Dashboard admin
- [x] Módulo 6 — Financeiro

## Pendências conhecidas

- `SUPABASE_SERVICE_ROLE_KEY` não configurada em `apps/web/.env.local` — sem ela, o formulário público de inscrição em retiro (`/inscricao/[retiroId]`) não funciona (as rotas de API que o suportam usam o service role para contornar o RLS).
- Envio real de mensagens (push/WhatsApp/e-mail) ainda não está integrado com FCM, Z-API e Resend — hoje o Módulo 4 só registra a mensagem no banco.
- Controle de dispositivo único (anti-compartilhamento de conta) descrito no briefing original ainda não foi implementado.
- `npm run lint --workspace web` não roda direto num clone limpo: o npm faz hoist do `eslint-config-next` para a raiz do monorepo, mas mantém o `next` aninhado em `apps/web/node_modules` (conflito de peer do React entre web `19.2.4` e mobile `19.1.0`), e da raiz o config não resolve o `next`. Contorno (o mesmo que o CI usa): `npm install --no-save --prefix apps/web eslint-config-next@16.2.10`.
- 60 erros de lint pré-existentes no web — por isso o job de lint do CI ainda é advisory.
