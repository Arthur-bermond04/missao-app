'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, KeyRound, LogOut, Settings } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import type { Perfil } from '@/types/database';

const PERFIL_LABEL: Record<Perfil, string> = {
  missionario: 'Missionário',
  lider: 'Líder',
  coordenador: 'Coordenador',
  padre: 'Padre',
  admin: 'Admin',
};

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '';
  const letras = partes.length > 1 ? [partes[0][0], partes[partes.length - 1][0]] : [partes[0][0]];
  return letras.join('').toUpperCase();
}

// Menu do usuário na barra superior: nome e perfil sempre à vista; ao clicar
// abre trocar senha, configurações e sair. Fecha ao clicar fora ou com Esc.
export function UserMenu() {
  const router = useRouter();
  const { usuario, sair } = usePainelSession();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false);
    }
    document.addEventListener('mousedown', onClickFora);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickFora);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [aberto]);

  async function handleSair() {
    setAberto(false);
    await sair();
    router.replace('/login');
  }

  if (!usuario) return null;

  const itemClasse =
    'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-text-primary transition-colors hover:bg-bg-page focus-visible:outline-none focus-visible:bg-bg-page';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-sidebar-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destaque text-[11px] font-semibold text-destaque-texto">
          {iniciais(usuario.nome)}
        </span>
        <span className="hidden min-w-0 text-left md:block">
          <span className="block max-w-[180px] truncate text-[13px] font-semibold leading-tight text-sidebar-text-active">
            {usuario.nome}
          </span>
          <span className="block text-[11px] leading-tight text-sidebar-text">{PERFIL_LABEL[usuario.perfil]}</span>
        </span>
        <ChevronDown size={14} className={`hidden text-sidebar-text transition-transform md:block ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-xl border border-border-soft bg-bg-card shadow-pop"
        >
          <div className="border-b border-border-soft px-3 py-3">
            <p className="truncate text-sm font-semibold text-text-primary">{usuario.nome}</p>
            <p className="text-xs text-text-secondary">{PERFIL_LABEL[usuario.perfil]}</p>
          </div>
          <Link href="/configuracoes#seguranca" role="menuitem" onClick={() => setAberto(false)} className={itemClasse}>
            <KeyRound size={16} className="shrink-0 text-text-secondary" />
            Trocar senha
          </Link>
          <Link href="/configuracoes" role="menuitem" onClick={() => setAberto(false)} className={itemClasse}>
            <Settings size={16} className="shrink-0 text-text-secondary" />
            Configurações
          </Link>
          <button type="button" role="menuitem" onClick={handleSair} className={`${itemClasse} border-t border-border-soft text-danger`}>
            <LogOut size={16} className="shrink-0" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
