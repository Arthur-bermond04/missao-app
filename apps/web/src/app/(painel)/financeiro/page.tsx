'use client';

import { useEffect, useMemo, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import * as XLSX from 'xlsx';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { MetricCard } from '@/components/ui/MetricCard';
import { DespesasPieChart } from '@/components/financeiro/DespesasPieChart';
import { LancamentoModal } from '@/components/financeiro/LancamentoModal';
import { lancarFinanceiro, listarFinanceiro } from '@/lib/financeiro';
import { toastSuccess, toastError } from '@/lib/toast';
import { CATEGORIAS_FINANCEIRO, type Financeiro, type TipoFinanceiro } from '@/types/database';

const OPCOES_CATEGORIA = CATEGORIAS_FINANCEIRO.map((c) => ({ value: c, label: c }));

function mesLabel(dataIso: string) {
  const [ano, mes] = dataIso.split('-');
  return `${mes}/${ano}`;
}

function inicioMesAtual() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function FinanceiroPage() {
  const { usuario } = usePainelSession();

  const [lancamentos, setLancamentos] = useState<Financeiro[]>([]);
  const [tipo, setTipo] = useState<TipoFinanceiro>('receita');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_FINANCEIRO[0]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [salvando, setSalvando] = useState(false);

  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [modalAberto, setModalAberto] = useState(false);

  function abrirModal(tipoInicial: TipoFinanceiro) {
    setTipo(tipoInicial);
    setModalAberto(true);
  }

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    listarFinanceiro(usuario.comunidade_id).then(setLancamentos);
  }, [usuario?.comunidade_id]);

  async function handleLancar(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario?.comunidade_id || !valor) return;
    setSalvando(true);
    try {
      const novo = await lancarFinanceiro({
        comunidade_id: usuario.comunidade_id,
        tipo,
        categoria,
        descricao: descricao.trim() || undefined,
        valor: Number(valor),
        data,
      });
      setLancamentos((atual) => [novo, ...atual]);
      setDescricao('');
      setValor('');
      setModalAberto(false);
      toastSuccess(tipo === 'receita' ? 'Receita lançada com sucesso!' : 'Despesa lançada com sucesso!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  const filtrados = useMemo(() => {
    return lancamentos.filter((l) => {
      if (filtroInicio && l.data < filtroInicio) return false;
      if (filtroFim && l.data > filtroFim) return false;
      if (filtroCategoria && l.categoria !== filtroCategoria) return false;
      return true;
    });
  }, [lancamentos, filtroInicio, filtroFim, filtroCategoria]);

  const totalReceitas = filtrados.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
  const totalDespesas = filtrados.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);

  const graficoMensal = useMemo(() => {
    const mapa = new Map<string, { receitas: number; despesas: number }>();
    for (const l of filtrados) {
      const chave = l.data.slice(0, 7);
      const atual = mapa.get(chave) ?? { receitas: 0, despesas: 0 };
      if (l.tipo === 'receita') atual.receitas += l.valor;
      else atual.despesas += l.valor;
      mapa.set(chave, atual);
    }
    return Array.from(mapa.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([chave, valores]) => ({ mes: mesLabel(`${chave}-01`), ...valores }));
  }, [filtrados]);

  const maiorValorGrafico = Math.max(1, ...graficoMensal.flatMap((m) => [m.receitas, m.despesas]));

  const { receitaMes, despesaMes } = useMemo(() => {
    const inicio = inicioMesAtual();
    const doMes = lancamentos.filter((l) => l.data >= inicio);
    return {
      receitaMes: doMes.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0),
      despesaMes: doMes.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0),
    };
  }, [lancamentos]);
  const saldoMes = receitaMes - despesaMes;

  const despesasPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const l of filtrados) {
      if (l.tipo !== 'despesa') continue;
      mapa.set(l.categoria, (mapa.get(l.categoria) ?? 0) + l.valor);
    }
    return Array.from(mapa.entries())
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);
  }, [filtrados]);

  function exportarExcel() {
    const linhas = filtrados.map((l) => ({
      Tipo: l.tipo,
      Categoria: l.categoria,
      Descrição: l.descricao ?? '',
      Valor: l.valor,
      Data: new Date(l.data).toLocaleDateString('pt-BR'),
    }));
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, 'Financeiro');
    XLSX.writeFile(livro, 'financeiro.xlsx');
  }

  async function exportarPdf() {
    const { default: pdfMake } = await import('pdfmake/build/pdfmake');
    const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
    (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts.default?.vfs;

    pdfMake
      .createPdf({
        content: [
          { text: 'Relatório financeiro', style: 'titulo' },
          { text: `Receitas: R$ ${totalReceitas.toFixed(2)}   Despesas: R$ ${totalDespesas.toFixed(2)}`, margin: [0, 0, 0, 10] },
          {
            table: {
              headerRows: 1,
              widths: ['auto', 'auto', '*', 'auto', 'auto'],
              body: [
                ['Tipo', 'Categoria', 'Descrição', 'Valor', 'Data'],
                ...filtrados.map((l) => [
                  l.tipo,
                  l.categoria,
                  l.descricao ?? '',
                  `R$ ${l.valor.toFixed(2)}`,
                  new Date(l.data).toLocaleDateString('pt-BR'),
                ]),
              ],
            },
          },
        ],
        styles: { titulo: { fontSize: 16, bold: true, margin: [0, 0, 0, 12] } },
      })
      .download('financeiro.pdf');
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={Wallet}
        title="Financeiro"
        subtitle="Receitas, despesas e relatórios"
        actions={
          <>
            <Button variant="success" size="sm" onClick={() => abrirModal('receita')}>
              + Receita
            </Button>
            <Button variant="danger" size="sm" onClick={() => abrirModal('despesa')}>
              - Despesa
            </Button>
          </>
        }
      />

      <LancamentoModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        tipo={tipo}
        onTipoChange={setTipo}
        categoria={categoria}
        onCategoriaChange={setCategoria}
        descricao={descricao}
        onDescricaoChange={setDescricao}
        valor={valor}
        onValorChange={setValor}
        data={data}
        onDataChange={setData}
        onSubmit={handleLancar}
        salvando={salvando}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard icon={TrendingUp} iconColor="accent" label="Receita do mês" value={`R$ ${receitaMes.toFixed(2)}`} />
        <MetricCard icon={TrendingDown} iconColor="danger" label="Despesa do mês" value={`R$ ${despesaMes.toFixed(2)}`} />
        <MetricCard
          icon={Scale}
          iconColor={saldoMes >= 0 ? 'accent' : 'danger'}
          label="Saldo do mês"
          value={`R$ ${saldoMes.toFixed(2)}`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-bg-card p-6 shadow-card">
          <h2 className="text-sm font-bold text-text-primary">Despesas por categoria</h2>
          <div className="mt-3">
            <DespesasPieChart data={despesasPorCategoria} />
          </div>
        </div>

        <div className="rounded-lg bg-bg-card p-6 shadow-card">
          <h2 className="text-sm font-bold text-text-primary">Resumo do período filtrado</h2>
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-accent font-semibold">Receitas: R$ {totalReceitas.toFixed(2)}</span>
            <span className="text-danger font-semibold">Despesas: R$ {totalDespesas.toFixed(2)}</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">Saldo: R$ {(totalReceitas - totalDespesas).toFixed(2)}</p>

          <div className="mt-4 space-y-2">
            {graficoMensal.map((m) => (
              <div key={m.mes}>
                <p className="text-xs font-semibold text-text-secondary">{m.mes}</p>
                <div className="mt-1 flex gap-1">
                  <div className="h-3 rounded-full bg-accent" style={{ width: `${(m.receitas / maiorValorGrafico) * 100}%` }} />
                </div>
                <div className="mt-1 flex gap-1">
                  <div className="h-3 rounded-full bg-danger" style={{ width: `${(m.despesas / maiorValorGrafico) * 100}%` }} />
                </div>
              </div>
            ))}
            {graficoMensal.length === 0 && <p className="text-xs text-text-secondary">Sem lançamentos no período.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Input label="De" type="date" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} />
            <Input label="Até" type="date" value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} />
            <Select
              label="Categoria"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              options={[{ value: '', label: 'Todas' }, ...OPCOES_CATEGORIA]}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={exportarExcel}>
              Exportar Excel
            </Button>
            <Button variant="secondary" size="sm" onClick={exportarPdf}>
              Exportar PDF
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <Table
            data={filtrados}
            rowKey={(l) => l.id}
            columns={[
              { key: 'tipo', header: 'Tipo', render: (l) => <Badge variant={l.tipo} /> },
              { key: 'categoria', header: 'Categoria' },
              { key: 'descricao', header: 'Descrição', render: (l) => l.descricao ?? '' },
              { key: 'valor', header: 'Valor', render: (l) => `R$ ${l.valor.toFixed(2)}` },
              { key: 'data', header: 'Data', render: (l) => new Date(l.data).toLocaleDateString('pt-BR') },
            ]}
            emptyState={
              <EmptyState
                icon={Wallet}
                title="Nenhum lançamento no período"
                description="Registre a primeira receita ou despesa da sua comunidade."
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
