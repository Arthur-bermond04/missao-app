'use client';

import { useMemo, useState } from 'react';
import { HandHeart } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type { LancamentoDetalhe } from '@/lib/ministerios';
import type { Ministerio } from '@/types/database';

interface AbaDoacoesProps {
  ministerio: Ministerio;
  lancamentos: LancamentoDetalhe[];
}

export function AbaDoacoes({ ministerio, lancamentos }: AbaDoacoesProps) {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  const doacoes = useMemo(
    () =>
      lancamentos.filter(
        (l) =>
          l.tipo === 'receita' &&
          !!l.doador_display &&
          (!inicio || l.data >= inicio) &&
          (!fim || l.data <= fim)
      ),
    [lancamentos, inicio, fim]
  );

  const porDoador = useMemo(() => {
    const mapa = new Map<string, { total: number; qtd: number; ultima: string }>();
    for (const d of doacoes) {
      const nome = d.doador_display as string;
      const atual = mapa.get(nome) ?? { total: 0, qtd: 0, ultima: d.data };
      atual.total += d.valor;
      atual.qtd += 1;
      if (d.data > atual.ultima) atual.ultima = d.data;
      mapa.set(nome, atual);
    }
    return Array.from(mapa.entries())
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [doacoes]);

  async function exportarPdf() {
    const { default: pdfMake } = await import('pdfmake/build/pdfmake');
    const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
    (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts.default?.vfs;

    pdfMake
      .createPdf({
        content: [
          { text: `Relatório de doadores — ${ministerio.nome}`, style: 'titulo' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto'],
              body: [
                ['Doador', 'Doações', 'Total', 'Última'],
                ...porDoador.map((d) => [
                  d.nome,
                  String(d.qtd),
                  `R$ ${d.total.toFixed(2)}`,
                  new Date(d.ultima).toLocaleDateString('pt-BR'),
                ]),
              ],
            },
          },
        ],
        styles: { titulo: { fontSize: 16, bold: true, margin: [0, 0, 0, 12] } },
      })
      .download(`${ministerio.nome}-doadores.pdf`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input label="De" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        <Input label="Até" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        <Button variant="secondary" onClick={exportarPdf} disabled={porDoador.length === 0}>
          Exportar PDF
        </Button>
      </div>

      {porDoador.length === 0 ? (
        <EmptyState
          icon={HandHeart}
          title="Nenhuma doação registrada"
          description="As doações aparecem aqui quando você registra uma receita com doador no caixa."
        />
      ) : (
        <div className="space-y-2">
          {porDoador.map((d) => (
            <div key={d.nome} className="flex items-center justify-between rounded-md border border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{d.nome}</p>
                <p className="text-xs text-text-secondary">
                  {d.qtd} {d.qtd === 1 ? 'doação' : 'doações'} · última em{' '}
                  {new Date(d.ultima).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span className="text-sm font-bold text-accent">R$ {d.total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
