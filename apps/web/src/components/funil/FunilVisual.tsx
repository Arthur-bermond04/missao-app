import { CORES, DEGRADE_FUNIL } from '@/lib/cores';

const ALTURA_ETAPA = 56;
const GAP = 4;

// Luminância relativa (WCAG) pra decidir se o texto em cima da cor precisa ser
// claro ou escuro, em vez de fixar por índice (evita texto ilegível quando o
// degradê muda).
function luminanciaRelativa(hex: string): number {
  const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)]
    .map((h) => parseInt(h, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function FunilVisual({ etapas }: { etapas: { label: string; total: number }[] }) {
  const maiorTotal = etapas[0]?.total || 1;
  const larguras = etapas.map((e) => Math.max(8, (e.total / maiorTotal) * 100));
  const alturaTotal = etapas.length * (ALTURA_ETAPA + GAP) - GAP;

  return (
    <svg viewBox={`0 0 100 ${alturaTotal}`} width="100%" height={alturaTotal} preserveAspectRatio="none">
      {etapas.map((etapa, i) => {
        const wTop = larguras[i];
        const wBottom = larguras[i + 1] ?? larguras[i];
        const yTop = i * (ALTURA_ETAPA + GAP);
        const yBottom = yTop + ALTURA_ETAPA;
        const pontos = [
          [(100 - wTop) / 2, yTop],
          [(100 + wTop) / 2, yTop],
          [(100 + wBottom) / 2, yBottom],
          [(100 - wBottom) / 2, yBottom],
        ]
          .map((p) => p.join(','))
          .join(' ');
        const cor = DEGRADE_FUNIL[Math.min(i, DEGRADE_FUNIL.length - 1)];
        const textoEscuro = luminanciaRelativa(cor) > 0.45;
        return (
          <g key={etapa.label}>
            <title>
              {etapa.label}: {etapa.total}
            </title>
            <polygon points={pontos} fill={cor} />
            <text
              x="50"
              y={yTop + ALTURA_ETAPA / 2 - 4}
              textAnchor="middle"
              fontSize="5.5"
              fontWeight="700"
              fill={textoEscuro ? CORES.textPrimary : CORES.accentGreenBg}
            >
              {etapa.label}
            </text>
            <text
              x="50"
              y={yTop + ALTURA_ETAPA / 2 + 8}
              textAnchor="middle"
              fontSize="5"
              fill={textoEscuro ? CORES.textSecondary : CORES.borderGreen}
            >
              {etapa.total}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
