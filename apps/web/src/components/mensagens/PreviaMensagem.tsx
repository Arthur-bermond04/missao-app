import { Bell } from 'lucide-react';
import type { Canal } from '@/types/database';

interface PreviaMensagemProps {
  canal: Canal;
  titulo: string;
  corpo: string;
}

export function PreviaMensagem({ canal, titulo, corpo }: PreviaMensagemProps) {
  const corpoExibido = corpo.trim() || 'Sua mensagem aparece aqui conforme você digita...';

  if (canal === 'whatsapp') {
    return (
      <div className="rounded-lg bg-[#E5F5EA] p-4">
        <p className="mb-2 text-xs font-semibold text-text-secondary">Prévia no WhatsApp</p>
        <div className="relative ml-auto max-w-[85%] rounded-lg rounded-tr-none bg-[#DCF8C6] px-3 py-2 text-sm text-zinc-800 shadow-sm">
          {!!titulo && <p className="font-semibold">{titulo}</p>}
          <p className="whitespace-pre-wrap">{corpoExibido}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-bg-page p-4">
      <p className="mb-2 text-xs font-semibold text-text-secondary">
        Prévia de {canal === 'push' ? 'notificação push' : canal === 'email' ? 'e-mail' : 'SMS'}
      </p>
      <div className="flex gap-3 rounded-lg bg-white p-3 shadow-card">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-xlight text-primary">
          <Bell size={16} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">{titulo || 'MissãoApp'}</p>
          <p className="line-clamp-2 text-xs text-text-secondary">{corpoExibido}</p>
        </div>
      </div>
    </div>
  );
}
