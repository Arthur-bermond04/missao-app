'use client';

import { useState } from 'react';
import { Tent, Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { vincularRetiro } from '@/lib/pessoas';
import { toastError, toastSuccess } from '@/lib/toast';
import type { PessoaRetiro } from '@/types/database';

export function AbaHistorico({
  pessoaId,
  retiros,
  onRefresh,
}: {
  pessoaId: string;
  retiros: PessoaRetiro[];
  onRefresh: () => void;
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nomeRetiro, setNomeRetiro] = useState('');
  const [dataRetiro, setDataRetiro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await vincularRetiro({ pessoa_id: pessoaId, nome_retiro: nomeRetiro.trim(), data_retiro: dataRetiro });
      setNomeRetiro('');
      setDataRetiro('');
      setMostrarForm(false);
      onRefresh();
      toastSuccess('Retiro vinculado ao histórico.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao vincular retiro.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary">Retiros e formações</h3>
        <Button size="sm" variant="secondary" icon={Plus} onClick={() => setMostrarForm((v) => !v)}>
          Adicionar ao histórico
        </Button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSalvar} className="mt-3 flex flex-wrap items-end gap-3 rounded-md border border-border p-3">
          <div className="min-w-[180px] flex-1">
            <Input label="Nome do retiro" value={nomeRetiro} onChange={(e) => setNomeRetiro(e.target.value)} required />
          </div>
          <Input label="Data" type="date" value={dataRetiro} onChange={(e) => setDataRetiro(e.target.value)} required />
          <Button type="submit" size="md" loading={salvando}>
            Salvar
          </Button>
        </form>
      )}

      {retiros.length === 0 ? (
        <EmptyState icon={Tent} title="Nenhum retiro registrado" description="Vincule os retiros que esta pessoa já participou." />
      ) : (
        <div className="mt-3 space-y-2">
          {retiros.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-text-primary">{r.nome_retiro}</p>
                <p className="text-xs text-text-secondary">{new Date(r.data_retiro).toLocaleDateString('pt-BR')}</p>
              </div>
              <Badge variant={r.participou ? 'realizado' : 'pendente'}>{r.participou ? 'Participou' : 'Não participou'}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
