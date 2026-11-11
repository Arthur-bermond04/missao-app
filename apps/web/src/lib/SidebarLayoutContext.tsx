'use client';

import { createContext, useContext } from 'react';
import { useArmazenamentoLocal } from '@/lib/hooksEstado';

const CHAVE_STORAGE = 'missaoapp:sidebar-colapsada';

interface SidebarLayoutValue {
  /** true = sidebar forçada em modo estreito (só ícone) mesmo em telas grandes. */
  colapsada: boolean;
  alternar: () => void;
}

const SidebarLayoutCtx = createContext<SidebarLayoutValue | null>(null);

// Compartilhado entre Sidebar (o botão que alterna), Topbar e o <main> do
// layout do painel (que precisam saber a largura atual pra ajustar sua
// própria margem lateral) — por isso é um Context, não um hook local: os
// três precisam ver exatamente o mesmo valor, não cópias independentes.
export function SidebarLayoutProvider({ children }: { children: React.ReactNode }) {
  // Começa sempre expandida (mesmo valor do SSR) e só lê a preferência salva
  // depois de montar, pra não divergir do HTML que o servidor mandou.
  const [salvo, gravar] = useArmazenamentoLocal(CHAVE_STORAGE);
  const colapsada = salvo === '1';

  function alternar() {
    gravar(colapsada ? '0' : '1');
  }

  return <SidebarLayoutCtx.Provider value={{ colapsada, alternar }}>{children}</SidebarLayoutCtx.Provider>;
}

export function useSidebarLayout(): SidebarLayoutValue {
  const ctx = useContext(SidebarLayoutCtx);
  if (!ctx) throw new Error('useSidebarLayout precisa estar dentro de <SidebarLayoutProvider>');
  return ctx;
}
