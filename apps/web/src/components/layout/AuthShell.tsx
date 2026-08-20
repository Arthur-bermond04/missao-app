import { Logo } from '@/components/ui/Logo';

/**
 * Moldura das telas públicas de autenticação (entrar, esqueci a senha,
 * redefinir): coluna de identidade à esquerda e o cartão do formulário à
 * direita. Existe para as três telas não divergirem visualmente com o tempo.
 */
export function AuthShell({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-2/5 flex-col justify-between bg-linear-135 from-primary to-primary-dark p-10 lg:flex">
        <div />
        <div>
          <Logo size={64} variant="white" showText />
          <h2 className="mt-6 text-[26px] font-semibold leading-tight text-white">Cada pessoa importa na missão.</h2>
          <p className="mt-3 text-sm text-white/75">Acompanhe sua equipe, seus contatos e seus retiros.</p>
          <div className="mt-5 h-px w-16 bg-white/20" aria-hidden="true" />
        </div>
        <p className="text-sm text-white/40">MissãoApp</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-bg-page px-6">
        <div className="w-full max-w-sm rounded-md bg-bg-card p-8 shadow-card">
          <h1 className="text-2xl font-semibold text-text-primary">{titulo}</h1>
          <p className="mt-1 text-sm text-text-secondary">{subtitulo}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
