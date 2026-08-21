'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { registrarEncontroCelula, type MembroCelula } from '@/lib/celulas';
import { buscarPessoasParaCombobox, criarPessoa } from '@/lib/pessoas';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Pessoa } from '@/types/database';

interface Participante {
  chave: string;
  nome: string;
  usuario_id?: string;
  pessoa_id?: string;
}

interface RegistrarEncontroCelulaModalProps {
  open: boolean;
  onClose: () => void;
  celulaId: string;
  comunidadeId: string;
  usuarioId: string;
  membrosConhecidos: MembroCelula[];
  onRegistrado: () => void;
}

// Check-in do encontro de célula: diferente de Ministérios (roster fixo, cada
// membro alterna presente/ausente), aqui a lista de presentes é montada na
// hora — quem participa de um encontro de célula varia semana a semana e
// nem todo mundo que aparece tem cargo formal vinculado (equipe_cargos é
// sobre liderança, não sobre frequência). O líder adiciona quem esteve,
// buscando entre os membros conhecidos, em Pessoas, ou cadastrando um
// visitante novo na hora — que já entra no funil de evangelização (origem
// "célula" em pessoas.origem).
export function RegistrarEncontroCelulaModal({
  open,
  onClose,
  celulaId,
  comunidadeId,
  usuarioId,
  membrosConhecidos,
  onRegistrado,
}: RegistrarEncontroCelulaModalProps) {
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [horario, setHorario] = useState('');
  const [local, setLocal] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [presentes, setPresentes] = useState<Participante[]>([]);
  const [pessoasComunidade, setPessoasComunidade] = useState<Pessoa[]>([]);
  const [buscaId, setBuscaId] = useState('');
  const [novoVisitanteAberto, setNovoVisitanteAberto] = useState(false);
  const [nomeVisitante, setNomeVisitante] = useState('');
  const [telefoneVisitante, setTelefoneVisitante] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [criandoVisitante, setCriandoVisitante] = useState(false);

  useEffect(() => {
    if (!open) return;
    setData(new Date().toISOString().slice(0, 10));
    setHorario('');
    setLocal('');
    setObservacoes('');
    setPresentes([]);
    setBuscaId('');
    setNovoVisitanteAberto(false);
    setNomeVisitante('');
    setTelefoneVisitante('');
    buscarPessoasParaCombobox(comunidadeId)
      .then(setPessoasComunidade)
      .catch(() => setPessoasComunidade([]));
  }, [open, comunidadeId]);

  const chavesPresentes = useMemo(() => new Set(presentes.map((p) => p.chave)), [presentes]);

  const chipsConhecidos = useMemo(
    () =>
      membrosConhecidos
        .map((m) => ({
          chave: m.usuario_id ?? m.pessoa_id ?? m.id,
          nome: m.nome,
          usuario_id: m.usuario_id ?? undefined,
          pessoa_id: m.pessoa_id ?? undefined,
        }))
        .filter((m) => !chavesPresentes.has(m.chave)),
    [membrosConhecidos, chavesPresentes]
  );

  const opcoesBusca = useMemo(
    () =>
      pessoasComunidade
        .filter((p) => !chavesPresentes.has(p.id))
        .map((p) => ({ value: p.id, label: p.nome, sublabel: p.telefone ?? undefined })),
    [pessoasComunidade, chavesPresentes]
  );

  function adicionar(participante: Participante) {
    setPresentes((atual) => (atual.some((p) => p.chave === participante.chave) ? atual : [...atual, participante]));
  }

  function remover(chave: string) {
    setPresentes((atual) => atual.filter((p) => p.chave !== chave));
  }

  useEffect(() => {
    if (!buscaId) return;
    const pessoa = pessoasComunidade.find((p) => p.id === buscaId);
    if (pessoa) adicionar({ chave: pessoa.id, nome: pessoa.nome, pessoa_id: pessoa.id });
    setBuscaId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaId]);

  async function handleAdicionarVisitante() {
    const nome = nomeVisitante.trim();
    if (!nome) {
      toastError('Digite o nome da pessoa.');
      return;
    }
    setCriandoVisitante(true);
    try {
      const pessoa = await criarPessoa({
        comunidade_id: comunidadeId,
        cadastrado_por: usuarioId,
        nome,
        telefone: telefoneVisitante.trim() || undefined,
        origem: 'celula',
      });
      adicionar({ chave: pessoa.id, nome: pessoa.nome, pessoa_id: pessoa.id });
      setPessoasComunidade((atual) => [...atual, pessoa]);
      setNomeVisitante('');
      setTelefoneVisitante('');
      setNovoVisitanteAberto(false);
      toastSuccess(`${pessoa.nome} cadastrado(a) e marcado(a) presente.`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao cadastrar visitante.');
    } finally {
      setCriandoVisitante(false);
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (presentes.length === 0) {
      toastError('Adicione ao menos uma pessoa presente antes de fechar o encontro.');
      return;
    }
    setSalvando(true);
    try {
      await registrarEncontroCelula(
        { celula_id: celulaId, data, horario: horario || undefined, local: local.trim() || undefined, observacoes: observacoes.trim() || undefined },
        presentes.map((p) => ({ usuario_id: p.usuario_id, pessoa_id: p.pessoa_id, presente: true }))
      );
      toastSuccess(`Encontro registrado com ${presentes.length} presença(s).`);
      onRegistrado();
      onClose();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao registrar encontro.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar encontro" size="lg">
      <form onSubmit={handleSalvar} className="space-y-3">
        <div className="flex gap-2">
          <div className="w-40">
            <Input label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
          <div className="w-32">
            <Input label="Horário" type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
          </div>
          <div className="flex-1">
            <Input label="Local" value={local} onChange={(e) => setLocal(e.target.value)} />
          </div>
        </div>
        <Textarea label="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />

        <div>
          <p className="mb-2 text-xs font-semibold text-text-secondary">
            Quem esteve presente ({presentes.length})
          </p>

          {presentes.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {presentes.map((p) => (
                <span
                  key={p.chave}
                  className="flex items-center gap-1.5 rounded-full bg-primary-xlight py-1 pl-3 pr-1.5 text-xs font-medium text-primary"
                >
                  {p.nome}
                  <button
                    type="button"
                    onClick={() => remover(p.chave)}
                    aria-label={`Remover ${p.nome}`}
                    className="rounded-full p-0.5 hover:bg-primary/20"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {chipsConhecidos.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-xs text-text-secondary">Toque para adicionar quem já é do grupo:</p>
              <div className="flex flex-wrap gap-2">
                {chipsConhecidos.map((m) => (
                  <button
                    key={m.chave}
                    type="button"
                    onClick={() => adicionar(m)}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium text-text-primary transition-colors hover:border-accent-green hover:bg-accent-green-bg"
                  >
                    + {m.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Combobox
            label="Buscar outra pessoa cadastrada"
            value={buscaId}
            onChange={setBuscaId}
            placeholder="Digite o nome..."
            emptyMessage="Ninguém encontrado — cadastre como visitante abaixo"
            options={opcoesBusca}
          />

          <div className="mt-2">
            {novoVisitanteAberto ? (
              <div className="rounded-md border border-border p-3">
                <p className="mb-2 text-xs font-semibold text-text-secondary">Novo visitante</p>
                <div className="flex flex-wrap gap-2">
                  <div className="min-w-[160px] flex-1">
                    <Input placeholder="Nome" value={nomeVisitante} onChange={(e) => setNomeVisitante(e.target.value)} />
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <Input
                      placeholder="Telefone (opcional)"
                      value={telefoneVisitante}
                      onChange={(e) => setTelefoneVisitante(e.target.value)}
                    />
                  </div>
                  <Button type="button" size="md" loading={criandoVisitante} onClick={handleAdicionarVisitante}>
                    Adicionar
                  </Button>
                  <Button type="button" variant="ghost" size="md" onClick={() => setNovoVisitanteAberto(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="secondary" size="sm" icon={UserPlus} onClick={() => setNovoVisitanteAberto(true)}>
                Sou novo(a) aqui / Cadastrar visitante
              </Button>
            )}
          </div>
        </div>

        <Button type="submit" fullWidth loading={salvando}>
          Fechar encontro com {presentes.length} presença(s)
        </Button>
      </form>
    </Modal>
  );
}
