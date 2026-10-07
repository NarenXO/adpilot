import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { useAppState } from '../../context/AppStateContext';
import type { PlaySpeed } from '../../context/AppStateContext';

// Re-export types for backward compatibility
export type { RiskBudget, AutonomyLevel, PlaySpeed, AppState } from '../../context/AppStateContext';

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────

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
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" />
    <line x1="19" y1="5" x2="19" y2="19" />
  </svg>
);

export const AlertOctagonIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// Keep exports for compat
export const SunIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

export const MoonIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export interface TopBarProps {
  onMenuToggle?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

// ─── Neo-Brutalist TopBar ─────────────────────────────────────────────────────

export const TopBar: React.FC<TopBarProps> = ({ onMenuToggle, className = '', style }) => {
  const { theme } = useTheme();

  const {
    appState,
    togglePlay,
    stepForward,
    setSpeed,
    toggleAutonomy,
    activateKillSwitch,
    deactivateKillSwitch,
  } = useAppState();

  const [showKillSwitchModal, setShowKillSwitchModal] = useState<boolean>(false);

  const handleConfirmKillSwitch = () => {
    if (appState.killswitch_active) {
      deactivateKillSwitch();
    } else {
      activateKillSwitch();
    }
    setShowKillSwitchModal(false);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showKillSwitchModal) setShowKillSwitchModal(false);
  }, [showKillSwitchModal]);

  useEffect(() => {
    if (showKillSwitchModal) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showKillSwitchModal, handleKeyDown]);

  const usedPct = appState.risk_budget.used_pct;
  const capPct = appState.risk_budget.cap_pct;
  const ratio = capPct > 0 ? (usedPct / capPct) * 100 : 0;
  const clampedRatio = Math.min(Math.max(ratio, 0), 100);
  const isAutopilot = appState.autonomy_level === 'autopilot';

  const riskBarColor = clampedRatio < 50 ? '#82e66f' : clampedRatio <= 80 ? '#ffd23f' : '#f364cb';

  // ─── Shared button base ───────────────────────────────────────────────────
  const ctrlBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    height: '32px', minWidth: '32px', padding: '0 0.55rem',
    border: '2px solid #000000', boxShadow: '2px 2px 0px #000000',
    backgroundColor: '#ffffff', color: '#000000',
    fontFamily: "'Space Grotesk', monospace", fontSize: '0.75rem', fontWeight: 700,
    cursor: 'pointer', transition: 'transform 80ms ease, box-shadow 80ms ease',
    borderRadius: '0px',
  };

  const ctrlBtnActive: React.CSSProperties = {
    ...ctrlBtn, backgroundColor: '#82e66f',
  };

  return (
    <header
      id="adpilot-topbar"
      className={`adpilot-topbar ${className}`.trim()}
      style={{
        height: '64px',
        minHeight: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        backgroundColor: '#ffffff',
        borderBottom: '3px solid #000000',
        position: 'sticky',
        top: 0,
        zIndex: 90,
        boxSizing: 'border-box',
        gap: '0.75rem',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        ...style,
      }}
      aria-label="Application Top Bar"
    >
      {/* ── LEFT: Mobile toggle + Sim Controls ──────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {/* Mobile menu trigger */}
        {onMenuToggle && (
          <button type="button" onClick={onMenuToggle} aria-label="Toggle navigation menu" style={ctrlBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}

        {/* SIM Date pill */}
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.25rem 0.6rem',
            backgroundColor: '#78dbf6', border: '2px solid #000000',
            boxShadow: '2px 2px 0px #000000',
            fontFamily: "'Space Grotesk', monospace", fontSize: '0.75rem', fontWeight: 700,
            whiteSpace: 'nowrap', color: '#000000',
          }}
          title="Current Simulation Date"
        >
          <span style={{ fontSize: '0.625rem', letterSpacing: '0.06em' }}>SIM</span>
          <span>{appState.sim_date}</span>
        </div>

        {/* Play / Pause */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={appState.is_playing ? 'Pause Simulation' : 'Play Simulation'}
          style={appState.is_playing ? ctrlBtnActive : ctrlBtn}
        >
          {appState.is_playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
        </button>

        {/* +1 Day */}
        <button
          type="button"
          onClick={stepForward}
          aria-label="Step forward 1 day"
          title="+1 Day"
          style={ctrlBtn}
        >
          <StepForwardIcon size={14} />
          <span style={{ marginLeft: '3px', fontSize: '0.6875rem' }}>+1D</span>
        </button>

        {/* Speed selector */}
        <div
          style={{
            display: 'inline-flex', border: '2px solid #000000',
            boxShadow: '2px 2px 0px #000000', overflow: 'hidden',
          }}
          role="group"
          aria-label="Simulation Speed"
        >
          {([1, 2, 5] as PlaySpeed[]).map((speed) => {
            const sel = appState.play_speed === speed;
            return (
              <button
                key={speed}
                type="button"
                onClick={() => setSpeed(speed)}
                aria-pressed={sel}
                style={{
                  background: sel ? '#ffd23f' : '#ffffff',
                  color: '#000000',
                  border: 'none',
                  borderRight: speed !== 5 ? '1px solid #000000' : 'none',
                  padding: '0.2rem 0.45rem',
                  fontSize: '0.6875rem', fontWeight: 700,
                  fontFamily: "'Space Grotesk', monospace",
                  cursor: 'pointer',
                }}
              >
                {speed}x
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CENTER: Autonomy badge ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={toggleAutonomy}
          aria-label={`Autonomy mode: ${appState.autonomy_level}. Click to toggle.`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.3rem 0.9rem',
            backgroundColor: isAutopilot ? '#82e66f' : '#ffd23f',
            border: '2px solid #000000', boxShadow: '3px 3px 0px #000000',
            fontFamily: "'Space Grotesk', monospace", fontSize: '0.75rem', fontWeight: 700,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            color: '#000000', cursor: 'pointer', borderRadius: '0px',
            transition: 'transform 80ms ease, box-shadow 80ms ease',
          }}
        >
          <span
            style={{
              width: '8px', height: '8px', backgroundColor: '#000000',
              display: 'inline-block', borderRadius: '0px',
              animation: 'status-pulse 1.6s ease-in-out infinite',
            }}
            aria-hidden="true"
          />
          {isAutopilot ? 'Autopilot' : 'Supervised'}
        </button>
      </div>

      {/* ── RIGHT: Risk budget + Kill Switch ────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>

        {/* Risk Budget bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '120px' }}
          title={`Risk: ${usedPct.toFixed(1)}% of ${capPct.toFixed(1)}% cap`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <span>Risk Budget</span>
            <span>{usedPct.toFixed(1)}% / {capPct.toFixed(1)}%</span>
          </div>
          {/* Bar track */}
          <div style={{ width: '100%', height: '6px', backgroundColor: '#e1e1d8', border: '1.5px solid #000000', overflow: 'hidden' }}>
            <div style={{ width: `${clampedRatio}%`, height: '100%', backgroundColor: riskBarColor, transition: 'width 300ms ease, background-color 300ms ease' }} />
          </div>
        </div>

        {/* Kill Switch */}
        <button
          type="button"
          id="kill-switch-btn"
          onClick={() => setShowKillSwitchModal(true)}
          aria-label={appState.killswitch_active ? 'Kill switch active — click to resume' : 'Activate Kill Switch'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.35rem 0.75rem',
            backgroundColor: appState.killswitch_active ? '#f364cb' : '#ffffff',
            color: '#000000',
            border: '2px solid #000000',
            boxShadow: '2px 2px 0px #000000',
            fontSize: '0.6875rem', fontWeight: 700,
            fontFamily: "'Space Grotesk', monospace",
            letterSpacing: '0.04em', textTransform: 'uppercase',
            cursor: 'pointer', borderRadius: '0px',
            animation: appState.killswitch_active ? 'killswitch-pulse 1.4s ease-in-out infinite' : undefined,
          }}
        >
          <span style={{ width: '7px', height: '7px', backgroundColor: '#000000', display: 'inline-block' }} aria-hidden="true" />
          {appState.killswitch_active ? 'RESUME' : 'KILL'}
        </button>
      </div>

      {/* ── Kill Switch Modal ────────────────────────────────────────────────── */}
      {showKillSwitchModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="killswitch-modal-title"
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowKillSwitchModal(false); }}
        >
          <div
            style={{
              backgroundColor: '#ffffff', border: '3px solid #000000',
              boxShadow: '8px 8px 0px #000000',
              padding: '1.75rem', maxWidth: '440px', width: '100%',
              display: 'flex', flexDirection: 'column', gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f364cb' }}>
              <AlertOctagonIcon size={26} />
              <h2 id="killswitch-modal-title" style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#000000', textTransform: 'uppercase' }}>
                {appState.killswitch_active ? 'Resume Execution?' : 'Activate Kill Switch?'}
              </h2>
            </div>

            <p style={{ margin: 0, fontSize: '0.875rem', color: '#4a4a46', lineHeight: 1.5, fontWeight: 600 }}>
              {appState.killswitch_active
                ? 'Deactivating will allow the simulation and autonomous actions to resume.'
                : 'All autonomous actions, optimization loops, and active rollouts will halt immediately.'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="ghost" size="sm" onClick={() => setShowKillSwitchModal(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleConfirmKillSwitch} autoFocus>
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
