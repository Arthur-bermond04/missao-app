'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarClock, HandHeart, HeartHandshake, Link2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { atualizarPessoa, proximoContatoVencido } from '@/lib/pessoas';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  FREQUENCIAS_ACOMPANHAMENTO_PESSOA,
  ORIGENS_PESSOA,
  SITUACOES_FE,
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
  const [proximaVisita, setProximaVisita] = useState(pessoa.proxima_visita ?? '');
  const [frequencia, setFrequencia] = useState<FrequenciaAcompanhamentoPessoa>(
    pessoa.frequencia_acompanhamento ?? 'mensal'
  );
  const [salvando, setSalvando] = useState(false);

  const vencido = proximoContatoVencido(pessoa);

  async function handleSalvarAcompanhamento(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const campos = { proxima_visita: proximaVisita || null, frequencia_acompanhamento: frequencia };
      await atualizarPessoa(pessoa.id, campos);
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
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2">
              <HandHeart size={14} className="text-primary" />
              {ministerios.map((m) => (
                <Link
                  key={m.id}
                  href="/ministerios"
                  className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: m.cor }}
                >
                  {m.nome}
                </Link>
              ))}
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
        <Fato label="Origem" valor={ORIGEM_LABEL[pessoa.origem] ?? pessoa.origem} />
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
          <Button type="submit" size="md" loading={salvando}>
            Salvar
          </Button>
        </form>
      </div>
    </div>
  );
}
