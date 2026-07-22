import { supabase } from './supabase';
import {
  ESTADOS_OVELHA_ENCONTRO,
  FREQUENCIAS_ACOMPANHAMENTO,
  type EstadoEspiritual,
  type PastoralEncontro,
  type PastoralFruto,
  type PastoralObjetivo,
  type PastoralOvelha,
  type PastoralPresenca,
  type TemaPastoral,
  type TipoEncontroPastoral,
  type TipoEventoPastoral,
  type TipoFrutoPastoral,
} from '../types/database';

// ---------------------------------------------------------------------------
// Ovelhas (CRUD). O RLS já garante que o pastor só vê as próprias ovelhas
// (e o admin vê todas), então basta filtrar por comunidade.
// ---------------------------------------------------------------------------

export async function listarOvelhas(comunidadeId: string): Promise<PastoralOvelha[]> {
  const { data, error } = await supabase
    .from('pastoral_ovelhas')
    .select('*')
    .eq('comunidade_id', comunidadeId)
    .order('nome', { ascending: true });
  if (error) throw error;
  return (data as PastoralOvelha[]) ?? [];
}

export async function buscarOvelha(id: string): Promise<PastoralOvelha | null> {
  const { data, error } = await supabase.from('pastoral_ovelhas').select('*').eq('id', id).single();
  if (error) return null;
  return data as PastoralOvelha;
}

// Usado no painel lateral de Membros — RLS já restringe a quem o usuário
// logado pode ver (o próprio pastor ou admin), então um lider vendo o perfil
// de outro lider simplesmente recebe uma lista vazia (privacidade preservada).
export async function listarOvelhasDoPastor(pastorId: string): Promise<PastoralOvelha[]> {
  const { data, error } = await supabase
    .from('pastoral_ovelhas')
    .select('*')
    .eq('pastor_id', pastorId)
    .eq('ativo', true);
  if (error) return [];
  return (data as PastoralOvelha[]) ?? [];
}

// Usado no perfil de Pessoa para mostrar se já existe acompanhamento pastoral vinculado.
// Retorna null tanto se não houver vínculo quanto se o usuário logado não tiver acesso
// (RLS restringe pastoral a pastor/admin) — não dá pra distinguir os dois casos e não precisa.
export async function buscarOvelhaPorPessoa(pessoaId: string): Promise<PastoralOvelha | null> {
  const { data, error } = await supabase.from('pastoral_ovelhas').select('*').eq('pessoa_id', pessoaId).maybeSingle();
  if (error) return null;
  return data as PastoralOvelha | null;
}

export async function criarOvelha(dados: {
  comunidade_id: string;
  pastor_id: string;
  nome: string;
  usuario_id?: string;
  pessoa_id?: string;
  telefone?: string;
  email?: string;
  idade?: number;
  etapa_formacao?: string;
  estado_espiritual?: EstadoEspiritual;
  frequencia_acompanhamento?: string;
  objetivo_atual?: string;
  proxima_reuniao?: string;
}): Promise<PastoralOvelha> {
  const { data, error } = await supabase
    .from('pastoral_ovelhas')
    .insert({
      comunidade_id: dados.comunidade_id,
      pastor_id: dados.pastor_id,
      nome: dados.nome,
      usuario_id: dados.usuario_id || null,
      pessoa_id: dados.pessoa_id || null,
      telefone: dados.telefone || null,
      email: dados.email || null,
      idade: dados.idade ?? null,
      etapa_formacao: dados.etapa_formacao ?? 'inicio',
      estado_espiritual: dados.estado_espiritual ?? 'estavel',
      frequencia_acompanhamento: dados.frequencia_acompanhamento ?? 'mensal',
      objetivo_atual: dados.objetivo_atual || null,
      proxima_reuniao: dados.proxima_reuniao || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PastoralOvelha;
}

export async function atualizarOvelha(id: string, campos: Partial<PastoralOvelha>) {
  const { error } = await supabase.from('pastoral_ovelhas').update(campos).eq('id', id);
  if (error) throw error;
}

// Transfere o acompanhamento para outro pastor — o histórico de encontros
// e presenças é mantido, só o pastor_id muda.
export async function transferirOvelha(id: string, novoPastorId: string) {
  await atualizarOvelha(id, { pastor_id: novoPastorId });
}

export async function arquivarOvelha(id: string) {
  await atualizarOvelha(id, { ativo: false });
}

// Hard delete — apaga a ovelha e (via ON DELETE CASCADE) todos os
// encontros/presenças/objetivos/frutos ligados a ela. RLS restringe a
// quem já pode escrever nessa ovelha (pastor dono ou admin); a UI só
// mostra esse botão pra admin, por ser irreversível.
export async function excluirOvelha(id: string) {
  const { error } = await supabase.from('pastoral_ovelhas').delete().eq('id', id);
  if (error) throw error;
}

export async function excluirEncontroPastoral(id: string) {
  const { error } = await supabase.from('pastoral_encontros').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Objetivos e metas (histórico)
// ---------------------------------------------------------------------------

// Retorna [] em erro (em vez de lançar) porque isso é usado junto com
// buscarOvelha/listarEncontrosPastorais num único Promise.all na tela de
// perfil — se a migration_pastoral_objetivos.sql ainda não rodou, a tabela
// não existe, e não podemos deixar isso derrubar o carregamento do resto
// da página (faria a ovelha parecer "não encontrada").
export async function listarObjetivos(ovelhaId: string): Promise<PastoralObjetivo[]> {
  const { data, error } = await supabase
    .from('pastoral_objetivos')
    .select('*')
    .eq('ovelha_id', ovelhaId)
    .order('data_inicio', { ascending: false });
  if (error) return [];
  return (data as PastoralObjetivo[]) ?? [];
}

// Define um novo objetivo atual: fecha o anterior (se houver, com resultado)
// e grava tanto o histórico quanto o campo pastoral_ovelhas.objetivo_atual
// (mantido por compatibilidade com o resto da tela).
export async function definirNovoObjetivo(ovelhaId: string, objetivo: string) {
  const { error } = await supabase.from('pastoral_objetivos').insert({ ovelha_id: ovelhaId, objetivo });
  if (error) throw error;
  await atualizarOvelha(ovelhaId, { objetivo_atual: objetivo });
}

export async function concluirObjetivo(objetivoId: string, ovelhaId: string, resultado: string) {
  const { error } = await supabase
    .from('pastoral_objetivos')
    .update({ data_fim: new Date().toISOString().slice(0, 10), resultado })
    .eq('id', objetivoId);
  if (error) throw error;
  await atualizarOvelha(ovelhaId, { objetivo_atual: null });
}

// ---------------------------------------------------------------------------
// Encontros pastorais (confidenciais — RLS restringe a pastor/admin)
// ---------------------------------------------------------------------------

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
  duracao_minutos?: number;
  tipo: TipoEncontroPastoral;
  estado_ovelha: string;
  temas_abordados?: TemaPastoral[];
  relato: string;
  encaminhamentos?: string;
  proxima_reuniao?: string;
  nivel_abertura?: number;
}): Promise<PastoralEncontro> {
  const { data, error } = await supabase
    .from('pastoral_encontros')
    .insert({
      ovelha_id: dados.ovelha_id,
      pastor_id: dados.pastor_id,
      data: dados.data,
      duracao_minutos: dados.duracao_minutos ?? null,
      tipo: dados.tipo,
      estado_ovelha: dados.estado_ovelha,
      temas_abordados: dados.temas_abordados ?? [],
      relato: dados.relato,
      encaminhamentos: dados.encaminhamentos || null,
      proxima_reuniao: dados.proxima_reuniao || null,
      nivel_abertura: dados.nivel_abertura ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;

  // atualiza a próxima reunião da ovelha, se informada
  if (dados.proxima_reuniao) {
    await atualizarOvelha(dados.ovelha_id, { proxima_reuniao: dados.proxima_reuniao });
  }
  return data as PastoralEncontro;
}

export async function atualizarEncontroPastoral(id: string, campos: Partial<PastoralEncontro>) {
  const { error } = await supabase.from('pastoral_encontros').update(campos).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Presenças em eventos gerais
// ---------------------------------------------------------------------------

export async function listarPresencasOvelha(ovelhaId: string): Promise<PastoralPresenca[]> {
  const { data, error } = await supabase
    .from('pastoral_presencas')
    .select('*')
    .eq('ovelha_id', ovelhaId)
    .order('data', { ascending: false });
  if (error) throw error;
  return (data as PastoralPresenca[]) ?? [];
}

export async function registrarPresencaOvelha(dados: {
  ovelha_id: string;
  tipo_evento: TipoEventoPastoral;
  nome_evento?: string;
  data: string;
  presente: boolean;
}): Promise<PastoralPresenca> {
  const { data, error } = await supabase
    .from('pastoral_presencas')
    .insert({
      ovelha_id: dados.ovelha_id,
      tipo_evento: dados.tipo_evento,
      nome_evento: dados.nome_evento || null,
      data: dados.data,
      presente: dados.presente,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PastoralPresenca;
}

// ---------------------------------------------------------------------------
// Frutos do acompanhamento (conquistas espirituais, sacramentos, etc.)
// ---------------------------------------------------------------------------

export async function listarFrutos(ovelhaId: string): Promise<PastoralFruto[]> {
  const { data, error } = await supabase
    .from('pastoral_frutos')
    .select('*')
    .eq('ovelha_id', ovelhaId)
    .order('data', { ascending: false });
  if (error) throw error;
  return (data as PastoralFruto[]) ?? [];
}

export async function contarFrutosPorOvelha(ovelhaIds: string[]): Promise<Record<string, number>> {
  if (ovelhaIds.length === 0) return {};
  const { data, error } = await supabase.from('pastoral_frutos').select('ovelha_id').in('ovelha_id', ovelhaIds);
  if (error) throw error;
  const contagem: Record<string, number> = {};
  for (const f of (data as { ovelha_id: string }[]) ?? []) {
    contagem[f.ovelha_id] = (contagem[f.ovelha_id] ?? 0) + 1;
  }
  return contagem;
}

export async function registrarFruto(dados: {
  ovelha_id: string;
  pastor_id: string;
  data: string;
  tipo: TipoFrutoPastoral;
  titulo: string;
  descricao?: string;
}): Promise<PastoralFruto> {
  const { data, error } = await supabase
    .from('pastoral_frutos')
    .insert({
      ovelha_id: dados.ovelha_id,
      pastor_id: dados.pastor_id,
      data: dados.data,
      tipo: dados.tipo,
      titulo: dados.titulo,
      descricao: dados.descricao || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PastoralFruto;
}

export async function excluirFruto(id: string) {
  const { error } = await supabase.from('pastoral_frutos').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Indicadores e alertas automáticos
// ---------------------------------------------------------------------------

export type NivelAlerta = 'perigo' | 'alerta' | 'info';
export interface AlertaPastoral {
  nivel: NivelAlerta;
  mensagem: string;
}

export interface IndicadoresOvelha {
  diasDesdeUltimoEncontro: number | null;
  frequenciaEventos: number | null; // % nos últimos 3 meses
  nivelAberturaMedio: number | null; // média dos últimos 3 encontros (1-5)
  encontrosRealizados: number;
  encontrosPrevistos: number;
  reuniaoAtrasada: boolean;
  alertas: AlertaPastoral[];
}

function diasEntre(dataIso: string, ate = new Date()): number {
  return Math.floor((ate.getTime() - new Date(dataIso).getTime()) / (24 * 60 * 60 * 1000));
}

export function scoreEstadoEncontro(estado: string): number {
  return ESTADOS_OVELHA_ENCONTRO.find((e) => e.valor === estado)?.score ?? 3;
}

// Avalia uma ovelha a partir dos seus encontros e presenças, gerando indicadores + alertas.
export function avaliarOvelha(
  ovelha: PastoralOvelha,
  encontros: PastoralEncontro[],
  presencas: PastoralPresenca[]
): IndicadoresOvelha {
  const hojeIso = new Date().toISOString().slice(0, 10);
  const freqDias =
    FREQUENCIAS_ACOMPANHAMENTO.find((f) => f.valor === ovelha.frequencia_acompanhamento)?.dias ?? 30;

  // encontros em ordem cronológica (mais recente primeiro já vem do fetch)
  const ordenados = [...encontros].sort((a, b) => b.data.localeCompare(a.data));
  const ultimo = ordenados[0] ?? null;
  const diasDesdeUltimoEncontro = ultimo ? diasEntre(ultimo.data) : null;

  // frequência em eventos nos últimos 3 meses
  const limite3m = new Date();
  limite3m.setMonth(limite3m.getMonth() - 3);
  const limiteIso = limite3m.toISOString().slice(0, 10);
  const presencasJanela = presencas.filter((p) => p.data >= limiteIso);
  const frequenciaEventos =
    presencasJanela.length > 0
      ? Math.round((presencasJanela.filter((p) => p.presente).length / presencasJanela.length) * 100)
      : null;

  // nível médio de abertura nos últimos 3 encontros
  const ultimos3 = ordenados.slice(0, 3).filter((e) => e.nivel_abertura != null);
  const nivelAberturaMedio =
    ultimos3.length > 0
      ? ultimos3.reduce((s, e) => s + (e.nivel_abertura ?? 0), 0) / ultimos3.length
      : null;

  // encontros previstos desde o início do acompanhamento
  const diasAcompanhando = Math.max(0, diasEntre(ovelha.data_inicio_acompanhamento));
  const encontrosPrevistos = Math.max(1, Math.floor(diasAcompanhando / freqDias));
  const encontrosRealizados = encontros.length;

  const reuniaoAtrasada = !!ovelha.proxima_reuniao && ovelha.proxima_reuniao < hojeIso;

  // --- alertas automáticos ---
  const alertas: AlertaPastoral[] = [];

  if (diasDesdeUltimoEncontro != null && diasDesdeUltimoEncontro > freqDias) {
    alertas.push({
      nivel: 'perigo',
      mensagem: `Sem encontro há ${diasDesdeUltimoEncontro} dias (frequência combinada: a cada ${freqDias} dias)`,
    });
  }
  if (ovelha.estado_espiritual === 'risco') {
    alertas.push({ nivel: 'perigo', mensagem: 'Ovelha em estado de risco — cuidado urgente' });
  }
  if (reuniaoAtrasada) {
    alertas.push({ nivel: 'perigo', mensagem: 'Reunião em atraso' });
  }
  if (frequenciaEventos != null && frequenciaEventos < 50) {
    alertas.push({ nivel: 'alerta', mensagem: `Presença em eventos baixa (${frequenciaEventos}%) no último trimestre` });
  }
  if (ovelha.estado_espiritual === 'atencao') {
    alertas.push({ nivel: 'alerta', mensagem: 'Estado espiritual em atenção' });
  }
  // nível de abertura caindo 2+ pontos nos últimos 3 encontros
  if (ultimos3.length >= 3) {
    const maisAntigo = ultimos3[ultimos3.length - 1].nivel_abertura ?? 0;
    const maisRecente = ultimos3[0].nivel_abertura ?? 0;
    if (maisAntigo - maisRecente >= 2) {
      alertas.push({ nivel: 'alerta', mensagem: 'Ovelha se fechando — abertura caindo nos últimos encontros' });
    }
  }
  // 3+ encontros seguidos sem encaminhamentos
  const ultimos3Enc = ordenados.slice(0, 3);
  if (ultimos3Enc.length >= 3 && ultimos3Enc.every((e) => !e.encaminhamentos?.trim())) {
    alertas.push({ nivel: 'info', mensagem: 'Considere definir um objetivo para este acompanhamento' });
  }

  return {
    diasDesdeUltimoEncontro,
    frequenciaEventos,
    nivelAberturaMedio,
    encontrosRealizados,
    encontrosPrevistos,
    reuniaoAtrasada,
    alertas,
  };
}

// ---------------------------------------------------------------------------
// Resumo para o dashboard geral
// ---------------------------------------------------------------------------

export interface ResumoPastoral {
  totalAtivas: number;
  crescendo: number;
  atencao: number;
  risco: number;
  proximasReunioesSemana: number;
}

export async function resumoPastoral(comunidadeId: string): Promise<ResumoPastoral> {
  const { data, error } = await supabase
    .from('pastoral_ovelhas')
    .select('estado_espiritual, proxima_reuniao, ativo')
    .eq('comunidade_id', comunidadeId)
    .eq('ativo', true);
  if (error) throw error;

  const ovelhas = (data as Pick<PastoralOvelha, 'estado_espiritual' | 'proxima_reuniao' | 'ativo'>[]) ?? [];
  const hoje = new Date();
  const em7 = new Date();
  em7.setDate(em7.getDate() + 7);
  const hojeIso = hoje.toISOString().slice(0, 10);
  const em7Iso = em7.toISOString().slice(0, 10);

  return {
    totalAtivas: ovelhas.length,
    crescendo: ovelhas.filter((o) => o.estado_espiritual === 'crescendo').length,
    atencao: ovelhas.filter((o) => o.estado_espiritual === 'atencao').length,
    risco: ovelhas.filter((o) => o.estado_espiritual === 'risco').length,
    proximasReunioesSemana: ovelhas.filter(
      (o) => o.proxima_reuniao && o.proxima_reuniao >= hojeIso && o.proxima_reuniao <= em7Iso
    ).length,
  };
}
