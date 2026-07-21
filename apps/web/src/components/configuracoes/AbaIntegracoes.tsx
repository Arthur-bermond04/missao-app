'use client';

import { useEffect, useState } from 'react';
import { CircleCheck, CircleAlert } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { buscarStatusIntegracoes, type StatusIntegracoes } from '@/lib/integracoes';
import { atualizarComunidade } from '@/lib/comunidades';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Comunidade } from '@/types/database';

const ITENS: { chave: keyof StatusIntegracoes; label: string; env: string }[] = [
  { chave: 'push', label: 'Push (Firebase FCM)', env: 'FCM_SERVER_KEY' },
  { chave: 'whatsapp', label: 'WhatsApp (Z-API)', env: 'ZAPI_TOKEN' },
  { chave: 'email', label: 'E-mail (Resend)', env: 'RESEND_API_KEY' },
];

export function AbaIntegracoes({
  comunidade,
  onAtualizada,
}: {
  comunidade: Comunidade;
  onAtualizada: (c: Comunidade) => void;
}) {
  const [status, setStatus] = useState<StatusIntegracoes | null>(null);
  const [calendarUrl, setCalendarUrl] = useState(comunidade.google_calendar_url ?? '');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    buscarStatusIntegracoes().then(setStatus);
  }, []);

  async function handleSalvarCalendar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const campos = { google_calendar_url: calendarUrl.trim() || null };
      await atualizarComunidade(comunidade.id, campos);
      onAtualizada({ ...comunidade, ...campos });
      toastSuccess('Google Calendar atualizado.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold text-text-secondary">Canais de disparo de mensagens</p>
        <div className="space-y-2">
          {ITENS.map((item) => {
            const ativo = status?.[item.chave] ?? false;
            return (
              <div key={item.chave} className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                <span className="text-sm font-medium text-text-primary">{item.label}</span>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${ativo ? 'text-accent' : 'text-text-secondary'}`}>
                  {ativo ? <CircleCheck size={14} /> : <CircleAlert size={14} />}
                  {ativo ? 'Ativo' : `Configure ${item.env}`}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          Essas variáveis são configuradas no servidor (hosting ou <code>.env.local</code>) — não é possível colar tokens
          aqui pelo navegador, já que eles nunca devem chegar ao código do cliente.
        </p>
      </div>

      <form onSubmit={handleSalvarCalendar} className="space-y-2">
        <p className="text-xs font-semibold text-text-secondary">Google Calendar</p>
        <Input
          label="URL do embed"
          value={calendarUrl}
          onChange={(e) => setCalendarUrl(e.target.value)}
          placeholder="https://calendar.google.com/calendar/embed?src=..."
        />
        <Button type="submit" size="sm" loading={salvando}>
          Salvar
        </Button>
      </form>
    </div>
  );
}
