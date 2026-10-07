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
    borderRadius: '0px',
    gap: '0.375rem',
  },
  md: {
    padding: '0.55rem 1.1rem',
    fontSize: '0.875rem',
    borderRadius: '0px',
    gap: '0.5rem',
  },
  lg: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    borderRadius: '0px',
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
  const isDisabled = disabled || loading;

  const getVariantStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: isDisabled ? '#e1e1d8' : '#78dbf6', // cyan
          color: '#000000',
          border: '3px solid #000000',
          boxShadow: isDisabled ? 'none' : '3px 3px 0px #000000',
        };
      case 'danger':
        return {
          backgroundColor: isDisabled ? '#e1e1d8' : '#f364cb', // pink
          color: '#000000',
          border: '3px solid #000000',
          boxShadow: isDisabled ? 'none' : '3px 3px 0px #000000',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: '#000000',
          border: '3px solid #000000',
          boxShadow: 'none',
        };
      case 'secondary':
      default:
        return {
          backgroundColor: isDisabled ? '#e1e1d8' : '#ffffff', // white
          color: '#000000',
          border: '3px solid #000000',
          boxShadow: isDisabled ? 'none' : '3px 3px 0px #000000',
        };
    }
  };

  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    transition: 'transform 100ms ease, box-shadow 100ms ease',
    outline: 'none',
    boxSizing: 'border-box',
    ...sizeStyles[size],
    ...getVariantStyle(),
    ...style,
  };

  return (
    <button
      type={type}
      className={`adpilot-button brutal-btn ${className}`.trim()}
      style={buttonStyle}
      disabled={isDisabled}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <span
          style={{
            width: '14px',
            height: '14px',
            border: '2px solid #000000',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'status-pulse 1s linear infinite',
          }}
          aria-hidden="true"
        />
      ) : (
        icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
      )}
      {children && <span>{children}</span>}
    </button>
  );
};

export default Button;
