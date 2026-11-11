import Link from 'next/link';
import { Lock } from 'lucide-react';
import { IconeCaixa } from '@/components/ui/IconeCaixa';

/**
 * Tela exibida quando alguém abre, pelo endereço, um módulo que o seu perfil
 * não pode ver. O menu já esconde o item; esta tela cobre quem digita a URL.
 * A proteção dos dados continua no banco (RLS) onde ela existe — ver README.
 */
export function SemAcesso() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <IconeCaixa icon={Lock} tom="neutro" tamanho="lg" />
      <h1 className="mt-5 text-lg font-semibold text-text-primary">Você não tem acesso a esta área</h1>
      <p className="mt-1.5 text-sm text-text-secondary">
        O seu perfil não está liberado para este módulo. Se você precisa dele, peça a um administrador da comunidade.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
