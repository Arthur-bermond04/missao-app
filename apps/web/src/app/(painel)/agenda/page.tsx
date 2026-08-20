'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, CalendarPlus, ExternalLink, HandHeart, HeartHandshake, Settings, Sparkle, Tent, Trash2 } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { buscarComunidade } from '@/lib/comunidades';
import { CORES } from '@/lib/cores';
import {
  criarEventoAvulso,
  excluirEventoAvulso,
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

const PERFIS_GESTAO = ['coordenador', 'padre', 'admin'];

const ICONE_TIPO: Record<TipoEventoAgenda, typeof HandHeart> = {
  ministerio: HandHeart,
  pastoral: HeartHandshake,
  retiro: Tent,
  avulso: Sparkle,
};

// Valor literal (e não classe) porque a bolinha de legenda e o ícone montam a
// versão translúcida concatenando alfa no hex.
const COR_TIPO: Record<TipoEventoAgenda, string> = {
  ministerio: CORES.primary,
  pastoral: CORES.info,
  retiro: CORES.roxo,
  avulso: CORES.warning,
};

const LABEL_TIPO: Record<TipoEventoAgenda, string> = {
  ministerio: 'Encontro de ministério',
  pastoral: 'Reunião pastoral',
  retiro: 'Retiro',
  avulso: 'Evento avulso',
};

export default function AgendaPage() {
  const { usuario } = usePainelSession();
  const podeGerir = usuario ? PERFIS_GESTAO.includes(usuario.perfil) : false;
  const [comunidade, setComunidade] = useState<Comunidade | null>(null);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<EventoAgenda | null>(null);
  const [abaExterna, setAbaExterna] = useState(false);

  const carregar = useCallback(() => {
    if (!usuario?.comunidade_id) return;
    setCarregando(true);
    listarEventosProprios(usuario.comunidade_id)
      .then(setEventos)
      .finally(() => setCarregando(false));
  }, [usuario?.comunidade_id]);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    buscarComunidade(usuario.comunidade_id).then(setComunidade);
    carregar();
  }, [usuario?.comunidade_id, carregar]);

  const url = comunidade?.google_calendar_url;

  async function handleExcluir() {
    if (!paraExcluir) return;
    try {
      await excluirEventoAvulso(paraExcluir.id);
      toastSuccess('Evento excluído.');
      setParaExcluir(null);
      carregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao excluir.');
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={Calendar}
        title="Agenda"
        subtitle="Calendário da comunidade"
        actions={
          <div className="flex flex-wrap gap-2">
            {url && (
              <Button variant="secondary" icon={ExternalLink} onClick={() => setAbaExterna((v) => !v)}>
                {abaExterna ? 'Ver agenda própria' : 'Calendário externo'}
              </Button>
            )}
            {podeGerir && (
              <Button icon={CalendarPlus} onClick={() => setModalNovo(true)}>
                Novo evento
              </Button>
            )}
          </div>
        }
      />

      {modalNovo && usuario?.comunidade_id && (
        <NovoEventoModal
          comunidadeId={usuario.comunidade_id}
          criadoPor={usuario.id}
          onClose={() => setModalNovo(false)}
          onSalvo={() => {
            setModalNovo(false);
            carregar();
          }}
        />
      )}

      <ConfirmModal
        open={!!paraExcluir}
        onClose={() => setParaExcluir(null)}
        onConfirm={handleExcluir}
        title="Excluir evento?"
        description={`${paraExcluir?.titulo ?? 'Este evento'} será removido da agenda.`}
        confirmLabel="Excluir"
      />

      {/* Legenda das fontes */}
      <div className="mt-5 flex flex-wrap gap-3 text-xs text-text-secondary">
        {(['ministerio', 'pastoral', 'retiro', 'avulso'] as TipoEventoAgenda[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COR_TIPO[t] }} />
            {LABEL_TIPO[t]}
          </span>
        ))}
      </div>

      {url && abaExterna ? (
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-bg-card shadow-card">
          <iframe src={url} title="Agenda externa" className="h-[70vh] w-full" style={{ border: 0 }} />
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-bg-card p-6 shadow-card">
          {!url && (
            <p className="mb-4 flex items-center gap-1 text-xs text-text-secondary">
              Agenda própria (eventos avulsos, encontros de ministério, reuniões pastorais e retiros). Quer integrar um
              calendário externo?{' '}
              <Link href="/configuracoes" className="inline-flex items-center gap-1 text-primary hover:underline">
                <Settings size={12} /> Configurar Google Calendar
              </Link>
            </p>
          )}
          {carregando ? (
            <p className="text-sm text-text-secondary">Carregando...</p>
          ) : eventos.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Nenhum evento futuro por aqui"
              description="Cadastre um evento avulso, ou aguarde encontros de ministério, reuniões pastorais e retiros aparecerem automaticamente."
              action={podeGerir ? { label: 'Novo evento', onClick: () => setModalNovo(true) } : undefined}
            />
          ) : (
            <div className="space-y-2">
              {eventos.map((e) => {
                const Icon = ICONE_TIPO[e.tipo];
                return (
                  <div
                    key={`${e.tipo}-${e.id}`}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-bg-page"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${COR_TIPO[e.tipo]}1A`, color: COR_TIPO[e.tipo] }}
                    >
                      <Icon size={15} />
                    </div>
                    <Link href={e.href} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{e.titulo}</p>
                      {!!e.subtitulo && <p className="truncate text-xs text-text-secondary">{e.subtitulo}</p>}
                    </Link>
                    <span className="shrink-0 text-xs font-semibold text-text-secondary">
                      {new Date(e.data).toLocaleDateString('pt-BR')}
                    </span>
                    {e.tipo === 'avulso' && podeGerir && (
                      <button
                        onClick={() => setParaExcluir(e)}
                        className="shrink-0 rounded-md p-1 text-text-secondary hover:text-danger"
                        title="Excluir evento"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de novo evento avulso
// ---------------------------------------------------------------------------
function NovoEventoModal({
  comunidadeId,
  criadoPor,
  onClose,
  onSalvo,
}: {
  comunidadeId: string;
  criadoPor: string;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState('');
  const [local, setLocal] = useState('');
  const [tipo, setTipo] = useState<TipoEventoAvulso>('geral');
  const [visivel, setVisivel] = useState<VisibilidadeEvento>('todos');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      toastError('Informe o título do evento.');
      return;
    }
    setSalvando(true);
    try {
      const dataInicio = hora ? `${data}T${hora}:00` : `${data}T00:00:00`;
      await criarEventoAvulso({
        comunidade_id: comunidadeId,
        criado_por: criadoPor,
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        local: local.trim() || undefined,
        data_inicio: dataInicio,
        dia_inteiro: !hora,
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

  return (
    <Modal open onClose={onClose} title="Novo evento">
      <form onSubmit={handleSalvar} className="space-y-3">
        <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        <div className="flex gap-2">
          <div className="flex-1">
            <Input label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
          <div className="w-32">
            <Input label="Horário" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
        </div>
        <Input label="Local" value={local} onChange={(e) => setLocal(e.target.value)} />
        <div className="flex gap-2">
          <div className="flex-1">
            <Select
              label="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoEventoAvulso)}
              options={TIPOS_EVENTO_AVULSO.map((t) => ({ value: t.valor, label: t.label }))}
            />
          </div>
          <div className="flex-1">
            <Select
              label="Visível para"
              value={visivel}
              onChange={(e) => setVisivel(e.target.value as VisibilidadeEvento)}
              options={VISIBILIDADES_EVENTO.map((v) => ({ value: v.valor, label: v.label }))}
            />
          </div>
        </div>
        <Textarea label="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
        <Button type="submit" fullWidth loading={salvando}>
          Criar evento
        </Button>
      </form>
    </Modal>
  );
}
