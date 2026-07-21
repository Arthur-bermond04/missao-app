// Degradê roxo claro → escuro, mesma matiz do primary (sequencial — não é
// categórico, então não precisa do validador de paleta, só contraste de texto).
const CORES_DEGRADE = ['#EEEDFE', '#C7C2F0', '#7A70C9', '#3C3489', '#2A2563'];
const ALTURA_ETAPA = 56;
const GAP = 4;

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
        const cor = CORES_DEGRADE[Math.min(i, CORES_DEGRADE.length - 1)];
        const textoEscuro = i <= 1;
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
              fill={textoEscuro ? '#1A1A2E' : '#FFFFFF'}
            >
              {etapa.label}
            </text>
            <text
              x="50"
              y={yTop + ALTURA_ETAPA / 2 + 8}
              textAnchor="middle"
              fontSize="5"
              fill={textoEscuro ? '#6B6B8A' : '#EEEDFE'}
            >
              {etapa.total}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
