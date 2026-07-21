'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { PainelSessionProvider, usePainelSession } from '@/lib/PainelSessionContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';
import { Topbar } from '@/components/layout/Topbar';

function PainelShell({ children }: { children: React.ReactNode }) {
  const { session, usuario, carregando } = usePainelSession();
  const router = useRouter();
  const [drawerAberto, setDrawerAberto] = useState(false);

  useEffect(() => {
    if (!carregando && !session) router.replace('/login');
  }, [carregando, session, router]);

  if (carregando || !session) {
    return <div className="flex min-h-screen items-center justify-center text-text-secondary">Carregando...</div>;
  }

  return (
    <>
      <Sidebar />
      <MobileNavDrawer open={drawerAberto} onClose={() => setDrawerAberto(false)} />

      {usuario?.comunidade_id ? (
        <Topbar comunidadeId={usuario.comunidade_id} onAbrirDrawer={() => setDrawerAberto(true)} />
      ) : (
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-bg-card px-4 py-3 md:hidden">
          <button onClick={() => setDrawerAberto(true)} className="rounded-md p-1.5 text-text-primary hover:bg-bg-page">
            <Menu size={22} />
          </button>
          <span className="text-lg font-bold text-primary">✝ MissãoApp</span>
        </div>
      )}

      <main className="min-h-screen bg-bg-page p-4 md:ml-[72px] md:p-6 lg:ml-[240px] lg:p-8">{children}</main>
    </>
  );
}

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <PainelSessionProvider>
      <PainelShell>{children}</PainelShell>
    </PainelSessionProvider>
  );
}
