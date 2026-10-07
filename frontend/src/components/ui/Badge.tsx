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

interface VariantColorConfig {
  color: string;
  bg: string;
  border: string;
}

const getVariantConfig = (variant: BadgeVariant, outline?: boolean): VariantColorConfig => {
  // Provenance variants (measured / derived / scenario)
  if (variant === 'measured' || variant === 'derived' || variant === 'scenario') {
    const prov = provenanceColor[variant];
    return {
      color: prov.color,
      bg: prov.bgAlpha,
      border: `1px solid ${prov.color}`,
    };
  }

  // General Status Variants
  switch (variant) {
    case 'success':
      return {
        color: 'var(--accent-neon-green, #10b981)',
        bg: outline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.18)',
        border: outline ? '1px solid var(--accent-neon-green, #10b981)' : '1px solid rgba(16, 185, 129, 0.3)',
      };
    case 'warning':
      return {
        color: 'var(--accent-amber, #f59e0b)',
        bg: outline ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.18)',
        border: outline ? '1px solid var(--accent-amber, #f59e0b)' : '1px solid rgba(245, 158, 11, 0.3)',
      };
    case 'danger':
      return {
        color: 'var(--accent-red, #ef4444)',
        bg: outline ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.18)',
        border: outline ? '1px solid var(--accent-red, #ef4444)' : '1px solid rgba(239, 68, 68, 0.3)',
      };
    case 'info':
      return {
        color: 'var(--accent-cyan, #38bdf8)',
        bg: outline ? 'rgba(56, 189, 248, 0.12)' : 'rgba(56, 189, 248, 0.18)',
        border: outline ? '1px solid var(--accent-cyan, #38bdf8)' : '1px solid rgba(56, 189, 248, 0.3)',
      };
    case 'neutral':
    default:
      return {
        color: 'var(--text-secondary, #94a3b8)',
        bg: outline ? 'rgba(148, 163, 184, 0.08)' : 'rgba(148, 163, 184, 0.14)',
        border: outline ? '1px solid var(--text-secondary, #94a3b8)' : '1px solid rgba(148, 163, 184, 0.25)',
      };
  }
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  outline,
  children,
  className = '',
  style,
  ...rest
}) => {
  const isProvenance = variant === 'measured' || variant === 'derived' || variant === 'scenario';
  const effectiveOutline = outline ?? isProvenance;
  const config = getVariantConfig(variant, effectiveOutline);

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.15rem 0.55rem',
    borderRadius: '9999px',
    fontSize: '0.6875rem', // 11px
    fontWeight: 600,
    lineHeight: '1rem',
    letterSpacing: '0.04em',
    textTransform: isProvenance ? 'uppercase' : 'none',
    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
    color: config.color,
    backgroundColor: config.bg,
    border: config.border,
    whiteSpace: 'nowrap',
    transition: 'all var(--transition-fast, 150ms cubic-bezier(0.4, 0, 0.2, 1))',
    ...style,
  };

  return (
    <span
      className={`adpilot-badge ${className}`.trim()}
      style={badgeStyle}
      {...rest}
    >
      {children}
    </span>
  );
};

export default Badge;
