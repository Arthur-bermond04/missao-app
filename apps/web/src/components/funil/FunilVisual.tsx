// Funil em barras horizontais proporcionais. Substitui o desenho em SVG com
// preserveAspectRatio="none", que esticava o texto e deixava os rótulos
// ilegíveis. Em barras a leitura é direta: etapa, quantidade e quanto da etapa
// anterior chegou até aqui.
const TONS = ['bg-primary/30', 'bg-primary/45', 'bg-primary/60', 'bg-primary/80', 'bg-primary'];

export function FunilVisual({ etapas }: { etapas: { label: string; total: number }[] }) {
  const base = etapas[0]?.total || 0;
  const maior = Math.max(1, ...etapas.map((e) => e.total));

  return (
    <ol className="space-y-3" aria-label="Etapas do funil">
      {etapas.map((etapa, i) => {
        const anterior = i > 0 ? etapas[i - 1].total : null;
        const largura = etapa.total === 0 ? 0 : Math.max(3, (etapa.total / maior) * 100);
        const conversao = anterior ? Math.round((etapa.total / anterior) * 100) : null;
        const daBase = base ? Math.round((etapa.total / base) * 100) : 0;

        return (
          <li key={etapa.label} className="grid grid-cols-[minmax(110px,160px)_1fr_auto] items-center gap-4">
            <span className="truncate text-sm font-medium text-text-primary" title={etapa.label}>
              {etapa.label}
            </span>

            <div
              className="h-8 overflow-hidden rounded-md bg-bg-page"
              role="img"
              aria-label={`${etapa.label}: ${etapa.total}${i > 0 ? `, ${daBase}% da primeira etapa` : ''}`}
            >
              <div className={`h-full rounded-md ${TONS[Math.min(i, TONS.length - 1)]}`} style={{ width: `${largura}%` }} />
            </div>

            <span className="flex min-w-24 items-baseline justify-end gap-2 text-right">
              <span className="text-base font-semibold tabular-nums text-text-primary">{etapa.total}</span>
              <span className="w-10 text-xs tabular-nums text-text-secondary" title="Quanto da etapa anterior chegou aqui">
                {conversao === null ? '' : `${conversao}%`}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
