import React from 'react';
import { provenanceColor, ProvenanceType } from '../../theme/tokens';

export type BadgeVariant =
  | ProvenanceType
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  outline?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const getVariantBg = (variant: BadgeVariant): string => {
  if (variant === 'measured') return '#78dbf6'; // cyan
  if (variant === 'derived') return '#f364cb';  // pink
  if (variant === 'scenario') return '#ffd23f'; // yellow

  switch (variant) {
    case 'success':
      return '#82e66f'; // lime
    case 'warning':
      return '#ffd23f'; // yellow
    case 'danger':
      return '#f364cb'; // pink
    case 'info':
      return '#78dbf6'; // cyan
    case 'neutral':
    default:
      return '#e1e1d8'; // gray
  }
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  outline = false,
  children,
  className = '',
  style,
  ...rest
}) => {
  const bg = getVariantBg(variant);

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.15rem 0.5rem',
    borderRadius: '0px',
    fontSize: '0.6875rem',
    fontWeight: 700,
    lineHeight: '1rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    fontFamily: "'Space Grotesk', monospace",
    color: '#000000',
    backgroundColor: outline ? '#ffffff' : bg,
    border: '2px solid #000000',
    boxShadow: outline ? `2px 2px 0px #000000` : 'none',
    whiteSpace: 'nowrap',
    ...style,
  };

  return (
    <span
      className={`adpilot-badge brutal-badge ${className}`.trim()}
      style={badgeStyle}
      {...rest}
    >
      {children}
    </span>
  );
};

export default Badge;
