'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, HeartHandshake, IdCard, MessageSquarePlus } from 'lucide-react';
import { SidePanel } from '@/components/ui/SidePanel';
import { Button } from '@/components/ui/Button';
import { NovaInteracaoModal } from '@/components/pessoas/NovaInteracaoModal';
import { supabase } from '@/lib/supabase';
import { listarInteracoes } from '@/lib/pessoas';
import { toastError, toastSuccess } from '@/lib/toast';
import { labelEtapaJornada, useTerminologia } from '@/lib/terminologia';
import { ETAPAS_FUNIL, TIPOS_INTERACAO, type Contato, type EtapaJornada, type PessoaInteracao } from '@/types/database';

const TIPO_LABEL = Object.fromEntries(TIPOS_INTERACAO.map((t) => [t.valor, t.label]));

export function PainelContato({
  contato,
  usuarioId,
  onClose,
  onCadastrarEmPessoas,
  onAtualizado,
}: {
  contato: Contato | null;
  usuarioId: string;
  onClose: () => void;
  onCadastrarEmPessoas: (c: Contato) => Promise<void>;
  onAtualizado: (c: Contato) => void;
}) {
  const terminologia = useTerminologia();
  const [interacoes, setInteracoes] = useState<PessoaInteracao[]>([]);
  const [modalInteracao, setModalInteracao] = useState(false);
  const [avancando, setAvancando] = useState(false);

  useEffect(() => {
    if (contato?.pessoa_id) {
      listarInteracoes(contato.pessoa_id).then(setInteracoes);
    } else {
      setInteracoes([]);
    }
  }, [contato?.pessoa_id]);

  if (!contato) return null;

  const indiceAtual = ETAPAS_FUNIL.findIndex((e) => e.valor === contato.etapa_jornada);
  const proximaEtapa = ETAPAS_FUNIL[indiceAtual + 1];
  // ETAPAS_FUNIL guarda o rótulo padrão fixo — o exibido precisa passar pela
  // terminologia da comunidade, senão "célula" nunca vira o termo escolhido.
  const labelProximaEtapa = proximaEtapa ? labelEtapaJornada(proximaEtapa.valor, terminologia) : null;

  async function avancarEtapa() {
    if (!contato || !proximaEtapa) return;
    setAvancando(true);
    try {
      const { error } = await supabase
        .from('contatos')
        .update({ etapa_jornada: proximaEtapa.valor as EtapaJornada })
        .eq('id', contato.id);
      if (error) throw error;
      onAtualizado({ ...contato, etapa_jornada: proximaEtapa.valor as EtapaJornada });
      toastSuccess(`Avançou para "${labelProximaEtapa}"`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao avançar etapa.');
    } finally {
      setAvancando(false);
    }
  }

  return (
    <SidePanel open={!!contato} onClose={onClose} title={contato.nome} description="Detalhe do contato">
      {contato.pessoa_id && (
        <NovaInteracaoModal
          open={modalInteracao}
          onClose={() => setModalInteracao(false)}
          pessoaId={contato.pessoa_id}
          usuarioId={usuarioId}
          onRegistrada={() => listarInteracoes(contato.pessoa_id!).then(setInteracoes)}
        />
      )}

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
            <p className="font-medium text-text-primary">{contato.local_abordagem ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Data</p>
            <p className="font-medium text-text-primary">{new Date(contato.data_abordagem).toLocaleDateString('pt-BR')}</p>
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
          {contato.pessoa_id ? (
            <Button size="sm" icon={MessageSquarePlus} onClick={() => setModalInteracao(true)}>
              Registrar interação
            </Button>
          ) : (
            <Button size="sm" icon={IdCard} onClick={() => onCadastrarEmPessoas(contato)}>
              Cadastrar em Pessoas
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {contato.pessoa_id && (
            <Link
              href={`/pessoas/${contato.pessoa_id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver cadastro completo <ArrowRight size={14} />
            </Link>
          )}
          <Link
            href={`/pastoral?nome=${encodeURIComponent(contato.nome)}${
              contato.telefone ? `&telefone=${encodeURIComponent(contato.telefone)}` : ''
            }${contato.pessoa_id ? `&pessoaId=${encodeURIComponent(contato.pessoa_id)}` : ''}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <HeartHandshake size={14} /> Iniciar acompanhamento pastoral
          </Link>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">Histórico de interações</p>
          {!contato.pessoa_id ? (
            <p className="text-sm text-text-secondary">Cadastre em Pessoas para começar a registrar interações.</p>
          ) : interacoes.length === 0 ? (
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
