import { supabase } from './supabase';
import type { Contato } from '../types/database';

export async function listarContatosComunidade(comunidadeId: string): Promise<Contato[]> {
  const { data, error } = await supabase
    .from('contatos')
    .select('*')
    .eq('comunidade_id', comunidadeId)
    .order('data_abordagem', { ascending: false });
  if (error) throw error;
  return (data as Contato[]) ?? [];
}
