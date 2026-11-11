import { forwardRef, useState } from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon: Icon, className = '', id, type, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    // Campo de senha ganha o botão de mostrar/ocultar automaticamente — sem
    // isso, digitar errado no celular só se descobre depois de tentar
    // entrar, e vira "esqueci minha senha" desnecessário.
    const ehSenha = type === 'password';
    const [mostrarSenha, setMostrarSenha] = useState(false);

    return (
      <div>
        {!!label && (
          <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          )}
          <input
            ref={ref}
            id={inputId}
            type={ehSenha ? (mostrarSenha ? 'text' : 'password') : type}
            className={`h-10 w-full rounded-lg border bg-bg-card px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted ${
              Icon ? 'pl-9' : ''
            } ${ehSenha ? 'pr-9' : ''} ${
              error
                ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
                : 'border-border hover:border-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20'
            } ${className}`}
            {...rest}
          />
          {ehSenha && (
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              tabIndex={-1}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green rounded-sm"
            >
              {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {!!error && <p className="mt-1 text-xs text-danger">{error}</p>}
        {!error && !!hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
