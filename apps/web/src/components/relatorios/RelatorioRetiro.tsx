'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileDown } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { listarInscritos, listarRetiros } from '@/lib/retiros';
import type { InscricaoRetiro, Retiro } from '@/types/database';

export function RelatorioRetiro({ comunidadeId }: { comunidadeId: string }) {
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [retiroId, setRetiroId] = useState('');
  const [inscritos, setInscritos] = useState<InscricaoRetiro[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    listarRetiros(comunidadeId).then((lista) => {
      setRetiros(lista);
      if (lista.length > 0) setRetiroId(lista[0].id);
    });
  }, [comunidadeId]);

  useEffect(() => {
    if (!retiroId) return;
    setCarregando(true);
    listarInscritos(retiroId)
      .then(setInscritos)
      .finally(() => setCarregando(false));
  }, [retiroId]);

  const retiro = retiros.find((r) => r.id === retiroId);

  const resumo = useMemo(() => {
    const totalInscritos = inscritos.length;
    const totalPresentes = inscritos.filter((i) => i.presente).length;
    const arrecadado = inscritos.reduce((s, i) => s + (i.valor_pago ?? 0), 0);
    const esperado = (retiro?.valor ?? 0) * totalInscritos;
    return {
      totalInscritos,
      totalPresentes,
      taxaPresenca: totalInscritos > 0 ? Math.round((totalPresentes / totalInscritos) * 100) : 0,
      arrecadado,
      esperado,
    };
  }, [inscritos, retiro]);

  const porGrupo = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const i of inscritos) {
      const grupo = i.grupo ?? 'Sem grupo';
      mapa.set(grupo, (mapa.get(grupo) ?? 0) + 1);
    }
    return [...mapa.entries()].map(([grupo, total]) => ({ grupo, total })).sort((a, b) => b.total - a.total);
  }, [inscritos]);

  function exportarExcel() {
    const linhas = inscritos.map((i) => ({
      Nome: i.nome ?? '',
      Telefone: i.telefone ?? '',
      Grupo: i.grupo ?? '',
      Pagou: i.pagou ? 'Sim' : 'Não',
      'Valor pago': i.valor_pago ?? 0,
      Presente: i.presente ? 'Sim' : 'Não',
    }));
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, 'Inscritos');
    XLSX.writeFile(livro, `relatorio-retiro-${retiro?.nome ?? ''}.xlsx`);
  }

  async function exportarPdf() {
    const { default: pdfMake } = await import('pdfmake/build/pdfmake');
    const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
    (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts.default?.vfs;

    pdfMake
      .createPdf({
        content: [
          { text: `Relatório do Retiro — ${retiro?.nome ?? ''}`, style: 'titulo' },
          {
            table: {
              widths: ['*', 'auto'],
              body: [
                ['Inscritos', String(resumo.totalInscritos)],
                ['Presentes', `${resumo.totalPresentes} (${resumo.taxaPresenca}%)`],
                ['Arrecadado', `R$ ${resumo.arrecadado.toFixed(2)}`],
                ['Valor esperado', `R$ ${resumo.esperado.toFixed(2)}`],
              ],
            },
          },
          { text: 'Por grupo', style: 'secao' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto'],
              body: [['Grupo', 'Inscritos'], ...porGrupo.map((g) => [g.grupo, String(g.total)])],
            },
          },
        ],
        styles: { titulo: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] }, secao: { fontSize: 13, bold: true, margin: [0, 14, 0, 6] } },
      })
      .download(`relatorio-retiro-${retiro?.nome ?? ''}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Select
            label="Retiro"
            value={retiroId}
            onChange={(e) => setRetiroId(e.target.value)}
            options={retiros.map((r) => ({ value: r.id, label: r.nome }))}
          />
        </div>
        <Button variant="secondary" icon={Download} onClick={exportarExcel} disabled={!retiroId}>
          Excel
        </Button>
        <Button variant="secondary" icon={FileDown} onClick={exportarPdf} disabled={!retiroId}>
          PDF
        </Button>
      </div>

      {carregando ? (
        <p className="text-sm text-text-secondary">Carregando...</p>
      ) : !retiroId ? (
        <p className="text-sm text-text-secondary">Nenhum retiro cadastrado.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-text-secondary">Taxa de presença</p>
              <p className="text-2xl font-extrabold text-text-primary">
                {resumo.totalPresentes}/{resumo.totalInscritos} ({resumo.taxaPresenca}%)
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-text-secondary">Arrecadado</p>
              <p className="text-2xl font-extrabold text-accent">R$ {resumo.arrecadado.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-text-secondary">Valor esperado</p>
              <p className="text-2xl font-extrabold text-text-primary">R$ {resumo.esperado.toFixed(2)}</p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-text-primary">Distribuição por grupo</h3>
            {porGrupo.length === 0 ? (
              <p className="text-sm text-text-secondary">Nenhum inscrito.</p>
            ) : (
              <div className="space-y-2">
                {porGrupo.map((g) => (
                  <div key={g.grupo} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span className="text-text-primary">{g.grupo}</span>
                    <span className="font-semibold text-text-secondary">{g.total}</span>
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
