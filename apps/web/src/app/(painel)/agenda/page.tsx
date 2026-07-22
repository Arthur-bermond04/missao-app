'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ExternalLink, HandHeart, HeartHandshake, Settings, Tent } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { buscarComunidade } from '@/lib/comunidades';
import { listarEventosProprios, type EventoAgenda, type TipoEventoAgenda } from '@/lib/agenda';
import type { Comunidade } from '@/types/database';

const ICONE_TIPO: Record<TipoEventoAgenda, typeof HandHeart> = {
  ministerio: HandHeart,
  pastoral: HeartHandshake,
  retiro: Tent,
};

const COR_TIPO: Record<TipoEventoAgenda, string> = {
  ministerio: '#1A7A4A',
  pastoral: '#2563EB',
  retiro: '#D97706',
};

export default function AgendaPage() {
  const { usuario } = usePainelSession();
  const [comunidade, setComunidade] = useState<Comunidade | null>(null);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    const comunidadeId = usuario.comunidade_id;
    buscarComunidade(comunidadeId)
      .then(async (c) => {
        setComunidade(c);
        if (!c?.google_calendar_url) {
          setEventos(await listarEventosProprios(comunidadeId));
        }
      })
      .finally(() => setCarregando(false));
  }, [usuario?.comunidade_id]);

  const url = comunidade?.google_calendar_url;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={Calendar}
        title="Agenda"
        subtitle="Calendário da comunidade"
        actions={
          url ? (
            <Button variant="secondary" icon={ExternalLink} onClick={() => window.open(url, '_blank')}>
              Abrir no Google Calendar
            </Button>
          ) : undefined
        }
      />

      {!url && !carregando && (
        <p className="mt-3 flex items-center gap-1 text-xs text-text-secondary">
          Mostrando a agenda própria (encontros de ministério, reuniões pastorais e retiros). Prefere ver tudo num só
          calendário?{' '}
          <Link href="/configuracoes" className="inline-flex items-center gap-1 text-primary hover:underline">
            <Settings size={12} /> Configurar Google Calendar
          </Link>
        </p>
      )}

      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        {carregando ? (
          <p className="text-sm text-text-secondary">Carregando...</p>
        ) : url ? (
          <div className="overflow-hidden rounded-md border border-border">
            <iframe src={url} title="Agenda da comunidade" className="h-[70vh] w-full" style={{ border: 0 }} />
          </div>
        ) : eventos.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Nenhum evento futuro por aqui"
            description="Encontros de ministério, próximas reuniões pastorais e retiros aparecem aqui automaticamente conforme forem agendados."
          />
        ) : (
          <div className="space-y-2">
            {eventos.map((e) => {
              const Icon = ICONE_TIPO[e.tipo];
              return (
                <Link
                  key={`${e.tipo}-${e.id}`}
                  href={e.href}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-bg-page"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${COR_TIPO[e.tipo]}1A`, color: COR_TIPO[e.tipo] }}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{e.titulo}</p>
                    {!!e.subtitulo && <p className="truncate text-xs text-text-secondary">{e.subtitulo}</p>}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-text-secondary">
                    {new Date(e.data).toLocaleDateString('pt-BR')}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
