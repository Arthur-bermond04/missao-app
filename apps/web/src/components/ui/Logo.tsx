interface LogoProps {
  size?: number;
  /** `color` para fundo claro, `white` para a navegação escura e a tela de login. */
  variant?: 'color' | 'white';
  showText?: boolean;
}

/**
 * Marca do MissãoApp: cruz em um quadrado arredondado.
 *
 * Substituiu a cúpula de basílica desenhada para a identidade "solene"
 * anterior — a direção atual é de painel administrativo, e o símbolo precisa
 * ler bem a 32px na sidebar, sem elipses concêntricas que somem nesse tamanho.
 */
export function Logo({ size = 44, variant = 'color', showText = false }: LogoProps) {
  const ehEscuro = variant === 'white';

  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 44 44"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="MissãoApp"
        className="shrink-0"
      >
        <rect
          width="44"
          height="44"
          rx="12"
          className={ehEscuro ? 'fill-white/15' : 'fill-primary-xlight'}
        />
        <path
          d="M22 11v22M13 20h18"
          className={ehEscuro ? 'stroke-white' : 'stroke-primary'}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {showText && (
        <span className={`text-base font-semibold tracking-tight ${ehEscuro ? 'text-white' : 'text-text-primary'}`}>
          MissãoApp
        </span>
      )}
    </div>
  );
}
