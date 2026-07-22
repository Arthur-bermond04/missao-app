'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { criarPessoa } from '@/lib/pessoas';
import { PERFIL_LABEL } from '@/lib/usuarios';
import { toastError, toastSuccess } from '@/lib/toast';
import { labelEtapaJornadaPessoa, useTerminologia } from '@/lib/terminologia';
import {
  ETAPAS_JORNADA_PESSOA,
  ORIGENS_PESSOA,
  SITUACOES_FE,
  FREQUENCIAS_ACOMPANHAMENTO_PESSOA,
  TAGS_PESSOA,
  type EtapaJornadaPessoa,
  type FrequenciaAcompanhamentoPessoa,
  type NivelInteresse,
  type OrigemPessoa,
  type SituacaoFe,
  type Usuario,
} from '@/types/database';

interface NovaPessoaModalProps {
  open: boolean;
  onClose: () => void;
  comunidadeId: string;
  cadastradoPor: string;
  usuarios: Usuario[];
  prefill?: { nome?: string; telefone?: string; origem?: OrigemPessoa } | null;
  onCriada: (pessoaId: string) => void;
}

const NIVEIS_INTERESSE: { valor: NivelInteresse; label: string }[] = [
  { valor: 'quente', label: 'Quente' },
  { valor: 'morno', label: 'Morno' },
  { valor: 'frio', label: 'Frio' },
];

export function NovaPessoaModal({
  open,
  onClose,
  comunidadeId,
  cadastradoPor,
  usuarios,
  prefill,
  onCriada,
}: NovaPessoaModalProps) {
  const terminologia = useTerminologia();
  // Seção 1 — Dados pessoais
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [cidade, setCidade] = useState('');
  const [bairro, setBairro] = useState('');

  // Seção 2 — Situação na fé e jornada
  const [situacaoFe, setSituacaoFe] = useState<SituacaoFe>('nao_informado');
  const [origem, setOrigem] = useState<OrigemPessoa>('evangelizacao');
  const [origemDescricao, setOrigemDescricao] = useState('');
  const [localPrimeiroContato, setLocalPrimeiroContato] = useState('');
  const [etapaJornada, setEtapaJornada] = useState<EtapaJornadaPessoa>('contato_inicial');
  const [nivelInteresse, setNivelInteresse] = useState<NivelInteresse>('morno');

  // Seção 3 — Acompanhamento
  const [frequencia, setFrequencia] = useState<FrequenciaAcompanhamentoPessoa>('mensal');
  const [proximaVisita, setProximaVisita] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [objetivoAtual, setObjetivoAtual] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(prefill?.nome ?? '');
      setTelefone(prefill?.telefone ?? '');
      if (prefill?.origem) setOrigem(prefill.origem);
      setResponsavelId(cadastradoPor);
    }
  }, [open, prefill, cadastradoPor]);

  function alternarTag(tag: string) {
    setTags((atual) => (atual.includes(tag) ? atual.filter((t) => t !== tag) : [...atual, tag]));
  }

  function limpar() {
    setNome('');
    setTelefone('');
    setWhatsapp('');
    setEmail('');
    setDataNascimento('');
    setSexo('');
    setCidade('');
    setBairro('');
    setSituacaoFe('nao_informado');
    setOrigem('evangelizacao');
    setOrigemDescricao('');
    setLocalPrimeiroContato('');
    setEtapaJornada('contato_inicial');
    setNivelInteresse('morno');
    setFrequencia('mensal');
    setProximaVisita('');
    setObjetivoAtual('');
    setObservacoes('');
    setTags([]);
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (origem === 'outro' && !origemDescricao.trim()) {
      toastError('Conte qual foi a origem.');
      return;
    }
    setSalvando(true);
    try {
      const pessoa = await criarPessoa({
        comunidade_id: comunidadeId,
        cadastrado_por: cadastradoPor,
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || undefined,
        data_nascimento: dataNascimento || undefined,
        sexo: sexo || undefined,
        cidade: cidade.trim() || undefined,
        bairro: bairro.trim() || undefined,
        situacao_fe: situacaoFe,
        origem,
        origem_descricao: origem === 'outro' ? origemDescricao.trim() : undefined,
        local_primeiro_contato: localPrimeiroContato.trim() || undefined,
        etapa_jornada: etapaJornada,
        nivel_interesse: nivelInteresse,
        frequencia_acompanhamento: frequencia,
        proxima_visita: proximaVisita || undefined,
        responsavel_id: responsavelId || undefined,
        objetivo_atual: objetivoAtual.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        tags,
      });
      limpar();
      onCriada(pessoa.id);
      onClose();
      toastSuccess('Pessoa cadastrada!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao cadastrar pessoa.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova pessoa" description="Cadastro central — visível em todos os módulos" size="lg">
      <form onSubmit={handleSalvar} className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
        {/* Seção 1 — Dados pessoais */}
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Dados pessoais</h3>
          <div className="space-y-3">
            <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              <Input label="WhatsApp (se diferente)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Data de nascimento"
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
              />
              <Select
                label="Sexo"
                value={sexo}
                onChange={(e) => setSexo(e.target.value)}
                options={[
                  { value: '', label: '—' },
                  { value: 'masculino', label: 'Masculino' },
                  { value: 'feminino', label: 'Feminino' },
                ]}
              />
              <Input label="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </div>
            <Input label="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </div>
        </div>

        {/* Seção 2 — Situação na fé e jornada */}
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Situação na fé e jornada</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Situação na fé"
                value={situacaoFe}
                onChange={(e) => setSituacaoFe(e.target.value as SituacaoFe)}
                options={SITUACOES_FE.map((s) => ({ value: s.valor, label: s.label }))}
              />
              <Select
                label="Origem"
                value={origem}
                onChange={(e) => setOrigem(e.target.value as OrigemPessoa)}
                options={ORIGENS_PESSOA.map((o) => ({ value: o.valor, label: o.label }))}
              />
            </div>
            {origem === 'outro' && (
              <Input
                label="Qual a origem?"
                value={origemDescricao}
                onChange={(e) => setOrigemDescricao(e.target.value)}
                placeholder="Ex: Programa de rádio, amigo da família..."
                required
              />
            )}
            <Input
              label="Local do primeiro contato (opcional)"
              value={localPrimeiroContato}
              onChange={(e) => setLocalPrimeiroContato(e.target.value)}
              placeholder="Ex: Praça da Matriz"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Etapa da jornada"
                value={etapaJornada}
                onChange={(e) => setEtapaJornada(e.target.value as EtapaJornadaPessoa)}
                options={ETAPAS_JORNADA_PESSOA.map((e) => ({ value: e.valor, label: labelEtapaJornadaPessoa(e.valor, terminologia) }))}
              />
              <Select
                label="Nível de interesse"
                value={nivelInteresse}
                onChange={(e) => setNivelInteresse(e.target.value as NivelInteresse)}
                options={NIVEIS_INTERESSE.map((n) => ({ value: n.valor, label: n.label }))}
              />
            </div>
          </div>
        </div>

        {/* Seção 3 — Acompanhamento */}
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Acompanhamento</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Frequência de acompanhamento"
                value={frequencia}
                onChange={(e) => setFrequencia(e.target.value as FrequenciaAcompanhamentoPessoa)}
                options={FREQUENCIAS_ACOMPANHAMENTO_PESSOA.map((f) => ({ value: f.valor, label: f.label }))}
              />
              <Input
                label="Próxima visita (opcional)"
                type="date"
                value={proximaVisita}
                onChange={(e) => setProximaVisita(e.target.value)}
              />
            </div>
            <Combobox
              label="Responsável pelo acompanhamento"
              value={responsavelId}
              onChange={setResponsavelId}
              placeholder="Buscar membro..."
              emptyMessage="Nenhum membro encontrado"
              options={usuarios.map((u) => ({ value: u.id, label: u.nome, sublabel: PERFIL_LABEL[u.perfil] }))}
            />
            <div>
              <p className="mb-1 text-xs font-semibold text-text-secondary">Tags</p>
              <div className="flex flex-wrap gap-2">
                {TAGS_PESSOA.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => alternarTag(tag)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      tags.includes(tag)
                        ? 'border-primary bg-primary-xlight text-primary'
                        : 'border-border text-text-secondary hover:bg-bg-page'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Objetivo atual do acompanhamento (opcional)"
              value={objetivoAtual}
              onChange={(e) => setObjetivoAtual(e.target.value)}
              placeholder="Ex: aproximar da célula, iniciar CV..."
            />
            <Textarea
              label="Observações (opcional)"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <Button type="submit" fullWidth loading={salvando}>
          Cadastrar pessoa
        </Button>
      </form>
    </Modal>
  );
}
