import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface AppState {
  sim_date: string;
  autonomy_level: 'supervised' | 'autopilot';
  risk_budget: { used_pct: number; cap_pct: number; };
  is_playing: boolean;
  play_speed: number;
  killswitch_active: boolean;
  kpis: any[];
  daily_explanation: any[];
  active_incidents: any[];
  global_multiplier: number; // Used by other tabs to scale data dynamically
}

export interface AppStateContextValue {
  appState: AppState;
  togglePlay: () => void;
  stepForward: () => void;
  setSpeed: (speed: number) => void;
  toggleAutonomy: () => void;
  activateKillSwitch: () => void;
  deactivateKillSwitch: () => void;
  injectAnomaly: (type: string) => void;
}

const INITIAL_APP_STATE: AppState = {
  sim_date: '2024-06-15',
  autonomy_level: 'supervised',
  risk_budget: { used_pct: 4.2, cap_pct: 10.0 },
  is_playing: false,
  play_speed: 1,
  killswitch_active: false,
  global_multiplier: 1.0,
  kpis: [
    { label: 'Total Spend', value: 4823000, unit: '₹', delta_pct: -4.2, sparkline: [52, 51, 51, 50, 50, 49, 49, 49, 48, 48] },
    { label: 'Total Revenue', value: 14280000, unit: '₹', delta_pct: +6.8, sparkline: [133, 134, 135, 136, 137, 138, 139, 140, 141, 142] },
    { label: 'Blended ROAS', value: 2.96, unit: 'x', delta_pct: +11.4, sparkline: [2.5, 2.6, 2.6, 2.7, 2.7, 2.8, 2.8, 2.9, 2.9, 2.96] },
    { label: 'Total Profit', value: 3842000, unit: '₹', delta_pct: +9.1, sparkline: [35, 35, 36, 36, 36, 37, 37, 37, 38, 38] },
  ],
  active_incidents: [
    { id: 'INC-001', metric: 'CTR', scope: 'Meta Summer Promo', direction: 'down', magnitude_pct: -32.4, severity: 'high' },
    { id: 'INC-002', metric: 'ROAS', scope: 'Google Smart Home', direction: 'down', magnitude_pct: -18.7, severity: 'medium' },
  ],
  daily_explanation: [
    { color: '#f364cb', title: 'ALERT', text: 'Creative fatigue detected on Meta Summer Promo.' },
    { color: '#ffd23f', title: 'VERIFIED', text: 'AI Agent confirmed frequency reached 7.2x.' },
  ],
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appState, setAppState] = useState<AppState>(INITIAL_APP_STATE);

  const stepForward = useCallback(() => {
    setAppState((prev) => {
      const d = new Date(prev.sim_date);
      d.setDate(d.getDate() + 1);
      const nextDate = d.toISOString().split('T')[0];

      const multiplierShift = 1 + (Math.random() * 0.06 - 0.02); // -2% to +4%
      const newMultiplier = prev.global_multiplier * multiplierShift;

      const explanations = [
        [
          { color: '#82e66f', title: 'SUCCESS', text: `Budget reallocation executed for ${nextDate}.` },
          { color: '#78dbf6', title: 'INFO', text: 'ROAS stabilizing across active campaigns.' }
        ],
        [
          { color: '#ffd23f', title: 'MONITOR', text: `Inventory levels holding steady for ${nextDate}.` },
          { color: '#78dbf6', title: 'AUTO', text: 'Optimizer adjusting bids dynamically.' }
        ],
        [
          { color: '#82e66f', title: 'GROWTH', text: `Scale quadrant identified new opportunities on ${nextDate}.` },
          { color: '#f364cb', title: 'WATCH', text: 'Slight CPC increase detected on TikTok.' }
        ]
      ];
      const randomExp = explanations[Math.floor(Math.random() * explanations.length)];

      return {
        ...prev,
        sim_date: nextDate,
        global_multiplier: newMultiplier,
        daily_explanation: randomExp,
        kpis: prev.kpis.map(k => ({
          ...k,
          value: Math.round(k.value * multiplierShift),
          delta_pct: parseFloat(((multiplierShift - 1) * 100).toFixed(1)),
          sparkline: [...k.sparkline.slice(1), Math.round(k.value * multiplierShift / 100000)]
        }))
      };
    });
  }, []);

  const injectAnomaly = useCallback((type: string) => {
    setAppState(prev => ({
      ...prev,
      daily_explanation: [
        { color: '#f364cb', title: 'CRITICAL', text: `INJECTED ANOMALY: ${type.toUpperCase()}` },
        { color: '#ffd23f', title: 'DETECTED', text: 'Agent investigation loop initiated.' }
      ]
    }));
  }, []);

  const togglePlay = useCallback(() => setAppState(p => ({ ...p, is_playing: !p.is_playing })), []);
  const setSpeed = useCallback((s: number) => setAppState(p => ({ ...p, play_speed: s })), []);
  const toggleAutonomy = useCallback(() => setAppState(p => ({ ...p, autonomy_level: p.autonomy_level === 'supervised' ? 'autopilot' : 'supervised' })), []);
  const activateKillSwitch = useCallback(() => setAppState(p => ({ ...p, killswitch_active: true, is_playing: false })), []);
  const deactivateKillSwitch = useCallback(() => setAppState(p => ({ ...p, killswitch_active: false })), []);

  const val = useMemo(() => ({ appState, togglePlay, stepForward, setSpeed, toggleAutonomy, activateKillSwitch, deactivateKillSwitch, injectAnomaly }), [appState, togglePlay, stepForward, setSpeed, toggleAutonomy, activateKillSwitch, deactivateKillSwitch, injectAnomaly]);
  
  return <AppStateContext.Provider value={val}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState error');
  return ctx;
};
export default AppStateProvider;