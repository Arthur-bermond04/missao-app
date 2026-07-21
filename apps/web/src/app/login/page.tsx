'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/useSession';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

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
    <div className="flex min-h-screen">
      {/* Coluna esquerda — identidade */}
      <div className="hidden w-2/5 flex-col justify-between bg-primary p-10 lg:flex">
        <div />
        <div>
          <Logo size={64} variant="dark" />
          <h2 className="logo-text mt-6 text-[28px] leading-tight text-gold">Cada pessoa importa na missão.</h2>
          <p className="mt-3 text-sm text-stone">Acompanhe sua equipe, seus contatos e seus retiros.</p>

          {/* Ornamento decorativo */}
          <div className="mt-5 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-gold/40" />
            <span className="text-xs text-gold/70">✝</span>
            <div className="h-px flex-1 bg-gold/40" />
          </div>
        </div>
        <p className="logo-text text-sm text-gold/60">MissãoApp</p>
      </div>

      {/* Coluna direita — formulário */}
      <div className="flex flex-1 items-center justify-center bg-bg-card px-6">
        <form onSubmit={handleEntrar} className="w-full max-w-sm">
          <h1 className="logo-text text-[26px] font-normal text-text-primary">Bem-vindo de volta</h1>
          <p className="mt-1 text-sm text-stone">Painel da liderança</p>

          <div className="mt-6">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              required
            />
          </div>

          <div className="mt-4">
            <Input
              label="Senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          {!!erro && <p className="mt-3 text-sm text-danger">{erro}</p>}

          <Button type="submit" loading={entrando} fullWidth size="lg" className="mt-6">
            {entrando ? 'Entrando...' : 'Entrar'}
          </Button>

          <p className="mt-4 text-center text-xs text-stone hover:text-gold">
            <a href="#">Esqueci minha senha</a>
          </p>
        </form>
      </div>
    </div>
  );
}
