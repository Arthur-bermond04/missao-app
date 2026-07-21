import Link from 'next/link';
import { UserPlus, Wallet, HeartHandshake, Tent, IdCard, type LucideIcon } from 'lucide-react';

interface Acao {
  href: string;
  titulo: string;
  descricao: string;
  icon: LucideIcon;
}

const ACOES: Acao[] = [
  { href: '/pessoas', titulo: 'Nova pessoa', descricao: 'Cadastro central da comunidade', icon: IdCard },
  { href: '/funil', titulo: 'Registrar abordagem', descricao: 'Acompanhe a evangelização de campo', icon: UserPlus },
  { href: '/financeiro', titulo: 'Novo lançamento', descricao: 'Receita ou despesa da comunidade', icon: Wallet },
  { href: '/pastoral', titulo: 'Encontro pastoral', descricao: 'Acompanhe suas ovelhas', icon: HeartHandshake },
  { href: '/retiros', titulo: 'Novo retiro', descricao: 'Crie e organize inscrições', icon: Tent },
];

export function QuickActions() {
  return (
    <div>
      <h2 className="text-sm font-bold text-text-primary">Ações rápidas</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ACOES.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary-xlight p-4 transition-colors hover:bg-primary-xlight/70"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <Icon size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{a.titulo}</p>
                <p className="text-xs text-text-secondary">{a.descricao}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
