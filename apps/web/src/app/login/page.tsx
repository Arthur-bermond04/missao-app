'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/useSession';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthShell } from '@/components/layout/AuthShell';

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
    <AuthShell titulo="Bem-vindo de volta" subtitulo="Painel da liderança">
      <form onSubmit={handleEntrar}>
        <div className="mt-6">
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="mt-4">
          <Input
            label="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {!!erro && <p className="mt-3 text-sm text-danger">{erro}</p>}

        <Button type="submit" loading={entrando} fullWidth size="lg" className="mt-6">
          {entrando ? 'Entrando...' : 'Entrar'}
        </Button>

        <p className="mt-4 text-center text-xs">
          {/* Leva o e-mail já digitado, para não obrigar a redigitar. */}
          <Link
            href={email.trim() ? `/esqueci-senha?email=${encodeURIComponent(email.trim())}` : '/esqueci-senha'}
            className="text-primary hover:underline"
          >
            Esqueci minha senha
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
