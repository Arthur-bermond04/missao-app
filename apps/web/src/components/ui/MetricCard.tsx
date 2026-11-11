import type { LucideIcon } from 'lucide-react';
import { IconeCaixa, type TomIcone } from '@/components/ui/IconeCaixa';

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

// primary = pessoas/contagens (azul) · accent = dinheiro e positivo (esmeralda) ·
// warning = atenção (âmbar) · danger = problema (vermelho) · info = saldo e dados (azul).
const TOM_DA_COR: Record<MetricCardProps['iconColor'], TomIcone> = {
  primary: 'azul',
  accent: 'esmeralda',
  warning: 'ambar',
  danger: 'danger',
  info: 'azul',
};

export function MetricCard({ icon: Icon, iconColor, label, value, delta, subtitle, valorClassName }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border-soft bg-bg-card p-5 shadow-card">
      <IconeCaixa icon={Icon} tom={TOM_DA_COR[iconColor]} tamanho="md" />
      <p className="mt-4 text-xs font-medium text-text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${valorClassName ?? 'text-text-primary'}`}>{value}</p>
      {!!subtitle && <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>}
      {delta !== undefined && Number.isFinite(delta.value) && (
        <p className={`mt-1 text-xs font-semibold ${delta.value >= 0 ? 'text-success' : 'text-danger'}`}>
          {delta.value >= 0 ? '+' : ''}
          {delta.value.toFixed(0)}% vs mês anterior
        </p>
      )}
    </div>
  );
}
