'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Heart, Sprout, AlertTriangle, ShieldAlert, Users, Lock, ChevronRight, Sparkles, CalendarClock } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { EstadoEspiritualBadge } from '@/components/pastoral/badges';
import { NovaOvelhaModal } from '@/components/pastoral/NovaOvelhaModal';
import { UpgradePlanoModal } from '@/components/configuracoes/UpgradePlanoModal';
import { buscarComunidade } from '@/lib/comunidades';
import { buscarPessoasParaCombobox } from '@/lib/pessoas';
import { avaliarOvelha, contarFrutosPorOvelha, listarOvelhas } from '@/lib/pastoral';
import { useTerminologia } from '@/lib/terminologia';
import type { Comunidade, Pessoa, PastoralEncontro, PastoralOvelha, PastoralPresenca, Usuario } from '@/types/database';

const LIMITE_OVELHAS_SEMENTE = 5;

export default function PastoralPage() {
  const { usuario } = usePainelSession();
  const comunidadeId = usuario?.comunidade_id ?? null;
  const searchParams = useSearchParams();
  const terminologia = useTerminologia();
  const nomeOvelha = terminologia.nome_ovelha;
  const nomeOvelhaPlural = `${nomeOvelha}s`;

  const [comunidade, setComunidade] = useState<Comunidade | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [ovelhas, setOvelhas] = useState<PastoralOvelha[]>([]);
  const [encontros, setEncontros] = useState<PastoralEncontro[]>([]);
  const [presencas, setPresencas] = useState<PastoralPresenca[]>([]);
  const [frutosPorOvelha, setFrutosPorOvelha] = useState<Record<string, number>>({});
  const [modalNova, setModalNova] = useState(false);
  const [modalUpgrade, setModalUpgrade] = useState(false);
  const [prefill, setPrefill] = useState<{ nome?: string; telefone?: string; pessoaId?: string } | null>(null);

  const plano = comunidade?.plano ?? 'semente';
  const temIndicadores = plano !== 'semente';

  const carregar = useCallback(() => {
    if (!comunidadeId) return;
    listarOvelhas(comunidadeId).then(async (lista) => {
      setOvelhas(lista);
      const ids = lista.map((o) => o.id);
      if (ids.length === 0) {
        setEncontros([]);
        setPresencas([]);
        setFrutosPorOvelha({});
        return;
      }
      const [{ data: enc }, { data: pres }, frutos] = await Promise.all([
        supabase.from('pastoral_encontros').select('*').in('ovelha_id', ids),
        supabase.from('pastoral_presencas').select('*').in('ovelha_id', ids),
        contarFrutosPorOvelha(ids),
      ]);
      setEncontros((enc as PastoralEncontro[]) ?? []);
      setPresencas((pres as PastoralPresenca[]) ?? []);
      setFrutosPorOvelha(frutos);
    });
  }, [comunidadeId]);

  useEffect(() => {
    if (!comunidadeId) return;
    buscarComunidade(comunidadeId).then(setComunidade);
    supabase
      .from('usuarios')
      .select('*')
      .eq('comunidade_id', comunidadeId)
      .order('nome', { ascending: true })
      .then(({ data }) => setUsuarios((data as Usuario[]) ?? []));
    buscarPessoasParaCombobox(comunidadeId).then(setPessoas);
    carregar();
  }, [comunidadeId, carregar]);

  // Integração (P4a/P4b + Pessoas): abre o modal pré-preenchido quando chega de um contato/inscrito/pessoa
  useEffect(() => {
    const nome = searchParams.get('nome');
    const pessoaId = searchParams.get('pessoaId');
    if (nome || pessoaId) {
      setPrefill({
        nome: nome ?? undefined,
        telefone: searchParams.get('telefone') ?? undefined,
        pessoaId: pessoaId ?? undefined,
      });
      setModalNova(true);
    }
  }, [searchParams]);

  const ativas = ovelhas.filter((o) => o.ativo);
  const contagem = {
    total: ativas.length,
    crescendo: ativas.filter((o) => o.estado_espiritual === 'crescendo').length,
    atencao: ativas.filter((o) => o.estado_espiritual === 'atencao').length,
    risco: ativas.filter((o) => o.estado_espiritual === 'risco').length,
  };

  const encontrosPorOvelha = useMemo(() => {
    const mapa = new Map<string, PastoralEncontro[]>();
    for (const e of encontros) {
      const arr = mapa.get(e.ovelha_id) ?? [];
      arr.push(e);
      mapa.set(e.ovelha_id, arr);
    }
    return mapa;
  }, [encontros]);

  const presencasPorOvelha = useMemo(() => {
    const mapa = new Map<string, PastoralPresenca[]>();
    for (const p of presencas) {
      const arr = mapa.get(p.ovelha_id) ?? [];
      arr.push(p);
      mapa.set(p.ovelha_id, arr);
    }
    return mapa;
  }, [presencas]);

  const hojeIso = new Date().toISOString().slice(0, 10);
  const em7 = new Date();
  em7.setDate(em7.getDate() + 7);
  const em7Iso = em7.toISOString().slice(0, 10);

  const proximasReunioes = ativas.filter(
    (o) => o.proxima_reuniao && o.proxima_reuniao >= hojeIso && o.proxima_reuniao <= em7Iso
  );

  const gargalos = useMemo(() => {
    if (!temIndicadores) return [];
    return ativas
      .map((o) => ({
        ovelha: o,
        indicadores: avaliarOvelha(o, encontrosPorOvelha.get(o.id) ?? [], presencasPorOvelha.get(o.id) ?? []),
      }))
      .filter((x) => x.indicadores.alertas.some((a) => a.nivel === 'perigo' || a.nivel === 'alerta'));
  }, [ativas, encontrosPorOvelha, presencasPorOvelha, temIndicadores]);

  function handleNova() {
    if (!temIndicadores && ovelhas.length >= LIMITE_OVELHAS_SEMENTE) {
      setModalUpgrade(true);
      return;
    }
    setModalNova(true);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={Heart}
        title="Acompanhamento Pastoral"
        subtitle={`Suas ${nomeOvelhaPlural.toLowerCase()} · registros confidenciais`}
        actions={
          <Button onClick={handleNova} title="Adicionar uma pessoa ao seu acompanhamento pastoral">
            + Adicionar pessoa
          </Button>
        }
      />

      {comunidadeId && usuario && (
        <NovaOvelhaModal
          open={modalNova}
          onClose={() => {
            setModalNova(false);
            setPrefill(null);
          }}
          comunidadeId={comunidadeId}
          usuarioId={usuario.id}
          pastorId={usuario.id}
          usuarios={usuarios}
          pessoas={pessoas}
          prefill={prefill}
          onCriada={carregar}
        />
      )}
      <UpgradePlanoModal open={modalUpgrade} onClose={() => setModalUpgrade(false)} planoAtual={plano} />

      {/* Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Users} iconColor="primary" label={`${nomeOvelhaPlural} ativas`} value={contagem.total} />
        <MetricCard icon={Sprout} iconColor="accent" label="Crescendo" value={contagem.crescendo} />
        <MetricCard icon={AlertTriangle} iconColor="warning" label="Em atenção" value={contagem.atencao} />
        <MetricCard icon={ShieldAlert} iconColor="danger" label="Em risco" value={contagem.risco} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Próximas reuniões */}
        <div className="rounded-lg bg-bg-card p-6 shadow-card">
          <h2 className="text-sm font-bold text-text-primary">Próximas reuniões (7 dias)</h2>
          {proximasReunioes.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">Nenhuma reunião agendada para os próximos 7 dias.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {proximasReunioes.map((o) => (
                <Link
                  key={o.id}
                  href={`/pastoral/${o.id}`}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-bg-page"
                >
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{o.nome}</p>
                    <p className="text-xs text-text-secondary">
                      {o.proxima_reuniao ? new Date(o.proxima_reuniao).toLocaleDateString('pt-BR') : ''}
                    </p>
                  </div>
                  <EstadoEspiritualBadge estado={o.estado_espiritual} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Gargalos */}
        <div className="rounded-lg bg-bg-card p-6 shadow-card">
          <h2 className="text-sm font-bold text-text-primary">Gargalos — precisam de atenção</h2>
          {!temIndicadores ? (
            <div className="mt-3 rounded-lg border border-warning-light bg-warning-light/40 p-4 text-center">
              <Lock className="mx-auto text-warning" size={22} />
              <p className="mt-2 text-sm font-semibold text-text-primary">
                Indicadores e alertas automáticos no plano Missão
              </p>
              <Button className="mt-3" size="sm" onClick={() => setModalUpgrade(true)}>
                Fazer upgrade
              </Button>
            </div>
          ) : gargalos.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">Tudo em dia — nenhum(a) {nomeOvelha.toLowerCase()} em alerta. 🎉</p>
          ) : (
            <div className="mt-3 space-y-2">
              {gargalos.map(({ ovelha, indicadores }) => (
                <Link
                  key={ovelha.id}
                  href={`/pastoral/${ovelha.id}`}
                  className="block rounded-md border border-border px-3 py-2 hover:bg-bg-page"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-text-primary">{ovelha.nome}</p>
                    <ChevronRight size={16} className="text-text-secondary" />
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {indicadores.diasDesdeUltimoEncontro != null
                      ? `Último encontro há ${indicadores.diasDesdeUltimoEncontro} dias`
                      : 'Sem encontros registrados'}
                  </p>
                  <p className="mt-1 text-xs font-medium text-warning">{indicadores.alertas[0]?.mensagem}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lista de todas as ovelhas */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <h2 className="text-sm font-bold text-text-primary">Todos(as) {nomeOvelhaPlural.toLowerCase()}</h2>
        {ativas.length === 0 ? (
          <EmptyState
            icon={Heart}
            title={`Nenhum(a) ${nomeOvelha.toLowerCase()} ainda`}
            description="Comece registrando as pessoas que você acompanha pastoralmente."
            action={{ label: '+ Adicionar pessoa', onClick: handleNova }}
          />
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ativas.map((o) => {
              const encontrosOvelha = encontrosPorOvelha.get(o.id) ?? [];
              const ultimoEncontro = [...encontrosOvelha].sort((a, b) => b.data.localeCompare(a.data))[0];
              const totalFrutos = frutosPorOvelha[o.id] ?? 0;
              return (
                <Link
                  key={o.id}
                  href={`/pastoral/${o.id}`}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-3 hover:bg-bg-page"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-xlight text-xs font-bold text-primary">
                      {o.nome.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{o.nome}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock size={11} />
                          {ultimoEncontro
                            ? `Último: ${new Date(ultimoEncontro.data).toLocaleDateString('pt-BR')}`
                            : 'Sem encontros'}
                        </span>
                        <span>·</span>
                        <span>{encontrosOvelha.length} encontro(s)</span>
                        <span>·</span>
                        <span>
                          {o.proxima_reuniao
                            ? `Próxima: ${new Date(o.proxima_reuniao).toLocaleDateString('pt-BR')}`
                            : 'Sem reunião agendada'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {totalFrutos > 0 && (
                      <span
                        title={`${totalFrutos} fruto(s) registrado(s)`}
                        className="inline-flex items-center gap-1 rounded-full bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent"
                      >
                        <Sparkles size={11} />
                        {totalFrutos}
                      </span>
                    )}
                    <EstadoEspiritualBadge estado={o.estado_espiritual} />
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
