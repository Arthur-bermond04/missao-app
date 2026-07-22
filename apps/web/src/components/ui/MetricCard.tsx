import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  iconColor: 'primary' | 'accent' | 'warning' | 'danger' | 'info';
  label: string;
  value: string | number;
  delta?: { value: number };
  subtitle?: string;
  // Só pra valores monetários com sinal (saldo) — deixa o próprio número
  // colorido, não só o ícone, pra negativo nunca ficar ambíguo. Sem isso,
  // o valor sempre usa a cor neutra padrão.
  valorClassName?: string;
}

const ICON_STYLES: Record<MetricCardProps['iconColor'], string> = {
  primary: 'bg-primary-xlight text-primary',
  accent: 'bg-[#F0FDF4] text-[#16A34A]',
  warning: 'bg-warning-light text-warning',
  danger: 'bg-danger-light text-danger',
  info: 'bg-info-light text-info',
};

export function MetricCard({ icon: Icon, iconColor, label, value, delta, subtitle, valorClassName }: MetricCardProps) {
  return (
    <div className="rounded-md bg-bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-hover">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${ICON_STYLES[iconColor]}`}>
        <Icon size={16} />
      </div>
      <p className="mt-3 text-xs font-semibold text-text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${valorClassName ?? 'text-text-primary'}`}>{value}</p>
      {!!subtitle && <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>}
      {delta !== undefined && Number.isFinite(delta.value) && (
        <p className={`mt-1 text-xs font-semibold ${delta.value >= 0 ? 'text-[#16A34A]' : 'text-danger'}`}>
          {delta.value >= 0 ? '+' : ''}
          {delta.value.toFixed(0)}% vs mês anterior
        </p>
      )}
    </div>
  );
}
