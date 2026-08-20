'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from '@/lib/useSession';
import { listarPermissoes, podeNaMatriz, resolverMatriz, type MatrizPermissoes } from '@/lib/permissoes';
import type { AcaoPermissao } from '@/types/database';

type PainelSession = ReturnType<typeof useSession> & {
  /** Matriz de permissões do perfil do usuário logado. */
  permissoes: MatrizPermissoes;
  /**
   * Espelha auth_pode() do banco. Serve para esconder menu e desabilitar
   * botão — quem barra de verdade continua sendo o RLS.
   */
  pode: (modulo: string, acao: AcaoPermissao) => boolean;
  permissoesCarregando: boolean;
};

const PainelSessionCtx = createContext<PainelSession | null>(null);

export function PainelSessionProvider({ children }: { children: React.ReactNode }) {
  const sessionData = useSession();
  const [permissoes, setPermissoes] = useState<MatrizPermissoes>({});
  const [permissoesCarregando, setPermissoesCarregando] = useState(true);

  const { usuario } = sessionData;
  const comunidadeId = usuario?.comunidade_id ?? null;
  const perfil = usuario?.perfil ?? null;

  useEffect(() => {
    if (!comunidadeId || !perfil) {
      setPermissoes({});
      // Sem usuário resolvido ainda não há o que carregar; só paramos de
      // "carregando" quando a sessão em si terminou de resolver, senão o
      // menu pisca vazio no primeiro render.
      setPermissoesCarregando(sessionData.carregando);
      return;
    }
    let cancelado = false;
    setPermissoesCarregando(true);
    listarPermissoes(comunidadeId)
      .then((lista) => {
        if (cancelado) return;
        setPermissoes(resolverMatriz(lista, perfil, comunidadeId));
      })
      .catch(() => {
        if (!cancelado) setPermissoes({});
      })
      .finally(() => {
        if (!cancelado) setPermissoesCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [comunidadeId, perfil, sessionData.carregando]);

  const pode = useCallback(
    (modulo: string, acao: AcaoPermissao) => podeNaMatriz(permissoes, modulo, acao),
    [permissoes]
  );

  const valor = useMemo(
    () => ({ ...sessionData, permissoes, pode, permissoesCarregando }),
    [sessionData, permissoes, pode, permissoesCarregando]
  );

  return <PainelSessionCtx.Provider value={valor}>{children}</PainelSessionCtx.Provider>;
}

export function usePainelSession() {
  const ctx = useContext(PainelSessionCtx);
  if (!ctx) throw new Error('usePainelSession precisa estar dentro de <PainelSessionProvider>');
  return ctx;
}
