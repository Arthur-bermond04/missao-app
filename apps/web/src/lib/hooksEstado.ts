'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';

/**
 * Ajusta estado quando algo muda — o padrão que o React recomenda no lugar de
 * `useEffect(() => setX(...), [dep])` ("You Might Not Need an Effect").
 *
 * O callback roda DURANTE a renderização, na primeira vez e sempre que algum
 * valor de `deps` mudar; o React descarta o resultado parcial e renderiza de
 * novo já com o estado ajustado, sem o quadro intermediário "errado" que o
 * efeito causava. Use só para setState (sem fetch, timer ou DOM — isso continua
 * sendo efeito).
 */
export function useAoMudar(deps: readonly unknown[], aoMudar: () => void) {
  const [anteriores, setAnteriores] = useState<readonly unknown[] | null>(null);
  const mudou =
    anteriores === null || anteriores.length !== deps.length || deps.some((d, i) => !Object.is(d, anteriores[i]));
  if (mudou) {
    setAnteriores(deps);
    aoMudar();
  }
}

const EVENTO_ARMAZENAMENTO = 'missaoweb:armazenamento';

/**
 * Valor de uma chave do localStorage, sem divergir do HTML do servidor: no
 * servidor (e na hidratação) vale `null`; depois de montar, vale o valor salvo.
 */
export function useArmazenamentoLocal(chave: string | null): [string | null, (valor: string) => void] {
  const assinar = useCallback((aviso: () => void) => {
    window.addEventListener('storage', aviso);
    window.addEventListener(EVENTO_ARMAZENAMENTO, aviso);
    return () => {
      window.removeEventListener('storage', aviso);
      window.removeEventListener(EVENTO_ARMAZENAMENTO, aviso);
    };
  }, []);

  const ler = useCallback(() => {
    if (!chave) return null;
    try {
      return localStorage.getItem(chave);
    } catch {
      return null; // sem localStorage (modo privado, bloqueado): segue sem lembrar
    }
  }, [chave]);

  const valor = useSyncExternalStore(assinar, ler, () => null);

  const gravar = useCallback(
    (novo: string) => {
      if (!chave) return;
      try {
        localStorage.setItem(chave, novo);
      } catch {
        // idem
      }
      window.dispatchEvent(new Event(EVENTO_ARMAZENAMENTO));
    },
    [chave]
  );

  return [valor, gravar];
}

const assinarNada = () => () => {};

/** Data de hoje (pt-BR). Vazia no servidor e na hidratação; preenchida depois de montar. */
export function useDataHoje(): string {
  return useSyncExternalStore(
    assinarNada,
    () => new Date().toLocaleDateString('pt-BR'),
    () => ''
  );
}

/** Fragmento da URL (#aba). Vazio no servidor; acompanha mudanças depois de montar. */
export function useHashDaUrl(): string {
  return useSyncExternalStore(
    (aviso) => {
      window.addEventListener('hashchange', aviso);
      return () => window.removeEventListener('hashchange', aviso);
    },
    () => window.location.hash.replace(/^#/, ''),
    () => ''
  );
}
