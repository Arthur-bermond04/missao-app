import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('retiros')
    .select('id, nome, data_inicio, data_fim, local, vagas, valor, status')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ erro: 'Retiro não encontrado.' }, { status: 404 });
  }
  return NextResponse.json(data);
}
