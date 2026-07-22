'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileDown } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { labelEtapaJornada, useTerminologia } from '@/lib/terminologia';
import { ETAPAS_FUNIL, type Contato, type Usuario } from '@/types/database';

export function RelatorioEvangelizacao({ comunidadeId }: { comunidadeId: string }) {
  const terminologia = useTerminologia();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [missionarios, setMissionarios] = useState<Usuario[]>([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [missionarioId, setMissionarioId] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('contatos').select('*').eq('comunidade_id', comunidadeId),
      supabase.from('usuarios').select('*').eq('comunidade_id', comunidadeId).eq('perfil', 'missionario'),
    ]).then(([c, m]) => {
      setContatos((c.data as Contato[]) ?? []);
      setMissionarios((m.data as Usuario[]) ?? []);
    });
  }, [comunidadeId]);

  const filtrados = useMemo(() => {
    return contatos.filter((c) => {
      const data = c.data_abordagem.slice(0, 10);
      if (dataInicio && data < dataInicio) return false;
      if (dataFim && data > dataFim) return false;
      if (missionarioId && c.missionario_id !== missionarioId) return false;
      return true;
    });
  }, [contatos, dataInicio, dataFim, missionarioId]);

  const funil = useMemo(
    () =>
      ETAPAS_FUNIL.map((etapa, index) => ({
        ...etapa,
        label: labelEtapaJornada(etapa.valor, terminologia),
        total: filtrados.filter((c) => ETAPAS_FUNIL.findIndex((e) => e.valor === c.etapa_jornada) >= index).length,
      })),
    [filtrados, terminologia]
  );

  const porMissionario = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const c of filtrados) {
      if (!c.missionario_id) continue;
      mapa.set(c.missionario_id, (mapa.get(c.missionario_id) ?? 0) + 1);
    }
    return missionarios
      .map((m) => ({ nome: m.nome, total: mapa.get(m.id) ?? 0 }))
      .filter((m) => m.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [filtrados, missionarios]);

  function exportarExcel() {
    const linhas = filtrados.map((c) => ({
      Nome: c.nome,
      Telefone: c.telefone ?? '',
      'Nível de interesse': c.nivel_interesse,
      'Local da abordagem': c.local_abordagem ?? '',
      'Data da abordagem': new Date(c.data_abordagem).toLocaleDateString('pt-BR'),
      'Etapa da jornada': c.etapa_jornada,
    }));
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, 'Evangelização');
    XLSX.writeFile(livro, 'relatorio-evangelizacao.xlsx');
  }

  async function exportarPdf() {
    const { default: pdfMake } = await import('pdfmake/build/pdfmake');
    const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
    (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts.default?.vfs;

    pdfMake
      .createPdf({
        content: [
          { text: 'Relatório de Evangelização', style: 'titulo' },
          { text: `${filtrados.length} abordagem(ns) no período`, margin: [0, 0, 0, 10] },
          { text: 'Funil', style: 'secao' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto'],
              body: [['Etapa', 'Total'], ...funil.map((e) => [e.label, String(e.total)])],
            },
          },
          { text: 'Por missionário', style: 'secao' },
          porMissionario.length === 0
            ? { text: 'Nenhum dado no período.' }
            : {
                table: {
                  headerRows: 1,
                  widths: ['*', 'auto'],
                  body: [['Missionário', 'Abordagens'], ...porMissionario.map((m) => [m.nome, String(m.total)])],
                },
              },
        ],
        styles: { titulo: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] }, secao: { fontSize: 13, bold: true, margin: [0, 14, 0, 6] } },
      })
      .download('relatorio-evangelizacao.pdf');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Input label="De" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <Input label="Até" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        <div className="w-56">
          <Select
            label="Missionário"
            value={missionarioId}
            onChange={(e) => setMissionarioId(e.target.value)}
            options={[{ value: '', label: 'Todos' }, ...missionarios.map((m) => ({ value: m.id, label: m.nome }))]}
          />
        </div>
        <Button variant="secondary" icon={Download} onClick={exportarExcel}>
          Excel
        </Button>
        <Button variant="secondary" icon={FileDown} onClick={exportarPdf}>
          PDF
        </Button>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="text-sm text-text-secondary">Abordagens no período</p>
        <p className="text-2xl font-extrabold text-text-primary">{filtrados.length}</p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold text-text-primary">Funil</h3>
        <div className="space-y-2">
          {funil.map((e) => (
            <div key={e.valor} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span className="text-text-primary">{e.label}</span>
              <span className="font-semibold text-text-secondary">{e.total}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold text-text-primary">Por missionário</h3>
        {porMissionario.length === 0 ? (
          <p className="text-sm text-text-secondary">Nenhum dado no período selecionado.</p>
        ) : (
          <div className="space-y-2">
            {porMissionario.map((m) => (
              <div key={m.nome} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="text-text-primary">{m.nome}</span>
                <span className="font-semibold text-text-secondary">{m.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
