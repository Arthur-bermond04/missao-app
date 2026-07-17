'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { atualizarMembro, PERFIL_LABEL } from '@/lib/usuarios';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Perfil, Usuario } from '@/types/database';

const OPCOES_PERFIL = (Object.entries(PERFIL_LABEL) as [Perfil, string][]).map(([value, label]) => ({ value, label }));

interface EditarMembroModalProps {
  membro: Usuario | null;
  onClose: () => void;
  onSalvo: (id: string, campos: Partial<Usuario>) => void;
}

export function EditarMembroModal({ membro, onClose, onSalvo }: EditarMembroModalProps) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [perfil, setPerfil] = useState<Perfil>('missionario');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!membro) return;
    setNome(membro.nome);
    setTelefone(membro.telefone ?? '');
    setPerfil(membro.perfil);
  }, [membro]);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!membro) return;
    setSalvando(true);
    try {
      const campos = { nome: nome.trim(), telefone: telefone.trim() || null, perfil };
      await atualizarMembro(membro.id, campos);
      onSalvo(membro.id, campos);
      toastSuccess('Membro atualizado.');
      onClose();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={!!membro} onClose={onClose} title="Editar membro">
      <form onSubmit={handleSalvar} className="space-y-3">
        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        <Select
          label="Perfil"
          value={perfil}
          onChange={(e) => setPerfil(e.target.value as Perfil)}
          options={OPCOES_PERFIL}
        />
        <Button type="submit" fullWidth loading={salvando}>
          Salvar
        </Button>
      </form>
    </Modal>
  );
}
