'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarClock, HandHeart, HeartHandshake, Link2, Plus, Target } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { frequenciaMinisteriosDaPessoa, type FrequenciaMinisterio } from '@/lib/ministerios';
import { atualizarPessoa, proximoContatoVencido } from '@/lib/pessoas';
import { labelEtapaJornadaPessoa, useTerminologia } from '@/lib/terminologia';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  ETAPAS_JORNADA_PESSOA,
  FREQUENCIAS_ACOMPANHAMENTO_PESSOA,
  ORIGENS_PESSOA,
  SITUACOES_FE,
  type EtapaJornadaPessoa,
  type FrequenciaAcompanhamentoPessoa,
  type Ministerio,
  type PastoralOvelha,
  type Pessoa,
} from '@/types/database';

const ORIGEM_LABEL = Object.fromEntries(ORIGENS_PESSOA.map((o) => [o.valor, o.label]));
const SITUACAO_LABEL = Object.fromEntries(SITUACOES_FE.map((s) => [s.valor, s.label]));

function Fato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text-primary">{valor}</p>
    </div>
  );
}

export function AbaResumo({
  pessoa,
  onAtualizada,
  ovelha,
  ministerios,
}: {
  pessoa: Pessoa;
  onAtualizada: (p: Pessoa) => void;
  ovelha: PastoralOvelha | null;
  ministerios: Ministerio[];
}) {
  const { usuario } = usePainelSession();
  const terminologia = useTerminologia();
  const [proximaVisita, setProximaVisita] = useState(pessoa.proxima_visita ?? '');
  const [frequencia, setFrequencia] = useState<FrequenciaAcompanhamentoPessoa>(
    pessoa.frequencia_acompanhamento ?? 'mensal'
  );
  const [etapa, setEtapa] = useState<EtapaJornadaPessoa>(pessoa.etapa_jornada);
  const [salvando, setSalvando] = useState(false);
  const [frequencias, setFrequencias] = useState<FrequenciaMinisterio[]>([]);

  useEffect(() => {
    frequenciaMinisteriosDaPessoa(pessoa.id).then(setFrequencias).catch(() => setFrequencias([]));
  }, [pessoa.id]);

  const vencido = proximoContatoVencido(pessoa);

  async function handleSalvarAcompanhamento(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const campos = {
        proxima_visita: proximaVisita || null,
        frequencia_acompanhamento: frequencia,
        etapa_jornada: etapa,
      };
      // usuario.id habilita a integração: mudança de etapa vira evento no
      // histórico e aparece no dashboard do coordenador.
      await atualizarPessoa(pessoa.id, campos, usuario?.id);
      onAtualizada({ ...pessoa, ...campos });
      toastSuccess('Acompanhamento atualizado.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      {vencido && (
        <div className="flex items-center gap-2 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
          <AlertTriangle size={16} />
          Contato vencido — a próxima visita marcada já passou.
        </div>
      )}

      {!!pessoa.objetivo_atual && (
        <div className="rounded-md border border-border-green bg-accent-green-bg p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary-dark">
            <Target size={13} /> Objetivo atual
          </p>
          <p className="mt-1 text-sm text-text-primary">{pessoa.objetivo_atual}</p>
        </div>
      )}

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-text-primary">
          <Link2 size={16} /> Vínculos em outros módulos
        </h3>
        <div className="space-y-2">
          {ovelha ? (
            <Link
              href={`/pastoral/${ovelha.id}`}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-bg-page"
            >
              <HeartHandshake size={14} className="text-primary" />
              Em acompanhamento pastoral
            </Link>
          ) : (
            <Link
              href={`/pastoral?nome=${encodeURIComponent(pessoa.nome)}${
                pessoa.telefone ? `&telefone=${encodeURIComponent(pessoa.telefone)}` : ''
              }&pessoaId=${pessoa.id}`}
              className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-text-secondary hover:border-primary hover:text-primary"
            >
              <Plus size={14} />
              Iniciar acompanhamento pastoral
            </Link>
          )}
          {ministerios.length > 0 ? (
            <div className="space-y-1.5 rounded-md border border-border px-3 py-2">
              {ministerios.map((m) => {
                const freq = frequencias.find((f) => f.ministerio.id === m.id);
                return (
                  <div key={m.id} className="flex flex-wrap items-center gap-2">
                    <HandHeart size={14} className="text-primary" />
                    <Link
                      href="/ministerios"
                      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: m.cor }}
                    >
                      {m.nome}
                    </Link>
                    {freq && (
                      <span className="text-xs text-text-secondary">
                        {freq.percentual != null
                          ? `Presença: ${freq.percentual}% (${freq.presentes}/${freq.presencasRegistradas})`
                          : 'Sem presenças registradas'}
                        {freq.ultimoEncontro
                          ? ` · Último encontro: ${new Date(freq.ultimoEncontro).toLocaleDateString('pt-BR')}`
                          : ''}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <Link
              href="/ministerios"
              className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-text-secondary hover:border-primary hover:text-primary"
            >
              <Plus size={14} />
              Não participa de nenhum ministério ainda
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Fato label="Situação na fé" valor={SITUACAO_LABEL[pessoa.situacao_fe] ?? pessoa.situacao_fe} />
        <Fato
          label="Origem"
          valor={
            pessoa.origem === 'outro' && pessoa.origem_descricao
              ? `Outro — ${pessoa.origem_descricao}`
              : ORIGEM_LABEL[pessoa.origem] ?? pessoa.origem
          }
        />
        <Fato label="Último contato" valor={pessoa.ultimo_contato ? new Date(pessoa.ultimo_contato).toLocaleDateString('pt-BR') : '—'} />
        <Fato label="Cadastrado em" valor={new Date(pessoa.criado_em).toLocaleDateString('pt-BR')} />
      </div>

      {!!pessoa.tags?.length && (
        <div>
          <p className="mb-1 text-xs font-semibold text-text-secondary">Tags</p>
          <div className="flex flex-wrap gap-2">
            {pessoa.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-primary-xlight px-2.5 py-1 text-xs font-medium text-primary">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {!!pessoa.observacoes && (
        <div>
          <p className="mb-1 text-xs font-semibold text-text-secondary">Observações</p>
          <p className="rounded-md bg-bg-page p-3 text-sm text-text-primary">{pessoa.observacoes}</p>
        </div>
      )}

      <div className="rounded-lg border border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <CalendarClock size={16} /> Próximo contato
        </h3>
        <form onSubmit={handleSalvarAcompanhamento} className="mt-3 flex flex-wrap items-end gap-3">
          <Input label="Próxima visita" type="date" value={proximaVisita} onChange={(e) => setProximaVisita(e.target.value)} />
          <div className="w-48">
            <Select
              label="Frequência de acompanhamento"
              value={frequencia}
              onChange={(e) => setFrequencia(e.target.value as FrequenciaAcompanhamentoPessoa)}
              options={FREQUENCIAS_ACOMPANHAMENTO_PESSOA.map((f) => ({ value: f.valor, label: f.label }))}
            />
          </div>
          <div className="w-44">
            <Select
              label="Etapa da jornada"
              value={etapa}
              onChange={(e) => setEtapa(e.target.value as EtapaJornadaPessoa)}
              options={ETAPAS_JORNADA_PESSOA.map((et) => ({
                value: et.valor,
                label: labelEtapaJornadaPessoa(et.valor, terminologia),
              }))}
            />
          </div>
          <Button type="submit" size="md" loading={salvando}>
            Salvar
          </Button>
        </form>
      </div>
    </div>
  );
}
