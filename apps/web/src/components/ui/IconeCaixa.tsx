import type { LucideIcon } from 'lucide-react';

// Padrão único de ícone do app: traço fino dentro de um recipiente suave.
// O ícone ocupa metade do recipiente (14/28, 16/32, 20/40, 24/48), a proporção
// que dá respiro sem deixar o ícone "boiando".
export type TomIcone =
  | 'neutro'
  | 'primary'
  | 'sucesso'
  | 'warning'
  | 'danger'
  | 'info'
  | 'branco'
  | 'azul'
  | 'esmeralda'
  | 'rosa'
  | 'ambar'
  | 'roxo';

export const TOM_ICONE: Record<TomIcone, string> = {
  neutro: 'bg-bg-page text-text-secondary ring-1 ring-inset ring-border-soft',
  primary: 'bg-primary-xlight text-primary',
  sucesso: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  danger: 'bg-danger-light text-danger',
  info: 'bg-info-light text-info',
  // Cores por assunto (tokens em globals.css).
  azul: 'bg-azul-50 text-azul-600 ring-1 ring-inset ring-azul-600/10',
  esmeralda: 'bg-esmeralda-50 text-esmeralda-600 ring-1 ring-inset ring-esmeralda-600/10',
  rosa: 'bg-rosa-50 text-rosa-600 ring-1 ring-inset ring-rosa-600/10',
  ambar: 'bg-ambar-50 text-ambar-600 ring-1 ring-inset ring-ambar-600/10',
  roxo: 'bg-roxo-50 text-roxo-600 ring-1 ring-inset ring-roxo-600/10',
  // Para quando o recipiente fica sobre um fundo já tingido (item ativo de menu).
  branco: 'bg-white text-primary shadow-sm ring-1 ring-inset ring-border-soft',
};

const TAMANHOS = {
  xs: { caixa: 'h-7 w-7', icone: 14, canto: 'rounded-lg' },
  sm: { caixa: 'h-8 w-8', icone: 16, canto: 'rounded-lg' },
  md: { caixa: 'h-10 w-10', icone: 20, canto: 'rounded-xl' },
  lg: { caixa: 'h-12 w-12', icone: 24, canto: 'rounded-2xl' },
} as const;

export type TamanhoIcone = keyof typeof TAMANHOS;

export function IconeCaixa({
  icon: Icon,
  tom = 'primary',
  tamanho = 'md',
  forma = 'quadrado',
  className = '',
}: {
  icon: LucideIcon;
  tom?: TomIcone;
  tamanho?: TamanhoIcone;
  forma?: 'circulo' | 'quadrado';
  className?: string;
}) {
  const t = TAMANHOS[tamanho];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${t.caixa} ${
        forma === 'circulo' ? 'rounded-full' : t.canto
      } ${TOM_ICONE[tom]} ${className}`}
    >
      <Icon size={t.icone} aria-hidden />
    </span>
  );
}
