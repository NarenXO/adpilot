import React from 'react';

export type StatusType = 'safe' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: StatusType;
  pulse?: boolean;
  children?: React.ReactNode;
  className?: string;
}

interface StatusConfig {
  dotColor: string;
  textColor: string;
  bg: string;
  border: string;
  glow: string;
}

const statusConfigs: Record<StatusType, StatusConfig> = {
  safe: {
    dotColor: 'var(--accent-neon-green, #10b981)',
    textColor: 'var(--accent-neon-green, #10b981)',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.28)',
    glow: '0 0 6px rgba(16, 185, 129, 0.5)',
  },
  warning: {
    dotColor: 'var(--accent-amber, #f59e0b)',
    textColor: 'var(--accent-amber, #f59e0b)',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.28)',
    glow: '0 0 6px rgba(245, 158, 11, 0.5)',
  },
  danger: {
    dotColor: 'var(--accent-red, #ef4444)',
    textColor: 'var(--accent-red, #ef4444)',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.28)',
    glow: '0 0 6px rgba(239, 68, 68, 0.5)',
  },
  info: {
    dotColor: 'var(--accent-cyan, #38bdf8)',
    textColor: 'var(--accent-cyan, #38bdf8)',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.28)',
    glow: '0 0 6px rgba(56, 189, 248, 0.5)',
  },
  neutral: {
    dotColor: 'var(--text-secondary, #94a3b8)',
    textColor: 'var(--text-secondary, #94a3b8)',
    bg: 'rgba(148, 163, 184, 0.1)',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    glow: 'none',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'neutral',
  pulse = false,
  children,
  className = '',
  style,
  ...rest
}) => {
  const config = statusConfigs[status] || statusConfigs.neutral;

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.2rem 0.625rem',
    borderRadius: '9999px',
    fontSize: '0.6875rem', // 11px
    fontWeight: 600,
    lineHeight: '1rem',
    letterSpacing: '0.03em',
    color: config.textColor,
    backgroundColor: config.bg,
    border: config.border,
    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
    whiteSpace: 'nowrap',
    transition: 'all var(--transition-fast, 150ms cubic-bezier(0.4, 0, 0.2, 1))',
    ...style,
  };

  const dotStyle: React.CSSProperties = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: config.dotColor,
    boxShadow: config.glow,
    flexShrink: 0,
    animation: pulse ? 'status-pulse 1.8s ease-in-out infinite' : undefined,
  };

  return (
    <span
      className={`adpilot-status-badge ${className}`.trim()}
      style={containerStyle}
      {...rest}
    >
      <span style={dotStyle} aria-hidden="true" />
      {children && <span>{children}</span>}
    </span>
  );
};

export default StatusBadge;
