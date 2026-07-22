'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { criarCargo } from '@/lib/equipe';
import { PERFIL_LABEL } from '@/lib/usuarios';
import { toastError, toastSuccess } from '@/lib/toast';
import { CARGOS_EQUIPE_SUGERIDOS, NIVEIS_EQUIPE, type Celula, type NivelEquipe, type Pessoa, type Usuario } from '@/types/database';

const CARGO_OUTRO = '__outro__';

export function NovoCargoModal({
  open,
  onClose,
  comunidadeId,
  pessoas,
  usuarios,
  celulas,
  onCriado,
}: {
  open: boolean;
  onClose: () => void;
  comunidadeId: string;
  pessoas: Pessoa[];
  usuarios: Usuario[];
  celulas: Celula[];
  onCriado: () => void;
}) {
  const [pessoaId, setPessoaId] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [cargoSelecionado, setCargoSelecionado] = useState('');
  const [cargoCustom, setCargoCustom] = useState('');
  const [nivel, setNivel] = useState<NivelEquipe>('membro');
  const [celulaId, setCelulaId] = useState('');
  const [notas, setNotas] = useState('');
  const [salvando, setSalvando] = useState(false);

  function limpar() {
    setPessoaId('');
    setUsuarioId('');
    setCargoSelecionado('');
    setCargoCustom('');
    setNivel('membro');
    setCelulaId('');
    setNotas('');
  }

  function selecionarPessoa(id: string) {
    setPessoaId(id);
    if (id) setUsuarioId('');
  }

  function selecionarUsuario(id: string) {
    setUsuarioId(id);
    if (id) setPessoaId('');
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!pessoaId && !usuarioId) {
      toastError('Selecione uma pessoa ou um membro do app.');
      return;
    }
    const cargoFinal = cargoSelecionado === CARGO_OUTRO ? cargoCustom.trim() : cargoSelecionado;
    if (!cargoFinal) {
      toastError('Informe o cargo.');
      return;
    }
    setSalvando(true);
    try {
      await criarCargo({
        comunidade_id: comunidadeId,
        pessoa_id: pessoaId || undefined,
        usuario_id: usuarioId || undefined,
        cargo: cargoFinal,
        cargo_descricao: cargoSelecionado === CARGO_OUTRO ? cargoCustom.trim() : undefined,
        nivel,
        celula_id: celulaId || undefined,
        notas: notas.trim() || undefined,
      });
      limpar();
      onCriado();
      onClose();
      toastSuccess('Cargo adicionado!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao adicionar cargo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar cargo">
      <form onSubmit={handleSalvar} className="space-y-3">
        <Combobox
          label="Pessoa cadastrada"
          value={pessoaId}
          onChange={selecionarPessoa}
          placeholder="Buscar em Pessoas..."
          emptyMessage="Nenhuma pessoa encontrada"
          options={pessoas.map((p) => ({ value: p.id, label: p.nome, sublabel: p.telefone ?? undefined }))}
        />
        <p className="-mt-1 text-center text-xs text-text-secondary">ou</p>
        <Combobox
          label="Membro do app"
          value={usuarioId}
          onChange={selecionarUsuario}
          placeholder="Buscar membro..."
          emptyMessage="Nenhum membro encontrado"
          options={usuarios.map((u) => ({ value: u.id, label: u.nome, sublabel: PERFIL_LABEL[u.perfil] }))}
        />

        <Select
          label="Cargo"
          value={cargoSelecionado}
          onChange={(e) => setCargoSelecionado(e.target.value)}
          options={[
            { value: '', label: 'Selecione...' },
            ...CARGOS_EQUIPE_SUGERIDOS.map((c) => ({ value: c, label: c })),
            { value: CARGO_OUTRO, label: 'Outro' },
          ]}
          required
        />
        {cargoSelecionado === CARGO_OUTRO && (
          <Input label="Qual cargo?" value={cargoCustom} onChange={(e) => setCargoCustom(e.target.value)} required />
        )}

        <Select
          label="Nível"
          value={nivel}
          onChange={(e) => setNivel(e.target.value as NivelEquipe)}
          options={NIVEIS_EQUIPE.map((n) => ({ value: n.valor, label: n.label }))}
        />

        <Select
          label="Célula (opcional)"
          value={celulaId}
          onChange={(e) => setCelulaId(e.target.value)}
          options={[{ value: '', label: 'Nenhuma' }, ...celulas.map((c) => ({ value: c.id, label: c.nome }))]}
        />

        <Textarea label="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />

        <Button type="submit" fullWidth loading={salvando}>
          Adicionar
        </Button>
      </form>
    </Modal>
  );
}
