'use client';

import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { criarOvelha } from '@/lib/pastoral';
import { PERFIL_LABEL } from '@/lib/usuarios';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  ETAPAS_FORMACAO,
  FREQUENCIAS_ACOMPANHAMENTO,
  type EtapaFormacao,
  type FrequenciaAcompanhamento,
  type Pessoa,
  type Usuario,
} from '@/types/database';

interface NovaOvelhaModalProps {
  open: boolean;
  onClose: () => void;
  comunidadeId: string;
  pastorId: string;
  usuarios: Usuario[];
  pessoas: Pessoa[];
  prefill?: { nome?: string; telefone?: string; pessoaId?: string } | null;
  onCriada: () => void;
}

export function NovaOvelhaModal({
  open,
  onClose,
  comunidadeId,
  pastorId,
  usuarios,
  pessoas,
  prefill,
  onCriada,
}: NovaOvelhaModalProps) {
  const [usuarioId, setUsuarioId] = useState('');
  const [pessoaId, setPessoaId] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [idade, setIdade] = useState('');
  const [etapa, setEtapa] = useState<EtapaFormacao>('inicio');
  const [frequencia, setFrequencia] = useState<FrequenciaAcompanhamento>('mensal');
  const [objetivo, setObjetivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  // aplica o pré-preenchimento (vindo de contato/retiro/pessoa) ao abrir
  useEffect(() => {
    if (open && prefill) {
      setNome(prefill.nome ?? '');
      setTelefone(prefill.telefone ?? '');
      if (prefill.pessoaId) setPessoaId(prefill.pessoaId);
    }
  }, [open, prefill]);

  function selecionarMembro(id: string) {
    setUsuarioId(id);
    const u = usuarios.find((x) => x.id === id);
    if (u) {
      setNome(u.nome);
      if (u.telefone) setTelefone(u.telefone);
    }
  }

  function selecionarPessoa(id: string) {
    setPessoaId(id);
    const p = pessoas.find((x) => x.id === id);
    if (p) {
      setNome(p.nome);
      if (p.telefone) setTelefone(p.telefone);
      if (p.idade) setIdade(String(p.idade));
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await criarOvelha({
        comunidade_id: comunidadeId,
        pastor_id: pastorId,
        nome: nome.trim(),
        usuario_id: usuarioId || undefined,
        pessoa_id: pessoaId || undefined,
        telefone: telefone.trim() || undefined,
        idade: idade ? Number(idade) : undefined,
        etapa_formacao: etapa,
        frequencia_acompanhamento: frequencia,
        objetivo_atual: objetivo.trim() || undefined,
      });
      setUsuarioId('');
      setPessoaId('');
      setNome('');
      setTelefone('');
      setIdade('');
      setObjetivo('');
      setEtapa('inicio');
      setFrequencia('mensal');
      onCriada();
      onClose();
      toastSuccess('Pessoa adicionada ao acompanhamento!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao adicionar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova pessoa — Acompanhamento Pastoral">
      <p className="mb-4 flex items-start gap-2 rounded-md bg-primary-xlight p-3 text-xs text-primary">
        <Lock size={14} className="mt-0.5 shrink-0" />
        Registre alguém que você acompanha pastoralmente. Os registros são confidenciais e visíveis apenas por você.
      </p>
      <form onSubmit={handleSalvar} className="space-y-3">
        <Combobox
          label="Vincular a pessoa cadastrada (opcional)"
          value={pessoaId}
          onChange={selecionarPessoa}
          placeholder="Buscar em Pessoas..."
          emptyMessage="Nenhuma pessoa encontrada"
          options={pessoas.map((p) => ({ value: p.id, label: p.nome, sublabel: p.telefone ?? undefined }))}
        />
        <Combobox
          label="Vincular a membro do app (opcional)"
          value={usuarioId}
          onChange={selecionarMembro}
          placeholder="Buscar membro..."
          emptyMessage="Nenhum membro encontrado"
          options={usuarios.map((u) => ({ value: u.id, label: u.nome, sublabel: PERFIL_LABEL[u.perfil] }))}
        />
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
