import { NextResponse } from 'next/server';

// Só reporta se cada integração está configurada (booleano) — nunca expõe as
// chaves/tokens em si, já que essa rota roda no servidor e pode ler process.env
// livremente, mas o cliente só recebe true/false.
export async function GET() {
  return NextResponse.json({
    inscricaoPublica: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    push: !!process.env.FCM_SERVER_KEY,
    whatsapp: !!process.env.ZAPI_TOKEN,
    email: !!process.env.RESEND_API_KEY,
  });
}
