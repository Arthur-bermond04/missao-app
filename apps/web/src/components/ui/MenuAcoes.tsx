'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';

export interface ItemMenu {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  /** Se informado, o item vira link de navegação. */
  href?: string;
  /** Ação destrutiva ou que tira acesso: texto vermelho. */
  perigo?: boolean;
  /** Linha divisória acima do item. */
  separadorAntes?: boolean;
}

const LARGURA = 256;

/**
 * Menu de ações da linha (os "três pontos"). Troca uma fileira de botões com
 * borda por um único gatilho discreto. O painel é desenhado num portal com
 * posição fixa: a tabela tem overflow-x e cortaria um menu absoluto.
 */
export function MenuAcoes({ itens, rotulo = 'Mais ações' }: { itens: ItemMenu[]; rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  const fechar = useCallback(() => {
    setAberto(false);
    gatilho.current?.focus();
  }, []);

  // Posiciona abaixo do gatilho, alinhado à direita; vira para cima se faltar espaço.
  useLayoutEffect(() => {
    if (!aberto || !gatilho.current) return;
    const r = gatilho.current.getBoundingClientRect();
    const altura = painel.current?.offsetHeight ?? itens.length * 40 + 12;
    const cabeAbaixo = r.bottom + 6 + altura < window.innerHeight;
    setPos({
      top: cabeAbaixo ? r.bottom + 6 : Math.max(8, r.top - 6 - altura),
      left: Math.min(Math.max(8, r.right - LARGURA), window.innerWidth - LARGURA - 8),
    });
  }, [aberto, itens.length]);

  useEffect(() => {
    if (!aberto) return;
    function foraDoMenu(e: MouseEvent) {
      const alvo = e.target as Node;
      if (painel.current?.contains(alvo) || gatilho.current?.contains(alvo)) return;
      setAberto(false);
    }
    function teclas(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        fechar();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const lista = Array.from(painel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
      if (lista.length === 0) return;
      const atual = lista.indexOf(document.activeElement as HTMLElement);
      const prox = e.key === 'ArrowDown' ? (atual + 1) % lista.length : (atual - 1 + lista.length) % lista.length;
      lista[prox].focus();
    }
    const fecharSimples = () => setAberto(false);
    document.addEventListener('mousedown', foraDoMenu);
    document.addEventListener('keydown', teclas);
    window.addEventListener('resize', fecharSimples);
    window.addEventListener('scroll', fecharSimples, true);
    return () => {
      document.removeEventListener('mousedown', foraDoMenu);
      document.removeEventListener('keydown', teclas);
      window.removeEventListener('resize', fecharSimples);
      window.removeEventListener('scroll', fecharSimples, true);
    };
  }, [aberto, fechar]);

  // Ao abrir, leva o foco ao primeiro item (navegação por teclado).
  useEffect(() => {
    if (aberto && pos) painel.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [aberto, pos]);

  const classeItem = (perigo?: boolean) =>
    `flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none ${
      perigo
        ? 'text-danger hover:bg-danger-light focus-visible:bg-danger-light'
        : 'text-text-primary hover:bg-bg-page focus-visible:bg-bg-page'
    }`;

  return (
    <>
      <button
        ref={gatilho}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={rotulo}
        title={rotulo}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-page hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
          aberto ? 'bg-bg-page text-text-primary' : ''
        }`}
      >
        <MoreHorizontal size={18} />
      </button>

      {aberto &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={painel}
            role="menu"
            aria-label={rotulo}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: LARGURA }}
            className="escala-compacta fixed z-50 overflow-hidden rounded-xl border border-border-soft bg-bg-card py-1 shadow-pop"
          >
            {itens.map((item) => {
              const Icon = item.icon;
              const conteudo = (
                <>
                  {Icon && <Icon size={16} className={`shrink-0 ${item.perigo ? '' : 'text-text-secondary'}`} />}
                  {item.label}
                </>
              );
              return (
                <div key={item.label}>
                  {item.separadorAntes && <div className="my-1 h-px bg-border" role="separator" />}
                  {item.href ? (
                    <Link href={item.href} role="menuitem" onClick={() => setAberto(false)} className={classeItem(item.perigo)}>
                      {conteudo}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAberto(false);
                        item.onClick?.();
                      }}
                      className={classeItem(item.perigo)}
                    >
                      {conteudo}
                    </button>
                  )}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
