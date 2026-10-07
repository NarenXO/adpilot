import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  path: string;
  icon: React.FC<{ size?: number }>;
  badge?: string;
}

export const DashboardIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

export const AlertTriangleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const StethoscopeIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 3v5a4.5 4.5 0 009 0V3" /><path d="M9 12.5v3a4.5 4.5 0 009 0v-2" /><circle cx="18" cy="11.5" r="2" />
  </svg>
);

export const PackageIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
  </svg>
);

export const SlidersIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

export const ClipboardCheckIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12l2 2 4-4" />
  </svg>
);

export const CloseIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Nav config ───────────────────────────────────────────────────────────────

export const navItems: NavItem[] = [
  { label: 'Mission Control', path: '/',          icon: DashboardIcon },
  { label: 'Incidents',       path: '/incidents',  icon: AlertTriangleIcon },
  { label: 'Diagnosis',       path: '/diagnosis',  icon: StethoscopeIcon },
  { label: 'Inventory',       path: '/inventory',  icon: PackageIcon },
  { label: 'Optimizer',       path: '/optimizer',  icon: SlidersIcon },
  { label: 'Proof',           path: '/proof',      icon: ClipboardCheckIcon },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export interface SidebarProps {
  activePath?: string;
  onNavigate?: (path: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onClose,
  className = '',
  style,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const activePath = location.pathname;

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigate(path);
    if (onClose) onClose();
  };

  return (
    <aside
      className={`adpilot-sidebar ${className}`.trim()}
      style={{
        width: '240px', minWidth: '240px', maxWidth: '240px',
        height: '100%',
        display: 'flex', flexDirection: 'column',
        backgroundColor: '#ffffff',
        borderRight: '3px solid #000000',
        position: 'relative', zIndex: 100,
        boxSizing: 'border-box', userSelect: 'none',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        ...style,
      }}
      aria-label="Sidebar navigation"
    >
      {/* ── Brand Header ──────────────────────────────────────────────────── */}
      <div
        style={{
          height: '64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 1.25rem',
          borderBottom: '3px solid #000000',
          backgroundColor: '#ffd23f',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Logo mark */}
          <div style={{
            width: '30px', height: '30px',
            backgroundColor: '#000000', border: '2px solid #000000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#ffd23f', fontWeight: 900, fontSize: '0.875rem', lineHeight: 1 }}>AP</span>
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#000000', lineHeight: 1 }}>AdPilot</div>
            <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#000000', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.2 }}>D2C Decision Engine</div>
          </div>
        </div>

        {/* Mobile close */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            style={{
              background: 'none', border: '2px solid #000000',
              color: '#000000', cursor: 'pointer',
              padding: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <CloseIcon size={16} />
          </button>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav
        style={{
          flex: 1, padding: '0.75rem 0',
          display: 'flex', flexDirection: 'column', gap: '2px',
          overflowY: 'auto',
        }}
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const isActive = activePath === item.path;
          const Icon = item.icon;

          return (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => handleNav(e, item.path)}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 1rem',
                fontSize: '0.8125rem', fontWeight: isActive ? 700 : 600,
                textDecoration: 'none',
                color: '#000000',
                backgroundColor: isActive ? '#78dbf6' : 'transparent',
                borderLeft: isActive ? '4px solid #000000' : '4px solid transparent',
                borderRight: isActive ? '0' : '0',
                transition: 'background-color 80ms ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#f3f3ed';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <Icon size={18} />
              </span>
              <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  fontSize: '0.625rem', padding: '0.1rem 0.4rem',
                  backgroundColor: '#ffd23f', color: '#000000',
                  border: '1.5px solid #000000', fontWeight: 700,
                  fontFamily: "'Space Grotesk', monospace",
                }}>
                  {item.badge}
                </span>
              )}
            </a>
          );
        })}
      </nav>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderTop: '3px solid #000000',
          fontSize: '0.6875rem',
          color: '#4a4a46',
          fontFamily: "'Space Grotesk', monospace", fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span>v10.0-hackathon</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#000000' }}>
          <span style={{ width: '7px', height: '7px', backgroundColor: '#82e66f', border: '1.5px solid #000000', display: 'inline-block' }} />
          ONLINE
        </span>
      </div>
    </aside>
  );
};

export default Sidebar;
