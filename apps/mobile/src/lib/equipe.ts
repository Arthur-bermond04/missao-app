import { supabase } from './supabase';
import type { EquipeCargo, NivelEquipe } from '../types/database';

export interface EquipeCargoComVinculo extends EquipeCargo {
  pessoa_nome: string | null;
  pessoa_telefone: string | null;
  usuario_nome: string | null;
  celula_nome: string | null;
}

export async function listarEquipeCargos(comunidadeId: string): Promise<EquipeCargoComVinculo[]> {
  const { data, error } = await supabase
    .from('equipe_cargos')
    .select(
      'id, comunidade_id, pessoa_id, usuario_id, cargo, cargo_descricao, nivel, celula_id, data_inicio, data_fim, ativo, notas, criado_em, ' +
        'pessoas(nome, telefone), usuarios(nome), celulas(nome)'
    )
    .eq('comunidade_id', comunidadeId)
    .order('nivel', { ascending: true })
    .order('cargo', { ascending: true });
  if (error) throw error;
  return ((data as any[]) ?? []).map((row) => ({
    id: row.id,
    comunidade_id: row.comunidade_id,
    pessoa_id: row.pessoa_id,
    usuario_id: row.usuario_id,
    cargo: row.cargo,
    cargo_descricao: row.cargo_descricao,
    nivel: row.nivel,
    celula_id: row.celula_id,
    data_inicio: row.data_inicio,
    data_fim: row.data_fim,
    ativo: row.ativo,
    notas: row.notas,
    criado_em: row.criado_em,
    pessoa_nome: row.pessoas?.nome ?? null,
    pessoa_telefone: row.pessoas?.telefone ?? null,
    usuario_nome: row.usuarios?.nome ?? null,
    celula_nome: row.celulas?.nome ?? null,
  }));
}

export async function criarCargo(dados: {
  comunidade_id: string;
  pessoa_id?: string;
  usuario_id?: string;
  cargo: string;
  cargo_descricao?: string;
  nivel: NivelEquipe;
  celula_id?: string;
  notas?: string;
}): Promise<EquipeCargo> {
  const { data, error } = await supabase
    .from('equipe_cargos')
    .insert({
      comunidade_id: dados.comunidade_id,
      pessoa_id: dados.pessoa_id ?? null,
      usuario_id: dados.usuario_id ?? null,
      cargo: dados.cargo,
      cargo_descricao: dados.cargo_descricao ?? null,
      nivel: dados.nivel,
      celula_id: dados.celula_id ?? null,
      data_inicio: new Date().toISOString().slice(0, 10),
      notas: dados.notas ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as EquipeCargo;
}

export async function encerrarCargo(id: string) {
  const { error } = await supabase
    .from('equipe_cargos')
    .update({ ativo: false, data_fim: new Date().toISOString().slice(0, 10) })
    .eq('id', id);
  if (error) throw error;
}

export async function excluirCargo(id: string) {
  const { error } = await supabase.from('equipe_cargos').delete().eq('id', id);
  if (error) throw error;
}
