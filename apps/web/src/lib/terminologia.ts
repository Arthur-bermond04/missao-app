'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { usePainelSession } from './PainelSessionContext';
import { TERMINOLOGIA_PADRAO, type EtapaFormacao, type EtapaJornada, type EtapaJornadaPessoa, type Terminologia } from '../types/database';

// Lê comunidades.terminologia da comunidade do usuário logado. Cada tela que
// mostra "CV"/"CAL"/"Ovelha"/"Pastor" deve usar esse hook em vez de string
// fixa — sem ele, trocar o nome em Configurações não reflete em lugar nenhum.
export function useTerminologia(): Terminologia {
  const { usuario } = usePainelSession();
  const [terminologia, setTerminologia] = useState<Terminologia>(TERMINOLOGIA_PADRAO);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    supabase
      .from('comunidades')
      .select('terminologia')
      .eq('id', usuario.comunidade_id)
      .single()
      .then(({ data }) => {
        const t = (data as { terminologia: Partial<Terminologia> } | null)?.terminologia;
        if (t) setTerminologia({ ...TERMINOLOGIA_PADRAO, ...t });
      });
  }, [usuario?.comunidade_id]);

  return terminologia;
}

// Helpers pra aplicar a terminologia customizada em cima das listas fixas de
// etapas (o valor salvo no banco continua 'cv'/'cal' — só o rótulo muda).
export function labelEtapaJornada(etapa: EtapaJornada, terminologia: Terminologia): string {
  if (etapa === 'cv') return terminologia.etapa_cv;
  if (etapa === 'cal') return `Integrados (${terminologia.etapa_cal})`;
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
  if (etapa === 'cv') return terminologia.etapa_cv;
  if (etapa === 'cal') return terminologia.etapa_cal;
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
  if (etapa === 'cv') return terminologia.etapa_cv;
  if (etapa === 'cal') return terminologia.etapa_cal;
  const PADRAO: Record<EtapaFormacao, string> = {
    inicio: 'Início',
    cv: terminologia.etapa_cv,
    cal: terminologia.etapa_cal,
    obra: 'Obra',
    integrado: 'Integrado',
  };
  return PADRAO[etapa];
}
