'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Filter, PartyPopper, HeartHandshake, IdCard, MapPin, UserPlus } from 'lucide-react';
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
import { promoverContatoParaPessoa, registrarAbordagem } from '@/lib/pessoas';
import { toastError, toastSuccess } from '@/lib/toast';
import { labelEtapaJornada, useTerminologia } from '@/lib/terminologia';
import { ETAPAS_FUNIL, type Contato, type NivelInteresse, type Usuario } from '@/types/database';

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

export default function FunilPage() {
  const { usuario } = usePainelSession();
  const terminologia = useTerminologia();

  const [contatos, setContatos] = useState<Contato[]>([]);
  const [missionarios, setMissionarios] = useState<Usuario[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [missionarioId, setMissionarioId] = useState('');
  const [local, setLocal] = useState('');
  const [contatoSelecionado, setContatoSelecionado] = useState<Contato | null>(null);
  const [modalAbordagem, setModalAbordagem] = useState(false);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    setCarregandoDados(true);
    Promise.all([
      supabase
        .from('contatos')
        .select('*')
        .eq('comunidade_id', usuario.comunidade_id)
        .order('data_abordagem', { ascending: false }),
      supabase
        .from('usuarios')
        .select('*')
        .eq('comunidade_id', usuario.comunidade_id)
        .eq('perfil', 'missionario'),
    ]).then(([contatosRes, missionariosRes]) => {
      setContatos((contatosRes.data as Contato[]) ?? []);
      setMissionarios((missionariosRes.data as Usuario[]) ?? []);
      setCarregandoDados(false);
    });
  }, [usuario?.comunidade_id]);

  const contatosFiltrados = useMemo(() => {
    return contatos.filter((c) => {
      const data = c.data_abordagem.slice(0, 10);
      if (dataInicio && data < dataInicio) return false;
      if (dataFim && data > dataFim) return false;
      if (missionarioId && c.missionario_id !== missionarioId) return false;
      if (local && !(c.local_abordagem ?? '').toLowerCase().includes(local.toLowerCase()))
        return false;
      return true;
    });
  }, [contatos, dataInicio, dataFim, missionarioId, local]);

  const funil = useMemo(() => {
    return ETAPAS_FUNIL.map((etapa, index) => {
      const total = contatosFiltrados.filter((c) => {
        const indiceContato = ETAPAS_FUNIL.findIndex((e) => e.valor === c.etapa_jornada);
        return indiceContato >= index;
      }).length;
      return { ...etapa, label: labelEtapaJornada(etapa.valor, terminologia), total };
    });
  }, [contatosFiltrados, terminologia]);

  const travados = useMemo(() => {
    const agora = Date.now();
    return contatosFiltrados.filter((c) => {
      if (c.etapa_jornada !== 'abordagem') return false;
      const dataAbordagem = new Date(c.data_abordagem).getTime();
      return agora - dataAbordagem > TRINTA_DIAS_MS;
    });
  }, [contatosFiltrados]);

  const locaisMaisFrequentes = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const c of contatosFiltrados) {
      const local = c.local_abordagem?.trim() || 'Não informado';
      contagem.set(local, (contagem.get(local) ?? 0) + 1);
    }
    return [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [contatosFiltrados]);
  const maiorContagemLocal = locaisMaisFrequentes[0]?.[1] || 1;

  function exportarExcel() {
    const linhas = contatosFiltrados.map((c) => ({
      Nome: c.nome,
      Telefone: c.telefone ?? '',
      Idade: c.idade ?? '',
      'Nível de interesse': c.nivel_interesse,
      'Local da abordagem': c.local_abordagem ?? '',
      'Data da abordagem': new Date(c.data_abordagem).toLocaleDateString('pt-BR'),
      'Etapa da jornada': c.etapa_jornada,
      Tags: c.tags.join(', '),
      Observações: c.observacoes ?? '',
    }));
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, 'Funil de evangelização');
    XLSX.writeFile(livro, 'funil-evangelizacao.xlsx');
  }

  async function handleCadastrarEmPessoas(c: Contato) {
    if (!usuario) return;
    try {
      const pessoa = await promoverContatoParaPessoa(c, usuario.id);
      const atualizado = { ...c, pessoa_id: pessoa.id };
      setContatos((atual) => atual.map((x) => (x.id === c.id ? atualizado : x)));
      setContatoSelecionado((atual) => (atual && atual.id === c.id ? atualizado : atual));
      toastSuccess('Cadastrado em Pessoas!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao cadastrar em Pessoas.');
    }
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
          onRegistrado={(contato) => {
            setContatos((atual) => [contato, ...atual]);
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
            {travados.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <button
                  onClick={() => setContatoSelecionado(c)}
                  className="text-left hover:text-primary"
                  title="Ver detalhe do contato"
                >
                  <span className="font-medium text-text-primary">{c.nome}</span>
                  <span className="ml-2 text-text-secondary">
                    {c.local_abordagem ?? 'Local não informado'} ·{' '}
                    {new Date(c.data_abordagem).toLocaleDateString('pt-BR')}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  {c.pessoa_id ? (
                    <Link
                      href={`/pessoas/${c.pessoa_id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs font-medium text-text-secondary hover:bg-bg-page"
                    >
                      <IdCard size={13} /> Ver em Pessoas
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleCadastrarEmPessoas(c)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs font-medium text-text-secondary hover:bg-bg-page"
                    >
                      <IdCard size={13} /> Cadastrar em Pessoas
                    </button>
                  )}
                  <Link
                    href={`/pastoral?nome=${encodeURIComponent(c.nome)}${
                      c.telefone ? `&telefone=${encodeURIComponent(c.telefone)}` : ''
                    }${c.pessoa_id ? `&pessoaId=${encodeURIComponent(c.pessoa_id)}` : ''}`}
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
        onCadastrarEmPessoas={handleCadastrarEmPessoas}
        onAtualizado={(c) => {
          setContatos((atual) => atual.map((x) => (x.id === c.id ? c : x)));
          setContatoSelecionado(c);
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
  onRegistrado: (contato: Contato) => void;
}) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [idade, setIdade] = useState('');
  const [nivel, setNivel] = useState<NivelInteresse>('morno');
  const [local, setLocal] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState('');
  const [criarPessoa, setCriarPessoa] = useState(true);
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toastError('Informe o nome.');
      return;
    }
    setSalvando(true);
    try {
      const { contato } = await registrarAbordagem(
        {
          comunidade_id: comunidadeId,
          missionario_id: missionarioId,
          nome: nome.trim(),
          telefone: telefone.trim() || undefined,
          idade: idade ? Number(idade) : undefined,
          nivel_interesse: nivel,
          local_abordagem: local.trim() || undefined,
          data_abordagem: data,
          observacoes: observacoes.trim() || undefined,
        },
        criarPessoa
      );
      toastSuccess(criarPessoa ? 'Abordagem registrada e cadastrada em Pessoas!' : 'Abordagem registrada!');
      onRegistrado(contato);
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
        <label className="flex cursor-pointer items-center gap-2 rounded-md bg-bg-page px-3 py-2 text-sm text-text-primary">
          <input type="checkbox" checked={criarPessoa} onChange={(e) => setCriarPessoa(e.target.checked)} />
          Criar também no cadastro central de Pessoas
        </label>
        <Button type="submit" fullWidth loading={salvando}>
          Registrar abordagem
        </Button>
      </form>
    </Modal>
  );
}
