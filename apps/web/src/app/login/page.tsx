'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';

export default function LoginPage() {
  const { entrar } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

  async function handleEntrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEntrando(true);
    try {
      await entrar(email.trim(), senha);
      router.replace('/dashboard');
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[--color-primary-light] px-6">
      <form
        onSubmit={handleEntrar}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm"
      >
        <h1 className="text-center text-2xl font-extrabold text-[--color-primary]">MissãoApp</h1>
        <p className="mt-1 text-center text-sm text-zinc-500">Painel da liderança</p>

        <label className="mt-6 block text-xs font-semibold text-zinc-500">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[--color-primary]"
          placeholder="voce@exemplo.com"
          required
        />

        <label className="mt-4 block text-xs font-semibold text-zinc-500">Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[--color-primary]"
          required
        />

        {!!erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={entrando}
          className="mt-6 w-full rounded-xl bg-[--color-primary] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {entrando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
