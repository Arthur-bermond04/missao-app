import type { LucideIcon } from 'lucide-react';
import { IconeCaixa, type TomIcone } from '@/components/ui/IconeCaixa';

interface PageHeaderProps {
  icon: LucideIcon;
  /** Cor do assunto da tela (azul pessoas, esmeralda financeiro, rosa pastoral...). */
  tom?: TomIcone;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ icon: Icon, tom = 'primary', title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <IconeCaixa icon={Icon} tom={tom} tamanho="lg" />
        <div>
          <h1 className="font-sans text-xl font-semibold tracking-tight text-text-primary sm:text-[22px] sm:leading-8">{title}</h1>
          {!!subtitle && <p className="mt-0.5 text-[13px] text-text-secondary">{subtitle}</p>}
        </div>
      </div>
      {!!actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
