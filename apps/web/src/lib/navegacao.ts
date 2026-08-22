import {
  LayoutDashboard,
  Filter,
  Tent,
  MessageCircle,
  Wallet,
  Users,
  Settings,
  HandHeart,
  HeartHandshake,
  IdCard,
  Calendar,
  BarChart3,
  Network,
  Bell,
  Gauge,
  ScrollText,
  Users2,
  type LucideIcon,
} from 'lucide-react';
import { pluralizar } from '@/lib/terminologia';
import type { Terminologia } from '@/types/database';

export interface NavLink {
  href: string;
  label: string;
  /** Uma linha explicando o que o módulo faz — tooltip e índice de busca por tela (Ctrl+K). */
  descricao: string;
  icon: LucideIcon;
  /**
   * Chave em permissoes_modulos. O item só aparece se o perfil logado tiver
   * a ação "ver" nesse módulo. Antes isso era uma lista fixa de perfis
   * (requerPerfil); agora quem decide é a matriz de permissões, configurável
   * por comunidade em Configurações › Permissões.
   */
  modulo: string;
}

export interface NavGrupo {
  titulo: string;
  itens: NavLink[];
}

// Módulo dedicado (nem em Sidebar.tsx, nem em BuscaGlobal.tsx): os dois
// componentes precisam desta função — Sidebar para desenhar o menu,
// BuscaGlobal para indexar as telas por nome — e um importar do outro criaria
// ciclo (Sidebar renderiza <BuscaGlobal>, que precisaria importar de volta
// de Sidebar.tsx).
//
// Monta a navegação com os rótulos da terminologia da comunidade — os hrefs e
// as chaves de módulo (usadas pelo RLS) nunca mudam, só o texto exibido.
// Reagrupado por natureza do dado, não por "quem usa": evangelização é o
// funil de primeiro contato; grupo é o encontro coletivo semanal; acompanhamento
// é o cuidado individual (pastor_id só seu) — ver pastoral_ovelhas no schema.
export function montarNavGrupos(terminologia: Terminologia): NavGrupo[] {
  return [
    {
      titulo: 'Início',
      // Dashboard não tem módulo próprio: é a porta de entrada e cada bloco
      // dentro dele já respeita a permissão do seu módulo.
      itens: [
        { href: '/dashboard', label: 'Dashboard', descricao: 'Visão geral da missão', icon: LayoutDashboard, modulo: '' },
      ],
    },
    {
      titulo: 'Pessoas',
      itens: [
        { href: '/pessoas', label: 'Pessoas', descricao: 'Cadastro central de todo mundo', icon: IdCard, modulo: 'pessoas' },
        { href: '/equipe', label: 'Equipe', descricao: 'Estrutura e cargos da comunidade', icon: Network, modulo: 'equipe' },
        {
          href: '/membros',
          label: terminologia.modulo_membros,
          descricao: 'Quem tem login no sistema',
          icon: Users,
          modulo: 'membros',
        },
      ],
    },
    {
      titulo: terminologia.modulo_funil,
      itens: [
        {
          href: '/funil',
          label: terminologia.modulo_funil,
          descricao: 'Abordagens e primeiros contatos',
          icon: Filter,
          modulo: 'funil',
        },
      ],
    },
    {
      titulo: 'Grupos e encontros',
      itens: [
        {
          href: '/celulas',
          // modulo_celulas guarda o singular (concorda com "Novo"/"Nova" na
          // tela de Grupos) — o menu precisa do plural.
          label: pluralizar(terminologia.modulo_celulas),
          descricao: 'Encontros semanais em grupo, com presença coletiva',
          icon: Users2,
          modulo: 'celulas',
        },
        {
          href: '/ministerios',
          label: 'Ministérios',
          descricao: 'Times de serviço e formação',
          icon: HandHeart,
          modulo: 'ministerios',
        },
        { href: '/agenda', label: 'Agenda', descricao: 'Eventos da comunidade', icon: Calendar, modulo: 'agenda' },
      ],
    },
    {
      titulo: terminologia.modulo_pastoral,
      itens: [
        {
          href: '/pastoral',
          label: terminologia.modulo_pastoral,
          descricao: `${terminologia.nome_pastor}es acompanham ${terminologia.nome_ovelha.toLowerCase()}s específicas, uma a uma`,
          icon: HeartHandshake,
          modulo: 'pastoral',
        },
        {
          href: '/pastoral/monitoria',
          label: terminologia.modulo_monitoria,
          descricao: 'Métricas agregadas para quem coordena — sem acesso ao conteúdo dos encontros',
          icon: Gauge,
          modulo: 'monitoria',
        },
      ],
    },
    {
      titulo: 'Eventos',
      itens: [{ href: '/retiros', label: 'Retiros', descricao: 'Inscrição, vagas e presença', icon: Tent, modulo: 'retiros' }],
    },
    {
      titulo: 'Gestão',
      itens: [
        { href: '/alertas', label: 'Alertas', descricao: 'O que precisa de atenção agora', icon: Bell, modulo: 'alertas' },
        {
          href: '/mensagens',
          label: 'Comunicação',
          descricao: 'Mensagens para a comunidade',
          icon: MessageCircle,
          modulo: 'mensagens',
        },
        { href: '/financeiro', label: 'Financeiro', descricao: 'Receitas, despesas e metas', icon: Wallet, modulo: 'financeiro' },
        { href: '/relatorios', label: 'Relatórios', descricao: 'Exportações e consolidados', icon: BarChart3, modulo: 'relatorios' },
      ],
    },
    {
      titulo: 'Sistema',
      itens: [
        {
          href: '/configuracoes',
          label: 'Configurações',
          descricao: 'Comunidade, plano e permissões',
          icon: Settings,
          modulo: 'configuracoes',
        },
        { href: '/auditoria', label: 'Auditoria', descricao: 'Quem alterou o quê, quando', icon: ScrollText, modulo: 'auditoria' },
      ],
    },
  ];
}
