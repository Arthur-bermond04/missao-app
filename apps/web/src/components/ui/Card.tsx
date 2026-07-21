interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const PADDING_STYLES: Record<NonNullable<CardProps['padding']>, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ padding = 'md', hoverable, className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-bg-card shadow-card ${PADDING_STYLES[padding]} ${
        hoverable ? 'transition-all hover:-translate-y-0.5 hover:shadow-hover' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
