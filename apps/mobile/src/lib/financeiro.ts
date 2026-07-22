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
}): Promise<Financeiro> {
  const { data, error } = await supabase
    .from('financeiro')
    .insert({ ...dados, descricao: dados.descricao || null })
    .select('*')
    .single();
  if (error) throw error;
  return data as Financeiro;
}

export async function excluirFinanceiro(id: string) {
  const { error } = await supabase.from('financeiro').delete().eq('id', id);
  if (error) throw error;
}
