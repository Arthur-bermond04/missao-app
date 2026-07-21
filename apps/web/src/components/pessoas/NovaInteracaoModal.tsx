'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { criarInteracao } from '@/lib/pessoas';
import { toastError, toastSuccess } from '@/lib/toast';
import { TIPOS_INTERACAO, CANAIS_INTERACAO, type CanalInteracao, type TipoInteracao } from '@/types/database';

interface NovaInteracaoModalProps {
  open: boolean;
  onClose: () => void;
  pessoaId: string;
  usuarioId: string;
  onRegistrada: () => void;
}

export function NovaInteracaoModal({ open, onClose, pessoaId, usuarioId, onRegistrada }: NovaInteracaoModalProps) {
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [tipo, setTipo] = useState<TipoInteracao>('contato');
  const [canal, setCanal] = useState<CanalInteracao>('presencial');
  const [descricao, setDescricao] = useState('');
  const [proximoPasso, setProximoPasso] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await criarInteracao({
        pessoa_id: pessoaId,
        usuario_id: usuarioId,
        data,
        tipo,
        canal,
        descricao: descricao.trim(),
        proximo_passo: proximoPasso.trim() || undefined,
      });
      setDescricao('');
      setProximoPasso('');
      setTipo('contato');
      setCanal('presencial');
      onRegistrada();
      onClose();
      toastSuccess('Interação registrada!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao registrar interação.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova interação">
      <form onSubmit={handleSalvar} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          <Select
            label="Canal"
            value={canal}
            onChange={(e) => setCanal(e.target.value as CanalInteracao)}
            options={CANAIS_INTERACAO.map((c) => ({ value: c.valor, label: c.label }))}
          />
        </div>
        <Select
          label="Tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoInteracao)}
          options={TIPOS_INTERACAO.map((t) => ({ value: t.valor, label: t.label }))}
        />
        <Textarea
          label="O que foi conversado/feito"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          required
        />
        <Textarea
          label="Próximo passo (opcional)"
          value={proximoPasso}
          onChange={(e) => setProximoPasso(e.target.value)}
          rows={2}
        />
        <Button type="submit" fullWidth loading={salvando}>
          Registrar interação
        </Button>
      </form>
    </Modal>
  );
}
