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
              className="flex items-center gap-3 rounded-md border-[0.5px] border-[#E5E7EB] bg-white p-4 transition-all hover:border-[#BBF7D0] hover:bg-[#F0FDF4] hover:shadow-hover"
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: '#E8F5EE', color: '#1A7A4A' }}
              >
                <Icon size={20} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#111827' }}>
                  {a.titulo}
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {a.descricao}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
