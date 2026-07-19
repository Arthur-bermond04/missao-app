'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { registrarPresencaOvelha } from '@/lib/pastoral';
import { toastError, toastSuccess } from '@/lib/toast';
import type { TipoEventoPastoral } from '@/types/database';

const TIPOS_EVENTO: { valor: TipoEventoPastoral; label: string }[] = [
  { valor: 'missa', label: 'Missa' },
  { valor: 'celula', label: 'Célula' },
  { valor: 'retiro', label: 'Retiro' },
  { valor: 'ministerio', label: 'Ministério' },
  { valor: 'formacao', label: 'Formação' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  ovelhaId: string;
  onRegistrado: () => void;
}

export function RegistrarPresencaModal({ open, onClose, ovelhaId, onRegistrado }: Props) {
  const [tipoEvento, setTipoEvento] = useState<TipoEventoPastoral>('missa');
  const [nomeEvento, setNomeEvento] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [presente, setPresente] = useState(true);
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await registrarPresencaOvelha({
        ovelha_id: ovelhaId,
        tipo_evento: tipoEvento,
        nome_evento: nomeEvento.trim() || undefined,
        data,
        presente,
      });
      setNomeEvento('');
      onRegistrado();
      onClose();
      toastSuccess('Presença registrada!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao registrar presença.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar presença em evento">
      <form onSubmit={handleSalvar} className="space-y-3">
        <Select
          label="Tipo de evento"
          value={tipoEvento}
          onChange={(e) => setTipoEvento(e.target.value as TipoEventoPastoral)}
          options={TIPOS_EVENTO.map((t) => ({ value: t.valor, label: t.label }))}
        />
        <Input label="Nome do evento (opcional)" value={nomeEvento} onChange={(e) => setNomeEvento(e.target.value)} />
        <Input label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-secondary">Compareceu?</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPresente(true)}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                presente ? 'bg-accent-light text-accent' : 'bg-bg-page text-text-secondary'
              }`}
            >
              Presente
            </button>
            <button
              type="button"
              onClick={() => setPresente(false)}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                !presente ? 'bg-danger-light text-danger' : 'bg-bg-page text-text-secondary'
              }`}
            >
              Ausente
            </button>
          </div>
        </div>
        <Button type="submit" fullWidth loading={salvando}>
          Salvar
        </Button>
      </form>
    </Modal>
  );
}
