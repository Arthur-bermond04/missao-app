// ---------------------------------------------------------------------------
// Paleta em valor literal.
//
// Regra do projeto: cor se escreve como classe de token (bg-primary,
// text-danger, border-border). Este arquivo é a única exceção, para os
// contextos que não aceitam classe CSS e exigem a string da cor:
//
//   - Recharts (stroke, fill, contentStyle) — desenha SVG por prop, não por classe
//   - pdfmake — gera PDF fora do DOM
//   - gradientes e SVG inline
//
// Os valores espelham os tokens de globals.css. Ao mexer lá, mexer aqui.
// ---------------------------------------------------------------------------

export const CORES = {
  primary: '#1A7A4A',
  primaryLight: '#2D9A63',
  primaryXlight: '#E8F5EE',
  primaryDark: '#0F5233',

  accentGreen: '#22C55E',
  accentGreenLight: '#86EFAC',
  accentGreenBg: '#F0FDF4',

  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#DBEAFE',

  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  bgCard: '#FFFFFF',
  bgPage: '#F9FAFB',
  contentBg: '#F4F5F7',

  border: '#E5E7EB',
  borderGreen: '#BBF7D0',
  neutralLight: '#F3F4F6',

  // Matizes sem papel semântico, só para separar categorias em gráfico e
  // legenda (não têm token em globals.css porque nada na UI os usa direto).
  roxo: '#7C3AED',
  ciano: '#0891B2',
} as const;

/** Estilo compartilhado do tooltip do Recharts — repetido em 6 gráficos antes. */
export const TOOLTIP_GRAFICO = {
  borderRadius: 8,
  background: CORES.bgCard,
  borderColor: CORES.border,
  color: CORES.textPrimary,
  fontSize: 12,
} as const;

/** Eixos e grade dos gráficos. */
export const EIXO_GRAFICO = { fontSize: 11, fill: CORES.textMuted } as const;
export const GRADE_GRAFICO = CORES.neutralLight;

/**
 * Paleta categórica para séries sem cor semântica (fatias de despesa, tipos de
 * evento). Começa no verde da marca e abre para matizes bem separados, para as
 * fatias vizinhas continuarem distinguíveis.
 */
export const PALETA_CATEGORICA = [
  CORES.primary,
  CORES.info,
  CORES.warning,
  CORES.danger,
  CORES.roxo,
  CORES.ciano,
  CORES.primaryDark,
  CORES.textSecondary,
] as const;

/**
 * Degradê sequencial do funil — uma cor por etapa, do verde claro ao verde da
 * marca. Escala única para as duas visões do funil (barras e o SVG afunilado),
 * que antes usavam degradês diferentes para o mesmo dado.
 *
 * Começa em #BBF7D0, não em algo mais claro: a primeira etapa também é
 * desenhada sobre card branco e precisa se destacar do fundo.
 */
export const DEGRADE_FUNIL = [
  CORES.borderGreen,
  CORES.accentGreenLight,
  '#4ADE80',
  CORES.accentGreen,
  CORES.primary,
] as const;
