import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';

// Frozen Contract Fields Mirror (AppState from backend/contracts/schemas.py)
export interface RiskBudget {
  used_pct: number;
  cap_pct: number;
}

export type AutonomyLevel = 'supervised' | 'autopilot';
export type PlaySpeed = 1 | 2 | 5;

export interface AppState {
  sim_date: string;
  autonomy_level: AutonomyLevel;
  risk_budget: RiskBudget;
  is_playing: boolean;
  play_speed: PlaySpeed;
  killswitch_active: boolean;
}

// TODO: wire to global store in Phase 3
const INITIAL_APP_STATE: AppState = {
  sim_date: '2024-06-15',
  autonomy_level: 'supervised',
  risk_budget: { used_pct: 4.2, cap_pct: 10.0 },
  is_playing: false,
  play_speed: 1,
  killswitch_active: false,
};

// Hand-written inline SVG icons
export const PlayIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const PauseIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

export const StepForwardIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" />
    <line x1="19" y1="5" x2="19" y2="19" />
  </svg>
);

export const SunIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

export const MoonIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const AlertOctagonIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export interface TopBarProps {
  onMenuToggle?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const TopBar: React.FC<TopBarProps> = ({
  onMenuToggle,
  className = '',
  style,
}) => {
  const { theme, toggleTheme } = useTheme();

  // Local state mirroring AppState for Phase 2
  // TODO: wire to global store in Phase 3
  const [appState, setAppState] = useState<AppState>(INITIAL_APP_STATE);
  const [showKillSwitchModal, setShowKillSwitchModal] = useState<boolean>(false);

  // Play / Pause toggle
  const togglePlay = () => {
    setAppState((prev) => ({ ...prev, is_playing: !prev.is_playing }));
  };

  // Step-forward by 1 day
  const stepForward = () => {
    setAppState((prev) => {
      const parts = prev.sim_date.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + 1);
      const nextDate = d.toISOString().split('T')[0];
      return { ...prev, sim_date: nextDate };
    });
  };

  // Change simulation speed
  const setSpeed = (speed: PlaySpeed) => {
    setAppState((prev) => ({ ...prev, play_speed: speed }));
  };

  // Toggle autonomy level between supervised and autopilot
  const toggleAutonomy = () => {
    setAppState((prev) => ({
      ...prev,
      autonomy_level: prev.autonomy_level === 'supervised' ? 'autopilot' : 'supervised',
    }));
  };

  // Kill Switch confirmation handler
  const handleConfirmKillSwitch = () => {
    setAppState((prev) => ({
      ...prev,
      killswitch_active: !prev.killswitch_active,
      is_playing: prev.killswitch_active ? prev.is_playing : false, // pause when killswitch activates
    }));
    setShowKillSwitchModal(false);
  };

  // Close modal on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showKillSwitchModal) {
        setShowKillSwitchModal(false);
      }
    },
    [showKillSwitchModal]
  );

  useEffect(() => {
    if (showKillSwitchModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showKillSwitchModal, handleKeyDown]);

  // Risk Budget calculation
  const usedPct = appState.risk_budget.used_pct;
  const capPct = appState.risk_budget.cap_pct;
  const ratio = capPct > 0 ? (usedPct / capPct) * 100 : 0;
  const clampedRatio = Math.min(Math.max(ratio, 0), 100);

  // Color logic for risk bar: <50% green, 50-80% amber, >80% red
  const getRiskColor = () => {
    if (clampedRatio < 50) return 'var(--accent-neon-green, #10b981)';
    if (clampedRatio <= 80) return 'var(--accent-amber, #f59e0b)';
    return 'var(--accent-red, #ef4444)';
  };

  const isAutopilot = appState.autonomy_level === 'autopilot';

  return (
    <header
      className={`adpilot-topbar ${className}`.trim()}
      style={{
        height: '64px',
        minHeight: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        backgroundColor: 'var(--card-glass, rgba(15, 23, 42, 0.85))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--card-border, #1e293b)',
        position: 'sticky',
        top: 0,
        zIndex: 90,
        boxSizing: 'border-box',
        gap: '1rem',
        ...style,
      }}
      aria-label="Application Top Bar"
    >
      {/* ─── LEFT SECTION: Simulation Controls ─────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.875rem',
          flexShrink: 0,
        }}
      >
        {/* Mobile menu trigger */}
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="Toggle navigation menu"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '0.375rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}

        {/* Simulation Date in JetBrains Mono */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.3rem 0.65rem',
            borderRadius: '0.375rem',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--card-border, #1e293b)',
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: 'var(--text-primary, #f8fafc)',
            whiteSpace: 'nowrap',
          }}
          title="Current Simulation Date"
        >
          <span style={{ color: 'var(--accent-cyan, #38bdf8)' }}>SIM</span>
          <span>{appState.sim_date}</span>
        </div>

        {/* Play / Pause Toggle Button */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={appState.is_playing ? 'Pause Simulation' : 'Play Simulation'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '0.375rem',
            backgroundColor: appState.is_playing
              ? 'rgba(16, 185, 129, 0.2)'
              : 'rgba(56, 189, 248, 0.15)',
            border: `1px solid ${
              appState.is_playing
                ? 'var(--accent-neon-green, #10b981)'
                : 'var(--accent-cyan, #38bdf8)'
            }`,
            color: appState.is_playing
              ? 'var(--accent-neon-green, #10b981)'
              : 'var(--accent-cyan, #38bdf8)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast, 150ms cubic-bezier(0.4, 0, 0.2, 1))',
          }}
        >
          {appState.is_playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
        </button>

        {/* Step Forward (single day) Button */}
        <button
          type="button"
          onClick={stepForward}
          aria-label="Step forward 1 day"
          title="Step forward 1 day"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '0.375rem',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--card-border, #1e293b)',
            color: 'var(--text-secondary, #94a3b8)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast, 150ms cubic-bezier(0.4, 0, 0.2, 1))',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary, #f8fafc)';
            e.currentTarget.style.borderColor = 'var(--accent-cyan, #38bdf8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary, #94a3b8)';
            e.currentTarget.style.borderColor = 'var(--card-border, #1e293b)';
          }}
        >
          <StepForwardIcon size={14} />
        </button>

        {/* Speed Segmented Control */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: '0.375rem',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--card-border, #1e293b)',
            padding: '2px',
            gap: '2px',
          }}
          role="group"
          aria-label="Simulation Play Speed"
        >
          {([1, 2, 5] as PlaySpeed[]).map((speed) => {
            const isSelected = appState.play_speed === speed;
            return (
              <button
                key={speed}
                type="button"
                onClick={() => setSpeed(speed)}
                aria-pressed={isSelected}
                style={{
                  background: isSelected ? 'var(--accent-cyan, #38bdf8)' : 'transparent',
                  color: isSelected ? '#0a0d14' : 'var(--text-muted, #64748b)',
                  border: 'none',
                  borderRadius: '0.25rem',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono, monospace)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast, 150ms cubic-bezier(0.4, 0, 0.2, 1))',
                }}
              >
                {speed}x
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── CENTER SECTION: Autonomy Ring Badge ───────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <button
          type="button"
          onClick={toggleAutonomy}
          aria-label={`Current autonomy mode: ${appState.autonomy_level}. Click to toggle.`}
          title="Click to toggle autonomy level"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            borderRadius: '9999px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              backgroundColor: isAutopilot
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(245, 158, 11, 0.12)',
              border: `1px solid ${
                isAutopilot
                  ? 'rgba(16, 185, 129, 0.4)'
                  : 'rgba(245, 158, 11, 0.4)'
              }`,
              transition: 'all var(--transition-fast, 150ms cubic-bezier(0.4, 0, 0.2, 1))',
            }}
          >
            {/* Pulsing ring indicator */}
            <span
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '10px',
                height: '10px',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  backgroundColor: isAutopilot
                    ? 'var(--accent-neon-green, #10b981)'
                    : 'var(--accent-amber, #f59e0b)',
                  opacity: 0.75,
                  animation: 'status-pulse 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
                }}
              />
              <span
                style={{
                  position: 'relative',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isAutopilot
                    ? 'var(--accent-neon-green, #10b981)'
                    : 'var(--accent-amber, #f59e0b)',
                  boxShadow: isAutopilot
                    ? '0 0 6px var(--accent-neon-green, #10b981)'
                    : '0 0 6px var(--accent-amber, #f59e0b)',
                }}
              />
            </span>

            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: isAutopilot
                  ? 'var(--accent-neon-green, #10b981)'
                  : 'var(--accent-amber, #f59e0b)',
              }}
            >
              {isAutopilot ? 'Autopilot' : 'Supervised'}
            </span>
          </div>
        </button>
      </div>

      {/* ─── RIGHT SECTION: Risk Budget + Kill Switch + Theme Toggle ──── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexShrink: 0,
        }}
      >
        {/* Risk Budget Mini-Gauge */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            minWidth: '130px',
          }}
          title={`Risk Budget: ${usedPct.toFixed(1)}% used of ${capPct.toFixed(1)}% cap (${clampedRatio.toFixed(0)}%)`}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.6875rem',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.625rem', textTransform: 'uppercase' }}>
              Risk Budget
            </span>
            <span style={{ color: 'var(--text-primary, #f8fafc)', fontWeight: 600 }}>
              {usedPct.toFixed(1)}% / {capPct.toFixed(1)}%
            </span>
          </div>

          {/* Horizontal Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '5px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${clampedRatio}%`,
                height: '100%',
                backgroundColor: getRiskColor(),
                borderRadius: '9999px',
                transition: 'width 300ms ease, background-color 300ms ease',
                boxShadow: `0 0 8px ${getRiskColor()}`,
              }}
            />
          </div>
        </div>

        {/* KILL SWITCH Button */}
        <button
          type="button"
          onClick={() => setShowKillSwitchModal(true)}
          aria-label={appState.killswitch_active ? 'Kill switch active: click to resume' : 'Activate Kill Switch'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.85rem',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono, monospace)',
            transition: 'all var(--transition-fast, 150ms cubic-bezier(0.4, 0, 0.2, 1))',
            backgroundColor: appState.killswitch_active
              ? 'var(--accent-red, #ef4444)'
              : 'rgba(239, 68, 68, 0.12)',
            color: appState.killswitch_active
              ? '#ffffff'
              : 'var(--accent-red, #ef4444)',
            border: appState.killswitch_active
              ? '1px solid #ff6b6b'
              : '1px solid var(--accent-red, #ef4444)',
            animation: appState.killswitch_active
              ? 'killswitch-pulse 1.4s ease-in-out infinite'
              : undefined,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: appState.killswitch_active ? '#ffffff' : 'var(--accent-red, #ef4444)',
              boxShadow: appState.killswitch_active
                ? '0 0 6px #ffffff'
                : '0 0 6px var(--accent-red, #ef4444)',
            }}
            aria-hidden="true"
          />
          <span>{appState.killswitch_active ? 'ACTIVE — RESUME' : 'KILL SWITCH'}</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '34px',
            height: '34px',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--card-border, #1e293b)',
            color: 'var(--text-secondary, #94a3b8)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast, 150ms cubic-bezier(0.4, 0, 0.2, 1))',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary, #f8fafc)';
            e.currentTarget.style.borderColor = 'var(--card-border-hover, #334155)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary, #94a3b8)';
            e.currentTarget.style.borderColor = 'var(--card-border, #1e293b)';
          }}
        >
          {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>
      </div>

      {/* ─── KILL SWITCH CONFIRMATION MODAL ────────────────────────────── */}
      {showKillSwitchModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="killswitch-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowKillSwitchModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--card-glass-elevated, #1e293b)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-xl, 0.875rem)',
              padding: '1.75rem',
              maxWidth: '440px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              color: 'var(--text-primary, #f8fafc)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-red, #ef4444)' }}>
              <AlertOctagonIcon size={26} />
              <h2
                id="killswitch-modal-title"
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary, #f8fafc)',
                }}
              >
                {appState.killswitch_active ? 'Resume Autonomous Execution?' : 'Activate Kill Switch?'}
              </h2>
            </div>

            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.5 }}>
              {appState.killswitch_active
                ? 'Deactivating the kill switch will allow the simulation and autonomous actions to resume execution.'
                : 'Activate Kill Switch? All autonomous actions, optimization loops, and active rollouts will halt immediately.'}
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                marginTop: '0.5rem',
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKillSwitchModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmKillSwitch}
                autoFocus
              >
                {appState.killswitch_active ? 'Confirm — Resume' : 'Confirm — Activate'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default TopBar;
