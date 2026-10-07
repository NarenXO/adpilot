import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: '0.35rem 0.75rem',
    fontSize: '0.75rem',
    borderRadius: '0.5rem',
    gap: '0.375rem',
  },
  md: {
    padding: '0.55rem 1.1rem',
    fontSize: '0.875rem',
    borderRadius: '0.625rem',
    gap: '0.5rem',
  },
  lg: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    borderRadius: '0.75rem',
    gap: '0.625rem',
  },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  style,
  type = 'button',
  ...rest
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const isDisabled = disabled || loading;

  const getVariantStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: isDisabled ? '#1e293b' : 'var(--accent-cyan, #38bdf8)',
          color: isDisabled ? '#64748b' : '#0a0d14',
          border: '1px solid transparent',
          boxShadow: isHovered && !isDisabled
            ? '0 0 16px rgba(56, 189, 248, 0.45)'
            : '0 1px 3px rgba(0, 0, 0, 0.2)',
        };
      case 'danger':
        return {
          backgroundColor: isDisabled ? '#1e293b' : 'var(--accent-red, #ef4444)',
          color: isDisabled ? '#64748b' : '#ffffff',
          border: '1px solid transparent',
          boxShadow: isHovered && !isDisabled
            ? '0 0 16px rgba(239, 68, 68, 0.45)'
            : '0 1px 3px rgba(0, 0, 0, 0.2)',
        };
      case 'ghost':
        return {
          backgroundColor: isHovered && !isDisabled ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          color: isHovered && !isDisabled ? 'var(--text-primary, #f8fafc)' : 'var(--text-secondary, #94a3b8)',
          border: '1px solid transparent',
          boxShadow: 'none',
        };
      case 'secondary':
      default:
        return {
          backgroundColor: isHovered && !isDisabled ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.75)',
          color: isDisabled ? '#64748b' : 'var(--text-primary, #f8fafc)',
          border: `1px solid ${isHovered && !isDisabled ? 'var(--card-border-hover, #334155)' : 'var(--card-border, #1e293b)'}`,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        };
    }
  };

  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.65 : 1,
    transition: 'all var(--transition-fast, 150ms cubic-bezier(0.4, 0, 0.2, 1))',
    outline: isFocused ? '2px solid var(--accent-cyan, #38bdf8)' : 'none',
    outlineOffset: '2px',
    userSelect: 'none',
    ...sizeStyles[size],
    ...getVariantStyle(),
    ...style,
  };

  return (
    <button
      type={type}
      className={`adpilot-button ${className}`.trim()}
      style={buttonStyle}
      disabled={isDisabled}
      aria-busy={loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      {...rest}
    >
      {loading ? (
        <svg
          style={{
            animation: 'adpilot-spin 1s linear infinite',
            width: size === 'sm' ? 14 : size === 'lg' ? 20 : 16,
            height: size === 'sm' ? 14 : size === 'lg' ? 20 : 16,
          }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <style>
            {`@keyframes adpilot-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
          </style>
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="30 60"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
      )}
      {children && <span>{children}</span>}
    </button>
  );
};

export default Button;
