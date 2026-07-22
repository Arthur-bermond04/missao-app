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

const VARIANT_CONFIG: Record<BadgeVariant, { bg: string; text: string; border?: string; icon: LucideIcon; label: string }> = {
  quente: { bg: '#FEF3C7', text: '#D97706', icon: Flame, label: 'Quente' },
  morno: { bg: '#DBEAFE', text: '#1D4ED8', icon: Droplet, label: 'Morno' },
  frio: { bg: '#F3F4F6', text: '#6B7280', icon: Snowflake, label: 'Frio' },
  pago: { bg: '#DCFCE7', text: '#16A34A', icon: CheckCircle2, label: 'Pago' },
  pendente: { bg: '#FEF3C7', text: '#D97706', icon: Clock, label: 'Pendente' },
  integrado: { bg: '#E8F5EE', text: '#1A7A4A', icon: BadgeCheck, label: 'Integrado' },
  aberto: { bg: '#DBEAFE', text: '#1D4ED8', icon: CircleDot, label: 'Aberto' },
  encerrado: { bg: '#F3F4F6', text: '#6B7280', icon: XCircle, label: 'Encerrado' },
  realizado: { bg: '#DCFCE7', text: '#16A34A', icon: CheckCircle2, label: 'Realizado' },
  ativo: { bg: '#DCFCE7', text: '#16A34A', icon: CheckCircle2, label: 'Ativo' },
  inativo: { bg: '#F3F4F6', text: '#6B7280', icon: XCircle, label: 'Inativo' },
  receita: { bg: '#DCFCE7', text: '#16A34A', icon: ArrowUpRight, label: 'Receita' },
  despesa: { bg: '#FEE2E2', text: '#DC2626', icon: ArrowDownRight, label: 'Despesa' },
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
  const { bg, text, border, icon: Icon, label } = VARIANT_CONFIG[variant];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
      style={{ backgroundColor: bg, color: text, border: border ? `1px solid ${border}` : undefined }}
    >
      {showIcon && <Icon size={12} />}
      {children ?? label}
    </span>
  );
}
