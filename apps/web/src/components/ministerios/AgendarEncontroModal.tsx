'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { agendarEncontro } from '@/lib/ministerios';
import { toastError, toastSuccess } from '@/lib/toast';

export function AgendarEncontroModal({
  open,
  onClose,
  ministerioId,
  onAgendado,
}: {
  open: boolean;
  onClose: () => void;
  ministerioId: string;
  onAgendado: () => void;
}) {
  const [titulo, setTitulo] = useState('Reunião');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [local, setLocal] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setSalvando(true);
    try {
      await agendarEncontro({ ministerio_id: ministerioId, titulo: titulo.trim() || 'Reunião', data, horario: horario || undefined, local: local.trim() || undefined });
      setTitulo('Reunião');
      setData('');
      setHorario('');
      setLocal('');
      onAgendado();
      onClose();
      toastSuccess('Próximo encontro agendado!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao agendar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Agendar próximo encontro">
      <form onSubmit={handleSalvar} className="space-y-3">
        <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <div className="flex gap-2">
          <div className="flex-1">
            <Input label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
          <div className="w-32">
            <Input label="Horário" type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
          </div>
        </div>
        <Input label="Local (opcional)" value={local} onChange={(e) => setLocal(e.target.value)} />
        <Button type="submit" fullWidth loading={salvando}>
          Agendar
        </Button>
      </form>
    </Modal>
  );
}
