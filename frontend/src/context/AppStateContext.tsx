import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

export type PlaySpeed = 1 | 2 | 5;
export type AutonomyLevel = 'supervised' | 'autopilot';

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
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
}

export interface AppState {
  sim_date: string;
  day_index: number;
  autonomy_level: AutonomyLevel;
  risk_budget: { used_pct: number; cap_pct: number };
  is_playing: boolean;
  play_speed: PlaySpeed;
  killswitch_active: boolean;
  global_multiplier: number;
  kpis: { label: string; value: number; unit: string; delta_pct: number; sparkline: number[] }[];
  daily_explanation: ExplanationPoint[];
  active_incidents: Incident[];
  agent_feed: { ts: string; module: string; message: string; severity: string }[];
  pipeline_stage: number;
}

interface Ctx {
  appState: AppState;
  stepForward: () => void;
  togglePlay: () => void;
  setSpeed: (s: PlaySpeed) => void;
  toggleAutonomy: () => void;
  activateKillSwitch: () => void;
  deactivateKillSwitch: () => void;
  injectAnomaly: (type: string) => void;
}

const AppStateContext = createContext<Ctx | null>(null);

const BASE_KPIS = [
  { label: 'Total Spend', value: 4823000, unit: '₹', delta_pct: -4.2, sparkline: [52,51,50,49,48,47,48,49,48,48] },
  { label: 'Total Revenue', value: 14280000, unit: '₹', delta_pct: 6.8, sparkline: [130,132,134,136,138,140,141,142,143,142] },
  { label: 'Blended ROAS', value: 2.96, unit: 'x', delta_pct: 11.4, sparkline: [2.5,2.6,2.7,2.8,2.85,2.9,2.92,2.94,2.95,2.96] },
  { label: 'Total Profit', value: 3842000, unit: '₹', delta_pct: 9.1, sparkline: [35,36,36,37,37,38,38,38,38,38] },
];

function makeIncidents(mult: number): Incident[] {
  return [
    { id: 'INC-001', metric: 'CTR', scope: 'Meta Summer Promo', direction: 'down', magnitude_pct: +(-32.4 * mult).toFixed(1), severity: 'high', status: 'investigating' },
    { id: 'INC-002', metric: 'ROAS', scope: 'Google Smart Home', direction: 'down', magnitude_pct: +(-18.7 * mult).toFixed(1), severity: 'medium', status: 'open' },
    { id: 'INC-003', metric: 'CVR', scope: 'Wireless Earbuds', direction: 'down', magnitude_pct: +(-41.2 * mult).toFixed(1), severity: 'critical', status: 'open' },
    { id: 'INC-004', metric: 'CPM', scope: 'TikTok Gen-Z Reach', direction: 'up', magnitude_pct: +(22.1 * mult).toFixed(1), severity: 'low', status: 'open' },
  ];
}

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appState, setAppState] = useState<AppState>({
    sim_date: '2024-06-15',
    day_index: 0,
    autonomy_level: 'supervised',
    risk_budget: { used_pct: 4.2, cap_pct: 10 },
    is_playing: false,
    play_speed: 1,
    killswitch_active: false,
    global_multiplier: 1,
    kpis: BASE_KPIS,
    daily_explanation: [
      { color: '#f364cb', title: 'ALERT', text: 'Creative fatigue on Meta Summer Promo (CTR -32.4%).' },
      { color: '#ffd23f', title: 'WHY', text: 'Audience frequency hit 7.2x — creative worn out.' },
      { color: '#78dbf6', title: 'ACTION', text: 'Shift ₹1,20,000/day to Google Smart Home.' },
    ],
    active_incidents: makeIncidents(1),
    agent_feed: [
      { ts: '09:14:02', module: 'sentinel', message: 'CTR anomaly detected on Meta Summer Promo', severity: 'warning' },
      { ts: '09:14:08', module: 'investigator', message: 'Ollama agent started creative_breakdown tool', severity: 'info' },
      { ts: '09:14:15', module: 'guardian', message: 'Math verification PASS — numbers match DuckDB', severity: 'success' },
    ],
    pipeline_stage: 0,
  });

  const stepForward = useCallback(() => {
    setAppState(prev => {
      const d = new Date(prev.sim_date);
      d.setDate(d.getDate() + 1);
      const nextDate = d.toISOString().split('T')[0];
      const day = prev.day_index + 1;
      const jitter = 1 + (Math.random() * 0.08 - 0.03);
      const mult = Math.max(0.7, prev.global_multiplier * jitter);

      const briefs = [
        [
          { color: '#82e66f', title: 'SUCCESS', text: `Day ${nextDate}: Budget shift working. ROAS recovering.` },
          { color: '#78dbf6', title: 'MONITOR', text: 'Wireless Earbuds stock healthy (28 days cover).' },
          { color: '#ffd23f', title: 'NOTE', text: 'Risk budget still inside 10% daily cap.' },
        ],
        [
          { color: '#f364cb', title: 'ALERT', text: 'New pressure on Google Smart Home ROAS.' },
          { color: '#ffd23f', title: 'WHY', text: 'Competitor bid spike detected overnight.' },
          { color: '#78dbf6', title: 'ACTION', text: 'Strategist recommending +₹40k defensive spend.' },
        ],
        [
          { color: '#82e66f', title: 'PROVE', text: `Synthetic control shows +0.18x ROAS lift from yesterday's action.` },
          { color: '#78dbf6', title: 'LEARN', text: 'Memory bank updated with creative fatigue pattern.' },
          { color: '#ffd23f', title: 'NEXT', text: 'Opportunity score on Smart Watches now 87/100.' },
        ],
      ];

      const newFeed = [
        { ts: new Date().toLocaleTimeString(), module: 'orchestrator', message: `Tick completed for ${nextDate}`, severity: 'info' },
        { ts: new Date().toLocaleTimeString(), module: 'sentinel', message: `Scanned 12 campaigns — ${Math.random() > 0.6 ? '1 new anomaly' : 'all clear'}`, severity: 'info' },
        ...prev.agent_feed.slice(0, 6),
      ];

      return {
        ...prev,
        sim_date: nextDate,
        day_index: day,
        global_multiplier: mult,
        pipeline_stage: (prev.pipeline_stage % 4) + 1,
        risk_budget: {
          used_pct: Math.min(9.5, +(prev.risk_budget.used_pct + (Math.random() * 0.8 - 0.2)).toFixed(1)),
          cap_pct: 10,
        },
        kpis: prev.kpis.map(k => ({
          ...k,
          value: Math.round(k.value * jitter),
          delta_pct: +((jitter - 1) * 100).toFixed(1),
          sparkline: [...k.sparkline.slice(1), Math.round((k.sparkline[k.sparkline.length - 1] || 50) * jitter)],
        })),
        daily_explanation: briefs[day % 3],
        active_incidents: makeIncidents(mult),
        agent_feed: newFeed,
      };
    });
  }, []);

  useEffect(() => {
    if (!appState.is_playing || appState.killswitch_active) return;
    const ms = 2500 / appState.play_speed;
    const id = setInterval(stepForward, ms);
    return () => clearInterval(id);
  }, [appState.is_playing, appState.play_speed, appState.killswitch_active, stepForward]);

  const injectAnomaly = useCallback((type: string) => {
    setAppState(prev => ({
      ...prev,
      pipeline_stage: 1,
      daily_explanation: [
        { color: '#f364cb', title: 'INJECTED', text: `Synthetic ${type.replace('_', ' ').toUpperCase()} anomaly forced into simulator.` },
        { color: '#ffd23f', title: 'SEE', text: 'Sentinel raised severity to CRITICAL.' },
        { color: '#78dbf6', title: 'WHY', text: 'Investigator agent spinning up Ollama tools…' },
      ],
      agent_feed: [
        { ts: new Date().toLocaleTimeString(), module: 'simulator', message: `INJECT ${type}`, severity: 'danger' },
        { ts: new Date().toLocaleTimeString(), module: 'sentinel', message: 'New incident opened', severity: 'warning' },
        ...prev.agent_feed,
      ],
      active_incidents: [
        { id: 'INC-SYN', metric: type.slice(0, 3).toUpperCase(), scope: 'Injected Target', direction: 'down', magnitude_pct: -45, severity: 'critical', status: 'open' },
        ...prev.active_incidents,
      ],
    }));
  }, []);

  const value = useMemo(() => ({
    appState,
    stepForward,
    togglePlay: () => setAppState(p => ({ ...p, is_playing: !p.is_playing })),
    setSpeed: (s: PlaySpeed) => setAppState(p => ({ ...p, play_speed: s })),
    toggleAutonomy: () => setAppState(p => ({ ...p, autonomy_level: p.autonomy_level === 'supervised' ? 'autopilot' : 'supervised' })),
    activateKillSwitch: () => setAppState(p => ({ ...p, killswitch_active: true, is_playing: false })),
    deactivateKillSwitch: () => setAppState(p => ({ ...p, killswitch_active: false })),
    injectAnomaly,
  }), [appState, stepForward, injectAnomaly]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be inside AppStateProvider');
  return ctx;
};