'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
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
    <AuthShell titulo="Bem-vindo de volta" subtitulo="Acesse sua conta para continuar sua missão.">
      <form onSubmit={handleEntrar}>
        <div className="mt-8">
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            autoComplete="email"
            autoFocus
            required
            disabled={entrando}
            className="h-11"
          />
        </div>

        <div className="mt-5">
          <Input
            label="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Sua senha"
            autoComplete="current-password"
            required
            disabled={entrando}
            className="h-11"
          />
        </div>

        <div className="mt-3 text-right text-[13px]">
          {/* Leva o e-mail já digitado, para não obrigar a redigitar. */}
          <Link
            href={email.trim() ? `/esqueci-senha?email=${encodeURIComponent(email.trim())}` : '/esqueci-senha'}
            className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green rounded-sm"
          >
            Esqueceu sua senha?
          </Link>
        </div>

        {!!erro && (
          <div role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-light px-3 py-2.5 text-[13px] text-danger">
            <AlertCircle size={16} className="mt-px shrink-0" aria-hidden />
            <span>{erro}</span>
          </div>
        )}

        <Button type="submit" loading={entrando} fullWidth size="lg" className="mt-6 !shadow-sm">
          {entrando ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </AuthShell>
  );
}
