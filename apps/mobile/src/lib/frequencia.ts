// ---------------------------------------------------------------------------
// Frequência — detecção de ausência a partir dos registros de presença.
// Espelha apps/web/src/lib/frequencia.ts (os dois apps não compartilham código
// hoje; ao mexer em um, mexer no outro).
// ---------------------------------------------------------------------------

/** A partir de quantas faltas seguidas alguém vira alerta. */
export const FALTAS_CONSECUTIVAS_ALERTA = 3;

/**
 * Conta as faltas seguidas mais recentes. `registros` precisa vir ordenado do
 * mais recente para o mais antigo. Só conta ausência marcada explicitamente —
 * encontro em que a pessoa nem foi listada é registro não preenchido, não
 * falta.
 */
export function faltasConsecutivas(registros: { presente: boolean }[]): number {
  let seguidas = 0;
  for (const r of registros) {
    if (r.presente) break;
    seguidas += 1;
  }
  return seguidas;
}

export function agruparPor<T, K>(itens: T[], chave: (item: T) => K): Map<K, T[]> {
  const mapa = new Map<K, T[]>();
  for (const item of itens) {
    const k = chave(item);
    const atual = mapa.get(k);
    if (atual) atual.push(item);
    else mapa.set(k, [item]);
  }
  return mapa;
}

export interface AusenciaDetectada {
  participanteId: string;
  faltas: number;
  ultimaFalta: string;
}

export function detectarAusencias(
  registros: { participanteId: string; data: string; presente: boolean }[],
  minimo: number = FALTAS_CONSECUTIVAS_ALERTA
): AusenciaDetectada[] {
  const ausencias: AusenciaDetectada[] = [];

  for (const [participanteId, doParticipante] of agruparPor(registros, (r) => r.participanteId)) {
    const ordenados = [...doParticipante].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
    const faltas = faltasConsecutivas(ordenados);
    if (faltas >= minimo) {
      ausencias.push({ participanteId, faltas, ultimaFalta: ordenados[0].data });
    }
  }

  return ausencias;
}
