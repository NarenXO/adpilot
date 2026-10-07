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
    dotColor: '#000000',
    textColor: '#000000',
    bg: '#82e66f', // lime
    border: '2px solid #000000',
    glow: 'none',
  },
  warning: {
    dotColor: '#000000',
    textColor: '#000000',
    bg: '#ffd23f', // yellow
    border: '2px solid #000000',
    glow: 'none',
  },
  danger: {
    dotColor: '#000000',
    textColor: '#000000',
    bg: '#f364cb', // pink
    border: '2px solid #000000',
    glow: 'none',
  },
  info: {
    dotColor: '#000000',
    textColor: '#000000',
    bg: '#78dbf6', // cyan
    border: '2px solid #000000',
    glow: 'none',
  },
  neutral: {
    dotColor: '#000000',
    textColor: '#000000',
    bg: '#e1e1d8', // gray
    border: '2px solid #000000',
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
    borderRadius: '0px',
    fontSize: '0.6875rem',
    fontWeight: 700,
    lineHeight: '1rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#000000',
    backgroundColor: config.bg,
    border: '2px solid #000000',
    fontFamily: "'Space Grotesk', monospace",
    whiteSpace: 'nowrap',
    ...style,
  };

  const dotStyle: React.CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: '0px',
    backgroundColor: '#000000',
    flexShrink: 0,
    animation: pulse ? 'status-pulse 1.4s ease-in-out infinite' : undefined,
  };

  return (
    <span
      className={`adpilot-status-badge brutal-badge ${className}`.trim()}
      style={containerStyle}
      {...rest}
    >
      <span style={dotStyle} aria-hidden="true" />
      {children && <span>{children}</span>}
    </span>
  );
};

export default StatusBadge;
