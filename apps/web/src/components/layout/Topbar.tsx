'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Calendar, ChevronRight, Menu } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { montarNavGrupos } from '@/lib/navegacao';
import { useTerminologia } from '@/lib/terminologia';
import { useSidebarLayout } from '@/lib/SidebarLayoutContext';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { NotificacoesBell } from './NotificacoesBell';
import { ParaFazerBell } from './ParaFazerBell';
import { UserMenu } from './UserMenu';

const PLANO_LABEL: Record<string, string> = { semente: 'Semente', missao: 'Missão', diocese: 'Diocese' };

function iniciaisComunidade(nome: string) {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  return (palavras.length > 1 ? palavras[0][0] + palavras[1][0] : (palavras[0] ?? '').slice(0, 2)).toUpperCase();
}

export function Topbar({ comunidadeId, onAbrirDrawer }: { comunidadeId: string; onAbrirDrawer: () => void }) {
  const pathname = usePathname();
  const terminologia = useTerminologia();
  const { colapsada, alternar } = useSidebarLayout();
  const { usuario } = usePainelSession();
  const [comunidade, setComunidade] = useState<{ nome: string; plano: string } | null>(null);
  const [hoje, setHoje] = useState('');

  useEffect(() => {
    supabase
      .from('comunidades')
      .select('nome, plano')
      .eq('id', comunidadeId)
      .single()
      .then(({ data }) => setComunidade((data as { nome: string; plano: string } | null) ?? null));
  }, [comunidadeId]);

  // Só depois de montar: a data do servidor e a do navegador podem divergir.
  useEffect(() => {
    setHoje(new Date().toLocaleDateString('pt-BR'));
  }, []);

  const nav = montarNavGrupos(terminologia).flatMap((g) => g.itens);
  const secaoAtual = nav.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  const botaoMenu =
    'rounded-md p-2 text-sidebar-text transition-colors hover:bg-sidebar-bg-hover hover:text-sidebar-text-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green';

  return (
    <div
      className={`sticky top-0 z-20 flex h-16 items-center gap-3 bg-topbar-bg px-3 md:ml-[72px] md:px-5 ${
        colapsada ? '' : 'lg:ml-[264px]'
      }`}
    >
      {/* Mobile: abre a gaveta. Desktop (lg+): recolhe/expande o menu lateral. */}
      <button type="button" onClick={onAbrirDrawer} aria-label="Abrir menu" className={`${botaoMenu} md:hidden`}>
        <Menu size={22} />
      </button>
      <button
        type="button"
        onClick={alternar}
        aria-label={colapsada ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        aria-pressed={colapsada}
        title={colapsada ? 'Expandir menu' : 'Recolher menu'}
        className={`${botaoMenu} hidden lg:block`}
      >
        <Menu size={22} />
      </button>

      {comunidade && (
        <div className="flex min-w-0 items-center gap-2.5 rounded-md border border-sidebar-border bg-white/5 py-1.5 pl-1.5 pr-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-green text-xs font-bold text-white">
            {iniciaisComunidade(comunidade.nome)}
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block max-w-[240px] truncate text-[13px] font-semibold leading-tight text-sidebar-text-active">
              {comunidade.nome}
            </span>
            <span className="block truncate text-[11px] leading-tight text-sidebar-text">
              Plano {PLANO_LABEL[comunidade.plano] ?? comunidade.plano}
              {usuario ? ` · ${usuario.nome.split(' ')[0]}` : ''}
            </span>
          </span>
        </div>
      )}

      <nav aria-label="Trilha de navegação" className="hidden items-center gap-1 pl-2 text-sm xl:flex">
        {!!secaoAtual && (
          <>
            <ChevronRight size={14} className="text-sidebar-text/60" />
            <span className="font-medium text-sidebar-text-active">{secaoAtual.label}</span>
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-1 md:gap-2">
        {!!hoje && (
          <span className="hidden items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium text-sidebar-text-active md:inline-flex">
            <Calendar size={16} className="text-sidebar-text" />
            {hoje}
          </span>
        )}
        <ParaFazerBell />
        <NotificacoesBell comunidadeId={comunidadeId} />
        <span className="mx-1 hidden h-8 w-px bg-sidebar-border md:block" aria-hidden />
        <UserMenu />
      </div>
    </div>
  );
}
