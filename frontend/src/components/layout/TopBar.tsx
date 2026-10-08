import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { useAppState } from '../../context/AppStateContext';
import type { PlaySpeed } from '../../context/AppStateContext';

export const PlayIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const PauseIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

export const StepForwardIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" />
    <line x1="19" y1="5" x2="19" y2="19" />
  </svg>
);

export const TopBar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

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

  const isAutopilot = appState.autonomy_level === 'autopilot';

  return (
    <header className="h-16 px-6 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 flex items-center justify-between text-slate-100 font-sans">
      {/* LEFT SECTION: Simulation Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 font-mono text-xs">
          <span className="text-cyan-400 font-bold">SIM</span>
          <span className="text-white font-semibold">{appState.sim_date}</span>
        </div>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className={`p-2 rounded-md border transition-all ${appState.is_playing
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
            : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
            }`}
          title={appState.is_playing ? 'Pause' : 'Play'}
        >
          {appState.is_playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
        </button>

        {/* Step Forward +1 Day */}
        <button
          onClick={stepForward}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-white font-mono text-xs transition-all active:scale-95"
          title="Step forward 1 day"
        >
          <StepForwardIcon size={14} />
          <span>+1 DAY</span>
        </button>

        {/* Speed Controls */}
        <div className="flex bg-slate-900/80 border border-slate-800 rounded-md p-0.5 text-xs font-mono">
          {([1, 2, 5] as PlaySpeed[]).map((speed) => (
            <button
              key={speed}
              onClick={() => setSpeed(speed)}
              className={`px-2 py-0.5 rounded ${appState.play_speed === speed ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* CENTER SECTION: Autonomy Badge */}
      <button
        onClick={toggleAutonomy}
        className={`px-3.5 py-1 rounded-full border text-xs font-mono font-semibold flex items-center gap-2 transition-all ${isAutopilot
          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
          : 'bg-amber-500/10 border-amber-500/40 text-amber-400'
          }`}
      >
        <span className={`w-2 h-2 rounded-full ${isAutopilot ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        <span>{isAutopilot ? 'AUTOPILOT' : 'SUPERVISED'}</span>
      </button>

      {/* RIGHT SECTION: Risk Budget & Kill Switch */}
      <div className="flex items-center gap-4 font-mono text-xs">
        <div className="text-right">
          <div className="text-slate-500 text-[10px] uppercase">Risk Budget</div>
          <div className="text-slate-200 font-bold">{appState.risk_budget.used_pct}% / {appState.risk_budget.cap_pct}%</div>
        </div>

        <button
          onClick={() => setShowKillSwitchModal(true)}
          className={`px-3 py-1.5 rounded-md border font-bold text-xs transition-all ${appState.killswitch_active
            ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            }`}
        >
          {appState.killswitch_active ? 'ACTIVE — RESUME' : 'KILL SWITCH'}
        </button>
      </div>

      {/* KILL SWITCH MODAL */}
      {showKillSwitchModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              ⚠️ {appState.killswitch_active ? 'Resume Autonomous Execution?' : 'Activate Emergency Kill Switch?'}
            </h2>
            <p className="text-sm text-slate-300">
              {appState.killswitch_active
                ? 'Resume execution of autonomous optimizations and spend reallocations.'
                : 'Halts all autonomous ad spend adjustments and optimization routines immediately.'}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowKillSwitchModal(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleConfirmKillSwitch}>
                {appState.killswitch_active ? 'Confirm Resume' : 'Confirm Kill Switch'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default TopBar;