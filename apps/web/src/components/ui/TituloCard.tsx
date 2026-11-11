import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Clock,
  Filter,
  Gauge,
  HandHeart,
  HeartHandshake,
  Hourglass,
  History,
  IdCard,
  ListChecks,
  MapPin,
  MessageSquarePlus,
  PieChart,
  Tent,
  TrendingUp,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { IconeCaixa, type TomIcone } from '@/components/ui/IconeCaixa';

// Vocabulário de ícones por assunto. Quem usa pede pelo NOME do assunto e não
// escolhe a biblioteca nem o traço — assim o mesmo assunto tem sempre o mesmo
// ícone, em qualquer tela.
const ASSUNTOS = {
  alerta: { icon: AlertTriangle, tom: 'ambar' },
  agenda: { icon: Calendar, tom: 'ambar' },
  cadastro: { icon: IdCard, tom: 'azul' },
  caixa: { icon: Wallet, tom: 'esmeralda' },
  funil: { icon: Filter, tom: 'azul' },
  grafico: { icon: PieChart, tom: 'neutro' },
  historico: { icon: History, tom: 'neutro' },
  local: { icon: MapPin, tom: 'azul' },
  ministerio: { icon: HandHeart, tom: 'roxo' },
  mensagem: { icon: MessageSquarePlus, tom: 'roxo' },
  pastoral: { icon: HeartHandshake, tom: 'rosa' },
  pessoas: { icon: Users, tom: 'azul' },
  recentes: { icon: Clock, tom: 'neutro' },
  rapido: { icon: Zap, tom: 'ambar' },
  relatorio: { icon: BarChart3, tom: 'neutro' },
  saude: { icon: Gauge, tom: 'rosa' },
  retiro: { icon: Tent, tom: 'ambar' },
  tarefas: { icon: ListChecks, tom: 'azul' },
  tendencia: { icon: TrendingUp, tom: 'esmeralda' },
  travado: { icon: Hourglass, tom: 'ambar' },
} satisfies Record<string, { icon: LucideIcon; tom: TomIcone }>;

export type Assunto = keyof typeof ASSUNTOS;

/** Título de card: ícone fino num recipiente circular suave + texto em semibold. */
export function TituloCard({
  icone,
  tom,
  children,
  className = '',
}: {
  icone: Assunto;
  /** Sobrescreve o tom padrão do assunto. */
  tom?: TomIcone;
  children: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, tom: tomPadrao } = ASSUNTOS[icone];
  return (
    <h2 className={`flex items-center gap-3 text-sm font-semibold text-text-primary ${className}`}>
      <IconeCaixa icon={Icon} tom={tom ?? tomPadrao} tamanho="sm" />
      {children}
    </h2>
  );
}
