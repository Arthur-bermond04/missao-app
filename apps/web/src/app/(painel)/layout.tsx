'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { PainelSessionProvider, usePainelSession } from '@/lib/PainelSessionContext';
import { SidebarLayoutProvider, useSidebarLayout } from '@/lib/SidebarLayoutContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';
import { Topbar } from '@/components/layout/Topbar';
import { SemAcesso } from '@/components/layout/SemAcesso';
import { moduloDaRota } from '@/lib/navegacao';
import { useTerminologia } from '@/lib/terminologia';

function PainelShell({ children }: { children: React.ReactNode }) {
  const { session, usuario, carregando, pode, permissoesCarregando } = usePainelSession();
  const pathname = usePathname();
  const terminologia = useTerminologia();
  const { colapsada } = useSidebarLayout();
  const router = useRouter();
  const [drawerAberto, setDrawerAberto] = useState(false);

  useEffect(() => {
    if (!carregando && !session) router.replace('/login');
  }, [carregando, session, router]);

  // Guarda de rota: o menu esconde o item, mas quem digita o endereço também
  // precisa ser barrado. Só decide depois que a matriz carregou, para não piscar.
  const modulo = moduloDaRota(pathname, terminologia);
  const bloqueado = !!modulo && !permissoesCarregando && !pode(modulo, 'ver');

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
          <span className="text-lg font-semibold text-sidebar-text-active">MissãoWeb</span>
        </div>
      )}

      <main
        className={`escala-compacta min-h-screen bg-content-bg p-4 md:ml-[72px] md:p-6 lg:p-8 ${colapsada ? '' : 'lg:ml-[264px]'}`}
      >
        {bloqueado ? <SemAcesso /> : children}
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
