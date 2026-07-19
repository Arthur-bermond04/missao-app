import { supabase } from './supabase';
import type { Comunidade } from '../types/database';

export async function buscarComunidade(id: string): Promise<Comunidade | null> {
  const { data, error } = await supabase.from('comunidades').select('*').eq('id', id).single();
  if (error) return null;
  return data as Comunidade;
}
