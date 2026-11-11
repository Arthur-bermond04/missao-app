import { supabase } from './supabase';
import type { AcaoPermissao, Permissao, PermissaoModulo, Perfil, UsuarioPermissao } from '../types/database';

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

// ---------------------------------------------------------------------------
// PERMISSÕES POR USUÁRIO
//
// Terceiro nível, o mais específico: o ajuste de UMA pessoa vence o ajuste da
// comunidade e o padrão do sistema (mesma ordem de auth_pode() no banco). Só a
// DIFERENÇA em relação ao perfil é guardada.
// ---------------------------------------------------------------------------

/** Ajustes de um usuário. Se a tabela ainda não existe no banco, devolve vazio. */
export async function listarPermissoesDoUsuario(usuarioId: string): Promise<UsuarioPermissao[]> {
  const { data, error } = await supabase.from('usuario_permissoes').select('*').eq('usuario_id', usuarioId);
  if (error) throw error;
  return (data as UsuarioPermissao[]) ?? [];
}

/** Sobrepõe os ajustes do usuário à matriz do perfil. */
export function aplicarAjustesDoUsuario(matriz: MatrizPermissoes, ajustes: UsuarioPermissao[]): MatrizPermissoes {
  const resultado: MatrizPermissoes = {};
  for (const [modulo, acoes] of Object.entries(matriz)) resultado[modulo] = { ...acoes };
  for (const a of ajustes) resultado[a.modulo] = { ...resultado[a.modulo], [a.acao]: a.permitido };
  return resultado;
}

// Os nomes do catálogo (permissoes_modulos) foram semeados sem acento. Só para
// EXIBIR, devolve o rótulo com a acentuação correta; o dado no banco não muda.
const ACENTOS: [RegExp, string][] = [
  [/Missao/g, 'Missão'],
  [/Gestao/g, 'Gestão'],
  [/Celulas/g, 'Células'],
  [/Ministerios/g, 'Ministérios'],
  [/Comunicacao/g, 'Comunicação'],
  [/Configuracoes/g, 'Configurações'],
  [/Relatorios/g, 'Relatórios'],
  [/Auditoria/g, 'Auditoria'],
  [/responsaveis/g, 'responsáveis'],
  [/missionarios/g, 'missionários'],
];
export function rotuloModulo(texto: string): string {
  return ACENTOS.reduce((t, [de, para]) => t.replace(de, para), texto);
}

/** Chave de uma célula da matriz: "modulo.acao". */
export const chaveCelula = (modulo: string, acao: AcaoPermissao) => `${modulo}.${acao}`;

/**
 * Grava a escolha do admin para um usuário. `desejado` traz o valor de cada
 * célula; `base` é o que o perfil já dá. Só as células que DIVERGEM do perfil
 * viram linha — as que coincidem são apagadas, para o usuário voltar a
 * acompanhar o perfil.
 */
export async function salvarPermissoesDoUsuario(
  comunidadeId: string,
  usuarioId: string,
  modulos: PermissaoModulo[],
  desejado: Record<string, boolean>,
  base: MatrizPermissoes
): Promise<void> {
  const gravar: Omit<UsuarioPermissao, 'id' | 'criado_em'>[] = [];
  const apagarPorModulo = new Map<string, AcaoPermissao[]>();

  for (const m of modulos) {
    for (const acao of m.acoes) {
      const valor = desejado[chaveCelula(m.chave, acao)] ?? false;
      if (valor === podeNaMatriz(base, m.chave, acao)) {
        apagarPorModulo.set(m.chave, [...(apagarPorModulo.get(m.chave) ?? []), acao]);
      } else {
        gravar.push({ comunidade_id: comunidadeId, usuario_id: usuarioId, modulo: m.chave, acao, permitido: valor });
      }
    }
  }

  if (gravar.length > 0) {
    const { error } = await supabase.from('usuario_permissoes').upsert(gravar, { onConflict: 'usuario_id,modulo,acao' });
    if (error) throw error;
  }
  for (const [modulo, acoes] of apagarPorModulo) {
    const { error } = await supabase
      .from('usuario_permissoes')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('modulo', modulo)
      .in('acao', acoes);
    if (error) throw error;
  }
}

/**
 * Regras que valiam antes da tabela `permissoes` existir — a lista fixa de
 * perfis que a Sidebar usava em `requerPerfil`, mais os módulos de escopo
 * ampliado.
 *
 * Módulo ausente daqui era livre para a comunidade inteira.
 */
const RESTRICOES_LEGADO: Record<string, Perfil[]> = {
  monitoria: ['coordenador', 'admin'],
  alertas: ['coordenador', 'admin'],
  financeiro: ['coordenador', 'admin'],
  relatorios: ['coordenador', 'admin'],
  auditoria: ['admin'],
  pessoas_todas: ['coordenador', 'admin'],
  pastoral_todas: ['admin'],
  funil_todos: ['lider', 'coordenador', 'admin'],
};

/**
 * Decide o acesso sem a matriz do banco.
 *
 * Serve de rede de segurança para quando `permissoes` não pode ser lida — a
 * tabela ainda não foi criada, o banco está fora do ar, a rede caiu. Sem isso,
 * a matriz vazia esconde o app inteiro do usuário, porque `pode()` nega tudo.
 *
 * Cair para o comportamento anterior é seguro: a UI só decide o que mostrar; a
 * autorização de verdade continua no RLS do Postgres, que não depende disto.
 */
export function podeNoLegado(perfil: Perfil | null, modulo: string): boolean {
  if (!perfil) return false;
  const restricao = RESTRICOES_LEGADO[modulo];
  return !restricao || restricao.includes(perfil);
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
