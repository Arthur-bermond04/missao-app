import { supabase } from './supabase';
import type { EstadoEspiritual, EtapaFormacao, FrequenciaAcompanhamento } from '../types/database';

// Linha da view pastoral_ovelhas_resumo — SÓ métricas, nunca o conteúdo
// confidencial dos encontros (ver migration_monitoria_pastoral.sql).
export interface OvelhaResumo {
  id: string;
  pastor_id: string;
  comunidade_id: string;
  nome: string;
  telefone: string | null;
  etapa_formacao: EtapaFormacao;
  estado_espiritual: EstadoEspiritual;
  frequencia_acompanhamento: FrequenciaAcompanhamento;
  proxima_reuniao: string | null;
  ativo: boolean;
  total_encontros: number;
  encontros_ultimo_mes: number;
  ultimo_encontro: string | null;
  dias_sem_encontro: number | null;
}

const DIAS_FREQUENCIA: Record<FrequenciaAcompanhamento, number> = {
  semanal: 7,
  quinzenal: 15,
  mensal: 30,
  sob_demanda: 90,
};

// Uma ovelha está "em atraso" quando passou mais tempo desde o último
// encontro do que a frequência combinada prevê (ou nunca teve encontro).
export function ovelhaEmAtraso(o: OvelhaResumo): boolean {
  const limite = DIAS_FREQUENCIA[o.frequencia_acompanhamento] ?? 30;
  if (o.dias_sem_encontro == null) return true;
  return o.dias_sem_encontro > limite;
}

export async function listarOvelhasResumo(comunidadeId: string): Promise<OvelhaResumo[]> {
  const { data, error } = await supabase
    .from('pastoral_ovelhas_resumo')
    .select('*')
    .eq('comunidade_id', comunidadeId)
    .eq('ativo', true)
    .order('nome', { ascending: true });
  if (error) throw error;
  return (data as OvelhaResumo[]) ?? [];
}

export interface MetricasPastor {
  pastorId: string;
  pastorNome: string;
  ovelhasAtivas: number;
  emRisco: number;
  emAtraso: number;
  encontrosMes: number;
  ultimoRegistro: string | null;
  // taxa de cumprimento: encontros no mês / ovelhas ativas (1 esperado por
  // ovelha/mês como referência), limitada a 100%
  taxaCumprimento: number;
  ovelhas: OvelhaResumo[];
}

export type StatusPastor = 'ativo' | 'atencao' | 'inativo';

export function statusPastor(taxa: number): StatusPastor {
  if (taxa >= 80) return 'ativo';
  if (taxa >= 50) return 'atencao';
  return 'inativo';
}

// Agrega as ovelhas por pastor e calcula as métricas de desempenho. O
// coordenador só chega aqui com dados já filtrados pela view (sem relatos).
export function agruparMetricasPorPastor(
  ovelhas: OvelhaResumo[],
  pastores: { id: string; nome: string }[]
): MetricasPastor[] {
  const porPastor = new Map<string, OvelhaResumo[]>();
  for (const o of ovelhas) {
    const lista = porPastor.get(o.pastor_id) ?? [];
    lista.push(o);
    porPastor.set(o.pastor_id, lista);
  }

  return pastores
    .map((p) => {
      const lista = porPastor.get(p.id) ?? [];
      const ovelhasAtivas = lista.length;
      const emRisco = lista.filter((o) => o.estado_espiritual === 'risco').length;
      const emAtraso = lista.filter(ovelhaEmAtraso).length;
      const encontrosMes = lista.reduce((s, o) => s + (o.encontros_ultimo_mes ?? 0), 0);
      const ultimoRegistro = lista.reduce<string | null>(
        (max, o) => (o.ultimo_encontro && (max === null || o.ultimo_encontro > max) ? o.ultimo_encontro : max),
        null
      );
      const taxaCumprimento = ovelhasAtivas > 0 ? Math.min(100, Math.round((encontrosMes / ovelhasAtivas) * 100)) : 0;
      return { pastorId: p.id, pastorNome: p.nome, ovelhasAtivas, emRisco, emAtraso, encontrosMes, ultimoRegistro, taxaCumprimento, ovelhas: lista };
    })
    .filter((m) => m.ovelhasAtivas > 0)
    .sort((a, b) => a.taxaCumprimento - b.taxaCumprimento);
}
