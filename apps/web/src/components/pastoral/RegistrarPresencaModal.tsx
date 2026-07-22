'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { registrarPresencaOvelha } from '@/lib/pastoral';
import { listarTiposEvento } from '@/lib/tiposEvento';
import { toastError, toastSuccess } from '@/lib/toast';
import type { TipoEventoComunidade } from '@/types/database';

const OUTRO = '__outro__';

interface Props {
  open: boolean;
  onClose: () => void;
  ovelhaId: string;
  comunidadeId: string;
  onRegistrado: () => void;
}

export function RegistrarPresencaModal({ open, onClose, ovelhaId, comunidadeId, onRegistrado }: Props) {
  const [tiposEvento, setTiposEvento] = useState<TipoEventoComunidade[]>([]);
  const [tipoEvento, setTipoEvento] = useState('');
  const [nomeEventoCustom, setNomeEventoCustom] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [presente, setPresente] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open || !comunidadeId) return;
    listarTiposEvento(comunidadeId).then((lista) => {
      setTiposEvento(lista);
      setTipoEvento((atual) => atual || lista[0]?.nome || OUTRO);
    });
  }, [open, comunidadeId]);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (tipoEvento === OUTRO && !nomeEventoCustom.trim()) {
      toastError('Conte qual foi o evento.');
      return;
    }
    setSalvando(true);
    try {
      await registrarPresencaOvelha({
        ovelha_id: ovelhaId,
        tipo_evento: tipoEvento === OUTRO ? 'outro' : tipoEvento,
        nome_evento: tipoEvento === OUTRO ? nomeEventoCustom.trim() : undefined,
        data,
        presente,
      });
      setNomeEventoCustom('');
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
          onChange={(e) => setTipoEvento(e.target.value)}
          options={[...tiposEvento.map((t) => ({ value: t.nome, label: t.nome })), { value: OUTRO, label: 'Outro' }]}
        />
        {tipoEvento === OUTRO && (
          <Input
            label="Qual evento?"
            value={nomeEventoCustom}
            onChange={(e) => setNomeEventoCustom(e.target.value)}
            placeholder="Ex: Grupo de oração, Encontro de jovens..."
            required
          />
        )}
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
