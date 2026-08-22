'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, HeartHandshake, MessageSquarePlus } from 'lucide-react';
import { SidePanel } from '@/components/ui/SidePanel';
import { Button } from '@/components/ui/Button';
import { NovaInteracaoModal } from '@/components/pessoas/NovaInteracaoModal';
import { atualizarPessoa, listarInteracoes } from '@/lib/pessoas';
import { toastError, toastSuccess } from '@/lib/toast';
import { labelEtapaJornadaPessoa, useTerminologia } from '@/lib/terminologia';
import { ETAPAS_FUNIL_EVANGELIZACAO, TIPOS_INTERACAO, type Pessoa, type PessoaInteracao } from '@/types/database';

const TIPO_LABEL = Object.fromEntries(TIPOS_INTERACAO.map((t) => [t.valor, t.label]));

export function PainelContato({
  contato,
  usuarioId,
  onClose,
  onAtualizado,
}: {
  contato: Pessoa | null;
  usuarioId: string;
  onClose: () => void;
  onAtualizado: (p: Pessoa) => void;
}) {
  const terminologia = useTerminologia();
  const [interacoes, setInteracoes] = useState<PessoaInteracao[]>([]);
  const [modalInteracao, setModalInteracao] = useState(false);
  const [avancando, setAvancando] = useState(false);

  useEffect(() => {
    if (contato) {
      listarInteracoes(contato.id).then(setInteracoes);
    } else {
      setInteracoes([]);
    }
  }, [contato?.id]);

  if (!contato) return null;

  const indiceAtual = ETAPAS_FUNIL_EVANGELIZACAO.indexOf(contato.etapa_jornada);
  const proximaEtapa = indiceAtual >= 0 ? ETAPAS_FUNIL_EVANGELIZACAO[indiceAtual + 1] : undefined;
  const labelProximaEtapa = proximaEtapa ? labelEtapaJornadaPessoa(proximaEtapa, terminologia) : null;

  async function avancarEtapa() {
    if (!contato || !proximaEtapa) return;
    setAvancando(true);
    try {
      await atualizarPessoa(contato.id, { etapa_jornada: proximaEtapa }, usuarioId);
      onAtualizado({ ...contato, etapa_jornada: proximaEtapa });
      toastSuccess(`Avançou para "${labelProximaEtapa}"`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao avançar etapa.');
    } finally {
      setAvancando(false);
    }
  }

  return (
    <SidePanel open={!!contato} onClose={onClose} title={contato.nome} description="Detalhe do contato">
      <NovaInteracaoModal
        open={modalInteracao}
        onClose={() => setModalInteracao(false)}
        pessoaId={contato.id}
        usuarioId={usuarioId}
        onRegistrada={() => listarInteracoes(contato.id).then(setInteracoes)}
      />

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-text-secondary">Telefone</p>
            <p className="font-medium text-text-primary">{contato.telefone ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Idade</p>
            <p className="font-medium text-text-primary">{contato.idade ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Local da abordagem</p>
            <p className="font-medium text-text-primary">{contato.local_primeiro_contato ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Data</p>
            <p className="font-medium text-text-primary">
              {new Date(contato.data_primeiro_contato).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {!!contato.tags?.length && (
          <div className="flex flex-wrap gap-1">
            {contato.tags.map((t) => (
              <span key={t} className="rounded-full bg-bg-page px-2 py-0.5 text-xs text-text-secondary">
                {t}
              </span>
            ))}
          </div>
        )}

        {!!contato.observacoes && <p className="rounded-md bg-bg-page p-3 text-sm text-text-primary">{contato.observacoes}</p>}

        <div className="flex flex-wrap gap-2">
          {proximaEtapa && (
            <Button size="sm" variant="secondary" onClick={avancarEtapa} loading={avancando}>
              Avançar para &ldquo;{labelProximaEtapa}&rdquo;
            </Button>
          )}
          <Button size="sm" icon={MessageSquarePlus} onClick={() => setModalInteracao(true)}>
            Registrar interação
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Link
            href={`/pessoas/${contato.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver cadastro completo <ArrowRight size={14} />
          </Link>
          <Link
            href={`/pastoral?nome=${encodeURIComponent(contato.nome)}${
              contato.telefone ? `&telefone=${encodeURIComponent(contato.telefone)}` : ''
            }&pessoaId=${encodeURIComponent(contato.id)}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <HeartHandshake size={14} /> Iniciar acompanhamento pastoral
          </Link>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">Histórico de interações</p>
          {interacoes.length === 0 ? (
            <p className="text-sm text-text-secondary">Nenhuma interação registrada ainda.</p>
          ) : (
            <div className="space-y-2">
              {interacoes.map((i) => (
                <div key={i.id} className="rounded-md border border-border p-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-primary">{new Date(i.data).toLocaleDateString('pt-BR')}</span>
                    <span className="text-xs text-text-secondary">{TIPO_LABEL[i.tipo] ?? i.tipo}</span>
                  </div>
                  <p className="mt-1 text-text-primary">{i.descricao}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SidePanel>
  );
}
