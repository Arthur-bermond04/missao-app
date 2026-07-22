'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileDown } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { listarFinanceiro } from '@/lib/financeiro';
import type { Financeiro } from '@/types/database';

export function RelatorioFinanceiro({ comunidadeId }: { comunidadeId: string }) {
  const [lancamentos, setLancamentos] = useState<Financeiro[]>([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    listarFinanceiro(comunidadeId)
      .then(setLancamentos)
      .finally(() => setCarregando(false));
  }, [comunidadeId]);

  const filtrados = useMemo(() => {
    return lancamentos.filter((l) => {
      const data = l.data.slice(0, 10);
      if (dataInicio && data < dataInicio) return false;
      if (dataFim && data > dataFim) return false;
      return true;
    });
  }, [lancamentos, dataInicio, dataFim]);

  const dre = useMemo(() => {
    const receita = filtrados.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
    const despesa = filtrados.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);
    return { receita, despesa, saldo: receita - despesa };
  }, [filtrados]);

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, { receita: number; despesa: number }>();
    for (const l of filtrados) {
      const atual = mapa.get(l.categoria) ?? { receita: 0, despesa: 0 };
      if (l.tipo === 'receita') atual.receita += Number(l.valor);
      else atual.despesa += Number(l.valor);
      mapa.set(l.categoria, atual);
    }
    return [...mapa.entries()]
      .map(([categoria, v]) => ({ categoria, ...v, total: v.receita + v.despesa }))
      .sort((a, b) => b.total - a.total);
  }, [filtrados]);

  function exportarExcel() {
    const linhas = filtrados.map((l) => ({
      Data: new Date(l.data).toLocaleDateString('pt-BR'),
      Tipo: l.tipo,
      Categoria: l.categoria,
      Descrição: l.descricao ?? '',
      Valor: Number(l.valor),
    }));
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, 'Financeiro');
    XLSX.writeFile(livro, 'relatorio-financeiro.xlsx');
  }

  async function exportarPdf() {
    const { default: pdfMake } = await import('pdfmake/build/pdfmake');
    const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
    (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts.default?.vfs;

    pdfMake
      .createPdf({
        content: [
          { text: 'Relatório Financeiro', style: 'titulo' },
          {
            table: {
              widths: ['*', 'auto'],
              body: [
                ['Receita total', `R$ ${dre.receita.toFixed(2)}`],
                ['Despesa total', `R$ ${dre.despesa.toFixed(2)}`],
                ['Saldo', `R$ ${dre.saldo.toFixed(2)}`],
              ],
            },
          },
          { text: 'Por categoria', style: 'secao' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto'],
              body: [
                ['Categoria', 'Receita', 'Despesa'],
                ...porCategoria.map((c) => [c.categoria, `R$ ${c.receita.toFixed(2)}`, `R$ ${c.despesa.toFixed(2)}`]),
              ],
            },
          },
        ],
        styles: { titulo: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] }, secao: { fontSize: 13, bold: true, margin: [0, 14, 0, 6] } },
      })
      .download('relatorio-financeiro.pdf');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Input label="De" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <Input label="Até" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        <Button variant="secondary" icon={Download} onClick={exportarExcel}>
          Excel
        </Button>
        <Button variant="secondary" icon={FileDown} onClick={exportarPdf}>
          PDF
        </Button>
      </div>

      {carregando ? (
        <p className="text-sm text-text-secondary">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-text-secondary">Receita total</p>
              <p className="text-2xl font-extrabold text-accent">R$ {dre.receita.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-text-secondary">Despesa total</p>
              <p className="text-2xl font-extrabold text-danger">R$ {dre.despesa.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-text-secondary">Saldo</p>
              <p className={`text-2xl font-extrabold ${dre.saldo >= 0 ? 'text-accent' : 'text-danger'}`}>
                R$ {dre.saldo.toFixed(2)}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-text-primary">Por categoria</h3>
            {porCategoria.length === 0 ? (
              <p className="text-sm text-text-secondary">Nenhum lançamento no período.</p>
            ) : (
              <div className="space-y-2">
                {porCategoria.map((c) => (
                  <div key={c.categoria} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span className="capitalize text-text-primary">{c.categoria}</span>
                    <span className="font-semibold text-text-secondary">
                      {c.receita > 0 && <span className="text-accent">+R$ {c.receita.toFixed(2)} </span>}
                      {c.despesa > 0 && <span className="text-danger">-R$ {c.despesa.toFixed(2)}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
