import { labelEtapaFormacao, useTerminologia } from '@/lib/terminologia';
import {
  ESTADOS_OVELHA_ENCONTRO,
  type EstadoEspiritual,
  type EstadoOvelhaEncontro,
  type EtapaFormacao,
} from '@/types/database';

const ESTADO_CONFIG: Record<EstadoEspiritual, { bg: string; text: string; label: string }> = {
  crescendo: { bg: 'bg-accent-light', text: 'text-accent', label: 'Crescendo' },
  estavel: { bg: 'bg-primary-xlight', text: 'text-primary', label: 'Estável' },
  atencao: { bg: 'bg-warning-light', text: 'text-warning', label: 'Atenção' },
  risco: { bg: 'bg-danger-light', text: 'text-danger', label: 'Risco' },
};

export function EstadoEspiritualBadge({ estado }: { estado: EstadoEspiritual }) {
  const cfg = ESTADO_CONFIG[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      {cfg.label}
    </span>
  );
}

export function EtapaBadge({ etapa }: { etapa: EtapaFormacao }) {
  const terminologia = useTerminologia();
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary-xlight px-2.5 py-1 text-xs font-medium text-primary">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
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
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {info?.emoji} {info?.label ?? estado}
    </span>
  );
}
