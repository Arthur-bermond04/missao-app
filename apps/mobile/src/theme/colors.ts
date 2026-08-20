// Tokens do MissãoApp — mesmos nomes e valores de apps/web/src/app/globals.css.
//
// Antes existiam três gerações de nomes convivendo: os da identidade original
// "dourado papal" (gold*, stone*), que tinham sido só reapontados para verde
// sem renomear, e dois conjuntos parciais criados depois. Nome que mente sobre
// o valor (gold guardando verde, primaryLight guardando o tom mais claro de
// todos) custa mais caro que a renomeação.
export const colors = {
  // Verde Missionário
  primary: '#1A7A4A',
  primaryLight: '#2D9A63',
  primaryXLight: '#E8F5EE',
  primaryDark: '#0F5233',

  // Verde vibrante — acento, item ativo, CTAs
  accentGreen: '#22C55E',
  accentGreenLight: '#86EFAC',
  accentGreenBg: '#F0FDF4',

  // Status
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#DBEAFE',

  // Neutro sem carga semântica
  neutral: '#6B7280',
  neutralLight: '#F3F4F6',

  // Textos
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  // Fundos
  bgPage: '#F9FAFB',
  bgCard: '#FFFFFF',
  contentBg: '#F4F5F7',

  // Navegação escura — mesma faixa tonal da sidebar/topbar do painel web
  sidebarBg: '#2E3446',
  sidebarBgHover: '#3A4156',
  sidebarBorder: '#3A4156',
  sidebarText: '#A7ADBC',
  sidebarTextActive: '#FFFFFF',

  // Bordas
  border: '#E5E7EB',
  borderGreen: '#BBF7D0',

  // Aliases semânticos do nível de interesse — nomes de domínio, não de cor,
  // então continuam válidos e apontam para os tokens de status.
  quente: '#D97706',
  morno: '#2563EB',
  frio: '#6B7280',
};
