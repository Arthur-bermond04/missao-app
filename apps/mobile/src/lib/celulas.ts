import { supabase } from './supabase';
import type { Celula } from '../types/database';

export interface CelulaComInfo extends Celula {
  lider_nome: string | null;
  total_membros: number;
}

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

export async function desativarCelula(id: string) {
  await atualizarCelula(id, { ativa: false });
}

export async function reativarCelula(id: string) {
  await atualizarCelula(id, { ativa: true });
}

export interface MembroCelula {
  id: string;
  nome: string;
  cargo: string;
}

export async function listarMembrosDaCelula(celulaId: string): Promise<MembroCelula[]> {
  const { data, error } = await supabase
    .from('equipe_cargos')
    .select('id, cargo, pessoas:pessoa_id(nome), usuarios:usuario_id(nome)')
    .eq('celula_id', celulaId)
    .eq('ativo', true);
  if (error) throw error;
  return ((data as any[]) ?? []).map((c) => ({
    id: c.id,
    cargo: c.cargo,
    nome: c.pessoas?.nome ?? c.usuarios?.nome ?? 'Sem nome',
  }));
}

export const DIAS_SEMANA = [
  { valor: 'domingo', label: 'Domingo' },
  { valor: 'segunda', label: 'Segunda' },
  { valor: 'terca', label: 'Terça' },
  { valor: 'quarta', label: 'Quarta' },
  { valor: 'quinta', label: 'Quinta' },
  { valor: 'sexta', label: 'Sexta' },
  { valor: 'sabado', label: 'Sábado' },
] as const;

export const DIA_LABEL: Record<string, string> = Object.fromEntries(DIAS_SEMANA.map((d) => [d.valor, d.label]));
