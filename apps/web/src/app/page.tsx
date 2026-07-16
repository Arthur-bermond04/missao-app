'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../lib/useSession';

export default function Home() {
  const { session, carregando } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;
    router.replace(session ? '/dashboard' : '/login');
  }, [carregando, session, router]);

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[--color-primary-light] text-zinc-500">
      Carregando...
    </div>
  );
}
