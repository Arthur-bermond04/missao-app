import { supabase } from './supabase';
import type {
  EstadoEspiritual,
  EtapaFormacao,
  FrequenciaAcompanhamento,
  PastoralEncontro,
  PastoralOvelha,
  TipoEncontroPastoral,
} from '../types/database';

export async function listarOvelhas(comunidadeId: string): Promise<PastoralOvelha[]> {
  // RLS já limita às ovelhas do pastor logado (ou todas, se admin)
  const { data, error } = await supabase
    .from('pastoral_ovelhas')
    .select('*')
    .eq('comunidade_id', comunidadeId)
    .eq('ativo', true)
    .order('nome', { ascending: true });
  if (error) throw error;
  return (data as PastoralOvelha[]) ?? [];
}

export async function buscarOvelha(id: string): Promise<PastoralOvelha | null> {
  const { data, error } = await supabase.from('pastoral_ovelhas').select('*').eq('id', id).single();
  if (error) return null;
  return data as PastoralOvelha;
}

export async function criarOvelha(dados: {
  comunidade_id: string;
  pastor_id: string;
  nome: string;
  telefone?: string;
  etapa_formacao?: EtapaFormacao;
  estado_espiritual?: EstadoEspiritual;
  frequencia_acompanhamento?: FrequenciaAcompanhamento;
}): Promise<PastoralOvelha> {
  const { data, error } = await supabase
    .from('pastoral_ovelhas')
    .insert({
      comunidade_id: dados.comunidade_id,
      pastor_id: dados.pastor_id,
      nome: dados.nome,
      telefone: dados.telefone || null,
      etapa_formacao: dados.etapa_formacao ?? 'inicio',
      estado_espiritual: dados.estado_espiritual ?? 'estavel',
      frequencia_acompanhamento: dados.frequencia_acompanhamento ?? 'mensal',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PastoralOvelha;
}

export async function listarEncontrosPastorais(ovelhaId: string): Promise<PastoralEncontro[]> {
  const { data, error } = await supabase
    .from('pastoral_encontros')
    .select('*')
    .eq('ovelha_id', ovelhaId)
    .order('data', { ascending: false });
  if (error) throw error;
  return (data as PastoralEncontro[]) ?? [];
}

export async function criarEncontroPastoral(dados: {
  ovelha_id: string;
  pastor_id: string;
  data: string;
  tipo: TipoEncontroPastoral;
  estado_ovelha: string;
  relato: string;
  encaminhamentos?: string;
  proxima_reuniao?: string;
}): Promise<PastoralEncontro> {
  const { data, error } = await supabase
    .from('pastoral_encontros')
    .insert({
      ovelha_id: dados.ovelha_id,
      pastor_id: dados.pastor_id,
      data: dados.data,
      tipo: dados.tipo,
      estado_ovelha: dados.estado_ovelha,
      relato: dados.relato,
      encaminhamentos: dados.encaminhamentos || null,
      proxima_reuniao: dados.proxima_reuniao || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  if (dados.proxima_reuniao) {
    await supabase.from('pastoral_ovelhas').update({ proxima_reuniao: dados.proxima_reuniao }).eq('id', dados.ovelha_id);
  }
  return data as PastoralEncontro;
}

// Dias desde o último encontro; usado para destacar ovelhas em atraso.
export function diasDesdeUltimoEncontro(encontros: PastoralEncontro[]): number | null {
  if (encontros.length === 0) return null;
  const ultimo = encontros.reduce((a, b) => (a.data > b.data ? a : b));
  return Math.floor((Date.now() - new Date(ultimo.data).getTime()) / (24 * 60 * 60 * 1000));
}

export function reuniaoAtrasada(ovelha: PastoralOvelha): boolean {
  if (!ovelha.proxima_reuniao) return false;
  return ovelha.proxima_reuniao < new Date().toISOString().slice(0, 10);
}
