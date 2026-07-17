'use client';

import { useState } from 'react';
import { Toggle } from '@/components/ui/Toggle';
import { supabase } from '@/lib/supabase';
import { toastError } from '@/lib/toast';
import type { Usuario } from '@/types/database';

const PREFERENCIAS_PADRAO = {
  lembrete_contatos: true,
  resumo_semanal: true,
  alerta_seguranca: true,
};

export function AbaNotificacoes({ usuario }: { usuario: Usuario }) {
  const [preferencias, setPreferencias] = useState({ ...PREFERENCIAS_PADRAO, ...(usuario.preferencias_notificacao ?? {}) });

  async function alternar(chave: keyof typeof PREFERENCIAS_PADRAO, valor: boolean) {
    const novas = { ...preferencias, [chave]: valor };
    setPreferencias(novas);
    const { error } = await supabase.from('usuarios').update({ preferencias_notificacao: novas }).eq('id', usuario.id);
    if (error) {
      setPreferencias(preferencias);
      toastError('Erro ao salvar preferência. Tente novamente.');
    }
  }

  return (
    <div className="max-w-md divide-y divide-border">
      <Toggle
        label="Lembrete de contatos vencendo hoje"
        description="Receber notificação push quando houver lembretes para hoje."
        checked={preferencias.lembrete_contatos}
        onChange={(v) => alternar('lembrete_contatos', v)}
      />
      <Toggle
        label="Resumo semanal por e-mail"
        description="Receber um resumo da semana da sua missão."
        checked={preferencias.resumo_semanal}
        onChange={(v) => alternar('resumo_semanal', v)}
      />
      <Toggle
        label="Alertas de segurança"
        description="Ser avisado quando um novo dispositivo fizer login na sua conta."
        checked={preferencias.alerta_seguranca}
        onChange={(v) => alternar('alerta_seguranca', v)}
      />
    </div>
  );
}
