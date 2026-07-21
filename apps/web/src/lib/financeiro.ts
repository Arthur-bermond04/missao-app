import { supabase } from './supabase';
import type { Financeiro, TipoFinanceiro } from '../types/database';

export async function listarFinanceiro(comunidadeId: string): Promise<Financeiro[]> {
  const { data, error } = await supabase
    .from('financeiro')
    .select('*')
    .eq('comunidade_id', comunidadeId)
    .order('data', { ascending: false });
  if (error) throw error;
  return (data as Financeiro[]) ?? [];
}

export async function lancarFinanceiro(dados: {
  comunidade_id: string;
  tipo: TipoFinanceiro;
  categoria: string;
  descricao?: string;
  valor: number;
  data: string;
  retiro_id?: string;
  ministerio_id?: string;
}): Promise<Financeiro> {
  const { data, error } = await supabase
    .from('financeiro')
    .insert({ ...dados, retiro_id: dados.retiro_id || null, ministerio_id: dados.ministerio_id || null })
    .select('*')
    .single();
  if (error) throw error;
  return data as Financeiro;
}
