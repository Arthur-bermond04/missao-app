import { supabase } from './supabase';
import type { Celula, CelulaEncontro, CelulaPresenca } from '../types/database';

export interface CelulaComInfo extends Celula {
  lider_nome: string | null;
  total_membros: number;
}

// Lista as células da comunidade com o nome do líder e a contagem de membros
// vinculados (via equipe_cargos.celula_id, cargos ativos).
export async function listarCelulas(comunidadeId: string): Promise<CelulaComInfo[]> {
  const { data, error } = await supabase
    .from('celulas')
    .select('*, usuarios:lider_id(nome)')
    .eq('comunidade_id', comunidadeId)
    .order('nome', { ascending: true });
  if (error) throw error;

  const celulas = ((data as any[]) ?? []).map((c) => ({
    id: c.id,
    comunidade_id: c.comunidade_id,
    nome: c.nome,
    lider_id: c.lider_id,
    dia_semana: c.dia_semana,
    horario: c.horario,
    endereco: c.endereco,
    ativa: c.ativa,
    criado_em: c.criado_em,
    lider_nome: c.usuarios?.nome ?? null,
    total_membros: 0,
  })) as CelulaComInfo[];

  if (celulas.length === 0) return celulas;

  // contagem de membros por célula (cargos ativos vinculados a cada celula_id)
  const { data: cargos } = await supabase
    .from('equipe_cargos')
    .select('celula_id')
    .eq('comunidade_id', comunidadeId)
    .eq('ativo', true)
    .not('celula_id', 'is', null);
  const contagem = new Map<string, number>();
  for (const c of (cargos as { celula_id: string }[]) ?? []) {
    contagem.set(c.celula_id, (contagem.get(c.celula_id) ?? 0) + 1);
  }
  for (const c of celulas) c.total_membros = contagem.get(c.id) ?? 0;

  return celulas;
}

export async function criarCelula(dados: {
  comunidade_id: string;
  nome: string;
  lider_id?: string;
  dia_semana?: string;
  horario?: string;
  endereco?: string;
}): Promise<Celula> {
  const { data, error } = await supabase
    .from('celulas')
    .insert({
      comunidade_id: dados.comunidade_id,
      nome: dados.nome,
      lider_id: dados.lider_id || null,
      dia_semana: dados.dia_semana || null,
      horario: dados.horario || null,
      endereco: dados.endereco || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Celula;
}

export async function atualizarCelula(id: string, campos: Partial<Celula>) {
  const { error } = await supabase.from('celulas').update(campos).eq('id', id);
  if (error) throw error;
}

// "Desativar" em vez de excluir — a célula pode estar referenciada em
// equipe_cargos.celula_id (histórico) e some da listagem de ativas.
export async function desativarCelula(id: string) {
  await atualizarCelula(id, { ativa: false });
}

export async function reativarCelula(id: string) {
  await atualizarCelula(id, { ativa: true });
}

// Membros vinculados a uma célula (via equipe_cargos), com nome resolvido de
// pessoa ou usuário. Usado no detalhe da célula e como lista rápida no
// check-in de presença — pessoa_id/usuario_id (não o id do cargo) é o que
// celula_presencas de fato referencia.
export interface MembroCelula {
  id: string;
  nome: string;
  cargo: string;
  origem: 'pessoa' | 'usuario';
  pessoa_id: string | null;
  usuario_id: string | null;
}

export async function listarMembrosDaCelula(celulaId: string): Promise<MembroCelula[]> {
  const { data, error } = await supabase
    .from('equipe_cargos')
    .select('id, cargo, pessoa_id, usuario_id, pessoas:pessoa_id(nome), usuarios:usuario_id(nome)')
    .eq('celula_id', celulaId)
    .eq('ativo', true);
  if (error) throw error;
  return ((data as any[]) ?? []).map((c) => ({
    id: c.id,
    cargo: c.cargo,
    nome: c.pessoas?.nome ?? c.usuarios?.nome ?? 'Sem nome',
    origem: c.pessoas?.nome ? ('pessoa' as const) : ('usuario' as const),
    pessoa_id: c.pessoa_id ?? null,
    usuario_id: c.usuario_id ?? null,
  }));
}

export const DIAS_SEMANA = [
  { valor: 'domingo', label: 'Domingo' },
  { valor: 'segunda', label: 'Segunda-feira' },
  { valor: 'terca', label: 'Terça-feira' },
  { valor: 'quarta', label: 'Quarta-feira' },
  { valor: 'quinta', label: 'Quinta-feira' },
  { valor: 'sexta', label: 'Sexta-feira' },
  { valor: 'sabado', label: 'Sábado' },
] as const;

export const DIA_LABEL: Record<string, string> = Object.fromEntries(DIAS_SEMANA.map((d) => [d.valor, d.label]));

// ---------------------------------------------------------------------------
// Encontros e presença — mesmo padrão de lib/ministerios.ts
// (criarEncontroComPresencas / listarEncontros / calcularFrequencia), com
// presença chaveada por pessoa_id OU usuario_id (nunca os dois).
// ---------------------------------------------------------------------------

// Chave única de uma linha de presença/participante — mesmo papel de
// chaveMembroMinisterio em lib/ministerios.ts.
export function chaveParticipanteCelula(p: { usuario_id?: string | null; pessoa_id?: string | null }): string {
  return p.usuario_id ?? p.pessoa_id ?? '';
}

export async function listarEncontrosCelula(celulaId: string): Promise<CelulaEncontro[]> {
  const { data, error } = await supabase
    .from('celula_encontros')
    .select('*')
    .eq('celula_id', celulaId)
    .order('data', { ascending: false });
  if (error) throw error;
  return (data as CelulaEncontro[]) ?? [];
}

interface PresencaEntrada {
  usuario_id?: string;
  pessoa_id?: string;
  presente: boolean;
}

export async function registrarEncontroCelula(
  dados: { celula_id: string; data: string; horario?: string; local?: string; observacoes?: string },
  presencas: PresencaEntrada[]
): Promise<CelulaEncontro> {
  const { data, error } = await supabase
    .from('celula_encontros')
    .insert({
      celula_id: dados.celula_id,
      data: dados.data,
      horario: dados.horario || null,
      local: dados.local || null,
      observacoes: dados.observacoes || null,
      status: 'realizado',
    })
    .select('*')
    .single();
  if (error) throw error;

  const encontro = data as CelulaEncontro;
  if (presencas.length > 0) {
    const { error: erroPres } = await supabase.from('celula_presencas').insert(
      presencas.map((p) => ({
        encontro_id: encontro.id,
        usuario_id: p.usuario_id || null,
        pessoa_id: p.pessoa_id || null,
        presente: p.presente,
      }))
    );
    if (erroPres) throw erroPres;
  }
  return encontro;
}

// Substitui a lista de presença de um encontro já existente (delete + insert,
// mesmo motivo de atualizarEncontroComPresencas em ministerios.ts: duas
// constraints únicas parciais diferentes não cabem num único onConflict).
export async function atualizarPresencasCelula(encontroId: string, presencas: PresencaEntrada[]): Promise<void> {
  const { error: erroDelete } = await supabase.from('celula_presencas').delete().eq('encontro_id', encontroId);
  if (erroDelete) throw erroDelete;

  if (presencas.length > 0) {
    const { error: erroInsert } = await supabase.from('celula_presencas').insert(
      presencas.map((p) => ({
        encontro_id: encontroId,
        usuario_id: p.usuario_id || null,
        pessoa_id: p.pessoa_id || null,
        presente: p.presente,
      }))
    );
    if (erroInsert) throw erroInsert;
  }
}

export async function listarPresencasDaCelula(celulaId: string): Promise<CelulaPresenca[]> {
  const { data: encontros, error: erroEnc } = await supabase
    .from('celula_encontros')
    .select('id')
    .eq('celula_id', celulaId);
  if (erroEnc) throw erroEnc;
  const ids = ((encontros as { id: string }[]) ?? []).map((e) => e.id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase.from('celula_presencas').select('*').in('encontro_id', ids);
  if (error) throw error;
  return (data as CelulaPresenca[]) ?? [];
}

export interface ParticipanteFrequencia {
  chave: string;
  nome: string;
  frequencia: number;
}

// Une listarPresencasDaCelula (com nome resolvido) + calcularFrequenciaCelula
// numa lista pronta pra exibir — usada no histórico de encontros da célula.
// Duas consultas (encontros da célula, depois presenças desses encontros)
// em vez de um filtro por tabela relacionada, para não depender do PostgREST
// resolver a FK célula_presencas -> célula_encontros num join !inner.
export async function listarFrequenciaCelula(celulaId: string, diasJanela = 90): Promise<ParticipanteFrequencia[]> {
  const encontros = await listarEncontrosCelula(celulaId);
  const idsEncontros = encontros.map((e) => e.id);
  if (idsEncontros.length === 0) return [];

  const { data: presencasComNome, error } = await supabase
    .from('celula_presencas')
    .select('*, pessoas:pessoa_id(nome), usuarios:usuario_id(nome)')
    .in('encontro_id', idsEncontros);
  if (error) throw error;

  const presencas = ((presencasComNome as any[]) ?? []) as (CelulaPresenca & {
    pessoas: { nome: string } | null;
    usuarios: { nome: string } | null;
  })[];

  const nomePorChave = new Map<string, string>();
  for (const p of presencas) {
    const chave = p.usuario_id ?? p.pessoa_id;
    if (chave) nomePorChave.set(chave, p.usuarios?.nome ?? p.pessoas?.nome ?? 'Sem nome');
  }

  const frequencia = calcularFrequenciaCelula(encontros, presencas, diasJanela);
  return [...frequencia.entries()]
    .map(([chave, freq]) => ({ chave, nome: nomePorChave.get(chave) ?? 'Sem nome', frequencia: freq }))
    .sort((a, b) => b.frequencia - a.frequencia || a.nome.localeCompare(b.nome));
}

// Frequência (%) de cada participante nos últimos N dias — mesma lógica de
// calcularFrequencia em ministerios.ts.
export function calcularFrequenciaCelula(
  encontros: CelulaEncontro[],
  presencas: CelulaPresenca[],
  diasJanela = 90
): Map<string, number> {
  const limite = new Date();
  limite.setDate(limite.getDate() - diasJanela);
  const limiteIso = limite.toISOString().slice(0, 10);

  const encontrosNaJanela = encontros.filter((e) => e.status === 'realizado' && e.data >= limiteIso);
  const idsEncontros = new Set(encontrosNaJanela.map((e) => e.id));
  const totalEncontros = encontrosNaJanela.length;

  const presentesPorParticipante = new Map<string, number>();
  for (const p of presencas) {
    if (!idsEncontros.has(p.encontro_id)) continue;
    const chave = p.usuario_id ?? p.pessoa_id;
    if (!chave) continue;
    if (p.presente) presentesPorParticipante.set(chave, (presentesPorParticipante.get(chave) ?? 0) + 1);
  }

  const frequencia = new Map<string, number>();
  if (totalEncontros === 0) return frequencia;
  for (const [chave, presentes] of presentesPorParticipante) {
    frequencia.set(chave, Math.round((presentes / totalEncontros) * 100));
  }
  return frequencia;
}
