'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CalendarPlus,
  ExternalLink,
  HandHeart,
  HeartHandshake,
  List,
  CalendarDays,
  MapPin,
  Settings,
  Sparkle,
  Tent,
  Trash2,
} from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { IconeCaixa, type TomIcone } from '@/components/ui/IconeCaixa';
import {
  CalendarioAgenda,
  COR_TIPO_EVENTO,
  intervaloVisivel,
  navegar,
  type VisaoCalendario,
} from '@/components/agenda/CalendarioAgenda';
import { buscarComunidade } from '@/lib/comunidades';
import {
  criarEventoAvulso,
  dataLocalIso,
  excluirEventoAvulso,
  listarEventosPeriodo,
  listarEventosProprios,
  TIPOS_EVENTO_AVULSO,
  VISIBILIDADES_EVENTO,
  type EventoAgenda,
  type TipoEventoAgenda,
  type TipoEventoAvulso,
  type VisibilidadeEvento,
} from '@/lib/agenda';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Comunidade } from '@/types/database';

const ICONE_TIPO: Record<TipoEventoAgenda, typeof HandHeart> = {
  ministerio: HandHeart,
  pastoral: HeartHandshake,
  retiro: Tent,
  avulso: Sparkle,
};

const TOM_TIPO: Record<TipoEventoAgenda, TomIcone> = {
  ministerio: 'roxo',
  pastoral: 'rosa',
  retiro: 'ambar',
  avulso: 'azul',
};

const LABEL_TIPO: Record<TipoEventoAgenda, string> = {
  ministerio: 'Encontro de ministério',
  pastoral: 'Reunião pastoral',
  retiro: 'Retiro',
  avulso: 'Evento avulso',
};

type Modo = 'calendario' | 'lista';

function formatarData(iso: string) {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function AgendaPage() {
  const { usuario, pode } = usePainelSession();
  // Espelha auth_pode('agenda', ...) — um override de permissão em Configurações
  // tem efeito aqui (a RLS barra a escrita; isto só ajusta o que a tela oferece).
  const podeCriar = pode('agenda', 'criar');
  const podeGerir = podeCriar || pode('agenda', 'excluir');

  const [comunidade, setComunidade] = useState<Comunidade | null>(null);
  const [modo, setModo] = useState<Modo>('calendario');
  const [visao, setVisao] = useState<VisaoCalendario>('mes');
  const [ancora, setAncora] = useState<Date>(() => new Date());
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novoEm, setNovoEm] = useState<string | null>(null); // data pré-preenchida do formulário
  const [detalhe, setDetalhe] = useState<EventoAgenda | null>(null);
  const [paraExcluir, setParaExcluir] = useState<EventoAgenda | null>(null);
  const [abaExterna, setAbaExterna] = useState(false);

  const intervalo = useMemo(() => intervaloVisivel(visao, ancora), [visao, ancora]);

  const carregar = useCallback(() => {
    if (!usuario?.comunidade_id) return;
    setCarregando(true);
    const busca =
      modo === 'calendario'
        ? listarEventosPeriodo(usuario.comunidade_id, intervalo.de, intervalo.ate)
        : listarEventosProprios(usuario.comunidade_id);
    busca.then(setEventos).finally(() => setCarregando(false));
  }, [usuario?.comunidade_id, modo, intervalo.de, intervalo.ate]);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    buscarComunidade(usuario.comunidade_id).then(setComunidade);
  }, [usuario?.comunidade_id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const url = comunidade?.google_calendar_url;

  async function handleExcluir() {
    if (!paraExcluir) return;
    try {
      await excluirEventoAvulso(paraExcluir.id);
      toastSuccess('Evento excluído.');
      setParaExcluir(null);
      setDetalhe(null);
      carregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao excluir.');
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={Calendar}
        tom="ambar"
        title="Agenda"
        subtitle="Calendário da comunidade"
        actions={
          <div className="flex flex-wrap gap-2">
            {url && (
              <Button variant="secondary" icon={ExternalLink} onClick={() => setAbaExterna((v) => !v)}>
                {abaExterna ? 'Ver agenda própria' : 'Calendário externo'}
              </Button>
            )}
            {podeCriar && (
              <Button icon={CalendarPlus} onClick={() => setNovoEm(dataLocalIso())}>
                Novo evento
              </Button>
            )}
          </div>
        }
      />

      {novoEm && usuario?.comunidade_id && (
        <NovoEventoModal
          comunidadeId={usuario.comunidade_id}
          criadoPor={usuario.id}
          dataInicial={novoEm}
          onClose={() => setNovoEm(null)}
          onSalvo={() => {
            setNovoEm(null);
            carregar();
          }}
        />
      )}

      <DetalheEventoModal
        evento={detalhe}
        podeExcluir={podeGerir}
        onClose={() => setDetalhe(null)}
        onExcluir={(e) => setParaExcluir(e)}
      />

      <ConfirmModal
        open={!!paraExcluir}
        onClose={() => setParaExcluir(null)}
        onConfirm={handleExcluir}
        title="Excluir evento?"
        description={`${paraExcluir?.titulo ?? 'Este evento'} será removido da agenda.`}
        confirmLabel="Excluir"
      />

      {/* Legenda das fontes + alternância calendário/lista */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
          {(['ministerio', 'pastoral', 'retiro', 'avulso'] as TipoEventoAgenda[]).map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COR_TIPO_EVENTO[t] }} />
              {LABEL_TIPO[t]}
            </span>
          ))}
        </div>
        {!abaExterna && (
          <div className="flex items-center gap-0.5 rounded-lg bg-bg-page p-1 ring-1 ring-inset ring-border-soft" role="group" aria-label="Modo de exibição">
            {(
              [
                ['calendario', 'Calendário', CalendarDays],
                ['lista', 'Lista', List],
              ] as const
            ).map(([valor, rotulo, Icon]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setModo(valor)}
                aria-pressed={modo === valor}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                  modo === valor ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon size={14} aria-hidden /> {rotulo}
              </button>
            ))}
          </div>
        )}
      </div>

      {url && abaExterna ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-border-soft bg-bg-card shadow-card">
          <iframe src={url} title="Agenda externa" className="h-[70vh] w-full" style={{ border: 0 }} />
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-border-soft bg-bg-card p-5 shadow-card">
          {!url && (
            <p className="mb-4 flex flex-wrap items-center gap-1 text-xs text-text-secondary">
              Agenda própria (eventos avulsos, encontros de ministério, reuniões pastorais e retiros). Quer integrar um
              calendário externo?{' '}
              <Link href="/configuracoes" className="inline-flex items-center gap-1 text-primary hover:underline">
                <Settings size={12} /> Configurar Google Calendar
              </Link>
            </p>
          )}

          {modo === 'calendario' ? (
            <div className={carregando ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              <CalendarioAgenda
                visao={visao}
                ancora={ancora}
                eventos={eventos}
                podeCriar={podeCriar}
                onMudarVisao={setVisao}
                onNavegar={(s) => setAncora((a) => navegar(visao, a, s))}
                onHoje={() => setAncora(new Date())}
                onClicarDia={(iso) => setNovoEm(iso)}
                onClicarEvento={setDetalhe}
                onAbrirDia={(iso) => {
                  setAncora(new Date(`${iso}T12:00:00`));
                  setVisao('dia');
                }}
              />
            </div>
          ) : carregando ? (
            <p className="text-sm text-text-secondary">Carregando...</p>
          ) : eventos.length === 0 ? (
            <EmptyState
              icon={Calendar}
              tom="ambar"
              title="Nenhum evento futuro por aqui"
              description="Cadastre um evento avulso, ou aguarde encontros de ministério, reuniões pastorais e retiros aparecerem automaticamente."
              action={podeCriar ? { label: 'Novo evento', onClick: () => setNovoEm(dataLocalIso()) } : undefined}
            />
          ) : (
            <div className="space-y-2">
              {eventos.map((e) => (
                <div
                  key={`${e.tipo}-${e.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border-soft px-3 py-2.5 transition-colors hover:bg-bg-page"
                >
                  <IconeCaixa icon={ICONE_TIPO[e.tipo]} tom={TOM_TIPO[e.tipo]} tamanho="sm" />
                  <button type="button" onClick={() => setDetalhe(e)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium text-text-primary">{e.titulo}</p>
                    {!!e.subtitulo && <p className="truncate text-xs text-text-secondary">{e.subtitulo}</p>}
                  </button>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-text-secondary">
                    {new Date(`${e.data.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')}
                  </span>
                  {e.tipo === 'avulso' && podeGerir && (
                    <button
                      onClick={() => setParaExcluir(e)}
                      className="shrink-0 rounded-md p-1 text-text-secondary hover:text-danger"
                      title="Excluir evento"
                      aria-label={`Excluir ${e.titulo}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detalhe de um evento (clicar numa etiqueta do calendário)
// ---------------------------------------------------------------------------
function DetalheEventoModal({
  evento,
  podeExcluir,
  onClose,
  onExcluir,
}: {
  evento: EventoAgenda | null;
  podeExcluir: boolean;
  onClose: () => void;
  onExcluir: (e: EventoAgenda) => void;
}) {
  if (!evento) return null;
  const Icon = ICONE_TIPO[evento.tipo];
  return (
    <Modal
      open
      onClose={onClose}
      title={evento.titulo}
      description={LABEL_TIPO[evento.tipo]}
      size="sm"
      footer={
        <>
          {evento.tipo === 'avulso' && podeExcluir && (
            <Button variant="ghost" icon={Trash2} onClick={() => onExcluir(evento)}>
              Excluir
            </Button>
          )}
          {evento.tipo !== 'avulso' && (
            <Link
              href={evento.href}
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Abrir
            </Link>
          )}
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <IconeCaixa icon={Icon} tom={TOM_TIPO[evento.tipo]} tamanho="sm" />
          <div>
            <p className="font-medium capitalize text-text-primary">{formatarData(evento.data)}</p>
            <p className="text-xs text-text-secondary">
              {evento.hora ?? 'Dia todo'}
              {evento.dataFim ? ` · até ${new Date(`${evento.dataFim.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}
            </p>
          </div>
        </div>
        {!!evento.local && (
          <p className="flex items-center gap-2 text-text-secondary">
            <MapPin size={14} aria-hidden /> {evento.local}
          </p>
        )}
        {!!evento.descricao && <p className="whitespace-pre-line text-text-secondary">{evento.descricao}</p>}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Modal de novo evento avulso, em abas (Evento / Detalhes)
// ---------------------------------------------------------------------------
function NovoEventoModal({
  comunidadeId,
  criadoPor,
  dataInicial,
  onClose,
  onSalvo,
}: {
  comunidadeId: string;
  criadoPor: string;
  dataInicial: string;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const [aba, setAba] = useState<'evento' | 'detalhes'>('evento');
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoEventoAvulso>('geral');
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [dataIni, setDataIni] = useState(dataInicial);
  const [horaIni, setHoraIni] = useState('08:00');
  const [dataFim, setDataFim] = useState(dataInicial);
  const [horaFim, setHoraFim] = useState('09:00');
  const [local, setLocal] = useState('');
  const [visivel, setVisivel] = useState<VisibilidadeEvento>('todos');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      setAba('evento');
      toastError('Informe o título do evento.');
      return;
    }
    const inicio = diaInteiro ? `${dataIni}T00:00:00` : `${dataIni}T${horaIni || '00:00'}:00`;
    const fim = diaInteiro ? `${dataFim}T23:59:00` : `${dataFim}T${horaFim || '23:59'}:00`;
    if (fim < inicio) {
      setAba('evento');
      toastError('O fim do evento não pode ser antes do início.');
      return;
    }
    setSalvando(true);
    try {
      await criarEventoAvulso({
        comunidade_id: comunidadeId,
        criado_por: criadoPor,
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        local: local.trim() || undefined,
        data_inicio: inicio,
        data_fim: fim,
        dia_inteiro: diaInteiro,
        tipo,
        visivel_para: visivel,
      });
      toastSuccess('Evento criado!');
      onSalvo();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao criar evento.');
    } finally {
      setSalvando(false);
    }
  }

  const abaBtn = (valor: 'evento' | 'detalhes', rotulo: string) => (
    <button
      key={valor}
      type="button"
      role="tab"
      aria-selected={aba === valor}
      onClick={() => setAba(valor)}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
        aba === valor ? 'border-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
      }`}
    >
      {rotulo}
    </button>
  );

  return (
    <Modal open onClose={onClose} title="Novo evento" description={formatarData(dataInicial)}>
      <form onSubmit={handleSalvar}>
        <div className="mb-4 flex border-b border-border-soft" role="tablist">
          {abaBtn('evento', 'Evento')}
          {abaBtn('detalhes', 'Detalhes')}
        </div>

        {aba === 'evento' ? (
          <div className="space-y-3">
            <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
            <Select
              label="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoEventoAvulso)}
              options={TIPOS_EVENTO_AVULSO.map((t) => ({ value: t.valor, label: t.label }))}
            />

            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={diaInteiro}
                onChange={(e) => setDiaInteiro(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Dia inteiro
            </label>

            <div className="grid grid-cols-[1fr_7.5rem] gap-3">
              <Input label="Início" type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} required />
              <Input label="Hora" type="time" value={horaIni} onChange={(e) => setHoraIni(e.target.value)} disabled={diaInteiro} />
            </div>
            <div className="grid grid-cols-[1fr_7.5rem] gap-3">
              <Input label="Fim" type="date" value={dataFim} min={dataIni} onChange={(e) => setDataFim(e.target.value)} required />
              <Input label="Hora" type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} disabled={diaInteiro} />
            </div>

            <Input label="Local" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Opcional" />
          </div>
        ) : (
          <div className="space-y-3">
            <Select
              label="Visível para"
              value={visivel}
              onChange={(e) => setVisivel(e.target.value as VisibilidadeEvento)}
              options={VISIBILIDADES_EVENTO.map((v) => ({ value: v.valor, label: v.label }))}
            />
            <Textarea label="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5} />
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" loading={salvando}>
            Criar evento
          </Button>
        </div>
      </form>
    </Modal>
  );
}
