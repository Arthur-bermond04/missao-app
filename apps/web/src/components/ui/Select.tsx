import { forwardRef } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, ...rest }, ref) => {
    const selectId = id ?? rest.name;
    return (
      <div>
        {!!label && (
          <label htmlFor={selectId} className="mb-1 block text-xs font-semibold text-text-secondary">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full rounded-sm border-[1.5px] px-3 py-2.5 text-sm outline-none transition-colors ${
            error
              ? 'border-danger focus:border-danger focus:ring-[3px] focus:ring-danger/10'
              : 'border-border focus:border-accent-green focus:ring-[3px] focus:ring-accent-green/10'
          } ${className}`}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {!!error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
