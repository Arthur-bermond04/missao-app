'use client';

import { LayoutDashboard } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { DashboardCampo } from '@/components/dashboard/DashboardCampo';
import { DashboardGestao } from '@/components/dashboard/DashboardGestao';

// Dois modos de uso, decididos pelo perfil: campo (missionário/líder/padre —
// "o que fazer hoje") e gestão (coordenador/admin — "como está a missão").
const PERFIS_GESTAO = ['coordenador', 'admin'];

export default function DashboardPage() {
  const { usuario } = usePainelSession();

  if (!usuario) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader icon={LayoutDashboard} title="Dashboard" subtitle="Carregando..." />
      </div>
    );
  }

  const modoGestao = PERFIS_GESTAO.includes(usuario.perfil);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle={modoGestao ? 'Visão geral da missão' : 'Seu dia na missão'}
      />
      {modoGestao ? <DashboardGestao usuario={usuario} /> : <DashboardCampo usuario={usuario} />}
    </div>
  );
}
