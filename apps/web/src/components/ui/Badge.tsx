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

const VARIANT_CONFIG: Record<BadgeVariant, { bg: string; text: string; border?: string; icon: LucideIcon; label: string }> = {
  quente: { bg: '#FBF3E0', text: '#8B6A2A', border: '#E8C96A', icon: Flame, label: 'Quente' },
  morno: { bg: '#E1F5EE', text: '#085041', border: '#9FE1CB', icon: Droplet, label: 'Morno' },
  frio: { bg: '#F7F4EE', text: '#6B6357', border: '#E2D9C8', icon: Snowflake, label: 'Frio' },
  pago: { bg: '#E1F5EE', text: '#085041', icon: CheckCircle2, label: 'Pago' },
  pendente: { bg: '#FBF3E0', text: '#8B6A2A', icon: Clock, label: 'Pendente' },
  integrado: { bg: '#F5E6C8', text: '#8B6A2A', icon: BadgeCheck, label: 'Integrado' },
  aberto: { bg: '#E1F5EE', text: '#085041', icon: CircleDot, label: 'Aberto' },
  encerrado: { bg: '#F7F4EE', text: '#6B6357', icon: XCircle, label: 'Encerrado' },
  realizado: { bg: '#F5E6C8', text: '#8B6A2A', icon: CheckCircle2, label: 'Realizado' },
  ativo: { bg: '#F5E6C8', text: '#8B6A2A', icon: CheckCircle2, label: 'Ativo' },
  inativo: { bg: '#F7F4EE', text: '#6B6357', icon: XCircle, label: 'Inativo' },
  receita: { bg: '#E1F5EE', text: '#085041', icon: ArrowUpRight, label: 'Receita' },
  despesa: { bg: '#FAECE7', text: '#8B2B1A', icon: ArrowDownRight, label: 'Despesa' },
};

export function Badge({ variant, children, showIcon = true }: BadgeProps) {
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
