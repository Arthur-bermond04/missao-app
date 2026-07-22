import { Sprout, Minus, AlertTriangle, ShieldAlert } from 'lucide-react';
import { labelEtapaFormacao, useTerminologia } from '@/lib/terminologia';
import {
  ESTADOS_OVELHA_ENCONTRO,
  type EstadoEspiritual,
  type EstadoOvelhaEncontro,
  type EtapaFormacao,
} from '@/types/database';

const ESTADO_CONFIG: Record<EstadoEspiritual, { bg: string; text: string; icon: typeof Sprout; label: string }> = {
  crescendo: { bg: 'bg-accent-light', text: 'text-accent', icon: Sprout, label: 'Crescendo' },
  estavel: { bg: 'bg-primary-xlight', text: 'text-primary', icon: Minus, label: 'Estável' },
  atencao: { bg: 'bg-warning-light', text: 'text-warning', icon: AlertTriangle, label: 'Atenção' },
  risco: { bg: 'bg-danger-light', text: 'text-danger', icon: ShieldAlert, label: 'Risco' },
};

export function EstadoEspiritualBadge({ estado }: { estado: EstadoEspiritual }) {
  const cfg = ESTADO_CONFIG[estado];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

export function EtapaBadge({ etapa }: { etapa: EtapaFormacao }) {
  const terminologia = useTerminologia();
  return (
    <span className="inline-flex items-center rounded-full bg-primary-xlight px-2 py-1 text-xs font-medium text-primary">
      {labelEtapaFormacao(etapa, terminologia)}
    </span>
  );
}

const ENCONTRO_COR: Record<EstadoOvelhaEncontro, { bg: string; text: string }> = {
  muito_bem: { bg: 'bg-accent-light', text: 'text-accent' },
  bem: { bg: 'bg-accent-light', text: 'text-accent' },
  estavel: { bg: 'bg-primary-xlight', text: 'text-primary' },
  dificuldade: { bg: 'bg-warning-light', text: 'text-warning' },
  crise: { bg: 'bg-danger-light', text: 'text-danger' },
};

export function EstadoEncontroBadge({ estado }: { estado: EstadoOvelhaEncontro }) {
  const cfg = ENCONTRO_COR[estado];
  const info = ESTADOS_OVELHA_ENCONTRO.find((e) => e.valor === estado);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {info?.emoji} {info?.label ?? estado}
    </span>
  );
}
