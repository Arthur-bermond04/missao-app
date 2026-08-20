'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from '@/lib/useSession';
import {
  listarPermissoes,
  podeNaMatriz,
  podeNoLegado,
  resolverMatriz,
  type MatrizPermissoes,
} from '@/lib/permissoes';
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
  /**
   * true quando a matriz não pôde ser lida e `pode()` está caindo nas regras
   * antigas. Normalmente significa que a migration de permissões ainda não
   * rodou neste banco.
   */
  permissoesIndisponiveis: boolean;
};

const PainelSessionCtx = createContext<PainelSession | null>(null);

export function PainelSessionProvider({ children }: { children: React.ReactNode }) {
  const sessionData = useSession();
  const [permissoes, setPermissoes] = useState<MatrizPermissoes>({});
  const [permissoesCarregando, setPermissoesCarregando] = useState(true);
  const [permissoesIndisponiveis, setPermissoesIndisponiveis] = useState(false);

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
        // Lista vazia conta como indisponível: sem nenhuma linha, a matriz
        // negaria tudo e o app ficaria sem menu.
        if (lista.length === 0) {
          setPermissoes({});
          setPermissoesIndisponiveis(true);
          return;
        }
        setPermissoes(resolverMatriz(lista, perfil, comunidadeId));
        setPermissoesIndisponiveis(false);
      })
      .catch((err) => {
        if (cancelado) return;
        console.warn(
          '[MissãoApp] Não foi possível ler a matriz de permissões; usando as regras anteriores. ' +
            'A migration de permissões provavelmente ainda não rodou neste banco.',
          err
        );
        setPermissoes({});
        setPermissoesIndisponiveis(true);
      })
      .finally(() => {
        if (!cancelado) setPermissoesCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [comunidadeId, perfil, sessionData.carregando]);

  const pode = useCallback(
    (modulo: string, acao: AcaoPermissao) =>
      permissoesIndisponiveis
        ? podeNoLegado(perfil, modulo, acao)
        : podeNaMatriz(permissoes, modulo, acao),
    [permissoes, permissoesIndisponiveis, perfil]
  );

  const valor = useMemo(
    () => ({ ...sessionData, permissoes, pode, permissoesCarregando, permissoesIndisponiveis }),
    [sessionData, permissoes, pode, permissoesCarregando, permissoesIndisponiveis]
  );

  return <PainelSessionCtx.Provider value={valor}>{children}</PainelSessionCtx.Provider>;
}

export function usePainelSession() {
  const ctx = useContext(PainelSessionCtx);
  if (!ctx) throw new Error('usePainelSession precisa estar dentro de <PainelSessionProvider>');
  return ctx;
}
