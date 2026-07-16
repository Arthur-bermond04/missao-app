'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '../lib/useSession';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/funil', label: 'Funil' },
  { href: '/retiros', label: 'Retiros' },
  { href: '/mensagens', label: 'Mensagens' },
  { href: '/financeiro', label: 'Financeiro' },
];

export function PainelHeader({ titulo, nomeUsuario }: { titulo: string; nomeUsuario?: string }) {
  const { sair } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-[--color-primary]">{titulo}</h1>
        {!!nomeUsuario && <p className="text-sm text-zinc-500">Olá, {nomeUsuario}</p>}
      </div>
      <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              pathname === link.href
                ? 'bg-[--color-primary] text-white'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {link.label}
          </Link>
        ))}
        <button
          onClick={() => sair().then(() => router.replace('/login'))}
          className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
