import { supabase } from './supabase';
import type { Perfil, Usuario } from '../types/database';

export interface MembroComContagem extends Usuario {
  contatos_cadastrados: number;
}

export async function listarMembros(comunidadeId: string): Promise<MembroComContagem[]> {
  const [{ data: usuarios, error: erroUsuarios }, { data: contatos, error: erroContatos }] = await Promise.all([
    supabase.from('usuarios').select('*').eq('comunidade_id', comunidadeId).order('nome', { ascending: true }),
    supabase.from('contatos').select('missionario_id').eq('comunidade_id', comunidadeId),
  ]);
  if (erroUsuarios) throw erroUsuarios;
  if (erroContatos) throw erroContatos;

  const contagemPorMissionario = new Map<string, number>();
  for (const c of (contatos as { missionario_id: string | null }[]) ?? []) {
    if (!c.missionario_id) continue;
    contagemPorMissionario.set(c.missionario_id, (contagemPorMissionario.get(c.missionario_id) ?? 0) + 1);
  }

  return ((usuarios as Usuario[]) ?? []).map((u) => ({
    ...u,
    contatos_cadastrados: contagemPorMissionario.get(u.id) ?? 0,
  }));
}

export async function atualizarMembro(
  id: string,
  campos: Partial<Pick<Usuario, 'nome' | 'telefone' | 'perfil' | 'ativo' | 'dispositivo_id'>>
) {
  const { error } = await supabase.from('usuarios').update(campos).eq('id', id);
  if (error) throw error;
}

export async function desativarMembro(id: string) {
  await atualizarMembro(id, { ativo: false });
}

export async function reativarMembro(id: string) {
  await atualizarMembro(id, { ativo: true });
}

export const PERFIL_LABEL: Record<Perfil, string> = {
  missionario: 'Missionário',
  lider: 'Líder',
  coordenador: 'Coordenador',
  padre: 'Padre',
  admin: 'Admin',
};
