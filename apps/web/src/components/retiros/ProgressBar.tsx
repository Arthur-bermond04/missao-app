interface ProgressBarProps {
  label: string;
  valorAtual: string;
  percentual: number;
  color?: 'primary' | 'accent' | 'warning';
}

const COR_BARRA: Record<NonNullable<ProgressBarProps['color']>, string> = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  warning: 'bg-warning',
};

export function ProgressBar({ label, valorAtual, percentual, color = 'primary' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, percentual));
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-text-secondary">{label}</span>
        <span className="text-text-secondary">{valorAtual}</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-bg-page">
        <div className={`h-2 rounded-full ${COR_BARRA[color]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
