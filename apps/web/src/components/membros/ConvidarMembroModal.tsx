'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { toastError, toastSuccess } from '@/lib/toast';
import { PERFIL_LABEL } from '@/lib/usuarios';
import type { Perfil } from '@/types/database';

const OPCOES_PERFIL = (Object.entries(PERFIL_LABEL) as [Perfil, string][]).map(([value, label]) => ({ value, label }));

interface ConvidarMembroModalProps {
  open: boolean;
  onClose: () => void;
  onMembroCriado: () => void;
}

export function ConvidarMembroModal({ open, onClose, onMembroCriado }: ConvidarMembroModalProps) {
  const { session } = usePainelSession();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState<Perfil>('missionario');
  const [enviando, setEnviando] = useState(false);
  const [senhaTemporaria, setSenhaTemporaria] = useState('');

  function fecharTudo() {
    setNome('');
    setEmail('');
    setPerfil('missionario');
    setSenhaTemporaria('');
    onClose();
  }

  async function handleConvidar(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.access_token) return;
    setEnviando(true);
    try {
      const res = await fetch('/api/membros/convidar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ nome, email, perfil }),
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.erro ?? 'Erro ao convidar membro.');
      setSenhaTemporaria(dados.senhaTemporaria);
      onMembroCriado();
      toastSuccess('Membro criado com sucesso!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao convidar membro.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal open={open} onClose={fecharTudo} title="Convidar membro">
      {senhaTemporaria ? (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            A conta foi criada. Compartilhe a senha temporária abaixo com <strong>{nome}</strong> (ex: pelo WhatsApp) —
            ela só aparece essa vez.
          </p>
          <div className="flex items-center justify-between rounded-md bg-bg-page px-3 py-2">
            <code className="text-sm font-semibold text-text-primary">{senhaTemporaria}</code>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => navigator.clipboard.writeText(senhaTemporaria)}
            >
              Copiar senha
            </Button>
          </div>
          <Button type="button" fullWidth onClick={fecharTudo}>
            Concluir
          </Button>
        </div>
      ) : (
        <form onSubmit={handleConvidar} className="space-y-3">
          <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Select
            label="Perfil"
            value={perfil}
            onChange={(e) => setPerfil(e.target.value as Perfil)}
            options={OPCOES_PERFIL}
          />
          <Button type="submit" fullWidth loading={enviando}>
            Criar acesso
          </Button>
        </form>
      )}
    </Modal>
  );
}
