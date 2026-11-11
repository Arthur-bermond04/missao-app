'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import {
  listarModulos,
  listarPermissoes,
  podeNaMatriz,
  resolverMatriz,
  rotuloModulo,
  type MatrizPermissoes,
} from '@/lib/permissoes';
import type { AcaoPermissao, Perfil, PermissaoModulo } from '@/types/database';

const PERFIS: { chave: Perfil; label: string }[] = [
  { chave: 'missionario', label: 'Missionário' },
  { chave: 'lider', label: 'Líder' },
  { chave: 'coordenador', label: 'Coordenador' },
  { chave: 'padre', label: 'Padre' },
  { chave: 'admin', label: 'Admin' },
];

const ACAO_SIGLA: Record<AcaoPermissao, string> = { ver: 'V', criar: 'C', editar: 'E', excluir: 'X' };
const ACAO_NOME: Record<AcaoPermissao, string> = { ver: 'Ver', criar: 'Criar', editar: 'Editar', excluir: 'Excluir' };

/**
 * Matriz de permissões lida do banco, em tempo real: é a mesma tabela que o RLS
 * consulta (auth_pode), já com os ajustes da comunidade aplicados. Serve para
 * o guia nunca ficar desatualizado em relação ao que o sistema realmente faz.
 */
export function MatrizAoVivo() {
  const { usuario } = usePainelSession();
  const comunidadeId = usuario?.comunidade_id;
  const [modulos, setModulos] = useState<PermissaoModulo[]>([]);
  const [matrizes, setMatrizes] = useState<Record<Perfil, MatrizPermissoes> | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!comunidadeId) return;
    let ativo = true;
    Promise.all([listarModulos(), listarPermissoes(comunidadeId)])
      .then(([mods, perms]) => {
        if (!ativo) return;
        setModulos(mods);
        setMatrizes(
          Object.fromEntries(PERFIS.map((p) => [p.chave, resolverMatriz(perms, p.chave, comunidadeId)])) as Record<
            Perfil,
            MatrizPermissoes
          >
        );
      })
      .catch(() => ativo && setErro(true));
    return () => {
      ativo = false;
    };
  }, [comunidadeId]);

  if (erro) {
    return <p className="mt-4 text-sm text-danger">Não foi possível carregar a matriz de permissões agora.</p>;
  }
  if (!matrizes) {
    return (
      <p className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
        <Loader2 size={16} className="animate-spin" /> Carregando a matriz...
      </p>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Matriz ao vivo da sua comunidade</p>
      <p className="mt-1 text-sm text-text-secondary">
        Lida direto do banco, já com os ajustes da comunidade. V = ver, C = criar, E = editar, X = excluir. A sua coluna
        está destacada.
      </p>
      <div className="mt-2 overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-bg-page text-left">
              <th scope="col" className="px-3 py-2 font-semibold text-text-primary">
                Módulo
              </th>
              {PERFIS.map((p) => (
                <th
                  key={p.chave}
                  scope="col"
                  className={`px-3 py-2 font-semibold ${p.chave === usuario?.perfil ? 'bg-primary-xlight text-primary' : 'text-text-primary'}`}
                >
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modulos.map((m) => (
              <tr key={m.chave} className="border-t border-border-soft">
                <th scope="row" className="px-3 py-2 text-left font-medium text-text-primary">
                  {rotuloModulo(m.nome)}
                </th>
                {PERFIS.map((p) => (
                  <td key={p.chave} className={`px-3 py-2 ${p.chave === usuario?.perfil ? 'bg-primary-xlight/50' : ''}`}>
                    <div className="flex gap-1">
                      {m.acoes.map((a) => {
                        const ok = podeNaMatriz(matrizes[p.chave], m.chave, a);
                        return (
                          <span
                            key={a}
                            title={`${p.label}: ${ACAO_NOME[a]} ${ok ? 'permitido' : 'não permitido'}`}
                            className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold ${
                              ok ? 'bg-primary text-white' : 'bg-neutral-light text-text-muted'
                            }`}
                          >
                            {ACAO_SIGLA[a]}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
