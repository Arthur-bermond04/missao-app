'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Users, UserPlus, HeartHandshake, Tent, Wallet, HandHeart, Heart, IdCard } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { resumoMinisterios } from '@/lib/ministerios';
import { resumoPastoral, type ResumoPastoral } from '@/lib/pastoral';
import { resumoPessoas, type ResumoPessoas } from '@/lib/pessoas';
import { FunilBarChart } from '@/components/dashboard/FunilBarChart';
import { MembrosLineChart } from '@/components/dashboard/MembrosLineChart';
import { ReceitaDespesaChart } from '@/components/dashboard/ReceitaDespesaChart';
import { LimiteContatosBanner } from '@/components/dashboard/LimiteContatosBanner';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { OnboardingBanner } from '@/components/dashboard/OnboardingBanner';
import { AcessadosRecentemente } from '@/components/dashboard/AcessadosRecentemente';
import { UpgradePlanoModal } from '@/components/configuracoes/UpgradePlanoModal';
import { buscarComunidade } from '@/lib/comunidades';
import { ETAPAS_FUNIL, type Comunidade, type Contato, type Financeiro, type Retiro, type Usuario } from '@/types/database';

function percentualVariacao(atual: number, anterior: number): number | undefined {
  if (anterior === 0) return undefined;
  return ((atual - anterior) / anterior) * 100;
}

function inicioMes(offsetMeses = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMeses, 1);
  return d.toISOString().slice(0, 10);
}

function mesLabel(dataIso: string) {
  const [ano, mes] = dataIso.split('-');
  return `${mes}/${ano}`;
}

export default function DashboardPage() {
  const { usuario } = usePainelSession();

  const [membros, setMembros] = useState<Usuario[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [celulasAtivas, setCelulasAtivas] = useState(0);
  const [proximoRetiro, setProximoRetiro] = useState<Retiro | null>(null);
  const [inscritosProximoRetiro, setInscritosProximoRetiro] = useState(0);
  const [financeiro, setFinanceiro] = useState<Financeiro[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [comunidade, setComunidade] = useState<Comunidade | null>(null);
  const [modalUpgradeAberto, setModalUpgradeAberto] = useState(false);
  const [resumoMin, setResumoMin] = useState<{ totalAtivos: number; totalMembros: number; saldo: number } | null>(null);
  const [resumoPast, setResumoPast] = useState<ResumoPastoral | null>(null);
  const [resumoPes, setResumoPes] = useState<ResumoPessoas | null>(null);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    buscarComunidade(usuario.comunidade_id).then(setComunidade).catch(() => setComunidade(null));
  }, [usuario?.comunidade_id]);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    const comunidadeId = usuario.comunidade_id;
    resumoMinisterios(comunidadeId).then(setResumoMin).catch(() => setResumoMin(null));
    resumoPastoral(comunidadeId).then(setResumoPast).catch(() => setResumoPast(null));
    resumoPessoas(comunidadeId).then(setResumoPes).catch(() => setResumoPes(null));
  }, [usuario?.comunidade_id]);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    const comunidadeId = usuario.comunidade_id;
    setCarregandoDados(true);

    Promise.all([
      supabase.from('usuarios').select('*').eq('comunidade_id', comunidadeId),
      supabase.from('contatos').select('*').eq('comunidade_id', comunidadeId),
      supabase
        .from('celulas')
        .select('id', { count: 'exact', head: true })
        .eq('comunidade_id', comunidadeId)
        .eq('ativa', true),
      supabase
        .from('retiros')
        .select('*')
        .eq('comunidade_id', comunidadeId)
        .gte('data_inicio', new Date().toISOString().slice(0, 10))
        .order('data_inicio', { ascending: true })
        .limit(1),
      supabase.from('financeiro').select('*').eq('comunidade_id', comunidadeId),
    ]).then(async ([usuariosRes, contatosRes, celulasRes, retirosRes, financeiroRes]) => {
      setMembros((usuariosRes.data as Usuario[]) ?? []);
      setContatos((contatosRes.data as Contato[]) ?? []);
      setCelulasAtivas(celulasRes.count ?? 0);
      setFinanceiro((financeiroRes.data as Financeiro[]) ?? []);

      const retiro = (retirosRes.data as Retiro[])?.[0] ?? null;
      setProximoRetiro(retiro);
      if (retiro) {
        const { count } = await supabase
          .from('inscricoes_retiro')
          .select('id', { count: 'exact', head: true })
          .eq('retiro_id', retiro.id);
        setInscritosProximoRetiro(count ?? 0);
      }
      setCarregandoDados(false);
    });
  }, [usuario?.comunidade_id]);

  const membrosAtivos = membros.filter((m) => m.ativo).length;
  const membrosAtivosAnterior = membros.filter((m) => m.ativo && m.criado_em.slice(0, 10) < inicioMes(0)).length;
  const contatosAnterior = contatos.filter((c) => c.data_abordagem.slice(0, 10) < inicioMes(0)).length;

  const arrecadacaoMes = useMemo(() => {
    const inicio = inicioMes(0);
    return financeiro
      .filter((f) => f.tipo === 'receita' && f.data >= inicio)
      .reduce((soma, f) => soma + f.valor, 0);
  }, [financeiro]);

  const arrecadacaoMesAnterior = useMemo(() => {
    const inicio = inicioMes(-1);
    const fim = inicioMes(0);
    return financeiro
      .filter((f) => f.tipo === 'receita' && f.data >= inicio && f.data < fim)
      .reduce((soma, f) => soma + f.valor, 0);
  }, [financeiro]);

  const funilDoMes = useMemo(() => {
    const inicio = inicioMes(0);
    const contatosDoMes = contatos.filter((c) => c.data_abordagem >= inicio);
    return ETAPAS_FUNIL.map((etapa, index) => {
      const total = contatosDoMes.filter((c) => {
        const indiceContato = ETAPAS_FUNIL.findIndex((e) => e.valor === c.etapa_jornada);
        return indiceContato >= index;
      }).length;
      return { ...etapa, total };
    });
  }, [contatos]);

  const evolucaoMembros = useMemo(() => {
    const meses = Array.from({ length: 6 }, (_, i) => inicioMes(-(5 - i)).slice(0, 7));
    return meses.map((mesChave) => ({
      mes: mesLabel(`${mesChave}-01`),
      total: membros.filter((m) => m.criado_em.slice(0, 7) <= mesChave).length,
    }));
  }, [membros]);

  const receitasDespesas3Meses = useMemo(() => {
    const meses = Array.from({ length: 3 }, (_, i) => inicioMes(-(2 - i)).slice(0, 7));
    return meses.map((mesChave) => {
      const doMes = financeiro.filter((f) => f.data.slice(0, 7) === mesChave);
      return {
        mes: mesLabel(`${mesChave}-01`),
        receitas: doMes.filter((f) => f.tipo === 'receita').reduce((s, f) => s + f.valor, 0),
        despesas: doMes.filter((f) => f.tipo === 'despesa').reduce((s, f) => s + f.valor, 0),
      };
    });
  }, [financeiro]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={LayoutDashboard} title="Dashboard" subtitle="Visão geral da comunidade" />

      {!!comunidade?.max_contatos && (
        <div className="mt-6">
          <LimiteContatosBanner
            usados={contatos.length}
            limite={comunidade.max_contatos}
            onUpgradeClick={() => setModalUpgradeAberto(true)}
          />
        </div>
      )}
      {!!comunidade && (
        <UpgradePlanoModal
          open={modalUpgradeAberto}
          onClose={() => setModalUpgradeAberto(false)}
          planoAtual={comunidade.plano}
        />
      )}

      {carregandoDados ? (
        <p className="mt-6 text-sm text-text-secondary">Carregando dados...</p>
      ) : (
        <>
          {/* Onboarding: só quando a comunidade está zerada */}
          {usuario && membrosAtivos <= 1 && contatos.length === 0 && !proximoRetiro && (
            <OnboardingBanner usuario={usuario} />
          )}

          {/* Cards */}
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <MetricCard
              icon={Users}
              iconColor="primary"
              label="Membros ativos"
              value={membrosAtivos}
              delta={
                membrosAtivosAnterior > 0
                  ? { value: percentualVariacao(membrosAtivos, membrosAtivosAnterior) ?? 0 }
                  : undefined
              }
            />
            <MetricCard
              icon={UserPlus}
              iconColor="primary"
              label="Contatos cadastrados"
              value={contatos.length}
              delta={
                contatosAnterior > 0
                  ? { value: percentualVariacao(contatos.length, contatosAnterior) ?? 0 }
                  : undefined
              }
            />
            <MetricCard icon={HeartHandshake} iconColor="accent" label="Células ativas" value={celulasAtivas} />
            <MetricCard
              icon={Tent}
              iconColor="warning"
              label="Inscritos no próximo retiro"
              value={proximoRetiro ? inscritosProximoRetiro : '—'}
              subtitle={proximoRetiro?.nome}
            />
            <MetricCard
              icon={Wallet}
              iconColor="primary"
              label="Arrecadação do mês"
              value={`R$ ${arrecadacaoMes.toFixed(2)}`}
              delta={
                arrecadacaoMesAnterior > 0
                  ? { value: percentualVariacao(arrecadacaoMes, arrecadacaoMesAnterior) ?? 0 }
                  : undefined
              }
            />
          </div>

          {/* Pessoas + Ministérios + Pastoral */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link href="/pessoas" className="rounded-lg bg-bg-card p-5 shadow-card transition-all hover:shadow-hover">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-xlight text-primary">
                  <IdCard size={16} />
                </div>
                <h3 className="text-sm font-bold text-text-primary">Pessoas</h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="text-text-secondary">
                  Total: <span className="font-bold text-text-primary">{resumoPes?.total ?? 0}</span>
                </span>
                <span className="text-text-secondary">
                  Contatos vencidos:{' '}
                  <span className={`font-bold ${(resumoPes?.vencidas ?? 0) > 0 ? 'text-danger' : 'text-text-primary'}`}>
                    {resumoPes?.vencidas ?? 0}
                  </span>
                </span>
                <span className="text-text-secondary">
                  Novas na semana: <span className="font-bold text-text-primary">{resumoPes?.novasSemana ?? 0}</span>
                </span>
              </div>
            </Link>

            <Link href="/ministerios" className="rounded-lg bg-bg-card p-5 shadow-card transition-all hover:shadow-hover">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-xlight text-primary">
                  <HandHeart size={16} />
                </div>
                <h3 className="text-sm font-bold text-text-primary">Ministérios</h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="text-text-secondary">
                  Ativos: <span className="font-bold text-text-primary">{resumoMin?.totalAtivos ?? 0}</span>
                </span>
                <span className="text-text-secondary">
                  Membros: <span className="font-bold text-text-primary">{resumoMin?.totalMembros ?? 0}</span>
                </span>
                <span className="text-text-secondary">
                  Saldo dos caixas:{' '}
                  <span className="font-bold text-accent">R$ {(resumoMin?.saldo ?? 0).toFixed(2)}</span>
                </span>
              </div>
            </Link>

            <Link href="/pastoral" className="rounded-lg bg-bg-card p-5 shadow-card transition-all hover:shadow-hover">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-xlight text-primary">
                  <Heart size={16} />
                </div>
                <h3 className="text-sm font-bold text-text-primary">Pastoral</h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="text-text-secondary">
                  Ovelhas: <span className="font-bold text-text-primary">{resumoPast?.totalAtivas ?? 0}</span>
                </span>
                <span className="text-text-secondary">
                  Atenção/Risco:{' '}
                  <span
                    className={`font-bold ${
                      (resumoPast?.atencao ?? 0) + (resumoPast?.risco ?? 0) > 0 ? 'text-danger' : 'text-text-primary'
                    }`}
                  >
                    {(resumoPast?.atencao ?? 0) + (resumoPast?.risco ?? 0)}
                  </span>
                </span>
                <span className="text-text-secondary">
                  Reuniões esta semana:{' '}
                  <span className="font-bold text-text-primary">{resumoPast?.proximasReunioesSemana ?? 0}</span>
                </span>
              </div>
            </Link>
          </div>

          {/* Ações rápidas */}
          <div className="mt-6">
            <QuickActions />
          </div>

          <div className="mt-6">
            <AcessadosRecentemente />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Funil do mês */}
            <div className="rounded-lg bg-bg-card p-6 shadow-card">
              <h2 className="text-sm font-bold text-text-primary">Funil do mês</h2>
              <div className="mt-3">
                <FunilBarChart data={funilDoMes} />
              </div>
            </div>

            {/* Evolução de membros */}
            <div className="rounded-lg bg-bg-card p-6 shadow-card">
              <h2 className="text-sm font-bold text-text-primary">Evolução de membros (6 meses)</h2>
              <div className="mt-3">
                <MembrosLineChart data={evolucaoMembros} />
              </div>
            </div>

            {/* Receitas x despesas */}
            <div className="rounded-lg bg-bg-card p-6 shadow-card">
              <h2 className="text-sm font-bold text-text-primary">Receitas x despesas (3 meses)</h2>
              <div className="mt-3">
                <ReceitaDespesaChart data={receitasDespesas3Meses} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
