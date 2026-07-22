interface LogoProps {
  size?: number;
  variant?: 'dark' | 'light' | 'gold';
  showText?: boolean;
}

export function Logo({ size = 44, variant = 'dark', showText = false }: LogoProps) {
  const bg = variant === 'gold' ? '#C9A84C' : '#1A1208';
  const fg = variant === 'gold' ? '#1A1208' : '#C9A84C';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 72 72"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="MissãoApp — logo cúpula"
      >
        {/* Fundo */}
        <rect width="72" height="72" rx="18" fill={bg} />

        {/* Borda ornamental dupla */}
        <rect x="3" y="3" width="66" height="66" rx="16" fill="none" stroke={fg} strokeWidth="0.75" opacity=".35" />

        {/* Cúpula — elipse principal */}
        <ellipse cx="36" cy="30" rx="16" ry="12" fill="none" stroke={fg} strokeWidth="1.2" />

        {/* Cúpula — elipse interna */}
        <ellipse cx="36" cy="30" rx="10" ry="7" fill="none" stroke={fg} strokeWidth="0.6" opacity=".5" />

        {/* Base — degraus da Basílica */}
        <rect x="20" y="40" width="32" height="3" rx="1" fill={fg} />
        <rect x="16" y="43" width="40" height="3" rx="1.5" fill={fg} />
        <rect x="12" y="46" width="48" height="3" rx="1.5" fill={fg} opacity=".6" />

        {/* Lanterna no topo da cúpula */}
        <rect x="34" y="14" width="4" height="8" rx="1.5" fill={fg} />
        <rect x="31" y="12" width="10" height="3.5" rx="1" fill={fg} />
        <rect x="33.5" y="9" width="5" height="5" rx="1" fill={fg} />

        {/* Cruz no topo */}
        <rect x="35" y="5" width="2" height="6" rx="1" fill={fg} />
        <rect x="33" y="7" width="6" height="2" rx="1" fill={fg} />
      </svg>

      {showText && (
        <div>
          <div
            className="logo-text"
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: variant === 'dark' ? '#C9A84C' : '#1A1208',
              letterSpacing: '0.5px',
              lineHeight: 1.1,
            }}
          >
            MissãoApp
          </div>
        </div>
      )}
    </div>
  );
}
