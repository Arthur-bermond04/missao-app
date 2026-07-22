import { supabase } from './supabase';
import type { TipoEventoComunidade } from '../types/database';

export async function listarTiposEvento(comunidadeId: string): Promise<TipoEventoComunidade[]> {
  const { data, error } = await supabase
    .from('tipos_evento_comunidade')
    .select('*')
    .eq('comunidade_id', comunidadeId)
    .eq('ativo', true)
    .order('nome', { ascending: true });
  if (error) throw error;
  return (data as TipoEventoComunidade[]) ?? [];
}
