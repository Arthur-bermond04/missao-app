'use client';

import { createContext, useContext } from 'react';
import { useSession } from '@/lib/useSession';

type PainelSession = ReturnType<typeof useSession>;

const PainelSessionCtx = createContext<PainelSession | null>(null);

export function PainelSessionProvider({ children }: { children: React.ReactNode }) {
  const sessionData = useSession();
  return <PainelSessionCtx.Provider value={sessionData}>{children}</PainelSessionCtx.Provider>;
}

export function usePainelSession() {
  const ctx = useContext(PainelSessionCtx);
  if (!ctx) throw new Error('usePainelSession precisa estar dentro de <PainelSessionProvider>');
  return ctx;
}
