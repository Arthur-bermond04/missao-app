import { supabase } from './supabase';
import type { InscricaoRetiro, Retiro, StatusRetiro } from '../types/database';

export async function listarRetiros(comunidadeId: string): Promise<Retiro[]> {
  const { data, error } = await supabase
    .from('retiros')
    .select('*')
    .eq('comunidade_id', comunidadeId)
    .order('data_inicio', { ascending: false });
  if (error) throw error;
  return (data as Retiro[]) ?? [];
}

export async function criarRetiro(dados: {
  comunidade_id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  local?: string;
  vagas?: number;
  valor?: number;
}): Promise<Retiro> {
  const { data, error } = await supabase
    .from('retiros')
    .insert({ ...dados, status: 'aberto' as StatusRetiro })
    .select('*')
    .single();
  if (error) throw error;
  return data as Retiro;
}

export async function contarInscritosPorRetiro(retiroIds: string[]): Promise<Record<string, number>> {
  if (retiroIds.length === 0) return {};
  const { data, error } = await supabase.from('inscricoes_retiro').select('retiro_id').in('retiro_id', retiroIds);
  if (error) throw error;
  const contagem: Record<string, number> = {};
  for (const linha of (data as { retiro_id: string }[]) ?? []) {
    contagem[linha.retiro_id] = (contagem[linha.retiro_id] ?? 0) + 1;
  }
  return contagem;
}

export async function listarInscritos(retiroId: string): Promise<InscricaoRetiro[]> {
  const { data, error } = await supabase
    .from('inscricoes_retiro')
    .select('*')
    .eq('retiro_id', retiroId)
    .order('nome', { ascending: true });
  if (error) throw error;
  return (data as InscricaoRetiro[]) ?? [];
}

export async function atualizarInscricao(
  id: string,
  campos: Partial<Pick<InscricaoRetiro, 'pagou' | 'valor_pago' | 'grupo' | 'presente'>>
) {
  const { error } = await supabase.from('inscricoes_retiro').update(campos).eq('id', id);
  if (error) throw error;
}
