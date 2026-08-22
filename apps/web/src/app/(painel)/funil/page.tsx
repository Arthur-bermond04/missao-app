'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Filter, PartyPopper, HeartHandshake, MapPin, UserPlus } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import * as XLSX from 'xlsx';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FunilVisual } from '@/components/funil/FunilVisual';
import { PainelContato } from '@/components/funil/PainelContato';
import { registrarAbordagemPessoa } from '@/lib/pessoas';
import { toastError, toastSuccess } from '@/lib/toast';
import { labelEtapaJornadaPessoa, useTerminologia } from '@/lib/terminologia';
import { ETAPAS_FUNIL_EVANGELIZACAO, type NivelInteresse, type Pessoa, type Usuario } from '@/types/database';

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

// Desde a migration 20260822030000, o web para de criar em `contatos` — esta
// tela lê e cria direto em `pessoas` (origem evangelizacao). O app mobile
// continua escrevendo em `contatos`; o trigger `contatos_gera_pessoa` cria a
// pessoa correspondente automaticamente, então essa lista já inclui as
// abordagens feitas em campo pelo mobile também.
export default function FunilPage() {
  const { usuario } = usePainelSession();
  const terminologia = useTerminologia();

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [missionarios, setMissionarios] = useState<Usuario[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [missionarioId, setMissionarioId] = useState('');
  const [local, setLocal] = useState('');
  const [contatoSelecionado, setContatoSelecionado] = useState<Pessoa | null>(null);
  const [modalAbordagem, setModalAbordagem] = useState(false);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    setCarregandoDados(true);
    Promise.all([
      supabase
        .from('pessoas')
        .select('*')
        .eq('comunidade_id', usuario.comunidade_id)
        .eq('origem', 'evangelizacao')
        .order('data_primeiro_contato', { ascending: false }),
      supabase
        .from('usuarios')
        .select('*')
        .eq('comunidade_id', usuario.comunidade_id)
        .eq('perfil', 'missionario'),
    ]).then(([pessoasRes, missionariosRes]) => {
      setPessoas((pessoasRes.data as Pessoa[]) ?? []);
      setMissionarios((missionariosRes.data as Usuario[]) ?? []);
      setCarregandoDados(false);
    });
  }, [usuario?.comunidade_id]);

  const pessoasFiltradas = useMemo(() => {
    return pessoas.filter((p) => {
      const data = p.data_primeiro_contato.slice(0, 10);
      if (dataInicio && data < dataInicio) return false;
      if (dataFim && data > dataFim) return false;
      if (missionarioId && p.responsavel_id !== missionarioId) return false;
      if (local && !(p.local_primeiro_contato ?? '').toLowerCase().includes(local.toLowerCase()))
        return false;
      return true;
    });
  }, [pessoas, dataInicio, dataFim, missionarioId, local]);

  const funil = useMemo(() => {
    return ETAPAS_FUNIL_EVANGELIZACAO.map((valor, index) => {
      const total = pessoasFiltradas.filter((p) => ETAPAS_FUNIL_EVANGELIZACAO.indexOf(p.etapa_jornada) >= index).length;
      return { valor, label: labelEtapaJornadaPessoa(valor, terminologia), total };
    });
  }, [pessoasFiltradas, terminologia]);

  const travados = useMemo(() => {
    const agora = Date.now();
    return pessoasFiltradas.filter((p) => {
      if (p.etapa_jornada !== 'contato_inicial') return false;
      const dataAbordagem = new Date(p.data_primeiro_contato).getTime();
      return agora - dataAbordagem > TRINTA_DIAS_MS;
    });
  }, [pessoasFiltradas]);

  const locaisMaisFrequentes = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const p of pessoasFiltradas) {
      const local = p.local_primeiro_contato?.trim() || 'Não informado';
      contagem.set(local, (contagem.get(local) ?? 0) + 1);
    }
    return [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [pessoasFiltradas]);
  const maiorContagemLocal = locaisMaisFrequentes[0]?.[1] || 1;

  function exportarExcel() {
    const linhas = pessoasFiltradas.map((p) => ({
      Nome: p.nome,
      Telefone: p.telefone ?? '',
      Idade: p.idade ?? '',
      'Nível de interesse': p.nivel_interesse,
      'Local da abordagem': p.local_primeiro_contato ?? '',
      'Data da abordagem': new Date(p.data_primeiro_contato).toLocaleDateString('pt-BR'),
      'Etapa da jornada': p.etapa_jornada,
      Tags: (p.tags ?? []).join(', '),
      Observações: p.observacoes ?? '',
    }));
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, 'Funil de evangelização');
    XLSX.writeFile(livro, 'funil-evangelizacao.xlsx');
  }

  if (!usuario?.comunidade_id) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-text-secondary">
        Seu usuário ainda não está vinculado a nenhuma comunidade.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={Filter}
        title="Funil de Evangelização"
        subtitle="Acompanhe a jornada de cada pessoa"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportarExcel}>
              Exportar Excel
            </Button>
            <Button icon={UserPlus} onClick={() => setModalAbordagem(true)}>
              Registrar abordagem
            </Button>
          </div>
        }
      />

      {modalAbordagem && (
        <RegistrarAbordagemModal
          comunidadeId={usuario.comunidade_id}
          missionarioId={usuario.id}
          onClose={() => setModalAbordagem(false)}
          onRegistrado={(pessoa) => {
            setPessoas((atual) => [pessoa, ...atual]);
            setModalAbordagem(false);
          }}
        />
      )}

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap gap-3 rounded-lg bg-bg-card p-4 shadow-card">
        <Input label="De" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <Input label="Até" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        <Select
          label="Missionário"
          value={missionarioId}
          onChange={(e) => setMissionarioId(e.target.value)}
          options={[{ value: '', label: 'Todos' }, ...missionarios.map((m) => ({ value: m.id, label: m.nome }))]}
        />
        <div className="min-w-[160px] flex-1">
          <Input
            label="Local / região"
            type="text"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Buscar por local"
          />
        </div>
      </div>

      {/* Funil */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        {carregandoDados ? (
          <p className="text-sm text-text-secondary">Carregando dados...</p>
        ) : (
          <div className="mx-auto max-w-sm">
            <FunilVisual etapas={funil} />
          </div>
        )}
      </div>

      {/* Onde estamos evangelizando */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <MapPin size={15} /> Onde estamos evangelizando
        </h2>
        {locaisMaisFrequentes.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">Nenhum local registrado ainda.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {locaisMaisFrequentes.map(([local, total]) => (
              <div key={local}>
                <div className="flex justify-between text-sm">
                  <span className="text-text-primary">{local}</span>
                  <span className="text-text-secondary">{total}</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-bg-page">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(total / maiorContagemLocal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Travados */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <h2 className="text-sm font-bold text-text-primary">
          Travados na abordagem há mais de 30 dias ({travados.length})
        </h2>
        {travados.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            title="Nenhum contato travado"
            description="Todo mundo está avançando na jornada. Continue assim!"
          />
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {travados.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <button
                  onClick={() => setContatoSelecionado(p)}
                  className="text-left hover:text-primary"
                  title="Ver detalhe do contato"
                >
                  <span className="font-medium text-text-primary">{p.nome}</span>
                  <span className="ml-2 text-text-secondary">
                    {p.local_primeiro_contato ?? 'Local não informado'} ·{' '}
                    {new Date(p.data_primeiro_contato).toLocaleDateString('pt-BR')}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/pastoral?nome=${encodeURIComponent(p.nome)}${
                      p.telefone ? `&telefone=${encodeURIComponent(p.telefone)}` : ''
                    }&pessoaId=${encodeURIComponent(p.id)}`}
                    className="inline-flex items-center gap-1 rounded-md border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-xlight"
                  >
                    <HeartHandshake size={13} /> Iniciar acompanhamento
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PainelContato
        contato={contatoSelecionado}
        usuarioId={usuario.id}
        onClose={() => setContatoSelecionado(null)}
        onAtualizado={(p) => {
          setPessoas((atual) => atual.map((x) => (x.id === p.id ? p : x)));
          setContatoSelecionado(p);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de registrar abordagem (evangelização) direto no web
// ---------------------------------------------------------------------------
const NIVEIS: { valor: NivelInteresse; label: string }[] = [
  { valor: 'quente', label: 'Quente' },
  { valor: 'morno', label: 'Morno' },
  { valor: 'frio', label: 'Frio' },
];

function RegistrarAbordagemModal({
  comunidadeId,
  missionarioId,
  onClose,
  onRegistrado,
}: {
  comunidadeId: string;
  missionarioId: string;
  onClose: () => void;
  onRegistrado: (pessoa: Pessoa) => void;
}) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [idade, setIdade] = useState('');
  const [nivel, setNivel] = useState<NivelInteresse>('morno');
  const [local, setLocal] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toastError('Informe o nome.');
      return;
    }
    setSalvando(true);
    try {
      const pessoa = await registrarAbordagemPessoa({
        comunidade_id: comunidadeId,
        missionario_id: missionarioId,
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
        idade: idade ? Number(idade) : undefined,
        nivel_interesse: nivel,
        local_abordagem: local.trim() || undefined,
        data_abordagem: data,
        observacoes: observacoes.trim() || undefined,
      });
      toastSuccess('Abordagem registrada!');
      onRegistrado(pessoa);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao registrar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Registrar abordagem">
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
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-secondary">Nível de interesse</label>
          <div className="flex gap-2">
            {NIVEIS.map((n) => (
              <button
                key={n.valor}
                type="button"
                onClick={() => setNivel(n.valor)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  nivel === n.valor
                    ? 'border-primary bg-primary-xlight text-primary'
                    : 'border-border text-text-secondary hover:bg-bg-page'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input label="Local da abordagem" value={local} onChange={(e) => setLocal(e.target.value)} />
          </div>
          <div className="w-40">
            <Input label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
        </div>
        <Textarea label="Observações (opcional)" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
        <Button type="submit" fullWidth loading={salvando}>
          Registrar abordagem
        </Button>
      </form>
    </Modal>
  );
}
