import {
  Flame,
  Droplet,
  Snowflake,
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

interface VariantConfig {
  /** Fundo suave + texto saturado da mesma família (tokens do design system). */
  classes: string;
  /** Cor do ponto indicador. Estados (ativo, aberto...) usam ponto. */
  ponto?: string;
  /** Variantes com significado próprio (temperatura, fluxo) mantêm ícone. */
  icon?: LucideIcon;
  label: string;
}

const VARIANT_CONFIG: Record<BadgeVariant, VariantConfig> = {
  quente: { classes: 'bg-warning-light text-warning', icon: Flame, label: 'Quente' },
  morno: { classes: 'bg-info-light text-info', icon: Droplet, label: 'Morno' },
  frio: { classes: 'bg-neutral-light text-neutral', icon: Snowflake, label: 'Frio' },
  receita: { classes: 'bg-success-light text-success', icon: ArrowUpRight, label: 'Receita' },
  despesa: { classes: 'bg-danger-light text-danger', icon: ArrowDownRight, label: 'Despesa' },

  pago: { classes: 'bg-success-light text-success', ponto: 'bg-success', label: 'Pago' },
  pendente: { classes: 'bg-warning-light text-warning', ponto: 'bg-warning', label: 'Pendente' },
  integrado: { classes: 'bg-primary-xlight text-primary', ponto: 'bg-primary', label: 'Integrado' },
  aberto: { classes: 'bg-info-light text-info', ponto: 'bg-info', label: 'Aberto' },
  encerrado: { classes: 'bg-neutral-light text-neutral', ponto: 'bg-neutral', label: 'Encerrado' },
  realizado: { classes: 'bg-success-light text-success', ponto: 'bg-success', label: 'Realizado' },
  ativo: { classes: 'bg-success-light text-success', ponto: 'bg-success', label: 'Ativo' },
  inativo: { classes: 'bg-neutral-light text-neutral', ponto: 'bg-neutral', label: 'Inativo' },
};

/**
 * Pílula de status: fundo suave, ponto arredondado e texto na mesma família de cor.
 * O ponto aparece sempre nos estados; showIcon só controla os ícones das variantes
 * com significado próprio (temperatura e fluxo financeiro).
 */
export function Badge({
  variant,
  children,
  showIcon = true,
}: {
  variant: BadgeVariant;
  children?: React.ReactNode;
  showIcon?: boolean;
}) {
  const { classes, ponto, icon: Icon, label } = VARIANT_CONFIG[variant];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}>
      {ponto && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ponto}`} aria-hidden />}
      {showIcon && Icon && <Icon size={12} aria-hidden />}
      {children ?? label}
    </span>
  );
}
