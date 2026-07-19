import { supabase } from './supabase';

export async function redefinirDispositivo(usuarioId: string) {
  const { error } = await supabase.from('usuarios').update({ dispositivo_id: null }).eq('id', usuarioId);
  if (error) throw error;
}

export async function alterarSenha(novaSenha: string) {
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) throw error;
}

// Conta lembretes do usuário que vencem hoje e não estão concluídos.
// Usado para o badge da aba "Missão". Retorna 0 em qualquer erro.
export async function contarLembretesHoje(usuarioId: string): Promise<number> {
  const hoje = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from('lembretes')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId)
    .eq('concluido', false)
    .eq('data_lembrete', hoje);
  if (error) return 0;
  return count ?? 0;
}
