'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileDown } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import {
  calcularFrequencia,
  chaveMembroMinisterio,
  listarEncontros,
  listarFinanceiroMinisterio,
  listarMembrosMinisterio,
  listarMembrosPessoaMinisterio,
  listarMinisterios,
  listarPresencasDoMinisterio,
  type LancamentoDetalhe,
} from '@/lib/ministerios';
import type { Ministerio, MinisterioEncontro } from '@/types/database';

export function RelatorioMinisterio({ comunidadeId }: { comunidadeId: string }) {
  const [ministerios, setMinisterios] = useState<Ministerio[]>([]);
  const [ministerioId, setMinisterioId] = useState('');
  const [encontros, setEncontros] = useState<MinisterioEncontro[]>([]);
  const [frequencias, setFrequencias] = useState<{ nome: string; freq: number }[]>([]);
  const [lancamentos, setLancamentos] = useState<LancamentoDetalhe[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    listarMinisterios(comunidadeId).then((lista) => {
      setMinisterios(lista);
      if (lista.length > 0) setMinisterioId(lista[0].id);
    });
  }, [comunidadeId]);

  useEffect(() => {
    if (!ministerioId) return;
    setCarregando(true);
    Promise.all([
      listarEncontros(ministerioId),
      listarPresencasDoMinisterio(ministerioId),
      listarMembrosMinisterio(ministerioId),
      listarMembrosPessoaMinisterio(ministerioId),
      listarFinanceiroMinisterio(ministerioId),
    ])
      .then(([enc, pres, membros, membrosPessoa, fin]) => {
        setEncontros(enc);
        const freq = calcularFrequencia(enc, pres);
        const todosMembros = [...membros, ...membrosPessoa].filter((m) => m.ativo);
        setFrequencias(
          todosMembros
            .map((m) => ({ nome: m.nome, freq: freq.get(chaveMembroMinisterio(m)) ?? 0 }))
            .sort((a, b) => b.freq - a.freq)
        );
        setLancamentos(fin);
      })
      .finally(() => setCarregando(false));
  }, [ministerioId]);

  const ministerio = ministerios.find((m) => m.id === ministerioId);

  const caixa = useMemo(() => {
    const receitas = lancamentos.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
    const despesas = lancamentos.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [lancamentos]);

  const doadores = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const l of lancamentos) {
      if (l.tipo !== 'receita' || !l.doador_display) continue;
      mapa.set(l.doador_display, (mapa.get(l.doador_display) ?? 0) + Number(l.valor));
    }
    return [...mapa.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
  }, [lancamentos]);

  const freqMedia = frequencias.length > 0 ? Math.round(frequencias.reduce((s, f) => s + f.freq, 0) / frequencias.length) : 0;

  function exportarExcel() {
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      livro,
      XLSX.utils.json_to_sheet(frequencias.map((f) => ({ Membro: f.nome, 'Frequência (%)': f.freq }))),
      'Frequência'
    );
    XLSX.utils.book_append_sheet(
      livro,
      XLSX.utils.json_to_sheet(
        lancamentos.map((l) => ({
          Data: new Date(l.data).toLocaleDateString('pt-BR'),
          Tipo: l.tipo,
          Categoria: l.categoria,
          Doador: l.doador_display ?? '',
          Valor: Number(l.valor),
        }))
      ),
      'Caixa'
    );
    XLSX.writeFile(livro, `relatorio-ministerio-${ministerio?.nome ?? ''}.xlsx`);
  }

  async function exportarPdf() {
    const { default: pdfMake } = await import('pdfmake/build/pdfmake');
    const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
    (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts.default?.vfs;

    pdfMake
      .createPdf({
        content: [
          { text: `Relatório do Ministério — ${ministerio?.nome ?? ''}`, style: 'titulo' },
          { text: `Frequência média: ${freqMedia}% · Encontros: ${encontros.length}`, margin: [0, 0, 0, 10] },
          { text: 'Caixa', style: 'secao' },
          {
            table: {
              widths: ['*', 'auto'],
              body: [
                ['Receitas', `R$ ${caixa.receitas.toFixed(2)}`],
                ['Despesas', `R$ ${caixa.despesas.toFixed(2)}`],
                ['Saldo', `R$ ${caixa.saldo.toFixed(2)}`],
              ],
            },
          },
          { text: 'Doadores', style: 'secao' },
          doadores.length === 0
            ? { text: 'Nenhum doador registrado.' }
            : {
                table: {
                  headerRows: 1,
                  widths: ['*', 'auto'],
                  body: [['Doador', 'Total'], ...doadores.map((d) => [d.nome, `R$ ${d.total.toFixed(2)}`])],
                },
              },
        ],
        styles: { titulo: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] }, secao: { fontSize: 13, bold: true, margin: [0, 14, 0, 6] } },
      })
      .download(`relatorio-ministerio-${ministerio?.nome ?? ''}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Select
            label="Ministério"
            value={ministerioId}
            onChange={(e) => setMinisterioId(e.target.value)}
            options={ministerios.map((m) => ({ value: m.id, label: m.nome }))}
          />
        </div>
        <Button variant="secondary" icon={Download} onClick={exportarExcel} disabled={!ministerioId}>
          Excel
        </Button>
        <Button variant="secondary" icon={FileDown} onClick={exportarPdf} disabled={!ministerioId}>
          PDF
        </Button>
      </div>

      {carregando ? (
        <p className="text-sm text-text-secondary">Carregando...</p>
      ) : !ministerioId ? (
        <p className="text-sm text-text-secondary">Nenhum ministério cadastrado.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-text-secondary">Frequência média (90 dias)</p>
              <p className="text-2xl font-extrabold text-text-primary">{freqMedia}%</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-text-secondary">Receitas do caixa</p>
              <p className="text-2xl font-extrabold text-accent">R$ {caixa.receitas.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-text-secondary">Saldo do caixa</p>
              <p className={`text-2xl font-extrabold ${caixa.saldo >= 0 ? 'text-accent' : 'text-danger'}`}>
                R$ {caixa.saldo.toFixed(2)}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-text-primary">Frequência por membro</h3>
            {frequencias.length === 0 ? (
              <p className="text-sm text-text-secondary">Sem membros ativos.</p>
            ) : (
              <div className="space-y-2">
                {frequencias.map((f) => (
                  <div key={f.nome} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span className="text-text-primary">{f.nome}</span>
                    <span className="font-semibold text-text-secondary">{f.freq}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-text-primary">Doadores</h3>
            {doadores.length === 0 ? (
              <p className="text-sm text-text-secondary">Nenhum doador registrado.</p>
            ) : (
              <div className="space-y-2">
                {doadores.map((d) => (
                  <div key={d.nome} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span className="text-text-primary">{d.nome}</span>
                    <span className="font-semibold text-text-secondary">R$ {d.total.toFixed(2)}</span>
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
