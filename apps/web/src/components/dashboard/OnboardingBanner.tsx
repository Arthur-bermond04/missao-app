'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Cross, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CardOrnamental } from '@/components/ui/Ornamento';
import type { Usuario } from '@/types/database';

const PASSOS = [
  { n: 1, texto: 'Convide seus primeiros missionários', href: '/membros' },
  { n: 2, texto: 'Registre sua primeira abordagem', href: '/funil' },
  { n: 3, texto: 'Crie o próximo retiro', href: '/retiros' },
];

// Aparece só quando a comunidade está "zerada". Persiste o "pular" em
// usuarios.preferencias_notificacao.onboarding_visto.
export function OnboardingBanner({ usuario }: { usuario: Usuario }) {
  const jaVisto = !!usuario.preferencias_notificacao?.onboarding_visto;
  const [oculto, setOculto] = useState(jaVisto);

  async function pular() {
    setOculto(true);
    await supabase
      .from('usuarios')
      .update({ preferencias_notificacao: { ...(usuario.preferencias_notificacao ?? {}), onboarding_visto: true } })
      .eq('id', usuario.id);
  }

  if (oculto) return null;

  return (
    <CardOrnamental className="mt-6 p-6">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-primary">
          <Cross size={18} />
        </div>
        <h2 className="logo-text text-lg font-medium text-text-primary">Bem-vindo ao MissãoApp!</h2>
      </div>
      <p className="mt-2 text-sm text-text-secondary">Vamos configurar sua comunidade em 3 passos:</p>

      <ul className="mt-4 space-y-2">
        {PASSOS.map((p) => (
          <li key={p.n}>
            <Link href={p.href} className="flex items-center gap-3 rounded-md bg-bg-card p-3 hover:shadow-card">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border text-xs text-text-secondary">
                {p.n}
              </span>
              <span className="flex-1 text-sm text-text-primary">{p.texto}</span>
              <ArrowRight size={16} className="text-text-secondary" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-4">
        <Link
          href="/membros"
          className="inline-flex items-center gap-1 rounded-[10px] bg-primary px-5 py-2.5 text-sm font-medium text-gold hover:bg-primary-light"
        >
          Começar pelo passo 1 <ArrowRight size={16} />
        </Link>
        <button onClick={pular} className="text-sm text-text-secondary hover:text-text-primary">
          Pular introdução
        </button>
      </div>
    </CardOrnamental>
  );
}
