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

// Pílula = fundo claro + texto saturado da mesma família. As classes saem dos
// tokens de status do design system (globals.css), não de hex solto.
const VARIANT_CONFIG: Record<BadgeVariant, { classes: string; icon: LucideIcon; label: string }> = {
  quente: { classes: 'bg-warning-light text-warning', icon: Flame, label: 'Quente' },
  morno: { classes: 'bg-info-light text-info', icon: Droplet, label: 'Morno' },
  frio: { classes: 'bg-neutral-light text-neutral', icon: Snowflake, label: 'Frio' },
  pago: { classes: 'bg-success-light text-success', icon: CheckCircle2, label: 'Pago' },
  pendente: { classes: 'bg-warning-light text-warning', icon: Clock, label: 'Pendente' },
  integrado: { classes: 'bg-primary-xlight text-primary', icon: BadgeCheck, label: 'Integrado' },
  aberto: { classes: 'bg-info-light text-info', icon: CircleDot, label: 'Aberto' },
  encerrado: { classes: 'bg-neutral-light text-neutral', icon: XCircle, label: 'Encerrado' },
  realizado: { classes: 'bg-success-light text-success', icon: CheckCircle2, label: 'Realizado' },
  ativo: { classes: 'bg-success-light text-success', icon: CheckCircle2, label: 'Ativo' },
  inativo: { classes: 'bg-neutral-light text-neutral', icon: XCircle, label: 'Inativo' },
  receita: { classes: 'bg-success-light text-success', icon: ArrowUpRight, label: 'Receita' },
  despesa: { classes: 'bg-danger-light text-danger', icon: ArrowDownRight, label: 'Despesa' },
};

export function Badge({
  variant,
  children,
  showIcon = true,
}: {
  variant: BadgeVariant;
  children?: React.ReactNode;
  showIcon?: boolean;
}) {
  const { classes, icon: Icon, label } = VARIANT_CONFIG[variant];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${classes}`}>
      {showIcon && <Icon size={12} />}
      {children ?? label}
    </span>
  );
}
