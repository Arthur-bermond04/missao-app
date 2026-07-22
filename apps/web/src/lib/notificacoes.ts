import { supabase } from './supabase';
import { resumoPastoral } from './pastoral';
import { resumoPessoas } from './pessoas';
import { listarMinisterios } from './ministerios';
import { buscarComunidade } from './comunidades';
import type { Perfil } from '../types/database';

export type CategoriaNotificacao = 'pastoral' | 'pessoas' | 'retiros' | 'ministerios' | 'financeiro' | 'mensagens';

export interface ItemNotificacao {
  label: string;
  quantidade: number;
  href: string;
  tone: 'warning' | 'danger';
  categoria: CategoriaNotificacao;
}

export const LABEL_CATEGORIA: Record<CategoriaNotificacao, string> = {
  pastoral: 'Pastoral',
  pessoas: 'Pessoas',
  retiros: 'Retiros',
  ministerios: 'Ministérios',
  financeiro: 'Financeiro',
  mensagens: 'Comunicação',
};

export interface ResumoNotificacoes {
  total: number;
  itens: ItemNotificacao[];
}

function inicioMesAtual() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

// Agrega os alertas mais urgentes de cada módulo num único sino. `perfil` é
// opcional só pra decidir se o alerta de meta financeira entra ou não
// (só faz sentido pra quem tem acesso ao módulo Financeiro).
export async function resumoNotificacoes(comunidadeId: string, perfil?: Perfil): Promise<ResumoNotificacoes> {
  const [pastoral, pessoas, retirosInfo, ministerios, comunidade, mensagensHoje] = await Promise.all([
    resumoPastoral(comunidadeId).catch(() => null),
    resumoPessoas(comunidadeId).catch(() => null),
    buscarAlertasRetiros(comunidadeId).catch(() => ({ poucasVagas: [], pagamentosPendentes: [] })),
    listarMinisterios(comunidadeId).catch(() => []),
    buscarComunidade(comunidadeId).catch(() => null),
    contarMensagensAgendadasHoje(comunidadeId).catch(() => 0),
  ]);

  const itens: ItemNotificacao[] = [];

  // --- Pastoral ---
  const atencaoRisco = (pastoral?.atencao ?? 0) + (pastoral?.risco ?? 0);
  if (atencaoRisco > 0) {
    itens.push({
      label: `${atencaoRisco} ovelha${atencaoRisco === 1 ? '' : 's'} em atenção/risco`,
      quantidade: atencaoRisco,
      href: '/pastoral',
      tone: 'danger',
      categoria: 'pastoral',
    });
  }

  // --- Pessoas ---
  if ((pessoas?.vencidas ?? 0) > 0) {
    itens.push({
      label: `${pessoas!.vencidas} contato${pessoas!.vencidas === 1 ? '' : 's'} vencido${pessoas!.vencidas === 1 ? '' : 's'} em Pessoas`,
      quantidade: pessoas!.vencidas,
      href: '/pessoas',
      tone: 'warning',
      categoria: 'pessoas',
    });
  }

  // --- Retiros ---
  for (const r of retirosInfo.poucasVagas) {
    itens.push({
      label: `${r.nome}: ${r.vagasRestantes} vaga${r.vagasRestantes === 1 ? '' : 's'} restante${r.vagasRestantes === 1 ? '' : 's'}`,
      quantidade: 1,
      href: '/retiros',
      tone: 'warning',
      categoria: 'retiros',
    });
  }
  for (const r of retirosInfo.pagamentosPendentes) {
    itens.push({
      label: `${r.nome}: ${r.pendentes} inscrito${r.pendentes === 1 ? '' : 's'} com pagamento pendente`,
      quantidade: r.pendentes,
      href: '/retiros',
      tone: 'warning',
      categoria: 'retiros',
    });
  }

  // --- Ministérios (frequência média dos últimos 3 encontros) ---
  for (const m of ministerios) {
    if (m.frequencia_media_3 != null && m.frequencia_media_3 < 50) {
      itens.push({
        label: `${m.nome}: frequência de ${m.frequencia_media_3}% nos últimos 3 encontros`,
        quantidade: 1,
        href: '/ministerios',
        tone: 'danger',
        categoria: 'ministerios',
      });
    }
  }

  // --- Financeiro (só quem tem acesso ao módulo) ---
  if (perfil && ['coordenador', 'admin'].includes(perfil) && comunidade?.meta_arrecadacao_mensal) {
    const { data: doMes } = await supabase
      .from('financeiro')
      .select('valor')
      .eq('comunidade_id', comunidadeId)
      .eq('tipo', 'receita')
      .gte('data', inicioMesAtual());
    const receitaMes = ((doMes as { valor: number }[]) ?? []).reduce((s, f) => s + f.valor, 0);
    const percentual = (receitaMes / comunidade.meta_arrecadacao_mensal) * 100;
    if (percentual < 50) {
      itens.push({
        label: `Arrecadação do mês em ${Math.round(percentual)}% da meta`,
        quantidade: 1,
        href: '/financeiro',
        tone: 'danger',
        categoria: 'financeiro',
      });
    }
  }

  // --- Mensagens agendadas para hoje ---
  if (mensagensHoje > 0) {
    itens.push({
      label: `${mensagensHoje} mensagem${mensagensHoje === 1 ? '' : 's'} agendada${mensagensHoje === 1 ? '' : 's'} para hoje`,
      quantidade: mensagensHoje,
      href: '/mensagens',
      tone: 'warning',
      categoria: 'mensagens',
    });
  }

  return { total: itens.reduce((s, i) => s + i.quantidade, 0), itens };
}

async function buscarAlertasRetiros(comunidadeId: string) {
  const { data: retiros, error } = await supabase
    .from('retiros')
    .select('id, nome, vagas')
    .eq('comunidade_id', comunidadeId)
    .eq('status', 'aberto');
  if (error) throw error;

  const lista = (retiros as { id: string; nome: string; vagas: number | null }[]) ?? [];
  if (lista.length === 0) return { poucasVagas: [], pagamentosPendentes: [] };

  const { data: inscricoes, error: erroInsc } = await supabase
    .from('inscricoes_retiro')
    .select('retiro_id, pagou')
    .in(
      'retiro_id',
      lista.map((r) => r.id)
    );
  if (erroInsc) throw erroInsc;

  const porRetiro = new Map<string, { total: number; pendentes: number }>();
  for (const i of (inscricoes as { retiro_id: string; pagou: boolean }[]) ?? []) {
    const atual = porRetiro.get(i.retiro_id) ?? { total: 0, pendentes: 0 };
    atual.total += 1;
    if (!i.pagou) atual.pendentes += 1;
    porRetiro.set(i.retiro_id, atual);
  }

  const poucasVagas: { nome: string; vagasRestantes: number }[] = [];
  const pagamentosPendentes: { nome: string; pendentes: number }[] = [];

  for (const r of lista) {
    const contagem = porRetiro.get(r.id) ?? { total: 0, pendentes: 0 };
    if (r.vagas) {
      const restantes = r.vagas - contagem.total;
      if (restantes >= 0 && restantes / r.vagas < 0.2) {
        poucasVagas.push({ nome: r.nome, vagasRestantes: restantes });
      }
    }
    if (contagem.pendentes > 0) {
      pagamentosPendentes.push({ nome: r.nome, pendentes: contagem.pendentes });
    }
  }

  return { poucasVagas, pagamentosPendentes };
}

// Uma mensagem conta como "agendada" (e não "enviada na hora") quando o
// horário de envio foi marcado bem depois da criação do registro — envios
// imediatos gravam enviado_em ≈ criado_em.
async function contarMensagensAgendadasHoje(comunidadeId: string): Promise<number> {
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);
  const hojeFim = new Date();
  hojeFim.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('mensagens_enviadas')
    .select('criado_em, enviado_em')
    .eq('comunidade_id', comunidadeId)
    .gte('enviado_em', hojeInicio.toISOString())
    .lte('enviado_em', hojeFim.toISOString());
  if (error) throw error;

  const CINCO_MINUTOS_MS = 5 * 60 * 1000;
  return ((data as { criado_em: string; enviado_em: string | null }[]) ?? []).filter((m) => {
    if (!m.enviado_em) return false;
    return new Date(m.enviado_em).getTime() - new Date(m.criado_em).getTime() > CINCO_MINUTOS_MS;
  }).length;
}
