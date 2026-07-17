import { supabase } from './supabase';
import type { Comunidade } from '../types/database';

export async function buscarComunidade(id: string): Promise<Comunidade> {
  const { data, error } = await supabase.from('comunidades').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Comunidade;
}

export async function atualizarComunidade(id: string, campos: Partial<Pick<Comunidade, 'nome' | 'tipo' | 'telefone'>>) {
  const { error } = await supabase.from('comunidades').update(campos).eq('id', id);
  if (error) throw error;
}
