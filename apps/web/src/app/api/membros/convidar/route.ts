import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Perfil } from '@/types/database';

const PERFIS_VALIDOS: readonly Perfil[] = ['missionario', 'lider', 'coordenador', 'padre', 'admin'];
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function gerarSenhaTemporaria() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}

/**
 * Pergunta ao PRÓPRIO banco se quem chamou pode criar membros, usando o token
 * dele (auth.uid() vale). Assim a rota segue a matriz de permissões da
 * comunidade, em vez de repetir uma lista fixa de perfis. Se a função ainda não
 * existir no banco, cai para a regra antiga (admin e coordenador).
 */
async function podeCriarMembros(token: string, perfil: Perfil): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    const comoUsuario = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await comoUsuario.rpc('auth_pode', { p_modulo: 'membros', p_acao: 'criar' });
    if (!error && typeof data === 'boolean') return data;
  }
  return perfil === 'admin' || perfil === 'coordenador';
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 });
  }

  const { data: chamador, error: erroChamador } = await supabaseAdmin
    .from('usuarios')
    .select('comunidade_id, perfil, ativo')
    .eq('id', authData.user.id)
    .single();

  // Conta desativada perde o acesso na hora, mesmo com o token ainda válido.
  if (erroChamador || !chamador || !chamador.ativo || !(await podeCriarMembros(token, chamador.perfil as Perfil))) {
    return NextResponse.json({ erro: 'Você não tem permissão para convidar membros.' }, { status: 403 });
  }
  if (!chamador.comunidade_id) {
    return NextResponse.json({ erro: 'Seu usuário não está vinculado a uma comunidade.' }, { status: 400 });
  }

  let body: { email?: unknown; nome?: unknown; perfil?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const perfil = body.perfil;

  if (!email || !nome || typeof perfil !== 'string') {
    return NextResponse.json({ erro: 'Informe nome, e-mail e perfil.' }, { status: 400 });
  }
  if (email.length > 254 || !EMAIL_VALIDO.test(email)) {
    return NextResponse.json({ erro: 'E-mail inválido.' }, { status: 400 });
  }
  if (nome.length > 120) {
    return NextResponse.json({ erro: 'Nome muito longo.' }, { status: 400 });
  }
  if (!PERFIS_VALIDOS.includes(perfil as Perfil)) {
    return NextResponse.json({ erro: 'Perfil inválido.' }, { status: 400 });
  }
  // Escalada de privilégio: quem não é admin não cria admin.
  if (perfil === 'admin' && chamador.perfil !== 'admin') {
    return NextResponse.json({ erro: 'Só um admin pode criar outro admin.' }, { status: 403 });
  }

  const senhaTemporaria = gerarSenhaTemporaria();

  const { data: novoAuthUser, error: erroCriarAuth } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senhaTemporaria,
    email_confirm: true,
  });

  if (erroCriarAuth || !novoAuthUser.user) {
    const mensagem = erroCriarAuth?.message?.includes('already been registered')
      ? 'Já existe uma conta com esse e-mail.'
      : 'Não foi possível criar a conta. Tente novamente.';
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }

  const { error: erroInserirUsuario } = await supabaseAdmin.from('usuarios').insert({
    id: novoAuthUser.user.id,
    comunidade_id: chamador.comunidade_id,
    nome,
    perfil: perfil as Perfil,
    ativo: true,
  });

  if (erroInserirUsuario) {
    // Compensa a criação no Auth pra não deixar um usuário órfão (existe no
    // Auth mas sem linha em `usuarios`, e portanto sem comunidade/perfil).
    await supabaseAdmin.auth.admin.deleteUser(novoAuthUser.user.id).catch(() => {});
    return NextResponse.json({ erro: 'Não foi possível vincular o membro à comunidade. Tente novamente.' }, { status: 500 });
  }

  return NextResponse.json({ senhaTemporaria, userId: novoAuthUser.user.id });
}
