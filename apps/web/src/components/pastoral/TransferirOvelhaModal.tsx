'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Combobox } from '@/components/ui/Combobox';
import { Button } from '@/components/ui/Button';
import { transferirOvelha } from '@/lib/pastoral';
import { PERFIL_LABEL } from '@/lib/usuarios';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Usuario } from '@/types/database';

export function TransferirOvelhaModal({
  open,
  onClose,
  ovelhaId,
  ovelhaNome,
  pastorAtualId,
  usuarios,
  onTransferido,
}: {
  open: boolean;
  onClose: () => void;
  ovelhaId: string;
  ovelhaNome: string;
  pastorAtualId: string;
  usuarios: Usuario[];
  onTransferido: () => void;
}) {
  const [novoPastorId, setNovoPastorId] = useState('');
  const [salvando, setSalvando] = useState(false);

  const opcoes = usuarios.filter((u) => u.id !== pastorAtualId);

  async function handleTransferir() {
    if (!novoPastorId) return;
    setSalvando(true);
    try {
      await transferirOvelha(ovelhaId, novoPastorId);
      const nome = usuarios.find((u) => u.id === novoPastorId)?.nome ?? '';
      onTransferido();
      onClose();
      toastSuccess(`Acompanhamento transferido para ${nome}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao transferir.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Transferir acompanhamento" description={`De ${ovelhaNome}`}>
      <Combobox
        label="Novo responsável"
        value={novoPastorId}
        onChange={setNovoPastorId}
        placeholder="Buscar membro..."
        emptyMessage="Nenhum membro encontrado"
        options={opcoes.map((u) => ({ value: u.id, label: u.nome, sublabel: PERFIL_LABEL[u.perfil] }))}
      />
      <p className="mt-2 text-xs text-text-secondary">O histórico de encontros e presenças é mantido.</p>
      <Button fullWidth className="mt-3" onClick={handleTransferir} loading={salvando} disabled={!novoPastorId}>
        Transferir
      </Button>
    </Modal>
  );
}
