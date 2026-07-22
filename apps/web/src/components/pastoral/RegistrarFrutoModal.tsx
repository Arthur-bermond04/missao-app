'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { registrarFruto } from '@/lib/pastoral';
import { toastError, toastSuccess } from '@/lib/toast';
import { TIPOS_FRUTO_PASTORAL, type TipoFrutoPastoral } from '@/types/database';

export function RegistrarFrutoModal({
  open,
  onClose,
  ovelhaId,
  pastorId,
  onRegistrado,
}: {
  open: boolean;
  onClose: () => void;
  ovelhaId: string;
  pastorId: string;
  onRegistrado: () => void;
}) {
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [tipo, setTipo] = useState<TipoFrutoPastoral>('conquista');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  function limpar() {
    setData(new Date().toISOString().slice(0, 10));
    setTipo('conquista');
    setTitulo('');
    setDescricao('');
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      toastError('Descreva o fruto em uma frase.');
      return;
    }
    setSalvando(true);
    try {
      await registrarFruto({
        ovelha_id: ovelhaId,
        pastor_id: pastorId,
        data,
        tipo,
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
      });
      limpar();
      onRegistrado();
      onClose();
      toastSuccess('Fruto registrado!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao registrar fruto.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar fruto">
      <form onSubmit={handleSalvar} className="space-y-3">
        <Input label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        <div>
          <p className="mb-1 text-xs font-semibold text-text-secondary">Tipo</p>
          <div className="flex flex-wrap gap-2">
            {TIPOS_FRUTO_PASTORAL.map((t) => (
              <button
                type="button"
                key={t.valor}
                onClick={() => setTipo(t.valor)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  tipo === t.valor
                    ? 'border-primary bg-primary-xlight text-primary'
                    : 'border-border text-text-secondary hover:bg-bg-page'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex: Começou a frequentar a missa semanalmente"
          required
        />
        <Textarea label="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
        <Button type="submit" fullWidth loading={salvando}>
          Salvar
        </Button>
      </form>
    </Modal>
  );
}
