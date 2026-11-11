import type { CSSProperties } from 'react';
import { Logo } from '@/components/ui/Logo';

/**
 * Nas telas públicas de autenticação a identidade é o azul institucional
 * (#2E3E4E) com detalhe dourado discreto. A paleta é aplicada só dentro desta
 * moldura (ver `.auth-marca` em globals.css), sem afetar o resto do painel.
 */
const PALETA_AUTH = {
  '--color-primary': '#2e3e4e',
  '--color-primary-dark': '#243241',
  '--color-primary-light': '#3b4d60',
  '--color-accent-green': '#c6a66b',
} as CSSProperties;

const OURO = '#c6a66b';
const CX = 600;
const CY = 262;

function polar(r: number, graus: number) {
  const a = ((graus - 90) * Math.PI) / 180;
  // Arredondado: o servidor e o navegador divergem nas últimas casas do seno/cosseno,
  // o que causava erro de hidratação.
  return { x: Math.round((CX + r * Math.cos(a)) * 10) / 10, y: Math.round((CY + r * Math.sin(a)) * 10) / 10 };
}

/** Arco ogival (lanceta): base no raio r1, ponta no raio r2, aberto em ±abertura graus. */
function lanceta(r1: number, r2: number, graus: number, abertura: number) {
  const base = polar(r1, graus);
  const ponta = polar(r2, graus);
  const esq = polar((r1 + r2) / 2 + (r2 - r1) * 0.12, graus - abertura);
  const dir = polar((r1 + r2) / 2 + (r2 - r1) * 0.12, graus + abertura);
  return `M${base.x.toFixed(1)} ${base.y.toFixed(1)} Q${esq.x.toFixed(1)} ${esq.y.toFixed(1)} ${ponta.x.toFixed(1)} ${ponta.y.toFixed(1)} Q${dir.x.toFixed(1)} ${dir.y.toFixed(1)} ${base.x.toFixed(1)} ${base.y.toFixed(1)}Z`;
}

const DOZE = Array.from({ length: 12 }, (_, i) => i * 30); // os doze: apóstolos, tribos, meses de missão

/**
 * Rosácea: o vitral circular das catedrais, desenhado só com fio de luz.
 * Doze pétalas (os doze apóstolos) em dois anéis, raios que partem da cruz
 * central e círculos concêntricos. Lida de perto é arquitetura sacra; de longe,
 * um mapa de pessoas ligadas a um mesmo centro.
 */
function Rosacea() {
  return (
    <svg viewBox="0 0 800 1000" className="h-full w-full" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMin slice">
      <defs>
        {/* luz que desce do alto sobre a rosácea */}
        <radialGradient id="luz" cx="600" cy="262" r="520" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8fa6bd" stopOpacity="0.38" />
          <stop offset="0.35" stopColor="#5a7189" stopOpacity="0.16" />
          <stop offset="1" stopColor="#2e3e4e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="coluna" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="nucleo" cx="600" cy="262" r="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f3dca8" stopOpacity="0.95" />
          <stop offset="0.4" stopColor={OURO} stopOpacity="0.45" />
          <stop offset="1" stopColor={OURO} stopOpacity="0" />
        </radialGradient>
        <mask id="desvanece">
          <linearGradient id="mascara" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.55" stopColor="#fff" />
            <stop offset="0.9" stopColor="#000" />
          </linearGradient>
          <rect width="800" height="1000" fill="url(#mascara)" />
        </mask>
      </defs>

      <rect width="800" height="1000" fill="url(#luz)" />

      {/* coluna de luz que atravessa a rosácea e cai sobre o texto */}
      <rect x={CX - 38} y="0" width="76" height="1000" fill="url(#coluna)" />
      <line x1={CX} y1="0" x2={CX} y2="1000" stroke={OURO} strokeOpacity="0.35" />

      <g mask="url(#desvanece)">
        {/* anéis concêntricos */}
        {[56, 118, 188, 262, 340, 420].map((r, i) => (
          <circle key={r} cx={CX} cy={CY} r={r} stroke="#fff" strokeOpacity={i === 3 ? 0.2 : 0.09} />
        ))}
        <circle cx={CX} cy={CY} r="262" stroke={OURO} strokeOpacity="0.4" strokeDasharray="1 7" strokeLinecap="round" />

        {/* anel externo gira devagar (60s); respeita "reduzir movimento" */}
        <g className="auth-rosa-gira" style={{ transformOrigin: `${CX}px ${CY}px` }}>
          {DOZE.map((g) => (
            <path key={`e${g}`} d={lanceta(190, 340, g + 15, 9)} stroke="#fff" strokeOpacity="0.2" />
          ))}
          {DOZE.map((g) => {
            const p = polar(340, g + 15);
            return <circle key={`pe${g}`} cx={p.x} cy={p.y} r="3.2" fill={OURO} fillOpacity="0.9" />;
          })}
        </g>

        {/* pétalas internas: ouro */}
        {DOZE.map((g) => (
          <path key={`i${g}`} d={lanceta(58, 188, g, 11)} stroke={OURO} strokeOpacity="0.65" fill={OURO} fillOpacity="0.045" />
        ))}

        {/* raios dos doze */}
        {DOZE.map((g) => {
          const a = polar(58, g);
          const b = polar(420, g);
          return <line key={`r${g}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeOpacity="0.07" />;
        })}

        {/* cruz de luz no centro */}
        <circle cx={CX} cy={CY} r="46" fill="url(#nucleo)" />
        <line x1={CX} y1={CY - 34} x2={CX} y2={CY + 46} stroke="#f3dca8" strokeWidth="2.4" strokeLinecap="round" />
        <line x1={CX - 25} y1={CY - 6} x2={CX + 25} y2={CY - 6} stroke="#f3dca8" strokeWidth="2.4" strokeLinecap="round" />
      </g>

      {/* régua editorial na lateral esquerda do painel */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <line key={i} x1="56" y1={96 + i * 22} x2={i % 4 === 0 ? 76 : 66} y2={96 + i * 22} stroke="#fff" strokeOpacity="0.22" />
      ))}
    </svg>
  );
}

const PILARES = [
  { n: '01', titulo: 'Missão', texto: 'Cada pessoa com um chamado e um cuidado.' },
  { n: '02', titulo: 'Comunhão', texto: 'Equipes, grupos e famílias em um só corpo.' },
  { n: '03', titulo: 'Evangelização', texto: 'Quem chega é acolhido e acompanhado.' },
];

/**
 * Moldura das telas públicas de autenticação (entrar, esqueci a senha,
 * redefinir): formulário à esquerda e painel de identidade à direita.
 */
export function AuthShell({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-marca flex min-h-screen bg-white" style={PALETA_AUTH}>
      {/* Autenticação */}
      <main className="flex w-full flex-col px-6 py-8 sm:px-12 lg:w-[44%] lg:px-16 xl:px-24">
        <div className="shrink-0">
          <Logo size={40} variant="color" showText />
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-text-primary">{titulo}</h1>
          <p className="mt-2 text-[15px] text-[#7b8490]">{subtitulo}</p>
          {children}
        </div>

        <p className="shrink-0 text-center text-xs text-[#7b8490] lg:text-left">
          © {new Date().getFullYear()} MissãoWeb · Acesso restrito a membros autorizados
        </p>
      </main>

      {/* Identidade institucional */}
      <aside className="relative hidden flex-1 overflow-hidden bg-[#2e3e4e] lg:block" aria-hidden="true">
        {/* A rosácea ocupa a metade de cima, sangrando pela borda direita */}
        <div className="absolute inset-x-0 top-0 h-[100%]">
          <Rosacea />
        </div>
        <div className="absolute inset-0 bg-linear-to-t from-[#222f3c] via-[#2e3e4e]/0 to-transparent" />

        {/* moldura fina, como uma folha de edição */}
        <div className="pointer-events-none absolute inset-6 border border-white/[0.07]" />

        {/* lema, no canto superior direito */}
        <div className="absolute right-12 top-11 flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-[#c6a66b]">
          <span className="h-px w-8 bg-[#c6a66b]/60" />
          Ut unum sint
        </div>

        {/* texto */}
        <div className="absolute inset-x-0 bottom-0 px-14 pb-14 xl:px-20 xl:pb-16">
          <p className="mb-5 text-[11px] uppercase tracking-[0.28em] text-white/40">João 17, 21</p>

          <h2 className="font-serif text-[clamp(38px,7.4vh,68px)] font-normal leading-[1.04] tracking-[-0.01em] text-white">
            Uma missão.
            <br />
            <span className="text-white/55">Muitas pessoas.</span>
            <br />
            <span className="italic text-[#d9bd85]">Um só propósito.</span>
          </h2>

          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-8 border-t border-white/15 pt-6">
            {PILARES.map((p) => (
              <div key={p.n}>
                <p className="font-serif text-[13px] italic text-[#c6a66b]">{p.n}</p>
                <p className="mt-1.5 text-[13px] font-semibold tracking-wide text-white">{p.titulo}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-white/50 [@media(max-height:780px)]:hidden">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
