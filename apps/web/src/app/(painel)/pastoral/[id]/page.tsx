'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Lock,
  MoreVertical,
  Pencil,
  Play,
  ShieldAlert,
  AlertTriangle,
  Info,
  Trash2,
} from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EstadoEspiritualBadge, EtapaBadge, EstadoEncontroBadge } from '@/components/pastoral/badges';
import { EstadoTimeline } from '@/components/pastoral/EstadoTimeline';
import { JornadaTimeline } from '@/components/pastoral/JornadaTimeline';
import { ObjetivosSecao } from '@/components/pastoral/ObjetivosSecao';
import { TransferirOvelhaModal } from '@/components/pastoral/TransferirOvelhaModal';
import { RegistrarEncontroPastoralModal } from '@/components/pastoral/RegistrarEncontroPastoralModal';
import { RegistrarPresencaModal } from '@/components/pastoral/RegistrarPresencaModal';
import { FrutosSecao } from '@/components/pastoral/FrutosSecao';
import {
  arquivarOvelha,
  atualizarOvelha,
  avaliarOvelha,
  buscarOvelha,
  excluirEncontroPastoral,
  excluirOvelha,
  listarEncontrosPastorais,
  listarFrutos,
  listarObjetivos,
  listarPresencasOvelha,
  scoreEstadoEncontro,
} from '@/lib/pastoral';
import { labelEtapaFormacao, useTerminologia } from '@/lib/terminologia';
import { listarRetirosDaPessoa } from '@/lib/pessoas';
import { registrarAcessoRecente } from '@/lib/recentes';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  ETAPAS_FORMACAO,
  FREQUENCIAS_ACOMPANHAMENTO,
  TEMAS_PASTORAL,
  type EtapaFormacao,
  type FrequenciaAcompanhamento,
  type PastoralEncontro,
  type PastoralFruto,
  type PastoralObjetivo,
  type PastoralOvelha,
  type PastoralPresenca,
  type PessoaRetiro,
  type Usuario,
} from '@/types/database';

const TEMA_LABEL = Object.fromEntries(TEMAS_PASTORAL.map((t) => [t.valor, t.label]));

type Aba = 'hoje' | 'encontros' | 'agenda' | 'frutos' | 'presenca' | 'dados';

const ABAS: { valor: Aba; label: string }[] = [
  { valor: 'hoje', label: 'Hoje' },
  { valor: 'encontros', label: 'Encontros' },
  { valor: 'agenda', label: 'Agenda' },
  { valor: 'frutos', label: 'Frutos' },
  { valor: 'presenca', label: 'Presença' },
  { valor: 'dados', label: 'Dados' },
];

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

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

// ---------------------------------------------------------------------------
// Mini-calendário mensal (aba Agenda)
// ---------------------------------------------------------------------------
function CalendarioMensal({
  encontros,
  proximaReuniao,
}: {
  encontros: PastoralEncontro[];
  proximaReuniao: string | null;
}) {
  const [mesBase, setMesBase] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const hoje = hojeIso();
  const datasEncontros = useMemo(() => new Set(encontros.map((e) => e.data.slice(0, 10))), [encontros]);

  const dias = useMemo(() => {
    const primeiro = new Date(mesBase);
    const ultimoDia = new Date(mesBase.getFullYear(), mesBase.getMonth() + 1, 0).getDate();
    // offset: seg=0 ... dom=6
    const offset = primeiro.getDay() === 0 ? 6 : primeiro.getDay() - 1;
    const celulas: ({ iso: string; numero: number } | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= ultimoDia; d++) {
      const iso = `${mesBase.getFullYear()}-${String(mesBase.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      celulas.push({ iso, numero: d });
    }
    return celulas;
  }, [mesBase]);

  function mudarMes(delta: number) {
    setMesBase((atual) => {
      const d = new Date(atual);
      d.setMonth(d.getMonth() + delta, 1);
      return d;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <button onClick={() => mudarMes(-1)} className="rounded-md p-1 text-text-secondary hover:bg-bg-page">
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold capitalize text-text-primary">
          {mesBase.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
        <button onClick={() => mudarMes(1)} className="rounded-md p-1 text-text-secondary hover:bg-bg-page">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l, i) => (
          <span key={i} className="text-[10px] font-semibold text-text-secondary">
            {l}
          </span>
        ))}
        {dias.map((dia, i) =>
          dia === null ? (
            <span key={`v-${i}`} />
          ) : (
            <div
              key={dia.iso}
              className={`flex flex-col items-center rounded-md py-1 ${dia.iso === hoje ? 'bg-primary-xlight' : ''}`}
            >
              <span className={`text-xs ${dia.iso === hoje ? 'font-bold text-primary' : 'text-text-primary'}`}>
                {dia.numero}
              </span>
              <span className="flex h-1.5 items-center gap-0.5">
                {datasEncontros.has(dia.iso) && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                {proximaReuniao === dia.iso && (
                  <span className={`h-1.5 w-1.5 rounded-full ${dia.iso < hoje ? 'bg-danger' : 'bg-accent'}`} />
                )}
              </span>
            </div>
          )
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary" /> Encontro registrado
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-accent" /> Reunião agendada
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-danger" /> Reunião vencida
        </span>
      </div>
    </div>
  );
}

export default function PerfilOvelhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { usuario } = usePainelSession();
  const router = useRouter();
  const terminologia = useTerminologia();

  const [aba, setAba] = useState<Aba>('hoje');
  const [ovelha, setOvelha] = useState<PastoralOvelha | null>(null);
  const [encontros, setEncontros] = useState<PastoralEncontro[]>([]);
  const [presencas, setPresencas] = useState<PastoralPresenca[]>([]);
  const [objetivos, setObjetivos] = useState<PastoralObjetivo[]>([]);
  const [frutos, setFrutos] = useState<PastoralFruto[]>([]);
  const [retirosDaPessoa, setRetirosDaPessoa] = useState<PessoaRetiro[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [modalExcluirOvelha, setModalExcluirOvelha] = useState(false);
  const [encontroParaExcluir, setEncontroParaExcluir] = useState<PastoralEncontro | null>(null);
  const [modalEncontro, setModalEncontro] = useState(false);
  const [modalPresenca, setModalPresenca] = useState(false);
  const [modalTransferir, setModalTransferir] = useState(false);
  const [editando, setEditando] = useState<PastoralEncontro | null>(null);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const [agendandoReuniao, setAgendandoReuniao] = useState(false);
  const [novaDataReuniao, setNovaDataReuniao] = useState('');

  const carregar = useCallback(() => {
    setCarregando(true);
    Promise.all([
      buscarOvelha(id),
      listarEncontrosPastorais(id),
      listarPresencasOvelha(id),
      listarObjetivos(id),
      listarFrutos(id),
    ])
      .then(([o, e, p, obj, fr]) => {
        setOvelha(o);
        setEncontros(e);
        setPresencas(p);
        setObjetivos(obj);
        setFrutos(fr);
        if (o) {
          registrarAcessoRecente({ tipo: 'ovelha', id: o.id, titulo: o.nome, href: `/pastoral/${o.id}` });
          if (o.pessoa_id) listarRetirosDaPessoa(o.pessoa_id).then(setRetirosDaPessoa);
        }
      })
      .finally(() => setCarregando(false));
  }, [id]);

  useEffect(carregar, [carregar]);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    supabase
      .from('usuarios')
      .select('*')
      .eq('comunidade_id', usuario.comunidade_id)
      .order('nome', { ascending: true })
      .then(({ data }) => setUsuarios((data as Usuario[]) ?? []));
  }, [usuario?.comunidade_id]);

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

  // presença: % últimos 3 meses + contagem por tipo de evento
  const estatisticasPresenca = useMemo(() => {
    const corte = new Date();
    corte.setMonth(corte.getMonth() - 3);
    const corteIso = corte.toISOString().slice(0, 10);
    const recentes = presencas.filter((p) => p.data >= corteIso);
    const presentes = recentes.filter((p) => p.presente).length;
    const pct = recentes.length > 0 ? Math.round((presentes / recentes.length) * 100) : null;
    const porTipo = new Map<string, { total: number; presentes: number }>();
    for (const p of presencas) {
      const chave = p.nome_evento || p.tipo_evento;
      const atual = porTipo.get(chave) ?? { total: 0, presentes: 0 };
      atual.total += 1;
      if (p.presente) atual.presentes += 1;
      porTipo.set(chave, atual);
    }
    return { pct, porTipo: Array.from(porTipo.entries()) };
  }, [presencas]);

  const ultimoEncontro = useMemo(
    () => [...encontros].sort((a, b) => b.data.localeCompare(a.data))[0] ?? null,
    [encontros]
  );

  const ultimaObservacao = useMemo(
    () => [...encontros].sort((a, b) => b.data.localeCompare(a.data)).find((e) => e.encaminhamentos)?.encaminhamentos ?? null,
    [encontros]
  );

  if (carregando) {
    return <p className="text-sm text-text-secondary">Carregando...</p>;
  }
  if (!ovelha) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-text-secondary">Registro não encontrado ou sem acesso.</p>
        <Link href="/pastoral" className="mt-2 inline-block text-sm text-primary">
          Voltar
        </Link>
      </div>
    );
  }

  const hoje = hojeIso();
  const freqLabel = FREQUENCIAS_ACOMPANHAMENTO.find((f) => f.valor === ovelha.frequencia_acompanhamento)?.label ?? '';
  const pctEncontros =
    indicadores && indicadores.encontrosPrevistos > 0
      ? Math.round((indicadores.encontrosRealizados / indicadores.encontrosPrevistos) * 100)
      : 0;
  const pastorNome = usuarios.find((u) => u.id === ovelha.pastor_id)?.nome ?? '—';
  const reuniaoVencida = !!ovelha.proxima_reuniao && ovelha.proxima_reuniao < hoje;

  async function handleArquivar() {
    setMenuAberto(false);
    try {
      await arquivarOvelha(id);
      toastSuccess(`${ovelha!.nome} foi arquivado(a). O histórico continua disponível.`);
      router.push('/pastoral');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao arquivar.');
    }
  }

  async function handleExcluirOvelha() {
    await excluirOvelha(id);
    toastSuccess(`${ovelha!.nome} foi excluído(a) permanentemente.`);
    router.push('/pastoral');
  }

  async function handleExcluirEncontro() {
    if (!encontroParaExcluir) return;
    await excluirEncontroPastoral(encontroParaExcluir.id);
    setEncontroParaExcluir(null);
    toastSuccess('Encontro excluído.');
    carregar();
  }

  async function handleAgendarReuniao() {
    if (!novaDataReuniao) {
      toastError('Escolha uma data.');
      return;
    }
    try {
      await atualizarOvelha(id, { proxima_reuniao: novaDataReuniao });
      toastSuccess('Reunião agendada!');
      setAgendandoReuniao(false);
      setNovaDataReuniao('');
      carregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao agendar.');
    }
  }

  async function exportarRelatorioPdf() {
    if (!ovelha) return;
    const { default: pdfMake } = await import('pdfmake/build/pdfmake');
    const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
    (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts.default?.vfs;

    const encontrosOrdenados = [...encontros].sort((a, b) => a.data.localeCompare(b.data));

    pdfMake
      .createPdf({
        content: [
          { text: `Relatório de acompanhamento — ${ovelha.nome}`, style: 'titulo' },
          { text: 'Documento confidencial — uso pastoral interno', style: 'aviso' },
          { text: 'Dados pessoais', style: 'secao' },
          {
            text: `Telefone: ${ovelha.telefone ?? '—'}   Idade: ${ovelha.idade ?? '—'}   Início: ${new Date(
              ovelha.data_inicio_acompanhamento
            ).toLocaleDateString('pt-BR')}`,
          },
          { text: 'Linha do tempo de encontros', style: 'secao' },
          encontrosOrdenados.length === 0
            ? { text: 'Nenhum encontro registrado.' }
            : {
                ul: encontrosOrdenados.map(
                  (e) => `${new Date(e.data).toLocaleDateString('pt-BR')} — ${e.tipo} — ${e.estado_ovelha}`
                ),
              },
          { text: 'Objetivos', style: 'secao' },
          objetivos.length === 0
            ? { text: 'Nenhum objetivo registrado.' }
            : {
                ul: objetivos.map(
                  (o) =>
                    `${o.objetivo}${o.data_fim ? ` (concluído em ${new Date(o.data_fim).toLocaleDateString('pt-BR')})` : ' (em andamento)'}`
                ),
              },
          { text: 'Frutos', style: 'secao' },
          frutos.length === 0
            ? { text: 'Nenhum fruto registrado.' }
            : {
                ul: [...frutos]
                  .sort((a, b) => a.data.localeCompare(b.data))
                  .map((f) => `${new Date(f.data).toLocaleDateString('pt-BR')} — ${f.titulo}`),
              },
        ],
        styles: {
          titulo: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] },
          aviso: { fontSize: 10, italics: true, color: '#DC2626', margin: [0, 0, 0, 12] },
          secao: { fontSize: 13, bold: true, margin: [0, 14, 0, 6] },
        },
      })
      .download(`${ovelha.nome}-relatorio-pastoral.pdf`);
  }

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
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={ArrowRightLeft} onClick={() => setModalTransferir(true)}>
              Transferir
            </Button>
            <Button variant="secondary" icon={FileDown} onClick={exportarRelatorioPdf}>
              Gerar relatório
            </Button>
            <Button icon={CalendarPlus} onClick={() => { setEditando(null); setModalEncontro(true); }}>
              + Encontro
            </Button>
            <div className="relative">
              <Button variant="secondary" icon={MoreVertical} onClick={() => setMenuAberto((v) => !v)} />
              {menuAberto && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-border bg-bg-card py-1 shadow-hover">
                    <button
                      onClick={handleArquivar}
                      className="block w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-page"
                    >
                      Arquivar
                    </button>
                    {usuario?.perfil === 'admin' && (
                      <button
                        onClick={() => {
                          setMenuAberto(false);
                          setModalExcluirOvelha(true);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-light"
                      >
                        Excluir permanentemente
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        }
      />

      <ConfirmModal
        open={modalExcluirOvelha}
        onClose={() => setModalExcluirOvelha(false)}
        onConfirm={handleExcluirOvelha}
        title={`Excluir ${terminologia.nome_ovelha.toLowerCase()}`}
        description={`Tem certeza? Todos os encontros e histórico de ${ovelha.nome} serão perdidos permanentemente. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir permanentemente"
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
        comunidadeId={usuario?.comunidade_id ?? ''}
        onRegistrado={carregar}
      />
      <TransferirOvelhaModal
        open={modalTransferir}
        onClose={() => setModalTransferir(false)}
        ovelhaId={ovelha.id}
        ovelhaNome={ovelha.nome}
        pastorAtualId={ovelha.pastor_id}
        usuarios={usuarios}
        onTransferido={carregar}
      />

      {/* Header rico */}
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
              {reuniaoVencida && (
                <span className="inline-flex items-center gap-1 rounded-full bg-danger-light px-2 py-1 text-xs font-medium text-danger">
                  <AlertTriangle size={12} /> Reunião vencida
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              Início do acompanhamento: {new Date(ovelha.data_inicio_acompanhamento).toLocaleDateString('pt-BR')} ·
              Frequência combinada: {freqLabel} · {terminologia.nome_pastor} responsável: {pastorNome}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-md bg-bg-page p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Último encontro</p>
            <p className="mt-1 text-sm font-bold text-text-primary">
              {ultimoEncontro
                ? `${new Date(ultimoEncontro.data).toLocaleDateString('pt-BR')}${ultimoEncontro.data === hoje ? ' (hoje)' : ''}`
                : 'Nenhum ainda'}
            </p>
          </div>
          <div className="rounded-md bg-bg-page p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Próxima reunião</p>
            <p className={`mt-1 text-sm font-bold ${reuniaoVencida ? 'text-danger' : 'text-text-primary'}`}>
              {ovelha.proxima_reuniao ? new Date(ovelha.proxima_reuniao).toLocaleDateString('pt-BR') : 'Não agendada'}
            </p>
          </div>
          <div className="rounded-md bg-bg-page p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Total encontros</p>
            <p className="mt-1 text-sm font-bold text-text-primary">{encontros.length} encontro(s)</p>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-border">
        {ABAS.map((a) => (
          <button
            key={a.valor}
            onClick={() => setAba(a.valor)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              aba === a.valor
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* ---------------- Aba HOJE ---------------- */}
      {aba === 'hoje' && (
        <div className="mt-6 space-y-4">
          {/* Alertas */}
          {indicadores && indicadores.alertas.length > 0 && (
            <div className="space-y-2">
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

          {/* Botão grande */}
          <Button fullWidth icon={Play} onClick={() => { setEditando(null); setModalEncontro(true); }}>
            Registrar encontro de hoje
          </Button>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Última observação */}
            <div className="rounded-lg bg-bg-card p-5 shadow-card">
              <h3 className="text-sm font-bold text-text-primary">Última observação</h3>
              {ultimaObservacao ? (
                <p className="mt-2 text-sm text-text-primary">{ultimaObservacao}</p>
              ) : (
                <p className="mt-2 text-sm text-text-secondary">Nenhum encaminhamento registrado ainda.</p>
              )}
            </div>

            {/* Próxima reunião */}
            <div className="rounded-lg bg-bg-card p-5 shadow-card">
              <h3 className="text-sm font-bold text-text-primary">Próxima reunião</h3>
              {ovelha.proxima_reuniao ? (
                <p className={`mt-2 text-sm font-semibold ${reuniaoVencida ? 'text-danger' : 'text-text-primary'}`}>
                  {new Date(ovelha.proxima_reuniao).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                  {reuniaoVencida ? ' — vencida' : ''}
                </p>
              ) : agendandoReuniao ? (
                <div className="mt-2 flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="Data"
                      type="date"
                      value={novaDataReuniao}
                      onChange={(e) => setNovaDataReuniao(e.target.value)}
                    />
                  </div>
                  <Button size="sm" onClick={handleAgendarReuniao}>
                    Salvar
                  </Button>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-sm text-text-secondary">Nenhuma reunião agendada.</p>
                  <Button size="sm" className="mt-2" variant="secondary" onClick={() => setAgendandoReuniao(true)}>
                    Agendar
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Objetivo atual + histórico de objetivos */}
          <ObjetivosSecao
            ovelhaId={ovelha.id}
            objetivoAtual={ovelha.objetivo_atual}
            historico={objetivos}
            onAtualizado={carregar}
          />

          {/* Últimos 3 encontros resumidos */}
          <div className="rounded-lg bg-bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Últimos encontros</h3>
              <button onClick={() => setAba('encontros')} className="text-xs font-medium text-primary hover:underline">
                Ver todos →
              </button>
            </div>
            {encontros.length === 0 ? (
              <p className="mt-2 text-sm text-text-secondary">Nenhum encontro registrado ainda.</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {encontros.slice(0, 3).map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2">
                    <span className="text-sm font-semibold text-text-primary">
                      {new Date(e.data).toLocaleDateString('pt-BR')}
                    </span>
                    <EstadoEncontroBadge estado={e.estado_ovelha} />
                    {!!e.temas_abordados?.length && (
                      <span className="text-xs text-text-secondary">
                        {e.temas_abordados.map((t) => TEMA_LABEL[t] ?? t).join(', ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- Aba ENCONTROS ---------------- */}
      {aba === 'encontros' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg bg-bg-card p-6 shadow-card">
            <h3 className="text-sm font-bold text-text-primary">Evolução do estado espiritual</h3>
            <div className="mt-3">
              <EstadoTimeline data={timeline} />
            </div>
          </div>

          {indicadores && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

          <div className="rounded-lg bg-bg-card p-6 shadow-card">
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
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { setEditando(e); setModalEncontro(true); }}
                            className="inline-flex items-center gap-1 text-xs text-primary"
                          >
                            <Pencil size={12} /> Editar
                          </button>
                          <button
                            onClick={() => setEncontroParaExcluir(e)}
                            className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-danger"
                          >
                            <Trash2 size={12} /> Excluir
                          </button>
                        </div>
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
      )}

      {/* ---------------- Aba AGENDA ---------------- */}
      {aba === 'agenda' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg bg-bg-card p-6 shadow-card">
            <CalendarioMensal encontros={encontros} proximaReuniao={ovelha.proxima_reuniao} />
          </div>
          <div className="rounded-lg bg-bg-card p-5 shadow-card">
            <h3 className="text-sm font-bold text-text-primary">Agendar próxima reunião</h3>
            <div className="mt-2 flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Data"
                  type="date"
                  value={novaDataReuniao}
                  onChange={(e) => setNovaDataReuniao(e.target.value)}
                />
              </div>
              <Button size="sm" onClick={handleAgendarReuniao}>
                Agendar
              </Button>
            </div>
            {ovelha.proxima_reuniao && (
              <p className="mt-2 text-xs text-text-secondary">
                Reunião atual: {new Date(ovelha.proxima_reuniao).toLocaleDateString('pt-BR')} — agendar uma nova data
                substitui a atual.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ---------------- Aba FRUTOS ---------------- */}
      {aba === 'frutos' && (
        <div className="mt-6">
          <FrutosSecao ovelhaId={ovelha.id} pastorId={usuario?.id ?? ''} frutos={frutos} onRefresh={carregar} />
        </div>
      )}

      {/* ---------------- Aba PRESENÇA ---------------- */}
      {aba === 'presenca' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-bg-card px-5 py-3 shadow-card">
              <p className="text-xs text-text-secondary">Presença nos últimos 3 meses</p>
              <p
                className={`text-xl font-bold ${
                  estatisticasPresenca.pct == null
                    ? 'text-text-secondary'
                    : estatisticasPresenca.pct >= 70
                      ? 'text-accent'
                      : estatisticasPresenca.pct >= 40
                        ? 'text-warning'
                        : 'text-danger'
                }`}
              >
                {estatisticasPresenca.pct != null ? `${estatisticasPresenca.pct}%` : '—'}
              </p>
            </div>
            <Button icon={CheckCircle2} onClick={() => setModalPresenca(true)}>
              + Registrar presença
            </Button>
          </div>

          {/* Frequência por tipo de evento */}
          <div className="rounded-lg bg-bg-card p-6 shadow-card">
            <h3 className="text-sm font-bold text-text-primary">Frequência por tipo de evento</h3>
            {estatisticasPresenca.porTipo.length === 0 ? (
              <p className="mt-2 text-sm text-text-secondary">Nenhuma presença registrada ainda.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {estatisticasPresenca.porTipo.map(([tipo, stats]) => {
                  const pct = Math.round((stats.presentes / stats.total) * 100);
                  return (
                    <div key={tipo}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize text-text-primary">{tipo}</span>
                        <span className="text-xs text-text-secondary">
                          {stats.presentes}/{stats.total} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-page">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lista de presenças */}
          <div className="rounded-lg bg-bg-card p-6 shadow-card">
            <h3 className="text-sm font-bold text-text-primary">Registros</h3>
            {presencas.length === 0 ? (
              <p className="mt-2 text-sm text-text-secondary">Nenhuma presença registrada ainda.</p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {presencas.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold capitalize text-text-primary">{p.nome_evento || p.tipo_evento}</p>
                      <p className="text-xs text-text-secondary">{new Date(p.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className={`text-xs font-bold ${p.presente ? 'text-accent' : 'text-danger'}`}>
                      {p.presente ? 'Presente' : 'Ausente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- Aba DADOS ---------------- */}
      {aba === 'dados' && (
        <div className="mt-6 space-y-4">
          <DadosForm ovelha={ovelha} onSalvo={carregar} />
          <div className="rounded-lg bg-bg-card p-6 shadow-card">
            <h3 className="text-sm font-bold text-text-primary">Jornada</h3>
            <JornadaTimeline
              dataInicio={ovelha.data_inicio_acompanhamento}
              encontros={encontros}
              retiros={retirosDaPessoa}
            />
          </div>
        </div>
      )}

      {/* Privacidade */}
      <div className="mt-6 flex items-center gap-2 rounded-md bg-primary-xlight px-3 py-2 text-xs text-primary-dark">
        <Lock size={14} />
        Estes registros são confidenciais e visíveis apenas por você e pelo admin.
      </div>

      <ConfirmModal
        open={!!encontroParaExcluir}
        onClose={() => setEncontroParaExcluir(null)}
        onConfirm={handleExcluirEncontro}
        title="Excluir este encontro?"
        description="Ação irreversível."
        confirmLabel="Excluir"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba Dados — informações pessoais editáveis
// ---------------------------------------------------------------------------
function DadosForm({ ovelha, onSalvo }: { ovelha: PastoralOvelha; onSalvo: () => void }) {
  const terminologia = useTerminologia();
  const [nome, setNome] = useState(ovelha.nome);
  const [telefone, setTelefone] = useState(ovelha.telefone ?? '');
  const [email, setEmail] = useState(ovelha.email ?? '');
  const [idade, setIdade] = useState(ovelha.idade ? String(ovelha.idade) : '');
  const [etapa, setEtapa] = useState<EtapaFormacao>(ovelha.etapa_formacao);
  const [frequencia, setFrequencia] = useState<FrequenciaAcompanhamento>(ovelha.frequencia_acompanhamento);
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toastError('Informe o nome.');
      return;
    }
    setSalvando(true);
    try {
      await atualizarOvelha(ovelha.id, {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        email: email.trim() || null,
        idade: idade ? Number(idade) : null,
        etapa_formacao: etapa,
        frequencia_acompanhamento: frequencia,
      });
      toastSuccess('Dados atualizados!');
      onSalvo();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSalvar} className="rounded-lg bg-bg-card p-6 shadow-card">
      <h3 className="text-sm font-bold text-text-primary">Informações pessoais</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Idade" type="number" value={idade} onChange={(e) => setIdade(e.target.value)} />
        <Select
          label="Etapa de formação"
          value={etapa}
          onChange={(e) => setEtapa(e.target.value as EtapaFormacao)}
          options={ETAPAS_FORMACAO.map((et) => ({ value: et.valor, label: labelEtapaFormacao(et.valor, terminologia) }))}
        />
        <Select
          label="Frequência de acompanhamento"
          value={frequencia}
          onChange={(e) => setFrequencia(e.target.value as FrequenciaAcompanhamento)}
          options={FREQUENCIAS_ACOMPANHAMENTO.map((f) => ({ value: f.valor, label: f.label }))}
        />
      </div>
      <Button type="submit" className="mt-4" loading={salvando}>
        Salvar alterações
      </Button>
    </form>
  );
}
