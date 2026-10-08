import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// ─── Frozen Contract Types ────────────────────────────────────────────────────
export interface RiskBudget { used_pct: number; cap_pct: number; }
export type AutonomyLevel = 'supervised' | 'autopilot';
export type PlaySpeed = 1 | 2 | 5;

export interface KPI {
  label: string;
  value: number;
  unit?: string;
  delta_pct?: number;
  sparkline?: number[];
}

export interface ExplanationPoint {
  color: string;
  title: string;
  text: string;
}

export interface Incident {
  id: string;
  metric: string;
  scope: string;
  direction: 'up' | 'down';
  magnitude_pct: number;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'diagnosed' | 'resolved';
}

export interface AppState {
  sim_date: string;
  autonomy_level: AutonomyLevel;
  risk_budget: RiskBudget;
  is_playing: boolean;
  play_speed: PlaySpeed;
  killswitch_active: boolean;
  kpis: KPI[];
  daily_explanation: ExplanationPoint[];
  active_incidents: Incident[];
}

export interface AppStateContextValue {
  appState: AppState;
  togglePlay: () => void;
  stepForward: () => void;
  setSpeed: (speed: PlaySpeed) => void;
  toggleAutonomy: () => void;
  activateKillSwitch: () => void;
  deactivateKillSwitch: () => void;
  injectAnomaly: (type: string) => void;
}

const INITIAL_KPIS: KPI[] = [
  { label: 'Total Spend', value: 4823000, unit: '₹', delta_pct: -4.2, sparkline: [521, 518, 512, 509, 501, 498, 495, 492, 489, 487, 485, 484, 483, 482] },
  { label: 'Total Revenue', value: 14280000, unit: '₹', delta_pct: +6.8, sparkline: [133, 134, 135, 136, 137, 138, 139, 139, 140, 140, 141, 141, 142, 142] },
  { label: 'Blended ROAS', value: 2.96, unit: 'x', delta_pct: +11.4, sparkline: [2.56, 2.59, 2.64, 2.68, 2.74, 2.78, 2.80, 2.82, 2.86, 2.88, 2.90, 2.92, 2.94, 2.96] },
  { label: 'Total Profit', value: 3842000, unit: '₹', delta_pct: +9.1, sparkline: [352, 355, 358, 361, 365, 368, 371, 374, 377, 379, 381, 382, 383, 384] },
];

const INITIAL_INCIDENTS: Incident[] = [
  { id: 'INC-001', metric: 'CTR', scope: 'Meta Summer Promo', direction: 'down', magnitude_pct: -32.4, confidence: 0.91, severity: 'high', status: 'investigating' },
  { id: 'INC-002', metric: 'ROAS', scope: 'Google Smart Home', direction: 'down', magnitude_pct: -18.7, confidence: 0.84, severity: 'medium', status: 'open' },
  { id: 'INC-003', metric: 'CVR', scope: 'Wireless Earbuds', direction: 'down', magnitude_pct: -41.2, confidence: 0.96, severity: 'critical', status: 'open' },
  { id: 'INC-004', metric: 'CPM', scope: 'TikTok Gen-Z Reach', direction: 'up', magnitude_pct: +22.1, confidence: 0.78, severity: 'low', status: 'open' },
];

const INITIAL_APP_STATE: AppState = {
  sim_date: '2024-06-15',
  autonomy_level: 'supervised',
  risk_budget: { used_pct: 4.2, cap_pct: 10.0 },
  is_playing: false,
  play_speed: 1,
  killswitch_active: false,
  kpis: INITIAL_KPIS,
  active_incidents: INITIAL_INCIDENTS,
  daily_explanation: [
    { color: '#f364cb', title: 'ALERT', text: 'Creative fatigue detected on Meta Summer Promo (CTR down 32.4%).' },
    { color: '#ffd23f', title: 'VERIFIED', text: 'AI Agent confirmed audience frequency reached 7.2x.' },
    { color: '#78dbf6', title: 'ACTION', text: 'Recommended shifting ₹1,20,000/day to Google Smart Home campaign.' }
  ],
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appState, setAppState] = useState<AppState>(INITIAL_APP_STATE);

  const togglePlay = useCallback(() => setAppState(p => ({ ...p, is_playing: !p.is_playing })), []);
  const setSpeed = useCallback((speed: PlaySpeed) => setAppState(p => ({ ...p, play_speed: speed })), []);
  const toggleAutonomy = useCallback(() => setAppState(p => ({ ...p, autonomy_level: p.autonomy_level === 'supervised' ? 'autopilot' : 'supervised' })), []);
  const activateKillSwitch = useCallback(() => setAppState(p => ({ ...p, killswitch_active: true, is_playing: false })), []);
  const deactivateKillSwitch = useCallback(() => setAppState(p => ({ ...p, killswitch_active: false })), []);

  const stepForward = useCallback(() => {
    setAppState((prev) => {
      const parts = prev.sim_date.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + 1);
      const nextDate = d.toISOString().split('T')[0];

      // Dynamic KPI Math (in Rupees)
      const newSpend = Math.round(prev.kpis[0].value * (1 + (Math.random() * 0.02 - 0.01)));
      const newRev = Math.round(prev.kpis[1].value * (1 + (Math.random() * 0.03 - 0.005)));
      const newRoas = parseFloat((newRev / newSpend).toFixed(2));
      const newProfit = Math.round(newRev - newSpend * 0.62);

      return {
        ...prev,
        sim_date: nextDate,
        risk_budget: { ...prev.risk_budget, used_pct: parseFloat((Math.min(9.8, prev.risk_budget.used_pct + (Math.random() * 0.4 - 0.1))).toFixed(1)) },
        daily_explanation: [
          { color: '#82e66f', title: 'SUCCESS', text: `Budget reallocation executed successfully for ${nextDate}.` },
          { color: '#78dbf6', title: 'INFO', text: 'Promoted Wireless Earbuds stock cover is healthy at 28 days.' },
          { color: '#ffd23f', title: 'METRIC', text: `Overall net profit adjusted dynamically based on simulation tick.` }
        ],
        kpis: [
          { ...prev.kpis[0], value: newSpend, sparkline: [...(prev.kpis[0].sparkline || []).slice(1), newSpend / 10000] },
          { ...prev.kpis[1], value: newRev, sparkline: [...(prev.kpis[1].sparkline || []).slice(1), newRev / 10000] },
          { ...prev.kpis[2], value: newRoas, sparkline: [...(prev.kpis[2].sparkline || []).slice(1), newRoas] },
          { ...prev.kpis[3], value: newProfit, sparkline: [...(prev.kpis[3].sparkline || []).slice(1), newProfit / 10000] },
        ],
      };
    });
  }, []);

  const injectAnomaly = useCallback((type: string) => {
    setAppState((prev) => ({
      ...prev,
      daily_explanation: [
        { color: '#f364cb', title: 'CRITICAL', text: `SYNTHETIC ANOMALY INJECTED: ${type.toUpperCase().replace('_', ' ')}` },
        { color: '#ffd23f', title: 'DETECTED', text: 'Sentinel flagged severe performance drop.' },
        { color: '#78dbf6', title: 'INVESTIGATING', text: 'AI Agent diagnostic loop initiated to isolate root cause.' }
      ],
    }));
  }, []);

  return (
    <AppStateContext.Provider value={{ appState, togglePlay, stepForward, setSpeed, toggleAutonomy, activateKillSwitch, deactivateKillSwitch, injectAnomaly }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppStateContextValue => {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within an AppStateProvider');
  return context;
};

export default AppStateProvider;