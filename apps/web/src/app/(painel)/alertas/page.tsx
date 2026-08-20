'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Bell, Check, ChevronRight, FileDown, Info, ShieldAlert } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { CORES } from '@/lib/cores';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  gerarAlertasCentral,
  listarAlertasVistos,
  marcarAlertaVisto,
  type AlertaCentral,
  type ModuloAlerta,
  type NivelAlertaCentral,
} from '@/lib/alertas';

const NIVEL_CONFIG: Record<NivelAlertaCentral, { label: string; icone: typeof ShieldAlert; cor: string; borda: string }> = {
  urgente: { label: 'URGENTE', icone: ShieldAlert, cor: 'text-danger', borda: 'border-l-danger' },
  atencao: { label: 'ATENÇÃO', icone: AlertTriangle, cor: 'text-warning', borda: 'border-l-warning' },
  informativo: { label: 'INFORMATIVO', icone: Info, cor: 'text-accent', borda: 'border-l-accent' },
};

type Filtro = 'todos' | 'urgentes' | ModuloAlerta;

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'urgentes', label: 'Urgentes' },
  { valor: 'Pastoral', label: 'Pastoral' },
  { valor: 'Pessoas', label: 'Pessoas' },
  { valor: 'Ministérios', label: 'Ministérios' },
  { valor: 'Financeiro', label: 'Financeiro' },
];

export default function AlertasPage() {
  const { usuario } = usePainelSession();
  const [alertas, setAlertas] = useState<AlertaCentral[]>([]);
  const [vistos, setVistos] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const carregar = useCallback(async () => {
    if (!usuario?.comunidade_id) return;
    setCarregando(true);
    try {
      const [lista, vistosSet] = await Promise.all([
        gerarAlertasCentral(usuario.comunidade_id, usuario),
        listarAlertasVistos(usuario.id),
      ]);
      setAlertas(lista);
      setVistos(vistosSet);
    } finally {
      setCarregando(false);
    }
  }, [usuario]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleMarcarVisto(alertaId: string) {
    if (!usuario) return;
    setVistos((atual) => new Set(atual).add(alertaId));
    try {
      await marcarAlertaVisto(usuario.id, alertaId);
    } catch {
      // otimista — se falhar, recarrega no próximo load
    }
  }

  const filtrados = useMemo(() => {
    return alertas.filter((a) => {
      if (vistos.has(a.id)) return false;
      if (filtro === 'todos') return true;
      if (filtro === 'urgentes') return a.nivel === 'urgente';
      return a.modulo === filtro;
    });
  }, [alertas, vistos, filtro]);

  const porNivel = useMemo(() => {
    const grupos: Record<NivelAlertaCentral, AlertaCentral[]> = { urgente: [], atencao: [], informativo: [] };
    for (const a of filtrados) grupos[a.nivel].push(a);
    return grupos;
  }, [filtrados]);

  async function exportarPdf() {
    const { default: pdfMake } = await import('pdfmake/build/pdfmake');
    const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
    (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts.default?.vfs;

    const content: any[] = [
      { text: 'Relatório de alertas', style: 'titulo' },
      { text: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), style: 'sub' },
    ];
    for (const nivel of ['urgente', 'atencao', 'informativo'] as NivelAlertaCentral[]) {
      const grupo = porNivel[nivel];
      if (grupo.length === 0) continue;
      content.push({ text: `${NIVEL_CONFIG[nivel].label} (${grupo.length})`, style: 'secao' });
      content.push({
        ul: grupo.map((a) => `[${a.modulo}] ${a.mensagem}${a.detalhe ? ` — ${a.detalhe}` : ''}`),
      });
    }
    pdfMake
      .createPdf({
        content,
        styles: {
          titulo: { fontSize: 16, bold: true, margin: [0, 0, 0, 4] },
          sub: { fontSize: 10, color: CORES.textSecondary, margin: [0, 0, 0, 12] },
          secao: { fontSize: 13, bold: true, margin: [0, 12, 0, 6] },
        },
      })
      .download('alertas.pdf');
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        icon={Bell}
        title="Central de alertas"
        subtitle="Tudo que precisa de atenção, em ordem de urgência"
        actions={
          <Button variant="secondary" icon={FileDown} onClick={exportarPdf}>
            Exportar relatório
          </Button>
        }
      />

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filtro === f.valor
                ? 'border-primary bg-primary-xlight text-primary'
                : 'border-border text-text-secondary hover:bg-bg-page'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="mt-6 text-sm text-text-secondary">Carregando alertas...</p>
      ) : filtrados.length === 0 ? (
        <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
          <EmptyState icon={Check} title="Nenhum alerta" description="Tudo em dia — nada precisa de atenção agora. 🎉" />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {(['urgente', 'atencao', 'informativo'] as NivelAlertaCentral[]).map((nivel) => {
            const grupo = porNivel[nivel];
            if (grupo.length === 0) return null;
            const cfg = NIVEL_CONFIG[nivel];
            const Icone = cfg.icone;
            return (
              <div key={nivel}>
                <p className={`flex items-center gap-1.5 text-xs font-bold tracking-wide ${cfg.cor}`}>
                  <Icone size={14} /> {cfg.label} ({grupo.length})
                </p>
                <div className="mt-2 space-y-2">
                  {grupo.map((a) => (
                    <div
                      key={a.id}
                      className={`flex items-center justify-between gap-3 rounded-md border border-l-4 border-border bg-bg-card px-4 py-3 shadow-card ${cfg.borda}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-text-primary">{a.mensagem}</p>
                          <span className="shrink-0 rounded-full bg-bg-page px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                            {a.modulo}
                          </span>
                        </div>
                        {!!a.detalhe && <p className="mt-0.5 truncate text-xs text-text-secondary">{a.detalhe}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => handleMarcarVisto(a.id)}
                          title="Marcar como visto"
                          className="rounded-md p-1.5 text-text-secondary hover:bg-bg-page hover:text-accent"
                        >
                          <Check size={16} />
                        </button>
                        <Link
                          href={a.href}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-xlight"
                        >
                          Ver <ChevronRight size={13} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
