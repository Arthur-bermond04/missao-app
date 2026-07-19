'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  label?: string;
}

function iniciais(nome: string) {
  return nome.slice(0, 2).toUpperCase();
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  emptyMessage = 'Nenhum resultado encontrado',
  label,
}: ComboboxProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selecionada = options.find((o) => o.value === value) ?? null;

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(termo) || (o.sublabel ?? '').toLowerCase().includes(termo)
    );
  }, [options, busca]);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, []);

  useEffect(() => {
    setIndiceAtivo(0);
  }, [busca, aberto]);

  function selecionar(opt: ComboboxOption) {
    onChange(opt.value);
    setBusca('');
    setAberto(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setAberto(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAberto(true);
      setIndiceAtivo((i) => Math.min(i + 1, filtradas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceAtivo((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtradas[indiceAtivo];
      if (opt) selecionar(opt);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {!!label && <label className="mb-1 block text-xs font-semibold text-text-secondary">{label}</label>}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          role="combobox"
          aria-expanded={aberto}
          aria-controls={listId}
          aria-activedescendant={aberto ? `${listId}-${indiceAtivo}` : undefined}
          value={aberto ? busca : selecionada?.label ?? ''}
          onChange={(e) => {
            setBusca(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full rounded-md border border-border py-2.5 pl-9 pr-9 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary" />
      </div>

      {aberto && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-bg-card shadow-hover"
        >
          {filtradas.length === 0 ? (
            <li className="px-3 py-3 text-sm text-text-secondary">{emptyMessage}</li>
          ) : (
            filtradas.map((opt, i) => (
              <li
                key={opt.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={opt.value === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selecionar(opt);
                }}
                onMouseEnter={() => setIndiceAtivo(i)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                  i === indiceAtivo ? 'bg-primary-xlight' : ''
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-xlight text-xs font-bold text-primary">
                  {iniciais(opt.label)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-text-primary">{opt.label}</span>
                  {!!opt.sublabel && <span className="block truncate text-xs text-text-secondary">{opt.sublabel}</span>}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
