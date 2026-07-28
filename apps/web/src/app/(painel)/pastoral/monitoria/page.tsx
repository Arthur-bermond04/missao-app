'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gauge, Lock, Send, ShieldAlert, Users, X } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { EstadoEspiritualBadge } from '@/components/pastoral/badges';
import { exportarExcel } from '@/lib/exportacao';
import { enviarMensagem } from '@/lib/mensagens';
import {
  agruparMetricasPorPastor,
  listarOvelhasResumo,
  ovelhaEmAtraso,
  statusPastor,
  type MetricasPastor,
  type OvelhaResumo,
  type StatusPastor,
} from '@/lib/monitoria';
import { toastError, toastSuccess } from '@/lib/toast';
import { useTerminologia } from '@/lib/terminologia';
import type { Canal } from '@/types/database';

const PERFIS_GESTAO = ['coordenador', 'admin'];

const STATUS_CONFIG: Record<StatusPastor, { label: string; cor: string; icone: string }> = {
  ativo: { label: 'Pastor ativo', cor: 'text-accent', icone: '✓' },
  atencao: { label: 'Atenção', cor: 'text-warning', icone: '⚠' },
  inativo: { label: 'Pastor inativo', cor: 'text-danger', icone: '✗' },
};

export default function MonitoriaPastoralPage() {
  const { usuario } = usePainelSession();
  const terminologia = useTerminologia();

  const [ovelhas, setOvelhas] = useState<OvelhaResumo[]>([]);
  const [pastores, setPastores] = useState<{ id: string; nome: string }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroPastor, setFiltroPastor] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [detalhe, setDetalhe] = useState<MetricasPastor | null>(null);
  const [lembretePara, setLembretePara] = useState<MetricasPastor | null>(null);

  const podeAcessar = usuario ? PERFIS_GESTAO.includes(usuario.perfil) : false;

  const carregar = useCallback(async () => {
    if (!usuario?.comunidade_id) return;
    setCarregando(true);
    try {
      const [resumo, { data: usuariosData }] = await Promise.all([
        listarOvelhasResumo(usuario.comunidade_id),
        supabase
          .from('usuarios')
          .select('id, nome')
          .eq('comunidade_id', usuario.comunidade_id)
          .order('nome', { ascending: true }),
      ]);
      setOvelhas(resumo);
      setPastores((usuariosData as { id: string; nome: string }[]) ?? []);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao carregar métricas.');
    } finally {
      setCarregando(false);
    }
  }, [usuario?.comunidade_id]);

  useEffect(() => {
    if (podeAcessar) carregar();
    else setCarregando(false);
  }, [podeAcessar, carregar]);

  const metricas = useMemo(() => agruparMetricasPorPastor(ovelhas, pastores), [ovelhas, pastores]);

  const metricasFiltradas = useMemo(() => {
    return metricas.filter((m) => {
      if (filtroPastor && m.pastorId !== filtroPastor) return false;
      if (filtroStatus && statusPastor(m.taxaCumprimento) !== filtroStatus) return false;
      return true;
    });
  }, [metricas, filtroPastor, filtroStatus]);

  const resumoGeral = useMemo(() => {
    return {
      totalPastores: metricas.length,
      ovelhasAtivas: ovelhas.length,
      emAtraso: ovelhas.filter(ovelhaEmAtraso).length,
      emRisco: ovelhas.filter((o) => o.estado_espiritual === 'risco').length,
    };
  }, [metricas, ovelhas]);

  function exportar() {
    exportarExcel(
      metricasFiltradas,
      [
        { header: 'Pastor', render: (m) => m.pastorNome },
        { header: 'Ovelhas ativas', render: (m) => m.ovelhasAtivas },
        { header: 'Encontros no mês', render: (m) => m.encontrosMes },
        { header: 'Em atraso', render: (m) => m.emAtraso },
        { header: 'Em risco', render: (m) => m.emRisco },
        {
          header: 'Último registro',
          render: (m) => (m.ultimoRegistro ? new Date(m.ultimoRegistro).toLocaleDateString('pt-BR') : 'nunca'),
        },
        { header: 'Taxa de cumprimento (%)', render: (m) => m.taxaCumprimento },
      ],
      'monitoria-pastoral.xlsx',
      'Monitoria'
    );
  }

  if (!podeAcessar) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader icon={Gauge} title="Monitoria Pastoral" subtitle="Acesso restrito" />
        <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
          <EmptyState
            icon={Lock}
            title="Acesso restrito"
            description="A monitoria pastoral é visível apenas para coordenadores e administradores."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={Gauge}
        title="Monitoria Pastoral"
        subtitle="Acompanhamento dos pastores da comunidade"
        actions={
          <Button variant="secondary" onClick={exportar}>
            Exportar Excel
          </Button>
        }
      />

      {/* Aviso de confidencialidade */}
      <div className="mt-6 flex items-center gap-2 rounded-md bg-primary-xlight px-3 py-2 text-xs text-primary-dark">
        <Lock size={14} />
        Você está vendo métricas de acompanhamento — os relatos dos encontros são confidenciais e visíveis apenas pelo
        pastor responsável.
      </div>

      {carregando ? (
        <p className="mt-6 text-sm text-text-secondary">Carregando métricas...</p>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard icon={Users} iconColor="primary" label="Total de pastores" value={resumoGeral.totalPastores} />
            <MetricCard
              icon={Users}
              iconColor="accent"
              label={`${terminologia.nome_ovelha}s ativas`}
              value={resumoGeral.ovelhasAtivas}
            />
            <MetricCard
              icon={ShieldAlert}
              iconColor={resumoGeral.emAtraso > 0 ? 'warning' : 'accent'}
              label="Em atraso"
              value={resumoGeral.emAtraso}
            />
            <MetricCard
              icon={ShieldAlert}
              iconColor={resumoGeral.emRisco > 0 ? 'danger' : 'accent'}
              label="Em risco"
              value={resumoGeral.emRisco}
            />
          </div>

          {/* Filtros */}
          <div className="mt-6 flex flex-wrap gap-3 rounded-lg bg-bg-card p-4 shadow-card">
            <Select
              value={filtroPastor}
              onChange={(e) => setFiltroPastor(e.target.value)}
              options={[
                { value: '', label: 'Todos os pastores' },
                ...metricas.map((m) => ({ value: m.pastorId, label: m.pastorNome })),
              ]}
            />
            <Select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              options={[
                { value: '', label: 'Todos os status' },
                { value: 'ativo', label: 'Ativos' },
                { value: 'atencao', label: 'Em atenção' },
                { value: 'inativo', label: 'Inativos' },
              ]}
            />
          </div>

          {/* Tabela de pastores */}
          <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
            {metricasFiltradas.length === 0 ? (
              <EmptyState icon={Gauge} title="Nenhum pastor com acompanhamento" description="Ninguém tem ovelhas ativas ainda." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-page text-xs uppercase tracking-wide text-text-secondary">
                      <th className="px-3 py-2 font-semibold">Pastor</th>
                      <th className="px-3 py-2 font-semibold">Ovelhas</th>
                      <th className="px-3 py-2 font-semibold">Enc./mês</th>
                      <th className="px-3 py-2 font-semibold">Em atraso</th>
                      <th className="px-3 py-2 font-semibold">Em risco</th>
                      <th className="px-3 py-2 font-semibold">Último registro</th>
                      <th className="px-3 py-2 font-semibold">Taxa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricasFiltradas.map((m) => {
                      const status = statusPastor(m.taxaCumprimento);
                      const cfg = STATUS_CONFIG[status];
                      return (
                        <tr
                          key={m.pastorId}
                          onClick={() => setDetalhe(m)}
                          className="cursor-pointer border-b border-border last:border-b-0 hover:bg-primary-xlight/40"
                        >
                          <td className="px-3 py-2.5 font-medium text-text-primary">{m.pastorNome}</td>
                          <td className="px-3 py-2.5 text-text-primary">{m.ovelhasAtivas}</td>
                          <td className="px-3 py-2.5 text-text-primary">{m.encontrosMes}</td>
                          <td className={`px-3 py-2.5 ${m.emAtraso > 0 ? 'font-semibold text-warning' : 'text-text-primary'}`}>
                            {m.emAtraso}
                          </td>
                          <td className={`px-3 py-2.5 ${m.emRisco > 0 ? 'font-semibold text-danger' : 'text-text-primary'}`}>
                            {m.emRisco}
                          </td>
                          <td className="px-3 py-2.5 text-text-secondary">
                            {m.ultimoRegistro ? new Date(m.ultimoRegistro).toLocaleDateString('pt-BR') : 'nunca'}
                          </td>
                          <td className={`px-3 py-2.5 font-bold ${cfg.cor}`}>
                            {m.taxaCumprimento}% {cfg.icone}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Painel lateral de detalhe */}
      {detalhe && (
        <PainelPastor
          metricas={detalhe}
          onClose={() => setDetalhe(null)}
          onEnviarLembrete={() => {
            setLembretePara(detalhe);
            setDetalhe(null);
          }}
        />
      )}

      {/* Modal enviar lembrete */}
      {lembretePara && usuario?.comunidade_id && (
        <LembreteModal
          pastor={lembretePara}
          comunidadeId={usuario.comunidade_id}
          remetenteId={usuario.id}
          onClose={() => setLembretePara(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel lateral — detalhe do pastor (só métricas, aviso de confidencialidade)
// ---------------------------------------------------------------------------
function PainelPastor({
  metricas,
  onClose,
  onEnviarLembrete,
}: {
  metricas: MetricasPastor;
  onClose: () => void;
  onEnviarLembrete: () => void;
}) {
  const status = statusPastor(metricas.taxaCumprimento);
  const cfg = STATUS_CONFIG[status];
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 flex h-full w-full max-w-md flex-col overflow-y-auto bg-bg-card shadow-hover">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{metricas.pastorNome}</h2>
            <p className={`text-sm font-semibold ${cfg.cor}`}>
              {cfg.icone} {cfg.label}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-text-secondary hover:bg-bg-page">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Métricas do mês */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Métricas do mês</h3>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-text-secondary">Encontros realizados</p>
                <p className="mt-1 text-lg font-bold text-text-primary">
                  {metricas.encontrosMes} de {metricas.ovelhasAtivas}
                </p>
                <p className="text-xs text-text-secondary">{metricas.taxaCumprimento}% de cumprimento</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-text-secondary">Ovelhas em atraso</p>
                <p className={`mt-1 text-lg font-bold ${metricas.emAtraso > 0 ? 'text-warning' : 'text-text-primary'}`}>
                  {metricas.emAtraso}
                </p>
              </div>
            </div>
          </div>

          {/* Lista de ovelhas — só métricas */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Suas ovelhas</h3>
            <div className="mt-2 space-y-2">
              {metricas.ovelhas.map((o) => {
                const atraso = ovelhaEmAtraso(o);
                return (
                  <div key={o.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-text-primary">{o.nome}</span>
                      <EstadoEspiritualBadge estado={o.estado_espiritual} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-text-secondary">
                      <span>
                        Último:{' '}
                        {o.ultimo_encontro ? new Date(o.ultimo_encontro).toLocaleDateString('pt-BR') : 'nenhum'}
                      </span>
                      <span>
                        Próxima:{' '}
                        {o.proxima_reuniao ? new Date(o.proxima_reuniao).toLocaleDateString('pt-BR') : 'não agendada'}
                      </span>
                      {atraso && <span className="font-semibold text-warning">⚠ em atraso</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aviso de confidencialidade */}
          <div className="rounded-md bg-primary-xlight px-3 py-2 text-xs text-primary-dark">
            <Lock size={12} className="mr-1 inline" />
            Os relatos e observações de cada encontro são confidenciais e visíveis apenas pelo pastor responsável.
          </div>

          {(status === 'atencao' || status === 'inativo') && (
            <Button fullWidth icon={Send} onClick={onEnviarLembrete}>
              Enviar lembrete
            </Button>
          )}

          <p className="text-center text-[11px] text-text-secondary">Dados referentes a {new Date(hoje).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de lembrete — mensagem genérica (não expõe qual ovelha está em atraso)
// ---------------------------------------------------------------------------
function LembreteModal({
  pastor,
  comunidadeId,
  remetenteId,
  onClose,
}: {
  pastor: MetricasPastor;
  comunidadeId: string;
  remetenteId: string;
  onClose: () => void;
}) {
  const [canal, setCanal] = useState<Canal>('whatsapp');
  const [corpo, setCorpo] = useState(
    `Olá ${pastor.pastorNome.split(' ')[0]}! Lembrete de que algumas ovelhas estão aguardando seu acompanhamento. ` +
      `Você tem reuniões pendentes esta semana. Que Deus abençoe sua missão! 🙏`
  );
  const [enviando, setEnviando] = useState(false);

  async function handleEnviar() {
    setEnviando(true);
    try {
      await enviarMensagem({
        comunidade_id: comunidadeId,
        remetente_id: remetenteId,
        canal,
        destinatarios: pastor.pastorNome,
        titulo: 'Lembrete pastoral',
        corpo,
      });
      toastSuccess('Lembrete enviado!');
      onClose();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao enviar lembrete.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Enviar lembrete">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-text-secondary">Para</p>
          <p className="text-sm font-medium text-text-primary">{pastor.pastorNome}</p>
        </div>
        <Select
          label="Canal"
          value={canal}
          onChange={(e) => setCanal(e.target.value as Canal)}
          options={[
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'push', label: 'Push' },
          ]}
        />
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-secondary">Mensagem</label>
          <textarea
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-xs text-text-secondary">
            A mensagem é genérica de propósito — não revela quais ovelhas estão em atraso.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button icon={Send} onClick={handleEnviar} loading={enviando}>
            Enviar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
