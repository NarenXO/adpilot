import React from 'react';

export interface NavItem {
  label: string;
  path: string;
  icon: React.FC<{ size?: number }>;
  badge?: string;
}

// Hand-written inline SVG icons (20x20)
export const DashboardIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);

export const AlertTriangleIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const StethoscopeIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4.5 3v5a4.5 4.5 0 009 0V3" />
    <path d="M9 12.5v3a4.5 4.5 0 009 0v-2" />
    <circle cx="18" cy="11.5" r="2" />
  </svg>
);

export const PackageIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16.5 9.4L7.55 4.24a1.8 1.8 0 00-1.8 0L2.7 6.05A1.8 1.8 0 001.8 7.6v8.8a1.8 1.8 0 00.9 1.55l8.55 4.95a1.8 1.8 0 001.8 0l8.55-4.95a1.8 1.8 0 00.9-1.55V7.6a1.8 1.8 0 00-.9-1.55l-3.05-1.81" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

export const SlidersIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

export const ClipboardCheckIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <polyline points="9 14 11 16 15 11" />
  </svg>
);

export const CloseIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const MenuIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export const navItems: NavItem[] = [
  { label: 'Mission Control', path: '/', icon: DashboardIcon },
  { label: 'Incidents', path: '/incidents', icon: AlertTriangleIcon },
  { label: 'Diagnosis', path: '/diagnosis', icon: StethoscopeIcon },
  { label: 'Inventory×Margin', path: '/inventory-margin', icon: PackageIcon },
  { label: 'Optimizer Studio', path: '/optimizer', icon: SlidersIcon },
  { label: 'Proof', path: '/proof', icon: ClipboardCheckIcon },
];

export interface SidebarProps {
  activePath?: string;
  onNavigate?: (path: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePath = '/',
  onNavigate,
  isOpen = true,
  onClose,
  className = '',
  style,
}) => {
  return (
    <aside
      className={`adpilot-sidebar ${className}`.trim()}
      style={{
        width: '240px',
        minWidth: '240px',
        maxWidth: '240px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--card-glass, rgba(15, 23, 42, 0.85))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRight: '1px solid var(--card-border, #1e293b)',
        position: 'relative',
        zIndex: 100,
        boxSizing: 'border-box',
        userSelect: 'none',
        ...style,
      }}
      aria-label="Sidebar navigation"
    >
      {/* Brand Header */}
      <div
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem',
          borderBottom: '1px solid var(--card-border, #1e293b)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontFamily: 'var(--font-sans)',
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary, #f8fafc)',
          }}
        >
          <span>AdPilot</span>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-cyan, #38bdf8)',
              boxShadow: '0 0 10px var(--accent-cyan, #38bdf8)',
              display: 'inline-block',
            }}
            aria-hidden="true"
          />
        </div>

        {/* Mobile close button (shown on narrow screens) */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.375rem',
            }}
          >
            <CloseIcon size={18} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav
        style={{
          flex: 1,
          padding: '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.375rem',
          overflowY: 'auto',
        }}
      >
        {navItems.map((item) => {
          const isActive = activePath === item.path;
          const Icon = item.icon;

          // TODO: swap to NavLink once routing dep confirmed
          return (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate(item.path);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.875rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none',
                color: isActive
                  ? 'var(--text-primary, #f8fafc)'
                  : 'var(--text-secondary, #94a3b8)',
                backgroundColor: isActive
                  ? 'rgba(56, 189, 248, 0.1)'
                  : 'transparent',
                borderLeft: isActive
                  ? '3px solid var(--accent-cyan, #38bdf8)'
                  : '3px solid transparent',
                boxShadow: isActive
                  ? 'inset 4px 0 12px -4px rgba(56, 189, 248, 0.35)'
                  : 'none',
                transition: 'all var(--transition-fast, 150ms cubic-bezier(0.4, 0, 0.2, 1))',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = 'var(--text-primary, #f8fafc)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary, #94a3b8)';
                }
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                style={{
                  color: isActive
                    ? 'var(--accent-cyan, #38bdf8)'
                    : 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Icon size={20} />
              </span>
              <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
              {item.badge && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(56, 189, 248, 0.2)',
                    color: 'var(--accent-cyan, #38bdf8)',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </a>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--card-border, #1e293b)',
          fontSize: '0.75rem',
          color: 'var(--text-muted, #64748b)',
          fontFamily: 'var(--font-mono, monospace)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>v10.0-hackathon</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--accent-neon-green, #10b981)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-neon-green, #10b981)',
              boxShadow: '0 0 6px var(--accent-neon-green, #10b981)',
            }}
          />
          ONLINE
        </span>
      </div>
    </aside>
  );
};

export default Sidebar;
