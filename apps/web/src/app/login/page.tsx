'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/useSession';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

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
      <div className="hidden w-2/5 flex-col justify-between bg-gradient-to-br from-primary to-primary-light p-10 text-white lg:flex">
        <div />
        <div>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mb-6">
            <path d="M12 2v20M6 8h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h2 className="text-3xl font-bold leading-tight">Cada pessoa importa na missão.</h2>
          <p className="mt-3 text-sm text-primary-xlight">
            Acompanhe sua equipe, seus contatos e seus retiros em um só lugar.
          </p>
        </div>
        <p className="text-sm font-semibold text-primary-xlight">MissãoApp</p>
      </div>

      {/* Coluna direita — formulário */}
      <div className="flex flex-1 items-center justify-center bg-white px-6">
        <form onSubmit={handleEntrar} className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-text-primary">Bem-vindo de volta</h1>
          <p className="mt-1 text-sm text-text-secondary">Painel da liderança</p>

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

          <p className="mt-4 text-center text-xs text-text-secondary hover:text-primary">
            <a href="#">Esqueci minha senha</a>
          </p>
        </form>
      </div>
    </div>
  );
}
