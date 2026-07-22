import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { TERMINOLOGIA_PADRAO, type EtapaFormacao, type EtapaJornada, type EtapaJornadaPessoa, type Terminologia } from '../types/database';

// Lê comunidades.terminologia da comunidade informada. Cada tela que mostra
// "CV"/"CAL"/"Ovelha"/"Pastor" deve usar esse hook em vez de string fixa —
// sem ele, trocar o nome em Configurações (web) não reflete no app.
export function useTerminologia(comunidadeId: string | null | undefined): Terminologia {
  const [terminologia, setTerminologia] = useState<Terminologia>(TERMINOLOGIA_PADRAO);

  useEffect(() => {
    if (!comunidadeId) return;
    supabase
      .from('comunidades')
      .select('terminologia')
      .eq('id', comunidadeId)
      .single()
      .then(({ data }) => {
        const t = (data as { terminologia: Partial<Terminologia> } | null)?.terminologia;
        if (t) setTerminologia({ ...TERMINOLOGIA_PADRAO, ...t });
      });
  }, [comunidadeId]);

  return terminologia;
}

// Helpers pra aplicar a terminologia customizada em cima das listas fixas de
// etapas (o valor salvo no banco continua 'cv'/'cal' — só o rótulo muda).
export function labelEtapaJornada(etapa: EtapaJornada, terminologia: Terminologia): string {
  const PADRAO: Record<EtapaJornada, string> = {
    abordagem: 'Abordagens',
    celula: 'Foram à célula',
    retiro: 'Foram a retiro',
    cv: terminologia.etapa_cv,
    cal: `Integrados (${terminologia.etapa_cal})`,
  };
  return PADRAO[etapa];
}

export function labelEtapaJornadaPessoa(etapa: EtapaJornadaPessoa, terminologia: Terminologia): string {
  const PADRAO: Record<EtapaJornadaPessoa, string> = {
    contato_inicial: 'Contato inicial',
    interessado: 'Interessado',
    participando: 'Participando',
    cv: terminologia.etapa_cv,
    cal: terminologia.etapa_cal,
    integrado: 'Integrado',
    afastado: 'Afastado',
  };
  return PADRAO[etapa];
}

export function labelEtapaFormacao(etapa: EtapaFormacao, terminologia: Terminologia): string {
  const PADRAO: Record<EtapaFormacao, string> = {
    inicio: 'Início',
    cv: terminologia.etapa_cv,
    cal: terminologia.etapa_cal,
    obra: 'Obra',
    integrado: 'Integrado',
  };
  return PADRAO[etapa];
}
