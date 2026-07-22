'use client';

import { useState } from 'react';
import { Search, UserPlus, Link2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { toastError, toastSuccess } from '@/lib/toast';
import { buscarPessoasParaCombobox } from '@/lib/pessoas';
import {
  agruparCandidatos,
  buscarRegistrosSemVinculo,
  criarPessoaEVincularCluster,
  vincularClusterAPessoa,
  type ClusterDuplicata,
} from '@/lib/duplicatas';
import type { Pessoa } from '@/types/database';

const LABEL_ORIGEM: Record<ClusterDuplicata['registros'][number]['origem'], string> = {
  contato: 'Funil',
  inscricao: 'Retiro',
  ovelha: 'Pastoral',
};

export function AbaDuplicatas({ comunidadeId, cadastradoPor }: { comunidadeId: string; cadastradoPor: string }) {
  const [buscando, setBuscando] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const [clusters, setClusters] = useState<ClusterDuplicata[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [clusterVinculando, setClusterVinculando] = useState<string | null>(null);
  const [pessoaEscolhida, setPessoaEscolhida] = useState('');
  const [processando, setProcessando] = useState<string | null>(null);

  async function handleBuscar() {
    setBuscando(true);
    try {
      const [registros, listaPessoas] = await Promise.all([
        buscarRegistrosSemVinculo(comunidadeId),
        buscarPessoasParaCombobox(comunidadeId),
      ]);
      setClusters(agruparCandidatos(registros));
      setPessoas(listaPessoas);
      setBuscou(true);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao buscar duplicatas.');
    } finally {
      setBuscando(false);
    }
  }

  function dispensar(chave: string) {
    setClusters((atual) => atual.filter((c) => c.chave !== chave));
  }

  async function handleCriarNova(cluster: ClusterDuplicata) {
    setProcessando(cluster.chave);
    try {
      await criarPessoaEVincularCluster(cluster, { comunidade_id: comunidadeId, cadastrado_por: cadastradoPor });
      toastSuccess(`${cluster.nome} cadastrado(a) e vinculado(a) ao cadastro central.`);
      dispensar(cluster.chave);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao criar pessoa.');
    } finally {
      setProcessando(null);
    }
  }

  async function handleVincularExistente(cluster: ClusterDuplicata) {
    if (!pessoaEscolhida) return;
    setProcessando(cluster.chave);
    try {
      await vincularClusterAPessoa(cluster, pessoaEscolhida);
      toastSuccess('Registros vinculados ao cadastro central.');
      dispensar(cluster.chave);
      setClusterVinculando(null);
      setPessoaEscolhida('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao vincular.');
    } finally {
      setProcessando(null);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h3 className="text-sm font-bold text-text-primary">Verificar duplicatas</h3>
        <p className="mt-1 text-xs text-text-secondary">
          Procura pessoas que aparecem em mais de um módulo (Funil, Retiros, Pastoral) sem estar vinculadas ao
          cadastro central de Pessoas — mesmo nome/telefone em módulos diferentes é sinal de que é a mesma pessoa.
        </p>
        <Button size="sm" icon={Search} className="mt-3" loading={buscando} onClick={handleBuscar}>
          {buscou ? 'Buscar de novo' : 'Buscar duplicatas'}
        </Button>
      </div>

      {buscou && clusters.length === 0 && (
        <p className="text-sm text-text-secondary">Nenhuma duplicata encontrada. Tudo já está vinculado ou é gente diferente mesmo.</p>
      )}

      {clusters.length > 0 && (
        <div className="space-y-3">
          {clusters.map((cluster) => (
            <div key={cluster.chave} className="rounded-md border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{cluster.nome}</p>
                  {!!cluster.telefone && <p className="text-xs text-text-secondary">{cluster.telefone}</p>}
                </div>
                <button
                  onClick={() => dispensar(cluster.chave)}
                  title="Não é a mesma pessoa"
                  className="rounded-md p-1 text-text-secondary hover:bg-bg-page"
                >
                  <X size={14} />
                </button>
              </div>

              <ul className="mt-2 space-y-1">
                {cluster.registros.map((r) => (
                  <li key={`${r.origem}-${r.id}`} className="text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">{LABEL_ORIGEM[r.origem]}</span>
                    {r.contexto ? ` · ${r.contexto}` : ''}
                  </li>
                ))}
              </ul>

              {clusterVinculando === cluster.chave ? (
                <div className="mt-3 flex items-end gap-2">
                  <div className="flex-1">
                    <Combobox
                      label="Vincular a"
                      value={pessoaEscolhida}
                      onChange={setPessoaEscolhida}
                      placeholder="Buscar pessoa cadastrada..."
                      emptyMessage="Nenhuma pessoa encontrada"
                      options={pessoas.map((p) => ({ value: p.id, label: p.nome, sublabel: p.telefone ?? undefined }))}
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={!pessoaEscolhida}
                    loading={processando === cluster.chave}
                    onClick={() => handleVincularExistente(cluster)}
                  >
                    Vincular
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setClusterVinculando(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Link2}
                    onClick={() => setClusterVinculando(cluster.chave)}
                  >
                    Vincular a pessoa existente
                  </Button>
                  <Button
                    size="sm"
                    icon={UserPlus}
                    loading={processando === cluster.chave}
                    onClick={() => handleCriarNova(cluster)}
                  >
                    Cadastrar como nova pessoa
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
