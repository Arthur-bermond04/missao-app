import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { IconeCaixa, type TomIcone } from './IconeCaixa';

interface EmptyStateProps {
  icon: LucideIcon;
  /** Cor do assunto; neutro por padrão para estados vazios ficarem discretos. */
  tom?: TomIcone;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, tom = 'neutro', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <IconeCaixa icon={icon} tom={tom} tamanho="lg" />
      <h3 className="mt-4 text-sm font-semibold text-text-primary">{title}</h3>
      {!!description && <p className="mt-1 max-w-xs text-sm text-text-secondary">{description}</p>}
      {!!action && (
        <Button size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
