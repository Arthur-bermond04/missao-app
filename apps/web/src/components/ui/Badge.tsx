import {
  Flame,
  Droplet,
  Snowflake,
  CheckCircle2,
  Clock,
  BadgeCheck,
  CircleDot,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from 'lucide-react';

export type BadgeVariant =
  | 'quente'
  | 'morno'
  | 'frio'
  | 'pago'
  | 'pendente'
  | 'integrado'
  | 'aberto'
  | 'encerrado'
  | 'realizado'
  | 'ativo'
  | 'inativo'
  | 'receita'
  | 'despesa';

interface BadgeProps {
  variant: BadgeVariant;
  children?: React.ReactNode;
  showIcon?: boolean;
}

const VARIANT_CONFIG: Record<BadgeVariant, { bg: string; text: string; icon: LucideIcon; label: string }> = {
  quente: { bg: 'bg-warning-light', text: 'text-warning', icon: Flame, label: 'Quente' },
  morno: { bg: 'bg-accent-light', text: 'text-accent', icon: Droplet, label: 'Morno' },
  frio: { bg: 'bg-bg-page', text: 'text-text-secondary', icon: Snowflake, label: 'Frio' },
  pago: { bg: 'bg-accent-light', text: 'text-accent', icon: CheckCircle2, label: 'Pago' },
  pendente: { bg: 'bg-warning-light', text: 'text-warning', icon: Clock, label: 'Pendente' },
  integrado: { bg: 'bg-primary-xlight', text: 'text-primary', icon: BadgeCheck, label: 'Integrado' },
  aberto: { bg: 'bg-accent-light', text: 'text-accent', icon: CircleDot, label: 'Aberto' },
  encerrado: { bg: 'bg-bg-page', text: 'text-text-secondary', icon: XCircle, label: 'Encerrado' },
  realizado: { bg: 'bg-primary-xlight', text: 'text-primary', icon: CheckCircle2, label: 'Realizado' },
  ativo: { bg: 'bg-accent-light', text: 'text-accent', icon: CheckCircle2, label: 'Ativo' },
  inativo: { bg: 'bg-bg-page', text: 'text-text-secondary', icon: XCircle, label: 'Inativo' },
  receita: { bg: 'bg-accent-light', text: 'text-accent', icon: ArrowUpRight, label: 'Receita' },
  despesa: { bg: 'bg-danger-light', text: 'text-danger', icon: ArrowDownRight, label: 'Despesa' },
};

export function Badge({ variant, children, showIcon = true }: BadgeProps) {
  const { bg, text, icon: Icon, label } = VARIANT_CONFIG[variant];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${bg} ${text}`}>
      {showIcon && <Icon size={12} />}
      {children ?? label}
    </span>
  );
}
