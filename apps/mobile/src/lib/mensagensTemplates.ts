import { supabase } from './supabase';
import type { MensagemTemplate } from '../types/database';

export async function listarTemplates(comunidadeId: string): Promise<MensagemTemplate[]> {
  const { data, error } = await supabase
    .from('mensagens_templates')
    .select('*')
    .eq('comunidade_id', comunidadeId)
    .order('nome', { ascending: true });
  if (error) throw error;
  return (data as MensagemTemplate[]) ?? [];
}
