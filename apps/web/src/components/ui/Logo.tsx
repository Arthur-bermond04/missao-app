interface LogoProps {
  size?: number;
  variant?: 'color' | 'white' | 'dark';
  showText?: boolean;
}

export function Logo({ size = 44, variant = 'color', showText = false }: LogoProps) {
  const iconBg = variant === 'white' ? 'rgba(255,255,255,0.15)' : '#E8F5EE';
  const iconFg = variant === 'white' ? '#FFFFFF' : '#1A7A4A';
  const textColor = variant === 'white' ? '#FFFFFF' : '#111827';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 44 44"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="MissãoApp — logo cúpula"
      >
        {/* Fundo circular suave */}
        <rect width="44" height="44" rx="12" fill={iconBg} />

        {/* Cúpula da Basílica estilizada */}
        <ellipse cx="22" cy="20" rx="10" ry="7" fill="none" stroke={iconFg} strokeWidth="1.5" />
        <ellipse cx="22" cy="20" rx="6" ry="4" fill="none" stroke={iconFg} strokeWidth="0.75" opacity=".5" />

        {/* Base */}
        <rect x="12" y="26" width="20" height="2" rx="1" fill={iconFg} />
        <rect x="10" y="28" width="24" height="2" rx="1" fill={iconFg} opacity=".6" />

        {/* Cruz no topo */}
        <rect x="21" y="10" width="2" height="6" rx="1" fill={iconFg} />
        <rect x="19" y="12" width="6" height="2" rx="1" fill={iconFg} />
      </svg>

      {showText && (
        <div
          className="logo-text"
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: textColor,
            letterSpacing: '0.3px',
            lineHeight: 1.1,
          }}
        >
          MissãoApp
        </div>
      )}
    </div>
  );
}
