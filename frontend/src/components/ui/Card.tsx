import React from 'react';

export type CardVariant = 'default' | 'elevated' | 'flat';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  action?: React.ReactNode;
  variant?: CardVariant;
  titleBarColor?: string;
  className?: string;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  action,
  variant = 'default',
  titleBarColor,
  className = '',
  children,
  style,
  ...rest
}) => {
  const baseStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '3px solid #000000',
    boxShadow: '5px 5px 0px #000000',
    borderRadius: '0px',
    padding: '1.25rem',
    color: '#000000',
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    transition: 'transform 120ms ease, box-shadow 120ms ease',
    ...style,
  };

  const hasHeader = Boolean(title || action);

  return (
    <div
      className={`adpilot-card brutal-card ${className}`.trim()}
      style={baseStyle}
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
            padding: titleBarColor ? '0.5rem 0.75rem' : undefined,
            backgroundColor: titleBarColor || undefined,
            border: titleBarColor ? '2px solid #000000' : undefined,
            margin: titleBarColor && children ? '-0.25rem -0.25rem 1rem -0.25rem' : undefined,
          }}
        >
          {title && (
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                color: '#000000',
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
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
