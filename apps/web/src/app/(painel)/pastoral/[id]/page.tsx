'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Lock,
  Pencil,
  ShieldAlert,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EstadoEspiritualBadge, EtapaBadge, EstadoEncontroBadge } from '@/components/pastoral/badges';
import { EstadoTimeline } from '@/components/pastoral/EstadoTimeline';
import { RegistrarEncontroPastoralModal } from '@/components/pastoral/RegistrarEncontroPastoralModal';
import { RegistrarPresencaModal } from '@/components/pastoral/RegistrarPresencaModal';
import {
  avaliarOvelha,
  buscarOvelha,
  listarEncontrosPastorais,
  listarPresencasOvelha,
  scoreEstadoEncontro,
} from '@/lib/pastoral';
import {
  FREQUENCIAS_ACOMPANHAMENTO,
  TEMAS_PASTORAL,
  type PastoralEncontro,
  type PastoralOvelha,
  type PastoralPresenca,
} from '@/types/database';

const TEMA_LABEL = Object.fromEntries(TEMAS_PASTORAL.map((t) => [t.valor, t.label]));

function Indicador({
  label,
  valor,
  alerta,
}: {
  label: string;
  valor: string;
  alerta?: 'warning' | 'danger';
}) {
  const cor = alerta === 'danger' ? 'text-danger' : alerta === 'warning' ? 'text-warning' : 'text-text-primary';
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={`mt-1 text-lg font-bold ${cor}`}>{valor}</p>
    </div>
  );
}

export default function PerfilOvelhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { usuario } = usePainelSession();

  const [ovelha, setOvelha] = useState<PastoralOvelha | null>(null);
  const [encontros, setEncontros] = useState<PastoralEncontro[]>([]);
  const [presencas, setPresencas] = useState<PastoralPresenca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalEncontro, setModalEncontro] = useState(false);
  const [modalPresenca, setModalPresenca] = useState(false);
  const [editando, setEditando] = useState<PastoralEncontro | null>(null);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  const carregar = useCallback(() => {
    setCarregando(true);
    Promise.all([buscarOvelha(id), listarEncontrosPastorais(id), listarPresencasOvelha(id)])
      .then(([o, e, p]) => {
        setOvelha(o);
        setEncontros(e);
        setPresencas(p);
      })
      .finally(() => setCarregando(false));
  }, [id]);

  useEffect(carregar, [carregar]);

  const indicadores = useMemo(
    () => (ovelha ? avaliarOvelha(ovelha, encontros, presencas) : null),
    [ovelha, encontros, presencas]
  );

  const timeline = useMemo(
    () =>
      [...encontros]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((e) => ({
          data: new Date(e.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          score: scoreEstadoEncontro(e.estado_ovelha),
        })),
    [encontros]
  );

  if (carregando) {
    return <p className="text-sm text-text-secondary">Carregando...</p>;
  }
  if (!ovelha) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-text-secondary">Ovelha não encontrada ou sem acesso.</p>
        <Link href="/pastoral" className="mt-2 inline-block text-sm text-primary">
          Voltar
        </Link>
      </div>
    );
  }

  const freqLabel = FREQUENCIAS_ACOMPANHAMENTO.find((f) => f.valor === ovelha.frequencia_acompanhamento)?.label ?? '';
  const pctEncontros =
    indicadores && indicadores.encontrosPrevistos > 0
      ? Math.round((indicadores.encontrosRealizados / indicadores.encontrosPrevistos) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/pastoral" className="mb-3 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary">
        <ArrowLeft size={16} /> Voltar
      </Link>

      <PageHeader
        icon={CheckCircle2}
        title={ovelha.nome}
        subtitle="Acompanhamento pastoral"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={CheckCircle2} onClick={() => setModalPresenca(true)}>
              + Presença
            </Button>
            <Button icon={CalendarPlus} onClick={() => { setEditando(null); setModalEncontro(true); }}>
              + Encontro
            </Button>
          </div>
        }
      />

      <RegistrarEncontroPastoralModal
        open={modalEncontro}
        onClose={() => setModalEncontro(false)}
        ovelhaId={ovelha.id}
        pastorId={usuario?.id ?? ''}
        encontroEditar={editando}
        onRegistrado={carregar}
      />
      <RegistrarPresencaModal
        open={modalPresenca}
        onClose={() => setModalPresenca(false)}
        ovelhaId={ovelha.id}
        onRegistrado={carregar}
      />

      {/* Header info */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-xlight text-lg font-bold text-primary">
            {ovelha.nome.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary">{ovelha.nome}</h2>
              <EtapaBadge etapa={ovelha.etapa_formacao} />
              <EstadoEspiritualBadge estado={ovelha.estado_espiritual} />
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              Início: {new Date(ovelha.data_inicio_acompanhamento).toLocaleDateString('pt-BR')} · Frequência: {freqLabel}
              {ovelha.proxima_reuniao
                ? ` · Próxima: ${new Date(ovelha.proxima_reuniao).toLocaleDateString('pt-BR')}`
                : ''}
            </p>
          </div>
        </div>
        {!!ovelha.objetivo_atual && (
          <p className="mt-3 rounded-md bg-bg-page p-3 text-sm text-text-primary">
            <span className="font-semibold">Objetivo:</span> {ovelha.objetivo_atual}
          </p>
        )}
      </div>

      {/* Alertas */}
      {indicadores && indicadores.alertas.length > 0 && (
        <div className="mt-4 space-y-2">
          {indicadores.alertas.map((a, i) => {
            const Icon = a.nivel === 'perigo' ? ShieldAlert : a.nivel === 'alerta' ? AlertTriangle : Info;
            const cls =
              a.nivel === 'perigo'
                ? 'bg-danger-light text-danger'
                : a.nivel === 'alerta'
                ? 'bg-warning-light text-warning'
                : 'bg-primary-xlight text-primary';
            return (
              <div key={i} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${cls}`}>
                <Icon size={16} />
                {a.mensagem}
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <h3 className="text-sm font-bold text-text-primary">Evolução do estado espiritual</h3>
        <div className="mt-3">
          <EstadoTimeline data={timeline} />
        </div>
      </div>

      {/* Indicadores */}
      {indicadores && (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador
            label="Frequência em eventos (3m)"
            valor={indicadores.frequenciaEventos != null ? `${indicadores.frequenciaEventos}%` : '—'}
            alerta={indicadores.frequenciaEventos != null && indicadores.frequenciaEventos < 50 ? 'warning' : undefined}
          />
          <Indicador
            label="Abertura média (últimos 3)"
            valor={indicadores.nivelAberturaMedio != null ? indicadores.nivelAberturaMedio.toFixed(1) : '—'}
          />
          <Indicador
            label="Encontros realizados"
            valor={`${indicadores.encontrosRealizados} de ${indicadores.encontrosPrevistos}`}
            alerta={pctEncontros < 70 ? 'warning' : undefined}
          />
          <Indicador
            label="Desde o último encontro"
            valor={indicadores.diasDesdeUltimoEncontro != null ? `${indicadores.diasDesdeUltimoEncontro} dias` : '—'}
            alerta={indicadores.reuniaoAtrasada ? 'danger' : undefined}
          />
        </div>
      )}

      {/* Privacidade */}
      <div className="mt-6 flex items-center gap-2 rounded-md bg-primary-xlight px-3 py-2 text-xs text-primary">
        <Lock size={14} />
        Estes registros são confidenciais e visíveis apenas por você e pelo admin.
      </div>

      {/* Histórico de encontros */}
      <div className="mt-4 rounded-lg bg-bg-card p-6 shadow-card">
        <h3 className="text-sm font-bold text-text-primary">Histórico de encontros</h3>
        {encontros.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">Nenhum encontro registrado ainda.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {encontros.map((e) => {
              const aberto = expandido[e.id];
              return (
                <div key={e.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">
                        {new Date(e.data).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {e.tipo}
                        {e.duracao_minutos ? ` · ${e.duracao_minutos}min` : ''}
                      </span>
                      <EstadoEncontroBadge estado={e.estado_ovelha} />
                    </div>
                    <button
                      onClick={() => { setEditando(e); setModalEncontro(true); }}
                      className="inline-flex items-center gap-1 text-xs text-primary"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                  </div>

                  {!!e.temas_abordados?.length && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {e.temas_abordados.map((t) => (
                        <span key={t} className="rounded-full bg-bg-page px-2 py-0.5 text-xs text-text-secondary">
                          {TEMA_LABEL[t] ?? t}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className={`mt-2 text-sm text-text-primary ${aberto ? '' : 'line-clamp-2'}`}>{e.relato}</p>
                  {(e.relato.length > 120 || e.encaminhamentos) && (
                    <button
                      onClick={() => setExpandido((x) => ({ ...x, [e.id]: !aberto }))}
                      className="mt-1 text-xs font-medium text-primary"
                    >
                      {aberto ? 'Recolher' : 'Ver mais'}
                    </button>
                  )}
                  {aberto && !!e.encaminhamentos && (
                    <p className="mt-2 rounded-md bg-bg-page p-2 text-sm text-text-primary">
                      <span className="font-semibold">Encaminhamentos:</span> {e.encaminhamentos}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
