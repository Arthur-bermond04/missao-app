'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from '@/lib/useSession';
import {
  aplicarAjustesDoUsuario,
  listarPermissoes,
  listarPermissoesDoUsuario,
  podeNaMatriz,
  podeNoLegado,
  resolverMatriz,
  type MatrizPermissoes,
} from '@/lib/permissoes';
import { supabase } from '@/lib/supabase';
import { aplicarCorDestaque, carregarCorDestaque } from '@/lib/aparencia';
import { TERMINOLOGIA_PADRAO, type AcaoPermissao, type Terminologia } from '@/types/database';

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
  /**
   * Nomes configuráveis da comunidade (etapas, pastor, ovelha, módulos). Lida uma
   * vez aqui — antes cada componente que usava o hook fazia a sua própria consulta.
   */
  terminologia: Terminologia;
  /** Releia depois de salvar a terminologia em Configurações. */
  recarregarTerminologia: () => Promise<void>;
};

const PainelSessionCtx = createContext<PainelSession | null>(null);

const MATRIZ_VAZIA: MatrizPermissoes = {};

/** Nomes configuráveis da comunidade, completados com o padrão. Só lê. */
async function lerTerminologia(comunidadeId: string): Promise<Terminologia> {
  const { data } = await supabase.from('comunidades').select('terminologia').eq('id', comunidadeId).single();
  const salva = (data as { terminologia: Partial<Terminologia> | null } | null)?.terminologia;
  return { ...TERMINOLOGIA_PADRAO, ...(salva ?? {}) };
}

export function PainelSessionProvider({ children }: { children: React.ReactNode }) {
  const sessionData = useSession();
  // Permissões lidas para uma combinação comunidade+perfil+usuário. O resto é derivado dela.
  const [permissoesLidas, setPermissoesLidas] = useState<{
    chave: string;
    matriz: MatrizPermissoes;
    indisponiveis: boolean;
  } | null>(null);
  const [terminologia, setTerminologia] = useState<Terminologia>(TERMINOLOGIA_PADRAO);

  const { usuario } = sessionData;
  const comunidadeId = usuario?.comunidade_id ?? null;
  const perfil = usuario?.perfil ?? null;
  const usuarioId = usuario?.id ?? null;

  const chavePermissoes = comunidadeId && perfil ? `${comunidadeId}|${perfil}|${usuarioId ?? ''}` : null;
  const permissoesProntas = chavePermissoes !== null && permissoesLidas?.chave === chavePermissoes;
  const permissoes = permissoesProntas ? permissoesLidas.matriz : MATRIZ_VAZIA;
  const permissoesIndisponiveis = permissoesProntas ? permissoesLidas.indisponiveis : false;
  // Sem usuário resolvido ainda não há o que carregar; só paramos de "carregando"
  // quando a sessão em si terminou de resolver, senão o menu pisca vazio no primeiro render.
  const permissoesCarregando = chavePermissoes !== null ? !permissoesProntas : sessionData.carregando;

  useEffect(() => {
    if (!chavePermissoes || !comunidadeId || !perfil) return;
    let cancelado = false;
    // Ajustes do próprio usuário (nível mais específico). Se a tabela ainda
    // não existe neste banco, segue só com o perfil — igual ao comportamento antigo.
    Promise.all([
      listarPermissoes(comunidadeId),
      usuarioId ? listarPermissoesDoUsuario(usuarioId).catch(() => []) : Promise.resolve([]),
    ])
      .then(([lista, ajustes]) => {
        if (cancelado) return;
        // Lista vazia conta como indisponível: sem nenhuma linha, a matriz
        // negaria tudo e o app ficaria sem menu.
        if (lista.length === 0) {
          setPermissoesLidas({ chave: chavePermissoes, matriz: MATRIZ_VAZIA, indisponiveis: true });
          return;
        }
        setPermissoesLidas({
          chave: chavePermissoes,
          matriz: aplicarAjustesDoUsuario(resolverMatriz(lista, perfil, comunidadeId), ajustes),
          indisponiveis: false,
        });
      })
      .catch((err) => {
        if (cancelado) return;
        console.warn(
          '[MissãoWeb] Não foi possível ler a matriz de permissões; usando as regras anteriores. ' +
            'A migration de permissões provavelmente ainda não rodou neste banco.',
          err
        );
        setPermissoesLidas({ chave: chavePermissoes, matriz: MATRIZ_VAZIA, indisponiveis: true });
      });
    return () => {
      cancelado = true;
    };
  }, [chavePermissoes, comunidadeId, perfil, usuarioId]);

  const recarregarTerminologia = useCallback(async () => {
    if (!comunidadeId) return;
    setTerminologia(await lerTerminologia(comunidadeId));
  }, [comunidadeId]);

  useEffect(() => {
    if (!comunidadeId) return;
    let ativo = true;
    lerTerminologia(comunidadeId).then((t) => {
      if (ativo) setTerminologia(t);
    });
    return () => {
      ativo = false;
    };
  }, [comunidadeId]);

  // Cor de destaque escolhida pela comunidade (Configurações › Aparência).
  useEffect(() => {
    if (!comunidadeId) return;
    carregarCorDestaque(comunidadeId).then(aplicarCorDestaque);
  }, [comunidadeId]);

  const pode = useCallback(
    (modulo: string, acao: AcaoPermissao) =>
      permissoesIndisponiveis
        ? podeNoLegado(perfil, modulo)
        : podeNaMatriz(permissoes, modulo, acao),
    [permissoes, permissoesIndisponiveis, perfil]
  );

  const valor = useMemo(
    () => ({
      ...sessionData,
      permissoes,
      pode,
      permissoesCarregando,
      permissoesIndisponiveis,
      terminologia,
      recarregarTerminologia,
    }),
    [sessionData, permissoes, pode, permissoesCarregando, permissoesIndisponiveis, terminologia, recarregarTerminologia]
  );

  return <PainelSessionCtx.Provider value={valor}>{children}</PainelSessionCtx.Provider>;
}

export function usePainelSession() {
  const ctx = useContext(PainelSessionCtx);
  if (!ctx) throw new Error('usePainelSession precisa estar dentro de <PainelSessionProvider>');
  return ctx;
}
