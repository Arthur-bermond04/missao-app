import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Auditoria — leitura do log append-only escrito pelos triggers do banco.
// Não existe função de escrita aqui de propósito: a tabela não tem policy de
// insert/update/delete, então o histórico não é adulterável pela API.
// ---------------------------------------------------------------------------

export type OperacaoAuditoria = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RegistroAuditoria {
  id: string;
  comunidade_id: string | null;
  tabela: string;
  registro_id: string | null;
  operacao: OperacaoAuditoria;
  campo: string | null;
  valor_antigo: string | null;
  valor_novo: string | null;
  usuario_id: string | null;
  criado_em: string;
}

export const TABELA_LABEL: Record<string, string> = {
  pessoas: 'Pessoas',
  pastoral_ovelhas: 'Pastoral — ovelhas',
  usuarios: 'Membros',
  permissoes: 'Permissões',
  financeiro: 'Financeiro',
  comunidades: 'Comunidade',
};

export const OPERACAO_LABEL: Record<OperacaoAuditoria, string> = {
  INSERT: 'Criou',
  UPDATE: 'Alterou',
  DELETE: 'Excluiu',
};

export interface FiltroAuditoria {
  tabela?: string;
  usuarioId?: string;
  registroId?: string;
  desde?: string;
  ate?: string;
}

export async function listarAuditoria(
  comunidadeId: string,
  filtro: FiltroAuditoria = {},
  limite = 300
): Promise<RegistroAuditoria[]> {
  let query = supabase
    .from('auditoria')
    .select('*')
    .eq('comunidade_id', comunidadeId)
    .order('criado_em', { ascending: false })
    .limit(limite);

  if (filtro.tabela) query = query.eq('tabela', filtro.tabela);
  if (filtro.usuarioId) query = query.eq('usuario_id', filtro.usuarioId);
  if (filtro.registroId) query = query.eq('registro_id', filtro.registroId);
  if (filtro.desde) query = query.gte('criado_em', filtro.desde);
  // `ate` é uma data (sem hora): soma um dia para incluir o dia inteiro.
  if (filtro.ate) query = query.lt('criado_em', `${filtro.ate}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) throw error;
  return (data as RegistroAuditoria[]) ?? [];
}

/** Histórico de um registro específico — usado nas telas de detalhe. */
export function historicoDoRegistro(comunidadeId: string, tabela: string, registroId: string) {
  return listarAuditoria(comunidadeId, { tabela, registroId }, 100);
}

/** Formata o valor para leitura, tratando vazio e o marcador de conteúdo omitido. */
export function valorLegivel(valor: string | null): string {
  if (valor === null || valor === '') return '—';
  if (valor === '(conteudo omitido)') return '(conteúdo omitido)';
  if (valor === 'true') return 'Sim';
  if (valor === 'false') return 'Não';
  return valor;
}
