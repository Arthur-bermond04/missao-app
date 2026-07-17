'use client';

import { useState } from 'react';

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyState?: React.ReactNode;
  pageSize?: number;
  rowActions?: (row: T) => React.ReactNode;
}

export function Table<T>({
  columns,
  data,
  rowKey,
  emptyState,
  pageSize = 20,
  rowActions,
}: TableProps<T>) {
  const [pagina, setPagina] = useState(0);
  const totalPaginas = Math.max(1, Math.ceil(data.length / pageSize));
  const linhas = data.slice(pagina * pageSize, pagina * pageSize + pageSize);

  if (data.length === 0) {
    return <>{emptyState ?? <p className="py-6 text-center text-sm text-text-secondary">Nenhum item encontrado.</p>}</>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-page">
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {col.header}
              </th>
            ))}
            {!!rowActions && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody>
          {linhas.map((row, index) => (
            <tr
              key={rowKey(row)}
              className={`group border-b border-border last:border-b-0 hover:bg-primary-xlight/50 ${
                index % 2 === 1 ? 'bg-bg-page/40' : ''
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-3 py-2.5 text-text-primary ${col.className ?? ''}`}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
              {!!rowActions && (
                <td className="px-3 py-2.5 text-right opacity-0 transition-opacity group-hover:opacity-100">
                  {rowActions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {totalPaginas > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-text-secondary">
          <span>
            Página {pagina + 1} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
              disabled={pagina === 0}
              className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
              disabled={pagina >= totalPaginas - 1}
              className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
