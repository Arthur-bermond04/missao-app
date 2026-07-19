import { supabase } from './supabase';
import type {
  CargoMinisterio,
  Ministerio,
  MinisterioEncontro,
  MinisterioFinanceiro,
  MinisterioMembro,
  MinisterioPresenca,
  TipoFinanceiro,
  TipoMinisterio,
} from '../types/database';

export interface MinisterioComContagem extends Ministerio {
  total_membros: number;
}

export interface MembroDetalhe extends MinisterioMembro {
  nome: string;
}

// ---------------------------------------------------------------------------
// Ministérios (CRUD)
// ---------------------------------------------------------------------------

export async function listarMinisterios(comunidadeId: string): Promise<MinisterioComContagem[]> {
  const [{ data: ministerios, error: erroMin }, { data: membros, error: erroMem }] = await Promise.all([
    supabase.from('ministerios').select('*').eq('comunidade_id', comunidadeId).order('nome', { ascending: true }),
    supabase
      .from('ministerio_membros')
      .select('ministerio_id, ativo')
      .eq('ativo', true),
  ]);
  if (erroMin) throw erroMin;
  if (erroMem) throw erroMem;

  const contagem = new Map<string, number>();
  for (const m of (membros as { ministerio_id: string }[]) ?? []) {
    contagem.set(m.ministerio_id, (contagem.get(m.ministerio_id) ?? 0) + 1);
  }

  return ((ministerios as Ministerio[]) ?? []).map((m) => ({
    ...m,
    total_membros: contagem.get(m.id) ?? 0,
  }));
}

export async function criarMinisterio(dados: {
  comunidade_id: string;
  nome: string;
  tipo: TipoMinisterio;
  descricao?: string;
  coordenador_id?: string;
  cor: string;
}): Promise<Ministerio> {
  const { data, error } = await supabase
    .from('ministerios')
    .insert({
      comunidade_id: dados.comunidade_id,
      nome: dados.nome,
      tipo: dados.tipo,
      descricao: dados.descricao || null,
      coordenador_id: dados.coordenador_id || null,
      cor: dados.cor,
    })
    .select('*')
    .single();
  if (error) throw error;

  // vincula o coordenador como membro coordenador, se informado
  if (dados.coordenador_id) {
    await supabase.from('ministerio_membros').insert({
      ministerio_id: (data as Ministerio).id,
      usuario_id: dados.coordenador_id,
      cargo: 'coordenador' as CargoMinisterio,
    });
  }
  return data as Ministerio;
}

export async function atualizarMinisterio(id: string, campos: Partial<Ministerio>) {
  const { error } = await supabase.from('ministerios').update(campos).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Membros
// ---------------------------------------------------------------------------

export async function listarMembrosMinisterio(ministerioId: string): Promise<MembroDetalhe[]> {
  const { data, error } = await supabase
    .from('ministerio_membros')
    .select('*, usuario:usuarios(nome)')
    .eq('ministerio_id', ministerioId)
    .order('entrou_em', { ascending: true });
  if (error) throw error;
  return ((data as (MinisterioMembro & { usuario: { nome: string } | null })[]) ?? []).map((m) => ({
    ...m,
    nome: m.usuario?.nome ?? 'Sem nome',
  }));
}

export async function adicionarMembro(ministerioId: string, usuarioId: string, cargo: CargoMinisterio) {
  const { error } = await supabase
    .from('ministerio_membros')
    .insert({ ministerio_id: ministerioId, usuario_id: usuarioId, cargo });
  if (error) throw error;
}

export async function atualizarMembroMinisterio(id: string, campos: Partial<MinisterioMembro>) {
  const { error } = await supabase.from('ministerio_membros').update(campos).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Encontros e presenças
// ---------------------------------------------------------------------------

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
  dados: {
    ministerio_id: string;
    titulo: string;
    descricao?: string;
    data: string;
    local?: string;
  },
  presencas: { usuario_id: string; presente: boolean; justificativa?: string }[]
): Promise<MinisterioEncontro> {
  const { data, error } = await supabase
    .from('ministerio_encontros')
    .insert({
      ministerio_id: dados.ministerio_id,
      titulo: dados.titulo,
      descricao: dados.descricao || null,
      data: dados.data,
      local: dados.local || null,
    })
    .select('*')
    .single();
  if (error) throw error;

  const encontro = data as MinisterioEncontro;
  if (presencas.length > 0) {
    const { error: erroPres } = await supabase.from('ministerio_presencas').insert(
      presencas.map((p) => ({
        encontro_id: encontro.id,
        usuario_id: p.usuario_id,
        presente: p.presente,
        justificativa: p.justificativa || null,
      }))
    );
    if (erroPres) throw erroPres;
  }
  return encontro;
}

export async function listarPresencasDoMinisterio(ministerioId: string): Promise<MinisterioPresenca[]> {
  // busca todas as presenças dos encontros do ministério
  const { data: encontros, error: erroEnc } = await supabase
    .from('ministerio_encontros')
    .select('id')
    .eq('ministerio_id', ministerioId);
  if (erroEnc) throw erroEnc;
  const ids = ((encontros as { id: string }[]) ?? []).map((e) => e.id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase.from('ministerio_presencas').select('*').in('encontro_id', ids);
  if (error) throw error;
  return (data as MinisterioPresenca[]) ?? [];
}

// Frequência (%) de cada membro nos últimos N dias, a partir de encontros+presenças
export function calcularFrequencia(
  encontros: MinisterioEncontro[],
  presencas: MinisterioPresenca[],
  diasJanela = 90
): Map<string, number> {
  const limite = new Date();
  limite.setDate(limite.getDate() - diasJanela);
  const limiteIso = limite.toISOString().slice(0, 10);

  const encontrosNaJanela = encontros.filter((e) => e.data >= limiteIso);
  const idsEncontros = new Set(encontrosNaJanela.map((e) => e.id));
  const totalEncontros = encontrosNaJanela.length;

  const presentesPorMembro = new Map<string, number>();
  for (const p of presencas) {
    if (!idsEncontros.has(p.encontro_id)) continue;
    if (p.presente) presentesPorMembro.set(p.usuario_id, (presentesPorMembro.get(p.usuario_id) ?? 0) + 1);
  }

  const frequencia = new Map<string, number>();
  if (totalEncontros === 0) return frequencia;
  for (const [usuarioId, presentes] of presentesPorMembro) {
    frequencia.set(usuarioId, Math.round((presentes / totalEncontros) * 100));
  }
  return frequencia;
}

// ---------------------------------------------------------------------------
// Caixa (financeiro do ministério)
// ---------------------------------------------------------------------------

export interface LancamentoDetalhe extends MinisterioFinanceiro {
  doador_display: string | null;
}

export async function listarFinanceiroMinisterio(ministerioId: string): Promise<LancamentoDetalhe[]> {
  const { data, error } = await supabase
    .from('ministerio_financeiro')
    .select('*, doador:usuarios(nome)')
    .eq('ministerio_id', ministerioId)
    .order('data', { ascending: false });
  if (error) throw error;
  return ((data as (MinisterioFinanceiro & { doador: { nome: string } | null })[]) ?? []).map((l) => ({
    ...l,
    doador_display: l.doador?.nome ?? l.doador_nome ?? null,
  }));
}

export async function lancarFinanceiroMinisterio(dados: {
  ministerio_id: string;
  comunidade_id: string;
  tipo: TipoFinanceiro;
  categoria: string;
  descricao?: string;
  valor: number;
  doador_id?: string;
  doador_nome?: string;
  data: string;
}): Promise<MinisterioFinanceiro> {
  const { data, error } = await supabase
    .from('ministerio_financeiro')
    .insert({
      ministerio_id: dados.ministerio_id,
      comunidade_id: dados.comunidade_id,
      tipo: dados.tipo,
      categoria: dados.categoria,
      descricao: dados.descricao || null,
      valor: dados.valor,
      doador_id: dados.doador_id || null,
      doador_nome: dados.doador_nome || null,
      data: dados.data,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as MinisterioFinanceiro;
}

// Totais consolidados de todos os ministérios da comunidade (para dashboard)
export async function resumoMinisterios(
  comunidadeId: string
): Promise<{ totalAtivos: number; totalMembros: number; saldo: number }> {
  const [ministeriosRes, membrosRes, finRes] = await Promise.all([
    supabase.from('ministerios').select('id').eq('comunidade_id', comunidadeId).eq('ativo', true),
    supabase.from('ministerio_membros').select('id', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('ministerio_financeiro').select('tipo, valor').eq('comunidade_id', comunidadeId),
  ]);

  const financeiro = (finRes.data as { tipo: TipoFinanceiro; valor: number }[]) ?? [];
  const saldo = financeiro.reduce((s, f) => s + (f.tipo === 'receita' ? f.valor : -f.valor), 0);

  return {
    totalAtivos: ((ministeriosRes.data as { id: string }[]) ?? []).length,
    totalMembros: membrosRes.count ?? 0,
    saldo,
  };
}
