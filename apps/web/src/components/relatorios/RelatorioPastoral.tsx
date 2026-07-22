'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileDown, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { EstadoEspiritualBadge } from '@/components/pastoral/badges';
import { listarOvelhas } from '@/lib/pastoral';
import { supabase } from '@/lib/supabase';
import { useTerminologia } from '@/lib/terminologia';
import type { PastoralOvelha, Usuario } from '@/types/database';

export function RelatorioPastoral({ comunidadeId, isAdmin }: { comunidadeId: string; isAdmin: boolean }) {
  const terminologia = useTerminologia();
  const nomeOvelha = terminologia.nome_ovelha.toLowerCase();
  const [ovelhas, setOvelhas] = useState<PastoralOvelha[]>([]);
  const [pastores, setPastores] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      setCarregando(false);
      return;
    }
    Promise.all([
      listarOvelhas(comunidadeId),
      supabase.from('usuarios').select('*').eq('comunidade_id', comunidadeId),
    ])
      .then(([ovs, u]) => {
        setOvelhas(ovs);
        setPastores((u.data as Usuario[]) ?? []);
      })
      .finally(() => setCarregando(false));
  }, [comunidadeId, isAdmin]);

  const porPastor = useMemo(() => {
    const mapa = new Map<string, PastoralOvelha[]>();
    for (const o of ovelhas.filter((o) => o.ativo)) {
      const lista = mapa.get(o.pastor_id) ?? [];
      lista.push(o);
      mapa.set(o.pastor_id, lista);
    }
    return [...mapa.entries()]
      .map(([pastorId, lista]) => ({
        pastor: pastores.find((p) => p.id === pastorId)?.nome ?? 'Desconhecido',
        ovelhas: lista,
      }))
      .sort((a, b) => b.ovelhas.length - a.ovelhas.length);
  }, [ovelhas, pastores]);

  async function exportarPdf() {
    const { default: pdfMake } = await import('pdfmake/build/pdfmake');
    const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
    (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts.default?.vfs;

    pdfMake
      .createPdf({
        content: [
          { text: 'Relatório de Pastoral', style: 'titulo' },
          { text: `${ovelhas.filter((o) => o.ativo).length} ${nomeOvelha}(s) em acompanhamento ativo`, margin: [0, 0, 0, 10] },
          ...porPastor.flatMap((grupo) => [
            { text: `${grupo.pastor} (${grupo.ovelhas.length})`, style: 'secao' },
            {
              table: {
                headerRows: 1,
                widths: ['*', 'auto', 'auto'],
                body: [
                  ['Nome', 'Etapa', 'Estado'],
                  ...grupo.ovelhas.map((o) => [o.nome, o.etapa_formacao, o.estado_espiritual]),
                ],
              },
            },
          ]),
        ],
        styles: { titulo: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] }, secao: { fontSize: 13, bold: true, margin: [0, 14, 0, 6] } },
      })
      .download('relatorio-pastoral.pdf');
  }

  if (!isAdmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Acesso restrito"
        description={`Este relatório consolida dados de todos os ${terminologia.nome_pastor.toLowerCase()}s e está disponível apenas para o perfil Admin.`}
      />
    );
  }

  if (carregando) return <p className="text-sm text-text-secondary">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="secondary" icon={FileDown} onClick={exportarPdf}>
          PDF
        </Button>
      </div>

      {porPastor.length === 0 ? (
        <EmptyState icon={ShieldAlert} title={`Nenhum(a) ${nomeOvelha} em acompanhamento`} />
      ) : (
        <div className="space-y-6">
          {porPastor.map((grupo) => (
            <div key={grupo.pastor}>
              <h3 className="mb-2 text-sm font-bold text-text-primary">
                {grupo.pastor} <span className="font-normal text-text-secondary">({grupo.ovelhas.length})</span>
              </h3>
              <div className="space-y-2">
                {grupo.ovelhas.map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span className="text-text-primary">{o.nome}</span>
                    <EstadoEspiritualBadge estado={o.estado_espiritual} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
