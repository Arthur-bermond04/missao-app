'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { criarMinisterio } from '@/lib/ministerios';
import { toastError, toastSuccess } from '@/lib/toast';
import { CORES_MINISTERIO, TIPOS_MINISTERIO, type TipoMinisterio, type Usuario } from '@/types/database';

interface NovoMinisterioModalProps {
  open: boolean;
  onClose: () => void;
  comunidadeId: string;
  usuarios: Usuario[];
  onCriado: () => void;
}

export function NovoMinisterioModal({ open, onClose, comunidadeId, usuarios, onCriado }: NovoMinisterioModalProps) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoMinisterio>('servico');
  const [descricao, setDescricao] = useState('');
  const [coordenadorId, setCoordenadorId] = useState('');
  const [cor, setCor] = useState<string>(CORES_MINISTERIO[0]);
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await criarMinisterio({
        comunidade_id: comunidadeId,
        nome: nome.trim(),
        tipo,
        descricao: descricao.trim() || undefined,
        coordenador_id: coordenadorId || undefined,
        cor,
      });
      setNome('');
      setDescricao('');
      setCoordenadorId('');
      setCor(CORES_MINISTERIO[0]);
      setTipo('servico');
      onCriado();
      onClose();
      toastSuccess('Ministério criado!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao criar ministério.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo ministério">
      <form onSubmit={handleSalvar} className="space-y-3">
        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <Select
          label="Tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoMinisterio)}
          options={TIPOS_MINISTERIO.map((t) => ({ value: t.valor, label: t.label }))}
        />
        <Textarea label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
        <Select
          label="Coordenador"
          value={coordenadorId}
          onChange={(e) => setCoordenadorId(e.target.value)}
          options={[{ value: '', label: 'Nenhum' }, ...usuarios.map((u) => ({ value: u.id, label: u.nome }))]}
        />
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-secondary">Cor de identificação</label>
          <div className="flex flex-wrap gap-2">
            {CORES_MINISTERIO.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                className={`h-8 w-8 rounded-full border-2 ${cor === c ? 'border-text-primary' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
        </div>
        <Button type="submit" fullWidth loading={salvando}>
          Criar
        </Button>
      </form>
    </Modal>
  );
}
