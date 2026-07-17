'use client';

import { useState } from 'react';
import { Bell, MessageCircle, Mail, Smartphone, ChevronDown, type LucideIcon } from 'lucide-react';
import type { Canal, MensagemEnviada } from '@/types/database';

const ICONE_CANAL: Record<Canal, LucideIcon> = {
  push: Bell,
  whatsapp: MessageCircle,
  email: Mail,
  sms: Smartphone,
};

export function HistoricoCard({ mensagem }: { mensagem: MensagemEnviada }) {
  const [aberto, setAberto] = useState(false);
  const Icon = ICONE_CANAL[mensagem.canal];

  return (
    <div className="rounded-md border border-border">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-xlight text-primary">
            <Icon size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">{mensagem.titulo || mensagem.corpo.slice(0, 40)}</p>
            <p className="text-xs text-text-secondary">
              {mensagem.canal} · {mensagem.destinatarios} · {mensagem.total_enviados} destinatário(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">
            {mensagem.enviado_em ? new Date(mensagem.enviado_em).toLocaleString('pt-BR') : ''}
          </span>
          <ChevronDown size={16} className={`text-text-secondary transition-transform ${aberto ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {aberto && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-sm text-text-primary">{mensagem.corpo}</p>
        </div>
      )}
    </div>
  );
}
