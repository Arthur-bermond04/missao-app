import { supabase } from './supabase';
import type {
  CargoMinisterio,
  Ministerio,
  MinisterioEncontro,
  MinisterioFinanceiro,
  MinisterioPresenca,
  TipoFinanceiro,
} from '../types/database';

export interface MeuMinisterio extends Ministerio {
  cargo: CargoMinisterio;
  proximo_encontro: string | null;
}

// Lista os ministérios em que o usuário logado é membro, com seu cargo e o próximo encontro.
export async function listarMeusMinisterios(usuarioId: string): Promise<MeuMinisterio[]> {
  const { data: vinculos, error } = await supabase
    .from('ministerio_membros')
    .select('cargo, ministerio:ministerios(*)')
    .eq('usuario_id', usuarioId)
    .eq('ativo', true);
  if (error) throw error;

  const linhas = (vinculos as unknown as { cargo: CargoMinisterio; ministerio: Ministerio | null }[]) ?? [];
  const ministerios = linhas.filter((l) => l.ministerio).map((l) => ({ cargo: l.cargo, m: l.ministerio as Ministerio }));

  // busca o próximo encontro (>= hoje) de cada ministério
  const hoje = new Date().toISOString().slice(0, 10);
  const ids = ministerios.map((x) => x.m.id);
  const proximos = new Map<string, string>();
  if (ids.length > 0) {
    const { data: encontros } = await supabase
      .from('ministerio_encontros')
      .select('ministerio_id, data')
      .in('ministerio_id', ids)
      .gte('data', hoje)
      .order('data', { ascending: true });
    for (const e of (encontros as { ministerio_id: string; data: string }[]) ?? []) {
      if (!proximos.has(e.ministerio_id)) proximos.set(e.ministerio_id, e.data);
    }
  }

  return ministerios.map(({ cargo, m }) => ({ ...m, cargo, proximo_encontro: proximos.get(m.id) ?? null }));
}

export interface MembroDetalhe {
  id: string;
  usuario_id: string;
  cargo: CargoMinisterio;
  nome: string;
}

export async function listarMembros(ministerioId: string): Promise<MembroDetalhe[]> {
  const { data, error } = await supabase
    .from('ministerio_membros')
    .select('id, usuario_id, cargo, usuario:usuarios(nome)')
    .eq('ministerio_id', ministerioId)
    .eq('ativo', true)
    .order('cargo', { ascending: true });
  if (error) throw error;
  return (
    (data as unknown as { id: string; usuario_id: string; cargo: CargoMinisterio; usuario: { nome: string } | null }[]) ??
    []
  ).map((m) => ({ id: m.id, usuario_id: m.usuario_id, cargo: m.cargo, nome: m.usuario?.nome ?? 'Sem nome' }));
}

export async function listarEncontros(ministerioId: string): Promise<MinisterioEncontro[]> {
  const { data, error } = await supabase
    .from('ministerio_encontros')
    .select('*')
    .eq('ministerio_id', ministerioId)
    .order('data', { ascending: false });
  if (error) throw error;
  return (data as MinisterioEncontro[]) ?? [];
}

export async function criarEncontroComPresencas(
  dados: { ministerio_id: string; titulo: string; data: string; local?: string },
  presencas: { usuario_id: string; presente: boolean }[]
): Promise<MinisterioEncontro> {
  const { data, error } = await supabase
    .from('ministerio_encontros')
    .insert({ ministerio_id: dados.ministerio_id, titulo: dados.titulo, data: dados.data, local: dados.local || null })
    .select('*')
    .single();
  if (error) throw error;
  const encontro = data as MinisterioEncontro;
  if (presencas.length > 0) {
    await supabase.from('ministerio_presencas').insert(
      presencas.map((p) => ({ encontro_id: encontro.id, usuario_id: p.usuario_id, presente: p.presente }))
    );
  }
  return encontro;
}

export async function listarPresencasDoEncontro(encontroId: string): Promise<MinisterioPresenca[]> {
  const { data, error } = await supabase.from('ministerio_presencas').select('*').eq('encontro_id', encontroId);
  if (error) throw error;
  return (data as MinisterioPresenca[]) ?? [];
}

// Completa um encontro que já existe (normalmente um "agendado" cuja data
// chegou, criado pela Agenda no painel web) com título/local atualizados e a
// lista de presença — ao contrário de criarEncontroComPresencas, NÃO cria uma
// linha nova em ministerio_encontros. Isso corrige o bug em que "Registrar
// encontro" sempre criava um encontro duplicado em vez de completar o
// agendado. As presenças são substituídas por completo (delete + insert) em
// vez de upsert, pelo mesmo motivo do painel web (ver lib/ministerios.ts lá).
export async function atualizarEncontroComPresencas(
  encontroId: string,
  dados: { titulo: string; data: string; local?: string },
  presencas: { usuario_id: string; presente: boolean }[]
): Promise<void> {
  const { error: erroEncontro } = await supabase
    .from('ministerio_encontros')
    .update({ titulo: dados.titulo, data: dados.data, local: dados.local || null, status: 'realizado' })
    .eq('id', encontroId);
  if (erroEncontro) throw erroEncontro;

  const { error: erroDelete } = await supabase.from('ministerio_presencas').delete().eq('encontro_id', encontroId);
  if (erroDelete) throw erroDelete;

  if (presencas.length > 0) {
    const { error: erroInsert } = await supabase
      .from('ministerio_presencas')
      .insert(presencas.map((p) => ({ encontro_id: encontroId, usuario_id: p.usuario_id, presente: p.presente })));
    if (erroInsert) throw erroInsert;
  }
}

export async function listarFinanceiro(ministerioId: string): Promise<MinisterioFinanceiro[]> {
  const { data, error } = await supabase
    .from('ministerio_financeiro')
    .select('*')
    .eq('ministerio_id', ministerioId)
    .order('data', { ascending: false });
  if (error) throw error;
  return (data as MinisterioFinanceiro[]) ?? [];
}

export async function lancarFinanceiro(dados: {
  ministerio_id: string;
  comunidade_id: string;
  tipo: TipoFinanceiro;
  categoria: string;
  descricao?: string;
  valor: number;
  data: string;
}): Promise<MinisterioFinanceiro> {
  const { data, error } = await supabase
    .from('ministerio_financeiro')
    .insert({ ...dados, descricao: dados.descricao || null })
    .select('*')
    .single();
  if (error) throw error;
  return data as MinisterioFinanceiro;
}
