import { supabase } from './supabase';
import type { AcaoPermissao, Permissao, PermissaoModulo, Perfil } from '../types/database';

/**
 * Matriz resolvida de um perfil: modulo -> acao -> permitido.
 *
 * A fonte da verdade continua sendo o RLS do Postgres (auth_pode()). O que
 * existe aqui é só o espelho da mesma matriz, para o app esconder menu e
 * desabilitar botão em vez de deixar o usuário clicar e tomar erro do banco.
 */
export type MatrizPermissoes = Record<string, Partial<Record<AcaoPermissao, boolean>>>;

export const ACAO_LABEL: Record<AcaoPermissao, string> = {
  ver: 'Ver',
  criar: 'Criar',
  editar: 'Editar',
  excluir: 'Excluir',
};

export async function listarModulos(): Promise<PermissaoModulo[]> {
  const { data, error } = await supabase.from('permissoes_modulos').select('*').order('ordem', { ascending: true });
  if (error) throw error;
  return (data as PermissaoModulo[]) ?? [];
}

/**
 * Traz os defaults do sistema (comunidade_id null) e os overrides da
 * comunidade. O RLS já limita o que volta, mas filtramos por segurança.
 */
export async function listarPermissoes(comunidadeId: string): Promise<Permissao[]> {
  const { data, error } = await supabase
    .from('permissoes')
    .select('*')
    .or(`comunidade_id.is.null,comunidade_id.eq.${comunidadeId}`);
  if (error) throw error;
  return (data as Permissao[]) ?? [];
}

/**
 * Resolve a matriz de um perfil aplicando a mesma precedência de auth_pode():
 * override da comunidade vence o default do sistema; sem nenhum dos dois, nega.
 */
export function resolverMatriz(permissoes: Permissao[], perfil: Perfil, comunidadeId: string): MatrizPermissoes {
  const matriz: MatrizPermissoes = {};

  // Defaults primeiro, overrides depois — assim o override sobrescreve.
  const ordenadas = [...permissoes].sort((a, b) => Number(a.comunidade_id !== null) - Number(b.comunidade_id !== null));

  for (const p of ordenadas) {
    if (p.perfil !== perfil) continue;
    if (p.comunidade_id !== null && p.comunidade_id !== comunidadeId) continue;
    matriz[p.modulo] = { ...matriz[p.modulo], [p.acao]: p.permitido };
  }

  return matriz;
}

export function podeNaMatriz(matriz: MatrizPermissoes, modulo: string, acao: AcaoPermissao): boolean {
  return matriz[modulo]?.[acao] ?? false;
}

/**
 * Grava um override da comunidade. Nunca altera o default do sistema — se o
 * valor escolhido coincidir com o default, o override é removido, para a
 * comunidade voltar a acompanhar mudanças futuras no default.
 */
export async function definirPermissao(
  comunidadeId: string,
  perfil: Perfil,
  modulo: string,
  acao: AcaoPermissao,
  permitido: boolean,
  permissoes: Permissao[]
): Promise<void> {
  const padrao = permissoes.find(
    (p) => p.comunidade_id === null && p.perfil === perfil && p.modulo === modulo && p.acao === acao
  );

  if (padrao && padrao.permitido === permitido) {
    const { error } = await supabase
      .from('permissoes')
      .delete()
      .eq('comunidade_id', comunidadeId)
      .eq('perfil', perfil)
      .eq('modulo', modulo)
      .eq('acao', acao);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('permissoes')
    .upsert(
      { comunidade_id: comunidadeId, perfil, modulo, acao, permitido },
      { onConflict: 'comunidade_id,perfil,modulo,acao' }
    );
  if (error) throw error;
}

/** Estado do checkbox de um grupo inteiro na árvore da tela de permissões. */
export type EstadoGrupo = 'todos' | 'parcial' | 'nenhum';

export function estadoDoGrupo(modulos: PermissaoModulo[], matriz: MatrizPermissoes): EstadoGrupo {
  let habilitadas = 0;
  let total = 0;

  for (const m of modulos) {
    for (const acao of m.acoes) {
      total += 1;
      if (podeNaMatriz(matriz, m.chave, acao)) habilitadas += 1;
    }
  }

  if (total === 0 || habilitadas === 0) return 'nenhum';
  return habilitadas === total ? 'todos' : 'parcial';
}

export function estadoDoModulo(modulo: PermissaoModulo, matriz: MatrizPermissoes): EstadoGrupo {
  return estadoDoGrupo([modulo], matriz);
}
