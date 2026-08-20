import { forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, ...rest }, ref) => {
    const textareaId = id ?? rest.name;
    return (
      <div>
        {!!label && (
          <label htmlFor={textareaId} className="mb-1 block text-xs font-semibold text-text-secondary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full rounded-sm border-[1.5px] px-3 py-2.5 text-sm outline-none transition-colors ${
            error
              ? 'border-danger focus:border-danger focus:ring-[3px] focus:ring-danger/10'
              : 'border-border focus:border-accent-green focus:ring-[3px] focus:ring-accent-green/10'
          } ${className}`}
          {...rest}
        />
        {!!error && <p className="mt-1 text-xs text-danger">{error}</p>}
        {!error && !!hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
