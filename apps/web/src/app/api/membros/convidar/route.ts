import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Perfil } from '@/types/database';

function gerarSenhaTemporaria() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
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
    .select('comunidade_id, perfil')
    .eq('id', authData.user.id)
    .single();

  if (erroChamador || !chamador || !['admin', 'coordenador'].includes(chamador.perfil)) {
    return NextResponse.json({ erro: 'Você não tem permissão para convidar membros.' }, { status: 403 });
  }
  if (!chamador.comunidade_id) {
    return NextResponse.json({ erro: 'Seu usuário não está vinculado a uma comunidade.' }, { status: 400 });
  }

  const body = await req.json();
  const { email, nome, perfil } = body as { email?: string; nome?: string; perfil?: Perfil };
  if (!email?.trim() || !nome?.trim() || !perfil) {
    return NextResponse.json({ erro: 'Informe nome, e-mail e perfil.' }, { status: 400 });
  }

  const senhaTemporaria = gerarSenhaTemporaria();

  const { data: novoAuthUser, error: erroCriarAuth } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim(),
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
    nome: nome.trim(),
    perfil,
    ativo: true,
  });

  if (erroInserirUsuario) {
    return NextResponse.json({ erro: 'Conta criada, mas houve um erro ao vincular o membro à comunidade.' }, { status: 500 });
  }

  return NextResponse.json({ senhaTemporaria, userId: novoAuthUser.user.id });
}
