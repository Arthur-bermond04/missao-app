'use client';

import { useState } from 'react';
import { Camera } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { atualizarPessoa } from '@/lib/pessoas';
import { PERFIL_LABEL } from '@/lib/usuarios';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  ORIGENS_PESSOA,
  SITUACOES_FE,
  TAGS_PESSOA,
  type OrigemPessoa,
  type Pessoa,
  type SituacaoFe,
  type Usuario,
} from '@/types/database';

export function AbaDadosPessoais({
  pessoa,
  usuarios,
  onAtualizada,
}: {
  pessoa: Pessoa;
  usuarios: Usuario[];
  onAtualizada: (p: Pessoa) => void;
}) {
  const [nome, setNome] = useState(pessoa.nome);
  const [telefone, setTelefone] = useState(pessoa.telefone ?? '');
  const [whatsapp, setWhatsapp] = useState(pessoa.whatsapp ?? '');
  const [email, setEmail] = useState(pessoa.email ?? '');
  const [dataNascimento, setDataNascimento] = useState(pessoa.data_nascimento ?? '');
  const [sexo, setSexo] = useState(pessoa.sexo ?? '');
  const [cidade, setCidade] = useState(pessoa.cidade ?? '');
  const [bairro, setBairro] = useState(pessoa.bairro ?? '');
  const [situacaoFe, setSituacaoFe] = useState<SituacaoFe>(pessoa.situacao_fe);
  const [origem, setOrigem] = useState<OrigemPessoa>(pessoa.origem);
  const [responsavelId, setResponsavelId] = useState(pessoa.responsavel_id ?? '');
  const [objetivoAtual, setObjetivoAtual] = useState(pessoa.objetivo_atual ?? '');
  const [observacoes, setObservacoes] = useState(pessoa.observacoes ?? '');
  const [tags, setTags] = useState<string[]>(pessoa.tags ?? []);
  const [salvando, setSalvando] = useState(false);

  function alternarTag(tag: string) {
    setTags((atual) => (atual.includes(tag) ? atual.filter((t) => t !== tag) : [...atual, tag]));
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const campos = {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: email.trim() || null,
        data_nascimento: dataNascimento || null,
        sexo: (sexo || null) as Pessoa['sexo'],
        cidade: cidade.trim() || null,
        bairro: bairro.trim() || null,
        situacao_fe: situacaoFe,
        origem,
        responsavel_id: responsavelId || null,
        objetivo_atual: objetivoAtual.trim() || null,
        observacoes: observacoes.trim() || null,
        tags,
      };
      await atualizarPessoa(pessoa.id, campos);
      onAtualizada({ ...pessoa, ...campos });
      toastSuccess('Dados atualizados.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSalvar} className="max-w-2xl space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-bg-page text-text-secondary">
          {pessoa.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pessoa.foto_url} alt={pessoa.nome} className="h-full w-full object-cover" />
          ) : (
            <Camera size={22} />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">Foto</p>
          <p className="text-xs text-text-secondary">Upload de imagem em breve.</p>
        </div>
      </div>

      <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        <Input label="WhatsApp (se diferente)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
      </div>
      <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="grid grid-cols-3 gap-3">
        <Input label="Data de nascimento" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
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
        label="Objetivo atual do acompanhamento"
        value={objetivoAtual}
        onChange={(e) => setObjetivoAtual(e.target.value)}
        placeholder="Ex: aproximar da célula, iniciar CV..."
      />

      <Textarea label="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />

      <Button type="submit" loading={salvando}>
        Salvar alterações
      </Button>
    </form>
  );
}
