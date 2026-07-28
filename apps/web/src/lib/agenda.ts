import { supabase } from './supabase';

// 'avulso' são os eventos cadastrados à mão (tabela agenda_eventos); os
// demais são agregados dos outros módulos.
export type TipoEventoAgenda = 'ministerio' | 'pastoral' | 'retiro' | 'avulso';

export interface EventoAgenda {
  id: string;
  tipo: TipoEventoAgenda;
  titulo: string;
  subtitulo?: string;
  data: string; // ISO (date ou datetime)
  href: string;
}

// Agenda "própria" — montada a partir dos dados que já existem no banco,
// usada quando a comunidade ainda não configurou o Google Calendar.
// A RLS de pastoral_ovelhas já restringe a lista de reuniões pastorais ao
// pastor de cada ovelha (ou admin), então nenhum filtro extra é necessário
// aqui — cada usuário só vê o que já podia ver antes.
export async function listarEventosProprios(comunidadeId: string): Promise<EventoAgenda[]> {
  const hojeIso = new Date().toISOString().slice(0, 10);

  const [encontros, ovelhas, retiros, avulsos] = await Promise.all([
    buscarEncontrosMinisterio(comunidadeId, hojeIso),
    buscarProximasReunioesPastorais(hojeIso),
    buscarRetiros(comunidadeId, hojeIso),
    buscarEventosAvulsos(comunidadeId, hojeIso),
  ]);

  return [...encontros, ...ovelhas, ...retiros, ...avulsos].sort((a, b) => a.data.localeCompare(b.data));
}

// ---------------------------------------------------------------------------
// Eventos avulsos (agenda_eventos)
// ---------------------------------------------------------------------------

export type TipoEventoAvulso = 'geral' | 'missa' | 'formacao' | 'reuniao' | 'evangelizacao';
export type VisibilidadeEvento = 'todos' | 'lideranca' | 'missionarios';

export const TIPOS_EVENTO_AVULSO: { valor: TipoEventoAvulso; label: string }[] = [
  { valor: 'geral', label: 'Geral' },
  { valor: 'missa', label: 'Missa' },
  { valor: 'formacao', label: 'Formação' },
  { valor: 'reuniao', label: 'Reunião' },
  { valor: 'evangelizacao', label: 'Evangelização' },
];

export const VISIBILIDADES_EVENTO: { valor: VisibilidadeEvento; label: string }[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'lideranca', label: 'Só liderança' },
  { valor: 'missionarios', label: 'Missionários' },
];

async function buscarEventosAvulsos(comunidadeId: string, hojeIso: string): Promise<EventoAgenda[]> {
  const { data, error } = await supabase
    .from('agenda_eventos')
    .select('id, titulo, descricao, local, data_inicio, data_fim, tipo')
    .eq('comunidade_id', comunidadeId)
    .gte('data_inicio', `${hojeIso}T00:00:00`)
    .order('data_inicio', { ascending: true });
  // se a migration ainda não rodou, não derruba a agenda
  if (error) return [];

  return (
    (data as { id: string; titulo: string; local: string | null; data_inicio: string; tipo: string }[]) ?? []
  ).map((e) => ({
    id: e.id,
    tipo: 'avulso' as const,
    titulo: e.titulo,
    subtitulo: e.local || undefined,
    data: e.data_inicio,
    href: '/agenda',
  }));
}

export async function criarEventoAvulso(dados: {
  comunidade_id: string;
  criado_por: string;
  titulo: string;
  descricao?: string;
  local?: string;
  data_inicio: string;
  data_fim?: string;
  dia_inteiro?: boolean;
  tipo: TipoEventoAvulso;
  visivel_para: VisibilidadeEvento;
}): Promise<void> {
  const { error } = await supabase.from('agenda_eventos').insert({
    comunidade_id: dados.comunidade_id,
    criado_por: dados.criado_por,
    titulo: dados.titulo,
    descricao: dados.descricao || null,
    local: dados.local || null,
    data_inicio: dados.data_inicio,
    data_fim: dados.data_fim || null,
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

async function buscarEncontrosMinisterio(comunidadeId: string, hojeIso: string): Promise<EventoAgenda[]> {
  const { data: ministerios, error: erroMin } = await supabase
    .from('ministerios')
    .select('id')
    .eq('comunidade_id', comunidadeId);
  if (erroMin) throw erroMin;
  const idsMinisterios = ((ministerios as { id: string }[]) ?? []).map((m) => m.id);
  if (idsMinisterios.length === 0) return [];

  const { data, error } = await supabase
    .from('ministerio_encontros')
    .select('id, titulo, data, horario, local, status, ministerio:ministerios(nome)')
    .in('ministerio_id', idsMinisterios)
    .neq('status', 'cancelado')
    .gte('data', hojeIso)
    .order('data', { ascending: true });
  if (error) throw error;

  return (
    (data as {
      id: string;
      titulo: string;
      data: string;
      horario: string | null;
      local: string | null;
      ministerio: { nome: string }[] | null;
    }[]) ?? []
  ).map((e) => ({
    id: e.id,
    tipo: 'ministerio' as const,
    titulo: `${e.ministerio?.[0]?.nome ?? 'Ministério'} — ${e.titulo}`,
    subtitulo: [e.horario, e.local].filter(Boolean).join(' · ') || undefined,
    data: e.data,
    href: '/ministerios',
  }));
}

async function buscarProximasReunioesPastorais(hojeIso: string): Promise<EventoAgenda[]> {
  const { data, error } = await supabase
    .from('pastoral_ovelhas')
    .select('id, nome, proxima_reuniao')
    .eq('ativo', true)
    .not('proxima_reuniao', 'is', null)
    .gte('proxima_reuniao', hojeIso)
    .order('proxima_reuniao', { ascending: true });
  if (error) throw error;

  return ((data as { id: string; nome: string; proxima_reuniao: string }[]) ?? []).map((o) => ({
    id: o.id,
    tipo: 'pastoral' as const,
    titulo: `Reunião pastoral — ${o.nome}`,
    data: o.proxima_reuniao,
    href: `/pastoral/${o.id}`,
  }));
}

async function buscarRetiros(comunidadeId: string, hojeIso: string): Promise<EventoAgenda[]> {
  const { data, error } = await supabase
    .from('retiros')
    .select('id, nome, data_inicio, data_fim, local')
    .eq('comunidade_id', comunidadeId)
    .gte('data_fim', hojeIso)
    .order('data_inicio', { ascending: true });
  if (error) throw error;

  return ((data as { id: string; nome: string; data_inicio: string; data_fim: string; local: string | null }[]) ?? []).map((r) => ({
    id: r.id,
    tipo: 'retiro' as const,
    titulo: `Retiro — ${r.nome}`,
    subtitulo: `até ${new Date(r.data_fim).toLocaleDateString('pt-BR')}${r.local ? ` · ${r.local}` : ''}`,
    data: r.data_inicio,
    href: '/retiros',
  }));
}
