'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { atualizarMembro, candidatosASupervisor, PERFIL_LABEL } from '@/lib/usuarios';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Perfil, Usuario } from '@/types/database';

const OPCOES_PERFIL = (Object.entries(PERFIL_LABEL) as [Perfil, string][]).map(([value, label]) => ({ value, label }));

interface EditarMembroModalProps {
  membro: Usuario | null;
  /** Demais membros da comunidade — usados para montar as opções de supervisor. */
  membros?: Usuario[];
  onClose: () => void;
  onSalvo: (id: string, campos: Partial<Usuario>) => void;
}

export function EditarMembroModal({ membro, membros = [], onClose, onSalvo }: EditarMembroModalProps) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [perfil, setPerfil] = useState<Perfil>('missionario');
  const [supervisorId, setSupervisorId] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!membro) return;
    setNome(membro.nome);
    setTelefone(membro.telefone ?? '');
    setPerfil(membro.perfil);
    setSupervisorId(membro.supervisor_id ?? '');
  }, [membro]);

  // Quem já está abaixo deste membro fica de fora da lista: escolher um deles
  // criaria ciclo e o trigger do banco recusaria o update.
  const opcoesSupervisor = useMemo(() => {
    if (!membro) return [{ value: '', label: 'Sem supervisor' }];
    return [
      { value: '', label: 'Sem supervisor' },
      ...candidatosASupervisor(membros, membro.id).map((m) => ({
        value: m.id,
        label: `${m.nome} (${PERFIL_LABEL[m.perfil]})`,
      })),
    ];
  }, [membros, membro]);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!membro) return;
    setSalvando(true);
    try {
      const campos = {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        perfil,
        supervisor_id: supervisorId || null,
      };
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
        <div>
          <Select
            label="Supervisor"
            value={supervisorId}
            onChange={(e) => setSupervisorId(e.target.value)}
            options={opcoesSupervisor}
          />
          <p className="mt-1 text-xs text-text-secondary">
            O supervisor enxerga as pessoas e as ovelhas de quem está abaixo dele — as métricas do acompanhamento, não o
            conteúdo dos encontros.
          </p>
        </div>
        <Button type="submit" fullWidth loading={salvando}>
          Salvar
        </Button>
      </form>
    </Modal>
  );
}
