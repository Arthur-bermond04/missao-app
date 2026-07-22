'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ExternalLink, Settings } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { buscarComunidade } from '@/lib/comunidades';
import type { Comunidade } from '@/types/database';

export default function AgendaPage() {
  const { usuario } = usePainelSession();
  const [comunidade, setComunidade] = useState<Comunidade | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    buscarComunidade(usuario.comunidade_id)
      .then(setComunidade)
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

      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        {carregando ? (
          <p className="text-sm text-text-secondary">Carregando...</p>
        ) : url ? (
          <div className="overflow-hidden rounded-md border border-border">
            <iframe
              src={url}
              title="Agenda da comunidade"
              className="h-[70vh] w-full"
              style={{ border: 0 }}
            />
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="Agenda ainda não configurada"
            description="Configure a URL do embed do Google Calendar da sua comunidade em Configurações → Integrações para ver a agenda aqui."
            action={{
              label: 'Ir para Configurações',
              onClick: () => {
                window.location.href = '/configuracoes';
              },
            }}
          />
        )}
      </div>

      {!url && !carregando && (
        <p className="mt-3 text-xs text-text-secondary">
          Dica: no Google Calendar, abra as configurações do calendário público da comunidade e copie a URL de
          &ldquo;Incorporar código&rdquo; (o valor do atributo <code>src</code> do iframe).{' '}
          <Link href="/configuracoes" className="text-primary hover:underline inline-flex items-center gap-1">
            <Settings size={12} /> Configurar agora
          </Link>
        </p>
      )}
    </div>
  );
}
