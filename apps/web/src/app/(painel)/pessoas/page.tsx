'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IdCard, Search, Users, CalendarClock, UserPlus, Phone } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { EtapaJornadaBadge } from '@/components/pessoas/EtapaJornadaBadge';
import { NovaPessoaModal } from '@/components/pessoas/NovaPessoaModal';
import { UpgradePlanoModal } from '@/components/configuracoes/UpgradePlanoModal';
import { buscarComunidade } from '@/lib/comunidades';
import { filtrarPessoas, listarPessoas, ordenarPorUrgencia, proximoContatoVencido, type FiltrosPessoas } from '@/lib/pessoas';
import { labelEtapaJornadaPessoa, useTerminologia } from '@/lib/terminologia';
import { ETAPAS_JORNADA_PESSOA, ORIGENS_PESSOA, type Comunidade, type Pessoa, type Usuario } from '@/types/database';

export default function PessoasPage() {
  const { usuario } = usePainelSession();
  const comunidadeId = usuario?.comunidade_id ?? null;
  const router = useRouter();
  const terminologia = useTerminologia();

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [comunidade, setComunidade] = useState<Comunidade | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modalNova, setModalNova] = useState(false);
  const [modalUpgrade, setModalUpgrade] = useState(false);

  const [filtros, setFiltros] = useState<FiltrosPessoas>({
    busca: '',
    etapa: '',
    interesse: '',
    origem: '',
    proximoContato: '',
  });

  const carregar = () => {
    if (!comunidadeId) return;
    setCarregando(true);
    listarPessoas(comunidadeId).then((lista) => {
      setPessoas(lista);
      setCarregando(false);
    });
  };

  useEffect(() => {
    if (!comunidadeId) return;
    carregar();
    supabase
      .from('usuarios')
      .select('*')
      .eq('comunidade_id', comunidadeId)
      .order('nome', { ascending: true })
      .then(({ data }) => setUsuarios((data as Usuario[]) ?? []));
    buscarComunidade(comunidadeId).then(setComunidade).catch(() => setComunidade(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comunidadeId]);

  const limiteAtingido = !!comunidade?.max_contatos && pessoas.length >= comunidade.max_contatos;

  function handleNovaPessoa() {
    if (limiteAtingido) {
      setModalUpgrade(true);
      return;
    }
    setModalNova(true);
  }

  const filtradas = useMemo(() => ordenarPorUrgencia(filtrarPessoas(pessoas, filtros)), [pessoas, filtros]);

  const resumo = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const semanaAtras = new Date();
    semanaAtras.setDate(semanaAtras.getDate() - 7);
    const semanaAtrasIso = semanaAtras.toISOString().slice(0, 10);
    return {
      total: pessoas.length,
      vencidas: pessoas.filter((p) => p.proxima_visita && p.proxima_visita < hoje).length,
      novasSemana: pessoas.filter((p) => p.criado_em.slice(0, 10) >= semanaAtrasIso).length,
    };
  }, [pessoas]);

  function limparFiltros() {
    setFiltros({ busca: '', etapa: '', interesse: '', origem: '', proximoContato: '' });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={IdCard}
        title="Pessoas"
        subtitle="Cadastro central da comunidade"
        actions={<Button icon={UserPlus} onClick={handleNovaPessoa}>Nova pessoa</Button>}
      />

      {comunidadeId && usuario && (
        <NovaPessoaModal
          open={modalNova}
          onClose={() => setModalNova(false)}
          comunidadeId={comunidadeId}
          cadastradoPor={usuario.id}
          usuarios={usuarios}
          onCriada={(pessoaId) => {
            carregar();
            router.push(`/pessoas/${pessoaId}`);
          }}
        />
      )}
      {!!comunidade && (
        <UpgradePlanoModal open={modalUpgrade} onClose={() => setModalUpgrade(false)} planoAtual={comunidade.plano} />
      )}

      {/* Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard icon={Users} iconColor="primary" label="Total de pessoas" value={resumo.total} />
        <div title={resumo.vencidas > 0 ? undefined : 'Tudo em dia!'}>
          <MetricCard
            icon={CalendarClock}
            iconColor={resumo.vencidas > 0 ? 'danger' : 'accent'}
            label="Contatos vencidos"
            value={resumo.vencidas}
          />
        </div>
        <MetricCard icon={UserPlus} iconColor="accent" label="Novas esta semana" value={resumo.novasSemana} />
      </div>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-lg bg-bg-card p-4 shadow-card">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Buscar"
            icon={Search}
            placeholder="Nome ou telefone..."
            value={filtros.busca}
            onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
          />
        </div>
        <div className="w-48">
          <Select
            label="Etapa da jornada"
            value={filtros.etapa}
            onChange={(e) => setFiltros((f) => ({ ...f, etapa: e.target.value as FiltrosPessoas['etapa'] }))}
            options={[
              { value: '', label: 'Todas' },
              ...ETAPAS_JORNADA_PESSOA.map((e) => ({ value: e.valor, label: labelEtapaJornadaPessoa(e.valor, terminologia) })),
            ]}
          />
        </div>
        <div className="w-36">
          <Select
            label="Interesse"
            value={filtros.interesse}
            onChange={(e) => setFiltros((f) => ({ ...f, interesse: e.target.value as FiltrosPessoas['interesse'] }))}
            options={[
              { value: '', label: 'Todos' },
              { value: 'quente', label: 'Quente' },
              { value: 'morno', label: 'Morno' },
              { value: 'frio', label: 'Frio' },
            ]}
          />
        </div>
        <div className="w-44">
          <Select
            label="Origem"
            value={filtros.origem}
            onChange={(e) => setFiltros((f) => ({ ...f, origem: e.target.value as FiltrosPessoas['origem'] }))}
            options={[{ value: '', label: 'Todas' }, ...ORIGENS_PESSOA.map((o) => ({ value: o.valor, label: o.label }))]}
          />
        </div>
        <div className="w-44">
          <Select
            label="Próximo contato"
            value={filtros.proximoContato}
            onChange={(e) =>
              setFiltros((f) => ({ ...f, proximoContato: e.target.value as FiltrosPessoas['proximoContato'] }))
            }
            options={[
              { value: '', label: 'Todos' },
              { value: 'vencido', label: 'Vencido' },
              { value: 'semana', label: 'Nos próximos 7 dias' },
              { value: 'mes', label: 'Neste mês' },
            ]}
          />
        </div>
        <Button variant="secondary" size="md" onClick={limparFiltros}>
          Limpar
        </Button>
      </div>

      {/* Lista */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <h2 className="text-sm font-bold text-text-primary">
          {carregando ? 'Carregando...' : `${filtradas.length} pessoa${filtradas.length === 1 ? '' : 's'}`}
        </h2>
        {!carregando && filtradas.length === 0 ? (
          <EmptyState
            icon={IdCard}
            title={pessoas.length === 0 ? 'Nenhuma pessoa cadastrada ainda' : 'Nenhuma pessoa encontrada'}
            description={
              pessoas.length === 0
                ? 'Comece cadastrando as pessoas que você acompanha na missão.'
                : 'Tente ajustar os filtros de busca.'
            }
            action={pessoas.length === 0 ? { label: 'Nova pessoa', onClick: handleNovaPessoa } : undefined}
          />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtradas.map((p) => {
              const vencido = proximoContatoVencido(p);
              return (
                <Link
                  key={p.id}
                  href={`/pessoas/${p.id}`}
                  className="rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-primary-xlight/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-xlight text-xs font-bold text-primary-dark">
                        {p.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.foto_url} alt={p.nome} className="h-full w-full object-cover" />
                        ) : (
                          p.nome.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">{p.nome}</p>
                        {!!p.telefone && (
                          <p className="flex items-center gap-1 text-xs text-text-secondary">
                            <Phone size={11} /> {p.telefone}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={p.nivel_interesse} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <EtapaJornadaBadge etapa={p.etapa_jornada} />
                    {p.proxima_visita && (
                      <span className={`text-xs font-medium ${vencido ? 'text-danger' : 'text-text-secondary'}`}>
                        {vencido ? 'Vencido: ' : 'Próxima visita: '}
                        {new Date(p.proxima_visita).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
