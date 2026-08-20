// ---------------------------------------------------------------------------
// Frequência — detecção de ausência a partir dos registros de presença.
//
// Fecha o ciclo Frequência → Alerta → Acompanhamento: os registros que os
// líderes já lançam (presença em ministério, em célula/missa e os encontros
// pastorais) viram alerta automático quando alguém some, em vez de depender
// de alguém reparar na falta.
// ---------------------------------------------------------------------------

/** A partir de quantas faltas seguidas alguém vira alerta. */
export const FALTAS_CONSECUTIVAS_ALERTA = 3;

/**
 * Conta as faltas seguidas mais recentes.
 *
 * `registros` precisa vir ordenado do mais recente para o mais antigo. Só
 * conta ausência marcada explicitamente (`presente: false`) — encontro em que
 * a pessoa nem foi listada não é falta, é registro que ninguém preencheu, e
 * tratar isso como falta encheria a tela de alerta falso.
 */
export function faltasConsecutivas(registros: { presente: boolean }[]): number {
  let seguidas = 0;
  for (const r of registros) {
    if (r.presente) break;
    seguidas += 1;
  }
  return seguidas;
}

/** Agrupa uma lista por chave, preservando a ordem de entrada dentro do grupo. */
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
  /** usuario_id, pessoa_id ou ovelha_id, conforme a origem. */
  participanteId: string;
  faltas: number;
  /** Data do último registro em que a pessoa esteve ausente. */
  ultimaFalta: string;
}

/**
 * Detecta quem acumulou `minimo` faltas seguidas.
 *
 * `registros` pode vir em qualquer ordem: a função ordena por data
 * decrescente dentro de cada participante antes de contar.
 */
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
