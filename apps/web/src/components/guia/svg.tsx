import type { ReactNode } from 'react';

// Primitivas de desenho do Guia. Tudo SVG inline, colorido só com os tokens do
// tema (primary, warning, danger, info...) — nenhum hex solto, como pede o
// design system do README. O diagrama escala com a largura do card (viewBox).

export type Tom = 'verde' | 'cinza' | 'ambar' | 'azul' | 'vermelho' | 'escuro';

const TOM: Record<Tom, { caixa: string; texto: string; sub: string }> = {
  verde: { caixa: 'fill-primary-xlight stroke-primary', texto: 'fill-primary-dark', sub: 'fill-primary' },
  cinza: { caixa: 'fill-bg-page stroke-border', texto: 'fill-text-primary', sub: 'fill-text-secondary' },
  ambar: { caixa: 'fill-warning-light stroke-warning', texto: 'fill-text-primary', sub: 'fill-warning' },
  azul: { caixa: 'fill-info-light stroke-info', texto: 'fill-text-primary', sub: 'fill-info' },
  vermelho: { caixa: 'fill-danger-light stroke-danger', texto: 'fill-text-primary', sub: 'fill-danger' },
  escuro: { caixa: 'fill-sidebar-bg stroke-sidebar-border', texto: 'fill-sidebar-text-active', sub: 'fill-sidebar-text' },
};

/** Moldura do diagrama: acessível (role=img + título) e com a seta já declarada. */
export function Quadro({
  id,
  largura,
  altura,
  titulo,
  children,
}: {
  id: string;
  largura: number;
  altura: number;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      role="img"
      aria-labelledby={`${id}-t`}
      className="h-auto w-full font-sans"
    >
      <title id={`${id}-t`}>{titulo}</title>
      <defs>
        <marker id={`${id}-seta`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="fill-text-secondary" />
        </marker>
        <marker id={`${id}-seta-v`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="fill-primary" />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

/** Caixa com título e até 3 linhas de apoio, centralizadas. */
export function Caixa({
  x,
  y,
  w,
  h,
  tom = 'cinza',
  titulo,
  linhas = [],
  tracejada,
  tamanho = 12,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tom?: Tom;
  titulo: string;
  linhas?: string[];
  tracejada?: boolean;
  tamanho?: number;
}) {
  const c = TOM[tom];
  const total = 1 + linhas.length;
  const passo = tamanho + 3;
  const topo = y + h / 2 - ((total - 1) * passo) / 2;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        strokeWidth={1.25}
        strokeDasharray={tracejada ? '5 4' : undefined}
        className={c.caixa}
      />
      <text x={x + w / 2} y={topo} textAnchor="middle" dominantBaseline="middle" fontSize={tamanho} fontWeight={600} className={c.texto}>
        {titulo}
      </text>
      {linhas.map((l, i) => (
        <text
          key={l}
          x={x + w / 2}
          y={topo + (i + 1) * passo}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={tamanho - 2}
          className={c.sub}
        >
          {l}
        </text>
      ))}
    </g>
  );
}

/** Seta reta (ou tracejada) entre dois pontos, com rótulo opcional no meio. */
export function Seta({
  id,
  x1,
  y1,
  x2,
  y2,
  rotulo,
  tracejada,
  verde,
  deslocar = -6,
}: {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  rotulo?: string;
  tracejada?: boolean;
  verde?: boolean;
  deslocar?: number;
}) {
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        strokeWidth={1.5}
        strokeDasharray={tracejada ? '4 3' : undefined}
        className={verde ? 'stroke-primary' : 'stroke-text-secondary'}
        markerEnd={`url(#${id}-${verde ? 'seta-v' : 'seta'})`}
      />
      {!!rotulo && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 + deslocar}
          textAnchor="middle"
          fontSize={9.5}
          className="fill-text-secondary"
        >
          {rotulo}
        </text>
      )}
    </g>
  );
}

/** Texto solto (legenda, título de faixa). */
export function Rotulo({
  x,
  y,
  children,
  ancora = 'start',
  tamanho = 11,
  forte,
  cor = 'fill-text-secondary',
}: {
  x: number;
  y: number;
  children: ReactNode;
  ancora?: 'start' | 'middle' | 'end';
  tamanho?: number;
  forte?: boolean;
  cor?: string;
}) {
  return (
    <text x={x} y={y} textAnchor={ancora} fontSize={tamanho} fontWeight={forte ? 700 : 400} className={cor}>
      {children}
    </text>
  );
}

/** Bolinha numerada para legendas ("① menu lateral"). */
export function Bolinha({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={9} className="fill-accent-green stroke-white" strokeWidth={1.5} />
      <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize={10.5} fontWeight={700} className="fill-white">
        {n}
      </text>
    </g>
  );
}
