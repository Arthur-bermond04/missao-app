import { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon: Icon, className = '', id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div>
        {!!label && (
          <label htmlFor={inputId} className="mb-1 block text-xs font-semibold text-text-secondary">
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
            className={`w-full rounded-sm border-[1.5px] px-3 py-2.5 text-sm outline-none transition-colors ${
              Icon ? 'pl-9' : ''
            } ${
              error
                ? 'border-danger focus:border-danger focus:ring-[3px] focus:ring-danger/10'
                : 'border-border focus:border-[#22C55E] focus:ring-[3px] focus:ring-[rgba(34,197,94,0.1)]'
            } ${className}`}
            {...rest}
          />
        </div>
        {!!error && <p className="mt-1 text-xs text-danger">{error}</p>}
        {!error && !!hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
