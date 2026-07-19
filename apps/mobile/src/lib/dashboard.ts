import { supabase } from './supabase';
import { ETAPAS_FUNIL, type Contato, type EtapaJornada, type Financeiro, type Retiro } from '../types/database';

export interface DadosDashboard {
  membrosAtivos: number;
  totalContatos: number;
  proximoRetiro: Retiro | null;
  arrecadacaoMes: number;
  funil: { valor: EtapaJornada; label: string; total: number }[];
}

function inicioMesAtual() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export async function carregarDashboard(comunidadeId: string): Promise<DadosDashboard> {
  const hoje = new Date().toISOString().slice(0, 10);

  const [membrosRes, contatosRes, retiroRes, financeiroRes] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true })
      .eq('comunidade_id', comunidadeId)
      .eq('ativo', true),
    supabase.from('contatos').select('etapa_jornada').eq('comunidade_id', comunidadeId),
    supabase
      .from('retiros')
      .select('*')
      .eq('comunidade_id', comunidadeId)
      .gte('data_inicio', hoje)
      .order('data_inicio', { ascending: true })
      .limit(1),
    supabase.from('financeiro').select('tipo, valor, data').eq('comunidade_id', comunidadeId),
  ]);

  const contatos = (contatosRes.data as Pick<Contato, 'etapa_jornada'>[]) ?? [];
  const funil = ETAPAS_FUNIL.map((etapa, index) => {
    const total = contatos.filter((c) => {
      const indice = ETAPAS_FUNIL.findIndex((e) => e.valor === c.etapa_jornada);
      return indice >= index;
    }).length;
    return { ...etapa, total };
  });

  const inicio = inicioMesAtual();
  const financeiro = (financeiroRes.data as Pick<Financeiro, 'tipo' | 'valor' | 'data'>[]) ?? [];
  const arrecadacaoMes = financeiro
    .filter((f) => f.tipo === 'receita' && f.data >= inicio)
    .reduce((soma, f) => soma + f.valor, 0);

  return {
    membrosAtivos: membrosRes.count ?? 0,
    totalContatos: contatos.length,
    proximoRetiro: (retiroRes.data as Retiro[])?.[0] ?? null,
    arrecadacaoMes,
    funil,
  };
}
