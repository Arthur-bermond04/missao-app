'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthShell } from '@/components/layout/AuthShell';

const SENHA_MINIMA = 6;

/** Tempo de espera pela sessão de recuperação antes de considerar o link inválido. */
const ESPERA_SESSAO_MS = 4000;

type Estado = 'verificando' | 'pronto' | 'invalido';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>('verificando');
  const [motivoInvalido, setMotivoInvalido] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    // Quando o link expira ou já foi usado, o Supabase devolve o motivo no
    // fragmento da URL em vez de criar sessão.
    const fragmento = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const erroNaUrl = fragmento.get('error_description') ?? fragmento.get('error');
    if (erroNaUrl) {
      setMotivoInvalido(erroNaUrl.replace(/\+/g, ' '));
      setEstado('invalido');
      return;
    }

    let encerrado = false;
    const liberar = () => {
      if (encerrado) return;
      encerrado = true;
      setEstado('pronto');
    };

    // O clique no e-mail chega com o token na URL; o cliente do Supabase troca
    // esse token por uma sessão de forma assíncrona. Ela pode ficar pronta
    // antes ou depois deste efeito rodar, então observamos os dois caminhos.
    const { data: listener } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === 'PASSWORD_RECOVERY' || sessao) liberar();
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) liberar();
    });

    const prazo = setTimeout(() => {
      if (encerrado) return;
      encerrado = true;
      setMotivoInvalido('O link expirou ou já foi usado.');
      setEstado('invalido');
    }, ESPERA_SESSAO_MS);

    return () => {
      encerrado = true;
      clearTimeout(prazo);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');

    if (senha.length < SENHA_MINIMA) {
      setErro(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setErro('As senhas não conferem.');
      return;
    }

    setSalvando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      // A sessão de recuperação já autentica o usuário — vai direto ao painel.
      router.replace('/dashboard');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar a nova senha.');
      setSalvando(false);
    }
  }

  if (estado === 'verificando') {
    return (
      <AuthShell titulo="Redefinir senha" subtitulo="Validando o link...">
        <p className="mt-6 text-sm text-text-secondary">Um instante.</p>
      </AuthShell>
    );
  }

  if (estado === 'invalido') {
    return (
      <AuthShell titulo="Link inválido" subtitulo="Não foi possível validar este link">
        <p className="mt-6 text-sm text-text-secondary">{motivoInvalido}</p>
        <p className="mt-3 text-sm text-text-secondary">
          Links de redefinição valem por uma hora e só podem ser usados uma vez. Peça um novo.
        </p>
        <Link href="/esqueci-senha" className="mt-5 block">
          <Button fullWidth>Pedir novo link</Button>
        </Link>
        <p className="mt-4 text-center text-xs">
          <Link href="/login" className="text-primary hover:underline">
            Voltar para o login
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell titulo="Criar nova senha" subtitulo="Escolha uma senha para sua conta">
      <form onSubmit={handleSalvar}>
        <div className="mt-6">
          <Input
            label="Nova senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder={`Mínimo ${SENHA_MINIMA} caracteres`}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="mt-4">
          <Input
            label="Repita a nova senha"
            type="password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {!!erro && <p className="mt-3 text-sm text-danger">{erro}</p>}

        <Button type="submit" loading={salvando} fullWidth size="lg" className="mt-6">
          {salvando ? 'Salvando...' : 'Salvar e entrar'}
        </Button>
      </form>
    </AuthShell>
  );
}
