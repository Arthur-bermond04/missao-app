import { resumoPastoral } from './pastoral';
import { resumoPessoas } from './pessoas';

export interface ItemNotificacao {
  label: string;
  quantidade: number;
  href: string;
  tone: 'warning' | 'danger';
}

export interface ResumoNotificacoes {
  total: number;
  itens: ItemNotificacao[];
}

// Agrega os alertas mais urgentes de cada módulo num único sino. MVP: reaproveita
// os resumos já calculados para os cards do dashboard, sem novas queries pesadas.
export async function resumoNotificacoes(comunidadeId: string): Promise<ResumoNotificacoes> {
  const [pastoral, pessoas] = await Promise.all([
    resumoPastoral(comunidadeId).catch(() => null),
    resumoPessoas(comunidadeId).catch(() => null),
  ]);

  const itens: ItemNotificacao[] = [];

  const atencaoRisco = (pastoral?.atencao ?? 0) + (pastoral?.risco ?? 0);
  if (atencaoRisco > 0) {
    itens.push({
      label: `${atencaoRisco} ovelha${atencaoRisco === 1 ? '' : 's'} em atenção/risco`,
      quantidade: atencaoRisco,
      href: '/pastoral',
      tone: 'danger',
    });
  }

  if ((pessoas?.vencidas ?? 0) > 0) {
    itens.push({
      label: `${pessoas!.vencidas} contato${pessoas!.vencidas === 1 ? '' : 's'} vencido${pessoas!.vencidas === 1 ? '' : 's'} em Pessoas`,
      quantidade: pessoas!.vencidas,
      href: '/pessoas',
      tone: 'warning',
    });
  }

  return { total: itens.reduce((s, i) => s + i.quantidade, 0), itens };
}
