import React from 'react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
  style,
  ...rest
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '3rem 2rem',
    borderRadius: '0px',
    border: '3px dashed #000000',
    backgroundColor: '#ffffff',
    color: '#000000',
    maxWidth: '480px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    ...style,
  };

  const iconWrapperStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: '0px',
    backgroundColor: '#ffd23f',
    border: '3px solid #000000',
    boxShadow: '3px 3px 0px #000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#000000',
    marginBottom: '1rem',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#000000',
    marginBottom: '0.5rem',
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: '#4a4a46',
    lineHeight: 1.5,
    marginBottom: action ? '1.25rem' : '0',
    maxWidth: '360px',
  };

  return (
    <div
      className={`adpilot-empty-state brutal-card ${className}`.trim()}
      style={containerStyle}
      {...rest}
    >
      {icon ? (
        <div style={iconWrapperStyle}>{icon}</div>
      ) : (
        <div style={iconWrapperStyle} aria-hidden="true">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
      )}
      <h3 style={titleStyle}>{title}</h3>
      {description && <p style={descriptionStyle}>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
