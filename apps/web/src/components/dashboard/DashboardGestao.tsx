'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ChevronRight, Gauge, Info, ShieldAlert, Tent, UserX, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MetricCard } from '@/components/ui/MetricCard';
import { LimiteContatosBanner } from '@/components/dashboard/LimiteContatosBanner';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { AcessadosRecentemente } from '@/components/dashboard/AcessadosRecentemente';
import { UpgradePlanoModal } from '@/components/configuracoes/UpgradePlanoModal';
import { buscarComunidade } from '@/lib/comunidades';
import { gerarAlertasCentral, type AlertaCentral, type NivelAlertaCentral } from '@/lib/alertas';
import { agruparMetricasPorPastor, listarOvelhasResumo, ovelhaEmAtraso, type MetricasPastor } from '@/lib/monitoria';
import {
  ETAPAS_FUNIL,
  type Comunidade,
  type Contato,
  type Pessoa,
  type PessoaInteracao,
  type Retiro,
  type Usuario,
} from '@/types/database';

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function diasAtras(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const NIVEL_CONFIG: Record<NivelAlertaCentral, { label: string; icone: typeof ShieldAlert; cor: string }> = {
  urgente: { label: 'URGENTE', icone: ShieldAlert, cor: 'text-danger' },
  atencao: { label: 'ATENÇÃO', icone: AlertTriangle, cor: 'text-warning' },
  informativo: { label: 'INFORMATIVO', icone: Info, cor: 'text-accent' },
};

export function DashboardGestao({ usuario }: { usuario: Usuario }) {
  const comunidadeId = usuario.comunidade_id as string;

  const [comunidade, setComunidade] = useState<Comunidade | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [interacoes, setInteracoes] = useState<PessoaInteracao[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [membros, setMembros] = useState<Usuario[]>([]);
  const [proximoRetiro, setProximoRetiro] = useState<Retiro | null>(null);
  const [inscritosProximoRetiro, setInscritosProximoRetiro] = useState(0);
  const [alertas, setAlertas] = useState<AlertaCentral[]>([]);
  const [metricasPastores, setMetricasPastores] = useState<MetricasPastor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalUpgrade, setModalUpgrade] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      const [comunidadeRes, pessoasRes, contatosRes, membrosRes, retirosRes] = await Promise.all([
        buscarComunidade(comunidadeId).catch(() => null),
        supabase.from('pessoas').select('*').eq('comunidade_id', comunidadeId).eq('ativo', true),
        supabase.from('contatos').select('*').eq('comunidade_id', comunidadeId),
        supabase.from('usuarios').select('*').eq('comunidade_id', comunidadeId),
        supabase
          .from('retiros')
          .select('*')
          .eq('comunidade_id', comunidadeId)
          .gte('data_inicio', hojeIso())
          .order('data_inicio', { ascending: true })
          .limit(1),
      ]);
      if (!ativo) return;

      const listaPessoas = (pessoasRes.data as Pessoa[]) ?? [];
      setComunidade(comunidadeRes);
      setPessoas(listaPessoas);
      setContatos((contatosRes.data as Contato[]) ?? []);
      setMembros((membrosRes.data as Usuario[]) ?? []);

      const retiro = (retirosRes.data as Retiro[])?.[0] ?? null;
      setProximoRetiro(retiro);
      if (retiro) {
        const { count } = await supabase
          .from('inscricoes_retiro')
          .select('id', { count: 'exact', head: true })
          .eq('retiro_id', retiro.id);
        if (ativo) setInscritosProximoRetiro(count ?? 0);
      }

      // interações dos últimos 60 dias — engajamento atual vs. mês anterior
      // e atividade dos missionários
      if (listaPessoas.length > 0) {
        const { data: listaInteracoes } = await supabase
          .from('pessoa_interacoes')
          .select('*')
          .in(
            'pessoa_id',
            listaPessoas.map((p) => p.id)
          )
          .gte('data', diasAtras(60));
        if (ativo) setInteracoes((listaInteracoes as PessoaInteracao[]) ?? []);
      }

      gerarAlertasCentral(comunidadeId, usuario)
        .then((lista) => {
          if (ativo) setAlertas(lista);
        })
        .catch(() => {});

      // Saúde pastoral — depende da view pastoral_ovelhas_resumo. Se a
      // migration ainda não rodou, falha em silêncio (bloco fica oculto).
      listarOvelhasResumo(comunidadeId)
        .then(async (resumo) => {
          const { data: usuariosData } = await supabase
            .from('usuarios')
            .select('id, nome')
            .eq('comunidade_id', comunidadeId);
          if (ativo) {
            setMetricasPastores(
              agruparMetricasPorPastor(resumo, (usuariosData as { id: string; nome: string }[]) ?? [])
            );
          }
        })
        .catch(() => {});

      if (ativo) setCarregando(false);
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, [comunidadeId, usuario]);

  const hoje = hojeIso();
  const corte30 = diasAtras(30);
  const corte7 = diasAtras(7);

  // -------------------------------------------------------------------------
  // Engajamento: % de pessoas com contato nos últimos 30 dias
  // -------------------------------------------------------------------------
  const metricas = useMemo(() => {
    const total = pessoas.length;
    const comContato30 = pessoas.filter((p) => (p.ultimo_contato ?? '') >= corte30).length;
    const engajamento = total > 0 ? Math.round((comContato30 / total) * 100) : null;
    const semContato30 = total - comContato30;
    const novasSemana = pessoas.filter((p) => p.criado_em.slice(0, 10) >= corte7).length;

    // engajamento do mês anterior: pessoas com interação entre 60 e 30 dias atrás
    const corte60 = diasAtras(60);
    const comInteracaoMesAnterior = new Set(
      interacoes.filter((i) => i.data >= corte60 && i.data < corte30).map((i) => i.pessoa_id)
    ).size;
    const engajamentoAnterior = total > 0 ? Math.round((comInteracaoMesAnterior / total) * 100) : null;

    return { total, engajamento, engajamentoAnterior, semContato30, novasSemana };
  }, [pessoas, interacoes, corte30, corte7]);

  const saude: { label: string; cor: string } =
    metricas.engajamento == null
      ? { label: 'Sem dados', cor: 'text-text-secondary' }
      : metricas.engajamento > 70
        ? { label: 'Boa', cor: 'text-accent' }
        : metricas.engajamento >= 40
          ? { label: 'Atenção', cor: 'text-warning' }
          : { label: 'Crítico', cor: 'text-danger' };

  // -------------------------------------------------------------------------
  // Funil da semana: movimento desta semana vs. semana anterior
  // -------------------------------------------------------------------------
  const funilSemana = useMemo(() => {
    const corte14 = diasAtras(14);
    return ETAPAS_FUNIL.map((etapa) => {
      const nestaSemana = contatos.filter(
        (c) => c.etapa_jornada === etapa.valor && c.data_abordagem.slice(0, 10) >= corte7
      ).length;
      const semanaAnterior = contatos.filter(
        (c) =>
          c.etapa_jornada === etapa.valor &&
          c.data_abordagem.slice(0, 10) >= corte14 &&
          c.data_abordagem.slice(0, 10) < corte7
      ).length;
      return { ...etapa, nestaSemana, variacao: nestaSemana - semanaAnterior };
    });
  }, [contatos, corte7]);

  // -------------------------------------------------------------------------
  // Missionários: atividade da equipe
  // -------------------------------------------------------------------------
  const atividadeMissionarios = useMemo(() => {
    return membros
      .filter((m) => m.ativo)
      .map((m) => {
        const doMembro = interacoes.filter((i) => i.usuario_id === m.id);
        const estaSemana = doMembro.filter((i) => i.data >= corte7).length;
        const ultimoRegistro = doMembro.reduce<string | null>((max, i) => (max === null || i.data > max ? i.data : max), null);
        const diasSemRegistro = ultimoRegistro
          ? Math.round((new Date(hoje).getTime() - new Date(ultimoRegistro).getTime()) / 86400000)
          : null;
        const ativoNaMissao = diasSemRegistro != null && diasSemRegistro <= 7;
        return { membro: m, estaSemana, ultimoRegistro, diasSemRegistro, ativoNaMissao };
      })
      .sort((a, b) => Number(a.ativoNaMissao) - Number(b.ativoNaMissao));
  }, [membros, interacoes, corte7, hoje]);

  // -------------------------------------------------------------------------
  // Alertas agrupados (top 5 por nível — a lista completa fica em /alertas)
  // -------------------------------------------------------------------------
  const alertasPorNivel = useMemo(() => {
    const grupos: Record<NivelAlertaCentral, AlertaCentral[]> = { urgente: [], atencao: [], informativo: [] };
    for (const a of alertas) grupos[a.nivel].push(a);
    return grupos;
  }, [alertas]);

  // Saúde pastoral — resumo do bloco no dashboard
  const saudePastoral = useMemo(() => {
    const seteDias = diasAtras(7);
    const pastoresAtivosSemana = metricasPastores.filter(
      (m) => m.ultimoRegistro && m.ultimoRegistro >= seteDias
    ).length;
    const ovelhasEmAtraso = metricasPastores.reduce((s, m) => s + m.emAtraso, 0);
    const ovelhasEmRisco = metricasPastores.reduce((s, m) => s + m.emRisco, 0);
    const precisamAtencao = metricasPastores
      .filter((m) => !m.ultimoRegistro || m.ultimoRegistro < seteDias)
      .map((m) => ({
        pastor: m,
        diasSemRegistro: m.ultimoRegistro
          ? Math.round((new Date(hoje).getTime() - new Date(m.ultimoRegistro).getTime()) / 86400000)
          : null,
      }));
    return { total: metricasPastores.length, pastoresAtivosSemana, ovelhasEmAtraso, ovelhasEmRisco, precisamAtencao };
  }, [metricasPastores, hoje]);

  if (carregando) {
    return <p className="mt-6 text-sm text-text-secondary">Carregando visão da missão...</p>;
  }

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div>
      {/* Cabeçalho: saúde da missão */}
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-bg-card px-6 py-4 shadow-card">
        <span className="text-sm text-text-secondary">Saúde da missão:</span>
        <span className={`flex items-center gap-1.5 text-sm font-bold ${saude.cor}`}>
          <span className="h-2.5 w-2.5 rounded-full bg-current" /> {saude.label}
        </span>
        <span className="text-text-secondary">|</span>
        <span className="text-sm capitalize text-text-secondary">{mesAtual}</span>
        {comunidade && (
          <>
            <span className="text-text-secondary">|</span>
            <span className="text-sm font-medium text-text-primary">{comunidade.nome}</span>
          </>
        )}
      </div>

      {!!comunidade?.max_contatos && (
        <div className="mt-4">
          <LimiteContatosBanner
            usados={contatos.length}
            limite={comunidade.max_contatos}
            onUpgradeClick={() => setModalUpgrade(true)}
          />
        </div>
      )}
      {!!comunidade && (
        <UpgradePlanoModal open={modalUpgrade} onClose={() => setModalUpgrade(false)} planoAtual={comunidade.plano} />
      )}

      {/* Métricas que importam */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={Users}
          iconColor="primary"
          label="Pessoas ativas"
          value={metricas.total}
          subtitle={metricas.novasSemana > 0 ? `+${metricas.novasSemana} esta semana` : undefined}
        />
        <MetricCard
          icon={Activity}
          iconColor={
            metricas.engajamento == null
              ? 'primary'
              : metricas.engajamento > 70
                ? 'accent'
                : metricas.engajamento >= 40
                  ? 'warning'
                  : 'danger'
          }
          label="Engajamento (30d)"
          value={metricas.engajamento != null ? `${metricas.engajamento}%` : '—'}
          subtitle={
            metricas.engajamentoAnterior != null ? `vs ${metricas.engajamentoAnterior}% no mês anterior` : undefined
          }
        />
        <MetricCard
          icon={UserX}
          iconColor={metricas.semContato30 > 0 ? 'danger' : 'accent'}
          label="Sem contato >30d"
          value={metricas.semContato30}
          subtitle={metricas.semContato30 > 0 ? 'precisa atenção' : 'tudo em dia'}
        />
        <MetricCard
          icon={Tent}
          iconColor="warning"
          label="Retiro próximo"
          value={proximoRetiro ? new Date(proximoRetiro.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
          subtitle={proximoRetiro ? `${inscritosProximoRetiro} inscrito(s) · ${proximoRetiro.nome}` : 'nenhum agendado'}
        />
      </div>

      {/* Precisam de atenção */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary">Precisam de atenção</h2>
          <Link href="/alertas" className="text-xs font-medium text-primary hover:underline">
            Ver todos os alertas →
          </Link>
        </div>
        {alertas.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">Nenhum alerta no momento. Tudo em dia! 🎉</p>
        ) : (
          <div className="mt-3 space-y-4">
            {(['urgente', 'atencao', 'informativo'] as NivelAlertaCentral[]).map((nivel) => {
              const grupo = alertasPorNivel[nivel];
              if (grupo.length === 0) return null;
              const cfg = NIVEL_CONFIG[nivel];
              const Icone = cfg.icone;
              return (
                <div key={nivel}>
                  <p className={`flex items-center gap-1.5 text-xs font-bold tracking-wide ${cfg.cor}`}>
                    <Icone size={13} /> {cfg.label} ({grupo.length})
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {grupo.slice(0, 5).map((a) => (
                      <Link
                        key={a.id}
                        href={a.href}
                        className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:bg-bg-page"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-text-primary">{a.mensagem}</p>
                          {!!a.detalhe && <p className="truncate text-xs text-text-secondary">{a.detalhe}</p>}
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-text-secondary">
                          {a.modulo} <ChevronRight size={13} />
                        </span>
                      </Link>
                    ))}
                    {grupo.length > 5 && (
                      <Link href="/alertas" className="block px-3 py-1 text-xs font-medium text-primary hover:underline">
                        + {grupo.length - 5} outro(s)
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Funil da semana */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary">Funil da semana</h2>
          <Link href="/funil" className="text-xs font-medium text-primary hover:underline">
            Ver funil completo →
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          {funilSemana.map((etapa) => (
            <div key={etapa.valor} className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-text-primary">+{etapa.nestaSemana}</span>
              <span className="text-sm text-text-secondary">{etapa.label.toLowerCase()}</span>
              {etapa.variacao !== 0 && (
                <span className={`text-xs font-medium ${etapa.variacao > 0 ? 'text-accent' : 'text-danger'}`}>
                  ({etapa.variacao > 0 ? '▲' : '▼'} {Math.abs(etapa.variacao)} vs sem. ant.)
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Missionários — engajamento da equipe */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <h2 className="text-sm font-bold text-text-primary">Missionários</h2>
        {atividadeMissionarios.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">Nenhum membro ativo.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-page text-xs uppercase tracking-wide text-text-secondary">
                  <th className="px-3 py-2 font-semibold">Membro</th>
                  <th className="px-3 py-2 font-semibold">Contatos esta sem.</th>
                  <th className="px-3 py-2 font-semibold">Último registro</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {atividadeMissionarios.map(({ membro, estaSemana, ultimoRegistro, diasSemRegistro, ativoNaMissao }) => (
                  <tr key={membro.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 font-medium text-text-primary">{membro.nome}</td>
                    <td className="px-3 py-2 text-text-primary">{estaSemana}</td>
                    <td className="px-3 py-2 text-text-secondary">
                      {ultimoRegistro
                        ? diasSemRegistro === 0
                          ? 'hoje'
                          : diasSemRegistro === 1
                            ? 'ontem'
                            : `há ${diasSemRegistro} dias`
                        : 'nunca'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          ativoNaMissao ? 'text-accent' : 'text-warning'
                        }`}
                      >
                        {ativoNaMissao ? '✓ Ativo' : '⚠ Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Saúde pastoral (só aparece se a view de monitoria já existe) */}
      {saudePastoral.total > 0 && (
        <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <Gauge size={15} className="text-primary" /> Saúde pastoral
            </h2>
            <Link href="/pastoral/monitoria" className="text-xs font-medium text-primary hover:underline">
              Ver monitoria →
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <span className="text-text-secondary">
              Pastores ativos esta semana:{' '}
              <span className="font-bold text-text-primary">
                {saudePastoral.pastoresAtivosSemana} de {saudePastoral.total}
              </span>
            </span>
            <span className="text-text-secondary">
              Ovelhas em atraso:{' '}
              <span className={`font-bold ${saudePastoral.ovelhasEmAtraso > 0 ? 'text-warning' : 'text-text-primary'}`}>
                {saudePastoral.ovelhasEmAtraso}
              </span>
            </span>
            <span className="text-text-secondary">
              Ovelhas em risco:{' '}
              <span className={`font-bold ${saudePastoral.ovelhasEmRisco > 0 ? 'text-danger' : 'text-text-primary'}`}>
                {saudePastoral.ovelhasEmRisco}
              </span>
            </span>
          </div>
          {saudePastoral.precisamAtencao.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">Pastores que precisam de atenção</p>
              <div className="mt-1.5 space-y-1">
                {saudePastoral.precisamAtencao.map(({ pastor, diasSemRegistro }) => (
                  <Link
                    key={pastor.pastorId}
                    href={`/pastoral/monitoria?pastor=${pastor.pastorId}`}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-bg-page"
                  >
                    <span className="text-text-primary">
                      {pastor.pastorNome} —{' '}
                      {diasSemRegistro != null
                        ? `${diasSemRegistro} dias sem registrar encontro`
                        : 'nunca registrou encontro'}
                    </span>
                    <ChevronRight size={14} className="text-text-secondary" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ações rápidas + acessados recentemente */}
      <div className="mt-6">
        <QuickActions />
      </div>
      <div className="mt-6">
        <AcessadosRecentemente />
      </div>
    </div>
  );
}
