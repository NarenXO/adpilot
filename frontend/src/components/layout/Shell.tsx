import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AppStateProvider } from '../../context/AppStateContext';

export interface ShellProps {
  children: React.ReactNode;
  defaultActivePath?: string;
}

const MOBILE_BREAKPOINT = 1024;

export const Shell: React.FC<ShellProps> = ({
  children,
  defaultActivePath = '/',
}) => {
  const [activePath, setActivePath] = useState<string>(
    defaultActivePath || (typeof window !== 'undefined' ? window.location.pathname : '/')
  );
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth >= MOBILE_BREAKPOINT : true
  );
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  // Track viewport width to toggle mobile mode
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) {
        // On desktop, always show sidebar
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on Escape key (mobile overlay)
  useEffect(() => {
    if (!isMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, sidebarOpen]);

  const handleNavigate = useCallback((path: string) => {
    setActivePath(path);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <AppStateProvider>
    <div
      id="adpilot-shell"
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '240px 1fr',
        gridTemplateRows: '64px 1fr',
        gridTemplateAreas: isMobile
          ? '"topbar" "main"'
          : '"sidebar topbar" "sidebar main"',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--bg-primary, #0a0d14)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ─── Sidebar Area ──────────────────────────────────────────────── */}
      {!isMobile ? (
        /* Desktop: Sidebar in grid area, spans both rows */
        <div
          style={{
            gridArea: 'sidebar',
            gridRow: '1 / 3',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Sidebar
            activePath={activePath}
            onNavigate={handleNavigate}
          />
        </div>
      ) : (
        /* Mobile: Sidebar as overlay drawer */
        <>
          {/* Overlay backdrop */}
          {sidebarOpen && (
            <div
              aria-hidden="true"
              onClick={handleSidebarClose}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                zIndex: 150,
              }}
            />
          )}
          {/* Sidebar drawer */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              zIndex: 200,
              transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform',
            }}
            aria-hidden={!sidebarOpen}
          >
            <Sidebar
              activePath={activePath}
              onNavigate={handleNavigate}
              isOpen={sidebarOpen}
              onClose={handleSidebarClose}
              style={{ height: '100%' }}
            />
          </div>
        </>
      )}

      {/* ─── TopBar Area ───────────────────────────────────────────────── */}
      <div
        style={{
          gridArea: 'topbar',
          overflow: 'hidden',
        }}
      >
        <TopBar onMenuToggle={isMobile ? handleMenuToggle : undefined} />
      </div>

      {/* ─── Main Content Area ─────────────────────────────────────────── */}
      <main
        id="adpilot-main-content"
        style={{
          gridArea: 'main',
          padding: '1.5rem',
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: 'var(--bg-primary, #0a0d14)',
          boxSizing: 'border-box',
          // Subtle inner scrollbar
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--card-border, #1e293b) transparent',
        }}
        tabIndex={-1}
        aria-label="Main content"
      >
        {children}
      </main>
    </div>
    </AppStateProvider>
  );
};

export default Shell;
