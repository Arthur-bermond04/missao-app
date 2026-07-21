'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Retiro } from '@/types/database';

interface LembreteModalProps {
  open: boolean;
  onClose: () => void;
  retiro: Retiro;
  totalInscritos: number;
  comunidadeId: string;
  remetenteId: string;
}

function diasAteRetiro(retiro: Retiro): number {
  const hoje = new Date().toISOString().slice(0, 10);
  const dias = (new Date(retiro.data_inicio).getTime() - new Date(hoje).getTime()) / (24 * 60 * 60 * 1000);
  return Math.max(0, Math.round(dias));
}

export function LembreteModal({ open, onClose, retiro, totalInscritos, comunidadeId, remetenteId }: LembreteModalProps) {
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (open) {
      const dias = diasAteRetiro(retiro);
      setMensagem(
        `Olá! Faltam ${dias} dia${dias === 1 ? '' : 's'} para o retiro "${retiro.nome}". Confirme sua presença! 🙏`
      );
    }
  }, [open, retiro]);

  async function handleEnviar() {
    setEnviando(true);
    try {
      const { error } = await supabase.from('mensagens_enviadas').insert({
        comunidade_id: comunidadeId,
        remetente_id: remetenteId,
        canal: 'whatsapp',
        destinatarios: `retiro:${retiro.nome}`,
        titulo: `Lembrete — ${retiro.nome}`,
        corpo: mensagem,
        enviado_em: new Date().toISOString(),
        total_enviados: totalInscritos,
      });
      if (error) throw error;
      toastSuccess('Lembrete registrado! O disparo real depende das integrações (FCM/Z-API/Resend).');
      onClose();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao enviar lembrete.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enviar lembrete"
      description={`Para os ${totalInscritos} inscritos em "${retiro.nome}"`}
    >
      <Textarea label="Mensagem" value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={4} />
      <Button fullWidth className="mt-3" onClick={handleEnviar} loading={enviando}>
        Enviar lembrete
      </Button>
    </Modal>
  );
}
