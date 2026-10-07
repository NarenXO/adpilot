import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// ─── Frozen Contract Types ────────────────────────────────────────────────────

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

// ─── Context Value ────────────────────────────────────────────────────────────

export interface AppStateContextValue {
  appState: AppState;
  togglePlay: () => void;
  stepForward: () => void;
  setSpeed: (speed: PlaySpeed) => void;
  toggleAutonomy: () => void;
  activateKillSwitch: () => void;
  deactivateKillSwitch: () => void;
}

const INITIAL_APP_STATE: AppState = {
  sim_date: '2024-06-15',
  autonomy_level: 'supervised',
  risk_budget: { used_pct: 4.2, cap_pct: 10.0 },
  is_playing: false,
  play_speed: 1,
  killswitch_active: false,
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appState, setAppState] = useState<AppState>(INITIAL_APP_STATE);

  const togglePlay = useCallback(() => {
    setAppState((prev) => ({ ...prev, is_playing: !prev.is_playing }));
  }, []);

  const stepForward = useCallback(() => {
    setAppState((prev) => {
      const parts = prev.sim_date.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + 1);
      const nextDate = d.toISOString().split('T')[0];
      return { ...prev, sim_date: nextDate };
    });
  }, []);

  const setSpeed = useCallback((speed: PlaySpeed) => {
    setAppState((prev) => ({ ...prev, play_speed: speed }));
  }, []);

  const toggleAutonomy = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      autonomy_level: prev.autonomy_level === 'supervised' ? 'autopilot' : 'supervised',
    }));
  }, []);

  const activateKillSwitch = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      killswitch_active: true,
      is_playing: false,
    }));
  }, []);

  const deactivateKillSwitch = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      killswitch_active: false,
    }));
  }, []);

  const value = useMemo(
    () => ({
      appState,
      togglePlay,
      stepForward,
      setSpeed,
      toggleAutonomy,
      activateKillSwitch,
      deactivateKillSwitch,
    }),
    [appState, togglePlay, stepForward, setSpeed, toggleAutonomy, activateKillSwitch, deactivateKillSwitch]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAppState = (): AppStateContextValue => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

export default AppStateProvider;
