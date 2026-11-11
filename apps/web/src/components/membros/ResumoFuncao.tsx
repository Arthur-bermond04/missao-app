'use client';

import { useEffect, useMemo, useState } from 'react';
import { FUNCOES_TRILHA } from '@/lib/guia';
import { listarModulos, listarPermissoes, podeNaMatriz, resolverMatriz, rotuloModulo } from '@/lib/permissoes';
import type { Perfil, Permissao, PermissaoModulo } from '@/types/database';

/**
 * Resume o que uma função (perfil) faz no sistema: a descrição em palavras e,
 * lida da matriz de permissões da comunidade, a lista do que ela acessa e do
 * que não acessa. Assim quem escolhe a função de alguém enxerga as consequências
 * antes de salvar.
 */
export function ResumoFuncao({ perfil, comunidadeId }: { perfil: Perfil; comunidadeId: string }) {
  const [modulos, setModulos] = useState<PermissaoModulo[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let cancelado = false;
    Promise.all([listarModulos(), listarPermissoes(comunidadeId)])
      .then(([m, p]) => {
        if (cancelado) return;
        setModulos(m);
        setPermissoes(p);
      })
      .catch(() => !cancelado && setFalhou(true));
    return () => {
      cancelado = true;
    };
  }, [comunidadeId]);

  const descricao = FUNCOES_TRILHA.find((f) => f.perfil === perfil)?.descricao;

  const { acessa, naoAcessa } = useMemo(() => {
    const matriz = resolverMatriz(permissoes, perfil, comunidadeId);
    const sim: string[] = [];
    const nao: string[] = [];
    for (const m of modulos) {
      // Módulos "de outras pessoas" são escopo ampliado, não uma tela à parte.
      (podeNaMatriz(matriz, m.chave, 'ver') ? sim : nao).push(rotuloModulo(m.nome));
    }
    return { acessa: sim, naoAcessa: nao };
  }, [modulos, permissoes, perfil, comunidadeId]);

  return (
    <div className="rounded-md border border-border bg-bg-page p-3 text-sm">
      {!!descricao && <p className="text-text-primary">{descricao}</p>}

      {falhou || modulos.length === 0 ? null : (
        <div className="mt-3 space-y-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Acessa ({acessa.length})</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {acessa.length === 0 && <span className="text-xs text-text-secondary">Nenhum módulo.</span>}
              {acessa.map((nome) => (
                <span key={nome} className="rounded-full bg-primary-xlight px-2 py-0.5 text-xs font-medium text-primary-dark">
                  {nome}
                </span>
              ))}
            </div>
          </div>
          {naoAcessa.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Não acessa ({naoAcessa.length})
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {naoAcessa.map((nome) => (
                  <span key={nome} className="rounded-full bg-neutral-light px-2 py-0.5 text-xs text-text-secondary">
                    {nome}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-text-secondary">
            Resumo do que a função faz hoje nesta comunidade. Para dar ou tirar algo só desta pessoa, use o botão
            Permissões.
          </p>
        </div>
      )}
    </div>
  );
}
