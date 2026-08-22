import { supabase } from './supabase';
import type { Perfil, Usuario } from '../types/database';

export interface MembroComContagem extends Usuario {
  contatos_cadastrados: number;
}

export async function listarMembros(comunidadeId: string): Promise<MembroComContagem[]> {
  // Conta por pessoas.responsavel_id (origem evangelização), não mais por
  // contatos.missionario_id — desde a migration 20260822030000, toda
  // abordagem (web ou sync do mobile) tem uma pessoa correspondente, e o
  // web já nem cria mais em contatos. Ler só pessoas evita contar dobrado.
  const [{ data: usuarios, error: erroUsuarios }, { data: pessoasEvangelizacao, error: erroPessoas }] = await Promise.all([
    supabase.from('usuarios').select('*').eq('comunidade_id', comunidadeId).order('nome', { ascending: true }),
    supabase.from('pessoas').select('responsavel_id').eq('comunidade_id', comunidadeId).eq('origem', 'evangelizacao'),
  ]);
  if (erroUsuarios) throw erroUsuarios;
  if (erroPessoas) throw erroPessoas;

  const contagemPorMissionario = new Map<string, number>();
  for (const p of (pessoasEvangelizacao as { responsavel_id: string | null }[]) ?? []) {
    if (!p.responsavel_id) continue;
    contagemPorMissionario.set(p.responsavel_id, (contagemPorMissionario.get(p.responsavel_id) ?? 0) + 1);
  }

  return ((usuarios as Usuario[]) ?? []).map((u) => ({
    ...u,
    contatos_cadastrados: contagemPorMissionario.get(u.id) ?? 0,
  }));
}

export async function atualizarMembro(
  id: string,
  campos: Partial<Pick<Usuario, 'nome' | 'telefone' | 'perfil' | 'ativo' | 'dispositivo_id' | 'supervisor_id'>>
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

/**
 * Candidatos a supervisor de um membro: qualquer outro membro ativo da
 * comunidade, menos os que já estão abaixo dele na hierarquia — senão o
 * trigger do banco (usuarios_valida_supervisor) recusa por ciclo.
 */
export function candidatosASupervisor(membros: Usuario[], membroId: string): Usuario[] {
  const abaixo = new Set<string>();
  const fila = [membroId];

  while (fila.length > 0) {
    const atual = fila.shift() as string;
    for (const m of membros) {
      if (m.supervisor_id === atual && !abaixo.has(m.id)) {
        abaixo.add(m.id);
        fila.push(m.id);
      }
    }
  }

  return membros.filter((m) => m.id !== membroId && m.ativo && !abaixo.has(m.id));
}

export const PERFIL_LABEL: Record<Perfil, string> = {
  missionario: 'Missionário',
  lider: 'Líder',
  coordenador: 'Coordenador',
  padre: 'Padre',
  admin: 'Admin',
};
