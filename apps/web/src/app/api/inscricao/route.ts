import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Inscrição pública (sem login), feita com a chave de serviço — por isso a rota
// precisa aplicar sozinha as regras que o RLS aplicaria a um usuário logado.
export async function POST(req: Request) {
  let body: { retiro_id?: unknown; nome?: unknown; telefone?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 });
  }

  const retiroId = typeof body.retiro_id === 'string' ? body.retiro_id : '';
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const telefone = typeof body.telefone === 'string' ? body.telefone.trim() : '';

  if (!UUID.test(retiroId) || !nome) {
    return NextResponse.json({ erro: 'Informe o retiro e o nome.' }, { status: 400 });
  }
  if (nome.length > 120 || telefone.length > 30) {
    return NextResponse.json({ erro: 'Dados muito longos.' }, { status: 400 });
  }

  const { data: retiro } = await supabaseAdmin.from('retiros').select('id, status, vagas').eq('id', retiroId).single();

  if (!retiro) {
    return NextResponse.json({ erro: 'Retiro não encontrado.' }, { status: 404 });
  }
  // Retiro encerrado ou já realizado não recebe inscrição nova.
  if (retiro.status !== 'aberto') {
    return NextResponse.json({ erro: 'As inscrições deste retiro estão encerradas.' }, { status: 409 });
  }

  if (retiro.vagas !== null) {
    const { count } = await supabaseAdmin
      .from('inscricoes_retiro')
      .select('id', { count: 'exact', head: true })
      .eq('retiro_id', retiroId);
    if ((count ?? 0) >= retiro.vagas) {
      return NextResponse.json({ erro: 'As vagas deste retiro estão esgotadas.' }, { status: 409 });
    }
  }

  // Mesma pessoa não se inscreve duas vezes no mesmo retiro.
  if (telefone) {
    const { data: repetida } = await supabaseAdmin
      .from('inscricoes_retiro')
      .select('id')
      .eq('retiro_id', retiroId)
      .eq('telefone', telefone)
      .limit(1);
    if (repetida && repetida.length > 0) {
      return NextResponse.json({ erro: 'Este telefone já está inscrito neste retiro.' }, { status: 409 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('inscricoes_retiro')
    .insert({ retiro_id: retiroId, nome, telefone: telefone || null })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ erro: 'Não foi possível concluir a inscrição.' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
