# MissãoApp

App para acompanhamento de evangelização, retiros, células e gestão de comunidades católicas e movimentos missionários.

## Estrutura do monorepo

```
missao-app/
├── apps/
│   ├── mobile/   → App React Native (Expo, TypeScript) — uso do missionário no campo
│   └── web/      → Painel admin (Next.js, TypeScript) — uso do líder/coordenador/admin
└── supabase/
    └── schema.sql → Schema do banco (tabelas + RLS)
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
2. Rode o conteúdo de `supabase/schema.sql` no SQL Editor
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
