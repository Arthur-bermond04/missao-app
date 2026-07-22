import { supabase } from './supabase';

export type TipoEventoAgenda = 'ministerio' | 'pastoral' | 'retiro';

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

  const [encontros, ovelhas, retiros] = await Promise.all([
    buscarEncontrosMinisterio(comunidadeId, hojeIso),
    buscarProximasReunioesPastorais(hojeIso),
    buscarRetiros(comunidadeId, hojeIso),
  ]);

  return [...encontros, ...ovelhas, ...retiros].sort((a, b) => a.data.localeCompare(b.data));
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
