import React from 'react';

export type CardVariant = 'default' | 'elevated' | 'flat';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  action?: React.ReactNode;
  variant?: CardVariant;
  className?: string;
  children?: React.ReactNode;
}

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  default: {
    background: 'var(--card-glass, rgba(15, 23, 42, 0.75))',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--card-border, #1e293b)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
  },
  elevated: {
    background: 'var(--card-glass-elevated, rgba(30, 41, 59, 0.85))',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--card-border-hover, #334155)',
    boxShadow: '0 16px 40px 0 rgba(0, 0, 0, 0.5)',
  },
  flat: {
    background: 'var(--bg-secondary, #0f172a)',
    border: '1px solid var(--card-border, #1e293b)',
    boxShadow: 'none',
  },
};

export const Card: React.FC<CardProps> = ({
  title,
  action,
  variant = 'default',
  className = '',
  children,
  style,
  ...rest
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const baseStyle: React.CSSProperties = {
    borderRadius: 'var(--radius-xl, 0.875rem)',
    padding: '1.25rem',
    color: 'var(--text-primary, #f8fafc)',
    transition: 'all var(--transition-fast, 150ms cubic-bezier(0.4, 0, 0.2, 1))',
    borderColor: isHovered ? 'var(--card-border-hover, #334155)' : undefined,
    ...variantStyles[variant],
    ...style,
  };

  const hasHeader = Boolean(title || action);

  return (
    <div
      className={`adpilot-card glass-card ${className}`.trim()}
      style={baseStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...rest}
    >
      {hasHeader && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: children ? '1rem' : 0,
            gap: '0.75rem',
          }}
        >
          {title && (
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary, #f8fafc)',
              }}
            >
              {title}
            </div>
          )}
          {action && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginLeft: 'auto',
              }}
            >
              {action}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
