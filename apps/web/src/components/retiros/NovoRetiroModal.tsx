'use client';

import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface NovoRetiroModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  salvando?: boolean;
}

export function NovoRetiroModal({ open, onClose, onSubmit, salvando }: NovoRetiroModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Criar retiro" description="Preencha os dados do novo retiro">
      <form onSubmit={onSubmit} className="space-y-3">
        <Input name="nome" label="Nome do retiro" placeholder="Ex: Retiro de Emaús" required />
        <div className="flex gap-2">
          <div className="w-1/2">
            <Input name="data_inicio" type="date" label="Data de início" required />
          </div>
          <div className="w-1/2">
            <Input name="data_fim" type="date" label="Data de término" required />
          </div>
        </div>
        <Input name="local" label="Local" placeholder="Ex: Casa de retiros São José" />
        <div className="flex gap-2">
          <div className="w-1/2">
            <Input name="vagas" type="number" label="Vagas" placeholder="Ex: 50" />
          </div>
          <div className="w-1/2">
            <Input name="valor" type="number" step="0.01" label="Valor (R$)" placeholder="Ex: 150.00" />
          </div>
        </div>
        <Button type="submit" fullWidth loading={salvando}>
          Criar retiro
        </Button>
      </form>
    </Modal>
  );
}
