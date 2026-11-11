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
          <label htmlFor={textareaId} className="mb-1.5 block text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`min-h-24 w-full rounded-lg border bg-bg-card px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted ${
            error
              ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
              : 'border-border hover:border-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20'
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
