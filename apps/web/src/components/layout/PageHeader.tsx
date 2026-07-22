import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ icon: Icon, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-xlight text-primary">
          <Icon size={20} />
        </div>
        <div>
          <h1 className="font-sans text-[28px] font-bold text-text-primary">{title}</h1>
          {!!subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
        </div>
      </div>
      {!!actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
