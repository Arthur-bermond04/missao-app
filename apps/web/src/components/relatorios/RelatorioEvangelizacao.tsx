'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileDown } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { labelEtapaJornadaPessoa, useTerminologia } from '@/lib/terminologia';
import { ETAPAS_FUNIL_EVANGELIZACAO, type Pessoa, type Usuario } from '@/types/database';

// Desde a migration 20260822030000, o web não cria mais em `contatos` — o
// relatório passa a ler `pessoas` (origem evangelização), a mesma fonte que
// o Funil e o Dashboard já usam, para os três nunca mais divergirem.
export function RelatorioEvangelizacao({ comunidadeId }: { comunidadeId: string }) {
  const terminologia = useTerminologia();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [missionarios, setMissionarios] = useState<Usuario[]>([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [missionarioId, setMissionarioId] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('pessoas').select('*').eq('comunidade_id', comunidadeId).eq('origem', 'evangelizacao'),
      supabase.from('usuarios').select('*').eq('comunidade_id', comunidadeId).eq('perfil', 'missionario'),
    ]).then(([p, m]) => {
      setPessoas((p.data as Pessoa[]) ?? []);
      setMissionarios((m.data as Usuario[]) ?? []);
    });
  }, [comunidadeId]);

  const filtrados = useMemo(() => {
    return pessoas.filter((p) => {
      const data = p.data_primeiro_contato.slice(0, 10);
      if (dataInicio && data < dataInicio) return false;
      if (dataFim && data > dataFim) return false;
      if (missionarioId && p.responsavel_id !== missionarioId) return false;
      return true;
    });
  }, [pessoas, dataInicio, dataFim, missionarioId]);

  const funil = useMemo(
    () =>
      ETAPAS_FUNIL_EVANGELIZACAO.map((valor, index) => ({
        valor,
        label: labelEtapaJornadaPessoa(valor, terminologia),
        total: filtrados.filter((p) => ETAPAS_FUNIL_EVANGELIZACAO.indexOf(p.etapa_jornada) >= index).length,
      })),
    [filtrados, terminologia]
  );

  const porMissionario = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const p of filtrados) {
      if (!p.responsavel_id) continue;
      mapa.set(p.responsavel_id, (mapa.get(p.responsavel_id) ?? 0) + 1);
    }
    return missionarios
      .map((m) => ({ nome: m.nome, total: mapa.get(m.id) ?? 0 }))
      .filter((m) => m.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [filtrados, missionarios]);

  function exportarExcel() {
    const linhas = filtrados.map((p) => ({
      Nome: p.nome,
      Telefone: p.telefone ?? '',
      'Nível de interesse': p.nivel_interesse,
      'Local da abordagem': p.local_primeiro_contato ?? '',
      'Data da abordagem': new Date(p.data_primeiro_contato).toLocaleDateString('pt-BR'),
      'Etapa da jornada': p.etapa_jornada,
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
