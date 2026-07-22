import { forwardRef } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-[#1A7A4A] text-white hover:bg-[#0F5233] shadow-[0_1px_3px_rgba(22,163,74,0.3)]',
  secondary: 'bg-transparent border-[1.5px] border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]',
  success: 'bg-[#22C55E] text-white hover:bg-[#16A34A]',
  danger: 'bg-transparent border-[1.5px] border-[#DC2626] text-[#DC2626] hover:bg-[#FEE2E2]',
  ghost: 'bg-transparent text-[#6B7280] hover:bg-[#F9FAFB]',
};

const SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-[9px] text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading, icon: Icon, fullWidth, className = '', children, disabled, ...rest },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...rest}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={16} /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
