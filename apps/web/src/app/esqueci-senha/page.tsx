'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthShell } from '@/components/layout/AuthShell';

function FormularioEsqueciSenha() {
  const emailInicial = useSearchParams().get('email') ?? '';
  const [email, setEmail] = useState(emailInicial);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;
      setEnviado(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar o e-mail.');
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2 rounded-md bg-success-light px-3 py-2 text-sm text-success">
          <MailCheck size={16} className="shrink-0" />
          <span>E-mail enviado.</span>
        </div>
        <p className="mt-3 text-sm text-text-secondary">
          Se existir uma conta para <span className="font-medium text-text-primary">{email.trim()}</span>, o link de
          redefinição chega em instantes. Ele vale por uma hora e só pode ser usado uma vez.
        </p>
        <p className="mt-3 text-sm text-text-secondary">Não chegou? Confira a caixa de spam.</p>
        <Button variant="secondary" fullWidth className="mt-5" onClick={() => setEnviado(false)}>
          Enviar de novo
        </Button>
        <p className="mt-4 text-center text-xs">
          <Link href="/login" className="text-primary hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleEnviar}>
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

      {!!erro && <p className="mt-3 text-sm text-danger">{erro}</p>}

      <Button type="submit" loading={enviando} fullWidth size="lg" className="mt-6">
        {enviando ? 'Enviando...' : 'Enviar link de redefinição'}
      </Button>

      <p className="mt-4 text-center text-xs">
        <Link href="/login" className="text-primary hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}

export default function EsqueciSenhaPage() {
  return (
    <AuthShell titulo="Esqueci minha senha" subtitulo="Enviamos um link para você criar uma nova">
      {/* useSearchParams exige Suspense no App Router. */}
      <Suspense fallback={<p className="mt-6 text-sm text-text-secondary">Carregando...</p>}>
        <FormularioEsqueciSenha />
      </Suspense>
    </AuthShell>
  );
}
