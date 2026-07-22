'use client';

import { useEffect, useMemo, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Scale, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { exportarExcel as exportarExcelLib, exportarPDF as exportarPDFLib } from '@/lib/exportacao';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { MetricCard } from '@/components/ui/MetricCard';
import { DespesasPieChart } from '@/components/financeiro/DespesasPieChart';
import { EvolucaoFinanceiraChart } from '@/components/financeiro/EvolucaoFinanceiraChart';
import { LancamentoModal } from '@/components/financeiro/LancamentoModal';
import { excluirFinanceiro, lancarFinanceiro, listarFinanceiro } from '@/lib/financeiro';
import { buscarComunidade } from '@/lib/comunidades';
import { listarRetiros } from '@/lib/retiros';
import { listarMinisterios, type MinisterioComContagem } from '@/lib/ministerios';
import { toastSuccess, toastError } from '@/lib/toast';
import { CATEGORIAS_FINANCEIRO, type Comunidade, type Financeiro, type Retiro, type TipoFinanceiro } from '@/types/database';

function inicioMesAtual() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function FinanceiroPage() {
  const { usuario } = usePainelSession();

  const [lancamentos, setLancamentos] = useState<Financeiro[]>([]);
  const [comunidade, setComunidade] = useState<Comunidade | null>(null);
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [ministerios, setMinisterios] = useState<MinisterioComContagem[]>([]);
  const [tipo, setTipo] = useState<TipoFinanceiro>('receita');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_FINANCEIRO[0]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [vinculo, setVinculo] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Financeiro | null>(null);

  async function handleExcluir() {
    if (!paraExcluir) return;
    try {
      await excluirFinanceiro(paraExcluir.id);
      setLancamentos((atual) => atual.filter((l) => l.id !== paraExcluir.id));
      toastSuccess('Lançamento excluído.');
      setParaExcluir(null);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao excluir. Tente novamente.');
    }
  }

  function abrirModal(tipoInicial: TipoFinanceiro) {
    setTipo(tipoInicial);
    setModalAberto(true);
  }

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    const comunidadeId = usuario.comunidade_id;
    listarFinanceiro(comunidadeId).then(setLancamentos);
    buscarComunidade(comunidadeId).then(setComunidade);
    listarRetiros(comunidadeId).then(setRetiros);
    listarMinisterios(comunidadeId).then(setMinisterios);
  }, [usuario?.comunidade_id]);

  async function handleLancar(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario?.comunidade_id || !valor) return;
    setSalvando(true);
    try {
      const [tipoVinculo, idVinculo] = vinculo ? vinculo.split(':') : [undefined, undefined];
      const novo = await lancarFinanceiro({
        comunidade_id: usuario.comunidade_id,
        tipo,
        categoria,
        descricao: descricao.trim() || undefined,
        valor: Number(valor),
        data,
        retiro_id: tipoVinculo === 'retiro' ? idVinculo : undefined,
        ministerio_id: tipoVinculo === 'ministerio' ? idVinculo : undefined,
      });
      setLancamentos((atual) => [novo, ...atual]);
      setDescricao('');
      setValor('');
      setVinculo('');
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

  const { receitaMes, despesaMes } = useMemo(() => {
    const inicio = inicioMesAtual();
    const doMes = lancamentos.filter((l) => l.data >= inicio);
    return {
      receitaMes: doMes.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0),
      despesaMes: doMes.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0),
    };
  }, [lancamentos]);

  // Cards do topo acompanham o mesmo período/categoria filtrados na tabela
  // abaixo — sem filtro nenhum, caem de volta pro mês corrente (evita a
  // tela mostrar dois números de "receita" diferentes ao mesmo tempo).
  const semFiltros = !filtroInicio && !filtroFim && !filtroCategoria;
  const receitaTopo = semFiltros ? receitaMes : totalReceitas;
  const despesaTopo = semFiltros ? despesaMes : totalDespesas;
  const saldoTopo = receitaTopo - despesaTopo;
  const labelPeriodo = semFiltros
    ? `Mês atual · ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
    : `${filtroInicio ? new Date(filtroInicio).toLocaleDateString('pt-BR') : 'início'} a ${
        filtroFim ? new Date(filtroFim).toLocaleDateString('pt-BR') : 'hoje'
      }${filtroCategoria ? ` · ${filtroCategoria}` : ''}`;

  const saldoMinisterios = useMemo(() => ministerios.reduce((s, m) => s + m.saldo_caixa, 0), [ministerios]);

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
    exportarExcelLib(
      filtrados,
      [
        { header: 'Tipo', render: (l) => l.tipo },
        { header: 'Categoria', render: (l) => l.categoria },
        { header: 'Descrição', render: (l) => l.descricao ?? '' },
        { header: 'Valor', render: (l) => l.valor },
        { header: 'Data', render: (l) => new Date(l.data).toLocaleDateString('pt-BR') },
      ],
      'financeiro.xlsx',
      'Financeiro'
    );
  }

  async function exportarPdf() {
    exportarPDFLib(
      'Relatório financeiro',
      [
        { tipo: 'texto', texto: `Receitas: R$ ${totalReceitas.toFixed(2)}   Despesas: R$ ${totalDespesas.toFixed(2)}` },
        {
          tipo: 'tabela',
          cabecalho: ['Tipo', 'Categoria', 'Descrição', 'Valor', 'Data'],
          larguras: ['auto', 'auto', '*', 'auto', 'auto'],
          linhas: filtrados.map((l) => [
            l.tipo,
            l.categoria,
            l.descricao ?? '',
            `R$ ${l.valor.toFixed(2)}`,
            new Date(l.data).toLocaleDateString('pt-BR'),
          ]),
        },
      ],
      'financeiro.pdf'
    );
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
        categoriasExtras={comunidade?.categorias_financeiras}
        descricao={descricao}
        onDescricaoChange={setDescricao}
        valor={valor}
        onValorChange={setValor}
        data={data}
        onDataChange={setData}
        vinculo={vinculo}
        onVinculoChange={setVinculo}
        retiros={retiros}
        ministerios={ministerios}
        onSubmit={handleLancar}
        salvando={salvando}
      />

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-text-secondary">{labelPeriodo}</p>
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard icon={TrendingUp} iconColor="accent" label="Receita" value={`R$ ${receitaTopo.toFixed(2)}`} />
        <MetricCard icon={TrendingDown} iconColor="danger" label="Despesa" value={`R$ ${despesaTopo.toFixed(2)}`} />
        <MetricCard
          icon={Scale}
          iconColor={saldoTopo >= 0 ? 'accent' : 'danger'}
          label="Saldo"
          value={`R$ ${saldoTopo.toFixed(2)}`}
          valorClassName={saldoTopo > 0 ? 'text-[#16A34A]' : saldoTopo < 0 ? 'text-danger' : 'text-text-secondary'}
        />
      </div>

      {!!comunidade?.meta_arrecadacao_mensal && (
        <div className="mt-6 rounded-lg bg-bg-card p-4 shadow-card">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-text-primary">Meta de arrecadação do mês</span>
            <span className="text-text-secondary">
              R$ {receitaMes.toFixed(2)} de R$ {comunidade.meta_arrecadacao_mensal.toFixed(2)} (
              {Math.round((receitaMes / comunidade.meta_arrecadacao_mensal) * 100)}%)
            </span>
          </div>
          <div className="mt-2 h-3 w-full rounded-full bg-bg-page">
            <div
              className={`h-3 rounded-full ${
                receitaMes / comunidade.meta_arrecadacao_mensal >= 0.8
                  ? 'bg-accent'
                  : receitaMes / comunidade.meta_arrecadacao_mensal >= 0.5
                  ? 'bg-warning'
                  : 'bg-danger'
              }`}
              style={{ width: `${Math.min(100, (receitaMes / comunidade.meta_arrecadacao_mensal) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-bg-card p-6 shadow-card">
          <h2 className="text-sm font-bold text-text-primary">Despesas por categoria</h2>
          <div className="mt-3">
            <DespesasPieChart data={despesasPorCategoria} />
          </div>
        </div>

        <div className="rounded-lg bg-bg-card p-6 shadow-card">
          <EvolucaoFinanceiraChart lancamentos={lancamentos} />
        </div>
      </div>

      {ministerios.length > 0 && (
        <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-primary">Caixas de ministérios</h2>
            <span className="text-xs text-text-secondary">Só leitura — não entra nos lançamentos gerais acima</span>
          </div>
          <div className="mt-3 space-y-2">
            {ministerios.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-text-primary">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.cor }} />
                  {m.nome}
                </span>
                <span className={`font-semibold ${m.saldo_caixa > 0 ? 'text-accent' : m.saldo_caixa < 0 ? 'text-danger' : 'text-text-secondary'}`}>
                  R$ {m.saldo_caixa.toFixed(2)}
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between border-t border-border px-3 pt-2 text-sm font-bold">
              <span className="text-text-primary">Total consolidado</span>
              <span className={saldoMinisterios >= 0 ? 'text-accent' : 'text-danger'}>R$ {saldoMinisterios.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Input label="De" type="date" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} />
            <Input label="Até" type="date" value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} />
            <Select
              label="Categoria"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              options={[
                { value: '', label: 'Todas' },
                ...[...CATEGORIAS_FINANCEIRO, ...(comunidade?.categorias_financeiras ?? [])].map((c) => ({ value: c, label: c })),
              ]}
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
            rowActions={(l) => (
              <button
                onClick={() => setParaExcluir(l)}
                className="rounded-md p-1.5 text-text-secondary hover:bg-danger-light hover:text-danger"
                title="Excluir lançamento"
              >
                <Trash2 size={14} />
              </button>
            )}
            emptyState={
              <EmptyState
                icon={Wallet}
                title="Nenhum lançamento no período"
                description="Registre a primeira receita ou despesa da sua comunidade."
              />
            }
          />

          <ConfirmModal
            open={!!paraExcluir}
            onClose={() => setParaExcluir(null)}
            onConfirm={handleExcluir}
            title="Excluir lançamento"
            description={
              paraExcluir
                ? `${paraExcluir.tipo === 'receita' ? 'Receita' : 'Despesa'} de R$ ${paraExcluir.valor.toFixed(2)}${
                    paraExcluir.descricao ? ` — ${paraExcluir.descricao}` : ''
                  }. Esta ação não pode ser desfeita.`
                : ''
            }
            confirmLabel="Excluir"
          />
        </div>
      </div>
    </div>
  );
}
