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
  saldo_caixa: number;
  frequencia_media_3: number | null;
  proximo_encontro: MinisterioEncontro | null;
}

// Representa especificamente membros COM login (usuario_id sempre presente) —
// é o que os componentes de presença/encontro já existentes esperam. Membros
// só-pessoa (sem login) são tratados à parte nas telas que os suportam.
export interface MembroDetalhe extends MinisterioMembro {
  usuario_id: string;
  nome: string;
}

// ---------------------------------------------------------------------------
// Ministérios (CRUD)
// ---------------------------------------------------------------------------

export async function listarMinisterios(comunidadeId: string): Promise<MinisterioComContagem[]> {
  const [{ data: ministerios, error: erroMin }, { data: membros, error: erroMem }, { data: financeiro, error: erroFin }] =
    await Promise.all([
      supabase.from('ministerios').select('*').eq('comunidade_id', comunidadeId).order('nome', { ascending: true }),
      supabase.from('ministerio_membros').select('ministerio_id, ativo').eq('ativo', true),
      supabase.from('ministerio_financeiro').select('ministerio_id, tipo, valor').eq('comunidade_id', comunidadeId),
    ]);
  if (erroMin) throw erroMin;
  if (erroMem) throw erroMem;
  if (erroFin) throw erroFin;

  const ministerioIds = ((ministerios as Ministerio[]) ?? []).map((m) => m.id);
  const { data: encontros, error: erroEnc } =
    ministerioIds.length > 0
      ? await supabase.from('ministerio_encontros').select('*').in('ministerio_id', ministerioIds)
      : { data: [] as MinisterioEncontro[], error: null };
  if (erroEnc) throw erroEnc;

  const contagem = new Map<string, number>();
  for (const m of (membros as { ministerio_id: string }[]) ?? []) {
    contagem.set(m.ministerio_id, (contagem.get(m.ministerio_id) ?? 0) + 1);
  }

  const saldoPorMinisterio = new Map<string, number>();
  for (const f of (financeiro as { ministerio_id: string; tipo: TipoFinanceiro; valor: number }[]) ?? []) {
    const atual = saldoPorMinisterio.get(f.ministerio_id) ?? 0;
    saldoPorMinisterio.set(f.ministerio_id, atual + (f.tipo === 'receita' ? f.valor : -f.valor));
  }

  const encontrosPorMinisterio = new Map<string, MinisterioEncontro[]>();
  for (const e of (encontros as MinisterioEncontro[]) ?? []) {
    const lista = encontrosPorMinisterio.get(e.ministerio_id) ?? [];
    lista.push(e);
    encontrosPorMinisterio.set(e.ministerio_id, lista);
  }

  const hojeIso = new Date().toISOString().slice(0, 10);
  const idsUltimos3PorMinisterio = new Map<string, string[]>();
  for (const [ministerioId, lista] of encontrosPorMinisterio) {
    const realizados = lista.filter((e) => e.status === 'realizado').sort((a, b) => b.data.localeCompare(a.data));
    idsUltimos3PorMinisterio.set(ministerioId, realizados.slice(0, 3).map((e) => e.id));
  }
  const todosIdsUltimos3 = Array.from(idsUltimos3PorMinisterio.values()).flat();

  const { data: presencas, error: erroPres } =
    todosIdsUltimos3.length > 0
      ? await supabase.from('ministerio_presencas').select('encontro_id, presente').in('encontro_id', todosIdsUltimos3)
      : { data: [] as { encontro_id: string; presente: boolean }[], error: null };
  if (erroPres) throw erroPres;

  const presencasPorEncontro = new Map<string, { presentes: number; total: number }>();
  for (const p of (presencas as { encontro_id: string; presente: boolean }[]) ?? []) {
    const atual = presencasPorEncontro.get(p.encontro_id) ?? { presentes: 0, total: 0 };
    atual.total += 1;
    if (p.presente) atual.presentes += 1;
    presencasPorEncontro.set(p.encontro_id, atual);
  }

  return ((ministerios as Ministerio[]) ?? []).map((m) => {
    const lista = encontrosPorMinisterio.get(m.id) ?? [];
    const proximoEncontro =
      lista
        .filter((e) => e.status === 'agendado' && e.data >= hojeIso)
        .sort((a, b) => a.data.localeCompare(b.data))[0] ?? null;

    const idsUltimos3 = idsUltimos3PorMinisterio.get(m.id) ?? [];
    let presentesTotal = 0;
    let totalTotal = 0;
    for (const id of idsUltimos3) {
      const p = presencasPorEncontro.get(id);
      if (p) {
        presentesTotal += p.presentes;
        totalTotal += p.total;
      }
    }

    return {
      ...m,
      total_membros: contagem.get(m.id) ?? 0,
      saldo_caixa: saldoPorMinisterio.get(m.id) ?? 0,
      frequencia_media_3: totalTotal > 0 ? Math.round((presentesTotal / totalTotal) * 100) : null,
      proximo_encontro: proximoEncontro,
    };
  });
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

// Só retorna membros COM login (usuario_id presente) — membros só-pessoa
// (sem login) são listados à parte pelas telas que os suportam (Task #41).
export async function listarMembrosMinisterio(ministerioId: string): Promise<MembroDetalhe[]> {
  const { data, error } = await supabase
    .from('ministerio_membros')
    .select('*, usuario:usuarios(nome)')
    .eq('ministerio_id', ministerioId)
    .order('entrou_em', { ascending: true });
  if (error) throw error;
  return ((data as (MinisterioMembro & { usuario: { nome: string } | null })[]) ?? [])
    .filter((m) => m.usuario_id !== null)
    .map((m) => ({
      ...m,
      usuario_id: m.usuario_id as string,
      nome: m.usuario?.nome ?? 'Sem nome',
    }));
}

export async function adicionarMembro(ministerioId: string, usuarioId: string, cargo: CargoMinisterio) {
  const { error } = await supabase
    .from('ministerio_membros')
    .insert({ ministerio_id: ministerioId, usuario_id: usuarioId, cargo });
  if (error) throw error;
}

export interface MembroPessoaDetalhe extends MinisterioMembro {
  pessoa_id: string;
  nome: string;
}

// Chave única pra uma linha de presença/membro, já que MembroDetalhe e
// MembroPessoaDetalhe herdam as duas colunas de MinisterioMembro (uma delas
// sempre null) — o discriminador tem que ser por valor, não por "in".
export function chaveMembroMinisterio(m: MembroDetalhe | MembroPessoaDetalhe): string {
  return m.usuario_id ?? m.pessoa_id ?? m.id;
}

// Membros só-pessoa (sem login) — não entram na presença/encontros, que dependem
// de usuario_id (ministerio_presencas.usuario_id é NOT NULL no schema atual).
export async function listarMembrosPessoaMinisterio(ministerioId: string): Promise<MembroPessoaDetalhe[]> {
  const { data, error } = await supabase
    .from('ministerio_membros')
    .select('*, pessoa:pessoas(nome)')
    .eq('ministerio_id', ministerioId)
    .not('pessoa_id', 'is', null)
    .order('entrou_em', { ascending: true });
  if (error) throw error;
  return ((data as (MinisterioMembro & { pessoa: { nome: string } | null })[]) ?? []).map((m) => ({
    ...m,
    pessoa_id: m.pessoa_id as string,
    nome: m.pessoa?.nome ?? 'Sem nome',
  }));
}

export async function adicionarMembroPessoa(ministerioId: string, pessoaId: string, cargo: CargoMinisterio) {
  const { error } = await supabase
    .from('ministerio_membros')
    .insert({ ministerio_id: ministerioId, pessoa_id: pessoaId, cargo });
  if (error) throw error;
}

// Usado no perfil de Pessoa para mostrar em quais ministérios ela já está.
export async function listarMinisteriosDaPessoa(pessoaId: string): Promise<Ministerio[]> {
  const { data, error } = await supabase
    .from('ministerio_membros')
    .select('ministerio:ministerios(*)')
    .eq('pessoa_id', pessoaId)
    .eq('ativo', true);
  if (error) throw error;
  return (((data as unknown as { ministerio: Ministerio | null }[]) ?? []).map((r) => r.ministerio).filter(Boolean)) as Ministerio[];
}

// Usado no painel lateral de Membros, para mostrar em quais ministérios um usuário participa.
export async function listarMinisteriosDoUsuario(usuarioId: string): Promise<Ministerio[]> {
  const { data, error } = await supabase
    .from('ministerio_membros')
    .select('ministerio:ministerios(*)')
    .eq('usuario_id', usuarioId)
    .eq('ativo', true);
  if (error) throw error;
  return (((data as unknown as { ministerio: Ministerio | null }[]) ?? []).map((r) => r.ministerio).filter(Boolean)) as Ministerio[];
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
  presencas: { usuario_id?: string; pessoa_id?: string; presente: boolean; justificativa?: string }[]
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
        usuario_id: p.usuario_id || null,
        pessoa_id: p.pessoa_id || null,
        presente: p.presente,
        justificativa: p.justificativa || null,
      }))
    );
    if (erroPres) throw erroPres;
  }
  return encontro;
}

// Agenda um encontro futuro sem presença ainda — quando o encontro de fato
// acontecer, use "Registrar encontro" (criarEncontroComPresencas) normalmente.
export async function agendarEncontro(dados: {
  ministerio_id: string;
  titulo: string;
  data: string;
  horario?: string;
  local?: string;
}): Promise<MinisterioEncontro> {
  const { data, error } = await supabase
    .from('ministerio_encontros')
    .insert({
      ministerio_id: dados.ministerio_id,
      titulo: dados.titulo,
      data: dados.data,
      horario: dados.horario || null,
      local: dados.local || null,
      status: 'agendado',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as MinisterioEncontro;
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

// Frequência (%) de cada membro nos últimos N dias, a partir de encontros+presenças.
// Chave do mapa: usuario_id para membros com login, pessoa_id para membros sem login
// (nunca os dois — CHECK constraint garante isso no banco).
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
    const chave = p.usuario_id ?? p.pessoa_id;
    if (!chave) continue;
    if (p.presente) presentesPorMembro.set(chave, (presentesPorMembro.get(chave) ?? 0) + 1);
  }

  const frequencia = new Map<string, number>();
  if (totalEncontros === 0) return frequencia;
  for (const [chave, presentes] of presentesPorMembro) {
    frequencia.set(chave, Math.round((presentes / totalEncontros) * 100));
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
    .select('*, doador:pessoas(nome)')
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
