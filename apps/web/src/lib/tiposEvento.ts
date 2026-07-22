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

export async function criarTipoEvento(comunidadeId: string, nome: string): Promise<TipoEventoComunidade> {
  const { data, error } = await supabase
    .from('tipos_evento_comunidade')
    .insert({ comunidade_id: comunidadeId, nome: nome.trim() })
    .select('*')
    .single();
  if (error) throw error;
  return data as TipoEventoComunidade;
}

// Soft delete (ativo=false) — não exclui de verdade pra não perder o
// vínculo histórico com pastoral_presencas/ministerio_encontros que já
// usaram esse nome como texto livre.
export async function removerTipoEvento(id: string) {
  const { error } = await supabase.from('tipos_evento_comunidade').update({ ativo: false }).eq('id', id);
  if (error) throw error;
}
