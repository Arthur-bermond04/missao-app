import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  const body = await req.json();
  const { retiro_id, nome, telefone } = body as {
    retiro_id?: string;
    nome?: string;
    telefone?: string;
  };

  if (!retiro_id || !nome?.trim()) {
    return NextResponse.json({ erro: 'Informe o retiro e o nome.' }, { status: 400 });
  }

  const { data: retiro } = await supabaseAdmin
    .from('retiros')
    .select('id')
    .eq('id', retiro_id)
    .single();

  if (!retiro) {
    return NextResponse.json({ erro: 'Retiro não encontrado.' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from('inscricoes_retiro')
    .insert({ retiro_id, nome: nome.trim(), telefone: telefone?.trim() || null })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ erro: 'Não foi possível concluir a inscrição.' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
