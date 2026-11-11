import Link from 'next/link';
import { UserPlus, Wallet, HeartHandshake, Tent, IdCard, type LucideIcon } from 'lucide-react';
import { TituloCard } from '@/components/ui/TituloCard';
import { IconeCaixa, type TomIcone } from '@/components/ui/IconeCaixa';

interface Acao {
  href: string;
  titulo: string;
  descricao: string;
  icon: LucideIcon;
  tom: TomIcone;
}

const ACOES: Acao[] = [
  { href: '/pessoas', titulo: 'Nova pessoa', descricao: 'Cadastro central da comunidade', icon: IdCard, tom: 'azul' },
  { href: '/funil', titulo: 'Registrar abordagem', descricao: 'Acompanhe a evangelização de campo', icon: UserPlus, tom: 'azul' },
  { href: '/financeiro', titulo: 'Novo lançamento', descricao: 'Receita ou despesa da comunidade', icon: Wallet, tom: 'esmeralda' },
  { href: '/pastoral', titulo: 'Encontro pastoral', descricao: 'Acompanhe suas ovelhas', icon: HeartHandshake, tom: 'rosa' },
  { href: '/retiros', titulo: 'Novo retiro', descricao: 'Crie e organize inscrições', icon: Tent, tom: 'ambar' },
];

export function QuickActions() {
  return (
    <div>
      <TituloCard icone="rapido">Ações rápidas</TituloCard>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ACOES.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-4 rounded-xl border border-border-soft bg-bg-card p-4 shadow-card transition-colors hover:border-border-green hover:bg-accent-green-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <IconeCaixa icon={Icon} tom={a.tom} tamanho="md" />
              <div>
                <p className="text-sm font-medium text-text-primary">{a.titulo}</p>
                <p className="text-xs text-text-secondary">{a.descricao}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
