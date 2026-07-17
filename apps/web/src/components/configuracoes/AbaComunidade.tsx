'use client';

import { useState } from 'react';
import { Camera } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { atualizarComunidade } from '@/lib/comunidades';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Comunidade } from '@/types/database';

const OPCOES_TIPO = [
  { value: 'paróquia', label: 'Paróquia' },
  { value: 'comunidade', label: 'Comunidade' },
  { value: 'movimento', label: 'Movimento' },
];

export function AbaComunidade({ comunidade, onAtualizada }: { comunidade: Comunidade; onAtualizada: (c: Comunidade) => void }) {
  const [nome, setNome] = useState(comunidade.nome);
  const [tipo, setTipo] = useState(comunidade.tipo);
  const [telefone, setTelefone] = useState(comunidade.telefone ?? '');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const campos = { nome: nome.trim(), tipo, telefone: telefone.trim() || null };
      await atualizarComunidade(comunidade.id, campos);
      onAtualizada({ ...comunidade, ...campos });
      toastSuccess('Dados da comunidade atualizados.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSalvar} className="max-w-md space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-page text-text-secondary">
          <Camera size={22} />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">Logotipo</p>
          <p className="text-xs text-text-secondary">Upload de imagem em breve.</p>
        </div>
      </div>

      <Input label="Nome da comunidade" value={nome} onChange={(e) => setNome(e.target.value)} required />
      <Select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} options={OPCOES_TIPO} />
      <Input label="Telefone de contato" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />

      <Button type="submit" loading={salvando}>
        Salvar alterações
      </Button>
    </form>
  );
}
