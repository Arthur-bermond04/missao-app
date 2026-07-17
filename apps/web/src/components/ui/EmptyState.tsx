import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-xlight text-primary/50">
        <Icon size={28} />
      </div>
      <h3 className="mt-4 text-sm font-bold text-text-primary">{title}</h3>
      {!!description && <p className="mt-1 max-w-xs text-sm text-text-secondary">{description}</p>}
      {!!action && (
        <Button size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
