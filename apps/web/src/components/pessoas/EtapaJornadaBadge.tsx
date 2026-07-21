import { ETAPAS_JORNADA_PESSOA, type EtapaJornadaPessoa } from '@/types/database';

const CORES: Record<EtapaJornadaPessoa, string> = {
  contato_inicial: 'bg-bg-page text-text-secondary',
  interessado: 'bg-warning-light text-warning',
  participando: 'bg-accent-light text-accent',
  cv: 'bg-primary-xlight text-primary',
  cal: 'bg-primary-xlight text-primary',
  integrado: 'bg-accent-light text-accent',
  afastado: 'bg-danger-light text-danger',
};

const LABEL = Object.fromEntries(ETAPAS_JORNADA_PESSOA.map((e) => [e.valor, e.label])) as Record<
  EtapaJornadaPessoa,
  string
>;

export function EtapaJornadaBadge({ etapa }: { etapa: EtapaJornadaPessoa }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${CORES[etapa]}`}>
      {LABEL[etapa]}
    </span>
  );
}
