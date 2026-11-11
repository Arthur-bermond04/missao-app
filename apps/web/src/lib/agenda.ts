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
  /** Último dia, para eventos de vários dias (retiros). Sem isto, é de um dia só. */
  dataFim?: string;
  /** Horário "HH:MM" quando existe. */
  hora?: string;
  local?: string;
  descricao?: string;
  href: string;
}

/** Data local no formato YYYY-MM-DD. toISOString() usa UTC e, à noite no Brasil, já devolve o dia seguinte. */
export function dataLocalIso(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}

// Agenda "própria" — montada a partir dos dados que já existem no banco,
// usada quando a comunidade ainda não configurou o Google Calendar.
// A RLS de pastoral_ovelhas já restringe a lista de reuniões pastorais ao
// pastor de cada ovelha (ou admin), então nenhum filtro extra é necessário
// aqui — cada usuário só vê o que já podia ver antes.
export async function listarEventosProprios(comunidadeId: string): Promise<EventoAgenda[]> {
  return listarEventosPeriodo(comunidadeId, dataLocalIso());
}

/**
 * Eventos de todos os módulos dentro de um período (datas YYYY-MM-DD,
 * inclusivas). Sem `ate`, traz tudo dali para a frente. O calendário usa isto
 * para carregar só o mês (ou semana) que está na tela.
 */
export async function listarEventosPeriodo(comunidadeId: string, de: string, ate?: string): Promise<EventoAgenda[]> {
  const [encontros, ovelhas, retiros, avulsos] = await Promise.all([
    buscarEncontrosMinisterio(comunidadeId, de, ate),
    buscarProximasReunioesPastorais(de, ate),
    buscarRetiros(comunidadeId, de, ate),
    buscarEventosAvulsos(comunidadeId, de, ate),
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

/** Extrai "HH:MM" de um datetime ISO sem fuso (meia-noite = dia inteiro, sem hora). */
function horaDe(dataHora: string): string | undefined {
  const m = dataHora.match(/T(\d{2}):(\d{2})/);
  if (!m || (m[1] === '00' && m[2] === '00')) return undefined;
  return `${m[1]}:${m[2]}`;
}

async function buscarEventosAvulsos(comunidadeId: string, de: string, ate?: string): Promise<EventoAgenda[]> {
  let consulta = supabase
    .from('agenda_eventos')
    .select('id, titulo, descricao, local, data_inicio, data_fim, tipo')
    .eq('comunidade_id', comunidadeId)
    .gte('data_inicio', `${de}T00:00:00`);
  if (ate) consulta = consulta.lte('data_inicio', `${ate}T23:59:59`);
  const { data, error } = await consulta.order('data_inicio', { ascending: true });
  // se a migration ainda não rodou, não derruba a agenda
  if (error) return [];

  return (
    (data as {
      id: string;
      titulo: string;
      descricao: string | null;
      local: string | null;
      data_inicio: string;
      data_fim: string | null;
    }[]) ?? []
  ).map((e) => ({
    id: e.id,
    tipo: 'avulso' as const,
    titulo: e.titulo,
    subtitulo: e.local || undefined,
    data: e.data_inicio,
    dataFim: e.data_fim && e.data_fim.slice(0, 10) > e.data_inicio.slice(0, 10) ? e.data_fim : undefined,
    hora: horaDe(e.data_inicio),
    local: e.local || undefined,
    descricao: e.descricao || undefined,
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

async function buscarEncontrosMinisterio(comunidadeId: string, de: string, ate?: string): Promise<EventoAgenda[]> {
  const { data: ministerios, error: erroMin } = await supabase
    .from('ministerios')
    .select('id')
    .eq('comunidade_id', comunidadeId);
  if (erroMin) throw erroMin;
  const idsMinisterios = ((ministerios as { id: string }[]) ?? []).map((m) => m.id);
  if (idsMinisterios.length === 0) return [];

  let consulta = supabase
    .from('ministerio_encontros')
    .select('id, titulo, data, horario, local, status, ministerio:ministerios(nome)')
    .in('ministerio_id', idsMinisterios)
    .neq('status', 'cancelado')
    .gte('data', de);
  if (ate) consulta = consulta.lte('data', ate);
  const { data, error } = await consulta.order('data', { ascending: true });
  if (error) throw error;

  return (
    (data as unknown as {
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
    hora: e.horario ? e.horario.slice(0, 5) : undefined,
    local: e.local || undefined,
    href: '/ministerios',
  }));
}

async function buscarProximasReunioesPastorais(de: string, ate?: string): Promise<EventoAgenda[]> {
  let consulta = supabase
    .from('pastoral_ovelhas')
    .select('id, nome, proxima_reuniao')
    .eq('ativo', true)
    .not('proxima_reuniao', 'is', null)
    .gte('proxima_reuniao', de);
  if (ate) consulta = consulta.lte('proxima_reuniao', ate);
  const { data, error } = await consulta.order('proxima_reuniao', { ascending: true });
  if (error) throw error;

  return ((data as { id: string; nome: string; proxima_reuniao: string }[]) ?? []).map((o) => ({
    id: o.id,
    tipo: 'pastoral' as const,
    titulo: `Reunião pastoral — ${o.nome}`,
    data: o.proxima_reuniao,
    href: `/pastoral/${o.id}`,
  }));
}

async function buscarRetiros(comunidadeId: string, de: string, ate?: string): Promise<EventoAgenda[]> {
  // Um retiro entra no período se ele se SOBREPÕE a ele (termina depois do início
  // e começa antes do fim) — não só se começa dentro.
  let consulta = supabase
    .from('retiros')
    .select('id, nome, data_inicio, data_fim, local')
    .eq('comunidade_id', comunidadeId)
    .gte('data_fim', de);
  if (ate) consulta = consulta.lte('data_inicio', ate);
  const { data, error } = await consulta.order('data_inicio', { ascending: true });
  if (error) throw error;

  return ((data as { id: string; nome: string; data_inicio: string; data_fim: string; local: string | null }[]) ?? []).map((r) => ({
    id: r.id,
    tipo: 'retiro' as const,
    titulo: `Retiro — ${r.nome}`,
    subtitulo: `até ${new Date(`${r.data_fim}T12:00:00`).toLocaleDateString('pt-BR')}${r.local ? ` · ${r.local}` : ''}`,
    data: r.data_inicio,
    dataFim: r.data_fim,
    local: r.local || undefined,
    href: '/retiros',
  }));
}
