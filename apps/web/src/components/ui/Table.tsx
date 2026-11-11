'use client';

import { useState } from 'react';

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** Alinhamento do cabeçalho E das células da coluna (números à direita). */
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyState?: React.ReactNode;
  pageSize?: number;
  rowActions?: (row: T) => React.ReactNode;
  /** Mostra as ações da linha sempre, e não só ao passar o mouse. */
  acoesSempreVisiveis?: boolean;
}

const ALINHAMENTO = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;

export function Table<T>({
  columns,
  data,
  rowKey,
  emptyState,
  pageSize = 20,
  rowActions,
  acoesSempreVisiveis = false,
}: TableProps<T>) {
  const [pagina, setPagina] = useState(0);
  const totalPaginas = Math.max(1, Math.ceil(data.length / pageSize));
  const linhas = data.slice(pagina * pageSize, pagina * pageSize + pageSize);

  if (data.length === 0) {
    return <>{emptyState ?? <p className="py-6 text-center text-sm text-text-secondary">Nenhum item encontrado.</p>}</>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-soft">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary ${
                  ALINHAMENTO[col.align ?? 'left']
                }`}
              >
                {col.header}
              </th>
            ))}
            {!!rowActions && (
              <th scope="col" className="px-4 py-3 text-right">
                <span className="sr-only">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-soft">
          {linhas.map((row) => (
            <tr key={rowKey(row)} className="group transition-colors hover:bg-bg-page">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3.5 align-middle text-text-primary ${ALINHAMENTO[col.align ?? 'left']} ${col.className ?? ''}`}
                >
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
              {!!rowActions && (
                <td
                  className={`px-4 py-3 text-right align-middle transition-opacity ${
                    acoesSempreVisiveis ? '' : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100'
                  }`}
                >
                  {rowActions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between border-t border-border-soft px-4 pt-4 text-xs text-text-secondary">
          <span>
            Página {pagina + 1} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
              disabled={pagina === 0}
              className="h-8 rounded-md border border-border bg-bg-card px-3 font-medium text-text-primary transition-colors hover:bg-bg-page disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
              disabled={pagina >= totalPaginas - 1}
              className="h-8 rounded-md border border-border bg-bg-card px-3 font-medium text-text-primary transition-colors hover:bg-bg-page disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
