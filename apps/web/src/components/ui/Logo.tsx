import Image from 'next/image';

interface LogoProps {
  /** Altura do símbolo em px (a largura segue a proporção do desenho). */
  size?: number;
  /** `color` para fundo claro, `white` para a navegação escura e a tela de login. */
  variant?: 'color' | 'white';
  showText?: boolean;
}

// Proporção do símbolo recortado (largura / altura): 133 x 178.
const PROPORCAO = 133 / 178;

/**
 * Marca do MissãoWeb: cruz dourada com circuito, "W" com setas de crescimento e
 * o nome em duas pesagens — MISSÃO forte, Web leve. O símbolo é um PNG com fundo
 * transparente (public/logo/simbolo.png); o nome é texto, para ficar nítido em
 * qualquer tamanho e herdar a fonte do app.
 */
export function Logo({ size = 44, variant = 'color', showText = false }: LogoProps) {
  const ehEscuro = variant === 'white';
  const largura = Math.round(size * PROPORCAO);

  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/logo/simbolo.png"
        alt={showText ? '' : 'MissãoWeb'}
        width={largura}
        height={size}
        priority
        className="shrink-0 object-contain"
        // O símbolo é dourado; o filtro gira matiz/saturação para a cor de destaque da comunidade.
        style={{ filter: 'var(--cor-destaque-filtro, saturate(2.1) brightness(1.1))' }}
      />

      {showText && (
        <span
          className={`leading-none tracking-tight ${ehEscuro ? 'text-white' : 'text-text-primary'}`}
          style={{ fontSize: Math.max(15, Math.round(size * 0.5)) }}
          aria-label="MissãoWeb"
        >
          <span className="font-extrabold">MISSÃO</span>
          <span className="font-light text-destaque">Web</span>
        </span>
      )}
    </div>
  );
}
