'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { criarOvelha } from '@/lib/pastoral';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  ETAPAS_FORMACAO,
  FREQUENCIAS_ACOMPANHAMENTO,
  type EtapaFormacao,
  type FrequenciaAcompanhamento,
} from '@/types/database';

interface NovaOvelhaModalProps {
  open: boolean;
  onClose: () => void;
  comunidadeId: string;
  pastorId: string;
  onCriada: () => void;
}

export function NovaOvelhaModal({ open, onClose, comunidadeId, pastorId, onCriada }: NovaOvelhaModalProps) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [idade, setIdade] = useState('');
  const [etapa, setEtapa] = useState<EtapaFormacao>('inicio');
  const [frequencia, setFrequencia] = useState<FrequenciaAcompanhamento>('mensal');
  const [objetivo, setObjetivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await criarOvelha({
        comunidade_id: comunidadeId,
        pastor_id: pastorId,
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
        idade: idade ? Number(idade) : undefined,
        etapa_formacao: etapa,
        frequencia_acompanhamento: frequencia,
        objetivo_atual: objetivo.trim() || undefined,
      });
      setNome('');
      setTelefone('');
      setIdade('');
      setObjetivo('');
      setEtapa('inicio');
      setFrequencia('mensal');
      onCriada();
      onClose();
      toastSuccess('Ovelha adicionada!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao adicionar ovelha.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova ovelha">
      <form onSubmit={handleSalvar} className="space-y-3">
        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <div className="flex gap-2">
          <div className="flex-1">
            <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>
          <div className="w-24">
            <Input label="Idade" type="number" value={idade} onChange={(e) => setIdade(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-1/2">
            <Select
              label="Etapa de formação"
              value={etapa}
              onChange={(e) => setEtapa(e.target.value as EtapaFormacao)}
              options={ETAPAS_FORMACAO.map((et) => ({ value: et.valor, label: et.label }))}
            />
          </div>
          <div className="w-1/2">
            <Select
              label="Frequência"
              value={frequencia}
              onChange={(e) => setFrequencia(e.target.value as FrequenciaAcompanhamento)}
              options={FREQUENCIAS_ACOMPANHAMENTO.map((f) => ({ value: f.valor, label: f.label }))}
            />
          </div>
        </div>
        <Textarea
          label="Objetivo do acompanhamento (opcional)"
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          rows={2}
        />
        <Button type="submit" fullWidth loading={salvando}>
          Adicionar
        </Button>
      </form>
    </Modal>
  );
}
