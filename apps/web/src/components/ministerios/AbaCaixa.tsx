'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { MetricCard } from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Wallet } from 'lucide-react';
import { LancamentoMinisterioModal } from './LancamentoMinisterioModal';
import type { LancamentoDetalhe } from '@/lib/ministerios';
import type { Ministerio, Pessoa, TipoFinanceiro } from '@/types/database';

function inicioMesAtual() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

interface AbaCaixaProps {
  ministerio: Ministerio;
  comunidadeId: string;
  lancamentos: LancamentoDetalhe[];
  pessoas: Pessoa[];
  onRefresh: () => void;
}

export function AbaCaixa({ ministerio, comunidadeId, lancamentos, pessoas, onRefresh }: AbaCaixaProps) {
  const [modalTipo, setModalTipo] = useState<TipoFinanceiro | null>(null);

  const { receitaMes, despesaMes, saldo } = useMemo(() => {
    const inicio = inicioMesAtual();
    const doMes = lancamentos.filter((l) => l.data >= inicio);
    const receitaMes = doMes.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    const despesaMes = doMes.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
    const saldo = lancamentos.reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), 0);
    return { receitaMes, despesaMes, saldo };
  }, [lancamentos]);

  function exportarExcel() {
    const linhas = lancamentos.map((l) => ({
      Tipo: l.tipo,
      Categoria: l.categoria,
      Descrição: l.descricao ?? '',
      Valor: l.valor,
      Doador: l.doador_display ?? '',
      Data: new Date(l.data).toLocaleDateString('pt-BR'),
    }));
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, 'Caixa');
    XLSX.writeFile(livro, `${ministerio.nome}-caixa.xlsx`);
  }

  return (
    <div className="space-y-6">
      {modalTipo && (
        <LancamentoMinisterioModal
          open={modalTipo !== null}
          onClose={() => setModalTipo(null)}
          tipoInicial={modalTipo}
          ministerioId={ministerio.id}
          comunidadeId={comunidadeId}
          pessoas={pessoas}
          onLancado={onRefresh}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard icon={TrendingUp} iconColor="accent" label="Receitas do mês" value={`R$ ${receitaMes.toFixed(2)}`} />
        <MetricCard icon={TrendingDown} iconColor="danger" label="Despesas do mês" value={`R$ ${despesaMes.toFixed(2)}`} />
        <MetricCard
          icon={Scale}
          iconColor={saldo >= 0 ? 'accent' : 'danger'}
          label="Saldo atual"
          value={`R$ ${saldo.toFixed(2)}`}
          valorClassName={saldo > 0 ? 'text-success' : saldo < 0 ? 'text-danger' : 'text-text-secondary'}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="success" size="sm" onClick={() => setModalTipo('receita')}>
          + Receita
        </Button>
        <Button variant="danger" size="sm" onClick={() => setModalTipo('despesa')}>
          - Despesa
        </Button>
        <Button variant="secondary" size="sm" onClick={exportarExcel}>
          Exportar Excel
        </Button>
      </div>

      <Table
        data={lancamentos}
        rowKey={(l) => l.id}
        columns={[
          { key: 'tipo', header: 'Tipo', render: (l) => <Badge variant={l.tipo} /> },
          { key: 'categoria', header: 'Categoria' },
          { key: 'descricao', header: 'Descrição', render: (l) => l.descricao ?? '' },
          { key: 'doador', header: 'Doador', render: (l) => l.doador_display ?? '—' },
          { key: 'valor', header: 'Valor', render: (l) => `R$ ${l.valor.toFixed(2)}` },
          { key: 'data', header: 'Data', render: (l) => new Date(l.data).toLocaleDateString('pt-BR') },
        ]}
        emptyState={
          <EmptyState
            icon={Wallet}
            title="Nenhum lançamento no caixa"
            description="Registre a primeira receita ou despesa deste ministério."
          />
        }
      />
    </div>
  );
}
