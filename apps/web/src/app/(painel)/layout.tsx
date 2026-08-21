'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { PainelSessionProvider, usePainelSession } from '@/lib/PainelSessionContext';
import { SidebarLayoutProvider, useSidebarLayout } from '@/lib/SidebarLayoutContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';
import { Topbar } from '@/components/layout/Topbar';

function PainelShell({ children }: { children: React.ReactNode }) {
  const { session, usuario, carregando } = usePainelSession();
  const { colapsada } = useSidebarLayout();
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
        <div className="sticky top-0 z-20 flex items-center gap-3 bg-topbar-bg px-4 py-3 md:hidden">
          <button
            onClick={() => setDrawerAberto(true)}
            aria-label="Abrir menu"
            className="rounded-md p-1.5 text-sidebar-text transition-colors hover:bg-sidebar-bg-hover hover:text-sidebar-text-active"
          >
            <Menu size={22} />
          </button>
          <span className="text-lg font-semibold text-sidebar-text-active">MissãoApp</span>
        </div>
      )}

      <main
        className={`min-h-screen bg-content-bg p-4 md:ml-[72px] md:p-6 lg:p-8 ${colapsada ? '' : 'lg:ml-[240px]'}`}
      >
        {children}
      </main>
    </>
  );
}

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <PainelSessionProvider>
      <SidebarLayoutProvider>
        <PainelShell>{children}</PainelShell>
      </SidebarLayoutProvider>
    </PainelSessionProvider>
  );
}
