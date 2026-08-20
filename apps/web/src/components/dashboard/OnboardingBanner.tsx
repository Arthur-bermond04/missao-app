'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Cross, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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
    <div className="mt-6 rounded-md bg-linear-135 from-primary to-accent-green p-6">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white">
          <Cross size={18} />
        </div>
        <h2 className="text-lg font-semibold text-white">Bem-vindo ao MissãoApp!</h2>
      </div>
      <p className="mt-2 text-sm text-white/80">Vamos configurar sua comunidade em 3 passos:</p>

      <ul className="mt-4 space-y-2">
        {PASSOS.map((p) => (
          <li key={p.n}>
            <Link
              href={p.href}
              className="flex items-center gap-3 rounded-md bg-white/10 p-3 transition-colors hover:bg-white/20"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-white/30 text-xs text-white">
                {p.n}
              </span>
              <span className="flex-1 text-sm text-white">{p.texto}</span>
              <ArrowRight size={16} className="text-white/80" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-4">
        <Link
          href="/membros"
          className="inline-flex items-center gap-1 rounded-sm bg-white px-5 py-2.5 text-sm font-medium text-primary hover:bg-white/90"
        >
          Começar pelo passo 1 <ArrowRight size={16} />
        </Link>
        <button onClick={pular} className="text-sm text-white/80 hover:text-white">
          Pular introdução
        </button>
      </div>
    </div>
  );
}
