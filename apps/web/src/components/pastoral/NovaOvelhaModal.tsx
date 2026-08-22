'use client';

import { useEffect, useState } from 'react';
import { Lock, UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { criarOvelha } from '@/lib/pastoral';
import { criarPessoa } from '@/lib/pessoas';
import { PERFIL_LABEL } from '@/lib/usuarios';
import { toastError, toastSuccess } from '@/lib/toast';
import { labelEtapaFormacao, useTerminologia } from '@/lib/terminologia';
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
  usuarioId: string;
  pastorId: string;
  usuarios: Usuario[];
  pessoas: Pessoa[];
  prefill?: { nome?: string; telefone?: string; pessoaId?: string } | null;
  onCriada: () => void;
}

// pessoa_id é obrigatório desde a migration 20260822020000 — não dá mais pra
// criar um registro de acompanhamento digitando nome/telefone soltos (era a
// duplicação que o cadastro central de Pessoas deveria evitar). Quem ainda
// não tem cadastro é resolvido aqui mesmo, com o mesmo padrão do check-in de
// Grupos: busca em Pessoas ou "+ Nova pessoa" cria e já seleciona.
export function NovaOvelhaModal({
  open,
  onClose,
  comunidadeId,
  usuarioId,
  pastorId,
  usuarios,
  pessoas,
  prefill,
  onCriada,
}: NovaOvelhaModalProps) {
  const terminologia = useTerminologia();
  const [membroId, setMembroId] = useState('');
  const [pessoaId, setPessoaId] = useState('');
  const [pessoasDisponiveis, setPessoasDisponiveis] = useState<Pessoa[]>(pessoas);
  const [novaPessoaAberta, setNovaPessoaAberta] = useState(false);
  const [nomeNovaPessoa, setNomeNovaPessoa] = useState('');
  const [telefoneNovaPessoa, setTelefoneNovaPessoa] = useState('');
  const [criandoPessoa, setCriandoPessoa] = useState(false);
  const [etapa, setEtapa] = useState<EtapaFormacao>('inicio');
  const [frequencia, setFrequencia] = useState<FrequenciaAcompanhamento>('mensal');
  const [objetivo, setObjetivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPessoasDisponiveis(pessoas);
    setMembroId('');
    setPessoaId(prefill?.pessoaId ?? '');
    setNovaPessoaAberta(false);
    setNomeNovaPessoa(prefill?.nome ?? '');
    setTelefoneNovaPessoa(prefill?.telefone ?? '');
    setEtapa('inicio');
    setFrequencia('mensal');
    setObjetivo('');
  }, [open, prefill, pessoas]);

  async function handleCriarPessoa() {
    const nome = nomeNovaPessoa.trim();
    if (!nome) {
      toastError('Digite o nome da pessoa.');
      return;
    }
    setCriandoPessoa(true);
    try {
      const pessoa = await criarPessoa({
        comunidade_id: comunidadeId,
        cadastrado_por: usuarioId,
        nome,
        telefone: telefoneNovaPessoa.trim() || undefined,
        responsavel_id: pastorId,
      });
      setPessoasDisponiveis((atual) => [...atual, pessoa]);
      setPessoaId(pessoa.id);
      setNovaPessoaAberta(false);
      toastSuccess(`${pessoa.nome} cadastrado(a).`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao cadastrar pessoa.');
    } finally {
      setCriandoPessoa(false);
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!pessoaId) {
      toastError('Selecione ou cadastre a pessoa antes de continuar.');
      return;
    }
    setSalvando(true);
    try {
      await criarOvelha({
        comunidade_id: comunidadeId,
        pastor_id: pastorId,
        pessoa_id: pessoaId,
        usuario_id: membroId || undefined,
        etapa_formacao: etapa,
        frequencia_acompanhamento: frequencia,
        objetivo_atual: objetivo.trim() || undefined,
      });
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
    <Modal open={open} onClose={onClose} title={`Nova ${terminologia.nome_ovelha.toLowerCase()} — Acompanhamento Pastoral`}>
      <p className="mb-4 flex items-start gap-2 rounded-md bg-primary-xlight p-3 text-xs text-primary">
        <Lock size={14} className="mt-0.5 shrink-0" />
        Registre alguém que você acompanha pastoralmente. Os registros são confidenciais e visíveis apenas por você.
      </p>
      <form onSubmit={handleSalvar} className="space-y-3">
        <Combobox
          label="Pessoa"
          value={pessoaId}
          onChange={setPessoaId}
          placeholder="Buscar em Pessoas..."
          emptyMessage="Ninguém encontrado — cadastre abaixo"
          options={pessoasDisponiveis.map((p) => ({ value: p.id, label: p.nome, sublabel: p.telefone ?? undefined }))}
        />

        {novaPessoaAberta ? (
          <div className="rounded-md border border-border p-3">
            <p className="mb-2 text-xs font-semibold text-text-secondary">Nova pessoa</p>
            <div className="flex flex-wrap gap-2">
              <div className="min-w-[160px] flex-1">
                <Input placeholder="Nome" value={nomeNovaPessoa} onChange={(e) => setNomeNovaPessoa(e.target.value)} />
              </div>
              <div className="min-w-[140px] flex-1">
                <Input
                  placeholder="Telefone (opcional)"
                  value={telefoneNovaPessoa}
                  onChange={(e) => setTelefoneNovaPessoa(e.target.value)}
                />
              </div>
              <Button type="button" size="md" loading={criandoPessoa} onClick={handleCriarPessoa}>
                Cadastrar
              </Button>
              <Button type="button" variant="ghost" size="md" onClick={() => setNovaPessoaAberta(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          !pessoaId && (
            <Button type="button" variant="secondary" size="sm" icon={UserPlus} onClick={() => setNovaPessoaAberta(true)}>
              Pessoa não cadastrada ainda
            </Button>
          )
        )}

        <Combobox
          label="Vincular a membro do app (opcional)"
          value={membroId}
          onChange={setMembroId}
          placeholder="Buscar membro..."
          emptyMessage="Nenhum membro encontrado"
          options={usuarios.map((u) => ({ value: u.id, label: u.nome, sublabel: PERFIL_LABEL[u.perfil] }))}
        />
        <div className="flex gap-2">
          <div className="w-1/2">
            <Select
              label="Etapa de formação"
              value={etapa}
              onChange={(e) => setEtapa(e.target.value as EtapaFormacao)}
              options={ETAPAS_FORMACAO.map((et) => ({ value: et.valor, label: labelEtapaFormacao(et.valor, terminologia) }))}
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
        <Button type="submit" fullWidth loading={salvando} disabled={!pessoaId}>
          Adicionar
        </Button>
      </form>
    </Modal>
  );
}
