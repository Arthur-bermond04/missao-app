import type { NivelEquipe } from '@/types/database';

const NIVEL_CONFIG: Record<NivelEquipe, { bg: string; text: string; label: string }> = {
  lideranca: { bg: 'bg-primary-xlight', text: 'text-primary', label: 'Liderança' },
  formacao: { bg: 'bg-accent-light', text: 'text-accent', label: 'Formação' },
  servico: { bg: 'bg-warning-light', text: 'text-warning', label: 'Serviço' },
  membro: { bg: 'bg-bg-page', text: 'text-text-secondary', label: 'Membro' },
};

export function NivelEquipeBadge({ nivel }: { nivel: NivelEquipe }) {
  const cfg = NIVEL_CONFIG[nivel];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      {cfg.label}
    </span>
  );
}
