'use client';

import { useState } from 'react';
import { BarChart3, Compass, Tent, HandHeart, HeartHandshake, Wallet } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { RelatorioEvangelizacao } from '@/components/relatorios/RelatorioEvangelizacao';
import { RelatorioRetiro } from '@/components/relatorios/RelatorioRetiro';
import { RelatorioMinisterio } from '@/components/relatorios/RelatorioMinisterio';
import { RelatorioPastoral } from '@/components/relatorios/RelatorioPastoral';
import { RelatorioFinanceiro } from '@/components/relatorios/RelatorioFinanceiro';

type TipoRelatorio = 'evangelizacao' | 'retiro' | 'ministerio' | 'pastoral' | 'financeiro';

const RELATORIOS: { valor: TipoRelatorio; label: string; icon: typeof Compass }[] = [
  { valor: 'evangelizacao', label: 'Evangelização', icon: Compass },
  { valor: 'retiro', label: 'Retiros', icon: Tent },
  { valor: 'ministerio', label: 'Ministérios', icon: HandHeart },
  { valor: 'pastoral', label: 'Pastoral', icon: HeartHandshake },
  { valor: 'financeiro', label: 'Financeiro', icon: Wallet },
];

export default function RelatoriosPage() {
  const { usuario } = usePainelSession();
  const comunidadeId = usuario?.comunidade_id ?? null;
  const [tipo, setTipo] = useState<TipoRelatorio>('evangelizacao');

  if (!comunidadeId) return null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={BarChart3} title="Relatórios" subtitle="Análises e exportações da comunidade" />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <div className="rounded-lg bg-bg-card p-3 shadow-card lg:h-fit">
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {RELATORIOS.map((r) => {
              const Icon = r.icon;
              const ativo = tipo === r.valor;
              return (
                <button
                  key={r.valor}
                  onClick={() => setTipo(r.valor)}
                  className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors lg:w-full ${
                    ativo ? 'bg-primary-xlight text-primary' : 'text-text-secondary hover:bg-bg-page'
                  }`}
                >
                  <Icon size={16} />
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg bg-bg-card p-6 shadow-card">
          {tipo === 'evangelizacao' && <RelatorioEvangelizacao comunidadeId={comunidadeId} />}
          {tipo === 'retiro' && <RelatorioRetiro comunidadeId={comunidadeId} />}
          {tipo === 'ministerio' && <RelatorioMinisterio comunidadeId={comunidadeId} />}
          {tipo === 'pastoral' && (
            <RelatorioPastoral comunidadeId={comunidadeId} isAdmin={usuario?.perfil === 'admin'} />
          )}
          {tipo === 'financeiro' && <RelatorioFinanceiro comunidadeId={comunidadeId} />}
        </div>
      </div>
    </div>
  );
}
