import { supabase } from './supabase';

export type TipoEventoAgenda = 'ministerio' | 'pastoral' | 'retiro' | 'avulso';

export interface EventoAgenda {
  id: string;
  tipo: TipoEventoAgenda;
  titulo: string;
  subtitulo?: string;
  data: string;
}

export async function listarEventosAgenda(comunidadeId: string): Promise<EventoAgenda[]> {
  const hoje = new Date().toISOString().slice(0, 10);
  const [enc, ove, ret, avu] = await Promise.all([
    encontrosMinisterio(comunidadeId, hoje),
    reunioesPastorais(hoje),
    retiros(comunidadeId, hoje),
    eventosAvulsos(comunidadeId, hoje),
  ]);
  return [...enc, ...ove, ...ret, ...avu].sort((a, b) => a.data.localeCompare(b.data));
}

async function encontrosMinisterio(comunidadeId: string, hoje: string): Promise<EventoAgenda[]> {
  const { data: mins } = await supabase.from('ministerios').select('id').eq('comunidade_id', comunidadeId);
  const ids = ((mins as { id: string }[]) ?? []).map((m) => m.id);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from('ministerio_encontros')
    .select('id, titulo, data, horario, local, status, ministerio:ministerios(nome)')
    .in('ministerio_id', ids)
    .neq('status', 'cancelado')
    .gte('data', hoje)
    .order('data', { ascending: true });
  return ((data as any[]) ?? []).map((e) => ({
    id: e.id,
    tipo: 'ministerio' as const,
    titulo: `${e.ministerio?.nome ?? 'Ministério'} — ${e.titulo}`,
    subtitulo: [e.horario, e.local].filter(Boolean).join(' · ') || undefined,
    data: e.data,
  }));
}

async function reunioesPastorais(hoje: string): Promise<EventoAgenda[]> {
  const { data } = await supabase
    .from('pastoral_ovelhas')
    .select('id, nome, proxima_reuniao')
    .eq('ativo', true)
    .not('proxima_reuniao', 'is', null)
    .gte('proxima_reuniao', hoje)
    .order('proxima_reuniao', { ascending: true });
  return ((data as { id: string; nome: string; proxima_reuniao: string }[]) ?? []).map((o) => ({
    id: o.id,
    tipo: 'pastoral' as const,
    titulo: `Reunião pastoral — ${o.nome}`,
    data: o.proxima_reuniao,
  }));
}

async function retiros(comunidadeId: string, hoje: string): Promise<EventoAgenda[]> {
  const { data } = await supabase
    .from('retiros')
    .select('id, nome, data_inicio, data_fim, local')
    .eq('comunidade_id', comunidadeId)
    .gte('data_fim', hoje)
    .order('data_inicio', { ascending: true });
  return ((data as { id: string; nome: string; data_inicio: string; data_fim: string; local: string | null }[]) ?? []).map((r) => ({
    id: r.id,
    tipo: 'retiro' as const,
    titulo: `Retiro — ${r.nome}`,
    subtitulo: `até ${new Date(r.data_fim).toLocaleDateString('pt-BR')}${r.local ? ` · ${r.local}` : ''}`,
    data: r.data_inicio,
  }));
}

async function eventosAvulsos(comunidadeId: string, hoje: string): Promise<EventoAgenda[]> {
  const { data, error } = await supabase
    .from('agenda_eventos')
    .select('id, titulo, local, data_inicio, tipo')
    .eq('comunidade_id', comunidadeId)
    .gte('data_inicio', `${hoje}T00:00:00`)
    .order('data_inicio', { ascending: true });
  if (error) return []; // migration pode não ter rodado ainda
  return ((data as { id: string; titulo: string; local: string | null; data_inicio: string }[]) ?? []).map((e) => ({
    id: e.id,
    tipo: 'avulso' as const,
    titulo: e.titulo,
    subtitulo: e.local || undefined,
    data: e.data_inicio,
  }));
}

export type TipoEventoAvulso = 'geral' | 'missa' | 'formacao' | 'reuniao' | 'evangelizacao';
export type VisibilidadeEvento = 'todos' | 'lideranca' | 'missionarios';

export const TIPOS_EVENTO_AVULSO: { valor: TipoEventoAvulso; label: string }[] = [
  { valor: 'geral', label: 'Geral' },
  { valor: 'missa', label: 'Missa' },
  { valor: 'formacao', label: 'Formação' },
  { valor: 'reuniao', label: 'Reunião' },
  { valor: 'evangelizacao', label: 'Evangelização' },
];

export async function criarEventoAvulso(dados: {
  comunidade_id: string;
  criado_por: string;
  titulo: string;
  local?: string;
  data_inicio: string;
  dia_inteiro?: boolean;
  tipo: TipoEventoAvulso;
  visivel_para: VisibilidadeEvento;
}): Promise<void> {
  const { error } = await supabase.from('agenda_eventos').insert({
    comunidade_id: dados.comunidade_id,
    criado_por: dados.criado_por,
    titulo: dados.titulo,
    local: dados.local || null,
    data_inicio: dados.data_inicio,
    dia_inteiro: dados.dia_inteiro ?? false,
    tipo: dados.tipo,
    visivel_para: dados.visivel_para,
  });
  if (error) throw error;
}

export async function excluirEventoAvulso(id: string) {
  const { error } = await supabase.from('agenda_eventos').delete().eq('id', id);
  if (error) throw error;
}
