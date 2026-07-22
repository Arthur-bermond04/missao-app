import { Crown, GraduationCap, Wrench, User } from 'lucide-react';
import type { NivelEquipe } from '@/types/database';

const NIVEL_CONFIG: Record<NivelEquipe, { bg: string; text: string; icon: typeof Crown; label: string }> = {
  lideranca: { bg: 'bg-primary-xlight', text: 'text-primary', icon: Crown, label: 'Liderança' },
  formacao: { bg: 'bg-accent-light', text: 'text-accent', icon: GraduationCap, label: 'Formação' },
  servico: { bg: 'bg-warning-light', text: 'text-warning', icon: Wrench, label: 'Serviço' },
  membro: { bg: 'bg-bg-page', text: 'text-text-secondary', icon: User, label: 'Membro' },
};

export function NivelEquipeBadge({ nivel }: { nivel: NivelEquipe }) {
  const cfg = NIVEL_CONFIG[nivel];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}
